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

/** ---------- Roll Art & Dice Helpers ---------- */
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

function DiceStripInline({ title, values, imgFn }) {
  if (!values || !values.length) return null;
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '4px', fontWeight: 'bold' }}>{title} ({values.length})</div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {values.map((v, i) => (
          <img
            key={i}
            src={imgFn(v)}
            alt={String(v)}
            style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.outerHTML = `<div style="width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; background: #222; border: 1px solid #555; border-radius: 4px; font-size: 13px; color: #fff; font-weight: bold;">${v}</div>`;
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** ---------- UI Components ---------- */
function StatCard({ title, value, subtext, highlight }) {
  return (
    <div style={{ 
      padding: '1.25rem', 
      background: highlight ? 'linear-gradient(145deg, #1a1a24 0%, #0d0d12 100%)' : 'var(--card)', 
      borderRadius: '12px', 
      border: highlight ? '1px solid #8a0303' : '1px solid var(--dim)',
      boxShadow: highlight ? '0 4px 15px rgba(138, 3, 3, 0.15)' : '0 2px 8px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <h4 style={{ margin: '0 0 0.5rem 0', color: highlight ? '#ffb8b8' : 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h4>
      <div style={{ fontSize: '1.8rem', fontWeight: '900', color: highlight ? '#fff' : 'var(--fg)', lineHeight: '1.1' }}>{value}</div>
      {subtext && <div style={{ fontSize: '0.85rem', color: highlight ? '#ff8c8c' : 'var(--muted)', marginTop: '0.5rem' }}>{subtext}</div>}
    </div>
  );
}

function DiceStatCard({ title, value, subtext, rollData }) {
  const art = getRollArt(rollData);
  
  let normal = [];
  let hunger = [];
  if (rollData) {
    let res = rollData.results_json ?? rollData.results ?? {};
    try {
      if (typeof res === "string") res = JSON.parse(res);
    } catch {
      res = {};
    }
    normal = Array.isArray(res.normal) ? res.normal : Array.isArray(rollData.normal) ? rollData.normal : [];
    hunger = Array.isArray(res.hunger) ? res.hunger : Array.isArray(rollData.hunger) ? rollData.hunger : [];
  }

  return (
    <div style={{ padding: '1.25rem', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--dim)', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', width: '100%' }}>
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h4>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--fg)', lineHeight: '1.1' }}>{value}</div>
          {subtext && <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>{subtext}</div>}
        </div>
        {rollData && (
          <img src={art} alt={title} style={{ width: '60px', height: '60px', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }} />
        )}
      </div>

      {rollData && (normal.length > 0 || hunger.length > 0) && (
        <div style={{ borderTop: '1px solid var(--dim)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
          <DiceStripInline title="Normal Dice" values={normal} imgFn={IMG.normal} />
          <DiceStripInline title="Hunger Dice" values={hunger} imgFn={IMG.hunger} />
        </div>
      )}
    </div>
  );
}

function StatList({ title, items }) {
  return (
    <div style={{ background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--dim)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
      <h3 style={{ margin: 0, padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--dim)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>
      <div style={{ padding: '0.5rem 0' }}>
        {items.length === 0 && (
          <div style={{ padding: '1rem 1.25rem', color: 'var(--muted)' }}>No data for this period.</div>
        )}
        <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {items.map((item, i) => {
            const color = CLAN_COLORS[item.clan] || 'var(--text-secondary)';
            const logo = clanSymbol(item.clan);
            return (
              <li
                key={item.id ?? `${item.name}-${i}`}
                style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.25rem', borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
              >
                {logo ? (
                  <img src={logo} alt={item.clan || ''} style={{ width: '32px', height: '32px', marginRight: '12px', filter: `drop-shadow(0 0 4px ${color}88)` }} />
                ) : (
                  <span style={{ width: '32px', textAlign: 'center', marginRight: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>{i + 1}</span>
                )}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--fg)', fontSize: '1.05rem' }}>{item.name}</span>
                  {item.subname && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{item.subname}</span>
                  )}
                </div>
                <span style={{ fontWeight: '900', color: color, fontSize: '1.1rem', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '20px' }}>
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

function InteractivePieChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulativeOffset = 0;
  const r = 15.915494309189533;

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', background: 'var(--card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--dim)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
      <div style={{ position: 'relative', width: '180px', height: '180px' }}>
        <svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', overflow: 'visible' }}>
          {data.map((d) => {
            const dashVal = (d.value / total) * 100;
            const offset = -cumulativeOffset;
            cumulativeOffset += dashVal;
            return (
              <circle
                key={d.label}
                cx="20" cy="20" r={r}
                fill="transparent"
                stroke={d.color}
                strokeWidth="8"
                strokeDasharray={`${dashVal} 100`}
                strokeDashoffset={offset}
              />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
           <span style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--fg)' }}>{total}</span>
           <span style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Active</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.5rem', minWidth: '140px' }}>
         {data.map(d => (
           <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {d.logo ? (
                <img src={d.logo} alt={d.label} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '14px', height: '14px', backgroundColor: d.color, borderRadius: '50%' }} />
              )}
              <span style={{ fontSize: '0.9rem', color: 'var(--fg)', fontWeight: 'bold' }}>{d.label}</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--muted)', marginLeft: 'auto', fontWeight: '900' }}>{d.value}</span>
           </div>
         ))}
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

  const handleExport = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#0b0b0c', // Dark background matching app
        scale: 2, // High-Res export
        useCORS: true, // Needed for external images like clan logos
        logging: false
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `Erebus-Report-${todayStr}.png`;
      link.click();
    } catch (e) {
      console.error('Export failed:', e);
      alert('Failed to generate image. Please try again.');
    }
    setIsExporting(false);
  };

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

  /** ---------- Date filter (All Data) ---------- */
  const filteredData = useMemo(() => {
    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
    const end = endDate ? new Date(endDate) : new Date('2100-01-01');
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const a = start.getTime();
    const b = end.getTime();
    
    const inRange = (ts) => {
      if (!ts) return false;
      const t = new Date(ts).getTime();
      return Number.isFinite(t) && t >= a && t <= b;
    };

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

  /** ---------- Advanced Period Stats ---------- */
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
      let s = null, r = null;
      let sInfo = null;

      if (msg.group_id) {
        interactionCounts.group++;
        s = msg.sender_id;
        sInfo = userMap.get(s);
        groupCounts.set(msg.group_id, (groupCounts.get(msg.group_id) || 0) + 1);
      } else if (msg.thread_id) {
        interactionCounts.email++;
      } else {
        const isNpc = !!msg.npc_id;
        s = isNpc ? (msg.from_side === 'user' ? msg.user_id : `NPC-${msg.npc_id}`) : msg.sender_id;
        r = isNpc ? (msg.from_side === 'npc' ? msg.user_id : `NPC-${msg.npc_id}`) : msg.recipient_id;
        sInfo = isNpc && msg.from_side === 'npc' ? npcMap.get(msg.npc_id) : userMap.get(s);
        
        if (isNpc) interactionCounts.npc++;
        else interactionCounts.p2p++;
      }

      if (s && !String(s).startsWith('NPC-')) senderCounts.set(Number(s), (senderCounts.get(Number(s)) || 0) + 1);
      if (r && !String(r).startsWith('NPC-')) receiverCounts.set(Number(r), (receiverCounts.get(Number(r)) || 0) + 1);

      if (sInfo && sInfo.clan) {
        clanMessageCounts.set(sInfo.clan, (clanMessageCounts.get(sInfo.clan) || 0) + 1);
      }

      if (msg.created_at) {
        const d = new Date(msg.created_at);
        if (!isNaN(d.getTime())) {
          const dayStr = d.toISOString().split('T')[0];
          const hourNum = d.getHours();
          
          dayCounts.set(dayStr, (dayCounts.get(dayStr) || 0) + 1);
          hourCounts.set(hourNum, (hourCounts.get(hourNum) || 0) + 1);
        }
      }

      if (s && r) {
        const pair = [String(s), String(r)].sort().join(' ↔ ');
        conversationCounts.set(pair, (conversationCounts.get(pair) || 0) + 1);
      }
    }

    let busiestDay = { day: 'N/A', count: 0 };
    dayCounts.forEach((count, day) => { if (count > busiestDay.count) busiestDay = { day, count }; });
    
    let busiestHour = { hour: 'N/A', count: 0 };
    hourCounts.forEach((count, hour) => { if (count > busiestHour.count) busiestHour = { hour, count }; });
    
    let longestConvo = { pair: 'N/A', count: 0 };
    conversationCounts.forEach((count, pair) => { if (count > longestConvo.count) longestConvo = { pair, count }; });

    let mostFamousClan = { clan: 'None', count: 0 };
    clanMessageCounts.forEach((count, clan) => { if (count > mostFamousClan.count) mostFamousClan = { clan, count }; });

    let mostActiveGroup = { name: 'None', count: 0 };
    groupCounts.forEach((count, groupId) => {
      if (count > mostActiveGroup.count) {
        const groupInfo = chatGroups.find(g => g.id === groupId);
        mostActiveGroup = { name: groupInfo ? groupInfo.name : `Group ID: ${groupId}`, count };
      }
    });

    const intoTopList = (map, nameMap, limit = 10) =>
      Array.from(map.entries())
        .map(([id, count]) => {
          const info = nameMap.get(Number(id));
          return info ? { id, name: info.char_name || info.name, subname: info.char_name ? info.name : null, clan: info.clan, count } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

    return {
      totalInPeriod: allMsgs.length,
      avgPerDay: (allMsgs.length / totalDays).toFixed(1),
      busiestDay,
      busiestHour,
      longestConvo,
      mostFamousClan,
      mostActiveGroup,
      interactionCounts,
      topSenders: intoTopList(senderCounts, userMap),
      topReceivers: intoTopList(receiverCounts, userMap),
      hourCounts
    };
  }, [filteredData, userMap, npcMap, chatGroups]);

  /** ---------- Advanced General Stats (XP, Dice, Downtimes) ---------- */
  const extraStats = useMemo(() => {
    const { filteredXp, filteredDice, filteredDowntimes } = filteredData;
    const isAllTime = !startDate || !endDate; 

    let xpSpent = 0;
    let loggedGranted = 0;
    const purchases = new Map();
    const dailyXpMap = new Map();

    filteredXp.forEach(log => {
      const cost = Number(log.cost) || 0;
      if (cost > 0) {
        xpSpent += cost;
        // Map daily expenditure
        if (log.created_at) {
          const dStr = new Date(log.created_at).toISOString().split('T')[0];
          dailyXpMap.set(dStr, (dailyXpMap.get(dStr) || 0) + cost);
        }
      } else if (cost < 0) {
        loggedGranted += Math.abs(cost);
      }
      if (log.action === 'attribute' || log.action === 'discipline') {
        purchases.set(log.target, (purchases.get(log.target) || 0) + 1);
      }
    });

    const xpDailyChart = Array.from(dailyXpMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    let currentUnspentXp = 0;
    characters.forEach(c => { currentUnspentXp += (Number(c.xp) || 0); });

    const xpFlow = { 
      spent: xpSpent, 
      granted: isAllTime ? (currentUnspentXp + xpSpent) : loggedGranted 
    };

    let topPurchase = { target: 'None', count: 0 };
    purchases.forEach((count, target) => { if (count > topPurchase.count) topPurchase = { target, count }; });

    const getCharName = (id) => {
      if (!id) return 'Unknown';
      const c = characters.find(char => char.id === id);
      return c ? c.name : `Unknown Player`;
    };

    let bestRoll = { successes: -1, note: 'None', charName: 'None', raw: null };
    let worstRoll = { successes: 99, note: 'None', bestial: false, charName: 'None', raw: null };
    const luckMap = new Map();

    filteredDice.forEach(roll => {
      if (roll.successes > bestRoll.successes) {
        bestRoll = { successes: roll.successes, note: roll.note || 'Unnamed Roll', charName: getCharName(roll.character_id), raw: roll };
      }
      if (roll.bestial_failure) {
        worstRoll = { successes: roll.successes, note: roll.note || 'Unnamed Roll', bestial: true, charName: getCharName(roll.character_id), raw: roll };
      } else if (roll.successes < worstRoll.successes && !worstRoll.bestial) {
        worstRoll = { successes: roll.successes, note: roll.note || 'Unnamed Roll', bestial: false, charName: getCharName(roll.character_id), raw: roll };
      }
      
      if (roll.character_id) {
        const charStats = luckMap.get(roll.character_id) || { totalSucc: 0, rolls: 0 };
        charStats.totalSucc += roll.successes;
        charStats.rolls += 1;
        luckMap.set(roll.character_id, charStats);
      }
    });

    let luckiestChar = { name: 'None', ratio: 0 };
    luckMap.forEach((stats, charId) => {
      const ratio = stats.totalSucc / stats.rolls;
      if (ratio > luckiestChar.ratio) {
        luckiestChar = { name: getCharName(charId), ratio };
      }
    });

    const rouseRolls = filteredDice.filter(d => d.note?.toLowerCase().includes('rouse'));
    const successfulRouse = rouseRolls.filter(d => d.successes > 0).length;
    const rouseSuccessRate = rouseRolls.length > 0 ? ((successfulRouse / rouseRolls.length) * 100).toFixed(1) : 0;

    let totalResTime = 0;
    let resolvedCount = 0;
    filteredDowntimes.forEach(dt => {
      if (dt.status === 'resolved' && dt.resolved_at && dt.created_at) {
        totalResTime += (new Date(dt.resolved_at) - new Date(dt.created_at));
        resolvedCount++;
      }
    });
    const avgResHours = resolvedCount > 0 ? (totalResTime / resolvedCount / (1000 * 60 * 60)).toFixed(1) : 'N/A';

    return {
      xpSpent, xpFlow, xpDailyChart, topPurchase, diceRolled: filteredDice.length,
      bestRoll, worstRoll, luckiestChar, rouseSuccessRate, totalRouse: rouseRolls.length,
      downtimesCount: filteredDowntimes.length, avgResHours
    };
  }, [filteredData, characters, startDate, endDate]);

  /** ---------- Chronicle Population & Clan Data ---------- */
  const popStats = useMemo(() => {
    let active = 0, deceased = 0, hidden = 0, totalHumanity = 0, humanityCount = 0;
    const clanPop = {};
    const politicalPower = new Map();

    characters.forEach(c => {
      if (c.is_deceased) deceased++;
      else if (c.is_hidden) hidden++;
      else {
        active++;
        const clan = c.clan || 'Unknown';
        clanPop[clan] = (clanPop[clan] || 0) + 1;

        try {
          const sheet = typeof c.sheet === 'string' ? JSON.parse(c.sheet) : (c.sheet || {});
          if (sheet.humanity !== undefined) {
            totalHumanity += Number(sheet.humanity);
            humanityCount++;
          }
        } catch (e) {}

        try {
          const titles = typeof c.camarilla_titles === 'string' ? JSON.parse(c.camarilla_titles) : (c.camarilla_titles || []);
          if (titles.length > 0) {
            politicalPower.set(clan, (politicalPower.get(clan) || 0) + titles.length);
          }
        } catch(e) {}
      }
    });

    let mostPoliticalClan = { clan: 'None', titles: 0 };
    politicalPower.forEach((titles, clan) => {
      if (titles > mostPoliticalClan.titles) mostPoliticalClan = { clan, titles };
    });

    const avgHumanity = humanityCount > 0 ? (totalHumanity / humanityCount).toFixed(1) : 'N/A';

    const pieData = Object.entries(clanPop)
      .sort((a, b) => b[1] - a[1]) 
      .map(([clan, count]) => ({
        label: clan, value: count, color: CLAN_COLORS[clan] || '#888', logo: clanSymbol(clan)
      }));

    return { active, deceased, hidden, pieData, avgHumanity, mostPoliticalClan };
  }, [characters]);

  /** ---------- Chart Renderers ---------- */
  const renderHeatmap = () => {
    const hourData = periodStats.hourCounts || new Map();
    const hours = Array.from({length: 24}, (_, i) => i);
    const countsArray = Array.from(hourData.values());
    const maxCount = countsArray.length > 0 ? Math.max(1, ...countsArray) : 1;

    return (
      <div style={{ marginTop: '1.5rem', background: 'var(--card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--dim)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Engagement Heatmap (Busiest Hours)</h4>
        <div style={{ display: 'flex', gap: '4px', height: '120px' }}>
          {hours.map(h => {
            const count = hourData.get(h) || 0;
            const heightPct = (count / maxCount) * 100;
            return (
              <div key={h} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative' }} title={`${count} messages at ${h}:00`}>
                  <div style={{ width: '100%', height: `${heightPct}%`, minHeight: count > 0 ? '4px' : '0', background: count > 0 ? 'var(--ok)' : 'var(--dim)', borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease' }} />
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 'bold' }}>{h}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderXPChart = () => {
    const data = extraStats.xpDailyChart;
    if (!data || data.length === 0) return null;

    const maxXP = Math.max(1, ...data.map(d => d.amount));

    return (
      <div style={{ marginTop: '1.5rem', background: 'var(--card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--dim)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>XP Expenditure Timeline</h4>
        <div style={{ display: 'flex', gap: '6px', height: '120px', alignItems: 'flex-end', overflowX: 'auto', paddingBottom: '10px' }}>
          {data.map((d, i) => {
            const heightPct = (d.amount / maxXP) * 100;
            const dateObj = new Date(d.date);
            const label = `${dateObj.getDate()}/${dateObj.getMonth()+1}`;
            return (
              <div key={i} style={{ flex: '1 0 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative' }} title={`${d.amount} XP on ${d.date}`}>
                  <div style={{ width: '100%', height: `${heightPct}%`, minHeight: '4px', background: '#d4af37', borderRadius: '4px 4px 0 0', opacity: 0.85 }} />
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 'bold' }}>{label}</span>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Advanced Server Statistics</h3>
        <button 
          onClick={handleExport} 
          disabled={isExporting}
          style={{ background: 'var(--ok)', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: isExporting ? 'wait' : 'pointer', boxShadow: '0 4px 10px rgba(62, 207, 142, 0.3)' }}
        >
          {isExporting ? 'Generating Image...' : '📸 Export to Discord'}
        </button>
      </div>

      {/* Date controls */}
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

      {/* EXPORTABLE WRAPPER */}
      <div ref={exportRef} style={{ padding: isExporting ? '30px' : '0', background: isExporting ? '#0b0b0c' : 'transparent', borderRadius: '16px' }}>
        
        {/* Conditional Export Header */}
        {isExporting && (
          <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #8a0303', paddingBottom: '20px' }}>
            <h1 style={{ color: '#fff', fontSize: '2.5rem', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '2px' }}>🦇 Erebus Chronicle Report</h1>
            <p style={{ color: 'var(--muted)', fontSize: '1.1rem', margin: 0 }}>Statistics for: {subtextDisplay}</p>
          </div>
        )}

        {/* CHRONICLE POPULATION */}
        <h4 style={{marginTop: isExporting ? '0' : '2rem', marginBottom: '1rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--dim)', paddingBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px'}}>Chronicle Population</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
          {popStats.active > 0 && <InteractivePieChart data={popStats.pieData} />}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <StatCard title="Total Active" value={popStats.active} subtext="Living / Active characters" highlight />
            <StatCard title="Total Deceased" value={popStats.deceased} subtext="Met Final Death" />
            <StatCard title="Retired / Hidden" value={popStats.hidden} subtext="Removed from active play" />
            <StatCard title="Average Humanity" value={popStats.avgHumanity} subtext="Across active characters" />
            <StatCard title="Most Political Clan" value={popStats.mostPoliticalClan.clan} subtext={`${popStats.mostPoliticalClan.titles} Titles Held`} />
          </div>
        </div>

        {/* CHAT METRICS */}
        <h4 style={{marginTop: '2.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--dim)', paddingBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px'}}>Communication Metrics</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <StatCard title="Messages in Period" value={periodStats.totalInPeriod.toLocaleString()} subtext={`${periodStats.avgPerDay} msgs / day`} highlight />
          <StatCard title="Busiest Day" value={periodStats.busiestDay.day} subtext={`${periodStats.busiestDay.count.toLocaleString()} messages`} />
          <StatCard title="Busiest Hour" value={`${periodStats.busiestHour.hour}:00`} subtext={`Avg Peak Traffic`} />
          <StatCard title="Longest Convo" value={periodStats.longestConvo.count.toLocaleString()} subtext={`Msgs between: ${periodStats.longestConvo.pair}`} />
          <StatCard title="Most Active Group" value={periodStats.mostActiveGroup.name} subtext={`${periodStats.mostActiveGroup.count.toLocaleString()} messages`} />
        </div>

        {/* CHRONICLE HEALTH & INTERACTION SECTIONS */}
        <h4 style={{marginTop: '2.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--dim)', paddingBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px'}}>Chronicle Health & Interaction</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <StatCard title="XP Flow (Granted)" value={extraStats.xpFlow.granted.toLocaleString()} subtext="Total XP gifted by STs" highlight />
          <StatCard title="XP Flow (Spent)" value={extraStats.xpFlow.spent.toLocaleString()} subtext="Total XP spent by players" />
          <StatCard title="Rouse Success Rate" value={`${extraStats.rouseSuccessRate}%`} subtext={`${extraStats.totalRouse} total checks`} />
          <StatCard title="Avg Resolution Time" value={extraStats.avgResHours !== 'N/A' ? `${extraStats.avgResHours} hrs` : 'N/A'} subtext="Downtime response time" />
        </div>

        {renderXPChart()}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          <StatCard title="Player-to-Player" value={periodStats.interactionCounts.p2p.toLocaleString()} subtext="Direct messages" />
          <StatCard title="NPC Interactions" value={periodStats.interactionCounts.npc.toLocaleString()} subtext="Messages to/from NPCs" />
          <StatCard title="Group Activity" value={periodStats.interactionCounts.group.toLocaleString()} subtext="Messages in groups" />
          <StatCard title="Email Traffic" value={periodStats.interactionCounts.email.toLocaleString()} subtext="Emails exchanged" />
        </div>

        {renderHeatmap()}

        {/* Top Lists */}
        <div className={styles.statsListGrid} style={{ marginTop: '2rem' }}>
          <StatList title="Most Active Senders" items={periodStats.topSenders} />
          <StatList title="Most Active Receivers" items={periodStats.topReceivers} />
        </div>

        {/* GAMEPLAY METRICS */}
        <h4 style={{marginTop: '2.5rem', marginBottom: '1rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--dim)', paddingBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px'}}>Gameplay Mechanics</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <StatCard title="Top Purchased" value={extraStats.topPurchase.target} subtext={`${extraStats.topPurchase.count} dots acquired`} highlight />
          <StatCard title="Total Dice Rolls" value={extraStats.diceRolled.toLocaleString()} subtext="Rolls executed" />
          <StatCard title="Luckiest Character" value={extraStats.luckiestChar.name} subtext={`${extraStats.luckiestChar.ratio.toFixed(2)} Avg Successes`} />
          <StatCard title="Downtimes" value={extraStats.downtimesCount.toLocaleString()} subtext="Actions submitted" />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          <DiceStatCard 
            title="Best Roll" 
            value={extraStats.bestRoll.successes !== -1 ? extraStats.bestRoll.successes : 'N/A'} 
            subtext={`${extraStats.bestRoll.charName} (${extraStats.bestRoll.note})`} 
            rollData={extraStats.bestRoll.raw}
          />
          <DiceStatCard 
            title="Worst Roll" 
            value={extraStats.worstRoll.successes !== 99 ? (extraStats.worstRoll.bestial ? 'Bestial Failure' : extraStats.worstRoll.successes) : 'N/A'} 
            subtext={`${extraStats.worstRoll.charName} (${extraStats.worstRoll.note})`} 
            rollData={extraStats.worstRoll.raw}
          />
        </div>

      </div>
    </div>
  );
}