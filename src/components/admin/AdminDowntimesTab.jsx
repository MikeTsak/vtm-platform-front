// src/components/admin/AdminDowntimesTab.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from "../../api";
import styles from '../../styles/Admin.module.css';

/* ---------- VTM Lookups (as requested) ---------- */
const CLAN_COLORS = {
  Brujah: '#b40f1f',
  Gangrel: '#2f7a3a',
  Malkavian: '#713c8b',
  Nosferatu: '#6a4b2b',
  Toreador: '#b8236b',
  Tremere: '#7b1113',
  Ventrue: '#1b4c8c',
  'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b',
  Lasombra: '#191a5a',
  'The Ministry': '#865f12',
  Caitiff: '#636363',
  'Thin-blood': '#6e6e2b',
};
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };
const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');
const symlogo = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png` : '');
/* -------------------------------------------------- */

function niceDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  try {
    return dt.toLocaleString('en-GB', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return dt.toISOString(); }
}
function ymd(d) {
  if (!d) return '';
  const t = new Date(d);
  if (isNaN(t.getTime())) return '';
  const yyyy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, '0');
  const dd = String(t.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const STATUS = ['submitted', 'approved', 'rejected', 'resolved'];

// --- Helper Component for Toggles ---
function StatusToggle({ status, checked, onChange }) {
  return (
    <label className={`${styles.customCheckbox} ${styles.statusToggle}`} data-status={status}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
      <span className={styles.checkmark}></span>
      <span>Hide {status}</span>
    </label>
  );
}

export default function AdminDowntimesTab() {
  // --- Config state
  const [cfgLoading, setCfgLoading] = useState(false);
  const [cfgSaving, setCfgSaving]   = useState(false);
  const [cfgErr, setCfgErr]         = useState('');
  const [cfgInfo, setCfgInfo]       = useState('');
  const [deadline, setDeadline]     = useState('');
  const [opening, setOpening]       = useState('');

  // --- Downtimes list state
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr]         = useState('');
  const [rows, setRows]               = useState([]); // Flat list from API

  // --- UI: search / filters
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // NEW State for toggles
  const [hideStatus, setHideStatus] = useState({
    submitted: false,
    approved: false,
    rejected: true,
    resolved: true, 
  });

  // --- Per-row edit buffers
  const [buffer, setBuffer] = useState({}); // id -> { ... }

  // Load config on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      setCfgLoading(true);
      setCfgErr(''); setCfgInfo('');
      try {
        const { data } = await api.get('/downtimes/config');
        if (!mounted) return;
        setDeadline(ymd(data?.downtime_deadline || ''));
        setOpening(ymd(data?.downtime_opening || ''));
      } catch (e) {
        if (mounted) setCfgErr('Failed to load downtime config.');
        console.error(e);
      } finally {
        if (mounted) setCfgLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Save config
  async function onSaveConfig() {
    setCfgSaving(true);
    setCfgErr(''); setCfgInfo('');
    try {
      const { data } = await api.post('/admin/downtimes/config', {
        downtime_deadline: deadline || null,
        downtime_opening: opening || null,
      });
      setDeadline(ymd(data?.downtime_deadline || ''));
      setOpening(ymd(data?.downtime_opening || ''));
      setCfgInfo('Downtime dates saved.');
    } catch (e) {
      console.error(e);
      setCfgErr(e?.response?.data?.error || 'Failed to save downtime dates.');
    } finally {
      setCfgSaving(false);
    }
  }

  function onReloadConfig() {
    setCfgLoading(true);
    setCfgErr(''); setCfgInfo('');
    api.get('/downtimes/config')
      .then(({ data }) => {
        setDeadline(ymd(data?.downtime_deadline || ''));
        setOpening(ymd(data?.downtime_opening || ''));
      })
      .catch(() => setCfgErr('Failed to reload config.'))
      .finally(() => setCfgLoading(false));
  }

  // Load admin list
  async function loadList() {
    setListLoading(true);
    setListErr('');
    try {
      const { data } = await api.get('/admin/downtimes');
      setRows((data?.downtimes || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (e) {
      console.error(e);
      setListErr('Failed to load downtimes.');
    } finally {
      setListLoading(false);
    }
  }
  useEffect(() => { loadList(); }, []);

  // Derived filtered view (UPDATED with hideStatus)
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter(r => {
      const rowStatus = String(r.status || 'submitted').toLowerCase();
      
      // 1. Check dropdown filter
      const dropdownOk = statusFilter === 'all' || rowStatus === statusFilter;
      if (!dropdownOk) return false;
      
      // 2. Check hide toggles
      if (hideStatus[rowStatus]) return false; // If the toggle for this status is checked, hide it.

      // 3. Check search query
      if (!qq) return true;
      const hay =
        `${r.title || ''} ${r.body || ''} ${r.gm_notes || ''} ${r.gm_resolution || ''} ${r.player_name || ''} ${r.char_name || ''} ${r.clan || ''}`
          .toLowerCase();
      return hay.includes(qq);
    });
  }, [rows, q, statusFilter, hideStatus]);

  // NEW: Memo to group the filtered list
  const groupedAndFiltered = useMemo(() => {
    const groups = new Map();
    for (const r of filtered) { // Use the already filtered flat list
        const key = r.player_name || r.email || 'Unknown Player';
        if (!groups.has(key)) {
            groups.set(key, {
                player_name: key,
                char_name: r.char_name, // Store the first char_name/clan for the header
                clan: r.clan,
                downtimes: []
            });
        }
        groups.get(key).downtimes.push(r);
    }
    // Convert Map to array. Groups are already sorted by most recent DT because the `filtered` list is sorted.
    return Array.from(groups.values());
  }, [filtered]);

  // NEW Handler for toggles
  function toggleHideStatus(status) {
    setHideStatus(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  }

  // Editing helpers
  function openBuf(r) {
    setBuffer({
      [r.id]: {
        status: r.status || 'submitted',
        gm_notes: r.gm_notes || '',
        gm_resolution: r.gm_resolution || '',
        saving: false, error: '', info: ''
      }
    });
  }
  function updBuf(id, key, val) {
    setBuffer(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [key]: val }
    }));
  }
  async function saveRow(id) {
    const b = buffer[id];
    if (!b) return;
    updBuf(id, 'saving', true);
    updBuf(id, 'error', ''); updBuf(id, 'info', '');
    try {
      const payload = { status: b.status, gm_notes: b.gm_notes, gm_resolution: b.gm_resolution };
      const { data } = await api.patch(`/admin/downtimes/${id}`, payload);
      setRows(prev => prev.map(x => (x.id === id ? { ...x, ...data.downtime } : x)));
      updBuf(id, 'info', 'Saved.');
      setTimeout(() => setBuffer(prev => {
          const next = {...prev};
          delete next[id];
          return next;
      }), 1000);
    } catch (e) {
      console.error(e);
      updBuf(id, 'error', e?.response?.data?.error || 'Save failed');
      updBuf(id, 'saving', false);
    }
  }
  function cancelRow(id) {
    setBuffer(prev => {
        const next = {...prev};
        delete next[id];
        return next;
    });
  }

  return (
    <div className={styles.stack12}>
      <h3>Downtimes</h3>

      {/* ============ Downtime Schedule (Config) ============ */}
      <section className={styles.editorSection}>
        <div className={styles.sectionHeader}>
          <h4>Downtime Schedule</h4>
          <div className={styles.subtle}>Set the global dates visible to all players.</div>
        </div>

        {cfgLoading && (
          <div className={styles.loading}><span className={styles.spinner} /> Loading config…</div>
        )}
        {cfgErr && <div className={`${styles.alert} ${styles.alertError}`}>{cfgErr}</div>}
        {cfgInfo && <div className={`${styles.alert} ${styles.alertInfo}`}>{cfgInfo}</div>}

        <div className={styles.twoColGrid}>
          <label className={styles.labeledInput}>
            <span>Downtime deadline</span>
            <input
              type="date"
              className={styles.input}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>
          <label className={styles.labeledInput}>
            <span>Next Downtime Opening date</span>
            <input
              type="date"
              className={styles.input}
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onReloadConfig}>
            Reload
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={onSaveConfig}
            disabled={cfgSaving}
          >
            {cfgSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </section>

      {/* ============ Admin List ============ */}
      <section className={styles.editorSection}>
        <div className={styles.sectionHeader}>
          <h4>All Downtimes</h4>
          <div className={styles.subtle}>Search, filter, and resolve player downtimes.</div>
        </div>

        {/* --- Search & Filter Dropdown --- */}
        <div className={styles.twoColGrid} style={{ alignItems: 'end' }}>
          <label className={styles.labeledInput}>
            <span>Search</span>
            <input
              className={`${styles.input} ${styles.inputSearch}`}
              placeholder="Title, body, player, character, clan…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label className={styles.labeledInput}>
            <span>Status Filter (Dropdown)</span>
            <select
              className={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Show All</option>
              {STATUS.map(s => <option key={s} value={s}>{`Only ${s}`}</option>)}
            </select>
          </label>
        </div>

        {/* --- NEW Status Toggles --- */}
        <div className={styles.filterToggleGrid}>
            <StatusToggle status="submitted" checked={hideStatus.submitted} onChange={() => toggleHideStatus('submitted')} />
            <StatusToggle status="approved" checked={hideStatus.approved} onChange={() => toggleHideStatus('approved')} />
            <StatusToggle status="rejected" checked={hideStatus.rejected} onChange={() => toggleHideStatus('rejected')} />
            <StatusToggle status="resolved" checked={hideStatus.resolved} onChange={() => toggleHideStatus('resolved')} />
        </div>

        <div className={styles.row} style={{ gap: '0.5rem', marginTop: '0.5rem' }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { setQ(''); setStatusFilter('all'); }}>
            Clear filters
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadList}>
            Reload list
          </button>
        </div>

        {listErr && <div className={`${styles.alert} ${styles.alertError}`} style={{ marginTop: '0.75rem' }}>{listErr}</div>}
        {listLoading && (
          <div className={styles.loading} style={{ marginTop: '0.75rem' }}>
            <span className={styles.spinner} /> Loading downtimes…
          </div>
        )}

        {/* --- Grouped Render Logic --- */}
        {!listLoading && (
          <div className={styles.downtimeGroupGrid} style={{ marginTop: '1rem' }}>
            {groupedAndFiltered.length === 0 && (
              <div className={styles.placeholderCard}>
                <div className={styles.placeholderDot} />
                <h3>No downtimes match your filters</h3>
              </div>
            )}

            {groupedAndFiltered.map(group => {
              const clanColor = CLAN_COLORS[group.clan] || 'var(--border-color)';
              const clanLogoUrl = symlogo(group.clan);
              return (
                <div 
                  key={group.player_name} 
                  className={styles.playerDowntimeGroup}
                  style={{
                    '--clan-color': clanColor,
                    '--clan-logo-url': clanLogoUrl ? `url(${clanLogoUrl})` : 'none'
                  }}
                >
                  <header className={styles.playerGroupHeader}>
                    <div className={styles.playerGroupBadge}></div>
                    <div className={styles.playerGroupInfo}>
                        <span className={styles.playerCharName}>{group.char_name || '(No Character)'}</span>
                        <span className={styles.playerDisplayName}>{group.player_name}</span>
                    </div>
                  </header>
                  <div className={styles.downtimeCompactList}>
                    {group.downtimes.map(r => (
                      <DowntimeEditorRow
                        key={r.id}
                        r={r}
                        editBuffer={buffer[r.id]}
                        onOpen={openBuf}
                        onUpdate={updBuf}
                        onSave={saveRow}
                        onCancel={cancelRow}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}


/* --- NEW Sub-Component for Compact Row / Full Editor --- */
function DowntimeEditorRow({ r, editBuffer, onOpen, onUpdate, onSave, onCancel }) {
  const editing = !!editBuffer;

  // --- COMPACT VIEW ---
  if (!editing) {
    return (
      <div className={styles.downtimeCompactRow} data-status={(r.status || '').toLowerCase()}>
        <div className={styles.compactTitle}>
          <b>#{r.id}</b> — {r.title}
        </div>
        <div className={styles.compactStatus}>
          <span className={styles.statusBadge} data-status={r.status}>{r.status}</span>
        </div>
        <div className={styles.compactDate}>{niceDate(r.created_at)}</div>
        <button 
          className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} 
          onClick={() => onOpen(r)}
        >
          View
        </button>
      </div>
    );
  }

  // --- FULL EDITING VIEW ---
  const b = editBuffer;
  return (
    <article
      className={styles.downtimeCard} // Re-use the full card style for editing
      data-status={b.status}
      style={{ margin: '0.5rem 0', borderLeftWidth: '2px', animation: 'fadeIn 0.3s ease-out' }} // Use 0 margin on x-axis
    >
      <header className={styles.downtimeHeader} style={{ padding: '0.75rem 1rem' }}>
        <div className={styles.downtimeInfo}>
          <div className={styles.downtimeTitle}>
            <b>#{r.id}</b> — {r.title || '(no title)'}
          </div>
          <div className={styles.downtimeMeta} style={{ fontSize: '0.8rem' }}>
            <span>Player: <b>{r.player_name || r.email}</b></span>
            <span>Character: <b>{r.char_name || '—'}</b> {r.clan ? `(${r.clan})` : ''}</span>
          </div>
        </div>
      </header>

      <div className={styles.downtimeBody} style={{ padding: '1rem', gap: '0.75rem' }}>
        <label className={styles.labeledTextarea}>
          <span>Action</span>
          <textarea className={`${styles.textarea} ${styles.readOnlyTextarea}`} readOnly value={r.body || ''} />
        </label>

        {r.feeding_type && (
          <div className={styles.labeledInput}>
            <span>Feeding Type</span>
            <div className={`${styles.input} ${styles.readOnlyTextarea}`} style={{ display: 'flex', alignItems: 'center' }}>
              {r.feeding_type}
            </div>
          </div>
        )}

        <div className={styles.twoColGrid}>
          <label className={styles.labeledTextarea}>
            <span>GM Notes</span>
            <textarea
              className={styles.textarea}
              value={b.gm_notes}
              onChange={(e) => onUpdate(r.id, 'gm_notes', e.target.value)}
            />
          </label>
          <label className={styles.labeledTextarea}>
            <span>GM Resolution</span>
            <textarea
              className={`${styles.textarea} ${styles.privateNotes}`}
              value={b.gm_resolution}
              onChange={(e) => onUpdate(r.id, 'gm_resolution', e.target.value)}
            />
          </label>
        </div>

        <div className={styles.twoColGrid}>
          <label className={styles.labeledInput}>
            <span>Status</span>
            <select
              className={styles.select}
              value={b.status}
              onChange={(e) => onUpdate(r.id, 'status', e.target.value)}
              data-status={b.status}
            >
              {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <div className={styles.labeledInput}>
            <span>Quick Actions</span>
            <div className={styles.row} style={{ gap: 8, flexWrap: 'wrap' }}>
              <button
                className={`${styles.btn} ${styles.btnSuccess}`}
                onClick={() => { onUpdate(r.id, 'status', 'approved'); onSave(r.id); }}
                type="button"
              >
                Approve
              </button>
              <button
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={() => { onUpdate(r.id, 'status', 'rejected'); onSave(r.id); }}
                type="button"
              >
                Reject
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => { onUpdate(r.id, 'status', 'resolved'); onSave(r.id); }}
                type="button"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>

        <div className={styles.row} style={{ gap: 8, marginTop: 8, alignItems: 'center' }}>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => onCancel(r.id)}
            disabled={b.saving}
          >
            Close
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => onSave(r.id)}
            disabled={b.saving}
          >
            {b.saving ? 'Saving…' : 'Save Changes'}
          </button>
          {b.error && <div className={`${styles.alertMini} ${styles.alertError}`}>{b.error}</div>}
          {b.info && <div className={`${styles.alertMini} ${styles.alertInfo}`}>{b.info}</div>}
        </div>
      </div>
    </article>
  );
}