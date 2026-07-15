// src/components/EmailSystem.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import api from '../../core/api';
import styles from '../../styles/EmailSystem.module.css';
import { Skeleton } from 'boneyard-js/react';
import Avatar from '../../components/Avatar';

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

export default function EmailSystem({ user, isMobile, commsEnabled = true }) {
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

  const emailEndRef = useRef(null);
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
    new Notification(title, { body, icon: icon || '/img/ATT-logo(1).png' });
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

  const openEmailThread = async (t) => {
    setSelectedThread(t);
    try {
      const url = isAdmin ? `/admin/emails/threads/${t.id}` : `/emails/thread/${t.id}`;
      const { data } = await api.get(url);
      setEmailMessages(data.messages);
      setThreads(prev => prev.map(th => th.id === t.id ? { ...th, unread_count: 0 } : th));
      setTimeout(() => emailEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch(e) { 
      alert('Failed to load email thread. Please try again.'); 
    }
  };

  const handleEmailReply = async () => {
    if (!commsEnabled || !emailReplyBody.trim()) return;
    try {
      const endpoint = isAdmin ? '/admin/emails/reply' : '/emails/send';
      await api.post(endpoint, { thread_id: selectedThread.id, body: emailReplyBody });
      setEmailReplyBody('');
      const url = isAdmin ? `/admin/emails/threads/${selectedThread.id}` : `/emails/thread/${selectedThread.id}`;
      const { data } = await api.get(url);
      setEmailMessages(data.messages);
      setTimeout(() => emailEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch(e) { 
      alert('Failed to reply to email.'); 
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
    } catch(e) {
      if(e.response?.status === 404) {
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
    } catch(e) { 
      alert('Error creating identity'); 
    }
  };

  return (
    <div className={`${styles.emailContainer} ${selectedThread && isMobile ? styles.mobileViewActive : ''} crt`}>
      <div className="crt-overlay"></div>
      
      {/* SIDEBAR */}
      <aside className={`${styles.emailSidebar} chat-glass`}>
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
              <button 
                className={styles.iconBtn} 
                title="Manage Identities" 
                onClick={() => setAdminIdentitiesOpen(true)}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ verticalAlign: 'middle' }}>settings</span>
              </button>
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
          {!loading && threads.map(t => {
            const senderName = isAdmin ? t.user_name : t.from_name;
            const avatarProps = isAdmin ? { userId: t.user_id } : { identityId: t.identity_id };
            return (
              <div 
                key={t.id} 
                className={`${styles.threadCard} ${selectedThread?.id === t.id ? styles.active : ''} ${t.unread_count > 0 ? styles.unread : ''}`} 
                onClick={() => openEmailThread(t)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if(e.key === 'Enter') openEmailThread(t); }}
              >
                <Avatar 
                  {...avatarProps} 
                  size={40} 
                  className={styles.threadAvatar} 
                  fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`} 
                />
                <div className={styles.threadContent}>
                  <div className={styles.threadTopRow}>
                    <span className={styles.threadSender}>{senderName}</span>
                    <span className={styles.threadDate}>{new Date(t.updated_at).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.threadSubject}>{t.subject}</div>
                  <div className={styles.threadSnippet}>{t.snippet ? t.snippet.replace(/<[^>]+>/g, '').slice(0, 40) + '...' : 'No preview available'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* MAIN CONTENT (Reading Pane) */}
      <main className={styles.emailMain}>
        {selectedThread ? (
          <>
            <div className={styles.emailViewHeader}>
              <div className={styles.headerTopRow}>
                <button className={styles.mobileBackBtn} onClick={() => setSelectedThread(null)}>← Back</button>
                <h1>{selectedThread.subject}</h1>
              </div>
              <div className={styles.emailParticipants}>
                {isAdmin 
                  ? <span className={styles.particChip}>👤 {selectedThread.user_name}</span>
                  : <span className={styles.particChip}>From: {selectedThread.from_name} &lt;{selectedThread.from_email}&gt;</span>
                }
              </div>
            </div>
            
            <div className={styles.emailBodyScroll}>
              {emailMessages.map(m => {
                let msgName = 'Unknown';
                let avatarProps = {};
                
                if (m.sender_type === 'user') {
                    msgName = isAdmin ? selectedThread.user_name : 'Me';
                    avatarProps = { userId: selectedThread.user_id };
                } else {
                    msgName = isAdmin ? selectedThread.identity_name : selectedThread.from_name;
                    avatarProps = { identityId: selectedThread.identity_id };
                }

                return (
                  <div key={m.id} className={styles.emailMsg}>
                    <div className={styles.msgHeader}>
                      <Avatar 
                        {...avatarProps} 
                        size={36} 
                        className={styles.msgAvatar} 
                        style={{ borderRadius: '50%' }} 
                        fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(msgName)}&background=random`} 
                      />
                      <div className={styles.msgMeta}>
                         <span className={styles.msgAuthor}>{msgName}</span>
                         <span className={styles.msgTime}>{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    {/* CRITICAL SECURITY FIX: Sanitize HTML content to prevent XSS */}
                    <div 
                      className={styles.emailMsgContent} 
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.body) }} 
                    />
                  </div>
                );
              })}
              <div ref={emailEndRef} />
            </div>

            {!commsEnabled && (
              <div style={{ padding: '8px', background: '#FF4444', color: '#FFFFFF', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold' }}>
                ⚠️ SURFACE WEB COMMS ARE CURRENTLY OFFLINE. MESSAGE SENDING IS DISABLED. ⚠️
              </div>
            )}
            
            <div className={styles.emailReplyBox} style={{ opacity: !commsEnabled ? 0.6 : 1, pointerEvents: !commsEnabled ? 'none' : 'auto' }}>
               <TextEditor 
                 value={emailReplyBody} 
                 onChange={setEmailReplyBody} 
                 placeholder={!commsEnabled ? "System Offline..." : "Reply..."} 
                 disabled={!commsEnabled}
               />
               <div style={{ textAlign: 'right', marginTop:'10px' }}>
                  <button onClick={handleEmailReply} className={styles.btnPri} disabled={!commsEnabled}>Send Reply</button>
               </div>
            </div>
          </>
        ) : (
          <div className={styles.placeholderLight}>
            <div className={styles.emptyIcon}>✉️</div>
            <p>Select an email thread to read</p>
          </div>
        )}
      </main>

      {/* Compose Email Modal */}
      {emailComposeOpen && (
        <div className={styles.modalBackdrop}>
           <div className={styles.modal}>
              <h3>New Message</h3>
              <input 
                className={styles.input} 
                placeholder="To" 
                value={emailForm.to} 
                onChange={e => setEmailForm({...emailForm, to: e.target.value})} 
                autoFocus
              />
              <input 
                className={styles.input} 
                placeholder="Subject" 
                value={emailForm.subject} 
                onChange={e => setEmailForm({...emailForm, subject: e.target.value})} 
              />
              <div style={{ flex: 1, minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
                <TextEditor 
                  value={emailForm.body} 
                  onChange={(val) => setEmailForm({...emailForm, body: val})} 
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
                         <span><b>{i.display_name}</b> <br/><small>{i.email_address}</small></span>
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
                onChange={e => setAdminIdentityForm({...adminIdentityForm, display: e.target.value})} 
              />
              <input 
                className={styles.input} 
                placeholder="Email (e.g. mayor@city.gov)" 
                value={adminIdentityForm.email} 
                onChange={e => setAdminIdentityForm({...adminIdentityForm, email: e.target.value})} 
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
    </div>
  );
}