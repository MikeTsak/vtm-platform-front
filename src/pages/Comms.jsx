// src/pages/Comms.jsx
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import api from '../api';
import { AuthCtx } from '../AuthContext';
import styles from '../styles/Comms.module.css';

/* --- Clan assets & colors --- */
const CLAN_COLORS = {
  Brujah: '#b40f1f',
  Gangrel: '#2f7a3a',
  Malkavian: '#713c8b',
  Nosferatu: '#6a4b2b',
  Toreador: '#b8236b',
  Tremere: '#7b1113',
  Ventrue: '#1b4c8c',
  'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b',
  Lasombra: '#191a5a',
  'The Ministry': '#865f12',
  Caitiff: '#636363',
  'Thin-blood': '#6e6e2b',
};
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim', 'Thin-blood': 'Thinblood' };
const symlogo = (c) =>
  (c ? `/img/clans/330px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g, '_')}_symbol.png` : '');

/* --- PUSH HELPERS (Web Push + SW) --- */
const VAPID_PUBLIC_KEY =
  (window.__VAPID_PUBLIC_KEY__ ||
    (document.querySelector('meta[name="vapid-public-key"]')?.content) ||
    process.env.REACT_APP_VAPID_PUBLIC_KEY ||
    '').trim();

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
    // Try common filenames; adjust if your SW is elsewhere
    const reg = await navigator.serviceWorker.register('/sw.js')
      .catch(() => navigator.serviceWorker.register('/service-worker.js'));
    return reg || null;
  } catch {
    return null;
  }
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
  try {
    await api.post('/api/push/subscribe', { subscription: sub });
  } catch { /* ignore */ }
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

/* --- END PUSH HELPERS --- */

/* Contact shapes */
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
});
const asNpcContact = (n) => ({ type: 'npc', id: n.id, name: n.name, clan: n.clan });

/* Helper to detect admin users */
const isContactAdmin = (u) =>
  u?.role === 'admin' || u?.permission_level === 'admin' || !!u?.is_admin;

