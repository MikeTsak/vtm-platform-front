// src/pages/Admin.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/Admin.module.css';
import Loading from '../../ui/Loading';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { formatEuDate } from '../../utils/dateFormatter';
import { useMediaQuery, ADMIN_MOBILE_BREAKPOINT as MOBILE_BREAKPOINT } from '../../utils/useMediaQuery';

// Lazy-loaded Core & Modal Components
const AdminLogs = lazyWithRetry(() => import('./AdminLogs'));
const ChatStatsTab = lazyWithRetry(() => import('./ChatStatsTab'));

// Lazy-loaded Tab Components (On-demand chunks)
const AdminHomeTab = lazyWithRetry(() => import('./AdminHomeTab'));
const ActivityHeatmap = lazyWithRetry(() => import('./ActivityHeatmap'));
const AdminUsersTab = lazyWithRetry(() => import('./AdminUsersTab'));
const AdminCharactersTab = lazyWithRetry(() => import('./AdminCharactersTab'));
const AdminClaimsTab = lazyWithRetry(() => import('./AdminClaimsTab'));
const AdminDowntimesTab = lazyWithRetry(() => import('./AdminDowntimesTab'));
const AdminFeedingTab = lazyWithRetry(() => import('./AdminFeedingTab'));
const AdminXPTab = lazyWithRetry(() => import('./AdminXPTab'));
const AdminDisciplinesTab = lazyWithRetry(() => import('./AdminDisciplinesTab'));
const AdminNPCsTab = lazyWithRetry(() => import('./AdminNPCsTab'));
const AdminChatLogsTab = lazyWithRetry(() => import('./AdminChatLogsTab'));
const AdminDiceLogsTab = lazyWithRetry(() => import('./AdminDiceLogsTab')); 
const AdminDiscordTab = lazyWithRetry(() => import('./AdminDiscordTab')); 
const AdminNpcEmailTab = lazyWithRetry(() => import('./AdminNpcEmailTab'));
const AdminMasterTab = lazyWithRetry(() => import('./AdminMasterTab'));
const AdminGhoulsTab = lazyWithRetry(() => import('./AdminGhoulsTab'));
const AdminPremonitionsTab = lazyWithRetry(() => import('./AdminPremonitionsTab'));
const AdminEventsTab = lazyWithRetry(() => import('./AdminEventsTab'));
const AdminCalendarTab = lazyWithRetry(() => import('./AdminCalendarTab'));
const AdminBroadcastTab = lazyWithRetry(() => import('./AdminBroadcastTab'));
const AdminTimelineTab = lazyWithRetry(() => import('./AdminTimelineTab'));
const AdminDomainsTab = lazyWithRetry(() => import('./AdminDomainsTab'));
const AdminBloodWebTab = lazyWithRetry(() => import('./AdminBloodWebTab'));
const AdminMasqueradeTab = lazyWithRetry(() => import('./AdminMasqueradeTab'));
const AdminPrestationTab = lazyWithRetry(() => import('./AdminPrestationTab'));
const AdminCoteriesTab = lazyWithRetry(() => import('./AdminCoteriesTab'));
const AdminAuditTab = lazyWithRetry(() => import('./AdminAuditTab'));
const AdminNewsTab = lazyWithRetry(() => import('./AdminNewsTab'));

/* ---------------- Sidebar navigation config ----------------
 * Every tool is grouped by the *job* a Storyteller is doing:
 *   Overview      : the command center
 *   Players       : accounts, sheets and progression
 *   Chronicle     : running the story between/at sessions
 *   Cast & Comms  : NPCs and everything that talks to players
 *   Intelligence  : read-only telemetry & logs
 *   System        : global switches and audit trails
 */
