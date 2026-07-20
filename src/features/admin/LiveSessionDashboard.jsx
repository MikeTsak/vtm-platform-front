// src/features/admin/LiveSessionDashboard.jsx
import React, { useEffect, useState } from 'react';
import MiniSearch from 'minisearch';
import api from '../../core/api';
import { getLiveSession, getLiveSessionPlayers, getLiveSessionRolls, createLiveSession, updateLiveSessionPlayer, sendLiveSessionBroadcast, logLiveSessionRoll } from '../../api/liveSession';
import { DISCIPLINES } from '../../data/disciplines';
import { rollPool } from '../../utils/liveSessionMechanics';
import sharedStyles from '../../styles/LiveSession.module.css';
import adminStyles from '../../styles/LiveSessionAdmin.module.css';

const styles = { ...sharedStyles, ...adminStyles };

const REFERENCE_RULES = [
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
    content: 'Triggered by anger (Fury), hunger (Hunger), or fear (Terror).\nRoll Willpower to resist (Resolve + Composure). Difficulty varies by provocation (usually 2-4).\nFailure means the Beast takes over. You can spend Willpower to take a single action of your choice during a Frenzy.'
  }
];

const REFERENCE_MERITS = [
  { category: 'merits', title: 'Beautiful', cost: 2, content: '+1 die to Social pools.' },
  { category: 'merits', title: 'Stunning', cost: 4, content: '+2 dice to Social pools.' },
  { category: 'merits', title: 'Iron Will', cost: 3, content: '+2 dice to resist mental manipulation.' },
  { category: 'merits', title: 'Haven', cost: '1-3', content: 'Secure resting place. Rating dictates security.' },
  { category: 'merits', title: 'Linguistics', cost: 1, content: 'Know one additional language per point.' },
  { category: 'merits', title: 'Fame', cost: '1-3', content: 'You are widely known. Can help with influence or feeding.' },
  { category: 'merits', title: 'Resources', cost: '1-5', content: 'Wealth and disposable income.' }
];

const REFERENCE_FLAWS = [
  { category: 'flaws', title: 'Ugly', cost: 1, content: '-1 die to Social pools.' },
  { category: 'flaws', title: 'Repulsive', cost: 2, content: '-2 dice to Social pools.' },
  { category: 'flaws', title: 'Infamy', cost: '1-3', content: 'You are known for something terrible. Dice penalties to social.' },
  { category: 'flaws', title: 'Stigmata', cost: 2, content: 'Bleed from hands/feet/face when you hit Hunger 4.' },
  { category: 'flaws', title: 'Dark Secret', cost: '1-2', content: 'If discovered, you face severe consequences.' },
  { category: 'flaws', title: 'Folkloric Bane', cost: 1, content: 'Take aggravated damage from a traditional bane (e.g. silver, garlic).' },
  { category: 'flaws', title: 'Folkloric Block', cost: 1, content: 'Must shrink away from a traditional ward (e.g. crucifix, threshold).' }
];

const REFERENCE_DISCIPLINES = [];
Object.keys(DISCIPLINES).forEach(disc => {
  Object.keys(DISCIPLINES[disc].levels || {}).forEach(level => {
    DISCIPLINES[disc].levels[level].forEach(power => {
      REFERENCE_DISCIPLINES.push({
        category: 'disciplines',
        title: `${power.name} (${disc} ${level})`,
        content: `Cost: ${power.cost}\nPool: ${power.dice_pool}\n${power.notes || power.duration || ''}`
      });
    });
  });
});

const allReferenceData = [...REFERENCE_RULES, ...REFERENCE_DISCIPLINES, ...REFERENCE_MERITS, ...REFERENCE_FLAWS];
const miniSearch = new MiniSearch({
  fields: ['title', 'content', 'category'],
  storeFields: ['title', 'content', 'category', 'cost'],
  searchOptions: {
    fuzzy: 0.4, // HIGH typo tolerance (e.g., 'aspxe' will match 'auspex')
    prefix: true // Also matches partial words
  }
});
miniSearch.addAll(allReferenceData.map((item, index) => ({ id: index, ...item })));

