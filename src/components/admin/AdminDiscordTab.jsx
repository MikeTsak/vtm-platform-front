// src/components/admin/AdminDiscordTab.jsx
import React, { useState, useEffect } from 'react';
import api from '../../api';
import styles from '../../styles/Admin.module.css';
import Loading from '../Loading';

export default function AdminDiscordTab({ users = [] }) {
  const [config, setConfig] = useState({
    discord_channel_id: '',
    discord_schedule_time: '12:00',
    discord_enabled: true,
    notify_mail: true,
    notify_news: true,
    notify_prems: true,
    bot_status: 'Checking...',
    bot_name: ''
  });
  
  // Custom DM State
  const [dmUserId, setDmUserId] = useState('');
  const [dmMessage, setDmMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/discord/config');
      setConfig(prev => ({ ...prev, ...data }));
    } catch (e) {
      setErr('Failed to load Discord settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true); setMsg(''); setErr('');
    try {
      await api.post('/admin/discord/config', {
        discord_channel_id: config.discord_channel_id,
        discord_schedule_time: config.discord_schedule_time,
        discord_enabled: config.discord_enabled,
        notify_mail: config.notify_mail,
        notify_news: config.notify_news,
        notify_prems: config.notify_prems
      });
      setMsg('Settings saved successfully.');
      loadConfig();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (type) => {
    setLoading(true); setMsg(''); setErr('');
    try {
      const { data } = await api.post(`/admin/discord/test/${type}`);
      setMsg(`Test Success: ${data.message}`);
    } catch (e) {
      setErr(e.response?.data?.error || `Failed to trigger ${type} test.`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    if (!window.confirm('This will disconnect and reconnect the bot. Continue?')) return;
    setLoading(true); setMsg(''); setErr('');
    try {
      const { data } = await api.post('/admin/discord/restart');
      setMsg(data.message);
      loadConfig();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to restart bot.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendDM = async () => {
    if (!dmUserId || !dmMessage) return alert("Select a user and type a message first.");
    setLoading(true); setMsg(''); setErr('');
    try {
      const { data } = await api.post('/admin/discord/dm', {
        user_id: Number(dmUserId),
        message: dmMessage
      });
      setMsg(data.message);
      setDmMessage(''); // Clear the box on success
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to send DM.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.editorSection} style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className={styles.sectionHeader}>
        <h4>Discord Integration</h4>
        <span className={styles.subtle}>
          Connection: 
          <b style={{color: config.bot_status === 'Online' ? '#00C851' : '#FF4444', marginLeft: '6px', marginRight: '10px'}}>
            {config.bot_status}
          </b> 
          {config.bot_name && `(${config.bot_name})`}
        </span>
      </div>

      {msg && <div className={`${styles.alert} ${styles.alertInfo}`}>{msg}</div>}
      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

      {/* --- MASTER SWITCH --- */}
      <div style={{ background: '#1f1f24', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: config.discord_enabled ? '4px solid #00C851' : '4px solid #FF4444' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold' }}>
          <input 
            type="checkbox" 
            checked={config.discord_enabled} 
            onChange={e => setConfig({...config, discord_enabled: e.target.checked})}
            style={{ marginRight: '10px', transform: 'scale(1.2)' }}
          />
          Master Switch: Bot is {config.discord_enabled ? 'Active' : 'Disabled (Ignoring commands & broadcasts)'}
        </label>
      </div>

      {/* --- SETTINGS GRID --- */}
      <div className={styles.formGrid}>
        <div className={styles.labeledInput}>
          <span>Discord Channel ID (For Mail & News)</span>
          <input
            className={styles.input}
            value={config.discord_channel_id}
            onChange={e => setConfig({ ...config, discord_channel_id: e.target.value })}
            placeholder="e.g. 593054858135863315"
          />
        </div>

        <div className={styles.labeledInput}>
          <span>Daily Mail Notification Time</span>
          <input
            type="time"
            className={styles.input}
            value={config.discord_schedule_time}
            onChange={e => setConfig({ ...config, discord_schedule_time: e.target.value })}
          />
        </div>
      </div>

      {/* --- TOGGLES --- */}
      <div style={{ marginTop: '20px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: '#1a1a1f', padding: '10px', borderRadius: '6px' }}>
          <input type="checkbox" checked={config.notify_mail} onChange={e => setConfig({...config, notify_mail: e.target.checked})} style={{ marginRight: '8px' }} />
          Daily Mail Digests
        </label>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: '#1a1a1f', padding: '10px', borderRadius: '6px' }}>
          <input type="checkbox" checked={config.notify_news} onChange={e => setConfig({...config, notify_news: e.target.checked})} style={{ marginRight: '8px' }} />
          Live News Broadcasts
        </label>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: '#1a1a1f', padding: '10px', borderRadius: '6px' }}>
          <input type="checkbox" checked={config.notify_prems} onChange={e => setConfig({...config, notify_prems: e.target.checked})} style={{ marginRight: '8px' }} />
          Malkavian Premonition DMs
        </label>
      </div>

      <div className={styles.cardFooter} style={{marginTop: '10px', background: 'transparent', padding: 0}}>
        <button className={styles.btnPrimary} onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <hr style={{ borderColor: '#333', margin: '30px 0' }} />

      {/* --- NEW: CUSTOM DM TOOL --- */}
      <div className={styles.sectionHeader}>
        <h4>Direct Message a Player</h4>
      </div>
      <div style={{ background: '#1a1a1f', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <select 
            className={styles.input} 
            value={dmUserId} 
            onChange={e => setDmUserId(e.target.value)}
          >
            <option value="">-- Select a Player --</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.display_name} {u.char_name ? `(${u.char_name})` : ''} {u.discord_id ? '🟢' : '🔴'}
              </option>
            ))}
          </select>
          <small style={{ color: '#888', display: 'block', marginTop: '5px' }}>
            🟢 = Discord Linked | 🔴 = No Discord Linked
          </small>
        </div>
        <textarea
          className={styles.input}
          style={{ height: '80px', resize: 'vertical' }}
          placeholder="Type your message here. The bot will DM them instantly..."
          value={dmMessage}
          onChange={e => setDmMessage(e.target.value)}
        />
        <button 
          className={styles.btnPrimary} 
          style={{ marginTop: '10px', width: '100%' }}
          onClick={handleSendDM} 
          disabled={loading || !dmUserId || !dmMessage}
        >
          {loading ? 'Sending...' : 'Send Direct Message via Discord'}
        </button>
      </div>

      <hr style={{ borderColor: '#333', margin: '30px 0' }} />

      {/* --- TESTING & CONTROLS --- */}
      <div className={styles.sectionHeader}>
        <h4>System Controls & Testing</h4>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button className={styles.btnGhost} onClick={() => handleTest('mail')} disabled={loading || !config.discord_channel_id}>
          Test Mail Digest
        </button>
        <button className={styles.btnGhost} onClick={() => handleTest('news')} disabled={loading || !config.discord_channel_id}>
          Test News Broadcast
        </button>
        <button className={styles.btnGhost} onClick={() => handleTest('premonition')} disabled={loading}>
          Test Premonition DM
        </button>
        <button className={styles.btn} style={{ background: '#4a1515', color: 'white', marginLeft: 'auto' }} onClick={handleRestart} disabled={loading}>
          Hard Restart Bot
        </button>
      </div>

      <br /><br />
      <div style={{display: 'flex', justifyContent: 'center', opacity: 0.5}}>
        <Loading />
      </div>
    </div>
  );
}