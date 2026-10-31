// src/features/admin/SessionGhoulsTool.jsx
//
// Live Session dashboard tool: bring the players' ghouls and retainers to the
// table (metadata.ghouls, written through the dashboard's updateMetadata like
// the NPC roster), then manage their Health / Willpower. The player who plays
// one sees it on their screen and rolls for it (LiveSessionGhouls.jsx).
import React, { useCallback, useEffect, useState } from 'react';
import api from '../../core/api';
import { socket } from '../../api/liveSession';
import GhoulTrackerControls from './GhoulTrackerControls';

export default function SessionGhoulsTool({ sessionId, metadata, updateMetadata, styles }) {
  const [data, setData] = useState({ ghouls: [], candidates: [] });
  const [pick, setPick] = useState('');
  const ids = Array.isArray(metadata?.ghouls) ? metadata.ghouls.map(Number) : [];

  const load = useCallback(() => {
    if (!sessionId) return;
    api.get(`/live-session/${sessionId}/ghouls`).then((res) => setData({ ghouls: res.data?.ghouls || [], candidates: res.data?.candidates || [] })).catch(() => {});
  }, [sessionId]);
  useEffect(() => {
    load();
    socket.on('refresh_session', load);
    return () => socket.off('refresh_session', load);
  }, [load, ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (!pick) return;
    await updateMetadata((m) => ({ ghouls: [...new Set([...(m.ghouls || []).map(Number), Number(pick)])] }));
    setPick('');
    load();
  };
  const remove = async (id) => {
    await updateMetadata((m) => ({ ghouls: (m.ghouls || []).map(Number).filter((x) => x !== Number(id)) }));
    load();
  };

  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
        Bring a player's ghoul or retainer to the table. Its player then sees its trackers and rolls for it (no Hunger dice; a power above level 1 costs it 1 Aggravated).
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <select className={styles.formInput} style={{ flex: 1 }} value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">{data.candidates.length ? 'Add a retainer of a player at the table...' : 'No other retainers among the players here'}</option>
          {data.candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.isGhoul ? 'ghoul' : 'retainer'}, T{c.tier}) · {c.controller?.name || c.coterie_name || 'no player'}
            </option>
          ))}
        </select>
        <button type="button" className={styles.btnSecondary} disabled={!pick} onClick={add}>Add</button>
      </div>
      {data.ghouls.map((g) => (
        <div key={g.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: 6, padding: '0.6rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <strong>{g.name}</strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {g.isGhoul ? 'Ghoul' : 'Retainer'} T{g.tier} · played by {g.controller?.name || 'nobody'}
              {g.feeding === 'starved' ? ' · STARVED (no powers)' : ''}
            </span>
          </div>
          <GhoulTrackerControls ghoul={g} sessionId={sessionId} />
          <button type="button" className={styles.btnOutline} style={{ marginTop: 8 }} onClick={() => remove(g.id)}>Remove from session</button>
        </div>
      ))}
    </div>
  );
}
