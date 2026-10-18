import { describe, expect, it, vi, afterEach } from "vitest";
import { parseTemplateLink, openTemplateUrl, fallbackAppUrl, initialRoute } from "../src/handoff";
import { starters } from "../src/starters";
import { boundedHtml, downloadId, publicDownloadHandler } from "../functions/src/template-download";
import worker from "../cloudflare/worker.js";
import type { Request, Response as ExpressResponse } from "express";
afterEach(() => vi.unstubAllGlobals());
describe("native template links", () => {
  it("encodes names without introducing parameters and preserves real native paths", () => {
    const link = new URL(openTemplateUrl({ ...starters[0], title: "Glow & shine #1" }));
    expect(link.pathname).toBe("/open-template");
    expect(link.hash).toBe("");
    expect(parseTemplateLink(link.search)).toEqual({ id: starters[0].id, kind: "charging", name: "Glow & shine #1" });
    expect(initialRoute("/open-template", link.search, "")).toBe(`#/open-template${link.search}`);
    expect(initialRoute("/templates/starter-sunny-side", "", "")).toBe("#/dent/starter-sunny-side");
  });
  it("rejects duplicate, malformed and unexpected fields", () => {
    for (const query of ["id=abc&kind=volume&id=xyz", "id=../draft&kind=volume", "id=ok&kind=audio", "id=ok&kind=volume&revision=draft", "id=ok&kind=volume&sha256=bad", `id=ok&kind=volume&name=${"a".repeat(81)}`]) expect(parseTemplateLink(query)).toBeNull();
  });
  it("targets the Android package with a non-launching detail fallback", () => {
    const template = { id: "abc_123", kind: "camera" as const, name: "Focus" };
    expect(fallbackAppUrl(template, true)).toContain("package=com.redstoneinvente.booplio;");
    expect(decodeURIComponent(fallbackAppUrl(template, true))).toContain("S.browser_fallback_url=https://booplio.redstoneinvente.com/templates/abc_123;end");
    expect(fallbackAppUrl(template, false)).toBe("booplio://template?id=abc_123&kind=camera&name=Focus");
  });
});
describe("bounded public HTML responses", () => {
  async function* stream(...chunks: Uint8Array[]) { yield* chunks; }
  it("keeps the exact UTF-8 bytes and rejects invalid UTF-8 or excess streamed bytes", async () => {
    const html = Buffer.from("<!doctype html><p>é 🌞</p>");
    expect(await boundedHtml(stream(html.subarray(0, 23), html.subarray(23)))).toEqual(html);
    await expect(boundedHtml(stream(new Uint8Array([255])))).rejects.toThrow();
    await expect(boundedHtml(stream(Buffer.alloc(1048576), Buffer.from("x")))).rejects.toThrow("oversized");
    expect(downloadId("/api/templates/../download")).toBeNull();
  });
  it("returns HTML bytes rather than a JSON envelope and handles unavailable templates", async () => {
    const html = Buffer.from("<!doctype html><p>Test</p>");
    const loader = vi.fn(async (id: string) => id === "live" ? html : null);
    const handler = publicDownloadHandler(loader);
    const headers: Record<string, string> = {};
    const res = { set: vi.fn((key, value) => { typeof key === "string" ? headers[key] = value : Object.assign(headers, key); return res; }), status: vi.fn(() => res), type: vi.fn(() => res), send: vi.fn(() => res) };
    await handler({ method: "GET", path: "/api/templates/live/download", query: {} } as Request, res as unknown as ExpressResponse);
    expect(res.send).toHaveBeenLastCalledWith(html);
    expect(headers["Content-Type"]).toBe("text/html; charset=utf-8");
    expect(headers["Content-Security-Policy"]).toContain("sandbox");
    await handler({ method: "GET", path: "/api/templates/hidden/download", query: {} } as Request, res as unknown as ExpressResponse);
    expect(res.status).toHaveBeenLastCalledWith(404);
    await handler({ method: "GET", path: "/api/templates/live/download", query: { source: "draft" } } as unknown as Request, res as unknown as ExpressResponse);
    expect(res.status).toHaveBeenLastCalledWith(400);
    expect(loader).toHaveBeenCalledTimes(2);
  });
  it("proxies bytes on Cloudflare without redirects or browser credentials", async () => {
    const html = "<!doctype html><p>Hi</p>";
    const upstream = vi.fn(async () => new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Length": String(Buffer.byteLength(html)) } }));
    vi.stubGlobal("fetch", upstream);
    const req = new Request("https://booplio.redstoneinvente.com/api/templates/live/download", { headers: { Cookie: "private", Authorization: "Bearer private" } });
    const response = await worker.fetch(req, {});
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(html);
    expect(upstream.mock.calls[0][1]).toMatchObject({ redirect: "manual", method: "GET" });
    expect(upstream.mock.calls[0][1]).not.toHaveProperty("headers");
    vi.stubGlobal("fetch", async () => new Response(null, { status: 302, headers: { Location: "https://elsewhere.test" } }));
    expect((await worker.fetch(req, {})).status).toBe(503);
    vi.stubGlobal("fetch", async () => new Response("missing", { status: 404 }));
    expect((await worker.fetch(req, {})).status).toBe(404);
  });
  it("serves allowlisted starters from local assets and rejects oversized or invalid proxy bytes", async () => {
    const html = "<!doctype html><p>Starter</p>";
    const assets = { fetch: vi.fn(async () => new Response(html, { headers: { "Content-Type": "text/html", "Content-Length": String(html.length) } })) };
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const req = new Request("https://booplio.redstoneinvente.com/api/templates/starter-citrus-charge/download");
    const response = await worker.fetch(req, { ASSETS: assets });
    expect(await response.text()).toBe(html);
    expect(assets.fetch.mock.calls[0][0].url).toBe("https://booplio.redstoneinvente.com/dents/citrus-charge.html");
    expect(upstream).not.toHaveBeenCalled();
    const community = new Request("https://booplio.redstoneinvente.com/api/templates/community/download");
    vi.stubGlobal("fetch", async () => new Response(new Uint8Array([255]), { headers: { "Content-Type": "text/html" } }));
    expect((await worker.fetch(community, {})).status).toBe(503);
    vi.stubGlobal("fetch", async () => new Response(new Uint8Array(1048577), { headers: { "Content-Type": "text/html" } }));
    expect((await worker.fetch(community, {})).status).toBe(503);
    expect((await worker.fetch(new Request(community.url + "?source=draft"), {})).status).toBe(400);
  });

});
