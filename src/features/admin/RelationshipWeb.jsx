import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from '../../styles/Admin.module.css';
import G6 from '@antv/g6';
import { CLAN_HEX as CLAN_COLORS } from '../../data/clans';

// Same shape as ChatStatsTab's exclusion rule: don't let removed characters clutter the graph.
const isExcludedChar = (c) => c && (c.is_deceased || c.is_hidden || c.is_missing || c.is_exiled || c.is_left || c.is_called);

export default function RelationshipWeb({
  directMessages = [],
  npcMessages = [],
  npcs = [],
  users = [],
  characters = [],
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();

  const [startDate, setStartDate] = useState(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);

  const containerRef = useRef(null);
  const graphRef = useRef(null);

  const userMap = useMemo(() => {
    const map = new Map();
    (users || []).forEach((u) => {
      const c = characters.find((char) => char.user_id === u.id);
      map.set(u.id, {
        name: u.char_name || u.display_name || u.email || `User ${u.id}`,
        clan: u.clan || null,
        excluded: isExcludedChar(c),
      });
    });
    return map;
  }, [users, characters]);

  const npcMap = useMemo(() => {
    const map = new Map();
    (npcs || []).forEach((n) => map.set(n.id, { name: n.name || `NPC ${n.id}` }));
    return map;
  }, [npcs]);

  const { nodes, edges, ranked } = useMemo(() => {
    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
    const end = endDate ? new Date(endDate) : new Date('2100-01-01');
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const a = start.getTime(), b = end.getTime();
    const inRange = (ts) => { if (!ts) return false; const t = new Date(ts).getTime(); return Number.isFinite(t) && t >= a && t <= b; };

    const resolve = (idStr) => {
      if (idStr.startsWith('NPC-')) {
        const info = npcMap.get(Number(idStr.slice(4)));
        return info ? { name: info.name, clan: null, isNpc: true } : null;
      }
      const info = userMap.get(Number(idStr));
      return info && !info.excluded ? { name: info.name, clan: info.clan, isNpc: false } : null;
    };

    const edgeCounts = new Map(); // "id ↔ id" -> count
    const volume = new Map();     // id -> total messages touching them

    const allMsgs = [
      ...(directMessages || []).filter((m) => inRange(m.created_at)),
      ...(npcMessages || []).filter((m) => inRange(m.created_at)),
    ];

    allMsgs.forEach((msg) => {
      const isNpc = !!msg.npc_id;
      const s = isNpc ? (msg.from_side === 'user' ? msg.user_id : `NPC-${msg.npc_id}`) : msg.sender_id;
      const r = isNpc ? (msg.from_side === 'npc' ? msg.user_id : `NPC-${msg.npc_id}`) : msg.recipient_id;
      if (!s || !r || s === r) return;
      const sKey = String(s), rKey = String(r);
      if (!resolve(sKey) || !resolve(rKey)) return;

      const pair = [sKey, rKey].sort().join(' ↔ ');
      edgeCounts.set(pair, (edgeCounts.get(pair) || 0) + 1);
      volume.set(sKey, (volume.get(sKey) || 0) + 1);
      volume.set(rKey, (volume.get(rKey) || 0) + 1);
    });

    const edgeList = Array.from(edgeCounts.entries()).map(([pair, count]) => {
      const [src, tgt] = pair.split(' ↔ ');
      return { source: src, target: tgt, count };
    });

    const nodeIds = new Set();
    edgeList.forEach((e) => { nodeIds.add(e.source); nodeIds.add(e.target); });

    const nodeList = Array.from(nodeIds).map((id) => {
      const info = resolve(id);
      return { id, name: info.name, clan: info.clan, isNpc: info.isNpc, volume: volume.get(id) || 0 };
    });

    const rankedList = [...nodeList].sort((x, y) => y.volume - x.volume).slice(0, 20);

    return { nodes: nodeList, edges: edgeList, ranked: rankedList };
  }, [directMessages, npcMessages, userMap, npcMap, startDate, endDate]);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) {
      if (graphRef.current) { graphRef.current.destroy(); graphRef.current = null; }
      return;
    }
    if (graphRef.current) graphRef.current.destroy();

    const width = containerRef.current.scrollWidth || 800;
    const height = containerRef.current.clientHeight || 600;
    const maxCount = Math.max(1, ...edges.map((e) => e.count));

    const g6Nodes = nodes.map((n) => ({
      id: n.id,
      label: n.name,
      detail: `${n.isNpc ? 'NPC' : (n.clan || 'Unknown Clan')}<br/>Messages exchanged: ${n.volume}`,
      size: n.isNpc ? 40 : 36 + Math.min(n.volume * 2, 40),
      style: { fill: '#111', stroke: n.isNpc ? '#d4af37' : (CLAN_COLORS[n.clan] || '#888'), lineWidth: n.isNpc ? 4 : 3 },
      labelCfg: { style: { fill: '#fff', fontSize: 12, fontWeight: 600 } },
    }));

    const g6Edges = edges.map((e, idx) => ({
      id: `edge-${idx}`,
      source: e.source,
      target: e.target,
      detail: `${e.count} messages exchanged`,
      style: { lineWidth: 1 + (e.count / maxCount) * 6, strokeOpacity: 0.3 + 0.5 * (e.count / maxCount) },
    }));

    const tooltip = new G6.Tooltip({
      offsetX: 10,
      offsetY: 10,
      itemTypes: ['node', 'edge'],
      getContent: (e) => {
        const outDiv = document.createElement('div');
        outDiv.style.padding = '8px';
        outDiv.style.background = 'rgba(0,0,0,0.9)';
        outDiv.style.color = '#fff';
        outDiv.style.borderRadius = '4px';
        outDiv.style.border = '1px solid #444';
        const model = e.item.getModel();
        const isNode = e.item.getType() === 'node';
        const title = isNode ? model.label : `${model.source} ↔ ${model.target}`;
        outDiv.innerHTML = `<strong>${title}</strong><br/>${model.detail || ''}`;
        return outDiv;
      },
    });

    const graph = new G6.Graph({
      container: containerRef.current,
      width,
      height,
      layout: {
        type: 'force',
        preventOverlap: true,
        linkDistance: 160,
        nodeStrength: -80,
        edgeStrength: 0.3,
      },
      defaultNode: { type: 'circle' },
      defaultEdge: {
        type: 'line',
        style: { stroke: '#8a0303', endArrow: false },
      },
      modes: { default: ['drag-canvas', 'zoom-canvas', 'drag-node'] },
      plugins: [tooltip],
    });

    graph.data({ nodes: g6Nodes, edges: g6Edges });
    graph.render();
    graphRef.current = graph;

    const handleResize = () => {
      if (!graph || graph.get('destroyed') || !containerRef.current) return;
      graph.changeSize(containerRef.current.scrollWidth, containerRef.current.clientHeight || 600);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (graphRef.current) { graphRef.current.destroy(); graphRef.current = null; }
    };
  }, [nodes, edges]);

  return (
    <div>
      <div className={styles.dateFilters} style={{ marginBottom: '1.5rem' }}>
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

      {nodes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No messages exchanged in this period.
        </div>
      )}

      <div className={styles.rGraphLayout} style={{ display: nodes.length > 0 ? 'grid' : 'none' }}>
        <div className={styles.rGraphSide} style={{ background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Most Connected</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
            {ranked.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.volume} msgs</div>
              </div>
            ))}
          </div>
        </div>

        <div
          ref={containerRef}
          className={styles.rGraphCanvas}
          style={{
            width: '100%',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        />
      </div>
    </div>
  );
}
