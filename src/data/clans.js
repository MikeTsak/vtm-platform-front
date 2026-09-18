// src/data/clans.js
// Single source of truth for the clan roster used across the character
// creator (ClanPicker, PredatorStep, CharacterSetup, ReviewStep). Previously
// this list was copy-pasted across those files, which is how Ravnos,
// Salubri, and Tzimisce ended up with full assets/discipline data but never
// showed up in the creator.

export const CLAN_NAMES = [
  'Brujah', 'Gangrel', 'Malkavian', 'Nosferatu', 'Toreador', 'Tremere', 'Ventrue',
  'Banu Haqim', 'Hecata', 'Lasombra', 'The Ministry', 'Ravnos', 'Salubri', 'Tzimisce',
  'Caitiff', 'Thin-blood'
];

// Flavor-only blurbs
export const CLAN_BLURBS = {
  Brujah: 'Rebels & firebrands who turn conviction into force.',
  Gangrel: 'Feral survivors close to the Beast and the wild.',
  Malkavian: 'Cursed seers who glimpse truth through cracks.',
  Nosferatu: 'Monstrous spies and info-brokers of the underbelly.',
  Toreador: 'Aesthetic predators intoxicated by beauty.',
  Tremere: 'Blood sorcerers obsessed with occult mastery.',
  Ventrue: 'Aristocrats of the night; command and control.',
  'Banu Haqim': 'Judges and hunters; blades in the dark.',
  Hecata: 'Necromantic consortium dealing with Death itself.',
  Lasombra: 'Shadow aristocrats who bend darkness to will.',
  'The Ministry': 'Tempters and iconoclasts who break taboos.',
  Ravnos: 'Wandering tricksters who cloak the truth in illusion and chaos.',
  Salubri: 'Third-eyed mystics torn between healing grace and a hunted curse.',
  Tzimisce: 'Ancient shapers of flesh and earth, jealous lords of their domain.',
  Caitiff: 'Clanless strays with no inherited path.',
  'Thin-blood': 'Faint undead spark; alchemy and ambiguity.',
};

// 5-color official palettes per clan driving dynamic themes, aesthetics, and iconography
export const CLAN_COLORS = {
  'Banu Haqim':   ['#23101B', '#72171A', '#B29D34', '#FBF7F4', '#424242'],
  Brujah:         ['#FF7214', '#C30011', '#A90015', '#FFB53D', '#333333'],
  Gangrel:        ['#442604', '#795D15', '#2E2F04', '#594E36', '#7E846B'],
  Hecata:         ['#D1CCDC', '#424C55', '#F5EDF0', '#886F68', '#3D2C2E'],
  Lasombra:       ['#E2E8F0', '#222222', '#334155', '#201A28', '#19272A'],
  Malkavian:      ['#F1AB13', '#FCB0B3', '#F93943', '#7EB2DD', '#445E93'],
  Nosferatu:      ['#272826', '#404E51', '#A19F74', '#4D2B1E', '#363D38'],
  Salubri:        ['#E1FBFE', '#A93F55', '#96A1CA', '#F0EEF1', '#5A5766'],
  'The Ministry': ['#6BD425', '#618B25', '#61452E', '#370926', '#1C0118'],
  Toreador:       ['#DD2C68', '#F3AFB6', '#9F5D77', '#9C0321', '#4A001F'],
  Tremere:        ['#501E5C', '#CCB2DC', '#937EA5', '#941414', '#201D1D'],
  Tzimisce:       ['#333333', '#643173', '#86A59C', '#B8C4BB', '#5A4D2B'],
  Ventrue:        ['#0F0D4F', '#222862', '#7E6D5D', '#F5F2EF', '#B09E4F'],
  Ravnos:         ['#B73D35', '#E08226', '#8F480B', '#F5D7A1', '#2C1B10'],
  Caitiff:        ['#9A9EA0', '#636363', '#484848', '#E0E0E0', '#1C1C1C'],
  'Thin-blood':   ['#5B8C9E', '#8C8C37', '#4A4A1C', '#E4E4A8', '#1E1E0E'],
};

