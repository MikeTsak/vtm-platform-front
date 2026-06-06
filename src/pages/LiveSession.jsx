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
import {
  getLiveSession,
  joinLiveSession,
  logLiveSessionRoll,
  getLiveSessionBroadcasts,
} from '../api/liveSession';
import styles from '../styles/LiveSession.module.css';

const ATTRIBUTES = ['Strength', 'Dexterity', 'Stamina', 'Charisma', 'Manipulation', 'Composure', 'Intelligence', 'Wits', 'Resolve'];
const SKILLS = ['Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival', 'Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge', 'Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology'];
const toInt = (value, fallback = 0) => Number(value) || fallback;

const DISCIPLINE_POWERS = Object.entries(DISCIPLINES).flatMap(([discipline, body]) =>
  Object.values(body?.levels || {}).flatMap((powers) =>
    (powers || []).map((power) => ({ discipline, ...power }))
  )
);

function TrackerRow({ label, superficial = 0, aggravated = 0, max = 1 }) {
  const safeMax = Math.max(1, Number(max) || 1);
  const total = Math.max(0, Math.min(safeMax, Number(superficial) + Number(aggravated)));
  const pct = (total / safeMax) * 100;
  return (
    <div className={styles.trackerRow}>
      <div className={styles.trackerLabel}>{label} <b>{safeMax - total}/{safeMax}</b></div>
      <div className={styles.trackerBar}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <small>Sup {superficial} / Agg {aggravated}</small>
    </div>
  );
}

