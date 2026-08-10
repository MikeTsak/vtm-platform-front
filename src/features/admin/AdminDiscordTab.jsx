// src/components/admin/AdminDiscordTab.jsx
import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import { Skeleton } from 'boneyard-js/react';

export default function AdminDiscordTab({ users = [] }) {
  const [config, setConfig] = useState({
    discord_channel_id: '',
    discord_schedule_time: '12:00',
    discord_enabled: true,
    notify_mail: true,
    notify_news: true,
    notify_prems: true,
    ai_enabled: true,
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
        notify_prems: config.notify_prems,
        ai_enabled: config.ai_enabled
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
    <Skeleton loading={loading} name="admin-discord-tab">
      <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '50px' }}>
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
      <div style={{ background: 'var(--glass-bg)', padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '25px', border: '1px solid var(--glass-border)', borderLeft: config.discord_enabled ? '4px solid #00C851' : '4px solid #FF4444', boxShadow: 'var(--glass-shadow)' }}>
        <label className={styles.toggleLabel} style={{ fontSize: '1rem', fontWeight: 'bold' }}>
          <div className={styles.toggleSwitch}>
            <input 
              type="checkbox" 
              checked={config.discord_enabled} 
              onChange={e => setConfig({...config, discord_enabled: e.target.checked})}
            />
            <span className={styles.toggleSlider}></span>
          </div>
          <span>Master Switch: Bot is {config.discord_enabled ? 'Active' : 'Disabled (Ignoring commands & broadcasts)'}</span>
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
      <div style={{ marginTop: '25px', marginBottom: '25px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
        <label className={styles.toggleLabel} style={{ background: 'var(--glass-inset)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }} data-cuelume-press="pop" data-cuelume-hover>
          <div className={styles.toggleSwitch}>
            <input type="checkbox" checked={config.notify_mail} onChange={e => setConfig({...config, notify_mail: e.target.checked})} />
            <span className={styles.toggleSlider}></span>
          </div>
          <span>Daily Mail Digests</span>
        </label>
        
        <label className={styles.toggleLabel} style={{ background: 'var(--glass-inset)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }} data-cuelume-press="pop" data-cuelume-hover>
          <div className={styles.toggleSwitch}>
            <input type="checkbox" checked={config.notify_news} onChange={e => setConfig({...config, notify_news: e.target.checked})} />
            <span className={styles.toggleSlider}></span>
          </div>
          <span>Live News Broadcasts</span>
        </label>

        <label className={styles.toggleLabel} style={{ background: 'var(--glass-inset)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }} data-cuelume-press="pop" data-cuelume-hover>
          <div className={styles.toggleSwitch}>
            <input type="checkbox" checked={config.notify_prems} onChange={e => setConfig({...config, notify_prems: e.target.checked})} />
            <span className={styles.toggleSlider}></span>
          </div>
          <span>Malkavian Premonition DMs</span>
        </label>

        <label className={styles.toggleLabel} style={{ background: 'var(--glass-inset)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }} data-cuelume-press="pop" data-cuelume-hover>
          <div className={styles.toggleSwitch}>
            <input type="checkbox" checked={config.ai_enabled} onChange={e => setConfig({...config, ai_enabled: e.target.checked})} />
            <span className={styles.toggleSlider}></span>
          </div>
          <span>Enable AI Bot Features (SchreckNet Node)</span>
        </label>
      </div>

      <div className={styles.cardFooter} style={{marginTop: '10px', background: 'transparent', padding: 0}}>
        <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'block', padding: '12px', fontSize: '1rem' }} onClick={handleSave} disabled={loading} data-cuelume-press data-cuelume-hover>
          {loading ? 'Saving...' : '💾 Save Settings'}
        </button>
      </div>

      <hr style={{ borderColor: 'var(--surface-lighter)', margin: '30px 0' }} />

      {/* --- NEW: CUSTOM DM TOOL --- */}
      <div className={styles.sectionHeader}>
        <h4>Direct Message a Player</h4>
      </div>
      <div style={{ background: 'var(--glass-bg)', padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '25px', border: '1px solid var(--glass-border)' }}>
        <div style={{ marginBottom: '15px' }}>
          <select 
            className={styles.input} 
            value={dmUserId} 
            onChange={e => setDmUserId(e.target.value)}
          >
            <option value="">-- Select a Player --</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.display_name} (#{u.id})</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <textarea
            className={styles.input}
            rows="3"
            placeholder="Type your message here..."
            value={dmMessage}
            onChange={e => setDmMessage(e.target.value)}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>
        <button 
          className={`${styles.btn} ${styles.btnPrimary}`} 
          style={{ width: '100%', padding: '12px' }}
          onClick={handleSendDM} 
          disabled={loading || !dmUserId || !dmMessage}
          data-cuelume-press
          data-cuelume-hover
        >
          ✉️ Send Direct Message
        </button>
      </div>

      <hr style={{ borderColor: 'var(--surface-lighter)', margin: '30px 0' }} />

      {/* --- TESTING & CONTROLS --- */}
      <div className={styles.sectionHeader}>
        <h4>System Controls & Testing</h4>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button className={styles.btnGhost} onClick={() => handleTest('mail')} disabled={loading || !config.discord_channel_id} data-cuelume-press data-cuelume-hover>
          Test Mail Digest
        </button>
        <button className={styles.btnGhost} onClick={() => handleTest('news')} disabled={loading || !config.discord_channel_id} data-cuelume-press data-cuelume-hover>
          Test News Broadcast
        </button>
        <button className={styles.btnGhost} onClick={() => handleTest('premonition')} disabled={loading} data-cuelume-press data-cuelume-hover>
          Test Premonition DM
        </button>
        <button className={`${styles.btn} ${styles.btnDanger}`} style={{ marginLeft: 'auto' }} onClick={handleRestart} disabled={loading} data-cuelume-press data-cuelume-hover>
          Hard Restart Bot
        </button>
      </div>


      </div>
    </Skeleton>
  );
}