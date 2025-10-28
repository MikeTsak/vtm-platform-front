"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DISCIPLINES = exports.iconPath = exports.ALL_DISCIPLINE_NAMES = void 0;
// src/data/disciplines.js
var ALL_DISCIPLINE_NAMES = ['Animalism', 'Auspex', 'Blood Sorcery', 'Celerity', 'Dominate', 'Fortitude', 'Obfuscate', 'Oblivion', 'Potence', 'Presence', 'Protean', 'Thin-blood Alchemy'];
exports.ALL_DISCIPLINE_NAMES = ALL_DISCIPLINE_NAMES;

var iconPath = function iconPath(name) {
  // Normalize and handle known exceptions by lowercase key
  var key = String(name || '').trim().toLowerCase(); // Explicit file overrides (keep exact casing of filenames)

  var OVERRIDES = {
    'blood sorcery': 'Blood-Sorcery-rombo.png',
    'thin-blood alchemy': 'Thin-blood-Alchemy-rombo.png',
    'thaumaturgy': 'Thaumaturgy-rombo.png',
    // if you ever use this label
    'blood sorcery (thaumaturgy)': 'Thaumaturgy-rombo.png' // safety alias

  };
  var file = OVERRIDES[key] || "".concat(name.replace(/\s+/g, '-'), "-rombo.png");
  return "/img/disciplines/".concat(file);
};

