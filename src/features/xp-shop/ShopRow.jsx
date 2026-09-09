import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../../styles/CharacterView.module.css';

export function ConfirmModal({ title = 'Confirm Purchase', children, onConfirm, onCancel, busy = false }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 9999 }}>
      <div className={styles.card} style={{ maxWidth: 520, width: 'min(92vw,520px)' }}>
        <div className={styles.cardHead}><b>{title}</b></div>
        <div className={styles.grid} style={{ gap: 12 }}>{children}</div>
        <div className={styles.rowForm} style={{ justifyContent: 'flex-end' }}>
          <button className={styles.ghostBtn} onClick={onCancel} disabled={busy}>No</button>
          <button className={styles.cta} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : 'Yes'}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ShopRow({ title, subtitle, cost, disabled, hint = '', onBuy, leftIcon, description = '', noConfirm = false, forceExpanded = false, hideDots = false, note = '', badge = null, actionLabel = 'Acquire', compact = false, children }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const displayExpanded = isExpanded || forceExpanded;

  async function handleConfirm() {
    setWorking(true);
    try {
      await onBuy?.();
    } finally {
      setWorking(false);
      setConfirmOpen(false);
    }
  }

  // Attempt to parse the target level from subtitle to render dots
  const match = subtitle?.match(/\d+/);
  const targetLevel = match ? parseInt(match[0], 10) : 0;

  // Clean up title if it contains "(X)" like Blood Potency
  const cleanTitle = title.replace(/\s*\(\d+\)$/, '');

  const dots = !hideDots && (
    <div className={`${styles.shopCardDots} ${compact ? styles.shopCardDotsInline : ''}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`${styles.shopDot} ${i < targetLevel ? styles.shopDotFilled : ''}`}>
          {i < targetLevel - 1 && <span className={styles.shopDotX}>X</span>}
        </div>
      ))}
    </div>
  );

  return (
    <article className={`${styles.shopCard} ${compact ? styles.shopCardCompact : ''} ${displayExpanded ? styles.shopCardExpanded : ''} ${disabled ? styles.shopCardLocked : ''}`}>
      <div className={`${styles.shopCardHeader} ${compact ? styles.shopCardHeaderCompact : ''}`} onClick={() => setIsExpanded(!isExpanded)}>
        <div className={styles.shopCardTitleRow}>
          <div>
            <h2 className={styles.shopCardTitle}>
              {badge != null && <span className={styles.suggestRank}>{badge}</span>}
              {cleanTitle}
            </h2>
            <p className={styles.shopCardSubtitle}>{subtitle}</p>
          </div>
          <span className={`material-symbols-outlined ${styles.expandIcon}`}>expand_more</span>
        </div>

        {/* The "why" line for suggested buys — readable without expanding. */}
        {note && (
          <p className={styles.shopCardNote}>
            <span className={`material-symbols-outlined ${styles.shopCardNoteIcon}`}>lightbulb</span>
            <span>{note}</span>
          </p>
        )}

        {/* Compact cards (the Suggested tab) fold the dots into the footer,
            next to the price, instead of giving them their own row — that
            row was the single biggest source of dead vertical space. */}
        {!compact && dots}

        <div className={`${styles.shopCardFooter} ${compact ? styles.shopCardFooterCompact : ''}`}>
          {compact && dots}
          <span className={styles.shopCardPrice}>{cost} XP</span>
          {/* A row with children has no Acquire button of its own, so the
              hint is the only thing telling the reader to expand it. */}
          {hint && (disabled || children) && <span className={styles.shopCardHint}>{hint}</span>}
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
              {actionLabel}
            </button>
          )}
        </div>
      </div>

      <div className={styles.shopCardContentWrap}>
        <div className={styles.shopCardContentInner}>
          <div className={styles.shopCardContent}>
            {/* The note in the header already says why this row is here, so
                don't repeat a generic "purchase X for Y" underneath it. */}
            {(description || (!note && hint) || (!note && `Purchase ${title} for ${cost} Experience Points.`)) && (
              <p className={styles.shopCardText}>
                {description || hint || `Purchase ${title} for ${cost} Experience Points.`}
              </p>
            )}
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
