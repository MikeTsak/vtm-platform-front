// src/components/EmailSystem.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { roleFlags } from '../../core/useRole';
import { toast } from 'sonner';
import api, { formatApiError } from '../../core/api';
import { socket } from '../../api/liveSession';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import styles from '../../styles/EmailSystem.module.css';
import { Skeleton } from 'boneyard-js/react';
import Avatar from '../../components/Avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommsEnabled } from '../comms/useCommsEnabled';
import { formatAthensDate, formatAthensDateTime } from '../../utils/dateFormatter';
import { useCommsDrafts, useDraftSummary } from '../comms/drafts/useCommsDrafts';
import DraftsDrawer, { DraftBadge, hasHtmlText, htmlToText, flyDraft } from '../comms/drafts/DraftsDrawer';

// --- Secure Rich Text Editor Component ---
const EditorToolbar = ({ onCmd }) => (
  <div className={styles.toolbar}>
    <button type="button" onClick={() => onCmd('bold')} title="Bold"><b>B</b></button>
    <button type="button" onClick={() => onCmd('italic')} title="Italic"><i>I</i></button>
    <button type="button" onClick={() => onCmd('underline')} title="Underline"><u>U</u></button>
    <button type="button" onClick={() => onCmd('formatBlock', 'H3')} title="Heading 3">H3</button>
    <button type="button" className={styles.desktopOnly} onClick={() => onCmd('justifyLeft')} title="Align Left">L</button>
    <button type="button" className={styles.desktopOnly} onClick={() => onCmd('justifyCenter')} title="Align Center">C</button>
    <button type="button" onClick={() => onCmd('insertUnorderedList')} title="Bullet List">• List</button>
  </div>
);

