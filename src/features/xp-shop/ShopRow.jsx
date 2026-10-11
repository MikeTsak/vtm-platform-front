import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../../styles/CharacterView.module.css';

export function ConfirmModal({ title = 'Confirm Purchase', children, onConfirm, onCancel, busy = false, confirmDisabled = false, confirmLabel = 'Yes', cancelLabel = 'No' }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 16 }}>
      {/* .card is transparent on the page; a dialog needs its own surface, and must scroll on a short phone screen. */}
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          maxWidth: 520, width: '100%', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto',
          background: 'var(--surface-color, #141417)', border: '1px solid var(--border-color)', borderRadius: 12,
        }}
      >
        <div className={styles.cardHead}><b>{title}</b></div>
        <div className={styles.grid} style={{ gap: 12 }}>{children}</div>
        <div className={styles.rowForm} style={{ justifyContent: 'flex-end' }}>
          <button className={styles.ghostBtn} onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button className={styles.cta} onClick={onConfirm} disabled={busy || confirmDisabled}>{busy ? 'Working…' : confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ShopRow({ title, subtitle, cost, disabled, hint = '', onBuy, leftIcon, description = '', forceExpanded = false, hideDots = false, note = '', badge = null, tag = null, actionLabel = 'Acquire', compact = false, owned, children }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayExpanded = isExpanded || forceExpanded;

  // Attempt to parse the target level from subtitle to render dots
  const match = subtitle?.match(/\d+/);
  const targetLevel = match ? parseInt(match[0], 10) : 0;
  // Rows whose subtitle carries no "next level" (maxed, locked, requested)
  // pass `owned` so already-bought dots still render.
  const ownedDots = owned ?? Math.max(targetLevel - 1, 0);
  const filledDots = Math.max(targetLevel, ownedDots);

  // Clean up title if it contains "(X)" like Blood Potency
  const cleanTitle = title.replace(/\s*\(\d+\)$/, '');

  const dots = !hideDots && (
    <div className={`${styles.shopCardDots} ${compact ? styles.shopCardDotsInline : ''}`}>
      {Array.from({ length: Math.max(5, filledDots) }).map((_, i) => (
        <div key={i} className={`${styles.shopDot} ${i < filledDots ? styles.shopDotFilled : ''}`}>
          {i < ownedDots && <span className={styles.shopDotX}>X</span>}
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
              {tag != null && <span className={styles.suggestTag}>{tag}</span>}
            </h2>
            <p className={styles.shopCardSubtitle}>{subtitle}</p>
          </div>
          <span className={`material-symbols-outlined ${styles.expandIcon}`}>expand_more</span>
        </div>

        {/* The "why" line for suggested buys: readable without expanding. */}
        {note && (
          <p className={styles.shopCardNote}>
            <span className={`material-symbols-outlined ${styles.shopCardNoteIcon}`}>lightbulb</span>
            <span>{note}</span>
          </p>
        )}

        {/* Compact cards (the Suggested tab) fold the dots into the footer,
            next to the price, instead of giving them their own row: that
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
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                // Purchases confirm in CharacterView's PurchasePrompt, which also shows any error.
                Promise.resolve(onBuy?.()).catch(() => {});
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

    </article>
  );
}
