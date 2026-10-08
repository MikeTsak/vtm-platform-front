import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import ClanSymbol from '../../components/ClanSymbol';
import { factionLogo } from '../../data/factions';
import styles from '../../styles/court/ElysiumInvitation.module.css';
import { DEFAULT_TEXT, resolveDesign, surfaceBackground, personalize, formatElysiumDate } from './elysiumPresets';

/* ── Ornament artwork (stroke = currentColor, coloured by the accent) ── */

const CORNERS = {
  nouveau: (
    <>
      <path d="M4 100 V34 C4 16 16 4 34 4 H100" />
      <path d="M13 100 V40 C13 24 24 13 40 13 H100" opacity="0.55" />
      <path d="M34 4 C34 22 22 34 4 34" opacity="0.8" />
      <path d="M24 24 C34 30 40 40 38 52 C36 62 26 62 26 54 C26 48 32 46 35 50" />
      <path d="M24 24 C30 34 40 40 52 38 C62 36 62 26 54 26 C48 26 46 32 50 35" />
      <circle cx="21" cy="21" r="3" fill="currentColor" stroke="none" />
    </>
  ),
  roses: (
    <>
      <path d="M4 100 V40 C4 20 20 4 40 4 H100" opacity="0.7" />
      <path d="M40 4 C46 12 52 14 62 12 M4 40 C12 46 14 52 12 62" opacity="0.7" />
      <g transform="translate(24 24)">
        <circle r="13" opacity="0.35" />
        <path d="M0 0 C4 -2 6 2 3 5 C-1 8 -7 4 -6 -1 C-5 -8 4 -10 8 -4 C12 3 6 11 -2 11 C-10 11 -14 2 -11 -5" />
      </g>
      <path d="M36 32 Q50 30 56 40 Q44 42 36 32 Z" fill="currentColor" stroke="none" opacity="0.55" />
      <path d="M32 36 Q30 50 40 56 Q42 44 32 36 Z" fill="currentColor" stroke="none" opacity="0.55" />
    </>
  ),
  baroque: (
    <>
      <path d="M4 100 V4 H100" />
      <path d="M12 100 V12 H100" opacity="0.6" />
      <path d="M12 44 C26 44 30 30 22 24 C16 20 10 26 14 30" />
      <path d="M44 12 C44 26 30 30 24 22 C20 16 26 10 30 14" />
      <rect x="1" y="1" width="6" height="6" fill="currentColor" stroke="none" />
    </>
  ),
};

function Corner({ kind, pos }) {
  const art = CORNERS[kind];
  if (!art) return null;
  return (
    <svg className={`${styles.corner} ${styles[pos]}`} viewBox="0 0 104 104" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      {art}
    </svg>
  );
}

