import React, { useMemo, useState } from 'react';
import styles from '../../../styles/CharacterSetup.module.css';
import { CLAN_DISCIPLINES } from '../../../data/clans';
import { DISCIPLINES, iconPath } from '../../../data/disciplines';
import { RandomizeButton, StatusIcon, Icon } from './StepHelpers';

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Short, plain-language descriptions for new players deciding between
// Disciplines — not full rules text, just "what does this actually do".
const DISCIPLINE_BLURBS = {
  Animalism: "A close, supernatural bond with the animal world — and with a vampire's own Beast.",
  Auspex: 'Hones the senses, both physical and psychic — sharper awareness, perception, even visions of the future.',
  'Blood Sorcery': 'Blood magic: manipulating blood, mortal or vampiric, plus rituals as an extension of it.',
  Celerity: 'Unnatural quickness of movement and supernatural reflexes.',
  Dominate: "Mind control through eye contact and spoken word, and the power to reshape a victim's memories.",
  Fortitude: 'Strengthens physical and mental resistance.',
  Obfuscate: 'The art of not being seen — whether wholly unseen or simply blending into a crowd.',
  Oblivion: 'Taps into the Abyss: manipulating shadows, or wielding necromancy and spirits.',
  Potence: 'Strengthens physical prowess.',
  Presence: 'Subtle manipulation, control, and swaying of emotions to guide others toward a goal.',
  Protean: "Change one's shape — grow claws, meld into earth, or become fog.",
  'Thin-blood Alchemy': 'Mixtures of blood, emotion, and other ingredients that trigger unique effects — or mimic other Disciplines.',
};

