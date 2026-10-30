// src/features/admin/AdminFeedingTab.jsx
//
// Admin > Feeding. Pick a cycle (the current one or any past one), then:
//   - countdowns (current cycle) and the cycle's numbers;
//   - Recent Feedings first: filter, search, click one for its full detail and Undo;
//   - Players: who fed and how many times, hunts used, ghouls; click one for everything
//     about them this cycle (feedings with Undo, Undo all, Mark fed, Hunger, their ghouls);
//   - collapsible Ghouls, Herd and Tools sections.
// Details open in a drawer (a bottom sheet on phones). Undos call back/routes/feeding.js with
// ?cycle=N, so a past cycle can be fixed too; they change the sheet and domain as they are now.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/AdminFeeding.module.css';
import FaGlyph from '../../ui/FaGlyph';
import { FEEDING_ICONS } from '../../data/feedingIcons';
import { formatAthensDate, formatAthensDateTime } from '../../utils/dateFormatter';
import { getDivisionName } from '../../constants/divisionNames';

/* ─────────────────────────── shared bits ─────────────────────────── */

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return 'due';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return days ? `${days}d ${hours}h` : `${hours}h ${mins}m`;
}

const OUTCOME = {
  bestial_failure: { label: 'Bestial Failure', color: '#ff6b6b', icon: FEEDING_ICONS.skull },
  failure: { label: 'Failure', color: '#ff8a8a', icon: FEEDING_ICONS.triangleExclamation },
  success: { label: 'Success', color: 'var(--color-success, #00e676)', icon: FEEDING_ICONS.circleCheck },
  critical: { label: 'Critical', color: 'var(--color-success, #00e676)', icon: FEEDING_ICONS.circleCheck },
  messy_critical: { label: 'Messy Critical', color: '#ffb347', icon: FEEDING_ICONS.triangleExclamation },
  herd: { label: 'Herd', color: '#7ecfff', icon: FEEDING_ICONS.droplet },
  manual: { label: 'Storyteller', color: '#b388ff', icon: FEEDING_ICONS.check },
  downtime: { label: 'Safe (Downtime)', color: '#7ecfff', icon: FEEDING_ICONS.shieldHalved },
};
const outcomeOf = (f) => (f.status === 'pending'
  ? { label: 'Pending roll', color: '#ffb347', icon: FEEDING_ICONS.clock }
  : OUTCOME[f.outcome] || { label: f.outcome, color: 'var(--text-secondary)', icon: FEEDING_ICONS.droplet });
const NOT_HUNTS = ['herd', 'manual', 'downtime'];
const FAILED = ['failure', 'bestial_failure', 'messy_critical'];

const GHOUL_STATE = {
  fed: { label: 'Fed', color: 'var(--color-success, #00e676)' },
  hungry: { label: 'Needs feeding', color: '#ffb347' },
  starved: { label: 'Starved', color: '#ff6b6b' },
  none: { label: 'Nothing recorded', color: 'var(--text-secondary)' },
};
const GHOUL_METHOD = {
  early: 'fed early', upkeep: 'fed by owner at upkeep', random: 'fed by a random member',
  let_starve: 'let go', hunger_5: 'feeder at Hunger 5', no_feeder: 'no members',
};

const parseDice = (v) => {
  if (Array.isArray(v)) return v;
  try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
};
const hungerAfter = (f) => (f.status === 'resolved' && f.hunger_before != null
  ? Number(f.hunger_before) + Number(f.hunger_delta || 0) : null);
const whereOf = (f) => ({ herd: 'Herd', manual: 'Recorded by a Storyteller', downtime: 'Downtime action' }[f.outcome]
  || getDivisionName(f.division) || `Division ${f.division}`);

// What undoing a feeding reverses (shown before confirming).
function undoWhat(f, isCurrent) {
  const parts = [];
  if (f.status === 'resolved' && f.hunger_delta) parts.push(`Hunger ${f.hunger_delta > 0 ? '-' : '+'}${Math.abs(f.hunger_delta)}`);
  if (f.wp_rerolled) parts.push('1 Willpower back');
  if (f.status === 'resolved' && f.safety_delta) parts.push(`domain Safety ${f.safety_delta > 0 ? '-' : '+'}${Math.abs(f.safety_delta)}`);
  if (f.outcome === 'herd') parts.push('1 Herd point back');
  if (f.outcome === 'downtime') parts.push('the downtime action back');
  return `Undo: ${parts.join(', ') || 'remove the roll'}.${isCurrent ? ' The player can feed again.' : ' Applied to the sheet and domain as they are now.'}`;
}

// Two-step undo: the first click arms it, the second runs it; it disarms itself after 4 s.
function UndoButton({ onConfirm, label = 'Undo', what }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  const click = async (e) => {
    e.stopPropagation();
    if (!armed) { setArmed(true); return; }
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); setArmed(false); }
  };
  return (
    <button type="button" onClick={click} disabled={busy} title={what}
      className={`${styles.btn} ${armed ? styles.btnArmed : styles.btnDanger}`}>
      <FaGlyph icon={FEEDING_ICONS.arrowsRotate} size={11} />
      {busy ? 'Undoing...' : armed ? 'Confirm undo' : label}
    </button>
  );
}

