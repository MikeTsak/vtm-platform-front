// src/data/coterieRules.js
//
// The player-facing V5 coterie catalog: the same keys the server validates
// against (back/utils/coterieRules.js), plus the prose the builder and the
// coterie sheet need to explain what each dot actually does at the table.
//
// The server is the authority on legality — nothing here is a security
// boundary. This file exists so the UI can show correct costs, ranges and
// mechanics without a round trip, and so a player can read what they are
// buying before they buy it.
//
// Sources: V:tM 5th ed. Corebook pp. 195-199; V5 Players Guide (Coterie
// Backgrounds and Merits).

export const DOMAIN_TRAITS = ['chasse', 'lien', 'portillon'];
export const MAX_DOTS = 5;
export const MIN_MEMBERS = 3;
export const XP_PER_DOT = 3;

/* ------------------------------------------------------------------ *
 * Domain traits
 * ------------------------------------------------------------------ */

// Corebook p.196 — the geographical equivalent of each Chasse rating.
export const CHASSE_SIZE_TABLE = {
  1: 'One city block, one suburban gated community',
  2: 'Two to four blocks, one park and its entrances, one small site (tourist landmark, hospital, mall)',
  3: 'Eight blocks on both sides of a major street, one medium site (airport, major employer, casino, college)',
  4: 'One neighborhood or defined district, a square kilometre; everything along one highway or major street, one major site (large university, amusement park)',
  5: 'Three neighborhoods, a large group of features ("all parks on the South Side", "all hospitals in Queens", "all highways south of the river")',
};

export const DOMAIN_TRAIT_INFO = {
  chasse: {
    name: 'Chasse',
    tagline: 'Hunting grounds',
    blurb:
      'How well-stocked, vulnerable and rich the domain is as a hunting ground — and, loosely, how large it is.',
    rule:
      'One dot of Chasse gives the coterie a default hunting Difficulty of 6 inside their domain. Each further dot reduces that Difficulty by one.',
    caveat: 'Dots need not translate to size — a small domain in a rich hunting area still rates a higher Chasse than a large one in a desolate part of the city.',
  },
  lien: {
    name: 'Lien',
    tagline: 'Integration with the locals',
    blurb: 'How well integrated the coterie is into the mortal life of their domain.',
    rule:
      'Each dot of Lien adds one die to a member’s pool when interacting peacefully with a native mortal, finding something or someone specific inside the domain, getting the word on the street, or otherwise investigating within it.',
    caveat: 'Lien never modifies coterie member hunting rolls.',
  },
  portillon: {
    name: 'Portillon',
    tagline: 'Security against intrusion',
    blurb: 'How secure the domain is against intrusion or disruption — other vampires, mortal police, the Second Inquisition.',
    rule:
      'Each dot of Portillon subtracts one die from a foe’s pool when they try to enter, investigate or surveil the domain without the coterie’s knowledge.',
    caveat:
      'Portillon is a resistance Trait and seldom adds to your own pools. It does not apply to Havens, in or out of the Domain. A critical success by an intruder may lower Portillon against that specific intruder until the coterie deals with them.',
  },
};

/** Corebook p.196: Chasse 1 → Difficulty 6, each further dot −1. */
export function huntingDifficulty(chasse) {
  const c = Number(chasse) || 0;
  if (c < 1) return null;
  return Math.max(1, 7 - Math.min(MAX_DOTS, c));
}
export function lienBonusDice(lien) {
  return Math.min(MAX_DOTS, Math.max(0, Number(lien) || 0));
}
export function portillonPenaltyDice(portillon) {
  return Math.min(MAX_DOTS, Math.max(0, Number(portillon) || 0));
}

export const NO_DOMAIN_NOTE =
  'A coterie without a Domain either poaches its dinner — at grave risk from the angry holder of the domain they enter — or holds a letter of passage from their own Prince or another high official. Where local authorities recognise such credentials, they generally grant a temporary right to hunt. The Storyteller sets the Difficulty.';

/* ------------------------------------------------------------------ *
 * Coterie Backgrounds
 * ------------------------------------------------------------------ */

