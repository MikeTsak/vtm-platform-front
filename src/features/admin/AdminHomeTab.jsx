// src/features/admin/AdminHomeTab.jsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../core/api';
import styles from '../../styles/AdminHomeTab.module.css';
import { symlogo, CLAN_HEX as CLAN_COLORS } from '../../data/clans';
import { formatEuDate } from '../../utils/dateFormatter';
import ActivityHeatmap from './ActivityHeatmap';

/** Relative time formatter */
function timeAgo(dateInput) {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

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

  // Cycle Metrics (Calculated from last downtime opening)
  const cycleStats = useMemo(() => {
    const openingStr = dtConfig?.downtime_opening;
    const deadlineStr = dtConfig?.downtime_deadline;
    const openingDate = openingStr ? new Date(openingStr) : null;
    const hasOpening = openingDate && !isNaN(openingDate.getTime());

    // Filter downtimes submitted in this cycle (since opening date)
    const cycleDowntimes = downtimes.filter(d => {
      if (!hasOpening) return true;
      const dDate = new Date(d.created_at || 0);
      return dDate >= openingDate;
    });

    const totalCycle = cycleDowntimes.length;
    const resolvedDowntimes = cycleDowntimes.filter(d => {
      const s = String(d.status || '').toLowerCase();
      return s === 'approved' || s === 'rejected' || s === 'resolved' || s === 'resolved in scene';
    });
    const resolvedCount = resolvedDowntimes.length;

    const resolutionPct = totalCycle > 0
      ? Math.round((resolvedCount / totalCycle) * 100)
      : 100;

    // Unique players who submitted in this cycle
    const uniqueSubmitterIds = new Set();
    cycleDowntimes.forEach(d => {
      if (d.user_id) uniqueSubmitterIds.add(Number(d.user_id));
      else if (d.player_name) uniqueSubmitterIds.add(d.player_name);
    });
    const playersSubmittedCount = uniqueSubmitterIds.size;

    // Total active players (users with a character assigned or active non-admins)
    const eligiblePlayers = users.filter(u => u.character_id).length || users.filter(u => u.role !== 'admin').length || users.length || 1;
    const participationPct = Math.min(100, Math.round((playersSubmittedCount / eligiblePlayers) * 100));

    return {
      hasOpening,
      openingLabel: hasOpening ? formatEuDate(openingStr) : null,
      deadlineLabel: deadlineStr ? formatEuDate(deadlineStr) : null,
      totalCycle,
      resolvedCount,
      resolutionPct,
      playersSubmittedCount,
      eligiblePlayers,
      participationPct,
    };
  }, [downtimes, dtConfig, users]);

  // Open Character Sheet / Editor Modal
  const handleOpenCharacter = (charIdOrName) => {
    if (!charIdOrName) {
      setTab('characters');
      return;
    }
    const found = characters.find(c => 
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

  // KPI Metrics
  const pendingDowntimes = useMemo(() => {
    return downtimes.filter(d => {
      const s = String(d.status || '').toLowerCase();
      return s === 'submitted' || s === 'needs a scene';
    });
  }, [downtimes]);

  const diceStats = useMemo(() => {
    let messy = 0;
    let bestial = 0;
    let crits = 0;
    diceRolls.forEach(r => {
      if (r.messy_crit) messy++;
      if (r.bestial_failure) bestial++;
      if (r.crit_pairs > 0) crits++;
    });
    return { messy, bestial, crits, total: diceRolls.length };
  }, [diceRolls]);

  // Recent Downtime Submissions
  const recentDowntimes = useMemo(() => {
    return [...downtimes]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 7);
  }, [downtimes]);

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
    xpLogs.forEach(x => {
      const cost = Number(x.cost || 0);
      if (cost === 0) return;

      const charObj = characters.find(c => c.id === x.character_id);
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
                — {reason}
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
            <strong style={{ color: '#ff5252', fontWeight: 800 }}>-{deductAmount} XP</strong>
            {' '}deducted
            {reason && (
              <span style={{ color: 'var(--text-secondary)', marginLeft: '5px' }}>
                — {reason}
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
  }, [xpLogs, characters, onOpenEditor]);

  const getStatusBadge = (status) => {
    const s = String(status || 'submitted').toLowerCase();
    if (s === 'submitted') return <span className={`${styles.statusPill} ${styles.statusSubmitted}`}>Submitted</span>;
    if (s.includes('needs')) return <span className={`${styles.statusPill} ${styles.statusNeedsScene}`}>Needs Scene</span>;
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
          onClick={() => setTab('downtimes')}
          title="Click to view downtimes"
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
            <span>{cycleStats.resolvedCount} of {cycleStats.totalCycle} resolved</span>
            {cycleStats.totalCycle - cycleStats.resolvedCount > 0 && (
              <span style={{ color: '#ffaa00', fontWeight: 600 }}>
                {cycleStats.totalCycle - cycleStats.resolvedCount} pending
              </span>
            )}
          </div>
        </div>

        {/* Player Turnout % */}
        <div
          className={styles.statCard}
          onClick={() => setTab('downtimes')}
          title="Click to view player submissions"
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
            <span style={{ color: 'var(--text-muted)' }}>submitted</span>
          </div>
        </div>

        {/* Pending Downtimes */}
        <div
          className={`${styles.statCard} ${pendingDowntimes.length > 0 ? styles.statCardAlert : ''}`}
          onClick={() => setTab('downtimes')}
          title="Click to view downtimes"
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
              <span>All submissions resolved</span>
            )}
          </div>
        </div>

        {/* Characters Count */}
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
          <div className={styles.statValue}>{characters.length}</div>
          <div className={styles.statSubtext}>
            <span>{users.length} registered accounts</span>
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
                const clanLogo = symlogo(d.clan);
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

      {/* Embedded Global Activity Heatmap */}
      <div>
        <ActivityHeatmap
          users={users}
          globalOnly={true}
          onOpenCompare={() => setTab('activity')}
        />
      </div>
    </div>
  );
}
