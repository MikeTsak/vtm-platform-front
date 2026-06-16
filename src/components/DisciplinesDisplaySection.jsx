import React from 'react';
import styles from '../styles/CharacterView.module.css';
import { DISCIPLINES } from '../data/disciplines';
import DisciplineRow from './DisciplineRow';

const DisciplinesDisplaySection = ({ sheet }) => {
  // Build disciplinesMap from DISCIPLINES data (similar to original code)
  const disciplinesMap = {};
  Object.entries(DISCIPLINES).forEach(([key, value]) => {
    disciplinesMap[value.name] = key;
  });

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}><b>Disciplines</b></div>
      <div className={styles.grid}>
        {Object.keys(disciplinesMap).sort().map(name => (
          <DisciplineRow
            key={name}
            name={name}
            level={Number(sheet.disciplines?.[name] || 0)}
            powers={sheet.disciplinePowers?.[name] || []}
          />
        ))}
      </div>
    </div>
  );
};

export default DisciplinesDisplaySection;