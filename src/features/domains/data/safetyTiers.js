// Masquerade safety tiers for a division's safety_rating (0-10, lower is worse).
// A null rating is a distinct "Unknown" state (not assessed yet), not the
// same as a numeric 10: a fresh claim or untouched division hasn't been
// vetted by the Court, so it shouldn't silently read as "Secure".
// Shared by the Domains map and the Court Actions danger ranking.
export const SAFETY_TIERS = [
  { min: 8, label: 'Secure', color: '#22c55e' },
  { min: 5, label: 'Stable', color: '#eab308' },
  { min: 3, label: 'At Risk', color: '#f97316' },
  { min: 0, label: 'Critical', color: '#ef4444' },
];
export const UNKNOWN_TIER = { label: 'Unknown', color: '#64748b' };
export function safetyTier(rating) {
  if (rating == null) return UNKNOWN_TIER;
  return SAFETY_TIERS.find(t => rating >= t.min) || SAFETY_TIERS[SAFETY_TIERS.length - 1];
}