// Corebook p.196: "Coteries can hold certain Backgrounds and Flaws in common:
// Adversary, Ally, Contacts, Enemy, Haven, Herd, Influence, Mask, Mawla,
// Resources, Retainers, and Status."
export const COTERIE_BACKGROUNDS = {
  ally: {
    name: 'Ally', min: 1, max: 6,
    desc: 'Mortals — family, friends, an organisation — who will act for the coterie. Split between Effectiveness and Reliability.',
  },
  contacts: {
    name: 'Contacts', min: 1, max: 5,
    desc: 'Mortals who can get the coterie information, items or other favours.',
  },
  haven: {
    name: 'Haven', min: 1, max: 5,
    desc: 'A shared place to sleep out the day. When a coterie Haven burns, nobody has a place to sleep — eggs, one basket.',
  },
  herd: {
    name: 'Herd', min: 1, max: 5,
    desc: 'A pool of willing vessels. A coterie Herd does not multiply: a two-dot coterie Herd holds the same number of kine and offers the same single Resonance as one vampire’s Herd ••.',
  },
  influence: {
    name: 'Influence', min: 1, max: 5,
    desc: 'Sway over a slice of mortal society — police, media, business, a church.',
  },
  mask: {
    name: 'Mask', min: 1, max: 2,
    desc: 'False mortal identities that survive scrutiny. Mask •• is a full, documented life.',
  },
  mawla: {
    name: 'Mawla', min: 1, max: 5,
    desc: 'A Kindred mentor or patron the coterie can call on for advice, cover or muscle.',
  },
  resources: {
    name: 'Resources', min: 1, max: 5,
    desc: 'Shared cash flow and assets held in the coterie’s name rather than any one member’s.',
  },
  retainers: {
    name: 'Retainers', min: 1, max: 5,
    desc: 'Servants — ghouls or devoted mortals — loyal to the coterie as a whole.',
  },
  status: {
    name: 'Status', min: 1, max: 5,
    desc: 'Standing within a sect, held collectively. A coterie can be respected where none of its members are.',
  },
  adversary: {
    name: 'Adversary', min: 1, max: 5, isFlawSide: true,
    desc: 'A Kindred rival working against the coterie. Taken as a Flaw — it grants pool dots rather than costing them.',
  },
  enemy: {
    name: 'Enemy', min: 1, max: 5, isFlawSide: true,
    desc: 'A mortal or group hostile to the coterie. Taken as a Flaw — it grants pool dots.',
  },

  // Outside the corebook's twelve, but required outright by coterie types in
  // the Players Guide, so a coterie cannot be built to spec without them.
  fame: {
    name: 'Fame', min: 1, max: 5, extended: true,
    desc: 'Public profile for the coterie as a group — a band, a troupe, a scene. Brings benefits and obvious Masquerade risk.',
  },
  loresheet: {
    name: 'Loresheet', min: 1, max: 5, extended: true,
    desc: 'A shared tie to a piece of the setting’s history or a secret society.',
  },
  library: {
    name: 'Library', min: 1, max: 5, extended: true,
    desc: 'A shared collection of research material on a specific subject or period.',
  },
};

export const COTERIE_BACKGROUND_KEYS = Object.keys(COTERIE_BACKGROUNDS);

export const COTERIE_BACKGROUND_NOTE =
  'Each member may use these as their own, but the Background belongs to the coterie, not the character. If the coterie splits, or a member is ejected, they cannot take it with them. Backgrounds do not multiply across members, and remain vulnerable to in-game events.';

/* ------------------------------------------------------------------ *
 * Coterie Merits (Players Guide)
 * ------------------------------------------------------------------ */

