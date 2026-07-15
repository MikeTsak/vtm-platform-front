import React, { useState } from 'react';
import styles from '../../styles/CharacterView.module.css';

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
        <div key={i} className={`${styles.dot} ${i < active ? styles.filled : ''}`}></div>
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
    <div style={{ background: 'var(--surface-color)', padding: '24px', borderBottom: '1px solid var(--surface-color)' }}>
      {!expanded ? (
        <>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 600, color: 'var(--text-color)', margin: '0 0 16px 0' }}>
            Notable Skills
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
            {notableSkills.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No notable skills.</p>}
            {notableSkills.map(s => (
              <div
                key={s.name}
                style={{ display: 'flex', flexDirection: 'column', border: '1px solid color-mix(in srgb, var(--tint) 40%, transparent)', padding: '12px', borderRadius: '4px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--tint)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--tint) 40%, transparent)'}
              >
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 500, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  {s.name}
                  {s.specialtiesArray.length > 0 && <span style={{ opacity: 0.7, fontSize: '10px', display: 'block', textTransform: 'none' }}>({s.specialtiesArray.join(', ')})</span>}
                </span>
                <RenderDotList dots={s.dots} />
              </div>
            ))}
          </div>
          <button
            onClick={() => setExpanded(true)}
            className={styles.bloodPulse}
            style={{ width: '100%', marginTop: '16px', padding: '12px', border: '1px solid var(--tint)', color: 'var(--tint)', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--tint) 10%, transparent)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            View All Skills
          </button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 600, color: 'var(--text-color)', margin: 0 }}>
              All Skills
            </h3>
            <button
              onClick={() => setExpanded(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--tint)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Show Notable Only
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px' }}>
            {Object.entries(SKILLS).map(([group, list]) => (
              <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 500, letterSpacing: '0.1em', color: 'var(--tint)', textTransform: 'uppercase', borderBottom: '1px solid var(--surface-lighter)', paddingBottom: '4px', margin: 0 }}>
                  {group}
                </h4>
                {list.map(name => {
                  const s = allSkillsFlat.find(x => x.name === name);
                  return (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)' }}>
                        {name}
                        {s.specialtiesArray.length > 0 && <span style={{ opacity: 0.7, fontSize: '0.85rem', marginLeft: '6px' }}>({s.specialtiesArray.join(', ')})</span>}
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