import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import styles from '../styles/Court.module.css';

export default function AnnouncementsView({ canEdit }) {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const contentRef = useRef(null);

  const fetchItems = async () => {
    try {
      const { data } = await api.get('/news');
      setItems((data.items || []).filter(i => i.type === 'announcement'));
    } catch (e) { console.error("Decree fetch error"); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleDelete = async (id) => {
    if(window.confirm("Revoke this decree?")) { 
      try { 
        await api.delete(`/news/${id}`); 
        fetchItems(); 
      } catch(e) { alert("Failed to revoke decree."); }
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    try {
      await api.post('/news', { 
        type: 'announcement', 
        title: e.target.title.value, 
        body: contentRef.current.innerHTML 
      });
      setShowModal(false);
      fetchItems();
    } catch(e) { alert("Publication failed."); }
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
              <input name="title" placeholder="Subject" required />
              <div className={styles.editor} contentEditable ref={contentRef} />
              <div className={styles.modalActions}>
                <button type="button" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit">Publish</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}