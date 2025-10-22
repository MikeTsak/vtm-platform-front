// src/pages/CharacterEditor.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import styles from '../styles/Admin.module.css';

// --- Data libraries (must stay at top!) ---
import * as DiscDataNS from '../data/disciplines';
import { MERITS_AND_FLAWS } from '../data/merits_flaws';

// --- Discipline names fallback logic ---
let ALL_DISCIPLINE_NAMES =
  Array.isArray(DiscDataNS.ALL_DISCIPLINE_NAMES) && DiscDataNS.ALL_DISCIPLINE_NAMES.length
    ? DiscDataNS.ALL_DISCIPLINE_NAMES
    : DiscDataNS.DISCIPLINES
      ? Object.keys(DiscDataNS.DISCIPLINES)
      : [];

if (!ALL_DISCIPLINE_NAMES || ALL_DISCIPLINE_NAMES.length === 0) {
  ALL_DISCIPLINE_NAMES = [
    'Animalism','Auspex','Blood Sorcery','Celerity','Dominate','Fortitude',
    'Obfuscate','Oblivion','Potence','Presence','Protean','Thin-blood Alchemy'
  ];
}

// ---------- helpers ----------
const ATTR_KEYS = [
  'Strength','Dexterity','Stamina',
  'Charisma','Manipulation','Composure',
  'Intelligence','Wits','Resolve'
];

const SKILL_GROUPS = {
  Physical:  ['Athletics','Brawl','Drive','Firearms','Larceny','Melee','Stealth','Survival'],
  Social:    ['Animal Ken','Etiquette','Insight','Intimidation','Leadership','Performance','Persuasion','Streetwise','Subterfuge'],
  Mental:    ['Academics','Awareness','Finance','Investigation','Medicine','Occult','Politics','Science','Technology']
};

const DISC_KINDS = [
  { key: 'clan',    label: 'Clan (×5)'    },
  { key: 'caitiff', label: 'Caitiff (×6)' },
  { key: 'other',   label: 'Out-of-Clan (×7)' },
];

const COST = {
  attribute: lvl => lvl * 5,
  skill:     lvl => lvl * 3,
  specialty: ()  => 3,
  discipline: (lvl, kind='other') => (kind==='clan'? lvl*5 : kind==='caitiff'? lvl*6 : lvl*7),
  meritDot:  ()  => 3,
  flawDot:   ()  => -3,
};

function deepClone(x) { try { return structuredClone(x); } catch { return JSON.parse(JSON.stringify(x || {})); } }
function sumStepCost(oldV, newV, stepFn) {
  let t = 0;
  if (Number(newV) > Number(oldV)) {
    for (let l = oldV + 1; l <= newV; l++) t += stepFn(l);
  } else if (Number(newV) < Number(oldV)) {
    for (let l = oldV; l > newV; l--) t -= stepFn(l);
  }
  return t;
}
function bulletCount(s) { return (s || '').split('').filter(ch => ch === '•').length; }

// ----- Merits/Flaws catalog flatten -----
function flattenMF() {
  const out = [];
  Object.entries(MERITS_AND_FLAWS).forEach(([cat, payload]) => {
    if (payload?.merits?.length) {
      payload.merits.forEach(m => out.push({ ...m, type:'merit', category:cat, dotsText:m.dots ?? '' }));
    }
    if (payload?.flaws?.length) {
      payload.flaws.forEach(f => out.push({ ...f, type:'flaw', category:cat, dotsText:f.dots ?? '' }));
    }
    if (payload?.groups) {
      Object.entries(payload.groups).forEach(([groupName, g]) => {
        g.merits?.forEach(m => out.push({ ...m, type:'merit', category:`${cat} / ${groupName}`, dotsText:m.dots ?? '' }));
        g.flaws?.forEach(f => out.push({ ...f, type:'flaw', category:`${cat} / ${groupName}`, dotsText:f.dots ?? '' }));
      });
    }
  });
  return out;
}
const MF_CATALOG = flattenMF();
function normalizeDotsInput(v) {
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return Math.min(5, Math.max(1, n));
  const bc = bulletCount(String(v));
  return bc > 0 ? Math.min(5, bc) : 1;
}

