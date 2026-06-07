// src/pages/admin/LiveSessionDashboard.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { getLiveSession, getLiveSessionPlayers, getLiveSessionRolls, createLiveSession, updateLiveSessionPlayer, sendLiveSessionBroadcast } from '../../api/liveSession';
import styles from '../../styles/LiveSession.module.css';

export default function LiveSessionDashboard() {
  const [sessionId, setSessionId] = useState(localStorage.getItem('adminLiveSessionId') || '');
  const [sessionName, setSessionName] = useState('VTM Live Scene');
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState([]);
  const [rolls, setRolls] = useState([]);
  const [broadcast, setBroadcast] = useState('');

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
    const int = setInterval(load, 3000); // Fast 3-second polling for live table feel
    return () => clearInterval(int);
  }, [sessionId]);

  const startSession = async () => {
    try {
      const data = await createLiveSession({ name: sessionName });
      const newId = String(data?.session?.id || data?.id);
      setSessionId(newId);
      localStorage.setItem('adminLiveSessionId', newId);
    } catch (e) {}
  };

  const adjustPlayer = async (charId, deltas) => {
    await updateLiveSessionPlayer(sessionId, charId, deltas);
    const pData = await getLiveSessionPlayers(sessionId);
    setPlayers(pData.players || pData || []);
  };

  const handleBroadcast = async () => {
    if (!broadcast.trim()) return;
    await sendLiveSessionBroadcast(sessionId, { message: broadcast.trim() });
    setBroadcast('');
  };

  return (
    <div className={styles.page}>
      <div className={styles.adminPanel}>
        <h1 className={styles.title}>Storyteller Live Table</h1>
        
        <div className={styles.adminControls}>
          <input className={styles.input} style={{flex: 1}} value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="Chronicle Name" />
          <button className={styles.btnPrimary} style={{flex: 0.5}} onClick={startSession}>Initialize Table</button>
          <input className={styles.input} style={{flex: 1}} value={sessionId} onChange={e => { setSessionId(e.target.value); localStorage.setItem('adminLiveSessionId', e.target.value); }} placeholder="Existing Session ID" />
        </div>

        <div className={styles.adminControls} style={{ background: 'rgba(225, 29, 72, 0.1)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(225, 29, 72, 0.3)' }}>
          <input className={styles.input} style={{flex: 2}} value={broadcast} onChange={e => setBroadcast(e.target.value)} placeholder="Send a global ST broadcast to all players..." />
          <button className={styles.btnPrimary} style={{flex: 0.5}} onClick={handleBroadcast}>Broadcast</button>
          <button className={styles.btnGhost} style={{flex: 0.5}} onClick={() => Promise.all(players.map(p => adjustPlayer(p.character_id, { hungerDelta: 1 })))}>+1 Ambient Hunger to All</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          
          {/* Virtual Table Top Player Grid */}
          <section>
            <h2 style={{borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem'}}>Active Characters ({players.length})</h2>
            <div className={styles.adminPlayerGrid}>
              {players.map(p => (
                <div key={p.character_id || p.id} className={styles.adminPlayerCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <b style={{fontSize: '1.2rem'}}>{p.name || p.character_name}</b>
                    <span className={styles.subtle}>{p.clan}</span>
                  </div>
                  
                  {/* Player Quick Adjusters */}
                  <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span>Hunger: {p.hunger ?? 0}</span>
                      <div className={styles.miniBtnRow}>
                        <button onClick={() => adjustPlayer(p.character_id, { hungerDelta: -1 })}>-</button>
                        <button onClick={() => adjustPlayer(p.character_id, { hungerDelta: 1 })}>+</button>
                        <button onClick={() => adjustPlayer(p.character_id, { forceRouseCheck: true })} style={{background: '#9f1239'}}>Rouse</button>
                      </div>
                    </div>
                    
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem'}}>
                      <span>HP: {(p.health_max || 5) - ((p.health?.superficial || 0) + (p.health?.aggravated || 0))}</span>
                      <div className={styles.miniBtnRow}>
                        <button onClick={() => adjustPlayer(p.character_id, { healthDelta: -1 })}>- DMG</button>
                        <button onClick={() => adjustPlayer(p.character_id, { healthDelta: 1 })}>+ DMG</button>
                      </div>
                    </div>

                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem'}}>
                      <span>WP: {(p.willpower_max || 5) - ((p.willpower?.superficial || 0) + (p.willpower?.aggravated || 0))}</span>
                      <div className={styles.miniBtnRow}>
                        <button onClick={() => adjustPlayer(p.character_id, { wpDelta: -1 })}>- DMG</button>
                        <button onClick={() => adjustPlayer(p.character_id, { wpDelta: 1 })}>+ DMG</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Roll Feed */}
          <section>
            <h2 style={{borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem'}}>Roll Feed</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {rolls.slice(0, 15).map((r, i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.4)', padding: '0.8rem', borderRadius: '12px', borderLeft: r.has_bestial_failure || r.has_messy_critical ? '4px solid #e11d48' : '4px solid #3f3f4e' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>{r.player_name || r.character_name}</span>
                    <span style={{color: '#fbbf24'}}>{r.successes} Succ</span>
                  </div>
                  <div className={styles.subtle} style={{ fontSize: '0.85rem' }}>{r.roll_type} - {r.note}</div>
                  <div style={{ fontSize: '0.8rem', color: '#a89a9c', marginTop: '0.3rem' }}>
                    Pool: {r.pool} | Hunger: {r.hunger}
                    {r.has_bestial_failure && <span style={{color: '#e11d48', marginLeft: '5px'}}>⚠️ Bestial</span>}
                    {r.has_messy_critical && <span style={{color: '#e11d48', marginLeft: '5px'}}>🩸 Messy Crit</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}