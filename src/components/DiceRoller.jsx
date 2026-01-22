// src/components/DiceRoller.jsx
import React, { useMemo, useState } from 'react';
import api from '../api'; 
import styles from '../styles/DiceRoller.module.css';

/**
 * Vampire: the Masquerade v5 Dice Roller (d10)
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

  // Bestial failure: failed test + at least one hunger 1
  const metDifficulty = typeof difficulty === 'number' && difficulty > 0
    ? successesTotal >= difficulty
    : successesTotal > 0;

  const bestialFailure = !metDifficulty && hunger.some(v => v === 1);

  // Label
  let label = 'Failure';
  if (metDifficulty) label = 'Success';
  if (hasCritical && metDifficulty) label = 'Critical!';
  if (messyCritical && metDifficulty) label = 'Messy Critical!';
  if (bestialFailure) label = 'Bestial Failure';

  // Art
  let art = '/img/dice/Success.png';
  if (messyCritical && metDifficulty) art = '/img/dice/MessyCrit.png';
  else if (hasCritical && metDifficulty) art = '/img/dice/Crit.png';
  else if (bestialFailure) art = '/img/dice/BestialFail.png';
  else if (!metDifficulty) art = '/img/dice/BestialFail.png';

  return {
    successesTotal, extraFromPairs,
    hasCritical, messyCritical, bestialFailure,
    label, art,
  };
}

export default function DiceRoller({ characterId }) {
  const [open, setOpen] = useState(false);

  // Inputs
  const [poolTotal, setPoolTotal] = useState(5); 
  const [hungerLevel, setHungerLevel] = useState(1);
  const [difficulty, setDifficulty] = useState('');
  const [note, setNote] = useState('');

  // Roll state
  const [normalDice, setNormalDice] = useState([]);
  const [hungerDice, setHungerDice] = useState([]);
  const [hasRolled, setHasRolled] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Willpower reroll state
  const [wpMode, setWpMode] = useState(false);
  const [wpUsed, setWpUsed] = useState(false);
  const [wpSelections, setWpSelections] = useState(new Set());
  const [wpMessage, setWpMessage] = useState('');

  // Rouse check state
  const [rouseVal, setRouseVal] = useState(null);
  const [rouseSuccess, setRouseSuccess] = useState(null);

  // --- API Logging ---
  const logRollToApi = async (nDice, hDice, rollNote) => {
    setIsSending(true);
    try {
      await api.post('/dice/rolls', {
        pool: nDice.length + hDice.length,
        hunger: hDice.length,
        results: { normal: nDice, hunger: hDice },
        difficulty: difficulty ? Number(difficulty) : undefined,
        note: rollNote || undefined
      });
    } catch (e) {
      console.error("Failed to log dice roll:", e);
    } finally {
      setIsSending(false);
    }
  };

  // --- Actions ---
  const roll = async () => {
    const total = Math.max(0, Math.min(30, Number(poolTotal) || 0));
    const hLvl = Math.max(0, Math.min(5, Number(hungerLevel) || 0));

    const actualHungerCount = Math.min(total, hLvl);
    const actualNormalCount = total - actualHungerCount;

    const normal = Array.from({ length: actualNormalCount }, rollD10);
    const hunger = Array.from({ length: actualHungerCount }, rollD10);

    setNormalDice(normal);
    setHungerDice(hunger);
    setHasRolled(true);
    
    setWpMode(false);
    setWpUsed(false);
    setWpSelections(new Set());
    setWpMessage('');
    setRouseVal(null); 

    await logRollToApi(normal, hunger, note);
  };

  const doWillpower = async () => {
    if (wpSelections.size === 0 || wpSelections.size > 3) return;
    
    // 1. Reroll selected dice
    const rerolled = normalDice.map((v, i) => (wpSelections.has(i) ? rollD10() : v));
    
    setNormalDice(rerolled);
    setWpUsed(true);
    setWpMode(false);
    setWpSelections(new Set());

    // 2. Log reroll in background
    const rerollNote = note ? `${note} (WP Reroll)` : 'Willpower Reroll';
    logRollToApi(rerolled, hungerDice, rerollNote);

    // 3. Apply Willpower Cost (Fetch -> Modify -> Save)
    setWpMessage('Applying WP cost...');
    try {
      // Determine target URL: specific ID if provided, otherwise "me"
      const targetUrl = characterId 
        ? (characterId.startsWith('npc:') ? `/admin/npcs/${characterId.split(':')[1]}` : `/characters/${characterId}`)
        : '/characters/me';

      // A. Fetch current sheet
      const { data } = await api.get(targetUrl);
      const char = data.character || data.npc || data; // handle various API wrappers
      
      let sheet = char.sheet;
      if (typeof sheet === 'string') {
        try { sheet = JSON.parse(sheet); } catch {}
      }
      if (!sheet) sheet = {};

      // B. Modify Willpower (Add 1 Superficial)
      if (!sheet.willpower) sheet.willpower = { superficial: 0, aggravated: 0 };
      
      const currentSup = Number(sheet.willpower.superficial) || 0;
      sheet.willpower.superficial = currentSup + 1;

      // C. Save back
      await api.put(targetUrl, { ...char, sheet });
      
      setWpMessage('1 WP (Sup) Spent');
    } catch (e) {
      console.error("Failed to apply WP cost", e);
      // Friendly fallback message if user has no active character
      setWpMessage('Manual deduction needed');
    }
  };

  const doRouse = () => {
    const val = rollD10();
    const ok = val >= 6;
    setRouseVal(val);
    setRouseSuccess(ok);
    if (!ok) {
      setHungerLevel(h => Math.min(5, Math.max(0, (Number(h) || 0) + 1)));
    }
  };

  // Outcome memo
  const outcome = useMemo(() => {
    if (!hasRolled) return null;
    const diff = difficulty === '' ? undefined : Number(difficulty) || 0;
    return computeOutcome(normalDice, hungerDice, diff);
  }, [hasRolled, normalDice, hungerDice, difficulty]);

  // WP Selection Logic
  const normalIdx = useMemo(() => normalDice.map((_, i) => i), [normalDice]);
  const canEnterWp = hasRolled && !wpUsed && normalIdx.length > 0;
  const canConfirmWp = wpSelections.size > 0 && wpSelections.size <= 3;

  const toggleWpSelect = (idx) => {
    if (!wpMode) return;
    const next = new Set(wpSelections);
    if (next.has(idx)) next.delete(idx);
    else if (next.size < 3) next.add(idx);
    setWpSelections(next);
  };

  return (
    <>
      {/* Floating Opener */}
      <button
        className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close dice roller' : 'Open dice roller'}
      >
        <svg className={styles.d10Outline} viewBox="0 0 100 100" aria-hidden="true">
          <polygon
            points="8,22 32,8 68,8 92,22 100,58 74,98 26,98 0,58"
            fill="none"
            stroke="rgba(10,10,10,0.98)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
        </svg>
        <img src="/img/dice/VtM_ankh_white.png" alt="" className={styles.fabIcon} draggable="false" />
      </button>

      {/* Panel */}
      <div className={`${styles.panel} ${open ? styles.open : ''}`} role="dialog" aria-label="Dice roller">
        <div className={styles.headRow}>
          <div className={styles.title}>V5 Dice {isSending && <span className={styles.spinner}>⟳</span>}</div>
          <button className={styles.iconBtn} onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>

        <div className={styles.inputs}>
          <div className={styles.inputRow}>
             <div className={styles.inputGroup}>
              <label>Total Pool</label>
              <input
                className={styles.input} type="number" min={0} max={30}
                value={poolTotal} onChange={(e)=>setPoolTotal(e.target.value)}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Hunger</label>
              <input
                className={styles.input} type="number" min={0} max={5}
                value={hungerLevel} onChange={(e)=>setHungerLevel(e.target.value)}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Diff.</label>
              <input
                className={styles.input} type="number" min={0} max={15} placeholder="-"
                value={difficulty} onChange={(e)=>setDifficulty(e.target.value)}
              />
            </div>
          </div>
          
          <div className={styles.inputGroupFull}>
            <input
              className={styles.input} type="text" placeholder="Optional note (e.g. Investigation)"
              value={note} onChange={(e)=>setNote(e.target.value)}
            />
          </div>

          <div className={styles.actionRow}>
            <button className={styles.rollBtn} onClick={roll} disabled={isSending}>
              {isSending ? 'Rolling...' : 'ROLL'}
            </button>
            <button className={`${styles.rollBtn} ${styles.secondaryBtn}`} onClick={doRouse}>
              Rouse Check
            </button>
          </div>
           {rouseVal !== null && (
              <div className={styles.rouseResult} aria-live="polite">
                Rouse: <b>{rouseVal}</b> — <span className={rouseSuccess ? styles.successText : styles.failText}>
                  {rouseSuccess ? 'Safe' : 'Hunger +1'}
                </span>
              </div>
            )}
        </div>

        {/* Results */}
        {hasRolled && outcome && (
          <>
            <div className={styles.resultRow}>
              <img src={outcome.art} alt={outcome.label} className={styles.resultArt} />
              <div className={styles.resultText}>
                <div className={styles.resultTitle}>{outcome.label}</div>
                <div className={styles.resultMeta}>
                  {outcome.successesTotal} Successes
                  {difficulty !== '' && ` / Diff ${difficulty}`}
                </div>
              </div>
            </div>

            <div className={styles.diceContainer}>
              {/* Normal Dice (Selectable for WP) */}
              <div className={styles.poolBlock}>
                <div className={styles.poolDice}>
                  {normalDice.length === 0 && <span className={styles.muted}>No normal dice</span>}
                  {normalDice.map((v, i) => {
                    const isSuccess = v >= 6 && v < 10;
                    const isTen = v === 10;
                    const selectable = wpMode;
                    const selected = wpSelections.has(i);
                    return (
                      <button
                        key={`n-${i}`} type="button"
                        className={[
                          styles.die,
                          isSuccess ? styles.success : '',
                          isTen ? styles.ten : '',
                          selectable ? styles.selectable : '',
                          selected ? styles.selected : '',
                        ].join(' ')}
                        onClick={() => toggleWpSelect(i)}
                        disabled={!selectable}
                        title={selectable ? 'Click to reroll' : ''}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Hunger Dice (Not selectable) */}
              {hungerDice.length > 0 && (
                 <div className={`${styles.poolBlock} ${styles.hungerBlock}`}>
                  <div className={styles.poolDice}>
                    {hungerDice.map((v, i) => {
                      const isSuccess = v >= 6 && v < 10;
                      const isTen = v === 10;
                      const isFail = v === 1;
                      return (
                        <div key={`h-${i}`} className={[
                            styles.die, styles.hunger,
                            isSuccess ? styles.success : '',
                            isTen ? styles.ten : '',
                            isFail ? styles.bestial : '',
                          ].join(' ')}>
                          {v}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Willpower Section */}
            <div className={styles.wpRow}>
               {!wpMode && !wpUsed && (
                  <button className={styles.wpToggle} disabled={!canEnterWp} onClick={() => setWpMode(true)}>
                    Willpower Reroll
                  </button>
               )}
               {wpMode && (
                 <div className={styles.wpActions}>
                    <span className={styles.wpHint}>Select up to 3 normal dice</span>
                    <button className={styles.wpCancel} onClick={() => {setWpMode(false); setWpSelections(new Set());}}>Cancel</button>
                    <button className={styles.wpConfirm} disabled={!canConfirmWp} onClick={doWillpower}>
                      Confirm (Cost: 1 WP)
                    </button>
                 </div>
               )}
               {wpUsed && (
                 <div className={styles.wpUsed}>
                   <span>WP Used</span>
                   {wpMessage && <span style={{fontSize:'0.8em', marginLeft:'8px', opacity:0.8}}>({wpMessage})</span>}
                 </div>
               )}
            </div>
          </>
        )}
      </div>
    </>
  );
}