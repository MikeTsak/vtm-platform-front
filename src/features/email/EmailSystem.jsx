// src/components/EmailSystem.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import api, { formatApiError } from '../../core/api';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import styles from '../../styles/EmailSystem.module.css';
import { Skeleton } from 'boneyard-js/react';
import Avatar from '../../components/Avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommsEnabled } from '../comms/useCommsEnabled';
import { formatAthensDate, formatAthensDateTime } from '../../utils/dateFormatter';

// --- Secure Rich Text Editor Component ---
const EditorToolbar = ({ onCmd }) => (
  <div className={styles.toolbar}>
    <button type="button" onClick={() => onCmd('bold')} title="Bold"><b>B</b></button>
    <button type="button" onClick={() => onCmd('italic')} title="Italic"><i>I</i></button>
    <button type="button" onClick={() => onCmd('underline')} title="Underline"><u>U</u></button>
    <button type="button" onClick={() => onCmd('formatBlock', 'H3')} title="Heading 3">H3</button>
    <button type="button" onClick={() => onCmd('justifyLeft')} title="Align Left">L</button>
    <button type="button" onClick={() => onCmd('justifyCenter')} title="Align Center">C</button>
    <button type="button" onClick={() => onCmd('insertUnorderedList')} title="Bullet List">• List</button>
  </div>
);

