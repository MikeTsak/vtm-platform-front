import React, { useMemo } from 'react';
import styles from '../../../styles/Sheet.module.css';
import { Stepper, Field, QuotaBar, SpecialtiesBlock } from './StepHelpers';

export default function SkillsStep({
  skillDots, setSkillDots,
  skillPackage, setSkillPackage,
  specialties, setSpecialties,
  step, setStep
}) {
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

  const skillReq = useMemo(() => RULES.skillPackages[skillPackage], [skillPackage]);

  const flat = (obj) => Object.values(obj).flat();
  const baseSkills = useMemo(() => {
    const o = {}; flat(SKILLS).forEach(s => o[s]=0); return o;
  }, []);

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

  const canIncSkill = (k) => {
    const v = skillDots[k] || 0;
    const next = v + 1;
    if (next > (skillReq.max || 5)) return false;
    if (!(String(next) in skillReq)) return false;
    const needAtNext = Number(skillReq[String(next)] || 0);
    const haveAtNext = Number(skillCounts[next] || 0);
    if (haveAtNext >= needAtNext) return false;
    return true;
  };

  const canDecSkill = (k) => {
    const v = skillDots[k] || 0;
    return v > 0;
  };

  const incSkill = (k, d) => {
    setSkillDots(p => {
      const v = p[k] || 0;
      if (d > 0 && !canIncSkill(k)) return p;
      if (d < 0 && !canDecSkill(k)) return p;
      const next = Math.max(0, Math.min((skillReq.max||5), v + d));
      return {...p, [k]: next};
    });
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
      <h3 className={styles.sectionTitle}>Skills</h3>
      <p className={styles.muted}>Choose a distribution package, then allocate dots. Controls lock as each tier fills.</p>

      <div className={styles.grid3}>
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
            {list.map(s => {
              const plusDisabled = !canIncSkill(s);
              const minusDisabled = !canDecSkill(s);
              return (
                <div key={s} className={styles.flexRow}>
                  <span style={{minWidth:160}}>{s}</span>
                  <div className={styles.dotControls}>
                    <button
                      type="button"
                      className={`${styles.ghostBtn} ${minusDisabled?styles.disabled:''}`}
                      disabled={minusDisabled}
                      onClick={()=>incSkill(s,-1)}
                    >−</button>
                    <div className={`${styles.dotbox} ${styles.vitae}`}>{skillDots[s]}</div>
                    <button
                      type="button"
                      className={`${styles.ghostBtn} ${plusDisabled?styles.disabled:''}`}
                      disabled={plusDisabled}
                      onClick={()=>incSkill(s,1)}
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <h4 className={styles.sectionSub}>Specialties</h4>
      <SpecialtiesBlock
        skillDots={skillDots}
        specialties={specialties}
        setSpecialties={setSpecialties}
      />

      <p className={styles.muted}>Validation: {skillOk ? '✅' : '❌'}</p>

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
        <button className={styles.ghostBtn} type="button" onClick={()=>setStep(4)}>Back</button>
        <button className={styles.cta} type="button" onClick={()=>setStep(6)} disabled={!skillOk}>Next</button>
      </div>
    </section>
  );
}