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
    <label 
      className={styles.statusToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        cursor: 'pointer',
        padding: '0.6rem 1.2rem',
        background: checked ? 'rgba(255, 255, 255, 0.02)' : 'var(--glass-inset)',
        border: `1px solid ${checked ? 'var(--glass-border)' : 'var(--accent-purple)'}`,
        borderRadius: 'var(--radius-sm)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: checked ? 0.4 : 1,
        boxShadow: checked ? 'none' : '0 0 10px var(--accent-purple-glow)',
        userSelect: 'none'
      }}
    >
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange} 
        style={{ 
          width: '15px', 
          height: '15px', 
          accentColor: 'var(--accent-purple)',
          cursor: 'pointer'
        }} 
      />
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: checked ? 'var(--text-muted)' : '#ffffff' }}>
        Hide {status}
      </span>
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
      
      {/* 1. TOP INTERACTIVE VIEW OVERVIEW OVERHAUL */}
      <div style={{ display: 'flex', gap: '0.8rem', background: 'var(--glass-inset)', padding: '5px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', width: 'fit-content' }}>
        <button 
          className={styles.tab}
          style={{ 
            background: viewMode === 'standard' ? 'linear-gradient(135deg, var(--accent-purple-dark) 0%, var(--accent-purple) 100%)' : 'transparent', 
            color: viewMode === 'standard' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: viewMode === 'standard' ? '0 4px 15px var(--accent-purple-glow)' : 'none',
            padding: '0.8rem 1.8rem', 
            borderRadius: 'var(--radius-md)', 
            fontWeight: 800 
          }}
          onClick={() => setViewMode('standard')}
        >
          🦇 Standard Downtimes
        </button>
        <button 
          className={styles.tab}
          style={{ 
            background: viewMode === 'project' ? 'linear-gradient(135deg, #1b4c8c 0%, #4da6ff 100%)' : 'transparent', 
            color: viewMode === 'project' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: viewMode === 'project' ? '0 4px 15px rgba(77, 166, 255, 0.4)' : 'none',
            padding: '0.8rem 1.8rem', 
            borderRadius: 'var(--radius-md)', 
            fontWeight: 800 
          }}
          onClick={() => setViewMode('project')}
        >
          📜 Project Actions
        </button>
      </div>

      {/* ============ Downtime Schedule (Config Panel) ============ */}
      <section className={styles.editorSection} style={{ borderTop: `4px solid ${viewMode === 'project' ? '#4da6ff' : 'var(--accent-purple)'}`, background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--glass-shadow)' }}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: 0, color: viewMode === 'project' ? '#4da6ff' : 'var(--accent-purple)', fontSize: '1.4rem', fontWeight: 800 }}>
            {viewMode === 'standard' ? 'Downtime Configuration' : 'Project Configuration'}
          </h4>
          <div className={styles.subtle}>Adjust parameters, view deadlines, and configure core structural settings.</div>
        </div>

        {cfgLoading && <div className={styles.loading}><span className={styles.spinner} /> Syncing system configurations…</div>}
        {cfgErr && <div className={`${styles.alert} ${styles.alertError}`}>{cfgErr}</div>}
        {cfgInfo && <div className={`${styles.alert} ${styles.alertInfo}`}>{cfgInfo}</div>}

        {/* --- SYSTEM PHASE INTERACTIVE OVERRIDE --- */}
        <div style={{ background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', borderLeft: masterPhase === 'project' ? '4px solid #4da6ff' : '4px solid var(--accent-purple)', marginBottom: '2rem', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.4)' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>🌍 Master Active Phase Target</h4>
          <p style={{ margin: '0 0 15px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Sets the default baseline view shown to all users inside their action panels.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button 
              className={styles.btn}
              style={{ background: masterPhase === 'standard' ? 'linear-gradient(135deg, var(--accent-purple-dark) 0%, var(--accent-purple) 100%)' : 'rgba(255,255,255,0.03)', border: `1px solid ${masterPhase === 'standard' ? 'transparent' : 'var(--glass-border)'}`, color: '#ffffff', fontWeight: 700 }}
              onClick={() => handlePhaseToggle('standard')}
              disabled={cfgSaving}
            >
              🦇 Monthly Actions Active
            </button>
            <button 
              className={styles.btn}
              style={{ background: masterPhase === 'project' ? 'linear-gradient(135deg, #1b4c8c 0%, #4da6ff 100%)' : 'rgba(255,255,255,0.03)', border: `1px solid ${masterPhase === 'project' ? 'transparent' : 'var(--glass-border)'}`, color: '#ffffff', fontWeight: 700 }}
              onClick={() => handlePhaseToggle('project')}
              disabled={cfgSaving}
            >
              📜 Projects Active
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onReloadConfig}>Reset Configuration</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onSaveConfig()} disabled={cfgSaving}>
            {cfgSaving ? 'Updating...' : 'Save Operations Schema'}
          </button>
        </div>
      </section>

      {/* ============ Admin List Panel ============ */}
      <section className={styles.editorSection} style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--glass-shadow)' }}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: 0, color: 'var(--accent-purple)', fontSize: '1.4rem', fontWeight: 800 }}>
            {viewMode === 'standard' ? 'Submissions Ledger' : 'Project Registry'}
          </h4>
          <div className={styles.subtle}>Inspect, evaluate, modify, and process narrative logs.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'end', marginBottom: '1.5rem' }}>
          <label className={styles.labeledInput}>
            <span>Search Pipeline</span>
            <input className={styles.input} placeholder="Type query tags (character, action detail, clan details)..." value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className={styles.labeledInput}>
            <span>Status Pipeline View</span>
            <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Display All Operations</option>
              {STATUS.map(s => <option key={s} value={s}>{`Only ${s}`}</option>)}
            </select>
          </label>
        </div>

        <div className={styles.filterToggleGrid} style={{ background: 'var(--glass-inset)', padding: '1.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', display: 'flex', flexWrap: 'wrap', gap: '1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }}>
          {STATUS.map(st => (
            <StatusToggle key={st} status={st} checked={hideStatus[st]} onChange={() => toggleHideStatus(st)} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { setQ(''); setStatusFilter('all'); }}>Clear Filter Pipelines</button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadList}>Sync Records</button>
        </div>

        {listErr && <div className={`${styles.alert} ${styles.alertError}`} style={{ marginTop: '1.5rem' }}>{listErr}</div>}
        {listLoading && <div className={styles.loading} style={{ marginTop: '1.5rem' }}><span className={styles.spinner} /> Syncing live ledger entries…</div>}

        {!listLoading && (
          <div style={{ display: 'grid', gap: '2rem', marginTop: '2rem' }}>
            {groupedAndFiltered.length === 0 && (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--glass-inset)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--glass-border)', opacity: 0.7 }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🗄️</span>
                <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.3rem' }}>No data matching parameters</h3>
                <p className={styles.subtle} style={{ marginTop: '0.4rem' }}>Adjust queries or modify parameters to retrieve dormant records.</p>
              </div>
            )}

            {groupedAndFiltered.map(group => {
              const clanColor = CLAN_COLORS[group.clan] || 'var(--accent-purple)';
              const clanLogoUrl = symlogo(group.clan);
              return (
                <div
                  key={group.player_name}
                  className={styles.playerDowntimeGroup}
                  style={{
                    '--clan-color': clanColor,
                    '--clan-logo-url': clanLogoUrl ? `url(${clanLogoUrl})` : 'none',
                    background: 'rgba(10, 10, 15, 0.4)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    borderLeft: `6px solid ${clanColor}`,
                    backdropFilter: 'var(--glass-blur)'
                  }}
                >
                  <header style={{ padding: '1.25rem 1.5rem', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ width: '44px', height: '44px', backgroundImage: clanLogoUrl ? `url(${clanLogoUrl})` : 'none', backgroundSize: 'cover', borderRadius: '50%', border: `2px solid ${clanColor}`, backgroundColor: 'rgba(255,255,255,0.95)', boxShadow: `0 0 15px ${clanColor}44` }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{group.char_name || '(No Character)'}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'Fira Code, monospace', opacity: 0.8 }}>{group.player_name}</span>
                    </div>
                  </header>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
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
      <div 
        className={styles.downtimeCompactRow}
        style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '1.5rem', padding: '1.2rem 1.5rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: 'transparent', transition: 'all 0.2s ease' }} 
        onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        onClick={() => onOpen(r)}
      >
        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          <b style={{ color: 'var(--accent-purple)', fontFamily: 'Fira Code, monospace', marginRight: '10px' }}>#{r.id}</b> {displayTitle}
        </div>
        <div style={{ fontFamily: 'Fira Code, monospace', fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{niceDate(r.created_at)}</div>
        <div>
          <span className={styles.statusBadge} data-status={r.status}>{r.status}</span>
        </div>
      </div>
    );
  }

  const b = editBuffer;
  return (
    <article
      className={styles.downtimeCard}
      style={{ background: 'var(--glass-inset)', border: '1px solid var(--glass-border)', padding: '1.5rem', margin: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)', borderLeft: `4px solid ${isProj ? '#4da6ff' : 'var(--accent-purple)'}` }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ fontSize: '1.25rem', color: '#ffffff', fontWeight: 800, letterSpacing: '-0.02em' }}>
            <b style={{ color: isProj ? '#4da6ff' : 'var(--accent-purple)', fontFamily: 'Fira Code, monospace', marginRight: '8px' }}>#{r.id}</b> {displayTitle || '(no title)'} 
            {isProj && <span style={{fontSize: '0.7rem', background: '#1b4c8c', border: '1px solid #4da6ff', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', marginLeft: '12px', verticalAlign: 'middle', fontWeight: 900, letterSpacing: '1px'}}>LONG-TERM PROJECT</span>}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Account: <b style={{ color: 'var(--text-secondary)' }}>{r.player_name || r.email}</b></span>
            <span>Subject: <b style={{ color: 'var(--text-secondary)' }}>{r.char_name || '—'}</b> {r.clan ? `[${r.clan}]` : ''}</span>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <label className={styles.labeledInput}>
          <span>Kindred Activity Record Log</span>
          <textarea className={styles.textarea} style={{ minHeight: isProj ? '220px' : '120px', background: 'rgba(0, 0, 0, 0.4)', borderStyle: 'dashed', opacity: 0.85, color: '#e0e0e5' }} readOnly value={r.body || ''} />
        </label>

        {!isProj && r.feeding_type && (
          <label className={styles.labeledInput}>
            <span>Feeding Methodology Vector</span>
            <div className={styles.input} style={{ background: 'rgba(0, 0, 0, 0.4)', borderStyle: 'dashed', opacity: 0.85, display: 'flex', alignItems: 'center', height: '44px', color: 'var(--accent-purple)', fontWeight: 700 }}>
              {r.feeding_type}
            </div>
          </label>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <label className={styles.labeledInput}>
            <span>GM Internal Infrastructure Notes</span>
            <textarea className={styles.textarea} value={b.gm_notes} onChange={(e) => onUpdate(r.id, 'gm_notes', e.target.value)} placeholder="Write secure internal comments hidden from character dashboard logs..." />
          </label>
          <label className={styles.labeledInput}>
            <span>GM Transmission Feedback (Dispatched To Character)</span>
            <textarea className={styles.textarea} style={{ background: 'rgba(157, 124, 25ff, 0.03)', borderLeft: '3px solid var(--accent-purple)' }} value={b.gm_resolution} onChange={(e) => onUpdate(r.id, 'gm_resolution', e.target.value)} placeholder="Write resolution notes visible to character upon final completion..." />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
          <label className={styles.labeledInput}>
            <span>Registry Status State</span>
            <select className={styles.select} value={b.status} onChange={(e) => onUpdate(r.id, 'status', e.target.value)}>
              {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <div className={styles.labeledInput}>
            <span>Macro Processing Protocols</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              <button className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`} type="button" onClick={() => onSave(r.id, { status: 'approved' })}>Approve</button>
              <button className={`${styles.btn} ${styles.btnWarning} ${styles.btnSmall}`} type="button" onClick={() => onSave(r.id, { status: 'Needs a Scene' })}>Needs Scene</button>
              <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} type="button" onClick={() => onSave(r.id, { status: 'rejected' })}>Reject</button>
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} type="button" onClick={() => onSave(r.id, { status: 'resolved' })}>Resolve</button>
              <button className={styles.btn} style={{ background: 'linear-gradient(135deg, #1b4c8c 0%, #4da6ff 100%)', color: '#ffffff', padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: 'var(--radius-sm)' }} type="button" onClick={() => onSave(r.id, { status: 'Resolved in scene' })}>In Scene</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => onCancel(r.id)} disabled={b.saving}>Discard & Terminate Terminal</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onSave(r.id)} disabled={b.saving} style={{ marginLeft: 'auto' }}>
            {b.saving ? 'Commiting Changes...' : 'Commit Operational Record'}
          </button>
          {b.error && <div className={`${styles.alertMini} ${styles.alertError}`}>{b.error}</div>}
          {b.info && <div className={`${styles.alertMini} ${styles.alertInfo}`}>{b.info}</div>}
        </div>
      </div>
    </article>
  );
}