import React, { useState } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';

export default function AdminMasqueradeTab() {
  const [level, setLevel] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const handleUpdate = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      await api.post('/admin/masquerade-threat', { level });
      setMsg('Threat level updated successfully. The server has been notified.');
    } catch (e) {
      setErr('Failed to update threat level');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.adminCard}>
      <h2 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '1.6rem', fontWeight: 800 }}>⚠️ Masquerade Threat Dial</h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 2rem 0', fontSize: '0.85rem' }}>Set the global Second Inquisition / Masquerade Threat level.</p>

      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}
      {msg && <div className={`${styles.alert} ${styles.alertSuccess}`} style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676' }}>{msg}</div>}

      <div style={{ background: 'var(--glass-inset)', padding: '2rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '400px', margin: '0 auto 2rem auto' }}>
          {[1, 2, 3, 4, 5].map(lvl => (
            <button 
              key={lvl}
              onClick={() => setLevel(lvl)}
              style={{
                width: '50px', height: '50px', borderRadius: '50%',
                background: level >= lvl ? (lvl >= 4 ? '#ff5252' : '#ffcc00') : 'var(--glass-bg)',
                border: `2px solid ${level >= lvl ? (lvl >= 4 ? '#ff5252' : '#ffcc00') : 'var(--glass-border)'}`,
                color: level >= lvl ? '#000' : 'var(--text-primary)',
                fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {lvl}
            </button>
          ))}
        </div>
        
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 8px 0', color: level >= 4 ? '#ff5252' : '#ffcc00' }}>
            {level === 1 && 'Level 1: Minimal Threat'}
            {level === 2 && 'Level 2: Elevated Suspicions'}
            {level === 3 && 'Level 3: Active Investigations'}
            {level === 4 && 'Level 4: High Alert (SI Raids)'}
            {level === 5 && 'Level 5: RED ALERT (Purge)'}
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Levels 4 and 5 will display a persistent red warning banner on all player dashboards.
          </p>
        </div>

        <button onClick={handleUpdate} disabled={saving} className={`${styles.btn} ${styles.btnPrimary}`}>
          {saving ? 'Updating...' : 'Set Global Threat Level'}
        </button>
      </div>
    </div>
  );
}
