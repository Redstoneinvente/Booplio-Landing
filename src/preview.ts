import type { Category } from "./types";
export function previewDocument(html: string, reduced = false) {
  const policy =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'";
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer"><meta name="color-scheme" content="dark"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}${reduced ? "*,*::before,*::after{animation-duration:0.001ms!important;animation-iteration-count:1!important;transition-duration:0.001ms!important}" : ""}</style></head><body>${html}</body></html>`;
}
export function dentUpdate(
  kind: Category,
  level: number,
  edge: string,
  connected = true,
  accent = "#d7f77a",
) {
  return {
    type: "dentupdate",
    data: {
      schemaVersion: 1,
      kind: kind === "headphones" ? "headphones" : kind,
      title:
        kind === "headphones"
          ? "Headphones"
          : kind[0].toUpperCase() + kind.slice(1),
      value:
        kind === "camera" ? `${(1 + level / 10).toFixed(1)}×` : `${level}%`,
      level,
      minimum: 0,
      maximum: 100,
      progress: connected ? level / 100 : null,
      connected,
      playing: kind === "headphones" && connected,
      edge,
      ringerMode: 2,
      accent,
      metrics: [
        { key: "battery", value: `${level}%` },
        { key: "temperature", value: "32°C" },
        { key: "source", value: connected ? "Wired" : "Unplugged" },
      ],
    },
  };
}
export function validHtml(html: string) {
  if (new TextEncoder().encode(html).length > 1024 * 1024)
    throw new Error("Choose an HTML file smaller than 1 MiB.");
  if (
    !/<(?:!doctype|html|style|body|script|div|svg|canvas)\b/i.test(html) ||
    html.includes("\u0000")
  )
    throw new Error("Choose a valid UTF-8 HTML dent file.");
  return html;
}
