/* ΒΛΑΞ site machinery: σκρολτς counter, milestones, ΠΑΟΚ easter egg, καφετιέρα.
   No tracking, no cookies — localStorage only, and only for the record and the καφετιέρα. */

const $ = (s) => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- σκρολτς ---------- */
const nEl = $('#skrolts-n');
const toastEl = $('#skrolts-toast');
let px = Number(sessionStorage.getItem('skrolts-px') || 0);
let lastY = scrollY;
let announced = new Set(JSON.parse(sessionStorage.getItem('skrolts-ann') || '[]'));
let toastTimer = null;

const RECORD_2023 = 402;
const RECORD_DUSSELDORF = 411;

function count() {
  return Math.floor(px / Math.max(innerHeight, 1));
}
function toast(msg, ms = 4200) {
  toastEl.textContent = msg;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
}
function milestone(n) {
  if (n >= 20 && !announced.has(20)) { announced.add(20); toast('Είκοσι; Ωχ, Παναγία μου.'); }
  if (n >= RECORD_2023 && !announced.has(402)) {
    announced.add(402);
    toast('ΝΕΟ ΡΕΚΟΡ: 402 σκρολτς. Το παλιό (402) κρατούσε από το 2023.');
  }
  if (n >= RECORD_DUSSELDORF && !announced.has(411)) {
    announced.add(411);
    toast('411. Ισοφαρίσατε το Ντίσελντορφ. Προσοχή στο γόνατο — διάστρεμμα για την ακρίβεια.');
  }
  if (n > RECORD_DUSSELDORF && n % 50 === 0 && !announced.has(n)) {
    announced.add(n);
    toast('Δεν πειράζει, θα μπορούσαμε να έχουμε πάθει καρδιά. Μια χαρά είσαι.');
  }
  sessionStorage.setItem('skrolts-ann', JSON.stringify([...announced]));
}
function render() {
  const n = count();
  nEl.textContent = String(n);
  const rec = Number(localStorage.getItem('skrolts-record') || 0);
  if (n > rec) localStorage.setItem('skrolts-record', String(n));
  milestone(n);
}
addEventListener('scroll', () => {
  px += Math.abs(scrollY - lastY);
  lastY = scrollY;
  sessionStorage.setItem('skrolts-px', String(px));
  render();
}, { passive: true });
render();

/* hovering the wordmark counts as a σκρολτς — it's in the colophon, so it's a rule */
document.querySelectorAll('.wordmark').forEach((el) => {
  el.addEventListener('mouseenter', () => {
    px += innerHeight;
    sessionStorage.setItem('skrolts-px', String(px));
    render();
    toast('σκρολτς!', 900);
  });
});

/* ---------- καφετιέρα (cookie notice) ---------- */
const kaf = $('#kafetiera');
if (kaf && !localStorage.getItem('kafetiera')) {
  kaf.hidden = false;
  $('#kafetiera-yes').addEventListener('click', () => {
    localStorage.setItem('kafetiera', 'anagomosi');
    kaf.hidden = true;
  });
  $('#kafetiera-no').addEventListener('click', () => {
    localStorage.setItem('kafetiera', 'stin-ygeia-sas');
    kaf.hidden = true;
  });
}

/* ---------- ΠΑΟΚ easter egg: type παοκ (ή paok) ---------- */
const pano = $('#pano');
const ekt = $('#pano-ekt');
let buf = '';
let ektels = 0;
addEventListener('keydown', (e) => {
  if (e.key.length !== 1) return;
  buf = (buf + e.key.toLowerCase()).slice(-8);
  if (buf.endsWith('παοκ') || buf.endsWith('paok')) {
    buf = '';
    ektels = Math.min(ektels + 1, 3);
    ekt.textContent = `εκτέλεσις ${ektels}/3`;
    pano.classList.add('on');
    pano.focus();
    if (ektels === 3) confettiLimbs();
  }
});
pano?.addEventListener('click', () => pano.classList.remove('on'));
addEventListener('keydown', (e) => { if (e.key === 'Escape') pano?.classList.remove('on'); });

function confettiLimbs() {
  const N = reduced ? 8 : 26;
  for (let i = 0; i < N; i++) {
    const s = document.createElement('span');
    s.textContent = '🧸';
    s.setAttribute('aria-hidden', 'true');
    Object.assign(s.style, {
      position: 'fixed',
      left: Math.random() * 100 + 'vw',
      top: '-4vh',
      fontSize: 14 + Math.random() * 22 + 'px',
      zIndex: 95,
      pointerEvents: 'none',
      transform: `rotate(${Math.random() * 360}deg)`,
    });
    document.body.appendChild(s);
    if (reduced) {
      s.style.top = Math.random() * 90 + 'vh';
      setTimeout(() => s.remove(), 2500);
    } else {
      const fall = s.animate(
        [
          { transform: s.style.transform, top: '-4vh' },
          { transform: `rotate(${Math.random() * 720 - 360}deg)`, top: '104vh' },
        ],
        { duration: 2400 + Math.random() * 2200, easing: 'ease-in' }
      );
      fall.onfinish = () => s.remove();
    }
  }
}
