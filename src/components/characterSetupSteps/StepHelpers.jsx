import React from 'react';
import styles from '../../styles/Sheet.module.css';

export function Stepper({ step, setStep, labels }) {
  return (
    <div className={styles.stepper}>
      {labels.map((label, i) => {
        const n = i+1, active = n===step, done = n<step;
        return (
          <button
            key={label}
            type="button"
            className={`${styles.step} ${active?styles.active:''} ${done?styles.done:''}`}
            onClick={()=>setStep(n)}
          >
            <span className={styles.num}>{n}</span> {label}
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

// AdvTable component is currently unused but kept for potential future use
/* eslint-disable no-unused-vars */
export function AdvTable({ label, rows, setRows, cap }) {
  const spent = rows.reduce((a,r)=>a+(Number(r.dots)||0),0);
  return (
    <>
      <h4 className={styles.sectionSub}>{label} {cap!=null && <>(spent: {spent}/{cap})</>}</h4>
      {rows.map((r,i)=>(
        <div key={i} className={styles.flexRow}>
          <input className={styles.input} style={{flex:2}} placeholder={label.slice(0,-1)} value={r.name}
            onChange={e=>setRows(prev=>prev.map((x,idx)=>idx===i?{...x, name:e.target.value}:x))}/>
          <input className={styles.input} type="number" min={0} style={{width:90}} value={r.dots}
            onChange={e=>setRows(prev=>prev.map((x,idx)=>idx===i?{...x, dots:Number(e.target.value)||0}:x))}/>
          <button className={styles.ghostBtn} type="button" onClick={()=>setRows(rows.filter((_,idx)=>idx!==i))}>Remove</button>
        </div>
      ))}
      <button className={styles.ghostBtn} type="button" onClick={()=>setRows([...rows,{name:'',dots:0}])}>+ Add {label.slice(0,-1)}</button>
    </>
  );
}

export function SpecialtiesBlock({ skillDots, specialties, setSpecialties }) {
  const autoSkills = ['Academics','Craft','Performance','Science'];
  const autoCount = autoSkills.reduce((n,sk)=> n + ((skillDots[sk]||0) > 0 ? 1 : 0), 0);
  const totalNeeded = autoCount + 1; // +1 extra anywhere
  const tooMany = specialties.filter(Boolean).length > totalNeeded;

  React.useEffect(() => {
    setSpecialties(prev => {
      if (prev.length < totalNeeded) {
        return [...prev, ...Array(totalNeeded - prev.length).fill('')];
      } else if (prev.length > totalNeeded) {
        return prev.slice(0, totalNeeded);
      }
      return prev;
    });
  }, [totalNeeded, setSpecialties]);

  return (
    <>
      <p className={styles.muted}>
        Free specialties: one in each of <b>Academics, Craft, Performance, Science</b> (if you have dots), plus <b>one extra</b> anywhere.
        If Predator type grants a specialty in a Skill with 0 dots, convert it to the first dot instead.
      </p>
      <div className={styles.grid3}>
        {specialties.map((sp,i)=>(
          <Field key={i} label={`Specialty ${i+1}`}>
            <input
              className={styles.input}
              value={sp}
              onChange={e=>setSpecialties(prev=>prev.map((v,idx)=>idx===i?e.target.value:v))}
              placeholder="e.g., Melee: Knives / Persuasion: Bargaining"
            />
          </Field>
        ))}
      </div>
      <small className={styles.muted}>
        Needed: {totalNeeded}. {tooMany ? 'Trim a specialty.' : 'OK'}
      </small>
    </>
  );
}

/* A tiny quota bar used in Attributes & Skills */
export function QuotaBar({ label, quotas }) {
  const keys = Object.keys(quotas).sort((a,b)=>Number(a)-Number(b));
  const allZero = keys.every(k => (quotas[k] || 0) === 0);
  return (
    <div className={`${styles.quotaBar} ${styles.cardIsh}`}>
      <div className={styles.quotaHead}>{label}</div>
      <div className={styles.quotaPills}>
        {keys.map(k => (
          <span key={k} className={`${styles.pill} ${quotas[k]===0 ? styles.done : ''}`}>
            {k} <b>× {quotas[k]}</b>
          </span>
        ))}
      </div>
      {allZero && <div className={styles.quotaOk}>All set</div>}
    </div>
  );
}