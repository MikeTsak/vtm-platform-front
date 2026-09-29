// src/features/xp-shop/suggestions.js
//
// Advanced Experience Suggestions Engine for Vampire: The Masquerade 5th Edition.
//
// Built to strictly honor the core system mechanics in Rules.md:
// - Section 1: Basic Dice Mechanics (regular dice vs Hunger dice, Willpower rerolls of up to 3 regular dice)
// - Section 2: Hunger System (Rouse checks, Blood Surge dice bonuses, Bestial Failures on 1s, Messy Criticals on 10s)
// - Section 3: Health & Damage (Health track = Stamina + 3, Superficial halved, Aggravated claws/teeth/fire, Physical Impairment minus 2 penalty)
// - Section 4: Willpower (Tracker = Composure + Resolve, session start recovery = higher of Composure or Resolve, Mental/Social Impairment minus 2 penalty)
// - Section 6: Frenzy & The Beast (resisting with Willpower + Humanity / 3, animalistic fury)
// - Section 7: Resonance & Temperaments (Choleric, Melancholy, Phlegmatic, Sanguine associations)
// - Section 8 & 14: Clan Banes & Compulsions (Gangrel Feral Impulses minus 3 Man/Int, Brujah Fury Frenzy penalties, Ventrue restrictions, etc.)
// - Section 9: Disciplines & Amalgams (secondary discipline prerequisites)
// - Section 15: Blood Potency Table (exact milestones for Blood Surge, Superficial Mending, Discipline Bonus dice, and Bane Severity)
//
// Typography Rule strictly observed: NO hyphens or em-dashes in any user-facing text, tags, notes, or subtitles.

import { PREDATOR_TYPES } from '../../data/predator_types.js';
import { ALL_DISCIPLINE_NAMES } from '../../data/disciplines.js';
import { RITUALS } from '../../data/rituals.js';

export const ATTR_GROUPS = {
  Physical: ['Strength', 'Dexterity', 'Stamina'],
  Social: ['Charisma', 'Manipulation', 'Composure'],
  Mental: ['Intelligence', 'Wits', 'Resolve'],
};

export const SKILL_GROUPS = {
  Physical: ['Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival'],
  Social: ['Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge'],
  Mental: ['Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology'],
};

export const ALL_ATTRS = Object.values(ATTR_GROUPS).flat();
export const ALL_SKILLS = Object.values(SKILL_GROUPS).flat();

const MAX_TRAIT = 5;
const MAX_BLOOD_POTENCY = 10;

// Cornerstone skills that come up in nearly every scene (Rules.md Section 1)
const CORNERSTONE_SKILLS = new Set([
  'Awareness', 'Athletics', 'Brawl', 'Insight', 'Intimidation',
  'Larceny', 'Occult', 'Persuasion', 'Stealth', 'Streetwise', 'Subterfuge',
]);

/* =========================================================================
   Blood Potency Table (Rules.md Section 15)
   ========================================================================= */

export const BLOOD_POTENCY_TABLE = [
  { bp: 0, surge: 1, mend: 1, bonus: 0, bane: 0 },
  { bp: 1, surge: 2, mend: 1, bonus: 0, bane: 1 },
  { bp: 2, surge: 2, mend: 2, bonus: 1, bane: 1 },
  { bp: 3, surge: 3, mend: 2, bonus: 1, bane: 2 },
  { bp: 4, surge: 3, mend: 3, bonus: 2, bane: 2 },
  { bp: 5, surge: 4, mend: 3, bonus: 2, bane: 3 },
  { bp: 6, surge: 4, mend: 3, bonus: 3, bane: 3 },
  { bp: 7, surge: 5, mend: 3, bonus: 3, bane: 4 },
  { bp: 8, surge: 5, mend: 4, bonus: 4, bane: 4 },
  { bp: 9, surge: 6, mend: 4, bonus: 4, bane: 5 },
  { bp: 10, surge: 6, mend: 5, bonus: 5, bane: 5 },
];

/* =========================================================================
   Clan Banes & Compulsions (Rules.md Section 8 & 14)
   ========================================================================= */

export const CLAN_BANES_AND_COMPULSIONS = {
  Gangrel: {
    compulsion: 'Feral Impulses',
    compulsionEffect: 'regresses into animalistic instincts with minus 3 penalty to Manipulation and Intelligence',
    baneEffect: 'takes on animal physical features when frenzying, suffering social and mental penalties',
    remedyAttrs: ['Resolve', 'Wits'],
    remedyReason: 'fortifies mental discipline against the Gangrel Feral Impulses compulsion (which penalizes Manipulation and Intelligence by 3)',
  },
  Brujah: {
    compulsion: 'Rebellion',
    compulsionEffect: 'takes minus 2 to all pools until rebelling against authority',
    baneEffect: 'suffers direct penalty to resist Fury Frenzy equal to Bane Severity',
    remedyAttrs: ['Composure', 'Resolve'],
    remedyReason: 'expands Willpower pool to withstand the Brujah bane penalty on Fury Frenzy tests',
  },
  Ventrue: {
    compulsion: 'Arrogance',
    compulsionEffect: 'must force someone to obey a command without Dominate',
    baneEffect: 'restricted feeding preferences that reject common blood',
    remedyAttrs: ['Resolve', 'Manipulation'],
    remedyReason: 'stabilizes feeding and commanding leverage under strict Ventrue feeding limitations',
  },
  Toreador: {
    compulsion: 'Obsession',
    compulsionEffect: 'takes minus 2 to all pools not focused on the object of beauty',
    baneEffect: 'suffers penalties when trapped in repulsive environments',
    remedyAttrs: ['Composure', 'Charisma'],
    remedyReason: 'maintains social poise and composure when confronted with sensory extremes',
  },
  Malkavian: {
    compulsion: 'Delusion',
    compulsionEffect: 'takes minus 2 to Dexterity, Manipulation, Composure, Wits, and Terror Frenzy',
    baneEffect: 'inescapable derangement linked to blood resonance',
    remedyAttrs: ['Resolve', 'Wits'],
    remedyReason: 'anchors mental clarity against the Malkavian Delusion compulsion penalties',
  },
  Nosferatu: {
    compulsion: 'Cryptophilia',
    compulsionEffect: 'compelled to uncover and hoard secrets',
    baneEffect: 'repulsive visage imposes penalties to disguise and social tests',
    remedyAttrs: ['Dexterity', 'Wits'],
    remedyReason: 'reinforces stealth and infiltration to bypass social scrutiny entirely',
  },
  Tremere: {
    compulsion: 'Perfectionism',
    compulsionEffect: 'takes minus 2 to all pools until scoring a critical win',
    baneEffect: 'inability to form blood bonds with other kindred',
    remedyAttrs: ['Intelligence', 'Resolve'],
    remedyReason: 'sharpens occult research and discipline pools to reliably achieve critical victories',
  },
  Lasombra: {
    compulsion: 'Ruthlessness',
    compulsionEffect: 'takes minus 2 to pools unless pursuing direct victory by any means',
    baneEffect: 'distorts digital recordings and reflective surfaces',
    remedyAttrs: ['Resolve', 'Strength'],
    remedyReason: 'fuels unwavering resolve and abyssal domination over lesser wills',
  },
  Hecata: {
    compulsion: 'Morbidity',
    compulsionEffect: 'compelled to study death and corpses',
    baneEffect: 'painful bite that rarely leaves vessels alive or compliant',
    remedyAttrs: ['Resolve', 'Stamina'],
    remedyReason: 'strengthens necromantic resilience and endurance against spiritual backlashes',
  },
};

/* =========================================================================
   Clan Archetypes & Core Affinities
   ========================================================================= */

