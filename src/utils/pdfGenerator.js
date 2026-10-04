// src/utils/pdfGenerator.js
import api from '../core/api';
import { listAllItems } from '../data/merits_flaws';
import { RITUALS } from '../data/rituals';
import { SKILL_DESCRIPTIONS } from '../data/descriptions';
import { ALL_DISCIPLINE_NAMES, DISCIPLINES } from '../data/disciplines';
import { clanRef } from '../data/clanReference';

export const BLOOD_POTENCY_MILESTONES = {
  0: { surge: '+1 die', mend: '1 Superficial', bonus: 'None', rouse: 'None', feeding: 'No penalty', bane: 1 },
  1: { surge: '+2 dice', mend: '1 Superficial', bonus: 'None', rouse: 'Level 1', feeding: 'No penalty', bane: 2 },
  2: { surge: '+2 dice', mend: '2 Superficial', bonus: '+1 die', rouse: 'Level 1', feeding: 'Animal and bagged blood slake half as much hunger', bane: 2 },
  3: { surge: '+3 dice', mend: '2 Superficial', bonus: '+1 die', rouse: 'Level 2 and below', feeding: 'Animal and bagged blood slake nothing', bane: 3 },
  4: { surge: '+3 dice', mend: '3 Superficial', bonus: '+2 dice', rouse: 'Level 2 and below', feeding: 'Animal and bagged blood slake nothing, slakes 1 less per human', bane: 3 },
  5: { surge: '+4 dice', mend: '3 Superficial', bonus: '+2 dice', rouse: 'Level 3 and below', feeding: 'Animal and bagged blood slake nothing, slakes 1 less per human, must drain a human to go below Hunger 2', bane: 4 },
  6: { surge: '+4 dice', mend: '3 Superficial', bonus: '+3 dice', rouse: 'Level 3 and below', feeding: 'Animal and bagged blood slake nothing, slakes 2 less per human, must drain a human to go below Hunger 2', bane: 4 },
  7: { surge: '+5 dice', mend: '3 Superficial', bonus: '+3 dice', rouse: 'Level 4 and below', feeding: 'Animal and bagged blood slake nothing, slakes 2 less per human, must drain a human to go below Hunger 2', bane: 4 },
  8: { surge: '+5 dice', mend: '4 Superficial', bonus: '+4 dice', rouse: 'Level 4 and below', feeding: 'Animal and bagged blood slake nothing, slakes 2 less per human, must drain a human to go below Hunger 3', bane: 5 },
  9: { surge: '+6 dice', mend: '4 Superficial', bonus: '+4 dice', rouse: 'Level 5 and below', feeding: 'Animal and bagged blood slake nothing, slakes 2 less per human, must drain a human to go below Hunger 3', bane: 6 },
  10: { surge: '+6 dice', mend: '5 Superficial', bonus: '+5 dice', rouse: 'Level 5 and below', feeding: 'Animal and bagged blood slake nothing, slakes 3 less per human, must drain a human to go below Hunger 3', bane: 6 },
};

// The generated sheet opens as a real HTML document in a new window (not a
// sandboxed preview), so any player/admin entered free text (names, notes,
// touchstone backgrounds, item descriptions) must be escaped before being
// interpolated into the template. Otherwise a stray "<" or a deliberately
// crafted note becomes live HTML/script in that window.
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