const FRENZY_TYPES = [
  { key: 'fury', label: 'Fury Frenzy', color: '#dc2626', icon: '🔥' },
  { key: 'hunger', label: 'Hunger Frenzy', color: '#f97316', icon: '🩸' },
  { key: 'terror', label: 'Terror Frenzy', color: '#7c3aed', icon: '💀' },
];

const ADMIN_TOOLS_INDEX = [
  { id: 'npc', title: 'Rapid NPC / Monsters', content: 'actor generator random ghoul vampire thug bouncer detective cultist' },
  { id: 'dice', title: 'Dice Roller', content: 'roll hunger normal difficulty public note action' }
];

const toolsMiniSearch = new MiniSearch({
  fields: ['title', 'content'],
  storeFields: ['title'],
  searchOptions: { fuzzy: 0.3, prefix: true }
});
toolsMiniSearch.addAll(ADMIN_TOOLS_INDEX);


function AdminStatusBar({ label, sup = 0, agg = 0, max = 1, onAdjust }) {
  const safeMax = Math.max(1, Number(max) || 1);
  const aggCount = Math.min(agg, safeMax);
  const supCount = Math.min(sup, safeMax - aggCount);

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '4px' }}>
        <span>{label}</span>
        <span>{safeMax - (aggCount + supCount)} / {safeMax}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        {Array.from({ length: safeMax }).map((_, i) => {
          const isAgg = i < aggCount;
          const isSup = !isAgg && i < aggCount + supCount;
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

export default function LiveSessionDashboard() {
  const [sessionId, setSessionId] = useState(localStorage.getItem('adminLiveSessionId') || '');
  const [sessionName, setSessionName] = useState('VTM Live Scene');
  const [session, setSession] = useState(null);

  const [players, setPlayers] = useState([]);
  const [rolls, setRolls] = useState([]);
  const [broadcast, setBroadcast] = useState('');

  const [archives, setArchives] = useState([]);
  const [liveDuration, setLiveDuration] = useState(0);

  // Layout states
  const [searchQuery, setSearchQuery] = useState('');
  const [toolSearchQuery, setToolSearchQuery] = useState('');

  // NPC / Roller states
  const [tempNPCs, setTempNPCs] = useState([
    { id: 'npc-1', name: 'Mortal Bystander', defaultPool: 4 },
    { id: 'npc-2', name: 'Ghoul Guard', defaultPool: 5 },
    { id: 'npc-3', name: 'SI Agent', defaultPool: 6 }
  ]);
  const [newNpcName, setNewNpcName] = useState('');
  const [newNpcPool, setNewNpcPool] = useState(5);
  
  const [rollerEntity, setRollerEntity] = useState('Storyteller');
  const [rollerNormal, setRollerNormal] = useState(5);
  const [rollerHunger, setRollerHunger] = useState(0);
  const [rollerDiff, setRollerDiff] = useState(0);
  const [rollerNote, setRollerNote] = useState('Admin Roll');

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const sData = await getLiveSession(sessionId).catch(e => { console.error('Failed to load session:', e); return null; });
        if (sData) setSession(sData.session || sData);

        const pData = await getLiveSessionPlayers(sessionId).catch(e => { console.error('Failed to load players:', e); return null; });
        if (pData) setPlayers(pData.players || pData || []);

        const rData = await getLiveSessionRolls(sessionId).catch(e => { console.error('Failed to load rolls:', e); return null; });
        if (rData) setRolls(rData.rolls || rData || []);
      } catch (e) {
        console.error('Unexpected error in load loop:', e);
      }
    };
    load();
    const int = setInterval(load, 5000);
    return () => clearInterval(int);
  }, [sessionId]);

  useEffect(() => {
    if (session?.status === 'active' && session?.created_at) {
      const int = setInterval(() => {
        setLiveDuration(Math.floor((Date.now() - new Date(session.created_at).getTime()) / 1000));
      }, 1000);
      return () => clearInterval(int);
    } else if (session?.status === 'ended') {
      setLiveDuration(session.duration_seconds || 0);
    }
  }, [session]);

  useEffect(() => {
    loadArchives();
  }, []);

  const loadArchives = async () => {
    try {
      const { data } = await api.get('/admin/live-sessions');
      setArchives(data.sessions || []);
    } catch (e) { }
  };

  const formatTime = (secs) => {
    if (!secs || secs < 0) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startSession = async () => {
    try {
      const data = await createLiveSession({ name: sessionName });
      const newId = String(data?.session?.session_code || data?.id);
      setSessionId(newId);
      localStorage.setItem('adminLiveSessionId', newId);
      loadArchives();
    } catch (e) { }
  };

  const endSession = async () => {
    if (!window.confirm("Are you sure you want to end this Live Session? The timer will be locked.")) return;
    try {
      await api.post(`/live-session/${sessionId}/end`);
      const sData = await getLiveSession(sessionId);
      setSession(sData.session || sData);
      loadArchives();
    } catch (e) { }
  };

  const adjustPlayer = async (charId, deltas) => {
    if (session?.status === 'ended') return alert("This session has ended.");
    setPlayers(prev => prev.map(p => {
      if (p.character_id !== charId && p.id !== charId) return p;
      const next = { ...p };
      let sheet = {};
      try { sheet = typeof next.sheet === 'string' ? JSON.parse(next.sheet) : { ...(next.sheet || {}) }; } catch(e) {}

      if (deltas.hungerDelta) {
        sheet.hunger = Math.max(0, Math.min(5, Number(sheet.hunger || 0) + Number(deltas.hungerDelta)));
      }
      if (deltas.humanityDelta) {
        const currentHum = Number(sheet.morality?.humanity ?? sheet.humanity ?? 7);
        const nextHum = Math.max(0, Math.min(10, currentHum + Number(deltas.humanityDelta)));
        sheet.humanity = nextHum;
        if (!sheet.morality) sheet.morality = {};
        sheet.morality.humanity = nextHum;
      }
      if (deltas.healthSupDelta !== undefined) {
        if (!sheet.health) sheet.health = { superficial: 0, aggravated: 0 };
        sheet.health.superficial = Math.max(0, Number(sheet.health.superficial || 0) + Number(deltas.healthSupDelta));
      }
      if (deltas.healthAggDelta !== undefined) {
        if (!sheet.health) sheet.health = { superficial: 0, aggravated: 0 };
        sheet.health.aggravated = Math.max(0, Number(sheet.health.aggravated || 0) + Number(deltas.healthAggDelta));
      }
      if (deltas.wpSupDelta !== undefined) {
        if (!sheet.willpower) sheet.willpower = { superficial: 0, aggravated: 0 };
        sheet.willpower.superficial = Math.max(0, Number(sheet.willpower.superficial || 0) + Number(deltas.wpSupDelta));
      }
      if (deltas.wpAggDelta !== undefined) {
        if (!sheet.willpower) sheet.willpower = { superficial: 0, aggravated: 0 };
        sheet.willpower.aggravated = Math.max(0, Number(sheet.willpower.aggravated || 0) + Number(deltas.wpAggDelta));
      }
      if (deltas.frenzyState !== undefined) {
        sheet.frenzyState = deltas.frenzyState;
      }
      
      next.sheet = JSON.stringify(sheet);
      return next;
    }));

    await api.patch(`/live-session/${sessionId}/players/${charId}`, deltas).catch(() => { });

    if (deltas.frenzyState) {
      const p = players.find(x => x.character_id === charId || x.id === charId);
      const f = FRENZY_TYPES.find(x => x.key === deltas.frenzyState);
      if (p && f) {
        await sendLiveSessionBroadcast(sessionId, { message: `⚠️ ${p.name || p.character_name} has entered a ${f.label}!` });
      }
    }
  };

  const handleBroadcast = async () => {
    if (!broadcast.trim() || session?.status === 'ended') return;
    await sendLiveSessionBroadcast(sessionId, { message: broadcast.trim() });
    setBroadcast('');
  };

  const visibleTools = React.useMemo(() => {
    if (!toolSearchQuery.trim()) return ADMIN_TOOLS_INDEX.map(t => t.id);
    return toolsMiniSearch.search(toolSearchQuery.trim()).map(res => res.id);
  }, [toolSearchQuery]);

  const addNPC = () => {
    if (!newNpcName.trim()) return;
    setTempNPCs(prev => [...prev, { id: `npc-${Date.now()}`, name: newNpcName, defaultPool: parseInt(newNpcPool) || 1 }]);
    setNewNpcName('');
  };

  const executeAdminRoll = async () => {
    if (!sessionId) return alert("Must be in an active session to roll.");
    const normal = parseInt(rollerNormal) || 0;
    const hunger = parseInt(rollerHunger) || 0;
    const diff = parseInt(rollerDiff) || 0;
    
    const results = rollPool(normal, hunger);
    const normalSuccesses = results.normal.filter(d => d >= 6).length + (results.normal.filter(d => d === 10).length >= 2 ? Math.floor(results.normal.filter(d => d === 10).length / 2) * 2 : 0);
    const hungerSuccesses = results.hunger.filter(d => d >= 6).length + (results.hunger.filter(d => d === 10).length >= 2 ? Math.floor(results.hunger.filter(d => d === 10).length / 2) * 2 : 0);
    const totalSuccesses = normalSuccesses + hungerSuccesses;
    
    await logLiveSessionRoll(sessionId, {
      character_id: null, // Admin roll
      character_name: rollerEntity,
      roll_type: 'admin_roll',
      pool: normal + hunger,
      hunger: hunger,
      difficulty: diff,
      results: results,
      successes: totalSuccesses,
      note: rollerNote
    });
    
    const rData = await getLiveSessionRolls(sessionId);
    setRolls(rData.rolls || rData || []);
  };

  return (
    <div className={styles.dashboardContainer}>
      
      {/* PANE 1: LEFT (Information & Controls) */}
      <div className={styles.pane}>
        <div className={styles.paneHeader}>
          <h2>ST Controls</h2>
        </div>
        <div className={styles.paneContent} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
          
          {/* Controls */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input className={styles.formInput} value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="Chronicle Name" />
              <button className={styles.btnPrimary} onClick={startSession}>Initialize Table</button>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input className={styles.formInput} style={{ flex: 1 }} value={sessionId} onChange={e => { setSessionId(e.target.value); localStorage.setItem('adminLiveSessionId', e.target.value); }} placeholder="Session Code" />
              </div>
            </div>

            {session ? (
              <div style={{ marginTop: '1rem', background: 'var(--surface-container-highest)', border: 'var(--glass-border)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', boxShadow: 'var(--glass-shadow)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '0.1em', color: session.status === 'active' ? '#10b981' : '#e11d48', marginBottom: '0.25rem' }}>
                  {session.status === 'active' ? '⏱️ ACTIVE' : '🛑 ENDED'}
                </div>
                <div style={{ fontSize: '1.5rem', fontFamily: 'monospace', fontWeight: 800 }}>
                  {formatTime(liveDuration)}
                </div>
                {session.status === 'active' && (
                  <button className={styles.btnOutline} style={{ marginTop: '0.75rem', width: '100%', borderColor: '#e11d48', color: '#e11d48' }} onClick={endSession}>End Session</button>
                )}
              </div>
            ) : (
              sessionId && <div style={{ marginTop: '1rem', color: '#e11d48', fontSize: '0.85rem', textAlign: 'center', padding: '0.5rem', border: '1px solid #e11d48', borderRadius: '4px', background: 'rgba(225,29,72,0.1)' }}>
                ⚠️ Not connected. Invalid session code or server error.
              </div>
            )}
          </div>

          {/* Quick Reference Wiki */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--outline-variant)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.5rem', background: 'var(--surface-container-high)', borderBottom: 'var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>🔍</span>
              <input 
                type="text" 
                placeholder="Universal Search (Rules, Disciplines, Merits...)" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={styles.formInput}
                style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.75rem' }}
              />
            </div>
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, background: 'var(--surface-container-highest)', fontSize: '0.85rem' }}>
              {(() => {
                const query = searchQuery.trim();
                
                let matches = [];
                if (query) {
                  // Use MiniSearch with fuzzy matching
                  matches = miniSearch.search(query);
                } else {
                  matches = allReferenceData;
                }
                
                if (matches.length === 0) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>No matches found.</div>;
                
                return matches.map((m) => (
                  <div key={m.id || Math.random()} className={styles.wikiSection} style={{ marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.85rem', color: 'var(--primary)', margin: '0 0 0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{m.title} {m.cost ? `(${m.cost})` : ''}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', border: '1px solid var(--outline-variant)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{m.category}</span>
                    </h3>
                    <p style={{ fontSize: '0.75rem', margin: 0, whiteSpace: 'pre-wrap' }}>{m.content}</p>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Archives */}
          <div>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Archives</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
              {archives.map(arch => (
                <div key={arch.id} className={styles.npcItem} onClick={() => { setSessionId(arch.session_code || arch.id); localStorage.setItem('adminLiveSessionId', arch.session_code || arch.id); }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{arch.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(arch.created_at).toLocaleDateString()} • Code: {arch.session_code || arch.id}</div>
                  </div>
                </div>
              ))}
              {archives.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No archives.</div>}
            </div>
          </div>

        </div>
      </div>
      
      {/* PANE 2: CENTER (Live Activity) */}
      <div className={styles.pane} style={{ flex: 1 }}>
        
        {/* Top: Players */}
        <div className={styles.centerTop}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--primary)', fontSize: '1.5rem' }}>Live Player Overview</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className={styles.formInput} style={{ width: '250px' }} value={broadcast} onChange={e => setBroadcast(e.target.value)} placeholder="ST Broadcast message..." disabled={session?.status === 'ended'} />
              <button className={styles.btnPrimary} style={{ width: 'auto' }} onClick={handleBroadcast} disabled={session?.status === 'ended'}>Send</button>
              <button className={styles.btnOutline} style={{ borderColor: '#f97316', color: '#f97316' }} onClick={() => Promise.all(players.map(p => adjustPlayer(p.character_id || p.id, { hungerDelta: 1 })))} disabled={session?.status === 'ended'}>+1 Ambient Hunger</button>
            </div>
          </div>
          
          <div className={styles.playerGrid}>
            {players.map(p => {
              const charId = p.character_id || p.id;
              let sheet = {};
              try {
                sheet = typeof p.sheet === 'string' ? JSON.parse(p.sheet) : (p.sheet || {});
              } catch (e) { }

              const frenzyState = sheet.frenzyState || p.frenzyState;
              const activeFrenzy = FRENZY_TYPES.find(f => f.key === frenzyState);

              const healthMax = Number(sheet.health?.max || 5);
              const healthSup = Number(sheet.health?.superficial || 0);
              const healthAgg = Number(sheet.health?.aggravated || 0);

              const wpMax = Number(sheet.willpower?.max || 5);
              const wpSup = Number(sheet.willpower?.superficial || 0);
              const wpAgg = Number(sheet.willpower?.aggravated || 0);

              const hunger = Number(sheet.hunger || p.hunger || 0);
              const humanity = Number(sheet.humanity || sheet.morality?.humanity || p.humanity || 7);
              const name = p.name || p.character_name || sheet.name || 'Unknown';
              const clan = p.clan || sheet.clan || 'Unknown';

              return (
                <div key={charId} className={styles.playerCard} style={{ borderColor: activeFrenzy ? activeFrenzy.color : 'var(--outline-variant)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                        <div className={styles.playerClan}>{clan}</div>
                      </div>
                    </div>
                    <select
                      className={styles.formInput}
                      style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderColor: activeFrenzy ? activeFrenzy.color : 'inherit', color: activeFrenzy ? activeFrenzy.color : 'inherit' }}
                      value={frenzyState || ''}
                      onChange={(e) => adjustPlayer(charId, { frenzyState: e.target.value || null })}
                    >
                      <option value="">✓ Calm (Normal State)</option>
                      {FRENZY_TYPES.map(f => <option key={f.key} value={f.key}>{f.icon} {f.label}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <AdminStatusBar
                      label="Health"
                      max={healthMax}
                      sup={healthSup}
                      agg={healthAgg}
                      onAdjust={(type, delta) => adjustPlayer(charId, type === 'sup' ? { healthSupDelta: delta } : { healthAggDelta: delta })}
                    />

                    <AdminStatusBar
                      label="Willpower"
                      max={wpMax}
                      sup={wpSup}
                      agg={wpAgg}
                      onAdjust={(type, delta) => adjustPlayer(charId, type === 'sup' ? { wpSupDelta: delta } : { wpAggDelta: delta })}
                    />
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
        
        {/* Bottom: Roll Feed */}
        <div className={styles.centerBottom}>
          <div className={styles.paneHeader} style={{ borderTop: '1px solid var(--outline-variant)' }}>
            <h2>Live Activity Feed</h2>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rolls.slice(0, 50).map((r, i) => (
              <div key={i} style={{ background: 'var(--surface-container-highest)', padding: '0.8rem', borderRadius: '8px', borderLeft: r.has_bestial_failure || r.has_messy_critical ? '4px solid #e11d48' : '4px solid #3f3f4e' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.9rem', color: '#fff' }}>{r.player_name || r.character_name}</span>
                  <span style={{ color: '#fbbf24', fontSize: '0.9rem' }}>{r.successes} Succ</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{r.roll_type} {r.note ? `— ${r.note}` : ''}</div>

                {r.results && (r.results.normal || r.results.hunger || r.results.rouse) && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {(r.results.normal || []).map((die, idx) => (
                      <div key={`n-${idx}`} style={{ width: 18, height: 18, borderRadius: 4, background: die >= 6 ? '#e4e4e7' : 'rgba(255,255,255,0.1)', color: die >= 6 ? '#000' : '#a1a1aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>{die}</div>
                    ))}
                    {(r.results.hunger || r.results.rouse || []).map((die, idx) => (
                      <div key={`h-${idx}`} style={{ width: 18, height: 18, borderRadius: 4, background: die >= 6 ? '#e11d48' : 'transparent', border: '1px solid #e11d48', color: die >= 6 ? '#fff' : '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>{die}</div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', color: '#a89a9c', marginTop: '6px', display: 'flex', gap: '12px' }}>
                  <span>Pool: {r.pool}</span>
                  <span>Hunger: {r.hunger}</span>
                  {r.has_bestial_failure && <span style={{ color: '#e11d48', fontWeight: 700 }}>⚠️ Bestial</span>}
                  {r.has_messy_critical && <span style={{ color: '#e11d48', fontWeight: 700 }}>🩸 Messy Crit</span>}
                </div>
              </div>
            ))}
            {rolls.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>No rolls in feed.</div>}
          </div>
        </div>
        
      </div>
      
      {/* PANE 3: RIGHT (Admin Tools) */}
      <div className={styles.pane}>
        <div className={styles.paneHeader} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.75rem' }}>
          <h2>Admin Tools</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem' }}>🔍</span>
            <input 
              type="text" 
              placeholder="Filter Tools..." 
              value={toolSearchQuery}
              onChange={e => setToolSearchQuery(e.target.value)}
              className={styles.formInput}
              style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
            />
          </div>
        </div>
        <div className={styles.paneContent} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* NPC Generator */}
          {visibleTools.includes('npc') && (
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '0.75rem' }}>Rapid NPC / Monsters</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input type="text" className={styles.formInput} style={{ flex: 1 }} placeholder="Name (e.g. Guard)" value={newNpcName} onChange={e => setNewNpcName(e.target.value)} />
              <input type="number" className={styles.formInput} style={{ width: '60px' }} placeholder="Pool" value={newNpcPool} onChange={e => setNewNpcPool(e.target.value)} />
            </div>
            <button className={styles.btnSecondary} onClick={addNPC}>Add Temp Actor</button>
            
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

          {/* Dice Roller */}
          {visibleTools.includes('dice') && (
          <div className={styles.diceRoller} style={{ marginTop: '0', paddingTop: visibleTools[0] !== 'dice' ? '1rem' : '0', borderTop: visibleTools[0] !== 'dice' ? '1px solid var(--outline-variant)' : 'none' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '1rem' }}>Roll for: <span style={{ color: 'var(--primary)' }}>{rollerEntity}</span></h3>
            
            <div className={styles.diceGrid}>
              <div className={styles.formGroup}>
                <label>Normal Dice</label>
                <input type="number" className={styles.formInput} min="0" max="20" value={rollerNormal} onChange={e => setRollerNormal(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Hunger Dice</label>
                <input type="number" className={styles.formInput} min="0" max="5" value={rollerHunger} onChange={e => setRollerHunger(e.target.value)} />
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

            <button className={styles.btnPrimary} style={{ marginTop: '1rem' }} onClick={executeAdminRoll}>
              Public Roll {parseInt(rollerNormal || 0) + parseInt(rollerHunger || 0)} Dice
            </button>
          </div>
          )}

        </div>
      </div>

    </div>
  );
}