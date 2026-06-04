// src/components/admin/AdminDowntimesTab.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from "../../api";
import styles from '../../styles/Admin.module.css';

/* ---------- VTM Lookups ---------- */
const CLAN_COLORS = {
  Brujah: '#b40f1f', Gangrel: '#2f7a3a', Malkavian: '#713c8b', Nosferatu: '#6a4b2b',
  Toreador: '#b8236b', Tremere: '#7b1113', Ventrue: '#1b4c8c', 'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b', Lasombra: '#191a5a', 'The Ministry': '#865f12',
  Caitiff: '#636363', 'Thin-blood': '#6e6e2b',
};
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };
const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');
const symlogo = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png` : '');
/* ---------------------------------- */

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

const STATUS = ['submitted', 'approved', 'Needs a Scene', 'rejected', 'resolved', 'Resolved in scene'];

function StatusToggle({ status, checked, onChange }) {
  return (
    <label className={`${styles.customCheckbox} ${styles.statusToggle}`} data-status={status}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className={styles.checkmark}></span>
      <span>Hide {status}</span>
    </label>
  );
}

export default function AdminDowntimesTab() {
  const [cfgLoading, setCfgLoading] = useState(false);
  const [cfgSaving, setCfgSaving]   = useState(false);
  const [cfgErr, setCfgErr]         = useState('');
  const [cfgInfo, setCfgInfo]       = useState('');
  const [deadline, setDeadline]     = useState('');
  const [opening, setOpening]       = useState('');
  const [projectDeadline, setProjectDeadline] = useState('');
  const [masterPhase, setMasterPhase] = useState('standard'); 

  const [viewMode, setViewMode] = useState('standard');

  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr]         = useState('');
  const [rows, setRows]               = useState([]);

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [hideStatus, setHideStatus] = useState({
    submitted: false, approved: false, rejected: true,
    'Needs a Scene': false, resolved: true, 'Resolved in scene': true,
  });

  const [buffer, setBuffer] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      setCfgLoading(true);
      setCfgErr(''); setCfgInfo('');
      try {
        const { data } = await api.get('downtimes/config');
        if (!mounted) return;
        setDeadline(ymd(data?.downtime_deadline || ''));
        setOpening(ymd(data?.downtime_opening || ''));
        setProjectDeadline(ymd(data?.project_deadline || ''));
        setMasterPhase(data?.downtime_active_phase || 'standard'); 
      } catch (e) {
        if (mounted) setCfgErr('Failed to load downtime config.');
      } finally {
        if (mounted) setCfgLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function onSaveConfig(instantPhaseOverride = null) {
    const phaseToSave = instantPhaseOverride || masterPhase;
    setCfgSaving(true);
    setCfgErr(''); setCfgInfo('');
    try {
      const { data } = await api.post('admin/downtimes/config', {
        downtime_deadline: deadline || null,
        downtime_opening: opening || null,
        project_deadline: projectDeadline || null,
        downtime_active_phase: phaseToSave 
      });
      setDeadline(ymd(data?.downtime_deadline || ''));
      setOpening(ymd(data?.downtime_opening || ''));
      setProjectDeadline(ymd(data?.project_deadline || ''));
      setMasterPhase(data?.downtime_active_phase || 'standard');
      setCfgInfo('Configuration saved successfully.');
      setTimeout(() => setCfgInfo(''), 3000);
    } catch (e) {
      setCfgErr(e?.response?.data?.error || 'Failed to save dates.');
    } finally {
      setCfgSaving(false);
    }
  }

  function handlePhaseToggle(newPhase) {
    setMasterPhase(newPhase);
    onSaveConfig(newPhase); 
  }

  function onReloadConfig() {
    setCfgLoading(true);
    setCfgErr(''); setCfgInfo('');
    api.get('downtimes/config')
      .then(({ data }) => {
        setDeadline(ymd(data?.downtime_deadline || ''));
        setOpening(ymd(data?.downtime_opening || ''));
        setProjectDeadline(ymd(data?.project_deadline || ''));
        setMasterPhase(data?.downtime_active_phase || 'standard');
      })
      .catch(() => setCfgErr('Failed to reload config.'))
      .finally(() => setCfgLoading(false));
  }

  async function loadList() {
    setListLoading(true);
    setListErr('');
    try {
      const { data } = await api.get('admin/downtimes');
      setRows((data?.downtimes || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (e) {
      setListErr('Failed to load downtimes.');
    } finally {
      setListLoading(false);
    }
  }
  useEffect(() => { loadList(); }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter(r => {
      const isProj = r.title && r.title.startsWith('[PROJECT]');
      if (viewMode === 'standard' && isProj) return false;
      if (viewMode === 'project' && !isProj) return false;

      const rowStatus = String(r.status || 'submitted');
      const dropdownOk = statusFilter === 'all' || rowStatus === statusFilter;
      if (!dropdownOk) return false;
      if (hideStatus[rowStatus]) return false;
      if (!qq) return true;
      const hay = `${r.title || ''} ${r.body || ''} ${r.gm_notes || ''} ${r.gm_resolution || ''} ${r.player_name || ''} ${r.char_name || ''} ${r.clan || ''}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [rows, q, statusFilter, hideStatus, viewMode]);

  const groupedAndFiltered = useMemo(() => {
    const groups = new Map();
    for (const r of filtered) {
      const key = r.player_name || r.email || 'Unknown Player';
      if (!groups.has(key)) {
        groups.set(key, { player_name: key, char_name: r.char_name, clan: r.clan, downtimes: [] });
      }
      groups.get(key).downtimes.push(r);
    }
    return Array.from(groups.values());
  }, [filtered]);

  function toggleHideStatus(status) {
    setHideStatus(prev => ({ ...prev, [status]: !prev[status] }));
  }

  function openBuf(r) {
    setBuffer(prev => prev[r.id] ? prev : ({
      ...prev, [r.id]: { status: r.status || 'submitted', gm_notes: r.gm_notes || '', gm_resolution: r.gm_resolution || '', saving: false, error: '', info: '' }
    }));
  }
  
  function updBuf(id, key, val) {
    setBuffer(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: val } }));
  }

  async function saveRow(id, patch = {}) {
    const merged = { ...(buffer[id] || {}), ...patch };
    if (!buffer[id]) openBuf(rows.find(x => x.id === id));

    if (patch.status !== undefined) updBuf(id, 'status', patch.status);
    if (patch.gm_notes !== undefined) updBuf(id, 'gm_notes', patch.gm_notes);
    if (patch.gm_resolution !== undefined) updBuf(id, 'gm_resolution', patch.gm_resolution);

    updBuf(id, 'saving', true);
    updBuf(id, 'error', ''); updBuf(id, 'info', '');

    try {
      const payload = { status: merged.status, gm_notes: merged.gm_notes, gm_resolution: merged.gm_resolution };
      const { data } = await api.patch(`admin/downtimes/${id}`, payload);
      const updated = data?.downtime ? data.downtime : { ...rows.find(x => x.id === id), ...payload };

      setRows(prev => prev.map(x => (x.id === id ? { ...x, ...updated } : x)));
      updBuf(id, 'info', 'Saved.');

      setTimeout(() => {
        setBuffer(prev => { const next = { ...prev }; delete next[id]; return next; });
      }, 800);
    } catch (e) {
      updBuf(id, 'error', e?.response?.data?.error || 'Save failed');
      updBuf(id, 'saving', false);
    }
  }

  function cancelRow(id) {
    setBuffer(prev => { const next = { ...prev }; delete next[id]; return next; });
  }

  return (
    <div className={styles.stack12}>
      
      {/* MODE SWITCHER */}
      <div className={styles.modeSwitcher}>
        <button 
          className={`${styles.modeBtn} ${viewMode === 'standard' ? styles.modeBtnStandardActive : ''}`}
          onClick={() => setViewMode('standard')}
        >
          🦇 Standard Downtimes
        </button>
        <button 
          className={`${styles.modeBtn} ${viewMode === 'project' ? styles.modeBtnProjectActive : ''}`}
          onClick={() => setViewMode('project')}
        >
          📜 Project Actions
        </button>
      </div>

      {/* ============ Downtime Schedule (Config) ============ */}
      <section className={styles.editorSection} style={{ borderTop: `4px solid ${viewMode === 'project' ? '#1b4c8c' : '#8a0303'}` }}>
        <div className={styles.sectionHeader}>
          <h4>{viewMode === 'standard' ? 'Downtime Configuration' : 'Project Configuration'}</h4>
          <div className={styles.subtle}>Set the global dates and Active Phase visible to all players.</div>
        </div>

        {cfgLoading && <div className={styles.loading}><span className={styles.spinner} /> Loading config…</div>}
        {cfgErr && <div className={`${styles.alert} ${styles.alertError}`}>{cfgErr}</div>}
        {cfgInfo && <div className={`${styles.alert} ${styles.alertInfo}`}>{cfgInfo}</div>}

        {/* --- MASTER PHASE SWITCH --- */}
        <div className={styles.masterPhaseCard} style={{ borderLeft: masterPhase === 'project' ? '4px solid #1b4c8c' : '4px solid #8a0303' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>🌍 Master Active Phase</h4>
          <p style={{ margin: '0 0 15px 0', color: '#aaa', fontSize: '0.85rem' }}>
            Determine which tab players see <b>by default</b> when they open their actions page.
          </p>
          <div className={styles.modeSwitcher} style={{ marginBottom: 0 }}>
            <button 
              className={`${styles.modeBtn} ${masterPhase === 'standard' ? styles.modeBtnStandardActive : ''}`}
              onClick={() => handlePhaseToggle('standard')}
              disabled={cfgSaving}
            >
              🦇 Monthly Actions Active
            </button>
            <button 
              className={`${styles.modeBtn} ${masterPhase === 'project' ? styles.modeBtnProjectActive : ''}`}
              onClick={() => handlePhaseToggle('project')}
              disabled={cfgSaving}
            >
              📜 Projects Active
            </button>
          </div>
        </div>

        <div className={styles.twoColGrid}>
          {viewMode === 'standard' ? (
            <>
              <label className={styles.labeledInput}>
                <span>Downtime deadline</span>
                <input type="date" className={styles.input} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </label>
              <label className={styles.labeledInput}>
                <span>Next Modern Event date</span>
                <input type="date" className={styles.input} value={opening} onChange={(e) => setOpening(e.target.value)} />
              </label>
            </>
          ) : (
             <label className={styles.labeledInput}>
                <span>Long-Term Project Deadline</span>
                <input type="date" className={styles.input} value={projectDeadline} onChange={(e) => setProjectDeadline(e.target.value)} />
             </label>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onReloadConfig}>Reload</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onSaveConfig()} disabled={cfgSaving}>
            {cfgSaving ? 'Saving…' : 'Save Dates'}
          </button>
        </div>
      </section>

      {/* ============ Admin List ============ */}
      <section className={styles.editorSection}>
        <div className={styles.sectionHeader}>
          <h4>{viewMode === 'standard' ? 'All Downtimes' : 'All Project Actions'}</h4>
          <div className={styles.subtle}>Search, filter, and resolve player submissions.</div>
        </div>

        <div className={styles.twoColGrid} style={{ alignItems: 'end' }}>
          <label className={styles.labeledInput}>
            <span>Search</span>
            <input className={`${styles.input} ${styles.inputSearch}`} placeholder="Title, body, player, character, clan…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className={styles.labeledInput}>
            <span>Status Filter (Dropdown)</span>
            <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Show All</option>
              {STATUS.map(s => <option key={s} value={s}>{`Only ${s}`}</option>)}
            </select>
          </label>
        </div>

        <div className={styles.filterToggleGrid}>
          <StatusToggle status="submitted" checked={hideStatus.submitted} onChange={() => toggleHideStatus('submitted')} />
          <StatusToggle status="approved"  checked={hideStatus.approved}  onChange={() => toggleHideStatus('approved')} />
          <StatusToggle status="Needs a Scene"  checked={hideStatus['Needs a Scene']}  onChange={() => toggleHideStatus('Needs a Scene')} />
          <StatusToggle status="rejected"  checked={hideStatus.rejected}  onChange={() => toggleHideStatus('rejected')} />
          <StatusToggle status="resolved"  checked={hideStatus.resolved}  onChange={() => toggleHideStatus('resolved')} />
          <StatusToggle status="Resolved in scene"  checked={hideStatus['Resolved in scene']}  onChange={() => toggleHideStatus('Resolved in scene')} />
        </div>

        <div className={styles.row} style={{ gap: '0.5rem', marginTop: '0.5rem' }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { setQ(''); setStatusFilter('all'); }}>Clear filters</button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadList}>Reload list</button>
        </div>

        {listErr && <div className={`${styles.alert} ${styles.alertError}`} style={{ marginTop: '0.75rem' }}>{listErr}</div>}
        {listLoading && <div className={styles.loading} style={{ marginTop: '0.75rem' }}><span className={styles.spinner} /> Loading…</div>}

        {!listLoading && (
          <div className={styles.downtimeGroupGrid} style={{ marginTop: '1rem' }}>
            {groupedAndFiltered.length === 0 && (
              <div className={styles.placeholderCard}>
                <div className={styles.placeholderDot} />
                <h3>No submissions match your filters</h3>
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

function DowntimeEditorRow({ r, editBuffer, onOpen, onUpdate, onSave, onCancel }) {
  const editing = !!editBuffer;
  const isProj = r.title && r.title.startsWith('[PROJECT]');
  const displayTitle = isProj ? r.title.replace('[PROJECT] ', '') : r.title;

  if (!editing) {
    return (
      <div className={styles.downtimeCompactRow} data-status={(r.status || '').toLowerCase()}>
        <div className={styles.compactTitle}>
          <b>#{r.id}</b> — {displayTitle}
        </div>
        <div className={styles.compactStatus}>
          <span className={styles.statusBadge} data-status={r.status}>{r.status}</span>
        </div>
        <div className={styles.compactDate}>{niceDate(r.created_at)}</div>
        <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => onOpen(r)}>
          View
        </button>
      </div>
    );
  }

  const b = editBuffer;
  return (
    <article
      className={styles.downtimeCard}
      data-status={b.status}
      style={{ margin: '0.5rem 0', borderLeftWidth: '4px', borderLeftColor: isProj ? '#1b4c8c' : '', animation: 'fadeIn 0.3s ease-out' }}
    >
      <header className={styles.downtimeHeader} style={{ padding: '0.75rem 1rem', background: isProj ? 'rgba(27, 76, 140, 0.1)' : '' }}>
        <div className={styles.downtimeInfo}>
          <div className={styles.downtimeTitle}>
            <b>#{r.id}</b> — {displayTitle || '(no title)'} {isProj && <span style={{fontSize: '0.75rem', background: '#1b4c8c', color: '#fff', padding: '2px 6px', borderRadius: '4px', marginLeft: '10px'}}>PROJECT</span>}
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
          <textarea className={`${styles.textarea} ${styles.readOnlyTextarea}`} style={{minHeight: isProj ? '200px' : '100px'}} readOnly value={r.body || ''} />
        </label>

        {!isProj && r.feeding_type && (
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
            <textarea className={styles.textarea} value={b.gm_notes} onChange={(e) => onUpdate(r.id, 'gm_notes', e.target.value)} />
          </label>
          <label className={styles.labeledTextarea}>
            <span>GM Resolution</span>
            <textarea className={`${styles.textarea} ${styles.privateNotes}`} value={b.gm_resolution} onChange={(e) => onUpdate(r.id, 'gm_resolution', e.target.value)} />
          </label>
        </div>

        <div className={styles.twoColGrid}>
          <label className={styles.labeledInput}>
            <span>Status</span>
            <select className={styles.select} value={b.status} onChange={(e) => onUpdate(r.id, 'status', e.target.value)} data-status={b.status}>
              {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <div className={styles.labeledInput}>
            <span>Quick Actions</span>
            <div className={styles.row} style={{ gap: 8, flexWrap: 'wrap' }}>
              <button className={`${styles.btn} ${styles.btnSuccess}`} type="button" onClick={() => onSave(r.id, { status: 'approved' })}>Mark Approved</button>
              <button className={`${styles.btn}`} style={{background: '#ffc107', color: '#000'}} type="button" onClick={() => onSave(r.id, { status: 'Needs a Scene' })}>Needs Scene</button>
              <button className={`${styles.btn} ${styles.btnDanger}`} type="button" onClick={() => onSave(r.id, { status: 'rejected' })}>Reject</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} type="button" onClick={() => onSave(r.id, { status: 'resolved' })}>Resolve</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} type="button" onClick={() => onSave(r.id, { status: 'Resolved in scene' })}>Resolved in Scene</button>
            </div>
          </div>
        </div>

        <div className={styles.row} style={{ gap: 8, marginTop: 8, alignItems: 'center' }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => onCancel(r.id)} disabled={b.saving}>Close</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onSave(r.id)} disabled={b.saving}>
            {b.saving ? 'Saving…' : 'Save Changes'}
          </button>
          {b.error && <div className={`${styles.alertMini} ${styles.alertError}`}>{b.error}</div>}
          {b.info && <div className={`${styles.alertMini} ${styles.alertInfo}`}>{b.info}</div>}
        </div>
      </div>
    </article>
  );
}