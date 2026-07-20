import React, { useState } from 'react';
import MiniSearch from 'minisearch';
import Avatar from '../../components/Avatar';
import LiveSessionRollHistory from './LiveSessionRollHistory';
import { sendLiveSessionBroadcast, logLiveSessionRoll } from '../../api/liveSession';
import api from '../../core/api';
import { DISCIPLINES } from '../../data/disciplines';
import { rollPool } from '../../utils/liveSessionMechanics';
import sharedStyles from '../../styles/LiveSession.module.css';
import adminStyles from '../../styles/LiveSessionAdmin.module.css';

const styles = { ...sharedStyles, ...adminStyles };

const REFERENCE_RULES = [
  { category: 'rules', title: 'Difficulty & Success', content: '1-5: Failure. 6-9: Success. 10: Critical. Pair of 10s: 4 successes total.\nDiff 1: Routine\nDiff 3: Moderate (most actions)\nDiff 5: Hard\nDiff 7+: Nearly impossible' },
  { category: 'rules', title: 'Hunger Mechanics', content: 'Messy Critical: A 10 on a Hunger die with an overall critical. You succeed but the Beast takes over.\nBestial Failure: A 1 on a Hunger die with an overall failure. The Beast lashes out.' },
  { category: 'rules', title: 'Blood Surge', content: 'Adds dice to a single roll based on Blood Potency. Requires a Rouse check.' },
  { category: 'rules', title: 'Humanity & Stains', content: 'Stains are gained by violating Chronicle Tenets or your Predator Type.\nAt the end of the session, roll Remorse: Roll dice equal to (10 - Humanity - Stains). If you get at least 1 success, you feel remorse and clear all Stains. If you fail, you lose 1 Humanity point and clear Stains.' },
  { category: 'rules', title: 'Frenzy', content: 'Triggered by anger (Fury), hunger (Hunger), or fear (Terror).\nRoll Willpower to resist (Resolve + Composure). Difficulty varies by provocation (usually 2-4).\nFailure means the Beast takes over. You can spend Willpower to take a single action of your choice during a Frenzy.' }
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
  searchOptions: { fuzzy: 0.4, prefix: true }
});
miniSearch.addAll(allReferenceData.map((item, index) => ({ id: index, ...item })));

const FRENZY_TYPES = [
  { key: 'fury', label: 'Fury Frenzy', color: '#dc2626', icon: '🔥' },
  { key: 'hunger', label: 'Hunger Frenzy', color: '#f97316', icon: '🩸' },
  { key: 'terror', label: 'Terror Frenzy', color: '#7c3aed', icon: '💀' },
];

