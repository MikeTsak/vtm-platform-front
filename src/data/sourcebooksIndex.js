// src/data/sourcebooksIndex.js
// Master multi:sourcebook index and table of contents registry for V5
// Strictly compliant with typography rules: zero hyphens and zero em dashes in user facing text.

import rawCorebookToc from './corebookToc.json' with { type: 'json' };
import { COREBOOK_SUBJECT_INDEX } from './corebookIndex.js';

export const SOURCEBOOK_KEYS = [
  'Corebook',
  'Players Guide',
  'Cults of the Blood Gods',
  'Camarilla',
  'Anarch',
  'Sabbat'
];

export const SOURCEBOOK_METADATA = {
  'Corebook': {
    label: 'Corebook',
    file: 'Vampire-the-Masquerade-1.pdf',
    offset: 2,
    color: '#8a0f1a',
    accent: '#e5a93b',
    edition: 'Core System'
  },
  'Players Guide': {
    label: 'Players Guide',
    file: 'Vampire-The-Masquerade-V5-Players-Guide.pdf',
    offset: 2,
    color: '#1e3a5f',
    accent: '#5dade2',
    edition: 'Companion Guide'
  },
  'Cults of the Blood Gods': {
    label: 'Cults of the Blood Gods',
    file: 'Cults-of-the-Blood-Gods-Vampire-the-Masquerade-5th-Edition.pdf',
    offset: 1,
    color: '#641e16',
    accent: '#d98880',
    edition: 'Religion and Clan'
  },
  'Camarilla': {
    label: 'Camarilla',
    file: 'Vampire-the-Masquerade-V5-Camarilla-2018.pdf',
    offset: 1,
    color: '#4a235a',
    accent: '#af7ac5',
    edition: 'Faction Sourcebook'
  },
  'Anarch': {
    label: 'Anarch',
    file: 'Anarch-Vampire-the-Masquerade-5th-Edition.pdf',
    offset: 1,
    color: '#78281f',
    accent: '#e74c3c',
    edition: 'Faction Sourcebook'
  },
  'Sabbat': {
    label: 'Sabbat',
    file: 'Vampire-The-Masquerade-V5-Sabbat-The-Black-Hand-Definitive-Edition.pdf',
    offset: 1,
    color: '#17202a',
    accent: '#922b21',
    edition: 'Antagonist Guide'
  }
};

export const DISCIPLINES_LEXICON = [
  {
    name: 'Animalism',
    url: 'https://vtm.paradoxwikis.com/Animalism',
    icon: '/img/disciplines/Animalism-rombo.png',
    book: 'Corebook',
    page: 244,
    pdfPage: 246,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Auspex',
    url: 'https://vtm.paradoxwikis.com/Auspex',
    icon: '/img/disciplines/Auspex-rombo.png',
    book: 'Corebook',
    page: 248,
    pdfPage: 250,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Blood Sorcery',
    url: 'https://vtm.paradoxwikis.com/Blood_Sorcery',
    icon: '/img/disciplines/Blood-Sorcery-rombo.png',
    book: 'Corebook',
    page: 271,
    pdfPage: 273,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Celerity',
    url: 'https://vtm.paradoxwikis.com/Celerity',
    icon: '/img/disciplines/Celerity-rombo.png',
    book: 'Corebook',
    page: 252,
    pdfPage: 254,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Dominate',
    url: 'https://vtm.paradoxwikis.com/Dominate',
    icon: '/img/disciplines/Dominate-rombo.png',
    book: 'Corebook',
    page: 254,
    pdfPage: 256,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Fortitude',
    url: 'https://vtm.paradoxwikis.com/Fortitude',
    icon: '/img/disciplines/Fortitude-rombo.png',
    book: 'Corebook',
    page: 258,
    pdfPage: 260,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Obfuscate',
    url: 'https://vtm.paradoxwikis.com/Obfuscate',
    icon: '/img/disciplines/Obfuscate-rombo.png',
    book: 'Corebook',
    page: 260,
    pdfPage: 262,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Oblivion',
    url: 'https://vtm.paradoxwikis.com/Oblivion',
    icon: '/img/disciplines/Oblivion-rombo.png',
    book: 'Cults of the Blood Gods',
    page: 201,
    pdfPage: 202,
    file: 'Cults-of-the-Blood-Gods-Vampire-the-Masquerade-5th-Edition.pdf'
  },
  {
    name: 'Potence',
    url: 'https://vtm.paradoxwikis.com/Potence',
    icon: '/img/disciplines/Potence-rombo.png',
    book: 'Corebook',
    page: 263,
    pdfPage: 265,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Presence',
    url: 'https://vtm.paradoxwikis.com/Presence',
    icon: '/img/disciplines/Presence-rombo.png',
    book: 'Corebook',
    page: 266,
    pdfPage: 268,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Protean',
    url: 'https://vtm.paradoxwikis.com/Protean',
    icon: '/img/disciplines/Protean-rombo.png',
    book: 'Corebook',
    page: 269,
    pdfPage: 271,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Thin blood Alchemy',
    url: 'https://vtm.paradoxwikis.com/Thin-blood_Alchemy',
    icon: '/img/disciplines/Thin-blood-Alchemy-rombo.png',
    book: 'Corebook',
    page: 282,
    pdfPage: 284,
    file: 'Vampire-the-Masquerade-1.pdf'
  }
];

export const CLANS_LEXICON = [
  {
    name: 'Banu Haqim',
    url: 'https://vtm.paradoxwikis.com/Banu_Haqim',
    icon: '/img/clans/white/330px-Banu_Haqim_symbol_white.webp',
    book: 'Players Guide',
    page: 14,
    pdfPage: 16,
    file: 'Vampire-The-Masquerade-V5-Players-Guide.pdf'
  },
  {
    name: 'Brujah',
    url: 'https://vtm.paradoxwikis.com/Brujah',
    icon: '/img/clans/white/330px-Brujah_symbol_white.webp',
    book: 'Corebook',
    page: 65,
    pdfPage: 67,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Gangrel',
    url: 'https://vtm.paradoxwikis.com/Gangrel',
    icon: '/img/clans/white/330px-Gangrel_symbol_white.webp',
    book: 'Corebook',
    page: 70,
    pdfPage: 72,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Hecata',
    url: 'https://vtm.paradoxwikis.com/Hecata',
    icon: '/img/clans/white/330px-Hecata_symbol_white.webp',
    book: 'Cults of the Blood Gods',
    page: 192,
    pdfPage: 193,
    file: 'Cults-of-the-Blood-Gods-Vampire-the-Masquerade-5th-Edition.pdf'
  },
  {
    name: 'Lasombra',
    url: 'https://vtm.paradoxwikis.com/Lasombra',
    icon: '/img/clans/white/330px-Lasombra_symbol_white.webp',
    book: 'Players Guide',
    page: 44,
    pdfPage: 46,
    file: 'Vampire-The-Masquerade-V5-Players-Guide.pdf'
  },
  {
    name: 'Malkavian',
    url: 'https://vtm.paradoxwikis.com/Malkavian',
    icon: '/img/clans/white/330px-Malkavian_symbol_white.webp',
    book: 'Corebook',
    page: 76,
    pdfPage: 78,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'The Ministry',
    url: 'https://vtm.paradoxwikis.com/The_Ministry',
    icon: '/img/clans/white/330px-Ministry_symbol_white.webp',
    book: 'Anarch',
    page: 176,
    pdfPage: 177,
    file: 'Anarch-Vampire-the-Masquerade-5th-Edition.pdf'
  },
  {
    name: 'Nosferatu',
    url: 'https://vtm.paradoxwikis.com/Nosferatu',
    icon: '/img/clans/white/330px-Nosferatu_symbol_white.webp',
    book: 'Corebook',
    page: 81,
    pdfPage: 83,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Ravnos',
    url: 'https://vtm.paradoxwikis.com/Ravnos',
    icon: '/img/clans/white/330px-Ravnos_symbol_white.webp',
    book: 'Players Guide',
    page: 64,
    pdfPage: 66,
    file: 'Vampire-The-Masquerade-V5-Players-Guide.pdf'
  },
  {
    name: 'Salubri',
    url: 'https://vtm.paradoxwikis.com/Salubri',
    icon: '/img/clans/white/330px-Salubri_symbol_white.webp',
    book: 'Players Guide',
    page: 74,
    pdfPage: 76,
    file: 'Vampire-The-Masquerade-V5-Players-Guide.pdf'
  },
  {
    name: 'Toreador',
    url: 'https://vtm.paradoxwikis.com/Toreador',
    icon: '/img/clans/white/330px-Toreador_symbol_white.webp',
    book: 'Corebook',
    page: 88,
    pdfPage: 90,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Tremere',
    url: 'https://vtm.paradoxwikis.com/Tremere',
    icon: '/img/clans/white/330px-Tremere_symbol_white.webp',
    book: 'Corebook',
    page: 94,
    pdfPage: 96,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Tzimisce',
    url: 'https://vtm.paradoxwikis.com/Tzimisce',
    icon: '/img/clans/white/330px-Tzimisce_symbol_white.webp',
    book: 'Players Guide',
    page: 82,
    pdfPage: 84,
    file: 'Vampire-The-Masquerade-V5-Players-Guide.pdf'
  },
  {
    name: 'Ventrue',
    url: 'https://vtm.paradoxwikis.com/Ventrue',
    icon: '/img/clans/white/330px-Ventrue_symbol_white.webp',
    book: 'Corebook',
    page: 99,
    pdfPage: 101,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Caitiff',
    url: 'https://vtm.paradoxwikis.com/Caitiff',
    icon: '/img/clans/white/330px-Caitiff_symbol_white.webp',
    book: 'Corebook',
    page: 105,
    pdfPage: 107,
    file: 'Vampire-the-Masquerade-1.pdf'
  },
  {
    name: 'Thin blood',
    url: 'https://vtm.paradoxwikis.com/Thin-blood',
    icon: '/img/clans/white/330px-Thinblood_symbol_white.webp',
    book: 'Corebook',
    page: 109,
    pdfPage: 111,
    file: 'Vampire-the-Masquerade-1.pdf'
  }
];

