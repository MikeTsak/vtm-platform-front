// src/components/admin/ChatStatsTab.jsx
import React, { useMemo, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import styles from '../../styles/Admin.module.css';

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

/** ---------- Helpers ---------- */
const getRollArt = (roll) => {
  if (!roll) return '/img/dice/BestialFail.png'; 
  if (roll.messy_crit) return '/img/dice/MessyCrit.png';
  if (roll.bestial_failure) return '/img/dice/BestialFail.png';
  if (roll.crit_pairs > 0) return '/img/dice/Crit.png';
  if (roll.successes > 0) return '/img/dice/Success.png';
  return '/img/dice/BestialFail.png'; 
};

const IMG = {
  normal: (v) => `/img/dice/normal-${v}.png`,
  hunger: (v) => `/img/dice/hunger-${v}.png`,
};

const getTies = (map, idToNameFn = null) => {
  let max = 0;
  let winners = [];
  map.forEach((val, key) => {
    if (val > max) { max = val; winners = [key]; }
    else if (val === max && max > 0) { winners.push(key); }
  });
  
  if (winners.length === 0) return { name: 'None', count: 0 };
  
  const formattedNames = winners.map(w => idToNameFn ? idToNameFn(w) : w).join(', ');
  return { name: formattedNames, count: max };
};

/** ---------- UI Components ---------- */
function DiceStripInline({ title, values, imgFn, isExporting }) {
  if (!values || !values.length) return null;
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ fontSize: isExporting ? '0.85rem' : '0.7rem', color: 'var(--muted)', marginBottom: '4px', fontWeight: 'bold' }}>{title} ({values.length})</div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {values.map((v, i) => (
          <img
            key={i}
            src={imgFn(v)}
            alt={String(v)}
            style={{ width: isExporting ? '36px' : '28px', height: isExporting ? '36px' : '28px', objectFit: 'contain' }}
            onError={(e) => { e.currentTarget.outerHTML = `<div style="width: ${isExporting ? '36px' : '28px'}; height: ${isExporting ? '36px' : '28px'}; display: inline-flex; align-items: center; justify-content: center; background: #222; border: 1px solid #555; border-radius: 4px; font-size: 13px; color: #fff; font-weight: bold;">${v}</div>`; }}
          />
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtext, highlight, isExporting }) {
  return (
    <div style={{ 
      padding: isExporting ? '1.5rem' : '1.25rem', 
      background: highlight ? 'linear-gradient(145deg, #2a0b12 0%, #0d0d12 100%)' : 'rgba(20, 20, 24, 0.7)', 
      borderRadius: '16px', 
      border: highlight ? '1px solid #ff4d4d' : '1px solid rgba(255,255,255,0.08)',
      boxShadow: highlight ? '0 8px 25px rgba(255, 77, 77, 0.15)' : '0 4px 12px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      textAlign: 'center',
      minWidth: 0,
      wordWrap: 'break-word'
    }}>
      <h4 style={{ margin: '0 0 0.5rem 0', color: highlight ? '#ffb8b8' : 'var(--text-secondary)', fontSize: isExporting ? '1rem' : '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</h4>
      <div style={{ fontSize: isExporting ? '2rem' : '1.6rem', fontWeight: '900', color: highlight ? '#fff' : 'var(--fg)', lineHeight: '1.2' }}>{value}</div>
      {subtext && <div style={{ fontSize: isExporting ? '1rem' : '0.8rem', color: highlight ? '#ff8c8c' : 'var(--muted)', marginTop: '0.5rem' }}>{subtext}</div>}
    </div>
  );
}

function DiceStatCard({ title, value, subtext, rollData, isExporting }) {
  const art = getRollArt(rollData);
  
  let normal = [];
  let hunger = [];
  if (rollData) {
    let res = rollData.results_json ?? rollData.results ?? {};
    try { if (typeof res === "string") res = JSON.parse(res); } catch { res = {}; }
    normal = Array.isArray(res.normal) ? res.normal : Array.isArray(rollData.normal) ? rollData.normal : [];
    hunger = Array.isArray(res.hunger) ? res.hunger : Array.isArray(rollData.hunger) ? rollData.hunger : [];
  }

  return (
    <div style={{ padding: isExporting ? '1.5rem' : '1.25rem', background: 'rgba(20, 20, 24, 0.7)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', width: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: isExporting ? '1rem' : '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h4>
          <div style={{ fontSize: isExporting ? '2.2rem' : '1.8rem', fontWeight: '900', color: 'var(--fg)', lineHeight: '1.1' }}>{value}</div>
          {subtext && <div style={{ fontSize: isExporting ? '1rem' : '0.85rem', color: 'var(--muted)', marginTop: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtext}</div>}
        </div>
        {rollData && (
          <img src={art} alt={title} style={{ width: isExporting ? '80px' : '60px', height: isExporting ? '80px' : '60px', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }} />
        )}
      </div>

      {rollData && (normal.length > 0 || hunger.length > 0) && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
          <DiceStripInline title="Normal Dice" values={normal} imgFn={IMG.normal} isExporting={isExporting} />
          <DiceStripInline title="Hunger Dice" values={hunger} imgFn={IMG.hunger} isExporting={isExporting} />
        </div>
      )}
    </div>
  );
}

function StatList({ title, items, isExporting }) {
  const displayItems = isExporting ? items.slice(0, 5) : items;

  return (
    <div style={{ background: 'rgba(20, 20, 24, 0.7)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
      <h3 style={{ margin: 0, padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: isExporting ? '1.2rem' : '1rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', color: '#ffb8b8' }}>{title}</h3>
      <div style={{ padding: '0.5rem 0' }}>
        {displayItems.length === 0 && (
          <div style={{ padding: '1rem 1.25rem', color: 'var(--muted)' }}>No data for this period.</div>
        )}
        <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {displayItems.map((item, i) => {
            const color = CLAN_COLORS[item.clan] || 'var(--text-secondary)';
            const logo = clanSymbol(item.clan);
            return (
              <li key={item.id || item.name} style={{ display: 'flex', alignItems: 'center', padding: isExporting ? '1rem 1.25rem' : '0.75rem 1.25rem', borderBottom: i < displayItems.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                {logo ? (
                  <img src={logo} alt={item.clan || ''} style={{ width: isExporting ? '40px' : '32px', height: isExporting ? '40px' : '32px', marginRight: '12px', flexShrink: 0, filter: `drop-shadow(0 0 4px ${color}88)` }} />
                ) : (
                  <span style={{ width: '32px', textAlign: 'center', marginRight: '12px', fontWeight: 'bold', color: 'var(--muted)', fontSize: isExporting ? '1.2rem' : '1rem', flexShrink: 0 }}>{i + 1}</span>
                )}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--fg)', fontSize: isExporting ? '1.2rem' : '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                  {item.subname && (
                    <span style={{ fontSize: isExporting ? '0.95rem' : '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subname}</span>
                  )}
                </div>
                <span style={{ fontWeight: '900', color: color, fontSize: isExporting ? '1.3rem' : '1.1rem', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '20px', marginLeft: '10px' }}>
                  {item.count.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function InteractivePieChart({ data, isExporting }) {
  const [hovered, setHovered] = useState(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulativeOffset = 0;
  const r = 15.915494309189533;

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: isExporting ? 'center' : 'flex-start', background: 'rgba(20, 20, 24, 0.7)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ position: 'relative', width: isExporting ? '220px' : '180px', height: isExporting ? '220px' : '180px', flexShrink: 0 }}>
        <svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', overflow: 'visible' }}>
          {data.map((d) => {
            const dashVal = (d.value / total) * 100;
            const offset = -cumulativeOffset;
            cumulativeOffset += dashVal;
            const isHovered = hovered === d.label && !isExporting;

            return (
              <circle
                key={d.label}
                cx="20" cy="20" r={r}
                fill="transparent"
                stroke={d.color}
                strokeWidth={isHovered ? "8" : "6"}
                strokeDasharray={`${dashVal} 100`}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-width 0.2s ease', cursor: isExporting ? 'default' : 'pointer' }}
                onMouseEnter={() => !isExporting && setHovered(d.label)}
                onMouseLeave={() => !isExporting && setHovered(null)}
              >
                <title>{d.label}: {d.value} ({Math.round((d.value / total) * 100)}%)</title>
              </circle>
            );
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
           <span style={{ fontSize: isExporting ? '2.5rem' : '1.6rem', fontWeight: '900', color: 'var(--fg)' }}>{total}</span>
           <span style={{ fontSize: isExporting ? '0.85rem' : '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Active</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: isExporting ? 'none' : '180px', overflowY: isExporting ? 'visible' : 'auto', paddingRight: '0.5rem', flex: 1, minWidth: 0 }}>
         {data.map(d => {
           const isFaded = hovered && hovered !== d.label && !isExporting;
           return (
             <div 
               key={d.label}
               style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: isFaded ? 0.3 : 1, transition: 'opacity 0.2s ease', cursor: isExporting ? 'default' : 'pointer' }}
               onMouseEnter={() => !isExporting && setHovered(d.label)}
               onMouseLeave={() => !isExporting && setHovered(null)}
             >
                {d.logo ? (
                  <img src={d.logo} alt={d.label} style={{ width: isExporting ? '28px' : '20px', height: isExporting ? '28px' : '20px', objectFit: 'contain', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '14px', height: '14px', backgroundColor: d.color, borderRadius: '50%', flexShrink: 0 }} />
                )}
                <span style={{ fontSize: isExporting ? '1.1rem' : '0.9rem', color: 'var(--fg)', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</span>
                <span style={{ fontSize: isExporting ? '1.1rem' : '0.9rem', color: 'var(--muted)', marginLeft: 'auto', fontWeight: '900', paddingLeft: '10px' }}>{d.value}</span>
             </div>
           );
         })}
      </div>
    </div>
  );
}

/** ---------- Main Component ---------- */
export default function ChatStatsTab({
  directMessages = [],
  npcMessages = [],
  groupMessages = [], 
  emailMessages = [], 
  chatGroups = [],    
  npcs = [],
  users = [],
  characters = [],
  xpLogs = [],
  premonitions = [],
  diceRolls = [],
  downtimes = []
}) {

  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();
  
  const [startDate, setStartDate] = useState(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  
  // Export State
  const exportRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [customTitle, setCustomTitle] = useState('ATT Larp Season 1 Stats');

  const handleExport = () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(exportRef.current, {
          backgroundColor: '#07070a',
          scale: 2, 
          useCORS: true, 
          logging: false,
          width: 1200, 
          windowWidth: 1200
        });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = image;
        link.download = `${customTitle.replace(/\s+/g, '-')}-${todayStr}.png`;
        link.click();
      } catch (e) {
        console.error('Export failed:', e);
        alert('Failed to generate image.');
      }
      setIsExporting(false);
    }, 150);
  };

  /** ---------- Lookups ---------- */
  const userMap = useMemo(() => {
    const map = new Map();
    (users || []).forEach((u) => { 
      const c = characters.find(char => char.user_id === u.id);
      map.set(u.id, { 
        name: u.display_name || u.email || `User ${u.id}`, 
        char_name: u.char_name || null, 
        clan: u.clan || null,
        excluded: c ? (c.is_deceased || c.is_hidden) : false
      }); 
    });
    return map;
  }, [users, characters]);

  const npcMap = useMemo(() => {
    const map = new Map();
    (npcs || []).forEach((n) => { map.set(n.id, { name: n.name || `NPC ${n.id}`, clan: n.clan || null }); });
    return map;
  }, [npcs]);

  const filteredData = useMemo(() => {
    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
    const end = endDate ? new Date(endDate) : new Date('2100-01-01');
    start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
    const a = start.getTime(); const b = end.getTime();
    const inRange = (ts) => { if (!ts) return false; const t = new Date(ts).getTime(); return Number.isFinite(t) && t >= a && t <= b; };

    return {
      filteredDirect: (directMessages || []).filter((m) => inRange(m.created_at)),
      filteredNpc: (npcMessages || []).filter((m) => inRange(m.created_at)),
      filteredGroup: (groupMessages || []).filter((m) => inRange(m.created_at)),
      filteredEmail: (emailMessages || []).filter((m) => inRange(m.created_at)),
      filteredXp: (xpLogs || []).filter((x) => inRange(x.created_at)),
      filteredDice: (diceRolls || []).filter((d) => inRange(d.created_at)),
      filteredDowntimes: (downtimes || []).filter((d) => inRange(d.created_at)),
      totalDays: Math.max(1, Math.ceil((b - a) / (1000 * 60 * 60 * 24)))
    };
  }, [directMessages, npcMessages, groupMessages, emailMessages, xpLogs, diceRolls, downtimes, startDate, endDate]);

  const periodStats = useMemo(() => {
    const { filteredDirect, filteredNpc, filteredGroup, filteredEmail, totalDays } = filteredData;
    const allMsgs = [...filteredDirect, ...filteredNpc, ...filteredGroup, ...filteredEmail];

    const senderCounts = new Map();      
    const receiverCounts = new Map();    
    const clanMessageCounts = new Map();
    const dayCounts = new Map();
    const hourCounts = new Map();
    const conversationCounts = new Map();
    const groupCounts = new Map();
    const interactionCounts = { p2p: 0, npc: 0, group: 0, email: 0 };

    for (const msg of allMsgs) {
      let s = null, r = null, sInfo = null;

      if (msg.group_id) {
        interactionCounts.group++;
        s = msg.sender_id; sInfo = userMap.get(s);
        groupCounts.set(msg.group_id, (groupCounts.get(msg.group_id) || 0) + 1);
      } else if (msg.thread_id) {
        interactionCounts.email++;
      } else {
        const isNpc = !!msg.npc_id;
        s = isNpc ? (msg.from_side === 'user' ? msg.user_id : `NPC-${msg.npc_id}`) : msg.sender_id;
        r = isNpc ? (msg.from_side === 'npc' ? msg.user_id : `NPC-${msg.npc_id}`) : msg.recipient_id;
        sInfo = isNpc && msg.from_side === 'npc' ? npcMap.get(msg.npc_id) : userMap.get(s);
        if (isNpc) interactionCounts.npc++; else interactionCounts.p2p++;
      }

      let sExcluded = false;
      let rExcluded = false;

      if (s && !String(s).startsWith('NPC-')) {
         const u = userMap.get(Number(s));
         if (u && u.excluded) sExcluded = true;
      }
      if (r && !String(r).startsWith('NPC-')) {
         const u = userMap.get(Number(r));
         if (u && u.excluded) rExcluded = true;
      }

      if (s && !String(s).startsWith('NPC-') && !sExcluded) senderCounts.set(Number(s), (senderCounts.get(Number(s)) || 0) + 1);
      if (r && !String(r).startsWith('NPC-') && !rExcluded) receiverCounts.set(Number(r), (receiverCounts.get(Number(r)) || 0) + 1);
      if (sInfo && sInfo.clan) clanMessageCounts.set(sInfo.clan, (clanMessageCounts.get(sInfo.clan) || 0) + 1);

      if (msg.created_at) {
        const d = new Date(msg.created_at);
        if (!isNaN(d.getTime())) {
          const dayStr = d.toISOString().split('T')[0];
          const hourNum = d.getHours();
          dayCounts.set(dayStr, (dayCounts.get(dayStr) || 0) + 1);
          hourCounts.set(hourNum, (hourCounts.get(hourNum) || 0) + 1);
        }
      }

      if (s && r && !sExcluded && !rExcluded) {
        const pair = [String(s), String(r)].sort().join(' ↔ ');
        conversationCounts.set(pair, (conversationCounts.get(pair) || 0) + 1);
      }
    }

    const formatConvoNames = (pairStr) => {
      return pairStr.split(' ↔ ').map(idStr => {
         if (idStr.startsWith('NPC-')) {
           const nId = Number(idStr.replace('NPC-', ''));
           const nInfo = npcMap.get(nId);
           return nInfo ? nInfo.name : idStr;
         }
         const uInfo = userMap.get(Number(idStr));
         return uInfo ? (uInfo.char_name || uInfo.name) : `User ${idStr}`;
      }).join(' & ');
    };

    const busiestDay = getTies(dayCounts);
    const busiestHour = getTies(hourCounts, h => `${h}:00`);
    const longestConvo = getTies(conversationCounts, formatConvoNames);
    const mostFamousClan = getTies(clanMessageCounts);
    const mostActiveGroup = getTies(groupCounts, id => {
      const g = chatGroups.find(x => x.id === id); return g ? g.name : `Group ${id}`;
    });

    const intoTopList = (map, nameMap) => Array.from(map.entries())
        .filter(([id]) => !String(id).startsWith('NPC-'))
        .map(([id, count]) => {
          const info = nameMap.get(Number(id));
          if (!info || info.excluded) return null;
          return { id, name: info.char_name || info.name, subname: info.char_name ? info.name : null, clan: info.clan, count };
        }).filter(Boolean).sort((a, b) => b.count - a.count).slice(0, 10);

    return { totalInPeriod: allMsgs.length, avgPerDay: (allMsgs.length / totalDays).toFixed(1), busiestDay, busiestHour, longestConvo, mostFamousClan, mostActiveGroup, interactionCounts, topSenders: intoTopList(senderCounts, userMap), topReceivers: intoTopList(receiverCounts, userMap), hourCounts };
  }, [filteredData, userMap, npcMap, chatGroups]);

  const extraStats = useMemo(() => {
    const { filteredXp, filteredDice, filteredDowntimes, totalDays } = filteredData;
    const isAllTime = !startDate || !endDate; 
    const aggregateByMonth = isAllTime || totalDays > 60;

    let xpSpent = 0; let loggedGranted = 0;
    const purchases = new Map();
    const dailyXpMap = new Map();

    filteredXp.forEach(log => {
      const cost = Number(log.cost) || 0;
      if (cost > 0) {
        xpSpent += cost;
        if (log.created_at) {
          const d = new Date(log.created_at);
          const dStr = aggregateByMonth 
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` 
            : d.toISOString().split('T')[0];
          dailyXpMap.set(dStr, (dailyXpMap.get(dStr) || 0) + cost);
        }
      } else if (cost < 0) {
        loggedGranted += Math.abs(cost);
      }
      if (log.action === 'attribute' || log.action === 'discipline') {
        purchases.set(log.target, (purchases.get(log.target) || 0) + 1);
      }
    });

    const xpDailyChart = Array.from(dailyXpMap.entries()).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));
    let currentUnspentXp = 0;
    characters.forEach(c => { currentUnspentXp += (Number(c.xp) || 0); });

    const xpFlow = { spent: xpSpent, granted: isAllTime ? (currentUnspentXp + xpSpent) : loggedGranted };
    const topPurchase = getTies(purchases);

    const getCharName = (id) => {
      if (!id) return 'Unknown';
      const c = characters.find(char => char.id === id);
      if (c && (c.is_deceased || c.is_hidden)) return 'Unknown';
      return c ? c.name : `Unknown Player`;
    };

    let bestRoll = { ratio: -1, note: 'None', charNames: new Set(), raw: null, successes: 0, totalDice: 0 };
    let worstRoll = { ratio: 999, note: 'None', bestial: false, charNames: new Set(), raw: null, successes: 0, totalDice: 0 };
    const luckMap = new Map();

    filteredDice.forEach(roll => {
      let res = roll.results_json ?? roll.results ?? {};
      try { if (typeof res === "string") res = JSON.parse(res); } catch { res = {}; }
      const normal = Array.isArray(res.normal) ? res.normal : Array.isArray(roll.normal) ? roll.normal : [];
      const hunger = Array.isArray(res.hunger) ? res.hunger : Array.isArray(roll.hunger) ? roll.hunger : [];
      
      const totalDice = normal.length + hunger.length;
      if (totalDice < 4) return; // Disqualify single die rolls for ratio

      const cName = getCharName(roll.character_id);
      if (cName === 'Unknown' || cName === 'Unknown Player') return; 

      const ratio = roll.successes / totalDice;

      if (ratio > bestRoll.ratio || (ratio === bestRoll.ratio && roll.successes > bestRoll.successes)) {
        bestRoll = { ratio, note: roll.note || 'Unnamed Roll', charNames: new Set([cName]), raw: roll, successes: roll.successes, totalDice };
      } else if (ratio === bestRoll.ratio && roll.successes === bestRoll.successes) {
        bestRoll.charNames.add(cName);
      }
      
      if (roll.bestial_failure) {
         if (!worstRoll.bestial || ratio < worstRoll.ratio || (ratio === worstRoll.ratio && roll.successes < worstRoll.successes)) {
            worstRoll = { ratio, note: roll.note || 'Unnamed Roll', bestial: true, charNames: new Set([cName]), raw: roll, successes: roll.successes, totalDice };
         } else if (worstRoll.bestial && ratio === worstRoll.ratio && roll.successes === worstRoll.successes) {
            worstRoll.charNames.add(cName);
         }
      } else if (!worstRoll.bestial) {
         if (ratio < worstRoll.ratio || (ratio === worstRoll.ratio && roll.successes < worstRoll.successes)) {
           worstRoll = { ratio, note: roll.note || 'Unnamed Roll', bestial: false, charNames: new Set([cName]), raw: roll, successes: roll.successes, totalDice };
         } else if (ratio === worstRoll.ratio && roll.successes === worstRoll.successes) {
           worstRoll.charNames.add(cName);
         }
      }
      
      if (roll.character_id) {
        const charStats = luckMap.get(roll.character_id) || { totalSucc: 0, rolls: 0 };
        charStats.totalSucc += roll.successes;
        charStats.rolls += 1;
        luckMap.set(roll.character_id, charStats);
      }
    });

    let luckiestRatio = -1;
    let luckiestNames = [];
    luckMap.forEach((stats, charId) => {
      if (stats.rolls < 3) return; // Disqualify players with barely any rolls
      const ratio = stats.totalSucc / stats.rolls;
      if (ratio > luckiestRatio) {
        luckiestRatio = ratio;
        luckiestNames = [getCharName(charId)];
      } else if (ratio === luckiestRatio) {
        luckiestNames.push(getCharName(charId));
      }
    });

    bestRoll.charName = Array.from(bestRoll.charNames).join(', ');
    worstRoll.charName = Array.from(worstRoll.charNames).join(', ');
    const luckiestChar = { name: luckiestNames.length > 0 ? luckiestNames.join(', ') : 'None', ratio: luckiestRatio };

    const rouseRolls = filteredDice.filter(d => d.note?.toLowerCase().includes('rouse'));
    const successfulRouse = rouseRolls.filter(d => d.successes > 0).length;
    const rouseSuccessRate = rouseRolls.length > 0 ? ((successfulRouse / rouseRolls.length) * 100).toFixed(1) : 0;

    let totalResTime = 0; let resolvedCount = 0;
    filteredDowntimes.forEach(dt => {
      if (dt.status === 'resolved' && dt.resolved_at && dt.created_at) {
        totalResTime += (new Date(dt.resolved_at) - new Date(dt.created_at));
        resolvedCount++;
      }
    });
    const avgResHours = resolvedCount > 0 ? (totalResTime / resolvedCount / (1000 * 60 * 60)).toFixed(1) : 'N/A';

    return { xpFlow, xpDailyChart, aggregateByMonth, topPurchase, diceRolled: filteredDice.length, bestRoll, worstRoll, luckiestChar, rouseSuccessRate, totalRouse: rouseRolls.length, downtimesCount: filteredDowntimes.length, avgResHours };
  }, [filteredData, characters, startDate, endDate]);

  const popStats = useMemo(() => {
    let active = 0, deceased = 0, hidden = 0, totalHumanity = 0, humanityCount = 0;
    const clanPop = {}; const politicalPower = new Map();

    characters.forEach(c => {
      if (c.is_deceased) deceased++;
      else if (c.is_hidden) hidden++;
      else {
        active++;
        const clan = c.clan || 'Unknown';
        clanPop[clan] = (clanPop[clan] || 0) + 1;
        try { const sheet = typeof c.sheet === 'string' ? JSON.parse(c.sheet) : (c.sheet || {}); if (sheet.humanity !== undefined) { totalHumanity += Number(sheet.humanity); humanityCount++; } } catch (e) {}
        
        try { 
          const titles = typeof c.camarilla_titles === 'string' ? JSON.parse(c.camarilla_titles) : (c.camarilla_titles || []); 
          if (Array.isArray(titles)) {
             const activeTitles = titles.filter(t => {
                const s = typeof t === 'string' ? t.toUpperCase() : JSON.stringify(t).toUpperCase();
                return !s.includes('EX-');
             });
             if (activeTitles.length > 0) {
               politicalPower.set(clan, (politicalPower.get(clan) || 0) + activeTitles.length); 
             }
          }
        } catch(e) {}
      }
    });

    const mostPoliticalClan = getTies(politicalPower);
    const avgHumanity = humanityCount > 0 ? (totalHumanity / humanityCount).toFixed(1) : 'N/A';
    const pieData = Object.entries(clanPop).sort((a, b) => b[1] - a[1]).map(([clan, count]) => ({ label: clan, value: count, color: CLAN_COLORS[clan] || '#888', logo: clanSymbol(clan) }));

    return { active, deceased, hidden, pieData, avgHumanity, mostPoliticalClan };
  }, [characters]);

  /** ---------- Chart Renderers ---------- */
  const renderHeatmap = () => {
    const hourData = periodStats.hourCounts || new Map();
    if (hourData.size === 0) return <div style={{ display: 'none' }} />;
    
    const hours = Array.from({length: 24}, (_, i) => i);
    const countsArray = Array.from(hourData.values());
    const maxCount = countsArray.length > 0 ? Math.max(1, ...countsArray) : 1;

    return (
      <div style={{ marginTop: '1.5rem', background: isExporting ? 'rgba(20, 20, 24, 0.7)' : 'var(--card)', padding: isExporting ? '2rem' : '1.5rem', borderRadius: '16px', border: isExporting ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--dim)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', width: '100%', boxSizing: 'border-box' }}>
        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: isExporting ? '1.1rem' : '1rem' }}>Engagement Heatmap (Busiest Hours)</h4>
        <div style={{ display: 'flex', gap: '4px', height: isExporting ? '140px' : '120px', width: '100%' }}>
          {hours.map(h => {
            const count = hourData.get(h) || 0;
            const heightPct = (count / maxCount) * 100;
            return (
              <div key={h} style={{ flex: '1 1 0', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative' }} title={`${count} messages at ${h}:00`}>
                  <div style={{ width: '100%', height: `${heightPct}%`, minHeight: count > 0 ? '4px' : '0', background: count > 0 ? '#8a0303' : 'var(--dim)', borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease' }} />
                </div>
                <span style={{ fontSize: isExporting ? '0.8rem' : '0.65rem', color: 'var(--muted)', fontWeight: 'bold' }}>{h}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderXPChart = () => {
    const data = extraStats.xpDailyChart;
    if (!data || data.length === 0) return <div style={{ display: 'none' }} />;

    const maxXP = Math.max(1, ...data.map(d => d.amount));
    const isMonth = extraStats.aggregateByMonth;

    return (
      <div style={{ marginTop: '1.5rem', background: isExporting ? 'rgba(20, 20, 24, 0.7)' : 'var(--card)', padding: isExporting ? '2rem' : '1.5rem', borderRadius: '16px', border: isExporting ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--dim)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', width: '100%', boxSizing: 'border-box' }}>
        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: isExporting ? '1.1rem' : '1rem' }}>XP Expenditure Timeline</h4>
        <div style={{ display: 'flex', gap: isExporting ? '2px' : '6px', height: isExporting ? '140px' : '120px', alignItems: 'flex-end', overflowX: isExporting ? 'hidden' : 'auto', paddingBottom: '10px', width: '100%' }}>
          {data.map((d, i) => {
            const heightPct = (d.amount / maxXP) * 100;
            const dateObj = new Date(d.date);
            const label = isMonth 
              ? `${dateObj.getMonth()+1}/${String(dateObj.getFullYear()).slice(-2)}` 
              : `${dateObj.getDate()}/${dateObj.getMonth()+1}`;

            return (
              <div key={d.date} style={{ flex: '1 1 0', minWidth: isExporting ? '0' : '25px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative' }} title={`${d.amount} XP on ${d.date}`}>
                  <div style={{ width: '100%', height: `${heightPct}%`, minHeight: '4px', background: '#d4af37', borderRadius: '4px 4px 0 0', opacity: 0.85 }} />
                </div>
                <span style={{ fontSize: isExporting ? '0.7rem' : '0.65rem', color: 'var(--muted)', fontWeight: 'bold' }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const subtextDisplay = (startDate && endDate) ? `${startDate} to ${endDate}` : 'All Time';

  /** ---------- Render ---------- */
  return (
    <div className={styles.stack12}>
      
      {/* Top Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'var(--card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--dim)' }}>
        <h3 style={{ margin: 0 }}>Statistics Engine</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="text" 
            value={customTitle} 
            onChange={e => setCustomTitle(e.target.value)} 
            placeholder="Custom Export Title..."
            className={styles.input}
            style={{ width: '220px', margin: 0 }}
          />
          <button 
            onClick={handleExport} 
            disabled={isExporting}
            style={{ background: 'var(--ok)', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: isExporting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isExporting ? <span className={styles.spinner} style={{ borderColor: 'black', borderTopColor: 'transparent' }}/> : '📸'} 
            {isExporting ? 'Generating...' : 'Export Graphic'}
          </button>
        </div>
      </div>

      {/* Date controls */}
      {!isExporting && (
        <div className={styles.dateFilters}>
          <label className={styles.labeledInput}>
            <span>Start Date</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={styles.input} />
          </label>
          <label className={styles.labeledInput}>
            <span>End Date</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={styles.input} />
          </label>
          <div className={styles.dateFilterButtons}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { const d = new Date(); d.setDate(d.getDate() - 7); setStartDate(d.toISOString().split('T')[0]); setEndDate(todayStr); }}>Last 7 Days</button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { const d = new Date(); d.setDate(d.getDate() - 30); setStartDate(d.toISOString().split('T')[0]); setEndDate(todayStr); }}>Last 30 Days</button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { setStartDate(''); setEndDate(''); }}>All Time</button>
          </div>
        </div>
      )}

      {/* EXPORTABLE WRAPPER */}
      <div 
        ref={exportRef} 
        style={{ 
          padding: isExporting ? '60px' : '0', 
          background: isExporting ? 'radial-gradient(circle at center, #2a0b12 0%, #0b0b0c 80%)' : 'transparent', 
          width: isExporting ? '1200px' : '100%', 
          minWidth: isExporting ? '1200px' : '0', 
          overflow: 'hidden', 
          margin: '0 auto',
          position: 'relative',
          boxSizing: 'border-box',
          border: isExporting ? '4px solid #8a0303' : 'none' 
        }}
      >
        
        {/* Conditional Export Header */}
        {isExporting && (
          <div style={{ textAlign: 'center', marginBottom: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(0,0,0,0.5)', padding: '10px 25px', borderRadius: '40px', border: '1px solid #8a0303' }}>
               <img src="/img/ATT-logo(1).png" alt="ATT Logo" style={{ height: '40px' }} />
               <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#d4af37', letterSpacing: '2px', textTransform: 'uppercase' }}>Erebus Portal Stats</span>
            </div>
            <h1 style={{ color: '#fff', fontSize: '3.5rem', margin: '20px 0 10px 0', textTransform: 'uppercase', textShadow: '0 0 20px rgba(138,3,3,0.8)', lineHeight: '1.1' }}>{customTitle}</h1>
            <p style={{ color: '#ffb8b8', fontSize: '1.4rem', margin: 0, fontWeight: 'bold', letterSpacing: '1px' }}>{subtextDisplay}</p>
          </div>
        )}

        {/* MASONRY GRID LAYOUT FOR EXPORT */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isExporting ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)', 
          gap: isExporting ? '3rem' : '2rem',
          alignItems: 'start',
          width: '100%'
        }}>

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isExporting ? '3rem' : '2rem', minWidth: 0 }}>
            
            <section>
              <h4 style={{ margin: '0 0 1.5rem 0', color: '#d4af37', borderBottom: '2px solid #8a0303', paddingBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '2px', fontSize: isExporting ? '1.4rem' : '1.1rem' }}>The Blood</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {popStats.active > 0 && <InteractivePieChart data={popStats.pieData} isExporting={isExporting} />}
                <div style={{ display: 'grid', gridTemplateColumns: isExporting ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                  <StatCard title="Total Active" value={popStats.active} subtext="Living kindred" highlight isExporting={isExporting} />
                  <StatCard title="Total Deceased" value={popStats.deceased} subtext="Met Final Death" isExporting={isExporting} />
                  <StatCard title="Retired / Hidden" value={popStats.hidden} subtext="Removed from play" isExporting={isExporting} />
                  <StatCard title="Average Humanity" value={popStats.avgHumanity} subtext="Across active domain" isExporting={isExporting} />
                </div>
                <StatCard title="Most Political" value={popStats.mostPoliticalClan.name} subtext={`${popStats.mostPoliticalClan.count} Active Titles Held`} highlight isExporting={isExporting} />
              </div>
            </section>

            <section>
              <h4 style={{ margin: '0 0 1.5rem 0', color: '#d4af37', borderBottom: '2px solid #8a0303', paddingBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '2px', fontSize: isExporting ? '1.4rem' : '1.1rem' }}>The Whispers</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <StatCard title="Total Messages" value={periodStats.totalInPeriod.toLocaleString()} subtext={`${periodStats.avgPerDay} msgs / day`} highlight isExporting={isExporting} />
                <StatCard title="Busiest Day" value={periodStats.busiestDay.name} subtext={`${periodStats.busiestDay.count.toLocaleString()} msgs`} isExporting={isExporting} />
                <StatCard title="Longest Convo" value={periodStats.longestConvo.name} subtext={`${periodStats.longestConvo.count.toLocaleString()} msgs exchanged`} isExporting={isExporting} />
                <StatCard title="Most Active Group" value={periodStats.mostActiveGroup.name} subtext={`${periodStats.mostActiveGroup.count.toLocaleString()} msgs`} isExporting={isExporting} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isExporting ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                <StatCard title="Player-to-Player" value={periodStats.interactionCounts.p2p.toLocaleString()} subtext="Direct" isExporting={isExporting} />
                <StatCard title="NPC Interactions" value={periodStats.interactionCounts.npc.toLocaleString()} subtext="Storyteller" isExporting={isExporting} />
                <StatCard title="Group Activity" value={periodStats.interactionCounts.group.toLocaleString()} subtext="Coteries" isExporting={isExporting} />
                <StatCard title="Email Traffic" value={periodStats.interactionCounts.email.toLocaleString()} subtext="Mortal" isExporting={isExporting} />
              </div>
            </section>

            {renderHeatmap()}

          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isExporting ? '3rem' : '2rem', minWidth: 0 }}>
            
            <section>
              <h4 style={{ margin: '0 0 1.5rem 0', color: '#d4af37', borderBottom: '2px solid #8a0303', paddingBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '2px', fontSize: isExporting ? '1.4rem' : '1.1rem' }}>Fate & Fortune</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <StatCard title="XP Granted" value={extraStats.xpFlow.granted.toLocaleString()} subtext="Gifts from Storytellers" highlight isExporting={isExporting} />
                <StatCard title="XP Spent" value={extraStats.xpFlow.spent.toLocaleString()} subtext="Player upgrades" isExporting={isExporting} />
                <StatCard title="Top Purchased" value={extraStats.topPurchase.name} subtext={`${extraStats.topPurchase.count} dots acquired`} isExporting={isExporting} />
                <StatCard title="Total Dice Rolls" value={extraStats.diceRolled.toLocaleString()} subtext="Tests of Fate" isExporting={isExporting} />
                <StatCard title="Luckiest Character" value={extraStats.luckiestChar.name} subtext={`${extraStats.luckiestChar.ratio.toFixed(2)} Ratio`} isExporting={isExporting} />
                <StatCard title="Rouse Success" value={`${extraStats.rouseSuccessRate}%`} subtext={`${extraStats.totalRouse} total checks`} isExporting={isExporting} />
              </div>
              
              {renderXPChart()}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
                <DiceStatCard 
                  title="Greatest Triumph" 
                  value={extraStats.bestRoll.successes !== -1 ? `${extraStats.bestRoll.successes} Succ` : 'N/A'} 
                  subtext={extraStats.bestRoll.successes !== -1 ? `${extraStats.bestRoll.charName} (${extraStats.bestRoll.totalDice} Dice)` : 'N/A'} 
                  rollData={extraStats.bestRoll.raw}
                  isExporting={isExporting}
                />
                <DiceStatCard 
                  title="Darkest Failure" 
                  value={extraStats.worstRoll.successes !== 99 ? (extraStats.worstRoll.bestial ? 'Bestial Failure' : `${extraStats.worstRoll.successes} Succ`) : 'N/A'} 
                  subtext={extraStats.worstRoll.successes !== 99 ? `${extraStats.worstRoll.charName} (${extraStats.worstRoll.totalDice} Dice)` : 'N/A'} 
                  rollData={extraStats.worstRoll.raw}
                  isExporting={isExporting}
                />
              </div>
            </section>

            <section>
              <h4 style={{ margin: '0 0 1.5rem 0', color: '#d4af37', borderBottom: '2px solid #8a0303', paddingBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '2px', fontSize: isExporting ? '1.4rem' : '1.1rem' }}>Top Engagements</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <StatList title="Most Active Senders" items={periodStats.topSenders} isExporting={isExporting} />
                <StatList title="Most Active Receivers" items={periodStats.topReceivers} isExporting={isExporting} />
              </div>
            </section>

          </div>
        </div>

      </div>
    </div>
  );
}