export default function Comms() {
  const { user: currentUser } = useContext(AuthCtx);
  const isAdmin = currentUser?.role === 'admin';

  const [users, setUsers] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [filter, setFilter] = useState('');
  const [noCharOpen, setNoCharOpen] = useState(false);

  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [npcConvos, setNpcConvos] = useState([]);
  const [adminPlayerTab, setAdminPlayerTab] = useState('recent');
  const [adminPlayerFilter, setAdminPlayerFilter] = useState('');

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const [drafts, setDrafts] = useState({});
  const sendingRef = useRef(false);

  const [notifOn, setNotifOn] = useState(() => localStorage.getItem('comms_notifs') === '1');
  const notifSupported = typeof window !== 'undefined' && 'Notification' in window;
  const [notifDenied, setNotifDenied] = useState(false);
  const canPush = () => ('serviceWorker' in navigator) && ('PushManager' in window);

  /* --- Mobile detection --- */
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);

  /* --- Scroll logic: delayed auto-scroll after user scrolls up --- */
  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null);
  const autoScrollTimeout = useRef(null);
  const userScrollingRef = useRef(false);

  const isNearBottom = (el, pad = 120) => {
    if (!el) return true;
    const { scrollTop, scrollHeight, clientHeight } = el;
    return scrollHeight - scrollTop - clientHeight < pad;
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }
  };

  // User scroll listener: mark when user leaves bottom; schedule gentle snap after ~2.5s
  useEffect(() => {
    const el = messagesListRef.current;
    if (!el) return;

    const onScroll = () => {
      const away = !isNearBottom(el);
      userScrollingRef.current = away;

      clearTimeout(autoScrollTimeout.current);
      if (away) {
        autoScrollTimeout.current = setTimeout(() => {
          userScrollingRef.current = false;
          scrollToBottom(true);
        }, 2500);
      }
    };

    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // On new messages: if near bottom → snap now; else → wait ~2.5s then snap
  useEffect(() => {
    const el = messagesListRef.current;
    if (!el) return;

    clearTimeout(autoScrollTimeout.current);

    if (isNearBottom(el)) {
      scrollToBottom(false);
      userScrollingRef.current = false;
    } else {
      userScrollingRef.current = true;
      autoScrollTimeout.current = setTimeout(() => {
        userScrollingRef.current = false;
        scrollToBottom(true);
      }, 2500);
    }

    return () => clearTimeout(autoScrollTimeout.current);
  }, [messages]);

  /* --- Screen resize handling --- */
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

  /* --- Notifications (state & persistence) --- */
  useEffect(() => {
    localStorage.setItem('comms_notifs', notifOn ? '1' : '0');
  }, [notifOn]);

  // Auto ensure push subscription if notifOn is true
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
    if (perm === 'default') {
      try { perm = await Notification.requestPermission(); } catch { perm = 'denied'; }
    }

    if (perm !== 'granted') {
      setNotifDenied(true);
      setNotifOn(false);
      return;
    }

    try {
      // Register SW + subscribe + save to API
      if (canPush() && VAPID_PUBLIC_KEY) {
        const sub = await subscribePush();
        if (sub) {
          // QUICK SELF-TEST: immediately fire a push to me
          try { await api.post('/api/push/test'); } catch {}
        }
      }
    } catch { /* ignore */ }

    setNotifDenied(false);
    setNotifOn(true);
  } else {
    try {
      // If we can read endpoint, remove server-side too
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      const endpoint = sub?.endpoint;
      try { await unsubscribePush(); } catch {}
      if (endpoint) {
        try { await api.post('/api/push/unsubscribe', { endpoint }); } catch {}
      }
    } catch {}
    setNotifOn(false);
    setNotifDenied(false);
  }
};


  const pageVisibleRef = useRef(!document.hidden);
  useEffect(() => {
    const onVis = () => { pageVisibleRef.current = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  /* --- Thread key & drafts --- */
  const threadKey = useMemo(() => {
    if (!selectedContact) return 'none';
    if (selectedContact.type === 'user') return `u-${selectedContact.id}`;
    return isAdmin ? `n-${selectedContact.id}-p-${selectedPlayerId || 'none'}` : `n-${selectedContact.id}`;
  }, [selectedContact, selectedPlayerId, isAdmin]);

  const prevThreadKeyRef = useRef(threadKey);
  useEffect(() => {
    if (prevThreadKeyRef.current !== threadKey) {
      setDrafts(prev => ({ ...prev, [prevThreadKeyRef.current]: newMessage }));
      setNewMessage((prevDrafts => (prevDrafts[threadKey] || ''))(drafts));
      prevThreadKeyRef.current = threadKey;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadKey, drafts, newMessage]);

  const lastTsRef = useRef(0);
  const initialSyncRef = useRef(true);
  useEffect(() => {
    initialSyncRef.current = true;
    lastTsRef.current = 0;
  }, [threadKey]);

  const isInbound = (m) => {
    if (!selectedContact) return false;
    if (selectedContact.type === 'user') {
      return m.sender_id !== currentUser?.id;
    }
    if (isAdmin) return m.sender_id !== 'npc';
    return m.sender_id === 'npc';
  };

  const notify = (title, body, icon) => {
    try {
      // in-tab notifications (when hidden or not focused)
      if (!notifSupported) return;
      if (!notifOn) return;
      if (Notification.permission !== 'granted') return;

      const opts = { body, icon, badge: icon, tag: `comms-${threadKey}` };
      new Notification(title, opts);
    } catch { /* noop */ }
  };

  /* --- API & data --- */
  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) api.defaults.headers.common['Authorization'] = `Bearer ${t}`;

    const id = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err?.response?.status === 401) {
          setError('Your session expired. Please log in again.');
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  const hasAuthHeader = !!api?.defaults?.headers?.common?.Authorization;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [{ data: u }, { data: n }] = await Promise.all([
          api.get('/chat/users'),
          api.get('/chat/npcs')
        ]);
        const userList = Array.isArray(u) ? u : (u.users || []);
        const npcList  = Array.isArray(n) ? n : (n.npcs || []);
        setUsers(userList.map(asUserContact));
        setNpcs(npcList.map(asNpcContact));
      } catch (e) {
        setError(e?.response?.status === 401 ? 'Your session expired. Please log in again.' : 'Could not load contacts.');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

  useEffect(() => {
    if (!isAdmin || !selectedContact || selectedContact.type !== 'npc' || !hasAuthHeader) {
      setNpcConvos([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        let res;
        try {
          res = await api.get('/admin/chat/npc/conversations', { params: { npc_id: selectedContact.id } });
        } catch {
          res = await api.get(`/admin/chat/npc-conversations/${selectedContact.id}`);
        }
        if (cancelled) return;
        const rows = (res.data?.conversations || []).map(r => ({
          user_id: r.user_id,
          display_name: r.display_name || '',
          char_name: r.char_name || '',
          last_message_at: r.last_message_at || null,
        }));
        rows.sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0));
        setNpcConvos(rows);
      } catch (e) {
        if (e?.response?.status === 401) setError('Your session expired. Please log in again.');
        setNpcConvos([]);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isAdmin, selectedContact, hasAuthHeader]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setMessages([]);
    setError('');

    const load = async () => {
      if (!selectedContact) return;
      try {
        let msgs = [];
        if (selectedContact.type === 'user') {
          const res = await api.get(`/chat/history/${selectedContact.id}`);
          msgs = (res.data.messages || []).map(m => ({
            id: m.id,
            body: m.body,
            created_at: m.created_at,
            sender_id: m.sender_id,
          }));
        } else {
          if (isAdmin) {
            if (!selectedPlayerId || !hasAuthHeader) { setMessages([]); return; }
            let res;
            try {
              res = await api.get(`/admin/chat/npc/history`, {
                params: { npc_id: selectedContact.id, user_id: selectedPlayerId }
              });
            } catch {
              res = await api.get(`/admin/chat/npc-history/${selectedContact.id}/${selectedPlayerId}`);
            }
            msgs = (res.data.messages || []).map(m => ({
              id: m.id,
              body: m.body,
              created_at: m.created_at,
              sender_id: m.from_side === 'npc' ? 'npc' : selectedPlayerId,
              _from: m.from_side,
            }));
          } else {
            const res = await api.get(`/chat/npc-history/${selectedContact.id}`);
            msgs = (res.data.messages || []).map(m => ({
              id: m.id,
              body: m.body,
              created_at: m.created_at,
              sender_id: m.from_side === 'user' ? currentUser.id : 'npc',
              _from: m.from_side,
            }));
          }
        }

        msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        const newestTs = msgs.reduce((t, m) => Math.max(t, new Date(m.created_at).getTime()), 0);
        if (!initialSyncRef.current && newestTs > lastTsRef.current) {
          const inboundNew = msgs.filter(
            m => new Date(m.created_at).getTime() > lastTsRef.current && isInbound(m)
          );

          if (inboundNew.length && (document.hidden || !pageVisibleRef.current)) {
            const latest = inboundNew[inboundNew.length - 1];
            const title =
              selectedContact.type === 'user'
                ? (selectedContact.char_name || selectedContact.display_name || 'New message')
                : (isAdmin && selectedPlayerId
                    ? `${selectedContact.name} ↔ ${users.find(u => u.id === selectedPlayerId)?.char_name || 'Player'}`
                    : selectedContact.name || 'New message');
            const icon = symlogo(selectedContact.clan) || '/img/ATT-logo(1).png';
            notify(title, latest.body || 'New message', icon);
          }
        }

        initialSyncRef.current = false;
        lastTsRef.current = Math.max(lastTsRef.current, newestTs);

        setMessages(msgs);
      } catch (e) {
        setError(e?.response?.status === 401 ? 'Your session expired. Please log in again.' : 'Could not load messages.');
      }
    };

    load();
    pollRef.current = setInterval(load, 6000);
    return () => clearInterval(pollRef.current);
  }, [selectedContact, selectedPlayerId, isAdmin, hasAuthHeader, currentUser?.id, users, threadKey]);

  const handleSendMessage = async (e) => {
    e?.preventDefault?.();
    const body = newMessage.trim();
    if (!body || !selectedContact) return;
    if (isAdmin && selectedContact.type === 'npc' && !selectedPlayerId) return;
    if (sendingRef.current) return;
    sendingRef.current = true;

    try {
      if (selectedContact.type === 'user') {
        const { data } = await api.post('/chat/messages', {
          recipient_id: selectedContact.id,
          body
        });
        setMessages(prev => [...prev, data.message]);
      } else {
        if (isAdmin) {
          const { data } = await api.post('/admin/chat/npc/messages', {
            npc_id: selectedContact.id,
            user_id: selectedPlayerId,
            body
          });
          setMessages(prev => [...prev, {
            id: data.message.id,
            body: data.message.body,
            created_at: data.message.created_at,
            sender_id: 'npc',
            _from: 'npc'
          }]);
        } else {
          const { data } = await api.post('/chat/npc/messages', {
            npc_id: selectedContact.id,
            body
          });
          setMessages(prev => [...prev, {
            id: data.message.id,
            body: data.message.body,
            created_at: data.message.created_at,
            sender_id: currentUser.id,
            _from: 'user'
          }]);
        }
      }

      setNewMessage('');
      setDrafts(prev => ({ ...prev, [threadKey]: '' }));

      if (selectedContact.type === 'user') {
        api.post('/chat/read', { sender_id: selectedContact.id }).catch(()=>{});
      }
    } catch (err) {
      setError(err?.response?.status === 401 ? 'Your session expired. Please log in again.' : 'Failed to send message.');
    } finally {
      sendingRef.current = false;
    }
  };

  /* --- Formatting & memoization --- */
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
    return list.filter(u =>
      (u.display_name || '').toLowerCase().includes(q) ||
      (u.char_name || '').toLowerCase().includes(q)
    );
  }, [users, filter]);

  const usersNoChar = useMemo(
    () => (filteredUsers || []).filter(u => !u.char_id || Number(u.char_id) === 1),
    [filteredUsers]
  );
  const usersWithChar = useMemo(
    () => (filteredUsers || []).filter(u => u.char_id && Number(u.char_id) !== 1),
    [filteredUsers]
  );

  const adminAllPlayersFiltered = useMemo(() => {
    const q = adminPlayerFilter.trim().toLowerCase();
    const list = users || [];
    if (!q) return list;
    return list.filter(u =>
      (u.char_name || '').toLowerCase().includes(q) ||
      (u.display_name || '').toLowerCase().includes(q)
    );
  }, [users, adminPlayerFilter]);

  const adminRecentPlayers = useMemo(() => {
    const byId = new Map((users || []).map(u => [u.id, u]));
    return (npcConvos || []).map(r => {
      const u = byId.get(r.user_id);
      return u
        ? { ...u, last_message_at: r.last_message_at }
        : { type: 'user', id: r.user_id, display_name: r.display_name, char_name: r.char_name, clan: undefined, last_message_at: r.last_message_at };
    });
  }, [npcConvos, users]);

  if (loading) return <div className={styles.loading}>Loading contacts…</div>;

  const currentAccent = (() => {
    if (!selectedContact) return '#8a0f1a';
    if (selectedContact.type === 'user') return CLAN_COLORS[selectedContact.clan] || '#8a0f1a';
    return CLAN_COLORS[selectedContact.clan] || '#8a0f1a';
  })();

  const headerLabel = (() => {
    if (!selectedContact) return '';
    if (selectedContact.type === 'user') return selectedContact.char_name || selectedContact.display_name;
    if (isAdmin) {
      const selUser = users.find(u => u.id === selectedPlayerId);
      return selUser
        ? `${selectedContact.name} ➜ ${selUser.char_name || selUser.display_name}`
        : selectedContact.name;
    }
    return selectedContact.name;
  })();

  /* --- Selection handlers --- */
  const buildThreadKey = (contact, selPlayerId) => {
    if (!contact) return 'none';
    if (contact.type === 'user') return `u-${contact.id}`;
    return isAdmin ? `n-${contact.id}-p-${selPlayerId || 'none'}` : `n-${contact.id}`;
  };

  const selectContact = (contact) => {
    setDrafts(prev => ({ ...prev, [threadKey]: newMessage }));
    setSelectedContact(contact);
    if (isAdmin && contact?.type === 'user') setSelectedPlayerId(null);

    const nextKey = buildThreadKey(contact, isAdmin && contact?.type === 'npc' ? selectedPlayerId : null);
    setNewMessage(drafts[nextKey] || '');
    setError('');

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
          </span>
          <span className={styles.charName}>
            {u.display_name}{showAdminIcon ? ' • Admin' : ''}
          </span>
        </span>
      </button>
    );
  };

  const containerClasses = [
    styles.commsContainer,
    isMobile && selectedContact ? styles.mobileChatActive : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={{ '--accent': currentAccent }}
    >
      {/* Contacts list */}
      <aside className={styles.userList} id="comms-contacts">
        <div className={styles.listHeader}>
          <div className={styles.listTitle}>Contacts</div>
          <div className={styles.searchWrap}>
            <input
              type="text"
              className={styles.search}
              placeholder="Search players & NPCs…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Search"
            />
          </div>
        </div>

        <div className={styles.usersScroll}>
          {/* Players with characters */}
          <div className={styles.sectionLabel}>Players</div>
          {usersWithChar.map(u => renderUserRow(u, 'wch'))}

          {/* Drawer for 'No Character' */}
          <button
            type="button"
            onClick={() => setNoCharOpen(v => !v)}
            aria-expanded={noCharOpen}
            aria-controls="nochar-list"
            className={styles.drawerHeader}
          >
            <span aria-hidden="true" className={styles.caret} data-open={noCharOpen ? '1' : '0'}>▸</span>
            <span>No Character</span>
            <span className={styles.countBubble}>{usersNoChar.length}</span>
          </button>
          {noCharOpen && (
            <div id="nochar-list">
              {usersNoChar.map(u => renderUserRow(u, 'nch'))}
              {usersNoChar.length === 0 && (
                <div className={styles.rosterEmpty}>No users here.</div>
              )}
            </div>
          )}

          {/* NPCs */}
          <div className={styles.sectionLabel}>NPCs</div>
          {npcs.map(n => {
            const active = selectedContact?.type === 'npc' && selectedContact?.id === n.id;
            const crest = symlogo(n.clan);
            const tint = CLAN_COLORS[n.clan] || '#8a0f1a';
            return (
              <button
                type="button"
                key={`n-${n.id}`}
                className={`${styles.userCard} ${active ? styles.selected : ''}`}
                onClick={() => selectContact(n)}
                style={{ '--accent': tint }}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {crest
                    ? <img className={styles.avatarImg} src={crest} alt={`${n.clan || 'Unknown'} crest`} />
                    : <span className={styles.initials}>{(n.name || '?').slice(0,2).toUpperCase()}</span>}
                </span>
                <span className={styles.userMeta}>
                  <span className={styles.userName}>
                    {n.name}
                    {n.clan && <span className={styles.clanChip} style={{ '--chip': tint }}>{n.clan}</span>}
                  </span>
                  <span className={styles.charName}>NPC</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Chat pane */}
      <main className={styles.chatWindow}>
        {selectedContact ? (
          <>
            <header className={styles.chatHeader} style={{ '--accent': currentAccent }}>
              <div className={styles.chatWith}>
                {/* Mobile back */}
                <button
                  type="button"
                  className={styles.mobileContactsBtn}
                  onClick={() => setSelectedContact(null)}
                >
                  {'<'}
                </button>

                <span className={styles.chatDot} aria-hidden="true" />
                Chat with <b>{headerLabel}</b>
                {selectedContact.type === 'npc' && selectedContact.clan && (
                  <span className={styles.charTag}>{selectedContact.clan}</span>
                )}

                {/* Notifications toggle */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className={`${styles.notifBtn} ${notifOn ? styles.notifOn : ''}`}
                    onClick={toggleNotifications}
                    title={notifSupported ? (notifOn ? 'Notifications on' : 'Notifications off') : 'Not supported'}
                  >
                    {notifOn ? '🔔 Notifications On' : '🔕 Notifications Off'}
                  </button>
                </div>
              </div>

              {/* Inline banner if notifications are blocked */}
              {notifDenied && (
                <div className={styles.errorBanner} style={{ margin:'8px 0 0' }}>
                  Notifications are blocked by the browser.
                  <div style={{ marginTop:6, display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button
                      type="button"
                      className={styles.notifBtn}
                      onClick={async () => {
                        setNotifDenied(false);
                        await toggleNotifications();
                      }}
                    >
                      Try again
                    </button>
                    <span style={{ opacity:0.85 }}>
                      Tip: Allow notifications in your browser settings, then click “Try again”.
                      <span style={{ display:'block', fontSize:12, marginTop:4 }}>
                        Chrome: Site info (🔒) → Notifications → <b>Allow</b> •
                        Firefox: Site info (🔒) → Permissions → <b>Send notifications</b>
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Admin-only roster to reply as NPC */}
              {isAdmin && selectedContact.type === 'npc' && (
                <div className={styles.adminRosterWrap}>
                  <div className={styles.adminRosterHeader}>
                    <div className={styles.adminRosterTabs}>
                      <button
                        type="button"
                        className={`${styles.rosterTab} ${adminPlayerTab === 'recent' ? styles.active : ''}`}
                        onClick={() => setAdminPlayerTab('recent')}
                      >
                        Recent
                      </button>
                      <button
                        type="button"
                        className={`${styles.rosterTab} ${adminPlayerTab === 'all' ? styles.active : ''}`}
                        onClick={() => setAdminPlayerTab('all')}
                      >
                        All Players
                      </button>
                    </div>

                    {adminPlayerTab === 'all' && (
                      <div className={styles.rosterSearchWrap}>
                        <input
                          className={styles.rosterSearch}
                          placeholder="Search players…"
                          value={adminPlayerFilter}
                          onChange={(e)=>setAdminPlayerFilter(e.target.value)}
                          aria-label="Search players"
                        />
                      </div>
                    )}

                    <div className={styles.replyingTo}>
                      {selectedPlayerId
                        ? (
                          <>
                            <span>Replying to: </span>
                            <b>
                              {users.find(u => u.id === selectedPlayerId)?.char_name
                                || users.find(u => u.id === selectedPlayerId)?.display_name
                                || 'Unknown'}
                            </b>
                            <button
                              type="button"
                              className={styles.clearTargetBtn}
                              onClick={() => setSelectedPlayerId(null)}
                              title="Clear selected player"
                            >
                              Clear
                            </button>
                          </>
                        )
                        : <span className={styles.replyHint}>Pick a player to reply as <b>{selectedContact.name}</b></span>
                      }
                    </div>
                  </div>

                  <div className={styles.adminRosterList}>
                    {(adminPlayerTab === 'recent' ? adminRecentPlayers : adminAllPlayersFiltered).map(u => {
                      const showAdminIcon = isContactAdmin(u);
                      const crest = showAdminIcon ? '/img/dice/MessyCrit.png' : symlogo(u.clan);
                      const initials = (u.display_name || '?').split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
                      const tint = CLAN_COLORS[u.clan] || '#8a0f1a';
                      const active = selectedPlayerId === u.id;
                      return (
                        <button
                          type="button"
                          key={`sel-${u.id}`}
                          className={`${styles.rosterItem} ${active ? styles.selected : ''}`}
                          onClick={() => selectAdminTarget(u.id)}
                          style={{ '--accent': tint }}
                          title={u.char_name || u.display_name}
                        >
                          <span className={styles.rosterAvatar} aria-hidden="true">
                            {crest
                              ? <img className={styles.rosterAvatarImg} src={crest} alt={showAdminIcon ? 'Admin' : `${u.clan || 'Unknown'} crest`} />
                              : <span className={styles.rosterInitials}>{initials}</span>}
                          </span>
                          <span className={styles.rosterMeta}>
                            <span className={styles.rosterName}>
                              {u.char_name || 'No character'}
                              {u.clan && <span className={styles.clanChip} style={{ '--chip': tint }}>{u.clan}</span>}
                            </span>
                            <span className={styles.rosterSub}>
                              {u.display_name}{showAdminIcon ? ' • Admin' : ''}
                            </span>
                            {u.last_message_at && (
                              <span className={styles.rosterTime}>
                                {new Date(u.last_message_at).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}

                    {(adminPlayerTab === 'recent' && adminRecentPlayers.length === 0) && (
                      <div className={styles.rosterEmpty}>No conversations yet for this NPC.</div>
                    )}
                    {(adminPlayerTab === 'all' && adminAllPlayersFiltered.length === 0) && (
                      <div className={styles.rosterEmpty}>No players match your search.</div>
                    )}
                  </div>
                </div>
              )}
            </header>

            {/* Messages */}
            <div className={styles.messageList} ref={messagesListRef}>
              {grouped.map(item => {
                if (item.type === 'day') {
                  return (
                    <div key={item.id} className={styles.dayDivider}>
                      <span>{item.day}</span>
                    </div>
                  );
                }
                const mine = (() => {
                  if (selectedContact.type === 'user') {
                    return item.sender_id === currentUser.id;
                  } else {
                    if (isAdmin) return item.sender_id === 'npc';
                    return item.sender_id === currentUser.id;
                  }
                })();

                return (
                  <div key={item.id} className={`${styles.messageRow} ${mine ? styles.right : styles.left}`}>
                    <div
                      className={`${styles.messageBubble} ${mine ? styles.sent : styles.received}`}
                      style={mine ? { '--accent': currentAccent } : undefined}
                    >
                      <div className={styles.messageBody}>{item.body}</div>
                      <div className={styles.messageTimestamp}>{formatTime(item.created_at)}</div>
                      <span className={`${styles.tail} ${mine ? styles.tailRight : styles.tailLeft}`} />
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className={styles.messageInputForm} onSubmit={handleSendMessage}>
              {isAdmin && selectedContact.type === 'npc' && !selectedPlayerId && (
                <div className={styles.errorBanner} style={{ marginBottom: 8 }}>
                  Select a player to reply to as this NPC.
                </div>
              )}
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message…"
                className={styles.messageInput}
                aria-label="Message"
                disabled={isAdmin && selectedContact.type === 'npc' && !selectedPlayerId}
              />
              <button
                type="submit"
                className={styles.sendButton}
                disabled={sendingRef.current || !newMessage.trim() || (isAdmin && selectedContact.type === 'npc' && !selectedPlayerId)}
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className={styles.placeholder}>
            Select a contact to start a conversation
          </div>
        )}

        {error && <div className={styles.errorBanner}>{error}</div>}
      </main>
    </div>
  );
}