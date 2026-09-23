// src/utils/derivedStats.js
//
// Single source of truth for stats derived from the sheet, so the player
// sheet, the Storyteller editor, the admin Characters tab and Live Session
// can never disagree about a character's max Health.

// Sheets from older flows sometimes carry lower-cased keys ("stamina").
function pick(obj, key) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (key in obj) return obj[key];
  const k = Object.keys(obj).find(x => x.toLowerCase() === key.toLowerCase());
  return k ? obj[k] : undefined;
}

/** RAW: Fortitude adds to the Health track only through the Resilience power. */
export function hasResilience(sheet) {
  const powers = pick(sheet?.disciplinePowers, 'Fortitude');
  return Array.isArray(powers) && powers.some(p => /resilien/i.test(String(p?.id ?? p?.name ?? p ?? '')));
}

/** Stamina + 3, plus Fortitude dots when Resilience is owned. */
export function maxHealth(sheet) {
  const stamina = Number(pick(sheet?.attributes, 'Stamina')) || 1;
  const fortitude = Number(pick(sheet?.disciplines, 'Fortitude')) || 0;
  return stamina + 3 + (hasResilience(sheet) ? fortitude : 0);
}
