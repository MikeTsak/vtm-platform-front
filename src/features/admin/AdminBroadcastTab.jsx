import React, { useState } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';

export default function AdminBroadcastTab() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const sendBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      setErr('Title and body are required.');
      return;
    }
    
    if (!window.confirm('Send this push notification to ALL players globally?')) return;

    setSending(true);
    setErr('');
    setMsg('');

    try {
      const { data } = await api.post('/admin/broadcast', { title, body });
      setMsg(`Broadcast sent successfully! Delivered to ${data.sent_count || 0} users.`);
      setTitle('');
      setBody('');
      setTimeout(() => setMsg(''), 5000);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to send broadcast.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.adminCard} style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📡</span>
        <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Global Broadcast Tool</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Send a push notification to all players. Use this for major IC announcements or critical OOC updates. 
          Notifications respect user opt-out preferences for the "system" category.
        </p>
      </div>

      {msg && <div className={`${styles.alert} ${styles.alertInfo}`} style={{ marginBottom: '1.5rem' }}>{msg}</div>}
      {err && <div className={`${styles.alert} ${styles.alertError}`} style={{ marginBottom: '1.5rem' }}>{err}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label className={styles.labeledInput}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Notification Title</span>
          <input 
            type="text" 
            className={styles.input} 
            placeholder="e.g. Prince's Decree" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
          />
        </label>
        
        <label className={styles.labeledInput}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Message Body</span>
          <textarea 
            className={styles.input} 
            placeholder="Type your announcement here..." 
            rows="5"
            value={body} 
            onChange={e => setBody(e.target.value)} 
          />
        </label>

        <button 
          className={`${styles.btn} ${styles.btnPrimary}`} 
          onClick={sendBroadcast} 
          disabled={sending || !title.trim() || !body.trim()}
          style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            fontSize: '1.1rem',
            background: 'linear-gradient(135deg, var(--color-error) 0%, #ff5252 100%)',
            boxShadow: '0 4px 15px rgba(255, 82, 82, 0.3)'
          }}
        >
          {sending ? 'Transmitting...' : '🚨 Send Global Broadcast'}
        </button>
      </div>
    </div>
  );
}
