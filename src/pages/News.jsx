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
  'ERT': { name: 'ERT News', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/ERT_logo_2020.svg/960px-ERT_logo_2020.svg.png', color: '#0057b7', url: 'www.ertnews.gr' },
  'SKAI': { name: 'SKAI.gr', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Skai_TV_logo.svg/1200px-Skai_TV_logo.svg.png', color: '#004d99', url: 'www.skai.gr' },
  'ALPHA': { name: 'Alpha News', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Alpha_TV_logo.svg', color: '#0093d0', url: 'www.alphatv.gr' },
  'MEGA': { name: 'Mega Gegonota', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/83/MEGA_CHANNEL.png', color: '#222222', url: 'www.megatv.com' },
  'KATHIMERINI': { name: 'Kathimerini', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNk0h-loKAwB5Ay_ohV5G8ItU88h7PY_RkPw&s', color: '#999999', url: 'www.kathimerini.gr' },
  'GOSSIP': { name: 'Gossip-tv', logo: 'https://cdn.gosmd.gr/img/1200/630/90/2016/05/19/1952016-14126.jpg?t=xRh4M6KRWfNTqee7gQzcuw', color: '#e6007e', url: 'www.gossip-tv.gr' },
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
  <div className={styles.toolbar} style={{ display: 'flex', gap: '5px', padding: '8px', backgroundColor: '#374151', borderBottom: '1px solid #4b5563', borderTopLeftRadius: '6px', borderTopRightRadius: '6px' }}>
    <button type="button" onClick={() => onCmd('bold')} style={{ padding: '4px 10px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #4b5563', background: '#1f2937', color: '#fff' }}><b>B</b></button>
    <button type="button" onClick={() => onCmd('italic')} style={{ padding: '4px 10px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #4b5563', background: '#1f2937', color: '#fff' }}><i>I</i></button>
    <button type="button" onClick={() => onCmd('underline')} style={{ padding: '4px 10px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #4b5563', background: '#1f2937', color: '#fff' }}><u>U</u></button>
  </div>
);

export default function News() {
  const { user } = useContext(AuthCtx);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const isAdmin = user?.role === 'admin';

  const fetchNews = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/news');
      // Filter ONLY human news
      let fetchedNews = (data.items || []).filter(i => i.type === 'news');
      
      // Sort: Most recent first (Newest to Oldest)
      fetchedNews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
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
                    <img src={theme.logo} alt={theme.name} className={styles.logo} style={{ maxHeight: '40px', objectFit: 'contain' }} />
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

// 3. Upgraded Admin Article Form (Dark Theme)
function CreateNewsModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({ title: '', subtitle: '', body: '', theme: 'ERT', journalist_name: '' });
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
    <div className={styles.modalOverlay} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className={styles.modal} style={{ maxWidth: '800px', width: '100%', backgroundColor: '#1f2937', borderRadius: '8px', color: '#f3f4f6', boxShadow: '0 10px 25px rgba(0,0,0,0.8)' }}>
        
        <div className={styles.modalHeader} style={{ padding: '20px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111827' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f9fafb' }}>Submit News Article</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
           
           {/* Headline */}
           <div>
             <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold', color: '#d1d5db' }}>Headline *</label>
             <input placeholder="Attention-grabbing title..." required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} style={{ width: '100%', padding: '12px', fontSize: '1.1rem', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#111827', color: '#fff' }} />
           </div>
           
           {/* Row: Subtitle & Theme */}
           <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
             <div>
               <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold', color: '#d1d5db' }}>Subtitle (Optional)</label>
               <input placeholder="Secondary context..." value={formData.subtitle} onChange={e=>setFormData({...formData, subtitle: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#111827', color: '#fff' }} />
             </div>
             <div>
               <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold', color: '#d1d5db' }}>Outlet / Theme</label>
               <select value={formData.theme} onChange={e=>setFormData({...formData, theme: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#111827', color: '#fff' }}>
                 {Object.keys(NEWS_OUTLETS).map(k => <option key={k} value={k}>{NEWS_OUTLETS[k].name}</option>)}
               </select>
             </div>
           </div>

           {/* Row: Journalist Name */}
           <div>
             <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold', color: '#d1d5db' }}>Journalist Name</label>
             <div style={{ display: 'flex', gap: '10px' }}>
                <input placeholder="e.g. Giannis Petrou" value={formData.journalist_name} onChange={e=>setFormData({...formData, journalist_name: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#111827', color: '#fff' }} />
                <button type="button" onClick={handleRandomizeName} style={{ padding: '10px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>
                  🎲 Randomize
                </button>
             </div>
           </div>

           {/* WYSIWYG Editor */}
           <div>
             <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold', color: '#d1d5db' }}>Article Body *</label>
             <div style={{ border: '1px solid #4b5563', borderRadius: '6px', display: 'flex', flexDirection: 'column' }}>
               <EditorToolbar onCmd={(c,v) => document.execCommand(c,false,v)} />
               <div className={styles.editable} contentEditable ref={contentRef} style={{ minHeight: '180px', padding: '12px', outline: 'none', backgroundColor: '#111827', color: '#fff', borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px', overflowY: 'auto' }} />
             </div>
           </div>

           {/* Media Upload */}
           <div style={{ border: '2px dashed #4b5563', padding: '16px', borderRadius: '6px', backgroundColor: '#111827', textAlign: 'center' }}>
             <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#d1d5db', cursor: 'pointer' }}>
               📷 Attach Image or Video (Optional)
               <input type="file" onChange={e => setFile(e.target.files[0])} style={{ display: 'block', margin: '10px auto 0', color: '#9ca3af' }} />
             </label>
           </div>

           {/* Footer / Submit */}
           <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', paddingTop: '16px', borderTop: '1px solid #374151' }}>
             <button type="button" onClick={onClose} disabled={uploading} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', cursor: 'pointer', fontWeight: 'bold', color: '#f3f4f6' }}>Cancel</button>
             <button type="submit" disabled={uploading} style={{ padding: '10px 24px', borderRadius: '6px', border: 'none', backgroundColor: uploading ? '#9ca3af' : '#10b981', color: '#fff', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: '0.2s' }}>
               {uploading ? 'Publishing...' : '📡 Publish'}
             </button>
           </div>
           
        </form>
      </div>
    </div>
  );
}