function Kpi({ label, value, sub, color, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
      className={`${styles.kpi} ${onClick ? styles.kpiButton : ''}`} style={color ? { '--kpi': color } : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </Tag>
  );
}

function Chips({ options, value, onChange }) {
  return (
    <div className={styles.chips} role="group">
      {options.map(([key, label]) => (
        <button key={key} type="button" aria-pressed={value === key}
          className={`${styles.chip} ${value === key ? styles.chipOn : ''}`} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Drawer({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHead}>
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className={`${styles.btn} ${styles.close}`} onClick={onClose} aria-label="Close">
            <FaGlyph icon={FEEDING_ICONS.xmark} size={12} />
          </button>
        </div>
        {children}
      </aside>
    </div>,
    document.body
  );
}

// A collapsible section (native <details>).
function Fold({ title, icon, count, defaultOpen = false, right, children }) {
  return (
    <details className={styles.section} open={defaultOpen}>
      <summary>
        <div className={styles.sectionHead}>
          <h3>
            <span className={styles.chevron}><FaGlyph icon={FEEDING_ICONS.arrowRight} size={11} /></span>
            <FaGlyph icon={icon} size={15} />
            {title}
          </h3>
          {count != null && <span className={styles.count}>{count}</span>}
          {right && <div className={styles.headRight} onClick={(e) => e.preventDefault()}>{right}</div>}
        </div>
      </summary>
      {children}
    </details>
  );
}

// Domain Safety around a hunt: before -> after (stored since migration 0070) and the rating now.
function safetyOf(f) {
  if (NOT_HUNTS.includes(f.outcome) || f.status !== 'resolved') return null;
  const delta = Number(f.safety_delta || 0);
  const before = f.safety_before != null ? Number(f.safety_before) : null;
  const after = before != null ? Math.max(0, Math.min(10, before + delta)) : null;
  return { before, after, delta, now: f.current_domain_safety != null ? Number(f.current_domain_safety) : null };
}
const safetyColor = (v) => (v == null ? undefined : v >= 7 ? 'var(--color-success, #00e676)' : v >= 4 ? '#ffb347' : '#ff6b6b');
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

// Hunger now with instant -/+ (the character's sheet, not the roll).
function HungerControl({ value, busy, onAdjust, compact = false }) {
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  return (
    <span className={styles.hungerCtl} onClick={(e) => e.stopPropagation()}>
      {!compact && <span className={styles.hungerLabel}>Hunger now</span>}
      <button type="button" className={styles.stepBtn} disabled={busy || value <= 0} onClick={stop(() => onAdjust(-1))} aria-label="Hunger -1">−</button>
      <HungerDrops value={value} />
      <b className={styles.hungerNum}>{value}</b>
      <button type="button" className={styles.stepBtn} disabled={busy || value >= 5} onClick={stop(() => onAdjust(1))} aria-label="Hunger +1">+</button>
    </span>
  );
}

function Fact({ label, children, sub, color }) {
  return (
    <div className={styles.fact}>
      <span>{label}</span>
      <strong style={color ? { color } : undefined}>{children}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function HungerDrops({ value }) {
  return (
    <span className={styles.drops} aria-label={`Hunger ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= value ? styles.on : undefined}><FaGlyph icon={FEEDING_ICONS.droplet} size={10} /></span>)}
    </span>
  );
}

/* ─────────────────────────── drawers ─────────────────────────── */

function FeedingDetail({ f, isCurrent, onUndo, onOpenPlayer }) {
  const o = outcomeOf(f);
  const normal = parseDice(f.normal_dice);
  const hunger = parseDice(f.hunger_dice);
  const after = hungerAfter(f);
  const isHunt = !NOT_HUNTS.includes(f.outcome);
  return (
    <>
      <div className={styles.block} style={{ borderLeft: `3px solid ${o.color}` }}>
        <h4>Outcome</h4>
        <div className={styles.row} style={{ color: o.color, fontWeight: 800, fontSize: '1.05rem' }}>
          <FaGlyph icon={o.icon} size={15} /> {o.label}
        </div>
        {f.failure_reason && <p className={styles.muted} style={{ fontStyle: 'italic', margin: '0.4rem 0 0' }}>{f.failure_reason}</p>}
      </div>
      {isHunt && (normal.length > 0 || hunger.length > 0) && (
        <div className={styles.block}>
          <h4>Dice · {f.pool_label} · Pool {f.dice_pool}{f.bonus_dice ? ` (+${f.bonus_dice} Chasse)` : ''} · Difficulty {f.difficulty}</h4>
          <div className={styles.dice}>
            {normal.map((d, i) => <span key={`n${i}`} className={`${styles.die} ${d >= 6 ? styles.dieHit : ''}`}>{d}</span>)}
            {hunger.map((d, i) => <span key={`h${i}`} className={`${styles.die} ${styles.dieHunger} ${d >= 6 ? styles.dieHit : ''}`}>{d}</span>)}
          </div>
          {f.wp_rerolled ? <p className={styles.muted} style={{ margin: '0.4rem 0 0' }}>Willpower spent on a reroll.</p> : null}
        </div>
      )}
      <div className={styles.block}>
        <h4>Details</h4>
        <dl className={styles.facts}>
          <dt>Character</dt>
          <dd><button type="button" className={styles.rowLink} onClick={onOpenPlayer}>{f.character_name}</button></dd>
          {f.predator_type && <><dt>Predator</dt><dd>{f.predator_type}</dd></>}
          <dt>Where</dt>
          <dd>{whereOf(f)}{isHunt && f.domain_owner ? ` (claimed by ${f.domain_owner})` : ''}</dd>
          <dt>Hunger</dt>
          <dd>{f.hunger_before}{after != null ? ` → ${after}` : ' (not applied yet)'}</dd>
          {isHunt && (() => {
            const sf = safetyOf(f);
            if (!sf) return null;
            return (
              <><dt>Safety</dt><dd>
                {sf.before != null ? `${sf.before} → ${sf.after} (${signed(sf.delta)})` : `change ${signed(sf.delta)}`}
                {sf.now != null && <> · now <b style={{ color: safetyColor(sf.now) }}>{sf.now}/10</b></>}
              </dd></>
            );
          })()}
          <dt>Cycle</dt><dd>{f.cycle_index}</dd>
          <dt>When</dt><dd>{formatAthensDateTime(f.created_at)}</dd>
        </dl>
      </div>
      <div className={styles.row}>
        <UndoButton label="Undo this feeding" what={undoWhat(f, isCurrent)} onConfirm={onUndo} />
        <span className={styles.muted}>{undoWhat(f, isCurrent)}</span>
      </div>
    </>
  );
}

function PlayerDetail({ p, feedings, ghouls, max, isCurrent, cycleIndex, onChanged, onOpenFeeding, notify, onHunger, hungerBusy }) {
  const [hungerAfterPick, setHungerAfterPick] = useState(Math.max(1, p.hunger - 1));
  const call = async (fn, failText, okText) => {
    try {
      await fn();
      if (okText) notify(okText);
      await onChanged();
    } catch (e) {
      notify(formatApiError(e, failText), true);
    }
  };
  const q = `?cycle=${cycleIndex}`;
  return (
    <>
      <div className={styles.block}>
        <h4>Now</h4>
        <HungerControl value={p.hunger} busy={hungerBusy} onAdjust={(d) => onHunger(p.id, d)} />
        <div className={styles.muted} style={{ marginTop: '0.4rem' }}>{p.predatorType || 'no Predator Type'}{!p.canAutomate && ' (needs a Storyteller)'}</div>
        <div className={styles.row} style={{ marginTop: '0.5rem' }}>
          <Link to={`/admin/character/${p.id}`} target="_blank" rel="noopener noreferrer" className={styles.btn}>Open sheet</Link>
        </div>
      </div>

      <div className={styles.block}>
        <h4>Cycle {cycleIndex}: {p.hunts} / {max} hunts · fed {feedings.filter((f) => f.status === 'resolved').length} time(s)</h4>
        {feedings.length === 0 && <p className={styles.empty} style={{ marginTop: 0 }}>No feedings this cycle.</p>}
        {feedings.map((f) => {
          const o = outcomeOf(f);
          const after = hungerAfter(f);
          return (
            <div key={f.id} className={styles.entry} style={{ '--outcome': o.color }}>
              <div role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => onOpenFeeding(f)}
                onKeyDown={(e) => { if (e.key === 'Enter') onOpenFeeding(f); }}>
                <b>{o.label}</b>
                {whereOf(f)} · Hunger {f.hunger_before}{after != null ? ` → ${after}` : ''} · {formatAthensDateTime(f.created_at)}
              </div>
              <UndoButton what={undoWhat(f, isCurrent)}
                onConfirm={() => call(() => api.post(`/admin/feeding/${f.id}/allow-reroll`), 'Undo failed', `${p.name}: feeding undone.`)} />
            </div>
          );
        })}
        {feedings.length > 1 && (
          <UndoButton label={`Undo all ${feedings.length}`}
            what={`Undo every feeding ${p.name} made in cycle ${cycleIndex}, newest first.`}
            onConfirm={() => call(() => api.post(`/admin/feeding/character/${p.id}/undo-cycle${q}`), 'Undo failed', `${p.name}: all feedings of cycle ${cycleIndex} undone.`)} />
        )}
        {isCurrent && !p.fed && (
          <div className={styles.row} style={{ marginTop: '0.75rem' }}>
            <label className={styles.muted}>
              Hunger after{' '}
              <select className={styles.select} value={hungerAfterPick} onChange={(e) => setHungerAfterPick(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button type="button" className={styles.btn}
              onClick={() => call(() => api.post('/admin/feeding/manual', { character_id: p.id, hunger: hungerAfterPick }), 'Recording the feeding failed', `${p.name} marked as fed.`)}>
              <FaGlyph icon={FEEDING_ICONS.check} size={12} /> Mark fed
            </button>
          </div>
        )}
      </div>

      <div className={styles.block}>
        <h4>Ghouls ({ghouls.length})</h4>
        {ghouls.length === 0 && <p className={styles.empty} style={{ marginTop: 0 }}>No ghouls.</p>}
        {ghouls.map((g) => (
          <GhoulEntry key={g.id} g={g} isCurrent={isCurrent}
            onUndo={() => call(() => api.post(`/admin/feeding/ghouls/${g.id}/undo${q}`), 'Undo failed', `${g.name}: ghoul feeding undone.`)} />
        ))}
      </div>
    </>
  );
}

function GhoulEntry({ g, isCurrent, onUndo }) {
  const st = GHOUL_STATE[g.state] || GHOUL_STATE.hungry;
  return (
    <div className={styles.entry} style={{ '--outcome': st.color }}>
      <div>
        <b>{g.name} · {st.label}</b>
        T{g.tier} · {g.coterie_id ? `${g.coterie_name} coterie` : 'personal'}
        {g.current && ` · ${GHOUL_METHOD[g.current.method] || g.current.method}${g.current.fed_by_name ? ` (${g.current.fed_by_name})` : ''}`}
        {isCurrent && !g.current && g.let_starve && ' · will be let go'}
      </div>
      {g.current && (
        <UndoButton what={g.current.status === 'fed'
          ? `Undo: ${g.name} needs feeding again${g.current.hunger_after > g.current.hunger_before ? `, ${g.current.fed_by_name || 'the feeder'} gets 1 Hunger back` : ''}.`
          : `Undo: ${g.name} is no longer starved for that cycle.`}
          onConfirm={onUndo} />
      )}
    </div>
  );
}

/* ─────────────────────────── the tab ─────────────────────────── */

export default function AdminFeedingTab() {
  const [cycles, setCycles] = useState([]);
  const [cycle, setCycle] = useState(null); // null = current
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [drawer, setDrawer] = useState(null); // { type: 'feeding', id } | { type: 'player', id }
  const [feedFilter, setFeedFilter] = useState('all');
  const [feedSearch, setFeedSearch] = useState('');
  const [showAllFeed, setShowAllFeed] = useState(false);
  const [playerFilter, setPlayerFilter] = useState('all');
  const [ghoulFilter, setGhoulFilter] = useState('all');
  // Instant Hunger edits: character id -> Hunger, shown everywhere until the next load.
  const [hungerNow, setHungerNow] = useState({});
  const [hungerBusy, setHungerBusy] = useState({});

  const notify = useCallback((text, isError = false) => {
    setNotice({ text, isError });
    setTimeout(() => setNotice(null), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      const cyc = (await api.get('/admin/feeding/cycles')).data;
      setCycles(cyc.cycles);
      const index = cycle ?? cyc.current;
      const q = `?cycle=${index}`;
      const [status, stats, log, roster, ghouls, herd] = await Promise.all([
        api.get('/feeding/status'),
        api.get(`/admin/feeding/stats${q}`),
        api.get(`/admin/feeding/log${q}`),
        api.get(`/admin/feeding/roster${q}`),
        api.get(`/admin/feeding/ghouls${q}`),
        api.get('/admin/feeding/herd-roster'),
      ]);
      setHungerNow({});
      setData({
        index,
        isCurrent: index === cyc.current,
        status: status.data,
        stats: stats.data,
        log: log.data.log || [],
        roster: roster.data.characters || [],
        max: roster.data.huntsPerCycle || 3,
        ghouls: ghouls.data,
        herd: herd.data.roster || [],
      });
    } catch (e) {
      notify(formatApiError(e, 'Failed to load feeding data'), true);
    } finally {
      setLoading(false);
    }
  }, [cycle, notify]);
  useEffect(() => { load(); }, [load]);

  const adjustHunger = useCallback(async (characterId, delta) => {
    setHungerBusy((b) => ({ ...b, [characterId]: true }));
    try {
      const { data: d } = await api.post('/admin/feeding/hunger-adjust', { character_id: characterId, delta });
      setHungerNow((h) => ({ ...h, [characterId]: d.hungerAfter }));
      notify(`${d.name}: Hunger ${d.hungerBefore} → ${d.hungerAfter}`);
    } catch (e) {
      notify(formatApiError(e, 'Hunger change failed'), true);
    } finally {
      setHungerBusy((b) => ({ ...b, [characterId]: false }));
    }
  }, [notify]);

  const huntingIn = useCountdown(data?.stats?.huntingOpen ? data.stats.huntingClosesAt : null);
  const upkeepIn = useCountdown(data?.stats?.nextUpkeepAt);
  const openingIn = useCountdown(data?.stats?.nextOpening ? `${data.stats.nextOpening}T00:00:00` : null);

  const ghoulList = useMemo(() => data?.ghouls?.ghouls || [], [data]);
  const ghoulsByOwner = useMemo(() => {
    const m = new Map();
    for (const g of ghoulList) {
      if (!m.has(g.owner_character_id)) m.set(g.owner_character_id, []);
      m.get(g.owner_character_id).push(g);
    }
    return m;
  }, [ghoulList]);

  const players = useMemo(() => (data?.roster || []).map((p) => {
    const mine = ghoulsByOwner.get(p.id) || [];
    return {
      ...p,
      hunger: hungerNow[p.id] ?? p.hunger,
      timesFed: p.feedings.filter((f) => f.status === 'resolved').length,
      ghouls: mine,
      ghoulsUnfed: mine.filter((g) => g.state === 'hungry' || g.state === 'starved').length,
    };
  }), [data, ghoulsByOwner, hungerNow]);

  if (loading) return <div className={styles.empty}>Loading Feeding Control...</div>;
  if (!data) return <div className={`${styles.notice} ${styles.noticeErr}`}>{notice?.text || 'Feeding data unavailable.'}</div>;

  const { stats, status, isCurrent, max, index } = data;
  const isOnline = status?.enabled !== false;

  // Recent feedings
  const term = feedSearch.trim().toLowerCase();
  const feed = data.log
    .filter((f) => feedFilter === 'all'
      || (feedFilter === 'hunts' && !NOT_HUNTS.includes(f.outcome))
      || (feedFilter === 'failed' && FAILED.includes(f.outcome))
      || (feedFilter === 'pending' && f.status === 'pending')
      || f.outcome === feedFilter)
    .filter((f) => !term || (f.character_name || '').toLowerCase().includes(term) || whereOf(f).toLowerCase().includes(term));
  const shownFeed = showAllFeed ? feed : feed.slice(0, 12);

  // Players
  const PLAYER_FILTERS = {
    all: () => true,
    unfed: (p) => !p.fed,
    multi: (p) => p.timesFed >= 2,
    maxed: (p) => p.hunts >= max,
    ghouls: (p) => p.ghouls.length > 0,
    ghoulsUnfed: (p) => p.ghoulsUnfed > 0,
  };
  const shownPlayers = players.filter(PLAYER_FILTERS[playerFilter])
    .sort((a, b) => (a.fed - b.fed) || (b.timesFed - a.timesFed) || a.name.localeCompare(b.name));
  const count = (key) => players.filter(PLAYER_FILTERS[key]).length;

  const shownGhouls = ghoulList.filter((g) => ghoulFilter === 'all' || g.state === ghoulFilter);
  const ghoulsUnfed = ghoulList.filter((g) => g.state === 'hungry').length;

  const changed = async () => { await load(); };
  const openPlayer = (id) => setDrawer({ type: 'player', id });
  const openFeeding = (id) => setDrawer({ type: 'feeding', id });
  const drawerFeeding = drawer?.type === 'feeding' ? data.log.find((f) => f.id === drawer.id) : null;
  const drawerPlayer = drawer?.type === 'player' ? players.find((p) => p.id === drawer.id) : null;

  const confirmRun = async (question, fn, okText, failText) => {
    if (!window.confirm(question)) return;
    setBusy(true);
    try {
      const res = await fn();
      notify(typeof okText === 'function' ? okText(res.data) : okText);
      await load();
    } catch (e) {
      notify(formatApiError(e, failText), true);
    } finally {
      setBusy(false);
    }
  };

  const cycleLabel = (c) => `Cycle ${c.cycleIndex}${c.title ? `: ${c.title}` : ''}${c.isCurrent ? ' (current)' : ''}${c.feedings ? ` · ${c.feedings} feedings` : ''}`;
  const thisCycle = cycles.find((c) => c.cycleIndex === index);

  return (
    <div className={styles.root}>
      {/* ── Top bar ── */}
      <header className={styles.topbar}>
        <h2 className={styles.topTitle}>
          <FaGlyph icon={FEEDING_ICONS.droplet} size={20} />
          <span>
            Feeding Control
            <small>Up to {max} hunts a cycle · first feeding unlocks downtimes · cycles follow the Calendar</small>
          </span>
        </h2>
        <div className={styles.topControls}>
          <select className={styles.select} value={index} aria-label="Cycle"
            onChange={(e) => { setCycle(Number(e.target.value)); setDrawer(null); setShowAllFeed(false); }}>
            {cycles.map((c) => <option key={c.cycleIndex} value={c.cycleIndex}>{cycleLabel(c)}</option>)}
          </select>
          <button type="button" className={`${styles.switch} ${isOnline ? styles.switchOn : ''}`} disabled={busy}
            title={isOnline ? 'Players must feed before submitting downtimes. Click to switch off.' : 'Feeding is off: downtimes submit freely. Click to switch on.'}
            onClick={() => confirmRun(
              isOnline ? 'Switch the Feeding system OFF? Downtimes will no longer need a feeding.' : 'Switch the Feeding system ON?',
              () => api.post('/admin/feeding/status', { enabled: !isOnline }),
              `Feeding is now ${isOnline ? 'OFF' : 'ON'}.`, 'Failed to switch Feeding')}>
            {isOnline ? 'ON' : 'OFF'} <span className={styles.switchTrack} />
          </button>
          <button type="button" className={styles.btn} onClick={load} aria-label="Refresh">
            <FaGlyph icon={FEEDING_ICONS.arrowsRotate} size={12} /> Refresh
          </button>
        </div>
      </header>

      {notice && <div className={`${styles.notice} ${notice.isError ? styles.noticeErr : styles.noticeOk}`}>{notice.text}</div>}
      {!isCurrent && (
        <div className={`${styles.notice} ${styles.noticePast}`}>
          Viewing past cycle {index}{thisCycle?.closing_date ? ` (closed ${formatAthensDate(thisCycle.closing_date)})` : ''}.
          Undos still work: they change the character sheet and domain as they are today.{' '}
          <button type="button" className={styles.rowLink} onClick={() => setCycle(null)}>Back to the current cycle</button>
        </div>
      )}

      {/* ── Countdowns (current cycle) ── */}
      {isCurrent && (
        <div className={styles.strip}>
          <Kpi label="Hunting" value={stats.huntingOpen ? `closes in ${huntingIn}` : 'Closed'}
            sub={`${formatAthensDate(status.cycleStart || thisCycle?.opening_date)} to ${formatAthensDate(status.cycleEnd || thisCycle?.closing_date)}`}
            color={stats.huntingOpen ? 'var(--color-success, #00e676)' : '#ff8a8a'} />
          {stats.nextOpening && <Kpi label="Next cycle opens" value={`in ${openingIn}`} sub={formatAthensDate(stats.nextOpening)} color="#7ecfff" />}
          {stats.nextUpkeepAt && <Kpi label="Ghoul upkeep" value={`in ${upkeepIn}`} sub={formatAthensDateTime(stats.nextUpkeepAt)} color="#ffb347" />}
        </div>
      )}

      {/* ── Numbers ── */}
      <div className={styles.strip}>
        <Kpi label="Players fed" value={`${stats.players.fed} / ${stats.players.active}`}
          color={stats.players.fed === stats.players.active ? 'var(--color-success, #00e676)' : '#ffb347'}
          onClick={() => setPlayerFilter('unfed')} sub="show who hasn't" />
        <Kpi label="Fed 2+ times" value={count('multi')} onClick={() => setPlayerFilter('multi')} sub="show them" />
        <Kpi label="Hunts rolled" value={stats.counts.hunts} sub={`${stats.successPct != null ? `${stats.successPct}% success` : 'no rolls'}`}
          color={stats.successPct >= 70 ? 'var(--color-success, #00e676)' : stats.successPct >= 40 ? '#ffb347' : undefined} />
        <Kpi label="Herd · Safe · ST" value={`${stats.counts.herd || 0} · ${stats.counts.safe || 0} · ${stats.counts.manual || 0}`} color="#7ecfff" />
        <Kpi label="Ghouls unfed" value={`${ghoulsUnfed} / ${ghoulList.length}`} color={ghoulsUnfed ? '#ffb347' : undefined}
          onClick={() => setPlayerFilter('ghoulsUnfed')} sub="show owners" />
      </div>

      {/* ── Recent feedings ── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h3><FaGlyph icon={FEEDING_ICONS.clock} size={15} /> Recent Feedings</h3>
          <span className={styles.count}>{feed.length}</span>
        </div>
        <div className={styles.row}>
          <Chips value={feedFilter} onChange={(v) => { setFeedFilter(v); setShowAllFeed(false); }} options={[
            ['all', 'All'], ['hunts', 'Hunts'], ['failed', 'Went wrong'], ['herd', 'Herd'], ['downtime', 'Safe'], ['manual', 'Storyteller'], ['pending', 'Pending'],
          ]} />
          <input className={styles.search} type="search" placeholder="Search character or place" value={feedSearch}
            onChange={(e) => setFeedSearch(e.target.value)} aria-label="Search feedings" />
        </div>
        {feed.length === 0 ? <p className={styles.empty}>No feedings match.</p> : (
          <div className={styles.feed}>
            {shownFeed.map((f) => {
              const o = outcomeOf(f);
              const after = hungerAfter(f);
              const sf = safetyOf(f);
              const isHunt = !NOT_HUNTS.includes(f.outcome);
              const now = hungerNow[f.character_id] ?? (f.current_hunger != null ? Number(f.current_hunger) : 1);
              return (
                <article key={f.id} className={styles.feedCard} style={{ '--outcome': o.color }}>
                  <div className={styles.feedTop}>
                    <span className={styles.feedIcon}><FaGlyph icon={o.icon} size={16} /></span>
                    <div className={styles.feedWho}>
                      <button type="button" className={styles.rowLink} onClick={() => openPlayer(f.character_id)}>{f.character_name}</button>
                      <small>{f.predator_type || 'no Predator Type'}{isHunt && f.pool_label ? ` · ${f.pool_label}` : ''}</small>
                    </div>
                    <span className={styles.outcomePill}>{o.label}</span>
                  </div>
                  <div className={styles.facts4}>
                    <Fact label="Where" sub={isHunt ? (f.domain_owner ? `claimed by ${f.domain_owner}` : 'unclaimed') : null}>
                      {whereOf(f)}
                    </Fact>
                    {sf ? (
                      <Fact label="Safety" color={safetyColor(sf.after ?? sf.now)}
                        sub={sf.now != null ? `now ${sf.now}/10` : null}>
                        {sf.before != null ? `${sf.before} → ${sf.after}` : signed(sf.delta)}
                        {sf.before != null && <em className={styles.delta}> {signed(sf.delta)}</em>}
                      </Fact>
                    ) : (
                      <Fact label="Safety" sub={isHunt ? 'not applied yet' : 'no domain'}>-</Fact>
                    )}
                    <Fact label="Hunger (feeding)" color={after != null && after < f.hunger_before ? 'var(--color-success, #00e676)' : undefined}
                      sub={isHunt ? `Pool ${f.dice_pool} · Diff ${f.difficulty}${f.wp_rerolled ? ' · WP reroll' : ''}` : null}>
                      {f.hunger_before}{after != null ? ` → ${after}` : ''}
                    </Fact>
                    <Fact label="When" sub={`cycle ${f.cycle_index}`}>{formatAthensDateTime(f.created_at)}</Fact>
                  </div>
                  {f.failure_reason && <p className={styles.story}>{f.failure_reason}</p>}
                  <div className={styles.feedBottom}>
                    <HungerControl value={now} busy={!!hungerBusy[f.character_id]} onAdjust={(d) => adjustHunger(f.character_id, d)} />
                    <div className={styles.row}>
                      <button type="button" className={styles.btn} onClick={() => openFeeding(f.id)}>Details</button>
                      <UndoButton what={undoWhat(f, isCurrent)} onConfirm={async () => {
                        try { await api.post(`/admin/feeding/${f.id}/allow-reroll`); notify(`${f.character_name}: feeding undone.`); await changed(); }
                        catch (e) { notify(formatApiError(e, 'Undo failed'), true); }
                      }} />
                    </div>
                  </div>
                </article>
              );
            })}
            {feed.length > 12 && (
              <button type="button" className={`${styles.btn} ${styles.more}`} onClick={() => setShowAllFeed((v) => !v)}>
                {showAllFeed ? 'Show fewer' : `Show all ${feed.length}`}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Players ── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h3><FaGlyph icon={FEEDING_ICONS.diceD20} size={15} /> Players</h3>
          <span className={styles.count}>{shownPlayers.length}</span>
        </div>
        <Chips value={playerFilter} onChange={setPlayerFilter} options={[
          ['all', `All ${players.length}`], ['unfed', `Not fed ${count('unfed')}`], ['multi', `Fed 2+ ${count('multi')}`],
          ['maxed', `${max}/${max} hunts ${count('maxed')}`], ['ghouls', `Own ghouls ${count('ghouls')}`], ['ghoulsUnfed', `Ghoul unfed ${count('ghoulsUnfed')}`],
        ]} />
        {shownPlayers.length === 0 ? <p className={styles.empty}>Nobody matches.</p> : (
          <div className={styles.players}>
            {shownPlayers.map((p) => {
              const ghoulColor = p.ghouls.some((g) => g.state === 'starved') ? '#ff6b6b' : p.ghoulsUnfed ? '#ffb347' : 'var(--color-success, #00e676)';
              return (
                <article key={p.id} className={`${styles.player} ${p.fed ? '' : styles.playerUnfed}`}>
                  <span className={`${styles.timesBadge} ${p.timesFed ? '' : styles.timesZero}`} title={`Fed ${p.timesFed} time(s) this cycle`}>×{p.timesFed}</span>
                  <button type="button" className={`${styles.rowLink} ${styles.playerName}`} onClick={() => openPlayer(p.id)}>{p.name}</button>
                  <span className={styles.playerMeta}>
                    <span className={styles.dots} title={`${p.hunts} of ${max} hunts`}>
                      {Array.from({ length: max }, (_, i) => <i key={i} className={i < p.hunts ? styles.on : undefined} />)}
                    </span>
                    {p.hunts}/{max} hunts
                    {p.pending && <span style={{ color: '#ffb347' }}>roll pending</span>}
                  </span>
                  <HungerControl compact value={p.hunger} busy={!!hungerBusy[p.id]} onAdjust={(d) => adjustHunger(p.id, d)} />
                  <span className={styles.playerMeta}>
                    {[p.herd && `Herd ×${p.herd}`, p.safe && `Safe ×${p.safe}`, p.manual && `ST ×${p.manual}`].filter(Boolean).join(' · ') || (p.fed ? 'Hunts only' : 'Not fed')}
                    {p.ghouls.length > 0 && (
                      <span className={styles.ghoulPill} style={{ color: ghoulColor }}>
                        <FaGlyph icon={FEEDING_ICONS.skull} size={10} /> {p.ghouls.length - p.ghoulsUnfed}/{p.ghouls.length} ghouls fed
                      </span>
                    )}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Ghouls ── */}
      <Fold title="Ghouls" icon={FEEDING_ICONS.skull} count={`${ghoulsUnfed} unfed / ${ghoulList.length}`} defaultOpen={ghoulsUnfed > 0}
        right={isCurrent && (
          <button type="button" className={styles.btn} disabled={busy || ghoulsUnfed === 0}
            onClick={() => confirmRun(
              'Feed every unfed ghoul now? Each costs its owner (or a random coterie member) a Rouse Check; ghouls let go, or with no feeder below Hunger 5, starve.',
              () => api.post('/admin/feeding/ghoul-upkeep'),
              (r) => `Ghoul upkeep: ${r.fed ?? 0} fed, ${r.starved ?? 0} starved.`, 'Ghoul upkeep failed')}>
            Run upkeep now
          </button>
        )}>
        <Chips value={ghoulFilter} onChange={setGhoulFilter} options={[
          ['all', 'All'], ['hungry', 'Needs feeding'], ['fed', 'Fed'], ['starved', 'Starved'], ...(isCurrent ? [] : [['none', 'Nothing recorded']]),
        ]} />
        {shownGhouls.length === 0 ? <p className={styles.empty}>No ghouls match.</p> : (
          <div className={styles.tableWrap} style={{ marginTop: '0.75rem' }}>
            <table className={styles.table}>
              <thead><tr><th>Ghoul</th><th>Owner</th><th>This cycle</th><th aria-label="Undo" /></tr></thead>
              <tbody>
                {shownGhouls.map((g) => {
                  const st = GHOUL_STATE[g.state] || GHOUL_STATE.hungry;
                  return (
                    <tr key={g.id}>
                      <td><b>{g.name}</b> <span className={styles.muted}>T{g.tier}</span></td>
                      <td>
                        <button type="button" className={styles.rowLink} onClick={() => openPlayer(g.owner_character_id)}>{g.owner_name || 'unknown'}</button>
                        {g.coterie_id && <div className={styles.muted}>{g.coterie_name} coterie (domitor)</div>}
                      </td>
                      <td style={{ color: st.color }}>
                        {st.label}
                        {g.current && <div className={styles.muted}>{GHOUL_METHOD[g.current.method] || g.current.method}{g.current.fed_by_name ? `, ${g.current.fed_by_name}` : ''}</div>}
                        {isCurrent && !g.current && g.let_starve && <div className={styles.muted}>will be let go</div>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {g.current && (
                          <UndoButton what={`Undo ${g.name}'s ${g.current.status === 'fed' ? 'feeding' : 'starvation'} in cycle ${index}.`}
                            onConfirm={async () => {
                              try { await api.post(`/admin/feeding/ghouls/${g.id}/undo?cycle=${index}`); notify(`${g.name}: undone.`); await changed(); }
                              catch (e) { notify(formatApiError(e, 'Undo failed'), true); }
                            }} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Fold>

      {/* ── Herd ── */}
      <Fold title="Herd" icon={FEEDING_ICONS.droplet} count={data.herd.length}>
        {data.herd.length === 0 ? <p className={styles.empty}>No characters have the Herd background.</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Character</th><th>Herd pool</th><th>Adjust</th></tr></thead>
              <tbody>
                {data.herd.map((r) => {
                  const adjust = async (delta) => {
                    try {
                      const { data: d } = await api.post('/admin/feeding/herd-adjust', { character_id: r.character_id, delta });
                      notify(`${d.name}: Herd ${d.herdBefore} → ${d.herdAfter} of ${d.herdDots}`);
                      await load();
                    } catch (e) { notify(formatApiError(e, 'Herd adjust failed'), true); }
                  };
                  return (
                    <tr key={r.character_id}>
                      <td><button type="button" className={styles.rowLink} onClick={() => openPlayer(r.character_id)}>{r.name}</button></td>
                      <td>
                        <span className={styles.dots}>{Array.from({ length: r.herdDots }, (_, i) => <i key={i} className={i < r.herdCurrent ? styles.on : undefined} />)}</span>
                        <span className={styles.muted}> {r.herdCurrent}/{r.herdDots}</span>
                      </td>
                      <td>
                        <div className={styles.row}>
                          <button type="button" className={styles.btn} disabled={r.herdCurrent <= 0} onClick={() => adjust(-1)} aria-label="Herd -1">−</button>
                          <button type="button" className={styles.btn} disabled={r.herdCurrent >= r.herdDots} onClick={() => adjust(1)} aria-label="Herd +1">+</button>
                          <button type="button" className={styles.btn} disabled={r.herdCurrent >= r.herdDots} onClick={() => adjust(r.herdDots - r.herdCurrent)}>Full</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Fold>

      {/* ── Tools ── */}
      <Fold title="Tools" icon={FEEDING_ICONS.gauge}>
        <div className={styles.row}>
          <button type="button" className={styles.btn} disabled={busy}
            onClick={() => confirmRun(
              'Run cycle-end decay for the last completed cycle?\n\nEvery division with no failed feeding that cycle loses 1 Safety, and every character with Herd regains 1 point. This normally runs by itself overnight; a cycle already processed is skipped.',
              () => api.post('/admin/feeding/run-decay'),
              (r) => (r?.skipped ? `Decay skipped: ${r.skipped}` : `Decay: ${r?.decayed ?? 0} division(s). Herd regen: ${r?.herdRegen ?? 0} character(s).`),
              'Failed to run decay')}>
            <FaGlyph icon={FEEDING_ICONS.shieldHalved} size={12} /> Run decay + Herd regen
          </button>
          {!status.isDowntimeLinked && (
            <button type="button" className={styles.btn} disabled={busy}
              onClick={() => confirmRun('End the current Feeding cycle immediately and start a new one?',
                () => api.post('/admin/feeding/force-new-cycle'), 'New Feeding cycle started.', 'Failed to reset cycle')}>
              <FaGlyph icon={FEEDING_ICONS.clock} size={12} /> Force new cycle
            </button>
          )}
        </div>
        <p className={styles.muted} style={{ marginTop: '0.6rem' }}>
          Cycle dates and the ghoul upkeep time are set in the Calendar.
        </p>
      </Fold>

      {/* ── Drawer ── */}
      {drawerFeeding && (
        <Drawer title={`${drawerFeeding.character_name}: ${outcomeOf(drawerFeeding).label}`}
          subtitle={`${whereOf(drawerFeeding)} · cycle ${drawerFeeding.cycle_index}`} onClose={() => setDrawer(null)}>
          <FeedingDetail f={drawerFeeding} isCurrent={isCurrent}
            onOpenPlayer={() => openPlayer(drawerFeeding.character_id)}
            onUndo={async () => {
              try {
                await api.post(`/admin/feeding/${drawerFeeding.id}/allow-reroll`);
                notify(`${drawerFeeding.character_name}: feeding undone.`);
                setDrawer(null);
                await changed();
              } catch (e) { notify(formatApiError(e, 'Undo failed'), true); }
            }} />
        </Drawer>
      )}
      {drawerPlayer && (
        <Drawer title={drawerPlayer.name}
          subtitle={`Fed ${drawerPlayer.timesFed} time(s) in cycle ${index} · ${drawerPlayer.hunts}/${max} hunts`}
          onClose={() => setDrawer(null)}>
          <PlayerDetail p={drawerPlayer} max={max} isCurrent={isCurrent} cycleIndex={index}
            feedings={data.log.filter((f) => f.character_id === drawerPlayer.id).length
              ? data.log.filter((f) => f.character_id === drawerPlayer.id)
              : drawerPlayer.feedings}
            ghouls={drawerPlayer.ghouls} onChanged={changed} notify={notify}
            onHunger={adjustHunger} hungerBusy={!!hungerBusy[drawerPlayer.id]}
            onOpenFeeding={(f) => openFeeding(f.id)} />
        </Drawer>
      )}
      {drawer?.type === 'player' && !drawerPlayer && (
        <Drawer title="Not an active character" onClose={() => setDrawer(null)}>
          <p className={styles.empty}>This character is retired or has no player, so they aren't in this cycle's roster.</p>
        </Drawer>
      )}
    </div>
  );
}
