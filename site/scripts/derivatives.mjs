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
  ['texts/afisa-2016-apo-fb.jpg', 'afisa-2016.jpg'], // vol.01 poster, extracted from the FB PDF
  // raw/own/: photos supplied directly by the owners (21/08/2026)
  ['raw/own/afisa-vol02.jpg', 'afisa-vol02.jpg'],
  ['raw/own/afisa-vol02-ston-dromo.jpg', 'afisa-vol02-ston-dromo.jpg'],
  ['raw/own/afisa-vol04-hires.jpg', 'afisa-vol04-hires.jpg'],
  ['raw/own/nixta.jpg', 'nixta.jpg'],
  ['raw/own/mittas-gleifitzouria.jpg', 'mittas-gleifitzouria.jpg'],
  ['raw/own/mittas-leopar.jpg', 'mittas-leopar.jpg'],
  ['raw/own/arkoudotoixos.jpg', 'arkoudotoixos.jpg'],
  ['raw/own/arkoudoparathyro.jpg', 'arkoudoparathyro.jpg'],
  ['raw/own/agiovasilides.jpg', 'agiovasilides.jpg'],
  ['raw/own/xotiko-sombrero.jpg', 'xotiko-sombrero.jpg'],
  ['raw/own/gleifitzouria-kaktos.jpg', 'gleifitzouria-kaktos.jpg'],
  ['raw/own/kolara.jpg', 'kolara.jpg'],
  ['raw/own/trio-gyalia.jpg', 'trio-gyalia.jpg'],
  // extracted from the saved FB PDF (21/08/2026) — τα περίχωρα
  ['raw/own/pikatsu.jpg', 'pikatsu.jpg'],
  ['raw/own/grover.jpg', 'grover.jpg'],
  ['raw/own/istories-1.jpg', 'istories-1.jpg'],
  ['raw/own/istories-2.jpg', 'istories-2.jpg'],
  ['raw/own/thanatos-eikonografisi.jpg', 'thanatos-eikonografisi.jpg'],
  ['raw/own/balkan-1.jpg', 'balkan-1.jpg'],
  ['raw/own/balkan-2.jpg', 'balkan-2.jpg'],
  ['raw/own/balkan-3.jpg', 'balkan-3.jpg'],
  ['raw/own/balkan-4.jpg', 'balkan-4.jpg'],
  ['raw/own/balkan-5.jpg', 'balkan-5.jpg'],
  ['raw/own/sundoeach.jpg', 'sundoeach.jpg'], // ο Φούιτ σήμερα: Sun Do Each, Θεσσαλονίκη
  // αφίσες σε τυπογραφική ανάλυση, από τον φάκελο των ιδίων (22/08/2026)
  ['raw/own/afises/afisa-vol01-hires.jpg', 'afisa-vol01-hires.jpg'],
  ['raw/own/afises/afisa-vol02-hires.jpg', 'afisa-vol02-hires.jpg'],
  ['raw/own/afises/afisa-propolisi-2018.jpg', 'afisa-propolisi-2018.jpg'],
  ['raw/own/afises/afisa-vol03-hires.jpg', 'afisa-vol03-hires.jpg'],
  ['raw/own/afises/afisa-vol04-hires.jpg', 'afisa-vol04-hires.jpg'],
  ['raw/own/afises/afisa-vol04-parallagi.jpg', 'afisa-vol04-parallagi.jpg'],
  ['raw/own/afises/afisa-2021-asteia.jpg', 'afisa-2021-asteia.jpg'],
  ['raw/own/afises/afisa-athina-2024.jpg', 'afisa-athina-2024.jpg'],
  // καρέ-αφίσες για τα τρία βίντεο του vol.01
  ['raw/own/video/vol01-1-poster.jpg', 'vol01-1-poster.jpg'],
  ['raw/own/video/vol01-2-poster.jpg', 'vol01-2-poster.jpg'],
  ['raw/own/video/vol01-3-poster.jpg', 'vol01-3-poster.jpg'],
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
