import React from 'react';
import styles from '../../styles/CharacterView.module.css';
import { DISCIPLINES } from '../../data/disciplines';
import DisciplineRow from './DisciplineRow';

const DisciplinesDisplaySection = ({ sheet }) => {
  // Extract the keys directly since they are already the proper Discipline names
  const disciplineNames = Object.keys(DISCIPLINES).sort();

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}><b>Disciplines</b></div>
      <div className={styles.grid}>
        {disciplineNames.map(name => {
          const level = Number(sheet?.disciplines?.[name] || 0);
          
          // Skip rendering if the character has 0 dots in this discipline
          if (level === 0) return null;

          return (
            <DisciplineRow
              key={name}
              name={name}
              level={level}
              powers={sheet?.disciplinePowers?.[name] || []}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DisciplinesDisplaySection;