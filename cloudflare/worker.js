const backend = "https://us-central1-booplio-redstoneinvente.cloudfunctions.net/templateDownload";
const maxBytes = 1048576;
const starterIds = new Set(["starter-citrus-charge", "starter-orbit-volume", "starter-sunny-side", "starter-quiet-waves", "starter-focus-ring", "starter-petal-flow", "starter-mono-meter", "starter-leaf-breath"]);
const safeHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "sandbox; default-src 'none'; frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (!/^\/api\/templates\/[A-Za-z0-9_-]{1,128}\/download$/.test(url.pathname) || url.search) return new Response("Invalid template request.", { status: 400, headers: safeHeaders });
    if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed.", { status: 405, headers: { ...safeHeaders, Allow: "GET, HEAD" } });
    try {
      const id = url.pathname.split("/")[3];
      const starter = starterIds.has(id);
      const response = starter
        ? await env.ASSETS.fetch(new Request(new URL(`/template-files/${id}.bin`, request.url), { method: request.method }))
        : await fetch(`${backend}${url.pathname}`, { method: request.method, redirect: "manual", signal: AbortSignal.timeout(25000) });
      if (response.status !== 200) return new Response(response.status === 404 ? "This template is unavailable or unpublished." : "Template download unavailable. Try again later.", { status: response.status === 404 ? 404 : 503, headers: safeHeaders });
      const length = Number(response.headers.get("Content-Length"));
      if ((response.headers.has("Content-Length") && (!Number.isFinite(length) || length > maxBytes)) || !(response.headers.get("Content-Type")?.startsWith("text/html") || (starter && response.headers.get("Content-Type")?.startsWith("application/octet-stream")))) throw new Error("Invalid response");
      const headers = { ...safeHeaders, "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="${url.pathname.split("/")[3]}.html"`, "Content-Length": String(length) };
      if (request.method === "HEAD") return new Response(null, { headers });
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) throw new Error("oversized");
          chunks.push(value);
        }
      } finally { await reader.cancel(); }
      if (!size) throw new Error("Empty response");
      headers["Content-Length"] = String(size);
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return new Response(bytes, { headers });
    } catch { return new Response("Template download unavailable. Try again later.", { status: 503, headers: safeHeaders }); }
  },
};
