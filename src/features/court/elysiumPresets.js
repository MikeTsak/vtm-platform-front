// The Keeper's design vocabulary for Elysium invitations. Slugs here are what
// the server stores (routes/elysium.js only accepts [a-z0-9-] slugs and https
// image URLs), so renaming an id orphans saved designs: add, don't rename.

const lattice = (alpha) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26'><polygon points='13,13 26,0 26,26' fill='rgba(255,255,255,${alpha})'/><polygon points='13,13 0,0 0,26' fill='rgba(255,255,255,${alpha})'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 0 / 26px 26px`;
};

// HISTORY: the server stores only preset ids (cardPreset, accent, ornament...),
// not what they look like. The admin history redraws old invitations from these
// tables, so never change an existing preset's colours or art: add a new id.
export const SURFACES = [
  {
    id: 'velvet-rose', label: 'Rose Velvet', ink: '#f7e8dc', muted: 'rgba(247,232,220,0.74)',
    bg: `radial-gradient(ellipse at 50% -10%, rgba(255,110,140,0.22), transparent 58%), radial-gradient(ellipse at 50% 115%, rgba(0,0,0,0.65), transparent 60%), ${lattice(0.022)}, linear-gradient(165deg, #5e0b1e 0%, #3b0614 55%, #1c0209 100%)`,
  },
  {
    id: 'noir-gilt', label: 'Gilded Noir', ink: '#f1e5c9', muted: 'rgba(241,229,201,0.7)',
    bg: `radial-gradient(ellipse at 50% 0%, rgba(212,175,95,0.16), transparent 55%), ${lattice(0.018)}, linear-gradient(180deg, #151112 0%, #0a0809 100%)`,
  },
  {
    id: 'opera-plum', label: 'Opera Plum', ink: '#f3e6f1', muted: 'rgba(243,230,241,0.72)',
    bg: `radial-gradient(ellipse at 30% 0%, rgba(214,120,200,0.2), transparent 55%), radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.6), transparent 60%), ${lattice(0.02)}, linear-gradient(160deg, #431139 0%, #250920 60%, #12030f 100%)`,
  },
  {
    id: 'sapphire-nocturne', label: 'Sapphire Nocturne', ink: '#e9eef9', muted: 'rgba(233,238,249,0.72)',
    bg: `radial-gradient(ellipse at 50% -5%, rgba(120,160,255,0.2), transparent 55%), ${lattice(0.02)}, linear-gradient(170deg, #13244a 0%, #0a1430 55%, #050a18 100%)`,
  },
  {
    id: 'ivory-vellum', label: 'Ivory Vellum', light: true, ink: '#3a2414', muted: 'rgba(58,36,20,0.72)',
    bg: `radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(120,80,30,0.22) 100%), ${lattice(0.18)}, linear-gradient(170deg, #f6eedc 0%, #ead9b8 100%)`,
  },
  {
    id: 'carrara', label: 'Carrara Marble', light: true, ink: '#2c2320', muted: 'rgba(44,35,32,0.72)',
    bg: `radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(60,40,30,0.25) 100%), linear-gradient(rgba(255,251,244,0.45), rgba(240,231,218,0.5)), url('/img/ui/marble.webp') center / cover`,
  },
];

export const ACCENTS = [
  { id: 'gold', label: 'Gold Leaf', a: '#d4af5f', b: '#f6e3a6', c: '#8f6d24' },
  { id: 'rose-gold', label: 'Rose Gold', a: '#d79a8f', b: '#f7d3c9', c: '#94574d' },
  { id: 'silver', label: 'Moon Silver', a: '#c3c9d3', b: '#f2f5fa', c: '#7c8593' },
  { id: 'crimson', label: 'Heart’s Blood', a: '#c23a4b', b: '#f19aa5', c: '#741221' },
];

export const ORNAMENTS = [
  { id: 'nouveau', label: 'Art Nouveau' },
  { id: 'roses', label: 'Briar Roses' },
  { id: 'baroque', label: 'Baroque Frame' },
  { id: 'minimal', label: 'Single Rule' },
];

// `greek` is the whole-line face used when the text contains Greek: none of the
// Latin display faces carry Greek glyphs, and a per-letter fallback would mix hands.
export const FONTS = [
  { id: 'cinzel', label: 'Engraved Capitals', family: "'Cinzel', 'Noto Serif Display', serif", greek: { fontFamily: "'Noto Serif Display', serif", textTransform: 'uppercase', letterSpacing: '0.08em' } },
  { id: 'playfair', label: 'Opera Serif', family: "'Playfair Display', 'Noto Serif Display', serif", greek: { fontFamily: "'Noto Serif Display', serif" } },
  { id: 'script', label: 'Calligraphy', family: "'Pinyon Script', 'Noto Serif Display', serif", greek: { fontFamily: "'Noto Serif Display', serif", fontStyle: 'italic', fontWeight: 600 } },
];

// Props for any line of free text: if it contains Greek the WHOLE line is set in
// one Greek-capable face (a per-letter fallback would mix two typefaces in a line).
export const greekAttrs = (str) => (hasGreek(str) ? { lang: 'el', style: { fontFamily: "'Noto Serif Display', serif" } } : {});

export const hasGreek = (s) => /[\u0370-\u03FF\u1F00-\u1FFF]/.test(s || '');

