// src/pages/LiveSession.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { DISCIPLINES } from '../data/disciplines';
import {
  COMMON_ROLLS,
  computeOutcome,
  disciplineRequiresRouse,
  getPoolFromCharacter,
  rerollNormalDice,
  rollPool,
  runRouseCheck,
  summarizeTrackers,
} from '../utils/liveSessionMechanics';
import { getLiveSession, joinLiveSession, logLiveSessionRoll, getLiveSessionBroadcasts } from '../api/liveSession';
import styles from '../styles/LiveSession.module.css';

const ATTRIBUTES = ['Strength', 'Dexterity', 'Stamina', 'Charisma', 'Manipulation', 'Composure', 'Intelligence', 'Wits', 'Resolve'];
const SKILLS = ['Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival', 'Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge', 'Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology'];

function StatusBar({ label, sup = 0, agg = 0, max = 1 }) {
  const safeMax = Math.max(1, Number(max) || 1);
  const supPct = (Math.min(sup, safeMax) / safeMax) * 100;
  const aggPct = (Math.min(agg, safeMax - sup) / safeMax) * 100;
  
  return (
    <div className={styles.trackerCard}>
      <div className={styles.trackerHeader}>
        <span>{label}</span>
        <span>{safeMax - (sup + agg)} / {safeMax}</span>
      </div>
      <div className={styles.barWrap}>
        <div className={styles.barSup} style={{ width: `${supPct}%` }} />
        <div className={styles.barAgg} style={{ width: `${aggPct}%` }} />
        <div className={styles.barEmpty} />
      </div>
    </div>
  );
}

