import React from 'react';
import styles from '../../styles/CharacterView.module.css';

// Reusable admin confirmation for "change parameter type" actions: replacing
// one owned power/merit/ritual with a different one. Always shows exactly
// what is being removed and what is being added before anything is applied,
// so an admin never swaps something on a live character sheet blind.
export default function SwapConfirmModal({ kind, oldItem, newItem, xpImpact = 0, busy = false, picker = null, onConfirm, onCancel }) {
  return (
    <div className={styles.modalOverlay} role="dialog">
      <div className={`${styles.card} ${styles.modalCard}`} style={{ width: 'min(92vw, 520px)', background: 'var(--surface-container)' }}>
        <div className={styles.modalHeader} style={{ borderBottom: '1px solid var(--border-color)', padding: '16px' }}>
          <h3 className={styles.modalTitle} style={{ margin: 0, fontFamily: 'var(--font-title)', fontSize: '22px' }}>
            {kind} Swap
          </h3>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {picker}
          <div style={{ border: '1px solid var(--error)', borderLeft: '4px solid var(--error)', padding: '12px', borderRadius: '4px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--error)', fontWeight: 600, marginBottom: '4px' }}>Removing</div>
            <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>{oldItem?.name || '—'}</div>
            {oldItem?.description && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{oldItem.description}</div>}
          </div>
          <div style={{ border: '1px solid var(--tint)', borderLeft: '4px solid var(--tint)', padding: '12px', borderRadius: '4px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--tint)', fontWeight: 600, marginBottom: '4px' }}>Adding</div>
            <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>{newItem?.name || '—'}</div>
            {newItem?.description && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{newItem.description}</div>}
          </div>
          {xpImpact !== 0 && (
            <div style={{ fontSize: '13px', color: xpImpact > 0 ? 'var(--error)' : 'var(--tint)' }}>
              {xpImpact > 0 ? `This will spend ${xpImpact} XP.` : `This will refund ${Math.abs(xpImpact)} XP.`}
            </div>
          )}
        </div>
        <div className={styles.modalFooter} style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className={styles.ghostBtn} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={styles.cta} onClick={onConfirm} disabled={busy || !newItem}>{busy ? 'Applying...' : 'Confirm Swap'}</button>
        </div>
      </div>
    </div>
  );
}
