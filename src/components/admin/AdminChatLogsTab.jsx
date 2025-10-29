// src/pages/AdminChatLogsTab.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import api from '../../api';
import styles from '../../styles/Admin.module.css';

/* ---------- VTM Lookups (as requested) ---------- */
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
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };
const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');
const symlogo = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png` : '');
/* -------------------------------------------------- */


/* ==================== CHAT LOGS HELPERS ==================== */

// --- Helper: Debounce Hook ---
const useDebouncedValue = (value, ms = 250) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

// --- Helper: Format Timestamp ---
const formatTimestamp = (ts, includeDate = true) => {
  if (!ts) return '—';
  const date = new Date(ts);
  const optionsDate = { month: 'short', day: 'numeric' };
  const optionsTime = { hour: '2-digit', minute: '2-digit' };
  try {
      // Use Greece time zone explicitly
      const timeZone = 'Europe/Athens';
      return includeDate
        ? date.toLocaleString('en-US', { ...optionsDate, ...optionsTime, timeZone })
        : date.toLocaleTimeString('en-US', { ...optionsTime, timeZone });
  } catch (e) {
      console.error("Error formatting date:", e, "Timestamp:", ts);
      // Fallback formatting
      const fallbackDate = date.toLocaleDateString();
      const fallbackTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Basic time format
      return includeDate ? `${fallbackDate} ${fallbackTime}` : fallbackTime;
  }
};

// --- Helper: Highlight Search Terms ---
const Highlight = ({ text, query }) => {
  const q = String(query || '').trim().toLowerCase();
  const txt = String(text || '');
  if (!q) return <>{txt}</>;
  const lowerText = txt.toLowerCase();
  const parts = [];
  let lastIndex = 0;
  let matchIndex;

  while ((matchIndex = lowerText.indexOf(q, lastIndex)) !== -1) {
    if (matchIndex > lastIndex) { parts.push(<span key={lastIndex}>{txt.substring(lastIndex, matchIndex)}</span>); }
    const matchedText = txt.substring(matchIndex, matchIndex + q.length);
    parts.push(<mark key={matchIndex} className={styles.hl}>{matchedText}</mark>);
    lastIndex = matchIndex + q.length;
  }
  if (lastIndex < txt.length) { parts.push(<span key={lastIndex}>{txt.substring(lastIndex)}</span>); }
  return <>{parts}</>;
};


/* ==================== CHAT LOGS ==================== */

// --- Main Chat Logs Component ---
export default function AdminChatLogsTab({ messages, charIndex }) {
  const [viewMode, setViewMode] = useState('direct'); // 'direct' | 'npc'

  // --- Direct Message State ---
  const [directSearch, setDirectSearch] = useState('');
  const debouncedDirectSearch = useDebouncedValue(directSearch);
  const [selectedConversationKey, setSelectedConversationKey] = useState(null); // e.g., "user1-user2"
  const [currentMessages, setCurrentMessages] = useState([]);
  const [currentParticipants, setCurrentParticipants] = useState({
    user1: 'User 1', user2: 'User 2',
    user1Id: null, user2Id: null, // Keep track of IDs for alignment
    user1Char: '—', user2Char: '—',
    user1Clan: null, user2Clan: null,
  });

  // --- NPC Message State ---
  const [npcList, setNpcList] = useState([]);
  const [npcSearch, setNpcSearch] = useState('');
  const debouncedNpcSearch = useDebouncedValue(npcSearch);
  const [selectedNpc, setSelectedNpc] = useState(null); // { id, name, clan }

  const [convos, setConvos] = useState([]); // Conversations for the selected NPC
  const [npcConvoSearch, setNpcConvoSearch] = useState('');
  const debouncedNpcConvoSearch = useDebouncedValue(npcConvoSearch);
  const [selectedNpcConversation, setSelectedNpcConversation] = useState(null); // { userId, userName, charName, charClan }

  const [currentThread, setCurrentThread] = useState([]);
  const [loading, setLoading] = useState({ npcs: false, convos: false, thread: false });
  const [error, setError] = useState('');

  // Helper to find char info from user ID
  const getCharInfoByUserId = useCallback((userId) => {
    const charEntry = Object.values(charIndex).find(c => c.user_id === Number(userId));
    return charEntry ? {
        name: charEntry.char_name,
        clan: charEntry.clan
    } : { name: '—', clan: '—' };
  }, [charIndex]);


  // --- Process Direct Messages into Conversations ---
  const directConversations = useMemo(() => {
    const groups = new Map();
    for (const msg of messages) {
      const id1 = Number(msg.sender_id);
      const id2 = Number(msg.recipient_id);
      if (!id1 || !id2) continue; // Skip messages without both IDs

      const ids = [id1, id2].sort((a, b) => a - b);
      const key = ids.join('-');
      const msgTimestamp = new Date(msg.created_at).getTime();

      if (!groups.has(key)) {
        const char1Info = getCharInfoByUserId(ids[0]);
        const char2Info = getCharInfoByUserId(ids[1]);

        // Find the full user objects if possible (needed for display names)
        const user1Entry = Object.values(charIndex).find(c => c.user_id === ids[0]) || { display_name: `User ${ids[0]}` };
        const user2Entry = Object.values(charIndex).find(c => c.user_id === ids[1]) || { display_name: `User ${ids[1]}` };

        groups.set(key, {
          key,
          user1Id: ids[0],
          user2Id: ids[1],
          user1Name: user1Entry.display_name, // Use found display name
          user2Name: user2Entry.display_name, // Use found display name
          user1CharName: char1Info.name,
          user2CharName: char2Info.name,
          user1Clan: char1Info.clan,
          user2Clan: char2Info.clan,
          messages: [],
          latestTimestamp: 0,
          latestSnippet: '',
        });
      }
      const group = groups.get(key);
      group.messages.push(msg);
      if (msgTimestamp > group.latestTimestamp) {
        group.latestTimestamp = msgTimestamp;
        group.latestSnippet = msg.body;
      }
    }
    // Sort messages within each group *after* processing all messages
    groups.forEach(group => group.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    // Sort groups by latest message
    return Array.from(groups.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [messages, getCharInfoByUserId, charIndex]); // Added charIndex dependency

  // --- Filter Direct Conversations ---
  const filteredDirectConversations = useMemo(() => {
    const q = debouncedDirectSearch.toLowerCase();
    if (!q) return directConversations;
    return directConversations.filter(convo =>
      (convo.user1Name || '').toLowerCase().includes(q) ||
      (convo.user2Name || '').toLowerCase().includes(q) ||
      (convo.user1CharName || '').toLowerCase().includes(q) ||
      (convo.user2CharName || '').toLowerCase().includes(q) ||
      (convo.user1Clan || '').toLowerCase().includes(q) ||
      (convo.user2Clan || '').toLowerCase().includes(q) ||
      convo.messages.some(msg => (msg.body || '').toLowerCase().includes(q))
    );
  }, [directConversations, debouncedDirectSearch]);

  // --- Handle Selecting Direct Conversation ---
  useEffect(() => {
    if (viewMode !== 'direct' || !selectedConversationKey) {
      setCurrentMessages([]);
      return;
    }
    const convo = directConversations.find(c => c.key === selectedConversationKey);
    if (convo) {
      setCurrentMessages(convo.messages);
      // Store IDs in participants for alignment logic
      setCurrentParticipants({
        user1: convo.user1Name,
        user2: convo.user2Name,
        user1Id: convo.user1Id, // Store ID
        user2Id: convo.user2Id, // Store ID
        user1Char: convo.user1CharName,
        user2Char: convo.user2CharName,
        user1Clan: convo.user1Clan,
        user2Clan: convo.user2Clan,
      });
    } else {
      setCurrentMessages([]);
    }
  }, [selectedConversationKey, directConversations, viewMode]);


  // --- Load NPCs on Mode Switch ---
  useEffect(() => {
    if (viewMode !== 'npc') return;
    let cancelled = false;
    const loadNpcs = async () => {
      setLoading(prev => ({ ...prev, npcs: true })); setError('');
      try {
        let res;
        try { res = await api.get('/admin/npcs'); }
        catch { res = await api.get('/chat/npcs'); } // Fallback
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : (res.data?.npcs || []);
        setNpcList(list.map(n => ({ id: n.id, name: n.name, clan: n.clan })).sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
        if (!cancelled) setError('Failed to load NPCs.');
      } finally {
        if (!cancelled) setLoading(prev => ({ ...prev, npcs: false }));
      }
    };
    loadNpcs();
    return () => { cancelled = true; };
  }, [viewMode]);

  // --- Filter NPCs ---
  const filteredNpcs = useMemo(() => {
    const q = debouncedNpcSearch.toLowerCase();
    if (!q) return npcList;
    return npcList.filter(n => (n.name || '').toLowerCase().includes(q) || (n.clan || '').toLowerCase().includes(q));
  }, [npcList, debouncedNpcSearch]);

  // --- Load Convos for Selected NPC ---
  useEffect(() => {
    if (viewMode !== 'npc' || !selectedNpc?.id) {
      setConvos([]);
      setSelectedNpcConversation(null);
      return;
    }
    let cancelled = false;
    const loadConvos = async () => {
      setLoading(prev => ({ ...prev, convos: true })); setError('');
      try {
        let res;
        try { res = await api.get('/admin/chat/npc/conversations', { params: { npc_id: selectedNpc.id } }); }
        catch { res = await api.get(`/admin/chat/npc-conversations/${selectedNpc.id}`); } // Fallback
        if (cancelled) return;
        const rows = (res.data?.conversations || []).map(r => ({
          userId: r.user_id,
          charName: r.char_name || '',
          charClan: getCharInfoByUserId(r.user_id).clan,
          userName: r.display_name || `User ${r.user_id}`,
          lastMessageAt: r.last_message_at || null,
        }));
        rows.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
        setConvos(rows);
      } catch {
        if (!cancelled) { setError('Failed to load conversations for NPC.'); setConvos([]); }
      } finally {
        if (!cancelled) setLoading(prev => ({ ...prev, convos: false }));
      }
    };
    loadConvos();
    return () => { cancelled = true; };
  }, [viewMode, selectedNpc, getCharInfoByUserId]);

  // --- Filter NPC Convos ---
  const filteredNpcConvos = useMemo(() => {
    const q = debouncedNpcConvoSearch.toLowerCase();
    if (!q) return convos;
    return convos.filter(c =>
      (c.charName || '').toLowerCase().includes(q) ||
      (c.userName || '').toLowerCase().includes(q) ||
      (c.charClan || '').toLowerCase().includes(q)
    );
  }, [convos, debouncedNpcConvoSearch]);

  // --- Load Thread for Selected NPC Conversation ---
  useEffect(() => {
    if (viewMode !== 'npc' || !selectedNpc?.id || !selectedNpcConversation?.userId) {
      setCurrentThread([]);
      return;
    }
    let cancelled = false;
    const loadThread = async () => {
      setLoading(prev => ({ ...prev, thread: true })); setError('');
      try {
        let res;
        try { res = await api.get('/admin/chat/npc/history', { params: { npc_id: selectedNpc.id, user_id: selectedNpcConversation.userId } }); }
        catch { res = await api.get(`/admin/chat/npc-history/${selectedNpc.id}/${selectedNpcConversation.userId}`); } // Fallback
        if (cancelled) return;
        const msgs = (res.data?.messages || []).map(m => ({
          id: m.id,
          body: m.body,
          created_at: m.created_at,
          from: m.from_side // 'npc' | 'user'
        }));
        msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setCurrentThread(msgs);
      } catch {
        if (!cancelled) { setError('Failed to load message thread.'); setCurrentThread([]); }
      } finally {
        if (!cancelled) setLoading(prev => ({ ...prev, thread: false }));
      }
    };
    loadThread();
    return () => { cancelled = true; };
  }, [viewMode, selectedNpc, selectedNpcConversation]);

  // --- Handle Mode Change ---
  const handleModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'direct') {
      setSelectedNpc(null);
      setSelectedNpcConversation(null);
      setConvos([]);
      setCurrentThread([]);
      setNpcSearch('');
      setNpcConvoSearch('');
    } else {
      setSelectedConversationKey(null);
      setCurrentMessages([]);
      setDirectSearch('');
    }
    setError('');
  };

  return (
    <div className={styles.logsContainer} data-mode={viewMode}>
      {/* --- Column 1: Conversation/NPC List --- */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.modeSwitcher}>
            <button
              onClick={() => handleModeChange('direct')}
              className={viewMode === 'direct' ? styles.active : ''}
            >
              Direct Messages
            </button>
            <button
              onClick={() => handleModeChange('npc')}
              className={viewMode === 'npc' ? styles.active : ''}
            >
              NPC Chats
            </button>
          </div>
          <input
            type="search"
            placeholder={viewMode === 'direct' ? "Search conversations..." : "Search NPCs..."}
            value={viewMode === 'direct' ? directSearch : npcSearch}
            onChange={e => viewMode === 'direct' ? setDirectSearch(e.target.value) : setNpcSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.sidebarList}>
          {viewMode === 'direct' && (
            <ConversationList
              conversations={filteredDirectConversations}
              selectedKey={selectedConversationKey}
              onSelect={setSelectedConversationKey}
              searchQuery={debouncedDirectSearch}
            />
          )}
          {viewMode === 'npc' && (
            <NpcList
              npcs={filteredNpcs}
              selectedId={selectedNpc?.id}
              onSelect={setSelectedNpc}
              searchQuery={debouncedNpcSearch}
              loading={loading.npcs}
              error={error && !loading.npcs ? error : ''}
            />
          )}
        </div>
      </aside>

      {/* --- Column 2: NPC Conversation List (NPC Mode Only) --- */}
      {viewMode === 'npc' && (
        <aside className={styles.conversationList}>
          <div className={styles.sidebarHeader}>
            <input
              type="search"
              placeholder={selectedNpc ? `Search convos for ${selectedNpc.name}...` : "Select NPC first"}
              value={npcConvoSearch}
              onChange={e => setNpcConvoSearch(e.target.value)}
              className={styles.searchInput}
              disabled={!selectedNpc}
            />
          </div>
          <div className={styles.sidebarList}>
            <NpcConversationList
              conversations={filteredNpcConvos}
              selectedUserId={selectedNpcConversation?.userId}
              onSelect={setSelectedNpcConversation}
              searchQuery={debouncedNpcConvoSearch}
              loading={loading.convos}
              error={error && loading.npcs ? '' : error}
              npcSelected={!!selectedNpc}
            />
          </div>
        </aside>
      )}

      {/* --- Column 3: Message Panel --- */}
      <main className={styles.messagePanel}>
        {viewMode === 'direct' && selectedConversationKey && (
          <MessagePanel
            messages={currentMessages}
            participants={currentParticipants}
            loading={false}
            error={error}
            mode="direct"
            selectedConversationKey={selectedConversationKey} // Pass key for alignment logic
          />
        )}
        {viewMode === 'npc' && selectedNpcConversation && selectedNpc && (
          <MessagePanel
            messages={currentThread}
            participants={{
              npc: selectedNpc.name,
              npcClan: selectedNpc.clan,
              user: selectedNpcConversation.charName || selectedNpcConversation.userName,
              userClan: selectedNpcConversation.charClan,
            }}
            loading={loading.thread}
            error={error}
            mode="npc"
          />
        )}
        {/* Placeholders */}
        {viewMode === 'direct' && !selectedConversationKey && (
          <div className={styles.placeholderCard}>
            <div className={styles.placeholderDot} />
            <div>
              <h3>Select a Conversation</h3>
              <p className={styles.subtle}>Choose a direct message thread from the list on the left.</p>
            </div>
          </div>
        )}
        {viewMode === 'npc' && !selectedNpc && (
           <div className={styles.placeholderCard}>
            <div className={styles.placeholderDot} />
            <div>
              <h3>Select an NPC</h3>
              <p className={styles.subtle}>Choose an NPC from the list on the far left.</p>
            </div>
          </div>
        )}
        {viewMode === 'npc' && selectedNpc && !selectedNpcConversation && (
           <div className={styles.placeholderCard}>
            <div className={styles.placeholderDot} />
            <div>
              <h3>Select a Conversation</h3>
              <p className={styles.subtle}>Select a thread from the middle panel to view messages.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Component: List of Direct Conversations ---
function ConversationList({ conversations, selectedKey, onSelect, searchQuery }) {
  if (!conversations.length && !searchQuery) {
    return <div className={styles.listEmptyState}>No direct messages found.</div>;
  }
  if (!conversations.length && searchQuery) {
    return <div className={styles.listEmptyState}>No conversations match "{searchQuery}".</div>;
  }

  const formatName = (user, char, clan) => {
    const name = (char && char !== '—') ? char : user;
    const logo = symlogo(clan);
    return (
      <span className={styles.convoName}>
        {logo && <img src={logo} alt={clan || ''} className={styles.convoAvatar} style={{'--clan-color': CLAN_COLORS[clan]}} />}
        <Highlight text={name} query={searchQuery} />
      </span>
    );
  };

  return conversations.map(convo => (
    <button
      key={convo.key}
      className={`${styles.listItem} ${convo.key === selectedKey ? styles.active : ''}`}
      onClick={() => onSelect(convo.key)}
    >
      <div className={styles.listItemText}>
        {formatName(convo.user1Name, convo.user1CharName, convo.user1Clan)}
        <span className={styles.convoSeparator}>&</span>
        {formatName(convo.user2Name, convo.user2CharName, convo.user2Clan)}
      </div>
      <div className={styles.listItemMeta}>
        <span className={styles.snippet}><Highlight text={convo.latestSnippet} query={searchQuery} /></span>
        <span className={styles.timestamp}>{formatTimestamp(convo.latestTimestamp, false)}</span>
      </div>
    </button>
  ));
}

// --- Component: List of NPCs ---
function NpcList({ npcs, selectedId, onSelect, searchQuery, loading, error }) {
  if (loading) return <div className={styles.listEmptyState}>Loading NPCs...</div>;
  if (error) return <div className={`${styles.listEmptyState} ${styles.errorText}`}>{error}</div>;
  if (!npcs.length && !searchQuery) {
    return <div className={styles.listEmptyState}>No NPCs found.</div>;
  }
  if (!npcs.length && searchQuery) {
    return <div className={styles.listEmptyState}>No NPCs match "{searchQuery}".</div>;
  }

  return npcs.map(npc => {
    const clanColor = CLAN_COLORS[npc.clan] || 'var(--text-secondary)';
    const clanLogoUrl = symlogo(npc.clan);
    return (
      <button
        key={npc.id}
        className={`${styles.listItem} ${npc.id === selectedId ? styles.active : ''}`}
        onClick={() => onSelect(npc)}
        style={{'--clan-color': clanColor}}
      >
        {clanLogoUrl && <img src={clanLogoUrl} alt={npc.clan || ''} className={styles.convoAvatar} />}
        <div className={styles.listItemText}>
          <Highlight text={npc.name} query={searchQuery} />
          {npc.clan && <span className={styles.clanChip}><Highlight text={npc.clan} query={searchQuery} /></span>}
        </div>
      </button>
    );
  });
}

// --- Component: List of Conversations for an NPC ---
function NpcConversationList({ conversations, selectedUserId, onSelect, searchQuery, loading, error, npcSelected }) {
  if (!npcSelected) return <div className={styles.listEmptyState}>Select an NPC first.</div>;
  if (loading) return <div className={styles.listEmptyState}>Loading conversations...</div>;
  if (error) return <div className={`${styles.listEmptyState} ${styles.errorText}`}>{error}</div>;
  if (!conversations.length && !searchQuery) {
    return <div className={styles.listEmptyState}>No conversations found for this NPC.</div>;
  }
  if (!conversations.length && searchQuery) {
    return <div className={styles.listEmptyState}>No conversations match "{searchQuery}".</div>;
  }

  return conversations.map(convo => {
    const clanColor = CLAN_COLORS[convo.charClan] || 'var(--text-secondary)';
    const clanLogoUrl = symlogo(convo.charClan);
    return (
      <button
        key={convo.userId}
        className={`${styles.listItem} ${convo.userId === selectedUserId ? styles.active : ''}`}
        onClick={() => onSelect(convo)}
        style={{'--clan-color': clanColor}}
      >
        {clanLogoUrl && <img src={clanLogoUrl} alt={convo.charClan || ''} className={styles.convoAvatar} />}
        <div className={styles.listItemText}>
          <Highlight text={convo.charName || convo.userName} query={searchQuery} />
        </div>
        <div className={styles.listItemMeta}>
          {convo.charName && convo.userName !== convo.charName && <span className={styles.snippet}><Highlight text={convo.userName} query={searchQuery} /></span>}
          <span className={styles.timestamp}>{formatTimestamp(convo.lastMessageAt, true)}</span>
        </div>
      </button>
    );
  });
}


// --- Component: Message Display Panel ---
function MessagePanel({ messages, participants, loading, error, mode, selectedConversationKey }) { // Added selectedConversationKey
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages, participants]); // Keep both dependencies

  const getParticipantsDisplay = () => {
    if (mode === 'direct') {
      const name1 = participants.user1Char && participants.user1Char !== '—' ? `${participants.user1Char} (${participants.user1})` : participants.user1;
      const name2 = participants.user2Char && participants.user2Char !== '—' ? `${participants.user2Char} (${participants.user2})` : participants.user2;
      return <>{name1} <span className={styles.convoSeparator}>↔</span> {name2}</>;
    } else {
      return <>{participants.npc} <span className={styles.convoSeparator}>↔</span> {participants.user}</>;
    }
  };

  // --- MODIFIED getBubbleSender ---
  const getBubbleSender = useCallback((message) => {
    if (mode === 'direct') {
      // User1 is always the one with the lower ID from the key "id1-id2"
      // Messages *from* user1 should appear on the right (isSent = true)
      const user1Id = participants.user1Id; // Get ID from participants state
      const isSentByPrimaryUser = message.sender_id === user1Id;

      const senderIsUser1 = message.sender_id === participants.user1Id;
      const charName = senderIsUser1 ? participants.user1Char : participants.user2Char;
      const displayName = senderIsUser1 ? participants.user1 : participants.user2;

      return {
        name: (charName && charName !== '—') ? charName : displayName,
        clan: senderIsUser1 ? participants.user1Clan : participants.user2Clan,
        isSent: isSentByPrimaryUser, // True if sender is user1 (lower ID)
      };
    } else { // mode === 'npc'
      const isSentByNpc = message.from === 'npc'; // NPC messages go right
      return {
        name: isSentByNpc ? participants.npc : participants.user,
        clan: isSentByNpc ? participants.npcClan : participants.userClan,
        isSent: isSentByNpc,
      };
    }
  }, [mode, participants]); // Dependencies for useCallback
  // --- END MODIFIED getBubbleSender ---


  return (
    <>
      <div className={styles.messagePanelHeader}>
        {getParticipantsDisplay()}
      </div>
      <div className={styles.messageList}>
        {loading && <div className={styles.listEmptyState}>Loading messages...</div>}
        {error && !loading && <div className={`${styles.listEmptyState} ${styles.errorText}`}>{error}</div>}
        {!loading && !error && messages.map((msg, index) => {

          const sender = getBubbleSender(msg); // Uses the updated logic

          let showSender = false;
          if (index === 0) {
            showSender = true;
          } else {
            // Ensure prevSender uses the same logic
            const prevMessage = messages[index-1];
            // Need to handle potential undefined prevMessage if array is modified unexpectedly
            if (prevMessage) {
                const prevSender = getBubbleSender(prevMessage);
                showSender = sender.name !== prevSender.name;
            } else {
                showSender = true; // Default to showing if previous message is missing
            }
          }

          return (
             <MessageBubble
                key={msg.id || index}
                message={msg}
                isSent={sender.isSent} // Passed correctly to MessageBubble
                senderName={sender.name}
                senderClan={sender.clan}
                showSender={showSender}
             />
          );
        })}
         {!loading && !error && messages.length === 0 && (
           <div className={styles.listEmptyState}>No messages in this conversation yet.</div>
         )}
        <div ref={messagesEndRef} />
      </div>
    </>
  );
}

// --- Component: Single Message Bubble ---
function MessageBubble({ message, isSent, senderName, senderClan, showSender }) {
   const clanColor = CLAN_COLORS[senderClan] || 'var(--accent-purple)'; // Fallback color

   return (
      <div className={`${styles.messageRow} ${isSent ? styles.sentRow : styles.receivedRow}`}>
         <div className={styles.messageBubble} title={formatTimestamp(message.created_at, true)}>
           {showSender && <div className={styles.senderName} style={{color: clanColor}}>{senderName}</div>}
           <div className={styles.messageBody}>{message.body}</div>
           <div className={styles.messageTime}>{formatTimestamp(message.created_at, false)}</div>
         </div>
      </div>
   );
 }