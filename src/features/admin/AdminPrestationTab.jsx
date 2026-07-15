import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import { Skeleton } from 'boneyard-js/react';
import G6 from '@antv/g6';

export default function AdminPrestationTab() {
  const [loading, setLoading] = useState(true);
  const [boons, setBoons] = useState([]);
  const [err, setErr] = useState('');

  const containerRef = useRef(null);
  const graphRef = useRef(null);

  useEffect(() => {
    api.get('/admin/boons')
      .then(res => setBoons(res.data.boons || []))
      .catch(e => setErr('Failed to load boons'))
      .finally(() => setLoading(false));
  }, []);

  const ledger = useMemo(() => {
    const l = {};
    boons.forEach(b => {
      if (!l[b.to_name]) l[b.to_name] = { owedToMe: 0, IOwe: 0, majorOwed: 0 };
      if (!l[b.from_name]) l[b.from_name] = { owedToMe: 0, IOwe: 0, majorOwed: 0 };
      
      l[b.to_name].owedToMe += 1;
      l[b.from_name].IOwe += 1;
      
      if (b.level.toLowerCase().includes('major') || b.level.toLowerCase().includes('life') || b.level.toLowerCase().includes('blood')) {
        l[b.to_name].majorOwed += 1;
      }
    });
    return l;
  }, [boons]);

  const ranked = Object.keys(ledger).map(k => ({ name: k, ...ledger[k] })).sort((a, b) => b.owedToMe - a.owedToMe);

  useEffect(() => {
    if (!containerRef.current || boons.length === 0) return;

    if (graphRef.current) {
      graphRef.current.destroy();
    }

    const width = containerRef.current.scrollWidth || 800;
    const height = 600;

    const nodesMap = new Map();
    boons.forEach(b => {
      if (!nodesMap.has(b.from_name)) nodesMap.set(b.from_name, { id: b.from_name, label: b.from_name });
      if (!nodesMap.has(b.to_name)) nodesMap.set(b.to_name, { id: b.to_name, label: b.to_name });
    });

    const nodes = Array.from(nodesMap.values()).map(n => {
      const stats = ledger[n.id];
      const strokeColor = stats.owedToMe > stats.IOwe ? '#00e676' : (stats.IOwe > stats.owedToMe ? '#ff5252' : '#888');
      
      return {
        id: n.id,
        label: n.id,
        detail: `Owed to them: ${stats.owedToMe}<br/>They owe: ${stats.IOwe}`,
        size: 50 + Math.min(stats.owedToMe * 5, 50),
        style: { fill: '#111', stroke: strokeColor, lineWidth: 3 },
        labelCfg: { style: { fill: '#fff', fontSize: 14, fontWeight: 600 } }
      };
    });

    const edges = boons.map((b, idx) => ({
      id: `edge-${idx}`,
      source: b.from_name,
      target: b.to_name,
      label: b.level,
      detail: `Type: ${b.level}<br/>Details: ${b.description || 'None'}`,
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
        const title = isNode ? model.label : `${model.source} ➔ ${model.target}`;
        outDiv.innerHTML = `<strong>${title}</strong><br/>${model.detail || ''}`;
        return outDiv;
      }
    });

    const graph = new G6.Graph({
      container: containerRef.current,
      width,
      height,
      layout: {
        type: 'force',
        preventOverlap: true,
        linkDistance: 200,
        nodeStrength: -60,
        edgeStrength: 0.5,
      },
      defaultNode: {
        type: 'circle',
      },
      defaultEdge: {
        type: 'quadratic',
        style: {
          stroke: '#666',
          lineWidth: 2,
          endArrow: true,
        },
        labelCfg: {
          style: {
            fill: '#ffcc00',
            fontSize: 12,
            background: { fill: '#000', padding: [2, 4, 2, 4], radius: 2 }
          }
        }
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
  }, [boons, ledger]);

  return (
    <div className={styles.adminCard}>
      <h2 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '1.6rem', fontWeight: 800 }}>🤝 Prestation Matrix (G6 v4)</h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 2rem 0', fontSize: '0.85rem' }}>Interactive directed graph of city-wide debts. Arrows point from Debtor to Creditor.</p>

      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

      <Skeleton loading={loading} name="prestation-matrix">
        {boons.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No boons recorded in the city yet.
          </div>
        )}
        
        <div style={{ display: boons.length > 0 ? 'grid' : 'none', gridTemplateColumns: '1fr 3fr', gap: '2rem' }}>
          <div style={{ background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Power Brokers</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {ranked.map(r => (
                <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
                  <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                    <div style={{ color: '#00e676' }}>Owed: {r.owedToMe} {r.majorOwed > 0 && `(${r.majorOwed} Major+)`}</div>
                    <div style={{ color: '#ff5252' }}>Owes: {r.IOwe}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div 
            ref={containerRef} 
            style={{ 
              width: '100%', 
              height: '600px', 
              background: 'var(--glass-bg)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '8px',
              overflow: 'hidden'
            }} 
          />
        </div>
      </Skeleton>
    </div>
  );
}
