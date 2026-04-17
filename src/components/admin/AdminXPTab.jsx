// src/components/admin/AdminXPTab.jsx
import React, { useState, useMemo, useEffect } from 'react';
import styles from '../../styles/Admin.module.css';

/* ---------- VTM Lookups ---------- */
const CLAN_COLORS = {
  Brujah: '#b40f1f', Gangrel: '#2f7a3a', Malkavian: '#713c8b', Nosferatu: '#6a4b2b',
  Toreador: '#b8236b', Tremere: '#7b1113', Ventrue: '#1b4c8c', 'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b', Lasombra: '#191a5a', 'The Ministry': '#865f12', Caitiff: '#636363',
  'Thin-blood': '#6e6e2b',
};
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };
const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');
const symlogo = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png` : '');
/* -------------------------------------------------- */

export default function AdminXPTab({ users, onGrant, onBulkGrant, adminxp }) {
  // --- Standard XP State ---
  const [grants, setGrants] = useState({}); // char_id -> delta
  const [bulkDelta, setBulkDelta] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- Audit Log & Dashboard State ---
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [charModal, setCharModal] = useState(null); // Holds char obj when modal is open
  const [expandedLog, setExpandedLog] = useState(null);

  // --- Dashboard Filters ---
  const [logFilterChar, setLogFilterChar] = useState('All');
  const [logFilterType, setLogFilterType] = useState('All'); // 'All', 'Grants', 'Spends'
  const [logSearch, setLogSearch] = useState('');

  // --- Fetch Logs ---
  const fetchLogs = async () => {
    if (!adminxp) return;
    setLoadingLogs(true);
    try {
      const data = await adminxp();
      
      // Normalize the database fields so the UI doesn't crash!
      const normalizedLogs = (data || []).map(log => ({
        ...log,
        // Map 'cost' to 'amount' (Cost of 5 means they spent XP, so amount is -5)
        amount: log.amount !== undefined ? log.amount : -(log.cost || 0),
        // Map 'action' to 'action_type' safely
        action_type: log.action_type || log.action || 'Unknown',
        // Map 'target' to 'reason'
        reason: log.reason || log.target || 'No details provided'
      }));
      
      setLogs(normalizedLogs);
    } catch (error) {
      console.error("Failed to load XP logs:", error);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Character Filtering (Top Grid) ---
  const characters = useMemo(() => {
    const allChars = users
      .filter(u => u.character_id)
      .map(u => ({
        id: u.character_id,
        owner: `${u.display_name} <${u.email}>`,
        name: u.char_name || 'Unnamed',
        clan: u.clan || 'Unknown',
        xp: u.xp || 0
      }));

    if (!searchTerm.trim()) return allChars;
    const lowerSearch = searchTerm.toLowerCase();
    return allChars.filter(c => 
      c.name.toLowerCase().includes(lowerSearch) || 
      c.owner.toLowerCase().includes(lowerSearch) ||
      c.clan.toLowerCase().includes(lowerSearch)
    );
  }, [users, searchTerm]);

  const totalCharacters = users.filter(u => u.character_id).length;

  // --- Action Handlers ---
  async function handleGrant(char_id) {
    const delta = parseInt(grants[char_id], 10);
    if (isNaN(delta) || delta === 0) return;
    
    await onGrant(char_id, delta);
    setGrants(prev => ({ ...prev, [char_id]: '' }));
    fetchLogs(); // Refresh logs after grant
  }

  async function handleBulkGrant() {
    const delta = parseInt(bulkDelta, 10);
    if (isNaN(delta) || delta === 0) return;
    
    if (!window.confirm(`Are you sure you want to apply ${delta > 0 ? '+' : ''}${delta} XP to ALL ${totalCharacters} characters in the database?`)) return;

    setIsApplying(true);
    try {
      await onBulkGrant(delta);
      setBulkDelta('');
      fetchLogs(); // Refresh logs after bulk
    } finally {
      setIsApplying(false);
    }
  }

  // --- Global Log Computations (For Dashboard) ---
  const filteredGlobalLogs = useMemo(() => {
    return logs.filter(l => {
      // 1. Character Filter
      if (logFilterChar !== 'All' && l.character_name !== logFilterChar) return false;
      // 2. Type Filter
      if (logFilterType === 'Grants' && l.amount <= 0) return false;
      if (logFilterType === 'Spends' && l.amount >= 0) return false;
      // 3. Search Filter
      if (logSearch.trim()) {
        const term = logSearch.toLowerCase();
        const reason = (l.reason || '').toLowerCase();
        const type = (l.action_type || '').toLowerCase();
        if (!reason.includes(term) && !type.includes(term)) return false;
      }
      return true;
    });
  }, [logs, logFilterChar, logFilterType, logSearch]);

  const uniqueLogCharacters = ['All', ...new Set(logs.map(l => l.character_name).filter(Boolean))];
  const totalDashboardGranted = filteredGlobalLogs.filter(l => l.amount > 0).reduce((sum, l) => sum + l.amount, 0);
  const totalDashboardSpent = filteredGlobalLogs.filter(l => l.amount < 0).reduce((sum, l) => sum + Math.abs(l.amount), 0);
  const maxGraphValue = Math.max(totalDashboardGranted, totalDashboardSpent, 1);

  return (
    <div className={styles.stack12}>
      
      {/* --- TOP HEADER & SEARCH --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <h3>XP Tools & Management</h3>
        <input 
          type="text" 
          placeholder="Search character, owner, or clan..." 
          className={styles.input}
          style={{ width: '300px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* --- BULK XP FEATURE --- */}
      {totalCharacters > 0 && (
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '8px', 
          marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)', flexWrap: 'wrap'
        }}>
          <div style={{ flexGrow: 1 }}>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Bulk Grant Session XP</strong>
            <span style={{ fontSize: '0.85rem', color: '#aaa' }}>Apply XP to EVERY character simultaneously ({totalCharacters} active characters).</span>
          </div>
          <input
            type="number"
            placeholder="+/-"
            className={styles.input}
            style={{ width: '100px' }}
            value={bulkDelta}
            onChange={e => setBulkDelta(e.target.value)}
            disabled={isApplying}
          />
          <button 
            className={`${styles.btn} ${styles.btnPrimary}`} 
            onClick={handleBulkGrant}
            disabled={!bulkDelta || bulkDelta === '0' || isApplying}
          >
            {isApplying ? 'Applying...' : 'Apply to All'}
          </button>
        </div>
      )}

      {/* --- CHARACTER GRID --- */}
      {!characters.length && (
        <div className={styles.subtle} style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          {totalCharacters === 0 ? "No characters to grant XP to yet." : "No characters match your search."}
        </div>
      )}
      
      {characters.length > 0 && (
        <div className={styles.xpGrid}>
          <b className={styles.gridHeader}>Character</b>
          <b className={styles.gridHeader}>Clan</b>
          <b className={styles.gridHeader}>Owner</b>
          <b className={styles.gridHeader}>Current XP</b>
          <b className={styles.gridHeader}>Actions</b>
          
          {characters.map(c => {
            const clanColor = CLAN_COLORS[c.clan] || 'var(--text-secondary)';
            const clanLogoUrl = symlogo(c.clan);

            return (
              <React.Fragment key={c.id}>
                <div 
                  className={styles.xpCharCell}
                  style={{ '--clan-color': clanColor, '--clan-logo-url': clanLogoUrl ? `url(${clanLogoUrl})` : 'none' }}
                >
                  <span className={styles.charName}>{c.name}</span>
                </div>
                <div className={styles.clanName} style={{ color: clanColor }}>{c.clan}</div>
                <div className={styles.ownerCell} title={c.owner}>{c.owner}</div>
                <div className={styles.xpCell} style={{ fontWeight: 'bold' }}>{c.xp}</div>
                
                <div className={styles.actionCell} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="+/-"
                    className={styles.input}
                    style={{ width: '70px', padding: '4px 8px' }}
                    value={grants[c.id] ?? ''}
                    onChange={e=>setGrants(prev => ({ ...prev, [c.id]: e.target.value }))}
                  />
                  <button 
                    className={`${styles.btn} ${styles.btnPrimary}`} 
                    style={{ padding: '4px 10px' }}
                    onClick={() => handleGrant(c.id)}
                    disabled={!grants[c.id] || grants[c.id] === '0'}
                  >
                    Apply
                  </button>
                  <button 
                    className={styles.btn} 
                    style={{ padding: '4px 10px', fontSize: '0.8rem', opacity: 0.8 }}
                    onClick={() => setCharModal(c)}
                  >
                    View History
                  </button>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      <hr style={{ margin: '40px 0', borderColor: 'rgba(128,128,128,0.2)' }} />

      {/* --- GLOBAL XP AUDIT DASHBOARD --- */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0 }}>Global XP Audit Dashboard</h3>
          <button className={styles.btn} onClick={fetchLogs} disabled={loadingLogs}>
            {loadingLogs ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {/* Dashboard Filters */}
        <div style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '8px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginBottom: '4px' }}>Filter by Character</label>
            <select className={styles.input} style={{ width: '100%' }} value={logFilterChar} onChange={(e) => setLogFilterChar(e.target.value)}>
              {uniqueLogCharacters.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginBottom: '4px' }}>Filter by Action Type</label>
            <select className={styles.input} style={{ width: '100%' }} value={logFilterType} onChange={(e) => setLogFilterType(e.target.value)}>
              <option value="All">All Actions</option>
              <option value="Grants">Only Granted XP (+)</option>
              <option value="Spends">Only Spent XP (-)</option>
            </select>
          </div>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginBottom: '4px' }}>Search Purchases / Reasons</label>
            <input 
              type="text" className={styles.input} style={{ width: '100%' }} 
              placeholder="e.g. 'Auspex' or 'Admin'..." 
              value={logSearch} onChange={(e) => setLogSearch(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Visual Graph */}
      <div style={{ 
        background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', 
        border: '1px solid var(--border-color)', display: 'flex', gap: '40px', alignItems: 'flex-end', height: '120px' 
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontWeight: 'bold', color: '#10b981', fontSize: '0.9rem' }}>Total Granted: {totalDashboardGranted}</span>
          <div style={{ width: '100%', background: '#10b981', borderRadius: '4px', transition: 'height 0.4s ease-out', height: `${(totalDashboardGranted / maxGraphValue) * 100}%`, minHeight: '4px' }}></div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontWeight: 'bold', color: '#b40f1f', fontSize: '0.9rem' }}>Total Spent: {totalDashboardSpent}</span>
          <div style={{ width: '100%', background: '#b40f1f', borderRadius: '4px', transition: 'height 0.4s ease-out', height: `${(totalDashboardSpent / maxGraphValue) * 100}%`, minHeight: '4px' }}></div>
        </div>
      </div>

      {/* Global Logs List */}
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filteredGlobalLogs.slice(0, 50).map(log => {
          const isExpanded = expandedLog === log.id;
          const isGrant = log.amount > 0;
          return (
            <div key={log.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                onClick={() => setExpandedLog(isExpanded ? null : log.id)}
              >
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <strong style={{ color: isGrant ? '#10b981' : '#b40f1f', minWidth: '40px', textAlign: 'right' }}>{isGrant ? `+${log.amount}` : log.amount}</strong>
                  <span>{log.character_name || 'System'} <span style={{ opacity: 0.5, fontSize: '0.85rem', marginLeft: '6px' }}>({log.action_type})</span></span>
                </div>
                <div style={{ opacity: 0.6, fontSize: '0.85rem' }}>{new Date(log.created_at).toLocaleDateString()} ▼</div>
              </div>
              {isExpanded && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(128,128,128,0.2)', background: 'rgba(0,0,0,0.1)', fontSize: '0.9rem' }}>
                  <p style={{ margin: '0 0 6px 0' }}><strong>Details:</strong> {log.reason}</p>
                  <p style={{ margin: '0 0 6px 0', opacity: 0.8 }}><strong>Player:</strong> {log.player_name || 'N/A'}</p>
                  <p style={{ margin: 0, opacity: 0.6, fontSize: '0.8rem' }}>{new Date(log.created_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          );
        })}
        {filteredGlobalLogs.length > 50 && <div style={{ textAlign: 'center', opacity: 0.5, padding: '10px' }}>Showing most recent 50 entries...</div>}
        {filteredGlobalLogs.length === 0 && <div style={{ textAlign: 'center', opacity: 0.5, padding: '20px' }}>No logs match these filters.</div>}
      </div>

      {/* --- CHARACTER SPECIFIC MODAL --- */}
      {charModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-primary, #222)', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.6)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(128,128,128,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: CLAN_COLORS[charModal.clan] || '#fff' }}>{charModal.name}'s XP History</h3>
                <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '4px' }}>Current Balance: <strong>{charModal.xp} XP</strong></div>
              </div>
              <button className={styles.btn} onClick={() => setCharModal(null)}>Close</button>
            </div>

            {/* Modal Scrollable Content */}
            <div style={{ padding: '20px', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {logs.filter(l => l.character_id === charModal.id).length === 0 ? (
                <div style={{ textAlign: 'center', opacity: 0.5, padding: '40px 20px' }}>No XP history found for this character yet.</div>
              ) : (
                logs.filter(l => l.character_id === charModal.id).map(log => {
                  const isGrant = log.amount > 0;
                  return (
                    <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px', borderLeft: `4px solid ${isGrant ? '#10b981' : '#b40f1f'}` }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '4px' }}>{log.reason}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{new Date(log.created_at).toLocaleString()} • {log.action_type.replace(/_/g, ' ')}</div>
                      </div>
                      <div style={{ fontWeight: 'bold', color: isGrant ? '#10b981' : '#b40f1f', fontSize: '1.1rem', alignSelf: 'center' }}>
                        {isGrant ? `+${log.amount}` : log.amount}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}