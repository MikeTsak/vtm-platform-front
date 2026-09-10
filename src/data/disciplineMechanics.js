// src/data/disciplineMechanics.js
//
// Machine-readable mechanical hints for the Live Session dashboard, keyed by the
// power `id` in disciplines.js (all 274 ids are unique). This file is ADDITIVE:
// disciplines.js and rituals.js are never modified, so every other consumer of
// the discipline / ritual data (character sheets, admin tabs, the wiki, the
// creator) is unaffected.
//
// The `note` strings here are terse rules-effect summaries written for this tool
// — they are NOT the wiki descriptions and deliberately do not reproduce them.
//
// Field reference (all optional):
//   dicePoolMod : { target, amount }  amount is a number, or "@Discipline" /
//                 "@Attribute" / "@Name/2" (rating-scaled, /2 rounds up).
//                 Surfaced as a toggle chip on the player's roll while the power
//                 is running.
//   soak        : { amount, type?, timing?, note }  reduces incoming damage
//   damage      : { note }  attack / damage modifier
//   noHealthPenalty / noHungerPenalty / superficialNotHalved : boolean flags
//   note        : always present — the one-line hint shown in the powers panel.

export const POWER_MECHANICS = {
  /* ---- Animalism ---- */
  animal_succulence:     { note: 'Slake extra Hunger from animals; counts Blood Potency as 2 lower for animal-slaking penalties.' },
  leash_the_beast:       { note: 'Turn one failed die into a success on Frenzy tests.' },
  quell_the_beast:       { note: 'Suppresses a vampire’s Beast (margin + 1 turns) or renders mortals lethargic.' },
  plague_of_beasts:      { note: 'Marked target takes the roll margin as a penalty to non-Physical Skill pools.' },
  coax_the_bestial_temper:{ note: 'Raise or lower a target’s Frenzy-resistance Difficulty by the roll margin.' },
  drawing_out_the_beast: { note: 'Transfer an active Terror or Fury frenzy to a nearby victim (not Hunger frenzy).' },

  /* ---- Auspex ---- */
  heightened_senses:     { dicePoolMod: { target: 'perception', amount: '@Auspex' }, note: 'While active: add Auspex rating to perception rolls.' },
  premonition:           { note: 'Passive ST-triggered warnings; active visions cost 1 Rouse + a roll.' },
  haruspex:              { note: 'Use a fresh mortal corpse to reroll dice once before the night ends.' },
  fatal_flaw:            { note: 'Reveals a target’s mental or physical weakness for the scene.' },
  scry_the_soul:         { note: 'Read one target’s aura, or scan a crowd for auras / influences.' },

  /* ---- Blood Sorcery ---- */
  a_taste_for_blood:     { note: 'Learn traits of another creature by tasting their blood.' },
  bloods_curse:          { note: 'Temporarily raises the victim’s Bane Severity; gives clanless creatures a clan bane.' },
  extinguish_vitae:      { note: 'Raises a Kindred’s Hunger by the roll margin.' },
  blood_of_potency:      { note: 'Temporarily raises Blood Potency (can bypass the generation limit) for a scene.' },
  scorpions_touch:       { damage: { note: 'Vitae becomes paralytic poison; a mortal who takes any damage falls unconscious.' }, note: 'Poison touch — Strength + Blood Sorcery.' },
  blood_aegis:           { soak: { amount: 5, per: 'rouse', note: 'each Rouse Check spent reduces incoming damage by 5' }, note: 'Barrier: −5 damage per Rouse Check committed.' },
  fulminating_vitae:     { damage: { note: 'Vitae bomb — Aggravated to Kindred, Superficial to mortals.' }, note: 'Area vitae detonation.' },
  baals_caress:          { damage: { note: 'Vitae becomes lethal poison; mortals die on 1+ damage.' }, note: 'Lethal poison touch.' },
  cauldron_of_blood:     { damage: { note: 'Boils the victim’s blood; mortals die on 1+ damage.' }, note: 'Resolve + Blood Sorcery, costs Stains.' },

  /* ---- Celerity ---- */
  cats_grace:            { note: 'Automatically pass balance tests.' },
  fluent_swiftness:      { note: 'Reroll the Blood Surge Rouse Check on a Dexterity or Celerity test.' },
  rapid_reflexes:        { note: 'Faster minor actions; no penalty for lacking cover in a firefight.' },
  fleetness:             { dicePoolMod: { target: 'defense', amount: '@Celerity' }, note: 'While active: +Celerity to non-combat Dexterity tests and to defence once per turn.' },
  weaving:               { dicePoolMod: { target: 'ranged defence', amount: '@Celerity' }, note: 'While active: +Celerity to ranged dodges; ignore the multiple-attacker penalty.' },
  a_thousand_cuts:       { dicePoolMod: { target: 'Brawl / Melee', amount: '@Celerity' }, note: 'Add Celerity to Brawl/Melee to auto-Impair mortals (claws or edged weapons only).' },
  blurred_momentum:      { note: 'Attacks that score fewer successes than your Celerity rating simply miss you.' },
  faster_than_light:     { note: 'During Blink, an extra Rouse lets you pass through sunlight or fire without its damage.' },
  unerring_aim:          { note: 'The world slows for a single attack; Celerity 5 targets may Rouse to nullify and defend.' },
  lightning_strike:      { note: 'Attack at impossible speed; Celerity 5 targets may Rouse to nullify and defend.' },

  /* ---- Dominate ---- */
  slavish_devotion:      { note: 'Third-party Dominate against your existing victims takes a dice penalty equal to their Fortitude.' },
  cloud_memory:          { note: 'Erase the current moment; no roll versus an unprepared mortal.' },
  compel:                { note: 'One-sentence command; no roll versus an unprepared mortal.' },
  mesmerize:             { note: 'Complex command; no roll versus an unprepared mortal.' },
  ancestral_dominion:    { note: 'Target gains +1 die to resist per generation between you.' },
  mass_manipulation:     { note: 'Apply a Dominate power to everyone who sees your eyes; roll once versus the strongest.' },

  /* ---- Fortitude ---- */
  resilience:            { trackMod: 'health', note: 'Passive: adds your Fortitude rating to your Health track.' },
  unswayable_mind:       { dicePoolMod: { target: 'resist mental / social coercion', amount: '@Fortitude' }, note: 'Passive: +Fortitude to resist coercion, intimidation and supernatural influence.' },
  fluent_endurance:      { note: 'Reroll the Blood Surge Rouse Check on a Stamina or Fortitude test.' },
  obdurate:              { soak: { amount: '@Fortitude', type: 'superficial', timing: 'before halving', note: 'reduce impact Superficial by Fortitude before halving' }, note: 'Keep your footing; impact Superficial reduced by Fortitude before halving.' },
  self_assurance:        { note: 'Once per scene: convert one point of Willpower damage to Superficial.' },
  toughness:             { soak: { amount: '@Fortitude', type: 'superficial', timing: 'before halving', min: 1, note: 'subtract Fortitude from Superficial before halving (min 1)' }, note: 'While active: subtract Fortitude from all Superficial before halving (cannot go below 1).' },
  defy_bane:             { soak: { note: 'convert Aggravated to Superficial — that Superficial cannot be healed this scene' }, note: 'Convert Aggravated damage to Superficial (unhealable this scene).' },
  fortify_the_inner_facade:{ dicePoolMod: { target: 'resist mind-reading', amount: '@Fortitude' }, note: 'Raise the Difficulty of mind-piercing powers by ½ Fortitude, or add Fortitude to resist.' },
  seal_the_beasts_maw:   { noHungerPenalty: true, note: 'Ignore Hunger effects for the scene if you gain no Hunger from the Rouse checks; reduces dice pools.' },
  gorgons_scales:        { soak: { note: 'Resonance-keyed: Melancholic reduces fire, Sanguine reduces sunlight' }, note: 'Resonance armour — Choleric resists staking, Melancholic −fire, Phlegmatic vs Auspex, Sanguine −sunlight.' },
  shatter:               { note: 'Your attacker takes the damage your Toughness would have soaked; weapons may break.' },
  flesh_of_marble:       { soak: { note: 'ignore the first source of physical damage each turn (not sunlight); critical attacks bypass' }, note: 'Ignore the first physical damage source each turn.' },
  meat_shields:          { note: 'Increase effective Fortitude by ½ the weak mortals present (round down), max +5.' },
  prowess_from_pain:     { noHealthPenalty: true, note: 'No penalties from Health damage; +1 Attribute per marked Health level (max Blood Surge value + 6).' },
  will_to_survive:       { note: 'Blood Potency 2+: lethal Aggravated drops you to Torpor instead of Final Death.' },

  /* ---- Obfuscate ---- */
  mask_of_ages:          { note: 'Bonus dice to pass as an older/younger age; ST caps by the decades of difference.' },

  /* ---- Oblivion ---- */
  oblivion_sight:        { dicePoolMod: { target: 'social with mortals', amount: -2 }, note: 'See in darkness and perceive ghosts; −2 to social rolls with mortals while active.' },
  binding_fetter:        { dicePoolMod: { target: 'Awareness / Wits / Resolve', amount: -2 }, note: 'Identify a wraith’s fetter; −2 to Awareness, Wits and Resolve while active.' },
  shadow_cloak:          { dicePoolMod: { target: 'Stealth & Intimidation vs mortals', amount: 2 }, note: 'Passive: +2 to Stealth and to Intimidation versus mortals.' },
  shadow_cast:           { note: 'Targets standing in the cast shadow take extra Willpower damage in social conflict.' },
  aura_of_decay:         { dicePoolMod: { target: 'your social rolls', amount: -2 }, note: 'Rot spreads around you; −2 to your social rolls, contaminated food inflicts 2 Superficial.' },

  /* ---- Potence ---- */
  fluent_strength:       { note: 'Reroll the Blood Surge Rouse Check on a Strength or Potence test.' },
  lethal_body:           { damage: { note: 'Unarmed attacks deal Aggravated to mortals and ignore 1 armour per Potence dot.' }, note: 'Passive: brutal unarmed strikes.' },
  soaring_leap:          { note: 'Leap a distance in metres equal to 3 × Potence rating.' },
  prowess:               { damage: { note: '+Potence to unarmed damage and Feats of Strength; +½ Potence (round up) to Melee damage.' }, note: 'While active: adds Potence to your melee output.' },
  exuberance:            { note: 'Treat Potence as two dots higher for Potence powers; a critical or a 1 costs you Aggravated damage.' },
  spark_of_rage:         { note: 'Incite a person or crowd to violence; add Potence rating to the effect.' },
  wrecker:               { note: 'Double Potence rating for Feats of Strength against objects and structures.' },
  crash_down:            { note: 'Shock on landing; targets who total-fail or take 3+ damage are knocked prone.' },
  earth_shock:           { note: 'Shockwave that throws opponents prone.' },
  fist_of_caine:         { damage: { note: 'Your blows inflict Aggravated Health damage to mortals and supernaturals alike.' }, note: 'While active: all your strikes are Aggravated.' },
  subtle_hammer:         { dicePoolMod: { target: 'appropriate limited-mobility action', amount: 4 }, note: 'Focus power into one body part: +4 dice (or more) to suitable actions; no second attack that move.' },

  /* ---- Presence ---- */
  awe:                   { dicePoolMod: { target: 'Persuasion / Performance / Charisma', amount: '@Presence' }, note: 'While active: add Presence rating to Persuasion, Performance and Charisma-adjacent rolls. Not with Daunt.' },
  daunt:                 { dicePoolMod: { target: 'Intimidation', amount: '@Presence' }, note: 'While active: add Presence rating to Intimidation. Not with Awe.' },
  eyes_of_the_serpent:   { note: 'Immobilise with eye contact; a vampire may spend Willpower to break free after the first turn.' },
  lingering_kiss:        { note: 'Feeding grants the victim a Social Attribute bonus, then an equal penalty when not chasing the fix.' },
  dread_gaze:            { note: 'Instil fear; a critical win versus a vampire forces a Terror Frenzy test at Difficulty 3.' },
  entrancement:          { dicePoolMod: { target: 'social rolls versus the entranced target', amount: '@Presence' }, note: 'Target is devoted to pleasing you; add Presence to social rolls against them.' },
  majesty:               { note: 'All who look on you can only act in self-preservation; a win grants 1 turn of freedom + 1 per margin.' },

  /* ---- Protean ---- */
  eyes_of_the_beast:     { dicePoolMod: { target: 'Intimidation vs mortals', amount: 2 }, note: 'See in total darkness; +2 to Intimidation versus mortals while active.' },
  feral_weapons:         { damage: { note: 'Claws +2 damage; your Superficial damage is not halved.' }, superficialNotHalved: true, note: 'Extend claws or fangs.' },
  visceral_absorption:   { note: 'Absorb remains: −1 Hunger per body, up to your Blood Sorcery rating (not below 0).' },
  shapechange:           { note: 'Become an animal of similar mass; gain its Physical Attributes and traits.' },
  horrid_form:           { note: 'Monstrous shape: all criticals count as messy; Frenzy checks at +2 Difficulty.' },
  the_heart_of_darkness: { note: 'Torpor / destruction now keys off the hidden heart; only fire or sunlight destroys it.' },
  the_unfettered_heart:  { note: 'Only a melee critical can stake you.' },

  /* ---- Thin-blood Alchemy ---- */
  gaolers_bane:          { dicePoolMod: { target: 'escape restraints / grapples', amount: 2 }, note: '+2 dice to escape restraints or grapples.' },
  mirror_of_trust:       { dicePoolMod: { target: 'persuade / intimidate into honesty', amount: 3 }, note: '+3 dice to persuade or intimidate someone into honesty.' },
  moment_of_clarity:     { dicePoolMod: { target: 'Mental & Discipline Skill pools', amount: 4 }, note: '+4 dice to Mental and Discipline Skill pools and mental resistance; immune to Messy Criticals and Frenzy.' },
  diamond_skin:          { soak: { note: 'reduce physical damage; convert Aggravated to Superficial (not fire, acid, sunlight or sorcery)' }, note: 'Skin hardens against physical harm.' },
  tank:                  { soak: { amount: 5, note: 'the first incoming damage is reduced by 5' }, note: 'First hit this scene reduced by 5.' },
  fireskin:              { damage: { note: '+1 fire damage with body strikes' }, note: 'Immune to fire, vulnerable to cold; body strikes gain +1 fire damage.' },
  half_living_conductor: { damage: { note: 'Dexterity + Alchemy attacks deal 2 (Aggravated to mortals, Superficial to vampires).' }, note: 'Redirect electricity; immune to it.' },
  toxic_personality:     { damage: { note: 'Caustic bile as a touch attack or a ranged spit (extra Rouse).' }, note: 'Secrete acid.' },
  martian_purity:        { note: 'Expels blood-borne illness by igniting gases; deals 2 Aggravated Health damage to you.' },
  beast_mode:            { note: 'Gain one level-5 Potence, Celerity or Fortitude power; Willpower test or Frenzy on consumption.' },
  elevate:               { note: 'Get high: a good distillation boosts Dexterity, a bad one penalises it.' },
};

