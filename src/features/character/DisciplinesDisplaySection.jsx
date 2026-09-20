import React from 'react';
import styles from '../../styles/CharacterView.module.css';
import { DISCIPLINES } from '../../data/disciplines';
import DisciplineRow from './DisciplineRow';

const DisciplinesDisplaySection = ({ sheet, boxMode }) => {
  const disciplineNamesSet = new Set(Object.keys(DISCIPLINES));
  if (Array.isArray(sheet?.mystic_powers) && sheet.mystic_powers.length > 0) {
    disciplineNamesSet.add('Oblivion');
  }
  const disciplineNames = Array.from(disciplineNamesSet).sort();

  return (
    <div className={`${styles.card} ${styles.disciplinesCard}`} data-box-mode={boxMode}>
      <div className={styles.disciplinesGrid}>
        {disciplineNames.map(name => {
          const level = Number(sheet?.disciplines?.[name] || 0);
          
          let phantomPowers = [];
          if (name === 'Oblivion' && Array.isArray(sheet?.mystic_powers)) {
            sheet.mystic_powers.forEach(pid => {
              // find actual name and level from DISCIPLINES
              for (const [lvl, list] of Object.entries(DISCIPLINES['Oblivion'].levels || {})) {
                const found = list.find(p => p.id === pid || p.name === pid);
                if (found) {
                  phantomPowers.push({ ...found, level: Number(lvl) });
                  break;
                }
              }
            });
          }

          // Skip rendering if the character has 0 dots and no phantom powers in this discipline
          if (level === 0 && phantomPowers.length === 0) return null;

          return (
            <DisciplineRow
              key={name}
              name={name}
              level={level}
              powers={sheet?.disciplinePowers?.[name] || []}
              phantomPowers={phantomPowers}
              boxMode={boxMode}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DisciplinesDisplaySection;