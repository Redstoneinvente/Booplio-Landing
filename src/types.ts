export const categories = [
  "charging",
  "volume",
  "brightness",
  "camera",
  "headphones",
] as const;
export type Category = (typeof categories)[number];
export const categoryLabels: Record<Category, string> = {
  charging: "Charging",
  volume: "Volume",
  brightness: "Brightness",
  camera: "Camera",
  headphones: "Headphones",
};
export type Metadata = {
  title: string;
  description: string;
  category: Category;
  tags: string[];
  style: "playful" | "minimal" | "neon" | "retro";
  edge: "left" | "right" | "top" | "bottom" | "any";
  accent: string;
  wallpaper: "sunset" | "meadow" | "midnight" | "peach" | "lavender" | "ocean";
  minimumVersion: string;
  version: string;
  releaseNotes: string;
  license: "CC0-1.0" | "CC-BY-4.0" | "CC-BY-SA-4.0";
  reducedMotion: boolean;
  customColors: boolean;
};
export type Dent = Metadata & {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerHandle: string;
  bytes: number;
  downloads?: number;
  currentRevision?: string;
  revision?: string;
  dentId?: string;
  createdAt?: { seconds: number };
  updatedAt?: { seconds: number };
  status: string;
  reviewNote?: string;
  builtin?: boolean;
  file?: string;
  moderatorHidden?: boolean;
};
export type Profile = {
  uid: string;
  displayName: string;
  handle: string;
  bio: string;
};
export type Saved = {
  id: string;
  collection: string;
  savedVersion: string;
  dentId: string;
};
export type Version = {
  id: string;
  version: string;
  releaseNotes: string;
  bytes: number;
  createdAt?: { seconds: number };
};
export const blankMetadata: Metadata = {
  title: "",
  description: "",
  category: "charging",
  tags: [],
  style: "playful",
  edge: "any",
  accent: "#d7f77a",
  wallpaper: "sunset",
  minimumVersion: "2.4.2",
  version: "1.0.0",
  releaseNotes: "",
  license: "CC-BY-4.0",
  reducedMotion: true,
  customColors: false,
};
export const licenseLabels = {
  "CC0-1.0": "CC0 · Use and remix freely",
  "CC-BY-4.0": "CC BY · Remix with credit",
  "CC-BY-SA-4.0": "CC BY-SA · Credit and share alike",
};
export const dateLabel = (value?: { seconds: number }) =>
  value
    ? new Date(value.seconds * 1000).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Just now";
export const bytesLabel = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
