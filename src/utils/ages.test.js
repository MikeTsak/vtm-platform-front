// Run from back/: npx vitest run --globals --root .. front/src/utils/ages.test.js
import { vampireAges, retainerAges } from './ages';

const NOW = new Date('2026-10-30T12:00:00Z');

describe('vampireAges', () => {
  it('looks the age they were Embraced at; true age runs from birth', () => {
    expect(vampireAges({ birthDate: '1900-05-01', deathDate: '1930-06-01' }, NOW)).toMatchObject({ apparent: 30, real: 126 });
    expect(vampireAges({}, NOW)).toMatchObject({ apparent: null, real: null });
  });
});

describe('retainerAges', () => {
  const ghoul = (starvedAt = []) => ({
    sheet: { isGhoul: true, birthDate: '1940-01-01', ghouledDate: '1970-01-01' },
    starvedAt,
  });

  it('a mortal looks their age', () => {
    expect(retainerAges({ sheet: { birthDate: '1990-01-01' } }, NOW)).toMatchObject({ apparent: 36, real: 36 });
  });

  it('a fed ghoul stays the age they were ghouled at', () => {
    expect(retainerAges(ghoul(), NOW)).toMatchObject({ apparent: 30, real: 86, pastLifespan: false });
  });

  it('each starved cycle closes half the gap to the true age, and never passes it', () => {
    const once = retainerAges(ghoul(['2026-09-01']), NOW);
    expect(once.apparent).toBe(58); // 30 + (86.67 - 30) / 2
    const many = retainerAges(ghoul(Array(12).fill('2026-09-01')), NOW);
    expect(many.apparent).toBe(86);
  });

  it('a small gap still costs a full year', () => {
    const young = { sheet: { isGhoul: true, birthDate: '2000-01-01', ghouledDate: '2025-06-01' }, starvedAt: ['2026-09-01'] };
    expect(retainerAges(young, NOW).apparent).toBe(26);
  });
});

describe("Crone's Curse", () => {
  it('looks a decade older', () => {
    const g = { sheet: { isGhoul: true, birthDate: '1940-01-01', ghouledDate: '1970-01-01', flaws: [{ name: "Crone's Curse (Errata)" }] } };
    expect(retainerAges(g, NOW).apparent).toBe(40);
  });
});
