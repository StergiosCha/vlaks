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
  sortKey?: string; // chronology hint for dateless events (never displayed)
  cancelled?: boolean;
  announcement?: string;
  announcementFromUrl?: string;
  sources?: SourceRef[];
  galleryPrefix?: string;
  galleryCredit?: string; // credit line for galleryPrefix galleries (default fuit.gr)
}

/** Announcement-only blog rows folded into their event; merch rows reclassified. */
export const SUPPRESSED = new Set<string>([
  'ev_090', // «Athens 07/07 - Ράντικαλ Πάρτι vol.02», announcement of the 5th RP (created below)
  'ev_097', // «Elatochori 04/11», announcement of the 3rd RP
  'ev_100', // «THESSALONIKI 01/10», announcement of the 2nd RP
  'ev_103', // «ATHENS 14/05», announcement of the 1st RP
  'ev_086', // «VASILITSA 24-25/01», announcement of the 6th RP
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
    name: '1η Ράντικαλ Πάρτι, Κουκάκι, Αθήνα',
    volume: '1η',
    dateISO: '2023-05-14',
    venue: 'Καφενείο Η Αυλή',
    city: 'Αθήνα',
    evidence: ['Ημερομηνία από τον τίτλο της αναγγελίας «ATHENS 14/05 - Ράντικαλ Πάρτι» (fuitwashere.gr).'],
    dual: { series: 'Αθήνα', volume: 'vol.01' },
  },
  ev_099: {
    name: '2η Ράντικαλ Πάρτι, Thermaikos Bar, Θεσσαλονίκη',
    volume: '2η',
    dateISO: '2023-10-01',
    venue: 'Thermaikos Bar',
    city: 'Θεσσαλονίκη',
    evidence: ['Ημερομηνία από τον τίτλο της αναγγελίας «THESSALONIKI 01/10 - Ράντικαλ Πάρτι».'],
  },
  ev_096: {
    name: '3η Ράντικαλ Πάρτι, Alseides, Ελατοχώρι',
    volume: '3η',
    dateISO: '2023-11-04',
    venue: 'Alseides Boutique Hotel',
    city: 'Ελατοχώρι',
    evidence: ['Ημερομηνία από τον τίτλο της αναγγελίας «Elatochori 04/11 - Ράντικαλ Πάρτι».'],
  },
  ev_092: {
    name: '4η Ράντικαλ Πάρτι, Βασίλιτσα',
    volume: '4η',
    dateISO: '2024-01-19',
    dateDisplay: '19–20 Ιανουαρίου 2024',
    venue: 'Βασίλιτσα Ski Resort',
    city: 'Γρεβενά',
    confidence: 'exact',
    evidence: [
      'Αναγγελία «VASILITSA 19-20/01 - Ράντικαλ Πάρτι» (δημ. 09/11/2023). Το διήμερο στον τίτλο.',
      'Η ανασκόπηση ανέβηκε 25/01/2024, πέντε μέρες μετά. Οι ημερομηνίες δένουν.',
    ],
  },
  ev_085: {
    name: '6η Ράντικαλ Πάρτι, Βασίλιτσα',
    volume: '6η',
    dateISO: '2025-01-24',
    dateDisplay: '24–25 Ιανουαρίου 2025',
    venue: 'Βασίλιτσα Ski Resort',
    city: 'Γρεβενά',
    confidence: 'inferred',
    evidence: ['Διήμερο από τον τίτλο της αναγγελίας «VASILITSA 24-25/01 - Ράντικαλ Πάρτι» (δημ. 12/12/2024).'],
  },
  ev_089: {
    // the 8-photo 5th-RP album was wrongly attached here; re-attached to rp-05 below.
    // also: a trip post, not a party, belongs to Other, not the party timeline
    series: 'Other',
    dropGalleryPrefix: '2024-05-17_5th_Radical_Party',
    evidence: ['Το άλμπουμ της 5ης Ράντικαλ (8 φωτ.) ήταν κολλημένο σε αυτό το event. Μεταφέρθηκε εκεί που ανήκει.'],
  },

  // ── merch posts are not events
  ev_091: { series: 'Merch' },
  ev_095: { series: 'Merch' },
  ev_109: { series: 'Merch' },
  ev_111: { series: 'Merch' },
  ev_113: { series: 'Merch' },

  // ── fuitwashere blog posts that are not parties (trips, About, photo essays):
  //    real material, wrong shelf, they feed the Fuit page, not the party timeline
  ev_101: { series: 'Other' }, // Keep Vasilitsa Weird (trip post)
  ev_106: { series: 'Other' }, // Fuit Was Here - Our People
  ev_107: { series: 'Other' }, // Fuit was in Thessaloniki
  ev_110: { series: 'Other' }, // Fuit was in Cyprus
  ev_112: { series: 'Other' }, // Fuit Was Here - Our People (β΄)
  ev_115: { series: 'Other' }, // About Us

  // ── mislabeled series
  ev_003: {
    series: 'Other', // blog year-review, not a ΒΛΑΞ event; it is EVIDENCE for the 2020 cancellation
    evidence: ['Η «ΑΝΑΣΚΟΠΗΣΗ 2020» είναι απολογισμός, όχι πάρτι. Τεκμηριώνει όμως τη ματαίωση του 2020.'],
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
      'Από την αφίσα: «ΟΙ ΒΛΑΞ (dj set, live performance, κεράσματα, ξεφτιλίκια), 29 Δεκεμβρίου 2016, 23:00 πάνω κάτω. Πού; Στο καλύτερο καφέ της Γης.» Από το ριπόρτ της επομένης: μοιράστηκαν 30 αρκουδάκια, γράφτηκε με το κραγιόν της κ. Μυρτώς «δεν δεχόμαστε παραγγελίες. Τέλος!», φορέθηκαν φανέλες Κόμπι Μπράιαντ και Αντετοκούμπο, και επιχειρήθηκε ο χορός ή το σύνολο τεχνικών χορού Σκρολτς.',
    evidence: [
      'FB ποστ 14/12/2016 (αναγγελία), 28/12/2016 («η περιγραφή του ιβέντ ως “κωμωδία” δεν είναι τυπογραφικό λάθος»), 30/12/2016 (ριπόρτ).',
      'Το gaps.md έλεγε «vol.01: inferred Δεκ 2016 – Ιαν 2017». Τα ποστ το κλείδωσαν: 29/12/2016.',
      'Η αφίσα βρέθηκε στον φάκελο των ιδίων (22/08/2026) σε 714×1000. Καλύτερη από το στιγμιότυπο των 552×773 που είχαμε σώσει από PDF. Ψηφιακό πρωτότυπο (PSD) δεν σώζεται για το 2016.',
    ],
    posterKey: 'afisa-vol01-hires.jpg',
    sources: [],
  },
  {
    id: 'vlax-vol02',
    name: 'ΒΛΑΞ vol.02',
    series: 'ΒΛΑΞ',
    volume: 'vol.02',
    dateISO: '2017-12-29',
    time: '«11η βραδινή»',
    venue: '«στον παλιό τον Βρίβο» (κατά την αφίσα)',
    city: 'Γρεβενά',
    confidence: 'exact',
    announcement:
      'Από την αφίσα: «Ο Στέργιος Χατζηκυριακίδης και ο Αλέξανδρος Χαντζής είναι: οι βλάξ. Μουσική. Χορός. Πλούσια δώρα. Ντροπιαστικές καταστάσεις. 29 Δεκεμβρίου 2017, 11η βραδινή. Είσοδος: 143 €/άτομο με ζεστό κρασί.» Στην αφίσα: οι φανέλες Bryant 24 και Αντετοκούνμπο 34, με σκουφάκια.',
    evidence: [
      'Η αφίσα βρέθηκε 21/08/2026, 23:31. Δέκα χρόνια αγνοούμενη, ήρθε με τα αρχεία των ίδιων. Το gaps.md έλεγε «inferred Δεκ 2017 – Ιαν 2018». Η αφίσα λέει 29 Δεκεμβρίου 2017.',
      'Σώζεται και φωτογραφία της αφίσας στον δρόμο, σε σταντ μπίρας έξω από το μαγαζί.',
      'Για τα 143 €/άτομο δεν βρέθηκε ούτε ένας που να τα πλήρωσε.',
      'Η αφίσα σε τυπογραφική ανάλυση (3504×4971) βρέθηκε 22/08/2026 και προσθέτει μια γραμμή που έλειπε: «11η βραδινή, στον παλιό τον Βρίβο». Τι ήταν ο Βρίβος, το αρχείο δεν το ξέρει. Αν ξέρεις, πες μας.',
    ],
    posterKey: 'afisa-vol02-hires.jpg',
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
    evidence: [
      'FB ποστ 27/12/2018 + η αφίσα με τους δυο ντενεκέδες («+ = μούρλια»), σε τυπογραφική ανάλυση από τον φάκελο των ιδίων.',
      'ΠΡΟΣΟΧΗ: σώζεται και αφίσα προπώλησης που γράφει «29 Δεκεμβρίου 2018». Τα στοιχεία διαφωνούν. Βλ. τη σχετική σελίδα.',
    ],
    conflictNote: 'Η αφίσα προπώλησης λέει 29 Δεκεμβρίου 2018. Η τελική αφίσα και το ποστ της ημέρας λένε 27 Δεκεμβρίου 2018.',
    posterKey: 'afisa-vol03-hires.jpg',
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
      'Blog «ΒΛΑΞ vol.04.» (δημ. 13/01/2020): όλο κι όλο το κείμενο: «Χριστούγεννα 2019». Λακωνικό.',
      'Αποκολλήθηκε από το «MANITAROCK vol.14» όπου το είχε ενώσει λάθος του pipeline.',
    ],
    conflictNote: 'Το blog δημοσιεύτηκε 13/01/2020. Δύο εβδομάδες μετά το πάρτι. Ημερομηνία event ≠ ημερομηνία ανάρτησης.',
    posterKey: 'afisa-vol04-hires.jpg',
    sources: [{ url: 'https://www.fuit.gr/2020/01/vol04.html', label: 'fuit.gr' }],
  },
  {
    id: 'vlax-2020',
    name: 'ΒΛΑΞ 2020, δεν έγινε',
    series: 'ΒΛΑΞ',
    sortKey: '2020-12-28',
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
    name: 'ΒΛΑΞ 2021, δεν έγινε',
    series: 'ΒΛΑΞ',
    sortKey: '2021-12-26',
    dateDisplay: 'Δεκέμβριος 2021',
    confidence: 'exact',
    cancelled: true,
    announcement:
      'Από το ποστ της 26/12/2021: «Πάρτι βλαξ χωρίς να κρεμόμαστε από τα πόμολα και τα πιαστράκια στο μπαρ και τον Φούιτ να φτάει νότες στο τρομπόνι δεν γίνεται, οπότε θα περιμένουμε λίγο.»',
    evidence: [
      'FB ποστ 26/12/2021, με την ασπρόμαυρη φωτογραφία του Φούιτ με το τρομπόνι (υπογραφή «LMP»).',
      'Η ματαίωση απέκτησε και δική της αφίσα: δύο ραπίντ τεστ, ένα αρνητικό κι ένα θετικό, με την υπόσχεση «θα επιστρέψουν το 2022». Δεν επέστρεψαν. Το Fuit έκλεισε το 2022.',
    ],
    posterKey: 'afisa-2021-asteia.jpg',
    sources: [],
  },

  // ── τα περίχωρα: the events around the series, stories, awards, lamps ──
  {
    id: 'per-pikatsu',
    posterKey: 'pikatsu.jpg',
    name: 'Το λαμπατέρ πικατσού μπαίνει σε υπηρεσία',
    series: 'Περίχωρα',
    dateISO: '2016-12-25',
    venue: 'Fuit Art Cafe',
    city: 'Γρεβενά',
    confidence: 'exact',
    announcement:
      '«Όποια/όποιον βλέπουμε ότι ετοιμάζεται να φλερτάρει, πηγαίνουμε και ρωτάμε αν είναι ελεύθερη/ελεύθερος. Αν η απάντηση είναι θετική, βάζουμε το λαμπατεράκι στον ώμο της/του και το ανάβουμε, ελεύθερη/ελεύθερος φάση σαν τα ταξί. Ένας χτες μας είπε: παντρεμένος αλλά δεν πειράζει, άναψέ το!»',
    evidence: ['FB ποστ 25/12/2016, με φωτογραφία του λαμπατέρ (πικατσού που πλένει τα δόντια του, ροζ βάση). «Αν και παιδικό, το λαμπατέρ φωτίζει σχεδόν μέχρι τ’ Μπούρα.»'],
    sources: [],
  },
  {
    id: 'per-balkan-tour',
    posterKey: 'balkan-4.jpg',
    galleryPrefix: 'balkan-',
    galleryCredit: 'αρχείο των ιδίων (FB 09/08/2017)',
    name: 'Μπάλκαν τουρ, ριπόρτ νούμερο 4 («σων’ χιλιόμετρα τώρα»)',
    series: 'Περίχωρα',
    dateISO: '2017-08-09',
    venue: 'Ντουμπρόβνικ → Σπλιτ, μέσω 8 χλμ. Βοσνίας',
    city: 'Αδριατική',
    confidence: 'exact',
    announcement:
      '«Ξαναξανασκώθκαμε στο Ντουμπρόβνικ με μια ζιέστα θανατηφόρα. Εγώ φυσικά στα αρχίδια μου Αλάσκα στο δωμάτιο, αλλά όταν βγήκα στη βεράντα με στοίχησε. Τέλος πάντων, πλερώσαμε την ιδιοκτήτρια (μια χαρά μας δάγκωσε) και την κάναμε για το Σπλιτ.»',
    evidence: ['FB ποστ 09/08/2017, 22 φωτογραφίες. Το πανευρωπαϊκό τουρ του διηγήματος έχει, όπως όλα, πραγματικό προηγούμενο.'],
    sources: [],
  },
  {
    id: 'per-tsovolas',
    name: '«Τσοβόλα δώσ’τα όλα (remix)», ο Σουλιπόν μιξάρει τους ήρωες των 80s',
    series: 'Περίχωρα',
    dateISO: '2017-01-13',
    venue: 'YouTube, κανάλι «Kamia Masela»',
    city: 'διαδίκτυο',
    confidence: 'exact',
    announcement:
      '«Ένα μιξάρισμα του Σουλιπόν με πρωταγωνιστές όλους τους ήρωες των 80s: Τσοβόλας, Ανδρέας, Μητσοτάκης. Μαζί τους, ο Φούιτ (ιδιοκτήτης του ομώνυμου καφέ-μπαρ στα Γρεβενά) σε ρόλο Αυγολέμονου, αλλά και ο Γρίδας, μπασκετική φιγούρα των Γρεβενών.» Το κομμάτι που στα πάρτι ζητείται με την εντολή «θα παρακαλέσουμε όλοι μαζί τον κύριο Τσοβόλα να τα δώσει όλα».',
    evidence: ['Ημερομηνία ανάρτησης από τα μεταδεδομένα του YouTube (13/01/2017, 5:47). Το ριπόρτ του κ. Χαντζή αναφέρει «την καινούρια βερσιόν του Τσοβόλα δώστα όλα». Αυτή.'],
    sources: [{ url: 'https://www.youtube.com/watch?v=RG24Vucf8sg', label: 'youtube' }],
  },
  {
    id: 'per-10perimena',
    name: '«10 περίμενα» (teniwasexpecting), ο Καφουρούτσος και η τραγική φιγούρα Θάνος Γκουντάνος',
    series: 'Περίχωρα',
    dateISO: '2016-08-30',
    confidence: 'exact',
    venue: 'YouTube, κανάλι «stergios cha»',
    city: 'διαδίκτυο',
    announcement:
      '«Όταν η τραγική φιγούρα Θάνος Γκουντάνος ήπιε 7 ποτά και υπολόγιζε ψαλίδι από τα 35 στα 10, αλλά τελικά πλήρωσε 15 και είπε με απογοήτευση “10 περίμενα”. Κρίμα που δεν έχει κάποια τριλογία να παιχτεί στην Επίδαυρο.»',
    evidence: [
      'Περιγραφή από τον ίδιο τον δημιουργό, 22/08/2026. Ημερομηνία από τα μεταδεδομένα του YouTube (κανάλι «stergios cha»). Καφουρούτσος = το μουσικό όνομα του Στέργιου Χατζηκυριακίδη.',
      'Ο αλγόριθμος τιμολόγησης του Fuit (μόνο πολλαπλάσια του 5. Βλ. το μανιφέστο) εξηγεί τα 15. Η προσδοκία των 10 εξηγείται από το ποστ της 14/12/2016: «Ο κ. Thanos Gountanos δεν θα δεχτεί έκπτωση κάτω του 60%».',
    ],
    sources: [{ url: 'https://www.youtube.com/watch?v=nEymwH872vk', label: 'youtube' }],
  },
  {
    id: 'per-kytio',
    name: '«Κυτίο παραπόνων», το χειρόγραφο γίνεται τραγούδι (κείμενο & φωνή Καφουρούτσος, remix Σουλιπόν)',
    series: 'Περίχωρα',
    sortKey: '2018-07-15',
    dateDisplay: 'Καλοκαίρι 2018 («αν θυμάμαι καλά»)',
    venue: 'Fuit Art Cafe, πρωί μετά από ξενύχτι',
    city: 'Γρεβενά',
    confidence: 'inferred',
    announcement:
      'Από το εισαγωγικό καρέ του βίντεο: «Ο καραμέθυστος μπατζανάκης μου, κύριος Στέλιος, μπήκε στο Fuit art cafe μετά από ξενύχτι. […] Εκεί, προς μεγάλη του λύπη, δε βρήκε τον ιδιοκτήτη του μαγαζιού κι έτσι άφησε το παρακάτω μήνυμα. Ο μπατζανάκης του, δηλαδή εγώ, πήρα αυτό το μήνυμα/κείμενο και μεγαλούργησα. Για να χορεύει ο κόσμος στα clubs και να θυμάται την όμορφη νύχτα του μπατζανάκη μου. Μάλιστα, ο ίδιος ο κύριος Στέλιος διαβάζει το δικό του κείμενο.», Σουλιπόν',
    evidence: [
      'Το «παρακάτω μήνυμα» είναι το χειρόγραφο του αρχείου («Το 1970 ήμουνα αυτός που ήμουνα πάντα…»), σε ριγέ χαρτί, μπλε μελάνι. Βλ. Κενά.',
      'Η ημερομηνία είναι του ίδιου του Σουλιπόν: «το καλοκαίρι του 2018, αν θυμάμαι καλά». Αστερίσκος, με σεβασμό.',
      'Δύο εβδομάδες-μήνα αργότερα (20/08/2018) απονέμεται το Νόμπελ Νύχτας «για την παραγωγή λογοτεχνικών νυχτερινών στιγμών ανθολογίας». Τα στοιχεία, για μία φορά, συμφωνούν.',
    ],
    posterKey: 'xeirografo.jpg',
    sources: [{ url: 'https://www.youtube.com/watch?v=2KkoydvcNzE', label: 'youtube' }],
  },
  {
    id: 'per-nobel',
    name: 'Απονομή Βραβείου Νόμπελ Νύχτας',
    series: 'Περίχωρα',
    dateISO: '2018-08-20',
    venue: 'Fuit Art Cafe',
    city: 'Γρεβενά',
    confidence: 'exact',
    announcement:
      '«Για την αμέριστη στήριξή του στο παγκόσμιο εμπόριο αλκοολούχων ποτών, για την παραγωγή λογοτεχνικών νυχτερινών στιγμών ανθολογίας, για την επιτυχημένη πορεία του στο χώρο του DJing (όντας παράλληλα κλάρα απ’τις βότκες-αεροπλάνο) αλλά και γιατί είναι ο μισός μου Βλαξ, θα ήθελα να δώσω στο εν λόγω παλικάρι το Βραβείο Νόμπελ Νύχτας.» Ο ένας μπατζανάκης προς τον άλλο.',
    evidence: [
      'FB ποστ Αλέξανδρου Χαντζή, 20/08/2018, στο Fuit art cafe, μαζί με τον τιμώμενο.',
      'Σώζεται η φωτογραφία της απονομής: χειραψία, και το μετάλλιο. Ένα μπουκάλι βότκα με τούλι.',
      'Η Σουηδική Ακαδημία δεν απάντησε ποτέ, παρότι της υποδείχθηκε το κουμπί της αυτόματης μετάφρασης.',
      'Το φανταστικό αντίστοιχο («βραβείο νύχτας από τον σύνδεσμο ιδιοκτητών νυχτερινών κέντρων Λαμίας, 2018, τρία συναπτά έτη») απαντάται στο διήγημα «Ο θάνατος του μπατζανάκη μου».',
    ],
    posterKey: 'nixta.jpg',
    sources: [],
  },
  {
    id: 'per-masela',
    posterKey: 'grover.jpg',
    name: '«Καμιά μασέλα γέρου», ραδιοφωνική εμφάνιση και κλήρωση ενός «Γκρόβερ»',
    series: 'Περίχωρα',
    dateISO: '2019-03-19',
    venue: 'radiobubble.gr, 8–9 μμ',
    city: 'εκπομπή του μπατζανάκη',
    confidence: 'exact',
    announcement:
      'Από την ανακοίνωση της εκπομπής: «Η βιβλιάρα που θα κληρώσουν αυτή την Τρίτη οι Μασέλες λέγεται “Γκρόβερ” και μας έρχεται από τη μακρινή Σκανδιναβία. Μαζί μας από το Γκέτεμποργκ, ο συγγραφέας που έχει τιμηθεί με το Νόμπελ Νύχτας.»',
    evidence: ['FB ποστ 18/03/2019. Το «Γκρόβερ» κυκλοφορεί από τις εκδόσεις Δίαυλος.'],
    sources: [{ url: 'http://radiobubble.gr/', label: 'radiobubble' }],
  },
  {
    id: 'per-strimoksidi',
    name: 'Το εγκώμιο του στριμωξιδιού',
    series: 'Περίχωρα',
    dateISO: '2020-12-30',
    dateDisplay: 'Δεκέμβριος 2020',
    venue: 'Facebook',
    city: 'διαδίκτυο',
    confidence: 'inferred',
    announcement:
      '«Δεν είναι πως μου λείπει μόνο η καλύτερη παρτάρα της χώρας (την οποία τυγχάνει και συνδιοργανώνω γι’ αυτό και είμαι τόσο αντικειμενικός) αλλά μου λείπει αφάνταστα πολύ το στριμωξίδι! […] Θα ξαναστριμωχτούμε στα μπαρ και θα ξαναπούμε ιστορίες το επόμενο πρωί.» Γράφει ο Αλέξανδρος Χαντζής τέσσερα χρόνια μετά το πρώτο ΒΛΑΞ, στη χρονιά που δεν έγινε.',
    evidence: ['Κείμενο Αλέξανδρου Χαντζή, παραδόθηκε στο αρχείο 21/08/2026. Το «τέσσερα χρόνια πριν» δείχνει Δεκέμβριο 2020. Ακριβής μέρα άγνωστη.'],
    sources: [],
  },
  {
    id: 'per-apospasmata',
    name: 'Το διήγημα «οι βλαξ» δημοσιεύεται σε δύο αποσπάσματα',
    series: 'Περίχωρα',
    dateISO: '2020-12-03',
    dateDisplay: '3 και 10 Δεκεμβρίου 2020',
    venue: 'Facebook («το φβ δεν έχει σαπόρτ για notes πλέον»)',
    city: 'διαδίκτυο',
    confidence: 'exact',
    announcement:
      '«Απόσπασμα από το διήγημα με τίτλο “οι βλαξ” από τη συλλογή διηγημάτων που ετοιμάζω με τίτλο “Βατσ’νιές: Πυκνές καρτ-ποστάλ από τα Βαλκάνια”. Disclaimer: οποιαδήποτε ομοιότητα με πρόσωπα και καταστάσεις είναι συμπτωματική.»',
    evidence: [
      'FB ποστ 03/12/2020 και 10/12/2020. Το πλήρες κείμενο: σελίδα «Το διήγημα».',
      'Η συλλογή κυκλοφόρησε τον Φεβρουάριο του 2021 από τις εκδόσεις Δίαυλος (172 σελίδες, ISBN 9789605314644). Τα αποσπάσματα ανέβηκαν δύο μήνες πριν από το βιβλίο.',
    ],
    sources: [],
  },
  {
    id: 'per-fuit-kleinei',
    name: 'Το Fuit Art Cafe κλείνει',
    series: 'Περίχωρα',
    sortKey: '2022-06-30',
    dateDisplay: '2022',
    venue: 'Ηλία Φάσσα 2',
    city: 'Γρεβενά',
    confidence: 'inferred',
    announcement:
      'Δέκα χρόνια (2012–2022), τέσσερα ΒΛΑΞ, ένα Νόμπελ Νύχτας. Το «θα περιμένουμε λίγο» της ματαίωσης του 2021 έγινε οριστικό: το μαγαζί όπου γεννήθηκε το συμβάν δεν υπάρχει πια. Ο Φούιτ μετακόμισε στη Θεσσαλονίκη, Sun Do Each, «τα καλύτερα σάντουιτς της Θεσσαλονίκης», κατά τους βλαξ.',
    evidence: [
      'Προφορική κατάθεση ενός εκ των βλαξ, 22/08/2026: «Fuit is closed now». Αρχικά «2023», διορθωμένο από τον ίδιο σε 2022 την ίδια μέρα. Ακριβής μέρα άγνωστη. Αστερίσκος.',
      'Το έτος ανοίγματος από τον Τύπο: «Ένας χρόνος fuit art cafe με GLOBAL VIBE», grevenamedia.gr, Ιούλιος 2013.',
    ],
    posterKey: 'sundoeach.jpg',
    sources: [{ url: 'https://www.facebook.com/p/Sun-Do-Each-61578184842196/', label: 'Sun Do Each (facebook)' }],
  },
  {
    id: 'per-thanatos',
    posterKey: 'thanatos-eikonografisi.jpg',
    name: 'Απόσπασμα: «Ο θάνατος του μπατζανάκη μου»',
    series: 'Περίχωρα',
    dateISO: '2025-04-02',
    venue: 'Facebook',
    city: 'διαδίκτυο',
    confidence: 'exact',
    announcement:
      '«Ο μπατζανάκης μου, λοιπόν, αφού με ρωτάτε, ήταν μια ιδιοφυία της νύχτας. […] ήταν παντελώς βλαξ σε δεκάδες άξονες, αλλά ήταν ιδιοφυία σε έναν και μόνο: τον άξονα του “κάνω νύχτα” (γνωστός και ως άξονας του νυ).»',
    evidence: [
      'FB ποστ 02/04/2025. Πλήρες απόσπασμα: σελίδα «Οι βλαξ», ράφι «σοβαρά τώρα».',
      'Το διήγημα εκδόθηκε τον Νοέμβριο του 2025 στις «Ιστορίες Απλής Λογικής και Λίγης Θλίψης» (εκδ. Νήσος, ISBN 9789605892630). Άλλο διήγημα από το «οι βλαξ», άλλη συλλογή.',
    ],
    sources: [],
  },
  {
    id: 'per-athina-2024',
    name: 'Γκεστ ντι-τζέι στο «ΡΑΝΤΙΚΑΛ ΠΑΡΤΥ, ATHENS vol.2»',
    series: 'Περίχωρα',
    dateISO: '2024-07-07',
    time: '17:00',
    venue: 'Παραδοσιακό καφενείο «Η Αυλή», Γεωργάκη Ολυμπίου 1, Κουκάκι',
    city: 'Αθήνα',
    confidence: 'exact',
    announcement:
      'Από την αφίσα: «ΡΑΝΤΙΚΑΛ ΠΑΡΤΥ, ATHENS vol.2, Κυριακή 7 Ιουλίου 2024, 17:00. ΓΚΕΣΤ DJ: ΟΙ ΒΛΑΞ, Stergios Chantzikyriakidis, Alexandros Chantzis.» Ένα μωβ βανάκι με σανίδα του σερφ ανεβαίνει στην Ακρόπολη, «Live to get Radical».',
    evidence: [
      'Η αφίσα βρέθηκε στον φάκελο των ιδίων (22/08/2026) και επιβεβαιώνει ανεξάρτητα την ημερομηνία που είχε συναχθεί από την αναγγελία: Κυριακή 7 Ιουλίου 2024.',
      'Εδώ οι βλαξ δεν διοργανώνουν: είναι προσκεκλημένοι. Γι’ αυτό καταγράφεται στα περίχωρα και όχι στη σειρά.',
    ],
    posterKey: 'afisa-athina-2024.jpg',
    sources: [{ url: 'https://www.fuitwashere.gr/2024/06/athens-0707-vol02.html', label: 'fuitwashere.gr' }],
  },
  {
    id: 'per-istories',
    posterKey: 'istories-1.jpg',
    galleryPrefix: 'istories-',
    galleryCredit: 'αρχείο των ιδίων (FB 26/11/2025)',
    name: 'Κυκλοφορούν οι «Ιστορίες Απλής Λογικής και Λίγης Θλίψης»',
    series: 'Περίχωρα',
    dateISO: '2025-11-26',
    venue: 'Εκδόσεις νήσος',
    city: 'Αθήνα',
    confidence: 'exact',
    announcement:
      '«Η ονομαστική γιορτή μου συνέπεσε με την κυκλοφορία της νέας συλλογής διηγημάτων μου. ΥΓ Έχει γίνει εξωφυλλάρα, παραδεχτείτε το, μην ντρέπεστε.» Στο εξώφυλλο: ένα μαύρο μπιτόνι.',
    evidence: ['FB ποστ 26/11/2025, ανήμερα του Α. Στυλιανού του Παφλαγόνος (άκλιτο, σαν το «ο βλαξ, του βλαξ», έτσι για το γιόλο).'],
    sources: [],
  },

  // ── the missing 5th Radical Party, with its orphaned gallery re-attached ──
  {
    id: 'rp-05',
    name: '5η Ράντικαλ Πάρτι, Κουκάκι, Αθήνα',
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
      'Η αναγγελία γράφει ρητά: «Την Κυριακή 7 Ιουλίου λίγο μετά τις 5 το απόγευμα». Και 7/7/2024 ήταν πράγματι Κυριακή.',
      'Το event ΔΕΝ είχε δική του γραμμή στο χρονολόγιο του pipeline. Το άλμπουμ του (8 φωτ.) ήταν κολλημένο στο «Lake Project». Επανασυνδέθηκε.',
    ],
    conflictNote:
      'Τα στοιχεία διαφωνούν: λεζάντα στο Instagram λέει 14 Μαΐου 2023 (η ημερομηνία της 1ης!), τα metadata των φωτογραφιών και το FB event λένε Κυριακή 7 Ιουλίου 2024. Κρατάμε το δεύτερο. Η λεζάντα προφανώς νοσταλγούσε.',
    dual: { series: 'Αθήνα', volume: 'vol.02' },
    sources: [{ url: 'https://www.fuitwashere.gr/2024/06/athens-0707-vol02.html', label: 'fuitwashere.gr' }],
  },
];
