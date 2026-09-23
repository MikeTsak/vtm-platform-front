// src/components/admin/AdminXPTab.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import api, { formatApiError } from '../../core/api';
import { formatEuDate } from '../../utils/dateFormatter';
import styles from '../../styles/Admin.module.css';
import MiniSearch from 'minisearch';
import { symlogoWhite, CLAN_HEX as CLAN_COLORS } from '../../data/clans';

// Why a character is left out of "Select all eligible" (null = eligible).
function ineligibleReason(u) {
  if (u.is_deceased) return 'Deceased';
  if (u.is_left) return 'Left';
  if (u.is_missing) return 'Missing';
  if (u.sheet?.is_active !== true) return 'Not activated';
  return null;
}

export default function AdminXPTab({ users, onGrant, onBulkGrant, adminxp }) {
  const [grants, setGrants] = useState({});
  const [bulkDelta, setBulkDelta] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [charModal, setCharModal] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [selectionNote, setSelectionNote] = useState('');
  const selectionLoaded = useRef(false);

  const [logFilterChar, setLogFilterChar] = useState('All');
  const [logFilterType, setLogFilterType] = useState('All');
  const [logSearch, setLogSearch] = useState('');

  const fetchLogs = async () => {
    if (!adminxp) return;
    setLoadingLogs(true);
    try {
      const data = await adminxp();
      const normalizedLogs = (data || []).map(log => ({ ...log, amount: log.amount !== undefined ? log.amount : -(log.cost || 0), action_type: log.action_type || log.action || 'Unknown', reason: log.reason || log.target || 'No details provided' }));
      setLogs(normalizedLogs);
    } catch (error) { setLogs([]); } finally { setLoadingLogs(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLogs(); }, []);

  const allCharacters = useMemo(() => users.filter(u => u.character_id).map(u => ({
    id: u.character_id, owner: `${u.display_name} <${u.email}>`, name: u.char_name || 'Unnamed',
    clan: u.clan || 'Unknown', xp: u.xp || 0, inactiveReason: ineligibleReason(u),
  })), [users]);

  const characters = useMemo(() => {
    if (!searchTerm.trim()) return allCharacters;
    const q = searchTerm.trim();
    const ms = new MiniSearch({ fields: ['name', 'owner', 'clan'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
    ms.addAll(allCharacters);
    const results = ms.search(q);
    const idSet = new Set(results.map(r => r.id));
    return allCharacters.filter(c => idSet.has(c.id));
  }, [allCharacters, searchTerm]);
  const totalCharacters = allCharacters.length;

  // Only ids that still map to a character count toward the grant.
  const selectedIds = useMemo(() => allCharacters.filter(c => selected.has(c.id)).map(c => c.id), [allCharacters, selected]);

  // Restore this admin's last selection, then persist every change (debounced).
  useEffect(() => {
    api.get('/admin/xp/bulk-selection')
      .then(({ data }) => setSelected(new Set(data?.character_ids || [])))
      .catch(() => { })
      .finally(() => { selectionLoaded.current = true; });
  }, []);
  useEffect(() => {
    if (!selectionLoaded.current) return undefined;
    const t = setTimeout(() => {
      api.put('/admin/xp/bulk-selection', { character_ids: [...selected] }).catch(() => { });
    }, 600);
    return () => clearTimeout(t);
  }, [selected]);

  function toggleSelected(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectEligible() {
    setSelected(new Set(allCharacters.filter(c => !c.inactiveReason).map(c => c.id)));
    setSelectionNote('');
  }
  function clearSelection() {
    setSelected(new Set());
    setSelectionNote('');
  }
  async function selectDowntimeSubmitters() {
    setSelectionNote('Loading downtime submitters...');
    try {
      const { data } = await api.get('/admin/downtimes/last-cycle-submitters');
      if (!data?.cycle) { setSelectionNote('No closed downtime cycle found.'); return; }
      const known = new Set(allCharacters.map(c => c.id));
      const ids = (data.character_ids || []).filter(id => known.has(id));
      setSelected(new Set(ids));
      const label = data.cycle.title || `${formatEuDate(data.cycle.opening_date)} - ${formatEuDate(data.cycle.closing_date)}`;
      setSelectionNote(`${ids.length} submitted downtimes in the last closed cycle (${label}).`);
    } catch (e) {
      setSelectionNote(formatApiError(e, 'Failed to load downtime submitters'));
    }
  }

  const visibleAllSelected = characters.length > 0 && characters.every(c => selected.has(c.id));
  function toggleVisible() {
    setSelected(prev => {
      const next = new Set(prev);
      characters.forEach(c => { if (visibleAllSelected) next.delete(c.id); else next.add(c.id); });
      return next;
    });
  }

  async function handleGrant(char_id) {
    const delta = parseInt(grants[char_id], 10);
    if (isNaN(delta) || delta === 0) return;
    await onGrant(char_id, delta);
    setGrants(prev => ({ ...prev, [char_id]: '' }));
    fetchLogs();
  }
  async function handleBulkGrant() {
    const delta = parseInt(bulkDelta, 10);
    if (isNaN(delta) || delta === 0 || selectedIds.length === 0) return;
    if (!window.confirm(`Apply ${delta > 0 ? '+' : ''}${delta} XP to ${selectedIds.length} selected character${selectedIds.length === 1 ? '' : 's'}?`)) return;
    setIsApplying(true);
    try { await onBulkGrant(delta, selectedIds); setBulkDelta(''); fetchLogs(); } finally { setIsApplying(false); }
  }

  const filteredGlobalLogs = useMemo(() => {
    let result = logs.filter(l => {
      if (logFilterChar !== 'All' && l.character_name !== logFilterChar) return false;
      if (logFilterType === 'Grants' && l.amount <= 0) return false;
      if (logFilterType === 'Spends' && l.amount >= 0) return false;
      return true;
    });
    if (logSearch.trim()) {
      const mapped = result.map((l, i) => ({ ...l, __msId: l.id || i }));
      const ms = new MiniSearch({ idField: '__msId', fields: ['reason', 'action_type'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
      ms.addAll(mapped);
      const results = ms.search(logSearch.trim());
      const idSet = new Set(results.map(r => r.id));
      result = mapped.filter(l => idSet.has(l.__msId));
    }
    return result;
  }, [logs, logFilterChar, logFilterType, logSearch]);

  const uniqueLogCharacters = ['All', ...new Set(logs.map(l => l.character_name).filter(Boolean))];
  const totalDashboardGranted = filteredGlobalLogs.filter(l => l.amount > 0).reduce((sum, l) => sum + l.amount, 0);
  const totalDashboardSpent = filteredGlobalLogs.filter(l => l.amount < 0).reduce((sum, l) => sum + Math.abs(l.amount), 0);
  const maxGraphValue = Math.max(totalDashboardGranted, totalDashboardSpent, 1);

  return (
    <div className={styles.stack12}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>XP Tools & Management</h3>
        <input type="text" placeholder="Search character, owner, or clan..." className={`${styles.input} ${styles.rInput}`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {totalCharacters > 0 && (
        <div style={{ background: 'var(--glass-inset)', padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <strong style={{ display: 'block', marginBottom: '4px', fontSize: '1.2rem', color: 'var(--text-color)' }}>Bulk Grant Session XP</strong>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Tick characters in the list below. Your selection is saved for next time ({selectedIds.length} of {totalCharacters} selected).</span>
            </div>
            <input type="number" placeholder="+/-" aria-label="Bulk XP amount" className={styles.input} style={{ width: '100px', fontSize: '1.2rem', textAlign: 'center' }} value={bulkDelta} onChange={e => setBulkDelta(e.target.value)} disabled={isApplying} />
            <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '0.8rem 1.5rem' }} onClick={handleBulkGrant} disabled={!bulkDelta || bulkDelta === '0' || isApplying || selectedIds.length === 0}>{isApplying ? 'Applying...' : `Apply to ${selectedIds.length} selected`}</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={selectEligible} title="Skips characters that are not activated, deceased, left or missing">Select all eligible</button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={selectDowntimeSubmitters} title="Characters who submitted downtimes in the most recent closed cycle">Select downtime submitters</button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={clearSelection} disabled={selected.size === 0}>Clear selection</button>
            {selectionNote && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectionNote}</span>}
          </div>
        </div>
      )}

      {!characters.length && <div className={styles.loading}>{totalCharacters === 0 ? "No characters to grant XP to yet." : "No characters match your search."}</div>}
      
      {characters.length > 0 && (
        <div className={styles.xpGrid} style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)' }}>
          <b className={styles.gridHeader} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><input type="checkbox" className={`${styles.xpSelect} ${styles.xpSelectInline}`} checked={visibleAllSelected} onChange={toggleVisible} aria-label={visibleAllSelected ? 'Deselect all listed characters' : 'Select all listed characters'} />Character</b><b className={styles.gridHeader}>Clan</b><b className={styles.gridHeader}>Owner</b><b className={styles.gridHeader}>Current XP</b><b className={styles.gridHeader}>Actions</b>
          {characters.map(c => {
            const clanColor = CLAN_COLORS[c.clan] || 'var(--text-secondary)';
            return (
              <React.Fragment key={c.id}>
                <label className={`${styles.xpCharCell} ${selected.has(c.id) ? styles.xpCharCellSelected : ''}`} style={{ '--clan-color': clanColor, '--clan-logo-url': symlogoWhite(c.clan) ? `url(${symlogoWhite(c.clan)})` : 'none' }}>
                  <input type="checkbox" className={styles.xpSelect} checked={selected.has(c.id)} onChange={() => toggleSelected(c.id)} aria-label={`Select ${c.name}`} />
                  <span className={styles.charName}>{c.name}</span>
                  {c.inactiveReason && <span className={styles.xpStatusTag}>{c.inactiveReason}</span>}
                </label>
                <div className={styles.clanName} style={{ color: clanColor }}>{c.clan}</div>
                <div className={styles.ownerCell} title={c.owner}>{c.owner}</div>
                <div className={styles.xpCell} style={{ fontWeight: 'bold' }}>{c.xp}</div>
                <div className={styles.actionCell} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="number" placeholder="+/-" className={styles.input} style={{ width: '70px', padding: '4px 8px' }} value={grants[c.id] ?? ''} onChange={e=>setGrants(prev => ({ ...prev, [c.id]: e.target.value }))} />
                  <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '6px 12px' }} onClick={() => handleGrant(c.id)} disabled={!grants[c.id] || grants[c.id] === '0'}>Apply</button>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => setCharModal(c)}>View History</button>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      <hr style={{ margin: '40px 0', borderColor: 'var(--glass-border)' }} />

      {/* Global XP Audit */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Global XP Audit Dashboard</h3>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={fetchLogs} disabled={loadingLogs}>{loadingLogs ? 'Refreshing...' : 'Refresh Data'}</button>
        </div>
        <div className={styles.rGrid3} style={{ background: 'var(--glass-inset)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
          <label className={styles.labeledInput} style={{flex: 1}}><span>Character</span><select className={styles.select} value={logFilterChar} onChange={(e) => setLogFilterChar(e.target.value)}>{uniqueLogCharacters.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className={styles.labeledInput} style={{flex: 1}}><span>Action Type</span><select className={styles.select} value={logFilterType} onChange={(e) => setLogFilterType(e.target.value)}><option value="All">All Actions</option><option value="Grants">Granted (+)</option><option value="Spends">Spent (-)</option></select></label>
          <label className={styles.labeledInput} style={{flex: 2}}><span>Search Reason</span><input type="text" className={styles.input} placeholder="e.g. 'Auspex'..." value={logSearch} onChange={(e) => setLogSearch(e.target.value)} /></label>
        </div>
      </div>

      <div style={{ background: 'var(--glass-bg)', padding: '25px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', display: 'flex', gap: '40px', alignItems: 'flex-end', height: '140px', boxShadow: 'var(--glass-shadow)' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--color-success)', fontSize: '1rem', textShadow: '0 0 10px rgba(0,230,118,0.5)' }}>Total Granted: {totalDashboardGranted}</span>
          <div style={{ width: '100%', background: 'linear-gradient(to top, #00b359, var(--color-success))', borderRadius: '4px', transition: 'height 0.4s ease-out', height: `${(totalDashboardGranted / maxGraphValue) * 100}%`, minHeight: '4px', boxShadow: '0 0 15px rgba(0,230,118,0.3)' }}></div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--color-error)', fontSize: '1rem', textShadow: '0 0 10px rgba(255,77,77,0.5)' }}>Total Spent: {totalDashboardSpent}</span>
          <div style={{ width: '100%', background: 'linear-gradient(to top, #a82020, var(--color-error))', borderRadius: '4px', transition: 'height 0.4s ease-out', height: `${(totalDashboardSpent / maxGraphValue) * 100}%`, minHeight: '4px', boxShadow: '0 0 15px rgba(255,77,77,0.3)' }}></div>
        </div>
      </div>

      {/* Modal */}
      {charModal && (
        <div className={styles.modalBackdrop} onClick={() => setCharModal(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderContent}>
                <h3 style={{ color: CLAN_COLORS[charModal.clan] || 'var(--text-color)' }}>{charModal.name}'s XP History</h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Current Balance: <strong style={{color: 'var(--text-color)'}}>{charModal.xp} XP</strong></div>
              </div>
              <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0 }} onClick={() => setCharModal(null)}>✕</button>
            </div>
            <div className={styles.modalBody} style={{ padding: '20px', gap: '10px' }}>
              {logs.filter(l => l.character_id === charModal.id).length === 0 ? (
                <div className={styles.loading}>No XP history found.</div>
              ) : (
                logs.filter(l => l.character_id === charModal.id).map(log => {
                  const isGrant = log.amount > 0;
                  return (
                    <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', background: 'var(--glass-inset)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', borderLeft: `4px solid ${isGrant ? 'var(--color-success)' : 'var(--color-error)'}` }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '4px', color: 'var(--text-color)' }}>{log.reason}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatEuDate(log.created_at)} • <span style={{color: 'var(--accent-purple)'}}>{log.action_type.replace(/_/g, ' ')}</span></div>
                      </div>
                      <div style={{ fontWeight: '900', color: isGrant ? 'var(--color-success)' : 'var(--color-error)', fontSize: '1.4rem', alignSelf: 'center', textShadow: `0 0 10px ${isGrant ? 'rgba(0,230,118,0.4)' : 'rgba(255,77,77,0.4)'}` }}>
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