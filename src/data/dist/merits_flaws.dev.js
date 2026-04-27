"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.listAllItems = exports.getCategory = exports.INGRAINED_DISCIPLINE_FLAWS = exports.MERITS_AND_FLAWS = exports.ALL_MF_CATEGORIES = void 0;

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

// src/data/merits_flaws.js
// 🔹 Shared helpers (same slug style as disciplines.js)
var slug = function slug(s) {
  return String(s || '').toLowerCase().trim().replace(/\s+/g, '_');
};

var idFor = function idFor(cat, name) {
  return "".concat(slug(cat), "__").concat(slug(name));
}; // 🔹 Categories list (top-level)


var ALL_MF_CATEGORIES = ['Linguistics', 'Looks', 'Substance Use', 'Archaic', 'Bonding', 'Feeding', 'Mythic', 'Ingrained Discipline Flaws', 'Psychological', 'Contagion', 'Blood Ties', 'Diablerie', 'Other', 'Caitiff', 'Thin-blood', 'Ghouls', 'Cults', 'Backgrounds']; // 🔹 Core data
// dot values are strings so you can render glyphs like "•", "••", or ranges "• - •••"
// restrictions are human-readable filters you can show/parse in the UI (e.g., “Only Ancilla+”)

exports.ALL_MF_CATEGORIES = ALL_MF_CATEGORIES;
var MERITS_AND_FLAWS = {
  // ===== Linguistics =====
  'Linguistics': {
    blurb: 'Merits covering language and the ability to communicate/understand spoken or written language. [1]',
    merits: [{
      id: idFor('Linguistics', 'Linguistics'),
      name: 'Linguistics',
      dots: '• +',
      description: 'Each dot allows the character to read, write, and speak fluently in another language beyond their native tongue and the Domain language.'
    }],
    flaws: [{
      id: idFor('Linguistics', 'Illiterate'),
      name: 'Illiterate',
      dots: '••',
      description: 'Cannot read or write. Academics and Science Skills cannot go beyond 1 dot.'
    }]
  },
  // ===== Looks =====
  'Looks': {
    blurb: 'Related to appearance—supernaturally influenced or not. [1]',
    merits: [{
      id: idFor('Looks', 'Beautiful'),
      name: 'Beautiful',
      dots: '••',
      description: 'Add +1 die to related Social pools.'
    }, {
      id: idFor('Looks', 'Stunning'),
      name: 'Stunning',
      dots: '••••',
      description: 'Add +2 dice to related Social pools.'
    }, {
      id: idFor('Looks', 'Semblance of the Methuselah'),
      name: 'Semblance of the Methuselah',
      dots: '• - ••',
      description: 'A striking resemblance to a methuselah grants +1 die to impress/intimidate/attract those who recognize the face (plus situational bonuses at ST discretion).'
    }, {
      id: idFor('Looks', 'Famous Face'),
      name: 'Famous Face',
      dots: '•',
      description: 'Resemble someone famous: +2 dice in social tests where this helps; −2 dice to avoid recognition/hide in a crowd.'
    }, {
      id: idFor('Looks', 'Ingénue'),
      name: 'Ingénue',
      dots: '•',
      description: 'Appear innocent and blameless: +2 dice to avoid suspicion or deflect blame (ST discretion).'
    }, {
      id: idFor('Looks', 'Remarkable Feature'),
      name: 'Remarkable Feature',
      dots: '•',
      description: 'Rare/memorable feature: +2 dice with strangers; −1 die to disguise.'
    }, {
      id: idFor('Looks', 'Up All Night'),
      name: 'Up All Night',
      dots: '•• or ••••',
      description: 'Treat Humanity as +1 (max 10), or +2 at four dots, for Blush of Life, eating, drinking, or sex.'
    }, {
      id: idFor('Looks', 'Scene Kid'),
      name: 'Scene Kid',
      dots: '•',
      description: "The player's style embodies that of a particular subculture. Add one die to all appropriate Social pools when dealing with that subculture."
    }],
    flaws: [{
      id: idFor('Looks', 'Ugly'),
      name: 'Ugly',
      dots: '•',
      description: '−1 die from related Social pools.'
    }, {
      id: idFor('Looks', 'Repulsive'),
      name: 'Repulsive',
      dots: '••',
      description: '−2 dice from related Social pools.'
    }, {
      id: idFor('Looks', 'Stench'),
      name: 'Stench',
      dots: '•',
      description: 'Supernaturally foul odor: −1 die to seduction/social pools; −2 dice to Stealth unless upwind.'
    }, {
      id: idFor('Looks', 'Transparent'),
      name: 'Transparent',
      dots: '•',
      description: 'Unable to lie effectively: −1 die to any pools requiring Subterfuge; cannot buy dots in Subterfuge.'
    }, {
      id: idFor('Looks', 'Unblinking Visage'),
      name: 'Unblinking Visage',
      dots: '••',
      description: 'Treat Humanity as −2 (min 0) for Blush of Life, eating, drinking, sex.'
    }]
  },
  // ===== Substance Use =====
  'Substance Use': {
    blurb: 'Merits/Flaws revolving around prey with drugs in their system; substance effects still apply. [1]',
    merits: [{
      id: idFor('Substance Use', 'High Functioning Addict'),
      name: 'High Functioning Addict',
      dots: '•',
      description: 'If the last feeding contained the desired drug: +1 die to either a Physical, Social, or Mental pool (choose).'
    }],
    flaws: [{
      id: idFor('Substance Use', 'Addiction'),
      name: 'Addiction',
      dots: '•',
      description: 'If last feeding was not on the chosen drug: −1 die to all pools (unless the action is to get the drug).'
    }, {
      id: idFor('Substance Use', 'Hopeless Addiction'),
      name: 'Hopeless Addiction',
      dots: '••',
      description: 'If last feeding was not on the chosen drug: −2 dice to all pools (unless the action is to get the drug).'
    }]
  },
  // ===== Archaic =====
  'Archaic': {
    blurb: 'Flaws/merits for Ancilla or older vampires. [6]',
    merits: [{
      id: idFor('Archaic', 'Custodian of History'),
      name: 'Custodian of History',
      dots: '•',
      description: '+1 to relevant Skill tests about a chosen period/figure in Kindred lore.'
    }],
    flaws: [{
      id: idFor('Archaic', 'Living in the Past'),
      name: 'Living in the Past',
      dots: '•',
      description: "Struggles with modern mindsets; one or more Convictions reflect outdated views."
    }, {
      id: idFor('Archaic', 'Archaic'),
      name: 'Archaic',
      dots: '••',
      description: 'Cannot use computers/cellphones; Technology rating is always 0.'
    }, {
      id: idFor('Archaic', 'Grief Phobia'),
      name: 'Grief Phobia',
      dots: '•',
      description: '−1 die to all tests while in the presence of the phobic stimulus.'
    }, {
      id: idFor('Archaic', 'Old Tricks'),
      name: 'Old Tricks',
      dots: '•',
      description: 'All specialties must be archaic (period-appropriate).'
    }]
  },
  // ===== Bonding =====
  'Bonding': {
    blurb: 'Used to tweak Blood Bond behavior. [6] (Some from Gehenna War)',
    merits: [{
      id: idFor('Bonding', 'Bond Resistance'),
      name: 'Bond Resistance',
      dots: '• - •••',
      description: '+1 die per dot to resist Blood Bonds.'
    }, {
      id: idFor('Bonding', 'Short Bond'),
      name: 'Short Bond',
      dots: '••',
      description: 'Bond levels decrease by two per month if not reinforced.'
    }, {
      id: idFor('Bonding', 'Unbondable'),
      name: 'Unbondable',
      dots: '•••••',
      description: 'Cannot be Blood Bonded.'
    }, {
      id: idFor('Bonding', 'Bonds of Fealty'),
      name: 'Bonds of Fealty',
      dots: '•••',
      description: 'Dominate does not require eye contact on those bound to you (requires Dominate).'
    }, {
      id: idFor('Bonding', 'Enduring Bond'),
      name: 'Enduring Bond',
      dots: '•',
      description: 'Bonds you create fade slower (weaken every other month).'
    }],
    flaws: [{
      id: idFor('Bonding', 'Bond Junkie'),
      name: 'Bond Junkie',
      dots: '•',
      description: 'Lose −1 die when acting against Blood Bonds.'
    }, {
      id: idFor('Bonding', 'Long Bond'),
      name: 'Long Bond',
      dots: '•',
      description: 'Bonds fade slower: −1 level every 3 months.'
    }, {
      id: idFor('Bonding', 'Bondslave'),
      name: 'Bondslave',
      dots: '••',
      description: 'Bond instantly with one drink (not three).'
    }, {
      id: idFor('Bonding', 'Two Masters'),
      name: 'Two Masters',
      dots: '•',
      description: 'Can be Blood Bound to two individuals at once.'
    }]
  },
  // ===== Feeding =====
  'Feeding': {
    blurb: 'Merits/Flaws related to the act of feeding; taking one does not require others. [10]',
    merits: [{
      id: idFor('Feeding', 'Bloodhound'),
      name: 'Bloodhound',
      dots: '•',
      description: 'Sniff out resonances without tasting.'
    }, {
      id: idFor('Feeding', 'Iron Gullet'),
      name: 'Iron Gullet',
      dots: '•••',
      description: 'Consume rancid/defractionated/otherwise inedible blood for others.'
    }, {
      id: idFor('Feeding', 'Vessel Recognition'),
      name: 'Vessel Recognition',
      dots: '•',
      description: 'Resolve + Awareness (Diff 2) to tell if a mortal was fed on recently; crit reveals if feed recurs.'
    }, {
      id: idFor('Feeding', 'Drive-thru'),
      name: 'Drive-thru',
      dots: '•',
      description: 'Safely complete a hunt within minutes while on the move by increasing the difficulty by 1.'
    }, {
      id: idFor('Feeding', 'Vein Tapper'),
      name: 'Vein Tapper',
      dots: '•',
      description: 'Prefers personal/unaware feeding (drugged, unconscious, etc.).'
    }],
    flaws: [{
      id: idFor('Feeding', 'Prey Exclusion'),
      name: 'Prey Exclusion',
      dots: '•',
      description: 'Cannot feed from a chosen group; doing so causes Stains as if breaking a Tenet.'
    }, {
      id: idFor('Feeding', "Methuselah's Thirst"),
      name: "Methuselah's Thirst",
      dots: '•',
      description: 'Only Supernatural blood slakes to 0.'
    }, {
      id: idFor('Feeding', 'Farmer'),
      name: 'Farmer',
      dots: '••',
      description: 'Must spend 2 Willpower to feed on human blood. (Ventrue cannot take.)'
    }, {
      id: idFor('Feeding', 'Organovore'),
      name: 'Organovore',
      dots: '••',
      description: 'Can only slake by consuming human flesh and organs.'
    }, {
      id: idFor('Feeding', 'Outdated Preference'),
      name: 'Outdated Preference',
      dots: '••',
      description: 'Either force mortals to fit preference or always spend 1 WP to feed.'
    }, {
      id: idFor('Feeding', 'Resonance Sensitivity'),
      name: 'Resonance Sensitivity',
      dots: '•',
      description: 'One resonance really messes with the character, causing a unique compulsion.'
    }, {
      id: idFor('Feeding', 'Resonance Mimic'),
      name: 'Resonance Mimic',
      dots: '••',
      description: 'The character gets influenced and penalized from the memories of their victim.'
    }, {
      id: idFor('Feeding', 'Sloppy Feeder'),
      name: 'Sloppy Feeder',
      dots: '••',
      description: 'The pattern of attacks when feeding is telltale enough to identify. One attack can be linked to previous attacks.'
    }, {
      id: idFor('Feeding', 'Starving Decay'),
      name: 'Starving Decay',
      dots: '••',
      description: 'At Hunger 3+, body shrivels; −2 dice Physical tests & mortal socials; risks Masquerade.'
    }]
  },
  // ===== Mythic =====
  'Mythic': {
    blurb: 'Tied to vampire mythos. [13]',
    merits: [{
      id: idFor('Mythic', 'Eat Food'),
      name: 'Eat Food',
      dots: '••',
      description: 'Can consume food (no nourishment). It must be expelled before resting for the day.'
    }, {
      id: idFor('Mythic', 'Cold Dead Hunger'),
      name: 'Cold Dead Hunger',
      dots: '•••',
      description: '+2 dice to resist Hunger Frenzy.'
    }, {
      id: idFor('Mythic', 'Pack Diablerie'),
      name: 'Pack Diablerie',
      dots: '••',
      description: 'You take the soul during Diablerie unless you choose otherwise; helping another grants 5 XP as if you had committed it.'
    }, {
      id: idFor('Mythic', 'Luck of the Devil'),
      name: 'Luck of the Devil',
      dots: '••••',
      description: 'Once per session redirect misfortune to someone close to the victim.'
    }, {
      id: idFor('Mythic', 'Nuit Mode'),
      name: 'Nuit Mode',
      dots: '••',
      description: "Body doesn't revert each night; keep new haircuts/body mods (mend like Aggravated). Not for BP > 1."
    }, {
      id: idFor('Mythic', 'Object of Power'),
      name: 'Object of Power',
      dots: '• - •••',
      description: '• Reroll 1 die per story (excl. Hunger). •• +1 die to all L1 Rituals. ••• Free danger premonition once/session.'
    }, {
      id: idFor('Mythic', 'Ley Line Leach'),
      name: 'Ley Line Leach',
      dots: '•',
      description: 'Follow ancient paths of power while traveling. After traveling to a different city/locale, negate the need for a Rouse Check for the next night.'
    }, {
      id: idFor('Mythic', 'Persistent Blush'),
      name: 'Persistent Blush',
      dots: '•••',
      description: 'A single activation of Blush of Life lasts 1 week.'
    }],
    flaws: [{
      id: idFor('Mythic', 'Folkloric Bane'),
      name: 'Folkloric Bane',
      dots: '•',
      description: 'Take Aggravated from a specific mythic object (e.g., silver).'
    }, {
      id: idFor('Mythic', 'Folkloric Block'),
      name: 'Folkloric Block',
      dots: '•',
      description: 'Must spend Willpower or flee a mythic object (e.g., holy symbol).'
    }, {
      id: idFor('Mythic', 'Stigmata'),
      name: 'Stigmata',
      dots: '•',
      description: 'Bleed from hands/feet/forehead at Hunger 4.'
    }, {
      id: idFor('Mythic', 'Stake Bait'),
      name: 'Stake Bait',
      dots: '••',
      description: 'Meeting a stake results in Final Death.'
    }, {
      id: idFor('Mythic', 'Twice Cursed'),
      name: 'Twice Cursed',
      dots: '••',
      description: "Gain a second Clan's variant Bane in addition to your own (ST approval)."
    }, {
      id: idFor('Mythic', 'Land Locked'),
      name: 'Land Locked',
      dots: '•',
      description: 'Unable to leave the land, the player must make a Fear Frenzy test at Difficulty 3 to board a boat or plane.'
    }, {
      id: idFor('Mythic', 'Resistant Blush'),
      name: 'Resistant Blush',
      dots: '•',
      description: 'When rolling a Rouse Check for Blush of Life, roll twice and take the lowest result.'
    }, {
      id: idFor('Mythic', 'Corpse Flesh'),
      name: 'Corpse Flesh',
      dots: '•',
      description: 'Unable to use Blush of Life.'
    }]
  },
  // ===== Psychological =====
  'Psychological': {
    blurb: 'Belief/cult-adjacent merits. Some from Blood Stained Love. [19]',
    merits: [{
      id: idFor('Psychological', 'Unholy Will'),
      name: 'Unholy Will',
      dots: '•• or ••••',
      description: 'Vs True Faith: +1 die and −1 holy damage at ••; +2 dice and −2 damage at ••••.'
    }, {
      id: idFor('Psychological', 'Zealotry'),
      name: 'Zealotry',
      dots: '• - •••',
      description: 'Once/session per dot: turn a normal success (aligned to a Conviction) into a Messy Critical.'
    }, {
      id: idFor('Psychological', 'Penitence'),
      name: 'Penitence',
      dots: '• - •••••',
      description: 'Once/session: take 1 Superficial Health to clear 1 Superficial Willpower.'
    }, {
      id: idFor('Psychological', 'Soothed Beast'),
      name: 'Soothed Beast',
      dots: '•',
      description: 'With an SPC obsession: once/session ignore one Bestial or Messy Critical (gain 3 Stains if SPC dies).'
    }, {
      id: idFor('Psychological', 'False Love'),
      name: 'False Love',
      dots: '•',
      description: "With an SPC obsession: treat Humanity as +1 (max 10) for Blush/eat/drink/sex near them; gain 3 Stains if they die."
    }],
    flaws: [{
      id: idFor('Psychological', 'Beacon of Profanity'),
      name: 'Beacon of Profanity',
      dots: '•',
      description: 'Mortals with any True Faith sense your presence.'
    }, {
      id: idFor('Psychological', 'Crisis of Faith'),
      name: 'Crisis of Faith',
      dots: '•',
      description: 'On a Bestial Failure: take 1 Superficial Willpower damage.'
    }, {
      id: idFor('Psychological', 'Horrible Scars of Penitence'),
      name: 'Horrible Scars of Penitence',
      dots: '•',
      description: 'Equivalent to Repulsive when around those outside the cult.'
    }, {
      id: idFor('Psychological', 'Groveling Worm'),
      name: 'Groveling Worm',
      dots: '••',
      description: 'Must scourge flesh once per session for 2 Superficial Health or suffer 1 Aggravated Willpower next session. (Incompatible with Penitence.)'
    }]
  },
  // ===== Contagion =====
  'Contagion': {
    blurb: 'Blood-borne illness themed. [20] (Flaws only)',
    merits: [],
    flaws: [{
      id: idFor('Contagion', 'Disease Vector'),
      name: 'Disease Vector',
      dots: '•',
      description: 'Always contract illnesses when feeding on the sick and pass it to the next vessel.'
    }, {
      id: idFor('Contagion', 'Plaguebringer'),
      name: 'Plaguebringer',
      dots: '• - ••',
      description: 'Carries an unremovable disease. • minor but visible; •• potentially fatal if untreated; spreads via bite.'
    }]
  },
  // ===== Blood Ties =====
  'Blood Ties': {
    blurb: 'Lineage-related (Caitiff & Duskborn also have lineages).',
    merits: [{
      id: idFor('Blood Ties', 'Consanguineous Sense'),
      name: 'Consanguineous Sense',
      dots: '••',
      description: 'Detect whether another Kindred is in your direct bloodline (not their Generation).'
    }, {
      id: idFor('Blood Ties', 'Consanguineous Influence'),
      name: 'Consanguineous Influence',
      dots: '••',
      description: 'Bonus dice on Mental Disciplines vs own Clan/ancestor/descendant (+2 dice within ±2 generations).'
    }, {
      id: idFor('Blood Ties', 'Sins of the Father'),
      name: 'Sins of the Father',
      dots: '•• or •••',
      description: 'Show no signs after diablerizing a direct ancestor/descendant; at ••• extends to entire clan.'
    }],
    flaws: []
  },
  // ===== Diablerie =====
  'Diablerie': {
    blurb: 'Flaws typically require the character to have committed Diablerie.',
    merits: [],
    flaws: [{
      id: idFor('Diablerie', 'Blatant Diablerist'),
      name: 'Blatant Diablerist',
      dots: '•',
      description: 'Powers/Merits sensing Diablerie always reveal it on you.'
    }, {
      id: idFor('Diablerie', 'Inherited Bane'),
      name: 'Inherited Bane',
      dots: '••',
      description: "Gain another Clan's Bane in addition to your own (Tremere can use this to gain Salubri Bane)."
    }]
  },
  // ===== Other =====
  'Other': {
    blurb: 'Miscellaneous merits and flaws.',
    merits: [{
      id: idFor('Other', 'Check the Trunk'),
      name: 'Check the Trunk',
      dots: '•',
      description: 'Access to a modest armory/cache (≤ Resources 2 items). +2 dice to Preparation rolls.'
    }, {
      id: idFor('Other', 'Side Hustler'),
      name: 'Side Hustler',
      dots: '••',
      description: 'Once/session get an item, info, or access as if you had 2 dots in Resources/Contacts/Influence.'
    }, {
      id: idFor('Other', 'Tempered Will'),
      name: 'Tempered Will',
      dots: '•••',
      description: 'Always feel Dominate/Presence attempts; once/session add +2 dice to a resistance pool. (Only if you have no dots in Dominate or Presence.)'
    }, {
      id: idFor('Other', 'Untouchable'),
      name: 'Untouchable',
      dots: '•••••',
      description: 'Once per story, escape all official punishment that would otherwise destroy you.'
    }, {
      id: idFor('Other', 'Mystic of the Void'),
      name: 'Mystic of the Void',
      dots: '• or ••',
      description: 'Count as knowing one Oblivion Power for ceremony prerequisites (Hecata/Lasombra choose three instead of one).',
      requiresPowerSelection: true,
      targetDiscipline: 'Oblivion'
    }],
    flaws: [{
      id: idFor('Other', 'Knowledge Hungry'),
      name: 'Knowledge Hungry',
      dots: '•',
      description: 'Pick a topic at creation; when learning it, must roll Willpower (Diff 3) to resist pursuing.'
    }, {
      id: idFor('Other', 'Prestation Debts'),
      name: 'Prestation Debts',
      dots: '•',
      description: 'Owe Kindred boons; boon-holder gains +1 die in Social conflict against you while leveraging this.'
    }, {
      id: idFor('Other', 'Risk-Taker Errata'),
      name: 'Risk-Taker Errata',
      dots: '•',
      description: 'When tempted by a new risky act, −2 dice to all actions until you do it or the scene ends.'
    }, {
      id: idFor('Other', 'Weak-Willed'),
      name: 'Weak-Willed',
      dots: '••',
      description: 'Even when aware, you cannot use active resistance systems to avoid attempts to sway you.'
    }]
  },
  // ===== Caitiff (only) =====
  'Caitiff': {
    blurb: 'Only available to Caitiff. [22]',
    merits: [{
      id: idFor('Caitiff', 'Favored Blood'),
      name: 'Favored Blood',
      dots: '••••',
      description: 'May purchase any Discipline without tasting another’s vitae first. (Incompatible with Muddled Blood.)',
      restrictions: 'Caitiff only'
    }, {
      id: idFor('Caitiff', 'Mark of Caine'),
      name: 'Mark of Caine',
      dots: '••',
      description: 'Gain +2 dice to intimidate/bully believers in Caine; attackers cannot add BP to diablerie roll; failure = Bestial failure.',
      restrictions: 'Caitiff only'
    }, {
      id: idFor('Caitiff', 'Mockingbird'),
      name: 'Mockingbird',
      dots: '•••',
      description: "For one night after drinking a vampire's Blood: use one of their Disciplines (≤ your highest Discipline). You suffer their Bane for the night.",
      restrictions: 'Caitiff only'
    }, {
      id: idFor('Caitiff', 'Sun-Scarred'),
      name: 'Sun-Scarred',
      dots: '•••••',
      description: 'First turn of sunlight: no Health damage, take 1 Aggravated Willpower, auto-succeed on Terror Frenzy; rest of scene: sun damage becomes Superficial.',
      restrictions: 'Caitiff only'
    }, {
      id: idFor('Caitiff', 'Uncle Fangs'),
      name: 'Uncle Fangs',
      dots: '•••',
      description: 'Allied local coterie of 3–5 thin-bloods (treat as Allies). Incompatible with Liquidator.',
      restrictions: 'Caitiff only'
    }],
    flaws: [{
      id: idFor('Caitiff', 'Befouling Vitae'),
      name: 'Befouling Vitae',
      dots: '••',
      description: 'Any mortal you Embrace or kill by feeding returns as a wight within nights.'
    }, {
      id: idFor('Caitiff', 'Clan Curse'),
      name: 'Clan Curse',
      dots: '••',
      description: 'Suffer a halved-severity Clan Bane (min 1).'
    }, {
      id: idFor('Caitiff', 'Debt Peon'),
      name: 'Debt Peon',
      dots: '••',
      description: 'Owe boons to a high-status vampire; they gain +2 dice in Social combat when others are present.'
    }, {
      id: idFor('Caitiff', 'Liquidator'),
      name: 'Liquidator',
      dots: '•',
      description: '−2 dice to Social pools against thin-bloods (except Intimidation). Incompatible with Uncle Fangs.'
    }, {
      id: idFor('Caitiff', 'Muddled Blood'),
      name: 'Muddled Blood',
      dots: '•',
      description: 'Must drink Blood of someone with a Discipline to buy dots in it. Incompatible with Favored Blood.'
    }, {
      id: idFor('Caitiff', 'Walking Omen'),
      name: 'Walking Omen',
      dots: '••',
      description: 'Divinations point to you as the source of misfortune (ST adjudication).'
    }, {
      id: idFor('Caitiff', 'Word-Scarred'),
      name: 'Word-Scarred',
      dots: '•',
      description: 'Body covered with ancient vampiric lore text (ST adjudication).'
    }]
  },
  // ===== Thin-blood (only) =====
  'Thin-blood': {
    blurb: 'Only Thin-bloods may take these. [23]',
    merits: [{
      id: idFor('Thin-blood', 'Anarch Comrades'),
      name: 'Anarch Comrades',
      dots: '—',
      description: 'Acts as 1-dot Anarch Mawla.'
    }, {
      id: idFor('Thin-blood', 'Camarilla Contact'),
      name: 'Camarilla Contact',
      dots: '—',
      description: 'Acts as 1-dot Camarilla Mawla.'
    }, {
      id: idFor('Thin-blood', 'Catenating Blood'),
      name: 'Catenating Blood',
      dots: '—',
      description: 'Can create Blood Bonds and embrace thin-bloods.'
    }, {
      id: idFor('Thin-blood', 'Day Drinker'),
      name: 'Day Drinker',
      dots: '—',
      description: 'Walk in the sun; halves Health tracker; removes vampiric abilities in sunlight.'
    }, {
      id: idFor('Thin-blood', 'Discipline Affinity'),
      name: 'Discipline Affinity',
      dots: '—',
      description: 'Natural knack for one Discipline; gain 1 dot; retain extra levels at out-of-clan costs.'
    }, {
      id: idFor('Thin-blood', 'Lifelike'),
      name: 'Lifelike',
      dots: '—',
      description: 'Heartbeat, can eat food, enjoy sex; most medical checks pass at night.'
    }, {
      id: idFor('Thin-blood', 'Thin-blood Alchemist'),
      name: 'Thin-blood Alchemist',
      dots: '—',
      description: 'Gain 1 dot and 1 formula of Thin-blood Alchemy.'
    }, {
      id: idFor('Thin-blood', 'Vampiric Resilience'),
      name: 'Vampiric Resilience',
      dots: '—',
      description: 'Take damage like a full vampire.'
    }, {
      id: idFor('Thin-blood', 'Abhorrent Blood'),
      name: 'Abhorrent Blood',
      dots: '—',
      description: 'Vampires must spend 2 WP each turn to drink from you (mortals/TBA unaffected).'
    }, {
      id: idFor('Thin-blood', 'Faith-Proof'),
      name: 'Faith-Proof',
      dots: '—',
      description: 'Too close to mortality for True Faith to affect you.'
    }, {
      id: idFor('Thin-blood', 'Low Appetite'),
      name: 'Low Appetite',
      dots: '—',
      description: 'At sunset with Hunger 0–1, roll 2 dice for Rouse and take the highest.'
    }, {
      id: idFor('Thin-blood', 'Lucid Dreamer'),
      name: 'Lucid Dreamer',
      dots: '—',
      description: 'Once/session receive a clue from prior night or a hint about the story.'
    }, {
      id: idFor('Thin-blood', "Mortality's Mien"),
      name: "Mortality's Mien",
      dots: '—',
      description: "Auras don't reveal vampiric nature; +2 dice to appear mortal via other methods."
    }, {
      id: idFor('Thin-blood', 'Swift Feeder'),
      name: 'Swift Feeder',
      dots: '—',
      description: 'Slake 1 Hunger in a turn and lick closed once/scene.'
    }],
    flaws: [{
      id: idFor('Thin-blood', 'Shunned by the Anarchs'),
      name: 'Shunned by the Anarchs',
      dots: '—',
      description: 'Anarchs avoid you; more likely to throw you to Camarilla.'
    }, {
      id: idFor('Thin-blood', 'Branded by the Camarilla'),
      name: 'Branded by the Camarilla',
      dots: '—',
      description: 'Unhealable painful brand; can still take Camarilla Contact.'
    }, {
      id: idFor('Thin-blood', 'Bestial Temper'),
      name: 'Bestial Temper',
      dots: '—',
      description: 'Frenzy as per full vampire rules.'
    }, {
      id: idFor('Thin-blood', 'Clan Curse'),
      name: 'Clan Curse',
      dots: '—',
      description: 'Gain a clan bane (Bane Severity 1); restricted options if certain merits taken.'
    }, {
      id: idFor('Thin-blood', 'Vitae Dependency'),
      name: 'Vitae Dependency',
      dots: '—',
      description: 'Must slake 1 Hunger of vampire vitae each week or lose all vampiric powers.'
    }, {
      id: idFor('Thin-blood', 'Dead Flesh'),
      name: 'Dead Flesh',
      dots: '—',
      description: 'Medical inspections report deceased; −1 die to face-to-face Social vs mortals. (Incompatible with Lifelike.)'
    }, {
      id: idFor('Thin-blood', 'Baby Teeth'),
      name: 'Baby Teeth',
      dots: '—',
      description: 'Fangs never developed or are too dull to feed.'
    }, {
      id: idFor('Thin-blood', 'Mortal Frailty'),
      name: 'Mortal Frailty',
      dots: '—',
      description: 'Mend like a mortal; cannot rouse the blood. (Incompatible with Vampiric Resilience.)'
    }, {
      id: idFor('Thin-blood', 'Heliophobia'),
      name: 'Heliophobia',
      dots: '—',
      description: 'Fear sunlight like full vampire; terror Frenzy from sunlight.'
    }, {
      id: idFor('Thin-blood', 'Night Terrors'),
      name: 'Night Terrors',
      dots: '—',
      description: 'Once/session suffer −1 die for all actions for rest of scene.'
    }, {
      id: idFor('Thin-blood', 'Plague Bearers'),
      name: 'Plague Bearers',
      dots: '—',
      description: 'Susceptible to mortal illness; risk on every feed; mortal meds fail.'
    }, {
      id: idFor('Thin-blood', 'Sloppy Drinker'),
      name: 'Sloppy Drinker',
      dots: '—',
      description: 'Dex + Medicine vs Diff = Hunger slaked; fail leaves ragged wound (Masquerade risk).'
    }, {
      id: idFor('Thin-blood', 'Sun-Faded'),
      name: 'Sun-Faded',
      dots: '—',
      description: 'Alchemy/Disciplines unusable in sunlight; indoors by day at −2 dice if away from sunlight.'
    }, {
      id: idFor('Thin-blood', 'Supernatural Tell'),
      name: 'Supernatural Tell',
      dots: '—',
      description: 'Obvious to supernaturals; −2 dice to Stealth vs them.'
    }, {
      id: idFor('Thin-blood', 'Twilight Presence'),
      name: 'Twilight Presence',
      dots: '—',
      description: 'Mortals avoid you; −1 die to Social pools vs others (not thin-bloods).'
    }, {
      id: idFor('Thin-blood', 'Unending Hunger'),
      name: 'Unending Hunger',
      dots: '—',
      description: 'When feeding this scene, slake 1 fewer (once per scene).'
    }]
  },
  // ===== Ghouls =====
  'Ghouls': {
    blurb: 'Only ghouls may take these. ST decides if lost after Embrace/major changes. [26]',
    merits: [{
      id: idFor('Ghouls', 'Blood Empathy'),
      name: 'Blood Empathy',
      dots: '••',
      description: 'Sense if your regnant is in danger/needing you (no telepathy).',
      restrictions: 'Ghouls only'
    }, {
      id: idFor('Ghouls', 'Unseemly Aura'),
      name: 'Unseemly Aura',
      dots: '••',
      description: "Aura indistinguishable from Kindred's.",
      restrictions: 'Ghouls only'
    }],
    flaws: [{
      id: idFor('Ghouls', 'Baneful Blood'),
      name: 'Baneful Blood (Errata)',
      dots: '• - ••',
      description: 'Experiences the Bane of first domitor (Lasombra, Malkavian, Ministry, Nosferatu, Ravnos, Salubri, or Toreador).'
    }, {
      id: idFor('Ghouls', "Crone's Curse"),
      name: "Crone's Curse (Errata)",
      dots: '••',
      description: 'Appears a decade older; −1 Health box.'
    }, {
      id: idFor('Ghouls', 'Distressing Fangs'),
      name: 'Distressing Fangs (Errata)',
      dots: '•',
      description: 'Developed fangs; −1 die to Social with mortals.'
    }]
  },
  // ===== Cults =====
  'Cults': {
    blurb: 'Some items tied to specific cults; adapt as needed. [27]',
    merits: [{
      id: idFor('Cults', 'Apocryphal Texts'),
      name: 'Apocryphal Texts',
      dots: '•',
      description: 'The character possesses writings from one of the church\'s leaders. Gain two dice on applicable Intelligence rolls. (Can add a 1 dot optional Flaw where Willpower damage modifier for social combat is increased by 1).'
    }, {
      id: idFor('Cults', 'Inspired Artist'),
      name: 'Inspired Artist',
      dots: '••',
      description: 'When using the cult\'s symbols or message in art, add a 1-die penalty to onlookers to resist Social rolls from cult members.'
    }, {
      id: idFor('Cults', 'Traveling Preacher'),
      name: 'Traveling Preacher',
      dots: '••',
      description: 'Having spread the cult\'s message where they go, reduce the difficulty on rolls to avoid the Second Inquisition by 1.'
    }],
    flaws: [{
      id: idFor('Cults', 'Excommunicated'),
      name: 'Excommunicated',
      dots: '• - ••',
      description: 'They\'ve done something to be cast out. At 1 dot, subtract 2 dice from all rolls dealing with the cult. At 2 dots, the cult actively seeks to destroy you.'
    }, {
      id: idFor('Cults', 'Faithless'),
      name: 'Faithless',
      dots: '••',
      description: 'Being a member for the benefits. Lose two dice on rolls pertaining to the Cult from Resolve and Composure rolls. Cannot learn Rituals, Ceremonies, and Loresheets higher than level 2.'
    }],
    // Nested by cult name for easy grouping in UI
    groups: {
      'Ashfinders': {
        merits: [{
          id: idFor('Cults Ashfinders', 'Memories of the Fallen (Thin-bloods)'),
          name: 'Memories of the Fallen (Thin-bloods)',
          dots: '••',
          description: 'On Ashe-related Alchemy rolls, one rolled 10 counts as two 10s (two 10s still count as four).'
        }, {
          id: idFor('Cults Ashfinders', 'Streamer'),
          name: 'Streamer',
          dots: '••',
          description: 'Once per story, call upon your fanbase for a simple, non-violent task.'
        }],
        flaws: [{
          id: idFor('Cults Ashfinders', 'Ashe Addiction'),
          name: 'Ashe Addiction',
          dots: '••',
          description: 'After a failed Blood Alchemy roll, −2 dice to all actions until session ends.'
        }]
      },
      'Bahari': {
        merits: [{
          id: idFor('Cults Bahari', 'Gardener'),
          name: 'Gardener',
          dots: '• - •••••',
          description: 'Equivalent to Herd for the Bahari faith.'
        }, {
          id: idFor('Cults Bahari', "Dark Mother's Song"),
          name: "Dark Mother's Song",
          dots: '••',
          description: '+3 dice to Manipulation when convincing others to worship Lilith.'
        }],
        flaws: []
      },
      'Church of Caine': {
        merits: [{
          id: idFor('Cults Church of Caine', 'Fire Resistant'),
          name: 'Fire Resistant',
          dots: '•',
          description: 'Convert a limited amount of Aggravated fire damage to Superficial during daysleep (per rules).'
        }],
        flaws: [{
          id: idFor('Cults Church of Caine', 'Schism (Lasombra)'),
          name: 'Schism (Lasombra)',
          dots: '•',
          description: '−2 dice to Social rolls with members of your cult.'
        }]
      },
      'Church of Set': {
        merits: [{
          id: idFor('Cults Church of Set', 'Vigilant'),
          name: 'Vigilant',
          dots: '••',
          description: 'Know when you are being watched (not supernatural); still need a roll to identify who/where.'
        }, {
          id: idFor('Cults Church of Set', 'Fixer'),
          name: 'Fixer',
          dots: '••',
          description: 'Once per story, call in a favor or threaten a former client.'
        }, {
          id: idFor('Cults Church of Set', 'Go to Ground'),
          name: 'Go to Ground',
          dots: '•',
          description: '+2 dice when evading pursuit.'
        }],
        flaws: [{
          id: idFor('Cults Church of Set', 'False Alarm'),
          name: 'False Alarm',
          dots: '•',
          description: 'Every failed Awareness roll counts as a total failure.'
        }]
      },
      'Cult of Shalim': {
        merits: [{
          id: idFor('Cults Shalim', 'Insidious Whispers'),
          name: 'Insidious Whispers',
          dots: '••',
          description: 'When undermining a Conviction, one rolled 10 counts as two 10s; two 10s still count as four.'
        }, {
          id: idFor('Cults Shalim', 'Gematria'),
          name: 'Gematria',
          dots: '•',
          description: 'Understand/encode a specific cipher system.'
        }],
        flaws: [{
          id: idFor('Cults Shalim', 'Empty'),
          name: 'Empty',
          dots: '•',
          description: 'People withdraw from your unnerving presence: −2 dice on Social rolls.'
        }]
      },
      'Mithraic Mysteries': {
        merits: [{
          id: idFor('Cults Mithraic', 'Bull-Slayer'),
          name: 'Bull-Slayer',
          dots: '•••',
          description: 'On Extended Tests, reroll up to 3 regular dice once/scene without WP.'
        }, {
          id: idFor('Cults Mithraic', 'Bargainer'),
          name: 'Bargainer',
          dots: '•',
          description: '−1 Difficulty to assess a transaction.'
        }],
        flaws: [{
          id: idFor('Cults Mithraic', 'Failed Initiate'),
          name: 'Failed Initiate',
          dots: '•',
          description: 'Assigned a meddling guide who interrupts plans/demands proof of worth.'
        }]
      },
      'Nephilim': {
        merits: [{
          id: idFor('Cults Nephilim', "Archangel's Grace"),
          name: "Archangel's Grace",
          dots: '•••',
          description: 'Swap Athletics ↔ Performance when doing heavy-cardio-like acts.'
        }],
        flaws: [{
          id: idFor('Cults Nephilim', 'Yearning'),
          name: 'Yearning',
          dots: '•',
          description: 'Miss your master; spend 2 WP to act against their wishes.'
        }]
      }
    }
  },
  // ===== Backgrounds =====
  'Backgrounds': {
    blurb: 'Foundations from mortal life; Flaws can be taken independently. [28]',
    groups: {
      'Allies': {
        merits: [{
          id: idFor('Backgrounds Allies', 'Allies'),
          name: 'Allies',
          dots: '•• - ••••••',
          description: 'Build between (•–••••) Effectiveness and (•–•••) Reliability (max 6 total).'
        }],
        flaws: [{
          id: idFor('Backgrounds Allies', 'Enemy'),
          name: 'Enemy',
          dots: '• +',
          description: 'Opposite of Allies; rated two dots less than your Allies effectiveness.'
        }]
      },
      'Contacts': {
        merits: [{
          id: idFor('Backgrounds Contacts', 'Contacts'),
          name: 'Contacts',
          dots: '• - •••',
          description: 'Mortals who can get information, items, or other value.'
        }],
        flaws: []
      },
      'Fame': {
        merits: [{
          id: idFor('Backgrounds Fame', 'Fame'),
          name: 'Fame',
          dots: '• - •••••',
          description: 'Public notoriety; benefits and obvious Masquerade risks (also available for Kindred society).'
        }, {
          id: idFor('Backgrounds Fame', 'Influencer'),
          name: 'Influencer',
          dots: '•',
          description: 'Requires Fame ••+. Have the equivalent Influence rating equal to your Fame minus one towards a fan or related field once per story.'
        }, {
          id: idFor('Backgrounds Fame', 'Enduring Fame'),
          name: 'Enduring Fame',
          dots: '•',
          description: 'Requires Fame •••+. Fame lost during the story fully recovers at the start of the next story.'
        }],
        flaws: [{
          id: idFor('Backgrounds Fame', 'Dark Secret'),
          name: 'Dark Secret',
          dots: '• +',
          description: 'A dangerous secret known to a few dedicated enemies.'
        }, {
          id: idFor('Backgrounds Fame', 'Infamy'),
          name: 'Infamy',
          dots: '• +',
          description: 'You did something atrocious and others know.'
        }, {
          id: idFor('Backgrounds Fame', 'Banned From'),
          name: 'Banned From',
          dots: '• - •••',
          description: 'Barred from a city; small=•, medium=••, large=•••.'
        }]
      },
      'Influence': {
        merits: [{
          id: idFor('Backgrounds Influence', 'Influence'),
          name: 'Influence',
          dots: '• - •••••',
          description: 'Sway in mortal spheres; typically limited to a group/region.'
        }],
        flaws: [{
          id: idFor('Backgrounds Influence', 'Disliked'),
          name: 'Disliked',
          dots: '•',
          description: '−1 die to Social vs groups outside your loyal followers.'
        }, {
          id: idFor('Backgrounds Influence', 'Despised'),
          name: 'Despised',
          dots: '••',
          description: 'One group/region actively works to ruin your plans.'
        }]
      },
      'Haven': {
        merits: [{
          id: idFor('Backgrounds Haven', 'Haven'),
          name: 'Haven',
          dots: '• - •••',
          description: 'Safer/private shelter; more dots = more secure.'
        }, {
          id: idFor('Backgrounds Haven', 'Hidden Armory'),
          name: 'Hidden Armory',
          dots: '• +',
          description: 'Each dot adds 1 pistol and 1 firearm, concealed.'
        }, {
          id: idFor('Backgrounds Haven', 'Cell'),
          name: 'Cell',
          dots: '• +',
          description: 'Hold two prisoners; each extra dot doubles capacity or +1 escape difficulty.'
        }, {
          id: idFor('Backgrounds Haven', 'Watchmen'),
          name: 'Watchmen',
          dots: '• +',
          description: 'Each dot: 4 Average Mortals + 1 Gifted Mortal as guards.'
        }, {
          id: idFor('Backgrounds Haven', 'Laboratory'),
          name: 'Laboratory',
          dots: '• +',
          description: 'Add dice to one Science/Tech specialty or Alchemy (Fixatio). Not for 1-dot havens.'
        }, {
          id: idFor('Backgrounds Haven', 'Library'),
          name: 'Library',
          dots: '• +',
          description: 'Add dice to one Academics/Investigation/Occult specialty (small havens: max 1 dot).'
        }, {
          id: idFor('Backgrounds Haven', 'Location'),
          name: 'Location',
          dots: '•',
          description: '+2 dice (or +2 enemy Difficulty) to relevant Chasse/Haven rolls per location boon.'
        }, {
          id: idFor('Backgrounds Haven', 'Luxury'),
          name: 'Luxury',
          dots: '•',
          description: '+2 dice to Social tests with mortals inside; beware Resources 3+ needs.'
        }, {
          id: idFor('Backgrounds Haven', 'Postern'),
          name: 'Postern',
          dots: '• +',
          description: 'Secret exit(s); +1 die per dot to evasion near the haven.'
        }, {
          id: idFor('Backgrounds Haven', 'Security System'),
          name: 'Security System',
          dots: '• +',
          description: '+1 die per dot to resist unwelcome guests.'
        }, {
          id: idFor('Backgrounds Haven', 'Surgery'),
          name: 'Surgery',
          dots: '•',
          description: '+2 dice to relevant medical tests in the haven.'
        }, {
          id: idFor('Backgrounds Haven', 'Warding'),
          name: 'Warding',
          dots: '• +',
          description: 'Magical warding; +1 die per dot vs scrying/supernatural intrusion.'
        }, {
          id: idFor('Backgrounds Haven', 'Holy Ground'),
          name: 'Holy Ground',
          dots: '•',
          description: 'Call upon a large group of cultists to defend the haven once per story.'
        }, {
          id: idFor('Backgrounds Haven', 'Shrine'),
          name: 'Shrine',
          dots: '• - •••',
          description: 'Bonus to searching/preparing/obtaining Ritual/Ceremony ingredients equal to dots.'
        }, {
          id: idFor('Backgrounds Haven', 'Business Establishment'),
          name: 'Business Establishment',
          dots: '•• - •••',
          description: 'Run/rent as a business; stream of income but higher visibility; −1 base Haven for privacy/defense vs (choose) financial or criminal intrusions.'
        }, {
          id: idFor('Backgrounds Haven', 'Furcus'),
          name: 'Furcus',
          dots: '• - •••',
          description: 'Sits on veins of the earth/frayed Veil; +1 die per dot to Ritual/Ceremony here.'
        }, {
          id: idFor('Backgrounds Haven', 'Machine Shop'),
          name: 'Machine Shop',
          dots: '• +',
          description: '+1 die per dot to Craft/build/repair/disassemble machinery.'
        }, {
          id: idFor('Backgrounds Haven', 'Mobile'),
          name: 'Mobile',
          dots: '• - •••',
          description: 'Mobile haven (car, van, boat, plane, etc.). Size equals the number of dots. (Coterie dots may be used for this merit).'
        }, {
          id: idFor('Backgrounds Haven', 'Armored'),
          name: 'Armored',
          dots: '•',
          description: 'Requires Mobile Haven merit. Mobile Haven has reinforced panels/locks/tires/glass. Can sustain 10 points of damage.'
        }, {
          id: idFor('Backgrounds Haven', 'Smugglers Stash'),
          name: 'Smugglers Stash',
          dots: '• - ••',
          description: 'Requires Mobile Haven merit. Secret stash within the haven to hide contraband. Searches done at +2 difficulty.'
        }, {
          id: idFor('Backgrounds Haven', 'Spare Plates'),
          name: 'Spare Plates',
          dots: '••',
          description: 'Requires Mobile Haven merit. Spare set of plates/stickers/identifiers switchable within a turn.'
        }],
        flaws: [{
          id: idFor('Backgrounds Haven', 'No Haven'),
          name: 'No Haven',
          dots: '•',
          description: 'Must make basic test nightly to find secure rest.'
        }, {
          id: idFor('Backgrounds Haven', 'Creepy'),
          name: 'Creepy',
          dots: '•',
          description: '−2 dice to Social pools with mortals while inside the haven.'
        }, {
          id: idFor('Backgrounds Haven', 'Haunted'),
          name: 'Haunted',
          dots: '• +',
          description: 'Supernatural manifestation haunts the haven.'
        }, {
          id: idFor('Backgrounds Haven', 'Compromised'),
          name: 'Compromised',
          dots: '••',
          description: 'On a watchlist / possibly raided.'
        }, {
          id: idFor('Backgrounds Haven', 'Shared'),
          name: 'Shared',
          dots: '• or ••',
          description: 'Haven is co-owned / has a landlord. (Coteries typically ignore this.)'
        }, {
          id: idFor('Backgrounds Haven', 'On the Rails'),
          name: 'On the Rails',
          dots: '•',
          description: 'Requires Mobile Haven. Haven\'s movement isn\'t under Player control (destinations scheduled/fixed).'
        }, {
          id: idFor('Backgrounds Haven', 'Temperamental'),
          name: 'Temperamental',
          dots: '•',
          description: 'Requires Mobile Haven. Vehicle is mechanically unreliable; failed Drive tests halt the vehicle.'
        }]
      },
      'Herd': {
        merits: [{
          id: idFor('Backgrounds Herd', 'Herd'),
          name: 'Herd',
          dots: '• - •••••',
          description: 'Access to willing vessels; slake weekly equal to dots with no roll.'
        }],
        flaws: [{
          id: idFor('Backgrounds Herd', 'Obvious Predator'),
          name: 'Obvious Predator',
          dots: '••',
          description: '−2 dice to all hunting except Physical stalking/chasing/killing; −1 die to Social calming humans; cannot maintain a Herd.'
        }]
      },
      'Mask': {
        merits: [{
          id: idFor('Backgrounds Mask', 'Mask'),
          name: 'Mask',
          dots: '• - ••',
          description: 'A full fake identity for mortal systems.'
        }, {
          id: idFor('Backgrounds Mask', 'Zeroed'),
          name: 'Zeroed',
          dots: '•',
          description: 'Erased from systems; requires a 2-dot Mask.'
        }, {
          id: idFor('Backgrounds Mask', 'Cobbler'),
          name: 'Cobbler',
          dots: '•',
          description: 'Create/source masks; 3 days per dot; requires a 2-dot Mask.'
        }],
        flaws: [{
          id: idFor('Backgrounds Mask', 'Known Corpse'),
          name: 'Known Corpse',
          dots: '•',
          description: 'People know you recently died; they react accordingly.'
        }, {
          id: idFor('Backgrounds Mask', 'Known Blankbody'),
          name: 'Known Blankbody',
          dots: '••',
          description: 'You are in several agency databases as a vampire.'
        }]
      },
      'Mawla': {
        merits: [{
          id: idFor('Backgrounds Mawla', 'Mawla'),
          name: 'Mawla',
          dots: '• - •••••',
          description: 'A Kindred mentor who takes you under their wing.'
        }, {
          id: idFor('Backgrounds Mawla', 'Secret Master'),
          name: 'Secret Master',
          dots: '•',
          description: 'Your Mawla assigns covert tasks. (Requires Mawla.)'
        }],
        flaws: [{
          id: idFor('Backgrounds Mawla', 'Adversary'),
          name: 'Adversary',
          dots: '• +',
          description: 'An enemy who actively works against you; rated two levels higher than Mawla.'
        }, {
          id: idFor('Backgrounds Mawla', 'Shameful Childe'),
          name: 'Shameful Childe',
          dots: '•',
          description: 'You Embraced a childe and abandoned them.'
        }, {
          id: idFor('Backgrounds Mawla', 'Touchstone Embraced by your Enemies'),
          name: 'Touchstone Embraced by your Enemies',
          dots: '••',
          description: 'A former Touchstone was Embraced by enemies; confronting risks Stains.'
        }]
      },
      'Resources': {
        merits: [{
          id: idFor('Backgrounds Resources', 'Resources'),
          name: 'Resources',
          dots: '• - •••••',
          description: 'Cashflow, assets, income, or access.'
        }],
        flaws: [{
          id: idFor('Backgrounds Resources', 'Destitute'),
          name: 'Destitute',
          dots: '•',
          description: 'No money/home; no monetary value beyond yourself.'
        }]
      },
      'Retainers': {
        merits: [{
          id: idFor('Backgrounds Retainers', 'Retainers'),
          name: 'Retainers',
          dots: '• - •••',
          description: 'Loyal mortal followers (sometimes ghouls/blood-bonded).'
        }],
        flaws: [{
          id: idFor('Backgrounds Retainers', 'Stalkers'),
          name: 'Stalkers',
          dots: '•',
          description: 'You attract dangerously attached people; removing one invites another.'
        }]
      },
      'Status': {
        merits: [{
          id: idFor('Backgrounds Status', 'Status'),
          name: 'Status',
          dots: '• - •••••',
          description: 'Standing within your Faction.'
        }, {
          id: idFor('Backgrounds Status', 'City Secrets'),
          name: 'City Secrets',
          dots: '• - •••',
          description: 'Valuable knowledge of Kindred power structures in a city; can be sold or used as protection.'
        }],
        flaws: [{
          id: idFor('Backgrounds Status', 'Suspect'),
          name: 'Suspect',
          dots: '•',
          description: 'You angered a Sect; −2 dice to Social with offended Factions until you prove worth.'
        }, {
          id: idFor('Backgrounds Status', 'Shunned'),
          name: 'Shunned',
          dots: '••',
          description: 'Despised by a Sect; they actively work against you.'
        }, {
          id: idFor('Backgrounds Status', 'Mortal Pretender'),
          name: 'Mortal Pretender',
          dots: '•',
          description: 'You go out of your way to lead a mortal life, unsettling your vampiric peers. Suffer a two-dice penalty to Social tests against vampires dedicated to upholding the Masquerade.'
        }]
      }
    }
  }
}; // ===== Ingrained Discipline Flaws (standalone list) =====

