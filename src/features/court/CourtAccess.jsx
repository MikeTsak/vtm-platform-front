import React, { useEffect, useState } from 'react';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/court/CourtActions.module.css';

const Icon = ({ name, size = 18 }) => (
  <span className="material-symbols-outlined" style={{ fontSize: size }} aria-hidden="true">{name}</span>
);

/**
 * Offers to bring account roles in line with the Hierarchy: whoever holds a
 * main-court office should be a court user, and a court user holding none
 * should not. `items` come from the server (camarilla.js courtAccessMismatches).
 * Nothing changes without the Storyteller ticking it.
 */
export function CourtAccessModal({ items, onClose }) {
  const [picked, setPicked] = useState(() => new Set(items.map(i => i.user_id)));
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    try {
      for (const i of items.filter(x => picked.has(x.user_id))) {
        await api.patch(`/admin/users/${i.user_id}`, { role: i.suggested_role });
      }
      onClose();
    } catch (e) {
      alert(formatApiError(e, 'A role could not be changed.'));
    } finally { setBusy(false); }
  };

  const toggle = (id) => setPicked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 11000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div className={styles.panel} style={{ maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Court access">
        <h2 className={styles.panelTitle}><Icon name="admin_panel_settings" /> Court access</h2>
        <p className={styles.hint}>Holding a main-court office (Prince, Seneschal, Sheriff, Keeper, Harpy, Assistant Harpy, Hound, Shadow, Scourge) is what makes an account a court user, which opens Court Actions. Former office holders (Ex) do not count.</p>
        <div className={styles.list}>
          {items.map(i => (
            <label key={i.user_id} className={styles.item} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={picked.has(i.user_id)} onChange={() => toggle(i.user_id)} style={{ width: 18, height: 18, marginTop: 4 }} />
              <span>
                <b>{i.name}</b>
                <span className={styles.itemMeta} style={{ display: 'block' }}>
                  {i.suggested_role === 'courtuser'
                    ? `Holds ${i.offices.join(', ')}. Make their account a court user.`
                    : 'Holds no main-court office. Return their account to a regular user.'}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className={styles.row} style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button className={styles.btn} onClick={onClose} disabled={busy}>Not now</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={apply} disabled={busy || !picked.size}>Apply</button>
        </div>
      </div>
    </div>
  );
}

/** Active Blood Hunts and the Sheriff's board, read-only, for every player. */
export function CourtNotices() {
  const [hunts, setHunts] = useState([]);
  const [wanted, setWanted] = useState([]);

  useEffect(() => {
    api.get('/court-actions/blood-hunts').then(({ data }) => setHunts((data.hunts || []).filter(h => h.status === 'active'))).catch(() => {});
    api.get('/court-actions/wanted').then(({ data }) => setWanted(data.wanted || [])).catch(() => {});
  }, []);

  if (!hunts.length && !wanted.length) return null;
  return (
    <section className={styles.grid2} style={{ margin: '1rem 0' }} aria-label="Proclamations of the court">
      {hunts.length > 0 && (
        <div className={styles.panel} style={{ borderColor: 'rgba(255,82,82,0.5)' }}>
          <h3 className={styles.panelTitle}><Icon name="bloodtype" /> Blood Hunt</h3>
          <div className={styles.list}>
            {hunts.map(h => (
              <div key={h.id} className={`${styles.item} ${styles.huntActive}`}>
                <div className={styles.itemName}>{h.target_name}</div>
                <p className={styles.itemBody}>{h.reason}</p>
                <div className={styles.itemMeta}>By order of the Prince{h.expires_at ? ` · until ${new Date(h.expires_at).toLocaleDateString('en-GB', { timeZone: 'Europe/Athens' })}` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {wanted.length > 0 && (
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}><Icon name="person_search" /> Sought by the Sheriff</h3>
          <div className={styles.list}>
            {wanted.map(w => (
              <div key={w.id} className={styles.item}>
                <div className={styles.itemName}>{w.target_name}</div>
                <p className={styles.itemBody}>{w.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
