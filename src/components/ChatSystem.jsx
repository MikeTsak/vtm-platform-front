// src/pages/ChatSystem.jsx
import React, { useState, useEffect, useContext, useRef, useMemo, useLayoutEffect } from 'react';
import { AuthCtx } from '../AuthContext';
import api from '../api';
import styles from '../styles/ChatSystem.module.css';

/* --- Clan assets & colors --- */
const CLAN_COLORS = {
  Brujah: '#b40f1f', Gangrel: '#2f7a3a', Malkavian: '#713c8b', Nosferatu: '#6a4b2b',
  Toreador: '#b8236b', Tremere: '#7b1113', Ventrue: '#1b4c8c', 'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b', Lasombra: '#191a5a', 'The Ministry': '#865f12',
  Caitiff: '#636363', 'Thin-blood': '#6e6e2b',
};
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim', 'Thin-blood': 'Thinblood' };
const symlogo = (c) =>
  (c ? `/img/clans/330px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g, '_')}_symbol.png` : '');

/* --- Icons --- */
const ImageIcon = () => (
<svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* The Frame (broken at top right for arrow) */}
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
    {/* The Landscape/Mountain */}
    <polyline points="21 15 16 10 5 21" />
    {/* The Sun */}
    <circle cx="8" cy="9" r="2" />
    {/* The Upload Arrow */}
    <line x1="16" y1="13" x2="16" y2="3" />
    <polyline points="12 7 16 3 20 7" />
  </svg>
);


/* --- PUSH HELPERS --- */
const VAPID_PUBLIC_KEY = (window.__VAPID_PUBLIC_KEY__ || (document.querySelector('meta[name="vapid-public-key"]')?.content) || process.env.REACT_APP_VAPID_PUBLIC_KEY || '').trim();

const urlBase64ToUint8Array = (base64String) => {
  if (!base64String) return new Uint8Array();
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
};

async function ensureServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js').catch(() => navigator.serviceWorker.register('/service-worker.js'));
    return reg || null;
  } catch { return null; }
}

async function subscribePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  if (!VAPID_PUBLIC_KEY) return null;
  const reg = await ensureServiceWorker();
  if (!reg) return null;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  try { await api.post('/api/push/subscribe', { subscription: sub }); } catch { /* ignore */ }
  return sub;
}

async function unsubscribePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    try { await sub.unsubscribe(); } catch {}
    try { await api.post('/api/push/unsubscribe', { endpoint }); } catch {}
    return true;
  }
  return false;
}

/* --- Contact Objects --- */
const asUserContact = (u) => ({
  type: 'user',
  id: u.id,
  display_name: u.display_name,
  char_name: u.char_name,
  clan: u.clan,
  role: u.role,
  permission_level: u.permission_level,
  is_admin: typeof u.is_admin !== 'undefined' ? !!u.is_admin : (u.role === 'admin' || u.permission_level === 'admin'),
  char_id: u.char_id ?? null,
  unread_count: u.unread_count || 0,
  last_message_at: u.last_message_at ? new Date(u.last_message_at).getTime() : 0
});

const asNpcContact = (n) => ({ 
  type: 'npc', 
  id: n.id, 
  name: n.name, 
  clan: n.clan,
  last_message_at: n.last_message_at ? new Date(n.last_message_at).getTime() : 0
});

const asGroupContact = (g) => ({
  type: 'group',
  id: g.id,
  name: g.name,
  last_message_at: g.last_message_at ? new Date(g.last_message_at).getTime() : 0
});

const isContactAdmin = (u) => u?.role === 'admin' || u?.permission_level === 'admin' || !!u?.is_admin;

/* --- SORT HELPER --- */
const sortContacts = (list) => {
  return [...list].sort((a, b) => {
    const unreadA = a.unread_count || 0;
    const unreadB = b.unread_count || 0;
    if (unreadA !== unreadB) return unreadB - unreadA;
    
    const timeA = a.last_message_at || 0;
    const timeB = b.last_message_at || 0;
    if (timeA !== timeB) return timeB - timeA;
    
    const nameA = a.display_name || a.name || '';
    const nameB = b.display_name || b.name || '';
    return nameA.localeCompare(nameB);
  });
};

/* --- Status Icon Helper --- */
const StatusIcon = ({ msg }) => {
  if (!msg || !msg.created_at) return null;
  if (msg.read_at) {
    return <span title={`Seen: ${new Date(msg.read_at).toLocaleString()}`} className={styles.statusSeen}>✓✓</span>; 
  }
  if (msg.delivered_at) {
    return <span title={`Delivered: ${new Date(msg.delivered_at).toLocaleString()}`} className={styles.statusDelivered}>✓✓</span>;
  }
  return <span title="Sent" className={styles.statusSent}>✓</span>;
};

