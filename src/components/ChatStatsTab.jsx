import React, { useState, useMemo } from 'react';
import styles from '../styles/Admin.module.css'; // We'll reuse the admin styles

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
    <div className={`${styles.card} ${styles.stack12}`}>
      <h3 className={styles.statListTitle}>{title}</h3>
      {isLoading && <div className={styles.subtle}>Calculating...</div>}
      {!isLoading && items.length === 0 && <div className={styles.subtle}>No data for this period.</div>}
      <ol className={styles.statList}>
        {items.map((item, index) => (
          <li key={item.id || index}>
            <span className={styles.statListItemName}>{item.name}</span>
            <span className={styles.statListItemCount}>{item.count} msgs</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// --- Main Stats Tab Component ---
export default function ChatStatsTab({ directMessages, npcMessages, npcs, users }) {
  // --- State for Date Range ---
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today); // Default to today
  const [endDate, setEndDate] = useState(today);     // Default to today

  // --- Memoized Lookup Maps ---
  const userMap = useMemo(() => {
    const map = new Map();
    users.forEach(u => map.set(u.id, u.display_name || u.email || `User ${u.id}`));
    return map;
  }, [users]);

  const npcMap = useMemo(() => {
    const map = new Map();
    npcs.forEach(n => map.set(n.id, n.name || `NPC ${n.id}`));
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

  // --- Memoized Period Stats Calculation ---
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
      // Note: We don't count NPC->Player as "receiving" for this stat,
      // but you could add a `npcSenderCounts` map here if needed.
    }

    // Helper to sort maps into top lists
    const getTop = (countMap, nameMap, limit = 10) => {
      return Array.from(countMap.entries())
        .map(([id, count]) => ({
          id,
          name: nameMap.get(id) || `ID ${id}`,
          count
        }))
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
    <div className={`${styles.card} ${styles.stack12}`}>
      <h3>Chat Statistics</h3>

      {/* --- Date Filters --- */}
      <div className={styles.dateFilters}>
        <label>
          Start Date
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            className={styles.input}
          />
        </label>
        <label>
          End Date
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            className={styles.input}
          />
        </label>
        <button
          className={styles.btn}
          onClick={() => {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            setStartDate(weekAgo);
            setEndDate(today);
          }}
        >
          Last 7 Days
        </button>
        <button
          className={styles.btn}
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
