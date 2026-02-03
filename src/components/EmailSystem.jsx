// src/pages/EmailSystem.jsx
import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import styles from '../styles/EmailSystem.module.css';

// --- Internal Rich Text Editor Components ---
const EditorToolbar = ({ onCmd }) => (
  <div className={styles.toolbar}>
    <button type="button" onClick={() => onCmd('bold')}><b>B</b></button>
    <button type="button" onClick={() => onCmd('italic')}><i>I</i></button>
    <button type="button" onClick={() => onCmd('underline')}><u>U</u></button>
    <button type="button" onClick={() => onCmd('formatBlock', 'H3')}>H3</button>
    <button type="button" onClick={() => onCmd('justifyLeft')}>L</button>
    <button type="button" onClick={() => onCmd('justifyCenter')}>C</button>
    <button type="button" onClick={() => onCmd('insertUnorderedList')}>• List</button>
  </div>
);

const TextEditor = ({ value, onChange, placeholder }) => {
  const contentRef = useRef(null);
  useEffect(() => {
    if (contentRef.current && (value === '' || value === '<br>')) {
      contentRef.current.innerHTML = '';
    }
  }, [value]);
  const executeCmd = (cmd, val) => {
    document.execCommand(cmd, false, val);
    contentRef.current.focus();
    onChange(contentRef.current.innerHTML);
  };
  return (
    <div className={styles.editorContainer}>
      <EditorToolbar onCmd={executeCmd} />
      <div 
        className={styles.editable}
        contentEditable
        ref={contentRef}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
      />
    </div>
  );
};

// --- Helper for Avatars ---
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase().slice(0, 2);
};

