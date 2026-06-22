// src/pages/LiveSession.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../core/api';
import { DISCIPLINES, iconPath } from '../data/disciplines';
import {
  COMMON_ROLLS,
  computeOutcome,
  disciplineRequiresRouse,
  getPoolFromCharacter,
  rerollNormalDice,
  rollPool,
  runRouseCheck,
  summarizeTrackers,
} from '../utils/liveSessionMechanics';
import { getLiveSession, joinLiveSession, logLiveSessionRoll, getLiveSessionBroadcasts } from '../api/liveSession';
import styles from '../styles/LiveSession.module.css';

/* ─────────────────────────────────────────────
   HUMANITY DATA
───────────────────────────────────────────── */
const HUMANITY_DATA = {
  10: { label: 'Humanity 10', desc: ['Humans with this score are rare, making vampires with this score even rarer.','Blush of Life is not needed to blend into mortal society — they appear as a pale and healthy mortal.','They heal Superficial Damage as a mortal in addition to standard healing.','Food is able to be tasted, eaten, and digested as a human.','Able to stay awake during the day as if human, though they still must sleep at some point.','Sunlight damage is halved.'] },
  9:  { label: 'Humanity 9',  desc: ['Kindred with this rating tend to be more humane than most humans.','Without Blush of Life they appear ill.','They heal Superficial Damage as a mortal in addition to standard healing.','Taste, eat and digest rare or raw meat and many liquids.','Rise from day-sleep up to an hour before sunset and stay awake an hour after dawn.','Torpor length: Three days.'] },
  8:  { label: 'Humanity 8',  desc: ['They are still able to comprehend and feel the pain from the anguish they cause.','Two dice are used for the Blush of Life checks, taking the highest result.','With Blush of Life, they can digest and taste wine.','Rise from day-sleep an hour before sunset.','Torpor length: One week.'] },
  7:  { label: 'Humanity 7',  desc: ['Kindred can pass for mortal, still subscribing to the strongest social norms.','Blush of Life requires a Rouse Check.','Can fake sexual intercourse by winning a Dexterity + Charisma test versus the partner\'s Composure or Wits.','Without Blush of Life, food and drink cause vomiting.','Torpor length: Two weeks.'] },
  6:  { label: 'Humanity 6',  desc: ['Not horrific monsters, but will do what they need to survive regardless of cost.','Take a one die penalty to the pool for faking sexual intercourse.','Even with Blush of Life, must make a Composure + Stamina test against Difficulty 3 to keep food and drink down.','Torpor length: One month.'] },
  5:  { label: 'Humanity 5',  desc: ['At this level most Kindred only care for their Touchstones, and may manifest minor physical eeriness.','Take a one die penalty in rolls to interact with mortals. Does not apply to intimidation, hunting, or supernatural Subterfuge.','Take a two dice penalty to the pool for faking sexual intercourse.','Torpor length: One year.'] },
  4:  { label: 'Humanity 4',  desc: ['Kindred may have accepted the inevitable downwards spiral. Physically they appear more corpse-like.','Take a two dice penalty to interact with mortals.','Even with Blush of Life, can no longer keep food and drink down.','Torpor length: One decade.'] },
  3:  { label: 'Humanity 3',  desc: ['Scrapping near the bottom — pragmatic route, whatever it takes.','Take a four dice penalty to interact with mortals.','Can no longer fake sexual intercourse.','Torpor length: Five decades.'] },
  2:  { label: 'Humanity 2',  desc: ['With twisted hobbies that please only them, Kindred have no care for others.','Take a six dice penalty to interact with mortals (four with Blush of Life).','Torpor length: One century.'] },
  1:  { label: 'Humanity 1',  desc: ['Teetering on the edge — only caring for survival.','Take an eight dice penalty to interact with mortals (five with Blush of Life).','Torpor length: Five centuries.'] },
  0:  { label: 'Humanity 0 — Wassail', desc: ['The Beast has taken control; leaving the character in a final Rötschreck Frenzy called Wassail.','Physical Attributes all buffed to 5.','If they survive this final scene, they become a wight and are taken control of by the Storyteller as an SPC.'] },
};

/* ─────────────────────────────────────────────
   FRENZY DATA
───────────────────────────────────────────── */
const FRENZY_TYPES = [
  { key: 'fury',   label: 'Fury Frenzy',   color: '#dc2626', icon: '🔥', desc: 'Caused by insults, humiliation, or aggressive risks towards those they care for. They will not stop until they destroy the object or person who caused this Frenzy.' },
  { key: 'hunger', label: 'Hunger Frenzy', color: '#f97316', icon: '🩸', desc: 'Triggered when failing a Rouse Check at Hunger 5, or when smelling/drinking blood at Hunger 4. They will do anything to find a fresh source of blood until they reach Hunger 1 or below.' },
  { key: 'terror', label: 'Terror Frenzy', color: '#7c3aed', icon: '💀', desc: 'Also known as Rötschreck. Appears in moments of true danger — sunlight, fire, or grave damage. They will flee the scene no matter who or what is in their way.' },
];

/* ─────────────────────────────────────────────
   ATTRIBUTE / SKILL GROUPS
───────────────────────────────────────────── */
const ATTRIBUTE_GROUPS = {
  Physical: ['Strength', 'Dexterity', 'Stamina'],
  Social: ['Charisma', 'Manipulation', 'Composure'],
  Mental: ['Intelligence', 'Wits', 'Resolve'],
};
const SKILL_GROUPS = {
  Physical: ['Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival'],
  Social: ['Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge'],
  Mental: ['Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology'],
};

