// src/features/admin/AdminHomeTab.jsx
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../core/api';
import styles from '../../styles/AdminHomeTab.module.css';
import { symlogoWhite, CLAN_HEX as CLAN_COLORS } from '../../data/clans';
import { formatEuDate } from '../../utils/dateFormatter';
import ActivityHeatmap from './ActivityHeatmap';

/** Relative time formatter */
function timeAgo(dateInput) {
  if (!dateInput) return 'None';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'None';

  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatEuDate(dateInput);
}

export default function AdminHomeTab({
  users = [],
  characters = [],
  downtimes = [],
  diceRolls = [],
  xpLogs = [],
  allMessages = [],
  setTab,
  onOpenEditor,
}) {
  // Fetch downtime cycle configuration (opening, deadline, active phase)
  const { data: dtConfig } = useQuery({
    queryKey: ['adminDowntimesConfig'],
    queryFn: async () => {
      const { data } = await api.get('/downtimes/config');
      return data;
    },
    staleTime: 60000,
  });

  // Helper to completely exclude test user Tilemachos (user_id = 2, character_id = 34)
  const isExcludedEntity = (userId, charId) => {
    const uid = Number(userId);
    const cid = Number(charId);
    return uid === 2 || cid === 34;
  };

  // Filter raw collections so test user Tilemachos is never counted in any stats or activity
  const sanitizedUsers = useMemo(() => {
    return users.filter(u => !isExcludedEntity(u.id, u.character_id));
  }, [users]);

  const sanitizedCharacters = useMemo(() => {
    return characters.filter(c => !isExcludedEntity(c.user_id, c.id));
  }, [characters]);

  const sanitizedDowntimes = useMemo(() => {
    return downtimes.filter(d => !isExcludedEntity(d.user_id, d.character_id));
  }, [downtimes]);

  const sanitizedDiceRolls = useMemo(() => {
    return diceRolls.filter(r => !isExcludedEntity(r.user_id, r.character_id));
  }, [diceRolls]);

  const sanitizedXpLogs = useMemo(() => {
    return xpLogs.filter(x => !isExcludedEntity(x.user_id, x.character_id));
  }, [xpLogs]);

  // Helper to verify if a sheet object or JSON string marks the character as active
  const isSheetActive = (sheet) => {
    if (!sheet) return false;
    let parsed = sheet;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch (e) { return false; }
    }
    return parsed?.is_active === true;
  };

  // Active Kindred and active player sets (strictly excluding deactivated, deceased, left, missing, and test users)
  const { activeCharacters, activeCharIdSet, activeUserIdSet, eligiblePlayersCount } = useMemo(() => {
    const charSet = new Set();
    const userSet = new Set();

    // 1. Identify active characters from sanitized characters
    const activeChars = sanitizedCharacters.filter(c => {
      const isActive = isSheetActive(c.sheet) && !c.is_deceased && !c.is_left && !c.is_missing;
      if (isActive) {
        charSet.add(Number(c.id));
        if (c.user_id) userSet.add(Number(c.user_id));
      }
      return isActive;
    });

    // 2. Identify active players from sanitized users
    const activeUsers = sanitizedUsers.filter(u => {
      if (!u.character_id) return false;
      const isSheetOk = isSheetActive(u.sheet) && !u.is_deceased && !u.is_left && !u.is_missing;
      const isCharListOk = charSet.has(Number(u.character_id));
      const isActive = isSheetOk || isCharListOk;
      if (isActive) {
        userSet.add(Number(u.id));
        charSet.add(Number(u.character_id));
      }
      return isActive;
    });

    // Eligible player count strictly reflects active players, never counting deactivated players
    const eligibleCount = activeUsers.length || activeChars.length || 1;

    return {
      activeCharacters: activeChars.length > 0 ? activeChars : sanitizedCharacters.filter(c => charSet.has(Number(c.id))),
      activeCharIdSet: charSet,
      activeUserIdSet: userSet,
      eligiblePlayersCount: eligibleCount,
    };
  }, [sanitizedCharacters, sanitizedUsers]);

  // Cycle Metrics (Calculated from last downtime opening)
  const cycleStats = useMemo(() => {
    const openingStr = dtConfig?.downtime_opening;
    const deadlineStr = dtConfig?.downtime_deadline;
    const openingDate = openingStr ? new Date(openingStr) : null;
    const hasOpening = openingDate && !isNaN(openingDate.getTime());

    // Filter downtimes submitted in this cycle (since opening date)
    // Exclude downtimes from deactivated, deceased, left, missing players, or test user
    const cycleDowntimes = sanitizedDowntimes.filter(d => {
      if (!hasOpening) return true;
      const dDate = new Date(d.created_at || 0);
      if (dDate < openingDate) return false;
      if (activeCharIdSet.size > 0 && d.character_id && !activeCharIdSet.has(Number(d.character_id))) {
        return false;
      }
      if (activeUserIdSet.size > 0 && d.user_id && !activeUserIdSet.has(Number(d.user_id))) {
        return false;
      }
      return true;
    });

    const totalCycle = cycleDowntimes.length;
    // Count as resolved: resolved, resolved in scene, needs a scene
    // Count as NOT resolved: submitted, approved: kikos, approved: mike
    const resolvedDowntimes = cycleDowntimes.filter(d => {
      const s = String(d.status || '').toLowerCase();
      return s === 'resolved' || s === 'resolved in scene' || s === 'needs a scene';
    });
    const resolvedCount = resolvedDowntimes.length;

    // Storyteller specific approvals awaiting second ST action or resolution
    const kikosCount = cycleDowntimes.filter(d => String(d.status || '').toLowerCase() === 'approved: kikos').length;
    const mikeCount = cycleDowntimes.filter(d => String(d.status || '').toLowerCase() === 'approved: mike').length;
    const stApprovedCount = kikosCount + mikeCount;

    // Scenes needed in this cycle (actions grouped by scene_id form 1 scene; unassigned actions count 1 each)
    const scenesNeededDowntimes = cycleDowntimes.filter(d => {
      const s = String(d.status || '').toLowerCase();
      return s === 'needs a scene';
    });
    const uniqueSceneIds = new Set();
    let unassignedSceneCount = 0;
    scenesNeededDowntimes.forEach(d => {
      if (d.scene_id) {
        uniqueSceneIds.add(d.scene_id);
      } else {
        unassignedSceneCount += 1;
      }
    });
    const totalScenesNeeded = uniqueSceneIds.size + unassignedSceneCount;

    // Actions submitted and awaiting Storyteller review in this cycle
    const submittedInCycle = cycleDowntimes.filter(d => {
      const s = String(d.status || '').toLowerCase();
      return s === 'submitted';
    });
    const submittedCount = submittedInCycle.length;

    const resolutionPct = totalCycle > 0
      ? Math.round((resolvedCount / totalCycle) * 100)
      : 100;

    // Unique active players who submitted in this cycle
    const uniqueSubmitterIds = new Set();
    cycleDowntimes.forEach(d => {
      if (d.user_id) uniqueSubmitterIds.add(Number(d.user_id));
      else if (d.player_name) uniqueSubmitterIds.add(d.player_name);
    });
    const playersSubmittedCount = uniqueSubmitterIds.size;

    // Total active players (strictly excluding deactivated players)
    const eligiblePlayers = eligiblePlayersCount;
    const participationPct = Math.min(100, Math.round((playersSubmittedCount / eligiblePlayers) * 100));

    return {
      hasOpening,
      openingLabel: hasOpening ? formatEuDate(openingStr) : null,
      deadlineLabel: deadlineStr ? formatEuDate(deadlineStr) : null,
      totalCycle,
      resolvedCount,
      stApprovedCount,
      kikosCount,
      mikeCount,
      totalScenesNeeded,
      scenesNeededActionsCount: scenesNeededDowntimes.length,
      submittedCount,
      resolutionPct,
      playersSubmittedCount,
      eligiblePlayers,
      participationPct,
    };
  }, [sanitizedDowntimes, dtConfig, activeCharIdSet, activeUserIdSet, eligiblePlayersCount]);

  // Open Character Sheet / Editor Modal
  const handleOpenCharacter = (charIdOrName) => {
    if (!charIdOrName) {
      setTab('characters');
      return;
    }
    const found = sanitizedCharacters.find(c => 
      c.id === Number(charIdOrName) || 
      (c.name && c.name.toLowerCase() === String(charIdOrName).toLowerCase())
    );
    if (found && onOpenEditor) {
      let sheetObj = found.sheet;
      if (typeof sheetObj === 'string') {
        try { sheetObj = JSON.parse(sheetObj); } catch (e) {}
      }
      onOpenEditor({ ...found, sheet: sheetObj });
    } else {
      setTab('characters');
    }
  };

  // State for Owed Downtimes section
  const [showOwedSection, setShowOwedSection] = useState(false);
  const [owedFilter, setOwedFilter] = useState('owing');
  const [owedSearch, setOwedSearch] = useState('');

  // Player Turnout: Ledger of active Kindred and how many DTs they owe
  const owingPlayersData = useMemo(() => {
    const openingStr = dtConfig?.downtime_opening;
    const openingDate = openingStr ? new Date(openingStr) : null;
    const hasOpening = openingDate && !isNaN(openingDate.getTime());

    const dtCountByChar = new Map();
    const dtCountByUser = new Map();

    sanitizedDowntimes.forEach(d => {
      if (hasOpening) {
        const dDate = new Date(d.created_at || 0);
        if (dDate < openingDate) return;
      }
      const s = String(d.status || '').toLowerCase();
      // Rejected actions do not consume quota
      if (s === 'rejected') return;

      if (d.character_id) {
        const cid = Number(d.character_id);
        dtCountByChar.set(cid, (dtCountByChar.get(cid) || 0) + 1);
      }
      if (d.user_id) {
        const uid = Number(d.user_id);
        dtCountByUser.set(uid, (dtCountByUser.get(uid) || 0) + 1);
      }
    });

    const standardLimit = 3;
    const entries = [];

    activeCharacters.forEach(c => {
      const cid = Number(c.id);
      const uid = c.user_id ? Number(c.user_id) : null;
      const user = sanitizedUsers.find(u => Number(u.id) === uid || Number(u.character_id) === cid);

      const submitted = dtCountByChar.has(cid)
        ? (dtCountByChar.get(cid) || 0)
        : (uid && dtCountByUser.has(uid) ? (dtCountByUser.get(uid) || 0) : 0);

      const owed = Math.max(0, standardLimit - submitted);

      entries.push({
        characterId: cid,
        characterName: c.name || `Kindred #${cid}`,
        clan: c.clan || 'Unknown',
        userId: uid || (user ? Number(user.id) : null),
        playerName: user?.display_name || user?.name || c.player_name || 'Kindred Player',
        email: user?.email || '',
        avatarUrl: user?.avatar_url || user?.avatar_url_thumb || '',
        submitted,
        limit: standardLimit,
        owed,
      });
    });

    return entries.sort((a, b) => (b.owed - a.owed) || a.characterName.localeCompare(b.characterName));
  }, [activeCharacters, sanitizedUsers, sanitizedDowntimes, dtConfig]);

  const filteredOwingPlayers = useMemo(() => {
    let list = owingPlayersData;
    if (owedFilter === 'owing') {
      list = list.filter(p => p.owed > 0);
    } else if (owedFilter === 'fulfilled') {
      list = list.filter(p => p.owed === 0);
    }
    const q = owedSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(p =>
      (p.characterName || '').toLowerCase().includes(q) ||
      (p.playerName || '').toLowerCase().includes(q) ||
      (p.clan || '').toLowerCase().includes(q)
    );
  }, [owingPlayersData, owedFilter, owedSearch]);

  const owingCount = useMemo(() => {
    return owingPlayersData.filter(p => p.owed > 0).length;
  }, [owingPlayersData]);

  const handlePlayerTurnoutClick = () => {
    setShowOwedSection(true);
    setTimeout(() => {
      const el = document.getElementById('owed-downtimes-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add(styles.sectionPulse);
        setTimeout(() => el.classList.remove(styles.sectionPulse), 1600);
      }
    }, 60);
  };

  // Pending Actions: Count ONLY submitted actions
  const pendingDowntimes = useMemo(() => {
    return sanitizedDowntimes.filter(d => {
      const s = String(d.status || '').toLowerCase();
      if (s !== 'submitted') return false;
      if (activeCharIdSet.size > 0 && d.character_id && !activeCharIdSet.has(Number(d.character_id))) {
        return false;
      }
      if (activeUserIdSet.size > 0 && d.user_id && !activeUserIdSet.has(Number(d.user_id))) {
        return false;
      }
      if (cycleStats.hasOpening && dtConfig?.downtime_opening) {
        const dDate = new Date(d.created_at || 0);
        if (dDate < new Date(dtConfig.downtime_opening)) return false;
      }
      return true;
    });
  }, [sanitizedDowntimes, activeCharIdSet, activeUserIdSet, cycleStats.hasOpening, dtConfig]);

  // Scenes Needed in this cycle
  const scenesNeededList = useMemo(() => {
    return sanitizedDowntimes.filter(d => {
      const s = String(d.status || '').toLowerCase();
      if (s !== 'needs a scene') return false;
      if (activeCharIdSet.size > 0 && d.character_id && !activeCharIdSet.has(Number(d.character_id))) {
        return false;
      }
      if (activeUserIdSet.size > 0 && d.user_id && !activeUserIdSet.has(Number(d.user_id))) {
        return false;
      }
      if (cycleStats.hasOpening && dtConfig?.downtime_opening) {
        const dDate = new Date(d.created_at || 0);
        if (dDate < new Date(dtConfig.downtime_opening)) return false;
      }
      return true;
    });
  }, [sanitizedDowntimes, activeCharIdSet, activeUserIdSet, cycleStats.hasOpening, dtConfig]);

  const diceStats = useMemo(() => {
    let messy = 0;
    let bestial = 0;
    let crits = 0;
    sanitizedDiceRolls.forEach(r => {
      if (r.messy_crit) messy++;
      if (r.bestial_failure) bestial++;
      if (r.crit_pairs > 0) crits++;
    });
    return { messy, bestial, crits, total: sanitizedDiceRolls.length };
  }, [sanitizedDiceRolls]);

  // Recent Downtime Submissions
  const recentDowntimes = useMemo(() => {
    return [...sanitizedDowntimes]
      .filter(d => {
        if (activeCharIdSet.size > 0 && d.character_id && !activeCharIdSet.has(Number(d.character_id))) {
          return false;
        }
        if (activeUserIdSet.size > 0 && d.user_id && !activeUserIdSet.has(Number(d.user_id))) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 7);
  }, [sanitizedDowntimes, activeCharIdSet, activeUserIdSet]);

  // Clean up and format trait/power target names
  const formatTraitName = (target, action) => {
    if (!target) {
      if (!action) return 'Advancement';
      return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    let str = String(target).trim();
    if (str.startsWith('other__')) {
      str = str.replace(/^other__/, '').replace(/_/g, ' ');
      return str.replace(/\b\w/g, l => l.toUpperCase());
    }
    return str;
  };

  // Recent XP Activity Stream (XP Giving & XP Spending)
  const recentActivity = useMemo(() => {
    const events = [];

    // Filter and map XP logs (exclude 0-cost power picks to focus strictly on XP transactions)
    sanitizedXpLogs.forEach(x => {
      const cost = Number(x.cost || 0);
      if (cost === 0) return;

      const charObj = sanitizedCharacters.find(c => c.id === x.character_id);
      const name = x.character_name || x.char_name || charObj?.name || (x.character_id ? `Character #${x.character_id}` : 'Kindred');
      const clan = charObj?.clan || x.clan;
      const clanColor = (clan && CLAN_COLORS[clan]) ? CLAN_COLORS[clan] : '#e8e6f0';

      const isGrant = cost < 0 || x.action === 'admin_bulk_grant' || (x.action === 'admin_grant' && cost <= 0);
      const isAdminDeduct = (x.action === 'admin_grant' || x.action === 'admin_bulk_grant') && cost > 0;

      let type = 'xp-spend';
      let icon = 'toll';
      let textContent = null;

      if (isGrant) {
        type = 'xp-grant';
        icon = 'stars';
        const grantedAmount = Math.abs(cost);
        const reason = x.target || (x.action === 'admin_bulk_grant' ? 'Bulk Session XP' : 'Storyteller XP Award');
        textContent = (
          <span>
            <span
              style={{ fontWeight: 700, cursor: 'pointer', color: clanColor }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCharacter(x.character_id || name);
              }}
              title={`Open sheet for ${name}`}
            >
              {name}
            </span>{' '}
            received{' '}
            <strong style={{ color: '#ffd700', fontWeight: 800 }}>+{grantedAmount} XP</strong>
            {reason && (
              <span style={{ color: 'var(--text-secondary)', marginLeft: '5px' }}>
                : {reason}
              </span>
            )}
          </span>
        );
      } else if (isAdminDeduct) {
        type = 'xp-deduct';
        icon = 'remove_circle';
        const deductAmount = cost;
        const reason = x.target || 'Admin XP Adjustment';
        textContent = (
          <span>
            <span
              style={{ fontWeight: 700, cursor: 'pointer', color: clanColor }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCharacter(x.character_id || name);
              }}
              title={`Open sheet for ${name}`}
            >
              {name}
            </span>{' '}
            had{' '}
            <strong style={{ color: '#ff5252', fontWeight: 800 }}>{deductAmount} XP</strong>
            {' '}deducted
            {reason && (
              <span style={{ color: 'var(--text-secondary)', marginLeft: '5px' }}>
                : {reason}
              </span>
            )}
          </span>
        );
      } else {
        // Player XP Spend / Trait Advancement
        type = 'xp-spend';
        icon = 'upgrade';
        const spendAmount = cost;
        const traitName = formatTraitName(x.target, x.action);
        let levelDetail = '';
        if (x.to_level != null) {
          if (x.from_level != null && x.from_level !== x.to_level) {
            levelDetail = `${x.from_level} → ${x.to_level}`;
          } else {
            levelDetail = `● ${x.to_level}`;
          }
        }

        textContent = (
          <span>
            <span
              style={{ fontWeight: 700, cursor: 'pointer', color: clanColor }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCharacter(x.character_id || name);
              }}
              title={`Open sheet for ${name}`}
            >
              {name}
            </span>{' '}
            spent{' '}
            <strong style={{ color: '#c084fc', fontWeight: 800 }}>{spendAmount} XP</strong>
            {' '}on{' '}
            <span style={{ color: '#f3f4f6', fontWeight: 600 }}>{traitName}</span>
            {levelDetail && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '5px' }}>
                ({levelDetail})
              </span>
            )}
          </span>
        );
      }

      events.push({
        id: `xp-${x.id || Math.random()}`,
        timestamp: new Date(x.created_at || Date.now()).getTime(),
        dateStr: x.created_at,
        category: 'xp',
        type,
        icon,
        charName: name,
        characterId: x.character_id,
        text: textContent,
        onItemClick: () => handleOpenCharacter(x.character_id || name),
      });
    });

    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  }, [sanitizedXpLogs, sanitizedCharacters, onOpenEditor]);

  const getStatusBadge = (status) => {
    const s = String(status || 'submitted').toLowerCase();
    if (s === 'submitted') return <span className={`${styles.statusPill} ${styles.statusSubmitted}`}>Submitted</span>;
    if (s.includes('needs')) return <span className={`${styles.statusPill} ${styles.statusNeedsScene}`}>Needs Scene</span>;
    if (s === 'approved: kikos') return <span className={styles.statusPill} style={{ background: 'rgba(0, 230, 118, 0.15)', color: '#00e676', border: '1px solid rgba(0, 230, 118, 0.35)' }}>Approved: Kikos</span>;
    if (s === 'approved: mike') return <span className={styles.statusPill} style={{ background: 'rgba(0, 229, 255, 0.15)', color: '#00e5ff', border: '1px solid rgba(0, 229, 255, 0.35)' }}>Approved: Mike</span>;
    if (s === 'approved') return <span className={`${styles.statusPill} ${styles.statusApproved}`}>Approved</span>;
    if (s === 'rejected') return <span className={`${styles.statusPill} ${styles.statusRejected}`}>Rejected</span>;
    return <span className={`${styles.statusPill} ${styles.statusResolved}`}>{status}</span>;
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Hero Header */}
      <div className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <div className={styles.heroTitleRow}>
            <span className={styles.heroBadge}>
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>security</span>
              Command Center
            </span>
          </div>
          <h2 className={styles.heroTitle}>SchreckNet Elysium Terminal</h2>
          <p className={styles.heroSubtitle}>
            Live chronicle overview, player activity telemetry, and Storyteller management.
          </p>
        </div>
        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.panelActionBtn}
            onClick={() => setTab('downtimes')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>schedule</span>
            Manage Downtimes
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className={styles.statGrid}>
        {/* Cycle Resolution % */}
        <div
          className={styles.statCard}
          onClick={() => setTab('downtimes', { statusFilter: 'approved_st' })}
          title="Click to view downtimes approved by one Storyteller"
        >
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Downtimes Resolved</span>
            <div className={styles.statIconWrap}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>task_alt</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div className={styles.statValue}>
              {cycleStats.resolutionPct}%
            </div>
            {cycleStats.openingLabel && (
              <span className={styles.cycleBadge}>
                Since {cycleStats.openingLabel}
              </span>
            )}
          </div>
          <div className={styles.progressBarWrap}>
            <div
              className={`${styles.progressBarFill} ${
                cycleStats.resolutionPct >= 80
                  ? styles.progressBarFillGreen
                  : cycleStats.resolutionPct >= 40
                  ? styles.progressBarFillYellow
                  : styles.progressBarFillPurple
              }`}
              style={{ width: `${cycleStats.resolutionPct}%` }}
            />
          </div>
          <div className={styles.statSubtext}>
            <span>{cycleStats.resolvedCount} out of {cycleStats.totalCycle}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{ color: '#00e676', fontWeight: 600, cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setTab('downtimes', { statusFilter: 'Approved: Kikos' });
                }}
                title="Filter Approved: Kikos"
              >
                {cycleStats.kikosCount} Kikos
              </span>
              <span>,</span>
              <span
                style={{ color: '#00e5ff', fontWeight: 600, cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setTab('downtimes', { statusFilter: 'Approved: Mike' });
                }}
                title="Filter Approved: Mike"
              >
                {cycleStats.mikeCount} Mike
              </span>
            </span>
          </div>
        </div>

        {/* Player Turnout % */}
        <div
          className={styles.statCard}
          onClick={handlePlayerTurnoutClick}
          title="Click to view player submission ledger"
        >
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Player Turnout</span>
            <div className={styles.statIconWrap}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>how_to_reg</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div className={styles.statValue}>
              {cycleStats.participationPct}%
            </div>
            {cycleStats.deadlineLabel && (
              <span className={styles.cycleBadge}>
                Due {cycleStats.deadlineLabel}
              </span>
            )}
          </div>
          <div className={styles.progressBarWrap}>
            <div
              className={`${styles.progressBarFill} ${styles.progressBarFillPurple}`}
              style={{ width: `${cycleStats.participationPct}%` }}
            />
          </div>
          <div className={styles.statSubtext}>
            <span>{cycleStats.playersSubmittedCount} of {cycleStats.eligiblePlayers} players</span>
            <span style={{ color: owingCount > 0 ? '#ffb822' : 'var(--text-muted)', fontWeight: 600 }}>
              {owingCount > 0 ? `${owingCount} owe DTs: View list` : 'All submitted'}
            </span>
          </div>
        </div>

        {/* Pending Actions (Submitted Only) */}
        <div
          className={`${styles.statCard} ${pendingDowntimes.length > 0 ? styles.statCardAlert : ''}`}
          onClick={() => setTab('downtimes', { statusFilter: 'submitted' })}
          title="Click to view submitted actions"
        >
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Pending Actions</span>
            <div className={`${styles.statIconWrap} ${pendingDowntimes.length > 0 ? styles.statIconWrapAlert : ''}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>assignment_late</span>
            </div>
          </div>
          <div className={styles.statValue} style={pendingDowntimes.length > 0 ? { color: '#ffaa00' } : {}}>
            {pendingDowntimes.length}
          </div>
          <div className={styles.statSubtext}>
            {pendingDowntimes.length > 0 ? (
              <span style={{ color: '#ffb822', fontWeight: 600 }}>Needs Storyteller review</span>
            ) : (
              <span>All submissions reviewed</span>
            )}
          </div>
        </div>

        {/* Scenes Needed */}
        <div
          className={`${styles.statCard} ${cycleStats.totalScenesNeeded > 0 ? styles.statCardScenes : ''}`}
          onClick={() => setTab('downtimes', { statusFilter: 'Needs a Scene' })}
          title="Click to view actions requiring a scene"
        >
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Scenes Needed</span>
            <div className={`${styles.statIconWrap} ${cycleStats.totalScenesNeeded > 0 ? styles.statIconWrapScenes : ''}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>theaters</span>
            </div>
          </div>
          <div className={styles.statValue} style={cycleStats.totalScenesNeeded > 0 ? { color: '#ffd700' } : {}}>
            {cycleStats.totalScenesNeeded}
          </div>
          <div className={styles.statSubtext}>
            {cycleStats.totalScenesNeeded === 1 ? (
              <span style={{ color: '#ffd700', fontWeight: 600 }}>
                1 scene required this cycle{cycleStats.scenesNeededActionsCount > 1 ? ` (${cycleStats.scenesNeededActionsCount} actions)` : ''}
              </span>
            ) : cycleStats.totalScenesNeeded > 1 ? (
              <span style={{ color: '#ffd700', fontWeight: 600 }}>
                {cycleStats.totalScenesNeeded} scenes required this cycle{cycleStats.scenesNeededActionsCount > cycleStats.totalScenesNeeded ? ` (${cycleStats.scenesNeededActionsCount} actions)` : ''}
              </span>
            ) : (
              <span>No scenes required this cycle</span>
            )}
          </div>
        </div>

        {/* Active Kindred Count */}
        <div
          className={styles.statCard}
          onClick={() => setTab('characters')}
          title="Click to view characters"
        >
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Active Kindred</span>
            <div className={styles.statIconWrap}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>account_circle</span>
            </div>
          </div>
          <div className={styles.statValue}>{activeCharacters.length}</div>
          <div className={styles.statSubtext}>
            <span>{sanitizedUsers.length} registered accounts</span>
          </div>
        </div>

        {/* Dice Clashes */}
        <div
          className={styles.statCard}
          onClick={() => setTab('dice')}
          title="Click to view dice logs"
        >
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Dice Rolls</span>
            <div className={styles.statIconWrap}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>casino</span>
            </div>
          </div>
          <div className={styles.statValue}>{diceStats.total}</div>
          <div className={styles.statSubtext}>
            <span style={{ color: '#ff5252' }}>{diceStats.messy} Messy</span>
            <span>•</span>
            <span style={{ color: '#ff9100' }}>{diceStats.bestial} Bestial</span>
            <span>•</span>
            <span style={{ color: '#00e676' }}>{diceStats.crits} Crits</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className={styles.mainGrid}>
        {/* Left Column: Recent Downtimes Feed */}
        <div className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleWrap}>
              <span className="material-symbols-outlined" style={{ color: 'var(--accent-purple)', fontSize: '20px' }}>
                pending_actions
              </span>
              <div>
                <h3 className={styles.panelTitle}>Recent Downtime Submissions</h3>
                <p className={styles.panelSubtitle}>
                  {cycleStats.hasOpening
                    ? `Current Cycle (${cycleStats.openingLabel}) • ${cycleStats.resolutionPct}% Resolved (${cycleStats.resolvedCount}/${cycleStats.totalCycle})`
                    : 'Latest actions submitted by players for approval'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className={styles.panelActionBtn}
              onClick={() => setTab('downtimes')}
            >
              All Downtimes →
            </button>
          </div>

          {recentDowntimes.length === 0 ? (
            <div className={styles.emptyNotice}>
              <span className={`material-symbols-outlined ${styles.emptyIcon}`}>inbox</span>
              <span>No downtime actions submitted yet.</span>
            </div>
          ) : (
            <div className={styles.feedList}>
              {recentDowntimes.map((d) => {
                const clanColor = CLAN_COLORS[d.clan] || '#9d7cff';
                const clanLogo = symlogoWhite(d.clan);
                const isProject = d.title && d.title.startsWith('[PROJECT]');
                const cleanTitle = isProject ? d.title.replace(/^\[PROJECT\]\s*/i, '') : d.title;

                return (
                  <div
                    key={d.id}
                    className={styles.downtimeItem}
                    onClick={() => setTab('downtimes')}
                    title="Click to view in Downtimes tab"
                  >
                    <div className={styles.downtimeLeft}>
                      <div
                        className={styles.clanBadgeWrap}
                        style={{ borderColor: `${clanColor}44`, cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCharacter(d.character_id || d.char_name);
                        }}
                        title={`Open sheet for ${d.char_name || 'Character'}`}
                      >
                        {clanLogo ? (
                          <img
                            src={clanLogo}
                            alt={d.clan || 'Clan'}
                            className={styles.clanSymbol}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: clanColor }}>
                            nightlight
                          </span>
                        )}
                      </div>

                      <div className={styles.downtimeDetails}>
                        <div className={styles.downtimeTitle}>
                          {isProject && (
                            <span style={{ fontSize: '0.75rem', color: '#ffb822', marginRight: '6px', fontWeight: 'bold' }}>
                              [PROJECT]
                            </span>
                          )}
                          {cleanTitle || 'Untitled Downtime Action'}
                        </div>
                        <div className={styles.downtimeMeta}>
                          <span
                            className={styles.charName}
                            style={{ color: clanColor, cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCharacter(d.character_id || d.char_name);
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                            title={`Open sheet for ${d.char_name || 'Character'}`}
                          >
                            {d.char_name || 'Unknown Character'}
                          </span>
                          <span>•</span>
                          <span
                            className={styles.playerName}
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTab('users');
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                            title="View user in Users tab"
                          >
                            {d.player_name || 'Player'}
                          </span>
                          {d.clan && (
                            <>
                              <span>•</span>
                              <span>{d.clan}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.downtimeRight}>
                      {getStatusBadge(d.status)}
                      <span className={styles.timeAgo}>{timeAgo(d.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Quick Launchpad + Activity Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Actions Hub */}
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleWrap}>
                <span className="material-symbols-outlined" style={{ color: 'var(--accent-purple)', fontSize: '20px' }}>
                  bolt
                </span>
                <div>
                  <h3 className={styles.panelTitle}>Quick Actions</h3>
                  <p className={styles.panelSubtitle}>Frequently used Storyteller controls</p>
                </div>
              </div>
            </div>

            <div className={styles.quickActionsGrid}>
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => setTab('downtimes')}
              >
                <span className="material-symbols-outlined">schedule</span>
                <span>Review Downtimes</span>
              </button>

              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => setTab('xp')}
              >
                <span className="material-symbols-outlined">stars</span>
                <span>Grant XP</span>
              </button>

              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => setTab('broadcast')}
              >
                <span className="material-symbols-outlined">campaign</span>
                <span>Broadcast Alert</span>
              </button>

              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => setTab('masquerade')}
              >
                <span className="material-symbols-outlined">warning</span>
                <span>Masquerade Dial</span>
              </button>

              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => setTab('dice')}
              >
                <span className="material-symbols-outlined">casino</span>
                <span>Dice Rolls</span>
              </button>

              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => setTab('master')}
              >
                <span className="material-symbols-outlined">admin_panel_settings</span>
                <span>Master Settings</span>
              </button>
            </div>
          </div>

          {/* Recent Player Activity Stream */}
          <div className={styles.panelCard} style={{ flex: 1 }}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleWrap}>
                <span className="material-symbols-outlined" style={{ color: 'var(--accent-purple)', fontSize: '20px' }}>
                  stars
                </span>
                <div>
                  <h3 className={styles.panelTitle}>Recent XP Activity</h3>
                  <p className={styles.panelSubtitle}>Character progression, XP awards, and trait investments</p>
                </div>
              </div>
              <button
                type="button"
                className={styles.panelActionBtn}
                onClick={() => setTab('xp')}
                title="Open Global XP Audit in XP tab"
              >
                Manage XP
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  arrow_forward
                </span>
              </button>
            </div>

            {recentActivity.length === 0 ? (
              <div className={styles.emptyNotice}>
                <span className={`material-symbols-outlined ${styles.emptyIcon}`}>savings</span>
                <span>No recent XP transactions recorded.</span>
              </div>
            ) : (
              <div className={styles.activityStream}>
                {recentActivity.map((act) => {
                  let typeClass = styles.activityItem;
                  let iconColorClass = '';
                  if (act.type === 'xp-grant') {
                    typeClass = `${styles.activityItem} ${styles.activityXpGrant}`;
                    iconColorClass = styles.activityIconGrant;
                  } else if (act.type === 'xp-spend') {
                    typeClass = `${styles.activityItem} ${styles.activityXpSpend}`;
                    iconColorClass = styles.activityIconSpend;
                  } else if (act.type === 'xp-deduct') {
                    typeClass = `${styles.activityItem} ${styles.activityXpDeduct}`;
                    iconColorClass = styles.activityIconDeduct;
                  }

                  return (
                    <div
                      key={act.id}
                      className={typeClass}
                      style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                      onClick={() => {
                        if (act.onItemClick) act.onItemClick();
                      }}
                      title={`Click to open character sheet for ${act.charName}`}
                    >
                      <span className={`material-symbols-outlined ${styles.activityIconWrap} ${iconColorClass}`}>
                        {act.icon}
                      </span>
                      <div className={styles.activityBody}>
                        <div className={styles.activityText}>{act.text}</div>
                        <span className={styles.activityTime}>{timeAgo(act.dateStr)}</span>
                      </div>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '15px', color: 'var(--text-muted)', opacity: 0.7, alignSelf: 'center', flexShrink: 0 }}
                        title="Open character sheet"
                      >
                        open_in_new
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Owed Downtimes Section (Player Turnout Ledger) */}
      <div id="owed-downtimes-section" className={`${styles.owedSection} ${showOwedSection ? styles.owedSectionVisible : ''}`}>
        <div className={styles.owedHeader}>
          <div className={styles.owedTitleWrap}>
            <span className="material-symbols-outlined" style={{ color: '#ffd700', fontSize: '24px' }}>
              assignment_late
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 className={styles.owedTitle}>Downtime Submissions Ledger: Player Turnout</h3>
                <span className={styles.owedBadge}>
                  {owingCount} {owingCount === 1 ? 'player owes actions' : 'players owe actions'}
                </span>
              </div>
              <p className={styles.owedSubtitle}>
                Active Kindred who still owe downtime submissions for this cycle (quota limit: 3 per cycle)
              </p>
            </div>
          </div>
          <div className={styles.owedHeaderActions}>
            <div className={styles.owedFilterPills}>
              {[
                { id: 'owing', label: `Owing (${owingCount})` },
                { id: 'all', label: `All Active (${owingPlayersData.length})` },
                { id: 'fulfilled', label: `Fulfilled (${owingPlayersData.length - owingCount})` },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  className={`${styles.owedFilterBtn} ${owedFilter === f.id ? styles.owedFilterBtnActive : ''}`}
                  onClick={() => setOwedFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className={styles.owedSearchWrap}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>search</span>
              <input
                type="text"
                placeholder="Search character, player, clan..."
                value={owedSearch}
                onChange={(e) => setOwedSearch(e.target.value)}
                className={styles.owedSearchInput}
              />
              {owedSearch && (
                <button
                  type="button"
                  onClick={() => setOwedSearch('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                  title="Clear search"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {filteredOwingPlayers.length === 0 ? (
          <div className={styles.emptyNotice}>
            <span className={`material-symbols-outlined ${styles.emptyIcon}`}>verified</span>
            <span>
              {owedFilter === 'owing'
                ? 'All active Kindred have submitted all required downtimes for this cycle!'
                : 'No players match the search criteria.'}
            </span>
          </div>
        ) : (
          <div className={styles.owedGrid}>
            {filteredOwingPlayers.map(p => {
              const clanColor = CLAN_COLORS[p.clan] || '#9d7cff';
              const clanLogo = symlogoWhite(p.clan);
              const pct = Math.min(100, Math.round((p.submitted / p.limit) * 100));

              return (
                <div
                  key={p.characterId || p.userId || p.characterName}
                  className={styles.playerOwedCard}
                  style={{ borderLeftColor: clanColor }}
                >
                  <div className={styles.playerOwedTop}>
                    <div
                      className={styles.clanBadgeWrap}
                      style={{ borderColor: `${clanColor}44`, cursor: p.characterId ? 'pointer' : 'default' }}
                      onClick={() => p.characterId && handleOpenCharacter(p.characterId)}
                      title={p.characterId ? `Open sheet for ${p.characterName}` : undefined}
                    >
                      {clanLogo ? (
                        <img
                          src={clanLogo}
                          alt={p.clan || 'Clan'}
                          className={styles.clanSymbol}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: clanColor }}>
                          nightlight
                        </span>
                      )}
                    </div>
                    <div className={styles.playerOwedDetails}>
                      <div
                        className={styles.playerOwedCharName}
                        style={{ color: clanColor, cursor: p.characterId ? 'pointer' : 'default' }}
                        onClick={() => p.characterId && handleOpenCharacter(p.characterId)}
                        title={p.characterId ? `Open sheet for ${p.characterName}` : undefined}
                      >
                        {p.characterName}
                      </div>
                      <div className={styles.playerOwedMeta}>
                        <span
                          style={{ cursor: p.userId ? 'pointer' : 'default' }}
                          onClick={() => setTab('users')}
                          title="View user in Users tab"
                        >
                          {p.playerName}
                        </span>
                        {p.clan && (
                          <>
                            <span>:</span>
                            <span>{p.clan}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      {p.owed > 0 ? (
                        <span className={p.owed === 3 ? styles.owedPillCritical : styles.owedPillWarning}>
                          Owes {p.owed} {p.owed === 1 ? 'DT' : 'DTs'}
                        </span>
                      ) : (
                        <span className={styles.owedPillFulfilled}>
                          Fulfilled
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.playerOwedProgressRow}>
                    <div className={styles.progressBarWrap} style={{ margin: 0, flex: 1 }}>
                      <div
                        className={`${styles.progressBarFill} ${
                          pct === 100
                            ? styles.progressBarFillGreen
                            : pct >= 50
                            ? styles.progressBarFillYellow
                            : styles.progressBarFillPurple
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={styles.playerOwedProgressText}>
                      {p.submitted} of {p.limit} submitted
                    </span>
                  </div>

                  <div className={styles.playerOwedActions}>
                    {p.characterId && (
                      <button
                        type="button"
                        className={styles.owedActionBtn}
                        onClick={() => handleOpenCharacter(p.characterId)}
                        title="Open character sheet"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>description</span>
                        Sheet
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.owedActionBtn}
                      onClick={() => {
                        setTab('downtimes');
                      }}
                      title="View downtimes"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>history_edu</span>
                      Downtimes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Embedded Global Activity Heatmap */}
      <div>
        <ActivityHeatmap
          users={sanitizedUsers}
          globalOnly={true}
          onOpenCompare={() => setTab('activity')}
        />
      </div>
    </div>
  );
}
