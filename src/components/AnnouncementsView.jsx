import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import styles from '../styles/Court.module.css';

// --- Dedicated component to fetch and render DB Blobs ---
function BlobImage({ url }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl = null;

    // Extract the ID from the saved URL (e.g., "/api/news/media/123" -> "123")
    // This prevents Axios from accidentally double-stacking the "/api" prefix.
    const mediaId = url.split('/').pop(); 
    const requestUrl = `/news/media/${mediaId}`;

    // Fetch the raw blob data from the backend
    api.get(requestUrl, { responseType: 'blob' })
      .then(response => {
        // Create a local browser URL from the binary blob
        objectUrl = URL.createObjectURL(response.data);
        setImgSrc(objectUrl);
      })
      .catch(err => {
        console.error(`Blob fetch failed for ${requestUrl}:`, err);
        setError(true);
      });

    // Cleanup memory when component unmounts or URL changes
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (error) {
    return <div style={{ color: '#ff6b6b', fontSize: '13px', margin: '15px 0' }}>Failed to load attachment.</div>;
  }
  
  if (!imgSrc) {
    return <div style={{ color: '#a3a3ad', fontSize: '13px', margin: '15px 0' }}>Loading attachment...</div>;
  }

  return (
    <img 
      src={imgSrc} 
      alt="Decree Attachment" 
      style={{ maxWidth: '100%', borderRadius: '8px', margin: '15px 0' }} 
    />
  );
}

// --- Main View ---
export default function AnnouncementsView({ canEdit }) {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  // Upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null); // Local preview before uploading
  const [isUploading, setIsUploading] = useState(false);
  
  const contentRef = useRef(null);

  const fetchItems = async () => {
    try {
      const { data } = await api.get('/news');
      setItems((data.items || []).filter(i => i.type === 'announcement'));
    } catch (e) { 
      console.error("Decree fetch error", e); 
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
    
    // Create a temporary local blob for previewing the upload
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

      // 1. Upload the file to your backend's Blob storage table
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const uploadRes = await api.post('/news/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        media_url = uploadRes.data.url; 
      }

      // 2. Post the announcement, linking the media route
      await api.post('/news', { 
        type: 'announcement', 
        title: e.target.title.value, 
        body: contentRef.current.innerHTML,
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
    <div className={styles.announcementsContainer}>
      {canEdit && (
        <button className={styles.decreeBtn} onClick={() => setShowModal(true)}>
          + Issue Decree
        </button>
      )}
      
      <div className={styles.list}>
        {items.map(item => (
          <div key={item.id} className={styles.decreeCard}>
            <div className={styles.decreeHeader}>
              <span className={styles.decreeAuthor}>📢 {item.author_real_name}</span>
              <span className={styles.decreeDate}>{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            
            <h3 className={styles.decreeTitle}>{item.title}</h3>
            
            {/* Render the image explicitly as a fetched Blob */}
            {item.media_url && <BlobImage url={item.media_url} />}

            <div className={styles.decreeBody} dangerouslySetInnerHTML={{__html: item.body}} />
            
            {canEdit && (
              <button onClick={() => handleDelete(item.id)} className={styles.deleteBtn}>
                Revoke
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <div className={styles.empty}>The Court is silent. No decrees have been issued.</div>}
      </div>
      
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Issue Decree</h2>
            <form onSubmit={handlePost} className={styles.form}>
              <input name="title" placeholder="Subject" required disabled={isUploading} />
              
              <div 
                className={styles.editor} 
                contentEditable={!isUploading} 
                ref={contentRef} 
                style={{ minHeight: '100px', border: '1px solid #ccc', padding: '8px', marginBottom: '10px' }}
              />

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>
                  Attach Image File
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                
                {/* Local Blob Preview Before Upload */}
                {previewBlob && (
                  <div style={{ marginTop: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#a3a3ad' }}>Preview:</span>
                    <img 
                      src={previewBlob} 
                      alt="Upload Preview" 
                      style={{ display: 'block', maxWidth: '100px', borderRadius: '4px', marginTop: '5px' }} 
                    />
                  </div>
                )}
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={closeModal} disabled={isUploading}>Cancel</button>
                <button type="submit" disabled={isUploading}>
                  {isUploading ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}