const TextEditor = ({ value, onChange, placeholder, disabled = false }) => {
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current && (value === '' || value === '<br>')) {
      contentRef.current.innerHTML = '';
    }
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
  const isAdmin = user?.role === 'admin';
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

  const emailEndRef = useRef(null);
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
    new Notification(title, { body, icon: icon || '/img/ATT-logo(1).webp' });
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
      if (isAdmin) {
        const { data } = await api.get('/admin/emails/threads', { signal });
        checkNewEmails(data.threads);
        setThreads(data.threads);
        const { data: idData } = await api.get('/admin/emails/identities', { signal });
        setAdminEmailIdentities(idData.identities);
      } else {
        const { data } = await api.get('/emails/my-inbox', { signal });
        checkNewEmails(data.threads);
        setThreads(data.threads);
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
      alert('Failed to cancel queued message.');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadEmails(false, controller.signal);

    const interval = setInterval(() => {
      loadEmails(true);
    }, 15000);

    return () => {
      clearInterval(interval);
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
    try {
      const url = isAdmin ? `/admin/emails/threads/${t.id}` : `/emails/thread/${t.id}`;
      const { data } = await api.get(url);
      setEmailMessages(data.messages);
      setThreads(prev => prev.map(th => th.id === t.id ? { ...th, unread_count: 0 } : th));
      setTimeout(() => scrollToBottom('instant'), 80);
    } catch (e) {
      alert('Failed to load email thread. Please try again.');
    }
  };

  const canComposeReply = commsEnabled || isAdmin;

  const handleEmailReply = async ({ queue = false } = {}) => {
    if (!canComposeReply || !emailReplyBody.trim() || replySending) return;
    setReplySending(true);
    try {
      const endpoint = isAdmin ? '/admin/emails/reply' : '/emails/send';
      await api.post(endpoint, { thread_id: selectedThread.id, body: emailReplyBody, queue });
      setEmailReplyBody('');
      const url = isAdmin ? `/admin/emails/threads/${selectedThread.id}` : `/emails/thread/${selectedThread.id}`;
      const { data } = await api.get(url);
      setEmailMessages(data.messages);
      setTimeout(() => scrollToBottom(), 80);
      if (queue) fetchPendingQueue();
    } catch (e) {
      alert('Failed to reply to email.');
    } finally {
      setReplySending(false);
    }
  };

  const handleEmailSend = async (e) => {
    e.preventDefault();
    if (!commsEnabled) return;
    try {
      await api.post('/emails/send', {
        to_email: emailForm.to,
        subject: emailForm.subject,
        body: emailForm.body
      });
      setEmailComposeOpen(false);
      setEmailForm({ to: '', subject: '', body: '' });
      loadEmails();
      alert('Email Sent Successfully.');
    } catch (e) {
      if (e.response?.status === 404) {
        alert('Delivery Status Notification: The specified email address does not exist.');
      } else {
        alert('Failed to send email.');
      }
    }
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
      alert('Identity created successfully');
    } catch (e) {
      alert('Error creating identity');
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
      alert(formatApiError(e, 'Failed to send DM.'));
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
            {!isAdmin && commsEnabled && (
              <button className={`${styles.composeBtn} blood-border-glow`} onClick={() => setEmailComposeOpen(true)}>
                + Compose
              </button>
            )}
          </div>
        </div>
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

            return Array.from(playerMap.values()).map(player => {
              const isOpen = openDrawers.has(player.user_id);
              const hasUnread = player.threads.some(t => t.unread_count > 0);
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
                    {hasUnread && <span className={styles.drawerUnreadDot} />}
                    <i className={`fa-solid fa-chevron-down ${styles.drawerChevron} ${isOpen ? styles.open : ''}`} />
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
                    <span className={styles.threadDate}>{formatAthensDate(t.updated_at)}</span>
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
                <button className={styles.mobileBackBtn} onClick={() => setSelectedThread(null)}>← Back</button>
                <h1>{selectedThread.subject}</h1>
              </div>
              <div className={styles.emailParticipants}>
                {isAdmin
                  ? <span className={styles.particChip}>
                      <i className="fa-solid fa-user" style={{ marginRight: 6, opacity: 0.7 }} />
                      {selectedThread.char_name || selectedThread.user_name}
                      {selectedThread.char_name && (
                        <span style={{ opacity: 0.6, marginLeft: 6, fontSize: '0.75rem' }}>({selectedThread.user_name})</span>
                      )}
                    </span>
                  : <span className={styles.particChip}>From: {selectedThread.from_name} &lt;{selectedThread.from_email}&gt;</span>
                }
              </div>
            </div>

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

            <div className={styles.emailReplyBox} style={{ opacity: !canComposeReply ? 0.6 : 1, pointerEvents: !canComposeReply ? 'none' : 'auto' }}>
              <TextEditor
                value={emailReplyBody}
                onChange={setEmailReplyBody}
                placeholder={!canComposeReply ? (nextOpening ? `Offline : Opens again ${nextOpening.day} at ${nextOpening.time}` : "System Offline...") : "Reply..."}
                disabled={!canComposeReply}
              />
              <div style={{ textAlign: 'right', marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                {!commsEnabled && isAdmin ? (
                  <>
                    <button onClick={() => handleEmailReply({ queue: true })} className={styles.btnSec} disabled={replySending || !emailReplyBody.trim()} title="Queue — sends automatically when SurfaceWeb reopens">
                      Queue
                    </button>
                    <button onClick={() => handleEmailReply({ queue: false })} className={styles.btnPri} disabled={replySending || !emailReplyBody.trim()} title="Send now anyway (bypasses the offline gate)">
                      Send Now
                    </button>
                  </>
                ) : (
                  <button onClick={() => handleEmailReply()} className={styles.btnPri} disabled={!canComposeReply || replySending}>Send Reply</button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className={styles.placeholderLight}>
            <div className={styles.emptyIcon}>✉️</div>
            <p>Select an email thread to read</p>
          </div>
        )}
      </motion.main>

      {/* Compose Email Modal */}
      {emailComposeOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h3>New Message</h3>
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
              <button onClick={() => setEmailComposeOpen(false)} className={styles.btnSec}>Discard</button>
              <button className={styles.btnPri} onClick={handleEmailSend} disabled={!emailForm.to || !emailForm.subject}>Send</button>
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
                        await api.delete(`/admin/emails/identities/${i.id}`);
                        loadEmails();
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
              Create a new in-fiction identity and instantly open a thread with a player.
            </p>

            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted, #aaa)' }}>Target Player</label>
            <select
              className={styles.input}
              value={adminDmForm.user_id}
              onChange={e => setAdminDmForm({ ...adminDmForm, user_id: e.target.value })}
            >
              <option value="">Select a player...</option>
              {allPlayers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.display_name}{p.char_name ? ` (${p.char_name})` : ''}
                </option>
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
                      <b>{m.identity_name}</b> <span style={{ opacity: 0.7 }}>➜ {m.char_name || m.user_display_name}</span>
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