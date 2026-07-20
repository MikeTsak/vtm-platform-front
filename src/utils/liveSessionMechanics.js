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

export function getBloodPotencyStats(bp) {
  const level = clamp(Number(bp) || 0, 0, 10);
  const surgeBonuses = [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6];
  const rouseRerollLevels = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
  const mendAmounts = [1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 5];
  const disciplineBonuses = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5];
  const baneSeverities = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
  
  return {
    surgeBonus: surgeBonuses[level],
    rouseRerollLevel: rouseRerollLevels[level],
    mendAmount: mendAmounts[level],
    disciplineBonus: disciplineBonuses[level],
    baneSeverity: baneSeverities[level],
  };
}

export function runRouseCheck(currentHunger, rng = Math.random, advantage = false) {
  const die1 = rollD10(rng);
  const die2 = advantage ? rollD10(rng) : 0;
  const bestDie = Math.max(die1, die2);
  const success = bestDie >= 6;
  return {
    die: bestDie,
    die1,
    die2,
    advantage,
    success,
    nextHunger: success ? clamp(currentHunger, 0, 5) : clamp((Number(currentHunger) || 0) + 1, 0, 5),
  };
}

export function rerollNormalDice(normalDice, selectedIndices, rng = Math.random) {
  const selected = Array.from(new Set(selectedIndices || [])).slice(0, 3);
  const next = (normalDice || []).map((die, idx) => (selected.includes(idx) ? rollD10(rng) : die));
  return { rerolled: next, selectedCount: selected.length };
}

export function getTraitValue(sheet, traitName) {
  if (!traitName) return 0;
  if (sheet?.attributes?.[traitName] !== undefined) return Number(sheet.attributes[traitName]) || 0;
  
  const skillData = sheet?.skills?.[traitName];
  if (skillData !== undefined) {
    if (typeof skillData === 'object') return Number(skillData.dots) || 0;
    return Number(skillData) || 0;
  }
  
  if (sheet?.disciplines?.[traitName] !== undefined) return Number(sheet.disciplines[traitName]) || 0;
  return 0;
}

export function getPoolFromCharacter(sheet, trait1, trait2) {
  return getTraitValue(sheet, trait1) + getTraitValue(sheet, trait2);
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
    bloodPotency: clamp(sheet?.bloodPotency ?? 1, 0, 10),
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
