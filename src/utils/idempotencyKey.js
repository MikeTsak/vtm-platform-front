// src/utils/idempotencyKey.js
//
// Deterministic, content-based idempotency keys for the small list of
// mutations where a duplicate submission would cause real harm (XP is a
// limited, spendable resource). The SAME purchase attempt (same fields)
// always produces the SAME key string, no need to track "is this a retry"
// state across renders; a genuinely new purchase (different level,
// different target, ...) naturally produces a different key instead.
//
// This intentionally is NOT applied globally in core/api.js (see the note
// there), only called explicitly at the handful of call sites that opt in.

/**
 * The XP balance before the purchase is part of the key: repeated clicks on
 * one purchase share it (one key, processed once), while a deliberate repeat
 * of the same purchase later (Contacts +1 twice) comes after the balance
 * moved, so it gets a fresh key instead of replaying the first response.
 *
 * @param {object} payload the exact body being POSTed to an XP-spend endpoint
 * @param {number} [xpBefore] the character's XP balance when the purchase was made
 * @returns {string} a stable key: identical payloads at the same balance produce identical keys
 */
export function buildXpSpendIdempotencyKey(payload, xpBefore) {
  const { type, target, currentLevel, newLevel, ritualLevel, formulaLevel, dots, disciplineKind, specialty, powerName, powerId } = payload || {};
  return [
    'xp-spend', xpBefore, type, target, currentLevel, newLevel,
    ritualLevel, formulaLevel, dots, disciplineKind, specialty, powerName || powerId,
  ]
    .map((v) => (v === undefined || v === null ? '' : String(v)))
    .join('|');
}
