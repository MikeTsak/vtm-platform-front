import React, { useState, useEffect, useMemo } from 'react';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/Admin.module.css';
import CreateNewsModal from '../news/CreateNewsModal';
import { formatEuDate, formatAthensDateTime } from '../../utils/dateFormatter';

const OUTLETS = [
  ['Neutral', 'Neutral'], ['ERT', 'ERT News'], ['SKAI', 'SKAI.gr'], ['ALPHA', 'Alpha News'],
  ['MEGA', 'Mega Gegonota'], ['KATHIMERINI', 'Kathimerini'], ['GOSSIP', 'Gossip-tv'],
  ['OPENTV', 'Open TV'], ['ALTER', 'Alter Channel'],
];

const stat = (label, value) => (
  <div key={label} style={{ flex: '1 1 140px', padding: '12px 16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)' }}>
    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
    <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{label}</div>
  </div>
);

// Logged-in readers of one article (admins are never recorded).
function Readers({ articleId }) {
  const [readers, setReaders] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/admin/news/${articleId}/reads`)
      .then(res => setReaders(res.data.readers || []))
      .catch(e => setErr(formatApiError(e, 'Failed to load readers')));
  }, [articleId]);

  if (err) return <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>;
  if (!readers) return <div className={styles.subtle}>Loading readers...</div>;
  if (readers.length === 0) return <div className={styles.subtle}>No logged-in player has opened this article yet.</div>;

  return (
    <table className={styles.table}>
      <thead>
        <tr><th>Reader</th><th>First read</th><th>Last read</th><th>Opens</th></tr>
      </thead>
      <tbody>
        {readers.map(r => (
          <tr key={r.user_id}>
            <td>{r.char_name ? `${r.char_name}${r.clan ? ` (${r.clan})` : ''}` : r.display_name}<span className={styles.subtle}> #{r.user_id}</span></td>
            <td>{formatAthensDateTime(r.first_read_at)}</td>
            <td>{formatAthensDateTime(r.last_read_at)}</td>
            <td>{r.open_count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminNewsTab({ users = [] }) {
  const [view, setView] = useState('articles');
  const [permissions, setPermissions] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openReaders, setOpenReaders] = useState(null);

  const [permUserId, setPermUserId] = useState('');
  const [permTheme, setPermTheme] = useState('');

  const fetchData = async () => {
    try {
      const [permRes, newsRes] = await Promise.all([
        api.get('/admin/news-permissions').catch(() => ({ data: [] })),
        api.get('/admin/news').catch(() => ({ data: { items: [] } })),
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

  const totals = useMemo(() => ({
    articles: news.length,
    priv: news.filter(n => n.is_private).length,
    readers: news.reduce((a, n) => a + Number(n.reader_count || 0), 0),
    opens: news.reduce((a, n) => a + Number(n.open_total || 0), 0),
  }), [news]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return news.filter(n => {
      if (statusFilter === 'public' && n.is_private) return false;
      if (statusFilter === 'private' && !n.is_private) return false;
      return !q || `${n.title} ${n.theme || ''} ${n.journalist_name || ''}`.toLowerCase().includes(q);
    });
  }, [news, search, statusFilter]);

  const act = async (fn, confirmMsg, failMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try { await fn(); fetchData(); } catch { alert(failMsg); }
  };

  const handleGrantPermission = () => {
    if (!permUserId || !permTheme) return alert('Select user and outlet/theme');
    act(async () => {
      await api.post('/admin/news-permissions', { user_id: permUserId, theme: permTheme });
      setPermUserId('');
      setPermTheme('');
    }, null, 'Failed to grant permission');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.editorSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.hl}>News</h3>
          <p className={styles.subtle}>Articles, who has read them, and who may write.</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowCreateModal(true)}>
          + Create News Article
        </button>
      </div>

      {showCreateModal && (
        <CreateNewsModal
          mode="news"
          themes={{ all: true }}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); fetchData(); }}
        />
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '1rem 0' }}>
        {stat('Articles', totals.articles)}
        {stat('Private drafts', totals.priv)}
        {stat('Player readers', totals.readers)}
        {stat('Total opens', totals.opens)}
      </div>

      <div className={styles.modeSwitcher}>
        <button className={`${styles.tab} ${view === 'articles' ? styles.tabActive : ''}`} onClick={() => setView('articles')}>Articles</button>
        <button className={`${styles.tab} ${view === 'writers' ? styles.tabActive : ''}`} onClick={() => setView('writers')}>Writers ({permissions.length})</button>
      </div>

      {view === 'articles' && (
        <>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <input className={styles.input} style={{ flex: '1 1 220px' }} placeholder="Search title, outlet, journalist..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className={styles.input} style={{ flex: '0 0 auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className={styles.tableContainer} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <table className={styles.table} style={{ minWidth: 720 }}>
              <thead>
                <tr><th>ID</th><th>Title</th><th>Outlet</th><th>Status</th><th>Readers</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {shown.map(n => (
                  <React.Fragment key={n.id}>
                    <tr style={{ background: n.is_private ? 'rgba(138, 3, 3, 0.1)' : 'transparent' }}>
                      <td className={styles.idCell}>{n.id}</td>
                      <td>{n.title}</td>
                      <td>{n.theme || '-'}</td>
                      <td>{n.is_private ? <span style={{ color: '#ff9800', fontWeight: 'bold' }}>Private</span> : <span style={{ color: '#4caf50' }}>Public</span>}</td>
                      <td>
                        <button
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                          onClick={() => setOpenReaders(openReaders === n.id ? null : n.id)}
                          title="Logged-in players who opened this article"
                        >
                          {Number(n.reader_count || 0)} readers &middot; {Number(n.open_total || 0)} opens
                        </button>
                      </td>
                      <td>{formatEuDate(n.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {n.is_private ? (
                            <button className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`} onClick={() => act(() => api.patch(`/news/${n.id}/publish`), 'Publish this private news article? It will appear in the public feed and broadcast to Discord.', 'Failed to publish news')}>Publish</button>
                          ) : null}
                          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => window.open(`/news/${n.id}`, '_blank')}>View</button>
                          <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => act(() => api.delete(`/news/${n.id}`), 'Permanently delete this news article?', 'Failed to delete news')}>Del</button>
                        </div>
                      </td>
                    </tr>
                    {openReaders === n.id && (
                      <tr>
                        <td colSpan="7" style={{ background: 'var(--glass-inset)' }}><Readers articleId={n.id} /></td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {shown.length === 0 && <tr><td colSpan="7" style={{ padding: '1rem' }}>No news found.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className={styles.subtle} style={{ marginTop: '0.5rem' }}>
            Readers counts logged-in players only; anonymous visitors and admins are not recorded. Tracking starts from when this was enabled.
          </p>
        </>
      )}

      {view === 'writers' && (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <h4>Grant Writing Permission</h4>
            <div className={styles.formContainer} style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px' }}>
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
                  {OUTLETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginTop: '1rem' }} onClick={handleGrantPermission}>
                Grant Permission
              </button>
            </div>
          </div>

          <div style={{ flex: '2 1 360px' }}>
            <h4>Active Permissions</h4>
            <div className={styles.tableContainer}>
              <table className={styles.table} style={{ minWidth: 360 }}>
                <thead><tr><th>User</th><th>Outlet</th><th>Actions</th></tr></thead>
                <tbody>
                  {permissions.map(p => (
                    <tr key={p.id}>
                      <td>{p.username} (#{p.user_id})</td>
                      <td>{p.theme}</td>
                      <td><button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => act(() => api.delete(`/admin/news-permissions/${p.id}`), 'Revoke this permission?', 'Failed to revoke')}>Revoke</button></td>
                    </tr>
                  ))}
                  {permissions.length === 0 && <tr><td colSpan="3" style={{ padding: '1rem' }}>No permissions granted.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