exports.MERITS_AND_FLAWS = MERITS_AND_FLAWS;
var INGRAINED_DISCIPLINE_FLAWS = [{
  discipline: 'Animalism',
  name: 'Untamed',
  description: 'On failed Ride the Wave, gain two Stains (cannot be mitigated by Convictions).'
}, {
  discipline: 'Auspex',
  name: 'Daymares',
  description: 'On awakening, make two Rouse Checks instead of one.'
}, {
  discipline: 'Blood Sorcery',
  name: 'Sanguinary Animism',
  description: '−2 dice from Social and Mental pools in the scene after feeding.'
}, {
  discipline: 'Celerity',
  name: 'Breakdown',
  description: 'Failing a Rouse Check for Celerity inflicts 1 Aggravated Health damage.'
}, {
  discipline: 'Dominate',
  name: 'Blunt',
  description: 'Cannot spend Willpower to reroll any Social test.'
}, {
  discipline: 'Fortitude',
  name: 'Scar Tissue',
  description: 'When rousing to restore Health, injuries remain visible for a day.'
}, {
  discipline: 'Obfuscate',
  name: 'Faded',
  description: 'When making Remorse, roll one fewer die (min 1).'
}, {
  discipline: 'Oblivion',
  name: 'Monstrous',
  description: 'Treat Humanity as three lower (affects Blush, Social pools, appearance, etc.).'
}, {
  discipline: 'Potence',
  name: 'Killer Instinct',
  description: 'Roll Fury Frenzy when failing a Rouse check for Potence.'
}, {
  discipline: 'Presence',
  name: 'Egomaniac',
  description: 'Roll Fury Frenzy on Messy Criticals or contested failures using Presence.'
}, {
  discipline: 'Protean',
  name: 'Stasis',
  description: 'On failed Rouse for Protean, reverting leaves an incomplete change.'
}]; // 🔹 Convenience lookups

