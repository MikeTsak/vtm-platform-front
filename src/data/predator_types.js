// src/data/predator_types.js
//
// Structured definition of all 18 Vampire: The Masquerade 5th Edition Predator Types.
// Contains clean descriptions, display rolls, explicit hunting pools with normalized
// attributes and skills, starting specialty picks, discipline choices, and advantages/flaws.

export const PREDATOR_TYPE_NAMES = [
  'Alleycat',
  'Bagger',
  'Blood Leech',
  'Cleaver',
  'Consensualist',
  'Farmer',
  'Osiris',
  'Sandman',
  'Scene Queen',
  'Siren',
  'Extortionist',
  'Graverobber',
  'Roadside Killer',
  'Grim Reaper',
  'Montero',
  'Pursuer',
  'Trapdoor',
  'Tithe Collector',
];

export const PREDATOR_TYPES = {
  Alleycat: {
    name: 'Alleycat',
    desc: 'Those who find violence to be the quickest way to get what they want might gravitate towards this hunting style. Alleycats are a vampire who feeds by brute force and outright attack and feeds from whomever they can when they can. Intimidation is a route easily taken to make their victims cower or even Dominating the victims to not report the attack or mask it as something else entirely. Strength + Brawl is to take blood by force or threat. Wits + Streetwise can be used to find criminals as if a vigilante figure.',
    rolls: 'Strength + Brawl • Wits + Streetwise',
    huntingPools: [
      { pool: 'Strength + Brawl', attributes: ['Strength'], skills: ['Brawl'] },
      { pool: 'Wits + Streetwise', attributes: ['Wits'], skills: ['Streetwise'] },
    ],
    huntingAttributes: ['Strength', 'Wits'],
    huntingSkills: ['Brawl', 'Streetwise'],
    picks: {
      specialty: ['Intimidation (Stickups)', 'Brawl (Grappling)'],
      discipline: () => ['Celerity', 'Potence'],
    },
    effects: {
      humanity: -1,
      backgrounds: [{ name: 'Contacts (Criminals)', dots: 3 }],
    },
  },

  Bagger: {
    name: 'Bagger',
    desc: "Sometimes the best blood doesn't come from a live body. Baggers are kindred who take an approach most are unable to with their ability to consume preserved, defractionated or rancid blood through (•••) Iron Gullet, allowing them to feed from unusual sources such as blood bags or corpses. Perhaps they work in a hospital or blood bank or they might even have enough knowledge about the black market to obtain their blood. Ventrue are unable to pick this Predator type. Intelligence + Streetwise can be used to find, gain access and purchase the goods.",
    rolls: 'Intelligence + Streetwise',
    huntingPools: [
      { pool: 'Intelligence + Streetwise', attributes: ['Intelligence'], skills: ['Streetwise'] },
    ],
    huntingAttributes: ['Intelligence'],
    huntingSkills: ['Streetwise'],
    restrict: (sheet) => (sheet?.clan === 'Ventrue' ? 'Ventrue cannot pick Bagger' : null),
    picks: {
      specialty: ['Larceny (Lock Picking)', 'Streetwise (Black Market)'],
      discipline: (clan) => {
        const opts = ['Obfuscate'];
        if (clan === 'Tremere' || clan === 'Banu Haqim') opts.unshift('Blood Sorcery');
        if (clan === 'Hecata') opts.unshift('Oblivion');
        return opts;
      },
    },
    effects: {
      merits: [{ name: 'Iron Gullet', dots: 3 }],
      flaws: [{ name: 'Enemy', dots: 2 }],
    },
  },

  'Blood Leech': {
    name: 'Blood Leech',
    desc: "Some Kindred might see feeding from mortals as inherently wrong or disgusting regardless of others' rationale. Blood Leech is a feeding style that is not looked upon kindly by many vampires making it risky unless the Kindred has a position of power and can keep their little secret secure. Regardless, with their rejection of mortal blood, they instead feed upon the vitae of other vampires through hunting those weaker than them, coercion, or taking Blood as payment. This Predator Type is suggested to not be abstracted down to a dice pool.",
    rolls: '— (not abstracted)',
    huntingPools: [],
    huntingAttributes: [],
    huntingSkills: [],
    picks: {
      specialty: ['Brawl (Kindred)', 'Stealth (Against Kindred)'],
      discipline: () => ['Celerity', 'Protean'],
      flawChoice: ['Dark Secret: Diablerist (••)', 'Shunned (••)'],
    },
    effects: {
      humanity: -1,
      bloodPotency: 1,
      feedingFlaws: [{ name: 'Prey Exclusion (Mortals)', dots: 2 }],
    },
  },

  Cleaver: {
    name: 'Cleaver',
    desc: "The sweetest blood might be from those closest to them, the Cleaver takes advantage of that idea while taking blood from either their own close family and friends or even those close to someone else. Covertly stealing the blood from their victims while still maintaining ties to them. Cleavers will go to extreme lengths to keep their condition a secret from their victims but some may instead take a less than pleasant route. The Camarilla forbids the practice of taking a human family in this fashion, as it's a breach waiting to happen. Manipulation + Subterfuge is used to condition the victims, socializing with them and feeding from them without the cover being blown. This hunting style is typically rare for ancilla or older characters due to inherent risk or becoming otherwise unsustainable over time.",
    rolls: 'Manipulation + Subterfuge',
    huntingPools: [
      { pool: 'Manipulation + Subterfuge', attributes: ['Manipulation'], skills: ['Subterfuge'] },
    ],
    huntingAttributes: ['Manipulation'],
    huntingSkills: ['Subterfuge'],
    picks: {
      specialty: ['Persuasion (Gaslighting)', 'Subterfuge (Coverups)'],
      discipline: () => ['Dominate', 'Animalism'],
    },
    effects: {
      flaws: [{ name: 'Dark Secret: Cleaver', dots: 1 }],
      backgrounds: [{ name: 'Herd', dots: 2 }],
    },
  },

  Consensualist: {
    name: 'Consensualist',
    desc: "Consent is a dangerous thing to gather when they're a blood-sucking monster, but Consensualists make do. They never feed against the victim's free will, instead pretending to be a representative of a charity blood drive, someone with a blood kink within the kink community, or blatantly admitting to their victims what they are and getting their permission to feed. To the Camarilla, the last method is considered a masquerade breach but perhaps to a philosophical Anarch, it might be an acceptable risk to take. Manipulation + Persuasion allows the kindred to take blood by consent, under the guide of medical work or mutual kink. This hunting style is typically rare for ancilla or older characters due to inherent risk or becoming otherwise unsustainable over time.",
    rolls: 'Manipulation + Persuasion',
    huntingPools: [
      { pool: 'Manipulation + Persuasion', attributes: ['Manipulation'], skills: ['Persuasion'] },
    ],
    huntingAttributes: ['Manipulation'],
    huntingSkills: ['Persuasion'],
    picks: {
      specialty: ['Medicine (Phlebotomy)', 'Persuasion (Vessels)'],
      discipline: () => ['Auspex', 'Fortitude'],
    },
    effects: {
      humanity: 1,
      flaws: [{ name: 'Dark Secret: Masquerade Breacher', dots: 1 }],
      feedingFlaws: [{ name: 'Prey Exclusion (Non-consenting)', dots: 1 }],
    },
  },

  Farmer: {
    name: 'Farmer',
    desc: "Perhaps this vampire was once someone who worked as an activist or an aid worker, regardless of their reasoning the Farmer only feed from animals as their primary source of blood. The beast may gnaw at them with its throes of hunger, but they've successfully managed to avoid killing mortals except on the occasional bad night. Ventrue may not pick this Predator type and it cannot be taken on characters with Blood Potency 3 or higher. Composure + Animal Ken is the roll to find and catch the chosen animal. This hunting style is typically rare for ancilla or older characters due to inherent risk or becoming otherwise unsustainable over time.",
    rolls: 'Composure + Animal Ken',
    huntingPools: [
      { pool: 'Composure + Animal Ken', attributes: ['Composure'], skills: ['Animal Ken'] },
    ],
    huntingAttributes: ['Composure'],
    huntingSkills: ['Animal Ken'],
    restrict: (sheet) => {
      if (sheet?.clan === 'Ventrue') return 'Ventrue cannot pick Farmer';
      if ((sheet?.bloodPotency ?? 1) >= 3) return 'Farmer requires Blood Potency < 3';
      return null;
    },
    picks: {
      specialty: ['Animal Ken (specific animal)', 'Survival (Hunting)'],
      discipline: () => ['Animalism', 'Protean'],
    },
    effects: {
      humanity: 1,
      feedingFlaws: [{ name: 'Feeding Flaw: Farmer', dots: 2 }],
    },
  },

  Osiris: {
    name: 'Osiris',
    desc: 'More than not, Osiris are celebrities within mortal society. Musicians, writers, priests, and even cult leaders may find an easy time finding their blood by utilizing those already around them. They tend to feed from their fans or worshippers which means they have easy access to blood, but followers tend to attract their own problems with the local authority or worse. Manipulation + Subterfuge or Intimidation + Fame are both used to feed from the adoring fans.',
    rolls: 'Manipulation + Subterfuge • Manipulation + Intimidation (+ Fame)',
    huntingPools: [
      { pool: 'Manipulation + Subterfuge', attributes: ['Manipulation'], skills: ['Subterfuge'] },
      { pool: 'Manipulation + Intimidation', attributes: ['Manipulation'], skills: ['Intimidation'] },
    ],
    huntingAttributes: ['Manipulation'],
    huntingSkills: ['Subterfuge', 'Intimidation'],
    picks: {
      specialty: ['Occult (specific tradition)', 'Performance (specific entertainment field)'],
      discipline: (clan) => {
        const opts = ['Presence'];
        if (clan === 'Tremere' || clan === 'Banu Haqim') opts.unshift('Blood Sorcery');
        return opts;
      },
      backgroundPool: [{ total: 3, options: ['Fame', 'Herd'] }],
      flawPool: [{ total: 2, options: ['Enemies', 'Mythic Flaws'] }],
    },
    effects: {},
  },

  Sandman: {
    name: 'Sandman',
    desc: 'If they never wake during the feed it never happened, right? Sandman prefers to hunt on sleeping mortals than anyone else by using stealth or Disciplines to feed from their victims they are rarely caught in the act, though when they are, problems are sure to occur. Maybe they were anti-social in life or perhaps they find the route of seduction or violence too much for them and find comfort in the silence of this feeding style. Dexterity + Stealth is for casing a location, breaking in and feeding without leaving a trace.',
    rolls: 'Dexterity + Stealth',
    huntingPools: [
      { pool: 'Dexterity + Stealth', attributes: ['Dexterity'], skills: ['Stealth'] },
    ],
    huntingAttributes: ['Dexterity'],
    huntingSkills: ['Stealth'],
    picks: {
      specialty: ['Medicine (Anesthetics)', 'Stealth (Break-in)'],
      discipline: () => ['Auspex', 'Obfuscate'],
    },
    effects: {
      backgrounds: [{ name: 'Resources', dots: 1 }],
    },
  },

  'Scene Queen': {
    name: 'Scene Queen',
    desc: 'Similar to Osiris these Kindred find comfort in a particular subculture rather than a wider audience. Hunting in or around a subculture they likely belonged to in their previous life, their victims adore them for their status, and those who have an inkling of what they are disbelieved. The scene itself could be anything, from street culture to high fashion, and the unifying trait is the use of those around them. Manipulation + Persuasion aids in feeding from those within the Kindred subgroup, through conditioning and isolation to gain blood or gaslighting or forced silence.',
    rolls: 'Manipulation + Persuasion',
    huntingPools: [
      { pool: 'Manipulation + Persuasion', attributes: ['Manipulation'], skills: ['Persuasion'] },
    ],
    huntingAttributes: ['Manipulation'],
    huntingSkills: ['Persuasion'],
    picks: {
      specialty: [
        'Etiquette (specific scene)',
        'Leadership (specific scene)',
        'Streetwise (specific scene)',
      ],
      discipline: () => ['Dominate', 'Potence'],
      flawChoice: [
        'Influence Flaw: Disliked (•)',
        'Feeding Flaw: Prey Exclusion (different subculture)',
      ],
    },
    effects: {
      backgrounds: [
        { name: 'Fame', dots: 1 },
        { name: 'Contacts', dots: 1 },
      ],
    },
  },

  Siren: {
    name: 'Siren',
    desc: "Everyone knows that sex sells and the Siren uses this to their advantage. Almost exclusively feeding while feigning sex or sexual interest, they utilize Disciplines and seduction to lure away a possible meal. Moving through clubs and one-night stands are skills they've mastered and regardless of how sexy they feel, deep in their darkest moments, they realize at best they are problematic and at worst a serial sexual assaulter. In life, they might have been a scriptwriter, a small time actor who never reached the big screen, a well-known kinkster or even a virgin looking to make up for the lost time. Charisma + Subterfuge is how sirens feed under the guise of sexual acts.",
    rolls: 'Charisma + Subterfuge',
    huntingPools: [
      { pool: 'Charisma + Subterfuge', attributes: ['Charisma'], skills: ['Subterfuge'] },
    ],
    huntingAttributes: ['Charisma'],
    huntingSkills: ['Subterfuge'],
    picks: {
      specialty: ['Persuasion (Seduction)', 'Subterfuge (Seduction)'],
      discipline: () => ['Fortitude', 'Presence'],
    },
    effects: {
      merits: [{ name: 'Looks: Beautiful', dots: 2 }],
      flaws: [{ name: 'Enemy (spurned lover/jealous partner)', dots: 1 }],
    },
  },

  Extortionist: {
    name: 'Extortionist',
    desc: 'Found in Cults of the Blood Gods. On the surface, Extortionists acquire their blood in exchange for services such as protection, security, or surveillance. Though, for as many times as the service might be genuine, there are many more times when the service has been offered from fabricated information to make the deal feel that much sweeter. Strength or Manipulation + Intimidation to feed through coercion.',
    rolls: 'Strength + Intimidation • Manipulation + Intimidation',
    huntingPools: [
      { pool: 'Strength + Intimidation', attributes: ['Strength'], skills: ['Intimidation'] },
      { pool: 'Manipulation + Intimidation', attributes: ['Manipulation'], skills: ['Intimidation'] },
    ],
    huntingAttributes: ['Strength', 'Manipulation'],
    huntingSkills: ['Intimidation'],
    picks: {
      specialty: ['Intimidation (Coercion)', 'Larceny (Security)'],
      discipline: () => ['Dominate', 'Potence'],
      backgroundPool: [{ total: 3, options: ['Contacts', 'Resources'] }],
    },
    effects: {
      flaws: [{ name: 'Enemy (Police or escaped victim)', dots: 2 }],
    },
  },

  Graverobber: {
    name: 'Graverobber',
    desc: "Found in Cults of the Blood Gods. Similar to Baggers these kindred understand there's no good in wasting good blood, even if others cannot consume it. Often they find themselves digging up corpses or working for mortuaries to obtain their bodies, yet regardless of what the name suggests, they prefer feeding from mourners at a gravesite or a hospital. This Predator Type often requires a haven or other connections to a church, hospital, or morgue as a way to obtain the bodies. Resolve + Medicine for sifting through the dead for a body with blood. Manipulation + Insight for moving among miserable mortals.",
    rolls: 'Resolve + Medicine • Manipulation + Insight',
    huntingPools: [
      { pool: 'Resolve + Medicine', attributes: ['Resolve'], skills: ['Medicine'] },
      { pool: 'Manipulation + Insight', attributes: ['Manipulation'], skills: ['Insight'] },
    ],
    huntingAttributes: ['Resolve', 'Manipulation'],
    huntingSkills: ['Medicine', 'Insight'],
    picks: {
      specialty: ['Occult (Grave Rituals)', 'Medicine (Cadavers)'],
      discipline: () => ['Fortitude', 'Oblivion'],
    },
    effects: {
      merits: [{ name: 'Iron Gullet', dots: 3 }],
      backgrounds: [{ name: 'Haven', dots: 1 }],
      feedingFlaws: [{ name: 'Herd Flaw: Obvious Predator', dots: 2 }],
    },
  },

  'Roadside Killer': {
    name: 'Roadside Killer',
    desc: "Found in Let the Streets Run Red and Live from the Succubus Club. These Kindred never stay in one spot for too long and are always on the move, hunting those who won't be missed if they disappear alongside the road. Roadside Killers know the risk is just as worth as the reward. Perhaps this Kindred was once a truck driver themselves or maybe they met their fate alongside the road as well. Dexterity or Charisma + Drive to feed by picking up down-and-outs with no other options.",
    rolls: 'Dexterity + Drive • Charisma + Drive',
    huntingPools: [
      { pool: 'Dexterity + Drive', attributes: ['Dexterity'], skills: ['Drive'] },
      { pool: 'Charisma + Drive', attributes: ['Charisma'], skills: ['Drive'] },
    ],
    huntingAttributes: ['Dexterity', 'Charisma'],
    huntingSkills: ['Drive'],
    picks: {
      specialty: ['Survival (the road)', 'Investigation (vampire cant)'],
      discipline: () => ['Fortitude', 'Protean'],
    },
    effects: {
      backgrounds: [{ name: 'Herd (migrating)', dots: 2 }],
      feedingFlaws: [{ name: 'Prey Exclusion (locals)', dots: 1 }],
    },
  },

  'Grim Reaper': {
    name: 'Grim Reaper',
    desc: 'Found in Players Guide. Hunting inside hospice care facilities, assisted living homes, and other places where those who are near death reside. Grim Reapers are constantly on the move in an effort to locate new victims near the end of their lives to feed from. Hunting in this style may also earn a taste for specific diseases making them easier to identify. Intelligence + Awareness or Medicine in order to find victims.',
    rolls: 'Intelligence + Awareness • Intelligence + Medicine',
    huntingPools: [
      { pool: 'Intelligence + Awareness', attributes: ['Intelligence'], skills: ['Awareness'] },
      { pool: 'Intelligence + Medicine', attributes: ['Intelligence'], skills: ['Medicine'] },
    ],
    huntingAttributes: ['Intelligence'],
    huntingSkills: ['Awareness', 'Medicine'],
    picks: {
      specialty: ['Awareness (Death)', 'Larceny (Forgery)'],
      discipline: () => ['Auspex', 'Oblivion'],
      backgroundChoice: ['Allies (Medical)', 'Influence (Medical)'],
    },
    effects: {
      humanity: 1,
      feedingFlaws: [{ name: 'Prey Exclusion (Healthy Mortals)', dots: 1 }],
    },
  },

  Montero: {
    name: 'Montero',
    desc: 'Found in Players Guide. Montero carry on a tradition held by aristocratic Spaniards where they hunted deer and used teams to drive them into the huntsman. Retainers drive the victims towards the vampire for them to feed. This is not always done in the traditional style but in the forms of long cons, flash mobs, or gang pursuits. Intelligence + Stealth represents the expert planning of well-trained Retainers, whereas a well-practiced plan and patient waiting is represented by Resolve + Stealth.',
    rolls: 'Intelligence + Stealth • Resolve + Stealth',
    huntingPools: [
      { pool: 'Intelligence + Stealth', attributes: ['Intelligence'], skills: ['Stealth'] },
      { pool: 'Resolve + Stealth', attributes: ['Resolve'], skills: ['Stealth'] },
    ],
    huntingAttributes: ['Intelligence', 'Resolve'],
    huntingSkills: ['Stealth'],
    picks: {
      specialty: ['Leadership (Hunting Pack)', 'Stealth (Stakeout)'],
      discipline: () => ['Dominate', 'Obfuscate'],
    },
    effects: {
      backgrounds: [{ name: 'Retainers', dots: 2 }],
      humanity: -1,
    },
  },

  Pursuer: {
    name: 'Pursuer',
    desc: 'Found in Players Guide. For those who prefer to stalk their victim, learning their habits and routines, determining if they will cause an outcry if they disappear or not. The Pursuer strikes when the time is right and when hunger is at a perfect balance. Intelligence + Investigation to locate and find a victim no one will notice is gone. Stamina + Stealth for long stalking of unaware urban victims.',
    rolls: 'Intelligence + Investigation • Stamina + Stealth',
    huntingPools: [
      { pool: 'Intelligence + Investigation', attributes: ['Intelligence'], skills: ['Investigation'] },
      { pool: 'Stamina + Stealth', attributes: ['Stamina'], skills: ['Stealth'] },
    ],
    huntingAttributes: ['Intelligence', 'Stamina'],
    huntingSkills: ['Investigation', 'Stealth'],
    picks: {
      specialty: ['Investigation (Profiling)', 'Stealth (Shadowing)'],
      discipline: () => ['Animalism', 'Auspex'],
    },
    effects: {
      merits: [{ name: 'Bloodhound', dots: 1 }],
      backgrounds: [{ name: 'Contacts (local underbelly)', dots: 1 }],
      humanity: -1,
    },
  },

  Trapdoor: {
    name: 'Trapdoor',
    desc: 'Found in Players Guide. Much like the spider, this vampire builds a nest and lures their prey inside. Be it an amusement park, an abandoned house, or an underground club, the victim comes to them. There the trapdoor might only play with their mind and terrorize them, imprison them to drain them slowly, or take a deep drink and then send them home. Charisma + Stealth for the victims that enter expecting a fun-filled night. Dexterity + Stealth to feed upon trespassers. Wits + Awareness (+ Haven) is used to navigate the maze of the den itself.',
    rolls: 'Charisma + Stealth • Dexterity + Stealth • Wits + Awareness (+ Haven)',
    huntingPools: [
      { pool: 'Charisma + Stealth', attributes: ['Charisma'], skills: ['Stealth'] },
      { pool: 'Dexterity + Stealth', attributes: ['Dexterity'], skills: ['Stealth'] },
      { pool: 'Wits + Awareness (+ Haven)', attributes: ['Wits'], skills: ['Awareness'] },
    ],
    huntingAttributes: ['Charisma', 'Dexterity', 'Wits'],
    huntingSkills: ['Stealth', 'Awareness'],
    picks: {
      specialty: ['Persuasion (Marketing)', 'Stealth (Ambushes or Traps)'],
      discipline: () => ['Protean', 'Obfuscate'],
      backgroundChoice: ['Retainers +1', 'Herd +1', 'Haven +1 (second dot)'],
      havenFlawChoice: ['Haven Flaw: Creepy (•)', 'Haven Flaw: Haunted (•)'],
    },
    effects: {
      backgrounds: [{ name: 'Haven', dots: 1 }],
    },
  },

  'Tithe Collector': {
    name: 'Tithe Collector',
    desc: "Found in In Memoriam. This predator type is intended for ancilla characters. They hold enough power that other Kindred around them pay tribute in the form of specially selected vessels, who are delivered regularly, or upon request. The vessels must be kept in reasonable condition and returned, but otherwise the Masquerade is everyone else's problem.",
    rolls: '—',
    huntingPools: [],
    huntingAttributes: [],
    huntingSkills: [],
    picks: {
      specialty: ['Intimidation (Kindred)', 'Leadership (Kindred)'],
      discipline: () => ['Dominate', 'Presence'],
      backgroundPool: [{ total: 3, options: ['Domain', 'Status'] }],
    },
    effects: {
      flaws: [{ name: 'Adversary', dots: 2 }],
    },
  },
};

export default PREDATOR_TYPES;