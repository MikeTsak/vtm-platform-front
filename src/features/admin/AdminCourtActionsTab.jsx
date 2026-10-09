import React, { useState, useEffect } from 'react';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/Admin.module.css';
import FaGlyph from '../../ui/FaGlyph';
import Loading from '../../ui/Loading';
import { formatEuDate } from '../../utils/dateFormatter';

export default function AdminCourtActionsTab() {
  const [hunts, setHunts] = useState([]);
  const [wanted, setWanted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [huntRes, wantRes] = await Promise.all([
        api.get('/admin/blood-hunts'),
        api.get('/admin/wanted')
      ]);
      setHunts(huntRes.data.hunts || []);
      setWanted(wantRes.data.wanted || []);
    } catch (e) {
      setErr('Failed to load court actions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const resendHunt = async (hunt) => {
    if (!window.confirm(`Resend the Blood Hunt on ${hunt.target_name} to Discord?`)) return;
    try {
      await api.post(`/court-actions/blood-hunts/${hunt.id}/resend`);
      setMsg(`Resent Blood Hunt for ${hunt.target_name}`);
      setTimeout(() => setMsg(''), 4000);
    } catch (e) {
      setErr(formatApiError(e, 'Could not resend Blood Hunt.'));
    }
  };

  const resendWanted = async (w) => {
    if (!window.confirm(`Resend the Wanted notice for ${w.target_name} to Discord?`)) return;
    try {
      await api.post(`/court-actions/wanted/${w.id}/resend`);
      setMsg(`Resent Wanted notice for ${w.target_name}`);
      setTimeout(() => setMsg(''), 4000);
    } catch (e) {
      setErr(formatApiError(e, 'Could not resend Wanted notice.'));
    }
  };

  if (loading) return <Loading />;

  return (
    <div className={styles.adminCard}>
      <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FaGlyph name="fa-gavel" /> Court Actions Overview
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        View all Blood Hunts and Wanted notices. You can manually re-trigger Discord announcements for active ones.
      </p>
      
      {msg && <div className={`${styles.alert} ${styles.alertInfo}`} style={{ marginBottom: '1rem' }}>{msg}</div>}
      {err && <div className={`${styles.alert} ${styles.alertError}`} style={{ marginBottom: '1rem' }}>{err}</div>}

      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Blood Hunts</h3>
      {hunts.length === 0 ? <p>No Blood Hunts found.</p> : (
        <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
          <table className={styles.table} style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Target</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Reason</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Proposed By</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Created</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hunts.map(h => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.5rem' }}><strong>{h.target_name}</strong></td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{ 
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600,
                      backgroundColor: h.status === 'active' ? 'rgba(255, 82, 82, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: h.status === 'active' ? '#ff5252' : '#ccc'
                    }}>
                      {h.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>{h.reason.slice(0, 50)}{h.reason.length > 50 ? '...' : ''}</td>
                  <td style={{ padding: '0.5rem' }}>{h.proposed_by_name} ({h.proposed_office})</td>
                  <td style={{ padding: '0.5rem' }}>{formatEuDate(h.created_at)}</td>
                  <td style={{ padding: '0.5rem' }}>
                    {h.status === 'active' && (
                      <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => resendHunt(h)}>
                        Resend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Wanted Board</h3>
      {wanted.length === 0 ? <p>No Wanted notices found.</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table} style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Target</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Reason</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Posted By</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Created</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {wanted.map(w => (
                <tr key={w.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.5rem' }}><strong>{w.target_name}</strong></td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{ 
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600,
                      backgroundColor: !w.closed_at ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: !w.closed_at ? '#ff9800' : '#ccc'
                    }}>
                      {!w.closed_at ? 'ACTIVE' : 'CLOSED'}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>{w.reason.slice(0, 50)}{w.reason.length > 50 ? '...' : ''}</td>
                  <td style={{ padding: '0.5rem' }}>{w.posted_by_name} ({w.posted_office})</td>
                  <td style={{ padding: '0.5rem' }}>{formatEuDate(w.created_at)}</td>
                  <td style={{ padding: '0.5rem' }}>
                    {!w.closed_at && (
                      <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => resendWanted(w)}>
                        Resend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
