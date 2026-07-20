// src/pages/Admin.jsx
import React, { useEffect, useState, useCallback } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import 'leaflet/dist/leaflet.css';

// Core Components (already exist, unchanged)
import CharacterEditor from '../character/CharacterEditor';
import AdminLogs from './AdminLogs';
import ChatStatsTab from './ChatStatsTab';

// Tab Components (Newly broken out)
import AdminUsersTab from './AdminUsersTab';
import AdminCharactersTab from './AdminCharactersTab';
import AdminClaimsTab from './AdminClaimsTab';
import AdminDowntimesTab from './AdminDowntimesTab';
import AdminXPTab from './AdminXPTab';
import AdminNPCsTab from './AdminNPCsTab';
import AdminChatLogsTab from './AdminChatLogsTab';
import AdminDiceLogsTab from './AdminDiceLogsTab'; 
import AdminDiscordTab from './AdminDiscordTab'; 
import AdminNpcEmailTab from './AdminNpcEmailTab';
import AdminMasterTab from './AdminMasterTab';
import AdminGhoulsTab from './AdminGhoulsTab';
import AdminPremonitionsTab from './AdminPremonitionsTab';
import AdminBoonsTab from './AdminBoonsTab';
import AdminEventsTab from './AdminEventsTab';
import AdminBroadcastTab from './AdminBroadcastTab';
import AdminTimelineTab from './AdminTimelineTab';
import AdminDomainsTab from './AdminDomainsTab';
import AdminBloodWebTab from './AdminBloodWebTab';
import AdminMasqueradeTab from './AdminMasqueradeTab';
import AdminPrestationTab from './AdminPrestationTab';
import AdminCoteriesTab from './AdminCoteriesTab';
import AdminAuditTab from './AdminAuditTab';

/* ---------------- Sidebar navigation config ---------------- */
const NAV_SECTIONS = [
  {
    label: 'Players',
    items: [
      { id: 'users',      icon: 'person', label: 'Users', keywords: ['accounts', 'passwords', 'emails', 'roles', 'login', 'reset password', 'delete user', 'ban', 'unban', 'discord id', 'st role', 'vip role', 'admin role'] },
      { id: 'characters', icon: 'account_circle', label: 'Characters', keywords: ['sheets', 'stats', 'pdf', 'inventory', 'traits', 'disciplines', 'blood potency', 'generation', 'clan', 'sect', 'sire', 'approvals', 'merits', 'flaws', 'health', 'willpower', 'humanity', 'export', 'delete', 'add character'] },
      { id: 'claims',     icon: 'local_police', label: 'Claims', keywords: ['territory', 'domain', 'map', 'havens', 'feeding grounds', 'racks', 'businesses', 'resources', 'influence'] },
      { id: 'coteries',   icon: 'group_work', label: 'Coteries', keywords: ['groups', 'factions', 'alliances', 'coterie type', 'domain size', 'chantry', 'shared resources', 'members'] },
      { id: 'ghouls',     icon: 'pets', label: 'Ghouls', keywords: ['retainers', 'thralls', 'servants', 'domitor', 'blood bonds', 'ghoul sheet', 'disciplines', 'tier', 'player'] },
      { id: 'downtimes',  icon: 'schedule', label: 'Downtimes', keywords: ['actions', 'between sessions', 'projects', 'approve', 'reject', 'needs scene', 'resolve', 'filter pipelines', 'reset configuration', 'sync records'] },
      { id: 'xp',         icon: 'stars', label: 'XP & Rewards', keywords: ['experience', 'levels', 'progression', 'grants', 'apply to all', 'view history', 'refresh data', 'subtract xp', 'bulk grant'] },
    ],
  },
  {
    label: 'World',
    items: [
      { id: 'npcs',       icon: 'recent_actors', label: 'NPCs', keywords: ['spc', 'storyteller characters', 'cast', 'add temp actor', 'stats', 'disciplines', 'clans', 'generation', 'notes', 'create'] },
      { id: 'npc_emails', icon: 'mail', label: 'NPC Comms', keywords: ['emails', 'messages', 'inbox', 'outbox', 'send reply', 'delete identity', 'create identity'] },
      { id: 'premonitions', icon: 'visibility',  label: 'Premonitions', keywords: ['visions', 'future', 'auspex', 'dreams', 'prophecy', 'omens', 'sight', 'clues'] },
      { id: 'prestation', icon: 'handshake', label: 'Prestation', keywords: ['boons', 'debts', 'favors', 'harpy', 'trivial', 'minor', 'major', 'blood', 'life', 'transfer', 'record', 'clear'] },
      { id: 'events',       icon: 'event',       label: 'Events', keywords: ['calendar', 'timeline', 'schedule', 'sessions', 'dates', 'venue', 'planning'] },
      { id: 'broadcast',    icon: 'campaign',    label: 'Broadcast', keywords: ['announcements', 'alerts', 'notifications', 'global', 'news', 'urgent', 'messages'] },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'chat',     icon: 'chat',      label: 'Chat Logs', keywords: ['messages', 'history', 'rooms', 'groups', 'transcripts', 'channel', 'direct messages', 'all time', 'last 7 days'] },
      { id: 'stats',    icon: 'bar_chart', label: 'Stats', keywords: ['statistics', 'charts', 'activity', 'metrics', 'graphs', 'data', 'numbers'] },
      { id: 'dice',     icon: 'casino',    label: 'Dice Logs', keywords: ['rolls', 'rng', 'botches', 'successes', 'crits', 'history', 'messy critical', 'bestial failure', 'rouse checks', 'normal dice', 'hunger dice'] },
      { id: 'discord',  icon: 'sensors',   label: 'Discord', keywords: ['bots', 'sync', 'webhooks', 'integration', 'messages', 'channels', 'setup', 'permissions'] },
      { id: 'timeline', icon: 'timeline',  label: 'Timeline', keywords: ['history', 'chronicle', 'events', 'past', 'log', 'chronological', 'dates'] },
      { id: 'domains',  icon: 'map',       label: 'Domain Threats', keywords: ['map', 'territory', 'security', 'hunters', 'inquisition', 'threats', 'lupines', 'sabbat', 'danger'] },
      { id: 'bloodweb', icon: 'radar',     label: 'Blood Web', keywords: ['radar', 'map', 'connections', 'relationships', 'conspiracy', 'nodes', 'rumors', 'secrets', 'network'] },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'master',     icon: 'admin_panel_settings', label: 'Master Control', keywords: ['toggles', 'schrecknet comms', 'global settings', 'switches', 'features', 'maintenance mode', 'global configurations', 'announcements', 'time', 'calendar', 'date', 'month', 'year', 'game time', 'pause', 'stop', 'prev', 'next'] },
      { id: 'masquerade', icon: 'warning',              label: 'Masquerade Dial', keywords: ['breaches', 'exposure', 'threat', 'danger', 'level', 'tracker', 'second inquisition', 'cleanup', 'media', 'dial'] },
      { id: 'audit',      icon: 'policy',               label: 'Audit Logs', keywords: ['security', 'tracking', 'changes', 'admin actions', 'history', 'edits', 'deletions', 'context', 'copy'] },
      { id: 'logs',       icon: 'receipt_long',         label: 'System Logs', keywords: ['errors', 'server', 'debug', 'traces', 'console', 'output', 'crashes', 'context'] },
    ],
  },
];
const TAB_LABELS = NAV_SECTIONS.flatMap(s => s.items).reduce(
  (acc, i) => ({ ...acc, [i.id]: i.label }), {}
);

