import React, { useState, useEffect, useMemo } from 'react';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/Admin.module.css';
import FaGlyph from '../../ui/FaGlyph';
import CreateNewsModal from '../news/CreateNewsModal';
import { DISCORD_PREFIX_OPTIONS, getDefaultDiscordPrefix } from '../../constants/outletConstants';
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
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/admin/news/${articleId}/reads`)
      .then(res => setData({
        readers: res.data.readers || [],
        views: Number(res.data.views || 0)
      }))
      .catch(e => setErr(formatApiError(e, 'Failed to load readers')));
  }, [articleId]);

  if (err) return <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>;
  if (!data) return <div className={styles.subtle}>Loading readers...</div>;
  const { readers, views } = data;

  return (
    <div style={{ padding: '0.5rem 0' }}>
      <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Total Public Views: <strong style={{ color: 'var(--text-primary)' }}>{views}</strong> (includes guests and Discord visitors) &middot; Registered Players: <strong style={{ color: 'var(--text-primary)' }}>{readers.length}</strong>
      </div>
      {readers.length === 0 ? (
        <div className={styles.subtle}>No logged in player has opened this article yet.</div>
      ) : (
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
      )}
    </div>
  );
}

export default function AdminNewsTab({ users = [] }) {
  const [view, setView] = useState('articles');
  const [permissions, setPermissions] = useState([]);
  const [news, setNews] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const [publishingArticle, setPublishingArticle] = useState(null);
  const [publishDiscordPrefix, setPublishDiscordPrefix] = useState(getDefaultDiscordPrefix('news'));
  const [isCustomPublishPrefix, setIsCustomPublishPrefix] = useState(false);
  const [skipPublishDiscord, setSkipPublishDiscord] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openReaders, setOpenReaders] = useState(null);

  const [permUserId, setPermUserId] = useState('');
  const [permTheme, setPermTheme] = useState('');

  const fetchData = async () => {
    try {
      const [permRes, newsRes, draftsRes] = await Promise.all([
        api.get('/admin/news-permissions').catch(() => ({ data: [] })),
        api.get('/admin/news').catch(() => ({ data: { items: [] } })),
        api.get('/news/drafts').catch(() => ({ data: { drafts: [] } })),
      ]);
      setPermissions(permRes.data || []);
      setNews(newsRes.data.items || []);
      setDrafts(draftsRes.data.drafts || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => ({
    articles: news.length,
    drafts: drafts.length,
    priv: news.filter(n => n.is_private).length,
    readers: news.reduce((a, n) => a + Number(n.reader_count || 0), 0),
    opens: news.reduce((a, n) => a + Number(n.open_total || 0), 0),
    views: news.reduce((a, n) => a + Number(n.views || 0), 0),
  }), [news, drafts]);

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

  const handleOpenPublishModal = (article) => {
    setPublishingArticle(article);
    setPublishDiscordPrefix(getDefaultDiscordPrefix('news'));
    setIsCustomPublishPrefix(false);
    setSkipPublishDiscord(false);
  };

  const handleConfirmPublish = async () => {
    if (!publishingArticle) return;
    setIsPublishing(true);
    try {
      const chosenPrefix = isCustomPublishPrefix ? publishDiscordPrefix : (publishDiscordPrefix || getDefaultDiscordPrefix('news'));
      if (publishingArticle.is_private) {
        const payload = {
          skip_discord: skipPublishDiscord,
          discord_prefix: chosenPrefix
        };
        await api.patch(`/news/${publishingArticle.id}/publish`, payload);
      } else {
        await api.post(`/news/${publishingArticle.id}/broadcast`, {
          discord_prefix: chosenPrefix
        });
      }
      setPublishingArticle(null);
      await fetchData();
    } catch (e) {
      alert(formatApiError(e, publishingArticle.is_private ? 'Failed to publish news' : 'Failed to broadcast news'));
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.editorSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.hl}>News</h3>
          <p className={styles.subtle}>Articles, who has read them, and who may write.</p>
        </div>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => {
            setEditingDraft(null);
            setShowCreateModal(true);
          }}
        >
          + Create News Article
        </button>
      </div>

      {showCreateModal && (
        <CreateNewsModal
          mode="news"
          themes={{ all: true }}
          initialDraft={editingDraft}
          onClose={() => {
            setShowCreateModal(false);
            setEditingDraft(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingDraft(null);
            fetchData();
          }}
          onDraftDiscard={() => {
            setShowCreateModal(false);
            setEditingDraft(null);
            fetchData();
          }}
        />
      )}

      {publishingArticle && (
        <div className={styles.modalBackdrop} onClick={() => !isPublishing && setPublishingArticle(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderContent}>
                <h3>{publishingArticle.is_private ? 'Publish News Article' : 'Broadcast News Article'}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {publishingArticle.is_private
                    ? 'This article will become public in the news feed and announce to Discord.'
                    : 'This article is already public and will be broadcast to Discord.'}
                </div>
              </div>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0 }}
                onClick={() => setPublishingArticle(null)}
                disabled={isPublishing}
                aria-label="Close"
              >
                <FaGlyph name="fa-xmark" size={14} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Headline ({publishingArticle.theme || 'Mortal Press'})
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                  {publishingArticle.title}
                </div>
                {publishingArticle.subtitle && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {publishingArticle.subtitle}
                  </div>
                )}
              </div>

              {publishingArticle.is_private && (
                <div className={styles.formGroup} style={{ marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={skipPublishDiscord}
                      onChange={e => setSkipPublishDiscord(e.target.checked)}
                      disabled={isPublishing}
                    />
                    <span>Do not send a Discord notification</span>
                  </label>
                </div>
              )}

              {(!publishingArticle.is_private || !skipPublishDiscord) && (
                <div className={styles.formGroup}>
                  <label>Discord Announcement Style</label>
                  <select
                    className={styles.input}
                    value={isCustomPublishPrefix ? 'custom' : publishDiscordPrefix}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomPublishPrefix(true);
                        setPublishDiscordPrefix('');
                      } else {
                        setIsCustomPublishPrefix(false);
                        setPublishDiscordPrefix(e.target.value);
                      }
                    }}
                    disabled={isPublishing}
                  >
                    {DISCORD_PREFIX_OPTIONS.news.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                    <option value="custom">Custom Message...</option>
                  </select>
                  {isCustomPublishPrefix && (
                    <input
                      placeholder="Type your custom discord message..."
                      className={styles.input}
                      style={{ marginTop: '0.5rem' }}
                      value={publishDiscordPrefix}
                      onChange={e => setPublishDiscordPrefix(e.target.value)}
                      disabled={isPublishing}
                    />
                  )}
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setPublishingArticle(null)}
                disabled={isPublishing}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSuccess}`}
                onClick={handleConfirmPublish}
                disabled={isPublishing}
              >
                {isPublishing
                  ? (publishingArticle.is_private ? 'Publishing...' : 'Broadcasting...')
                  : (publishingArticle.is_private ? 'Publish Article' : 'Broadcast to Discord')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '1rem 0' }}>
        {stat('Articles', totals.articles)}
        {stat('Unpublished Drafts', totals.drafts)}
        {stat('Private Articles', totals.priv)}
        {stat('Player Readers', totals.readers)}
        {stat('Total Opens', totals.opens)}
        {stat('Total Views', totals.views)}
      </div>

      <div className={styles.modeSwitcher}>
        <button className={`${styles.tab} ${view === 'articles' ? styles.tabActive : ''}`} onClick={() => setView('articles')}>Articles</button>
        <button className={`${styles.tab} ${view === 'drafts' ? styles.tabActive : ''}`} onClick={() => setView('drafts')}>Drafts ({drafts.length})</button>
        <button className={`${styles.tab} ${view === 'writers' ? styles.tabActive : ''}`} onClick={() => setView('writers')}>Writers ({permissions.length})</button>
      </div>

      {view === 'drafts' && (
        <div className={styles.tableContainer} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <table className={styles.table} style={{ minWidth: 720 }}>
            <thead>
              <tr><th>ID</th><th>Headline</th><th>Outlet</th><th>Author</th><th>Last Updated</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {drafts.map(d => (
                <tr key={d.id}>
                  <td className={styles.idCell}>{d.id}</td>
                  <td>
                    <strong>{d.title || 'Untitled Draft'}</strong>
                    {d.subtitle && <div className={styles.subtle}>{d.subtitle}</div>}
                  </td>
                  <td>{d.theme || 'ERT'}</td>
                  <td>
                    {d.author_char_name ? `${d.author_char_name}${d.author_clan ? ` (${d.author_clan})` : ''}` : (d.author_name || 'Unknown')}
                    <span className={styles.subtle}> #{d.user_id}</span>
                  </td>
                  <td>{formatAthensDateTime(d.updated_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                        onClick={() => {
                          setEditingDraft(d);
                          setShowCreateModal(true);
                        }}
                      >
                        Resume
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                        onClick={() => act(() => api.delete(`/news/drafts/${d.id}`), 'Permanently delete this draft?', 'Failed to delete draft')}
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {drafts.length === 0 && (
                <tr><td colSpan="6" style={{ padding: '2rem 1rem', textAlign: 'center' }} className={styles.subtle}>No news article drafts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
                <tr><th>ID</th><th>Title</th><th>Outlet</th><th>Status</th><th>Readers and Views</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {shown.map(n => (
                  <React.Fragment key={n.id}>
                    <tr style={{ background: n.is_private ? 'rgba(138, 3, 3, 0.1)' : 'transparent' }}>
                      <td className={styles.idCell}>{n.id}</td>
                      <td>{n.title}</td>
                      <td>{n.theme || 'None'}</td>
                      <td>{n.is_private ? <span style={{ color: '#ff9800', fontWeight: 'bold' }}>Private</span> : <span style={{ color: '#4caf50' }}>Public</span>}</td>
                      <td>
                        <button
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                          onClick={() => setOpenReaders(openReaders === n.id ? null : n.id)}
                          title="Player readers, player opens, and total public views"
                        >
                          {Number(n.reader_count || 0)} readers &middot; {Number(n.open_total || 0)} opens &middot; {Number(n.views || 0)} views
                        </button>
                      </td>
                      <td>{formatEuDate(n.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {n.is_private ? (
                            <button className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`} onClick={() => handleOpenPublishModal(n)}>Publish</button>
                          ) : (
                            <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => handleOpenPublishModal(n)} title="Broadcast to Discord">Broadcast</button>
                          )}
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