export const CLAN_PALETTES = CLAN_COLORS;

// Official iconography, semantic 5-color roles, and aesthetic mappings per clan
export const CLAN_THEME_RULES = {
  'Banu Haqim': {
    color1: '#23101B',
    color2: '#72171A',
    color3: '#B29D34',
    color4: '#FBF7F4',
    color5: '#424242',
    primaryAccent: '#B29D34',
    secondaryAccent: '#72171A',
    border: '#424242',
    textColor: '#FBF7F4',
    surface: '#1c0d15',
    bg: '#0c0609',
    symbolColor: '#B29D34',
    textLogoColor: '#FBF7F4',
    aesthetic: 'crimson veined Alamut marble and antique gold runes'
  },
  Banu_Haqim: {
    color1: '#23101B',
    color2: '#72171A',
    color3: '#B29D34',
    color4: '#FBF7F4',
    color5: '#424242',
    primaryAccent: '#B29D34',
    secondaryAccent: '#72171A',
    border: '#424242',
    textColor: '#FBF7F4',
    surface: '#1c0d15',
    bg: '#0c0609',
    symbolColor: '#B29D34',
    textLogoColor: '#FBF7F4',
    aesthetic: 'crimson veined Alamut marble and antique gold runes'
  },
  Brujah: {
    color1: '#FF7214',
    color2: '#C30011',
    color3: '#A90015',
    color4: '#FFB53D',
    color5: '#333333',
    primaryAccent: '#FF7214',
    secondaryAccent: '#C30011',
    border: '#A90015',
    textColor: '#FFB53D',
    surface: '#221e1e',
    bg: '#0f0c0c',
    symbolColor: '#C30011',
    textLogoColor: '#FFB53D',
    aesthetic: 'anarch raging fire and embers'
  },
  Gangrel: {
    color1: '#442604',
    color2: '#795D15',
    color3: '#2E2F04',
    color4: '#594E36',
    color5: '#7E846B',
    primaryAccent: '#7E846B',
    secondaryAccent: '#795D15',
    border: '#594E36',
    textColor: '#a3a894',
    surface: '#181a0e',
    bg: '#0c0e07',
    symbolColor: '#7E846B',
    textLogoColor: '#795D15',
    aesthetic: 'deep forest fern foliage and wild undergrowth'
  },
  Hecata: {
    color1: '#D1CCDC',
    color2: '#424C55',
    color3: '#F5EDF0',
    color4: '#886F68',
    color5: '#3D2C2E',
    primaryAccent: '#D1CCDC',
    secondaryAccent: '#886F68',
    border: '#424C55',
    textColor: '#F5EDF0',
    surface: '#221a1c',
    bg: '#0e0a0b',
    symbolColor: '#F5EDF0',
    textLogoColor: '#D1CCDC',
    aesthetic: 'catacomb skull wall and mausoleum marble'
  },
  Lasombra: {
    color1: '#E2E8F0',
    color2: '#222222',
    color3: '#334155',
    color4: '#201A28',
    color5: '#19272A',
    primaryAccent: '#E2E8F0',
    secondaryAccent: '#94A3B8',
    border: '#334155',
    textColor: '#F8FAFC',
    textMuted: '#CBD5E1',
    surface: '#131218',
    bg: '#08070a',
    symbolColor: '#E2E8F0',
    textLogoColor: '#F8FAFC',
    aesthetic: 'abyssal pitch shadows and luminescent moonlit silver'
  },
  lasombra: {
    color1: '#E2E8F0',
    color2: '#222222',
    color3: '#334155',
    color4: '#201A28',
    color5: '#19272A',
    primaryAccent: '#E2E8F0',
    secondaryAccent: '#94A3B8',
    border: '#334155',
    textColor: '#F8FAFC',
    textMuted: '#CBD5E1',
    surface: '#131218',
    bg: '#08070a',
    symbolColor: '#E2E8F0',
    textLogoColor: '#F8FAFC',
    aesthetic: 'abyssal pitch shadows and luminescent moonlit silver'
  },
  Malkavian: {
    color1: '#F1AB13',
    color2: '#FCB0B3',
    color3: '#F93943',
    color4: '#7EB2DD',
    color5: '#445E93',
    primaryAccent: '#F1AB13',
    secondaryAccent: '#F93943',
    border: '#445E93',
    textColor: '#FCB0B3',
    surface: '#141224',
    bg: '#0a0814',
    symbolColor: '#FCB0B3',
    textLogoColor: '#F1AB13',
    aesthetic: 'hallucinatory psychedelic swirling fractal fluid'
  },
  Nosferatu: {
    color1: '#272826',
    color2: '#404E51',
    color3: '#A19F74',
    color4: '#4D2B1E',
    color5: '#363D38',
    primaryAccent: '#A19F74',
    secondaryAccent: '#404E51',
    border: '#404E51',
    textColor: '#A19F74',
    surface: '#161917',
    bg: '#0c0d0c',
    symbolColor: '#404E51',
    textLogoColor: '#A19F74',
    aesthetic: 'subterranean cracked stone catacomb and toxic sewer mist'
  },
  Salubri: {
    color1: '#E1FBFE',
    color2: '#A93F55',
    color3: '#96A1CA',
    color4: '#F0EEF1',
    color5: '#5A5766',
    primaryAccent: '#E1FBFE',
    secondaryAccent: '#A93F55',
    border: '#5A5766',
    textColor: '#F0EEF1',
    surface: '#1c1b24',
    bg: '#0d0c12',
    symbolColor: '#E1FBFE',
    textLogoColor: '#A93F55',
    aesthetic: 'ethereal twilight clouds and celestial mist'
  },
  'The Ministry': {
    color1: '#6BD425',
    color2: '#618B25',
    color3: '#61452E',
    color4: '#370926',
    color5: '#1C0118',
    primaryAccent: '#6BD425',
    secondaryAccent: '#618B25',
    border: '#61452E',
    textColor: '#84c748',
    surface: '#240a1b',
    bg: '#10010e',
    symbolColor: '#6BD425',
    textLogoColor: '#618B25',
    aesthetic: 'deep aubergine serpent scales and electric venom'
  },
  Ministry: {
    color1: '#6BD425',
    color2: '#618B25',
    color3: '#61452E',
    color4: '#370926',
    color5: '#1C0118',
    primaryAccent: '#6BD425',
    secondaryAccent: '#618B25',
    border: '#61452E',
    textColor: '#84c748',
    surface: '#240a1b',
    bg: '#10010e',
    symbolColor: '#6BD425',
    textLogoColor: '#618B25',
    aesthetic: 'deep aubergine serpent scales and electric venom'
  },
  Toreador: {
    color1: '#DD2C68',
    color2: '#F3AFB6',
    color3: '#9F5D77',
    color4: '#9C0321',
    color5: '#4A001F',
    primaryAccent: '#DD2C68',
    secondaryAccent: '#9C0321',
    border: '#9C0321',
    textColor: '#F3AFB6',
    surface: '#220713',
    bg: '#0d0208',
    symbolColor: '#F3AFB6',
    textLogoColor: '#DD2C68',
    aesthetic: 'velvety dark roses and romantic thorns'
  },
  Tremere: {
    color1: '#501E5C',
    color2: '#CCB2DC',
    color3: '#937EA5',
    color4: '#941414',
    color5: '#201D1D',
    primaryAccent: '#CCB2DC',
    secondaryAccent: '#941414',
    border: '#501E5C',
    textColor: '#CCB2DC',
    surface: '#201424',
    bg: '#0d0810',
    symbolColor: '#CCB2DC',
    textLogoColor: '#CCB2DC',
    aesthetic: 'hermetic blood marble and occult sorcery swirl'
  },
  Tzimisce: {
    color1: '#333333',
    color2: '#643173',
    color3: '#86A59C',
    color4: '#B8C4BB',
    color5: '#5A4D2B',
    primaryAccent: '#86A59C',
    secondaryAccent: '#643173',
    border: '#5A4D2B',
    textColor: '#B8C4BB',
    surface: '#1a1622',
    bg: '#0d0b12',
    symbolColor: '#B8C4BB',
    textLogoColor: '#B8C4BB',
    aesthetic: 'visceral textured dragon fleshcrafting and ancestral earth'
  },
  Ventrue: {
    color1: '#0F0D4F',
    color2: '#222862',
    color3: '#7E6D5D',
    color4: '#F5F2EF',
    color5: '#B09E4F',
    primaryAccent: '#B09E4F',
    secondaryAccent: '#222862',
    border: '#7E6D5D',
    textColor: '#F5F2EF',
    surface: '#121528',
    bg: '#0a0b17',
    symbolColor: '#B09E4F',
    textLogoColor: '#F5F2EF',
    aesthetic: 'patrician imperial white marble and sovereign gold'
  },
  Ravnos: {
    color1: '#B73D35',
    color2: '#E08226',
    color3: '#8F480B',
    color4: '#F5D7A1',
    color5: '#2C1B10',
    primaryAccent: '#B73D35',
    secondaryAccent: '#E08226',
    border: '#8F480B',
    textColor: '#F5D7A1',
    surface: '#2c1e17',
    bg: '#150c08',
    symbolColor: '#B73D35',
    aesthetic: 'nomadic illusion and smoky caravan amber'
  },
  Caitiff: {
    color1: '#9A9EA0',
    color2: '#636363',
    color3: '#484848',
    color4: '#E0E0E0',
    color5: '#1C1C1C',
    primaryAccent: '#9A9EA0',
    secondaryAccent: '#636363',
    border: '#484848',
    textColor: '#E0E0E0',
    surface: '#212121',
    bg: '#121212',
    symbolColor: '#9A9EA0',
    aesthetic: 'street concrete and alleyway smog'
  },
  'Thin-blood': {
    color1: '#5B8C9E',
    color2: '#8C8C37',
    color3: '#4A4A1C',
    color4: '#E4E4A8',
    color5: '#1E1E0E',
    primaryAccent: '#5B8C9E',
    secondaryAccent: '#8C8C37',
    border: '#4A4A1C',
    textColor: '#E4E4A8',
    surface: '#242417',
    bg: '#121209',
    symbolColor: '#5B8C9E',
    aesthetic: 'chemical alchemy smog and daylight dusk'
  }
};

