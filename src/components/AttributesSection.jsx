import React from 'react';
import styles from '../styles/CharacterView.module.css';

const ATTRS = [
  { category: 'Physical', items: ['Strength', 'Dexterity', 'Stamina'] },
  { category: 'Social', items: ['Charisma', 'Manipulation', 'Composure'] },
  { category: 'Mental', items: ['Intelligence', 'Wits', 'Resolve'] },
];

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

export default function AttributesSection({ sheet }) {
  return (
    <div className={styles.glassCard} style={{ padding: '24px' }}>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 600, color: 'var(--text-color)', margin: '0 0 24px 0', borderBottom: '1px solid color-mix(in srgb, var(--tint) 40%, transparent)', paddingBottom: '8px' }}>
        Attributes
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px' }}>
        {ATTRS.map(group => (
          <div key={group.category} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 500, letterSpacing: '0.1em', color: 'var(--tint)', textTransform: 'uppercase', textAlign: 'center', borderBottom: '1px solid var(--surface-lighter)', paddingBottom: '4px', margin: 0 }}>
              {group.category}
            </h4>
            {group.items.map(name => {
              const val = Number(sheet?.attributes?.[name] ?? 1);
              return (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)' }}>
                    {name}
                  </span>
                  <RenderDotList dots={val} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}