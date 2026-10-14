// src/features/comms/drafts/DraftsDrawer.jsx
//
// The drawer of drafts that hangs from the top of a conversation (SchreckNet
// chat, a Surface Web thread) or sits inline (new-email drafts in the inbox).
// A draft is never sent on its own: once comms open the player taps Send on
// each one, or copies, edits or deletes it.
//
// Gestures
//   touch:    swipe a draft left or right to delete (Undo in the toast; a
//             tick of haptics when the swipe passes the point of no return),
//             hold to copy (the card fills while held), tap to expand,
//             pull the handle up to close, pull the bar down to open.
//   pointer:  drag sideways also deletes; on a focused draft Delete removes,
//             C copies, E edits, Ctrl+Enter sends, Enter expands, Up/Down
//             move between drafts.
// Motion follows the OS "reduce motion" setting (MotionConfig "user").

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  motion, AnimatePresence, MotionConfig, useMotionValue, useTransform, useMotionValueEvent, animate, useDragControls,
} from 'framer-motion';
import { toast } from 'sonner';
import { copyToClipboard } from '../../../utils/clipboard';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';
import { ATHENS_TZ } from '../../../utils/dateFormatter';
import styles from '../../../styles/comms/drafts/DraftsDrawer.module.css';

const IS_TOUCH = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
const REDUCED_MOTION = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const LONG_PRESS_MS = 480;
const SWIPE_FRACTION = 0.38;
const SWIPE_VELOCITY = 650;
const SENT_LINGER_MS = 650;
const FRESH_MS = 8000; // a draft this new just arrived: bump the bar, glow the card
const SPRING = { type: 'spring', stiffness: 420, damping: 34 };

// Plain text of an email draft, for previews and copying.
export const htmlToText = (html) => {
  const el = document.createElement('div');
  el.innerHTML = sanitizeHtml(String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n'));
  return (el.textContent || '').replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
};

// Cheap "is there any text in this editor HTML" check, safe per keystroke.
export const hasHtmlText = (html) => !!String(html || '').replace(/<[^>]*>|&nbsp;|\s/g, '');

const WHEN = new Intl.DateTimeFormat('en-GB', { timeZone: ATHENS_TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const formatWhen = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : WHEN.format(d);
};
const wasEdited = (d) => new Date(d.updated_at) - new Date(d.created_at) > 60000;
const isFresh = (d) => Date.now() - new Date(d.created_at).getTime() < FRESH_MS;
const opensLabel = (nextOpening) => (nextOpening ? `${nextOpening.day.slice(0, 3)} ${nextOpening.time}` : 'Closed');

// A ghost of the text just saved flies from the composer into the drawer
// bar, so the player sees where it went. `from` is the composer's rect,
// taken before it was cleared.
export function flyDraft(from, text, barId) {
  if (REDUCED_MOTION || !from || !text) return;
  requestAnimationFrame(() => {
    const bar = document.querySelector(`[data-drafts-bar="${barId}"]`);
    const to = bar?.getBoundingClientRect();
    if (!to || !to.width || to.bottom < 0 || to.top > window.innerHeight) return;
    const ghost = document.createElement('div');
    ghost.textContent = text.replace(/\s+/g, ' ').slice(0, 120);
    ghost.className = 'fixed z-[1200] pointer-events-none truncate rounded-md border border-amber-400/60 bg-amber-500/15 text-amber-100 text-[13px] px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-sm';
    Object.assign(ghost.style, {
      left: `${from.left}px`, top: `${from.top}px`, width: `${Math.min(from.width, 420)}px`, transformOrigin: 'left top',
    });
    document.body.appendChild(ghost);
    animate(ghost, {
      x: [0, to.left + 16 - from.left],
      y: [0, to.top + 6 - from.top],
      scale: [1, 0.18],
      opacity: [1, 1, 0],
    }, { duration: 0.5, ease: [0.5, 0, 0.2, 1] }).then(() => ghost.remove(), () => ghost.remove());
  });
}

function IconButton({ icon, label, onClick, tone = 'default', disabled }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.86 }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`w-9 h-9 flex items-center justify-center rounded ${styles.icon} ${tone === 'danger' ? styles.iconDanger : ''}`}
    >
      <span className="material-symbols-outlined text-[19px]">{icon}</span>
    </motion.button>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING },
};

