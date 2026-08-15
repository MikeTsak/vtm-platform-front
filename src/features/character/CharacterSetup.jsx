import React, { useEffect, useMemo, useState } from 'react';
import api from '../../core/api';
import styles from '../../styles/CharacterSetup.module.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { PREDATOR_TYPES } from '../../data/predator_types';
import { trackEvent } from '../../utils/analytics';
import { clanTint } from '../../data/clans';
import { Stepper, Icon } from './characterSetupSteps/StepHelpers';
import CharacterPreview from './CharacterPreview';
import ClanPicker from './characterSetupSteps/ClanPicker';
import IdentityStep from './characterSetupSteps/IdentityStep';
import PredatorStep from './characterSetupSteps/PredatorStep';
import DisciplinesStep from './characterSetupSteps/DisciplinesStep';
import AttributesStep from './characterSetupSteps/AttributesStep';
import SkillsStep from './characterSetupSteps/SkillsStep';
import AdvantagesStep from './characterSetupSteps/AdvantagesStep';
import MoralityStep from './characterSetupSteps/MoralityStep';
import ReviewStep from './characterSetupSteps/ReviewStep';

/* ---------- Config ---------- */
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

/* ---------- Draft autosave (localStorage) ---------- */
// Only used for the real player-facing wizard, never for admin NPC creation.
const DRAFT_KEY = 'vtm_character_draft_v1';

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveDraft(data) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch { /* quota/storage disabled — non-fatal */ }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* non-fatal */ }
}

