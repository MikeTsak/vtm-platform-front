// Ages derived from sheet dates (ISO YYYY-MM-DD). Nothing about age is stored.

const YEAR_MS = 365.2425 * 864e5;
// Past this a ghoul only lives on the Blood; catching up may kill them (Storyteller's call).
export const NATURAL_LIFESPAN = 100;

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const whole = (years) => (years == null ? null : Math.max(0, Math.floor(years)));

// A vampire looks the age they died at (the Embrace); their true age runs from birth.
export function vampireAges(sheet, now = new Date()) {
  const birth = toDate(sheet?.birthDate);
  const death = toDate(sheet?.deathDate);
  return {
    apparent: birth && death ? whole((death - birth) / YEAR_MS) : null,
    real: birth ? whole((now - birth) / YEAR_MS) : null,
    sinceEmbrace: death ? whole((now - death) / YEAR_MS) : null,
  };
}

// Ghoul aging (user ruling 2026-10-30, after V5: vitae halts aging, and once it
// stops the held-back years catch up rapidly). The apparent age freezes on the
// day of ghouling; each starved cycle (`retainer.starvedAt`, from the server)
// closes half the gap to the real age, at least a year, never past it. Feeding
// again stops the catch-up but never turns it back. A mortal simply looks their age.
export function retainerAges(retainer, now = new Date()) {
  const sheet = retainer?.sheet || {};
  const birth = toDate(sheet.birthDate);
  if (!birth) return { apparent: null, real: null, pastLifespan: false, ageAtGhouling: null, steps: [] };
  const ageAt = (d) => (d - birth) / YEAR_MS;
  const real = ageAt(now);
  if (sheet.isGhoul !== true) return { apparent: whole(real), real: whole(real), pastLifespan: false, ageAtGhouling: null, steps: [] };

  const ghouled = toDate(sheet.ghouledDate) || toDate(retainer.created_at) || now;
  let apparent = Math.min(ageAt(ghouled), real);
  const ageAtGhouling = whole(apparent);
  // One step per starved cycle, for showing the working: { at, from, to }.
  const steps = [];
  for (const at of retainer.starvedAt || []) {
    const realThen = ageAt(toDate(at) || now);
    const from = apparent;
    apparent = Math.min(realThen, apparent + Math.max(1, (realThen - apparent) / 2));
    steps.push({ at, from: whole(from), to: whole(apparent) });
  }
  // Crone's Curse (ghoul Flaw): appears a decade older.
  const crone = (sheet.flaws || []).some((f) => /crone's curse/i.test(String(f?.name || '')));
  if (crone) apparent += 10;
  return { apparent: whole(apparent), real: whole(real), pastLifespan: real >= NATURAL_LIFESPAN, ageAtGhouling, steps, crone };
}

// "12 Mar 1987" for display; '' when unset.
export const formatDate = (v) => {
  const d = toDate(v);
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
};