export default async function generateVTMCharacterSheetPDF(character) {
  // 1. Parse the sheet data securely (Handle both wrapped and raw sheet objects)
  let sheet = {};
  try {
    if (character.sheet) {
      sheet = typeof character.sheet === 'string' ? JSON.parse(character.sheet) : character.sheet;
    } else {
      sheet = character; // Fallback if the object passed IS the sheet directly
    }
  } catch (e) {
    console.error('Invalid sheet JSON', e);
    alert('Invalid JSON sheet. Cannot generate PDF.');
    return;
  }

  // Inventory lives in its own table, not the sheet JSON, fetch it
  // best effort so a failure here never blocks the rest of the sheet.
  // NPCs do not have character inventory rows, so skip for NPCs.
  let inventoryItems = [];
  const isNpc = character.isNPC || character.is_npc || character.type === 'npc' || character.pickFrom === 'npc';
  if (character.id && !isNpc) {
    try {
      const { data } = await api.get(`/characters/${character.id}/inventory`);
      inventoryItems = Array.isArray(data?.items) ? data.items : [];
    } catch (e) {
      console.warn('Could not load inventory for PDF export', e);
    }
  }

  // Date Formatter
  const formatExportDate = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mmm = months[now.getMonth()];
    const yyyy = now.getFullYear();
    return `${hh}:${mm} : ${dd} ${mmm} ${yyyy}`;
  };

  // Helpers for dots and boxes
  const renderDots = (value, max = 5) => {
    let html = '<div class="dots-container">';
    for (let i = 1; i <= max; i++) {
      html += `<span class="dot ${i <= (Number(value) || 0) ? 'filled' : ''}"></span>`;
    }
    html += '</div>';
    return html;
  };

  // Advanced tracker renderer for X, /, and blood emojis
  const renderTrackerBoxes = (max, agg = 0, sup = 0, isValueTracker = false, value = 0, stains = 0, isHunger = false) => {
    let html = '<div class="boxes-container">';
    for (let i = 0; i < max; i++) {
      let content = '';
      let isFilled = false;
      let boxStyle = 'width: 14px; height: 14px; border: 1px solid #222; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; line-height: 1;';

      if (isValueTracker) {
        if (i < (Number(value) || 0)) isFilled = true;
        if (i >= max - (Number(stains) || 0)) content = '/';
        
        if (isFilled) {
          if (isHunger) {
            content = '🩸';
            boxStyle += ' background: rgba(0,0,0,0.05); border-color: rgba(128,128,128,0.5); font-size: 10px;';
          } else {
            boxStyle += ' background: #222; color: #fff;';
          }
        } else {
          boxStyle += ' background: #fff; color: #222;';
        }
      } else {
        boxStyle += ' background: #fff; color: #222;';
        if (i < (Number(agg) || 0)) { 
          content = 'X'; 
          boxStyle += ' color: #b40f1f;'; 
        } 
        else if (i < (Number(agg) || 0) + (Number(sup) || 0)) { 
          content = '/'; 
        }
      }

      html += `<span style="${boxStyle}">${content}</span>`;
    }
    html += '</div>';
    return html;
  };

  // Data Extraction with Safe Null Checks
  const attrs = sheet.attributes || {};
  const skills = sheet.skills || {};
  const charSpecialties = sheet.specialties || character.specialties;
  const charRituals = sheet.rituals || character.rituals || {};
  
  const getAttr = (k) => Number(attrs[k] ?? attrs[k.toLowerCase()] ?? 1);
  
  const getSkillData = (k) => {
    const keyLower = k.toLowerCase();
    const foundKey = Object.keys(skills).find(key => key.toLowerCase() === keyLower);
    const node = foundKey ? skills[foundKey] : undefined;
    const dots = (node && typeof node === 'object') ? Number(node.dots || 0) : Number(node || 0);

    const specs = [];
    if (node && typeof node === 'object' && Array.isArray(node.specialties)) {
      specs.push(...node.specialties);
    }
    if (charSpecialties) {
      if (Array.isArray(charSpecialties)) {
        charSpecialties.forEach(s => {
          const str = String(s || '').trim();
          let val = '';
          if (str.toLowerCase().startsWith(keyLower + ':')) {
            val = str.slice(keyLower.length + 1).trim();
          } else if (str.toLowerCase().startsWith(keyLower + ' (')) {
            val = str.slice(keyLower.length + 2).replace(/\)$/, '').trim();
          } else if (str.toLowerCase().startsWith(keyLower + ' ')) {
            val = str.slice(keyLower.length + 1).trim();
          }
          if (val && !specs.includes(val)) specs.push(val);
        });
      } else if (typeof charSpecialties === 'object') {
        const specKey = Object.keys(charSpecialties).find(key => key.toLowerCase() === keyLower);
        if (specKey && Array.isArray(charSpecialties[specKey])) {
          charSpecialties[specKey].forEach(val => {
            if (val && !specs.includes(val)) specs.push(val);
          });
        }
      }
    }
    return { dots, specialties: specs.filter(Boolean) };
  };

  const renderSkillRow = (name) => {
    const { dots, specialties } = getSkillData(name);
    const desc = SKILL_DESCRIPTIONS[name] || '';
    return `
      <div class="stat-row" style="align-items: flex-start; margin-bottom: 5px;" title="${escapeHtml(desc)}">
        <div style="display: flex; flex-direction: column; max-width: 160px;">
          <span>${escapeHtml(name)}</span>
          ${specialties.length ? `<span style="font-size: 11px; color: #666; font-style: italic; line-height: 1.2;">(${escapeHtml(specialties.join(', '))})</span>` : ''}
        </div>
        ${renderDots(dots)}
      </div>
    `;
  };
  
  const normalizeDiscName = (raw) => {
    const s = String(raw || '').trim().toLowerCase();
    const canon = ALL_DISCIPLINE_NAMES.find(n => n.toLowerCase() === s);
    if (canon) return canon;
    return String(raw || '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  let disciplines = {};
  const rawDiscs = sheet.disciplines || character.disciplines || {};
  if (Array.isArray(rawDiscs)) {
    rawDiscs.forEach(d => {
      if (d && typeof d === 'object') {
        const dName = d.discipline || d.name || '';
        if (dName) {
          const name = normalizeDiscName(dName);
          disciplines[name] = Math.max(disciplines[name] || 0, Number(d.level || d.dots || 1));
        }
      }
    });
  } else if (rawDiscs && typeof rawDiscs === 'object') {
    Object.entries(rawDiscs).forEach(([k, v]) => {
      if (!k) return;
      const name = normalizeDiscName(k);
      disciplines[name] = Math.max(disciplines[name] || 0, Number(v || 0));
    });
  }

  const getDisciplinePowerFullData = (discName, powerEntry) => {
    if (!powerEntry) return null;
    const idStr = String(powerEntry.id || powerEntry.power_id || (typeof powerEntry === 'string' ? powerEntry : '')).trim().toLowerCase();
    const nameStr = String(powerEntry.name || powerEntry.power || powerEntry.title || (typeof powerEntry === 'string' ? powerEntry : '')).trim().toLowerCase();

    // 1. Specific discipline search
    const dKey = Object.keys(DISCIPLINES || {}).find(k => k.toLowerCase() === String(discName || '').toLowerCase());
    const discObj = dKey ? DISCIPLINES[dKey] : null;

    if (discObj && discObj.levels) {
      for (const [lvl, powersList] of Object.entries(discObj.levels)) {
        if (!Array.isArray(powersList)) continue;
        const found = powersList.find(p => {
          const pId = String(p.id || '').trim().toLowerCase();
          const pName = String(p.name || '').trim().toLowerCase();
          return (idStr && pId === idStr) || 
                 (nameStr && pName === nameStr) ||
                 (nameStr && (pId === nameStr.replace(/[^a-z0-9]+/g, '_') || pId.replace(/_/g, ' ') === nameStr)) ||
                 (idStr && (pName === idStr.replace(/_+/g, ' ') || pName.replace(/[^a-z0-9]+/g, '_') === idStr));
        });
        if (found) {
          return { ...found, level: Number(lvl) };
        }
      }
    }

    // 2. Global discipline fallback search
    for (const disc of Object.values(DISCIPLINES || {})) {
      if (!disc || !disc.levels) continue;
      for (const [lvl, powersList] of Object.entries(disc.levels)) {
        if (!Array.isArray(powersList)) continue;
        const found = powersList.find(p => {
          const pId = String(p.id || '').trim().toLowerCase();
          const pName = String(p.name || '').trim().toLowerCase();
          return (idStr && pId === idStr) || (nameStr && pName === nameStr);
        });
        if (found) {
          return { ...found, level: Number(lvl) };
        }
      }
    }

    return null;
  };

  const getPowersForDisc = (discName) => {
    const dLower = String(discName || '').toLowerCase().trim();
    const result = [];
    const seen = new Set();

    const addPower = (p) => {
      if (!p) return;
      const key = String(p.id || p.name || p.power || p || '').toLowerCase().trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      result.push(typeof p === 'object' ? p : { id: p, name: p });
    };

    // 1. Check sheet.disciplinePowers and character.disciplinePowers
    const discPowersObj = sheet.disciplinePowers || character.disciplinePowers;
    if (discPowersObj && typeof discPowersObj === 'object' && !Array.isArray(discPowersObj)) {
      const matchKey = Object.keys(discPowersObj).find(k => k.toLowerCase().trim() === dLower);
      if (matchKey && Array.isArray(discPowersObj[matchKey])) {
        discPowersObj[matchKey].forEach(addPower);
      }
    } else if (Array.isArray(discPowersObj)) {
      discPowersObj.forEach(p => {
        if (p && typeof p === 'object' && String(p.discipline || '').toLowerCase().trim() === dLower) {
          addPower(p);
        }
      });
    }

    // 2. Check sheet.disciplines and character.disciplines if array contains power objects
    const rawList = sheet.disciplines || character.disciplines;
    if (Array.isArray(rawList)) {
      rawList.forEach(d => {
        if (!d || typeof d !== 'object') return;
        const dName = String(d.discipline || d.name || '').toLowerCase().trim();
        if (dName === dLower) {
          if (Array.isArray(d.powers)) {
            d.powers.forEach(addPower);
          } else if (d.power) {
            addPower(d.power);
          } else if (d.powerName || d.powerId) {
            addPower({ id: d.powerId, name: d.powerName, level: d.level });
          }
        }
      });
    }

    return result;
  };

  // Rituals and Ceremonies Extraction
  const getRitualFullData = (category, powerId) => {
    const cat = RITUALS[category];
    if (!cat || !cat.levels || !powerId) return null;
    const idStr = String(powerId).toLowerCase().trim();
    for (const level of Object.values(cat.levels)) {
      const found = level.find(p => 
        String(p.id).toLowerCase() === idStr || 
        String(p.name).toLowerCase() === idStr
      );
      if (found) return found;
    }
    return null;
  };

  let bsRituals = [];
  let obCeremonies = [];
  if (Array.isArray(charRituals?.blood_sorcery)) {
    bsRituals = charRituals.blood_sorcery;
  }
  if (Array.isArray(charRituals?.oblivion)) {
    obCeremonies = charRituals.oblivion;
  }
  if (Array.isArray(charRituals)) {
    charRituals.forEach(r => {
      const idOrName = typeof r === 'object' ? (r.id || r.name) : r;
      if (getRitualFullData('blood_sorcery', idOrName)) bsRituals.push(r);
      else if (getRitualFullData('oblivion', idOrName)) obCeremonies.push(r);
    });
  }

  const dedupRituals = (arr) => {
    const seen = new Set();
    return arr.filter(r => {
      const key = String(r?.id || r?.name || r || '').toLowerCase();
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const sortRituals = (a, b) => {
    const lvlA = Number(a?.level || 1);
    const lvlB = Number(b?.level || 1);
    if (lvlA !== lvlB) return lvlA - lvlB;
    const nameA = String(a?.name || a?.id || a || '');
    const nameB = String(b?.name || b?.id || b || '');
    return nameA.localeCompare(nameB);
  };
  const sortedBsRituals = dedupRituals([...bsRituals]).sort(sortRituals);
  const sortedObCeremonies = dedupRituals([...obCeremonies]).sort(sortRituals);

  // Catalog item lookup with fuzzy name/id fallback and user edits support
  const allCatalogItems = listAllItems();
  const catalogById = new Map();
  const catalogByName = new Map();

  allCatalogItems.forEach(item => {
    if (item.id) catalogById.set(String(item.id).toLowerCase(), item);
    if (item.name) catalogByName.set(String(item.name).toLowerCase(), item);
  });

  const findCatalogItem = (entry) => {
    if (!entry) return null;
    const idKey = String(entry.id || '').toLowerCase().trim();
    const nameKey = String(entry.name || '').toLowerCase().trim();
    if (idKey && catalogById.has(idKey)) return catalogById.get(idKey);
    if (nameKey && catalogByName.has(nameKey)) return catalogByName.get(nameKey);
    return allCatalogItems.find(i => {
      const cId = String(i.id || '').toLowerCase();
      const cName = String(i.name || '').toLowerCase();
      return (idKey && cId.includes(idKey)) || (nameKey && cName === nameKey) || (nameKey && cId.endsWith(`__${nameKey}`));
    }) || null;
  };

  const withCatalogDescription = (entry) => {
    const catalogItem = findCatalogItem(entry);
    const desc = entry.desc || entry.description || entry.notes || catalogItem?.description || '';
    const name = entry.name || catalogItem?.name || entry.id || 'Advantage';
    return {
      ...entry,
      name,
      description: desc,
    };
  };

  const merits = (Array.isArray(sheet.advantages?.merits) ? sheet.advantages.merits : []).map(withCatalogDescription);
  const flaws = (Array.isArray(sheet.advantages?.flaws) ? sheet.advantages.flaws : []).map(withCatalogDescription);
  const rawBackgrounds = [
    ...(Array.isArray(sheet.backgrounds) ? sheet.backgrounds : []),
    ...(Array.isArray(sheet.advantages?.backgrounds) ? sheet.advantages.backgrounds : [])
  ];
  const seenBgs = new Set();
  const dedupedBackgrounds = rawBackgrounds.filter(b => {
    const key = (b.id || b.name || '').toLowerCase();
    if (!key) return true;
    if (seenBgs.has(key)) return false;
    seenBgs.add(key);
    return true;
  });
  const backgrounds = dedupedBackgrounds.map(withCatalogDescription);
  const convictions = Array.isArray(sheet.convictions) ? sheet.convictions.filter(Boolean) : [];
  const touchstones = Array.isArray(sheet.touchstones)
    ? sheet.touchstones.filter(t => t && (t.name || t.background || t.description)).map(t => ({
        name: t.name || t.title || '',
        conviction: t.conviction || '',
        background: t.background || t.description || '',
      }))
    : [];

  // Calculate dynamic max values and current tracker status
  const stamina = getAttr('Stamina');
  let maxHealth = stamina + 3;
  
  // Calculate Fortitude bonus if present on character
  const fortitudeDots = Number(
    disciplines['Fortitude'] || 
    (typeof sheet.disciplines === 'object' && !Array.isArray(sheet.disciplines) ? (sheet.disciplines.Fortitude || sheet.disciplines.fortitude) : 0) || 
    (typeof character.disciplines === 'object' && !Array.isArray(character.disciplines) ? (character.disciplines.Fortitude || character.disciplines.fortitude) : 0) ||
    0
  );
  if (fortitudeDots > 0) {
    maxHealth += fortitudeDots;
  }
  if (Number(sheet.health_max || character.health_max || 0) > maxHealth) {
    maxHealth = Number(sheet.health_max || character.health_max);
  }
  
  const maxWillpower = getAttr('Composure') + getAttr('Resolve');

  const healthAgg = sheet.health?.aggravated || 0;
  const healthSup = sheet.health?.superficial || 0;

  const wpAgg = sheet.willpower?.aggravated || 0;
  const wpSup = sheet.willpower?.superficial || 0;

  const humanityVal = sheet.morality?.humanity ?? sheet.humanity ?? 7;
  const stains = sheet.stains || 0;
  const hungerVal = sheet.hunger || 0;

  // Use the absolute URL so html2pdf and the new window can definitely find your image
  const logoUrl = window.location.origin + '/img/ATT-logo(1).webp';
  const exportDateString = formatExportDate();

  const charName = (character.name || sheet.name || 'Character').trim();
  let rawFileName = `${charName} Athens Through Time VTM ${exportDateString}.pdf`;
  const finalFileName = rawFileName.replace(/[\s:]+/g, '_').replace(/_+/g, '_');
  
  // Very important: Escape single quotes so it doesn't break the injected javascript
  const safeFileName = finalFileName.replace(/'/g, "\\'");

  const getClanTextLogoUrl = (rawClan) => {
    if (!rawClan) return null;
    let str = String(rawClan).trim().toLowerCase();
    str = str.replace(/^clan\s+/i, '').trim();

    const clanMap = {
      'banu haqim': 'Banu_Haqim',
      'banu_haqim': 'Banu_Haqim',
      'brujah': 'Brujah',
      'caitiff': 'Caitiff',
      'gangrel': 'Gangrel',
      'hecata': 'Hecata',
      'lasombra': 'Lasombra',
      'malkavian': 'Malkavian',
      'ministry': 'Ministry',
      'the ministry': 'Ministry',
      'the_ministry': 'Ministry',
      'nosferatu': 'Nosferatu',
      'ravnos': 'Ravnos',
      'salubri': 'Salubri',
      'thin-blood': 'Thinblood',
      'thin blood': 'Thinblood',
      'thinblood': 'Thinblood',
      'toreador': 'Toreador',
      'tremere': 'Tremere',
      'tzimisce': 'Tzimisce',
      'ventrue': 'Ventrue',
    };

    const fileName = clanMap[str] || clanMap[str.replace(/[\s_-]+/g, ' ')];
    if (fileName) {
      return `${window.location.origin}/img/clans/text/300px-${fileName}_logo.webp`;
    }
    return null;
  };

  const rawClanVal = character.clan || sheet.clan || '';
  const charClan = (typeof rawClanVal === 'object' && rawClanVal !== null)
    ? String(rawClanVal.name || rawClanVal.title || rawClanVal.clan || '').trim()
    : String(rawClanVal || '').trim();
  const clanLogoUrl = getClanTextLogoUrl(charClan);
  const predatorName = typeof sheet.predatorType === 'object' && sheet.predatorType
    ? (sheet.predatorType.name || sheet.predatorType.title || '')
    : (sheet.predatorType || sheet.predator_type || '');

  // Avatar URL resolution
  let avatarUrl = null;
  const userId = character.user_id || character.userId;
  const charId = character.id;
  if (character.avatar_url || character.avatarUrl || sheet.avatar_url) {
    const raw = character.avatar_url || character.avatarUrl || sheet.avatar_url;
    avatarUrl = raw.startsWith('http') ? raw : `${window.location.origin}${raw.startsWith('/') ? '' : '/'}${raw}`;
  } else if (isNpc && charId) {
    avatarUrl = `${window.location.origin}/api/npcs/${charId}/avatar`;
  } else if (userId) {
    avatarUrl = `${window.location.origin}/api/users/${userId}/avatar`;
  }

  // Domain Title, Status & XP Summary
  const titles = Array.isArray(character.camarilla_titles)
    ? character.camarilla_titles.filter(Boolean).join(', ')
    : (character.camarilla_titles || character.title || sheet.title || '');
  const sect = character.sect || sheet.sect || '';
  const domainTitle = [sect, titles].filter(Boolean).join(': ') || 'Citizen';
  const charStatus = String(character.status || sheet.status || 'Active').trim();
  const currentXp = Number(character.xp ?? sheet.xp ?? 0);
  const totalXp = Number(character.total_xp ?? character.totalXp ?? sheet.total_xp ?? currentXp);
  const xpSummary = `${currentXp} Available, ${totalXp} Lifetime`;

  // Blood Potency & Clan Curse calculations
  const clanData = clanRef(charClan);
  const bpLevel = Math.min(10, Math.max(0, Number(sheet.blood_potency || sheet.bloodPotency || character.blood_potency || 1)));
  const bpInfo = BLOOD_POTENCY_MILESTONES[bpLevel] || BLOOD_POTENCY_MILESTONES[1];
  const baneSeverity = bpInfo.bane;

  // Typography rule compliance: convert hyphens, minus, and dashes to commas or words
  const cleanClanBane = clanData?.bane
    ? clanData.bane.replace(/[—–]/g, ', ').replace(/[−\-]/g, 'minus ')
    : '';
  const cleanClanCompulsion = clanData?.compulsion
    ? clanData.compulsion.replace(/[—–]/g, ', ').replace(/[−\-]/g, 'minus ')
    : '';

  const renderDisciplineBlock = (discName, dots) => {
    const powers = getPowersForDisc(discName);
    return `
      <div class="avoid-break" style="margin-bottom: 16px;">
        <div class="stat-row" style="border-bottom: 1px solid #8a0303; padding-bottom: 2px; margin-bottom: 8px;">
          <strong style="color: #8a0303; font-size: 15px; font-family: 'Oswald', sans-serif; text-transform: uppercase;">${escapeHtml(discName)}</strong>
          ${renderDots(dots)}
        </div>
        ${powers.length ? powers.map(p => {
          const full = getDisciplinePowerFullData(discName, p) || {};
          const powerName = p.name || full.name || p.id || 'Power';
          const lvl = p.level || full.level;
          const roll = p.dice_pool || p.roll || full.dice_pool || '';
          const opposing = p.opposing_pool || full.opposing_pool || '';
          let rollText = '';
          if (roll && roll !== '—') {
            if (opposing && opposing !== 'None' && opposing !== '—') {
              rollText = `${roll} vs ${opposing}`;
            } else {
              rollText = roll;
            }
          }
          const cleanRoll = rollText.replace(/[—–]/g, '');
          const source = (p.source || full.source || '').replace(/[—–]/g, ', ');
          const desc = (p.notes || p.description || p.effect || p.system || full.notes || full.description || full.effect || full.system || '').replace(/[—–]/g, ', ');

          return `
            <div class="adv-entry avoid-break" style="margin-bottom: 10px;">
              <div class="stat-row" style="margin-bottom: 2px;">
                <span><strong>${escapeHtml(powerName)}</strong></span>
                ${lvl ? `<span style="font-family: 'Oswald', sans-serif; font-size: 11px; color: #8a0303; text-transform: uppercase;">Level ${escapeHtml(lvl)}</span>` : ''}
              </div>
              ${desc ? `<div class="adv-desc" style="margin-bottom: 3px;">${escapeHtml(desc)}</div>` : ''}
              ${(cleanRoll || source) ? `
                <div style="font-size: 11px; color: #666; margin-top: 2px; display: flex; flex-wrap: wrap; gap: 10px;">
                  ${cleanRoll ? `<span><strong>Roll:</strong> ${escapeHtml(cleanRoll)}</span>` : ''}
                  ${source ? `<span><strong>Page:</strong> ${escapeHtml(source)}</span>` : ''}
                </div>
              ` : ''}
            </div>
          `;
        }).join('') : '<div class="adv-empty" style="padding-left: 4px;">No powers selected</div>'}
      </div>
    `;
  };

  const activeDisciplines = Object.entries(disciplines).filter(([_, v]) => Number(v) > 0);
  const halfDiscs = Math.ceil(activeDisciplines.length / 2);
  const leftDiscs = activeDisciplines.slice(0, halfDiscs);
  const rightDiscs = activeDisciplines.slice(halfDiscs);

  // HTML Template for the VTM Sheet
  const contentHtml = `
    <div id="vtm-sheet-content" style="font-family: 'Crimson Text', serif; color: #222; background: #fff; padding: 20px 40px; width: 800px; margin: 0 auto; box-sizing: border-box;">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Oswald:wght@400;700&display=swap');
        
        #vtm-sheet-content h1, #vtm-sheet-content h2, #vtm-sheet-content h3, #vtm-sheet-content .section-title { font-family: 'Oswald', sans-serif; text-transform: uppercase; }
        
        #vtm-sheet-content .header { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 25px; border-bottom: 2px solid #8a0303; padding-bottom: 12px; }
        #vtm-sheet-content .header-brand { display: flex; align-items: center; gap: 20px; }
        #vtm-sheet-content .header-brand img.logo-img { height: 65px; width: auto; object-fit: contain; }
        #vtm-sheet-content .header-text { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; }
        #vtm-sheet-content .header h1 { color: #8a0303; font-size: 30px; letter-spacing: 2px; margin: 0; line-height: 1.1; }
        #vtm-sheet-content .header .subtitle { font-family: 'Oswald', sans-serif; font-size: 15px; color: #555; letter-spacing: 1px; margin-top: 2px; text-transform: uppercase; }
        #vtm-sheet-content .header-avatar { display: flex; align-items: center; justify-content: center; }
        #vtm-sheet-content .header-avatar img { width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 2px solid #8a0303; box-shadow: 0 2px 6px rgba(0,0,0,0.25); }
        
        #vtm-sheet-content .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px 30px; margin-bottom: 30px; font-size: 14px; }
        #vtm-sheet-content .meta-field { display: flex; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
        #vtm-sheet-content .meta-field strong { margin-right: 8px; color: #8a0303; font-family: 'Oswald', sans-serif; }
        #vtm-sheet-content .meta-field span { flex: 1; }
        #vtm-sheet-content .section-title { text-align: center; color: #8a0303; font-size: 18px; margin: 20px 0 15px; border-top: 1px solid #8a0303; border-bottom: 1px solid #8a0303; padding: 4px 0; letter-spacing: 1px; }
        #vtm-sheet-content .three-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        #vtm-sheet-content .two-col { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; }
        #vtm-sheet-content .col-header { text-align: center; font-style: italic; color: #666; margin-bottom: 10px; }
        #vtm-sheet-content .stat-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 15px; }
        #vtm-sheet-content .dots-container, #vtm-sheet-content .boxes-container { display: flex; gap: 3px; }
        #vtm-sheet-content .dot { width: 10px; height: 10px; border: 1px solid #222; border-radius: 50%; background: #fff; display: inline-block; box-sizing: border-box; }
        #vtm-sheet-content .dot.filled { background: #8a0303; border-color: #8a0303; }
        #vtm-sheet-content .box { width: 12px; height: 12px; border: 1px solid #222; background: #fff; display: inline-block; box-sizing: border-box; }
        #vtm-sheet-content .box.filled { background: #222; }
        #vtm-sheet-content .trackers { margin-top: 30px; padding: 15px; background: #f4f4f4; border: 1px solid #ddd; border-radius: 4px; }
        #vtm-sheet-content .tracker-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        #vtm-sheet-content .tracker-row strong { font-family: 'Oswald', sans-serif; font-size: 16px; width: 100px; }
        #vtm-sheet-content .adv-entry { margin-bottom: 10px; }
        #vtm-sheet-content .adv-desc { padding-left: 4px; font-size: 12px; color: #555; line-height: 1.4; margin-top: 2px; }
        #vtm-sheet-content .adv-empty { font-size: 13px; color: #999; font-style: italic; }
        #vtm-sheet-content .avoid-break, #vtm-sheet-content .section-title, #vtm-sheet-content .adv-entry { page-break-inside: avoid; break-inside: avoid; }
      </style>

      <div class="header">
        <div class="header-brand">
          <img class="logo-img" src="${logoUrl}" alt="ATT Logo" />
          <div class="header-text">
            <h1>VAMPIRE THE MASQUERADE</h1>
            <div class="subtitle">Chronicle: Athens Through Time LARP</div>
          </div>
        </div>
        ${avatarUrl ? `
          <div class="header-avatar">
            <img src="${avatarUrl}" alt="${escapeHtml(charName)}" onerror="this.parentElement.style.display='none';" />
          </div>
        ` : ''}
      </div>

      <div class="meta-grid">
        <div class="meta-field"><strong>Name:</strong> <span>${escapeHtml(charName)}</span></div>
        <div class="meta-field"><strong>Concept:</strong> <span>${escapeHtml(sheet.concept)}</span></div>
        <div class="meta-field"><strong>Predator:</strong> <span>${escapeHtml(predatorName)}</span></div>

        <div class="meta-field"><strong>Exported:</strong> <span>${escapeHtml(exportDateString)}</span></div>
        <div class="meta-field"><strong>Ambition:</strong> <span>${escapeHtml(sheet.ambition)}</span></div>
        <div class="meta-field"><strong>Sire:</strong> <span>${escapeHtml(sheet.sire)}</span></div>

        <div class="meta-field" style="align-items: center;">
          <strong>Clan:</strong>
          <span style="display: inline-flex; align-items: center; min-height: 22px;">
            ${clanLogoUrl ? `<img src="${clanLogoUrl}" alt="${escapeHtml(charClan)}" style="max-height: 22px; max-width: 140px; object-fit: contain; vertical-align: middle;" />` : escapeHtml(charClan)}
          </span>
        </div>
        <div class="meta-field"><strong>Desire:</strong> <span>${escapeHtml(sheet.desire)}</span></div>
        <div class="meta-field"><strong>Generation:</strong> <span>${escapeHtml(sheet.generation)}</span></div>

        <div class="meta-field"><strong>Chronicle:</strong> <span>${escapeHtml(sheet.chronicle)}</span></div>
        <div class="meta-field"><strong>Coterie:</strong> <span>${escapeHtml(sheet.coterie)}</span></div>
        <div class="meta-field"><strong>Blood Potency:</strong> <span>${escapeHtml(sheet.blood_potency)}</span></div>

        <div class="meta-field"><strong>Title:</strong> <span>${escapeHtml(domainTitle)}</span></div>
        <div class="meta-field"><strong>Status:</strong> <span>${escapeHtml(charStatus)}</span></div>
        <div class="meta-field"><strong>Experience:</strong> <span>${escapeHtml(xpSummary)}</span></div>
      </div>

      <div class="section-title">ATTRIBUTES</div>
      <div class="three-col">
        <div>
          <div class="col-header">Physical</div>
          <div class="stat-row"><span>Strength</span> ${renderDots(getAttr('Strength'))}</div>
          <div class="stat-row"><span>Dexterity</span> ${renderDots(getAttr('Dexterity'))}</div>
          <div class="stat-row"><span>Stamina</span> ${renderDots(getAttr('Stamina'))}</div>
        </div>
        <div>
          <div class="col-header">Social</div>
          <div class="stat-row"><span>Charisma</span> ${renderDots(getAttr('Charisma'))}</div>
          <div class="stat-row"><span>Manipulation</span> ${renderDots(getAttr('Manipulation'))}</div>
          <div class="stat-row"><span>Composure</span> ${renderDots(getAttr('Composure'))}</div>
        </div>
        <div>
          <div class="col-header">Mental</div>
          <div class="stat-row"><span>Intelligence</span> ${renderDots(getAttr('Intelligence'))}</div>
          <div class="stat-row"><span>Wits</span> ${renderDots(getAttr('Wits'))}</div>
          <div class="stat-row"><span>Resolve</span> ${renderDots(getAttr('Resolve'))}</div>
        </div>
      </div>

      <div class="section-title">SKILLS</div>
      <div class="three-col">
        <div>
          ${renderSkillRow('Athletics')}
          ${renderSkillRow('Brawl')}
          ${renderSkillRow('Craft')}
          ${renderSkillRow('Drive')}
          ${renderSkillRow('Firearms')}
          ${renderSkillRow('Larceny')}
          ${renderSkillRow('Melee')}
          ${renderSkillRow('Stealth')}
          ${renderSkillRow('Survival')}
        </div>
        <div>
          ${renderSkillRow('Animal Ken')}
          ${renderSkillRow('Etiquette')}
          ${renderSkillRow('Insight')}
          ${renderSkillRow('Intimidation')}
          ${renderSkillRow('Leadership')}
          ${renderSkillRow('Performance')}
          ${renderSkillRow('Persuasion')}
          ${renderSkillRow('Streetwise')}
          ${renderSkillRow('Subterfuge')}
        </div>
        <div>
          ${renderSkillRow('Academics')}
          ${renderSkillRow('Awareness')}
          ${renderSkillRow('Finance')}
          ${renderSkillRow('Investigation')}
          ${renderSkillRow('Medicine')}
          ${renderSkillRow('Occult')}
          ${renderSkillRow('Politics')}
          ${renderSkillRow('Science')}
          ${renderSkillRow('Technology')}
        </div>
      </div>

      <div class="trackers two-col">
        <div>
          <div class="tracker-row">
            <strong>HEALTH</strong>
            ${renderTrackerBoxes(maxHealth, healthAgg, healthSup, false)}
          </div>
          <div class="tracker-row">
            <strong>WILLPOWER</strong>
            ${renderTrackerBoxes(maxWillpower, wpAgg, wpSup, false)}
          </div>
        </div>
        <div>
          <div class="tracker-row">
            <strong>HUMANITY</strong>
            ${renderTrackerBoxes(10, 0, 0, true, humanityVal, stains, false)}
          </div>
          <div class="tracker-row">
            <strong>HUNGER</strong>
            ${renderTrackerBoxes(5, 0, 0, true, hungerVal, 0, true)}
          </div>
        </div>
      </div>

      <div class="section-title">BLOOD POTENCY &amp; CLAN CURSE</div>
      <div class="two-col avoid-break" style="margin-bottom: 20px;">
        <div style="background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 12px 16px;">
          <div style="font-family: 'Oswald', sans-serif; font-size: 15px; color: #8a0303; border-bottom: 1px solid #8a0303; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase;">
            Blood Potency Milestones (Rating ${bpLevel})
          </div>
          <div style="font-size: 13px; line-height: 1.5; color: #333;">
            <div style="margin-bottom: 4px;"><strong>Blood Surge:</strong> ${escapeHtml(bpInfo.surge)}</div>
            <div style="margin-bottom: 4px;"><strong>Damage Mended:</strong> ${escapeHtml(bpInfo.mend)} per Rouse Check</div>
            <div style="margin-bottom: 4px;"><strong>Power Bonus:</strong> ${escapeHtml(bpInfo.bonus)}</div>
            <div style="margin-bottom: 4px;"><strong>Rouse Re:roll:</strong> ${escapeHtml(bpInfo.rouse)}</div>
            <div style="margin-bottom: 4px;"><strong>Feeding Penalty:</strong> ${escapeHtml(bpInfo.feeding)}</div>
            <div><strong>Bane Severity:</strong> Rating ${escapeHtml(baneSeverity)}</div>
          </div>
        </div>

        <div style="background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 12px 16px;">
          <div style="font-family: 'Oswald', sans-serif; font-size: 15px; color: #8a0303; border-bottom: 1px solid #8a0303; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase;">
            Clan Curse (${escapeHtml(charClan)})
          </div>
          <div style="font-size: 13px; line-height: 1.5; color: #333;">
            ${cleanClanBane ? `
              <div style="margin-bottom: 8px;">
                <strong style="color: #8a0303;">Bane (Severity ${escapeHtml(baneSeverity)}):</strong>
                <div style="font-size: 12px; color: #555; margin-top: 2px; line-height: 1.35;">${escapeHtml(cleanClanBane)}</div>
              </div>
            ` : ''}
            ${cleanClanCompulsion ? `
              <div>
                <strong style="color: #8a0303;">Compulsion:</strong>
                <div style="font-size: 12px; color: #555; margin-top: 2px; line-height: 1.35;">${escapeHtml(cleanClanCompulsion)}</div>
              </div>
            ` : ''}
            ${(!cleanClanBane && !cleanClanCompulsion) ? '<div style="font-style: italic; color: #999;">No clan curse recorded</div>' : ''}
          </div>
        </div>
      </div>

      <div class="section-title">DISCIPLINES &amp; POWERS</div>
      ${activeDisciplines.length ? `
        <div class="two-col">
          <div>
            ${leftDiscs.map(([d, val]) => renderDisciplineBlock(d, val)).join('')}
          </div>
          <div>
            ${rightDiscs.map(([d, val]) => renderDisciplineBlock(d, val)).join('')}
          </div>
        </div>
      ` : '<div class="adv-empty" style="text-align: center; margin-bottom: 10px;">None</div>'}

      ${(sortedBsRituals.length || sortedObCeremonies.length) ? `
        <div class="section-title">RITUALS &amp; CEREMONIES</div>
        <div class="${(sortedBsRituals.length && sortedObCeremonies.length) ? 'two-col' : ''}">
          ${sortedBsRituals.length ? `
            <div>
              <div class="col-header">Blood Sorcery Rituals</div>
              ${sortedBsRituals.map(r => {
                const full = getRitualFullData('blood_sorcery', r.id || r.name || r) || {};
                const name = r.name || full.name || r.id || String(r);
                const lvl = r.level || full.level || 1;
                const effect = (r.desc || r.description || r.effect || full.effect || full.description || '').replace(/[—–]/g, ', ');
                const source = (r.source || full.source || '').replace(/[—–]/g, ', ');
                return `
                  <div class="adv-entry avoid-break">
                    <div class="stat-row">
                      <span><strong>${escapeHtml(name)}</strong></span>
                      <span style="font-family: 'Oswald', sans-serif; font-size: 12px; color: #8a0303; text-transform: uppercase;">Level ${escapeHtml(lvl)}</span>
                    </div>
                    ${effect ? `<div class="adv-desc" style="margin-bottom: 3px;">${escapeHtml(effect)}</div>` : ''}
                    ${source ? `
                      <div style="font-size: 11px; color: #666; margin-top: 2px;">
                        <span><strong>Page:</strong> ${escapeHtml(source)}</span>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
          ${sortedObCeremonies.length ? `
            <div>
              <div class="col-header">Oblivion Ceremonies</div>
              ${sortedObCeremonies.map(r => {
                const full = getRitualFullData('oblivion', r.id || r.name || r) || {};
                const name = r.name || full.name || r.id || String(r);
                const lvl = r.level || full.level || 1;
                const effect = (r.desc || r.description || r.effect || full.effect || full.description || '').replace(/[—–]/g, ', ');
                const source = (r.source || full.source || '').replace(/[—–]/g, ', ');
                return `
                  <div class="adv-entry avoid-break">
                    <div class="stat-row">
                      <span><strong>${escapeHtml(name)}</strong></span>
                      <span style="font-family: 'Oswald', sans-serif; font-size: 12px; color: #8a0303; text-transform: uppercase;">Level ${escapeHtml(lvl)}</span>
                    </div>
                    ${effect ? `<div class="adv-desc" style="margin-bottom: 3px;">${escapeHtml(effect)}</div>` : ''}
                    ${source ? `
                      <div style="font-size: 11px; color: #666; margin-top: 2px;">
                        <span><strong>Page:</strong> ${escapeHtml(source)}</span>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="section-title">ADVANTAGES &amp; FLAWS</div>
      <div class="two-col">
        <div>
          <div class="col-header">Merits</div>
          ${merits.map(m => `
            <div class="adv-entry avoid-break">
              <div class="stat-row"><span>${escapeHtml(m.name || m.id)}</span> ${renderDots(m.dots)}</div>
              ${m.description ? `<div class="adv-desc">${escapeHtml(m.description)}</div>` : ''}
            </div>
          `).join('') || '<div class="adv-empty">None</div>'}
        </div>
        <div>
          <div class="col-header">Flaws</div>
          ${flaws.map(f => `
            <div class="adv-entry avoid-break">
              <div class="stat-row"><span>${escapeHtml(f.name || f.id)}</span> ${renderDots(f.dots)}</div>
              ${f.description ? `<div class="adv-desc">${escapeHtml(f.description)}</div>` : ''}
            </div>
          `).join('') || '<div class="adv-empty">None</div>'}
        </div>
      </div>

      ${backgrounds.length ? `
        <div class="section-title">BACKGROUNDS</div>
        <div class="two-col">
          ${backgrounds.map(b => `
            <div class="adv-entry avoid-break">
              <div class="stat-row"><span>${escapeHtml(b.name || b.id)}</span> ${renderDots(b.dots)}</div>
              ${b.description ? `<div class="adv-desc">${escapeHtml(b.description)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${(convictions.length || touchstones.length) ? `
        <div class="section-title">TOUCHSTONES & CONVICTIONS</div>
        <div class="two-col">
          <div>
            <div class="col-header">Convictions</div>
            ${convictions.length
              ? convictions.map(c => `<div class="stat-row avoid-break">${escapeHtml(c)}</div>`).join('')
              : '<div class="adv-empty">None</div>'}
          </div>
          <div>
            <div class="col-header">Touchstones</div>
            ${touchstones.length
              ? touchstones.map(t => `
                  <div class="adv-entry avoid-break">
                    <div class="stat-row"><span>${escapeHtml(t.name)}</span></div>
                    ${t.conviction ? `<div class="adv-desc"><em>${escapeHtml(t.conviction)}</em></div>` : ''}
                    ${(t.background || t.description) ? `<div class="adv-desc">${escapeHtml(t.background || t.description)}</div>` : ''}
                  </div>
                `).join('')
              : '<div class="adv-empty">None</div>'}
          </div>
        </div>
      ` : ''}

      ${inventoryItems.length ? `
        <div class="section-title">INVENTORY</div>
        <div class="two-col">
          ${inventoryItems.map(item => `
            <div class="adv-entry avoid-break">
              <div class="stat-row"><span>${escapeHtml(item.name)} ${item.quantity > 1 ? `(x${escapeHtml(item.quantity)})` : ''}</span><span style="font-size:12px; color:#8a0303; text-transform:uppercase;">${escapeHtml(item.item_type || 'Item')}</span></div>
              ${item.description ? `<div class="adv-desc">${escapeHtml(item.description)}</div>` : ''}
              ${item.mechanic_notes ? `<div class="adv-desc"><strong>System:</strong> ${escapeHtml(item.mechanic_notes)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  // --- HTML for the ENTIRE New Window (Includes CDN and Button) ---
  const fullHtmlPage = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(charName)}: V5 Sheet</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
          body {
            margin: 0; 
            background: #e5e5e5; 
            display: flex; 
            flex-direction: column;
            align-items: center; 
            padding: 40px 20px;
            font-family: sans-serif;
          }
          .sheet-wrapper {
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            background: #fff;
          }
          .action-area {
            width: 100%;
            max-width: 800px; /* Matches the sheet width */
            margin-bottom: 20px;
            display: flex;
          }
          .btn-download {
            background-color: #8a0303;
            color: #fff;
            border: none;
            padding: 20px;
            font-size: 20px;
            border-radius: 0px; /* Sharp, boxy corners */
            cursor: pointer;
            font-weight: bold;
            width: 100%; /* Long, full width */
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            transition: all 0.2s ease;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .btn-download:hover {
            background-color: #600202;
          }
          .btn-download:disabled {
            background-color: #555;
            cursor: wait;
          }
        </style>
      </head>
      <body>
        
        <div class="action-area">
          <button id="download-btn" class="btn-download">Download PDF</button>
        </div>

        <div class="sheet-wrapper">
          ${contentHtml}
        </div>

        <script>
          document.getElementById('download-btn').addEventListener('click', function() {
            var btn = this;
            var originalText = btn.innerText;
            
            // UI feedback while processing
            btn.innerText = 'GENERATING PDF... PLEASE WAIT';
            btn.disabled = true;

            var element = document.getElementById('vtm-sheet-content');
            
            // MAGIC FIX: scrollY: 0 prevents the huge blank space at the top
            var opt = {
              margin:       [5, 0, 5, 0],
              filename:     '${safeFileName}',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true, scrollY: 0, scrollX: 0 },
              jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
              pagebreak:    { mode: ['css', 'legacy'] }
            };

            // Call the globally loaded html2pdf library
            html2pdf().set(opt).from(element).save().then(function() {
               // Restore button state after download starts
               btn.innerText = originalText;
               btn.disabled = false;
            }).catch(function(err) {
               console.error("PDF Generation Error:", err);
               alert("An error occurred while generating the PDF.");
               btn.innerText = originalText;
               btn.disabled = false;
            });
          });
        </script>

      </body>
    </html>
  `;

  // 2. Convert the HTML string into a Blob URL to avoid the 'about:blank' display
  const blob = new Blob([fullHtmlPage], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  
  const printWindow = window.open(blobUrl, '_blank');
  
  if (!printWindow) {
    alert("Pop-up blocked! Could not open the new tab to view your character sheet.");
  }
}