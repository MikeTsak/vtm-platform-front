import React, { useMemo } from 'react';
import styles from '../../../styles/CharacterSetup.module.css';
import { QuotaBar, RandomizeButton, StatusIcon } from './StepHelpers';
import DotRow from '../DotRow';

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

// Three named spreads that each satisfy the exact required pattern
// (1x4, 3x3, 4x2, 1x1) while emphasizing a different category.
const SUGGESTED_SPREADS = {
  Brawler: {
    Strength:4, Dexterity:3, Stamina:3,
    Charisma:3, Manipulation:2, Composure:2,
    Intelligence:2, Wits:2, Resolve:1,
  },
  Face: {
    Strength:3, Dexterity:2, Stamina:2,
    Charisma:4, Manipulation:3, Composure:3,
    Intelligence:2, Wits:2, Resolve:1,
  },
  Scholar: {
    Strength:3, Dexterity:2, Stamina:2,
    Charisma:2, Manipulation:2, Composure:1,
    Intelligence:4, Wits:3, Resolve:3,
  },
};

const PATTERN_VALUES = [4,3,3,3,2,2,2,2,1]; // matches RULES.attributes.pattern exactly

export default function AttributesStep({
  attrDots, setAttrDots,
  step, setStep
}) {
  const attrCounts = useMemo(() => {
    const c = {1:0,2:0,3:0,4:0};
    Object.values(attrDots).forEach(v => { c[v] = (c[v]||0)+1; });
    return c;
  }, [attrDots]);

  const attrOk = useMemo(() => {
    const req = RULES.attributes.pattern;
    return [1,2,3,4].every(k => (attrCounts[k] || 0) === (req[k]||0));
  }, [attrCounts]);

  // V5 derived traits — always in sync with the dots above, nothing to set by hand.
  const health = (attrDots.Stamina ?? RULES.attributes.min) + 3;
  const willpower = (attrDots.Composure ?? RULES.attributes.min) + (attrDots.Resolve ?? RULES.attributes.min);

  // Click-to-set: clicking a filled dot again drops it back a dot, clamped
  // to [min, max]. No per-click quota gate — any value is freely settable
  // in either direction; the pattern is only enforced to unlock "Next".
  const setAttr = (k, n) => {
    setAttrDots(p => {
      const v = p[k] ?? RULES.attributes.min;
      const raw = n === v ? n - 1 : n;
      const next = Math.max(RULES.attributes.min, Math.min(RULES.attributes.max, raw));
      return { ...p, [k]: next };
    });
  };

  const applySpread = (name) => setAttrDots({ ...SUGGESTED_SPREADS[name] });

  const randomizeAttrs = () => {
    const keys = Object.values(ATTRS).flat();
    const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);
    const next = {};
    shuffledKeys.forEach((k, i) => { next[k] = PATTERN_VALUES[i]; });
    setAttrDots(next);
  };

  return (
    <section>
      <div className={styles.stepHeader}>
        <div>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 4, borderBottom: 'none', paddingBottom: 0 }}>Attributes</h3>
          <p className={styles.muted} style={{ marginBottom: 0 }}>
            Pattern required: <b>1× at 4</b>, <b>3× at 3</b>, <b>4× at 2</b>, <b>1× at 1</b>.
            Click a dot to set the rating; click the filled dot again to lower it.
          </p>
        </div>
        <div className={styles.stepHeaderActions}>
          <RandomizeButton onClick={randomizeAttrs} />
        </div>
      </div>

      <div className={styles.tabs} style={{ margin: '10px 0' }}>
        <span className={styles.muted} style={{ alignSelf: 'center', marginRight: 4 }}>Suggested:</span>
        {Object.keys(SUGGESTED_SPREADS).map(name => (
          <button key={name} type="button" className={styles.tab} onClick={()=>applySpread(name)}>
            {name}
          </button>
        ))}
      </div>

      <div className={styles.grid2}>
        <QuotaBar
          label="Remaining"
          quotas={{
            1: Math.max(0, RULES.attributes.pattern[1] - (attrCounts[1]||0)),
            2: Math.max(0, RULES.attributes.pattern[2] - (attrCounts[2]||0)),
            3: Math.max(0, RULES.attributes.pattern[3] - (attrCounts[3]||0)),
            4: Math.max(0, RULES.attributes.pattern[4] - (attrCounts[4]||0)),
          }}
        />
        <div className={`${styles.quotaBar} ${styles.cardIsh}`}>
          <div className={styles.quotaHead}>Derived Stats</div>
          <div className={styles.quotaPills}>
            <span className={styles.pill}>Health <b>{health}</b></span>
            <span className={styles.pill}>Willpower <b>{willpower}</b></span>
          </div>
        </div>
      </div>
      <p className={styles.muted} style={{ marginTop: -8 }}>
        Health = Stamina + 3 • Willpower = Composure + Resolve — these update automatically as you allocate dots.
      </p>

      <div className={styles.attrSkillGrid}>
        {Object.entries(ATTRS).map(([group, list]) => (
          <div key={group} className={`${styles.cardIsh} ${styles.bleedSoft}`}>
            <h4>{group}</h4>
            <div className={styles.dotRowGroup}>
              {list.map(a => (
                <div key={a} className={styles.dotRowItem}>
                  <DotRow
                    label={a}
                    value={attrDots[a] ?? RULES.attributes.min}
                    max={5}
                    cap={RULES.attributes.max}
                    onDotClick={(n) => setAttr(a, n)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className={styles.muted}>Validation: <StatusIcon ok={attrOk} /></p>
      <div className={styles.navRow}>
        <button className={styles.ghostBtn} type="button" onClick={()=>setStep(4)}>Back</button>
        <button className={styles.cta} type="button" onClick={()=>setStep(6)} disabled={!attrOk}>Next</button>
      </div>
    </section>
  );
}
