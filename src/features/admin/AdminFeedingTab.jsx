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
  if (!target) return 'calculating...';
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return 'due';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${days}d ${hours}h ${mins}m`;
}

const card = {
  background: 'var(--glass-bg)',
  backdropFilter: 'var(--glass-blur)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--glass-border)',
  padding: '2rem',
  boxShadow: 'var(--glass-shadow)',
};

const btnBase = {
  background: 'var(--glass-inset)',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-md)',
  padding: '0.6rem 1rem',
  color: 'var(--text-color)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.85rem',
};

const TIER_LABEL = {
  bestial_failure: 'Bestial Failure',
  failure:         'Failure',
  success:         'Success',
  critical:        'Critical',
  messy_critical:  'Messy Critical',
  herd:            'Herd Fed',
};
const TIER_COLOR = {
  bestial_failure: '#ff6b6b',
  failure:         '#ff8a8a',
  success:         'var(--color-success)',
  critical:        'var(--color-success)',
  messy_critical:  '#ffb347',
  herd:            '#7ecfff',
};
const TIER_ICON = {
  bestial_failure: FEEDING_ICONS.skull,
  failure:         FEEDING_ICONS.triangleExclamation,
  success:         FEEDING_ICONS.circleCheck,
  critical:        FEEDING_ICONS.circleCheck,
  messy_critical:  FEEDING_ICONS.triangleExclamation,
  herd:            FEEDING_ICONS.droplet,
};

function HerdDots({ current, max }) {
  return (
    <span style={{ letterSpacing: 2, fontSize: '1rem' }}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < current ? '#7ecfff' : 'var(--glass-border)' }}>{'\u25cf'}</span>
      ))}
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: 6 }}>{current}/{max}</span>
    </span>
  );
}

export default function AdminFeedingTab() {
  const [status,   setStatus]   = useState(null);
  const [log,      setLog]      = useState([]);
  const [stats,    setStats]    = useState(null);
  const [roster,   setRoster]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adjusting, setAdjusting] = useState({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, logRes, statsRes, rosterRes] = await Promise.all([
        api.get('/feeding/status'),
        api.get('/admin/feeding/log'),
        api.get('/admin/feeding/stats'),
        api.get('/admin/feeding/herd-roster'),
      ]);
      setStatus(statusRes.data);
      setLog(logRes.data?.log || []);
      setStats(statsRes.data);
      setRoster(rosterRes.data?.roster || []);
    } catch {
      setErr('Failed to load feeding data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const countdown = useCountdown(status?.cycleEnd);
  const isOnline  = status?.enabled === true;
  const flash = (setter, text) => { setter(text); setTimeout(() => setter(''), 3500); };

  const toggleEnabled = async () => {
    if (actionLoading) return;
    setActionLoading(true); setMsg(''); setErr('');
    try {
      await api.post('/admin/feeding/status', { enabled: !isOnline });
      await load();
      flash(setMsg, `Feeding system is now ${!isOnline ? 'ENABLED' : 'DISABLED'}.`);
    } catch { flash(setErr, 'Failed to update Feeding status.'); }
    finally { setActionLoading(false); }
  };

  const forceNewCycle = async () => {
    if (actionLoading) return;
    if (!window.confirm('End the current Feeding cycle immediately and start a new one?')) return;
    setActionLoading(true); setMsg(''); setErr('');
    try {
      await api.post('/admin/feeding/force-new-cycle');
      await load();
      flash(setMsg, 'New Feeding cycle started.');
    } catch { flash(setErr, 'Failed to reset the cycle.'); }
    finally { setActionLoading(false); }
  };

  const runDecay = async () => {
    if (actionLoading) return;
    setActionLoading(true); setMsg(''); setErr('');
    try {
      const res = await api.post('/admin/feeding/run-decay');
      flash(setMsg, res.data?.skipped
        ? `Decay skipped: ${res.data.skipped}`
        : `Decay: ${res.data?.decayed ?? 0} division(s). Herd regen: ${res.data?.herdRegen ?? 0} character(s).`);
      await load();
    } catch { flash(setErr, 'Failed to run decay.'); }
    finally { setActionLoading(false); }
  };

  const adjustHerd = async (character_id, delta) => {
    setAdjusting(prev => ({ ...prev, [character_id]: true }));
    try {
      const res = await api.post('/admin/feeding/herd-adjust', { character_id, delta });
      const d = res.data;
      flash(setMsg, `${d.name}: Herd ${d.herdBefore} -> ${d.herdAfter} / ${d.herdDots}`);
      setRoster(prev => prev.map(r =>
        r.character_id === character_id ? { ...r, herdCurrent: d.herdAfter } : r
      ));
    } catch (e) {
      flash(setErr, e?.response?.data?.error || 'Herd adjust failed.');
    } finally {
      setAdjusting(prev => ({ ...prev, [character_id]: false }));
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading Feeding Control...</div>;

  const themeColor = isOnline ? 'var(--color-success)' : 'var(--color-error)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {msg && <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-success)' }}>{msg}</div>}
      {err && <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-error)' }}>{err}</div>}

      {/* KILLSWITCH */}
      <div style={card}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: themeColor, boxShadow: `0 0 15px ${themeColor}` }} />
              <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-color)' }}>Feeding Gate</h3>
            </div>
            <div style={{ position: 'relative', width: 60, height: 32, background: isOnline ? 'var(--color-success)' : 'var(--glass-border)', borderRadius: 32, transition: 'background 0.3s ease' }}>
              <div style={{ position: 'absolute', top: 4, left: isOnline ? 32 : 4, width: 24, height: 24, background: 'var(--text-color)', borderRadius: '50%', transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
            </div>
          </div>
          <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {isOnline
              ? 'Players must feed before submitting downtime actions each cycle. Click to disable.'
              : 'The gate is disabled. Downtimes submit as before. Click to enable.'}
          </p>
        </div>
      </div>

      {/* CYCLE + STATS */}
      {isOnline && (
        <div style={card}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', color: 'var(--text-color)' }}>Current Cycle #{status.cycleIndex}</h4>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div><div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Ends in</div><div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{countdown}</div></div>
            <div><div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Window</div><div style={{ fontSize: '0.9rem' }}>{new Date(status.cycleStart).toLocaleDateString()} - {new Date(status.cycleEnd).toLocaleDateString()}</div></div>
            {stats && <>
              <div><div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Total Feeds</div><div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.counts.total}</div></div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Success Rate</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: stats.successPct >= 70 ? 'var(--color-success)' : stats.successPct >= 40 ? '#ffb347' : '#ff6b6b' }}>
                  {stats.successPct !== null ? `${stats.successPct}%` : '-'}
                </div>
              </div>
              <div><div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Fed OK</div><div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-success)' }}>{stats.counts.success}</div></div>
              <div><div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Failed</div><div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ff6b6b' }}>{stats.counts.failure}</div></div>
              <div><div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Herd Used</div><div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#7ecfff' }}>{stats.counts.herd || 0}</div></div>
            </>}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={forceNewCycle} disabled={actionLoading} style={btnBase}>
              <FaGlyph icon={FEEDING_ICONS.clock} size={13} style={{ marginRight: '0.4rem', verticalAlign: '-2px' }} />
              Force New Cycle Now
            </button>
            <button onClick={runDecay} disabled={actionLoading} style={btnBase}>
              <FaGlyph icon={FEEDING_ICONS.shieldHalved} size={13} style={{ marginRight: '0.4rem', verticalAlign: '-2px' }} />
              Run Decay + Herd Regen Now
            </button>
          </div>
        </div>
      )}

      {/* HERD MANAGEMENT */}
      <div style={card}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaGlyph icon={FEEDING_ICONS.droplet} size={16} style={{ color: '#7ecfff' }} />
          <h4 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-color)' }}>Herd Management</h4>
          <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{roster.length} character{roster.length !== 1 ? 's' : ''} with Herd</span>
        </div>
        {roster.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No characters have the Herd background.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Character</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Herd Pool</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Adjust</th>
                </tr>
              </thead>
              <tbody>
                {roster.map(r => (
                  <tr key={r.character_id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <HerdDots current={r.herdCurrent} max={r.herdDots} />
                      {r.herdCurrent < r.herdDots && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                          <FaGlyph icon={FEEDING_ICONS.clock} size={10} style={{ marginRight: 4, verticalAlign: '-1px' }} />
                          Heals 1 pt in {countdown}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button style={{ ...btnBase, padding: '0.3rem 0.75rem', fontSize: '1.1rem', lineHeight: 1 }} disabled={adjusting[r.character_id] || r.herdCurrent <= 0} onClick={() => adjustHerd(r.character_id, -1)} title="Damage Herd (-1)">-</button>
                        <button style={{ ...btnBase, padding: '0.3rem 0.75rem', fontSize: '1.1rem', lineHeight: 1, color: '#7ecfff', borderColor: '#7ecfff44' }} disabled={adjusting[r.character_id] || r.herdCurrent >= r.herdDots} onClick={() => adjustHerd(r.character_id, 1)} title="Heal Herd (+1)">+</button>
                        <button style={{ ...btnBase, padding: '0.3rem 0.65rem', fontSize: '0.75rem' }} disabled={adjusting[r.character_id] || r.herdCurrent >= r.herdDots} onClick={() => adjustHerd(r.character_id, r.herdDots - r.herdCurrent)}>Full</button>
                        <button style={{ ...btnBase, padding: '0.3rem 0.65rem', fontSize: '0.75rem', color: '#ff6b6b', borderColor: '#ff6b6b44' }} disabled={adjusting[r.character_id] || r.herdCurrent <= 0} onClick={() => adjustHerd(r.character_id, -r.herdCurrent)}>Deplete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECENT FEEDINGS */}
      <div style={card}>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', color: 'var(--text-color)' }}>Recent Feedings</h4>
        {log.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No feeding rolls yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                  <th style={{ padding: '0.5rem' }}>Character</th>
                  <th style={{ padding: '0.5rem' }}>Division</th>
                  <th style={{ padding: '0.5rem' }}>Outcome</th>
                  <th style={{ padding: '0.5rem' }}>Hunger</th>
                  <th style={{ padding: '0.5rem' }}>Safety</th>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                  <th style={{ padding: '0.5rem' }}>When</th>
                </tr>
              </thead>
              <tbody>
                {log.map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>{f.character_name}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{f.division || '-'}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: TIER_COLOR[f.outcome] || 'var(--text-secondary)' }}>
                        <FaGlyph icon={TIER_ICON[f.outcome] || FEEDING_ICONS.circleCheck} size={12} />
                        {TIER_LABEL[f.outcome] || f.outcome}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', color: f.hunger_delta < 0 ? 'var(--color-success)' : f.hunger_delta > 0 ? '#ff6b6b' : 'var(--text-secondary)' }}>
                      {f.hunger_delta != null ? (f.hunger_delta > 0 ? `+${f.hunger_delta}` : f.hunger_delta) : '-'}
                    </td>
                    <td style={{ padding: '0.5rem', color: f.safety_delta < 0 ? '#ff6b6b' : f.safety_delta > 0 ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                      {f.safety_delta != null ? (f.safety_delta > 0 ? `+${f.safety_delta}` : f.safety_delta) : '-'}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4, background: f.status === 'resolved' ? 'rgba(0,230,118,0.15)' : 'rgba(255,180,0,0.15)', color: f.status === 'resolved' ? 'var(--color-success)' : '#ffb347' }}>
                        {f.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(f.created_at).toLocaleString()}</td>
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
