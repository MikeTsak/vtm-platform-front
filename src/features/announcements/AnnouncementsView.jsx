import React, { useState, useEffect, useRef, useContext } from 'react';
import api from '../../core/api';
import styles from '../../styles/Court.module.css';
import { Skeleton } from 'boneyard-js/react';
import { AuthCtx } from '../../core/AuthContext';
import Avatar from '../../components/Avatar';
import { motion } from 'framer-motion';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }
};

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
  const [decreePrintMode, setDecreePrintMode] = useState(null);

  const handlePrintAllDecrees = () => {
    setDecreePrintMode('all');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handlePrintSingleDecree = (item) => {
    setDecreePrintMode(item);
    setTimeout(() => {
      window.print();
    }, 200);
  };
  
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

  const handleBroadcast = async (id) => {
    if(window.confirm("Resend this decree to Discord?")) { 
      try { 
        await api.post(`/news/${id}/broadcast`); 
        alert("Decree rebroadcasted successfully.");
      } catch(e) { 
        alert("Failed to rebroadcast decree."); 
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
        
        const uploadRes = await api.post('/news/upload', formData);
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
      <motion.div 
        className={styles.announcementsWrapper}
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <div className={styles.decreeHeaderBar}>
          <div>
            <p className={styles.decreeHeaderSubtitle}>City Archive</p>
            <h1 className={styles.decreeHeaderTitle}>Decrees</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              className={styles.printDecreesBtn} 
              onClick={handlePrintAllDecrees}
              data-cuelume-press
              data-cuelume-hover
              title="Print decrees"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
              PRINT DECREES
            </button>
            {canEdit && (
              <button className={styles.issueBtn} onClick={() => setShowModal(true)} data-cuelume-press data-cuelume-hover>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                ISSUE DECREE
              </button>
            )}
          </div>
        </div>
        
        <div className={styles.decreeList}>
          {items.map(item => {
            const authorRole = getTopRole(item.char_titles);
            const authorName = item.char_name || item.author_real_name;
            const authorImg = item.char_image || null;

            return (
              <motion.article key={item.id} className={styles.decreeCard} variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.1 }}>
                <div className={styles.decreeAccent}></div>
                
                <div className={styles.decreeContent}>
                  <header className={styles.decreeMeta}>
                    <div className={styles.decreeAuthorInfo}>
                      <Avatar userId={item.author_id} size={48} className={styles.decreeAuthorAvatar} fallback="/img/ATT-logo(1).webp" />
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

                  <div className={styles.decreeBodyText} dangerouslySetInnerHTML={{__html: sanitizeHtml(String(item.body ?? '').replace(/\n/g, '<br/>'))}} />
                </div>

                <div className={`${styles.decreeFooter} no-print`} style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button"
                    onClick={() => handlePrintSingleDecree(item)} 
                    className={styles.revokeBtn} 
                    style={{ color: '#ca8a04', border: '1px solid rgba(202, 138, 4, 0.4)' }} 
                    data-cuelume-press="thud" 
                    data-cuelume-hover
                    title="Print decree"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span>
                    Print Decree
                  </button>
                  {canEdit && (
                    <>
                      {user?.role === 'admin' && (
                        <button onClick={() => handleBroadcast(item.id)} className={styles.revokeBtn} style={{ color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }} data-cuelume-press="thud" data-cuelume-hover>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>campaign</span>
                          Resend to Discord
                        </button>
                      )}
                      <button onClick={() => handleDelete(item.id)} className={styles.revokeBtn} data-cuelume-press="thud" data-cuelume-hover>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                        Revoke Decree
                      </button>
                    </>
                  )}
                </div>
              </motion.article>
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
                <button className={styles.modalCloseBtn} onClick={closeModal} data-cuelume-press="pop" data-cuelume-hover>
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
                    <label className={styles.uploadZone} data-cuelume-hover>
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
                  <button type="button" className={styles.cancelBtn} onClick={closeModal} disabled={isUploading} data-cuelume-press="pop" data-cuelume-hover>Cancel</button>
                  <button type="submit" className={styles.submitBtn} disabled={isUploading} data-cuelume-press data-cuelume-release="success" data-cuelume-hover>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
                    {isUploading ? 'Publishing...' : 'Publish Decree'}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {decreePrintMode && (
          <DecreePrintModal
            target={decreePrintMode}
            items={items}
            onClose={() => setDecreePrintMode(null)}
          />
        )}
      </motion.div>
    </Skeleton>
  );
}

function DecreePrintModal({ target, items, onClose }) {
  if (!target) return null;
  const isAll = target === 'all';
  const printItems = isAll ? items : [target];

  return (
    <div className={styles.decreePrintModal}>
      <div className={`${styles.decreePrintToolbar} no-print`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          <span className="material-symbols-outlined">gavel</span>
          {isAll ? 'Court Decrees Print Layout (All)' : 'Court Decree Print Layout'}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => window.print()}
            className={styles.submitBtn}
            style={{ padding: '0.4rem 1rem' }}
            title="Print now"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span>
            Print Now
          </button>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelBtn}
            style={{ padding: '0.4rem 1rem' }}
            title="Close print view"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
            Close
          </button>
        </div>
      </div>

      <div className={styles.decreePrintSheet}>
        <div className={styles.decreePrintHeader}>
          <p style={{ margin: '0 0 6px', fontSize: '0.75rem', letterSpacing: '2px', fontWeight: 'bold', textTransform: 'uppercase', color: '#8a0f1a' }}>
            CAMARILLA COURT OF ATHENS
          </p>
          <h1 style={{ margin: 0, fontFamily: 'Cinzel, Georgia, serif', fontSize: '2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {isAll ? 'Decrees and Proclamations' : 'Court Proclamation'}
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#52525b', fontStyle: 'italic' }}>
            Given under the authority of the Prince and the gathered Elders of Elysium
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#71717a', marginTop: '16px', paddingTop: '8px', borderTop: '1px dashed #d4d4d8' }}>
            <span>Seal of Elysium: Acknowledged</span>
            <span>Printed on: {new Date().toLocaleDateString('el-GR')}</span>
            <span>Total Decrees: {printItems.length}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {printItems.map(item => {
            const authorRole = getTopRole(item.char_titles);
            const authorName = item.char_name || item.author_real_name || 'Court Authority';
            const dateStr = new Date(item.created_at).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });

            return (
              <div key={item.id} className={styles.decreePrintItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e4e4e7', paddingBottom: '12px', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'Cinzel, Georgia, serif', color: '#18181b' }}>
                      {item.title}
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#8a0f1a', fontWeight: 'bold' }}>
                      {authorName}, {authorRole}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 'bold' }}>
                      Issued: {dateStr}
                    </span>
                  </div>
                </div>

                {item.media_url && (
                  <div style={{ marginBottom: '16px' }}>
                    <BlobImage url={item.media_url} />
                  </div>
                )}

                <div
                  style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#27272a' }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(item.body ?? '').replace(/\n/g, '<br/>')) }}
                />

                <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #f4f4f5', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#a1a1aa' }}>
                  <span>Decree #{item.id}</span>
                  <span>Athens Through Time Elysium Records</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}