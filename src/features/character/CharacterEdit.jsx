// src/features/character/CharacterEdit.jsx
//
// Dedicated Storyteller/admin editor for an existing character. Deliberately
// its own file and its own route (/admin/character/:id, AdminOnly-guarded)
// : never CharacterView, the player-facing sheet. Sharing that component
// would mean an admin viewing their OWN character at /character could see
// editor-only controls mixed into their normal play view; keeping this
// completely separate means there is no code path by which a player (or an
// admin just playing their character) can ever land on the editable surface
// by accident.
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../core/api';
import styles from '../../styles/CharacterEdit.module.css';
import * as DiscDataNS from '../../data/disciplines';
import { MERITS_AND_FLAWS } from '../../data/merits_flaws';
import { RITUALS } from '../../data/rituals';
import { symlogo, CLAN_HEX as CLAN_COLORS } from '../../data/clans';
import MiniSearch from 'minisearch';
import Inventory from '../inventory/Inventory';
import SwapConfirmModal from './SwapConfirmModal';
import DotRow from './DotRow';
import { parseDotSpec } from './MeritsFlawsPicker';
import { calculateRitualCost } from '../../utils/xpCosts';
import { maxHealth as deriveMaxHealth } from '../../utils/derivedStats';

/* ------------------------------------------------------------------ */
/* Static data / pure helpers (module scope: computed once)          */
/* ------------------------------------------------------------------ */

const ATTR_GROUPS = {
  Physical: ['Strength', 'Dexterity', 'Stamina'],
  Social: ['Charisma', 'Manipulation', 'Composure'],
  Mental: ['Intelligence', 'Wits', 'Resolve'],
};

const SKILL_GROUPS = {
  Physical: ['Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival'],
  Social: ['Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge'],
  Mental: ['Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology'],
};

const DISC_KINDS = [
  { key: 'clan', label: 'Clan (×5/dot)' },
  { key: 'caitiff', label: 'Caitiff (×6/dot)' },
  { key: 'other', label: 'Out-of-Clan (×7/dot)' },
];

const COST = {
  attribute: lvl => lvl * 5,
  skill: lvl => lvl * 3,
  specialty: () => 3,
  discipline: (lvl, kind = 'other') => (kind === 'clan' ? lvl * 5 : kind === 'caitiff' ? lvl * 6 : lvl * 7),
  meritDot: () => 3,
  flawDot: () => -3,
};

const ALL_DISCIPLINE_NAMES =
  Array.isArray(DiscDataNS.ALL_DISCIPLINE_NAMES) && DiscDataNS.ALL_DISCIPLINE_NAMES.length
    ? DiscDataNS.ALL_DISCIPLINE_NAMES
    : Object.keys(DiscDataNS.DISCIPLINES || {});

function deepClone(x) {
  try { return structuredClone(x); } catch { return JSON.parse(JSON.stringify(x || {})); }
}

function sumStepCost(oldV, newV, stepFn) {
  let t = 0;
  if (newV > oldV) { for (let l = oldV + 1; l <= newV; l++) t += stepFn(l); }
  else if (newV < oldV) { for (let l = oldV; l > newV; l--) t -= stepFn(l); }
  return t;
}

function bulletCount(s) { return String(s || '').split('').filter(ch => ch === '•').length; }

// Ratings a catalog merit/flaw permits. parseDotSpec narrows open-ended
// specs ("• +") to their minimum for character creation; the editor accepts
// any rating from that minimum up.
function allowedDots(spec) {
  const s = String(spec || '').trim();
  if (/\+\s*$/.test(s)) {
    const min = Math.max(1, bulletCount(s));
    return Array.from({ length: 6 - min }, (_, i) => min + i);
  }
  return parseDotSpec(s);
}

function normalizeDotsInput(v) {
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return Math.min(5, Math.max(1, n));
  const bc = bulletCount(String(v));
  return bc > 0 ? Math.min(5, bc) : 1;
}

// Flattened merit/flaw catalog for search/select pickers.
function flattenMF() {
  const out = [];
  Object.entries(MERITS_AND_FLAWS).forEach(([cat, payload]) => {
    (payload?.merits || []).forEach(m => out.push({ ...m, type: 'merit', category: cat }));
    (payload?.flaws || []).forEach(f => out.push({ ...f, type: 'flaw', category: cat }));
    if (payload?.groups) {
      Object.entries(payload.groups).forEach(([sub, g]) => {
        (g.merits || []).forEach(m => out.push({ ...m, type: 'merit', category: `${cat} / ${sub}` }));
        (g.flaws || []).forEach(f => out.push({ ...f, type: 'flaw', category: `${cat} / ${sub}` }));
      });
    }
  });
  return out;
}
const MF_CATALOG = flattenMF();
const MERIT_CATALOG = MF_CATALOG.filter(x => x.type === 'merit');
const FLAW_CATALOG = MF_CATALOG.filter(x => x.type === 'flaw');

// Canonical ritual entries per path, in the same {id, name, level} shape the
// player sheet writes (CharacterView buy flow) and reads (RitualsDisplaySection
// looks up details by id and sorts on level/name).
const RITUAL_CATALOG = { blood_sorcery: [], oblivion: [] };
Object.keys(RITUAL_CATALOG).forEach(path => {
  Object.entries(RITUALS?.[path]?.levels || {}).forEach(([lvl, list]) => {
    (list || []).forEach(r => RITUAL_CATALOG[path].push({ id: r.id, name: r.name, level: Number(lvl) }));
  });
  RITUAL_CATALOG[path].sort((a, b) => a.name.localeCompare(b.name));
});
const ALL_BS_RITUALS = RITUAL_CATALOG.blood_sorcery.map(r => r.name);
const ALL_OB_CEREMONIES = RITUAL_CATALOG.oblivion.map(r => r.name);

function findRitual(path, key) {
  const k = String(key || '').trim().toLowerCase();
  if (!k) return null;
  return RITUAL_CATALOG[path]?.find(r => String(r.id).toLowerCase() === k || r.name.toLowerCase() === k) || null;
}

// Resolve any stored shape (canonical object, bare name string, partial
// object) to a full {id, name, level} entry; unknown custom rituals keep
// their name with whatever level they had.
function toRitualEntry(path, r) {
  if (!r) return null;
  const obj = typeof r === 'object' ? r : { name: String(r) };
  const found = findRitual(path, obj.id) || findRitual(path, obj.name);
  if (found) return { ...found };
  const name = String(obj.name || obj.id || '').trim();
  return name ? { id: obj.id ?? name, name, level: Number(obj.level) || 0 } : null;
}

function ritualEffect(path, id) {
  for (const list of Object.values(RITUALS?.[path]?.levels || {})) {
    const r = (list || []).find(x => x.id === id);
    if (r) return r.effect || r.description || '';
  }
  return '';
}

function getPowersForDiscipline(discName) {
  const d = DiscDataNS.DISCIPLINES?.[discName];
  if (!d?.levels) return [];
  const list = [];
  Object.entries(d.levels).forEach(([lvl, powers]) => {
    (powers || []).forEach(p => list.push({ level: Number(lvl), name: p.name, id: p.id }));
  });
  return list;
}

/** Shape-safety pass: same normalization the sheet has always needed
 * regardless of which surface edits it (arrays-as-objects, missing
 * sub-objects, legacy touchstone strings, etc). */
