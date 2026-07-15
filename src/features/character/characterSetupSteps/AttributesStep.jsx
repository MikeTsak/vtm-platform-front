import React, { useMemo } from 'react';
import styles from '../../../styles/Sheet.module.css';
import { Stepper, Field, QuotaBar } from './StepHelpers';

export default function AttributesStep({
  attrDots, setAttrDots,
  step, setStep
}) {
  const ATTRS = {
    Physical: ['Strength','Dexterity','Stamina'],
    Social:   ['Charisma','Manipulation','Composure'],
    Mental:   ['Intelligence','Wits','Resolve']
  };
  const RULES = {
    attributes: {
      min: 1, max: 4,
      pattern: { 1:1, 2:4, 3:3, 4:1 }
    }
  };

  const flat = (obj) => Object.values(obj).flat();
  const baseAttrs = useMemo(() => {
    const o = {}; flat(ATTRS).forEach(a => o[a]=RULES.attributes.min); return o;
  }, []);

  const attrCounts = useMemo(() => {
    const c = {1:0,2:0,3:0,4:0};
    Object.values(attrDots).forEach(v => { c[v] = (c[v]||0)+1; });
    return c;
  }, [attrDots]);

  const canIncAttr = (k) => {
    const v = attrDots[k] ?? RULES.attributes.min;
    if (v >= RULES.attributes.max) return false;
    const next = v + 1;
    const req = RULES.attributes.pattern;
    if ((attrCounts[next] || 0) >= (req[next] || 0)) return false;
    return true;
  };

  const canDecAttr = (k) => {
    const v = attrDots[k] ?? RULES.attributes.min;
    return v > RULES.attributes.min;
  };

  const incAttr = (k, d) => {
    setAttrDots(p => {
      const v = p[k] ?? RULES.attributes.min;
      const next = v + d;
      if (d > 0 && !canIncAttr(k)) return p;
      if (d < 0 && !canDecAttr(k)) return p;
      return { ...p, [k]: Math.max(RULES.attributes.min, Math.min(RULES.attributes.max, next)) };
    });
  };

  const attrOk = useMemo(() => {
    const req = RULES.attributes.pattern;
    return [1,2,3,4].every(k => (attrCounts[k] || 0) === (req[k]||0));
  }, [attrCounts]);

  return (
    <section>
      <h3 className={styles.sectionTitle}>Attributes</h3>
      <p className={styles.muted}>
        Pattern required: <b>1× at 1</b>, <b>4× at 2</b>, <b>3× at 3</b>, <b>1× at 4</b>.
      </p>

      <QuotaBar
        label="Remaining"
        quotas={{
          1: Math.max(0, RULES.attributes.pattern[1] - (attrCounts[1]||0)),
          2: Math.max(0, RULES.attributes.pattern[2] - (attrCounts[2]||0)),
          3: Math.max(0, RULES.attributes.pattern[3] - (attrCounts[3]||0)),
          4: Math.max(0, RULES.attributes.pattern[4] - (attrCounts[4]||0)),
        }}
      />

      <div className={styles.attrSkillGrid}>
        {Object.entries(ATTRS).map(([group, list]) => (
          <div key={group} className={`${styles.cardIsh} ${styles.bleedSoft}`}>
            <h4>{group}</h4>
            {list.map(a => {
              const plusDisabled = !canIncAttr(a);
              const minusDisabled = !canDecAttr(a);
              return (
                <div key={a} className={styles.flexRow}>
                  <span style={{minWidth:140}}>{a}</span>
                  <div className={styles.dotControls}>
                    <button
                      type="button"
                      className={`${styles.ghostBtn} ${minusDisabled ? styles.disabled : ''}`}
                      disabled={minusDisabled}
                      onClick={()=>incAttr(a,-1)}
                    >−</button>
                    <div className={`${styles.dotbox} ${styles.vitae}`}>{attrDots[a]}</div>
                    <button
                      type="button"
                      className={`${styles.ghostBtn} ${plusDisabled ? styles.disabled : ''}`}
                      disabled={plusDisabled}
                      onClick={()=>incAttr(a,1)}
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className={styles.muted}>Validation: {attrOk ? '✅' : '❌'}</p>
      <div className={styles.navRow}>
        <button className={styles.ghostBtn} type="button" onClick={()=>setStep(3)}>Back</button>
        <button className={styles.cta} type="button" onClick={()=>setStep(5)} disabled={!attrOk}>Next</button>
      </div>
    </section>
  );
}