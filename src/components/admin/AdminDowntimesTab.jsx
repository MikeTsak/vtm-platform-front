// src/pages/AdminDowntimesTab.jsx
import React, { useMemo, useState } from 'react';
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

export default function AdminDowntimesTab({ rows = [], onSave }) {
  const [filter, setFilter] = useState('');
  const [edits, setEdits] = useState({}); // id -> { status, gm_notes, gm_resolution }

  // Ensure rows is always an array
  const safeRows = Array.isArray(rows) ? rows : [];

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return safeRows;
    return safeRows.filter(d =>
      String(d.id).includes(q) ||
      (d.title || '').toLowerCase().includes(q) ||
      (d.player_name || '').toLowerCase().includes(q) ||
      (d.char_name || '').toLowerCase().includes(q) ||
      (d.clan || '').toLowerCase().includes(q) ||
      (d.status || '').toLowerCase().includes(q)
    );
  }, [safeRows, filter]);

  function getRow(d) {
    // This now correctly fills from the 'd' (downtime) object
    return edits[d.id] ?? {
      status: d.status || 'submitted',
      gm_notes: d.gm_notes || '',
      gm_resolution: d.gm_resolution || '',
    };
  }
  function setRow(d, patch) {
    setEdits(prev => ({ ...prev, [d.id]: { ...getRow(d), ...patch } }));
  }
  function save(d, extraPatch = {}) {
    const payload = { ...getRow(d), ...extraPatch };
    onSave(d.id, payload);
  }

  const statuses = ['submitted','approved','rejected','resolved'];

  return (
    <div className={styles.stack12}>
      <h3>Downtimes</h3>

      <div className={styles.sideHeader} style={{ marginBottom: 8 }}>
        <input
          className={styles.inputSearch}
          placeholder="Search by #id / title / player / character / status…"
          value={filter}
          onChange={e=>setFilter(e.target.value)}
        />
      </div>

      {!filtered.length && <div className={styles.subtle}>No downtimes found.</div>}

      <div className={styles.downtimeCardGrid}>
        {filtered.map(d => {
          const clanColor = CLAN_COLORS[d.clan] || 'var(--border-color)';
          const clanLogoUrl = symlogo(d.clan);
          const currentStatus = getRow(d).status;
          
          return (
            <div 
              key={d.id} 
              className={styles.downtimeCard}
              style={{
                '--clan-color': clanColor,
                '--clan-logo-url': clanLogoUrl ? `url(${clanLogoUrl})` : 'none'
              }}
              data-status={currentStatus}
            >
              <div className={styles.downtimeHeader}>
                <div className={styles.downtimeInfo}>
                  <div className={styles.downtimeTitle}><b>#{d.id}</b> — <b>{d.title}</b></div>
                  <div className={styles.downtimeMeta}>
                    <span>By {d.player_name}</span>
                    <span>Character: {d.char_name} ({d.clan})</span>
                    <span>Created: {new Date(d.created_at).toLocaleString()}</span>
                    {d.resolved_at && <span>Resolved: {new Date(d.resolved_at).toLocaleString()}</span>}
                  </div>
                  {d.feeding_type && <div className={styles.downtimeMeta}><span>Feeding: {d.feeding_type}</span></div>}
                </div>

                <div className={styles.downtimeActions}>
                  <select
                    className={styles.select}
                    value={currentStatus}
                    onChange={e=>setRow(d, { status: e.target.value })}
                    data-status={currentStatus}
                  >
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={()=>save(d)}>Save</button>
                  <button className={`${styles.btn} ${styles.btnSuccess}`} onClick={()=>save(d, { status:'approved' })}>Approve</button>
                  <button className={`${styles.btn} ${styles.btnDanger}`} onClick={()=>save(d, { status:'rejected' })}>Reject</button>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={()=>save(d, { status:'resolved' })}>Resolve</button>
                </div>
              </div>

              <div className={styles.downtimeBody}>
                <label className={styles.labeledTextarea}>
                  <span>Player Submission</span>
                  <textarea 
                    value={d.body} 
                    readOnly 
                    rows={4} 
                    className={`${styles.textarea} ${styles.readOnlyTextarea}`} 
                  />
                </label>

                <label className={styles.labeledTextarea}>
                  <span>GM Resolution (visible to player)</span>
                  <textarea
                    className={styles.textarea}
                    value={getRow(d).gm_notes}
                    onChange={e=>setRow(d, { gm_notes: e.target.value })}
                    rows={3}
                    placeholder="What happened as a result of this downtime..."
                  />
                </label>

                <label className={styles.labeledTextarea}>
                  <span>GM Notes (private)</span>
                  <textarea
                    className={`${styles.textarea} ${styles.privateNotes}`}
                    value={getRow(d).gm_resolution}
                    onChange={e=>setRow(d, { gm_resolution: e.target.value })}
                    rows={4}
                    placeholder="Private notes for tracking/rulings…"
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <p className={styles.subtle} style={{ marginTop:8 }}>
        Uses <code className={styles.kbd}>GET /admin/downtimes</code> and <code className={styles.kbd}>PATCH /admin/downtimes/:id</code>.
      </p>
    </div>
  );
}