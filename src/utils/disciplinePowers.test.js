// Run: ../back/node_modules/.bin/vitest run --root . src/utils/disciplinePowers.test.js  (front has no test runner of its own)
import { describe, it, expect } from 'vitest';
import { removePowerAndDot } from './disciplinePowers';

// Character 58's Fortitude (Nosferatu: out of clan, 7 XP x the dot's level).
const fortitude5 = () => ({
  disciplines: { Fortitude: 5 },
  disciplinePowers: {
    Fortitude: [
      { level: 1, id: 'resilience' }, { level: 1, id: 'unswayable_mind' }, { level: 2, id: 'toughness' },
      { level: 3, id: 'defy_bane' }, { level: 5, id: 'prowess_from_pain' },
    ],
  },
});

describe('removePowerAndDot', () => {
  it('removing all powers but one takes Fortitude from 5 to 1 (a 98 XP refund out of clan)', () => {
    const sheet = fortitude5();
    for (let i = 0; i < 4; i++) removePowerAndDot(sheet, 'Fortitude', 1);
    expect(sheet.disciplines.Fortitude).toBe(1);
    expect(sheet.disciplinePowers.Fortitude.map((p) => p.id)).toEqual(['resilience']);
    expect([5, 4, 3, 2].reduce((xp, level) => xp + level * 7, 0)).toBe(98); // what the editor refunds for 5 -> 1
  });

  it('a dot with no power picked yet stays; a power beyond the dots costs no dot', () => {
    const unpicked = { disciplines: { Potence: 3 }, disciplinePowers: { Potence: [{ id: 'a' }, { id: 'b' }] } };
    removePowerAndDot(unpicked, 'Potence', 0);
    expect(unpicked.disciplines.Potence).toBe(2); // the removed power's dot; the unpicked one remains

    const extra = { disciplines: { Potence: 1 }, disciplinePowers: { Potence: [{ id: 'a' }, { id: 'b' }] } };
    removePowerAndDot(extra, 'Potence', 1);
    expect(extra.disciplines.Potence).toBe(1);
  });

  it('ignores an index that is not there', () => {
    const sheet = fortitude5();
    removePowerAndDot(sheet, 'Fortitude', 9);
    removePowerAndDot(sheet, 'Celerity', 0);
    expect(sheet.disciplines.Fortitude).toBe(5);
  });
});