/* ---------- Component ---------- */
export default function CharacterSetup({ onDone, forNPC = false  }) {
  const draft = useMemo(() => (forNPC ? null : loadDraft()), [forNPC]);
  const [showDraftBanner, setShowDraftBanner] = useState(!!(draft && (draft.name || draft.clan)));

  const [existing, setExisting] = useState(null);
  const [step, setStep] = useState(draft?.step ?? 1);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isTesting = new URLSearchParams(location.search).get('test') === '1';
  const [successOpen, setSuccessOpen] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);


  // Identity + meta
  const [name, setName] = useState(draft?.name ?? '');
  const [concept, setConcept] = useState(draft?.concept ?? '');
  const [chronicle, setChronicle] = useState(draft?.chronicle ?? 'Athens Through-Time (S2)');
  const [ambition, setAmbition] = useState(draft?.ambition ?? '');
  const [desire, setDesire] = useState(draft?.desire ?? '');

  // Clan
  const [clan, setClan] = useState(draft?.clan ?? null);

  // Sire & Predator
  const [sire, setSire] = useState(draft?.sire ?? '');
  const [predatorType, setPredatorType] = useState(draft?.predatorType ?? 'Alleycat');
  const [predatorPicks, setPredatorPicks] = useState(draft?.predatorPicks ?? {
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
  const [attrDots, setAttrDots] = useState(draft?.attrDots ?? baseAttrs);

  // Skills
  const baseSkills = useMemo(() => {
    const o = {}; flat(SKILLS).forEach(s => o[s]=0); return o;
  }, []);
  const [skillDots, setSkillDots] = useState(draft?.skillDots ?? baseSkills);
  const [skillPackage, setSkillPackage] = useState(draft?.skillPackage ?? 'Balanced');
  const [specialties, setSpecialties] = useState(draft?.specialties ?? ['']);

  // Disciplines selection (2 picks, one favored at 2)
  const [selectedDiscs, setSelectedDiscs] = useState(draft?.selectedDiscs ?? []);
  const [favoredDisc, setFavoredDisc] = useState(draft?.favoredDisc ?? null);
  // { [disciplineName]: [{ level, id, name }] } — same shape CharacterView.jsx
  // reads as sheet.disciplinePowers, so powers picked here already show as
  // known once the character exists.
  const [disciplinePowerPicks, setDisciplinePowerPicks] = useState(draft?.disciplinePowerPicks ?? {});
  const derivedDisciplineDots = useMemo(() => {
    const map = {};
    selectedDiscs.forEach(d => { map[d] = (favoredDisc === d ? 2 : 1); });
    return map;
  }, [selectedDiscs, favoredDisc]);

  // Advantages
  const [merits, setMerits] = useState(draft?.merits ?? [{ name:'', dots:0 }]);
  const [flaws, setFlaws] = useState(draft?.flaws ?? [{ name:'', dots:0 }]);

  // Morality
  const [tenets, setTenets] = useState(draft?.tenets ?? '');
  const [convictions, setConvictions] = useState(draft?.convictions ?? ['']);
  const [touchstones, setTouchstones] = useState(draft?.touchstones ?? ['']);
  const [humanity, setHumanity] = useState(draft?.humanity ?? RULES.humanity);
  const [bloodPotency, setBloodPotency] = useState(draft?.bloodPotency ?? RULES.bloodPotency);

  // Autosave every change (player-facing wizard only)
  useEffect(() => {
    if (forNPC) return;
    saveDraft({
      step, name, concept, chronicle, ambition, desire, clan, sire,
      predatorType, predatorPicks, attrDots, skillDots, skillPackage, specialties,
      selectedDiscs, favoredDisc, disciplinePowerPicks, merits, flaws, tenets, convictions, touchstones,
      humanity, bloodPotency,
    });
  }, [
    forNPC, step, name, concept, chronicle, ambition, desire, clan, sire,
    predatorType, predatorPicks, attrDots, skillDots, skillPackage, specialties,
    selectedDiscs, favoredDisc, disciplinePowerPicks, merits, flaws, tenets, convictions, touchstones,
    humanity, bloodPotency,
  ]);

  const discardDraft = () => {
    clearDraft();
    window.location.reload();
  };

  useEffect(() => {
    if (forNPC) return; // NPCs don't use /characters/me
    api.get('/characters/me').then(r => {
      const char = r.data.character;
      setExisting(char);

      // If the character exists but the sheet is empty (Admin Wiped it) OR an admin allowed it, automatically open the wizard!
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
      disciplinePowers: disciplinePowerPicks,
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

      if (!forNPC) clearDraft();

      // show success modal instead of navigating immediately
      setSuccessOpen(true);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to save character');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Render ---------- */

  if (existing && !isRebuilding && !isTesting) {
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

  const tint = clanTint(clan);
  // Use imported PREDATOR_TYPES

  const checklist = [
    { step: 1, label: 'Clan', done: !!clan },
    { step: 2, label: 'Concept', done: name.trim().length > 0 },
    { step: 3, label: 'Predator', done: predatorOk },
    { step: 4, label: 'Disciplines', done: discOk },
    { step: 5, label: 'Attributes', done: attrOk },
    { step: 6, label: 'Skills', done: skillOk },
    { step: 7, label: 'Merits & Flaws', done: advOk },
    { step: 8, label: 'Morality', done: convictions.some(Boolean) && touchstones.some(Boolean) },
  ];

  return (
    <div className={styles.sheetRoot}>
      <div className={styles.sheetPage} data-clan={clan || '—'}>
        <div className={styles.vignette} aria-hidden="true" />
        <div className={styles.skyline} style={{'--tint': tint}} aria-hidden="true" />
        <div className={styles.wizardGrid}>
        <div className={`${styles.sheetCard} ${styles.sheetWide} ${styles.bleedEdge}`}>
          <h2 className={styles.cardTitle}>Create Your Character</h2>
          {showDraftBanner && (
            <div className={styles.stepHeader} style={{ background: 'var(--glass-inset)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
              <span className={styles.muted}>
                <Icon name="restore" style={{ marginRight: 6 }} />
                Resuming your draft from earlier — nothing's been created yet.
              </span>
              <div className={styles.stepHeaderActions}>
                <button type="button" className={styles.ghostBtn} onClick={()=>setShowDraftBanner(false)}>Keep it</button>
                <button type="button" className={styles.ghostBtn} onClick={discardDraft}>Discard &amp; start over</button>
              </div>
            </div>
          )}
          {err && <div className={styles.alert}><span className={styles.alertDot} />{err}</div>}

          <Stepper
            step={step}
            setStep={setStep}
            steps={[
              { label: 'Clan', icon: 'account_tree' },
              { label: 'Concept', icon: 'badge' },
              { label: 'Predator', icon: 'visibility' },
              { label: 'Disciplines', icon: 'auto_awesome' },
              { label: 'Attributes', icon: 'bar_chart' },
              { label: 'Skills', icon: 'school' },
              { label: 'Merits & Flaws', icon: 'balance' },
              { label: 'Morality', icon: 'favorite' },
              { label: 'Review', icon: 'fact_check' },
            ]}
          />

          {/* STEP 1: Clan Picker */}
          {step === 1 && (
            <ClanPicker
              clan={clan}
              setClan={setClan}
              setStep={setStep}
            />
          )}

          {/* STEP 2: Concept / Identity */}
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

          {/* STEP 3: Predator Type */}
          {step === 3 && (
            <PredatorStep
              predatorType={predatorType}
              setPredatorType={setPredatorType}
              predatorPicks={predatorPicks}
              setPredatorPicks={setPredatorPicks}
              clan={clan}
              bloodPotency={bloodPotency}
              setStep={setStep}
            />
          )}

          {/* STEP 4: Disciplines */}
          {step === 4 && (
            <DisciplinesStep
              clan={clan}
              selectedDiscs={selectedDiscs}
              setSelectedDiscs={setSelectedDiscs}
              favoredDisc={favoredDisc}
              setFavoredDisc={setFavoredDisc}
              disciplinePowerPicks={disciplinePowerPicks}
              setDisciplinePowerPicks={setDisciplinePowerPicks}
              setStep={setStep}
            />
          )}

          {/* STEP 5: Attributes */}
          {step === 5 && (
            <AttributesStep
              attrDots={attrDots}
              setAttrDots={setAttrDots}
              step={step}
              setStep={setStep}
            />
          )}

          {/* STEP 6: Skills */}
          {step === 6 && (
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

          {/* STEP 7: Merits & Flaws */}
          {step === 7 && (
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

          {/* STEP 8: Touchstones & Morality */}
          {step === 8 && (
            <MoralityStep
              tenets={tenets}
              setTenets={setTenets}
              humanity={humanity}
              predatorType={predatorType}
              convictions={convictions}
              setConvictions={setConvictions}
              touchstones={touchstones}
              setTouchstones={setTouchstones}
              bloodPotency={bloodPotency}
              step={step}
              setStep={setStep}
            />
          )}

          {/* STEP 9: Review */}
          {step === 9 && (
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
              disciplinePowerPicks={disciplinePowerPicks}
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
            />
          )}
        </div>

        <CharacterPreview
          clan={clan}
          name={name}
          concept={concept}
          predatorType={predatorType}
          selectedDiscs={selectedDiscs}
          favoredDisc={favoredDisc}
          humanity={Math.max(1, Math.min(10, humanity + (typeof PREDATOR_TYPES[predatorType]?.effects?.humanity === 'number' ? PREDATOR_TYPES[predatorType].effects.humanity : 0)))}
          bloodPotency={bloodPotency}
          health={(attrDots.Stamina || 1) + 3}
          willpower={(attrDots.Composure || 1) + (attrDots.Resolve || 1)}
          meritsCount={merits.filter(m => (m.name||'').trim() && Number(m.dots||0) > 0).length}
          flawsCount={flaws.filter(f => (f.name||'').trim() && Number(f.dots||0) > 0).length}
          checklist={checklist}
          step={step}
          setStep={setStep}
        />
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
          {merits.some(m => m.name === 'Retainers') && (
            <p className={styles.modalBody} style={{ marginTop: -8 }}>
              You took the <b>Retainers</b> merit — build their full sheet on the Retainers page whenever you're ready.
            </p>
          )}
          <div className={styles.modalActions}>
            <button
              className={styles.cta}
              onClick={() => navigate('/character', { replace: true })}
              autoFocus
            >
              Go to Character
            </button>
            {merits.some(m => m.name === 'Retainers') && (
              <button
                className={styles.ghostBtn}
                onClick={() => navigate('/retainers', { replace: true })}
              >
                Set Up My Retainer
              </button>
            )}
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