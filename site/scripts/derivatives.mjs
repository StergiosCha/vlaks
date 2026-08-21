/**
 * Build derivatives from raw/blogs/media (1.55 GB of originals) + the loose repo images.
 * Originals never enter the deployed site (GitHub Pages caps at 1 GB); galleries serve
 * derivatives and link «πρωτότυπο» to the public Blogger /s0/ URL.
 *
 * Output: public/media/<sha12>__<w>.{webp,jpg} + src/data/media-manifest.json
 * keyed by source basename (assets.csv links assets by that basename).
 * Never upscales. Re-runs are incremental (skips existing outputs).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(SITE, '..');
const MEDIA_SRC = path.join(REPO, 'raw', 'blogs', 'media');
const OUT_DIR = path.join(SITE, 'public', 'media');
const MANIFEST = path.join(SITE, 'src', 'data', 'media-manifest.json');

const WIDTHS = [480, 960, 1600, 2560];
const LOOSE = [
  ['vlaks1.jpg', 'vlaks1.jpg'], // trombone on the bar
  ['vlaks2.jpg', 'vlaks2.jpg'], // vol.04 prohibition poster
  ['vlaks3.jpg', 'vlaks3.jpg'], // the two μπατζανάκια (LMP)
  ['vlaks4.jpg', 'vlaks4.jpg'], // lipstick manifesto on the awning
  ['vlaks5.jpg', 'vlaks5.jpg'], // vol.3 «οι ντένεξ» tin-cans poster
  ['vlaks.jpg', 'xeirografo.jpg'], // the handwritten note
];

fs.mkdirSync(OUT_DIR, { recursive: true });

const sources = [];
if (fs.existsSync(MEDIA_SRC)) {
  for (const f of fs.readdirSync(MEDIA_SRC)) {
    if (/\.(jpe?g|png|webp)$/i.test(f)) sources.push({ key: f, file: path.join(MEDIA_SRC, f) });
  }
}
for (const [src, key] of LOOSE) {
  const p = path.join(REPO, src);
  if (fs.existsSync(p)) sources.push({ key, file: p });
}

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
let done = 0, skipped = 0, failed = 0;

for (const { key, file } of sources) {
  const id = crypto.createHash('sha1').update(key).digest('hex').slice(0, 12);
  try {
    const img = sharp(file, { failOn: 'none' }).rotate(); // respect EXIF orientation
    const meta = await img.metadata();
    let { width: w, height: h } = meta;
    if (!w || !h) throw new Error('no dimensions');
    if ((meta.orientation ?? 1) >= 5) [w, h] = [h, w]; // EXIF rotated
    const widths = WIDTHS.filter((x) => x < w);
    if (widths.length === 0 || w <= WIDTHS[0]) widths.unshift(w); // small originals pass through
    const variants = [];
    let allExisted = true;
    for (const vw of widths) {
      const vh = Math.round((h / w) * vw);
      const webp = `${id}__${vw}.webp`;
      const webpPath = path.join(OUT_DIR, webp);
      if (!fs.existsSync(webpPath)) {
        allExisted = false;
        await sharp(file, { failOn: 'none' }).rotate().resize(vw).webp({ quality: 78 }).toFile(webpPath);
      }
      variants.push({ w: vw, h: vh, file: `media/${webp}` });
    }
    // one jpg fallback at the middle size
    const fbW = widths[Math.min(1, widths.length - 1)];
    const jpg = `${id}__${fbW}.jpg`;
    const jpgPath = path.join(OUT_DIR, jpg);
    if (!fs.existsSync(jpgPath)) {
      allExisted = false;
      await sharp(file, { failOn: 'none' }).rotate().resize(fbW).jpeg({ quality: 82 }).toFile(jpgPath);
    }
    manifest[key] = {
      key, w, h,
      variants,
      fallback: `media/${jpg}`,
      full: variants[variants.length - 1].file,
    };
    allExisted ? skipped++ : done++;
  } catch (e) {
    failed++;
    console.error(`✗ ${key}: ${e.message}`);
  }
}

fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
console.log(`derivatives: ${done} generated, ${skipped} cached, ${failed} failed, ${Object.keys(manifest).length} in manifest`);
