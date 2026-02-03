import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../api';
import { AuthCtx } from '../AuthContext';
import styles from '../styles/News.module.css';

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
  'ERT': { name: 'ERT News', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/ERT_logo_2020.svg/1024px-ERT_logo_2020.svg.png', color: '#0057b7', url: 'www.ertnews.gr' },
  'SKAI': { name: 'SKAI.gr', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Skai_TV_logo.svg/1200px-Skai_TV_logo.svg.png', color: '#004d99', url: 'www.skai.gr' },
  'ALPHA': { name: 'Alpha News', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Alpha_TV_logo.svg/1142px-Alpha_TV_logo.svg.png', color: '#0093d0', url: 'www.alphatv.gr' },
  'MEGA': { name: 'Mega Gegonota', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/83/MEGA_CHANNEL.png', color: '#222222', url: 'www.megatv.com' },
  'RUMOR': { name: 'Rumor / Gossip', color: '#fbbf24', url: null }
};

const isVideoUrl = (url) => /\.(mp4|webm)|#video/i.test(url);

const EditorToolbar = ({ onCmd }) => (
  <div className={styles.toolbar}>
    <button type="button" onClick={() => onCmd('bold')}><b>B</b></button>
    <button type="button" onClick={() => onCmd('italic')}><i>I</i></button>
    <button type="button" onClick={() => onCmd('underline')}><u>U</u></button>
  </div>
);

export default function News() {
  const { user } = useContext(AuthCtx);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const isAdmin = user?.role === 'admin';

  const fetchNews = async (signal) => {
    setLoading(true);
    try {
      const { data } = await api.get('/news', { signal });
      // Filter ONLY human news
      setItems((data.items || []).filter(i => i.type === 'news'));
    } catch (e) { 
      if (e.name === 'CanceledError' || e.name === 'AbortError') return;
      console.error(e); 
    } 
    finally { setLoading(false); }
  };

  useEffect(() => { 
    const abortController = new AbortController();
    fetchNews(abortController.signal);
    return () => abortController.abort();
  }, []);

  const handleDelete = async (id) => {
    if(window.confirm("Delete this article?")) {
      await api.delete(`/news/${id}`);
      fetchNews();
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Human World News</h1>
        <div className={styles.actions}>
          {isAdmin && <button className={styles.createBtn} onClick={() => setShowModal(true)}>+ Write Article</button>}
        </div>
      </header>

      <div className={styles.content}>
        {loading && <div className={styles.loading}>Scanning frequencies...</div>}
        <div className={styles.masonry}>
          {items.map(item => {
            const theme = NEWS_OUTLETS[item.theme] || NEWS_OUTLETS['ERT'];
            const mediaUrl = apiJoin(item.media_url);

            if (item.theme === 'RUMOR') {
              return (
                <div key={item.id} className={styles.masonryItem}>
                  <article className={styles.rumorCard}>
                    <h2 className={styles.rumorTitle}>{item.title}</h2>
                    {item.media_url && (
                      <div className={styles.mediaFrame}>
                        {isVideoUrl(item.media_url) ? <video src={mediaUrl} controls /> : <img src={mediaUrl} alt="Proof" />}
                      </div>
                    )}
                    <div className={styles.rumorBody} dangerouslySetInnerHTML={{ __html: item.body }} />
                    <div className={styles.meta}>— Heard on {new Date(item.created_at).toLocaleDateString()}</div>
                    {isAdmin && <button onClick={() => handleDelete(item.id)} className={styles.deleteOverlay}>×</button>}
                  </article>
                </div>
              );
            }

            return (
              <div key={item.id} className={styles.masonryItem}>
                <article className={`${styles.browserCard} ${styles['theme'+item.theme]}`}>
                  <div className={styles.browserBar}>
                    <div className={styles.dots}><span/><span/><span/></div>
                    <div className={styles.url}>🔒 https://{theme.url}/article/{item.id}</div>
                  </div>
                  <div className={styles.newsHeader} style={{borderBottomColor: theme.color}}>
                    <img src={theme.logo} alt={theme.name} className={styles.logo} />
                    <span className={styles.live}>LIVE</span>
                  </div>
                  <div className={styles.newsBody}>
                    <h2>{item.title}</h2>
                    {item.subtitle && <h4>{item.subtitle}</h4>}
                    <div className={styles.meta}>By {item.journalist_name || 'Staff'} | {new Date(item.created_at).toLocaleDateString()}</div>
                    {item.media_url && (
                      <div className={styles.mediaFrame}>
                         {isVideoUrl(item.media_url) ? <video src={mediaUrl} controls /> : <img src={mediaUrl} alt="News" />}
                      </div>
                    )}
                    <div className={styles.bodyHtml} dangerouslySetInnerHTML={{ __html: item.body }} />
                  </div>
                  {isAdmin && <button onClick={() => handleDelete(item.id)} className={styles.deleteOverlay}>×</button>}
                </article>
              </div>
            );
          })}
        </div>
      </div>
      
      {showModal && <CreateNewsModal onClose={() => setShowModal(false)} onSuccess={() => {setShowModal(false); fetchNews();}} />}
    </div>
  );
}

// Simplified Modal strictly for News/Rumors
function CreateNewsModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({ title: '', subtitle: '', body: '', theme: 'ERT', journalist_name: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const contentRef = useRef(null);

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
        subtitle: formData.subtitle,
        body: contentRef.current.innerHTML,
        theme: formData.theme,
        journalist_name: formData.journalist_name,
        media_url: mediaUrl
      });
      onSuccess();
    } catch (e) { alert("Error posting"); } 
    finally { setUploading(false); }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}><h2>Submit News</h2><button onClick={onClose} className={styles.closeBtn}>×</button></div>
        <form onSubmit={handleSubmit} className={styles.form}>
           <input placeholder="Title" required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} />
           <div className={styles.row}>
             <input placeholder="Subtitle" value={formData.subtitle} onChange={e=>setFormData({...formData, subtitle: e.target.value})} />
             <select value={formData.theme} onChange={e=>setFormData({...formData, theme: e.target.value})}>
               {Object.keys(NEWS_OUTLETS).map(k => <option key={k} value={k}>{NEWS_OUTLETS[k].name}</option>)}
             </select>
           </div>
           <div className={styles.editorContainer}>
             <EditorToolbar onCmd={(c,v) => document.execCommand(c,false,v)} />
             <div className={styles.editable} contentEditable ref={contentRef} />
           </div>
           <input type="file" onChange={e => setFile(e.target.files[0])} />
           <div className={styles.footer}>
             <button type="submit" disabled={uploading} className={styles.btnPrimary}>{uploading ? 'Publishing...' : 'Publish'}</button>
           </div>
        </form>
      </div>
    </div>
  );
}