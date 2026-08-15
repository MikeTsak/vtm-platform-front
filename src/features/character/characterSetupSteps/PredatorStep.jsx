import React, { useMemo } from 'react';
import styles from '../../../styles/CharacterSetup.module.css';
import { Field, RandomizeButton, StatusIcon } from './StepHelpers';
import { PREDATOR_TYPES, PREDATOR_TYPE_NAMES } from '../../../data/predator_types';
import { iconPath } from '../../../data/disciplines';

// A chip-picker replaces a native <select> for short option lists — bigger
// touch targets, all options visible at once, optional icon per option.
function ChipPicker({ label, options, value, onChange, iconFor }) {
  return (
    <Field label={label}>
      <div className={styles.tabs}>
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            className={`${styles.tab} ${value === opt ? styles.tabActive : ''}`}
            onClick={() => onChange(opt)}
          >
            {iconFor?.(opt) && (
              <img src={iconFor(opt)} alt="" style={{ width: 14, height: 14, objectFit: 'contain', marginRight: 6, verticalAlign: 'middle' }} />
            )}
            {opt}
          </button>
        ))}
      </div>
    </Field>
  );
}

// A broadly beginner-friendly, thematically varied starting set — filtered
// down to whichever of these are actually eligible for the chosen clan.
const SUGGESTED_PREDATOR_TYPES = ['Alleycat', 'Cleaver', 'Sandman', 'Siren', 'Consensualist', 'Farmer'];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

function randomSplit(total, options) {
  const out = {};
  (options || []).forEach(o => { out[o] = 0; });
  for (let i = 0; i < total && options?.length; i++) {
    const o = pickRandom(options);
    out[o] = (out[o] || 0) + 1;
  }
  return out;
}

function isEligible(predatorName, clan, bloodPotency) {
  const P = PREDATOR_TYPES[predatorName];
  try {
    return !(P.restrict && P.restrict({ clan, bloodPotency }));
  } catch {
    return true;
  }
}

