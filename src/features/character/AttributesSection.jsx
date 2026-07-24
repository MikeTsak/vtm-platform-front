import React from 'react';
import styles from '../../styles/CharacterView.module.css';
import { ATTR_DESCRIPTIONS } from '../../data/descriptions';

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
        <div key={i} className={`${styles.trackerDot} ${i < active ? styles.filled : ''}`}></div>
      ))}
    </div>
  );
};

export default function AttributesSection({ sheet }) {
  return (
    <div className={`${styles.glassCard} ${styles.attrCard}`}>
      <h3 className={styles.attrTitle}>
        Attributes
      </h3>

      {/* 3 columns on desktop, stacked vertically on mobile via attrGrid CSS */}
      <div className={styles.attrGrid}>
        {ATTRS.map(group => (
          <div key={group.category} className={styles.attrCategoryGroup}>
            <h4 className={styles.attrCategoryTitle}>
              {group.category}
            </h4>

            {group.items.map(name => {
              const val = Number(sheet?.attributes?.[name] ?? 1);
              return (
                <div key={name} title={ATTR_DESCRIPTIONS[name]} className={styles.attrItem}>
                  <span className={styles.attrName}>
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