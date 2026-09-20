import {
  computeOutcome,
  rollPool,
  runRouseCheck,
  rerollNormalDice,
  disciplineRequiresRouse,
  getBloodPotencyStats,
  summarizeTrackers,
} from './liveSessionMechanics';

describe('liveSessionMechanics', () => {
  test('detects messy critical when hunger die is 10 in critical pair', () => {
    const out = computeOutcome([10], [10], 2);
    expect(out.hasCritical).toBe(true);
    expect(out.hasMessyCritical).toBe(true);
    expect(out.label).toBe('Messy Critical');
  });

  test('detects bestial failure when test fails with hunger 1', () => {
    const out = computeOutcome([2, 3], [1], 2);
    expect(out.hasBestialFailure).toBe(true);
    expect(out.label).toBe('Bestial Failure');
  });

  test('rouse check failure increments hunger', () => {
    const failRng = () => 0.0; // die=1
    const result = runRouseCheck(3, failRng);
    expect(result.success).toBe(false);
    expect(result.nextHunger).toBe(4);
  });

  test('willpower reroll updates only selected normal dice', () => {
    let callCount = 0;
    const rng = () => {
      callCount += 1;
      return 0.9; // die=10
    };
    const { rerolled, selectedCount } = rerollNormalDice([1, 2, 3, 4], [1, 3], rng);
    expect(selectedCount).toBe(2);
    expect(callCount).toBe(2);
    expect(rerolled).toEqual([1, 10, 3, 10]);
  });

  test('rollPool enforces hunger cap by pool size', () => {
    const rng = () => 0.5;
    const roll = rollPool(2, 5, 1, rng);
    expect(roll.hungerDice).toHaveLength(2);
    expect(roll.normalDice).toHaveLength(0);
  });

  test('rollPool with zero pool returns no dice and failure outcome', () => {
    const roll = rollPool(0, 0, 1, () => 0.9);
    expect(roll.normalDice).toEqual([]);
    expect(roll.hungerDice).toEqual([]);
    expect(roll.outcome.metDifficulty).toBe(false);
  });

  test('computeOutcome fails when difficulty is above possible successes', () => {
    const out = computeOutcome([10, 10], [], 10);
    expect(out.successes).toBe(4);
    expect(out.metDifficulty).toBe(false);
    expect(out.label).toBe('Failure');
  });

  test('discipline rouse parsing works with textual costs', () => {
    expect(disciplineRequiresRouse({ cost: '1 Rouse Check' })).toBe(true);
    expect(disciplineRequiresRouse({ cost: 'Free' })).toBe(false);
  });

  test('getBloodPotencyStats returns correct V5 values across tiers', () => {
    const bp0 = getBloodPotencyStats(0);
    expect(bp0.surgeBonus).toBe(1);
    expect(bp0.mendAmount).toBe(1);
    expect(bp0.disciplineBonus).toBe(0);
    expect(bp0.rouseRerollLevel).toBe(0);
    expect(bp0.baneSeverity).toBe(0);
    expect(bp0.feedingPenalty).toBe('No effect');

    const bp1 = getBloodPotencyStats(1);
    expect(bp1.surgeBonus).toBe(2);
    expect(bp1.mendAmount).toBe(1);
    expect(bp1.disciplineBonus).toBe(0);
    expect(bp1.rouseRerollLevel).toBe(1);
    expect(bp1.baneSeverity).toBe(2);
    expect(bp1.feedingPenalty).toBe('No effect');

    const bp2 = getBloodPotencyStats(2);
    expect(bp2.surgeBonus).toBe(2);
    expect(bp2.mendAmount).toBe(2);
    expect(bp2.disciplineBonus).toBe(1);
    expect(bp2.rouseRerollLevel).toBe(1);
    expect(bp2.baneSeverity).toBe(2);

    const bp3 = getBloodPotencyStats(3);
    expect(bp3.surgeBonus).toBe(3);
    expect(bp3.mendAmount).toBe(2);
    expect(bp3.disciplineBonus).toBe(1);
    expect(bp3.rouseRerollLevel).toBe(2);
    expect(bp3.baneSeverity).toBe(3);

    const bp5 = getBloodPotencyStats(5);
    expect(bp5.surgeBonus).toBe(4);
    expect(bp5.mendAmount).toBe(3);
    expect(bp5.disciplineBonus).toBe(2);
    expect(bp5.rouseRerollLevel).toBe(3);
    expect(bp5.baneSeverity).toBe(4);
  });

  test('summarizeTrackers reads blood_potency and handles Thin-bloods', () => {
    const t1 = summarizeTrackers({ blood_potency: 3 });
    expect(t1.bloodPotency).toBe(3);

    const t2 = summarizeTrackers({ bloodPotency: 2 });
    expect(t2.bloodPotency).toBe(2);

    const tThin = summarizeTrackers({ clan: 'Thin-blood' });
    expect(tThin.bloodPotency).toBe(0);

    const tDefault = summarizeTrackers({});
    expect(tDefault.bloodPotency).toBe(1);
  });
});