export default function PredatorStep({
  predatorType, setPredatorType,
  predatorPicks, setPredatorPicks,
  clan, bloodPotency,
  setStep
}) {
  const currentPred = PREDATOR_TYPES[predatorType] || {};

  const eligibleTypes = useMemo(
    () => PREDATOR_TYPE_NAMES.filter(p => isEligible(p, clan, bloodPotency)),
    [clan, bloodPotency]
  );

  const suggestedTypes = useMemo(
    () => SUGGESTED_PREDATOR_TYPES.filter(p => eligibleTypes.includes(p)),
    [eligibleTypes]
  );

  const updatePool = (poolKey, option, value) => {
    setPredatorPicks(p => ({
      ...p,
      pools: {
        ...p.pools,
        [poolKey]: { ...(p.pools?.[poolKey]||{}), [option]: Math.max(0, Number(value)||0) }
      }
    }));
  };

  const randomizePredator = () => {
    const pool = eligibleTypes.length ? eligibleTypes : PREDATOR_TYPE_NAMES;
    const chosen = pickRandom(pool);
    setPredatorType(chosen);
    const P = PREDATOR_TYPES[chosen] || {};
    const picks = { specialty: '', discipline: '', flawChoice: '', backgroundChoice: '', havenFlawChoice: '', pools: {} };
    if (P.picks?.specialty) picks.specialty = pickRandom(P.picks.specialty);
    if (P.picks?.discipline) {
      const opts = P.picks.discipline(clan) || [];
      if (opts.length) picks.discipline = pickRandom(opts);
    }
    if (P.picks?.flawChoice) picks.flawChoice = pickRandom(P.picks.flawChoice);
    if (P.picks?.backgroundChoice) picks.backgroundChoice = pickRandom(P.picks.backgroundChoice);
    if (P.picks?.havenFlawChoice) picks.havenFlawChoice = pickRandom(P.picks.havenFlawChoice);
    (P.picks?.backgroundPool || []).forEach((pool, i) => {
      picks.pools[`Pool-${i}-${pool.total}`] = randomSplit(pool.total, pool.options);
    });
    (P.picks?.flawPool || []).forEach((pool, i) => {
      picks.pools[`FlawPool-${i}-${pool.total}`] = randomSplit(pool.total, pool.options);
    });
    setPredatorPicks(picks);
  };

  const predatorOk = useMemo(() => {
    const P = PREDATOR_TYPES[predatorType] || {};
    const restrictMsg = P.restrict ? P.restrict({ clan, bloodPotency }) : null;
    if (restrictMsg) return false;
    if (P.picks?.specialty && !predatorPicks.specialty) return false;
    if (P.picks?.discipline && !predatorPicks.discipline) return false;
    if (P.picks?.flawChoice && !predatorPicks.flawChoice) return false;
    if (P.picks?.backgroundChoice && !predatorPicks.backgroundChoice) return false;
    if (P.picks?.havenFlawChoice && !predatorPicks.havenFlawChoice) return false;
    // pools exact sum (match render indexes exactly)
    const bgPools = P.picks?.backgroundPool || [];
    for (let i = 0; i < bgPools.length; i++) {
      const pool = bgPools[i];
      const key = `Pool-${i}-${pool.total}`;
      const vals = predatorPicks.pools?.[key] || {};
      const sum = Object.values(vals).reduce((a,b)=>a+(Number(b)||0),0);
      if (sum !== pool.total) return false;
    }
    const flawPools = P.picks?.flawPool || [];
    for (let j = 0; j < flawPools.length; j++) {
      const pool = flawPools[j];
      const key = `FlawPool-${j}-${pool.total}`;
      const vals = predatorPicks.pools?.[key] || {};
      const sum = Object.values(vals).reduce((a,b)=>a+(Number(b)||0),0);
      if (sum !== pool.total) return false;
    }
    return true;
  }, [predatorType, predatorPicks, clan, bloodPotency]);

  return (
    <section>
      <div className={styles.stepHeader}>
        <div>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 4, borderBottom: 'none', paddingBottom: 0 }}>Predator Type</h3>
          <p className={`${styles.muted} ${styles.smallFlavor}`} style={{ textAlign: 'left', marginBottom: 0 }}>
            How you hunt shapes who you are. It grants Disciplines, Merits, Flaws, and sometimes Humanity shifts.
          </p>
        </div>
        <div className={styles.stepHeaderActions}>
          <RandomizeButton onClick={randomizePredator} />
        </div>
      </div>

      {suggestedTypes.length > 0 && (
        <p className={styles.muted} style={{ marginTop: 10 }}>
          <b>Suggested for {clan || 'your clan'}:</b> {suggestedTypes.join(' • ')}
        </p>
      )}

      {/* Predator cards */}
      <div className={styles.clanGrid} style={{ marginTop: 10 }}>
        {PREDATOR_TYPE_NAMES.map(p => {
          const P = PREDATOR_TYPES[p];
          const active = predatorType === p;
          const suggested = suggestedTypes.includes(p);
          let restrictMsg = null;
          try {
            restrictMsg = P.restrict ? P.restrict({ clan, bloodPotency }) : null;
          } catch { /* noop */ }
          return (
            <button
              key={p}
              type="button"
              className={`${styles.clanCard} ${active ? styles.active : ''}`}
              style={{ background:'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02))' }}
              onClick={()=>setPredatorType(p)}
              title={P.desc}
            >
              <div className={styles.clanMeta} style={{textAlign:'left'}}>
                <div className={styles.clanName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {p}
                  {suggested && <span className={styles.suggestedTag}>Suggested</span>}
                </div>
                <div className={styles.clanBlurb}>{P.desc}</div>
                {P.rolls && <div className={styles.clanDiscs}>{P.rolls}</div>}
                {restrictMsg && <div className={styles.alert} style={{marginTop:8}}><span className={styles.alertDot}/>{restrictMsg}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic predator choices */}
      <div style={{marginTop:12, display:'grid', gap: 4}}>
        {/* Specialty pick */}
        {currentPred.picks?.specialty && (
          <ChipPicker
            label="Predator Specialty"
            options={currentPred.picks.specialty}
            value={predatorPicks.specialty}
            onChange={(opt)=>setPredatorPicks(s=>({...s, specialty:opt}))}
          />
        )}

        {/* Discipline pick */}
        {(() => {
          const allowedDisc = (currentPred.picks?.discipline ? currentPred.picks.discipline(clan) : []) || [];
          return allowedDisc.length ? (
            <ChipPicker
              label="Predator Discipline Dot"
              options={allowedDisc}
              value={predatorPicks.discipline}
              onChange={(opt)=>setPredatorPicks(s=>({...s, discipline:opt}))}
              iconFor={iconPath}
            />
          ) : null;
        })()}

        {/* Single-choice picks */}
        {currentPred.picks?.flawChoice && (
          <ChipPicker
            label="Pick a Flaw"
            options={currentPred.picks.flawChoice}
            value={predatorPicks.flawChoice}
            onChange={(opt)=>setPredatorPicks(s=>({...s, flawChoice:opt}))}
          />
        )}

        {currentPred.picks?.backgroundChoice && (
          <ChipPicker
            label="Pick a Background"
            options={currentPred.picks.backgroundChoice}
            value={predatorPicks.backgroundChoice}
            onChange={(opt)=>setPredatorPicks(s=>({...s, backgroundChoice:opt}))}
          />
        )}

        {currentPred.picks?.havenFlawChoice && (
          <ChipPicker
            label="Pick a Haven Flaw"
            options={currentPred.picks.havenFlawChoice}
            value={predatorPicks.havenFlawChoice}
            onChange={(opt)=>setPredatorPicks(s=>({...s, havenFlawChoice:opt}))}
          />
        )}
      </div>

      {/* Pools (allocate dots) */}
      {(currentPred.picks?.backgroundPool || currentPred.picks?.flawPool) && (
        <div className={styles.cardIsh} style={{marginTop:12}}>
          <h4 className={styles.sectionSub} style={{marginTop:0}}>Allocate Dots</h4>
          {(currentPred.picks.backgroundPool || []).map((pool, idx) => {
            const key = `Pool-${idx}-${pool.total}`;
            const values = predatorPicks.pools?.[key] || {};
            const remaining = pool.total - Object.values(values).reduce((a,b)=>a+(Number(b)||0),0);
            return (
              <div key={key} className={styles.flexRow} style={{alignItems:'center', gap:12, marginBottom:8}}>
                <span>Backgrounds ({pool.total} total):</span>
                {pool.options.map(opt => (
                  <label key={opt} className={styles.flexRow} style={{gap:6}}>
                    <span>{opt}</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={values[opt] ?? 0}
                      onChange={e=>updatePool(key, opt, e.target.value)}
                      style={{width:70}}
                    />
                  </label>
                ))}
                <span className={styles.muted}>Remaining: {Math.max(0, remaining)}</span>
              </div>
            );
          })}
          {(currentPred.picks.flawPool || []).map((pool, idx) => {
            const key = `FlawPool-${idx}-${pool.total}`;
            const values = predatorPicks.pools?.[key] || {};
            const remaining = pool.total - Object.values(values).reduce((a,b)=>a+(Number(b)||0),0);
            return (
              <div key={key} className={styles.flexRow} style={{alignItems:'center', gap:12, marginBottom:8}}>
                <span>Flaws ({pool.total} total):</span>
                {pool.options.map(opt => (
                  <label key={opt} className={styles.flexRow} style={{gap:6}}>
                    <span>{opt}</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={values[opt] ?? 0}
                      onChange={e=>updatePool(key, opt, e.target.value)}
                      style={{width:70}}
                    />
                  </label>
                ))}
                <span className={styles.muted}>Remaining: {Math.max(0, remaining)}</span>
              </div>
            );
          })}
        </div>
      )}

      <p className={styles.muted}>Predator selection: <StatusIcon ok={predatorOk} /></p>
      <div className={styles.navRow}>
        <button className={styles.ghostBtn} type="button" onClick={()=>setStep(2)}>Back</button>
        <button
          className={styles.cta}
          type="button"
          onClick={()=>setStep(4)}
          disabled={!predatorOk}
        >
          Next
        </button>
      </div>
    </section>
  );
}
