// src/pages/CharacterView.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthCtx } from '../AuthContext';
import { DISCIPLINES, ALL_DISCIPLINE_NAMES, iconPath } from '../data/disciplines';
import { RITUALS } from '../data/rituals';
import styles from '../styles/CharacterView.module.css';
import CharacterSetup from './CharacterSetup';
import { MERITS_AND_FLAWS } from '../data/merits_flaws';
import generateVTMCharacterSheetPDF from '../utils/pdfGenerator'; 

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

const NAME_OVERRIDES = {
  'The Ministry': 'Ministry',
  'Banu Haqim': 'Banu_Haqim',
  'Thin-blood': 'Thinblood'
};
const symlogo = (c) => `/img/clans/330px-${(NAME_OVERRIDES[c]||c).replace(/\s+/g,'_')}_symbol.png`;

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

/* ======================================================
   MERITS & FLAWS HELPERS
   ====================================================== */
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
function glyph(n) {
  return '•'.repeat(Math.max(0, Number(n) || 0));
}

function allSelectableMerits() {
  const out = [];
  for (const [cat, payload] of Object.entries(MERITS_AND_FLAWS)) {
    if (['Caitiff', 'Thin-blood', 'Ghouls', 'Cults'].includes(cat)) continue;
    const pushIt = (item, category) => {
      const allowed = parseDotSpec(item.dots);
      if (!allowed.length) return; 
      out.push({ id: item.id, name: item.name, dotsSpec: item.dots, description: item.description, category, allowed });
    };
    (payload.merits || []).forEach(m => pushIt(m, cat));
    if (payload.groups) {
      for (const [sub, grp] of Object.entries(payload.groups)) {
        (grp.merits || []).forEach(m => pushIt(m, `${cat} / ${sub}`));
      }
    }
  }
  const seen = new Set();
  return out.filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}

function allSelectableFlaws() {
  const out = [];
  for (const [cat, payload] of Object.entries(MERITS_AND_FLAWS)) {
    if (['Caitiff', 'Thin-blood', 'Ghouls', 'Cults'].includes(cat)) continue;
    const pushIt = (item, category) => {
      const allowed = parseDotSpec(item.dots);
      if (!allowed.length) return; 
      out.push({ id: item.id, name: item.name, dotsSpec: item.dots, description: item.description, category, allowed });
    };
    (payload.flaws || []).forEach(f => pushIt(f, cat));
    if (payload.groups) {
      for (const [sub, grp] of Object.entries(payload.groups)) {
        (grp.flaws || []).forEach(f => pushIt(f, `${cat} / ${sub}`));
      }
    }
  }
  const seen = new Set();
  return out.filter(f => (seen.has(f.id) ? false : (seen.add(f.id), true)));
}

/* ===========================
   Sheet normalization helpers
   =========================== */
function looksLikeFlatSheet(s) {
  if (!s || typeof s !== 'object') return false;
  if (s.skills && typeof s.skills === 'object') {
    const vals = Object.values(s.skills);
    if (vals.length && vals.some(v => typeof v === 'number')) return true;
  }
  if ('bloodPotency' in s) return true;
  if ('predatorType' in s) return true;
  return false;
}

function isStructuredSheet(s) {
  if (!s || typeof s !== 'object') return false;
  if (!s.skills || typeof s.skills !== 'object') return false;
  const vals = Object.values(s.skills);
  if (!vals.length) return false;
  if (vals.some(v => typeof v === 'number')) return false;
  return vals.some(v => v && typeof v === 'object' && 'dots' in v);
}

function normalizeFromFlatAny(source) {
  const flat = source?.sheet && looksLikeFlatSheet(source.sheet) ? source.sheet : source;
  const sheet = {};

  const getCaseInsensitive = (obj, key) => {
    if (!obj) return undefined;
    const k = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    return k ? obj[k] : undefined;
  };

  sheet.attributes = { ...(flat.attributes || {}) };

  const skills = {};
  Object.entries(flat.skills || {}).forEach(([name, dots]) => {
    skills[name] = { dots: Number(dots || 0), specialties: [] };
  });
  (flat.specialties || []).forEach(s => {
    const [rawSkill, ...rest] = String(s).split(':');
    const skill = (rawSkill || '').trim();
    const spec = rest.join(':').trim();
    if (!skill) return;
    if (!skills[skill]) skills[skill] = { dots: 0, specialties: [] };
    if (spec) skills[skill].specialties.push(spec);
  });
  sheet.skills = skills;

  sheet.disciplines = { ...(flat.disciplines || {}) };
  sheet.disciplinePowers = { ...(flat.disciplinePowers || {}) };

  sheet.predator_type = flat.predatorType || flat.predator?.type || '';
  sheet.sire = flat.sire || '';
  sheet.ambition = flat.ambition || '';
  sheet.desire = flat.desire || '';

  sheet.advantages = {
    merits: Array.isArray(flat.advantages?.merits) ? flat.advantages.merits : [],
    flaws: Array.isArray(flat.advantages?.flaws) ? flat.advantages.flaws : [],
  };

  sheet.morality = flat.morality || {};
  sheet.humanity = flat.morality?.humanity ?? flat.humanity ?? undefined;
  sheet.stains = flat.stains ?? 0;
  sheet.hunger = flat.hunger ?? 1;

  sheet.blood_potency = Number(flat.bloodPotency ?? flat.blood_potency ?? 1);

  const staminaRaw = getCaseInsensitive(sheet.attributes, 'Stamina') ?? getCaseInsensitive(flat.attributes, 'Stamina') ?? 1;
  const stamina = Number(staminaRaw);
  let healthMax = stamina + 3;

  const fortDotsRaw = getCaseInsensitive(sheet.disciplines, 'Fortitude') ?? 0;
  const fortitudeDots = Number(fortDotsRaw);

  const fortPowers = getCaseInsensitive(sheet.disciplinePowers, 'Fortitude') || [];
  const hasResilience = Array.isArray(fortPowers) && fortPowers.some(p => {
    const name = String(p.name || p.id || '').toLowerCase();
    return name.includes('resilience') || name.includes('toughness');
  });

  if (hasResilience) {
    healthMax += fortitudeDots;
  }
  
  sheet.health_max = healthMax;

  const hSuperficial = Number(flat?.health?.superficial ?? 0);
  const hAggravated  = Number(flat?.health?.aggravated  ?? 0);
  const legacyHealth = Number(flat?.health_current);

  if (Number.isFinite(legacyHealth)) {
    sheet.health_current = Math.max(0, Math.min(sheet.health_max, legacyHealth));
  } else {
    const hDmg = Math.max(0, Math.min(sheet.health_max, hSuperficial + hAggravated));
    sheet.health_current = sheet.health_max - hDmg;
  }
  sheet.health = { superficial: hSuperficial, aggravated: hAggravated };


  const compRaw = getCaseInsensitive(sheet.attributes, 'Composure') ?? getCaseInsensitive(flat.attributes, 'Composure') ?? 1;
  const resoRaw = getCaseInsensitive(sheet.attributes, 'Resolve')   ?? getCaseInsensitive(flat.attributes, 'Resolve')   ?? 1;
  
  const comp = Number(compRaw);
  const reso = Number(resoRaw);
  sheet.willpower_max = comp + reso;

  const wpSuperficial = Number(flat?.willpower?.superficial ?? 0);
  const wpAggravated  = Number(flat?.willpower?.aggravated  ?? 0);
  const legacyWpCurrent = Number(flat?.willpower_current);

  if (Number.isFinite(legacyWpCurrent)) {
    sheet.willpower_current = Math.max(0, Math.min(sheet.willpower_max, legacyWpCurrent));
  } else {
    const wpDmg = Math.max(0, Math.min(sheet.willpower_max, wpSuperficial + wpAggravated));
    sheet.willpower_current = sheet.willpower_max - wpDmg;
  }
  sheet.willpower = { superficial: wpSuperficial, aggravated: wpAggravated };

  sheet.resonances = flat.resonances || [];

  sheet.rituals = {
    blood_sorcery: Array.isArray(flat.rituals?.blood_sorcery) ? flat.rituals.blood_sorcery : [],
    oblivion: Array.isArray(flat.rituals?.oblivion) ? flat.rituals.oblivion : [],
  };
  
  if (flat.xp_spent !== undefined) sheet.xp_spent = flat.xp_spent;
  if (flat.experience !== undefined) sheet.experience = flat.experience;

  if (source?.sheet?.allow_reset === true) sheet.allow_reset = true;
  if (flat?.allow_reset === true) sheet.allow_reset = true;
  if (source?.allow_reset === true) sheet.allow_reset = true;

  if (source?.sheet?.is_active !== undefined) sheet.is_active = source.sheet.is_active;
  if (flat?.is_active !== undefined) sheet.is_active = flat.is_active;
  if (source?.is_active !== undefined) sheet.is_active = source.is_active;

  return sheet;
}

function attachStructured(raw) {
  if (!raw) return raw;

  function buildDisciplineIndex() {
    const map = {};
    for (const [disc, data] of Object.entries((typeof DISCIPLINES !== 'undefined' && DISCIPLINES) || {})) {
      const byId = new Map();
      const byName = new Map();
      const levels = data?.levels || {};
      for (const [lvlStr, arr] of Object.entries(levels)) {
        const lvl = Number(lvlStr);
        (arr || []).forEach(p => {
          if (!p) return;
          if (p.id)   byId.set(String(p.id).toLowerCase(), lvl);
          if (p.slug) byId.set(String(p.slug).toLowerCase(), lvl);
          if (p.key)  byId.set(String(p.key).toLowerCase(), lvl);
          if (p.name) byName.set(String(p.name).toLowerCase(), lvl);
        });
      }
      map[disc] = { byId, byName };
    }
    return map;
  }

  function ensureDisciplinePicksHaveLevels(sheet) {
    const idx = buildDisciplineIndex();
    const out = { ...sheet, disciplinePowers: sheet.disciplinePowers || {} };

    for (const [disc, picks] of Object.entries(out.disciplinePowers)) {
      const index = idx[disc];
      const next = [];
      const seenLevel = new Set();

      (Array.isArray(picks) ? picks : []).forEach(rawPick => {
        const p = typeof rawPick === 'string' ? { id: rawPick } : { ...rawPick };
        let level = Number(p.level);

        if (!Number.isInteger(level) || level <= 0) {
          const keys = [p.id, p.slug, p.key, p.code, p.power_id, p.name]
            .filter(Boolean)
            .map(s => String(s).toLowerCase());
          if (index) {
            for (const k of keys) {
              const guessed = index.byId.get(k) ?? index.byName.get(k);
              if (Number.isInteger(guessed) && guessed > 0) {
                level = guessed;
                break;
              }
            }
          }
        }

        if (Number.isInteger(level) && level > 0) {
          if (!seenLevel.has(level)) {
            seenLevel.add(level);
            next.push({ ...p, level });
          }
        } else {
          next.push(p);
        }
      });

      next.sort((a, b) => Number(a.level || 99) - Number(b.level || 99));
      out.disciplinePowers[disc] = next;
    }

    return out;
  }

  let sheet;
  if (isStructuredSheet(raw.sheet)) {
    sheet = { ...raw.sheet };
  } else if (looksLikeFlatSheet(raw.sheet)) {
    sheet = normalizeFromFlatAny(raw);
  } else {
    sheet = normalizeFromFlatAny(raw);
  }

  sheet.rituals = sheet.rituals || { blood_sorcery: [], oblivion: [] };
  sheet.rituals.blood_sorcery = sheet.rituals.blood_sorcery || [];
  sheet.rituals.oblivion = sheet.rituals.oblivion || [];
  if (sheet.blood_potency == null) sheet.blood_potency = 1;
  sheet.disciplinePowers = sheet.disciplinePowers || {};

  sheet = ensureDisciplinePicksHaveLevels(sheet);

  return { ...raw, sheet };
}

