import React, { useMemo } from 'react';
import styles from '../../../styles/CharacterSetup.module.css';
import { Field, QuotaBar, SpecialtiesBlock, RandomizeButton, StatusIcon } from './StepHelpers';
import DotRow from '../DotRow';

const SKILLS = {
  Physical: ['Athletics','Brawl','Craft','Drive','Firearms','Larceny','Melee','Stealth','Survival'],
  Social:   ['Animal Ken','Etiquette','Insight','Intimidation','Leadership','Performance','Persuasion','Streetwise','Subterfuge'],
  Mental:   ['Academics','Awareness','Finance','Investigation','Medicine','Occult','Politics','Science','Technology'],
};
const RULES = {
  skillPackages: {
    'Jack of All Trades': { '3':1, '2':8, '1':10, max:4 },
    'Balanced':           { '3':3, '2':5, '1':7,  max:4 },
    'Specialist':         { '4':1, '3':3, '2':3, '1':3, max:4 },
  }
};

// Most broadly useful skills for a starting Kindred, most to least. Used to
// build the "Suggested" fill; a shuffled copy of the same 27 names powers
// "Randomize" instead.
const SKILL_PRIORITY = [
  'Awareness','Insight','Persuasion','Streetwise','Subterfuge','Etiquette','Stealth',
  'Athletics','Brawl','Intimidation','Investigation','Leadership','Performance','Occult',
  'Medicine','Politics','Melee','Larceny','Animal Ken','Academics','Firearms','Survival',
  'Craft','Drive','Finance','Science','Technology',
];

// Fill skills from an ordered list of names, front-loading the highest tiers
// first (e.g. Balanced's 3 top-tier slots get the first 3 names).
function fillFromOrder(order, req) {
  const tiers = Object.keys(req).filter(k => k !== 'max').map(Number).sort((a,b)=>b-a);
  const dots = {};
  let cursor = 0;
  tiers.forEach(tier => {
    const count = req[String(tier)];
    for (let i = 0; i < count; i++) {
      const name = order[cursor++];
      if (name) dots[name] = tier;
    }
  });
  return dots;
}