export const PARADOX_WIKI_REGISTRY = [
  // Disciplines
  {
    title: 'Animalism',
    category: 'Disciplines',
    url: 'https://vtm.paradoxwikis.com/Animalism',
    summary: 'Mastery over the Beast and beasts: animal communion, famuli, and directing frenzy outward.',
    keywords: ['animalism', 'beast', 'animals', 'famulus', 'discipline']
  },
  {
    title: 'Auspex',
    category: 'Disciplines',
    url: 'https://vtm.paradoxwikis.com/Auspex',
    summary: 'Supernatural perception: enhanced senses, aura perception, telepathy, and premonition.',
    keywords: ['auspex', 'senses', 'aura', 'telepathy', 'premonition', 'discipline']
  },
  {
    title: 'Blood Sorcery',
    category: 'Disciplines',
    url: 'https://vtm.paradoxwikis.com/Blood_Sorcery',
    summary: 'Hermetic blood magic: corrupting blood, caustic strikes, wards, and eldritch rituals.',
    keywords: ['blood sorcery', 'thaumaturgy', 'rituals', 'magic', 'discipline']
  },
  {
    title: 'Celerity',
    category: 'Disciplines',
    url: 'https://vtm.paradoxwikis.com/Celerity',
    summary: 'Preternatural speed: lightning swift movement, rapid dodging, and split second reflexes.',
    keywords: ['celerity', 'speed', 'swiftness', 'dodge', 'reflexes', 'discipline']
  },
  {
    title: 'Dominate',
    category: 'Disciplines',
    url: 'https://vtm.paradoxwikis.com/Dominate',
    summary: 'Mental subjugation: commanding eyes, erasing memories, mesmerizing victims, and possession.',
    keywords: ['dominate', 'command', 'mesmerize', 'forget', 'possession', 'mind', 'discipline']
  },
  {
    title: 'Fortitude',
    category: 'Disciplines',
    url: 'https://vtm.paradoxwikis.com/Fortitude',
    summary: 'Unearthly resilience: resisting physical injury, defying fire and sunlight, mental defense.',
    keywords: ['fortitude', 'resilience', 'armor', 'toughness', 'defy bane', 'discipline']
  },
  {
    title: 'Obfuscate',
    category: 'Disciplines',
    url: 'https://vtm.paradoxwikis.com/Obfuscate',
    summary: 'Supernatural stealth: vanishing from sight, cloaking the mind, and adopting false guises.',
    keywords: ['obfuscate', 'stealth', 'invisible', 'cloak', 'mask', 'discipline']
  },
  {
    title: 'Oblivion',
    category: 'Disciplines',
    url: 'https://vtm.paradoxwikis.com/Oblivion',
    summary: 'Abyssal and necromantic power: summoning shadow appendages, spirits, and death ceremonies.',
    keywords: ['oblivion', 'necromancy', 'shadows', 'abyss', 'ceremonies', 'spirits', 'discipline']
  },
  {
    title: 'Potence',
    category: 'Disciplines',
    url: 'https://vtm.paradoxwikis.com/Potence',
    summary: 'Monstrous physical strength: lethal strikes, leaping great heights, and smashing barriers.',
    keywords: ['potence', 'strength', 'might', 'lethal strike', 'discipline']
  },
  {
    title: 'Presence',
    category: 'Disciplines',
    url: 'https://vtm.paradoxwikis.com/Presence',
    summary: 'Emotional manipulation: awe, dread, supernatural allure, and commanding adoration.',
    keywords: ['presence', 'awe', 'daunt', 'entrancement', 'majesty', 'discipline']
  },
  {
    title: 'Protean',
    category: 'Disciplines',
    url: 'https://vtm.paradoxwikis.com/Protean',
    summary: 'Physical metamorphosis: shape shifting, feral claws, earth meld, mist form, and serpent eyes.',
    keywords: ['protean', 'shapeshifting', 'claws', 'earth meld', 'mist', 'discipline']
  },
  {
    title: 'Thin blood Alchemy',
    category: 'Disciplines',
    url: 'https://vtm.paradoxwikis.com/Thin-blood_Alchemy',
    summary: 'Improvised alchemy: brewing counterfeit discipline powers through mortal blood and reagents.',
    keywords: ['thin blood alchemy', 'alchemy', 'athanor', 'calcinatio', 'fixatio', 'distillation']
  },

  // Clans
  {
    title: 'Banu Haqim',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Banu_Haqim',
    summary: 'Judges, assassins, and viziers: Blood Sorcery and Celerity masters with a blood addiction bane.',
    keywords: ['banu haqim', 'assamite', 'judges', 'viziers', 'clan']
  },
  {
    title: 'Brujah',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Brujah',
    summary: 'Philosopher rebels: fiery passion, Potence, Celerity, Presence, and fierce temper.',
    keywords: ['brujah', 'rebels', 'punks', 'anarchs', 'clan']
  },
  {
    title: 'Gangrel',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Gangrel',
    summary: 'Wild feral nomads: animal communion, Protean shapeshifting, taking animal features on frenzy.',
    keywords: ['gangrel', 'feral', 'nomads', 'beasts', 'clan']
  },
  {
    title: 'Hecata',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Hecata',
    summary: 'Clan of Death: Family reunion of necromancers, Oblivion, and the excruciating Painful Kiss.',
    keywords: ['hecata', 'giovanni', 'samedi', 'nagaraja', 'necromancers', 'death', 'clan']
  },
  {
    title: 'Lasombra',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Lasombra',
    summary: 'Ruthless magisters: Dominate and Oblivion shadow masters bearing distorted reflections.',
    keywords: ['lasombra', 'magisters', 'shadows', 'abyss', 'clan']
  },
  {
    title: 'Malkavian',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Malkavian',
    summary: 'Oracles and seers: Auspex, Dominate, Obfuscate, bound together by the Cobweb madness.',
    keywords: ['malkavian', 'seers', 'oracles', 'madness', 'cobweb', 'derangement', 'clan']
  },
  {
    title: 'The Ministry',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/The_Ministry',
    summary: 'Setite liberators: Protean and Presence, tempting souls, severely sensitive to bright light.',
    keywords: ['ministry', 'setite', 'followers of set', 'temptation', 'clan']
  },
  {
    title: 'Nosferatu',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Nosferatu',
    summary: 'Information brokers: monstrous disfigurement, sewer dwellers, Animalism and Obfuscate masters.',
    keywords: ['nosferatu', 'sewers', 'info', 'secrets', 'disfigured', 'clan']
  },
  {
    title: 'Ravnos',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Ravnos',
    summary: 'Daredevils and tricksters: Chimerstry illusions, Presence, compelled to never sleep in one place.',
    keywords: ['ravnos', 'tricksters', 'illusions', 'chimerstry', 'wanderer', 'clan']
  },
  {
    title: 'Salubri',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Salubri',
    summary: 'Third eyed healers: Obeah restorative powers, hunted and coveted for their exquisite blood.',
    keywords: ['salubri', 'healers', 'third eye', 'obeah', 'clan']
  },
  {
    title: 'Toreador',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Toreador',
    summary: 'Artists and divas: masters of beauty, Celerity, Auspex, Presence, entranced by aesthetics.',
    keywords: ['toreador', 'artists', 'divas', 'beauty', 'sensates', 'clan']
  },
  {
    title: 'Tremere',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Tremere',
    summary: 'Warlock scholars: Blood Sorcery and Dominate, fractured blood bonds following Vienna destruction.',
    keywords: ['tremere', 'warlocks', 'pyramid', 'blood sorcery', 'clan']
  },
  {
    title: 'Tzimisce',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Tzimisce',
    summary: 'Dragon territorial lords: Vicissitude fleshcrafting, Animalism, possessive of domain and soil.',
    keywords: ['tzimisce', 'dragons', 'fleshcrafting', 'vicissitude', 'voivode', 'clan']
  },
  {
    title: 'Ventrue',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Ventrue',
    summary: 'Aristocrats and rulers: Dominate, Fortitude, Presence, restricted to rare specific feeding vessels.',
    keywords: ['ventrue', 'rulers', 'kings', 'blue bloods', 'palate', 'clan']
  },
  {
    title: 'Caitiff',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Caitiff',
    summary: 'The Clanless: vampires lacking clan lineage, flexible disciplines, social pariahs of kindred society.',
    keywords: ['caitiff', 'clanless', 'panders', 'clan']
  },
  {
    title: 'Thin blood',
    category: 'Clans',
    url: 'https://vtm.paradoxwikis.com/Thin-blood',
    summary: 'Duskborn of the 14th, 15th, and 16th generations: half mortal capabilities, alchemy, and frail blood.',
    keywords: ['thin blood', 'duskborn', '14th generation', '15th generation', 'clan']
  },

  // Backgrounds & Advantages
  {
    title: 'Contacts',
    category: 'Backgrounds',
    url: 'https://vtm.paradoxwikis.com/Contacts',
    summary: 'Informants and sources who provide gossip, early warnings, and specialized intelligence.',
    keywords: ['contacts', 'informants', 'intel', 'background']
  },
  {
    title: 'Allies',
    category: 'Backgrounds',
    url: 'https://vtm.paradoxwikis.com/Allies',
    summary: 'Mortal friends, relatives, or associates who assist and perform favors for the vampire.',
    keywords: ['allies', 'friends', 'mortals', 'helpers', 'background']
  },
  {
    title: 'Haven',
    category: 'Backgrounds',
    url: 'https://vtm.paradoxwikis.com/Haven',
    summary: 'Secure living space protected from sunlight: security systems, hidden chambers, laboratory, luxury.',
    keywords: ['haven', 'shelter', 'safehouse', 'base', 'background']
  },
  {
    title: 'Herd',
    category: 'Backgrounds',
    url: 'https://vtm.paradoxwikis.com/Herd',
    summary: 'Reliable group of mortal vessels available for safe feeding without hunting tests.',
    keywords: ['herd', 'feeding', 'vessels', 'kine', 'background']
  },
  {
    title: 'Influence',
    category: 'Backgrounds',
    url: 'https://vtm.paradoxwikis.com/Influence',
    summary: 'Sway over mortal institutions: police, city hall, media, organized crime, and finance.',
    keywords: ['influence', 'politics', 'police', 'city hall', 'media', 'background']
  },
  {
    title: 'Mask',
    category: 'Backgrounds',
    url: 'https://vtm.paradoxwikis.com/Mask',
    summary: 'False mortal identity, paper trails, driver license, bank accounts, and fake biographies.',
    keywords: ['mask', 'identity', 'papers', 'cover', 'background']
  },
  {
    title: 'Mawla',
    category: 'Backgrounds',
    url: 'https://vtm.paradoxwikis.com/Mawla',
    summary: 'Kindred mentor, elder patron, or teacher providing guidance, advice, and political protection.',
    keywords: ['mawla', 'mentor', 'teacher', 'patron', 'elder', 'background']
  },
  {
    title: 'Resources',
    category: 'Backgrounds',
    url: 'https://vtm.paradoxwikis.com/Resources',
    summary: 'Wealth, income streams, real estate, liquid capital, and high end assets.',
    keywords: ['resources', 'money', 'wealth', 'cash', 'income', 'background']
  },
  {
    title: 'Retainers',
    category: 'Backgrounds',
    url: 'https://vtm.paradoxwikis.com/Retainers',
    summary: 'Devoted assistants, bodyguards, drivers, and ghouls bound to the vampires service.',
    keywords: ['retainers', 'ghoul', 'servants', 'assistants', 'bodyguard', 'background']
  },
  {
    title: 'Status',
    category: 'Backgrounds',
    url: 'https://vtm.paradoxwikis.com/Status',
    summary: 'Standing and recognized reputation in Kindred sects (Camarilla, Anarch, or Church of Caine).',
    keywords: ['status', 'standing', 'reputation', 'prestation', 'background']
  },

  // Core Rules & Mechanics
  {
    title: 'Hunger',
    category: 'Rules and Systems',
    url: 'https://vtm.paradoxwikis.com/Hunger',
    summary: 'The craving for blood rating from 0 to 5, replacing normal dice with Hunger dice on all pools.',
    keywords: ['hunger', 'blood', 'slaking', 'starvation', 'bestial', 'rules']
  },
  {
    title: 'Blood Potency',
    category: 'Rules and Systems',
    url: 'https://vtm.paradoxwikis.com/Blood_Potency',
    summary: 'The supernatural concentration of vitae: grants blood surge, power bonuses, and increases bane severity.',
    keywords: ['blood potency', 'generation', 'surge', 'mend', 'bane severity', 'rules']
  },
  {
    title: 'Humanity',
    category: 'Rules and Systems',
    url: 'https://vtm.paradoxwikis.com/Humanity',
    summary: 'Moral tether holding back the Beast: stains, convictions, touchstones, remorse, and torpor.',
    keywords: ['humanity', 'stains', 'remorse', 'beast', 'touchstones', 'convictions', 'rules']
  },
  {
    title: 'Rouse Check',
    category: 'Rules and Systems',
    url: 'https://vtm.paradoxwikis.com/Rouse_Check',
    summary: 'Test of the Blood: roll one d10, on 1 to 5 Hunger increases by 1 box.',
    keywords: ['rouse check', 'rouse', 'blood test', 'hunger increase', 'rules']
  },
  {
    title: 'Blood Surge',
    category: 'Rules and Systems',
    url: 'https://vtm.paradoxwikis.com/Blood_Surge',
    summary: 'Calling on the blood to gain bonus dice on a test, costs an immediate Rouse check.',
    keywords: ['blood surge', 'dice boost', 'rouse', 'burst', 'rules']
  },
  {
    title: 'Frenzy',
    category: 'Rules and Systems',
    url: 'https://vtm.paradoxwikis.com/Frenzy',
    summary: 'Violent loss of control to the Beast: Fury frenzy, Hunger frenzy, and riding the wave.',
    keywords: ['frenzy', 'fury', 'hunger frenzy', 'beast control', 'rules']
  },
  {
    title: 'Rötschreck',
    category: 'Rules and Systems',
    url: 'https://vtm.paradoxwikis.com/R%C3%B6tschreck',
    summary: 'Terror frenzy triggered by fire, sunlight, or extreme heat causing involuntary panicked flight.',
    keywords: ['rotschreck', 'terror frenzy', 'fire', 'sunlight', 'panic', 'rules']
  },
  {
    title: 'Compulsions',
    category: 'Rules and Systems',
    url: 'https://vtm.paradoxwikis.com/Compulsions',
    summary: 'Urges triggered by bestial failures or messy criticals: Hunger, Dominance, Harm, Paranoia, Clan compulsions.',
    keywords: ['compulsions', 'messy critical', 'bestial failure', 'clan compulsions', 'rules']
  },
  {
    title: 'Diablerie',
    category: 'Rules and Systems',
    url: 'https://vtm.paradoxwikis.com/Diablerie',
    summary: 'Consuming kindred soul and blood: steals generation and powers, stains soul with black aura veins.',
    keywords: ['diablerie', 'amaranthe', 'soul consuming', 'generation steal', 'rules']
  },
  {
    title: 'Torpor',
    category: 'Rules and Systems',
    url: 'https://vtm.paradoxwikis.com/Torpor',
    summary: 'Deathlike hibernation entered upon catastrophic damage or starvation, duration scaled by humanity.',
    keywords: ['torpor', 'coma', 'sleep', 'awakening', 'damage', 'rules']
  },
  {
    title: 'Blush of Life',
    category: 'Rules and Systems',
    url: 'https://vtm.paradoxwikis.com/Blush_of_Life',
    summary: 'Rousing vitae to mimic mortal biology: warm skin, heartbeat, breath, digestion, and sexual function.',
    keywords: ['blush of life', 'mortal mimic', 'heartbeat', 'warmth', 'rules']
  },
  {
    title: 'Blood Bond',
    category: 'Rules and Systems',
    url: 'https://vtm.paradoxwikis.com/Blood_Bond',
    summary: 'Drinking directly from another kindred: three sips create a complete emotional enslavement bond.',
    keywords: ['blood bond', 'vinculum', 'regnant', 'thrall', 'enslavement', 'rules']
  },
  {
    title: 'Ghoul',
    category: 'Rules and Systems',
    url: 'https://vtm.paradoxwikis.com/Ghoul',
    summary: 'Mortal fed vampire blood: stops aging, gains level 1 discipline, bound to their kindred master.',
    keywords: ['ghoul', 'thrall', 'retainer', 'mortals', 'rules']
  },

  // Character Options & Systems
  {
    title: 'Predator Types',
    category: 'Character Options',
    url: 'https://vtm.paradoxwikis.com/Predator_type',
    summary: 'Kindred hunting styles: alleycat, bagger, blood leech, consensualist, farmer, pursuer, and more.',
    keywords: ['predator types', 'hunting style', 'feeding', 'bagger', 'alleycat', 'options']
  },
  {
    title: 'Coteries',
    category: 'Character Options',
    url: 'https://vtm.paradoxwikis.com/Coterie',
    summary: 'Kindred alliances and groups: hunting packs, envoys, blood cults, and communal domains.',
    keywords: ['coteries', 'packs', 'groups', 'alliances', 'options']
  },
  {
    title: 'Domain and Chasse',
    category: 'Rules and Systems',
    url: 'https://vtm.paradoxwikis.com/Domain',
    summary: 'Territory systems: Chasse (hunting richness), Lien (mortals integration), Portillon (security).',
    keywords: ['domain', 'chasse', 'lien', 'portillon', 'territory', 'rules']
  },

  // Setting and Sects
  {
    title: 'Camarilla',
    category: 'Setting and Sects',
    url: 'https://vtm.paradoxwikis.com/Camarilla',
    summary: 'The Ivory Tower: feudal sect enforcing the Traditions, court offices, Prince, and Masquerade.',
    keywords: ['camarilla', 'ivory tower', 'prince', 'court', 'traditions', 'sect']
  },
  {
    title: 'Anarch Movement',
    category: 'Setting and Sects',
    url: 'https://vtm.paradoxwikis.com/Anarch_Movement',
    summary: 'Revolutionary faction rejecting Prince feudalism: Baronies, free states, sweeps, and street gangs.',
    keywords: ['anarch movement', 'barons', 'free states', 'revolution', 'sect']
  },
  {
    title: 'Sabbat',
    category: 'Setting and Sects',
    url: 'https://vtm.paradoxwikis.com/Sabbat',
    summary: 'The Black Hand: death cult waging Gehenna war against the Antediluvians through packs and ritae.',
    keywords: ['sabbat', 'black hand', 'gehenna war', 'paths', 'vaulderie', 'sect']
  },
  {
    title: 'Second Inquisition',
    category: 'Setting and Sects',
    url: 'https://vtm.paradoxwikis.com/Second_Inquisition',
    summary: 'Clandestine coalition of mortal intelligence agencies hunting blankbodies through data and kill squads.',
    keywords: ['second inquisition', 'firstlight', 'hunters', 'blankbody', 'inquisition', 'setting']
  },
  {
    title: 'The Traditions',
    category: 'Setting and Sects',
    url: 'https://vtm.paradoxwikis.com/Traditions',
    summary: 'Six foundational kindred laws: Masquerade, Domain, Progeny, Accounting, Hospitality, Destruction.',
    keywords: ['traditions', 'masquerade', 'domain', 'progeny', 'accounting', 'hospitality', 'destruction']
  }
];

