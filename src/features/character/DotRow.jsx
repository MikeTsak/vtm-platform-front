import React from 'react';
import styles from '../../styles/CharacterView.module.css';

function DotRow({ label, value = 0, max = 5, rightExtra = null, onDotClick = null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--text-muted)' }}>{label}</span>
        {rightExtra}
      </div>
      <div className={styles.dotTracker}>
        {Array.from({ length: max }).map((_, i) => (
          <div 
            key={i} 
            className={`${styles.dot} ${i < value ? styles.filled : ''}`}
            onClick={onDotClick ? () => onDotClick(i + 1) : undefined}
            style={{ cursor: onDotClick ? 'pointer' : 'default' }}
          />
        ))}
      </div>
    </div>
  );
}

export default DotRow;