// ---------- Component ----------
export default function CharacterEditor({ character, onClose, onSaved }) {
  // Parse original structured sheet
  const originalSheet = useMemo(() => {
    try {
      if (!character?.sheet) return {};
      const parsed = typeof character.sheet === 'string' ? JSON.parse(character.sheet) : character.sheet;
      return normalizeSheet(parsed);
    } catch { return {}; }
  }, [character]);

  // Local editable sheet
  const [sheet, setSheet] = useState(() => deepClone(originalSheet));
  const [jsonText, setJsonText] = useState(() => JSON.stringify(originalSheet ?? {}, null, 2));
  const [jsonValid, setJsonValid] = useState(true);

  // Character top-level meta (editable too)
  const [charName, setCharName] = useState(character?.name || '');
  const [charClan, setCharClan] = useState(character?.clan || '');

  // Discipline kind for XP math (per discipline)
  const initialKinds = useMemo(() => {
    const m = {};
    Object.keys(originalSheet?.disciplines || {}).forEach(k => { m[k] = 'other'; });
    return m;
  }, [originalSheet]);
  const [discKinds, setDiscKinds] = useState(initialKinds);

  // XP mode: 'xp' | 'refund' | 'free'
  const [xpMode, setXpMode] = useState('xp');

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const [manualXp, setManualXp] = useState(0);

  // Keep JSON and structured in sync
  useEffect(() => {
    try {
      const parsed = normalizeSheet(JSON.parse(jsonText));
      setSheet(parsed);
      setJsonValid(true);
      setErr('');
    } catch {
      setJsonValid(false);
    }
  }, [jsonText]);

  // Normalize incoming weird shapes once on mount
  useEffect(() => {
    const normalized = normalizeSheet(sheet);
    if (JSON.stringify(normalized) !== JSON.stringify(sheet)) {
      writeSheet(normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function writeSheet(next) {
    setSheet(next);
    setJsonText(JSON.stringify(next, null, 2));
  }

  // ------ identity / bio helpers ------
  const setStrField = (key, val) => {
    const next = deepClone(sheet);
    next[key] = val;
    writeSheet(next);
  };

  // ------ attribute editing ------
  const setAttr = (name, val) => {
    const v = Math.max(0, Number(val) || 0);
    const next = deepClone(sheet);
    next.attributes = next.attributes || {};
    next.attributes[name] = v;
    writeSheet(next);
  };

  // ------ skill editing ------
  const setSkillDots = (name, dots) => {
    const v = Math.max(0, Number(dots) || 0);
    const next = deepClone(sheet);
    next.skills = next.skills || {};
    const base = next.skills[name] || { dots: 0, specialties: [] };
    next.skills[name] = { ...base, dots: v };
    writeSheet(next);
  };
  const setSkillSpecsCSV = (name, csv) => {
    const list = csv.split(',').map(s => s.trim()).filter(Boolean);
    const next = deepClone(sheet);
    next.skills = next.skills || {};
    const base = next.skills[name] || { dots: 0, specialties: [] };
    base.specialties = list;
    next.skills[name] = base;
    writeSheet(next);
  };
  const addNewSkill = (name) => {
    const n = name.trim();
    if (!n) return;
    const next = deepClone(sheet);
    next.skills = next.skills || {};
    if (!next.skills[n]) next.skills[n] = { dots: 0, specialties: [] };
    writeSheet(next);
  };
  const removeSkill = (name) => {
    const next = deepClone(sheet);
    if (next.skills) delete next.skills[name];
    writeSheet(next);
  };

  // ------ discipline editing ------
  const setDiscipline = (name, lvl) => {
    const v = Math.max(0, Number(lvl) || 0);
    const next = deepClone(sheet);
    next.disciplines = next.disciplines || {};
    next.disciplines[name] = v;
    writeSheet(next);
  };
  const addNewDiscipline = (name) => {
    const n = name.trim();
    if (!n) return;
    const next = deepClone(sheet);
    next.disciplines = next.disciplines || {};
    if (!next.disciplines[n]) next.disciplines[n] = 0;
    writeSheet(next);
    setDiscKinds(prev => ({ ...prev, [n]: 'other' }));
  };
  const removeDiscipline = (name) => {
    const next = deepClone(sheet);
    if (next.disciplines) delete next.disciplines[name];
    writeSheet(next);
    setDiscKinds(prev => {
      const n = { ...prev };
      delete n[name];
      return n;
    });
  };

  // ------ convictions ------
  const convictions = Array.isArray(sheet.convictions) ? sheet.convictions : [];
  const setConvictions = (arr) => writeSheet({ ...sheet, convictions: arr });
  const addConviction = (text) => {
    if (!text.trim()) return;
    setConvictions([...(convictions || []), text.trim()]);
  };
  const updateConviction = (i, text) => {
    const arr = [...(convictions || [])];
    arr[i] = text;
    setConvictions(arr);
  };
  const removeConviction = (i) => {
    const arr = [...(convictions || [])];
    arr.splice(i, 1);
    setConvictions(arr);
  };
  const moveConviction = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= convictions.length) return;
    const arr = [...convictions];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setConvictions(arr);
  };

  // ------ touchstones ------
  const touchstones = Array.isArray(sheet.touchstones) ? sheet.touchstones : [];
  const setTouchstones = (arr) => writeSheet({ ...sheet, touchstones: arr });
  const addTouchstone = (name, conviction='') => {
    if (!String(name).trim()) return;
    setTouchstones([...(touchstones || []), { name: String(name).trim(), conviction: String(conviction||'').trim() }]);
  };
  const updateTouchstone = (i, patch) => {
    const arr = [...(touchstones || [])];
    arr[i] = { ...arr[i], ...patch };
    setTouchstones(arr);
  };
  const removeTouchstone = (i) => {
    const arr = [...(touchstones || [])];
    arr.splice(i, 1);
    setTouchstones(arr);
  };

  // ------ merits / flaws ------
  function currentMF(kind) {
    const arr = sheet?.advantages?.[kind] || [];
    return Array.isArray(arr) ? arr : [];
  }
  const setMF = (kind, nextArr) => {
    const next = deepClone(sheet);
    next.advantages = next.advantages || {};
    next.advantages[kind] = nextArr;
    writeSheet(next);
  };
  const addMF = (kind, item) => setMF(kind, [...currentMF(kind), item]);
  const updateMF = (kind, idx, patch) => {
    const arr = currentMF(kind);
    const next = [...arr];
    next[idx] = { ...next[idx], ...patch };
    setMF(kind, next);
  };
  const removeMF = (kind, idx) => {
    const arr = currentMF(kind);
    const next = [...arr];
    next.splice(idx, 1);
    setMF(kind, next);
  };

  // ------ rituals ------
  const setRituals = (path, nextArr) => {
    const next = deepClone(sheet);
    next.rituals = next.rituals || { blood_sorcery: [], oblivion: [] };
    next.rituals[path] = Array.isArray(nextArr) ? nextArr : [];
    writeSheet(next);
  };
  const ensureRituals = () => {
    const next = deepClone(sheet);
    next.rituals = next.rituals || { blood_sorcery: [], oblivion: [] };
    if (!Array.isArray(next.rituals.blood_sorcery)) next.rituals.blood_sorcery = [];
    if (!Array.isArray(next.rituals.oblivion)) next.rituals.oblivion = [];
    writeSheet(next);
  };
  const addRitual = (path, value) => {
    const v = String(value || '').trim();
    if (!v) return;
    const arr = Array.isArray(sheet?.rituals?.[path]) ? [...sheet.rituals[path]] : [];
    arr.push(v);
    setRituals(path, arr);
  };
  const updateRitual = (path, i, value) => {
    const arr = Array.isArray(sheet?.rituals?.[path]) ? [...sheet.rituals[path]] : [];
    arr[i] = value;
    setRituals(path, arr);
  };
  const removeRitual = (path, i) => {
    const arr = Array.isArray(sheet?.rituals?.[path]) ? [...sheet.rituals[path]] : [];
    arr.splice(i, 1);
    setRituals(path, arr);
  };

  // ======= XP IMPACT =======
  const xpImpactRaw = useMemo(() => {
    let delta = 0;

    // Attributes
    const oA = originalSheet.attributes || {};
    const nA = sheet.attributes || {};
    const aKeys = Array.from(new Set([...Object.keys(oA), ...Object.keys(nA)]));
    aKeys.forEach(k => {
      const a = Number(oA[k] ?? 0);
      const b = Number(nA[k] ?? 0);
      delta += sumStepCost(a, b, l => COST.attribute(l));
    });

    // Skills (+ specialties)
    const oS = originalSheet.skills || {};
    const nS = sheet.skills || {};
    const sKeys = Array.from(new Set([...Object.keys(oS), ...Object.keys(nS)]));
    sKeys.forEach(k => {
      const a = Number(oS[k]?.dots ?? 0);
      const b = Number(nS[k]?.dots ?? 0);
      delta += sumStepCost(a, b, l => COST.skill(l));

      const oldSpecs = Array.isArray(oS[k]?.specialties) ? oS[k].specialties : [];
      const newSpecs = Array.isArray(nS[k]?.specialties) ? nS[k].specialties : [];
      const adds = Math.max(0, newSpecs.length - oldSpecs.length);
      const rems = Math.max(0, oldSpecs.length - newSpecs.length);
      delta += adds * COST.specialty();
      delta -= rems * COST.specialty();
    });

    // Disciplines (per-kind)
    const oD = originalSheet.disciplines || {};
    const nD = sheet.disciplines || {};
    const dKeys = Array.from(new Set([...Object.keys(oD), ...Object.keys(nD)]));
    dKeys.forEach(k => {
      const a = Number(oD[k] ?? 0);
      const b = Number(nD[k] ?? 0);
      const kind = discKinds[k] || 'other';
      delta += sumStepCost(a, b, l => COST.discipline(l, kind));
    });

    // Merits & Flaws
    const oMer = (originalSheet?.advantages?.merits || []);
    const nMer = (sheet?.advantages?.merits || []);
    const oFlw = (originalSheet?.advantages?.flaws || []);
    const nFlw = (sheet?.advantages?.flaws || []);

    function indexByIdName(arr) {
      const m = new Map();
      arr.forEach((it, i) => {
        const key = (it.id || it.name || `idx_${i}`).toLowerCase();
        m.set(key, { idx:i, item:it });
      });
      return m;
    }

    // Merits delta
    {
      const oldMap = indexByIdName(oMer);
      const newMap = indexByIdName(nMer);
      oldMap.forEach(({ item:oldItem }, key) => {
        const oDots = Number(oldItem?.dots ?? 0);
        if (newMap.has(key)) {
          const nDots = Number(newMap.get(key).item?.dots ?? 0);
          delta += (nDots - oDots) * COST.meritDot();
        } else {
          delta -= oDots * COST.meritDot();
        }
      });
      newMap.forEach(({ item:newItem }, key) => {
        if (!oldMap.has(key)) {
          const nDots = Number(newItem?.dots ?? 0);
          delta += nDots * COST.meritDot();
        }
      });
    }

    // Flaws delta
    {
      const oldMap = indexByIdName(oFlw);
      const newMap = indexByIdName(nFlw);
      oldMap.forEach(({ item:oldItem }, key) => {
        const oDots = Number(oldItem?.dots ?? 0);
        if (newMap.has(key)) {
          const nDots = Number(newMap.get(key).item?.dots ?? 0);
          delta += (nDots - oDots) * COST.flawDot();
        } else {
          delta -= oDots * COST.flawDot();
        }
      });
      newMap.forEach(({ item:newItem }, key) => {
        if (!oldMap.has(key)) {
          const nDots = Number(newItem?.dots ?? 0);
          delta += nDots * COST.flawDot();
        }
      });
    }

    return delta;
  }, [originalSheet, sheet, discKinds]);

  // Apply mode
  const xpImpact = useMemo(() => {
    if (xpMode === 'free') return 0;
    if (xpMode === 'refund') return Math.min(0, xpImpactRaw);
    return xpImpactRaw;
  }, [xpMode, xpImpactRaw]);
  const deltaSign = xpImpact === 0 ? '' : (xpImpact > 0 ? 'Spend' : 'Refund');
  const deltaAbs = Math.abs(xpImpact);

  // ======= SAVE =======
  async function handleSave() {
    setErr(''); setMsg('');
    if (!jsonValid) { setErr('Fix JSON first.'); return; }

    try {
      setSaving(true);

      // 1) XP delta
      if (xpImpact !== 0) {
        await api.patch(`/admin/characters/${character.id}/xp`, { delta: -xpImpact });
      }

      // 2) Save sheet + name/clan updates
      await api.patch(`/admin/characters/${character.id}`, {
        name: charName,
        clan: charClan,
        sheet
      });

      setMsg(`Saved. ${deltaSign ? `${deltaSign} ${deltaAbs} XP.` : 'No XP change.'}`);
      onSaved?.();
      onClose?.();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save character.');
    } finally {
      setSaving(false);
    }
  }

  // ======= Manual XP =======
  async function applyManualXp(sign) {
    setErr(''); setMsg('');
    const amt = Number(manualXp) || 0;
    if (!amt) return;
    try {
      await api.patch(`/admin/characters/${character.id}/xp`, { delta: sign === 'add' ? amt : -amt });
      setMsg(`${sign === 'add' ? 'Added' : 'Removed'} ${amt} XP.`);
      onSaved?.();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to adjust XP.');
    }
  }

  // ======= render =======
  const dlId = `discNames-${character?.id || 'x'}`;

  return (
    <div className={styles.modalBackdrop}>
      <div className={`${styles.modalCard} ${styles.card} ${styles.cardElev}`} style={{ width: 'min(1180px, 96vw)' }}>
        {/* Header */}
        <div className={styles.row} style={{ justifyContent:'space-between', alignItems:'center', gap:12 }}>
          <div>
            <h3>Character Editor</h3>
            <div className={styles.subtle}>
              #{character.id} — <b>{character.name}</b> ({character.clan || '—'}) · XP: {character.xp}
            </div>
          </div>
          <div className={styles.row} style={{ gap:8, flexWrap:'wrap' }}>
            <ModeButton active={xpMode==='xp'}     onClick={()=>setXpMode('xp')}>XP Mode</ModeButton>
            <ModeButton active={xpMode==='refund'} onClick={()=>setXpMode('refund')}>Refund Mode</ModeButton>
            <ModeButton active={xpMode==='free'}   onClick={()=>setXpMode('free')}>Free Edit</ModeButton>
            <button className={styles.btn} onClick={onClose}>Close</button>
          </div>
        </div>

        {err && <div className={`${styles.alert} ${styles.alertError}`} style={{marginTop:8}}>{err}</div>}
        {msg && <div className={`${styles.alert} ${styles.alertInfo}`} style={{marginTop:8}}>{msg}</div>}

        {/* XP preview + manual controls */}
        <div className={styles.card} style={{ marginTop:12 }}>
          <div className={styles.row} style={{ justifyContent:'space-between', alignItems:'center', gap:12 }}>
            <div className={styles.subtle}>
              XP impact: {xpMode==='free'
                ? '— (Free Edit)'
                : (xpImpact === 0 ? '—' : (xpImpact > 0 ? `Spend ${xpImpact} XP` : `Refund ${Math.abs(xpImpact)} XP`))}
            </div>
            <div className={styles.row} style={{ gap:8, flexWrap:'wrap' }}>
              <input
                type="number"
                value={manualXp}
                onChange={e=>setManualXp(e.target.value)}
                placeholder="Amount"
                style={{ width:120 }}
              />
              <button className={styles.btn} onClick={()=>applyManualXp('add')}>Add XP</button>
              <button className={styles.btn} onClick={()=>applyManualXp('remove')}>Remove XP</button>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="stack12" style={{ display:'grid', gap:12, marginTop:12 }}>
          {/* Identity / Background */}
          <section className={styles.card}>
            <SectionHeader title="Identity & Background" hint="Edit non-XP fields (name, clan, sire, etc.)" />
            <div className="grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:8 }}>
              <LabeledInput label="Name" value={charName} onChange={setCharName} />
              <LabeledInput label="Clan" value={charClan} onChange={setCharClan} />
              <LabeledInput label="Sire" value={sheet.sire || ''} onChange={v=>setStrField('sire', v)} />
              <LabeledInput label="Generation" type="number" value={sheet.generation || ''} onChange={v=>setStrField('generation', Number(v)||'' )} />
              <LabeledInput label="Concept" value={sheet.concept || ''} onChange={v=>setStrField('concept', v)} />
              <LabeledInput label="Chronicle" value={sheet.chronicle || ''} onChange={v=>setStrField('chronicle', v)} />
              <LabeledInput label="Coterie" value={sheet.coterie || ''} onChange={v=>setStrField('coterie', v)} />
              <LabeledInput label="Ambition" value={sheet.ambition || ''} onChange={v=>setStrField('ambition', v)} />
              <LabeledInput label="Desire" value={sheet.desire || ''} onChange={v=>setStrField('desire', v)} />
              <LabeledInput label="Predator Type" value={sheet.predator_type || ''} onChange={v=>setStrField('predator_type', v)} />
            </div>
          </section>

          {/* Convictions & Touchstones */}
          <section className={styles.card}>
            <SectionHeader title="Convictions & Touchstones" hint="ST can edit all entries" />
            <div className={styles.row} style={{ gap:12, alignItems:'flex-start', flexWrap:'wrap' }}>
              {/* Convictions */}
              <div style={{ flex:'1 1 360px' }}>
                <h4 style={{marginBottom:8}}>Convictions</h4>
                {(convictions.length === 0) && <div className={styles.subtle}>None</div>}
                {convictions.map((c, i) => (
                  <div key={`conv_${i}`} className={styles.row} style={{ gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                    <input
                      style={{ flex:'1 1 360px' }}
                      value={c}
                      onChange={e=>updateConviction(i, e.target.value)}
                      placeholder="Conviction text"
                    />
                    <div className={styles.row} style={{ gap:6 }}>
                      <button className={styles.btn} onClick={()=>moveConviction(i,-1)} title="Move up">↑</button>
                      <button className={styles.btn} onClick={()=>moveConviction(i, 1)} title="Move down">↓</button>
                      <button className={styles.btn} onClick={()=>removeConviction(i)}>Remove</button>
                    </div>
                  </div>
                ))}
                <AddAnyRow placeholder="Add a conviction…" onAdd={addConviction} />
              </div>

              {/* Touchstones */}
              <div style={{ flex:'1 1 360px' }}>
                <h4 style={{marginBottom:8}}>Touchstones</h4>
                {(touchstones.length === 0) && <div className={styles.subtle}>None</div>}
                {touchstones.map((t, i) => (
                  <div key={`ts_${i}`} className={styles.row} style={{ gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                    <input
                      style={{ flex:'2 1 260px' }}
                      value={t?.name || ''}
                      onChange={e=>updateTouchstone(i, { name: e.target.value })}
                      placeholder="Name (mortal/anchor)"
                    />
                    <select
                      value={t?.conviction || ''}
                      onChange={e=>updateTouchstone(i, { conviction: e.target.value })}
                      style={{ flex:'2 1 260px' }}
                    >
                      <option value="">— Linked conviction (optional) —</option>
                      {convictions.map((c, idx) => <option key={`copt_${idx}`} value={c}>{c}</option>)}
                    </select>
                    <button className={styles.btn} onClick={()=>removeTouchstone(i)}>Remove</button>
                  </div>
                ))}
                <AddTouchstoneRow convictions={convictions} onAdd={addTouchstone} />
              </div>
            </div>
          </section>

          {/* Attributes */}
          <section className={styles.card}>
            <SectionHeader title="Attributes" hint="new level × 5" />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {ATTR_KEYS.map(k => (
                <label key={k} className={styles.row} style={{ gap:8, alignItems:'center' }}>
                  <span style={{minWidth:120}}>{k}</span>
                  <input type="number" min={0} value={Number(sheet.attributes?.[k] ?? 0)} onChange={e=>setAttr(k, e.target.value)} style={{ width:90 }} />
                </label>
              ))}
            </div>
          </section>

          {/* Skills */}
          <section className={styles.card}>
            <SectionHeader title="Skills" hint="new level × 3; specialties ±3" />
            {Object.entries(SKILL_GROUPS).map(([group, keys]) => (
              <div key={group} style={{marginTop:8}}>
                <div className={styles.subtle} style={{marginBottom:6}}>{group}</div>
                <div className="stack8" style={{ display:'grid', gap:8 }}>
                  {keys.map(k => (
                    <SkillRow
                      key={k}
                      name={k}
                      data={sheet.skills?.[k] || { dots:0, specialties:[] }}
                      onDots={(v)=>setSkillDots(k, v)}
                      onSpecs={(csv)=>setSkillSpecsCSV(k, csv)}
                    />
                  ))}
                </div>
              </div>
            ))}
            {/* Custom skills */}
            {Object.keys(sheet.skills || {}).filter(k => !Object.values(SKILL_GROUPS).flat().includes(k)).length > 0 && (
              <div style={{marginTop:8}}>
                <div className={styles.subtle} style={{marginBottom:6}}>Custom</div>
                <div className="stack8" style={{ display:'grid', gap:8 }}>
                  {Object.keys(sheet.skills || {}).filter(k => !Object.values(SKILL_GROUPS).flat().includes(k)).map(k => (
                    <SkillRow
                      key={k}
                      name={k}
                      data={sheet.skills?.[k] || { dots:0, specialties:[] }}
                      onDots={(v)=>setSkillDots(k, v)}
                      onSpecs={(csv)=>setSkillSpecsCSV(k, csv)}
                      removable
                      onRemove={()=>removeSkill(k)}
                    />
                  ))}
                </div>
              </div>
            )}
            <AddAnyRow placeholder="Add skill name…" onAdd={addNewSkill} />
          </section>

          {/* Disciplines */}
          <section className={styles.card}>
            <SectionHeader title="Disciplines" hint="per dot: Clan×5 / Caitiff×6 / Out×7" />
            <div className="stack8" style={{ display:'grid', gap:8 }}>
              {Object.keys(sheet.disciplines || {}).sort().map(name => (
                <div key={name} className={styles.row} style={{ gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <b style={{minWidth:160}}>{name}</b>
                  <input type="number" min={0} value={Number(sheet.disciplines?.[name] ?? 0)} onChange={e=>setDiscipline(name, e.target.value)} style={{ width:90 }} />
                  <select value={discKinds[name] || 'other'} onChange={e=>setDiscKinds(p=>({ ...p, [name]:e.target.value }))}>
                    {DISC_KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
                  </select>
                  <button className={styles.btn} onClick={()=>removeDiscipline(name)}>Remove</button>
                </div>
              ))}
            </div>
            <div className={styles.row} style={{ gap:8, marginTop:8, flexWrap:'wrap' }}>
              <input list={dlId} placeholder="Add discipline…" onKeyDown={e=>{ if (e.key==='Enter') addNewDiscipline(e.currentTarget.value); }} />
              <button className={styles.btn} onClick={()=>{
                const el = document.querySelector(`input[list="${dlId}"]`);
                if (el) { addNewDiscipline(el.value); el.value=''; }
              }}>Add</button>
              <datalist id={dlId}>
                {ALL_DISCIPLINE_NAMES.map(n => <option key={n} value={n} />)}
              </datalist>
            </div>
            {(!ALL_DISCIPLINE_NAMES || ALL_DISCIPLINE_NAMES.length === 0) && (
              <div className={styles.alert} style={{marginTop:8}}>Discipline list not found; using fallback names. Check your <code>disciplines.js</code> exports.</div>
            )}
          </section>

          {/* Merits & Flaws */}
          <section className={styles.card}>
            <SectionHeader title="Merits & Flaws" hint="Merits: +3 XP per dot; Flaws: −3 XP per dot" />
            <div className={styles.row} style={{ gap:12, alignItems:'flex-start', flexWrap:'wrap' }}>
              {/* Current Merits */}
              <div style={{ flex:'1 1 360px' }}>
                <h4 style={{marginBottom:8}}>Merits</h4>
                <CurrentMFList
                  items={currentMF('merits')}
                  kind="merits"
                  onChange={(i,patch)=>updateMF('merits', i, patch)}
                  onRemove={(i)=>removeMF('merits', i)}
                />
                <MFPicker kind="merit" onPick={(entry, dots)=>{
                  addMF('merits', {
                    id: entry?.id || '',
                    name: entry?.name || entry?.id || 'Custom Merit',
                    description: entry?.description || '',
                    category: entry?.category || '',
                    dots
                  });
                }} />
              </div>

              {/* Current Flaws */}
              <div style={{ flex:'1 1 360px' }}>
                <h4 style={{marginBottom:8}}>Flaws</h4>
                <CurrentMFList
                  items={currentMF('flaws')}
                  kind="flaws"
                  onChange={(i,patch)=>updateMF('flaws', i, patch)}
                  onRemove={(i)=>removeMF('flaws', i)}
                />
                <MFPicker kind="flaw" onPick={(entry, dots)=>{
                  addMF('flaws', {
                    id: entry?.id || '',
                    name: entry?.name || entry?.id || 'Custom Flaw',
                    description: entry?.description || '',
                    category: entry?.category || '',
                    dots
                  });
                }} />
              </div>
            </div>
          </section>

          {/* Rituals */}
          <section className={styles.card}>
            <SectionHeader title="Rituals" hint="Edit Blood Sorcery & Oblivion lists" />
            <button className={styles.btn} onClick={ensureRituals} style={{ marginBottom:8 }}>Ensure Rituals Section</button>

            <RitualSection
              title="Blood Sorcery"
              items={sheet?.rituals?.blood_sorcery || []}
              onAdd={(v)=>addRitual('blood_sorcery', v)}
              onEdit={(i,v)=>updateRitual('blood_sorcery', i, v)}
              onRemove={(i)=>removeRitual('blood_sorcery', i)}
            />
            <div style={{ height:8 }} />
            <RitualSection
              title="Oblivion"
              items={sheet?.rituals?.oblivion || []}
              onAdd={(v)=>addRitual('oblivion', v)}
              onEdit={(i,v)=>updateRitual('oblivion', i, v)}
              onRemove={(i)=>removeRitual('oblivion', i)}
            />
          </section>

          {/* Raw JSON */}
          <section className={styles.card}>
            <div className={styles.row} style={{ justifyContent:'space-between', alignItems:'center' }}>
              <h4>Raw Sheet JSON</h4>
              {!jsonValid ? <span className={styles.alertError} style={{padding:'2px 8px', borderRadius:6}}>Invalid JSON</span> : <span className={styles.subtle}>editable</span>}
            </div>
            <textarea
              rows={26}
              value={jsonText}
              onChange={e=>setJsonText(e.target.value)}
              style={{ fontFamily:'JetBrains Mono, ui-monospace, monospace', width:'100%' }}
            />
            <div className={styles.subtle} style={{marginTop:6}}>
              Tip: You can add/remove anything here (powers, predator types, backgrounds, custom fields). UI stays in sync.
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className={styles.row} style={{ justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
          <div className={styles.subtle}>
            Mode: <b>{xpMode==='free' ? 'Free Edit' : xpMode==='refund' ? 'Refund Only' : 'XP Mode'}</b> ·
            {' '}Impact: {xpMode==='free'
              ? '—'
              : (xpImpact === 0 ? '—' : (xpImpact > 0 ? `Spend ${xpImpact}` : `Refund ${Math.abs(xpImpact)}`))} XP
          </div>
          <div className={styles.row} style={{ gap:8 }}>
            <button className={styles.btn} onClick={onClose} disabled={saving}>Cancel</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving || !jsonValid}>
              {saving ? 'Saving…' : 'Save & Apply XP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----- small subcomponents ----- */

function ModeButton({ active, onClick, children }) {
  return (
    <button
      className={styles.btn}
      style={{
        background: active ? 'var(--btnPrimaryBg, #111)' : undefined,
        color: active ? 'var(--btnPrimaryFg, #fff)' : undefined
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SectionHeader({ title, hint }) {
  return (
    <div className={styles.row} style={{ justifyContent:'space-between', alignItems:'baseline' }}>
      <h4>{title}</h4>
      <span className={styles.subtle}>{hint}</span>
    </div>
  );
}

function LabeledInput({ label, value, onChange, type='text' }) {
  return (
    <label className={styles.row} style={{ gap:8, alignItems:'center' }}>
      <span style={{minWidth:140}}>{label}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(type==='number' ? e.target.value : e.target.value)}
        style={{ flex:1 }}
        placeholder={label}
      />
    </label>
  );
}

function SkillRow({ name, data, onDots, onSpecs, removable=false, onRemove }) {
  const csv = Array.isArray(data?.specialties) ? data.specialties.join(', ') : '';
  return (
    <div className={styles.row} style={{ gap:8, alignItems:'center' }}>
      <span style={{minWidth:150}}>{name}</span>
      <input type="number" min={0} value={Number(data?.dots ?? 0)} onChange={e=>onDots(e.target.value)} style={{ width:90 }} />
      <input placeholder="specialties (comma separated)" value={csv} onChange={e=>onSpecs(e.target.value)} style={{ flex:1 }} />
      {removable && <button className={styles.btn} onClick={onRemove}>Remove</button>}
    </div>
  );
}

function CurrentMFList({ items, kind, onChange, onRemove }) {
  const empty = !items?.length;
  return (
    <div>
      {empty && <div className={styles.subtle}>None</div>}
      {!empty && (
        <div className="stack8" style={{ display:'grid', gap:8 }}>
          {items.map((it, i) => (
            <div key={`${it.id || it.name || 'x'}_${i}`} className={styles.row} style={{ gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <input
                style={{ minWidth:180, flex:'1 1 220px' }}
                value={it.name || ''}
                onChange={e=>onChange(i, { name:e.target.value })}
                placeholder={kind==='merits' ? 'Merit name' : 'Flaw name'}
              />
              <input
                style={{ flex:'2 1 320px' }}
                value={it.description || ''}
                onChange={e=>onChange(i, { description:e.target.value })}
                placeholder="Description (optional)"
              />
              <input
                type="number"
                min={1}
                max={5}
                style={{ width:90 }}
                value={Number(it.dots ?? 1)}
                onChange={e=>onChange(i, { dots: normalizeDotsInput(e.target.value) })}
                title="Dots"
              />
              <button className={styles.btn} onClick={()=>onRemove(i)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MFPicker({ kind, onPick }) {
  const [q, setQ] = useState('');
  const [dots, setDots] = useState(1);
  const [sel, setSel] = useState(null);

  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    return MF_CATALOG.filter(e =>
      e.type === (kind === 'merit' ? 'merit' : 'flaw') &&
      (!qq || e.name?.toLowerCase().includes(qq) || e.category?.toLowerCase().includes(qq))
    ).slice(0, 100);
  }, [q, kind]);

  return (
    <div className={styles.card} style={{ marginTop:12 }}>
      <div className={styles.row} style={{ gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <input placeholder={`Search ${kind === 'merit' ? 'merits' : 'flaws'}…`} value={q} onChange={e=>setQ(e.target.value)} style={{ flex:'2 1 300px' }} />
        <select value={sel?.id || ''} onChange={e=>{
          const id = e.target.value;
          const found = MF_CATALOG.find(x => x.id === id);
          setSel(found || null);
          if (found) {
            const once = bulletCount(found.dotsText);
            setDots(Math.max(1, once || 1));
          }
        }} style={{ flex:'2 1 360px' }}>
          <option value="">Choose…</option>
          {filtered.map(e => (
            <option key={e.id || e.name} value={e.id}>{e.name} — {e.category} ({e.dotsText || '•?'})</option>
          ))}
        </select>
        <input type="number" min={1} max={5} value={dots} onChange={e=>setDots(normalizeDotsInput(e.target.value))} style={{ width:90 }} title="Dots" />
        <button className={styles.btn} onClick={() => { onPick?.(sel || { id:'', name:q }, dots); setQ(''); setSel(null); setDots(1); }}>
          Add {kind === 'merit' ? 'Merit' : 'Flaw'}
        </button>
      </div>
      {sel && (
        <div className={styles.subtle} style={{ marginTop:6 }}>
          <b>{sel.name}</b> · {sel.category} · {sel.dotsText || '•?'} — {sel.description}
        </div>
      )}
    </div>
  );
}

function RitualSection({ title, items, onAdd, onEdit, onRemove }) {
  const [v, setV] = useState('');
  const list = Array.isArray(items) ? items : [];
  return (
    <div>
      <div className={styles.row} style={{ justifyContent:'space-between', alignItems:'center' }}>
        <h4>{title}</h4>
      </div>
      {list.map((r, i) => (
        <div key={`${r}_${i}`} className={styles.row} style={{ gap:8, alignItems:'center', marginBottom:6 }}>
          <input value={r} onChange={e=>onEdit(i, e.target.value)} style={{ flex:1 }} />
          <button className={styles.btn} onClick={()=>onRemove(i)}>Remove</button>
        </div>
      ))}
      <div className={styles.row} style={{ gap:8 }}>
        <input placeholder={`Add ${title}…`} value={v} onChange={e=>setV(e.target.value)} style={{ flex:1 }} />
        <button className={styles.btn} onClick={()=>{ onAdd(v); setV(''); }}>Add</button>
      </div>
    </div>
  );
}

function AddAnyRow({ placeholder, onAdd }) {
  const [v, setV] = React.useState('');
  return (
    <div className={styles.row} style={{ marginTop:8, gap:8 }}>
      <input
        placeholder={placeholder}
        value={v}
        onChange={e => setV(e.target.value)}
        style={{ flex:1 }}
      />
      <button
        className={styles.btn}
        onClick={() => {
          if (v.trim()) onAdd(v.trim());
          setV('');
        }}
      >
        Add
      </button>
    </div>
  );
}

function AddTouchstoneRow({ convictions, onAdd }) {
  const [name, setName] = useState('');
  const [cv, setCv] = useState('');
  return (
    <div className={styles.row} style={{ marginTop:8, gap:8, flexWrap:'wrap' }}>
      <input placeholder="Touchstone name…" value={name} onChange={e=>setName(e.target.value)} style={{ flex:'2 1 260px' }} />
      <select value={cv} onChange={e=>setCv(e.target.value)} style={{ flex:'2 1 260px' }}>
        <option value="">— Link conviction (optional) —</option>
        {convictions.map((c, idx) => <option key={`cv_${idx}`} value={c}>{c}</option>)}
      </select>
      <button className={styles.btn} onClick={()=>{ onAdd(name, cv); setName(''); setCv(''); }}>Add Touchstone</button>
    </div>
  );
}

/* ---------- normalization ---------- */
function normalizeSheet(s) {
  const sheet = deepClone(s || {});
  // attributes
  sheet.attributes = sheet.attributes && typeof sheet.attributes === 'object' ? sheet.attributes : {};
  // skills
  if (Array.isArray(sheet.skills)) {
    // convert array of {name,dots,specialties?} into object
    const obj = {};
    sheet.skills.forEach(x => {
      if (x && x.name) obj[x.name] = { dots: Number(x.dots||0), specialties: Array.isArray(x.specialties) ? x.specialties : [] };
    });
    sheet.skills = obj;
  } else {
    sheet.skills = sheet.skills && typeof sheet.skills === 'object' ? sheet.skills : {};
  }
  // disciplines (handle arrays or weird maps)
  if (Array.isArray(sheet.disciplines)) {
    const obj = {};
    sheet.disciplines.forEach(x => {
      if (!x) return;
      if (typeof x === 'string') obj[x] = 0;
      else if (x.name) obj[x.name] = Number(x.level || x.dots || x.value || 0);
    });
    sheet.disciplines = obj;
  } else if (sheet.disciplines && typeof sheet.disciplines === 'object') {
    // normalize values to numbers
    const obj = {};
    Object.entries(sheet.disciplines).forEach(([k, v]) => {
      if (v && typeof v === 'object') obj[k] = Number(v.level || v.dots || v.value || 0);
      else obj[k] = Number(v || 0);
    });
    sheet.disciplines = obj;
  } else {
    sheet.disciplines = {};
  }
  // rituals
  sheet.rituals = sheet.rituals || { blood_sorcery: [], oblivion: [] };
  sheet.rituals.blood_sorcery = Array.isArray(sheet.rituals.blood_sorcery) ? sheet.rituals.blood_sorcery : [];
  sheet.rituals.oblivion = Array.isArray(sheet.rituals.oblivion) ? sheet.rituals.oblivion : [];
  // convictions / touchstones
  sheet.convictions = Array.isArray(sheet.convictions) ? sheet.convictions : [];
  sheet.touchstones = Array.isArray(sheet.touchstones) ? sheet.touchstones : [];
  // default BP
  if (sheet.blood_potency == null) sheet.blood_potency = 1;
  return sheet;
}
