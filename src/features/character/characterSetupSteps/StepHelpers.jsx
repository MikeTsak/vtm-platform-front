import React, { useEffect, useMemo } from 'react';
import styles from '../../../styles/CharacterSetup.module.css';

// Material Symbols icon, matching the font already loaded site-wide (no emoji).
export function Icon({ name, size = 16, style }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: size, lineHeight: 1, verticalAlign: 'middle', ...style }}
    >
      {name}
    </span>
  );
}

// `steps`: [{ label, icon }]. Renders as a horizontal pill rail on desktop;
// on mobile it becomes a fixed bottom bar (see .stepper mobile rules).
export function Stepper({ step, setStep, steps }) {
  return (
    <div className={styles.stepper}>
      {steps.map((s, i) => {
        const n = i+1, active = n===step, done = n<step;
        return (
          <button
            key={s.label}
            type="button"
            className={`${styles.step} ${active?styles.active:''} ${done?styles.done:''}`}
            onClick={()=>setStep(n)}
          >
            <Icon name={s.icon} size={15} style={{ marginRight: 4 }} />
            <span className={styles.num}>{n}</span>
            <span className={styles.stepLabel}>{s.label}</span>
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

// A "valid / not valid" indicator used across every step's validation line.
export function StatusIcon({ ok }) {
  return <Icon name={ok ? 'check_circle' : 'cancel'} style={{ color: ok ? '#4caf50' : '#ff5252' }} />;
}

export function RandomizeButton({ onClick, label = 'Randomize' }) {
  return (
    <button type="button" className={styles.ghostBtn} onClick={onClick}>
      <Icon name="casino" style={{ marginRight: 4 }} />
      {label}
    </button>
  );
}

// Each entry is still stored as a single "Skill: Text" string — that's the
// flat format CharacterSetup/ReviewStep/the backend/normalizeFromFlatAny all
// already expect, so nothing downstream needs to change. What used to be a
// single free-text box (with a placeholder mixing ':' and '/' in the same
// example, which is exactly how a player ends up typing "Craft/traps" and
// getting a bogus skill entry instead of a specialty) is now a skill
// dropdown + a plain text field that get combined into that string for you.
function parseSpecialtyEntry(raw) {
  const idx = String(raw || '').indexOf(':');
  if (idx === -1) return { skill: '', text: String(raw || '') };
  return { skill: raw.slice(0, idx).trim(), text: raw.slice(idx + 1).trim() };
}

export function SpecialtiesBlock({ skillDots, specialties, setSpecialties }) {
  const autoSkills = ['Academics','Craft','Performance','Science'];
  const autoCount = autoSkills.reduce((n,sk)=> n + ((skillDots[sk]||0) > 0 ? 1 : 0), 0);
  const totalNeeded = autoCount + 1; // +1 extra anywhere
  const tooMany = specialties.filter(Boolean).length > totalNeeded;

  // A specialty requires at least 1 dot in the skill (per the rules) — the
  // free-text box never enforced this at all.
  const eligibleSkills = useMemo(
    () => Object.entries(skillDots).filter(([, v]) => Number(v) > 0).map(([k]) => k).sort(),
    [skillDots]
  );

  useEffect(() => {
    setSpecialties(prev => {
      if (prev.length < totalNeeded) {
        return [...prev, ...Array(totalNeeded - prev.length).fill('')];
      } else if (prev.length > totalNeeded) {
        return prev.slice(0, totalNeeded);
      }
      return prev;
    });
  }, [totalNeeded, setSpecialties]);

  const updateEntry = (i, patch) => {
    setSpecialties(prev => prev.map((v, idx) => {
      if (idx !== i) return v;
      const next = { ...parseSpecialtyEntry(v), ...patch };
      return next.skill ? `${next.skill}: ${next.text}` : next.text;
    }));
  };

  return (
    <>
      <p className={styles.muted}>
        Free specialties: one in each of <b>Academics, Craft, Performance, Science</b> (if you have dots), plus <b>one extra</b> anywhere.
        If Predator type grants a specialty in a Skill with 0 dots, convert it to the first dot instead.
      </p>
      <div className={styles.grid3}>
        {specialties.map((sp, i) => {
          const { skill, text } = parseSpecialtyEntry(sp);
          return (
            <Field key={i} label={`Specialty ${i+1}`}>
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  className={styles.input}
                  value={skill}
                  onChange={e => updateEntry(i, { skill: e.target.value })}
                  style={{ flex: '0 0 42%' }}
                >
                  <option value="">Skill…</option>
                  {eligibleSkills.map(sk => <option key={sk} value={sk}>{sk}</option>)}
                </select>
                <input
                  className={styles.input}
                  value={text}
                  onChange={e => updateEntry(i, { text: e.target.value })}
                  placeholder="e.g. Knives"
                  style={{ flex: 1 }}
                />
              </div>
            </Field>
          );
        })}
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