export const COTERIE_MERITS = {
  /* --- General --- */
  bolt_holes: {
    name: 'Bolt Holes', min: 1, max: 3, group: 'general',
    desc: 'The domain covers an unusually large or confusing area. Each dot (max three) gives the coterie a bonus die to escape detection or evade pursuit within their domain.',
  },
  on_tap: {
    name: 'On Tap', min: 1, max: 3, group: 'general', needsChoice: 'Resonance',
    desc: 'The coterie cultivates an atmosphere that instils a chosen Resonance in local prey. Add dice equal to the rating when hunting in the domain for a victim with that Resonance.',
  },
  privileged: {
    name: 'Privileged', min: 3, max: 3, group: 'general',
    desc: 'The coterie is granted special rights and avoids punishment for a specific crime — feeding in restricted areas, weapons at Elysium, Embracing childer. Revocable if abused.',
  },
  transportation: {
    name: 'Transportation', min: 2, max: 2, group: 'general',
    desc: 'A fleet of luxury vehicles with drivers rated Driving 6, available on short notice. Once per story, call in something rare — a helicopter, a bulletproof SUV — for the night.',
  },

  /* --- Chasse Merits --- */
  apartment_towers: {
    name: 'Apartment Towers', min: 2, max: 2, group: 'chasse', trait: 'chasse',
    resonance: 'All', desc: 'Dense residential blocks. Extortionist predators gain +1 die hunting; high turnover subtracts 1 die from the domain’s Portillon.',
  },
  back_alleys: {
    name: 'Back Alleys', min: 2, max: 2, group: 'chasse', trait: 'chasse',
    resonance: 'Phlegmatic', desc: 'Alley Cat and Montero predators gain +1 die. Animalism pools for rat-spying within the domain gain +1 die.',
  },
  funerary: {
    name: 'Funerary', min: 1, max: 1, group: 'chasse', trait: 'chasse',
    resonance: 'Melancholy', desc: 'Cemeteries, funeral homes, morgues. Bagger and Graverobber predators gain +1 die; lose 1 die on Social pools against high-clan snobs.',
  },
  gated_community: {
    name: 'Gated Community', min: 2, max: 2, group: 'chasse', trait: 'chasse',
    resonance: 'Melancholy', desc: 'Wealthy residential streets. Larceny Difficulty equals resident Resources; Sandman predators gain +1 die once inside.',
  },
  hospital: {
    name: 'Hospital', min: 2, max: 2, group: 'chasse', trait: 'chasse',
    resonance: 'Melancholy / Phlegmatic', desc: 'Bagger, Consensualist, Grim Reaper and Trapdoor predators gain +1 die. Hunters gain +1 die infiltrating.',
  },
  nightlife: {
    name: 'Nightlife', min: 3, max: 3, group: 'chasse', trait: 'chasse',
    resonance: 'Choleric / Sanguine', desc: 'Montero, Pursuer, Scene Queen, Siren and Trapdoor predators gain +1 die. Any 1 rolled means the blood is tainted with drink or drugs. Government and crime Influence gains +1 dot here.',
  },
  shelter: {
    name: 'Shelter', min: 2, max: 2, group: 'chasse', trait: 'chasse',
    resonance: 'Choleric / Melancholy', desc: 'Alley Cat and Sandman predators gain +1 die. Any 1 rolled means tainted blood.',
  },
  built_in_flock: {
    name: 'Built-In Flock', min: 1, max: 1, group: 'chasse', trait: 'chasse',
    desc: 'A cult front draws mortals in. Once a week, reduce hunting Difficulty by 1.',
  },
  mithraeum: {
    name: 'Mithraeum', min: 2, max: 2, group: 'chasse', trait: 'chasse',
    desc: 'The domain overlaps a cult protection racket. The coterie gains two swappable Haven Merit dots per story from cult resources.',
  },

  /* --- Lien Merits --- */
  campus: {
    name: 'Campus', min: 3, max: 3, group: 'lien', trait: 'lien',
    resonance: 'Choleric / Melancholy', desc: 'A university or research facility, worth a two-dot Library. Academic hunters gain +1 die infiltrating.',
  },
  city_hall: {
    name: 'City Hall', min: 3, max: 3, group: 'lien', trait: 'lien',
    resonance: 'Phlegmatic', desc: 'Wager dots on political and urban projects. City records grant a one-dot Mask. Foes with government Influence gain +1 die infiltrating.',
  },
  cultural_landmark: {
    name: 'Cultural Landmark', min: 2, max: 2, group: 'lien', trait: 'lien',
    resonance: 'Choleric / Sanguine', desc: 'During events Portillon drops by 1. Farmer predators gain +1 die where animals are present; members gain +1 die on Social pools. As an Elysium, +2 dice on Etiquette and gossip.',
  },
  marketplace: {
    name: 'Marketplace', min: 2, max: 2, group: 'lien', trait: 'lien',
    resonance: 'Melancholy / Sanguine', desc: 'Wager dots on economic projects and gain +2 dice on relevant Social and Finance pools. Lose 2 dice on Stealth against law enforcement or connected foes.',
  },
  members_only: {
    name: 'Members Only', min: 2, max: 2, group: 'lien', trait: 'lien',
    resonance: 'Sanguine', desc: 'An exclusive club. A Haven on the premises gains a dot of Luxury or Watchmen — but enemies who hold membership walk in with impunity.',
  },
  transitions: {
    name: 'Transitions', min: 2, max: 2, group: 'lien', trait: 'lien',
    resonance: 'Melancholy', desc: 'Halfway houses and addiction centres grant a one-dot Melancholic Herd. Medical and religious hunters gain +1 die infiltrating.',
  },
  community_outreach: {
    name: 'Community Outreach', min: 1, max: 1, group: 'lien', trait: 'lien',
    desc: 'Cult community service. +1 bonus die on Manipulation and Subterfuge with local mortals.',
  },

  /* --- Portillon Merits --- */
  abandoned_building: {
    name: 'Abandoned Building', min: 1, max: 1, group: 'portillon', trait: 'portillon',
    resonance: 'Melancholy', desc: 'A Haven here gains a dot of Cell and of Postern, and always carries the Creepy Flaw. At risk of demolition without Influence.',
  },
  firehouse: {
    name: 'Firehouse', min: 3, max: 3, group: 'portillon', trait: 'portillon',
    resonance: 'Choleric / Melancholy', desc: 'Attempts to burn the coterie out fail or have very limited success unless the firehouse is neutralised first.',
  },
  police_station: {
    name: 'Police Station', min: 2, max: 2, group: 'portillon', trait: 'portillon',
    resonance: 'Phlegmatic / Sanguine', desc: 'Includes a low-level contact worth +2 dice tracing infiltrators. Police action against the coterie subtracts 2 dots from Portillon and Haven.',
  },
  prison: {
    name: 'Prison', min: 2, max: 2, group: 'portillon', trait: 'portillon',
    resonance: 'Choleric / Melancholy', desc: '+2 dice negotiating with criminals and one Difficulty 3 way in and out. A total failure triggers an investigation that lowers Portillon by 2. Lowers domain Lien by 1.',
  },
  transit: {
    name: 'Transit', min: 2, max: 2, group: 'portillon', trait: 'portillon',
    resonance: 'Phlegmatic', desc: 'Subway tunnels and connected infrastructure. A Haven here gains a two-dot Postern; +2 dice evading pursuit. Nosferatu bypass these two dots of Portillon.',
  },
  networked: {
    name: 'Networked', min: 1, max: 1, group: 'portillon', trait: 'portillon',
    desc: 'Access to cult security systems — cameras, patrols or guards — usable defensively once per story.',
  },

  /* --- Clan coterie Merits --- */
  call_to_purpose: {
    name: 'Call to Purpose', min: 2, max: 2, group: 'clan', clan: 'Banu Haqim',
    desc: 'Once per session, motivate a teammate to gain the effect of a Willpower point, usable immediately.',
  },
  boot_and_rally: {
    name: 'Boot and Rally', min: 1, max: 1, group: 'clan', clan: 'Brujah',
    desc: 'Once per session, a coterie mate may reroll all regular dice on a failed Physical test.',
  },
  pack_tactics: {
    name: 'Pack Tactics', min: 3, max: 3, group: 'clan', clan: 'Gangrel',
    desc: 'Coterie members attacking the same enemy add a single die to Brawl or Melee pools. Not cumulative.',
  },
  ars_moriendi: {
    name: 'Ars Moriendi', min: 2, max: 2, group: 'clan', clan: 'Hecata',
    desc: 'Once per session, mask the corpse of someone killed, or efficiently dispose of a destroyed vampire’s remains.',
  },
  at_any_cost: {
    name: 'At Any Cost', min: 2, max: 2, group: 'clan', clan: 'Lasombra',
    desc: 'Once per session, a coterie member adds 2 successes to a test — which becomes a Messy Critical, with consequences.',
  },
  everything_is_connected: {
    name: 'Everything is Connected', min: 3, max: 3, group: 'clan', clan: 'Malkavian',
    desc: 'Once per session, let a coterie mate substitute any Skill they possess for another on an information-gathering test.',
  },
  discerning: {
    name: 'Discerning', min: 1, max: 1, group: 'clan', clan: 'The Ministry',
    desc: 'Once per session, learn the superficial desire of a Storyteller character any coterie mate has spoken to this session.',
  },
  contextual_contact: {
    name: 'Contextual Contact', min: 2, max: 2, group: 'clan', clan: 'Nosferatu',
    desc: 'Once per session, add another member’s highest single Contacts rating to an information recovery test. A given contact serves this way once per story.',
  },
  cryptolect: {
    name: 'Cryptolect', min: 3, max: 3, group: 'clan', clan: 'Ravnos',
    desc: 'The coterie speaks a coded pidgin with hand signs. Practically no one outside understands it; it needs face-to-face contact.',
  },
  restraint: {
    name: 'Restraint', min: 3, max: 3, group: 'clan', clan: 'Salubri',
    desc: 'Once per session, restrain a coterie mate’s Beast in your presence, letting them reroll all Hunger dice in a test for free.',
  },
  all_access: {
    name: 'All Access', min: 1, max: 1, group: 'clan', clan: 'Toreador',
    desc: 'Once per session, bypass bouncers and door security at a mortal event via the list or the owner. Does not beat security systems or wards.',
  },
  multi_level_lorekeeping: {
    name: 'Multi-Level Lorekeeping', min: 2, max: 2, group: 'clan', clan: 'Tremere',
    desc: 'Once per session, a coterie mate uses a Loresheet Advantage from another member’s sheet — clan Loresheets included — for the session.',
  },
  old_world_hospitality: {
    name: 'Old-World Hospitality', min: 2, max: 2, group: 'clan', clan: 'Tzimisce',
    desc: 'Coterie members daysleeping at the Tzimisce’s haven restore an additional level of Superficial Willpower damage.',
  },
  kindred_legacies: {
    name: 'Kindred Legacies', min: 2, max: 2, group: 'clan', clan: 'Ventrue',
    desc: 'Once per session, ask the Storyteller for relevant history about a single vampire the coterie has met.',
  },
  versatile_vitae: {
    name: 'Versatile Vitae', min: 2, max: 2, group: 'clan', clan: 'Caitiff',
    desc: 'Once per session, let a coterie mate use a Discipline power they lack for a scene, provided they meet the level prerequisites.',
  },
  mortal_heart: {
    name: 'Mortal Heart', min: 2, max: 2, group: 'clan', clan: 'Thin-blood',
    desc: 'Once per session, the coterie counts its Humanity as one dot higher for a scene.',
  },
};