// Returns the URL to the custom aesthetic background texture for a clan
export const clanBackground = (clan) => {
  if (!clan) return null;
  const key = fileify(clan);
  if (key === 'Brujah') {
    return '/img/clans/backgrounds/Brujah_clean.webp?v=4';
  }
  if (key === 'Ventrue') {
    return '/img/clans/backgrounds/Ventrue_clean.webp?v=5';
  }
  if (key === 'Malkavian') {
    return '/img/clans/backgrounds/Malkavian_clean.webp?v=4';
  }
  if (key === 'Toreador') {
    return '/img/clans/backgrounds/Toreador_clean.webp?v=5';
  }
  if (key === 'Tzimisce') {
    return '/img/clans/backgrounds/Tzimisce_clean.webp?v=4';
  }
  if (key === 'Tremere') {
    return '/img/clans/backgrounds/Tremere_clean.webp?v=4';
  }
  if (key === 'Salubri') {
    return '/img/clans/backgrounds/Salubri_clean.webp?v=4';
  }
  if (key === 'Nosferatu') {
    return '/img/clans/backgrounds/Nosferatu_clean.webp?v=4';
  }
  if (key === 'Ministry' || key === 'The_Ministry' || key === 'The Ministry') {
    return '/img/clans/backgrounds/Ministry_clean.webp?v=4';
  }
  if (key === 'Lasombra') {
    return '/img/clans/backgrounds/Lasombra_clean.webp?v=4';
  }
  if (key === 'Hecata') {
    return '/img/clans/backgrounds/Hecata_clean.webp?v=4';
  }
  if (key === 'Gangrel') {
    return '/img/clans/backgrounds/Gangrel_clean.webp?v=4';
  }
  if (key === 'Banu_Haqim' || key === 'Banu Haqim') {
    return '/img/clans/backgrounds/Banu_Haqim_clean.webp?v=4';
  }
  const KNOWN = [
    'Banu_Haqim', 'Brujah', 'Gangrel', 'Hecata', 'Lasombra',
    'Malkavian', 'Nosferatu', 'Salubri', 'Ministry', 'Toreador',
    'Tremere', 'Tzimisce', 'Ventrue'
  ];
  if (KNOWN.includes(key)) {
    return `/img/clans/backgrounds/${key}.webp`;
  }
  return null;
};