function normalizeSheet(s) {
  const sheet = deepClone(s || {});
  sheet.attributes = sheet.attributes && typeof sheet.attributes === 'object' ? sheet.attributes : {};

  if (Array.isArray(sheet.skills)) {
    const obj = {};
    sheet.skills.forEach(x => { if (x?.name) obj[x.name] = { dots: Number(x.dots || 0), specialties: Array.isArray(x.specialties) ? x.specialties : [] }; });
    sheet.skills = obj;
  } else {
    sheet.skills = sheet.skills && typeof sheet.skills === 'object' ? sheet.skills : {};
  }

  if (Array.isArray(sheet.disciplines)) {
    const obj = {};
    sheet.disciplines.forEach(x => {
      if (!x) return;
      if (typeof x === 'string') obj[x] = 0;
      else if (x.name) obj[x.name] = Number(x.level || x.dots || x.value || 0);
    });
    sheet.disciplines = obj;
  } else if (sheet.disciplines && typeof sheet.disciplines === 'object') {
    const obj = {};
    Object.entries(sheet.disciplines).forEach(([k, v]) => {
      obj[k] = v && typeof v === 'object' ? Number(v.level || v.dots || v.value || 0) : Number(v || 0);
    });
    sheet.disciplines = obj;
  } else {
    sheet.disciplines = {};
  }

  const rawPowers = sheet.disciplinePowers && typeof sheet.disciplinePowers === 'object' && !Array.isArray(sheet.disciplinePowers) ? sheet.disciplinePowers : {};
  const dpOut = {};
  Object.entries(rawPowers).forEach(([discName, list]) => {
    const arr = Array.isArray(list) ? list : (list && typeof list === 'object' ? [list] : []);
    dpOut[discName] = arr.map(p => {
      if (!p) return null;
      if (typeof p === 'string') return { id: p, name: p, level: 0 };
      const name = typeof p.name === 'string' ? p.name : (typeof p.name?.name === 'string' ? p.name.name : '');
      const id = (typeof p.id === 'string' || typeof p.id === 'number') ? p.id : (typeof p.id?.id !== 'undefined' ? p.id.id : undefined);
      const level = Number((typeof p.level === 'object' ? p.level?.level : p.level) || 0);
      return { id, name, level };
    }).filter(Boolean);
  });
  sheet.disciplinePowers = dpOut;

  // Rituals/ceremonies are {id, name, level} objects: that's what the player
  // sheet buys and what RitualsDisplaySection needs (id for details, level +
  // name for sorting). Older editor saves stored bare name strings, so
  // upgrade those back to full entries here.
  sheet.rituals = sheet.rituals || { blood_sorcery: [], oblivion: [] };
  ['blood_sorcery', 'oblivion'].forEach(path => {
    sheet.rituals[path] = (Array.isArray(sheet.rituals[path]) ? sheet.rituals[path] : [])
      .map(r => toRitualEntry(path, r))
      .filter(Boolean);
  });

  sheet.convictions = Array.isArray(sheet.convictions) ? sheet.convictions : [];
  sheet.touchstones = Array.isArray(sheet.touchstones)
    ? sheet.touchstones.map(t => {
        if (!t) return { name: '', conviction: '', background: '' };
        if (typeof t === 'object') return { name: t.name || t.title || '', conviction: t.conviction || '', background: t.background || t.description || '' };
        const idx = String(t).search(/[:\-]/);
        return idx !== -1
          ? { name: String(t).slice(0, idx).trim(), conviction: '', background: String(t).slice(idx + 1).trim() }
          : { name: String(t).trim(), conviction: '', background: '' };
      })
    : [];

  sheet.advantages = sheet.advantages || { merits: [], flaws: [] };
  sheet.advantages.merits = Array.isArray(sheet.advantages.merits) ? sheet.advantages.merits : [];
  sheet.advantages.flaws = Array.isArray(sheet.advantages.flaws) ? sheet.advantages.flaws : [];
  sheet.backgrounds = Array.isArray(sheet.backgrounds) ? sheet.backgrounds : [];

  return sheet;
}

