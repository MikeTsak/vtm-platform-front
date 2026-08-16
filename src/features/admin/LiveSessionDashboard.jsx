// src/features/admin/LiveSessionDashboard.jsx
import React, { useEffect, useState } from 'react';
import MiniSearch from 'minisearch';
import api from '../../core/api';
import {
  getLiveSession, getLiveSessionPlayers, getLiveSessionRolls, getLiveSessionBroadcasts,
  createLiveSession, sendLiveSessionBroadcast, logLiveSessionRoll, socket
} from '../../api/liveSession';
import { DISCIPLINES } from '../../data/disciplines';
import { rollPool, summarizeTrackers } from '../../utils/liveSessionMechanics';
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
    powers.map(p => ({
      category: 'disciplines',
      title: `${p.name} (${disc} ${level})`,
      content: `Cost: ${p.cost}\nPool: ${p.dice_pool}\n${p.notes || p.duration || ''}`
    }))
  )
);

const ALL_REFERENCE = [...RULES, ...DISC_ENTRIES, ...MERITS, ...FLAWS];

const wikiSearch = new MiniSearch({
  fields: ['title', 'content', 'category'],
  storeFields: ['title', 'content', 'category', 'cost'],
  // fuzzy 0.4 intentionally high — VtM terminology is esoteric and players typo constantly
  searchOptions: { fuzzy: 0.4, prefix: true }
});
wikiSearch.addAll(ALL_REFERENCE.map((item, id) => ({ id, ...item })));

const FRENZY_TYPES = [
  { key: 'fury',   label: 'Fury Frenzy',   color: '#dc2626', icon: '🔥' },
  { key: 'hunger', label: 'Hunger Frenzy', color: '#f97316', icon: '🩸' },
  { key: 'terror', label: 'Terror Frenzy', color: '#7c3aed', icon: '💀' },
];

