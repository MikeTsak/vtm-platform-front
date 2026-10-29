// src/features/feeding/FeedingGate.jsx
//
// Gates the downtime actions behind this cycle's first feeding. Pass-through
// when the system is disabled or the character has fed; otherwise a pop-up
// sends the player to hunt (/feeding, FeedingPage.jsx) and `children` stay
// locked. The server enforces the same rule (checkSubmission's 'not_fed').
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from 'boneyard-js/react';
import api from '../../core/api';
import styles from '../../styles/Feeding.module.css';
import FaGlyph from '../../ui/FaGlyph';
import { FEEDING_ICONS } from '../../data/feedingIcons';

function GoHunt({ status, onClose }) {
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="go-hunt-title" onClick={onClose}>
      <div className={`${styles.gate} ${styles.modal}`} onClick={(e) => e.stopPropagation()}>
        <h2 id="go-hunt-title" className={styles.title}>
          <span className={styles.iconBadge}><FaGlyph icon={FEEDING_ICONS.droplet} size={15} /></span>
          You have not fed this cycle
        </h2>
        <p className={styles.subtitle}>
          Your downtime actions unlock after your first feeding of {status.cycleTitle || 'this cycle'}.
          Hunt (up to {status.huntsMax} times), feed on your Herd, or spend one action on a safe feeding.
        </p>
        <div className={styles.actions}>
          <Link to="/feeding" className={styles.btnPrimary}>
            <FaGlyph icon={FEEDING_ICONS.arrowRight} size={14} />
            Go hunt
          </Link>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Not now</button>
        </div>
      </div>
    </div>
  );
}

function FeedingGateInner({ status, children }) {
  const [open, setOpen] = useState(true);
  if (!status) return null;
  if (status.enabled === false || status.noCharacter || status.fed) return <>{children}</>;

  return (
    <>
      <div className={`${styles.fedBanner} ${styles.warnBanner}`}>
        <div className={styles.fedBannerLeft}>
          <span className={`${styles.iconBadge} ${styles.iconBadgeSm}`}><FaGlyph icon={FEEDING_ICONS.triangleExclamation} size={15} /></span>
          <span>Feed this cycle to unlock your downtime actions.</span>
        </div>
        <Link to="/feeding" className={styles.btnGhost}>Go hunt</Link>
      </div>
      {open && status.huntingOpen && createPortal(<GoHunt status={status} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

export default function FeedingGate({ children }) {
  const { data: status, isLoading } = useQuery({
    queryKey: ['feeding', 'status'],
    queryFn: async () => (await api.get('/feeding/status')).data,
  });

  return (
    <Skeleton loading={isLoading} name="feeding-gate">
      <FeedingGateInner status={status}>{children}</FeedingGateInner>
    </Skeleton>
  );
}