// Every one of these renders on the page at once (see body layout): this
// list only drives the jump-nav and its scroll-spy highlight, it never hides
// a section the way the old tab-switcher did.
const NAV_SECTIONS = [
  { id: 'identity', label: 'Identity & Vitals', icon: 'badge' },
  { id: 'trackers', label: 'Trackers', icon: 'monitor_heart' },
  { id: 'attributes', label: 'Attributes', icon: 'fitness_center' },
  { id: 'skills', label: 'Skills', icon: 'school' },
  { id: 'disciplines', label: 'Disciplines', icon: 'bolt' },
  { id: 'merits', label: 'Merits', icon: 'star' },
  { id: 'backgrounds', label: 'Backgrounds', icon: 'home' },
  { id: 'flaws', label: 'Flaws', icon: 'warning' },
  { id: 'rituals', label: 'Rituals & Ceremonies', icon: 'auto_awesome' },
  { id: 'touchstones', label: 'Touchstones & Convictions', icon: 'anchor' },
  { id: 'inventory', label: 'Inventory', icon: 'backpack' },
  { id: 'json', label: 'Advanced: Raw JSON', icon: 'code' },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function CharacterEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const ownerLabel = location.state?.owner;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [character, setCharacter] = useState(null);

  const [originalSheet, setOriginalSheet] = useState({});
  const [draftSheet, setDraftSheet] = useState({});
  const [charName, setCharName] = useState('');
  const [charClan, setCharClan] = useState('');
  const [origName, setOrigName] = useState('');
  const [origClan, setOrigClan] = useState('');
  const [discKinds, setDiscKinds] = useState({});

  const [activeAnchor, setActiveAnchor] = useState(NAV_SECTIONS[0].id);
  const contentRef = useRef(null);
  const [editMode, setEditMode] = useState('xp');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');

  const [jsonText, setJsonText] = useState('');
  const [jsonErr, setJsonErr] = useState('');
  const jsonInitRef = useRef(false);

  // { kind, oldItem: {name, description?}, catalog: [{id,label,payload}], apply: fn(payload) }
  const [swap, setSwap] = useState(null);
  const [swapPick, setSwapPick] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const { data } = await api.get(`/characters/user/${id}`);
        const ch = data.character;
        if (!ch) { if (!cancelled) setLoadError('Character not found.'); return; }
        const normalized = normalizeSheet(ch.sheet || {});
        if (cancelled) return;

        setCharacter(ch);
        setOriginalSheet(normalized);
        setDraftSheet(deepClone(normalized));
        setCharName(ch.name || ''); setOrigName(ch.name || '');
        setCharClan(ch.clan || ''); setOrigClan(ch.clan || '');

        const kinds = {};
        Object.keys(normalized.disciplines || {}).forEach(k => {
          const info = DiscDataNS.DISCIPLINES?.[k];
          if (ch.clan === 'Caitiff') kinds[k] = 'caitiff';
          else if (info && Array.isArray(info.clan_affinity) && info.clan_affinity.includes(ch.clan)) kinds[k] = 'clan';
          else kinds[k] = 'other';
        });
        setDiscKinds(kinds);
      } catch (e) {
        if (!cancelled) setLoadError(e.response?.data?.error || 'Failed to load character.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Seed the JSON textarea once, when the character first loads, not on
  // every draft edit elsewhere, or typing in the textarea would constantly
  // fight in-flight state updates from other sections. "Sync from Draft" in
  // that section re-syncs it on demand instead.
  useEffect(() => {
    if (!jsonInitRef.current && character) {
      setJsonText(JSON.stringify(draftSheet, null, 2));
      jsonInitRef.current = true;
    }
  }, [character, draftSheet]);

  // Scroll-spy: every section is always rendered (nothing is hidden behind a
  // tab), so the sidebar just needs to know which one is currently in view.
  useEffect(() => {
    const root = contentRef.current;
    if (!root || loading) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length > 0) setActiveAnchor(visible[0].target.id);
    }, { root, rootMargin: '-10% 0px -70% 0px', threshold: 0 });
    NAV_SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [loading]);

  const goToSection = (anchorId) => {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateDraft = useCallback((mutator) => {
    setDraftSheet(prev => {
      const next = deepClone(prev);
      mutator(next);
      return next;
    });
  }, []);

  /* ---------------- field setters ---------------- */

  const setField = (key, val) => updateDraft(d => { d[key] = val; });

  const updateTracker = (category, field, delta) => updateDraft(d => {
    if (category === 'hunger') { d.hunger = Math.max(0, Math.min(5, (d.hunger || 0) + delta)); return; }
    if (category === 'humanity') {
      if (field === 'value') {
        const cur = d.morality?.humanity ?? d.humanity ?? 7;
        const next = Math.max(0, Math.min(10, cur + delta));
        d.humanity = next;
        d.morality = d.morality || {};
        d.morality.humanity = next;
      } else if (field === 'stains') {
        d.stains = Math.max(0, Math.min(10, (d.stains || 0) + delta));
      }
      return;
    }
    d[category] = d[category] || {};
    d[category][field] = Math.max(0, (d[category][field] || 0) + delta);
  });

  const setAttr = (name, val) => updateDraft(d => {
    d.attributes = d.attributes || {};
    d.attributes[name] = Math.max(0, Math.min(5, Number(val) || 0));
  });

  const setSkillDots = (name, val) => updateDraft(d => {
    d.skills = d.skills || {};
    const base = d.skills[name] || { dots: 0, specialties: [] };
    d.skills[name] = { ...base, dots: Math.max(0, Math.min(5, Number(val) || 0)) };
  });
  const setSkillSpecsCSV = (name, csv) => updateDraft(d => {
    d.skills = d.skills || {};
    const base = d.skills[name] || { dots: 0, specialties: [] };
    base.specialties = csv.split(',').map(s => s.trim()).filter(Boolean);
    d.skills[name] = base;
  });
  // Only offered for skills outside the standard 27 (the "Custom" group):
  // deleting a standard skill doesn't make sense, you'd just zero its dots.
  // This is also the way to clear out a bogus key like "Craft/traps" left
  // over from old data (see normalizeFromFlatAny's ':'-only specialty parse).
  const removeSkill = (name) => updateDraft(d => { if (d.skills) delete d.skills[name]; });

  const setDisciplineDots = (name, val) => updateDraft(d => {
    d.disciplines = d.disciplines || {};
    // V5 hard cap: 5, same as attributes/skills above — there's no power
    // data past level 5 (see disciplines.js), so a 6th dot here breaks the
    // player's own power picker into a permanent reopen loop.
    d.disciplines[name] = Math.max(0, Math.min(5, Number(val) || 0));
  });
  const addDiscipline = (name) => {
    const n = name.trim();
    if (!n) return;
    updateDraft(d => { d.disciplines = d.disciplines || {}; if (!(n in d.disciplines)) d.disciplines[n] = 0; });
    setDiscKinds(prev => ({ ...prev, [n]: prev[n] || 'other' }));
  };
  const removeDiscipline = (name) => {
    updateDraft(d => { if (d.disciplines) delete d.disciplines[name]; if (d.disciplinePowers) delete d.disciplinePowers[name]; });
    setDiscKinds(prev => { const n = { ...prev }; delete n[name]; return n; });
  };
  const addPower = (discName, power) => updateDraft(d => {
    d.disciplinePowers = d.disciplinePowers || {};
    d.disciplinePowers[discName] = d.disciplinePowers[discName] || [];
    d.disciplinePowers[discName].push({ level: power.level, name: power.name, id: power.id });
  });
  const removePower = (discName, idx) => updateDraft(d => {
    const list = d.disciplinePowers?.[discName];
    if (Array.isArray(list)) list.splice(idx, 1);
  });
  const swapPower = (discName, idx, power) => updateDraft(d => {
    const list = d.disciplinePowers?.[discName];
    if (Array.isArray(list) && list[idx]) list[idx] = { level: power.level, name: power.name, id: power.id };
  });

  const currentAdvList = (kind) => (kind === 'backgrounds' ? draftSheet.backgrounds : draftSheet.advantages?.[kind]) || [];
  const addAdvantage = (kind, entry) => updateDraft(d => {
    if (kind === 'backgrounds') { d.backgrounds = Array.isArray(d.backgrounds) ? d.backgrounds : []; d.backgrounds.push(entry); }
    else { d.advantages = d.advantages || { merits: [], flaws: [] }; d.advantages[kind] = Array.isArray(d.advantages[kind]) ? d.advantages[kind] : []; d.advantages[kind].push(entry); }
  });
  const removeAdvantage = (kind, idx) => updateDraft(d => {
    const arr = kind === 'backgrounds' ? d.backgrounds : d.advantages?.[kind];
    if (Array.isArray(arr)) arr.splice(idx, 1);
  });
  const setAdvantageDots = (kind, idx, dots) => updateDraft(d => {
    const arr = kind === 'backgrounds' ? d.backgrounds : d.advantages?.[kind];
    if (Array.isArray(arr) && arr[idx]) arr[idx] = { ...arr[idx], dots: normalizeDotsInput(dots) };
  });
  // A swap is a brand-new advantage: drop the old entry's player-written
  // `desc` override (the sheet shows it instead of the catalog description)
  // and its `notes` (Mystic of the Void picks, retainer JSON, …), which
  // belong to the old item. Dots carry over only when the new item's rating
  // allows them; otherwise take its minimum.
  const swapAdvantage = (kind, idx, item) => updateDraft(d => {
    const arr = kind === 'backgrounds' ? d.backgrounds : d.advantages?.[kind];
    if (!Array.isArray(arr) || !arr[idx]) return;
    const allowed = allowedDots(item.dots);
    const oldDots = Number(arr[idx].dots) || 1;
    const dots = !allowed.length || allowed.includes(oldDots) ? oldDots : allowed[0];
    arr[idx] = { id: item.id, name: item.name, dots };
  });

  const addRitual = (path, name) => {
    const entry = toRitualEntry(path, name.trim());
    if (!entry) return;
    updateDraft(d => { d.rituals = d.rituals || { blood_sorcery: [], oblivion: [] }; d.rituals[path] = Array.isArray(d.rituals[path]) ? d.rituals[path] : []; d.rituals[path].push(entry); });
  };
  const removeRitual = (path, idx) => updateDraft(d => { const list = d.rituals?.[path]; if (Array.isArray(list)) list.splice(idx, 1); });
  const swapRitual = (path, idx, ritual) => updateDraft(d => { const list = d.rituals?.[path]; if (Array.isArray(list) && list[idx]) list[idx] = { id: ritual.id, name: ritual.name, level: ritual.level }; });

  const addConviction = (text) => { if (!text.trim()) return; updateDraft(d => { d.convictions = Array.isArray(d.convictions) ? d.convictions : []; d.convictions.push(text.trim()); }); };
  const updateConviction = (i, text) => updateDraft(d => { d.convictions[i] = text; });
  const removeConviction = (i) => updateDraft(d => { d.convictions.splice(i, 1); });

  const addTouchstone = (name, conviction, background) => {
    if (!name.trim() && !background.trim()) return;
    updateDraft(d => { d.touchstones = Array.isArray(d.touchstones) ? d.touchstones : []; d.touchstones.push({ name: name.trim(), conviction: conviction.trim(), background: background.trim() }); });
  };
  const updateTouchstone = (i, patch) => updateDraft(d => { d.touchstones[i] = { ...d.touchstones[i], ...patch }; });
  const removeTouchstone = (i) => updateDraft(d => { d.touchstones.splice(i, 1); });

  /* ---------------- swap modal ---------------- */

  const closeSwap = () => { setSwap(null); setSwapPick(''); };
  const confirmSwap = () => {
    const picked = swap?.catalog.find(c => c.id === swapPick);
    if (!picked) return;
    swap.apply(picked.payload);
    closeSwap();
  };

  const openPowerSwap = (discName, idx) => {
    const list = draftSheet.disciplinePowers?.[discName] || [];
    const old = list[idx];
    const known = new Set(list.map(p => String(p.id || p.name || '').toLowerCase()));
    const dots = Number(draftSheet.disciplines?.[discName] || 0);
    const catalog = getPowersForDiscipline(discName)
      .filter(p => p.level <= dots && !known.has(String(p.id || p.name || '').toLowerCase()))
      .map(p => ({ id: p.id || p.name, label: `${p.name} (Level ${p.level})`, payload: p }));
    setSwap({ kind: 'Discipline Power', oldItem: { name: old?.name || old?.id || 'Unknown power' }, catalog, apply: (p) => swapPower(discName, idx, p) });
  };

  const openAdvantageSwap = (kind, idx) => {
    const arr = currentAdvList(kind);
    const old = arr[idx];
    const source = kind === 'flaws' ? FLAW_CATALOG : MERIT_CATALOG;
    const catalog = source.map(it => ({ id: it.id, label: `${it.name} : ${it.category}`, payload: it }));
    const oldDetails = MF_CATALOG.find(x => x.id === old?.id);
    const label = kind === 'flaws' ? 'Flaw' : kind === 'backgrounds' ? 'Background' : 'Merit';
    setSwap({ kind: label, oldItem: { name: old?.name || old?.id, description: oldDetails?.description }, catalog, apply: (it) => swapAdvantage(kind, idx, it) });
  };

  const openRitualSwap = (path, idx) => {
    const list = draftSheet.rituals?.[path] || [];
    const old = list[idx];
    const known = new Set(list.map(r => String(r.id).toLowerCase()));
    const catalog = RITUAL_CATALOG[path]
      .filter(r => !known.has(String(r.id).toLowerCase()))
      .map(r => ({ id: r.id, label: `${r.name} (Level ${r.level})`, payload: { ...r, description: ritualEffect(path, r.id) } }));
    setSwap({ kind: path === 'blood_sorcery' ? 'Ritual' : 'Ceremony', oldItem: { name: old?.name, description: ritualEffect(path, old?.id) }, catalog, apply: (p) => swapRitual(path, idx, p) });
  };

  const swapNewItem = swap ? (swap.catalog.find(c => c.id === swapPick)?.payload || null) : null;

  /* ---------------- XP impact ---------------- */

  const xpImpactRaw = useMemo(() => {
    let delta = 0;
    const oA = originalSheet.attributes || {}, nA = draftSheet.attributes || {};
    new Set([...Object.keys(oA), ...Object.keys(nA)]).forEach(k => {
      delta += sumStepCost(Number(oA[k] || 0), Number(nA[k] || 0), l => COST.attribute(l));
    });

    const oS = originalSheet.skills || {}, nS = draftSheet.skills || {};
    new Set([...Object.keys(oS), ...Object.keys(nS)]).forEach(k => {
      delta += sumStepCost(Number(oS[k]?.dots || 0), Number(nS[k]?.dots || 0), l => COST.skill(l));
      const oldSpecs = Array.isArray(oS[k]?.specialties) ? oS[k].specialties : [];
      const newSpecs = Array.isArray(nS[k]?.specialties) ? nS[k].specialties : [];
      delta += Math.max(0, newSpecs.length - oldSpecs.length) * COST.specialty();
      delta -= Math.max(0, oldSpecs.length - newSpecs.length) * COST.specialty();
    });

    const oD = originalSheet.disciplines || {}, nD = draftSheet.disciplines || {};
    new Set([...Object.keys(oD), ...Object.keys(nD)]).forEach(k => {
      const kind = discKinds[k] || 'other';
      delta += sumStepCost(Number(oD[k] || 0), Number(nD[k] || 0), l => COST.discipline(l, kind));
    });

    const diffByKey = (oldArr, newArr, costFn) => {
      const indexed = arr => {
        const m = new Map();
        arr.forEach((it, i) => m.set(String(it.id || it.name || `idx_${i}`).toLowerCase(), it));
        return m;
      };
      const oldMap = indexed(oldArr), newMap = indexed(newArr);
      let d = 0;
      oldMap.forEach((item, key) => {
        const oDots = Number(item?.dots || 0);
        if (newMap.has(key)) d += (Number(newMap.get(key)?.dots || 0) - oDots) * costFn();
        else d -= oDots * costFn();
      });
      newMap.forEach((item, key) => { if (!oldMap.has(key)) d += Number(item?.dots || 0) * costFn(); });
      return d;
    };
    delta += diffByKey(originalSheet?.advantages?.merits || [], draftSheet?.advantages?.merits || [], COST.meritDot);
    delta += diffByKey(originalSheet?.backgrounds || [], draftSheet?.backgrounds || [], COST.meritDot);
    delta += diffByKey(originalSheet?.advantages?.flaws || [], draftSheet?.advantages?.flaws || [], COST.flawDot);

    // Rituals/ceremonies: a gained one costs its level x3, a lost one refunds
    // it (a swap is both). Counted per id so duplicates net out correctly.
    ['blood_sorcery', 'oblivion'].forEach(path => {
      const counts = new Map();
      const tally = (list, sign) => (list || []).forEach(r => {
        const key = String(r.id).toLowerCase();
        const cur = counts.get(key) || { level: Number(r.level) || 0, n: 0 };
        cur.n += sign;
        counts.set(key, cur);
      });
      tally(originalSheet.rituals?.[path], -1);
      tally(draftSheet.rituals?.[path], 1);
      counts.forEach(({ level, n }) => { delta += n * calculateRitualCost(level); });
    });
    return delta;
  }, [originalSheet, draftSheet, discKinds]);

  const xpImpact = useMemo(() => {
    if (editMode === 'free') return 0;
    if (editMode === 'refund') return Math.min(0, xpImpactRaw);
    return xpImpactRaw;
  }, [editMode, xpImpactRaw]);

  const isDirty = useMemo(
    () => JSON.stringify(draftSheet) !== JSON.stringify(originalSheet) || charName !== origName || charClan !== origClan,
    [draftSheet, originalSheet, charName, origName, charClan, origClan]
  );

  /* ---------------- save / discard ---------------- */

  async function handleSave() {
    setSaveErr(''); setSaveMsg('');
    setSaving(true);
    try {
      if (xpImpact !== 0) {
        const sign = xpImpact > 0 ? 'spend' : 'refund';
        const reason = window.prompt(`This will ${sign} ${Math.abs(xpImpact)} XP. Enter a reason for the audit log:`, 'Character Editor update');
        if (reason === null) { setSaving(false); return; }
        await api.patch(`/admin/characters/${id}/xp`, { delta: -xpImpact, reason });
      }
      await api.patch(`/admin/characters/${id}`, { name: charName, clan: charClan, sheet: draftSheet });

      setOriginalSheet(deepClone(draftSheet));
      setOrigName(charName); setOrigClan(charClan);
      setCharacter(prev => (prev ? { ...prev, name: charName, clan: charClan, xp: (prev.xp || 0) - xpImpact } : prev));
      setSaveMsg('Saved.');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e) {
      setSaveErr(e.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (!isDirty) return;
    if (!window.confirm('Discard all unsaved changes?')) return;
    setDraftSheet(deepClone(originalSheet));
    setCharName(origName); setCharClan(origClan);
    setSaveErr(''); setSaveMsg('');
  }

  function applyJson() {
    try {
      const parsed = normalizeSheet(JSON.parse(jsonText));
      setDraftSheet(parsed);
      setJsonErr('');
    } catch (e) {
      setJsonErr('Invalid JSON: fix the syntax before applying.');
    }
  }

  /* ---------------- render: loading / error ---------------- */

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.centerState}>
          <div className={styles.spinner} />
          <div>Loading character sheet…</div>
        </div>
      </div>
    );
  }

  if (loadError || !character) {
    return (
      <div className={styles.page}>
        <div className={styles.centerState}>
          <div className={styles.errorBox}>
            <div style={{ marginBottom: 12 }}>{loadError || 'Character not found.'}</div>
            <button className={styles.btnGhost} onClick={() => navigate('/admin?tab=characters')}>Back to Characters</button>
          </div>
        </div>
      </div>
    );
  }

  const clanColor = CLAN_COLORS[charClan] || 'var(--accent-purple)';
  const clanLogo = symlogo(charClan);

  return (
    <div className={styles.page}>
      <div className={styles.banner}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit_note</span>
        Storyteller Character Editor: changes are not visible to the player until you Save
      </div>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backLink} onClick={() => navigate('/admin?tab=characters')}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            Characters
          </button>
          <span className={styles.headerName}>{charName || 'Unnamed'}</span>
          {charClan && <span className={styles.headerClanPill} style={{ background: clanColor }}>{charClan}</span>}
          {clanLogo && <img src={clanLogo} alt="" style={{ width: 24, height: 24, opacity: 0.7, filter: 'brightness(0) invert(1)' }} />}
        </div>
        <div className={styles.headerMeta}>
          <span>Owner: <b>{ownerLabel || `User #${character.user_id}`}</b></span>
          <span>XP: <b>{character.xp ?? 0}</b></span>
          {isDirty && <span className={styles.dangerText}>Unsaved changes</span>}
        </div>
      </div>

      <div className={styles.body}>
        <nav className={styles.sidebar}>
          {NAV_SECTIONS.map(s => (
            <button
              key={s.id}
              className={`${styles.navItem} ${activeAnchor === s.id ? styles.navItemActive : ''}`}
              onClick={() => goToSection(s.id)}
            >
              <span className={`material-symbols-outlined ${styles.navItemIcon}`}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>

        <div className={styles.content} ref={contentRef}>
          <div className={styles.contentInner}>
            {saveErr && <div className={styles.dangerText} style={{ marginBottom: 16 }}>{saveErr}</div>}
            {saveMsg && <div style={{ color: 'var(--color-success, #4caf50)', marginBottom: 16 }}>{saveMsg}</div>}

            <div className={styles.dashboardGrid}>
              <section id="identity" className={`${styles.sectionCard} ${styles.gridSpan2}`}>
                <IdentitySection
                  charName={charName} setCharName={setCharName}
                  charClan={charClan} setCharClan={setCharClan}
                  sheet={draftSheet} setField={setField}
                />
              </section>

              <section id="trackers" className={styles.sectionCard}>
                <TrackersSection sheet={draftSheet} updateTracker={updateTracker} />
              </section>

              <section id="attributes" className={styles.sectionCard}>
                <AttributesSection sheet={draftSheet} setAttr={setAttr} />
              </section>

              <section id="skills" className={`${styles.sectionCard} ${styles.gridSpan2}`}>
                <SkillsSection sheet={draftSheet} setSkillDots={setSkillDots} setSkillSpecsCSV={setSkillSpecsCSV} removeSkill={removeSkill} />
              </section>

              <section id="disciplines" className={`${styles.sectionCard} ${styles.gridSpan2}`}>
                <DisciplinesSection
                  sheet={draftSheet}
                  discKinds={discKinds}
                  setDiscKinds={setDiscKinds}
                  setDisciplineDots={setDisciplineDots}
                  addDiscipline={addDiscipline}
                  removeDiscipline={removeDiscipline}
                  addPower={addPower}
                  removePower={removePower}
                  openPowerSwap={openPowerSwap}
                />
              </section>

              <section id="merits" className={styles.sectionCard}>
                <AdvantageSection
                  title="Merits"
                  kind="merits"
                  items={currentAdvList('merits')}
                  catalog={MERIT_CATALOG}
                  onAdd={(item, dots) => addAdvantage('merits', { id: item.id, name: item.name, dots })}
                  onRemove={(i) => removeAdvantage('merits', i)}
                  onDots={(i, d) => setAdvantageDots('merits', i, d)}
                  onSwap={(i) => openAdvantageSwap('merits', i)}
                />
              </section>

              <section id="flaws" className={styles.sectionCard}>
                <AdvantageSection
                  title="Flaws"
                  kind="flaws"
                  items={currentAdvList('flaws')}
                  catalog={FLAW_CATALOG}
                  onAdd={(item, dots) => addAdvantage('flaws', { id: item.id, name: item.name, dots })}
                  onRemove={(i) => removeAdvantage('flaws', i)}
                  onDots={(i, d) => setAdvantageDots('flaws', i, d)}
                  onSwap={(i) => openAdvantageSwap('flaws', i)}
                />
              </section>

              <section id="backgrounds" className={styles.sectionCard}>
                <AdvantageSection
                  title="Backgrounds"
                  kind="backgrounds"
                  items={currentAdvList('backgrounds')}
                  catalog={MERIT_CATALOG}
                  onAdd={(item, dots) => addAdvantage('backgrounds', { id: item.id, name: item.name, dots })}
                  onRemove={(i) => removeAdvantage('backgrounds', i)}
                  onDots={(i, d) => setAdvantageDots('backgrounds', i, d)}
                  onSwap={(i) => openAdvantageSwap('backgrounds', i)}
                />
              </section>

              <section id="rituals" className={styles.sectionCard}>
                <RitualsSection
                  sheet={draftSheet}
                  addRitual={addRitual}
                  removeRitual={removeRitual}
                  openRitualSwap={openRitualSwap}
                />
              </section>

              <section id="touchstones" className={`${styles.sectionCard} ${styles.gridSpan2}`}>
                <TouchstonesSection
                  sheet={draftSheet}
                  addConviction={addConviction} updateConviction={updateConviction} removeConviction={removeConviction}
                  addTouchstone={addTouchstone} updateTouchstone={updateTouchstone} removeTouchstone={removeTouchstone}
                />
              </section>

              <section id="inventory" className={`${styles.sectionCard} ${styles.gridSpan2}`}>
                <h2 className={styles.contentTitle}>Inventory</h2>
                <p className={styles.contentHint}>Inventory items save instantly: they're a separate record, not part of the Save bar below.</p>
                <Inventory characterId={character.id} />
              </section>

              <section id="json" className={`${styles.sectionCard} ${styles.gridSpan2}`}>
                <details>
                  <summary className={styles.contentTitle} style={{ cursor: 'pointer', display: 'list-item' }}>Advanced: Raw Sheet JSON</summary>
                  <p className={styles.contentHint}>For anything not covered above. "Apply to Draft" stages it into the editor: you still need Save below to persist it.</p>
                  <div style={{ marginBottom: 10 }}>
                    <button className={styles.smallBtn} onClick={() => { setJsonText(JSON.stringify(draftSheet, null, 2)); setJsonErr(''); }}>
                      Sync from Current Draft
                    </button>
                  </div>
                  <textarea
                    className={styles.textarea}
                    style={{ width: '100%', minHeight: '40vh', fontFamily: "'Fira Code', monospace", fontSize: '0.82rem' }}
                    value={jsonText}
                    onChange={e => setJsonText(e.target.value)}
                    spellCheck={false}
                  />
                  {jsonErr && <div className={styles.dangerText} style={{ marginTop: 8 }}>{jsonErr}</div>}
                  <div style={{ marginTop: 12 }}>
                    <button className={styles.smallBtn} onClick={applyJson}>Apply to Draft</button>
                  </div>
                </details>
              </section>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.saveBar}>
        <div className={styles.modeToggle} title="How Save applies XP for changes above">
          {[{ k: 'xp', l: 'XP Mode' }, { k: 'refund', l: 'Refund Mode' }, { k: 'free', l: 'Free Edit' }].map(m => (
            <button
              key={m.k}
              className={`${styles.modeBtn} ${editMode === m.k ? styles.modeBtnActive : ''}`}
              onClick={() => setEditMode(m.k)}
            >
              {m.l}
            </button>
          ))}
        </div>

        <div className={styles.impactText}>
          {editMode === 'free' ? 'No XP charged (Free Edit)' : xpImpact === 0 ? 'No XP impact' : (
            xpImpact > 0
              ? <span className={styles.impactSpend}>Will spend {xpImpact} XP</span>
              : <span className={styles.impactRefund}>Will refund {Math.abs(xpImpact)} XP</span>
          )}
        </div>

        <div className={styles.saveBarActions}>
          <button className={styles.btnGhost} onClick={handleDiscard} disabled={!isDirty || saving}>Discard Changes</button>
          <button className={styles.btnPrimary} onClick={handleSave} disabled={!isDirty || saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {swap && (
        <SwapConfirmModal
          kind={swap.kind}
          oldItem={swap.oldItem}
          newItem={swapNewItem}
          busy={false}
          onCancel={closeSwap}
          onConfirm={confirmSwap}
          picker={
            <div className={styles.field}>
              <label>Replace with</label>
              <select className={styles.select} value={swapPick} onChange={e => setSwapPick(e.target.value)}>
                <option value="">Choose a replacement…</option>
                {swap.catalog.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          }
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section panels                                                      */
/* ------------------------------------------------------------------ */

function IdentitySection({ charName, setCharName, charClan, setCharClan, sheet, setField }) {
  const FIELDS = [
    { key: 'sire', label: 'Sire' },
    { key: 'generation', label: 'Generation', type: 'number' },
    { key: 'blood_potency', label: 'Blood Potency', type: 'number' },
    { key: 'concept', label: 'Concept' },
    { key: 'chronicle', label: 'Chronicle' },
    { key: 'coterie', label: 'Coterie' },
    { key: 'predator_type', label: 'Predator Type' },
    { key: 'ambition', label: 'Ambition' },
    { key: 'desire', label: 'Desire' },
  ];
  return (
    <div>
      <h2 className={styles.contentTitle}>Identity & Vitals</h2>
      <p className={styles.contentHint}>Name, clan, and background details: these don't cost XP.</p>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label>Name</label>
          <input className={styles.input} value={charName} onChange={e => setCharName(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>Clan</label>
          <input className={styles.input} value={charClan} onChange={e => setCharClan(e.target.value)} />
        </div>
        {FIELDS.map(f => (
          <div className={styles.field} key={f.key}>
            <label>{f.label}</label>
            <input
              className={styles.input}
              type={f.type || 'text'}
              value={sheet[f.key] ?? ''}
              onChange={e => setField(f.key, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function AttributesSection({ sheet, setAttr }) {
  return (
    <div>
      <h2 className={styles.contentTitle}>Attributes</h2>
      <p className={styles.contentHint}>Click a dot to set that rating (×5 XP/dot raised).</p>
      {Object.entries(ATTR_GROUPS).map(([group, keys]) => (
        <div key={group} style={{ marginBottom: 14 }}>
          <div className={styles.groupHeading} style={{ margin: '0 0 8px' }}>{group}</div>
          {keys.map(k => {
            const v = Number(sheet.attributes?.[k] || 0);
            return <DotRow key={k} label={k} value={v} max={5} onDotClick={(n) => setAttr(k, n === v ? n - 1 : n)} />;
          })}
        </div>
      ))}
    </div>
  );
}

function TrackerBox({ label, max, agg = 0, sup = 0, isValue = false, value = 0, stains = 0, onAdjust }) {
  const boxes = [];
  for (let i = 0; i < max; i++) {
    let content = '';
    let filled = false;
    if (isValue) {
      filled = i < value;
      if (i >= max - stains) content = '/';
    } else {
      if (i < agg) content = 'X';
      else if (i < agg + sup) content = '/';
    }
    boxes.push(
      <div key={i} className={styles.trackerBox} data-filled={filled || undefined}>{content}</div>
    );
  }

  return (
    <div className={styles.trackerBoxGroup}>
      <div className={styles.row} style={{ justifyContent: 'space-between' }}>
        <b>{label}</b>
        <span className={styles.entrySub}>Max {max}</span>
      </div>
      <div className={styles.trackerBoxes}>{boxes}</div>
      <div className={styles.row}>
        {!isValue ? (
          <>
            <span className={styles.trackerControlLabel}>Sup</span>
            <button className={styles.iconBtn} onClick={() => onAdjust('superficial', -1)}>−</button>
            <button className={styles.iconBtn} onClick={() => onAdjust('superficial', 1)}>+</button>
            <span className={styles.trackerControlLabel} style={{ marginLeft: 10 }}>Agg</span>
            <button className={styles.iconBtn} onClick={() => onAdjust('aggravated', -1)}>−</button>
            <button className={styles.iconBtn} onClick={() => onAdjust('aggravated', 1)}>+</button>
          </>
        ) : (
          <>
            <span className={styles.trackerControlLabel}>{label}</span>
            <button className={styles.iconBtn} onClick={() => onAdjust('value', -1)}>−</button>
            <button className={styles.iconBtn} onClick={() => onAdjust('value', 1)}>+</button>
            {label === 'Humanity' && (
              <>
                <span className={styles.trackerControlLabel} style={{ marginLeft: 10 }}>Stains</span>
                <button className={styles.iconBtn} onClick={() => onAdjust('stains', -1)}>−</button>
                <button className={styles.iconBtn} onClick={() => onAdjust('stains', 1)}>+</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TrackersSection({ sheet, updateTracker }) {
  const attrs = sheet.attributes || {};
  const maxHealth = deriveMaxHealth(sheet);
  const maxWillpower = Number(attrs.Composure || 0) + Number(attrs.Resolve || 0);

  const health = sheet.health || {};
  const willpower = sheet.willpower || {};
  const humanity = sheet.morality?.humanity ?? sheet.humanity ?? 7;

  return (
    <div>
      <h2 className={styles.contentTitle}>Trackers</h2>
      <p className={styles.contentHint}>Health/Willpower max recompute live from Attributes above.</p>
      <div className={styles.trackerGrid}>
        <TrackerBox label="Health" max={maxHealth} agg={health.aggravated || 0} sup={health.superficial || 0} onAdjust={(f, d) => updateTracker('health', f, d)} />
        <TrackerBox label="Willpower" max={maxWillpower} agg={willpower.aggravated || 0} sup={willpower.superficial || 0} onAdjust={(f, d) => updateTracker('willpower', f, d)} />
        <TrackerBox label="Humanity" max={10} isValue value={humanity} stains={sheet.stains || 0} onAdjust={(f, d) => updateTracker('humanity', f, d)} />
        <TrackerBox label="Hunger" max={5} isValue value={sheet.hunger || 0} onAdjust={(f, d) => updateTracker('hunger', f, d)} />
      </div>
    </div>
  );
}

function SkillsSection({ sheet, setSkillDots, setSkillSpecsCSV, removeSkill }) {
  const grouped = new Set(Object.values(SKILL_GROUPS).flat());
  const custom = Object.keys(sheet.skills || {}).filter(k => !grouped.has(k));

  // One line per skill: name + specialty + dots together, instead of a dot
  // row followed by a full-width specialty input on its own line below it
  // : that was doubling the height of a list that's already 26 rows long.
  // The specialty field only appears once there's at least 1 dot in it
  // (matches the actual V5 rule, and skips a field most 0-dot rows never use).
  const renderSkill = (k, removable = false) => {
    const data = sheet.skills?.[k] || { dots: 0, specialties: [] };
    const v = Number(data.dots || 0);
    const row = (
      <DotRow
        label={k}
        value={v}
        max={5}
        onDotClick={(n) => setSkillDots(k, n === v ? n - 1 : n)}
        rightExtra={v > 0 ? (
          <input
            className={styles.skillSpecInput}
            placeholder="Specialty"
            value={(data.specialties || []).join(', ')}
            onChange={e => setSkillSpecsCSV(k, e.target.value)}
            onClick={e => e.stopPropagation()}
          />
        ) : null}
      />
    );
    if (!removable) return <React.Fragment key={k}>{row}</React.Fragment>;
    return (
      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1 }}>{row}</div>
        <button className={styles.iconBtn} onClick={() => removeSkill(k)} title={`Remove "${k}"`}>✕</button>
      </div>
    );
  };

  return (
    <div>
      <h2 className={styles.contentTitle}>Skills</h2>
      <p className={styles.contentHint}>Click a dot to set that rating (×3 XP/dot). A dot unlocks its specialty field (3 XP each).</p>
      <div className={styles.skillsGroupGrid}>
        {Object.entries(SKILL_GROUPS).map(([group, keys]) => (
          <div key={group}>
            <div className={styles.groupHeading} style={{ marginTop: 0 }}>{group}</div>
            {keys.map(k => renderSkill(k))}
          </div>
        ))}
        {custom.length > 0 && (
          <div>
            <div className={styles.groupHeading} style={{ marginTop: 0 }}>Custom</div>
            <p className={styles.contentHint} style={{ marginBottom: 8 }}>
              Not one of the 27 standard skills: could be a homebrew skill, or leftover bad data (e.g. a specialty saved without its skill name attached). Remove anything that shouldn't be here.
            </p>
            {custom.map(k => renderSkill(k, true))}
          </div>
        )}
      </div>
    </div>
  );
}

function DisciplinesSection({ sheet, discKinds, setDiscKinds, setDisciplineDots, addDiscipline, removeDiscipline, addPower, removePower, openPowerSwap }) {
  const [newDiscName, setNewDiscName] = useState('');
  const [newPowerPick, setNewPowerPick] = useState({});

  return (
    <div>
      <h2 className={styles.contentTitle}>Disciplines & Powers</h2>
      <p className={styles.contentHint}>Per-dot cost depends on kind: Clan ×5, Caitiff ×6, Out-of-Clan ×7.</p>

      {Object.keys(sheet.disciplines || {}).sort().map(name => {
        const level = Number(sheet.disciplines?.[name] || 0);
        const powers = sheet.disciplinePowers?.[name] || [];
        const available = getPowersForDiscipline(name).filter(p => p.level <= level && !powers.some(owned => String(owned.id || owned.name).toLowerCase() === String(p.id || p.name).toLowerCase()));

        return (
          <div key={name} className={styles.entryCard}>
            <div className={styles.entryHead}>
              <div className={styles.entryTitle}>{name}</div>
              <div className={styles.row}>
                <DotRow label="" value={level} max={6} onDotClick={(n) => setDisciplineDots(name, n === level ? n - 1 : n)} />
                <select className={styles.select} value={discKinds[name] || 'other'} onChange={e => setDiscKinds(p => ({ ...p, [name]: e.target.value }))}>
                  {DISC_KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
                </select>
                <button className={styles.iconBtn} onClick={() => removeDiscipline(name)} title="Remove discipline">✕</button>
              </div>
            </div>

            {powers.length === 0 && <div className={styles.emptyState}>No powers recorded.</div>}
            {powers.map((p, idx) => (
              <div key={idx} className={styles.powerRow}>
                <span style={{ flex: 1 }}>{p.name || p.id}</span>
                <button className={styles.smallBtn} onClick={() => openPowerSwap(name, idx)}>Swap</button>
                <button className={styles.iconBtn} onClick={() => removePower(name, idx)} title="Remove power">✕</button>
              </div>
            ))}

            <div className={styles.addRow}>
              <select
                className={styles.select}
                value={newPowerPick[name] || ''}
                onChange={e => setNewPowerPick(prev => ({ ...prev, [name]: e.target.value }))}
                style={{ flex: 1, minWidth: 200 }}
              >
                <option value="">{available.length ? 'Add a power…' : `No unowned powers at Level ${level} or below`}</option>
                {available.map(p => <option key={p.id || p.name} value={p.id || p.name}>{p.name} (Level {p.level})</option>)}
              </select>
              <button
                className={styles.smallBtn}
                onClick={() => {
                  const pick = available.find(p => (p.id || p.name) === newPowerPick[name]);
                  if (pick) { addPower(name, pick); setNewPowerPick(prev => ({ ...prev, [name]: '' })); }
                }}
              >
                Add Power
              </button>
            </div>
          </div>
        );
      })}

      <div className={styles.addRow}>
        <select className={styles.select} value={newDiscName} onChange={e => setNewDiscName(e.target.value)} style={{ flex: 1, minWidth: 220 }}>
          <option value="">Add a discipline…</option>
          {ALL_DISCIPLINE_NAMES.filter(n => !(n in (sheet.disciplines || {}))).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <button className={styles.smallBtn} onClick={() => { if (newDiscName) { addDiscipline(newDiscName); setNewDiscName(''); } }}>Add Discipline</button>
      </div>
    </div>
  );
}

function AdvantageSection({ title, items, catalog, onAdd, onRemove, onDots, onSwap }) {
  const [query, setQuery] = useState('');
  const [pickId, setPickId] = useState('');
  const [pickDots, setPickDots] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim()) return catalog.slice(0, 60);
    const ms = new MiniSearch({ fields: ['name', 'category'], searchOptions: { fuzzy: 0.2, prefix: true } });
    ms.addAll(catalog);
    const ids = new Set(ms.search(query.trim()).map(r => r.id));
    return catalog.filter(c => ids.has(c.id)).slice(0, 60);
  }, [query, catalog]);

  const picked = catalog.find(c => c.id === pickId);

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 className={styles.contentTitle}>{title}</h2>

      {items.length === 0 && <div className={styles.emptyState}>None yet.</div>}
      {items.map((it, i) => {
        const details = catalog.find(c => c.id === it.id);
        return (
          <div key={`${it.id}_${i}`} className={styles.entryCard}>
            <div className={styles.entryHead}>
              <div>
                <div className={styles.entryTitle}>{it.name || it.id}</div>
                {details?.category && <div className={styles.entrySub}>{details.category}</div>}
              </div>
              <div className={styles.row}>
                <input
                  type="number" min={1} max={5}
                  className={styles.input}
                  style={{ width: 64 }}
                  value={Number(it.dots ?? 1)}
                  onChange={e => onDots(i, e.target.value)}
                />
                <button className={styles.smallBtn} onClick={() => onSwap(i)}>Swap</button>
                <button className={styles.iconBtn} onClick={() => onRemove(i)} title="Remove">✕</button>
              </div>
            </div>
            {details?.description && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{details.description}</div>}
          </div>
        );
      })}

      <div className={styles.addRow} style={{ marginTop: 16, alignItems: 'flex-start' }}>
        <input className={styles.input} placeholder={`Search ${title.toLowerCase()}…`} value={query} onChange={e => setQuery(e.target.value)} style={{ flex: '1 1 220px' }} />
        <select className={styles.select} value={pickId} onChange={e => {
          setPickId(e.target.value);
          const p = filtered.find(x => x.id === e.target.value);
          if (p) setPickDots(Math.max(1, bulletCount(p.dots) || 1));
        }} style={{ flex: '2 1 260px' }}>
          <option value="">Choose from catalog…</option>
          {filtered.map(c => <option key={c.id} value={c.id}>{c.name} : {c.category} ({c.dots || '•?'})</option>)}
        </select>
        <input type="number" min={1} max={5} className={styles.input} style={{ width: 64 }} value={pickDots} onChange={e => setPickDots(normalizeDotsInput(e.target.value))} />
        <button
          className={styles.smallBtn}
          onClick={() => { if (picked) { onAdd(picked, pickDots); setPickId(''); setQuery(''); setPickDots(1); } }}
        >
          Add
        </button>
      </div>
      {picked?.description && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 8 }}>{picked.description}</div>}
    </div>
  );
}

function RitualsSection({ sheet, addRitual, removeRitual, openRitualSwap }) {
  const [bsInput, setBsInput] = useState('');
  const [obInput, setObInput] = useState('');

  const RitualList = ({ path, items, options, input, setInput }) => (
    <div style={{ marginBottom: 28 }}>
      <div className={styles.groupHeading}>{path === 'blood_sorcery' ? 'Blood Sorcery Rituals' : 'Oblivion Ceremonies'}</div>
      {items.length === 0 && <div className={styles.emptyState}>None yet.</div>}
      {items.map((r, i) => (
        <div key={`${r.id}_${i}`} className={styles.powerRow}>
          <span style={{ flex: 1 }}>{r.name}{r.level ? ` (Level ${r.level})` : ''}</span>
          <button className={styles.smallBtn} onClick={() => openRitualSwap(path, i)}>Swap</button>
          <button className={styles.iconBtn} onClick={() => removeRitual(path, i)} title="Remove">✕</button>
        </div>
      ))}
      <div className={styles.addRow}>
        <input className={styles.input} list={`dl_${path}`} value={input} onChange={e => setInput(e.target.value)} placeholder="Add by name…" style={{ flex: 1 }} />
        <datalist id={`dl_${path}`}>{options.map(n => <option key={n} value={n} />)}</datalist>
        <button className={styles.smallBtn} onClick={() => { addRitual(path, input); setInput(''); }}>Add</button>
      </div>
    </div>
  );

  return (
    <div>
      <h2 className={styles.contentTitle}>Rituals & Ceremonies</h2>
      <RitualList path="blood_sorcery" items={sheet.rituals?.blood_sorcery || []} options={ALL_BS_RITUALS} input={bsInput} setInput={setBsInput} />
      <RitualList path="oblivion" items={sheet.rituals?.oblivion || []} options={ALL_OB_CEREMONIES} input={obInput} setInput={setObInput} />
    </div>
  );
}

function TouchstonesSection({ sheet, addConviction, updateConviction, removeConviction, addTouchstone, updateTouchstone, removeTouchstone }) {
  const [newConviction, setNewConviction] = useState('');
  const [tName, setTName] = useState('');
  const [tConviction, setTConviction] = useState('');
  const [tBackground, setTBackground] = useState('');
  const convictions = sheet.convictions || [];
  const touchstones = sheet.touchstones || [];

  return (
    <div>
      <h2 className={styles.contentTitle}>Touchstones & Convictions</h2>

      <div className={styles.groupHeading}>Convictions</div>
      {convictions.length === 0 && <div className={styles.emptyState}>None yet.</div>}
      {convictions.map((c, i) => (
        <div key={i} className={styles.row} style={{ marginBottom: 8 }}>
          <input className={styles.input} style={{ flex: 1 }} value={c} onChange={e => updateConviction(i, e.target.value)} />
          <button className={styles.iconBtn} onClick={() => removeConviction(i)}>✕</button>
        </div>
      ))}
      <div className={styles.addRow}>
        <input className={styles.input} style={{ flex: 1 }} placeholder="Add a conviction…" value={newConviction} onChange={e => setNewConviction(e.target.value)} />
        <button className={styles.smallBtn} onClick={() => { addConviction(newConviction); setNewConviction(''); }}>Add</button>
      </div>

      <div className={styles.groupHeading}>Touchstones</div>
      {touchstones.length === 0 && <div className={styles.emptyState}>None yet.</div>}
      {touchstones.map((t, i) => (
        <div key={i} className={styles.entryCard}>
          <div className={styles.row}>
            <input className={styles.input} style={{ flex: '1 1 40%' }} value={t.name} onChange={e => updateTouchstone(i, { name: e.target.value })} placeholder="Name" />
            <select className={styles.select} style={{ flex: '1 1 40%' }} value={t.conviction} onChange={e => updateTouchstone(i, { conviction: e.target.value })}>
              <option value="">Link conviction (optional)</option>
              {convictions.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
            </select>
            <button className={styles.iconBtn} onClick={() => removeTouchstone(i)}>✕</button>
          </div>
          <textarea className={styles.textarea} style={{ width: '100%', marginTop: 8 }} value={t.background} onChange={e => updateTouchstone(i, { background: e.target.value })} placeholder="Background" />
        </div>
      ))}
      <div className={styles.entryCard}>
        <div className={styles.row}>
          <input className={styles.input} style={{ flex: '1 1 40%' }} placeholder="Name" value={tName} onChange={e => setTName(e.target.value)} />
          <select className={styles.select} style={{ flex: '1 1 40%' }} value={tConviction} onChange={e => setTConviction(e.target.value)}>
            <option value="">Link conviction (optional)</option>
            {convictions.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
          </select>
        </div>
        <textarea className={styles.textarea} style={{ width: '100%', marginTop: 8 }} placeholder="Background" value={tBackground} onChange={e => setTBackground(e.target.value)} />
        <div style={{ marginTop: 8 }}>
          <button className={styles.smallBtn} onClick={() => { addTouchstone(tName, tConviction, tBackground); setTName(''); setTConviction(''); setTBackground(''); }}>Add Touchstone</button>
        </div>
      </div>
    </div>
  );
}
