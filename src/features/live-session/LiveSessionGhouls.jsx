// src/features/live-session/LiveSessionGhouls.jsx
//
// The player's own ghouls and retainers that the Storyteller brought into the
// session (metadata.ghouls): Health / Willpower, rolls and Discipline powers.
// Everything is rolled and charged on the server (POST /api/dice/roll mode
// 'ghoul', back/routes/ghouls.js); this screen only asks and shows.
import React, { useCallback, useEffect, useState } from 'react';
import api from '../../core/api';
import { socket } from '../../api/liveSession';
import { DISCIPLINES } from '../../data/disciplines';
import { ATTR_GROUPS, SKILL_GROUPS } from '../xp-shop/suggestions';
import TrackerBlock from '../character/TrackerBlock';

const box = { border: '1px solid var(--border-color, rgba(255,255,255,0.12))', borderRadius: 8, padding: 12, marginTop: 12, background: 'rgba(255,255,255,0.03)' };
const small = { fontSize: '0.75rem', color: 'var(--text-muted)' };
const btn = { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--tint)', background: 'transparent', color: 'var(--tint)', cursor: 'pointer', fontSize: '0.8rem', minHeight: 36 };

const powerPool = (p) => p.dice_pool || (DISCIPLINES[p.discipline]?.levels?.[1] || []).find((x) => x.name === p.name)?.dice_pool || '';
const rollable = (pool) => /\+/.test(String(pool)) && !/^(—|none|as power)/i.test(String(pool).trim());

