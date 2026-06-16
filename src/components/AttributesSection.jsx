import React from 'react';
import styles from '../styles/CharacterView.module.css';
import DotRow from './DotRow';

// Define ATTRS locally since it's not exported from disciplines.js
const ATTRS = [
  ['Strength','Dexterity','Stamina'],
  ['Charisma','Manipulation','Composure'],
  ['Intelligence','Wits','Resolve'],
];

const AttributesSection = ({ sheet }) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}><b>Attributes</b></div>
      <div className={styles.grid3Col}>
        {ATTRS.map((col, i) => (
          <div key={i} className={styles.grid}>
            {col.map(name => (
              <DotRow
                key={name}
                label={name}
                value={Number(sheet?.attributes?.[name] ?? 1)}
                max={5}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttributesSection;