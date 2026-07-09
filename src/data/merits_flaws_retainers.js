// src/data/merits_flaws_retainers.js

// 🔹 Shared helpers
const slug = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, '_');
const idFor = (cat, name) => `${slug(cat)}__${slug(name)}`;

// 🔹 Categories list (top-level for mortals)
export const RETAINER_MF_CATEGORIES = [
    'Linguistics',
    'Looks',
    'Psychological',
    'Other',
    'Ghouls',
    'Cults',
    'Backgrounds',
];

export const RETAINER_MERITS_AND_FLAWS = {
    // ===== Linguistics =====
    'Linguistics': {
        blurb: 'Merits covering language and the ability to communicate/understand spoken or written language.[cite: 2]',
        merits: [
            {
                id: idFor('Linguistics', 'Linguistics'),
                name: 'Linguistics',
                dots: '• +',
                description: 'Each dot allows the character to read, write, and speak fluently in another language beyond their native tongue and the Domain language.[cite: 2]',
            },
        ],
        flaws: [
            {
                id: idFor('Linguistics', 'Illiterate'),
                name: 'Illiterate',
                dots: '••',
                description: 'Cannot read or write. Academics and Science Skills cannot go beyond 1 dot.[cite: 2]',
            },
        ],
    },

    // ===== Looks =====
    'Looks': {
        blurb: 'Related to mundane physical appearance.[cite: 2]',
        merits: [
            { id: idFor('Looks', 'Beautiful'), name: 'Beautiful', dots: '••', description: 'Add +1 die to related Social pools.[cite: 2]' },
            { id: idFor('Looks', 'Stunning'), name: 'Stunning', dots: '••••', description: 'Add +2 dice to related Social pools.[cite: 2]' },
            { id: idFor('Looks', 'Famous Face'), name: 'Famous Face', dots: '•', description: 'Resemble someone famous: +2 dice in social tests where this helps; −2 dice to avoid recognition.[cite: 2]' },
            { id: idFor('Looks', 'Ingénue'), name: 'Ingénue', dots: '•', description: 'Appear innocent and blameless: +2 dice to avoid suspicion or deflect blame (ST discretion).[cite: 2]' },
            { id: idFor('Looks', 'Remarkable Feature'), name: 'Remarkable Feature', dots: '•', description: 'Rare/memorable feature: +2 dice with strangers; −1 die to disguise.[cite: 2]' },
            { id: idFor('Looks', 'Scene Kid'), name: 'Scene Kid', dots: '•', description: 'The player\'s style embodies that of a particular subculture. Add one die to all appropriate Social pools when dealing with that subculture.[cite: 2]' },
        ],
        flaws: [
            { id: idFor('Looks', 'Ugly'), name: 'Ugly', dots: '•', description: '−1 die from related Social pools.[cite: 2]' },
            { id: idFor('Looks', 'Repulsive'), name: 'Repulsive', dots: '••', description: '−2 dice from related Social pools.[cite: 2]' },
            { id: idFor('Looks', 'Transparent'), name: 'Transparent', dots: '•', description: 'Unable to lie effectively: −1 die to any pools requiring Subterfuge; cannot buy dots in Subterfuge.[cite: 2]' },
        ],
    },

    // ===== Psychological =====
    'Psychological': {
        blurb: 'Mental resilience and mortal beliefs.[cite: 2]',
        merits: [
            { id: idFor('Psychological', 'Unholy Will'), name: 'Unholy Will', dots: '•• or ••••', description: 'Vs True Faith: +1 die and −1 holy damage at ••; +2 dice and −2 damage at ••••.[cite: 2]' },
            { id: idFor('Psychological', 'Zealotry'), name: 'Zealotry', dots: '• - •••', description: 'Once/session per dot: turn a normal success (aligned to a Conviction) into a Messy Critical.[cite: 2]' },
        ],
        flaws: [
            { id: idFor('Psychological', 'Beacon of Profanity'), name: 'Beacon of Profanity', dots: '•', description: 'Mortals with any True Faith sense your presence.[cite: 2]' },
            { id: idFor('Psychological', 'Groveling Worm'), name: 'Groveling Worm', dots: '••', description: 'Must scourge flesh once per session for 2 Superficial Health or suffer 1 Aggravated Willpower next session.[cite: 2]' },
        ],
    },

    // ===== Other =====
    'Other': {
        blurb: 'Miscellaneous mundane merits and flaws.[cite: 2]',
        merits: [
            { id: idFor('Other', 'Check the Trunk'), name: 'Check the Trunk', dots: '•', description: 'Access to a modest armory/cache (≤ Resources 2 items). +2 dice to Preparation rolls.[cite: 2]' },
            { id: idFor('Other', 'Side Hustler'), name: 'Side Hustler', dots: '••', description: 'Once/session get an item, info, or access as if you had 2 dots in Resources/Contacts/Influence.[cite: 2]' },
        ],
        flaws: [
            { id: idFor('Other', 'Knowledge Hungry'), name: 'Knowledge Hungry', dots: '•', description: 'Pick a topic at creation; when learning it, must roll Willpower (Diff 3) to resist pursuing.[cite: 2]' },
            { id: idFor('Other', 'Risk-Taker Errata'), name: 'Risk-Taker Errata', dots: '•', description: 'When tempted by a new risky act, −2 dice to all actions until you do it or the scene ends.[cite: 2]' },
            { id: idFor('Other', 'Weak-Willed'), name: 'Weak-Willed', dots: '••', description: 'Even when aware, you cannot use active resistance systems to avoid attempts to sway you.[cite: 2]' },
        ],
    },

    // ===== Ghouls =====
    'Ghouls': {
        blurb: 'Only ghouls may take these. Validated via the "Is Ghoul?" toggle.[cite: 2]',
        merits: [
            { id: idFor('Ghouls', 'Blood Empathy'), name: 'Blood Empathy', dots: '••', description: 'Sense if your regnant is in danger/needing you (no telepathy).[cite: 2]', restrictions: 'Ghouls only' },
            { id: idFor('Ghouls', 'Unseemly Aura'), name: 'Unseemly Aura', dots: '••', description: 'Aura indistinguishable from Kindred\'s.[cite: 2]', restrictions: 'Ghouls only' },
        ],
        flaws: [
            { id: idFor('Ghouls', 'Baneful Blood'), name: 'Baneful Blood (Errata)', dots: '• - ••', description: 'Experiences the Bane of first domitor.[cite: 2]' },
            { id: idFor('Ghouls', "Crone's Curse"), name: "Crone's Curse (Errata)", dots: '••', description: 'Appears a decade older; −1 Health box.[cite: 2]' },
            { id: idFor('Ghouls', 'Distressing Fangs'), name: 'Distressing Fangs (Errata)', dots: '•', description: 'Developed fangs; −1 die to Social with mortals.[cite: 2]' },
        ],
    },

    // ===== Cults =====
    'Cults': {
        blurb: 'Mortal cultist merits and flaws.[cite: 2]',
        merits: [
            { id: idFor('Cults', 'Apocryphal Texts'), name: 'Apocryphal Texts', dots: '•', description: 'Possess writings from a leader. Gain two dice on applicable Intelligence rolls.[cite: 2]' },
            { id: idFor('Cults', 'Inspired Artist'), name: 'Inspired Artist', dots: '••', description: 'Add a 1-die penalty to onlookers to resist Social rolls from cult members.[cite: 2]' },
            { id: idFor('Cults', 'Traveling Preacher'), name: 'Traveling Preacher', dots: '••', description: 'Reduce the difficulty on rolls to avoid the Second Inquisition by 1.[cite: 2]' },
        ],
        flaws: [
            { id: idFor('Cults', 'Excommunicated'), name: 'Excommunicated', dots: '• - ••', description: 'Subtract 2 dice from all rolls dealing with the cult. At 2 dots, they seek to destroy you.[cite: 2]' },
            { id: idFor('Cults', 'Faithless'), name: 'Faithless', dots: '••', description: 'Lose two dice on Resolve and Composure rolls pertaining to the Cult.[cite: 2]' },
        ]
    },

    // ===== Backgrounds =====
    'Backgrounds': {
        blurb: 'Foundations from mortal life.[cite: 2]',
        groups: {
            'Allies': {
                merits: [{ id: idFor('Backgrounds Allies', 'Allies'), name: 'Allies', dots: '•• - ••••••', description: 'Build between (•–••••) Effectiveness and (•–•••) Reliability.[cite: 2]' }],
                flaws: [{ id: idFor('Backgrounds Allies', 'Enemy'), name: 'Enemy', dots: '• +', description: 'Opposite of Allies; rated two dots less than your Allies effectiveness.[cite: 2]' }],
            },
            'Contacts': {
                merits: [{ id: idFor('Backgrounds Contacts', 'Contacts'), name: 'Contacts', dots: '• - •••', description: 'Mortals who can get information, items, or other value.[cite: 2]' }],
                flaws: [],
            },
            'Fame': {
                merits: [
                    { id: idFor('Backgrounds Fame', 'Fame'), name: 'Fame', dots: '• - •••••', description: 'Public notoriety.[cite: 2]' },
                    { id: idFor('Backgrounds Fame', 'Influencer'), name: 'Influencer', dots: '•', description: 'Requires Fame ••+. Have the equivalent Influence rating equal to your Fame minus one towards a fan once per story.[cite: 2]' },
                ],
                flaws: [
                    { id: idFor('Backgrounds Fame', 'Dark Secret'), name: 'Dark Secret', dots: '• +', description: 'A dangerous secret known to a few dedicated enemies.[cite: 2]' },
                    { id: idFor('Backgrounds Fame', 'Infamy'), name: 'Infamy', dots: '• +', description: 'You did something atrocious and others know.[cite: 2]' },
                ],
            },
            'Influence': {
                merits: [{ id: idFor('Backgrounds Influence', 'Influence'), name: 'Influence', dots: '• - •••••', description: 'Sway in mortal spheres; typically limited to a group/region.[cite: 2]' }],
                flaws: [
                    { id: idFor('Backgrounds Influence', 'Disliked'), name: 'Disliked', dots: '•', description: '−1 die to Social vs groups outside your loyal followers.[cite: 2]' },
                    { id: idFor('Backgrounds Influence', 'Despised'), name: 'Despised', dots: '••', description: 'One group/region actively works to ruin your plans.[cite: 2]' },
                ],
            },
            'Haven': {
                merits: [
                    { id: idFor('Backgrounds Haven', 'Haven'), name: 'Haven', dots: '• - •••', description: 'Safer/private shelter; more dots = more secure.[cite: 2]' },
                    { id: idFor('Backgrounds Haven', 'Hidden Armory'), name: 'Hidden Armory', dots: '• +', description: 'Each dot adds 1 pistol and 1 firearm, concealed.[cite: 2]' },
                    { id: idFor('Backgrounds Haven', 'Security System'), name: 'Security System', dots: '• +', description: '+1 die per dot to resist unwelcome guests.[cite: 2]' },
                    { id: idFor('Backgrounds Haven', 'Mobile'), name: 'Mobile', dots: '• - •••', description: 'Mobile haven (car, van, boat, plane, etc.).[cite: 2]' },
                ],
                flaws: [
                    { id: idFor('Backgrounds Haven', 'No Haven'), name: 'No Haven', dots: '•', description: 'Must make basic test nightly to find secure rest.[cite: 2]' },
                    { id: idFor('Backgrounds Haven', 'Compromised'), name: 'Compromised', dots: '••', description: 'On a watchlist / possibly raided.[cite: 2]' },
                ],
            },
            'Resources': {
                merits: [{ id: idFor('Backgrounds Resources', 'Resources'), name: 'Resources', dots: '• - •••••', description: 'Cashflow, assets, income, or access.[cite: 2]' }],
                flaws: [{ id: idFor('Backgrounds Resources', 'Destitute'), name: 'Destitute', dots: '•', description: 'No money/home; no monetary value beyond yourself.[cite: 2]' }],
            }
        }
    }
};

