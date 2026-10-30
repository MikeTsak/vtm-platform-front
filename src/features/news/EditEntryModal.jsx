// src/features/news/EditEntryModal.jsx
//
// Editing a published news article or court decree, allowed for an hour after it went out
// (its author or an admin; the server decides and sends `editable_until` per reader, see
// back/services/news.js editableUntil). EditPencil is the small pencil shown while the window
// is open; EditEntryModal is the editor: rich text for articles, plain text (with emoji
// tokens) for decrees, media keep / remove / replace. Full screen on phones.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api, { formatApiError } from '../../core/api';
import EditorToolbar from '../../components/EditorToolbar';
import { apiJoin, isVideoUrl } from '../../utils/newsUtils';
import newsStyles from '../../styles/News.module.css';
import styles from '../../styles/EditEntry.module.css';

// Minutes left in the edit window, ticking; null once it has closed.
function useMinutesLeft(until) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!until) return undefined;
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [until]);
  if (!until) return null;
  const ms = new Date(until).getTime() - now;
  return ms > 0 ? Math.max(1, Math.ceil(ms / 60000)) : null;
}

export function EditPencil({ item, onClick, floating = false }) {
  const left = useMinutesLeft(item?.editable_until);
  if (!left) return null;
  const label = `Edit (${left} min left)`;
  return (
    <button
      type="button"
      className={`${styles.pencil} ${floating ? styles.pencilFloating : ''} no-print`}
      title={label}
      aria-label={label}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
    >
      <span className="material-symbols-outlined">edit</span>
      {floating && <span>Edit · {left} min</span>}
    </button>
  );
}

export default function EditEntryModal({ item, onClose, onSaved }) {
  const isNews = item.type === 'news';
  const left = useMinutesLeft(item.editable_until);
  const [title, setTitle] = useState(item.title || '');
  const [subtitle, setSubtitle] = useState(item.subtitle || '');
  const [plainBody, setPlainBody] = useState(item.body || '');
  const [media, setMedia] = useState('keep'); // 'keep' | 'remove' | File
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (isNews && bodyRef.current) bodyRef.current.innerHTML = item.body || '';
  }, [isNews, item.body]);

  const close = () => {
    if (dirty && !window.confirm('Discard your changes?')) return;
    onClose();
  };
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  });

  const save = async (e) => {
    e.preventDefault();
    const body = isNews ? (bodyRef.current?.innerHTML || '') : plainBody;
    const empty = !body.replace(/<br\s*\/?>|&nbsp;|\s/gi, '').length;
    if (!title.trim() || empty) { setError('A title and a body are required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { title: title.trim(), body };
      if (isNews) payload.subtitle = subtitle;
      if (media === 'remove') payload.media_url = null;
      if (media instanceof File) {
        const fd = new FormData();
        fd.append('file', media);
        payload.media_url = (await api.post('/news/upload', fd)).data.url;
      }
      const { data } = await api.put(`/news/${item.id}`, payload);
      onSaved(data.item);
      onClose();
    } catch (err) {
      setError(formatApiError(err, 'Saving the edit failed'));
    } finally {
      setSaving(false);
    }
  };

  const currentMedia = item.media_url && media === 'keep' ? apiJoin(item.media_url) : null;

  return createPortal(
    <div className={styles.backdrop} onClick={close}>
      <form className={styles.sheet} onSubmit={save} onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={isNews ? 'Edit article' : 'Edit decree'}>
        <header className={styles.head}>
          <div>
            <h2>{isNews ? 'Edit Article' : 'Edit Decree'}</h2>
            <p className={left && left <= 5 ? styles.urgent : undefined}>
              {left ? `${left} minute${left === 1 ? '' : 's'} left to edit` : 'The one-hour edit window has closed.'}
            </p>
          </div>
          <button type="button" className={styles.iconBtn} onClick={close} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className={styles.body}>
          <label className={styles.field}>
            <span>{isNews ? 'Headline' : 'Subject title'}</span>
            <input value={title} maxLength={255} required
              onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
          </label>

          {isNews && (
            <label className={styles.field}>
              <span>Subtitle (optional)</span>
              <input value={subtitle} onChange={(e) => { setSubtitle(e.target.value); setDirty(true); }} />
            </label>
          )}

          <div className={styles.field}>
            <span>{isNews ? 'Article body' : 'Proclamation body'}</span>
            {isNews ? (
              <div className={`${newsStyles.editorWrap} ${styles.editorWrap}`}>
                <EditorToolbar onCmd={(c, v) => { bodyRef.current?.focus(); document.execCommand(c, false, v); setDirty(true); }} />
                <div ref={bodyRef} className={styles.editable} contentEditable suppressContentEditableWarning
                  onInput={() => setDirty(true)} aria-label="Article body" />
              </div>
            ) : (
              <textarea className={styles.textarea} value={plainBody} rows={10}
                onChange={(e) => { setPlainBody(e.target.value); setDirty(true); }} />
            )}
          </div>

          <div className={styles.field}>
            <span>Media</span>
            <div className={styles.media}>
              {currentMedia && (isVideoUrl(item.media_url)
                ? <video src={currentMedia} controls />
                : <img src={currentMedia} alt="Current attachment" onError={(e) => { e.currentTarget.style.display = 'none'; }} />)}
              {media instanceof File && <p className={styles.note}>New file: {media.name}</p>}
              {media === 'remove' && <p className={styles.note}>The attachment will be removed.</p>}
              {!item.media_url && media === 'keep' && <p className={styles.note}>No attachment.</p>}
              <div className={styles.mediaActions}>
                <label className={styles.btn}>
                  <span className="material-symbols-outlined">upload</span>
                  {item.media_url ? 'Replace' : 'Add'}
                  <input type="file" accept="image/*,video/*,audio/*" hidden
                    onChange={(e) => { if (e.target.files[0]) { setMedia(e.target.files[0]); setDirty(true); } }} />
                </label>
                {item.media_url && media !== 'remove' && (
                  <button type="button" className={styles.btn} onClick={() => { setMedia('remove'); setDirty(true); }}>
                    <span className="material-symbols-outlined">delete</span> Remove
                  </button>
                )}
                {media !== 'keep' && (
                  <button type="button" className={styles.btn} onClick={() => setMedia('keep')}>Keep current</button>
                )}
              </div>
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </div>

        <footer className={styles.foot}>
          <span className={styles.note}>Edits don't re-post to Discord. Readers see "edited".</span>
          <button type="button" className={styles.btn} onClick={close} disabled={saving}>Cancel</button>
          <button type="submit" className={`${styles.btn} ${styles.primary}`} disabled={saving || !left}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </footer>
      </form>
    </div>,
    document.body
  );
}