export const CLAN_ARCHETYPES = {
  Gangrel: {
    title: 'Feral survivor close to the wild and the Beast',
    inClan: ['Animalism', 'Fortitude', 'Protean'],
    coreAttrs: ['Strength', 'Stamina', 'Wits', 'Resolve'],
    coreSkills: ['Survival', 'Brawl', 'Animal Ken', 'Athletics', 'Awareness', 'Stealth', 'Intimidation'],
    keyCombos: [
      { skill: 'Brawl', disc: 'Protean', desc: 'feral claws and lethal unarmed combat' },
      { skill: 'Survival', disc: 'Fortitude', desc: 'withstanding harsh wilderness hazards and damage' },
      { skill: 'Animal Ken', disc: 'Animalism', desc: 'commanding wild beasts and guiding a famulus' },
    ],
  },
  Brujah: {
    title: 'Rebel philosopher and devastating warrior',
    inClan: ['Celerity', 'Potence', 'Presence'],
    coreAttrs: ['Strength', 'Dexterity', 'Charisma', 'Resolve'],
    coreSkills: ['Brawl', 'Melee', 'Athletics', 'Intimidation', 'Leadership'],
    keyCombos: [
      { skill: 'Brawl', disc: 'Potence', desc: 'crushing unarmed strikes and raw force' },
      { skill: 'Athletics', disc: 'Celerity', desc: 'explosive speed and evasion in battle' },
      { skill: 'Intimidation', disc: 'Presence', desc: 'commanding crowd submission and fiery conviction' },
    ],
  },
  Tremere: {
    title: 'Hermetic scholar and master of Blood Sorcery',
    inClan: ['Auspex', 'Blood Sorcery', 'Dominate'],
    coreAttrs: ['Intelligence', 'Resolve', 'Wits', 'Composure'],
    coreSkills: ['Occult', 'Academics', 'Investigation', 'Awareness'],
    keyCombos: [
      { skill: 'Occult', disc: 'Blood Sorcery', desc: 'potent thaumaturgical rituals and blood control' },
      { skill: 'Investigation', disc: 'Auspex', desc: 'scrying psychic impressions and hidden secrets' },
      { skill: 'Leadership', disc: 'Dominate', desc: 'commanding subordinate wills with mental discipline' },
    ],
  },
  Nosferatu: {
    title: 'Subterranean spy, information broker, and monster',
    inClan: ['Animalism', 'Obfuscate', 'Potence'],
    coreAttrs: ['Dexterity', 'Wits', 'Strength', 'Stamina'],
    coreSkills: ['Stealth', 'Larceny', 'Streetwise', 'Investigation', 'Animal Ken'],
    keyCombos: [
      { skill: 'Stealth', disc: 'Obfuscate', desc: 'moving unseen through locked security' },
      { skill: 'Animal Ken', disc: 'Animalism', desc: 'organizing sewer vermin into spy networks' },
      { skill: 'Larceny', disc: 'Potence', desc: 'shattering reinforced barriers and vault locks' },
    ],
  },
  Malkavian: {
    title: 'Cursed seer piercing the veil of mortal perception',
    inClan: ['Auspex', 'Dominate', 'Obfuscate'],
    coreAttrs: ['Wits', 'Resolve', 'Composure', 'Intelligence'],
    coreSkills: ['Insight', 'Awareness', 'Subterfuge', 'Investigation', 'Occult'],
    keyCombos: [
      { skill: 'Insight', disc: 'Auspex', desc: 'uncovering hidden truths and auras' },
      { skill: 'Subterfuge', disc: 'Dominate', desc: 'fracturing minds with psychic dementation' },
      { skill: 'Stealth', disc: 'Obfuscate', desc: 'listening unnoticed from the unseen periphery' },
    ],
  },
  Toreador: {
    title: 'Visionary artist, muse, and social apex predator',
    inClan: ['Auspex', 'Celerity', 'Presence'],
    coreAttrs: ['Charisma', 'Dexterity', 'Composure', 'Manipulation'],
    coreSkills: ['Persuasion', 'Performance', 'Etiquette', 'Insight', 'Awareness'],
    keyCombos: [
      { skill: 'Persuasion', disc: 'Presence', desc: 'captivating salons and charming kindred court' },
      { skill: 'Performance', disc: 'Celerity', desc: 'graceful physical precision and lightning reflexes' },
      { skill: 'Insight', disc: 'Auspex', desc: 'perceiving microscopic soul fluctuations' },
    ],
  },
  Ventrue: {
    title: 'Aristocratic ruler, commander, and pillar of court',
    inClan: ['Dominate', 'Fortitude', 'Presence'],
    coreAttrs: ['Charisma', 'Manipulation', 'Resolve', 'Stamina'],
    coreSkills: ['Leadership', 'Persuasion', 'Intimidation', 'Finance', 'Politics'],
    keyCombos: [
      { skill: 'Leadership', disc: 'Dominate', desc: 'commanding absolute obedience with no dissent' },
      { skill: 'Stamina', disc: 'Fortitude', desc: 'absorbing direct assault while standing tall' },
      { skill: 'Persuasion', disc: 'Presence', desc: 'radiating regal authority and social awe' },
    ],
  },
  'Banu Haqim': {
    title: 'Judicious hunter, assassin, and blood scholar',
    inClan: ['Blood Sorcery', 'Celerity', 'Obfuscate'],
    coreAttrs: ['Dexterity', 'Resolve', 'Intelligence', 'Wits'],
    coreSkills: ['Melee', 'Stealth', 'Investigation', 'Occult', 'Awareness'],
    keyCombos: [
      { skill: 'Stealth', disc: 'Obfuscate', desc: 'silent stalker execution in darkness' },
      { skill: 'Melee', disc: 'Celerity', desc: 'blinding flurry of precision blade strikes' },
      { skill: 'Occult', disc: 'Blood Sorcery', desc: 'channeling judgements of vitae against transgressors' },
    ],
  },
  Hecata: {
    title: 'Necromancer consortium dealing with death and wraiths',
    inClan: ['Auspex', 'Fortitude', 'Oblivion'],
    coreAttrs: ['Resolve', 'Intelligence', 'Stamina', 'Composure'],
    coreSkills: ['Occult', 'Medicine', 'Insight', 'Awareness', 'Intimidation'],
    keyCombos: [
      { skill: 'Occult', disc: 'Oblivion', desc: 'communing with restless spirits and death ceremonies' },
      { skill: 'Stamina', disc: 'Fortitude', desc: 'resisting decay and physical trauma' },
      { skill: 'Insight', disc: 'Auspex', desc: 'perceiving the lingering shroud around dying souls' },
    ],
  },
  Lasombra: {
    title: 'Ruthless shadow aristocrat commanding the Abyss',
    inClan: ['Dominate', 'Oblivion', 'Potence'],
    coreAttrs: ['Strength', 'Resolve', 'Manipulation', 'Composure'],
    coreSkills: ['Intimidation', 'Stealth', 'Brawl', 'Subterfuge', 'Leadership'],
    keyCombos: [
      { skill: 'Intimidation', disc: 'Oblivion', desc: 'crushing mortal hope under living darkness' },
      { skill: 'Brawl', disc: 'Potence', desc: 'shadow reinforced brute physical violence' },
      { skill: 'Leadership', disc: 'Dominate', desc: 'ruling kindred with an unbending will' },
    ],
  },
  'The Ministry': {
    title: 'Tempter, corruptor, and serpent shapeshifter',
    inClan: ['Obfuscate', 'Presence', 'Protean'],
    coreAttrs: ['Manipulation', 'Charisma', 'Wits', 'Dexterity'],
    coreSkills: ['Subterfuge', 'Persuasion', 'Streetwise', 'Stealth'],
    keyCombos: [
      { skill: 'Persuasion', disc: 'Presence', desc: 'seducing virtuous mortals into dark desire' },
      { skill: 'Subterfuge', disc: 'Protean', desc: 'shifting into serpentine and venomous forms' },
      { skill: 'Streetwise', disc: 'Obfuscate', desc: 'brokering illicit temptations unnoticed' },
    ],
  },
  Ravnos: {
    title: 'Nomadic trickster weaving waking illusions',
    inClan: ['Animalism', 'Obfuscate', 'Presence'],
    coreAttrs: ['Wits', 'Manipulation', 'Dexterity', 'Charisma'],
    coreSkills: ['Subterfuge', 'Streetwise', 'Larceny', 'Animal Ken', 'Survival'],
    keyCombos: [
      { skill: 'Subterfuge', disc: 'Obfuscate', desc: 'spinning holographic phantoms and misdirection' },
      { skill: 'Survival', disc: 'Animalism', desc: 'scouting the road ahead through wild beasts' },
      { skill: 'Persuasion', disc: 'Presence', desc: 'captivating marks with roguish charm' },
    ],
  },
  Salubri: {
    title: 'Third eyed healer and hunted guardian',
    inClan: ['Auspex', 'Dominate', 'Fortitude'],
    coreAttrs: ['Composure', 'Resolve', 'Charisma', 'Stamina'],
    coreSkills: ['Insight', 'Medicine', 'Awareness', 'Etiquette'],
    keyCombos: [
      { skill: 'Insight', disc: 'Auspex', desc: 'uncovering spiritual wounds with the third eye' },
      { skill: 'Medicine', disc: 'Fortitude', desc: 'withstanding agony while mending others' },
    ],
  },
  Tzimisce: {
    title: 'Fleshcrafter and ancient territorial lord',
    inClan: ['Animalism', 'Dominate', 'Protean'],
    coreAttrs: ['Resolve', 'Strength', 'Intelligence', 'Stamina'],
    coreSkills: ['Craft', 'Intimidation', 'Animal Ken', 'Medicine'],
    keyCombos: [
      { skill: 'Craft', disc: 'Protean', desc: 'sculpting bone and flesh into war ghouls' },
      { skill: 'Intimidation', disc: 'Dominate', desc: 'enforcing sovereign rule across your domain' },
      { skill: 'Animal Ken', disc: 'Animalism', desc: 'commanding horrific biological monstrosities' },
    ],
  },
  Caitiff: {
    title: 'Clanless survivor forging their own path',
    inClan: ['Animalism', 'Celerity', 'Fortitude', 'Obfuscate', 'Potence', 'Presence'],
    coreAttrs: ['Stamina', 'Wits', 'Resolve', 'Strength'],
    coreSkills: ['Streetwise', 'Survival', 'Stealth', 'Brawl', 'Subterfuge'],
    keyCombos: [],
  },
  'Thin-blood': {
    title: 'Alchemist experimenting at the edge of life and undeath',
    inClan: ['Thin-blood Alchemy'],
    coreAttrs: ['Wits', 'Intelligence', 'Dexterity'],
    coreSkills: ['Craft', 'Science', 'Streetwise', 'Stealth', 'Survival'],
    keyCombos: [],
  },
};

