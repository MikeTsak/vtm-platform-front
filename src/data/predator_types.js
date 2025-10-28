// src/data/predator_types.js

// 🔹 Shared helpers (from merits_flaws.js)
const slug = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, '_');
const idFor = (cat, name) => `${slug(cat)}__${slug(name)}`;

// 🔹 Render order (from CharacterSetup.jsx)
export const PREDATOR_TYPE_NAMES = [
  'Alleycat','Bagger','Blood Leech','Cleaver','Consensualist','Farmer','Osiris','Sandman',
  'Scene Queen','Siren','Extortionist','Graverobber','Roadside Killer','Grim Reaper',
  'Montero','Pursuer','Trapdoor','Tithe Collector'
];

// 🔹 Core data
// Predator data structure, separated from CharacterSetup.jsx
// 'desc' field is updated with new user-provided text.
// 'rolls', 'restrict', 'picks', and 'effects' are preserved from the original component
// as they contain the application logic.
export const PREDATOR_TYPES = {
  Alleycat: {
    desc: 'Those who find violence to be the quickest way to get what they want might gravitate towards this hunting style. Alleycats are a vampire who feeds by brute force and outright attack and feeds from whomever they can when they can. Intimidation is a route easily taken to make their victims cower or even Dominating the victims to not report the attack or mask it as something else entirely. [1] Strength + Brawl is to take blood by force or threat. Wits + Streetwise can be used to find criminals as if a vigilante figure. [2]',
    rolls: 'Strength + Brawl • Wits + Streetwise',
    picks: {
      specialty: ['Intimidation (Stickups)','Brawl (Grappling)'],
      discipline: () => ['Celerity','Potence'],
    },
    effects: {
      humanity: -1,
      backgrounds: [{ name:'Contacts (Criminals)', dots:3 }],
    },
  },

  Bagger: {
    desc: "Sometimes the best blood doesn't come from a live body. Baggers are kindred who take an approach most are unable to with their ability to consume preserved, defractionated or rancid blood Through (•••) Iron Gullet, allowing them to feed from unusual sources such as blood bags or corpses. Perhaps they work in a hospital or blood bank or they might even have enough knowledge about the black market to obtain their blood. Ventrue are unable to pick this Predator type. [3] Intelligence + Streetwise can be used to find, gain access and purchase the goods. [2]",
    rolls: 'Intelligence + Streetwise',
    restrict: (sheet) => sheet.clan === 'Ventrue' ? 'Ventrue cannot pick Bagger' : null,
    picks: {
      specialty: ['Larceny (Lock Picking)','Streetwise (Black Market)'],
      discipline: (clan) => {
        const opts = ['Obfuscate'];
        // New text citations [4] and [5] confirm this logic
        if (clan==='Tremere' || clan==='Banu Haqim') opts.unshift('Blood Sorcery');
        if (clan==='Hecata') opts.unshift('Oblivion');
        return opts;
      },
    },
    effects: {
      merits: [{ name:'Iron Gullet', dots:3 }],
      flaws: [{ name:'Enemy', dots:2 }],
    },
  },

  'Blood Leech': {
    desc: "Some Kindred might see feeding from mortals as inherently wrong or disgusting regardless of others' rationale. Blood Leech is a feeding style that is not looked upon kindly by many vampires making it risky unless the Kindred has a position of power and can keep their little secret secure. Regardless, with their rejection of mortal blood, they instead feed upon the vitae of other vampires Through hunting those weaker than them, coercion, or taking Blood as payment. [3]",
    rolls: '— (not abstracted)', // Confirmed by new text [2]
    picks: {
      specialty: ['Brawl (Kindred)','Stealth (Against Kindred)'],
      discipline: () => ['Celerity','Protean'],
      flawChoice: ['Dark Secret: Diablerist (••)','Shunned (••)'],
    },
    effects: {
      humanity: -1,
      bloodPotency: +1,
      feedingFlaws: [{ name:'Prey Exclusion (Mortals)', dots:2 }],
    },
  },

  Cleaver: {
    desc: "The sweetest blood might be from those closest to them, the Cleaver takes advantage of that idea while taking blood from either their own close family and friends or even those close to someone else. Covertly stealing the blood from their victims while still maintaining ties to them. Cleavers will go to extreme lengths to keep their condition a secret from their victims but some may instead take a less than pleasant route. The Camarilla forbids the practice of taking a human family in this fashion, as it's a breach waiting to happen. [3] This hunting style is typically rare for ancilla or older characters due to inherent risk or becoming otherwise unsustainable over time. [6]",
    rolls: 'Manipulation + Subterfuge', // Confirmed by new text [2]
    picks: {
      specialty: ['Persuasion (Gaslighting)','Subterfuge (Coverups)'],
      discipline: () => ['Dominate','Animalism'],
    },
    effects: {
      flaws: [{ name:'Dark Secret: Cleaver', dots:1 }],
      backgrounds: [{ name:'Herd', dots:2 }],
    },
  },

  Consensualist: {
    desc: "Consent is a dangerous thing to gather when they're a blood-sucking monster, but Consensualists make do. They never feed against the victim's free will, instead pretending to be a representative of a charity blood drive, someone with a blood kink within the kink community, or blatantly admitting to their victims what they are and getting their permission to feed. To the Camarilla, the last method is considered a masquerade breach but perhaps to a philosophical Anarch, it might be an acceptable risk to take. [7] This hunting style is typically rare for ancilla or older characters due to inherent risk or becoming otherwise unsustainable over time. [6]",
    rolls: 'Manipulation + Persuasion', // Confirmed by new text [2]
    picks: {
      specialty: ['Medicine (Phlebotomy)','Persuasion (Vessels)'],
      discipline: () => ['Auspex','Fortitude'],
    },
    effects: {
      humanity: +1,
      flaws: [
        { name:'Dark Secret: Masquerade Breacher', dots:1 },
        { name:'Feeding Flaw: Prey Exclusion (Non-consenting)', dots:1 },
      ],
    },
  },

  Farmer: {
    desc: "Perhaps this vampire was once someone who worked as an activist or an aid worker, regardless of their reasoning the Farmer only feed from animals as their primary source of blood. The beast may gnaw at them with its throes of hunger, but they've successfully managed to avoid killing mortals except on the occasional bad night. Ventrue may not pick this Predator type and it cannot be taken on characters with Blood Potency 3 or higher. [7] This hunting style is typically rare for ancilla or older characters due to inherent risk or becoming otherwise unsustainable over time. [6]",
    rolls: 'Composure + Animal Ken', // Confirmed by new text [2]
    restrict: (sheet) => {
      if (sheet.clan==='Ventrue') return 'Ventrue cannot pick Farmer';
      if ((sheet.bloodPotency ?? 1) >= 3) return 'Farmer requires Blood Potency < 3';
      return null;
    },
    picks: {
      specialty: ['Animal Ken (specific animal)','Survival (Hunting)'],
      discipline: () => ['Animalism','Protean'],
    },
    effects: {
      humanity: +1,
      feedingFlaws: [{ name:'Feeding Flaw: Farmer', dots:2 }],
    },
  },

  Osiris: {
    desc: "More than not, Osiris are celebrities within mortal society. Musicians, writers, priests, and even cult leaders may find an easy time finding their blood by utilizing those already around them. They tend to feed from their fans or worshippers which means they have easy access to blood, but followers tend to attract their own problems with the local authority or worse. [7]",
    rolls: 'Manipulation + Subterfuge or Intimidation (+ Fame)', // Confirmed by new text [2]
    picks: {
      specialty: ['Occult (specific tradition)','Performance (specific field)'],
      discipline: (clan) => {
        const opts = ['Presence'];
        // New text citation [4] confirms this logic
        if (clan==='Tremere' || clan==='Banu Haqim') opts.unshift('Blood Sorcery');
        return opts;
      },
      backgroundPool: [{ total:3, options:['Fame','Herd'] }],
      flawPool: [{ total:2, options:['Enemies','Mythic Flaws'] }],
    },
    effects: {},
  },

  Sandman: {
    desc: "If they never wake during the feed it never happened, right? Sandman prefers to hunt on sleeping mortals than anyone else by using stealth or Disciplines to feed from their victims they are rarely caught in the act, though when they are, problems are sure to occur. Maybe they were anti-social in life or perhaps they find the route of seduction or violence too much for them and find comfort in the silence of this feeding style. [7]",
    rolls: 'Dexterity + Stealth', // Confirmed by new text [8]
    picks: {
      specialty: ['Medicine (Anesthetics)','Stealth (Break-in)'],
      discipline: () => ['Auspex','Obfuscate'],
    },
    effects: {
      backgrounds: [{ name:'Resources', dots:1 }],
    },
  },

  'Scene Queen': {
    desc: "Similar to Osiris these Kindred find comfort in a particular subculture rather than a wider audience. Hunting in or around a subculture they likely belonged to in their previous life, their victims adore them for their status, and those who have an inkling of what they are disbelieved. The scene itself could be anything, from street culture to high fashion, and the unifying trait is the use of those around them. [9]",
    rolls: 'Manipulation + Persuasion', // Confirmed by new text [8]
    picks: {
      specialty: [
        'Etiquette (specific scene)',
        'Leadership (specific scene)',
        'Streetwise (specific scene)',
      ],
      discipline: () => ['Dominate','Potence'],
      flawChoice: [
        'Influence Flaw: Disliked (•)',
        'Feeding Flaw: Prey Exclusion (different subculture)',
      ],
    },
    effects: {
      backgrounds: [{ name:'Fame', dots:1 },{ name:'Contacts', dots:1 }],
    },
  },

  Siren: {
    desc: "Everyone knows that sex sells and the Siren uses this to their advantage. Almost exclusively feeding while feigning sex or sexual interest, they utilize Disciplines and seduction to lure away a possible meal. Moving Through clubs and one-night stands are skills they've mastered and regardless of how sexy they feel, deep in their darkest moments, they realize at best they are problematic and at worst a serial sexual assaulter. In life, they might have been a scriptwriter, a small time actor who never reached the big screen, a well-known kinkster or even a virgin looking to make up for the lost time. [9]",
    rolls: 'Charisma + Subterfuge', // Confirmed by new text [8]
    picks: {
      specialty: ['Persuasion (Seduction)','Subterfuge (Seduction)'],
      discipline: () => ['Fortitude','Presence'],
    },
    effects: {
      merits: [{ name:'Looks: Beautiful', dots:2 }],
      flaws: [{ name:'Enemy (spurned lover/jealous partner)', dots:1 }],
    },
  },

  Extortionist: {
    desc: "Found in Cults of the Blood God. On the surface, Extortionists acquire their blood in exchange for services such as protection, security, or surveillance. Though, for as many times as the service might be genuine, there are many more times when the service has been offered from fabricated information to make the deal feel that much sweeter. [5]",
    rolls: 'Strength/Manipulation + Intimidation', // Confirmed by new text [5]
    picks: {
      specialty: ['Intimidation (Coercion)','Larceny (Security)'],
      discipline: () => ['Dominate','Potence'],
      backgroundPool: [{ total:3, options:['Contacts','Resources'] }],
    },
    effects: {
      flaws: [{ name:'Enemy (Police or escaped victim)', dots:2 }],
    },
  },

  Graverobber: {
    desc: "Found in Cults of the Blood God. Similar to Baggers these kindred understand there's no good in wasting good blood, even if others cannot consume it. Often they find themselves digging up corpses or working or mortuaries to obtain their bodies, yet regardless of what the name suggests, they prefer feeding from mourners at a gravesite or a hospital. This Predator Type often requires a haven or other connections to a church, hospital, or morgue as a way to obtain the bodies. [5]",
    rolls: 'Resolve + Medicine • Manipulation + Insight', // Confirmed by new text [5]
    picks: {
      specialty: ['Occult (Grave Rituals)','Medicine (Cadavers)'],
      discipline: () => ['Fortitude','Oblivion'],
    },
    effects: {
      merits: [{ name:'Iron Gullet', dots:3 }],
      backgrounds: [{ name:'Haven', dots:1 }],
      feedingFlaws: [{ name:'Herd Flaw: Obvious Predator', dots:2 }],
    },
  },

  'Roadside Killer': {
    desc: "Found in Let the Streets Run Red. These Kindred never stay in one spot for too long and are always on the move, hunting those who won't be missed if they disappear alongside the road. Roadside Killers know the risk is just as worth as the reward. Perhaps this Kindred was once a truck driver themselves or maybe they met their fate alongside the road as well. [10]",
    rolls: 'Dex/Cha + Drive', // Confirmed by new text [10]
    picks: {
      specialty: ['Survival (the road)','Investigation (vampire cant)'],
      discipline: () => ['Fortitude','Protean'],
    },
    effects: {
      backgrounds: [{ name:'Herd (migrating)', dots:2 }],
      feedingFlaws: [{ name:'Prey Exclusion (locals)', dots:1 }],
    },
  },

  'Grim Reaper': {
    desc: "Hunting inside hospice care facilities, assisted living homes, and other places where those who are near death reside. Grim Reapers are constantly on the move in an effort to locate new victims near the end of their lives to feed from. Hunting in this style may also earn a taste for specific diseases making them easier to identify. [11]",
    rolls: 'Intelligence + Awareness/Medicine',
    picks: {
      specialty: ['Awareness (Death)','Larceny (Forgery)'],
      discipline: () => ['Auspex','Oblivion'],
      backgroundChoice: ['Allies (Medical)','Influence (Medical)'],
    },
    effects: {
      humanity: +1,
      feedingFlaws: [{ name:'Prey Exclusion (Healthy Mortals)', dots:1 }],
    },
  },

  Montero: {
    desc: "Montero carry on a tradition held by aristocratic Spaniards where they hunted deer and used teams to drive them into the huntsman. Retainers drive the victims towards the vampire for them to feed. This is not always done in the traditional style but in the forms of long cons, flash mobs, or gang pursuits. [11]",
    rolls: 'Int + Stealth • Resolve + Stealth',
    picks: {
      specialty: ['Leadership (Hunting Pack)','Stealth (Stakeout)'],
      discipline: () => ['Dominate','Obfuscate'],
    },
    effects: {
      backgrounds: [{ name:'Retainers', dots:2 }],
      humanity: -1,
    },
  },

  Pursuer: {
    desc: "For those who prefer to stalk their victim, learning their habits and routines, determining if they will cause an outcry if they disappear or not. The Pursuer strikes when the time is right and when hunger is at a perfect balance. [11]",
    rolls: 'Int + Investigation • Stamina + Stealth',
    picks: {
      specialty: ['Investigation (Profiling)','Stealth (Shadowing)'],
      discipline: () => ['Animalism','Auspex'],
    },
    effects: {
      merits: [{ name:'Bloodhound', dots:1 }],
      backgrounds: [{ name:'Contacts (local underbelly)', dots:1 }],
      humanity: -1,
    },
  },

  Trapdoor: {
    desc: "Much like the spider, this vampire builds a nest and lures their prey inside. Be it an amusement park, an abandoned house, or an underground club, the victim comes to them. There the trapdoor might only play with their mind and terrorize them, imprison them to drain them slowly, or take a deep drink and then send them home. [12]",
    rolls: 'Cha + Stealth • Dex + Stealth • Wits + Awareness + Haven',
    picks: {
      specialty: ['Persuasion (Marketing)','Stealth (Ambushes or Traps)'],
      discipline: () => ['Protean','Obfuscate'],
      backgroundChoice: ['Retainers +1','Herd +1','Haven +1 (second dot)'],
      havenFlawChoice: ['Haven Flaw: Creepy (•)','Haven Flaw: Haunted (•)'],
    },
    effects: {
      backgrounds: [{ name:'Haven', dots:1 }],
    },
  },

  'Tithe Collector': {
    desc: "They hold enough power that other Kindred around them pay tribute in the form of specially selected vessels, who are delivered regularly, or upon request. The vessels must be kept in reasonable condition and returned, but otherwise the Masquerade is everyone else's problem. [13]",
    rolls: '—',
    picks: {
      specialty: ['Intimidation (Kindred)','Leadership (Kindred)'],
      discipline: () => ['Dominate','Presence'],
      backgroundPool: [{ total:3, options:['Domain','Status'] }],
    },
    effects: {
      flaws: [{ name:'Adversary', dots:2 }],
    },
  },
};