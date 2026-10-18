import { readFile, mkdir, copyFile, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const sizes = JSON.parse(await readFile(new URL("src/starter-sizes.json", root), "utf8"));
const directory = new URL("functions/lib/starters/", root);
await mkdir(directory, { recursive: true });
const manifest = {};
for (const id of Object.keys(sizes)) {
  if (!/^starter-[a-z0-9-]+$/.test(id)) throw new Error("Invalid starter id");
  const filename = `${id.slice(8)}.html`;
  await copyFile(new URL(`public/dents/${filename}`, root), new URL(filename, directory));
  manifest[id] = filename;
}
await writeFile(new URL("manifest.json", directory), JSON.stringify(manifest));