/* =========================================================================
   Power Spikes & Amalgams (Rules.md Section 9)
   ========================================================================= */

export const POWER_SPIKES = {
  Protean: {
    1: { name: 'Eyes of the Beast', desc: 'see in total darkness with no Rouse check required' },
    2: { name: 'Feral Weapons', desc: 'sprout claws dealing unhalved superficial damage plus two extra damage' },
    3: { name: 'Earth Meld : Shapechange', desc: 'burrow into natural earth for daylight rest or shift into animal forms' },
    4: { name: 'Metamorphosis', desc: 'shift into predatory animal shapes' },
    5: { name: 'Mist Form', desc: 'dissolve into vapor to bypass walls and physical weapons' },
  },
  Fortitude: {
    1: { name: 'Resilience : Unswayable Mind', desc: 'add Fortitude to Health boxes and resist mental coercion' },
    2: { name: 'Toughness', desc: 'subtract Fortitude rating from all superficial damage before halving' },
    3: { name: 'Defy Prejudice', desc: 'ignore physical injury penalties and power through trauma' },
    4: { name: 'Draught of Endurance', desc: 'share supernatural resilience with allies or retainers' },
    5: { name: 'Flesh of Marble', desc: 'ignore the first source of physical damage each turn completely' },
  },
  Animalism: {
    1: { name: 'Bond Famulus : Sense the Beast', desc: 'forge an animal bond and detect nearby kindred or hostility' },
    2: { name: 'Feral Whispers', desc: 'speak with animals and summon creatures to do your bidding' },
    3: { name: 'Animal Succulence : Quell the Beast', desc: 'slake extra hunger from animals and pacify frenzy or terror' },
    4: { name: 'Subsume the Spirit', desc: 'project your consciousness directly into an animal body' },
    5: { name: 'Animal Dominion', desc: 'command massive swarms and legions of wildlife' },
  },
  Potence: {
    1: { name: 'Lethal Body : Soaring Leap', desc: 'convert unarmed superficial damage to aggravated against mortals' },
    2: { name: 'Prowess', desc: 'add Potence rating directly to all unarmed and melee damage' },
    3: { name: 'Brutal Feed', desc: 'drain victims rapidly in combat turns' },
    4: { name: 'Draught of Might', desc: 'grant supernatural strength to retainers' },
    5: { name: 'Fist of Caine', desc: 'deliver devastating aggravated blows that crush kindred bones' },
  },
  Celerity: {
    1: { name: 'Cats Grace : Rapid Reflexes', desc: 'perfect balance and evasion against ranged attacks' },
    2: { name: 'Fleetness', desc: 'add Celerity rating to defense pools and chase maneuvers' },
    3: { name: 'Blink : Traversal', desc: 'teleport like bursts of speed across open ground or vertical surfaces' },
    4: { name: 'Draught of Elegance', desc: 'endow ghouls and allies with supernatural speed' },
    5: { name: 'Split Second', desc: 'react instantaneously to unexpected threats before anyone else moves' },
  },
  Auspex: {
    1: { name: 'Heightened Senses : Sense the Unseen', desc: 'peer through illusions and multiply sensory perception' },
    2: { name: 'Premonition', desc: 'receive glimpses of danger and sudden insight before disaster strikes' },
    3: { name: 'Scry the Soul : Share the Senses', desc: 'read emotional auras and borrow sensory perspectives' },
    4: { name: 'Spirits Touch', desc: 'read psychic memories left behind on physical objects' },
    5: { name: 'Telepathy : Clairvoyance', desc: 'project senses anywhere or converse mind to mind' },
  },
  Obfuscate: {
    1: { name: 'Silence of Death : Cloak of Shadows', desc: 'muffle sounds and vanish while standing still in dim light' },
    2: { name: 'Unseen Passage', desc: 'move silently and invisibly through populated areas' },
    3: { name: 'Mask of 1000 Faces : Ghost in Machine', desc: 'vanish from digital surveillance and alter perceived face' },
    4: { name: 'Conceal', desc: 'hide an entire vehicle or large object from mortal sight' },
    5: { name: 'Cloak the Gathering', desc: 'extend complete invisibility to your entire coterie' },
  },
  Presence: {
    1: { name: 'Awe : Daunt', desc: 'captivate crowds or project an aura of terrifying intimidation' },
    2: { name: 'Lingering Kiss', desc: 'inflict intense narcotic ecstasy on feeding vessels' },
    3: { name: 'Dread Gaze : Entrancement', desc: 'paralyze rivals with terror or bind them in devotion' },
    4: { name: 'Summon', desc: 'call anyone whose blood you have tasted from across the city' },
    5: { name: 'Majesty', desc: 'become so awe inspiring that none can speak against you without willpower' },
  },
  Dominate: {
    1: { name: 'Compel : Cloud Memory', desc: 'issue single word commands and erase recent memories' },
    2: { name: 'Mesmerize : Dementation', desc: 'embed complex hypnotic instructions and incite manic paranoia' },
    3: { name: 'The Forgetful Mind', desc: 'rewrite deep memories and reconstruct personal histories' },
    4: { name: 'Submerged Directive', desc: 'plant subconscious triggers that activate days or weeks later' },
    5: { name: 'Terminal Decree : Mass Manipulation', desc: 'issue commands to crowds or force victims to yield' },
  },
  'Blood Sorcery': {
    1: { name: 'Corrosive Vitae : Taste for Blood', desc: 'melt steel with blood and analyze vitae composition' },
    2: { name: 'Extinguish Vitae : Level 2 Rituals', desc: 'starve rival kindred vitae and unlock potent rituals' },
    3: { name: 'Blood of Potency : Scorpion Touch', desc: 'temporarily elevate Blood Potency and create lethal venom' },
    4: { name: 'Theft of Vitae', desc: 'suck blood directly through the air from victims into your maw' },
    5: { name: 'Cauldron of Blood', desc: 'boil a victim from the inside out with a single touch' },
  },
  Oblivion: {
    1: { name: 'Shadow Cloak : Oblivion Sight', desc: 'wrap in shadows and perceive the underworld' },
    2: { name: 'Arms of Ahriman : Shadow Cast', desc: 'summon suffocating shadow tentacles to crush foes' },
    3: { name: 'Shadow Perspective : Touch of Oblivion', desc: 'see through distant shadows and rot living flesh on contact' },
    4: { name: 'Stygian Shroud', desc: 'plunge an entire room into freezing abyssal darkness' },
    5: { name: 'Shadow Step : Tenebrous Avatar', desc: 'step through shadows across distance or become living void' },
  },
};

