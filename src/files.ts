import { call } from "./firebase";
import type { Dent } from "./types";
export async function dentFile(
  dent: Dent,
  download = false,
  source: "draft" | "published" = "published",
  revision?: string,
): Promise<{ html: string; filename: string }> {
  if (dent.builtin && dent.file) {
    const res = await fetch(`/${dent.file}`);
    if (!res.ok)
      throw new Error("The file could not be downloaded. Please try again.");
    return { html: await res.text(), filename: dent.file.split("/").at(-1)! };
  }
  return call("getDentFile", {
    id: dent.id,
    source,
    download,
    ...(revision ? { revision } : {}),
  });
}
export function saveFile(html: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([html], { type: "text/html;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function recordDownload(dent: Dent) {
  const old = JSON.parse(
    localStorage.getItem("booplio-downloads") || "{}",
  ) as Record<string, string>;
  old[dent.id] = dent.version;
  localStorage.setItem("booplio-downloads", JSON.stringify(old));
}
