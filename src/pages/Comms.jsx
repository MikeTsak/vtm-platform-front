import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import api from '../api';
import { AuthCtx } from '../AuthContext';
import styles from '../styles/Comms.module.css';

/* --- Clan assets & colors (reuse across app) --- */
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

// FIX: Name overrides must match Home.jsx to ensure correct logo file paths.
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };

const symlogo = (c) =>
  c ? `/img/clans/330px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g, '_')}_symbol.png` : '';

export default function Comms() {
  const { user: currentUser } = useContext(AuthCtx);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Smooth scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };
  useEffect(scrollToBottom, [messages]);

  // Fetch contacts
  useEffect(() => {
    api.get('/chat/users')
      .then(res => setUsers(res.data.users || []))
      .catch(() => setError('Could not load users.'))
      .finally(() => setLoading(false));
  }, []);

  // Poll messages for active conversation
  useEffect(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (!selectedUser) return;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/chat/history/${selectedUser.id}`);
        setMessages(res.data.messages || []);
      } catch {
        setError(`Could not load messages with ${selectedUser.display_name}.`);
      }
    };

    fetchMessages();
    pollIntervalRef.current = setInterval(fetchMessages, 3000);

    // mark read (best-effort)
    api.post('/chat/read', { sender_id: selectedUser.id }).catch(() => {});

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [selectedUser]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setMessages([]);
    setError('');
    // On small screens, scroll chat to top when switching
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault?.();
    const body = newMessage.trim();
    if (!body || !selectedUser) return;
    try {
      const { data } = await api.post('/chat/messages', {
        recipient_id: selectedUser.id,
        body
      });
      setMessages(prev => [...prev, data.message]);
      setNewMessage('');
      api.post('/chat/read', { sender_id: selectedUser.id }).catch(() => {});
    } catch {
      setError('Failed to send message.');
    }
  };

  const onInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSendMessage(e);
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const formatDay = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Group messages by day
  const groups = useMemo(() => {
    const g = [];
    let lastDay = '';
    for (const m of messages) {
      const day = formatDay(m.created_at);
      if (day !== lastDay) {
        g.push({ type: 'day', id: `day-${day}-${m.id}`, day });
        lastDay = day;
      }
      g.push({ type: 'msg', ...m });
    }
    return g;
  }, [messages]);

  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.display_name || '').toLowerCase().includes(q) ||
      (u.char_name || '').toLowerCase().includes(q)
    );
  }, [users, filter]);

  if (loading) return <div className={styles.loading}>Loading users…</div>;

  const currentAccent = selectedUser ? (CLAN_COLORS[selectedUser.clan] || '#8a0f1a') : '#8a0f1a';

  return (
    <div className={styles.commsContainer} style={{ '--accent': currentAccent }}>
      {/* Contact list */}
      <aside className={styles.userList} id="comms-contacts">
        <div className={styles.listHeader}>
          <div className={styles.listTitle}>Contacts</div>
          <div className={styles.searchWrap}>
            <input
              className={styles.search}
              placeholder="Search by name or character…"
              value={filter}
              onChange={(e)=>setFilter(e.target.value)}
              aria-label="Search contacts"
            />
          </div>
        </div>

        <div className={styles.usersScroll}>
          {filteredUsers.map(u => {
            const active = selectedUser?.id === u.id;
            const initials = (u.display_name || '?')
              .split(' ')
              .map(p => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();
            const tint = CLAN_COLORS[u.clan] || '#8a0f1a';
            const hasClan = !!u.clan; // New check for clan existence

            return (
              <button
                type="button"
                key={u.id}
                className={`${styles.userCard} ${active ? styles.selected : ''}`}
                onClick={() => handleSelectUser(u)}
                style={{ '--accent': tint }}
              >
                <span 
                  className={styles.avatar} 
                  aria-hidden="true"
                  // NEW: Set white background if there is a clan logo
                  style={hasClan ? { backgroundColor: 'white' } : {}}
                >
                  {/* NEW: Conditional render - either logo OR initials */}
                  {hasClan ? (
                    <img className={styles.avatarImg} src={symlogo(u.clan)} alt={`${u.clan} crest`} />
                  ) : (
                    <span className={styles.initials}>{initials}</span>
                  )}
                </span>
                <span className={styles.userMeta}>
                  <span className={styles.userName}>
                    {u.char_name || 'No character'}
                    {u.clan && <span className={styles.clanChip} style={{ '--chip': tint }}>{u.clan}</span>}
                  </span>
                  <span className={styles.charName}>{u.display_name}</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Chat pane */}
      <main className={styles.chatWindow}>
        {selectedUser ? (
          <>
            <header className={styles.chatHeader} style={{ '--accent': currentAccent }}>
              <div className={styles.chatWith}>
                <span className={styles.chatDot} aria-hidden="true" />
                {/* UPDATED TEXT HERE: Now you are chatting with [Char Name], of the player [Player Name] */}
                Now you are chatting with <b>{selectedUser.char_name}</b>, of the player <b>{selectedUser.display_name}</b>
                {selectedUser.clan && (
                  <span className={styles.charTag} style={{ borderColor: 'color-mix(in oklab, var(--accent) 45%, #2a2a2f)' }}>
                    {selectedUser.clan}
                  </span>
                )}
                <button
                  type="button"
                  className={styles.mobileContactsBtn}
                  onClick={() => {
                    const el = document.getElementById('comms-contacts');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  Contacts
                </button>
              </div>
            </header>

            <div className={styles.messageList} id="chat-scroll-region">
              {groups.map(item => {
                if (item.type === 'day') {
                  return (
                    <div key={item.id} className={styles.dayDivider}>
                      <span>{item.day}</span>
                    </div>
                  );
                }
                const mine = item.sender_id === currentUser.id;
                return (
                  <div
                    key={item.id}
                    className={`${styles.messageRow} ${mine ? styles.right : styles.left}`}
                  >
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

            <form className={styles.messageInputForm} onSubmit={handleSendMessage}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message…"
                className={styles.messageInput}
                onKeyDown={onInputKeyDown}
                aria-label="Message"
              />
              <button
                type="submit"
                className={styles.sendButton}
                disabled={!newMessage.trim()}
                aria-label="Send message"
                style={{ '--accent': currentAccent }}
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className={styles.placeholder}>
            Select a user to start a conversation
          </div>
        )}

        {error && <div className={styles.errorBanner}>{error}</div>}
      </main>
    </div>
  );
}