import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';

export default function AdminNewsTab({ users = [] }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Permission Form
  const [permUserId, setPermUserId] = useState('');
  const [permTheme, setPermTheme] = useState('');

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/admin/news-permissions');
      setPermissions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPermissions().finally(() => setLoading(false));
  }, []);

  const handleGrantPermission = async () => {
    if (!permUserId || !permTheme) return alert('Select user and outlet/theme');
    try {
      await api.post('/admin/news-permissions', { user_id: permUserId, theme: permTheme });
      setPermUserId('');
      setPermTheme('');
      fetchPermissions();
    } catch (e) {
      alert('Failed to grant permission');
    }
  };

  const handleRevokePermission = async (id) => {
    if (!window.confirm('Revoke this permission?')) return;
    try {
      await api.delete(`/admin/news-permissions/${id}`);
      fetchPermissions();
    } catch (e) {
      alert('Failed to revoke');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.editorSection}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.hl}>News Author Permissions</h3>
        <p className={styles.subtle}>Grant players the ability to write news articles under specific Outlets.</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        
        {/* Permissions Column */}
        <div style={{ flex: '1 1 400px' }}>
          <h4>Grant Writing Permission</h4>
          <div className={styles.formContainer} style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <div className={styles.formGroup}>
              <label>Select User</label>
              <select className={styles.input} value={permUserId} onChange={e => setPermUserId(e.target.value)}>
                <option value="">-- Select User --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.display_name} (#{u.id})</option>)}
              </select>
            </div>
            <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
              <label>Select Outlet (Theme)</label>
              <select className={styles.input} value={permTheme} onChange={e => setPermTheme(e.target.value)}>
                <option value="">-- Select Outlet --</option>
                <option value="Neutral">Neutral</option>
                <option value="ERT">ERT News</option>
                <option value="SKAI">SKAI.gr</option>
                <option value="ALPHA">Alpha News</option>
                <option value="MEGA">Mega Gegonota</option>
                <option value="KATHIMERINI">Kathimerini</option>
                <option value="GOSSIP">Gossip-tv</option>
                <option value="OPENTV">Open TV</option>
              </select>
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginTop: '1rem' }} onClick={handleGrantPermission}>
              Grant Permission
            </button>
          </div>

          <h4>Active Permissions</h4>
          <div className={styles.tableContainer}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>User</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Theme</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map(p => (
                  <tr key={p.id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{p.username} (#{p.user_id})</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{p.theme}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
                      <button className={styles.btnSecondary} onClick={() => handleRevokePermission(p.id)} style={{ color: 'red' }}>Revoke</button>
                    </td>
                  </tr>
                ))}
                {permissions.length === 0 && <tr><td colSpan="3" style={{ padding: '1rem' }}>No permissions granted.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
