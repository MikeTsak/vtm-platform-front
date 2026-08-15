import React from 'react';
import styles from '../../../styles/CharacterSetup.module.css';
import { symlogo, textlogo } from '../../../data/clans';
import { StatusIcon } from './StepHelpers';
import { PREDATOR_TYPES } from '../../../data/predator_types';

export default function ReviewStep({
  name, clan, concept, chronicle, ambition, desire, sire, predatorType,
  attrDots, derivedDisciplineDots, disciplinePowerPicks,
  skillDots, specialties,
  merits, flaws,
  tenets, convictions, touchstones,
  humanity, bloodPotency,
  attrOk, skillOk, predatorOk, advOk,
  canSubmit,
  saving,
  step, setStep,
  onSave,
}) {
  const health = (attrDots.Stamina ?? 1) + 3;
  const willpower = (attrDots.Composure ?? 1) + (attrDots.Resolve ?? 1);
  const powerNames = Object.values(disciplinePowerPicks || {}).flat().map(p => p.name);
  const humanityMod = typeof PREDATOR_TYPES[predatorType]?.effects?.humanity === 'number' ? PREDATOR_TYPES[predatorType].effects.humanity : 0;
  const derivedHumanity = Math.max(1, Math.min(10, (humanity ?? 7) + humanityMod));

  return (
    <section>
      <h3 className={styles.sectionTitle}>Review & Save</h3>

      {clan && (
        <div className={`${styles.cardIsh} ${styles.reviewCrest}`}>
          <img src={symlogo(clan)} alt={`${clan} symbol`} />
          <img src={textlogo(clan)} alt={`${clan} text logo`} />
        </div>
      )}

      <ul className={styles.muted} style={{lineHeight:1.6}}>
        <li><b>Name:</b> {name || '—'} <b>Clan:</b> {clan || '—'}</li>
        <li><b>Concept:</b> {concept || '—'}  <b>Chronicle:</b> {chronicle}</li>
        <li><b>Ambition:</b> {ambition || '—'}  <b>Desire:</b> {desire || '—'}</li>
        <li><b>Sire:</b> {sire || '—'}  <b>Predator:</b> {predatorType}</li>
        <li><b>Health:</b> {health}  <b>Willpower:</b> {willpower}</li>
        <li><b>Humanity:</b> {derivedHumanity}  <b>Blood Potency:</b> {bloodPotency ?? 1}</li>
        <li><b>Disciplines:</b> {Object.entries(derivedDisciplineDots).map(([k,v])=>`${k} ${'•'.repeat(v)}`).join(' , ') || '—'}</li>
        <li><b>Starting powers:</b> {powerNames.length ? powerNames.join(', ') : 'None picked yet'}</li>
        <li><b>Attributes ok:</b> <StatusIcon ok={attrOk} />  <b>Skills ok:</b> <StatusIcon ok={skillOk} /></li>
        <li><b>Predator ok:</b> <StatusIcon ok={predatorOk} />  <b>Merits/Flaws ok:</b> <StatusIcon ok={advOk} /></li>
      </ul>

      <div className={styles.navRow}>
        <button className={styles.ghostBtn} type="button" onClick={()=>setStep(1)}>Start Over</button>
        <button
          className={styles.cta}
          disabled={!canSubmit || saving}
          onClick={onSave}
        >
          {saving ? 'Saving…' : 'Save Character'}
        </button>
      </div>
    </section>
  );
}