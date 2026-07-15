// src/components/admin/AdminMasterTab.jsx
import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import { Skeleton } from 'boneyard-js/react';
import { Link } from 'react-router-dom';
export default function AdminMasterTab() {
  const [commsEnabled, setCommsEnabled] = useState(true);
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerCountdown, setBannerCountdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [ntfyTopic, setNtfyTopic] = useState('');
  const [availableNpcs, setAvailableNpcs] = useState([]);
  const [subscribedNpcs, setSubscribedNpcs] = useState([]);

  // Danger Zone state
  const [dangerOpen, setDangerOpen] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);
  const [dangerPin, setDangerPin] = useState('');

  // Migration Runner state
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState([]);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationTotal, setMigrationTotal] = useState(1);
  const [migrationDone, setMigrationDone] = useState(false);

  const runMigrations = () => {
    if(!window.confirm("Are you sure you want to run all system migrations?")) return;
    setMigrationRunning(true);
    setMigrationLogs([]);
    setMigrationProgress(0);
    setMigrationDone(false);

    const baseUrl = api.defaults.baseURL || import.meta.env.VITE_API_URL || '';
    const token = localStorage.getItem('token');
    const es = new EventSource(`${baseUrl}/admin/run-migrations/stream?token=${token}`);

    es.addEventListener('start', (e) => {
      const data = JSON.parse(e.data);
      setMigrationTotal(data.total);
      setMigrationLogs(prev => [...prev, `[System] Found ${data.total} migration scripts.`]);
    });

    es.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data);
      setMigrationProgress(data.current);
    });

    es.addEventListener('log', (e) => {
      const data = JSON.parse(e.data);
      setMigrationLogs(prev => [...prev, data]);
    });

    es.addEventListener('done', (e) => {
      const data = JSON.parse(e.data);
      setMigrationLogs(prev => [...prev, `[System] ${data.message}`]);
      setMigrationDone(true);
      setMigrationRunning(false);
      es.close();
    });

    es.onerror = (err) => {
      setMigrationLogs(prev => [...prev, `[Error] Connection lost or failed to stream.`]);
      setMigrationRunning(false);
      es.close();
    };
  };

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const [commsRes, bannerRes, ntfyRes, npcsRes] = await Promise.all([
        api.get('/comms/status'), 
        api.get('/system/banner'),
        api.get('/admin/ntfy').catch(() => ({ data: { topic: '', subscribed_npcs: [] } })),
        api.get('/admin/npcs').catch(() => ({ data: { npcs: [] } }))
      ]);
      setCommsEnabled(commsRes.data.comms_enabled);
      setBannerEnabled(bannerRes.data.banner_enabled);
      setBannerMessage(bannerRes.data.banner_message || '');
      setBannerCountdown(bannerRes.data.banner_countdown || '');
      setNtfyTopic(ntfyRes.data.topic || '');
      setSubscribedNpcs(ntfyRes.data.subscribed_npcs || []);
      setAvailableNpcs(npcsRes.data.npcs || []);
    } catch (e) { setErr('Failed to load Master Settings'); } finally { setLoading(false); }
  };

  const toggleComms = async () => {
    if (actionLoading) return;
    const newVal = !commsEnabled;
    setActionLoading(true); setMsg(''); setErr('');
    try {
      await api.post('/admin/comms/status', { comms_enabled: newVal });
      setCommsEnabled(newVal);
      setMsg(`System updated: Comms are now ${newVal ? 'ONLINE' : 'OFFLINE'}.`);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setErr('Failed to update status.'); } finally { setActionLoading(false); }
  };

  const saveBanner = async () => {
    setActionLoading(true); setMsg(''); setErr('');
    try {
      await api.post('/admin/system/banner', { banner_enabled: bannerEnabled, banner_message: bannerMessage, banner_countdown: bannerCountdown || null });
      setMsg(`Global Banner configuration saved.`);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setErr('Failed to save banner config.'); } finally { setActionLoading(false); }
  };

  const generateNtfyKey = async () => {
    setActionLoading(true); setMsg(''); setErr('');
    try {
      const res = await api.post('/admin/ntfy/generate');
      setNtfyTopic(res.data.topic);
      setMsg(`New Ntfy key generated successfully.`);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setErr('Failed to generate Ntfy key.'); } finally { setActionLoading(false); }
  };

  const testNtfy = async () => {
    setActionLoading(true); setMsg(''); setErr('');
    try {
      await api.post('/admin/ntfy/test');
      setMsg(`Test notification sent! Check your device.`);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setErr('Failed to send test notification. Do you have a topic?'); } finally { setActionLoading(false); }
  };

  const saveNtfyPrefs = async () => {
    setActionLoading(true); setMsg(''); setErr('');
    try {
      await api.post('/admin/ntfy/prefs', { npc_ids: subscribedNpcs });
      setMsg('NPC notification preferences saved!');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setErr('Failed to save NPC preferences.'); } finally { setActionLoading(false); }
  };

  const toggleNpcSub = (npcId) => {
    setSubscribedNpcs(prev => 
      prev.includes(npcId) ? prev.filter(id => id !== npcId) : [...prev, npcId]
    );
  };

  const dangerWipeDowntimes = async () => {
    const input = window.prompt('This will permanently delete all RESOLVED downtimes older than 30 days.\n\nType DELETE to confirm:');
    if (input !== 'DELETE') return;
    setDangerLoading(true); setMsg(''); setErr('');
    try {
      const { data } = await api.delete('/admin/downtimes/resolved');
      setMsg(`✅ Wiped ${data.deleted || 0} resolved downtime(s) older than 30 days.`);
      setTimeout(() => setMsg(''), 5000);
    } catch (e) { setErr(e.response?.data?.error || 'Failed to wipe downtimes.'); }
    finally { setDangerLoading(false); }
  };

  const dangerClearDice = async () => {
    const input = window.prompt('This will permanently DELETE ALL dice roll history for all users.\n\nThis cannot be undone. Type DELETE to confirm:');
    if (input !== 'DELETE') return;
    setDangerLoading(true); setMsg(''); setErr('');
    try {
      const { data } = await api.delete('/admin/dice/rolls/all');
      setMsg(`✅ Cleared ${data.deleted || 0} dice roll record(s).`);
      setTimeout(() => setMsg(''), 5000);
    } catch (e) { setErr(e.response?.data?.error || 'Failed to clear dice logs.'); }
    finally { setDangerLoading(false); }
  };

  const isOnline = commsEnabled;
  const themeColor = isOnline ? 'var(--color-success)' : 'var(--color-error)';
  const bgColor = isOnline ? 'rgba(0, 230, 118, 0.05)' : 'rgba(255, 77, 77, 0.05)';
  const isBannerOnline = bannerEnabled;
  const bannerColor = isBannerOnline ? 'var(--accent-purple)' : 'var(--glass-border)';

  return (
    <Skeleton loading={loading && !msg && !err} name="admin-master-tab">
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {msg && <div className={`${styles.alert} ${styles.alertInfo}`}>{msg}</div>}
      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

      {/* COMMS KILLSWITCH */}
      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--glass-shadow)' }}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-color)' }}>⚙️ Network Infrastructure</h4>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>Global overrides for the SchreckNet communications grid.</p>
        </div>

        <div onClick={toggleComms} style={{ background: 'var(--glass-inset)', border: `2px solid ${themeColor}`, borderRadius: 'var(--radius-md)', padding: '1.5rem', cursor: actionLoading ? 'wait' : 'pointer', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: `0 0 20px ${isOnline ? 'rgba(0,230,118,0.1)' : 'rgba(255,77,77,0.1)'}`, opacity: actionLoading ? 0.7 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: themeColor, boxShadow: `0 0 15px ${themeColor}`, animation: isOnline ? 'pulseGlow 2s infinite' : 'none' }} />
              <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-color)' }}>SchreckNet Comms</h3>
            </div>
            <div style={{ position: 'relative', width: '60px', height: '32px', background: isOnline ? 'var(--color-success)' : 'var(--glass-border)', borderRadius: '32px', transition: 'background 0.3s ease' }}>
              <div style={{ position: 'absolute', top: '4px', left: isOnline ? '32px' : '4px', width: '24px', height: '24px', background: 'var(--text-color)', borderRadius: '50%', transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
            </div>
          </div>
          <div style={{ background: bgColor, borderRadius: '8px', padding: '15px', borderLeft: `4px solid ${themeColor}` }}>
            <h4 style={{ margin: '0 0 8px 0', color: themeColor, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{isOnline ? '🟢 System is Online' : '🛑 System is Offline (Read-Only)'}</h4>
            <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.5' }}>{isOnline ? "All players and administrators can freely send and receive messages, create groups, and upload media across the network." : "The killswitch is engaged. The interface is locked down. Players can log in and read their chat history, but all inputs are disabled."}</p>
          </div>
        </div>
      </div>

      {/* BANNER CONTROLS */}
      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--glass-shadow)' }}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-color)' }}>📢 Global Announcement Banner</h4>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>Displays a site-wide banner at the absolute top of the portal. Use this for critical event countdowns.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div onClick={() => setBannerEnabled(!bannerEnabled)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'var(--glass-inset)', padding: '1.2rem 1.5rem', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${bannerColor}`, border: '1px solid var(--glass-border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: isBannerOnline ? 'var(--accent-purple)' : 'var(--text-secondary)' }}>Enable Banner System</h3>
            <div style={{ position: 'relative', width: '60px', height: '32px', background: isBannerOnline ? 'var(--accent-purple)' : 'var(--glass-border)', borderRadius: '32px', transition: 'background 0.3s ease' }}>
              <div style={{ position: 'absolute', top: '4px', left: isBannerOnline ? '32px' : '4px', width: '24px', height: '24px', background: 'var(--text-color)', borderRadius: '50%', transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: isBannerOnline ? 1 : 0.5, pointerEvents: isBannerOnline ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
            <label className={styles.labeledInput}>
              <span>Banner Message (Supports HTML)</span>
              <input type="text" className={styles.input} placeholder="e.g. <b>Server Maintenance:</b> Reboot in 2 hours." value={bannerMessage} onChange={e => setBannerMessage(e.target.value)} />
            </label>
            <label className={styles.labeledInput}>
              <span>Attach a Countdown Timer (Optional)</span>
              <input type="datetime-local" className={styles.input} value={bannerCountdown} onChange={e => setBannerCountdown(e.target.value)} />
            </label>
          </div>

          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveBanner} disabled={actionLoading} style={{ padding: '1rem', fontSize: '1.05rem', marginTop: '1rem' }}>
            {actionLoading ? 'Saving...' : 'Save Banner Configuration'}
          </button>
        </div>
      </div>

      {/* NTFY PUSH NOTIFICATIONS */}
      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--glass-shadow)' }}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-color)' }}>📱 Admin Push Notifications (Ntfy)</h4>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>Receive critical system alerts and logs directly to your phone/desktop.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {ntfyTopic ? (
            <div style={{ background: 'rgba(0, 230, 118, 0.05)', borderLeft: '4px solid var(--color-success)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-success)', marginBottom: '10px' }}>✅ Your Push Topic is Active</div>
              <div style={{ color: 'var(--text-primary)', marginBottom: '10px', fontSize: '1.1rem' }}>
                Topic Key: <strong style={{ userSelect: 'all', background: '#000', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>{ntfyTopic}</strong>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                1. Download the <a href="https://ntfy.sh" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-purple)' }}>Ntfy app</a> (iOS/Android) or use the web app.<br/>
                2. Tap "+" to subscribe to a new topic.<br/>
                3. Enter your unique Topic Key above. You will now receive system crashes and logs.
              </p>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={testNtfy} disabled={actionLoading}>
                  🔔 Send Test Ping
                </button>
                <button className={`${styles.btn}`} onClick={generateNtfyKey} disabled={actionLoading} style={{ background: 'var(--glass-border)', color: 'var(--text-color)' }}>
                  🔄 Regenerate Key
                </button>
              </div>

              <div style={{ marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                <h5 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>NPC DM Subscriptions</h5>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select which NPCs you want to receive push notifications for when players message them.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '150px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px' }}>
                  {availableNpcs.map(npc => (
                    <label key={npc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-color)', fontSize: '0.9rem' }}>
                      <input 
                        type="checkbox" 
                        checked={subscribedNpcs.includes(npc.id)} 
                        onChange={() => toggleNpcSub(npc.id)} 
                        disabled={actionLoading}
                      />
                      {npc.name}
                    </label>
                  ))}
                  {availableNpcs.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>No NPCs found.</span>}
                </div>
                <button className={`${styles.btn}`} onClick={saveNtfyPrefs} disabled={actionLoading} style={{ marginTop: '10px', background: 'var(--accent-purple)', color: '#fff', border: 'none' }}>
                  💾 Save NPC Preferences
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--glass-inset)', borderLeft: '4px solid var(--accent-purple)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>No Ntfy Key Configured</h4>
              <p style={{ margin: '0 0 15px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Generate a unique key to start receiving backend server error logs and notifications on your mobile device.</p>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={generateNtfyKey} disabled={actionLoading}>
                ✨ Generate Push Key
              </button>
            </div>
          )}
        </div>
      </div>

      {/* UI / ASSET TESTING SECTION */}
      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--glass-shadow)' }}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-color)' }}>🎨 UI / Asset Testing</h4>
            <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>Test character builders and view visual assets.</p>
          </div>
          <Link to="/make?test=1" className={`${styles.btn} ${styles.btnPrimary}`} style={{ textDecoration: 'none' }}>
            Test Character Build
          </Link>
        </div>

        <h5 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1.2rem' }}>Clan Logos & Typography</h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {['Banu_Haqim', 'Brujah', 'Caitiff', 'Gangrel', 'Hecata', 'Lasombra', 'Malkavian', 'Ministry', 'Nosferatu', 'Ravnos', 'Salubri', 'Thinblood', 'Toreador', 'Tremere', 'Tzimisce', 'Ventrue'].map(clan => (
            <div key={clan} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', alignItems: 'center', background: 'var(--glass-inset)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>{clan} Symbol (Default)</div>
                <img src={`/img/clans/330px-${clan}_symbol.png`} alt={clan} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>{clan} Symbol (Inverted)</div>
                <img src={`/img/clans/330px-${clan}_symbol.png`} alt={clan} style={{ width: '80px', height: '80px', objectFit: 'contain', filter: 'invert(1)' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>{clan} Text (Default)</div>
                <img src={`/img/clans/text/300px-${clan}_logo.png`} alt={`${clan} Text`} style={{ width: '120px', height: '80px', objectFit: 'contain' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>{clan} Text (Inverted)</div>
                <img src={`/img/clans/text/300px-${clan}_logo.png`} alt={`${clan} Text`} style={{ width: '120px', height: '80px', objectFit: 'contain', filter: 'invert(1)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Tools */}
      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--glass-shadow)', marginBottom: '2rem' }}>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', color: 'var(--text-color)' }}>🛠️ System Tools</h4>
        
        <div style={{ background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Run Database Migrations</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Execute legacy background scripts (avatars, retainers, rumors) to update schema or data structures.</div>
            </div>
            <button
              onClick={runMigrations}
              disabled={migrationRunning}
              className={styles.btn}
              style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 700 }}
            >
              {migrationRunning ? 'Running...' : 'Run Migrations'}
            </button>
          </div>

          {(migrationRunning || migrationLogs.length > 0) && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                <span>Progress: {migrationProgress} / {migrationTotal}</span>
                <span>{Math.round((migrationProgress / migrationTotal) * 100)}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-lighter)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
                <div style={{ height: '100%', background: migrationDone ? 'var(--color-success)' : 'var(--color-primary)', width: `${(migrationProgress / migrationTotal) * 100}%`, transition: 'width 0.3s ease' }} />
              </div>
              
              <div style={{ 
                background: '#0d1117', 
                color: '#c9d1d9', 
                fontFamily: 'monospace', 
                fontSize: '0.85rem', 
                padding: '1rem', 
                borderRadius: '6px',
                height: '200px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                border: '1px solid #30363d'
              }}>
                {migrationLogs.map((log, i) => (
                  <div key={i} style={{ color: log.includes('[ERROR]') || log.includes('[FATAL]') ? '#ff7b72' : log.includes('---') ? '#79c0ff' : 'inherit' }}>
                    {log}
                  </div>
                ))}
                {migrationRunning && <div style={{ color: '#8b949e', marginTop: '10px' }}>&gt; waiting for output...<span style={{ animation: 'blink 1s step-end infinite' }}>_</span></div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DANGER ZONE */}
      <div style={{ background: 'rgba(255, 82, 82, 0.04)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '2px solid rgba(255,82,82,0.3)', padding: '2rem', boxShadow: '0 0 30px rgba(255,82,82,0.08)' }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingBottom: dangerOpen ? '1.5rem' : 0, borderBottom: dangerOpen ? '1px solid rgba(255,82,82,0.2)' : 'none', marginBottom: dangerOpen ? '1.5rem' : 0, transition: 'all 0.3s' }}
          onClick={() => setDangerOpen(o => !o)}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-error)' }}>⚠️ Danger Zone</h4>
            <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Destructive operations. Each action requires confirmation.</p>
          </div>
          <span style={{ color: 'var(--color-error)', fontSize: '1.4rem', transition: 'transform 0.3s', transform: dangerOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>

        {dangerOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--glass-inset)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,82,82,0.2)' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Enter PIN to unlock destructive actions:</span>
                <input 
                  type="password" 
                  className={styles.input} 
                  style={{ maxWidth: '200px' }}
                  value={dangerPin} 
                  onChange={e => setDangerPin(e.target.value)} 
                  placeholder="PIN" 
                />
              </label>
            </div>

            {/* Wipe Resolved Downtimes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-inset)', borderRadius: 'var(--radius-md)', padding: '1.2rem 1.5rem', border: '1px solid rgba(255,82,82,0.2)' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>🗑️ Wipe Resolved Downtimes</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Permanently deletes all downtimes with status "resolved" or "Resolved in scene" older than 30 days.</div>
              </div>
              <button
                type="button"
                className={styles.btn}
                style={{ background: 'rgba(255,82,82,0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: 700, minWidth: '140px', flexShrink: 0, opacity: dangerPin !== '2151' ? 0.5 : 1, cursor: dangerPin !== '2151' ? 'not-allowed' : 'pointer' }}
                onClick={dangerWipeDowntimes}
                disabled={dangerLoading || dangerPin !== '2151'}
              >
                {dangerLoading ? '…' : 'Wipe Records'}
              </button>
            </div>

            {/* Clear Dice Logs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-inset)', borderRadius: 'var(--radius-md)', padding: '1.2rem 1.5rem', border: '1px solid rgba(255,82,82,0.2)' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>🎲 Clear All Dice Logs</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Permanently deletes all dice roll records across all characters. Stats charts will be reset.</div>
              </div>
              <button
                type="button"
                className={styles.btn}
                style={{ background: 'rgba(255,82,82,0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: 700, minWidth: '140px', flexShrink: 0, opacity: dangerPin !== '2151' ? 0.5 : 1, cursor: dangerPin !== '2151' ? 'not-allowed' : 'pointer' }}
                onClick={dangerClearDice}
                disabled={dangerLoading || dangerPin !== '2151'}
              >
                {dangerLoading ? '…' : 'Clear Dice Logs'}
              </button>
            </div>
          </div>
        )}
      </div>

      </div>
    </Skeleton>
  );
}