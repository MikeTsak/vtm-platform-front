import React from 'react';
import styles from '../../../styles/Sheet.module.css';
import { Stepper, Field } from './StepHelpers';

export default function MoralityStep({
  tenets, setTenets,
  humanity, setHumanity,
  convictions, setConvictions,
  touchstones, setTouchstones,
  bloodPotency, setBloodPotency,
  step, setStep
}) {
  const RULES = {
    humanity: 7,
    bloodPotency: 1
  };

  return (
    <section>
      <h3 className={styles.sectionTitle}>Morality & Touchstones</h3>
      <p className={`${styles.muted} ${styles.smallFlavor}`}>Remember what keeps the Beast at bay.</p>
      <div className={styles.grid2}>
        <Field label="Chronicle Tenets">
          <textarea className={styles.input} rows={3} value={tenets} onChange={e=>setTenets(e.target.value)} placeholder="List your chronicle’s tenets…" />
        </Field>
        <Field label="Humanity">
          <input className={styles.input} type="number" min={1} max={10} value={humanity} onChange={e=>setHumanity(Number(e.target.value)||RULES.humanity)} />
        </Field>
        <Field label="Convictions">
          {convictions.map((c,i)=>(
            <div key={i} className={styles.flexRow}>
              <input className={styles.input} value={c} onChange={e=>setConvictions(p=>p.map((x,idx)=>idx===i?e.target.value:x))} placeholder="e.g., Never harm children" />
              <button className={styles.ghostBtn} type="button" onClick={()=>setConvictions(p=>p.filter((_,idx)=>idx!==i))}>Remove</button>
            </div>
          ))}
          <button className={styles.ghostBtn} type="button" onClick={()=>setConvictions(p=>[...p,''])}>+ Add Conviction</button>
        </Field>
        <Field label="Touchstones">
          {touchstones.map((t,i)=>(
            <div key={i} className={styles.flexRow}>
              <input className={styles.input} value={t} onChange={e=>setTouchstones(p=>p.map((x,idx)=>idx===i?e.target.value:x))} placeholder="A mortal tied to a conviction" />
              <button className={styles.ghostBtn} type="button" onClick={()=>setTouchstones(p=>p.filter((_,idx)=>idx!==i))}>Remove</button>
            </div>
          ))}
          <button className={styles.ghostBtn} type="button" onClick={()=>setTouchstones(p=>[...p,''])}>+ Add Touchstone</button>
        </Field>
        <Field label="Blood Potency">
          <input className={styles.input} type="number" min={0} max={6} value={bloodPotency} onChange={e=>setBloodPotency(Number(e.target.value)||RULES.bloodPotency)} />
        </Field>
      </div>
      <div className={styles.navRow}>
        <button className={styles.ghostBtn} type="button" onClick={()=>setStep(6)}>Back</button>
        <button className={styles.cta} type="button" onClick={()=>setStep(8)}>Next</button>
      </div>
    </section>
  );
}