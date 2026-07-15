import React, { useState, useEffect, useContext } from 'react';
import api from '../../core/api';
import { AuthCtx } from '../../core/AuthContext';
import styles from '../../styles/News.module.css';
import { NEWS_OUTLETS } from '../../constants/newsConstants';
import { apiJoin, isVideoUrl } from '../../utils/newsUtils';
import { useNavigate, useLocation } from 'react-router-dom';
import CreateNewsModal from './CreateNewsModal';
import FullscreenArticleModal from '../../components/FullscreenArticleModal';
import { Skeleton } from 'boneyard-js/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import GoogleAd from '../../components/GoogleAd';

export default function News() {
  const { user } = useContext(AuthCtx);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isRumorsPage = location.pathname.startsWith('/rumors');

  const [modalMode, setModalMode] = useState(null);
  const [fullscreenArticle, setFullscreenArticle] = useState(null);
  const [fullscreenRumor, setFullscreenRumor] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isCourt = user?.role === 'courtuser';

  // React Query Fetching
  const { data: myCharData, isLoading: myCharLoading } = useQuery({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data;
    },
    enabled: !!user && !isAdmin && !isCourt // Only fetch if not admin/court and logged in
  });

  const { data: newsData, isLoading: newsLoading } = useQuery({
    queryKey: ['news', !!user],
    queryFn: async () => {
      const res = await api.get(user ? '/news' : '/news/public');
      return res.data;
    }
  });

  const { data: rumorsData, isLoading: rumorsLoading } = useQuery({
    queryKey: ['rumors'],
    queryFn: async () => {
      const res = await api.get('/rumors');
      return res.data;
    },
    enabled: !!user // Only fetch rumors if logged in
  });

  const deleteNewsMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/news/${id}`);
    },
    onSuccess: () => {
      toast.success('News article deleted');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete article');
    }
  });

  const deleteRumorMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/rumors/${id}`);
    },
    onSuccess: () => {
      toast.success('Rumor deleted');
      queryClient.invalidateQueries({ queryKey: ['rumors'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete rumor');
    }
  });

  const loading = newsLoading || rumorsLoading || (myCharLoading && !isAdmin && !isCourt);

  const myChar = myCharData?.character || null;

  // Check if character is active (similar to DownTimes logic)
  const isCharActive = !!user && (isAdmin || isCourt || (myChar && myChar.sheet && myChar.sheet.is_active === true));

  // If the user's character is fetched but deactivated, or user is not logged in, redirect them from rumors
  useEffect(() => {
    if (isRumorsPage && !isCharActive && !loading) {
      navigate('/news');
    }
  }, [isRumorsPage, isCharActive, loading, navigate]);

  // Can post rumor only if they are an Admin, Court, or an ACTIVE character
  const canPostRumor = isCharActive;

  const rawItems = newsData?.items || [];
  const items = rawItems.filter(i => i.type === 'news').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleDeleteNews = (id) => {
    if (window.confirm("Delete this news article?")) {
      deleteNewsMutation.mutate(id);
    }
  };

  const handleDeleteRumor = (id) => {
    if (window.confirm("Delete this rumor?")) {
      deleteRumorMutation.mutate(id);
    }
  };

  const newsItems = items;
  const rumorItems = (rumorsData?.items || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Skeleton loading={loading} name="news-page">
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>{isRumorsPage ? 'Rumors' : 'Official News'}</h1>
          <div className={styles.headerActions}>
            {!isRumorsPage && isAdmin && (
              <button className={styles.createBtn} onClick={() => setModalMode('news')}>
                + Write Article
              </button>
            )}
            {isRumorsPage && canPostRumor && (
              <button
                className={`${styles.createBtn} ${styles.rumorBtn}`}
                onClick={() => setModalMode('rumor')}
              >
                + Post Rumor
              </button>
            )}
          </div>
        </header>

        <div style={{ margin: '1rem 0' }}>
          <GoogleAd format="horizontal" style={{ minHeight: '100px' }} />
        </div>

        {/* Layout Container */}
        <div className={styles.layoutContainer} style={{ flexDirection: 'column' }}>

          {/* News Section */}
          {!isRumorsPage && (
            <div className={styles.column}>
              <div className={styles.masonry}>
                {newsItems.map(item => {
                  const theme = NEWS_OUTLETS[item.theme] || NEWS_OUTLETS['ERT'];
                  const mediaUrl = apiJoin(item.media_url);
                  return (
                    <div key={item.id} className={styles.masonryItem} onClick={() => navigate(`/news/${item.id}`)}>
                      <article
                        className={styles.browserCard}
                        style={{ '--theme-color': theme.color }}
                      >
                        <div className={styles.browserBar}>
                          <div className={styles.dots}>
                            <span style={{ backgroundColor: theme.color, opacity: 0.4 }} />
                            <span style={{ backgroundColor: theme.color, opacity: 0.7 }} />
                            <span style={{ backgroundColor: theme.color }} />
                          </div>
                          <div className={styles.url}>
                            🔒 https://{theme.url}/article/{item.id}
                          </div>
                        </div>

                        <div className={styles.newsHeader} style={{ backgroundImage: `url(${theme.logo})` }}>
                          <div className={styles.headerOverlay}>
                            <div className={styles.headerTitleGroup}>
                              <span className={styles.live} style={{ backgroundColor: theme.color }}>LIVE</span>
                              <span className={styles.outletName} style={{ color: theme.color }}>{theme.name}</span>
                            </div>
                          </div>
                        </div>

                        <div className={styles.newsBody}>
                          <h2>{item.title}</h2>
                          {item.subtitle && <h4 style={{ color: theme.color }}>{item.subtitle}</h4>}

                          <div className={styles.meta}>
                            <span className={styles.journalist} style={{ color: theme.color }}>By {item.journalist_name || 'Staff'}</span>
                            <span className={styles.date}>| {new Date(item.created_at).toLocaleDateString()}</span>
                          </div>

                          {item.media_url && (
                            <div className={styles.mediaFrame}>
                              {isVideoUrl(item.media_url) ? <video src={mediaUrl} controls /> : <img src={mediaUrl} alt="News" />}
                            </div>
                          )}

                          <div className={styles.bodyHtml} dangerouslySetInnerHTML={{ __html: item.body }} />
                        </div>
                        {(isAdmin || isCourt) && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteNews(item.id); }} className={styles.deleteOverlay} disabled={deleteNewsMutation.isPending}>×</button>
                        )}
                      </article>
                    </div>
                  );
                })}
                {newsItems.length === 0 && <p className={styles.emptyText}>No news published yet.</p>}
              </div>
            </div>
          )}

          {/* Rumors Section - Completely hidden if character is not active */}
          {isCharActive && isRumorsPage && (
            <div className={styles.column}>
              <div className={styles.masonry}>
                {rumorItems.map(item => {
                  const mediaUrl = apiJoin(item.media_url);
                  return (
                    <div key={item.id} className={styles.masonryItem} onClick={() => setFullscreenRumor(item)}>
                      <article className={styles.rumorCard}>
                        <h2 className={styles.rumorTitle}>{item.title}</h2>
                        {item.media_url && (
                          <div className={styles.mediaFrame}>
                            {isVideoUrl(item.media_url) ? <video src={mediaUrl} controls /> : <img src={mediaUrl} alt="Proof" />}
                          </div>
                        )}
                        <div className={styles.rumorBodyText} dangerouslySetInnerHTML={{ __html: item.body }} />
                        <div className={styles.rumorMeta}>— Heard on {new Date(item.created_at).toLocaleDateString()}</div>

                        {(isAdmin || isCourt) && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteRumor(item.id); }} className={styles.deleteOverlay} disabled={deleteRumorMutation.isPending}>×</button>
                        )}
                      </article>
                    </div>
                  );
                })}
                {rumorItems.length === 0 && <p className={styles.emptyText}>No rumors heard lately.</p>}
              </div>
            </div>
          )}

        </div>
      </div>

      {modalMode && (
        <CreateNewsModal mode={modalMode} onClose={() => setModalMode(null)} onSuccess={() => { setModalMode(null); queryClient.invalidateQueries({ queryKey: ['news'] }); }} />
      )}

      {fullscreenArticle && (
        <FullscreenArticleModal item={fullscreenArticle} onClose={() => setFullscreenArticle(null)} />
      )}

      {fullscreenRumor && (
        <FullscreenRumorModal item={fullscreenRumor} onClose={() => setFullscreenRumor(null)} />
      )}
    </Skeleton>
  );
}

