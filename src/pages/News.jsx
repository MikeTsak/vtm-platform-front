// src/pages/News.jsx
import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../api'; // Uses axios instance from api.js
import { AuthCtx } from '../AuthContext';
import styles from '../styles/News.module.css';

/* --- URL RESOLUTION LOGIC (Adapted from Premonitions.jsx) ---
  This ensures image/video URLs are built correctly regardless of 
  whether the DB path includes '/api' or not.
*/
const RAW_BASE = process.env.REACT_APP_API_URL || (window.location.port === "3000" ? "http://localhost:3001/api" : "/api");
const API_BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, "") : "";

// Helper to join paths without duplicating '/api'
function apiJoin(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  
  // If the base ends in '/api' and the path starts with '/api', remove one to prevent double
  if (API_BASE.endsWith("/api") && path.startsWith("/api/")) {
    return `${API_BASE}${path.slice(4)}`;
  }
  // If base doesn't end in /api but path does, just join (or handle root)
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

// --- HELPER: Detect Video Content ---
const isVideoUrl = (url) => {
  if (!url) return false;
  return /\.(mp4|webm)|#video/i.test(url);
};

// --- DATA: Greek Name Components ---
const GREEK_FIRSTS = [
  "Giorgos", "Dimitris", "Konstantinos", "Yannis", "Nikos", "Panagiotis", "Vasilis", "Christos", "Thanasis", "Michalis",
  "Maria", "Eleni", "Katerina", "Georgia", "Sofia", "Dimitra", "Ioanna", "Konstantina", "Anastasia", "Vicky", "Alexandra"
];
const GREEK_LASTS = [
  "Papadopoulos", "Vlachos", "Oikonomou", "Nikolaidis", "Georgiou", "Makris", "Dimopoulos", "Papageorgiou", 
  "Papaioannou", "Kyriakou", "Karagiannis", "Stefanidis", "Anagnostou", "Vasiliou", "Panagiotopoulos", "Kalogeropoulos"
];

// --- DATA: News Outlets Configuration ---
const NEWS_OUTLETS = {
  'ERT': {
    name: 'ERT News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/ERT_logo_2020.svg/1024px-ERT_logo_2020.svg.png',
    color: '#0057b7', 
    bg: '#f4f4f4',
    url: 'www.ertnews.gr'
  },
  'SKAI': {
    name: 'SKAI.gr',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Skai_TV_logo.svg/1200px-Skai_TV_logo.svg.png',
    color: '#004d99', 
    bg: '#ffffff',
    url: 'www.skai.gr/news'
  },
  'ALPHA': {
    name: 'Alpha News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Alpha_TV_logo.svg/1142px-Alpha_TV_logo.svg.png',
    color: '#0093d0', 
    bg: '#ffffff',
    url: 'www.alphatv.gr/news'
  },
  'MEGA': {
    name: 'Mega Gegonota',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/8/83/MEGA_CHANNEL.png',
    color: '#222222', 
    bg: '#ffffff',
    url: 'www.megatv.com/gegonota'
  },
  'ANT1': {
    name: 'Ant1 News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/7/70/ANT1_logo.svg',
    color: '#f0ab00', 
    bg: '#ffffff',
    url: 'www.antenna.gr/news'
  },
  'RUMOR': {
    name: 'Rumor / Gossip',
    logo: null,
    color: '#fbbf24',
    bg: '#fffbeb',
    url: null
  }
};

// Simple HTML Toolbar
const EditorToolbar = ({ onCmd }) => (
  <div className={styles.toolbar}>
    <button type="button" onClick={() => onCmd('bold')}><b>B</b></button>
    <button type="button" onClick={() => onCmd('italic')}><i>I</i></button>
    <button type="button" onClick={() => onCmd('underline')}><u>U</u></button>
    <button type="button" onClick={() => onCmd('formatBlock', 'H3')}>H3</button>
    <button type="button" onClick={() => onCmd('justifyLeft')}>L</button>
    <button type="button" onClick={() => onCmd('justifyCenter')}>C</button>
  </div>
);

export default function News() {
  const { user } = useContext(AuthCtx);
  const [activeTab, setActiveTab] = useState('news'); 
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 
  const [showModal, setShowModal] = useState(false);

  // Permissions
  const isAdmin = user?.role === 'admin';
  const isCourt = user?.role === 'courtuser';
  const canPostNews = isAdmin;
  const canPostAnnounce = isAdmin || isCourt;

  const fetchNews = async () => {
    setLoading(true);
    setError(null); 
    try {
      // Uses api.js (axios) which handles the base URL automatically for the request
      const { data } = await api.get('/news');
      setItems(data.items || []);
    } catch (e) {
      console.error("News fetch error:", e);
      const msg = e.response?.data?.error || e.message || "Failed to load news feed.";
      setError(msg); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, []);

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this post?")) return;
    try {
        await api.delete(`/news/${id}`);
        fetchNews();
    } catch(e) { alert("Failed to delete"); }
  };

  const filteredItems = items.filter(i => i.type === activeTab);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>News & Abandonments</h1>
        
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'news' ? styles.active : ''}`}
            onClick={() => setActiveTab('news')}
          >
            Human World 🌍
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'announcement' ? styles.active : ''}`}
            onClick={() => setActiveTab('announcement')}
          >
            Kindred World 🩸
          </button>
        </div>

        <div className={styles.actions}>
          {activeTab === 'news' && canPostNews && (
            <button className={styles.createBtn} onClick={() => setShowModal(true)}>+ Write Article</button>
          )}
          {activeTab === 'announcement' && canPostAnnounce && (
            <button className={styles.createBtn} onClick={() => setShowModal(true)}>+ Make Announcement</button>
          )}
        </div>
      </header>

      <div className={styles.content}>
        {loading && <div className={styles.loading}>Listening to the wires...</div>}
        
        {!loading && error && (
          <div className={styles.empty} style={{ color: '#ff6b6b', borderColor: '#ff6b6b' }}>
             ⚠️ Signal Lost: {error}
          </div>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <div className={styles.empty}>Silence on this frequency.</div>
        )}

        <div className={styles.masonry}>
          {filteredItems.map(item => {
            // ✅ USE apiJoin for the src to fix the double-api issue
            const finalMediaUrl = apiJoin(item.media_url);
            const isVid = isVideoUrl(item.media_url);

            // --- RENDER LOGIC ---
            if (item.type === 'news') {
              const themeKey = item.theme && NEWS_OUTLETS[item.theme] ? item.theme : 'ERT';
              const theme = NEWS_OUTLETS[themeKey];

              // == RUMOR THEME (STICKY NOTE) ==
              if (themeKey === 'RUMOR') {
                return (
                  <div key={item.id} className={styles.masonryItem}>
                    <article className={styles.rumorCard}>
                      <h2 className={styles.rumorTitle}>{item.title}</h2>
                      {item.media_url && (
                        <div className={styles.newsMediaFrame} style={{borderRadius:0, border:'2px solid #333'}}>
                           {isVid ? (
                             <video src={finalMediaUrl} controls className={styles.media} style={{filter:'sepia(0.8)'}} />
                           ) : (
                             <img src={finalMediaUrl} alt="Proof" className={styles.media} style={{filter:'sepia(0.8)'}} />
                           )}
                        </div>
                      )}
                      <div 
                        className={styles.rumorBody}
                        dangerouslySetInnerHTML={{ __html: item.body }} 
                      />
                      <div className={styles.rumorMeta}>
                        — Heard on {new Date(item.created_at).toLocaleDateString()}
                      </div>
                      {isAdmin && <button onClick={() => handleDelete(item.id)} className={styles.deleteBtnOverlay}>×</button>}
                    </article>
                  </div>
                );
              }

              // == STANDARD NEWS (FAKE BROWSER) ==
              return (
                <div key={item.id} className={styles.masonryItem}>
                  <article className={`${styles.browserCard} ${styles['theme'+themeKey]}`}>
                    <div className={styles.browserBar}>
                      <div className={styles.browserDots}>
                        <span className={styles.dot} style={{background:'#ff5f56'}}/>
                        <span className={styles.dot} style={{background:'#ffbd2e'}}/>
                        <span className={styles.dot} style={{background:'#27c93f'}}/>
                      </div>
                      <div className={styles.urlBar}>
                        🔒 https://{theme.url}/article/{item.id}
                      </div>
                    </div>

                    <div className={styles.newsHeader} style={{ borderBottom: `3px solid ${theme.color}` }}>
                      <img src={theme.logo} alt={theme.name} className={styles.newsLogo} />
                      <span className={styles.liveBadge}>LIVE</span>
                    </div>

                    <div className={styles.newsBody}>
                      <h2 className={styles.newsTitle}>{item.title}</h2>
                      {item.subtitle && <h4 className={styles.newsSubtitle}>{item.subtitle}</h4>}
                      
                      <div className={styles.newsMeta}>
                         By <span className={styles.authorName}>{item.journalist_name || 'Staff'}</span> | {new Date(item.created_at).toLocaleDateString()}
                      </div>

                      {item.media_url && (
                        <div className={styles.newsMediaFrame}>
                          {isVid ? (
                            <video src={finalMediaUrl} controls className={styles.media} />
                          ) : (
                            <img src={finalMediaUrl} alt="Article" className={styles.media} />
                          )}
                        </div>
                      )}

                      <div 
                        className={styles.newsContentHTML}
                        dangerouslySetInnerHTML={{ __html: item.body }} 
                      />
                    </div>
                    
                    {isAdmin && <button onClick={() => handleDelete(item.id)} className={styles.deleteBtnOverlay}>×</button>}
                  </article>
                </div>
              );
            } else {
              // === ANNOUNCEMENT ===
              return (
                <div key={item.id} className={styles.masonryItem}>
                  <article className={`${styles.card} ${styles.announcement}`}>
                     {item.media_url && (
                      <div className={styles.mediaFrame}>
                        {isVid ? (
                          <video src={finalMediaUrl} controls className={styles.media} />
                        ) : (
                          <img src={finalMediaUrl} alt="Announcement" className={styles.media} />
                        )}
                      </div>
                    )}
                    <div className={styles.cardBody}>
                      <div className={styles.meta}>
                        <span className={styles.authorBadge}>📢 {item.author_real_name}</span>
                        <span className={styles.date}>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      <h2 className={styles.title}>{item.title}</h2>
                      <div className={styles.bodyContent} dangerouslySetInnerHTML={{ __html: item.body }} />
                      {isAdmin && <button onClick={() => handleDelete(item.id)} className={styles.deleteBtn}>Delete</button>}
                    </div>
                  </article>
                </div>
              );
            }
          })}
        </div>
      </div>

      {showModal && (
        <CreateModal 
          type={activeTab} 
          onClose={() => setShowModal(false)} 
          onSuccess={() => { setShowModal(false); fetchNews(); }}
        />
      )}
    </div>
  );
}