const ADMIN_TOOLS_INDEX = [
  { id: 'vibe', title: 'Scene & Vibe', content: 'ambient calm frenzy danger supernatural spooky metadata' },
  { id: 'clocks', title: 'Session Clocks', content: 'timers time rounds countdown' },
  { id: 'initiative', title: 'Initiative Tracker', content: 'combat order turn' },
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

export default function LiveSessionAdminDashboard({ session, sessionId, broadcasts, character }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  
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
  const [broadcastInput, setBroadcastInput] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState(''); // '' means global

  const [sceneInput, setSceneInput] = useState(session?.metadata?.scene || '');
  const [timerName, setTimerName] = useState('');
  const [timerRounds, setTimerRounds] = useState(3);
  
  const [initName, setInitName] = useState('');
  const [initInit, setInitInit] = useState(0);

  const updateMetadata = async (newMetaProps) => {
    if (session?.status === 'ended') return;
    const updated = { ...(session?.metadata || {}), ...newMetaProps };
    await api.patch(`/live-session/${sessionId}/metadata`, { metadata: updated }).catch(e => console.error(e));
  };

  const addNPC = () => {
    if (!newNpcName.trim()) return;
    setTempNPCs(prev => [...prev, { id: `npc-${Date.now()}`, name: newNpcName, defaultPool: parseInt(newNpcPool) || 1 }]);
    setNewNpcName('');
  };
  const executeAdminRoll = async () => {
    if (!sessionId) return;
    const normal = parseInt(rollerNormal) || 0;
    const hunger = parseInt(rollerHunger) || 0;
    const diff = parseInt(rollerDiff) || 0;
    
    const results = rollPool(normal, hunger);
    const totalSuccesses = results.outcome.successes;
    
    await logLiveSessionRoll(sessionId, {
      session_id: sessionId,
      character_id: null,
      character_name: rollerEntity,
      roll_type: 'admin_roll',
      pool: normal + hunger,
      hunger: hunger,
      difficulty: diff,
      results: { normal: results.normalDice, hunger: results.hungerDice },
      successes: totalSuccesses,
      has_critical: results.outcome.hasCritical,
      has_messy_critical: results.outcome.hasMessyCritical,
      has_bestial_failure: results.outcome.hasBestialFailure,
      note: rollerNote
    });
  };

  const visibleTools = React.useMemo(() => {
    if (!toolSearchQuery.trim()) return ADMIN_TOOLS_INDEX.map(t => t.id);
    return toolsMiniSearch.search(toolSearchQuery.trim()).map(res => res.id);
  }, [toolSearchQuery]);

  const handleBroadcast = async () => {
    if (!broadcastInput.trim() || session?.status === 'ended') return;
    await api.post(`/live-session/${sessionId}/broadcast`, { 
      message: broadcastInput.trim(),
      target_character_id: broadcastTarget || null
    }).catch(e => console.error(e));
    setBroadcastInput('');
  };

  const adjustPlayer = async (charId, deltas) => {
    if (session?.status === 'ended') return alert("This session has ended.");
    await api.patch(`/live-session/${sessionId}/players/${charId}`, deltas).catch(e => console.error(e));
    
    if (deltas.frenzyState) {
      const p = session?.players?.find(x => x.character_id === charId || x.id === charId);
      const f = FRENZY_TYPES.find(x => x.key === deltas.frenzyState);
      if (p && f) {
        await api.post(`/live-session/${sessionId}/broadcast`, { message: `⚠️ ${p.name || p.character_name || 'A character'} has entered a ${f.label}!` });
      }
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      
      {/* LEFT PANE: WIKI */}
      <div className={styles.pane}>
        <div className={styles.paneHeader}>
          <h2>Quick Reference</h2>
        </div>
        
        <div className={styles.paneContent} style={{ display: 'flex', flexDirection: 'column', padding: '1rem', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1rem' }}>🔍</span>
            <input 
              type="text" 
              placeholder="Search Rules, Disciplines, Merits..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={styles.formInput}
              style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.75rem' }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-container-highest)', borderRadius: '8px', padding: '1rem' }}>
            {(() => {
              const query = searchQuery.trim();
              let matches = [];
              if (query) {
                matches = miniSearch.search(query);
              } else {
                matches = allReferenceData.slice(0, 20); // show some default
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
      </div>

      {/* CENTER PANE: OVERVIEW & FEED */}
      <div className={styles.pane} style={{ flex: 1, borderRight: '1px solid var(--outline-variant)' }}>
        <div className={styles.centerColumn}>
          
          {/* Top: Players */}
          <div className={styles.centerTop}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--primary)' }}>Live Player Overview</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select className={styles.formInput} value={broadcastTarget} onChange={e => setBroadcastTarget(e.target.value)} disabled={session?.status === 'ended'}>
                  <option value="">🗣️ All Players</option>
                  {session?.players?.map(p => <option key={p.id} value={p.character_id || p.id}>🤫 Whisper: {p.name || p.character_name}</option>)}
                </select>
                <input className={styles.formInput} style={{ width: '200px' }} value={broadcastInput} onChange={e => setBroadcastInput(e.target.value)} placeholder="Broadcast or Whisper..." disabled={session?.status === 'ended'} />
                <button className={styles.btnPrimary} style={{ width: 'auto' }} onClick={handleBroadcast} disabled={session?.status === 'ended'}>Send</button>
              </div>
            </div>
            
            <div className={styles.playerGrid}>
              {session?.players?.map(p => {
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
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Avatar userId={p.user_id} size={32} />
                          <div>
                            <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                            <div className={styles.playerClan}>{clan}</div>
                          </div>
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
                        label="Health" max={healthMax} sup={healthSup} agg={healthAgg}
                        onAdjust={(type, delta) => adjustPlayer(charId, type === 'sup' ? { healthSupDelta: delta } : { healthAggDelta: delta })}
                      />
                      <AdminStatusBar
                        label="Willpower" max={wpMax} sup={wpSup} agg={wpAgg}
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
              {(!session?.players || session.players.length === 0) && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No players connected to this session.</div>
              )}
            </div>
          </div>
          
          {/* Bottom: Feed */}
          <div className={styles.centerBottom}>
            <div className={styles.paneHeader} style={{ borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }}>
              <h2>Live Activity Feed</h2>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
               <LiveSessionRollHistory rolls={broadcasts} onBroadcast={async (msg) => { await sendLiveSessionBroadcast(sessionId, { message: msg }); }} isAdmin={true} currentCharacterId={character?.id} />
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT PANE: ADMIN TOOLS */}
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
          
          {/* Vibe / Ambient Controls */}
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

          {/* Clocks / Timers */}
          {visibleTools.includes('clocks') && (
          <div style={{ paddingTop: visibleTools[0] !== 'clocks' ? '1rem' : '0', borderTop: visibleTools[0] !== 'clocks' ? '1px solid var(--outline-variant)' : 'none' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '0.75rem' }}>Session Clocks</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input type="text" className={styles.formInput} style={{ flex: 1 }} placeholder="Clock Name" value={timerName} onChange={e => setTimerName(e.target.value)} />
              <input type="number" className={styles.formInput} style={{ width: '60px' }} value={timerRounds} onChange={e => setTimerRounds(parseInt(e.target.value))} />
              <button className={styles.btnSecondary} onClick={() => {
                if(!timerName) return;
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

          {/* Initiative Tracker */}
          {visibleTools.includes('initiative') && (
          <div style={{ paddingTop: visibleTools[0] !== 'initiative' ? '1rem' : '0', borderTop: visibleTools[0] !== 'initiative' ? '1px solid var(--outline-variant)' : 'none' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '0.75rem' }}>Initiative Tracker</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input type="text" className={styles.formInput} style={{ flex: 1 }} placeholder="Name" value={initName} onChange={e => setInitName(e.target.value)} />
              <input type="number" className={styles.formInput} style={{ width: '60px' }} placeholder="Init" value={initInit} onChange={e => setInitInit(parseInt(e.target.value))} />
              <button className={styles.btnSecondary} onClick={() => {
                if(!initName) return;
                const initList = [...(session?.metadata?.initiative || []), { id: Date.now(), name: initName, value: initInit || 0 }];
                initList.sort((a,b) => b.value - a.value);
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

          {/* NPC Generator */}
          {visibleTools.includes('npc') && (
          <div style={{ paddingTop: visibleTools[0] !== 'npc' ? '1rem' : '0', borderTop: visibleTools[0] !== 'npc' ? '1px solid var(--outline-variant)' : 'none' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '0.75rem' }}>Rapid NPC / Monsters</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input type="text" className={styles.formInput} style={{ flex: 1 }} placeholder="Name (e.g. Guard)" value={newNpcName} onChange={e => setNewNpcName(e.target.value)} />
              <input type="number" className={styles.formInput} style={{ width: '60px' }} placeholder="Pool" value={newNpcPool} onChange={e => setNewNpcPool(e.target.value)} />
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
