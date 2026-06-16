import React, { useMemo } from 'react';
import styles from '../../styles/Sheet.module.css';
import { Stepper, Field } from './StepHelpers';
import MeritsFlawsPicker from '../../components/MeritsFlawsPicker';

export default function AdvantagesStep({
  merits, setMerits,
  flaws, setFlaws,
  clan,
  meritBudget,
  step, setStep
}) {
  const meritsSpent = useMemo(() => merits.reduce((a,m)=>a+(Number(m.dots)||0),0), [merits]);
  const flawsTaken = useMemo(() => flaws.reduce((a,f)=>a+(Number(f.dots)||0),0), [flaws]);
  const advOk = meritsSpent <= meritBudget && flawsTaken >= 2; // minFlaws is 2 per rules

  return (
    <section>
      <h3 className={styles.sectionTitle}>Advantages (Merits & Flaws)</h3>
      <p className={`${styles.muted} ${styles.smallFlavor}`}>Every boon bears a price. Balance the ledger.</p>
      <p className={styles.muted}>
        Spend up to {meritBudget} Merit dots; take <b>exactly 2</b> Flaw dots.
      </p>

      <MeritsFlawsPicker
        clan={clan}
        merits={merits}
        setMerits={setMerits}
        flaws={flaws}
        setFlaws={setFlaws}
        meritBudget={meritBudget}
      />

      {(() => {
        const ok = meritsSpent <= meritBudget && flawsTaken === 2;
        return (
          <>
            <p className={styles.muted}>Validation: {ok ? '✅' : '❌'}</p>
            <div className={styles.navRow}>
              <button className={styles.ghostBtn} type="button" onClick={()=>setStep(5)}>Back</button>
              <button className={styles.cta} type="button" onClick={()=>setStep(7)} disabled={!ok}>Next</button>
            </div>
          </>
        );
      })()}
    </section>
  );
}