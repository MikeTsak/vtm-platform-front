import React from 'react';
import styles from '../../../styles/CharacterSetup.module.css';
import { Field, RandomizeButton } from './StepHelpers';

// Curated concept/ambition/desire combos — a quick, evocative starting point
// a player can fill in with one click and still edit freely afterward.
const CONCEPT_SEEDS = [
  { concept: 'Haunted Prince', ambition: 'Reclaim a throne stolen in the first nights of the curse.', desire: 'One night of feeling human again.' },
  { concept: 'Street Fixer', ambition: 'Build a network no one in the city can move without touching.', desire: 'A favor owed by someone powerful.' },
  { concept: 'Failed Artist', ambition: 'Create one work that outlives the mortal world that rejected it.', desire: 'To be seen, just once, without the mask.' },
  { concept: 'Disgraced Scholar', ambition: 'Recover the knowledge that got you Embraced in the first place.', desire: 'A rival\'s ruin, publicly and completely.' },
  { concept: 'Zealous Enforcer', ambition: 'Rise high enough in the Sect that no one questions your methods again.', desire: 'A clean kill, for once, without complications.' },
  { concept: 'Wandering Grifter', ambition: 'Find a city that will finally let you stay.', desire: 'A relic tied to your mortal life.' },
  { concept: 'Quiet Watcher', ambition: 'Uncover the secret your sire died protecting.', desire: 'One night without having to lie to anyone.' },
  { concept: 'Reluctant Leader', ambition: 'Prove you deserve the coterie that follows you.', desire: 'A single night free of responsibility.' },
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function IdentityStep({
  name, setName,
  concept, setConcept,
  chronicle, setChronicle,
  ambition, setAmbition,
  desire, setDesire,
  sire, setSire,
  step, setStep
}) {
  const applySeed = (seed) => {
    setConcept(seed.concept);
    setAmbition(seed.ambition);
    setDesire(seed.desire);
  };

  return (
    <section>
      <div className={styles.stepHeader}>
        <div>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 4, borderBottom: 'none', paddingBottom: 0 }}>Concept</h3>
          <p className={`${styles.muted} ${styles.smallFlavor}`} style={{ textAlign: 'left', marginBottom: 0 }}>
            A mask for the living, a name for the dead. Etch who you were — and what you seek.
          </p>
        </div>
        <div className={styles.stepHeaderActions}>
          <RandomizeButton onClick={()=>applySeed(pickRandom(CONCEPT_SEEDS))} />
        </div>
      </div>

      <div className={styles.tabs} style={{ margin: '10px 0' }}>
        <span className={styles.muted} style={{ alignSelf: 'center', marginRight: 4 }}>Suggested concepts:</span>
        {CONCEPT_SEEDS.slice(0, 4).map(seed => (
          <button key={seed.concept} type="button" className={styles.tab} onClick={()=>applySeed(seed)}>
            {seed.concept}
          </button>
        ))}
      </div>

      <div className={styles.grid2}>
        <Field label="Name">
          <input className={styles.input} value={name} onChange={e=>setName(e.target.value)}
            placeholder="e.g., Telemachos Daskalakis" required />
        </Field>
        <Field label="Chronicle">
          <input className={styles.input} value={chronicle} onChange={e=>setChronicle(e.target.value)}
            placeholder="Athens Through-Time (S2)" />
        </Field>
        <Field label="Concept">
          <input className={styles.input} value={concept} onChange={e=>setConcept(e.target.value)}
            placeholder="Haunted Prince • Fixer • Street Artist…" />
        </Field>
        <Field label="Ambition (long-term)">
          <input className={styles.input} value={ambition} onChange={e=>setAmbition(e.target.value)}
            placeholder="Rule a district, master Oblivion, redeem a name…" />
        </Field>
        <Field label="Desire (short-term)">
          <input className={styles.input} value={desire} onChange={e=>setDesire(e.target.value)}
            placeholder="Tonight’s hunger: a relic, a secret, a rival’s ruin…" />
        </Field>
        <Field label="Sire (the Story theller will tell you)">
          <input className={styles.input} value={sire} onChange={e=>setSire(e.target.value)} placeholder="Leave blank for now" />
        </Field>
      </div>
      <div className={styles.navRow}>
        <button className={styles.ghostBtn} type="button" onClick={()=>setStep(1)}>Back</button>
        <button className={styles.cta} type="button" onClick={()=>setStep(3)}>Next</button>
      </div>
    </section>
  );
}
