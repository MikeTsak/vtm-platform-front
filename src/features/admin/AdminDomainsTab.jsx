import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import { Skeleton } from 'boneyard-js/react';

export default function AdminDomainsTab() {
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState([]);
  const [problems, setProblems] = useState([]);
  const [err, setErr] = useState('');
  
  const [drawing, setDrawing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customDom, setCustomDom] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true); setErr('');
    try {
      const { data } = await api.get('/admin/domains-advanced');
      setDomains(data.domains || []);
      setProblems(data.problems || []);
    } catch (e) {
      setErr('Failed to load domains data');
    } finally {
      setLoading(false);
    }
  };

  const drawMonthly = async () => {
    if (!window.confirm('Draw 3 random domains to suffer problems? (Cannot be undone)')) return;
    setDrawing(true); setErr('');
    try {
      await api.post('/admin/domains/draw-problems');
      await loadData();
    } catch (e) {
      setErr('Failed to draw monthly problems');
    } finally {
      setDrawing(false);
    }
  };

  const addCustomProblem = async (e) => {
    e.preventDefault();
    if (!customDom || !customText) return;
    try {
      await api.post('/admin/domains/custom-problem', { domain_id: customDom, problem_text: customText });
      setCustomText(''); setCustomDom('');
      await loadData();
    } catch (e) {
      setErr('Failed to add custom problem');
    }
  };

  const resolveProblem = async (id) => {
    try {
      await api.patch(`/admin/domains/resolve-problem/${id}`);
      setProblems(prev => prev.map(p => p.id === id ? { ...p, resolved: 1 } : p));
    } catch (e) {
      setErr('Failed to resolve');
    }
  };

  return (
    <div className={styles.adminCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>🗺️ Domain Threats & Safety</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.85rem' }}>Track the safety ratings of all city domains. Messy criticals reduce safety automatically.</p>
        </div>
        <button onClick={drawMonthly} disabled={drawing} className={`${styles.btn} ${styles.btnPrimary}`} style={{ background: '#ff5252', boxShadow: '0 2px 10px rgba(255,82,82,0.3)' }}>
          {drawing ? 'Drawing...' : '🎲 Draw Monthly Problems (3)'}
        </button>
      </div>

      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* DOMAINS LIST */}
        <div style={{ background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>City Domains</h3>
          <Skeleton loading={loading} name="domain-list">
            <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Domain</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Safety (0-10)</th>
                </tr>
              </thead>
              <tbody>
                {domains.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{d.name}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: d.safety_rating <= 3 ? '#ff5252' : d.safety_rating <= 6 ? '#ffcc00' : '#00e676' }}>
                      {d.safety_rating}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Skeleton>
        </div>

        {/* ACTIVE PROBLEMS */}
        <div style={{ background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Current Problems</h3>
          
          <form onSubmit={addCustomProblem} style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
            <select className={styles.input} value={customDom} onChange={e => setCustomDom(e.target.value)} required>
              <option value="">-- Domain --</option>
              {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input type="text" className={styles.input} placeholder="Problem description" value={customText} onChange={e => setCustomText(e.target.value)} required style={{ flex: 1 }} />
            <button type="submit" className={`${styles.btn} ${styles.btnSecondary}`}>Add</button>
          </form>

          <Skeleton loading={loading} name="problem-list">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {problems.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No problems recorded.</div>}
              {problems.map(p => {
                const dName = domains.find(d => d.id === p.domain_id)?.name || 'Unknown';
                return (
                  <div key={p.id} style={{ padding: '1rem', background: p.resolved ? 'rgba(0,0,0,0.2)' : 'rgba(255,82,82,0.1)', borderLeft: `3px solid ${p.resolved ? 'var(--glass-border)' : '#ff5252'}`, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: p.resolved ? 'var(--text-muted)' : 'var(--text-primary)' }}>{dName}</div>
                        <div style={{ fontSize: '0.9rem', color: p.resolved ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{p.problem_text} {p.is_custom ? '(Custom)' : ''}</div>
                      </div>
                      {!p.resolved && (
                        <button className={styles.btnSmall} style={{ background: 'var(--glass-bg)' }} onClick={() => resolveProblem(p.id)}>Resolve</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Skeleton>
        </div>
      </div>
    </div>
  );
}