function Divider({ kind }) {
  return (
    <svg className={styles.divider} viewBox="0 0 240 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
      <path d="M8 12 H92" opacity="0.7" />
      <path d="M148 12 H232" opacity="0.7" />
      {kind === 'roses' ? (
        <g transform="translate(120 12)">
          <path d="M0 0 C3 -1.5 4.5 1.5 2.2 3.7 C-0.8 6 -5.2 3 -4.5 -0.7 C-3.7 -6 3 -7.5 6 -3 C9 2.2 4.5 8.2 -1.5 8.2 C-7.5 8.2 -10.5 1.5 -8.2 -3.7" />
          <path d="M12 2 Q20 -4 26 2 Q18 6 12 2 Z M-12 2 Q-20 -4 -26 2 Q-18 6 -12 2 Z" fill="currentColor" stroke="none" opacity="0.6" />
        </g>
      ) : (
        <>
          <path d="M120 3 L129 12 L120 21 L111 12 Z" fill="currentColor" stroke="none" />
          <path d="M92 12 C100 4 106 6 108 12 M148 12 C140 4 134 6 132 12" />
          <circle cx="100" cy="16" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="140" cy="16" r="1.4" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

function Seal({ kind, accent, broken }) {
  if (kind === 'none') return null;
  let mark;
  if (kind === 'toreador') mark = <ClanSymbol clan="Toreador" size={34} color={accent.b} alt="" />;
  else if (kind === 'camarilla') mark = <img src={factionLogo('Camarilla')} alt="" className={styles.sealImg} />;
  else mark = (
    <svg viewBox="-12 -12 24 24" width="30" height="30" fill="none" stroke={accent.b} strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
      <path d="M0 0 C3 -1.5 4.5 1.5 2.2 3.7 C-0.8 6 -5.2 3 -4.5 -0.7 C-3.7 -6 3 -7.5 6 -3 C9 2.2 4.5 8.2 -1.5 8.2 C-7.5 8.2 -10.5 1.5 -8.2 -3.7" />
    </svg>
  );
  return (
    <div className={`${styles.seal} ${broken ? styles.sealBroken : ''}`} aria-hidden="true">
      <span className={styles.sealMark}>{mark}</span>
    </div>
  );
}

/**
 * The invitation card. `invitation` holds the Keeper's text + design; `guest`
 * is the reader's character ({name, clan}) for the {name}/{clan} tokens.
 */
export function InvitationCard({ invitation, eventDate, guest, barred = false }) {
  const inv = invitation || {};
  const design = resolveDesign(inv.design);
  const { card, accentDef: accent, fontDef, ornament, seal } = design;
  // The Keeper's words as saved; a cleared line stays cleared. Only the title falls back.
  const text = (k) => inv[k] || (k === 'name' ? DEFAULT_TEXT.name : '');
  const when = formatElysiumDate(eventDate);

  const vars = {
    '--ink': barred ? '#e6dcd8' : card.ink,
    '--muted': barred ? 'rgba(230,220,216,0.65)' : card.muted,
    '--acc-a': accent.a, '--acc-b': accent.b, '--acc-c': accent.c,
    '--display': fontDef.family,
    background: barred ? 'radial-gradient(ellipse at 50% 30%, #2a1418, #070405 75%)' : surfaceBackground(card, design.cardImage),
  };

  return (
    <article className={`${styles.card} ${card.light && !barred ? styles.light : ''}`} style={vars}>
      <div className={styles.frame} />
      {!barred && ['tl', 'tr', 'bl', 'br'].map(p => <Corner key={p} kind={ornament} pos={p} />)}

      <div className={styles.inner}>
        {barred ? (
          <>
            <p className={styles.eyebrow}>Elysium</p>
            <h2 className={styles.title}>The doors are closed to you</h2>
            <Divider kind="minimal" />
            <p className={styles.body}>
              {personalize('{name}, the Keeper of Elysium has not extended you an invitation to this gathering. Do not seek entry.', guest)}
            </p>
            <p className={styles.date}>{when.day}</p>
            <Seal kind={seal === 'none' ? 'rose' : seal} accent={accent} broken />
          </>
        ) : (
          <>
            <p className={styles.eyebrow}>An Invitation to Elysium</p>
            <p className={styles.salutation}>{personalize(text('salutation'), guest)}</p>
            <h2 className={styles.title}>{text('name')}</h2>
            <Divider kind={ornament} />
            <p className={styles.date}>{when.day}</p>
            {when.time && <p className={styles.time}>at {when.time}</p>}
            {text('location') && <p className={styles.location}>{text('location')}</p>}
            <div className={styles.body}>
              {personalize(text('body'), guest).split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
            </div>
            {text('dress_code') && (
              <p className={styles.dress}><span>Attire</span>{text('dress_code')}</p>
            )}
            <p className={styles.signature}>{text('signature')}</p>
            <Seal kind={seal} accent={accent} />
          </>
        )}
      </div>
    </article>
  );
}

/** Full-screen presentation: the card unfolds out of the dark. */
export default function ElysiumInvitationModal({ open, onClose, ...cardProps }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          role="dialog" aria-modal="true" aria-label="Elysium invitation"
        >
          <motion.div
            className={styles.stage}
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, rotateX: -62, y: 60, scale: 0.88 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, rotateX: 0, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 0.9 }}
          >
            <InvitationCard {...cardProps} />
            <button type="button" className={styles.closeBtn} onClick={onClose}>
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
