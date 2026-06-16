import React from 'react';
import styles from '../styles/CharacterView.module.css';

function DotRow({ label, value = 0, max = 5, rightExtra = null }) {
  return (
    <div className={styles.dotRow}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{label}</span>
        {rightExtra}
      </div>
      <div className={styles.dots}>
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={`${styles.dot} ${i < value ? styles.dotOn : ''}`} />
        ))}
      </div>
    </div>
  );
}

export default DotRow;