export const SEALS = [
  { id: 'toreador', label: 'Clan Toreador' },
  { id: 'camarilla', label: 'The Camarilla' },
  { id: 'rose', label: 'Wax Rose' },
  { id: 'none', label: 'No seal' },
];

export const DEFAULT_DESIGN = {
  cardPreset: 'velvet-rose', bannerPreset: 'velvet-rose', accent: 'gold', ornament: 'nouveau', font: 'cinzel', seal: 'toreador', lang: 'en',
};

export const DEFAULT_TEXT = {
  name: 'Elysium',
  location: '',
  salutation: 'To {name}, of Clan {clan}',
  body: 'The Keeper of Elysium requests the pleasure of your company at the coming gathering of the Court of Athens.\n\nWithin these walls the Traditions are kept. Let no blade be drawn, no blood be taken, no Discipline be raised in anger. Arrive as a guest, and depart as one.',
  dress_code: 'Evening attire. Masks are welcome.',
  signature: 'The Keeper of Elysium',
};

// Language of the card's FIXED wording (stored in the invitation's design as `lang`).
// The Keeper's own text is always shown exactly as written.
export const LANGS = [
  { id: 'el', label: 'Ελληνικά' },
  { id: 'en', label: 'English' },
];

export const STRINGS = {
  en: {
    eyebrow: 'An Invitation to Elysium',
    barredEyebrow: 'Elysium',
    barredTitle: 'The doors are closed to you',
    barredBody: '{name}, the Keeper of Elysium has not extended you an invitation to this gathering. Do not seek entry.',
    timePrefix: 'at',
    locationPrefix: 'at',
    attire: 'Attire',
    guest: 'Honoured Guest',
    clan: 'the Blood',
  },
  el: {
    eyebrow: 'Πρόσκληση στο Ηλύσιο',
    barredEyebrow: 'Ηλύσιο',
    barredTitle: 'Οι πύλες είναι κλειστές για εσάς',
    barredBody: '{name}, ο Keeper του Ηλυσίου δεν σας έχει απευθύνει πρόσκληση σε αυτή τη συγκέντρωση. Μην επιχειρήσετε να εισέλθετε.',
    timePrefix: 'ώρα',
    locationPrefix: 'Τοποθεσία:',
    attire: 'Ενδυμασία',
    guest: 'Τιμημένο Καλεσμένο',
    clan: 'του Αίματος',
  },
};

// House text per language. Switching language swaps a field only while it still
// holds the other language's house text, so the Keeper's own edits are never lost.
export const DEFAULT_TEXT_BY_LANG = {
  en: DEFAULT_TEXT,
  el: {
    name: 'Ηλύσιο',
    location: '',
    salutation: 'Προς {name}, της φατρίας {clan}',
    body: 'Ο Keeper του Ηλυσίου σάς προσκαλεί να τιμήσετε με την παρουσία σας την επικείμενη συνάντηση της Αυλής των Αθηνών.\n\nΜέσα σε αυτούς τους τοίχους οι Παραδόσεις τηρούνται. Κανένα ξίφος δεν θα σηκωθεί, κανένα αίμα δεν θα χυθεί, καμία Πειθαρχία δεν θα ενεργοποιηθεί από οργή. Ελάτε ως καλεσμένος και αναχωρήστε ως τέτοιος.',
    dress_code: 'Βραδινή περιβολή. Οι μάσκες είναι ευπρόσδεκτες.',
    signature: 'Ο Keeper του Ηλυσίου',
  },
};

const find = (list, id) => list.find(x => x.id === id) || list[0];

export function resolveDesign(design = {}) {
  const d = { ...DEFAULT_DESIGN, ...design };
  return {
    ...d,
    card: find(SURFACES, d.cardPreset),
    banner: find(SURFACES, d.bannerPreset),
    accentDef: find(ACCENTS, d.accent),
    fontDef: find(FONTS, d.font),
  };
}

// CSS background for a surface: an uploaded image (darkened so text stays
// legible) wins over the preset.
export function surfaceBackground(preset, image) {
  if (!image) return preset.bg;
  const veil = preset.light ? 'rgba(250,244,232,0.55)' : 'rgba(8,4,6,0.55)';
  return `linear-gradient(${veil}, ${veil}), url("${image}") center / cover`;
}

// {name} / {clan} tokens in the Keeper's text become the reader's character.
export function personalize(text, guest, lang = 'en') {
  const L = STRINGS[lang] || STRINGS.en;
  return String(text || '')
    .replace(/\{name\}/gi, guest?.name || L.guest)
    .replace(/\{clan\}/gi, guest?.clan || L.clan);
}

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// English: "Saturday, the 10th of October, 2026". Greek: "Σάββατο 10 Οκτωβρίου 2026".
// Time as "18:00". All in Athens time.
export function formatElysiumDate(date, lang = 'en') {
  if (!date) return { day: '', time: '' };
  const d = new Date(date);
  const opts = { timeZone: 'Europe/Athens', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit' }).format(d);
  if (lang === 'el') return { day: new Intl.DateTimeFormat('el-GR', opts).format(d), time };
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', opts).formatToParts(d).map(x => [x.type, x.value]));
  return { day: `${parts.weekday}, the ${ordinal(Number(parts.day))} of ${parts.month}, ${parts.year}`, time };
}
