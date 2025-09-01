import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import api from '../api';
import { DISCIPLINES, ALL_DISCIPLINE_NAMES } from '../data/disciplines';
import styles from '../styles/CharacterView.module.css';

/* ---------- Clan tint colors ---------- */
const CLAN_COLORS = {
  Brujah: '#b40f1f',
  Gangrel: '#2f7a3a',
  Malkavian: '#713c8b',
  Nosferatu: '#6a4b2b',
  Toreador: '#b8236b',
  Tremere: '#7b1113',
  Ventrue: '#1b4c8c',
  'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b',
  Lasombra: '#191a5a',
  'The Ministry': '#865f12',
  Caitiff: '#636363',
  'Thin-blood': '#6e6e2b',
};

const ATTRS = [
  ['Strength','Dexterity','Stamina'],
  ['Charisma','Manipulation','Composure'],
  ['Intelligence','Wits','Resolve'],
];

const SKILLS = {
  Physical: ['Athletics','Brawl','Craft','Drive','Firearms','Larceny','Melee','Stealth','Survival'],
  Social: ['Animal Ken','Etiquette','Insight','Intimidation','Leadership','Performance','Persuasion','Streetwise','Subterfuge'],
  Mental: ['Academics','Awareness','Finance','Investigation','Medicine','Occult','Politics','Science','Technology'],
};

/* ===========================
   Normalization helpers
   =========================== */

/** true if the provided sheet looks like a flat sheet (skills are numbers, camelCase keys etc.) */
function looksLikeFlatSheet(s) {
  if (!s || typeof s !== 'object') return false;
  if (s.skills && typeof s.skills === 'object') {
    const vals = Object.values(s.skills);
    if (vals.length && vals.some(v => typeof v === 'number')) return true;
  }
  // markers commonly found in flat payloads
  if ('bloodPotency' in s) return true;
  if ('predatorType' in s) return true;
  return false;
}

/** true if the provided sheet matches the structured shape the UI expects */
function isStructuredSheet(s) {
  if (!s || typeof s !== 'object') return false;
  if (!s.skills || typeof s.skills !== 'object') return false;

  const vals = Object.values(s.skills);
  if (!vals.length) return false;

  // If any value is a number, it's flat.
  if (vals.some(v => typeof v === 'number')) return false;

  // Consider it structured only if at least one entry has a {dots} key.
  return vals.some(v => v && typeof v === 'object' && 'dots' in v);
}

/** Build a structured sheet from a flat source (either top-level flat object or flat sheet inside it) */
function normalizeFromFlatAny(source) {
  const flat = source?.sheet && looksLikeFlatSheet(source.sheet) ? source.sheet : source;
  const sheet = {};

  // Attributes
  sheet.attributes = { ...(flat.attributes || {}) };

  // Skills -> { dots, specialties[] }
  const skills = {};
  Object.entries(flat.skills || {}).forEach(([name, dots]) => {
    skills[name] = { dots: Number(dots || 0), specialties: [] };
  });
  (flat.specialties || []).forEach((s) => {
    const [rawSkill, ...rest] = String(s).split(':');
    const skill = (rawSkill || '').trim();
    const spec = rest.join(':').trim();
    if (!skill) return;
    if (!skills[skill]) skills[skill] = { dots: 0, specialties: [] };
    if (spec) skills[skill].specialties.push(spec);
  });
  sheet.skills = skills;

  // Disciplines and powers
  sheet.disciplines = { ...(flat.disciplines || {}) };
  sheet.disciplinePowers = { ...(flat.disciplinePowers || {}) };

  // Narrative bits
  sheet.predator_type = flat.predatorType || flat.predator?.type || '';
  sheet.sire = flat.sire || '';
  sheet.ambition = flat.ambition || '';
  sheet.desire = flat.desire || '';

  // Advantages (keep merits/flaws separate)
  sheet.advantages = {
    merits: Array.isArray(flat.advantages?.merits) ? flat.advantages.merits : [],
    flaws: Array.isArray(flat.advantages?.flaws) ? flat.advantages.flaws : [],
  };

  // Humanity / morality
  sheet.morality = flat.morality || {};
  sheet.humanity = flat.morality?.humanity ?? undefined;

  // Blood potency (rename)
  sheet.blood_potency = Number(flat.bloodPotency ?? 1);

  // Optional totals
  sheet.health_current = flat.health_current;
  sheet.health_max = flat.health_max;
  sheet.willpower_current = flat.willpower_current;
  sheet.willpower_max = flat.willpower_max;
  sheet.resonances = flat.resonances || [];

  return sheet;
}

