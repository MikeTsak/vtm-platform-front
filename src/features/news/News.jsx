import React, { useState, useEffect, useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import api from '../../core/api';
import { AuthCtx } from '../../core/AuthContext';
import styles from '../../styles/News.module.css';
import { NEWS_OUTLETS } from '../../constants/outletConstants';
import { apiJoin, isVideoUrl } from '../../utils/newsUtils';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import { useLocation, Link } from 'react-router-dom';
import CreateNewsModal from './CreateNewsModal';
import FullscreenArticleModal from '../../components/FullscreenArticleModal';
import { Skeleton } from 'boneyard-js/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
// import GoogleAd from '../../components/GoogleAd';

export default function News() {
  const { user } = useContext(AuthCtx);
  const queryClient = useQueryClient();
  const location = useLocation();
  const isRumorsPage = location.pathname.startsWith('/rumors');

  const [modalMode, setModalMode] = useState(null);
  const [fullscreenArticle, setFullscreenArticle] = useState(null);
  const [fullscreenRumor, setFullscreenRumor] = useState(null);
  const [rumorPrintTarget, setRumorPrintTarget] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isCourt = user?.role === 'courtuser';

  const handlePrintAllRumors = () => {
    setRumorPrintTarget('all');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handlePrintSingleRumor = (item) => {
    setRumorPrintTarget(item);
    setTimeout(() => {
      window.print();
    }, 200);
  };

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

  const { data: myThemes, isLoading: themesLoading } = useQuery({
    queryKey: ['my-themes'],
    queryFn: async () => {
      const res = await api.get('/news/my-themes');
      return res.data;
    },
    enabled: !!user && !isRumorsPage
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

  const broadcastNewsMutation = useMutation({
    mutationFn: async (id) => {
      await api.post(`/news/${id}/broadcast`);
    },
    onSuccess: () => {
      toast.success('News/Announcement broadcasted to Discord');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to broadcast');
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

  const broadcastRumorMutation = useMutation({
    mutationFn: async (id) => {
      await api.post(`/rumors/${id}/broadcast`);
    },
    onSuccess: () => {
      toast.success('Rumor broadcasted to Discord');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to broadcast');
    }
  });

  const loading = newsLoading || rumorsLoading || themesLoading || (myCharLoading && !isAdmin && !isCourt);

  const myChar = myCharData?.character || null;

  // Check if character is active (similar to DownTimes logic)
  const isCharActive = !!user && (isAdmin || isCourt || (myChar && myChar.sheet && myChar.sheet.is_active === true));

  // Can post rumor only if they are an Admin, Court, or an ACTIVE character
  const canPostRumor = isCharActive;

  const rawItems = newsData?.items || [];
  const items = rawItems.filter(i => i.type === 'news').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleDeleteNews = (id) => {
    if (window.confirm("Delete this news article?")) {
      deleteNewsMutation.mutate(id);
    }
  };

  const handleBroadcastNews = (id) => {
    if (window.confirm("Resend this article to Discord?")) {
      broadcastNewsMutation.mutate(id);
    }
  };

  const handleDeleteRumor = (id) => {
    if (window.confirm("Delete this rumor?")) {
      deleteRumorMutation.mutate(id);
    }
  };

  const handleBroadcastRumor = (id) => {
    if (window.confirm("Resend this rumor to Discord?")) {
      broadcastRumorMutation.mutate(id);
    }
  };

  const newsItems = items;
  const rumorItems = (rumorsData?.items || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Skeleton loading={loading} name="news-page">
      <div className={styles.page}>
        {!isRumorsPage && (
          <Helmet>
            <title>Official News : Athens Through Time | Erebus Portal</title>
            <meta
              name="description"
              content="In character news bulletins from the Athens Through Time Vampire: The Masquerade chronicle, Camarilla, Anarch, and city happenings reported by the Kindred press."
            />
            <link rel="canonical" href="https://portal.attlarp.gr/news" />
            <meta property="og:title" content="Official News : Athens Through Time" />
            <meta
              property="og:description"
              content="In character news bulletins from the Athens Through Time Vampire: The Masquerade chronicle."
            />
          </Helmet>
        )}
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>{isRumorsPage ? 'Rumors' : 'Official News'}</h1>
          <div className={styles.headerActions}>
            {!isRumorsPage && (isAdmin || (myThemes && (myThemes.all || myThemes.length > 0))) && (
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
            {isRumorsPage && isAdmin && (
              <button
                className={`${styles.createBtn} ${styles.printRumorsBtn}`}
                onClick={handlePrintAllRumors}
                title="Print all rumors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px', verticalAlign: 'text-bottom' }}>print</span>
                Print Rumors
              </button>
            )}
          </div>
          <div className={styles.disclaimer}>
            <strong>Disclaimer:</strong> This content is entirely fictional and created for the <em>Athens Through Time</em> Live Action Role-Playing (LARP) game.
            Any names, characters, businesses, places, events, or incidents are either the products of the author's imagination or used in a fictitious manner.
            Any resemblance to actual persons, living or dead, or actual events is purely coincidental.
          </div>
        </header>

        {/* <div style={{ margin: '1rem 0' }}>
          <GoogleAd format="horizontal" style={{ minHeight: '100px' }} />
        </div> */}

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
                    <Link key={item.id} to={`/news/${item.id}`} className={styles.masonryItem} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
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

                          <div className={styles.bodyHtml} dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.body) }} />
                        </div>
                        {(isAdmin || isCourt) && (
                          <>
                            {isAdmin && (
                              <button
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleBroadcastNews(item.id); }}
                                className={styles.deleteOverlay}
                                disabled={broadcastNewsMutation.isPending}
                                style={{ right: '40px', background: '#3b82f6' }}
                                title="Resend to Discord"
                              >
                                📢
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteNews(item.id); }} className={styles.deleteOverlay} disabled={deleteNewsMutation.isPending}>×</button>
                          </>
                        )}
                      </article>
                    </Link>
                  );
                })}
                {newsItems.length === 0 && <p className={styles.emptyText}>No news published yet.</p>}
              </div>
            </div>
          )}

          {/* Rumors Section - visible to any logged-in user */}
          {!!user && isRumorsPage && (
            <div className={styles.column}>
              <div className={styles.masonry}>
                {rumorItems.map(item => {
                  const mediaUrl = apiJoin(item.media_url);
                  return (
                    <div key={item.id} className={styles.masonryItem} onClick={() => setFullscreenRumor(item)}>
                      <article className={styles.rumorCard}>
                        <div className={styles.postItTape}></div>
                        <h2 className={styles.rumorTitle}>{item.title}</h2>
                        {item.media_url && (
                          <div className={styles.mediaFrame}>
                            {isVideoUrl(item.media_url) ? <video src={mediaUrl} controls /> : <img src={mediaUrl} alt="Proof" />}
                          </div>
                        )}
                        <div className={styles.rumorBodyText} dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.body) }} />
                        <div className={styles.rumorMeta}>HEARD ON: {new Date(item.created_at).toLocaleDateString()}</div>

                        {(isAdmin || isCourt) && (
                          <>
                            {isAdmin && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleBroadcastRumor(item.id); }}
                                className={styles.deleteOverlay}
                                disabled={broadcastRumorMutation.isPending}
                                style={{ right: '40px', background: '#3b82f6' }}
                                title="Resend to Discord"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px', lineHeight: 1 }}>campaign</span>
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePrintSingleRumor(item); }}
                              className={styles.deleteOverlay}
                              style={{ right: isAdmin ? '76px' : '40px', background: '#ca8a04', color: '#111827' }}
                              title="Print rumor"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', lineHeight: 1 }}>print</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteRumor(item.id); }} className={styles.deleteOverlay} disabled={deleteRumorMutation.isPending}>×</button>
                          </>
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
        <CreateNewsModal
          mode={modalMode}
          onClose={() => setModalMode(null)}
          onSuccess={() => {
            setModalMode(null);
            queryClient.invalidateQueries({ queryKey: [modalMode === 'rumor' ? 'rumors' : 'news'] });
          }}
          themes={myThemes}
        />
      )}{fullscreenArticle && (
        <FullscreenArticleModal item={fullscreenArticle} onClose={() => setFullscreenArticle(null)} />
      )}

      {fullscreenRumor && (
        <FullscreenRumorModal item={fullscreenRumor} onClose={() => setFullscreenRumor(null)} />
      )}

      {rumorPrintTarget && (
        <RumorPrintModal
          target={rumorPrintTarget}
          items={rumorItems}
          onClose={() => setRumorPrintTarget(null)}
        />
      )}
    </Skeleton>
  );
}

