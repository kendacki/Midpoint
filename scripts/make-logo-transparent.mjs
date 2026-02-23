/**
 * Makes black/dark background transparent in the Midpoint logo PNG.
 * Run: node scripts/make-logo-transparent.mjs
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const INPUT = join(process.cwd(), "public", "midpoint-logo.png");
const OUTPUT = join(process.cwd(), "public", "midpoint-logo.png");
const BLACK_THRESHOLD = 40; // Pixels with R,G,B all below this become transparent

const buffer = readFileSync(INPUT);
const { data, info } = await sharp(buffer)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const pixels = new Uint8ClampedArray(data.buffer);

for (let i = 0; i < width * height; i++) {
  const idx = i * channels;
  const r = pixels[idx];
  const g = pixels[idx + 1];
  const b = pixels[idx + 2];
  if (r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD) {
    pixels[idx + 3] = 0;
  }
}

await sharp(pixels, { raw: { width, height, channels } })
  .png()
  .toFile(OUTPUT);

console.log("Logo updated with transparent background:", OUTPUT);