/* ===========================
   XP rules
   =========================== */
const XP_RULES = {
  attribute: newLevel => newLevel * 5,
  skill: newLevel => newLevel * 3,
  specialty: () => 3,
  advantageDot: dots => dots * 3,
  disciplineClan: newLevel => newLevel * 5,
  disciplineOther: newLevel => newLevel * 7,
  disciplineCaitiff: newLevel => newLevel * 6,
  ritual: lvl => lvl * 3,
  ceremony: lvl => lvl * 3,
  bloodPotency: newLevel => newLevel * 10, 
};

function disciplineKindFor(ch, name) {
  if (ch?.clan === 'Caitiff') return 'caitiff';
  const aff = DISCIPLINES?.[name]?.clan_affinity || [];
  return aff.includes(ch?.clan) ? 'clan' : 'other';
}

function estimateDisciplineCost(ch, name, current, next) {
  const kind = disciplineKindFor(ch, name);
  if (kind === 'clan') return XP_RULES.disciplineClan(next);
  if (kind === 'other') return XP_RULES.disciplineOther(next);
  return XP_RULES.disciplineCaitiff(next);
}

/* ===========================
   Drawers & Visual Trackers
   =========================== */
function Drawer({ title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className={styles.drawer}>
      <button
        className={styles.drawerHeader}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span>
          <b>{title}</b>{subtitle ? <small className={styles.muted}> — {subtitle}</small> : null}
        </span>
        <span className={styles.chev} data-open={open ? '1' : '0'}>▾</span>
      </button>
      <div className={styles.drawerBody} style={{ display: open ? 'block' : 'none' }}>
        {children}
      </div>
    </div>
  );
}

function TrackerBlock({ label, val, max, agg=0, sup=0, filled=0, stains=0 }) {
  const boxes = [];
  for(let i=0; i<max; i++){
    let content = '';
    let isFilled = false;
    
    if (agg > 0 || sup > 0) {
      if(i < agg) content = 'X';
      else if(i < agg + sup) content = '/';
    } else {
      if (i < filled) isFilled = true;
      if (i >= max - stains) content = '/';
    }

    let bg = isFilled ? 'var(--text-color, #222)' : 'rgba(0,0,0,0.05)';
    let border = isFilled ? 'var(--text-color, #222)' : 'rgba(128,128,128,0.5)';
    let fSize = 18;

    if (label === 'Hunger' && isFilled) {
      content = '🩸';
      bg = 'rgba(0,0,0,0.05)'; 
      border = 'rgba(128,128,128,0.5)';
      fSize = 14;
    }

    boxes.push(
      <div 
         key={i} 
         style={{
           width: 24, height: 24, border: `1px solid ${border}`,
           display: 'flex', alignItems: 'center', justifyContent: 'center',
           fontSize: fSize, fontWeight: 'bold', lineHeight: 0,
           color: content === 'X' ? '#b40f1f' : 'inherit',
           backgroundColor: bg,
           borderRadius: '4px',
           boxSizing: 'border-box',
           flexShrink: 0 
         }}
      >
        {content}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.8, fontWeight: 'bold' }}>
        <span>{label}</span> 
        <span style={{ fontWeight: 'normal' }}>{val} / {max}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>{boxes}</div>
    </div>
  );
}

/* ===========================
   Component
   =========================== */