function RumorPrintModal({ target, items, onClose }) {
  if (!target) return null;
  const isAll = target === 'all';
  const printItems = isAll ? items : [target];

  return (
    <div className={styles.rumorPrintModal}>
      <div className={styles.rumorPrintToolbar}>
        <div className={styles.rumorPrintTitle}>
          <span className="material-symbols-outlined">description</span>
          {isAll ? 'Rumors Print Layout (All)' : 'Rumor Print Layout'}
        </div>
        <div className={styles.rumorPrintActions}>
          <button
            type="button"
            className={styles.btnActionPrint}
            onClick={() => window.print()}
            title="Print now"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
            Print Now
          </button>
          <button
            type="button"
            className={styles.btnActionClose}
            onClick={onClose}
            title="Close print view"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            Close
          </button>
        </div>
      </div>

      <div className={styles.rumorPrintSheet}>
        {isAll ? (
          <div className={styles.rumorPostItGrid}>
            {printItems.map((item) => (
              <PostItCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className={styles.singlePostItWrap}>
            <PostItCard item={target} isSingle />
          </div>
        )}
      </div>
    </div>
  );
}

function PostItCard({ item, isSingle }) {
  const mediaUrl = item.media_url ? apiJoin(item.media_url) : null;
  return (
    <div className={`${styles.postItNote} ${isSingle ? styles.singlePostItNote : ''}`}>
      <div className={styles.postItTape}></div>
      <div className={styles.postItHeader}>
        <h3 className={styles.postItTitleText}>{item.title}</h3>
      </div>
      {mediaUrl && (
        <div className={styles.postItMedia}>
          {isVideoUrl(item.media_url) ? (
            <video src={mediaUrl} controls />
          ) : (
            <img src={mediaUrl} alt="Proof" />
          )}
        </div>
      )}
      <div
        className={styles.postItBodyText}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.body) }}
      />
      <div className={styles.postItFooter}>
        <div className={styles.postItDateText}>
          HEARD ON: {new Date(item.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

function FullscreenRumorModal({ item, onClose }) {
  if (!item) return null;
  const mediaUrl = item.media_url ? apiJoin(item.media_url) : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fef08a',
          color: '#1c1917',
          padding: '2.5rem 2rem 2rem 2rem',
          borderRadius: '2px',
          border: '1px solid #facc15',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.postItTape}></div>
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '12px',
            right: '14px',
            background: 'transparent',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#78350f',
            lineHeight: 1,
          }}
        >
          &times;
        </button>
        <h2
          style={{
            fontSize: '1.6rem',
            marginBottom: '1rem',
            borderBottom: '2px dashed #ca8a04',
            paddingBottom: '0.5rem',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 700,
            color: '#78350f',
            lineHeight: 1.2,
          }}
        >
          {item.title}
        </h2>
        {mediaUrl && (
          <div style={{ marginBottom: '1rem', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(202, 138, 4, 0.3)' }}>
            {isVideoUrl(item.media_url) ? (
              <video src={mediaUrl} controls style={{ width: '100%', display: 'block' }} />
            ) : (
              <img src={mediaUrl} alt="Proof" style={{ width: '100%', display: 'block' }} />
            )}
          </div>
        )}
        <div
          style={{
            fontSize: '1.05rem',
            lineHeight: '1.6',
            color: '#292524',
            wordBreak: 'break-word',
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.body) }}
        />
        <div
          style={{
            marginTop: '2rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: '#854d0e',
            textAlign: 'right',
            borderTop: '1px solid rgba(202, 138, 4, 0.3)',
            paddingTop: '8px',
          }}
        >
          HEARD ON: {new Date(item.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}