const getColor = (str) => {
  if (!str) return '#333'; // Fallback color to prevent crash
  const colors = ['#b71c1c', '#880e4f', '#4a148c', '#311b92', '#1a237e', '#01579b', '#006064', '#004d40', '#1b5e20', '#33691e', '#827717', '#f57f17', '#ff6f00', '#e65100', '#bf360c'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function EmailSystem({ user, isMobile }) {
  const isAdmin = user?.role === 'admin';
  const [loading, setLoading] = useState(false);
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

  // Load Threads
  const loadEmails = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const { data } = await api.get('/admin/emails/threads');
        setThreads(data.threads);
        const { data: idData } = await api.get('/admin/emails/identities');
        setAdminEmailIdentities(idData.identities);
      } else {
        const { data } = await api.get('/emails/my-inbox');
        setThreads(data.threads);
      }
    } catch (e) {
      console.error('Failed to load emails', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadEmails(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const openEmailThread = async (t) => {
    setSelectedThread(t);
    try {
      const url = isAdmin ? `/admin/emails/threads/${t.id}` : `/emails/thread/${t.id}`;
      const { data } = await api.get(url);
      setEmailMessages(data.messages);
      setThreads(prev => prev.map(th => th.id === t.id ? { ...th, unread_count: 0 } : th));
      setTimeout(() => emailEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch(e) { alert('Failed to load email'); }
  };

  const handleEmailReply = async () => {
    if (!emailReplyBody.trim()) return;
    try {
      const endpoint = isAdmin ? '/admin/emails/reply' : '/emails/send';
      await api.post(endpoint, { thread_id: selectedThread.id, body: emailReplyBody });
      setEmailReplyBody('');
      const url = isAdmin ? `/admin/emails/threads/${selectedThread.id}` : `/emails/thread/${selectedThread.id}`;
      const { data } = await api.get(url);
      setEmailMessages(data.messages);
      setTimeout(() => emailEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch(e) { alert('Failed to reply'); }
  };

  const handleEmailSend = async (e) => {
    e.preventDefault();
    try {
      await api.post('/emails/send', { 
        to_email: emailForm.to, 
        subject: emailForm.subject, 
        body: emailForm.body 
      });
      setEmailComposeOpen(false);
      setEmailForm({ to: '', subject: '', body: '' });
      loadEmails();
      alert('Email Sent.');
    } catch(e) {
      if(e.response?.status === 404) alert('Delivery Status Notification: Address does not exist.');
      else alert('Failed to send.');
    }
  };

  const handleCreateIdentity = async () => {
    try {
      await api.post('/admin/emails/identities', { 
        email_address: adminIdentityForm.email,
        display_name: adminIdentityForm.display
      });
      setAdminIdentityForm({ email: '', display: '' });
      loadEmails();
      alert('Identity created');
    } catch(e) { alert('Error creating identity'); }
  };

  return (
    <div className={`${styles.emailContainer} ${selectedThread ? styles.mobileViewActive : ''}`}>
      {/* SIDEBAR */}
      <aside className={styles.emailSidebar}>
        <div className={styles.emailHeader}>
          <h2>Inbox</h2>
          <div className={styles.headerActions}>
            {isAdmin && <button className={styles.iconBtn} title="Manage" onClick={()=>setAdminIdentitiesOpen(true)}>⚙️</button>}
            {!isAdmin && <button className={styles.composeBtn} onClick={()=>setEmailComposeOpen(true)}>+ Compose</button>}
          </div>
        </div>
        <div className={styles.threadList}>
          {loading && <div className={styles.loading}>Checking mail...</div>}
          {threads.map(t => {
            const senderName = isAdmin ? t.user_name : t.from_name;
            const avatarColor = getColor(senderName || 'Unknown');
            return (
              <div key={t.id} className={`${styles.threadCard} ${selectedThread?.id===t.id?styles.active:''} ${t.unread_count>0?styles.unread:''}`} onClick={()=>openEmailThread(t)}>
                <div className={styles.threadAvatar} style={{backgroundColor: avatarColor}}>
                  {getInitials(senderName)}
                </div>
                <div className={styles.threadContent}>
                  <div className={styles.threadTopRow}>
                    <span className={styles.threadSender}>{senderName}</span>
                    <span className={styles.threadDate}>{new Date(t.updated_at).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.threadSubject}>{t.subject}</div>
                  <div className={styles.threadSnippet}>{t.snippet ? t.snippet.replace(/<[^>]+>/g, '').slice(0, 40) + '...' : 'No preview'}</div>
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
                <button className={styles.mobileBackBtn} onClick={() => setSelectedThread(null)}>←</button>
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
                // DETERMINE DISPLAY NAME SAFELY FOR BOTH ADMIN AND PLAYER
                let msgName = 'Unknown';
                if (m.sender_type === 'user') {
                    // If message is from a user:
                    // - Player view: It's 'Me'
                    // - Admin view: It's the User Name
                    msgName = isAdmin ? selectedThread.user_name : 'Me';
                } else {
                    // If message is from identity (NPC):
                    // - Player view: It's the Sender Name (from_name)
                    // - Admin view: It's the Identity Name
                    msgName = isAdmin ? selectedThread.identity_name : selectedThread.from_name;
                }

                return (
                  <div key={m.id} className={styles.emailMsg}>
                    <div className={styles.msgHeader}>
                      <div className={styles.msgAvatar} style={{backgroundColor: getColor(msgName)}}>
                        {getInitials(msgName)}
                      </div>
                      <div className={styles.msgMeta}>
                        <span className={styles.msgAuthor}>{msgName}</span>
                        <span className={styles.msgTime}>{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className={styles.emailMsgContent} dangerouslySetInnerHTML={{ __html: m.body }} />
                  </div>
                );
              })}
              <div ref={emailEndRef} />
            </div>
            
            <div className={styles.emailReplyBox}>
               <TextEditor value={emailReplyBody} onChange={setEmailReplyBody} placeholder="Reply..." />
               <div style={{ textAlign: 'right', marginTop:'10px' }}>
                  <button onClick={handleEmailReply} className={styles.btnPri}>Send</button>
               </div>
            </div>
          </>
        ) : (
          <div className={styles.placeholderLight}>
            <div className={styles.emptyIcon}>✉️</div>
            <p>Select an item to read</p>
          </div>
        )}
      </main>

      {/* Modals */}
      {emailComposeOpen && (
        <div className={styles.modalBackdrop}>
           <div className={styles.modal}>
              <h3>New Message</h3>
              <input className={styles.input} placeholder="To" value={emailForm.to} onChange={e=>setEmailForm({...emailForm, to:e.target.value})} />
              <input className={styles.input} placeholder="Subject" value={emailForm.subject} onChange={e=>setEmailForm({...emailForm, subject:e.target.value})} />
              <div style={{flex: 1, minHeight: '200px', display: 'flex', flexDirection: 'column'}}>
                <TextEditor value={emailForm.body} onChange={(val) => setEmailForm({...emailForm, body: val})} placeholder="Type here..." />
              </div>
              <div className={styles.modalActions}>
                 <button onClick={()=>setEmailComposeOpen(false)} className={styles.btnSec}>Discard</button>
                 <button className={styles.btnPri} onClick={handleEmailSend}>Send</button>
              </div>
           </div>
        </div>
      )}
      
      {adminIdentitiesOpen && (
        <div className={styles.modalBackdrop}>
           <div className={styles.modal}>
              <h3>Email Identities</h3>
              <div className={styles.memberSelect} style={{maxHeight: 300, overflowY: 'auto'}}>
                 {adminEmailIdentities.map(i => (
                    <div key={i.id} className={styles.identityRow}>
                       <span><b>{i.display_name}</b> <br/><small>{i.email_address}</small></span>
                       <button className={styles.btnSec} onClick={async()=>{ await api.delete(`/admin/emails/identities/${i.id}`); loadEmails(); }}>Del</button>
                    </div>
                 ))}
              </div>
              <div className={styles.modalSeparator} />
              <h4>Create Identity</h4>
              <input className={styles.input} placeholder="Name (e.g. Mayor)" value={adminIdentityForm.display} onChange={e=>setAdminIdentityForm({...adminIdentityForm, display:e.target.value})} />
              <input className={styles.input} placeholder="Email (e.g. mayor@city.gov)" value={adminIdentityForm.email} onChange={e=>setAdminIdentityForm({...adminIdentityForm, email:e.target.value})} />
              <div className={styles.modalActions}>
                 <button onClick={()=>setAdminIdentitiesOpen(false)} className={styles.btnSec}>Close</button>
                 <button className={styles.btnPri} onClick={handleCreateIdentity}>Create</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}