/* ---------------- Sidebar ---------------- */
function Sidebar({ tab, setTab, collapsed, onToggleCollapse }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNavSections = React.useMemo(() => {
    if (!searchQuery.trim()) return NAV_SECTIONS;
    const lowerQuery = searchQuery.toLowerCase();
    
    return NAV_SECTIONS.map(section => {
      const filteredItems = section.items.map(item => {
        let matchedKeyword = null;
        const matchesLabel = item.label.toLowerCase().includes(lowerQuery);
        
        if (!matchesLabel && item.keywords) {
          const found = item.keywords.find(k => k.toLowerCase().includes(lowerQuery));
          if (found) matchedKeyword = found;
        }

        if (matchesLabel || matchedKeyword) {
          return { ...item, matchedKeyword };
        }
        return null;
      }).filter(Boolean);

      return { ...section, items: filteredItems };
    }).filter(section => section.items.length > 0);
  }, [searchQuery]);

  return (
    <nav className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`} aria-label="Admin navigation">
      <div className={styles.sidebarLogo}>
        <div className={styles.sidebarLogoIcon} aria-hidden="true" style={{background: 'transparent', border: 'none'}}>
           <img src="/img/ATT-logo(1).png" alt="Logo" style={{width: '28px', height: '28px', objectFit: 'contain'}} />
        </div>
        <span className={styles.sidebarLogoText} style={{fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 'bold', textTransform: 'none', letterSpacing: 'normal'}}>Erebus Portal</span>
      </div>

      {!collapsed && (
        <div style={{ margin: '4px 8px 12px 8px' }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              borderBottom: '1px solid var(--glass-border)',
              background: 'transparent',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onFocus={(e) => {
               e.currentTarget.style.background = 'var(--glass-bg-hover)';
               e.currentTarget.style.borderBottomColor = 'var(--glass-border-highlight)';
            }}
            onBlur={(e) => {
               e.currentTarget.style.background = 'transparent';
               e.currentTarget.style.borderBottomColor = 'var(--glass-border)';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px', width: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              search
            </span>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '13.5px',
                outline: 'none',
                padding: 0,
                width: '100%'
              }}
            />
            {searchQuery && (
              <span 
                className="material-symbols-outlined" 
                onClick={() => setSearchQuery('')}
                style={{
                  fontSize: '15px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  opacity: 0.7,
                  transition: 'opacity 0.15s'
                }}
                onMouseEnter={e => e.target.style.opacity = 1}
                onMouseLeave={e => e.target.style.opacity = 0.7}
              >
                close
              </span>
            )}
          </div>
        </div>
      )}

      <div className={styles.sidebarNav}>
        {filteredNavSections.map((section) => (
          <React.Fragment key={section.label}>
            <div className={styles.sidebarSectionLabel}>{section.label}</div>
            {section.items.map(({ id, icon, label, matchedKeyword }) => (
              <button
                key={id}
                type="button"
                className={`${styles.sidebarNavItem} ${tab === id ? styles.sidebarNavItemActive : ''}`}
                onClick={() => setTab(id)}
                data-tooltip={label}
                aria-current={tab === id ? 'page' : undefined}
                style={matchedKeyword ? { alignItems: 'flex-start' } : undefined}
              >
                <span className={`material-symbols-outlined ${styles.sidebarNavIcon}`} aria-hidden="true">{icon}</span>
                <span className={styles.sidebarNavLabel}>
                  <div>{label}</div>
                  {matchedKeyword && !collapsed && (
                    <div style={{ fontSize: '10px', color: 'var(--accent-purple)', opacity: 0.9, marginTop: '4px', textTransform: 'capitalize', fontWeight: 'normal' }}>
                      ↳ {matchedKeyword}
                    </div>
                  )}
                </span>
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>

      <button
        type="button"
        className={styles.sidebarCollapseBtn}
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        data-tooltip="Expand"
      >
        <span className={styles.sidebarCollapseIcon} aria-hidden="true">{collapsed ? '→' : '←'}</span>
        <span className={styles.sidebarCollapseLabel}>Collapse</span>
      </button>
    </nav>
  );
}

/* ---------------- Top bar ---------------- */
function TopBar({ tab, loading, onReload }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.topbarBreadcrumb}>
        <span>Admin</span>
        <span className={styles.topbarBreadcrumbSep}>›</span>
        <span className={styles.topbarBreadcrumbActive}>{TAB_LABELS[tab] || tab}</span>
      </div>
      <div className={styles.topbarActions}>
        <div className={styles.statusPill}>
          <span className={styles.statusDot} />
          Online
        </div>
        <button
          type="button"
          className={styles.reloadBtn}
          onClick={() => {
            api.post('/push/test', { category: 'system' })
              .then(() => alert('System push sent!'))
              .catch(e => alert('Push failed: ' + e.message));
          }}
          title="Test System Push"
        >
          <span className="material-symbols-outlined">notifications</span>
          Test System
        </button>
        <button
          type="button"
          className={styles.reloadBtn}
          onClick={() => {
            api.post('/push/test', { category: 'chat' })
              .then(() => alert('Chat push sent!'))
              .catch(e => alert('Push failed: ' + e.message));
          }}
          title="Test Chat Push"
        >
          <span className="material-symbols-outlined">forum</span>
          Test Chat
        </button>
        <button
          type="button"
          className={styles.reloadBtn}
          onClick={onReload}
          disabled={loading}
          aria-label="Reload data"
        >
          <span className={`${styles.reloadIcon} ${loading ? styles.reloadIconSpin : ''}`} aria-hidden="true">↻</span>
          Reload
        </button>
      </div>
    </header>
  );
}

/* ---------------- Main ---------------- */
export default function Admin() {
  const [tab, setTab] = useState('users'); // users | characters | claims | downtimes | xp | npcs | chat | stats | dice | discord | logs
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // All data state lives here
  const [users, setUsers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [charIndex, setCharIndex] = useState({});
  const [downtimes, setDowntimes] = useState([]);
  const [npcs, setNPCs] = useState([]);
  const [allNpcMessages, setAllNpcMessages] = useState([]);
  const [allMessages, setAllMessages] = useState([]); // Used by chat + stats

  const [allGroupMessages, setAllGroupMessages] = useState([]);
  const [allEmailMessages, setAllEmailMessages] = useState([]);
  const [chatGroups, setChatGroups] = useState([]);

  const [xpLogs, setXpLogs] = useState([]);
  const [premonitions, setPremonitions] = useState([]);
  const [diceRolls, setDiceRolls] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [ghouls, setGhouls] = useState([]);
  
  // Modal state
  const [editorTarget, setEditorTarget] = useState(null); 

  // Feedback state
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Central data loader
  const load = useCallback(async () => {
    setLoading(true); setErr(''); setMsg('');
    try {
      const xp = await api.get('/admin/xp-logs?limit=al');
      setXpLogs(xp.data.logs || xp.data || []);
    } catch (e) {
      console.error('Failed to load XP logs', e);
    }

    // All Group chat messages & groups
      try {
        const gMsgs = await api.get('/admin/chat/groups/messages/all');
        setAllGroupMessages(gMsgs.data.messages || []);
        const grps = await api.get('/admin/chat/groups');
        setChatGroups(grps.data.groups || []);
      } catch (e) { console.error("Failed to load group messages", e); }

      // All Email messages
      try {
        const eMsgs = await api.get('/admin/emails/messages/all');
        setAllEmailMessages(eMsgs.data.messages || []);
      } catch (e) { console.error("Failed to load email messages", e); }

try {
  const prems = await api.get('/admin/premonitions');
  setPremonitions(prems.data.premonitions || []);
} catch (e) {
  console.error('Failed to load premonitions', e);
}

try {
  const dice = await api.get('/admin/dice/rolls?limit=all');
  setDiceRolls(dice.data.rolls || []);
} catch (e) {
  console.error('Failed to load dice logs', e);
}

try {
  const chars = await api.get('/admin/characters');
  setCharacters(chars.data.characters || []);
} catch (e) {
  console.error('Failed to load characters', e);
}
    try {
      const u = await api.get('/admin/users');
      setUsers(u.data.users || []);

      // Build character index from users
      const idx = {}; 
      (u.data.users || []).forEach(u => {
        if (u.character_id) {
          idx[u.character_id] = {
            user_id: u.id,
            display_name: u.display_name,
            email: u.email,
            role: u.role,
            char_name: u.char_name,
            clan: u.clan,
            xp: u.xp,
            sheet: u.sheet,
          };
        }
      });
      setCharIndex(idx);

      // Claims
      try {
        const cl = await api.get('/domain-claims');
        setClaims(cl.data.claims || []);
      } catch (e) { console.error("Failed to load claims", e); }

      // Downtimes (admin view)
      try {
        const dts = await api.get('/admin/downtimes');
        setDowntimes(dts.data.downtimes || []);
      } catch (e) { console.error("Failed to load downtimes", e); }

      // NPCs
      try {
        const np = await api.get('/admin/npcs');
        setNPCs(np.data.npcs || []);
      } catch (e) { console.error("Failed to load NPCs", e); }

      // Ghouls
      try {
        const gh = await api.get('/admin/ghouls');
        setGhouls(gh.data.ghouls || []);
      } catch (e) { console.error("Failed to load Ghouls", e); }

      // All chat messages (for admin)
      try {
          const msgs = await api.get('/admin/chat/all');
          setAllMessages(msgs.data.messages || []);
      } catch (e) { console.error("Failed to load all messages", e); }
// All NPC chat messages (for stats)
      try {
        const npcMsgs = await api.get('/admin/chat/npc/all');
        setAllNpcMessages(npcMsgs.data.messages || []);
      } catch (e) { 
        console.error("Failed to load all NPC messages", e); 
      }

    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load primary admin data');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // ========= API FUNCTIONS (passed as props) =========

  // --- Users ---
  async function saveUser(u) {
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/users/${u.id}`, {
        display_name: u.display_name,
        email: u.email,
        role: u.role,
        discord_id: u.discord_id
      });
      setMsg(`Saved user #${u.id}`);
      load(); // Reload to reflect changes
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save user.');
    }
  }

  // --- Characters ---
  async function saveCharacter(c) {
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/characters/${c.id}`, {
        name: c.name,
        clan: c.clan,
        sheet: c.sheet
      });
      setMsg(`Saved character #${c.id}`);
      load(); // Reload
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save character.');
    }
  }