const FRENZY_ALERTS = {
  fury: { label: '🔥 Fury Frenzy', color: '#dc2626', desc: 'Your character is consumed by blind rage. The Beast dictates your actions.' },
  hunger: { label: '🩸 Hunger Frenzy', color: '#f97316', desc: 'The thirst overtakes you. You are driven to hunt and slake your hunger immediately.' },
  terror: { label: '💀 Terror Frenzy', color: '#7c3aed', desc: 'Overwhelming panic freezes or scatters you. The Rot takes hold.' }
};

/* ─────────────────────────────────────────────
   DISCIPLINE ICON PATH
───────────────────────────────────────────── */
const DISC_ICON_MAP = {
  Animalism: 'Animalism-rombo.png',
  Auspex: 'Auspex-rombo.png',
  'Blood Sorcery': 'Blood-Sorcery-rombo.png',
  Celerity: 'Celerity-rombo.png',
  Dominate: 'Dominate-rombo.png',
  Fortitude: 'Fortitude-rombo.png',
  Obfuscate: 'Obfuscate-rombo.png',
  Oblivion: 'Oblivion-rombo.png',
  Potence: 'Potence-rombo.png',
  Presence: 'Presence-rombo.png',
  Protean: 'Protean-rombo.png',
  Thaumaturgy: 'Thaumaturgy-rombo.png',
  'Thin-blood Alchemy': 'Thin-blood-Alchemy-rombo.png',
};
const discIcon = (name) => {
  const file = DISC_ICON_MAP[name] || (typeof iconPath === 'function' ? iconPath(name) : null);
  return file ? `/img/disciplines/${file}` : null;
};