export const COTERIE_MERIT_KEYS = Object.keys(COTERIE_MERITS);

export const MERIT_GROUPS = [
  { key: 'general', label: 'General Coterie Merits', hint: 'Available to any coterie.' },
  { key: 'chasse', label: 'Chasse Merits', hint: 'Features of the hunting ground. Needs Chasse •+.' },
  { key: 'lien', label: 'Lien Merits', hint: 'Institutions the coterie is woven into. Needs Lien •+.' },
  { key: 'portillon', label: 'Portillon Merits', hint: 'Defensive assets. Needs Portillon •+.' },
  { key: 'clan', label: 'Clan Coterie Merits', hint: 'Needs a member of that clan.' },
];

/* ------------------------------------------------------------------ *
 * Coterie Flaws — taking these GRANTS pool dots
 * ------------------------------------------------------------------ */

export const COTERIE_FLAWS = {
  bullies: {
    name: 'Bullies', min: 1, max: 1,
    desc: 'The coterie is associated with a past tyrant. One-die penalty on all Social pools except Intimidation when dealing with other vampires.',
  },
  cursed: {
    name: 'Cursed', min: 1, max: 2,
    desc: 'A mystical curse follows the coterie. Outside their domain they suffer the drawbacks of a chosen Mythic Flaw.',
  },
  custodians: {
    name: 'Custodians', min: 2, max: 2,
    desc: 'An odious duty in the city — Elysium cleanup, gate checking, minding an elder. Failure costs a dot of Status; losing all Status makes the coterie Suspect.',
  },
  targeted: {
    name: 'Targeted', min: 1, max: 1,
    desc: 'A mortal hunting agency has penetrated the defences. Portillon is halved, rounding up, against that specific threat.',
  },
  territorial: {
    name: 'Territorial', min: 1, max: 1,
    desc: 'Each week the coterie is absent, domain traits drop by 1. A lone member left behind loses a die from hunting pools (two if they are the only one). Prolonged absence loses the territory.',
  },
  under_siege: {
    name: 'Under Siege', min: 1, max: 2,
    desc: 'Lupines, the Order of St. Leopold, the Sabbat or a rival coterie constantly test the defences. Once per story the Storyteller may reduce one domain trait to one dot, or deny the use of one coterie Merit or Background.',
  },
  disputed_domain: {
    name: 'Disputed Domain', min: 2, max: 2, trait: 'chasse',
    desc: 'The domain overlaps a rival organisation. On encountering its members, immediately roll to resist Fury Frenzy — subtract 1 die on each subsequent encounter, resetting each story.',
  },
  visibility: {
    name: 'Visibility', min: 2, max: 2, trait: 'lien',
    desc: 'Conspiracy theorists, protesters or journalists watch the domain. Failed hunting tests become total failures, and concealment rolls take +2 Difficulty.',
  },
  shared_vulnerabilities: {
    name: 'Shared Vulnerabilities', min: 1, max: 1, trait: 'portillon',
    desc: 'Security is lax. Enemies who get past it ignore the coterie’s Portillon entirely.',
  },
  adversary: {
    name: 'Adversary', min: 1, max: 5,
    desc: 'A Kindred rival works against the coterie. Rate them by how much trouble they can cause.',
  },
  enemy: {
    name: 'Enemy', min: 1, max: 5,
    desc: 'A mortal or mortal group is hostile to the coterie.',
  },
  suspect: {
    name: 'Status Flaw: Suspect', min: 1, max: 1,
    desc: 'The coterie is under a cloud in its own sect. Others may treat them as an outsider.',
  },
  notorious: {
    name: 'Status Flaw: Notorious', min: 1, max: 1,
    desc: 'The coterie has a bad reputation among Kindred that precedes it.',
  },
  excommunicated: {
    name: 'Excommunicated', min: 1, max: 2,
    desc: 'Cast out of a cult or faction that still remembers the coterie.',
  },
  infamy: {
    name: 'Infamy', min: 1, max: 3,
    desc: 'The coterie is known for an act others find repellent.',
  },
  despised: {
    name: 'Despised', min: 2, max: 2,
    desc: 'A specific group actively loathes the coterie and works against it.',
  },
  shunned: {
    name: 'Shunned', min: 3, max: 3,
    desc: 'The coterie’s own sect has turned its back on them.',
  },
  dark_secret: {
    name: 'Dark Secret', min: 1, max: 2,
    desc: 'Something the coterie has done would ruin them if it came out.',
  },
  no_haven: {
    name: 'No Haven', min: 1, max: 1,
    desc: 'The coterie has no shared place to sleep out the day.',
  },
  destitute: {
    name: 'Destitute', min: 1, max: 1,
    desc: 'No money, no assets, nothing to fall back on.',
  },
  haunted: {
    name: 'Haven Flaw: Haunted', min: 1, max: 1,
    desc: 'Something restless shares the coterie’s Haven.',
  },
  compromised_haven: {
    name: 'Compromised Haven', min: 1, max: 2,
    desc: 'Someone hostile knows where the coterie sleeps.',
  },
  stalkers: {
    name: 'Stalkers', min: 1, max: 1,
    desc: 'Someone follows the coterie and will not be shaken off.',
  },
};