// Disciplines per clan (V5 core + Lore of the Clans affinities)
export const CLAN_DISCIPLINES = {
  Brujah: ['Celerity', 'Potence', 'Presence'],
  Gangrel: ['Animalism', 'Fortitude', 'Protean'],
  Malkavian: ['Auspex', 'Dominate', 'Obfuscate'],
  Nosferatu: ['Animalism', 'Obfuscate', 'Potence'],
  Toreador: ['Auspex', 'Celerity', 'Presence'],
  Tremere: ['Auspex', 'Blood Sorcery', 'Dominate'],
  Ventrue: ['Dominate', 'Fortitude', 'Presence'],
  'Banu Haqim': ['Blood Sorcery', 'Celerity', 'Obfuscate'],
  Hecata: ['Auspex', 'Fortitude', 'Oblivion'],
  Lasombra: ['Dominate', 'Oblivion', 'Potence'],
  'The Ministry': ['Obfuscate', 'Presence', 'Protean'],
  Ravnos: ['Animalism', 'Obfuscate', 'Presence'],
  Salubri: ['Auspex', 'Dominate', 'Fortitude'],
  Tzimisce: ['Animalism', 'Dominate', 'Protean'],
  Caitiff: ['Choose Any', 'Choose Any', 'Choose Any'],
  'Thin-blood': ['Thin-blood Alchemy'],
};

