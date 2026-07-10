import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import { Skeleton } from 'boneyard-js/react';

export default function AdminAuditTab() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/admin/audit-logs')
      .then(res => setLogs(res.data.logs || []))
      .catch(e => setErr('Failed to fetch audit logs'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.adminCard}>
      <h2 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '1.6rem', fontWeight: 800 }}>📜 ST Audit Logs</h2>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 2rem 0', fontSize: '0.85rem' }}>Watching the watchers. Read-only log of critical system changes and ST actions.</p>

      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

      <Skeleton loading={loading} name="audit-logs">
        <div style={{ background: 'var(--glass-inset)', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
          <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '2px solid var(--glass-border)' }}>
                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-secondary)' }}>Timestamp</th>
                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-secondary)' }}>Admin</th>
                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-secondary)' }}>Action</th>
                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-secondary)' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No audit logs found.</td>
                </tr>
              )}
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>
                    {log.admin_id === 0 ? <span style={{ color: '#ff5252' }}>SYSTEM</span> : (log.admin_name || `Admin #${log.admin_id}`)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Skeleton>
    </div>
  );
}
