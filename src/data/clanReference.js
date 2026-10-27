// src/data/clanReference.js
//
// Quick-reference summaries of each clan's Bane and Compulsion, for the Live
// Session dashboards. These are condensed to the mechanical essence, the full
// text lives in the linked book (V5 Corebook, or Companion for the three clans
// added there). "Bane Severity" scales with Blood Potency.

export const CLAN_REFERENCE = {
  Brujah: {
    book: 'Corebook',
    bane: 'Violent Temper: lose dice equal to Bane Severity on any roll to resist a fury frenzy or to stay calm.',
    compulsion: 'Rebellion: until you defy someone or something, −2 to rolls that do not further an act of defiance.',
  },
  Gangrel: {
    book: 'Corebook',
    bane: 'Bestial Features: when you frenzy (and for one night after) gain animal features equal to Bane Severity; each lowers an Attribute by 1.',
    compulsion: 'Feral Impulses: −2 to Social and Intelligence rolls, no complex speech or technology, until you resolve things by instinct.',
  },
  Malkavian: {
    book: 'Corebook',
    bane: 'Fractured Perspective: a permanent derangement; while Compromised, take −Bane Severity to one category of rolls the ST picks.',
    compulsion: 'Delusion: −2 to Dexterity, Manipulation, Composure, Wits and to resist terror, until you act on a hallucination.',
  },
  Nosferatu: {
    book: 'Corebook',
    bane: 'Repulsiveness: cannot take the Looks Merit; −Bane Severity to Social rolls other than Intimidation (not vs other Nosferatu).',
    compulsion: 'Cryptophilia: −2 to any roll not spent obtaining or trading secrets; you hoard secrets, trading only for greater ones.',
  },
  Toreador: {
    book: 'Corebook',
    bane: 'Aesthetic Fixation: in ugly or tasteless surroundings, −Bane Severity to rolls not made to escape or improve them.',
    compulsion: 'Obsession: fixate on one thing you can perceive; −2 to rolls that do not involve or advance it.',
  },
  Tremere: {
    book: 'Corebook',
    bane: 'Deficient Blood: you cannot bind other vampires with a blood bond (mortals and ghouls only); your own bonds still take hold.',
    compulsion: 'Perfectionism: −2 to everything until you crit or repeat the task; the penalty halves (round up) each retry.',
  },
  Ventrue: {
    book: 'Corebook',
    bane: 'Rarefied Tastes: you can only feed from a narrow, specific kind of mortal; feeding from anyone else costs a Willpower point.',
    compulsion: 'Arrogance: someone in the scene must obey an order from you; you and witnesses take −2 until it is obeyed or the scene ends.',
  },
  'Banu Haqim': {
    book: 'Corebook',
    bane: 'Blood Addiction: after drinking vampire blood, make a Hunger Frenzy test (Difficulty 2 + Bane Severity) or diablerize the victim.',
    compulsion: 'Judgment: drink at least a point of blood from anyone who breaks a Tenet or your creed; −2 to all rolls until you do or a week passes.',
  },
  Hecata: {
    book: 'Corebook',
    bane: 'Painful Kiss: your bite is agony, never pleasure; victims always resist, rolling +Bane Severity dice, and never become willing vessels.',
    compulsion: 'Morbidity: −1 to all rolls until you produce a genuinely insightful observation about a death or dying being.',
  },
  Lasombra: {
    book: 'Corebook',
    bane: 'Distorted Image: cameras, mics and mirrors distort you; −Bane Severity to rolls involving your recorded image, and nearby tech may glitch.',
    compulsion: 'Ruthlessness: your next failed roll must be retried with a Willpower spend, or take −2 to everything until you succeed at that task.',
  },
  'The Ministry': {
    book: 'Corebook',
    bane: 'Cursed by Sunlight: take +Bane Severity extra Aggravated from sunlight, and lose Bane Severity dice in bright artificial light.',
    compulsion: 'Transgression: you must break a Chronicle Tenet or a Conviction (or lead someone else to); −2 to all rolls until you do.',
  },
  Ravnos: {
    book: 'Companion',
    bane: 'Doomed: if you day-sleep in the same place more than once within seven nights, take Bane Severity Aggravated damage on waking.',
    compulsion: 'Tempting Fate: you must take the most dangerous approach to the obstacle at hand; −2 to rolls that avoid the risk.',
  },
  Salubri: {
    book: 'Companion',
    bane: 'Hunter Called: a vampire who drinks from you must pass a Hunger Frenzy test or try to diablerize you; −Bane Severity when you feed on the unwilling.',
    compulsion: 'Affective Empathy: overwhelmed by another’s pain; −2 to any roll not aimed at relieving someone’s suffering.',
  },
  Tzimisce: {
    book: 'Companion',
    bane: 'Grounded: choose a place, group or thing that is yours; day-sleeping away from it or without it gives −Bane Severity to all rolls that night.',
    compulsion: 'Covetousness: become obsessed with possessing something in the scene; −2 to rolls that do not help you take or keep it.',
  },
  Caitiff: {
    book: 'Corebook',
    bane: 'No clan Bane, but no in-clan Disciplines, social suspicion, and Disciplines cost more XP; STs often apply a per-session penalty.',
    compulsion: 'None.',
  },
  'Thin-blood': {
    book: 'Corebook',
    bane: 'No Bane and no Compulsion, governed by Thin-blood Merits & Flaws instead.',
    compulsion: 'None.',
  },
};

