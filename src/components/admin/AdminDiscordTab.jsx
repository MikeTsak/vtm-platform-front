// src/components/admin/AdminDiscordTab.jsx
import React, { useState, useEffect } from 'react';
import api from '../../api';
import styles from '../../styles/Admin.module.css';

export default function AdminDiscordTab() {
  const [config, setConfig] = useState({
    discord_channel_id: '',
    discord_schedule_time: '12:00',
    bot_status: 'Checking...',
    bot_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Load settings on mount
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
    setLoading(true);
    setMsg('');
    setErr('');
    try {
      await api.post('/admin/discord/config', {
        discord_channel_id: config.discord_channel_id,
        discord_schedule_time: config.discord_schedule_time
      });
      setMsg('Settings saved successfully.');
      loadConfig(); // Reload to confirm
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!window.confirm('This will immediately check for unread mail and tag users in the configured channel. Continue?')) return;
    
    setLoading(true);
    setMsg('');
    setErr('');
    try {
      await api.post('/admin/discord/test');
      setMsg('Test trigger sent to backend. Check Discord!');
    } catch (e) {
      setErr('Failed to trigger test.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.editorSection} style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className={styles.sectionHeader}>
        <h4>Discord Integration</h4>
        <span className={styles.subtle}>
          Bot Status: 
          <b style={{color: config.bot_status === 'Online' ? '#00C851' : '#FF4444', marginLeft: '6px'}}>
            {config.bot_status}
          </b> 
          {config.bot_name && ` (${config.bot_name})`}
        </span>
      </div>

      {msg && <div className={`${styles.alert} ${styles.alertInfo}`}>{msg}</div>}
      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

      <div className={styles.formGrid}>
        <div className={styles.labeledInput}>
          <span>Discord Channel ID</span>
          <input
            className={styles.input}
            value={config.discord_channel_id}
            onChange={e => setConfig({ ...config, discord_channel_id: e.target.value })}
            placeholder="e.g. 123456789012345678"
          />
          <small style={{color: '#888'}}>Right-click channel &gt; Copy ID (Developer Mode required)</small>
        </div>

        <div className={styles.labeledInput}>
          <span>Daily Notification Time (Server Time)</span>
          <input
            type="time"
            className={styles.input}
            value={config.discord_schedule_time}
            onChange={e => setConfig({ ...config, discord_schedule_time: e.target.value })}
          />
        </div>
      </div>

      <div className={styles.cardFooter} style={{marginTop: '20px', background: 'transparent', padding: 0}}>
        <button 
          className={styles.btnPrimary} 
          onClick={handleSave} 
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>

        <button 
          className={styles.btnGhost} 
          onClick={handleTest} 
          disabled={loading || !config.discord_channel_id}
          style={{marginLeft: 'auto'}}
        >
          Test Notification Now
        </button>
      </div>
    </div>
  );
}