export default function LiveSession() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [character, setCharacter] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [trackers, setTrackers] = useState(null);

  const [sessionId, setSessionId] = useState(localStorage.getItem('liveSessionId') || '');
  const [session, setSession] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);

  const [difficulty, setDifficulty] = useState(2);
  const [selectedAttribute, setSelectedAttribute] = useState('Wits');
  const [selectedSkill, setSelectedSkill] = useState('Awareness');
  const [lastRoll, setLastRoll] = useState(null);
  const [wpSelections, setWpSelections] = useState([]);

  const [selectedPowerId, setSelectedPowerId] = useState('');

  const activePower = useMemo(
    () => DISCIPLINE_POWERS.find((power) => power.id === selectedPowerId),
    [selectedPowerId]
  );

  const currentPool = useMemo(
    () => getPoolFromCharacter(sheet, selectedAttribute, selectedSkill),
    [sheet, selectedAttribute, selectedSkill]
  );

  useEffect(() => {
    let live = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/characters/me');
        if (!live) return;
        const loadedCharacter = data.character || data;
        let loadedSheet = loadedCharacter?.sheet || {};
        if (typeof loadedSheet === 'string') {
          try {
            loadedSheet = JSON.parse(loadedSheet);
          } catch {
            loadedSheet = {};
          }
        }
        setCharacter(loadedCharacter);
        setSheet(loadedSheet);
        setTrackers(summarizeTrackers(loadedSheet));
      } catch {
        if (!live) return;
        setError('Could not load your character sheet for live session mode.');
      } finally {
        if (live) setLoading(false);
      }
    };

    load();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let live = true;

    const loadSession = async () => {
      try {
        const data = await getLiveSession(sessionId);
        if (!live) return;
        setSession(data.session || data);
      } catch {
        if (!live) return;
        setSession(null);
      }

      try {
        const data = await getLiveSessionBroadcasts(sessionId);
        if (!live) return;
        setBroadcasts(data.broadcasts || data.messages || []);
      } catch {
        if (!live) return;
        setBroadcasts([]);
      }
    };

    loadSession();
    const timer = setInterval(loadSession, 5000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [sessionId]);

  const persistSheet = async (nextSheet) => {
    if (!character) return;
    try {
      const payload = { ...character, sheet: nextSheet };
      await api.put('/characters/me', payload);
      setMessage('Character trackers synced.');
    } catch {
      setMessage('Live trackers updated locally. Could not sync right now.');
    }
  };

  const applySheetUpdate = async (mutator) => {
    setSheet((prev) => {
      const next = mutator(JSON.parse(JSON.stringify(prev || {})));
      setTrackers(summarizeTrackers(next));
      persistSheet(next);
      return next;
    });
  };

  const pushRoll = async (rollType, payload) => {
    if (!sessionId) return;
    try {
      await logLiveSessionRoll(sessionId, payload);
      setMessage(`${rollType} logged to session.`);
    } catch {
      setMessage(`${rollType} complete. Session logging unavailable.`);
    }
  };

  const handleJoin = async () => {
    if (!sessionId) return;
    localStorage.setItem('liveSessionId', sessionId);
    try {
      await joinLiveSession(sessionId, { characterId: character?.id });
      const data = await getLiveSession(sessionId);
      setSession(data.session || data);
      setMessage('Joined live session.');
    } catch {
      setMessage('Could not join session now. You can still use local live tools.');
    }
  };

  const executePoolRoll = async (pool, rollType, note) => {
    const roll = rollPool(pool, trackers?.hunger ?? 0, difficulty);
    setLastRoll({ ...roll, rollType, note });
    setWpSelections([]);

    await pushRoll(rollType, {
      characterId: character?.id,
      roll_type: rollType,
      pool: roll.pool,
      hunger: roll.hunger,
      results: { normal: roll.normalDice, hunger: roll.hungerDice },
      successes: roll.outcome.successes,
      has_critical: roll.outcome.hasCritical,
      has_messy_critical: roll.outcome.hasMessyCritical,
      has_bestial_failure: roll.outcome.hasBestialFailure,
      note,
    });
  };

  const handleRouse = async (source = 'rouse_check') => {
    const result = runRouseCheck(trackers?.hunger ?? 0);
    await applySheetUpdate((next) => {
      next.hunger = result.nextHunger;
      return next;
    });

    await pushRoll(source, {
      characterId: character?.id,
      roll_type: source,
      pool: 1,
      hunger: result.nextHunger,
      results: { rouse: [result.die] },
      successes: result.success ? 1 : 0,
      note: result.success ? 'No hunger gained' : 'Hunger +1',
    });

    setMessage(result.success ? 'Rouse success.' : 'Rouse failed. Hunger increased.');
  };

  const handleWillpowerReroll = async () => {
    if (!lastRoll || !wpSelections.length) return;

    const { rerolled } = rerollNormalDice(lastRoll.normalDice, wpSelections);
    const outcome = computeOutcome(rerolled, lastRoll.hungerDice, difficulty);
    const updated = { ...lastRoll, normalDice: rerolled, outcome, note: 'Willpower reroll' };
    setLastRoll(updated);
    setWpSelections([]);

    await applySheetUpdate((next) => {
      if (!next.willpower) next.willpower = { superficial: 0, aggravated: 0 };
      next.willpower.superficial = (Number(next.willpower.superficial) || 0) + 1;
      return next;
    });

    await pushRoll('willpower_reroll', {
      characterId: character?.id,
      roll_type: 'willpower_reroll',
      pool: updated.pool,
      hunger: updated.hunger,
      results: { normal: updated.normalDice, hunger: updated.hungerDice },
      successes: updated.outcome.successes,
      has_critical: updated.outcome.hasCritical,
      has_messy_critical: updated.outcome.hasMessyCritical,
      has_bestial_failure: updated.outcome.hasBestialFailure,
      note: 'Spent 1 WP superficial',
    });
  };

  const activateDiscipline = async () => {
    if (!activePower) return;

    if (disciplineRequiresRouse(activePower)) {
      await handleRouse('discipline_rouse_check');
    }

    await pushRoll('discipline_activation', {
      characterId: character?.id,
      roll_type: 'discipline_activation',
      note: `${activePower.discipline} • ${activePower.name}`,
      results: { power: activePower },
    });

    setMessage(`${activePower.name} activated.`);
  };

  if (loading) return <div className={styles.page}><div className={styles.emptyState}>Loading live session…</div></div>;

  return (
    <div className={styles.page}>
      <section className={styles.playerPanel}>
        <h1>Live Session</h1>
        <p className={styles.subtle}>Mobile-first control panel for live VTM scenes.</p>

        <div className={styles.joinRow}>
          <input
            type="text"
            placeholder="Session ID"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value.trim())}
          />
          <button onClick={handleJoin}>Join</button>
        </div>

        <div className={styles.statusLine}>{session ? `Session: ${session.name || session.id}` : 'No session connected'} </div>

        {trackers && (
          <>
            <div className={styles.hungerMeter}>
              <span>Hunger</span>
              <div>{Array.from({ length: 5 }).map((_, idx) => <i key={idx} className={idx < trackers.hunger ? styles.hungerOn : styles.hungerOff} />)}</div>
            </div>

            <TrackerRow label="Health" superficial={trackers.health.superficial} aggravated={trackers.health.aggravated} max={trackers.health.max} />
            <TrackerRow label="Willpower" superficial={trackers.willpower.superficial} aggravated={trackers.willpower.aggravated} max={trackers.willpower.max} />
          </>
        )}

        <div className={styles.quickRows}>
          <h3>Two-button roll</h3>
          <div className={styles.scrollChips}>
            {ATTRIBUTES.map((attribute) => (
              <button
                key={attribute}
                className={selectedAttribute === attribute ? styles.chipActive : styles.chip}
                onClick={() => setSelectedAttribute(attribute)}
              >
                {attribute}
              </button>
            ))}
          </div>
          <div className={styles.scrollChips}>
            {SKILLS.map((skill) => (
              <button
                key={skill}
                className={selectedSkill === skill ? styles.chipActive : styles.chip}
                onClick={() => setSelectedSkill(skill)}
              >
                {skill}
              </button>
            ))}
          </div>

          <div className={styles.actionRow}>
            <label>
              Difficulty
              <input type="number" min={0} max={10} value={difficulty} onChange={(e) => setDifficulty(toInt(e.target.value, 0))} />
            </label>
            <button onClick={() => executePoolRoll(currentPool, 'pool_roll', `${selectedAttribute} + ${selectedSkill}`)}>
              Roll {selectedAttribute} + {selectedSkill} ({currentPool})
            </button>
          </div>
        </div>

        <div className={styles.quickRows}>
          <h3>Quick actions</h3>
          <div className={styles.quickActionsGrid}>
            {COMMON_ROLLS.map((item) => {
              const pool = getPoolFromCharacter(sheet, item.attribute, item.skill);
              return (
                <button key={item.key} onClick={() => executePoolRoll(pool, item.key, `${item.attribute} + ${item.skill}`)}>
                  {item.label} ({pool})
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.actionRow}>
          <button onClick={() => handleRouse()}>Rouse Check</button>
          <select value={selectedPowerId} onChange={(e) => setSelectedPowerId(e.target.value)}>
            <option value="">Select Discipline Power</option>
            {DISCIPLINE_POWERS.map((power) => (
              <option key={power.id} value={power.id}>{power.discipline} — {power.name}</option>
            ))}
          </select>
          <button onClick={activateDiscipline} disabled={!selectedPowerId}>Activate Discipline</button>
        </div>

        {activePower && (
          <div className={styles.disciplineInfo}>
            <strong>{activePower.name}</strong>
            <p>Cost: {activePower.cost || 'Free'} {disciplineRequiresRouse(activePower) ? '(Rouse required)' : ''}</p>
            <p>{activePower.notes || activePower.duration || 'No additional notes.'}</p>
          </div>
        )}

        {lastRoll?.outcome && (
          <section className={styles.resultCard}>
            <h2>{lastRoll.outcome.label}</h2>
            <p>{lastRoll.outcome.successes} successes (Diff {difficulty})</p>
            <div className={styles.resultFlags}>
              {lastRoll.outcome.hasCritical ? <span>Critical</span> : null}
              {lastRoll.outcome.hasMessyCritical ? <span>Messy Critical</span> : null}
              {lastRoll.outcome.hasBestialFailure ? <span>Bestial Failure</span> : null}
            </div>

            <div className={styles.diceRow}>
              {lastRoll.normalDice.map((die, idx) => {
                const selected = wpSelections.includes(idx);
                return (
                  <button
                    key={`normal-${idx}`}
                    className={selected ? styles.dieSelected : styles.die}
                    onClick={() => {
                      setWpSelections((prev) => {
                        if (prev.includes(idx)) return prev.filter((v) => v !== idx);
                        if (prev.length >= 3) return prev;
                        return [...prev, idx];
                      });
                    }}
                  >
                    {die}
                  </button>
                );
              })}
              {lastRoll.hungerDice.map((die, idx) => <span key={`hunger-${idx}`} className={styles.hungerDie}>{die}</span>)}
            </div>

            <button onClick={handleWillpowerReroll} disabled={!wpSelections.length}>Spend 1 WP to reroll selected normal dice</button>
          </section>
        )}

        {broadcasts.length > 0 && (
          <section className={styles.broadcastPanel}>
            <h3>GM Broadcasts</h3>
            {broadcasts.slice(0, 5).map((msg, idx) => (
              <div key={msg.id || idx} className={styles.broadcastItem}>
                {msg.message || msg.text || ''}
              </div>
            ))}
          </section>
        )}

        {error ? <div className={styles.errorBox}>{error}</div> : null}
        {message ? <div className={styles.infoBox}>{message}</div> : null}
      </section>
    </div>
  );
}