export const COTERIE_FLAW_KEYS = Object.keys(COTERIE_FLAWS);

export const COTERIE_FLAW_NOTE =
  'Coterie Flaws add dots to the coterie pool during creation. Every player must agree before the coterie takes one.';

/* ------------------------------------------------------------------ *
 * Pool arithmetic — mirrors back/utils/coterieRules.js
 * ------------------------------------------------------------------ */

const sumDots = (list) =>
  (Array.isArray(list) ? list : []).reduce((n, x) => n + (Number(x && x.dots) || 0), 0);

export function computePool({ memberCount, pointsPerMember, bonusPoints, flaws }) {
  const base = (Number(memberCount) || 0) * (Number(pointsPerMember) || 1);
  const bonus = Number(bonusPoints) || 0;
  const fromFlaws = sumDots(flaws);
  return { base, bonus, fromFlaws, total: base + bonus + fromFlaws };
}

// Every dot the coterie holds is paid from the pool, the Domain dots listed
// by its type included (corebook p.197: "subtract the listed costs").
export function computeSpend({ traits, backgrounds, merits }) {
  const t = traits || {};
  const domain = DOMAIN_TRAITS.reduce((n, k) => n + (Number(t[k]) || 0), 0);
  return {
    domain,
    backgrounds: sumDots(backgrounds),
    merits: sumDots(merits),
    total: domain + sumDots(backgrounds) + sumDots(merits),
  };
}

