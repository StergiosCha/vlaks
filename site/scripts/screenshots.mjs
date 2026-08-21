/** Screenshot every page at mobile + desktop into ../screenshots/.
 *  Run with the preview server up: npm run preview (port 4362) — or pass BASE_URL. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(SITE, '..', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const BASE = process.env.BASE_URL || 'http://localhost:4362/vlaks';
const PAGES = [
  ['', 'archiki'],
  ['διηγημα/', 'diigima'],
  ['χρονολογιο/', 'xronologio'],
  ['διαφωνιες/', 'diafonies'],
  ['αφισες/', 'afises'],
  ['φωτογραφιες/', 'fotografies'],
  ['μουσικη/', 'mousiki'],
  ['βλακες/', 'vlakes'],
  ['fuit/', 'fuit'],
  ['κρατησεις/', 'kratiseis'],
  ['κενα/', 'kena'],
  ['en/', 'en'],
  ['404.html', '404'],
];
const VIEWPORTS = [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
];

const browser = await chromium.launch();
for (const [vpName, viewport] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const [slug, name] of PAGES) {
    const url = `${BASE}/${slug}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      // dismiss the καφετιέρα so it doesn't cover every shot
      await page.evaluate(() => localStorage.setItem('kafetiera', 'anagomosi'));
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(600); // fonts settle
      await page.screenshot({ path: path.join(OUT, `${name}-${vpName}.png`), fullPage: name !== 'diigima' });
      if (name === 'diigima') {
        // the story is ~20k px tall; viewport shot + one mid-scroll shot instead of fullPage
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight * 0.35));
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(OUT, `${name}-mid-${vpName}.png`) });
      }
      console.log(`✓ ${name}-${vpName}`);
    } catch (e) {
      console.error(`✗ ${name}-${vpName}: ${e.message}`);
    }
  }
  await ctx.close();
}
await browser.close();
console.log('screenshots →', OUT);
