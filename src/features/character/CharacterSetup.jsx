import React, { useEffect, useMemo, useState } from 'react';
import api from '../../core/api';
import styles from '../../styles/Sheet.module.css';
import { useNavigate } from 'react-router-dom';
import { PREDATOR_TYPES } from '../../data/predator_types';
import { trackEvent } from '../../utils/analytics';
import ClanPicker from './characterSetupSteps/ClanPicker';
import IdentityStep from './characterSetupSteps/IdentityStep';
import PredatorStep from './characterSetupSteps/PredatorStep';
import AttributesStep from './characterSetupSteps/AttributesStep';
import SkillsStep from './characterSetupSteps/SkillsStep';
import AdvantagesStep from './characterSetupSteps/AdvantagesStep';
import MoralityStep from './characterSetupSteps/MoralityStep';
import ReviewStep from './characterSetupSteps/ReviewStep';

/* ---------- Config ---------- */
// NOTE: These lists are kept for potential future use but are currently unused.
// const CLANS = [
//   'Brujah','Gangrel','Malkavian','Nosferatu','Toreador','Tremere','Ventrue',
//   'Hecata', 'The Ministry',
//   // 'Caitiff','Thin-blood','Banu Haqim','Lasombra'
// ];

// Flavor-only blurbs
// const CLAN_BLURBS = {
//   Brujah: 'Rebels & firebrands who turn conviction into force.',
//   Gangrel: 'Feral survivors close to the Beast and the wild.',
//   Malkavian: 'Cursed seers who glimpse truth Through cracks.',
//   Nosferatu: 'Monstrous spies and info-brokers of the underbelly.',
//   Toreador: 'Aesthetic predators intoxicated by beauty.',
//   Tremere: 'Blood sorcerers obsessed with occult mastery.',
//   Ventrue: 'Aristocrats of the night; command and control.',
//   'Banu Haqim': 'Judges and hunters; blades in the dark.',
//   Hecata: 'Necromantic consortium dealing with Death itself.',
//   Lasombra: 'Shadow aristocrats who bend darkness to will.',
//   'The Ministry': 'Tempters and iconoclasts who break taboos.',
//   Caitiff: 'Clanless strays with no inherited path.',
//   'Thin-blood': 'Faint undead spark; alchemy and ambiguity.'
// };

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
// const CLAN_DISCIPLINES = {
//   Brujah: ['Celerity','Potence','Presence'],
//   Gangrel: ['Animalism','Fortitude','Protean'],
//   Malkavian: ['Auspex','Dominate','Obfuscate'],
//   Nosferatu: ['Animalism','Obfuscate','Potence'],
//   Toreador: ['Auspex','Celerity','Presence'],
//   Tremere: ['Auspex','Blood Sorcery','Dominate'],
//   Ventrue: ['Dominate','Fortitude','Presence'],
//   'Banu Haqim': ['Blood Sorcery','Celerity','Obfuscate'],
//   Hecata: ['Auspex','Fortitude','Oblivion'],
//   Lasombra: ['Dominate','Oblivion','Potence'],
//   'The Ministry': ['Obfuscate','Presence','Protean'],
//   Caitiff: ['Choose Any','Choose Any','Choose Any'],
//   'Thin-blood': ['Thin-blood Alchemy']
// };

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
export default function CharacterSetup({ onDone, forNPC = false  }) {
  const [existing, setExisting] = useState(null);
  const [step, setStep] = useState(1);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const [successOpen, setSuccessOpen] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);


  // Identity + meta
  const [name, setName] = useState('');
  const [concept, setConcept] = useState('');
  const [chronicle, setChronicle] = useState('Athens Through-Time (S1)');
  const [ambition, setAmbition] = useState('');
  const [desire, setDesire] = useState('');

  // Clan
  const [clan, setClan] = useState(null);

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
    if (forNPC) return; // NPCs don't use /characters/me
    api.get('/characters/me').then(r => {
      const char = r.data.character;
      setExisting(char);

      // ✅ If the character exists but the sheet is empty (Admin Wiped it) OR an admin allowed it, automatically open the wizard!
      if (char && char.sheet && char.sheet.allow_reset === true) {
        setIsRebuilding(true);
        if (char.name) setName(char.name);
        if (char.clan) setClan(char.clan);
      } else if (char && (!char.sheet || Object.keys(char.sheet).length === 0)) {
        setIsRebuilding(true);
        if (char.name) setName(char.name);
        if (char.clan) setClan(char.clan);
      }
    }).catch(()=>{});
  }, [forNPC]);


  /* ---------- Derived: Attribute quotas ---------- */
  const attrCounts = useMemo(() => {
    const c = {1:0,2:0,3:0,4:0};
    Object.values(attrDots).forEach(v => { c[v] = (c[v]||0)+1; });
    return c;
  }, [attrDots]);

  /* ---------- Derived: Skill quotas ---------- */
  const skillCounts = useMemo(() => {
    const c = {0:0,1:0,2:0,3:0,4:0,5:0};
    Object.values(skillDots).forEach(v => { c[v] = (c[v]||0)+1; });
    return c;
  }, [skillDots]);

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
    // Use imported PREDATOR_TYPES
    const P = PREDATOR_TYPES[predatorType] || {};
    const restrictMsg = P.restrict ? P.restrict({ clan, bloodPotency }) : null;
    if (restrictMsg) return false;
    if (P.picks?.specialty && !predatorPicks.specialty) return false;
    if (P.picks?.discipline && !predatorPicks.discipline) return false;
    if (P.picks?.flawChoice && !predatorPicks.flawChoice) return false;
    if (P.picks?.backgroundChoice && !predatorPicks.backgroundChoice) return false;
    if (P.picks?.havenFlawChoice && !predatorPicks.havenFlawChoice) return false;
  // pools exact sum (match render indexes exactly)
    const bgPools = P.picks?.backgroundPool || [];
    for (let i = 0; i < bgPools.length; i++) {
      const pool = bgPools[i];
      const key = `Pool-${i}-${pool.total}`;
      const vals = predatorPicks.pools?.[key] || {};
      const sum = Object.values(vals).reduce((a,b)=>a+(Number(b)||0),0);
      if (sum !== pool.total) return false;
    }

    const flawPools = P.picks?.flawPool || [];
    for (let j = 0; j < flawPools.length; j++) {
      const pool = flawPools[j];
      const key = `FlawPool-${j}-${pool.total}`;
      const vals = predatorPicks.pools?.[key] || {};
      const sum = Object.values(vals).reduce((a,b)=>a+(Number(b)||0),0);
      if (sum !== pool.total) return false;
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

  // inside CharacterSetup component
  // --- Predator helpers (parsers + merge) ---
  // "Skill (Specialty)" -> { skill, spec }
  const parsePredatorSpecialty = (s) => {
    const m = String(s || '').match(/^(.+?)\s*\((.+?)\)\s*$/);
    return m ? { skill: m[1].trim(), spec: m[2].trim() } : null;
  };

  // "Haven Flaw: Creepy (••)" -> dots=2, "Retainers +1" -> 1
  const parseDotsFromText = (s, fallback = 1) => {
    if (!s) return fallback;
    const bullets = String(s).match(/•+/);
    if (bullets) return bullets[0].length;
    const n = String(s).match(/([+-]?\d+)/);
    if (n) return Math.abs(parseInt(n[1], 10) || fallback);
    return fallback;
  };

  // Strip "(…)" and "+N" suffixes -> name only
  const stripName = (s) =>
    String(s || '').replace(/\(.*?\)/g, '').replace(/\+\d+.*/g, '').trim();

  // Coalesce advantages by name (sum dots), drop empties
  const coalesceAdv = (list) => {
    const by = {};
    (list || []).forEach((r) => {
      const name = (r?.name || r?.id || '').trim();
      const dots = Number(r?.dots || r?.rating || 0);
      if (!name || dots <= 0) return;
      by[name] = (by[name] || 0) + dots;
    });
    return Object.entries(by).map(([name, dots]) => ({ name, dots }));
  };


  const save = async () => {
    setSaving(true); setErr('');
    try {
    // Start from current selections
    let skillDotsOut = { ...skillDots };
    let discMap = { ...derivedDisciplineDots };
    let extraSpecialties = [];
    let meritsOut = (merits || []).filter(m => (m.name || m.id || '').trim() && Number(m.dots || 0) > 0);
    let flawsOut  = (flaws  || []).filter(f => (f.name || f.id || '').trim() && Number(f.dots  || 0) > 0);

    let humanityOut = humanity;
    let bloodPotencyOut = bloodPotency;

    // Current predator data
    const P = PREDATOR_TYPES[predatorType] || {};

    // 1) Specialty pick: add "Skill: Spec", and if that skill had 0 dots, raise to 1
    if (P.picks?.specialty && predatorPicks.specialty) {
      const parsed = parsePredatorSpecialty(predatorPicks.specialty);
      if (parsed) {
        if ((skillDotsOut[parsed.skill] || 0) === 0) {
          skillDotsOut = { ...skillDotsOut, [parsed.skill]: 1 };
        }
        extraSpecialties.push(`${parsed.skill}: ${parsed.spec}`);
      } else {
        // fallback: if user changed text shape, keep as-is
        extraSpecialties.push(predatorPicks.specialty);
      }
    }

    // 2) Discipline pick: +1 dot in chosen discipline
    if (P.picks?.discipline && predatorPicks.discipline) {
      const k = predatorPicks.discipline;
      discMap[k] = (discMap[k] || 0) + 1;
    }

    // 3) Single choices from Predator
    if (P.picks?.backgroundChoice && predatorPicks.backgroundChoice) {
      const nm = stripName(predatorPicks.backgroundChoice);
      const dots = parseDotsFromText(predatorPicks.backgroundChoice, 1);
      meritsOut.push({ name: nm, dots });
    }

    if (P.picks?.havenFlawChoice && predatorPicks.havenFlawChoice) {
      const nm = stripName(predatorPicks.havenFlawChoice);
      const dots = parseDotsFromText(predatorPicks.havenFlawChoice, 1);
      flawsOut.push({ name: nm, dots });
    }

    if (P.picks?.flawChoice && predatorPicks.flawChoice) {
      const nm = stripName(predatorPicks.flawChoice);
      const dots = parseDotsFromText(predatorPicks.flawChoice, 1);
      flawsOut.push({ name: nm, dots });
    }

    // 4) Pools: backgroundPool & flawPool
    (P.picks?.backgroundPool || []).forEach((pool, i) => {
      const key = `Pool-${i}-${pool.total}`;
      const vals = predatorPicks.pools?.[key] || {};
      Object.entries(vals).forEach(([nm, v]) => {
        const dots = Number(v) || 0;
        if (dots > 0) meritsOut.push({ name: nm, dots });
      });
    });

    (P.picks?.flawPool || []).forEach((pool, i) => {
      const key = `FlawPool-${i}-${pool.total}`;
      const vals = predatorPicks.pools?.[key] || {};
      Object.entries(vals).forEach(([nm, v]) => {
        const dots = Number(v) || 0;
        if (dots > 0) flawsOut.push({ name: nm, dots });
      });
    });

    // 5) Static effects from Predator
    if (P.effects?.merits)        meritsOut.push(...P.effects.merits);
    if (P.effects?.backgrounds)   meritsOut.push(...P.effects.backgrounds);
    if (P.effects?.flaws)         flawsOut.push(...P.effects.flaws);
    if (P.effects?.feedingFlaws)  flawsOut.push(...P.effects.feedingFlaws);

    if (typeof P.effects?.humanity === 'number') {
      humanityOut = Math.max(1, Math.min(10, humanityOut + P.effects.humanity));
    }
    if (typeof P.effects?.bloodPotency === 'number') {
      bloodPotencyOut = Math.max(0, Math.min(10, (bloodPotencyOut || 0) + P.effects.bloodPotency));
    }

    // 6) Coalesce duplicate advantages by name (sum dots)
    meritsOut = coalesceAdv(meritsOut);
    flawsOut  = coalesceAdv(flawsOut);

    // 7) Final payload (include predator freebies)
    const payload = {
      name, concept, chronicle, ambition, desire,
      clan, sire, predatorType,
      attributes: attrDots,
      skills: skillDotsOut,
      specialties: [...(specialties || []).filter(Boolean), ...extraSpecialties],
      disciplines: discMap,
      advantages: { merits: meritsOut, flaws: flawsOut },
      morality: {
        tenets,
        convictions: (convictions || []).filter(Boolean),
        touchstones: (touchstones || []).filter(Boolean),
        humanity: humanityOut
      },
      bloodPotency: bloodPotencyOut
    };

      const url = forNPC ? '/admin/npcs' : (isRebuilding ? '/characters/rebuild' : '/characters');
      const { data } = await api.post(url, { name, clan, sheet: payload });

      // Store the created character data if returned by API
      // This ensures we have the server-generated ID and any other fields
      const createdCharacter = data?.character || data?.npc;

      if (!forNPC && !isRebuilding) {
        trackEvent('create_character', { clan });
      }

      // optional callback - pass the created character if available
      if (onDone) {
        onDone(createdCharacter);
      }

      // ✅ show success modal instead of navigating immediately
      setSuccessOpen(true);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to save character');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Render ---------- */

  if (existing && !isRebuilding) {
    return (
      <div className={styles.sheetCard}>
        <h3 className={styles.cardTitle}>Your Character</h3>
        <p>Character: <b>{existing.name}</b> ({existing.clan})</p>
        <p className={styles.muted} style={{marginTop: '10px'}}>
           You have already created a character.
        </p>
      </div>
    );
  }

  const tint = clan ? CLAN_COLORS[clan][0] : '#8a0f1a';
  // Use imported PREDATOR_TYPES

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
            <ClanPicker
              clan={clan}
              setClan={setClan}
              setStep={setStep}
            />
          )}

          {/* STEP 2: Identity */}
          {step === 2 && (
            <IdentityStep
              name={name}
              setName={setName}
              concept={concept}
              setConcept={setConcept}
              chronicle={chronicle}
              setChronicle={setChronicle}
              ambition={ambition}
              setAmbition={setAmbition}
              desire={desire}
              setDesire={setDesire}
              sire={sire}
              setSire={setSire}
              step={step}
              setStep={setStep}
            />
          )}

          {/* STEP 3: Predator & Disciplines */}
          {step === 3 && (
            <PredatorStep
              predatorType={predatorType}
              setPredatorType={setPredatorType}
              predatorPicks={predatorPicks}
              setPredatorPicks={setPredatorPicks}
              clan={clan}
              bloodPotency={bloodPotency}
              selectedDiscs={selectedDiscs}
              setSelectedDiscs={setSelectedDiscs}
              favoredDisc={favoredDisc}
              setFavoredDisc={setFavoredDisc}
              setStep={setStep}
            />
          )}

          {/* STEP 4: Attributes */}
          {step === 4 && (
            <AttributesStep
              attrDots={attrDots}
              setAttrDots={setAttrDots}
              step={step}
              setStep={setStep}
            />
          )}

          {/* STEP 5: Skills */}
          {step === 5 && (
            <SkillsStep
              skillDots={skillDots}
              setSkillDots={setSkillDots}
              skillPackage={skillPackage}
              setSkillPackage={setSkillPackage}
              specialties={specialties}
              setSpecialties={setSpecialties}
              step={step}
              setStep={setStep}
            />
          )}

          {/* STEP 6: Advantages */}
          {step === 6 && (
            <AdvantagesStep
              merits={merits}
              setMerits={setMerits}
              flaws={flaws}
              setFlaws={setFlaws}
              clan={clan}
              meritBudget={RULES.advantages.meritsBudget}
              step={step}
              setStep={setStep}
            />
          )}

          {/* STEP 7: Morality */}
          {step === 7 && (
            <MoralityStep
              tenets={tenets}
              setTenets={setTenets}
              humanity={humanity}
              setHumanity={setHumanity}
              convictions={convictions}
              setConvictions={setConvictions}
              touchstones={touchstones}
              setTouchstones={setTouchstones}
              bloodPotency={bloodPotency}
              setBloodPotency={setBloodPotency}
              step={step}
              setStep={setStep}
            />
          )}

          {/* STEP 8: Review */}
          {step === 8 && (
            <ReviewStep
              name={name}
              clan={clan}
              concept={concept}
              chronicle={chronicle}
              ambition={ambition}
              desire={desire}
              sire={sire}
              predatorType={predatorType}
              attrDots={attrDots}
              derivedDisciplineDots={derivedDisciplineDots}
              skillDots={skillDots}
              specialties={specialties}
              merits={merits}
              flaws={flaws}
              tenets={tenets}
              convictions={convictions}
              touchstones={touchstones}
              humanity={humanity}
              bloodPotency={bloodPotency}
              attrOk={attrOk}
              skillOk={skillOk}
              predatorOk={predatorOk}
              advOk={advOk}
              canSubmit={canSubmit}
              saving={saving}
              step={step}
              setStep={setStep}
              onSave={save}
              successOpen={successOpen}
              setSuccessOpen={setSuccessOpen}
            />
          )}
        </div>
      </div>
      {successOpen && (
      <div
        className={styles.modalBackdrop}
        role="dialog"
        aria-modal="true"
        aria-labelledby="createSuccessTitle"
        onClick={(e) => {
          // allow clicking the dim backdrop to close
          if (e.target === e.currentTarget) setSuccessOpen(false);
        }}
      >
        <div className={styles.modalCard}>
          <h3 id="createSuccessTitle" className={styles.modalTitle}>
            Character created successfully
          </h3>
          <p className={styles.modalBody}>
            Now see your character, select Discipline powers, and spend your first XP.
          </p>
          <div className={styles.modalActions}>
            <button
              className={styles.cta}
              onClick={() => navigate('/character', { replace: true })}
              autoFocus
            >
              Go to Character
            </button>
            <button
              className={styles.ghostBtn}
              onClick={() => navigate('/', { replace: true })}
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
      )}
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

// AdvTable component is currently unused but kept for potential future use
/* eslint-disable no-unused-vars */
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