export const SOURCEBOOKS_TOC = {
  'Corebook': rawCorebookToc,

  'Players Guide': [
    { level: 1, title: 'Introduction', page: 6, pdfPage: 8 },
    { level: 1, title: 'Chapter One: The Clans', page: 12, pdfPage: 14 },
    { level: 2, title: 'Banu Haqim', page: 14, pdfPage: 16 },
    { level: 2, title: 'Hecata : Clan of Death', page: 26, pdfPage: 28 },
    { level: 3, title: 'Hecata Bloodlines : Giovanni, Samedi, Harbingers, Nagaraja, Lamia, Putanesca', page: 36, pdfPage: 38 },
    { level: 2, title: 'Lasombra', page: 44, pdfPage: 46 },
    { level: 2, title: 'The Ministry', page: 54, pdfPage: 56 },
    { level: 2, title: 'Ravnos', page: 64, pdfPage: 66 },
    { level: 2, title: 'Salubri', page: 74, pdfPage: 76 },
    { level: 2, title: 'Tzimisce', page: 82, pdfPage: 84 },
    { level: 2, title: 'Caitiff', page: 90, pdfPage: 92 },
    { level: 2, title: 'Thin bloods', page: 92, pdfPage: 94 },
    { level: 1, title: 'Chapter Two: Character Options and Disciplines', page: 94, pdfPage: 96 },
    { level: 2, title: 'Discipline Powers and Amalgams', page: 94, pdfPage: 96 },
    { level: 2, title: 'Blood Sorcery Rituals', page: 99, pdfPage: 101 },
    { level: 2, title: 'Oblivion Ceremonies', page: 104, pdfPage: 106 },
    { level: 2, title: 'Thin blood Alchemy Formulae', page: 106, pdfPage: 108 },
    { level: 2, title: 'Merits and Flaws Compendium', page: 114, pdfPage: 116 },
    { level: 3, title: 'Looks, Feeding, and Physical Flaws', page: 116, pdfPage: 118 },
    { level: 3, title: 'Supernatural and Mythic Traits', page: 120, pdfPage: 122 },
    { level: 3, title: 'Caitiff and Thin blood Traits', page: 121, pdfPage: 123 },
    { level: 2, title: 'Predator Types : Grim Reaper, Montero, Pursuer, Trapdoor', page: 138, pdfPage: 140 },
    { level: 1, title: 'Chapter Three: Alternative Systems and Rules', page: 148, pdfPage: 150 },
    { level: 2, title: 'Alternative Clan Banes', page: 154, pdfPage: 156 },
    { level: 2, title: 'Alternative Clan Compulsions', page: 158, pdfPage: 160 },
    { level: 2, title: 'Convictions and Touchstones Variants', page: 162, pdfPage: 164 },
    { level: 2, title: 'Advanced and Modular Combat Rules', page: 170, pdfPage: 172 },
    { level: 2, title: 'Domain and Haven Expansions', page: 182, pdfPage: 184 },
    { level: 1, title: 'Chapter Four: Loresheets Compendium', page: 192, pdfPage: 194 },
    { level: 2, title: 'Descendant Loresheets', page: 194, pdfPage: 196 },
    { level: 2, title: 'Clan and Bloodline Loresheets', page: 206, pdfPage: 208 },
    { level: 2, title: 'Historical and Mythic Loresheets', page: 218, pdfPage: 220 },
    { level: 1, title: 'Chapter Five: Advice and Chronicles', page: 236, pdfPage: 238 }
  ],

  'Cults of the Blood Gods': [
    { level: 1, title: 'Introduction: Faith and Damnation', page: 6, pdfPage: 7 },
    { level: 1, title: 'Chapter One: Rise of the Deathless (The Hecata)', page: 12, pdfPage: 13 },
    { level: 2, title: 'History of the Clan of Death and the Promise of 1528', page: 14, pdfPage: 15 },
    { level: 2, title: 'Bloodlines of the Family Reunion', page: 30, pdfPage: 31 },
    { level: 3, title: 'Giovanni Family and Rossellini', page: 36, pdfPage: 37 },
    { level: 3, title: 'Harbingers of Ashur', page: 38, pdfPage: 39 },
    { level: 3, title: 'Samedi', page: 40, pdfPage: 41 },
    { level: 3, title: 'Nagaraja', page: 42, pdfPage: 43 },
    { level: 3, title: 'Lamia and Gorgons', page: 44, pdfPage: 45 },
    { level: 3, title: 'Putanesca, Milliners, Dunsirn, and Pisanob', page: 46, pdfPage: 47 },
    { level: 2, title: 'Hecata Clan Bane and Compulsion', page: 66, pdfPage: 67 },
    { level: 1, title: 'Chapter Two: Cults of Caine', page: 70, pdfPage: 71 },
    { level: 2, title: 'Church of Caine', page: 72, pdfPage: 73 },
    { level: 2, title: 'Cult of Isis', page: 84, pdfPage: 85 },
    { level: 2, title: 'Children of Salvation', page: 96, pdfPage: 97 },
    { level: 1, title: 'Chapter Three: Cults of the Methuselahs', page: 120, pdfPage: 121 },
    { level: 2, title: 'The Bahari : Cult of Lilith', page: 122, pdfPage: 123 },
    { level: 2, title: 'Mithraic Mysteries', page: 136, pdfPage: 137 },
    { level: 2, title: 'Church of Set', page: 148, pdfPage: 149 },
    { level: 1, title: 'Chapter Four: Mortal and Kindred Cults', page: 162, pdfPage: 163 },
    { level: 2, title: 'Cult of the Blood Gods', page: 164, pdfPage: 165 },
    { level: 2, title: 'The Ashfinders (Thin blood Cult)', page: 180, pdfPage: 181 },
    { level: 1, title: 'Chapter Five: Disciplines, Powers, and Ceremonies', page: 200, pdfPage: 201 },
    { level: 2, title: 'Oblivion Discipline and Necromantic Spirits', page: 202, pdfPage: 203 },
    { level: 2, title: 'Oblivion Ceremonies : Level 1 to 5', page: 206, pdfPage: 207 },
    { level: 2, title: 'Blood Sorcery Rituals', page: 215, pdfPage: 216 },
    { level: 1, title: 'Chapter Six: Loresheets and Backgrounds', page: 219, pdfPage: 220 },
    { level: 2, title: 'Cult Loresheets : Bahari, Mithras, Church of Caine, Gorgons', page: 222, pdfPage: 223 },
    { level: 1, title: 'Chapter Seven: Storyteller Tools and Sacraments', page: 246, pdfPage: 247 }
  ],

  'Camarilla': [
    { level: 1, title: 'Introduction: The View from the Top', page: 6, pdfPage: 7 },
    { level: 2, title: 'The Upper Echelons and Inner Circle', page: 14, pdfPage: 15 },
    { level: 2, title: 'Sectarian Diplomacy', page: 16, pdfPage: 17 },
    { level: 1, title: 'The Traditions of Caine', page: 28, pdfPage: 29 },
    { level: 2, title: 'The First Tradition: The Masquerade', page: 30, pdfPage: 31 },
    { level: 2, title: 'The Second Tradition: The Domain', page: 34, pdfPage: 35 },
    { level: 2, title: 'The Third Tradition: The Progeny', page: 38, pdfPage: 39 },
    { level: 2, title: 'The Fourth Tradition: The Accounting', page: 42, pdfPage: 43 },
    { level: 2, title: 'The Fifth Tradition: Hospitality', page: 46, pdfPage: 47 },
    { level: 2, title: 'The Sixth Tradition: Destruction', page: 50, pdfPage: 51 },
    { level: 1, title: 'Court Structure and Officers', page: 54, pdfPage: 55 },
    { level: 2, title: 'The Prince and Court Dominance', page: 56, pdfPage: 57 },
    { level: 2, title: 'The Seneschal', page: 62, pdfPage: 63 },
    { level: 2, title: 'The Primogen Council', page: 66, pdfPage: 67 },
    { level: 2, title: 'The Sheriff', page: 72, pdfPage: 73 },
    { level: 2, title: 'The Scourge', page: 76, pdfPage: 77 },
    { level: 2, title: 'The Keeper of Elysium', page: 80, pdfPage: 81 },
    { level: 2, title: 'The Harpy', page: 84, pdfPage: 85 },
    { level: 1, title: 'The Banu Haqim in the Camarilla', page: 92, pdfPage: 93 },
    { level: 2, title: 'Banu Haqim Discipline Affinities and Blood Sorcery', page: 98, pdfPage: 99 },
    { level: 2, title: 'Banu Haqim Bane and Compulsion', page: 102, pdfPage: 103 },
    { level: 1, title: 'The Second Inquisition', page: 112, pdfPage: 113 },
    { level: 2, title: 'FIRSTLIGHT and Project Twilight Operations', page: 116, pdfPage: 117 },
    { level: 2, title: 'The Entity and Vatican Records', page: 124, pdfPage: 125 },
    { level: 2, title: 'Blankbody Threat Classifications and Safe Comms', page: 128, pdfPage: 129 },
    { level: 1, title: 'Blood Sorcery Rituals', page: 168, pdfPage: 169 },
    { level: 1, title: 'Camarilla Loresheets', page: 176, pdfPage: 177 },
    { level: 2, title: 'The Inner Circle Loresheet', page: 178, pdfPage: 179 },
    { level: 2, title: 'Justicars and Archons Loresheet', page: 182, pdfPage: 183 },
    { level: 2, title: 'Descendant of Hardestadt', page: 186, pdfPage: 187 },
    { level: 2, title: 'Descendant of Rafael de Corazon', page: 190, pdfPage: 191 },
    { level: 2, title: 'The Ashirra Alliance', page: 194, pdfPage: 195 }
  ],

  'Anarch': [
    { level: 1, title: 'Chapter One: The Blood and The Fire', page: 8, pdfPage: 9 },
    { level: 1, title: 'Chapter Two: The Movement and Free States', page: 32, pdfPage: 33 },
    { level: 2, title: 'The Free States and Autonomous Communes', page: 42, pdfPage: 43 },
    { level: 2, title: 'Baronies, Gangs, and Sweeps', page: 54, pdfPage: 55 },
    { level: 2, title: 'Anarch Culture and Rejection of Elders', page: 66, pdfPage: 67 },
    { level: 1, title: 'Chapter Three: The Ministry (Followers of Set)', page: 74, pdfPage: 75 },
    { level: 2, title: 'The Ministry Clan Overview and Philosophy', page: 76, pdfPage: 77 },
    { level: 2, title: 'Ministry Disciplines : Protean, Obfuscate, Presence', page: 80, pdfPage: 81 },
    { level: 2, title: 'Ministry Bane and Compulsion', page: 82, pdfPage: 83 },
    { level: 2, title: 'Cults and Temptations', page: 84, pdfPage: 85 },
    { level: 1, title: 'Chapter Four: Revolutionary Tactics and Street Warfare', page: 92, pdfPage: 93 },
    { level: 2, title: 'Urban Revolts and Guerrilla Tactics', page: 96, pdfPage: 97 },
    { level: 2, title: 'Subverting the Masquerade and Mortals', page: 110, pdfPage: 111 },
    { level: 2, title: 'Status and Renown Among Anarchs', page: 124, pdfPage: 125 },
    { level: 1, title: 'Chapter Five: Cities of the Free', page: 136, pdfPage: 137 },
    { level: 2, title: 'Los Angeles Free State', page: 138, pdfPage: 139 },
    { level: 2, title: 'Berlin Under Revolution', page: 152, pdfPage: 153 },
    { level: 1, title: 'Chapter Six: Anarch Loresheets', page: 176, pdfPage: 177 },
    { level: 2, title: 'The Anarch Movement Loresheet', page: 178, pdfPage: 179 },
    { level: 2, title: 'Free State Revolutionary Loresheet', page: 182, pdfPage: 183 },
    { level: 2, title: 'The Ministry Loresheet', page: 186, pdfPage: 187 },
    { level: 2, title: 'Descendant of Tyler', page: 190, pdfPage: 191 },
    { level: 2, title: 'Descendant of Salvador Garcia', page: 194, pdfPage: 195 }
  ],

  'Sabbat': [
    { level: 1, title: 'Introduction: Setting Fire', page: 6, pdfPage: 7 },
    { level: 1, title: 'Chapter One: The Righteous Supremacy of the Blood', page: 10, pdfPage: 11 },
    { level: 2, title: 'Paths of Enlightenment Overview', page: 19, pdfPage: 20 },
    { level: 2, title: 'The Path of Caine', page: 24, pdfPage: 25 },
    { level: 2, title: 'The Path of Cathari (Albigensians)', page: 28, pdfPage: 29 },
    { level: 2, title: 'The Path of Death and the Soul', page: 30, pdfPage: 31 },
    { level: 2, title: 'The Path of Power and the Inner Voice', page: 32, pdfPage: 33 },
    { level: 2, title: 'The Path of the Sun', page: 34, pdfPage: 35 },
    { level: 2, title: 'Forsaken Paths : Beast, Honorable Accord, Lilith', page: 37, pdfPage: 38 },
    { level: 1, title: 'Chapter Two: Apostates of a Cruel Church', page: 50, pdfPage: 51 },
    { level: 2, title: 'Sabbat Titles and Hierarchies', page: 60, pdfPage: 61 },
    { level: 2, title: 'Pack Patterns and Pack Dynamics', page: 62, pdfPage: 63 },
    { level: 2, title: 'Sabbat Advantages and Predator Types', page: 75, pdfPage: 76 },
    { level: 2, title: 'The Ritae and The Vaulderie', page: 81, pdfPage: 82 },
    { level: 1, title: 'Chapter Three: Burn Brightly', page: 96, pdfPage: 97 },
    { level: 2, title: 'Anatomy of a Death Cult', page: 97, pdfPage: 98 },
    { level: 2, title: 'Antitribu Clans and Heretics', page: 114, pdfPage: 115 },
    { level: 2, title: 'A Brief and Dirty History of the Sabbat', page: 130, pdfPage: 131 },
    { level: 1, title: 'Chapter Four: The Gehenna War', page: 144, pdfPage: 145 },
    { level: 2, title: 'SITREP: The Gehenna War Fronts', page: 145, pdfPage: 146 },
    { level: 2, title: 'Sabbat Domains : Mexico City, Brazil, Russia, Middle East', page: 150, pdfPage: 151 },
    { level: 1, title: 'Chapter Five: Storyteller Resources', page: 178, pdfPage: 179 },
    { level: 2, title: 'Clan Antagonists : Banu Haqim to Ventrue', page: 180, pdfPage: 181 },
    { level: 2, title: 'Weapons of War and Sacraments', page: 205, pdfPage: 206 },
    { level: 2, title: 'Sabbat Loresheets', page: 212, pdfPage: 213 }
  ]
};

