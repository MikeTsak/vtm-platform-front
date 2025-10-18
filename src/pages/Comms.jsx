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
const symlogo = (c) => (c ? `/img/clans/330px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g, '_')}_symbol.png` : '');

/* Contact shapes */
const asUserContact = (u) => ({ type: 'user', id: u.id, display_name: u.display_name, char_name: u.char_name, clan: u.clan });
const asNpcContact  = (n) => ({ type: 'npc',  id: n.id, name: n.name, clan: n.clan });

export default function Comms() {
  const { user: currentUser } = useContext(AuthCtx);
  const isAdmin = currentUser?.role === 'admin';

  const [users, setUsers] = useState([]);     // player contacts
  const [npcs, setNpcs] = useState([]);       // npc contacts
  const [filter, setFilter] = useState('');

  // selection:
  // - if contact.type==='user' → normal DM between players
  // - if contact.type==='npc':
  //   - player: talk to that NPC
  //   - admin: must also pick a player (selectedPlayerId) to talk to on behalf of the NPC
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null); // only used by admin when contact is NPC

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  /* Smooth scroll on new messages */
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  useEffect(scrollToBottom, [messages]);

  /* Load contacts (players + npcs) */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [{ data: u }, { data: n }] = await Promise.all([
          api.get('/chat/users'),
          api.get('/chat/npcs')
        ]);
        setUsers((u.users || []).map(asUserContact));
        setNpcs((n.npcs || []).map(asNpcContact));
      } catch {
        setError('Could not load contacts.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* Fetch messages (polling every 3s) depending on mode */
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedContact) return;

    const fetchMessages = async () => {
      try {
        if (selectedContact.type === 'user') {
          const res = await api.get(`/chat/history/${selectedContact.id}`);
          setMessages(res.data.messages || []);
          // mark read best-effort
          await api.post('/chat/read', { sender_id: selectedContact.id }).catch(()=>{});
        } else {
          // NPC conversation
          if (isAdmin) {
            if (!selectedPlayerId) { setMessages([]); return; }
            const res = await api.get(`/admin/chat/npc/history`, {
              params: { npc_id: selectedContact.id, user_id: selectedPlayerId }
            });
            // normalize fields to match UI expectations
            const msgs = (res.data.messages || []).map(m => ({
              id: m.id,
              body: m.body,
              created_at: m.created_at,
              sender_id: m.from_side === 'npc' ? 'npc' : selectedPlayerId, // not used for admin coloring, but keeps left/right consistent
              _from: m.from_side, // 'npc' | 'user'
            }));
            setMessages(msgs);
          } else {
            const res = await api.get(`/chat/npc-history/${selectedContact.id}`);
            const msgs = (res.data.messages || []).map(m => ({
              id: m.id,
              body: m.body,
              created_at: m.created_at,
              sender_id: m.from_side === 'user' ? currentUser.id : 'npc',
              _from: m.from_side,
            }));
            setMessages(msgs);
          }
        }
      } catch {
        setError('Could not load messages.');
      }
    };

    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [selectedContact, selectedPlayerId, isAdmin, currentUser?.id]);

  /* Send message according to mode */
  const handleSendMessage = async (e) => {
    e?.preventDefault?.();
    const body = newMessage.trim();
    if (!body || !selectedContact) return;

    try {
      if (selectedContact.type === 'user') {
        const { data } = await api.post('/chat/messages', {
          recipient_id: selectedContact.id,
          body
        });
        setMessages(prev => [...prev, data.message]);
      } else {
        if (isAdmin) {
          if (!selectedPlayerId) return;
          const { data } = await api.post('/admin/chat/npc/messages', {
            npc_id: selectedContact.id,
            user_id: selectedPlayerId,
            body
          });
          // server already returns normalized fields
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
      // players: mark read (best-effort)
      if (selectedContact.type === 'user') {
        api.post('/chat/read', { sender_id: selectedContact.id }).catch(()=>{});
      }
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

  // group messages by day
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

  // Filter contacts
  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = users || [];
    if (!q) return list;
    return list.filter(u =>
      (u.display_name || '').toLowerCase().includes(q) ||
      (u.char_name || '').toLowerCase().includes(q)
    );
  }, [users, filter]);

  const filteredNPCs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = npcs || [];
    if (!q) return list;
    return list.filter(n =>
      (n.name || '').toLowerCase().includes(q) ||
      (n.clan || '').toLowerCase().includes(q)
    );
  }, [npcs, filter]);

  if (loading) return <div className={styles.loading}>Loading contacts…</div>;

  // Accent color by active counterpart (players → their clan; NPC → npc clan)
  const currentAccent = (() => {
    if (!selectedContact) return '#8a0f1a';
    if (selectedContact.type === 'user') return CLAN_COLORS[selectedContact.clan] || '#8a0f1a';
    return CLAN_COLORS[selectedContact.clan] || '#8a0f1a';
  })();

  // Header text (who are we chatting with?)
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

  return (
    <div className={styles.commsContainer} style={{ '--accent': currentAccent }}>
      {/* Contact list */}
      <aside className={styles.userList} id="comms-contacts">
        <div className={styles.listHeader}>
          <div className={styles.listTitle}>Contacts</div>
          <div className={styles.searchWrap}>
            <input
              className={styles.search}
              placeholder="Search players & NPCs…"
              value={filter}
              onChange={(e)=>setFilter(e.target.value)}
              aria-label="Search"
            />
          </div>
        </div>

        <div className={styles.usersScroll}>
          {/* Players */}
          <div className={styles.sectionLabel}>Players</div>
          {filteredUsers.map(u => {
            const active = selectedContact?.type === 'user' && selectedContact?.id === u.id;
            const crest = symlogo(u.clan);
            const initials = (u.display_name || '?').split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
            const tint = CLAN_COLORS[u.clan] || '#8a0f1a';
            return (
              <button
                type="button"
                key={`u-${u.id}`}
                className={`${styles.userCard} ${active ? styles.selected : ''}`}
                onClick={() => { setSelectedContact(u); setSelectedPlayerId(null); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                style={{ '--accent': tint }}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {crest
                    ? <img className={styles.avatarImg} src={crest} alt={`${u.clan || 'Unknown'} crest`} />
                    : <span className={styles.initials}>{initials}</span>}
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

          {/* NPCs */}
          <div className={styles.sectionLabel}>NPCs</div>
          {filteredNPCs.map(n => {
            const active = selectedContact?.type === 'npc' && selectedContact?.id === n.id;
            const crest = symlogo(n.clan);
            const tint = CLAN_COLORS[n.clan] || '#8a0f1a';
            return (
              <button
                type="button"
                key={`n-${n.id}`}
                className={`${styles.userCard} ${active ? styles.selected : ''}`}
                onClick={() => { setSelectedContact(n); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
                <span className={styles.chatDot} aria-hidden="true" />
                Chat with <b>{headerLabel}</b>
                {selectedContact.type === 'npc' && selectedContact.clan && (
                  <span className={styles.charTag}>{selectedContact.clan}</span>
                )}

                {/* Quick jump back to contacts on mobile */}
                <button
                  type="button"
                  className={styles.mobileContactsBtn}
                  onClick={() => document.getElementById('comms-contacts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  Contacts
                </button>
              </div>

              {/* Admin-only: pick target player when talking as an NPC */}
              {isAdmin && selectedContact.type === 'npc' && (
                <div className={styles.adminTargetRow}>
                  <label className={styles.adminTargetLabel}>Reply to player:</label>
                  <select
                    className={styles.adminTargetSelect}
                    value={selectedPlayerId || ''}
                    onChange={(e)=>setSelectedPlayerId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">— Select Player —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.char_name || u.display_name} ({u.display_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                const mine = (() => {
                  if (selectedContact.type === 'user') {
                    return item.sender_id === currentUser.id;
                  }
                  // npc thread:
                  if (isAdmin) return item._from === 'npc'; // admin speaks as npc
                  return item._from === 'user'; // player → user's own messages are "mine"
                })();

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
                onKeyDown={onInputKeyDown}
                aria-label="Message"
                disabled={isAdmin && selectedContact.type === 'npc' && !selectedPlayerId}
              />
              <button
                type="submit"
                className={styles.sendButton}
                disabled={!newMessage.trim() || (isAdmin && selectedContact.type === 'npc' && !selectedPlayerId)}
                aria-label="Send message"
                style={{ '--accent': currentAccent }}
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
