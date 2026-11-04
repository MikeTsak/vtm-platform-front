// src/utils/disciplinePowers.js
//
// One power per discipline dot (back utils/xpPurchase.js). Removing a power in
// the admin Character Editor therefore removes its dot too, so the editor's
// XP impact (counted on dots) refunds it: it used to delete only the power,
// leaving the dots and refunding nothing (character 58, 2026-11-04). A dot
// with no power picked yet, or a power beyond the dots (old data), is left as
// it is: the dot drops only while there would be more dots than powers.

/** Mutates `sheet`: removes power `idx` of `disc` and, when it left a dot without a power, that dot. */
export function removePowerAndDot(sheet, disc, idx) {
  const list = sheet.disciplinePowers?.[disc];
  if (!Array.isArray(list) || !list[idx]) return sheet;
  list.splice(idx, 1);
  const dots = Number(sheet.disciplines?.[disc] || 0);
  if (dots > list.length) sheet.disciplines[disc] = dots - 1;
  return sheet;
}
