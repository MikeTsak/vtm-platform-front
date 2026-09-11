// src/features/admin/AdminFeedingTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../core/api';
import FaGlyph from '../../ui/FaGlyph';
import { FEEDING_ICONS } from '../../data/feedingIcons';

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target) return 'calculating…';
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return 'due';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${days}d ${hours}h ${mins}m`;
}

const buttonStyle = {
  background: 'var(--glass-inset)',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-md)',
  padding: '0.65rem 1.1rem',
  color: 'var(--text-color)',
  cursor: 'pointer',
  fontWeight: 600,
};

const TIER_LABEL = {
  bestial_failure: 'Bestial Failure',
  failure: 'Failure',
  success: 'Success',
  critical: 'Critical',
  messy_critical: 'Messy Critical',
};
const TIER_COLOR = {
  bestial_failure: '#ff6b6b',
  failure: '#ff8a8a',
  success: 'var(--color-success)',
  critical: 'var(--color-success)',
  messy_critical: '#ffb347',
};
const TIER_ICON = {
  bestial_failure: FEEDING_ICONS.skull,
  failure: FEEDING_ICONS.triangleExclamation,
  success: FEEDING_ICONS.circleCheck,
  critical: FEEDING_ICONS.circleCheck,
  messy_critical: FEEDING_ICONS.triangleExclamation,
};

export default function AdminFeedingTab() {
  const [status, setStatus] = useState(null);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, logRes] = await Promise.all([
        api.get('/feeding/status'),
        api.get('/admin/feeding/log'),
      ]);
      setStatus(statusRes.data);
      setLog(logRes.data?.log || []);
    } catch (e) {
      setErr('Failed to load feeding data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const countdown = useCountdown(status?.cycleEnd);
  const isOnline = status?.enabled === true;

  const flash = (setter, text) => { setter(text); setTimeout(() => setter(''), 3000); };

  const toggleEnabled = async () => {
    if (actionLoading) return;
    setActionLoading(true); setMsg(''); setErr('');
    try {
      await api.post('/admin/feeding/status', { enabled: !isOnline });
      await load();
      flash(setMsg, `Feeding system is now ${!isOnline ? 'ENABLED' : 'DISABLED'}.`);
    } catch (e) { flash(setErr, 'Failed to update Feeding status.'); }
    finally { setActionLoading(false); }
  };

  const forceNewCycle = async () => {
    if (actionLoading) return;
    if (!window.confirm('End the current Feeding cycle immediately and start a new one? Anyone mid-roll keeps their pending result. Only the cycle window resets.')) return;
    setActionLoading(true); setMsg(''); setErr('');
    try {
      await api.post('/admin/feeding/force-new-cycle');
      await load();
      flash(setMsg, 'New Feeding cycle started.');
    } catch (e) { flash(setErr, 'Failed to reset the cycle.'); }
    finally { setActionLoading(false); }
  };

  const runDecay = async () => {
    if (actionLoading) return;
    setActionLoading(true); setMsg(''); setErr('');
    try {
      const res = await api.post('/admin/feeding/run-decay');
      flash(setMsg, res.data?.skipped ? `Decay skipped: ${res.data.skipped}` : `Decay applied to ${res.data?.decayed ?? 0} division(s).`);
    } catch (e) { flash(setErr, 'Failed to run decay.'); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading Feeding Control…</div>;

  const themeColor = isOnline ? 'var(--color-success)' : 'var(--color-error)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {msg && <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-success)' }}>{msg}</div>}
      {err && <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-error)' }}>{err}</div>}

      {/* KILLSWITCH */}
      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--glass-shadow)' }}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaGlyph icon={FEEDING_ICONS.droplet} size={20} /> Feeding System
          </h4>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>The required hunting roll gating downtime submission, on a fixed 3-week automated cycle.</p>
        </div>

        <div
          onClick={toggleEnabled}
          style={{ background: 'var(--glass-inset)', border: `2px solid ${themeColor}`, borderRadius: 'var(--radius-md)', padding: '1.5rem', cursor: actionLoading ? 'wait' : 'pointer', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: actionLoading ? 0.7 : 1 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: themeColor, boxShadow: `0 0 15px ${themeColor}` }} />
              <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-color)' }}>Feeding Gate</h3>
            </div>
            <div style={{ position: 'relative', width: '60px', height: '32px', background: isOnline ? 'var(--color-success)' : 'var(--glass-border)', borderRadius: '32px', transition: 'background 0.3s ease' }}>
              <div style={{ position: 'absolute', top: '4px', left: isOnline ? '32px' : '4px', width: '24px', height: '24px', background: 'var(--text-color)', borderRadius: '50%', transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
            </div>
          </div>
          <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.5' }}>
            {isOnline
              ? 'Players must feed before submitting downtime actions each cycle. Click to disable (downtimes work as before, no gate).'
              : 'The gate is disabled. Downtimes submit exactly as before the Feeding system existed. Click to enable.'}
          </p>
        </div>
      </div>

      {/* CYCLE INFO */}
      {isOnline && (
        <div style={{ background: 'var(--glass-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', color: 'var(--text-color)' }}>Current Cycle</h4>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div><div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Cycle #</div><div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{status.cycleIndex}</div></div>
            <div><div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Ends in</div><div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{countdown}</div></div>
            <div><div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Window</div><div style={{ fontSize: '0.9rem' }}>{new Date(status.cycleStart).toLocaleDateString()} – {new Date(status.cycleEnd).toLocaleDateString()}</div></div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={forceNewCycle} disabled={actionLoading} style={buttonStyle}>
              <FaGlyph icon={FEEDING_ICONS.clock} size={13} style={{ marginRight: '0.4rem', verticalAlign: '-2px' }} />
              Force New Cycle Now
            </button>
            <button onClick={runDecay} disabled={actionLoading} style={buttonStyle}>
              <FaGlyph icon={FEEDING_ICONS.shieldHalved} size={13} style={{ marginRight: '0.4rem', verticalAlign: '-2px' }} />
              Run Decay Now
            </button>
          </div>
        </div>
      )}

      {/* RECENT LOG */}
      <div style={{ background: 'var(--glass-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem' }}>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', color: 'var(--text-color)' }}>Recent Feedings</h4>
        {log.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No feeding rolls yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '0.5rem' }}>Character</th>
                  <th style={{ padding: '0.5rem' }}>Division</th>
                  <th style={{ padding: '0.5rem' }}>Outcome</th>
                  <th style={{ padding: '0.5rem' }}>Hunger Δ</th>
                  <th style={{ padding: '0.5rem' }}>Safety Δ</th>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                  <th style={{ padding: '0.5rem' }}>When</th>
                </tr>
              </thead>
              <tbody>
                {log.map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '0.5rem' }}>{f.character_name}</td>
                    <td style={{ padding: '0.5rem' }}>{f.division}</td>
                    <td style={{ padding: '0.5rem', color: TIER_COLOR[f.outcome], display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FaGlyph icon={TIER_ICON[f.outcome]} size={12} />
                      {TIER_LABEL[f.outcome] || f.outcome}
                    </td>
                    <td style={{ padding: '0.5rem' }}>{f.hunger_delta ?? 'pending'}</td>
                    <td style={{ padding: '0.5rem' }}>{f.safety_delta ?? 'pending'}</td>
                    <td style={{ padding: '0.5rem' }}>{f.status}</td>
                    <td style={{ padding: '0.5rem' }}>{new Date(f.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
