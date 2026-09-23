// src/components/ChatSystem.jsx
import React, { useState, useEffect, useContext, useRef, useMemo, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AuthCtx } from '../../core/AuthContext';
import api, { formatApiError } from '../../core/api';
import { copyToClipboard } from '../../utils/clipboard';
import { formatAthensDateTime } from '../../utils/dateFormatter';
import styles from '../../styles/ChatSystem.module.css';
import '../../styles/SchreckNetChat.css';
import { Skeleton } from 'boneyard-js/react';
import Avatar from '../../components/Avatar';
const EmojiPicker = React.lazy(() => import('emoji-picker-react'));
import MiniSearch from 'minisearch';
import { motion, AnimatePresence } from 'framer-motion';
import { getPushSettings, updatePushSettings, subscribeToWebPush } from '../../utils/push';
import { socket } from '../../api/liveSession';
import { symlogo as localSymlogo, CLAN_HEX as CLAN_COLORS } from '../../data/clans';
import { useCommsEnabled } from '../comms/useCommsEnabled';

/* --- Clan assets & colors --- */
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
  (c ? `${getApiOrigin()}/img/clans/330px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g, '_')}_symbol.webp` : '');

// Sect and bloodline crests usable as chat emoji/tokens alongside the 16
// player clans. These aren't part of CLAN_COLORS (they don't drive
// character theming — see src/data/clans.js), just a chat-only extension of
// the same ':Name:' crest system, backed by the same asset convention
// (src/assets/clans/330px-{Name}_symbol.png) so localSymlogo() resolves them
// with no further wiring.
const EXTRA_CREST_NAMES = ['Anarch', 'Camarilla', 'Sabbat', 'Giovanni'];
const ALL_CREST_NAMES = [...Object.keys(CLAN_COLORS), ...EXTRA_CREST_NAMES];

const customClanEmojis = ALL_CREST_NAMES.map(clan => ({
  id: clan.toLowerCase().replace(/[^a-z0-9]/g, '_'),
  names: [clan],
  imgUrl: localSymlogo(clan)
}));

// Shared between the message composer's picker and the group-picture picker.
const EMOJI_PICKER_CATEGORIES = [
  { category: 'suggested', name: 'Recently Used' },
  { category: 'custom', name: 'Clans' },
  { category: 'smileys_people', name: 'Smileys & People' },
  { category: 'animals_nature', name: 'Animals & Nature' },
  { category: 'food_drink', name: 'Food & Drink' },
  { category: 'travel_places', name: 'Travel & Places' },
  { category: 'activities', name: 'Activities' },
  { category: 'objects', name: 'Objects' },
  { category: 'symbols', name: 'Symbols' },
  { category: 'flags', name: 'Flags' }
];

const renderMessageBody = (text) => {
  if (!text) return null;
  const clanRegex = /:([A-Za-z0-9_]+):/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = clanRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const clanId = match[1];
    const clanName = ALL_CREST_NAMES.find(c => c.replace(/\s+/g, '_').toLowerCase() === clanId.toLowerCase());
    if (clanName) {
      parts.push(
        <img
          key={`emoji-${match.index}`}
          src={localSymlogo(clanName)}
          alt={clanName}
          title={clanName}
          className="inline-block w-[18px] h-[18px] mx-0.5 align-text-bottom crestImg opacity-100"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      );
    } else {
      parts.push(match[0]);
    }
    lastIndex = clanRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return parts;
};

/* --- Reaction glyphs ---
 *
 * A reaction is stored as a plain string in chat_message_reactions.emoji
 * (varchar 32). Most are literal emoji, but a clan crest is stored as the
 * same ':Clan_Name:' token renderMessageBody() already understands, so the
 * two representations stay interchangeable.
 *
 * The ankh is the real character U+2625 rather than an image: it needs no
 * asset deployed, and it still reads as a crest at 14px where a detailed
 * logo would not. */
const ANKH = '☥';

// Resolves any spelling of a clan ('banu haqim', 'Banu_Haqim') to the
// canonical key in CLAN_COLORS, or null if it isn't one of ours.
const clanKeyFor = (name) => {
  if (!name) return null;
  const want = String(name).trim().replace(/\s+/g, '_').toLowerCase();
  return ALL_CREST_NAMES.find(c => c.replace(/\s+/g, '_').toLowerCase() === want) || null;
};

const clanToken = (name) => {
  const clan = clanKeyFor(name);
  return clan ? `:${clan.replace(/\s+/g, '_')}:` : null;
};

// Renders one reaction: a clan token becomes the white crest, anything else
// is left as the literal character it already is.
const ReactionGlyph = ({ value, size = 14 }) => {
  const match = /^:([A-Za-z0-9_]+):$/.exec(value || '');
  const clan = match ? clanKeyFor(match[1]) : null;
  if (!clan) return <span>{value}</span>;
  return (
    <img
      src={localSymlogo(clan)}
      alt={clan}
      title={clan}
      className="inline-block align-text-bottom crestImg"
      style={{ width: size, height: size, filter: 'brightness(0) invert(1)' }}
    />
  );
};

// A group's chosen picture: same ':Clan_Name:' / literal-emoji convention as
// ReactionGlyph, just sized and centered for an avatar slot instead of
// inline text. Falls back to the generic "group" icon when none is set yet.
const GroupIconGlyph = ({ icon, size = 24 }) => {
  if (!icon) return <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: size }}>group</span>;
  const match = /^:([A-Za-z0-9_]+):$/.exec(icon);
  const clan = match ? clanKeyFor(match[1]) : null;
  if (clan) {
    return (
      <img
        src={localSymlogo(clan)}
        alt={clan}
        title={clan}
        style={{ width: size * 0.7, height: size * 0.7, filter: 'brightness(0) invert(1)' }}
      />
    );
  }
  return <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>{icon}</span>;
};

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
  icon: g.icon || null,
  created_by: g.created_by,
  last_message_at: g.last_message_at ? new Date(g.last_message_at).getTime() : 0,
  unread_count: g.unread_count || 0
});

const isContactAdmin = (u) => u?.role === 'admin' || u?.permission_level === 'admin' || !!u?.is_admin;

/* Unread count circle shown next to a contact in the sidebar. */
function UnreadCount({ count }) {
  if (!count) return null;
  return (
    <div className="min-w-4 h-4 px-1 rounded-full bg-primary-container text-white flex items-center justify-center text-[10px] font-bold shrink-0" aria-label={`${count} unread`}>
      {count > 99 ? '99+' : count}
    </div>
  );
}

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
    return <span title={`Seen: ${new Date(msg.read_at).toLocaleString('en-GB', { timeZone: 'Europe/Athens' })}`} className={styles.statusSeen}>✓✓</span>;
  }
  if (msg.delivered_at) {
    return <span title={`Delivered: ${new Date(msg.delivered_at).toLocaleString('en-GB', { timeZone: 'Europe/Athens' })}`} className={styles.statusDelivered}>✓✓</span>;
  }
  return <span title="Sent" className={styles.statusSent}>✓</span>;
};