/* ─────────────────────────────────────────────
   HUMANITY TOOLTIP
───────────────────────────────────────────── */
function HumanityTooltip({ value }) {
  const [open, setOpen] = useState(false);
  const data = HUMANITY_DATA[Math.max(0, Math.min(10, Number(value) || 0))];
  const getColor = (v) => v >= 8 ? '#22c55e' : v >= 6 ? '#eab308' : v >= 4 ? '#f97316' : '#e11d48';
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', width: 20, height: 20, borderRadius: '50%', color: '#a1a1aa', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
          <div style={{ position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)', zIndex: 50, width: 280, background: '#1c1c1e', border: `1px solid ${getColor(value)}`, borderRadius: 12, padding: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: getColor(value), marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{data?.label}</div>
            <ul style={{ margin: 0, padding: '0 0 0 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {data?.desc.map((line, i) => <li key={i} style={{ fontSize: '0.8rem', color: '#d4d4d8', lineHeight: 1.4 }}>{line}</li>)}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   HEALTH / WP  (read-only boxes)
───────────────────────────────────────────── */
function StatusBar({ label, sup = 0, agg = 0, max = 1 }) {
  const safeMax = Math.max(1, Number(max) || 1);
  const aggCount = Math.min(agg, safeMax);
  const supCount = Math.min(sup, safeMax - aggCount);
  const total = aggCount + supCount;
  return (
    <div className={styles.trackerCard}>
      <div className={styles.trackerHeader}>
        <span>{label}</span>
        <span style={{ color: total >= safeMax ? '#e11d48' : '#a1a1aa' }}>{safeMax - total} / {safeMax}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: '0.5rem' }}>
        {Array.from({ length: safeMax }).map((_, i) => {
          const isAgg = i < aggCount;
          const isSup = !isAgg && i < aggCount + supCount;
          return (
            <div key={i} style={{ width: 22, height: 22, borderRadius: 4, border: isAgg ? '2px solid #e11d48' : isSup ? '2px solid #a1a1aa' : '2px solid rgba(255,255,255,0.12)', background: isAgg ? '#e11d48' : isSup ? 'rgba(161,161,170,0.35)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isAgg && <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="1" x2="1" y2="9" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}
              {isSup && <div style={{ width: 8, height: 2, background: '#a1a1aa', borderRadius: 1 }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(161,161,170,0.35)', border: '1px solid #a1a1aa', display: 'inline-block' }} />Superficial</span>
        <span style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#e11d48', border: '1px solid #e11d48', display: 'inline-block' }} />Aggravated</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HUMANITY TRACKER
───────────────────────────────────────────── */
function HumanityTracker({ value = 7 }) {
  const v = Math.max(0, Math.min(10, Number(value) || 0));
  const getColor = (n) => n >= 8 ? '#22c55e' : n >= 6 ? '#eab308' : n >= 4 ? '#f97316' : '#e11d48';
  return (
    <div className={styles.trackerCard}>
      <div className={styles.trackerHeader}>
        <span>Humanity</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: getColor(v), fontWeight: 800, fontSize: '1rem' }}>{v}</span>
          <HumanityTooltip value={v} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, marginTop: '0.5rem' }}>
        {Array.from({ length: 10 }).map((_, i) => {
          const dotVal = 10 - i;
          const filled = dotVal <= v;
          return <div key={i} style={{ flex: 1, height: 10, borderRadius: 3, background: filled ? getColor(v) : 'rgba(255,255,255,0.08)', transition: 'background 0.3s', boxShadow: filled ? `0 0 6px ${getColor(v)}66` : 'none' }} />;
        })}
      </div>
      <div style={{ fontSize: '0.72rem', color: '#71717a', marginTop: '0.4rem', textAlign: 'center' }}>{HUMANITY_DATA[v]?.label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FRENZY DISPLAY
───────────────────────────────────────────── */
function FrenzyDisplay({ charName, frenzyState, isAdmin, onChangeFrenzy }) {
  const [open, setOpen] = useState(false);
  const activeFrenzy = FRENZY_TYPES.find(f => f.key === frenzyState) || null;
  return (
    <div className={styles.trackerCard} style={{ border: activeFrenzy ? `1px solid ${activeFrenzy.color}` : '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.3s' }}>
      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>{charName || 'Character'}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.3rem 0.8rem', borderRadius: 20, background: activeFrenzy ? `${activeFrenzy.color}22` : 'rgba(34,197,94,0.12)', border: `1px solid ${activeFrenzy ? activeFrenzy.color : '#22c55e'}`, fontSize: '0.82rem', fontWeight: 700, color: activeFrenzy ? activeFrenzy.color : '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {activeFrenzy ? `${activeFrenzy.icon} ${activeFrenzy.label}` : '✓ Calm'}
        </div> */}
        {isAdmin && <button className={styles.btnGhost} style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }} onClick={() => setOpen(o => !o)}>{open ? 'Close' : 'Change State'}</button>}
      </div>
      {activeFrenzy && <p style={{ margin: '0.6rem 0 0 0', fontSize: '0.8rem', color: '#a1a1aa', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.6rem' }}>{activeFrenzy.desc}</p>}
      {isAdmin && open && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
          <button onClick={() => { onChangeFrenzy(null); setOpen(false); }} style={{ padding: '0.45rem 0.75rem', borderRadius: 8, background: frenzyState === null ? 'rgba(34,197,94,0.2)' : 'transparent', border: '1px solid #22c55e', color: '#22c55e', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>✓ Calm</button>
          {FRENZY_TYPES.map(f => (
            <button key={f.key} onClick={() => { onChangeFrenzy(f.key); setOpen(false); }} style={{ padding: '0.45rem 0.75rem', borderRadius: 8, background: frenzyState === f.key ? `${f.color}22` : 'transparent', border: `1px solid ${f.color}`, color: f.color, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>{f.icon} {f.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   DISCIPLINE CONFIRMATION MODAL
   Shows power details + rouse info before activation
───────────────────────────────────────────── */
function DisciplineConfirmModal({ power, discName, rouseCount, currentHunger, onConfirm, onCancel }) {
  if (!power) return null;
  const needsRouse = disciplineRequiresRouse(power);
  const rouses = rouseCount || (needsRouse ? 1 : 0);
  const projectedHunger = Math.min(5, currentHunger + rouses);
  const iconSrc = discIcon(discName);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, backdropFilter: 'blur(4px)' }} />

      {/* Modal */}
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 101, width: 'min(90vw, 420px)', background: '#18181b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
        
        {/* Header */}
        <div style={{ background: 'rgba(225,29,72,0.08)', borderBottom: '1px solid rgba(225,29,72,0.2)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {iconSrc && <img src={iconSrc} alt={discName} style={{ width: 36, height: 36, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(225,29,72,0.4))' }} draggable="false" />}
          <div>
            <div style={{ fontSize: '0.7rem', color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{discName}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{power.name}</div>
          </div>
          {power.level !== undefined && (
            <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#71717a', fontWeight: 600 }}>Lv. {power.level}</div>
          )}
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Notes / description */}
          {(power.notes || power.description) && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#a1a1aa', lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '0.75rem' }}>
              {power.notes || power.description}
            </p>
          )}

          {/* Dice pool / mechanics */}
          {(power.dice_pool || power.opposing_pool || power.duration) && (
            <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: '0.65rem', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 2 }}>Mechanics</div>
              {power.dice_pool && power.dice_pool !== '—' && (
                <div style={{ fontSize: '0.82rem', color: '#d4d4d8' }}><span style={{ color: '#71717a' }}>Pool: </span>{power.dice_pool}</div>
              )}
              {power.opposing_pool && power.opposing_pool !== '—' && (
                <div style={{ fontSize: '0.82rem', color: '#d4d4d8' }}><span style={{ color: '#71717a' }}>vs: </span>{power.opposing_pool}</div>
              )}
              {power.duration && (
                <div style={{ fontSize: '0.82rem', color: '#d4d4d8' }}><span style={{ color: '#71717a' }}>⏱ Duration: </span>{power.duration}</div>
              )}
              {power.amalgam && (
                <div style={{ fontSize: '0.82rem', color: '#d4d4d8' }}><span style={{ color: '#71717a' }}>Amalgam: </span>{power.amalgam}</div>
              )}
            </div>
          )}

          {/* Rouse check warning */}
          {rouses > 0 ? (
            <div style={{ background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.3)', borderRadius: 10, padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: '1rem' }}>🩸</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {rouses === 1 ? '1 Rouse Check Required' : `${rouses} Rouse Checks Required`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <div style={{ color: '#a1a1aa' }}>
                  Current Hunger:
                  <span style={{ color: currentHunger >= 4 ? '#e11d48' : '#f4f4f5', fontWeight: 700, marginLeft: 4 }}>
                    {'●'.repeat(currentHunger)}{'○'.repeat(5 - currentHunger)}
                  </span>
                </div>
                <div style={{ color: '#a1a1aa' }}>
                  Max possible:
                  <span style={{ color: projectedHunger >= 4 ? '#e11d48' : '#f4f4f5', fontWeight: 700, marginLeft: 4 }}>
                    {'●'.repeat(projectedHunger)}{'○'.repeat(5 - projectedHunger)}
                  </span>
                </div>
              </div>
              {projectedHunger >= 5 && (
                <div style={{ marginTop: 8, padding: '0.5rem', background: 'rgba(225,29,72,0.15)', borderRadius: 6, fontSize: '0.75rem', color: '#fca5a5' }}>
                  ⚠ At max hunger this may trigger a Hunger Frenzy check!
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1rem' }}>✓</span>
              <span style={{ fontSize: '0.8rem', color: '#86efac', fontWeight: 600 }}>No Rouse Check needed</span>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button className={styles.btnGhost} onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
            <button
              className={styles.btnPrimary}
              onClick={onConfirm}
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {needsRouse ? '🩸 Activate & Rouse' : '⚡ Activate Power'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   DISCIPLINE PANEL
   - Row of clickable discipline icons (tabs)
   - Power list for selected discipline
   - Click a power → confirmation modal
   - Reference panel: hover/select shows full details
───────────────────────────────────────────── */
function DisciplinePanel({ sheet, trackers, onActivate }) {
  const charDisciplines = sheet?.disciplines || {};
  const charPowerIds = sheet?.disciplinePowers || {};

  // All disciplines the character has with dots > 0
  const availableDiscs = Object.entries(charDisciplines)
    .filter(([, dots]) => Number(dots) > 0)
    .map(([name]) => name);

  // Active discipline tab
  const [activeDisc, setActiveDisc] = useState(() => availableDiscs[0] || null);
  // Which power is highlighted for reference (hover)
  const [hoveredPowerId, setHoveredPowerId] = useState(null);
  // Confirmation modal state
  const [confirmPower, setConfirmPower] = useState(null); // { power, discName }

  // Make sure active disc stays valid if sheet changes
  useEffect(() => {
    if (!activeDisc && availableDiscs.length > 0) setActiveDisc(availableDiscs[0]);
  }, [availableDiscs, activeDisc]);

  // ── Helper: normalise any string for fuzzy id/name matching ──────────────
  const norm = (v) => String(v ?? '').trim().toLowerCase();

  // Build a Set of owned power keys for a given discipline from disciplinePowers
  const ownedSetFor = (discName) => {
    const picks = Array.isArray(charPowerIds[discName]) ? charPowerIds[discName] : [];
    const keys = picks.flatMap(p =>
      [p.id, p.name, p.slug, p.key, p.code, p.power_id]
        .filter(Boolean)
        .map(norm)
    );
    return new Set(keys);
  };

  // Resolve a canonical power object from DISCIPLINES matching a stored pick
  // Returns the full power data merged with the stored level
  const resolveOwnedPowers = (discName) => {
    const discData = DISCIPLINES[discName];
    if (!discData) return [];
    const picks = Array.isArray(charPowerIds[discName]) ? charPowerIds[discName] : [];
    if (picks.length === 0) return [];

    // Build a flat lookup: normKey → { ...powerData, level }
    const lookup = new Map();
    const levels = discData.levels || {};
    Object.entries(levels).forEach(([lvl, powers]) => {
      (powers || []).forEach(p => {
        [p.id, p.name, p.slug, p.key, p.code, p.power_id]
          .filter(Boolean)
          .forEach(k => lookup.set(norm(k), { ...p, level: Number(lvl), disc: discName }));
      });
    });

    const out = [];
    picks.forEach(rawPick => {
      const p = typeof rawPick === 'string' ? { id: rawPick } : rawPick;
      const candidates = [p.id, p.name, p.slug, p.key, p.code, p.power_id]
        .filter(Boolean)
        .map(norm);

      // Try to find full canonical data from DISCIPLINES
      let resolved = null;
      for (const k of candidates) {
        if (lookup.has(k)) { resolved = lookup.get(k); break; }
      }

      if (resolved) {
        // Prefer stored level if present, fall back to looked-up level
        out.push({ ...resolved, level: Number(p.level) || resolved.level });
      } else {
        // Fallback: show raw stored name with whatever we have
        out.push({ id: p.id || p.name, name: p.name || p.id || '(Unknown)', level: Number(p.level) || 0, disc: discName, cost: '' });
      }
    });

    // Sort by level
    out.sort((a, b) => (a.level - b.level) || String(a.name).localeCompare(String(b.name)));
    return out;
  };

  // Powers to show for the currently active discipline tab — ONLY owned ones
  const activePowers = useMemo(() => {
    if (!activeDisc) return [];
    return resolveOwnedPowers(activeDisc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDisc, charPowerIds]);

  // (kept for potential future use — not used in render currently)
  const allPowersByDisc = useMemo(() => {
    const map = {};
    for (const discName of availableDiscs) {
      map[discName] = resolveOwnedPowers(discName);
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDiscs, charPowerIds]);

  const hoveredPower = useMemo(() =>
    activePowers.find(p => p.id === hoveredPowerId) || null,
    [activePowers, hoveredPowerId]
  );

  if (availableDiscs.length === 0) {
    return (
      <div className={styles.trackerCard}>
        <div className={styles.trackerHeader}>Disciplines</div>
        <div className={styles.emptyState}>No disciplines on this character.</div>
      </div>
    );
  }

  const currentHunger = trackers?.hunger ?? 0;

  return (
    <>
      {/* Confirmation modal (portal-style, rendered at top level) */}
      {confirmPower && (
        <DisciplineConfirmModal
          power={confirmPower.power}
          discName={confirmPower.discName}
          rouseCount={disciplineRequiresRouse(confirmPower.power) ? 1 : 0}
          currentHunger={currentHunger}
          onConfirm={() => {
            onActivate(confirmPower.power, confirmPower.discName);
            setConfirmPower(null);
          }}
          onCancel={() => setConfirmPower(null)}
        />
      )}

      <div className={styles.trackerCard}>
        <div className={styles.trackerHeader}>Disciplines</div>

        {/* ── DISCIPLINE ICON TABS ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
          {availableDiscs.map(discName => {
            const iconSrc = discIcon(discName);
            const level = Number(charDisciplines[discName] || 0);
            const isActive = activeDisc === discName;
            return (
              <button
                key={discName}
                onClick={() => { setActiveDisc(discName); setHoveredPowerId(null); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, padding: '0.5rem 0.65rem', borderRadius: 10, cursor: 'pointer',
                  background: isActive ? 'rgba(225,29,72,0.15)' : 'rgba(255,255,255,0.03)',
                  border: isActive ? '1px solid rgba(225,29,72,0.5)' : '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 0 12px rgba(225,29,72,0.2)' : 'none',
                }}
                title={discName}
              >
                {iconSrc ? (
                  <img src={iconSrc} alt={discName} style={{ width: 32, height: 32, objectFit: 'contain', opacity: isActive ? 1 : 0.6, filter: isActive ? 'drop-shadow(0 2px 6px rgba(225,29,72,0.5))' : 'none', transition: 'all 0.2s' }} draggable="false" />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: isActive ? 'rgba(225,29,72,0.2)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: isActive ? '#e11d48' : '#71717a', fontWeight: 700 }}>{discName.slice(0, 2).toUpperCase()}</div>
                )}
                <span style={{ fontSize: '0.6rem', color: isActive ? '#e11d48' : '#52525b', letterSpacing: '0.05em', fontWeight: isActive ? 700 : 400 }}>
                  {'•'.repeat(level)}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── ACTIVE DISCIPLINE NAME ── */}
        {activeDisc && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {discIcon(activeDisc) && <img src={discIcon(activeDisc)} alt={activeDisc} style={{ width: 20, height: 20, objectFit: 'contain', opacity: 0.8 }} draggable="false" />}
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{activeDisc}</span>
            <span style={{ fontSize: '0.75rem', color: '#e11d48', fontWeight: 600 }}>{'•'.repeat(Number(charDisciplines[activeDisc] || 0))}</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#52525b' }}>Tap a power to activate</span>
          </div>
        )}

        {/* ── POWER LIST ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: hoveredPower ? '1rem' : 0 }}>
          {activePowers.map(p => {
            const needsRouse = disciplineRequiresRouse(p);
            const isHovered = hoveredPowerId === p.id;
            return (
              <div
                key={p.id}
                onMouseEnter={() => setHoveredPowerId(p.id)}
                onMouseLeave={() => setHoveredPowerId(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 0.75rem', borderRadius: 8, cursor: 'pointer',
                  background: isHovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                  border: isHovered ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.04)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Level indicator */}
                <div style={{ fontSize: '0.65rem', color: '#52525b', fontWeight: 700, width: 16, textAlign: 'center', flexShrink: 0 }}>
                  {p.level}
                </div>

                {/* Power info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f4f4f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  {(p.notes || p.description) && (
                    <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.notes || p.description}</div>
                  )}
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {needsRouse && (
                    <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: 6, background: 'rgba(225,29,72,0.12)', border: '1px solid rgba(225,29,72,0.3)', color: '#e11d48', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      🩸 Rouse
                    </span>
                  )}
                </div>

                {/* Activate button */}
                <button
                  className={styles.btnPrimary}
                  onClick={() => setConfirmPower({ power: p, discName: activeDisc })}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', flexShrink: 0 }}
                >
                  Use
                </button>
              </div>
            );
          })}

          {activePowers.length === 0 && (
            <div className={styles.emptyState}>No known powers for {activeDisc}.</div>
          )}
        </div>

        {/* ── INLINE REFERENCE PANEL (hovered power) ── */}
        {hoveredPower && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.875rem', borderLeft: '3px solid #e11d48' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>{hoveredPower.name}</span>
              <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Level {hoveredPower.level}</span>
              {disciplineRequiresRouse(hoveredPower) && (
                <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: 6, background: 'rgba(225,29,72,0.12)', border: '1px solid rgba(225,29,72,0.3)', color: '#e11d48', fontWeight: 700 }}>🩸 Rouse</span>
              )}
            </div>
            {/* notes is the main description field in disciplines.js */}
            {(hoveredPower.notes || hoveredPower.description) && (
              <p style={{ margin: '0 0 6px 0', fontSize: '0.82rem', color: '#a1a1aa', lineHeight: 1.5 }}>
                {hoveredPower.notes || hoveredPower.description}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6 }}>
              {hoveredPower.cost && (
                <div style={{ fontSize: '0.78rem', color: '#a1a1aa' }}>
                  <span style={{ color: '#71717a' }}>Cost: </span>{hoveredPower.cost}
                </div>
              )}
              {hoveredPower.dice_pool && hoveredPower.dice_pool !== '—' && (
                <div style={{ fontSize: '0.78rem', color: '#a1a1aa' }}>
                  <span style={{ color: '#71717a' }}>Pool: </span>{hoveredPower.dice_pool}
                </div>
              )}
              {hoveredPower.duration && (
                <div style={{ fontSize: '0.78rem', color: '#a1a1aa' }}>
                  <span style={{ color: '#71717a' }}>⏱ Duration: </span>{hoveredPower.duration}
                </div>
              )}
              {hoveredPower.amalgam && (
                <div style={{ fontSize: '0.78rem', color: '#a1a1aa' }}>
                  <span style={{ color: '#71717a' }}>Amalgam: </span>{hoveredPower.amalgam}
                </div>
              )}
              {hoveredPower.source && (
                <div style={{ fontSize: '0.75rem', color: '#52525b' }}>
                  {hoveredPower.source}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function LiveSession() {
  const [character, setCharacter] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [trackers, setTrackers] = useState(null);
  const [sessionId, setSessionId] = useState(localStorage.getItem('liveSessionId') || '');
  const [session, setSession] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);

  const [frenzyState, setFrenzyState] = useState(null);
  const isAdmin = session?.isAdmin || character?.role === 'admin' || character?.isST;

  const [difficulty, setDifficulty] = useState(2);
  const [selectedTraits, setSelectedTraits] = useState(['Wits', 'Awareness']);
  const [lastRoll, setLastRoll] = useState(null);
  const [wpSelections, setWpSelections] = useState([]);

  const currentPool = useMemo(() => {
    const trait1 = selectedTraits[0] || null;
    const trait2 = selectedTraits[1] || null;
    return getPoolFromCharacter(sheet, trait1, trait2);
  }, [sheet, selectedTraits]);

  const toggleTrait = (trait) => {
    setSelectedTraits(prev => {
      if (prev.includes(trait)) return prev.filter(t => t !== trait);
      if (prev.length >= 2) return [prev[1], trait];
      return [...prev, trait];
    });
  };

  useEffect(() => {
    api.get('/characters/me').then(({ data }) => {
      const char = data.character || data;
      const parsedSheet = typeof char.sheet === 'string' ? JSON.parse(char.sheet) : char.sheet;
      setCharacter(char);
      setSheet(parsedSheet);
      setTrackers(summarizeTrackers(parsedSheet));
    });
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const sData = await getLiveSession(sessionId);
        setSession(sData.session || sData);
        const bData = await getLiveSessionBroadcasts(sessionId);
        setBroadcasts(bData.broadcasts || bData.messages || []);
      } catch (e) { }
    };
    load();
    const int = setInterval(load, 5000);
    return () => clearInterval(int);
  }, [sessionId]);

  const applySheetUpdate = async (mutator) => {
    setSheet(prev => {
      const next = mutator(JSON.parse(JSON.stringify(prev || {})));
      setTrackers(summarizeTrackers(next));
      if (character) api.put('/characters/me', { ...character, sheet: next });
      return next;
    });
  };

  const pushRoll = async (type, payload) => {
    if (sessionId) await logLiveSessionRoll(sessionId, payload).catch(() => { });
  };

  const executeRoll = async (pool, type, note) => {
    const roll = rollPool(pool, trackers?.hunger ?? 0, difficulty);
    setLastRoll({ ...roll, type, note });
    setWpSelections([]);
    await pushRoll(type, {
      characterId: character?.id, roll_type: type,
      pool: roll.pool, hunger: roll.hunger,
      results: { normal: roll.normalDice, hunger: roll.hungerDice },
      successes: roll.outcome.successes,
      has_critical: roll.outcome.hasCritical,
      has_messy_critical: roll.outcome.hasMessyCritical,
      has_bestial_failure: roll.outcome.hasBestialFailure,
      note,
    });
  };

  const handleWillpowerReroll = async () => {
    if (!lastRoll || !wpSelections.length ||
      trackers.willpower.superficial + trackers.willpower.aggravated >= trackers.willpower.max) return;
    await applySheetUpdate(next => {
      if (!next.willpower) next.willpower = { superficial: 0, aggravated: 0 };
      next.willpower.superficial += 1;
      return next;
    });
    const { rerolled } = rerollNormalDice(lastRoll.normalDice, wpSelections);
    const outcome = computeOutcome(rerolled, lastRoll.hungerDice, difficulty);
    const updated = { ...lastRoll, normalDice: rerolled, outcome, note: 'Willpower Reroll' };
    setLastRoll(updated);
    setWpSelections([]);
    await pushRoll('willpower_reroll', {
      characterId: character?.id, roll_type: 'willpower_reroll',
      pool: updated.pool, hunger: updated.hunger,
      results: { normal: updated.normalDice, hunger: updated.hungerDice },
      successes: updated.outcome.successes, note: 'Spent 1 WP',
    });
  };

  const handleRouse = async (source = 'rouse_check', autoActivate = null) => {
    const result = runRouseCheck(trackers?.hunger ?? 0);
    await applySheetUpdate(next => { next.hunger = result.nextHunger; return next; });
    setLastRoll({
      normalDice: [],
      hungerDice: [result.die],
      outcome: { successes: result.success ? 1 : 0, hasCritical: false, hasMessyCritical: false, hasBestialFailure: false },
      type: source,
      note: result.success ? 'Pass (No Hunger Gained)' : 'Fail (Hunger +1)',
    });
    setWpSelections([]);
    await pushRoll(source, {
      characterId: character?.id, roll_type: source, pool: 1,
      hunger: result.nextHunger,
      results: { normal: [], rouse: [result.die] },
      successes: result.success ? 1 : 0,
      note: result.success ? 'No hunger gained' : 'Hunger +1',
    });
    if (autoActivate) {
      await pushRoll('discipline_activation', {
        characterId: character?.id, roll_type: 'discipline_activation',
        note: `${autoActivate.discName} • ${autoActivate.power.name}`,
        character_name: character?.name || 'Unknown',
        disc: autoActivate.discName,
        power_name: autoActivate.power.name,
      });
    }
  };

  // Called from DisciplinePanel after confirmation
  const handleDisciplineActivate = async (power, discName) => {
    const needsRouse = disciplineRequiresRouse(power);
    if (needsRouse) {
      await handleRouse('discipline_rouse_check', { power, discName });
    } else {
      // No rouse — just broadcast activation to admin
      await pushRoll('discipline_activation', {
        characterId: character?.id, roll_type: 'discipline_activation',
        note: `${discName} • ${power.name}`,
        character_name: character?.name || 'Unknown',
        disc: discName,
        power_name: power.name,
      });
    }
  };

  if (!trackers) return <div className={styles.page}>Loading LARP Interface...</div>;

  const humanity = sheet?.humanity ?? sheet?.morality?.humanity ?? 7;
  const charName = character?.name || sheet?.name || 'Vampire';

  return (
    <div className={styles.page}>
      <div className={styles.playerPanel}>
        <h1 className={styles.title}>Live Action Terminal</h1>

        {/* Thematic Frenzy Alert Banner */}
        {sheet?.frenzyState && FRENZY_ALERTS[sheet.frenzyState] && (
          <div className={styles.trackerCard} style={{ borderColor: FRENZY_ALERTS[sheet.frenzyState].color, borderLeftWidth: '6px', background: 'rgba(24, 24, 27, 0.95)' }}>
            <div className={styles.trackerHeader} style={{ color: FRENZY_ALERTS[sheet.frenzyState].color, margin: 0 }}>
              <span>⚠️ Frenzy State Active</span>
            </div>
            <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.2rem', color: '#ffffff' }}>
              {FRENZY_ALERTS[sheet.frenzyState].label}
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#a1a1aa' }}>
              {FRENZY_ALERTS[sheet.frenzyState].desc}
            </p>
          </div>
        )}

        {/* Session connect bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input className={styles.input} placeholder="Session ID" value={sessionId} onChange={e => { setSessionId(e.target.value); localStorage.setItem('liveSessionId', e.target.value); }} />
          <button className={styles.btnGhost} onClick={() => joinLiveSession(sessionId, { characterId: character?.id })}>Connect</button>
        </div>

        {/* Character identity + frenzy */}
        <FrenzyDisplay charName={charName} frenzyState={frenzyState} isAdmin={isAdmin} onChangeFrenzy={setFrenzyState} />

        {/* Status trackers */}
        <div className={styles.trackerGrid}>
          <div className={styles.trackerCard}>
            <div className={styles.trackerHeader}><span>Hunger</span><span>{trackers.hunger} / 5</span></div>
            <div className={styles.hungerDots}>
              {Array.from({ length: 5 }).map((_, i) => <span key={i} className={i < trackers.hunger ? styles.hungerOn : styles.hungerOff} />)}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1rem' }}>
              <button className={styles.btnGhost} style={{ padding: '0.5rem 0', flex: 1 }} onClick={() => applySheetUpdate(n => { n.hunger = Math.max(0, n.hunger - 1); return n; })}>−1</button>
              <button className={styles.btnGhost} style={{ padding: '0.5rem 0', flex: 1 }} onClick={() => applySheetUpdate(n => { n.hunger = Math.min(5, n.hunger + 1); return n; })}>+1</button>
            </div>
            <button className={styles.btnPrimary} style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => handleRouse()}>Rouse Check</button>
          </div>
          <StatusBar label="Health" sup={trackers.health.superficial} agg={trackers.health.aggravated} max={trackers.health.max} />
          <StatusBar label="Willpower" sup={trackers.willpower.superficial} agg={trackers.willpower.aggravated} max={trackers.willpower.max} />
          <HumanityTracker value={humanity} />
        </div>

        {/* ── DISCIPLINES ── */}
        <DisciplinePanel sheet={sheet} trackers={trackers} onActivate={handleDisciplineActivate} />

        {/* ── CUSTOM ROLL ── */}
        <div className={styles.trackerCard} style={{ marginBottom: '1rem' }}>
          <div className={styles.trackerHeader}>Custom Roll (Select 1 or 2 Traits)</div>
          <div className={styles.traitsContainer}>
            <div className={styles.traitGroup}>
              <div className={styles.traitLabel}>Attributes</div>
              <div className={styles.categoryWrapper}>
                {Object.entries(ATTRIBUTE_GROUPS).map(([category, traits]) => (
                  <div key={`attr-${category}`} className={styles.categoryBlock}>
                    <div className={styles.categoryTitle}>{category}</div>
                    <div className={styles.chipGrid}>
                      {traits.map(attr => {
                        const isActive = selectedTraits.includes(attr);
                        return (
                          <button key={attr} className={isActive ? `${styles.chip} ${styles.chipActive}` : styles.chip} onClick={() => toggleTrait(attr)}>
                            <img src="/img/dice/Success.png" className={styles.chipIcon} alt="" draggable="false" />
                            <span>{attr}</span>
                            <img src="/img/dice/Success.png" className={styles.chipIcon} alt="" draggable="false" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.traitGroup}>
              <div className={styles.traitLabel}>Skills</div>
              <div className={styles.categoryWrapper}>
                {Object.entries(SKILL_GROUPS).map(([category, traits]) => (
                  <div key={`skill-${category}`} className={styles.categoryBlock}>
                    <div className={styles.categoryTitle}>{category}</div>
                    <div className={styles.chipGrid}>
                      {traits.map(skill => {
                        const isActive = selectedTraits.includes(skill);
                        return (
                          <button key={skill} className={isActive ? `${styles.chip} ${styles.chipActive}` : styles.chip} onClick={() => toggleTrait(skill)}>
                            <img src="/img/dice/Success.png" className={styles.chipIcon} alt="" draggable="false" />
                            <span>{skill}</span>
                            <img src="/img/dice/Success.png" className={styles.chipIcon} alt="" draggable="false" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.rollActionRow}>
            <input type="number" min={1} max={10} className={styles.input} style={{ width: 80 }} value={difficulty} onChange={e => setDifficulty(Number(e.target.value))} title="Target Difficulty" />
            <button className={styles.btnPrimary} onClick={() => executeRoll(currentPool, 'pool_roll', selectedTraits.join(' + '))} disabled={selectedTraits.length === 0}>
              Roll {selectedTraits.join(' + ') || 'Nothing'} ({currentPool} Dice)
            </button>
          </div>
        </div>

        {/* ── COMMON QUICK ROLLS ── */}
        <div className={styles.trackerCard} style={{ marginBottom: '1rem' }}>
          <div className={styles.trackerHeader}>Common Checks</div>
          <div className={styles.quickRollGrid}>
            {COMMON_ROLLS.map(item => (
              <button key={item.key} className={styles.btnGhost} onClick={() => executeRoll(getPoolFromCharacter(sheet, item.attribute, item.skill), item.key, item.label)}>
                {item.label} ({getPoolFromCharacter(sheet, item.attribute, item.skill)})
              </button>
            ))}
          </div>
        </div>

        {/* ── ROLL RESULTS ── */}
        {lastRoll?.outcome && (() => {
          const isRouse = lastRoll.type && lastRoll.type.includes('rouse');
          const metDiff = difficulty > 0 ? lastRoll.outcome.successes >= difficulty : lastRoll.outcome.successes > 0;
          const successes = lastRoll.outcome.successes;

          let art = '/img/dice/Success.png';
          if (!isRouse) {
            if (lastRoll.outcome.hasMessyCritical && metDiff) art = '/img/dice/MessyCrit.png';
            else if (lastRoll.outcome.hasCritical && metDiff) art = '/img/dice/Crit.png';
            else if (lastRoll.outcome.hasBestialFailure || !metDiff) art = '/img/dice/BestialFail.png';
          } else {
            art = successes > 0 ? '/img/dice/Success.png' : '/img/dice/BestialFail.png';
          }

          let labelText = '';
          if (isRouse) labelText = successes > 0 ? 'Rouse Check Passed' : 'Rouse Check Failed';
          else if (lastRoll.outcome.hasBestialFailure) labelText = `${successes} Bestial Failure`;
          else if (successes === 0) labelText = 'Total Failure';
          else if (lastRoll.outcome.hasMessyCritical && metDiff) labelText = `${successes} Messy Critical`;
          else if (lastRoll.outcome.hasCritical && metDiff) labelText = `${successes} Crit Success`;
          else labelText = `${successes} Success${successes > 1 ? 'es' : ''}`;

          const getDieImage = (die, isHunger) => {
            if (isHunger) {
              if (die === 10) return '/img/dice/MessyCrit.png';
              if (die === 1) return '/img/dice/BestialFail.png';
              if (die >= 6) return '/img/dice/Success.png';
              return null;
            }
            if (die === 10) return '/img/dice/Crit.png';
            if (die >= 6) return '/img/dice/Success.png';
            return null;
          };

          return (
            <div className={styles.resultCard}>
              <img src={art} alt={labelText} className={styles.outcomeImage} draggable="false" />
              <h2 style={{ color: lastRoll.outcome.hasMessyCritical || lastRoll.outcome.hasBestialFailure || (isRouse && successes === 0) ? '#e11d48' : 'inherit', margin: '0.5rem 0' }}>{labelText}</h2>
              {isRouse ? <p className={styles.subtle} style={{ color: successes > 0 ? '#a1a1aa' : '#e11d48' }}>{lastRoll.note}</p> : <p className={styles.subtle}>Target Diff {difficulty}</p>}
              <div className={styles.diceRow}>
                {lastRoll.normalDice.map((die, i) => {
                  const isSuccess = die >= 6;
                  const imgSrc = getDieImage(die, false);
                  const isSelected = wpSelections.includes(i);
                  return (
                    <div key={`n-${i}`} className={styles.diceCol}>
                      <button className={`${styles.boxDie} ${isSuccess ? styles.boxFilled : styles.boxEmpty} ${isSelected ? styles.boxSelected : ''}`} onClick={() => setWpSelections(prev => prev.includes(i) ? prev.filter(v => v !== i) : prev.length < 3 ? [...prev, i] : prev)} title={isSelected ? 'Deselect' : 'Select for Willpower reroll'}>
                        {imgSrc && <img src={imgSrc} alt={`Die rolled ${die}`} className={styles.dieImage} />}
                      </button>
                      <span className={styles.diceNumber}>{die}</span>
                    </div>
                  );
                })}
                {lastRoll.hungerDice.map((die, i) => {
                  const isSuccess = die >= 6;
                  const imgSrc = getDieImage(die, true);
                  return (
                    <div key={`h-${i}`} className={styles.diceCol}>
                      <div className={`${styles.boxDie} ${styles.boxHunger} ${isSuccess ? styles.boxHungerFilled : styles.boxEmpty}`}>
                        {imgSrc && <img src={imgSrc} alt={`Hunger Die rolled ${die}`} className={styles.dieImage} />}
                      </div>
                      <span className={styles.diceNumber}>{die}</span>
                    </div>
                  );
                })}
              </div>
              {lastRoll.normalDice.some(d => d < 6) && !isRouse && (() => {
                const maxWp = trackers.willpower.max;
                const usedWp = trackers.willpower.superficial + trackers.willpower.aggravated;
                const remainingWp = Math.max(0, maxWp - usedWp);
                const canAfford = remainingWp > 0;
                return (
                  <div style={{ marginTop: '1rem', width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.85rem', fontWeight: 700, color: '#a1a1aa' }}>
                      <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Willpower</span>
                      <span style={{ color: canAfford ? '#f4f4f5' : '#ef4444' }}>{remainingWp} / {maxWp} Remaining</span>
                    </div>
                    <button className={styles.btnPrimary} onClick={handleWillpowerReroll} disabled={!wpSelections.length || !canAfford} style={{ width: '100%' }}>
                      {canAfford ? `Spend 1 WP to Reroll (${wpSelections.length}/3)` : 'No Willpower Remaining'}
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ST Broadcasts */}
        {broadcasts.length > 0 && (
          <div className={styles.trackerCard} style={{ marginTop: '1rem', border: '1px solid #e11d48' }}>
            <div className={styles.trackerHeader}>ST Broadcasts</div>
            {broadcasts.slice(0, 3).map((msg, i) => (
              <div key={i} style={{ padding: '0.5rem 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>{msg.message}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}