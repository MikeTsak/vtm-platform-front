import React, { useState, useEffect, useRef } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import { Skeleton } from 'boneyard-js/react';
import G6 from '@antv/g6';

export default function AdminCoteriesTab() {
  const [loading, setLoading] = useState(true);
  const [coteries, setCoteries] = useState([]);
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState('');

  const containerRef = useRef(null);
  const graphRef = useRef(null);

  useEffect(() => {
    api.get('/admin/coteries')
      .then(res => {
        setCoteries(res.data.coteries || []);
        setMembers(res.data.members || []);
      })
      .catch(e => setErr('Failed to load coteries'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!containerRef.current || coteries.length === 0) return;

    if (graphRef.current) {
      graphRef.current.destroy();
    }

    const width = containerRef.current.scrollWidth || 800;
    const height = 600;

    const nodes = [];
    const edges = [];

    // Map Coteries as large hub nodes
    coteries.forEach(c => {
      nodes.push({
        id: `coterie-${c.id}`,
        label: c.name,
        detail: `Type: ${c.type || 'Standard'}<br/>Chasse: ${c.chasse || 0}<br/>Lien: ${c.lien || 0}<br/>Portillon: ${c.portillon || 0}`,
        size: [120, 50],
        type: 'rect',
        style: { fill: '#311b92', stroke: '#7e57c2', radius: 8, lineWidth: 3 },
        labelCfg: { style: { fill: '#fff', fontSize: 16, fontWeight: 800 } }
      });
    });

    // Map Members as smaller nodes connected to their coterie
    members.forEach(m => {
      const nodeId = `char-${m.user_id}-${m.coterie_id}`;
      nodes.push({
        id: nodeId,
        label: m.char_name || 'Unknown',
        detail: `Role: ${m.is_leader ? 'Leader' : 'Member'}`,
        size: 40,
        type: 'circle',
        style: { fill: '#1e1e1e', stroke: '#4da6ff', lineWidth: 2 },
        labelCfg: { style: { fill: '#fff', fontWeight: 600 } }
      });

      edges.push({
        source: `coterie-${m.coterie_id}`,
        target: nodeId,
        style: {
          stroke: m.is_leader ? '#ffcc00' : '#4da6ff',
          lineWidth: m.is_leader ? 4 : 2,
        },
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
        linkDistance: 120,
        nodeStrength: -50,
        edgeStrength: 0.8,
        collideStrength: 1,
      },
      defaultNode: {
        type: 'circle',
      },
      defaultEdge: {
        type: 'line',
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
  }, [coteries, members]);

  return (
    <div className={styles.adminCard}>
      <h2 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '1.6rem', fontWeight: 800 }}>🐺 Coterie Network (G6 v4)</h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 2rem 0', fontSize: '0.85rem' }}>Visual representation of city coteries and their members.</p>

      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

      <Skeleton loading={loading} name="coteries-network">
        {coteries.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No coteries exist in the city.
          </div>
        )}

        <div style={{ display: coteries.length > 0 ? 'grid' : 'none', gridTemplateColumns: '1fr 3fr', gap: '2rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {coteries.map(c => {
              return (
                <div key={c.id} style={{ background: 'var(--glass-inset)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
                  <h3 style={{ margin: '0 0 4px 0', color: 'var(--accent-purple)' }}>{c.name}</h3>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                    {c.type || 'Standard'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Chasse: {c.chasse || 0}</span>
                    <span>Lien: {c.lien || 0}</span>
                    <span>Port: {c.portillon || 0}</span>
                  </div>
                </div>
              );
            })}
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
