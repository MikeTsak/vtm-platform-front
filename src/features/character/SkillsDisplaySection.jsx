import React, { useState } from 'react';
import styles from '../../styles/CharacterView.module.css';
import { SKILL_DESCRIPTIONS } from '../../data/descriptions';

const SKILLS = {
  Physical: ['Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival'],
  Social: ['Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge'],
  Mental: ['Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology']
};

const RenderDotList = ({ dots }) => {
  const total = 5;
  const active = Number(dots) || 0;
  return (
    <div className={styles.dotTracker}>
      {Array.from({ length: Math.max(total, active) }).map((_, i) => (
        <div key={i} className={`${styles.trackerDot} ${i < active ? styles.filled : ''}`}></div>
      ))}
    </div>
  );
};

export default function SkillsDisplaySection({ sheet }) {
  const [expanded, setExpanded] = useState(false);

  const allSkillsFlat = [];
  Object.entries(SKILLS).forEach(([group, list]) => {
    list.forEach(name => {
      const raw = sheet?.skills?.[name];
      const node = (raw && typeof raw === 'object' && 'dots' in raw)
        ? raw
        : { dots: Number(raw || 0), specialties: [] };
      const specialtiesArray = node.specialties || sheet?.specialties?.[name] || [];
      allSkillsFlat.push({ name, group, dots: Number(node.dots || 0), specialtiesArray });
    });
  });

  const notableSkills = [...allSkillsFlat]
    .filter(s => s.dots > 0)
    .sort((a, b) => b.dots - a.dots)
    .slice(0, 8);

  return (
    <div className={styles.skillsCard}>
      {!expanded ? (
        <>
          <h3 className={styles.skillsSectionTitle}>
            Notable Skills
          </h3>
          <div className={styles.skillsGrid}>
            {notableSkills.length === 0 && <p className={styles.dim}>No notable skills.</p>}
            {notableSkills.map(s => (
              <div
                key={s.name}
                title={SKILL_DESCRIPTIONS[s.name]}
                className={styles.skillNotableItem}
              >
                <span className={styles.skillNotableName}>
                  {s.name}
                  {s.specialtiesArray.length > 0 && (
                    <span className={styles.skillSpecialties}>({s.specialtiesArray.join(', ')})</span>
                  )}
                </span>
                <RenderDotList dots={s.dots} />
              </div>
            ))}
          </div>
          <button
            onClick={() => setExpanded(true)}
            className={`${styles.bloodPulse} ${styles.expandSkillsBtn}`}
          >
            View All Skills
          </button>
        </>
      ) : (
        <>
          <div className={styles.allSkillsHeader}>
            <h3 className={styles.skillsSectionTitle} style={{ margin: 0 }}>
              All Skills
            </h3>
            <button
              onClick={() => setExpanded(false)}
              className={styles.skillsToggleBtn}
            >
              Show Notable Only
            </button>
          </div>
          <div className={styles.allSkillsGrid}>
            {Object.entries(SKILLS).map(([group, list]) => (
              <div key={group} className={styles.skillCategoryGroup}>
                <h4 className={styles.skillCategoryTitle}>
                  {group}
                </h4>
                {list.map(name => {
                  const s = allSkillsFlat.find(x => x.name === name);
                  return (
                    <div key={name} title={SKILL_DESCRIPTIONS[name]} className={styles.allSkillRow}>
                      <span className={styles.allSkillName}>
                        {name}
                        {s.specialtiesArray.length > 0 && (
                          <span className={styles.skillSpecialtiesInline}>({s.specialtiesArray.join(', ')})</span>
                        )}
                      </span>
                      <RenderDotList dots={s.dots} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}