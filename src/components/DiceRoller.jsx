// src/components/DiceRoller.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../core/api';
import { trackEvent } from '../utils/analytics';

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
  // --- 1. All useState Hooks ---
  const [open, setOpen] = useState(false);

  const location = useLocation();
  const isHidden = location.pathname.includes('/live-session');

  // Integration States
  const [character, setCharacter] = useState(null);
  const [sheet, setSheet] = useState(null);

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

  // --- 2. All useMemo Hooks ---
  const targetUrl = useMemo(() => {
    return characterId 
      ? (characterId.startsWith('npc:') ? `/admin/npcs/${characterId.split(':')[1]}` : `/characters/${characterId}`)
      : '/characters/me';
  }, [characterId]);

  // Outcome memo
  const outcome = useMemo(() => {
    if (!hasRolled) return null;
    const diff = difficulty === '' ? undefined : Number(difficulty) || 0;
    return computeOutcome(normalDice, hungerDice, diff);
  }, [hasRolled, normalDice, hungerDice, difficulty]);

  // WP Selection memo
  const normalIdx = useMemo(() => normalDice.map((_, i) => i), [normalDice]);

  // --- 3. All useEffect Hooks ---
  useEffect(() => {
    const loadCharacter = async () => {
      if (location.pathname.includes('/live-session')) return; 
      try {
        const { data } = await api.get(targetUrl);
        const char = data.character || data.npc || data;
        setCharacter(char);
        
        let parsed = char.sheet;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch {}
        }
        if (!parsed) parsed = {};
        
        setSheet(parsed);
        if (parsed.hunger !== undefined) {
          setHungerLevel(parsed.hunger);
        }
      } catch (e) {
        // Silently fail if character fetch fails
      }
    };
    
    loadCharacter();

    const interval = setInterval(() => {
      loadCharacter();
    }, 5000);

    return () => clearInterval(interval);
  }, [targetUrl, location]);

  // --- 4. Early Returns ---
  if (isHidden) return null;

  // --- 5. Regular Functions ---
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

    trackEvent('roll_dice', { pool: total, hunger: hLvl, difficulty: difficulty || 0 });

    await logRollToApi(normal, hunger, note);
  };

  const doWillpower = async () => {
    if (wpSelections.size === 0 || wpSelections.size > 3) return;
    
    // Correctly calculate Max WP using Composure + Resolve
    if (sheet) {
      const comp = Number(sheet.attributes?.Composure) || 1;
      const reso = Number(sheet.attributes?.Resolve) || 1;
      const max = comp + reso;
      const used = (Number(sheet.willpower?.superficial) || 0) + (Number(sheet.willpower?.aggravated) || 0);
      
      if (used >= max) {
        setWpMessage('Not enough WP!');
        return;
      }
    }

    const rerolled = normalDice.map((v, i) => (wpSelections.has(i) ? rollD10() : v));
    
    setNormalDice(rerolled);
    setWpUsed(true);
    setWpMode(false);
    setWpSelections(new Set());
    setWpMessage('Applying WP cost...');

    const rerollNote = note ? `${note} (WP Reroll)` : 'Willpower Reroll';
    logRollToApi(rerolled, hungerDice, rerollNote);

    if (sheet && character) {
      try {
        const newSheet = JSON.parse(JSON.stringify(sheet));
        if (!newSheet.willpower) newSheet.willpower = { superficial: 0, aggravated: 0 };
        newSheet.willpower.superficial = (Number(newSheet.willpower.superficial) || 0) + 1;
        
        setSheet(newSheet);
        await api.put(targetUrl, { ...character, sheet: newSheet });
        setWpMessage('1 WP (Sup) Spent');
      } catch (e) {
        console.error("Failed to apply WP cost", e);
        setWpMessage('Error syncing WP');
      }
    } else {
      setWpMessage('Manual deduction needed');
    }
  };

  const doRouse = async () => {
    const val = rollD10();
    const ok = val >= 6;
    setRouseVal(val);
    setRouseSuccess(ok);
    
    if (!ok) {
      if (sheet && character) {
        const currentBackendHunger = Number(sheet.hunger) || 0;
        const nextHunger = Math.min(5, currentBackendHunger + 1);
        
        const newSheet = { ...sheet, hunger: nextHunger };
        setSheet(newSheet);
        setHungerLevel(nextHunger); 
        
        await api.put(targetUrl, { ...character, sheet: newSheet }).catch(console.error);
      } else {
        setHungerLevel(h => Math.min(5, Math.max(0, (Number(h) || 0) + 1)));
      }
    }
  };

  // --- 6. Local Rendering Variables ---
  const canEnterWp = hasRolled && !wpUsed && normalIdx.length > 0;
  const canConfirmWp = wpSelections.size > 0 && wpSelections.size <= 3;
  
  // Calculate WP tracking for the button display
  const comp = Number(sheet?.attributes?.Composure) || 1;
  const reso = Number(sheet?.attributes?.Resolve) || 1;
  const maxWp = comp + reso;
  const currentWp = (Number(sheet?.willpower?.superficial) || 0) + (Number(sheet?.willpower?.aggravated) || 0);
  const canAffordWp = !sheet || currentWp < maxWp;
  const remainingWp = Math.max(0, maxWp - currentWp);

  const toggleWpSelect = (idx) => {
    if (!wpMode) return;
    const next = new Set(wpSelections);
    if (next.has(idx)) next.delete(idx);
    else if (next.size < 3) next.add(idx);
    setWpSelections(next);
  };

  return (
    <>
      {/* Floating Opener (FAB) */}
      <button
        className={`fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-[0_6px_16px_rgba(0,0,0,0.5)] z-[9000] transition-all duration-300 grid place-items-center group ${open ? 'rotate-45 scale-90 bg-surface-container-high shadow-[0_2px_8px_rgba(0,0,0,0.5)]' : 'bg-gradient-to-br from-primary to-surface-container hover:scale-110 hover:-rotate-6 hover:shadow-[0_8px_24px_rgba(var(--theme-primary-rgb),0.6)]'}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close dice roller' : 'Open dice roller'}
      >
        <svg className={`w-10 h-10 opacity-80 z-10 filter drop-shadow-md col-start-1 row-start-1 pointer-events-none transition-colors ${open ? 'stroke-on-surface' : 'stroke-on-primary'}`} viewBox="0 0 100 100" aria-hidden="true">
          <polygon points="8,22 32,8 68,8 92,22 100,58 74,98 26,98 0,58" fill="none" strokeWidth="6" strokeLinejoin="round" className="stroke-current" />
        </svg>
        <img src="/img/dice/VtM_ankh_white.png" alt="" className={`w-6 h-6 object-contain z-20 filter drop-shadow-lg col-start-1 row-start-1 pointer-events-none transition-opacity ${open ? 'opacity-50' : 'opacity-100'}`} draggable="false" />
      </button>

      {/* Main Panel */}
      <div className={`fixed bottom-[100px] right-6 w-[340px] max-h-[calc(100vh-120px)] bg-surface-container border border-outline/30 rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden z-[9000] transition-all duration-300 ease-out origin-bottom-right ${open ? 'opacity-100 pointer-events-auto scale-100 translate-y-0' : 'opacity-0 pointer-events-none scale-95 translate-y-5'} gothic-etched-border`} role="dialog" aria-label="Dice roller">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface-container-high border-b border-outline/20">
          <div className="font-['Playfair_Display'] font-bold text-lg text-on-surface tracking-wide flex items-center gap-2">
            V5 Dice {isSending && <span className="animate-spin opacity-70">⟳</span>}
          </div>
          <button className="text-on-surface-variant hover:text-primary transition-colors text-xl leading-none" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>

        {/* Inputs */}
        <div className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant font-['Inter']">Pool</label>
              <input className="w-full bg-surface-container-lowest border border-outline/30 rounded-md px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" type="number" min={0} max={30} value={poolTotal} onChange={(e)=>setPoolTotal(e.target.value)} />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant font-['Inter']">Hunger</label>
              <input className="w-full bg-surface-container-lowest border border-outline/30 rounded-md px-3 py-2 text-sm text-error focus:border-error focus:ring-1 focus:ring-error outline-none transition-colors" type="number" min={0} max={5} value={hungerLevel} onChange={(e)=>setHungerLevel(e.target.value)} />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant font-['Inter']">Diff.</label>
              <input className="w-full bg-surface-container-lowest border border-outline/30 rounded-md px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" type="number" min={0} max={15} placeholder="-" value={difficulty} onChange={(e)=>setDifficulty(e.target.value)} />
            </div>
          </div>
          
          <div>
            <input className="w-full bg-surface-container-lowest border border-outline/30 rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" type="text" placeholder="Optional note (e.g. Investigation)" value={note} onChange={(e)=>setNote(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <button className="flex-[2] bg-primary hover:bg-primary/90 text-on-primary font-bold uppercase tracking-widest text-sm py-3 rounded-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none" onClick={roll} disabled={isSending}>
              {isSending ? 'Rolling...' : 'ROLL'}
            </button>
            <button className="flex-[1] bg-surface-container-highest hover:bg-surface-variant text-on-surface font-semibold text-xs py-3 rounded-md border border-outline/20 transition-all active:scale-[0.98]" onClick={doRouse}>
              Rouse
            </button>
          </div>
          
          {rouseVal !== null && (
            <div className="text-center py-2 px-3 bg-surface-container-lowest border border-outline/10 rounded-md text-sm shadow-inner" aria-live="polite">
              Rouse: <b className="text-on-surface">{rouseVal}</b> — <span className={`font-bold ${rouseSuccess ? 'text-green-500' : 'text-error'}`}>
                {rouseSuccess ? 'Safe' : 'Hunger +1'}
              </span>
            </div>
          )}

          {/* Results */}
          {hasRolled && outcome && (
            <div className="mt-2 border-t border-outline/20 pt-4 flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center gap-4 bg-surface-container-lowest p-3 rounded-lg border border-outline/10 shadow-sm">
                <img src={outcome.art} alt={outcome.label} className={`w-12 h-12 object-contain drop-shadow-md ${(!outcome.messyCritical && !outcome.bestialFailure) ? 'invert' : ''}`} />
                <div className="flex flex-col">
                  <div className={`font-['Playfair_Display'] font-bold text-xl leading-tight ${outcome.bestialFailure ? 'text-error' : (outcome.messyCritical ? 'text-error' : (outcome.hasCritical ? 'text-primary' : 'text-on-surface'))}`}>{outcome.label}</div>
                  <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    {outcome.successesTotal} Successes
                    {difficulty !== '' && ` / Diff ${difficulty}`}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {/* Normal Dice */}
                <div className="flex flex-wrap gap-2">
                  {normalDice.length === 0 && <span className="text-xs text-on-surface-variant/50 italic">No normal dice</span>}
                  {normalDice.map((v, i) => {
                    const isSuccess = v >= 6 && v < 10;
                    const isTen = v === 10;
                    const selectable = wpMode;
                    const selected = wpSelections.has(i);
                    return (
                      <button
                        key={`n-${i}`} type="button"
                        className={`relative w-10 h-10 flex items-center justify-center font-bold text-lg rounded-md transition-all duration-200 ${isTen ? 'bg-primary text-on-primary shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.5)] border border-primary/50' : (isSuccess ? 'bg-surface-variant text-on-surface border border-primary/30' : 'bg-surface-container-lowest text-on-surface-variant border border-outline/20')} ${selectable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md' : 'cursor-default'} ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container transform -translate-y-1' : ''}`}
                        onClick={() => toggleWpSelect(i)}
                        disabled={!selectable}
                        title={selectable ? 'Click to reroll' : ''}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
                
                {/* Hunger Dice */}
                {hungerDice.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-error/10 border border-error/20 rounded-lg">
                    {hungerDice.map((v, i) => {
                      const isSuccess = v >= 6 && v < 10;
                      const isTen = v === 10;
                      const isFail = v === 1;
                      return (
                        <div key={`h-${i}`} className={`relative w-10 h-10 flex items-center justify-center font-bold text-lg rounded-md transition-all duration-200 ${isFail ? 'bg-error text-on-error shadow-[0_0_12px_rgba(var(--theme-error-rgb),0.7)] border border-error animate-pulse' : (isTen ? 'bg-error text-on-error shadow-[0_0_8px_rgba(var(--theme-error-rgb),0.5)] border border-error/50' : (isSuccess ? 'bg-surface-variant text-on-surface border border-error/30' : 'bg-surface-container-lowest text-error border border-error/20'))}`}>
                          {v}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Willpower Section */}
              <div className="flex flex-col gap-2 bg-surface-container-highest p-3 rounded-lg border border-outline/10">
                 {sheet && (
                   <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                     <span>Willpower</span>
                     <span className={canAffordWp ? 'text-on-surface' : 'text-error'}>{remainingWp} / {maxWp}</span>
                   </div>
                 )}
                 
                 {!wpMode && !wpUsed && (
                    <button 
                      className={`w-full py-2 rounded text-sm font-semibold transition-colors ${canAffordWp && canEnterWp ? 'bg-surface-container-lowest hover:bg-primary/20 text-primary border border-primary/30' : 'bg-surface-container-lowest text-on-surface-variant/50 border border-outline/10 cursor-not-allowed'}`}
                      disabled={!canEnterWp || !canAffordWp} 
                      onClick={() => setWpMode(true)}
                    >
                      {canAffordWp ? 'Spend 1 WP to Reroll' : 'No Willpower Remaining'}
                    </button>
                 )}
                 {wpMode && (
                   <div className="flex flex-col gap-2 animate-fade-in">
                      <span className="text-xs text-center text-on-surface-variant italic">Select up to 3 normal dice</span>
                      <div className="flex gap-2">
                        <button className="flex-1 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container hover:bg-surface-variant rounded border border-outline/20 transition-colors" onClick={() => {setWpMode(false); setWpSelections(new Set());}}>Cancel</button>
                        <button className="flex-[2] py-2 text-xs font-bold uppercase tracking-wider text-on-primary bg-primary hover:bg-primary/90 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled={!canConfirmWp} onClick={doWillpower}>
                          Confirm (Cost: 1 WP)
                        </button>
                      </div>
                   </div>
                 )}
                 {wpUsed && (
                   <div className="text-center py-2 text-sm text-primary font-semibold bg-primary/10 rounded border border-primary/20">
                     <span>WP Used</span>
                     {wpMessage && <span className="text-xs opacity-80 ml-2 font-normal">({wpMessage})</span>}
                   </div>
                 )}
              </div>
            </div>
          )}
        </div>
      </div>
      <style jsx="true">{`
        .gothic-etched-border { border: 1px solid rgba(224, 224, 224, 0.1); }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}