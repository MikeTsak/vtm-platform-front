// src/components/ChatSystem.jsx
import React, { useState, useEffect, useContext, useRef, useMemo, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { getPushSettings, updatePushSettings, subscribeToWebPush, getPushUnsupportedReason } from '../../utils/push';
import { socket } from '../../api/liveSession';
import { symlogo as localSymlogo, CLAN_HEX as CLAN_COLORS, CLAN_PALETTES, clanTint } from '../../data/clans';
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

// History rows carry the quoted message as flat reply_* columns (one shape
// for all three chat kinds; the author is labelled at render time, relative
// to whoever is viewing). reply_found is null when the original was deleted.
const toReply = (m) => (m.reply_to_id ? {
  id: m.reply_to_id,
  missing: !m.reply_found,
  body: m.reply_body,
  attachment_id: m.reply_attachment_id,
  sender_id: m.reply_sender_id,
  sender_name: m.reply_sender_name,
  from_side: m.reply_from_side,
} : null);

const SWIPE_REPLY_PX = 60;

// A message row that, on touch screens, can be dragged to the right to
// reply (the usual messenger gesture). It springs back on release; a reply
// icon fades in behind it as it crosses the threshold. `dragDirectionLock`
// keeps a vertical scroll from turning into a sideways drag.
const SwipeRow = ({ enabled, onReply, onSwipeStart, children, className, ...rest }) => {
  const x = useMotionValue(0);
  const iconOpacity = useTransform(x, [0, SWIPE_REPLY_PX], [0, 1]);
  const iconScale = useTransform(x, [0, SWIPE_REPLY_PX], [0.5, 1]);
  return (
    <motion.div
      {...rest}
      className={`${className} relative`}
      style={{ x }}
      drag={enabled ? 'x' : false}
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.5 }}
      dragSnapToOrigin
      onDragStart={onSwipeStart}
      onDragEnd={(e, info) => {
        if (info.offset.x > SWIPE_REPLY_PX) {
          navigator.vibrate?.(10);
          onReply();
        }
      }}
    >
      {enabled && (
        <motion.span
          aria-hidden="true"
          style={{ opacity: iconOpacity, scale: iconScale }}
          className="material-symbols-outlined absolute -left-9 top-1/2 -translate-y-1/2 text-primary text-[22px] pointer-events-none"
        >
          reply
        </motion.span>
      )}
      {children}
    </motion.div>
  );
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
  titles: u.titles || [],
  court_status: u.court_status ?? null,
  unread_count: u.unread_count || 0,
  last_message_at: u.last_message_at ? new Date(u.last_message_at).getTime() : 0
});

const asNpcContact = (n) => ({
  type: 'npc',
  id: n.id,
  name: n.name,
  clan: n.clan,
  image_url: n.image_url ?? null,
  titles: n.titles || [],
  court_status: n.court_status ?? null,
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

/* Conversation themes. Each paints the conversation background (`bg`) and
   "my" bubbles (`color`, the Messenger convention); bubble text flips to
   black on light accents. Atmospheres are in-universe scenes, clans use
   their site palette, sects a single colour. */
const withAlpha = (hex, a) => `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
const BASE_BG = 'linear-gradient(180deg, #0d0c11 0%, #07060a 100%)';
const glowBg = (top, bottom) => `radial-gradient(120% 70% at 100% 0%, ${withAlpha(top, 0.3)}, transparent 65%), radial-gradient(110% 70% at 0% 100%, ${withAlpha(bottom, 0.24)}, transparent 65%), ${BASE_BG}`;
const ATMOSPHERES = [
  { key: 'Elysium', color: '#c9a646', icon: 'account_balance', bg: 'radial-gradient(90% 60% at 50% 0%, #c9a64633, transparent 70%), linear-gradient(160deg, #1d1710 0%, #0b0907 100%)' },
  { key: 'Blood Moon', color: '#b3121f', icon: 'dark_mode', bg: 'radial-gradient(55% 40% at 80% 8%, #e0303d66, #7a0a1233 45%, transparent 75%), linear-gradient(180deg, #16060a 0%, #060204 100%)' },
  { key: 'Catacombs', color: '#9c8f74', icon: 'skull', bg: 'radial-gradient(80% 60% at 50% 110%, #5a4e3844, transparent 70%), repeating-linear-gradient(0deg, #ffffff05 0 2px, transparent 2px 38px), linear-gradient(180deg, #12100c 0%, #080706 100%)' },
  { key: 'Neon Rack', color: '#e0249a', icon: 'nightlife', bg: 'radial-gradient(70% 50% at 0% 0%, #e0249a40, transparent 70%), radial-gradient(70% 50% at 100% 100%, #22d3ee33, transparent 70%), linear-gradient(180deg, #0b0612 0%, #05030a 100%)' },
  { key: 'Masquerade', color: '#7b4bb7', icon: 'theater_comedy', bg: 'radial-gradient(80% 55% at 100% 0%, #7b4bb744, transparent 70%), radial-gradient(60% 45% at 0% 100%, #c9a64626, transparent 70%), linear-gradient(180deg, #0e0914 0%, #060409 100%)' },
  { key: 'Midnight Rain', color: '#3b82c4', icon: 'rainy', bg: 'repeating-linear-gradient(105deg, #ffffff06 0 1px, transparent 1px 16px), radial-gradient(90% 60% at 50% 0%, #3b82c433, transparent 70%), linear-gradient(180deg, #0a0f16 0%, #05070b 100%)' },
];
const SECT_THEMES = { Camarilla: '#3a5fb0', Anarch: '#c0392b', Sabbat: '#7d1d3f' };
const THEME_GROUPS = ['Atmospheres', 'Clans', 'Sects'];
const CHAT_THEMES = [
  ...ATMOSPHERES.map(t => ({ ...t, group: 'Atmospheres' })),
  ...Object.keys(CLAN_COLORS).map(key => ({ key, group: 'Clans', color: clanTint(key), bg: glowBg(CLAN_PALETTES[key][1], CLAN_PALETTES[key][0]) })),
  ...Object.entries(SECT_THEMES).map(([key, color]) => ({ key, group: 'Sects', color, bg: glowBg(color, color) })),
];
const themeFor = (key) => CHAT_THEMES.find(t => t.key === key) || null;

// Hold-to-grow conversation emoji: rendered size per stored emoji_size, and
// the hold timeline. It reaches full size at GROW (a tap of haptics marks the
// sweet spot), wobbles from WARN as a warning, and pops (cancelled, like
// Messenger) at POP, so full size can be sent anywhere in GROW..POP.
const EMOJI_PX = [0, 44, 72, 104];
const EMOJI_GROW_MS = 1200;
const EMOJI_WARN_MS = 3200;
const EMOJI_POP_MS = 4200;

// Admin in an NPC chat while SchreckNet is closed: tapping send queues the
// message until it reopens; holding send this long sends it now instead.
const SEND_NOW_HOLD_MS = 600;

// Phones: Return adds a line and the send button sends (Messenger/WhatsApp);
// with a mouse + keyboard, Enter sends and Shift+Enter adds a line.
const IS_TOUCH = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
const textOn = (hex) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) > 150 ? '#111' : '#fff';
};

/* Court standing as the Court page shows it: title(s) and Status dots. */
const StatusLine = ({ titles, status, className = '' }) => {
  const dots = Math.max(0, Math.min(Number(status) || 0, 5));
  if (!titles?.length && !dots) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      {titles?.length > 0 && <span className="truncate">{titles.join(' \u00b7 ')}</span>}
      {dots > 0 && (
        <span className="inline-flex gap-0.5 shrink-0" title={`Status ${dots}`} aria-label={`Status ${dots}`}>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < dots ? 'bg-primary' : 'border border-outline-variant'}`} />
          ))}
        </span>
      )}
    </span>
  );
};

/* Green dot on an avatar while that person has the site open. The avatar
   itself clips (overflow-hidden), so this sits on a relative wrapper. */
