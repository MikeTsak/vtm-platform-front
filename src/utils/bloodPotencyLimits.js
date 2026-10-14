// src/utils/bloodPotencyLimits.js
// Mirror of back/utils/bloodPotencyLimits.js (the server enforces it): a Kindred's generation
// sets the lowest and highest Blood Potency they can hold. No generation on the sheet = 0..10.
const TABLE = {
  4: { min: 5, max: 10 },
  5: { min: 4, max: 9 },
  6: { min: 3, max: 8 },
  7: { min: 3, max: 7 },
  8: { min: 2, max: 6 },
  9: { min: 2, max: 5 },
  10: { min: 1, max: 4 },
  11: { min: 1, max: 4 },
  12: { min: 1, max: 3 },
  13: { min: 1, max: 3 },
  14: { min: 0, max: 0 },
};

export function bloodPotencyLimits(generation) {
  const g = Math.floor(Number(generation));
  if (!Number.isFinite(g) || g < 1) return { min: 0, max: 10 };
  if (g <= 4) return TABLE[4];
  if (g >= 14) return TABLE[14];
  return TABLE[g];
}

const ordinal = (n) => `${n}${[, 'st', 'nd', 'rd'][(n % 100 >> 3) ^ 1 && n % 10] || 'th'}`;

/** Why a Blood Potency level is out of reach, shown in place of the Buy button. */
export function bloodPotencyLimitMessage(generation) {
  const { min, max } = bloodPotencyLimits(generation);
  return `As a ${ordinal(Math.floor(Number(generation)))}-generation Kindred your Blood Potency can only range from ${min} to ${max}, `
    + `so you cannot raise it above ${max}. It can only go higher if your generation changes.`;
}

export const clampBloodPotency = (value, generation) => {
  const { min, max } = bloodPotencyLimits(generation);
  return Math.max(min, Math.min(max, Number(value) || 0));
};
