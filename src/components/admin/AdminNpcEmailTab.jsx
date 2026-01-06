// src/components/admin/AdminNpcEmailTab.jsx
import React, { useEffect, useState, useRef } from 'react';
import api from '../../api';
import styles from '../../styles/Admin.module.css';

// --- Internal Rich Text Editor (Same as EmailSystem.jsx) ---
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

// --- Main Component ---
export default function AdminNpcEmailTab() {
  const [identities, setIdentities] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');

  // Form State
  const [formEmail, setFormEmail] = useState('');
  const [formDisplay, setFormDisplay] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef(null);

  // --- 1. Load Data ---

  const loadIdentities = async () => {
    try {
      const { data } = await api.get('/admin/emails/identities');
      setIdentities(data.identities || []);
    } catch (e) {
      console.error('Failed to load identities', e);
    }
  };

  const loadThreads = async () => {
    try {
      const { data } = await api.get('/admin/emails/threads');
      setThreads(data.threads || []);
    } catch (e) {
      console.error('Failed to load threads', e);
    }
  };

  const loadThreadMessages = async (id) => {
    setSelectedThreadId(id);
    try {
      const { data } = await api.get(`/admin/emails/threads/${id}`);
      setMessages(data.messages || []);
      // Mark read locally
      setThreads(prev => prev.map(t => t.id === id ? { ...t, unread_count: 0 } : t));
    } catch (e) {
      console.error('Failed to load messages', e);
    }
  };

  // --- 2. Actions ---

  const handleCreateIdentity = async (e) => {
    e.preventDefault();
    if (!formEmail || !formDisplay) return;
    setIsSubmitting(true);
    try {
      await api.post('/admin/emails/identities', {
        email_address: formEmail,
        display_name: formDisplay
      });
      setFormEmail('');
      setFormDisplay('');
      loadIdentities();
    } catch (e) {
      alert('Error creating identity. Email might already exist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIdentity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this email identity?')) return;
    try {
      await api.delete(`/admin/emails/identities/${id}`);
      loadIdentities();
    } catch (e) {
      alert('Failed to delete.');
    }
  };

  const handleReply = async () => {
    if (!reply.trim() || !selectedThreadId) return;
    try {
      await api.post('/admin/emails/reply', {
        thread_id: selectedThreadId,
        body: reply
      });
      setReply('');
      loadThreadMessages(selectedThreadId); // Refresh msgs
      loadThreads(); // Refresh last updated timestamp in list
    } catch (e) {
      alert('Failed to send reply.');
    }
  };

  // --- 3. Effects ---

  useEffect(() => {
    loadIdentities();
    loadThreads();
    const interval = setInterval(loadThreads, 15000); // Poll inbox every 15s
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom of chat when messages load
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // --- Render Helpers ---
  const activeThread = threads.find(t => t.id === selectedThreadId);

  return (
    <div className={styles.adminTabContent}>
      
      {/* SECTION 1: MANAGE IDENTITIES */}
      <div className={styles.adminCard}>
        <h3>Human Email Identities</h3>
        <p className={styles.helperText}>These are the "fake" email addresses players can write to (e.g. <em>mayor@city.gov</em>).</p>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          {/* Create Form */}
          <form onSubmit={handleCreateIdentity} style={{ flex: '1', minWidth: '300px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px' }}>
            <h4 style={{marginTop:0}}>Create New Identity</h4>
            <div style={{ marginBottom: '10px' }}>
              <label className={styles.label}>Display Name</label>
              <input 
                className={styles.input} 
                placeholder="e.g. The Chief of Police" 
                value={formDisplay} 
                onChange={e => setFormDisplay(e.target.value)} 
                required
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label className={styles.label}>Email Address</label>
              <input 
                className={styles.input} 
                placeholder="e.g. police@city.gov" 
                value={formEmail} 
                onChange={e => setFormEmail(e.target.value)} 
                required
              />
            </div>
            <button className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Identity'}
            </button>
          </form>

          {/* List of Identities */}
          <div style={{ flex: '1', minWidth: '300px', maxHeight: '250px', overflowY: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th style={{width: 50}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {identities.length === 0 && (
                  <tr><td colSpan="3" style={{textAlign:'center', opacity:0.5}}>No identities created yet.</td></tr>
                )}
                {identities.map(id => (
                  <tr key={id.id}>
                    <td>{id.display_name}</td>
                    <td style={{ color: 'var(--accent-purple)' }}>{id.email_address}</td>
                    <td>
                      <button 
                        className={styles.btnDanger} 
                        style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                        onClick={() => handleDeleteIdentity(id.id)}
                      >
                        Del
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: INBOX & THREADS */}
      <div className={styles.adminCard} style={{ display: 'flex', gap: '0', padding: 0, overflow: 'hidden', height: '600px' }}>
        
        {/* Thread List Sidebar */}
        <div style={{ width: '350px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>
            Global Inbox
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {threads.map(t => (
              <div 
                key={t.id} 
                onClick={() => loadThreadMessages(t.id)}
                style={{
                  padding: '15px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: selectedThreadId === t.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderLeft: selectedThreadId === t.id ? '3px solid var(--accent-purple)' : '3px solid transparent'
                }}
              >
                <div style={{ fontWeight: t.unread_count > 0 ? 'bold' : 'normal', color: t.unread_count > 0 ? '#fff' : 'var(--text-secondary)' }}>
                  {t.subject}
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                  {t.user_name} → {t.identity_name}
                </div>
                <div style={{ fontSize: '0.7rem', marginTop: '4px', opacity: 0.5, textAlign: 'right' }}>
                  {new Date(t.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {threads.length === 0 && <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>No messages found.</div>}
          </div>
        </div>

        {/* Message View Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedThreadId && activeThread ? (
            <>
              {/* Header */}
              <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)' }}>
                <h3 style={{ margin: 0 }}>{activeThread.subject}</h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                  Player: <span style={{ color: '#fff' }}>{activeThread.user_name} ({activeThread.char_name})</span>
                  {' '} sent to {' '}
                  <span style={{ color: 'var(--accent-purple)' }}>{activeThread.email_address}</span>
                </div>
              </div>

              {/* Messages Scroll */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {messages.map((m, i) => (
                  <div 
                    key={i} 
                    style={{
                      alignSelf: m.sender_type === 'identity' ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      background: m.sender_type === 'identity' ? 'var(--accent-purple-dark)' : 'rgba(255,255,255,0.05)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '6px', display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
                      <strong>{m.sender_type === 'identity' ? activeThread.identity_name : activeThread.user_name}</strong>
                      <span>{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    {/* CHANGED: Render HTML safely instead of plain text */}
                    <div 
                      style={{ lineHeight: '1.4' }}
                      dangerouslySetInnerHTML={{ __html: m.body }} 
                    />
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Box */}
              <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                {/* CHANGED: Use Rich Text Editor instead of TextArea */}
                <TextEditor
                  placeholder={`Reply as ${activeThread.identity_name}...`}
                  value={reply}
                  onChange={setReply}
                />
                
                <div style={{ textAlign: 'right', marginTop: '10px' }}>
                  <button className={styles.btnPrimary} onClick={handleReply} disabled={!reply.trim()}>
                    Send Reply
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, flexDirection: 'column' }}>
              <div style={{ fontSize: '3rem' }}>✉️</div>
              <p>Select a thread to view</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}