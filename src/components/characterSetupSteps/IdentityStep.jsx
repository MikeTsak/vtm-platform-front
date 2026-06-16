import React from 'react';
import styles from '../../styles/Sheet.module.css';
import { Stepper, Field } from './StepHelpers';

export default function IdentityStep({
  name, setName,
  concept, setConcept,
  chronicle, setChronicle,
  ambition, setAmbition,
  desire, setDesire,
  sire, setSire,
  step, setStep
}) {
  return (
    <section>
      <h3 className={styles.sectionTitle}>Identity</h3>
      <p className={`${styles.muted} ${styles.smallFlavor}`}>
        A mask for the living, a name for the dead. Etch who you were—and what you seek.
      </p>
      <div className={styles.grid2}>
        <Field label="Name">
          <input className={styles.input} value={name} onChange={e=>setName(e.target.value)}
            placeholder="e.g., Telemachos Daskalakis" required />
        </Field>
        <Field label="Chronicle">
          <input className={styles.input} value={chronicle} onChange={e=>setChronicle(e.target.value)}
            placeholder="Athens Through-Time (S1)" />
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