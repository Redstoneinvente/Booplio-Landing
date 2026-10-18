import type { Request, Response } from "express";
import { TextDecoder } from "node:util";
export const maximumTemplateBytes = 1048576;
export function downloadId(path: string) {
  return /^\/api\/templates\/([A-Za-z0-9_-]{1,128})\/download$/.exec(path)?.[1] || null;
}
export async function boundedHtml(stream: AsyncIterable<Uint8Array>) {
  const parts: Buffer[] = [];
  let size = 0;
  for await (const part of stream) {
    size += part.byteLength;
    if (size > maximumTemplateBytes) throw new Error("oversized");
    parts.push(Buffer.from(part));
  }
  const buffer = Buffer.concat(parts);
  new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  if (!buffer.length) throw new Error("empty");
  return buffer;
}
export function publicDownloadHandler(load: (id: string) => Promise<Buffer | null>) {
  return async (req: Request, res: Response) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    });
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.set("Allow", "GET, HEAD").status(405).type("text").send("Method not allowed.");
      return;
    }
    const id = downloadId(req.path);
    if (!id || Object.keys(req.query).length) {
      res.status(400).type("text").send("Invalid template request.");
      return;
    }
    try {
      const buffer = await load(id);
      if (!buffer) {
        res.status(404).type("text").send("This template is unavailable or unpublished.");
        return;
      }
      res.set({
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${id}.html"`,
        "Content-Length": String(buffer.byteLength),
      });
      res.status(200).send(req.method === "HEAD" ? undefined : buffer);
    } catch {
      res.status(503).type("text").send("This template could not be downloaded. Please try again later.");
    }
  };
}
