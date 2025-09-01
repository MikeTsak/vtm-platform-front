import React, { useMemo, useState } from 'react';
import styles from '../styles/DiceRoller.module.css';

/**
 * Vampire: the Masquerade v5 Dice Roller (d10)
 * - Success: 6-9 = 1 success, 10 = 2 successes (counted as crit logic)
 * - Critical: every pair of 10s adds +2 extra (so a pair is 4 total)
 * - Messy Critical: any critical that includes at least one Hunger 10
 * - Bestial Failure: failed test (by difficulty or 0 successes if no diff) + at least one Hunger 1
 * - Willpower Reroll: up to 3 non-hunger failed dice (1-5), once per roll
 */

// helper
const rollD10 = () => Math.floor(Math.random() * 10) + 1;

function computeOutcome(normal, hunger, difficulty) {
  const all = [...normal, ...hunger];

  const successesBase = all.filter(v => v >= 6).length; // includes 10s
  const tens = all.filter(v => v === 10).length;
  const tensHunger = hunger.filter(v => v === 10).length;

  // Each pair of 10s is worth +2 extra successes (above the base 2 from the two 10s)
  const extraFromPairs = Math.floor(tens / 2) * 2;
  const successesTotal = successesBase + extraFromPairs;

  const hasCritical = tens >= 2;
  const messyCritical = hasCritical && tensHunger > 0;

  // Bestial failure: failed + any hunger 1
  const failed = typeof difficulty === 'number' && difficulty > 0
    ? successesTotal < difficulty
    : successesTotal === 0;
  const bestialFailure = failed && hunger.some(v => v === 1);

  // For a neat label
  let label = 'Failure';
  if (successesTotal > 0) label = 'Success';
  if (hasCritical) label = 'Critical!';
  if (messyCritical) label = 'Messy Critical!';
  if (bestialFailure) label = 'Bestial Failure';

  // Choose result art
  let art = '/img/dice/Success.png';
  if (messyCritical) art = '/img/dice/MessyCrit.png';
  else if (hasCritical) art = '/img/dice/Crit.png';
  else if (bestialFailure) art = '/img/dice/BestialFail.png';
  else if (successesTotal === 0) art = '/img/dice/BestialFail.png'; // fallback for total whiff

  return {
    successesBase, extraFromPairs, successesTotal,
    hasCritical, messyCritical, bestialFailure,
    label, art,
  };
}