export default function LiveSession() {
  const [character, setCharacter] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [trackers, setTrackers] = useState(null);
  const [sessionId, setSessionId] = useState(localStorage.getItem('liveSessionId') || '');
  const [session, setSession] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);

  // Roll States
  const [difficulty, setDifficulty] = useState(2);
  const [selectedAttribute, setSelectedAttribute] = useState('Wits');
  const [selectedSkill, setSelectedSkill] = useState('Awareness');
  const [lastRoll, setLastRoll] = useState(null);
  const [wpSelections, setWpSelections] = useState([]);
  const [selectedPowerId, setSelectedPowerId] = useState('');

  const activePower = useMemo(() => 
    Object.entries(DISCIPLINES).flatMap(([disc, body]) => 
      Object.values(body?.levels || {}).flatMap(powers => powers.map(p => ({ disc, ...p })))
    ).find(p => p.id === selectedPowerId), 
  [selectedPowerId]);

  const currentPool = useMemo(() => getPoolFromCharacter(sheet, selectedAttribute, selectedSkill), [sheet, selectedAttribute, selectedSkill]);

  useEffect(() => {
    api.get('/characters/me').then(({ data }) => {
      const char = data.character || data;
      const parsedSheet = typeof char.sheet === 'string' ? JSON.parse(char.sheet) : char.sheet;
      setCharacter(char);
      setSheet(parsedSheet);
      setTrackers(summarizeTrackers(parsedSheet));
    });
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const sData = await getLiveSession(sessionId);
        setSession(sData.session || sData);
        const bData = await getLiveSessionBroadcasts(sessionId);
        setBroadcasts(bData.broadcasts || bData.messages || []);
      } catch (e) {}
    };
    load();
    const int = setInterval(load, 5000);
    return () => clearInterval(int);
  }, [sessionId]);

  const applySheetUpdate = async (mutator) => {
    setSheet((prev) => {
      const next = mutator(JSON.parse(JSON.stringify(prev || {})));
      setTrackers(summarizeTrackers(next));
      if (character) api.put('/characters/me', { ...character, sheet: next });
      return next;
    });
  };

  const pushRoll = async (type, payload) => {
    if (sessionId) await logLiveSessionRoll(sessionId, payload).catch(()=>{});
  };

  const executeRoll = async (pool, type, note) => {
    const roll = rollPool(pool, trackers?.hunger ?? 0, difficulty);
    setLastRoll({ ...roll, type, note });
    setWpSelections([]);
    await pushRoll(type, { characterId: character?.id, roll_type: type, pool: roll.pool, hunger: roll.hunger, results: { normal: roll.normalDice, hunger: roll.hungerDice }, successes: roll.outcome.successes, has_critical: roll.outcome.hasCritical, has_messy_critical: roll.outcome.hasMessyCritical, has_bestial_failure: roll.outcome.hasBestialFailure, note });
  };

  const handleWillpowerReroll = async () => {
    if (!lastRoll || !wpSelections.length || trackers.willpower.superficial + trackers.willpower.aggravated >= trackers.willpower.max) return;

    // Deduct WP
    await applySheetUpdate(next => {
      if (!next.willpower) next.willpower = { superficial: 0, aggravated: 0 };
      next.willpower.superficial += 1;
      return next;
    });

    const { rerolled } = rerollNormalDice(lastRoll.normalDice, wpSelections);
    const outcome = computeOutcome(rerolled, lastRoll.hungerDice, difficulty);
    const updated = { ...lastRoll, normalDice: rerolled, outcome, note: 'Willpower Reroll' };
    setLastRoll(updated);
    setWpSelections([]);
    await pushRoll('willpower_reroll', { characterId: character?.id, roll_type: 'willpower_reroll', pool: updated.pool, hunger: updated.hunger, results: { normal: updated.normalDice, hunger: updated.hungerDice }, successes: updated.outcome.successes, note: 'Spent 1 WP' });
  };

  const handleRouse = async (source = 'rouse_check', autoActivate = null) => {
    const result = runRouseCheck(trackers?.hunger ?? 0);
    await applySheetUpdate(next => { next.hunger = result.nextHunger; return next; });
    await pushRoll(source, { characterId: character?.id, roll_type: source, pool: 1, hunger: result.nextHunger, results: { rouse: [result.die] }, successes: result.success ? 1 : 0, note: result.success ? 'No hunger gained' : 'Hunger +1' });
    
    if (autoActivate) {
      await pushRoll('discipline_activation', { characterId: character?.id, roll_type: 'discipline_activation', note: `${autoActivate.disc} • ${autoActivate.name}` });
    }
  };

  const activateDiscipline = async () => {
    if (!activePower) return;
    if (disciplineRequiresRouse(activePower)) {
      await handleRouse('discipline_rouse_check', activePower);
    } else {
      await pushRoll('discipline_activation', { characterId: character?.id, roll_type: 'discipline_activation', note: `${activePower.disc} • ${activePower.name}` });
    }
  };

  if (!trackers) return <div className={styles.page}>Loading LARP Interface...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.playerPanel}>
        <h1 className={styles.title}>Live Action Terminal</h1>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input className={styles.input} placeholder="Session ID" value={sessionId} onChange={e => { setSessionId(e.target.value); localStorage.setItem('liveSessionId', e.target.value); }} />
          <button className={styles.btnGhost} onClick={() => joinLiveSession(sessionId, { characterId: character?.id })}>Connect</button>
        </div>

        {/* Status Trackers */}
        <div className={styles.trackerGrid}>
          <div className={styles.trackerCard}>
            <div className={styles.trackerHeader}><span>Hunger</span><span>{trackers.hunger} / 5</span></div>
            <div className={styles.hungerDots}>
              {Array.from({ length: 5 }).map((_, i) => <span key={i} className={i < trackers.hunger ? styles.hungerOn : styles.hungerOff} />)}
            </div>
            <button className={styles.btnGhost} style={{ width: '100%', marginTop: '1rem' }} onClick={() => handleRouse()}>Make Rouse Check</button>
          </div>
          <StatusBar label="Health" sup={trackers.health.superficial} agg={trackers.health.aggravated} max={trackers.health.max} />
          <StatusBar label="Willpower" sup={trackers.willpower.superficial} agg={trackers.willpower.aggravated} max={trackers.willpower.max} />
        </div>

        {/* Two-Tap Roller */}
        <div className={styles.trackerCard} style={{ marginBottom: '1rem' }}>
          <div className={styles.trackerHeader}>Two-Tap Custom Roll</div>
          <div className={styles.scrollChips}>
            {ATTRIBUTES.map(attr => <button key={attr} className={selectedAttribute === attr ? styles.chipActive : styles.chip} onClick={() => setSelectedAttribute(attr)}>{attr}</button>)}
          </div>
          <div className={styles.scrollChips}>
            {SKILLS.map(skill => <button key={skill} className={selectedSkill === skill ? styles.chipActive : styles.chip} onClick={() => setSelectedSkill(skill)}>{skill}</button>)}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <input type="number" min={1} max={10} className={styles.input} style={{ width: '80px' }} value={difficulty} onChange={e => setDifficulty(Number(e.target.value))} title="Difficulty" />
            <button className={styles.btnPrimary} onClick={() => executeRoll(currentPool, 'pool_roll', `${selectedAttribute} + ${selectedSkill}`)}>
              Roll {selectedAttribute} + {selectedSkill} ({currentPool} Dice)
            </button>
          </div>
        </div>

        {/* Common Quick Rolls */}
        <div className={styles.trackerCard} style={{ marginBottom: '1rem' }}>
          <div className={styles.trackerHeader}>Common Checks</div>
          <div className={styles.quickRollGrid}>
            {COMMON_ROLLS.map(item => (
              <button key={item.key} className={styles.btnGhost} onClick={() => executeRoll(getPoolFromCharacter(sheet, item.attribute, item.skill), item.key, item.label)}>
                {item.label} ({getPoolFromCharacter(sheet, item.attribute, item.skill)})
              </button>
            ))}
          </div>
        </div>

        {/* Powers */}
        <div className={styles.trackerCard}>
          <div className={styles.trackerHeader}>Disciplines</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select className={styles.input} value={selectedPowerId} onChange={e => setSelectedPowerId(e.target.value)}>
              <option value="">Select Power...</option>
              {Object.entries(DISCIPLINES).flatMap(([disc, body]) => Object.values(body?.levels || {}).flatMap(powers => powers.map(p => (
                <option key={p.id} value={p.id}>{disc} — {p.name} {disciplineRequiresRouse(p) ? '(Rouse)' : ''}</option>
              ))))}
            </select>
            <button className={styles.btnPrimary} onClick={activateDiscipline} disabled={!selectedPowerId} style={{ width: '120px' }}>Use</button>
          </div>
        </div>

