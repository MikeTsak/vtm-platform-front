import React, { useState, useMemo, useEffect, useRef } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import { Skeleton } from 'boneyard-js/react';
import G6 from '@antv/g6';

export default function AdminTimelineTab({ users }) {
  const [charId, setCharId] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [timeline, setTimeline] = useState([]);
  
  // Filters
  const [showXP, setShowXP] = useState(true);
  const [showRolls, setShowRolls] = useState(true);
  const [showBoons, setShowBoons] = useState(true);
  const [showDowntimes, setShowDowntimes] = useState(true);

  const containerRef = useRef(null);
  const graphRef = useRef(null);

  const allChars = useMemo(() => {
    if (!users) return [];
    const chars = [];
    users.forEach(u => {
      if (u.character_id) {
        chars.push({ id: u.character_id, name: u.char_name, player_name: u.display_name });
      }
    });
    return chars.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [users]);

  const fetchTimeline = async (id) => {
    if (!id) {
      setTimeline([]);
      return;
    }
    setLoading(true); setErr('');
    try {
      const { data } = await api.get(`/admin/timeline/${id}`);
      setTimeline(data.timeline || []);
    } catch (e) {
      setErr('Failed to fetch timeline.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTimeline = useMemo(() => {
    return timeline.filter(item => {
      if (item.type === 'xp' && !showXP) return false;
      if (item.type === 'dice' && !showRolls) return false;
      if (item.type === 'boon' && !showBoons) return false;
      if (item.type === 'downtime' && !showDowntimes) return false;
      return true;
    });
  }, [timeline, showXP, showRolls, showBoons, showDowntimes]);

  useEffect(() => {
    if (!containerRef.current || filteredTimeline.length === 0) return;

    if (graphRef.current) {
      graphRef.current.destroy();
    }

    const width = containerRef.current.scrollWidth || 800;
    const height = 600; 

    const nodes = [];
    const edges = [];
    const sorted = [...filteredTimeline].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let prevId = null;

    sorted.forEach((item, idx) => {
      let color = '#fff';
      let title = '';
      let tooltipText = '';

      if (item.type === 'xp') {
        color = item.delta > 0 ? '#00e676' : '#ff5252';
        title = `XP ${item.delta > 0 ? '+' : ''}${item.delta}`;
        tooltipText = item.reason;
      } else if (item.type === 'dice') {
        color = '#4da6ff';
        title = `Rolled ${item.pool} (${item.successes} successes)`;
        tooltipText = item.note || `Hunger: ${item.hunger}, Sides: ${item.sides}`;
      } else if (item.type === 'boon') {
        color = item.is_debtor ? '#ff5252' : '#00e676';
        title = item.is_debtor ? `Owes ${item.boon_type}` : `Owed ${item.boon_type}`;
        tooltipText = item.details;
      } else if (item.type === 'downtime') {
        color = '#b388ff';
        title = `Downtime: ${item.title}`;
        tooltipText = `Status: ${item.status}`;
      } else if (item.type === 'creation') {
        color = '#ff8a65';
        title = item.title;
        tooltipText = item.body;
      }

      const dateStr = new Date(item.timestamp).toLocaleDateString();
      const nodeId = `node-${item.type}-${item.id}-${idx}`;

      nodes.push({
        id: nodeId,
        label: `${title}\n${dateStr}`,
        tooltip: tooltipText,
        style: {
          stroke: color,
        }
      });

      if (prevId) {
        edges.push({
          source: prevId,
          target: nodeId,
        });
      }
      prevId = nodeId;
    });

    const tooltip = new G6.Tooltip({
      offsetX: 10,
      offsetY: 10,
      itemTypes: ['node'],
      getContent: (e) => {
        const outDiv = document.createElement('div');
        outDiv.style.padding = '8px';
        outDiv.style.background = 'rgba(0,0,0,0.9)';
        outDiv.style.color = '#fff';
        outDiv.style.borderRadius = '4px';
        outDiv.style.border = '1px solid #444';
        outDiv.innerHTML = `<strong>Detail:</strong><br/>${e.item.getModel().tooltip || 'No detail'}`;
        return outDiv;
      }
    });

    const graph = new G6.Graph({
      container: containerRef.current,
      width,
      height,
      layout: {
        type: 'dagre',
        rankdir: 'TB',
        nodesep: 50,
        ranksep: 70,
      },
      defaultNode: {
        type: 'rect',
        size: [280, 60],
        style: {
          fill: '#1e1e1e',
          lineWidth: 2,
          radius: 8,
        },
        labelCfg: {
          style: {
            fill: '#fff',
            fontSize: 14,
            fontWeight: 500,
          }
        }
      },
      defaultEdge: {
        type: 'polyline',
        style: {
          stroke: '#888',
          lineWidth: 2,
          endArrow: true
        },
      },
      modes: {
        default: ['drag-canvas', 'zoom-canvas', 'drag-node'],
      },
      plugins: [tooltip],
    });

    graph.data({ nodes, edges });
    graph.render();
    graphRef.current = graph;

    const handleResize = () => {
      if (!graph || graph.get('destroyed')) return;
      if (!containerRef.current) return;
      graph.changeSize(containerRef.current.scrollWidth, 600);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (graphRef.current) {
        graphRef.current.destroy();
        graphRef.current = null;
      }
    };
  }, [filteredTimeline]);

  return (
    <div className={styles.adminCard}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>⏳ Character Timeline (G6 v4)</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.85rem' }}>Interactive relational graph mapping character history.</p>
      </div>

      <div style={{ marginBottom: '2rem', background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className={styles.labeledInput} style={{ flex: 1, minWidth: '250px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Select Character</span>
            <select className={styles.input} value={charId} onChange={e => { setCharId(e.target.value); fetchTimeline(e.target.value); }}>
              <option value="">-- Choose Character --</option>
              {allChars.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.player_name})</option>
              ))}
            </select>
          </label>
          
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', paddingBottom: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 }}>
              <input type="checkbox" checked={showXP} onChange={e => setShowXP(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
              ⭐ XP
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 }}>
              <input type="checkbox" checked={showRolls} onChange={e => setShowRolls(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
              🎲 Rolls
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 }}>
              <input type="checkbox" checked={showBoons} onChange={e => setShowBoons(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
              🤝 Boons
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 }}>
              <input type="checkbox" checked={showDowntimes} onChange={e => setShowDowntimes(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
              🌙 Downtimes
            </label>
          </div>
        </div>
      </div>

      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

      <Skeleton loading={loading} name="admin-timeline">
        {charId && filteredTimeline.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No history recorded matching these filters.
          </div>
        )}

        <div 
          ref={containerRef} 
          style={{ 
            width: '100%', 
            height: '600px', 
            background: 'var(--glass-bg)', 
            border: '1px solid var(--glass-border)', 
            borderRadius: '8px',
            display: (charId && filteredTimeline.length > 0) ? 'block' : 'none'
          }} 
        />
      </Skeleton>
    </div>
  );
}
