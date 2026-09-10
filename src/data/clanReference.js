// src/data/clanReference.js
//
// Quick-reference summaries of each clan's Bane and Compulsion, for the Live
// Session dashboards. These are condensed to the mechanical essence — the full
// text lives in the linked book (V5 Corebook, or Companion for the three clans
// added there). "Bane Severity" scales with Blood Potency.

export const CLAN_REFERENCE = {
  Brujah: {
    book: 'Corebook',
    bane: 'Violent Temper — lose dice equal to Bane Severity on any roll to resist a fury frenzy or to stay calm.',
    compulsion: 'Rebellion — until you defy someone or something, −2 to rolls that do not further an act of defiance.',
  },
  Gangrel: {
    book: 'Corebook',
    bane: 'Bestial Features — when you frenzy (and for one night after) gain animal features equal to Bane Severity; each lowers an Attribute by 1.',
    compulsion: 'Feral Impulses — −2 to Social and Intelligence rolls, no complex speech or technology, until you resolve things by instinct.',
  },
  Malkavian: {
    book: 'Corebook',
    bane: 'Fractured Perspective — a permanent derangement; while Compromised, take −Bane Severity to one category of rolls the ST picks.',
    compulsion: 'Delusion — −2 to Dexterity, Manipulation, Composure, Wits and to resist terror, until you act on a hallucination.',
  },
  Nosferatu: {
    book: 'Corebook',
    bane: 'Repulsiveness — cannot take the Looks Merit; −Bane Severity to Social rolls other than Intimidation (not vs other Nosferatu).',
    compulsion: 'Cryptophilia — −2 to any roll not spent obtaining or trading secrets; you hoard secrets, trading only for greater ones.',
  },
  Toreador: {
    book: 'Corebook',
    bane: 'Aesthetic Fixation — in ugly or tasteless surroundings, −Bane Severity to rolls not made to escape or improve them.',
    compulsion: 'Obsession — fixate on one thing you can perceive; −2 to rolls that do not involve or advance it.',
  },
  Tremere: {
    book: 'Corebook',
    bane: 'Deficient Blood — you cannot bind other vampires with a blood bond (mortals and ghouls only); your own bonds still take hold.',
    compulsion: 'Perfectionism — −2 to everything until you crit or repeat the task; the penalty halves (round up) each retry.',
  },
  Ventrue: {
    book: 'Corebook',
    bane: 'Rarefied Tastes — you can only feed from a narrow, specific kind of mortal; feeding from anyone else costs a Willpower point.',
    compulsion: 'Arrogance — someone in the scene must obey an order from you; you and witnesses take −2 until it is obeyed or the scene ends.',
  },
  'Banu Haqim': {
    book: 'Corebook',
    bane: 'Blood Addiction — after drinking vampire blood, make a Hunger Frenzy test (Difficulty 2 + Bane Severity) or diablerize the victim.',
    compulsion: 'Judgment — drink at least a point of blood from anyone who breaks a Tenet or your creed; −2 to all rolls until you do or a week passes.',
  },
  Hecata: {
    book: 'Corebook',
    bane: 'Painful Kiss — your bite is agony, never pleasure; victims always resist, rolling +Bane Severity dice, and never become willing vessels.',
    compulsion: 'Morbidity — −1 to all rolls until you produce a genuinely insightful observation about a death or dying being.',
  },
  Lasombra: {
    book: 'Corebook',
    bane: 'Distorted Image — cameras, mics and mirrors distort you; −Bane Severity to rolls involving your recorded image, and nearby tech may glitch.',
    compulsion: 'Ruthlessness — your next failed roll must be retried with a Willpower spend, or take −2 to everything until you succeed at that task.',
  },
  'The Ministry': {
    book: 'Corebook',
    bane: 'Cursed by Sunlight — take +Bane Severity extra Aggravated from sunlight, and lose Bane Severity dice in bright artificial light.',
    compulsion: 'Transgression — you must break a Chronicle Tenet or a Conviction (or lead someone else to); −2 to all rolls until you do.',
  },
  Ravnos: {
    book: 'Companion',
    bane: 'Doomed — if you day-sleep in the same place more than once within seven nights, take Bane Severity Aggravated damage on waking.',
    compulsion: 'Tempting Fate — you must take the most dangerous approach to the obstacle at hand; −2 to rolls that avoid the risk.',
  },
  Salubri: {
    book: 'Companion',
    bane: 'Hunter Called — a vampire who drinks from you must pass a Hunger Frenzy test or try to diablerize you; −Bane Severity when you feed on the unwilling.',
    compulsion: 'Affective Empathy — overwhelmed by another’s pain; −2 to any roll not aimed at relieving someone’s suffering.',
  },
  Tzimisce: {
    book: 'Companion',
    bane: 'Grounded — choose a place, group or thing that is yours; day-sleeping away from it or without it gives −Bane Severity to all rolls that night.',
    compulsion: 'Covetousness — become obsessed with possessing something in the scene; −2 to rolls that do not help you take or keep it.',
  },
  Caitiff: {
    book: 'Corebook',
    bane: 'No clan Bane — but no in-clan Disciplines, social suspicion, and Disciplines cost more XP; STs often apply a per-session penalty.',
    compulsion: 'None.',
  },
  'Thin-blood': {
    book: 'Corebook',
    bane: 'No Bane and no Compulsion — governed by Thin-blood Merits & Flaws instead.',
    compulsion: 'None.',
  },
};

export function clanRef(clan) {
  if (!clan) return null;
  return CLAN_REFERENCE[clan]
    || CLAN_REFERENCE[Object.keys(CLAN_REFERENCE).find(k => k.toLowerCase() === String(clan).toLowerCase())]
    || null;
}
