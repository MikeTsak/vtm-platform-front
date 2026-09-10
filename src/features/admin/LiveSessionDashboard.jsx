// src/features/admin/LiveSessionDashboard.jsx
import React, { useEffect, useRef, useState } from 'react';
import MiniSearch from 'minisearch';
import api from '../../core/api';
import {
  getLiveSession, getLiveSessionPlayers, getLiveSessionRolls, getLiveSessionBroadcasts,
  createLiveSession, sendLiveSessionBroadcast, logLiveSessionRoll, socket
} from '../../api/liveSession';
import { DISCIPLINES, ALL_DISCIPLINE_NAMES } from '../../data/disciplines';
import { RITUALS } from '../../data/rituals';
import { ATTR_DESCRIPTIONS, SKILL_DESCRIPTIONS } from '../../data/descriptions';
import { BOOKS, BOOK_BASE, parseSourceString, bookByName, bookUrl } from '../../data/books';
import { clanRef } from '../../data/clanReference';
import { powerMechanics } from '../../data/disciplineMechanics';
import { rollPool, summarizeTrackers, getBloodPotencyStats, applyHealthDamage, remorsePool } from '../../utils/liveSessionMechanics';
import { formatEuDate } from '../../utils/dateFormatter';
import LiveSessionRollHistory from '../live-session/LiveSessionRollHistory';
import sharedStyles from '../../styles/LiveSession.module.css';
import adminStyles from '../../styles/LiveSessionAdmin.module.css';

const styles = { ...sharedStyles, ...adminStyles };

const RULES = [
  {
    category: 'rules',
    title: 'Difficulty & Success',
    content: '1-5: Failure. 6-9: Success. 10: Critical. Pair of 10s: 4 successes total.\nDiff 1: Routine\nDiff 3: Moderate (most actions)\nDiff 5: Hard\nDiff 7+: Nearly impossible'
  },
  {
    category: 'rules',
    title: 'Hunger Mechanics',
    content: 'Messy Critical: A 10 on a Hunger die with an overall critical. You succeed but the Beast takes over.\nBestial Failure: A 1 on a Hunger die with an overall failure. The Beast lashes out.'
  },
  {
    category: 'rules',
    title: 'Blood Surge',
    content: 'Adds dice to a single roll based on Blood Potency. Requires a Rouse check.'
  },
  {
    category: 'rules',
    title: 'Humanity & Stains',
    content: 'Stains are gained by violating Chronicle Tenets or your Predator Type.\nAt the end of the session, roll Remorse: Roll dice equal to (10 - Humanity - Stains). If you get at least 1 success, you feel remorse and clear all Stains. If you fail, you lose 1 Humanity point and clear Stains.'
  },
  {
    category: 'rules',
    title: 'Frenzy',
    content: 'Triggered by anger (Fury), hunger (Hunger), or fear (Terror).\nRoll Willpower + (Humanity / 3) to resist. Success suppresses the frenzy.\nFailure means the Beast takes over. During Frenzy, immune to health penalties and can only use physical Disciplines.'
  }
];

const MERITS = [
  { category: 'merits', title: 'Beautiful',   cost: 2,     content: '+1 die to Social pools.' },
  { category: 'merits', title: 'Stunning',    cost: 4,     content: '+2 dice to Social pools.' },
  { category: 'merits', title: 'Iron Will',   cost: 3,     content: '+2 dice to resist mental manipulation.' },
  { category: 'merits', title: 'Haven',       cost: '1-3', content: 'Secure resting place. Rating dictates security.' },
  { category: 'merits', title: 'Linguistics', cost: 1,     content: 'Know one additional language per point.' },
  { category: 'merits', title: 'Fame',        cost: '1-3', content: 'You are widely known. Can help with influence or feeding.' },
  { category: 'merits', title: 'Resources',   cost: '1-5', content: 'Wealth and disposable income.' }
];

const FLAWS = [
  { category: 'flaws', title: 'Ugly',           cost: 1,     content: '-1 die to Social pools.' },
  { category: 'flaws', title: 'Repulsive',       cost: 2,     content: '-2 dice to Social pools.' },
  { category: 'flaws', title: 'Infamy',          cost: '1-3', content: 'You are known for something terrible. Dice penalties to social.' },
  { category: 'flaws', title: 'Stigmata',        cost: 2,     content: 'Bleed from hands/feet/face when you hit Hunger 4.' },
  { category: 'flaws', title: 'Dark Secret',     cost: '1-2', content: 'If discovered, you face severe consequences.' },
  { category: 'flaws', title: 'Folkloric Bane',  cost: 1,     content: 'Take aggravated damage from a traditional bane (e.g. silver, garlic).' },
  { category: 'flaws', title: 'Folkloric Block', cost: 1,     content: 'Must shrink away from a traditional ward (e.g. crucifix, threshold).' }
];

const DISC_ENTRIES = Object.entries(DISCIPLINES).flatMap(([disc, { levels = {} }]) =>
  Object.entries(levels).flatMap(([level, powers]) =>
    powers.map(p => {
      const mech = powerMechanics(p.id);
      return {
        category: 'disciplines',
        title: `${p.name} (${disc} ${level})`,
        content: `Cost: ${p.cost}\nPool: ${p.dice_pool}\n${p.notes || p.duration || ''}${mech ? `\nMechanic: ${mech.note}` : ''}`,
        source: p.source || null,
      };
    })
  )
);

const RITUAL_ENTRIES = Object.entries(RITUALS).flatMap(([kind, { meta = {}, levels = {} }]) =>
  Object.entries(levels).flatMap(([level, list = []]) =>
    list.map(r => ({
      category: kind === 'oblivion' ? 'ceremonies' : 'rituals',
      title: `${r.name} (${kind === 'oblivion' ? 'Oblivion' : 'Blood Sorcery'} ${level})`,
      content: `Cost: ${r.cost || meta?.defaults?.cost || ''}\n${r.effect || ''}\n${r.notes || ''}`,
      source: r.source || null,
    }))
  )
);

const ALL_REFERENCE = [...RULES, ...DISC_ENTRIES, ...RITUAL_ENTRIES, ...MERITS, ...FLAWS];

const wikiSearch = new MiniSearch({
  fields: ['title', 'content', 'category'],
  storeFields: ['title', 'content', 'category', 'cost', 'source'],
  // fuzzy 0.4 intentionally high — VtM terminology is esoteric and players typo constantly
  searchOptions: { fuzzy: 0.4, prefix: true }
});
wikiSearch.addAll(ALL_REFERENCE.map((item, id) => ({ id, ...item })));

