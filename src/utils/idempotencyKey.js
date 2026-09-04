// src/utils/idempotencyKey.js
//
// Deterministic, content-based idempotency keys for the small list of
// mutations where a duplicate submission would cause real harm (XP is a
// limited, spendable resource). The SAME purchase attempt (same fields)
// always produces the SAME key string — no need to track "is this a retry"
// state across renders; a genuinely new purchase (different level,
// different target, ...) naturally produces a different key instead.
//
// This intentionally is NOT applied globally in core/api.js (see the note
// there) — only called explicitly at the handful of call sites that opt in.

/**
 * @param {object} payload the exact body being POSTed to an XP-spend endpoint
 * @returns {string} a stable key: identical payloads produce identical keys
 */
export function buildXpSpendIdempotencyKey(payload) {
  const { type, target, currentLevel, newLevel, ritualLevel, formulaLevel, dots, disciplineKind, specialty, powerName } = payload || {};
  return [
    'xp-spend', type, target, currentLevel, newLevel,
    ritualLevel, formulaLevel, dots, disciplineKind, specialty, powerName,
  ]
    .map((v) => (v === undefined || v === null ? '' : String(v)))
    .join('|');
}