export const TextEditor = ({ value, onChange, placeholder, disabled = false }) => {
  const contentRef = useRef(null);

  // Typing round-trips through onChange, so value only differs from the DOM
  // when the parent sets it: cleared after sending, or a draft loaded back.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (value === '' || value === '<br>') el.innerHTML = '';
    else if (value !== el.innerHTML) el.innerHTML = sanitizeHtml(value);
  }, [value]);

  const executeCmd = (cmd, val) => {
    if (disabled) return;
    document.execCommand(cmd, false, val);
    contentRef.current.focus();
    onChange(contentRef.current.innerHTML);
  };

  const handleInput = (e) => {
    onChange(e.currentTarget.innerHTML);
  };

  return (
    <div className={`${styles.editorContainer} ${disabled ? styles.editorDisabled : ''}`}>
      <EditorToolbar onCmd={executeCmd} />
      <div
        className={styles.editable}
        contentEditable={!disabled}
        ref={contentRef}
        onInput={handleInput}
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default function EmailSystem({ user, isMobile, commsEnabled: propCommsEnabled, nextOpening: propNextOpening }) {
  const commsHook = useCommsEnabled();
  const commsEnabled = typeof propCommsEnabled === 'boolean' ? propCommsEnabled : commsHook.commsEnabled;
  const nextOpening = propNextOpening !== undefined ? propNextOpening : commsHook.nextOpening;
  const { isAdmin } = roleFlags(user);
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [emailMessages, setEmailMessages] = useState([]);
  const [emailReplyBody, setEmailReplyBody] = useState('');

  // Compose State
  const [emailComposeOpen, setEmailComposeOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' });

  // Admin Management State
  const [adminIdentitiesOpen, setAdminIdentitiesOpen] = useState(false);
  const [adminEmailIdentities, setAdminEmailIdentities] = useState([]);
  const [adminIdentityForm, setAdminIdentityForm] = useState({ email: '', display: '' });

  // Admin DM State
  const [adminDmOpen, setAdminDmOpen] = useState(false);
  const [adminDmForm, setAdminDmForm] = useState({ email: '', display: '', user_id: '', subject: '', body: '' });
  const [adminDmSending, setAdminDmSending] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);

  // Admin-only: queued ("Send Later") NPC-identity emails pending until SurfaceWeb reopens
  const [pendingOpen, setPendingOpen] = useState(false);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [replySending, setReplySending] = useState(false);

  // Admin drawer open state (Set of user_id strings)
  const [openDrawers, setOpenDrawers] = useState(new Set());
  const toggleDrawer = (userId) => setOpenDrawers(prev => {
    const next = new Set(prev);
    if (next.has(userId)) next.delete(userId); else next.add(userId);
    return next;
  });

  // Drafts (comms/drafts): while Surface Web is closed a player can still
  // write replies and new emails; they wait in a drawer until sent by hand.
  const draftMode = !commsEnabled && !isAdmin;
  const replyDrafts = useCommsDrafts(selectedThread && !isAdmin ? { kind: 'email', id: selectedThread.id } : null);
  const newEmailDrafts = useCommsDrafts(isAdmin ? null : { kind: 'email-new', id: null });
  const draftSummary = useDraftSummary(!isAdmin);
  const [replyDraftsOpen, setReplyDraftsOpen] = useState(false);
  const [newDraftsOpen, setNewDraftsOpen] = useState(true);
  const [editingReplyDraft, setEditingReplyDraft] = useState(null); // { id, before, thread }
  const [editingNewDraft, setEditingNewDraft] = useState(null); // draft id loaded in the compose modal
  const savingDraftRef = useRef(false);
  const replyBoxRef = useRef(null);

  const emailEndRef = useRef(null);
  const [replyOpen, setReplyOpen] = useState(false);
  // The open thread is refetched when the list reports it changed (new
  // message), not on every refresh: fetching a thread marks it read, which
  // emits emails:refresh again.
  const selectedThreadRef = useRef(null);
  selectedThreadRef.current = selectedThread;
  const openThreadStampRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const prevThreadsRef = useRef([]);

  // Notifications State safely initialized
  const notifSupported = typeof window !== 'undefined' && 'Notification' in window;
  const [notifOn, setNotifOn] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('email_notifs') === 'true';
    return false;
  });

  const toggleNotifications = async () => {
    if (!notifSupported) return;
    if (!notifOn) {
      if (Notification.permission === 'granted') {
        setNotifOn(true);
        localStorage.setItem('email_notifs', 'true');
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setNotifOn(true);
          localStorage.setItem('email_notifs', 'true');
        }
      }
    } else {
      setNotifOn(false);
      localStorage.setItem('email_notifs', 'false');
    }
  };

  const notify = useCallback((title, body, icon) => {
    if (!notifSupported || !notifOn || Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, icon: icon || '/img/ATT-logo(1).webp' });
    } catch { /* unsupported on Android: web push covers it */ }
  }, [notifSupported, notifOn]);

  const checkNewEmails = useCallback((newThreads) => {
    if (prevThreadsRef.current.length === 0) {
      prevThreadsRef.current = newThreads;
      return;
    }

    newThreads.forEach(t => {
      if (t.unread_count > 0) {
        const prevT = prevThreadsRef.current.find(pt => pt.id === t.id);
        if (!prevT || new Date(t.updated_at).getTime() > new Date(prevT.updated_at).getTime() || prevT.unread_count === 0) {
          const senderName = isAdmin ? t.user_name : t.from_name;
          notify(`New Email from ${senderName}`, t.subject, isAdmin ? undefined : `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`);
        }
      }
    });
    prevThreadsRef.current = newThreads;
  }, [isAdmin, notify]);

  // Load Threads Data safely using AbortController for overlapping requests
  const loadEmails = useCallback(async (isPolling = false, signal = null) => {
    if (!isPolling) setLoading(true);
    try {
      const { data } = await api.get(isAdmin ? '/admin/emails/threads' : '/emails/my-inbox', { signal });
      setThreads(data.threads);
      checkNewEmails(data.threads);

      const open = selectedThreadRef.current;
      const fresh = open && data.threads.find(t => t.id === open.id);
      if (fresh && fresh.updated_at !== openThreadStampRef.current) {
        openThreadStampRef.current = fresh.updated_at;
        const { data: thread } = await api.get(isAdmin ? `/admin/emails/threads/${open.id}` : `/emails/thread/${open.id}`, { signal });
        if (selectedThreadRef.current?.id === open.id) {
          setEmailMessages(thread.messages);
          setThreads(prev => prev.map(th => th.id === open.id ? { ...th, unread_count: 0 } : th));
          setTimeout(() => scrollToBottom(), 80);
        }
      }

      if (isAdmin) {
        const { data: idData } = await api.get('/admin/emails/identities', { signal });
        setAdminEmailIdentities(idData.identities);
      }
    } catch (e) {
      if (e.name !== 'CanceledError') {
        console.error('Failed to load emails', e);
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [isAdmin, checkNewEmails]);

  // Load player list once for the admin DM modal
  useEffect(() => {
    if (!isAdmin) return;
    api.get('/admin/users').then(({ data }) => {
      setAllPlayers(data.users || []);
    }).catch(() => {});
  }, [isAdmin]);

  // Admin-only: keep the "Pending" (queued NPC-identity emails) list fresh
  const fetchPendingQueue = useCallback(async () => {
    if (!isAdmin) return;
    setPendingLoading(true);
    try {
      const { data } = await api.get('/admin/emails/queued');
      setPendingQueue(data.queued || []);
    } catch (e) {
      // silent fail — non-critical panel
    } finally {
      setPendingLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchPendingQueue();
    const interval = setInterval(fetchPendingQueue, 20000);
    return () => clearInterval(interval);
  }, [isAdmin, fetchPendingQueue]);

  const cancelPendingMessage = async (id) => {
    try {
      await api.delete(`/admin/emails/queued/${id}`);
      setPendingQueue(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      toast.error('Failed to cancel queued message.');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadEmails(false, controller.signal);

    // emails:refresh (new mail or a read) is the real-time path; the poll is
    // only a safety net and skips background tabs.
    let debounce = null;
    const onRefresh = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => loadEmails(true), 300);
    };
    const interval = setInterval(() => {
      if (!document.hidden) loadEmails(true);
    }, 60000);
    socket.on('emails:refresh', onRefresh);
    socket.on('connect', onRefresh);
    document.addEventListener('visibilitychange', onRefresh);

    return () => {
      clearInterval(interval);
      clearTimeout(debounce);
      socket.off('emails:refresh', onRefresh);
      socket.off('connect', onRefresh);
      document.removeEventListener('visibilitychange', onRefresh);
      controller.abort();
    };
  }, [loadEmails]);

  const scrollToBottom = (behavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  const openEmailThread = async (t) => {
    setSelectedThread(t);
    setReplyOpen(false);
    openThreadStampRef.current = t.updated_at;
    try {
      const url = isAdmin ? `/admin/emails/threads/${t.id}` : `/emails/thread/${t.id}`;
      const { data } = await api.get(url);
      setEmailMessages(data.messages);
      setThreads(prev => prev.map(th => th.id === t.id ? { ...th, unread_count: 0 } : th));
      setTimeout(() => scrollToBottom('instant'), 80);
    } catch (e) {
      toast.error('Failed to load email thread. Please try again.');
    }
  };

  const canComposeReply = commsEnabled || isAdmin;
  const canWriteReply = canComposeReply || draftMode;

  const reloadOpenThread = async () => {
    const url = isAdmin ? `/admin/emails/threads/${selectedThread.id}` : `/emails/thread/${selectedThread.id}`;
    const { data } = await api.get(url);
    setEmailMessages(data.messages);
    setTimeout(() => scrollToBottom(), 80);
  };

  const handleEmailReply = async ({ queue = false } = {}) => {
    if (!canComposeReply || !emailReplyBody.trim() || replySending) return;
    setReplySending(true);
    try {
      const endpoint = isAdmin ? '/admin/emails/reply' : '/emails/send';
      await api.post(endpoint, { thread_id: selectedThread.id, body: emailReplyBody, queue });
      if (editingReplyDraft) {
        replyDrafts.remove(editingReplyDraft.id);
        setEditingReplyDraft(null);
      }
      setEmailReplyBody('');
      setReplyOpen(false);
      await reloadOpenThread();
      if (queue) fetchPendingQueue();
    } catch (e) {
      toast.error('Failed to reply to email.');
    } finally {
      setReplySending(false);
    }
  };

  /* --- Reply drafts --- */
  const saveReplyDraft = async () => {
    if (!hasHtmlText(emailReplyBody) || savingDraftRef.current) return;
    savingDraftRef.current = true;
    const from = replyBoxRef.current?.getBoundingClientRect();
    const text = htmlToText(emailReplyBody);
    try {
      if (editingReplyDraft) {
        await replyDrafts.update(editingReplyDraft.id, { body: emailReplyBody });
        setEmailReplyBody(editingReplyDraft.before);
        setEditingReplyDraft(null);
      } else {
        await replyDrafts.save({ body: emailReplyBody });
        setEmailReplyBody('');
      }
      setReplyOpen(false);
      flyDraft(from, text, 'email-reply');
      navigator.vibrate?.(10);
    } catch (e) {
      toast.error(formatApiError(e, 'Could not save the draft.'));
    } finally {
      savingDraftRef.current = false;
    }
  };

  const sendReplyDraft = async (draft) => {
    try {
      await api.post('/emails/send', { thread_id: selectedThread.id, body: draft.body });
      await reloadOpenThread();
      return true;
    } catch (e) {
      toast.error(formatApiError(e, 'Failed to send the draft.'));
      return false;
    }
  };

  const editReplyDraft = (draft) => {
    setEditingReplyDraft(prev => ({ id: draft.id, before: prev ? prev.before : emailReplyBody, thread: selectedThread.id }));
    setEmailReplyBody(draft.body);
    setReplyOpen(true);
    setReplyDraftsOpen(false);
  };

  const cancelEditReplyDraft = () => {
    if (!editingReplyDraft) return;
    setEmailReplyBody(editingReplyDraft.before);
    setEditingReplyDraft(null);
  };

  const deleteReplyDraft = (draft) => {
    if (editingReplyDraft?.id === draft.id) cancelEditReplyDraft();
    replyDrafts.discard(draft);
  };

  const sentReplyDraft = (draft) => {
    if (editingReplyDraft?.id === draft.id) cancelEditReplyDraft();
    replyDrafts.remove(draft.id);
  };

  // Another thread: close its drawer and drop an unfinished edit (the draft
  // itself stays as it was).
  useEffect(() => { setReplyDraftsOpen(false); }, [selectedThread?.id]);
  useEffect(() => {
    if (editingReplyDraft && editingReplyDraft.thread !== selectedThread?.id) {
      setEmailReplyBody(editingReplyDraft.before);
      setEditingReplyDraft(null);
    }
  }, [selectedThread?.id, editingReplyDraft]);

  /* --- New-email drafts --- */
  const resetCompose = () => {
    setEmailComposeOpen(false);
    setEmailForm({ to: '', subject: '', body: '' });
    setEditingNewDraft(null);
  };

  // Resolves true once sent. 404 = no such address.
  const sendNewEmail = async ({ to, subject, body }) => {
    try {
      await api.post('/emails/send', { to_email: to, subject, body });
      loadEmails();
      toast.success('Email sent.');
      return true;
    } catch (e) {
      if (e.response?.status === 404) {
        toast.error('Delivery Status Notification: The specified email address does not exist.');
      } else {
        toast.error('Failed to send email.');
      }
      return false;
    }
  };

  const saveNewEmailDraft = async () => {
    if (savingDraftRef.current) return;
    savingDraftRef.current = true;
    const fields = { to_address: emailForm.to, subject: emailForm.subject, body: emailForm.body };
    try {
      if (editingNewDraft) await newEmailDrafts.update(editingNewDraft, fields);
      else await newEmailDrafts.save(fields);
      resetCompose();
      setNewDraftsOpen(true);
      toast.success('Kept as a draft.');
    } catch (e) {
      toast.error(formatApiError(e, 'Could not save the draft.'));
    } finally {
      savingDraftRef.current = false;
    }
  };

  const sendNewEmailDraft = async (draft) => {
    if (!draft.to_address || !draft.subject) {
      toast.error('This draft needs a recipient and a subject: edit it first.');
      return false;
    }
    return sendNewEmail({ to: draft.to_address, subject: draft.subject, body: draft.body });
  };

  const editNewEmailDraft = (draft) => {
    setEmailForm({ to: draft.to_address || '', subject: draft.subject || '', body: draft.body || '' });
    setEditingNewDraft(draft.id);
    setEmailComposeOpen(true);
  };

  const handleEmailSend = async (e) => {
    e.preventDefault();
    if (!commsEnabled) return;
    if (!await sendNewEmail(emailForm)) return;
    if (editingNewDraft) newEmailDrafts.remove(editingNewDraft);
    resetCompose();
  };

  const handleCreateIdentity = async () => {
    if (!adminIdentityForm.email || !adminIdentityForm.display) return;
    try {
      await api.post('/admin/emails/identities', {
        email_address: adminIdentityForm.email,
        display_name: adminIdentityForm.display
      });
      setAdminIdentityForm({ email: '', display: '' });
      loadEmails();
      toast.success('Identity created.');
    } catch (e) {
      toast.error('Error creating identity');
    }
  };

  const handleAdminDm = async ({ queue = false } = {}) => {
    const { email, display, user_id, subject, body } = adminDmForm;
    if (!email || !display || !user_id || !subject || !body) return;
    setAdminDmSending(true);
    try {
      const { data } = await api.post('/admin/emails/dm', {
        email_address: email,
        display_name: display,
        user_id: Number(user_id),
        subject,
        body,
        queue
      });
      setAdminDmOpen(false);
      setAdminDmForm({ email: '', display: '', user_id: '', subject: '', body: '' });
      await loadEmails();
      if (queue) {
        fetchPendingQueue();
      } else {
        // Auto-open the newly created thread
        const newThread = threads.find(t => t.id === data.thread_id) ||
          (await api.get('/admin/emails/threads').then(r => r.data.threads.find(t => t.id === data.thread_id)));
        if (newThread) openEmailThread(newThread);
      }
    } catch (e) {
      toast.error(formatApiError(e, 'Failed to send DM.'));
    } finally {
      setAdminDmSending(false);
    }
  };

  // On mobile: sidebar slides out when a thread is open; main slides in from the right
  const sidebarX = isMobile && selectedThread ? '-100%' : 0;
  const mainX    = isMobile && !selectedThread ? '100%'  : 0;
  const mainScale = isMobile ? 1 : (selectedThread !== null ? 1 : 0.98);

  return (
    <div className={`${styles.emailContainer} crt`}>
      <div className="crt-overlay"></div>

      {/* SIDEBAR */}
      <motion.aside
        className={`${styles.emailSidebar} chat-glass`}
        initial={false}
        animate={{ opacity: 1, x: sidebarX }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className={styles.emailHeader}>
          <h2>Inbox</h2>
          <div className={styles.headerActions}>
            <button
              onClick={toggleNotifications}
              className={styles.iconBtn}
              title={notifOn ? 'Notifications On' : 'Notifications Off'}
              aria-label="Toggle notifications"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ verticalAlign: 'middle' }}>
                {notifOn ? 'notifications_active' : 'notifications_off'}
              </span>
            </button>
            {isAdmin && (
              <>
                <button
                  className={styles.iconBtn}
                  title={`Pending (${pendingQueue.length})`}
                  onClick={() => setPendingOpen(true)}
                  style={{ position: 'relative', color: pendingQueue.length > 0 ? '#f59e0b' : undefined }}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ verticalAlign: 'middle' }}>schedule_send</span>
                  {pendingQueue.length > 0 && (
                    <span style={{ position: 'absolute', top: -2, right: -2, background: '#f59e0b', color: '#000', borderRadius: '50%', fontSize: '9px', fontWeight: 'bold', minWidth: 14, height: 14, lineHeight: '14px', textAlign: 'center' }}>
                      {pendingQueue.length}
                    </span>
                  )}
                </button>
                <button
                  className={styles.iconBtn}
                  title="New Direct Message"
                  onClick={() => setAdminDmOpen(true)}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ verticalAlign: 'middle' }}>edit_square</span>
                </button>
                <button
                  className={styles.iconBtn}
                  title="Manage Identities"
                  onClick={() => setAdminIdentitiesOpen(true)}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ verticalAlign: 'middle' }}>settings</span>
                </button>
              </>
            )}
            {!isAdmin && (
              <button
                className={`${styles.composeBtn} blood-border-glow`}
                onClick={() => setEmailComposeOpen(true)}
                title={commsEnabled ? 'Write a new email' : 'Surface Web is closed: write a draft to send later'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>{commsEnabled ? 'edit' : 'edit_note'}</span>{commsEnabled ? 'Compose' : 'Draft'}
              </button>
            )}
          </div>
        </div>
        {!isAdmin && (
          <DraftsDrawer
            drafts={newEmailDrafts.drafts}
            open={newDraftsOpen}
            onOpenChange={setNewDraftsOpen}
            commsEnabled={commsEnabled}
            nextOpening={nextOpening}
            network="Surface Web"
            title="Unsent emails"
            barId="email-new"
            html
            overlay={false}
            editingId={emailComposeOpen ? editingNewDraft : null}
            describe={(d) => `To ${d.to_address || '(no recipient)'} · ${d.subject || '(no subject)'}`}
            onSend={sendNewEmailDraft}
            onSent={(d) => newEmailDrafts.remove(d.id)}
            onDelete={(d) => newEmailDrafts.discard(d)}
            onEdit={editNewEmailDraft}
          />
        )}
        <div className={styles.threadList}>
          {loading && <Skeleton loading={true} name="email-system-loader" />}
          {!loading && threads.length === 0 && (
            <div className={styles.emptyStateText}>Your inbox is empty.</div>
          )}

          {/* ADMIN: Grouped player drawers */}
          {!loading && isAdmin && (() => {
            // Group threads by player (user_id)
            const playerMap = new Map();
            threads.forEach(t => {
              const key = t.user_id;
              if (!playerMap.has(key)) {
                playerMap.set(key, {
                  user_id: t.user_id,
                  user_name: t.user_name,
                  char_name: t.char_name,
                  threads: []
                });
              }
              playerMap.get(key).threads.push(t);
            });

            const unreadOf = p => p.threads.reduce((n, t) => n + (t.unread_count || 0), 0);
            // Players with unread mail first (stable sort keeps server order otherwise)
            return Array.from(playerMap.values()).sort((x, y) => (unreadOf(y) > 0) - (unreadOf(x) > 0)).map(player => {
              const isOpen = openDrawers.has(player.user_id);
              const unreadTotal = unreadOf(player);
              return (
                <div key={player.user_id}>
                  {/* Player header */}
                  <div
                    className={`${styles.playerDrawerHeader} ${isOpen ? styles.open : ''}`}
                    onClick={() => toggleDrawer(player.user_id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') toggleDrawer(player.user_id); }}
                  >
                    <Avatar
                      userId={player.user_id}
                      size={36}
                      style={{ borderRadius: '50%', flexShrink: 0 }}
                      fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(player.char_name || player.user_name)}&background=random`}
                    />
                    <div className={styles.playerDrawerInfo}>
                      <span className={styles.playerDrawerName}>{player.char_name || player.user_name}</span>
                      {player.char_name && (
                        <span className={styles.playerDrawerSub}>{player.user_name}</span>
                      )}
                    </div>
                    {unreadTotal > 0 && <span className={styles.unreadBadge}>{unreadTotal}</span>}
                    <span className={`material-symbols-outlined ${styles.drawerChevron} ${isOpen ? styles.open : ''}`}>expand_more</span>
                  </div>

                  {/* Identity thread rows (expanded) */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        className={styles.playerDrawerContent}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                      >
                        {player.threads.map(t => (
                          <div
                            key={t.id}
                            className={`${styles.identityThreadRow} ${selectedThread?.id === t.id ? styles.active : ''}`}
                            onClick={() => openEmailThread(t)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => { if (e.key === 'Enter') openEmailThread(t); }}
                          >
                            <Avatar
                              identityId={t.identity_id}
                              size={30}
                              style={{ borderRadius: '50%', flexShrink: 0 }}
                            />
                            <div className={styles.identityName}>
                              <span className={styles.identityNameLabel}>{t.identity_name}</span>
                              <span className={styles.identitySubject}>{t.subject}</span>
                            </div>
                            {t.unread_count > 0 && (
                              <span className={styles.unreadBadge}>{t.unread_count}</span>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            });
          })()}

          {/* NON-ADMIN: flat thread list */}
          {!loading && !isAdmin && threads.map(t => {
            const senderName = t.from_name;
            const avatarProps = { identityId: t.identity_id };
            return (
              <div
                key={t.id}
                className={`${styles.threadCard} ${selectedThread?.id === t.id ? styles.active : ''} ${t.unread_count > 0 ? styles.unread : ''}`}
                onClick={() => openEmailThread(t)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') openEmailThread(t); }}
              >
                <Avatar
                  {...avatarProps}
                  size={40}
                  className={styles.threadAvatar}
                />
                <div className={styles.threadContent}>
                  <div className={styles.threadTopRow}>
                    <span className={styles.threadSender}>{senderName}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <DraftBadge count={draftSummary.countFor('email', t.id)} />
                      <span className={styles.threadDate}>{formatAthensDate(t.updated_at)}</span>
                    </span>
                  </div>
                  <div className={styles.threadSubject}>{t.subject}</div>
                  <div className={styles.threadSnippet}>{t.snippet ? t.snippet.replace(/<[^>]+>/g, '').slice(0, 40) + '...' : 'No preview available'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.aside>

      {/* MAIN CONTENT (Reading Pane) */}
      <motion.main
        className={styles.emailMain}
        initial={false}
        animate={{ opacity: 1, x: mainX, scale: mainScale }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {selectedThread ? (
          <>
            <div className={styles.emailViewHeader}>
              <div className={styles.headerTopRow}>
                <button className={styles.mobileBackBtn} onClick={() => setSelectedThread(null)} aria-label="Back to inbox">
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1>{selectedThread.subject}</h1>
              </div>
              <div className={styles.emailParticipants}>
                {isAdmin
                  ? <span className={styles.particChip}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 6, opacity: 0.7, verticalAlign: 'middle' }}>person</span>
                      {selectedThread.char_name || selectedThread.user_name}
                      {selectedThread.char_name && (
                        <span style={{ opacity: 0.6, marginLeft: 6, fontSize: '0.75rem' }}>({selectedThread.user_name})</span>
                      )}
                    </span>
                  : <span className={styles.particChip}>From: {selectedThread.from_name} &lt;{selectedThread.from_email}&gt;</span>
                }
              </div>
            </div>

            {!isAdmin && (
              <DraftsDrawer
                drafts={replyDrafts.drafts}
                open={replyDraftsOpen}
                onOpenChange={setReplyDraftsOpen}
                commsEnabled={commsEnabled}
                nextOpening={nextOpening}
                network="Surface Web"
                barId="email-reply"
                html
                editingId={editingReplyDraft?.id}
                onSend={sendReplyDraft}
                onSent={sentReplyDraft}
                onDelete={deleteReplyDraft}
                onEdit={editReplyDraft}
              />
            )}

            <div className={styles.emailBodyScroll} ref={scrollContainerRef}>
              {emailMessages.map(m => {
                let msgName = 'Unknown';
                let avatarProps = {};

                if (m.sender_type === 'user') {
                  msgName = isAdmin ? (selectedThread.char_name || selectedThread.user_name) : 'Me';
                  // Admin view: use the player's userId from the thread object.
                  // Player view: selectedThread.user_id is not returned by /emails/my-inbox,
                  // so fall back to the logged-in user's own id.
                  avatarProps = { userId: isAdmin ? selectedThread.user_id : user?.id };
                } else {
                  msgName = isAdmin ? selectedThread.identity_name : selectedThread.from_name;
                  avatarProps = { identityId: selectedThread.identity_id };
                }

                const sentByUser = m.sender_type === 'user';
                return (
                  <motion.div
                    key={m.id}
                    className={`${styles.emailMsg} ${sentByUser ? styles.msgSentByUser : styles.msgSentByIdentity}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <Avatar
                      {...avatarProps}
                      size={36}
                      className={styles.msgAvatarOuter}
                      style={{ borderRadius: '50%', flexShrink: 0 }}
                      fallback={avatarProps.userId ? `https://ui-avatars.com/api/?name=${encodeURIComponent(msgName)}&background=random` : undefined}
                    />
                    <div className={styles.msgBubble}>
                      <div className={styles.msgMeta}>
                        <span className={styles.msgAuthor}>{msgName}</span>
                        <span className={styles.msgTime}>{formatAthensDateTime(m.created_at)}</span>
                        {m.status === 'queued' && (
                          <span style={{ color: '#f59e0b', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>schedule_send</span> Pending
                          </span>
                        )}
                      </div>
                      {/* CRITICAL SECURITY FIX: Sanitize HTML content to prevent XSS */}
                      <div
                        className={styles.emailMsgContent}
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.body) }}
                      />
                    </div>
                  </motion.div>
                );
              })}
              <div ref={emailEndRef} />
            </div>

            {!commsEnabled && (
              <div style={{ padding: '8px', background: '#FF4444', color: '#FFFFFF', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warning</span>
                <span>
                  SURFACE WEB COMMS ARE CURRENTLY OFFLINE : {nextOpening ? `OPENS AGAIN ${nextOpening.day.toUpperCase()} AT ${nextOpening.time} (${nextOpening.date})` : 'MESSAGE SENDING IS DISABLED'}
                  {isAdmin ? ' — queue this reply below, or send now anyway.' : ''}
                </span>
              </div>
            )}

            {isMobile && !replyOpen && !emailReplyBody ? (
              <div className={styles.emailReplyBox}>
                <button className={styles.btnPri} style={{ width: '100%', minHeight: 44 }} disabled={!canWriteReply} onClick={() => setReplyOpen(true)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 6 }}>{draftMode ? 'edit_note' : 'reply'}</span>{draftMode ? 'Write a draft' : 'Reply'}
                </button>
              </div>
            ) : (
            <div ref={replyBoxRef} className={styles.emailReplyBox} style={{ opacity: !canWriteReply ? 0.6 : 1, pointerEvents: !canWriteReply ? 'none' : 'auto' }}>
              {editingReplyDraft && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 6px 6px 10px', borderLeft: '2px solid #f59e0b', background: 'rgba(245,158,11,0.08)', borderRadius: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#f59e0b' }}>edit_note</span>
                  <span style={{ flex: 1, fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Editing draft</span>
                  <button type="button" onClick={cancelEditReplyDraft} className={styles.iconBtn} aria-label="Stop editing the draft" title="Stop editing: the draft stays as it was">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                  </button>
                </div>
              )}
              <TextEditor
                value={emailReplyBody}
                onChange={setEmailReplyBody}
                placeholder={draftMode ? (nextOpening ? `Offline : write a draft, send it after ${nextOpening.day} ${nextOpening.time}` : 'Offline : write a draft, send it later') : !canComposeReply ? (nextOpening ? `Offline : Opens again ${nextOpening.day} at ${nextOpening.time}` : "System Offline...") : "Reply..."}
                disabled={!canWriteReply}
              />
              <div style={{ textAlign: 'right', marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                {draftMode ? (
                  <button onClick={saveReplyDraft} className={styles.btnPri} disabled={!hasHtmlText(emailReplyBody)} title="Keep as a draft: you send it yourself once Surface Web opens">
                    <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>{editingReplyDraft ? 'save' : 'edit_note'}</span>
                    {editingReplyDraft ? 'Save Draft' : 'Keep as Draft'}
                  </button>
                ) : !commsEnabled && isAdmin ? (
                  <>
                    <button onClick={() => handleEmailReply({ queue: true })} className={styles.btnSec} disabled={replySending || !emailReplyBody.trim()} title="Queue — sends automatically when SurfaceWeb reopens">
                      Queue
                    </button>
                    <button onClick={() => handleEmailReply({ queue: false })} className={styles.btnPri} disabled={replySending || !emailReplyBody.trim()} title="Send now anyway (bypasses the offline gate)">
                      Send Now
                    </button>
                  </>
                ) : (
                  <>
                    {editingReplyDraft && (
                      <button onClick={saveReplyDraft} className={styles.btnSec} disabled={replySending || !hasHtmlText(emailReplyBody)}>Keep Draft</button>
                    )}
                    <button onClick={() => handleEmailReply()} className={styles.btnPri} disabled={!canComposeReply || replySending}>Send Reply</button>
                  </>
                )}
              </div>
            </div>
            )}
          </>
        ) : (
          <div className={styles.placeholderLight}>
            <span className={`material-symbols-outlined ${styles.emptyIcon}`} style={{ fontSize: 64 }}>mail</span>
            <p>Select an email thread to read</p>
          </div>
        )}
      </motion.main>

      {/* Compose Email Modal */}
      {emailComposeOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h3>{editingNewDraft ? 'Edit Draft' : commsEnabled ? 'New Message' : 'New Draft'}</h3>
            {!commsEnabled && (
              <p style={{ fontSize: '0.75rem', color: '#f59e0b', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock_clock</span>
                Surface Web is closed{nextOpening ? ` until ${nextOpening.day} ${nextOpening.time}` : ''}. This is kept as a draft; you send it yourself once it opens.
              </p>
            )}
            <input
              className={styles.input}
              placeholder="To"
              value={emailForm.to}
              onChange={e => setEmailForm({ ...emailForm, to: e.target.value })}
              autoFocus
            />
            <input
              className={styles.input}
              placeholder="Subject"
              value={emailForm.subject}
              onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })}
            />
            <div style={{ flex: 1, minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
              <TextEditor
                value={emailForm.body}
                onChange={(val) => setEmailForm({ ...emailForm, body: val })}
                placeholder="Type your message here..."
              />
            </div>
            <div className={styles.modalActions}>
              <button onClick={resetCompose} className={styles.btnSec}>{editingNewDraft ? 'Cancel' : 'Discard'}</button>
              {(!commsEnabled || editingNewDraft) && (
                <button
                  className={commsEnabled ? styles.btnSec : styles.btnPri}
                  onClick={saveNewEmailDraft}
                  disabled={!emailForm.subject.trim() && !hasHtmlText(emailForm.body)}
                >
                  {editingNewDraft ? 'Save Draft' : 'Keep as Draft'}
                </button>
              )}
              {commsEnabled && (
                <button className={styles.btnPri} onClick={handleEmailSend} disabled={!emailForm.to || !emailForm.subject}>Send</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Identities Modal */}
      {adminIdentitiesOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h3>Email Identities</h3>
            <div className={styles.memberSelect} style={{ maxHeight: 300, overflowY: 'auto' }}>
              {adminEmailIdentities.length === 0 ? (
                <p className={styles.emptyStateText}>No identities created yet.</p>
              ) : (
                adminEmailIdentities.map(i => (
                  <div key={i.id} className={styles.identityRow}>
                    <Avatar
                      identityId={i.id}
                      size={44}
                      editable={true}
                      style={{ borderRadius: '50%', flexShrink: 0 }}
                      onUploadSuccess={() => loadEmails()}
                    />
                    <span style={{ flex: 1, marginLeft: 10 }}><b>{i.display_name}</b> <br /><small>{i.email_address}</small></span>
                    <button
                      className={styles.btnSec}
                      onClick={async () => {
                        if (!window.confirm(`Delete the identity "${i.display_name}" <${i.email_address}>? This cannot be undone.`)) return;
                        try {
                          await api.delete(`/admin/emails/identities/${i.id}`);
                          loadEmails();
                        } catch (e) {
                          toast.error('Failed to delete identity.');
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className={styles.modalSeparator} />
            <h4>Create Identity</h4>
            <input
              className={styles.input}
              placeholder="Name (e.g. Mayor)"
              value={adminIdentityForm.display}
              onChange={e => setAdminIdentityForm({ ...adminIdentityForm, display: e.target.value })}
            />
            <input
              className={styles.input}
              placeholder="Email (e.g. mayor@city.gov)"
              value={adminIdentityForm.email}
              onChange={e => setAdminIdentityForm({ ...adminIdentityForm, email: e.target.value })}
            />
            <div className={styles.modalActions}>
              <button onClick={() => setAdminIdentitiesOpen(false)} className={styles.btnSec}>Close</button>
              <button
                className={styles.btnPri}
                onClick={handleCreateIdentity}
                disabled={!adminIdentityForm.display || !adminIdentityForm.email}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Direct Message Modal */}
      {adminDmOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h3>New Direct Message</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #aaa)', marginBottom: 8 }}>
              Create a new in-fiction identity and instantly open a thread with a Kindred.
            </p>

            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted, #aaa)' }}>Target Kindred</label>
            <select
              className={styles.input}
              value={adminDmForm.user_id}
              onChange={e => setAdminDmForm({ ...adminDmForm, user_id: e.target.value })}
            >
              <option value="">Select a Kindred...</option>
              {allPlayers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.display_name}{p.char_name ? ` (${p.char_name})` : ''}
                </option>
              ))}
            </select>

            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted, #aaa)', marginTop: 8 }}>Sender Identity</label>
            <select
              className={styles.input}
              onChange={e => {
                const selected = adminEmailIdentities.find(id => id.id === parseInt(e.target.value));
                if (selected) {
                  setAdminDmForm({ ...adminDmForm, display: selected.display_name, email: selected.email_address });
                }
              }}
              defaultValue=""
            >
              <option value="">-- Custom / Type below --</option>
              {adminEmailIdentities.map(i => (
                <option key={i.id} value={i.id}>{i.display_name} &lt;{i.email_address}&gt;</option>
              ))}
            </select>

            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted, #aaa)', marginTop: 8 }}>Sender Display Name</label>
            <input
              className={styles.input}
              placeholder="e.g. Cardinal Vasquez"
              value={adminDmForm.display}
              onChange={e => setAdminDmForm({ ...adminDmForm, display: e.target.value })}
            />

            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted, #aaa)', marginTop: 8 }}>Sender Email Address</label>
            <input
              className={styles.input}
              placeholder="e.g. cardinal@camarilla.net"
              value={adminDmForm.email}
              onChange={e => setAdminDmForm({ ...adminDmForm, email: e.target.value })}
            />

            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted, #aaa)', marginTop: 8 }}>Subject</label>
            <input
              className={styles.input}
              placeholder="Subject"
              value={adminDmForm.subject}
              onChange={e => setAdminDmForm({ ...adminDmForm, subject: e.target.value })}
            />

            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted, #aaa)', marginTop: 8 }}>Message</label>
            <div style={{ flex: 1, minHeight: '160px', display: 'flex', flexDirection: 'column' }}>
              <TextEditor
                value={adminDmForm.body}
                onChange={val => setAdminDmForm({ ...adminDmForm, body: val })}
                placeholder="Type the opening message..."
              />
            </div>

            {!commsEnabled && (
              <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: 8 }}>
                SurfaceWeb is offline — queue this DM to auto-send when it reopens, or send it now anyway.
              </p>
            )}

            <div className={styles.modalActions}>
              <button
                onClick={() => { setAdminDmOpen(false); setAdminDmForm({ email: '', display: '', user_id: '', subject: '', body: '' }); }}
                className={styles.btnSec}
                disabled={adminDmSending}
              >
                Cancel
              </button>
              {!commsEnabled ? (
                <>
                  <button
                    className={styles.btnSec}
                    onClick={() => handleAdminDm({ queue: true })}
                    disabled={adminDmSending || !adminDmForm.email || !adminDmForm.display || !adminDmForm.user_id || !adminDmForm.subject || !adminDmForm.body}
                    title="Queue — sends automatically when SurfaceWeb reopens"
                  >
                    {adminDmSending ? 'Sending...' : 'Queue'}
                  </button>
                  <button
                    className={styles.btnPri}
                    onClick={() => handleAdminDm({ queue: false })}
                    disabled={adminDmSending || !adminDmForm.email || !adminDmForm.display || !adminDmForm.user_id || !adminDmForm.subject || !adminDmForm.body}
                    title="Send now anyway (bypasses the offline gate)"
                  >
                    {adminDmSending ? 'Sending...' : 'Send Now'}
                  </button>
                </>
              ) : (
                <button
                  className={styles.btnPri}
                  onClick={() => handleAdminDm()}
                  disabled={adminDmSending || !adminDmForm.email || !adminDmForm.display || !adminDmForm.user_id || !adminDmForm.subject || !adminDmForm.body}
                >
                  {adminDmSending ? 'Sending...' : 'Send DM'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending (Queued NPC-identity Emails) Panel */}
      {pendingOpen && (
        <div className={styles.modalBackdrop} onClick={() => setPendingOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Pending Emails</h3>
            {nextOpening && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #aaa)', marginBottom: 8 }}>
                Auto-sends when SurfaceWeb reopens: {nextOpening.formatted}
              </p>
            )}
            <div className={styles.memberSelect} style={{ maxHeight: 320, overflowY: 'auto' }}>
              {pendingLoading && pendingQueue.length === 0 && <p className={styles.emptyStateText}>Loading...</p>}
              {!pendingLoading && pendingQueue.length === 0 && <p className={styles.emptyStateText}>Nothing queued.</p>}
              {pendingQueue.map(m => (
                <div key={m.id} className={styles.identityRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.8rem' }}>
                      <b>{m.identity_name}</b> <span style={{ opacity: 0.7 }}><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>arrow_forward</span> {m.char_name || m.user_display_name}</span>
                      <br /><small style={{ opacity: 0.6 }}>{m.subject}</small>
                    </span>
                    <button className={styles.btnSec} onClick={() => cancelPendingMessage(m.id)}>Cancel</button>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setPendingOpen(false)} className={styles.btnSec}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}