// --- Asset helpers ---
export const NAME_OVERRIDES = {
  'The Ministry': 'Ministry',
  'Banu Haqim': 'Banu_Haqim',
  'Thin-blood': 'Thinblood',
};

export const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');

// The clan symbol/logo masters are a single 330px/300px PNG each, but get
// rendered everywhere from a 14px inline badge up to a 128px map icon,
// every consumer downloaded the same 330px file regardless. vite-imagetools
// (see vite.config.js) generates the smaller sizes at build time from the
// masters under src/assets/clans/, which is why they moved out of public/
// (imagetools transforms actual JS imports, not runtime string paths, so a
// plain `/img/clans/...png` string can't be resized this way: the
// public/img/clans/ copies are left in place untouched for anything still
// using the old raw path directly).
const symbolGlobDefault = import.meta.glob('../assets/clans/*.png', {
  query: { w: '150', format: 'png' },
  import: 'default',
  eager: true,
});
const symbolGlobSrcSet = import.meta.glob('../assets/clans/*.png', {
  query: { w: '64;150;330', format: 'png', as: 'srcset' },
  import: 'default',
  eager: true,
});
const logoGlobDefault = import.meta.glob('../assets/clans/text/*.png', {
  query: { w: '150', format: 'png' },
  import: 'default',
  eager: true,
});
const logoGlobSrcSet = import.meta.glob('../assets/clans/text/*.png', {
  query: { w: '64;150;300', format: 'png', as: 'srcset' },
  import: 'default',
  eager: true,
});

