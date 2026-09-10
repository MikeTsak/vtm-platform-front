// src/features/admin/AdminClaimsTab.jsx
//
// The "Domains" admin tab. Assigning / releasing divisions and ruling on claim
// petitions all happen on the player-facing Domains map now (the dossier), so
// this tab is exactly one thing: the roster of DOMAIN STEWARDS — the non-admin
// users allowed to do that.
//
// A steward can act on EVERY division, not a specific one. Admins can always do
// all of it and are never stored here.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../../styles/Admin.module.css';
import api from '../../core/api';

export default function AdminClaimsTab({ users = [] }) {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState('');
  const [err, setErr] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    api.get('/domain-claims/managers')
      .then(res => setManagers(res.data.managers || []))
      .catch(e => setErr(e.response?.data?.error || 'Failed to load Domain Stewards'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const stewardIds = useMemo(() => new Set(managers.map(m => m.user_id)), [managers]);
  const addable = useMemo(
    () => (users || [])
      .filter(u => u.role !== 'admin' && !stewardIds.has(u.id))
      .sort((a, b) => (a.display_name || a.email || '').localeCompare(b.display_name || b.email || '')),
    [users, stewardIds],
  );

  async function add() {
    const id = Number(pick);
    if (!Number.isInteger(id)) return;
    setBusy(true); setErr('');
    try {
      const res = await api.post('/domain-claims/managers', { user_id: id });
      setManagers(res.data.managers || []);
      setPick('');
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to add steward');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    setBusy(true); setErr('');
    try {
      const res = await api.delete(`/domain-claims/managers/${id}`);
      setManagers(res.data.managers || []);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to remove steward');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.stack12} style={{ maxWidth: 720 }}>
      <div>
        <h2 className={styles.hl} style={{ margin: 0 }}>Domain Stewards</h2>
        <p className={styles.subtle} style={{ margin: '0.4rem 0 0', lineHeight: 1.55 }}>
          The non-admins allowed to run the Athens claims map — approve or deny claim petitions,
          assign a division to a character or NPC, and release one. A steward can do this on{' '}
          <b>every division</b>, not just one. Admins can always do all of it and are not listed
          here. Remove someone and their access is gone immediately.
        </p>
      </div>

      <div className={styles.sidePanel} style={{ padding: '1rem' }}>
        {loading ? (
          <div className={styles.subtle}>Loading…</div>
        ) : managers.length === 0 ? (
          <div className={styles.subtle} style={{ fontStyle: 'italic' }}>
            No stewards yet — only administrators can manage domains.
          </div>
        ) : (
          <div className={styles.stack12}>
            {managers.map(m => (
              <div
                key={m.user_id}
                className={styles.row}
                style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--glass-border)' }}
              >
                <div style={{ minWidth: 0 }}>
                  <b style={{ color: 'var(--text-primary)' }}>{m.name}</b>
                  <small className={styles.subtle} style={{ display: 'block' }}>
                    {m.account}
                    {m.clan ? ` · ${m.clan}` : ''}
                    {m.role === 'courtuser' ? ' · court user' : ''}
                    {m.granted_by_name ? ` · added by ${m.granted_by_name}` : ''}
                  </small>
                </div>
                <button className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={() => remove(m.user_id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.row} style={{ gap: '0.5rem', marginTop: '1rem' }}>
          <select
            className={styles.select}
            value={pick}
            onChange={e => setPick(e.target.value)}
            style={{ flex: 1, minWidth: 0 }}
          >
            <option value="">— choose a user to make a steward —</option>
            {addable.map(u => (
              <option key={u.id} value={u.id}>
                {(u.display_name || u.email)}
                {u.char_name ? ` (${u.char_name})` : ''}
                {u.role === 'courtuser' ? ' — court' : ''}
              </option>
            ))}
          </select>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={!pick || busy} onClick={add}>
            Add Steward
          </button>
        </div>

        {err && <div style={{ color: 'var(--accent-red, #f87171)', fontSize: '0.85rem', marginTop: '0.6rem' }}>{err}</div>}
      </div>
    </div>
  );
}