{/* Roll Results */}
        {lastRoll?.outcome && (() => {
          const metDiff = difficulty > 0 ? lastRoll.outcome.successes >= difficulty : lastRoll.outcome.successes > 0;
          const successes = lastRoll.outcome.successes;
          
          // Determine the exact outcome art for the top of the card
          let art = '/img/dice/Success.png';
          if (lastRoll.outcome.hasMessyCritical && metDiff) art = '/img/dice/MessyCrit.png';
          else if (lastRoll.outcome.hasCritical && metDiff) art = '/img/dice/Crit.png';
          else if (lastRoll.outcome.hasBestialFailure || !metDiff) art = '/img/dice/BestialFail.png';

          // Determine the descriptive label (Never say 'Failure' unless Total or Bestial)
          let labelText = "";
          if (lastRoll.outcome.hasBestialFailure) {
            labelText = `${successes} Bestial Failure`;
          } else if (successes === 0) {
            labelText = `Total Failure`;
          } else if (lastRoll.outcome.hasMessyCritical && metDiff) {
            labelText = `${successes} Messy Critical`;
          } else if (lastRoll.outcome.hasCritical && metDiff) {
            labelText = `${successes} Crit Success`;
          } else {
            labelText = `${successes} Success${successes > 1 ? 'es' : ''}`;
          }

          // Helper to get the correct symbol based on the VTM V5 Rules
          const getDieImage = (die, isHunger) => {
            if (isHunger) {
              if (die === 10) return '/img/dice/MessyCrit.png';    // Ankh with fangs
              if (die === 1) return '/img/dice/BestialFail.png';   // Beast skull
              if (die >= 6) return '/img/dice/Success.png';        // Regular Ankh
              return null;                                         // Empty
            } else {
              if (die === 10) return '/img/dice/Crit.png';         // Ankh with stars
              if (die >= 6) return '/img/dice/Success.png';        // Regular Ankh
              return null;                                         // Empty
            }
          };

          return (
            <div className={styles.resultCard}>
              <img src={art} alt={labelText} className={styles.outcomeImage} draggable="false" />
              
              <h2 style={{ color: lastRoll.outcome.hasMessyCritical || lastRoll.outcome.hasBestialFailure ? '#e11d48' : 'inherit', margin: '0.5rem 0' }}>
                {labelText}
              </h2>
              
              <p className={styles.subtle}>Target Diff {difficulty}</p>
              
              <div className={styles.diceRow}>
                {/* Normal Dice */}
                {lastRoll.normalDice.map((die, i) => {
                  const isSuccess = die >= 6;
                  const imgSrc = getDieImage(die, false);
                  const isSelected = wpSelections.includes(i);
                  
                  return (
                    <div key={`n-${i}`} className={styles.diceCol}>
                      <button 
                        className={`
                          ${styles.boxDie} 
                          ${isSuccess ? styles.boxFilled : styles.boxEmpty} 
                          ${isSelected ? styles.boxSelected : ''}
                        `}
                        onClick={() => {
                          setWpSelections(prev => prev.includes(i) ? prev.filter(v => v !== i) : prev.length < 3 ? [...prev, i] : prev);
                        }}
                        title={isSelected ? "Deselect" : "Select for Willpower reroll"}
                      >
                        {imgSrc && <img src={imgSrc} alt={`Die rolled ${die}`} className={styles.dieImage} />}
                      </button>
                      <span className={styles.diceNumber}>{die}</span>
                    </div>
                  );
                })}
                
                {/* Hunger Dice */}
                {lastRoll.hungerDice.map((die, i) => {
                  const isSuccess = die >= 6;
                  const imgSrc = getDieImage(die, true);
                  
                  return (
                    <div key={`h-${i}`} className={styles.diceCol}>
                      <div className={`
                        ${styles.boxDie} 
                        ${styles.boxHunger} 
                        ${isSuccess ? styles.boxHungerFilled : styles.boxEmpty}
                      `}>
                        {imgSrc && <img src={imgSrc} alt={`Hunger Die rolled ${die}`} className={styles.dieImage} />}
                      </div>
                      <span className={styles.diceNumber}>{die}</span>
                    </div>
                  );
                })}
              </div>

              {/* Reroll button logic */}
              {lastRoll.normalDice.some(d => d < 6) && (
                <button 
                  className={styles.btnPrimary} 
                  onClick={handleWillpowerReroll} 
                  disabled={!wpSelections.length || trackers.willpower.superficial + trackers.willpower.aggravated >= trackers.willpower.max}
                  style={{ marginTop: '1rem' }}
                >
                  Spend 1 WP to Reroll ({wpSelections.length}/3)
                </button>
              )}
            </div>
          );
        })()}

        {/* GM Broadcasts */}
        {broadcasts.length > 0 && (
          <div className={styles.trackerCard} style={{ marginTop: '1rem', border: '1px solid #e11d48' }}>
            <div className={styles.trackerHeader}>ST Broadcasts</div>
            {broadcasts.slice(0, 3).map((msg, i) => <div key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{msg.message}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}