function CreateModal({ type, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '', subtitle: '', body: '', theme: 'ERT', journalist_name: ''
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); 
  const contentRef = useRef(null);

  const executeCmd = (cmd, val) => {
    document.execCommand(cmd, false, val);
    contentRef.current.focus();
  };

  const generateRandomName = () => {
    const first = GREEK_FIRSTS[Math.floor(Math.random() * GREEK_FIRSTS.length)];
    const last = GREEK_LASTS[Math.floor(Math.random() * GREEK_LASTS.length)];
    setFormData(prev => ({ ...prev, journalist_name: `${first} ${last}` }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadProgress(0);

    try {
      let mediaUrl = null;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        
        const upRes = await api.post('/news/upload', fd, {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        });
        mediaUrl = upRes.data.url;

        // Fix for Video playback: append hash to force detection
        if (file.type.startsWith('video/')) {
          mediaUrl += '#video.mp4';
        }
      }

      const payload = {
        type,
        title: formData.title,
        body: contentRef.current.innerHTML,
        media_url: mediaUrl,
        subtitle: type === 'news' ? formData.subtitle : null,
        theme: type === 'news' ? formData.theme : null,
        journalist_name: type === 'news' ? formData.journalist_name : null,
      };

      await api.post('/news', payload);
      onSuccess();
    } catch (err) {
      alert('Failed to post: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{type === 'news' ? 'Submit News Article' : 'Post Announcement'}</h2>
          <button onClick={onClose} className={styles.closeBtn}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <label>Title <span className={styles.req}>*</span></label>
          <input 
            required 
            value={formData.title} 
            onChange={e => setFormData({...formData, title: e.target.value})}
            placeholder={type === 'news' ? "Breaking News Headline..." : "Announcement Subject..."}
          />

          {type === 'news' && (
            <div className={styles.row}>
                <div className={styles.col}>
                    <label>Subtitle</label>
                    <input 
                        value={formData.subtitle} 
                        onChange={e => setFormData({...formData, subtitle: e.target.value})}
                        placeholder="Catchy sub-header..."
                    />
                </div>
                <div className={styles.col}>
                    <label>News Outlet / Style</label>
                    <select 
                      value={formData.theme} 
                      onChange={e => setFormData({...formData, theme: e.target.value})}
                    >
                      {Object.keys(NEWS_OUTLETS).map(key => (
                        <option key={key} value={key}>{NEWS_OUTLETS[key].name}</option>
                      ))}
                    </select>
                </div>
            </div>
          )}

          <label>Body <span className={styles.req}>*</span></label>
          <div className={styles.editorContainer}>
            <EditorToolbar onCmd={executeCmd} />
            <div 
              className={styles.editable}
              contentEditable
              ref={contentRef}
            />
          </div>

          {type === 'news' && formData.theme !== 'RUMOR' && (
            <>
              <label>Journalist Name</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  value={formData.journalist_name} 
                  onChange={e => setFormData({...formData, journalist_name: e.target.value})}
                  placeholder="e.g. Lois Lane"
                  style={{ flexGrow: 1 }}
                />
                <button 
                  type="button" 
                  onClick={generateRandomName} 
                  className={styles.btnGhost} 
                  title="Generate Random Greek Name"
                >
                  🎲
                </button>
              </div>
            </>
          )}

          <label>Attach Media (Image/Video)</label>
          <input 
            type="file" 
            accept="image/*,video/*"
            onChange={e => setFile(e.target.files[0])}
          />

          {uploading && file && (
            <div className={styles.progressContainer}>
              <div 
                className={styles.progressBar} 
                style={{ width: `${uploadProgress}%` }}
              />
              <span className={styles.progressText}>{uploadProgress}%</span>
            </div>
          )}

          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.btnGhost}>Cancel</button>
            <button type="submit" disabled={uploading} className={styles.btnPrimary}>
              {uploading ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}