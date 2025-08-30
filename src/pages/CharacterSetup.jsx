import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import '../styles/Sheet.css';

/* ---------- Config ---------- */
const CLANS = [
  'Brujah','Gangrel','Malkavian','Nosferatu','Toreador','Tremere','Ventrue',
  'Banu Haqim','Hecata','Lasombra','The Ministry','Caitiff','Thin-blood'
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

// Attributes / Skills / Predator Types
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
const PREDATOR_TYPES = [
  'Alleycat','Sandman','Siren','Osiris','Farmer','Bagger','Scene Queen','Consensualist','Extortionist','Blood Leech',
];

// V5-ish rules applied as requested
const RULES = {
  attributes: {
    min: 1, max: 4,
    pattern: { 1:1, 2:4, 3:3, 4:1 }
  },
  skillPackages: {
    'Jack of All Trades': { '3':1, '2':8, '1':10, max:4 },
    'Balanced':           { '3':3, '2':5, '1':7,  max:4 },
    'Specialist':         { '4':1, '3':3, '2':3, '1':3, max:4 },
  },
  disciplines: { twoPick: true },
  advantages: { meritsBudget: 7, minFlaws: 2 },
  humanity: 7, bloodPotency: 1
};

/* ---------- Utils ---------- */
const flat = (obj) => Object.values(obj).flat();
const countValues = (arrOrObj) => {
  const counts = {};
  Object.values(arrOrObj).forEach(v => { counts[v] = (counts[v]||0)+1; });
  return counts;
};

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
  const [predatorType, setPredatorType] = useState(PREDATOR_TYPES[0]);

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

  // Disciplines
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
    // don’t allow increasing to a tier that is already full
    if ((attrCounts[next] || 0) >= (req[next] || 0)) return false;
    return true;
  };
  const canDecAttr = (k) => {
    const v = attrDots[k] ?? RULES.attributes.min;
    if (v <= RULES.attributes.min) return false;
    const req = RULES.attributes.pattern;
    // don’t allow decreasing a tier below its required minimum
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
    return out; // { '1': n, '2': n, '3': n, '4': n }
  }, [skillReq, skillCounts]);

  const canIncSkill = (k) => {
    const v = skillDots[k] || 0;
    const next = v + 1;
    if (next > (skillReq.max || 5)) return false;
    // next dot must be part of the package quota and still available
    if (!(String(next) in skillReq)) return false;
    if ((skillCounts[next] || 0) >= (skillReq[String(next)] || 0)) return false;
    return true;
  };
  const canDecSkill = (k) => {
    const v = skillDots[k] || 0;
    return v > 0; // allow reallocation freely down to 0
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
    // exact match to selected package
    const req = RULES.skillPackages[skillPackage];
    const dotKeys = Object.keys(req).filter(k => k !== 'max');
    const exact = dotKeys.every(dot => (skillCounts[Number(dot)] || 0) === req[dot]);
    // and nothing over max
    const maxOk = Object.values(skillDots).every(v => v <= req.max);
    return exact && maxOk;
  }, [skillCounts, skillDots, skillPackage]);

  const discOk = useMemo(
    () => selectedDiscs.length === 2 && favoredDisc && selectedDiscs.includes(favoredDisc),
    [selectedDiscs, favoredDisc]
  );

  const meritsSpent = merits.reduce((a,m)=>a+(Number(m.dots)||0),0);
  const flawsTaken = flaws.reduce((a,f)=>a+(Number(f.dots)||0),0);
  const advOk = meritsSpent <= RULES.advantages.meritsBudget && flawsTaken >= RULES.advantages.minFlaws;

  const canSubmit = () =>
    name.trim().length && clan &&
    attrOk && skillOk && discOk &&
    advOk && humanity >= 1 && humanity <= 10;

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const payload = {
        name, concept, chronicle, ambition, desire,
        clan, sire, predatorType,
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
      <div className="sheet-card">
        <h3 className="card-title">Your Character</h3>
        <p>Character: <b>{existing.name}</b> ({existing.clan})</p>
      </div>
    );
  }

  const tint = clan ? CLAN_COLORS[clan][0] : '#8a0f1a';

  return (
    <div className="sheet-page" data-clan={clan || '—'}>
      <div className="vignette" aria-hidden="true" />
      <div className="skyline" style={{'--tint': tint}} aria-hidden="true" />
      <div className="sheet-card sheet-wide bleed-edge">
        <h2 className="card-title">Create Your Character</h2>
        {err && <div className="alert"><span className="alert-dot" />{err}</div>}

        <Stepper step={step} setStep={setStep} labels={['Clan','Identity','Predator & Disciplines','Attributes','Skills','Advantages','Morality','Review']} />

        {/* STEP 1: Clan Picker */}
        {step === 1 && (
          <section>
            <h3 className="section-title">Choose Your Clan</h3>
            <p className="muted small-flavor">Blood remembers. Choose the lineage that will shape your curse.</p>
            <div className="clan-grid">
              {CLANS.map(c => {
                const active = clan === c;
                return (
                  <button
                    key={c}
                    type="button"
                    className={`clan-card ${active ? 'active' : ''}`}
                    style={{ background: `linear-gradient(180deg, ${CLAN_COLORS[c][0]}, ${CLAN_COLORS[c][1]})` }}
                    onClick={()=>setClan(c)}
                    title={CLAN_BLURBS[c]}
                  >
                    <div className="clan-logo-wrap">
                      <img src={symlogo(c)} alt={`${c} symbol`} className="clan-logo" />
                    </div>
                    <div className="clan-meta">
                      <div className="clan-name">{c}</div>
                      <div className="clan-blurb">{CLAN_BLURBS[c]}</div>
                      <div className="clan-discs">{(CLAN_DISCIPLINES[c]||[]).join(' • ')}</div>

                      {active && (
                        <div className="clan-text-logo">
                          <img src={textlogo(c)} alt={`${c} text logo`} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="nav-row">
              <span />
              <button className="cta" type="button" disabled={!clan} onClick={()=>setStep(2)}>Next</button>
            </div>
          </section>
        )}

        {/* STEP 2: Identity */}
        {step === 2 && (
          <section>
            <h3 className="section-title">Identity</h3>
            <p className="muted small-flavor">A mask for the living, a name for the dead. Etch who you were—and what you seek.</p>
            <div className="grid-2">
              <Field label="Name">
                <input className="input" value={name} onChange={e=>setName(e.target.value)}
                  placeholder="e.g., Telemachos Daskalakis" required />
              </Field>
              <Field label="Chronicle">
                <input className="input" value={chronicle} onChange={e=>setChronicle(e.target.value)}
                  placeholder="Erebus Eternal — Athens Court" />
              </Field>
              <Field label="Concept">
                <input className="input" value={concept} onChange={e=>setConcept(e.target.value)}
                  placeholder="Haunted Prince • Fixer • Street Artist • Dragonborn whisperer…" />
              </Field>
              <Field label="Ambition (long-term)">
                <input className="input" value={ambition} onChange={e=>setAmbition(e.target.value)}
                  placeholder="Rule a district, master Oblivion, redeem a name…" />
              </Field>
              <Field label="Desire (short-term)">
                <input className="input" value={desire} onChange={e=>setDesire(e.target.value)}
                  placeholder="Tonight’s hunger: a relic, a secret, a rival’s ruin…" />
              </Field>
              <Field label="Sire (the Story theller will tell you)">
                <input className="input" value={sire} onChange={e=>setSire(e.target.value)} placeholder="Leave blank for now" />
              </Field>
            </div>
            <div className="nav-row">
              <button className="ghost-btn" type="button" onClick={()=>setStep(1)}>Back</button>
              <button className="cta" type="button" onClick={()=>setStep(3)}>Next</button>
            </div>
          </section>
        )}

        {/* STEP 3: Predator & Disciplines */}
        {step === 3 && (
          <section>
            <h3 className="section-title">Predator & Disciplines</h3>
            <p className="muted small-flavor">How you hunt, how you thrive. Choose your habits; choose your gifts.</p>
            <div className="grid-2">
              <Field label="Predator Type">
                <select className="input" value={predatorType} onChange={e=>setPredatorType(e.target.value)}>
                  {PREDATOR_TYPES.map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Clan Disciplines">
                <div className="muted">{(clanDiscs||[]).join(' • ')}</div>
              </Field>
            </div>

            <p className="muted" style={{marginTop:8}}>
              Select <b>two</b> of your clan Disciplines. Choose which one starts at <b>2 dots</b>; the other will start at <b>1 dot</b>.
            </p>

            <div className="grid-3">
              {(clanDiscs.includes('Choose Any')
                ? [...new Set(Object.values(CLAN_DISCIPLINES).flat())]
                : clanDiscs
              ).map(d => {
                const picked = selectedDiscs.includes(d);
                return (
                  <div key={d} className={`card-ish disc-card ${picked ? 'picked' : ''}`}>
                    <label className="flex-row" style={{justifyContent:'space-between'}}>
                      <span>{d}</span>
                      <input type="checkbox" checked={picked} onChange={()=>toggleDisc(d)} />
                    </label>
                    <div className="fav-row">
                      <label className="flex-row" style={{justifyContent:'space-between', opacity: picked ? 1 : .5}}>
                        <span>Make this the 2-dot Discipline</span>
                        <input
                          type="radio"
                          name="favoredDisc"
                          disabled={!picked}
                          checked={favoredDisc === d}
                          onChange={()=>setFavoredDisc(d)}
                        />
                      </label>
                      <div className="beads">
                        <span className={`bead ${favoredDisc===d ? 'on' : ''}`} />
                        <span className={`bead ${picked ? 'on' : ''}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="muted">Selection: {selectedDiscs.join(' & ') || '—'} {discOk ? '✅' : '❌'}</p>
            <div className="nav-row">
              <button className="ghost-btn" type="button" onClick={()=>setStep(2)}>Back</button>
              <button className="cta" type="button" onClick={()=>setStep(4)} disabled={!discOk}>Next</button>
            </div>
          </section>
        )}

        {/* STEP 4: Attributes */}
        {step === 4 && (
          <section>
            <h3 className="section-title">Attributes</h3>
            <p className="muted">
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

            <div className="attr-skill-grid">
              {Object.entries(ATTRS).map(([group, list]) => (
                <div key={group} className="card-ish bleed-soft">
                  <h4>{group}</h4>
                  {list.map(a => {
                    const plusDisabled = !canIncAttr(a);
                    const minusDisabled = !canDecAttr(a);
                    return (
                      <div key={a} className="flex-row">
                        <span style={{minWidth:140}}>{a}</span>
                        <div className="dot-controls">
                          <button
                            type="button"
                            className={`ghost-btn ${minusDisabled?'disabled':''}`}
                            disabled={minusDisabled}
                            onClick={()=>incAttr(a,-1)}
                          >−</button>
                          <div className="dotbox vitae">{attrDots[a]}</div>
                          <button
                            type="button"
                            className={`ghost-btn ${plusDisabled?'disabled':''}`}
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

            <p className="muted">Validation: {attrOk ? '✅' : '❌'}</p>
            <div className="nav-row">
              <button className="ghost-btn" type="button" onClick={()=>setStep(3)}>Back</button>
              <button className="cta" type="button" onClick={()=>setStep(5)} disabled={!attrOk}>Next</button>
            </div>
          </section>
        )}

        {/* STEP 5: Skills */}
        {step === 5 && (
          <section>
            <h3 className="section-title">Skills</h3>
            <p className="muted">Choose a distribution package, then allocate dots. Controls lock as each tier fills.</p>

            <div className="grid-3">
              <Field label="Distribution">
                <select
                  className="input"
                  value={skillPackage}
                  onChange={e=>{
                    const pkg = e.target.value;
                    setSkillPackage(pkg);
                    // Optional: don’t reset user choices automatically; they can re-allocate.
                  }}
                >
                  {Object.keys(RULES.skillPackages).map(k => <option key={k}>{k}</option>)}
                </select>
              </Field>

              <div className="card-ish pkg-card">
                <small className="muted">
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

            <div className="attr-skill-grid">
              {Object.entries(SKILLS).map(([group, list]) => (
                <div key={group} className="card-ish bleed-soft">
                  <h4>{group}</h4>
                  {list.map(s => {
                    const plusDisabled = !canIncSkill(s);
                    const minusDisabled = !canDecSkill(s);
                    return (
                      <div key={s} className="flex-row">
                        <span style={{minWidth:160}}>{s}</span>
                        <div className="dot-controls">
                          <button
                            type="button"
                            className={`ghost-btn ${minusDisabled?'disabled':''}`}
                            disabled={minusDisabled}
                            onClick={()=>incSkill(s,-1)}
                          >−</button>
                          <div className="dotbox vitae">{skillDots[s]}</div>
                          <button
                            type="button"
                            className={`ghost-btn ${plusDisabled?'disabled':''}`}
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

            <h4 className="section-sub">Specialties</h4>
            <SpecialtiesBlock
              skillDots={skillDots}
              specialties={specialties}
              setSpecialties={setSpecialties}
            />

            <p className="muted">Validation: {skillOk ? '✅' : '❌'}</p>
            <div className="nav-row">
              <button className="ghost-btn" type="button" onClick={()=>setStep(4)}>Back</button>
              <button className="cta" type="button" onClick={()=>setStep(6)} disabled={!skillOk}>Next</button>
            </div>
          </section>
        )}

        {/* STEP 6: Advantages */}
        {step === 6 && (
          <section>
            <h3 className="section-title">Advantages (Merits & Flaws)</h3>
            <p className="muted small-flavor">Every boon bears a price. Balance the ledger.</p>
            <p className="muted">Spend up to {RULES.advantages.meritsBudget} Merit dots; take at least {RULES.advantages.minFlaws} Flaw dots.</p>
            <AdvTable label="Merits" rows={merits} setRows={setMerits} cap={RULES.advantages.meritsBudget} />
            <AdvTable label="Flaws" rows={flaws} setRows={setFlaws} />
            <p className="muted">Validation: {advOk ? '✅' : '❌'}</p>
            <div className="nav-row">
              <button className="ghost-btn" type="button" onClick={()=>setStep(5)}>Back</button>
              <button className="cta" type="button" onClick={()=>setStep(7)}>Next</button>
            </div>
          </section>
        )}

        {/* STEP 7: Morality */}
        {step === 7 && (
          <section>
            <h3 className="section-title">Morality & Touchstones</h3>
            <p className="muted small-flavor">Remember what keeps the Beast at bay.</p>
            <div className="grid-2">
              <Field label="Chronicle Tenets">
                <textarea className="input" rows={3} value={tenets} onChange={e=>setTenets(e.target.value)} placeholder="List your chronicle’s tenets…" />
              </Field>
              <Field label="Humanity">
                <input className="input" type="number" min={1} max={10} value={humanity} onChange={e=>setHumanity(Number(e.target.value)||RULES.humanity)} />
              </Field>
              <Field label="Convictions">
                {convictions.map((c,i)=>(
                  <div key={i} className="flex-row">
                    <input className="input" value={c} onChange={e=>setConvictions(p=>p.map((x,idx)=>idx===i?e.target.value:x))} placeholder="e.g., Never harm children" />
                    <button className="ghost-btn" type="button" onClick={()=>setConvictions(p=>p.filter((_,idx)=>idx!==i))}>Remove</button>
                  </div>
                ))}
                <button className="ghost-btn" type="button" onClick={()=>setConvictions(p=>[...p,''])}>+ Add Conviction</button>
              </Field>
              <Field label="Touchstones">
                {touchstones.map((t,i)=>(
                  <div key={i} className="flex-row">
                    <input className="input" value={t} onChange={e=>setTouchstones(p=>p.map((x,idx)=>idx===i?e.target.value:x))} placeholder="A mortal tied to a conviction" />
                    <button className="ghost-btn" type="button" onClick={()=>setTouchstones(p=>p.filter((_,idx)=>idx!==i))}>Remove</button>
                  </div>
                ))}
                <button className="ghost-btn" type="button" onClick={()=>setTouchstones(p=>[...p,''])}>+ Add Touchstone</button>
              </Field>
              <Field label="Blood Potency">
                <input className="input" type="number" min={0} max={6} value={bloodPotency} onChange={e=>setBloodPotency(Number(e.target.value)||RULES.bloodPotency)} />
              </Field>
            </div>
            <div className="nav-row">
              <button className="ghost-btn" type="button" onClick={()=>setStep(6)}>Back</button>
              <button className="cta" type="button" onClick={()=>setStep(8)}>Next</button>
            </div>
          </section>
        )}

        {/* STEP 8: Review */}
        {step === 8 && (
          <section>
            <h3 className="section-title">Review & Save</h3>

            {clan && (
              <div className="card-ish review-crest">
                <img src={symlogo(clan)} alt={`${clan} symbol`} />
                <img src={textlogo(clan)} alt={`${clan} text logo`} />
              </div>
            )}

            <ul className="muted" style={{lineHeight:1.6}}>
              <li><b>Name:</b> {name || '—'} <b>Clan:</b> {clan || '—'}</li>
              <li><b>Concept:</b> {concept || '—'}  <b>Chronicle:</b> {chronicle}</li>
              <li><b>Ambition:</b> {ambition || '—'}  <b>Desire:</b> {desire || '—'}</li>
              <li><b>Sire:</b> {sire || '—'}  <b>Predator:</b> {predatorType}</li>
              <li><b>Disciplines:</b> {Object.entries(derivedDisciplineDots).map(([k,v])=>`${k} ${'•'.repeat(v)}`).join(' , ') || '—'}</li>
              <li><b>Attributes ok:</b> {attrOk ? '✅' : '❌'}  <b>Skills ok:</b> {skillOk ? '✅' : '❌'}</li>
              <li><b>Merits/Flaws ok:</b> {advOk ? '✅' : '❌'}</li>
            </ul>

            <div className="nav-row">
              <button className="ghost-btn" type="button" onClick={()=>setStep(1)}>Start Over</button>
              <button className="cta" disabled={!canSubmit() || saving} onClick={save}>
                {saving ? 'Saving…' : 'Save Character'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ---------- Small components ---------- */
function Stepper({ step, setStep, labels }) {
  return (
    <div className="stepper">
      {labels.map((label, i) => {
        const n = i+1, active = n===step, done = n<step;
        return (
          <button
            key={label}
            type="button"
            className={`step ${active?'active':''} ${done?'done':''}`}
            onClick={()=>setStep(n)}
          >
            <span className="num">{n}</span> {label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function AdvTable({ label, rows, setRows, cap }) {
  const spent = rows.reduce((a,r)=>a+(Number(r.dots)||0),0);
  return (
    <>
      <h4 className="section-sub">{label} {cap!=null && <>(spent: {spent}/{cap})</>}</h4>
      {rows.map((r,i)=>(
        <div key={i} className="flex-row">
          <input className="input" style={{flex:2}} placeholder={label.slice(0,-1)} value={r.name}
            onChange={e=>setRows(prev=>prev.map((x,idx)=>idx===i?{...x, name:e.target.value}:x))}/>
          <input className="input" type="number" min={0} style={{width:90}} value={r.dots}
            onChange={e=>setRows(prev=>prev.map((x,idx)=>idx===i?{...x, dots:Number(e.target.value)||0}:x))}/>
          <button className="ghost-btn" type="button" onClick={()=>setRows(rows.filter((_,idx)=>idx!==i))}>Remove</button>
        </div>
      ))}
      <button className="ghost-btn" type="button" onClick={()=>setRows([...rows,{name:'',dots:0}])}>+ Add {label.slice(0,-1)}</button>
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
      <p className="muted">
        Free specialties: one in each of <b>Academics, Craft, Performance, Science</b> (if you have dots), plus <b>one extra</b> anywhere.
        If Predator type grants a specialty in a Skill with 0 dots, convert it to the first dot instead.
      </p>
      <div className="grid-3">
        {specialties.map((sp,i)=>(
          <Field key={i} label={`Specialty ${i+1}`}>
            <input
              className="input"
              value={sp}
              onChange={e=>setSpecialties(prev=>prev.map((v,idx)=>idx===i?e.target.value:v))}
              placeholder="e.g., Melee: Knives / Persuasion: Bargaining"
            />
          </Field>
        ))}
      </div>
      <small className="muted">
        Needed: {totalNeeded}. {tooMany ? 'Trim a specialty.' : 'OK'}
      </small>
    </>
  );
}

/* A tiny quota bar used in Attributes & Skills */
function QuotaBar({ label, quotas }) {
  // quotas: { '1': n, '2': n, '3': n, '4': n } (numbers ok too)
  const keys = Object.keys(quotas).sort((a,b)=>Number(a)-Number(b));
  const allZero = keys.every(k => (quotas[k] || 0) === 0);
  return (
    <div className="quota-bar card-ish">
      <div className="quota-head">{label}</div>
      <div className="quota-pills">
        {keys.map(k => (
          <span key={k} className={`pill ${quotas[k]===0 ? 'done' : ''}`}>
            {k} <b>× {quotas[k]}</b>
          </span>
        ))}
      </div>
      {allZero && <div className="quota-ok">All set</div>}
    </div>
  );
}