/* --- CHAT IMAGE COMPONENT (Secure Fetch) --- */
const ChatMedia = ({ attachmentId }) => {
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
          // Fallback to fetch blob
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
      .catch((err) => {
        console.error("Failed to load media info", err);
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
    <Skeleton name="chat-media-loader" loading={true}>
      <div className="w-48 h-48 max-w-full rounded bg-surface-variant/30 animate-pulse" />
    </Skeleton>
  );
  if (error) return <div className="p-4 bg-error/20 text-error rounded-lg text-sm text-center border border-dashed border-error">Media failed to load</div>;

  if (mediaInfo?.mime?.startsWith('video/')) {
    return (
      <video
        controls
        src={mediaInfo.url}
        className="w-auto h-auto max-w-full max-h-[300px] object-contain rounded block"
      />
    );
  }
  if (mediaInfo?.mime?.startsWith('audio/')) {
    return (
      <audio
        controls
        src={mediaInfo.url}
        className="w-full max-w-[300px] rounded block"
      />
    );
  }

  return (
    <img
      src={mediaInfo?.url}
      alt="Attachment"
      className="w-auto h-auto max-w-full max-h-[300px] object-contain rounded cursor-pointer block"
      onClick={() => window.open(mediaInfo?.url, '_blank')}
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

export default function ChatSystem({ commsEnabled: propCommsEnabled, nextOpening: propNextOpening }) {
  const commsHook = useCommsEnabled();
  const commsEnabled = typeof propCommsEnabled === 'boolean' ? propCommsEnabled : commsHook.commsEnabled;
  const nextOpening = propNextOpening !== undefined ? propNextOpening : commsHook.nextOpening;

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
  const canSend = commsEnabled || (isAdmin && selectedContact?.type === 'npc');
  // Admin composing as an NPC while comms are down: offer a queue instead of
  // (not just) the existing immediate-send bypass.
  const showQueueOption = !commsEnabled && isAdmin && selectedContact?.type === 'npc';
  const [npcConvos, setNpcConvos] = useState([]);
  const [adminPlayerTab, setAdminPlayerTab] = useState('recent');
  const [adminPlayerFilter, setAdminPlayerFilter] = useState('');

  // Admin-only: queued ("Send Later") NPC messages pending until SchreckNet reopens
  const [pendingOpen, setPendingOpen] = useState(false);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingRefreshTick, setPendingRefreshTick] = useState(0);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // EDIT/DELETE STATES
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editBody, setEditBody] = useState('');

  // Shared by the message composer's picker and the group-picture picker:
  // a custom (clan/crest) pick becomes a ':Clan_Name:' token, anything else
  // is the emoji character itself.
  const emojiObjectToToken = (emojiObject) => {
    const clanTag = emojiObject.isCustom && emojiObject.names && emojiObject.names[0] ? emojiObject.names[0].replace(/\s+/g, '_') : (emojiObject.unified || 'unknown');
    return emojiObject.isCustom ? `:${clanTag}:` : emojiObject.emoji;
  };

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const onEmojiClick = (emojiObject) => {
    setNewMessage(prevInput => prevInput + emojiObjectToToken(emojiObject));
    if (!isMobile && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const [attachment, setAttachment] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const [drafts, setDrafts] = useState({});
  const sendingRef = useRef(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const loadSeqRef = useRef(0);

  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const [newGroupIcon, setNewGroupIcon] = useState(null);
  const [groupIconPickerOpen, setGroupIconPickerOpen] = useState(false);
  const [savingGroupIcon, setSavingGroupIcon] = useState(false);

  // In-app replacement for window.confirm: `await askConfirm({...})`
  // resolves true/false once the player picks a button in the themed dialog.
  const [confirmState, setConfirmState] = useState(null);
  const askConfirm = useCallback((opts) => new Promise(resolve => setConfirmState({ ...opts, resolve })), []);
  const closeConfirm = (result) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };
  useEffect(() => {
    if (!confirmState) return;
    const onKey = (e) => { if (e.key === 'Escape') closeConfirm(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmState]);

  // Picking a group picture: while the Create modal is open it just stages
  // the value locally; while Manage is open (an existing group) it saves
  // immediately via the icon endpoint. Only one of those modals is ever open
  // at once, so which one is active is enough to route the pick.
  const onGroupIconEmojiClick = async (emojiObject) => {
    const token = emojiObjectToToken(emojiObject);
    setGroupIconPickerOpen(false);
    if (creatingGroup) {
      setNewGroupIcon(token);
      return;
    }
    if (managingGroup && selectedContact?.type === 'group') {
      const ok = await askConfirm({
        title: 'Change Group Picture',
        message: 'Set this as the group picture? Everyone in the group will see the change.',
        preview: token,
        confirmLabel: 'Set Picture',
      });
      if (!ok) return;
      setSavingGroupIcon(true);
      try {
        await api.put(`/chat/groups/${selectedContact.id}/icon`, { icon: token });
        setGroups(prev => prev.map(g => g.id === selectedContact.id ? { ...g, icon: token } : g));
        setSelectedContact(prev => (prev && prev.id === selectedContact.id) ? { ...prev, icon: token } : prev);
      } catch (e) {
        alert('Failed to update group picture.');
      } finally {
        setSavingGroupIcon(false);
      }
    }
  };

  const [managingGroup, setManagingGroup] = useState(false);
  const [currentGroupMembers, setCurrentGroupMembers] = useState([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [savingGroupName, setSavingGroupName] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  // Both group modals share one picker instance (never open together) —
  // always start it closed whenever either modal opens or closes.
  useEffect(() => { setGroupIconPickerOpen(false); }, [creatingGroup, managingGroup]);

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

  // `refresh` reloads the member list after an add/kick without resetting
  // the panel (rename draft, open "Add Members" list) the player is using.
  const openManageGroup = async (refresh = false) => {
    if (refresh !== true) {
      setManagingGroup(true);
      setRenameValue(selectedContact?.name || '');
      setAddMembersOpen(false);
      setCurrentGroupMembers([]);
    }
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

  const handleRenameGroup = async () => {
    const newName = renameValue.trim();
    if (!newName || newName === selectedContact?.name) return;
    const ok = await askConfirm({
      title: 'Rename Group',
      message: `Change the group name from "${selectedContact?.name}" to "${newName}"?`,
      confirmLabel: 'Rename',
    });
    if (!ok) return;
    setSavingGroupName(true);
    try {
      await api.put(`/chat/groups/${selectedContact.id}/name`, { name: newName });
      setGroups(prev => prev.map(g => g.id === selectedContact.id ? { ...g, name: newName } : g));
      setSelectedContact(prev => (prev && prev.id === selectedContact.id) ? { ...prev, name: newName } : prev);
    } catch (e) {
      alert('Failed to rename group');
    } finally {
      setSavingGroupName(false);
    }
  };

  const handleAddMemberToGroup = async (userId, name) => {
    const ok = await askConfirm({
      title: 'Add Member',
      message: `Add ${name} to the group chat? They will be able to read the full message history.`,
      confirmLabel: 'Add',
    });
    if (!ok) return;
    try {
      await api.post(`/chat/groups/${selectedContact.id}/members`, { members: [userId] });
      openManageGroup(true);
    } catch (e) { alert('Failed to add member'); }
  };

  const handleRemoveMemberFromGroup = async (userId, name) => {
    const ok = await askConfirm({
      title: 'Remove Member',
      message: `Remove ${name} from the group chat?`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/chat/groups/${selectedContact.id}/members/${userId}`);
      openManageGroup(true);
    } catch (e) { alert('Failed to remove member'); }
  };

  const handleDeleteGroup = async () => {
    const ok = await askConfirm({
      title: 'Delete Group',
      message: 'Delete this group? This erases all message history for everyone and cannot be undone.',
      confirmLabel: 'Delete Group',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/chat/groups/${selectedContact.id}`);
      setManagingGroup(false);
      setSelectedContact(null);
      fetchContacts();
    } catch (e) { alert('Failed to delete group'); }
  };

  const handleLeaveGroup = async () => {
    const ok = await askConfirm({
      title: 'Leave Group',
      message: `Leave "${selectedContact?.name}"? You'll need someone in the group to add you back.`,
      confirmLabel: 'Leave',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/chat/groups/${selectedContact.id}/members/${currentUser.id}`);
      setSelectedContact(null);
      fetchContacts();
    } catch (e) { alert('Failed to leave group'); }
  };

  const handleDeleteMessage = async (msgId) => {
    const ok = await askConfirm({
      title: 'Delete Message',
      message: 'Delete this message? It cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/chat/messages/${msgId}`, { params: { table: reactionTable } });
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (e) {
      alert("Failed to delete message. It may be too old or you lack permission.");
    }
  };

  const submitEditMessage = async () => {
    if (!editBody.trim()) return;
    try {
      await api.put(`/chat/messages/${editingMsgId}`, { body: editBody, table: reactionTable });
      setMessages(prev => prev.map(m => m.id === editingMsgId ? { ...m, body: editBody, edited: true } : m));
      setEditingMsgId(null);
    } catch (e) {
      alert(formatApiError(e, "Failed to edit message. It may be too old or you lack permission."));
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
    // Auth rides along as the httpOnly session cookie, nothing to attach
    // here manually. Still surface "session expired" if a request 401s.
    const id = api.interceptors.response.use(res => res, err => {
      if (err?.response?.status === 401) setError('Your session expired. Please log in again.');
      return Promise.reject(err);
    });
    return () => api.interceptors.response.eject(id);
  }, []);

  const isAuthenticated = !!currentUser;

  // Background Contacts Fetcher
  const fetchContacts = useCallback(async () => {
    if (!isAuthenticated) return;
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
  }, [isAuthenticated]);

  // Track page visibility to pause polling entirely when the user is in another tab
  const [isTabVisible, setIsTabVisible] = useState(() => (typeof document !== 'undefined' ? !document.hidden : true));
  useEffect(() => {
    const handleVisibility = () => {
      const visible = !document.hidden;
      setIsTabVisible(visible);
      if (visible) {
        // Immediate sync upon returning to tab
        setSocketRefreshTick((t) => t + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Real-time group chat: join socket room for active group
  useEffect(() => {
    if (selectedContact?.type === 'group' && selectedContact?.id) {
      socket.emit('join_group', selectedContact.id);
      return () => {
        socket.emit('leave_group', selectedContact.id);
      };
    }
  }, [selectedContact?.type, selectedContact?.id]);

  // Initial Load & Polling setup. Pauses when tab is hidden.
  // With real-time WebSocket events, a 90s safety fallback is used while visible.
  useEffect(() => {
    setLoading(true);
    fetchContacts().finally(() => setLoading(false));

    if (!isTabVisible) return;
    const intervalMs = socket.connected ? 90000 : 30000;
    const contactInterval = setInterval(fetchContacts, intervalMs);
    return () => clearInterval(contactInterval);
  }, [fetchContacts, creatingGroup, isTabVisible]);

  // Socket-driven instant refresh. Deliberately a separate effect:
  // this must NEVER toggle `loading` (that would flash the skeleton),
  // it silently re-runs fetchContacts() and bumps socketRefreshTick to
  // sync whichever thread is currently open within 300ms.
  const [socketRefreshTick, setSocketRefreshTick] = useState(0);
  useEffect(() => {
    let debounceTimer = null;
    const bump = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => setSocketRefreshTick((t) => t + 1), 300);
    };
    socket.on('chat:refresh', bump);
    socket.on('chat:reactions', bump);
    socket.on('connect', bump);
    return () => {
      clearTimeout(debounceTimer);
      socket.off('chat:refresh', bump);
      socket.off('chat:reactions', bump);
      socket.off('connect', bump);
    };
  }, []);
  useEffect(() => {
    if (socketRefreshTick === 0) return; // skip initial render
    fetchContacts();
  }, [socketRefreshTick, fetchContacts]);

  // Admin-only: keep the "Pending" (queued NPC messages) count/list fresh.
  // Reuses the same chat:refresh socket signal as contacts, plus a slow
  // poll fallback and an explicit tick bumped right after queue/cancel actions.
  const fetchPendingQueue = useCallback(async () => {
    if (!isAdmin || !isAuthenticated) return;
    setPendingLoading(true);
    try {
      const { data } = await api.get('/admin/chat/npc/queued');
      setPendingQueue(data.queued || []);
    } catch (e) {
      // silent fail — non-critical panel
    } finally {
      setPendingLoading(false);
    }
  }, [isAdmin, isAuthenticated]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchPendingQueue();
    const interval = setInterval(fetchPendingQueue, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, socketRefreshTick, pendingRefreshTick]);

  const cancelPendingMessage = async (id) => {
    try {
      await api.delete(`/admin/chat/npc/queued/${id}`);
      setPendingQueue(prev => prev.filter(m => m.id !== id));
      setMessages(prev => prev.map(m => (m.id === id && m.status === 'queued') ? { ...m, status: 'cancelled' } : m));
    } catch (e) {
      alert('Failed to cancel queued message.');
    }
  };

  /* Reactions (double-tap-to-like + emoji react) */
  // Double-tap-to-like is a thumbs up, not a heart: it reads as
  // acknowledgement rather than affection, which is what a tap actually means.
  const LIKE_EMOJI = '👍';

  // The last slot is the player's own clan crest in place of the heart.
  // Admins have no character loaded at all (see the myChar effect above), and
  // a clanless character shouldn't display a crest either, so both fall back
  // to the ankh.
  const mySigil = useMemo(
    () => (isAdmin ? ANKH : (clanToken(myChar?.clan || myChar?.sheet?.clan) || ANKH)),
    [isAdmin, myChar]
  );
  const QUICK_REACTIONS = useMemo(
    () => ['👍', '😂', '😮', '😢', '🙏', mySigil],
    [mySigil]
  );

  // Maps selectedContact.type to the discriminator the backend expects:
  // must match ALLOWED_REACTION_TABLES / EDITABLE_MESSAGE_TABLES in back/routes/chat.js.
  // Also sent on edit/delete, since message ids collide across these tables.
  const reactionTable = selectedContact?.type === 'group'
    ? 'chat_group_messages'
    : selectedContact?.type === 'user'
      ? 'chat_messages'
      : selectedContact?.type === 'npc'
        ? 'npc_messages'
        : null;

  const [reactionsByMsgId, setReactionsByMsgId] = useState({});
  const [reactionPickerFor, setReactionPickerFor] = useState(null);
  const lastTapRef = useRef({});
  const holdTimerRef = useRef(null);
  const holdFiredRef = useRef(false);

  const toggleReaction = useCallback(async (msgId, emoji) => {
    if (!reactionTable || String(msgId).startsWith('temp_')) return; // can't react to a message that hasn't finished sending yet
    try {
      const { data } = await api.post(`/chat/messages/${msgId}/reactions`, { table: reactionTable, emoji });
      setReactionsByMsgId(prev => ({ ...prev, [msgId]: data.reactions || [] }));
    } catch (e) {
      // Reactions are a nice-to-have on top of chat: fail silently rather
      // than surfacing an error banner for something this minor.
    }
    setReactionPickerFor(null);
  }, [reactionTable]);

  // Works for both mouse double-click and touch double-tap: onClick fires
  // for both, so tracking tap timing here covers desktop and mobile with one
  // handler instead of relying on onDoubleClick (touch-unreliable).
  // If a hold already opened the picker we suppress the click so it doesn't
  // also count as the first half of a double-tap.
  const handleBubbleTap = useCallback((msgId) => {
    if (holdFiredRef.current) { holdFiredRef.current = false; return; }
    const now = Date.now();
    const last = lastTapRef.current[msgId] || 0;
    if (now - last < 300) {
      lastTapRef.current[msgId] = 0;
      toggleReaction(msgId, LIKE_EMOJI);
    } else {
      lastTapRef.current[msgId] = now;
    }
  }, [toggleReaction]);

  // Long-press (500ms hold) opens the quick-reaction picker without toggling a
  // reaction. Works for both touch and mouse via the unified Pointer Events API.
  const handleBubblePointerDown = useCallback((e, msgId) => {
    if (String(msgId).startsWith('temp_')) return;
    holdFiredRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      holdFiredRef.current = true;
      setReactionPickerFor(p => (p === msgId ? null : msgId));
    }, 500);
  }, []);

  const handleBubblePointerCancel = useCallback(() => {
    clearTimeout(holdTimerRef.current);
  }, []);

  // Batch-fetch reaction summaries for whichever messages are currently
  // shown. Re-runs when the set of message ids changes (new message
  // arrived), when a socket 'chat:refresh' fires (someone else may have
  // reacted: the message content itself wouldn't have changed, so the
  // message-polling effect alone wouldn't catch that), and on its own slow
  // interval as a safety net if sockets are ever down.
  const messageIdsKey = useMemo(
    () => messages.filter(m => !String(m.id).startsWith('temp_')).map(m => m.id).join(','),
    [messages]
  );
  useEffect(() => {
    if (!reactionTable || !messageIdsKey) { setReactionsByMsgId({}); return; }
    let active = true;
    const fetchReactions = () => {
      const ids = messageIdsKey.split(',').map(Number);
      api.post('/chat/messages/reactions/batch', { table: reactionTable, ids })
        .then(({ data }) => { if (active) setReactionsByMsgId(data.reactions || {}); })
        .catch(() => { });
    };
    fetchReactions();
    if (!isTabVisible) return () => { active = false; };
    const intervalMs = socket.connected ? 90000 : 30000;
    const interval = setInterval(fetchReactions, intervalMs);
    return () => { active = false; clearInterval(interval); };
  }, [messageIdsKey, reactionTable, socketRefreshTick, isTabVisible]);

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
              if (selectedPlayerId && isAuthenticated) {
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
                let icon = '/img/ATT-logo(1).webp';

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
        if (isAdmin && selectedContact.type === 'npc' && isAuthenticated) {
          try {
            const res = await api.get(`/admin/chat/npc-conversations/${selectedContact.id}`);
            if (loadSeqRef.current !== mySeq) return;
            const rows = (res.data?.conversations || []).map(r => ({
              user_id: r.user_id,
              display_name: r.display_name || '',
              char_name: r.char_name || '',
              last_message_at: r.last_message_at || null,
              last_incoming_at: r.last_incoming_at || null,
              unread_count: r.unread_count || 0
            }));
            // Whoever wrote to this NPC most recently goes on top.
            const lastIn = (r) => new Date(r.last_incoming_at || r.last_message_at || 0);
            rows.sort((a, b) => lastIn(b) - lastIn(a));
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
    if (!isTabVisible) return;
    // Slow safety net: 'chat:refresh' covers real-time delivery via WebSocket,
    // so this interval only catches edge cases or reconnects.
    const intervalMs = socket.connected ? 60000 : 15000;
    pollRef.current = setInterval(load, intervalMs);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // socketRefreshTick is intentionally a dependency, not used in the body:
    // bumping it re-runs this effect, which calls load() immediately: the
    // same function this effect already runs on mount/selection-change and
    // every interval tick, just triggered on-demand by the socket event
    // instead of only on a timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContact, selectedPlayerId, isAdmin, isAuthenticated, currentUser?.id, users, threadKey, isInbound, notify, socketRefreshTick, isTabVisible]);

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
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });

    if (textareaRef.current) textareaRef.current.focus();
  };

  /* --- Sending Logic --- */
  const doSend = async ({ queue = false } = {}) => {
    if (!canSend) return;
    const body = newMessage.trim();

    if ((!body && !attachment) || !selectedContact) return;
    if (isAdmin && selectedContact.type === 'npc' && !selectedPlayerId) return;
    if (sendingRef.current) return;

    sendingRef.current = true;
    let attachmentId = null;

    try {
      if (attachment) {
        setIsUploading(true);
        setUploadProgress(0);
        const formData = new FormData();
        formData.append('file', attachment);

        try {
          const res = await api.post('/chat/upload', formData, {
            onUploadProgress: (e) => {
              const p = Math.round((e.loaded * 100) / e.total);
              setUploadProgress(p);
            }
          });
          attachmentId = res.data.id;
        } catch (err) {
          console.error('Upload error:', err?.response?.data || err);
          alert(formatApiError(err, 'Failed to upload file. Check file size and type.'));
          sendingRef.current = false;
          setIsUploading(false);
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
          const { data } = await api.post('/admin/chat/npc/messages', { npc_id: selectedContact.id, user_id: selectedPlayerId, queue, ...payload });
          if (data && data.message) {
            newMsg = {
              id: data.message.id,
              body: data.message.body,
              created_at: data.message.created_at,
              sender_id: 'npc',
              _from: 'npc',
              attachment_id: data.message.attachment_id,
              status: data.message.status
            };
          } else {
            newMsg = {
              id: generateTempId(),
              body,
              created_at: new Date().toISOString(),
              sender_id: 'npc',
              _from: 'npc',
              attachment_id: attachmentId,
              status: queue ? 'queued' : 'sent'
            };
          }
          setPendingRefreshTick(t => t + 1);
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
      setIsUploading(false);
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
      await api.post('/chat/groups', { name: newGroupName, members: newGroupMembers, icon: newGroupIcon });
      setCreatingGroup(false);
      setNewGroupName('');
      setNewGroupMembers([]);
      setNewGroupIcon(null);
      fetchContacts();
    } catch (e) { alert('Failed to create group'); }
  };

  /* --- Render & Filters --- */
  const formatTime = (ts) => formatAthensDateTime(ts);
  const formatDay = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', {
      timeZone: 'Europe/Athens',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
      // m.type ('text'/'system') comes from the backend and would otherwise
      // collide with this array's own 'day'/'msg' discriminant key.
      g.push({ ...m, type: m.type === 'system' ? 'system' : 'msg' });
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

    // A player picked under one NPC means nothing under another NPC; start
    // clean so the auto-open below picks this NPC's own latest conversation.
    if (isAdmin) setSelectedPlayerId(null);

    const nextKey = buildThreadKey(contact, null);
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

  // Opening an NPC as admin jumps straight into its most recently active
  // conversation. Only once per NPC visit, so "Clear" doesn't immediately
  // re-select it.
  const autoPickedNpcRef = useRef(null);
  useEffect(() => {
    if (!isAdmin || selectedContact?.type !== 'npc' || selectedPlayerId || !npcConvos.length) return;
    if (autoPickedNpcRef.current === selectedContact.id) return;
    autoPickedNpcRef.current = selectedContact.id;
    const activity = (r) => Math.max(new Date(r.last_message_at || 0).getTime(), new Date(r.last_incoming_at || 0).getTime());
    const latest = npcConvos.reduce((best, r) => (activity(r) > activity(best) ? r : best), npcConvos[0]);
    selectAdminTarget(latest.user_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npcConvos]);
  useEffect(() => {
    if (selectedContact?.type !== 'npc') autoPickedNpcRef.current = null;
  }, [selectedContact]);

  const renderManageGroupModalTailwind = () => {
    const memberIds = currentGroupMembers.map(m => m.id);
    const nonMembers = usersWithChar.filter(u => !memberIds.includes(u.id));
    // Any member can rename, re-icon, add, or kick — only the group's
    // creator (or a global admin) can delete it outright, mirrored from the
    // backend's own guard on DELETE /api/chat/groups/:id.
    const canDelete = selectedContact?.created_by === currentUser?.id || isAdmin;

    const sectionLabel = "text-[10px] text-on-surface-variant/50 font-bold tracking-widest uppercase";

    // Portaled to <body> at z-[1100] so it sits above the sticky site nav
    // (z-[1000]) instead of sliding underneath it. Header and footer are
    // fixed; only the middle scrolls. That body is plain block layout on
    // purpose: in a height-capped flex column the emoji picker's
    // overflow-hidden wrapper gets shrunk to 0px as soon as the member list
    // overflows, so the picker "opens" invisibly.
    return createPortal(
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4" onClick={() => setManagingGroup(false)}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-group-title"
          onClick={e => e.stopPropagation()}
          className="bg-surface-container border border-outline-variant rounded-lg w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_20px_rgba(27,76,140,0.3)]"
        >
          <div className="flex items-center justify-between gap-3 pl-4 sm:pl-6 pr-2 sm:pr-3 py-2 border-b border-outline-variant/50 shrink-0">
            <h3 id="manage-group-title" className="text-xl font-headline-md text-primary tracking-tight m-0 truncate">Manage Group</h3>
            <button
              type="button"
              onClick={() => setManagingGroup(false)}
              aria-label="Close"
              className="w-11 h-11 flex items-center justify-center rounded text-on-surface-variant hover:text-primary hover:bg-surface-variant/50 transition-colors shrink-0"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-5" style={{ scrollbarWidth: 'thin' }}>
            <div>
              <label htmlFor="manage-group-name" className={`${sectionLabel} block mb-1`}>Group Name</label>
              <div className="flex items-center gap-2">
                <input
                  id="manage-group-name"
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameGroup(); }}
                  maxLength={100}
                  disabled={savingGroupName}
                  className="flex-1 min-w-0 bg-surface-container-high border border-outline-variant/50 rounded px-3 py-2 text-base sm:text-sm text-on-surface focus:border-primary focus:ring-0 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleRenameGroup}
                  disabled={savingGroupName || !renameValue.trim() || renameValue.trim() === selectedContact?.name}
                  className="text-xs bg-primary text-on-primary px-4 py-2.5 rounded hover:bg-primary-container transition-colors font-bold disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {savingGroupName ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setGroupIconPickerOpen(v => !v)}
                  disabled={savingGroupIcon}
                  aria-label="Change group picture"
                  className="w-12 h-12 rounded-full bg-surface-container-high border border-outline-variant/50 flex items-center justify-center shrink-0 overflow-hidden relative hover:border-primary transition-colors disabled:opacity-50"
                >
                  <GroupIconGlyph icon={selectedContact?.icon} size={40} />
                </button>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className={sectionLabel}>Group Picture</span>
                  <button
                    type="button"
                    onClick={() => setGroupIconPickerOpen(v => !v)}
                    disabled={savingGroupIcon}
                    aria-expanded={groupIconPickerOpen}
                    className="text-xs text-primary hover:text-primary-container transition-colors font-bold self-start py-1 disabled:opacity-50"
                  >
                    {savingGroupIcon ? 'Saving…' : groupIconPickerOpen ? 'Close Picker' : 'Change Picture'}
                  </button>
                </div>
              </div>
              {groupIconPickerOpen && (
                <div className="mt-3 rounded-lg overflow-hidden border border-outline-variant">
                  <React.Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary, #888)', background: '#111', fontSize: '13px' }}>Loading emojis...</div>}>
                    <EmojiPicker
                      onEmojiClick={onGroupIconEmojiClick}
                      theme="dark"
                      width="100%"
                      height={340}
                      customEmojis={customClanEmojis}
                      categories={EMOJI_PICKER_CATEGORIES}
                    />
                  </React.Suspense>
                </div>
              )}
            </div>

            <div>
              <div className={`${sectionLabel} mb-2`}>Current Members{currentGroupMembers.length > 0 && ` (${currentGroupMembers.length})`}</div>
              {groupMembersLoading && !currentGroupMembers.length ? (
                <div className="text-sm text-on-surface-variant py-2">Loading...</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {currentGroupMembers.map(m => {
                    const label = m.char_name || m.display_name || 'this member';
                    return (
                      <div key={m.id} className="flex items-center justify-between gap-2 bg-surface-container-highest pl-3 pr-2 py-2 rounded border border-outline-variant/30">
                        <span className="text-sm min-w-0 truncate">{m.char_name || 'No char'} <small className="opacity-60">({m.display_name})</small></span>
                        {m.id !== selectedContact.created_by ? (
                          <button className="text-[11px] bg-error-container/20 text-error border border-error/30 px-3 py-1.5 rounded hover:bg-error/20 transition-colors shrink-0" onClick={() => handleRemoveMemberFromGroup(m.id, label)}>Remove</button>
                        ) : (
                          <small className="text-on-surface-variant/50 shrink-0 px-1">Creator</small>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setAddMembersOpen(v => !v)}
                aria-expanded={addMembersOpen}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-bold"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Add Members
                </span>
                <span className={`material-symbols-outlined text-[20px] transition-transform ${addMembersOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              {addMembersOpen && (
                <div className="flex flex-col gap-2 mt-2">
                  {nonMembers.length === 0 ? (
                    <div className="text-center text-on-surface-variant/50 text-sm py-2">All players are in the group.</div>
                  ) : nonMembers.map(u => {
                    const label = u.char_name || u.display_name || 'this player';
                    return (
                      <div key={u.id} className="flex items-center justify-between gap-2 bg-surface-container-highest pl-3 pr-2 py-2 rounded border border-outline-variant/30">
                        <span className="text-sm min-w-0 truncate">{u.char_name} <small className="opacity-60">({u.display_name})</small></span>
                        <button className="text-[11px] bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded hover:bg-primary/40 transition-colors shrink-0" onClick={() => handleAddMemberToGroup(u.id, label)}>Add</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center gap-2 px-4 sm:px-6 py-3 border-t border-outline-variant/50 shrink-0">
            {canDelete ? (
              <button onClick={handleDeleteGroup} className="text-error hover:text-error-container text-sm font-bold transition-colors py-2">Delete Group</button>
            ) : <span />}
            <button onClick={() => setManagingGroup(false)} className="bg-primary text-on-primary px-5 py-2 rounded hover:bg-primary-container transition-colors font-bold text-sm shadow-[0_0_10px_rgba(255,179,174,0.2)] shrink-0">Done</button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderConfirmDialog = () => {
    const { title, message, preview, confirmLabel, danger } = confirmState;
    return createPortal(
      <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => closeConfirm(false)}>
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="chat-confirm-title"
          aria-describedby="chat-confirm-message"
          onClick={e => e.stopPropagation()}
          className={`bg-surface-container border rounded-lg w-full max-w-sm shadow-[0_0_24px_rgba(0,0,0,0.6)] ${danger ? 'border-error/50' : 'border-outline-variant'}`}
        >
          <div className="px-5 pt-5 pb-4 flex items-start gap-3">
            <span className={`material-symbols-outlined text-[24px] shrink-0 ${danger ? 'text-error' : 'text-primary'}`}>{danger ? 'warning' : 'help'}</span>
            <div className="min-w-0">
              <h4 id="chat-confirm-title" className="text-lg font-headline-md text-on-surface m-0">{title}</h4>
              <p id="chat-confirm-message" className="text-sm text-on-surface-variant mt-1 mb-0 break-words">{message}</p>
            </div>
          </div>
          {preview && (
            <div className="flex justify-center pb-4">
              <div className="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant/50 flex items-center justify-center overflow-hidden">
                <GroupIconGlyph icon={preview} size={52} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-outline-variant/50">
            <button
              type="button"
              autoFocus
              onClick={() => closeConfirm(false)}
              className="px-4 py-2 text-sm font-bold rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => closeConfirm(true)}
              className={`px-4 py-2 text-sm font-bold rounded transition-colors ${danger ? 'bg-error text-on-error hover:opacity-90' : 'bg-primary text-on-primary hover:bg-primary-container'}`}
            >
              {confirmLabel || 'Confirm'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderCreateGroupModalTailwind = () => createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface-container border border-outline-variant rounded-lg w-full max-w-md p-6 flex flex-col gap-4 shadow-[0_0_20px_rgba(27,76,140,0.3)]">
        <h3 className="text-xl font-headline-md text-primary tracking-tight border-b border-outline-variant/50 pb-2">Create Group Chat</h3>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setGroupIconPickerOpen(v => !v)}
            title="Click to pick a group picture"
            className="w-12 h-12 rounded-full bg-surface-container-high border border-outline-variant/50 flex items-center justify-center shrink-0 overflow-hidden relative hover:border-primary transition-colors"
          >
            <GroupIconGlyph icon={newGroupIcon} size={40} />
          </button>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-on-surface-variant/50 font-bold tracking-widest uppercase">Group Picture</span>
            <button type="button" onClick={() => setGroupIconPickerOpen(v => !v)} className="text-xs text-primary hover:text-primary-container transition-colors font-bold self-start">
              {newGroupIcon ? 'Change Picture' : 'Pick Picture'}
            </button>
          </div>
        </div>
        {groupIconPickerOpen && (
          <div className="rounded-lg overflow-hidden border border-outline-variant">
            <React.Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary, #888)', background: '#111', fontSize: '13px' }}>Loading emojis...</div>}>
              <EmojiPicker
                onEmojiClick={onGroupIconEmojiClick}
                theme="dark"
                width="100%"
                height={320}
                customEmojis={customClanEmojis}
                categories={EMOJI_PICKER_CATEGORIES}
              />
            </React.Suspense>
          </div>
        )}

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
    </div>,
    document.body
  );

  return (
    <div
      className={`${styles.commsContainer} ${selectedContact ? styles.mobileChatActive : ''}`}
      ref={containerRef}
    >
      {/* Modals */}
      {creatingGroup && renderCreateGroupModalTailwind()}
      {managingGroup && renderManageGroupModalTailwind()}
      {confirmState && renderConfirmDialog()}

      {/* SideNavBar (Desktop) & Full View (Mobile when no contact selected) */}
      <motion.aside
        className={styles.userList}
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
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
              NEW GROUP
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
                        <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 overflow-hidden">
                          <GroupIconGlyph icon={g.icon} size={18} />
                        </div>
                        <span className={`${isActive ? 'text-glow-active font-medium text-white' : ''} truncate`}>{g.name}</span>
                      </div>
                      <UnreadCount count={g.unread_count} />
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
                        <Avatar userId={u.id} size="100%" style={{ width: '100%', height: '100%' }} imgClassName="opacity-80" fallback={localSymlogo(u.clan) || '/img/ATT-logo(1).webp'} />
                      </div>
                      <span className={`${isActive ? 'text-glow-active font-medium text-white' : ''} truncate flex flex-col`}>
                        <span className="truncate">{u.char_name}</span>
                        <span className="text-[9px] opacity-60 truncate">{u.display_name}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {u.clan && <span className="text-[9px] bg-surface-dim px-1 rounded border border-outline-variant/30 uppercase max-w-[40px] truncate">{u.clan.slice(0, 3)}</span>}
                      <UnreadCount count={u.unread_count} />
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
                          <Avatar userId={u.id} size="100%" style={{ width: '100%', height: '100%' }} imgClassName="opacity-80" fallback="/img/ATT-logo(1).webp" />
                        </div>
                        <span className={`${isActive ? 'text-glow-active font-medium text-white' : ''} truncate flex flex-col`}>
                          <span className="truncate">{u.display_name}</span>
                        </span>
                      </div>
                      <UnreadCount count={u.unread_count} />
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
                          <Avatar npcId={n.id} size="100%" style={{ width: '100%', height: '100%', borderRadius: 0 }} imgClassName="opacity-80" fallback={crest || '/img/ATT-logo(1).webp'} />
                        </div>
                      </div>
                      <span className={`${isActive ? 'text-glow-active font-medium text-white' : ''} truncate flex items-center gap-1`}>
                        {n.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[8px] bg-tertiary-container/20 text-tertiary px-1 rounded border border-tertiary/30 uppercase">NPC</span>
                      <UnreadCount count={n.unread_count} />
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
          {isAdmin && (
            <div onClick={() => setPendingOpen(true)} className={`flex items-center gap-3 ${pendingQueue.length > 0 ? 'text-amber-400' : 'text-on-surface-variant'} cursor-pointer p-1 rounded hover:bg-surface-variant/10 transition-colors`}>
              <span className="material-symbols-outlined text-[16px]">schedule_send</span>
              <span className="text-[11px] font-bold tracking-widest uppercase">Pending: {pendingQueue.length}</span>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Pending (Queued NPC Messages) Panel */}
      {pendingOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPendingOpen(false)}>
          <div className="bg-surface-container border border-outline-variant rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col shadow-[0_0_20px_rgba(245,158,11,0.2)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-outline-variant/50 shrink-0">
              <h3 className="text-lg font-headline-md text-amber-400 tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined">schedule_send</span> Pending NPC Messages
              </h3>
              <button onClick={() => setPendingOpen(false)} className="text-on-surface-variant hover:text-error"><span className="material-symbols-outlined">close</span></button>
            </div>
            {nextOpening && (
              <div className="px-4 py-2 text-[11px] font-system-code text-on-surface-variant/70 border-b border-outline-variant/30">
                Auto-sends when SchreckNet reopens: {nextOpening.formatted}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar">
              {pendingLoading && pendingQueue.length === 0 && <div className="text-on-surface-variant text-sm text-center py-6">Loading...</div>}
              {!pendingLoading && pendingQueue.length === 0 && <div className="text-on-surface-variant text-sm text-center py-6">Nothing queued.</div>}
              {pendingQueue.map(m => (
                <div key={m.id} className="bg-surface-container-highest border border-outline-variant/30 rounded p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary truncate">{m.npc_name} <span className="text-on-surface-variant font-normal">➜ {m.char_name || m.user_display_name}</span></span>
                    <button onClick={() => cancelPendingMessage(m.id)} className="text-[10px] bg-error-container/20 text-error border border-error/30 px-2 py-1 rounded hover:bg-error/20 transition-colors shrink-0">Cancel</button>
                  </div>
                  <p className="text-sm text-on-surface break-words">{m.body || (m.attachment_id ? '📷 Attachment' : '')}</p>
                  <span className="text-[10px] text-on-surface-variant/50 font-system-code">{formatTime(m.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content (Canvas) */}
      <motion.main
        className={styles.chatWindow}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
      >
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
                      <Avatar userId={selectedContact.id} size="100%" style={{ width: '100%', height: '100%', borderRadius: 0 }} imgClassName="opacity-80" fallback={localSymlogo(selectedContact.clan) || '/img/ATT-logo(1).webp'} />
                    ) : selectedContact.type === 'npc' ? (
                      <Avatar npcId={selectedContact.id} size="100%" style={{ width: '100%', height: '100%', borderRadius: 0 }} imgClassName="opacity-80" fallback={localSymlogo(selectedContact.clan) || '/img/ATT-logo(1).webp'} />
                    ) : (
                      <GroupIconGlyph icon={selectedContact.icon} size={28} />
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
                  <>
                    <button onClick={openManageGroup} className="hover:text-primary transition-colors flex items-center gap-1 border border-outline-variant/50 px-2 py-1 rounded text-[10px] md:text-xs font-system-code uppercase tracking-widest bg-surface-container-low hover:bg-surface-variant/50">
                      <span className="material-symbols-outlined text-[14px] md:text-[16px]">settings</span>
                      <span className="hidden md:inline">Manage</span>
                    </button>
                    {/* The creator can't leave their own group (server rejects it —
                        they'd delete it via Manage instead), so Leave is hidden for
                        them but shown to every other member, managers included. */}
                    {selectedContact.created_by !== currentUser?.id && (
                      <button onClick={handleLeaveGroup} className="text-error/80 hover:text-error transition-colors flex items-center gap-1 border border-error/30 px-2 py-1 rounded text-[10px] md:text-xs font-system-code uppercase tracking-widest bg-error-container/10 hover:bg-error-container/30">
                        <span className="material-symbols-outlined text-[14px] md:text-[16px]">logout</span>
                        <span className="hidden md:inline">Leave</span>
                      </button>
                    )}
                  </>
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
                      <UnreadCount count={u.unread_count} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* System Warning (Offline / No Char) */}
            {!commsEnabled ? (
              <div className="w-full bg-error-container/20 border-b border-error/50 p-2 text-center flex items-center justify-center gap-2 z-10 shrink-0">
                <span className="material-symbols-outlined text-error text-sm">warning</span>
                <span className="font-system-code text-[11px] md:text-sm text-error tracking-widest uppercase font-bold">
                  {nextOpening
                    ? `SCHRECKNET OFFLINE : OPENS AGAIN ${nextOpening.day.toUpperCase()} AT ${nextOpening.time} (${nextOpening.date})`
                    : 'SCHRECKNET PROTOCOL OFFLINE'}
                </span>
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

                if (item.type === 'system') return (
                  <div key={item.id} className="w-full text-center text-[11px] md:text-[12px] font-system-code text-on-surface-variant/60 my-2 px-4">
                    {renderMessageBody(item.body)}
                  </div>
                );

                const isMineFn = (m) => selectedContact.type === 'user' ? m.sender_id === currentUser.id : (selectedContact.type === 'group' ? m.sender_id === currentUser.id : (isAdmin ? m.sender_id === 'npc' : m.sender_id === currentUser.id));
                const mine = isMineFn(item);
                const timeSinceSent = Date.now() - new Date(item.created_at).getTime();
                const canEditDelete = mine && timeSinceSent < 4 * 60 * 60 * 1000 && !String(item.id).startsWith('temp_');
                // Mirrors the backend's edit lock: once the other side has sent
                // anything after this message, it's been "answered" and can no
                // longer be edited (delete stays unaffected — same as the API).
                const answeredSince = mine && messages.some(m =>
                  new Date(m.created_at).getTime() > new Date(item.created_at).getTime() && !isMineFn(m)
                );
                const canEdit = canEditDelete && !answeredSince;
                const isGroupNotMine = selectedContact.type === 'group' && !mine;

                return (
                  <motion.div
                    key={item.id}
                    className={`flex gap-2 md:gap-3 max-w-[90%] md:max-w-[85%] ${mine ? 'self-end flex-row-reverse group' : 'self-start group'}`}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    {/* Avatar */}
                    {!mine ? (
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-sm md:rounded-full bg-surface-container-high border border-outline-variant flex-shrink-0 flex items-center justify-center overflow-hidden blood-glow opacity-80 mt-auto md:mt-0">
                        {(() => {
                          if (selectedContact.type === 'group') {
                            const sender = currentGroupMembers.find(m => m.id === item.sender_id);
                            return <Avatar userId={item.sender_id} size="100%" style={{ width: '100%', height: '100%', borderRadius: 0 }} imgClassName="" fallback={localSymlogo(item.sender_clan || sender?.clan) || '/img/ATT-logo(1).webp'} />;
                          } else if (item.sender_id === 'npc') {
                            return <Avatar npcId={selectedContact.id} size="100%" style={{ width: '100%', height: '100%', borderRadius: 0 }} imgClassName="" fallback={localSymlogo(selectedContact.clan) || '/img/ATT-logo(1).webp'} />;
                          } else {
                            return <Avatar userId={item.sender_id} size="100%" style={{ width: '100%', height: '100%', borderRadius: 0 }} imgClassName="" fallback={localSymlogo(selectedContact.clan) || '/img/ATT-logo(1).webp'} />;
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
                        <div
                          onClick={() => handleBubbleTap(item.id)}
                          onPointerDown={(e) => handleBubblePointerDown(e, item.id)}
                          onPointerUp={handleBubblePointerCancel}
                          onPointerLeave={handleBubblePointerCancel}
                          onPointerCancel={handleBubblePointerCancel}
                          onContextMenu={(e) => e.preventDefault()}
                          className={`relative chat-glass p-2 md:p-3 w-fit max-w-full shadow-[0_4px_12px_rgba(0,0,0,0.5)] select-none ${mine ? 'bg-blood-accent/90 text-white rounded-l-lg rounded-br-lg bubble-right border-l border-t border-b border-[#b01423]' : 'bg-surface-container-high border border-outline-variant/30 text-on-surface rounded-r-lg rounded-bl-lg bubble-left'}`}
                        >

                          {/* Attachment */}
                          {item.attachment_id && (
                            <div className="mb-2 relative rounded overflow-hidden border border-outline-variant/50 bg-black/50 group/img cursor-pointer w-fit max-w-full">
                              <ChatMedia attachmentId={item.attachment_id} />
                              <div className="absolute inset-0 bg-blood-accent/10 pointer-events-none mix-blend-overlay"></div>
                            </div>
                          )}

                          {/* Body */}
                          {item.body && <p className="text-[14px] md:text-[15px] leading-relaxed whitespace-pre-wrap break-words">{renderMessageBody(item.body)}</p>}
                        </div>
                      )}

                      {/* Reactions */}
                      {!String(item.id).startsWith('temp_') && (reactionsByMsgId[item.id]?.length > 0 || reactionPickerFor === item.id) && (
                        <div className={`flex items-center gap-1 flex-wrap ${mine ? 'justify-end' : 'justify-start'}`}>
                          {(reactionsByMsgId[item.id] || []).map(r => (
                            <button
                              key={r.emoji}
                              onClick={() => toggleReaction(item.id, r.emoji)}
                              title={r.reacted_by_me ? 'Remove your reaction' : 'React'}
                              className={`text-[11px] leading-none px-1.5 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${r.reacted_by_me ? 'bg-primary/20 border-primary text-primary' : 'bg-surface-container-highest border-outline-variant/40 text-on-surface-variant hover:border-primary/50'}`}
                            >
                              <ReactionGlyph value={r.emoji} size={12} />
                              <span className="font-system-code">{r.count}</span>
                            </button>
                          ))}
                          {reactionPickerFor === item.id && (
                            <div className="flex items-center gap-1 bg-surface-container-highest border border-outline-variant/40 rounded-full px-1.5 py-0.5 shadow-lg">
                              {QUICK_REACTIONS.map(e => (
                                <button
                                  key={e}
                                  onClick={() => toggleReaction(item.id, e)}
                                  className="text-[14px] leading-none hover:scale-125 transition-transform"
                                >
                                  <ReactionGlyph value={e} size={15} />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Meta Line (Time, Status, Actions) */}
                      <div className={`flex items-center gap-2 mt-0.5 ${mine ? 'mr-1 flex-row-reverse' : 'ml-1'}`}>
                        <span className="font-system-code text-[9px] md:text-[10px] text-on-surface-variant/60">{formatTime(item.created_at)}</span>

                        {item.edited && <span className="font-system-code text-[9px] text-on-surface-variant/40">(edited)</span>}

                        {item.status === 'queued' && (
                          <span className="font-system-code text-[9px] text-amber-400 uppercase tracking-widest flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[11px]">schedule_send</span> Pending
                          </span>
                        )}

                        {mine && (
                          <span className="text-[12px] md:text-[14px] text-primary flex items-center">
                            <StatusIcon msg={item} />
                          </span>
                        )}

                        {/* Action Buttons (Hover) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!String(item.id).startsWith('temp_') && (
                            <button
                              onClick={() => setReactionPickerFor(p => p === item.id ? null : item.id)}
                              title="React"
                              className="text-[10px] text-on-surface-variant hover:text-primary transition-colors"
                            >
                              React
                            </button>
                          )}
                          {canEditDelete && !editingMsgId && (
                            <>
                              {canEdit && (
                                <button onClick={() => { setEditingMsgId(item.id); setEditBody(item.body); }} className="text-[10px] text-on-surface-variant hover:text-primary transition-colors">Edit</button>
                              )}
                              <button onClick={() => handleDeleteMessage(item.id)} className="text-[10px] text-on-surface-variant hover:text-error transition-colors">Del</button>
                            </>
                          )}
                          {!mine && item.body && (
                            <button onClick={() => copyToClipboard(item.body)} className="text-[10px] text-on-surface-variant hover:text-primary transition-colors">Copy</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
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
            <div className={`${styles.messageInputForm} relative`} style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))', flexDirection: 'column', alignItems: 'stretch' }}>
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-[100%] left-1/2 -translate-x-1/2 md:left-auto md:right-4 md:translate-x-0 z-50 mb-2 shadow-[0_0_20px_rgba(0,0,0,0.8)] rounded-lg overflow-hidden border border-outline-variant w-[min(92vw,320px)]">
                  <React.Suspense fallback={
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary, #888)', background: '#111', fontSize: '13px' }}>
                      Loading emojis...
                    </div>
                  }>
                    <EmojiPicker
                      onEmojiClick={onEmojiClick}
                      theme="dark"
                      searchDisabled={false}
                      width="100%"
                      customEmojis={customClanEmojis}
                      categories={EMOJI_PICKER_CATEGORIES}
                    />
                  </React.Suspense>
                </div>
              )}

              <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-surface-container-lowest border border-outline-variant rounded-md p-1.5 md:p-2 focus-within:border-primary focus-within:shadow-[0_0_8px_rgba(180,15,31,0.2)] transition-all">

                {/* Attachments & Previews */}
                {/* Backend upload endpoint only accepts image/audio (see handleFileSelect) — video
                    is deliberately left out of the OS picker so it never gets offered just to be
                    rejected. ChatMedia can still render a video attachment if one exists from
                    elsewhere; this only narrows what a user can select here. */}
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,audio/*" onChange={handleFileSelect} />

                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!isCharActive || !canSend} className="p-2 text-on-surface-variant hover:text-primary transition-colors shrink-0 rounded hover:bg-surface-variant/30 disabled:opacity-30">
                  <span className="material-symbols-outlined text-[20px] md:text-[24px]">attach_file</span>
                </button>

                <div className="flex-1 flex flex-col min-w-0">
                  {attachment && (
                    <div className="absolute bottom-full left-0 mb-2 p-2 bg-surface-container border border-primary/20 rounded shadow-lg flex items-center gap-3 w-full">
                      {attachment.type.startsWith('image/') ? (
                        <img src={previewUrl} alt="Preview" className="h-12 w-12 object-cover rounded" />
                      ) : (
                        <div className="h-12 w-12 bg-surface-dim flex items-center justify-center rounded text-on-surface-variant">
                          <span className="material-symbols-outlined">attach_file</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <span className="text-xs truncate text-primary" title={attachment.name}>{attachment.name}</span>
                        <span className="text-[10px] text-on-surface-variant">{(attachment.size / 1024).toFixed(1)} KB</span>
                        {isUploading && (
                          <div className="w-full bg-surface-dim h-1 rounded overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                        )}
                      </div>
                      {!isUploading && (
                        <button type="button" onClick={clearAttachment} className="ml-2 text-on-surface-variant hover:text-error p-1 rounded-full transition-colors" title="Remove attachment">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      )}
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={showQueueOption ? "SchreckNet offline : Queue this reply or send now anyway..." : !canSend ? (nextOpening ? `SchreckNet offline : Opens again ${nextOpening.day} at ${nextOpening.time}` : "System Offline...") : (!isCharActive ? "Waiting for ST approval..." : "Transmit response...")}
                    className="w-full bg-transparent border-none text-on-surface font-system-code text-[13px] md:text-[14px] placeholder-on-surface-variant/40 focus:ring-0 resize-none py-2 px-1 max-h-32 custom-scrollbar break-words"
                    rows={1}
                    style={{ minHeight: '40px' }}
                    disabled={!canSend || !isCharActive || (isAdmin && selectedContact?.type === 'npc' && !selectedPlayerId)}
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => setShowEmojiPicker(val => !val)} disabled={!isCharActive || !canSend} className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded hover:bg-surface-variant/30 hidden md:flex disabled:opacity-30">
                    <span className="material-symbols-outlined text-[20px] md:text-[24px]">mood</span>
                  </button>
                  {showQueueOption && (
                    <button
                      type="button"
                      onClick={() => doSend({ queue: true })}
                      disabled={!isCharActive || sendingRef.current || (!newMessage.trim() && !attachment) || !selectedPlayerId}
                      title="Queue — sends automatically when SchreckNet reopens"
                      className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-black transition-colors rounded shadow-[0_0_8px_rgba(245,158,11,0.15)] group flex items-center justify-center h-10 w-10 disabled:opacity-30 disabled:hover:bg-amber-500/10 disabled:hover:text-amber-400"
                    >
                      <span className="material-symbols-outlined text-[18px] md:text-[20px]">schedule_send</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!canSend || !isCharActive || sendingRef.current || (!newMessage.trim() && !attachment) || (isAdmin && selectedContact?.type === 'npc' && !selectedPlayerId)}
                    title={showQueueOption ? 'Send now anyway (bypasses the offline gate)' : undefined}
                    className="p-2 bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-on-primary transition-colors rounded shadow-[0_0_8px_rgba(255,179,174,0.1)] group flex items-center justify-center h-10 w-10 disabled:opacity-30 disabled:hover:bg-primary/10 disabled:hover:text-primary"
                  >
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
      </motion.main>
    </div>
  );
}