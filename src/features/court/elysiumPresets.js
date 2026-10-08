// The Keeper's design vocabulary for Elysium invitations. Slugs here are what
// the server stores (routes/elysium.js only accepts [a-z0-9-] slugs and https
// image URLs), so renaming an id orphans saved designs: add, don't rename.

const lattice = (alpha) =>
  `repeating-conic-gradient(from 45deg, rgba(255,255,255,${alpha}) 0 25%, transparent 0 50%) 0 0 / 26px 26px`;

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

export const FONTS = [
  { id: 'cinzel', label: 'Engraved Capitals', family: "'Cinzel', 'Playfair Display', serif" },
  { id: 'playfair', label: 'Opera Serif', family: "'Playfair Display', Georgia, serif" },
  { id: 'script', label: 'Calligraphy', family: "'Pinyon Script', 'Playfair Display', cursive" },
];

export const SEALS = [
  { id: 'toreador', label: 'Clan Toreador' },
  { id: 'camarilla', label: 'The Camarilla' },
  { id: 'rose', label: 'Wax Rose' },
  { id: 'none', label: 'No seal' },
];

export const DEFAULT_DESIGN = {
  cardPreset: 'velvet-rose', bannerPreset: 'velvet-rose', accent: 'gold', ornament: 'nouveau', font: 'cinzel', seal: 'toreador',
};

export const DEFAULT_TEXT = {
  name: 'Elysium',
  location: '',
  salutation: 'To {name}, of Clan {clan}',
  body: 'The Keeper of Elysium requests the pleasure of your company at the coming gathering of the Court of Athens.\n\nWithin these walls the Traditions are kept. Let no blade be drawn, no blood be taken, no Discipline be raised in anger. Arrive as a guest, and depart as one.',
  dress_code: 'Evening attire. Masks are welcome.',
  signature: 'The Keeper of Elysium',
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
export function personalize(text, guest) {
  return String(text || '')
    .replace(/\{name\}/gi, guest?.name || 'Honoured Guest')
    .replace(/\{clan\}/gi, guest?.clan || 'the Blood');
}

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// "Saturday, the 10th of October, 2026" and "18:00", in Athens time.
export function formatElysiumDate(date) {
  if (!date) return { day: '', time: '' };
  const d = new Date(date);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      .formatToParts(d).map(p => [p.type, p.value])
  );
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit' }).format(d);
  return { day: `${parts.weekday}, the ${ordinal(Number(parts.day))} of ${parts.month}, ${parts.year}`, time };
}
