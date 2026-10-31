// src/features/admin/GhoulTrackerControls.jsx
//
// Storyteller controls for a ghoul's or retainer's Health and Willpower
// (PATCH /api/ghouls/:id/trackers, back/services/ghoulTrackers.js). Used by the
// admin Ghouls tab and the Live Session dashboard.
import React, { useState } from 'react';
import api from '../../core/api';
import TrackerBlock from '../character/TrackerBlock';

const btn = { minWidth: 32, minHeight: 32, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--outline-variant, rgba(255,255,255,0.2))', background: 'transparent', color: 'var(--on-surface, #fff)', cursor: 'pointer' };
const label = { fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 74 };

export default function GhoulTrackerControls({ ghoul, sessionId, onChange }) {
  const [t, setT] = useState(ghoul.trackers);
  const [amount, setAmount] = useState(1);
  const [type, setType] = useState('superficial');
  const [halve, setHalve] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // A newer server copy (another Storyteller, a player's roll) wins.
  React.useEffect(() => { setT(ghoul.trackers); }, [ghoul.trackers]);
  if (!t) return null;

  const send = async (change) => {
    setBusy(true);
    setErr('');
    try {
      const { data } = await api.patch(`/ghouls/${ghoul.id}/trackers`, { ...change, sessionId });
      setT(data.trackers);
      onChange?.(data.trackers);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to update.');
    } finally {
      setBusy(false);
    }
  };
  const step = (name, key) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={label}>{name}</span>
      <button type="button" style={btn} disabled={busy} aria-label={`${name} minus one`} onClick={() => send({ [key]: -1 })}>−</button>
      <button type="button" style={btn} disabled={busy} aria-label={`${name} plus one`} onClick={() => send({ [key]: 1 })}>+</button>
    </div>
  );

  return (
    <div>
      <TrackerBlock label="Health" val={t.maxHealth} max={t.maxHealth} sup={t.health.superficial} agg={t.health.aggravated} />
      <TrackerBlock label="Willpower" val={t.maxWillpower} max={t.maxWillpower} sup={t.willpower.superficial} agg={t.willpower.aggravated} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 6 }}>
        {step('Health /', 'healthSupDelta')}
        {step('Health X', 'healthAggDelta')}
        {step('WP /', 'wpSupDelta')}
        {step('WP X', 'wpAggDelta')}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <input type="number" min={1} max={30} value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: 56 }} aria-label="Damage amount" />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Damage type">
          <option value="superficial">Superficial</option>
          <option value="aggravated">Aggravated</option>
        </select>
        {type === 'superficial' && (
          <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={halve} onChange={(e) => setHalve(e.target.checked)} /> halve
          </label>
        )}
        <button type="button" style={btn} disabled={busy} onClick={() => send({ damage: { amount: Number(amount) || 0, type, halve } })}>Apply damage</button>
      </div>
      {t.dead && <div style={{ fontSize: '0.75rem', color: '#ff6b6b', marginTop: 4 }}>Health full of Aggravated: dying or dead.</div>}
      {err && <div style={{ fontSize: '0.75rem', color: '#ff6b6b', marginTop: 4 }}>{err}</div>}
    </div>
  );
}
