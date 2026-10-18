import { categories, type Category, type Dent } from "./types";
export const marketplaceOrigin = "https://booplio.redstoneinvente.com";
export type TemplateLink = { id: string; kind: Category; name?: string; sha256?: string };
export function parseTemplateLink(search: string): TemplateLink | null {
  const p = new URLSearchParams(search);
  const allowed = ["id", "kind", "name", "sha256"];
  if ([...p.keys()].some(k => !allowed.includes(k) || p.getAll(k).length !== 1)) return null;
  const id = p.get("id") || "", kind = p.get("kind") || "";
  const name = p.get("name"), sha256 = p.get("sha256");
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id) || !categories.includes(kind as Category) || (name !== null && [...name].length > 80) || (sha256 !== null && !/^[a-f0-9]{64}$/i.test(sha256))) return null;
  return { id, kind: kind as Category, ...(name !== null ? { name } : {}), ...(sha256 !== null ? { sha256 } : {}) };
}
export function templateParams(template: TemplateLink) {
  const p = new URLSearchParams({ id: template.id, kind: template.kind });
  if (template.name) p.set("name", [...template.name].slice(0, 80).join(""));
  if (template.sha256) p.set("sha256", template.sha256);
  return p.toString();
}
export function openTemplateUrl(dent: Dent) {
  return `${marketplaceOrigin}/open-template?${templateParams({ id: dent.id, kind: dent.category, name: dent.title })}`;
}
export function fallbackAppUrl(template: TemplateLink, chrome: boolean) {
  const params = templateParams(template);
  if (!chrome) return `booplio://template?${params}`;
  const fallback = `${marketplaceOrigin}/templates/${encodeURIComponent(template.id)}`;
  return `intent://template?${params}#Intent;scheme=booplio;package=com.redstoneinvente.booplio;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}
export function initialRoute(path: string, search: string, hash: string) {
  if (hash) return hash;
  if (path === "/open-template") return `#/open-template${search}`;
  const match = /^\/templates\/([A-Za-z0-9_-]{1,128})$/.exec(path);
  return match ? `#/dent/${match[1]}` : "";
}