export default function SkillsStep({
  skillDots, setSkillDots,
  skillPackage, setSkillPackage,
  specialties, setSpecialties,
  step, setStep
}) {
  const skillReq = useMemo(() => RULES.skillPackages[skillPackage], [skillPackage]);
  const allSkillNames = useMemo(() => Object.values(SKILLS).flat(), []);

  const skillCounts = useMemo(() => {
    const c = {0:0,1:0,2:0,3:0,4:0,5:0};
    Object.values(skillDots).forEach(v => { c[v] = (c[v]||0)+1; });
    return c;
  }, [skillDots]);

  const remainingSkillSlots = useMemo(() => {
    const out = {};
    ['1','2','3','4'].forEach(dot => {
      const need = Number(skillReq[dot] || 0);
      const have = Number(skillCounts[Number(dot)] || 0);
      out[dot] = Math.max(0, need - have);
    });
    return out;
  }, [skillReq, skillCounts]);

  // Click-to-set: clicking a filled dot again drops it back a dot. There is
  // no per-click quota gate on either direction — you can freely move a dot
  // from any skill to any other; only "Next" is gated on the final pattern
  // matching exactly (skillOk below). This is what fixes the old bug where
  // dots could get stuck only movable in one direction.
  const setSkill = (k, n) => {
    setSkillDots(p => {
      const v = p[k] || 0;
      const raw = n === v ? n - 1 : n;
      const next = Math.max(0, Math.min(skillReq.max || 5, raw));
      return { ...p, [k]: next };
    });
  };

  const applySuggested = () => {
    const base = {}; allSkillNames.forEach(s => { base[s] = 0; });
    setSkillDots({ ...base, ...fillFromOrder(SKILL_PRIORITY, skillReq) });
  };

  const randomizeSkills = () => {
    const shuffled = [...allSkillNames].sort(() => Math.random() - 0.5);
    const base = {}; allSkillNames.forEach(s => { base[s] = 0; });
    setSkillDots({ ...base, ...fillFromOrder(shuffled, skillReq) });
  };

  const skillOk = useMemo(() => {
    const req = RULES.skillPackages[skillPackage];
    const dotKeys = Object.keys(req).filter(k => k !== 'max');
    const exact = dotKeys.every(dot => (skillCounts[Number(dot)] || 0) === req[dot]);
    const maxOk = Object.values(skillDots).every(v => v <= req.max);
    return exact && maxOk;
  }, [skillCounts, skillDots, skillPackage]);

  const skillWhy = useMemo(() => {
    const req = RULES.skillPackages[skillPackage] || {};
    const msgs = [];

    const overMax = Object.entries(skillDots)
      .filter(([,v]) => Number(v) > Number(req.max))
      .map(([name,v]) => `${name} (${v})`);
    if (overMax.length) {
      msgs.push(`Some skills exceed the max of ${req.max}: ${overMax.join(', ')}`);
    }

    const tiers = Object.keys(req).filter(k => k !== 'max').map(Number).sort((a,b)=>a-b);
    tiers.forEach(t => {
      const need = Number(req[String(t)] || 0);
      const have = Number(skillCounts[t] || 0);
      if (have < need) msgs.push(`You need ${need - have} more skill(s) at ${t} dot(s).`);
      if (have > need) msgs.push(`You have ${have - need} too many skill(s) at ${t} dot(s).`);
    });

    if (!msgs.length && !skillOk) msgs.push('Skill distribution does not match the selected package.');

    return msgs;
  }, [skillPackage, skillDots, skillCounts, skillOk]);

  return (
    <section>
      <div className={styles.stepHeader}>
        <div>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 4, borderBottom: 'none', paddingBottom: 0 }}>Skills</h3>
          <p className={styles.muted} style={{ marginBottom: 0 }}>
            Choose a distribution package, then click a dot to set each skill's rating (click the filled dot again to lower it).
          </p>
        </div>
        <div className={styles.stepHeaderActions}>
          <button type="button" className={styles.ghostBtn} onClick={applySuggested}>Suggest</button>
          <RandomizeButton onClick={randomizeSkills} />
        </div>
      </div>

      <div className={styles.grid3} style={{ marginTop: 10 }}>
        <Field label="Distribution">
          <select
            className={styles.input}
            value={skillPackage}
            onChange={e=>setSkillPackage(e.target.value)}
          >
            {Object.keys(RULES.skillPackages).map(k => <option key={k}>{k}</option>)}
          </select>
        </Field>

        <div className={`${styles.cardIsh} ${styles.pkgCard}`}>
          <small className={styles.muted}>
            {Object.entries(RULES.skillPackages[skillPackage])
              .filter(([k])=>k!=='max')
              .sort((a,b)=>Number(b[0])-Number(a[0]))
              .map(([dots, n]) => `${n}× at ${dots}`).join(' • ')} (max {RULES.skillPackages[skillPackage].max})
          </small>
        </div>

        <QuotaBar
          label="Remaining Dots"
          quotas={remainingSkillSlots}
        />
      </div>

      <div className={styles.attrSkillGrid}>
        {Object.entries(SKILLS).map(([group, list]) => (
          <div key={group} className={`${styles.cardIsh} ${styles.bleedSoft}`}>
            <h4>{group}</h4>
            <div className={styles.dotRowGroup}>
              {list.map(s => (
                <div key={s} className={styles.dotRowItem}>
                  <DotRow
                    label={s}
                    value={skillDots[s] || 0}
                    max={5}
                    cap={skillReq.max || 5}
                    onDotClick={(n) => setSkill(s, n)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h4 className={styles.sectionSub}>Specialties</h4>
      <SpecialtiesBlock
        skillDots={skillDots}
        specialties={specialties}
        setSpecialties={setSpecialties}
      />

      <p className={styles.muted}>Validation: <StatusIcon ok={skillOk} /></p>

      {!skillOk && skillWhy.length > 0 && (
        <div className={styles.alert} style={{marginTop:10}}>
          <span className={styles.alertDot} />
          <div>
            <b>Skills are not valid yet:</b>
            <ul style={{margin:'6px 0 0 18px'}}>
              {skillWhy.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className={styles.navRow}>
        <button className={styles.ghostBtn} type="button" onClick={()=>setStep(5)}>Back</button>
        <button className={styles.cta} type="button" onClick={()=>setStep(7)} disabled={!skillOk}>Next</button>
      </div>
    </section>
  );
}
