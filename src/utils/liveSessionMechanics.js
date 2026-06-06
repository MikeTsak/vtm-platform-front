export const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export const rollD10 = (rng = Math.random) => Math.floor(rng() * 10) + 1;

export const COMMON_ROLLS = [
  { key: 'alertness', label: 'Alertness', attribute: 'Wits', skill: 'Awareness' },
  { key: 'convincing', label: 'Convincing', attribute: 'Manipulation', skill: 'Persuasion' },
  { key: 'dodging', label: 'Dodging', attribute: 'Dexterity', skill: 'Athletics' },
  { key: 'lying', label: 'Lying', attribute: 'Manipulation', skill: 'Subterfuge' },
  { key: 'punching', label: 'Punching', attribute: 'Strength', skill: 'Brawl' },
  { key: 'observing', label: 'Observing', attribute: 'Wits', skill: 'Awareness' },
  { key: 'reading-emotions', label: 'Reading Emotions', attribute: 'Wits', skill: 'Insight' },
  { key: 'sneaking', label: 'Sneaking', attribute: 'Dexterity', skill: 'Stealth' },
];

export function computeOutcome(normalDice, hungerDice, difficulty = 0) {
  const normal = Array.isArray(normalDice) ? normalDice : [];
  const hunger = Array.isArray(hungerDice) ? hungerDice : [];
  const all = [...normal, ...hunger];

  const baseSuccesses = all.filter((die) => die >= 6).length;
  const totalTens = all.filter((die) => die === 10).length;
  const hungerTens = hunger.filter((die) => die === 10).length;
  const extraFromPairs = Math.floor(totalTens / 2) * 2;
  const successes = baseSuccesses + extraFromPairs;

  const hasCritical = totalTens >= 2;
  const hasMessyCritical = hasCritical && hungerTens > 0;
  const metDifficulty = Number(difficulty) > 0 ? successes >= Number(difficulty) : successes > 0;
  const hasBestialFailure = !metDifficulty && hunger.some((die) => die === 1);

  let label = 'Failure';
  if (metDifficulty) label = 'Success';
  if (hasCritical && metDifficulty) label = 'Critical';
  if (hasMessyCritical && metDifficulty) label = 'Messy Critical';
  if (hasBestialFailure) label = 'Bestial Failure';

  return {
    successes,
    extraFromPairs,
    hasCritical,
    hasMessyCritical,
    hasBestialFailure,
    metDifficulty,
    label,
  };
}

export function rollPool(pool, hunger, difficulty = 0, rng = Math.random) {
  const totalPool = clamp(pool, 0, 30);
  const hungerLevel = clamp(hunger, 0, 5);
  const hungerCount = Math.min(totalPool, hungerLevel);
  const normalCount = totalPool - hungerCount;

  const normalDice = Array.from({ length: normalCount }, () => rollD10(rng));
  const hungerDice = Array.from({ length: hungerCount }, () => rollD10(rng));
  const outcome = computeOutcome(normalDice, hungerDice, difficulty);

  return {
    pool: totalPool,
    hunger: hungerLevel,
    difficulty: Number(difficulty) || 0,
    normalDice,
    hungerDice,
    outcome,
  };
}

export function runRouseCheck(currentHunger, rng = Math.random) {
  const die = rollD10(rng);
  const success = die >= 6;
  return {
    die,
    success,
    nextHunger: success ? clamp(currentHunger, 0, 5) : clamp((Number(currentHunger) || 0) + 1, 0, 5),
  };
}

export function rerollNormalDice(normalDice, selectedIndices, rng = Math.random) {
  const selected = Array.from(new Set(selectedIndices || [])).slice(0, 3);
  const next = (normalDice || []).map((die, idx) => (selected.includes(idx) ? rollD10(rng) : die));
  return { rerolled: next, selectedCount: selected.length };
}

export function getPoolFromCharacter(characterSheet, attribute, skill) {
  const attr = Number(characterSheet?.attributes?.[attribute]) || 0;
  const skl = Number(characterSheet?.skills?.[skill]) || 0;
  return Math.max(0, attr + skl);
}

export function disciplineRequiresRouse(power) {
  const cost = String(power?.cost || '').toLowerCase();
  return /rouse/.test(cost);
}

export function summarizeTrackers(sheet) {
  const stamina = Number(sheet?.attributes?.Stamina) || 1;
  const fortitude = Number(sheet?.disciplines?.Fortitude) || 0;
  const maxHealth = Math.max(1, stamina + 3 + fortitude);
  const maxWillpower = Math.max(
    1,
    (Number(sheet?.attributes?.Composure) || 1) + (Number(sheet?.attributes?.Resolve) || 1)
  );

  return {
    hunger: clamp(sheet?.hunger ?? 1, 0, 5),
    health: {
      superficial: clamp(sheet?.health?.superficial ?? 0, 0, maxHealth),
      aggravated: clamp(sheet?.health?.aggravated ?? 0, 0, maxHealth),
      max: maxHealth,
    },
    willpower: {
      superficial: clamp(sheet?.willpower?.superficial ?? 0, 0, maxWillpower),
      aggravated: clamp(sheet?.willpower?.aggravated ?? 0, 0, maxWillpower),
      max: maxWillpower,
    },
  };
}
