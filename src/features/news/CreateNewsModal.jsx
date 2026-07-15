import React, { useState, useRef } from 'react';
import api from '../../core/api';
import { NEWS_OUTLETS } from '../../constants/newsConstants';
import { apiJoin, isVideoUrl } from '../../utils/newsUtils';
import { generateGreekName } from '../../utils/nameGenerator';
import styles from '../../styles/News.module.css';
import EditorToolbar from '../../components/EditorToolbar';

export default function CreateNewsModal({ mode, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ title: '', subtitle: '', body: '', theme: mode === 'rumor' ? 'RUMOR' : 'ERT', journalist_name: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const contentRef = useRef(null);

  const handleRandomizeName = () => {
    setFormData({ ...formData, journalist_name: generateGreekName() });
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