/* --- CHAT IMAGE COMPONENT (Secure Fetch) --- */
const ChatImage = ({ attachmentId }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let urlToRevoke = null;

    setLoading(true);
    setError(false);
    setImageUrl(null);
    
    api.get(`/chat/media/${attachmentId}`, { responseType: 'blob' })
      .then((response) => {
        if (!active) return;
        urlToRevoke = URL.createObjectURL(response.data);
        setImageUrl(urlToRevoke);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load image", err);
        if (!active) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [attachmentId]);

  if (loading) return <div className={styles.imageLoading}>Loading image...</div>;
  if (error) return <div className={styles.imageError}>⚠ Image failed to load</div>;

  return (
    <img 
      src={imageUrl} 
      alt="Attachment" 
      className={styles.chatImage} 
      onClick={() => window.open(imageUrl, '_blank')}
    />
  );
};

export default function Comms() {
  const { user: currentUser } = useContext(AuthCtx);
  const isAdmin = currentUser?.role === 'admin';

  const [users, setUsers] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [groups, setGroups] = useState([]); 
  const [filter, setFilter] = useState('');
  const [noCharOpen, setNoCharOpen] = useState(false);

  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null); 
  const [npcConvos, setNpcConvos] = useState([]);
  const [adminPlayerTab, setAdminPlayerTab] = useState('recent');
  const [adminPlayerFilter, setAdminPlayerFilter] = useState('');

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  /* --- Attachments State --- */
  const [attachment, setAttachment] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const [drafts, setDrafts] = useState({});
  const sendingRef = useRef(false);

  // Group Creation State
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState([]);

  const [notifOn, setNotifOn] = useState(() => localStorage.getItem('comms_notifs') === '1');
  const notifSupported = typeof window !== 'undefined' && 'Notification' in window;
  const [notifDenied, setNotifDenied] = useState(false);
  const canPush = () => ('serviceWorker' in navigator) && ('PushManager' in window);

  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);
  
  // UX Refs
  const textareaRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  /* --- SCROLL LOGIC --- */
  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null);
  const userScrollingRef = useRef(false);

  const isNearBottom = (el, pad = 150) => {
    if (!el) return true;
    const { scrollTop, scrollHeight, clientHeight } = el;
    return scrollHeight - scrollTop - clientHeight < pad;
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
    }
  };

  useEffect(() => {
    const el = messagesListRef.current;
    if (!el) return;
    const onScroll = () => { 
        userScrollingRef.current = !isNearBottom(el);
        setShowScrollBtn(!isNearBottom(el, 300));
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!userScrollingRef.current) scrollToBottom(false);
  }, [messages]);

  useEffect(() => {
    userScrollingRef.current = false;
    scrollToBottom(false);
    if(textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
    // Clear attachments when switching contacts
    clearAttachment();
  }, [selectedContact]);

  // Auto-resize textarea logic
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [newMessage]);

  /* --- Setup & Notifs --- */
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    let observer;
    const currentContainer = containerRef.current;
    if (currentContainer && 'ResizeObserver' in window) {
      observer = new ResizeObserver(checkMobile);
      observer.observe(currentContainer);
    } else {
      window.addEventListener('resize', checkMobile);
    }
    return () => {
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => { localStorage.setItem('comms_notifs', notifOn ? '1' : '0'); }, [notifOn]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!notifOn) return;
      if (!canPush()) return;
      if (Notification.permission !== 'granted') return;
      try {
        const reg = await ensureServiceWorker();
        if (!mounted || !reg) return;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) await subscribePush();
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [notifOn]);

  const toggleNotifications = async () => {
    if (!notifSupported) return;
    if (!notifOn) {
      let perm = Notification.permission;
      if (perm === 'default') { try { perm = await Notification.requestPermission(); } catch { perm = 'denied'; } }
      if (perm !== 'granted') { setNotifDenied(true); setNotifOn(false); return; }
      try {
        if (canPush() && VAPID_PUBLIC_KEY) {
          const sub = await subscribePush();
          if (sub) { try { await api.post('/api/push/test'); } catch {} }
        }
      } catch { /* ignore */ }
      setNotifDenied(false); setNotifOn(true);
    } else {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        const endpoint = sub?.endpoint;
        try { await unsubscribePush(); } catch {}
        if (endpoint) { try { await api.post('/api/push/unsubscribe', { endpoint }); } catch {} }
      } catch {}
      setNotifOn(false); setNotifDenied(false);
    }
  };

  const pageVisibleRef = useRef(!document.hidden);
  useEffect(() => {
    const onVis = () => { pageVisibleRef.current = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  /* --- Thread key --- */
  const threadKey = useMemo(() => {
    if (!selectedContact) return 'none';
    if (selectedContact.type === 'user') return `u-${selectedContact.id}`;
    if (selectedContact.type === 'group') return `g-${selectedContact.id}`;
    return isAdmin ? `n-${selectedContact.id}-p-${selectedPlayerId || 'none'}` : `n-${selectedContact.id}`;
  }, [selectedContact, selectedPlayerId, isAdmin]);

  const prevThreadKeyRef = useRef(threadKey);
  useEffect(() => {
    if (prevThreadKeyRef.current !== threadKey) {
      setDrafts(prev => ({ ...prev, [prevThreadKeyRef.current]: newMessage }));
      setNewMessage((prevDrafts => (prevDrafts[threadKey] || ''))(drafts));
      prevThreadKeyRef.current = threadKey;
      if(!isMobile && textareaRef.current) textareaRef.current.focus();
    }
  }, [threadKey, drafts, newMessage, isMobile]);

  const lastTsRef = useRef(0);
  const initialSyncRef = useRef(true);
  useEffect(() => {
    initialSyncRef.current = true;
    lastTsRef.current = 0;
  }, [threadKey]);

  const isInbound = (m) => {
    if (!selectedContact) return false;
    if (selectedContact.type === 'user') return m.sender_id !== currentUser?.id;
    if (selectedContact.type === 'group') return m.sender_id !== currentUser?.id;
    if (isAdmin) return m.sender_id !== 'npc';
    return m.sender_id === 'npc';
  };

  const notify = (title, body, icon) => {
    try {
      if (!notifSupported) return;
      if (!notifOn) return;
      if (Notification.permission !== 'granted') return;
      const opts = { body, icon, badge: icon, tag: `comms-${threadKey}` };
      new Notification(title, opts);
    } catch { /* noop */ }
  };

  /* --- API & Data Loading --- */
  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    const id = api.interceptors.response.use(res => res, err => {
        if (err?.response?.status === 401) setError('Your session expired. Please log in again.');
        return Promise.reject(err);
    });
    return () => api.interceptors.response.eject(id);
  }, []);

  const hasAuthHeader = !!api?.defaults?.headers?.common?.Authorization;

  // Fetch Users, NPCs, Groups
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [{ data: u }, { data: n }, { data: g }] = await Promise.all([
          api.get('/chat/users'),
          api.get('/chat/npcs'),
          api.get('/chat/groups') 
        ]);
        const userList = Array.isArray(u) ? u : (u.users || []);
        const npcList  = Array.isArray(n) ? n : (n.npcs || []);
        const groupList = g.groups || [];
        
        setUsers(sortContacts(userList.map(asUserContact)));
        setNpcs(sortContacts(npcList.map(asNpcContact)));
        setGroups(sortContacts(groupList.map(asGroupContact)));
      } catch (e) {
        setError(e?.response?.status === 401 ? 'Your session expired. Please log in again.' : 'Could not load contacts.');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser, creatingGroup]);

  // Combined Polling: Messages & Admin Recent Roster
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setMessages([]);
    setError('');

    // Force clear roster if not relevant
    if (!isAdmin || !selectedContact || selectedContact.type !== 'npc') {
      setNpcConvos([]);
    }

    const load = async () => {
      if (!selectedContact) return;
      try {
        /* ------------------------------------------------------------------
           1. LOAD MESSAGES
           ------------------------------------------------------------------ */
        let msgs = [];
        if (selectedContact.type === 'group') {
           const res = await api.get(`/chat/groups/${selectedContact.id}/history`);
           msgs = (res.data.messages || []).map(m => ({
             id: m.id, body: m.body, created_at: m.created_at, sender_id: m.sender_id,
             sender_name: m.char_name || m.display_name, sender_clan: m.clan,
             attachment_id: m.attachment_id // Includes attachment
           }));
        } else if (selectedContact.type === 'user') {
          const res = await api.get(`/chat/history/${selectedContact.id}`);
          msgs = (res.data.messages || []).map(m => ({
            id: m.id, body: m.body, created_at: m.created_at, 
            read_at: m.read_at, delivered_at: m.delivered_at,
            sender_id: m.sender_id,
            attachment_id: m.attachment_id // Includes attachment
          }));
        } else {
          // NPC Logic
          if (isAdmin) {
            if (!selectedPlayerId || !hasAuthHeader) { setMessages([]); return; }
            let res;
            try {
              res = await api.get(`/admin/chat/npc/history`, { params: { npc_id: selectedContact.id, user_id: selectedPlayerId } });
            } catch {
              res = await api.get(`/admin/chat/npc-history/${selectedContact.id}/${selectedPlayerId}`);
            }
            msgs = (res.data.messages || []).map(m => ({
              id: m.id, body: m.body, created_at: m.created_at, sender_id: m.from_side === 'npc' ? 'npc' : selectedPlayerId, _from: m.from_side,
              attachment_id: m.attachment_id
            }));
          } else {
            const res = await api.get(`/chat/npc-history/${selectedContact.id}`);
            msgs = (res.data.messages || []).map(m => ({
              id: m.id, body: m.body, created_at: m.created_at, sender_id: m.from_side === 'user' ? currentUser.id : 'npc', _from: m.from_side,
              attachment_id: m.attachment_id
            }));
          }
        }

        msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const newestTs = msgs.reduce((t, m) => Math.max(t, new Date(m.created_at).getTime()), 0);
        
        const hasNewMessages = newestTs > lastTsRef.current;
        const isInitialLoad = initialSyncRef.current;

        if (isInitialLoad || hasNewMessages) {
          if (hasNewMessages && !isInitialLoad) {
            const inboundNew = msgs.filter(m => new Date(m.created_at).getTime() > lastTsRef.current && isInbound(m));
            if (inboundNew.length && (document.hidden || !pageVisibleRef.current)) {
              const latest = inboundNew[inboundNew.length - 1];
              let title = 'New Message';
              let icon = '/img/ATT-logo(1).png';
              
              if (selectedContact.type === 'group') {
                title = `${selectedContact.name}: ${latest.sender_name || 'Someone'}`;
              } else if (selectedContact.type === 'user') {
                title = selectedContact.char_name || selectedContact.display_name;
                icon = symlogo(selectedContact.clan) || icon;
              } else {
                title = isAdmin && selectedPlayerId ? `${selectedContact.name} ↔ ${users.find(u => u.id === selectedPlayerId)?.char_name || 'Player'}` : selectedContact.name;
                icon = symlogo(selectedContact.clan) || icon;
              }
              const notificationBody = latest.attachment_id ? '📷 Image Attachment' : (latest.body || 'New message');
              notify(title, notificationBody, icon);
            }
          }
          lastTsRef.current = Math.max(lastTsRef.current, newestTs);
          setMessages(msgs);

          // Mark Delivered for User Chats (Fixed path)
          if (selectedContact.type === 'user' && !isAdmin && msgs.length > 0) {
             api.post('/chat/delivered', { sender_id: selectedContact.id }).catch(() => {});
          }
        }
        
        /* ------------------------------------------------------------------
           2. LOAD ADMIN ROSTER (Updated Fix: Polls every time)
           ------------------------------------------------------------------ */
        if (isAdmin && selectedContact.type === 'npc' && hasAuthHeader) {
          try {
            let res;
            try {
              res = await api.get('/admin/chat/npc/conversations', { params: { npc_id: selectedContact.id } });
            } catch {
              res = await api.get(`/admin/chat/npc-conversations/${selectedContact.id}`);
            }
            const rows = (res.data?.conversations || []).map(r => ({
              user_id: r.user_id,
              display_name: r.display_name || '',
              char_name: r.char_name || '',
              last_message_at: r.last_message_at || null,
            }));
            rows.sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0));
            setNpcConvos(rows);
          } catch (e) {
            // silent fail for roster update
          }
        }

        initialSyncRef.current = false;
      } catch (e) {
        setError(e?.response?.status === 401 ? 'Your session expired. Please log in again.' : 'Could not load messages.');
      }
    };

    load();
    pollRef.current = setInterval(load, 6000);
    return () => clearInterval(pollRef.current);
  }, [selectedContact, selectedPlayerId, isAdmin, hasAuthHeader, currentUser?.id, users, threadKey]);

  /* --- File Handling --- */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Simple validation
    if (!file.type.startsWith('image/')) {
      alert('Only images are allowed');
      return;
    }

    const MAX_MB = 50;  // 50MB limit for chat attachments
    const MAX_BYTES = MAX_MB * 1024 * 1024;
    if (file.size > MAX_BYTES) { 
      alert(`File size too large (max ${MAX_MB}MB)`);
      return;
    }

    setAttachment(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Focus input so user can still type
    if(textareaRef.current) textareaRef.current.focus();
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* --- Sending Logic --- */
  const doSend = async () => {
    const body = newMessage.trim();
    if ((!body && !attachment) || !selectedContact) return;
    if (isAdmin && selectedContact.type === 'npc' && !selectedPlayerId) return;
    if (sendingRef.current) return;
    
    sendingRef.current = true;
    let attachmentId = null;

    try {
      // 1. Upload Attachment if present
      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);
        
        try {
          const res = await api.post('/chat/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          attachmentId = res.data.id;
        } catch (err) {
          alert('Failed to upload image');
          sendingRef.current = false;
          return;
        }
      }

      // 2. Prepare Payload
      const payload = { body, attachment_id: attachmentId };

      // 3. Send Message
      if (selectedContact.type === 'group') {
        const { data } = await api.post(`/chat/groups/${selectedContact.id}/messages`, payload);
        setMessages(prev => [...prev, { ...data.message, sender_id: currentUser.id, sender_name: 'Me' }]);
        setGroups(prev => sortContacts(prev.map(g => g.id === selectedContact.id ? { ...g, last_message_at: Date.now() } : g)));
      }
      else if (selectedContact.type === 'user') {
        const { data } = await api.post('/chat/messages', { recipient_id: selectedContact.id, ...payload });
        setMessages(prev => [...prev, data.message]);
        
        setUsers(prev => {
           const updated = prev.map(u => 
             u.id === selectedContact.id ? { ...u, last_message_at: Date.now(), unread_count: 0 } : u
           );
           return sortContacts(updated);
        });
        api.post('/chat/read', { sender_id: selectedContact.id }).catch(()=>{});
      } else {
        if (isAdmin) {
          const { data } = await api.post('/admin/chat/npc/messages', { npc_id: selectedContact.id, user_id: selectedPlayerId, ...payload });
          setMessages(prev => [...prev, { id: data.message.id, body: data.message.body, created_at: data.message.created_at, sender_id: 'npc', _from: 'npc', attachment_id: data.message.attachment_id }]);
        } else {
          const { data } = await api.post('/chat/npc/messages', { npc_id: selectedContact.id, ...payload });
          setMessages(prev => [...prev, { id: data.message.id, body: data.message.body, created_at: data.message.created_at, sender_id: currentUser.id, _from: 'user', attachment_id: data.message.attachment_id }]);
          
          setNpcs(prev => {
             const updated = prev.map(n => 
               n.id === selectedContact.id ? { ...n, last_message_at: Date.now() } : n
             );
             return sortContacts(updated);
          });
        }
      }

      setNewMessage('');
      clearAttachment();
      setDrafts(prev => ({ ...prev, [threadKey]: '' }));
      if(textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (err) {
      setError(err?.response?.status === 401 ? 'Your session expired. Please log in again.' : 'Failed to send message.');
    } finally {
      sendingRef.current = false;
      if(!isMobile) setTimeout(() => textareaRef.current?.focus(), 10);
    }
  };

  const handleSendMessage = (e) => {
    e?.preventDefault?.();
    doSend();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupMembers.length) return;
    try {
      await api.post('/chat/groups', { name: newGroupName, members: newGroupMembers });
      setCreatingGroup(false);
      setNewGroupName('');
      setNewGroupMembers([]);
      const { data: g } = await api.get('/chat/groups');
      setGroups(sortContacts(g.groups.map(asGroupContact)));
    } catch (e) { alert('Failed to create group'); }
  };

  const copyToClipboard = (text) => {
      if(navigator.clipboard && text) {
          navigator.clipboard.writeText(text);
      }
  };

  /* --- Render & Filters --- */
  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const formatDay = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const grouped = useMemo(() => {
    const g = [];
    let lastDay = '';
    for (const m of messages) {
      const day = formatDay(m.created_at);
      if (day !== lastDay) {
        g.push({ type: 'day', id: `day-${day}-${g.length}`, day });
        lastDay = day;
      }
      g.push({ type: 'msg', ...m });
    }
    return g;
  }, [messages]);

  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = users || [];
    if (!q) return list;
    return list.filter(u => (u.display_name || '').toLowerCase().includes(q) || (u.char_name || '').toLowerCase().includes(q));
  }, [users, filter]);

  const usersNoChar = useMemo(() => filteredUsers.filter(u => !u.char_id || Number(u.char_id) === 1), [filteredUsers]);
  const usersWithChar = useMemo(() => filteredUsers.filter(u => u.char_id && Number(u.char_id) !== 1), [filteredUsers]);
  
  const filteredNpcs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = npcs || [];
    if (!q) return list;
    return list.filter(n => (n.name || '').toLowerCase().includes(q));
  }, [npcs, filter]);

  const filteredGroups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = groups || [];
    if (!q) return list;
    return list.filter(g => (g.name || '').toLowerCase().includes(q));
  }, [groups, filter]);

  const adminAllPlayersFiltered = useMemo(() => {
    const q = adminPlayerFilter.trim().toLowerCase();
    const list = users || [];
    if (!q) return list;
    return list.filter(u => (u.char_name || '').toLowerCase().includes(q) || (u.display_name || '').toLowerCase().includes(q));
  }, [users, adminPlayerFilter]);

  const adminRecentPlayers = useMemo(() => {
    const byId = new Map((users || []).map(u => [u.id, u]));
    return (npcConvos || []).map(r => {
      // Robust Fallback: if user not found in main list, use the data from recent conversation row
      const u = byId.get(r.user_id);
      return u 
        ? { ...u, last_message_at: r.last_message_at } 
        : { 
            type: 'user', 
            id: r.user_id, 
            display_name: r.display_name || 'Unknown', 
            char_name: r.char_name || 'Unknown', 
            clan: undefined, 
            last_message_at: r.last_message_at 
          };
    });
  }, [npcConvos, users]);

  if (loading) return <div className={styles.loading}>Loading contacts…</div>;

  const currentAccent = (() => {
    if (!selectedContact) return '#8a0f1a';
    if (selectedContact.type === 'group') return '#444'; 
    return CLAN_COLORS[selectedContact.clan] || '#8a0f1a';
  })();

  const headerLabel = (() => {
    if (!selectedContact) return '';
    if (selectedContact.type === 'user') return selectedContact.char_name || selectedContact.display_name;
    if (selectedContact.type === 'group') return selectedContact.name;
    if (isAdmin) {
      const selUser = users.find(u => u.id === selectedPlayerId);
      return selUser ? `${selectedContact.name} ➜ ${selUser.char_name || selUser.display_name}` : selectedContact.name;
    }
    return selectedContact.name;
  })();

  const buildThreadKey = (contact, selPlayerId) => {
    if (!contact) return 'none';
    if (contact.type === 'user') return `u-${contact.id}`;
    if (contact.type === 'group') return `g-${contact.id}`;
    return isAdmin ? `n-${contact.id}-p-${selPlayerId || 'none'}` : `n-${contact.id}`;
  };

