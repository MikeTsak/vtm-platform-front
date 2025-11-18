// src/components/ChatStatsTab.jsx 
import React, { useEffect, useMemo, useState } from 'react';
import styles from '../../styles/Admin.module.css'; // adjust the path if needed

/** ---------- API base & auth ---------- */
const devDefault =
  typeof window !== 'undefined' && window.location?.port === '3000'
    ? 'http://localhost:3001'
    : '';
const API_BASE = (process.env.REACT_APP_API_BASE || devDefault).replace(/\/$/, '');
const AUTH_TOKEN_KEY = 'token';

/** ---------- Clan helpers ---------- */
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
const fileify = (c) => (NAME_OVERRIDES[c] || c || '').replace(/\s+/g, '_');
const clanSymbol = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png` : '');

/** ---------- Small UI bits ---------- */
function StatCard({ title, value, subtext }) {
  return (
    <div className={styles.statCard}>
      <h4 className={styles.statTitle}>{title}</h4>
      <div className={styles.statValue}>{value}</div>
      {subtext && <div className={styles.statSubtext}>{subtext}</div>}
    </div>
  );
}

function StatList({ title, items, isLoading }) {
  return (
    <div className={styles.statListCard}>
      <h3 className={styles.statListTitle}>{title}</h3>
      <div className={styles.statListBody}>
        {isLoading && <div className={styles.subtle}>Calculating…</div>}
        {!isLoading && items.length === 0 && (
          <div className={styles.subtle}>No data for this period.</div>
        )}
        <ol className={styles.statList}>
          {items.map((item, i) => {
            const color = CLAN_COLORS[item.clan] || 'var(--text-secondary)';
            const logo = clanSymbol(item.clan);
            return (
              <li
                key={item.id ?? `${item.name}-${i}`}
                style={{ '--clan-color': color }}
                className={logo ? styles.hasAvatar : undefined}
              >
                {logo ? (
                  <img src={logo} alt={item.clan || ''} className={styles.statListAvatar} />
                ) : (
                  <span className={styles.statListRank}>{i + 1}</span>
                )}
                <div className={styles.statListItemInfo}>
                  <span className={styles.statListItemName}>{item.name}</span>
                  {item.subname && (
                    <span className={styles.statListItemSubname}>{item.subname}</span>
                  )}
                </div>
                <span className={styles.statListItemCount}>
                  {item.count.toLocaleString()} msgs
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** ---------- Helper: fetch with fallback ---------- */
async function fetchJsonWithFallback(urls, headers) {
  let lastErr;
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers });
      if (!r.ok) throw new Error(`${u} -> ${r.status}`);
      return await r.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('All fetch attempts failed');
}

/** ---------- Main ---------- */
export default function ChatStatsTab({
  directMessages: directMessagesProp,
  npcMessages: npcMessagesProp,
  npcs: npcsProp,
  users: usersProp,
}) {
  const token = useMemo(() => localStorage.getItem(AUTH_TOKEN_KEY) || '', []);
  const headersObj = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // Local state (auto-fetch if props not provided)
  const [directMessages, setDirectMessages] = useState(directMessagesProp || []);
  const [npcMessages, setNpcMessages] = useState(npcMessagesProp || []);
  const [npcs, setNpcs] = useState(npcsProp || []);
  const [users, setUsers] = useState(usersProp || []);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // Date range defaults (Last 30 Days)
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();
  const [startDate, setStartDate] = useState(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Auto-fetch if props missing
  useEffect(() => {
    const needDirect = !directMessagesProp;
    const needNpcMsgs = !npcMessagesProp;
    const needNpcs = !npcsProp;
    const needUsers = !usersProp;
    if (!needDirect && !needNpcMsgs && !needNpcs && !needUsers) return;

    let cancelled = false;
    setLoading(true);
    setErr('');

    (async () => {
      try {
        const tasks = [];

        if (needDirect) {
          tasks.push(
            fetchJsonWithFallback(
              [
                `${API_BASE}/api/admin/chat/all`, // admin first
                `${API_BASE}/api/court/chat/all`, // optional court fallback if you add it
              ],
              headersObj
            )
              .then((d) => (!cancelled ? setDirectMessages(d?.messages || []) : undefined))
              .catch(() => {
                // If both fail (likely permissions), leave empty but annotate error.
                if (!cancelled) setDirectMessages([]);
              })
          );
        }

        if (needNpcMsgs) {
          tasks.push(
            fetchJsonWithFallback(
              [
                `${API_BASE}/api/admin/chat/npc/all`, // admin
                `${API_BASE}/api/court/chat/npc/all`, // court fallback (add this route per my note)
              ],
              headersObj
            )
              .then((d) => (!cancelled ? setNpcMessages(d?.messages || []) : undefined))
              .catch((e) => {
                if (!cancelled) {
                  setNpcMessages([]);
                  setErr((prev) =>
                    prev
                      ? prev
                      : 'No permission to load NPC stats (need admin or court access).'
                  );
                }
              })
          );
        }

        if (needNpcs) {
          tasks.push(
            fetchJsonWithFallback(
              [
                `${API_BASE}/api/chat/npcs`, // public/court list used elsewhere in your app
                `${API_BASE}/api/admin/npcs`,
                `${API_BASE}/api/court/npcs`,
              ],
              headersObj
            )
              .then((d) => (!cancelled ? setNpcs(d?.npcs || []) : undefined))
              .catch(() => !cancelled && setNpcs([]))
          );
        }

        if (needUsers) {
          tasks.push(
            fetchJsonWithFallback(
              [
                `${API_BASE}/api/chat/users`, // whatever you already expose to get names/clans
                `${API_BASE}/api/admin/users`,
                `${API_BASE}/api/court/users`,
              ],
              headersObj
            )
              .then((d) => (!cancelled ? setUsers(d?.users || []) : undefined))
              .catch(() => !cancelled && setUsers([]))
          );
        }

        await Promise.all(tasks);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [directMessagesProp, npcMessagesProp, npcsProp, usersProp, headersObj]);

  /** ---------- Lookups ---------- */
  const userMap = useMemo(() => {
    const map = new Map();
    (users || []).forEach((u) => {
      map.set(u.id, {
        name: u.display_name || u.email || `User ${u.id}`,
        char_name: u.char_name || null,
        clan: u.clan || null,
      });
    });
    return map;
  }, [users]);

  const npcMap = useMemo(() => {
    const map = new Map();
    (npcs || []).forEach((n) => {
      map.set(n.id, {
        name: n.name || `NPC ${n.id}`,
        clan: n.clan || null,
      });
    });
    return map;
  }, [npcs]);

  /** ---------- All-time counters ---------- */
  const allTimeStats = useMemo(
    () => ({
      totalDirect: (directMessages || []).length,
      totalNpc: (npcMessages || []).length,
      totalAllTime: (directMessages || []).length + (npcMessages || []).length,
    }),
    [directMessages, npcMessages]
  );

  /** ---------- Date filter ---------- */
  const filteredData = useMemo(() => {
    if (!startDate || !endDate) return { filteredDirect: [], filteredNpc: [] };
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const a = start.getTime();
    const b = end.getTime();
    if (b < a) return { filteredDirect: [], filteredNpc: [] };

    const inRange = (ts) => {
      const t = new Date(ts).getTime();
      return Number.isFinite(t) && t >= a && t <= b;
    };

    return {
      filteredDirect: (directMessages || []).filter((m) => inRange(m.created_at)),
      filteredNpc: (npcMessages || []).filter((m) => inRange(m.created_at)),
    };
  }, [directMessages, npcMessages, startDate, endDate]);

  /** ---------- Period stats ---------- */
  const periodStats = useMemo(() => {
    const { filteredDirect, filteredNpc } = filteredData;

    const senderCounts = new Map();      // user_id -> count
    const receiverCounts = new Map();    // user_id -> count
    const npcReceiverCounts = new Map(); // npc_id  -> count (players → NPC)

    // user ↔ user
    for (const msg of filteredDirect) {
      const s = msg.sender_id;
      const r = msg.recipient_id;
      if (s) senderCounts.set(s, (senderCounts.get(s) || 0) + 1);
      if (r) receiverCounts.set(r, (receiverCounts.get(r) || 0) + 1);
    }

    // user → NPC (we only count messages sent by users to an NPC)
    for (const msg of filteredNpc) {
      if (msg.from_side === 'user') {
        if (msg.user_id) senderCounts.set(msg.user_id, (senderCounts.get(msg.user_id) || 0) + 1);
        if (msg.npc_id) npcReceiverCounts.set(msg.npc_id, (npcReceiverCounts.get(msg.npc_id) || 0) + 1);
      }
    }

    const intoTopList = (map, nameMap, limit = 10) =>
      Array.from(map.entries())
        .map(([id, count]) => {
          const info = nameMap.get(id);
          if (info) {
            return {
              id,
              name: info.char_name || info.name,
              subname: info.char_name ? info.name : null,
              clan: info.clan,
              count,
            };
          }
          return { id, name: `ID ${id}`, subname: null, clan: null, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

    return {
      totalInPeriod: filteredDirect.length + filteredNpc.length,
      topSenders: intoTopList(senderCounts, userMap),
      topReceivers: intoTopList(receiverCounts, userMap),
      topNpcReceivers: intoTopList(npcReceiverCounts, npcMap),
    };
  }, [filteredData, userMap, npcMap]);

  /** ---------- Render ---------- */
  return (
    <div className={styles.stack12}>
      <h3>Chat Statistics</h3>

      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

      {/* Date controls */}
      <div className={styles.dateFilters}>
        <label className={styles.labeledInput}>
          <span>Start Date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={styles.input}
          />
        </label>
        <label className={styles.labeledInput}>
          <span>End Date</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={styles.input}
          />
        </label>
        <div className={styles.dateFilterButtons}>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 7);
              setStartDate(d.toISOString().split('T')[0]);
              setEndDate(todayStr);
            }}
          >
            Last 7 Days
          </button>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 30);
              setStartDate(d.toISOString().split('T')[0]);
              setEndDate(todayStr);
            }}
          >
            Last 30 Days
          </button>
          <button
            className={styles.btn}
            onClick={() => {
              setStartDate(todayStr);
              setEndDate(todayStr);
            }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Summary cards */}
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

      {/* Top lists */}
      <div className={styles.statsListGrid}>
        <StatList title="Most Active Senders" items={periodStats.topSenders} isLoading={loading} />
        <StatList title="Most Active Receivers" items={periodStats.topReceivers} isLoading={loading} />
        <StatList title="Most Messaged NPCs" items={periodStats.topNpcReceivers} isLoading={loading} />
      </div>
    </div>
  );
}
