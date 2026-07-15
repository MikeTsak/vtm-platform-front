import React, { useMemo } from 'react';
import styles from '../../../styles/Sheet.module.css';
import { Stepper, Field } from './StepHelpers';
import { PREDATOR_TYPES, PREDATOR_TYPE_NAMES } from '../../../data/predator_types';

export default function PredatorStep({
  predatorType, setPredatorType,
  predatorPicks, setPredatorPicks,
  clan, bloodPotency,
  selectedDiscs, setSelectedDiscs,
  favoredDisc, setFavoredDisc,
  setStep
}) {
  const CLAN_DISCIPLINES = {
    Brujah: ['Celerity','Potence','Presence'],
    Gangrel: ['Animalism','Fortitude','Protean'],
    Malkavian: ['Auspex','Dominate','Obfuscate'],
    Nosferatu: ['Animalism','Obfuscate','Potence'],
    Toreador: ['Auspex','Celerity','Presence'],
    Tremere: ['Auspex','Blood Sorcery','Dominate'],
    Ventrue: ['Dominate','Fortitude','Presence'],
    'Banu Haqim': ['Blood Sorcery','Celerity','Obfuscate'],
    Hecata: ['Auspex','Fortitude','Oblivion'],
    Lasombra: ['Dominate','Oblivion','Potence'],
    'The Ministry': ['Obfuscate','Presence','Protean'],
    Caitiff: ['Choose Any','Choose Any','Choose Any'],
    'Thin-blood': ['Thin-blood Alchemy']
  };

  const clanDiscs = useMemo(() => CLAN_DISCIPLINES[clan] || [], [clan]);
  const currentPred = PREDATOR_TYPES[predatorType] || {};

  const updatePool = (poolKey, option, value) => {
    setPredatorPicks(p => ({
      ...p,
      pools: {
        ...p.pools,
        [poolKey]: { ...(p.pools?.[poolKey]||{}), [option]: Math.max(0, Number(value)||0) }
      }
    }));
  };

  const toggleDisc = (d) => {
    setSelectedDiscs(prev => {
      if (prev.includes(d)) {
        const next = prev.filter(x => x !== d);
        if (favoredDisc === d) setFavoredDisc(null);
        return next;
      }
      if (prev.length >= 2) return prev;
      return [...prev, d];
    });
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

  const discOk = useMemo(() => selectedDiscs.length === 2 && favoredDisc && selectedDiscs.includes(favoredDisc), [selectedDiscs, favoredDisc]);

  return (
    <section>
      <h3 className={styles.sectionTitle}>Predator & Disciplines</h3>
      <p className={`${styles.muted} ${styles.smallFlavor}`}>
        How you hunt, how you thrive. Choose your habits; choose your gifts.
      </p>

      {/* Predator cards */}
      <div className={styles.clanGrid}>
        {PREDATOR_TYPE_NAMES.map(p => {
          const P = PREDATOR_TYPES[p];
          const active = predatorType === p;
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
                <div className={styles.clanName}>{p}</div>
                <div className={styles.clanBlurb}>{P.desc}</div>
                {P.rolls && <div className={styles.clanDiscs}>{P.rolls}</div>}
                {restrictMsg && <div className={styles.alert} style={{marginTop:8}}><span className={styles.alertDot}/>{restrictMsg}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic predator choices */}
      <div className={styles.grid2} style={{marginTop:12}}>
        {/* Specialty pick */}
        {currentPred.picks?.specialty && (
          <Field label="Predator Specialty">
            <select
              className={styles.input}
              value={predatorPicks.specialty}
              onChange={e=>setPredatorPicks(s=>({...s, specialty:e.target.value}))}
            >
              <option value="">— choose —</option>
              {currentPred.picks.specialty.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </Field>
        )}

        {/* Discipline pick */}
        {(() => {
          const allowedDisc = (currentPred.picks?.discipline ? currentPred.picks.discipline(clan) : []) || [];
          return allowedDisc.length ? (
            <Field label="Predator Discipline Dot">
              <select
                className={styles.input}
                value={predatorPicks.discipline}
                onChange={e=>setPredatorPicks(s=>({...s, discipline:e.target.value}))}
              >
                <option value="">— choose —</option>
                {allowedDisc.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </Field>
          ) : null;
        })()}

        {/* Single-choice picks */}
        {currentPred.picks?.flawChoice && (
          <Field label="Pick a Flaw">
            <select
              className={styles.input}
              value={predatorPicks.flawChoice}
              onChange={e=>setPredatorPicks(s=>({...s, flawChoice:e.target.value}))}
            >
              <option value="">— choose —</option>
              {currentPred.picks.flawChoice.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </Field>
        )}

        {currentPred.picks?.backgroundChoice && (
          <Field label="Pick a Background">
            <select
              className={styles.input}
              value={predatorPicks.backgroundChoice}
              onChange={e=>setPredatorPicks(s=>({...s, backgroundChoice:e.target.value}))}
            >
              <option value="">— choose —</option>
              {currentPred.picks.backgroundChoice.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </Field>
        )}

        {currentPred.picks?.havenFlawChoice && (
          <Field label="Pick a Haven Flaw">
            <select
              className={styles.input}
              value={predatorPicks.havenFlawChoice}
              onChange={e=>setPredatorPicks(s=>({...s, havenFlawChoice:e.target.value}))}
            >
              <option value="">— choose —</option>
              {currentPred.picks.havenFlawChoice.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </Field>
        )}
      </div>

      {/* Pools (allocate dots) */}
      {(currentPred.picks?.backgroundPool || currentPred.picks?.flawPool) && (
        <div className={styles.cardIsh} style={{marginTop:12}}>
          <h4 className={styles.sectionSub}>Allocate Dots</h4>
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

      {/* Clan disciplines selection */}
      <h4 className={styles.sectionSub} style={{marginTop:16}}>Clan Discipline Dots</h4>
      <p className={styles.muted}>
        Select <b>two</b> clan Disciplines. Pick which starts at <b>2 dots</b>; the other at <b>1 dot</b>.
      </p>
      <div className={styles.grid3}>
        {(clanDiscs.includes('Choose Any')
          ? [...new Set(Object.values({
            Brujah: ['Celerity','Potence','Presence'],
            Gangrel: ['Animalism','Fortitude','Protean'],
            Malkavian: ['Auspex','Dominate','Obfuscate'],
            Nosferatu: ['Animalism','Obfuscate','Potence'],
            Toreador: ['Auspex','Celerity','Presence'],
            Tremere: ['Auspex','Blood Sorcery','Dominate'],
            Ventrue: ['Dominate','Fortitude','Presence'],
            'Banu Haqim': ['Blood Sorcery','Celerity','Obfuscate'],
            Hecata: ['Auspex','Fortitude','Oblivion'],
            Lasombra: ['Dominate','Oblivion','Potence'],
            'The Ministry': ['Obfuscate','Presence','Protean'],
            Caitiff: ['Choose Any','Choose Any','Choose Any'],
            'Thin-blood': ['Thin-blood Alchemy']
          }).flat())]
          : clanDiscs
        ).map(d => {
          const picked = selectedDiscs.includes(d);
          return (
            <div key={d} className={`${styles.cardIsh} ${styles.discCard} ${picked ? styles.picked : ''}`}>
              <label className={styles.flexRow} style={{justifyContent:'space-between'}}>
                <span>{d}</span>
                <input type="checkbox" checked={picked} onChange={()=>toggleDisc(d)} />
              </label>
              <div className={styles.favRow}>
                <label className={styles.flexRow} style={{justifyContent:'space-between', opacity: picked ? 1 : .5}}>
                  <span>Make this the 2-dot Discipline</span>
                  <input
                    type="radio"
                    name="favoredDisc"
                    disabled={!picked}
                    checked={favoredDisc === d}
                    onChange={()=>setFavoredDisc(d)}
                  />
                </label>
                <div className={styles.beads}>
                  <span className={`${styles.bead} ${favoredDisc===d ? styles.on : ''}`} />
                  <span className={`${styles.bead} ${picked ? styles.on : ''}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className={styles.muted}>
        Predator selection: {predatorOk ? '✅' : '❌'} &nbsp;&nbsp; Discipline selection: {discOk ? '✅' : '❌'}
      </p>
      <div className={styles.navRow}>
        <button className={styles.ghostBtn} type="button" onClick={()=>setStep(2)}>Back</button>
        <button
          className={styles.cta}
          type="button"
          onClick={()=>setStep(4)}
          disabled={!(predatorOk && discOk)}
        >
          Next
        </button>
      </div>
    </section>
  );
}