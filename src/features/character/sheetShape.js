// Character sheet shape: converts the flat sheet the creator used to post
// (numeric skills, "Skill: spec" strings, predatorType, bloodPotency) into
// the structured shape every save path writes, and normalizes it on load.
// Shared by CharacterView (on load) and CharacterSetup (before create).
import { DISCIPLINES } from '../../data/disciplines';
import { maxHealth as deriveMaxHealth } from '../../utils/derivedStats';

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

/* ===========================
   Touchstone & Conviction helpers
   =========================== */
function normalizeStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (typeof item === 'string') return item;
    // Rescue old object formats like { name: '...', conviction: '...' }
    if (typeof item === 'object' && item !== null) {
      return item.conviction || item.description || item.name || JSON.stringify(item);
    }
    return String(item || '');
  });
}

export function normalizeTouchstoneArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (!item) return { name: '', conviction: '', background: '' };
    if (typeof item === 'object' && item !== null) {
      return {
        name: String(item.name || item.title || '').trim(),
        conviction: String(item.conviction || '').trim(),
        background: String(item.background || item.description || '').trim()
      };
    }
    if (typeof item === 'string') {
      // Legacy plain-text touchstone. Split only on ':' ("Name: background");
      // '-' is part of real names ("Λυδία Πετρόχειλου- Παπαπέτρου") and of
      // list bullets ("- Kat"), so it's stripped as a bullet, never split on.
      const str = item.trim().replace(/^[-–•]\s*/, '');
      const splitIdx = str.indexOf(':');
      if (splitIdx !== -1) {
        return { name: str.slice(0, splitIdx).trim(), conviction: '', background: str.slice(splitIdx + 1).trim() };
      }
      return { name: str, conviction: '', background: '' };
    }
    return { name: String(item), conviction: '', background: '' };
  });
}

export function normalizeFromFlatAny(source) {
  const flat = source?.sheet && looksLikeFlatSheet(source.sheet) ? source.sheet : source;
  // Keep fields this function doesn't rebuild (concept, chronicle,
  // generation, admin_notes, ...). Only for a real sheet: when `flat` is the
  // whole DB row, its columns must not leak into the sheet.
  const { predatorType, predator, bloodPotency, specialties: _flatSpecs, name: _name, clan: _clan, ...extras } = flat === source?.sheet ? flat : {};
  const sheet = { ...extras };

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
    const str = String(s).trim();
    let skill, spec;
    if (str.includes(':')) {
      const idx = str.indexOf(':');
      skill = str.slice(0, idx).trim();
      spec = str.slice(idx + 1).trim();
    } else {
      // Older creator saves had no colon ("Craft Tattoos"): match a known
      // skill prefix instead of inventing a skill named "Craft Tattoos".
      skill = Object.keys(skills).find(k => str.toLowerCase().startsWith(k.toLowerCase() + ' '));
      spec = skill ? str.slice(skill.length).trim() : '';
    }
    if (!skill || !spec) return;
    if (!skills[skill]) skills[skill] = { dots: 0, specialties: [] };
    skills[skill].specialties.push(spec);
  });
  sheet.skills = skills;

  sheet.disciplines = { ...(flat.disciplines || {}) };
  sheet.disciplinePowers = { ...(flat.disciplinePowers || {}) };

  sheet.predator_type = flat.predator_type || flat.predatorType || flat.predator?.type || '';
  sheet.sire = flat.sire || '';
  sheet.ambition = flat.ambition || '';
  sheet.desire = flat.desire || '';

  sheet.touchstones = normalizeTouchstoneArray(
    Array.isArray(flat.touchstones) ? flat.touchstones : flat.morality?.touchstones
  );
  sheet.convictions = normalizeStringArray(
    Array.isArray(flat.convictions) ? flat.convictions : flat.morality?.convictions
  );

  sheet.advantages = {
    merits: Array.isArray(flat.advantages?.merits) ? flat.advantages.merits : [],
    flaws: Array.isArray(flat.advantages?.flaws) ? flat.advantages.flaws : [],
  };

  sheet.mystic_powers = Array.isArray(flat.mystic_powers) ? flat.mystic_powers : [];

  // Backward compatibility: migrate from notes inside Mystic of the Void merit
  const mysticMerit = sheet.advantages.merits.find(m => m.id === 'other__mystic_of_the_void');
  if (mysticMerit && typeof mysticMerit.notes === 'string' && mysticMerit.notes.startsWith('[')) {
    try {
      const parsed = JSON.parse(mysticMerit.notes);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (sheet.mystic_powers.length === 0) sheet.mystic_powers = parsed;
      }
      mysticMerit.notes = '';
    } catch (e) {
      // Ignore
    }
  }

  // Validate Mystic of the Void selections for view
  if (mysticMerit && Array.isArray(sheet.mystic_powers) && sheet.mystic_powers.length > 0) {
    const maxMystic = ['Hecata', 'Lasombra'].includes(flat.clan || '') && Number(mysticMerit.dots) === 2 ? 3 : 1;
    const oblivionDots = Number(sheet.disciplines?.oblivion || sheet.disciplines?.Oblivion || 0);

    const validPowers = [];
    for (const pId of sheet.mystic_powers) {
      let powerLevel = 99;
      if (DISCIPLINES && DISCIPLINES['Oblivion']) {
        for (const [lvlStr, list] of Object.entries(DISCIPLINES['Oblivion'].levels || {})) {
          if (list.find(x => x.id === pId)) {
            powerLevel = Number(lvlStr);
            break;
          }
        }
      }
      if (powerLevel <= oblivionDots) {
        validPowers.push(pId);
      }
    }

    if (validPowers.length !== sheet.mystic_powers.length || validPowers.length > maxMystic) {
      sheet.mystic_powers = [];
      sheet._needsMysticFix = true;
    }
  } else if (!mysticMerit && sheet.mystic_powers?.length > 0) {
    sheet.mystic_powers = [];
  }


  sheet.morality = flat.morality || {};
  sheet.humanity = flat.morality?.humanity ?? flat.humanity ?? undefined;
  sheet.stains = flat.stains ?? 0;
  sheet.hunger = flat.hunger ?? 1;

  sheet.blood_potency = Number(flat.bloodPotency ?? flat.blood_potency ?? 1);

  sheet.health_max = deriveMaxHealth(sheet);

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

export function attachStructured(raw) {
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
      // De-duplicate by the power's identity, never by level: V5 allows two
      // powers of the same level (Awe + Daunt at Presence 1). Dropping the
      // second one here made findMissingPicks re-prompt for it after every
      // save, an endless "Select Missing Power" loop.
      const seen = new Set();

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

        const key = String(p.id || p.name || '').toLowerCase();
        if (key && seen.has(key)) return;
        if (key) seen.add(key);
        next.push(Number.isInteger(level) && level > 0 ? { ...p, level } : p);
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
  sheet.touchstones = normalizeTouchstoneArray(sheet.touchstones || sheet.morality?.touchstones);
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
