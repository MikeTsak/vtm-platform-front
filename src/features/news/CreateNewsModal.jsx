import React, { useState, useRef, useEffect, useCallback } from 'react';
import api, { formatApiError } from '../../core/api';
import { NEWS_OUTLETS, DISCORD_PREFIX_OPTIONS, getDefaultDiscordPrefix } from '../../constants/outletConstants';
import { apiJoin, isVideoUrl } from '../../utils/newsUtils';
import { generateGreekName } from '../../utils/nameGenerator';
import { formatAthensDateTime } from '../../utils/dateFormatter';
import FaGlyph from '../../ui/FaGlyph';
import styles from '../../styles/News.module.css';
import EditorToolbar from '../../components/EditorToolbar';

export default function CreateNewsModal({
  mode,
  onClose,
  onSuccess,
  themes,
  initialDraft = null,
  onDraftDiscard = null
}) {
  const currentOptions = DISCORD_PREFIX_OPTIONS[mode] || DISCORD_PREFIX_OPTIONS.news;
  const [draftId, setDraftId] = useState(initialDraft?.id || null);
  const [draftStatus, setDraftStatus] = useState(initialDraft ? 'saved' : 'idle');
  const [draftSavedAt, setDraftSavedAt] = useState(initialDraft?.updated_at || null);
  const [detectedDraft, setDetectedDraft] = useState(null);

  const draftIdRef = useRef(initialDraft?.id || null);
  draftIdRef.current = draftId;
  const saveTimeoutRef = useRef(null);
  const lastSavedDataRef = useRef('');

  const [formData, setFormData] = useState({ 
    title: initialDraft?.title || '', 
    subtitle: initialDraft?.subtitle || '', 
    body: initialDraft?.body || '', 
    theme: initialDraft?.theme || (mode === 'rumor' ? 'RUMOR' : (themes?.all ? 'ERT' : (themes && themes.length > 0 ? themes[0] : 'ERT'))), 
    journalist_name: initialDraft?.journalist_name || '',
    discord_prefix: initialDraft?.discord_prefix || getDefaultDiscordPrefix(mode),
    is_private: Boolean(initialDraft?.is_private)
  });
  const initialIsCustom = initialDraft?.is_custom_prefix
    ? true
    : Boolean(initialDraft?.discord_prefix && !currentOptions.some(o => o.value === initialDraft.discord_prefix));
  const [isCustomPrefix, setIsCustomPrefix] = useState(initialIsCustom);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const contentRef = useRef(null);

  // Load initial draft body into editor upon mount
  useEffect(() => {
    if (initialDraft?.body && contentRef.current) {
      contentRef.current.innerHTML = initialDraft.body;
      lastSavedDataRef.current = JSON.stringify({
        t: initialDraft.title || '',
        s: initialDraft.subtitle || '',
        b: initialDraft.body || '',
        th: initialDraft.theme || 'ERT',
        j: initialDraft.journalist_name || '',
        d: initialDraft.discord_prefix || '',
        c: initialDraft.is_custom_prefix ? 1 : 0,
        p: initialDraft.is_private ? 1 : 0
      });
    }
  }, [initialDraft]);

  // Check if an unsubmitted draft exists on the server when starting fresh
  useEffect(() => {
    if (mode === 'rumor' || initialDraft) return;
    api.get('/news/drafts')
      .then(res => {
        const drafts = res.data?.drafts || [];
        if (drafts.length > 0 && !draftIdRef.current) {
          setDetectedDraft(drafts[0]);
        }
      })
      .catch(() => {});
  }, [mode, initialDraft]);

  // Clean up auto save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const triggerAutoSave = useCallback((updatedForm, customPfx, bodyHtml) => {
    if (mode === 'rumor') return;

    const currentTitle = updatedForm.title || '';
    const currentSub = updatedForm.subtitle || '';
    const currentBody = bodyHtml !== undefined ? bodyHtml : (contentRef.current ? contentRef.current.innerHTML : '');

    const hasContent = currentTitle.trim() || currentSub.trim() || (currentBody && currentBody.trim() !== '<br>' && currentBody.trim() !== '');
    if (!hasContent) return;

    const snapshot = JSON.stringify({
      t: currentTitle,
      s: currentSub,
      b: currentBody,
      th: updatedForm.theme,
      j: updatedForm.journalist_name,
      d: updatedForm.discord_prefix,
      c: customPfx ? 1 : 0,
      p: updatedForm.is_private ? 1 : 0
    });

    if (snapshot === lastSavedDataRef.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    setDraftStatus('saving');
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = {
          title: currentTitle,
          subtitle: currentSub,
          body: currentBody,
          theme: updatedForm.theme,
          journalist_name: updatedForm.journalist_name,
          discord_prefix: updatedForm.discord_prefix,
          is_custom_prefix: customPfx ? 1 : 0,
          is_private: updatedForm.is_private ? 1 : 0
        };

        if (draftIdRef.current) {
          const res = await api.put(`/news/drafts/${draftIdRef.current}`, payload);
          lastSavedDataRef.current = snapshot;
          setDraftStatus('saved');
          setDraftSavedAt(res.data?.draft?.updated_at || new Date().toISOString());
        } else {
          const res = await api.post('/news/drafts', payload);
          const newId = res.data?.draft?.id;
          if (newId) {
            draftIdRef.current = newId;
            setDraftId(newId);
          }
          lastSavedDataRef.current = snapshot;
          setDraftStatus('saved');
          setDraftSavedAt(res.data?.draft?.updated_at || new Date().toISOString());
        }
      } catch (err) {
        setDraftStatus('error');
      }
    }, 1500);
  }, [mode]);

  const updateField = (field, value) => {
    const next = { ...formData, [field]: value };
    setFormData(next);
    triggerAutoSave(next, isCustomPrefix, contentRef.current?.innerHTML);
  };

  const handleResumeDetectedDraft = (draft) => {
    setDraftId(draft.id);
    draftIdRef.current = draft.id;
    const resolvedPrefix = draft.discord_prefix || getDefaultDiscordPrefix(mode);
    const isCustom = draft.is_custom_prefix
      ? true
      : Boolean(draft.discord_prefix && !currentOptions.some(o => o.value === draft.discord_prefix));
    setFormData({
      title: draft.title || '',
      subtitle: draft.subtitle || '',
      body: draft.body || '',
      theme: draft.theme || 'ERT',
      journalist_name: draft.journalist_name || '',
      discord_prefix: resolvedPrefix,
      is_private: Boolean(draft.is_private)
    });
    setIsCustomPrefix(isCustom);
    if (contentRef.current) {
      contentRef.current.innerHTML = draft.body || '';
    }
    lastSavedDataRef.current = JSON.stringify({
      t: draft.title || '',
      s: draft.subtitle || '',
      b: draft.body || '',
      th: draft.theme || 'ERT',
      j: draft.journalist_name || '',
      d: draft.discord_prefix || '',
      c: isCustom ? 1 : 0,
      p: draft.is_private ? 1 : 0
    });
    setDraftStatus('saved');
    setDraftSavedAt(draft.updated_at);
    setDetectedDraft(null);
  };

  const handleDiscardDraft = async () => {
    if (!draftIdRef.current) return;
    if (!window.confirm('Discard this draft permanently?')) return;
    try {
      await api.delete(`/news/drafts/${draftIdRef.current}`);
      const deletedId = draftIdRef.current;
      draftIdRef.current = null;
      setDraftId(null);
      setDraftStatus('idle');
      setDraftSavedAt(null);
      setFormData({
        title: '',
        subtitle: '',
        body: '',
        theme: themes?.all ? 'ERT' : (themes && themes.length > 0 ? themes[0] : 'ERT'),
        journalist_name: '',
        discord_prefix: getDefaultDiscordPrefix(mode),
        is_private: false
      });
      setIsCustomPrefix(false);
      if (contentRef.current) contentRef.current.innerHTML = '';
      lastSavedDataRef.current = '';
      if (onDraftDiscard) onDraftDiscard(deletedId);
    } catch (e) {
      alert(formatApiError(e, 'Failed to discard draft'));
    }
  };

  const handleRandomizeName = () => {
    const newName = generateGreekName();
    updateField('journalist_name', newName);
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
        const res = await api.post('/news/upload', fd, {
          onUploadProgress: (ev) => {
            const p = Math.round((ev.loaded * 100) / ev.total);
            setUploadProgress(p);
          }
        });
        mediaUrl = res.data.url;
      }
      const endpoint = mode === 'rumor' ? '/rumors' : '/news';
      await api.post(endpoint, {
        type: 'news',
        title: formData.title,
        subtitle: mode === 'rumor' ? '' : formData.subtitle,
        body: contentRef.current ? contentRef.current.innerHTML : formData.body,
        theme: formData.theme,
        journalist_name: formData.journalist_name,
        media_url: mediaUrl,
        discord_prefix: formData.discord_prefix,
        is_private: formData.is_private
      });

      if (draftIdRef.current) {
        try {
          await api.delete(`/news/drafts/${draftIdRef.current}`);
        } catch (_) {}
      }

      onSuccess();
    } catch (e) { 
      const errorMsg = formatApiError(e, 'Unknown error');
      alert(`Error posting: ${errorMsg}\n\n(Original fallback: Ensure you have the correct permissions)`); 
    }
    finally { setUploading(false); }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.createModal}>

        <div className={styles.createModalHeader}>
          <h2>{mode === 'rumor' ? 'Post a Rumor' : (draftId ? 'Edit Draft Article' : 'Submit News Article')}</h2>
          <button onClick={onClose} aria-label="Close modal">×</button>
        </div>

        {detectedDraft && !draftId && (
          <div className={styles.draftNoticeBanner}>
            <div>
              <span>Saved draft found: <strong>{detectedDraft.title || 'Untitled Draft'}</strong> ({formatAthensDateTime(detectedDraft.updated_at)})</span>
            </div>
            <div className={styles.draftNoticeActions}>
              <button
                type="button"
                onClick={() => handleResumeDetectedDraft(detectedDraft)}
                className={styles.btnResumeDraft}
              >
                <FaGlyph name="fa-rotate" size={12} /> Resume Draft
              </button>
              <button
                type="button"
                onClick={() => setDetectedDraft(null)}
                className={styles.btnDismissDraft}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.formContainer}>

           <div className={styles.formGroup}>
             <label>Headline *</label>
             <input
               placeholder={mode === 'rumor' ? "What's the whisper on the street?" : "Attention grabbing title..."}
               required
               value={formData.title}
               onChange={e => updateField('title', e.target.value)}
               className={styles.inputField}
             />
           </div>

           <div className={styles.formGrid}>
             {mode !== 'rumor' && (
               <div className={styles.formGroup}>
                 <label>Subtitle (Optional)</label>
                 <input
                   placeholder="Secondary context..."
                   value={formData.subtitle}
                   onChange={e => updateField('subtitle', e.target.value)}
                   className={styles.inputField}
                 />
               </div>
             )}
             <div className={styles.formGroup}>
               <label>Outlet / Theme</label>
               <select
                 value={formData.theme}
                 onChange={e => updateField('theme', e.target.value)}
                 disabled={mode === 'rumor'}
                 className={`${styles.inputField} ${mode === 'rumor' ? styles.disabledInput : ''}`}>
                 {Object.keys(NEWS_OUTLETS).map(k => {
                   if (mode === 'rumor') {
                     return k === 'RUMOR' ? <option key={k} value={k}>{NEWS_OUTLETS[k].name}</option> : null;
                   } else {
                     if (k === 'RUMOR') return null;
                     const isAllowed = themes?.all || (themes && themes.includes(k));
                     return <option key={k} value={k} disabled={!isAllowed}>{NEWS_OUTLETS[k].name}{!isAllowed ? ' (Not Authorized)' : ''}</option>;
                   }
                 })}
               </select>
             </div>
           </div>

           <div className={styles.formGroup}>
             <label>Discord Announcement Style</label>
             <select 
               className={styles.inputField} 
               value={isCustomPrefix ? 'custom' : formData.discord_prefix}
               onChange={(e) => {
                 if (e.target.value === 'custom') {
                   setIsCustomPrefix(true);
                   setFormData(prev => ({ ...prev, discord_prefix: '' }));
                   triggerAutoSave({ ...formData, discord_prefix: '' }, true, contentRef.current?.innerHTML);
                 } else {
                   setIsCustomPrefix(false);
                   updateField('discord_prefix', e.target.value);
                 }
               }}
             >
               {currentOptions.map((opt) => (
                 <option key={opt.value} value={opt.value}>{opt.label}</option>
               ))}
               <option value="custom">✎ Custom Message...</option>
             </select>
               {isCustomPrefix && (
                 <input 
                   placeholder="Type your custom discord message..." 
                   className={styles.inputField} 
                   style={{ marginTop: '0.5rem' }}
                   value={formData.discord_prefix}
                   onChange={e => updateField('discord_prefix', e.target.value)}
                 />
               )}
             </div>

           {mode !== 'rumor' && (
             <div className={styles.formGroup}>
               <label>Journalist Name</label>
               <div className={styles.randomizerGroup}>
                  <input
                    placeholder="e.g. Giannis Petrou"
                    value={formData.journalist_name}
                    onChange={e => updateField('journalist_name', e.target.value)}
                    className={styles.inputField}
                  />
                  <button type="button" onClick={handleRandomizeName} className={styles.randomizeBtn}>🎲 Randomize</button>
               </div>
             </div>
           )}

           {mode !== 'rumor' && (
             <div className={styles.formGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
               <input 
                 type="checkbox" 
                 id="isPrivateCheck"
                 checked={formData.is_private} 
                 onChange={e => updateField('is_private', e.target.checked)} 
               />
               <label htmlFor="isPrivateCheck" style={{ marginBottom: 0, fontWeight: 'normal' }}>
                 Make this article Private (Hidden from public feed, no Discord push)
               </label>
             </div>
           )}

           <div className={styles.formGroup}>
             <label>{mode === 'rumor' ? 'Gossip Details *' : 'Article Body *'}</label>
             <div className={styles.editorWrap}>
               <EditorToolbar onCmd={(c,v) => document.execCommand(c,false,v)} />
               <div
                 className={styles.editable}
                 contentEditable
                 ref={contentRef}
                 onInput={() => triggerAutoSave(formData, isCustomPrefix, contentRef.current?.innerHTML)}
               />
             </div>
           </div>

           <div className={styles.uploadBox}>
             <label>
               📷 Attach Media (Image/Video/Audio)
               <input type="file" accept="image/*,video/*,audio/*" onChange={e => setFile(e.target.files[0])} />
             </label>
             {uploading && uploadProgress > 0 && (
               <div className="w-full bg-primary/20 h-1 mt-2 rounded overflow-hidden">
                 <div className="h-full bg-primary transition-all duration-200" style={{width: `${uploadProgress}%`}}></div>
               </div>
             )}
           </div>

           <div className={styles.modalActions}>
             {mode !== 'rumor' && (
               <div className={styles.draftStatusWrap}>
                 {draftStatus === 'saving' && (
                   <span className={styles.draftStatusSaving}>
                     <FaGlyph name="fa-rotate" size={13} style={{ animation: 'spin 1s linear infinite' }} />
                     Saving draft...
                   </span>
                 )}
                 {draftStatus === 'saved' && (
                   <span className={styles.draftStatusSaved}>
                     <FaGlyph name="fa-check" size={13} />
                     Draft saved: {draftSavedAt ? formatAthensDateTime(draftSavedAt) : 'just now'}
                   </span>
                 )}
                 {draftStatus === 'error' && (
                   <span style={{ color: '#ef4444' }}>
                     Failed to save draft
                   </span>
                 )}
                 {draftId && (
                   <button
                     type="button"
                     onClick={handleDiscardDraft}
                     className={styles.btnDiscardDraft}
                     title="Discard this draft"
                   >
                     <FaGlyph name="fa-trash" size={12} /> Discard Draft
                   </button>
                 )}
               </div>
             )}
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