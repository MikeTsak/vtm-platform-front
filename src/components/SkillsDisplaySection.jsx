import React from 'react';
import styles from '../styles/CharacterView.module.css';
import DotRow from './DotRow';

// Define SKILLS locally since it's not exported from disciplines.js
const SKILLS = {
  Physical: ['Athletics','Brawl','Craft','Drive','Firearms','Larceny','Melee','Stealth','Survival'],
  Social: ['Animal Ken','Empathy','Expression','Intimidation','Leadership','Persuasion','Subterfuge'],
  Mental: ['Academics','Awareness','Finance','Investigation','Medicine','Occupations','Politics','Science','Technology']
};

const SkillsDisplaySection = ({ sheet }) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}><b>Skills</b></div>
      <div className={styles.grid3Col}>
        {Object.entries(SKILLS).map(([group, list]) => (
          <div key={group} className={styles.grid}>
            <div className={styles.subhead}>{group}</div>
            {list.map(name => {
              const raw = sheet?.skills?.[name];
              const node = (raw && typeof raw === 'object' && 'dots' in raw)
                ? raw
                : { dots: Number(raw || 0), specialties: [] };
              return (
                <DotRow
                  key={name}
                  label={name}
                  value={Number(node.dots || 0)}
                  max={5}
                  rightExtra={<span style={{ opacity: 0.7, fontSize: '0.85rem' }}>{node.specialties.length > 0 ? `(${node.specialties.length})` : ''}</span>}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillsDisplaySection;