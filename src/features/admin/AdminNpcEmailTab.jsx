// src/components/admin/AdminNpcEmailTab.jsx
import React, { useEffect, useState, useRef } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import Avatar from '../../components/Avatar';

const EditorToolbar = ({ onCmd }) => (
  <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '6px', borderBottom: '1px solid var(--glass-border)' }}>
    {[['B', 'bold'], ['I', 'italic'], ['U', 'underline'], ['H3', 'formatBlock', 'H3']].map(([lbl, cmd, val]) => (
      <button key={lbl} type="button" onClick={() => onCmd(cmd, val)} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-color)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>{lbl}</button>
    ))}
  </div>
);

const TextEditor = ({ value, onChange, placeholder }) => {
  const contentRef = useRef(null);
  useEffect(() => { if (contentRef.current && (value === '' || value === '<br>')) contentRef.current.innerHTML = ''; }, [value]);

  return (
    <div style={{ border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--glass-inset)' }}>
      <EditorToolbar onCmd={(cmd, val) => { document.execCommand(cmd, false, val); contentRef.current.focus(); onChange(contentRef.current.innerHTML); }} />
      <div contentEditable ref={contentRef} onInput={(e) => onChange(e.currentTarget.innerHTML)} data-placeholder={placeholder} className={styles.editable} />
    </div>
  );
};

export default function AdminNpcEmailTab() {
  const [identities, setIdentities] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDisplay, setFormDisplay] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef(null);

  const loadIdentities = async () => { try { const { data } = await api.get('/admin/emails/identities'); setIdentities(data.identities || []); } catch (e) {} };
  const loadThreads = async () => { try { const { data } = await api.get('/admin/emails/threads'); setThreads(data.threads || []); } catch (e) {} };
  
  const loadThreadMessages = async (id) => {
    setSelectedThreadId(id);
    try {
      const { data } = await api.get(`/admin/emails/threads/${id}`);
      setMessages(data.messages || []);
      setThreads(prev => prev.map(t => t.id === id ? { ...t, unread_count: 0 } : t));
    } catch (e) {}
  };

  const handleCreateIdentity = async (e) => {
    e.preventDefault(); if (!formEmail || !formDisplay) return; setIsSubmitting(true);
    try {
      await api.post('/admin/emails/identities', { email_address: formEmail, display_name: formDisplay });
      setFormEmail(''); setFormDisplay(''); loadIdentities();
    } catch (e) { alert('Identity allocation configuration error state.'); } 
    finally { setIsSubmitting(false); }
  };

  const handleDeleteIdentity = async (id) => {
    if (!window.confirm('Terminate email asset routing identity node?')) return;
    try { await api.delete(`/admin/emails/identities/${id}`); loadIdentities(); } catch (e) {}
  };

  const handleReply = async () => {
    if (!reply.trim() || !selectedThreadId) return;
    try {
      await api.post('/admin/emails/reply', { thread_id: selectedThreadId, body: reply });
      setReply(''); loadThreadMessages(selectedThreadId); loadThreads();
    } catch (e) { alert('Message dispatch transmission exception.'); }
  };

  useEffect(() => { loadIdentities(); loadThreads(); const i = setInterval(loadThreads, 15000); return () => clearInterval(i); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const activeThread = threads.find(t => t.id === selectedThreadId);

  return (
    <div className={styles.stack12}>
      {/* Identities Configuration Panel */}
      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--glass-shadow)' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-color)', margin: 0 }}>Email Identities</h3>
        <p className={styles.subtle} style={{ marginTop: '4px', marginBottom: '1.5rem' }}>Configure addresses for NPCs to send and receive emails.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          <form onSubmit={handleCreateIdentity} style={{ background: 'var(--glass-inset)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--accent-purple)' }}>Create Email Identity</h4>
            <div style={{ marginBottom: '10px' }}><label className={styles.labeledInput}><span>Display Name</span><input className={styles.input} placeholder="e.g. Executive Office" value={formDisplay} onChange={e => setFormDisplay(e.target.value)} required /></label></div>
            <div style={{ marginBottom: '15px' }}><label className={styles.labeledInput}><span>Email Address</span><input className={styles.input} placeholder="e.g. contact@city.gov" value={formEmail} onChange={e => setFormEmail(e.target.value)} required /></label></div>
            <button className={styles.btnPrimary} style={{ width: '100%', padding: '0.6rem' }} disabled={isSubmitting}>{isSubmitting ? 'Processing...' : 'Create'}</button>
          </form>

          <div className={styles.tableContainer} style={{ maxHeight: '230px', overflowY: 'auto' }}>
            <table className={styles.table}>
              <thead><tr><th>Name</th><th>Email</th><th style={{ width: 50 }}>Actions</th></tr></thead>
              <tbody>
                {identities.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', opacity: 0.4, padding: '2rem' }}>No email identities configured.</td></tr>}
                {identities.map(id => (
                  <tr key={id.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div onClick={(e) => e.stopPropagation()} style={{ width: 40, height: 40, flexShrink: 0 }}>
                        <Avatar identityId={id.id} size="100%" style={{ width: '100%', height: '100%', borderRadius: '50%' }} editable={true} fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(id.display_name)}&background=random`} />
                      </div>
                      {id.display_name}
                    </td>
                    <td style={{ color: 'var(--accent-purple)', fontFamily: 'monospace' }}>{id.email_address}</td>
                    <td><button className={styles.btnDanger} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px' }} onClick={() => handleDeleteIdentity(id.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Main Mail Grid Area Terminal */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '620px', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--glass-shadow)' }}>
        {/* Inbox Left List Track */}
        <div style={{ borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ padding: '1.2rem 1.5rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--glass-border)', fontWeight: 800, color: 'var(--text-color)', fontSize: '1rem', letterSpacing: '0.5px' }}>INBOX</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {threads.map(t => (
              <div key={t.id} onClick={() => loadThreadMessages(t.id)} style={{ padding: '1.25rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)', background: selectedThreadId === t.id ? 'var(--glass-bg-hover)' : 'transparent', borderLeft: `3px solid ${selectedThreadId === t.id ? 'var(--accent-purple)' : 'transparent'}`, transition: 'all 0.2s' }}>
                <div style={{ fontWeight: t.unread_count > 0 ? 800 : 600, color: t.unread_count > 0 ? 'var(--accent-purple)' : 'var(--text-color)', textShadow: t.unread_count > 0 ? '0 0 10px var(--accent-purple-glow)' : 'none', fontSize: '0.95rem' }}>{t.subject}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{t.user_name} ➔ {t.identity_name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{new Date(t.updated_at).toLocaleDateString()}</div>
              </div>
            ))}
            {threads.length === 0 && <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No messages found.</div>}
          </div>
        </div>

        {/* Content Panel Right Wire Track */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--glass-inset)' }}>
          {selectedThreadId && activeThread ? (
            <>
              <div style={{ padding: '1.25rem 2rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--glass-border)' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-color)' }}>{activeThread.subject}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>From: <span style={{ color: 'var(--text-color)', fontWeight: 700 }}>{activeThread.user_name} [{activeThread.char_name || 'Kindred'}]</span> ➔ To: <span style={{ color: 'var(--accent-purple)', fontFamily: 'monospace' }}>{activeThread.email_address}</span></div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {messages.map((m, i) => {
                  const isIdentity = m.sender_type === 'identity';
                  const msgName = isIdentity ? activeThread.identity_name : activeThread.user_name;
                  const avatarProps = isIdentity ? { identityId: activeThread.identity_id } : { userId: activeThread.user_id };
                  
                  return (
                    <div key={i} style={{ alignSelf: isIdentity ? 'flex-end' : 'flex-start', maxWidth: '80%', display: 'flex', flexDirection: isIdentity ? 'row-reverse' : 'row', gap: '1rem', alignItems: 'flex-end' }}>
                      <Avatar {...avatarProps} size={36} style={{ borderRadius: '50%', flexShrink: 0 }} fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(msgName)}&background=random`} />
                      <div style={{ background: isIdentity ? 'linear-gradient(135deg, rgba(127,90,240,0.2) 0%, rgba(157,124,255,0.05) 100%)' : 'rgba(255,255,255,0.03)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: `1px solid ${isIdentity ? 'var(--glass-border-highlight)' : 'var(--glass-border)'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                        <div style={{ fontSize: '0.75rem', color: isIdentity ? 'var(--accent-purple)' : 'var(--text-secondary)', fontWeight: 700, marginBottom: '6px', display: 'flex', justifyContent: 'space-between', gap: '2rem' }}>
                          <span>{msgName}</span>
                          <span style={{ fontWeight: 'normal', fontFamily: 'monospace' }}>{new Date(m.created_at).toLocaleString()}</span>
                        </div>
                        <div style={{ lineHeight: '1.6', color: '#e0e0e5', fontSize: '0.95rem' }} dangerouslySetInnerHTML={{ __html: m.body }} />
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                <TextEditor placeholder={`Reply as ${activeThread.identity_name}...`} value={reply} onChange={setReply} />
                <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                  <button className={styles.btnPrimary} onClick={handleReply} disabled={!reply.trim()}>Send Reply</button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4, flexDirection: 'column', gap: '1rem' }}>
              <span style={{ fontSize: '3rem' }}>✉️</span>
              <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Select a thread to view messages</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}