// Renders a `source:` string as links into the hosted PDFs (opens a new tab,
// jumps to the page via #page=). Admin dashboard only.
function SourceLinks({ source }) {
  const segs = parseSourceString(source);
  if (!segs.length) return null;
  return (
    <div className={styles.sourceLine}>
      <span className="material-symbols-outlined">menu_book</span>
      {segs.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span>·</span>}
          {s.url
            ? <a className={styles.sourceLink} href={s.url} target="_blank" rel="noopener noreferrer">{s.raw}</a>
            : <span title="PDF not uploaded for this book">{s.raw}</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

const FRENZY_TYPES = [
  { key: 'fury',   label: 'Fury Frenzy',   color: '#dc2626' },
  { key: 'hunger', label: 'Hunger Frenzy', color: '#f97316' },
  { key: 'terror', label: 'Terror Frenzy', color: '#7c3aed' },
];

const TOOLS_INDEX = [
  { id: 'vibe',       title: 'Scene & Vibe',        content: 'ambient calm frenzy danger supernatural spooky metadata' },
  { id: 'clocks',     title: 'Session Clocks',      content: 'timers time rounds countdown' },
  { id: 'initiative', title: 'Initiative Tracker',  content: 'combat order turn' },
  { id: 'npc',        title: 'Rapid NPC / Monsters', content: 'actor generator random ghoul vampire thug bouncer detective cultist' },
  { id: 'request',    title: 'Request a Roll',       content: 'ask player prompt call for roll test attribute skill specialty difficulty foundry' },
  { id: 'dice',       title: 'Dice Roller',          content: 'roll hunger normal difficulty public note action' },
  { id: 'remorse',    title: 'Remorse (End of Session)', content: 'humanity stains degeneration conscience end session wrap' },
  { id: 'library',    title: 'Reference Library',    content: 'books pdf sourcebook corebook players guide rules reference link resources' }
];
const toolSearch = new MiniSearch({
  fields: ['title', 'content'],
  storeFields: ['title'],
  searchOptions: { fuzzy: 0.3, prefix: true }
});
toolSearch.addAll(TOOLS_INDEX);


function StatusBar({ label, sup = 0, agg = 0, max = 1, onAdjust }) {
  const cap  = Math.max(1, Number(max) || 1);
  const aggN = Math.min(agg, cap);
  const supN = Math.min(sup, cap - aggN);

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
        <span>{label}</span>
        <span>{cap - (aggN + supN)} / {cap}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        {Array.from({ length: cap }).map((_, i) => {
          const isAgg = i < aggN;
          const isSup = !isAgg && i < aggN + supN;
          return (
            <div key={i} style={{ width: 14, height: 14, borderRadius: 2, border: isAgg ? '1px solid var(--danger)' : isSup ? '1px solid var(--text-muted)' : '1px solid var(--outline-variant)', background: isAgg ? 'var(--danger)' : isSup ? 'rgba(161,161,170,0.35)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isAgg && <svg width="8" height="8" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><line x1="9" y1="1" x2="1" y2="9" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>}
              {isSup && <div style={{ width: 6, height: 2, background: 'var(--text-muted)', borderRadius: 1 }} />}
            </div>
          );
        })}
      </div>
      <div className={styles.miniBtnRow} style={{ display: 'grid', gap: '4px', gridTemplateColumns: '1fr 1fr' }}>
        <button className={styles.btnOutline} style={{ padding: '0.2rem', fontSize: '0.7rem' }} onClick={() => onAdjust('sup', -1)}>-Sup</button>
        <button className={styles.btnOutline} style={{ padding: '0.2rem', fontSize: '0.7rem' }} onClick={() => onAdjust('sup', 1)}>+Sup</button>
        <button className={styles.btnOutline} style={{ padding: '0.2rem', fontSize: '0.7rem' }} onClick={() => onAdjust('agg', -1)}>-Agg</button>
        <button className={styles.btnOutline} style={{ padding: '0.2rem', fontSize: '0.7rem' }} onClick={() => onAdjust('agg', 1)}>+Agg</button>
      </div>
    </div>
  );
}

function fmtTime(secs) {
  if (!secs || secs < 0) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function parseSheet(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : { ...(raw || {}) };
  } catch {
    return {};
  }
}

const ATTR_NAMES  = Object.keys(ATTR_DESCRIPTIONS);
const SKILL_NAMES = Object.keys(SKILL_DESCRIPTIONS);

// Specialties the character has recorded for a given skill, as plain strings.
function skillSpecialties(sheet, skill) {
  const s = sheet?.skills?.[skill];
  const list = Array.isArray(s?.specialties) ? s.specialties : Array.isArray(s) ? [] : [];
  return list.map(x => (typeof x === 'string' ? x : x?.name)).filter(Boolean);
}

export default function LiveSessionDashboard({ initialSessionId, character } = {}) {
  const [sessionId, setSessionId] = useState(initialSessionId || localStorage.getItem('adminLiveSessionId') || '');
  const [sessionName, setSessionName] = useState('VTM Live Scene');
  const [session, setSession] = useState(null);

  const [players,     setPlayers]     = useState([]);
  const [rolls,       setRolls]       = useState([]);
  const [broadcasts,  setBroadcasts]  = useState([]);
  const [broadcast,   setBroadcast]   = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState(''); // '' means global
  const [archives,    setArchives]    = useState([]);
  const [duration,    setDuration]    = useState(0);

  const [wikiQuery, setWikiQuery] = useState('');
  const [toolQuery, setToolQuery] = useState('');

  const [tempNPCs,    setTempNPCs]    = useState([
    { id: 'npc-1', name: 'Mortal Bystander', defaultPool: 4 },
    { id: 'npc-2', name: 'Ghoul Guard',      defaultPool: 5 },
    { id: 'npc-3', name: 'SI Agent',         defaultPool: 6 }
  ]);
  const [newNpcName, setNewNpcName] = useState('');
  const [newNpcPool, setNewNpcPool] = useState(5);

  const [rollerEntity, setRollerEntity] = useState('Storyteller');
  const [rollerNormal, setRollerNormal] = useState(5);
  const [rollerHunger, setRollerHunger] = useState(0);
  const [rollerDiff,   setRollerDiff]   = useState(0);
  const [rollerNote,   setRollerNote]   = useState('Admin Roll');

  const [sceneInput, setSceneInput] = useState('');
  const [timerName, setTimerName] = useState('');
  const [timerRounds, setTimerRounds] = useState(3);

  const [initName, setInitName] = useState('');
  const [initInit, setInitInit] = useState(0);

  const [reqTarget, setReqTarget] = useState('');
  const [reqT1, setReqT1] = useState('Strength');
  const [reqT2, setReqT2] = useState('Athletics');
  const [reqDiff, setReqDiff] = useState(2);
  const [reqSpec, setReqSpec] = useState('');
  const [reqNote, setReqNote] = useState('');

  const [remorseStains, setRemorseStains] = useState({});
  const [dmgState, setDmgState] = useState({});   // charId -> { amount, type, halve }
  const [effState, setEffState] = useState({});   // charId -> { label, mod, soak }
  const [oppNormal, setOppNormal] = useState(3);
  const [oppHunger, setOppHunger] = useState(0);
  const [actionMsg, setActionMsg] = useState('');

  const flash = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000); };

  useEffect(() => {
    if (!sessionId) return;

    const poll = async () => {
      const [sRes, pRes, rRes, bRes] = await Promise.allSettled([
        getLiveSession(sessionId),
        getLiveSessionPlayers(sessionId),
        getLiveSessionRolls(sessionId),
        getLiveSessionBroadcasts(sessionId),
      ]);
      if (sRes.status === 'fulfilled' && sRes.value) setSession(sRes.value.session ?? sRes.value);
      if (pRes.status === 'fulfilled' && pRes.value) setPlayers(pRes.value.players ?? pRes.value ?? []);
      if (rRes.status === 'fulfilled' && rRes.value) setRolls(rRes.value.rolls ?? rRes.value ?? []);
      if (bRes.status === 'fulfilled' && bRes.value) setBroadcasts(bRes.value.broadcasts ?? bRes.value ?? []);
    };

    poll();
    // Sockets give us instant updates; the interval is a fallback in case the socket connection drops.
    const rejoin = () => socket.emit('join_session', sessionId);
    rejoin();
    socket.on('connect', rejoin);
    socket.on('refresh_session', poll);
    const id = setInterval(poll, 5000);

    return () => {
      socket.off('refresh_session', poll);
      socket.off('connect', rejoin);
      clearInterval(id);
    };
  }, [sessionId]);

  useEffect(() => {
    if (session?.status === 'active' && session?.created_at) {
      const origin = new Date(session.created_at).getTime();
      const id = setInterval(() => setDuration(Math.floor((Date.now() - origin) / 1000)), 1000);
      return () => clearInterval(id);
    }
    if (session?.status === 'ended') setDuration(session.duration_seconds ?? 0);
  }, [session]);

  useEffect(() => { fetchArchives(); }, []);

  // NPC roster lives in session metadata so it survives reloads and is shared
  // across the ST's devices. Hydrate local state whenever the server copy changes.
  useEffect(() => {
    if (Array.isArray(session?.metadata?.npcs)) setTempNPCs(session.metadata.npcs);
  }, [session?.metadata?.npcs]);

  const fetchArchives = async () => {
    const { data } = await api.get('/admin/live-sessions').catch(() => ({ data: {} }));
    setArchives(data.sessions ?? []);
  };

  const startSession = async () => {
    const data = await createLiveSession({ name: sessionName }).catch(() => null);
    if (!data) return;
    const code = String(data?.session?.session_code ?? data?.id);
    setSessionId(code);
    localStorage.setItem('adminLiveSessionId', code);
    fetchArchives();
  };

  const endSession = async () => {
    if (!window.confirm('End this Live Session? The timer will be locked.')) return;
    await api.post(`/live-session/${sessionId}/end`).catch(() => {});
    const sData = await getLiveSession(sessionId).catch(() => null);
    if (sData) setSession(sData.session ?? sData);
    fetchArchives();
  };

  // Mirror of session.metadata that stays current within a single tick, so two
  // metadata writes fired back-to-back (e.g. two roll requests) don't clobber
  // each other before the server round-trip lands.
  const metaRef = useRef({});
  useEffect(() => { metaRef.current = session?.metadata || {}; }, [session?.metadata]);

  const updateMetadata = async (patch) => {
    if (session?.status === 'ended') return;
    const base = metaRef.current || {};
    const resolved = typeof patch === 'function' ? patch(base) : patch;
    const updated = { ...base, ...resolved };
    metaRef.current = updated;
    setSession(prev => (prev ? { ...prev, metadata: updated } : prev));
    await api.patch(`/live-session/${sessionId}/metadata`, { metadata: updated }).catch(() => {});
  };

  const adjustPlayer = async (charId, deltas) => {
    if (session?.status === 'ended') return alert('This session has ended.');

    setPlayers(prev => prev.map(p => {
      if (p.character_id !== charId && p.id !== charId) return p;
      const sheet = parseSheet(p.sheet);

      if (deltas.hungerDelta)
        sheet.hunger = Math.max(0, Math.min(5, (sheet.hunger ?? 0) + deltas.hungerDelta));

      if (deltas.humanityDelta) {
        const next = Math.max(0, Math.min(10, (sheet.morality?.humanity ?? sheet.humanity ?? 7) + deltas.humanityDelta));
        sheet.humanity = next;
        sheet.morality = { ...(sheet.morality ?? {}), humanity: next };
      }

      if (deltas.healthSupDelta !== undefined) {
        sheet.health ??= { superficial: 0, aggravated: 0 };
        sheet.health.superficial = Math.max(0, (sheet.health.superficial ?? 0) + deltas.healthSupDelta);
      }
      if (deltas.healthAggDelta !== undefined) {
        sheet.health ??= { superficial: 0, aggravated: 0 };
        sheet.health.aggravated = Math.max(0, (sheet.health.aggravated ?? 0) + deltas.healthAggDelta);
      }

      if (deltas.wpSupDelta !== undefined) {
        sheet.willpower ??= { superficial: 0, aggravated: 0 };
        sheet.willpower.superficial = Math.max(0, (sheet.willpower.superficial ?? 0) + deltas.wpSupDelta);
      }
      if (deltas.wpAggDelta !== undefined) {
        sheet.willpower ??= { superficial: 0, aggravated: 0 };
        sheet.willpower.aggravated = Math.max(0, (sheet.willpower.aggravated ?? 0) + deltas.wpAggDelta);
      }

      if (deltas.stainsDelta !== undefined) {
        sheet.stains = Math.max(0, Math.min(10, (sheet.stains ?? 0) + deltas.stainsDelta));
      }

      if (deltas.damage && Number(deltas.damage.amount) > 0) {
        const t = summarizeTrackers(sheet);
        const soak = Math.max(0, Number(deltas.damage.soak) || 0);
        let amt = Math.max(0, Math.round(Number(deltas.damage.amount)));
        if (deltas.damage.type !== 'aggravated') amt = Math.max(0, amt - soak);
        const next = applyHealthDamage(
          sheet.health,
          amt,
          deltas.damage.type || 'superficial',
          { halve: !!deltas.damage.halve && deltas.damage.type !== 'aggravated', max: t.health.max }
        );
        sheet.health = { superficial: next.superficial, aggravated: next.aggravated };
      }

      if (deltas.frenzyState !== undefined) sheet.frenzyState = deltas.frenzyState;

      return { ...p, sheet: JSON.stringify(sheet) };
    }));

    await api.patch(`/live-session/${sessionId}/players/${charId}`, deltas).catch(() => {});

    if (deltas.frenzyState) {
      const player = players.find(x => x.character_id === charId || x.id === charId);
      const frenzy = FRENZY_TYPES.find(x => x.key === deltas.frenzyState);
      if (player && frenzy) {
        const name = player.name ?? player.character_name;
        await sendLiveSessionBroadcast(sessionId, { message: `[Frenzy] ${name} has entered a ${frenzy.label}!` });
      }
    }
  };

  const sendBroadcast = async () => {
    if (!broadcast.trim() || session?.status === 'ended') return;
    await sendLiveSessionBroadcast(sessionId, { message: broadcast.trim(), target_character_id: broadcastTarget || null });
    setBroadcast('');
  };

  const persistNpcs = (next) => {
    setTempNPCs(next);
    if (sessionId) updateMetadata({ npcs: next });
  };

  const addNPC = () => {
    if (!newNpcName.trim()) return;
    persistNpcs([...tempNPCs, { id: `npc-${Date.now()}`, name: newNpcName, defaultPool: parseInt(newNpcPool) || 1 }]);
    setNewNpcName('');
  };

  const removeNPC = (id) => {
    persistNpcs(tempNPCs.filter(n => n.id !== id));
    if (rollerEntity !== 'Storyteller') { setRollerEntity('Storyteller'); setRollerNormal(5); setRollerHunger(0); }
  };

  // Initiative: turn pointer + round counter both live in metadata so players
  // see whose turn it is on their own screens.
  const advanceTurn = (dir = 1) => {
    const list = session?.metadata?.initiative || [];
    if (!list.length) return;
    const curIdx = list.findIndex(a => String(a.id) === String(session?.metadata?.turnActorId));
    let round = Number(session?.metadata?.round) || 1;
    let nextIdx;
    if (curIdx === -1) {
      nextIdx = dir > 0 ? 0 : list.length - 1;
    } else {
      nextIdx = curIdx + dir;
      if (nextIdx >= list.length) { nextIdx = 0; round += 1; }
      else if (nextIdx < 0) { nextIdx = list.length - 1; round = Math.max(1, round - 1); }
    }
    updateMetadata({ turnActorId: list[nextIdx].id, round });
  };

  const mendSuperficial = async (charId, sup) => {
    if (!sup) return;
    await adjustPlayer(charId, { healthSupDelta: -sup });
    flash('Superficial health mended.');
  };

  const awardXp = async (charId, name) => {
    try {
      await api.patch(`/admin/characters/${charId}/xp`, { delta: 3, reason: 'Live session attendance' });
      flash(`+3 XP to ${name}.`);
    } catch (e) {
      flash('XP grant failed.');
    }
  };

  const setPlayerNote = (charId, text) => {
    updateMetadata({ notes: { ...(session?.metadata?.notes || {}), [charId]: text } });
  };

  const soakFor = (charId) =>
    (session?.metadata?.activeEffects?.[charId] || []).reduce((s, e) => s + (Number(e.soak) || 0), 0);

  const applyDamageTo = (charId) => {
    const d = dmgState[charId];
    if (!d || !Number(d.amount)) return;
    adjustPlayer(charId, { damage: { amount: Number(d.amount), type: d.type || 'superficial', halve: !!d.halve, soak: soakFor(charId) } });
    setDmgState(s => ({ ...s, [charId]: { ...s[charId], amount: '' } }));
  };

  const addEffect = (charId) => {
    const e = effState[charId];
    if (!e || !e.label?.trim()) return;
    const eff = { id: `ef-${Date.now()}`, label: e.label.trim(), mod: Number(e.mod) || 0, soak: Number(e.soak) || 0 };
    updateMetadata(base => ({
      activeEffects: { ...(base.activeEffects || {}), [charId]: [...((base.activeEffects || {})[charId] || []), eff] },
    }));
    setEffState(s => ({ ...s, [charId]: { label: '', mod: '', soak: '' } }));
  };

  const removeEffect = (charId, id) => {
    updateMetadata(base => ({
      activeEffects: { ...(base.activeEffects || {}), [charId]: ((base.activeEffects || {})[charId] || []).filter(x => x.id !== id) },
    }));
  };

  const restoreWillpower = () => {
    // Start of session: recover Superficial WP = higher of Composure or Resolve.
    Promise.all(players.map(p => {
      const s = parseSheet(p.sheet);
      const rec = Math.max(Number(s.attributes?.Composure) || 1, Number(s.attributes?.Resolve) || 1);
      return adjustPlayer(p.character_id ?? p.id, { wpSupDelta: -rec });
    }));
    flash('Willpower restored for the table.');
  };

  // Roll requests — the ST asks a player for a specific pool. Stored in metadata
  // so the player's screen shows it; the player rolls, the ST clears it.
  const sendRollRequest = () => {
    const target = players.find(p => String(p.character_id ?? p.id) === String(reqTarget));
    if (!target || !reqT1 || !reqT2) return;
    const req = {
      id: `rr-${Date.now()}`,
      targetId: reqTarget,
      targetName: target.name ?? target.character_name ?? 'Player',
      trait1: reqT1,
      trait2: reqT2,
      difficulty: Number(reqDiff) || 0,
      specialty: reqSpec || null,
      note: reqNote.trim(),
      createdAt: new Date().toISOString(),
    };
    updateMetadata(base => ({ rollRequests: [...(base.rollRequests || []), req] }));
    setReqNote('');
    setReqSpec('');
    flash(`Roll requested from ${req.targetName}.`);
  };

  const cancelRollRequest = (id) => {
    updateMetadata(base => ({ rollRequests: (base.rollRequests || []).filter(r => r.id !== id) }));
  };

  const rollRemorse = async (p) => {
    const charId = p.character_id ?? p.id;
    const sheet = parseSheet(p.sheet);
    const humanity = Number(sheet.humanity ?? sheet.morality?.humanity ?? 7);
    // Prefer the tracked Stains count; fall back to the manual input.
    const stains = Math.max(0, Number(remorseStains[charId] ?? sheet.stains ?? 1));
    const name = p.name ?? p.character_name ?? sheet.name ?? 'Unknown';
    const pool = remorsePool(humanity, stains);
    const res = rollPool(pool, 0);
    const feltRemorse = res.outcome.successes > 0;

    await logLiveSessionRoll(sessionId, {
      character_id: charId,
      character_name: name,
      roll_type: 'remorse',
      pool,
      hunger: 0,
      difficulty: 1,
      results: { normal: res.normalDice, hunger: [] },
      successes: res.outcome.successes,
      note: feltRemorse
        ? `Remorse (Humanity ${humanity}, ${stains} stain${stains !== 1 ? 's' : ''}) — feels remorse, Stains cleared`
        : `Remorse (Humanity ${humanity}, ${stains} stain${stains !== 1 ? 's' : ''}) — no remorse, Humanity falls to ${Math.max(0, humanity - 1)}`,
    });

    if (feltRemorse) {
      await adjustPlayer(charId, { stainsDelta: -stains });
    } else {
      await adjustPlayer(charId, { humanityDelta: -1, stainsDelta: -stains });
    }
    flash(feltRemorse ? `${name} feels remorse — Stains cleared.` : `${name} loses a point of Humanity.`);
  };

  const rollAsEntity = async () => {
    if (!sessionId) return alert('Must be in an active session to roll.');
    const normal = parseInt(rollerNormal) || 0;
    const hunger = parseInt(rollerHunger) || 0;
    const diff = parseInt(rollerDiff) || 0;

    const results = rollPool(normal, hunger);

    await logLiveSessionRoll(sessionId, {
      character_id:   null,
      character_name: rollerEntity,
      roll_type:      'admin_roll',
      pool:           normal + hunger,
      hunger,
      difficulty:     diff,
      results:        { normal: results.normalDice, hunger: results.hungerDice },
      successes:      results.outcome.successes,
      has_critical:        results.outcome.hasCritical,
      has_messy_critical:  results.outcome.hasMessyCritical,
      has_bestial_failure: results.outcome.hasBestialFailure,
      note:           rollerNote
    });
  };

  const visibleTools = React.useMemo(() => {
    if (!toolQuery.trim()) return TOOLS_INDEX.map(t => t.id);
    return toolSearch.search(toolQuery.trim()).map(r => r.id);
  }, [toolQuery]);

  const wikiResults = React.useMemo(() => {
    if (!wikiQuery.trim()) return ALL_REFERENCE;
    return wikiSearch.search(wikiQuery.trim());
  }, [wikiQuery]);

  const feedItems = React.useMemo(() => {
    return [...broadcasts, ...rolls].sort(
      (a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)
    );
  }, [broadcasts, rolls]);

  return (
    <div className={styles.dashboardContainer}>

      <div className={styles.pane}>
        <div className={styles.paneHeader}><h2>ST Controls</h2></div>
        <div className={styles.paneContent} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input className={styles.formInput} value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="Chronicle Name" />
            <button className={styles.btnPrimary} onClick={startSession}>Initialize Table</button>
            <input
              className={styles.formInput}
              value={sessionId}
              onChange={e => { setSessionId(e.target.value); localStorage.setItem('adminLiveSessionId', e.target.value); }}
              placeholder="Session Code"
            />
          </div>

          {session ? (
            <div style={{ background: 'var(--surface-container-highest)', border: 'var(--glass-border)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', boxShadow: 'var(--glass-shadow)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '0.1em', color: session.status === 'active' ? 'var(--success)' : 'var(--danger)', marginBottom: '0.25rem' }}>
                {session.status === 'active' ? 'ACTIVE' : 'ENDED'}
              </div>
              <div style={{ fontSize: '1.5rem', fontFamily: 'monospace', fontWeight: 800 }}>{fmtTime(duration)}</div>
              {session.status === 'active' && (
                <button className={styles.btnOutline} style={{ marginTop: '0.75rem', width: '100%', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={endSession}>End Session</button>
              )}
            </div>
          ) : sessionId && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center', padding: '0.5rem', border: '1px solid var(--danger)', borderRadius: '4px', background: 'rgba(251,113,133,0.1)' }}>
              Not connected. Invalid session code or server error.
            </div>
          )}

          {actionMsg && (
            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', textAlign: 'center' }}>{actionMsg}</div>
          )}

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--outline-variant)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.5rem', background: 'var(--surface-container-high)', borderBottom: 'var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>search</span>
              <input
                type="text"
                placeholder="Universal Search (Rules, Disciplines, Merits...)"
                value={wikiQuery}
                onChange={e => setWikiQuery(e.target.value)}
                className={styles.formInput}
                style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.75rem' }}
              />
            </div>
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, background: 'var(--surface-container-highest)', fontSize: '0.85rem' }}>
              {wikiResults.length === 0
                ? <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>No matches found.</div>
                : wikiResults.map((m, i) => (
                  <div key={m.id ?? i} className={styles.wikiSection} style={{ marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.85rem', color: 'var(--primary)', margin: '0 0 0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{m.title}{m.cost ? ` (${m.cost})` : ''}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', border: '1px solid var(--outline-variant)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{m.category}</span>
                    </h3>
                    <p style={{ fontSize: '0.75rem', margin: 0, whiteSpace: 'pre-wrap' }}>{m.content}</p>
                    {m.source && <SourceLinks source={m.source} />}
                  </div>
                ))
              }
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Archives</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
              {archives.length === 0
                ? <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No archives.</div>
                : archives.map(arch => {
                  const code = arch.session_code ?? arch.id;
                  return (
                    <div key={arch.id} className={styles.npcItem} onClick={() => { setSessionId(code); localStorage.setItem('adminLiveSessionId', code); }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{arch.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatEuDate(arch.created_at)} · Code: {code}</div>
                    </div>
                  );
                })
              }
            </div>
          </div>

        </div>
      </div>

      <div className={styles.pane} style={{ flex: 1 }}>

        <div className={styles.centerTop}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--primary)', fontSize: '1.5rem' }}>Live Player Overview</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select className={styles.formInput} value={broadcastTarget} onChange={e => setBroadcastTarget(e.target.value)} disabled={session?.status === 'ended'}>
                <option value="">All Players</option>
                {players.map(p => <option key={p.character_id ?? p.id} value={p.character_id ?? p.id}>Whisper: {p.name ?? p.character_name}</option>)}
              </select>
              <input className={styles.formInput} style={{ width: '220px' }} value={broadcast} onChange={e => setBroadcast(e.target.value)} placeholder="ST Broadcast or Whisper..." disabled={session?.status === 'ended'} />
              <button className={styles.btnPrimary} style={{ width: 'auto' }} onClick={sendBroadcast} disabled={session?.status === 'ended'}>Send</button>
              <button className={styles.btnOutline} style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }} onClick={() => Promise.all(players.map(p => adjustPlayer(p.character_id ?? p.id, { hungerDelta: 1 })))} disabled={session?.status === 'ended'}>+1 Ambient Hunger</button>
              <button className={styles.btnOutline} onClick={() => Promise.all(players.map(p => adjustPlayer(p.character_id ?? p.id, { forceRouseCheck: true })))} disabled={session?.status === 'ended'}>Rouse All</button>
              <button className={styles.btnOutline} onClick={() => Promise.all(players.map(p => adjustPlayer(p.character_id ?? p.id, { frenzyState: null })))} disabled={session?.status === 'ended'}>Clear All Frenzy</button>
              <button className={styles.btnOutline} onClick={restoreWillpower} disabled={session?.status === 'ended'} title="Recover Superficial Willpower = higher of Composure/Resolve (start of session)">Restore WP</button>
            </div>
          </div>

          <div className={styles.playerGrid}>
            {players.map(p => {
              const charId   = p.character_id ?? p.id;
              const sheet    = parseSheet(p.sheet);
              const frenzy   = FRENZY_TYPES.find(f => f.key === (sheet.frenzyState ?? p.frenzyState));

              const trackers = summarizeTrackers(sheet);
              const hp = { max: trackers.health.max,    sup: trackers.health.superficial,    agg: trackers.health.aggravated };
              const wp = { max: trackers.willpower.max, sup: trackers.willpower.superficial, agg: trackers.willpower.aggravated };

              const hunger   = Number(sheet.hunger ?? p.hunger ?? 0);
              const humanity = Number(sheet.humanity ?? sheet.morality?.humanity ?? p.humanity ?? 7);
              const name     = p.name ?? p.character_name ?? sheet.name ?? 'Unknown';
              const clan     = p.clan ?? sheet.clan ?? 'Unknown';

              const bp       = trackers.bloodPotency;
              const bpStats  = getBloodPotencyStats(bp);
              const cref     = clanRef(clan);
              const impaired = hp.sup + hp.agg >= hp.max;
              const torpor   = hp.agg >= hp.max;
              const willBroken = wp.sup + wp.agg >= wp.max;
              const discs = Object.entries(sheet.disciplines || {})
                .filter(([, v]) => Number(v) > 0)
                .sort((a, b) => Number(b[1]) - Number(a[1]));
              const stains = trackers.stains;
              const degeneration = trackers.degeneration;
              const compulsion = sheet.compulsion || null;
              const effects = session?.metadata?.activeEffects?.[charId] || [];
              const dmg = dmgState[charId] || { amount: '', type: 'superficial', halve: true };
              const eff = effState[charId] || { label: '', mod: '', soak: '' };

              return (
                <div key={charId} className={styles.playerCard} style={{ borderColor: frenzy?.color ?? 'var(--outline-variant)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '1.1rem', color: 'var(--on-surface)', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                        <div className={styles.playerClan}>{clan} · BP {bp}</div>
                      </div>
                    </div>
                    {(frenzy || torpor || impaired || willBroken || degeneration || compulsion) && (
                      <div className={styles.badgeRow}>
                        {frenzy && <span className={styles.badge} style={{ color: frenzy.color, borderColor: frenzy.color }}>{frenzy.label}</span>}
                        {torpor && <span className={styles.badge} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>TORPOR</span>}
                        {!torpor && impaired && <span className={styles.badge} style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}>IMPAIRED &minus;2</span>}
                        {willBroken && <span className={styles.badge} style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}>WILL BROKEN &minus;2</span>}
                        {degeneration && <span className={styles.badge} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>DEGENERATION</span>}
                        {compulsion && <span className={styles.badge} style={{ color: '#c084fc', borderColor: '#c084fc' }} title={compulsion}>COMPULSION</span>}
                      </div>
                    )}
                    <select
                      className={styles.formInput}
                      style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderColor: frenzy?.color ?? 'inherit', color: frenzy?.color ?? 'inherit' }}
                      value={sheet.frenzyState ?? p.frenzyState ?? ''}
                      onChange={e => adjustPlayer(charId, { frenzyState: e.target.value || null })}
                    >
                      <option value="">Calm (Normal State)</option>
                      {FRENZY_TYPES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <StatusBar label="Health"    max={hp.max} sup={hp.sup} agg={hp.agg} onAdjust={(t, d) => adjustPlayer(charId, t === 'sup' ? { healthSupDelta: d } : { healthAggDelta: d })} />
                    <StatusBar label="Willpower" max={wp.max} sup={wp.sup} agg={wp.agg} onAdjust={(t, d) => adjustPlayer(charId, t === 'sup' ? { wpSupDelta: d }     : { wpAggDelta: d })} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                        <span>Hunger</span><span>{hunger} / 5</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', padding: '2px 0' }}>
                        {Array.from({ length: 5 }).map((_, i) => <span key={i} className={i < hunger ? styles.dotFilled : styles.dotEmpty} style={{ backgroundColor: i < hunger ? 'var(--danger)' : 'transparent', borderColor: 'var(--danger)' }} />)}
                      </div>
                      <div style={{ display: 'grid', gap: '4px', gridTemplateColumns: '1fr 1fr 2fr', marginTop: '0.5rem' }}>
                        <button className={styles.btnOutline} style={{ padding: '0.2rem', fontSize: '0.7rem' }} onClick={() => adjustPlayer(charId, { hungerDelta: -1 })}>-1</button>
                        <button className={styles.btnOutline} style={{ padding: '0.2rem', fontSize: '0.7rem' }} onClick={() => adjustPlayer(charId, { hungerDelta: 1 })}>+1</button>
                        <button className={styles.btnOutline} onClick={() => adjustPlayer(charId, { forceRouseCheck: true })} style={{ padding: '0.2rem', fontSize: '0.7rem', background: 'rgba(251,113,133,0.15)', color: 'var(--danger)', borderColor: 'rgba(251,113,133,0.3)' }}>Rouse</button>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                        <span>Humanity</span><span>{humanity}{stains > 0 && <span style={{ color: 'var(--danger)' }}> · {stains} st</span>}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 2, padding: '2px 0', height: '14px' }}>
                        {Array.from({ length: 10 }).map((_, i) => {
                          const filled = i < humanity;
                          const stained = !filled && i >= 10 - stains;
                          return <div key={i} style={{ flex: 1, borderRadius: 2, background: filled ? 'var(--success)' : stained ? 'var(--danger)' : 'rgba(255,255,255,0.1)' }} />;
                        })}
                      </div>
                      <div style={{ display: 'grid', gap: '4px', gridTemplateColumns: '1fr 1fr 1fr 1fr', marginTop: '0.5rem' }}>
                        <button className={styles.btnOutline} style={{ padding: '0.2rem', fontSize: '0.68rem' }} title="Add a Stain" onClick={() => adjustPlayer(charId, { stainsDelta: 1 })}>Stain+</button>
                        <button className={styles.btnOutline} style={{ padding: '0.2rem', fontSize: '0.68rem' }} title="Remove a Stain" onClick={() => adjustPlayer(charId, { stainsDelta: -1 })}>Stain−</button>
                        <button className={styles.btnOutline} style={{ padding: '0.2rem', fontSize: '0.68rem' }} onClick={() => adjustPlayer(charId, { humanityDelta: -1 })}>Hum−</button>
                        <button className={styles.btnOutline} style={{ padding: '0.2rem', fontSize: '0.68rem' }} onClick={() => adjustPlayer(charId, { humanityDelta: 1 })}>Hum+</button>
                      </div>
                    </div>
                  </div>

                  {/* Apply damage — halves Superficial, rolls over to Aggravated */}
                  <div className={styles.dmgRow}>
                    <span className={styles.dmgLabel}>Damage</span>
                    <input
                      type="number" min="0" className={styles.dmgAmount} placeholder="0"
                      value={dmg.amount}
                      onChange={e => setDmgState(s => ({ ...s, [charId]: { ...dmg, amount: e.target.value } }))}
                    />
                    <select
                      className={styles.formInput} style={{ width: 'auto', padding: '0.2rem 0.3rem', fontSize: '0.7rem' }}
                      value={dmg.type}
                      onChange={e => setDmgState(s => ({ ...s, [charId]: { ...dmg, type: e.target.value } }))}
                    >
                      <option value="superficial">Sup</option>
                      <option value="aggravated">Agg</option>
                    </select>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <input
                        type="checkbox"
                        checked={dmg.type === 'aggravated' ? false : dmg.halve !== false}
                        disabled={dmg.type === 'aggravated'}
                        onChange={e => setDmgState(s => ({ ...s, [charId]: { ...dmg, halve: e.target.checked } }))}
                      /> ½
                    </label>
                    {soakFor(charId) > 0 && <span style={{ fontSize: '0.66rem', color: 'var(--primary)' }}>soak {soakFor(charId)}</span>}
                    <button className={styles.btnOutline} style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} disabled={!Number(dmg.amount) || session?.status === 'ended'} onClick={() => applyDamageTo(charId)}>Apply</button>
                  </div>

                  {/* Storyteller effects on this player */}
                  <div className={styles.effRow}>
                    {effects.map(e => (
                      <span key={e.id} className={styles.effChip}>
                        {e.label} {Number(e.mod) ? (Number(e.mod) > 0 ? `+${e.mod}` : e.mod) : ''}{Number(e.soak) ? ` · soak ${e.soak}` : ''}
                        <button onClick={() => removeEffect(charId, e.id)} title="Remove">×</button>
                      </span>
                    ))}
                    <input
                      className={styles.effInput} style={{ flex: 2 }} placeholder="effect (Awe, Toughness…)"
                      value={eff.label}
                      onChange={e => setEffState(s => ({ ...s, [charId]: { ...eff, label: e.target.value } }))}
                    />
                    <input
                      className={styles.effInput} type="number" placeholder="±dice"
                      value={eff.mod}
                      onChange={e => setEffState(s => ({ ...s, [charId]: { ...eff, mod: e.target.value } }))}
                    />
                    <input
                      className={styles.effInput} type="number" min="0" placeholder="soak"
                      value={eff.soak}
                      onChange={e => setEffState(s => ({ ...s, [charId]: { ...eff, soak: e.target.value } }))}
                    />
                    <button className={styles.btnOutline} style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem' }} disabled={!eff.label?.trim()} onClick={() => addEffect(charId)}>+</button>
                  </div>

                  <div className={styles.derivedStrip}>
                    <span title="Bane Severity">Bane {bpStats.baneSeverity}</span>
                    <span title="Blood Surge bonus dice">Surge +{bpStats.surgeBonus}</span>
                    <span title="Superficial damage mended per Rouse Check">Mend {bpStats.mendAmount}</span>
                    <span title="Rouse Checks at or below this Discipline level get the reroll">Rouse&nbsp;reroll &le;{bpStats.rouseRerollLevel}</span>
                    <span title="Bonus dice to Discipline pools">Disc +{bpStats.disciplineBonus}</span>
                  </div>

                  {discs.length > 0 && (
                    <div className={styles.discChips}>
                      {discs.map(([d, v]) => (
                        <span key={d} className={styles.discChip}>{d} {'●'.repeat(Math.min(5, Number(v)))}</span>
                      ))}
                    </div>
                  )}

                  {cref && (
                    <details className={styles.baneBox}>
                      <summary>
                        <span className="material-symbols-outlined">warning</span>
                        {clan} Bane &amp; Compulsion
                        {bookByName(cref.book) && (
                          <a
                            href={bookUrl(bookByName(cref.book))}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                          >{cref.book}</a>
                        )}
                      </summary>
                      <p><strong>Bane:</strong> {cref.bane}</p>
                      <p><strong>Compulsion:</strong> {cref.compulsion}</p>
                    </details>
                  )}

                  <div className={styles.quickActions}>
                    <button
                      className={styles.btnOutline}
                      style={{ padding: '0.25rem', fontSize: '0.7rem' }}
                      disabled={!hp.sup || session?.status === 'ended'}
                      onClick={() => mendSuperficial(charId, hp.sup)}
                    >
                      Mend Superficial
                    </button>
                    <button
                      className={styles.btnOutline}
                      style={{ padding: '0.25rem', fontSize: '0.7rem' }}
                      onClick={() => awardXp(charId, name)}
                    >
                      +3 XP
                    </button>
                  </div>
                  <input
                    className={styles.quickNote}
                    placeholder="ST note for this player..."
                    defaultValue={session?.metadata?.notes?.[charId] ?? ''}
                    onBlur={e => {
                      const v = e.target.value.trim();
                      if (v !== (session?.metadata?.notes?.[charId] ?? '')) setPlayerNote(charId, v);
                    }}
                  />

                </div>
              );
            })}
          </div>
          {(!players || players.length === 0) && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '2rem' }}>No players connected to this session.</div>
          )}
        </div>

        <div className={styles.centerBottom}>
          <div className={styles.paneHeader} style={{ borderTop: '1px solid var(--outline-variant)', gap: '0.4rem' }}>
            <h2>Live Activity Feed</h2>
            <button
              className={styles.btnOutline}
              style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.7rem' }}
              onClick={() => {
                const text = feedItems.map(it => {
                  const t = new Date(it.created_at || it.createdAt).toLocaleTimeString();
                  if (it.message && !it.roll_type) return `[${t}] ${it.message}`;
                  const who = it.character_name || it.player_name || 'Unknown';
                  const res = it.label || `${it.successes ?? 0} successes`;
                  return `[${t}] ${who} — ${(it.roll_type || 'roll').replace(/_/g, ' ')}${it.note ? ` (${it.note})` : ''} → ${res}`;
                }).reverse().join('\n');
                navigator.clipboard?.writeText(text).then(() => flash('Activity log copied.'), () => flash('Copy failed.'));
              }}
            >
              Copy Log
            </button>
            <button
              className={styles.btnOutline}
              style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.7rem' }}
              onClick={() => {
                const lines = [];
                lines.push(`# ${session?.name || 'Live Session'} — ${formatEuDate(session?.created_at || new Date())}`);
                lines.push(`Duration ${fmtTime(duration)} · ${players.length} players`);
                lines.push('');
                lines.push('## Player state');
                for (const p of players) {
                  const s = parseSheet(p.sheet);
                  const t = summarizeTrackers(s);
                  const nm = p.name ?? p.character_name ?? 'Unknown';
                  const bits = [
                    `Hunger ${t.hunger}`,
                    `Health ${t.health.superficial}s/${t.health.aggravated}a of ${t.health.max}`,
                    `WP ${t.willpower.superficial}s/${t.willpower.aggravated}a of ${t.willpower.max}`,
                    `Humanity ${t.humanity}${t.stains ? ` (${t.stains} stains)` : ''}`,
                  ];
                  if (s.frenzyState) bits.push(`FRENZY:${s.frenzyState}`);
                  if (t.inTorpor) bits.push('TORPOR');
                  if (t.degeneration) bits.push('DEGENERATION');
                  if (s.compulsion) bits.push(`Compulsion: ${s.compulsion}`);
                  lines.push(`- ${nm}: ${bits.join(' · ')}`);
                  const note = session?.metadata?.notes?.[p.character_id ?? p.id];
                  if (note) lines.push(`    ST note: ${note}`);
                }
                lines.push('');
                lines.push('## Notable rolls');
                for (const r of rolls.filter(x => x.has_messy_critical || x.has_bestial_failure || x.roll_type === 'remorse').slice(0, 40)) {
                  const t = new Date(r.created_at).toLocaleTimeString();
                  lines.push(`- [${t}] ${r.character_name || 'Unknown'} — ${(r.roll_type || 'roll').replace(/_/g, ' ')}: ${r.note || `${r.successes ?? 0} successes`}`);
                }
                navigator.clipboard?.writeText(lines.join('\n')).then(() => flash('Session summary copied.'), () => flash('Copy failed.'));
              }}
            >
              Summary
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <LiveSessionRollHistory
              rolls={feedItems}
              isAdmin={true}
              currentCharacterId={character?.id}
              onBroadcast={async (msg) => { await sendLiveSessionBroadcast(sessionId, { message: msg }); }}
            />
          </div>
        </div>

      </div>

      <div className={styles.pane}>
        <div className={styles.paneHeader} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.75rem' }}>
          <h2>Admin Tools</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>search</span>
            <input
              type="text"
              placeholder="Filter Tools..."
              value={toolQuery}
              onChange={e => setToolQuery(e.target.value)}
              className={styles.formInput}
              style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
            />
          </div>
        </div>
        <div className={styles.paneContent} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {visibleTools.includes('vibe') && (
            <div>
              <h3 style={{ fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '0.75rem' }}>Scene & Vibe</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="text" className={styles.formInput} style={{ flex: 1 }} placeholder="Current Scene (e.g. Elysium)" value={sceneInput} onChange={e => setSceneInput(e.target.value)} />
                <button className={styles.btnSecondary} onClick={() => updateMetadata({ scene: sceneInput })}>Set</button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className={styles.btnOutline} style={{ flex: 1, borderColor: '#3b82f6', color: '#3b82f6' }} onClick={() => updateMetadata({ ambient: 'calm' })}>Calm</button>
                <button className={styles.btnOutline} style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }} onClick={() => updateMetadata({ ambient: 'frenzy' })}>Danger</button>
                <button className={styles.btnOutline} style={{ flex: 1, borderColor: '#a855f7', color: '#a855f7' }} onClick={() => updateMetadata({ ambient: 'supernatural' })}>Spooky</button>
              </div>
            </div>
          )}

          {visibleTools.includes('clocks') && (
            <div style={{ paddingTop: visibleTools[0] !== 'clocks' ? '1rem' : '0', borderTop: visibleTools[0] !== 'clocks' ? '1px solid var(--outline-variant)' : 'none' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '0.75rem' }}>Session Clocks</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input type="text" className={styles.formInput} style={{ flex: 1 }} placeholder="Clock Name" value={timerName} onChange={e => setTimerName(e.target.value)} />
                <input type="number" className={styles.formInput} style={{ width: '60px' }} value={timerRounds} onChange={e => setTimerRounds(parseInt(e.target.value))} />
                <button className={styles.btnSecondary} onClick={() => {
                  if (!timerName) return;
                  const clocks = [...(session?.metadata?.clocks || []), { id: Date.now(), name: timerName, value: timerRounds }];
                  updateMetadata({ clocks });
                  setTimerName('');
                }}>Add</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(session?.metadata?.clocks || []).map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.85rem' }}>{c.name} (<strong>{c.value}</strong>)</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className={styles.btnOutline} style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }} onClick={() => {
                        const clocks = session.metadata.clocks.map(clk => clk.id === c.id ? { ...clk, value: Math.max(0, clk.value - 1) } : clk);
                        updateMetadata({ clocks });
                      }}>-1</button>
                      <button className={styles.btnOutline} style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }} onClick={() => {
                        const clocks = session.metadata.clocks.map(clk => clk.id === c.id ? { ...clk, value: clk.value + 1 } : clk);
                        updateMetadata({ clocks });
                      }}>+1</button>
                      <button className={styles.btnOutline} style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => {
                        const clocks = session.metadata.clocks.filter(clk => clk.id !== c.id);
                        updateMetadata({ clocks });
                      }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visibleTools.includes('initiative') && (
            <div style={{ paddingTop: visibleTools[0] !== 'initiative' ? '1rem' : '0', borderTop: visibleTools[0] !== 'initiative' ? '1px solid var(--outline-variant)' : 'none' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '0.75rem' }}>Initiative Tracker</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input type="text" className={styles.formInput} style={{ flex: 1 }} placeholder="Name" value={initName} onChange={e => setInitName(e.target.value)} />
                <input type="number" className={styles.formInput} style={{ width: '60px' }} placeholder="Init" value={initInit} onChange={e => setInitInit(parseInt(e.target.value))} />
                <button className={styles.btnSecondary} onClick={() => {
                  if (!initName) return;
                  const initList = [...(session?.metadata?.initiative || []), { id: Date.now(), name: initName, value: initInit || 0 }];
                  initList.sort((a, b) => b.value - a.value);
                  const meta = { initiative: initList };
                  if (!session?.metadata?.turnActorId) { meta.turnActorId = initList[0].id; meta.round = 1; }
                  updateMetadata(meta);
                  setInitName('');
                }}>Add</button>
              </div>
              <button
                className={styles.btnOutline}
                style={{ width: '100%', fontSize: '0.72rem', marginBottom: '0.75rem' }}
                disabled={players.length === 0}
                onClick={() => {
                  const base = session?.metadata?.initiative || [];
                  const existing = new Set(base.map(a => a.name));
                  const added = players
                    .filter(p => !existing.has(p.name ?? p.character_name))
                    .map((p, i) => {
                      const s = parseSheet(p.sheet);
                      const val = (Number(s.attributes?.Wits) || 0) + (Number(s.attributes?.Composure) || 0);
                      return { id: Date.now() + i, name: p.name ?? p.character_name ?? 'Player', value: val };
                    });
                  const initList = [...base, ...added].sort((a, b) => b.value - a.value);
                  const meta = { initiative: initList };
                  if (!session?.metadata?.turnActorId && initList.length) { meta.turnActorId = initList[0].id; meta.round = 1; }
                  updateMetadata(meta);
                }}
              >
                Add players (Wits + Composure)
              </button>

              {(session?.metadata?.initiative || []).length > 0 && (
                <div className={styles.initBar}>
                  <span className={styles.initRound}>Round {Number(session?.metadata?.round) || 1}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className={styles.btnOutline} style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }} onClick={() => advanceTurn(-1)}>Prev</button>
                    <button className={styles.btnSecondary} style={{ width: 'auto', padding: '0.15rem 0.6rem', fontSize: '0.7rem' }} onClick={() => advanceTurn(1)}>Next Turn</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {(session?.metadata?.initiative || []).map((actor, idx) => {
                  const isCurrent = String(actor.id) === String(session?.metadata?.turnActorId);
                  return (
                    <div key={actor.id} className={`${styles.initRow} ${isCurrent ? styles.initRowCurrent : ''}`}>
                      <span className={styles.initName} style={{ fontSize: '0.85rem' }}>{idx + 1}. {actor.name}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>{actor.value}</span>
                        <button className={styles.btnOutline} style={{ padding: '0 0.3rem', color: 'var(--danger)', borderColor: 'transparent' }} onClick={() => {
                          const initList = session.metadata.initiative.filter(a => a.id !== actor.id);
                          const meta = { initiative: initList };
                          if (isCurrent) meta.turnActorId = initList[0]?.id ?? null;
                          updateMetadata(meta);
                        }}>Remove</button>
                      </div>
                    </div>
                  );
                })}
                {(session?.metadata?.initiative || []).length > 0 && (
                  <button className={styles.btnOutline} style={{ marginTop: '0.5rem', fontSize: '0.75rem' }} onClick={() => updateMetadata({ initiative: [], turnActorId: null, round: 1 })}>Clear Initiative</button>
                )}
              </div>
            </div>
          )}

          {visibleTools.includes('npc') && (
            <div style={{ paddingTop: visibleTools[0] !== 'npc' ? '1rem' : '0', borderTop: visibleTools[0] !== 'npc' ? '1px solid var(--outline-variant)' : 'none' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '0.75rem' }}>Rapid NPC / Monsters</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input type="text"   className={styles.formInput} style={{ flex: 1 }}       placeholder="Name (e.g. Guard)" value={newNpcName} onChange={e => setNewNpcName(e.target.value)} />
                <input type="number" className={styles.formInput} style={{ width: '60px' }} placeholder="Pool"             value={newNpcPool} onChange={e => setNewNpcPool(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button className={styles.btnSecondary} onClick={addNPC} style={{ flex: 1 }}>Add</button>
                <button className={styles.btnOutline} style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }} onClick={() => {
                  const names = ['Thug', 'Bouncer', 'Ghoul', 'Detective', 'Vampire Fledgling', 'Cultist'];
                  const pools = [3, 4, 5, 5, 6, 4];
                  const moralities = ['Humanity 6', 'Humanity 7', 'Humanity 5', 'Path of Caine'];
                  const idx = Math.floor(Math.random() * names.length);
                  const morality = moralities[Math.floor(Math.random() * moralities.length)];
                  setNewNpcName(`${names[idx]} (${morality})`);
                  setNewNpcPool(pools[idx]);
                }}>Generate Random</button>
              </div>

              <div className={styles.npcList} style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <div className={`${styles.npcItem} ${rollerEntity === 'Storyteller' ? styles.active : ''}`} onClick={() => { setRollerEntity('Storyteller'); setRollerNormal(5); setRollerHunger(0); }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Storyteller (Global)</span>
                </div>
                {tempNPCs.map(npc => (
                  <div key={npc.id} className={`${styles.npcItem} ${rollerEntity === npc.name ? styles.active : ''}`} onClick={() => { setRollerEntity(npc.name); setRollerNormal(npc.defaultPool); setRollerHunger(0); }}>
                    <span style={{ fontSize: '0.85rem' }}>{npc.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Pool: {npc.defaultPool}</span>
                      <button
                        className={styles.btnOutline}
                        style={{ padding: '0 0.3rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'transparent' }}
                        title="Remove NPC"
                        onClick={(e) => { e.stopPropagation(); removeNPC(npc.id); }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visibleTools.includes('request') && (() => {
            const reqTargetPlayer = players.find(p => String(p.character_id ?? p.id) === String(reqTarget));
            const reqTargetSheet = parseSheet(reqTargetPlayer?.sheet);
            const reqSpecs = [...new Set([
              ...skillSpecialties(reqTargetSheet, reqT1),
              ...skillSpecialties(reqTargetSheet, reqT2),
            ])];
            const requests = session?.metadata?.rollRequests || [];
            const traitSelect = (val, setVal) => (
              <select className={styles.formInput} value={val} onChange={e => { setVal(e.target.value); setReqSpec(''); }}>
                <optgroup label="Attributes">
                  {ATTR_NAMES.map(a => <option key={a} value={a}>{a}</option>)}
                </optgroup>
                <optgroup label="Skills">
                  {SKILL_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
                </optgroup>
                <optgroup label="Disciplines">
                  {ALL_DISCIPLINE_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
                </optgroup>
              </select>
            );
            return (
              <div style={{ paddingTop: visibleTools[0] !== 'request' ? '1rem' : '0', borderTop: visibleTools[0] !== 'request' ? '1px solid var(--outline-variant)' : 'none' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '0.75rem' }}>Request a Roll</h3>

                <select className={styles.formInput} style={{ marginBottom: '0.5rem' }} value={reqTarget} onChange={e => { setReqTarget(e.target.value); setReqSpec(''); }}>
                  <option value="">Select player…</option>
                  {players.map(p => {
                    const id = p.character_id ?? p.id;
                    return <option key={id} value={id}>{p.name ?? p.character_name}</option>;
                  })}
                </select>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.4rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  {traitSelect(reqT1, setReqT1)}
                  <span style={{ color: 'var(--text-muted)' }}>+</span>
                  {traitSelect(reqT2, setReqT2)}
                </div>

                {reqTarget && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      {reqTargetPlayer?.name ?? 'Player'}&rsquo;s specialties {reqSpecs.length === 0 && '— none for these traits'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {reqSpecs.map(sp => (
                        <button
                          key={sp}
                          className={`${styles.npcItem} ${reqSpec === sp ? styles.active : ''}`}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', width: 'auto' }}
                          onClick={() => setReqSpec(reqSpec === sp ? '' : sp)}
                        >
                          {sp}{reqSpec === sp ? ' +1' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div className={styles.formGroup} style={{ marginBottom: 0, width: '90px' }}>
                    <label>Difficulty</label>
                    <input type="number" min="0" className={styles.formInput} value={reqDiff} onChange={e => setReqDiff(e.target.value)} />
                  </div>
                  <div className={styles.formGroup} style={{ marginBottom: 0, flex: 1 }}>
                    <label>Note (optional)</label>
                    <input type="text" className={styles.formInput} value={reqNote} onChange={e => setReqNote(e.target.value)} placeholder="e.g. Climbing the fire escape" />
                  </div>
                </div>

                <button
                  className={styles.btnPrimary}
                  disabled={!reqTarget || session?.status === 'ended'}
                  onClick={sendRollRequest}
                >
                  Request {reqT1} + {reqT2}{reqSpec ? ` + ${reqSpec}` : ''}{Number(reqDiff) > 0 ? ` · Diff ${reqDiff}` : ''}
                </button>

                {requests.length > 0 && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {requests.map(req => {
                      const answered = rolls.find(r =>
                        String(r.character_id) === String(req.targetId) &&
                        r.roll_type === 'requested_roll' &&
                        (r.note || '').includes(req.id.slice(-6))
                      );
                      return (
                        <div key={req.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '0.4rem 0.55rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                              {req.targetName}: {req.trait1} + {req.trait2}{req.specialty ? ` + ${req.specialty}` : ''}
                              {req.difficulty > 0 ? ` · Diff ${req.difficulty}` : ''}
                            </span>
                            <button className={styles.btnOutline} style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem', color: 'var(--danger)', borderColor: 'transparent' }} onClick={() => cancelRollRequest(req.id)}>Clear</button>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: answered ? 'var(--success)' : 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {answered ? `Rolled — ${answered.successes ?? 0} success${(answered.successes ?? 0) === 1 ? '' : 'es'}` : 'Waiting for the player…'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {visibleTools.includes('dice') && (
            <div className={styles.diceRoller} style={{ marginTop: 0, paddingTop: visibleTools[0] !== 'dice' ? '1rem' : '0', borderTop: visibleTools[0] !== 'dice' ? '1px solid var(--outline-variant)' : 'none' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '1rem' }}>Roll for: <span style={{ color: 'var(--primary)' }}>{rollerEntity}</span></h3>

              <div className={styles.diceGrid}>
                <div className={styles.formGroup}>
                  <label>Normal Dice</label>
                  <input type="number" className={styles.formInput} min="0" max="20" value={rollerNormal} onChange={e => setRollerNormal(e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label>Hunger Dice</label>
                  <input type="number" className={styles.formInput} min="0" max="5"  value={rollerHunger} onChange={e => setRollerHunger(e.target.value)} />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Difficulty (Optional)</label>
                <input type="number" className={styles.formInput} min="0" value={rollerDiff} onChange={e => setRollerDiff(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Note / Action</label>
                <input type="text" className={styles.formInput} value={rollerNote} onChange={e => setRollerNote(e.target.value)} />
              </div>

              <button className={styles.btnPrimary} style={{ marginTop: '1rem' }} onClick={rollAsEntity}>
                Public Roll {(parseInt(rollerNormal) || 0) + (parseInt(rollerHunger) || 0)} Dice
              </button>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--outline-variant)' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0', textTransform: 'uppercase' }}>Opposed roll</h4>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>vs pool</span>
                  <input type="number" min="0" className={styles.formInput} style={{ width: '60px' }} value={oppNormal} onChange={e => setOppNormal(e.target.value)} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>hunger</span>
                  <input type="number" min="0" max="5" className={styles.formInput} style={{ width: '55px' }} value={oppHunger} onChange={e => setOppHunger(e.target.value)} />
                </div>
                <button className={styles.btnSecondary} onClick={async () => {
                  const a = rollPool(parseInt(rollerNormal) || 0, parseInt(rollerHunger) || 0);
                  const b = rollPool(parseInt(oppNormal) || 0, parseInt(oppHunger) || 0);
                  const margin = a.outcome.successes - b.outcome.successes;
                  const verdict = margin > 0 ? `${rollerEntity} wins by ${margin}` : margin < 0 ? `opponent wins by ${-margin}` : 'tie (defender / lower Hunger wins)';
                  await logLiveSessionRoll(sessionId, {
                    character_id: null, character_name: rollerEntity, roll_type: 'opposed_roll',
                    pool: a.pool, hunger: a.hunger,
                    results: { normal: a.normalDice, hunger: a.hungerDice },
                    successes: a.outcome.successes,
                    has_messy_critical: a.outcome.hasMessyCritical, has_bestial_failure: a.outcome.hasBestialFailure,
                    note: `Opposed — ${rollerEntity} ${a.outcome.successes} vs ${b.outcome.successes}: ${verdict}. ${rollerNote}`,
                  });
                  flash(verdict);
                }}>Roll contest</button>
              </div>
            </div>
          )}

          {visibleTools.includes('remorse') && (
            <div style={{ paddingTop: visibleTools[0] !== 'remorse' ? '1rem' : '0', borderTop: visibleTools[0] !== 'remorse' ? '1px solid var(--outline-variant)' : 'none' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '0.35rem' }}>Remorse (End of Session)</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' }}>
                Rolls (10 &minus; Humanity &minus; Stains). No success means the character loses a point of Humanity &mdash; applied automatically.
              </p>
              {players.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No players connected.</div>}
              {players.map(p => {
                const charId = p.character_id ?? p.id;
                const name = p.name ?? p.character_name ?? 'Unknown';
                return (
                  <div key={charId} className={styles.remorseRow}>
                    <span className={styles.remorseName}>{name}</span>
                    <input
                      type="number"
                      min="0"
                      className={styles.remorseStains}
                      title="Stains"
                      value={remorseStains[charId] ?? 1}
                      onChange={e => setRemorseStains(prev => ({ ...prev, [charId]: e.target.value }))}
                    />
                    <button
                      className={styles.btnSecondary}
                      style={{ width: 'auto', padding: '0.25rem 0.6rem', fontSize: '0.7rem' }}
                      disabled={!sessionId}
                      onClick={() => rollRemorse(p)}
                    >
                      Roll
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {visibleTools.includes('library') && (
            <div style={{ paddingTop: visibleTools[0] !== 'library' ? '1rem' : '0', borderTop: visibleTools[0] !== 'library' ? '1px solid var(--outline-variant)' : 'none' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '0.35rem' }}>Reference Library</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' }}>
                Opens the PDF in a new tab. Source citations in the search panel link straight to the page.
              </p>
              <div className={styles.bookList}>
                {BOOKS.filter(b => b.file).map(b => (
                  <a
                    key={b.file}
                    className={styles.bookLink}
                    href={BOOK_BASE + b.file}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="material-symbols-outlined">menu_book</span>
                    <span>{b.label}</span>
                    <span className="material-symbols-outlined">open_in_new</span>
                  </a>
                ))}
              </div>
              {BOOKS.some(b => !b.file) && (
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
                  Not uploaded: {BOOKS.filter(b => !b.file).map(b => b.label).join(', ')}
                </p>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
