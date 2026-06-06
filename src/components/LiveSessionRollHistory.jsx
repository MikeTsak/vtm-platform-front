import React from 'react';
import styles from '../styles/LiveSession.module.css';

export default function LiveSessionRollHistory({ rolls = [] }) {
  if (!rolls.length) {
    return <div className={styles.emptyState}>No rolls yet.</div>;
  }

  return (
    <div className={styles.rollHistoryList}>
      {rolls.slice(0, 15).map((roll, idx) => {
        const id = roll.id || `${roll.character_id}-${roll.created_at}-${idx}`;
        const name = roll.player_name || roll.character_name || roll.characterName || 'Unknown';
        const result = roll.result || roll.label || `${roll.successes ?? 0} successes`;
        const createdAt = roll.created_at || roll.createdAt;

        return (
          <article key={id} className={styles.rollEntry}>
            <div>
              <strong>{name}</strong>
              <p>{roll.roll_type || roll.rollType || 'roll'}</p>
            </div>
            <div className={styles.rollMeta}>
              <span>{result}</span>
              <small>{createdAt ? new Date(createdAt).toLocaleTimeString() : '-'}</small>
            </div>
          </article>
        );
      })}
    </div>
  );
}