// Amalgam unlocks from Rules.md Section 9
export const AMALGAM_UNLOCKS = [
  {
    targetDiscipline: 'Animalism',
    targetLevel: 2,
    secondaryDiscipline: 'Fortitude',
    secondaryMin: 1,
    name: 'Leash the Beast',
    desc: 'channel Fortitude to protect against the Beast and suppress frenzy',
  },
  {
    targetDiscipline: 'Animalism',
    targetLevel: 2,
    secondaryDiscipline: 'Auspex',
    secondaryMin: 1,
    name: 'Animal Messenger',
    desc: 'send long distance scouting missions through your famulus',
  },
  {
    targetDiscipline: 'Fortitude',
    targetLevel: 2,
    secondaryDiscipline: 'Animalism',
    secondaryMin: 1,
    name: 'Enduring Beasts',
    desc: 'share your supernatural Fortitude toughness with your famulus',
  },
  {
    targetDiscipline: 'Fortitude',
    targetLevel: 2,
    secondaryDiscipline: 'Potence',
    secondaryMin: 2,
    name: 'Obdurate',
    desc: 'withstand massive kinetic impacts and keep your footing',
  },
  {
    targetDiscipline: 'Protean',
    targetLevel: 2,
    secondaryDiscipline: 'Fortitude',
    secondaryMin: 1,
    name: 'The False Sip',
    desc: 'safely hold hostile vitae in your mouth without ingesting it',
  },
  {
    targetDiscipline: 'Protean',
    targetLevel: 2,
    secondaryDiscipline: 'Dominate',
    secondaryMin: 2,
    name: 'Vicissitude',
    desc: 'sculpt your own flesh and bone into custom biological forms',
  },
  {
    targetDiscipline: 'Animalism',
    targetLevel: 3,
    secondaryDiscipline: 'Obfuscate',
    secondaryMin: 2,
    name: 'Unliving Hive',
    desc: 'house a living swarm inside your physical body',
  },
];

/* =========================================================================
   Discipline Governing Attributes & Dice Pools (Rules.md Section 1 & 9)
   Maps each discipline to its primary and secondary activation/power stats
   ========================================================================= */

export const DISCIPLINE_GOVERNING_ATTRS = {
  Oblivion: {
    primary: 'Wits',
    secondary: 'Resolve',
    primaryPool: 'Wits + Oblivion',
    secondaryPool: 'Resolve + Oblivion',
    primaryRole: 'shadow manipulation, Arms of Ahriman tentacles, and dark perception',
    secondaryRole: 'Oblivion ceremonies and necromantic spirit rituals',
  },
  Celerity: {
    primary: 'Dexterity',
    secondary: 'Wits',
    primaryPool: 'Dexterity + Celerity',
    secondaryPool: 'Wits + Celerity',
    primaryRole: 'supernatural evasion, lightning strikes, and Fleetness dice boosts',
    secondaryRole: 'split second reaction speed and ambush avoidance',
  },
  Potence: {
    primary: 'Strength',
    secondary: 'Stamina',
    primaryPool: 'Strength + Potence',
    secondaryPool: 'Stamina + Potence',
    primaryRole: 'crushing melee damage, Prowess feats of might, and lethal unarmed strikes',
    secondaryRole: 'unrelenting physical impact and shockwaves',
  },
  Fortitude: {
    primary: 'Stamina',
    secondary: 'Resolve',
    primaryPool: 'Stamina + Fortitude',
    secondaryPool: 'Resolve + Fortitude',
    primaryRole: 'supernatural damage soaking, Resilience health expansion, and physical defense',
    secondaryRole: 'Unswayable Mind mental shielding against Dominate and Presence',
  },
  Obfuscate: {
    primary: 'Wits',
    secondary: 'Manipulation',
    primaryPool: 'Wits + Obfuscate',
    secondaryPool: 'Manipulation + Obfuscate',
    primaryRole: 'Unseen Passage stealth, vanishing from view, and Cloak the Gathering',
    secondaryRole: 'Mask of a Thousand Faces illusions and social deception',
  },
  Auspex: {
    primary: 'Resolve',
    secondary: 'Wits',
    primaryPool: 'Resolve + Auspex',
    secondaryPool: 'Wits + Auspex',
    primaryRole: 'Premonition clairvoyance, aura scrying, and psychic scrutiny',
    secondaryRole: 'Heightened Senses perception and telepathic mind reading',
  },
  Dominate: {
    primary: 'Manipulation',
    secondary: 'Charisma',
    primaryPool: 'Manipulation + Dominate',
    secondaryPool: 'Charisma + Dominate',
    primaryRole: 'Compel hypnosis, Mesmerize obedience, and memory manipulation',
    secondaryRole: 'unquestioned authority and commanding forceful edicts',
  },
  Presence: {
    primary: 'Charisma',
    secondary: 'Manipulation',
    primaryPool: 'Charisma + Presence',
    secondaryPool: 'Manipulation + Presence',
    primaryRole: 'Awe allure, Entrancement, and commanding Majesty in social scenes',
    secondaryRole: 'Dread Gaze terror strikes and summoning distant subjects',
  },
  Animalism: {
    primary: 'Charisma',
    secondary: 'Resolve',
    primaryPool: 'Charisma + Animalism',
    secondaryPool: 'Resolve + Animalism',
    primaryRole: 'Feral Whispers communication, animal summoning, and Quell the Beast',
    secondaryRole: 'Sense the Beast hostility detection and Subsume the Spirit possession',
  },
  'Blood Sorcery': {
    primary: 'Intelligence',
    secondary: 'Resolve',
    primaryPool: 'Intelligence + Blood Sorcery',
    secondaryPool: 'Resolve + Blood Sorcery',
    primaryRole: 'thaumaturgical ritual casting, corrosive vitae, and occult formula mastery',
    secondaryRole: 'Taste for Blood analysis and biological venom potency',
  },
  Protean: {
    primary: 'Strength',
    secondary: 'Resolve',
    primaryPool: 'Strength + Protean',
    secondaryPool: 'Resolve + Protean',
    primaryRole: 'Feral Weapons claws, beast shape transformation, and predatory combat',
    secondaryRole: 'Earth Meld refuge and maintaining bodily form under duress',
  },
  'Thin-blood Alchemy': {
    primary: 'Intelligence',
    secondary: 'Resolve',
    primaryPool: 'Intelligence + Alchemy',
    secondaryPool: 'Resolve + Alchemy',
    primaryRole: 'calcinatio and fixatio distillation laboratory brewing formulas',
    secondaryRole: 'athanor corporis bodily distillation and distillation stamina',
  },
};

/* =========================================================================
   Thematic Specialties Catalog
   ========================================================================= */

