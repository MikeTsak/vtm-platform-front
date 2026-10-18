// The "transaction confirmed" moment, shown to both sides of a pass and to a
// player claiming a world item: a wax-seal ring draws itself, the seal fills,
// a check is struck through it and the item rises in.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import styles from '../../styles/Inventory.module.css';
import { itemIcon } from './itemMeta';

export default function TransferConfirmed({ item, title = 'Transaction confirmed', subtitle, onDone, doneLabel = 'Done' }) {
  const reduce = useReducedMotion();
  const [broken, setBroken] = useState(false);
  const d = (s) => (reduce ? 0 : s);

  useEffect(() => { navigator.vibrate?.([30, 60, 90]); }, []);

  return createPortal(
    <motion.div
      className={styles.confirmOverlay}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: d(0.25) }}
    >
      <div className={styles.confirmStage}>
        <motion.div
          className={styles.confirmItem}
          initial={{ opacity: 0, y: 30, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: d(0.9), type: 'spring', stiffness: 220, damping: 16 }}
        >
          {item?.image && !broken
            ? <img src={item.image} alt="" onError={() => setBroken(true)} />
            : <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{itemIcon(item?.item_type)}</span>}
        </motion.div>

        <div className={styles.sealWrap}>
          <svg className={styles.confirmSeal} viewBox="0 0 120 120" aria-hidden="true">
            <motion.circle
              cx="60" cy="60" r="54" className={styles.sealRing}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: d(0.6), ease: 'easeInOut' }}
            />
            <motion.circle
              cx="60" cy="60" r="44" className={styles.sealFill}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{ transformOrigin: '60px 60px' }}
              transition={{ delay: d(0.5), type: 'spring', stiffness: 260, damping: 14 }}
            />
            <motion.path
              d="M40 62 L54 76 L82 46" className={styles.sealCheck}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: d(0.75), duration: d(0.35), ease: 'easeOut' }}
            />
          </svg>
          {!reduce && (
            <motion.span
              className={styles.sealPulse}
              initial={{ scale: 0.6, opacity: 0.7 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ delay: 0.75, duration: 0.9, ease: 'easeOut' }}
              aria-hidden="true"
            />
          )}
        </div>

        <motion.div
          className={styles.confirmText}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: d(1.05), duration: d(0.35) }}
        >
          <h2>{title}</h2>
          {item?.name && <p className={styles.confirmName}>{item.quantity > 1 ? `${item.quantity} × ` : ''}{item.name}</p>}
          {subtitle && <p className={styles.confirmSub}>{subtitle}</p>}
          <button type="button" className={styles.confirmBtn} onClick={onDone} autoFocus>{doneLabel}</button>
        </motion.div>
      </div>
    </motion.div>,
    document.body
  );
}
