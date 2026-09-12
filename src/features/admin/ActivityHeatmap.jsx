import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityCalendar } from 'react-activity-calendar';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';

export default function ActivityHeatmap({ users = [], globalOnly = false, onOpenCompare }) {
  const [selectedUser1, setSelectedUser1] = useState('global');
  const [selectedUser2, setSelectedUser2] = useState('none');

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

  const getName = (val) => {
    if (val === 'global') return 'Global Activity';
    if (val === 'none') return '';
    const u = users.find(u => u.id === Number(val));
    return u ? u.display_name : `User #${val}`;
  };

  // We need at least some data to render the calendar. If empty, feed it a dummy 0 count for today.
  const getSafeData = (data) => {
    if (data.length > 0) return data;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return [{ date: `${yyyy}-${mm}-${dd}`, count: 0, level: 0 }];
  };

  return (
    <div className={`${styles.editorSection} ${styles.characterCard}`} style={{ marginBottom: '24px' }}>
      <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className={styles.hl}>{globalOnly ? 'Global Activity Heatmap' : 'Activity Heatmap & Comparison'}</h3>
          <p className={styles.subtle}>
            {globalOnly
              ? 'Chronicle-wide telemetry tracking total minutes players spend online.'
              : 'Compare online activity and engagement trends between players or against global chronicle averages.'}
          </p>
        </div>
        {globalOnly && onOpenCompare && (
          <button
            type="button"
            className={styles.panelActionBtn}
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
            Compare Players →
          </button>
        )}
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {!globalOnly && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label className={styles.subtle} style={{ display: 'block', marginBottom: '4px' }}>Primary View</label>
              <select className={styles.select} value={selectedUser1} onChange={e => setSelectedUser1(e.target.value)}>
                <option value="global">Global (Everyone)</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.display_name} (#{u.id})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={styles.subtle} style={{ display: 'block', marginBottom: '4px' }}>Compare With</label>
              <select className={styles.select} value={selectedUser2} onChange={e => setSelectedUser2(e.target.value)}>
                <option value="none">None</option>
                <option value="global">Global (Everyone)</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.display_name} (#{u.id})</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
          <div style={{ flex: '1 1 400px' }}>
            {!globalOnly && <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>{getName(selectedUser1)}</h4>}
            {isLoading1 ? (
              <div style={{ color: 'var(--text-secondary)' }}>Loading activity data...</div>
            ) : isError1 ? (
              <div style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>
                Unable to load activity telemetry. Ensure backend session service is running.
              </div>
            ) : (
              <ActivityCalendar 
                data={getSafeData(data1)} 
                labels={{
                  totalCount: '{{count}} minutes logged in {{year}}',
                }}
                theme={{
                  light: ['#1e1e24', '#7F5AF0'],
                  dark: ['#1e1e24', '#7F5AF0'],
                }}
                colorScheme="dark"
              />
            )}
          </div>

          {!globalOnly && selectedUser2 !== 'none' && (
            <div style={{ flex: '1 1 400px' }}>
              <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>{getName(selectedUser2)}</h4>
              {isLoading2 ? (
                <div style={{ color: 'var(--text-secondary)' }}>Loading activity data...</div>
              ) : isError2 ? (
                <div style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>
                  Unable to load comparison activity telemetry.
                </div>
              ) : (
                <ActivityCalendar 
                  data={getSafeData(data2)} 
                  labels={{
                    totalCount: '{{count}} minutes logged in {{year}}',
                  }}
                  theme={{
                    light: ['#1e1e24', '#2CB67D'],
                    dark: ['#1e1e24', '#2CB67D'],
                  }}
                  colorScheme="dark"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