// A handful of Blood Sorcery Rituals / Oblivion Ceremonies with combat maths.
export const RITUAL_MECHANICS = {
  bladed_hands:      { damage: { note: 'Hands count as a light piercing Brawl weapon with a +2 modifier.' }, note: 'Blade-hands — +2 Brawl weapon.' },
  communal_vigor:    { dicePoolMod: { target: 'Dominate & Presence vs packmates', amount: 3 }, note: 'The Priest gains three bonus dice on Dominate and Presence tests against packmates.' },
  wisdom_of_the_dead:{ dicePoolMod: { target: 'the questioned Skill', amount: 2 }, note: 'Add two dice while carrying the skull/head for the rest of the night.' },
  grim_chrysalis:    { soak: { note: 'the cocoon protects the user from outside damage to some extent' }, note: 'Protective cocoon.' },
  host_spirit:       { dicePoolMod: { target: 'Physical Attribute rolls', amount: 2 }, trackMod: 'health', note: '+2 to Physical Attribute rolls and +2 Health; wraith Skills may substitute (ST).' },
  edens_bounty:      { note: 'For the rest of the chapter mortals suffer −1 die to Physical rolls and take 1 Aggravated.' },
};

// "@Fortitude" / "@Auspex" / "@Presence/2" -> the character's actual rating.
export function resolveMechAmount(token, sheet) {
  if (typeof token === 'number') return token;
  const m = String(token || '').match(/^@([A-Za-z][A-Za-z '-]*?)\s*(\/2)?$/);
  if (!m) return 0;
  const name = m[1].trim();
  const rating = Number(
    sheet?.disciplines?.[name] ??
    sheet?.attributes?.[name] ??
    (name === 'Alchemy' ? sheet?.disciplines?.['Thin-blood Alchemy'] : undefined) ??
    0
  ) || 0;
  return m[2] ? Math.ceil(rating / 2) : rating;
}

export const powerMechanics = (id) => POWER_MECHANICS[id] || null;
export const ritualMechanics = (id) => RITUAL_MECHANICS[id] || null;