export const THEMATIC_SPECIALTIES = {
  Brawl: ['Grappling', 'Feral Claws', 'Biting', 'Kindred Combat', 'Dirty Fighting'],
  Survival: ['Wilderness', 'Tracking', 'Hunting', 'Shelter', 'Extreme Weather'],
  'Animal Ken': ['Canines and Wolves', 'Predators', 'Training', 'Birds of Prey'],
  Stealth: ['Urban Prowling', 'Shadows', 'Ambushes', 'Silent Stalking'],
  Athletics: ['Dodging', 'Running', 'Climbing', 'Acrobatics'],
  Awareness: ['Ambush Detection', 'Scent', 'Night Vision', 'Hearing'],
  Intimidation: ['Physical Menace', 'Animalistic Snarl', 'Interrogation', 'Staredown'],
  Persuasion: ['Negotiation', 'Fast talk', 'Bargaining', 'Appeals to Reason'],
  Streetwise: ['Black Market', 'Rumors', 'Criminal Underworld', 'Territory'],
  Subterfuge: ['Innocence', 'Lies of Omission', 'Feigned Weakness', 'Misdirection'],
  Occult: ['Kindred Lore', 'Blood Sorcery', 'Spirits', 'Lupines and Werewolves'],
  Melee: ['Knives', 'Clubs', 'Improvised Weapons', 'Disarming'],
  Firearms: ['Pistols', 'Sniper Rifles', 'Shotguns', 'Trick Shots'],
  Investigation: ['Crime Scenes', 'Deduction', 'Document Search', 'Surveillance'],
  Academics: ['History', 'Linguistics', 'Philosophy', 'Law'],
  Craft: ['Leatherworking', 'Woodworking', 'Tattoos', 'Weapon Maintenance'],
  Drive: ['Evasion', 'Pursuit', 'Motorcycles', 'Off road'],
  Etiquette: ['Elysium', 'High Society', 'Anarch Street', 'Corporate'],
  Finance: ['Money Laundering', 'Appraisal', 'Stock Market', 'Forensic Accounting'],
  Leadership: ['Combat Command', 'Inspiration', 'Pack Tactics', 'Management'],
  Medicine: ['Trauma Surgery', 'First Aid', 'Forensics', 'Pharmacology'],
  Performance: ['Singing', 'Oration', 'Acting', 'Storytelling'],
  Politics: ['Camarilla Court', 'City Council', 'Anarch Movement', 'Power Dynamics'],
  Science: ['Biology', 'Chemistry', 'Physics', 'Toxicology'],
  Technology: ['Hacking', 'Surveillance Systems', 'Data Forensics', 'Counter intelligence'],
};

/* =========================================================================
   Helper Readers
   ========================================================================= */