/** Ensure we always return a character with a structured sheet */
function attachStructured(raw) {
  if (!raw) return raw;
  if (isStructuredSheet(raw.sheet)) return raw;
  if (looksLikeFlatSheet(raw.sheet)) return { ...raw, sheet: normalizeFromFlatAny(raw) };
  // no sheet at all or unknown shape -> derive from top-level flat object
  return { ...raw, sheet: normalizeFromFlatAny(raw) };
}

/* ===========================
   Component
   =========================== */

export default function CharacterView() {
  const [ch, setCh] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCfg, setModalCfg] = useState(null); // { name, current, next, kind, assignOnly? }

  // queue of missing selections (existing dots without specific powers chosen)
  const [pendingFixes, setPendingFixes] = useState([]);

  // ref to XP Shop section for smooth scroll
  const shopRef = useRef(null);

  useEffect(() => {
    api.get('/characters/me').then(r => {
      const raw = r.data.character;
      console.log('Loaded raw sheet', raw);
      const normalized = attachStructured(raw);
      setCh(normalized);
      // console.log('Normalized sheet preview', normalized.sheet);
    });
  }, []);

  const tint = useMemo(() => (ch ? CLAN_COLORS[ch.clan] || '#8a0f1a' : '#8a0f1a'), [ch]);

  const sheet = ch?.sheet || {};
  const disciplinesMap = useMemo(
    () => (sheet?.disciplines && typeof sheet.disciplines === 'object' ? sheet.disciplines : {}),
    [sheet]
  );

  async function spendXP(payload) {
    setErr(''); setMsg('');
    try {
      const { data } = await api.post('/characters/xp/spend', payload);
      setCh(attachStructured(data.character));
      setMsg(`Spent ${data.spent} XP.`);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to spend XP');
      throw e;
    }
  }

  // Compute which discipline dots are missing a chosen power
  const computeMissingPicks = useCallback(() => {
    const dots = sheet.disciplines || {};
    const picks = sheet.disciplinePowers || {};
    const q = [];

    Object.entries(dots).forEach(([name, lvl]) => {
      const L = Number(lvl || 0);
      if (!L) return;
      const chosen = new Set(
        (Array.isArray(picks?.[name]) ? picks[name] : []).map(p => Number(p.level))
      );
      for (let i = 1; i <= L; i++) {
        if (!chosen.has(i)) q.push({ name, level: i });
      }
    });

    q.sort((a, b) => (a.name === b.name ? a.level - b.level : a.name.localeCompare(b.name)));
    return q;
  }, [sheet]);

  // When character loads/updates, prompt for any missing power selections
  useEffect(() => {
    if (!ch) return;
    const q = computeMissingPicks();
    setPendingFixes(q);
    if (q.length && !modalOpen) {
      const first = q[0];
      setModalCfg({
        name: first.name,
        current: first.level - 1,
        next: first.level,
        kind: 'select',
        assignOnly: true
      });
      setModalOpen(true);
    }
  }, [ch, computeMissingPicks, modalOpen]);

  // called by modal when power is chosen
  async function confirmDisciplinePurchase({ name, selectedPowerId, selectedPowerName, current, next, kind, assignOnly }) {
    const nextSheet = JSON.parse(JSON.stringify(sheet));

    nextSheet.disciplines = nextSheet.disciplines || {};
    nextSheet.disciplinePowers = nextSheet.disciplinePowers || {};

    // Only raise dots when buying; when assigning a missing power, DON'T change dot count.
    if (!assignOnly) {
      nextSheet.disciplines[name] = next;
    }

    // record chosen power for the pertinent level
    const list = Array.isArray(nextSheet.disciplinePowers[name]) ? nextSheet.disciplinePowers[name] : [];
    const filtered = list.filter(p => Number(p.level) !== Number(next));
    filtered.push({ level: next, id: selectedPowerId, name: selectedPowerName });
    nextSheet.disciplinePowers[name] = filtered.sort((a,b)=>a.level-b.level);

    try {
      if (assignOnly) {
        // patch only — no XP
        await api.post('/characters/xp/spend', {
          type: 'discipline',
          disciplineKind: 'select',
          target: name,
          currentLevel: Number(nextSheet.disciplines[name] || 0),
          newLevel: Number(nextSheet.disciplines[name] || 0),
          patchSheet: nextSheet
        });
      } else {
        await spendXP({
          type: 'discipline',
          disciplineKind: kind, // 'clan' | 'other' | 'caitiff'
          target: name,
          currentLevel: current,
          newLevel: next,
          patchSheet: nextSheet
        });
      }

      // refresh character to keep local state in sync (and normalize if flat)
      const r = await api.get('/characters/me');
      setCh(attachStructured(r.data.character));

      setModalOpen(false);
      setModalCfg(null);

      // Continue auto-assign queue if we were fixing missing powers
      if (assignOnly) {
        const rest = computeMissingPicks();
        setPendingFixes(rest);
        if (rest.length) {
          const first = rest[0];
          setModalCfg({
            name: first.name,
            current: first.level - 1,
            next: first.level,
            kind: 'select',
            assignOnly: true
          });
          setModalOpen(true);
        } else {
          setMsg('All discipline powers are now specified.');
        }
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save selection');
    }
  }

  if (!ch) return null;

  return (
    <div className={styles.root} style={{ '--tint': (ch && (CLAN_COLORS[ch.clan] || '#8a0f1a')) }}>
      <div className={styles.skyline} aria-hidden="true" />
      <div className={styles.wrap}>
        <header className={styles.head}>
          <h2 className={styles.title}>
            {ch.name} <span className={styles.muted}>({ch.clan})</span> — XP: <b>{ch.xp ?? 0}</b>
          </h2>
          <div className={styles.row} style={{ gap: 8 }}>
            <span className={styles.muted}>Predator: {sheet?.predator_type || '—'}</span>
            <span className={styles.muted}>Sire: {sheet?.sire || '—'}</span>
            <span className={styles.muted}>Ambition: {sheet?.ambition || '—'}</span>
            <span className={styles.muted}>Desire: {sheet?.desire || '—'}</span>
          </div>
          {err && <div className={styles.alertError}>{err}</div>}
          {msg && <div className={styles.alertOk}>{msg}</div>}
        </header>

        {/* ===== Character Overview ===== */}
        <section className={styles.section}>
          <div className={styles.sectionTitle} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h3 className={styles.sectionTitle} style={{ margin:0 }}>Character Overview</h3>
            <button
              className={styles.cta}
              onClick={() => shopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              title="Jump to XP Shop"
            >
              Go to XP Shop
            </button>
          </div>

          {/* Top line stats */}
          <div className={styles.card} style={{ display:'grid', gap:12 }}>
            <div className={styles.row} style={{ gap:16 }}>
              <Pill label="Blood Potency" value={sheet?.blood_potency ?? 1} />
              <Pill label="Humanity" value={sheet?.humanity ?? '—'} />
              <Pill label="Health" value={`${sheet?.health_current ?? '—'} / ${sheet?.health_max ?? '—'}`} />
              <Pill label="Willpower" value={`${sheet?.willpower_current ?? '—'} / ${sheet?.willpower_max ?? '—'}`} />
            </div>
          </div>

          {/* Attributes */}
          <Card>
            <div className={styles.cardHead}><b>Attributes</b></div>
            <div className={styles.grid} style={{ gridTemplateColumns:'repeat(3,minmax(0,1fr))' }}>
              {ATTRS.map((col, i) => (
                <div key={i} className={styles.grid}>
                  {col.map(name => (
                    <DotRow key={name} label={name} value={Number(sheet?.attributes?.[name] ?? 1)} max={5} />
                  ))}
                </div>
              ))}
            </div>
          </Card>

          {/* Skills */}
          <Card>
            <div className={styles.cardHead}><b>Skills</b></div>
            <div className={styles.grid} style={{ gridTemplateColumns:'repeat(3,minmax(0,1fr))' }}>
              {Object.entries(SKILLS).map(([group, list]) => (
                <div key={group} className={styles.grid}>
                  <div className={styles.muted} style={{ fontWeight:600 }}>{group}</div>
                  {list.map(name => {
                    // Defensive coerce: accept both structured {dots,specialties[]} and flat numeric
                    const raw = sheet?.skills?.[name];
                    const node = (raw && typeof raw === 'object' && 'dots' in raw)
                      ? raw
                      : { dots: Number(raw || 0), specialties: [] };
                    return (
                      <DotRow
                        key={name}
                        label={name}
                        value={Number(node.dots || 0)}
                        max={5}
                        rightExtra={renderSpecs(node.specialties)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>

          {/* Disciplines */}
          <Card>
            <div className={styles.cardHead}><b>Disciplines</b></div>
            <div className={styles.grid}>
              {Object.keys(disciplinesMap).sort().map(dName => {
                const dots = Number(disciplinesMap[dName] || 0);
                const powerList = (sheet?.disciplinePowers?.[dName] || []).slice().sort((a,b)=>a.level-b.level);
                return (
                  <div key={dName} className={styles.grid}>
                    <DotRow label={dName} value={dots} max={5}
                      rightExtra={pendingBadgeFor(dName, dots, powerList)} />
                    {dots > 0 && (
                      <div className={styles.grid} style={{ paddingLeft:8 }}>
                        {Array.from({ length: dots }, (_, i) => i+1).map(lvl => {
                          const item = powerList.find(p => Number(p.level) === lvl);
                          return (
                            <div key={lvl} className={styles.row} style={{ gap:8, alignItems:'center' }}>
                              <span className={styles.dim} style={{ minWidth:52 }}>Lvl {lvl}:</span>
                              <span className={styles.tag} style={{ border:'1px solid var(--border-color,#333)', padding:'2px 8px', borderRadius:6 }}>
                                {item?.name || '— (choose)'}
                              </span>
                              {!item && (
                                <button
                                  className={styles.ghostBtn}
                                  onClick={() => {
                                    setModalCfg({
                                      name: dName,
                                      current: lvl - 1,
                                      next: lvl,
                                      kind: 'select',
                                      assignOnly: true
                                    });
                                    setModalOpen(true);
                                  }}
                                >
                                  Assign Power
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {!Object.keys(disciplinesMap).length && (
                <div className={styles.muted}>No disciplines yet.</div>
              )}
            </div>
          </Card>

          {/* Merits & Flaws */}
          <div className={styles.grid} style={{ gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))' }}>
            <Card>
              <div className={styles.cardHead}><b>Merits</b></div>
              <ListBadges items={sheet?.advantages?.merits?.map(m => ({ name: m.name, level: m.dots }))} emptyNote="—" />
            </Card>
            <Card>
              <div className={styles.cardHead}><b>Flaws</b></div>
              <ListBadges items={sheet?.advantages?.flaws?.map(f => ({ name: f.name, level: f.dots }))} emptyNote="—" />
            </Card>
          </div>
        </section>

        {/* ===== XP SHOP ===== */}
        <section className={styles.section} ref={shopRef}>
          <h3 className={styles.sectionTitle}>XP Shop</h3>

          <BuyRow
            label="Increase Attribute"
            hint="New level × 5"
            onBuy={(target, current, next) =>
              spendXP({ type:'attribute', target, currentLevel: current, newLevel: next })
            }
            options={['Strength','Dexterity','Stamina','Charisma','Manipulation','Composure','Intelligence','Wits','Resolve']}
          />

          <BuyRow
            label="Increase Skill"
            hint="New level × 3"
            onBuy={(target, current, next) =>
              spendXP({ type:'skill', target, currentLevel: current, newLevel: next })
            }
            options={[
              'Athletics','Brawl','Craft','Drive','Firearms','Larceny','Melee','Stealth','Survival',
              'Animal Ken','Etiquette','Insight','Intimidation','Leadership','Performance','Persuasion','Streetwise','Subterfuge',
              'Academics','Awareness','Finance','Investigation','Medicine','Occult','Politics','Science','Technology'
            ]}
          />

          <BuySimple
            label="New Specialty"
            hint="Cost 3"
            onBuy={(target) => spendXP({ type:'specialty', target, dots:1 })}
            options={['Melee: Knives','Persuasion: Bargaining','Science: Biology','Stealth: Urban','Brawl: Clinch']}
          />

          <BuyDiscipline
            getCurrent={(name) => Number(disciplinesMap?.[name] || 0)}
            onPick={(name, current, next, kind) => {
              setModalCfg({ name, current, next, kind, assignOnly: false });
              setModalOpen(true);
            }}
          />

          <BuyRitual onBuy={(lvl)=>spendXP({ type:'ritual', ritualLevel:lvl })}/>
          <BuyThinFormula onBuy={(lvl)=>spendXP({ type:'thin_blood_formula', formulaLevel:lvl })}/>
          <BuyDots
            label="Advantage (Merit/Background)"
            hint="3 per dot"
            onBuy={(name, dots)=>spendXP({ type:'advantage', target:name, dots })}
          />
          <BuyLevel
            label="Blood Potency"
            hint="New level × 10"
            onBuy={(current, next)=>spendXP({ type:'blood_potency', currentLevel: current, newLevel: next })}
          />
        </section>
      </div>

      {modalOpen && modalCfg && (
        <DisciplinePowerModal
          cfg={modalCfg}
          onCancel={() => { setModalOpen(false); setModalCfg(null); }}
          onConfirm={confirmDisciplinePurchase}
        />
      )}
    </div>
  );
}

/* ---------- Helpers for Overview ---------- */

function Pill({ label, value }) {
  return (
    <span
      className={styles.pill}
      style={{
        border:'1px solid var(--border-color,#333)',
        borderRadius: 999,
        padding:'4px 10px',
        fontSize:12,
        display:'inline-flex',
        gap:6,
        alignItems:'center',
      }}
    >
      <span className={styles.muted} style={{ opacity:.85 }}>{label}:</span>
      <b>{value}</b>
    </span>
  );
}

function renderSpecs(specs) {
  if (!Array.isArray(specs) || !specs.length) return null;
  return (
    <span className={styles.muted} style={{ marginLeft:6, fontSize:12 }}>
      • {specs.join(', ')}
    </span>
  );
}

function pendingBadgeFor(name, dots, powers) {
  const missing = Math.max(0, dots - (Array.isArray(powers) ? powers.length : 0));
  if (!missing) return null;
  return (
    <span className={styles.tag} style={{ marginLeft:8, border:'1px solid var(--border-color,#333)', borderRadius:6, padding:'2px 8px' }}>
      {missing} missing
    </span>
  );
}

function DotRow({ label, value=0, max=5, rightExtra=null }) {
  const dots = [];
  const v = Math.min(max, Math.max(0, Number(value||0)));
  for (let i=1;i<=max;i++){
    dots.push(
      <span
        key={i}
        className={`${styles.dot} ${i<=v ? styles.dotOn : ''}`}
        style={{
          display:'inline-block',
          width:10, height:10, borderRadius:'50%',
          border:'1px solid var(--border-color,#333)',
          background: i<=v ? 'var(--tint,#8a0f1a)' : 'transparent'
        }}
        aria-hidden="true"
      />
    );
  }
  return (
    <div className={styles.row} style={{ justifyContent:'space-between', gap:8 }}>
      <span>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div className={styles.dots} style={{ display:'flex', gap:6, minWidth: (max*16) }}>
          {dots}
        </div>
        {rightExtra}
      </div>
    </div>
  );
}

function ListBadges({ items, emptyNote='—' }) {
  if (!Array.isArray(items) || !items.length) return <span className={styles.muted}>{emptyNote}</span>;
  return (
    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
      {items.map((x, i) => (
        <span key={i} className={styles.tag} style={{ border:'1px solid var(--border-color,#333)', borderRadius:6, padding:'2px 8px' }}>
          {typeof x === 'string' ? x : (x?.name || '—')}
          {x?.level ? ` (•${x.level})` : ''}
        </span>
      ))}
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function Card({ children }) { return <div className={styles.card}>{children}</div>; }

function BuyRow({ label, hint, options, onBuy }) {
  const [target, setTarget] = useState(options[0]);
  const [current, setCurrent] = useState(1);
  const [next, setNext] = useState(2);
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <b>{label}</b> <small className={styles.muted}>— {hint}</small>
      </div>
      <div className={styles.rowForm ?? styles.row}>
        <select className={styles.input} value={target} onChange={e=>setTarget(e.target.value)}>
          {options.map(o=><option key={o}>{o}</option>)}
        </select>
        <span className={styles.dim}>Current:</span>
        <input className={styles.input} type="number" value={current} min={0} max={5} onChange={e=>setCurrent(Number(e.target.value)||0)}/>
        <span className={styles.dim}>New:</span>
        <input className={styles.input} type="number" value={next} min={1} max={5} onChange={e=>setNext(Number(e.target.value)||1)}/>
        <button className={styles.cta} onClick={()=>onBuy(target, current, next)}>Buy</button>
      </div>
    </div>
  );
}

function BuySimple({ label, hint, options, onBuy }) {
  const [target, setTarget] = useState(options[0]);
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <b>{label}</b> <small className={styles.muted}>— {hint}</small>
      </div>
      <div className={styles.rowForm ?? styles.row}>
        <input className={styles.input} value={target} onChange={e=>setTarget(e.target.value)} list="specs"/>
        <datalist id="specs">
          {options.map(o=><option key={o} value={o}/>)}
        </datalist>
        <button className={styles.cta} onClick={()=>onBuy(target)}>Buy</button>
      </div>
    </div>
  );
}

// This one triggers the modal instead of spending XP immediately
function BuyDiscipline({ getCurrent, onPick }) {
  const [name, setName] = useState(ALL_DISCIPLINE_NAMES[0] || 'Auspex');
  const [kind, setKind] = useState('clan'); // 'clan' | 'other' | 'caitiff'
  const current = getCurrent ? getCurrent(name) : 0;
  const [next, setNext] = useState(current + 1);

  useEffect(() => { setNext(current + 1); }, [name, current]);

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <b>Discipline</b> <small className={styles.muted}>— Clan: new×5 • Other: new×7 • Caitiff: new×6</small>
      </div>
      <div className={styles.rowForm ?? styles.row}>
        <select className={styles.input} value={name} onChange={(e)=>setName(e.target.value)}>
          {ALL_DISCIPLINE_NAMES.map(n => <option key={n}>{n}</option>)}
        </select>
        <span className={styles.dim}>Kind:</span>
        <select className={styles.input} value={kind} onChange={e=>setKind(e.target.value)}>
          <option value="clan">Clan</option>
          <option value="other">Other</option>
          <option value="caitiff">Caitiff</option>
        </select>
        <span className={styles.dim}>Current:</span>
        <input className={styles.input} type="number" value={current} readOnly />
        <span className={styles.dim}>New:</span>
        <input
          className={styles.input}
          type="number"
          value={next}
          min={current+1}
          max={5}
          onChange={e=>setNext(Number(e.target.value)||current+1)}
        />
        <button className={styles.cta} onClick={()=>onPick(name, current, next, kind)}>Select Power & Buy</button>
      </div>
    </div>
  );
}

function BuyRitual({ onBuy }) {
  const [lvl, setLvl] = useState(1);
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}><b>Blood Sorcery Ritual</b> <small className={styles.muted}>— level×3</small></div>
      <div className={styles.rowForm ?? styles.row}>
        <span className={styles.dim}>Level:</span>
        <input className={styles.input} type="number" value={lvl} min={1} max={5} onChange={e=>setLvl(Number(e.target.value)||1)}/>
        <button className={styles.cta} onClick={()=>onBuy(lvl)}>Buy</button>
      </div>
    </div>
  );
}

function BuyThinFormula({ onBuy }) {
  const [lvl, setLvl] = useState(1);
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}><b>Thin-blood Formula</b> <small className={styles.muted}>— level×3</small></div>
      <div className={styles.rowForm ?? styles.row}>
        <span className={styles.dim}>Level:</span>
        <input className={styles.input} type="number" value={lvl} min={1} max={5} onChange={e=>setLvl(Number(e.target.value)||1)}/>
        <button className={styles.cta} onClick={()=>onBuy(lvl)}>Buy</button>
      </div>
    </div>
  );
}

function BuyDots({ label, hint, onBuy }) {
  const [name, setName] = useState('Allies');
  const [dots, setDots] = useState(1);
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}><b>{label}</b> <small className={styles.muted}>— {hint}</small></div>
      <div className={styles.rowForm ?? styles.row}>
        <span className={styles.dim}>Name:</span>
        <input className={styles.input} value={name} onChange={e=>setName(e.target.value)}/>
        <span className={styles.dim}>Dots:</span>
        <input className={styles.input} type="number" value={dots} min={1} max={5} onChange={e=>setDots(Number(e.target.value)||1)}/>
        <button className={styles.cta} onClick={()=>onBuy(name, dots)}>Buy</button>
      </div>
    </div>
  );
}

function BuyLevel({ label, hint, onBuy }) {
  const [curr, setCurr] = useState(1);
  const [next, setNext] = useState(2);
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}><b>{label}</b> <small className={styles.muted}>— {hint}</small></div>
      <div className={styles.rowForm ?? styles.row}>
        <span className={styles.dim}>Current:</span>
        <input className={styles.input} type="number" value={curr} min={0} max={10} onChange={e=>setCurr(Number(e.target.value)||0)}/>
        <span className={styles.dim}>New:</span>
        <input className={styles.input} type="number" value={next} min={1} max={10} onChange={e=>setNext(Number(e.target.value)||1)}/>
        <button className={styles.cta} onClick={()=>onBuy(curr, next)}>Buy</button>
      </div>
    </div>
  );
}

/* ---------- Modal for Discipline Power Selection ---------- */

function lineOrNone(x){ return (x === undefined || x === null || x === '' || x === '—' || x === 'None') ? null : x; }

function DisciplinePowerModal({ cfg, onCancel, onConfirm }) {
  const { name, current, next, kind, assignOnly } = cfg;
  const meta = DISCIPLINES[name] || {};
  const allChoices = meta?.levels?.[next] || [];

  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [warn, setWarn] = useState('');

  const choices = useMemo(() => {
    if (!q.trim()) return allChoices;
    const s = q.toLowerCase();
    return allChoices.filter(p =>
      (p.name || '').toLowerCase().includes(s) ||
      (p.id || '').toLowerCase().includes(s) ||
      (p.notes || '').toLowerCase().includes(s) ||
      (p.amalgam || '').toLowerCase().includes(s) ||
      (p.origin || '').toLowerCase().includes(s) ||
      (p.resonance || '').toLowerCase().includes(s) ||
      (p.cost || '').toLowerCase().includes(s)
    );
  }, [allChoices, q]);

  function confirm() {
    if (!selected) { setWarn('You have not selected a specific power.'); return; }
    const chosen = allChoices.find(c => c.id === selected);
    onConfirm({
      name, current, next, kind, assignOnly,
      selectedPowerId: chosen.id,
      selectedPowerName: chosen.name,
    });
  }

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <div className={styles.modalHeadL}>
            {meta.icon && <img src={meta.icon} alt={`${name} icon`} className={styles.discIcon} />}
            <div>
              <h4 className={styles.modalTitle}>{name} — Choose a Level {next} Power</h4>
              <div className={styles.metaLine}>
                {lineOrNone(meta.type) && <span className={styles.badge}>{meta.type}</span>}
                {lineOrNone(meta.resonance) && <span className={`${styles.badge} ${styles.badgeMuted}`}>Resonance: {meta.resonance}</span>}
                {Array.isArray(meta.clan_affinity) && meta.clan_affinity.length > 0 && (
                  <span className={`${styles.badge} ${styles.badgeMuted}`}>Affinity: {meta.clan_affinity.join(', ')}</span>
                )}
                {assignOnly && <span className={styles.badge}>Assign Missing Power</span>}
              </div>
            </div>
          </div>
          <input
            className={styles.search}
            placeholder="Search by name, notes, amalgam, origin…"
            value={q}
            onChange={e=>setQ(e.target.value)}
          />
        </div>

        <div className={styles.powerList}>
          {!choices.length && (
            <div className={styles.alertError}>No powers configured for this level yet (or filtered away).</div>
          )}

          {choices.map(p => (
            <label key={p.id} className={`${styles.powerCard} ${selected === p.id ? styles.powerSelected : ''}`}>
              <div className={styles.powerRadio}>
                <input
                  type="radio"
                  name="disc-power"
                  value={p.id}
                  checked={selected === p.id}
                  onChange={()=>{ setSelected(p.id); setWarn(''); }}
                />
              </div>
              <div className={styles.powerBody}>
                <div className={styles.powerTitle}>{p.name}</div>

                <div className={styles.powerTags}>
                  {lineOrNone(p.cost) && <span className={styles.tag}>Cost: {p.cost}</span>}
                  {lineOrNone(p.duration) && <span className={styles.tag}>Duration: {p.duration}</span>}
                  {lineOrNone(p.amalgam) && <span className={styles.tag}>Amalgam: {p.amalgam}</span>}
                  {lineOrNone(p.prerequisite) && <span className={styles.tag}>Prereq: {p.prerequisite}</span>}
                  {lineOrNone(p.origin) && <span className={`${styles.tag} ${styles.tagMuted}`}>Origin: {p.origin}</span>}
                  {lineOrNone(p.resonance) && <span className={`${styles.tag} ${styles.tagMuted}`}>Resonance: {p.resonance}</span>}
                </div>

                <div className={styles.powerFields}>
                  {lineOrNone(p.dice_pool) && <div className={styles.field}><b>Dice:</b> {p.dice_pool}</div>}
                  {lineOrNone(p.opposing_pool) && <div className={styles.field}><b>Opposes:</b> {p.opposing_pool}</div>}
                </div>

                {lineOrNone(p.notes) && <div className={styles.powerNotes}>{p.notes}</div>}
                {lineOrNone(p.source) && <div className={styles.powerSource}>{p.source}</div>}
              </div>
            </label>
          ))}
        </div>

        {warn && <div className={styles.alertError} style={{ marginTop:8 }}>{warn}</div>}

        <div className={styles.modalFoot}>
          <div className={styles.footLeft}>
            Current dots: {current} → New dots: {next} • Kind: {assignOnly ? 'select' : kind}
          </div>
          <div className={styles.footRight}>
            <button className={styles.ghostBtn} onClick={onCancel}>Cancel</button>
            <button className={styles.cta} onClick={confirm}>{assignOnly ? 'Confirm & Save' : 'Confirm & Buy'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