export default function DiceRoller() {
  const [open, setOpen] = useState(false);

  // Inputs
  const [normalCount, setNormalCount] = useState(4);
  const [hungerCount, setHungerCount] = useState(1);
  const [difficulty, setDifficulty] = useState('');

  // Roll state
  const [normalDice, setNormalDice] = useState([]);
  const [hungerDice, setHungerDice] = useState([]);
  const [hasRolled, setHasRolled] = useState(false);

  // Willpower reroll state
  const [wpMode, setWpMode] = useState(false);
  const [wpUsed, setWpUsed] = useState(false);
  const [wpSelections, setWpSelections] = useState(new Set()); // indexes into normal dice (failed only)

  // Roll action
  const roll = () => {
    const n = Math.max(0, Math.min(20, Number(normalCount) || 0));
    const h = Math.max(0, Math.min(5, Number(hungerCount) || 0));
    const normal = Array.from({ length: n }, rollD10);
    const hunger = Array.from({ length: h }, rollD10);

    setNormalDice(normal);
    setHungerDice(hunger);
    setHasRolled(true);
    setWpMode(false);
    setWpUsed(false);
    setWpSelections(new Set());
  };

  // Outcome
  const outcome = useMemo(() => {
    if (!hasRolled) return null;
    const diff = difficulty === '' ? undefined : Number(difficulty) || 0;
    return computeOutcome(normalDice, hungerDice, diff);
  }, [hasRolled, normalDice, hungerDice, difficulty]);

  // Eligible failed non-hunger dice indices (1–5)
  const failedNormalIdx = useMemo(() => {
    return normalDice
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => v <= 5)
      .map(({ i }) => i);
  }, [normalDice]);

  const canEnterWp = hasRolled && !wpUsed && failedNormalIdx.length > 0;
  const canConfirmWp = wpSelections.size > 0 && wpSelections.size <= 3;

  const toggleWpSelect = (idx) => {
    if (!wpMode) return;
    // only allow failed dice
    if (!failedNormalIdx.includes(idx)) return;
    const next = new Set(wpSelections);
    if (next.has(idx)) next.delete(idx);
    else if (next.size < 3) next.add(idx);
    setWpSelections(next);
  };

  const doWillpower = () => {
    if (!canConfirmWp) return;
    // reroll selected normal dice indices
    const rerolled = normalDice.map((v, i) => (wpSelections.has(i) ? rollD10() : v));
    setNormalDice(rerolled);
    setWpUsed(true);
    setWpMode(false);
    setWpSelections(new Set());
  };

  return (
    <>
            {/* Floating button */}
{/* Floating button (d10 outline + ankh) */}
<button
  className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
  onClick={() => setOpen(o => !o)}
  aria-expanded={open}
  aria-label={open ? 'Close dice roller' : 'Open dice roller'}
>
  {/* d10 outline + facet lines (matches the reference silhouette) */}
  <svg className={styles.d10Outline} viewBox="0 0 100 100" aria-hidden="true">
    {/* Outer hull */}
    <polygon
      points="8,22 32,8 68,8 92,22 100,58 74,98 26,98 0,58"
      fill="none"
      stroke="rgba(10,10,10,0.98)"
      strokeWidth="6"
      strokeLinejoin="round"
    />
  </svg>

  {/* Ankh icon centered */}
  <img
    src="/img/dice/VtM_ankh_white.png"
    alt=""
    className={styles.fabIcon}
    draggable="false"
  />
</button>



      {/* Panel */}
      <div className={`${styles.panel} ${open ? styles.open : ''}`} role="dialog" aria-label="Dice roller">
        <div className={styles.headRow}>
          <div className={styles.title}>V5 Dice</div>
          <button className={styles.iconBtn} onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>

        <div className={styles.inputs}>
          <div className={styles.inputGroup}>
            <label>Normal</label>
            <input
              className={styles.input}
              type="number"
              min={0}
              max={20}
              value={normalCount}
              onChange={(e)=>setNormalCount(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Hunger</label>
            <input
              className={styles.input}
              type="number"
              min={0}
              max={5}
              value={hungerCount}
              onChange={(e)=>setHungerCount(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Difficulty</label>
            <input
              className={styles.input}
              type="number"
              min={0}
              max={10}
              placeholder="(optional)"
              value={difficulty}
              onChange={(e)=>setDifficulty(e.target.value)}
            />
          </div>
          <button className={styles.rollBtn} onClick={roll}>Roll</button>
        </div>

        {/* Results */}
        {hasRolled && outcome && (
          <>
            <div className={styles.resultRow}>
              <img src={outcome.art} alt={outcome.label} className={styles.resultArt} />
              <div className={styles.resultText}>
                <div className={styles.resultTitle}>{outcome.label}</div>
                <div className={styles.resultMeta}>
                  Successes: <b>{outcome.successesTotal}</b>
                  {difficulty !== '' && (
                    <> / Difficulty {Number(difficulty) || 0}</>
                  )}
                  {outcome.hasCritical && (
                    <> • Crit pairs bonus: +{outcome.extraFromPairs}</>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.diceRows}>
              {/* Normal dice */}
              <div className={styles.poolBlock}>
                <div className={styles.poolLabel}>Normal</div>
                <div className={styles.poolDice}>
                  {normalDice.map((v, i) => {
                    const isSuccess = v >= 6 && v < 10;
                    const isTen = v === 10;
                    const isFail = v <= 5;
                    const selectable = wpMode && isFail; // can pick failed normal dice
                    const selected = wpSelections.has(i);
                    return (
                      <button
                        key={`n-${i}`}
                        type="button"
                        className={[
                          styles.die,
                          isSuccess ? styles.success : '',
                          isTen ? styles.ten : '',
                          isFail ? styles.fail : '',
                          selectable ? styles.selectable : '',
                          selected ? styles.selected : '',
                        ].join(' ')}
                        onClick={() => toggleWpSelect(i)}
                        aria-pressed={selected}
                        aria-label={`Normal die ${i+1}: ${v}`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hunger dice */}
              <div className={styles.poolBlock}>
                <div className={styles.poolLabel}>Hunger</div>
                <div className={styles.poolDice}>
                  {hungerDice.map((v, i) => {
                    const isSuccess = v >= 6 && v < 10;
                    const isTen = v === 10;
                    const isFail = v <= 5;
                    return (
                      <div
                        key={`h-${i}`}
                        className={[
                          styles.die,
                          styles.hunger,
                          isSuccess ? styles.success : '',
                          isTen ? styles.ten : '',
                          isFail ? styles.fail : '',
                        ].join(' ')}
                        aria-label={`Hunger die ${i+1}: ${v}`}
                      >
                        {v}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Willpower reroll */}
            <div className={styles.wpRow}>
              <button
                className={styles.wpBtn}
                disabled={!canEnterWp}
                onClick={() => setWpMode(m => !m)}
                aria-pressed={wpMode}
              >
                {wpMode ? 'Select up to 3 failed dice…' : 'Willpower Reroll'}
              </button>

              <button
                className={styles.confirmBtn}
                disabled={!wpMode || !canConfirmWp}
                onClick={doWillpower}
                title={!wpMode ? 'Enter WP selection first' : (wpSelections.size === 0 ? 'Select failed dice' : '')}
              >
                Confirm Reroll
              </button>

              {wpUsed && <span className={styles.note}>WP used</span>}
            </div>
          </>
        )}
      </div>
    </>
  );
}
