// src/pages/CharacterView.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../core/api';
import { AuthCtx } from '../../core/AuthContext';
import { DISCIPLINES, ALL_DISCIPLINE_NAMES, iconPath } from '../../data/disciplines';
import { RITUALS } from '../../data/rituals';
import styles from '../../styles/CharacterView.module.css';
import homeStyles from '../../styles/Home.module.css';

import CharacterSetup from './CharacterSetup';
import { ATTR_DESCRIPTIONS, SKILL_DESCRIPTIONS } from '../../data/descriptions';
import { MERITS_AND_FLAWS, listAllItems } from '../../data/merits_flaws';
import generateVTMCharacterSheetPDF from '../../utils/pdfGenerator';
import Inventory from '../inventory/Inventory';
import TouchstonesConvictionsSection from './TouchstonesConvictionsSection';
import AttributesSection from './AttributesSection';
import SkillsDisplaySection from './SkillsDisplaySection';
import DisciplinesDisplaySection from './DisciplinesDisplaySection';
import MeritsBackgroundsSection from './MeritsBackgroundsSection';
import Avatar from '../../components/Avatar';
import MeritsFlawsDisplay from './MeritsFlawsDisplay';
import { Skeleton } from 'boneyard-js/react';
import MiniSearch from 'minisearch';
import { ShopRow, ConfirmModal } from '../xp-shop/ShopRow';
import { getPushSettings, updatePushSettings, subscribeToWebPush } from '../../utils/push';
const msSearchText = (arr, query) => {
  const ms = new MiniSearch({ fields: ['text'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
  const docs = arr.map((text, id) => ({ id, text }));
  ms.addAll(docs);
  return ms.search(query).map(r => ({ item: docs[r.id].text }));
};
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
const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');
const symlogo = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png` : '');
const textlogo = (c) => (c ? `/img/clans/text/300px-${fileify(c)}_Logo.png` : '');



const ATTRS = [
  ['Strength', 'Dexterity', 'Stamina'],
  ['Charisma', 'Manipulation', 'Composure'],
  ['Intelligence', 'Wits', 'Resolve'],
];

const SKILLS = {
  Physical: ['Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival'],
  Social: ['Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge'],
  Mental: ['Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology'],
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

  // Normalizing Touchstones and Convictions
  const normalizeStringArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
      if (typeof item === 'string') return item;
      // Rescue old object formats like { name: '...', conviction: '...' }
      if (typeof item === 'object' && item !== null) {
        return item.conviction || item.description || item.name || JSON.stringify(item);
      }
      return String(item || '');
    });
  };

  sheet.touchstones = normalizeStringArray(
    Array.isArray(flat.touchstones) ? flat.touchstones : flat.morality?.touchstones
  );
  sheet.convictions = normalizeStringArray(
    Array.isArray(flat.convictions) ? flat.convictions : flat.morality?.convictions
  );

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
    return name.includes('resilience');
  });

  if (hasResilience) {
    healthMax += fortitudeDots;
  }

  sheet.health_max = healthMax;

  const hSuperficial = Number(flat?.health?.superficial ?? 0);
  const hAggravated = Number(flat?.health?.aggravated ?? 0);
  const legacyHealth = Number(flat?.health_current);

  if (Number.isFinite(legacyHealth)) {
    sheet.health_current = Math.max(0, Math.min(sheet.health_max, legacyHealth));
  } else {
    const hDmg = Math.max(0, Math.min(sheet.health_max, hSuperficial + hAggravated));
    sheet.health_current = sheet.health_max - hDmg;
  }
  sheet.health = { superficial: hSuperficial, aggravated: hAggravated };


  const compRaw = getCaseInsensitive(sheet.attributes, 'Composure') ?? getCaseInsensitive(flat.attributes, 'Composure') ?? 1;
  const resoRaw = getCaseInsensitive(sheet.attributes, 'Resolve') ?? getCaseInsensitive(flat.attributes, 'Resolve') ?? 1;

  const comp = Number(compRaw);
  const reso = Number(resoRaw);
  sheet.willpower_max = comp + reso;

  const wpSuperficial = Number(flat?.willpower?.superficial ?? 0);
  const wpAggravated = Number(flat?.willpower?.aggravated ?? 0);
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
          if (p.id) byId.set(String(p.id).toLowerCase(), lvl);
          if (p.slug) byId.set(String(p.slug).toLowerCase(), lvl);
          if (p.key) byId.set(String(p.key).toLowerCase(), lvl);
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

  // --- NORMALIZATION FIX ADDED HERE ---
  const normalizeStringArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
      if (typeof item === 'string') return item;
      // Rescue old object formats like { name: '...', conviction: '...' }
      if (typeof item === 'object' && item !== null) {
        return item.conviction || item.description || item.name || JSON.stringify(item);
      }
      return String(item || '');
    });
  };

  sheet.touchstones = normalizeStringArray(sheet.touchstones || sheet.morality?.touchstones);
  sheet.convictions = normalizeStringArray(sheet.convictions || sheet.morality?.convictions);
  // ------------------------------------

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

function TrackerBlock({ label, val, max, agg = 0, sup = 0, filled = 0, stains = 0 }) {
  if (label === 'Hunger') {
    const drops = [];
    for (let i = 0; i < max; i++) {
      const isFilled = i < filled;
      drops.push(
        <span key={i} className={`material-symbols-outlined ${styles.hungerDroplet} ${isFilled ? styles.active : ''}`}>
          water_drop
        </span>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
        <div className={styles.trackerLabel} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{label}</span>
          <span style={{ fontWeight: 'normal' }}>{val} / {max}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>{drops}</div>
      </div>
    );
  }

  const boxes = [];
  for (let i = 0; i < max; i++) {
    let content = '';
    let isFilled = false;

    if (agg > 0 || sup > 0) {
      if (i < agg) content = 'X';
      else if (i < agg + sup) content = '/';
    } else {
      if (i < filled) isFilled = true;
      if (i >= max - stains) content = '/';
    }

    let extraClass = '';
    if (content === 'X') extraClass = styles.aggravated;
    else if (content === '/') extraClass = styles.superficial;
    else if (isFilled) extraClass = styles.filled;

    boxes.push(
      <div
        key={i}
        className={`${styles.trackerSquare} ${isFilled ? styles.filled : ''}`}
      >
        {content}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
      <div className={styles.trackerLabel} style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ fontWeight: 'normal', color: 'var(--tint)', fontFamily: 'var(--font-body)', fontSize: '18px' }}>{val}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>{boxes}</div>
    </div>
  );
}

/* ===========================
   Profile Edit Modal
   =========================== */
function IdentityEditModal({ sheet, onClose, onSave, busy }) {
  const [ambition, setAmbition] = useState(sheet.ambition || '');
  const [desire, setDesire] = useState(sheet.desire || '');

  return (
    <div className={styles.modalOverlay} role="dialog">
      <div className={`${styles.card} ${styles.modalCard}`} style={{ width: 'min(92vw, 500px)', background: 'var(--surface-container)' }}>
        <div className={styles.modalHeader} style={{ borderBottom: '1px solid var(--border-color)', padding: '16px' }}>
          <h3 className={styles.modalTitle} style={{ margin: 0, fontFamily: 'var(--font-title)', fontSize: '24px' }}>Edit Identity</h3>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: 6, color: 'var(--text-muted)' }}>Ambition</label>
            <input
              className={styles.input}
              value={ambition}
              onChange={e => setAmbition(e.target.value)}
              placeholder="e.g. Become Prince"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--surface-lowest)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: 6, color: 'var(--text-muted)' }}>Desire</label>
            <input
              className={styles.input}
              value={desire}
              onChange={e => setDesire(e.target.value)}
              placeholder="e.g. Drink from a celebrity"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--surface-lowest)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px', borderRadius: '4px' }}
            />
          </div>
        </div>
        <div className={styles.modalFooter} style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className={styles.ghostBtn} onClick={onClose} disabled={busy}>Cancel</button>
          <button className={styles.cta} onClick={() => onSave({ ambition, desire })} disabled={busy}>{busy ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}

function MoralityEditModal({ sheet, onClose, onSave, busy }) {
  const [touchstones, setTouchstones] = useState([...(sheet.touchstones || [])]);
  const [convictions, setConvictions] = useState([...(sheet.convictions || [])]);

  return (
    <div className={styles.modalOverlay} role="dialog">
      <div className={`${styles.card} ${styles.modalCard}`} style={{ width: 'min(92vw, 600px)', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface-container)' }}>
        <div className={styles.modalHeader} style={{ borderBottom: '1px solid var(--border-color)', padding: '16px' }}>
          <h3 className={styles.modalTitle} style={{ margin: 0, fontFamily: 'var(--font-title)', fontSize: '24px', color: 'var(--text-color)' }}>Edit Morality & Anchors</h3>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Convictions List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontWeight: '600', color: 'var(--text-color)', fontSize: '18px' }}>Convictions</label>
              <button className={styles.ghostBtn} style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '4px' }} onClick={() => setConvictions([...convictions, ''])}>+ Add Conviction</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {convictions.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <input
                    className={styles.input}
                    value={c}
                    onChange={e => { const n = [...convictions]; n[i] = e.target.value; setConvictions(n); }}
                    style={{ flex: 1, background: 'var(--surface-lowest)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px', borderRadius: '4px' }}
                    placeholder="Title: Description..."
                  />
                  <button
                    className={styles.ghostBtn}
                    style={{ color: 'var(--tint)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0 12px' }}
                    onClick={() => setConvictions(convictions.filter((_, idx) => idx !== i))}
                    title="Remove Conviction"
                  >✕</button>
                </div>
              ))}
              {convictions.length === 0 && <div className={styles.muted} style={{ fontSize: '14px' }}>No convictions added.</div>}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--surface-variant)', margin: 0 }} />

          {/* Touchstones List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontWeight: '600', color: 'var(--text-color)', fontSize: '18px' }}>Touchstones</label>
              <button className={styles.ghostBtn} style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '4px' }} onClick={() => setTouchstones([...touchstones, ''])}>+ Add Touchstone</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {touchstones.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <input
                    className={styles.input}
                    value={t}
                    onChange={e => { const n = [...touchstones]; n[i] = e.target.value; setTouchstones(n); }}
                    style={{ flex: 1, background: 'var(--surface-lowest)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px', borderRadius: '4px' }}
                    placeholder="Name - Description..."
                  />
                  <button
                    className={styles.ghostBtn}
                    style={{ color: 'var(--tint)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0 12px' }}
                    onClick={() => setTouchstones(touchstones.filter((_, idx) => idx !== i))}
                    title="Remove Touchstone"
                  >✕</button>
                </div>
              ))}
              {touchstones.length === 0 && <div className={styles.muted} style={{ fontSize: '14px' }}>No touchstones added.</div>}
            </div>
          </div>

        </div>
        <div className={styles.modalFooter} style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className={styles.ghostBtn} onClick={onClose} disabled={busy}>Cancel</button>
          <button className={styles.cta} onClick={() => onSave({ touchstones, convictions })} disabled={busy}>{busy ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
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

  // Fetch all items from data to identify what is truly a Flaw
  const allDataItems = useMemo(() => listAllItems(), []);
  const flawIds = useMemo(() => new Set(allDataItems.filter(i => i.type === 'Flaw').map(i => i.id)), [allDataItems]);

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
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [moralityModalOpen, setMoralityModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // New tab state for the XP Shop
  const [activeShopTab, setActiveShopTab] = useState('Disciplines');
  const [currentSearches, setShopSearches] = useState({});
  const [shopFilter, setShopFilter] = useState('in_clan');

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

  // System Notifications State
  const [sysNotifOn, setSysNotifOn] = useState(false);
  const [pushSettingsLoading, setPushSettingsLoading] = useState(true);
  const notifSupported = typeof window !== 'undefined' && 'Notification' in window;

  useEffect(() => {
    getPushSettings().then(settings => {
      setSysNotifOn(!!settings.system);
      setPushSettingsLoading(false);
    }).catch(() => setPushSettingsLoading(false));
  }, []);

  const toggleSysNotifications = async () => {
    if (!notifSupported || pushSettingsLoading) return;
    if (!sysNotifOn) {
      try {
        await subscribeToWebPush();
        await updatePushSettings({ system: true });
        setSysNotifOn(true);
      } catch (err) {
        alert('Could not enable system notifications: ' + err.message);
      }
    } else {
      try {
        await updatePushSettings({ system: false });
        setSysNotifOn(false);
      } catch (err) {
        console.error('Failed to disable system push:', err);
      }
    }
  };

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
      .catch(() => { });
  }, [paths.totals, ch]);


  const prevHealthRef = useRef(tempHealth);
  const prevWillpowerRef = useRef(tempWillpower);
  const prevHungerRef = useRef(tempHunger);
  const prevHumanityRef = useRef(tempHumanity);
  const prevStainsRef = useRef(tempStains);

  // Perform inline previous-value check during render
  if (
    tempHealth.superficial !== prevHealthRef.current.superficial ||
    tempHealth.aggravated !== prevHealthRef.current.aggravated ||
    tempWillpower.superficial !== prevWillpowerRef.current.superficial ||
    tempWillpower.aggravated !== prevWillpowerRef.current.aggravated ||
    tempHunger !== prevHungerRef.current ||
    tempHumanity !== prevHumanityRef.current ||
    tempStains !== prevStainsRef.current
  ) {
    prevHealthRef.current = tempHealth;
    prevWillpowerRef.current = tempWillpower;
    prevHungerRef.current = tempHunger;
    prevHumanityRef.current = tempHumanity;
    prevStainsRef.current = tempStains;

    if (!isInitialTrackerLoad.current && isAdmin) {
      setSaveStatus('Saving trackers...');
    }
  }

  useEffect(() => {
    if (isInitialTrackerLoad.current || !ch || !isAdmin) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

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
        api.patch(paths.update, payload).catch(() => { });
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
        try { const t = await api.get(paths.totals); setXpTotals(t.data); } catch { }
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to update character sheet');
      throw e;
    }
  }

  async function saveProfileData(newData) {
    setSavingProfile(true);
    const nextSheet = JSON.parse(JSON.stringify(sheet));
    if (newData.ambition !== undefined) nextSheet.ambition = newData.ambition;
    if (newData.desire !== undefined) nextSheet.desire = newData.desire;

    if (newData.touchstones !== undefined || newData.convictions !== undefined) {
      nextSheet.morality = nextSheet.morality || {};
      if (newData.touchstones !== undefined) {
        nextSheet.touchstones = newData.touchstones;
        nextSheet.morality.touchstones = newData.touchstones;
      }
      if (newData.convictions !== undefined) {
        nextSheet.convictions = newData.convictions;
        nextSheet.morality.convictions = newData.convictions;
      }
    }

    try {
      await api.put(paths.update, {
        name: ch.name,
        clan: ch.clan,
        sheet: nextSheet
      });
      setCh(prev => ({ ...prev, sheet: nextSheet }));
      setIdentityModalOpen(false);
      setMoralityModalOpen(false);
      setMsg('Profile details updated successfully.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setErr('Failed to update profile details.');
    } finally {
      setSavingProfile(false);
    }
  }

  const handleUpdateNotes = async (type, idx, newNotes) => {
    if (!ch || !ch.sheet) return;
    const nextSheet = JSON.parse(JSON.stringify(ch.sheet));
    const targetArray = type === 'flaws' ? nextSheet.flaws : nextSheet.advantages;
    if (targetArray && targetArray[idx]) {
      targetArray[idx].notes = newNotes;
      try {
        await api.put(paths.update, {
          name: ch.name,
          clan: ch.clan,
          sheet: nextSheet
        });
        setCh(prev => ({ ...prev, sheet: nextSheet }));
        setMsg('Notes updated successfully.');
        setTimeout(() => setMsg(''), 3000);
      } catch (e) {
        setErr('Failed to update notes.');
      }
    }
  };

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
        assignOnly: true,
        characterClan: ch.clan,
        disciplineDots: sheet.disciplines,
        ownedPowers: sheet.disciplinePowers?.[first.name] || []
      });
      setModalOpen(true);
    }
  }, [ch, computeMissingPicks, modalOpen, sheet]);

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
            assignOnly: true,
            // Add these two lines using the updated 'nextSheet'
            disciplineDots: nextSheet.disciplines,
            ownedPowers: nextSheet.disciplinePowers?.[first.name] || []
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
      } catch (e) { }
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

  /* --- Flaw/Merit Rule Calculations (with Self-Healing) --- */
  const rawMerits = Array.isArray(sheet?.advantages?.merits) ? sheet.advantages.merits : [];
  const rawBackgrounds = Array.isArray(sheet?.backgrounds) ? sheet.backgrounds : [];
  const rawFlaws = Array.isArray(sheet?.advantages?.flaws) ? sheet.advantages.flaws : [];

  const meritsList = [];
  const backgroundsList = [];
  const flawsList = [...rawFlaws];

  // Heal: If any flaws are inside merits/backgrounds, move them visually to flawsList
  rawMerits.forEach(m => flawIds.has(m.id) ? flawsList.push(m) : meritsList.push(m));
  rawBackgrounds.forEach(b => flawIds.has(b.id) ? flawsList.push(b) : backgroundsList.push(b));

  const displayMerits = [...meritsList, ...backgroundsList];

  const totalMeritDots = displayMerits.reduce((sum, m) => sum + Number(m.dots || 0), 0);
  const totalFlawDots = flawsList.reduce((sum, f) => sum + Number(f.dots || 0), 0);

  const requiredFlaws = Math.floor(totalMeritDots / 7) * 2;
  const flawDeficit = Math.max(0, requiredFlaws - totalFlawDots);

  if (!ch) {
    return (
      <Skeleton name="character-view-loading" loading={true}>
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
      </Skeleton>
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
  const currentSearch = currentSearches[activeShopTab] || '';
  const isSearching = currentSearch.trim().length > 0;

  return (
    <Skeleton name="character-view" loading={!ch}>
      <div className={styles.root} style={{ '--tint': tint }}>
        {/* --- Stitch Mobile Header --- */}
        <header className="md:hidden fixed top-0 w-full z-50 backdrop-blur-xl border-b border-white/10 shadow-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-color) 60%, transparent)' }}>
          <div className="flex justify-between items-center px-4 h-16 w-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border overflow-hidden" style={{ borderColor: 'var(--tint)', boxShadow: '0 0 10px color-mix(in srgb, var(--tint) 30%, transparent)' }}>
                <Avatar userId={!adminNPCId ? ch?.user_id : undefined} npcId={adminNPCId} size="100%" editable={(!adminNPCId && String(user?.id) === String(ch?.user_id)) || isAdmin} />
              </div>
              <h1 className="font-['Playfair_Display'] text-xl font-semibold" style={{ color: 'var(--tint)' }}>{ch.name}</h1>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={`material-symbols-outlined ${styles.hungerDroplet} ${i < tempHunger ? styles.active : ''}`} style={i < tempHunger ? { fontVariationSettings: "'FILL' 1" } : {}}>water_drop</span>
              ))}
              {(!adminNPCId && String(user?.id) === String(ch?.user_id)) && (
                <button 
                  onClick={toggleSysNotifications} 
                  title={sysNotifOn ? "Disable System Notifications" : "Enable System Notifications"}
                  style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: sysNotifOn ? 'var(--tint)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                >
                  <span className="material-symbols-outlined">{sysNotifOn ? 'notifications_active' : 'notifications_off'}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* --- Top App Bar (Desktop) --- */}
        <header className={`hidden md:block ${styles.topAppBar}`}>
          <div className={styles.topAppBarContent}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className={styles.avatarBox}>
                <Avatar userId={!adminNPCId ? ch?.user_id : undefined} npcId={adminNPCId} size="100%" editable={(!adminNPCId && String(user?.id) === String(ch?.user_id)) || isAdmin} />
              </div>
              <div>
                <h1 className={styles.charTitle}>{ch.name}</h1>
                <p className={styles.charSubtitle} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {symlogo(ch.clan) && <img src={symlogo(ch.clan)} alt={ch.clan} style={{ height: '24px', opacity: 0.8, filter: 'brightness(0) invert(1)' }} />}
                  {textlogo(ch.clan) ? <img src={textlogo(ch.clan)} alt={ch.clan} style={{ height: '20px', opacity: 0.9, filter: 'brightness(0) invert(1)' }} /> : <span>{ch.clan}</span>}
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span>{sheet?.bloodPotency || 'Unspecified'}</span>
                </p>
              </div>
            </div>

            <div className={styles.topAppBarActionRow} style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              {/* Hunger Tracker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={`material-symbols-outlined ${styles.hungerDroplet} ${i < tempHunger ? styles.active : ''}`} style={i < tempHunger ? { fontVariationSettings: "'FILL' 1" } : {}}>water_drop</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(!adminNPCId && String(user?.id) === String(ch?.user_id)) && (
                  <button 
                    className={styles.navActionBtn} 
                    onClick={toggleSysNotifications}
                    title={sysNotifOn ? "Disable System Notifications" : "Enable System Notifications"}
                    style={{ color: sysNotifOn ? 'var(--tint)' : 'inherit' }}
                  >
                    <span className="material-symbols-outlined">{sysNotifOn ? 'notifications_active' : 'notifications_off'}</span>
                  </button>
                )}
                <button className={styles.navActionBtn} onClick={() => setIdentityModalOpen(true)} title="Edit Identity">
                  <span className="material-symbols-outlined">settings</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* --- Mobile Bottom Nav --- */}
        <nav className={styles.mobileNav}>
          <button className={`${styles.mobileNavBtn} ${styles.mobileNavBtnActive}`} onClick={() => window.scrollTo(0, 0)}>
            <span className="material-symbols-outlined" style={{ marginBottom: '4px' }}>person</span>
            <span className={styles.mobileNavLabel}>Character</span>
          </button>
          <button className={styles.mobileNavBtn} onClick={() => document.getElementById('inventory-section')?.scrollIntoView({ behavior: 'smooth' })}>
            <span className="material-symbols-outlined" style={{ marginBottom: '4px' }}>backpack</span>
            <span className={styles.mobileNavLabel}>Inventory</span>
          </button>
          <button className={styles.mobileNavBtn} onClick={() => document.getElementById('merits-section')?.scrollIntoView({ behavior: 'smooth' })}>
            <span className="material-symbols-outlined" style={{ marginBottom: '4px', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            <span className={styles.mobileNavLabel}>Merits & Flaws</span>
          </button>
          <button className={styles.mobileNavBtn} onClick={() => shopRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            <span className="material-symbols-outlined" style={{ marginBottom: '4px' }}>shopping_cart</span>
            <span className={styles.mobileNavLabel}>XP Shop</span>
          </button>
        </nav>

        {/* --- Desktop Nav (Sidebar) --- */}
        <nav className={styles.desktopNav}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <button className={`${styles.desktopNavBtn} ${styles.desktopNavBtnActive}`} onClick={() => window.scrollTo(0, 0)} title="Character">
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>person</span>
              <span style={{ fontSize: '10px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Character</span>
            </button>

            <button className={styles.desktopNavBtn} onClick={() => document.getElementById('inventory-section')?.scrollIntoView({ behavior: 'smooth' })} title="Inventory">
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>backpack</span>
              <span style={{ fontSize: '10px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inventory</span>
            </button>

            <button className={styles.desktopNavBtn} onClick={() => document.getElementById('merits-section')?.scrollIntoView({ behavior: 'smooth' })} title="Merits & Flaws">
              <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              <span style={{ fontSize: '10px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Merits</span>
            </button>

            <button className={styles.desktopNavBtn} onClick={() => shopRef.current?.scrollIntoView({ behavior: 'smooth' })} title="XP Shop">
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>shopping_cart</span>
              <span style={{ fontSize: '10px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shop</span>
            </button>
          </div>
        </nav>

        {/* --- Main Bento Layout --- */}
        <main className={styles.mainLayout}>
          {err && <div className={styles.alertError}>{err}</div>}
          {msg && <div className={styles.alertOk}>{msg}</div>}
          {saveStatus && isAdmin && <div style={{ fontSize: '0.85rem', color: 'var(--accent)', opacity: 0.8, textAlign: 'center' }}>{saveStatus}</div>}

          {/* --- Stitch Mobile Meta Data --- */}
          <section className="md:hidden grid grid-cols-1 gap-3 mt-8">
            <div className={styles.glassPanel + " p-4 rounded-lg"}>
              <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest text-white/70 block mb-1 uppercase">Predator Type</span>
              <div className={styles.inputUnderline}>{sheet?.predator_type || sheet?.predatorType || '—'}</div>
            </div>
            <div className={styles.glassPanel + " p-4 rounded-lg"}>
              <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest text-white/70 block mb-1 uppercase">Sire</span>
              <div className={styles.inputUnderline}>{sheet?.sire || '—'}</div>
            </div>
            <div className={styles.glassPanel + " p-4 rounded-lg"}>
              <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest text-white/70 block mb-1 uppercase">Ambition & Desire</span>
              <div className="space-y-3 mt-2">
                <div className={styles.inputUnderline + " text-sm"}>{sheet?.ambition || '—'}</div>
                <div className={styles.inputUnderline + " text-sm"}>{sheet?.desire || '—'}</div>
              </div>
            </div>
          </section>

          {/* --- Desktop Meta Data --- */}
          <div className="hidden md:flex justify-between items-end flex-wrap gap-4 border-b border-white/10 pb-3 mt-8">
            <div style={{ flex: '1 1 min-content' }}>
              <h2 style={{ fontFamily: 'var(--font-title)', margin: 0, marginBottom: '6px' }}>Meta Data</h2>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6', display: 'flex', flexWrap: 'wrap', columnGap: '8px' }}>
                <span>Predator: {sheet?.predator_type || sheet?.predatorType || '—'}</span>
                <span style={{opacity: 0.5}}>|</span>
                <span>Sire: {sheet?.sire || '—'}</span>
                <span style={{opacity: 0.5}}>|</span>
                <span>Ambition: {sheet?.ambition || '—'}</span>
                <span style={{opacity: 0.5}}>|</span>
                <span>Desire: {sheet?.desire || '—'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--text-muted)' }}>XP: <b style={{ color: 'var(--tint)' }}>{xp}</b></span>
            </div>
          </div>

          {/* Health & Willpower Tracker Grid */}
          <section className={styles.bentoGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {/* Health */}
            <div className={`${styles.level1} ${styles.glassCard}`} style={{ padding: '24px' }}>
              <TrackerBlock label="Health" val={maxHealth} max={maxHealth} agg={tempHealth.aggravated} sup={tempHealth.superficial} />
              {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Sup:</span>
                    <button className={styles.ghostBtn} style={{ padding: '2px 8px' }} onClick={() => updateTracker('health', 'superficial', -1)}>-</button>
                    <button className={styles.ghostBtn} style={{ padding: '2px 8px' }} onClick={() => updateTracker('health', 'superficial', 1)}>+</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Agg:</span>
                    <button className={styles.ghostBtn} style={{ padding: '2px 8px' }} onClick={() => updateTracker('health', 'aggravated', -1)}>-</button>
                    <button className={styles.ghostBtn} style={{ padding: '2px 8px' }} onClick={() => updateTracker('health', 'aggravated', 1)}>+</button>
                  </div>
                </div>
              )}
            </div>

            {/* Willpower */}
            <div className={`${styles.level1} ${styles.glassCard}`} style={{ padding: '24px' }}>
              <TrackerBlock label="Willpower" val={maxWillpower} max={maxWillpower} agg={tempWillpower.aggravated} sup={tempWillpower.superficial} />
              {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Sup:</span>
                    <button className={styles.ghostBtn} style={{ padding: '2px 8px' }} onClick={() => updateTracker('willpower', 'superficial', -1)}>-</button>
                    <button className={styles.ghostBtn} style={{ padding: '2px 8px' }} onClick={() => updateTracker('willpower', 'superficial', 1)}>+</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Agg:</span>
                    <button className={styles.ghostBtn} style={{ padding: '2px 8px' }} onClick={() => updateTracker('willpower', 'aggravated', -1)}>-</button>
                    <button className={styles.ghostBtn} style={{ padding: '2px 8px' }} onClick={() => updateTracker('willpower', 'aggravated', 1)}>+</button>
                  </div>
                </div>
              )}
            </div>

            {/* Humanity */}
            <div className={`${styles.level1} ${styles.glassCard}`} style={{ padding: '24px' }}>
              <TrackerBlock label="Humanity" val={tempHumanity} max={10} filled={tempHumanity} stains={tempStains} />
              {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Hum:</span>
                    <button className={styles.ghostBtn} style={{ padding: '2px 8px' }} onClick={() => setTempHumanity(h => Math.max(0, h - 1))}>-</button>
                    <button className={styles.ghostBtn} style={{ padding: '2px 8px' }} onClick={() => setTempHumanity(h => Math.min(10, h + 1))}>+</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Stains:</span>
                    <button className={styles.ghostBtn} style={{ padding: '2px 8px' }} onClick={() => setTempStains(s => Math.max(0, s - 1))}>-</button>
                    <button className={styles.ghostBtn} style={{ padding: '2px 8px' }} onClick={() => setTempStains(s => Math.min(10, s + 1))}>+</button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Bento Data Grid */}
          <section className={styles.bentoGrid}>
            <div className={styles.bentoSpan2} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Attributes */}
              <AttributesSection sheet={sheet} />

              {/* Skills & Others */}
              <SkillsDisplaySection sheet={sheet} />

              <div className={`${styles.level1} ${styles.glassCard}`} style={{ padding: '24px' }}>
                <div id="inventory-section">
                  <Inventory characterId={ch?.id} />
                </div>
                <div style={{ marginTop: '24px' }}>
                  <MeritsFlawsDisplay
                    sheet={sheet}
                    allMeritsFlat={allMeritsFlat}
                    allFlawsFlat={allFlawsFlat}
                    flawIds={flawIds}
                  />
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <button className={styles.cta} onClick={() => navigate('/retainers', { state: { character: ch, sheet } })}>
                      Retainer Marketplace
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: '24px' }}>
                  <TouchstonesConvictionsSection sheet={sheet} setMoralityModalOpen={setMoralityModalOpen} />
                </div>
              </div>

              {/* Overrides and Resets */}
              {sheet.allow_reset && (
                <div style={{ padding: '20px', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid var(--tint)', borderRadius: '0px', textAlign: 'center' }}>
                  <h3 style={{ color: 'var(--tint)', margin: '0 0 10px 0', fontSize: '1.5rem', fontFamily: 'var(--font-title)' }}>System Re-Roll Authorized</h3>
                  <p style={{ margin: '0 0 20px 0', fontSize: '1rem', color: 'var(--text-color)', opacity: 0.9 }}>
                    Admin override granted. Rebuild sequence initiated. Core data will be wiped but communication logs preserved.
                  </p>
                  <button className={styles.cta} onClick={() => navigate('/make')}>Execute Re-Roll</button>
                </div>
              )}
            </div>

            <div className={`${styles.level1} ${styles.glassCard}`} style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-title)', fontSize: '24px', color: 'var(--text-color)' }}>Disciplines</h3>
              </div>
              <div style={{ flex: 1, padding: '24px' }}>
                <DisciplinesDisplaySection sheet={sheet} />
              </div>
              <div style={{ padding: '24px', marginTop: 'auto' }}>
                <button
                  className={`${styles.gothicBtn} ${styles.bloodPulse}`}
                  style={{ width: '100%', padding: '16px', fontSize: '16px', background: 'var(--primary-container)', color: 'var(--text-color)', boxShadow: '0 0 15px rgba(180,15,31,0.2)' }}
                  onClick={() => setTempHunger(h => Math.min(5, h + 1))}
                >
                  ROUSE BLOOD
                </button>
              </div>
            </div>
          </section>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button className={styles.ghostBtn} onClick={() => generateVTMCharacterSheetPDF(ch)}>
              Export PDF Record
            </button>
          </div>

          {/* ===== XP SHOP ===== */}
          <section ref={shopRef} className={styles.section} style={{ padding: 0 }}>
            {/* New Balance Header */}
            <div className={styles.xpBalanceHeader}>
              <h1 className={styles.xpBalanceLabel}>Current Balance</h1>
              <div className={styles.xpBalanceNumber}>
                {xp} <span className={styles.xpBalanceUnit}>XP</span>
              </div>
            </div>

            {/* Sticky Tabs */}
            <nav className={styles.shopTabsNav}>
              <div className={styles.shopTabsContainer}>
                {['Disciplines', 'Attributes', 'Skills', 'Merits & Flaws', 'Rituals', 'Blood Potency'].map(tab => (
                  <button
                    key={tab}
                    className={`${styles.shopTabBtn} ${activeShopTab === tab ? styles.shopTabBtnActive : ''}`}
                    onClick={() => setActiveShopTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </nav>

            <div className={`${styles.shopGrid} ${['Disciplines', 'Rituals'].includes(activeShopTab) ? styles.shopGridSingle : ''}`}>
              {/* Category Search Bar */}
              <div className={styles.shopSearchRow} style={{ gridColumn: '1 / -1', marginBottom: '16px' }}>
                <div className={styles.searchWrap} style={{ width: '100%' }}>
                  <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder={`Search ${activeShopTab}...`}
                    value={currentSearches[activeShopTab] || ''}
                    onChange={(e) => setShopSearches(prev => ({ ...prev, [activeShopTab]: e.target.value }))}
                  />
                </div>
              </div>
              {(activeShopTab === 'Blood Potency' || isSearching) && (
                <>
                  {(() => {
                    if (isSearching) {
                      if (msSearchText(['Blood Potency'], currentSearch).length === 0) return null;
                    }
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
                </>
              )}

              {(activeShopTab === 'Attributes' || isSearching) && (
                <>
                  {(() => {
                    return ATTRS.map((group, i) => {
                      const groupNames = ['Physical', 'Social', 'Mental'];
                      const groupName = groupNames[i];
                      
                      let filteredGroup = group;
                      if (isSearching) {
                        const res = msSearchText([...group, groupName], currentSearch);
                        if (res.length === 0) return null;
                        
                        // If they matched the group name, show all attributes in group
                        const matchedGroup = res.some(r => r.item === groupName);
                        if (!matchedGroup) {
                          const matchedAttrNames = new Set(res.map(r => r.item));
                          filteredGroup = group.filter(a => matchedAttrNames.has(a));
                        }
                      }
                      
                      if (filteredGroup.length === 0) return null;
                      return (
                        <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          <h3 className={styles.sectionTitle} style={{ margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', color: 'var(--tint)' }}>
                            {groupName}
                          </h3>
                          {filteredGroup.map(attr => {
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
                                description={ATTR_DESCRIPTIONS[attr]}
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
                      );
                    });
                  })()}
                </>
              )}

              {(activeShopTab === 'Skills' || isSearching) && (
                <>
                  {(() => {
                    return Object.entries(SKILLS).map(([groupName, groupSkills]) => {
                      let filteredSkills = groupSkills;
                      if (isSearching) {
                        const res = msSearchText([...groupSkills, groupName], currentSearch);
                        if (res.length === 0) return null;
                        
                        const matchedGroup = res.some(r => r.item === groupName);
                        if (!matchedGroup) {
                          const matchedSkillNames = new Set(res.map(r => r.item));
                          filteredSkills = groupSkills.filter(s => matchedSkillNames.has(s));
                        }
                      }
                      
                      if (filteredSkills.length === 0) return null;
                      return (
                        <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          <h3 className={styles.sectionTitle} style={{ margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', color: 'var(--tint)' }}>
                            {groupName}
                          </h3>
                          {filteredSkills.map(skill => {
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
                                description={SKILL_DESCRIPTIONS[skill]}
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
                      );
                    });
                  })()}
                </>
              )}

              {(activeShopTab === 'Disciplines' || isSearching) && (
                <>
                  {(() => {
                    const matchDiscipline = (name) => {
                      if (!isSearching) return true;
                      const allTerms = [name];
                      const levels = DISCIPLINES?.[name]?.levels || {};
                      for (let lvl = 1; lvl <= 5; lvl++) {
                        for (const p of (levels[lvl] || [])) {
                          if (p.name) allTerms.push(p.name);
                        }
                      }
                      return msSearchText(allTerms, currentSearch).length > 0;
                    };
                    
                    return (
                      <>
                        {inClanDisciplines.filter(name => matchDiscipline(name)).length > 0 && (
                          <div style={{ gridColumn: '1 / -1', marginTop: '16px', borderBottom: '1px solid color-mix(in srgb, var(--tint) 40%, transparent)', paddingBottom: '8px' }}>
                            <h3 style={{ fontFamily: 'var(--font-title)', margin: 0, color: 'var(--tint)' }}>In Clan Disciplines</h3>
                          </div>
                        )}
                        {inClanDisciplines.filter(name => matchDiscipline(name)).map(name => {
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
                              hint={!canRaise ? 'Max 5' : (!afford ? 'Not enough XP' : 'Expand to select a power')}
                              noConfirm={true}
                              forceExpanded={isSearching}
                            >
                              {canRaise && afford && (
                                <InlineDisciplinePicker
                                  cfg={{
                                    name,
                                    current,
                                    next,
                                    kind: 'clan',
                                    assignOnly: false,
                                    characterClan: ch.clan,
                                    disciplineDots: sheet.disciplines,
                                    ownedPowers: sheet.disciplinePowers?.[name] || []
                                  }}
                                  searchQuery={currentSearch}
                                  onConfirm={(sel) => confirmDisciplinePurchase({
                                    name,
                                    current,
                                    next,
                                    kind: 'clan',
                                    assignOnly: false,
                                    ...sel
                                  })}
                                />
                              )}
                            </ShopRow>
                          );
                        })}
                        {outOfClanDisciplines.filter(name => matchDiscipline(name)).length > 0 && (
                          <div style={{ gridColumn: '1 / -1', marginTop: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                            <h3 style={{ fontFamily: 'var(--font-title)', margin: 0, color: 'var(--text-muted)' }}>Out of Clan Disciplines</h3>
                          </div>
                        )}
                        {outOfClanDisciplines.filter(name => matchDiscipline(name)).map(name => {
                          const current = Number(sheet.disciplines?.[name] || 0);
                          const next = Math.min(current + 1, 5);
                          const kind = disciplineKindFor(ch, name);
                          const isKnown = current > 0;
                          const title = isKnown ? `${name} (${current})` : name;
                          return (
                            <ShopRow
                              key={name}
                              title={title}
                              subtitle={isKnown ? `Raise to ${next} • ${kind}` : `Buy • ${kind}`}
                              cost={'-'}
                              leftIcon={iconPath(name)}
                              disabled={true}
                              hint={'Communicate with your ST to get them'}
                              locked={true}
                              onBuy={async () => { }}
                              forceExpanded={isSearching}
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </>
              )}

              {(activeShopTab === 'Rituals' || isSearching) && (
                <>
                  {(() => {
                    const matchRitualCategory = (catName, itemsObj) => {
                      if (!isSearching) return true;
                      const allTerms = [catName];
                      Object.values(itemsObj || {}).flat().forEach(r => {
                        if (r.name) allTerms.push(r.name);
                      });
                      return msSearchText(allTerms, currentSearch).length > 0;
                    };
                    
                    const showBloodSorcery = matchRitualCategory('Blood Sorcery Rituals', RITUALS?.blood_sorcery?.levels);
                    const showOblivion = matchRitualCategory('Oblivion Ceremonies', RITUALS?.oblivion?.levels);
                    
                    return (
                      <>
                        {showBloodSorcery && (
                          <ShopRow
                            title="Blood Sorcery Rituals"
                            subtitle="View and acquire rituals"
                            cost="-"
                            disabled={false}
                            hint="Expand to browse"
                            noConfirm={true}
                            forceExpanded={isSearching}
                          >
                            <InlineRitualPicker 
                              type="blood_sorcery" 
                              itemsObj={RITUALS?.blood_sorcery?.levels}
                              knownIds={knownRitualIds}
                              knownPowerNamesAndIds={knownPowerNamesAndIds}
                              canLearnFn={canLearnRitual}
                              onBuy={buyRitual}
                              xp={xp}
                              searchQuery={currentSearch}
                            />
                          </ShopRow>
                        )}
                        
                        {showOblivion && (
                          <ShopRow
                            title="Oblivion Ceremonies"
                            subtitle="View and acquire ceremonies"
                            cost="-"
                            disabled={false}
                            hint="Expand to browse"
                            noConfirm={true}
                            forceExpanded={isSearching}
                          >
                            <InlineRitualPicker 
                              type="oblivion" 
                              itemsObj={RITUALS?.oblivion?.levels}
                              knownIds={knownRitualIds}
                              knownPowerNamesAndIds={knownPowerNamesAndIds}
                              canLearnFn={canLearnCeremony}
                              onBuy={buyCeremony}
                              xp={xp}
                              searchQuery={currentSearch}
                            />
                          </ShopRow>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>

            {(activeShopTab === 'Merits & Flaws' || isSearching) && (
              <div style={{ marginTop: '2rem' }}>
                <MeritsBackgroundsSection
                  sheet={sheet}
                  xp={xp}
                  ch={ch}
                  knownPowerNamesAndIds={knownPowerNamesAndIds}
                  searchQuery={currentSearch}
                  spendXP={spendXP}
                  onUpdateNotes={handleUpdateNotes}
                />
              </div>
            )}

            {activeShopTab === 'Skills' && !isSearching && (
              <div style={{ marginTop: '2rem' }}>
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
              </div>
            )}
          </section>
        </main>

        {/* ----- Modals ----- */}
        {modalOpen && modalCfg && (
          <DisciplinePowerModal
            cfg={modalCfg}
            onClose={() => { setModalOpen(false); setModalCfg(null); }}
            onConfirm={(sel) => confirmDisciplinePurchase({ ...modalCfg, ...sel })}
          />
        )}

        {identityModalOpen && (
          <IdentityEditModal
            sheet={sheet}
            onClose={() => setIdentityModalOpen(false)}
            onSave={saveProfileData}
            busy={savingProfile}
          />
        )}

        {moralityModalOpen && (
          <MoralityEditModal
            sheet={sheet}
            onClose={() => setMoralityModalOpen(false)}
            onSave={saveProfileData}
            busy={savingProfile}
          />
        )}
        {/* --- Stitch Mobile Bottom Nav --- */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 rounded-t-xl backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-color) 80%, transparent)' }}>
          <div className="flex justify-around items-center h-20 w-full px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <button className="flex flex-col items-center justify-center transition-all duration-200" style={{ color: 'var(--tint)' }}>
              <span className="material-symbols-outlined mb-1 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase font-medium">Sheet</span>
            </button>
            <button className="flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-all duration-200" style={{ color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined mb-1 text-2xl">book</span>
              <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase font-medium">Lore</span>
            </button>
            <button className="flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-all duration-200" style={{ color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined mb-1 text-2xl">inventory_2</span>
              <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase font-medium">Gear</span>
            </button>
            <button className="flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-all duration-200" style={{ color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined mb-1 text-2xl">groups</span>
              <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase font-medium">Coterie</span>
            </button>
            <button className="flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-all duration-200" style={{ color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined mb-1 text-2xl">casino</span>
              <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase font-medium">Roll</span>
            </button>
          </div>
        </nav>
      </div>
    </Skeleton>
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


function renderSpecs(specs = []) {
  if (!specs.length) return null;
  return <span className={styles.specsText}>({specs.join(', ')})</span>;
}


/* ---------- Ritual/Ceremony row with prereq/recall info ---------- */
function RitualRow({ item, level, cost, owned, allowed, afford, prereqUnmet = [], onBuy }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Determine hint logic
  let hint = '';
  if (owned) hint = 'Known';
  else if (!allowed) hint = `Requires Discipline ${level}`;
  else if (prereqUnmet.length > 0) hint = `Needs: ${prereqUnmet.join(', ')}`;
  else if (!afford) hint = 'Not enough XP';

  return (
    <article className={`${styles.shopCard} ${isExpanded ? styles.shopCardExpanded : ''} ${disabled ? styles.shopCardLocked : ''}`}>
      <div className={styles.shopCardHeader} onClick={() => setIsExpanded(!isExpanded)}>
        <div className={styles.shopCardTitleRow}>
          <div>
            <h2 className={styles.shopCardTitle}>{item.name}</h2>
            <p className={styles.shopCardSubtitle}>Level {level}{item.source ? ` • ${item.source}` : ''}</p>
          </div>
          <span className={`material-symbols-outlined ${styles.expandIcon}`}>expand_more</span>
        </div>

        <div className={styles.shopCardDots}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`${styles.shopDot} ${i < level ? styles.shopDotFilled : ''}`}>
              {i < level - 1 && <span className={styles.shopDotX}>X</span>}
            </div>
          ))}
        </div>

        <div className={styles.shopCardFooter}>
          <span className={styles.shopCardPrice}>{cost} XP</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hint && <span style={{ color: 'rgba(255,180,171, 0.8)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{hint}</span>}
            <button
              className={styles.shopCardAcquireBtn}
              disabled={disabled || working}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmOpen(true);
              }}
            >
              Acquire
            </button>
          </div>
        </div>
      </div>

      <div className={styles.shopCardContent}>
        <div className={styles.shopCardText}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {item.dice_pool && <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}><b>Dice Pool:</b> {item.dice_pool}</span>}
            {item.difficulty && <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}><b>Difficulty:</b> {item.difficulty}</span>}
            {item.prereq && <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}><b>Prereq:</b> {item.prereq}</span>}
          </div>
          {item.effect && <div style={{ marginBottom: '8px' }}><b>Effect:</b> {item.effect}</div>}
          {item.notes && <div>{item.notes}</div>}
          {(!item.effect && !item.notes) && `Learn ${item.name} for ${cost} Experience Points.`}
        </div>
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
    </article>
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

/* ===== Inline Ritual Picker ===== */
function InlineRitualPicker({ type, itemsObj, knownIds, knownPowerNamesAndIds, canLearnFn, onBuy, xp, searchQuery }) {
  const [expandedId, setExpandedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  // Flatten the rituals/ceremonies into a single array
  const fullPool = useMemo(() => {
    const out = [];
    Object.entries(itemsObj || {}).forEach(([lvlStr, list]) => {
      const level = Number(lvlStr);
      list.forEach(rit => out.push({ ...rit, __level: level }));
    });
    out.sort((a, b) => (a.__level - b.__level) || String(a.name).localeCompare(String(b.name)));
    return out;
  }, [itemsObj]);

  const annotated = useMemo(() => {
    let res = fullPool.map(r => {
      const isOwned = knownIds.has(r.id);
      const isAllowed = canLearnFn(r.__level);
      const cost = type === 'blood_sorcery' ? XP_RULES.ritual(r.__level) : XP_RULES.ceremony(r.__level);
      const afford = xp >= cost;
      const { unmet } = ritualPrereqStatus(r, knownPowerNamesAndIds);
      
      const isAvailable = !isOwned && isAllowed && unmet.length === 0;

      return {
        ...r,
        __cost: cost,
        __afford: afford,
        __flags: { owned: isOwned, unmet, allowed: isAllowed },
        __available: isAvailable
      };
    });
    
    if (searchQuery) {
      const q = searchQuery.trim();
      res = msSearchText(res.map(r => r.name), q).map(match => res.find(p => p.name === match.item)).filter(Boolean);
    }
    
    return res;
  }, [fullPool, knownIds, canLearnFn, knownPowerNamesAndIds, xp, type, searchQuery]);

  const confirm = async (sel) => {
    if (!sel || !sel.__available || !sel.__afford) return;
    setSaving(true);
    setSaveErr('');
    try {
      const maybe = onBuy?.(sel, sel.__level, sel.__cost);
      if (maybe && typeof maybe.then === 'function') await maybe;
    } catch (e) {
      setSaveErr(e?.response?.data?.error || e?.message || 'Failed to assign ritual.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {saveErr && <div className={styles.alert} style={{ marginBottom: '16px' }}>{saveErr}</div>}
      {!annotated.length ? (
        <div className={styles.alertWarning}>
          No items found.
        </div>
      ) : (
        annotated.map(r => {
          const isOwned = r.__flags.owned;
          const isAvailable = r.__available;
          const isAfford = r.__afford;
          const isExpanded = expandedId === r.id;

          const cardClass = isOwned ? styles.powerCardOwned
            : (isAvailable ? styles.powerCardAvailable : styles.powerCardRestricted);
            
          const isRestricted = !isAvailable && !isOwned;

          return (
            <div key={r.id} className={cardClass}>
              <div 
                className={styles.powerCardHeaderRow} 
                onClick={() => setExpandedId(isExpanded ? null : r.id)}
                style={{ cursor: 'pointer', marginBottom: isExpanded ? '8px' : '0' }}
              >
                <div>
                  <div className={styles.powerCardTitleWrap}>
                    {isOwned && (
                      <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)', fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    )}
                    {isRestricted && (
                      <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: '16px' }}>lock</span>
                    )}
                    <h3 className={isOwned || isAvailable ? styles.powerCardTitle : styles.powerCardTitleMuted}>
                      {r.name}
                    </h3>
                  </div>
                  <span className={isOwned || isAvailable ? styles.powerCardLevel : styles.powerCardLevelMuted}>
                    Level {r.__level} • {isOwned ? 'Owned' : (isAvailable ? 'Available' : 'Restricted')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   {!isOwned && <span className={styles.shopCardPrice}>{r.__cost} XP</span>}
                   <span 
                     className={`material-symbols-outlined ${styles.expandIcon}`} 
                     style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}
                   >
                     expand_more
                   </span>
                </div>
              </div>

              <div className={styles.shopCardContentWrap} style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}>
                <div className={styles.shopCardContentInner} style={{ padding: 0 }}>
                  <div style={{ paddingTop: '8px', opacity: isExpanded ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                    <div className={isOwned || isAvailable ? styles.powerCardDesc : styles.powerCardDescMuted}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {r.dice_pool && <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}><b>Dice Pool:</b> {r.dice_pool}</span>}
                        {r.difficulty && <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}><b>Difficulty:</b> {r.difficulty}</span>}
                        {r.prereq && <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}><b>Prereq:</b> {r.prereq}</span>}
                      </div>
                      {r.effect && <div style={{ marginBottom: '8px' }}><b>Effect:</b> {r.effect}</div>}
                      {r.notes && <div>{r.notes}</div>}
                      {(!r.effect && !r.notes) && `Learn ${r.name}.`}
                    </div>

                    {isOwned && (
                      <div className={styles.powerCardActiveIndicator}>
                        <span className={styles.powerCardActiveText}>Known</span>
                        <div className={styles.powerCardActiveIcon}>
                          <div className={styles.powerCardActiveDot}></div>
                        </div>
                      </div>
                    )}

                    {isAvailable && (
                      <button
                        className={styles.powerAcquireBtn}
                        onClick={() => confirm(r)}
                        disabled={saving || !isAfford}
                        style={{ marginTop: '12px' }}
                      >
                        {saving ? 'Acquiring...' : (!isAfford ? 'Not Enough XP' : 'Acquire')}
                      </button>
                    )}

                    {isRestricted && (
                      <div className={styles.powerCardWarning}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span>
                        {!r.__flags.allowed && <span>Requires Discipline Level {r.__level}</span>}
                        {r.__flags.unmet.length > 0 && <span>Needs: {r.__flags.unmet.join(', ')}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
/* ===== Inline Discipline Power Picker ===== */
function InlineDisciplinePicker({ cfg, onConfirm, searchQuery }) {
  const {
    name, next, assignOnly, characterClan,
    ownedPowerIds = [], ownedPowerNames = [], ownedPowers = [], disciplineDots = {}
  } = cfg;

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
    let res = fullPool.map(p => {
      const candidates = [
        norm(p?.id), norm(p?.name), norm(p?.slug), norm(p?.key), norm(p?.code), norm(p?.power_id)
      ].filter(Boolean);
      const owned = candidates.some(c => ownedCanon.has(c));

      const unmet = [];
      const clanLockUnmet = p.clan && p.clan !== characterClan;

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
        __flags: { owned, unmet, clanLockUnmet },
        __available: !owned && unmet.length === 0 && !clanLockUnmet,
      };
    });
    
    if (searchQuery) {
      const q = searchQuery.trim();
      res = msSearchText(res.map(p => p.name), q).map(match => res.find(p => p.name === match.item)).filter(Boolean);
    }
    
    return res;
  }, [fullPool, ownedCanon, dotsByDisc, normDisc, parseAmalgam, characterClan, searchQuery]);

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [expandedPowerId, setExpandedPowerId] = useState(null);

  const confirm = async (sel) => {
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
    } catch (e) {
      setSaveErr(e?.response?.data?.error || e?.message || 'Failed to assign power.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {saveErr && <div className={styles.alert} style={{ marginBottom: '16px' }}>{saveErr}</div>}
      {!annotated.length ? (
        <div className={styles.alertWarning}>
          No power data found up to level <b>{next}</b> for <b>{name}</b>.
        </div>
      ) : (
        annotated.map(p => {
          const isOwned = p.__flags.owned;
          const isRestricted = !p.__available && !isOwned;
          const isAvailable = p.__available;
          const isExpanded = expandedPowerId === p.id;

          const cardClass = isOwned ? styles.powerCardOwned
            : (isAvailable ? styles.powerCardAvailable : styles.powerCardRestricted);

          return (
            <div key={p.id} className={cardClass}>
              <div 
                className={styles.powerCardHeaderRow} 
                onClick={() => setExpandedPowerId(isExpanded ? null : p.id)}
                style={{ cursor: 'pointer', marginBottom: isExpanded ? '8px' : '0' }}
              >
                <div>
                  <div className={styles.powerCardTitleWrap}>
                    {isOwned && (
                      <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)', fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    )}
                    {isRestricted && (
                      <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: '16px' }}>lock</span>
                    )}
                    <h3 className={isOwned || isAvailable ? styles.powerCardTitle : styles.powerCardTitleMuted}>
                      {p.name}
                    </h3>
                  </div>
                  <span className={isOwned || isAvailable ? styles.powerCardLevel : styles.powerCardLevelMuted}>
                    Level {p.__level} • {isOwned ? 'Owned' : (isAvailable ? 'Available' : 'Restricted')}
                  </span>
                </div>
                <span 
                  className={`material-symbols-outlined ${styles.expandIcon}`} 
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}
                >
                  expand_more
                </span>
              </div>

              <div className={styles.shopCardContentWrap} style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}>
                <div className={styles.shopCardContentInner} style={{ padding: 0 }}>
                  <div style={{ paddingTop: '8px', opacity: isExpanded ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                    <div className={isOwned || isAvailable ? styles.powerCardDesc : styles.powerCardDescMuted}>
                      <p style={{ marginTop: 0 }}>{p.notes || `Power of ${name} at level ${p.__level}.`}</p>
                      {(p.cost || p.dice_pool || p.duration || p.system || p.amalgam || p.prerequisite) && (
                        <div className={styles.powerDetailGrid}>
                          {p.cost && <div><b style={{ color: 'var(--text-color)' }}>Cost:</b> {p.cost}</div>}
                          {p.dice_pool && <div><b style={{ color: 'var(--text-color)' }}>Dice Pool:</b> {p.dice_pool} {p.opposing_pool && p.opposing_pool !== '—' ? `vs ${p.opposing_pool}` : ''}</div>}
                          {p.duration && <div><b style={{ color: 'var(--text-color)' }}>Duration:</b> {p.duration}</div>}
                          {p.amalgam && <div><b style={{ color: 'var(--text-color)' }}>Amalgam:</b> {p.amalgam}</div>}
                          {p.prerequisite && <div><b style={{ color: 'var(--text-color)' }}>Prerequisite:</b> {p.prerequisite}</div>}
                          {p.system && <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}><b style={{ color: 'var(--text-color)' }}>System:</b> {p.system}</div>}
                        </div>
                      )}
                    </div>

                    {isOwned && (
                      <div className={styles.powerCardActiveIndicator}>
                        <span className={styles.powerCardActiveText}>Power Active</span>
                        <div className={styles.powerCardActiveIcon}>
                          <div className={styles.powerCardActiveDot}></div>
                        </div>
                      </div>
                    )}

                    {isAvailable && (
                      <button
                        className={styles.powerAcquireBtn}
                        onClick={() => confirm(p)}
                        disabled={saving}
                        style={{ marginTop: '12px' }}
                      >
                        {saving ? 'Acquiring...' : 'Acquire Power'}
                      </button>
                    )}

                    {isRestricted && (
                      <div className={styles.powerCardWarning}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span>
                        {p.__flags.clanLockUnmet && <span>Requires Clan: {p.clan}</span>}
                        {Array.isArray(p.__flags.unmet) && p.__flags.unmet.length > 0 && (
                          <span>Needs: {p.__flags.unmet.join(', ')}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ===== Discipline power picker modal ===== */
function DisciplinePowerModal({ cfg, onClose, onConfirm }) {
  const {
    name, next, assignOnly, characterClan,
    ownedPowerIds = [], ownedPowerNames = [], ownedPowers = [], disciplineDots = {}
  } = cfg;

  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    // Slight delay to allow CSS transition to trigger after mount
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => onClose?.(), 300);
  };

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
      const clanLockUnmet = p.clan && p.clan !== characterClan;

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
        __flags: { owned, unmet, clanLockUnmet },
        __available: !owned && unmet.length === 0 && !clanLockUnmet,
      };
    });
  }, [fullPool, ownedCanon, dotsByDisc, normDisc, parseAmalgam, characterClan]);

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  const confirm = async (sel) => {
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
      handleClose();
    } catch (e) {
      setSaveErr(e?.response?.data?.error || e?.message || 'Failed to assign power.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={`${styles.drawerOverlay} ${isOpen ? styles.open : ''}`}
        onClick={(e) => { if (!saving) handleClose(); }}
      />

      <div className={`${styles.disciplineDrawer} ${isOpen ? styles.open : ''}`}>
        <div className={styles.drawerHandleWrap}>
          <div className={styles.drawerHandle}></div>
        </div>

        <div className={styles.drawerHeader}>
          <div>
            <h2 className={styles.drawerTitle}>{name} Powers</h2>
            <p className={styles.drawerSubtitle}>{assignOnly ? 'Select Missing Power' : 'Choose New Power'}</p>
          </div>
          <div className={styles.drawerControls}>
            <button className={styles.drawerClose} onClick={handleClose}>
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className={styles.drawerXpBadge}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)', fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>stars</span>
              <span className={styles.drawerXpBadgeText}>Level {next}</span>
            </div>
          </div>
        </div>

        <div className={styles.drawerContent}>
          {saveErr && <div className={styles.alert} style={{ marginBottom: '16px' }}>{saveErr}</div>}
          {!annotated.length ? (
            <div className={styles.alertWarning}>
              No power data found up to level <b>{next}</b> for <b>{name}</b>.
            </div>
          ) : (
            annotated.map(p => {
              const isOwned = p.__flags.owned;
              const isRestricted = !p.__available && !isOwned;
              const isAvailable = p.__available;

              const cardClass = isOwned ? styles.powerCardOwned
                : (isAvailable ? styles.powerCardAvailable : styles.powerCardRestricted);

              return (
                <div key={p.id} className={cardClass}>
                  <div className={styles.powerCardHeaderRow}>
                    <div>
                      <div className={styles.powerCardTitleWrap}>
                        {isOwned && (
                          <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)', fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        )}
                        {isRestricted && (
                          <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: '16px' }}>lock</span>
                        )}
                        <h3 className={isOwned || isAvailable ? styles.powerCardTitle : styles.powerCardTitleMuted}>
                          {p.name}
                        </h3>
                      </div>
                      <span className={isOwned || isAvailable ? styles.powerCardLevel : styles.powerCardLevelMuted}>
                        Level {p.__level} • {isOwned ? 'Owned' : (isAvailable ? 'Available' : 'Restricted')}
                      </span>
                    </div>
                  </div>

                  <p className={isOwned || isAvailable ? styles.powerCardDesc : styles.powerCardDescMuted}>
                    {p.notes || `Power of ${name} at level ${p.__level}.`}
                    {p.amalgam && <><br /><b>Amalgam:</b> {p.amalgam}</>}
                    {p.prerequisite && <><br /><b>Prerequisite:</b> {p.prerequisite}</>}
                  </p>

                  {isOwned && (
                    <div className={styles.powerCardActiveIndicator}>
                      <span className={styles.powerCardActiveText}>Power Active</span>
                      <div className={styles.powerCardActiveIcon}>
                        <div className={styles.powerCardActiveDot}></div>
                      </div>
                    </div>
                  )}

                  {isAvailable && (
                    <button
                      className={styles.powerAcquireBtn}
                      onClick={() => confirm(p)}
                      disabled={saving}
                    >
                      {saving ? 'Acquiring...' : 'Acquire Power'}
                    </button>
                  )}

                  {isRestricted && (
                    <div className={styles.powerCardWarning}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span>
                      {p.__flags.clanLockUnmet && <span>Requires Clan: {p.clan}</span>}
                      {Array.isArray(p.__flags.unmet) && p.__flags.unmet.length > 0 && (
                        <span>Needs: {p.__flags.unmet.join(', ')}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

/* ---------- Specialty adder ---------- */
function SpecialtyAdder({ xp, onAdd }) {
  const [skill, setSkill] = useState('Academics');
  const [spec, setSpec] = useState('');
  const cost = 3;
  const afford = xp >= cost;

  return (
    <div className={styles.gothicRow}>
      <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: 0 }}>
        <select
          className={styles.input}
          value={skill}
          onChange={e => setSkill(e.target.value)}
          style={{ flex: 1, minWidth: 0 }}
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
          style={{ flex: 2, minWidth: 0 }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span className={styles.gothicCost}>[ COST: {cost} XP ]</span>

        <button
          className={styles.gothicBtn}
          disabled={!afford || !spec.trim()}
          onClick={() => onAdd(skill, spec.trim())}
        >
          Unlock
        </button>
      </div>
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
      <div className={styles.gothicRow}>
        <input
          className={styles.input}
          placeholder="Search merits… (name or category)"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ flex: 1, borderBottom: '1px solid var(--tint)' }}
        />
        <span className={styles.gothicCost}>[ COST: {cost} XP ]</span>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
          className={styles.gothicBtn}
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
          <label className={styles.checkboxRow} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
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