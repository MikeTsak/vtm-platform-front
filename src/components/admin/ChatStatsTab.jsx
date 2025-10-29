// src/components/ChatStatsTab.jsx
import React, { useState, useMemo } from 'react';
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


// --- Helper Component: StatCard ---
function StatCard({ title, value, subtext }) {
  return (
    <div className={styles.statCard}>
      <h4 className={styles.statTitle}>{title}</h4>
      <div className={styles.statValue}>{value}</div>
      {subtext && <div className={styles.statSubtext}>{subtext}</div>}
    </div>
  );
}

// --- Helper Component: StatList ---
function StatList({ title, items, isLoading }) {
  return (
    <div className={`${styles.statListCard}`}> {/* Removed .card, added new class */}
      <h3 className={styles.statListTitle}>{title}</h3>
      <div className={styles.statListBody}>
        {isLoading && <div className={styles.subtle}>Calculating...</div>}
        {!isLoading && items.length === 0 && <div className={styles.subtle}>No data for this period.</div>}
        <ol className={styles.statList}>
          {items.map((item, index) => {
            const clanColor = CLAN_COLORS[item.clan] || 'var(--text-secondary)';
            const clanLogoUrl = symlogo(item.clan);
            return (
              <li 
                key={item.id || index}
                style={{ '--clan-color': clanColor }}
                className={clanLogoUrl ? styles.hasAvatar : ''}
              >
                {clanLogoUrl && (
                  <img src={clanLogoUrl} alt={item.clan} className={styles.statListAvatar} />
                )}
                {!clanLogoUrl && (
                  <span className={styles.statListRank}>{index + 1}</span>
                )}
                <div className={styles.statListItemInfo}>
                  <span className={styles.statListItemName}>{item.name}</span>
                  {item.subname && <span className={styles.statListItemSubname}>{item.subname}</span>}
                </div>
                <span className={styles.statListItemCount}>{item.count.toLocaleString()} msgs</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

// --- Main Stats Tab Component ---
export default function ChatStatsTab({ directMessages, npcMessages, npcs, users }) {
  // --- State for Date Range ---
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today); // Default to today
  const [endDate, setEndDate] = useState(today);     // Default to today

  // --- Memoized Lookup Maps (Updated to include clan) ---
  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach(u => map.set(u.id, {
      name: u.display_name || u.email || `User ${u.id}`,
      clan: u.clan || null,
      char_name: u.char_name || null
    }));
    return map;
  }, [users]);

  const npcMap = useMemo(() => {
    const map = new Map();
    npcs.forEach(n => map.set(n.id, {
      name: n.name || `NPC ${n.id}`,
      clan: n.clan || null
    }));
    return map;
  }, [npcs]);

  // --- Memoized All-Time Stats ---
  const allTimeStats = useMemo(() => {
    return {
      totalDirect: directMessages.length,
      totalNpc: npcMessages.length,
      totalAllTime: directMessages.length + npcMessages.length,
    };
  }, [directMessages, npcMessages]);

  // --- Memoized Filtered Data ---
  const filteredData = useMemo(() => {
    // Create Date objects for comparison. Set end date to end of the day.
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // Start of the day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of the day

    const startTs = start.getTime();
    const endTs = end.getTime();

    if (!startDate || !endDate || endTs < startTs) {
      return { filteredDirect: [], filteredNpc: [] };
    }

    const filteredDirect = directMessages.filter(msg => {
      const msgTs = new Date(msg.created_at).getTime();
      return msgTs >= startTs && msgTs <= endTs;
    });

    const filteredNpc = npcMessages.filter(msg => {
      const msgTs = new Date(msg.created_at).getTime();
      return msgTs >= startTs && msgTs <= endTs;
    });

    return { filteredDirect, filteredNpc };
  }, [directMessages, npcMessages, startDate, endDate]);

  // --- Memoized Period Stats Calculation (Updated to use new map structure) ---
  const periodStats = useMemo(() => {
    const { filteredDirect, filteredNpc } = filteredData;

    const senderCounts = new Map();
    const receiverCounts = new Map();
    const npcReceiverCounts = new Map(); // Player -> NPC

    // Process Direct Messages
    for (const msg of filteredDirect) {
      const senderId = msg.sender_id;
      const receiverId = msg.recipient_id;
      
      senderCounts.set(senderId, (senderCounts.get(senderId) || 0) + 1);
      receiverCounts.set(receiverId, (receiverCounts.get(receiverId) || 0) + 1);
    }

    // Process NPC Messages
    for (const msg of filteredNpc) {
      if (msg.from_side === 'user') {
        // User sent a message TO an NPC
        const senderId = msg.user_id; // The user who sent it
        const receiverId = msg.npc_id; // The NPC who received it
        
        senderCounts.set(senderId, (senderCounts.get(senderId) || 0) + 1);
        npcReceiverCounts.set(receiverId, (npcReceiverCounts.get(receiverId) || 0) + 1);
      }
    }

    // Helper to sort maps into top lists (Updated)
    const getTop = (countMap, nameMap, limit = 10) => {
      return Array.from(countMap.entries())
        .map(([id, count]) => {
          const info = nameMap.get(id);
          if (info) {
            return {
              id,
              name: info.char_name || info.name, // Use char_name if user, else npc name
              subname: info.char_name ? info.name : null, // User's display_name
              clan: info.clan,
              count
            };
          }
          // Fallback for missing user/npc
          return { id, name: `ID ${id}`, subname: null, clan: null, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    };

    return {
      totalInPeriod: filteredDirect.length + filteredNpc.length,
      topSenders: getTop(senderCounts, userMap),
      topReceivers: getTop(receiverCounts, userMap),
      topNpcReceivers: getTop(npcReceiverCounts, npcMap),
    };

  }, [filteredData, userMap, npcMap]);

  return (
    <div className={styles.stack12}> {/* Removed .card */}
      <h3>Chat Statistics</h3>

      {/* --- Date Filters --- */}
      <div className={styles.dateFilters}>
        <label className={styles.labeledInput}>
          <span>Start Date</span>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            className={styles.input}
          />
        </label>
        <label className={styles.labeledInput}>
          <span>End Date</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            className={styles.input}
          />
        </label>
        <div className={styles.dateFilterButtons}>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => {
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              setStartDate(weekAgo);
              setEndDate(today);
            }}
          >
            Last 7 Days
          </button>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => {
              const monthAgo = new Date();
              monthAgo.setDate(monthAgo.getDate() - 30);
              setStartDate(monthAgo.toISOString().split('T')[0]);
              setEndDate(today);
            }}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* --- Stat Cards Grid --- */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Messages in Period"
          value={periodStats.totalInPeriod.toLocaleString()}
          subtext={`${startDate} to ${endDate}`}
        />
        <StatCard
          title="Total Direct Messages"
          value={allTimeStats.totalDirect.toLocaleString()}
          subtext="All time"
        />
        <StatCard
          title="Total NPC Messages"
          value={allTimeStats.totalNpc.toLocaleString()}
          subtext="All time"
        />
        <StatCard
          title="Total All Messages"
          value={allTimeStats.totalAllTime.toLocaleString()}
          subtext="All time"
        />
      </div>

      {/* --- Top Lists Grid --- */}
      <div className={styles.statsListGrid}>
        <StatList
          title="Most Active Senders"
          items={periodStats.topSenders}
        />
        <StatList
          title="Most Active Receivers"
          items={periodStats.topReceivers}
        />
        <StatList
          title="Most Messaged NPCs"
          items={periodStats.topNpcReceivers}
        />
      </div>
    </div>
  );
}