// Native white clan symbols and typographic logos for dark themes
const symbolWhiteGlobDefault = import.meta.glob('../assets/clans/white/*.png', {
  query: { w: '150', format: 'png' },
  import: 'default',
  eager: true,
});
const symbolWhiteGlobSrcSet = import.meta.glob('../assets/clans/white/*.png', {
  query: { w: '64;150;330', format: 'png', as: 'srcset' },
  import: 'default',
  eager: true,
});
const logoWhiteGlobDefault = import.meta.glob('../assets/clans/text_white/*.png', {
  query: { w: '150', format: 'png' },
  import: 'default',
  eager: true,
});
const logoWhiteGlobSrcSet = import.meta.glob('../assets/clans/text_white/*.png', {
  query: { w: '64;150;300', format: 'png', as: 'srcset' },
  import: 'default',
  eager: true,
});

// Plain single URL string for dark or light backgrounds
export const symlogo = (c) => (c ? symbolGlobDefault[`../assets/clans/330px-${fileify(c)}_symbol.png`] || '' : '');
export const textlogo = (c) => (c ? logoGlobDefault[`../assets/clans/text/300px-${fileify(c)}_logo.png`] || '' : '');

// Native white single URL string for dark surfaces without CSS invert filters
export const symlogoWhite = (c) => {
  if (!c) return '';
  const key = `../assets/clans/white/330px-${fileify(c)}_symbol_white.png`;
  return symbolWhiteGlobDefault[key] || `/img/clans/white/330px-${fileify(c)}_symbol_white.webp` || symlogo(c);
};

export const textlogoWhite = (c) => {
  if (!c) return '';
  const key = `../assets/clans/text_white/300px-${fileify(c)}_logo_white.png`;
  return logoWhiteGlobDefault[key] || `/img/clans/text_white/300px-${fileify(c)}_logo_white.webp` || textlogo(c);
};

export const symlogoSrcSet = (c) => {
  if (!c) return {};
  const srcSet = symbolGlobSrcSet[`../assets/clans/330px-${fileify(c)}_symbol.png`];
  return srcSet ? { srcSet } : {};
};
export const textlogoSrcSet = (c) => {
  if (!c) return {};
  const srcSet = logoGlobSrcSet[`../assets/clans/text/300px-${fileify(c)}_logo.png`];
  return srcSet ? { srcSet } : {};
};

export const symlogoWhiteSrcSet = (c) => {
  if (!c) return {};
  const srcSet = symbolWhiteGlobSrcSet[`../assets/clans/white/330px-${fileify(c)}_symbol_white.png`];
  return srcSet ? { srcSet } : {};
};
export const textlogoWhiteSrcSet = (c) => {
  if (!c) return {};
  const srcSet = logoWhiteGlobSrcSet[`../assets/clans/text_white/300px-${fileify(c)}_logo_white.png`];
  return srcSet ? { srcSet } : {};
};

export const clanTint = (clan) => (clan ? CLAN_COLORS[clan]?.[0] : null) || '#8a0f1a';

// Flat { clan: '#hex' } map: the first (accent) colour of each gradient pair.
// Drop-in replacement for the per-file CLAN_COLORS string maps that used to be
// copy-pasted across the admin tabs, CharacterView, etc. Unknown/blank clans
// are simply absent, so callers keep their own `|| 'var(--text-secondary)'`.
export const CLAN_HEX = Object.fromEntries(
  Object.entries(CLAN_COLORS).map(([clan, pair]) => [clan, pair[0]])
);

export const getClanPalette = (clan) => {
  if (!clan) return null;
  return CLAN_COLORS[clan] || null;
};

export const getClanThemeRules = (clan) => {
  if (!clan) return null;
  return CLAN_THEME_RULES[clan] || {
    symbolColor: clanTint(clan),
    textColor: '#e8e8ed',
    primaryAccent: clanTint(clan),
    surface: '#141417',
    aesthetic: 'gothic darkness'
  };
};

