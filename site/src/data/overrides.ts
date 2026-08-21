/**
 * Curated corrections to the pinned archive build.
 * Every entry cites its evidence; the site renders the evidence, not just the result.
 * Rule: date_iso in timeline.csv is the blog PUBLISH timestamp. Real event dates come
 * from titles, announcement prose, posters and the owner's Facebook posts (see fbPosts.ts).
 * Nothing here is invented: if we don't know, the event keeps its asterisk.
 */
import type { Series, Confidence, SourceRef } from '../lib/archive';

export interface EventPatch {
  name?: string;
  series?: Series;
  volume?: string;
  dateISO?: string;
  dateDisplay?: string;
  time?: string;
  venue?: string;
  city?: string;
  confidence?: Confidence;
  evidence?: string[];
  conflictNote?: string;
  dual?: { series: Series; volume: string };
  dropGalleryPrefix?: string;
  posterKey?: string; // basename in media-manifest (e.g. the loose poster scans)
}

export interface ExtraEvent extends EventPatch {
  id?: string;
  cancelled?: boolean;
  announcement?: string;
  announcementFromUrl?: string;
  sources?: SourceRef[];
  galleryPrefix?: string;
}

/** Announcement-only blog rows folded into their event; merch rows reclassified. */
export const SUPPRESSED = new Set<string>([
  'ev_090', // «Athens 07/07 - Ράντικαλ Πάρτι vol.02» — announcement of the 5th RP (created below)
  'ev_097', // «Elatochori 04/11» — announcement of the 3rd RP
  'ev_100', // «THESSALONIKI 01/10» — announcement of the 2nd RP
  'ev_103', // «ATHENS 14/05» — announcement of the 1st RP
  'ev_086', // «VASILITSA 24-25/01» — announcement of the 6th RP
]);

export const OVERRIDES: Record<string, EventPatch> = {
  // ── the bad merge: ΒΛΑΞ vol.04 was absorbed into MANITAROCK vol.14 (±1-day clustering).
  //    vol.04 is re-created as its own event below; this row becomes plain Manitarock again.
  ev_014: {
    name: 'MANITAROCK vol.14',
    series: 'Other',
    volume: '',
    evidence: [
      'Διόρθωση: το merge.py κόλλησε το ΒΛΑΞ vol.04 πάνω στο Manitarock vol.14 (κανόνας ±1 ημέρας). Χωρίστηκαν.',
    ],
  },

  // ── Radical Party road-show: real dates from the announcement titles/prose.
  ev_102: {
    name: '1η Ράντικαλ Πάρτι — Κουκάκι, Αθήνα',
    volume: '1η',
    dateISO: '2023-05-14',
    venue: 'Καφενείο Η Αυλή',
    city: 'Αθήνα',
    evidence: ['Ημερομηνία από τον τίτλο της αναγγελίας «ATHENS 14/05 - Ράντικαλ Πάρτι» (fuitwashere.gr).'],
    dual: { series: 'Αθήνα', volume: 'vol.01' },
  },
  ev_099: {
    name: '2η Ράντικαλ Πάρτι — Thermaikos Bar, Θεσσαλονίκη',
    volume: '2η',
    dateISO: '2023-10-01',
    venue: 'Thermaikos Bar',
    city: 'Θεσσαλονίκη',
    evidence: ['Ημερομηνία από τον τίτλο της αναγγελίας «THESSALONIKI 01/10 - Ράντικαλ Πάρτι».'],
  },
  ev_096: {
    name: '3η Ράντικαλ Πάρτι — Alseides, Ελατοχώρι',
    volume: '3η',
    dateISO: '2023-11-04',
    venue: 'Alseides Boutique Hotel',
    city: 'Ελατοχώρι',
    evidence: ['Ημερομηνία από τον τίτλο της αναγγελίας «Elatochori 04/11 - Ράντικαλ Πάρτι».'],
  },
  ev_092: {
    name: '4η Ράντικαλ Πάρτι — Βασίλιτσα',
    volume: '4η',
    dateDisplay: 'Ιανουάριος 2024',
    venue: 'Βασίλιτσα Ski Resort',
    city: 'Γρεβενά',
    confidence: 'inferred',
    evidence: ['Το ανέβασμα της ανασκόπησης έγινε 25/01/2024· ακριβής μέρα δεν τεκμηριώνεται. Αστερίσκος.'],
  },
  ev_085: {
    name: '6η Ράντικαλ Πάρτι — Βασίλιτσα',
    volume: '6η',
    dateISO: '2025-01-24',
    dateDisplay: '24–25 Ιανουαρίου 2025',
    venue: 'Βασίλιτσα Ski Resort',
    city: 'Γρεβενά',
    confidence: 'inferred',
    evidence: ['Διήμερο από τον τίτλο της αναγγελίας «VASILITSA 24-25/01 - Ράντικαλ Πάρτι» (δημ. 12/12/2024).'],
  },
  ev_089: {
    // the 8-photo 5th-RP album was wrongly attached here; re-attached to rp-05 below
    dropGalleryPrefix: '2024-05-17_5th_Radical_Party',
    evidence: ['Το άλμπουμ της 5ης Ράντικαλ (8 φωτ.) ήταν κολλημένο σε αυτό το event· μεταφέρθηκε εκεί που ανήκει.'],
  },

  // ── merch posts are not events
  ev_091: { series: 'Merch' },
  ev_095: { series: 'Merch' },
  ev_109: { series: 'Merch' },
  ev_111: { series: 'Merch' },
  ev_113: { series: 'Merch' },

  // ── mislabeled series
  ev_003: {
    series: 'Other', // blog year-review, not a ΒΛΑΞ event; it is EVIDENCE for the 2020 cancellation
    evidence: ['Η «ΑΝΑΣΚΟΠΗΣΗ 2020» είναι απολογισμός, όχι πάρτι· τεκμηριώνει όμως τη ματαίωση του 2020.'],
  },
};

