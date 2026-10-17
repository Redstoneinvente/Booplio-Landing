import { describe, expect, it } from "vitest";
import {
  metadataSchema,
  validateHtml,
  newerVersion,
  searchTokens,
} from "../functions/src/validation";
import { blankMetadata } from "../src/types";
import { previewDocument, dentUpdate } from "../src/preview";
import { starters } from "../src/starters";
import { readFileSync } from "node:fs";
describe("creator file and metadata validation", () => {
  it("accepts self-contained HTML and rejects binary, oversized and non-HTML files", () => {
    expect(validateHtml("<!doctype html><div>Hello</div>")).toContain("Hello");
    expect(() => validateHtml("binary")).toThrow();
    expect(() => validateHtml("<html>\u0000")).toThrow();
    expect(() => validateHtml("<html>" + "a".repeat(1024 * 1024))).toThrow();
    expect(() => validateHtml("<html>" + "é".repeat(600000))).toThrow();
  });
  it("accepts a valid listing and rejects extra privilege fields or invalid metadata", () => {
    const data = {
      ...blankMetadata,
      title: "Citrus Charge",
      description: "A little charging animation.",
    };
    expect(metadataSchema.safeParse(data).success).toBe(true);
    expect(
      metadataSchema.safeParse({ ...data, ownerId: "someone-else" }).success,
    ).toBe(false);
    expect(
      metadataSchema.safeParse({ ...data, accent: "url(javascript:alert(1))" })
        .success,
    ).toBe(false);
    expect(
      metadataSchema.safeParse({ ...data, category: "anything" }).success,
    ).toBe(false);
  });
  it("indexes creator and title prefixes for catalog search", () => {
    const tokens = searchTokens(
      {
        title: "Citrus Charge",
        category: "charging",
        style: "playful",
        tags: ["liquid"],
      },
      "Mila",
      "mila",
    );
    expect(tokens).toContain("citr");
    expect(tokens).toContain("mila");
    expect(tokens).toContain("liq");
    expect(new Set(tokens).size).toBe(tokens.length);
  });
  it("enforces increasing semantic versions numerically", () => {
    expect(newerVersion("1.10.0", "1.9.9")).toBe(true);
    expect(newerVersion("1.0.0", "1.0.0")).toBe(false);
    expect(newerVersion("1.9.9", "1.10.0")).toBe(false);
  });
});
describe("Android dent preview protocol", () => {
  it("supplies schema-1 snapshots, null progress when disconnected and selected metrics", () => {
    const d = dentUpdate("charging", 64, "left", true);
    expect(d.data.schemaVersion).toBe(1);
    expect(d.data.progress).toBe(0.64);
    expect(d.data.edge).toBe("left");
    expect(dentUpdate("headphones", 0, "top", false).data.progress).toBeNull();
  });
  it("locks untrusted documents down before any creator markup", () => {
    const html = previewDocument(
      '<script>fetch("https://example.com")</script>',
      true,
    );
    expect(html.indexOf("connect-src")).toBeLessThan(html.indexOf("fetch("));
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("form-action 'none'");
    expect(html).toContain("animation-iteration-count:1");
  });
  it("ships real, valid downloadable starter files matching schema 1", () => {
    for (const dent of starters) {
      const html = readFileSync(`public/${dent.file}`, "utf8");
      expect(validateHtml(html)).toContain("event.source!==parent");
      expect(html).toContain("dentupdate");
      expect(html).not.toMatch(/https?:\/\//);
      expect(Buffer.byteLength(html)).toBe(dent.bytes);
    }
  });
});