const selectContact = (contact) => {
    // BUG FIX: Αν είναι ήδη επιλεγμένος, μην κάνεις τίποτα για να αποφύγεις το άδειασμα της οθόνης
    if (selectedContact?.type === contact.type && selectedContact?.id === contact.id) {
      return;
    }

    setDrafts(prev => ({ ...prev, [threadKey]: newMessage }));
    setSelectedContact(contact);
    
    if (isAdmin && contact?.type === 'user') setSelectedPlayerId(null);
    
    const nextKey = buildThreadKey(contact, isAdmin && contact?.type === 'npc' ? selectedPlayerId : null);
    setNewMessage(drafts[nextKey] || '');
    setError('');
    
    if (contact.type === 'user') {
      setUsers(prev => prev.map(u => u.id === contact.id ? { ...u, unread_count: 0 } : u));
      api.post('/chat/read', { sender_id: contact.id }).catch(()=>{});
    }

    if (!isMobile) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectAdminTarget = (userId) => {
    setDrafts(prev => ({ ...prev, [threadKey]: newMessage }));
    setSelectedPlayerId(userId);
    const nextKey = buildThreadKey(selectedContact, userId);
    setNewMessage(drafts[nextKey] || '');
  };

  const renderUserRow = (u, keyPrefix = 'u') => {
    const active = selectedContact?.type === 'user' && selectedContact?.id === u.id;
    const showAdminIcon = isContactAdmin(u);
    const crest = showAdminIcon ? '/img/dice/MessyCrit.png' : symlogo(u.clan);
    const initials = (u.display_name || '?').split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
    const tint = CLAN_COLORS[u.clan] || '#8a0f1a';
    
    let timeStr = '';
    if (u.last_message_at) {
       const d = new Date(u.last_message_at);
       const now = new Date();
       if (d.toDateString() === now.toDateString()) timeStr = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
       else timeStr = d.toLocaleDateString([], {month:'short', day:'numeric'});
    }

    return (
      <button
        type="button"
        key={`${keyPrefix}-${u.id}`}
        className={`${styles.userCard} ${active ? styles.selected : ''}`}
        onClick={() => selectContact(u)}
        style={{ '--accent': tint }}
      >
        <span className={styles.avatar} aria-hidden="true">
          {crest
            ? <img className={styles.avatarImg} src={crest} alt={showAdminIcon ? 'Admin' : `${u.clan || 'Unknown'} crest`} />
            : <span className={styles.initials}>{initials}</span>}
        </span>
        <span className={styles.userMeta}>
          <span className={styles.userName}>
            {u.char_name || 'No character'}
            {u.clan && <span className={styles.clanChip} style={{ '--chip': tint }}>{u.clan}</span>}
            {timeStr && <span style={{marginLeft:'auto', fontSize:'0.7rem', opacity:0.6, fontWeight:'normal'}}>{timeStr}</span>}
          </span>
          <span className={styles.charName}>
            {u.display_name}{showAdminIcon ? ' • Admin' : ''}
          </span>
        </span>
        {u.unread_count > 0 && (
          <span className={styles.unreadBadge}>{u.unread_count}</span>
        )}
      </button>
    );
  };

  // Group Create Modal
  const renderCreateGroupModal = () => (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <h3>Create Group Chat</h3>
        <input type="text" placeholder="Group Name" className={styles.input} value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
        <div className={styles.memberSelect}>
          {usersWithChar.map(u => (
            <label key={u.id} className={styles.memberRow}>
              <input type="checkbox" 
                checked={newGroupMembers.includes(u.id)}
                onChange={e => {
                  if(e.target.checked) setNewGroupMembers(p => [...p, u.id]);
                  else setNewGroupMembers(p => p.filter(id => id !== u.id));
                }}
              />
              <span>{u.char_name} <small>({u.display_name})</small></span>
            </label>
          ))}
        </div>
        <div className={styles.modalActions}>
          <button onClick={() => setCreatingGroup(false)} className={styles.btnSec}>Cancel</button>
          <button onClick={handleCreateGroup} className={styles.btnPri} disabled={!newGroupName || !newGroupMembers.length}>Create</button>
        </div>
      </div>
    </div>
  );

  const containerClasses = [
    styles.commsContainer,
    isMobile && selectedContact ? styles.mobileChatActive : ''
  ].filter(Boolean).join(' ');

  return (
    <div ref={containerRef} className={containerClasses} style={{ '--accent': currentAccent }}>
      {creatingGroup && renderCreateGroupModal()}

      <aside className={styles.userList} id="comms-contacts">
        <div className={styles.listHeader}>
          <div className={styles.listTitle}>Contacts</div>
          <button className={styles.addGroupBtn} onClick={() => setCreatingGroup(true)} title="Create Group">+</button>
        </div>
        <div className={styles.searchWrap}>
          <input type="text" className={styles.search} placeholder="Search..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>

        <div className={styles.usersScroll}>
          {/* Group List */}
          {filteredGroups.length > 0 && (
            <>
              <div className={styles.sectionLabel}>Groups</div>
              {filteredGroups.map(g => (
                <button key={`g-${g.id}`} className={`${styles.userCard} ${selectedContact?.id === g.id && selectedContact.type==='group' ? styles.selected : ''}`}
                  onClick={() => selectContact(g)}>
                  <span className={styles.avatar}><span className={styles.initials}>#</span></span>
                  <span className={styles.userMeta}>
                    <span className={styles.userName}>{g.name}</span>
                  </span>
                </button>
              ))}
            </>
          )}

          <div className={styles.sectionLabel}>Players</div>
          {usersWithChar.map(u => renderUserRow(u, 'wch'))}

          <button type="button" onClick={() => setNoCharOpen(v => !v)} className={styles.drawerHeader}>
            <span className={styles.caret} data-open={noCharOpen ? '1' : '0'}>▸</span>
            <span>No Character</span>
            <span className={styles.countBubble}>{usersNoChar.length}</span>
          </button>
          {noCharOpen && (
            <div id="nochar-list">
              {usersNoChar.map(u => renderUserRow(u, 'nch'))}
            </div>
          )}

          <div className={styles.sectionLabel}>NPCs</div>
          {filteredNpcs.map(n => {
            const active = selectedContact?.type === 'npc' && selectedContact?.id === n.id;
            const crest = symlogo(n.clan);
            const tint = CLAN_COLORS[n.clan] || '#8a0f1a';
            let timeStr = '';
            if (n.last_message_at) {
               const d = new Date(n.last_message_at);
               const now = new Date();
               if (d.toDateString() === now.toDateString()) timeStr = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
               else timeStr = d.toLocaleDateString([], {month:'short', day:'numeric'});
            }
            return (
              <button type="button" key={`n-${n.id}`} className={`${styles.userCard} ${active ? styles.selected : ''}`} onClick={() => selectContact(n)} style={{ '--accent': tint }}>
                <span className={styles.avatar}>
                  {crest ? <img className={styles.avatarImg} src={crest} alt="crest"/> : <span className={styles.initials}>{(n.name||'?').slice(0,2)}</span>}
                </span>
                <span className={styles.userMeta}>
                  <span className={styles.userName}>
                    {n.name} 
                    {n.clan && <span className={styles.clanChip} style={{'--chip':tint}}>{n.clan}</span>}
                    {timeStr && <span style={{marginLeft:'auto', fontSize:'0.7rem', opacity:0.6, fontWeight:'normal'}}>{timeStr}</span>}
                  </span>
                  <span className={styles.charName}>NPC</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <main className={styles.chatWindow}>
        {selectedContact ? (
          <>
            <header className={styles.chatHeader} style={{ '--accent': currentAccent }}>
              <div className={styles.chatWith}>
                {/* Mobile Back Button */}
                <button type="button" className={styles.mobileContactsBtn} onClick={() => setSelectedContact(null)}>{'<'}</button>
                <span className={styles.chatDot} />
                <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1}}>
                   Chat with <b>{headerLabel}</b>
                </span>
                {selectedContact.type === 'npc' && selectedContact.clan && (
                  <span className={styles.charTag}>{selectedContact.clan}</span>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button type="button" className={`${styles.notifBtn} ${notifOn ? styles.notifOn : ''}`} onClick={toggleNotifications}>
                    {notifOn ? '🔔' : '🔕'}
                  </button>
                </div>
              </div>
              {notifDenied && (
                <div className={styles.errorBanner} style={{ margin:'8px 0 0' }}>Notifications blocked. Allow in browser settings.</div>
              )}

              {isAdmin && selectedContact.type === 'npc' && (
                <div className={styles.adminRosterWrap}>
                  <div className={styles.adminRosterHeader}>
                    <div className={styles.adminRosterTabs}>
                      <button type="button" className={`${styles.rosterTab} ${adminPlayerTab === 'recent' ? styles.active : ''}`} onClick={() => setAdminPlayerTab('recent')}>Recent</button>
                      <button type="button" className={`${styles.rosterTab} ${adminPlayerTab === 'all' ? styles.active : ''}`} onClick={() => setAdminPlayerTab('all')}>All</button>
                    </div>
                    {adminPlayerTab === 'all' && (
                      <div className={styles.rosterSearchWrap}>
                        <input className={styles.rosterSearch} placeholder="Search players…" value={adminPlayerFilter} onChange={(e)=>setAdminPlayerFilter(e.target.value)} />
                      </div>
                    )}
                    <div className={styles.replyingTo}>
                      {selectedPlayerId
                        ? <><span>To: </span><b>{users.find(u => u.id === selectedPlayerId)?.char_name || 'Unknown'}</b><button type="button" className={styles.clearTargetBtn} onClick={() => setSelectedPlayerId(null)}>Clear</button></>
                        : <span className={styles.replyHint}>Pick a player to reply as <b>{selectedContact.name}</b></span>
                      }
                    </div>
                  </div>
                  <div className={styles.adminRosterList}>
                    {(adminPlayerTab === 'recent' ? adminRecentPlayers : adminAllPlayersFiltered).map(u => {
                      const tint = CLAN_COLORS[u.clan] || '#8a0f1a';
                      return (
                        <button type="button" key={`sel-${u.id}`} className={`${styles.rosterItem} ${selectedPlayerId === u.id ? styles.selected : ''}`} onClick={() => selectAdminTarget(u.id)} style={{ '--accent': tint }}>
                          <span className={styles.rosterAvatar}>{symlogo(u.clan) ? <img className={styles.rosterAvatarImg} src={symlogo(u.clan)} alt="crest"/> : <span className={styles.rosterInitials}>{(u.display_name||'?').slice(0,2)}</span>}</span>
                          <span className={styles.rosterMeta}>
                            <span className={styles.rosterName}>{u.char_name || 'No character'}</span>
                            <span className={styles.rosterSub}>{u.display_name}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </header>

            <div className={styles.messageList} ref={messagesListRef}>
              {grouped.map(item => {
                if (item.type === 'day') return <div key={item.id} className={styles.dayDivider}><span>{item.day}</span></div>;
                const mine = selectedContact.type === 'user' ? item.sender_id === currentUser.id : (selectedContact.type === 'group' ? item.sender_id === currentUser.id : (isAdmin ? item.sender_id==='npc' : item.sender_id===currentUser.id));
                return (
                  <div key={item.id} className={`${styles.messageRow} ${mine ? styles.right : styles.left}`}>
                    <div className={`${styles.messageBubble} ${mine ? styles.sent : styles.received}`} style={mine ? { '--accent': currentAccent } : undefined}>
                      {selectedContact.type === 'group' && !mine && (
                        <div className={styles.groupSender} style={{ color: CLAN_COLORS[item.sender_clan] || '#ccc' }}>
                          {item.sender_name}
                        </div>
                      )}
                      
                      {/* Secure Image Rendering with ChatImage Component */}
                      {item.attachment_id && (
                        <div className={styles.chatImageWrapper}>
                          <ChatImage attachmentId={item.attachment_id} />
                        </div>
                      )}
                      
                      {item.body && <div className={styles.messageBody}>{item.body}</div>}
                      
                      <div className={styles.messageMetaLine}>
                        <span className={styles.messageTimestamp}>
                            {formatTime(item.created_at)}
                            {mine && <span className={styles.statusWrapper}><StatusIcon msg={item} /></span>}
                        </span>
                        {!mine && item.body && <button className={styles.actionBtn} onClick={() => copyToClipboard(item.body)} title="Copy">Copy</button>}
                      </div>
                      <span className={`${styles.tail} ${mine ? styles.tailRight : styles.tailLeft}`} />
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
              {showScrollBtn && (
                 <button className={styles.scrollBtn} onClick={() => scrollToBottom(true)}>↓</button>
              )}
            </div>

            <form className={styles.messageInputForm} onSubmit={handleSendMessage}>
                {/* Image Preview Container */}
                {previewUrl && (
                  <div className={styles.previewContainer}>
                    <div className={styles.previewWrapper}>
                       <img src={previewUrl} alt="Preview" />
                       <button type="button" onClick={clearAttachment} className={styles.removePreviewBtn}>×</button>
                    </div>
                  </div>
                )}

                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{display:'none'}} 
                  accept="image/*" 
                  onChange={handleFileSelect} 
                />

                {/* Upload Button */}
                <button 
                  type="button" 
                  className={styles.uploadBtn} 
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach Image"
                >
                  <ImageIcon />
                </button>

                <div className={styles.inputWrapper}>
                    <textarea 
                        ref={textareaRef}
                        value={newMessage} 
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..." 
                        className={styles.messageInput} 
                        disabled={isAdmin && selectedContact.type === 'npc' && !selectedPlayerId} 
                        rows={1}
                    />
                </div>
                <button type="submit" className={styles.sendButton} disabled={sendingRef.current || (!newMessage.trim() && !attachment) || (isAdmin && selectedContact.type === 'npc' && !selectedPlayerId)}>
                    <span className={styles.sendIcon}>➤</span>
                </button>
            </form>
          </>
        ) : (
          <div className={styles.placeholder}>Select a contact to start a conversation</div>
        )}
        {error && <div className={styles.errorBanner}>{error}</div>}
      </main>
    </div>
  );
}