// What happens after a code is scanned, on the receiving side:
//   preview ("Anna wants to pass you 3 x Bullets. Accept?")
//   -> accept -> a pass waits for the giver to confirm (polling)
//   -> the seal animation.
// A world item or a Storyteller take-back lands straight after accept.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api, { formatApiError } from '../../core/api';
import modal from '../../styles/InventoryItemModal.module.css';
import styles from '../../styles/Inventory.module.css';
import TransferConfirmed from './TransferConfirmed';
import { itemIcon } from './itemMeta';

const POLL_MS = 2000;
const qtyName = (item) => `${item?.quantity > 1 ? `${item.quantity} × ` : ''}${item?.name || 'this item'}`;

function question(p, asStoryteller) {
  const what = qtyName(p.item);
  if (p.kind === 'transfer') {
    return asStoryteller
      ? { text: `${p.from_name || 'A player'} is handing ${what} back to the Storyteller.`, yes: 'Accept' }
      : { text: `${p.from_name || 'Another player'} wants to pass you ${what}.`, yes: 'Accept' };
  }
  if (p.kind === 'takeback') return { text: `Take ${what} back from ${p.from_name || 'its holder'}?`, yes: 'Take it back' };
  return { text: `Take ${what}?`, yes: 'Take it' };
}

function doneSubtitle(kind, fromName, asStoryteller) {
  if (kind === 'takeback') return fromName ? `Taken back from ${fromName}` : 'Back with the Storyteller';
  if (kind === 'world') return 'Added to your inventory';
  if (asStoryteller) return fromName ? `Returned by ${fromName}` : 'Back with the Storyteller';
  return fromName ? `Received from ${fromName}` : 'Received';
}

export default function ReceiveFlow({ code, asStoryteller = false, onClose, onDone, onRetry }) {
  const [step, setStep] = useState('loading'); // loading | preview | claiming | waiting | done | error
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const pending = useRef(null); // token while we wait on the giver
  const asked = useRef(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (asked.current === code) return; // StrictMode double effect
    asked.current = code;
    api.post('/inventory/preview', { code, as_storyteller: asStoryteller })
      .then(({ data }) => { setPreview(data); setStep('preview'); })
      .catch((e) => { setError(formatApiError(e, 'Could not read that code.')); setStep('error'); });
  }, [code, asStoryteller]);

  const accept = async () => {
    setStep('claiming');
    try {
      const { data } = await api.post('/inventory/claim', { code, as_storyteller: asStoryteller });
      if (data.kind === 'pending') {
        pending.current = data.token;
        setStep('waiting');
      } else {
        setResult(data);
        setStep('done');
      }
    } catch (e) {
      setError(formatApiError(e, 'Could not get that item.'));
      setStep('error');
    }
  };

  // Waiting on the giver's "yes".
  useEffect(() => {
    if (step !== 'waiting') return undefined;
    const id = setInterval(async () => {
      try {
        const { data } = await api.get(`/inventory/transfers/${pending.current}`);
        if (data.status === 'claimed') {
          pending.current = null;
          setResult({ kind: 'transfer', from_name: data.from_name, item: preview?.item });
          setStep('done');
        } else if (data.status === 'cancelled' || data.status === 'expired') {
          pending.current = null;
          setError(data.status === 'expired'
            ? `${data.from_name || 'The giver'} did not confirm in time. Ask them for a new code.`
            : `${data.from_name || 'The giver'} cancelled the hand-over.`);
          setStep('error');
        }
      } catch (e) {
        if (e.response?.status === 404) {
          pending.current = null;
          setError('The hand-over was cancelled.');
          setStep('error');
        }
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [step, preview]);

  // Leaving while the giver still has to answer withdraws us.
  const close = () => {
    if (pending.current) api.delete(`/inventory/transfers/${pending.current}`).catch(() => {});
    pending.current = null;
    onClose();
  };
  useEffect(() => () => {
    if (pending.current) api.delete(`/inventory/transfers/${pending.current}`).catch(() => {});
  }, []);

  if (step === 'done') {
    return (
      <TransferConfirmed
        item={result.item}
        title={result.kind === 'takeback' || asStoryteller ? 'Item returned' : 'Transaction confirmed'}
        subtitle={doneSubtitle(result.kind, result.from_name, asStoryteller)}
        onDone={() => onDone?.(result)}
        doneLabel={onDone ? 'Done' : 'Close'}
      />
    );
  }

  const item = preview?.item;
  const q = preview && question(preview, asStoryteller);

  return createPortal(
    <div className={`${modal.modalOverlay} ${styles.sheetOverlay}`} role="dialog" aria-modal="true" aria-label="Receive item">
      <div className={`${modal.card} ${modal.modalCard} ${styles.sheetCard}`}>
        <div className={`${modal.modalHeader} ${styles.sheetHeader}`}>
          <h3 className={modal.modalTitle}>{step === 'waiting' ? 'Waiting for confirmation' : step === 'error' ? 'Could not get item' : 'Receive item'}</h3>
          <button type="button" className={styles.iconBtn} onClick={close} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className={modal.modalBody}>
          {step === 'loading' && <p className={styles.scanHint}>Reading the code…</p>}

          {item && step !== 'error' && (
            <div className={styles.receiveItem}>
              <div className={styles.itemIcon}>
                {item.image && !broken
                  ? <img src={item.image} alt="" onError={() => setBroken(true)} />
                  : <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{itemIcon(item.item_type)}</span>}
              </div>
              <div className={styles.itemCardText}>
                <strong>{qtyName(item)}</strong>
                <span className={styles.itemCardSubText}>{item.item_type || 'Item'}</span>
              </div>
            </div>
          )}
          {item?.description && (step === 'preview' || step === 'claiming') && (
            <p className={styles.scanHint}>{item.description}</p>
          )}

          {(step === 'preview' || step === 'claiming') && <p className={styles.receiveQuestion}>{q.text}</p>}

          {step === 'waiting' && (
            <p className={styles.passTimer} aria-live="polite">
              <span className="material-symbols-outlined">hourglass_top</span>
              Waiting for {preview?.from_name || 'the giver'} to confirm on their phone…
            </p>
          )}

          {step === 'error' && <div className={styles.errorBox} role="alert">{error}</div>}
        </div>

        <div className={modal.modalFooter}>
          <button type="button" className={modal.ghostBtn} onClick={close}>
            {step === 'waiting' ? 'Cancel' : step === 'error' ? 'Close' : 'Not now'}
          </button>
          {(step === 'preview' || step === 'claiming') && (
            <button type="button" className={modal.cta} onClick={accept} disabled={step === 'claiming'}>{q.yes}</button>
          )}
          {step === 'error' && onRetry && <button type="button" className={modal.cta} onClick={onRetry}>Scan again</button>}
        </div>
      </div>
    </div>,
    document.body
  );
}
