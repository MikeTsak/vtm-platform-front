// Run: ../back/node_modules/.bin/vitest run --root . src/data/clans.test.js  (front has no test runner of its own)
import { describe, it, expect } from 'vitest';
import { CLAN_HEX, CLAN_PALETTES } from './clans';

// Callers list CLAN_HEX's keys as "the clans" and read each one's palette at
// module load (ChatSystem's theme list): an extra key without a palette made
// the whole SchreckNet page fail to load (2026-11-03).
describe('CLAN_HEX', () => {
  it('lists exactly the clans that have a palette', () => {
    expect(Object.keys(CLAN_HEX).sort()).toEqual(Object.keys(CLAN_PALETTES).sort());
  });
  it('gives every clan a colour', () => {
    for (const hex of Object.values(CLAN_HEX)) expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