const TOOLS_INDEX = [
  { id: 'vibe',       title: 'Scene & Vibe',        content: 'ambient calm frenzy danger supernatural spooky metadata' },
  { id: 'clocks',     title: 'Session Clocks',      content: 'timers time rounds countdown' },
  { id: 'initiative', title: 'Initiative Tracker',  content: 'combat order turn' },
  { id: 'npc',        title: 'Rapid NPC / Monsters', content: 'actor generator random ghoul vampire thug bouncer detective cultist' },
  { id: 'dice',       title: 'Dice Roller',          content: 'roll hunger normal difficulty public note action' }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '4px' }}>
        <span>{label}</span>
        <span>{cap - (aggN + supN)} / {cap}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        {Array.from({ length: cap }).map((_, i) => {
          const isAgg = i < aggN;
          const isSup = !isAgg && i < aggN + supN;
          return (
            <div key={i} style={{ width: 14, height: 14, borderRadius: 2, border: isAgg ? '1px solid #e11d48' : isSup ? '1px solid #a1a1aa' : '1px solid rgba(255,255,255,0.15)', background: isAgg ? '#e11d48' : isSup ? 'rgba(161,161,170,0.35)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isAgg && <svg width="8" height="8" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><line x1="9" y1="1" x2="1" y2="9" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>}
              {isSup && <div style={{ width: 6, height: 2, background: '#a1a1aa', borderRadius: 1 }} />}
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

  const updateMetadata = async (newMetaProps) => {
    if (session?.status === 'ended') return;
    const updated = { ...(session?.metadata || {}), ...newMetaProps };
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

      if (deltas.frenzyState !== undefined) sheet.frenzyState = deltas.frenzyState;

      return { ...p, sheet: JSON.stringify(sheet) };
    }));

    await api.patch(`/live-session/${sessionId}/players/${charId}`, deltas).catch(() => {});

    if (deltas.frenzyState) {
      const player = players.find(x => x.character_id === charId || x.id === charId);
      const frenzy = FRENZY_TYPES.find(x => x.key === deltas.frenzyState);
      if (player && frenzy) {
        const name = player.name ?? player.character_name;
        await sendLiveSessionBroadcast(sessionId, { message: `⚠️ ${name} has entered a ${frenzy.label}!` });
      }
    }
  };

  const sendBroadcast = async () => {
    if (!broadcast.trim() || session?.status === 'ended') return;
    await sendLiveSessionBroadcast(sessionId, { message: broadcast.trim(), target_character_id: broadcastTarget || null });
    setBroadcast('');
  };

  const addNPC = () => {
    if (!newNpcName.trim()) return;
    setTempNPCs(prev => [...prev, { id: `npc-${Date.now()}`, name: newNpcName, defaultPool: parseInt(newNpcPool) || 1 }]);
    setNewNpcName('');
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
              <div style={{ fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '0.1em', color: session.status === 'active' ? '#10b981' : '#e11d48', marginBottom: '0.25rem' }}>
                {session.status === 'active' ? '⏱️ ACTIVE' : '🛑 ENDED'}
              </div>
              <div style={{ fontSize: '1.5rem', fontFamily: 'monospace', fontWeight: 800 }}>{fmtTime(duration)}</div>
              {session.status === 'active' && (
                <button className={styles.btnOutline} style={{ marginTop: '0.75rem', width: '100%', borderColor: '#e11d48', color: '#e11d48' }} onClick={endSession}>End Session</button>
              )}
            </div>
          ) : sessionId && (
            <div style={{ color: '#e11d48', fontSize: '0.85rem', textAlign: 'center', padding: '0.5rem', border: '1px solid #e11d48', borderRadius: '4px', background: 'rgba(225,29,72,0.1)' }}>
              ⚠️ Not connected. Invalid session code or server error.
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--outline-variant)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.5rem', background: 'var(--surface-container-high)', borderBottom: 'var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔍</span>
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
                <option value="">🗣️ All Players</option>
                {players.map(p => <option key={p.character_id ?? p.id} value={p.character_id ?? p.id}>🤫 Whisper: {p.name ?? p.character_name}</option>)}
              </select>
              <input className={styles.formInput} style={{ width: '220px' }} value={broadcast} onChange={e => setBroadcast(e.target.value)} placeholder="ST Broadcast or Whisper..." disabled={session?.status === 'ended'} />
              <button className={styles.btnPrimary} style={{ width: 'auto' }} onClick={sendBroadcast} disabled={session?.status === 'ended'}>Send</button>
              <button className={styles.btnOutline} style={{ borderColor: '#f97316', color: '#f97316' }} onClick={() => Promise.all(players.map(p => adjustPlayer(p.character_id ?? p.id, { hungerDelta: 1 })))} disabled={session?.status === 'ended'}>+1 Ambient Hunger</button>
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

              return (
                <div key={charId} className={styles.playerCard} style={{ borderColor: frenzy?.color ?? 'var(--outline-variant)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                        <div className={styles.playerClan}>{clan}</div>
                      </div>
                    </div>
                    <select
                      className={styles.formInput}
                      style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderColor: frenzy?.color ?? 'inherit', color: frenzy?.color ?? 'inherit' }}
                      value={sheet.frenzyState ?? p.frenzyState ?? ''}
                      onChange={e => adjustPlayer(charId, { frenzyState: e.target.value || null })}
                    >
                      <option value="">✓ Calm (Normal State)</option>
                      {FRENZY_TYPES.map(f => <option key={f.key} value={f.key}>{f.icon} {f.label}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <StatusBar label="Health"    max={hp.max} sup={hp.sup} agg={hp.agg} onAdjust={(t, d) => adjustPlayer(charId, t === 'sup' ? { healthSupDelta: d } : { healthAggDelta: d })} />
                    <StatusBar label="Willpower" max={wp.max} sup={wp.sup} agg={wp.agg} onAdjust={(t, d) => adjustPlayer(charId, t === 'sup' ? { wpSupDelta: d }     : { wpAggDelta: d })} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '4px' }}>
                        <span>Hunger</span><span>{hunger} / 5</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', padding: '2px 0' }}>
                        {Array.from({ length: 5 }).map((_, i) => <span key={i} className={i < hunger ? styles.dotFilled : styles.dotEmpty} style={{ backgroundColor: i < hunger ? '#e11d48' : 'transparent', borderColor: '#e11d48' }} />)}
                      </div>
                      <div style={{ display: 'grid', gap: '4px', gridTemplateColumns: '1fr 1fr 2fr', marginTop: '0.5rem' }}>
                        <button className={styles.btnOutline} style={{ padding: '0.2rem', fontSize: '0.7rem' }} onClick={() => adjustPlayer(charId, { hungerDelta: -1 })}>-1</button>
                        <button className={styles.btnOutline} style={{ padding: '0.2rem', fontSize: '0.7rem' }} onClick={() => adjustPlayer(charId, { hungerDelta: 1 })}>+1</button>
                        <button className={styles.btnOutline} onClick={() => adjustPlayer(charId, { forceRouseCheck: true })} style={{ padding: '0.2rem', fontSize: '0.7rem', background: 'rgba(225,29,72,0.15)', color: '#fca5a5', borderColor: 'rgba(225,29,72,0.3)' }}>Rouse</button>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '4px' }}>
                        <span>Humanity</span><span>{humanity} / 10</span>
                      </div>
                      <div style={{ display: 'flex', gap: 2, padding: '2px 0', height: '14px' }}>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} style={{ flex: 1, borderRadius: 2, background: i < humanity ? '#22c55e' : 'rgba(255,255,255,0.1)' }} />
                        ))}
                      </div>
                      <div style={{ display: 'grid', gap: '4px', gridTemplateColumns: '1fr 1fr', marginTop: '0.5rem' }}>
                        <button className={styles.btnOutline} style={{ padding: '0.2rem', fontSize: '0.7rem' }} onClick={() => adjustPlayer(charId, { humanityDelta: -1 })}>-1 Stain</button>
                        <button className={styles.btnOutline} style={{ padding: '0.2rem', fontSize: '0.7rem' }} onClick={() => adjustPlayer(charId, { humanityDelta: 1 })}>+1 Mend</button>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
          {(!players || players.length === 0) && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '2rem' }}>No players connected to this session.</div>
          )}
        </div>

        <div className={styles.centerBottom}>
          <div className={styles.paneHeader} style={{ borderTop: '1px solid var(--outline-variant)' }}>
            <h2>Live Activity Feed</h2>
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
            <span>🔍</span>
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
                      <button className={styles.btnOutline} style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem', color: '#ef4444', borderColor: '#ef4444' }} onClick={() => {
                        const clocks = session.metadata.clocks.filter(clk => clk.id !== c.id);
                        updateMetadata({ clocks });
                      }}>X</button>
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
                  updateMetadata({ initiative: initList });
                  setInitName('');
                }}>Add</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {(session?.metadata?.initiative || []).map((actor, idx) => (
                  <div key={actor.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.85rem' }}>{idx + 1}. {actor.name}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>{actor.value}</span>
                      <button className={styles.btnOutline} style={{ padding: '0 0.3rem', color: '#ef4444', borderColor: 'transparent' }} onClick={() => {
                        const initList = session.metadata.initiative.filter(a => a.id !== actor.id);
                        updateMetadata({ initiative: initList });
                      }}>×</button>
                    </div>
                  </div>
                ))}
                {(session?.metadata?.initiative || []).length > 0 && (
                  <button className={styles.btnOutline} style={{ marginTop: '0.5rem', fontSize: '0.75rem' }} onClick={() => updateMetadata({ initiative: [] })}>Clear Initiative</button>
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
                }}>🎲 Gen. Random</button>
              </div>

              <div className={styles.npcList} style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <div className={`${styles.npcItem} ${rollerEntity === 'Storyteller' ? styles.active : ''}`} onClick={() => { setRollerEntity('Storyteller'); setRollerNormal(5); setRollerHunger(0); }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Storyteller (Global)</span>
                </div>
                {tempNPCs.map(npc => (
                  <div key={npc.id} className={`${styles.npcItem} ${rollerEntity === npc.name ? styles.active : ''}`} onClick={() => { setRollerEntity(npc.name); setRollerNormal(npc.defaultPool); setRollerHunger(0); }}>
                    <span style={{ fontSize: '0.85rem' }}>{npc.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Pool: {npc.defaultPool}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
