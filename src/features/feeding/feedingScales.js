// src/features/feeding/feedingScales.js
//
// Continuous color scales for the two independent numbers shown in the
// Feeding domain picker — Safety (0-10, green = safe -> red = exposed) and
// Hunting Difficulty (2-7, blue = easiest -> orange = hardest). Plain HSL
// interpolation, not a fixed palette, so every value in range gets its own
// shade rather than snapping between a few buckets.

export function safetyColor(safety) {
  const t = Math.max(0, Math.min(10, Number(safety) || 0)) / 10; // 0..1
  const hue = t * 120; // 0 red -> 120 green
  return `hsl(${hue}, 70%, 55%)`;
}

export function difficultyColor(difficulty) {
  const t = (Math.max(2, Math.min(7, Number(difficulty) || 2)) - 2) / 5; // 0..1
  const hue = 210 - t * 180; // 210 blue -> 30 orange
  return `hsl(${hue}, 70%, 58%)`;
}