export const EXTRA_EVENTS: ExtraEvent[] = [
  // ── the real ΒΛΑΞ series, reconstructed from primary sources ──
  {
    id: 'vlax-vol01',
    name: '80s party με τους ΒΛΑΞ (το «αρκουδάκι πάρτι»)',
    series: 'ΒΛΑΞ',
    volume: 'vol.01',
    dateISO: '2016-12-29',
    time: '23:00 «πάνω κάτω»',
    venue: 'Fuit Art Cafe',
    city: 'Γρεβενά',
    confidence: 'exact',
    announcement:
      'Από την αφίσα: «ΟΙ ΒΛΑΞ (dj set, live performance, κεράσματα, ξεφτιλίκια) — 29 Δεκεμβρίου 2016, 23:00 πάνω κάτω. Πού; Στο καλύτερο καφέ της Γης.» Από το ριπόρτ της επομένης: μοιράστηκαν 30 αρκουδάκια, γράφτηκε με το κραγιόν της κ. Μυρτώς «δεν δεχόμαστε παραγγελίες. Τέλος!», φορέθηκαν φανέλες Κόμπι Μπράιαντ και Αντετοκούμπο, και επιχειρήθηκε ο χορός ή το σύνολο τεχνικών χορού Σκρολτς.',
    evidence: [
      'FB ποστ 14/12/2016 (αναγγελία), 28/12/2016 («η περιγραφή του ιβέντ ως “κωμωδία” δεν είναι τυπογραφικό λάθος»), 30/12/2016 (ριπόρτ).',
      'Το gaps.md έλεγε «vol.01: inferred Δεκ 2016 – Ιαν 2017» — τα ποστ το κλείδωσαν: 29/12/2016.',
    ],
    sources: [],
  },
  {
    id: 'vlax-vol02',
    name: 'ΒΛΑΞ vol.02',
    series: 'ΒΛΑΞ',
    volume: 'vol.02',
    dateDisplay: 'κάπου μεταξύ Δεκεμβρίου 2017 και Ιανουαρίου 2018',
    confidence: 'inferred',
    announcement: 'Καμία αφίσα, καμία ανάρτηση, καμία φωτογραφία δεν έχει βρεθεί. Το πάρτι όμως έγινε — κάπου εκεί. Αν ήσουν, πες μας (σελίδα Κενά).',
    evidence: ['gaps.md: κανένα blog post στο fuit.gr· η ύπαρξη συνάγεται από την αρίθμηση του vol.3 (2018).'],
    sources: [],
  },
  {
    id: 'vlax-vol03',
    name: 'οι βλαξ vol. 3: οι ντένεξ',
    series: 'ΒΛΑΞ',
    volume: 'vol.03',
    dateISO: '2018-12-27',
    venue: 'Fuit Art Cafe',
    city: 'Γρεβενά',
    confidence: 'exact',
    announcement:
      'Από το ποστ της ημέρας: «είμαστε οι βλαξ και δεν κλινόμαστε. […] Αδυναμία συμμόρφωσης σημαίνει έξοδος από το κατάστημα με χωρίς γλειφιτζούρι. Είμαστε ντενεκέδες και όχι τενεκέδες. Τενεκέδες να πείτε τη θεια σας. […] Δεν δεχόμαστε παραγγελίες, μην προσπαθείτε. Ξεφτιλιζόμαστε και μόνοι μας. […] Αν είστε αδερφές, ελάτε να μιλήσουμε.»',
    evidence: ['FB ποστ 27/12/2018 + η αφίσα με τους δυο ντενεκέδες («+ = μούρλια»).'],
    posterKey: 'vlaks5.jpg',
    sources: [],
  },
  {
    id: 'vlax-vol04',
    name: 'ΒΛΑΞ vol.04',
    series: 'ΒΛΑΞ',
    volume: 'vol.04',
    dateISO: '2019-12-28',
    time: '18:00',
    venue: 'Fuit Art Cafe',
    city: 'Γρεβενά',
    confidence: 'exact',
    announcementFromUrl: 'https://www.fuit.gr/2020/01/vol04.html',
    galleryPrefix: '2020-01-13_ΒΛΑΞ_vol_04_',
    evidence: [
      'Η αφίσα-απαγορευτικό: «Σάββατο 28 Δεκεμβρίου 2019, 18:00».',
      'Blog «ΒΛΑΞ vol.04.» (δημ. 13/01/2020) — όλο κι όλο το κείμενο: «Χριστούγεννα 2019». Λακωνικό.',
      'Αποκολλήθηκε από το «MANITAROCK vol.14» όπου το είχε ενώσει λάθος του pipeline.',
    ],
    conflictNote: 'Το blog δημοσιεύτηκε 13/01/2020 — δύο εβδομάδες μετά το πάρτι. Ημερομηνία event ≠ ημερομηνία ανάρτησης.',
    posterKey: 'vlaks2.jpg',
    sources: [{ url: 'https://www.fuit.gr/2020/01/vol04.html', label: 'fuit.gr' }],
  },
  {
    id: 'vlax-2020',
    name: 'ΒΛΑΞ 2020 — δεν έγινε',
    series: 'ΒΛΑΞ',
    dateDisplay: 'Δεκέμβριος 2020',
    confidence: 'exact',
    cancelled: true,
    announcement:
      'Από την ΑΝΑΣΚΟΠΗΣΗ 2020 του fuit.gr: «Το event του συγκεκριμένου μήνα ήταν με διαφορά οι ΒΛΑΞ, κάτι που σας υποσχόμαστε πως θα γίνει μόλις ανοίξουμε με το καλό και επιστρέψουμε στην κανονικότητα. Μέχρι τότε περιμένουμε πότε θα ξεμπλέξουμε από τους ΒΛΑΞ που μας κυβερνάνε και έχουν χάσει τη μπάλα.»',
    evidence: ['fuit.gr, ΑΝΑΣΚΟΠΗΣΗ 2020 (28/12/2020).'],
    sources: [{ url: 'https://www.fuit.gr/2020/12/2020.html', label: 'fuit.gr' }],
  },
  {
    id: 'vlax-2021',
    name: 'ΒΛΑΞ 2021 — δεν έγινε',
    series: 'ΒΛΑΞ',
    dateDisplay: 'Δεκέμβριος 2021',
    confidence: 'exact',
    cancelled: true,
    announcement:
      'Από το ποστ της 26/12/2021: «Πάρτι βλαξ χωρίς να κρεμόμαστε από τα πόμολα και τα πιαστράκια στο μπαρ και τον Φούιτ να φτάει νότες στο τρομπόνι δεν γίνεται, οπότε θα περιμένουμε λίγο.»',
    evidence: ['FB ποστ 26/12/2021, με την ασπρόμαυρη φωτογραφία του Φούιτ με το τρομπόνι (υπογραφή «LMP»).'],
    sources: [],
  },

  // ── the missing 5th Radical Party, with its orphaned gallery re-attached ──
  {
    id: 'rp-05',
    name: '5η Ράντικαλ Πάρτι — Κουκάκι, Αθήνα',
    series: 'Radical Party',
    volume: '5η',
    dateISO: '2024-07-07',
    time: '«άφτερ 5 το μεσημέρι»',
    venue: 'Καφενείο Η Αυλή, Γεωργάκη Ολυμπίου 1',
    city: 'Αθήνα',
    confidence: 'exact',
    announcementFromUrl: 'https://www.fuitwashere.gr/2024/06/athens-0707-vol02.html',
    galleryPrefix: '2024-05-17_5th_Radical_Party',
    evidence: [
      'Η αναγγελία γράφει ρητά: «Την Κυριακή 7 Ιουλίου λίγο μετά τις 5 το απόγευμα» — και 7/7/2024 ήταν πράγματι Κυριακή.',
      'Το event ΔΕΝ είχε δική του γραμμή στο χρονολόγιο του pipeline· το άλμπουμ του (8 φωτ.) ήταν κολλημένο στο «Lake Project». Επανασυνδέθηκε.',
    ],
    conflictNote:
      'Τα στοιχεία διαφωνούν: λεζάντα στο Instagram λέει 14 Μαΐου 2023 (η ημερομηνία της 1ης!), τα metadata των φωτογραφιών και το FB event λένε Κυριακή 7 Ιουλίου 2024. Κρατάμε το δεύτερο· η λεζάντα προφανώς νοσταλγούσε.',
    dual: { series: 'Αθήνα', volume: 'vol.02' },
    sources: [{ url: 'https://www.fuitwashere.gr/2024/06/athens-0707-vol02.html', label: 'fuitwashere.gr' }],
  },
];