function attrValue(sheet, name) {
  const n = Number(sheet?.attributes?.[name]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function readSkill(sheet, name) {
  const raw = sheet?.skills?.[name];
  if (raw && typeof raw === 'object') {
    return {
      dots: Number(raw.dots || 0),
      specialties: Array.isArray(raw.specialties) ? raw.specialties.filter(Boolean) : [],
    };
  }
  return { dots: Number(raw || 0), specialties: [] };
}

export function article(word) {
  return /^[aeiou]/i.test(String(word || '')) ? 'an' : 'a';
}

function joinReasons(list) {
  const parts = list.filter(Boolean).slice(0, 2);
  if (!parts.length) return '';
  const text = parts.join('; ');
  return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

/* =========================================================================
   Predator Profile & Hunting Pool Diagnostic (Rules.md Section 1, 2, 14)
   ========================================================================= */

export function predatorProfile(sheet, clan) {
  const name = sheet?.predator_type || sheet?.predatorType || '';
  const profile = {
    name,
    attrs: new Set(),
    skills: new Set(),
    huntingAttrs: new Set(),
    huntingSkills: new Set(),
    specialtySkills: new Set(),
    disciplines: new Set(),
    pools: [],
    poolDiagnostics: [],
  };
  const type = PREDATOR_TYPES?.[name];
  if (!type) return profile;

  if (Array.isArray(type.huntingPools) && type.huntingPools.length > 0) {
    type.huntingPools.forEach(hp => {
      if (hp.pool) profile.pools.push(hp.pool);
      (hp.attributes || []).forEach(a => {
        if (ALL_ATTRS.includes(a)) {
          profile.huntingAttrs.add(a);
          profile.attrs.add(a);
        }
      });
      (hp.skills || []).forEach(s => {
        if (ALL_SKILLS.includes(s)) {
          profile.huntingSkills.add(s);
          profile.skills.add(s);
        }
      });
    });
  } else if (Array.isArray(type.huntingAttributes) || Array.isArray(type.huntingSkills)) {
    (type.huntingAttributes || []).forEach(a => {
      if (ALL_ATTRS.includes(a)) {
        profile.huntingAttrs.add(a);
        profile.attrs.add(a);
      }
    });
    (type.huntingSkills || []).forEach(s => {
      if (ALL_SKILLS.includes(s)) {
        profile.huntingSkills.add(s);
        profile.skills.add(s);
      }
    });
    if (type.rolls && type.rolls !== 'None') profile.pools.push(type.rolls);
  }

  (type.picks?.specialty || []).forEach(entry => {
    const base = String(entry).split('(')[0].trim();
    if (ALL_SKILLS.includes(base)) {
      profile.specialtySkills.add(base);
    }
  });

  try {
    const picks = type.picks?.discipline;
    const list = typeof picks === 'function' ? picks(clan) : (picks || []);
    (list || []).forEach(d => profile.disciplines.add(d));
  } catch {
    // Ignore odd clans
  }

  // Calculate hunting pool dice size, Bestial Failure risks, and bottlenecks
  profile.pools.forEach(poolStr => {
    const parts = poolStr.split('+').map(s => s.trim()).filter(Boolean);
    const poolAttrs = parts.filter(p => ALL_ATTRS.includes(p));
    const poolSkills = parts.filter(p => ALL_SKILLS.includes(p));
    if (poolAttrs.length && poolSkills.length) {
      const a = poolAttrs[0];
      const s = poolSkills[0];
      const aVal = attrValue(sheet, a);
      const sNode = readSkill(sheet, s);
      const sVal = sNode.dots;
      const totalDice = aVal + sVal + (sNode.specialties.length > 0 ? 1 : 0);
      profile.poolDiagnostics.push({
        pool: poolStr,
        attr: a,
        attrVal: aVal,
        skill: s,
        skillVal: sVal,
        totalDice,
        isVulnerable: totalDice <= 4,
        isReliable: totalDice >= 6,
        bottleneck: aVal < sVal ? a : (sVal < aVal ? s : (aVal < 3 ? a : s)),
      });
    }
  });

  return profile;
}

/* =========================================================================
   Main Suggestion Builder Engine
   ========================================================================= */

/**
 * @param {object}   args
 * @param {object}   args.ch              character record (with clan, name, xp)
 * @param {object}   args.sheet           structured sheet data
 * @param {number}   args.xp              current XP balance
 * @param {object}   args.costs           the XP_RULES cost table
 * @param {function} args.disciplineKind  name => 'clan' | 'other' | 'caitiff'
 * @param {object}   [args.discAccess]    Storyteller granted discipline access map
 * @param {number}   [args.limit]         how many affordable picks to return
 */
export function buildSuggestions({ ch, sheet, xp = 0, costs, disciplineKind, discAccess = {}, limit = 6 }) {
  const empty = { affordable: [], aspirational: [], profile: null };
  if (!ch || !sheet || !costs) return empty;

  const clan = ch.clan || 'Caitiff';
  const clanArchetype = CLAN_ARCHETYPES[clan] || CLAN_ARCHETYPES.Caitiff;
  const clanBaneInfo = CLAN_BANES_AND_COMPULSIONS[clan] || null;
  const profile = predatorProfile(sheet, clan);
  const out = [];

  const add = (s) => {
    if (!s || !Number.isFinite(s.cost) || s.cost <= 0) return;
    const efficiency = Math.max(0, 25 - s.cost);
    out.push({
      ...s,
      score: s.need + efficiency,
      affordable: xp >= s.cost,
    });
  };

  const comp = attrValue(sheet, 'Composure');
  const reso = attrValue(sheet, 'Resolve');
  const willpower = comp + reso;
  const stamina = attrValue(sheet, 'Stamina');
  const fortitudeDots = Number(sheet?.disciplines?.Fortitude || 0);
  const effectiveHealth = 3 + stamina + fortitudeDots;

  /* -----------------------------------------------------------------------
     1. Attributes Engine (Rules.md Section 1, 3, 4, 6, 8, 14)
     ----------------------------------------------------------------------- */
  for (const [group, names] of Object.entries(ATTR_GROUPS)) {
    const groupTop = Math.max(...names.map(n => attrValue(sheet, n)));
    for (const attr of names) {
      const current = attrValue(sheet, attr);
      if (current >= MAX_TRAIT) continue;
      const next = current + 1;
      const why = [];
      let need = 18;
      let synergyTag = null;

      // Hunting pool diagnostic (Rules.md Section 2 & 14)
      const huntingDiag = profile.poolDiagnostics.find(d => d.attr === attr);
      if (huntingDiag) {
        if (huntingDiag.isVulnerable) {
          need += 38;
          synergyTag = 'Hunting Pool';
          why.push(`your ${profile.name} feeding pool has only ${huntingDiag.totalDice} dice : hunger dice cannot be rerolled with Willpower, risking frequent Bestial Failures on hunts`);
        } else if (current < 4) {
          need += 26;
          if (!synergyTag) synergyTag = 'Hunting Pool';
          why.push(`powers your nightly ${profile.name} feeding pool (${huntingDiag.pool})`);
        }
      }

      // Health track & Physical Impairment avoidance (Rules.md Section 3)
      if (attr === 'Stamina') {
        const nextHealth = next + 3 + fortitudeDots;
        if (effectiveHealth <= 5) {
          need += 32;
          synergyTag = 'Defense Patch';
          why.push(`your Health track is fragile at ${effectiveHealth} boxes : raising Stamina increases Health to ${nextHealth} boxes (Stamina + 3), delaying physical impairment (minus 2 penalty to all physical pools)`);
        } else if (current < 3) {
          need += 20;
          why.push(`raises your Health track to ${nextHealth} boxes (Stamina + 3), providing more cushion before taking aggravated damage`);
        }
      }

      // Willpower tracker & Session recovery formula (Rules.md Section 4 & 6)
      if (attr === 'Composure' || attr === 'Resolve') {
        const otherVal = attr === 'Composure' ? reso : comp;
        const nextRecovery = Math.max(next, otherVal);
        const nextWp = willpower + 1;

        if (willpower < 5) {
          need += 30;
          synergyTag = 'Defense Patch';
          why.push(`your Willpower tracker is dangerously low at ${willpower} : raising this increases session start recovery to ${nextRecovery} and adds another box to resist Frenzy, reroll dice, and prevent mental impairment (minus 2)`);
        } else {
          need += 18;
          why.push(`lifts Willpower tracker to ${nextWp} and session start recovery to ${nextRecovery}, granting more fuel for three die rerolls and frenzy resistance`);
        }
      }

      // Clan bane & compulsion mitigation (Rules.md Section 8 & 14)
      if (clanBaneInfo && clanBaneInfo.remedyAttrs.includes(attr)) {
        need += 18;
        if (!synergyTag) synergyTag = 'Clan Defense';
        why.push(clanBaneInfo.remedyReason);
      }

      // Clan archetype core attribute
      if (clanArchetype.coreAttrs.includes(attr)) {
        need += 16;
        if (!synergyTag) synergyTag = 'Clan Synergy';
        why.push(`anchors your core ${clan} archetype`);
      }

      // Governing Discipline pool expansion (Rules.md Section 1 & 9)
      const governedDiscs = Object.entries(DISCIPLINE_GOVERNING_ATTRS).filter(
        ([dName, gov]) => (gov.primary === attr || gov.secondary === attr) && Number(sheet?.disciplines?.[dName] || 0) >= 1
      );
      if (governedDiscs.length > 0) {
        const primDiscs = governedDiscs.filter(([, gov]) => gov.primary === attr);
        const secDiscs = governedDiscs.filter(([, gov]) => gov.secondary === attr);

        if (primDiscs.length > 0) {
          need += 22;
          if (!synergyTag) synergyTag = 'Discipline Synergy';
          const [dName, gov] = primDiscs[0];
          const discDots = Number(sheet?.disciplines?.[dName] || 0);
          why.push(`expands your ${gov.primaryPool} dice pool (${current + discDots} to ${next + discDots} dice) for ${gov.primaryRole}`);
        } else if (secDiscs.length > 0) {
          need += 14;
          if (!synergyTag) synergyTag = 'Discipline Synergy';
          const [dName, gov] = secDiscs[0];
          const discDots = Number(sheet?.disciplines?.[dName] || 0);
          why.push(`fuels your secondary ${gov.secondaryPool} dice pool (${current + discDots} to ${next + discDots} dice) for ${gov.secondaryRole}`);
        }
      }

      // Severe deficiency: 1 dot vulnerability
      if (current === 1) {
        need += 22;
        why.push('at one dot you are rolling blind whenever this comes up');
      }

      // Cap off highest attribute in group
      if (current === 4 && current === groupTop) {
        need += 14;
        if (!synergyTag) synergyTag = 'Apex Value';
        why.push(`caps off your strongest ${group} attribute at maximum rating`);
      }

      add({
        kind: 'attribute',
        id: `attribute:${attr}`,
        target: attr,
        title: `${attr} (${current})`,
        subtitle: `Raise to ${next}`,
        current,
        next,
        cost: costs.attribute(next),
        need: Math.min(need, 100),
        synergyTag: synergyTag || 'Attribute',
        reason: joinReasons(why) || `A solid general improvement for ${group.toLowerCase()} dice pools`,
      });
    }
  }

  /* -----------------------------------------------------------------------
     2. Skills Engine (Rules.md Section 1, 2, 8)
     ----------------------------------------------------------------------- */
  for (const [group, names] of Object.entries(SKILL_GROUPS)) {
    const companionAttrs = ATTR_GROUPS[group];
    const topCompanionAttr = Math.max(...companionAttrs.map(n => attrValue(sheet, n)));

    for (const skill of names) {
      const { dots, specialties } = readSkill(sheet, skill);
      if (dots >= MAX_TRAIT) continue;
      const next = dots + 1;
      const why = [];
      let need = 12;
      let synergyTag = null;

      // Hunting pool diagnostic (Rules.md Section 1 & 2)
      const huntingDiag = profile.poolDiagnostics.find(d => d.skill === skill);
      if (huntingDiag) {
        if (huntingDiag.isVulnerable) {
          need += 38;
          synergyTag = 'Hunting Pool';
          why.push(`your ${profile.name} hunting pool is unstable at ${huntingDiag.totalDice} dice : hunger dice cannot be rerolled, risking Bestial Failures during feeding`);
        } else {
          need += 26;
          if (!synergyTag) synergyTag = 'Hunting Pool';
          why.push(`${article(profile.name)} ${profile.name} relies on ${skill} to feed safely and avoid complications`);
        }
      } else if (profile.specialtySkills.has(skill)) {
        need += 16;
        if (!synergyTag) synergyTag = 'Hunting Style';
        why.push(`fits your ${profile.name} predator archetype`);
      }

      // Clan archetype core skill
      if (clanArchetype.coreSkills.includes(skill)) {
        need += 18;
        if (!synergyTag) synergyTag = 'Clan Synergy';
        why.push(`a signature discipline and skill pillar for ${clan}`);
      }

      // Check specific clan key combos
      const combo = (clanArchetype.keyCombos || []).find(k => k.skill === skill);
      if (combo) {
        const discLevel = Number(sheet?.disciplines?.[combo.disc] || 0);
        if (discLevel > 0) {
          need += 22;
          synergyTag = 'Clan Synergy';
          why.push(`multiplies your ${combo.disc} ${discLevel} for ${combo.desc}`);
        }
      }

      // High companion attribute synergy (Rules.md Section 1: large pools leave more regular dice for Willpower rerolls)
      if (topCompanionAttr >= 4 && dots <= 2) {
        need += 18;
        if (!synergyTag) synergyTag = 'Dice Pool Synergy';
        why.push(`backed by high ${group} attributes for an immediate large dice pool that maximizes Willpower reroll efficiency`);
      }

      // Critical cornerstone hole
      if (dots === 0 && CORNERSTONE_SKILLS.has(skill)) {
        need += 20;
        why.push('you have zero dots and this roll comes up constantly in scenes');
      }

      // Already specialized: deepening an existing strength
      if (dots >= 3 && specialties.length > 0) {
        need += 14;
        why.push(`deepens your specialized strength in ${specialties[0]}`);
      }

      add({
        kind: 'skill',
        id: `skill:${skill}`,
        target: skill,
        title: `${skill} (${dots})`,
        subtitle: `Raise to ${next}`,
        current: dots,
        next,
        cost: costs.skill(next),
        need: Math.min(need, 100),
        synergyTag: synergyTag || 'Skill',
        reason: joinReasons(why) || 'Widens everyday dice pools for affordable experience',
      });
    }
  }

  /* -----------------------------------------------------------------------
     3. Thematic Specialties Engine (Rules.md Section 1: +1 bonus die)
     ----------------------------------------------------------------------- */
  for (const skill of ALL_SKILLS) {
    const { dots, specialties } = readSkill(sheet, skill);
    if (dots < 1) continue;

    const allIdeas = THEMATIC_SPECIALTIES[skill] || ['General Practice', 'Technique', 'Field Work'];
    const unownedIdeas = allIdeas.filter(idea => !specialties.some(s => s.toLowerCase() === idea.toLowerCase()));
    if (!unownedIdeas.length) continue;

    const why = [];
    let need = 20;
    let synergyTag = null;
    let recommended = unownedIdeas[0];

    // Predator hunting alignment
    if (profile.huntingSkills.has(skill)) {
      need += 30;
      synergyTag = 'Hunting Pool';
      why.push(`sharpens your ${profile.name} feeding pool with a permanent bonus die on hunts`);
      const matchingPicks = (PREDATOR_TYPES[profile.name]?.picks?.specialty || [])
        .filter(entry => entry.startsWith(skill))
        .map(entry => entry.replace(/^[^(]+\(([^)]+)\).*$/, '$1').trim());
      if (matchingPicks.length && unownedIdeas.includes(matchingPicks[0])) {
        recommended = matchingPicks[0];
      }
    } else if (profile.specialtySkills.has(skill)) {
      need += 18;
      synergyTag = 'Hunting Style';
      why.push(`fits your ${profile.name} hunting style`);
    }

    // Clan archetype alignment
    if (clanArchetype.coreSkills.includes(skill)) {
      need += 16;
      if (!synergyTag) synergyTag = 'Clan Synergy';
      why.push(`ideal focus for an active ${clan} survivor`);
      if (clan === 'Gangrel' && skill === 'Brawl' && unownedIdeas.includes('Feral Claws')) {
        recommended = 'Feral Claws';
      } else if (clan === 'Gangrel' && skill === 'Survival' && unownedIdeas.includes('Wilderness')) {
        recommended = 'Wilderness';
      }
    }

    // High skill rating without enough specialties
    if (dots >= 3 && specialties.length === 0) {
      need += 22;
      why.push(`${skill} ${dots} is one of your primary assets and has no specialty yet`);
    } else if (dots >= 4 && specialties.length <= 1) {
      need += 14;
      why.push('adds a reliable extra die on the situations you encounter most');
    }

    why.push('flat three experience grants a permanent bonus die on specialized rolls (Rules.md Section 1)');

    add({
      kind: 'specialty',
      id: `specialty:${skill}`,
      target: skill,
      title: `${skill} Specialty`,
      subtitle: `Add specialty : e.g. ${recommended}`,
      current: dots,
      next: dots,
      cost: costs.specialty(),
      need: Math.min(need, 100),
      synergyTag: synergyTag || 'Specialty',
      recommendedSpecialty: recommended,
      specialtyIdeas: unownedIdeas.slice(0, 4),
      reason: joinReasons(why),
    });
  }

  /* -----------------------------------------------------------------------
     4. Disciplines Engine (Rules.md Section 2, 3, 9)
     ----------------------------------------------------------------------- */
  const knownDiscDots = ALL_DISCIPLINE_NAMES
    .map(n => Number(sheet?.disciplines?.[n] || 0))
    .filter(n => n > 0);
  const topDisc = knownDiscDots.length ? Math.max(...knownDiscDots) : 0;

  for (const name of ALL_DISCIPLINE_NAMES) {
    const current = Number(sheet?.disciplines?.[name] || 0);
    if (current >= MAX_TRAIT) continue;
    const next = current + 1;
    const kind = typeof disciplineKind === 'function' ? disciplineKind(name) : 'other';

    const isPredatorDisc = profile.disciplines.has(name) && current >= 1;
    const grantMax = Number(discAccess?.[name]?.max_level || 0);
    const hasGrant = grantMax >= next;
    const hasExistingDots = current >= 1;

    if (kind === 'other' && !isPredatorDisc && !hasGrant && !hasExistingDots) {
      continue;
    }

    const cost = kind === 'caitiff'
      ? costs.disciplineCaitiff(next)
      : (kind === 'clan' ? costs.disciplineClan(next) : costs.disciplineOther(next));

    const why = [];
    let need = 26;
    let synergyTag = null;
    const unlockedPowers = [];

    // Check canonical power spikes
    const spike = POWER_SPIKES[name]?.[next];
    if (spike) {
      need += 26;
      synergyTag = 'Power Spike';
      unlockedPowers.push(spike.name);
      why.push(`unlocks ${spike.name} to ${spike.desc}`);
    }

    // Check amalgams (Rules.md Section 9)
    AMALGAM_UNLOCKS.forEach(am => {
      if (am.targetDiscipline === name && am.targetLevel === next) {
        const secondaryDots = Number(sheet?.disciplines?.[am.secondaryDiscipline] || 0);
        if (secondaryDots >= am.secondaryMin) {
          need += 28;
          synergyTag = 'Amalgam';
          unlockedPowers.push(am.name);
          why.push(`unlocks amalgam power ${am.name} via your ${am.secondaryDiscipline} ${secondaryDots}`);
        }
      }
    });

    // Clan identity alignment
    if (clanArchetype.inClan.includes(name)) {
      need += 18;
      if (!synergyTag) synergyTag = 'Clan Synergy';
      why.push(`an inherited in clan power pillar for ${clan}`);
    }

    // Governing Attribute synergy (Rules.md Section 1 & 9)
    const gov = DISCIPLINE_GOVERNING_ATTRS[name];
    if (gov) {
      const primVal = attrValue(sheet, gov.primary);
      const secVal = attrValue(sheet, gov.secondary);

      if (primVal >= 4) {
        need += 24;
        if (!synergyTag) synergyTag = 'Stat Synergy';
        why.push(`backed by your exceptional ${gov.primary} (${primVal}) for a commanding ${gov.primaryPool} pool (${primVal + next} dice) for ${gov.primaryRole}`);
      } else if (primVal === 3) {
        need += 18;
        if (!synergyTag) synergyTag = 'Stat Synergy';
        why.push(`synergizes with your strong ${gov.primary} (${primVal}) to form an immediate ${gov.primaryPool} pool (${primVal + next} dice) for ${gov.primaryRole}`);
      }

      if (secVal >= 4) {
        need += 12;
        why.push(`supported by high ${gov.secondary} (${secVal}) for ${gov.secondaryRole} (${gov.secondaryPool})`);
      } else if (secVal === 3 && primVal < 3) {
        need += 10;
        if (!synergyTag) synergyTag = 'Stat Synergy';
        why.push(`supported by your ${gov.secondary} (${secVal}) for ${gov.secondaryRole} (${gov.secondaryPool})`);
      }
    }

    // Predator alignment
    if (profile.disciplines.has(name)) {
      need += 16;
      if (!synergyTag) synergyTag = 'Hunting Style';
      why.push(`directly enhances your ${profile.name} hunting method`);
    }

    // Depth vs breadth
    if (current > 0 && current === topDisc) {
      need += 16;
      why.push('deepens your highest discipline where top tier powers reside');
    } else if (current === 0) {
      need += 12;
      why.push(kind === 'caitiff'
        ? 'initiates a versatile new discipline'
        : 'unlocks your third in clan discipline');
    }

    // Blood Sorcery & Oblivion unlock rituals/ceremonies
    if ((name === 'Blood Sorcery' || name === 'Oblivion') && current >= 1) {
      need += 12;
      why.push(`unlocks level ${next} ${name === 'Oblivion' ? 'ceremonies' : 'rituals'}`);
    }

    // Fortitude and fragile health (Rules.md Section 3)
    if (name === 'Fortitude' && effectiveHealth <= 5) {
      need += 20;
      synergyTag = 'Defense Patch';
      why.push('supplies critical health boxes and damage reduction against physical impairment');
    }

    add({
      kind: 'discipline',
      id: `discipline:${name}`,
      target: name,
      disciplineKind: kind,
      title: current > 0 ? `${name} (${current})` : name,
      subtitle: current > 0 ? `Raise to ${next} : ${kind}` : `Buy : ${kind}`,
      current,
      next,
      cost,
      need: Math.min(need, 100),
      synergyTag: synergyTag || (kind === 'clan' ? 'In Clan' : 'Discipline'),
      unlockedPowers,
      reason: joinReasons(why) || 'Expands your vampiric supernatural arsenal',
    });
  }

  /* -----------------------------------------------------------------------
     5. Blood Potency Engine (Rules.md Section 15 Blood Potency Table)
     ----------------------------------------------------------------------- */
  const bp = Number(sheet?.blood_potency ?? 1);
  if (bp < MAX_BLOOD_POTENCY) {
    const next = bp + 1;
    const cost = costs.bloodPotency(next);
    const why = [];
    let need = 10;
    let synergyTag = null;

    const curStats = BLOOD_POTENCY_TABLE[bp] || BLOOD_POTENCY_TABLE[1];
    const nextStats = BLOOD_POTENCY_TABLE[next] || BLOOD_POTENCY_TABLE[Math.min(next, 10)];

    const gains = [];
    if (nextStats.bonus > curStats.bonus) {
      gains.push(`unlocks +${nextStats.bonus} bonus die to all Discipline rolls`);
    }
    if (nextStats.mend > curStats.mend) {
      gains.push(`mends ${nextStats.mend} superficial damage per Rouse check`);
    }
    if (nextStats.surge > curStats.surge) {
      gains.push(`Blood Surge increases to +${nextStats.surge} bonus dice`);
    }

    if (gains.length > 0) {
      need += 24;
      synergyTag = 'Power Spike';
      why.push(gains.join(', ') + ' (Rules.md BP table)');
    }

    if (xp >= cost) {
      need += 18;
      if (!synergyTag) synergyTag = 'Apex Value';
      why.push('you have sufficient experience to unlock sweeping supernatural potency across your blood');
    }
    if (bp <= 1) {
      need += 14;
      why.push('at low Blood Potency your vitae provides minimal supernatural bonuses');
    }

    add({
      kind: 'blood_potency',
      id: 'blood_potency',
      target: 'Blood Potency',
      title: `Blood Potency (${bp})`,
      subtitle: `Raise to ${next} : Surge +${nextStats.surge}, Mend ${nextStats.mend}`,
      current: bp,
      next,
      cost,
      need: Math.min(need, 100),
      synergyTag: synergyTag || 'Blood Potency',
      reason: joinReasons(why) || 'Improves everything your vampiric blood accomplishes',
    });
  }

  /* -----------------------------------------------------------------------
     6. Rituals and Ceremonies Engine
     ----------------------------------------------------------------------- */
  const bsLevel = Number(sheet?.disciplines?.['Blood Sorcery'] || 0);
  const knownRitualIds = new Set([
    ...(sheet.rituals?.blood_sorcery || []).map(r => r.id),
    ...(sheet.rituals?.oblivion || []).map(r => r.id),
  ]);

  if (bsLevel >= 1 && RITUALS?.blood_sorcery?.levels) {
    for (let lvl = 1; lvl <= bsLevel; lvl++) {
      const list = RITUALS.blood_sorcery.levels[lvl] || [];
      const unlearned = list.filter(r => !knownRitualIds.has(r.id));
      if (unlearned.length > 0) {
        const topRitual = unlearned[0];
        const ritCost = costs.ritual ? costs.ritual(lvl) : lvl * 3;
        add({
          kind: 'ritual',
          id: `ritual:${topRitual.id}`,
          target: topRitual.name,
          ritualType: 'blood_sorcery',
          ritualLevel: lvl,
          title: `Ritual : ${topRitual.name}`,
          subtitle: `Level ${lvl} Blood Sorcery Ritual`,
          current: 0,
          next: lvl,
          cost: ritCost,
          need: 32 + (lvl === 1 ? 8 : 4),
          synergyTag: 'Ritual',
          reason: joinReasons([
            `learn ${topRitual.name} (${topRitual.effect || 'blood magic'})`,
            `expands your thaumaturgical repertoire for modest experience`,
          ]),
        });
        break;
      }
    }
  }

  const oblLevel = Number(sheet?.disciplines?.['Oblivion'] || 0);
  if (oblLevel >= 1 && RITUALS?.oblivion?.levels) {
    for (let lvl = 1; lvl <= oblLevel; lvl++) {
      const list = RITUALS.oblivion.levels[lvl] || [];
      const unlearned = list.filter(r => !knownRitualIds.has(r.id));
      if (unlearned.length > 0) {
        const topCeremony = unlearned[0];
        const cerCost = costs.ceremony ? costs.ceremony(lvl) : lvl * 3;
        add({
          kind: 'ceremony',
          id: `ceremony:${topCeremony.id}`,
          target: topCeremony.name,
          ritualType: 'oblivion',
          ritualLevel: lvl,
          title: `Ceremony : ${topCeremony.name}`,
          subtitle: `Level ${lvl} Oblivion Ceremony`,
          current: 0,
          next: lvl,
          cost: cerCost,
          need: 32 + (lvl === 1 ? 8 : 4),
          synergyTag: 'Ceremony',
          reason: joinReasons([
            `conduct ${topCeremony.name} (${topCeremony.effect || 'death communion'})`,
            `unlocks shadow rites to commune with spirits`,
          ]),
        });
        break;
      }
    }
  }

  /* -----------------------------------------------------------------------
     7. Backgrounds and Merits Pointer (Rules.md Section 11 & 12)
     ----------------------------------------------------------------------- */
  const backgrounds = Array.isArray(sheet?.backgrounds) ? sheet.backgrounds : [];
  if (backgrounds.length < 2) {
    add({
      kind: 'merits',
      id: 'merits:backgrounds',
      target: 'Backgrounds',
      title: 'Backgrounds and Merits',
      subtitle: backgrounds.length ? 'Round out your domain footing' : 'Establish mortal influence',
      current: backgrounds.length,
      next: backgrounds.length + 1,
      cost: costs.advantageDot(1),
      need: 34,
      synergyTag: 'Social Leverage',
      reason: joinReasons([
        'backgrounds turn experience into worldly influence and territory',
        'Allies, Contacts, Haven, and Herd grant story leverage beyond sheet stats',
      ]),
    });
  }

  /* -----------------------------------------------------------------------
     Ranking and Diverse Selection
     ----------------------------------------------------------------------- */
  out.sort((a, b) => b.score - a.score || a.cost - b.cost);

  const pick = (pool, count, perKind) => {
    const chosen = [];
    const seen = {};
    for (const s of pool) {
      if (chosen.length >= count) break;
      const used = seen[s.kind] || 0;
      if (used >= perKind) continue;
      seen[s.kind] = used + 1;
      chosen.push(s);
    }
    if (chosen.length < count) {
      const taken = new Set(chosen.map(c => c.id));
      for (const s of pool) {
        if (chosen.length >= count) break;
        if (!taken.has(s.id)) {
          taken.add(s.id);
          chosen.push(s);
        }
      }
    }
    chosen.sort((a, b) => b.score - a.score || a.cost - b.cost);
    return chosen;
  };

  const affordable = pick(out.filter(s => s.affordable), limit, 2)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  const aspirational = pick(
    out.filter(s => !s.affordable).sort((a, b) => b.need - a.need || a.cost - b.cost),
    3,
    2
  ).map(s => ({ ...s, shortfall: s.cost - xp }));

  return { affordable, aspirational, profile };
}

export default buildSuggestions;