function FullscreenRumorModal({ item, onClose }) {
  if (!item) return null;
  const mediaUrl = item.media_url ? apiJoin(item.media_url) : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={onClose}>
      <div
        style={{
          background: '#fefcbf',
          color: '#333',
          padding: '2rem',
          borderRadius: '2px',
          boxShadow: '4px 4px 15px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.05)',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          transform: 'rotate(-2deg)',
          fontFamily: '"Caveat", "Comic Sans MS", cursive, sans-serif'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ float: 'right', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#555' }}>&times;</button>
        <h2 style={{ fontSize: '2.2rem', marginBottom: '1rem', borderBottom: '1px solid #d4d4aa', paddingBottom: '0.5rem', fontFamily: '"Caveat", "Comic Sans MS", cursive, sans-serif', fontWeight: 'bold' }}>{item.title}</h2>
        {mediaUrl && (
          <div style={{ marginBottom: '1rem' }}>
            {isVideoUrl(item.media_url) ? <video src={mediaUrl} controls style={{ width: '100%', borderRadius: '4px', border: '2px solid rgba(0,0,0,0.1)' }} /> : <img src={mediaUrl} alt="Proof" style={{ width: '100%', borderRadius: '4px', border: '2px solid rgba(0,0,0,0.1)' }} />}
          </div>
        )}
        <div style={{ fontSize: '1.3rem', lineHeight: '1.4', whiteSpace: 'pre-wrap', color: '#222' }} dangerouslySetInnerHTML={{ __html: item.body }} />
        <div style={{ marginTop: '2rem', fontSize: '1rem', color: '#555', textAlign: 'right', fontStyle: 'italic' }}>
          — Heard on {new Date(item.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}