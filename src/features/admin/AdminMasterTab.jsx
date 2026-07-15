// src/components/admin/AdminMasterTab.jsx
import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import { Skeleton } from 'boneyard-js/react';
export default function AdminMasterTab() {
  const [commsEnabled, setCommsEnabled] = useState(true);
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerCountdown, setBannerCountdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Danger Zone state
  const [dangerOpen, setDangerOpen] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const [commsRes, bannerRes] = await Promise.all([api.get('/comms/status'), api.get('/system/banner')]);
      setCommsEnabled(commsRes.data.comms_enabled);
      setBannerEnabled(bannerRes.data.banner_enabled);
      setBannerMessage(bannerRes.data.banner_message || '');
      setBannerCountdown(bannerRes.data.banner_countdown || '');
    } catch (e) { setErr('Failed to load Master Settings'); } finally { setLoading(false); }
  };

  const toggleComms = async () => {
    if (actionLoading) return;
    const newVal = !commsEnabled;
    setActionLoading(true); setMsg(''); setErr('');
    try {
      await api.post('/admin/comms/status', { comms_enabled: newVal });
      setCommsEnabled(newVal);
      setMsg(`System updated: Comms are now ${newVal ? 'ONLINE' : 'OFFLINE'}.`);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setErr('Failed to update status.'); } finally { setActionLoading(false); }
  };

  const saveBanner = async () => {
    setActionLoading(true); setMsg(''); setErr('');
    try {
      await api.post('/admin/system/banner', { banner_enabled: bannerEnabled, banner_message: bannerMessage, banner_countdown: bannerCountdown || null });
      setMsg(`Global Banner configuration saved.`);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setErr('Failed to save banner config.'); } finally { setActionLoading(false); }
  };

  const dangerWipeDowntimes = async () => {
    const input = window.prompt('This will permanently delete all RESOLVED downtimes older than 30 days.\n\nType DELETE to confirm:');
    if (input !== 'DELETE') return;
    setDangerLoading(true); setMsg(''); setErr('');
    try {
      const { data } = await api.delete('/admin/downtimes/resolved');
      setMsg(`✅ Wiped ${data.deleted || 0} resolved downtime(s) older than 30 days.`);
      setTimeout(() => setMsg(''), 5000);
    } catch (e) { setErr(e.response?.data?.error || 'Failed to wipe downtimes.'); }
    finally { setDangerLoading(false); }
  };

  const dangerClearDice = async () => {
    const input = window.prompt('This will permanently DELETE ALL dice roll history for all users.\n\nThis cannot be undone. Type DELETE to confirm:');
    if (input !== 'DELETE') return;
    setDangerLoading(true); setMsg(''); setErr('');
    try {
      const { data } = await api.delete('/admin/dice/rolls/all');
      setMsg(`✅ Cleared ${data.deleted || 0} dice roll record(s).`);
      setTimeout(() => setMsg(''), 5000);
    } catch (e) { setErr(e.response?.data?.error || 'Failed to clear dice logs.'); }
    finally { setDangerLoading(false); }
  };

  const isOnline = commsEnabled;
  const themeColor = isOnline ? 'var(--color-success)' : 'var(--color-error)';
  const bgColor = isOnline ? 'rgba(0, 230, 118, 0.05)' : 'rgba(255, 77, 77, 0.05)';
  const isBannerOnline = bannerEnabled;
  const bannerColor = isBannerOnline ? 'var(--accent-purple)' : 'var(--glass-border)';

  return (
    <Skeleton loading={loading && !msg && !err} name="admin-master-tab">
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {msg && <div className={`${styles.alert} ${styles.alertInfo}`}>{msg}</div>}
      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

      {/* COMMS KILLSWITCH */}
      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--glass-shadow)' }}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-color)' }}>⚙️ Network Infrastructure</h4>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>Global overrides for the SchreckNet communications grid.</p>
        </div>

        <div onClick={toggleComms} style={{ background: 'var(--glass-inset)', border: `2px solid ${themeColor}`, borderRadius: 'var(--radius-md)', padding: '1.5rem', cursor: actionLoading ? 'wait' : 'pointer', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: `0 0 20px ${isOnline ? 'rgba(0,230,118,0.1)' : 'rgba(255,77,77,0.1)'}`, opacity: actionLoading ? 0.7 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: themeColor, boxShadow: `0 0 15px ${themeColor}`, animation: isOnline ? 'pulseGlow 2s infinite' : 'none' }} />
              <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-color)' }}>SchreckNet Comms</h3>
            </div>
            <div style={{ position: 'relative', width: '60px', height: '32px', background: isOnline ? 'var(--color-success)' : 'var(--glass-border)', borderRadius: '32px', transition: 'background 0.3s ease' }}>
              <div style={{ position: 'absolute', top: '4px', left: isOnline ? '32px' : '4px', width: '24px', height: '24px', background: 'var(--text-color)', borderRadius: '50%', transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
            </div>
          </div>
          <div style={{ background: bgColor, borderRadius: '8px', padding: '15px', borderLeft: `4px solid ${themeColor}` }}>
            <h4 style={{ margin: '0 0 8px 0', color: themeColor, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{isOnline ? '🟢 System is Online' : '🛑 System is Offline (Read-Only)'}</h4>
            <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.5' }}>{isOnline ? "All players and administrators can freely send and receive messages, create groups, and upload media across the network." : "The killswitch is engaged. The interface is locked down. Players can log in and read their chat history, but all inputs are disabled."}</p>
          </div>
        </div>
      </div>

      {/* BANNER CONTROLS */}
      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--glass-shadow)' }}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-color)' }}>📢 Global Announcement Banner</h4>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>Displays a site-wide banner at the absolute top of the portal. Use this for critical event countdowns.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div onClick={() => setBannerEnabled(!bannerEnabled)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'var(--glass-inset)', padding: '1.2rem 1.5rem', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${bannerColor}`, border: '1px solid var(--glass-border)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: isBannerOnline ? 'var(--accent-purple)' : 'var(--text-secondary)' }}>Enable Banner System</h3>
            <div style={{ position: 'relative', width: '60px', height: '32px', background: isBannerOnline ? 'var(--accent-purple)' : 'var(--glass-border)', borderRadius: '32px', transition: 'background 0.3s ease' }}>
              <div style={{ position: 'absolute', top: '4px', left: isBannerOnline ? '32px' : '4px', width: '24px', height: '24px', background: 'var(--text-color)', borderRadius: '50%', transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: isBannerOnline ? 1 : 0.5, pointerEvents: isBannerOnline ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
            <label className={styles.labeledInput}>
              <span>Banner Message (Supports HTML)</span>
              <input type="text" className={styles.input} placeholder="e.g. <b>Server Maintenance:</b> Reboot in 2 hours." value={bannerMessage} onChange={e => setBannerMessage(e.target.value)} />
            </label>
            <label className={styles.labeledInput}>
              <span>Attach a Countdown Timer (Optional)</span>
              <input type="datetime-local" className={styles.input} value={bannerCountdown} onChange={e => setBannerCountdown(e.target.value)} />
            </label>
          </div>

          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveBanner} disabled={actionLoading} style={{ padding: '1rem', fontSize: '1.05rem', marginTop: '1rem' }}>
            {actionLoading ? 'Saving...' : 'Save Banner Configuration'}
          </button>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div style={{ background: 'rgba(255, 82, 82, 0.04)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '2px solid rgba(255,82,82,0.3)', padding: '2rem', boxShadow: '0 0 30px rgba(255,82,82,0.08)' }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingBottom: dangerOpen ? '1.5rem' : 0, borderBottom: dangerOpen ? '1px solid rgba(255,82,82,0.2)' : 'none', marginBottom: dangerOpen ? '1.5rem' : 0, transition: 'all 0.3s' }}
          onClick={() => setDangerOpen(o => !o)}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-error)' }}>⚠️ Danger Zone</h4>
            <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Destructive operations. Each action requires confirmation.</p>
          </div>
          <span style={{ color: 'var(--color-error)', fontSize: '1.4rem', transition: 'transform 0.3s', transform: dangerOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>

        {dangerOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Wipe Resolved Downtimes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-inset)', borderRadius: 'var(--radius-md)', padding: '1.2rem 1.5rem', border: '1px solid rgba(255,82,82,0.2)' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>🗑️ Wipe Resolved Downtimes</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Permanently deletes all downtimes with status "resolved" or "Resolved in scene" older than 30 days.</div>
              </div>
              <button
                type="button"
                className={styles.btn}
                style={{ background: 'rgba(255,82,82,0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: 700, minWidth: '140px', flexShrink: 0 }}
                onClick={dangerWipeDowntimes}
                disabled={dangerLoading}
              >
                {dangerLoading ? '…' : 'Wipe Records'}
              </button>
            </div>

            {/* Clear Dice Logs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-inset)', borderRadius: 'var(--radius-md)', padding: '1.2rem 1.5rem', border: '1px solid rgba(255,82,82,0.2)' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>🎲 Clear All Dice Logs</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Permanently deletes all dice roll records across all characters. Stats charts will be reset.</div>
              </div>
              <button
                type="button"
                className={styles.btn}
                style={{ background: 'rgba(255,82,82,0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: 700, minWidth: '140px', flexShrink: 0 }}
                onClick={dangerClearDice}
                disabled={dangerLoading}
              >
                {dangerLoading ? '…' : 'Clear Dice Logs'}
              </button>
            </div>
          </div>
        )}
      </div>

      </div>
    </Skeleton>
  );
}