export function computeBudget(input) {
  const pool = computePool(input);
  const spend = computeSpend(input);
  return { pool, spend, remaining: pool.total - spend.total };
}

/** V5 Advantage rate: 3 XP per new dot. */
export function xpForDots(fromDots, toDots) {
  const delta = (Number(toDots) || 0) - (Number(fromDots) || 0);
  return delta > 0 ? delta * XP_PER_DOT : 0;
}

/* ------------------------------------------------------------------ *
 * Client-side preflight
 * ------------------------------------------------------------------ */

/**
 * Mirrors the server's checks so the builder can explain problems inline
 * instead of only on a failed save. The server still re-runs all of this.
 */
export function validateCoterie(input = {}) {
  const errors = [];
  const warnings = [];

  const name = String(input.name || '').trim();
  const memberCount = Number(input.memberCount) || 0;
  const pointsPerMember = Math.min(2, Math.max(1, Number(input.pointsPerMember) || 1));
  const domainId = input.domainId == null || input.domainId === '' ? null : Number(input.domainId);
  const rulesOverride = !!input.rulesOverride;

  const traits = {};
  for (const k of DOMAIN_TRAITS) {
    traits[k] = Math.max(0, Math.min(MAX_DOTS, Number((input.traits || {})[k]) || 0));
  }

  const backgrounds = Array.isArray(input.backgrounds) ? input.backgrounds : [];
  const merits = Array.isArray(input.merits) ? input.merits : [];
  const flaws = Array.isArray(input.flaws) ? input.flaws : [];

  const budget = computeBudget({
    memberCount, pointsPerMember,
    bonusPoints: Number(input.bonusPoints) || 0,
    traits, backgrounds, merits, flaws,
  });

  if (!name) errors.push('Give the coterie a name.');
  if (memberCount < MIN_MEMBERS) {
    errors.push(`At least ${MIN_MEMBERS} members are required (currently ${memberCount}).`);
  }
  if (pointsPerMember === 2 && memberCount > 3) {
    warnings.push(
      'Two pool dots per member is the Storyteller option for groups of three or fewer; ' +
      `this coterie has ${memberCount}.`
    );
  }

  const hasDomain = domainId != null && Number.isFinite(domainId);
  const anyTrait = DOMAIN_TRAITS.some((k) => traits[k] > 0);
  if (!hasDomain && anyTrait) {
    errors.push('Chasse, Lien and Portillon describe a Domain. Claim a Domain division, or set all three to zero.');
  }
  if (hasDomain && traits.chasse < 1) {
    errors.push('A claimed Domain needs at least Chasse • to work as a hunting ground.');
  }
  if (!hasDomain) warnings.push(NO_DOMAIN_NOTE);

  for (const m of merits) {
    const def = COTERIE_MERITS[m.key];
    if (!def) continue;
    if (def.trait && traits[def.trait] < 1) {
      errors.push(`${def.name} is a ${DOMAIN_TRAIT_INFO[def.trait].name} Merit and needs at least one dot of ${DOMAIN_TRAIT_INFO[def.trait].name}.`);
    }
    if (def.clan) warnings.push(`${def.name} requires a ${def.clan} member in the coterie.`);
  }
  for (const f of flaws) {
    const def = COTERIE_FLAWS[f.key];
    if (def && def.trait && traits[def.trait] < 1) {
      errors.push(`${def.name} is a ${DOMAIN_TRAIT_INFO[def.trait].name} Flaw and needs at least one dot of ${DOMAIN_TRAIT_INFO[def.trait].name}.`);
    }
  }

  const rangeIssues = [];
  for (const [list, catalog, label] of [
    [backgrounds, COTERIE_BACKGROUNDS, 'Background'],
    [merits, COTERIE_MERITS, 'Merit'],
    [flaws, COTERIE_FLAWS, 'Flaw'],
  ]) {
    for (const item of list) {
      const def = catalog[item.key];
      if (!def) continue;
      const min = def.min != null ? def.min : 1;
      const max = def.max != null ? def.max : MAX_DOTS;
      const dots = Number(item.dots) || 0;
      if (dots < min || dots > max) {
        rangeIssues.push(`${label} ${def.name} must be rated ${min === max ? min : `${min}–${max}`} (currently ${dots}).`);
      }
    }
  }

  const overspend = budget.remaining < 0;
  if (rulesOverride) {
    rangeIssues.forEach((m) => warnings.push(`[ST override] ${m}`));
    if (overspend) warnings.push(`[ST override] Overspending the pool by ${Math.abs(budget.remaining)} dot(s).`);
  } else {
    rangeIssues.forEach((m) => errors.push(m));
    if (overspend) {
      errors.push(
        `Overspending the coterie pool by ${Math.abs(budget.remaining)} dot(s). ` +
        'Take a coterie Flaw for more dots, contribute personal Advantage dots, or trim a purchase.'
      );
    }
  }

  return { errors, warnings, budget, traits };
}

