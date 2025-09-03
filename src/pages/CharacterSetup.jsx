import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import styles from '../styles/Sheet.module.css';

/* ---------- Config ---------- */
const CLANS = [
  'Brujah','Gangrel','Malkavian','Nosferatu','Toreador','Tremere','Ventrue',
  'Hecata', 'The Ministry',
  // 'Caitiff','Thin-blood','Banu Haqim','Lasombra'
];

// Flavor-only blurbs
const CLAN_BLURBS = {
  Brujah: 'Rebels & firebrands who turn conviction into force.',
  Gangrel: 'Feral survivors close to the Beast and the wild.',
  Malkavian: 'Cursed seers who glimpse truth through cracks.',
  Nosferatu: 'Monstrous spies and info-brokers of the underbelly.',
  Toreador: 'Aesthetic predators intoxicated by beauty.',
  Tremere: 'Blood sorcerers obsessed with occult mastery.',
  Ventrue: 'Aristocrats of the night; command and control.',
  'Banu Haqim': 'Judges and hunters; blades in the dark.',
  Hecata: 'Necromantic consortium dealing with Death itself.',
  Lasombra: 'Shadow aristocrats who bend darkness to will.',
  'The Ministry': 'Tempters and iconoclasts who break taboos.',
  Caitiff: 'Clanless strays with no inherited path.',
  'Thin-blood': 'Faint undead spark; alchemy and ambiguity.'
};

// Dark palettes per clan
const CLAN_COLORS = {
  Brujah:    ['#b40f1f','#7a0b15'],
  Gangrel:   ['#2f7a3a','#173a1f'],
  Malkavian: ['#713c8b','#3a1f47'],
  Nosferatu: ['#6a4b2b','#332515'],
  Toreador:  ['#b8236b','#5c1338'],
  Tremere:   ['#7b1113','#37090a'],
  Ventrue:   ['#1b4c8c','#0e2547'],
  'Banu Haqim': ['#7a2f57','#3a1730'],
  Hecata:    ['#2b6b6b','#123636'],
  Lasombra:  ['#191a5a','#0c0d2e'],
  'The Ministry': ['#865f12','#3c2a08'],
  Caitiff:   ['#636363','#2f2f2f'],
  'Thin-blood': ['#6e6e2b','#383813'],
};

// --- Asset helpers ---
const NAME_OVERRIDES = {
  'The Ministry': 'Ministry',
  'Banu Haqim': 'Banu_Haqim',
  'Thin-blood': 'Thinblood'
};
const symlogo = (c) =>
  `/img/clans/330px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g,'_')}_symbol.png`;
const textlogo = (c) =>
  `/img/clans/text/300px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g,'_')}_Logo.png`;

// Disciplines per clan
const CLAN_DISCIPLINES = {
  Brujah: ['Celerity','Potence','Presence'],
  Gangrel: ['Animalism','Fortitude','Protean'],
  Malkavian: ['Auspex','Dominate','Obfuscate'],
  Nosferatu: ['Animalism','Obfuscate','Potence'],
  Toreador: ['Auspex','Celerity','Presence'],
  Tremere: ['Auspex','Blood Sorcery','Dominate'],
  Ventrue: ['Dominate','Fortitude','Presence'],
  'Banu Haqim': ['Blood Sorcery','Celerity','Obfuscate'],
  Hecata: ['Auspex','Fortitude','Oblivion'],
  Lasombra: ['Dominate','Oblivion','Potence'],
  'The Ministry': ['Obfuscate','Presence','Protean'],
  Caitiff: ['Choose Any','Choose Any','Choose Any'],
  'Thin-blood': ['Thin-blood Alchemy']
};

// Attributes / Skills
const ATTRS = {
  Physical: ['Strength','Dexterity','Stamina'],
  Social:   ['Charisma','Manipulation','Composure'],
  Mental:   ['Intelligence','Wits','Resolve']
};
const SKILLS = {
  Physical: ['Athletics','Brawl','Craft','Drive','Firearms','Larceny','Melee','Stealth','Survival'],
  Social:   ['Animal Ken','Etiquette','Insight','Intimidation','Leadership','Performance','Persuasion','Streetwise','Subterfuge'],
  Mental:   ['Academics','Awareness','Finance','Investigation','Medicine','Occult','Politics','Science','Technology'],
};

