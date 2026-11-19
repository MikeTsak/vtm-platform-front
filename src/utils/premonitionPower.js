// src/utils/premonitionPower.js
// Mirrors back/utils/sheet.js hasPremonitionPower so UI gating matches backend enforcement.

function matchesPremonitionEntry(entry) {
  if (!entry) return false;
  if (typeof entry === 'string') return entry.trim().toLowerCase() === 'premonition';
  if (typeof entry === 'object') {
    return String(entry.id || '').trim().toLowerCase() === 'premonition'
      || String(entry.name || '').trim().toLowerCase() === 'premonition';
  }
  return false;
}

export function hasPremonitionPower(rawSheet) {
  let sheet = rawSheet;
  if (typeof sheet === 'string') {
    try { sheet = JSON.parse(sheet); } catch { sheet = null; }
  }
  if (!sheet || typeof sheet !== 'object') return false;

  const dp = sheet.disciplinePowers;
  if (dp && typeof dp === 'object') {
    for (const [disc, list] of Object.entries(dp)) {
      if (disc.trim().toLowerCase() === 'auspex' && Array.isArray(list)) {
        if (list.some(matchesPremonitionEntry)) return true;
      }
    }
  }
  if (Array.isArray(sheet.ingrained_flaws)) {
    for (const flaw of sheet.ingrained_flaws) {
      if (Array.isArray(flaw?.bonus_powers) && flaw.bonus_powers.some(matchesPremonitionEntry)) {
        return true;
      }
    }
  }
  return false;
}
