import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityCalendar } from 'react-activity-calendar';
import api from '../../core/api';
import adminStyles from '../../styles/Admin.module.css';
import styles from './ActivityHeatmap.module.css';

const THEMES = {
  amethyst: {
    id: 'amethyst',
    name: 'Amethyst Glow',
    dot: '#a855f7',
    levels: ['#161622', '#3b1c60', '#6b21a8', '#9333ea', '#c084fc', '#f5d0fe'],
  },
  crimson: {
    id: 'crimson',
    name: 'Vampire Blood',
    dot: '#f43f5e',
    levels: ['#1a1315', '#4c0519', '#9f1239', '#e11d48', '#fb7185', '#ffe4e6'],
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Night',
    dot: '#10b981',
    levels: ['#111915', '#064e3b', '#047857', '#059669', '#34d399', '#a7f3d0'],
  },
  amber: {
    id: 'amber',
    name: 'SchreckNet Gold',
    dot: '#f59e0b',
    levels: ['#191612', '#451a03', '#92400e', '#d97706', '#fbbf24', '#fef3c7'],
  },
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Chronicle season order starting from September through August
const SEASON_MONTH_INDICES = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7];

export default function ActivityHeatmap({ users = [], globalOnly = false, onOpenCompare }) {
  const [selectedUser1, setSelectedUser1] = useState('global');
  const [selectedUser2, setSelectedUser2] = useState('none');
  const [currentThemeKey, setCurrentThemeKey] = useState('amethyst');
  const [selectedDate, setSelectedDate] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [hoveredHour, setHoveredHour] = useState(null);

  const hoverTimeoutRef = useRef(null);
  const drillDownRef = useRef(null);

  const currentTheme = THEMES[currentThemeKey] || THEMES.amethyst;

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const fetchStats = async (userId) => {
    if (userId === 'none') return [];
    const url = userId === 'global' ? '/activity/stats' : `/activity/stats?userId=${userId}`;
    const { data } = await api.get(url);
    return data;
  };

  const activeUser1 = globalOnly ? 'global' : selectedUser1;

  const { data: data1 = [], isLoading: isLoading1, isError: isError1 } = useQuery({
    queryKey: ['activityStats', activeUser1],
    queryFn: () => fetchStats(activeUser1),
    retry: 1,
  });

  const { data: data2 = [], isLoading: isLoading2, isError: isError2 } = useQuery({
    queryKey: ['activityStats', selectedUser2],
    queryFn: () => fetchStats(selectedUser2),
    enabled: !globalOnly && selectedUser2 !== 'none',
    retry: 1,
  });

  const isComparing = !globalOnly && selectedUser2 !== 'none';

  // Query 24:00 day breakdown for primary target
  const { data: dayStats1, isLoading: isDayLoading1 } = useQuery({
    queryKey: ['activityDayStats', selectedDate, activeUser1],
    queryFn: async () => {
      if (!selectedDate) return null;
      const url = activeUser1 === 'global'
        ? `/activity/day-stats?date=${selectedDate}`
        : `/activity/day-stats?date=${selectedDate}&userId=${activeUser1}`;
      const { data } = await api.get(url);
      return data;
    },
    enabled: !!selectedDate,
    retry: 1,
  });

  // Query 24:00 day breakdown for comparison target
  const { data: dayStats2, isLoading: isDayLoading2 } = useQuery({
    queryKey: ['activityDayStats', selectedDate, selectedUser2],
    queryFn: async () => {
      if (!selectedDate || selectedUser2 === 'none') return null;
      const url = selectedUser2 === 'global'
        ? `/activity/day-stats?date=${selectedDate}`
        : `/activity/day-stats?date=${selectedDate}&userId=${selectedUser2}`;
      const { data } = await api.get(url);
      return data;
    },
    enabled: !!selectedDate && isComparing,
    retry: 1,
  });

  const getName = (val) => {
    if (val === 'global') return 'Global Activity';
    if (val === 'none') return '';
    const u = users.find(u => u.id === Number(val));
    return u ? u.display_name : `User #${val}`;
  };

  const calculateLevel = (minutes) => {
    if (!minutes || minutes <= 0) return 0;
    if (minutes < 15) return 1;
    if (minutes < 45) return 2;
    if (minutes < 90) return 3;
    if (minutes < 180) return 4;
    return 5;
  };

  // Ensure calendar spans the chronicle season starting September 1st in Athens time through August 31st
  const getSafeData = (data = []) => {
    const nowAthens = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Athens',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(nowAthens);
    const athensYear = parseInt(parts.find(p => p.type === 'year').value, 10);
    const athensMonth = parseInt(parts.find(p => p.type === 'month').value, 10);

    const seasonStartYear = athensMonth >= 9 ? athensYear : athensYear - 1;
    const seasonEndYear = seasonStartYear + 1;

    const startOfSeasonStr = `${seasonStartYear}-09-01`;
    const endOfSeasonStr = `${seasonEndYear}-08-31`;

    const map = new Map();
    // Anchor boundaries so react-activity-calendar renders from September through August
    map.set(startOfSeasonStr, { date: startOfSeasonStr, count: 0, level: 0, activeUsers: 0, sessionCount: 0 });
    map.set(endOfSeasonStr, { date: endOfSeasonStr, count: 0, level: 0, activeUsers: 0, sessionCount: 0 });

    if (Array.isArray(data)) {
      data.forEach(item => {
        if (!item || !item.date) return;
        const count = Number(item.count) || 0;
        const level = item.level !== undefined ? Number(item.level) : calculateLevel(count);
        map.set(item.date, {
          date: item.date,
          count,
          level,
          activeUsers: item.activeUsers !== undefined ? Number(item.activeUsers) : (count > 0 ? 1 : 0),
          sessionCount: item.sessionCount !== undefined ? Number(item.sessionCount) : (count > 0 ? 1 : 0),
        });
      });
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  const safeData1 = useMemo(() => getSafeData(data1), [data1]);
  const safeData2 = useMemo(() => getSafeData(data2), [data2]);

  // Aggregate monthly intelligence from safeData1 ordered from September through August
  const monthlyStats1 = useMemo(() => {
    const list = SEASON_MONTH_INDICES.map(i => ({
      index: i,
      name: MONTH_NAMES[i],
      short: MONTH_SHORT[i],
      totalMinutes: 0,
      activeDays: 0,
      peakMinutes: 0,
      peakDate: null,
    }));

    for (const item of safeData1) {
      if (!item.date) continue;
      const parts = item.date.split('-');
      if (parts.length < 2) continue;
      const mIdx = Number(parts[1]) - 1;
      const mObj = list.find(m => m.index === mIdx);
      if (mObj) {
        const count = Number(item.count) || 0;
        mObj.totalMinutes += count;
        if (count > 0) {
          mObj.activeDays += 1;
          if (count > mObj.peakMinutes) {
            mObj.peakMinutes = count;
            mObj.peakDate = item.date;
          }
        }
      }
    }

    let busiest = list[0];
    let annualTotal = 0;
    let totalActiveDays = 0;

    for (const m of list) {
      annualTotal += m.totalMinutes;
      totalActiveDays += m.activeDays;
      if (m.totalMinutes > busiest.totalMinutes) {
        busiest = m;
      }
    }

    return {
      months: list,
      busiest,
      annualTotal,
      totalActiveDays,
    };
  }, [safeData1]);

  // Aggregate monthly intelligence for comparison target ordered from September through August
  const monthlyStats2 = useMemo(() => {
    if (!isComparing) return null;
    const list = SEASON_MONTH_INDICES.map(i => ({
      index: i,
      name: MONTH_NAMES[i],
      short: MONTH_SHORT[i],
      totalMinutes: 0,
      activeDays: 0,
    }));

    for (const item of safeData2) {
      if (!item.date) continue;
      const parts = item.date.split('-');
      if (parts.length < 2) continue;
      const mIdx = Number(parts[1]) - 1;
      const mObj = list.find(m => m.index === mIdx);
      if (mObj) {
        const count = Number(item.count) || 0;
        mObj.totalMinutes += count;
        if (count > 0) {
          mObj.activeDays += 1;
        }
      }
    }

    let annualTotal = 0;
    for (const m of list) {
      annualTotal += m.totalMinutes;
    }

    return {
      months: list,
      annualTotal,
    };
  }, [safeData2, isComparing]);

  // Strictly dd/mm/yyyy date format in Athens Greece time
  const formatDateDisplay = (dateString, includeWeekday = true) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length < 3) return dateString;
    const yyyy = parts[0];
    const mm = parts[1].padStart(2, '0');
    const dd = parts[2].padStart(2, '0');
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    const weekday = d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'Europe/Athens' });
    return includeWeekday ? `${dd}/${mm}/${yyyy}, ${weekday}` : `${dd}/${mm}/${yyyy}`;
  };

  const formatDurationDHM = (totalMinutes) => {
    if (!totalMinutes || totalMinutes <= 0) return '0m';
    const days = Math.floor(totalMinutes / 1440);
    const remainingMinutes = totalMinutes % 1440;
    const hrs = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
    return parts.join(' ');
  };

  const formatHoursMinutes = (totalMinutes) => {
    if (!totalMinutes || totalMinutes <= 0) return '0 minutes';
    const days = Math.floor(totalMinutes / 1440);
    const remainingMinutes = totalMinutes % 1440;
    const hrs = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    return parts.join(' ');
  };

  const handleDayHover = (e, activity, targetLabel) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const parts = activity.date.split('-');
    const mIdx = parts.length > 1 ? Number(parts[1]) - 1 : 0;

    setHoveredDay({
      date: activity.date,
      count: activity.count,
      level: activity.level,
      activeUsers: activity.activeUsers || (activity.count > 0 ? 1 : 0),
      sessionCount: activity.sessionCount || (activity.count > 0 ? 1 : 0),
      monthName: MONTH_NAMES[mIdx],
      targetLabel: targetLabel || getName(activeUser1),
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleDayLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredDay(null);
    }, 70);
  };

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    setTimeout(() => {
      if (drillDownRef.current) {
        drillDownRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 60);
  };

  const handleNavigateDay = (delta) => {
    if (!selectedDate) return;
    const parts = selectedDate.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() + delta);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Day currently shown in spotlight (hovered day or selected day or today)
  const activeSpotlight = useMemo(() => {
    const targetDate = hoveredDay?.date || selectedDate || (safeData1[safeData1.length - 1]?.date);
    if (!targetDate) return null;

    const match1 = safeData1.find(d => d.date === targetDate);
    const match2 = isComparing ? safeData2.find(d => d.date === targetDate) : null;
    const parts = targetDate.split('-');
    const mIdx = parts.length > 1 ? Number(parts[1]) - 1 : 0;

    return {
      date: targetDate,
      monthName: MONTH_NAMES[mIdx],
      user1: {
        name: getName(activeUser1),
        count: match1 ? match1.count : 0,
        level: match1 ? match1.level : 0,
        activeUsers: match1 ? match1.activeUsers : 0,
        sessionCount: match1 ? match1.sessionCount : 0,
      },
      user2: isComparing ? {
        name: getName(selectedUser2),
        count: match2 ? match2.count : 0,
        level: match2 ? match2.level : 0,
        activeUsers: match2 ? match2.activeUsers : 0,
        sessionCount: match2 ? match2.sessionCount : 0,
      } : null,
      hoveredTarget: hoveredDay?.targetLabel || null,
    };
  }, [hoveredDay, selectedDate, safeData1, safeData2, isComparing, activeUser1, selectedUser2]);

  // Combined matrix users for day drilldown, sorted from most active to least active
  const combinedMatrixUsers = useMemo(() => {
    if (!isComparing) {
      return [...(dayStats1?.users || [])].sort((a, b) => b.totalMinutes - a.totalMinutes);
    }
    if (activeUser1 === 'global') {
      return [...(dayStats1?.users || [])].sort((a, b) => b.totalMinutes - a.totalMinutes);
    }
    if (selectedUser2 === 'global') {
      return [...(dayStats2?.users || [])].sort((a, b) => b.totalMinutes - a.totalMinutes);
    }

    // Player vs Player comparison
    const list = [];
    const seen = new Set();
    (dayStats1?.users || []).forEach(u => {
      seen.add(u.id);
      list.push(u);
    });
    if (!seen.has(Number(activeUser1)) && activeUser1 !== 'global') {
      list.push({
        id: Number(activeUser1),
        name: getName(activeUser1),
        totalMinutes: 0,
        hours: Array(24).fill(0),
      });
      seen.add(Number(activeUser1));
    }
    (dayStats2?.users || []).forEach(u => {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        list.push(u);
      }
    });
    if (!seen.has(Number(selectedUser2)) && selectedUser2 !== 'global' && selectedUser2 !== 'none') {
      list.push({
        id: Number(selectedUser2),
        name: getName(selectedUser2),
        totalMinutes: 0,
        hours: Array(24).fill(0),
      });
      seen.add(Number(selectedUser2));
    }
    return list.sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [isComparing, activeUser1, selectedUser2, dayStats1, dayStats2]);

  // Combined active users for hovered hour
  const hoveredHourUsers = useMemo(() => {
    if (hoveredHour === null) return [];
    const u1 = dayStats1?.hourly?.[hoveredHour]?.activeUsers || [];
    const u2 = isComparing ? (dayStats2?.hourly?.[hoveredHour]?.activeUsers || []) : [];
    const map = new Map();
    [...u1, ...u2].forEach(u => {
      if (!map.has(u.id)) map.set(u.id, u);
    });
    return Array.from(map.values());
  }, [hoveredHour, dayStats1, dayStats2, isComparing]);

  // Average minutes per player across recorded matrix players for that date
  const matrixAverageMinutes = useMemo(() => {
    if (!combinedMatrixUsers || combinedMatrixUsers.length === 0) return 0;
    const sum = combinedMatrixUsers.reduce((acc, u) => acc + (u.totalMinutes || 0), 0);
    return combinedMatrixUsers.length > 0 ? sum / combinedMatrixUsers.length : 0;
  }, [combinedMatrixUsers]);

  const formatRatioToAverage = (mins) => {
    if (!matrixAverageMinutes || matrixAverageMinutes <= 0) {
      return mins > 0 ? '(1.0x avg)' : '(0.0x avg)';
    }
    const ratio = (mins / matrixAverageMinutes).toFixed(1);
    return `(${ratio}x avg)`;
  };

  const isDayLoading = isDayLoading1 || (isComparing && isDayLoading2);
  const hasDayData = Boolean(dayStats1 || (isComparing && dayStats2));

  const tooltipMatch1 = hoveredDay ? safeData1.find(d => d.date === hoveredDay.date) : null;
  const tooltipMatch2 = hoveredDay && isComparing ? safeData2.find(d => d.date === hoveredDay.date) : null;

  return (
    <div className={`${adminStyles.editorSection} ${adminStyles.characterCard}`} style={{ marginBottom: '24px' }}>
      <div className={adminStyles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 className={adminStyles.hl}>{globalOnly ? 'Global Activity Heatmap' : 'Activity Heatmap and Comparison'}</h3>
          <p className={adminStyles.subtle}>
            {globalOnly
              ? 'Chronicle wide telemetry tracking total minutes players spend online in Athens Greece time.'
              : 'Compare online activity and engagement trends between players or against global chronicle averages in Athens Greece time.'}
          </p>
        </div>
        {globalOnly && onOpenCompare && (
          <button
            type="button"
            className={adminStyles.panelActionBtn}
            onClick={onOpenCompare}
            style={{
              background: 'transparent',
              border: '1px solid var(--glass-border)',
              color: 'var(--accent-purple)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>compare_arrows</span>
            Compare Players
          </button>
        )}
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Controls Bar: User Selectors and Vibrant Theme Palettes */}
        <div className={styles.controlsBar}>
          <div className={styles.selectorGroup}>
            {!globalOnly && (
              <>
                <div>
                  <label className={adminStyles.subtle} style={{ display: 'block', marginBottom: '4px', fontSize: '0.78rem' }}>Primary View</label>
                  <select className={adminStyles.select} value={selectedUser1} onChange={e => setSelectedUser1(e.target.value)}>
                    <option value="global">Global (Everyone)</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.display_name} (#{u.id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={adminStyles.subtle} style={{ display: 'block', marginBottom: '4px', fontSize: '0.78rem' }}>Compare With</label>
                  <select className={adminStyles.select} value={selectedUser2} onChange={e => setSelectedUser2(e.target.value)}>
                    <option value="none">None</option>
                    <option value="global">Global (Everyone)</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.display_name} (#{u.id})</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Theme Palette Switcher */}
          <div className={styles.themeSelector}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '4px' }}>Color Theme:</span>
            {Object.values(THEMES).map(th => {
              const isActive = currentThemeKey === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  className={`${styles.themePill} ${isActive ? styles.themePillActive : ''}`}
                  onClick={() => setCurrentThemeKey(th.id)}
                >
                  <span className={styles.themeDot} style={{ background: th.dot }} />
                  {th.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Monthly Activity Breakdown and Navigation Cards */}
        <div className={styles.monthSummarySection}>
          <div className={styles.monthSummaryHeader}>
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: 'var(--accent-purple)' }}>calendar_view_month</span>
              Monthly Activity Breakdown (Season starting September)
            </span>
            <span style={{ fontSize: '0.76rem' }}>
              {!isComparing ? (
                <>
                  Busiest Month: <strong style={{ color: 'var(--text-primary)' }}>{monthlyStats1.busiest.name} ({formatHoursMinutes(monthlyStats1.busiest.totalMinutes)})</strong>
                  {', '}Total: <strong style={{ color: 'var(--accent-purple)' }}>{formatHoursMinutes(monthlyStats1.annualTotal)}</strong>
                </>
              ) : (
                <>
                  {getName(activeUser1)}: <strong style={{ color: currentTheme.dot }}>{formatHoursMinutes(monthlyStats1.annualTotal)}</strong>
                  {' vs '}
                  {getName(selectedUser2)}: <strong style={{ color: 'var(--text-primary)' }}>{formatHoursMinutes(monthlyStats2?.annualTotal || 0)}</strong>
                </>
              )}
            </span>
          </div>

          <div className={styles.monthScrollTrack}>
            {monthlyStats1.months.map(m => {
              const isSelected = selectedMonth === m.index;
              const isBusiest = monthlyStats1.busiest.index === m.index && m.totalMinutes > 0;
              const compMinutes = monthlyStats2?.months?.[m.index]?.totalMinutes || 0;
              const compDays = monthlyStats2?.months?.[m.index]?.activeDays || 0;

              return (
                <div
                  key={m.index}
                  className={`${styles.monthCard} ${isSelected ? styles.monthCardActive : ''}`}
                  onClick={() => setSelectedMonth(isSelected ? null : m.index)}
                  title={`Click to filter ${m.name}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={styles.monthName}>{m.short}</span>
                    {isBusiest && (
                      <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--color-warn)' }} title="Peak Activity Month">
                        local_fire_department
                      </span>
                    )}
                  </div>

                  {!isComparing ? (
                    <>
                      <span className={styles.monthMinutes}>{formatDurationDHM(m.totalMinutes)}</span>
                      <span className={styles.monthAvg}>
                        AVG: {formatDurationDHM(m.activeDays > 0 ? Math.round(m.totalMinutes / m.activeDays) : 0)}
                      </span>
                      <span className={styles.monthDays}>{m.activeDays} active day{m.activeDays === 1 ? '' : 's'}</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.monthMinutes} style={{ fontSize: '0.78rem' }}>{formatDurationDHM(m.totalMinutes)}</span>
                      <span className={styles.monthAvg}>
                        AVG: {formatDurationDHM(m.activeDays > 0 ? Math.round(m.totalMinutes / m.activeDays) : 0)}
                      </span>
                      <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>
                        vs {formatDurationDHM(compMinutes)}
                      </span>
                      <span className={styles.monthAvg} style={{ fontSize: '0.66rem' }}>
                        AVG: {formatDurationDHM(compDays > 0 ? Math.round(compMinutes / compDays) : 0)}
                      </span>
                      <span className={styles.monthDays}>{m.activeDays} vs {compDays} days</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Heatmap Area */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px' }}>
          <div style={{ flex: '1 1 500px' }}>
            {!globalOnly && <h4 style={{ marginBottom: '14px', color: 'var(--text-primary)' }}>{getName(selectedUser1)}</h4>}
            {isLoading1 ? (
              <div style={{ color: 'var(--text-secondary)' }}>Loading activity data...</div>
            ) : isError1 ? (
              <div style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>
                Unable to load activity telemetry. Ensure backend session service is running.
              </div>
            ) : (
              <div className={styles.calendarWrapper}>
                <ActivityCalendar
                  data={safeData1}
                  maxLevel={5}
                  labels={{
                    months: MONTH_SHORT,
                    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                    totalCount: '{{count}} minutes logged in season (Athens Time)',
                    legend: {
                      less: '0 min',
                      more: '180+ min',
                    },
                  }}
                  showWeekdayLabels={true}
                  theme={{
                    light: currentTheme.levels,
                    dark: currentTheme.levels,
                  }}
                  colorScheme="dark"
                  renderBlock={(block, activity) => {
                    const isSelected = selectedDate === activity.date;
                    const parts = activity.date.split('-');
                    const mIdx = parts.length > 1 ? Number(parts[1]) - 1 : -1;
                    const isFilteredMonth = selectedMonth !== null && mIdx === selectedMonth;

                    return React.cloneElement(block, {
                      onClick: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDayClick(activity.date);
                      },
                      onMouseEnter: (e) => handleDayHover(e, activity, getName(activeUser1)),
                      onMouseLeave: handleDayLeave,
                      style: {
                        ...block.props.style,
                        cursor: 'pointer',
                        outline: isSelected ? '2px solid #ffffff' : (isFilteredMonth ? '1.5px solid var(--accent-purple)' : 'none'),
                        outlineOffset: '1px',
                        opacity: selectedMonth !== null && mIdx !== selectedMonth ? 0.35 : 1,
                      },
                    });
                  }}
                />
              </div>
            )}
          </div>

          {!globalOnly && selectedUser2 !== 'none' && (
            <div style={{ flex: '1 1 500px' }}>
              <h4 style={{ marginBottom: '14px', color: 'var(--text-primary)' }}>{getName(selectedUser2)}</h4>
              {isLoading2 ? (
                <div style={{ color: 'var(--text-secondary)' }}>Loading activity data...</div>
              ) : isError2 ? (
                <div style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>
                  Unable to load comparison activity telemetry.
                </div>
              ) : (
                <div className={styles.calendarWrapper}>
                  <ActivityCalendar
                    data={safeData2}
                    maxLevel={5}
                    labels={{
                      months: MONTH_SHORT,
                      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                      totalCount: '{{count}} minutes logged in season (Athens Time)',
                      legend: {
                        less: '0 min',
                        more: '180+ min',
                      },
                    }}
                    showWeekdayLabels={true}
                    theme={{
                      light: currentTheme.levels,
                      dark: currentTheme.levels,
                    }}
                    colorScheme="dark"
                    renderBlock={(block, activity) => {
                      const isSelected = selectedDate === activity.date;
                      const parts = activity.date.split('-');
                      const mIdx = parts.length > 1 ? Number(parts[1]) - 1 : -1;
                      const isFilteredMonth = selectedMonth !== null && mIdx === selectedMonth;

                      return React.cloneElement(block, {
                        onClick: (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDayClick(activity.date);
                        },
                        onMouseEnter: (e) => handleDayHover(e, activity, getName(selectedUser2)),
                        onMouseLeave: handleDayLeave,
                        style: {
                          ...block.props.style,
                          cursor: 'pointer',
                          outline: isSelected ? '2px solid #ffffff' : (isFilteredMonth ? '1.5px solid var(--accent-purple)' : 'none'),
                          outlineOffset: '1px',
                          opacity: selectedMonth !== null && mIdx !== selectedMonth ? 0.35 : 1,
                        },
                      });
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Legend Scale Explanation */}
        <div className={styles.legendRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--accent-purple)' }}>info</span>
            <span>Click any day to drill down into 24:00 hourly heatmap</span>
          </div>

          <div className={styles.legendScale}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>0m</span>
            {currentTheme.levels.map((color, idx) => (
              <span
                key={idx}
                className={styles.legendBox}
                style={{ background: color }}
                title={`Level ${idx}: ${idx === 0 ? '0 min' : idx === 1 ? '1 to 15 min' : idx === 2 ? '15 to 45 min' : idx === 3 ? '45 to 90 min' : idx === 4 ? '90 to 180 min' : '180+ min'}`}
              />
            ))}
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>180m+</span>
          </div>
        </div>

        {/* Day Spotlight Card */}
        {activeSpotlight && (
          <div className={styles.spotlightCard}>
            <div className={styles.spotlightLeft}>
              <div className={styles.spotlightIconBadge}>
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <div className={styles.spotlightMeta}>
                <span className={styles.spotlightTitle}>{formatDateDisplay(activeSpotlight.date)}</span>
                <span className={styles.spotlightSubtitle}>
                  Month: {activeSpotlight.monthName}
                  {!isComparing && `, Intensity: Level ${activeSpotlight.user1.level} of 5`}
                  {isComparing && `, Comparing ${activeSpotlight.user1.name} vs ${activeSpotlight.user2?.name}`}
                </span>
              </div>
            </div>

            <div className={styles.spotlightRight}>
              {!isComparing ? (
                <>
                  <div className={styles.spotlightStatItem}>
                    <span className={styles.spotlightStatValue}>{formatHoursMinutes(activeSpotlight.user1.count)}</span>
                    <span className={styles.spotlightStatLabel}>Active Time</span>
                  </div>
                  <div className={styles.spotlightStatItem}>
                    <span className={styles.spotlightStatValue}>{activeSpotlight.user1.activeUsers}</span>
                    <span className={styles.spotlightStatLabel}>Active Players</span>
                  </div>
                  <div className={styles.spotlightStatItem}>
                    <span className={styles.spotlightStatValue}>{activeSpotlight.user1.sessionCount}</span>
                    <span className={styles.spotlightStatLabel}>Sessions</span>
                  </div>
                </>
              ) : (
                <div className={styles.dualSpotlightGrid}>
                  <div className={styles.spotlightUserBlock}>
                    <span className={styles.spotlightUserBlockTitle}>{activeSpotlight.user1.name}</span>
                    <span className={styles.spotlightStatValue} style={{ color: currentTheme.dot }}>
                      {formatHoursMinutes(activeSpotlight.user1.count)}
                    </span>
                    <span className={styles.spotlightSubtitle}>
                      Level {activeSpotlight.user1.level} of 5, {activeSpotlight.user1.sessionCount} sessions
                    </span>
                  </div>

                  <span className={styles.compareVsBadge}>VS</span>

                  <div className={styles.spotlightUserBlock}>
                    <span className={styles.spotlightUserBlockTitle}>{activeSpotlight.user2?.name}</span>
                    <span className={styles.spotlightStatValue}>
                      {formatHoursMinutes(activeSpotlight.user2?.count || 0)}
                    </span>
                    <span className={styles.spotlightSubtitle}>
                      Level {activeSpotlight.user2?.level || 0} of 5, {activeSpotlight.user2?.sessionCount || 0} sessions
                    </span>
                  </div>
                </div>
              )}

              {selectedDate !== activeSpotlight.date && (
                <button
                  type="button"
                  className={styles.drillNavBtn}
                  onClick={() => handleDayClick(activeSpotlight.date)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>insights</span>
                  {isComparing ? 'Inspect 24:00 Comparison' : 'Inspect 24:00 Heatmap'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 24-Hour Daily Drill-Down Heatmap Section */}
        {selectedDate && (
          <div ref={drillDownRef} className={styles.drillDownContainer}>
            <div className={styles.drillDownHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '26px', color: currentTheme.dot }}>
                  schedule
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                    {isComparing ? 'Day Activity Comparison' : 'Day Activity Heatmap'}: {formatDateDisplay(selectedDate)} (Athens Time)
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    24:00 hourly presence breakdown and Kindred matrix (00:00 to 23:00 Athens Time)
                  </p>
                </div>
              </div>

              <div className={styles.drillDownNav}>
                <button
                  type="button"
                  className={styles.drillNavBtn}
                  onClick={() => handleNavigateDay(-1)}
                  title="Previous Day"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
                  Previous Day
                </button>
                <button
                  type="button"
                  className={styles.drillNavBtn}
                  onClick={() => handleNavigateDay(1)}
                  title="Next Day"
                >
                  Next Day
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
                </button>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setSelectedDate(null)}
                  title="Close Day View"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics for Selected Day */}
            {isDayLoading ? (
              <div style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>Loading day telemetry...</div>
            ) : hasDayData ? (
              <>
                {!isComparing ? (
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', padding: '6px 0' }}>
                    <div>
                      <span className={styles.spotlightStatLabel}>Total Day Duration</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: currentTheme.dot }}>
                        {formatHoursMinutes(dayStats1?.totalMinutes || 0)}
                      </div>
                    </div>
                    <div>
                      <span className={styles.spotlightStatLabel}>Active Players</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {dayStats1?.activeUserCount || 0} online
                      </div>
                    </div>
                    <div>
                      <span className={styles.spotlightStatLabel}>Total Sessions</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {dayStats1?.totalSessions || 0} sessions
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', padding: '6px 0', alignItems: 'center' }}>
                    <div style={{ padding: '10px 16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)' }}>
                      <span className={styles.spotlightStatLabel}>{getName(activeUser1)}</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: currentTheme.dot }}>
                        {formatHoursMinutes(dayStats1?.totalMinutes || 0)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {dayStats1?.totalSessions || 0} sessions{activeUser1 === 'global' ? `, ${dayStats1?.activeUserCount || 0} players` : ''}
                      </div>
                    </div>

                    <span className={styles.compareVsBadge}>VS</span>

                    <div style={{ padding: '10px 16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)' }}>
                      <span className={styles.spotlightStatLabel}>{getName(selectedUser2)}</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {formatHoursMinutes(dayStats2?.totalMinutes || 0)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {dayStats2?.totalSessions || 0} sessions{selectedUser2 === 'global' ? `, ${dayStats2?.activeUserCount || 0} players` : ''}
                      </div>
                    </div>
                  </div>
                )}

                {/* 24-Hour Timeline Grid Heatmap */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {isComparing ? '24:00 Hourly Heatmaps Comparison (00:00 to 23:00 Athens Time)' : '24:00 Hourly Heatmap (00:00 to 23:00 Athens Time)'}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Hover an hour to inspect active Kindred
                    </span>
                  </div>

                  {!isComparing ? (
                    <div className={styles.hourlyGrid}>
                      {(dayStats1?.hourly || []).map(slot => {
                        const color = currentTheme.levels[slot.level] || currentTheme.levels[0];
                        const isSlotHovered = hoveredHour === slot.hour;
                        return (
                          <div
                            key={slot.hour}
                            className={styles.hourSlot}
                            onMouseEnter={() => setHoveredHour(slot.hour)}
                            onMouseLeave={() => setHoveredHour(null)}
                          >
                            <div
                              className={`${styles.hourBlock} ${isSlotHovered ? styles.hourBlockActive : ''}`}
                              style={{
                                background: color,
                                boxShadow: slot.level > 2 ? `0 0 10px ${color}` : 'none',
                              }}
                            >
                              {slot.minutes > 0 && (
                                <span className={styles.hourMinBadge}>{slot.minutes}m</span>
                              )}
                            </div>
                            <span className={styles.hourLabel}>{slot.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* Track 1: Primary View */}
                      <div className={styles.compareTrack}>
                        <div className={styles.compareTrackHeader}>
                          <span>{getName(activeUser1)}</span>
                          <span style={{ color: currentTheme.dot }}>
                            {formatHoursMinutes(dayStats1?.totalMinutes || 0)} across {dayStats1?.totalSessions || 0} sessions
                          </span>
                        </div>
                        <div className={styles.hourlyGrid}>
                          {(dayStats1?.hourly || []).map(slot => {
                            const color = currentTheme.levels[slot.level] || currentTheme.levels[0];
                            const isSlotHovered = hoveredHour === slot.hour;
                            return (
                              <div
                                key={slot.hour}
                                className={styles.hourSlot}
                                onMouseEnter={() => setHoveredHour(slot.hour)}
                                onMouseLeave={() => setHoveredHour(null)}
                              >
                                <div
                                  className={`${styles.hourBlock} ${isSlotHovered ? styles.hourBlockActive : ''}`}
                                  style={{
                                    background: color,
                                    boxShadow: slot.level > 2 ? `0 0 10px ${color}` : 'none',
                                  }}
                                >
                                  {slot.minutes > 0 && (
                                    <span className={styles.hourMinBadge}>{slot.minutes}m</span>
                                  )}
                                </div>
                                <span className={styles.hourLabel}>{slot.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Track 2: Comparison View */}
                      <div className={styles.compareTrack}>
                        <div className={styles.compareTrackHeader}>
                          <span>{getName(selectedUser2)}</span>
                          <span style={{ color: currentTheme.dot }}>
                            {formatHoursMinutes(dayStats2?.totalMinutes || 0)} across {dayStats2?.totalSessions || 0} sessions
                          </span>
                        </div>
                        <div className={styles.hourlyGrid}>
                          {(dayStats2?.hourly || []).map(slot => {
                            const color = currentTheme.levels[slot.level] || currentTheme.levels[0];
                            const isSlotHovered = hoveredHour === slot.hour;
                            return (
                              <div
                                key={slot.hour}
                                className={styles.hourSlot}
                                onMouseEnter={() => setHoveredHour(slot.hour)}
                                onMouseLeave={() => setHoveredHour(null)}
                              >
                                <div
                                  className={`${styles.hourBlock} ${isSlotHovered ? styles.hourBlockActive : ''}`}
                                  style={{
                                    background: color,
                                    boxShadow: slot.level > 2 ? `0 0 10px ${color}` : 'none',
                                  }}
                                >
                                  {slot.minutes > 0 && (
                                    <span className={styles.hourMinBadge}>{slot.minutes}m</span>
                                  )}
                                </div>
                                <span className={styles.hourLabel}>{slot.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hour Hover Inspector */}
                {hoveredHour !== null && (
                  <div style={{
                    padding: '10px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        Time Window: {String(hoveredHour).padStart(2, '0')}:00 to {String(hoveredHour).padStart(2, '0')}:59 (Athens Time)
                      </strong>
                      {!isComparing ? (
                        <span style={{ color: 'var(--text-secondary)', marginLeft: '10px' }}>
                          Logged: <strong>{dayStats1?.hourly?.[hoveredHour]?.minutes || 0} minutes</strong> across {dayStats1?.hourly?.[hoveredHour]?.sessionCount || 0} sessions
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', marginLeft: '10px' }}>
                          {getName(activeUser1)}: <strong>{dayStats1?.hourly?.[hoveredHour]?.minutes || 0}m</strong> ({dayStats1?.hourly?.[hoveredHour]?.sessionCount || 0} sessions)
                          {' vs '}
                          {getName(selectedUser2)}: <strong>{dayStats2?.hourly?.[hoveredHour]?.minutes || 0}m</strong> ({dayStats2?.hourly?.[hoveredHour]?.sessionCount || 0} sessions)
                        </span>
                      )}
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>Active Players:</span>
                      {hoveredHourUsers.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)' }}>None</span>
                      ) : (
                        hoveredHourUsers.map((u) => (
                          <span
                            key={u.id}
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              background: 'rgba(157, 124, 255, 0.15)',
                              border: '1px solid rgba(157, 124, 255, 0.3)',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              color: 'var(--accent-purple)',
                              fontWeight: 600,
                              marginRight: '6px'
                            }}
                          >
                            {u.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Player Presence Matrix Heatmap for that day */}
                {combinedMatrixUsers.length > 0 && (
                  <div className={styles.userMatrixSection}>
                    <div className={styles.userMatrixHeader}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Player Presence Matrix (Hourly Breakdown per Kindred, 00:00 to 23:00 Athens Time)
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {combinedMatrixUsers.length} player{combinedMatrixUsers.length === 1 ? '' : 's'} recorded, daily average: {formatHoursMinutes(Math.round(matrixAverageMinutes))}
                      </span>
                    </div>

                    <div className={styles.matrixTableWrapper}>
                      <table className={styles.matrixTable}>
                        <thead>
                          <tr>
                            <th className={styles.matrixUserCell}>Kindred Player</th>
                            {Array.from({ length: 24 }, (_, i) => (
                              <th key={i} className={styles.matrixHeaderHour}>
                                {String(i).padStart(2, '0')}
                              </th>
                            ))}
                            <th style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '6px 12px', whiteSpace: 'nowrap' }}>Total (vs Avg)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {combinedMatrixUsers.map(u => (
                            <tr key={u.id}>
                              <td className={styles.matrixUserCell}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--accent-purple)' }}>
                                    person
                                  </span>
                                  <span>{u.name}</span>
                                </div>
                              </td>
                              {u.hours.map((mins, h) => {
                                let lvl = 0;
                                if (mins > 0 && mins < 10) lvl = 1;
                                else if (mins >= 10 && mins < 25) lvl = 2;
                                else if (mins >= 25 && mins < 45) lvl = 3;
                                else if (mins >= 45 && mins < 55) lvl = 4;
                                else if (mins >= 55) lvl = 5;

                                const cellColor = currentTheme.levels[lvl];
                                return (
                                  <td key={h}>
                                    <span
                                      className={styles.matrixCellSlot}
                                      style={{ background: cellColor }}
                                      title={`${u.name} at ${String(h).padStart(2, '0')}:00 to ${String(h).padStart(2, '0')}:59: ${mins} minutes logged (Athens Time)`}
                                    />
                                  </td>
                                );
                              })}
                              <td style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', padding: '6px 12px', whiteSpace: 'nowrap' }}>
                                <span>{formatHoursMinutes(u.totalMinutes)}</span>
                                {matrixAverageMinutes > 0 && (
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      color: u.totalMinutes >= matrixAverageMinutes ? currentTheme.dot : 'var(--text-muted)',
                                      marginLeft: '6px',
                                    }}
                                  >
                                    {formatRatioToAverage(u.totalMinutes)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>
                No session activity recorded for {formatDateDisplay(selectedDate)}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Tooltip during Calendar Hover */}
      {hoveredDay && (
        <div
          className={styles.floatingTooltip}
          style={{
            left: `${Math.max(130, Math.min((typeof window !== 'undefined' ? window.innerWidth : 1200) - 130, hoveredDay.x))}px`,
            top: `${hoveredDay.y < 160 ? hoveredDay.y + 26 : hoveredDay.y}px`,
            transform: hoveredDay.y < 160 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
          }}
        >
          <div className={styles.tooltipDate}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: currentTheme.dot }}>
              calendar_today
            </span>
            {formatDateDisplay(hoveredDay.date)}
          </div>

          <div className={styles.tooltipRow}>
            <span>Month:</span>
            <span className={styles.tooltipValue}>{hoveredDay.monthName}</span>
          </div>

          {!isComparing ? (
            <>
              <div className={styles.tooltipRow}>
                <span>Active Logged:</span>
                <span className={styles.tooltipValue} style={{ color: currentTheme.dot }}>
                  {formatHoursMinutes(hoveredDay.count)} ({hoveredDay.count}m)
                </span>
              </div>

              <div className={styles.tooltipRow}>
                <span>Intensity Tier:</span>
                <span className={styles.tooltipValue}>
                  Level {hoveredDay.level} of 5
                </span>
              </div>

              <div className={styles.tooltipRow}>
                <span>Players Online:</span>
                <span className={styles.tooltipValue}>{hoveredDay.activeUsers}</span>
              </div>

              <div className={styles.tooltipRow}>
                <span>Sessions:</span>
                <span className={styles.tooltipValue}>{hoveredDay.sessionCount}</span>
              </div>
            </>
          ) : (
            <>
              <div className={styles.tooltipRow}>
                <span style={{ fontWeight: 600 }}>{getName(activeUser1)}:</span>
                <span className={styles.tooltipValue} style={{ color: currentTheme.dot }}>
                  {formatHoursMinutes(tooltipMatch1?.count || 0)} (Level {tooltipMatch1?.level || 0} of 5)
                </span>
              </div>

              <div className={styles.tooltipRow}>
                <span style={{ fontWeight: 600 }}>{getName(selectedUser2)}:</span>
                <span className={styles.tooltipValue} style={{ color: 'var(--text-secondary)' }}>
                  {formatHoursMinutes(tooltipMatch2?.count || 0)} (Level {tooltipMatch2?.level || 0} of 5)
                </span>
              </div>

              {(activeUser1 === 'global' || selectedUser2 === 'global') && (
                <div className={styles.tooltipRow}>
                  <span>Global Active:</span>
                  <span className={styles.tooltipValue}>
                    {Math.max(tooltipMatch1?.activeUsers || 0, tooltipMatch2?.activeUsers || 0)} players, {Math.max(tooltipMatch1?.sessionCount || 0, tooltipMatch2?.sessionCount || 0)} sessions
                  </span>
                </div>
              )}
            </>
          )}

          <div className={styles.tooltipHint}>
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>touch_app</span>
            {isComparing ? 'Click day to inspect 24:00 hourly comparison' : 'Click day to open 24:00 hourly heatmap'}
          </div>
        </div>
      )}
    </div>
  );
}


