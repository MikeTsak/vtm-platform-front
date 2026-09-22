// src/features/admin/AdminChatLogsTab.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import api from '../../core/api';
import { formatEuDate } from '../../utils/dateFormatter';
import styles from '../../styles/Admin.module.css';
import MiniSearch from 'minisearch';
import Avatar from '../../components/Avatar';
import { symlogo, CLAN_HEX as CLAN_COLORS } from '../../data/clans';
import { useIsMobile } from '../../utils/useMediaQuery';

/* ==================== HELPERS ==================== */
const useDebouncedValue = (value, ms = 250) => {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
};

const formatTimestamp = (ts, includeDate = true) => {
  if (!ts) return 'None';
  const full = formatEuDate(ts);
  if (!includeDate) return full.split(' ')[1];
  return full;
};

const Highlight = ({ text, query }) => {
  const q = String(query || '').trim().toLowerCase();
  const txt = String(text || '');
  if (!q) return <>{txt}</>;
  const lowerText = txt.toLowerCase();
  const parts = [];
  let lastIndex = 0;
  let matchIndex;
  while ((matchIndex = lowerText.indexOf(q, lastIndex)) !== -1) {
    if (matchIndex > lastIndex) parts.push(<span key={lastIndex}>{txt.substring(lastIndex, matchIndex)}</span>);
    parts.push(<mark key={matchIndex} className={styles.hl}>{txt.substring(matchIndex, matchIndex + q.length)}</mark>);
    lastIndex = matchIndex + q.length;
  }
  if (lastIndex < txt.length) parts.push(<span key={lastIndex}>{txt.substring(lastIndex)}</span>);
  return <>{parts}</>;
};

// Sect/bloodline crests usable as chat emoji tokens alongside the 16 player
// clans — same convention (and same asset files) as ChatSystem.jsx's
// EXTRA_CREST_NAMES. Kept as a small local copy rather than a shared module:
// this is the only other place a ':Name:' reaction/group-icon token needs
// resolving, and duplicating ~15 lines here is cheaper than coupling the
// admin panel to the chat feature's internals.
const EXTRA_CREST_NAMES = ['Anarch', 'Camarilla', 'Sabbat', 'Giovanni'];
const ALL_CREST_NAMES = [...Object.keys(CLAN_COLORS), ...EXTRA_CREST_NAMES];
const clanKeyFor = (name) => {
  if (!name) return null;
  const want = String(name).trim().replace(/\s+/g, '_').toLowerCase();
  return ALL_CREST_NAMES.find(c => c.replace(/\s+/g, '_').toLowerCase() === want) || null;
};

// A group's chosen picture (see ChatSystem.jsx's GroupIconGlyph) — a literal
// emoji character, or a ':Clan_Name:' crest token. Falls back to the
// generic "group" icon when none is set.
const GroupIconGlyph = ({ icon, size = 24 }) => {
  if (!icon) return <span className="material-symbols-outlined" style={{ fontSize: size, color: 'var(--text-secondary)' }}>group</span>;
  const match = /^:([A-Za-z0-9_]+):$/.exec(icon);
  const clan = match ? clanKeyFor(match[1]) : null;
  if (clan) {
    return (
      <img
        src={symlogo(clan)}
        alt={clan}
        title={clan}
        style={{ width: size * 0.7, height: size * 0.7, filter: 'brightness(0) invert(1)' }}
      />
    );
  }
  return <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>{icon}</span>;
};

// One reaction glyph: a clan/crest token renders as the white crest image,
// anything else is the literal emoji character it already is.
const ReactionGlyph = ({ value, size = 13 }) => {
  const match = /^:([A-Za-z0-9_]+):$/.exec(value || '');
  const clan = match ? clanKeyFor(match[1]) : null;
  if (!clan) return <span>{value}</span>;
  return (
    <img
      src={symlogo(clan)}
      alt={clan}
      style={{ width: size, height: size, filter: 'brightness(0) invert(1)', display: 'inline-block', verticalAlign: 'middle' }}
    />
  );
};

// Read-only reaction pills under a bubble — this is a log, not a place for
// the admin to react, so no click-to-toggle.
const ReactionRow = ({ reactions }) => {
  if (!reactions || !reactions.length) return null;
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
      {reactions.map(r => (
        <span key={r.emoji} className={styles.reactionPill}>
          <ReactionGlyph value={r.emoji} /> {r.count}
        </span>
      ))}
    </div>
  );
};

// Delivered/read ticks for a DM message — same visual language as the
// player-facing ChatSystem.jsx StatusIcon.
const StatusIcon = ({ msg }) => {
  if (!msg) return null;
  if (msg.read_at) return <span title={`Read: ${formatTimestamp(msg.read_at)}`} style={{ color: 'var(--accent-purple)', fontSize: '11px' }}>✓✓</span>;
  if (msg.delivered_at) return <span title={`Delivered: ${formatTimestamp(msg.delivered_at)}`} style={{ color: 'var(--text-muted)', fontSize: '11px' }}>✓✓</span>;
  return <span title="Sent" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>✓</span>;
};

const PendingTag = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>schedule_send</span> Pending
  </span>
);

const EditedTag = () => <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>(edited)</span>;

