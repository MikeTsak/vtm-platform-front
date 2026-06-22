import React from 'react';
import styles from '../styles/CharacterView.module.css';
import DotRow from './DotRow';

// Strictly enforced VTM V5 Skills
const SKILLS = {
  Physical: ['Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival'],
  Social: ['Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge'],
  Mental: ['Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology']
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
              
              // Checks for specialties whether they are nested in the skill node or stored separately on the sheet
              const specialtiesArray = node.specialties || sheet?.specialties?.[name] || [];

              return (
                <DotRow
                  key={name}
                  label={name}
                  value={Number(node.dots || 0)}
                  max={5}
                  rightExtra={
                    specialtiesArray.length > 0 ? (
                      <span style={{ opacity: 0.7, fontSize: '0.85rem', marginLeft: '6px' }}>
                        ({specialtiesArray.join(', ')})
                      </span>
                    ) : null
                  }
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