import React from 'react';
import styles from '../../../styles/Sheet.module.css';

const NAME_OVERRIDES = {
  'The Ministry': 'Ministry',
  'Banu Haqim': 'Banu_Haqim',
  'Thin-blood': 'Thinblood'
};
const symlogo = (c) =>
  `/img/clans/330px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g,'_')}_symbol.png`;
const textlogo = (c) =>
  `/img/clans/text/300px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g,'_')}_logo.png`;

export default function ReviewStep({
  name, clan, concept, chronicle, ambition, desire, sire, predatorType,
  attrDots, derivedDisciplineDots,
  skillDots, specialties,
  merits, flaws,
  tenets, convictions, touchstones,
  humanity, bloodPotency,
  attrOk, skillOk, predatorOk, advOk,
  canSubmit,
  saving,
  step, setStep,
  onSave,
  successOpen, setSuccessOpen
}) {
  const handleSave = async () => {
    await onSave();
    setSuccessOpen(true);
  };

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
        <li><b>Disciplines:</b> {Object.entries(derivedDisciplineDots).map(([k,v])=>`${k} ${'•'.repeat(v)}`).join(' , ') || '—'}</li>
        <li><b>Attributes ok:</b> {attrOk ? '✅' : '❌'}  <b>Skills ok:</b> {skillOk ? '✅' : '❌'}</li>
        <li><b>Predator ok:</b> {predatorOk ? '✅' : '❌'}  <b>Merits/Flaws ok:</b> {advOk ? '✅' : '❌'}</li>
      </ul>

      <div className={styles.navRow}>
        <button className={styles.ghostBtn} type="button" onClick={()=>setStep(1)}>Start Over</button>
        <button
          className={styles.cta}
          disabled={!canSubmit || saving}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save Character'}
        </button>
      </div>
    </section>
  );
}