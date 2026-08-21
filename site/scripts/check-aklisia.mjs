/** Το ακλισία-check: the name ΒΛΑΞ never declines anywhere in the built site.
 *  Fails the build on ΒΛΑΚ-/βλάκ-/Βλάκ- forms, except the sanctioned page title
 *  «Οι Βλάκες» / «ΟΙ ΒΛΑΚΕΣ» / «οι βλάκες» (which quotes people, not the name —
 *  itself footnoted on that page). The word «βλάκας» in running prose quoted from
 *  primary sources is allowed ONLY inside <blockquote> — checked crudely here by
 *  allowing lines that also contain 'fbq' or 'blockquote'.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const SANCTIONED = /$^/g; // καμία εξαίρεση: ούτε ο τίτλος «οι βλαξ» κλίνεται (διαταγή συγγραφέα, 22/08/2026)
const DECLINED = /(ΒΛΑΚ|Βλάκ|βλάκ)/;

let bad = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (f.endsWith('.html')) {
      const rel = path.relative(DIST, p);
      // the story text is sacred: the AUTHOR may decline common nouns (Ρούντολφ is
      // «τελευταία πίστα βλάκας») — the rule governs the NAME in site chrome/prose
      if (rel.startsWith('διηγημα/')) continue;
      let html = fs.readFileSync(p, 'utf8');
      html = html.replace(/<blockquote[\s\S]*?<\/blockquote>/g, ''); // quoted primary sources
      html = html.replace(SANCTIONED, '');
      const m = html.match(new RegExp(`.{0,60}${DECLINED.source}.{0,60}`));
      if (m) bad.push(`${rel}: …${m[0].trim()}…`);
    }
  }
}
if (!fs.existsSync(DIST)) { console.error('dist/ not found — build first'); process.exit(1); }
walk(DIST);
if (bad.length) {
  console.error('ΤΟ ΟΝΟΜΑ ΔΕΝ ΚΛΙΝΕΤΑΙ. Παραβάσεις:');
  bad.forEach((b) => console.error('  ' + b));
  process.exit(1);
}
console.log('ακλισία-check: το όνομα δεν έκλινε πουθενά. ✓');
