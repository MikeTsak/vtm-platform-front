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
  <div style={{ display: 'flex', gap: '5px', padding: '8px', backgroundColor: '#374151', borderBottom: '1px solid #4b5563', borderTopLeftRadius: '6px', borderTopRightRadius: '6px' }}>
    <button type="button" onClick={() => onCmd('bold')} style={{ padding: '4px 10px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #4b5563', background: '#1f2937', color: '#fff' }}><b>B</b></button>
    <button type="button" onClick={() => onCmd('italic')} style={{ padding: '4px 10px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #4b5563', background: '#1f2937', color: '#fff' }}><i>I</i></button>
    <button type="button" onClick={() => onCmd('underline')} style={{ padding: '4px 10px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #4b5563', background: '#1f2937', color: '#fff' }}><u>U</u></button>
  </div>
);

export default function News() {
  const { user } = useContext(AuthCtx);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalMode, setModalMode] = useState(null); 
  const [viewMode, setViewMode] = useState('split');
  
  const isAdmin = user?.role === 'admin';
  const isCourt = user?.role === 'courtuser';
  const canPostRumor = isAdmin || isCourt;

  const fetchNews = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/news');
      let fetchedNews = (data.items || []).filter(i => i.type === 'news');
      
      // Sort: Strict chronological order (Most recent first)
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

  // Separate data into Categories
  const newsItems = items.filter(item => item.theme !== 'RUMOR');
  const rumorItems = items.filter(item => item.theme === 'RUMOR');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Human World News</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isAdmin && (
            <button className={styles.createBtn} onClick={() => setModalMode('news')}>
              + Write Article
            </button>
          )}
          {canPostRumor && (
            <button 
              className={styles.createBtn} 
              onClick={() => setModalMode('rumor')}
              style={{ backgroundColor: '#fbbf24', color: '#000', border: 'none' }}
            >
              + Post Rumor
            </button>
          )}
        </div>
      </header>

      <div>
        {loading && <Loading />}
        
        {/* View Mode Menus / Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #374151' }}>
          <button 
            onClick={() => setViewMode('split')} 
            style={{ padding: '8px 16px', fontWeight: 'bold', borderRadius: '6px', border: 'none', cursor: 'pointer', transition: '0.2s', background: viewMode === 'split' ? '#3b82f6' : '#1f2937', color: viewMode === 'split' ? '#fff' : '#9ca3af' }}>
            Split View
          </button>
          <button 
            onClick={() => setViewMode('news')} 
            style={{ padding: '8px 16px', fontWeight: 'bold', borderRadius: '6px', border: 'none', cursor: 'pointer', transition: '0.2s', background: viewMode === 'news' ? '#3b82f6' : '#1f2937', color: viewMode === 'news' ? '#fff' : '#9ca3af' }}>
            News Only
          </button>
          <button 
            onClick={() => setViewMode('rumors')} 
            style={{ padding: '8px 16px', fontWeight: 'bold', borderRadius: '6px', border: 'none', cursor: 'pointer', transition: '0.2s', background: viewMode === 'rumors' ? '#fbbf24' : '#1f2937', color: viewMode === 'rumors' ? '#000' : '#9ca3af' }}>
            Rumors Only
          </button>
        </div>

        {/* Layout Container */}
        <div style={{ 
          display: 'flex', 
          flexDirection: viewMode === 'split' ? 'row' : 'column', 
          flexWrap: 'wrap', 
          gap: '2rem', 
          alignItems: 'flex-start' 
        }}>
          
          {/* News Section */}
          {(viewMode === 'split' || viewMode === 'news') && (
            <div style={{ flex: 1, minWidth: '300px' }}>
              {viewMode === 'split' && (
                <h2 style={{ marginBottom: '16px', color: '#f3f4f6', borderBottom: '2px solid #4b5563', paddingBottom: '8px' }}>
                  📰 Official News
                </h2>
              )}
              <div className={styles.masonry}>
                {newsItems.map(item => {
                  const theme = NEWS_OUTLETS[item.theme] || NEWS_OUTLETS['ERT'];
                  const mediaUrl = apiJoin(item.media_url);
                  return (
                    <div key={item.id} className={styles.masonryItem}>
                      <article 
                        className={styles.browserCard} 
                        style={{ '--theme-color': theme.color, borderTop: `6px solid ${theme.color}`, boxShadow: `0 8px 20px ${theme.color}25` }}
                      >
                        <div className={styles.browserBar}>
                          <div className={styles.dots}>
                            <span style={{ backgroundColor: theme.color, opacity: 0.4 }}/>
                            <span style={{ backgroundColor: theme.color, opacity: 0.7 }}/>
                            <span style={{ backgroundColor: theme.color }}/>
                          </div>
                          <div className={styles.url} style={{ color: theme.color, borderColor: `${theme.color}40` }}>
                            🔒 https://{theme.url}/article/{item.id}
                          </div>
                        </div>
                        
                        <div className={styles.newsHeader} style={{ borderBottom: `2px solid ${theme.color}30`, backgroundImage: `url(${theme.logo})` }}>
                          <div className={styles.headerOverlay}>
                            <div className={styles.headerTitleGroup}>
                              <span className={styles.live} style={{ backgroundColor: theme.color }}>LIVE</span>
                              <span className={styles.outletName} style={{ color: theme.color }}>{theme.name}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className={styles.newsBody}>
                          <h2 style={{ borderBottom: `2px solid ${theme.color}40`, paddingBottom: '8px' }}>{item.title}</h2>
                          {item.subtitle && <h4 style={{ color: theme.color }}>{item.subtitle}</h4>}
                          
                          <div className={styles.meta}>
                            <span className={styles.journalist} style={{ color: theme.color, fontWeight: '800' }}>By {item.journalist_name || 'Staff'}</span>
                            <span className={styles.date} style={{ color: `${theme.color}99` }}>| {new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                          
                          {item.media_url && (
                            <div className={styles.mediaFrame} style={{ boxShadow: `0 4px 15px ${theme.color}30` }}>
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
                {newsItems.length === 0 && <p style={{ color: '#9ca3af' }}>No news published yet.</p>}
              </div>
            </div>
          )}

          {/* Rumors Section */}
          {(viewMode === 'split' || viewMode === 'rumors') && (
            <div style={{ flex: 1, minWidth: '300px' }}>
              {viewMode === 'split' && (
                <h2 style={{ marginBottom: '16px', color: '#fbbf24', borderBottom: '2px dashed #fbbf24', paddingBottom: '8px' }}>
                  🤫 Whispers & Rumors
                </h2>
              )}
              <div className={styles.masonry}>
                {rumorItems.map(item => {
                  const mediaUrl = apiJoin(item.media_url);
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
                })}
                {rumorItems.length === 0 && <p style={{ color: '#9ca3af' }}>No rumors heard lately.</p>}
              </div>
            </div>
          )}

        </div>
      </div>
      
      {modalMode && (
        <CreateNewsModal 
          mode={modalMode} 
          onClose={() => setModalMode(null)} 
          onSuccess={() => { setModalMode(null); fetchNews(); }} 
        />
      )}
    </div>
  );
}

// Admin / Court Article Form
function CreateNewsModal({ mode, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ 
    title: '', 
    subtitle: '', 
    body: '', 
    theme: mode === 'rumor' ? 'RUMOR' : 'ERT', 
    journalist_name: '' 
  });
  
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
      <div style={{ maxWidth: '800px', width: '100%', backgroundColor: '#1f2937', borderRadius: '8px', color: '#f3f4f6', boxShadow: '0 10px 25px rgba(0,0,0,0.8)' }}>
        
        <div style={{ padding: '20px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111827', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f9fafb' }}>
            {mode === 'rumor' ? 'Post a Rumor' : 'Submit News Article'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
           
           <div>
             <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold', color: '#d1d5db' }}>Headline *</label>
             <input placeholder={mode === 'rumor' ? "What's the whisper on the street?" : "Attention-grabbing title..."} required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} style={{ width: '100%', padding: '12px', fontSize: '1.1rem', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#111827', color: '#fff', boxSizing: 'border-box' }} />
           </div>
           
           <div style={{ display: 'grid', gridTemplateColumns: mode === 'rumor' ? '1fr' : '2fr 1fr', gap: '16px' }}>
             {mode !== 'rumor' && (
               <div>
                 <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold', color: '#d1d5db' }}>Subtitle (Optional)</label>
                 <input placeholder="Secondary context..." value={formData.subtitle} onChange={e=>setFormData({...formData, subtitle: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#111827', color: '#fff', boxSizing: 'border-box' }} />
               </div>
             )}
             <div>
               <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold', color: '#d1d5db' }}>Outlet / Theme</label>
               <select 
                 value={formData.theme} 
                 onChange={e=>setFormData({...formData, theme: e.target.value})} 
                 disabled={mode === 'rumor'}
                 style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: mode === 'rumor' ? '#374151' : '#111827', color: '#fff', boxSizing: 'border-box' }}>
                 {Object.keys(NEWS_OUTLETS).map(k => {
                   if (mode === 'rumor' && k !== 'RUMOR') return null;
                   return <option key={k} value={k}>{NEWS_OUTLETS[k].name}</option>;
                 })}
               </select>
             </div>
           </div>

           {mode !== 'rumor' && (
             <div>
               <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold', color: '#d1d5db' }}>Journalist Name</label>
               <div style={{ display: 'flex', gap: '10px' }}>
                  <input placeholder="e.g. Giannis Petrou" value={formData.journalist_name} onChange={e=>setFormData({...formData, journalist_name: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#111827', color: '#fff', boxSizing: 'border-box' }} />
                  <button type="button" onClick={handleRandomizeName} style={{ padding: '10px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>
                    🎲 Randomize
                  </button>
               </div>
             </div>
           )}

           <div>
             <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 'bold', color: '#d1d5db' }}>
               {mode === 'rumor' ? 'Gossip Details *' : 'Article Body *'}
             </label>
             <div style={{ border: '1px solid #4b5563', borderRadius: '6px', display: 'flex', flexDirection: 'column' }}>
               <EditorToolbar onCmd={(c,v) => document.execCommand(c,false,v)} />
               <div className={styles.editable} contentEditable ref={contentRef} />
             </div>
           </div>

           <div style={{ border: '2px dashed #4b5563', padding: '16px', borderRadius: '6px', backgroundColor: '#111827', textAlign: 'center' }}>
             <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#d1d5db', cursor: 'pointer' }}>
               📷 Attach Image or Video (Optional)
               <input type="file" onChange={e => setFile(e.target.files[0])} style={{ display: 'block', margin: '10px auto 0', color: '#9ca3af' }} />
             </label>
           </div>

           <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', paddingTop: '16px', borderTop: '1px solid #374151' }}>
             <button type="button" onClick={onClose} disabled={uploading} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', cursor: 'pointer', fontWeight: 'bold', color: '#f3f4f6' }}>Cancel</button>
             <button type="submit" disabled={uploading} style={{ padding: '10px 24px', borderRadius: '6px', border: 'none', backgroundColor: uploading ? '#9ca3af' : (mode === 'rumor' ? '#fbbf24' : '#10b981'), color: mode === 'rumor' ? '#000' : '#fff', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: '0.2s' }}>
               {uploading ? 'Publishing...' : '📡 Publish'}
             </button>
           </div>
           
        </form>
      </div>
    </div>
  );
}