/* --- MEDIA ATTACHMENT (mime-aware: image / audio / video) --- */
const MediaAttachment = ({ attachmentId }) => {
  const [prevId, setPrevId] = useState(attachmentId);
  const [mediaInfo, setMediaInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (attachmentId !== prevId) {
    setPrevId(attachmentId);
    setMediaInfo(null);
    setLoading(true);
    setError(false);
  }

  useEffect(() => {
    let active = true;
    let urlToRevoke = null;

    api.get(`/chat/media/${attachmentId}/info`)
      .then(async (response) => {
        if (!active) return;
        const info = response.data;
        if (info.url) {
          setMediaInfo({ url: info.url, mime: info.mime });
          setLoading(false);
        } else {
          try {
            const blobRes = await api.get(`/chat/media/${attachmentId}`, { responseType: 'blob' });
            if (!active) return;
            urlToRevoke = URL.createObjectURL(blobRes.data);
            setMediaInfo({ url: urlToRevoke, mime: info.mime || blobRes.data.type });
            setLoading(false);
          } catch (e) {
            if (!active) return;
            setError(true);
            setLoading(false);
          }
        }
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [attachmentId]);

  if (loading) return <div style={{ display: 'flex', padding: '1rem', justifyContent: 'center' }}><span className={styles.spinner} style={{ width: '20px', height: '20px', borderWidth: '2px' }} /></div>;
  if (error) return <div style={{ fontSize: '0.8rem', color: 'var(--color-error)', margin: '8px 0', padding: '6px 12px', background: 'rgba(255,77,77,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,77,77,0.1)' }}>⚠ Media Link Unavailable</div>;

  if (mediaInfo?.mime?.startsWith('audio/')) {
    return <audio controls src={mediaInfo.url} style={{ width: '100%', maxWidth: '300px', display: 'block', marginTop: '8px', marginBottom: '8px' }} />;
  }
  if (mediaInfo?.mime?.startsWith('video/')) {
    return <video controls src={mediaInfo.url} style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: 'var(--radius-sm)', display: 'block', marginTop: '8px', marginBottom: '8px' }} />;
  }

  return (
    <img
      src={mediaInfo?.url}
      alt="Attachment"
      style={{
        maxWidth: '100%', maxHeight: '350px', borderRadius: 'var(--radius-sm)',
        marginTop: '8px', marginBottom: '8px', cursor: 'pointer',
        border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)', display: 'block'
      }}
      onClick={() => window.open(mediaInfo?.url, '_blank')}
    />
  );
};

const MODE_LABEL = { direct: 'DM', npc: 'NPC', group: 'Group' };
const MODE_BADGE_STYLE = {
  direct: { background: 'rgba(94, 158, 255, 0.15)', color: '#5e9eff', border: '1px solid rgba(94, 158, 255, 0.35)' },
  npc: { background: 'rgba(157, 124, 255, 0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(157, 124, 255, 0.35)' },
  group: { background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.35)' },
};
const ModeBadge = ({ mode }) => (
  <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 7px', borderRadius: '999px', flexShrink: 0, ...MODE_BADGE_STYLE[mode] }}>
    {MODE_LABEL[mode]}
  </span>
);

// A count of messages with no read_at yet — for NPC threads that's
// literally "player messages the admin/ST hasn't read" (read_at there is
// only ever set by an admin opening the conversation), for DMs it's
// "messages their recipient hasn't read yet". Group chat has no per-message
// read tracking in the schema (only a per-member last_read_at), so it gets
// no badge.
const UnreadBadge = ({ count, size = 'normal' }) => {
  if (!count) return null;
  const small = size === 'small';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: small ? '16px' : '20px', height: small ? '16px' : '20px', padding: '0 6px',
      borderRadius: '999px', background: 'var(--accent-purple)', color: '#fff',
      fontSize: small ? '10px' : '11px', fontWeight: 800, flexShrink: 0, lineHeight: 1,
      boxShadow: '0 0 8px var(--accent-purple-glow)'
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
};

/* ==================== MAIN COMPONENT ==================== */
export default function AdminChatLogsTab({ messages, charIndex, npcMessages = [], groupMessages = [], chatGroups = [], npcs = [], onRefresh }) {
  const [viewMode, setViewMode] = useState('direct');

  // State: Direct
  const [directSearch, setDirectSearch] = useState('');
  const debouncedDirectSearch = useDebouncedValue(directSearch);
  const [selectedConversationKey, setSelectedConversationKey] = useState(null);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [currentParticipants, setCurrentParticipants] = useState({});

  // State: NPC
  const [npcSearch, setNpcSearch] = useState('');
  const debouncedNpcSearch = useDebouncedValue(npcSearch);
  const [selectedNpc, setSelectedNpc] = useState(null);
  const [convos, setConvos] = useState([]);
  const [npcConvoSearch, setNpcConvoSearch] = useState('');
  const debouncedNpcConvoSearch = useDebouncedValue(npcConvoSearch);
  const [selectedNpcConversation, setSelectedNpcConversation] = useState(null);
  const [currentThread, setCurrentThread] = useState([]);

  // State: Group
  const [groupSearch, setGroupSearch] = useState('');
  const debouncedGroupSearch = useDebouncedValue(groupSearch);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupThread, setGroupThread] = useState([]);

  const [loading, setLoading] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // Reactions for whichever thread is currently open
  const [reactionsByMsgId, setReactionsByMsgId] = useState({});

  // Global "search all messages" (content, not just contact names)
  const [globalQuery, setGlobalQuery] = useState('');
  const debouncedGlobalQuery = useDebouncedValue(globalQuery, 200);

  const getCharInfoByUserId = useCallback((userId) => {
    const charEntry = Object.values(charIndex).find(c => c.user_id === Number(userId));
    return charEntry ? { name: charEntry.char_name, clan: charEntry.clan } : { name: 'None', clan: 'None' };
  }, [charIndex]);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };

  // --- DIRECT MSG PROCESSING ---
  const directConversations = useMemo(() => {
    const groups = new Map();
    for (const msg of messages) {
      const id1 = Number(msg.sender_id);
      const id2 = Number(msg.recipient_id);
      if (!id1 || !id2) continue;
      const ids = [id1, id2].sort((a, b) => a - b);
      const key = ids.join('-');
      const msgTimestamp = new Date(msg.created_at).getTime();

      if (!groups.has(key)) {
        const char1 = getCharInfoByUserId(ids[0]);
        const char2 = getCharInfoByUserId(ids[1]);
        const user1 = Object.values(charIndex).find(c => c.user_id === ids[0]) || { display_name: `User ${ids[0]}` };
        const user2 = Object.values(charIndex).find(c => c.user_id === ids[1]) || { display_name: `User ${ids[1]}` };

        groups.set(key, {
          key, user1Id: ids[0], user2Id: ids[1],
          user1Name: user1.display_name, user2Name: user2.display_name,
          user1CharName: char1.name, user2CharName: char2.name,
          user1Clan: char1.clan, user2Clan: char2.clan,
          messages: [], latestTimestamp: 0, latestSnippet: '', unreadCount: 0,
        });
      }
      const group = groups.get(key);
      group.messages.push(msg);
      if (!msg.read_at) group.unreadCount++;
      if (msgTimestamp > group.latestTimestamp) {
        group.latestTimestamp = msgTimestamp;
        group.latestSnippet = msg.attachment_id && !msg.body ? '📷 Attachment' : msg.body;
      }
    }
    groups.forEach(g => g.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
    return Array.from(groups.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [messages, getCharInfoByUserId, charIndex]);

  const filteredDirect = useMemo(() => {
    const q = debouncedDirectSearch.trim();
    if (!q) return directConversations;
    const ms = new MiniSearch({ idField: 'key', fields: ['user1Name', 'user2Name', 'user1CharName', 'user2CharName', 'messagesBody'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
    const mapped = directConversations.map(c => ({
      ...c,
      messagesBody: c.messages.map(m => m.body).join(' ')
    }));
    ms.addAll(mapped);
    const results = ms.search(q);
    const idSet = new Set(results.map(r => r.id));
    return directConversations.filter(c => idSet.has(c.key));
  }, [directConversations, debouncedDirectSearch]);

  // --- GLOBAL CONTENT SEARCH INDEX (built once per data change, filtered per keystroke) ---
  const searchIndex = useMemo(() => {
    const rows = [];
    for (const msg of messages) {
      if (!msg.body) continue;
      const id1 = Number(msg.sender_id), id2 = Number(msg.recipient_id);
      if (!id1 || !id2) continue;
      const key = [id1, id2].sort((a, b) => a - b).join('-');
      rows.push({
        mode: 'direct', id: `d-${msg.id}`, body: msg.body, created_at: msg.created_at,
        participants: `${msg.sender_char_name || msg.sender_name} ↔ ${msg.recipient_char_name || msg.recipient_name}`,
        jump: { key },
      });
    }
    for (const msg of npcMessages) {
      if (!msg.body) continue;
      const npc = npcs.find(n => n.id === msg.npc_id);
      const charInfo = getCharInfoByUserId(msg.user_id);
      const userLabel = charInfo.name && charInfo.name !== 'None' ? charInfo.name : `User #${msg.user_id}`;
      rows.push({
        mode: 'npc', id: `n-${msg.id}`, body: msg.body, created_at: msg.created_at,
        participants: `${npc?.name || 'NPC #' + msg.npc_id} ↔ ${userLabel}`,
        jump: { npcId: msg.npc_id, npcName: npc?.name, userId: msg.user_id, userLabel },
      });
    }
    for (const msg of groupMessages) {
      if (!msg.body) continue;
      const group = chatGroups.find(g => g.id === msg.group_id);
      rows.push({
        mode: 'group', id: `g-${msg.id}`, body: msg.body, created_at: msg.created_at,
        participants: group?.name || `Group #${msg.group_id}`,
        jump: { groupId: msg.group_id, groupName: group?.name },
      });
    }
    return rows;
  }, [messages, npcMessages, groupMessages, npcs, chatGroups, getCharInfoByUserId]);

  const globalSearchResults = useMemo(() => {
    const q = debouncedGlobalQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return searchIndex
      .filter(r => r.body.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 40);
  }, [searchIndex, debouncedGlobalQuery]);

  const jumpToResult = (result) => {
    setGlobalQuery('');
    if (result.mode === 'direct') {
      setViewMode('direct');
      setSelectedConversationKey(result.jump.key);
    } else if (result.mode === 'npc') {
      const npc = npcs.find(n => n.id === result.jump.npcId) || { id: result.jump.npcId, name: result.jump.npcName };
      setViewMode('npc');
      setSelectedNpc(npc);
      setSelectedNpcConversation({ userId: result.jump.userId, charName: result.jump.userLabel, userName: result.jump.userLabel });
    } else if (result.mode === 'group') {
      const group = chatGroups.find(g => g.id === result.jump.groupId) || { id: result.jump.groupId, name: result.jump.groupName };
      setViewMode('group');
      setSelectedGroup(group);
    }
  };

  // --- LOADERS & EFFECTS ---
  useEffect(() => {
    if (viewMode !== 'direct' || !selectedConversationKey) { setCurrentMessages([]); return; }
    const convo = directConversations.find(c => c.key === selectedConversationKey);
    if (convo) {
      setCurrentMessages(convo.messages);
      setCurrentParticipants({
        threadKey: selectedConversationKey,
        user1: convo.user1Name, user2: convo.user2Name,
        user1Id: convo.user1Id, user2Id: convo.user2Id,
        user1Char: convo.user1CharName, user2Char: convo.user2CharName,
        user1Clan: convo.user1Clan, user2Clan: convo.user2Clan,
      });
    }
  }, [selectedConversationKey, directConversations, viewMode]);

  useEffect(() => {
    if (viewMode !== 'npc' || !selectedNpc) { setConvos([]); return; }
    setLoading(p => ({ ...p, convos: true }));
    const url = `/admin/chat/npc-conversations/${selectedNpc.id}`;
    api.get(url).then(res => {
      const rows = (res.data.conversations || []).map(r => ({
        userId: r.user_id, charName: r.char_name || '', charClan: getCharInfoByUserId(r.user_id).clan,
        userName: r.display_name || `User ${r.user_id}`, lastMessageAt: r.last_message_at,
        unreadCount: r.unread_count || 0
      }));
      setConvos(rows.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)));
    }).catch(() => setConvos([]))
      .finally(() => setLoading(p => ({ ...p, convos: false })));
  }, [selectedNpc, viewMode, getCharInfoByUserId]);

  useEffect(() => {
    if (viewMode !== 'npc' || !selectedNpc || !selectedNpcConversation) { setCurrentThread([]); return; }
    setLoading(p => ({ ...p, thread: true }));
    const url = `/admin/chat/npc/history?npc_id=${selectedNpc.id}&user_id=${selectedNpcConversation.userId}`;
    api.get(url).then(res => {
      const msgs = (res.data.messages || []).map(m => ({
        id: m.id, body: m.body, created_at: m.created_at, from: m.from_side,
        attachment_id: m.attachment_id, status: m.status, edited: m.edited, read_at: m.read_at
      }));
      setCurrentThread(msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
    }).finally(() => setLoading(p => ({ ...p, thread: false })));
  }, [selectedNpc, selectedNpcConversation, viewMode]);

  useEffect(() => {
    if (viewMode !== 'group' || !selectedGroup) { setGroupThread([]); return; }
    setLoading(p => ({ ...p, groupThread: true }));
    api.get(`/admin/chat/groups/${selectedGroup.id}/history`).then(res => {
      setGroupThread((res.data.messages || []));
    }).finally(() => setLoading(p => ({ ...p, groupThread: false })));
  }, [selectedGroup, viewMode]);

  // Reactions for whichever thread is currently open — batch-fetched the
  // same way the player-facing ChatSystem.jsx does, just once per thread
  // load rather than polled (this is a static log view, not a live chat).
  useEffect(() => {
    let table = null;
    let msgs = [];
    if (viewMode === 'direct') { table = 'chat_messages'; msgs = currentMessages; }
    else if (viewMode === 'npc') { table = 'npc_messages'; msgs = currentThread; }
    else if (viewMode === 'group') { table = 'chat_group_messages'; msgs = groupThread; }

    const ids = msgs.map(m => m.id).filter(id => Number.isFinite(id));
    if (!table || !ids.length) { setReactionsByMsgId({}); return; }

    let active = true;
    api.post('/chat/messages/reactions/batch', { table, ids })
      .then(({ data }) => { if (active) setReactionsByMsgId(data.reactions || {}); })
      .catch(() => { if (active) setReactionsByMsgId({}); });
    return () => { active = false; };
  }, [viewMode, currentMessages, currentThread, groupThread]);

  // Unread player messages per NPC (npc_messages.read_at is only ever set
  // by an admin opening that conversation — see /api/chat/read's
  // is_admin_reading_npc branch — so this is literally "what the admin
  // hasn't read yet", computed from the bulk npcMessages prop with no
  // extra fetch).
  const npcUnreadById = useMemo(() => {
    const counts = {};
    for (const m of npcMessages) {
      if (m.from_side === 'user' && !m.read_at) counts[m.npc_id] = (counts[m.npc_id] || 0) + 1;
    }
    return counts;
  }, [npcMessages]);

  const totalDirectUnread = useMemo(() => directConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0), [directConversations]);
  const totalNpcUnread = useMemo(() => Object.values(npcUnreadById).reduce((sum, n) => sum + n, 0), [npcUnreadById]);

  // --- FILTER LISTS ---
  const sortedNpcs = useMemo(() => [...npcs].sort((a, b) => a.name.localeCompare(b.name)), [npcs]);
  const filteredNpcs = useMemo(() => {
    const q = debouncedNpcSearch.trim();
    if (!q) return sortedNpcs;
    const ms = new MiniSearch({ fields: ['name'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
    ms.addAll(sortedNpcs);
    const results = ms.search(q);
    const idSet = new Set(results.map(r => r.id));
    return sortedNpcs.filter(n => idSet.has(n.id));
  }, [sortedNpcs, debouncedNpcSearch]);

  const filteredConvos = useMemo(() => {
    const q = debouncedNpcConvoSearch.trim();
    if (!q) return convos;
    const mapped = convos.map((c, i) => ({ ...c, __msId: c.userId || i }));
    const ms = new MiniSearch({ idField: '__msId', fields: ['charName', 'userName'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
    ms.addAll(mapped);
    const results = ms.search(q);
    const idSet = new Set(results.map(r => r.id));
    return mapped.filter(c => idSet.has(c.__msId));
  }, [convos, debouncedNpcConvoSearch]);

  const filteredGroups = useMemo(() => {
    const q = debouncedGroupSearch.trim();
    if (!q) return chatGroups;
    const ms = new MiniSearch({ fields: ['name'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
    ms.addAll(chatGroups);
    const results = ms.search(q);
    const idSet = new Set(results.map(r => r.id));
    return chatGroups.filter(g => idSet.has(g.id));
  }, [chatGroups, debouncedGroupSearch]);

  const handleModeChange = (m) => {
    setViewMode(m);
    setSelectedNpc(null); setSelectedConversationKey(null); setSelectedGroup(null);
    setNpcSearch(''); setDirectSearch(''); setGroupSearch('');
    setGlobalQuery('');
  };

  // Phones show a single pane at a time: list → (NPC threads) → messages, with back buttons.
  const isMobile = useIsMobile();
  const hasThread = (viewMode === 'direct' && !!selectedConversationKey)
    || (viewMode === 'npc' && !!selectedNpcConversation)
    || (viewMode === 'group' && !!selectedGroup);
  const stage = !isMobile ? 'all' : hasThread ? 'messages' : (viewMode === 'npc' && selectedNpc ? 'convos' : 'list');
  const showListPane = stage === 'all' || stage === 'list';
  const showConvoPane = viewMode === 'npc' && (stage === 'all' || stage === 'convos');
  const showMainPane = stage === 'all' || stage === 'messages';
  const backFromMessages = () => {
    if (viewMode === 'direct') setSelectedConversationKey(null);
    else if (viewMode === 'npc') setSelectedNpcConversation(null);
    else setSelectedGroup(null);
  };

  const isGlobalSearching = debouncedGlobalQuery.trim().length >= 2;

  return (
    <div className={styles.chatShell}>

      {/* SIDEBAR: LISTS */}
      <aside className={showListPane ? '' : styles.rPaneHidden} style={{ width: isMobile ? '100%' : '380px', display: 'flex', flexDirection: 'column', borderRight: isMobile ? 'none' : '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', flexShrink: 0, minHeight: 0 }}>
        <div style={{ padding: 'clamp(0.9rem, 3vw, 1.5rem)', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-color)', flex: 1 }}>Chat Logs</h3>
            <button
              type="button" onClick={handleRefresh} disabled={refreshing || !onRefresh}
              title="Refresh all chat log data" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
              style={{ padding: '0.4rem', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span className={`material-symbols-outlined ${refreshing ? styles.spinIcon : ''}`} style={{ fontSize: '18px' }} aria-hidden="true">refresh</span>
            </button>
          </div>

          <div className={styles.globalSearchBar}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-muted)' }} aria-hidden="true">search</span>
            <input
              type="search" placeholder="Search all message content…" className={styles.globalSearchInput}
              value={globalQuery} onChange={e => setGlobalQuery(e.target.value)}
            />
            {globalQuery && (
              <button type="button" onClick={() => setGlobalQuery('')} className={styles.btnGhost} style={{ border: 'none', background: 'transparent', padding: '0 4px', color: 'var(--text-muted)' }}>✕</button>
            )}
          </div>

          {!isGlobalSearching && (
            <>
              <div className={styles.modeSwitcher}>
                {['direct', 'npc', 'group'].map(m => {
                  const unread = m === 'direct' ? totalDirectUnread : m === 'npc' ? totalNpcUnread : 0;
                  return (
                    <button
                      key={m}
                      onClick={() => handleModeChange(m)}
                      style={{
                        flex: 1, padding: '0.6rem 0.5rem', border: 'none', borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        background: viewMode === m ? 'linear-gradient(135deg, var(--accent-purple-dark) 0%, var(--accent-purple) 100%)' : 'transparent',
                        color: viewMode === m ? 'var(--text-color)' : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                        boxShadow: viewMode === m ? '0 4px 15px var(--accent-purple-glow)' : 'none'
                      }}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                      {unread > 0 && <UnreadBadge count={unread} size="small" />}
                    </button>
                  );
                })}
              </div>
              <input
                type="search" placeholder="Filter by name…" className={styles.input}
                value={viewMode === 'direct' ? directSearch : viewMode === 'npc' ? npcSearch : groupSearch}
                onChange={e => {
                  const v = e.target.value;
                  if (viewMode === 'direct') setDirectSearch(v);
                  else if (viewMode === 'npc') setNpcSearch(v);
                  else setGroupSearch(v);
                }}
              />
            </>
          )}
        </div>
        <div className={styles.sidebarList} style={{ overflowY: 'auto', flex: 1 }}>
          {isGlobalSearching ? (
            <GlobalSearchResults results={globalSearchResults} query={debouncedGlobalQuery} onSelect={jumpToResult} />
          ) : (
            <>
              {viewMode === 'direct' && <ConversationList list={filteredDirect} selected={selectedConversationKey} onSelect={setSelectedConversationKey} query={debouncedDirectSearch} />}
              {viewMode === 'npc' && <NpcList list={filteredNpcs} selected={selectedNpc?.id} onSelect={setSelectedNpc} query={debouncedNpcSearch} unreadById={npcUnreadById} />}
              {viewMode === 'group' && <GroupList list={filteredGroups} selected={selectedGroup?.id} onSelect={setSelectedGroup} query={debouncedGroupSearch} />}
            </>
          )}
        </div>
      </aside>

      {/* MIDDLE: NPC CONVOS */}
      {showConvoPane && (
        <aside style={{ width: isMobile ? '100%' : '320px', display: 'flex', flexDirection: 'column', borderRight: isMobile ? 'none' : '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.45)', flexShrink: 0, minHeight: 0 }}>
          <div style={{ padding: 'clamp(0.9rem, 3vw, 1.5rem)', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isMobile && selectedNpc && (
              <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} style={{ alignSelf: 'flex-start', marginLeft: '-8px' }} onClick={() => setSelectedNpc(null)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">arrow_back</span> NPCs · <b style={{ color: CLAN_COLORS[selectedNpc.clan] || 'inherit' }}>{selectedNpc.name}</b>
              </button>
            )}
            <input
              type="search" placeholder={selectedNpc ? "Filter threads..." : "Select NPC"}
              className={styles.input} disabled={!selectedNpc}
              value={npcConvoSearch} onChange={e => setNpcConvoSearch(e.target.value)}
            />
          </div>
          <div className={styles.sidebarList} style={{ overflowY: 'auto', flex: 1 }}>
            {selectedNpc && <NpcConvoList list={filteredConvos} selected={selectedNpcConversation?.userId} onSelect={setSelectedNpcConversation} query={debouncedNpcConvoSearch} />}
          </div>
        </aside>
      )}

      {/* MAIN: MESSAGES */}
      <main className={showMainPane ? '' : styles.rPaneHidden} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, background: 'var(--glass-inset)' }}>
        {viewMode === 'direct' && selectedConversationKey && (
          <MessagePanel messages={currentMessages} participants={currentParticipants} reactionsByMsgId={reactionsByMsgId} mode="direct" onBack={isMobile ? backFromMessages : null} />
        )}
        {viewMode === 'npc' && selectedNpcConversation && (
          <MessagePanel
            messages={currentThread}
            participants={{
              threadKey: selectedNpcConversation.userId,
              npc: selectedNpc?.name, npcClan: selectedNpc?.clan, npcId: selectedNpc?.id,
              user: selectedNpcConversation.charName || 'Unknown Character', userClan: selectedNpcConversation.charClan, userId: selectedNpcConversation.userId
            }}
            reactionsByMsgId={reactionsByMsgId}
            mode="npc" loading={loading.thread}
            onBack={isMobile ? backFromMessages : null}
          />
        )}
        {viewMode === 'group' && selectedGroup && (
          <MessagePanel
            messages={groupThread}
            participants={{ threadKey: selectedGroup.id, groupName: selectedGroup.name, groupIcon: selectedGroup.icon }}
            reactionsByMsgId={reactionsByMsgId}
            mode="group" loading={loading.groupThread}
            onBack={isMobile ? backFromMessages : null}
          />
        )}

        {((viewMode === 'direct' && !selectedConversationKey) || (viewMode === 'npc' && !selectedNpcConversation) || (viewMode === 'group' && !selectedGroup)) && (
          <div className={styles.placeholderCard}>
            <span style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem', display: 'block' }}>💬</span>
            <h3>Select a Transmission</h3>
            <p className={styles.subtle}>Choose a thread to view its full history — attachments, reactions, and status included.</p>
          </div>
        )}
      </main>
    </div>
  );
}

/* ==================== SUB-COMPONENTS ==================== */

const ConversationList = ({ list, selected, onSelect, query }) => list.map(c => {
  const isSelected = c.key === selected;
  const renderParty = (userId, name, clan) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
      <Avatar userId={userId} size={17} style={{ borderRadius: '50%', flexShrink: 0 }} fallback={symlogo(clan) || '/img/ATT-logo(1).webp'} />
      <span style={{ color: CLAN_COLORS[clan] || 'var(--text-color)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <Highlight text={name} query={query} />
      </span>
    </span>
  );

  return (
    <button
      key={c.key} onClick={() => onSelect(c.key)}
      style={{
        display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'left', width: '100%',
        padding: '0.6rem 1.25rem', cursor: 'pointer', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)',
        background: isSelected ? 'linear-gradient(90deg, rgba(157, 124, 255, 0.15) 0%, transparent 100%)' : 'transparent',
        borderLeft: isSelected ? '4px solid var(--accent-purple)' : '4px solid transparent',
        transition: 'background 0.2s ease'
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, width: '100%' }}>
            {renderParty(c.user1Id, c.user1CharName || c.user1Name, c.user1Clan)}
            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>↔</span>
            {renderParty(c.user2Id, c.user2CharName || c.user2Name, c.user2Clan)}
          </div>
          {c.latestSnippet && (
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.latestSnippet}</div>
          )}
          <div className={styles.messageTime} style={{ marginTop: 0, textAlign: 'left', color: 'var(--text-secondary)' }}>{formatTimestamp(c.latestTimestamp, true)}</div>
        </div>
        <UnreadBadge count={c.unreadCount} />
      </div>
    </button>
  );
});

const NpcList = ({ list, selected, onSelect, query, unreadById = {} }) => list.map(n => {
  const isSelected = n.id === selected;
  return (
    <button
      key={n.id} onClick={() => onSelect(n)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left',
        padding: '0.55rem 1.25rem', cursor: 'pointer', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)',
        background: isSelected ? 'linear-gradient(90deg, rgba(157, 124, 255, 0.15) 0%, transparent 100%)' : 'transparent',
        borderLeft: isSelected ? '4px solid var(--accent-purple)' : '4px solid transparent',
        transition: 'background 0.2s ease'
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <Avatar npcId={n.id} size={24} style={{ borderRadius: '50%', flexShrink: 0, border: `2px solid ${CLAN_COLORS[n.clan] || 'var(--text-color)'}` }} fallback={symlogo(n.clan) || '/img/ATT-logo(1).webp'} />
      <span style={{ color: CLAN_COLORS[n.clan] || 'var(--text-color)', fontWeight: 800, fontSize: '0.95rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <Highlight text={n.name} query={query} />
      </span>
      <UnreadBadge count={unreadById[n.id]} />
    </button>
  );
});

const NpcConvoList = ({ list, selected, onSelect, query }) => list.map(c => {
  const isSelected = c.userId === selected;
  return (
    <button
      key={c.userId} onClick={() => onSelect(c)}
      style={{
        display: 'flex', gap: '10px', alignItems: 'center', width: '100%', textAlign: 'left', overflow: 'hidden',
        padding: '0.55rem 1.1rem', cursor: 'pointer', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)',
        background: isSelected ? 'linear-gradient(90deg, rgba(157, 124, 255, 0.15) 0%, transparent 100%)' : 'transparent',
        borderLeft: isSelected ? '4px solid var(--accent-purple)' : '4px solid transparent',
        transition: 'background 0.2s ease'
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <Avatar userId={c.userId} size={22} style={{ borderRadius: '50%', flexShrink: 0, border: `2px solid ${CLAN_COLORS[c.charClan] || 'var(--text-color)'}` }} fallback={symlogo(c.charClan) || '/img/ATT-logo(1).webp'} />
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
        <span style={{ color: CLAN_COLORS[c.charClan] || 'var(--text-color)', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <Highlight text={c.charName || c.userName} query={query} />
        </span>
        <span className={styles.messageTime} style={{ marginTop: '2px', textAlign: 'left', color: 'var(--text-secondary)' }}>{formatTimestamp(c.lastMessageAt, true)}</span>
      </div>
      <UnreadBadge count={c.unreadCount} />
    </button>
  );
});

const GroupList = ({ list, selected, onSelect, query }) => list.map(g => {
  const isSelected = g.id === selected;
  return (
    <button
      key={g.id} onClick={() => onSelect(g)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '0.55rem 1.25rem', cursor: 'pointer', border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        background: isSelected ? 'linear-gradient(90deg, rgba(157, 124, 255, 0.15) 0%, transparent 100%)' : 'transparent',
        borderLeft: isSelected ? '4px solid var(--accent-purple)' : '4px solid transparent',
        transition: 'background 0.2s ease'
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <div className={styles.avatarCircle} style={{ width: '26px', height: '26px' }}>
        <GroupIconGlyph icon={g.icon} size={22} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontWeight: 800, color: 'var(--text-color)', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Highlight text={g.name} query={query} /></span>
        {typeof g.member_count === 'number' && <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{g.member_count} member{g.member_count === 1 ? '' : 's'}</span>}
      </div>
    </button>
  );
});

const GlobalSearchResults = ({ results, query, onSelect }) => {
  if (!results.length) {
    return <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No messages match "{query}".</div>;
  }
  return (
    <>
      {results.map(r => (
        <button
          key={r.id} onClick={() => onSelect(r)}
          style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', textAlign: 'left', padding: '1rem 1.5rem', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'transparent', cursor: 'pointer', transition: 'background 0.2s ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <ModeBadge mode={r.mode} />
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.participants}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            <Highlight text={r.body} query={query} />
          </div>
          <div className={styles.messageTime}>{formatTimestamp(r.created_at, true)}</div>
        </button>
      ))}
    </>
  );
};

/* ==================== MESSAGE PANEL ==================== */
function MessagePanel({ messages, participants, reactionsByMsgId, loading, mode, onBack }) {
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Only snap to bottom when the thread context switches. Deliberately NOT
  // messagesEndRef.scrollIntoView() — that scrolls every scrollable
  // ancestor it finds on the way up, including the page itself (the "jumps
  // to the bottom of the whole admin page" bug). Setting scrollTop directly
  // on this panel's own scroll container touches only this box.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [participants.threadKey, loading]);

  const getHeaderTitle = () => {
    if (mode === 'direct') {
      const c1 = participants.user1Clan; const c2 = participants.user2Clan;
      return (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 10px', fontSize: 'clamp(1rem, 3.5vw, 1.25rem)', fontWeight: 800, minWidth: 0 }}>
          <Avatar userId={participants.user1Id} size={30} style={{ borderRadius: '50%' }} fallback={symlogo(c1) || '/img/ATT-logo(1).webp'} />
          <span style={{ color: CLAN_COLORS[c1] || 'var(--text-color)' }}>{participants.user1Char || participants.user1}</span>
          <span style={{ color: 'var(--text-muted)' }}>↔</span>
          <Avatar userId={participants.user2Id} size={30} style={{ borderRadius: '50%' }} fallback={symlogo(c2) || '/img/ATT-logo(1).webp'} />
          <span style={{ color: CLAN_COLORS[c2] || 'var(--text-color)' }}>{participants.user2Char || participants.user2}</span>
        </div>
      );
    }
    if (mode === 'group') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <div className={styles.avatarCircle} style={{ width: '30px', height: '30px' }}><GroupIconGlyph icon={participants.groupIcon} size={26} /></div>
        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-color)' }}>{participants.groupName}</span>
      </div>
    );
    return (
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 10px', fontSize: 'clamp(1rem, 3.5vw, 1.25rem)', fontWeight: 800, minWidth: 0 }}>
        <Avatar npcId={participants.npcId} size={30} style={{ borderRadius: '50%' }} fallback={symlogo(participants.npcClan) || '/img/ATT-logo(1).webp'} />
        <span style={{ color: CLAN_COLORS[participants.npcClan] || 'var(--text-color)' }}>{participants.npc}</span>
        <span style={{ color: 'var(--text-muted)' }}>↔</span>
        <Avatar userId={participants.userId} size={30} style={{ borderRadius: '50%' }} fallback={symlogo(participants.userClan) || '/img/ATT-logo(1).webp'} />
        <span style={{ color: CLAN_COLORS[participants.userClan] || 'var(--text-color)' }}>{participants.user}</span>
      </div>
    );
  };

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: 'clamp(0.75rem, 3vw, 1.5rem)', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--glass-border)', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, zIndex: 10 }}>
        {onBack && (
          <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} style={{ flexBasis: '100%', alignSelf: 'flex-start', justifyContent: 'flex-start', marginLeft: '-8px' }} onClick={onBack}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">arrow_back</span> Back to threads
          </button>
        )}
        {getHeaderTitle()}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(0.75rem, 3vw, 2rem)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {loading && <div className={styles.loading}><span className={styles.spinner} /> Extracting transmission stream...</div>}

        {!loading && messages.map((msg, i) => {
          let isSent = false; let name = 'Unknown'; let clan = null; let avatarProps = {};

          if (mode === 'direct') {
            const isUser1 = msg.sender_id === participants.user1Id;
            isSent = isUser1;
            name = isUser1 ? (participants.user1Char || participants.user1) : (participants.user2Char || participants.user2);
            clan = isUser1 ? participants.user1Clan : participants.user2Clan;
            avatarProps = { userId: msg.sender_id };
          } else if (mode === 'npc') {
            isSent = msg.from === 'npc';
            name = isSent ? participants.npc : participants.user;
            clan = isSent ? participants.npcClan : participants.userClan;
            avatarProps = isSent ? { npcId: participants.npcId } : { userId: participants.userId };
          } else {
            name = msg.char_name || msg.display_name;
            clan = msg.clan;
            avatarProps = { userId: msg.sender_id };
          }

          const showSender = i === 0 || messages[i - 1].sender_id !== msg.sender_id || messages[i - 1].from !== msg.from;
          const reactions = reactionsByMsgId?.[msg.id];

          return (
            <div key={msg.id ?? i} className={`${styles.messageRow} ${isSent ? styles.sentRow : styles.receivedRow}`}>
              <div className={styles.avatarCircle}>
                <Avatar {...avatarProps} size={32} style={{ borderRadius: '50%' }} fallback={symlogo(clan) || '/img/ATT-logo(1).webp'} />
              </div>
              <div className={styles.messageBubble}>
                {showSender && <div className={styles.senderName} style={{ color: CLAN_COLORS[clan] || 'var(--text-secondary)' }}>{name}</div>}
                {msg.attachment_id && <MediaAttachment attachmentId={msg.attachment_id} />}
                {msg.body && <div style={{ color: isSent ? 'var(--text-color)' : 'var(--text-primary)', wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.body}</div>}
                <ReactionRow reactions={reactions} />
                <div className={styles.messageTime} style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                  <span>{formatTimestamp(msg.created_at, false)}</span>
                  {msg.edited ? <EditedTag /> : null}
                  {mode === 'npc' && msg.status === 'queued' ? <PendingTag /> : null}
                  {mode === 'direct' ? <StatusIcon msg={msg} /> : null}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>
    </>
  );
}