async function grantXP(character_id, delta) {
    if (!delta) return;
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/characters/${character_id}/xp`, { delta: Number(delta) });
      setMsg(`XP adjusted by ${delta} for character #${character_id}`);
      load(); // Reload
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to adjust XP');
    }
  }

  const adminxp = async () => {
    try {
      const { data } = await api.get('/admin/xp-logs');
      return data;
    } catch (error) {
      console.error("Failed to load XP logs:", error);
      return []; // Return an empty array if it fails so the app doesn't crash
    }
  };

  async function grantBulkXP(delta) {
    setErr(''); setMsg('');
    try {
      await api.patch('/admin/characters/xp/bulk', { delta: Number(delta) });
      setMsg(`Bulk XP (${delta > 0 ? '+' : ''}${delta}) applied to all characters!`);
      load(); // Reload everything so the grid updates instantly
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to apply Bulk XP');
      throw e; // Throw it back to the tab so it can turn off the "Applying..." loading state
    }
  }

  async function deleteCharacter(id) {
    setErr(''); setMsg('');
    if (window.prompt(`Type DELETE to permanently remove character #${id}. This cannot be undone.`) !== 'DELETE') return;
    
    try {
      await api.delete(`/admin/characters/${id}`);
      setMsg(`Character #${id} deleted`);
      load(); // Reload
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to delete character');
    }
  }

  async function handleGeneratePDF(character) {
    // This logic is complex and client-side, so we keep it here.
    // NOTE: This function still requires you to provide the Base64 font data.
    try {
        const { jsPDF } = await import('jspdf');

        // FONT DATA (PASTE YOUR BASE64 STRINGS HERE)
        const NotoSansRegular_Base64 = "..."; // <--- PASTE NotoSans-Regular.ttf BASE64 HERE
        const NotoSansBold_Base64 = "...";   // <--- PASTE NotoSans-Bold.ttf BASE64 HERE

        if (NotoSansRegular_Base64.length < 50 || NotoSansBold_Base64.length < 50) {
            alert("PDF Generation Error: Font data is missing from Admin.jsx. Please ask the developer to add the Base64 font strings.");
            console.error("PDF Generation Error: Font data missing.");
            return;
        }

        const FONT_REGULAR = 'NotoSans';
        const FONT_BOLD = 'NotoSans-Bold';
        const FALLBACK_FONT = 'Helvetica';

        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const M = 36;
        const usableW = pageW - M * 2;
        let y = M;

        const COLOR_RED = '#8a0303';
        const COLOR_DARK = '#333333';
        const COLOR_LIGHT = '#aaaaaa';
        const COLOR_FILL = '#8a0303';
        const DOT_SIZE = 6;
        const DOT_GAP = 4;
        const LINE_HEIGHT = 14;

        let currentFontFamily = FALLBACK_FONT;

        // Try to load custom fonts
        try {
            doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular_Base64);
            doc.addFont('NotoSans-Regular.ttf', FONT_REGULAR, 'normal');
            doc.addFileToVFS('NotoSans-Bold.ttf', NotoSansBold_Base64);
            doc.addFont('NotoSans-Bold.ttf', FONT_BOLD, 'normal');
            currentFontFamily = FONT_REGULAR;
            doc.setFont(currentFontFamily, 'normal');
        } catch (e) {
            console.error("Custom Noto Sans font loading failed.", e);
            doc.setFont(FALLBACK_FONT, 'normal');
        }

        const getFont = (style) => {
            if (currentFontFamily === FALLBACK_FONT) {
                return { family: FALLBACK_FONT, style: style };
            }
            return { 
                family: style === 'bold' ? FONT_BOLD : FONT_REGULAR, 
                style: 'normal'
            };
        };

        const ensure = (extraH = LINE_HEIGHT) => {
            if (y + extraH > pageH - M) {
                doc.addPage();
                y = M;
            }
        };

        const split = (t, w = usableW) => doc.splitTextToSize(String(t ?? ''), w);

        const section = (title) => {
            ensure(30);
            y += 10;
            const bold = getFont('bold');
            const regular = getFont('normal');
            doc.setFont(bold.family, bold.style).setFontSize(14).setTextColor(COLOR_RED);
            doc.text(title.toUpperCase(), M, y);
            y += 6;
            doc.setDrawColor(COLOR_RED).setLineWidth(1).line(M, y, M + usableW, y);
            y += 20;
            doc.setFont(regular.family, regular.style).setFontSize(10).setTextColor(COLOR_DARK);
        };

        const drawDots = (label, value, max = 5, xStart = M, labelWidth = 120) => {
            ensure(DOT_SIZE + DOT_GAP + 6);
            const val = Number(value) || 0;
            const maxVal = Number(max) || 5;
            const x = xStart + labelWidth;
            const regular = getFont('normal');
            doc.setFont(regular.family, regular.style).setFontSize(10).setTextColor(COLOR_DARK);
            const labelLines = split(label, labelWidth);
            doc.text(labelLines[0], xStart, y + DOT_SIZE - 1); 
            doc.setLineWidth(1);
            for (let i = 1; i <= maxVal; i++) {
                const dotX = x + (i * (DOT_SIZE + DOT_GAP));
                const isFilled = i <= val;
                doc.setFillColor(isFilled ? COLOR_FILL : '#ffffff');
                doc.setDrawColor(isFilled ? COLOR_FILL : COLOR_LIGHT);
                doc.circle(dotX, y + (DOT_SIZE / 2), DOT_SIZE / 2, 'FD');
            }
            y += DOT_SIZE + DOT_GAP + 6;
        };

        const drawTracker = (label, value, max = 10, xStart = M, boxCount = 10, labelSpace = 60) => {
            ensure(22);
            const val = Number(value) || 0;
            const BOX_SIZE = 10;
            const BOX_GAP = 3;
            const bold = getFont('bold');
            doc.setFont(bold.family, bold.style).setFontSize(10).setTextColor(COLOR_DARK);
            doc.text(label.toUpperCase(), xStart, y + BOX_SIZE - 1);
            doc.setLineWidth(1).setDrawColor(COLOR_DARK);
            for (let i = 1; i <= boxCount; i++) {
                const boxX = xStart + labelSpace + (i * (BOX_SIZE + BOX_GAP));
                const isCurrent = i <= val;
                doc.setFillColor(isCurrent ? COLOR_FILL : '#ffffff');
                doc.rect(boxX, y, BOX_SIZE, BOX_SIZE, 'FD');
            }
            y += BOX_SIZE + BOX_GAP + 6;
        };

        let sheet = {};
        try {
            sheet = typeof character.sheet === 'string'
                ? JSON.parse(character.sheet)
                : (character.sheet || {});
        } catch (e) {
            console.error('Invalid sheet JSON', e);
            alert('Invalid JSON sheet. Please fix the sheet and try again.');
            return;
        }

        const name = character.name || sheet.name || 'Unnamed';
        const attrs = sheet.attributes || {};
        const getAttr = (k) => Number(attrs[k] ?? 0);
        const healthMax = getAttr('Stamina') + 3;
        const willMax = getAttr('Composure') + getAttr('Resolve');
        const hunger = sheet.hunger || 0;
        const id = character.id ?? '—';

        const bold = getFont('bold');
        const regular = getFont('normal');

        // == HEADER ==
        doc.setFont(bold.family, bold.style).setFontSize(24).setTextColor(COLOR_RED);
        doc.text(name.toUpperCase(), M, y);
        y += 24;
        doc.setFont(regular.family, regular.style).setFontSize(11).setTextColor(COLOR_DARK);
        const colW = usableW / 3;
        doc.text(`Clan: ${character.clan || sheet.clan || '—'}`, M, y);
        doc.text(`Predator: ${sheet.predatorType || '—'}`, M + colW, y);
        doc.text(`Sire: ${sheet.sire || '—'}`, M + colW * 2, y);
        y += 16;
        doc.text(`Ambition: ${sheet.ambition || '—'}`, M, y);
        doc.text(`Desire: ${sheet.desire || '—'}`, M + colW, y);
        y += 14;
        doc.setDrawColor(COLOR_LIGHT).setLineWidth(0.5).line(M, y, M + usableW, y);
        y += 10;

        // == TRACKERS (Two Columns) ==
        const trackerColW = usableW / 2;
        const trackerYStart = y;
        let yCol1End, yCol2End;
        drawTracker('Health', sheet.health_current ?? healthMax, healthMax, M, healthMax, 60);
        drawTracker('Humanity', sheet.humanity ?? 7, 10, M, 10, 60);
        yCol1End = y;
        y = trackerYStart; 
        drawTracker('Willpower', sheet.willpower_current ?? willMax, willMax, M + trackerColW, willMax, 60);
        drawTracker('Hunger', hunger, 5, M + trackerColW, 5, 60);
        yCol2End = y;
        y = Math.max(yCol1End, yCol2End);
        y += 10;

        // == ATTRIBUTES (3 LINES, 3 COLUMNS) ==
        section('Attributes');
        const ATTR_COL_W = usableW / 3;
        const ATTR_DOT_LABEL_W = 70; 
        const ATTR_LIST = [
            { type: 'Physical', keys: ['Strength', 'Dexterity', 'Stamina'] },
            { type: 'Social', keys: ['Charisma', 'Manipulation', 'Composure'] },
            { type: 'Mental', keys: ['Intelligence', 'Wits', 'Resolve'] },
        ];
        let yAttrGroup = y;
        ATTR_LIST.forEach((group, index) => {
            const xGroupStart = M + (index * ATTR_COL_W);
            doc.setFont(regular.family, regular.style).setFontSize(9).setTextColor(COLOR_LIGHT).text(group.type, xGroupStart, yAttrGroup - 8);
            let yCursor = yAttrGroup;
            group.keys.forEach(k => {
                y = yCursor; 
                drawDots(k, getAttr(k), 5, xGroupStart, ATTR_DOT_LABEL_W);
                yCursor = y;
            });
            yAttrGroup = Math.max(yAttrGroup, yCursor);
        });
        y = yAttrGroup;
        y += 10; 

        // == SKILLS (3 LINES, 3 COLUMNS) ==
        section('Skills');
        const SKILL_COL_W = usableW / 3;
        const SKILL_DOT_LABEL_W = 70;
        const skills = sheet.skills || {};
        const getSkill = (k) => Number(skills[k]?.dots ?? 0);
        const getSpecs = (k) => (Array.isArray(skills[k]?.specialties) ? skills[k].specialties : []).join(', ');
        const SKILL_GROUPS = [
            { type: 'Physical', keys: ['Athletics', 'Brawl', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival'] },
            { type: 'Social', keys: ['Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge'] },
            { type: 'Mental', keys: ['Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology'] },
        ];
        let ySkillGroup = y;
        SKILL_GROUPS.forEach((group, index) => {
            const xGroupStart = M + (index * SKILL_COL_W);
            doc.setFont(regular.family, regular.style).setFontSize(9).setTextColor(COLOR_LIGHT).text(group.type, xGroupStart, ySkillGroup - 8);
            let yCursor = ySkillGroup;
            group.keys.forEach(k => {
                y = yCursor; 
                const specs = getSpecs(k);
                const label = specs ? `${k} (${specs})` : k;
                drawDots(label, getSkill(k), 5, xGroupStart, SKILL_DOT_LABEL_W);
                yCursor = y;
            });
            ySkillGroup = Math.max(ySkillGroup, yCursor);
        });
        y = ySkillGroup;
        y += 10; 

        // == DISCIPLINES & POWERS (Full Width) ==
        section('Disciplines & Powers');
        const disc = sheet.disciplines || {};
        const powers = sheet.disciplinePowers || {};
        const discKeys = Object.keys(disc).sort();
        doc.setFont(regular.family, regular.style).setFontSize(10).setTextColor(COLOR_DARK);
        if (!discKeys.length) {
            doc.text('No disciplines defined.', M, y); y += LINE_HEIGHT;
        } else {
            const DISC_LABEL_WIDTH = 100;
            discKeys.forEach((k) => {
                ensure(30);
                drawDots(k, disc[k], 5, M, DISC_LABEL_WIDTH);
                const powerList = powers[k] || [];
                if (powerList.length) {
                    y -= 6;
                    powerList.forEach((p) => {
                        const ln = `• [Lvl ${p.level}] ${p.name || p.id || '—'}`;
                        const lines = split(ln, usableW - DISC_LABEL_WIDTH - 20);
                        lines.forEach((l2) => {
                            ensure(LINE_HEIGHT - 2);
                            doc.text(l2, M + DISC_LABEL_WIDTH + 20, y);
                            y += LINE_HEIGHT - 2;
                        });
                    });
                    y += 6;
                }
            });
        }

        // == ADVANTAGES (MERITS & FLAWS - Two Columns) ==
        section('Advantages (Merits & Flaws)');
        const merits = (sheet.advantages && sheet.advantages.merits) || [];
        const flaws = (sheet.advantages && sheet.advantages.flaws) || [];
        const advColW = usableW / 2;
        let yMerits = y;
        let yFlaws = y;
        // Merits (Column 1)
        y = yMerits; ensure(30); yMerits = y;
        doc.setFont(bold.family, bold.style).setFontSize(11).text('Merits', M, yMerits); yMerits += LINE_HEIGHT;
        doc.setFont(regular.family, regular.style).setFontSize(10);
        if (!merits.length) {
            doc.text('• None', M + 12, yMerits); yMerits += LINE_HEIGHT;
        }
        merits.filter(Boolean).forEach((m) => {
            const nm = m.name || m.id || '—';
            const dt = (m.dots ?? m.rating ?? '—');
            const ln = `• ${nm} (${dt} dots)${m.description ? `: ${m.description}` : ''}`;
            split(ln, advColW - 12).forEach((l) => { 
                y = yMerits; ensure(LINE_HEIGHT); yMerits = y; 
                doc.text(l, M + 12, yMerits); yMerits += LINE_HEIGHT; 
            });
        });
        // Flaws (Column 2)
        const flawsColX = M + advColW;
        y = yFlaws; ensure(30); yFlaws = y;
        doc.setFont(bold.family, bold.style).setFontSize(11).text('Flaws', flawsColX, yFlaws); yFlaws += LINE_HEIGHT;
        doc.setFont(regular.family, regular.style).setFontSize(10);
        if (!flaws.length) {
            doc.text('• None', flawsColX + 12, yFlaws); yFlaws += LINE_HEIGHT;
        }
        flaws.filter(Boolean).forEach((m) => {
            const nm = m.name || m.id || '—';
            const dt = (m.dots ?? m.rating ?? '—');
            const ln = `• ${nm} (${dt} dots)${m.description ? `: ${m.description}` : ''}`;
            split(ln, advColW - 12).forEach((l) => { 
                y = yFlaws; ensure(LINE_HEIGHT); yFlaws = y;
                doc.text(l, flawsColX + 12, yFlaws); yFlaws += LINE_HEIGHT; 
            });
        });
        y = Math.max(yMerits, yFlaws);
        y += 10;

        // == MORALITY (Two Columns) ==
        section('Morality');
        const mor = sheet.morality || {};
        if (mor.tenets) {
            doc.setFont(bold.family, bold.style).text('Tenets', M, y); y += LINE_HEIGHT;
            doc.setFont(regular.family, regular.style);
            split(mor.tenets).forEach((ln) => { ensure(LINE_HEIGHT); doc.text(ln, M + 12, y); y += LINE_HEIGHT; });
        }
        const morColW = usableW / 2;
        let yConv = y;
        let yTouch = y;
        if (Array.isArray(mor.convictions) && mor.convictions.length) {
            y = yConv; ensure(30); yConv = y;
            doc.setFont(bold.family, bold.style).text('Convictions', M, yConv); yConv += LINE_HEIGHT;
            doc.setFont(regular.family, regular.style);
            mor.convictions.forEach(c => {
                split(`• ${c}`, morColW - 12).forEach(ln => { ensure(LINE_HEIGHT); y = yConv; yConv = y; doc.text(ln, M + 12, yConv); yConv += LINE_HEIGHT; });
            });
        }
        if (Array.isArray(mor.touchstones) && mor.touchstones.length) {
            y = yTouch; ensure(30); yTouch = y;
            const touchColX = M + morColW;
            doc.setFont(bold.family, bold.style).text('Touchstones', touchColX, yTouch); yTouch += LINE_HEIGHT;
            doc.setFont(regular.family, regular.style);
            mor.touchstones.forEach(t => {
                split(`• ${t}`, morColW - 12).forEach(ln => { ensure(LINE_HEIGHT); y = yTouch; yTouch = y; doc.text(ln, touchColX + 12, yTouch); yTouch += LINE_HEIGHT; });
            });
        }
        y = Math.max(yConv, yTouch);

        // == FOOTER ==
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont(FALLBACK_FONT, 'normal').setFontSize(9).setTextColor(COLOR_LIGHT);
            doc.setDrawColor(COLOR_LIGHT).setLineWidth(0.5).line(M, pageH - M + 10, pageW - M, pageH - M + 10);
            const centerX = pageW / 2;
            const rightX = pageW - M;
            doc.text(`Character ${id} | ${name}`, M, pageH - M + 22);
            doc.text(`Generated ${new Date().toLocaleString()}`, centerX, pageH - M + 22, { align: 'center' });
            doc.text(`Page ${i} of ${pageCount}`, rightX, pageH - M + 22, { align: 'right' });
        }

        doc.save(`${(name || 'character').replace(/\s+/g, '_')}-${id}-sheet.pdf`);

    } catch (e) {
        console.error('Client PDF generation failed', e);
        alert('Could not generate the PDF in the browser. Check console for details. Ensure jsPDF is installed.');
    }
  }

  // --- Claims ---
  async function saveClaim(division, patch) {
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/domain-claims/${division}`, patch);
      setMsg(`Claim ${division} saved`);
      load(); // Reload
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save claim');
    }
  }
  async function deleteClaim(division) {
    setErr(''); setMsg('');
    try {
      await api.delete(`/admin/domain-claims/${division}`);
      setMsg(`Claim ${division} removed`);
      load(); // Reload
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to delete claim');
    }
  }

  // --- Downtimes ---
  async function saveDowntime(id, patch) {
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/downtimes/${id}`, patch);
      setMsg(`Downtime #${id} saved`);
      load(); // Reload
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save downtime');
    }
  }

  // --- NPCs ---
  async function deleteNPC(id) {
    setErr(''); setMsg('');
    if (window.prompt(`Type DELETE to permanently remove NPC #${id}. This cannot be undone.`) !== 'DELETE') return;

    try {
      await api.delete(`/admin/npcs/${id}`);
      setMsg(`NPC #${id} deleted`);
      load(); // Reload
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to delete NPC');
    }
  }

  // ========= RENDER =========
  return (
    <div className={styles.adminRoot}>
      <Sidebar
        tab={tab}
        setTab={setTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      <div className={`${styles.main} ${sidebarCollapsed ? styles.mainExpanded : ''}`}>
        {loading && <div className={styles.loadingStrip} aria-live="polite" aria-label="Loading" />}

        <TopBar tab={tab} loading={loading} onReload={load} />

        {(err || msg) && (
          <div className={styles.toastBar} role="status" aria-live="polite">
            {err && (
              <div className={`${styles.alert} ${styles.alertError}`}>
                <span aria-hidden="true">⚠</span> {err}
              </div>
            )}
            {msg && (
              <div className={`${styles.alert} ${styles.alertInfo}`}>
                <span aria-hidden="true">✓</span> {msg}
              </div>
            )}
          </div>
        )}

        <main className={styles.content}>
          {/* Conditional Tab Rendering */}
          {tab === 'users' && (
            <AdminUsersTab 
              users={users} 
              onSave={saveUser} 
            />
          )}
          {tab === 'characters' && (
            <AdminCharactersTab
              users={users}
              onSave={saveCharacter}
              onDelete={deleteCharacter}
              onGeneratePDF={handleGeneratePDF}
              onOpenEditor={setEditorTarget}
            />
          )}
          {tab === 'claims' && (
            <AdminClaimsTab
              claims={claims}
              characters={charIndex}
              npcs={npcs}
              onSave={saveClaim}
              onDelete={deleteClaim}
            />
          )}
          {tab === 'coteries' && <AdminCoteriesTab />}
          {tab === 'downtimes' && (
            <AdminDowntimesTab
              rows={downtimes}
              onSave={saveDowntime}
            />
          )}
          {tab === 'xp' && (
            <AdminXPTab 
              users={users} 
              onGrant={grantXP} 
              onBulkGrant={grantBulkXP}
              adminxp={adminxp} 
            />
          )}
          {tab === 'npcs' && (
            <AdminNPCsTab
              npcs={npcs}
              onReload={load}
              onDelete={deleteNPC}
            />
          )}
          {tab === 'npc_email' && (
            <AdminNpcEmailTab npcs={npcs} />
          )}
          {tab === 'ghouls' && (
            <AdminGhoulsTab ghouls={ghouls} />
          )}
          {tab === 'premonitions' && <AdminPremonitionsTab />}
          {tab === 'boons' && <AdminPrestationTab />}
          {tab === 'events' && <AdminEventsTab />}
          {tab === 'broadcast' && <AdminBroadcastTab />}
          {tab === 'chat' && (
            <AdminChatLogsTab 
              messages={allMessages} 
              charIndex={charIndex} 
            />
          )}
          {tab === 'stats' && (
            <ChatStatsTab
              directMessages={allMessages}
              npcMessages={allNpcMessages}
              groupMessages={allGroupMessages}
              emailMessages={allEmailMessages}
              chatGroups={chatGroups}
              npcs={npcs}
              users={users}
              xpLogs={xpLogs}
              premonitions={premonitions}
              diceRolls={diceRolls}
              downtimes={downtimes}
              characters={characters}
            />
          )}
          {tab === 'dice' && (
            <AdminDiceLogsTab />
          )}
          {tab === 'timeline' && <AdminTimelineTab users={users} />}
          {tab === 'domains' && <AdminDomainsTab />}
          {tab === 'bloodweb' && <AdminBloodWebTab />}
          {tab === 'discord' && (
            <AdminDiscordTab users={users} />
          )}
          {tab === 'master' && (            
            <AdminMasterTab />
          )}
          {tab === 'masquerade' && <AdminMasqueradeTab />}
          {tab === 'audit' && <AdminAuditTab />}
          {tab === 'logs' && <AdminLogs />}
        </main>
      </div>

      {/* Modal remains here */}
      {editorTarget && (
       <CharacterEditor
          character={editorTarget}
          onClose={() => setEditorTarget(null)}
          onSaved={() => { setEditorTarget(null); load(); }} // Close and reload
        />
      )}
    </div>
  );
}