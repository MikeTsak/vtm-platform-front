// src/features/comms/notes/AnonymousNotes.jsx
//
// Anonymous notes: one-off messages a Storyteller drops into a player's
// Comms > Anonymous Notes tab. Players only read them (no sender, no reply); admins compose
// them (text + images, one or many recipients) and see what was sent / read.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import api, { formatApiError } from '../../../core/api';
import { socket } from '../../../api/liveSession';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';
import { formatAthensDateTime } from '../../../utils/dateFormatter';
import { TextEditor } from '../../email/EmailSystem';
import mail from '../../../styles/EmailSystem.module.css';
import styles from '../../../styles/comms/notes/AnonymousNotes.module.css';

const MAX_IMAGES = 10;

const snippet = (html) => (html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// Notes list for the logged-in player, kept fresh by the emails:refresh signal.
export function useMyNotes(enabled) {
  const [notes, setNotes] = useState([]);
  const reload = useCallback(() => {
    if (!enabled) return;
    api.get('/notes/mine').then(({ data }) => setNotes(data.notes || [])).catch(() => { });
  }, [enabled]);

  useEffect(() => {
    reload();
    if (!enabled) return;
    socket.on('notes:refresh', reload);
    return () => socket.off('notes:refresh', reload);
  }, [enabled, reload]);

  return { notes, setNotes, reload };
}

function NoteReader({ note, heading, onClose }) {
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') (zoom ? setZoom(null) : onClose()); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom, onClose]);

  return (
    <div className={styles.readerBackdrop} onClick={onClose}>
      <div className={styles.reader} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Anonymous note">
        <div className={styles.readerHeader}>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Close note">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className={styles.readerTitle}>
            <span>{heading}</span>
            <small>{formatAthensDateTime(note.created_at)}</small>
          </div>
        </div>
        <div className={styles.readerBody}>
          {note.body && <div className={styles.noteText} dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.body) }} />}
          {note.images.length > 0 && (
            <div className={styles.imageGrid}>
              {note.images.map(src => (
                <button key={src} className={styles.imageBtn} onClick={() => setZoom(src)} aria-label="View image full size">
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {zoom && (
        <div className={styles.lightbox} onClick={e => { e.stopPropagation(); setZoom(null); }} role="dialog" aria-label="Image">
          <img src={zoom} alt="" />
        </div>
      )}
    </div>
  );
}

function NoteCard({ note, title, sub, unread, onOpen, action }) {
  const text = snippet(note.body);
  return (
    <div className={`${styles.card} ${unread ? styles.unread : ''}`}>
      <button className={styles.cardMain} onClick={onOpen}>
        <span className={`material-symbols-outlined ${styles.cardIcon}`}>{unread ? 'mark_email_unread' : 'drafts'}</span>
        <span className={styles.cardText}>
          <span className={styles.cardTop}>
            <span className={styles.cardTitle}>{title}</span>
            <span className={styles.cardDate}>{formatAthensDateTime(note.created_at)}</span>
          </span>
          <span className={styles.cardSnippet}>
            {note.images.length > 0 && (
              <span className={styles.imgCount}>
                <span className="material-symbols-outlined">image</span>{note.images.length}
              </span>
            )}
            {text || (note.images.length ? 'Image' : '')}
          </span>
          {sub && <span className={styles.cardSub}>{sub}</span>}
        </span>
      </button>
      {action}
    </div>
  );
}

function PlayerNotes({ notes, setNotes }) {
  const [openId, setOpenId] = useState(null);
  const open = notes.find(n => n.id === openId);

  const openNote = (n) => {
    setOpenId(n.id);
    if (!n.read_at) {
      setNotes(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
      api.post(`/notes/${n.id}/read`).catch(() => { });
    }
  };

  return (
    <div className={styles.panel}>
      <p className={styles.intro}>Notes slipped to you by someone who would rather stay unknown. There is no way to answer.</p>
      {notes.length === 0
        ? <div className={styles.empty}>Nothing here.</div>
        : notes.map(n => (
          <NoteCard key={n.id} note={n} title="Anonymous" unread={!n.read_at} onOpen={() => openNote(n)} />
        ))}
      {open && <NoteReader note={open} heading="Anonymous" onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Composer({ onClose, onSent }) {
  const [players, setPlayers] = useState([]);
  const [filter, setFilter] = useState('');
  const [picked, setPicked] = useState(new Set());
  const [body, setBody] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(0);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/admin/users').then(({ data }) => {
      const activeKindred = (data.users || []).filter(p => {
        let active = false;
        try {
          const s = typeof p.sheet === 'string' ? JSON.parse(p.sheet) : p.sheet;
          active = s?.is_active === true;
        } catch { active = false; }
        return p.character_id && active && !p.is_deceased && !p.is_left && !p.is_missing;
      });
      setPlayers(activeKindred);
    }).catch(() => { });
  }, []);

  const toggle = (id) => setPicked(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const addFiles = async (files) => {
    const list = [...files].slice(0, MAX_IMAGES - images.length);
    if (list.length < files.length) toast.error(`At most ${MAX_IMAGES} images per note.`);
    for (const file of list) {
      setUploading(u => u + 1);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const { data } = await api.post('/admin/notes/upload', fd);
        setImages(prev => [...prev, data.url]);
      } catch (e) {
        toast.error(formatApiError(e, `Failed to upload ${file.name}.`));
      } finally {
        setUploading(u => u - 1);
      }
    }
  };

  const hasText = snippet(body).length > 0;
  const canSend = picked.size > 0 && (hasText || images.length > 0) && !uploading && !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await api.post('/admin/notes', { user_ids: [...picked], body: hasText ? body : '', images });
      toast.success(`Note sent to ${picked.size} player${picked.size === 1 ? '' : 's'}.`);
      onSent();
    } catch (e) {
      toast.error(formatApiError(e, 'Failed to send note.'));
      setSending(false);
    }
  };

  const q = filter.trim().toLowerCase();
  const shown = players.filter(p => !q || `${p.char_name || ''} ${p.display_name || ''}`.toLowerCase().includes(q));

  return (
    <div className={styles.readerBackdrop}>
      <div className={`${styles.reader} ${styles.composer}`} role="dialog" aria-modal="true" aria-label="New anonymous note">
        <div className={styles.readerHeader}>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Close" disabled={sending}>
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className={styles.readerTitle}><span>New anonymous note</span></div>
        </div>
        <div className={styles.readerBody}>
          <label className={styles.label}>Recipients ({picked.size})</label>
          <input className={mail.input} placeholder="Filter players..." value={filter} onChange={e => setFilter(e.target.value)} />
          <div className={styles.recipients}>
            {shown.map(p => (
              <label key={p.id} className={styles.recipient}>
                <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                <span>{p.char_name || p.display_name}{p.char_name && <small> {p.display_name}</small>}</span>
              </label>
            ))}
          </div>

          <label className={styles.label}>Message</label>
          <div className={styles.editorWrap}>
            <TextEditor value={body} onChange={setBody} placeholder="Write the note..." />
          </div>

          <label className={styles.label}>Images ({images.length}/{MAX_IMAGES})</label>
          <div className={styles.imageGrid}>
            {images.map(src => (
              <div key={src} className={styles.thumb}>
                <img src={src} alt="" />
                <button className={styles.thumbRemove} onClick={() => setImages(prev => prev.filter(x => x !== src))} aria-label="Remove image">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button className={styles.addImage} onClick={() => fileRef.current?.click()} disabled={uploading > 0}>
                <span className="material-symbols-outlined">{uploading ? 'hourglass_top' : 'add_photo_alternate'}</span>
                <span>{uploading ? 'Uploading...' : 'Add images'}</span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
          />
        </div>
        <div className={styles.composerActions}>
          <button className={mail.btnSec} onClick={onClose} disabled={sending}>Cancel</button>
          <button className={mail.btnPri} onClick={send} disabled={!canSend}>{sending ? 'Sending...' : 'Send note'}</button>
        </div>
      </div>
    </div>
  );
}

function AdminNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [openId, setOpenId] = useState(null);
  const readIds = useRef(null); // note ids already seen as read; null until the first load

  const load = useCallback(() => {
    api.get('/admin/notes')
      .then(({ data }) => {
        const list = data.notes || [];
        const nowRead = new Set(list.filter(n => n.read_at).map(n => n.id));
        // A read receipt landing while this tab is open: tell the admin who read it.
        if (readIds.current) {
          list.filter(n => nowRead.has(n.id) && !readIds.current.has(n.id))
            .forEach(n => toast(`${n.char_name || n.display_name} read a note.`));
        }
        readIds.current = nowRead;
        setNotes(list);
      })
      .catch(() => toast.error('Failed to load notes.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    socket.on('notes:refresh', load);
    return () => socket.off('notes:refresh', load);
  }, [load]);

  const remove = async (n) => {
    if (!window.confirm(`Delete this note to ${n.char_name || n.display_name}? It disappears from their Surface Web.`)) return;
    try {
      await api.delete(`/admin/notes/${n.id}`);
      setNotes(prev => prev.filter(x => x.id !== n.id));
    } catch (e) {
      toast.error('Failed to delete note.');
    }
  };

  const open = notes.find(n => n.id === openId);
  const who = (n) => n.char_name || n.display_name;

  return (
    <div className={styles.panel}>
      <div className={styles.adminBar}>
        <p className={styles.intro}>Sent without a sender. Players cannot reply.</p>
        <button className={mail.btnPri} onClick={() => setComposing(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 6 }}>edit</span>New note
        </button>
      </div>
      {!loading && notes.length === 0 && <div className={styles.empty}>No notes sent yet.</div>}
      {notes.map(n => (
        <NoteCard
          key={n.id}
          note={n}
          title={`To ${who(n)}`}
          sub={n.sender_name ? `Sent by ${n.sender_name}` : null}
          onOpen={() => setOpenId(n.id)}
          action={(
            <div className={styles.cardSide}>
              <span className={n.read_at ? styles.read : styles.unreadTag} title={n.read_at ? `Read ${formatAthensDateTime(n.read_at)}` : 'Not read yet'}>
                <span className="material-symbols-outlined">{n.read_at ? 'visibility' : 'schedule'}</span>
                {n.read_at && <small>{formatAthensDateTime(n.read_at)}</small>}
              </span>
              <button className={styles.iconBtn} onClick={() => remove(n)} aria-label="Delete note" title="Delete note">
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          )}
        />
      ))}
      {open && <NoteReader note={open} heading={`To ${who(open)}`} onClose={() => setOpenId(null)} />}
      {composing && <Composer onClose={() => setComposing(false)} onSent={() => { setComposing(false); load(); }} />}
    </div>
  );
}

export default function AnonymousNotes({ isAdmin, notes, setNotes }) {
  return isAdmin ? <AdminNotes /> : <PlayerNotes notes={notes} setNotes={setNotes} />;
}