// Combine Corebook index with all 5 new sourcebook entries
export const SOURCEBOOKS_SUBJECT_INDEX = [
  ...COREBOOK_SUBJECT_INDEX.map((item) => ({ ...item, book: 'Corebook' })),

  // ====================================================
  // PLAYERS GUIDE INDEX ENTRIES
  // ====================================================
  {
    book: 'Players Guide',
    topic: 'Alternative Clan Banes',
    category: 'Rules and Systems',
    page: 154,
    pdfPage: 156,
    section: 'Alternative Systems : Variant Clan Banes',
    summary: 'Variant banes for all 13 clans reflecting regional, generational, and physiological deviations.'
  },
  {
    book: 'Players Guide',
    topic: 'Alternative Clan Compulsions',
    category: 'Rules and Systems',
    page: 158,
    pdfPage: 160,
    section: 'Alternative Systems : Variant Compulsions',
    summary: 'Optional thematic compulsions triggered on bestial failures and messy criticals.'
  },
  {
    book: 'Players Guide',
    topic: 'Banu Haqim Clan Overview',
    category: 'Clans and Bloodlines',
    page: 14,
    pdfPage: 16,
    section: 'The Clans : Banu Haqim',
    summary: 'Judges and viziers of Caine, Blood Sorcery and Celerity masters, addiction to Kindred vitae.'
  },
  {
    book: 'Players Guide',
    topic: 'Caitiff Merits and Flaws',
    category: 'Merits and Flaws',
    page: 121,
    pdfPage: 123,
    section: 'Character Options : Caitiff Advantages',
    summary: 'Unique Clanless merits and flaws, bastard bloodline perks, and social penalties.'
  },
  {
    book: 'Players Guide',
    topic: 'Disciplines Compendium',
    category: 'Disciplines and Powers',
    page: 94,
    pdfPage: 96,
    section: 'Character Options : Expanded Disciplines',
    summary: 'Expanded powers across all twelve core disciplines, including new level 1 to 5 amalgams.'
  },
  {
    book: 'Players Guide',
    topic: 'Grim Reaper Predator Type',
    category: 'Predator Types',
    page: 138,
    pdfPage: 140,
    section: 'Character Options : Predator Types',
    summary: 'Feeding inside hospice care and end of life facilities, preying upon mortals close to death.'
  },
  {
    book: 'Players Guide',
    topic: 'Hecata Clan and 11 Bloodlines',
    category: 'Clans and Bloodlines',
    page: 26,
    pdfPage: 28,
    section: 'The Clans : Hecata',
    summary: 'Clan of Death reuniting Giovanni, Harbingers, Samedi, Nagaraja, Lamia, Putanesca, and Rossellini.'
  },
  {
    book: 'Players Guide',
    topic: 'Lasombra Clan Overview',
    category: 'Clans and Bloodlines',
    page: 44,
    pdfPage: 46,
    section: 'The Clans : Lasombra',
    summary: 'Magisters of shadow, social Darwinists, masters of Oblivion and Dominate, distorted reflections.'
  },
  {
    book: 'Players Guide',
    topic: 'Ministry Clan Overview',
    category: 'Clans and Bloodlines',
    page: 54,
    pdfPage: 56,
    section: 'The Clans : The Ministry',
    summary: 'Tempters and liberators of the soul, shapeshifters, presence and protean amalgams, severe light sensitivity.'
  },
  {
    book: 'Players Guide',
    topic: 'Montero Predator Type',
    category: 'Predator Types',
    page: 140,
    pdfPage: 142,
    section: 'Character Options : Predator Types',
    summary: 'Using herds or packs of retainers to corral and drive prey directly into the feeding trap.'
  },
  {
    book: 'Players Guide',
    topic: 'Oblivion Ceremonies Compendium',
    category: 'Rituals and Ceremonies',
    page: 104,
    pdfPage: 106,
    section: 'Character Options : Ceremonies',
    summary: 'Complete collection of level 1 to 5 necromantic ceremonies for summoning spirits and dead matter.'
  },
  {
    book: 'Players Guide',
    topic: 'Players Guide Loresheets',
    category: 'Loresheets',
    page: 192,
    pdfPage: 194,
    section: 'Character Options : Loresheets',
    summary: 'Comprehensive collection of descendant, bloodline, historical, and sect loresheets.'
  },
  {
    book: 'Players Guide',
    topic: 'Pursuer Predator Type',
    category: 'Predator Types',
    page: 142,
    pdfPage: 144,
    section: 'Character Options : Predator Types',
    summary: 'Stalking prey methodically across cities, calculating habits and routines before vanishing them.'
  },
  {
    book: 'Players Guide',
    topic: 'Ravnos Clan Overview',
    category: 'Clans and Bloodlines',
    page: 64,
    pdfPage: 66,
    section: 'The Clans : Ravnos',
    summary: 'Daredevils and illusionists, chimerstry protean amalgams, compelled into wandering by the doombane.'
  },
  {
    book: 'Players Guide',
    topic: 'Salubri Clan Overview',
    category: 'Clans and Bloodlines',
    page: 74,
    pdfPage: 76,
    section: 'The Clans : Salubri',
    summary: 'Healers and watchers bearing the third eye, Obeah amalgams, hunted for their delectable sweet blood.'
  },
  {
    book: 'Players Guide',
    topic: 'Thin blood Alchemy Formulae',
    category: 'Disciplines and Powers',
    page: 106,
    pdfPage: 108,
    section: 'Character Options : Thin blood Alchemy',
    summary: 'Expanded recipes and distillation methods across Athanor Corporis, Calcinatio, and Fixatio.'
  },
  {
    book: 'Players Guide',
    topic: 'Trapdoor Predator Type',
    category: 'Predator Types',
    page: 144,
    pdfPage: 146,
    section: 'Character Options : Predator Types',
    summary: 'Luring victims into custom traps, mazes, secret havens, and underground nightclubs.'
  },
  {
    book: 'Players Guide',
    topic: 'Tzimisce Clan Overview',
    category: 'Clans and Bloodlines',
    page: 82,
    pdfPage: 84,
    section: 'The Clans : Tzimisce',
    summary: 'Dragons of the Old World, Vicissitude fleshcrafters, possessive landlords bounded to native soil.'
  },

  // ====================================================
  // CULTS OF THE BLOOD GODS INDEX ENTRIES
  // ====================================================
  {
    book: 'Cults of the Blood Gods',
    topic: 'Ashfinders Cult',
    category: 'Setting and Lore',
    page: 180,
    pdfPage: 181,
    section: 'Mortal and Kindred Cults : Ashfinders',
    summary: 'Thin blood cult consuming ashes of incinerated elders to achieve temporary full vampire powers.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'Church of Caine',
    category: 'Setting and Lore',
    page: 72,
    pdfPage: 73,
    section: 'Cults of Caine : Church of Caine',
    summary: 'Heresy preaching devotion to the First Murderer as a dark divinity, sacraments, and doctrines.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'Church of Set',
    category: 'Setting and Lore',
    page: 148,
    pdfPage: 149,
    section: 'Cults of the Methuselahs : Church of Set',
    summary: 'Faith of the Ministry venerating Set as cosmic liberator through temptation and shattered moralities.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'Cult Loresheets',
    category: 'Loresheets',
    page: 222,
    pdfPage: 223,
    section: 'Character Options : Cult Loresheets',
    summary: 'Loresheets for Church of Caine, Bahari, Mithraic Mysteries, Cleopatras, Harbingers, and Gorgons.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'Harbingers of Ashur Bloodline',
    category: 'Clans and Bloodlines',
    page: 38,
    pdfPage: 39,
    section: 'The Hecata : Harbingers of Ashur',
    summary: 'Masked wraith:summoning necromancers seeking vengeance against the Giovanni patricians.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'Hecata Bane and Compulsion',
    category: 'Clans and Bloodlines',
    page: 66,
    pdfPage: 67,
    section: 'The Hecata : Bane and Compulsion',
    summary: 'The Painful Kiss: feeding causes excruciating agony and mortal trauma, Morbid Curiosity compulsion.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'Mithraic Mysteries',
    category: 'Setting and Lore',
    page: 136,
    pdfPage: 137,
    section: 'Cults of the Methuselahs : Mithraism',
    summary: 'Soldier cult dedicated to the ancient Prince of London Mithras, oaths, grades, and loyalties.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'Nagaraja Bloodline',
    category: 'Clans and Bloodlines',
    page: 42,
    pdfPage: 43,
    section: 'The Hecata : Nagaraja',
    summary: 'Cannibalistic flesh:eating necromancers requiring raw mortal flesh to slake their hunger.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'Oblivion Ceremonies Level 1 to 5',
    category: 'Rituals and Ceremonies',
    page: 206,
    pdfPage: 207,
    section: 'Disciplines : Oblivion Ceremonies',
    summary: 'Necromantic rites: The Mind Machine, Compel Spirit, Feast of Ashes, Shroud Mastery, Lazarene Blessing.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'Promise of 1528',
    category: 'Setting and Lore',
    page: 14,
    pdfPage: 15,
    section: 'The Hecata : History',
    summary: 'Historic treaty between the Venetian Giovanni and the Camarilla establishing mutual non:interference.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'Samedi Bloodline',
    category: 'Clans and Bloodlines',
    page: 40,
    pdfPage: 41,
    section: 'The Hecata : Samedi',
    summary: 'Corpse:faced necromancers steeped in Vodou, baron traditions, decay, and rot spirits.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'The Bahari (Cult of Lilith)',
    category: 'Setting and Lore',
    page: 122,
    pdfPage: 123,
    section: 'Cults of the Methuselahs : The Bahari',
    summary: 'Worshippers of the Dark Mother Lilith, enlightenment through sacred torment and botanical transmutations.'
  },

  // ====================================================
  // CAMARILLA INDEX ENTRIES
  // ====================================================
  {
    book: 'Camarilla',
    topic: 'Banu Haqim Camarilla Integration',
    category: 'Clans and Bloodlines',
    page: 92,
    pdfPage: 93,
    section: 'The Ivory Tower : Banu Haqim',
    summary: 'Assamite schismatics petitioning the Camarilla for membership following the Ur Shulgi awakening.'
  },
  {
    book: 'Camarilla',
    topic: 'Blood Sorcery Camarilla Rituals',
    category: 'Rituals and Ceremonies',
    page: 168,
    pdfPage: 169,
    section: 'Disciplines : Camarilla Rituals',
    summary: 'Tremere and Banu Haqim civic and defense rituals: Truth of Blood, Cohesive Haven, Ward Against Spirits.'
  },
  {
    book: 'Camarilla',
    topic: 'Camarilla Loresheets',
    category: 'Loresheets',
    page: 176,
    pdfPage: 177,
    section: 'Character Options : Camarilla Loresheets',
    summary: 'Inner Circle, Justicars, Archons, Descendants of Hardestadt and Rafael de Corazon, Ashirra Alliance.'
  },
  {
    book: 'Camarilla',
    topic: 'Court Officers and Structure',
    category: 'Setting and Lore',
    page: 54,
    pdfPage: 55,
    section: 'The Court : Titles and Hierarchy',
    summary: 'Political offices: Prince, Seneschal, Primogen, Sheriff, Scourge, Keeper of Elysium, and Harpy.'
  },
  {
    book: 'Camarilla',
    topic: 'FIRSTLIGHT and Second Inquisition',
    category: 'Setting and Lore',
    page: 112,
    pdfPage: 113,
    section: 'The Second Inquisition : Operations',
    summary: 'Global clandestine coalition of intelligence services executing digital purges and tactical strikes.'
  },
  {
    book: 'Camarilla',
    topic: 'The Ashirra Alliance',
    category: 'Setting and Lore',
    page: 194,
    pdfPage: 195,
    section: 'Loresheets : Ashirra Alliance',
    summary: 'The historic treaty between the Camarilla and the Islamic Kindred domains of the Middle East.'
  },
  {
    book: 'Camarilla',
    topic: 'The Traditions of Caine',
    category: 'Rules and Systems',
    page: 28,
    pdfPage: 29,
    section: 'The Laws of the Ivory Tower',
    summary: 'The six foundational laws: Masquerade, Domain, Progeny, Accounting, Hospitality, and Destruction.'
  },

  // ====================================================
  // ANARCH INDEX ENTRIES
  // ====================================================
  {
    book: 'Anarch',
    topic: 'Anarch Loresheets',
    category: 'Loresheets',
    page: 176,
    pdfPage: 177,
    section: 'Character Options : Anarch Loresheets',
    summary: 'The Anarch Movement, Free State Revolutionary, The Ministry, Descendant of Tyler, Salvador Garcia.'
  },
  {
    book: 'Anarch',
    topic: 'Anarch Street Warfare and Tactics',
    category: 'Rules and Systems',
    page: 92,
    pdfPage: 93,
    section: 'The Spark : Guerrilla Tactics',
    summary: 'Urban sabotage, subverting mortal protests, cellphone security, and hit and run sweeps against elders.'
  },
  {
    book: 'Anarch',
    topic: 'Baronies and Gang Structures',
    category: 'Setting and Lore',
    page: 54,
    pdfPage: 55,
    section: 'The Movement : Baronies',
    summary: 'Autonomous Anarch domains governed by Barons, gang councils, commune consensus, and sweeps.'
  },
  {
    book: 'Anarch',
    topic: 'Free States and Independent Communes',
    category: 'Setting and Lore',
    page: 32,
    pdfPage: 33,
    section: 'The Free States : Autonomy',
    summary: 'Egalitarian vampire territories rejecting Prince titles, feudal tithes, and Ivory Tower traditions.'
  },
  {
    book: 'Anarch',
    topic: 'Los Angeles Free State',
    category: 'Setting and Lore',
    page: 138,
    pdfPage: 139,
    section: 'Cities of the Free : Los Angeles',
    summary: 'History and status of the California Free State following the historic revolt and modern power struggles.'
  },
  {
    book: 'Anarch',
    topic: 'The Ministry in the Anarchs',
    category: 'Clans and Bloodlines',
    page: 74,
    pdfPage: 75,
    section: 'The Movement : The Ministry',
    summary: 'Followers of Set joining the Anarch revolution, selling liberation, narcotics, faith, and vice.'
  },

  // ====================================================
  // SABBAT INDEX ENTRIES
  // ====================================================
  {
    book: 'Sabbat',
    topic: 'Antitribu Clans in the Sabbat',
    category: 'Clans and Bloodlines',
    page: 114,
    pdfPage: 115,
    section: 'Burn Brightly : Antitribu',
    summary: 'The anti:clans waging holy war against their treacherous Antediluvian sires and mortal pawns.'
  },
  {
    book: 'Sabbat',
    topic: 'Gehenna War Frontlines',
    category: 'Setting and Lore',
    page: 144,
    pdfPage: 145,
    section: 'The Gehenna War : Active Fronts',
    summary: 'Frontline crusade operations across the Middle East, Alamut, Russia, Mexico City, and South America.'
  },
  {
    book: 'Sabbat',
    topic: 'Pack Patterns and Ductus Roles',
    category: 'Setting and Lore',
    page: 60,
    pdfPage: 61,
    section: 'Apostates of a Cruel Church : Packs',
    summary: 'The monastic cell structure: Ductus, Pack Priest, war packs, scout packs, and shock troops.'
  },
  {
    book: 'Sabbat',
    topic: 'Path of Caine',
    category: 'Rules and Systems',
    page: 24,
    pdfPage: 25,
    section: 'Paths of Enlightenment : Path of Caine',
    summary: 'Theological code mastering the Beast through discipline, rejecting mortal morality, emulating the Dark Father.'
  },
  {
    book: 'Sabbat',
    topic: 'Path of Cathari (Albigensians)',
    category: 'Rules and Systems',
    page: 28,
    pdfPage: 29,
    section: 'Paths of Enlightenment : Path of Cathari',
    summary: 'Belief that the material world is evil and vampires are demonic heralds designed to gorge on corruption.'
  },
  {
    book: 'Sabbat',
    topic: 'Path of Death and the Soul',
    category: 'Rules and Systems',
    page: 30,
    pdfPage: 31,
    section: 'Paths of Enlightenment : Path of Death',
    summary: 'Cold clinical exploration of necrophysics, extinguishing compassion to study mortality and souls.'
  },
  {
    book: 'Sabbat',
    topic: 'Path of Power and the Inner Voice',
    category: 'Rules and Systems',
    page: 32,
    pdfPage: 33,
    section: 'Paths of Enlightenment : Path of Power',
    summary: 'Doctrine of pure conquest, ruthless will, domination, and personal apex supremacy.'
  },
  {
    book: 'Sabbat',
    topic: 'Path of the Sun',
    category: 'Rules and Systems',
    page: 34,
    pdfPage: 35,
    section: 'Paths of Enlightenment : Path of the Sun',
    summary: 'Apocalyptic Thin blood path believing they are holy harbingers sent to purge elder vampires.'
  },
  {
    book: 'Sabbat',
    topic: 'Sabbat Loresheets',
    category: 'Loresheets',
    page: 212,
    pdfPage: 213,
    section: 'Character Options : Sabbat Loresheets',
    summary: 'Loresheets for Black Hand zealots, Inquisition survivors, Sabbat defectors, and ancient crusade packs.'
  },
  {
    book: 'Sabbat',
    topic: 'The Ritae and The Vaulderie',
    category: 'Rituals and Ceremonies',
    page: 81,
    pdfPage: 82,
    section: 'Apostates of a Cruel Church : Ritae',
    summary: 'Sacred pack rites: The Vaulderie blood chalice shattering individual blood bonds to create the Vinculum.'
  },
  {
    book: 'Players Guide',
    topic: 'Predator Types Compendium',
    category: 'Character Options',
    page: 136,
    pdfPage: 138,
    section: 'Character Options : Predator Types',
    summary: 'Overview of all predator types: hunting pools, feeding disciplines, humanity impact, and bonus advantages.'
  },
  {
    book: 'Players Guide',
    topic: 'Coterie Types and Domain Systems',
    category: 'Rules and Systems',
    page: 182,
    pdfPage: 184,
    section: 'Coteries : Building Groups',
    summary: 'Coterie archetypes, shared advantage pools, collective flaws, Chasse, Lien, and Portillon ratings.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'Mortuary Services and Feeding',
    category: 'Rules and Systems',
    page: 98,
    pdfPage: 99,
    section: 'The Business of Death : Feeding',
    summary: 'Graverobber and Extortionist hunting mechanics: preying on mourners, body disposal, and funeral homes.'
  },
  {
    book: 'Camarilla',
    topic: 'The Six Traditions of Caine',
    category: 'Rules and Systems',
    page: 28,
    pdfPage: 29,
    section: 'Laws of the Ivory Tower : Traditions',
    summary: 'Masquerade, Domain, Progeny, Accounting, Hospitality, and Destruction: enforcement and Prince judgments.'
  },
  {
    book: 'Camarilla',
    topic: 'The First Tradition: The Masquerade',
    category: 'Rules and Systems',
    page: 30,
    pdfPage: 31,
    section: 'Laws of the Ivory Tower : The Masquerade',
    summary: 'Thou shalt not reveal thy true nature to those not of the Blood. Doing so forfeits all claims to protection.'
  },
  {
    book: 'Camarilla',
    topic: 'The Second Tradition: The Domain',
    category: 'Rules and Systems',
    page: 34,
    pdfPage: 35,
    section: 'Laws of the Ivory Tower : The Domain',
    summary: 'Thy domain is thine own concern. All others owe thee respect while in it. None may challenge thy word in thy domain.'
  },
  {
    book: 'Camarilla',
    topic: 'The Third Tradition: The Progeny',
    category: 'Rules and Systems',
    page: 38,
    pdfPage: 39,
    section: 'Laws of the Ivory Tower : The Progeny',
    summary: 'Thou shalt only sire another with permission of thine Elder. If thou createst another without leave, both shall be slain.'
  },
  {
    book: 'Camarilla',
    topic: 'The Fourth Tradition: The Accounting',
    category: 'Rules and Systems',
    page: 42,
    pdfPage: 43,
    section: 'Laws of the Ivory Tower : The Accounting',
    summary: 'Those thou createst are thine own childer. Until released, their sins fall upon thy head and thou shalt answer for them.'
  },
  {
    book: 'Camarilla',
    topic: 'The Fifth Tradition: Hospitality',
    category: 'Rules and Systems',
    page: 46,
    pdfPage: 47,
    section: 'Laws of the Ivory Tower : Hospitality',
    summary: 'Honor one anothers domain. When coming to a foreign city, present thyself unto him who ruleth there.'
  },
  {
    book: 'Camarilla',
    topic: 'The Sixth Tradition: Destruction',
    category: 'Rules and Systems',
    page: 50,
    pdfPage: 51,
    section: 'Laws of the Ivory Tower : Destruction',
    summary: 'Thou art forbidden to destroy another of thy kind. The right of destruction belongeth only unto thine Elder or Prince.'
  },
  {
    book: 'Camarilla',
    topic: 'Camarilla Court Harpy and Boons',
    category: 'Setting and Lore',
    page: 84,
    pdfPage: 85,
    section: 'The Court : Harpys Role',
    summary: 'Harpies track social standing, public mockery, scandals, debts, and the registration of trivial, minor, and major boons.'
  },
  {
    book: 'Camarilla',
    topic: 'Camarilla Sheriff and Scourge Enforcement',
    category: 'Setting and Lore',
    page: 72,
    pdfPage: 73,
    section: 'The Court : Enforcers',
    summary: 'The Sheriff investigates violations and detains kindred. The Scourge patrols borders and destroys unsanctioned thin bloods.'
  },
  {
    book: 'Camarilla',
    topic: 'Second Inquisition Blankbody Tiers',
    category: 'Setting and Lore',
    page: 128,
    pdfPage: 129,
    section: 'The Second Inquisition : Threat Assessment',
    summary: 'Inquisition threat levels for blankbodies, safe communication protocols, burn bags, counter surveillance, and kill squads.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'Extortionist Predator Type',
    category: 'Predator Types',
    page: 98,
    pdfPage: 99,
    section: 'The Business of Death : Predator Types',
    summary: 'Coercing mortals into feeding arrangements through debt, blackmail, protection rackets, or institutional leverage.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'Graverobber Predator Type',
    category: 'Predator Types',
    page: 99,
    pdfPage: 100,
    section: 'The Business of Death : Predator Types',
    summary: 'Feeding on mourners at graveyards, mortuary personnel, autopsy tables, and fresh corpses before full coagulation.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'Feeding on the Dead and Embalmed Vitae',
    category: 'Rules and Systems',
    page: 202,
    pdfPage: 203,
    section: 'Disciplines : Necromantic Feeding',
    summary: 'Drinking blood from recently deceased corpses within minutes of death or treated with Oblivion sacraments to slake hunger.'
  },
  {
    book: 'Cults of the Blood Gods',
    topic: 'The Shroud and Spirit Manifestations',
    category: 'Rules and Systems',
    page: 204,
    pdfPage: 205,
    section: 'Disciplines : Oblivion and The Underworld',
    summary: 'The membrane separating the living world from the Shadowlands, localized density, ghostly anchors, and spiritual hazards.'
  },
  {
    book: 'Anarch',
    topic: 'Anarch Sweeps and Feeding Patrols',
    category: 'Rules and Systems',
    page: 92,
    pdfPage: 93,
    section: 'The Spark : Guerrilla Tactics',
    summary: 'Roadside Killer hunting, highway ambushes, sweeping mortal territory, and evading Camarilla sheriffs.'
  },
  {
    book: 'Anarch',
    topic: 'Roadside Killer Predator Type',
    category: 'Predator Types',
    page: 182,
    pdfPage: 183,
    section: 'Character Options : Predator Types',
    summary: 'Feeding on travelers, hitchhikers, truckers, and lone drivers along desolate highways and rest stops.'
  },
  {
    book: 'Anarch',
    topic: 'Anarch Cellphone and Digital Hygiene',
    category: 'Rules and Systems',
    page: 110,
    pdfPage: 111,
    section: 'The Spark : Operational Security',
    summary: 'Strict communication discipline: burner phones, dead drops, encrypted mesh nets, and preventing Second Inquisition geo tracking.'
  },
  {
    book: 'Anarch',
    topic: 'Guerrilla Street Warfare and Urban Sabotage',
    category: 'Rules and Systems',
    page: 96,
    pdfPage: 97,
    section: 'The Spark : Street Tactics',
    summary: 'Coordinating flash mobs, cutting municipal power grids, molotov ambushes against elders havens, and rapid redeployment.'
  },
  {
    book: 'Players Guide',
    topic: 'Advanced Modular Combat Systems',
    category: 'Rules and Systems',
    page: 170,
    pdfPage: 172,
    section: 'Alternative Systems : Combat Options',
    summary: 'Optional tactical combat rules: flanking, cover, called shots, weapon modifications, and environmental hazards.'
  },
  {
    book: 'Players Guide',
    topic: 'Convictions and Touchstones Variants',
    category: 'Rules and Systems',
    page: 162,
    pdfPage: 164,
    section: 'Alternative Systems : Morality',
    summary: 'Alternative conviction pairings, philosophical touchstones, institutional touchstones, and chronicling remorse.'
  },
  {
    book: 'Corebook',
    topic: 'Hunting Difficulty and Domain Chasse',
    category: 'Rules and Systems',
    page: 221,
    pdfPage: 223,
    section: 'Vampires at Play : Hunting in Domain',
    summary: 'Baseline hunting tests vs Difficulty determined by domain Chasse, mortal population density, and police presence.'
  }
];
