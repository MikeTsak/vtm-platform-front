import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import CreateNewsModal from '../news/CreateNewsModal';
import { formatEuDate } from '../../utils/dateFormatter';

export default function AdminNewsTab({ users = [] }) {
  const [permissions, setPermissions] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Permission Form
  const [permUserId, setPermUserId] = useState('');
  const [permTheme, setPermTheme] = useState('');

  const fetchData = async () => {
    try {
      const [permRes, newsRes] = await Promise.all([
        api.get('/admin/news-permissions').catch(() => ({ data: [] })),
        api.get('/admin/news').catch(() => ({ data: { items: [] } }))
      ]);
      setPermissions(permRes.data || []);
      setNews(newsRes.data.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  const handleGrantPermission = async () => {
    if (!permUserId || !permTheme) return alert('Select user and outlet/theme');
    try {
      await api.post('/admin/news-permissions', { user_id: permUserId, theme: permTheme });
      setPermUserId('');
      setPermTheme('');
      fetchData();
    } catch (e) {
      alert('Failed to grant permission');
    }
  };

  const handleRevokePermission = async (id) => {
    if (!window.confirm('Revoke this permission?')) return;
    try {
      await api.delete(`/admin/news-permissions/${id}`);
      fetchData();
    } catch (e) {
      alert('Failed to revoke');
    }
  };

  const handleDeleteNews = async (id) => {
    if (!window.confirm('Permanently delete this news article?')) return;
    try {
      await api.delete(`/news/${id}`);
      fetchData();
    } catch (e) {
      alert('Failed to delete news');
    }
  };

  const handlePublishNews = async (id) => {
    if (!window.confirm('Publish this private news article? It will appear in the public feed and broadcast to Discord.')) return;
    try {
      await api.patch(`/news/${id}/publish`);
      fetchData();
    } catch (e) {
      alert('Failed to publish news');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.editorSection}>
      <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className={styles.hl}>News Management</h3>
          <p className={styles.subtle}>Manage news authors and existing articles.</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowCreateModal(true)}>
          + Create News Article
        </button>
      </div>

      {showCreateModal && (
        <CreateNewsModal 
          mode="news" 
          themes={{all: true}} 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={() => {
            setShowCreateModal(false);
            fetchData();
          }} 
        />
      )}

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        
        {/* Permissions Column */}
        <div style={{ flex: '1 1 300px' }}>
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

        {/* News Column */}
        <div style={{ flex: '2 1 500px' }}>
          <h4>Recent News & Announcements</h4>
          <div className={styles.tableContainer} style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>ID</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Type</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Title</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Status</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Date</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {news.map(n => (
                  <tr key={n.id} style={{ background: n.is_private ? 'rgba(138, 3, 3, 0.1)' : 'transparent' }}>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{n.id}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{n.type}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{n.title}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
                      {n.is_private ? <span style={{ color: '#ff9800', fontWeight: 'bold' }}>Private</span> : <span style={{ color: '#4caf50' }}>Public</span>}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{formatEuDate(n.created_at)}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {n.is_private ? (
                          <button className={styles.btnSecondary} onClick={() => handlePublishNews(n.id)} style={{ color: '#4caf50' }}>Publish</button>
                        ) : null}
                        <button className={styles.btnSecondary} onClick={() => window.open(`/news/${n.id}`, '_blank')}>View</button>
                        <button className={styles.btnSecondary} onClick={() => handleDeleteNews(n.id)} style={{ color: 'red' }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {news.length === 0 && <tr><td colSpan="6" style={{ padding: '1rem' }}>No news found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
