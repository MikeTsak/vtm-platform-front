// src/components/admin/AdminDiscordTab.jsx
import React, { useState, useEffect } from 'react';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/Admin.module.css';
import { Skeleton } from 'boneyard-js/react';

const DISCORD_EMOJI_DEFINITIONS = [
  { key: 'outlet_alter', label: 'Alter Channel', file: 'outlet_alter.png', desc: 'Alter News broadcast logo' },
  { key: 'outlet_ert', label: 'ERT News', file: 'outlet_ert.png', desc: 'ERT Hellenic Broadcasting logo' },
  { key: 'outlet_skai', label: 'SKAI News', file: 'outlet_skai.png', desc: 'SKAI television logo' },
  { key: 'outlet_alpha', label: 'Alpha News', file: 'outlet_alpha.png', desc: 'Alpha channel logo' },
  { key: 'outlet_mega', label: 'Mega Channel', file: 'outlet_mega.png', desc: 'Mega Gegonota logo' },
  { key: 'outlet_kathimerini', label: 'Kathimerini', file: 'outlet_kathimerini.png', desc: 'Kathimerini press logo' },
  { key: 'outlet_gossip', label: 'Gossip tv', file: 'outlet_gossip.png', desc: 'Gossip tv celebrity press logo' },
  { key: 'outlet_opentv', label: 'Open TV', file: 'outlet_opentv.png', desc: 'Open Beyond TV logo' },
  { key: 'item_rumor', label: 'Whisper and Rumor', file: 'item_rumor.png', desc: 'Post it note whisper icon' }
];

export default function AdminDiscordTab({ users = [] }) {
  const [config, setConfig] = useState({
    discord_channel_id: '',
    discord_schedule_time: '12:00',
    discord_enabled: true,
    notify_mail: true,
    notify_news: true,
    notify_prems: true,
    ai_enabled: true,
    discord_emoji_ids: {},
    bot_status: 'Checking...',
    bot_name: ''
  });
  
  // Custom DM State
  const [dmUserId, setDmUserId] = useState('');
  const [dmMessage, setDmMessage] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
  const getEmojiUrl = (file) => `${apiBase}/public/img/discord-emojis/${file}`;

  const handleDownload = async (file) => {
    const url = getEmojiUrl(file);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get('/admin/discord/config');
      setConfig(prev => ({ ...prev, ...data }));
    } catch (e) {
      console.error('[AdminDiscordTab] Failed to load config', e);
      setErr(formatApiError(e, 'Failed to load Discord settings'));
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
        ai_enabled: config.ai_enabled,
        discord_emoji_ids: config.discord_emoji_ids || {}
      });
      setMsg('Settings saved successfully.');
      loadConfig();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyName = (name) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(name);
    }
    setCopiedKey(name);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSyncEmojis = async () => {
    setSyncing(true); setMsg(''); setErr('');
    try {
      const { data } = await api.post('/admin/discord/sync-emojis');
      if (data.matched_count > 0) {
        setMsg(`Synced ${data.matched_count} emojis from Discord server successfully.`);
      } else {
        setMsg(data.message || 'Discord emoji scan completed.');
      }
      loadConfig();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to sync emojis from Discord.');
    } finally {
      setSyncing(false);
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

      {/* MASTER SWITCH */}
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

      {/* SETTINGS GRID */}
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

      {/* TOGGLES */}
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
        <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '1rem' }} onClick={handleSave} disabled={loading} data-cuelume-press data-cuelume-hover>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <hr style={{ borderColor: 'var(--surface-lighter)', margin: '30px 0' }} />

      {/* DISCORD CUSTOM EMOJIS */}
      <div className={styles.sectionHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h4>Discord Custom Emojis</h4>
          <span className={styles.subtle}>Square PNG assets for bot broadcasts</span>
        </div>
        <button
          type="button"
          className={styles.btnGhost}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '0.82rem' }}
          onClick={handleSyncEmojis}
          disabled={loading || syncing}
          title="Detect and link emojis directly from Discord servers"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sync</span>
          {syncing ? 'Syncing...' : 'Sync from Discord'}
        </button>
      </div>

      <div style={{ background: 'var(--glass-bg)', padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '25px', border: '1px solid var(--glass-border)' }}>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: 'var(--text-muted, #aaa)', lineHeight: 1.5 }}>
          Upload these square 128x128 PNG icons to your Discord server under Server Settings, Emojis. Paste either the numerical Emoji ID or the full tag syntax into the corresponding field below and save settings.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          {DISCORD_EMOJI_DEFINITIONS.map(item => (
            <div
              key={item.key}
              style={{
                background: 'var(--glass-inset, rgba(0,0,0,0.25))',
                border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <img
                    src={getEmojiUrl(item.file)}
                    alt={item.label}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: '#0a0a0f',
                      objectFit: 'contain',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)', fontFamily: 'monospace' }}>
                      :{item.key}:
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    style={{ padding: '4px 8px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => handleCopyName(item.key)}
                    title="Copy emoji name"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                      {copiedKey === item.key ? 'check' : 'content_copy'}
                    </span>
                    {copiedKey === item.key ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    style={{ padding: '4px 8px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => handleDownload(item.file)}
                    title="Download square PNG"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
                    PNG
                  </button>
                </div>
              </div>

              <div>
                <input
                  className={styles.input}
                  style={{ fontSize: '0.8rem', padding: '6px 10px', width: '100%' }}
                  placeholder="Discord Emoji ID or <:name:id>"
                  value={config.discord_emoji_ids?.[item.key] || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setConfig(prev => ({
                      ...prev,
                      discord_emoji_ids: {
                        ...(prev.discord_emoji_ids || {}),
                        [item.key]: val
                      }
                    }));
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', fontSize: '0.9rem' }}
            onClick={handleSave}
            disabled={loading}
            data-cuelume-press
            data-cuelume-hover
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>save</span>
            {loading ? 'Saving...' : 'Save Emoji IDs'}
          </button>
        </div>
      </div>

      <hr style={{ borderColor: 'var(--surface-lighter)', margin: '30px 0' }} />

      {/* CUSTOM DM TOOL */}
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
            <option value="">Select a Player</option>
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
          style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={handleSendDM} 
          disabled={loading || !dmUserId || !dmMessage}
          data-cuelume-press
          data-cuelume-hover
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
          Send Direct Message
        </button>
      </div>

      <hr style={{ borderColor: 'var(--surface-lighter)', margin: '30px 0' }} />

      {/* TESTING & CONTROLS */}
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