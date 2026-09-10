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
  const critPairs = Math.floor(totalTens / 2);
  const extraFromPairs = critPairs * 2;
  const successes = baseSuccesses + extraFromPairs;

  const metDifficulty = Number(difficulty) > 0 ? successes >= Number(difficulty) : successes > 0;
  // A critical / messy critical only exists on a winning roll (V5 core).
  const hasCritical = totalTens >= 2 && metDifficulty;
  const hasMessyCritical = hasCritical && hungerTens > 0;
  const hasBestialFailure = !metDifficulty && hunger.some((die) => die === 1);

  let label = 'Failure';
  if (metDifficulty) label = 'Success';
  if (hasCritical) label = 'Critical';
  if (hasMessyCritical) label = 'Messy Critical';
  if (hasBestialFailure) label = 'Bestial Failure';

  return {
    successes,
    extraFromPairs,
    critPairs,
    hasCritical,
    hasMessyCritical,
    hasBestialFailure,
    metDifficulty,
    label,
  };
}

// V5 damage application: Superficial is halved (round up) before it lands, and
// once the track is full further damage converts Superficial -> Aggravated 1:1.
// Aggravated fills from the bottom, pushing Superficial out the same way.
export function applyHealthDamage(track, rawAmount, type = 'superficial', opts = {}) {
  const max = Math.max(1, Number(opts.max) || 10);
  let sup = clamp(track?.superficial ?? 0, 0, max);
  let agg = clamp(track?.aggravated ?? 0, 0, max);
  let amount = Math.max(0, Math.round(Number(rawAmount) || 0));
  if (type === 'superficial' && opts.halve) amount = Math.ceil(amount / 2);

  for (let i = 0; i < amount; i += 1) {
    if (sup + agg < max) {
      if (type === 'aggravated') agg += 1; else sup += 1;
    } else if (sup > 0) {
      sup -= 1; agg += 1;                 // rollover / conversion
    } else {
      agg = Math.min(max, agg + 1);       // already all-aggravated (Final Death territory)
    }
  }
  return { superficial: sup, aggravated: agg, appliedAmount: amount };
}

export const remorsePool = (humanity, stains) =>
  Math.max(1, 10 - (Number(humanity) || 0) - (Number(stains) || 0));

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
  const fortDots = Number(sheet?.disciplines?.Fortitude) || 0;
  // RAW: Fortitude adds to the Health track only via the Resilience power. If the
  // sheet lists Fortitude powers, require Resilience; if it tracks no powers at
  // all, keep the old assumption so existing characters don't lose boxes.
  const fortPowers = sheet?.disciplinePowers?.Fortitude;
  const hasResilience = !Array.isArray(fortPowers) || fortPowers.length === 0
    || fortPowers.some((p) => /resilien/i.test(String(p?.id ?? p?.name ?? p)));
  const maxHealth = Math.max(1, stamina + 3 + (hasResilience ? fortDots : 0));
  const maxWillpower = Math.max(
    1,
    (Number(sheet?.attributes?.Composure) || 1) + (Number(sheet?.attributes?.Resolve) || 1)
  );

  const health = {
    superficial: clamp(sheet?.health?.superficial ?? 0, 0, maxHealth),
    aggravated: clamp(sheet?.health?.aggravated ?? 0, 0, maxHealth),
    max: maxHealth,
  };
  const willpower = {
    superficial: clamp(sheet?.willpower?.superficial ?? 0, 0, maxWillpower),
    aggravated: clamp(sheet?.willpower?.aggravated ?? 0, 0, maxWillpower),
    max: maxWillpower,
  };
  const humanity = clamp(sheet?.humanity ?? sheet?.morality?.humanity ?? 7, 0, 10);
  const stains = clamp(sheet?.stains ?? 0, 0, 10);

  return {
    hunger: clamp(sheet?.hunger ?? 1, 0, 5),
    bloodPotency: clamp(sheet?.bloodPotency ?? 1, 0, 10),
    humanity,
    stains,
    health,
    willpower,
    healthImpaired: health.superficial + health.aggravated >= health.max,
    willpowerImpaired: willpower.superficial + willpower.aggravated >= willpower.max,
    inTorpor: health.aggravated >= health.max,
    // Degeneration: more Stains than empty Humanity boxes.
    degeneration: stains > (10 - humanity),
  };
}
