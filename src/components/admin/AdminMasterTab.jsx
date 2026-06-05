// src/components/admin/AdminMasterTab.jsx
import React, { useState, useEffect } from 'react';
import api from '../../api';
import styles from '../../styles/Admin.module.css';
import Loading from '../Loading';

export default function AdminMasterTab() {
  const [commsEnabled, setCommsEnabled] = useState(true);
  
  // Banner State
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerCountdown, setBannerCountdown] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const [commsRes, bannerRes] = await Promise.all([
        api.get('/comms/status'),
        api.get('/system/banner')
      ]);
      
      setCommsEnabled(commsRes.data.comms_enabled);
      setBannerEnabled(bannerRes.data.banner_enabled);
      setBannerMessage(bannerRes.data.banner_message || '');
      setBannerCountdown(bannerRes.data.banner_countdown || '');
    } catch (e) {
      setErr('Failed to load Master Settings');
    } finally {
      setLoading(false);
    }
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
    } catch (e) {
      setErr('Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const saveBanner = async () => {
    setActionLoading(true); setMsg(''); setErr('');
    try {
      await api.post('/admin/system/banner', {
        banner_enabled: bannerEnabled,
        banner_message: bannerMessage,
        banner_countdown: bannerCountdown || null
      });
      setMsg(`Global Banner configuration saved.`);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setErr('Failed to save banner config.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !msg && !err) return <Loading />;

  // --- Dynamic Styles ---
  const isOnline = commsEnabled;
  const themeColor = isOnline ? '#00C851' : '#FF4444';
  const bgColor = isOnline ? 'rgba(0, 200, 81, 0.05)' : 'rgba(255, 68, 68, 0.05)';
  
  const isBannerOnline = bannerEnabled;
  const bannerColor = isBannerOnline ? '#d4af37' : '#444';

  return (
    <div className={styles.editorSection} style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      
      {msg && <div style={{ padding: '12px', background: 'rgba(0, 200, 81, 0.2)', border: '1px solid #00C851', borderRadius: '6px', color: '#00C851', marginBottom: '20px', fontWeight: 'bold' }}>{msg}</div>}
      {err && <div style={{ padding: '12px', background: 'rgba(255, 68, 68, 0.2)', border: '1px solid #FF4444', borderRadius: '6px', color: '#FF4444', marginBottom: '20px', fontWeight: 'bold' }}>{err}</div>}

      {/* ========================================= */}
      {/* 1. COMMS KILLSWITCH                       */}
      {/* ========================================= */}
      <div className={styles.sectionHeader} style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
        <h4 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          ⚙️ Network Infrastructure
        </h4>
        <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.9rem' }}>
          Global overrides for the SchreckNet communications grid.
        </p>
      </div>

      <div 
        onClick={toggleComms}
        style={{ 
          background: '#1a1a1f', border: `2px solid ${themeColor}`, borderRadius: '12px', padding: '25px',
          cursor: actionLoading ? 'wait' : 'pointer', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', gap: '20px',
          boxShadow: isOnline ? '0 0 15px rgba(0, 200, 81, 0.1)' : '0 0 15px rgba(255, 68, 68, 0.2)',
          opacity: actionLoading ? 0.7 : 1
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: themeColor, boxShadow: `0 0 10px ${themeColor}`, animation: isOnline ? 'pulse 2s infinite' : 'none' }} />
            <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#fff' }}>SchreckNet Comms</h3>
          </div>
          <div style={{ position: 'relative', width: '64px', height: '34px', background: isOnline ? '#00C851' : '#444', borderRadius: '34px', transition: 'background 0.3s ease', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}>
            <div style={{ position: 'absolute', top: '4px', left: isOnline ? '34px' : '4px', width: '26px', height: '26px', background: '#fff', borderRadius: '50%', transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} />
          </div>
        </div>
        <div style={{ background: bgColor, borderRadius: '8px', padding: '15px', borderLeft: `4px solid ${themeColor}` }}>
          <h4 style={{ margin: '0 0 8px 0', color: themeColor, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {isOnline ? '🟢 System is Online' : '🛑 System is Offline (Read-Only)'}
          </h4>
          <p style={{ margin: 0, color: '#aaa', fontSize: '0.95rem', lineHeight: '1.5' }}>
            {isOnline 
              ? "All players and administrators can freely send and receive messages, create groups, and upload media across the network." 
              : "The killswitch is engaged. The interface is locked down. Players can log in and read their chat history, but all inputs are disabled and a red warning banner is displayed across the system."}
          </p>
        </div>
      </div>

      {/* ========================================= */}
      {/* 2. GLOBAL BANNER CONTROLS                 */}
      {/* ========================================= */}
      <div className={styles.sectionHeader} style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px', marginTop: '40px' }}>
        <h4 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          📢 Global Announcement Banner
        </h4>
        <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.9rem' }}>
          Displays a site-wide banner at the absolute top of the portal. Use this for critical event countdowns or urgent out-of-character notices.
        </p>
      </div>

      <div style={{ background: '#1a1a1f', border: `1px solid #333`, borderRadius: '12px', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Banner Master Switch */}
        <div 
          onClick={() => setBannerEnabled(!bannerEnabled)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${bannerColor}` }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: isBannerOnline ? '#d4af37' : '#888' }}>
              Enable Banner System
            </h3>
          </div>
          <div style={{ position: 'relative', width: '64px', height: '34px', background: isBannerOnline ? '#d4af37' : '#444', borderRadius: '34px', transition: 'background 0.3s ease', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}>
            <div style={{ position: 'absolute', top: '4px', left: isBannerOnline ? '34px' : '4px', width: '26px', height: '26px', background: '#fff', borderRadius: '50%', transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} />
          </div>
        </div>

        {/* Banner Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', opacity: isBannerOnline ? 1 : 0.5, pointerEvents: isBannerOnline ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
          
          <label className={styles.labeledInput}>
            <span>Banner Message (Supports basic HTML like &lt;b&gt;, &lt;i&gt;)</span>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="e.g. <b>Server Maintenance:</b> System will reboot in 2 hours." 
              value={bannerMessage} 
              onChange={e => setBannerMessage(e.target.value)} 
            />
          </label>

          <label className={styles.labeledInput}>
            <span>Attach a Countdown Timer (Optional)</span>
            <input 
              type="datetime-local" 
              className={styles.input} 
              value={bannerCountdown} 
              onChange={e => setBannerCountdown(e.target.value)} 
            />
            <span style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', textTransform: 'none' }}>Leave empty to display only the message.</span>
          </label>

        </div>

        <button 
          className={styles.btnPrimary} 
          onClick={saveBanner} 
          disabled={actionLoading}
          style={{ width: '100%', padding: '15px', fontSize: '1rem', marginTop: '10px' }}
        >
          {actionLoading ? 'Saving...' : 'Save Banner Configuration'}
        </button>

      </div>
      
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 200, 81, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(0, 200, 81, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 200, 81, 0); }
        }
      `}</style>
    </div>
  );
}