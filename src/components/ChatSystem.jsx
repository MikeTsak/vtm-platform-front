// src/components/ChatSystem.jsx
import React, { useState, useEffect, useContext, useRef, useMemo, useLayoutEffect, useCallback } from 'react';
import { AuthCtx } from '../core/AuthContext';
import api from '../core/api';
import styles from '../styles/ChatSystem.module.css';
import '../styles/SchreckNetChat.css';
import { Skeleton } from 'boneyard-js/react';
import Avatar from './Avatar';
import EmojiPicker from 'emoji-picker-react';
import MiniSearch from 'minisearch';
import { getPushSettings, updatePushSettings, subscribeToWebPush } from '../utils/push';

/* --- Clan assets & colors --- */
const CLAN_COLORS = {
  Brujah: '#b40f1f', Gangrel: '#2f7a3a', Malkavian: '#713c8b', Nosferatu: '#6a4b2b',
  Toreador: '#b8236b', Tremere: '#7b1113', Ventrue: '#1b4c8c', 'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b', Lasombra: '#191a5a', 'The Ministry': '#865f12',
  Caitiff: '#636363', 'Thin-blood': '#6e6e2b',
};
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim', 'Thin-blood': 'Thinblood' };
const getApiOrigin = () => {
  try {
    const base = api?.defaults?.baseURL;
    if (!base) return '';
    // baseURL may be a full origin ("https://host/api") or already relative ("/api")
    return base.replace(/\/+$/, '').replace(/\/api$/, '');
  } catch {
    return '';
  }
};

const symlogo = (c) =>
  (c ? `${getApiOrigin()}/img/clans/330px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g, '_')}_symbol.png` : '');
const localSymlogo = (c) =>
  (c ? `/img/clans/330px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g, '_')}_symbol.png` : '');

/* --- Gold NPC Tag Component --- */
const NPCTag = () => (
  <span style={{
    color: '#ffd700',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    marginLeft: '6px',
    verticalAlign: 'middle',
    background: 'rgba(255,215,0,0.1)',
    padding: '2px 4px',
    borderRadius: '4px',
    textTransform: 'uppercase'
  }}>
    NPC
  </span>
);



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
  image_url: u.image_url ?? null,
  unread_count: u.unread_count || 0,
  last_message_at: u.last_message_at ? new Date(u.last_message_at).getTime() : 0
});

const asNpcContact = (n) => ({
  type: 'npc',
  id: n.id,
  name: n.name,
  clan: n.clan,
  image_url: n.image_url ?? null,
  last_message_at: n.last_message_at ? new Date(n.last_message_at).getTime() : 0,
  unread_count: n.unread_count || 0
});

const asGroupContact = (g) => ({
  type: 'group',
  id: g.id,
  name: g.name,
  created_by: g.created_by,
  last_message_at: g.last_message_at ? new Date(g.last_message_at).getTime() : 0,
  unread_count: g.unread_count || 0
});

const isContactAdmin = (u) => u?.role === 'admin' || u?.permission_level === 'admin' || !!u?.is_admin;

/* --- MESSENGER SORT HELPER (Unread -> Most Recent -> A-Z) --- */
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
  const [prevId, setPrevId] = useState(attachmentId);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (attachmentId !== prevId) {
    setPrevId(attachmentId);
    setImageUrl(null);
    setLoading(true);
    setError(false);
  }

  useEffect(() => {
    let active = true;
    let urlToRevoke = null;

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

  if (loading) return (
    <Skeleton name="chat-image-loader" loading={true}>
      <div className="w-48 h-48 max-w-full rounded bg-surface-variant/30 animate-pulse" />
    </Skeleton>
  );
  if (error) return <div className="p-4 bg-error/20 text-error rounded-lg text-sm text-center border border-dashed border-error">⚠ Image failed to load</div>;

  return (
    <img
      src={imageUrl}
      alt="Attachment"
      className="w-auto h-auto max-w-full max-h-[300px] object-contain rounded cursor-pointer block"
      onClick={() => window.open(imageUrl, '_blank')}
    />
  );
};

/* --- Helper: Generate unique temporary ID --- */
let tempIdCounter = 0;
const generateTempId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `temp_${crypto.randomUUID()}`;
  }
  return `temp_${Date.now()}_${++tempIdCounter}_${Math.random().toString(36).slice(2, 11)}`;
};