export const ALTERNATIVE_CLAN_BANES = {
  Brujah: {
    book: 'Players Guide',
    page: 154,
    pdfPage: 156,
    baneName: 'Short Fuse',
    bane: 'Short Fuse: when provoked or confronted, the difficulty of all tests to resist Frenzy increases by an amount equal to the Bane Severity.',
    compulsionName: 'Contempt',
    compulsion: 'Contempt: overcome with open disgust for surrounding weakness or hypocrisy; taking a two dice penalty to all tests involving cooperation.'
  },
  Gangrel: {
    book: 'Players Guide',
    page: 154,
    pdfPage: 156,
    baneName: 'Predatory Urges',
    bane: 'Predatory Urges: when threatened or startled, the vampire loses a number of dice equal to Bane Severity on any Mental or Social test requiring calm reflection.',
    compulsionName: 'Territorial Aggression',
    compulsion: 'Territorial Aggression: compelled to mark and aggressively defend their immediate perimeter; taking a two dice penalty to tests away from the marked zone.'
  },
  Malkavian: {
    book: 'Players Guide',
    page: 155,
    pdfPage: 157,
    baneName: 'Sensory Deluge',
    bane: 'Sensory Deluge: flashes of sensory insight or chaotic impressions distract the vampire; taking a penalty equal to Bane Severity on Perception and Awareness tests in chaotic environments.',
    compulsionName: 'Paranoia',
    compulsion: 'Paranoia: convinced that allies or strangers are concealing a catastrophic revelation; taking a two dice penalty to tests relying on trust.'
  },
  Nosferatu: {
    book: 'Players Guide',
    page: 155,
    pdfPage: 157,
    baneName: 'Pestilence',
    bane: 'Pestilence: the vampire carries a swarm of vermin, fleas, or sewer grime; taking a penalty equal to Bane Severity on tests to leave no physical traces or forensic evidence behind.',
    compulsionName: 'Hoarding',
    compulsion: 'Hoarding: compelled to acquire, stash, or conceal a piece of physical or digital contraband in the scene; taking a two dice penalty to other tasks.'
  },
  Toreador: {
    book: 'Players Guide',
    page: 155,
    pdfPage: 157,
    baneName: 'Disdain of the Ordinary',
    bane: 'Disdain of the Ordinary: when surrounded by mundane, cheap, or ugly surroundings, the vampire loses dice equal to Bane Severity on all non aggressive tests.',
    compulsionName: 'Enraptured Critique',
    compulsion: 'Enraptured Critique: compelled to critique, mock, or correct the artistic flaws or manners of someone in the scene; taking a two dice penalty to unrelated actions.'
  },
  Tremere: {
    book: 'Players Guide',
    page: 156,
    pdfPage: 158,
    baneName: 'Hermetic Pride',
    bane: 'Hermetic Pride: the vampire cannot bring themselves to accept magical guidance from non Tremere; taking a penalty equal to Bane Severity on collaborative occult tests with outsiders.',
    compulsionName: 'Dogmatism',
    compulsion: 'Dogmatism: compelled to follow rigid hierarchy, ritual protocols, or scholarly order; taking a two dice penalty to spontaneous or improvised tests.'
  },
  Ventrue: {
    book: 'Players Guide',
    page: 156,
    pdfPage: 158,
    baneName: 'Exclusive Vintage',
    bane: 'Exclusive Vintage: the vampire can only feed from mortals with a narrow psychological trait, profession, or lineage; feeding from any other mortal fails completely.',
    compulsionName: 'Noblesse Oblige',
    compulsion: 'Noblesse Oblige: compelled to assert aristocratic protection or dominance over their subordinates; taking a two dice penalty to actions where they do not lead.'
  },
  'Banu Haqim': {
    book: 'Players Guide',
    page: 156,
    pdfPage: 158,
    baneName: 'Slaking Thirst',
    bane: 'Slaking Thirst: the vampire cannot slake Hunger from mortal vessels unless the mortal has committed a crime, broken a law, or violated a personal or chronicle Tenet.',
    compulsionName: 'Righteous Indignation',
    compulsion: 'Righteous Indignation: fixates on righting a perceived wrong or injustice in the scene; taking a two dice penalty to all tests not directed at punishing the guilty.'
  },
  Hecata: {
    book: 'Players Guide',
    page: 156,
    pdfPage: 158,
    baneName: 'Corpse Cold',
    bane: 'Corpse Cold: the vampire feels uncomfortably cold and smells faintly of formaldehyde and wet earth; taking a penalty equal to Bane Severity to all Social pools with mortals.',
    compulsionName: 'Morbid Fascination',
    compulsion: 'Morbid Fascination: driven to examine, collect, or catalog traces of mortality, autopsy details, or death relics; taking a two dice penalty to all unrelated tests.'
  },
  Lasombra: {
    book: 'Players Guide',
    page: 157,
    pdfPage: 159,
    baneName: 'Disturbed Shadows',
    bane: 'Disturbed Shadows: shadows cast by the vampire twist, flicker, and stretch unnaturally; the vampire loses dice equal to Bane Severity on Stealth and subtle Social tests in visible light.',
    compulsionName: 'Hubris',
    compulsion: 'Hubris: overcome by extreme pride and dismissal of inferior Kindred or kine; taking a two dice penalty on all rolls where they accept help or advice.'
  },
  'The Ministry': {
    book: 'Players Guide',
    page: 157,
    pdfPage: 159,
    baneName: 'Cold Blooded',
    bane: 'Cold Blooded: in cold temperatures or darkness without warmth, the vampire becomes lethargic and loses dice equal to Bane Severity on all Physical tests.',
    compulsionName: 'Sin Eater',
    compulsion: 'Sin Eater: driven to tempt another into committing an immoral or forbidden act; taking a two dice penalty to all other actions until the sin is committed.'
  },
  Ravnos: {
    book: 'Players Guide',
    page: 157,
    pdfPage: 159,
    baneName: 'Restless Blood',
    bane: 'Restless Blood: if the vampire rests in the same neighborhood for more than three consecutive nights, they lose dice equal to Bane Severity on all rolls until relocating.',
    compulsionName: 'Showmanship',
    compulsion: 'Showmanship: compelled to demonstrate superiority or trick an opponent through flash and spectacle; taking a two dice penalty to direct, simple actions.'
  },
  Salubri: {
    book: 'Players Guide',
    page: 157,
    pdfPage: 159,
    baneName: 'Empathetic Bleed',
    bane: 'Empathetic Bleed: when a creature in the vampire presence suffers damage or terror, the vampire takes a penalty equal to Bane Severity on concentration tests.',
    compulsionName: 'Saviour Complex',
    compulsion: 'Saviour Complex: overwhelmed by the need to protect the weakest individual in the scene; taking a two dice penalty to any roll that puts that person at risk.'
  },
  Tzimisce: {
    book: 'Players Guide',
    page: 157,
    pdfPage: 159,
    baneName: 'Haunted Soil',
    bane: 'Haunted Soil: the vampire must sleep surrounded by dirt or memorabilia from their birthplace or grave; sleeping without it causes aggravated willpower damage equal to Bane Severity.',
    compulsionName: 'Territorial Possessiveness',
    compulsion: 'Territorial Possessiveness: compelled to claim ownership of an item or space in the scene; taking a two dice penalty to rolls that do not enforce ownership.'
  }
};

export function clanRef(clan) {
  if (!clan) return null;
  return CLAN_REFERENCE[clan]
    || CLAN_REFERENCE[Object.keys(CLAN_REFERENCE).find(k => k.toLowerCase() === String(clan).toLowerCase())]
    || null;
}