export default function DisciplinesStep({
  clan,
  selectedDiscs, setSelectedDiscs,
  favoredDisc, setFavoredDisc,
  disciplinePowerPicks, setDisciplinePowerPicks,
  setStep
}) {
  const [expanded, setExpanded] = useState(null);
  const clanDiscs = useMemo(() => CLAN_DISCIPLINES[clan] || [], [clan]);

  const options = useMemo(() => (
    clanDiscs.includes('Choose Any')
      ? [...new Set(Object.values(CLAN_DISCIPLINES).flat())].filter(d => d !== 'Choose Any')
      : clanDiscs
  ), [clanDiscs]);

  // Powers available for a discipline up to its dot rating (1 or 2 dots ->
  // Level 1, or Level 1+2 for the favored discipline).
  const powersUpTo = (discName, maxLevel) => {
    const levels = DISCIPLINES[discName]?.levels || {};
    const out = [];
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      (levels[lvl] || []).forEach(p => out.push({ ...p, level: lvl }));
    }
    return out;
  };

  const budgetFor = (d) => (favoredDisc === d ? 2 : 1);

  // Shared power-choosing walk: always take one legal Level 1 power first,
  // then keep adding legal powers (Level 2 only if its prerequisite is
  // already among the picks) until the budget is filled or nothing else
  // qualifies. `chooser` picks one item from a legal candidate list —
  // pass `arr => arr[0]` for a deterministic "Suggest" or a random picker
  // for "Randomize".
  const choosePowers = (discName, budget, chooser) => {
    const pool = powersUpTo(discName, budget >= 2 ? 2 : 1);
    const level1 = pool.filter(p => p.level === 1);
    const picks = [];
    if (level1.length) picks.push(chooser(level1));
    while (picks.length < budget) {
      const eligible = pool.filter(p =>
        !picks.some(x => x.id === p.id) &&
        (p.level === 1 || !p.prerequisite || picks.some(x => (p.prerequisite || '').toLowerCase().includes(x.name.toLowerCase())))
      );
      if (!eligible.length) break;
      picks.push(chooser(eligible));
    }
    return picks.map(p => ({ level: p.level, id: p.id, name: p.name }));
  };
  const pickFirstPowers = (discName, budget) => choosePowers(discName, budget, (arr) => arr[0]);
  const pickRandomPowers = (discName, budget) => choosePowers(discName, budget, (arr) => pickRandom(arr));

  const toggleDisc = (d) => {
    setSelectedDiscs(prev => {
      if (prev.includes(d)) {
        const next = prev.filter(x => x !== d);
        if (favoredDisc === d) setFavoredDisc(null);
        setDisciplinePowerPicks(picks => { const n = { ...picks }; delete n[d]; return n; });
        return next;
      }
      if (prev.length >= 2) return prev;
      return [...prev, d];
    });
  };

  const applySuggested = () => {
    const picks = options.slice(0, 2);
    const favored = picks[0] || null;
    setSelectedDiscs(picks);
    setFavoredDisc(favored);
    const next = {};
    picks.forEach(d => { next[d] = pickFirstPowers(d, d === favored ? 2 : 1); });
    setDisciplinePowerPicks(next);
  };

  const randomizeDiscs = () => {
    if (options.length < 2) return;
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, 2);
    const favored = pickRandom(picks);
    setSelectedDiscs(picks);
    setFavoredDisc(favored);
    setDisciplinePowerPicks({
      [picks[0]]: pickRandomPowers(picks[0], picks[0] === favored ? 2 : 1),
      [picks[1]]: pickRandomPowers(picks[1], picks[1] === favored ? 2 : 1),
    });
  };

  const isPowerLocked = (discName, power) => {
    if (power.level === 1 || !power.prerequisite) return false;
    const picked = disciplinePowerPicks[discName] || [];
    const superNorm = (v) => String(v ?? '').toLowerCase().replace(/\(errata\)/g, '').replace(/\berrata\b/g, '').replace(/'s\b/g, '').replace(/[^a-z0-9]/g, '');
    const prereqNorm = superNorm(power.prerequisite);
    return !picked.some(p => prereqNorm.includes(superNorm(p.name)));
  };

  const togglePower = (discName, power) => {
    setDisciplinePowerPicks(prev => {
      const current = prev[discName] || [];
      const exists = current.some(p => p.id === power.id);
      if (exists) {
        return { ...prev, [discName]: current.filter(p => p.id !== power.id) };
      }
      if (current.length >= budgetFor(discName)) return prev;
      return { ...prev, [discName]: [...current, { level: power.level, id: power.id, name: power.name }] };
    });
  };

  const discOk = useMemo(
    () => selectedDiscs.length === 2 && favoredDisc && selectedDiscs.includes(favoredDisc),
    [selectedDiscs, favoredDisc]
  );

  const powersChosenCount = selectedDiscs.reduce((n, d) => n + (disciplinePowerPicks[d]?.length || 0), 0);
  const powersBudgetTotal = selectedDiscs.reduce((n, d) => n + budgetFor(d), 0);

  return (
    <section>
      <div className={styles.stepHeader}>
        <div>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 4, borderBottom: 'none', paddingBottom: 0 }}>Disciplines</h3>
          <p className={`${styles.muted} ${styles.smallFlavor}`} style={{ textAlign: 'left', marginBottom: 0 }}>
            Your clan's supernatural gifts. Select <b>two</b> Disciplines; pick which starts at <b>2 dots</b> and which at <b>1 dot</b>.
          </p>
        </div>
        <div className={styles.stepHeaderActions}>
          <button type="button" className={styles.ghostBtn} onClick={applySuggested}>Suggest</button>
          <RandomizeButton onClick={randomizeDiscs} />
        </div>
      </div>

      <div className={styles.grid3} style={{ marginTop: 12 }}>
        {options.map(d => {
          const picked = selectedDiscs.includes(d);
          return (
            <div key={d} className={`${styles.cardIsh} ${styles.discCard} ${picked ? styles.picked : ''}`}>
              <label className={styles.flexRow} style={{justifyContent:'space-between'}}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={iconPath(d)}
                    alt=""
                    style={{ width: 34, height: 34, objectFit: 'contain', filter: picked ? 'drop-shadow(0 0 6px var(--tint))' : 'grayscale(0.6) opacity(0.6)' }}
                  />
                  {d}
                </span>
                <input type="checkbox" checked={picked} onChange={()=>toggleDisc(d)} />
              </label>
              {DISCIPLINE_BLURBS[d] && (
                <p className={styles.muted} style={{ fontSize: '0.8rem', margin: '6px 0 0' }}>{DISCIPLINE_BLURBS[d]}</p>
              )}
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

              {(() => {
                const powers = DISCIPLINES[d]?.levels?.[1] || [];
                if (!powers.length) return null;
                const isExpanded = expanded === d;
                return (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      className={styles.ghostBtn}
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      onClick={() => setExpanded(isExpanded ? null : d)}
                    >
                      <Icon name={isExpanded ? 'expand_more' : 'chevron_right'} style={{ marginRight: 4 }} /> Level 1 Powers ({powers.length})
                    </button>
                    {isExpanded && (
                      <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                        {powers.map(p => (
                          <div key={p.id || p.name} style={{ fontSize: '0.8rem' }}>
                            <b style={{ color: 'var(--text-color)' }}>{p.name}</b>
                            {p.dice_pool && p.dice_pool !== '—' && (
                              <span className={styles.muted}> — {p.dice_pool}</span>
                            )}
                            {p.notes && <div className={styles.muted} style={{ marginTop: 2 }}>{p.notes}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {selectedDiscs.length === 2 && (
        <>
          <h4 className={styles.sectionSub}>
            Choose Your Starting Powers ({powersChosenCount}/{powersBudgetTotal})
          </h4>
          <p className={styles.muted}>
            Optional at this stage — your Storyteller can help you finalize these later — but picking now means your sheet is ready to play from night one.
          </p>
          <div className={styles.grid2}>
            {selectedDiscs.map(d => {
              const budget = budgetFor(d);
              const powers = powersUpTo(d, budget >= 2 ? 2 : 1);
              const picked = disciplinePowerPicks[d] || [];
              return (
                <div key={d} className={styles.cardIsh}>
                  <div className={styles.flexRow} style={{ marginBottom: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                      <img src={iconPath(d)} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                      {d}
                    </span>
                    <span className={styles.muted}>{picked.length}/{budget} picked</span>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {powers.map(p => {
                      const isPicked = picked.some(x => x.id === p.id);
                      const locked = !isPicked && (isPowerLocked(d, p) || picked.length >= budget);
                      return (
                        <label
                          key={p.id || p.name}
                          className={styles.flexRow}
                          style={{
                            alignItems: 'flex-start', gap: 8, margin: 0,
                            padding: '8px', borderRadius: 8,
                            border: `1px solid ${isPicked ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            background: isPicked ? 'var(--glass-inset)' : 'transparent',
                            opacity: locked ? 0.45 : 1,
                            cursor: locked ? 'not-allowed' : 'pointer',
                          }}
                          title={locked && !isPicked && isPowerLocked(d, p) ? `Requires: ${p.prerequisite}` : undefined}
                        >
                          <input
                            type="checkbox"
                            checked={isPicked}
                            disabled={locked}
                            onChange={() => togglePower(d, p)}
                            style={{ marginTop: 3 }}
                          />
                          <span style={{ flex: 1 }}>
                            <b style={{ color: 'var(--text-color)' }}>{p.name}</b>
                            <span className={styles.muted}> (Level {p.level})</span>
                            {p.dice_pool && p.dice_pool !== '—' && <span className={styles.muted}> — {p.dice_pool}</span>}
                            {p.notes && <div className={styles.muted} style={{ marginTop: 2 }}>{p.notes}</div>}
                            {locked && !isPicked && isPowerLocked(d, p) && (
                              <div className={styles.muted} style={{ marginTop: 2, fontStyle: 'italic' }}>Requires: {p.prerequisite}</div>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className={styles.muted}>Discipline selection: <StatusIcon ok={discOk} /></p>
      <div className={styles.navRow}>
        <button className={styles.ghostBtn} type="button" onClick={()=>setStep(3)}>Back</button>
        <button
          className={styles.cta}
          type="button"
          onClick={()=>setStep(5)}
          disabled={!discOk}
        >
          Next
        </button>
      </div>
    </section>
  );
}