export default function ChatSystem({ commsEnabled = true }) {
  const { user: currentUser } = useContext(AuthCtx);
  const isAdmin = currentUser?.role === 'admin';

  const [users, setUsers] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [filter, setFilter] = useState('');
  const [noCharOpen, setNoCharOpen] = useState(false);

  const [myChar, setMyChar] = useState(null);
  useEffect(() => {
    if (isAdmin) return;
    api.get('/characters/me').then(r => setMyChar(r.data.character)).catch(() => { });
  }, [isAdmin]);

  const isCharActive = isAdmin || (myChar && myChar.sheet && myChar.sheet.is_active === true);

  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [npcConvos, setNpcConvos] = useState([]);
  const [adminPlayerTab, setAdminPlayerTab] = useState('recent');
  const [adminPlayerFilter, setAdminPlayerFilter] = useState('');

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // EDIT/DELETE STATES
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editBody, setEditBody] = useState('');

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const onEmojiClick = (emojiObject) => setNewMessage(prevInput => prevInput + emojiObject.emoji);

  const [attachment, setAttachment] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const [drafts, setDrafts] = useState({});
  const sendingRef = useRef(false);
  const loadSeqRef = useRef(0);

  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState([]);

  const [managingGroup, setManagingGroup] = useState(false);
  const [currentGroupMembers, setCurrentGroupMembers] = useState([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);

  const [headerGroupMembers, setHeaderGroupMembers] = useState([]);

  // Fetch group members dynamically for header rendering
  useEffect(() => {
    if (selectedContact?.type === 'group') {
      let live = true;
      api.get(`/chat/groups/${selectedContact.id}/members`).then(res => {
        if (live) setHeaderGroupMembers(res.data.members || []);
      }).catch(() => { });
      return () => { live = false; };
    } else {
      setHeaderGroupMembers([]);
    }
  }, [selectedContact]);

  const openManageGroup = async () => {
    setManagingGroup(true);
    setGroupMembersLoading(true);
    try {
      const { data } = await api.get(`/chat/groups/${selectedContact.id}/members`);
      setCurrentGroupMembers(data.members || []);
    } catch (e) {
      console.error(e);
    } finally {
      setGroupMembersLoading(false);
    }
  };

  const handleAddMemberToGroup = async (userId) => {
    try {
      await api.post(`/chat/groups/${selectedContact.id}/members`, { members: [userId] });
      openManageGroup();
    } catch (e) { alert('Failed to add member'); }
  };

  const handleRemoveMemberFromGroup = async (userId) => {
    try {
      await api.delete(`/chat/groups/${selectedContact.id}/members/${userId}`);
      openManageGroup();
    } catch (e) { alert('Failed to remove member'); }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group? This will erase all message history and cannot be undone.")) return;
    try {
      await api.delete(`/chat/groups/${selectedContact.id}`);
      setManagingGroup(false);
      setSelectedContact(null);
      fetchContacts();
    } catch (e) { alert('Failed to delete group'); }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group chat?")) return;
    try {
      await api.delete(`/chat/groups/${selectedContact.id}/members/${currentUser.id}`);
      setSelectedContact(null);
      fetchContacts();
    } catch (e) { alert('Failed to leave group'); }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm("Delete this message? It cannot be undone.")) return;
    try {
      await api.delete(`/chat/messages/${msgId}`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (e) {
      alert("Failed to delete message. It may be too old or you lack permission.");
    }
  };

  const submitEditMessage = async () => {
    if (!editBody.trim()) return;
    try {
      await api.put(`/chat/messages/${editingMsgId}`, { body: editBody });
      setMessages(prev => prev.map(m => m.id === editingMsgId ? { ...m, body: editBody, edited: true } : m));
      setEditingMsgId(null);
    } catch (e) {
      alert("Failed to edit message. It may be too old or you lack permission.");
    }
  };

  const [notifSupported] = useState(typeof window !== 'undefined' && 'Notification' in window);
  const [notifOn, setNotifOn] = useState(false);
  const [pushSettingsLoading, setPushSettingsLoading] = useState(true);

  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);

  // Self-measuring height: don't trust any ancestor to hand us a correct
  // height through flex/percentage chains (a fixed-vh wrapper above us,
  // a third-party component that swallows flex context, etc). Instead,
  // measure exactly where we start in the viewport and size ourselves to
  // reach the bottom of the visible viewport. This also keeps the input
  // bar above a mobile on-screen keyboard via the visualViewport API.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateHeight = () => {
      const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const top = el.getBoundingClientRect().top;
      const nextHeight = Math.max(viewportHeight - top, 320);
      el.style.height = `${nextHeight}px`;
    };

    updateHeight();

    const raf = requestAnimationFrame(updateHeight);
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight);
      window.visualViewport.addEventListener('scroll', updateHeight);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateHeight);
        window.visualViewport.removeEventListener('scroll', updateHeight);
      }
    };
  }, []);

  const textareaRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

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

  const clearAttachment = useCallback(() => {
    setAttachment(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [previewUrl]);

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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    clearAttachment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContact]);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [newMessage]);

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

  useEffect(() => {
    // Load push settings on mount
    getPushSettings().then(settings => {
      setNotifOn(!!settings.chat);
      setPushSettingsLoading(false);
    }).catch(() => {
      setPushSettingsLoading(false);
    });
  }, []);

  const toggleNotifications = async () => {
    if (!notifSupported || pushSettingsLoading) return;
    
    if (!notifOn) {
      try {
        await subscribeToWebPush();
        await updatePushSettings({ chat: true });
        setNotifOn(true);
      } catch (err) {
        console.error('Failed to enable push:', err);
        alert('Could not enable notifications: ' + err.message);
      }
    } else {
      try {
        await updatePushSettings({ chat: false });
        setNotifOn(false);
      } catch (err) {
        console.error('Failed to disable push:', err);
      }
    }
  };

  const pageVisibleRef = useRef(!document.hidden);
  useEffect(() => {
    const onVis = () => { pageVisibleRef.current = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

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
      if (!isMobile && textareaRef.current) textareaRef.current.focus();
    }
  }, [threadKey, drafts, newMessage, isMobile]);

  const lastTsRef = useRef(0);
  const initialSyncRef = useRef(true);

  useEffect(() => {
    loadSeqRef.current += 1;
    initialSyncRef.current = true;
    lastTsRef.current = 0;
    setMessages([]);
    setNpcConvos([]);
    setError('');
  }, [threadKey]);

  const isInbound = useCallback((m) => {
    if (!selectedContact) return false;
    if (selectedContact.type === 'user') return m.sender_id !== currentUser?.id;
    if (selectedContact.type === 'group') return m.sender_id !== currentUser?.id;
    if (isAdmin) return m.sender_id !== 'npc';
    return m.sender_id === 'npc';
  }, [selectedContact, currentUser, isAdmin]);

  const notify = useCallback((title, body, icon) => {
    try {
      if (!notifSupported) return;
      if (!notifOn) return;
      if (Notification.permission !== 'granted') return;
      const opts = { body, icon, badge: icon, tag: `comms-${threadKey}` };
      new Notification(title, opts);
    } catch { /* noop */ }
  }, [notifSupported, notifOn, threadKey]);

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

  // Background Contacts Fetcher
  const fetchContacts = useCallback(async () => {
    if (!hasAuthHeader) return;
    try {
      const [{ data: u }, { data: n }, { data: g }] = await Promise.all([
        api.get('/chat/users'),
        api.get('/chat/npcs'),
        api.get('/chat/groups')
      ]);
      setUsers(sortContacts((u.users || []).map(asUserContact)));
      setNpcs(sortContacts((n.npcs || []).map(asNpcContact)));
      setGroups(sortContacts((g.groups || []).map(asGroupContact)));
    } catch (e) {
      if (e?.response?.status === 401) setError('Your session expired. Please log in again.');
    }
  }, [hasAuthHeader]);

  // Initial Load & Polling setup
  useEffect(() => {
    setLoading(true);
    fetchContacts().finally(() => setLoading(false));

    const contactInterval = setInterval(fetchContacts, 10000);
    return () => clearInterval(contactInterval);
  }, [fetchContacts, creatingGroup]);

  // Active Conversation Message Polling
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

    const load = async () => {
      if (!selectedContact) return;
      const mySeq = loadSeqRef.current;
      try {
        let msgs = [];
        let hasNewMessages = false;
        let isInitialLoad = initialSyncRef.current;

        const shouldFetchMessages = !(isAdmin && selectedContact.type === 'npc' && !selectedPlayerId);

        if (shouldFetchMessages) {
          if (selectedContact.type === 'group') {
            const res = await api.get(`/chat/groups/${selectedContact.id}/history`);
            msgs = (res.data.messages || []).map(m => ({
              id: m.id, body: m.body, created_at: m.created_at, sender_id: m.sender_id,
              sender_name: m.char_name || m.display_name, sender_clan: m.clan,
              attachment_id: m.attachment_id, edited: m.edited
            }));
          } else if (selectedContact.type === 'user') {
            const res = await api.get(`/chat/history/${selectedContact.id}`);
            msgs = (res.data.messages || []).map(m => ({
              id: m.id, body: m.body, created_at: m.created_at,
              read_at: m.read_at, delivered_at: m.delivered_at,
              sender_id: m.sender_id,
              attachment_id: m.attachment_id, edited: m.edited
            }));
          } else {
            if (isAdmin) {
              if (selectedPlayerId && hasAuthHeader) {
                const res = await api.get(`/admin/chat/npc-history/${selectedContact.id}/${selectedPlayerId}`);
                msgs = (res.data.messages || []).map(m => ({
                  id: m.id, body: m.body, created_at: m.created_at, sender_id: m.from_side === 'npc' ? 'npc' : selectedPlayerId, _from: m.from_side,
                  attachment_id: m.attachment_id, edited: m.edited
                }));
              }
            } else {
              const res = await api.get(`/chat/npc-history/${selectedContact.id}`);
              msgs = (res.data.messages || []).map(m => ({
                id: m.id,
                body: m.body,
                created_at: m.created_at,
                sender_id: m.from_side === 'user' ? currentUser.id : 'npc',
                _from: m.from_side,
                attachment_id: m.attachment_id, edited: m.edited
              }));
            }
          }

          msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          const newestTs = msgs.reduce((t, m) => Math.max(t, new Date(m.created_at).getTime()), 0);

          hasNewMessages = newestTs > lastTsRef.current;

          if (loadSeqRef.current !== mySeq) return;

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
            setMessages(prev => {
              const serverIds = new Set(msgs.map(m => m.id));
              const localOnly = prev.filter(m => String(m.id).startsWith('temp_') && !serverIds.has(m.id));
              return [...msgs, ...localOnly];
            });

            if (selectedContact.type === 'user' && !isAdmin && msgs.length > 0) {
              api.post('/chat/delivered', { sender_id: selectedContact.id }).catch(() => { });
            }
          }
        }

        // ---> Admin Roster Sync <---
        if (isAdmin && selectedContact.type === 'npc' && hasAuthHeader) {
          try {
            const res = await api.get(`/admin/chat/npc-conversations/${selectedContact.id}`);
            if (loadSeqRef.current !== mySeq) return;
            const rows = (res.data?.conversations || []).map(r => ({
              user_id: r.user_id,
              display_name: r.display_name || '',
              char_name: r.char_name || '',
              last_message_at: r.last_message_at || null,
              unread_count: r.unread_count || 0
            }));
            rows.sort((a, b) => {
              const unreadDiff = (b.unread_count || 0) - (a.unread_count || 0);
              if (unreadDiff !== 0) return unreadDiff;
              return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
            });
            setNpcConvos(rows);
          } catch (e) {
            // silent fail
          }
        }

        initialSyncRef.current = false;
      } catch (e) {
        if (loadSeqRef.current !== mySeq) return;
        if (initialSyncRef.current) {
          setError(e?.response?.status === 401 ? 'Your session expired. Please log in again.' : 'Could not load messages.');
        }
      }
    };

    load();
    pollRef.current = setInterval(load, 4000);
    return () => clearInterval(pollRef.current);
  }, [selectedContact, selectedPlayerId, isAdmin, hasAuthHeader, currentUser?.id, users, threadKey, isInbound, notify]);

  /* --- File Handling --- */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('audio/')) {
      alert('Only images and audio files are allowed');
      return;
    }

    const MAX_MB = 50;
    const MAX_BYTES = MAX_MB * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      alert(`File size too large (max ${MAX_MB}MB)`);
      return;
    }

    setAttachment(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    if (textareaRef.current) textareaRef.current.focus();
  };

  /* --- Sending Logic --- */
  const doSend = async () => {
    if (!commsEnabled) return;
    const body = newMessage.trim();

    if ((!body && !attachment) || !selectedContact) return;
    if (isAdmin && selectedContact.type === 'npc' && !selectedPlayerId) return;
    if (sendingRef.current) return;

    sendingRef.current = true;
    let attachmentId = null;

    try {
      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);

        try {
          const res = await api.post('/chat/upload', formData);
          attachmentId = res.data.id;
        } catch (err) {
          console.error('Upload error:', err?.response?.data || err);
          alert(err?.response?.data?.error || 'Failed to upload file. Check file size and type.');
          sendingRef.current = false;
          return;
        }
      }

      const payload = { body, attachment_id: attachmentId };
      let newMsg = null;

      if (selectedContact.type === 'group') {
        const { data } = await api.post(`/chat/groups/${selectedContact.id}/messages`, payload);
        if (data && data.message) {
          newMsg = { ...data.message, sender_id: currentUser.id, sender_name: 'Me' };
        } else {
          newMsg = {
            id: generateTempId(),
            body,
            created_at: new Date().toISOString(),
            sender_id: currentUser.id,
            sender_name: 'Me',
            attachment_id: attachmentId
          };
        }
        setGroups(prev => sortContacts(prev.map(g => g.id === selectedContact.id ? { ...g, last_message_at: Date.now(), unread_count: 0 } : g)));
      }
      else if (selectedContact.type === 'user') {
        const { data } = await api.post('/chat/messages', { recipient_id: selectedContact.id, ...payload });
        if (data && data.message) {
          newMsg = data.message;
        } else {
          newMsg = {
            id: generateTempId(),
            body,
            created_at: new Date().toISOString(),
            sender_id: currentUser.id,
            attachment_id: attachmentId
          };
        }

        setUsers(prev => {
          const updated = prev.map(u =>
            u.id === selectedContact.id ? { ...u, last_message_at: Date.now(), unread_count: 0 } : u
          );
          return sortContacts(updated);
        });

        api.post('/chat/read', { sender_id: selectedContact.id }).catch(() => { });
      }
      else {
        if (isAdmin) {
          const { data } = await api.post('/admin/chat/npc/messages', { npc_id: selectedContact.id, user_id: selectedPlayerId, ...payload });
          if (data && data.message) {
            newMsg = {
              id: data.message.id,
              body: data.message.body,
              created_at: data.message.created_at,
              sender_id: 'npc',
              _from: 'npc',
              attachment_id: data.message.attachment_id
            };
          } else {
            newMsg = {
              id: generateTempId(),
              body,
              created_at: new Date().toISOString(),
              sender_id: 'npc',
              _from: 'npc',
              attachment_id: attachmentId
            };
          }
        } else {
          const { data } = await api.post('/chat/npc/messages', { npc_id: selectedContact.id, ...payload });
          if (data && data.message) {
            newMsg = {
              id: data.message.id,
              body: data.message.body,
              created_at: data.message.created_at,
              sender_id: currentUser.id,
              _from: 'user',
              attachment_id: data.message.attachment_id
            };
          } else {
            newMsg = {
              id: generateTempId(),
              body,
              created_at: new Date().toISOString(),
              sender_id: currentUser.id,
              _from: 'user',
              attachment_id: attachmentId
            };
          }

          setNpcs(prev => {
            const updated = prev.map(n =>
              n.id === selectedContact.id ? { ...n, last_message_at: Date.now() } : n
            );
            return sortContacts(updated);
          });
        }
      }

      if (newMsg) {
        setMessages(prev => [...prev, newMsg]);
        const msgTime = new Date(newMsg.created_at).getTime();
        if (msgTime > lastTsRef.current) {
          lastTsRef.current = msgTime;
        }
      }

      setNewMessage('');
      setShowEmojiPicker(false);
      clearAttachment();
      setDrafts(prev => ({ ...prev, [threadKey]: '' }));
      if (textareaRef.current) textareaRef.current.style.height = 'auto';

    } catch (err) {
      setError(err?.response?.status === 401 ? 'Your session expired. Please log in again.' : 'Failed to send message.');
    } finally {
      sendingRef.current = false;
      if (!isMobile) setTimeout(() => textareaRef.current?.focus(), 10);
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
      fetchContacts();
    } catch (e) { alert('Failed to create group'); }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && text) {
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
    const q = filter.trim();
    const list = users || [];
    if (!q) return list;
    const ms = new MiniSearch({ fields: ['display_name', 'char_name'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
    ms.addAll(list);
    const results = ms.search(q);
    const idSet = new Set(results.map(r => r.id));
    return list.filter(u => idSet.has(u.id));
  }, [users, filter]);

  const usersNoChar = useMemo(() => filteredUsers.filter(u => !u.char_id || Number(u.char_id) === 1), [filteredUsers]);
  const usersWithChar = useMemo(() => filteredUsers.filter(u => u.char_id && Number(u.char_id) !== 1), [filteredUsers]);

  const filteredNpcs = useMemo(() => {
    const q = filter.trim();
    const list = npcs || [];
    if (!q) return list;
    const ms = new MiniSearch({ fields: ['name'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
    ms.addAll(list);
    const results = ms.search(q);
    const idSet = new Set(results.map(r => r.id));
    return list.filter(n => idSet.has(n.id));
  }, [npcs, filter]);

  const filteredGroups = useMemo(() => {
    const q = filter.trim();
    const list = groups || [];
    if (!q) return list;
    const ms = new MiniSearch({ fields: ['name'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
    ms.addAll(list);
    const results = ms.search(q);
    const idSet = new Set(results.map(r => r.id));
    return list.filter(g => idSet.has(g.id));
  }, [groups, filter]);

  const adminAllPlayersFiltered = useMemo(() => {
    const q = adminPlayerFilter.trim();
    const list = users || [];
    if (!q) return list;
    const ms = new MiniSearch({ fields: ['display_name', 'char_name'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
    ms.addAll(list);
    const results = ms.search(q);
    const idSet = new Set(results.map(r => r.id));
    return list.filter(u => idSet.has(u.id));
  }, [users, adminPlayerFilter]);

  const adminRecentPlayers = useMemo(() => {
    const byId = new Map((users || []).map(u => [u.id, u]));
    return (npcConvos || []).map(r => {
      const u = byId.get(r.user_id);
      return u
        ? { ...u, last_message_at: r.last_message_at, unread_count: r.unread_count }
        : {
          type: 'user',
          id: r.user_id,
          display_name: r.display_name || 'Unknown',
          char_name: r.char_name || 'Unknown',
          clan: undefined,
          last_message_at: r.last_message_at,
          unread_count: r.unread_count || 0
        };
    });
  }, [npcConvos, users]);

  const headerLabel = (() => {
    if (!selectedContact) return null;
    if (selectedContact.type === 'user') return <>{selectedContact.char_name || selectedContact.display_name}</>;
    if (selectedContact.type === 'group') return <>{selectedContact.name}</>;
    if (isAdmin && selectedContact.type === 'npc') {
      const selUser = users.find(u => u.id === selectedPlayerId);
      return selUser
        ? <>{selectedContact.name} <NPCTag /> ➜ {selUser.char_name || selUser.display_name}</>
        : <>{selectedContact.name} <NPCTag /></>;
    }
    if (selectedContact.type === 'npc') return <>{selectedContact.name} <NPCTag /></>;
    return <>{selectedContact.name}</>;
  })();

  const buildThreadKey = (contact, selPlayerId) => {
    if (!contact) return 'none';
    if (contact.type === 'user') return `u-${contact.id}`;
    if (contact.type === 'group') return `g-${contact.id}`;
    return isAdmin ? `n-${contact.id}-p-${selPlayerId || 'none'}` : `n-${contact.id}`;
  };

  const selectContact = (contact) => {
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
      api.post('/chat/read', { sender_id: contact.id }).catch(() => { });
    } else if (contact.type === 'npc' && !isAdmin) {
      setNpcs(prev => prev.map(n => n.id === contact.id ? { ...n, unread_count: 0 } : n));
      api.post('/chat/read', { npc_id: contact.id }).catch(() => { });
    } else if (contact.type === 'group') {
      setGroups(prev => prev.map(g => g.id === contact.id ? { ...g, unread_count: 0 } : g));
      api.post(`/chat/groups/${contact.id}/read`).catch(() => { });
    }

    if (!isMobile) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectAdminTarget = (userId) => {
    setDrafts(prev => ({ ...prev, [threadKey]: newMessage }));
    setSelectedPlayerId(userId);
    const nextKey = buildThreadKey(selectedContact, userId);
    setNewMessage(drafts[nextKey] || '');

    setNpcConvos(prev => prev.map(c => c.user_id === userId ? { ...c, unread_count: 0 } : c));
    api.post('/chat/read', { npc_id: selectedContact.id, sender_id: userId, is_admin_reading_npc: true }).catch(() => { });
  };

  const renderManageGroupModalTailwind = () => {
    const memberIds = currentGroupMembers.map(m => m.id);
    const nonMembers = usersWithChar.filter(u => !memberIds.includes(u.id));

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-surface-container border border-outline-variant rounded-lg w-full max-w-md p-6 flex flex-col gap-4 shadow-[0_0_20px_rgba(27,76,140,0.3)]">
          <h3 className="text-xl font-headline-md text-primary tracking-tight border-b border-outline-variant/50 pb-2">Manage: {selectedContact?.name}</h3>
          {groupMembersLoading ? <div className="text-on-surface-variant">Loading...</div> : (
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
              <div>
                <div className="text-[10px] text-on-surface-variant/50 font-bold tracking-widest mb-2 uppercase">Current Members</div>
                <div className="flex flex-col gap-2">
                  {currentGroupMembers.map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-surface-container-highest p-2 rounded border border-outline-variant/30">
                      <span className="text-sm">{m.char_name || 'No char'} <small className="opacity-60">({m.display_name})</small></span>
                      {m.id !== selectedContact.created_by && (
                        <button className="text-[10px] bg-error-container/20 text-error border border-error/30 px-2 py-1 rounded hover:bg-error/20 transition-colors" onClick={() => handleRemoveMemberFromGroup(m.id)}>Remove</button>
                      )}
                      {m.id === selectedContact.created_by && <small className="text-on-surface-variant/50">Creator</small>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-on-surface-variant/50 font-bold tracking-widest mb-2 uppercase">Add Members</div>
                <div className="flex flex-col gap-2">
                  {nonMembers.length === 0 ? (
                    <div className="text-center text-on-surface-variant/50 text-sm py-2">All players are in the group.</div>
                  ) : nonMembers.map(u => (
                    <div key={u.id} className="flex items-center justify-between bg-surface-container-highest p-2 rounded border border-outline-variant/30">
                      <span className="text-sm">{u.char_name} <small className="opacity-60">({u.display_name})</small></span>
                      <button className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded hover:bg-primary/40 transition-colors" onClick={() => handleAddMemberToGroup(u.id)}>Add</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-between mt-4 pt-4 border-t border-outline-variant/50">
            <button onClick={handleDeleteGroup} className="text-error hover:text-error-container text-sm font-bold transition-colors">Delete Group</button>
            <button onClick={() => setManagingGroup(false)} className="bg-primary text-on-primary px-4 py-1.5 rounded hover:bg-primary-container transition-colors font-bold text-sm shadow-[0_0_10px_rgba(255,179,174,0.2)]">Done</button>
          </div>
        </div>
      </div>
    );
  };

  const renderCreateGroupModalTailwind = () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface-container border border-outline-variant rounded-lg w-full max-w-md p-6 flex flex-col gap-4 shadow-[0_0_20px_rgba(27,76,140,0.3)]">
        <h3 className="text-xl font-headline-md text-primary tracking-tight border-b border-outline-variant/50 pb-2">Create Group Chat</h3>
        <input type="text" placeholder="Group Name" className="w-full bg-surface-dim border border-outline-variant rounded p-2 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors font-system-code" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
        <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
          {usersWithChar.map(u => (
            <label key={u.id} className="flex items-center gap-3 bg-surface-container-highest p-2 rounded border border-outline-variant/30 cursor-pointer hover:bg-surface-variant/30 transition-colors">
              <input type="checkbox" className="rounded border-outline-variant bg-surface-dim text-primary focus:ring-primary focus:ring-offset-surface-container" checked={newGroupMembers.includes(u.id)} onChange={e => {
                if (e.target.checked) setNewGroupMembers(p => [...p, u.id]);
                else setNewGroupMembers(p => p.filter(id => id !== u.id));
              }} />
              <span className="text-sm">{u.char_name} <small className="opacity-60">({u.display_name})</small></span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant/50">
          <button onClick={() => setCreatingGroup(false)} className="text-on-surface-variant hover:text-on-surface text-sm transition-colors px-3 py-1.5">Cancel</button>
          <button onClick={handleCreateGroup} disabled={!newGroupName || !newGroupMembers.length} className="bg-primary text-on-primary px-4 py-1.5 rounded hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-sm shadow-[0_0_10px_rgba(255,179,174,0.2)]">Create</button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`${styles.commsContainer} ${selectedContact ? styles.mobileChatActive : ''}`}
      ref={containerRef}
    >
      {/* Modals */}
      {creatingGroup && renderCreateGroupModalTailwind()}
      {managingGroup && renderManageGroupModalTailwind()}

      {/* SideNavBar (Desktop) & Full View (Mobile when no contact selected) */}
      <aside className={styles.userList}>
        {/* Header */}
        <div className={styles.listHeader} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded bg-surface-container-highest border border-outline-variant flex items-center justify-center overflow-hidden shrink-0">
              <span className="material-symbols-outlined text-primary">dns</span>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-on-surface text-[14px] truncate">NODE_01</div>
              <div className="text-on-surface-variant text-[10px] opacity-70 truncate">Secure Blood Channel</div>
            </div>
          </div>
          {isCharActive && (
            <button onClick={() => setCreatingGroup(true)} className="w-full py-2 bg-transparent border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary hover:shadow-[0_0_8px_rgba(140,27,27,0.2)] transition-all rounded text-[12px] font-bold tracking-wider flex items-center justify-center gap-2 group">
              <span className="material-symbols-outlined text-[16px] group-hover:animate-spin">add</span>
              NEW UPLOAD
            </button>
          )}

          <div className="mt-4 relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[16px]">search</span>
            <input
              type="text"
              className="w-full bg-surface-dim border border-outline-variant/50 rounded py-1.5 pl-8 pr-2 text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors"
              placeholder="Search network..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Scrollable Nav */}
        <div className={`${styles.usersScroll} custom-scrollbar`}>

          {/* Groups */}
          {filteredGroups.length > 0 && (
            <div className="mb-6">
              <div className="px-4 text-[10px] text-on-surface-variant/50 mb-2 font-bold tracking-widest flex items-center justify-between">
                GROUPS
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </div>
              <ul className="flex flex-col">
                {filteredGroups.map(g => {
                  const isActive = selectedContact?.type === 'group' && selectedContact?.id === g.id;
                  return (
                    <li key={`g-${g.id}`} onClick={() => selectContact(g)} className={`${isActive ? 'blood-active border-l-4 translate-x-1' : 'text-on-surface-variant hover:bg-surface-variant/10 border-l-4 border-transparent'} px-4 py-2 flex items-center justify-between cursor-pointer transition-all`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="material-symbols-outlined text-[18px] opacity-70 shrink-0">group</span>
                        <span className={`${isActive ? 'text-glow-active font-medium text-white' : ''} truncate`}>{g.name}</span>
                      </div>
                      {g.unread_count > 0 && <div className="w-4 h-4 rounded-full bg-primary-container text-white flex items-center justify-center text-[10px] font-bold shrink-0">{g.unread_count}</div>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Players */}
          <div className="mb-6">
            <div className="px-4 text-[10px] text-on-surface-variant/50 mb-2 font-bold tracking-widest flex items-center justify-between">
              CONTACTS
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </div>
            <ul className="flex flex-col">
              {usersWithChar.map(u => {
                const isActive = selectedContact?.type === 'user' && selectedContact?.id === u.id;
                return (
                  <li key={`u-${u.id}`} onClick={() => selectContact(u)} className={`${isActive ? 'blood-active border-l-4 translate-x-1' : 'text-on-surface-variant hover:bg-surface-variant/10 border-l-4 border-transparent'} px-4 py-2 flex items-center justify-between cursor-pointer transition-all`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center overflow-hidden border border-outline-variant/50 relative">
                        <Avatar userId={u.id} size="100%" style={{ width: '100%', height: '100%' }} imgClassName="opacity-80" fallback={localSymlogo(u.clan) || '/img/ATT-logo(1).png'} />
                      </div>
                      <span className={`${isActive ? 'text-glow-active font-medium text-white' : ''} truncate flex flex-col`}>
                        <span className="truncate">{u.char_name}</span>
                        <span className="text-[9px] opacity-60 truncate">{u.display_name}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {u.clan && <span className="text-[9px] bg-surface-dim px-1 rounded border border-outline-variant/30 uppercase max-w-[40px] truncate">{u.clan.slice(0, 3)}</span>}
                      {u.unread_count > 0 && <div className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* No Char Toggle */}
          <div className="mb-6">
            <div onClick={() => setNoCharOpen(!noCharOpen)} className="px-4 text-[10px] text-on-surface-variant/50 mb-2 font-bold tracking-widest flex items-center justify-between cursor-pointer hover:text-on-surface transition-colors">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] transition-transform" style={{ transform: noCharOpen ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                NO CHARACTER ({usersNoChar.length})
              </div>
            </div>
            {noCharOpen && (
              <ul className="flex flex-col">
                {usersNoChar.map(u => {
                  const isActive = selectedContact?.type === 'user' && selectedContact?.id === u.id;
                  return (
                    <li key={`u-${u.id}`} onClick={() => selectContact(u)} className={`${isActive ? 'blood-active border-l-4 translate-x-1' : 'text-on-surface-variant hover:bg-surface-variant/10 border-l-4 border-transparent'} px-4 py-2 flex items-center justify-between cursor-pointer transition-all opacity-80`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant/30 overflow-hidden">
                          <Avatar userId={u.id} size="100%" style={{ width: '100%', height: '100%' }} imgClassName="opacity-80" fallback="/img/ATT-logo(1).png" />
                        </div>
                        <span className={`${isActive ? 'text-glow-active font-medium text-white' : ''} truncate flex flex-col`}>
                          <span className="truncate">{u.display_name}</span>
                        </span>
                      </div>
                      {u.unread_count > 0 && <div className="w-2 h-2 rounded-full bg-primary-container animate-pulse shrink-0"></div>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* NPCs */}
          <div className="mb-6">
            <div className="px-4 text-[10px] text-on-surface-variant/50 mb-2 font-bold tracking-widest flex items-center justify-between">
              ASSETS (NPCs)
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </div>
            <ul className="flex flex-col">
              {filteredNpcs.map(n => {
                const isActive = selectedContact?.type === 'npc' && selectedContact?.id === n.id;
                const crest = localSymlogo(n.clan);
                return (
                  <li key={`n-${n.id}`} onClick={() => selectContact(n)} className={`${isActive ? 'blood-active border-l-4 translate-x-1' : 'text-on-surface-variant hover:bg-surface-variant/10 border-l-4 border-transparent'} px-4 py-2 flex items-center justify-between cursor-pointer transition-all`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-6 h-6 rounded-sm bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant/50">
                          <Avatar npcId={n.id} size="100%" style={{ width: '100%', height: '100%', borderRadius: 0 }} imgClassName="opacity-80" fallback={crest || '/img/ATT-logo(1).png'} />
                        </div>
                      </div>
                      <span className={`${isActive ? 'text-glow-active font-medium text-white' : ''} truncate flex items-center gap-1`}>
                        {n.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[8px] bg-tertiary-container/20 text-tertiary px-1 rounded border border-tertiary/30 uppercase">NPC</span>
                      {n.unread_count > 0 && <div className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/50 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-3 text-on-surface-variant hover:text-on-surface cursor-pointer p-1 rounded hover:bg-surface-variant/10 transition-colors">
            <span className="material-symbols-outlined text-[16px]">wifi_tethering</span>
            <span className="text-[11px] font-bold tracking-widest uppercase">Signal: Strong</span>
          </div>
          <div onClick={toggleNotifications} className={`flex items-center gap-3 ${notifOn ? 'text-green-500' : 'text-on-surface-variant'} cursor-pointer p-1 rounded hover:bg-surface-variant/10 transition-colors`}>
            <span className="material-symbols-outlined text-[16px]">{notifOn ? 'notifications_active' : 'notifications_off'}</span>
            <span className="text-[11px] font-bold tracking-widest uppercase">Notifs: {notifOn ? 'On' : 'Off'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content (Canvas) */}
      <main className={styles.chatWindow}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <header className={styles.chatHeader} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: '64px' }}>
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                {/* Mobile Back */}
                <button className="mr-2 md:hidden text-on-surface-variant hover:text-primary transition-colors focus:outline-none shrink-0" onClick={() => setSelectedContact(null)}>
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-sm bg-surface-container-highest overflow-hidden border border-outline-variant/50 flex items-center justify-center">
                    {selectedContact.type === 'user' ? (
                      <Avatar userId={selectedContact.id} size="100%" style={{ width: '100%', height: '100%', borderRadius: 0 }} imgClassName="opacity-80" fallback={localSymlogo(selectedContact.clan) || '/img/ATT-logo(1).png'} />
                    ) : selectedContact.type === 'npc' ? (
                      <Avatar npcId={selectedContact.id} size="100%" style={{ width: '100%', height: '100%', borderRadius: 0 }} imgClassName="opacity-80" fallback={localSymlogo(selectedContact.clan) || '/img/ATT-logo(1).png'} />
                    ) : (
                      <span className="material-symbols-outlined text-on-surface-variant text-[24px]">group</span>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-surface rounded-full shadow-[0_0_4px_#22c55e]"></div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-headline-md text-[16px] md:text-[18px] font-semibold text-on-surface m-0 leading-tight truncate">{headerLabel}</h2>
                    {selectedContact.type === 'npc' && !isAdmin && <span className="text-[9px] font-system-code bg-tertiary-container/20 text-tertiary px-1.5 py-0.5 rounded border border-tertiary/30 shrink-0">NPC</span>}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] md:text-[12px] font-system-code text-on-surface-variant/70 mt-0.5 truncate">
                    <span className="material-symbols-outlined text-[12px] md:text-[14px] text-green-500/70">shield</span>
                    Encrypted - AES-256
                    {selectedContact.type === 'group' && headerGroupMembers.length > 0 && (
                      <span className="ml-2 hidden md:inline truncate opacity-70">
                        • {headerGroupMembers.map(m => m.char_name || m.display_name).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4 text-on-surface-variant/70 shrink-0">
                {selectedContact.type === 'group' && (
                  (selectedContact.created_by === currentUser?.id || isAdmin) ? (
                    <button onClick={openManageGroup} className="hover:text-primary transition-colors flex items-center gap-1 border border-outline-variant/50 px-2 py-1 rounded text-[10px] md:text-xs font-system-code uppercase tracking-widest bg-surface-container-low hover:bg-surface-variant/50">
                      <span className="material-symbols-outlined text-[14px] md:text-[16px]">settings</span>
                      <span className="hidden md:inline">Manage</span>
                    </button>
                  ) : (
                    <button onClick={handleLeaveGroup} className="text-error/80 hover:text-error transition-colors flex items-center gap-1 border border-error/30 px-2 py-1 rounded text-[10px] md:text-xs font-system-code uppercase tracking-widest bg-error-container/10 hover:bg-error-container/30">
                      <span className="material-symbols-outlined text-[14px] md:text-[16px]">logout</span>
                      <span className="hidden md:inline">Leave</span>
                    </button>
                  )
                )}
              </div>
            </header>

            {/* Admin Roster Banner for NPCs */}
            {isAdmin && selectedContact.type === 'npc' && (
              <div className="bg-surface-container border-b border-surface-container-highest p-2 z-10 shrink-0">
                <div className="flex flex-col md:flex-row gap-2 justify-between items-start md:items-center mb-2">
                  <div className="flex bg-surface-dim rounded border border-outline-variant/50 overflow-hidden text-xs font-system-code">
                    <button className={`px-3 py-1 ${adminPlayerTab === 'recent' ? 'bg-primary/20 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-variant/30'}`} onClick={() => setAdminPlayerTab('recent')}>Recent</button>
                    <button className={`px-3 py-1 ${adminPlayerTab === 'all' ? 'bg-primary/20 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-variant/30'}`} onClick={() => setAdminPlayerTab('all')}>All</button>
                  </div>
                  {adminPlayerTab === 'all' && (
                    <input className="bg-surface-dim border border-outline-variant/50 rounded px-2 py-1 text-xs text-on-surface focus:border-primary w-full md:w-auto" placeholder="Search players…" value={adminPlayerFilter} onChange={(e) => setAdminPlayerFilter(e.target.value)} />
                  )}
                  <div className="text-xs font-system-code flex items-center gap-2">
                    {selectedPlayerId ? (
                      <>
                        <span className="text-on-surface-variant">To:</span>
                        <b className="text-primary">{users.find(u => u.id === selectedPlayerId)?.char_name || 'Unknown'}</b>
                        <button className="text-[10px] bg-outline-variant/30 px-1.5 py-0.5 rounded hover:bg-outline-variant/50 transition-colors" onClick={() => setSelectedPlayerId(null)}>Clear</button>
                      </>
                    ) : (
                      <span className="text-error text-[10px] uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span> Select target player</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {(adminPlayerTab === 'recent' ? adminRecentPlayers : adminAllPlayersFiltered).map(u => (
                    <button key={`sel-${u.id}`} onClick={() => selectAdminTarget(u.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded border shrink-0 transition-colors ${selectedPlayerId === u.id ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-highest border-outline-variant/30 text-on-surface-variant hover:border-outline-variant'}`}>
                      <span className="text-xs truncate max-w-[100px]">{u.char_name || u.display_name}</span>
                      {u.unread_count > 0 && <span className="bg-primary-container text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{u.unread_count}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* System Warning (Offline / No Char) */}
            {!commsEnabled ? (
              <div className="w-full bg-error-container/20 border-b border-error/50 p-2 text-center flex items-center justify-center gap-2 z-10 shrink-0">
                <span className="material-symbols-outlined text-error text-sm">warning</span>
                <span className="font-system-code text-[11px] md:text-sm text-error tracking-widest uppercase font-bold">SCHRECKNET PROTOCOL OFFLINE</span>
              </div>
            ) : !isCharActive ? (
              <div className="w-full bg-error-container/20 border-b border-error/50 p-2 text-center flex items-center justify-center gap-2 z-10 shrink-0">
                <span className="material-symbols-outlined text-error text-sm">hourglass_empty</span>
                <span className="font-system-code text-[11px] md:text-sm text-error tracking-widest uppercase font-bold">Awaiting ST Approval</span>
              </div>
            ) : null}

            {/* Chat History Area */}
            <div className={`${styles.messageList} custom-scrollbar`} ref={messagesListRef}>
              <div className="text-center text-[10px] md:text-[12px] font-system-code text-on-surface-variant/40 my-2">
                [ END OF ENCRYPTED HISTORY ]
              </div>

              {grouped.map(item => {
                if (item.type === 'day') return (
                  <div key={item.id} className="flex items-center justify-center w-full my-4 opacity-50">
                    <div className="h-px bg-outline-variant/50 flex-1"></div>
                    <span className="font-system-code text-[10px] text-on-surface-variant px-4 bg-transparent">{item.day.toUpperCase()}</span>
                    <div className="h-px bg-outline-variant/50 flex-1"></div>
                  </div>
                );

                const mine = selectedContact.type === 'user' ? item.sender_id === currentUser.id : (selectedContact.type === 'group' ? item.sender_id === currentUser.id : (isAdmin ? item.sender_id === 'npc' : item.sender_id === currentUser.id));
                const timeSinceSent = Date.now() - new Date(item.created_at).getTime();
                const canEditDelete = mine && timeSinceSent < 4 * 60 * 60 * 1000 && !String(item.id).startsWith('temp_');
                const isGroupNotMine = selectedContact.type === 'group' && !mine;

                return (
                  <div key={item.id} className={`flex gap-2 md:gap-3 max-w-[90%] md:max-w-[85%] ${mine ? 'self-end flex-row-reverse group' : 'self-start group'}`}>
                    {/* Avatar */}
                    {!mine ? (
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-sm md:rounded-full bg-surface-container-high border border-outline-variant flex-shrink-0 flex items-center justify-center overflow-hidden blood-glow opacity-80 mt-auto md:mt-0">
                        {(() => {
                          if (selectedContact.type === 'group') {
                            const sender = currentGroupMembers.find(m => m.id === item.sender_id);
                            return <Avatar userId={item.sender_id} size="100%" style={{ width: '100%', height: '100%', borderRadius: 0 }} imgClassName="" fallback={localSymlogo(item.sender_clan || sender?.clan) || '/img/ATT-logo(1).png'} />;
                          } else if (item.sender_id === 'npc') {
                            return <Avatar npcId={selectedContact.id} size="100%" style={{ width: '100%', height: '100%', borderRadius: 0 }} imgClassName="" fallback={localSymlogo(selectedContact.clan) || '/img/ATT-logo(1).png'} />;
                          } else {
                            return <Avatar userId={item.sender_id} size="100%" style={{ width: '100%', height: '100%', borderRadius: 0 }} imgClassName="" fallback={localSymlogo(selectedContact.clan) || '/img/ATT-logo(1).png'} />;
                          }
                        })()}
                      </div>
                    ) : (
                      <div className="hidden md:flex w-8 h-8 rounded-full opacity-0 shrink-0"></div>
                    )}

                    {/* Bubble Container */}
                    <div className={`flex flex-col gap-1 min-w-0 ${mine ? 'items-end' : 'items-start'}`}>

                      {/* Sender Name for Groups */}
                      {isGroupNotMine && (
                        <div className="text-[10px] font-system-code ml-1" style={{ color: CLAN_COLORS[item.sender_clan] || 'var(--on-surface-variant)' }}>
                          {item.sender_name}
                        </div>
                      )}

                      {editingMsgId === item.id ? (
                        <div className="bg-surface-container-high p-3 rounded-lg border border-primary/50 shadow-[0_0_15px_rgba(255,179,174,0.1)] w-full max-w-sm">
                          <textarea value={editBody} onChange={e => setEditBody(e.target.value)} className="w-full bg-surface-dim border border-outline-variant rounded p-2 text-on-surface text-sm focus:border-primary focus:ring-0 resize-none font-system-code" rows={3} />
                          <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setEditingMsgId(null)} className="text-xs text-on-surface-variant hover:text-on-surface px-2 py-1">Cancel</button>
                            <button onClick={submitEditMessage} className="text-xs bg-primary text-on-primary px-3 py-1 rounded font-bold hover:bg-primary-container">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className={`relative chat-glass p-2 md:p-3 w-fit max-w-full shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${mine ? 'bg-blood-accent/90 text-white rounded-l-lg rounded-br-lg bubble-right border-l border-t border-b border-[#b01423]' : 'bg-surface-container-high border border-outline-variant/30 text-on-surface rounded-r-lg rounded-bl-lg bubble-left'}`}>

                          {/* Attachment */}
                          {item.attachment_id && (
                            <div className="mb-2 relative rounded overflow-hidden border border-outline-variant/50 bg-black/50 group/img cursor-pointer w-fit max-w-full">
                              <ChatImage attachmentId={item.attachment_id} />
                              <div className="absolute inset-0 bg-blood-accent/10 pointer-events-none mix-blend-overlay"></div>
                            </div>
                          )}

                          {/* Body */}
                          {item.body && <p className="text-[14px] md:text-[15px] leading-relaxed whitespace-pre-wrap break-words">{item.body}</p>}
                        </div>
                      )}

                      {/* Meta Line (Time, Status, Actions) */}
                      <div className={`flex items-center gap-2 mt-0.5 ${mine ? 'mr-1 flex-row-reverse' : 'ml-1'}`}>
                        <span className="font-system-code text-[9px] md:text-[10px] text-on-surface-variant/60">{formatTime(item.created_at)}</span>

                        {item.edited && <span className="font-system-code text-[9px] text-on-surface-variant/40">(edited)</span>}

                        {mine && (
                          <span className="text-[12px] md:text-[14px] text-primary flex items-center">
                            <StatusIcon msg={item} />
                          </span>
                        )}

                        {/* Action Buttons (Hover) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEditDelete && !editingMsgId && (
                            <>
                              <button onClick={() => { setEditingMsgId(item.id); setEditBody(item.body); }} className="text-[10px] text-on-surface-variant hover:text-primary transition-colors">Edit</button>
                              <button onClick={() => handleDeleteMessage(item.id)} className="text-[10px] text-on-surface-variant hover:text-error transition-colors">Del</button>
                            </>
                          )}
                          {!mine && item.body && (
                            <button onClick={() => copyToClipboard(item.body)} className="text-[10px] text-on-surface-variant hover:text-primary transition-colors">Copy</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} className="h-4"></div>
            </div>

            {showScrollBtn && (
              <button className="absolute bottom-24 right-6 w-10 h-10 rounded-full bg-surface-container-highest border border-outline-variant text-primary shadow-[0_0_15px_rgba(0,0,0,0.8)] flex items-center justify-center z-20 hover:bg-surface-variant transition-colors" onClick={() => scrollToBottom(true)}>
                <span className="material-symbols-outlined">arrow_downward</span>
              </button>
            )}

            {/* Bottom Input Area */}
            <div className={styles.messageInputForm} style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))', flexDirection: 'column', alignItems: 'stretch' }}>
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-[100%] left-1/2 -translate-x-1/2 md:left-auto md:right-4 md:translate-x-0 z-50 mb-2 shadow-[0_0_20px_rgba(0,0,0,0.8)] rounded-lg overflow-hidden border border-outline-variant w-[min(92vw,320px)]">
                  <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" searchDisabled={false} width="100%" />
                </div>
              )}

              <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-surface-container-lowest border border-outline-variant rounded-md p-1.5 md:p-2 focus-within:border-primary focus-within:shadow-[0_0_8px_rgba(180,15,31,0.2)] transition-all">

                {/* Attachments & Previews */}
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,audio/*" onChange={handleFileSelect} />

                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!isCharActive || !commsEnabled} className="p-2 text-on-surface-variant hover:text-primary transition-colors shrink-0 rounded hover:bg-surface-variant/30 disabled:opacity-30">
                  <span className="material-symbols-outlined text-[20px] md:text-[24px]">attach_file</span>
                </button>

                <div className="flex-1 flex flex-col min-w-0">
                  {previewUrl && attachment && (
                    <div className="mb-2 p-2 bg-surface-container-highest rounded border border-outline-variant/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        {attachment.type.startsWith('audio/') ? (
                          <>
                            <span className="material-symbols-outlined text-primary text-sm shrink-0">audio_file</span>
                            <span className="text-xs truncate">{attachment.name}</span>
                          </>
                        ) : (
                          <>
                            <img src={previewUrl} alt="Preview" className="h-8 w-8 object-cover rounded border border-outline-variant shrink-0" />
                            <span className="text-xs truncate">{attachment.name}</span>
                          </>
                        )}
                      </div>
                      <button type="button" onClick={clearAttachment} className="text-on-surface-variant hover:text-error shrink-0 ml-2">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={!commsEnabled ? "System Offline..." : (!isCharActive ? "Waiting for ST approval..." : "Transmit response...")}
                    className="w-full bg-transparent border-none text-on-surface font-system-code text-[13px] md:text-[14px] placeholder-on-surface-variant/40 focus:ring-0 resize-none py-2 px-1 max-h-32 custom-scrollbar break-words"
                    rows={1}
                    style={{ minHeight: '40px' }}
                    disabled={!commsEnabled || !isCharActive || (isAdmin && selectedContact.type === 'npc' && !selectedPlayerId)}
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => setShowEmojiPicker(val => !val)} disabled={!isCharActive || !commsEnabled} className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded hover:bg-surface-variant/30 hidden md:flex disabled:opacity-30">
                    <span className="material-symbols-outlined text-[20px] md:text-[24px]">mood</span>
                  </button>
                  <button type="button" onClick={handleSendMessage} disabled={!commsEnabled || !isCharActive || sendingRef.current || (!newMessage.trim() && !attachment) || (isAdmin && selectedContact.type === 'npc' && !selectedPlayerId)} className="p-2 bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-on-primary transition-colors rounded shadow-[0_0_8px_rgba(255,179,174,0.1)] group flex items-center justify-center h-10 w-10 disabled:opacity-30 disabled:hover:bg-primary/10 disabled:hover:text-primary">
                    <span className="material-symbols-outlined text-[18px] md:text-[20px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">send</span>
                  </button>
                </div>
              </div>

              <div className="max-w-4xl mx-auto flex justify-between mt-2 px-1">
                <span className="text-[9px] md:text-[10px] font-system-code text-on-surface-variant/40 hidden md:inline">Enter to send, Shift+Enter for new line</span>
                <span className="text-[9px] md:text-[10px] font-system-code text-green-500/60 flex items-center gap-1 ml-auto">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Uplink Stable
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant/50 p-6 text-center z-10">
            <span className="material-symbols-outlined text-[64px] mb-4 opacity-20">terminal</span>
            <p className="font-system-code text-sm tracking-widest uppercase mb-2 text-glow-active">SchreckNet Node 01 Online</p>
            <p className="text-xs max-w-md">Select a contact from the secure roster to initiate an encrypted channel.</p>
          </div>
        )}

        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-error-container text-on-error-container px-4 py-2 rounded shadow-lg z-50 flex items-center gap-2 border border-error/50">
            <span className="material-symbols-outlined text-sm">error</span>
            <span className="text-sm font-bold">{error}</span>
            <button onClick={() => setError('')} className="ml-2 hover:opacity-80"><span className="material-symbols-outlined text-sm">close</span></button>
          </div>
        )}
      </main>
    </div>
  );
}