// src/pages/News.jsx
import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../api';
import { AuthCtx } from '../AuthContext';
import styles from '../styles/News.module.css';
import Loading from '../components/Loading';

/* --- CONFIGURATION --- */
const RAW_BASE = process.env.REACT_APP_API_URL || (window.location.port === "3000" ? "http://localhost:3001/api" : "/api");
const API_BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, "") : "";

function apiJoin(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (API_BASE.endsWith("/api") && path.startsWith("/api/")) return `${API_BASE}${path.slice(4)}`;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

const NEWS_OUTLETS = {
  'ERT': { name: 'ERT News', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/ERT_logo_2020.svg/960px-ERT_logo_2020.svg.png', color: '#0057b7', url: 'www.ertnews.gr' },
  'SKAI': { name: 'SKAI.gr', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Skai_TV_logo.svg/1200px-Skai_TV_logo.svg.png', color: '#004d99', url: 'www.skai.gr' },
  'ALPHA': { name: 'Alpha News', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Alpha_TV_logo.svg', color: '#0093d0', url: 'www.alphatv.gr' },
  'MEGA': { name: 'Mega Gegonota', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/83/MEGA_CHANNEL.png', color: '#222222', url: 'www.megatv.com' },
  'KATHIMERINI': { name: 'Kathimerini', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNk0h-loKAwB5Ay_ohV5G8ItU88h7PY_RkPw&s', color: '#999999', url: 'www.kathimerini.gr' },
  'GOSSIP': { name: 'Gossip-tv', logo: 'https://cdn.gosmd.gr/img/1200/630/90/2016/05/19/1952016-14126.jpg?t=xRh4M6KRWfNTqee7gQzcuw', color: '#e6007e', url: 'www.gossip-tv.gr' },
  'OPENTV': { name: 'Open TV', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/55/OpenLogo.svg', color: '#fa8301', url: 'www.tvopen.gr' },
  'RUMOR': { name: 'Rumor / Gossip', color: '#fbbf24', url: null }
};

const GREEK_REPORTERS = [
  "Giorgos Papadopoulos", "Maria Nikolaou", "Dimitris Georgiou",
  "Eleni Vasileiou", "Kostas Oikonomou", "Katerina Dimitriou",
  "Nikos Karagiannis", "Anna Makri", "Giannis Petrou", "Sofia Antoniou",
  "Thanasis Konstantinou", "Vasilis Alexiou", "Maria Christodoulou",
  "Andreas Makris", "Ioanna Louka", "Stavros Lymperis", "Christina Panagiotou"
];

const isVideoUrl = (url) => /\.(mp4|webm)|#video/i.test(url);

const EditorToolbar = ({ onCmd }) => (
  <div className={styles.editorToolbar}>
    <button type="button" onClick={() => onCmd('bold')}><b>B</b></button>
    <button type="button" onClick={() => onCmd('italic')}><i>I</i></button>
    <button type="button" onClick={() => onCmd('underline')}><u>U</u></button>
  </div>
);

export default function News() {
  const { user } = useContext(AuthCtx);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalMode, setModalMode] = useState(null); 
  const [fullscreenArticle, setFullscreenArticle] = useState(null);
  const [viewMode, setViewMode] = useState('split');
  
  const isAdmin = user?.role === 'admin';
  const isCourt = user?.role === 'courtuser';

  // --- Fetch active character to check rumor permissions ---
  const [myChar, setMyChar] = useState(null);
  
  useEffect(() => {
    if (isAdmin || isCourt) return;
    api.get('/characters/me').then(r => setMyChar(r.data.character)).catch(()=>{});
  }, [isAdmin, isCourt]);

  // Can post rumor if Admin, Court, or they successfully fetched their character
  const canPostRumor = isAdmin || isCourt || !!myChar; 

  const fetchNews = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/news');
      let fetchedNews = (data.items || []).filter(i => i.type === 'news');
      fetchedNews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(fetchedNews);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNews(); }, []);

  const handleDelete = async (id) => {
    if(window.confirm("Delete this article?")) {
      await api.delete(`/news/${id}`);
      fetchNews();
    }
  };

  const newsItems = items.filter(item => item.theme !== 'RUMOR');
  const rumorItems = items.filter(item => item.theme === 'RUMOR');

  return (
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

      <div>
        {loading && <Loading />}
        
        {/* View Mode Menus / Tabs */}
        <div className={styles.viewModeTabs}>
          <button onClick={() => setViewMode('split')} className={`${styles.viewTab} ${viewMode === 'split' ? styles.viewTabActive : ''}`}>Split View</button>
          <button onClick={() => setViewMode('news')} className={`${styles.viewTab} ${viewMode === 'news' ? styles.viewTabActive : ''}`}>News Only</button>
          <button onClick={() => setViewMode('rumors')} className={`${styles.viewTab} ${styles.rumorTab} ${viewMode === 'rumors' ? styles.rumorTabActive : ''}`}>Rumors Only</button>
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
                    <div key={item.id} className={styles.masonryItem} onClick={() => setFullscreenArticle(item)}>
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
                          
                          <div className={styles.bodyHtml} dangerouslySetInnerHTML={{ __html: item.body }} />
                        </div>
                        {isAdmin && (
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className={styles.deleteOverlay}>×</button>
                        )}
                      </article>
                    </div>
                  );
                })}
                {newsItems.length === 0 && <p className={styles.emptyText}>No news published yet.</p>}
              </div>
            </div>
          )}

          {/* Rumors Section */}
          {(viewMode === 'split' || viewMode === 'rumors') && (
            <div className={styles.column}>
              {viewMode === 'split' && <h2 className={styles.sectionHeadingRumor}>🤫 Whispers & Rumors</h2>}
              <div className={styles.masonry}>
                {rumorItems.map(item => {
                  const mediaUrl = apiJoin(item.media_url);
                  return (
                    <div key={item.id} className={styles.masonryItem} onClick={() => setFullscreenArticle(item)}>
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
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className={styles.deleteOverlay}>×</button>
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
        <CreateNewsModal mode={modalMode} onClose={() => setModalMode(null)} onSuccess={() => { setModalMode(null); fetchNews(); }} />
      )}

      {fullscreenArticle && (
        <FullscreenArticleModal item={fullscreenArticle} onClose={() => setFullscreenArticle(null)} />
      )}
    </div>
  );
}

// Fullscreen Reader Modal Component
function FullscreenArticleModal({ item, onClose }) {
  const isRumor = item.theme === 'RUMOR';
  const theme = NEWS_OUTLETS[item.theme] || NEWS_OUTLETS['ERT'];
  const mediaUrl = apiJoin(item.media_url);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`${styles.fullscreenModal} ${isRumor ? styles.fullscreenModalRumor : ''}`} style={{ '--theme-color': theme.color }}>
        <div className={styles.modalHeaderControl}>
          <button onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContentPadding}>
          {isRumor ? (
            <div>
              <span className={styles.rumorBadge}>🤫 WHISPER / RUMOR</span>
              <h1 className={styles.fsTitle}>{item.title}</h1>
              
              {item.media_url && (
                <div className={styles.fsMediaContainer}>
                  {isVideoUrl(item.media_url) ? <video src={mediaUrl} controls /> : <img src={mediaUrl} alt="Proof" />}
                </div>
              )}
              
              <div className={styles.fsBody} dangerouslySetInnerHTML={{ __html: item.body }} />
              <div className={styles.fsRumorFooter}>— Heard on {new Date(item.created_at).toLocaleDateString()}</div>
            </div>
          ) : (
            <div>
              <div className={styles.fsOutletHeader}>
                <img src={theme.logo} alt={theme.name} />
                <span style={{ backgroundColor: theme.color }}>LIVE</span>
              </div>

              <h1 className={styles.fsTitle}>{item.title}</h1>
              {item.subtitle && <h3 className={styles.fsSubtitle} style={{ color: theme.color }}>{item.subtitle}</h3>}
              
              <div className={styles.fsMeta}>
                <span style={{ color: theme.color, fontWeight: 'bold' }}>By {item.journalist_name || 'Staff Writer'}</span>
                <span>•</span>
                <span>Published on {new Date(item.created_at).toLocaleDateString()}</span>
              </div>

              {item.media_url && (
                <div className={styles.fsMediaContainer} style={{ boxShadow: `0 10px 30px ${theme.color}15` }}>
                  {isVideoUrl(item.media_url) ? <video src={mediaUrl} controls /> : <img src={mediaUrl} alt="News Media" />}
                </div>
              )}

              <div className={styles.fsBody} dangerouslySetInnerHTML={{ __html: item.body }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Admin / Player Article Form
function CreateNewsModal({ mode, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ title: '', subtitle: '', body: '', theme: mode === 'rumor' ? 'RUMOR' : 'ERT', journalist_name: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const contentRef = useRef(null);

  const handleRandomizeName = () => {
    const randomName = GREEK_REPORTERS[Math.floor(Math.random() * GREEK_REPORTERS.length)];
    setFormData({ ...formData, journalist_name: randomName });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let mediaUrl = null;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post('/news/upload', fd);
        mediaUrl = res.data.url + (file.type.startsWith('video') ? '#video.mp4' : '');
      }
      await api.post('/news', {
        type: 'news',
        title: formData.title,
        subtitle: mode === 'rumor' ? '' : formData.subtitle,
        body: contentRef.current.innerHTML,
        theme: formData.theme,
        journalist_name: formData.journalist_name,
        media_url: mediaUrl
      });
      onSuccess();
    } catch (e) { alert("Error posting. Ensure you have the correct permissions."); } 
    finally { setUploading(false); }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.createModal}>
        
        <div className={styles.createModalHeader}>
          <h2>{mode === 'rumor' ? 'Post a Rumor' : 'Submit News Article'}</h2>
          <button onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.formContainer}>
           
           <div className={styles.formGroup}>
             <label>Headline *</label>
             <input placeholder={mode === 'rumor' ? "What's the whisper on the street?" : "Attention-grabbing title..."} required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className={styles.inputField} />
           </div>
           
           <div className={styles.formGrid}>
             {mode !== 'rumor' && (
               <div className={styles.formGroup}>
                 <label>Subtitle (Optional)</label>
                 <input placeholder="Secondary context..." value={formData.subtitle} onChange={e=>setFormData({...formData, subtitle: e.target.value})} className={styles.inputField} />
               </div>
             )}
             <div className={styles.formGroup}>
               <label>Outlet / Theme</label>
               <select 
                 value={formData.theme} 
                 onChange={e=>setFormData({...formData, theme: e.target.value})} 
                 disabled={mode === 'rumor'}
                 className={`${styles.inputField} ${mode === 'rumor' ? styles.disabledInput : ''}`}>
                 {Object.keys(NEWS_OUTLETS).map(k => {
                   if (mode === 'rumor' && k !== 'RUMOR') return null;
                   return <option key={k} value={k}>{NEWS_OUTLETS[k].name}</option>;
                 })}
               </select>
             </div>
           </div>

           {mode !== 'rumor' && (
             <div className={styles.formGroup}>
               <label>Journalist Name</label>
               <div className={styles.randomizerGroup}>
                  <input placeholder="e.g. Giannis Petrou" value={formData.journalist_name} onChange={e=>setFormData({...formData, journalist_name: e.target.value})} className={styles.inputField} />
                  <button type="button" onClick={handleRandomizeName} className={styles.randomizeBtn}>🎲 Randomize</button>
               </div>
             </div>
           )}

           <div className={styles.formGroup}>
             <label>{mode === 'rumor' ? 'Gossip Details *' : 'Article Body *'}</label>
             <div className={styles.editorWrap}>
               <EditorToolbar onCmd={(c,v) => document.execCommand(c,false,v)} />
               <div className={styles.editable} contentEditable ref={contentRef} />
             </div>
           </div>

           <div className={styles.uploadBox}>
             <label>
               📷 Attach Image or Video (Optional)
               <input type="file" onChange={e => setFile(e.target.files[0])} />
             </label>
           </div>

           <div className={styles.modalActions}>
             <button type="button" onClick={onClose} disabled={uploading} className={styles.btnCancel}>Cancel</button>
             <button type="submit" disabled={uploading} className={`${styles.btnSubmit} ${mode === 'rumor' ? styles.btnSubmitRumor : ''}`}>
               {uploading ? 'Publishing...' : 'Publish'}
             </button>
           </div>
        </form>

      </div>
    </div>
  );
}