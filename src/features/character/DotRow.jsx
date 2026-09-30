import React from 'react';
import styles from '../../styles/DotRow.module.css';

// `cap` is the highest dot actually purchasable right now (e.g. 4 at character
// creation); `max` is how many pips to draw (always 5 on a V5 sheet). Pips
// above `cap` render locked instead of just not existing, so the track always
// reads like a normal dot tracker. Callers that don't pass `cap` keep the old
// behavior exactly (cap defaults to max).
function DotRow({ label, value = 0, max = 5, cap = null, rightExtra = null, onDotClick = null }) {
  const effectiveCap = cap ?? max;

  const tracker = (
    <div className={styles.dotTracker}>
      {Array.from({ length: max }).map((_, i) => {
        const dotNum = i + 1;
        const locked = dotNum > effectiveCap;
        const clickable = Boolean(onDotClick && !locked);
        const isFilled = i < value;

        return (
          <div
            key={i}
            className={`${styles.dot} ${isFilled ? styles.filled : ''} ${clickable ? styles.clickable : ''}`}
            onClick={clickable ? () => onDotClick(dotNum) : undefined}
            onKeyDown={clickable ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onDotClick(dotNum);
              }
            } : undefined}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={clickable ? `${label ? label + ': ' : ''}dot ${dotNum}` : undefined}
            style={{ opacity: locked ? 0.28 : 1 }}
            title={locked ? 'Not available at character creation' : undefined}
          />
        );
      })}
    </div>
  );

  if (!label && !rightExtra) {
    return tracker;
  }

  return (
    <div className={styles.dotRow}>
      <div className={styles.labelGroup}>
        {label && <span className={styles.label}>{label}</span>}
        {rightExtra}
      </div>
      {tracker}
    </div>
  );
}

export default DotRow;