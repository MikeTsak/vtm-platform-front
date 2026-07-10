import React, { useState, useEffect, useRef } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import { Skeleton } from 'boneyard-js/react';
import G6 from '@antv/g6';

export default function AdminBloodWebTab() {
  const [loading, setLoading] = useState(true);
  const [web, setWeb] = useState([]);
  
  const containerRef = useRef(null);
  const graphRef = useRef(null);

  useEffect(() => {
    api.get('/admin/blood-web')
      .then(res => setWeb(res.data.web || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const total = web.length;
  const avgHunger = total > 0 ? (web.reduce((sum, c) => sum + c.hunger, 0) / total).toFixed(1) : 0;
  const highHunger = web.filter(c => c.hunger >= 4).length;

  useEffect(() => {
    if (!containerRef.current || web.length === 0) return;

    if (graphRef.current) {
      graphRef.current.destroy();
    }

    const width = containerRef.current.scrollWidth || 800;
    const height = 600;

    const nodes = [];
    const edges = [];

    // Central Node
    nodes.push({
      id: 'center',
      label: 'The City',
      detail: `Active Kindred: ${total}`,
      size: 80,
      style: { fill: '#1e1e1e', stroke: '#888' },
      labelCfg: { style: { fill: '#fff', fontSize: 16, fontWeight: 800 } }
    });

    const getHungerColor = (hunger) => {
      if (hunger === 0) return '#00e676';
      if (hunger === 1) return '#aeea00';
      if (hunger === 2) return '#ffcc00';
      if (hunger === 3) return '#ff9800';
      if (hunger === 4) return '#ff5252';
      return '#d50000'; // Hunger 5
    };

    web.forEach(c => {
      const size = Math.max(30, (c.bloodPotency || 0) * 15 + 30);
      const color = getHungerColor(c.hunger);
      
      nodes.push({
        id: `char-${c.id}`,
        label: c.name,
        detail: `Player: ${c.player}<br/>Blood Potency: ${c.bloodPotency || 0}<br/>Hunger: ${c.hunger || 0}`,
        size,
        style: { fill: '#111', stroke: color, lineWidth: 4 },
        labelCfg: { style: { fill: '#fff', fontWeight: 600 } }
      });

      edges.push({
        source: 'center',
        target: `char-${c.id}`,
      });
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
        const model = e.item.getModel();
        outDiv.innerHTML = `<strong>${model.label}</strong><br/>${model.detail || ''}`;
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
        linkDistance: 150,
        nodeStrength: -50,
        edgeStrength: 0.8,
      },
      defaultNode: {
        type: 'circle',
      },
      defaultEdge: {
        type: 'line',
        style: { stroke: '#333', lineWidth: 1 },
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
  }, [web, total]);

  return (
    <div className={styles.adminCard}>
      <h2 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '1.6rem', fontWeight: 800 }}>🩸 The Blood Web (G6 v4)</h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 2rem 0', fontSize: '0.85rem' }}>Interactive city-wide hunger and blood potency radar.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)' }}>{total}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Active Kindred</div>
        </div>
        <div style={{ background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: avgHunger > 3 ? '#ffcc00' : 'var(--text-primary)' }}>{avgHunger}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Avg Hunger</div>
        </div>
        <div style={{ background: highHunger > total * 0.2 ? 'rgba(255,82,82,0.1)' : 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: highHunger > total * 0.2 ? '1px solid rgba(255,82,82,0.3)' : 'none' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: highHunger > 0 ? '#ff5252' : 'var(--text-primary)' }}>{highHunger}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Critical Hunger (4+)</div>
        </div>
      </div>

      <Skeleton loading={loading} name="admin-bloodweb">
        {web.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No kindred in the city.
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
            display: web.length > 0 ? 'block' : 'none',
            overflow: 'hidden'
          }} 
        />
      </Skeleton>
    </div>
  );
}