function bulletCount(s = '') {
  const m = String(s).match(/•/g);
  return m ? m.length : 0;
}

function parseDotSpec(spec = '') {
  const src = String(spec).trim();
  if (!src) return [];
  if (/\bor\b/i.test(src)) {
    const opts = src.split(/\bor\b/i).map(s => bulletCount(s)).filter(n => n > 0);
    return Array.from(new Set(opts)).sort((a, b) => a - b);
  }
  if (src.includes('-')) {
    const [lo, hi] = src.split('-').map(s => bulletCount(s));
    if (lo > 0 && hi >= lo) { const out = []; for (let i = lo; i <= hi; i++) out.push(i); return out; }
  }
  if (src.includes('+')) {
    const min = bulletCount(src);
    return min > 0 ? [min] : [];
  }
  const n = bulletCount(src);
  return n > 0 ? [n] : [];
}

export function allSelectableAdvantages(isFlaw, isGhoul = false) {
  const out = [];
  for (const [cat, payload] of Object.entries(RETAINER_MERITS_AND_FLAWS)) {
    const exclusions = ['Caitiff', 'Thin-blood', 'Cults'];
    if (!isGhoul) exclusions.push('Ghouls');
    if (exclusions.includes(cat)) continue;
    const pushIt = (item, category) => {
      const allowed = parseDotSpec(item.dots);
      if (!allowed.length) return;
      out.push({ id: item.id, name: item.name, dotsSpec: item.dots, description: item.description, category, allowed });
    };
    const list = isFlaw ? payload.flaws : payload.merits;
    (list || []).forEach(m => pushIt(m, cat));
    if (payload.groups) {
      for (const [sub, grp] of Object.entries(payload.groups)) {
        const subList = isFlaw ? grp.flaws : grp.merits;
        (subList || []).forEach(m => pushIt(m, `${cat} / ${sub}`));
      }
    }
  }
  const seen = new Set();
  return out.filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}