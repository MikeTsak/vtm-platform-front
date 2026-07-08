import React, { useState, useEffect, useRef, useContext } from 'react';
import api from '../core/api';
import styles from '../styles/Court.module.css';
import { Skeleton } from 'boneyard-js/react';
import { AuthCtx } from '../core/AuthContext';
import Avatar from './Avatar';

// --- Dedicated component to fetch and render DB Blobs ---
function BlobImage({ url }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    const mediaId = url.split('/').pop(); 
    const requestUrl = `/news/media/${mediaId}`;

    api.get(requestUrl, { responseType: 'blob' })
      .then(response => {
        objectUrl = URL.createObjectURL(response.data);
        setImgSrc(objectUrl);
      })
      .catch(err => {
        console.error(`Blob fetch failed for ${requestUrl}:`, err);
        setError(true);
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (error) return null;
  if (!imgSrc) return <div style={{ color: 'var(--outline)', fontSize: '13px', margin: '15px 0' }}>Loading attachment...</div>;

  return (
    <div className={styles.decreeImageWrapper}>
      <img src={imgSrc} alt="Decree Attachment" />
    </div>
  );
}

const TITLES = ["Prince", "Seneschal", "Primogen", "Sheriff", "Scourge", "Keeper", "Harpy", "Assistant Harpy", "Hound", "Shadow", "Whip"];

const getTopRole = (titlesStr) => {
  try {
    const titles = JSON.parse(titlesStr);
    if (Array.isArray(titles) && titles.length > 0) {
      const sorted = [...titles].sort((a, b) => {
        let aIdx = TITLES.indexOf(a);
        let bIdx = TITLES.indexOf(b);
        if(aIdx === -1) aIdx = 99;
        if(bIdx === -1) bIdx = 99;
        return aIdx - bIdx;
      });
      return sorted[0];
    }
  } catch(e) {}
  return "Court Member";
};

// --- Main View ---
export default function AnnouncementsView({ canEdit: propCanEdit }) {
  const { user } = useContext(AuthCtx);
  const isCourtOrAdmin = user?.role === 'admin' || user?.role === 'courtuser';
  const canEdit = propCanEdit !== undefined ? propCanEdit : isCourtOrAdmin;

  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const contentRef = useRef(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/news');
      setItems((data.items || []).filter(i => i.type === 'announcement'));
    } catch (e) {
      console.error("Decree fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchItems(); 
  }, []);

  const handleDelete = async (id) => {
    if(window.confirm("Revoke this decree?")) { 
      try { 
        await api.delete(`/news/${id}`); 
        fetchItems(); 
      } catch(e) { 
        alert("Failed to revoke decree."); 
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file || null);
    if (file) {
      setPreviewBlob(URL.createObjectURL(file));
    } else {
      setPreviewBlob(null);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    
    try {
      let media_url = null;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const uploadRes = await api.post('/news/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        media_url = uploadRes.data.url; 
      }

      await api.post('/news', { 
        type: 'announcement', 
        title: e.target.title.value, 
        body: contentRef.current.value || contentRef.current.innerHTML, // Support either input or contentEditable
        media_url: media_url 
      });

      closeModal();
      fetchItems();
    } catch(e) { 
      alert(e.response?.data?.error || "Publication failed."); 
    } finally {
      setIsUploading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedFile(null);
    if (previewBlob) URL.revokeObjectURL(previewBlob);
    setPreviewBlob(null);
  };

  return (
    <Skeleton loading={loading} name="announcements-view">
      <div className={styles.announcementsWrapper}>
        <div className={styles.decreeHeaderBar}>
          <div>
            <p className={styles.decreeHeaderSubtitle}>City Archive</p>
            <h1 className={styles.decreeHeaderTitle}>Decrees</h1>
          </div>
          {canEdit && (
            <button className={styles.issueBtn} onClick={() => setShowModal(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              ISSUE DECREE
            </button>
          )}
        </div>
        
        <div className={styles.decreeList}>
          {items.map(item => {
            const authorRole = getTopRole(item.char_titles);
            const authorName = item.char_name || item.author_real_name;
            const authorImg = item.char_image || null;

            return (
              <article key={item.id} className={styles.decreeCard}>
                <div className={styles.decreeAccent}></div>
                
                <div className={styles.decreeContent}>
                  <header className={styles.decreeMeta}>
                    <div className={styles.decreeAuthorInfo}>
                      <Avatar userId={item.author_id} size={48} className={styles.decreeAuthorAvatar} fallback={authorImg || undefined} />
                      <div>
                        <h3 className={styles.decreeAuthorName}>{authorName}</h3>
                        <p className={styles.decreeAuthorRole}>{authorRole}</p>
                      </div>
                    </div>
                    <time className={styles.decreeDate}>
                      {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </time>
                  </header>
                  
                  <h2 className={styles.decreeSubject}>{item.title}</h2>
                  
                  {item.media_url && <BlobImage url={item.media_url} />}

                  <div className={styles.decreeBodyText} dangerouslySetInnerHTML={{__html: item.body.replace(/\n/g, '<br/>')}} />
                </div>

                {canEdit && (
                  <div className={styles.decreeFooter}>
                    <button onClick={() => handleDelete(item.id)} className={styles.revokeBtn}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                      Revoke Decree
                    </button>
                  </div>
                )}
              </article>
            );
          })}
          {items.length === 0 && <div style={{ textAlign: 'center', color: 'var(--outline)' }}>The Court is silent. No decrees have been issued.</div>}
        </div>
        
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className={styles.modalInner}>
              <header className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>Draft New Decree</h2>
                  <p className={styles.modalSubtitle}>Speak with authority. All domain members will be notified.</p>
                </div>
                <button className={styles.modalCloseBtn} onClick={closeModal}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </header>
              
              <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div className={styles.modalBody}>
                  <div className={styles.inputGroup}>
                    <label>Subject Title</label>
                    <input name="title" className={styles.decreeInput} placeholder="e.g., Declaration of Elysium..." required disabled={isUploading} />
                  </div>
                  
                  <div className={styles.inputGroup}>
                    <label>Proclamation Body</label>
                    <textarea 
                      ref={contentRef} 
                      className={`${styles.decreeInput} ${styles.decreeTextarea}`} 
                      placeholder="Draft your message here..." 
                      required 
                      disabled={isUploading}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Attachment (Optional)</label>
                    <label className={styles.uploadZone}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileSelect}
                        disabled={isUploading}
                        style={{ display: 'none' }}
                      />
                      <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--outline-variant)', marginBottom: '8px' }}>upload_file</span>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>Click to attach official document or seal</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--outline-variant)' }}>PNG, JPG up to 5MB</p>
                    </label>
                    {previewBlob && (
                      <div style={{ marginTop: '10px', textAlign: 'center' }}>
                        <img src={previewBlob} alt="Preview" style={{ maxWidth: '100px', borderRadius: '4px' }} />
                      </div>
                    )}
                  </div>
                </div>

                <footer className={styles.modalFooter}>
                  <button type="button" className={styles.cancelBtn} onClick={closeModal} disabled={isUploading}>Cancel</button>
                  <button type="submit" className={styles.submitBtn} disabled={isUploading}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
                    {isUploading ? 'Publishing...' : 'Publish Decree'}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}
      </div>
    </Skeleton>
  );
}