function GhoulCard({ ghoul, sessionId, onRolled, reload }) {
  const sheet = ghoul.sheet || {};
  const t = ghoul.trackers;
  const starved = ghoul.feeding === 'starved';
  const [t1, setT1] = useState('Strength');
  const [t2, setT2] = useState('Brawl');
  const [difficulty, setDifficulty] = useState(0);
  const [ignoreImpairment, setIgnoreImpairment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const disciplines = Object.entries(sheet.disciplines || {}).filter(([, v]) => Number(v) > 0).map(([d]) => d);
  const val = (trait) => Number(sheet.attributes?.[trait] ?? sheet.skills?.[trait] ?? sheet.disciplines?.[trait] ?? (ATTR_GROUPS.Physical.concat(ATTR_GROUPS.Social, ATTR_GROUPS.Mental).includes(trait) ? 1 : 0)) || 0;

  const run = async (fn, okNote) => {
    setBusy(true);
    setNote('');
    try {
      await fn();
      if (okNote) setNote(okNote);
    } catch (e) {
      setNote(e?.response?.data?.error || 'That did not work.');
    } finally {
      setBusy(false);
      reload();
    }
  };
  const roll = (extra) => run(async () => {
    const { data } = await api.post('/dice/roll', { mode: 'ghoul', sessionId, retainerId: ghoul.id, difficulty: Number(difficulty) || 0, ignoreImpairment, ...extra });
    onRolled?.(data.roll);
  });
  const overreach = (powerName) => {
    if (!window.confirm(`${ghoul.name} uses a power above level 1${powerName ? ` (${powerName})` : ''}: 1 Aggravated Health instead of a Rouse Check. Go ahead?`)) return;
    run(() => api.post(`/live-session/${sessionId}/ghouls/${ghoul.id}/overreach`, { power: powerName }), '1 Aggravated Health taken.');
  };

  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <strong style={{ fontSize: '1rem' }}>{ghoul.name}</strong>
        <span style={small}>
          Tier {ghoul.tier} {ghoul.isGhoul ? 'Ghoul' : 'Retainer'}{ghoul.coterie_name ? ` · ${ghoul.coterie_name}` : ''}
        </span>
      </div>
      {starved && <div style={{ ...small, color: 'var(--error, #ff6b6b)', marginTop: 4 }}>Starved: no Discipline powers until fed again.</div>}
      {t.dead && <div style={{ ...small, color: 'var(--error, #ff6b6b)', marginTop: 4 }}>Health is full of Aggravated damage: dying or dead. Tell the Storyteller.</div>}

      <TrackerBlock label="Health" val={t.maxHealth} max={t.maxHealth} sup={t.health.superficial} agg={t.health.aggravated} />
      <TrackerBlock label="Willpower" val={t.maxWillpower} max={t.maxWillpower} sup={t.willpower.superficial} agg={t.willpower.aggravated} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 10 }}>
        <select value={t1} onChange={(e) => setT1(e.target.value)} aria-label="First trait">
          {Object.entries(ATTR_GROUPS).map(([g, list]) => (
            <optgroup key={g} label={g}>{list.map((a) => <option key={a} value={a}>{a} ({val(a)})</option>)}</optgroup>
          ))}
        </select>
        <select value={t2} onChange={(e) => setT2(e.target.value)} aria-label="Second trait">
          {Object.entries(SKILL_GROUPS).map(([g, list]) => (
            <optgroup key={g} label={g}>{list.map((s) => <option key={s} value={s}>{s} ({val(s)})</option>)}</optgroup>
          ))}
          {disciplines.length > 0 && (
            <optgroup label="Disciplines">{disciplines.map((d) => <option key={d} value={d}>{d} ({val(d)})</option>)}</optgroup>
          )}
          <optgroup label="Attributes">
            {Object.values(ATTR_GROUPS).flat().map((a) => <option key={`a-${a}`} value={a}>{a} ({val(a)})</option>)}
          </optgroup>
        </select>
        <label style={{ ...small, display: 'flex', alignItems: 'center', gap: 6 }}>
          Difficulty
          <input type="number" min={0} max={10} value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ width: 56 }} />
        </label>
      </div>
      <label style={{ ...small, display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <input type="checkbox" checked={ignoreImpairment} onChange={(e) => setIgnoreImpairment(e.target.checked)} />
        Spend 1 Willpower to ignore impairment
      </label>
      <button type="button" style={{ ...btn, marginTop: 8, width: '100%' }} disabled={busy} onClick={() => roll({ traits: [t1, t2] })}>
        Roll {t1} + {t2} for {ghoul.name}
      </button>

      {ghoul.isGhoul && (
        <div style={{ marginTop: 12 }}>
          <div style={small}>Discipline powers (level 1: no Rouse Check, a ghoul has no Hunger)</div>
          {(sheet.powers || []).map((p) => (
            <div key={`${p.discipline}-${p.name}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span>{p.discipline} · {p.name}{powerPool(p) ? <span style={small}> ({powerPool(p)})</span> : null}</span>
              {rollable(powerPool(p)) && (
                <button type="button" style={btn} disabled={busy || starved} onClick={() => roll({ powerName: p.name })}>Roll power</button>
              )}
            </div>
          ))}
          <button type="button" style={{ ...btn, marginTop: 10, width: '100%', borderColor: 'var(--error, #ff6b6b)', color: 'var(--error, #ff6b6b)' }} disabled={busy || starved}
            onClick={() => { const name = window.prompt('Which power above level 1? (Draught of Elegance, alchemy...)'); if (name !== null) overreach(name); }}>
            Use a power above level 1 (1 Aggravated Health)
          </button>
        </div>
      )}
      {note && <div style={{ ...small, marginTop: 8 }} role="status">{note}</div>}
    </div>
  );
}

export default function LiveSessionGhouls({ sessionId, onRolled }) {
  const [ghouls, setGhouls] = useState([]);
  const load = useCallback(() => {
    if (!sessionId) return;
    api.get(`/live-session/${sessionId}/ghouls`).then((res) => setGhouls(res.data?.ghouls || [])).catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    load();
    socket.on('refresh_session', load);
    return () => socket.off('refresh_session', load);
  }, [load]);

  if (!ghouls.length) return null;
  return (
    <section style={{ marginTop: 16 }} aria-label="Your ghouls and retainers">
      <h3 style={{ margin: 0, fontFamily: 'var(--font-title)' }}>Your ghouls &amp; retainers</h3>
      {ghouls.map((g) => <GhoulCard key={g.id} ghoul={g} sessionId={sessionId} onRolled={onRolled} reload={load} />)}
    </section>
  );
}
