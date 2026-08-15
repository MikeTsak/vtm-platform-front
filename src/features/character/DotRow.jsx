import React from 'react';
import styles from '../../styles/CharacterView.module.css';

// `cap` is the highest dot actually purchasable right now (e.g. 4 at character
// creation); `max` is how many pips to draw (always 5 on a V5 sheet). Pips
// above `cap` render locked instead of just not existing, so the track always
// reads like a normal dot tracker. Callers that don't pass `cap` keep the old
// behavior exactly (cap defaults to max).
function DotRow({ label, value = 0, max = 5, cap = null, rightExtra = null, onDotClick = null }) {
  const effectiveCap = cap ?? max;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--text-muted)' }}>{label}</span>
        {rightExtra}
      </div>
      <div className={styles.dotTracker}>
        {Array.from({ length: max }).map((_, i) => {
          const dotNum = i + 1;
          const locked = dotNum > effectiveCap;
          const clickable = onDotClick && !locked;
          return (
            <div
              key={i}
              className={`${styles.dot} ${i < value ? styles.filled : ''}`}
              onClick={clickable ? () => onDotClick(dotNum) : undefined}
              style={{ cursor: clickable ? 'pointer' : 'default', opacity: locked ? 0.28 : 1 }}
              title={locked ? 'Not available at character creation' : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

export default DotRow;