import sizes from "./starter-sizes.json";
import { blankMetadata, type Dent, type Category } from "./types";
const specs: [
  string,
  string,
  Category,
  string,
  Dent["wallpaper"],
  Dent["style"],
][] = [
  [
    "citrus-charge",
    "Citrus Charge",
    "charging",
    "#d7f77a",
    "sunset",
    "playful",
  ],
  ["orbit-volume", "Orbit Volume", "volume", "#be9cff", "lavender", "playful"],
  ["sunny-side", "Sunny Side", "brightness", "#ffbd61", "peach", "playful"],
  ["quiet-waves", "Quiet Waves", "headphones", "#78dbef", "ocean", "minimal"],
  ["focus-ring", "Focus Ring", "camera", "#a9cfff", "midnight", "minimal"],
  ["petal-flow", "Petal Flow", "charging", "#ff99c8", "peach", "playful"],
  ["mono-meter", "Mono Meter", "volume", "#f2f2e9", "midnight", "minimal"],
  ["leaf-breath", "Leaf Breath", "brightness", "#b7e697", "meadow", "minimal"],
];
export const starters: Dent[] = specs.map(
  ([slug, title, category, accent, wallpaper, style]) => ({
    ...blankMetadata,
    id: `starter-${slug}`,
    title,
    category,
    accent,
    wallpaper,
    style,
    description: `A little ${title.toLowerCase()} for your screen. This free Booplio starter responds to ${categoryLabels(category)} changes, adapts to every edge, and keeps the dent beautifully simple. Download the HTML file and import it in Settings → Custom dent designs.`,
    tags: [style, category],
    ownerId: "booplio",
    ownerName: "Booplio",
    ownerHandle: "booplio",
    status: "published",
    builtin: true,
    file: `dents/${slug}.html`,
    bytes: (sizes as Record<string, number>)[`starter-${slug}`],
    license: "CC0-1.0",
  }),
);
function categoryLabels(category: Category) {
  return category === "headphones" ? "headphone connection" : category;
}
