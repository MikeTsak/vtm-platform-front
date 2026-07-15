import React, { useState, useEffect, useContext } from 'react';
import api from '../../core/api';
import { AuthCtx } from '../../core/AuthContext';
import styles from '../../styles/News.module.css';
import { NEWS_OUTLETS } from '../../constants/newsConstants';
import { apiJoin, isVideoUrl } from '../../utils/newsUtils';
import { useNavigate } from 'react-router-dom';
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

  const [modalMode, setModalMode] = useState(null);
  const [fullscreenArticle, setFullscreenArticle] = useState(null);
  const [viewMode, setViewMode] = useState('split');

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

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/news/${id}`);
    },
    onSuccess: () => {
      toast.success('Article deleted');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete article');
    }
  });

  const loading = newsLoading || (myCharLoading && !isAdmin && !isCourt);

  const myChar = myCharData?.character || null;

  // Check if character is active (similar to DownTimes logic)
  const isCharActive = !!user && (isAdmin || isCourt || (myChar && myChar.sheet && myChar.sheet.is_active === true));

  // If the user's character is fetched but deactivated, or user is not logged in, force them into 'news' mode
  useEffect(() => {
    if (!user && viewMode !== 'news') {
      setViewMode('news');
      return;
    }
    if (user && myChar && !myChar.sheet?.is_active && viewMode !== 'news') {
      setViewMode('news');
    }
  }, [myChar, viewMode, user]);

  // Can post rumor only if they are an Admin, Court, or an ACTIVE character
  const canPostRumor = isCharActive;

  const rawItems = newsData?.items || [];
  const items = rawItems.filter(i => i.type === 'news').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleDelete = (id) => {
    if(window.confirm("Delete this article?")) {
      deleteMutation.mutate(id);
    }
  };

  const newsItems = items.filter(item => item.theme !== 'RUMOR');
  const rumorItems = items.filter(item => item.theme === 'RUMOR');

  return (
    <Skeleton loading={loading} name="news-page">
      <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Human World News</h1>
        <div className={styles.headerActions}>
          {isAdmin && (
            <button className={styles.createBtn} onClick={() => setModalMode('news')}>
              + Write Article
            </button>
          )}
          {canPostRumor && (
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


          {/* View Mode Menus / Tabs */}
        <div className={styles.viewModeTabs}>
          {isCharActive && (
            <button onClick={() => setViewMode('split')} className={`${styles.viewTab} ${viewMode === 'split' ? styles.viewTabActive : ''}`}>Split View</button>
          )}
          <button onClick={() => setViewMode('news')} className={`${styles.viewTab} ${viewMode === 'news' ? styles.viewTabActive : ''}`}>News Only</button>
          {isCharActive && (
            <button onClick={() => setViewMode('rumors')} className={`${styles.viewTab} ${styles.rumorTab} ${viewMode === 'rumors' ? styles.rumorTabActive : ''}`}>Rumors Only</button>
          )}
        </div>

        {/* Layout Container */}
        <div className={styles.layoutContainer} style={{ flexDirection: viewMode === 'split' ? 'row' : 'column' }}>

          {/* News Section */}
          {(viewMode === 'split' || viewMode === 'news') && (
            <div className={styles.column}>
              {viewMode === 'split' && <h2 className={styles.sectionHeading}>📰 Official News</h2>}
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
                            <span style={{ backgroundColor: theme.color, opacity: 0.4 }}/>
                            <span style={{ backgroundColor: theme.color, opacity: 0.7 }}/>
                            <span style={{ backgroundColor: theme.color }}/>
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

                          {item.media_url && (
                            <div className={styles.bodyHtml} dangerouslySetInnerHTML={{ __html: item.body }} />
                          )}
                        </div>
                        {isAdmin && (
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className={styles.deleteOverlay} disabled={deleteMutation.isPending}>×</button>
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
          {isCharActive && (viewMode === 'split' || viewMode === 'rumors') && (
            <div className={styles.column}>
              {viewMode === 'split' && <h2 className={styles.sectionHeadingRumor}>🤫 Whispers & Rumors</h2>}
              <div className={styles.masonry}>
                {rumorItems.map(item => {
                  const mediaUrl = apiJoin(item.media_url);
                  return (
                    <div key={item.id} className={styles.masonryItem} onClick={() => navigate(`/news/${item.id}`)}>
                      <article className={styles.rumorCard}>
                        <h2 className={styles.rumorTitle}>{item.title}</h2>
                        {item.media_url && (
                          <div className={styles.mediaFrame}>
                            {isVideoUrl(item.media_url) ? <video src={mediaUrl} controls /> : <img src={mediaUrl} alt="Proof" />}
                          </div>
                        )}
                        <div className={styles.rumorBodyText} dangerouslySetInnerHTML={{ __html: item.body }} />
                        <div className={styles.rumorMeta}>— Heard on {new Date(item.created_at).toLocaleDateString()}</div>
                        {isAdmin && (
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className={styles.deleteOverlay} disabled={deleteMutation.isPending}>×</button>
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
  </Skeleton>
  );
}