const OnlineDot = ({ online }) => (online ? (
  <span title="Online" aria-label="Online" className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-surface-container rounded-full" />
) : null);

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
const ChatMedia = ({ attachmentId, thumb = false }) => {
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

  if (thumb) {
    if (loading) return <div className="w-full h-full bg-surface-variant/30 animate-pulse" />;
    if (error) return <div className="w-full h-full flex items-center justify-center text-error"><span className="material-symbols-outlined text-[22px]">broken_image</span></div>;
    const open = () => window.open(mediaInfo?.url, '_blank');
    if (mediaInfo?.mime?.startsWith('audio/')) {
      return <button type="button" onClick={open} aria-label="Open audio" className="w-full h-full flex items-center justify-center text-on-surface-variant"><span className="material-symbols-outlined text-[28px]">graphic_eq</span></button>;
    }
    if (mediaInfo?.mime?.startsWith('video/')) {
      return <video src={mediaInfo.url} preload="metadata" muted playsInline onClick={open} className="w-full h-full object-cover cursor-pointer" />;
    }
    return <img src={mediaInfo?.url} alt="Attachment" loading="lazy" onClick={open} className="w-full h-full object-cover cursor-pointer" />;
  }

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
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const chatParam = searchParams.get('c');
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

  // History is paged: the latest page on open, older pages as the list is
  // scrolled up (Messenger-style), or everything back to a message when
  // jumping to a search result / quote.
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const prependAnchorRef = useRef(null);
  const pendingJumpRef = useRef(null);

  // Shared per-conversation settings, delivered with each history page.
  const [convSettings, setConvSettings] = useState({ theme: null, emoji: null });

  // Details panel (search, media, members, theme): search + media state.
  const [panelPicker, setPanelPicker] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [mediaList, setMediaList] = useState({ items: [], hasMore: false, loaded: false });

  // EDIT/DELETE STATES
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editBody, setEditBody] = useState('');

  // Quote-reply: the message the composer is currently replying to (same
  // shape as toReply()), and a message briefly highlighted after jumping
  // to it from a quote.
  const [replyTo, setReplyTo] = useState(null);
  const [flashMsgId, setFlashMsgId] = useState(null);

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
  // Idempotency key for the draft being sent. It's kept when a send fails, so
  // re-sending the same text reuses it: if the first request actually reached
  // the server, the server replays that message instead of storing it again.
  const sendKeyRef = useRef(null);
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
        toast.error('Failed to update group picture.');
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
      toast.error('Failed to rename group');
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
    } catch (e) { toast.error('Failed to add member'); }
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
    } catch (e) { toast.error('Failed to remove member'); }
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
      closeChat();
      fetchContacts();
    } catch (e) { toast.error('Failed to delete group'); }
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
      closeChat();
      fetchContacts();
    } catch (e) { toast.error('Failed to leave group'); }
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
      toast.error("Failed to delete message. It may be too old or you lack permission.");
    }
  };

  const submitEditMessage = async () => {
    if (!editBody.trim()) return;
    try {
      await api.put(`/chat/messages/${editingMsgId}`, { body: editBody, table: reactionTable });
      setMessages(prev => prev.map(m => m.id === editingMsgId ? { ...m, body: editBody, edited: true } : m));
      setEditingMsgId(null);
    } catch (e) {
      toast.error(formatApiError(e, "Failed to edit message. It may be too old or you lack permission."));
    }
  };


  const [notifSupported] = useState(typeof window !== 'undefined' && 'Notification' in window);
  const [notifOn, setNotifOn] = useState(false);
  const [pushSettingsLoading, setPushSettingsLoading] = useState(true);

  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);
  const updateHeightRef = useRef(() => { });

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
    updateHeightRef.current = updateHeight;

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

  // The SchreckNet banner above us hides on mobile while a chat is open, which
  // moves our top edge without any resize event: measure again.
  useLayoutEffect(() => { updateHeightRef.current(); }, [selectedContact]);

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

  // After older messages are prepended keep the viewport on what the user was
  // reading, and finish a pending jump once its message is in the DOM.
  useLayoutEffect(() => {
    const el = messagesListRef.current;
    const anchor = prependAnchorRef.current;
    if (el && anchor) {
      // .messageList has scroll-behavior: smooth; restoring must be instant.
      el.style.scrollBehavior = 'auto';
      el.scrollTop = el.scrollHeight - anchor.height + anchor.top;
      el.style.scrollBehavior = '';
      prependAnchorRef.current = null;
    }
    const jump = pendingJumpRef.current;
    if (jump && document.getElementById(`chat-msg-${jump}`)) {
      pendingJumpRef.current = null;
      revealMessage(jump);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

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
    if (pushSettingsLoading) return;
    if (!notifSupported) { alert(getPushUnsupportedReason()); return; }

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
  // Content fingerprint of the last history applied, so edits, deletes and
  // queued->sent changes (none of which add a newer message) still re-render.
  const lastSigRef = useRef('');
  // Newest inbound message already marked read in the open thread.
  const lastReadTsRef = useRef(0);
  // load() only needs users for a notification title; reading it through a
  // ref keeps every contacts refresh from re-fetching the open thread.
  const usersRef = useRef([]);
  usersRef.current = users;

  useEffect(() => {
    loadSeqRef.current += 1;
    initialSyncRef.current = true;
    lastTsRef.current = 0;
    lastSigRef.current = '';
    lastReadTsRef.current = 0;
    pendingJumpRef.current = null;
    setHasMore(false);
    setConvSettings({ theme: null, emoji: null });
    setSearchQ('');
    setSearchResults(null);
    setMediaList({ items: [], hasMore: false, loaded: false });
    setPanelPicker(null);
    setMessages([]);
    setNpcConvos([]);
    setReplyTo(null);
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

  // Who has the site open (see realtime.js). `admins` are the Storytellers,
  // who answer as NPCs, so an NPC counts as reachable while one is online.
  const [presence, setPresence] = useState({ online: new Set(), admins: new Set() });
  const [connected, setConnected] = useState(socket.connected);
  useEffect(() => {
    const load = () => socket.emit('presence:get', (snap) => {
      if (snap) setPresence({ online: new Set(snap.online.map(Number)), admins: new Set(snap.admins.map(Number)) });
    });
    const onUpdate = ({ userId, online, admin }) => setPresence(prev => {
      const next = { online: new Set(prev.online), admins: new Set(prev.admins) };
      const id = Number(userId);
      if (online) {
        next.online.add(id);
        if (admin) next.admins.add(id);
      } else {
        next.online.delete(id);
        next.admins.delete(id);
      }
      return next;
    });
    const onConnect = () => { setConnected(true); load(); };
    const onDisconnect = () => setConnected(false);
    if (socket.connected) load();
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('presence:update', onUpdate);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('presence:update', onUpdate);
    };
  }, []);
  const isUserOnline = (id) => presence.online.has(Number(id));
  const storytellerOnline = [...presence.admins].some(id => id !== Number(currentUser?.id));

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
      toast.error('Failed to cancel queued message.');
    }
  };

  /* Reactions (double-tap-to-like + emoji react) */
  // Double-tap-to-like is a thumbs up, not a heart: it reads as
  // acknowledgement rather than affection, which is what a tap actually means.
  const LIKE_EMOJI = '👍';
  const convEmoji = convSettings.emoji || LIKE_EMOJI;

  // The last slot is the player's own clan crest in place of the heart.
  // When an admin is in an NPC conversation (acting as that NPC), the last slot
  // displays the NPC's clan crest. Otherwise, admins have no character loaded
  // and clanless characters have no crest, falling back to the ankh.
  const mySigil = useMemo(() => {
    if (isAdmin && selectedContact?.type === 'npc') {
      const npcClan = selectedContact?.clan || npcs.find(n => n.id === selectedContact?.id)?.clan;
      return (npcClan && clanToken(npcClan)) || ANKH;
    }
    if (isAdmin) return ANKH;
    return clanToken(myChar?.clan || myChar?.sheet?.clan) || ANKH;
  }, [isAdmin, selectedContact, npcs, myChar]);
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
  const [fullReactionPickerFor, setFullReactionPickerFor] = useState(null);
  const [viewingReactionsMsg, setViewingReactionsMsg] = useState(null);
  const [selectedReactionTab, setSelectedReactionTab] = useState('all');
  const lastTapRef = useRef({});
  const holdTimerRef = useRef(null);
  const holdFiredRef = useRef(false);
  const pillHoldTimerRef = useRef(null);
  const pillHoldFiredRef = useRef(false);

  useEffect(() => {
    if (!reactionPickerFor && !fullReactionPickerFor) return;
    const handleOutside = (e) => {
      if (e.target.closest?.('[data-reaction-ui]')) return;
      setReactionPickerFor(null);
      setFullReactionPickerFor(null);
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [reactionPickerFor, fullReactionPickerFor]);

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
    setFullReactionPickerFor(null);
  }, [reactionTable]);

  const handlePillPointerDown = useCallback((item, emoji) => {
    pillHoldFiredRef.current = false;
    pillHoldTimerRef.current = setTimeout(() => {
      pillHoldFiredRef.current = true;
      setSelectedReactionTab(emoji);
      setViewingReactionsMsg(item);
    }, 450);
  }, []);

  const handlePillPointerUp = useCallback((item, emoji) => {
    clearTimeout(pillHoldTimerRef.current);
    if (pillHoldFiredRef.current) {
      pillHoldFiredRef.current = false;
      return;
    }
    toggleReaction(item.id, emoji);
  }, [toggleReaction]);

  const handlePillPointerCancel = useCallback(() => {
    clearTimeout(pillHoldTimerRef.current);
    pillHoldFiredRef.current = false;
  }, []);

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
      toggleReaction(msgId, convEmoji);
    } else {
      lastTapRef.current[msgId] = now;
    }
  }, [toggleReaction, convEmoji]);

  // Long-press (500ms hold) opens the quick-reaction picker without toggling a
  // reaction. Works for both touch and mouse via the unified Pointer Events API.
  // On touch screens a hold opens the action sheet (reactions + Reply, Copy,
  // Edit, Delete...), since the hover action row never shows there.
  const [actionSheetMsg, setActionSheetMsg] = useState(null);
  const handleBubblePointerDown = useCallback((e, item) => {
    if (String(item.id).startsWith('temp_')) return;
    holdFiredRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      holdFiredRef.current = true;
      if (isMobile) {
        navigator.vibrate?.(10);
        setActionSheetMsg(item);
      } else {
        setReactionPickerFor(p => (p === item.id ? null : item.id));
      }
    }, 500);
  }, [isMobile]);

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

  const PAGE_SIZE = 50;
  const byTime = (a, b) => (new Date(a.created_at) - new Date(b.created_at)) || (a.id - b.id);

  // One page of the open conversation, normalised to what the list renders.
  // `qs` carries the paging params (see back/utils/chatConversation.js).
  const fetchHistory = async (qs) => {
    const c = selectedContact;
    let res;
    let msgs;
    if (c.type === 'group') {
      res = await api.get(`/chat/groups/${c.id}/history?${qs}`);
      msgs = (res.data.messages || []).map(m => ({
        id: m.id, body: m.body, created_at: m.created_at, sender_id: m.sender_id,
        sender_name: m.char_name || m.display_name, sender_clan: m.clan,
        attachment_id: m.attachment_id, edited: m.edited, emoji_size: m.emoji_size, type: m.type, reply: toReply(m)
      }));
    } else if (c.type === 'user') {
      res = await api.get(`/chat/history/${c.id}?${qs}`);
      msgs = (res.data.messages || []).map(m => ({
        id: m.id, body: m.body, created_at: m.created_at,
        read_at: m.read_at, delivered_at: m.delivered_at,
        sender_id: m.sender_id,
        attachment_id: m.attachment_id, edited: m.edited, emoji_size: m.emoji_size, reply: toReply(m)
      }));
    } else if (isAdmin) {
      res = await api.get(`/admin/chat/npc-history/${c.id}/${selectedPlayerId}?${qs}`);
      msgs = (res.data.messages || []).map(m => ({
        id: m.id, body: m.body, created_at: m.created_at, sender_id: m.from_side === 'npc' ? 'npc' : selectedPlayerId, _from: m.from_side,
        attachment_id: m.attachment_id, edited: m.edited, emoji_size: m.emoji_size, status: m.status, reply: toReply(m)
      }));
    } else {
      res = await api.get(`/chat/npc-history/${c.id}?${qs}`);
      msgs = (res.data.messages || []).map(m => ({
        id: m.id, body: m.body, created_at: m.created_at,
        sender_id: m.from_side === 'user' ? currentUser.id : 'npc', _from: m.from_side,
        attachment_id: m.attachment_id, edited: m.edited, emoji_size: m.emoji_size, reply: toReply(m)
      }));
    }
    msgs.sort(byTime);
    return { msgs, hasMore: !!res.data.has_more, settings: res.data.settings || null };
  };

  // Prepends messages older than what's loaded (deduplicated).
  const prependMessages = (older) => setMessages(prev => {
    const ids = new Set(prev.map(m => m.id));
    return [...older.filter(m => !ids.has(m.id)), ...prev];
  });

  // Ref, not the state: several scroll events can land before a re-render.
  const loadingOlderRef = useRef(false);
  const loadOlder = async () => {
    if (!hasMore || loadingOlderRef.current || !selectedContact) return;
    const oldest = messages.find(m => !String(m.id).startsWith('temp_'));
    if (!oldest) return;
    const seq = loadSeqRef.current;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const page = await fetchHistory(`limit=${PAGE_SIZE}&before=${oldest.id}`);
      if (loadSeqRef.current !== seq) return;
      const el = messagesListRef.current;
      if (el) prependAnchorRef.current = { height: el.scrollHeight, top: el.scrollTop };
      prependMessages(page.msgs);
      setHasMore(page.hasMore);
    } catch (e) {
      toast.error('Could not load older messages.');
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  };

  const handleListScroll = (e) => {
    const el = e.currentTarget;
    userScrollingRef.current = !isNearBottom(el);
    setShowScrollBtn(!isNearBottom(el, 300));
    if (el.scrollTop < 150) loadOlder();
  };

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
          const page = await fetchHistory(`limit=${PAGE_SIZE}`);
          msgs = page.msgs;
          if (loadSeqRef.current === mySeq) {
            if (isInitialLoad) setHasMore(page.hasMore);
            if (page.settings) {
              setConvSettings(prev => (prev.theme === page.settings.theme && prev.emoji === page.settings.emoji ? prev : page.settings));
            }
          }
          const newestTs = msgs.reduce((t, m) => Math.max(t, new Date(m.created_at).getTime()), 0);

          hasNewMessages = newestTs > lastTsRef.current;
          const sig = msgs.map(m => `${m.id}:${m.edited ? 1 : 0}:${m.status || ''}:${m.read_at ? 1 : 0}${m.delivered_at ? 1 : 0}:${m.body}`).join('|');
          const contentChanged = sig !== lastSigRef.current;

          if (loadSeqRef.current !== mySeq) return;

          const newestInbound = msgs.reduce((t, m) => (isInbound(m) ? Math.max(t, new Date(m.created_at).getTime()) : t), 0);
          if (isInitialLoad) {
            lastReadTsRef.current = newestInbound;
          } else if (newestInbound > lastReadTsRef.current && !document.hidden) {
            lastReadTsRef.current = newestInbound;
            markThreadReadRef.current(selectedContact, selectedPlayerId);
          }

          if (isInitialLoad || hasNewMessages || contentChanged) {
            lastSigRef.current = sig;
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
                  title = isAdmin && selectedPlayerId ? `${selectedContact.name} ↔ ${usersRef.current.find(u => u.id === selectedPlayerId)?.char_name || 'Kindred'}` : selectedContact.name;
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
              // Older pages loaded by scrolling up stay; the latest page replaces the rest.
              const first = msgs[0];
              const older = first ? prev.filter(m => !String(m.id).startsWith('temp_') && byTime(m, first) < 0) : [];
              return [...older, ...msgs, ...localOnly];
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
  }, [selectedContact, selectedPlayerId, isAdmin, isAuthenticated, currentUser?.id, threadKey, isInbound, notify, socketRefreshTick, isTabVisible]);

  /* --- File Handling --- */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('audio/')) {
      toast.error('Only images and audio files are allowed');
      return;
    }

    const MAX_MB = 50;
    const MAX_BYTES = MAX_MB * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      toast.error(`File size too large (max ${MAX_MB}MB)`);
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
  // `text` sends something other than the composer (the conversation emoji).
  const doSend = async ({ queue = false, text, emojiSize = null } = {}) => {
    if (!canSend) return;
    // The conversation emoji button sends `text` on its own: the typed draft
    // and any picked attachment stay in the composer.
    const fromComposer = text == null;
    const body = (fromComposer ? newMessage : text).trim();
    const file = fromComposer ? attachment : null;

    if ((!body && !file) || !selectedContact) return;
    if (isAdmin && selectedContact.type === 'npc' && !selectedPlayerId) return;
    if (sendingRef.current) return;

    sendingRef.current = true;
    let attachmentId = null;
    const sig = [threadKey, body, file?.name, file?.size, replyTo?.id, queue, emojiSize].join('|');
    if (sendKeyRef.current?.sig !== sig) sendKeyRef.current = { sig, key: crypto.randomUUID() };
    const idem = { headers: { 'Idempotency-Key': sendKeyRef.current.key } };

    try {
      if (file) {
        setIsUploading(true);
        setUploadProgress(0);
        const formData = new FormData();
        formData.append('file', file);

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
          toast.error(formatApiError(err, 'Failed to upload file. Check file size and type.'));
          sendingRef.current = false;
          setIsUploading(false);
          return;
        }
      }

      const payload = { body, attachment_id: attachmentId, reply_to_id: replyTo?.id || null, emoji_size: emojiSize };
      let newMsg = null;

      if (selectedContact.type === 'group') {
        const { data } = await api.post(`/chat/groups/${selectedContact.id}/messages`, payload, idem);
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
        const { data } = await api.post('/chat/messages', { recipient_id: selectedContact.id, ...payload }, idem);
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
          const { data } = await api.post('/admin/chat/npc/messages', { npc_id: selectedContact.id, user_id: selectedPlayerId, queue, ...payload }, idem);
          if (data && data.message) {
            newMsg = {
              id: data.message.id,
              body: data.message.body,
              created_at: data.message.created_at,
              sender_id: 'npc',
              _from: 'npc',
              attachment_id: data.message.attachment_id,
              emoji_size: data.message.emoji_size,
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
          const { data } = await api.post('/chat/npc/messages', { npc_id: selectedContact.id, ...payload }, idem);
          if (data && data.message) {
            newMsg = {
              id: data.message.id,
              body: data.message.body,
              created_at: data.message.created_at,
              sender_id: currentUser.id,
              _from: 'user',
              attachment_id: data.message.attachment_id,
              emoji_size: data.message.emoji_size
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
        // Show the quote right away; the next history poll replaces this
        // with the server's own copy of the reply preview.
        if (replyTo) newMsg = { ...newMsg, reply: replyTo };
        // A poll or socket refresh that ran while this POST was in flight may
        // already have added the server's copy; appending again showed it twice.
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        const msgTime = new Date(newMsg.created_at).getTime();
        if (msgTime > lastTsRef.current) {
          lastTsRef.current = msgTime;
        }
      }

      sendKeyRef.current = null;
      setReplyTo(null);
      if (fromComposer) {
        setNewMessage('');
        setShowEmojiPicker(false);
        clearAttachment();
        setDrafts(prev => ({ ...prev, [threadKey]: '' }));
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }

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

  // Hold the conversation emoji to inflate it: the longer the hold the bigger
  // it's sent (1-3); see EMOJI_GROW/WARN/POP_MS for the timeline.
  const [emojiHold, setEmojiHold] = useState('idle'); // 'idle' | 'growing' | 'warning' | 'popped'
  const holdStartRef = useRef(null);
  const holdTimersRef = useRef([]);
  const clearHoldTimers = () => {
    holdTimersRef.current.forEach(clearTimeout);
    holdTimersRef.current = [];
  };
  useEffect(() => () => clearHoldTimers(), []);
  const startEmojiHold = (e) => {
    if (e.button > 0) return;
    clearHoldTimers();
    holdStartRef.current = Date.now();
    setEmojiHold('growing');
    holdTimersRef.current = [
      setTimeout(() => navigator.vibrate?.(8), EMOJI_GROW_MS),
      setTimeout(() => setEmojiHold('warning'), EMOJI_WARN_MS),
      setTimeout(() => {
        holdStartRef.current = null;
        navigator.vibrate?.([20, 40, 20]);
        setEmojiHold('popped');
        holdTimersRef.current.push(setTimeout(() => setEmojiHold('idle'), 350));
      }, EMOJI_POP_MS),
    ];
  };
  const endEmojiHold = (send) => {
    const start = holdStartRef.current;
    if (start == null) return; // popped, or never started
    clearHoldTimers();
    holdStartRef.current = null;
    setEmojiHold('idle');
    if (!send) return;
    const held = Date.now() - start;
    doSend({ text: convEmoji, emojiSize: held < 300 ? 1 : held < EMOJI_GROW_MS * 0.75 ? 2 : 3, queue: showQueueOption });
  };

  // Offline admin send button: 'holding' until SEND_NOW_HOLD_MS, then 'armed'
  // (release sends now). The ref mirrors the phase for the pointer handlers.
  const [sendHold, setSendHold] = useState('idle'); // 'idle' | 'holding' | 'armed'
  const sendHoldRef = useRef('idle');
  const sendHoldTimerRef = useRef(null);
  const setSendHoldPhase = (phase) => {
    sendHoldRef.current = phase;
    setSendHold(phase);
  };
  useEffect(() => () => clearTimeout(sendHoldTimerRef.current), []);
  const startSendHold = (e) => {
    if (e.button > 0) return;
    clearTimeout(sendHoldTimerRef.current);
    setSendHoldPhase('holding');
    sendHoldTimerRef.current = setTimeout(() => {
      navigator.vibrate?.(15);
      setSendHoldPhase('armed');
    }, SEND_NOW_HOLD_MS);
  };
  const endSendHold = (send) => {
    const phase = sendHoldRef.current;
    if (phase === 'idle') return;
    clearTimeout(sendHoldTimerRef.current);
    setSendHoldPhase('idle');
    if (send) doSend({ queue: phase !== 'armed' });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !IS_TOUCH) {
      e.preventDefault();
      doSend({ queue: showQueueOption });
    } else if (e.key === 'Escape' && replyTo) {
      setReplyTo(null);
    }
  };

  const startReply = (item) => {
    setReplyTo({
      id: item.id,
      body: item.body,
      attachment_id: item.attachment_id,
      sender_id: item.sender_id,
      sender_name: item.sender_name,
      from_side: item._from,
    });
    setEditingMsgId(null);
    setReactionPickerFor(null);
    setFullReactionPickerFor(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  // Who wrote the quoted message, from the viewer's point of view.
  const replyAuthor = (r) => {
    if (!r || !selectedContact) return '';
    if (selectedContact.type === 'npc') {
      if (r.from_side === 'npc') return selectedContact.name;
      if (!isAdmin) return 'You';
      const p = users.find(u => u.id === selectedPlayerId);
      return p?.char_name || p?.display_name || 'Kindred';
    }
    if (r.sender_id === currentUser?.id) return 'You';
    if (selectedContact.type === 'user') return selectedContact.char_name || selectedContact.display_name;
    return r.sender_name || 'Someone';
  };

  const revealMessage = (id) => {
    const el = document.getElementById(`chat-msg-${id}`);
    if (!el) return false;
    userScrollingRef.current = true; // keep the auto scroll-to-bottom from undoing the jump
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashMsgId(id);
    setTimeout(() => setFlashMsgId(f => (f === id ? null : f)), 1600);
    return true;
  };

  // Scrolls to a message; when it's further back than what's loaded, first
  // loads everything between it and the oldest loaded page.
  const scrollToMessage = async (id) => {
    if (revealMessage(id)) return;
    const oldest = messages.find(m => !String(m.id).startsWith('temp_'));
    if (!oldest || !selectedContact) return;
    const seq = loadSeqRef.current;
    try {
      const page = await fetchHistory(`from=${id}&before=${oldest.id}`);
      if (loadSeqRef.current !== seq) return;
      if (!page.msgs.some(m => m.id === id)) {
        toast.error('Could not find that message.');
        return;
      }
      pendingJumpRef.current = id;
      prependMessages(page.msgs);
    } catch (e) {
      toast.error('Could not load that message.');
    }
  };

  const replySnippet = (r) => {
    if (r.missing) return <span className="italic opacity-70">Original message was deleted</span>;
    if (r.body) return renderMessageBody(r.body);
    if (r.attachment_id) {
      return (
        <span className="inline-flex items-center gap-1 italic opacity-80">
          <span className="material-symbols-outlined text-[14px]">image</span> Attachment
        </span>
      );
    }
    return null;
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
    } catch (e) { toast.error('Failed to create group'); }
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
        ? <>{selectedContact.name} <NPCTag /> <span className="material-symbols-outlined text-[16px] align-middle">arrow_forward</span> {selUser.char_name || selUser.display_name}</>
        : <>{selectedContact.name} <NPCTag /></>;
    }
    if (selectedContact.type === 'npc') return <>{selectedContact.name} <NPCTag /></>;
    return <>{selectedContact.name}</>;
  })();

  // The open chat lives in the URL (?c=u-12 / g-3 / n-5) so the phone's back
  // button closes it instead of leaving SchreckNet. Clicks only change the
  // URL; the effect below does the actual selection.
  const contactKey = (c) => (c ? `${c.type[0]}-${c.id}` : null);
  const openChat = (contact) => {
    const key = contactKey(contact);
    if (key === chatParam) return;
    // Switching straight from one chat to another (desktop) replaces, so
    // back doesn't walk through every chat that was ever opened.
    setSearchParams({ c: key }, { replace: !!chatParam, state: { chat: true } });
  };
  const closeChat = () => {
    // Pop the chat entry, plus the details panel entry when it's open on top.
    if (location.state?.chat) navigate(location.state?.panel ? -2 : -1);
    else setSearchParams({}, { replace: true });
  };

  // The details panel is ?p=info on top of the chat, so back closes it first.
  const detailsOpen = searchParams.get('p') === 'info';
  const openDetails = () => setSearchParams({ c: chatParam, p: 'info' }, { state: { chat: !!location.state?.chat, panel: true } });
  const closeDetails = () => {
    if (location.state?.panel) navigate(-1);
    else setSearchParams({ c: chatParam }, { replace: true, state: { chat: !!location.state?.chat } });
  };

  // Header dot/status per chat kind: the person for DMs, a Storyteller for a
  // player's NPC chat, the selected player for an admin's NPC chat, and a
  // member count for groups.
  const headerOnline = !selectedContact ? false
    : selectedContact.type === 'user' ? isUserOnline(selectedContact.id)
      : selectedContact.type === 'npc' ? (isAdmin ? !!selectedPlayerId && isUserOnline(selectedPlayerId) : storytellerOnline)
        : false;
  const headerStatus = (() => {
    if (!selectedContact) return null;
    if (selectedContact.type === 'group') {
      const on = headerGroupMembers.filter(m => isUserOnline(m.id)).length;
      return headerGroupMembers.length ? `${headerGroupMembers.length} members, ${on} online` : '';
    }
    if (selectedContact.type === 'npc' && isAdmin) {
      if (!selectedPlayerId) return 'Select a Kindred';
      return headerOnline ? 'Kindred online' : 'Kindred offline';
    }
    return headerOnline ? 'Online' : 'Offline';
  })();

  const headerStanding = (selectedContact?.type === 'user' || selectedContact?.type === 'npc')
    ? { titles: selectedContact.titles || [], court_status: selectedContact.court_status ?? null }
    : { titles: [], court_status: null };
  // Which button the composer's single slot shows. A button that is still
  // animating out keeps its old props (e.g. the text just sent), so taps on it
  // are dropped: its slot no longer matches the current one.
  const composerSlot = (newMessage.trim() || attachment) ? (showQueueOption ? 'queue' : 'send') : 'emoji';
  const composerSlotRef = useRef(composerSlot);
  composerSlotRef.current = composerSlot;
  const dropIfStale = (slot) => (e) => {
    if (slot !== composerSlotRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };
  const activeTheme = themeFor(convSettings.theme);
  const accent = activeTheme?.color || null;
  const bubbleTheme = accent ? { backgroundColor: accent, borderColor: accent, color: textOn(accent) } : null;

  // Identifies the open conversation to the settings / search / media endpoints.
  const convParams = !selectedContact ? null
    : selectedContact.type === 'npc' && isAdmin
      ? (selectedPlayerId ? { kind: 'npc', id: selectedContact.id, user_id: selectedPlayerId } : null)
      : { kind: selectedContact.type, id: selectedContact.id };

  const saveConvSettings = async (patch) => {
    if (!convParams) return;
    const prev = convSettings;
    setConvSettings(cur => ({ ...cur, ...patch }));
    setPanelPicker(null);
    try {
      await api.put('/chat/settings', { ...convParams, ...patch });
    } catch (e) {
      setConvSettings(prev);
      toast.error(formatApiError(e, 'Could not save the change.'));
    }
  };

  const loadMedia = async (more = false) => {
    if (!convParams) return;
    const before = more ? mediaList.items[mediaList.items.length - 1]?.id : undefined;
    try {
      const { data } = await api.get('/chat/media-list', { params: { ...convParams, before } });
      setMediaList(cur => ({ items: more ? [...cur.items, ...data.media] : data.media, hasMore: data.has_more, loaded: true }));
    } catch (e) {
      setMediaList(cur => ({ ...cur, loaded: true }));
    }
  };

  const buildThreadKey = (contact, selPlayerId) => {
    if (!contact) return 'none';
    if (contact.type === 'user') return `u-${contact.id}`;
    if (contact.type === 'group') return `g-${contact.id}`;
    return isAdmin ? `n-${contact.id}-p-${selPlayerId || 'none'}` : `n-${contact.id}`;
  };

  // Marks a conversation read on the server and zeroes its local badge. Used
  // when a chat is opened and again whenever a message arrives while it's on
  // screen: it used to run only on open, so a message read live stayed unread.
  const markThreadRead = (contact, playerId) => {
    if (!contact) return;
    if (contact.type === 'user') {
      setUsers(prev => prev.map(u => u.id === contact.id ? { ...u, unread_count: 0 } : u));
      api.post('/chat/read', { sender_id: contact.id }).catch(() => { });
    } else if (contact.type === 'group') {
      setGroups(prev => prev.map(g => g.id === contact.id ? { ...g, unread_count: 0 } : g));
      api.post(`/chat/groups/${contact.id}/read`).catch(() => { });
    } else if (contact.type === 'npc' && !isAdmin) {
      setNpcs(prev => prev.map(n => n.id === contact.id ? { ...n, unread_count: 0 } : n));
      api.post('/chat/read', { npc_id: contact.id }).catch(() => { });
    } else if (contact.type === 'npc' && playerId) {
      setNpcConvos(prev => prev.map(c => c.user_id === playerId ? { ...c, unread_count: 0 } : c));
      api.post('/chat/read', { npc_id: contact.id, sender_id: playerId, is_admin_reading_npc: true }).catch(() => { });
    }
  };
  const markThreadReadRef = useRef(markThreadRead);
  markThreadReadRef.current = markThreadRead;

  const selectContact = (contact) => {
    if (selectedContact?.type === contact.type && selectedContact?.id === contact.id) {
      return;
    }

    setDrafts(prev => ({ ...prev, [threadKey]: newMessage }));
    setSelectedContact(contact);
    setReactionPickerFor(null);
    setFullReactionPickerFor(null);

    // A player picked under one NPC means nothing under another NPC; start
    // clean so the auto-open below picks this NPC's own latest conversation.
    if (isAdmin) setSelectedPlayerId(null);

    const nextKey = buildThreadKey(contact, null);
    setNewMessage(drafts[nextKey] || '');
    setError('');
    markThreadRead(contact, null);

    if (!isMobile) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectAdminTarget = (userId) => {
    setDrafts(prev => ({ ...prev, [threadKey]: newMessage }));
    setSelectedPlayerId(userId);
    setReactionPickerFor(null);
    setFullReactionPickerFor(null);
    const nextKey = buildThreadKey(selectedContact, userId);
    setNewMessage(drafts[nextKey] || '');
    markThreadRead(selectedContact, userId);
  };

  const handleMarkNpcUnread = async (fromMessageId = null) => {
    if (!isAdmin || selectedContact?.type !== 'npc' || !selectedPlayerId) return;
    const targetPlayerId = selectedPlayerId;
    const targetNpcId = selectedContact.id;

    // Optimistically update counts and deselect so thread is not immediately re-read
    setNpcConvos(prev => prev.map(c => c.user_id === targetPlayerId ? { ...c, unread_count: (c.unread_count > 0 ? c.unread_count : 1) } : c));
    setNpcs(prev => prev.map(n => n.id === targetNpcId ? { ...n, unread_count: (n.unread_count > 0 ? n.unread_count : 1) } : n));
    setSelectedPlayerId(null);
    setMessages([]);

    try {
      const { data } = await api.post(`/admin/chat/npc-unread/${targetNpcId}/${targetPlayerId}`, fromMessageId ? { fromMessageId } : {});
      if (data?.unread_count) {
        setNpcConvos(prev => prev.map(c => c.user_id === targetPlayerId ? { ...c, unread_count: data.unread_count } : c));
      }
      toast.success('Conversation marked unread for Storytellers');
    } catch (e) {
      toast.error('Failed to mark conversation unread');
    }
  };

  useEffect(() => {
    if (!chatParam) {
      if (selectedContact) setSelectedContact(null);
      return;
    }
    if (contactKey(selectedContact) === chatParam) return;
    const [t, id] = chatParam.split('-');
    const list = t === 'u' ? users : t === 'g' ? groups : t === 'n' ? npcs : [];
    const contact = list.find(c => String(c.id) === id);
    if (contact) selectContact(contact);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatParam, users, groups, npcs]);

  // Details panel: first media page on open, debounced search while typing.
  const convParamsKey = convParams ? JSON.stringify(convParams) : '';
  useEffect(() => {
    if (detailsOpen && convParamsKey && !mediaList.loaded) loadMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsOpen, convParamsKey, mediaList.loaded]);
  useEffect(() => {
    const q = searchQ.trim();
    if (!detailsOpen || !convParamsKey || q.length < 2) { setSearchResults(null); return; }
    let live = true;
    setSearching(true);
    const t = setTimeout(() => {
      api.get('/chat/search', { params: { ...JSON.parse(convParamsKey), q } })
        .then(({ data }) => { if (live) setSearchResults(data.results || []); })
        .catch(() => { if (live) setSearchResults([]); })
        .finally(() => { if (live) setSearching(false); });
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [searchQ, detailsOpen, convParamsKey]);

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
          className="chat-overlay-surface border border-outline-variant rounded-lg w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_20px_rgba(27,76,140,0.3)]"
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
                        <span className="text-sm min-w-0 truncate">{m.char_name || m.display_name}</span>
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
                    <div className="text-center text-on-surface-variant/50 text-sm py-2">Every Kindred is already in the group.</div>
                  ) : nonMembers.map(u => {
                    const label = u.char_name || u.display_name || 'this Kindred';
                    return (
                      <div key={u.id} className="flex items-center justify-between gap-2 bg-surface-container-highest pl-3 pr-2 py-2 rounded border border-outline-variant/30">
                        <span className="text-sm min-w-0 truncate">{u.char_name}</span>
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

  const isMine = (m) => (selectedContact?.type === 'npc' && isAdmin ? m.sender_id === 'npc' : m.sender_id === currentUser?.id);
  const messagePerms = (item) => {
    const mine = isMine(item);
    const sent = !String(item.id).startsWith('temp_');
    const createdAt = new Date(item.created_at).getTime();
    const canEditDelete = mine && sent && Date.now() - createdAt < 4 * 60 * 60 * 1000;
    // Mirrors the backend's edit lock: once the other side has sent anything
    // after this message, it's been "answered" and can no longer be edited
    // (delete stays unaffected, same as the API).
    const answeredSince = canEditDelete && messages.some(m => new Date(m.created_at).getTime() > createdAt && !isMine(m));
    return { mine, sent, canEditDelete, canEdit: canEditDelete && !answeredSince, canReply: sent && editingMsgId !== item.id };
  };

  const renderActionSheet = () => {
    const item = actionSheetMsg;
    const { mine, sent, canEditDelete, canEdit, canReply } = messagePerms(item);
    const close = () => setActionSheetMsg(null);
    const run = (fn) => () => { close(); fn(); };
    const actions = [
      canReply && { icon: 'reply', label: 'Reply', fn: () => startReply(item) },
      item.body && { icon: 'content_copy', label: 'Copy text', fn: () => copyToClipboard(item.body) },
      reactionsByMsgId[item.id]?.length > 0 && { icon: 'groups', label: 'See reactions', fn: () => { setSelectedReactionTab('all'); setViewingReactionsMsg(item); } },
      canEdit && !editingMsgId && { icon: 'edit', label: 'Edit', fn: () => { setEditingMsgId(item.id); setEditBody(item.body); } },
      !mine && sent && isAdmin && selectedContact?.type === 'npc' && { icon: 'mark_chat_unread', label: 'Mark unread from here', fn: () => handleMarkNpcUnread(item.id) },
      canEditDelete && !editingMsgId && { icon: 'delete', label: 'Delete', danger: true, fn: () => handleDeleteMessage(item.id) },
    ].filter(Boolean);
    return createPortal(
      <div className="fixed inset-0 z-[1100] flex items-end bg-black/60" onClick={close}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Message actions"
          onClick={e => e.stopPropagation()}
          className="w-full chat-overlay-surface border-t border-outline-variant rounded-t-2xl pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.6)]"
        >
          <div className="w-10 h-1 rounded-full bg-outline-variant/60 mx-auto mt-2 mb-2" />
          {sent && (
            <div className="flex items-center justify-around px-2 pb-2 border-b border-outline-variant/40">
              {QUICK_REACTIONS.map(e => (
                <button key={e} type="button" onClick={run(() => toggleReaction(item.id, e))} className="w-11 h-11 flex items-center justify-center rounded-full text-[24px] leading-none active:bg-surface-variant/50">
                  <ReactionGlyph value={e} size={24} />
                </button>
              ))}
              <button type="button" aria-label="More reactions" onClick={run(() => setFullReactionPickerFor(item.id))} className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant active:bg-surface-variant/50">
                <span className="material-symbols-outlined text-[24px]">add_reaction</span>
              </button>
            </div>
          )}
          <div className="flex flex-col py-1">
            {actions.map(a => (
              <button key={a.label} type="button" onClick={run(a.fn)} className={`flex items-center gap-4 px-5 h-12 text-left text-[15px] active:bg-surface-variant/40 ${a.danger ? 'text-error' : 'text-on-surface'}`}>
                <span className="material-symbols-outlined text-[22px]">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderDetailsPanel = () => {
    const c = selectedContact;
    const locked = !convParams;
    const sectionLabel = 'px-4 pt-6 pb-2 text-[10px] text-on-surface-variant/60 font-bold tracking-widest uppercase';
    const row = 'w-full flex items-center gap-4 px-4 min-h-[52px] text-left text-[15px] text-on-surface hover:bg-surface-variant/20 active:bg-surface-variant/40 transition-colors disabled:opacity-40';
    // Each swatch previews the background, with the bubble colour as its mark.
    const swatch = (t) => {
      const key = t?.key || null;
      const selected = (convSettings.theme || null) === key;
      const crest = t && !t.icon && localSymlogo(t.key);
      return (
        <button key={key || 'default'} type="button" onClick={() => saveConvSettings({ theme: key })} aria-pressed={selected} className="flex flex-col items-center gap-1 min-w-0">
          <span
            className={`w-14 h-14 rounded-full border border-outline-variant/50 flex items-center justify-center ${selected ? 'ring-2 ring-offset-2 ring-offset-surface-container ring-on-surface' : ''}`}
            style={{ background: t ? t.bg : BASE_BG }}
          >
            {t?.icon && <span className="material-symbols-outlined text-[26px]" style={{ color: t.color }}>{t.icon}</span>}
            {crest && (
              <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: t.color }}>
                <img src={crest} alt="" className="w-5 h-5" style={{ filter: textOn(t.color) === '#fff' ? 'brightness(0) invert(1)' : 'brightness(0)' }} />
              </span>
            )}
            {!t && <span className="material-symbols-outlined text-[24px] text-on-surface-variant">format_color_reset</span>}
          </span>
          <span className="text-[10px] text-on-surface-variant truncate max-w-full">{t ? t.key : 'Default'}</span>
        </button>
      );
    };
    const searchAuthor = (r) => replyAuthor({
      sender_id: r.sender_id, from_side: r.from_side,
      sender_name: headerGroupMembers.find(m => m.id === r.sender_id)?.char_name,
    });

    return createPortal(
      <div className="fixed inset-0 z-[1100] flex justify-end bg-black/60" onClick={closeDetails}>
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label="Conversation details"
          onClick={e => e.stopPropagation()}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          className="w-full md:w-[400px] h-full chat-overlay-surface md:border-l border-outline-variant flex flex-col shadow-[-8px_0_24px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center gap-2 px-2 h-14 border-b border-outline-variant/50 shrink-0">
            <button type="button" onClick={closeDetails} aria-label="Close details" className="w-11 h-11 flex items-center justify-center rounded text-on-surface-variant hover:text-primary">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h3 className="text-[16px] font-semibold text-on-surface m-0">Details</h3>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[max(16px,env(safe-area-inset-bottom))]">
            {/* Who */}
            <div className="flex flex-col items-center text-center px-6 pt-6 gap-1">
              <div className="relative mb-2">
                <div className={`w-20 h-20 ${c.type === 'npc' ? 'rounded-lg' : 'rounded-full'} bg-surface-container-highest border border-outline-variant/50 overflow-hidden flex items-center justify-center`}>
                  {c.type === 'user' ? (
                    <Avatar userId={c.id} size="100%" style={{ width: '100%', height: '100%' }} fallback={localSymlogo(c.clan) || '/img/ATT-logo(1).webp'} />
                  ) : c.type === 'npc' ? (
                    <Avatar npcId={c.id} size="100%" style={{ width: '100%', height: '100%', borderRadius: 0 }} fallback={localSymlogo(c.clan) || '/img/ATT-logo(1).webp'} />
                  ) : (
                    <GroupIconGlyph icon={c.icon} size={56} />
                  )}
                </div>
                <OnlineDot online={headerOnline} />
              </div>
              <div className="text-[18px] font-semibold text-on-surface">{headerLabel}</div>
              <StatusLine titles={headerStanding.titles} status={headerStanding.court_status} className="text-[12px] text-on-surface-variant justify-center" />
              <div className={`text-[12px] font-system-code ${headerOnline ? 'text-green-500' : 'text-on-surface-variant/70'}`}>{headerStatus}</div>
            </div>

            {/* Customise (shared with everyone in the conversation) */}
            <div className={sectionLabel}>Customise</div>
            <button type="button" className={row} disabled={locked} onClick={() => setPanelPicker(v => (v === 'theme' ? null : 'theme'))} aria-expanded={panelPicker === 'theme'}>
              <span className="material-symbols-outlined text-[22px] text-on-surface-variant">palette</span>
              <span className="flex-1">Theme</span>
              <span className="flex items-center gap-2 text-[13px] text-on-surface-variant">
                {convSettings.theme || 'Default'}
                <span className="w-6 h-6 rounded-full border border-outline-variant" style={{ background: activeTheme?.bg || BASE_BG }} />
              </span>
            </button>
            {panelPicker === 'theme' && (
              <div className="px-4 py-3">
                <div className="grid grid-cols-4 gap-x-2 gap-y-4">{swatch(null)}</div>
                {THEME_GROUPS.map(g => (
                  <div key={g}>
                    <div className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 mt-5 mb-2">{g}</div>
                    <div className="grid grid-cols-4 gap-x-2 gap-y-4">{CHAT_THEMES.filter(t => t.group === g).map(swatch)}</div>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className={row} disabled={locked} onClick={() => setPanelPicker(v => (v === 'emoji' ? null : 'emoji'))} aria-expanded={panelPicker === 'emoji'}>
              <span className="material-symbols-outlined text-[22px] text-on-surface-variant">add_reaction</span>
              <span className="flex-1">Conversation emoji</span>
              <span className="text-[22px] leading-none"><ReactionGlyph value={convEmoji} size={22} /></span>
            </button>
            {panelPicker === 'emoji' && (
              <div className="px-4 pb-3">
                <div className="rounded-lg overflow-hidden border border-outline-variant">
                  <React.Suspense fallback={<div className="p-8 text-center text-xs text-on-surface-variant font-system-code">Loading emojis...</div>}>
                    <EmojiPicker
                      onEmojiClick={(o) => saveConvSettings({ emoji: emojiObjectToToken(o) })}
                      theme="dark"
                      width="100%"
                      height={340}
                      customEmojis={customClanEmojis}
                      categories={EMOJI_PICKER_CATEGORIES}
                    />
                  </React.Suspense>
                </div>
                {convSettings.emoji && (
                  <button type="button" onClick={() => saveConvSettings({ emoji: null })} className="mt-2 px-1 py-2 text-[13px] text-primary">Reset to default</button>
                )}
              </div>
            )}

            {/* Search */}
            <div className={sectionLabel}>Search in conversation</div>
            <div className="px-4">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant/60">search</span>
                <input
                  type="search"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  disabled={locked}
                  placeholder="Search messages"
                  className="w-full bg-surface-dim border border-outline-variant/50 rounded-lg pl-10 pr-3 h-11 text-[16px] md:text-[14px] text-on-surface focus:border-primary focus:ring-0"
                />
              </div>
            </div>
            {searchQ.trim().length >= 2 && (
              <div className="mt-2">
                {searching && !searchResults && <div className="px-4 py-3 text-[13px] text-on-surface-variant">Searching...</div>}
                {searchResults && searchResults.length === 0 && <div className="px-4 py-3 text-[13px] text-on-surface-variant">No messages found.</div>}
                {searchResults?.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { closeDetails(); setTimeout(() => scrollToMessage(r.id), 60); }}
                    className="w-full text-left px-4 py-3 border-b border-outline-variant/20 hover:bg-surface-variant/20 active:bg-surface-variant/40"
                  >
                    <div className="flex justify-between gap-2 text-[11px] text-on-surface-variant font-system-code">
                      <span className="truncate">{searchAuthor(r)}</span>
                      <span className="shrink-0">{formatTime(r.created_at)}</span>
                    </div>
                    <div className="text-[14px] text-on-surface line-clamp-2 break-words mt-0.5">{renderMessageBody(r.body)}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Media */}
            <div className={sectionLabel}>Media</div>
            {mediaList.loaded && mediaList.items.length === 0 ? (
              <div className="px-4 text-[13px] text-on-surface-variant">No media shared yet.</div>
            ) : (
              <div className="grid grid-cols-3 gap-1 px-4">
                {mediaList.items.map(m => (
                  <div key={m.id} className="aspect-square rounded overflow-hidden bg-black/40">
                    <ChatMedia attachmentId={m.attachment_id} thumb />
                  </div>
                ))}
              </div>
            )}
            {mediaList.hasMore && (
              <button type="button" onClick={() => loadMedia(true)} className="mx-4 mt-2 px-3 py-2 text-[13px] text-primary">Show more</button>
            )}

            {/* Members (groups) */}
            {c.type === 'group' && (
              <>
                <div className={sectionLabel}>Members ({headerGroupMembers.length})</div>
                {headerGroupMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-4 min-h-[56px]">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/50 bg-surface-container-highest">
                        <Avatar userId={m.id} size="100%" style={{ width: '100%', height: '100%' }} fallback={localSymlogo(m.clan) || '/img/ATT-logo(1).webp'} />
                      </div>
                      <OnlineDot online={isUserOnline(m.id)} />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col">
                      <span className="text-[15px] text-on-surface truncate">{m.char_name || m.display_name}</span>
                      <StatusLine titles={m.titles} status={m.court_status} className="text-[11px] text-on-surface-variant/70" />
                    </div>
                    {m.id === c.created_by && <span className="text-[11px] text-on-surface-variant/60 shrink-0">Founder</span>}
                  </div>
                ))}
                <button type="button" className={`${row} mt-2`} onClick={() => openManageGroup()}>
                  <span className="material-symbols-outlined text-[22px] text-on-surface-variant">settings</span>
                  Manage group
                </button>
                {/* The creator can't leave their own group (the server rejects it);
                    they delete it from Manage instead. */}
                {c.created_by !== currentUser?.id && (
                  <button type="button" className={`${row} !text-error`} onClick={handleLeaveGroup}>
                    <span className="material-symbols-outlined text-[22px]">logout</span>
                    Leave group
                  </button>
                )}
              </>
            )}
          </div>
        </motion.aside>
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
          className={`chat-overlay-surface border rounded-lg w-full max-w-sm shadow-[0_0_24px_rgba(0,0,0,0.6)] ${danger ? 'border-error/50' : 'border-outline-variant'}`}
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
      <div className="chat-overlay-surface border border-outline-variant rounded-lg w-full max-w-md p-6 flex flex-col gap-4 shadow-[0_0_20px_rgba(27,76,140,0.3)]">
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

        <input type="text" placeholder="Group Name" className="w-full bg-surface-dim border border-outline-variant rounded p-2 text-base md:text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors font-system-code" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
        <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
          {usersWithChar.map(u => (
            <label key={u.id} className="flex items-center gap-3 bg-surface-container-highest p-2 rounded border border-outline-variant/30 cursor-pointer hover:bg-surface-variant/30 transition-colors">
              <input type="checkbox" className="rounded border-outline-variant bg-surface-dim text-primary focus:ring-primary focus:ring-offset-surface-container" checked={newGroupMembers.includes(u.id)} onChange={e => {
                if (e.target.checked) setNewGroupMembers(p => [...p, u.id]);
                else setNewGroupMembers(p => p.filter(id => id !== u.id));
              }} />
              <span className="text-sm min-w-0 truncate">{u.char_name}</span>
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center overflow-hidden shrink-0">
              {isAdmin
                ? <span className="material-symbols-outlined text-primary text-[22px]">shield_person</span>
                : <Avatar userId={currentUser?.id} size="100%" style={{ width: '100%', height: '100%' }} fallback={localSymlogo(myChar?.clan) || '/img/ATT-logo(1).webp'} />}
            </div>
            <div className="min-w-0">
              <div className="text-on-surface-variant text-[10px] uppercase tracking-widest opacity-70">Writing as</div>
              <div className="font-bold text-on-surface text-[14px] truncate">{isAdmin ? 'Storyteller' : (myChar?.name || currentUser?.display_name)}</div>
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
              className="w-full bg-surface-dim border border-outline-variant/50 rounded py-2 md:py-1.5 pl-8 pr-2 text-[16px] md:text-[12px] text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors"
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
              </div>
              <ul className="flex flex-col">
                {filteredGroups.map(g => {
                  const isActive = selectedContact?.type === 'group' && selectedContact?.id === g.id;
                  return (
                    <li key={`g-${g.id}`} onClick={() => openChat(g)} className={`${isActive ? 'blood-active border-l-4' : 'text-on-surface-variant hover:bg-surface-variant/10 border-l-4 border-transparent'} px-4 py-2 flex items-center justify-between cursor-pointer transition-all`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 overflow-hidden">
                          <GroupIconGlyph icon={g.icon} size={24} />
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
            </div>
            <ul className="flex flex-col">
              {usersWithChar.map(u => {
                const isActive = selectedContact?.type === 'user' && selectedContact?.id === u.id;
                return (
                  <li key={`u-${u.id}`} onClick={() => openChat(u)} className={`${isActive ? 'blood-active border-l-4' : 'text-on-surface-variant hover:bg-surface-variant/10 border-l-4 border-transparent'} px-4 py-2 flex items-center justify-between cursor-pointer transition-all`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center overflow-hidden border border-outline-variant/50">
                          <Avatar userId={u.id} size="100%" style={{ width: '100%', height: '100%' }} imgClassName="opacity-80" fallback={localSymlogo(u.clan) || '/img/ATT-logo(1).webp'} />
                        </div>
                        <OnlineDot online={isUserOnline(u.id)} />
                      </div>
                      <span className="min-w-0 flex flex-col">
                        <span className={`${isActive ? 'text-glow-active font-medium text-white' : ''} truncate`}>{u.char_name}</span>
                        <StatusLine titles={u.titles} status={u.court_status} className="text-[10px] text-on-surface-variant/70" />
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
                    <li key={`u-${u.id}`} onClick={() => openChat(u)} className={`${isActive ? 'blood-active border-l-4' : 'text-on-surface-variant hover:bg-surface-variant/10 border-l-4 border-transparent'} px-4 py-2 flex items-center justify-between cursor-pointer transition-all opacity-80`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/30 overflow-hidden">
                            <Avatar userId={u.id} size="100%" style={{ width: '100%', height: '100%' }} imgClassName="opacity-80" fallback="/img/ATT-logo(1).webp" />
                          </div>
                          <OnlineDot online={isUserOnline(u.id)} />
                        </div>
                        <span className={`${isActive ? 'text-glow-active font-medium text-white' : ''} truncate min-w-0 flex flex-col`}>
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
            </div>
            <ul className="flex flex-col">
              {filteredNpcs.map(n => {
                const isActive = selectedContact?.type === 'npc' && selectedContact?.id === n.id;
                const crest = localSymlogo(n.clan);
                return (
                  <li key={`n-${n.id}`} onClick={() => openChat(n)} className={`${isActive ? 'blood-active border-l-4' : 'text-on-surface-variant hover:bg-surface-variant/10 border-l-4 border-transparent'} px-4 py-2 flex items-center justify-between cursor-pointer transition-all`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-sm bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant/50">
                          <Avatar npcId={n.id} size="100%" style={{ width: '100%', height: '100%', borderRadius: 0 }} imgClassName="opacity-80" fallback={crest || '/img/ATT-logo(1).webp'} />
                        </div>
                        {!isAdmin && <OnlineDot online={storytellerOnline} />}
                      </div>
                      <span className="min-w-0 flex flex-col">
                        <span className={`${isActive ? 'text-glow-active font-medium text-white' : ''} truncate`}>{n.name}</span>
                        <StatusLine titles={n.titles} status={n.court_status} className="text-[10px] text-on-surface-variant/70" />
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
          <div className={`flex items-center gap-3 p-1 ${connected ? 'text-on-surface-variant' : 'text-amber-400'}`}>
            <span className="material-symbols-outlined text-[16px]">{connected ? 'wifi_tethering' : 'wifi_tethering_off'}</span>
            <span className="text-[11px] font-bold tracking-widest uppercase">{connected ? 'Signal: Strong' : 'Signal: Lost'}</span>
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
      {pendingOpen && createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPendingOpen(false)}>
          <div className="chat-overlay-surface border border-outline-variant rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col shadow-[0_0_20px_rgba(245,158,11,0.2)]" onClick={e => e.stopPropagation()}>
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
                    <span className="text-xs font-semibold text-primary truncate">{m.npc_name} <span className="text-on-surface-variant font-normal"><span className="material-symbols-outlined text-[16px] align-middle">arrow_forward</span> {m.char_name || m.user_display_name}</span></span>
                    <button onClick={() => cancelPendingMessage(m.id)} className="text-[10px] bg-error-container/20 text-error border border-error/30 px-2 py-1 rounded hover:bg-error/20 transition-colors shrink-0">Cancel</button>
                  </div>
                  <p className="text-sm text-on-surface break-words">{m.body || (m.attachment_id ? <span className="inline-flex items-center gap-1 italic opacity-80"><span className="material-symbols-outlined text-[16px]">image</span> Attachment</span> : '')}</p>
                  <span className="text-[10px] text-on-surface-variant/50 font-system-code">{formatTime(m.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Main Content (Canvas) */}
      <motion.main
        className={styles.chatWindow}
        style={selectedContact && activeTheme ? { background: activeTheme.bg } : undefined}
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
                <button className="-ml-2 w-11 h-11 flex items-center justify-center md:hidden text-on-surface-variant hover:text-primary transition-colors focus:outline-none shrink-0" onClick={closeChat} aria-label="Back to contacts">
                  <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                </button>
                <button type="button" onClick={openDetails} aria-label="Conversation details" className="flex items-center gap-3 md:gap-4 min-w-0 text-left">
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
                  <OnlineDot online={headerOnline} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-headline-md text-[16px] md:text-[18px] font-semibold text-on-surface m-0 leading-tight truncate">{headerLabel}</h2>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] md:text-[12px] font-system-code mt-0.5 min-w-0 text-on-surface-variant/70">
                    <StatusLine titles={headerStanding.titles} status={headerStanding.court_status} />
                    {(headerStanding.titles.length > 0 || headerStanding.court_status > 0) && headerStatus && <span aria-hidden="true">{'\u00b7'}</span>}
                    <span className={`truncate ${headerOnline ? 'text-green-500' : ''}`}>{headerStatus}</span>
                  </div>
                </div>
                </button>
              </div>
              <div className="flex items-center gap-2 md:gap-4 text-on-surface-variant/70 shrink-0">
                {isAdmin && selectedContact.type === 'npc' && selectedPlayerId && (
                  <button
                    type="button"
                    onClick={() => handleMarkNpcUnread()}
                    title="Mark conversation unread for other Storytellers"
                    className="hover:text-primary transition-colors flex items-center justify-center gap-1 border border-outline-variant/50 h-10 min-w-10 px-2 rounded text-[10px] md:text-xs font-system-code uppercase tracking-widest bg-surface-container-low hover:bg-surface-variant/50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">mark_chat_unread</span>
                    <span className="hidden sm:inline">Mark Unread</span>
                  </button>
                )}
                {/* Group manage/leave, search, media and theme live in the details panel. */}
                <button type="button" onClick={openDetails} aria-label="Conversation details" title="Details" className="w-10 h-10 flex items-center justify-center rounded hover:text-primary hover:bg-surface-variant/40 transition-colors">
                  <span className="material-symbols-outlined text-[22px]">info</span>
                </button>
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
                    <input className="bg-surface-dim border border-outline-variant/50 rounded px-2 py-1 text-base md:text-xs text-on-surface focus:border-primary w-full md:w-auto" placeholder="Search Kindred…" value={adminPlayerFilter} onChange={(e) => setAdminPlayerFilter(e.target.value)} />
                  )}
                  <div className="text-xs font-system-code flex items-center gap-2">
                    {selectedPlayerId ? (
                      <>
                        <span className="text-on-surface-variant">To:</span>
                        <b className="text-primary">{users.find(u => u.id === selectedPlayerId)?.char_name || 'Unknown'}</b>
                        <button className="text-[10px] bg-outline-variant/30 px-1.5 py-0.5 rounded hover:bg-outline-variant/50 transition-colors cursor-pointer" onClick={() => setSelectedPlayerId(null)}>Clear</button>
                      </>
                    ) : (
                      <span className="text-error text-[10px] uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span> Select a Kindred</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {(adminPlayerTab === 'recent' ? adminRecentPlayers : adminAllPlayersFiltered).map(u => (
                    <button key={`sel-${u.id}`} onClick={() => selectAdminTarget(u.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded border shrink-0 transition-colors ${selectedPlayerId === u.id ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-highest border-outline-variant/30 text-on-surface-variant hover:border-outline-variant'}`}>
                      {isUserOnline(u.id) && <span title="Online" className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
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
            <div className={`${styles.messageList} custom-scrollbar`} ref={messagesListRef} onScroll={handleListScroll}>
              <div className="text-center text-[10px] md:text-[12px] font-system-code text-on-surface-variant/40 my-2 min-h-[20px]">
                {loadingOlder ? 'Decrypting older transmissions...'
                  : hasMore ? (
                    <button type="button" onClick={loadOlder} className="text-primary/80 hover:text-primary px-3 py-2">Load older messages</button>
                  ) : messages.length ? '[ START OF ENCRYPTED CHANNEL ]' : '[ CHANNEL OPEN : NO TRANSMISSIONS YET ]'}
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

                const { mine, canEditDelete, canEdit, canReply } = messagePerms(item);
                const isGroupNotMine = selectedContact.type === 'group' && !mine;
                // Hold-to-grow emoji: shown bare and big, without the bubble.
                const bigEmoji = !!item.emoji_size && !!item.body && !item.attachment_id;

                return (
                  <SwipeRow
                    key={item.id}
                    id={`chat-msg-${item.id}`}
                    enabled={isMobile && canReply}
                    onReply={() => startReply(item)}
                    onSwipeStart={handleBubblePointerCancel}
                    className={`flex gap-2 md:gap-3 max-w-[90%] md:max-w-[85%] ${mine ? 'self-end flex-row-reverse group' : 'self-start group'}`}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    {/* Avatar */}
                    {!mine ? (
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-surface-container-high border border-outline-variant flex-shrink-0 flex items-center justify-center overflow-hidden blood-glow opacity-80 mt-auto md:mt-0">
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
                        <div className="text-[11px] md:text-[12px] font-bold font-system-code ml-1" style={{ color: '#fff' }}>
                          {item.sender_name}
                        </div>
                      )}

                      {editingMsgId === item.id ? (
                        <div className="bg-surface-container-high p-3 rounded-lg border border-primary/50 shadow-[0_0_15px_rgba(255,179,174,0.1)] w-full max-w-sm">
                          <textarea value={editBody} onChange={e => setEditBody(e.target.value)} className="w-full bg-surface-dim border border-outline-variant rounded p-2 text-on-surface text-base md:text-sm focus:border-primary focus:ring-0 resize-none font-system-code" rows={3} />
                          <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setEditingMsgId(null)} className="text-xs text-on-surface-variant hover:text-on-surface px-2 py-1">Cancel</button>
                            <button onClick={submitEditMessage} className="text-xs bg-primary text-on-primary px-3 py-1 rounded font-bold hover:bg-primary-container">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleBubbleTap(item.id)}
                          onPointerDown={(e) => handleBubblePointerDown(e, item)}
                          onPointerUp={handleBubblePointerCancel}
                          onPointerLeave={handleBubblePointerCancel}
                          onPointerCancel={handleBubblePointerCancel}
                          onContextMenu={(e) => e.preventDefault()}
                          style={mine && bubbleTheme && !bigEmoji ? bubbleTheme : undefined}
                          className={bigEmoji
                            ? `relative w-fit max-w-full select-none leading-none rounded ${flashMsgId === item.id ? 'ring-2 ring-primary' : ''}`
                            : `relative chat-glass p-2 md:p-3 w-fit max-w-full shadow-[0_4px_12px_rgba(0,0,0,0.5)] select-none transition-shadow duration-300 ${flashMsgId === item.id ? 'ring-2 ring-primary' : ''} ${mine ? 'bg-blood-accent/90 text-white rounded-l-lg rounded-br-lg bubble-right border-l border-t border-b border-[#b01423]' : 'bg-surface-container-high border border-outline-variant/30 text-on-surface rounded-r-lg rounded-bl-lg bubble-left'}`}
                        >

                          {/* Quoted message this one replies to */}
                          {item.reply && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (!item.reply.missing) scrollToMessage(item.reply.id); }}
                              onPointerDown={(e) => e.stopPropagation()}
                              title={item.reply.missing ? undefined : 'Jump to the original message'}
                              className={`block w-full text-left mb-2 px-2 py-1 rounded border-l-2 text-[12px] md:text-[13px] leading-snug ${mine ? 'bg-black/25 border-white/60' : 'bg-surface-container-highest/80 border-primary'} ${item.reply.missing ? 'cursor-default' : 'cursor-pointer hover:brightness-125'}`}
                            >
                              <span className={`block text-[10px] font-bold font-system-code truncate ${mine ? 'text-white/80' : 'text-primary'}`}>{replyAuthor(item.reply)}</span>
                              <span className="line-clamp-2 break-words opacity-90">{replySnippet(item.reply)}</span>
                            </button>
                          )}

                          {/* Attachment */}
                          {item.attachment_id && (
                            <div className="mb-2 relative rounded overflow-hidden border border-outline-variant/50 bg-black/50 group/img cursor-pointer w-fit max-w-full">
                              <ChatMedia attachmentId={item.attachment_id} />
                              <div className="absolute inset-0 bg-blood-accent/10 pointer-events-none mix-blend-overlay"></div>
                            </div>
                          )}

                          {/* Body */}
                          {item.body && (bigEmoji ? (
                            <span className="block py-1" style={{ fontSize: EMOJI_PX[item.emoji_size] }}>
                              <ReactionGlyph value={item.body} size={EMOJI_PX[item.emoji_size]} />
                            </span>
                          ) : (
                            <p className="text-[14px] md:text-[15px] leading-relaxed whitespace-pre-wrap break-words">{renderMessageBody(item.body)}</p>
                          ))}
                        </div>
                      )}

                      {/* Reactions */}
                      {!String(item.id).startsWith('temp_') && (reactionsByMsgId[item.id]?.length > 0 || reactionPickerFor === item.id) && (
                        <div className={`flex items-center gap-1 flex-wrap ${mine ? 'justify-end' : 'justify-start'}`}>
                          {(reactionsByMsgId[item.id] || []).map(r => {
                            const isReactedByMe = (r.users || []).includes(currentUser?.id);
                            const reactorNames = (r.reactors || []).map(u => u.name).filter(Boolean);
                            const tooltip = reactorNames.length > 0
                              ? `${reactorNames.join(', ')}: ${r.emoji}`
                              : (isReactedByMe ? 'Remove your reaction' : 'React');
                            return (
                              <button
                                key={r.emoji}
                                type="button"
                                onPointerDown={() => handlePillPointerDown(item, r.emoji)}
                                onPointerUp={() => handlePillPointerUp(item, r.emoji)}
                                onPointerLeave={handlePillPointerCancel}
                                onPointerCancel={handlePillPointerCancel}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setSelectedReactionTab(r.emoji);
                                  setViewingReactionsMsg(item);
                                }}
                                title={tooltip}
                                className={`text-[12px] md:text-[11px] leading-none px-2 py-1 md:px-1.5 md:py-0.5 rounded-full border transition-colors flex items-center gap-1 cursor-pointer select-none ${isReactedByMe ? 'bg-primary/20 border-primary text-primary' : 'bg-surface-container-highest border-outline-variant/40 text-on-surface-variant hover:border-primary/50'}`}
                              >
                                <ReactionGlyph value={r.emoji} size={12} />
                                <span className="font-system-code">{r.count}</span>
                              </button>
                            );
                          })}
                          {reactionPickerFor === item.id && (
                            <div data-reaction-ui="true" className="flex items-center gap-1 bg-surface-container-highest border border-outline-variant/40 rounded-full px-1.5 py-0.5 shadow-lg">
                              {QUICK_REACTIONS.map(e => (
                                <button
                                  key={e}
                                  type="button"
                                  onClick={() => toggleReaction(item.id, e)}
                                  className="text-[14px] leading-none hover:scale-125 transition-transform"
                                >
                                  <ReactionGlyph value={e} size={15} />
                                </button>
                              ))}
                              <div className="w-px h-3.5 bg-outline-variant/40 mx-0.5" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFullReactionPickerFor(item.id);
                                }}
                                className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-0.5 rounded-full hover:bg-white/10"
                                title="More reactions"
                                aria-label="More reactions"
                              >
                                <span className="material-symbols-outlined text-[15px] leading-none">add_reaction</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Meta Line (Time, Status, Actions) */}
                      <div className={`flex items-center gap-2 mt-0.5 ${mine ? 'mr-1 flex-row-reverse' : 'ml-1'}`}>
                        <span className="font-system-code text-[9px] md:text-[10px] text-on-surface-variant/60">{formatTime(item.created_at)}</span>

                        {!!item.edited && <span className="font-system-code text-[9px] text-on-surface-variant/40">(edited)</span>}

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
                        <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canReply && (
                            <button onClick={() => startReply(item)} className="text-[10px] text-on-surface-variant hover:text-primary transition-colors">Reply</button>
                          )}
                          {!String(item.id).startsWith('temp_') && (
                            <button
                              data-reaction-ui="true"
                              onClick={() => setReactionPickerFor(p => p === item.id ? null : item.id)}
                              title="React"
                              className="text-[10px] text-on-surface-variant hover:text-primary transition-colors"
                            >
                              React
                            </button>
                          )}
                          {!String(item.id).startsWith('temp_') && reactionsByMsgId[item.id]?.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReactionTab('all');
                                setViewingReactionsMsg(item);
                              }}
                              title="Reactions"
                              className="text-[10px] text-on-surface-variant hover:text-primary transition-colors"
                            >
                              Reactions
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
                          {!mine && (
                            <>
                              {isAdmin && selectedContact?.type === 'npc' && !String(item.id).startsWith('temp_') && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkNpcUnread(item.id)}
                                  title="Mark unread from this message"
                                  className="text-[10px] text-on-surface-variant hover:text-primary transition-colors flex items-center gap-0.5 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[11px]">mark_chat_unread</span>
                                  Unread
                                </button>
                              )}
                              {item.body && (
                                <button onClick={() => copyToClipboard(item.body)} className="text-[10px] text-on-surface-variant hover:text-primary transition-colors">Copy</button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reply arrow beside the bubble (desktop; mobile swipes instead) */}
                    {canReply && (
                      <button
                        type="button"
                        onClick={() => startReply(item)}
                        title="Reply"
                        aria-label="Reply to this message"
                        className="hidden md:flex self-center shrink-0 w-8 h-8 items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-variant/40 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-[20px]">reply</span>
                      </button>
                    )}
                  </SwipeRow>
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
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setShowEmojiPicker(false)}
                  />
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
                </>
              )}

              <div className="max-w-4xl mx-auto w-full relative flex flex-col bg-surface-container-lowest border border-outline-variant rounded-md focus-within:border-primary focus-within:shadow-[0_0_8px_rgba(180,15,31,0.2)] transition-all">
                {replyTo && (
                  <div className="flex items-center gap-2 mx-1.5 md:mx-2 mt-1.5 md:mt-2 pl-2 pr-1 py-1.5 rounded bg-surface-container-high border-l-2 border-primary">
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0">reply</span>
                    <button
                      type="button"
                      onClick={() => scrollToMessage(replyTo.id)}
                      className="flex-1 min-w-0 text-left"
                      title="Jump to the message you're replying to"
                    >
                      <span className="block text-[10px] font-bold font-system-code text-primary truncate">Replying to {replyAuthor(replyTo)}</span>
                      <span className="block text-[12px] text-on-surface-variant truncate">{replySnippet(replyTo)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      aria-label="Cancel reply"
                      title="Cancel reply (Esc)"
                      className="w-9 h-9 shrink-0 flex items-center justify-center rounded text-on-surface-variant hover:text-error hover:bg-surface-variant/40 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2 p-1.5 md:p-2">

                {/* Attachments & Previews */}
                {/* Backend upload endpoint only accepts image/audio (see handleFileSelect) — video
                    is deliberately left out of the OS picker so it never gets offered just to be
                    rejected. ChatMedia can still render a video attachment if one exists from
                    elsewhere; this only narrows what a user can select here. */}
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,audio/*" onChange={handleFileSelect} />

                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!isCharActive || !canSend} aria-label="Attach file" className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors shrink-0 rounded hover:bg-surface-variant/30 disabled:opacity-30">
                  <span className="material-symbols-outlined text-[22px]">attach_file</span>
                </button>

                <div className="flex-1 flex flex-col min-w-0">
                  {attachment && (
                    <div className="absolute bottom-full left-0 mb-2 p-2 chat-overlay-surface border border-primary/20 rounded shadow-lg flex items-center gap-3 w-full">
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
                    enterKeyHint={IS_TOUCH ? 'enter' : 'send'}
                    placeholder={showQueueOption ? "SchreckNet offline : send queues it, hold send to deliver now" : !canSend ? (nextOpening ? `SchreckNet offline : Opens again ${nextOpening.day} at ${nextOpening.time}` : "System Offline...") : (!isCharActive ? "Waiting for ST approval..." : "Transmit response...")}
                    className="w-full bg-transparent border-none text-on-surface font-system-code text-[16px] md:text-[14px] placeholder-on-surface-variant/40 focus:ring-0 resize-none py-2 px-1 max-h-32 custom-scrollbar break-words"
                    rows={1}
                    style={{ minHeight: '40px' }}
                    disabled={!canSend || !isCharActive || (isAdmin && selectedContact?.type === 'npc' && !selectedPlayerId)}
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(val => !val)}
                    disabled={!isCharActive || !canSend}
                    className={`w-10 h-10 items-center justify-center transition-colors rounded hover:bg-surface-variant/30 flex disabled:opacity-30 ${showEmojiPicker ? 'text-primary bg-surface-variant/40' : 'text-on-surface-variant hover:text-primary'}`}
                    title="Add emoji"
                    aria-label="Add emoji"
                  >
                    <span className="material-symbols-outlined text-[22px]">mood</span>
                  </button>
                  {/* One slot, like Messenger: the conversation emoji while the
                      composer is empty, the send button once there's a draft.
                      onMouseDown preventDefault keeps the textarea focused, so a
                      phone keyboard stays open between messages. */}
                  <div className="relative w-10 h-10 shrink-0">
                    <AnimatePresence initial={false}>
                      {/* Crossfade the emoji and send buttons in the same spot:
                          one spins and shrinks out while the other grows in. */}
                      <motion.div
                        key={composerSlot}
                        onClickCapture={dropIfStale(composerSlot)}
                        onPointerDownCapture={dropIfStale(composerSlot)}
                        onPointerUpCapture={dropIfStale(composerSlot)}
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ opacity: 0, scale: 0.4, rotate: -45 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.4, rotate: 45 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                      >
                      {(newMessage.trim() || attachment) ? (
                        showQueueOption ? (
                          <button
                            type="button"
                            onClick={(e) => { if (e.detail === 0) doSend({ queue: true }); }}
                            onMouseDown={(e) => e.preventDefault()}
                            onPointerDown={startSendHold}
                            onPointerUp={() => endSendHold(true)}
                            onPointerLeave={() => endSendHold(false)}
                            onPointerCancel={() => endSendHold(false)}
                            onContextMenu={(e) => e.preventDefault()}
                            disabled={!isCharActive || sendingRef.current || !selectedPlayerId}
                            title="Tap: queue until SchreckNet reopens. Hold: send now"
                            aria-label={sendHold === 'armed' ? 'Release to send now' : 'Queue until SchreckNet reopens, hold to send now'}
                            style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}
                            className={`relative flex items-center justify-center h-10 w-10 rounded border select-none transition-colors disabled:opacity-30 ${sendHold === 'armed' ? 'bg-primary text-on-primary border-primary' : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'}`}
                          >
                            {sendHold === 'holding' && (
                              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 40 40" aria-hidden="true">
                                <motion.circle
                                  cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="2.5"
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: SEND_NOW_HOLD_MS / 1000, ease: 'linear' }}
                                />
                              </svg>
                            )}
                            <span className="material-symbols-outlined text-[22px]">{sendHold === 'armed' ? 'send' : 'schedule_send'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendMessage}
                            onMouseDown={(e) => e.preventDefault()}
                            disabled={!canSend || !isCharActive || sendingRef.current || (isAdmin && selectedContact?.type === 'npc' && !selectedPlayerId)}
                            title="Send"
                            aria-label="Send"
                            className="p-2 bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-on-primary transition-colors rounded shadow-[0_0_8px_rgba(255,179,174,0.1)] group flex items-center justify-center h-10 w-10 disabled:opacity-30 disabled:hover:bg-primary/10 disabled:hover:text-primary"
                          >
                            <span className="material-symbols-outlined text-[22px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">send</span>
                          </button>
                        )
                      ) : (
                        /* Conversation emoji (Messenger's like button): tap sends it,
                           hold to inflate it, hold too long and it pops. onClick only
                           covers keyboard activation (detail 0). */
                        <button
                          type="button"
                          onClick={(e) => { if (e.detail === 0) doSend({ text: convEmoji, emojiSize: 1, queue: showQueueOption }); }}
                          onMouseDown={(e) => e.preventDefault()}
                          onPointerDown={startEmojiHold}
                          onPointerUp={() => endEmojiHold(true)}
                          onPointerLeave={() => endEmojiHold(false)}
                          onPointerCancel={() => endEmojiHold(false)}
                          onContextMenu={(e) => e.preventDefault()}
                          disabled={!canSend || !isCharActive || sendingRef.current || (isAdmin && selectedContact?.type === 'npc' && !selectedPlayerId)}
                          aria-label="Send the conversation emoji, hold to make it bigger"
                          title="Tap to send, hold to make it bigger"
                          style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}
                          className="relative flex items-center justify-center h-10 w-10 rounded text-[22px] leading-none select-none hover:bg-surface-variant/30 transition-colors disabled:opacity-30"
                        >
                          <motion.span
                            className="relative z-10 inline-block leading-none"
                            style={{ originX: 1, originY: 1 }}
                            animate={
                              emojiHold === 'growing' ? { scale: 3.2, rotate: 0, opacity: 1 }
                                : emojiHold === 'warning' ? { scale: 3.2, rotate: [0, -10, 10, -10, 10, 0], opacity: 1 }
                                  : emojiHold === 'popped' ? { scale: 0, rotate: 0, opacity: 0 }
                                    : { scale: 1, rotate: 0, opacity: 1 }
                            }
                            transition={
                              emojiHold === 'growing' ? { duration: EMOJI_GROW_MS / 1000, ease: 'easeOut' }
                                : emojiHold === 'warning' ? { rotate: { duration: 0.35, repeat: Infinity }, scale: { duration: 0 } }
                                  : { type: 'spring', stiffness: 500, damping: 22 }
                            }
                          >
                            <ReactionGlyph value={convEmoji} size={22} />
                          </motion.span>
                        </button>
                      )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
                </div>
              </div>

              {(!isMobile || !connected) && (
                <div className="max-w-4xl mx-auto flex justify-between mt-2 px-1">
                  <span className="text-[10px] font-system-code text-on-surface-variant/40 hidden md:inline">Enter to send, Shift+Enter for new line</span>
                  {connected ? (
                    <span className="text-[10px] font-system-code text-green-500/60 flex items-center gap-1 ml-auto">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Uplink stable
                    </span>
                  ) : (
                    <span className="text-[10px] font-system-code text-amber-400 flex items-center gap-1 ml-auto">
                      <span className="material-symbols-outlined text-[14px]">wifi_tethering_off</span>
                      Uplink lost, reconnecting
                    </span>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant/50 p-6 text-center z-10">
            <span className="material-symbols-outlined text-[64px] mb-4 opacity-20">terminal</span>
            <p className="font-system-code text-sm tracking-widest uppercase mb-2 text-glow-active">SchreckNet</p>
            <p className="text-xs max-w-md">Pick a contact, group or NPC to open a conversation.</p>
          </div>
        )}

        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-error-container text-on-error-container px-4 py-2 rounded shadow-lg z-50 flex items-center gap-2 border border-error/50">
            <span className="material-symbols-outlined text-sm">error</span>
            <span className="text-sm font-bold">{error}</span>
            <button onClick={() => setError('')} className="ml-2 hover:opacity-80"><span className="material-symbols-outlined text-sm">close</span></button>
          </div>
        )}

        {/* Message Reactions Modal */}
        {viewingReactionsMsg && createPortal(
          <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setViewingReactionsMsg(null)}
          >
            <div
              className="chat-overlay-surface border border-outline-variant rounded-lg w-full max-w-sm max-h-[75vh] flex flex-col shadow-[0_0_25px_rgba(0,0,0,0.8)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 border-b border-outline-variant/40 shrink-0">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">thumb_up</span>
                  Message Reactions
                </h3>
                <button
                  type="button"
                  onClick={() => setViewingReactionsMsg(null)}
                  className="text-on-surface-variant hover:text-white p-1 rounded transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Reaction filter tabs */}
              <div className="flex items-center gap-1.5 p-2.5 border-b border-outline-variant/30 overflow-x-auto custom-scrollbar shrink-0 bg-surface-container-high/40">
                <button
                  type="button"
                  onClick={() => setSelectedReactionTab('all')}
                  className={`px-2.5 py-1 rounded-full text-xs font-system-code transition-colors flex items-center gap-1 ${
                    selectedReactionTab === 'all'
                      ? 'bg-primary text-on-primary font-bold'
                      : 'bg-surface-container-highest text-on-surface-variant hover:text-white'
                  }`}
                >
                  <span>All</span>
                  <span className="opacity-80">
                    {(reactionsByMsgId[viewingReactionsMsg.id] || []).reduce((acc, r) => acc + (r.count || 0), 0)}
                  </span>
                </button>
                {(reactionsByMsgId[viewingReactionsMsg.id] || []).map(r => (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => setSelectedReactionTab(r.emoji)}
                    className={`px-2.5 py-1 rounded-full text-xs font-system-code transition-colors flex items-center gap-1.5 ${
                      selectedReactionTab === r.emoji
                        ? 'bg-primary text-on-primary font-bold'
                        : 'bg-surface-container-highest text-on-surface-variant hover:text-white'
                    }`}
                  >
                    <ReactionGlyph value={r.emoji} size={13} />
                    <span>{r.count}</span>
                  </button>
                ))}
              </div>

              {/* Reactors list */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
                {(() => {
                  const reactions = reactionsByMsgId[viewingReactionsMsg.id] || [];
                  const filtered = selectedReactionTab === 'all'
                    ? reactions.flatMap(r => (r.reactors || []).map(u => ({ ...u, emoji: r.emoji })))
                    : (reactions.find(r => r.emoji === selectedReactionTab)?.reactors || []).map(u => ({ ...u, emoji: selectedReactionTab }));

                  if (!filtered.length) {
                    return (
                      <div className="text-center py-6 text-on-surface-variant/60 text-xs font-system-code">
                        No reactions recorded
                      </div>
                    );
                  }

                  return filtered.map((u, idx) => (
                    <div
                      key={`${u.id}:${u.emoji}:${idx}`}
                      className="flex items-center justify-between p-2 rounded bg-surface-container-highest/50 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center overflow-hidden border border-outline-variant/30 shrink-0">
                          <Avatar userId={u.npcId ? null : u.id} npcId={u.npcId} size="100%" style={{ width: '100%', height: '100%' }} fallback={localSymlogo(u.clan) || '/img/ATT-logo(1).webp'} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate">{u.name}</span>
                          {u.clan && (
                            <span className="text-[10px] text-primary/80 uppercase font-system-code truncate">{u.clan}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 pl-2">
                        <ReactionGlyph value={u.emoji} size={18} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Full Emoji Reaction Picker Modal */}
        {fullReactionPickerFor && createPortal(
          <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setFullReactionPickerFor(null)}
          >
            <div
              data-reaction-ui="true"
              className="chat-overlay-surface border border-outline-variant rounded-lg w-full max-w-[350px] shadow-[0_0_30px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 border-b border-outline-variant/40 shrink-0 bg-surface-container-highest">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">add_reaction</span>
                  Add Reaction
                </h3>
                <button
                  type="button"
                  onClick={() => setFullReactionPickerFor(null)}
                  className="text-on-surface-variant hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="p-1">
                <React.Suspense fallback={<div className="p-8 text-center text-xs text-on-surface-variant font-system-code">Loading emojis...</div>}>
                  <EmojiPicker
                    theme="dark"
                    onEmojiClick={(emojiData) => {
                      const clanTag = emojiData.isCustom && emojiData.names && emojiData.names[0]
                        ? emojiData.names[0].replace(/\s+/g, '_')
                        : (emojiData.unified || 'unknown');
                      const token = emojiData.isCustom ? `:${clanTag}:` : emojiData.emoji;
                      toggleReaction(fullReactionPickerFor, token);
                      setFullReactionPickerFor(null);
                      setReactionPickerFor(null);
                    }}
                    customEmojis={customClanEmojis}
                    categories={EMOJI_PICKER_CATEGORIES}
                    searchDisabled={false}
                    width="100%"
                    height={380}
                  />
                </React.Suspense>
              </div>
            </div>
          </div>,
          document.body
        )}
        {actionSheetMsg && renderActionSheet()}
        {detailsOpen && selectedContact && renderDetailsPanel()}
      </motion.main>
    </div>
  );
}