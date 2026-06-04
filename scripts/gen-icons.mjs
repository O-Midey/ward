// ============================================================
// Ward — PWA icon generator
// ============================================================
// Rasterizes the brand mark into the PNGs referenced by
// public/manifest.json. Run: `node scripts/gen-icons.mjs`.

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'public', 'icons');

// Shield-with-keyhole mark on the Ink-blue accent gradient.
const mark = (scale = 1) => `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <path d="M256 116 l112 48 v78 c0 95 -64 155 -112 174 c-48 -19 -112 -79 -112 -174 v-78 z"
          fill="none" stroke="#ffffff" stroke-width="26" stroke-linejoin="round"/>
    <circle cx="256" cy="248" r="27" fill="#ffffff"/>
    <rect x="245" y="250" width="22" height="52" rx="11" fill="#ffffff"/>
  </g>`;

const svg = ({ rounded = true, scale = 1 } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#g)"/>
  ${mark(scale)}
</svg>`;

// any-purpose icons (rounded), maskable (full-bleed + safe-zone padding), apple-touch.
const targets = [
  { file: 'icon-192.png', size: 192, svg: svg({ rounded: true, scale: 1 }) },
  { file: 'icon-512.png', size: 512, svg: svg({ rounded: true, scale: 1 }) },
  { file: 'icon-192-maskable.png', size: 192, svg: svg({ rounded: false, scale: 0.72 }) },
  { file: 'icon-512-maskable.png', size: 512, svg: svg({ rounded: false, scale: 0.72 }) },
  { file: 'apple-touch-icon.png', size: 180, svg: svg({ rounded: false, scale: 0.86 }) },
];

await mkdir(iconsDir, { recursive: true });
// Keep the source SVG alongside the generated assets.
await writeFile(join(iconsDir, 'icon.svg'), svg({ rounded: true, scale: 1 }).trim() + '\n');

for (const t of targets) {
  await sharp(Buffer.from(t.svg)).resize(t.size, t.size).png().toFile(join(iconsDir, t.file));
  console.log('wrote', t.file);
}
console.log('done');