const NAV_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'space_dashboard',
    items: [
      { id: 'home', icon: 'dashboard', label: 'Home', hint: 'KPIs, live feed & quick actions', keywords: ['home', 'dashboard', 'overview', 'stats', 'activity', 'downtimes', 'kpi', 'welcome', 'terminal'] },
    ],
  },
  {
    id: 'players',
    label: 'Players',
    icon: 'group',
    items: [
      { id: 'users',       icon: 'person',         label: 'Users',          hint: 'Accounts, roles & Discord IDs', keywords: ['accounts', 'passwords', 'emails', 'roles', 'login', 'reset password', 'delete user', 'ban', 'unban', 'discord id', 'st role', 'vip role', 'admin role'] },
      { id: 'characters',  icon: 'account_circle', label: 'Characters',     hint: 'Sheets, trackers & PDF export', keywords: ['sheets', 'stats', 'pdf', 'inventory', 'traits', 'disciplines', 'blood potency', 'generation', 'clan', 'sect', 'sire', 'approvals', 'merits', 'flaws', 'health', 'willpower', 'humanity', 'export', 'delete', 'add character'] },
      { id: 'ghouls',      icon: 'pets',           label: 'Ghouls',         hint: 'Retainers & blood bonds', keywords: ['retainers', 'thralls', 'servants', 'domitor', 'blood bonds', 'ghoul sheet', 'disciplines', 'tier', 'player'] },
      { id: 'xp',          icon: 'stars',          label: 'XP & Rewards',   hint: 'Grant, subtract & bulk XP', keywords: ['experience', 'levels', 'progression', 'grants', 'apply to all', 'view history', 'refresh data', 'subtract xp', 'bulk grant'] },
      { id: 'disciplines', icon: 'auto_awesome',   label: 'Disciplines',    hint: 'Out-of-clan access requests', keywords: ['out of clan', 'unlock', 'access', 'request', 'approve', 'reject', 'grant', 'revoke', 'powers', 'clan restriction'] },
    ],
  },
  {
    id: 'chronicle',
    label: 'Chronicle',
    icon: 'auto_stories',
    items: [
      { id: 'calendar',     icon: 'calendar_month', label: 'Calendar',       hint: 'Comms, events and downtime deadlines', keywords: ['calendar', 'events', 'downtimes', 'comms', 'schedule', 'rsvp'] },
      { id: 'downtimes',    icon: 'schedule',     label: 'Downtimes',      hint: 'Review & resolve player actions', keywords: ['actions', 'between sessions', 'projects', 'approve', 'reject', 'needs scene', 'resolve', 'filter pipelines', 'reset configuration', 'sync records'] },
      { id: 'feeding',      icon: 'nightlight',   label: 'Feeding Control', hint: 'Hunting cycles & decay', keywords: ['hunting', 'blood', 'predator type', 'chasse merits', 'masquerade', 'safety rating', 'cycle', 'enable', 'disable', 'decay', 'force new cycle'] },
      { id: 'claims',       icon: 'local_police', label: 'Domain Claims',  hint: 'Territory ownership & stewards', keywords: ['domains', 'domain stewards', 'territory', 'claims map access', 'who can assign domains', 'grant', 'revoke', 'permission', 'approve requests', 'court'] },
      { id: 'domains',      icon: 'map',          label: 'Domain Threats', hint: 'Safety ratings & monthly problems', keywords: ['map', 'territory', 'security', 'hunters', 'inquisition', 'threats', 'lupines', 'sabbat', 'danger', 'safety rating'] },
      { id: 'coteries',     icon: 'group_work',   label: 'Coteries',       hint: 'Groups & shared resources', keywords: ['groups', 'factions', 'alliances', 'coterie type', 'domain size', 'chantry', 'shared resources', 'members'] },
      { id: 'prestation',   icon: 'handshake',    label: 'Prestation',     hint: 'Boons matrix & debts', keywords: ['boons', 'debts', 'favors', 'harpy', 'trivial', 'minor', 'major', 'blood', 'life', 'transfer', 'record', 'clear'] },
      { id: 'premonitions', icon: 'visibility',   label: 'Premonitions',   hint: 'Visions for Malkavians', keywords: ['visions', 'future', 'auspex', 'dreams', 'prophecy', 'omens', 'sight', 'clues'] },
      { id: 'events',       icon: 'event',        label: 'Events',         hint: 'Sessions & calendar', keywords: ['calendar', 'timeline', 'schedule', 'sessions', 'dates', 'venue', 'planning'] },
      { id: 'timeline',     icon: 'timeline',     label: 'Timeline',       hint: 'Per-character chronicle history', keywords: ['history', 'chronicle', 'events', 'past', 'log', 'chronological', 'dates'] },
    ],
  },
  {
    id: 'cast',
    label: 'Cast & Comms',
    icon: 'forum',
    items: [
      { id: 'npcs',           icon: 'recent_actors', label: 'NPCs',      hint: 'Storyteller characters', keywords: ['spc', 'storyteller characters', 'cast', 'add temp actor', 'stats', 'disciplines', 'clans', 'generation', 'notes', 'create'] },
      { id: 'npc_emails',     icon: 'mail',          label: 'NPC Comms', hint: 'NPC inboxes & identities', keywords: ['emails', 'messages', 'inbox', 'outbox', 'send reply', 'delete identity', 'create identity'] },
      { id: 'broadcast',      icon: 'campaign',      label: 'Broadcast', hint: 'Push announcements to everyone', keywords: ['announcements', 'alerts', 'notifications', 'global', 'news', 'urgent', 'messages', 'push'] },
      { id: 'news_templates', icon: 'article',       label: 'News',      hint: 'Templates & writer permissions', keywords: ['news', 'templates', 'writers', 'permissions', 'articles'] },
      { id: 'discord',        icon: 'sensors',       label: 'Discord',   hint: 'Bot sync & webhooks', keywords: ['bots', 'sync', 'webhooks', 'integration', 'messages', 'channels', 'setup', 'permissions'] },
    ],
  },
  {
    id: 'intel',
    label: 'Intelligence',
    icon: 'query_stats',
    items: [
      { id: 'activity', icon: 'calendar_month', label: 'Activity Heatmap', hint: 'Compare player presence', keywords: ['activity', 'heatmap', 'compare', 'presence', 'online', 'sessions', 'time', 'playtime', 'calendar'] },
      { id: 'stats',    icon: 'bar_chart',      label: 'Stats',            hint: 'Charts across all systems', keywords: ['statistics', 'charts', 'activity', 'metrics', 'graphs', 'data', 'numbers'] },
      { id: 'chat',     icon: 'chat',           label: 'Chat Logs',        hint: 'Transcripts & rooms', keywords: ['messages', 'history', 'rooms', 'groups', 'transcripts', 'channel', 'direct messages', 'all time', 'last 7 days'] },
      { id: 'dice',     icon: 'casino',         label: 'Dice Logs',        hint: 'Rolls, crits & botches', keywords: ['rolls', 'rng', 'botches', 'successes', 'crits', 'history', 'messy critical', 'bestial failure', 'rouse checks', 'normal dice', 'hunger dice'] },
      { id: 'bloodweb', icon: 'radar',          label: 'Blood Web',        hint: 'Hunger & potency radar', keywords: ['radar', 'map', 'connections', 'relationships', 'conspiracy', 'nodes', 'rumors', 'secrets', 'network', 'hunger', 'blood potency'] },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: 'settings',
    items: [
      { id: 'master',     icon: 'admin_panel_settings', label: 'Master Control',  hint: 'Feature switches & game time', keywords: ['toggles', 'schrecknet comms', 'global settings', 'switches', 'features', 'maintenance mode', 'global configurations', 'announcements', 'time', 'calendar', 'date', 'month', 'year', 'game time', 'pause', 'stop', 'prev', 'next', 'danger zone'] },
      { id: 'masquerade', icon: 'warning',              label: 'Masquerade Dial', hint: 'Global threat level 1 to 5', keywords: ['breaches', 'exposure', 'threat', 'danger', 'level', 'tracker', 'second inquisition', 'cleanup', 'media', 'dial'] },
      { id: 'audit',      icon: 'policy',               label: 'Audit Logs',      hint: 'Who changed what', keywords: ['security', 'tracking', 'changes', 'admin actions', 'history', 'edits', 'deletions', 'context', 'copy'] },
      { id: 'logs',       icon: 'receipt_long',         label: 'System Logs',     hint: 'Server errors & traces', keywords: ['errors', 'server', 'debug', 'traces', 'console', 'output', 'crashes', 'context'] },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items.map(i => ({ ...i, section: s })));
const TAB_META = ALL_NAV_ITEMS.reduce((acc, i) => ({ ...acc, [i.id]: i }), {});
const TAB_LABELS = ALL_NAV_ITEMS.reduce((acc, i) => ({ ...acc, [i.id]: i.label }), {});
const DEFAULT_TAB = 'home';
const NAV_STORAGE_KEY = 'erebus.admin.nav.closedSections';

/* ---------------- Small hooks ---------------- */
function useClickOutside(ref, onOutside, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [ref, onOutside, enabled]);
}

/* ---------------- Navigation search ---------------- */
function matchNavItems(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return NAV_SECTIONS.map(section => {
    const items = section.items.map(item => {
      const labelHit = item.label.toLowerCase().includes(q);
      const hintHit = !labelHit && item.hint && item.hint.toLowerCase().includes(q);
      const keyword = !labelHit && !hintHit && item.keywords
        ? item.keywords.find(k => k.toLowerCase().includes(q))
        : null;
      if (!labelHit && !hintHit && !keyword) return null;
      return { ...item, matchedKeyword: keyword || null };
    }).filter(Boolean);
    return { ...section, items };
  }).filter(s => s.items.length > 0);
}

/* ---------------- Sidebar (desktop only) ---------------- */
function Sidebar({
  tab, setTab, collapsed, onToggleCollapse,
  searchQuery, setSearchQuery, searchInputRef,
}) {
  const [closedSections, setClosedSections] = useState(() => {
    try {
      const raw = window.localStorage.getItem(NAV_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { window.localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(closedSections)); } catch { /* ignore */ }
  }, [closedSections]);

  const activeSectionId = TAB_META[tab]?.section?.id;
  const searching = !!searchQuery.trim();
  const visibleSections = useMemo(() => matchNavItems(searchQuery) || NAV_SECTIONS, [searchQuery]);
  const firstMatch = searching ? visibleSections[0]?.items[0] : null;

  const toggleSection = (id) => {
    setClosedSections(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const isSectionOpen = (id) => searching || collapsed || id === activeSectionId || !closedSections.includes(id);

  const handleSelect = (id) => {
    setTab(id);
    setSearchQuery('');
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && firstMatch) {
      e.preventDefault();
      handleSelect(firstMatch.id);
    } else if (e.key === 'Escape' && searchQuery) {
      e.preventDefault();
      setSearchQuery('');
    }
  };

  return (
    <nav
      className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}
      aria-label="Admin navigation"
    >
      {/* Search stays pinned at the very top of the navigation */}
      <div className={styles.sidebarSearchWrap}>
        {!collapsed ? (
          <label className={styles.sidebarSearch}>
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search tools…"
              aria-label="Search admin tools"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoComplete="off"
              spellCheck="false"
            />
            {searchQuery ? (
              <button
                type="button"
                className={styles.sidebarSearchClear}
                onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            ) : (
              <kbd className={styles.sidebarSearchKbd}>Ctrl K</kbd>
            )}
          </label>
        ) : (
          <button
            type="button"
            className={styles.sidebarSearchIconBtn}
            onClick={() => { onToggleCollapse(); setTimeout(() => searchInputRef.current?.focus(), 240); }}
            aria-label="Search tools"
            data-tooltip="Search (Ctrl K)"
            data-cuelume-press
            data-cuelume-hover
          >
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
          </button>
        )}
      </div>

      <div className={styles.sidebarNav}>
        {visibleSections.length === 0 && (
          <div className={styles.sidebarEmpty}>
            <span className="material-symbols-outlined" aria-hidden="true">search_off</span>
            No tool matches “{searchQuery}”
          </div>
        )}

        {visibleSections.map((section) => {
          const openSection = isSectionOpen(section.id);
          const sectionHasActive = section.id === activeSectionId;
          return (
            <div key={section.id} className={styles.sidebarSection}>
              {!collapsed ? (
                <button
                  type="button"
                  className={`${styles.sidebarSectionToggle} ${sectionHasActive ? styles.sidebarSectionToggleActive : ''}`}
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={openSection}
                  disabled={searching || sectionHasActive}
                >
                  <span className={`material-symbols-outlined ${styles.sidebarSectionIcon}`} aria-hidden="true">{section.icon}</span>
                  <span className={styles.sidebarSectionLabel}>{section.label}</span>
                  <span className={styles.sidebarSectionCount}>{section.items.length}</span>
                  {!searching && !sectionHasActive && (
                    <span className={`material-symbols-outlined ${styles.sidebarSectionChevron} ${openSection ? styles.sidebarSectionChevronOpen : ''}`} aria-hidden="true">expand_more</span>
                  )}
                </button>
              ) : (
                <div className={styles.sidebarSectionDivider} aria-hidden="true" />
              )}

              {openSection && section.items.map(({ id, icon, label, hint, matchedKeyword }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`${styles.sidebarNavItem} ${active ? styles.sidebarNavItemActive : ''} ${searching && firstMatch?.id === id ? styles.sidebarNavItemFirstMatch : ''}`}
                    onClick={() => handleSelect(id)}
                    data-tooltip={label}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? label : undefined}
                    data-cuelume-press
                    data-cuelume-hover
                  >
                    <span className={`material-symbols-outlined ${styles.sidebarNavIcon}`} aria-hidden="true">{icon}</span>
                    <span className={styles.sidebarNavLabel}>
                      <span className={styles.sidebarNavLabelText}>{label}</span>
                      {searching && (matchedKeyword || hint) && (
                        <span className={styles.sidebarNavMatch}>{matchedKeyword ? `↳ ${matchedKeyword}` : hint}</span>
                      )}
                    </span>
                    {searching && firstMatch?.id === id && <kbd className={styles.sidebarEnterKbd}>↵</kbd>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={styles.sidebarCollapseBtn}
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        data-tooltip={collapsed ? 'Expand' : 'Collapse'}
        data-cuelume-press
        data-cuelume-hover
      >
        <span className={`material-symbols-outlined ${styles.sidebarCollapseIcon}`} aria-hidden="true">
          {collapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
        </span>
        <span className={styles.sidebarCollapseLabel}>Collapse</span>
      </button>
    </nav>
  );
}

/* ---------------- Mobile: bottom category bar ----------------
 * Mirrors the character view's bottom nav. One button per category;
 * tapping a category opens the tool sheet for it (Overview jumps straight home).
 */
function MobileBottomBar({ tab, onSelectSection }) {
  const activeSectionId = TAB_META[tab]?.section?.id;
  return (
    <nav className={styles.mobileBar} aria-label="Admin categories">
      {NAV_SECTIONS.map((section) => {
        const active = section.id === activeSectionId;
        return (
          <button
            key={section.id}
            type="button"
            className={`${styles.mobileBarItem} ${active ? styles.mobileBarItemActive : ''}`}
            onClick={() => onSelectSection(section)}
            aria-label={section.label}
            aria-current={active ? 'true' : undefined}
            data-cuelume-press
          >
            <span className="material-symbols-outlined" aria-hidden="true">{section.icon}</span>
            <span className={styles.mobileBarLabel}>{section.label}</span>
            {active && <span className={styles.mobileBarPill} aria-hidden="true" />}
          </button>
        );
      })}
    </nav>
  );
}

/* ---------------- Mobile: tool sheet ----------------
 * Slides up from the bottom. Shows the tools of one category (or all of them),
 * with the search pinned at the top so every tool is reachable in two taps.
 */
function MobileSheet({ open, section, tab, setTab, onClose, searchQuery, setSearchQuery, searchInputRef }) {
  const searching = !!searchQuery.trim();
  const matched = useMemo(() => matchNavItems(searchQuery), [searchQuery]);
  const sections = searching ? matched : (section ? [section] : NAV_SECTIONS);
  const firstMatch = searching ? sections[0]?.items[0] : null;
  const title = searching ? 'Search results' : (section ? section.label : 'All tools');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (searchQuery) setSearchQuery(''); else onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, searchQuery, setSearchQuery, onClose]);

  const pick = (id) => {
    setTab(id);
    setSearchQuery('');
    onClose();
  };

  return (
    <>
      <div
        className={`${styles.drawerBackdrop} ${open ? styles.drawerBackdropVisible : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`${styles.sheet} ${open ? styles.sheetOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} admin tools`}
        aria-hidden={open ? undefined : 'true'}
      >
        <div className={styles.sheetHandle} aria-hidden="true" />
        <div className={styles.sheetHeader}>
          <div className={styles.sheetTitle}>
            {!searching && section && <span className="material-symbols-outlined" aria-hidden="true">{section.icon}</span>}
            {title}
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close" data-cuelume-press>
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className={styles.sheetSearchWrap}>
          <label className={styles.sidebarSearch}>
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search all tools…"
              aria-label="Search admin tools"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && firstMatch) { e.preventDefault(); pick(firstMatch.id); } }}
              autoComplete="off"
              spellCheck="false"
              enterKeyHint="go"
            />
            {searchQuery && (
              <button type="button" className={styles.sidebarSearchClear} onClick={() => setSearchQuery('')} aria-label="Clear search">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            )}
          </label>
        </div>

        <div className={styles.sheetBody}>
          {sections.length === 0 && (
            <div className={styles.sidebarEmpty}>
              <span className="material-symbols-outlined" aria-hidden="true">search_off</span>
              No tool matches “{searchQuery}”
            </div>
          )}
          {sections.map((s) => (
            <div key={s.id} className={styles.sheetGroup}>
              {(searching || !section) && (
                <div className={styles.sheetGroupLabel}>
                  <span className="material-symbols-outlined" aria-hidden="true">{s.icon}</span>
                  {s.label}
                </div>
              )}
              {s.items.map(({ id, icon, label, hint, matchedKeyword }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`${styles.sheetItem} ${active ? styles.sheetItemActive : ''}`}
                    onClick={() => pick(id)}
                    aria-current={active ? 'page' : undefined}
                    data-cuelume-press
                  >
                    <span className={`material-symbols-outlined ${styles.sheetItemIcon}`} aria-hidden="true">{icon}</span>
                    <span className={styles.sheetItemText}>
                      <span className={styles.sheetItemLabel}>{label}</span>
                      <span className={styles.sheetItemHint}>{matchedKeyword ? `↳ ${matchedKeyword}` : hint}</span>
                    </span>
                    <span className={`material-symbols-outlined ${styles.sheetItemChevron}`} aria-hidden="true">
                      {active ? 'check' : 'chevron_right'}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------------- Top bar ---------------- */
const PUSH_TESTS = [
  { key: 'system', icon: 'notifications', label: 'Test system push', payload: { category: 'system' } },
  { key: 'chat',   icon: 'forum',         label: 'Test chat push',   payload: { category: 'chat' } },
  { key: 'custom', icon: 'campaign',      label: 'Test custom push', payload: { category: 'custom', title: 'Admin Notice', body: 'This is a test notice from admin.' } },
];

function TopBar({ tab, loading, onReload, isMobile, onOpenSearch, onNotify }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef(null);
  useClickOutside(toolsRef, () => setToolsOpen(false), toolsOpen);

  useEffect(() => {
    if (!toolsOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setToolsOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toolsOpen]);

  const meta = TAB_META[tab];

  const runPushTest = (test) => {
    setToolsOpen(false);
    api.post('/push/test', test.payload)
      .then(() => onNotify({ msg: `${test.label.replace('Test ', '')} sent.` }))
      .catch(e => onNotify({ err: 'Push failed: ' + (e?.response?.data?.error || e.message) }));
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <nav className={styles.topbarBreadcrumb} aria-label="Breadcrumb">
          <span className={styles.topbarBreadcrumbRoot}>Admin</span>
          {meta?.section && meta.section.id !== 'overview' && (
            <>
              <span className={styles.topbarBreadcrumbSep} aria-hidden="true">›</span>
              <span className={styles.topbarBreadcrumbSection}>{meta.section.label}</span>
            </>
          )}
          <span className={styles.topbarBreadcrumbSep} aria-hidden="true">›</span>
          <span className={styles.topbarBreadcrumbActive}>
            {meta && <span className="material-symbols-outlined" aria-hidden="true">{meta.icon}</span>}
            {TAB_LABELS[tab] || tab}
          </span>
        </nav>
      </div>

      <div className={styles.topbarActions}>
        <div className={styles.statusPill} title="Connected">
          <span className={styles.statusDot} />
          <span className={styles.statusPillText}>Online</span>
        </div>

        {isMobile && (
          <button
            type="button"
            className={styles.reloadBtn}
            onClick={onOpenSearch}
            aria-label="Search tools"
            title="Search tools"
            data-cuelume-press
            data-cuelume-hover
          >
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
          </button>
        )}

        <button
          type="button"
          className={styles.reloadBtn}
          onClick={onReload}
          disabled={loading}
          aria-label="Reload data"
          title="Reload data"
          data-cuelume-press
          data-cuelume-hover
        >
          <span className={`material-symbols-outlined ${styles.reloadIcon} ${loading ? styles.reloadIconSpin : ''}`} aria-hidden="true">refresh</span>
          <span className={styles.reloadLabel}>Reload</span>
        </button>

        <div className={styles.toolsMenuWrap} ref={toolsRef}>
          <button
            type="button"
            className={`${styles.reloadBtn} ${toolsOpen ? styles.reloadBtnActive : ''}`}
            onClick={() => setToolsOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={toolsOpen}
            aria-label="Developer tools"
            title="Developer tools"
            data-cuelume-press
            data-cuelume-hover
          >
            <span className="material-symbols-outlined" aria-hidden="true">{isMobile ? 'more_vert' : 'build'}</span>
            <span className={styles.reloadLabel}>Tools</span>
          </button>
          {toolsOpen && (
            <div className={styles.toolsMenu} role="menu">
              <div className={styles.toolsMenuLabel}>Push notification tests</div>
              {PUSH_TESTS.map(t => (
                <button key={t.key} type="button" role="menuitem" className={styles.toolsMenuItem} onClick={() => runPushTest(t)} data-cuelume-press>
                  <span className="material-symbols-outlined" aria-hidden="true">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ---------------- Main ---------------- */
export default function Admin() {
  // Active tab lives in the URL (?tab=…) so refresh / back button / shared links keep their place.
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const tab = urlTab && TAB_META[urlTab] ? urlTab : DEFAULT_TAB;
  const setTab = useCallback((next) => {
    const id = TAB_META[next] ? next : DEFAULT_TAB;
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (id === DEFAULT_TAB) p.delete('tab'); else p.set('tab', id);
      return p;
    }, { replace: false });
  }, [setSearchParams]);

  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  // Layout state
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return window.localStorage.getItem('erebus.admin.sidebarCollapsed') === '1'; } catch { return false; }
  });
  // Mobile tool sheet: { section } (one category), { section: null } (all tools), or null (closed)
  const [sheet, setSheet] = useState(null);
  const [navSearch, setNavSearch] = useState('');
  const searchInputRef = useRef(null);
  const closeSheet = useCallback(() => setSheet(null), []);
  const openSheet = useCallback((section = null, focusSearch = false) => {
    setSheet({ section });
    if (focusSearch) setTimeout(() => searchInputRef.current?.focus(), 280);
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem('erebus.admin.sidebarCollapsed', sidebarCollapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [sidebarCollapsed]);

  // Close the sheet when leaving mobile, lock body scroll while it is open.
  useEffect(() => { if (!isMobile) { setSheet(null); setNavSearch(''); } }, [isMobile]);
  useEffect(() => {
    if (!(isMobile && sheet)) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isMobile, sheet]);

  // Bottom bar: single-tool categories (Overview) jump straight there, others open the sheet.
  const handleSelectSection = useCallback((section) => {
    if (section.items.length === 1) { setTab(section.items[0].id); setSheet(null); return; }
    setNavSearch('');
    openSheet(section);
  }, [setTab, openSheet]);

  // Ctrl/Cmd+K (or "/" outside inputs) focuses the tool search.
  useEffect(() => {
    const onKey = (e) => {
      const isK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      const tag = (e.target?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
      const isSlash = e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey;
      if (!isK && !isSlash) return;
      e.preventDefault();
      if (isMobile) { openSheet(null, true); return; }
      setSidebarCollapsed(false);
      setTimeout(() => searchInputRef.current?.focus(), 0);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMobile, openSheet]);

  // Scroll to top when switching tools (mobile especially).
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [tab]);

  // Apply Admin Theme (Purple Liquid Glass) on mount; remove on unmount so it
  // doesn't bleed into the player Home preview.
  useEffect(() => {
    document.documentElement.classList.add('admin-theme');
    return () => {
      document.documentElement.classList.remove('admin-theme');
    };
  }, []);

  // All data state lives here
  const [users, setUsers] = useState([]);
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
  
  const navigate = useNavigate();
  const openCharacterEditor = useCallback((char) => {
    if (char?.id) navigate(`/admin/character/${char.id}`, { state: { owner: char.owner } });
  }, [navigate]);

  // Feedback state (toasts auto-dismiss; errors stay a little longer)
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(''), 5000);
    return () => clearTimeout(t);
  }, [msg]);
  useEffect(() => {
    if (!err) return undefined;
    const t = setTimeout(() => setErr(''), 9000);
    return () => clearTimeout(t);
  }, [err]);
  const notify = useCallback(({ msg: m, err: e }) => {
    if (m !== undefined) setMsg(m);
    if (e !== undefined) setErr(e);
  }, []);

  // Central data loader
  const load = useCallback(async () => {
    setLoading(true); setErr(''); setMsg('');
    setLoadProgress(0);
    
    let completed = 0;
    const total = 14;
    const inc = () => {
      completed++;
      setLoadProgress(Math.round((completed / total) * 100));
    };

    const tasks = [
      api.get('/admin/xp-logs?limit=all').then(res => setXpLogs(res.data.logs || res.data || [])).catch(e => console.error('Failed XP', e)).finally(inc),
      api.get('/admin/chat/groups/messages/all').then(res => setAllGroupMessages(res.data.messages || [])).catch(e => console.error('Failed group msgs', e)).finally(inc),
      api.get('/admin/chat/groups').then(res => setChatGroups(res.data.groups || [])).catch(e => console.error('Failed groups', e)).finally(inc),
      api.get('/admin/emails/messages/all').then(res => setAllEmailMessages(res.data.messages || [])).catch(e => console.error('Failed emails', e)).finally(inc),
      api.get('/admin/premonitions').then(res => setPremonitions(res.data.premonitions || [])).catch(e => console.error('Failed prems', e)).finally(inc),
      api.get('/admin/dice/rolls?limit=all').then(res => setDiceRolls(res.data.rolls || [])).catch(e => console.error('Failed dice', e)).finally(inc),
      api.get('/admin/characters').then(res => setCharacters(res.data.characters || [])).catch(e => console.error('Failed chars', e)).finally(inc),
      api.get('/admin/downtimes').then(res => setDowntimes(res.data.downtimes || [])).catch(e => console.error('Failed downtimes', e)).finally(inc),
      api.get('/admin/npcs').then(res => setNPCs(res.data.npcs || [])).catch(e => console.error('Failed NPCs', e)).finally(inc),
      api.get('/admin/ghouls').then(res => setGhouls(res.data.ghouls || [])).catch(e => console.error('Failed ghouls', e)).finally(inc),
      api.get('/admin/chat/all').then(res => setAllMessages(res.data.messages || [])).catch(e => console.error('Failed chat all', e)).finally(inc),
      api.get('/admin/chat/npc/all').then(res => setAllNpcMessages(res.data.messages || [])).catch(e => console.error('Failed NPC chat', e)).finally(inc),
      api.get('/admin/users').then(res => {
        setUsers(res.data.users || []);
        const idx = {}; 
        (res.data.users || []).forEach(u => {
          if (u.character_id) {
            idx[u.character_id] = {
              user_id: u.id, display_name: u.display_name, email: u.email, role: u.role, 
              char_name: u.char_name, clan: u.clan, xp: u.xp, sheet: u.sheet
            };
          }
        });
        setCharIndex(idx);
      }).catch(e => console.error('Failed users', e)).finally(inc)
    ];

    try {
      await Promise.allSettled(tasks);
    } catch (e) {
      console.error('[Admin] Load failed', e);
      setErr(formatApiError(e, 'Failed to load primary admin data'));
    } finally {
      setLoading(false);
      setLoadProgress(100);
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
      console.error('[Admin] saveUser failed', e);
      setErr(formatApiError(e, 'Failed to save user'));
    }
  }

  // --- Characters ---
  // Direct sheet saves now happen inside the full character editor
  // (/admin/character/:id, which reuses CharacterView) or inline on the grid
  // via updateSheetData's auto-save: there is no longer a standalone "Save"
  // action on the grid itself.

async function grantXP(character_id, delta) {
    if (!delta) return;
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/characters/${character_id}/xp`, { delta: Number(delta) });
      setMsg(`XP adjusted by ${delta} for character #${character_id}`);
      load(); // Reload
    } catch (e) {
      console.error('[Admin] grantXP failed', e);
      setErr(formatApiError(e, 'Failed to adjust XP'));
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

  async function grantBulkXP(delta, characterIds) {
    setErr(''); setMsg('');
    try {
      const { data } = await api.patch('/admin/characters/xp/bulk', { delta: Number(delta), character_ids: characterIds });
      setMsg(`Bulk XP (${delta > 0 ? '+' : ''}${delta}) applied to ${data?.count ?? characterIds.length} characters!`);
      load(); // Reload everything so the grid updates instantly
    } catch (e) {
      console.error('[Admin] grantBulkXP failed', e);
      setErr(formatApiError(e, 'Failed to apply Bulk XP'));
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
      console.error('[Admin] deleteCharacter failed', e);
      setErr(formatApiError(e, 'Failed to delete character'));
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

  // ========= TAB REGISTRY =========
  // One entry per navigation item; ids match NAV_SECTIONS exactly so every tool is reachable.
  const TAB_VIEWS = {
    home: () => (
      <AdminHomeTab
        users={users}
        characters={characters}
        downtimes={downtimes}
        diceRolls={diceRolls}
        xpLogs={xpLogs}
        allMessages={allMessages}
        setTab={setTab}
        onOpenEditor={openCharacterEditor}
      />
    ),
    // Players
    users:       () => <AdminUsersTab users={users} onSave={saveUser} />,
    characters:  () => (
      <AdminCharactersTab
        users={users}
        onDelete={deleteCharacter}
        onOpenEditor={openCharacterEditor}
      />
    ),
    ghouls:      () => <AdminGhoulsTab ghouls={ghouls} />,
    xp:          () => <AdminXPTab users={users} onGrant={grantXP} onBulkGrant={grantBulkXP} adminxp={adminxp} />,
    disciplines: () => <AdminDisciplinesTab />,
    // Chronicle
    calendar:     () => <AdminCalendarTab />,
    downtimes:    () => <AdminDowntimesTab rows={downtimes} onSave={saveDowntime} />,
    feeding:      () => <AdminFeedingTab />,
    claims:       () => <AdminClaimsTab users={users} />,
    domains:      () => <AdminDomainsTab />,
    coteries:     () => <AdminCoteriesTab />,
    prestation:   () => <AdminPrestationTab />,
    premonitions: () => <AdminPremonitionsTab />,
    events:       () => <AdminEventsTab />,
    timeline:     () => <AdminTimelineTab users={users} />,
    // Cast & Comms
    npcs:           () => <AdminNPCsTab npcs={npcs} onReload={load} onDelete={deleteNPC} />,
    npc_emails:     () => <AdminNpcEmailTab npcs={npcs} />,
    broadcast:      () => <AdminBroadcastTab />,
    news_templates: () => <AdminNewsTab users={users} />,
    discord:        () => <AdminDiscordTab users={users} />,
    // Intelligence
    activity: () => <ActivityHeatmap users={users} />,
    stats:    () => (
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
    ),
    chat:     () => (
      <AdminChatLogsTab
        messages={allMessages}
        charIndex={charIndex}
        npcMessages={allNpcMessages}
        groupMessages={allGroupMessages}
        chatGroups={chatGroups}
        npcs={npcs}
        onRefresh={load}
      />
    ),
    dice:     () => <AdminDiceLogsTab />,
    bloodweb: () => <AdminBloodWebTab />,
    // System
    master:     () => <AdminMasterTab />,
    masquerade: () => <AdminMasqueradeTab />,
    audit:      () => <AdminAuditTab />,
    logs:       () => <AdminLogs />,
  };
  const renderTab = TAB_VIEWS[tab] || TAB_VIEWS[DEFAULT_TAB];

  // ========= RENDER =========
  return (
    <div className={`${styles.adminRoot} ${isMobile ? styles.adminRootMobile : ''}`}>
      {/* Desktop: sticky sidebar rail. Mobile: bottom category bar + tool sheet instead. */}
      {!isMobile && (
        <Sidebar
          tab={tab}
          setTab={setTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
          searchQuery={navSearch}
          setSearchQuery={setNavSearch}
          searchInputRef={searchInputRef}
        />
      )}

      <div className={styles.main}>
        <TopBar
          tab={tab}
          loading={loading}
          onReload={load}
          isMobile={isMobile}
          onOpenSearch={() => openSheet(null, true)}
          onNotify={notify}
        />

        {loading && (
          <div className={styles.loadingStrip} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={loadProgress} aria-label="Loading admin data">
            <div className={styles.loadingStripFill} style={{ width: `${loadProgress}%` }} />
          </div>
        )}

        <main className={styles.content}>
          {loading && users.length === 0 ? (
            <div className={styles.centerState}>
              <Loading />
              <div className={styles.centerStateLabel}>Accessing Elysium Archives ({loadProgress}%)</div>
            </div>
          ) : (
            <Suspense fallback={
              <div className={styles.centerState}>
                <Loading />
                <div className={styles.centerStateLabel}>Summoning {TAB_LABELS[tab] || 'Module'}…</div>
              </div>
            }>
              {renderTab()}
            </Suspense>
          )}
        </main>
      </div>

      {/* Mobile navigation: bottom category bar + slide-up tool sheet */}
      {isMobile && (
        <>
          <MobileBottomBar tab={tab} onSelectSection={handleSelectSection} />
          <MobileSheet
            open={!!sheet}
            section={sheet?.section || null}
            tab={tab}
            setTab={setTab}
            onClose={closeSheet}
            searchQuery={navSearch}
            setSearchQuery={setNavSearch}
            searchInputRef={searchInputRef}
          />
        </>
      )}

      {/* Floating feedback toasts */}
      {(err || msg) && (
        <div className={styles.toastBar} role="status" aria-live="polite">
          {err && (
            <div className={`${styles.alert} ${styles.alertError} ${styles.toast}`}>
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <span className={styles.toastText}>{err}</span>
              <button type="button" className={styles.toastClose} onClick={() => setErr('')} aria-label="Dismiss error">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
          )}
          {msg && (
            <div className={`${styles.alert} ${styles.alertInfo} ${styles.toast}`}>
              <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
              <span className={styles.toastText}>{msg}</span>
              <button type="button" className={styles.toastClose} onClick={() => setMsg('')} aria-label="Dismiss message">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}