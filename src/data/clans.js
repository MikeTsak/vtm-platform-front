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

// Dark gradient pairs per clan, driving the --tint accent throughout the wizard
export const CLAN_COLORS = {
  Brujah:    ['#b40f1f', '#7a0b15'],
  Gangrel:   ['#2f7a3a', '#173a1f'],
  Malkavian: ['#713c8b', '#3a1f47'],
  Nosferatu: ['#6a4b2b', '#332515'],
  Toreador:  ['#b8236b', '#5c1338'],
  Tremere:   ['#7b1113', '#37090a'],
  Ventrue:   ['#1b4c8c', '#0e2547'],
  'Banu Haqim': ['#7a2f57', '#3a1730'],
  Hecata:    ['#2b6b6b', '#123636'],
  Lasombra:  ['#191a5a', '#0c0d2e'],
  'The Ministry': ['#865f12', '#3c2a08'],
  Ravnos:    ['#c26a12', '#6b3a09'],
  Salubri:   ['#2f96b0', '#153f4a'],
  Tzimisce:  ['#5c2340', '#2e1120'],
  Caitiff:   ['#636363', '#2f2f2f'],
  'Thin-blood': ['#6e6e2b', '#383813'],
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

const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');

export const symlogo = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png` : '');
export const textlogo = (c) => (c ? `/img/clans/text/300px-${fileify(c)}_logo.png` : '');

export const clanTint = (clan) => (clan ? CLAN_COLORS[clan]?.[0] : null) || '#8a0f1a';
