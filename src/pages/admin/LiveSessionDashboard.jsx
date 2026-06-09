// src/pages/admin/LiveSessionDashboard.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api';
import { getLiveSession, getLiveSessionPlayers, getLiveSessionRolls, createLiveSession, updateLiveSessionPlayer, sendLiveSessionBroadcast } from '../../api/liveSession';
import styles from '../../styles/LiveSession.module.css';

const FRENZY_TYPES = [
  { key: 'fury', label: 'Fury Frenzy', color: '#dc2626', icon: '🔥' },
  { key: 'hunger', label: 'Hunger Frenzy', color: '#f97316', icon: '🩸' },
  { key: 'terror', label: 'Terror Frenzy', color: '#7c3aed', icon: '💀' },
];

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
              {isAgg && <svg width="8" height="8" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="1" x2="1" y2="9" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}
              {isSup && <div style={{ width: 6, height: 2, background: '#a1a1aa', borderRadius: 1 }} />}
            </div>
          );
        })}
      </div>
      <div className={styles.miniBtnRow} style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        <button onClick={() => onAdjust('sup', -1)}>-Sup</button>
        <button onClick={() => onAdjust('sup', 1)}>+Sup</button>
        <button onClick={() => onAdjust('agg', -1)}>-Agg</button>
        <button onClick={() => onAdjust('agg', 1)}>+Agg</button>
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

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const [sData, pData, rData] = await Promise.all([
          getLiveSession(sessionId), getLiveSessionPlayers(sessionId), getLiveSessionRolls(sessionId)
        ]);
        setSession(sData.session || sData);
        setPlayers(pData.players || pData || []);
        setRolls(rData.rolls || rData || []);
      } catch (e) {}
    };
    load();
    const int = setInterval(load, 3000); 
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
    } catch (e) {}
  };

  const formatTime = (secs) => {
    if (!secs || secs < 0) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  const startSession = async () => {
    try {
      const data = await createLiveSession({ name: sessionName });
      const newId = String(data?.session?.session_code || data?.id);
      setSessionId(newId);
      localStorage.setItem('adminLiveSessionId', newId);
      loadArchives();
    } catch (e) {}
  };

  const endSession = async () => {
    if (!window.confirm("Are you sure you want to end this Live Session? The timer will be locked.")) return;
    try {
      await api.post(`/live-session/${sessionId}/end`);
      const sData = await getLiveSession(sessionId);
      setSession(sData.session || sData);
      loadArchives();
    } catch (e) {}
  };

  const adjustPlayer = async (charId, deltas) => {
    if (session?.status === 'ended') return alert("This session has ended.");
    setPlayers(prev => prev.map(p => {
      if (p.character_id !== charId && p.id !== charId) return p;
      const next = { ...p };
      if (deltas.hungerDelta) next.hunger = Math.max(0, Math.min(5, (next.hunger || 0) + deltas.hungerDelta));
      if (deltas.humanityDelta) next.humanity = Math.max(0, Math.min(10, (next.humanity || 7) + deltas.humanityDelta));
      if (deltas.frenzyState !== undefined) next.frenzyState = deltas.frenzyState;
      return next;
    }));

    await api.patch(`/live-session/${sessionId}/players/${charId}`, deltas).catch(()=>{});
    
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

  return (
    <div className={styles.page}>
      <div className={styles.adminPanel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className={styles.title}>Storyteller Live Table</h1>
          {session && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '12px' }}>
               <div style={{ fontWeight: 'bold', letterSpacing: '0.1em', color: session.status === 'active' ? '#10b981' : '#e11d48' }}>
                 {session.status === 'active' ? '⏱️ ACTIVE' : '🛑 ENDED'}
               </div>
               <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 800 }}>
                 {formatTime(liveDuration)}
               </div>
               {session.status === 'active' && (
                 <button className={styles.btnPrimary} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={endSession}>End Session</button>
               )}
            </div>
          )}
        </div>
        
        <div className={styles.adminControls}>
          <input className={styles.input} style={{flex: 1}} value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="Chronicle Name" />
          <button className={styles.btnPrimary} style={{flex: 0.5}} onClick={startSession}>Initialize Table</button>
          <input className={styles.input} style={{flex: 1}} value={sessionId} onChange={e => { setSessionId(e.target.value); localStorage.setItem('adminLiveSessionId', e.target.value); }} placeholder="Existing Code (e.g. 09062601)" />
        </div>

        <div className={styles.adminControls} style={{ background: 'rgba(225, 29, 72, 0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(225, 29, 72, 0.3)' }}>
          <input className={styles.input} style={{flex: 2}} value={broadcast} onChange={e => setBroadcast(e.target.value)} placeholder="Send a global ST broadcast to all players..." disabled={session?.status === 'ended'} />
          <button className={styles.btnPrimary} style={{flex: 0.5}} onClick={handleBroadcast} disabled={session?.status === 'ended'}>Broadcast</button>
          <button className={styles.btnGhost} style={{flex: 0.5, borderColor: '#f97316', color: '#f97316'}} onClick={() => Promise.all(players.map(p => adjustPlayer(p.character_id || p.id, { hungerDelta: 1 })))} disabled={session?.status === 'ended'}>+1 Ambient Hunger to All</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr', gap: '1.5rem', marginTop: '1.5rem' }}>
          
          <section>
            <h2 style={{borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', fontSize: '1.2rem', marginBottom: '1rem'}}>Active Characters ({players.length})</h2>
            <div className={styles.adminPlayerGrid}>
              {players.map(p => {
                const charId = p.character_id || p.id;
                let sheet = {};
                try {
                  sheet = typeof p.sheet === 'string' ? JSON.parse(p.sheet) : (p.sheet || {});
                } catch(e) {}

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
                  <div key={charId} className={styles.adminPlayerCard} style={{ borderColor: activeFrenzy ? activeFrenzy.color : 'rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <b style={{fontSize: '1.1rem', color: '#fff'}}>{name}</b>
                        <div className={styles.subtle} style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{clan}</div>
                      </div>
                      
                      <select 
                        className={styles.input} 
                        style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderColor: activeFrenzy ? activeFrenzy.color : 'inherit', color: activeFrenzy ? activeFrenzy.color : 'inherit' }}
                        value={frenzyState || ''}
                        onChange={(e) => adjustPlayer(charId, { frenzyState: e.target.value || null })}
                      >
                        <option value="">✓ Calm</option>
                        {FRENZY_TYPES.map(f => <option key={f.key} value={f.key}>{f.icon} {f.label}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '4px' }}>
                          <span>Hunger</span><span>{hunger} / 5</span>
                        </div>
                        <div className={styles.hungerDots} style={{ padding: '2px 0', gap: 4 }}>
                          {Array.from({ length: 5 }).map((_, i) => <span key={i} className={i < hunger ? styles.hungerOn : styles.hungerOff} style={{ width: 12, height: 12 }} />)}
                        </div>
                        <div className={styles.miniBtnRow} style={{ gridTemplateColumns: '1fr 1fr 2fr', marginTop: '0.5rem' }}>
                          <button onClick={() => adjustPlayer(charId, { hungerDelta: -1 })}>-1</button>
                          <button onClick={() => adjustPlayer(charId, { hungerDelta: 1 })}>+1</button>
                          <button onClick={() => adjustPlayer(charId, { forceRouseCheck: true })} style={{background: 'rgba(225,29,72,0.15)', color: '#fca5a5', borderColor: 'rgba(225,29,72,0.3)'}}>Rouse</button>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '4px' }}>
                          <span>Humanity</span><span>{humanity} / 10</span>
                        </div>
                        <div style={{ display: 'flex', gap: 2, padding: '2px 0', height: '16px' }}>
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} style={{ flex: 1, borderRadius: 2, background: i < humanity ? '#22c55e' : 'rgba(255,255,255,0.1)' }} />
                          ))}
                        </div>
                        <div className={styles.miniBtnRow} style={{ gridTemplateColumns: '1fr 1fr', marginTop: '0.5rem' }}>
                          <button onClick={() => adjustPlayer(charId, { humanityDelta: -1 })}>-1 Stains</button>
                          <button onClick={() => adjustPlayer(charId, { humanityDelta: 1 })}>+1 Mend</button>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 style={{borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', fontSize: '1.2rem', marginBottom: '1rem'}}>Live Roll Feed</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {rolls.slice(0, 30).map((r, i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.4)', padding: '0.8rem', borderRadius: '8px', borderLeft: r.has_bestial_failure || r.has_messy_critical ? '4px solid #e11d48' : '4px solid #3f3f4e' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span style={{ fontSize: '0.9rem', color: '#fff' }}>{r.player_name || r.character_name}</span>
                    <span style={{color: '#fbbf24', fontSize: '0.9rem'}}>{r.successes} Succ</span>
                  </div>
                  <div className={styles.subtle} style={{ fontSize: '0.8rem', marginTop: '2px' }}>{r.roll_type} {r.note ? `— ${r.note}` : ''}</div>
                  
                  {r.results && (r.results.normal || r.results.hunger || r.results.rouse) && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {(r.results.normal || []).map((die, idx) => (
                        <div key={`n-${idx}`} style={{ width: 18, height: 18, borderRadius: 4, background: die >= 6 ? '#e4e4e7' : 'rgba(255,255,255,0.1)', color: die >= 6 ? '#000' : '#a1a1aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>{die}</div>
                      ))}
                      {(r.results.hunger || r.results.rouse || []).map((die, idx) => (
                        <div key={`h-${idx}`} style={{ width: 18, height: 18, borderRadius: 4, background: die >= 6 ? '#e11d48' : 'transparent', border: '1px solid #e11d48', color: die >= 6 ? '#fff' : '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>{die}</div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: '0.75rem', color: '#a89a9c', marginTop: '6px', display: 'flex', gap: '8px' }}>
                    <span>Pool: {r.pool}</span>
                    <span>Hunger: {r.hunger}</span>
                    {r.has_bestial_failure && <span style={{color: '#e11d48', fontWeight: 700}}>⚠️ Bestial</span>}
                    {r.has_messy_critical && <span style={{color: '#e11d48', fontWeight: 700}}>🩸 Messy Crit</span>}
                  </div>
                </div>
              ))}
              {rolls.length === 0 && <div className={styles.subtle} style={{textAlign: 'center', padding: '2rem'}}>No rolls yet.</div>}
            </div>
          </section>

        </div>

        <section style={{ marginTop: '3rem' }}>
          <h2 style={{borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', fontSize: '1.2rem', marginBottom: '1rem'}}>Chronicle Archives</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '0.75rem' }}>Code</th>
                  <th style={{ padding: '0.75rem' }}>Session Name</th>
                  <th style={{ padding: '0.75rem' }}>Storyteller</th>
                  <th style={{ padding: '0.75rem' }}>Date</th>
                  <th style={{ padding: '0.75rem' }}>Duration</th>
                  <th style={{ padding: '0.75rem' }}>Players</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {archives.map(arch => (
                  <tr key={arch.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold', color: '#fbbf24' }}>{arch.session_code || arch.id}</td>
                    <td style={{ padding: '0.75rem' }}>{arch.name}</td>
                    <td style={{ padding: '0.75rem' }}>{arch.st_name || 'Admin'}</td>
                    <td style={{ padding: '0.75rem', color: '#a1a1aa' }}>{new Date(arch.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{formatTime(arch.duration_seconds)}</td>
                    <td style={{ padding: '0.75rem' }}>{arch.player_count}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', background: arch.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', color: arch.status === 'active' ? '#10b981' : '#a1a1aa' }}>
                        {arch.status === 'active' ? 'Active' : 'Ended'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button className={styles.btnGhost} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => { setSessionId(arch.session_code || arch.id); localStorage.setItem('adminLiveSessionId', arch.session_code || arch.id); }}>
                        Load Table
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {archives.length === 0 && <div className={styles.subtle} style={{ padding: '2rem', textAlign: 'center' }}>No historical sessions found.</div>}
          </div>
        </section>

      </div>
    </div>
  );
}