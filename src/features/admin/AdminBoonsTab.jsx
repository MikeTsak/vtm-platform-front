import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import { Skeleton } from 'boneyard-js/react';

export default function AdminBoonsTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [boons, setBoons] = useState([]);
  const [q, setQ] = useState('');
  
  useEffect(() => {
    loadBoons();
  }, []);

  const loadBoons = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/boons');
      setBoons(data.boons || []);
    } catch (e) {
      setErr('Failed to load boons.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = boons.filter(b => {
    if (!q) return true;
    const search = q.toLowerCase();
    return (
      (b.from_name || '').toLowerCase().includes(search) ||
      (b.to_name || '').toLowerCase().includes(search) ||
      (b.type || '').toLowerCase().includes(search) ||
      (b.details || '').toLowerCase().includes(search)
    );
  });

  return (
    <div className={styles.adminCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>🤝 Boon Registry</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.85rem' }}>All registered life-boons, blood-boons, and minor debts.</p>
        </div>
        <button onClick={loadBoons} className={`${styles.btn} ${styles.btnSecondary}`}>Refresh Registry</button>
      </div>

      <input 
        type="text" 
        className={styles.input} 
        placeholder="Search by character, type, or details..." 
        value={q} 
        onChange={e => setQ(e.target.value)} 
        style={{ marginBottom: '1.5rem', width: '100%', maxWidth: '400px' }}
      />

      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

      <Skeleton loading={loading} name="admin-boons-list">
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Date Registered</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Debtor (Owes)</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Creditor (Owed)</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Type</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--glass-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{new Date(b.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#ff5252', fontWeight: 600 }}>{b.from_name}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#00e676', fontWeight: 600 }}>{b.to_name}</td>
                  <td style={{ padding: '0.75rem 1rem', textTransform: 'capitalize' }}>{b.type.replace('_', ' ')}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>{b.details}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No boons match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Skeleton>
    </div>
  );
}