exports.INGRAINED_DISCIPLINE_FLAWS = INGRAINED_DISCIPLINE_FLAWS;

var getCategory = function getCategory(cat) {
  return MERITS_AND_FLAWS[cat] || null;
};

exports.getCategory = getCategory;

var listAllItems = function listAllItems() {
  var items = [];

  var _loop = function _loop() {
    var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
        cat = _Object$entries$_i[0],
        payload = _Object$entries$_i[1];

    if (payload.merits) items.push.apply(items, _toConsumableArray(payload.merits.map(function (m) {
      return _objectSpread({}, m, {
        category: cat,
        type: 'Merit'
      });
    })));
    if (payload.flaws) items.push.apply(items, _toConsumableArray(payload.flaws.map(function (f) {
      return _objectSpread({}, f, {
        category: cat,
        type: 'Flaw'
      });
    })));

    if (payload.groups) {
      var _loop2 = function _loop2() {
        var _Object$entries2$_i = _slicedToArray(_Object$entries2[_i2], 2),
            sub = _Object$entries2$_i[0],
            grp = _Object$entries2$_i[1];

        if (grp.merits) items.push.apply(items, _toConsumableArray(grp.merits.map(function (m) {
          return _objectSpread({}, m, {
            category: "".concat(cat, "/").concat(sub),
            type: 'Merit'
          });
        })));
        if (grp.flaws) items.push.apply(items, _toConsumableArray(grp.flaws.map(function (f) {
          return _objectSpread({}, f, {
            category: "".concat(cat, "/").concat(sub),
            type: 'Flaw'
          });
        })));
      };

      for (var _i2 = 0, _Object$entries2 = Object.entries(payload.groups); _i2 < _Object$entries2.length; _i2++) {
        _loop2();
      }
    }
  };

  for (var _i = 0, _Object$entries = Object.entries(MERITS_AND_FLAWS); _i < _Object$entries.length; _i++) {
    _loop();
  }

  return items;
};

exports.listAllItems = listAllItems;