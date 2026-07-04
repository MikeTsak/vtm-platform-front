// src/pages/AdminChatLogsTab.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown'; 
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';

/* ---------- VTM Lookups ---------- */
const CLAN_COLORS = {
  Brujah: '#b40f1f', Gangrel: '#2f7a3a', Malkavian: '#713c8b', Nosferatu: '#6a4b2b',
  Toreador: '#b8236b', Tremere: '#7b1113', Ventrue: '#1b4c8c', 'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b', Lasombra: '#191a5a', 'The Ministry': '#865f12',
  Caitiff: '#636363', 'Thin-blood': '#6e6e2b',
};
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };
const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');
const symlogo = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png` : '');

/* ==================== HELPERS ==================== */
const useDebouncedValue = (value, ms = 250) => {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
};

const formatTimestamp = (ts, includeDate = true) => {
  if (!ts) return '—';
  const date = new Date(ts);
  const options = { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' };
  if (includeDate) { Object.assign(options, { month: 'short', day: 'numeric' }); }
  try { return date.toLocaleString('en-US', options); } 
  catch (e) { return date.toLocaleTimeString(); }
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

/* --- CHAT IMAGE COMPONENT --- */
const ChatImage = ({ attachmentId }) => {
  const [prevId, setPrevId] = useState(attachmentId);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Adjust state inline during render if the prop changes
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

  if (loading) return <div style={{ display: 'flex', padding: '1rem', justifyContent: 'center' }}><span className={styles.spinner} style={{ width: '20px', height: '20px', borderWidth: '2px' }} /></div>;
  if (error) return <div style={{ fontSize: '0.8rem', color: 'var(--color-error)', margin: '8px 0', padding: '6px 12px', background: 'rgba(255,77,77,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,77,77,0.1)' }}>⚠ Media Link Unavailable</div>;

  return (
    <img 
      src={imageUrl} 
      alt="Attachment" 
      style={{
        maxWidth: '100%', maxHeight: '350px', borderRadius: 'var(--radius-sm)',
        marginTop: '8px', marginBottom: '8px', cursor: 'pointer',
        border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)', display: 'block'
      }}
      onClick={() => window.open(imageUrl, '_blank')}
    />
  );
};

/* ==================== MAIN COMPONENT ==================== */
export default function AdminChatLogsTab({ messages, charIndex }) {
  const [viewMode, setViewMode] = useState('direct');
  
  // State: Direct
  const [directSearch, setDirectSearch] = useState('');
  const debouncedDirectSearch = useDebouncedValue(directSearch);
  const [selectedConversationKey, setSelectedConversationKey] = useState(null);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [currentParticipants, setCurrentParticipants] = useState({});

  // State: NPC
  const [npcList, setNpcList] = useState([]);
  const [npcSearch, setNpcSearch] = useState('');
  const debouncedNpcSearch = useDebouncedValue(npcSearch);
  const [selectedNpc, setSelectedNpc] = useState(null);
  const [convos, setConvos] = useState([]);
  const [npcConvoSearch, setNpcConvoSearch] = useState('');
  const debouncedNpcConvoSearch = useDebouncedValue(npcConvoSearch);
  const [selectedNpcConversation, setSelectedNpcConversation] = useState(null);
  const [currentThread, setCurrentThread] = useState([]);

  // State: Group
  const [groupList, setGroupList] = useState([]);
  const [groupSearch, setGroupSearch] = useState('');
  const debouncedGroupSearch = useDebouncedValue(groupSearch);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupThread, setGroupThread] = useState([]);

  // State: Global AI
  const [globalSummary, setGlobalSummary] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [loading, setLoading] = useState({});

  const getCharInfoByUserId = useCallback((userId) => {
    const charEntry = Object.values(charIndex).find(c => c.user_id === Number(userId));
    return charEntry ? { name: charEntry.char_name, clan: charEntry.clan } : { name: '—', clan: '—' };
  }, [charIndex]);

  // --- AI: Global Summarize Handler ---
  const handleGlobalSummarize = async () => {
    if (!messages || !messages.length) return alert("No messages to summarize.");
    setGlobalLoading(true);
    
    try {
      const sorted = [...messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const recent = sorted.slice(-100); 

      const chatText = recent.map(m => {
        let sender = 'Unknown Character';
        if (m.from === 'npc') { sender = m.sender_name || 'NPC'; } 
        else {
          if (m.char_name) { sender = m.char_name; } 
          else if (m.sender_id) {
            const info = getCharInfoByUserId(m.sender_id);
            if (info.name && info.name !== '—') sender = info.name;
          }
        }
        return `[${new Date(m.created_at).toLocaleString()}] ${sender}: ${m.body}`;
      }).join('\n');

      const { data } = await api.post('/admin/chat/summarize', { 
        text: chatText, 
        context: "The last 100 messages exchanged in the game (Global Activity Log)" 
      });
      setGlobalSummary(data.summary);
    } catch (err) {
      alert('Global Summary Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setGlobalLoading(false);
    }
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
          messages: [], latestTimestamp: 0, latestSnippet: '',
        });
      }
      const group = groups.get(key);
      group.messages.push(msg);
      if (msgTimestamp > group.latestTimestamp) {
        group.latestTimestamp = msgTimestamp;
        group.latestSnippet = msg.body;
      }
    }
    groups.forEach(g => g.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
    return Array.from(groups.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [messages, getCharInfoByUserId, charIndex]);

  const filteredDirect = useMemo(() => {
    const q = debouncedDirectSearch.toLowerCase();
    if (!q) return directConversations;
    return directConversations.filter(c => 
      (c.user1Name||'').toLowerCase().includes(q) || (c.user2Name||'').toLowerCase().includes(q) ||
      (c.user1CharName||'').toLowerCase().includes(q) || (c.user2CharName||'').toLowerCase().includes(q) ||
      c.messages.some(m => (m.body||'').toLowerCase().includes(q))
    );
  }, [directConversations, debouncedDirectSearch]);

  // --- LOADERS & EFFECTS ---
  useEffect(() => {
    if (viewMode !== 'direct' || !selectedConversationKey) { setCurrentMessages([]); return; }
    const convo = directConversations.find(c => c.key === selectedConversationKey);
    if (convo) {
      setCurrentMessages(convo.messages);
      setCurrentParticipants({
        threadKey: selectedConversationKey, // Important for scrolling
        user1: convo.user1Name, user2: convo.user2Name,
        user1Id: convo.user1Id, user2Id: convo.user2Id,
        user1Char: convo.user1CharName, user2Char: convo.user2CharName,
        user1Clan: convo.user1Clan, user2Clan: convo.user2Clan,
      });
    }
  }, [selectedConversationKey, directConversations, viewMode]);

  useEffect(() => {
    if (viewMode !== 'npc') return;
    api.get('/admin/npcs').then(res => {
      const list = (res.data.npcs || res.data || []).map(n => ({ id: n.id, name: n.name, clan: n.clan }));
      setNpcList(list.sort((a,b) => a.name.localeCompare(b.name)));
    }).catch(() => {});
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== 'npc' || !selectedNpc) { setConvos([]); return; }
    setLoading(p => ({...p, convos: true}));
    const url = `/admin/chat/npc/conversations?npc_id=${selectedNpc.id}`;
    api.get(url).then(res => {
      const rows = (res.data.conversations||[]).map(r => ({
        userId: r.user_id, charName: r.char_name||'', charClan: getCharInfoByUserId(r.user_id).clan,
        userName: r.display_name || `User ${r.user_id}`, lastMessageAt: r.last_message_at
      }));
      setConvos(rows.sort((a,b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)));
    }).finally(() => setLoading(p => ({...p, convos: false})));
  }, [selectedNpc, viewMode, getCharInfoByUserId]);

  useEffect(() => {
    if (viewMode !== 'npc' || !selectedNpc || !selectedNpcConversation) { setCurrentThread([]); return; }
    setLoading(p => ({...p, thread: true}));
    const url = `/admin/chat/npc/history?npc_id=${selectedNpc.id}&user_id=${selectedNpcConversation.userId}`;
    api.get(url).then(res => {
      const msgs = (res.data.messages||[]).map(m => ({ 
        id: m.id, body: m.body, created_at: m.created_at, from: m.from_side, attachment_id: m.attachment_id 
      }));
      setCurrentThread(msgs.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)));
    }).finally(() => setLoading(p => ({...p, thread: false})));
  }, [selectedNpc, selectedNpcConversation, viewMode]);

  useEffect(() => {
    if (viewMode !== 'group') return;
    api.get('/admin/chat/groups').then(res => setGroupList(res.data.groups||[])).catch(() => {});
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== 'group' || !selectedGroup) { setGroupThread([]); return; }
    setLoading(p => ({...p, groupThread: true}));
    api.get(`/admin/chat/groups/${selectedGroup.id}/history`).then(res => {
      setGroupThread((res.data.messages||[]));
    }).finally(() => setLoading(p => ({...p, groupThread: false})));
  }, [selectedGroup, viewMode]);

  // --- FILTER LISTS ---
  const filteredNpcs = useMemo(() => {
    const q = debouncedNpcSearch.toLowerCase();
    return npcList.filter(n => (n.name||'').toLowerCase().includes(q));
  }, [npcList, debouncedNpcSearch]);

  const filteredConvos = useMemo(() => {
    const q = debouncedNpcConvoSearch.toLowerCase();
    return convos.filter(c => (c.charName||'').toLowerCase().includes(q) || (c.userName||'').toLowerCase().includes(q));
  }, [convos, debouncedNpcConvoSearch]);

  const filteredGroups = useMemo(() => {
    const q = debouncedGroupSearch.toLowerCase();
    return groupList.filter(g => (g.name||'').toLowerCase().includes(q));
  }, [groupList, debouncedGroupSearch]);

  const handleModeChange = (m) => {
    setViewMode(m);
    setSelectedNpc(null); setSelectedConversationKey(null); setSelectedGroup(null);
    setNpcSearch(''); setDirectSearch(''); setGroupSearch('');
  };

  return (
    <div style={{ display: 'flex', height: '78vh', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', overflow: 'hidden', boxShadow: 'var(--glass-shadow)' }}>
      
      {/* SIDEBAR: LISTS */}
      <aside style={{ width: '380px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
          <button 
            className={styles.globalRecapBtn} 
            onClick={handleGlobalSummarize}
            disabled={globalLoading}
          >
            {globalLoading ? <span className={styles.spinner} style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> : '✨ Global AI Recap'}
          </button>

          <div className={styles.modeSwitcher}>
            {['direct','npc','group'].map(m => (
              <button 
                key={m} 
                onClick={() => handleModeChange(m)} 
                style={{ 
                  flex: 1, padding: '0.6rem 0.5rem', border: 'none', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, 
                  background: viewMode === m ? 'linear-gradient(135deg, var(--accent-purple-dark) 0%, var(--accent-purple) 100%)' : 'transparent',
                  color: viewMode === m ? 'var(--text-color)' : 'var(--text-secondary)', 
                  transition: 'all 0.2s',
                  boxShadow: viewMode === m ? '0 4px 15px var(--accent-purple-glow)' : 'none'
                }}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <input 
            type="search" placeholder="Search wiretap..." className={styles.input}
            value={viewMode==='direct'?directSearch:viewMode==='npc'?npcSearch:groupSearch}
            onChange={e => {
              const v = e.target.value;
              if (viewMode==='direct') setDirectSearch(v);
              else if (viewMode==='npc') setNpcSearch(v);
              else setGroupSearch(v);
            }}
          />
        </div>
        <div className={styles.sidebarList} style={{ overflowY: 'auto', flex: 1 }}>
          {viewMode === 'direct' && <ConversationList list={filteredDirect} selected={selectedConversationKey} onSelect={setSelectedConversationKey} query={debouncedDirectSearch} />}
          {viewMode === 'npc' && <NpcList list={filteredNpcs} selected={selectedNpc?.id} onSelect={setSelectedNpc} query={debouncedNpcSearch} />}
          {viewMode === 'group' && <GroupList list={filteredGroups} selected={selectedGroup?.id} onSelect={setSelectedGroup} query={debouncedGroupSearch} />}
        </div>
      </aside>

      {/* MIDDLE: NPC CONVOS */}
      {viewMode === 'npc' && (
        <aside style={{ width: '320px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.45)', flexShrink: 0 }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
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
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--glass-inset)' }}>
        {viewMode === 'direct' && selectedConversationKey && (
          <MessagePanel messages={currentMessages} participants={currentParticipants} mode="direct" />
        )}
        {viewMode === 'npc' && selectedNpcConversation && (
          <MessagePanel 
            messages={currentThread} 
            participants={{
              threadKey: selectedNpcConversation.userId,
              npc: selectedNpc?.name, npcClan: selectedNpc?.clan,
              user: selectedNpcConversation.charName || 'Unknown Character', userClan: selectedNpcConversation.charClan
            }} 
            mode="npc" loading={loading.thread}
          />
        )}
        {viewMode === 'group' && selectedGroup && (
          <MessagePanel 
            messages={groupThread} 
            participants={{ threadKey: selectedGroup.id, groupName: selectedGroup.name }} 
            mode="group" loading={loading.groupThread}
          />
        )}
        
        {((viewMode === 'direct' && !selectedConversationKey) || (viewMode === 'npc' && !selectedNpcConversation) || (viewMode === 'group' && !selectedGroup)) && (
          <div className={styles.placeholderCard}>
            <span style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem', display: 'block' }}>💬</span>
            <h3>Select a Transmission</h3>
            <p className={styles.subtle}>Choose a thread to view the full history and secure AI summary insights.</p>
          </div>
        )}
      </main>

      {/* --- GLOBAL SUMMARY MODAL --- */}
      {globalSummary && <GlobalSummaryModal summary={globalSummary} onClose={() => setGlobalSummary(null)} />}
    </div>
  );
}

/* ==================== SUB-COMPONENTS ==================== */

const ConversationList = ({ list, selected, onSelect, query }) => list.map(c => {
  const isSelected = c.key === selected;
  const renderName = (name, clan) => (
    <span style={{ color: CLAN_COLORS[clan] || 'var(--text-color)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      {symlogo(clan) && <img src={symlogo(clan)} alt="" style={{ width:'16px', height:'16px', filter: `drop-shadow(0 0 4px ${CLAN_COLORS[clan] || 'var(--text-color)'})` }} />}
      <Highlight text={name} query={query}/>
    </span>
  );

  return (
    <button 
      key={c.key} onClick={() => onSelect(c.key)}
      style={{
        display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left', width: '100%', 
        padding: '1.2rem 1.5rem', cursor: 'pointer', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)',
        background: isSelected ? 'linear-gradient(90deg, rgba(157, 124, 255, 0.15) 0%, transparent 100%)' : 'transparent',
        borderLeft: isSelected ? '4px solid var(--accent-purple)' : '4px solid transparent',
        transition: 'background 0.2s ease'
      }}
      onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
        {renderName(c.user1CharName||c.user1Name, c.user1Clan)}
        <span style={{ margin:'0 8px', color:'var(--text-muted)' }}>↔</span>
        {renderName(c.user2CharName||c.user2Name, c.user2Clan)}
      </div>
      <div className={styles.messageTime} style={{ marginTop: 0, textAlign: 'left', color: 'var(--text-secondary)' }}>{formatTimestamp(c.latestTimestamp, true)}</div>
    </button>
  );
});

const NpcList = ({ list, selected, onSelect, query }) => list.map(n => {
  const isSelected = n.id === selected;
  return (
    <button 
      key={n.id} onClick={() => onSelect(n)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', width: '100%', textAlign: 'left',
        padding: '1.2rem 1.5rem', cursor: 'pointer', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)',
        background: isSelected ? 'linear-gradient(90deg, rgba(157, 124, 255, 0.15) 0%, transparent 100%)' : 'transparent',
        borderLeft: isSelected ? '4px solid var(--accent-purple)' : '4px solid transparent',
        transition: 'background 0.2s ease'
      }}
      onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      {symlogo(n.clan) && <img src={symlogo(n.clan)} style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--text-color)', padding: '2px', border: `2px solid ${CLAN_COLORS[n.clan] || 'var(--text-color)'}` }} alt=""/>}
      <span style={{ color: CLAN_COLORS[n.clan] || 'var(--text-color)', fontWeight: 800, fontSize: '1.05rem' }}>
        <Highlight text={n.name} query={query}/>
      </span>
    </button>
  );
});

const NpcConvoList = ({ list, selected, onSelect, query }) => list.map(c => {
  const isSelected = c.userId === selected;
  return (
    <button 
      key={c.userId} onClick={() => onSelect(c)}
      style={{
        display: 'flex', gap: '12px', alignItems: 'center', width: '100%', textAlign: 'left', overflow: 'hidden',
        padding: '1rem 1.25rem', cursor: 'pointer', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)',
        background: isSelected ? 'linear-gradient(90deg, rgba(157, 124, 255, 0.15) 0%, transparent 100%)' : 'transparent',
        borderLeft: isSelected ? '4px solid var(--accent-purple)' : '4px solid transparent',
        transition: 'background 0.2s ease'
      }}
      onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      {symlogo(c.charClan) && <img src={symlogo(c.charClan)} style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--text-color)', padding: '2px', border: `2px solid ${CLAN_COLORS[c.charClan] || 'var(--text-color)'}` }} alt=""/>}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
        <span style={{ color: CLAN_COLORS[c.charClan] || 'var(--text-color)', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <Highlight text={c.charName||c.userName} query={query}/>
        </span>
        <span className={styles.messageTime} style={{ marginTop: '4px', textAlign: 'left', color: 'var(--text-secondary)' }}>{formatTimestamp(c.lastMessageAt, true)}</span>
      </div>
    </button>
  );
});

const GroupList = ({ list, selected, onSelect, query }) => list.map(g => {
  const isSelected = g.id === selected;
  return (
    <button 
      key={g.id} onClick={() => onSelect(g)}
      style={{
        width: '100%', textAlign: 'left', padding: '1.2rem 1.5rem', cursor: 'pointer', border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        background: isSelected ? 'linear-gradient(90deg, rgba(157, 124, 255, 0.15) 0%, transparent 100%)' : 'transparent',
        borderLeft: isSelected ? '4px solid var(--accent-purple)' : '4px solid transparent',
        transition: 'background 0.2s ease'
      }}
      onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ fontWeight: 800, color: 'var(--text-color)', fontSize: '1.05rem' }}><Highlight text={g.name} query={query}/></div>
    </button>
  );
});

/* ==================== GLOBAL SUMMARY MODAL ==================== */
function GlobalSummaryModal({ summary, onClose }) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', height: 'auto', maxHeight: '90vh' }}>
        <div className={styles.modalHeader}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-color)' }}>🌍 Global Activity Recap</h3>
            <p className={styles.subtle} style={{ margin: '4px 0 0 0' }}>AI summary of the last 100 messages across all operational grid frequencies.</p>
          </div>
          <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.4rem', width: '36px', height: '36px', borderRadius: '50%' }} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.markdownBody} style={{ padding: '1.5rem', background: 'var(--glass-inset)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>Terminate View</button>
        </div>
      </div>
    </div>
  );
}

/* ==================== MESSAGE PANEL (WITH AI) ==================== */
function MessagePanel({ messages, participants, loading, mode }) { 
  const messagesEndRef = useRef(null);
  const [summary, setSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // AUTO-SCROLL FIX: Only snap to bottom when the thread context switches.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [participants.threadKey]);

  const handleSummarize = async () => {
    if (!messages.length) return;
    setAiLoading(true); setSummary(null);

    try {
      const chatText = messages.map(m => {
        let sender = 'Unknown Character';
        if (mode === 'direct') {
          if (m.sender_id === participants.user1Id) { sender = participants.user1Char && participants.user1Char !== '—' ? participants.user1Char : 'Character A'; } 
          else if (m.sender_id === participants.user2Id) { sender = participants.user2Char && participants.user2Char !== '—' ? participants.user2Char : 'Character B'; }
        } else if (mode === 'npc') {
          if (m.from === 'npc') { sender = participants.npc || 'NPC'; } 
          else { sender = participants.user || 'Character'; }
        } else if (mode === 'group') {
          sender = m.char_name || 'Unknown Character';
        }
        return `[${new Date(m.created_at).toLocaleTimeString()}] ${sender}: ${m.body}`;
      }).join('\n');

      let contextStr = '';
      if (mode === 'direct') contextStr = `${participants.user1Char||'Char A'} and ${participants.user2Char||'Char B'}`;
      else if (mode === 'npc') contextStr = `NPC ${participants.npc} and ${participants.user}`;
      else if (mode === 'group') contextStr = `Group ${participants.groupName}`;

      const { data } = await api.post('/admin/chat/summarize', { text: chatText, context: contextStr });
      setSummary(data.summary);
      
      setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 150);
    } catch (err) { alert('AI Error: ' + (err.response?.data?.error || err.message)); } 
    finally { setAiLoading(false); }
  };

  const getHeaderTitle = () => {
    if (mode === 'direct') {
      const c1 = participants.user1Clan; const c2 = participants.user2Clan;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', fontWeight: 800 }}>
          <span style={{color: CLAN_COLORS[c1] || 'var(--text-color)'}}>{participants.user1Char||participants.user1}</span>
          <span style={{color:'var(--text-muted)'}}>↔</span>
          <span style={{color: CLAN_COLORS[c2] || 'var(--text-color)'}}>{participants.user2Char||participants.user2}</span>
        </div>
      );
    }
    if (mode === 'group') return <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-color)' }}>{participants.groupName}</span>;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', fontWeight: 800 }}>
        <span style={{color: CLAN_COLORS[participants.npcClan] || 'var(--text-color)'}}>{participants.npc}</span>
        <span style={{color:'var(--text-muted)'}}>↔</span>
        <span style={{color: CLAN_COLORS[participants.userClan] || 'var(--text-color)'}}>{participants.user}</span>
      </div>
    );
  };

  return (
    <>
      <div style={{ display: 'flex', padding: '1.5rem', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--glass-border)', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, zIndex: 10 }}>
        {getHeaderTitle()}
        <button className={styles.aiButton} onClick={handleSummarize} disabled={aiLoading || !messages || messages.length === 0}>
          {aiLoading ? <span className={styles.spinner} style={{ width: '16px', height: '16px', borderWidth: '2px', marginRight: '8px', margin: 0 }} /> : '✨'}
          {aiLoading ? 'Analyzing...' : 'AI Thread Summary'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading && <div className={styles.loading}><span className={styles.spinner} /> Extracting transmission stream...</div>}
        
        {!loading && messages.map((msg, i) => {
          let isSent = false; let name = 'Unknown'; let clan = null;

          if (mode === 'direct') {
            const isUser1 = msg.sender_id === participants.user1Id;
            isSent = isUser1; name = isUser1 ? (participants.user1Char||participants.user1) : (participants.user2Char||participants.user2); clan = isUser1 ? participants.user1Clan : participants.user2Clan;
          } else if (mode === 'npc') {
            isSent = msg.from === 'npc'; name = isSent ? participants.npc : participants.user; clan = isSent ? participants.npcClan : participants.userClan;
          } else {
             name = msg.char_name || msg.display_name; clan = msg.clan;
          }

          const showSender = i === 0 || messages[i-1].sender_id !== msg.sender_id || messages[i-1].from !== msg.from;

          return (
            <div key={i} className={`${styles.messageRow} ${isSent ? styles.sentRow : styles.receivedRow}`}>
              <div className={styles.messageBubble}>
                {showSender && <div className={styles.senderName} style={{ color: CLAN_COLORS[clan] || 'var(--text-secondary)' }}>{name}</div>}
                {msg.attachment_id && <ChatImage attachmentId={msg.attachment_id} />}
                <div style={{ color: isSent ? 'var(--text-color)' : 'var(--text-primary)', wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.body}</div>
                <div className={styles.messageTime}>{formatTimestamp(msg.created_at, false)}</div>
              </div>
            </div>
          );
        })}

        {summary && (
          <div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--accent-purple)', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginTop: '1rem', boxShadow: '0 8px 30px rgba(157, 124, 255, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--accent-purple)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>🤖 System AI Output</span>
              <button onClick={() => setSummary(null)} className={styles.btnGhost} style={{ border: 'none', background: 'transparent', padding: '0 0.5rem', fontSize: '1.5rem' }}>×</button>
            </div>
            <div style={{ padding: '1.5rem', background: 'var(--glass-inset)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)' }}>
              <div className={styles.markdownBody}><ReactMarkdown>{summary}</ReactMarkdown></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </>
  );
}