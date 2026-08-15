import React from 'react';
import styles from '../../styles/CharacterSetup.module.css';
import { symlogo } from '../../data/clans';
import { iconPath } from '../../data/disciplines';
import { Icon } from './characterSetupSteps/StepHelpers';

export default function CharacterPreview({
  clan, name, concept, predatorType,
  selectedDiscs, favoredDisc,
  humanity, bloodPotency, health, willpower,
  meritsCount, flawsCount,
  checklist,
  step, setStep,
}) {
  return (
    <aside className={styles.previewPanel}>
      <div className={styles.previewHeader}>
        {clan ? (
          <img src={symlogo(clan)} alt={clan} className={styles.previewCrest} />
        ) : (
          <div className={styles.previewCrestPlaceholder}>?</div>
        )}
        <div style={{ minWidth: 0 }}>
          <div className={styles.previewName}>{name || 'Unnamed Kindred'}</div>
          <div className={styles.previewSub}>{clan || 'No clan yet'}{concept ? ` • ${concept}` : ''}</div>
        </div>
      </div>

      {predatorType && (
        <div className={styles.previewRow}>
          <span className={styles.muted}>Predator</span>
          <span>{predatorType}</span>
        </div>
      )}

      {selectedDiscs.length > 0 && (
        <div className={styles.previewDiscs}>
          {selectedDiscs.map(d => (
            <div key={d} className={styles.previewDiscChip} title={d}>
              <img src={iconPath(d)} alt="" />
              <span>{d}</span>
              <b>{favoredDisc === d ? '••' : '•'}</b>
            </div>
          ))}
        </div>
      )}

      <div className={styles.previewRow}>
        <span className={styles.muted}>Health</span>
        <span>{health}</span>
      </div>
      <div className={styles.previewRow}>
        <span className={styles.muted}>Willpower</span>
        <span>{willpower}</span>
      </div>
      <div className={styles.previewRow}>
        <span className={styles.muted}>Humanity</span>
        <span>{humanity}</span>
      </div>
      <div className={styles.previewRow}>
        <span className={styles.muted}>Blood Potency</span>
        <span>{bloodPotency}</span>
      </div>
      <div className={styles.previewRow}>
        <span className={styles.muted}>Merits / Flaws</span>
        <span>{meritsCount} / {flawsCount}</span>
      </div>

      <ul className={styles.previewChecklist}>
        {checklist.map(item => (
          <li
            key={item.step}
            className={item.step === step ? styles.previewChecklistActive : ''}
            onClick={() => setStep(item.step)}
          >
            <Icon name={item.done ? 'check_circle' : 'radio_button_unchecked'} style={{ color: item.done ? '#4caf50' : 'var(--text-muted)' }} />
            {item.label}
          </li>
        ))}
      </ul>
    </aside>
  );
}