const DraftCard = memo(function DraftCard({ draft, html, commsEnabled, nextOpening, network, editing, describe, actions }) {
  const cardRef = useRef(null);
  const x = useMotionValue(0);
  const underlay = useTransform(x, [-160, -1, 0, 1, 160], [1, 0, 0, 0, 1]);
  const leftLabel = useTransform(x, [0, 30, 110], [0, 0.35, 1]);
  const rightLabel = useTransform(x, [-110, -30, 0], [1, 0.35, 0]);
  const [expanded, setExpanded] = useState(false);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'leaving'
  const [copied, setCopied] = useState(false);
  const [holding, setHolding] = useState(false);
  // Past this point letting go deletes: the underlay deepens and the phone ticks once.
  const [armed, setArmed] = useState(false);
  const [fresh] = useState(() => isFresh(draft));
  const press = useRef({ timer: null, x: 0, y: 0, fired: false });
  const copiedTimer = useRef(null);
  useEffect(() => () => { clearTimeout(press.current.timer); clearTimeout(copiedTimer.current); }, []);

  useMotionValueEvent(x, 'change', (v) => {
    if (phase !== 'idle') return;
    const width = cardRef.current?.offsetWidth || 360;
    const next = Math.abs(v) > width * SWIPE_FRACTION;
    if (next !== armed) {
      if (next) navigator.vibrate?.(8);
      setArmed(next);
    }
  });

  const text = useMemo(() => (html ? htmlToText(draft.body) : draft.body), [html, draft.body]);
  const long = text.length > 160 || text.split('\n').length > 3;
  const meta = describe?.(draft);

  const copy = async () => {
    const value = text || meta;
    if (!value) { toast('This draft has no text to copy yet.'); return; }
    if (await copyToClipboard(value)) {
      navigator.vibrate?.(12);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error('Could not copy. Expand the draft and select the text instead.');
    }
  };

  const send = async () => {
    if (!commsEnabled || phase !== 'idle') return;
    setPhase('sending');
    const ok = await actions.send(draft);
    if (!ok) { setPhase('idle'); return; }
    navigator.vibrate?.(15);
    setPhase('sent');
    setTimeout(() => actions.sent(draft), SENT_LINGER_MS);
  };

  const remove = async (direction = 1) => {
    if (phase !== 'idle') return;
    setPhase('leaving');
    const width = cardRef.current?.offsetWidth || 360;
    await animate(x, direction * width * 1.15, { duration: 0.18, ease: 'easeIn' });
    actions.remove(draft);
  };

  const cancelPress = () => {
    clearTimeout(press.current.timer);
    setHolding(false);
  };
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' || phase !== 'idle') return;
    press.current = { timer: null, x: e.clientX, y: e.clientY, fired: false };
    setHolding(true);
    press.current.timer = setTimeout(() => {
      press.current.fired = true;
      setHolding(false);
      copy();
    }, LONG_PRESS_MS);
  };
  const onPointerMove = (e) => {
    if (Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 10) cancelPress();
  };
  const onBodyClick = () => {
    if (press.current.fired) { press.current.fired = false; return; }
    if (long || html) setExpanded(v => !v);
  };

  const onKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
    const k = e.key.toLowerCase();
    const focusSibling = (step) => {
      const cards = [...(e.currentTarget.closest('[data-drafts-list]')?.querySelectorAll('[data-draft-card]') || [])];
      cards[cards.indexOf(e.currentTarget) + step]?.focus();
    };
    if (k === 'delete' || k === 'backspace') { e.preventDefault(); remove(-1); }
    else if (k === 'enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
    else if (k === 'enter' || k === ' ') { e.preventDefault(); setExpanded(v => !v); }
    else if (k === 'c' && !window.getSelection()?.toString()) { e.preventDefault(); copy(); }
    else if (k === 'e' && actions.edit && !e.ctrlKey && !e.metaKey) { e.preventDefault(); actions.edit(draft); }
    else if (k === 'arrowdown') { e.preventDefault(); focusSibling(1); }
    else if (k === 'arrowup') { e.preventDefault(); focusSibling(-1); }
  };

  return (
    <motion.div
      variants={cardVariants}
      // Sent: lifts away like it was posted. Deleted: already off to the
      // side, so the gap just closes.
      exit={phase === 'sent'
        ? { opacity: 0, y: -18, scale: 0.96, height: 0, marginBottom: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } }
        : { opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.2 } }}
      className="relative shrink-0 w-full max-w-3xl mx-auto rounded-lg overflow-hidden mb-2 last:mb-0"
    >
      {/* Revealed behind the card while it's swiped away. */}
      <motion.div
        style={{ opacity: underlay }}
        className={`absolute inset-0 flex items-center justify-between px-5 pointer-events-none ${styles.underlay} ${armed ? styles.underlayArmed : ''}`}
        aria-hidden="true"
      >
        <motion.span style={{ opacity: leftLabel }} className="flex items-center gap-1.5 font-system-code text-[11px] uppercase tracking-widest font-bold">
          <motion.span animate={{ scale: armed ? 1.25 : 1 }} className="material-symbols-outlined text-[20px]">delete</motion.span>Delete
        </motion.span>
        <motion.span style={{ opacity: rightLabel }} className="flex items-center gap-1.5 font-system-code text-[11px] uppercase tracking-widest font-bold">
          Delete<motion.span animate={{ scale: armed ? 1.25 : 1 }} className="material-symbols-outlined text-[20px]">delete</motion.span>
        </motion.span>
      </motion.div>

      <motion.div
        ref={cardRef}
        data-draft-card
        tabIndex={0}
        role="group"
        aria-label={`Draft from ${formatWhen(draft.created_at)}: ${text.slice(0, 80)}`}
        onKeyDown={onKeyDown}
        drag={phase === 'idle' ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        onDragStart={cancelPress}
        onDragEnd={(e, info) => {
          const width = cardRef.current?.offsetWidth || 360;
          if (Math.abs(info.offset.x) > width * SWIPE_FRACTION || Math.abs(info.velocity.x) > SWIPE_VELOCITY) {
            remove(Math.sign(info.offset.x || info.velocity.x) || 1);
          }
        }}
        animate={{ scale: holding ? 0.985 : 1 }}
        transition={{ duration: 0.15 }}
        style={{ x }}
        data-state={phase === 'sent' ? 'sent' : editing ? 'editing' : undefined}
        className={`relative px-3 pt-2.5 pb-1.5 flex flex-col gap-1.5 outline-none ${styles.surface} ${styles.card}`}
      >
        {/* Arrived just now: one soft amber sweep. */}
        {fresh && (
          <motion.span
            aria-hidden="true"
            className={`absolute inset-0 rounded-lg pointer-events-none ${styles.sweep}`}
            initial={{ x: '-100%', opacity: 1 }}
            animate={{ x: '100%', opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: 0.15 }}
          />
        )}
        {/* Fills while a finger holds the draft; full = copied. */}
        <AnimatePresence>
          {holding && (
            <motion.span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 rounded-lg pointer-events-none ${styles.holdFill}`}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: LONG_PRESS_MS / 1000, ease: 'linear' }}
            />
          )}
        </AnimatePresence>
        {/* Sent: a green fill sweeps across, the same language as hold-to-copy. */}
        <AnimatePresence>
          {phase === 'sent' && (
            <motion.span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 rounded-lg pointer-events-none ${styles.sentWash}`}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
            />
          )}
        </AnimatePresence>

        <div className={`relative flex items-center gap-1.5 text-[10px] font-system-code uppercase tracking-wider min-w-0 ${styles.meta}`}>
          <span className={`material-symbols-outlined text-[14px] ${styles.metaIcon}`}>edit_note</span>
          <span className="truncate">{formatWhen(draft.created_at)}{wasEdited(draft) ? ' · edited' : ''}</span>
          {editing && <span className={`shrink-0 ${styles.editingTag}`}>· in composer</span>}
          <span className="flex-1" />
          <AnimatePresence>
            {copied && (
              <motion.span
                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                className={`flex items-center gap-1 shrink-0 ${styles.copied}`}
              >
                <span className="material-symbols-outlined text-[13px]">done</span>Copied
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {meta && <div className={`relative text-[11px] truncate ${styles.subline}`}>{meta}</div>}

        <div
          onClick={onBodyClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={(e) => { if (IS_TOUCH) e.preventDefault(); }}
          // On touch, holding means copy: no native selection or callout.
          style={IS_TOUCH ? { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' } : undefined}
          className={`relative text-[15px] md:text-[14px] leading-snug break-words ${styles.body} ${long || html ? 'cursor-pointer' : ''}`}
        >
          {html && expanded ? (
            <div className={styles.html} dangerouslySetInnerHTML={{ __html: sanitizeHtml(draft.body) }} />
          ) : (
            <div className={`whitespace-pre-wrap ${expanded ? '' : 'line-clamp-3'}`}>{text || <span className={styles.empty}>No text yet</span>}</div>
          )}
        </div>
        {long && (
          <button type="button" onClick={() => setExpanded(v => !v)} className={`relative self-start flex items-center gap-0.5 text-[11px] font-system-code -mt-0.5 ${styles.more}`}>
            {expanded ? 'Show less' : 'Show more'}
            <span className={`material-symbols-outlined text-[14px] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
          </button>
        )}

        <div className="relative flex items-center gap-1 -mx-1">
          <motion.button
            type="button"
            whileTap={commsEnabled ? { scale: 0.94 } : undefined}
            onClick={send}
            disabled={!commsEnabled || phase !== 'idle'}
            title={commsEnabled ? 'Send this draft now (Ctrl+Enter)' : `${network} is closed${nextOpening ? `: opens ${nextOpening.day} at ${nextOpening.time}` : ''}`}
            className={`h-9 px-3 flex items-center gap-1.5 rounded text-[12px] font-system-code uppercase tracking-wider font-bold ${
              phase === 'sent' ? styles.sendDone : commsEnabled ? styles.send : styles.sendLocked
            }`}
          >
            <motion.span
              key={phase === 'sent' ? 'sent' : 'idle'}
              initial={phase === 'sent' ? { scale: 0.2, rotate: -40 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 15 }}
              className={`material-symbols-outlined text-[18px] ${phase === 'sending' ? 'animate-spin' : ''}`}
            >
              {phase === 'sending' ? 'progress_activity' : phase === 'sent' ? 'done_all' : commsEnabled ? 'send' : 'lock_clock'}
            </motion.span>
            {phase === 'sending' ? 'Sending' : phase === 'sent' ? 'Sent' : commsEnabled ? 'Send' : opensLabel(nextOpening)}
          </motion.button>
          <span className="flex-1" />
          <IconButton icon="content_copy" label="Copy text (C)" onClick={copy} />
          {actions.edit && <IconButton icon="edit" label="Edit in composer (E)" onClick={() => actions.edit(draft)} disabled={phase !== 'idle'} />}
          <IconButton icon="delete" label="Delete (Del)" tone="danger" onClick={() => remove(1)} disabled={phase !== 'idle'} />
        </div>
      </motion.div>
    </motion.div>
  );
});

function DraftsDrawer({
  drafts,
  open,
  onOpenChange,
  commsEnabled,
  nextOpening,
  network = 'SchreckNet',
  title = 'Drafts',
  barId,
  html = false,
  overlay = true,
  editingId = null,
  describe,
  onSend,
  onSent,
  onDelete,
  onEdit,
}) {
  const listRef = useRef(null);
  const dragControls = useDragControls();
  const count = drafts.length;
  const latest = drafts[count - 1];
  const prevCount = useRef(count);
  const prevOpen = useRef(open);
  const [bump, setBump] = useState(0);
  // A pull on the bar ends in a pointerup, which also clicks it: ignore that click.
  const pannedAt = useRef(0);

  // The parent re-renders on every keystroke and hands new callbacks each
  // time; route them through a ref so the (memoised) cards don't re-render.
  const handlers = useRef({});
  handlers.current = { onSend, onSent, onDelete, onEdit, describe };
  const actions = useMemo(() => ({
    send: (d) => handlers.current.onSend(d),
    sent: (d) => handlers.current.onSent(d),
    remove: (d) => handlers.current.onDelete(d),
    edit: onEdit ? (d) => handlers.current.onEdit(d) : null,
  }), [!!onEdit]); // eslint-disable-line react-hooks/exhaustive-deps
  const stableDescribe = useMemo(() => (describe ? (d) => handlers.current.describe(d) : undefined), [!!describe]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bump the bar for a draft that was just written (here or on another
  // device), not for old drafts loading in. Keep the newest in view.
  useEffect(() => {
    const added = count > prevCount.current;
    const opened = open && !prevOpen.current;
    if (added && latest && isFresh(latest)) setBump(b => b + 1);
    if (open && (added || opened)) {
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: opened ? 'auto' : 'smooth' }));
    }
    prevCount.current = count;
    prevOpen.current = open;
  }, [count, open, latest]);

  const latestText = useMemo(
    () => (latest ? (html ? htmlToText(latest.body) : latest.body).replace(/\s+/g, ' ') : ''),
    [latest, html]
  );

  const statusChip = commsEnabled ? (
    <span className={`flex items-center gap-1.5 text-[10px] font-system-code uppercase tracking-widest shrink-0 ${styles.chipOpen}`}>
      <span className="relative flex w-2 h-2">
        <span className={`absolute inset-0 rounded-full bg-current opacity-60 ${styles.ping}`} />
        <span className="relative w-2 h-2 rounded-full bg-current" />
      </span>
      <span className="hidden sm:inline">{network} open</span>
      <span className="sm:hidden">Open</span>
    </span>
  ) : (
    <span className={`flex items-center gap-1 text-[10px] font-system-code uppercase tracking-widest shrink-0 ${styles.chipLocked}`} title={nextOpening ? `Opens ${nextOpening.day} at ${nextOpening.time}` : `${network} is closed`}>
      <span className="material-symbols-outlined text-[14px]">lock_clock</span>
      {opensLabel(nextOpening)}
    </span>
  );

  // The list staggers its cards in when the drawer opens; a card added later
  // animates on its own (the parent is already "show").
  const list = (
    <motion.div
      ref={listRef}
      data-drafts-list
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035, delayChildren: 0.04 } } }}
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-2 md:p-3 flex flex-col"
    >
      <AnimatePresence>
        {drafts.map(d => (
          <DraftCard
            key={d.id}
            draft={d}
            html={html}
            commsEnabled={commsEnabled}
            nextOpening={nextOpening}
            network={network}
            editing={editingId === d.id}
            describe={stableDescribe}
            actions={actions}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );

  const hint = IS_TOUCH
    ? 'Swipe a draft to delete · hold to copy'
    : 'Drag sideways or press Del to delete · C copies · Ctrl+Enter sends';

  return (
    <MotionConfig reducedMotion="user">
      <div className={`${styles.root} relative shrink-0 ${overlay ? 'z-20' : ''}`}>
      <AnimatePresence initial={false}>
        {count > 0 && (
          <motion.div
            key="drafts"
            // Clipped only while growing/shrinking: the open drawer hangs below.
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="relative"
          >
            <motion.button
              type="button"
              data-drafts-bar={barId}
              onClick={() => { if (Date.now() - pannedAt.current > 250) onOpenChange(!open); }}
              onPanEnd={(e, info) => {
                if (Math.abs(info.offset.y) < 28) return;
                pannedAt.current = Date.now();
                onOpenChange(info.offset.y > 0);
              }}
              aria-expanded={open}
              style={{ touchAction: 'pan-x' }}
              className={`w-full flex items-center gap-2 px-3 md:px-4 h-11 text-left ${styles.surface} ${styles.bar} ${commsEnabled ? styles.barOpen : ''}`}
            >
              <motion.span
                key={bump}
                initial={bump ? { scale: 1.6, rotate: -14 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 12 }}
                className="material-symbols-outlined text-[20px] text-amber-400 shrink-0"
              >
                edit_note
              </motion.span>
              <span className={`font-system-code text-[11px] uppercase tracking-widest font-bold shrink-0 ${styles.title}`}>{title}</span>
              {/* The count rolls like an odometer when it changes. */}
              <span className={`relative min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 overflow-hidden tabular-nums ${styles.count}`}>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={count}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                  >
                    {count}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="relative flex-1 min-w-0 h-full flex items-center overflow-hidden">
                <AnimatePresence initial={false} mode="popLayout">
                  {!open && (
                    <motion.span
                      key={latest?.id}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`block w-full truncate text-[12px] ${styles.preview}`}
                    >
                      {latestText}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              {statusChip}
              <motion.span
                animate={{ rotate: open ? 180 : 0 }}
                transition={SPRING}
                className={`material-symbols-outlined text-[20px] shrink-0 ${styles.chevron}`}
              >
                expand_more
              </motion.span>
            </motion.button>

            <AnimatePresence>
              {open && (overlay ? (
                <motion.div
                  key="drawer"
                  drag="y"
                  dragListener={false}
                  dragControls={dragControls}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.6, bottom: 0.05 }}
                  onDragEnd={(e, info) => { if (info.offset.y < -50 || info.velocity.y < -400) onOpenChange(false); }}
                  // Unrolls downward from the bar, rolls back up on close.
                  initial={{ clipPath: 'inset(0 0 100% 0)', opacity: 0.6 }}
                  animate={{ clipPath: 'inset(0 0 0% 0)', opacity: 1 }}
                  exit={{ clipPath: 'inset(0 0 100% 0)', opacity: 0.6, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
                  transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
                  className={`absolute top-full left-0 right-0 flex flex-col max-h-[min(58dvh,480px)] ${styles.panel}`}
                >
                  {list}
                  <div
                    onPointerDown={(e) => dragControls.start(e)}
                    style={{ touchAction: 'none' }}
                    className={`shrink-0 flex flex-col items-center gap-1.5 pt-1 pb-2 cursor-grab active:cursor-grabbing select-none ${styles.grip}`}
                  >
                    <span className={`text-[10px] font-system-code px-3 text-center ${styles.hint}`}>{hint}</span>
                    <span className={styles.handle} aria-hidden="true" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="drawer"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden flex flex-col max-h-[50vh]"
                >
                  {list}
                  <span className={`text-[10px] font-system-code px-3 pb-2 text-center ${styles.hint}`}>{hint}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

export default memo(DraftsDrawer);

// Small pencil marker for a contact / thread that has drafts waiting.
export function DraftBadge({ count }) {
  return (
    <AnimatePresence initial={false}>
      {count > 0 && (
        <motion.span
          key="badge"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 24 }}
          title={`${count} draft${count === 1 ? '' : 's'}`}
          aria-label={`${count} draft${count === 1 ? '' : 's'}`}
          className={`flex items-center gap-0.5 h-5 px-1 rounded text-[10px] font-bold shrink-0 tabular-nums ${styles.badge}`}
        >
          <span className="material-symbols-outlined text-[13px]">edit_note</span>{count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
