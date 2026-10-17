import { z } from "zod";
export const categories = [
  "charging",
  "volume",
  "brightness",
  "camera",
  "headphones",
] as const;
export const metadataSchema = z
  .object({
    title: z.string().trim().min(3).max(64),
    description: z.string().trim().min(12).max(4000),
    category: z.enum(categories),
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(24)
          .regex(/^[\p{L}\p{N} -]+$/u),
      )
      .max(6),
    style: z.enum(["playful", "minimal", "neon", "retro"]),
    edge: z.enum(["left", "right", "top", "bottom", "any"]),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    wallpaper: z.enum([
      "sunset",
      "meadow",
      "midnight",
      "peach",
      "lavender",
      "ocean",
    ]),
    minimumVersion: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/),
    version: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/),
    releaseNotes: z.string().trim().max(2000),
    license: z.enum(["CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0"]),
    reducedMotion: z.boolean(),
    customColors: z.boolean(),
  })
  .strict();
export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{8,80}$/);
export function validateHtml(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/<(?:!doctype|html|style|body|script|div|svg|canvas)\b/i.test(value)
  )
    throw new Error("Choose a self-contained HTML dent file.");
  if (Buffer.byteLength(value, "utf8") > 1024 * 1024)
    throw new Error("Dent files must be 1 MiB or smaller.");
  if (value.includes("\u0000"))
    throw new Error("The dent file must be UTF-8 text.");
  return value;
}
export function newerVersion(next: string, previous: string) {
  const a = next.split(".").map(Number),
    b = previous.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

export function searchTokens(
  metadata: { title: string; tags: string[]; category: string; style: string },
  name: string,
  handle: string,
) {
  const words =
    `${metadata.title} ${metadata.tags.join(" ")} ${metadata.category} ${metadata.style} ${name} ${handle}`
      .toLowerCase()
      .normalize("NFKC")
      .split(/[^\p{L}\p{N}_]+/u)
      .filter(Boolean);
  const tokens = new Set<string>();
  for (const word of words)
    for (let n = 2; n <= Math.min(word.length, 24); n++)
      tokens.add(word.slice(0, n));
  return [...tokens].slice(0, 600);
}