export default function CharacterView({
  adminNPCId = null,
  loadPath,
  xpSpendPath,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user } = useContext(AuthCtx) || {};
  const isAdmin = user?.role === 'admin';

  // Memoize all merits and flaws so we can look up their full descriptions later
  const allMeritsFlat = useMemo(() => allSelectableMerits(), []);
  const allFlawsFlat = useMemo(() => allSelectableFlaws(), []);

  const paths = useMemo(() => {
    if (adminNPCId) {
      return {
        load: `/admin/npcs/${adminNPCId}`,
        spend: `/admin/npcs/${adminNPCId}/xp/spend`,
        update: `/admin/npcs/${adminNPCId}`,
        totals: null,
        pickFrom: 'npc',
      };
    }
    if (loadPath) {
      return {
        load: loadPath,
        spend: xpSpendPath,
        update: loadPath,
        totals: null,
        pickFrom: 'npc',
      };
    }
    return {
      load: id ? `/characters/user/${id}` : `/characters/me`,
      spend: id ? `/characters/user/${id}/xp/spend` : `/characters/xp/spend`,
      update: id ? `/characters/user/${id}` : `/characters/me`,
      totals: `/characters/xp/total`,
      pickFrom: 'character',
    };
  }, [adminNPCId, loadPath, xpSpendPath, id]);

  const [showSetup, setShowSetup] = useState(false);
  const [ch, setCh] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCfg, setModalCfg] = useState(null);
  const [pendingFixes, setPendingFixes] = useState([]);
  const [xpTotals, setXpTotals] = useState(null);
  const shopRef = useRef(null);

  const [tempHealth, setTempHealth] = useState({ superficial: 0, aggravated: 0 });
  const [tempWillpower, setTempWillpower] = useState({ superficial: 0, aggravated: 0 });
  const [tempHunger, setTempHunger] = useState(1);
  const [tempHumanity, setTempHumanity] = useState(7);
  const [tempStains, setTempStains] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');
  const saveTimeoutRef = useRef(null);
  const isInitialTrackerLoad = useRef(true);
  
  useEffect(() => {
    let mounted = true;
    api.get(paths.load)
      .then(r => {
        let obj = null;
        if (adminNPCId || loadPath) obj = r.data.npc || r.data.character || r.data[paths.pickFrom] || null;
        else obj = r.data.character || r.data[paths.pickFrom] || r.data.npc || null;
        if (!mounted) return;
        
        const structured = attachStructured(obj);
        setCh(structured);
        
        if (structured && structured.sheet) {
          setTempHealth({ superficial: structured.sheet.health?.superficial || 0, aggravated: structured.sheet.health?.aggravated || 0 });
          setTempWillpower({ superficial: structured.sheet.willpower?.superficial || 0, aggravated: structured.sheet.willpower?.aggravated || 0 });
          setTempHunger(structured.sheet.hunger ?? 1);
          setTempHumanity(structured.sheet.morality?.humanity ?? structured.sheet.humanity ?? 7);
          setTempStains(structured.sheet.stains ?? 0);
          isInitialTrackerLoad.current = false;
        }
      })
      .catch(e => {
        if (!mounted) return;
        setErr(e?.response?.data?.error || 'Failed to load character');
      });
    return () => { mounted = false; };
  }, [paths, adminNPCId, loadPath]);

  useEffect(() => {
    if (!paths.totals || !ch) return;
    api.get(paths.totals)
      .then(r => setXpTotals(r.data))
      .catch(() => {});
  }, [paths.totals, ch]);

  useEffect(() => {
    if (isInitialTrackerLoad.current || !ch || !isAdmin) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    setSaveStatus('Saving trackers...');
    saveTimeoutRef.current = setTimeout(() => {
      const nextSheet = JSON.parse(JSON.stringify(ch.sheet || {}));
      nextSheet.health = tempHealth;
      nextSheet.willpower = tempWillpower;
      nextSheet.hunger = tempHunger;
      nextSheet.stains = tempStains;
      nextSheet.humanity = tempHumanity;
      if (!nextSheet.morality) nextSheet.morality = {};
      nextSheet.morality.humanity = tempHumanity;

      const payload = {
          name: ch.name,
          clan: ch.clan,
          sheet: nextSheet
      };

      api.put(paths.update, payload).catch(() => {
         api.patch(paths.update, payload).catch(()=>{});
      })
      .then(() => setSaveStatus('Saved'))
      .catch(() => setSaveStatus('Error'))
      .finally(() => setTimeout(() => setSaveStatus(''), 2000));

    }, 1000);
    
    return () => clearTimeout(saveTimeoutRef.current);
  }, [tempHealth, tempWillpower, tempHunger, tempHumanity, tempStains, ch, paths.update, isAdmin]);

  const updateTracker = (type, kind, delta) => {
    if (!isAdmin) return; 
    if (type === 'health') {
      setTempHealth(prev => ({ ...prev, [kind]: Math.max(0, (prev[kind] || 0) + delta) }));
    } else if (type === 'willpower') {
      setTempWillpower(prev => ({ ...prev, [kind]: Math.max(0, (prev[kind] || 0) + delta) }));
    }
  };


  async function spendXP(payload) {
    setErr(''); setMsg('');
    try {
      const { data } = await api.post(paths.spend, payload);
      const obj = data.character || data.npc || null;
      setCh(attachStructured(obj));
      setMsg(`Action successful.`);
      if (paths.totals) {
        try { const t = await api.get(paths.totals); setXpTotals(t.data); } catch {}
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to update character sheet');
      throw e;
    }
  }

  const tint = useMemo(() => (ch ? CLAN_COLORS[ch.clan] || '#8a0f1a' : '#8a0f1a'), [ch]);
  const sheet = useMemo(() => ch?.sheet || {}, [ch]);
  const xp = ch?.xp ?? 0;

  const disciplinesMap = useMemo(
    () => (sheet?.disciplines && typeof sheet.disciplines === 'object' ? sheet.disciplines : {}),
    [sheet]
  );

  const computeMissingPicks = useCallback(() => {
    const dots = sheet.disciplines || {};
    const picks = sheet.disciplinePowers || {};
    const q = [];
    Object.entries(dots).forEach(([name, lvl]) => {
      const L = Number(lvl || 0);
      if (!L) return;
      const chosen = new Set((Array.isArray(picks?.[name]) ? picks[name] : []).map(p => Number(p.level)));
      for (let i = 1; i <= L; i++) if (!chosen.has(i)) q.push({ name, level: i });
    });
    q.sort((a, b) => (a.name === b.name ? a.level - b.level : a.name.localeCompare(b.name)));
    return q;
  }, [sheet]);

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

  async function confirmDisciplinePurchase({ name, selectedPowerId, selectedPowerName, current, next, kind, assignOnly }) {
    const nextSheet = JSON.parse(JSON.stringify(sheet));
    nextSheet.disciplines = nextSheet.disciplines || {};
    nextSheet.disciplinePowers = nextSheet.disciplinePowers || {};

    if (!assignOnly) nextSheet.disciplines[name] = next;

    const list = Array.isArray(nextSheet.disciplinePowers[name]) ? nextSheet.disciplinePowers[name] : [];
    const filtered = list.filter(p => Number(p.level) !== Number(next));
    filtered.push({ level: next, id: selectedPowerId, name: selectedPowerName });
    nextSheet.disciplinePowers[name] = filtered.sort((a, b) => a.level - b.level);

    try {
      if (assignOnly) {
        await api.post(paths.spend, {
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
          disciplineKind: kind, 
          target: name,
          currentLevel: current,
          newLevel: next,
          patchSheet: nextSheet
        });
      }

      const r = await api.get(paths.load);
      const obj = r.data[paths.pickFrom] || r.data.character || r.data.npc || null;
      setCh(attachStructured(obj));

      setModalOpen(false);
      setModalCfg(null);

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

  const knownRitualIds = useMemo(() => new Set([
    ...(sheet.rituals?.blood_sorcery || []).map(r => r.id),
    ...(sheet.rituals?.oblivion || []).map(r => r.id),
  ]), [sheet.rituals]);
const knownPowerNamesAndIds = useMemo(() => {
    const powers = sheet.disciplinePowers || {};
    const known = new Set();
    
    // Aggressive normalizer: strips spaces, underscores, dashes, and (errata) tags
    const superNorm = (v) => String(v ?? '').toLowerCase().replace(/\(errata\)/g, '').replace(/[\s_\-]+/g, '');
  
    Object.values(powers).flat().forEach(p => {
      if (p?.id) known.add(superNorm(p.id));
      if (p?.name) known.add(superNorm(p.name));
      if (p?.slug) known.add(superNorm(p.slug));
      if (p?.key) known.add(superNorm(p.key));
    });

    const merits = sheet.advantages?.merits || [];
    const mysticMerit = merits.find(m => m.id === 'other__mystic_of_the_void');
    if (mysticMerit && mysticMerit.notes) {
      try {
        const ghostPowers = JSON.parse(mysticMerit.notes);
        if (Array.isArray(ghostPowers)) {
          ghostPowers.forEach(gp => known.add(superNorm(gp)));
        }
      } catch (e) {}
    }

    return known;
  }, [sheet.disciplinePowers, sheet.advantages?.merits]);

  function canLearnRitual(level) {
    const bsLevel = Number(sheet.disciplines?.['Blood Sorcery'] || 0);
    return level <= bsLevel;
  }
  function canLearnCeremony(level) {
    const oblLevel = Number(sheet.disciplines?.['Oblivion'] || 0);
    return level <= oblLevel;
  }

  async function buyRitual(rit, level, cost) {
    const nextSheet = JSON.parse(JSON.stringify(sheet));
    nextSheet.rituals = nextSheet.rituals || { blood_sorcery: [], oblivion: [] };
    nextSheet.rituals.blood_sorcery = nextSheet.rituals.blood_sorcery || [];
    if (knownRitualIds.has(rit.id)) return;
    nextSheet.rituals.blood_sorcery.push({ id: rit.id, name: rit.name, level });
    await spendXP({ type: 'ritual', target: rit.id, ritualLevel: level, patchSheet: nextSheet });
  }
  async function buyCeremony(cer, level, cost) {
    const nextSheet = JSON.parse(JSON.stringify(sheet));
    nextSheet.rituals = nextSheet.rituals || { blood_sorcery: [], oblivion: [] };
    nextSheet.rituals.oblivion = nextSheet.rituals.oblivion || [];
    if (knownRitualIds.has(cer.id)) return;
    nextSheet.rituals.oblivion.push({ id: cer.id, name: cer.name, level });
    await spendXP({ type: 'ceremony', target: cer.id, ritualLevel: level, patchSheet: nextSheet });
  }

  /* --- Flaw/Merit Rule Calculations --- */
  const meritsList = Array.isArray(sheet?.advantages?.merits) ? sheet.advantages.merits : [];
  const backgroundsList = Array.isArray(sheet?.backgrounds) ? sheet.backgrounds : [];
  const flawsList = Array.isArray(sheet?.advantages?.flaws) ? sheet.advantages.flaws : [];
  
  const displayMerits = [...meritsList, ...backgroundsList];

  const totalMeritDots = displayMerits.reduce((sum, m) => sum + Number(m.dots || 0), 0);
  const totalFlawDots = flawsList.reduce((sum, f) => sum + Number(f.dots || 0), 0);

  const requiredFlaws = Math.floor(totalMeritDots / 7) * 2;
  const flawDeficit = requiredFlaws - totalFlawDots;


  if (!ch) {
    return (
      <div className={styles.emptyWrap} style={{ '--tint': tint }}>
        {(err || msg) && (
          <div className={err ? styles.alertError : styles.alertOk}>
            {err || msg}
          </div>
        )}

        <div className={styles.loadingSwap}>
          <div className={styles.loadingPhase}>
            <div className={styles.spinner} aria-label="Loading" />
            <div className={styles.loadingText}>Loading character…</div>
          </div>
          {!adminNPCId && !loadPath && (
            <div className={styles.emptyPhase}>
              <h2 className={styles.cardHead}>No character found</h2>
              <p className={styles.muted}>Create your character to continue.</p>
              <button className={styles.cta} onClick={() => setShowSetup(true)}>
                Create Character
              </button>
            </div>
          )}
        </div>

        {!adminNPCId && !loadPath && showSetup && (
          <div className={styles.setupOverlay} role="dialog" aria-modal="true">
            <button
              className={styles.setupClose}
              aria-label="Close"
              onClick={() => setShowSetup(false)}
            >
              ×
            </button>
            <div className={styles.setupOverlayInner}>
              <CharacterSetup onDone={() => window.location.reload()} />
            </div>
          </div>
        )}
      </div>
    );
  }

  const inClanDisciplines = ALL_DISCIPLINE_NAMES.filter(n => disciplineKindFor(ch, n) === 'clan');
  const outOfClanDisciplines = ALL_DISCIPLINE_NAMES.filter(n => disciplineKindFor(ch, n) !== 'clan');

  const stamina = Number(sheet.attributes?.Stamina) || 1;
  let maxHealth = stamina + 3;
  const fortitudePowers = sheet.disciplinePowers?.Fortitude || [];
  if (Array.isArray(fortitudePowers) && fortitudePowers.some(p => String(p.name || p.id).toLowerCase().includes('resilience'))) {
     maxHealth += Number(sheet.disciplines?.Fortitude || 0);
  }
  const maxWillpower = (Number(sheet.attributes?.Composure) || 1) + (Number(sheet.attributes?.Resolve) || 1);

  return (
    <div className={styles.root} style={{ '--tint': tint }}>
      <div className={styles.wrap}>
        <header className={styles.head}>
          <div className={styles.headerTop}>
            <h2 className={styles.title}>
              {ch.name} <span className={styles.clanTag}>({ch.clan})</span>
            </h2>
            <div className={styles.xpBadge}>
              XP: <b>{xp}</b>
            </div>
          </div>

          {paths.totals && xpTotals && (
            <div className={styles.xpTotals}>
              <span>Granted: <b>{xpTotals.granted}</b></span>
              <span>Spent: <b>{xpTotals.spent}</b></span>
              <span>Remaining: <b>{xpTotals.remaining}</b></span>
            </div>
          )}

          <div className={styles.metaRow}>
            <span>Predator: <b>{sheet?.predator_type || sheet?.predatorType || '—'}</b></span>
            <span>Sire: <b>{sheet?.sire || '—'}</b></span>
            <span>Ambition: <b>{sheet?.ambition || '—'}</b></span>
            <span>Desire: <b>{sheet?.desire || '—'}</b></span>
          </div>

          {err && <div className={styles.alertError}>{err}</div>}
          {msg && <div className={styles.alertOk}>{msg}</div>}
        </header>

        {/* ===== Overview ===== */}
        <section className={styles.section}>
          <div className={styles.sectionTitleWrap}>
            <h3 className={styles.sectionTitle}>Character Overview</h3>
            <button className={styles.cta} onClick={() => shopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              Go to XP Shop
            </button>
          </div>

          <div className={`${styles.card} ${styles.sheetWide} ${styles.bleedEdge}`}>
            
            {sheet.allow_reset && (
              <div style={{ padding: '20px', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid #d97706', borderRadius: '8px', marginBottom: '25px', textAlign: 'center' }}>
                <h3 style={{ color: '#d97706', margin: '0 0 10px 0', fontSize: '1.5rem' }}>Re-Roll Authorized</h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '1rem', color: 'var(--text-color)', opacity: 0.9 }}>
                  An admin has granted you permission to rebuild your character. This will reset your sheet and XP, but preserve your chat history.
                </p>
                <button
                  className={styles.actionBtn}
                  style={{ background: '#d97706', color: '#fff', border: 'none', padding: '12px 24px', fontSize: '1.1rem', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
                  onClick={() => navigate('/make')}
                >
                  Start Re-Roll Wizard
                </button>
              </div>
            )}
            
            <div className={styles.rowForm} style={{ gap: 12, flexWrap: 'wrap' }}>
              <Pill label="Blood Potency" value={sheet?.blood_potency ?? 1} />
              {sheet.generation && <Pill label="Generation" value={sheet.generation} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', marginTop: '20px', boxSizing: 'border-box' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', boxSizing: 'border-box' }}>
                {/* Health */}
                <div style={{ boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                   <TrackerBlock label="Health" val={maxHealth} max={maxHealth} agg={tempHealth.aggravated} sup={tempHealth.superficial} />
                   {isAdmin && (
                     <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                         <div style={{ display: 'flex', alignItems: 'center' }}>
                             <span style={{ fontSize: '0.8rem', opacity: 0.7, marginRight: '5px' }}>Sup:</span>
                             <button className={styles.ghostBtn} style={{ padding: '2px 8px', minWidth: '30px' }} onClick={()=>updateTracker('health','superficial',-1)}>-</button>
                             <button className={styles.ghostBtn} style={{ padding: '2px 8px', minWidth: '30px', marginLeft: '4px' }} onClick={()=>updateTracker('health','superficial',1)}>+</button>
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center' }}>
                             <span style={{ fontSize: '0.8rem', opacity: 0.7, marginRight: '5px' }}>Agg:</span>
                             <button className={styles.ghostBtn} style={{ padding: '2px 8px', minWidth: '30px' }} onClick={()=>updateTracker('health','aggravated',-1)}>-</button>
                             <button className={styles.ghostBtn} style={{ padding: '2px 8px', minWidth: '30px', marginLeft: '4px' }} onClick={()=>updateTracker('health','aggravated',1)}>+</button>
                         </div>
                     </div>
                   )}
                </div>

                {/* Willpower */}
                <div style={{ boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                   <TrackerBlock label="Willpower" val={maxWillpower} max={maxWillpower} agg={tempWillpower.aggravated} sup={tempWillpower.superficial} />
                   {isAdmin && (
                     <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                         <div style={{ display: 'flex', alignItems: 'center' }}>
                             <span style={{ fontSize: '0.8rem', opacity: 0.7, marginRight: '5px' }}>Sup:</span>
                             <button className={styles.ghostBtn} style={{ padding: '2px 8px', minWidth: '30px' }} onClick={()=>updateTracker('willpower','superficial',-1)}>-</button>
                             <button className={styles.ghostBtn} style={{ padding: '2px 8px', minWidth: '30px', marginLeft: '4px' }} onClick={()=>updateTracker('willpower','superficial',1)}>+</button>
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center' }}>
                             <span style={{ fontSize: '0.8rem', opacity: 0.7, marginRight: '5px' }}>Agg:</span>
                             <button className={styles.ghostBtn} style={{ padding: '2px 8px', minWidth: '30px' }} onClick={()=>updateTracker('willpower','aggravated',-1)}>-</button>
                             <button className={styles.ghostBtn} style={{ padding: '2px 8px', minWidth: '30px', marginLeft: '4px' }} onClick={()=>updateTracker('willpower','aggravated',1)}>+</button>
                         </div>
                     </div>
                   )}
                </div>
              </div>

              {/* Row 2: Humanity */}
              <div style={{ boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
                 <TrackerBlock label="Humanity" val={tempHumanity} max={10} filled={tempHumanity} stains={tempStains} />
                 {isAdmin && (
                   <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                       <div style={{ display: 'flex', alignItems: 'center' }}>
                           <span style={{ fontSize: '0.8rem', opacity: 0.7, marginRight: '5px' }}>Hum:</span>
                           <button className={styles.ghostBtn} style={{ padding: '2px 8px', minWidth: '30px' }} onClick={()=>setTempHumanity(h=>Math.max(0, h-1))}>-</button>
                           <button className={styles.ghostBtn} style={{ padding: '2px 8px', minWidth: '30px', marginLeft: '4px' }} onClick={()=>setTempHumanity(h=>Math.min(10, h+1))}>+</button>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center' }}>
                           <span style={{ fontSize: '0.8rem', opacity: 0.7, marginRight: '5px' }}>Stains:</span>
                           <button className={styles.ghostBtn} style={{ padding: '2px 8px', minWidth: '30px' }} onClick={()=>setTempStains(s=>Math.max(0, s-1))}>-</button>
                           <button className={styles.ghostBtn} style={{ padding: '2px 8px', minWidth: '30px', marginLeft: '4px' }} onClick={()=>setTempStains(s=>Math.min(10, s+1))}>+</button>
                       </div>
                   </div>
                 )}
              </div>

              {/* Row 3: Hunger */}
              <div style={{ boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
                 <TrackerBlock label="Hunger" val={tempHunger} max={5} filled={tempHunger} />
                 {isAdmin && (
                   <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                       <div style={{ display: 'flex', alignItems: 'center' }}>
                           <span style={{ fontSize: '0.8rem', opacity: 0.7, marginRight: '5px' }}>Lvl:</span>
                           <button className={styles.ghostBtn} style={{ padding: '2px 8px', minWidth: '30px' }} onClick={()=>setTempHunger(h=>Math.max(0, h-1))}>-</button>
                           <button className={styles.ghostBtn} style={{ padding: '2px 8px', minWidth: '30px', marginLeft: '4px' }} onClick={()=>setTempHunger(h=>Math.min(5, h+1))}>+</button>
                       </div>
                   </div>
                 )}
              </div>

            </div>
            
            {saveStatus && isAdmin && <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-color)', opacity: 0.7, textAlign: 'center' }}>{saveStatus}</div>}

          </div>

          <Card>
            <div className={styles.cardHead}><b>Attributes</b></div>
            <div className={styles.grid3Col}>
              {ATTRS.map((col, i) => (
                <div key={i} className={styles.grid}>
                  {col.map(name => (
                    <DotRow key={name} label={name} value={Number(sheet?.attributes?.[name] ?? 1)} max={5} />
                  ))}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className={styles.cardHead}><b>Skills</b></div>
            <div className={styles.grid3Col}>
              {Object.entries(SKILLS).map(([group, list]) => (
                <div key={group} className={styles.grid}>
                  <div className={styles.subhead}>{group}</div>
                  {list.map(name => {
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

          <Card>
            <div className={styles.cardHead}><b>Disciplines</b></div>
            <div className={styles.grid}>
              {Object.keys(disciplinesMap).sort().map(name => (
                <DisciplineRow
                  key={name}
                  name={name}
                  level={Number(disciplinesMap[name] || 0)}
                  powers={sheet.disciplinePowers?.[name] || []}
                />
              ))}
            </div>
          </Card>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className={styles.cta} 
              onClick={() => generateVTMCharacterSheetPDF(ch)}
              title="Download a generated PDF of your character sheet"
            >
              Download PDF Sheet
            </button>
          </div>

        </section>

        {/* ===== XP SHOP ===== */}
        <section ref={shopRef} className={styles.section}>
          <div className={styles.sectionTitleWrap}>
            <h3 className={styles.sectionTitle}>XP Shop</h3>
            <span className={styles.muted}>You have <b>{xp}</b> XP</span>
          </div>

          {/* Blood Potency */}
          <Card>
            <div className={styles.cardHead}><b>Blood Potency</b></div>
            <div className={styles.grid}>
              {(() => {
                const current = Number(sheet.blood_potency ?? 1);
                const max = 10; 
                const next = Math.min(current + 1, max);
                const canRaise = current < max;
                const cost = XP_RULES.bloodPotency(next);
                const afford = xp >= cost;
                return (
                  <ShopRow
                    title={`Blood Potency (${current})`}
                    subtitle={canRaise ? `Raise to ${next}` : 'Max reached'}
                    cost={cost}
                    disabled={!canRaise || !afford}
                    hint={!canRaise ? `Max ${max}` : (!afford ? 'Not enough XP' : '')}
                    onBuy={async () => {
                      const nextSheet = JSON.parse(JSON.stringify(sheet));
                      nextSheet.blood_potency = next;
                      await spendXP({
                        type: 'blood_potency',
                        target: 'Blood Potency',
                        currentLevel: current,
                        newLevel: next,
                        patchSheet: nextSheet,
                      });
                    }}
                  />
                );
              })()}
            </div>
          </Card>

          {/* Attributes */}
          <Card>
            <div className={styles.cardHead}><b>Attributes</b></div>
            <div className={styles.grid3Col}>
              {ATTRS.flat().map(attr => {
                const current = Number(sheet.attributes?.[attr] ?? 1);
                const next = Math.min(current + 1, 5);
                const canRaise = current < 5;
                const cost = XP_RULES.attribute(next);
                const afford = xp >= cost;
                return (
                  <ShopRow
                    key={attr}
                    title={attr}
                    subtitle={`Raise to ${next}`}
                    cost={cost}
                    disabled={!canRaise || !afford}
                    hint={!canRaise ? 'Max 5' : (!afford ? 'Not enough XP' : '')}
                    onBuy={async () => {
                      const nextSheet = JSON.parse(JSON.stringify(sheet));
                      nextSheet.attributes = { ...(nextSheet.attributes || {}), [attr]: next };
                      await spendXP({
                        type: 'attribute',
                        target: attr,
                        currentLevel: current,
                        newLevel: next,
                        patchSheet: nextSheet,
                      });
                    }}
                  />
                );
              })}
            </div>
          </Card>

          {/* Skills */}
          <Card>
            <div className={styles.cardHead}><b>Skills</b></div>
            <div className={styles.grid3Col}>
              {Object.values(SKILLS).flat().map(skill => {
                const raw = sheet.skills?.[skill];
                const current = typeof raw === 'object' ? Number(raw.dots || 0) : Number(raw || 0);
                const next = Math.min(current + 1, 5);
                const canRaise = current < 5;
                const cost = XP_RULES.skill(next);
                const afford = xp >= cost;
                return (
                  <ShopRow
                    key={skill}
                    title={skill}
                    subtitle={`Raise to ${next}`}
                    cost={cost}
                    disabled={!canRaise || !afford}
                    hint={!canRaise ? 'Max 5' : (!afford ? 'Not enough XP' : '')}
                    onBuy={async () => {
                      const nextSheet = JSON.parse(JSON.stringify(sheet));
                      nextSheet.skills = nextSheet.skills || {};
                      const node = (nextSheet.skills[skill] && typeof nextSheet.skills[skill] === 'object')
                        ? { ...nextSheet.skills[skill] }
                        : { dots: Number(nextSheet.skills[skill] || 0), specialties: [] };
                      node.dots = next;
                      nextSheet.skills[skill] = node;
                      await spendXP({
                        type: 'skill',
                        target: skill,
                        currentLevel: current,
                        newLevel: next,
                        patchSheet: nextSheet,
                      });
                    }}
                  />
                );
              })}
            </div>
          </Card>

          {/* Specialties */}
          <Card>
            <div className={styles.cardHead}><b>Skill Specialties</b></div>
          <SpecialtyAdder
            xp={xp}
            onAdd={async (skillName, spec) => {
              const cost = XP_RULES.specialty(); 
              if (xp < cost) return;

              const nextSheet = JSON.parse(JSON.stringify(sheet));
              nextSheet.skills = nextSheet.skills || {};
              const node = (nextSheet.skills[skillName] && typeof nextSheet.skills[skillName] === 'object')
                ? { ...nextSheet.skills[skillName] }
                : { dots: Number(nextSheet.skills[skillName] || 0), specialties: [] };

              node.specialties = Array.isArray(node.specialties) ? node.specialties : [];
              if (!node.specialties.includes(spec)) node.specialties.push(spec);
              nextSheet.skills[skillName] = node;

              await spendXP({
                type: 'specialty',
                target: skillName,
                specialty: spec,
                patchSheet: nextSheet,
              });
            }}
          />
          </Card>

          {/* Disciplines */}
          <Card>
            <div className={styles.cardHead}><b>Disciplines</b></div>

            <div className={styles.subhead}>In-Clan</div>
            <div className={styles.grid}>
              {inClanDisciplines.length === 0 && (
                <div className={styles.muted}>No in-clan disciplines for {ch.clan}.</div>
              )}
              {inClanDisciplines.map(name => {
                const current = Number(sheet.disciplines?.[name] || 0);
                const next = Math.min(current + 1, 5);
                const canRaise = next > 0 && next <= 5;
                const cost = XP_RULES.disciplineClan(next);
                const afford = xp >= cost;
                const isKnown = current > 0;
                const title = isKnown ? `${name} (${current})` : name;
                return (
                  <ShopRow
                    key={name}
                    title={title}
                    subtitle={isKnown ? `Raise to ${next} • clan` : `Buy • clan`}
                    cost={cost}
                    leftIcon={iconPath(name)}
                    disabled={!canRaise || !afford}
                    hint={!canRaise ? 'Max 5' : (!afford ? 'Not enough XP' : '')}
                    onBuy={async () => {
                      const nextSheet = JSON.parse(JSON.stringify(sheet));
                      nextSheet.disciplines = { ...(nextSheet.disciplines || {}), [name]: next };
                      await spendXP({
                        type: 'discipline',
                        disciplineKind: 'clan',
                        target: name,
                        currentLevel: current,
                        newLevel: next,
                        patchSheet: nextSheet,
                      });
                    }}
                  />
                );
              })}
            </div>

            <Drawer title="Out-of-Clan" subtitle="check with your ST before spending XP" defaultOpen={false}>
              <div className={styles.grid}>
                {outOfClanDisciplines.map(name => {
                  const current = Number(sheet.disciplines?.[name] || 0);
                  const next = Math.min(current + 1, 5);
                  const canRaise = next > 0 && next <= 5;
                  const kind = disciplineKindFor(ch, name); 
                  const cost = estimateDisciplineCost(ch, name, current, next);
                  const afford = xp >= cost;
                  const isKnown = current > 0;
                  const title = isKnown ? `${name} (${current})` : name;
                  return (
                    <ShopRow
                      key={name}
                      title={title}
                      subtitle={isKnown ? `Raise to ${next} • ${kind}` : `Buy • ${kind}`}
                      cost={cost}
                      leftIcon={iconPath(name)}
                      disabled={!canRaise || !afford}
                      hint={!canRaise ? 'Max 5' : (!afford ? 'Not enough XP' : '')}
                      onBuy={async () => {
                        const nextSheet = JSON.parse(JSON.stringify(sheet));
                        nextSheet.disciplines = { ...(nextSheet.disciplines || {}), [name]: next };
                        await spendXP({
                          type: 'discipline',
                          disciplineKind: kind === 'other' ? 'other' : 'caitiff',
                          target: name,
                          currentLevel: current,
                          newLevel: next,
                          patchSheet: nextSheet,
                        });
                      }}
                    />
                  );
                })}
              </div>
            </Drawer>
          </Card>

          {/* Merits (Advantages) */}
          <Card>
            <div className={styles.cardHead} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>Merits & Backgrounds</b>
              <span className={styles.muted} style={{ fontSize: '0.85rem' }}>
                Total Dots: <b>{totalMeritDots}</b>
              </span>
            </div>

            {flawDeficit > 0 && (
              <div className={styles.alertWarning} style={{ marginBottom: 15 }}>
                <b>Rule Requirement:</b> You have {totalMeritDots} points in Merits. For every 7 points, you must take 2 points of Flaws. 
                You currently need <b>{flawDeficit} more dot{flawDeficit > 1 ? 's' : ''}</b> in Flaws.
              </div>
            )}

            <MeritAdder
              xp={xp}
              clan={ch.clan}
              knownPowerNamesAndIds={knownPowerNamesAndIds}
              existing={displayMerits}
              onAdd={async (merit, targetDots, options = {}) => {
                const separate = !!options.separate; 
                const nextSheet = JSON.parse(JSON.stringify(sheet));

                nextSheet.advantages = nextSheet.advantages || { merits: [], flaws: [] };
                nextSheet.advantages.merits = Array.isArray(nextSheet.advantages.merits) ? nextSheet.advantages.merits : [];
                nextSheet.backgrounds = Array.isArray(nextSheet.backgrounds) ? nextSheet.backgrounds : [];

                const meritsArr = nextSheet.advantages.merits;
                const bgsArr    = nextSheet.backgrounds;

                const sameMerits = meritsArr.filter(m => m.id === merit.id);
                const sameBgs    = bgsArr.filter(b => b.id === merit.id);
                const currentDots = [...sameMerits, ...sameBgs].reduce(
                  (max, e) => Math.max(max, Number(e.dots || 0)), 0
                );

                const preferBackgrounds = sameBgs.length > 0;

                if (separate) {
                  const cost = XP_RULES.advantageDot(Number(targetDots) || 0);
                  if (xp < cost) return;

                  const instance = sameMerits.length + sameBgs.length + 1; 
                  const newEntry = {
                    id: merit.id,
                    name: merit.name,
                    dots: Number(targetDots),
                    from: 'xp_shop',
                    instance,
                  };
                  if (options.notes) newEntry.notes = JSON.stringify(options.notes);

                  if (preferBackgrounds) bgsArr.push(newEntry);
                  else meritsArr.push(newEntry);

                  await spendXP({
                    type: 'advantage',
                    target: merit.id,
                    dots: Number(targetDots),
                    patchSheet: nextSheet,
                  });
                  return;
                }

                const delta = Math.max(0, Number(targetDots) - currentDots);
                const cost = XP_RULES.advantageDot(delta);
                if (delta <= 0 || xp < cost) return;

                let upgraded = false;

                const tryUpgradeIn = (arr) => {
                  for (let i = 0; i < arr.length; i++) {
                    const entry = arr[i];
                    if (entry.id === merit.id && Number(entry.dots || 0) === currentDots) {
                      arr[i] = { ...entry, dots: Number(targetDots) };
                      if (options.notes) arr[i].notes = JSON.stringify(options.notes);
                      return true;
                    }
                  }
                  return false;
                };

                upgraded = preferBackgrounds ? tryUpgradeIn(bgsArr) : tryUpgradeIn(meritsArr);
                if (!upgraded) {
                  upgraded = preferBackgrounds ? tryUpgradeIn(meritsArr) : tryUpgradeIn(bgsArr);
                }

                if (!upgraded) {
                  const newMerit = {
                    id: merit.id,
                    name: merit.name,
                    dots: Number(targetDots),
                    from: 'xp_shop',
                    instance: sameMerits.length + sameBgs.length + 1,
                  };
                  if (options.notes) newMerit.notes = JSON.stringify(options.notes);
                  meritsArr.push(newMerit);
                }

                await spendXP({
                  type: 'advantage',
                  target: merit.id,
                  dots: delta,           
                  patchSheet: nextSheet, 
                });
              }}
            />
            {displayMerits.length > 0 && (
              <div className={styles.grid} style={{ marginTop: 15 }}>
                <div className={styles.subhead}>Owned Merits & Backgrounds</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {displayMerits.map((m, i) => {
                    const details = allMeritsFlat.find(x => x.id === m.id);
                    const desc = details?.description || 'No description available.';
                    
                    let notesStr = m.notes;
                    try {
                      const parsed = JSON.parse(m.notes);
                      if (Array.isArray(parsed)) notesStr = parsed.join(', ');
                    } catch(e) {}

                    return (
                      <Drawer 
                        key={`${m.id || m.name}-${i}`} 
                        title={<span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span>{m.name}</span> <span style={{ color: 'var(--text-color)', opacity: 0.7 }}>{glyph(m.dots)}</span></span>}
                        subtitle={details?.category || ''}
                      >
                        <div style={{ padding: '4px 0', fontSize: '0.95rem', opacity: 0.9 }}>
                          {desc}
                        </div>
                        {notesStr && (
                          <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, fontSize: '0.85rem' }}>
                            <b>Notes/Selections:</b> {notesStr}
                          </div>
                        )}
                      </Drawer>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Flaws */}
          <Card>
            <div className={styles.cardHead} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <b>Flaws</b>
               <span className={styles.muted} style={{ fontSize: '0.85rem' }}>
                 Total Dots: <b>{totalFlawDots}</b>
               </span>
            </div>

            <FlawAdder 
               existing={flawsList}
               onAdd={async (flaw, targetDots) => {
                 const nextSheet = JSON.parse(JSON.stringify(sheet));
                 nextSheet.advantages = nextSheet.advantages || { merits: [], flaws: [] };
                 nextSheet.advantages.flaws = Array.isArray(nextSheet.advantages.flaws) ? nextSheet.advantages.flaws : [];
                 
                 const newEntry = {
                   id: flaw.id,
                   name: flaw.name,
                   dots: Number(targetDots),
                   from: 'xp_shop'
                 };
                 
                 nextSheet.advantages.flaws.push(newEntry);
                 
                 await spendXP({
                   type: 'flaw',
                   target: flaw.id,
                   dots: 0,
                   patchSheet: nextSheet
                 });
               }}
            />

            {flawsList.length > 0 && (
              <div className={styles.grid} style={{ marginTop: 20 }}>
                <div className={styles.subhead}>Known Flaws</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {flawsList.map((f, i) => {
                    const details = allFlawsFlat.find(x => x.id === f.id);
                    const desc = details?.description || 'No description available.';
                    
                    return (
                      <Drawer 
                        key={`${f.id || f.name}-${i}`} 
                        title={<span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span>{f.name}</span> <span style={{ color: '#b40f1f' }}>{glyph(f.dots)}</span></span>}
                        subtitle={details?.category || ''}
                      >
                        <div style={{ padding: '4px 0', fontSize: '0.95rem', opacity: 0.9 }}>
                          {desc}
                        </div>
                        {f.notes && (
                          <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,0,0,0.05)', borderRadius: 4, fontSize: '0.85rem' }}>
                            <b>Notes:</b> {f.notes}
                          </div>
                        )}
                      </Drawer>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>


          {/* Rituals & Ceremonies */}
          <Card>
            <Drawer title="Blood Sorcery Rituals & Oblivion Ceremonies" defaultOpen={false}>
              <div className={styles.grid} style={{ gap: 12 }}>
                {/* Blood Sorcery */}
                <Drawer title="Blood Sorcery Rituals" defaultOpen={false}>
                  <div className={styles.grid} style={{ gap: 12 }}>
                    {Object.entries(RITUALS?.blood_sorcery?.levels || {}).map(([lvlStr, list]) => {
                      const level = Number(lvlStr);
                      return list.map(rit => {
                        const owned = knownRitualIds.has(rit.id);
                        const allowed = canLearnRitual(level);
                        const cost = XP_RULES.ritual(level);
                        const afford = xp >= cost;
                        const { unmet } = ritualPrereqStatus(rit, knownPowerNamesAndIds);
                        return (
                          <RitualRow
                            key={rit.id}
                            item={rit}
                            level={level}
                            cost={cost}
                            owned={owned}
                            allowed={allowed}
                            afford={afford}
                            prereqUnmet={unmet}
                            onBuy={() => buyRitual(rit, level, cost)}
                          />
                        );
                      });
                    })}
                  </div>
                </Drawer>

                {/* Oblivion */}
                <Drawer title="Oblivion Ceremonies" defaultOpen={false}>
                  <div className={styles.grid} style={{ gap: 12 }}>
                    {Object.entries((RITUALS.oblivion?.levels || {})).map(([lvlStr, list]) => {
                      const level = Number(lvlStr);
                      return list.map(cer => {
                        const owned = knownRitualIds.has(cer.id);
                        const allowed = canLearnCeremony(level);
                        const cost = XP_RULES.ceremony(level);
                        const afford = xp >= cost;
                        const { unmet } = ritualPrereqStatus(cer, knownPowerNamesAndIds);
                        return (
                          <RitualRow
                            key={cer.id}
                            item={cer}
                            level={level}
                            cost={cost}
                            owned={owned}
                            allowed={allowed}
                            afford={afford}
                            prereqUnmet={unmet}
                            onBuy={() => buyCeremony(cer, level, cost)}
                          />
                        );
                      });
                    })}
                  </div>
                </Drawer>
              </div>
            </Drawer>
          </Card>

        </section>
      </div>

      {/* ----- Discipline Power Modal ----- */}
      {modalOpen && modalCfg && (
        <DisciplinePowerModal
          cfg={modalCfg}
          onClose={() => { setModalOpen(false); setModalCfg(null); }}
          onConfirm={(sel) => confirmDisciplinePurchase({ ...modalCfg, ...sel })}
        />
      )}
    </div>
  );
}

/* ===========================
   Small presentational pieces
   =========================== */
function Card({ children }) {
  return <div className={styles.card}>{children}</div>;
}

function Pill({ label, value }) {
  return (
    <span className={styles.pill}>
      <span className={styles.dim}>{label}:</span> <b>{value}</b>
    </span>
  );
}

function DotRow({ label, value = 0, max = 5, rightExtra = null }) {
  return (
    <div className={styles.dotRow}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{label}</span>
        {rightExtra}
      </div>
      <div className={styles.dots}>
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={`${styles.dot} ${i < value ? styles.dotOn : ''}`} />
        ))}
      </div>
    </div>
  );
}

function renderSpecs(specs = []) {
  if (!specs.length) return null;
  return <span className={styles.specsText}>({specs.join(', ')})</span>;
}

function DisciplineRow({ name, level = 0, powers = [] }) {
  const icon = iconPath(name);
  const byLevel = new Map((powers || []).map(p => [Number(p.level), { id: p.id, name: p.name }]));
  const maxPicked = Math.max(0, ...Array.from(byLevel.keys()));
  const displayMax = Math.min(5, Math.max(level || 0, maxPicked || 0) || 0) || level || 0 || 0;

  return (
    <div className={styles.disciplineRow}>
      <div className={styles.disciplineHead}>
        <img
          src={icon}
          alt=""
          width={28}
          height={28}
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/img/disciplines/Oblivion-rombo.png'; }}
          className={styles.disciplineIcon}
        />
        <div className={styles.disciplineTitleBlock}>
          <b>{name}</b>
          <div className={styles.dots}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`${styles.dot} ${i < level ? styles.dotOn : ''}`} />
            ))}
          </div>
        </div>
      </div>

      <ul className={styles.powerList}>
        {Array.from({ length: Math.max(displayMax, level || 0) || 0 }).map((_, i) => {
          const L = i + 1;
          const picked = byLevel.get(L);
          const unlocked = L <= level;

          let cls = styles.powerPill;
          let label = picked ? picked.name : (unlocked ? 'Pick a power' : 'Locked');
          if (!unlocked) cls += ` ${styles.powerPillLocked}`;
          else if (!picked) cls += ` ${styles.powerPillMissing}`;

          return (
            <li key={L} className={cls} title={picked ? `Level ${L}` : undefined}>
              <span className={styles.levelBadge}>L{L}</span>
              <span className={styles.powerName}>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ConfirmModal({ title = 'Confirm Purchase', children, onConfirm, onCancel, busy = false }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <div className={styles.card} style={{ maxWidth: 520, width: 'min(92vw,520px)' }}>
        <div className={styles.cardHead}><b>{title}</b></div>
        <div className={styles.grid} style={{ gap: 12 }}>{children}</div>
        <div className={styles.rowForm} style={{ justifyContent: 'flex-end' }}>
          <button className={styles.ghostBtn} onClick={onCancel} disabled={busy}>No</button>
          <button className={styles.cta} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : 'Yes'}</button>
        </div>
      </div>
    </div>
  );
}

function ShopRow({ title, subtitle, cost, disabled, hint = '', onBuy, leftIcon }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);

  async function handleConfirm() {
    setWorking(true);
    try {
      await onBuy?.();
      setConfirmOpen(false);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className={styles.rowForm} style={{ justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
        {leftIcon && <img src={leftIcon} alt="" width={26} height={26} style={{ borderRadius: 6, opacity: .9 }} />}
        <div style={{ display: 'grid', minWidth: 0 }}>
          <div style={{ fontWeight: 600, opacity: (disabled && !confirmOpen) ? 0.6 : 1 }}>{title}</div>
          <div className={styles.muted} style={{ fontSize: 13 }}>
            {subtitle}{hint ? ` • ${hint}` : ''}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className={styles.costText}>Cost: <b>{cost}</b></span>
        <button
          className={styles.cta}
          disabled={disabled || working}
          onClick={() => setConfirmOpen(true)}
          aria-haspopup="dialog"
        >
          Buy
        </button>
      </div>

      {confirmOpen && (
        <ConfirmModal
          title="Confirm Purchase"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
          busy={working}
        >
          <p>
            Are you sure you want to buy <b>{title}</b>
            {subtitle ? <> — {subtitle}</> : null} for <b>{cost}</b> XP?
          </p>
        </ConfirmModal>
      )}
    </div>
  );
}

/* ---------- Ritual/Ceremony row with prereq/recall info ---------- */
function RitualRow({ item, level, cost, owned, allowed, afford, prereqUnmet = [], onBuy }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);

  const disabled = owned || !allowed || !afford || prereqUnmet.length > 0;

  async function handleConfirm() {
    setWorking(true);
    try {
      await onBuy?.();
      setConfirmOpen(false);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className={styles.paneCard} style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontWeight: 700 }}>{item.name}</div>
          <div className={styles.muted} style={{ fontSize: 13 }}>
            Level {level}{item.source ? ` • Source: ${item.source}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {owned && <span className={`${styles.powerBadgeMuted} badge-owned`}>Known</span>}
          {!allowed && <span className={`${styles.powerBadgeMuted} badge-warn`}>Requires Discipline {level}</span>}
          {prereqUnmet.length > 0 && (
            <span className={`${styles.powerBadgeMuted} badge-warn`}>Needs: {prereqUnmet.join(', ')}</span>
          )}
          {!afford && <span className={`${styles.powerBadgeMuted} badge-warn`}>Not enough XP</span>}
        </div>
      </div>

      <div className={styles.detailTags} style={{ marginTop: 8 }}>
        <span className={styles.powerTag}><b>Level:</b> {level}</span>
        <span className={styles.powerTag}><b>Cost:</b> {item.cost || '—'}</span>
        {item.dice_pool && <span className={styles.powerTag}><b>Dice Pool:</b> {item.dice_pool}</span>}
        {item.difficulty && <span className={styles.powerTag}><b>Difficulty:</b> {item.difficulty}</span>}
        {item.prereq && <span className={styles.powerTag}><b>Prereq:</b> {item.prereq}</span>}
      </div>

      {item.effect && (
        <div className={styles.powerNotes} style={{ marginTop: 8 }}>
          <b>Effect:</b> {item.effect}
        </div>
      )}
      {item.notes && (
        <div className={styles.powerNotes} style={{ marginTop: 8 }}>
          {item.notes}
        </div>
      )}

      <div className={styles.modalFooter} style={{ borderTop: 'none', padding: 0, marginTop: 10 }}>
        <div className={styles.muted} style={{ marginRight: 'auto' }}>
          XP Cost: <b>{cost}</b>
        </div>
        <button
          className={styles.cta}
          disabled={disabled || working}
          onClick={() => setConfirmOpen(true)}
        >
          Buy
        </button>
      </div>

      {confirmOpen && (
        <ConfirmModal
          title="Confirm Purchase"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
          busy={working}
        >
          <p>Buy <b>{item.name}</b> (Level {level}) for <b>{cost}</b> XP?</p>
          {prereqUnmet.length > 0 && (
            <p className={styles.muted} style={{ marginTop: 6 }}>
              Needs: {prereqUnmet.join(', ')}
            </p>
          )}
        </ConfirmModal>
      )}
    </div>
  );
}

/* ---------- Ritual/Ceremony prereq helper ---------- */
const _norm = (v) => String(v ?? '').trim().toLowerCase();

/* ---------- Ritual/Ceremony prereq helper ---------- */
function ritualPrereqStatus(rit, knownPowerSet) {
  const prereq = rit?.prereq;
  if (!prereq || prereq === '—') return { unmet: [] };

  // Use the exact same aggressive normalizer here to ensure a perfect match
  const superNorm = (v) => String(v ?? '').toLowerCase().replace(/\(errata\)/g, '').replace(/[\s_\-]+/g, '');
  const unmetList = [];

  if (prereq.includes(' or ')) {
    const parts = prereq.split(/\s+or\s+/i);
    const met = parts.some(part => knownPowerSet.has(superNorm(part)));
    if (!met) {
      unmetList.push(prereq);
    }
  } else if (prereq.includes(';')) {
    const parts = prereq.split(';');
    for (const part of parts) {
      const p = part.trim();
      if (p && !knownPowerSet.has(superNorm(p))) {
        unmetList.push(p.replace(/\s+\(Errata\)$/i, '')); 
      }
    }
  } else {
    const p = prereq.trim();
    if (p && !knownPowerSet.has(superNorm(p))) {
      unmetList.push(p);
    }
  }
  
  return { unmet: unmetList };
}


/* ===== Discipline power picker modal ===== */
function DisciplinePowerModal({ cfg, onClose, onConfirm }) {
  const { name, next, assignOnly, ownedPowerIds = [], ownedPowerNames = [], ownedPowers = [], disciplineDots = {} } = cfg;

  const fullPool = useMemo(() => {
    const out = [];
    const levels = DISCIPLINES?.[name]?.levels || {};
    const cap = Number(next || 0);
    for (let lvl = 1; lvl <= cap; lvl++) {
      for (const p of (levels[lvl] || [])) out.push({ ...p, __level: lvl });
    }
    out.sort((a, b) => (a.__level - b.__level) || String(a.name).localeCompare(String(b.name)));
    return out;
  }, [name, next]);

  const norm = (v) => String(v ?? '').trim().toLowerCase();
  const normDisc = useCallback((s) => norm(s).replace(/\s+/g, ' '), []);

  const ownedCanon = useMemo(() => {
    const ids = ownedPowerIds.map(norm);
    const names = ownedPowerNames.map(norm);
    const objs = ownedPowers.flatMap(p => [norm(p?.id), norm(p?.name), norm(p?.slug), norm(p?.key), norm(p?.code), norm(p?.power_id)]);
    return new Set([...ids, ...names, ...objs].filter(Boolean));
  }, [ownedPowerIds, ownedPowerNames, ownedPowers]);

  const dotsByDisc = useMemo(() => {
    const m = new Map();
    Object.entries(disciplineDots || {}).forEach(([k, v]) => m.set(normDisc(k), Number(v) || 0));
    return m;
  }, [disciplineDots, normDisc]);

  const countDots = useCallback((s = '') => {
    const bullets = (s.match(/[•●○]/g) || []).length;
    const matchResult = s.match(/\b(\d+)\b/);
    const digits = matchResult ? parseInt(matchResult[1], 10) : 0;
    return Math.max(bullets, digits || 1);
  }, []);

  const parseAmalgam = useCallback((s = '') =>
    s.split(/(?:,|&|\+|and)/i)
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const nameMatch = part.match(/^[^\d•●○]+/);
        const discName = (nameMatch ? nameMatch[0] : part).trim().replace(/[:.-]+$/, '');
        return { disc: discName, dots: countDots(part) };
      })
  , [countDots]);

  const annotated = useMemo(() => {
    return fullPool.map(p => {
      const candidates = [
        norm(p?.id), norm(p?.name), norm(p?.slug), norm(p?.key), norm(p?.code), norm(p?.power_id)
      ].filter(Boolean);
      const owned = candidates.some(c => ownedCanon.has(c));

      const unmet = [];
      if (p.amalgam) {
        const reqs = parseAmalgam(String(p.amalgam));
        for (const req of reqs) {
          const have = dotsByDisc.get(normDisc(req.disc)) || 0;
          if (have < (req.dots || 1)) {
            unmet.push(`${req.disc} ${'•'.repeat(req.dots || 1)}`);
          }
        }
      }

      return {
        ...p,
        __flags: { owned, unmet },
        __available: !owned && unmet.length === 0,
      };
    });
  }, [fullPool, ownedCanon, dotsByDisc, normDisc, parseAmalgam]);

  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return annotated;
    return annotated.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q) ||
      p.source?.toLowerCase().includes(q) ||
      String(p.__level).includes(q)
    );
  }, [annotated, query]);

  const firstAvailable = useMemo(() => filtered.find(p => p.__available)?.id || '', [filtered]);
  const [selectedId, setSelectedId] = useState(firstAvailable);
  useEffect(() => {
    if (!filtered.length) return setSelectedId('');
    if (!filtered.some(p => p.id === selectedId)) {
      setSelectedId(filtered.find(p => p.__available)?.id || filtered[0].id);
    }
  }, [filtered, selectedId]);

  const sel = useMemo(
    () => filtered.find(p => p.id === selectedId) || annotated.find(p => p.id === selectedId),
    [filtered, annotated, selectedId]
  );

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const confirm = async () => {
    if (!sel || !sel.__available) return;
    setSaving(true);
    setSaveErr('');
    try {
      const maybe = onConfirm?.({
        selectedPowerId: sel.id,
        selectedPowerName: sel.name,
        selectedPowerLevel: sel.__level
      });
      if (maybe && typeof maybe.then === 'function') await maybe;
      onClose?.();
    } catch (e) {
      setSaveErr(e?.response?.data?.error || e?.message || 'Failed to assign power.');
    } finally {
      setSaving(false);
    }
  };

  const rows = [];
  let lastLevel = null;
  for (const p of filtered) {
    if (p.__level !== lastLevel) {
      rows.push({ __type: 'hdr', level: p.__level, key: `hdr-${p.__level}` });
      lastLevel = p.__level;
    }
    rows.push({ __type: 'item', power: p, key: p.id });
  }

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="powerModalTitle"
      onClick={(e) => { if (!saving && e.target === e.currentTarget) onClose?.(); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !saving) onClose?.();
        if (e.key === 'Enter' && !saving && sel?.__available) confirm();
      }}
    >
      <div className={`${styles.card} ${styles.modalCard}`} style={{ width:'min(92vw, 800px)' }}>
        <div className={styles.modalHeader}>
          <div>
            <h3 id="powerModalTitle" className={styles.modalTitle}>
              {assignOnly ? 'Select Missing Power' : 'Choose New Power'}
            </h3>
            <div className={styles.muted}>
              Discipline: <b>{name}</b> • Level <b>{next}</b>
            </div>
          </div>
        </div>

        <div className={styles.muted} role="note" style={{ padding: '8px 16px 0' }}>
          Each dot in a discipline grants <b>one power</b> of its level or below. Choose any <b>level ≤ {next}</b> you don’t already have.
        </div>

        {!annotated.length ? (
          <div className={styles.alertWarning} style={{ margin: '10px 16px 0' }}>
            No power data found up to level <b>{next}</b> for <b>{name}</b>. You can still buy the dot; pick later.
          </div>
        ) : (
          <div className={styles.modalGrid}>
            <div className={styles.paneCard}>
              <aside className={styles.powerListPane}>
                <input
                  className={styles.input}
                  placeholder="Search powers… (name, notes, source, level)"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  disabled={saving}
                />
                <div className={styles.powerList} role="listbox" aria-label="Available powers">
                  {rows.map(row => {
                    if (row.__type === 'hdr') {
                      return <div key={row.key} className={styles.levelHeader}>Level {row.level}</div>;
                    }
                    const p = row.power;
                    const active = p.id === selectedId;
                    const disabled = !p.__available;
                    const reason = p.__flags.owned
                      ? 'Owned'
                      : (p.__flags.unmet.length ? `Conditions not met: ${p.__flags.unmet.join(', ')}` : '');

                    return (
                      <button
                        key={row.key}
                        className={
                          `${styles.powerItem} ` +
                          `${active ? styles.powerItemActive : ''} ` +
                          `${disabled ? styles.powerItemDisabled : ''}`
                        }
                        onClick={() => setSelectedId(p.id)}
                        onDoubleClick={() => !saving && p.__available && confirm()}
                        role="option"
                        aria-selected={active}
                        title={p.name}
                        aria-disabled={disabled || undefined}
                        disabled={saving}
                      >
                        <div className={styles.powerItemTitle}>
                          {p.name}
                          {!p.__available && (
                            <span className={`${styles.powerBadgeMuted} ${p.__flags.owned ? 'badge-owned' : 'badge-warn'}`}>
                              {reason}
                            </span>
                          )}
                        </div>
                        <div className={styles.powerItemMeta}>
                          <span className={styles.powerTag}><b>Level:</b> {p.__level}</span>
                          {p.cost && <span className={styles.powerTag}><b>Cost:</b> {p.cost}</span>}
                          {p.duration && <span className={styles.powerTag}><b>Duration:</b> {p.duration}</span>}
                          {p.dice_pool && <span className={styles.powerTag}><b>Dice:</b> {p.dice_pool}</span>}
                        </div>
                      </button>
                    );
                  })}
                  {!rows.length && <div className={styles.emptyNote}>No powers match “{query}”.</div>}
                </div>
              </aside>
            </div>

        <div className={styles.paneCard}>
          <section className={styles.powerDetailPane}>
            {!sel ? (
              <div className={styles.emptyNote}>Select a power on the left to see details.</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{sel.name}</div>
                    <div className={styles.muted} style={{ fontSize: 13 }}>
                      Level {sel.__level}{sel.source ? ` • Source: ${sel.source}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {sel.__flags?.owned && (
                      <span className={`${styles.powerBadgeMuted} badge-owned`}>Owned</span>
                    )}
                    {Array.isArray(sel.__flags?.unmet) && sel.__flags.unmet.length > 0 && (
                      <span className={`${styles.powerBadgeMuted} badge-warn`}>
                        Needs: {sel.__flags.unmet.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.detailTags} style={{ marginTop: 10 }}>
                  {sel.cost && (
                    <span className={styles.powerTag}><b>Cost:</b> {sel.cost}</span>
                  )}
                  {sel.duration && (
                    <span className={styles.powerTag}><b>Duration:</b> {sel.duration}</span>
                  )}
                  {sel.dice_pool && (
                    <span className={styles.powerTag}><b>Dice Pool:</b> {sel.dice_pool}</span>
                  )}
                  {sel.opposing_pool && (
                    <span className={styles.powerTag}><b>Opposing Pool:</b> {sel.opposing_pool}</span>
                  )}
                  {sel.prerequisite && (
                    <span className={styles.powerTag}><b>Prerequisite:</b> {sel.prerequisite}</span>
                  )}
                  {sel.amalgam && (
                    <span className={styles.powerTag}><b>Amalgam:</b> {sel.amalgam}</span>
                  )}
                </div>

                {sel.notes && (
                  <div className={styles.powerNotes} style={{ marginTop: 10 }}>
                    <b>Notes:</b> {sel.notes}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

          </div>
        )}

        <div className={styles.modalFooter}>
          {saveErr && <div className={styles.alert} style={{ marginRight: 'auto' }}>{saveErr}</div>}
          <button
            className={styles.cta}
            onClick={confirm}
            disabled={saving || !sel || !sel.__available}
          >
            {saving ? 'Saving…' : 'Select Power'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Specialty adder ---------- */
function SpecialtyAdder({ xp, onAdd }) {
  const [skill, setSkill] = useState('Academics');
  const [spec, setSpec] = useState('');
  const cost = 3;
  const afford = xp >= cost;

  return (
    <div className={styles.rowForm}>
      <select
        className={styles.input}
        value={skill}
        onChange={e => setSkill(e.target.value)}
      >
        {Object.values(SKILLS).flat().map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      <input
        className={styles.input}
        placeholder="e.g., Technology (Firmware)"
        value={spec}
        onChange={e => setSpec(e.target.value)}
      />

      <span className={styles.costText}>Cost: <b>{cost}</b></span>

      <button
        className={styles.cta}
        disabled={!afford || !spec.trim()}
        onClick={() => onAdd(skill, spec.trim())}
      >
        Add Specialty
      </button>
    </div>
  );
}

/* ---------- Merit adder (XP Shop) ---------- */
function MeritAdder({ xp, clan, knownPowerNamesAndIds, existing = [], onAdd }) {
  const all = useMemo(() => allSelectableMerits(), []);
  const [q, setQ] = useState('');
  const [addSeparate, setAddSeparate] = useState(false); 
  const [selId, setSelId] = useState(all[0]?.id || '');
  const sel = useMemo(() => all.find(m => m.id === selId) || null, [all, selId]);

  const [mysticSelections, setMysticSelections] = useState([]);
  
  useEffect(() => { setMysticSelections([]); }, [selId]);

  const isMystic = sel?.id === 'other__mystic_of_the_void';
  const maxMystic = ['Hecata', 'Lasombra'].includes(clan) ? 3 : 1;

  const availableOblivion = useMemo(() => {
    const out = [];
    if (!isMystic || typeof DISCIPLINES === 'undefined' || !DISCIPLINES['Oblivion']) return out;
    Object.entries(DISCIPLINES['Oblivion'].levels || {}).forEach(([lvlStr, list]) => {
      const level = Number(lvlStr);
      (list || []).forEach(p => {
        const normId = String(p.id ?? '').toLowerCase();
        if (!knownPowerNamesAndIds.has(normId)) {
          out.push({ ...p, level });
        }
      });
    });
    return out;
  }, [isMystic, knownPowerNamesAndIds]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return all;
    return all.filter(m =>
      m.name.toLowerCase().includes(qq) ||
      (m.category || '').toLowerCase().includes(qq)
    );
  }, [q, all]);

  const groupedOptions = useMemo(() => {
    return filtered.reduce((acc, m) => {
      acc[m.category || 'General'] = acc[m.category || 'General'] || [];
      acc[m.category || 'General'].push(m);
      return acc;
    }, {});
  }, [filtered]);

  const dotsOptions = sel?.allowed || [];
  const [dots, setDots] = useState(dotsOptions[0] || 1);

  const idOrName = (sel?.id || sel?.name || '').toLowerCase();
  const allowMulti = /^(haven|retainer|retainers)$/.test(idOrName);

  const currentOwnedForSel = useMemo(() => {
    if (!sel) return 0;
    return existing
      .filter(m => m.id === sel.id)
      .reduce((max, m) => Math.max(max, Number(m.dots || 0)), 0);
  }, [sel, existing]);

  useEffect(() => {
    const allowed = sel?.allowed || [1];
    const nextAllowed = allowed.find(n => n > currentOwnedForSel) ?? allowed[allowed.length - 1];
    setDots(nextAllowed || 1);
  }, [selId, existing, sel, currentOwnedForSel]); 

  const delta = Math.max(0, Number(dots || 0) - currentOwnedForSel);
  const cost = addSeparate
    ? XP_RULES.advantageDot(Number(dots || 0)) 
    : XP_RULES.advantageDot(delta);            
  const afford = xp >= cost;
  const blocked = !sel || (addSeparate ? Number(dots || 0) <= 0 : delta <= 0) || !afford || (isMystic && mysticSelections.length === 0);

  return (
    <div className={styles.grid} style={{ gap: 12 }}>
      <div className={styles.rowForm}>
        <input
          className={styles.input}
          placeholder="Search merits… (name or category)"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ flex: 1 }}
        />
        <span className={styles.muted}>Cost: <b>{cost}</b> XP</span>
      </div>

      <div className={styles.rowForm} style={{ flexWrap: 'wrap' }}>
        <select
          className={styles.input}
          value={selId}
          onChange={e => setSelId(e.target.value)}
          style={{ flex: 2, minWidth: 220 }}
        >
          {Object.entries(groupedOptions).map(([cat, list]) => (
            <optgroup key={cat} label={cat}>
              {list.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.dotsSpec})
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <select
          className={styles.input}
          value={dots}
          onChange={e => setDots(Number(e.target.value))}
          style={{ width: 120 }}
        >
          {dotsOptions.map(n => <option key={n} value={n}>{glyph(n)} ({n})</option>)}
        </select>

        <button
          className={styles.cta}
          disabled={blocked}
          onClick={() => onAdd(sel, dots, { separate: addSeparate, notes: isMystic ? mysticSelections : undefined })}
          title={
            addSeparate
              ? (Number(dots || 0) <= 0 ? 'Pick a dot rating' : '')
              : (delta <= 0 ? 'You already have this rating (or higher)' : '')
          }
        >
          {addSeparate
            ? `Add another (${dots} dot${Number(dots) === 1 ? '' : 's'})`
            : (currentOwnedForSel > 0
                ? `Upgrade to ${dots} dot${Number(dots) === 1 ? '' : 's'}`
                : `Add ${dots} dot${Number(dots) === 1 ? '' : 's'}`)}
        </button>
        
        {allowMulti && sel && (
          <label className={styles.checkboxRow} style={{ display:'flex', gap:8, alignItems:'center', marginTop:8 }}>
            <input
              type="checkbox"
              checked={addSeparate}
              onChange={e => setAddSeparate(e.target.checked)}
            />
            <span>Add as another instance (don’t upgrade)</span>
          </label>
        )}
      </div>

      {isMystic && (
        <div className={styles.rowForm} style={{ flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
          <label><b>Select {maxMystic} Oblivion Power(s) for Prerequisites:</b></label>
          <select
            multiple={maxMystic > 1}
            className={styles.input}
            style={{ height: maxMystic > 1 ? '100px' : 'auto', width: '100%' }}
            value={maxMystic > 1 ? mysticSelections : (mysticSelections[0] || '')}
            onChange={(e) => {
              if (maxMystic === 1) {
                setMysticSelections([e.target.value]);
              } else {
                const opts = Array.from(e.target.selectedOptions, o => o.value);
                if (opts.length <= maxMystic) setMysticSelections(opts);
              }
            }}
          >
            <option value="" disabled={maxMystic === 1}>-- Select Power(s) --</option>
            {availableOblivion.map(p => (
              <option key={p.id} value={p.id}>{p.name} (Level {p.level})</option>
            ))}
          </select>
          {maxMystic > 1 && <span className={styles.muted}>Hold Ctrl/Cmd to select multiple (up to {maxMystic}).</span>}
        </div>
      )}

      {sel && (
        <div className={styles.paneCard} style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              {sel.name} <span style={{ opacity: 0.6, fontSize: '0.85rem', fontWeight: 'normal' }}>({sel.category})</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-color)', opacity: 0.8 }}>
              Owned: <b>{existing.filter(m => m.id === (sel.id || '')).length}</b> • Highest: <b>{currentOwnedForSel || '—'}</b>
            </div>
          </div>
          <div style={{ fontSize: '0.95rem', lineHeight: '1.5', opacity: 0.85 }}>
            {sel.description || 'No description available.'}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Flaw Adder ---------- */
function FlawAdder({ existing = [], onAdd }) {
  const all = useMemo(() => allSelectableFlaws(), []);
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState(all[0]?.id || '');
  const sel = useMemo(() => all.find(f => f.id === selId) || null, [all, selId]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return all;
    return all.filter(f =>
      f.name.toLowerCase().includes(qq) ||
      (f.category || '').toLowerCase().includes(qq)
    );
  }, [q, all]);

  const groupedOptions = useMemo(() => {
    return filtered.reduce((acc, f) => {
      acc[f.category || 'General'] = acc[f.category || 'General'] || [];
      acc[f.category || 'General'].push(f);
      return acc;
    }, {});
  }, [filtered]);

  const dotsOptions = sel?.allowed || [];
  const [dots, setDots] = useState(dotsOptions[0] || 1);

  useEffect(() => {
    setDots(sel?.allowed?.[0] || 1);
  }, [selId, sel]);

  const blocked = !sel || Number(dots || 0) <= 0;

  return (
    <div className={styles.grid} style={{ gap: 12 }}>
      <div className={styles.rowForm}>
        <input
          className={styles.input}
          placeholder="Search flaws… (name or category)"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ flex: 1 }}
        />
        <span className={styles.muted}>Cost: <b>0 XP</b></span>
      </div>

      <div className={styles.rowForm} style={{ flexWrap: 'wrap' }}>
        <select
          className={styles.input}
          value={selId}
          onChange={e => setSelId(e.target.value)}
          style={{ flex: 2, minWidth: 220 }}
        >
          {Object.entries(groupedOptions).map(([cat, list]) => (
            <optgroup key={cat} label={cat}>
              {list.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.dotsSpec})
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <select
          className={styles.input}
          value={dots}
          onChange={e => setDots(Number(e.target.value))}
          style={{ width: 120 }}
        >
          {dotsOptions.map(n => <option key={n} value={n}>{glyph(n)} ({n})</option>)}
        </select>

        <button
          className={styles.cta}
          disabled={blocked}
          onClick={() => onAdd(sel, dots)}
        >
          Add {dots} dot{Number(dots) === 1 ? '' : 's'}
        </button>
      </div>

      {sel && (
        <div className={styles.paneCard} style={{ padding: '14px', background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,0,0,0.2)', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              {sel.name} <span style={{ opacity: 0.6, fontSize: '0.85rem', fontWeight: 'normal' }}>({sel.category})</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-color)', opacity: 0.8 }}>
              Owned: <b>{existing.filter(f => f.id === (sel.id || '')).length}</b>
            </div>
          </div>
          <div style={{ fontSize: '0.95rem', lineHeight: '1.5', opacity: 0.85 }}>
            {sel.description || 'No description available.'}
          </div>
        </div>
      )}
    </div>
  );
}