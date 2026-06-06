import {
  computeOutcome,
  rollPool,
  runRouseCheck,
  rerollNormalDice,
  disciplineRequiresRouse,
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
    const rng = jest.fn().mockReturnValue(0.9); // die=10
    const { rerolled, selectedCount } = rerollNormalDice([1, 2, 3, 4], [1, 3], rng);
    expect(selectedCount).toBe(2);
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
});
