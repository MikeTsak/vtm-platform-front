import React, { useMemo } from 'react';
import styles from '../../../styles/CharacterSetup.module.css';
import MeritsFlawsPicker, { flattenData, parseDotSpec } from '../MeritsFlawsPicker';
import { RandomizeButton, StatusIcon } from './StepHelpers';

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Greedily fill from a shuffled candidate list up to (or, for flaws, exactly)
// a dot budget, picking a random legal dot value per item that still fits.
function randomFill(candidates, budget, { exact = false } = {}) {
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const picked = [];
  let remaining = budget;
  for (const item of shuffled) {
    if (remaining <= 0) break;
    const allowed = parseDotSpec(item.dotsSpec).filter(v => v <= remaining);
    if (!allowed.length) continue;
    const dots = pickRandom(allowed);
    picked.push({ id: item.id, name: item.name, description: item.description, category: item.category, dots });
    remaining -= dots;
  }
  if (exact && remaining !== 0) return null; // caller retries
  return picked;
}

export default function AdvantagesStep({
  merits, setMerits,
  flaws, setFlaws,
  clan,
  meritBudget,
  step, setStep
}) {
  const meritsSpent = useMemo(() => merits.reduce((a,m)=>a+(Number(m.dots)||0),0), [merits]);
  const flawsTaken = useMemo(() => flaws.reduce((a,f)=>a+(Number(f.dots)||0),0), [flaws]);
  const flawBudget = Math.max(2, Math.floor(meritBudget / 7) * 2);

  const randomizeAdvantages = () => {
    const all = flattenData();
    const meritItems = all.filter(i => i.type === 'Merit' && parseDotSpec(i.dotsSpec).length);
    const flawItems = all.filter(i => i.type === 'Flaw' && parseDotSpec(i.dotsSpec).length);

    setMerits(randomFill(meritItems, meritBudget) || []);

    // Flaws must land on an exact total — retry a handful of shuffles.
    let flawPick = null;
    for (let attempt = 0; attempt < 30 && !flawPick; attempt++) {
      flawPick = randomFill(flawItems, flawBudget, { exact: true });
    }
    setFlaws(flawPick || randomFill(flawItems, flawBudget) || []);
  };

  return (
    <section>
      <div className={styles.stepHeader}>
        <div>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 4, borderBottom: 'none', paddingBottom: 0 }}>Merits & Flaws</h3>
          <p className={`${styles.muted} ${styles.smallFlavor}`} style={{ textAlign: 'left', marginBottom: 0 }}>Every boon bears a price. Balance the ledger.</p>
        </div>
        <div className={styles.stepHeaderActions}>
          <RandomizeButton onClick={randomizeAdvantages} />
        </div>
      </div>
      <p className={styles.muted}>
        Spend up to {meritBudget} Merit dots; take <b>exactly {flawBudget}</b> Flaw dots. Check the <b>Suggested</b> tab below for easy starting picks.
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
        const ok = meritsSpent <= meritBudget && flawsTaken === flawBudget;
        return (
          <>
            <p className={styles.muted}>Validation: <StatusIcon ok={ok} /></p>
            <div className={styles.navRow}>
              <button className={styles.ghostBtn} type="button" onClick={()=>setStep(6)}>Back</button>
              <button className={styles.cta} type="button" onClick={()=>setStep(8)} disabled={!ok}>Next</button>
            </div>
          </>
        );
      })()}
    </section>
  );
}