// --- Predator Types (with choices & effects) ---
const PREDATORS = {
  Alleycat: {
    desc: 'Violent taker. Feeds by force, intimidation, or ambush.',
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
    desc: 'Feeds from bags/corpses via Iron Gullet; hospitals/black market.',
    rolls: 'Intelligence + Streetwise',
    restrict: (sheet) => sheet.clan === 'Ventrue' ? 'Ventrue cannot pick Bagger' : null,
    picks: {
      specialty: ['Larceny (Lock Picking)','Streetwise (Black Market)'],
      discipline: (clan) => {
        const opts = ['Obfuscate'];
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
    desc: 'Feeds on Kindred (taboo); coercion or ambush.',
    rolls: '— (not abstracted)',
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
    desc: 'Feeds from close ties/family; covert and risky.',
    rolls: 'Manipulation + Subterfuge',
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
    desc: 'Feeds with consent (drive/kink/confession).',
    rolls: 'Manipulation + Persuasion',
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
    desc: 'Feeds from animals only; difficult hunger.',
    rolls: 'Composure + Animal Ken',
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
    desc: 'Celebrity/cult leader feeding from fans.',
    rolls: 'Manipulation + Subterfuge or Intimidation (+ Fame)',
    picks: {
      specialty: ['Occult (specific tradition)','Performance (specific field)'],
      discipline: (clan) => {
        const opts = ['Presence'];
        if (clan==='Tremere' || clan==='Banu Haqim') opts.unshift('Blood Sorcery');
        return opts;
      },
      backgroundPool: [{ total:3, options:['Fame','Herd'] }],
      flawPool: [{ total:2, options:['Enemies','Mythic Flaws'] }],
    },
    effects: {},
  },

  Sandman: {
    desc: 'Feeds on sleeping victims; stealthy break-ins.',
    rolls: 'Dexterity + Stealth',
    picks: {
      specialty: ['Medicine (Anesthetics)','Stealth (Break-in)'],
      discipline: () => ['Auspex','Obfuscate'],
    },
    effects: {
      backgrounds: [{ name:'Resources', dots:1 }],
    },
  },

  'Scene Queen': {
    desc: 'Subculture darling; adored inside, disliked outside.',
    rolls: 'Manipulation + Persuasion',
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
    desc: 'Feeding through seduction & sex.',
    rolls: 'Charisma + Subterfuge',
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
    desc: '“Protection” racket; blood for services.',
    rolls: 'Strength/Manipulation + Intimidation',
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
    desc: 'Cults of the Blood God. Blood from corpses/mourners.',
    rolls: 'Resolve + Medicine • Manipulation + Insight',
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
    desc: 'Let the Streets Run Red. Hunts travelers along roads.',
    rolls: 'Dex/Cha + Drive',
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
    desc: 'Hospice/assisted living feeding; taste for diseases.',
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
    desc: 'Aristocratic hunt with retainers; long cons & stakeouts.',
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
    desc: 'Stalks victims, profiles, and strikes at the right time.',
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
    desc: 'Lures prey into a lair/den and feeds there.',
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
    desc: 'Kindred pay tribute in vessels; authority & domain.',
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

// Render order for predators
const PREDATOR_NAMES = [
  'Alleycat','Bagger','Blood Leech','Cleaver','Consensualist','Farmer','Osiris','Sandman',
  'Scene Queen','Siren','Extortionist','Graverobber','Roadside Killer','Grim Reaper',
  'Montero','Pursuer','Trapdoor','Tithe Collector'
];

// V5-ish rules applied as requested
const RULES = {
  attributes: {
    min: 1, max: 4,
    // exactly: 1× at 1, 4× at 2, 3× at 3, 1× at 4
    pattern: { 1:1, 2:4, 3:3, 4:1 }
  },
  // Skills packages
  skillPackages: {
    'Jack of All Trades': { '3':1, '2':8, '1':10, max:4 },
    'Balanced':           { '3':3, '2':5, '1':7,  max:4 },
    'Specialist':         { '4':1, '3':3, '2':3, '1':3, max:4 },
  },
  disciplines: { twoPick: true }, // 2 chosen: one counts as 2, one as 1
  advantages: { meritsBudget: 7, minFlaws: 2 },
  humanity: 7, bloodPotency: 1
};

/* ---------- Utils ---------- */
const flat = (obj) => Object.values(obj).flat();

/* ---------- Component ---------- */
export default function CharacterSetup({ onDone }) {
  const [existing, setExisting] = useState(null);
  const [step, setStep] = useState(1);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  // Identity + meta
  const [name, setName] = useState('');
  const [concept, setConcept] = useState('');
  const [chronicle, setChronicle] = useState('Athens Thought-Time (S1)');
  const [ambition, setAmbition] = useState('');
  const [desire, setDesire] = useState('');

  // Clan
  const [clan, setClan] = useState(null);
  const clanDiscs = useMemo(() => CLAN_DISCIPLINES[clan] || [], [clan]);

  // Sire & Predator
  const [sire, setSire] = useState('');
  const [predatorType, setPredatorType] = useState('Alleycat');
  const [predatorPicks, setPredatorPicks] = useState({
    specialty: '',
    discipline: '',
    flawChoice: '',
    backgroundChoice: '',
    havenFlawChoice: '',
    pools: {}, // e.g. { 'Pool-0-3': { Fame:2, Herd:1 } }
  });
  const updatePool = (poolKey, option, value) => {
    setPredatorPicks(p => ({
      ...p,
      pools: {
        ...p.pools,
        [poolKey]: { ...(p.pools?.[poolKey]||{}), [option]: Math.max(0, Number(value)||0) }
      }
    }));
  };

  // Attributes
  const baseAttrs = useMemo(() => {
    const o = {}; flat(ATTRS).forEach(a => o[a]=RULES.attributes.min); return o;
  }, []);
  const [attrDots, setAttrDots] = useState(baseAttrs);

  // Skills
  const baseSkills = useMemo(() => {
    const o = {}; flat(SKILLS).forEach(s => o[s]=0); return o;
  }, []);
  const [skillDots, setSkillDots] = useState(baseSkills);
  const [skillPackage, setSkillPackage] = useState('Balanced');
  const [specialties, setSpecialties] = useState(['']);

  // Disciplines selection (2 picks, one favored at 2)
  const [selectedDiscs, setSelectedDiscs] = useState([]);
  const [favoredDisc, setFavoredDisc] = useState(null);
  const derivedDisciplineDots = useMemo(() => {
    const map = {};
    selectedDiscs.forEach(d => { map[d] = (favoredDisc === d ? 2 : 1); });
    return map;
  }, [selectedDiscs, favoredDisc]);

  // Advantages
  const [merits, setMerits] = useState([{ name:'', dots:0 }]);
  const [flaws, setFlaws] = useState([{ name:'', dots:0 }]);

  // Morality
  const [tenets, setTenets] = useState('');
  const [convictions, setConvictions] = useState(['']);
  const [touchstones, setTouchstones] = useState(['']);
  const [humanity, setHumanity] = useState(RULES.humanity);
  const [bloodPotency, setBloodPotency] = useState(RULES.bloodPotency);

  useEffect(() => {
    api.get('/characters/me').then(r => setExisting(r.data.character)).catch(()=>{});
  }, []);

  /* ---------- Derived: Attribute quotas ---------- */
  const attrCounts = useMemo(() => {
    const c = {1:0,2:0,3:0,4:0};
    Object.values(attrDots).forEach(v => { c[v] = (c[v]||0)+1; });
    return c;
  }, [attrDots]);

  const canIncAttr = (k) => {
    const v = attrDots[k] ?? RULES.attributes.min;
    if (v >= RULES.attributes.max) return false;
    const next = v + 1;
    const req = RULES.attributes.pattern;
    if ((attrCounts[next] || 0) >= (req[next] || 0)) return false;
    return true;
  };
  const canDecAttr = (k) => {
    const v = attrDots[k] ?? RULES.attributes.min;
    if (v <= RULES.attributes.min) return false;
    const req = RULES.attributes.pattern;
    if ((attrCounts[v] || 0) <= (req[v] || 0)) return false;
    return true;
  };

  /* ---------- Derived: Skill quotas ---------- */
  const skillReq = RULES.skillPackages[skillPackage];
  const skillCounts = useMemo(() => {
    const c = {0:0,1:0,2:0,3:0,4:0,5:0};
    Object.values(skillDots).forEach(v => { c[v] = (c[v]||0)+1; });
    return c;
  }, [skillDots]);

  const remainingSkillSlots = useMemo(() => {
    const out = {};
    ['1','2','3','4'].forEach(dot => {
      const need = Number(skillReq[dot] || 0);
      const have = Number(skillCounts[Number(dot)] || 0);
      out[dot] = Math.max(0, need - have);
    });
    return out;
  }, [skillReq, skillCounts]);

  const canIncSkill = (k) => {
    const v = skillDots[k] || 0;
    const next = v + 1;
    if (next > (skillReq.max || 5)) return false;
    if (!(String(next) in skillReq)) return false;
    if ((skillCounts[next] || 0) >= (skillReq[String(next)] || 0)) return false;
    return true;
  };
  const canDecSkill = (k) => {
    const v = skillDots[k] || 0;
    return v > 0;
  };

  /* ---------- Handlers ---------- */
  const incAttr = (k, d) =>
    setAttrDots(p => {
      const v = p[k] ?? RULES.attributes.min;
      const next = v + d;
      if (d > 0 && !canIncAttr(k)) return p;
      if (d < 0 && !canDecAttr(k)) return p;
      return {...p, [k]: Math.max(RULES.attributes.min, Math.min(RULES.attributes.max, next))};
    });

  const incSkill = (k, d) =>
    setSkillDots(p => {
      const v = p[k] || 0;
      if (d > 0 && !canIncSkill(k)) return p;
      if (d < 0 && !canDecSkill(k)) return p;
      const next = Math.max(0, Math.min((skillReq.max||5), v + d));
      return {...p, [k]: next};
    });

  const toggleDisc = (d) => {
    setSelectedDiscs(prev => {
      if (prev.includes(d)) {
        const next = prev.filter(x => x !== d);
        if (favoredDisc === d) setFavoredDisc(null);
        return next;
      }
      if (prev.length >= 2) return prev;
      return [...prev, d];
    });
  };

  /* ---------- Validation ---------- */
  const attrOk = useMemo(() => {
    const req = RULES.attributes.pattern;
    return [1,2,3,4].every(k => (attrCounts[k] || 0) === (req[k]||0));
  }, [attrCounts]);

  const skillOk = useMemo(() => {
    const req = RULES.skillPackages[skillPackage];
    const dotKeys = Object.keys(req).filter(k => k !== 'max');
    const exact = dotKeys.every(dot => (skillCounts[Number(dot)] || 0) === req[dot]);
    const maxOk = Object.values(skillDots).every(v => v <= req.max);
    return exact && maxOk;
  }, [skillCounts, skillDots, skillPackage]);

  const discOk = useMemo(
    () => selectedDiscs.length === 2 && favoredDisc && selectedDiscs.includes(favoredDisc),
    [selectedDiscs, favoredDisc]
  );

  // Predator selections validation
  const predatorOk = useMemo(() => {
    const P = PREDATORS[predatorType] || {};
    const restrictMsg = P.restrict ? P.restrict({ clan, bloodPotency }) : null;
    if (restrictMsg) return false;
    if (P.picks?.specialty && !predatorPicks.specialty) return false;
    if (P.picks?.discipline && !predatorPicks.discipline) return false;
    if (P.picks?.flawChoice && !predatorPicks.flawChoice) return false;
    if (P.picks?.backgroundChoice && !predatorPicks.backgroundChoice) return false;
    if (P.picks?.havenFlawChoice && !predatorPicks.havenFlawChoice) return false;
    // pools exact sum
    const pools = [...(P.picks?.backgroundPool||[]), ...(P.picks?.flawPool||[])];
    for (let i=0;i<pools.length;i++){
      const kind = i < (P.picks?.backgroundPool||[]).length ? 'Pool' : 'FlawPool';
      const key = `${kind}-${i}-${pools[i].total}`;
      const target = pools[i].total;
      const vals = predatorPicks.pools?.[key] || {};
      const sum = Object.values(vals).reduce((a,b)=>a+(Number(b)||0),0);
      if (sum !== target) return false;
    }
    return true;
  }, [predatorType, predatorPicks, clan, bloodPotency]);

  const meritsSpent = merits.reduce((a,m)=>a+(Number(m.dots)||0),0);
  const flawsTaken = flaws.reduce((a,f)=>a+(Number(f.dots)||0),0);
  const advOk = meritsSpent <= RULES.advantages.meritsBudget && flawsTaken >= RULES.advantages.minFlaws;

  const canSubmit = () =>
    name.trim().length && clan &&
    attrOk && skillOk && discOk && predatorOk &&
    advOk && humanity >= 1 && humanity <= 10;

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const payload = {
        name, concept, chronicle, ambition, desire,
        clan, sire,
        predator: {
          type: predatorType,
          picks: predatorPicks,
          suggestedEffects: PREDATORS[predatorType]?.effects || {}
        },
        predatorType, // keep legacy field if API expects it
        attributes: attrDots,
        skills: skillDots,
        specialties: specialties.filter(Boolean),
        disciplines: derivedDisciplineDots,
        advantages: { merits, flaws },
        morality: { tenets, convictions: convictions.filter(Boolean), touchstones: touchstones.filter(Boolean), humanity },
        bloodPotency
      };
      await api.post('/characters', { name, clan, sheet: payload });
      onDone?.();
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to save character');
    } finally { setSaving(false); }
  };

  if (existing) {
    return (
      <div className={styles.sheetCard}>
        <h3 className={styles.cardTitle}>Your Character</h3>
        <p>Character: <b>{existing.name}</b> ({existing.clan})</p>
      </div>
    );
  }

  const tint = clan ? CLAN_COLORS[clan][0] : '#8a0f1a';
  const currentPred = PREDATORS[predatorType] || {};

  return (
    <div className={styles.sheetRoot}>
      <div className={styles.sheetPage} data-clan={clan || '—'}>
        <div className={styles.vignette} aria-hidden="true" />
        <div className={styles.skyline} style={{'--tint': tint}} aria-hidden="true" />
        <div className={`${styles.sheetCard} ${styles.sheetWide} ${styles.bleedEdge}`}>
          <h2 className={styles.cardTitle}>Create Your Character</h2>
          {err && <div className={styles.alert}><span className={styles.alertDot} />{err}</div>}

          <Stepper
            step={step}
            setStep={setStep}
            labels={['Clan','Identity','Predator & Disciplines','Attributes','Skills','Advantages','Morality','Review']}
          />

          {/* STEP 1: Clan Picker */}
          {step === 1 && (
            <section>
              <h3 className={styles.sectionTitle}>Choose Your Clan</h3>
              <p className={`${styles.muted} ${styles.smallFlavor}`}>
                Blood remembers. Choose the lineage that will shape your curse.
              </p>
              <div className={styles.clanGrid}>
                {CLANS.map(c => {
                  const active = clan === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.clanCard} ${active ? styles.active : ''}`}
                      style={{ background: `linear-gradient(180deg, ${CLAN_COLORS[c][0]}, ${CLAN_COLORS[c][1]})` }}
                      onClick={()=>setClan(c)}
                      title={CLAN_BLURBS[c]}
                    >
                      <div className={styles.clanLogoWrap}>
                        <img src={symlogo(c)} alt={`${c} symbol`} className={styles.clanLogo} />
                      </div>
                      <div className={styles.clanMeta}>
                        <div className={styles.clanName}>{c}</div>
                        <div className={styles.clanBlurb}>{CLAN_BLURBS[c]}</div>
                        <div className={styles.clanDiscs}>{(CLAN_DISCIPLINES[c]||[]).join(' • ')}</div>
                        {active && (
                          <div className={styles.clanTextLogo}>
                            <img src={textlogo(c)} alt={`${c} text logo`} />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className={styles.navRow}>
                <span />
                <button className={styles.cta} type="button" disabled={!clan} onClick={()=>setStep(2)}>Next</button>
              </div>
            </section>
          )}

          {/* STEP 2: Identity */}
          {step === 2 && (
            <section>
              <h3 className={styles.sectionTitle}>Identity</h3>
              <p className={`${styles.muted} ${styles.smallFlavor}`}>
                A mask for the living, a name for the dead. Etch who you were—and what you seek.
              </p>
              <div className={styles.grid2}>
                <Field label="Name">
                  <input className={styles.input} value={name} onChange={e=>setName(e.target.value)}
                    placeholder="e.g., Telemachos Daskalakis" required />
                </Field>
                <Field label="Chronicle">
                  <input className={styles.input} value={chronicle} onChange={e=>setChronicle(e.target.value)}
                    placeholder="Athens Thought-Time (S1)" />
                </Field>
                <Field label="Concept">
                  <input className={styles.input} value={concept} onChange={e=>setConcept(e.target.value)}
                    placeholder="Haunted Prince • Fixer • Street Artist…" />
                </Field>
                <Field label="Ambition (long-term)">
                  <input className={styles.input} value={ambition} onChange={e=>setAmbition(e.target.value)}
                    placeholder="Rule a district, master Oblivion, redeem a name…" />
                </Field>
                <Field label="Desire (short-term)">
                  <input className={styles.input} value={desire} onChange={e=>setDesire(e.target.value)}
                    placeholder="Tonight’s hunger: a relic, a secret, a rival’s ruin…" />
                </Field>
                <Field label="Sire (the Story theller will tell you)">
                  <input className={styles.input} value={sire} onChange={e=>setSire(e.target.value)} placeholder="Leave blank for now" />
                </Field>
              </div>
              <div className={styles.navRow}>
                <button className={styles.ghostBtn} type="button" onClick={()=>setStep(1)}>Back</button>
                <button className={styles.cta} type="button" onClick={()=>setStep(3)}>Next</button>
              </div>
            </section>
          )}

          {/* STEP 3: Predator & Disciplines */}
          {step === 3 && (
            <section>
              <h3 className={styles.sectionTitle}>Predator & Disciplines</h3>
              <p className={`${styles.muted} ${styles.smallFlavor}`}>
                How you hunt, how you thrive. Choose your habits; choose your gifts.
              </p>

              {/* Predator cards */}
              <div className={styles.clanGrid}>
                {PREDATOR_NAMES.map(p => {
                  const P = PREDATORS[p];
                  const active = predatorType === p;
                  let restrictMsg = null;
                  try {
                    restrictMsg = P.restrict ? P.restrict({ clan, bloodPotency }) : null;
                  } catch { /* noop */ }
                  return (
                    <button
                      key={p}
                      type="button"
                      className={`${styles.clanCard} ${active ? styles.active : ''}`}
                      style={{ background:'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02))' }}
                      onClick={()=>setPredatorType(p)}
                      title={P.desc}
                    >
                      <div className={styles.clanMeta} style={{textAlign:'left'}}>
                        <div className={styles.clanName}>{p}</div>
                        <div className={styles.clanBlurb}>{P.desc}</div>
                        {P.rolls && <div className={styles.clanDiscs}>{P.rolls}</div>}
                        {restrictMsg && <div className={styles.alert} style={{marginTop:8}}><span className={styles.alertDot}/>{restrictMsg}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic predator choices */}
              <div className={styles.grid2} style={{marginTop:12}}>
                {/* Specialty pick */}
                {currentPred.picks?.specialty && (
                  <Field label="Predator Specialty">
                    <select
                      className={styles.input}
                      value={predatorPicks.specialty}
                      onChange={e=>setPredatorPicks(s=>({...s, specialty:e.target.value}))}
                    >
                      <option value="">— choose —</option>
                      {currentPred.picks.specialty.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </Field>
                )}

                {/* Discipline pick */}
                {(() => {
                  const allowedDisc = (currentPred.picks?.discipline ? currentPred.picks.discipline(clan) : []) || [];
                  return allowedDisc.length ? (
                    <Field label="Predator Discipline Dot">
                      <select
                        className={styles.input}
                        value={predatorPicks.discipline}
                        onChange={e=>setPredatorPicks(s=>({...s, discipline:e.target.value}))}
                      >
                        <option value="">— choose —</option>
                        {allowedDisc.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </Field>
                  ) : null;
                })()}

                {/* Single-choice picks */}
                {currentPred.picks?.flawChoice && (
                  <Field label="Pick a Flaw">
                    <select
                      className={styles.input}
                      value={predatorPicks.flawChoice}
                      onChange={e=>setPredatorPicks(s=>({...s, flawChoice:e.target.value}))}
                    >
                      <option value="">— choose —</option>
                      {currentPred.picks.flawChoice.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </Field>
                )}

                {currentPred.picks?.backgroundChoice && (
                  <Field label="Pick a Background">
                    <select
                      className={styles.input}
                      value={predatorPicks.backgroundChoice}
                      onChange={e=>setPredatorPicks(s=>({...s, backgroundChoice:e.target.value}))}
                    >
                      <option value="">— choose —</option>
                      {currentPred.picks.backgroundChoice.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </Field>
                )}

                {currentPred.picks?.havenFlawChoice && (
                  <Field label="Pick a Haven Flaw">
                    <select
                      className={styles.input}
                      value={predatorPicks.havenFlawChoice}
                      onChange={e=>setPredatorPicks(s=>({...s, havenFlawChoice:e.target.value}))}
                    >
                      <option value="">— choose —</option>
                      {currentPred.picks.havenFlawChoice.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </Field>
                )}
              </div>

              {/* Pools (allocate dots) */}
              {(currentPred.picks?.backgroundPool || currentPred.picks?.flawPool) && (
                <div className={styles.cardIsh} style={{marginTop:12}}>
                  <h4 className={styles.sectionSub}>Allocate Dots</h4>
                  {(currentPred.picks.backgroundPool || []).map((pool, idx) => {
                    const key = `Pool-${idx}-${pool.total}`;
                    const values = predatorPicks.pools?.[key] || {};
                    const remaining = pool.total - Object.values(values).reduce((a,b)=>a+(Number(b)||0),0);
                    return (
                      <div key={key} className={styles.flexRow} style={{alignItems:'center', gap:12, marginBottom:8}}>
                        <span>Backgrounds ({pool.total} total):</span>
                        {pool.options.map(opt => (
                          <label key={opt} className={styles.flexRow} style={{gap:6}}>
                            <span>{opt}</span>
                            <input
                              className={styles.input}
                              type="number"
                              min={0}
                              value={values[opt] ?? 0}
                              onChange={e=>updatePool(key, opt, e.target.value)}
                              style={{width:70}}
                            />
                          </label>
                        ))}
                        <span className={styles.muted}>Remaining: {Math.max(0, remaining)}</span>
                      </div>
                    );
                  })}
                  {(currentPred.picks.flawPool || []).map((pool, idx) => {
                    const key = `FlawPool-${idx}-${pool.total}`;
                    const values = predatorPicks.pools?.[key] || {};
                    const remaining = pool.total - Object.values(values).reduce((a,b)=>a+(Number(b)||0),0);
                    return (
                      <div key={key} className={styles.flexRow} style={{alignItems:'center', gap:12, marginBottom:8}}>
                        <span>Flaws ({pool.total} total):</span>
                        {pool.options.map(opt => (
                          <label key={opt} className={styles.flexRow} style={{gap:6}}>
                            <span>{opt}</span>
                            <input
                              className={styles.input}
                              type="number"
                              min={0}
                              value={values[opt] ?? 0}
                              onChange={e=>updatePool(key, opt, e.target.value)}
                              style={{width:70}}
                            />
                          </label>
                        ))}
                        <span className={styles.muted}>Remaining: {Math.max(0, remaining)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Clan disciplines selection */}
              <h4 className={styles.sectionSub} style={{marginTop:16}}>Clan Discipline Dots</h4>
              <p className={styles.muted}>
                Select <b>two</b> clan Disciplines. Pick which starts at <b>2 dots</b>; the other at <b>1 dot</b>.
              </p>
              <div className={styles.grid3}>
                {(clanDiscs.includes('Choose Any')
                  ? [...new Set(Object.values(CLAN_DISCIPLINES).flat())]
                  : clanDiscs
                ).map(d => {
                  const picked = selectedDiscs.includes(d);
                  return (
                    <div key={d} className={`${styles.cardIsh} ${styles.discCard} ${picked ? styles.picked : ''}`}>
                      <label className={styles.flexRow} style={{justifyContent:'space-between'}}>
                        <span>{d}</span>
                        <input type="checkbox" checked={picked} onChange={()=>toggleDisc(d)} />
                      </label>
                      <div className={styles.favRow}>
                        <label className={styles.flexRow} style={{justifyContent:'space-between', opacity: picked ? 1 : .5}}>
                          <span>Make this the 2-dot Discipline</span>
                          <input
                            type="radio"
                            name="favoredDisc"
                            disabled={!picked}
                            checked={favoredDisc === d}
                            onChange={()=>setFavoredDisc(d)}
                          />
                        </label>
                        <div className={styles.beads}>
                          <span className={`${styles.bead} ${favoredDisc===d ? styles.on : ''}`} />
                          <span className={`${styles.bead} ${picked ? styles.on : ''}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className={styles.muted}>
                Predator selection: {predatorOk ? '✅' : '❌'} &nbsp;&nbsp; Discipline selection: {(selectedDiscs.length===2 && favoredDisc) ? '✅' : '❌'}
              </p>
              <div className={styles.navRow}>
                <button className={styles.ghostBtn} type="button" onClick={()=>setStep(2)}>Back</button>
                <button
                  className={styles.cta}
                  type="button"
                  onClick={()=>setStep(4)}
                  disabled={!predatorOk || !(selectedDiscs.length===2 && favoredDisc)}
                >
                  Next
                </button>
              </div>
            </section>
          )}

          {/* STEP 4: Attributes */}
          {step === 4 && (
            <section>
              <h3 className={styles.sectionTitle}>Attributes</h3>
              <p className={styles.muted}>
                Pattern required: <b>1× at 1</b>, <b>4× at 2</b>, <b>3× at 3</b>, <b>1× at 4</b>.
              </p>

              <QuotaBar
                label="Remaining"
                quotas={{
                  1: Math.max(0, RULES.attributes.pattern[1] - (attrCounts[1]||0)),
                  2: Math.max(0, RULES.attributes.pattern[2] - (attrCounts[2]||0)),
                  3: Math.max(0, RULES.attributes.pattern[3] - (attrCounts[3]||0)),
                  4: Math.max(0, RULES.attributes.pattern[4] - (attrCounts[4]||0)),
                }}
              />

              <div className={styles.attrSkillGrid}>
                {Object.entries(ATTRS).map(([group, list]) => (
                  <div key={group} className={`${styles.cardIsh} ${styles.bleedSoft}`}>
                    <h4>{group}</h4>
                    {list.map(a => {
                      const plusDisabled = !canIncAttr(a);
                      const minusDisabled = !canDecAttr(a);
                      return (
                        <div key={a} className={styles.flexRow}>
                          <span style={{minWidth:140}}>{a}</span>
                          <div className={styles.dotControls}>
                            <button
                              type="button"
                              className={`${styles.ghostBtn} ${minusDisabled ? styles.disabled : ''}`}
                              disabled={minusDisabled}
                              onClick={()=>incAttr(a,-1)}
                            >−</button>
                            <div className={`${styles.dotbox} ${styles.vitae}`}>{attrDots[a]}</div>
                            <button
                              type="button"
                              className={`${styles.ghostBtn} ${plusDisabled ? styles.disabled : ''}`}
                              disabled={plusDisabled}
                              onClick={()=>incAttr(a,1)}
                            >+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <p className={styles.muted}>Validation: {attrOk ? '✅' : '❌'}</p>
              <div className={styles.navRow}>
                <button className={styles.ghostBtn} type="button" onClick={()=>setStep(3)}>Back</button>
                <button className={styles.cta} type="button" onClick={()=>setStep(5)} disabled={!attrOk}>Next</button>
              </div>
            </section>
          )}

          {/* STEP 5: Skills */}
          {step === 5 && (
            <section>
              <h3 className={styles.sectionTitle}>Skills</h3>
              <p className={styles.muted}>Choose a distribution package, then allocate dots. Controls lock as each tier fills.</p>

              <div className={styles.grid3}>
                <Field label="Distribution">
                  <select
                    className={styles.input}
                    value={skillPackage}
                    onChange={e=>setSkillPackage(e.target.value)}
                  >
                    {Object.keys(RULES.skillPackages).map(k => <option key={k}>{k}</option>)}
                  </select>
                </Field>

                <div className={`${styles.cardIsh} ${styles.pkgCard}`}>
                  <small className={styles.muted}>
                    {Object.entries(RULES.skillPackages[skillPackage])
                      .filter(([k])=>k!=='max')
                      .sort((a,b)=>Number(b[0])-Number(a[0]))
                      .map(([dots, n]) => `${n}× at ${dots}`).join(' • ')} (max {RULES.skillPackages[skillPackage].max})
                  </small>
                </div>

                <QuotaBar
                  label="Remaining Dots"
                  quotas={remainingSkillSlots}
                />
              </div>

              <div className={styles.attrSkillGrid}>
                {Object.entries(SKILLS).map(([group, list]) => (
                  <div key={group} className={`${styles.cardIsh} ${styles.bleedSoft}`}>
                    <h4>{group}</h4>
                    {list.map(s => {
                      const plusDisabled = !canIncSkill(s);
                      const minusDisabled = !canDecSkill(s);
                      return (
                        <div key={s} className={styles.flexRow}>
                          <span style={{minWidth:160}}>{s}</span>
                          <div className={styles.dotControls}>
                            <button
                              type="button"
                              className={`${styles.ghostBtn} ${minusDisabled?styles.disabled:''}`}
                              disabled={minusDisabled}
                              onClick={()=>incSkill(s,-1)}
                            >−</button>
                            <div className={`${styles.dotbox} ${styles.vitae}`}>{skillDots[s]}</div>
                            <button
                              type="button"
                              className={`${styles.ghostBtn} ${plusDisabled?styles.disabled:''}`}
                              disabled={plusDisabled}
                              onClick={()=>incSkill(s,1)}
                            >+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <h4 className={styles.sectionSub}>Specialties</h4>
              <SpecialtiesBlock
                skillDots={skillDots}
                specialties={specialties}
                setSpecialties={setSpecialties}
              />

              <p className={styles.muted}>Validation: {skillOk ? '✅' : '❌'}</p>
              <div className={styles.navRow}>
                <button className={styles.ghostBtn} type="button" onClick={()=>setStep(4)}>Back</button>
                <button className={styles.cta} type="button" onClick={()=>setStep(6)} disabled={!skillOk}>Next</button>
              </div>
            </section>
          )}

          {/* STEP 6: Advantages */}
          {step === 6 && (
            <section>
              <h3 className={styles.sectionTitle}>Advantages (Merits & Flaws)</h3>
              <p className={`${styles.muted} ${styles.smallFlavor}`}>Every boon bears a price. Balance the ledger.</p>
              <p className={styles.muted}>Spend up to {RULES.advantages.meritsBudget} Merit dots; take at least {RULES.advantages.minFlaws} Flaw dots.</p>
              <AdvTable label="Merits" rows={merits} setRows={setMerits} cap={RULES.advantages.meritsBudget} />
              <AdvTable label="Flaws" rows={flaws} setRows={setFlaws} />
              <p className={styles.muted}>Validation: {advOk ? '✅' : '❌'}</p>
              <div className={styles.navRow}>
                <button className={styles.ghostBtn} type="button" onClick={()=>setStep(5)}>Back</button>
                <button className={styles.cta} type="button" onClick={()=>setStep(7)}>Next</button>
              </div>
            </section>
          )}

          {/* STEP 7: Morality */}
          {step === 7 && (
            <section>
              <h3 className={styles.sectionTitle}>Morality & Touchstones</h3>
              <p className={`${styles.muted} ${styles.smallFlavor}`}>Remember what keeps the Beast at bay.</p>
              <div className={styles.grid2}>
                <Field label="Chronicle Tenets">
                  <textarea className={styles.input} rows={3} value={tenets} onChange={e=>setTenets(e.target.value)} placeholder="List your chronicle’s tenets…" />
                </Field>
                <Field label="Humanity">
                  <input className={styles.input} type="number" min={1} max={10} value={humanity} onChange={e=>setHumanity(Number(e.target.value)||RULES.humanity)} />
                </Field>
                <Field label="Convictions">
                  {convictions.map((c,i)=>(
                    <div key={i} className={styles.flexRow}>
                      <input className={styles.input} value={c} onChange={e=>setConvictions(p=>p.map((x,idx)=>idx===i?e.target.value:x))} placeholder="e.g., Never harm children" />
                      <button className={styles.ghostBtn} type="button" onClick={()=>setConvictions(p=>p.filter((_,idx)=>idx!==i))}>Remove</button>
                    </div>
                  ))}
                  <button className={styles.ghostBtn} type="button" onClick={()=>setConvictions(p=>[...p,''])}>+ Add Conviction</button>
                </Field>
                <Field label="Touchstones">
                  {touchstones.map((t,i)=>(
                    <div key={i} className={styles.flexRow}>
                      <input className={styles.input} value={t} onChange={e=>setTouchstones(p=>p.map((x,idx)=>idx===i?e.target.value:x))} placeholder="A mortal tied to a conviction" />
                      <button className={styles.ghostBtn} type="button" onClick={()=>setTouchstones(p=>p.filter((_,idx)=>idx!==i))}>Remove</button>
                    </div>
                  ))}
                  <button className={styles.ghostBtn} type="button" onClick={()=>setTouchstones(p=>[...p,''])}>+ Add Touchstone</button>
                </Field>
                <Field label="Blood Potency">
                  <input className={styles.input} type="number" min={0} max={6} value={bloodPotency} onChange={e=>setBloodPotency(Number(e.target.value)||RULES.bloodPotency)} />
                </Field>
              </div>
              <div className={styles.navRow}>
                <button className={styles.ghostBtn} type="button" onClick={()=>setStep(6)}>Back</button>
                <button className={styles.cta} type="button" onClick={()=>setStep(8)}>Next</button>
              </div>
            </section>
          )}

          {/* STEP 8: Review */}
          {step === 8 && (
            <section>
              <h3 className={styles.sectionTitle}>Review & Save</h3>

              {clan && (
                <div className={`${styles.cardIsh} ${styles.reviewCrest}`}>
                  <img src={symlogo(clan)} alt={`${clan} symbol`} />
                  <img src={textlogo(clan)} alt={`${clan} text logo`} />
                </div>
              )}

              <ul className={styles.muted} style={{lineHeight:1.6}}>
                <li><b>Name:</b> {name || '—'} <b>Clan:</b> {clan || '—'}</li>
                <li><b>Concept:</b> {concept || '—'}  <b>Chronicle:</b> {chronicle}</li>
                <li><b>Ambition:</b> {ambition || '—'}  <b>Desire:</b> {desire || '—'}</li>
                <li><b>Sire:</b> {sire || '—'}  <b>Predator:</b> {predatorType}</li>
                <li><b>Disciplines:</b> {Object.entries(derivedDisciplineDots).map(([k,v])=>`${k} ${'•'.repeat(v)}`).join(' , ') || '—'}</li>
                <li><b>Attributes ok:</b> {attrOk ? '✅' : '❌'}  <b>Skills ok:</b> {skillOk ? '✅' : '❌'}</li>
                <li><b>Predator ok:</b> {predatorOk ? '✅' : '❌'}  <b>Merits/Flaws ok:</b> {advOk ? '✅' : '❌'}</li>
              </ul>

              <div className={styles.navRow}>
                <button className={styles.ghostBtn} type="button" onClick={()=>setStep(1)}>Start Over</button>
                <button className={styles.cta} disabled={!canSubmit() || saving} onClick={save}>
                  {saving ? 'Saving…' : 'Save Character'}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Small components ---------- */
function Stepper({ step, setStep, labels }) {
  return (
    <div className={styles.stepper}>
      {labels.map((label, i) => {
        const n = i+1, active = n===step, done = n<step;
        return (
          <button
            key={label}
            type="button"
            className={`${styles.step} ${active?styles.active:''} ${done?styles.done:''}`}
            onClick={()=>setStep(n)}
          >
            <span className={styles.num}>{n}</span> {label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function AdvTable({ label, rows, setRows, cap }) {
  const spent = rows.reduce((a,r)=>a+(Number(r.dots)||0),0);
  return (
    <>
      <h4 className={styles.sectionSub}>{label} {cap!=null && <>(spent: {spent}/{cap})</>}</h4>
      {rows.map((r,i)=>(
        <div key={i} className={styles.flexRow}>
          <input className={styles.input} style={{flex:2}} placeholder={label.slice(0,-1)} value={r.name}
            onChange={e=>setRows(prev=>prev.map((x,idx)=>idx===i?{...x, name:e.target.value}:x))}/>
          <input className={styles.input} type="number" min={0} style={{width:90}} value={r.dots}
            onChange={e=>setRows(prev=>prev.map((x,idx)=>idx===i?{...x, dots:Number(e.target.value)||0}:x))}/>
          <button className={styles.ghostBtn} type="button" onClick={()=>setRows(rows.filter((_,idx)=>idx!==i))}>Remove</button>
        </div>
      ))}
      <button className={styles.ghostBtn} type="button" onClick={()=>setRows([...rows,{name:'',dots:0}])}>+ Add {label.slice(0,-1)}</button>
    </>
  );
}

function SpecialtiesBlock({ skillDots, specialties, setSpecialties }) {
  const autoSkills = ['Academics','Craft','Performance','Science'];
  const autoCount = autoSkills.reduce((n,sk)=> n + ((skillDots[sk]||0) > 0 ? 1 : 0), 0);
  const totalNeeded = autoCount + 1; // +1 extra anywhere
  const tooMany = specialties.filter(Boolean).length > totalNeeded;

  React.useEffect(() => {
    setSpecialties(prev => {
      if (prev.length < totalNeeded) {
        return [...prev, ...Array(totalNeeded - prev.length).fill('')];
      } else if (prev.length > totalNeeded) {
        return prev.slice(0, totalNeeded);
      }
      return prev;
    });
  }, [totalNeeded, setSpecialties]);

  return (
    <>
      <p className={styles.muted}>
        Free specialties: one in each of <b>Academics, Craft, Performance, Science</b> (if you have dots), plus <b>one extra</b> anywhere.
        If Predator type grants a specialty in a Skill with 0 dots, convert it to the first dot instead.
      </p>
      <div className={styles.grid3}>
        {specialties.map((sp,i)=>(
          <Field key={i} label={`Specialty ${i+1}`}>
            <input
              className={styles.input}
              value={sp}
              onChange={e=>setSpecialties(prev=>prev.map((v,idx)=>idx===i?e.target.value:v))}
              placeholder="e.g., Melee: Knives / Persuasion: Bargaining"
            />
          </Field>
        ))}
      </div>
      <small className={styles.muted}>
        Needed: {totalNeeded}. {tooMany ? 'Trim a specialty.' : 'OK'}
      </small>
    </>
  );
}

/* A tiny quota bar used in Attributes & Skills */
function QuotaBar({ label, quotas }) {
  const keys = Object.keys(quotas).sort((a,b)=>Number(a)-Number(b));
  const allZero = keys.every(k => (quotas[k] || 0) === 0);
  return (
    <div className={`${styles.quotaBar} ${styles.cardIsh}`}>
      <div className={styles.quotaHead}>{label}</div>
      <div className={styles.quotaPills}>
        {keys.map(k => (
          <span key={k} className={`${styles.pill} ${quotas[k]===0 ? styles.done : ''}`}>
            {k} <b>× {quotas[k]}</b>
          </span>
        ))}
      </div>
      {allZero && <div className={styles.quotaOk}>All set</div>}
    </div>
  );
}
