// Pass item: the holder picks how many and whether their notes go along, then
// shows a short-lived QR. The other player scans it; this screen polls until
// the hand-over lands and then plays the confirmation.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api, { formatApiError } from '../../core/api';
import modal from '../../styles/InventoryItemModal.module.css';
import styles from '../../styles/Inventory.module.css';
import ItemQr, { itemClaimUrl } from './itemQr';
import TransferConfirmed from './TransferConfirmed';

const POLL_MS = 2000;

export default function PassItemModal({ item, onClose, onPassed }) {
  const max = Math.max(1, item.quantity || 1);
  const [qty, setQty] = useState(1);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [transfer, setTransfer] = useState(null); // { token, ttl_seconds, startedAt }
  const [status, setStatus] = useState('setup'); // setup | open | expired | cancelled | claimed
  const [toName, setToName] = useState(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const openToken = useRef(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post('/inventory/transfers', { item_id: item.id, quantity: qty, include_notes: includeNotes });
      openToken.current = data.token;
      setTransfer({ ...data, startedAt: Date.now() });
      setStatus('open');
    } catch (e) {
      setError(formatApiError(e, 'Could not start the hand-over.'));
    } finally {
      setBusy(false);
    }
  };

  // Poll while the QR is up and while we are asked to confirm (the receiver
  // can back out, or the wait can time out).
  useEffect(() => {
    if ((status !== 'open' && status !== 'pending') || !transfer) return undefined;
    const tick = () => setLeft(Math.max(0, Math.round(transfer.ttl_seconds - (Date.now() - transfer.startedAt) / 1000)));
    tick();
    const clock = setInterval(tick, 1000);
    const poll = setInterval(async () => {
      try {
        const { data } = await api.get(`/inventory/transfers/${transfer.token}`);
        if (data.status === status) return;
        if (data.status !== 'pending') openToken.current = null;
        setToName(data.to_name);
        setStatus(data.status);
      } catch (e) {
        if (e.response?.status === 404) { openToken.current = null; setStatus('cancelled'); } // item deleted
      }
    }, POLL_MS);
    return () => { clearInterval(clock); clearInterval(poll); };
  }, [status, transfer]);

  // The giver's answer to "Pass it to <name>?".
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post(`/inventory/transfers/${transfer.token}/confirm`);
      openToken.current = null;
      setToName(data.to_name);
      setStatus('claimed');
    } catch (e) {
      setError(formatApiError(e, 'The hand-over failed.'));
    } finally {
      setBusy(false);
    }
  };
  const notThem = async () => {
    openToken.current = null;
    await api.delete(`/inventory/transfers/${transfer.token}`).catch(() => {});
    setStatus('cancelled');
  };

  // Closing with a live QR cancels it, so a screenshot of it can't be redeemed later.
  useEffect(() => () => {
    if (openToken.current) api.delete(`/inventory/transfers/${openToken.current}`).catch(() => {});
  }, []);

  if (status === 'claimed') {
    return (
      <TransferConfirmed
        item={{ ...item, quantity: transfer?.quantity }}
        subtitle={toName ? `Passed to ${toName}` : 'Handed over'}
        onDone={() => { onPassed?.(); onClose(); }}
      />
    );
  }

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');

  return createPortal(
    <div className={`${modal.modalOverlay} ${styles.sheetOverlay}`} role="dialog" aria-modal="true" aria-label="Pass item">
      <div className={`${modal.card} ${modal.modalCard} ${styles.sheetCard}`}>
        <div className={`${modal.modalHeader} ${styles.sheetHeader}`}>
          <h3 className={modal.modalTitle}>Pass {item.name}</h3>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className={modal.modalBody}>
          {status === 'setup' && (
            <>
              {max > 1 && (
                <div className={modal.formGroup}>
                  <span className={modal.label}>How many? (you have {max})</span>
                  <div className={styles.stepper}>
                    <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Fewer">
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <input
                      type="number" inputMode="numeric" min={1} max={max} value={qty}
                      onChange={(e) => setQty(Math.min(max, Math.max(1, Number(e.target.value) || 1)))}
                      aria-label="Quantity to pass"
                    />
                    <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max} aria-label="More">
                      <span className="material-symbols-outlined">add</span>
                    </button>
                    <button type="button" className={styles.stepperAll} onClick={() => setQty(max)} disabled={qty === max}>All</button>
                  </div>
                </div>
              )}
              {item.player_notes && (
                <label className={modal.checkboxGroup}>
                  <input type="checkbox" className={modal.checkboxInput} checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} />
                  <span className={modal.checkboxLabel}>Pass my notes along with it</span>
                </label>
              )}
              <p className={styles.scanHint}>
                A QR code appears next. The other player taps <strong>Get item</strong> on their sheet and scans it.
              </p>
              {error && <div className={styles.errorBox} role="alert">{error}</div>}
            </>
          )}

          {status === 'open' && transfer && (
            <div className={styles.passQr}>
              <ItemQr value={itemClaimUrl(transfer.token)} size={260} className={styles.qrImage} />
              <p className={styles.passCount}>{transfer.quantity > 1 ? `${transfer.quantity} × ` : ''}{item.name}</p>
              <p className={styles.passTimer} aria-live="polite">
                <span className="material-symbols-outlined">timer</span> Waiting for the other player… {mm}:{ss}
              </p>
            </div>
          )}

          {status === 'pending' && (
            <>
              <p className={styles.receiveQuestion}>
                Pass {transfer.quantity > 1 ? `${transfer.quantity} × ` : ''}{item.name} to <strong>{toName || 'this player'}</strong>?
              </p>
              <p className={styles.scanHint}>
                {toName || 'Someone'} just scanned your code. Check it is the right person before you confirm: once passed, only they or the Storyteller can give it back.
              </p>
              {error && <div className={styles.errorBox} role="alert">{error}</div>}
            </>
          )}

          {(status === 'expired' || status === 'cancelled') && (
            <div className={styles.errorBox} role="alert">
              The hand-over {status === 'expired' ? 'timed out' : 'was cancelled'}. Nothing moved: the item is still yours.
            </div>
          )}
        </div>

        <div className={modal.modalFooter}>
          {status === 'pending' ? (
            <>
              <button type="button" className={modal.ghostBtn} onClick={notThem} disabled={busy}>Not them</button>
              <button type="button" className={modal.cta} onClick={confirm} disabled={busy}>Yes, pass it</button>
            </>
          ) : (
            <button type="button" className={modal.ghostBtn} onClick={onClose}>{status === 'open' ? 'Cancel' : 'Close'}</button>
          )}
          {status === 'setup' && <button type="button" className={modal.cta} onClick={start} disabled={busy}>Show QR code</button>}
          {(status === 'expired' || status === 'cancelled') && (
            <button type="button" className={modal.cta} onClick={() => { setStatus('setup'); setTransfer(null); }}>New code</button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