exports.iconPath = iconPath;
var DISCIPLINES = {
  // ==== Example fully wired with a few canonical powers ====
  'Animalism': {
    type: 'Mental',
    resonance: 'Animal Blood',
    clan_affinity: ['Gangrel', 'Nosferatu', 'Ravnos', 'Tzimisce'],
    masquerade_threat: 'Low to Medium',
    icon: iconPath('Animalism'),
    levels: {
      1: [{
        id: 'bond_famulus',
        name: 'Bond Famulus',
        cost: 'Feed the animal a Rouse Check of your blood on three different nights (at CC it’s assumed done).',
        duration: 'Only death releases the famulus.',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'One famulus only; normal animal ghouls don’t require this.',
        source: 'Corebook p.245'
      }, {
        id: 'sense_the_beast',
        name: 'Sense the Beast',
        cost: 'Free (passive or active use).',
        duration: 'Passive; can be used actively.',
        dice_pool: 'Resolve + Animalism',
        opposing_pool: 'Composure + Subterfuge',
        notes: 'Detects hostility and supernatural traits.',
        source: 'Corebook p.245'
      }],
      2: [{
        id: 'animal_messenger',
        name: 'Animal Messenger',
        cost: '1 Rouse Check per night of searching.',
        prerequisite: 'Famulus',
        amalgam: 'Auspex ●',
        duration: 'One or more nights (search time).',
        dice_pool: '— (Famulus tests when target location unknown)',
        opposing_pool: '—',
        notes: "Famulus rolls Resolve + Streetwise/Survival (diff 2) if target’s location is unknown; Intelligence + Streetwise/Survival if the target is actively hiding.",
        source: 'Players Guide p.69'
      }, {
        id: 'atavism',
        name: 'Atavism',
        cost: '1 Rouse Check',
        duration: 'Rounds equal to margin + 1, or whole scene on Critical Win.',
        dice_pool: 'Composure + Animalism',
        opposing_pool: '—',
        notes: 'Target animal must be able to sense you; reverts it to primal instincts.',
        source: "Winter's Teeth #3"
      }, {
        id: 'feral_whispers',
        name: 'Feral Whispers',
        cost: '1 Rouse Check per type of animal (free on your Famulus).',
        duration: 'One scene.',
        dice_pool: 'Manipulation/Charisma + Animalism',
        opposing_pool: '—',
        notes: 'Two-way communication with animals; can also summon.',
        source: 'Corebook p.246'
      }],
      3: [{
        id: 'messengers_command',
        name: "Messenger's Command",
        cost: 'None (beyond Animal Messenger & the Dominate power used).',
        prerequisite: 'Animal Messenger AND Compel or Mesmerize',
        amalgam: 'Dominate ●',
        duration: 'As Animal Messenger.',
        dice_pool: 'As Compel or Mesmerize',
        opposing_pool: 'As Compel or Mesmerize',
        notes: 'Dominate rating used Through Famulus cannot exceed your Animalism rating.',
        source: 'Players Guide p.69'
      }, {
        id: 'animal_succulence',
        name: 'Animal Succulence',
        cost: 'Free (passive).',
        duration: 'Passive.',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Slake extra Hunger from animals; counts Blood Potency as 2 lower for slaking penalties (never to 0).',
        source: 'Corebook p.246'
      }, {
        id: 'plague_of_beasts',
        name: 'Plague of Beasts',
        cost: '1 Rouse Check',
        duration: 'One night.',
        dice_pool: 'Manipulation + Animalism',
        opposing_pool: 'Composure + Animal Ken',
        notes: 'Marks a target; they take margin as penalty to non-Physical Skill pools; easier to track.',
        source: 'Players Guide p.69'
      }, {
        id: 'quell_the_beast',
        name: 'Quell the Beast',
        cost: '1 Rouse Check',
        duration: 'Scene (vampires: several turns equal to margin + 1).',
        dice_pool: 'Charisma + Animalism',
        opposing_pool: 'Stamina + Resolve',
        notes: 'Suppress a vampire’s Beast or render mortals lethargic.',
        source: 'Corebook p.246'
      }, {
        id: 'scent_of_prey',
        name: 'Scent of Prey',
        cost: '1 Rouse Check',
        duration: 'One scene (one night on Critical Win).',
        dice_pool: 'Resolve + Animalism',
        opposing_pool: '—',
        notes: 'Track a mortal who witnessed a Masquerade breach.',
        source: 'Sabbat p.47'
      }, {
        id: 'unliving_hive',
        name: 'Unliving Hive',
        cost: 'None (passive).',
        amalgam: 'Obfuscate ●●',
        duration: 'Passive.',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Extend Animalism influence to swarms; treat swarm as a single creature.',
        source: 'Corebook p.246'
      }, {
        id: 'augury',
        name: 'Augury',
        cost: '1 Rouse Check',
        amalgam: 'Auspex ●',
        duration: 'A few minutes.',
        dice_pool: 'Manipulation + Animalism',
        opposing_pool: '—',
        notes: 'Compel a swarm to “answer” a question; all Animalism tests +1 Difficulty for the rest of session.',
        source: 'Tattered Façade p.89–90'
      }, {
        id: 'awaken_the_parasite',
        name: 'Awaken the Parasite',
        cost: '1 Rouse Check',
        duration: 'One scene.',
        dice_pool: 'Resolve + Animalism',
        opposing_pool: 'Composure + Resolve (vampires) or Stamina + Wits (mortals)',
        notes: 'As printed.',
        source: 'Tattered Façade p.90'
      }],
      4: [{
        id: 'subsume_the_spirit',
        name: 'Subsume the Spirit',
        cost: '1 Rouse Check (free on your Famulus).',
        duration: 'One scene / Indefinite (per rules).',
        dice_pool: 'Manipulation + Animalism',
        opposing_pool: '—',
        notes: 'Possess an animal’s body.',
        source: 'Corebook p.247'
      }, {
        id: 'sway_the_flock',
        name: 'Sway the Flock',
        cost: 'One or more Rouse Checks (extend range/influence).',
        duration: 'One night.',
        dice_pool: 'Composure + Animalism',
        opposing_pool: '—',
        notes: 'Area influence over animal behavior; greater successes = stronger control.',
        source: 'Players Guide p.69'
      }],
      5: [{
        id: 'animal_dominion',
        name: 'Animal Dominion',
        cost: '2 Rouse Checks',
        duration: 'One scene, or until directive fulfilled.',
        dice_pool: 'Charisma + Animalism',
        opposing_pool: '—',
        notes: 'Command existing packs/flocks (does not summon).',
        source: 'Corebook p.247'
      }, {
        id: 'coax_the_bestial_temper',
        name: 'Coax the Bestial Temper',
        cost: '1 Rouse Check (maintained by humming).',
        duration: 'As long as maintained.',
        dice_pool: 'Manipulation + Animalism',
        opposing_pool: '—',
        notes: 'Increase or decrease Frenzy resistance Difficulty by margin.',
        source: 'Players Guide p.70'
      }, {
        id: 'drawing_out_the_beast',
        name: 'Drawing Out the Beast',
        cost: '1 Rouse Check',
        duration: 'Frenzy duration.',
        dice_pool: 'Wits + Animalism',
        opposing_pool: 'Composure + Resolve',
        notes: 'Transfer terror or fury Frenzy to a nearby victim (not Hunger Frenzy).',
        source: 'Corebook p.247'
      }, {
        id: 'spirit_walk',
        name: 'Spirit Walk',
        cost: 'None beyond Subsume the Spirit.',
        prerequisite: 'Subsume the Spirit',
        duration: 'Indefinite (as if Critical success).',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Project from one animal to another without returning to your own body.',
        source: 'Gehenna War p.46'
      }]
    }
  },
  'Auspex': {
    type: 'Mental',
    resonance: 'Phlegmatic',
    clan_affinity: ['Hecata', 'Malkavian', 'Salubri', 'Toreador', 'Tremere'],
    masquerade_threat: 'Low',
    icon: iconPath('Auspex'),
    levels: {
      1: [{
        id: 'heightened_senses',
        name: 'Heightened Senses',
        cost: 'Free',
        duration: 'Until deactivated',
        dice_pool: 'Wits + Resolve',
        opposing_pool: '—',
        notes: 'Add Auspex rating to perception rolls. Long activation may cost Willpower at ST discretion.',
        source: 'Corebook p.249'
      }, {
        id: 'sense_the_unseen',
        name: 'Sense the Unseen',
        cost: 'Free',
        duration: 'Passive',
        dice_pool: 'Wits/Resolve + Auspex',
        opposing_pool: '— (vs Obfuscate: Wits + Obfuscate)',
        notes: 'Detect supernatural activity; vs Obfuscate roll opposed (user Wits + Auspex).',
        source: 'Corebook p.249'
      }],
      2: [{
        id: 'panacea_errata',
        name: 'Panacea (Errata)',
        cost: '1 Rouse (additional targets same night: spend Willpower = half margin)',
        amalgam: 'Fortitude ●',
        duration: 'N/A',
        dice_pool: 'Composure + Auspex',
        opposing_pool: '—',
        notes: 'Heals Willpower / calms; special multi-target cost per errata.',
        source: 'Companion p.24; Players Guide p.70'
      }, {
        id: 'premonition',
        name: 'Premonition',
        cost: 'Free (passive) / 1 Rouse (active)',
        duration: 'Passive; active use requires roll',
        dice_pool: 'Resolve + Auspex',
        opposing_pool: '—',
        notes: 'ST may trigger passively at no cost; active visions require Rouse + roll.',
        source: 'Corebook p.249'
      }, {
        id: 'reveal_temperament',
        name: 'Reveal Temperament',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: 'Intelligence + Auspex',
        opposing_pool: 'Composure + Subterfuge',
        notes: 'Smell Resonance and detect Dyscrasia; on Kindred, reveals last feed info.',
        source: 'Players Guide p.71'
      }, {
        id: 'unerring_pursuit',
        name: 'Unerring Pursuit',
        cost: '1 Rouse',
        amalgam: 'Dominate ●',
        duration: 'One night +1 night per success',
        dice_pool: 'Resolve + Auspex',
        opposing_pool: '— (victim may roll Wits + Awareness once to glimpse pursuer)',
        notes: 'Supernatural tracking of a victim.',
        source: 'Sabbat p.46'
      }],
      3: [{
        id: 'vermin_vision_errata',
        name: 'Vermin Vision (Errata)',
        cost: '1 Rouse',
        amalgam: 'Animalism ●●',
        duration: 'One scene',
        dice_pool: 'Resolve + Animalism (per errata)',
        opposing_pool: '—',
        notes: 'Share senses with animals; works Through groups (errata).',
        source: 'Fall of London p.30 (Errata)'
      }, {
        id: 'fatal_flaw',
        name: 'Fatal Flaw',
        cost: '1 Rouse',
        amalgam: 'Oblivion ●',
        duration: 'One scene',
        dice_pool: 'Intelligence + Auspex',
        opposing_pool: 'Composure (mental) / Stamina (physical) + Subterfuge',
        notes: 'Discerns a target’s weakness (mental or physical).',
        source: 'Players Guide p.71'
      }, {
        id: 'scry_the_soul',
        name: 'Scry the Soul',
        cost: '1 Rouse',
        duration: 'One turn',
        dice_pool: 'Intelligence + Auspex',
        opposing_pool: 'Composure + Subterfuge',
        notes: 'Read a single target or scan a crowd for auras / influences.',
        source: 'Corebook p.250'
      }, {
        id: 'share_the_senses',
        name: 'Share the Senses',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: 'Resolve + Auspex',
        opposing_pool: '—',
        notes: 'Tap into another’s senses; Sense the Unseen may allow victim to notice.',
        source: 'Corebook p.250'
      }, {
        id: 'haruspex',
        name: 'Haruspex',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: 'Resolve + Auspex',
        opposing_pool: '—',
        notes: 'Use a mortal corpse (died within the scene) to reroll dice before night’s end.',
        source: 'Tattered Façade p.91'
      }],
      4: [{
        id: 'spirits_touch',
        name: "Spirit's Touch",
        cost: '1 Rouse',
        duration: 'One turn',
        dice_pool: 'Intelligence + Auspex',
        opposing_pool: '—',
        notes: 'Read emotional residue from objects/locations (from most recent backward).',
        source: 'Corebook p.250'
      }, {
        id: 'heart_laid_bare',
        name: 'Heart Laid Bare',
        cost: '1 Rouse',
        duration: 'N/A',
        dice_pool: 'Intelligence + Auspex',
        opposing_pool: 'Composure + Subterfuge',
        notes: 'Discern a target’s deepest fear or desire.',
        source: 'Tattered Façade p.91–92'
      }],
      5: [{
        id: 'clairvoyance',
        name: 'Clairvoyance',
        cost: '1 Rouse',
        duration: 'Few minutes up to one night',
        dice_pool: 'Intelligence + Auspex',
        opposing_pool: '—',
        notes: 'Remote information gathering; can monitor ongoing events.',
        source: 'Corebook p.251'
      }, {
        id: 'possession',
        name: 'Possession',
        cost: '2 Rouse',
        amalgam: 'Dominate ●●●',
        duration: 'Until ended',
        dice_pool: 'Resolve + Auspex',
        opposing_pool: 'Resolve + Intelligence',
        notes: 'Possess a mortal; does not grant target’s Throughs/skills/impersonation.',
        source: 'Corebook p.251'
      }, {
        id: 'telepathy',
        name: 'Telepathy',
        cost: '1 Rouse (non-consenting vampires: also 1 Willpower)',
        duration: '1 minute per Rouse (full scene if consenting)',
        dice_pool: 'Resolve + Auspex',
        opposing_pool: 'Wits + Subterfuge',
        notes: 'Read minds; projecting Throughs to others requires no roll.',
        source: 'Corebook p.252'
      }, {
        id: 'unburdening_the_bestial_soul',
        name: 'Unburdening the Bestial Soul',
        cost: '2 Rouse, 1 Stain',
        prerequisite: 'Panacea (Errata)',
        amalgam: 'Dominate ●●●',
        duration: 'One session',
        dice_pool: 'Composure + Auspex',
        opposing_pool: '—',
        notes: 'Remove or protect against Stains; only works on vampires with lower Humanity.',
        source: 'Companion p.24; Players Guide p.71'
      }]
    }
  },
  'Blood Sorcery': {
    type: 'Sorcery',
    resonance: 'Sanguine',
    clan_affinity: ['Tremere', 'Banu Haqim'],
    masquerade_threat: 'Low to High',
    icon: iconPath('Blood Sorcery'),
    // Optional helper text for your UI: Blood Sorcery also grants access to Rituals up to this level.
    levels: {
      1: [{
        id: 'corrosive_vitae',
        name: 'Corrosive Vitae',
        cost: 'One or more Rouse Checks',
        duration: '—',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Turns vitae corrosive. Does not harm unliving flesh (e.g., vampires).',
        source: 'Corebook p.272'
      }, {
        id: 'shape_the_sanguine_sacrament',
        name: 'Shape the Sanguine Sacrament (Errata)',
        cost: 'Free (1 Rouse if using own vitae)',
        duration: 'One scene unless deactivated',
        dice_pool: 'Manipulation + Blood Sorcery',
        opposing_pool: '—',
        notes: 'Shape blood into images or constructs; errata applied.',
        source: "Winter's Teeth #3; Book of Nod Apocrypha p.33; Tattered Façade p.92"
      }, {
        id: 'a_taste_for_blood',
        name: 'A Taste for Blood',
        cost: 'Free',
        duration: '—',
        dice_pool: 'Resolve + Blood Sorcery',
        opposing_pool: '—',
        notes: 'Discern traits of another via their blood.',
        source: 'Corebook p.272'
      }, {
        id: 'koldunic_sorcery',
        name: 'Koldunic Sorcery',
        cost: '1 Rouse + Aggravated Health damage',
        prerequisite: 'Tzimisce',
        duration: 'One scene; can be renewed',
        dice_pool: 'Resolve + Blood Sorcery',
        opposing_pool: 'Wits/Resolve + Obfuscate',
        notes: 'Attune with and sense Through one element (e.g., Water). May be taken multiple times for other elements.',
        source: 'Blood Sigils p.61'
      }],
      2: [{
        id: 'bloods_curse',
        name: "Blood's Curse",
        cost: '1 Rouse',
        duration: 'Until dawn',
        dice_pool: 'Intelligence + Blood Sorcery',
        opposing_pool: 'Stamina + Occult/Fortitude',
        notes: "Temporarily increases a vampire's Bane Severity. Ghouls/thin-bloods/Caitiff gain a clan bane.",
        source: 'Gehenna War p.48'
      }, {
        id: 'extinguish_vitae',
        name: 'Extinguish Vitae',
        cost: '1 Rouse',
        duration: '—',
        dice_pool: 'Intelligence + Blood Sorcery',
        opposing_pool: 'Stamina + Composure',
        notes: 'Increases a Kindred’s Hunger. If the victim sees the user, they may ID them with Intelligence + Occult vs Wits + Subterfuge.',
        source: 'Corebook p.272'
      }, {
        id: 'scour_secrets',
        name: 'Scour Secrets (Errata)',
        cost: '1 Rouse',
        duration: 'One night, or until info found / dead-end',
        dice_pool: 'Intelligence + Blood Sorcery',
        opposing_pool: '—',
        notes: 'Rapidly parse large amounts of content. Does not translate unknown languages. Errata applied.',
        source: 'Players Guide p.98; Book of Nod Apocrypha p.34'
      }],
      3: [{
        id: 'blood_of_potency',
        name: 'Blood of Potency',
        cost: '1 Rouse',
        duration: 'One scene or night',
        dice_pool: 'Resolve + Blood Sorcery',
        opposing_pool: '—',
        notes: 'Temporarily increases Blood Potency (can bypass generation limit).',
        source: 'Corebook p.273'
      }, {
        id: 'scorpions_touch',
        name: "Scorpion's Touch",
        cost: 'One or more Rouse Checks',
        duration: 'One scene',
        dice_pool: 'Strength + Blood Sorcery',
        opposing_pool: 'Stamina + Occult/Fortitude',
        notes: 'Turns vitae into paralyzing poison. Mortals taking any damage fall unconscious.',
        source: 'Corebook p.273'
      }, {
        id: 'transitive_bond',
        name: 'Transitive Bond',
        cost: '1 Rouse',
        duration: '—',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Extends blood bond properties Through vitae. Originated with Tremere; resurfaced in Sabbat.',
        source: 'Sabbat p.49'
      }, {
        id: 'ripples_of_the_heart',
        name: 'Ripples of the Heart',
        cost: '1 Rouse',
        duration: '—',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Manipulate the blood/resonance of others; can inflict Compulsions on those who feed from tainted blood or alter mortal Resonance.',
        source: 'Blood Stained Love p.153'
      }],
      4: [{
        id: 'theft_of_vitae',
        name: 'Theft of Vitae',
        cost: '1 Rouse',
        duration: 'One feeding',
        dice_pool: 'Wits + Blood Sorcery',
        opposing_pool: 'Wits + Occult',
        notes: 'Pull blood Through the air to feed. Victim experiences the Kiss.',
        source: 'Corebook p.274'
      }, {
        id: 'blood_aegis',
        name: 'Blood Aegis',
        cost: 'One or more Rouse Checks',
        duration: 'One scene or until damage spent',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Protective barrier: each Rouse reduces incoming damage by 5.',
        source: 'Players Guide p.98'
      }, {
        id: 'fulminating_vitae',
        name: 'Fulminating Vitae',
        cost: '2 Rouse',
        duration: 'Until dawn',
        dice_pool: 'Stamina + Blood Sorcery',
        opposing_pool: 'Wits + Athletics',
        notes: 'Vitae bomb. Deals Aggravated to Kindred, Superficial to mortals.',
        source: 'Tattered Façade p.92–93'
      }, {
        id: 'marionette',
        name: 'Marionette',
        cost: '1 Rouse',
        prerequisite: 'Shape the Sanguine Sacrament',
        duration: 'One turn per point of margin',
        dice_pool: 'Manipulation + Blood Sorcery',
        opposing_pool: 'Stamina + Occult/Fortitude (dead bodies diff 2)',
        notes: 'Control the blood within a living or dead body.',
        source: 'Tattered Façade p.93'
      }],
      5: [{
        id: 'baals_caress',
        name: "Baal's Caress",
        cost: 'One or more Rouse Checks',
        duration: 'One scene',
        dice_pool: 'Strength + Blood Sorcery',
        opposing_pool: 'Stamina + Occult/Fortitude',
        notes: 'User’s vitae becomes lethal poison. Mortals die instantly on 1+ damage.',
        source: 'Corebook p.274'
      }, {
        id: 'cauldron_of_blood',
        name: 'Cauldron of Blood',
        cost: '1 Rouse + Stains',
        duration: 'One turn',
        dice_pool: 'Resolve + Blood Sorcery',
        opposing_pool: 'Composure + Occult/Fortitude',
        notes: 'Boils the victim’s blood. Mortals die screaming on 1+ damage.',
        source: 'Corebook p.274'
      }, {
        id: 'reclamation_of_vitae',
        name: 'Reclamation of Vitae',
        cost: 'One or more Stains',
        duration: '—',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Reclaim vitae used to create ghouls over distance. Non-Sabbat users take Stains.',
        source: 'Sabbat p.50'
      }]
    }
  },
  'Celerity': {
    type: 'Physical',
    resonance: 'Choleric',
    clan_affinity: ['Banu Haqim', 'Brujah', 'Toreador'],
    masquerade_threat: 'Medium to High',
    icon: iconPath('Celerity'),
    levels: {
      1: [{
        id: 'cats_grace',
        name: "Cat's Grace",
        cost: 'Free',
        duration: 'Passive',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Automatically pass balance tests; does not work on objects that cannot support your weight.',
        source: 'Corebook p.252'
      }, {
        id: 'fluent_swiftness',
        name: 'Fluent Swiftness',
        cost: 'Free',
        duration: 'Once (reroll window)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Reroll Blood Surge on a Dexterity or Celerity test.',
        source: 'Gehenna War p.46'
      }, {
        id: 'rapid_reflexes',
        name: 'Rapid Reflexes',
        cost: 'Free',
        duration: 'Passive',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Faster reactions and minor actions; no penalty for having no cover in firefights.',
        source: 'Corebook p.253'
      }],
      2: [{
        id: 'fleetness',
        name: 'Fleetness',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Add Celerity rating to non-combat Dexterity tests or once per turn when defending with eligible pools.',
        source: 'Corebook p.253'
      }, {
        id: 'rush_job',
        name: 'Rush Job',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Perform a Skill task that would take a long time in mere seconds. Does not speed up attacks or defenses.',
        source: 'Players Guide p.72'
      }],
      3: [{
        id: 'blink',
        name: 'Blink',
        cost: '1 Rouse',
        duration: 'One turn',
        dice_pool: 'Dexterity + Athletics',
        opposing_pool: '—',
        notes: 'Close distance near-instantaneously in a straight line; terrain may require checks.',
        source: 'Corebook p.253'
      }, {
        id: 'traversal',
        name: 'Traversal',
        cost: '1 Rouse',
        duration: 'One turn',
        dice_pool: 'Dexterity + Athletics',
        opposing_pool: '—',
        notes: 'Dash across vertical surfaces or over liquid briefly. ST should warn if target is too far.',
        source: 'Corebook p.253'
      }, {
        id: 'weaving',
        name: 'Weaving',
        cost: '1 Rouse',
        prerequisite: 'Rapid Reflexes',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Remove penalty from dodging multiple ranged opponents; add Celerity rating to ranged dodges.',
        source: 'Players Guide p.72'
      }, {
        id: 'a_thousand_cuts',
        name: 'A Thousand Cuts',
        cost: '1 Rouse',
        duration: 'One action',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Add Celerity to Brawl/Melee to automatically Impair mortals; against Kindred is a Masquerade breach. Only with claws or edged weapons.',
        source: 'Tattered Façade p.96'
      }],
      4: [{
        id: 'blurred_momentum',
        name: 'Blurred Momentum',
        cost: '1 Rouse per turn',
        duration: 'Until the user lets it lapse',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Attacks with fewer successes than your Celerity rating miss, even for powers that normally disallow defense.',
        source: 'Players Guide p.72'
      }, {
        id: 'draught_of_elegance',
        name: 'Draught of Elegance',
        cost: '1 Rouse',
        duration: "One night; for drinkers until your next feeding or at Hunger 5",
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Imbue your vitae with Celerity; each recipient must drink vitae equal to one Rouse Check.',
        source: 'Corebook p.254'
      }, {
        id: 'unerring_aim',
        name: 'Unerring Aim',
        cost: '1 Rouse',
        amalgam: 'Auspex ●●',
        duration: 'A single attack',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Act as the world slows; attackers with Celerity 5 may spend a Rouse to nullify and defend.',
        source: 'Corebook p.254'
      }, {
        id: 'unseen_strike',
        name: 'Unseen Strike',
        cost: '2 Rouse',
        prerequisite: 'Blink',
        amalgam: 'Obfuscate ●●●●',
        duration: 'One turn',
        dice_pool: 'Dexterity + Celerity',
        opposing_pool: 'Wits + Awareness',
        notes: 'Vanish and reappear for a surprise attack on success; otherwise follows Blink attack/movement rules.',
        source: 'Players Guide p.73'
      }],
      5: [{
        id: 'lightning_strike',
        name: 'Lightning Strike',
        cost: '1 Rouse',
        duration: 'A single attack',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Attack with impossible speed; targets with Celerity 5 may spend a Rouse to nullify and defend.',
        source: 'Corebook p.254'
      }, {
        id: 'split_second',
        name: 'Split Second',
        cost: '1 Rouse',
        duration: 'One action (ST adjudicates)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Briefly alter events just declared by the ST within reason—something achievable in a few real-time seconds.',
        source: 'Corebook p.254'
      }]
    }
  },
  'Dominate': {
    type: 'Mental',
    resonance: 'Phlegmatic',
    clan_affinity: ['Lasombra', 'Malkavian', 'Salubri', 'Tremere', 'Tzimisce', 'Ventrue'],
    masquerade_threat: 'Low',
    icon: iconPath('Dominate'),
    notes_general: 'Most uses require eye contact and spoken commands the victim understands. Victims cannot be ordered to directly cause serious self-harm without Terminal Decree. Once Dominate totally fails against a target, further attempts against them fail for the rest of the story.',
    levels: {
      1: [{
        id: 'cloud_memory',
        name: 'Cloud Memory',
        cost: 'Free',
        duration: 'Indefinitely',
        dice_pool: 'Charisma + Dominate',
        opposing_pool: 'Wits + Resolve',
        notes: 'Erase memory of the current moment. No roll vs unprepared mortals.',
        source: 'Corebook p.256'
      }, {
        id: 'compel',
        name: 'Compel',
        cost: 'Free',
        duration: 'No more than one scene',
        dice_pool: 'Charisma + Dominate',
        opposing_pool: 'Intelligence + Resolve',
        notes: 'Issue a simple command. No roll vs unprepared mortals; mortals already Dominated this scene or acting against their nature may roll to resist.',
        source: 'Corebook p.256'
      }, {
        id: 'slavish_devotion',
        name: 'Slavish Devotion (Errata)',
        cost: 'Free',
        amalgam: 'Fortitude ●',
        duration: 'Passive',
        dice_pool: '—',
        opposing_pool: '—',
        notes: "Victims already under your Dominate resist third-party Dominate: attackers take a dice penalty equal to the victim’s Fortitude. (Errata)",
        source: 'Cults of the Blood Gods p.104; Players Guide p.73'
      }],
      2: [{
        id: 'mesmerize',
        name: 'Mesmerize',
        cost: '1 Rouse',
        duration: 'Until command is carried out or scene ends',
        dice_pool: 'Manipulation + Dominate',
        opposing_pool: 'Intelligence + Resolve',
        notes: 'Issue complex commands. No roll vs unprepared mortals; if against their nature they may roll to resist.',
        source: 'Corebook p.256'
      }, {
        id: 'dementation',
        name: 'Dementation',
        cost: '1 Rouse per target per scene',
        amalgam: 'Obfuscate ●●',
        duration: 'One scene',
        dice_pool: 'Manipulation + Dominate',
        opposing_pool: 'Composure + Intelligence',
        notes: 'You must have had a conversation with the target to use this.',
        source: 'Corebook p.256'
      }, {
        id: 'domitors_favor',
        name: "Domitor's Favor",
        cost: '1 Rouse',
        duration: 'One month',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'While Blood-Bonded, defiance is harder. On a total fail of defiance rolls, the bond does not weaken that month.',
        source: 'Companion p.25; Players Guide p.74'
      }, {
        id: 'the_stolen_voice',
        name: 'The Stolen Voice',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: 'Composure + Dominate',
        opposing_pool: 'Resolve + Performance',
        notes: 'Target cannot speak, write, or gesture to express. No activation test vs mortals.',
        source: 'Tattered Façade p.96–97'
      }],
      3: [{
        id: 'forgetful_mind',
        name: 'Forgetful Mind',
        cost: '1 Rouse',
        duration: 'Indefinitely',
        dice_pool: 'Manipulation + Dominate',
        opposing_pool: 'Intelligence + Resolve',
        notes: 'Rewrite memories; each point of margin allows one additional memory to be altered.',
        source: 'Corebook p.257'
      }, {
        id: 'submerged_directive',
        name: 'Submerged Directive',
        cost: 'Free',
        prerequisite: 'Mesmerize',
        duration: 'Passive (until fulfilled)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Implant a standing suggestion/order that never expires until completed. One directive per target at a time.',
        source: 'Corebook p.257'
      }],
      4: [{
        id: 'ancestral_dominion',
        name: 'Ancestral Dominion (Errata)',
        cost: '1 Rouse',
        prerequisite: 'Mesmerize (Errata)',
        amalgam: 'Blood Sorcery ●● (Errata)',
        duration: 'Until carried out or scene ends',
        dice_pool: 'Manipulation + Dominate',
        opposing_pool: 'Intelligence + Resolve',
        notes: 'Urge a descendant to act, even against their opinion. Target gains +1 die to resist per generation separating you. (Errata)',
        source: 'Cults of the Blood Gods p.104; Players Guide p.74'
      }, {
        id: 'implant_suggestion',
        name: 'Implant Suggestion',
        cost: '1 Rouse',
        amalgam: 'Presence ●',
        duration: 'One scene',
        dice_pool: 'Manipulation + Dominate',
        opposing_pool: 'Composure + Resolve',
        notes: 'Temporarily alter personality/opinion. No test vs unprepared mortals unless it opposes core beliefs.',
        source: 'Players Guide p.74'
      }, {
        id: 'rationalize',
        name: 'Rationalize',
        cost: 'Free',
        duration: 'Indefinitely',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Victims believe Dominated actions were their own idea; if pressed, they may test to question their actions.',
        source: 'Corebook p.257'
      }, {
        id: 'tabula_rasa',
        name: 'Tabula Rasa',
        cost: '2 Rouse',
        duration: 'Permanent',
        dice_pool: 'Resolve + Dominate',
        opposing_pool: 'Composure + Resolve',
        notes: "Erase identity-level memories. Often followed by lies and Path indoctrination (Sabbat practice).",
        source: 'Sabbat p.47'
      }],
      5: [{
        id: 'lethes_call',
        name: "Lethe's Call",
        cost: '1 Rouse',
        prerequisite: 'Cloud Memory or Forgetful Mind',
        duration: 'Indefinitely',
        dice_pool: 'Manipulation + Dominate',
        opposing_pool: 'Intelligence + Resolve',
        notes: 'Erase weeks of memory. Unprepared mortals cannot resist. With a verbal command only memories around the spoken subject are erased.',
        source: 'Gehenna War p.46'
      }, {
        id: 'mass_manipulation',
        name: 'Mass Manipulation',
        cost: '1 Rouse in addition to the amplified power',
        duration: 'As per amplified power',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Apply a Dominate power to multiple targets who see your eyes. Roll once vs the strongest target.',
        source: 'Corebook p.257'
      }, {
        id: 'terminal_decree',
        name: 'Terminal Decree',
        cost: 'Free (causes Stains)',
        duration: 'Passive',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Allows commands that override self-preservation. Such commands are always resisted (never auto-succeed).',
        source: 'Corebook p.257'
      }]
    }
  },
  'Fortitude': {
    type: 'Physical',
    resonance: 'Melancholic',
    clan_affinity: ['Gangrel', 'Hecata', 'Salubri', 'Ventrue'],
    masquerade_threat: 'Medium',
    icon: iconPath('Fortitude'),
    levels: {
      1: [{
        id: 'fluent_endurance',
        name: 'Fluent Endurance',
        cost: 'Free',
        duration: 'Once (reroll window)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Reroll the Blood Surge rouse check on a Stamina or Fortitude test.',
        source: 'Gehenna War p.46'
      }, {
        id: 'resilience',
        name: 'Resilience',
        cost: 'Free',
        duration: 'Passive',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Add your Fortitude rating to your Health track.',
        source: 'Corebook p.258'
      }, {
        id: 'unswayable_mind',
        name: 'Unswayable Mind',
        cost: 'Free',
        duration: 'Passive',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Add Fortitude to rolls resisting coercion, intimidation, or supernatural influence.',
        source: 'Corebook p.258'
      }],
      2: [{
        id: 'earths_perseverance',
        name: "Earth's Perseverance",
        cost: '1 Rouse',
        duration: 'One scene or until released',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Become impossible to move from your spot (you can still be harmed; floor may fail).',
        source: 'Players Guide p.74'
      }, {
        id: 'enduring_beasts',
        name: 'Enduring Beasts',
        cost: '1 Rouse (free & auto on your Famulus)',
        amalgam: 'Animalism ●',
        duration: 'One scene',
        dice_pool: 'Stamina + Animalism',
        opposing_pool: '—',
        notes: 'Share your toughness with animals (especially your Famulus).',
        source: 'Corebook p.258'
      }, {
        id: 'invigorating_vitae',
        name: 'Invigorating Vitae',
        cost: '— (aside from Rouse to donate blood)',
        amalgam: 'Auspex ●',
        duration: 'Passive',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Your vitae heals mortals faster. Usual risks of ghouling/blood bond still apply.',
        source: 'Players Guide p.75'
      }, {
        id: 'obdurate',
        name: 'Obdurate',
        cost: '1 Rouse',
        amalgam: 'Potence ●●',
        duration: 'One scene',
        dice_pool: 'Wits + Survival',
        opposing_pool: '—',
        notes: 'Keep footing when struck by massive force. Superficial damage from impacts is reduced by Fortitude before halving.',
        source: "Winter's Teeth #3"
      }, {
        id: 'toughness',
        name: 'Toughness',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Subtract Fortitude rating from all Superficial damage before halving (cannot reduce below 1).',
        source: 'Corebook p.258'
      }],
      3: [{
        id: 'defy_bane',
        name: 'Defy Bane',
        cost: '1 Rouse',
        duration: 'One scene (or until effect expires)',
        dice_pool: 'Wits + Survival',
        opposing_pool: '—',
        notes: 'Convert Aggravated to Superficial damage; you cannot heal that Superficial damage this scene.',
        source: 'Corebook p.259'
      }, {
        id: 'fortify_the_inner_facade',
        name: 'Fortify the Inner Façade',
        cost: 'Free',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Increase the Difficulty of mind-reading/piercing powers by half your Fortitude (round up). If rules allow resisting, add Fortitude to your pool instead.',
        source: 'Corebook p.259'
      }, {
        id: 'seal_the_beasts_maw',
        name: "Seal the Beast's Maw",
        cost: '2 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Ignore Hunger effects if you do not gain Hunger from the Rouse rolls; reduce dice pools. If any pool drops to 0, test for Fury Frenzy.',
        source: 'Forbidden Religions p.44'
      }, {
        id: 'valeren',
        name: 'Valeren',
        cost: '1 Rouse',
        amalgam: 'Auspex ●',
        duration: '—',
        dice_pool: 'Intelligence + Fortitude',
        opposing_pool: '—',
        notes: 'Mend an injured vampire. A subject can benefit only once per night.',
        source: 'Companion p.25; Players Guide p.75'
      }, {
        id: 'calloused_soul',
        name: 'Calloused Soul',
        cost: '2 Stains (see notes)',
        duration: 'One night',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Pre-emptively take Stains to prevent/reduce later Stains. Actually gain 3 Stains now; one may be mitigated by a Conviction.',
        source: 'Tattered Façade p.97–98'
      }],
      4: [{
        id: 'draught_of_endurance',
        name: 'Draught of Endurance',
        cost: '1 Rouse (+ recipients must drink one Rouse worth)',
        duration: 'One night',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Your vitae grants Fortitude to others until your next feeding/Hunger 5 as applicable.',
        source: 'Corebook p.259'
      }, {
        id: 'gorgons_scales',
        name: 'Gorgon’s Scales',
        cost: '1 Rouse',
        duration: 'One scene (or until Resonance ends)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Resonance-based bonuses: Choleric resists staking; Melancholic reduces fire damage; Phlegmatic strengthens vs Auspex; Sanguine reduces sunlight damage.',
        source: 'Players Guide p.75'
      }, {
        id: 'shatter',
        name: 'Shatter',
        cost: '1 Rouse',
        prerequisite: 'Toughness',
        duration: 'One scene or until triggered',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Your attacker takes the damage your Toughness would subtract; weapons may break if their modifier threshold is met.',
        source: 'Cults of the Blood Gods p.104'
      }],
      5: [{
        id: 'flesh_of_marble',
        name: 'Flesh of Marble',
        cost: '2 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Ignore the first source of physical damage each turn (not sunlight). Critical wins on attacks bypass this.',
        source: 'Corebook p.259'
      }, {
        id: 'prowess_from_pain',
        name: 'Prowess from Pain',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'No penalties from Health damage; increase one Attribute per damage level on your tracker (max Blood Surge value + 6).',
        source: 'Corebook p.260'
      }, {
        id: 'meat_shields',
        name: 'Meat Shields',
        cost: '1 Rouse',
        duration: 'One scene (or until you leave targets)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Increase Fortitude by half the number of weak mortals present (rounded down), max +5.',
        source: 'Tattered Façade p.98'
      }]
    }
  },
  'Obfuscate': {
    type: 'Mental',
    resonance: 'Melancholic',
    clan_affinity: ['Banu Haqim', 'Malkavian', 'The Ministry', 'Nosferatu', 'Ravnos'],
    masquerade_threat: 'Low',
    icon: iconPath('Obfuscate'),
    levels: {
      1: [{
        id: 'cloak_of_shadows',
        name: 'Cloak of Shadows',
        cost: 'Free',
        duration: 'One scene (while motionless)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Blend into surroundings while still; follows general Obfuscate limits.',
        source: 'Corebook p.261'
      }, {
        id: 'ensconce',
        name: 'Ensconce',
        cost: 'Free',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Others ignore small objects held on your person. Sense the Unseen can pierce.',
        source: 'Gehenna War p.46'
      }, {
        id: 'silence_of_death',
        name: 'Silence of Death',
        cost: 'Free',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Nullifies sounds you make; does not mute noises outside your personal space.',
        source: 'Corebook p.261'
      }],
      2: [{
        id: 'cache',
        name: 'Cache',
        cost: '1 Rouse',
        prerequisite: 'Ensconce',
        duration: 'One scene or until dawn (extend with extra Rouse)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Hide unattended objects from notice.',
        source: 'Gehenna War p.47'
      }, {
        id: 'chimerstry',
        name: 'Chimerstry',
        cost: '1 Rouse',
        amalgam: 'Presence ●',
        duration: 'One turn',
        dice_pool: 'Manipulation + Obfuscate',
        opposing_pool: 'Composure + Wits',
        notes: 'Brief but realistic hallucinations; a target can only be affected once per conflict (errata).',
        source: 'Companion p.25; Players Guide p.76'
      }, {
        id: 'ghosts_passing',
        name: "Ghost's Passing",
        cost: '1 Rouse',
        amalgam: 'Animalism ●',
        duration: 'One session',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Bestow Obfuscate onto an animal’s tracks. Sense the Unseen applies per general rules.',
        source: 'Forbidden Religions p.18'
      }, {
        id: 'unseen_passage',
        name: 'Unseen Passage',
        cost: '1 Rouse',
        duration: 'One scene or until detected',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Move while hidden. Fails if you are actively watched at activation.',
        source: 'Corebook p.261'
      }, {
        id: 'ventriloquism',
        name: 'Ventriloquism (Errata)',
        cost: '1 Rouse',
        amalgam: 'Auspex ●●',
        duration: 'One scene',
        dice_pool: 'Wits + Obfuscate',
        opposing_pool: 'Resolve + Composure',
        notes: 'Throw your voice to a chosen hearer within line of sight.',
        source: 'Fall of London p.31 (Errata)'
      }, {
        id: 'doubletalk',
        name: 'Doubletalk',
        cost: '1 Rouse',
        amalgam: 'Auspex ●',
        duration: 'One utterance',
        dice_pool: 'Composure + Obfuscate',
        opposing_pool: 'Wits + Auspex',
        notes: 'Say one thing publicly while conveying a hidden message; bystanders may contest.',
        source: 'Blood Stained Love p.152'
      }],
      3: [{
        id: 'fata_morgana',
        name: 'Fata Morgana (Errata)',
        cost: '1 Rouse',
        amalgam: 'Presence ●●',
        duration: 'One scene (or until lapsed)',
        dice_pool: 'Manipulation + Obfuscate',
        opposing_pool: '—',
        notes: 'Elaborate hallucinations; Frenzy triggers are at −1 Difficulty vs the illusion (errata).',
        source: 'Companion p.26; Players Guide p.77'
      }, {
        id: 'ghost_in_the_machine',
        name: 'Ghost in the Machine',
        cost: 'Free',
        duration: 'As the Obfuscate power used',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Your Obfuscate carries Through live video; recordings later appear blurred/hard to ID.',
        source: 'Corebook p.262'
      }, {
        id: 'mask_of_a_thousand_faces',
        name: 'Mask of a Thousand Faces',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Appear as a forgettable, mundane face; you can interact and converse while masked.',
        source: 'Corebook p.262'
      }, {
        id: 'mask_of_isolation',
        name: 'Mask of Isolation',
        cost: '1 Rouse',
        prerequisite: 'Mask of a Thousand Faces',
        amalgam: 'Dominate ●',
        duration: 'One night +1 night per margin',
        dice_pool: 'Manipulation + Obfuscate',
        opposing_pool: 'Charisma + Insight',
        notes: 'Force Mask of a Thousand Faces onto a victim; if they realize it, the effect ends.',
        source: 'Sabbat p.48'
      }, {
        id: 'mental_maze',
        name: 'Mental Maze (Errata)',
        cost: '1 or 3 Rouse (per effect scope)',
        amalgam: 'Dominate ●',
        duration: 'One night',
        dice_pool: 'Charisma + Obfuscate',
        opposing_pool: 'Wits + Resolve',
        notes: 'Victim loses sense of direction/location within an area. Requires eye contact (errata).',
        source: 'Cults of the Blood Gods p.85; Players Guide p.77'
      }, {
        id: 'mind_masque',
        name: 'Mind Masque',
        cost: '1 Rouse',
        amalgam: 'Dominate ●●',
        duration: 'One scene',
        dice_pool: 'Intelligence + Obfuscate',
        opposing_pool: '—',
        notes: 'Hide/replace emotions & Throughs from supernatural readers; higher complexity raises Difficulty.',
        source: 'Players Guide p.78'
      }, {
        id: 'guise_of_the_departed',
        name: 'Guise of the Departed',
        cost: '1 Rouse',
        amalgam: 'Oblivion ●',
        duration: 'Until dawn',
        dice_pool: 'Wits + Obfuscate',
        opposing_pool: '—',
        notes: 'Adopt appearance & mannerisms of a recently dead mortal. Sense the Unseen can pierce.',
        source: 'Tattered Façade p.98–99'
      }],
      4: [{
        id: 'conceal',
        name: 'Conceal',
        cost: '1 Rouse',
        amalgam: 'Auspex ●●●',
        duration: 'One night +1 night per margin',
        dice_pool: 'Intelligence + Obfuscate',
        opposing_pool: '—',
        notes: 'Cloak an inanimate object (≤ two-story house; not self-moving).',
        source: 'Corebook p.262'
      }, {
        id: 'vanish',
        name: 'Vanish',
        cost: 'As augmented power',
        prerequisite: 'Cloak of Shadows (to augment Cloak/Unseen Passage)',
        duration: 'As augmented power',
        dice_pool: 'Wits + Obfuscate',
        opposing_pool: 'Wits + Awareness',
        notes: 'Activate Cloak/Unseen Passage while observed; mortals’ memories fog, vampires’ do not.',
        source: 'Corebook p.262'
      }, {
        id: 'seclusion',
        name: 'Seclusion',
        cost: '1 Rouse',
        amalgam: 'Dominate ●',
        duration: 'Margin scenes/nights, or until broken',
        dice_pool: 'Manipulation + Obfuscate',
        opposing_pool: 'Resolve + Awareness',
        notes: 'Target cannot see/hear any being. Physical harm lets target test again to end effect.',
        source: 'Tattered Façade p.99'
      }],
      5: [{
        id: 'cloak_the_gathering',
        name: 'Cloak the Gathering',
        cost: '1 Rouse (plus the cost of the extended power)',
        duration: 'As extended power',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Extend your Obfuscate to allies up to your Wits; exceed with extra Rouse Checks.',
        source: 'Corebook p.263'
      }, {
        id: 'impostors_guise',
        name: "Impostor's Guise",
        cost: '1 Rouse',
        prerequisite: 'Mask of a Thousand Faces',
        duration: 'One scene',
        dice_pool: 'Wits + Obfuscate',
        opposing_pool: 'Manipulation + Performance',
        notes: 'Assume a specific person’s appearance; study for 5+ minutes from multiple angles.',
        source: 'Corebook p.263'
      }]
    }
  },
  'Oblivion': {
    type: 'Mental',
    resonance: '"Empty"',
    clan_affinity: ['Hecata', 'Lasombra'],
    masquerade_threat: 'Medium to High',
    icon: iconPath('Oblivion'),
    // Optional: Using Oblivion can inflict Stains on a Rouse roll of 1 or 10 (see your rules text).
    levels: {
      1: [{
        id: 'ashes_to_ashes',
        name: 'Ashes to Ashes',
        cost: '1 Rouse',
        duration: 'Variable (3 turns if inanimate corpse)',
        dice_pool: 'Stamina + Oblivion',
        opposing_pool: 'Stamina + Medicine/Fortitude',
        notes: 'Dissolves a corpse; animated bodies require tests.',
        source: 'Cults of the Blood Gods p.204; Players Guide p.85'
      }, {
        id: 'binding_fetter',
        name: 'Binding Fetter (Errata)',
        cost: 'Free',
        duration: 'One scene',
        dice_pool: 'Wits + Oblivion',
        opposing_pool: '—',
        notes: 'Identify a wraith’s fetter; suffer −2 to Awareness, Wits, and Resolve while active.',
        source: 'Cults of the Blood Gods p.204; Players Guide p.85'
      }, {
        id: 'oblivion_sight',
        name: 'Oblivion Sight (Errata)',
        cost: 'Free',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'See in darkness; perceive ghosts. −2 dice to social rolls with mortals while active.',
        source: 'Chicago by Night p.293; Players Guide p.85'
      }, {
        id: 'shadow_cloak',
        name: 'Shadow Cloak',
        cost: 'Free',
        duration: 'Passive',
        dice_pool: '—',
        opposing_pool: '—',
        notes: '+2 to Stealth and to Intimidation vs mortals.',
        source: 'Chicago by Night p.293; Players Guide p.85; Fall of London p.264'
      }],
      2: [{
        id: 'arms_of_ahriman',
        name: 'Arms of Ahriman (Errata)',
        cost: '1 Rouse',
        amalgam: 'Potence ●●',
        duration: 'One scene or until ended/destroyed',
        dice_pool: 'Wits + Oblivion',
        opposing_pool: '—',
        notes: 'Control shadow appendages; you can do nothing else while controlling them. Arms have no Health; escape does not require Composure + Resolve (errata).',
        source: 'Chicago by Night p.294; Players Guide p.86'
      }, {
        id: 'fatal_prediction',
        name: 'Fatal Prediction (Updated)',
        cost: '1 Rouse',
        amalgam: 'Auspex ●●',
        duration: '24 hours',
        dice_pool: 'Resolve + Oblivion',
        opposing_pool: 'Wits + Occult',
        notes: 'Increase chance of mortal harm from external forces. Each success over margin deals 1 Aggravated over duration. You may not interact with the victim directly/indirectly.',
        source: 'Players Guide p.87'
      }, {
        id: 'fatal_precognition',
        name: 'Fatal Precognition',
        cost: '1 Rouse',
        amalgam: 'Auspex ●●',
        duration: 'Until fulfilled/avoided/end of story',
        dice_pool: 'Resolve + Oblivion',
        opposing_pool: '—',
        notes: 'Vision of a non-vampire’s death; you must see or hear the target during use.',
        source: 'Cults of the Blood Gods p.204'
      }, {
        id: 'shadow_cast',
        name: 'Shadow Cast',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Conjure shadows from your body up to 2 × Oblivion rating meters/yards. Targets in shadow take extra Willpower damage in social conflict.',
        source: 'Chicago by Night p.293; Players Guide p.87'
      }, {
        id: 'where_the_veil_thins',
        name: 'Where the Veil Thins (Errata)',
        cost: '1 Rouse',
        duration: 'One turn',
        dice_pool: 'Intelligence + Oblivion',
        opposing_pool: '—',
        notes: 'Determine local Shroud density and effects (see chart in source).',
        source: 'Cults of the Blood Gods p.205; Players Guide p.87'
      }],
      3: [{
        id: 'aura_of_decay',
        name: 'Aura of Decay (Errata)',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: 'Stamina + Oblivion',
        opposing_pool: 'Stamina + Medicine/Fortitude',
        notes: 'Plants wilt; animals/humans sicken; food spoils. −2 dice to your social rolls; contaminated food inflicts 2 Superficial (errata).',
        source: 'Cults of the Blood Gods p.205; Players Guide p.88'
      }, {
        id: 'passion_feast',
        name: 'Passion Feast (Errata)',
        cost: 'Free',
        amalgam: 'Fortitude ●●',
        duration: 'Passive',
        dice_pool: 'Resolve + Oblivion',
        opposing_pool: 'Resolve + Composure',
        notes: 'Slake Hunger on wraiths’ passion; Hunger does not return the next night (errata).',
        source: 'Cults of the Blood Gods p.206; Players Guide p.89'
      }, {
        id: 'shadow_perspective',
        name: 'Shadow Perspective',
        cost: '1 Rouse',
        duration: 'Up to one scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Project senses into a shadow in line of sight. Only supernatural means (e.g., Sense the Unseen) can detect it.',
        source: 'Chicago by Night p.294; Players Guide p.89'
      }, {
        id: 'shadow_servant',
        name: 'Shadow Servant',
        cost: '1 Rouse',
        amalgam: 'Auspex ●',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Command a shadow to spy or frighten; it has no mind and is destroyed by bright light.',
        source: 'Players Guide p.89'
      }, {
        id: 'touch_of_oblivion',
        name: 'Touch of Oblivion (Errata)',
        cost: '1 Rouse',
        duration: 'One turn',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Wither a body part by touch (must grip the target). May warrant Stains at ST discretion (errata).',
        source: 'Chicago by Night p.294; Players Guide p.89'
      }],
      4: [{
        id: 'necrotic_plague',
        name: 'Necrotic Plague (Errata)',
        cost: '1 Rouse',
        duration: 'Activate in one turn; condition length varies',
        dice_pool: 'Intelligence + Oblivion',
        opposing_pool: 'Stamina + Medicine/Fortitude',
        notes: 'Supernatural illness; mundane treatment fails—only vitae heals. No outcome on Total Failure (errata).',
        source: 'Cults of the Blood Gods p.206; Players Guide p.89'
      }, {
        id: 'stygian_shroud',
        name: 'Stygian Shroud',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Spew darkness from a nearby shadow, covering area up to 2 × Oblivion rating meters/yards.',
        source: 'Chicago by Night p.295; Players Guide p.90'
      }, {
        id: 'umbrous_clutch',
        name: 'Umbrous Clutch',
        cost: '1 Rouse, 1 Stain',
        duration: 'Instant',
        dice_pool: 'Wits + Oblivion',
        opposing_pool: 'Dexterity + Wits',
        notes: 'Open a victim’s shadow as a portal and drop them into your arms. Unprepared mortals are terrified; vampires test Frenzy (Fear/Fury) at Difficulty 4.',
        source: 'Sabbat p.49'
      }],
      5: [{
        id: 'shadow_step',
        name: 'Shadow Step',
        cost: '1 Rouse',
        duration: 'One turn',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Step into one shadow and out of another within sight. You may take a willing passenger; if you gain a Stain, they do too.',
        source: 'Chicago by Night p.295; Players Guide p.90'
      }, {
        id: 'skuld_fulfilled',
        name: 'Skuld Fulfilled (Errata)',
        cost: '2 Rouse',
        duration: 'Variable (depends on treatability)',
        dice_pool: 'Stamina + Oblivion',
        opposing_pool: 'Stamina + Stamina/Fortitude',
        notes: 'Reintroduce recovered illnesses. On ghouls, removes anti-aging and purges vitae (errata on pools).',
        source: 'Cults of the Blood Gods p.207; Players Guide p.91'
      }, {
        id: 'tenebrous_avatar',
        name: 'Tenebrous Avatar',
        cost: '2 Rouse',
        duration: 'One scene or until ended',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Become living shadow; move over any surface/Through small gaps; only sunlight/fire harm you.',
        source: 'Chicago by Night p.295; Players Guide p.91'
      }, {
        id: 'withering_spirit',
        name: 'Withering Spirit',
        cost: '2 Rouse, Stains',
        duration: 'One turn',
        dice_pool: 'Resolve + Oblivion',
        opposing_pool: 'Resolve + Occult/Fortitude',
        notes: 'Erode a victim’s spirit to a husk. If they are Impaired, they will not return as a wraith.',
        source: 'Cults of the Blood Gods p.208'
      }]
    }
  },
  'Potence': {
    type: 'Physical',
    resonance: 'Choleric',
    clan_affinity: ['Brujah', 'Nosferatu', 'Lasombra'],
    masquerade_threat: 'Medium to High',
    icon: iconPath('Potence'),
    levels: {
      1: [{
        id: 'fluent_strength',
        name: 'Fluent Strength',
        cost: 'Free',
        duration: 'Once (reroll window)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Reroll Blood Surge rouse checks on Strength or Potence rolls.',
        source: 'Gehenna War p.47'
      }, {
        id: 'lethal_body',
        name: 'Lethal Body',
        cost: 'Free',
        duration: 'Passive',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Unarmed attacks deal Aggravated to mortals and ignore 1 armor per Potence dot.',
        source: 'Corebook p.264'
      }, {
        id: 'soaring_leap',
        name: 'Soaring Leap',
        cost: 'Free',
        duration: 'Passive',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Leap a distance in meters equal to 3 × Potence rating.',
        source: 'Corebook p.264'
      }],
      2: [{
        id: 'prowess',
        name: 'Prowess',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Add Potence to unarmed damage and to Feats of Strength; add half Potence (round up) to Melee damage.',
        source: 'Corebook p.264'
      }, {
        id: 'relentless_grasp',
        name: 'Relentless Grasp',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Supernatural grip strength; does not aid the initial grapple test.',
        source: 'Players Guide p.79'
      }],
      3: [{
        id: 'brutal_feed',
        name: 'Brutal Feed',
        cost: 'Free',
        duration: 'One feeding',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Feeding becomes a violent, seconds-long act that slakes Hunger rapidly. Against vampires, required feeding actions are halved (round down).',
        source: 'Corebook p.264'
      }, {
        id: 'spark_of_rage',
        name: 'Spark of Rage',
        cost: '1 Rouse',
        amalgam: 'Presence ●●●',
        duration: 'One scene',
        dice_pool: '— (vs vampires: Manipulation + Potence)',
        opposing_pool: '— (vs vampires: Intelligence + Composure)',
        notes: 'Incite a person or crowd to violence; add Potence rating to the effect.',
        source: 'Corebook p.265'
      }, {
        id: 'uncanny_grip',
        name: 'Uncanny Grip',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Cling to/climb most surfaces unsupported. Leaves obvious damage traces.',
        source: 'Corebook p.265'
      }, {
        id: 'wrecker',
        name: 'Wrecker',
        cost: 'Free',
        prerequisite: 'Prowess',
        duration: 'As Prowess',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Double Potence rating for Feats of Strength vs objects/structures. Not usable against living targets.',
        source: 'Players Guide p.79'
      }],
      4: [{
        id: 'draught_of_might',
        name: 'Draught of Might',
        cost: '1 Rouse (+ recipients must drink one Rouse worth)',
        duration: 'One night',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Your vitae grants Potence to others until your next feeding/Hunger 5 as applicable.',
        source: 'Corebook p.265'
      }, {
        id: 'crash_down',
        name: 'Crash Down',
        cost: '1 Rouse',
        prerequisite: 'Soaring Leap',
        duration: 'Instant (on landing)',
        dice_pool: 'Strength + Potence',
        opposing_pool: 'Dexterity + Athletics',
        notes: 'Create a damaging shock on landing. Targets who total fail or suffer 3+ damage are knocked prone.',
        source: 'Players Guide p.79'
      }],
      5: [{
        id: 'earth_shock',
        name: 'Earth Shock',
        cost: '2 Rouse',
        duration: 'One use (max once per scene)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Create a shockwave that throws opponents prone.',
        source: 'Corebook p.265'
      }, {
        id: 'fist_of_caine',
        name: 'Fist of Caine',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Your blows inflict Aggravated Health damage to mortals and supernaturals alike.',
        source: 'Corebook p.266'
      }, {
        id: 'subtle_hammer',
        name: 'Subtle Hammer',
        cost: 'Free',
        duration: 'Passive',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Focus your power into a single body part. You cannot make a second attack in the same move; limited-mobility body parts gain +4 dice (or more) to appropriate actions.',
        source: 'Players Guide p.79'
      }]
    }
  },
  'Presence': {
    type: 'Mental',
    resonance: 'Sanguine',
    clan_affinity: ['Brujah', 'Ravnos', 'Toreador', 'The Ministry', 'Ventrue'],
    masquerade_threat: 'Low to Medium',
    icon: iconPath('Presence'),
    levels: {
      1: [{
        id: 'awe',
        name: 'Awe',
        cost: 'Free',
        duration: 'One scene or until ended',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Add Presence rating to Persuasion/Performance/Charisma-adjacent rolls (ST discretion). Victims revert to prior opinions when it ends.',
        source: 'Corebook p.267'
      }, {
        id: 'daunt',
        name: 'Daunt',
        cost: 'Free',
        duration: 'One scene or until ended',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Add Presence rating to Intimidation rolls. Cannot be used with Awe simultaneously.',
        source: 'Corebook p.267'
      }, {
        id: 'eyes_of_the_serpent',
        name: 'Eyes of the Serpent',
        cost: 'Free',
        amalgam: 'Protean ●',
        duration: 'Until eye contact breaks or scene ends',
        dice_pool: 'Charisma + Presence',
        opposing_pool: 'Wits + Composure',
        notes: 'Immobilize with eye contact. Vampire victims may spend Willpower to break it after the first turn.',
        source: 'Anarch p.185; Players Guide p.80'
      }],
      2: [{
        id: 'lingering_kiss',
        name: 'Lingering Kiss (Errata)',
        cost: 'Free',
        duration: 'Nights = your Presence rating',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'During feeding, grant a Social Attribute bonus; afterward, victim suffers equal penalty when not pursuing the “fix.” Doesn’t work on Blood-Bonded; Unbondable cannot take this power.',
        source: 'Corebook p.267; Companion p.62'
      }, {
        id: 'melpominee',
        name: 'Melpominee',
        cost: 'Free',
        duration: '—',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Use Awe, Daunt, Dread Gaze, Entrancement, and Majesty without seeing the target as long as they can hear you (earshot; not electronic by default).',
        source: 'Players Guide p.80'
      }],
      3: [{
        id: 'clear_the_field',
        name: 'Clear the Field (Errata)',
        cost: '1 Rouse',
        amalgam: 'Dominate ●●●',
        duration: '—',
        dice_pool: 'Composure + Presence',
        opposing_pool: 'Wits + Composure',
        notes: 'Calmly clear an area; you may exempt a number of people equal to your Composure (errata).',
        source: 'Fall of London p.31 (Errata)'
      }, {
        id: 'dread_gaze',
        name: 'Dread Gaze',
        cost: '1 Rouse',
        duration: 'One turn',
        dice_pool: 'Charisma + Presence',
        opposing_pool: 'Composure + Resolve',
        notes: 'Instill fear; on a critical win vs a vampire, target tests Terror Frenzy at Difficulty 3.',
        source: 'Corebook p.267'
      }, {
        id: 'entrancement',
        name: 'Entrancement',
        cost: '1 Rouse',
        duration: '1 hour +1 per margin',
        dice_pool: 'Charisma + Presence',
        opposing_pool: 'Composure + Wits',
        notes: 'Target becomes devoted to keeping you pleased; you add Presence rating to social rolls against them. Harmful/tenet-opposed requests prompt a new test or the effect ends.',
        source: 'Corebook p.268'
      }, {
        id: 'thrown_voice',
        name: 'Thrown Voice',
        cost: '1 Rouse',
        amalgam: 'Auspex ●',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Project your voice to any point in sight; usually no roll unless combined with Irresistible Voice/Melpominee/etc.',
        source: 'Players Guide p.80'
      }, {
        id: 'true_loves_face',
        name: "True Love's Face",
        cost: '1 Rouse',
        amalgam: 'Obfuscate ●●●',
        duration: 'One scene',
        dice_pool: 'Manipulation + Presence',
        opposing_pool: 'Composure + Wits',
        notes: 'Victim perceives you as someone they strongly love/hate; can cause Stains if that person is their Touchstone.',
        source: 'Cults of the Blood Gods p.85'
      }],
      4: [{
        id: 'irresistible_voice',
        name: 'Irresistible Voice',
        cost: 'No additional cost',
        amalgam: 'Dominate ●',
        duration: 'Passive',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Your voice alone suffices to use Dominate. Does not function Through technology.',
        source: 'Corebook p.268'
      }, {
        id: 'magnum_opus',
        name: 'Magnum Opus',
        cost: 'One or more Rouse',
        amalgam: 'Auspex ●●●',
        duration: '—',
        dice_pool: 'Charisma/Manipulation + Craft',
        opposing_pool: 'Composure + Resolve (audiences)',
        notes: 'Infuse artwork with Presence; audiences resist to avoid its effects.',
        source: "Winter's Teeth #3"
      }, {
        id: 'suffuse_the_edifice',
        name: 'Suffuse the Edifice',
        cost: '—',
        duration: 'As power transmitted',
        dice_pool: 'As power transmitted',
        opposing_pool: 'As power transmitted',
        notes: 'Extend a Presence power onto a building; if you are present, you become the focus instead.',
        source: 'Players Guide p.80'
      }, {
        id: 'summon',
        name: 'Summon',
        cost: '1 Rouse',
        duration: 'One night',
        dice_pool: 'Manipulation + Presence',
        opposing_pool: 'Composure + Intelligence',
        notes: 'Call someone who’s tasted your vitae or been affected by specific Presence powers. They won’t harm themselves to reach you.',
        source: 'Corebook p.268'
      }, {
        id: 'wingman',
        name: 'Wingman',
        cost: '1 Rouse (+ any extended power costs)',
        duration: 'As power used',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Grant another character use of your Presence power. Using the same power together doesn’t stack bonuses.',
        source: 'Blood Stained Love p.152'
      }],
      5: [{
        id: 'majesty',
        name: 'Majesty',
        cost: '2 Rouse',
        duration: 'One scene',
        dice_pool: 'Charisma + Presence',
        opposing_pool: 'Composure + Resolve',
        notes: 'All who look upon you are awestruck and can only act for self-preservation; a win grants 1 turn +1 per margin of freedom.',
        source: 'Corebook p.268'
      }, {
        id: 'star_magnetism',
        name: 'Star Magnetism',
        cost: '1 additional Rouse (on top of the power used)',
        duration: 'As power used',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Transmit Presence Through live-feed technology (not recordings). When using Entrancement, speak the target’s name clearly.',
        source: 'Corebook p.269'
      }]
    }
  },
  'Protean': {
    type: 'Physical',
    resonance: 'Animal Blood',
    clan_affinity: ['Gangrel', 'The Ministry', 'Tzimisce'],
    masquerade_threat: 'High',
    icon: iconPath('Protean'),
    levels: {
      1: [{
        id: 'eyes_of_the_beast',
        name: 'Eyes of the Beast',
        cost: 'Free',
        duration: 'As long as desired',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'See in total darkness; +2 dice to Intimidation vs mortals while active.',
        source: 'Corebook p.269'
      }, {
        id: 'weight_of_the_feather',
        name: 'Weight of the Feather',
        cost: 'Free',
        duration: 'As long as desired',
        dice_pool: 'Wits + Survival (only on reactive activation)',
        opposing_pool: '—',
        notes: 'Make yourself nearly weightless.',
        source: 'Corebook p.269'
      }],
      2: [{
        id: 'feral_weapons',
        name: 'Feral Weapons',
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Extend claws (+2 damage) or fangs (no called-shot penalty). Your Superficial damage is not halved.',
        source: 'Corebook p.270'
      }, {
        id: 'vicissitude',
        name: 'Vicissitude',
        cost: '1 Rouse',
        amalgam: 'Dominate ●●',
        duration: 'Permanent',
        dice_pool: 'Resolve + Protean',
        opposing_pool: '—',
        notes: 'Sculpt your own flesh; each success permits one change.',
        source: 'Companion p.27; Players Guide p.81'
      }, {
        id: 'serpents_kiss',
        name: "Serpent's Kiss",
        cost: '1 Rouse',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'When biting, inject your vitae into the target (can carry effects like Scorpion’s Touch).',
        source: 'Blood Stained Love p.153'
      }, {
        id: 'the_false_sip',
        name: 'The False Sip',
        cost: '1 Rouse',
        amalgam: 'Fortitude ●',
        duration: 'One scene (extend with another Rouse)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Prevent any blood/vitae from entering your system; vomit it up within the scene or extend once.',
        source: 'Blood Stained Love p.153'
      }],
      3: [{
        id: 'earth_meld',
        name: 'Earth Meld',
        cost: '1 Rouse',
        duration: 'One day or more, or until disturbed',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Merge with natural earth/soil (not artificial surfaces).',
        source: 'Corebook p.270'
      }, {
        id: 'fleshcrafting',
        name: 'Fleshcrafting',
        cost: '1 Rouse',
        prerequisite: 'Vicissitude',
        amalgam: 'Dominate ●●',
        duration: 'Permanent',
        dice_pool: 'Resolve + Protean',
        opposing_pool: 'Stamina + Resolve (if unwilling)',
        notes: 'Reshape others; margin = number of changes you can make.',
        source: 'Companion p.27; Players Guide p.82'
      }, {
        id: 'shapechange',
        name: 'Shapechange',
        cost: '1 Rouse',
        duration: 'One scene (or until ended)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Transform into an animal of similar mass; gain its Physical Attributes/traits.',
        source: 'Corebook p.270'
      }, {
        id: 'visceral_absorption',
        name: 'Visceral Absorption',
        cost: '1 Rouse',
        amalgam: 'Blood Sorcery ●●',
        duration: 'One turn per body',
        dice_pool: 'Strength + Protean',
        opposing_pool: '—',
        notes: 'Absorb blood/remains to clean a scene; reduce Hunger by 1 per body up to your Blood Sorcery rating (not below 0).',
        source: 'Sabbat p.49'
      }],
      4: [{
        id: 'horrid_form',
        name: 'Horrid Form',
        cost: '1 Rouse',
        prerequisite: 'Vicissitude',
        amalgam: 'Dominate ●●',
        duration: 'One scene (or until ended)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Assume a monstrous shape; gain several changes up to your Protean dots. All criticals count as messy; Frenzy checks at +2 Difficulty.',
        source: 'Companion p.28; Players Guide p.83'
      }, {
        id: 'metamorphosis',
        name: 'Metamorphosis',
        cost: '1 Rouse',
        prerequisite: 'Shapechange',
        duration: 'One scene (or until ended)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Change into larger-than-mass animals; otherwise follows Shapechange rules.',
        source: 'Corebook p.271'
      }],
      5: [{
        id: 'blood_form',
        name: 'Blood Form',
        cost: '1 Rouse',
        amalgam: 'Blood Sorcery ●●',
        duration: 'One scene (or until ended)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Become an amorphous mass of blood; can be consumed (creating blood bonds as normal).',
        source: 'Gehenna War p.47'
      }, {
        id: 'the_heart_of_darkness',
        name: 'The Heart of Darkness',
        cost: 'Free',
        amalgam: 'Fortitude ●●',
        duration: 'Permanent (until destroyed/returned)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Remove and hide your heart. If it takes Aggravated ≥ your Health, you enter torpor; only fire/sunlight can destroy it.',
        source: 'Cults of the Blood Gods p.85'
      }, {
        id: 'master_of_forms',
        name: 'Master of Forms',
        cost: '— (pay Shapechange costs as normal)',
        prerequisite: 'Shapechange',
        duration: 'As Shapechange/Metamorphosis',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Take on any animal form; all other Shapechange/Metamorphosis limits still apply.',
        source: 'Gehenna War p.48'
      }, {
        id: 'mist_form',
        name: 'Mist Form',
        cost: '1–3 Rouse',
        duration: 'One scene (or until ended)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Become a cloud of mist. Takes three turns to activate; each extra Rouse reduces activation by one turn.',
        source: 'Corebook p.271'
      }, {
        id: 'one_with_the_land',
        name: 'One with the Land',
        cost: '2 Rouse',
        prerequisite: 'Earth Meld',
        amalgam: 'Animalism ●●',
        duration: 'One day or more, or until disturbed',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'As Earth Meld, but not limited by material within your Domain.',
        source: 'Companion p.28; Players Guide p.83'
      }, {
        id: 'the_unfettered_heart',
        name: 'The Unfettered Heart',
        cost: 'Free',
        duration: 'Passive',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Your heart moves freely in the chest; only a melee critical can stake you.',
        source: 'Corebook p.271'
      }]
    }
  },
  'Thin-blood Alchemy': {
    type: 'Varied',
    resonance: 'Varied',
    clan_affinity: ['Thin-blood'],
    masquerade_threat: 'Varied',
    icon: iconPath('Thin-blood Alchemy'),
    notes_general: 'Thin-blood Alchemy uses distilled formulae via one of three styles: Athanor Corporis (Stamina + Alchemy; self-ingested, one power at a time), Calcinatio (Manipulation + Alchemy; hosted in a mortal, one power per host; slakes Hunger equal to (level−1) when drunk), and Fixatio (Intelligence + Alchemy; brewed/stored doses; needs a lab for >3; carry/store limits apply). Distilling typically costs a Rouse Check; activation then follows each formula’s own cost. When a formula calls for a Discipline rating, use Alchemy rating instead.',
    levels: {
      1: [{
        id: 'body_paint',
        name: 'Body Paint',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Choleric',
        duration: 'Permanent (unless erased by skin-colored Body Paint)',
        dice_pool: 'Dexterity + Craft',
        opposing_pool: 'None',
        notes: 'Create tattoos with personal tweaks. After a week, altering uses Stamina + Resolve.',
        source: 'Blood Sigils p.73'
      }, {
        id: 'checkout_time',
        name: 'Checkout Time',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Phlegmatic',
        duration: 'A set number of nights (max 9) written during creation',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Enter deep torpor: no aura, no Rouse, no sunlight/banes damage; waking does not require a Rouse.',
        source: 'Blood Sigils p.74'
      }, {
        id: 'elevate',
        name: 'Elevate',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Sanguine',
        duration: 'One scene',
        dice_pool: 'Stamina + Alchemy',
        opposing_pool: '—',
        notes: 'Get high regardless of Humanity/Blush; good distill boosts Dexterity, bad distill penalizes it.',
        source: 'Blood Sigils p.74'
      }, {
        id: 'far_reach',
        name: 'Far Reach',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Choleric',
        duration: 'One turn unless held',
        dice_pool: 'Resolve + Alchemy',
        opposing_pool: 'Strength + Athletics',
        notes: 'Telekinetically push/pull/hold. Maintaining a hold each turn: Resolve + Alchemy, Difficulty 3.',
        source: 'Corebook p.284'
      }, {
        id: 'food_stain',
        name: 'Food Stain',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Melancholic',
        duration: 'Persists until consumed/applied',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Mark someone; anyone who drinks from them becomes obvious to you when encountered. With Auspex 2, you’re aware as soon as feeding occurs.',
        source: 'Blood Sigils p.74'
      }, {
        id: 'gaolers_bane',
        name: "Gaoler's Bane",
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Sanguine',
        duration: 'One scene or until ended',
        dice_pool: '—',
        opposing_pool: '—',
        notes: '+2 dice to escape restraints/grapples.',
        source: "Winter's Teeth p.10"
      }, {
        id: 'haze',
        name: 'Haze',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Phlegmatic',
        duration: 'One scene or until ended',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Mist follows you, hindering aim/ID. Can extend to up to five people with an extra Rouse.',
        source: 'Corebook p.285'
      }, {
        id: 'mercurian_tongue',
        name: 'Mercurian Tongue',
        cost: '1 Rouse',
        origin: 'None',
        resonance: '—',
        duration: 'One night, or until you feed from someone with your own native language',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Speak another language; spend Willpower and feed from another to swap languages.',
        source: 'Players Guide p.103'
      }, {
        id: 'plug_in',
        name: 'Plug-In',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Sanguine',
        duration: 'One scene (light a room) or until half battery (charge a device)',
        dice_pool: 'Resolve + Alchemy',
        opposing_pool: '—',
        notes: 'Low-level current via touch; stops if contact breaks.',
        source: 'Players Guide p.103'
      }, {
        id: 'portable_shade',
        name: 'Portable Shade',
        cost: '1 Rouse',
        origin: 'Sabbat',
        resonance: 'Sanguine',
        duration: 'Hours = Stamina + Alchemy test, or until next sunset (whichever first)',
        dice_pool: 'Stamina + Alchemy',
        opposing_pool: '—',
        notes: 'Walk in sunlight (Path of the Sun development).',
        source: 'Sabbat p.53'
      }, {
        id: 'speak_from_the_heart',
        name: 'Speak From the Heart',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Melancholic',
        duration: 'Message takes 1 minute; lasts until death or blood is drunk',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Embed a message in someone’s blood; the next vampire who drinks receives it. Drinks used affect tone.',
        source: 'Blood Sigils p.75'
      }],
      2: [{
        id: 'advanced_torpor',
        name: 'Advanced Torpor',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Choleric/Phlegmatic',
        duration: 'Until target awakens from torpor',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Induce torpor. Heals as a vampire (always); grants a Rouse reroll unlike normal torpor.',
        source: 'Blood Sigils p.75'
      }, {
        id: 'blacklight_surprise',
        name: 'Blacklight Surprise',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Sanguine/Choleric',
        duration: '≥1 hour (ends if the light source breaks)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Makes UV light damage vampires; those already vulnerable take +1 damage.',
        source: 'Blood Sigils p.75'
      }, {
        id: 'blood_of_mandagloire',
        name: 'Blood of Mandagloire',
        cost: '1 Rouse',
        origin: 'Second Inquisition',
        resonance: 'Melancholic',
        duration: 'Active in herd blood for three nights',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Drinkers fall into dreamless sleep; developed within the Second Inquisition.',
        source: 'Second Inquisition p.46'
      }, {
        id: 'blue_state',
        name: 'Blue State',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Melancholic/Phlegmatic',
        duration: 'Stain persists until an uncomfortable talk happens',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Target obsesses over an ally’s failure. Kindred gain Stains if ally violates convictions; mortals hold grudges.',
        source: 'Blood Sigils p.76'
      }, {
        id: 'envelop',
        name: 'Envelop',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Melancholic/Phlegmatic',
        duration: 'One scene or until ended',
        dice_pool: 'Wits + Alchemy',
        opposing_pool: 'Stamina + Survival',
        notes: 'Mist clings to a single target (one at a time).',
        source: 'Corebook p.285'
      }, {
        id: 'friends_list',
        name: 'Friends List',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Phlegmatic',
        duration: 'One scene',
        dice_pool: 'Intelligence + Alchemy',
        opposing_pool: '—',
        notes: 'See connections between mortals and Kindred; stronger ties require fewer successes.',
        source: 'Players Guide p.104'
      }, {
        id: 'mirror_of_trust',
        name: 'Mirror of Trust',
        cost: '1 Rouse',
        origin: 'Second Inquisition',
        resonance: 'Sanguine',
        duration: 'One hour',
        dice_pool: '—',
        opposing_pool: '—',
        notes: '+3 dice to persuade/intimidate someone into honesty; S.I. development.',
        source: 'Second Inquisition p.46'
      }, {
        id: 'reds_flaming_hot_sauce',
        name: "Red's Flaming Hot Sauce",
        cost: '—',
        origin: 'None',
        resonance: 'Choleric',
        duration: 'Until used (fire lasts a scene or more by surroundings)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Supernatural Molotov; spread fire can be put out, but source cannot.',
        source: "Winter's Teeth p.10"
      }, {
        id: 'whiff_its',
        name: 'Whiff-Its',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Phlegmatic or Sanguine',
        duration: 'Until dawn',
        dice_pool: 'Resolve + Awareness',
        opposing_pool: '—',
        notes: 'Smell/track the highest Blood Potency nearby; tie-breaking via a test to distinguish.',
        source: 'Gehenna War p.50'
      }, {
        id: 'counterfeit_discipline_1dot',
        name: 'Counterfeit Discipline (•)',
        cost: 'Same as power channeled',
        origin: 'None',
        resonance: '—',
        duration: 'As power',
        dice_pool: 'As power',
        opposing_pool: 'As power',
        notes: 'Create a one-dot counterfeit of another Discipline power.',
        source: 'Corebook p.285'
      }],
      3: [{
        id: 'chemically_induced_flashback',
        name: 'Chemically-Induced Flashback',
        cost: '1 Rouse (in addition to using Ashe)',
        origin: 'Ashfinders',
        resonance: '—',
        duration: '—',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Imbue/experience another vampire’s Memorium. Requires Fixatio and Concoct Ashe.',
        source: 'Cults of the Blood Gods p.45'
      }, {
        id: 'concoct_ashe',
        name: 'Concoct Ashe',
        cost: 'Free',
        origin: 'Ashfinders',
        resonance: '—',
        duration: '—',
        dice_pool: 'Intelligence + Alchemy',
        opposing_pool: '—',
        notes: 'Create Ashe from vampire remains. Requires Fixatio.',
        source: 'Cults of the Blood Gods p.45'
      }, {
        id: 'diamond_skin',
        name: 'Diamond Skin',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Melancholic',
        duration: 'Until margin from distillation is spent',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Reduce physical damage; convert Aggravated to Superficial (not vs fire, acid, sunlight, sorcery).',
        source: 'Blood Sigils p.76'
      }, {
        id: 'defractionate',
        name: 'Defractionate',
        cost: 'Free',
        origin: 'None',
        resonance: 'Melancholic/Sanguine',
        duration: '—',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Make preserved blood palatable to any Kindred. Tapping differs by style.',
        source: 'Corebook p.286'
      }, {
        id: 'fang_stinger',
        name: 'Fang-Stinger',
        cost: '1 Rouse',
        origin: 'Second Inquisition',
        resonance: 'Choleric',
        duration: 'One day',
        dice_pool: 'Resolve + Alchemy',
        opposing_pool: 'Stamina + Resolve',
        notes: 'Inoculate a mortal; harms vampires who feed. S.I. development.',
        source: 'Second Inquisition p.47'
      }, {
        id: 'fireskin',
        name: 'Fireskin',
        cost: '1 Rouse',
        origin: 'None',
        resonance: '—',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Superheat your body; +1 fire damage with body strikes; immune to fire but vulnerable to cold.',
        source: 'Blood Sigils p.76'
      }, {
        id: 'freezer_fluid',
        name: 'Freezer Fluid',
        cost: '1 Rouse',
        origin: 'Second Inquisition',
        resonance: 'Melancholic/Phlegmatic',
        duration: 'One scene',
        dice_pool: 'Resolve + Alchemy',
        opposing_pool: 'Stamina + Resolve',
        notes: 'Freeze a vampire’s body. S.I. development.',
        source: 'Second Inquisition p.47'
      }, {
        id: 'hospital_chains',
        name: 'Hospital Chains',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Phlegmatic',
        duration: '2 days per point of margin (crit: 2 days per success)',
        dice_pool: 'Distillation roll vs Stamina',
        opposing_pool: 'Stamina',
        notes: 'Prevent healing.',
        source: 'Blood Sigils p.76'
      }, {
        id: 'mandagloire',
        name: 'Mandagloire',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Phlegmatic',
        duration: 'Three turns',
        dice_pool: 'Stamina + Alchemy',
        opposing_pool: 'Stamina + Resolve',
        notes: 'Emit/parlay a gas that paralyzes mortals & supernaturals; Fixatio can lace a drink or burn.',
        source: 'Players Guide p.104'
      }, {
        id: 'martian_purity',
        name: 'Martian Purity',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Choleric',
        duration: 'Two rounds',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Expel blood-borne illnesses via ignited gases; deals 2 Aggravated Health damage.',
        source: 'Blood Sigils p.77'
      }, {
        id: 'mask_off',
        name: 'Mask Off',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Choleric/Melancholic',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: 'Stamina + Resolve',
        notes: 'Gas explosion (no damage) that cancels Blush of Life for the night; oppose with Distillation pool.',
        source: 'Blood Sigils p.77'
      }, {
        id: 'on_demand_sunburn',
        name: 'On-Demand Sunburn',
        cost: '1 Rouse',
        origin: 'Sabbat',
        resonance: 'Choleric',
        duration: 'Until unleashed or next sunset (first of the two)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Become a sun battery; harm vampires on touch. Path of the Sun formula.',
        source: 'Sabbat p.53'
      }, {
        id: 'profane_hieros_gamos',
        name: 'Profane Hieros Gamos (Errata)',
        cost: '1 Rouse (or 1 Aggravated for mortals)',
        origin: 'None',
        resonance: 'Melancholic/Phlegmatic',
        duration: 'Permanent',
        dice_pool: 'Stamina + Resolve',
        opposing_pool: '—',
        notes: 'Become ideal human form. Does not spare Nosferatu from their bane (errata).',
        source: 'Corebook p.286'
      }, {
        id: 'rumor',
        name: 'Rumor',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Phlegmatic',
        duration: 'One scene (lingers until contradicted)',
        dice_pool: 'Manipulation + Alchemy',
        opposing_pool: 'Wits + Awareness',
        notes: 'Make a statement and convince one person.',
        source: 'Players Guide p.105'
      }, {
        id: 'stay_the_falling_sand',
        name: 'Stay the Falling Sand',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Melancholic',
        duration: 'One round+ if maintained; expires after one use',
        dice_pool: 'Resolve + Alchemy',
        opposing_pool: '—',
        notes: 'Slow time for objects/areas (not living creatures or Kindred).',
        source: "Winter's Teeth p.10"
      }, {
        id: 'tank',
        name: 'Tank',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Choleric',
        duration: 'Until you take damage or scene ends',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'First incoming damage is reduced by five.',
        source: 'Players Guide p.105'
      }, {
        id: 'tlc',
        name: 'TLC',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Animal/Choleric',
        duration: 'Permanent',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Enhance animal blood so it slakes like mortal blood (cannot slake to 0 by killing an animal).',
        source: 'Blood Sigils p.77'
      }, {
        id: 'troll_the_pious',
        name: 'Troll the Pious',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Melancholic',
        duration: 'Varies by what it is smeared on',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Most pools −1 die; True Faith: −2 dice and hallucinations.',
        source: 'Blood Sigils p.78'
      }, {
        id: 'counterfeit_discipline_2dot',
        name: 'Counterfeit Discipline (••)',
        cost: 'Same as power channeled',
        origin: 'None',
        resonance: '—',
        duration: 'As power',
        dice_pool: 'As power',
        opposing_pool: 'As power',
        notes: 'Create a two-dot counterfeit of another Discipline power.',
        source: 'Corebook p.287'
      }],
      4: [{
        id: 'airborne_momentum',
        name: 'Airborne Momentum',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Choleric/Sanguine',
        duration: 'One scene',
        dice_pool: 'Strength + Alchemy',
        opposing_pool: 'Strength + Athletics (if resisted)',
        notes: 'Fly at running speed; carrying a human-sized mass reduces you to walking speed. Self-use only.',
        source: 'Corebook p.287'
      }, {
        id: 'copycat',
        name: 'Copycat',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Choleric/Phlegmatic',
        duration: 'Twenty minutes (up to a scene)',
        dice_pool: '—',
        opposing_pool: 'Intelligence + Awareness',
        notes: 'Approximate copy of a person; acquaintances may recognize differences vs your distillation margin.',
        source: 'Blood Sigils p.78'
      }, {
        id: 'discipline_channeling',
        name: 'Discipline Channeling',
        cost: 'Same as power channeled',
        origin: 'Ashfinders',
        resonance: '—',
        duration: '—',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Imbue Ashe with Disciplines (Fixatio only). Requires Concoct Ashe.',
        source: 'Cults of the Blood Gods p.46'
      }, {
        id: 'half_living_conductor',
        name: 'Half-Living Conductor',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Choleric/Sanguine',
        duration: 'One scene or until ended',
        dice_pool: 'Stamina + Alchemy',
        opposing_pool: '—',
        notes: 'Immune to and can redirect electricity. Attacks use Dexterity + Alchemy; deal 2 damage (Aggravated to mortals, Superficial to vampires).',
        source: 'Blood Sigils p.79'
      }, {
        id: 'hollow_leg',
        name: 'Hollow Leg',
        cost: 'Free',
        origin: 'None',
        resonance: 'Non-Resonant Human Blood',
        duration: 'One night or until the victim Hunger Frenzies',
        dice_pool: 'Intelligence + Alchemy',
        opposing_pool: 'Stamina + Composure',
        notes: 'Poison another Kindred so they cannot slake Hunger; must be tricked/coerced/forced to drink.',
        source: "Winter's Teeth p.10"
      }, {
        id: 'juice_box',
        name: 'Juice Box',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'As target formula',
        duration: 'As target formula',
        dice_pool: 'As target formula',
        opposing_pool: 'As target formula',
        notes: 'Alter a formula for any vampire to use. Requires Methuselah Blood.',
        source: 'Gehenna War p.51'
      }, {
        id: 'red_state',
        name: 'Red State',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Sanguine/Phlegmatic',
        duration: 'Permanent (until target drinks a choleric Dyscrasia)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Erase memory of someone’s misdeeds; being told later makes no sense to the target.',
        source: 'Blood Sigils p.79'
      }, {
        id: 'short_circuit',
        name: 'Short Circuit',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Melancholic',
        duration: '—',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Overload batteries/electronics by touch or connected metal to short them out.',
        source: 'Players Guide p.105'
      }, {
        id: 'toxic_personality',
        name: 'Toxic Personality',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Choleric',
        duration: 'One scene',
        dice_pool: 'Strength/Dexterity + Alchemy',
        opposing_pool: 'Dexterity + Alchemy',
        notes: 'Secrete caustic bile. Use as touch attack or spit (ranged) with an extra Rouse.',
        source: 'Players Guide p.105'
      }, {
        id: 'vitae_msg',
        name: 'Vitae MSG',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Sanguine',
        duration: 'Until dawn (if target survives)',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Makes a target especially tempting. Ventrue need 1 less Willpower when off-preference.',
        source: 'Blood Sigils p.79'
      }, {
        id: 'counterfeit_discipline_3dot',
        name: 'Counterfeit Discipline (•••)',
        cost: 'Same as power channeled',
        origin: 'None',
        resonance: '—',
        duration: 'As power',
        dice_pool: 'As power',
        opposing_pool: 'As power',
        notes: 'Create a three-dot counterfeit of a Discipline. Requires a drop of vitae from a matching clan/owner of the Discipline.',
        source: 'Corebook p.287'
      }],
      5: [{
        id: 'awaken_the_sleeper',
        name: 'Awaken the Sleeper',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Choleric or Sanguine',
        duration: '—',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Awaken a vampire from torpor. Tapping varies by style.',
        source: 'Corebook p.287'
      }, {
        id: 'beast_mode',
        name: 'Beast Mode',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Choleric or Sanguine',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Gain a single level 5 power from Potence, Celerity, or Fortitude. Must pass a Willpower test to avoid Frenzy on consumption.',
        source: 'Gehenna War p.51'
      }, {
        id: 'flowering_amaranth',
        name: 'Flowering Amaranth',
        cost: '1 Rouse per participant',
        origin: 'None',
        resonance: '—',
        duration: 'Used for the act of diablerie',
        dice_pool: 'Resolve + Alchemy',
        opposing_pool: 'Willpower + Blood Potency',
        notes: 'Share diablerie among thin-bloods: gain a Discipline as if full-blooded (cannot increase it), no gen change, −1 Humanity, black-veined aura.',
        source: 'Players Guide p.106'
      }, {
        id: 'moment_of_clarity',
        name: 'Moment of Clarity',
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Phlegmatic',
        duration: 'One scene',
        dice_pool: '—',
        opposing_pool: '—',
        notes: '+4 dice to Mental Skill pools, Discipline Skill pools, and mental resistance vs Disciplines; immune to Messy Criticals and Frenzy.',
        source: 'Players Guide p.106'
      }, {
        id: 'saturns_flux',
        name: "Saturn's Flux",
        cost: '1 Rouse',
        origin: 'None',
        resonance: 'Phlegmatic',
        duration: 'Effect begins one day after ingestion',
        dice_pool: '—',
        opposing_pool: '—',
        notes: 'Break Blood Bonds. Mortals suffer no damage; Kindred must take Aggravated to expel.',
        source: 'Blood Sigils p.80'
      }, {
        id: 'counterfeit_discipline_4dot',
        name: 'Counterfeit Discipline (••••)',
        cost: 'Same as power channeled',
        origin: 'None',
        resonance: '—',
        duration: 'As power',
        dice_pool: 'As power',
        opposing_pool: 'As power',
        notes: 'Create a four-dot counterfeit of a Discipline. Requires a drop of vitae from a matching clan/owner of the Discipline.',
        source: 'Corebook p.287'
      }]
    }
  }
}; // helper to generate placeholder powers per level

exports.DISCIPLINES = DISCIPLINES;

function p(name) {
  return [{
    id: "".concat(slug(name), "_power_a"),
    name: "".concat(name, " Power A")
  }, {
    id: "".concat(slug(name), "_power_b"),
    name: "".concat(name, " Power B")
  }, {
    id: "".concat(slug(name), "_power_c"),
    name: "".concat(name, " Power C")
  }];
}

function slug(s) {
  return s.toLowerCase().replace(/\s+/g, '_');
}