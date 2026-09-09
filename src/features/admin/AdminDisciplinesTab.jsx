// src/features/admin/AdminDisciplinesTab.jsx
//
// Out-of-clan discipline access: approve/reject player requests, or grant
// access directly with no request involved. Backed by routes/disciplineAccess.js
// (discipline_access + discipline_requests tables) — see that file for the
// server-side gate this actually enforces at XP-spend time.
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import MiniSearch from 'minisearch';
import { ALL_DISCIPLINE_NAMES } from '../../data/disciplines';
import { CLAN_HEX as CLAN_COLORS } from '../../data/clans';
import { formatEuDate } from '../../utils/dateFormatter';

const cardStyle = { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--glass-shadow)', backdropFilter: 'blur(10px)' };
const thStyle = { padding: '0.7rem 0.9rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'left' };
const tdStyle = { padding: '0.7rem 0.9rem', verticalAlign: 'top' };

function CharBadge({ name, clan }) {
  const color = CLAN_COLORS[clan] || 'var(--text-secondary)';
  return (
    <div>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{name}</div>
      <div style={{ color, fontSize: '0.78rem', fontWeight: 600 }}>{clan}</div>
    </div>
  );
}

export default function AdminDisciplinesTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [access, setAccess] = useState([]);
  const [requests, setRequests] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [busyKey, setBusyKey] = useState(null);

  // Approve-in-progress editable fields, keyed by request id.
  const [approveDrafts, setApproveDrafts] = useState({});

  // Direct-grant form
  const [grantCharQuery, setGrantCharQuery] = useState('');
  const [grantCharId, setGrantCharId] = useState(null);
  const [grantDiscipline, setGrantDiscipline] = useState('');
  const [grantLevel, setGrantLevel] = useState(1);
  const [grantNote, setGrantNote] = useState('');
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantMsg, setGrantMsg] = useState('');

  const [accessSearch, setAccessSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [{ data: queue }, { data: charData }] = await Promise.all([
        api.get('/admin/discipline-access'),
        api.get('/admin/characters'),
      ]);
      setAccess(queue.access || []);
      setRequests(queue.requests || []);
      setCharacters((charData.characters || []).map(c => ({
        id: c.id, name: c.name, clan: c.clan,
      })));
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load discipline access data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = useMemo(() => requests.filter(r => r.status === 'pending'), [requests]);
  const resolved = useMemo(() => requests.filter(r => r.status !== 'pending'), [requests]);

  const charOptions = useMemo(() => {
    if (!grantCharQuery.trim()) return characters.slice(0, 8);
    const ms = new MiniSearch({ fields: ['name', 'clan'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
    ms.addAll(characters);
    const hits = ms.search(grantCharQuery.trim());
    const idSet = new Set(hits.map(h => h.id));
    return characters.filter(c => idSet.has(c.id)).slice(0, 8);
  }, [characters, grantCharQuery]);

  const filteredAccess = useMemo(() => {
    if (!accessSearch.trim()) return access;
    const q = accessSearch.trim().toLowerCase();
    return access.filter(a =>
      a.character_name?.toLowerCase().includes(q) ||
      a.discipline?.toLowerCase().includes(q) ||
      a.player_name?.toLowerCase().includes(q)
    );
  }, [access, accessSearch]);

  async function approve(req) {
    const draft = approveDrafts[req.id] || {};
    const grantedLevel = Number(draft.level ?? req.requested_level);
    setBusyKey(`approve-${req.id}`);
    try {
      await api.post(`/admin/discipline-requests/${req.id}/approve`, {
        grantedLevel,
        adminNote: draft.note || undefined,
      });
      await load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to approve request.');
    } finally {
      setBusyKey(null);
    }
  }

  async function reject(req, note) {
    setBusyKey(`reject-${req.id}`);
    try {
      await api.post(`/admin/discipline-requests/${req.id}/reject`, { adminNote: note || undefined });
      await load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to reject request.');
    } finally {
      setBusyKey(null);
    }
  }

  async function revoke(row) {
    if (!window.confirm(`Revoke ${row.character_name}'s access to ${row.discipline}?`)) return;
    setBusyKey(`revoke-${row.id}`);
    try {
      await api.delete(`/admin/characters/${row.character_id}/discipline-access/${encodeURIComponent(row.discipline)}`);
      await load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to revoke access.');
    } finally {
      setBusyKey(null);
    }
  }

  async function submitDirectGrant() {
    setGrantMsg('');
    const discipline = grantDiscipline.trim();
    if (!grantCharId) { setGrantMsg('Pick a character first.'); return; }
    if (!discipline) { setGrantMsg('Pick a discipline.'); return; }
    setGrantBusy(true);
    try {
      await api.post(`/admin/characters/${grantCharId}/discipline-access`, {
        discipline,
        maxLevel: Number(grantLevel),
        note: grantNote.trim() || undefined,
      });
      setGrantMsg(`Granted ${discipline} up to level ${grantLevel}.`);
      setGrantDiscipline('');
      setGrantNote('');
      await load();
    } catch (e) {
      setGrantMsg(e.response?.data?.error || 'Failed to grant access.');
    } finally {
      setGrantBusy(false);
    }
  }

  const selectedChar = characters.find(c => c.id === grantCharId);

  return (
    <div className={styles.stack12}>
      <div>
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Discipline Access</h3>
        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          A character can only buy dots in a discipline outside their clan once it's unlocked here —
          either you grant it directly, or a player requests it from their Disciplines tab and you approve it below.
        </p>
      </div>

      {err && (
        <div style={{ background: 'rgba(255,77,77,0.1)', border: '1px solid var(--color-error)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
          {err}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading discipline access…</div>
      ) : (
        <>
          {/* ---------- Pending requests ---------- */}
          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>
              Pending Requests {pending.length > 0 && <span style={{ color: 'var(--accent-purple)' }}>({pending.length})</span>}
            </h4>
            {pending.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>No pending requests.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pending.map(req => {
                  const draft = approveDrafts[req.id] || {};
                  return (
                    <div key={req.id} style={{ background: 'var(--glass-inset)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: '160px' }}>
                        <CharBadge name={req.character_name} clan={req.character_clan} />
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '4px' }}>{req.player_name}</div>
                      </div>

                      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {req.discipline} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>— requested to level {req.requested_level}</span>
                        </div>
                        {req.message && (
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px', fontStyle: 'italic' }}>
                            "{req.message}"
                          </div>
                        )}
                        <div style={{ color: 'var(--text-muted, var(--text-secondary))', fontSize: '0.75rem', marginTop: '4px' }}>
                          {formatEuDate(req.created_at)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <label className={styles.labeledInput} style={{ width: '90px' }}>
                          <span>Grant to</span>
                          <select
                            className={styles.select}
                            value={draft.level ?? req.requested_level}
                            onChange={e => setApproveDrafts(prev => ({ ...prev, [req.id]: { ...prev[req.id], level: e.target.value } }))}
                          >
                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Lv {n}</option>)}
                          </select>
                        </label>
                        <label className={styles.labeledInput} style={{ width: '180px' }}>
                          <span>Note (optional)</span>
                          <input
                            className={styles.input}
                            placeholder="Reason, for your records"
                            value={draft.note || ''}
                            onChange={e => setApproveDrafts(prev => ({ ...prev, [req.id]: { ...prev[req.id], note: e.target.value } }))}
                          />
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                          <button
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            disabled={busyKey === `approve-${req.id}`}
                            onClick={() => approve(req)}
                          >
                            {busyKey === `approve-${req.id}` ? 'Approving…' : 'Approve'}
                          </button>
                          <button
                            className={`${styles.btn} ${styles.btnDanger}`}
                            disabled={busyKey === `reject-${req.id}`}
                            onClick={() => {
                              const note = window.prompt('Reason for the player (optional):', '');
                              if (note === null) return; // cancelled — leave the request pending
                              reject(req, note);
                            }}
                          >
                            {busyKey === `reject-${req.id}` ? 'Rejecting…' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ---------- Direct grant ---------- */}
          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>Grant Directly</h4>
            <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Skip the request queue — unlock a discipline for a character right now.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label className={styles.labeledInput} style={{ flex: '1 1 220px', position: 'relative' }}>
                <span>Character</span>
                <input
                  className={styles.input}
                  placeholder="Search by name or clan…"
                  value={grantCharId ? `${selectedChar?.name} (${selectedChar?.clan})` : grantCharQuery}
                  onChange={e => { setGrantCharId(null); setGrantCharQuery(e.target.value); }}
                />
                {!grantCharId && grantCharQuery.trim() && charOptions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--surface-color, #141414)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', marginTop: '4px', maxHeight: '220px', overflowY: 'auto' }}>
                    {charOptions.map(c => (
                      <div
                        key={c.id}
                        onClick={() => { setGrantCharId(c.id); setGrantCharQuery(''); }}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ color: 'var(--text-primary)' }}>{c.name}</span>{' '}
                        <span style={{ color: CLAN_COLORS[c.clan] || 'var(--text-secondary)', fontSize: '0.82rem' }}>{c.clan}</span>
                      </div>
                    ))}
                  </div>
                )}
              </label>

              <label className={styles.labeledInput} style={{ flex: '1 1 200px' }}>
                <span>Discipline</span>
                <input
                  className={styles.input}
                  list="admin-discipline-names"
                  placeholder="e.g. Protean"
                  value={grantDiscipline}
                  onChange={e => setGrantDiscipline(e.target.value)}
                />
                <datalist id="admin-discipline-names">
                  {ALL_DISCIPLINE_NAMES.map(n => <option key={n} value={n} />)}
                </datalist>
              </label>

              <label className={styles.labeledInput} style={{ width: '110px' }}>
                <span>Up to level</span>
                <select className={styles.select} value={grantLevel} onChange={e => setGrantLevel(e.target.value)}>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Lv {n}</option>)}
                </select>
              </label>

              <label className={styles.labeledInput} style={{ flex: '1 1 200px' }}>
                <span>Note (optional)</span>
                <input className={styles.input} placeholder="Why — for your own records" value={grantNote} onChange={e => setGrantNote(e.target.value)} />
              </label>

              <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={grantBusy} onClick={submitDirectGrant}>
                {grantBusy ? 'Granting…' : 'Grant Access'}
              </button>
            </div>
            {grantMsg && <div style={{ marginTop: '10px', color: grantMsg.startsWith('Granted') ? 'var(--color-success)' : 'var(--color-error)', fontSize: '0.85rem' }}>{grantMsg}</div>}
          </div>

          {/* ---------- Active grants ---------- */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Active Grants ({access.length})</h4>
              <input
                className={styles.input}
                style={{ width: '260px' }}
                placeholder="Search character or discipline…"
                value={accessSearch}
                onChange={e => setAccessSearch(e.target.value)}
              />
            </div>
            {filteredAccess.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                {access.length === 0 ? 'No out-of-clan disciplines have been unlocked yet.' : 'No grants match your search.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                      <th style={thStyle}>Character</th>
                      <th style={thStyle}>Discipline</th>
                      <th style={thStyle}>Up to</th>
                      <th style={thStyle}>Note</th>
                      <th style={thStyle}>Granted</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccess.map(row => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={tdStyle}><CharBadge name={row.character_name} clan={row.character_clan} /></td>
                        <td style={tdStyle}>{row.discipline}</td>
                        <td style={tdStyle}>Level {row.max_level}</td>
                        <td style={{ ...tdStyle, color: 'var(--text-secondary)', maxWidth: '240px' }}>{row.note || '—'}</td>
                        <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {formatEuDate(row.granted_at)}{row.granted_by_name ? ` · ${row.granted_by_name}` : ''}
                        </td>
                        <td style={tdStyle}>
                          <button
                            className={`${styles.btn} ${styles.btnGhost}`}
                            disabled={busyKey === `revoke-${row.id}`}
                            onClick={() => revoke(row)}
                          >
                            {busyKey === `revoke-${row.id}` ? 'Revoking…' : 'Revoke'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ---------- Recent decisions ---------- */}
          {resolved.length > 0 && (
            <div style={cardStyle}>
              <h4 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>Recent Decisions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {resolved.map(req => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '10px 14px', background: 'var(--glass-inset)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', borderLeft: `4px solid ${req.status === 'approved' ? 'var(--color-success)' : 'var(--color-error)'}` }}>
                    <div>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{req.character_name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}> — {req.discipline} (asked for {req.requested_level}{req.granted_level ? `, granted ${req.granted_level}` : ''})</span>
                      {req.admin_note && <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontStyle: 'italic', marginTop: '2px' }}>{req.admin_note}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: req.status === 'approved' ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                        {req.status}
                      </span>
                      <span style={{ color: 'var(--text-muted, var(--text-secondary))', fontSize: '0.75rem' }}>{formatEuDate(req.resolved_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
