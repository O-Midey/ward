// ============================================================
// Ward — PWA icon generator
// ============================================================
// Rasterizes the Shield-W brand mark into the PNGs referenced by
// public/manifest.json. Run: `node scripts/gen-icons.mjs`.

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");

const mark = ({
  stroke,
  fill,
  strokeWidth,
  wStroke,
  wStrokeWidth,
  wStrokeFill,
}) => `
  <path d="M40 6 L68 17 V40 C68 57 55 67 40 72 C25 67 12 57 12 40 V17 Z"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="${strokeWidth}"
        stroke-linejoin="round"/>
  <path d="M24 31 L31 52 L40 37 L49 52 L56 31"
        stroke="${wStroke}"
        stroke-width="${wStrokeWidth}"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="${wStrokeFill}"/>`;

const svg = ({
  width = 80,
  height = 80,
  background = "none",
  backgroundRadius = 0,
  markProps,
}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 80 80" fill="none">
  ${background !== "none" ? `<rect width="80" height="80" rx="${backgroundRadius}" fill="${background}"/>` : ""}
  ${markProps ? mark(markProps) : ""}
</svg>`;

const iconDarkSvg = svg({
  markProps: {
    fill: "#15203A",
    stroke: "#3B82F6",
    strokeWidth: 2.5,
    wStroke: "#6BA5FF",
    wStrokeWidth: 4,
    wStrokeFill: "none",
  },
});

const iconLightSvg = svg({
  markProps: {
    fill: "#DDE8FC",
    stroke: "#2563EB",
    strokeWidth: 2.5,
    wStroke: "#2563EB",
    wStrokeWidth: 4,
    wStrokeFill: "none",
  },
});

const iconSolidSvg = svg({
  background: "#3B82F6",
  backgroundRadius: 18,
  markProps: {
    fill: "rgba(255,255,255,0.15)",
    stroke: "rgba(255,255,255,0.9)",
    strokeWidth: 2.5,
    wStroke: "#ffffff",
    wStrokeWidth: 4,
    wStrokeFill: "none",
  },
});

const iconSolidMaskableSvg = svg({
  background: "#3B82F6",
  backgroundRadius: 0,
  markProps: {
    fill: "rgba(255,255,255,0.15)",
    stroke: "rgba(255,255,255,0.9)",
    strokeWidth: 2.5,
    wStroke: "#ffffff",
    wStrokeWidth: 4,
    wStrokeFill: "none",
  },
});

const targets = [
  { file: "icon-192.png", size: 192, svg: iconSolidSvg },
  { file: "icon-512.png", size: 512, svg: iconSolidSvg },
  { file: "icon-192-maskable.png", size: 192, svg: iconSolidMaskableSvg },
  { file: "icon-512-maskable.png", size: 512, svg: iconSolidMaskableSvg },
  { file: "apple-touch-icon.png", size: 180, svg: iconSolidSvg },
];

await mkdir(iconsDir, { recursive: true });
await writeFile(join(iconsDir, "icon-dark.svg"), iconDarkSvg.trim() + "\n");
await writeFile(join(iconsDir, "icon-light.svg"), iconLightSvg.trim() + "\n");
await writeFile(join(iconsDir, "icon-solid.svg"), iconSolidSvg.trim() + "\n");
await writeFile(join(iconsDir, "icon.svg"), iconSolidSvg.trim() + "\n");

for (const t of targets) {
  await sharp(Buffer.from(t.svg))
    .resize(t.size, t.size)
    .png()
    .toFile(join(iconsDir, t.file));
  console.log("wrote", t.file);
}
console.log("done");
