import React from 'react';
import { iconPath } from '../data/disciplines';
import styles from '../styles/CharacterView.module.css';

function DisciplineRow({ name, level = 0, powers = [] }) {
  const icon = iconPath(name);
  const byLevel = new Map((powers || []).map(p => [Number(p.level), { id: p.id, name: p.name }]));
  const maxPicked = Math.max(0, ...Array.from(byLevel.keys()));
  const displayMax = Math.min(5, Math.max(level || 0, maxPicked || 0) || 0) || level || 0 || 0;

  return (
    <div className={styles.disciplineRow}>
      <div className={styles.disciplineHead}>
        <img
          src={icon}
          alt=""
          width={28}
          height={28}
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/img/disciplines/Oblivion-rombo.png'; }}
          className={styles.disciplineIcon}
        />
        <div className={styles.disciplineTitleBlock}>
          <b>{name}</b>
          <div className={styles.dots}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`${styles.dot} ${i < level ? styles.dotOn : ''}`} />
            ))}
          </div>
        </div>
      </div>

      <ul className={styles.powerList}>
        {Array.from({ length: Math.max(displayMax, level || 0) || 0 }).map((_, i) => {
          const L = i + 1;
          const picked = byLevel.get(L);
          const unlocked = L <= level;

          let cls = styles.powerPill;
          let label = picked ? picked.name : (unlocked ? 'Pick a power' : 'Locked');
          if (!unlocked) cls += ` ${styles.powerPillLocked}`;
          else if (!picked) cls += ` ${styles.powerPillMissing}`;

          return (
            <li key={L} className={cls} title={picked ? `Level ${L}` : undefined}>
              <span className={styles.levelBadge}>L{L}</span>
              <span className={styles.powerName}>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default DisciplineRow;