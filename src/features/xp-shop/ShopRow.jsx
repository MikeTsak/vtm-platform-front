import React, { useState } from 'react';
import styles from '../../styles/CharacterView.module.css';

export function ConfirmModal({ title = 'Confirm Purchase', children, onConfirm, onCancel, busy = false }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <div className={styles.card} style={{ maxWidth: 520, width: 'min(92vw,520px)' }}>
        <div className={styles.cardHead}><b>{title}</b></div>
        <div className={styles.grid} style={{ gap: 12 }}>{children}</div>
        <div className={styles.rowForm} style={{ justifyContent: 'flex-end' }}>
          <button className={styles.ghostBtn} onClick={onCancel} disabled={busy}>No</button>
          <button className={styles.cta} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : 'Yes'}</button>
        </div>
      </div>
    </div>
  );
}

export function ShopRow({ title, subtitle, cost, disabled, hint = '', onBuy, leftIcon, description = '', noConfirm = false, forceExpanded = false, hideDots = false, children }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const displayExpanded = isExpanded || forceExpanded;

  async function handleConfirm() {
    setWorking(true);
    try {
      await onBuy?.();
      setConfirmOpen(false);
    } finally {
      setWorking(false);
    }
  }

  // Attempt to parse the target level from subtitle to render dots
  const match = subtitle?.match(/\d+/);
  const targetLevel = match ? parseInt(match[0], 10) : 0;

  // Clean up title if it contains "(X)" like Blood Potency
  const cleanTitle = title.replace(/\s*\(\d+\)$/, '');

  return (
    <article className={`${styles.shopCard} ${displayExpanded ? styles.shopCardExpanded : ''} ${disabled ? styles.shopCardLocked : ''}`}>
      <div className={styles.shopCardHeader} onClick={() => setIsExpanded(!isExpanded)}>
        <div className={styles.shopCardTitleRow}>
          <div>
            <h2 className={styles.shopCardTitle}>{cleanTitle}</h2>
            <p className={styles.shopCardSubtitle}>{subtitle}</p>
          </div>
          <span className={`material-symbols-outlined ${styles.expandIcon}`}>expand_more</span>
        </div>

        {!hideDots && (
          <div className={styles.shopCardDots}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`${styles.shopDot} ${i < targetLevel ? styles.shopDotFilled : ''}`}>
                {i < targetLevel - 1 && <span className={styles.shopDotX}>X</span>}
              </div>
            ))}
          </div>
        )}

        <div className={styles.shopCardFooter}>
          <span className={styles.shopCardPrice}>{cost} XP</span>
          {!children && (
            <button
              className={styles.shopCardAcquireBtn}
              disabled={disabled || working}
              onClick={(e) => {
                e.stopPropagation();
                if (noConfirm) {
                  onBuy?.();
                } else {
                  setConfirmOpen(true);
                }
              }}
            >
              Acquire
            </button>
          )}
        </div>
      </div>

      <div className={styles.shopCardContentWrap}>
        <div className={styles.shopCardContentInner}>
          <div className={styles.shopCardContent}>
            <p className={styles.shopCardText}>
              {description || hint || `Purchase ${title} for ${cost} Experience Points.`}
            </p>
            {children}
          </div>
        </div>
      </div>

      {confirmOpen && (
        <ConfirmModal
          title="Confirm Purchase"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
          busy={working}
        >
          <p>
            Are you sure you want to buy <b>{title}</b>
            {subtitle ? <> — {subtitle}</> : null} for <b>{cost}</b> XP?
          </p>
        </ConfirmModal>
      )}
    </article>
  );
}