/* ------------------------------------------------------------------ *
 * Coterie type → builder state
 * ------------------------------------------------------------------ */

// The type catalog in cotteries.js lists requirements by their book name
// ("Herd", "Status Flaw: Suspect", "Ally or Mawla"). This maps those onto the
// catalog keys the builder and server speak, so applying a type actually
// seeds the Background and Flaw lists instead of leaving them as inert text.
const REQUIREMENT_ALIASES = {
  ally: { kind: 'background', key: 'ally' },
  allies: { kind: 'background', key: 'ally' },
  contacts: { kind: 'background', key: 'contacts' },
  contact: { kind: 'background', key: 'contacts' },
  haven: { kind: 'background', key: 'haven' },
  herd: { kind: 'background', key: 'herd' },
  influence: { kind: 'background', key: 'influence' },
  mask: { kind: 'background', key: 'mask' },
  mawla: { kind: 'background', key: 'mawla' },
  resources: { kind: 'background', key: 'resources' },
  retainers: { kind: 'background', key: 'retainers' },
  retainer: { kind: 'background', key: 'retainers' },
  status: { kind: 'background', key: 'status' },
  fame: { kind: 'background', key: 'fame' },
  loresheet: { kind: 'background', key: 'loresheet' },
  library: { kind: 'background', key: 'library' },

  enemy: { kind: 'flaw', key: 'enemy' },
  enemies: { kind: 'flaw', key: 'enemy' },
  adversary: { kind: 'flaw', key: 'adversary' },
  adversaries: { kind: 'flaw', key: 'adversary' },
  infamy: { kind: 'flaw', key: 'infamy' },
  'status flaw: suspect': { kind: 'flaw', key: 'suspect' },
  suspect: { kind: 'flaw', key: 'suspect' },
  'status: notorious': { kind: 'flaw', key: 'notorious' },
  notorious: { kind: 'flaw', key: 'notorious' },
};

