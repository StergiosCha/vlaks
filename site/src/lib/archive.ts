/**
 * Build-time loader for the ΒΛΑΞ archive.
 *
 * Sources, in rank order (nothing hand-copied without a citation):
 *  1. archive/timeline.csv + archive/assets.csv — the pinned merge.py output.
 *     (NEVER re-run `make merge`: archive/ is a pinned build, see DESIGN.md §10.)
 *  2. normalized/blogs.jsonl — full announcement texts (timeline.csv truncates at 200 chars).
 *  3. src/data/overrides.ts — curated corrections, each with an `evidence` field.
 *     date_iso in the CSV is the blog PUBLISH timestamp, not the event date; real
 *     dates come from prose/titles/FB posts via overrides. Uncorrected -> asterisk.
 *  4. media-manifest.json — real image dimensions + generated derivatives
 *     (assets.csv records "0x0" for 822/825 rows).
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { ARCHIVE_DIR, NORMALIZED_DIR, SITE_ROOT } from './paths';
import { OVERRIDES, EXTRA_EVENTS, SUPPRESSED, type EventPatch } from '../data/overrides';

export type Series = 'ΒΛΑΞ' | 'Περίχωρα' | 'Radical Party' | 'Αθήνα' | 'Other' | 'Merch';
export type Confidence = 'exact' | 'inferred' | 'unknown';

export interface MediaVariant { w: number; h: number; file: string }
export interface MediaEntry {
  key: string;
  w: number; h: number;
  variants: MediaVariant[]; // ascending width, webp
  fallback: string;         // single jpg fallback (site-relative, no base)
  full: string;             // largest generated derivative (site-relative, no base)
}
export interface Asset {
  id: string;
  eventId: string;
  remoteUrl: string;   // blogger /s0/ full-res (public, hotlinkable) — «πρωτότυπο»
  local?: MediaEntry;  // present when we hold the file locally
  credit: string;      // domain-level only; no photographer names exist in the data
}
export interface SourceRef { url: string; label: string }
export interface ArchiveEvent {
  id: string;
  name: string;
  series: Series;
  volume?: string;          // e.g. «vol.04», «1η», «vol.02 (Αθήνα)»
  dateISO?: string;         // corrected event date YYYY-MM-DD when known
  dateDisplay: string;      // human Greek date or honest range
  weekday?: string;         // Greek, from corrected date only
  time?: string;
  venue: string;
  city: string;
  confidence: Confidence;
  cancelled?: boolean;
  announcement?: string;    // full text (blogs.jsonl), never the truncated CSV cell
  sources: SourceRef[];
  evidence?: string[];      // why we believe the date/facts — rendered on the page
  conflictNote?: string;
  gallery: Asset[];
  poster?: MediaEntry;      // resolved from overrides' posterKey
  dual?: { series: Series; volume: string }; // e.g. 5th RP is also Αθήνα vol.02
  sortKey?: string;         // chronology hint for dateless events (never displayed)
}

const GR_MONTHS = ['Ιανουαρίου','Φεβρουαρίου','Μαρτίου','Απριλίου','Μαΐου','Ιουνίου','Ιουλίου','Αυγούστου','Σεπτεμβρίου','Οκτωβρίου','Νοεμβρίου','Δεκεμβρίου'];
export function greekDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${GR_MONTHS[m - 1]} ${y}`;
}
export function greekWeekday(iso: string): string {
  const dt = new Date(iso + 'T12:00:00');
  const w = new Intl.DateTimeFormat('el-GR', { weekday: 'long' }).format(dt);
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function readCsv(file: string): Record<string, string>[] {
  const raw = fs.readFileSync(path.join(ARCHIVE_DIR, file), 'utf8');
  return parse(raw, { columns: true, skip_empty_lines: true });
}
function readJsonl(file: string): any[] {
  const p = path.join(NORMALIZED_DIR, file);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; } // merge.py also skips malformed lines
  });
}

let manifestCache: Record<string, MediaEntry> | null = null;
export function mediaManifest(): Record<string, MediaEntry> {
  if (!manifestCache) {
    const p = path.join(SITE_ROOT, 'src', 'data', 'media-manifest.json');
    manifestCache = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  }
  return manifestCache!;
}
export function media(key: string): MediaEntry | undefined {
  return mediaManifest()[key];
}

function hostLabel(u: string): string {
  try {
    const h = new URL(u).hostname.replace(/^www\./, '');
    return h;
  } catch { return u; }
}

let cache: ArchiveEvent[] | null = null;
export function loadEvents(): ArchiveEvent[] {
  if (cache) return cache;

  const rows = readCsv('timeline.csv');
  const assetRows = readCsv('assets.csv');
  const blogs = readJsonl('blogs.jsonl');
  const byUrl = new Map<string, any>(blogs.map((b) => [b.source_url, b]));
  const manifest = mediaManifest();

  // group assets per event; local_path in the CSV is an absolute Mac path — key by basename
  const assetsByEvent = new Map<string, Asset[]>();
  for (const a of assetRows) {
    const list = assetsByEvent.get(a.event_id) ?? [];
    const base = a.local_path ? path.basename(a.local_path) : '';
    list.push({
      id: a.asset_id,
      eventId: a.event_id,
      remoteUrl: a.url,
      local: base ? manifest[base] : undefined,
      credit: a.credit,
    });
    assetsByEvent.set(a.event_id, list);
  }

  const events: ArchiveEvent[] = [];
  for (const r of rows) {
    if (SUPPRESSED.has(r.event_id)) continue;
    const sources: SourceRef[] = (r.sources || '')
      .split('; ')
      .filter(Boolean)
      .map((u) => ({ url: u, label: hostLabel(u) }));
    // full announcement from blogs.jsonl (longest text among sources)
    let announcement: string | undefined;
    for (const s of sources) {
      const b = byUrl.get(s.url);
      if (b?.text && (!announcement || b.text.length > announcement.length)) announcement = b.text;
    }
    const pub = (r.date_iso || '').slice(0, 10);
    const ev: ArchiveEvent = {
      id: r.event_id,
      name: r.event_name,
      series: (r.series as Series) || 'Other',
      volume: r.number || undefined,
      dateISO: undefined, // publish date is NOT an event date; overrides supply real ones
      dateDisplay: pub ? `δημοσίευση ${greekDate(pub)}` : 'χωρίς ημερομηνία',
      venue: r.venue === 'Unknown' ? 'άγνωστο' : r.venue,
      city: r.city,
      time: r.time || undefined, // heuristic upstream; display only when corroborated
      confidence: (r.date_confidence as Confidence) || 'unknown',
      announcement,
      sources,
      gallery: assetsByEvent.get(r.event_id) ?? [],
    };
    const patch = OVERRIDES[r.event_id];
    if (patch) applyPatch(ev, patch);
    events.push(ev);
  }

  for (const extra of EXTRA_EVENTS) {
    const ev: ArchiveEvent = {
      id: extra.id!,
      name: extra.name!,
      series: extra.series ?? 'ΒΛΑΞ',
      volume: extra.volume,
      dateISO: extra.dateISO,
      dateDisplay: extra.dateDisplay ?? (extra.dateISO ? greekDate(extra.dateISO) : 'άγνωστη ημερομηνία'),
      weekday: extra.dateISO && !extra.dateDisplay ? greekWeekday(extra.dateISO) : undefined,
      time: extra.time,
      venue: extra.venue ?? 'Fuit Art Cafe',
      city: extra.city ?? 'Γρεβενά',
      confidence: extra.confidence ?? 'inferred',
      sortKey: extra.sortKey,
      cancelled: extra.cancelled,
      announcement: extra.announcement,
      sources: extra.sources ?? [],
      evidence: extra.evidence,
      conflictNote: extra.conflictNote,
      gallery: [],
      dual: extra.dual,
    };
    // galleries may be re-attached by filename prefix
    if (extra.galleryPrefix) {
      const manifestEntries = Object.entries(mediaManifest())
        .filter(([k]) => k.startsWith(extra.galleryPrefix!))
        .sort(([a], [b]) => a.localeCompare(b, 'el', { numeric: true }));
      ev.gallery = manifestEntries.map(([k, m], i) => ({
        id: `${ev.id}_local_${i}`,
        eventId: ev.id,
        remoteUrl: '',
        local: m,
        credit: 'fuit.gr',
      }));
    }
    if (extra.announcementFromUrl) {
      const b = byUrl.get(extra.announcementFromUrl);
      if (b?.text && !extra.announcement) ev.announcement = b.text;
    }
    if (extra.posterKey) ev.poster = media(extra.posterKey);
    events.push(ev);
  }

  cache = events;
  return events;
}

function applyPatch(ev: ArchiveEvent, p: EventPatch) {
  if (p.name) ev.name = p.name;
  if (p.series) ev.series = p.series;
  if (p.volume !== undefined) ev.volume = p.volume || undefined;
  if (p.dateISO) {
    ev.dateISO = p.dateISO;
    ev.dateDisplay = p.dateDisplay ?? greekDate(p.dateISO);
    ev.weekday = greekWeekday(p.dateISO);
    ev.confidence = p.confidence ?? 'exact';
  } else if (p.dateDisplay) {
    ev.dateDisplay = p.dateDisplay;
    ev.confidence = p.confidence ?? 'inferred';
  } else if (p.confidence) {
    ev.confidence = p.confidence;
  }
  if (p.time !== undefined) ev.time = p.time || undefined;
  if (p.venue) ev.venue = p.venue;
  if (p.city) ev.city = p.city;
  if (p.evidence) ev.evidence = p.evidence;
  if (p.conflictNote) ev.conflictNote = p.conflictNote;
  if (p.dual) ev.dual = p.dual;
  if (p.posterKey) ev.poster = media(p.posterKey);
  if (p.dropGalleryPrefix) {
    ev.gallery = ev.gallery.filter((a) => {
      const base = a.local ? a.local.key : '';
      return !base.startsWith(p.dropGalleryPrefix!);
    });
  }
}

/** The three public series, ordered for the Χρονολόγιο page. */
export function seriesEvents() {
  const all = loadEvents();
  const bySeries = (s: Series) =>
    all.filter((e) => e.series === s || e.dual?.series === s)
       .sort((a, b) => (a.sortKey ?? a.dateISO ?? '9999').localeCompare(b.sortKey ?? b.dateISO ?? '9999'));
  return {
    vlax: bySeries('ΒΛΑΞ'),
    perixora: bySeries('Περίχωρα'),
    radical: bySeries('Radical Party'),
    athens: bySeries('Αθήνα'),
    other: all.filter((e) => e.series === 'Other'),
    merch: all.filter((e) => e.series === 'Merch'),
  };
}