/**
 * Turns one coterie type from cotteries.js into seed state for the builder.
 *
 * @returns {{ traits, backgrounds, flaws, unmapped, required }}
 *   `unmapped` holds requirements with no single catalog entry (e.g. Hunting
 *   Party's "Ally or Mawla") so the UI can ask the player to choose instead
 *   of silently dropping them. `required` is the keyed snapshot stored on the
 *   coterie for later type-compliance checks.
 */
export function seedFromType(typeData) {
  const traits = { chasse: 0, lien: 0, portillon: 0 };
  const backgrounds = [];
  const flaws = [];
  const unmapped = [];

  const d = typeData && typeData.domain;
  if (d && typeof d === 'object') {
    for (const k of DOMAIN_TRAITS) {
      traits[k] = Math.max(0, Math.min(MAX_DOTS, Number(d[k]) || 0));
    }
  }

  for (const [rawName, rawDots] of Object.entries((typeData && typeData.required) || {})) {
    const dots = Math.max(0, Math.min(MAX_DOTS, Number(rawDots) || 0));
    const alias = REQUIREMENT_ALIASES[String(rawName).trim().toLowerCase()];
    if (!alias) {
      unmapped.push({ name: rawName, dots });
      continue;
    }
    const catalog = alias.kind === 'flaw' ? COTERIE_FLAWS : COTERIE_BACKGROUNDS;
    const entry = { key: alias.key, name: catalog[alias.key].name, dots, note: null };
    (alias.kind === 'flaw' ? flaws : backgrounds).push(entry);
  }

  // Type Flaws listed separately (cotteries.js `flaws` map).
  for (const [rawName, rawDots] of Object.entries((typeData && typeData.flaws) || {})) {
    const dots = Math.max(0, Math.min(MAX_DOTS, Number(rawDots) || 0));
    const alias = REQUIREMENT_ALIASES[String(rawName).trim().toLowerCase()];
    if (!alias) { unmapped.push({ name: rawName, dots }); continue; }
    if (flaws.some((f) => f.key === alias.key)) continue;
    flaws.push({ key: alias.key, name: COTERIE_FLAWS[alias.key].name, dots, note: null });
  }

  const required = {
    domain: { ...traits },
    backgrounds: backgrounds.reduce((acc, b) => { acc[b.key] = b.dots; return acc; }, {}),
    flaws: flaws.reduce((acc, f) => { acc[f.key] = f.dots; return acc; }, {}),
    unmapped,
  };

  return { traits, backgrounds, flaws, unmapped, required };
}

/** Advisory: does this coterie still match the type it claims? */
export function checkTypeCompliance({ required, traits, backgrounds }) {
  const unmet = [];
  if (!required) return { compliant: true, unmet };

  const held = new Map((backgrounds || []).map((b) => [b.key, Number(b.dots) || 0]));
  for (const [key, needed] of Object.entries(required.backgrounds || {})) {
    const have = held.get(key) || 0;
    if (have < Number(needed)) {
      unmet.push({ label: (COTERIE_BACKGROUNDS[key] || {}).name || key, needed: Number(needed), have });
    }
  }
  for (const k of DOMAIN_TRAITS) {
    const needed = Number((required.domain || {})[k]) || 0;
    const have = Number((traits || {})[k]) || 0;
    if (needed && have < needed) {
      unmet.push({ label: DOMAIN_TRAIT_INFO[k].name, needed, have });
    }
  }
  return { compliant: unmet.length === 0, unmet };
}

export const dotsGlyph = (n) => '•'.repeat(Math.max(0, Math.min(MAX_DOTS, Number(n) || 0)));
