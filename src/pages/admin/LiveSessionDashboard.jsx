import React, { useEffect, useMemo, useState } from 'react';
import { DISCIPLINES } from '../../data/disciplines';
import LiveSessionPlayerList from '../../components/LiveSessionPlayerList';
import LiveSessionRollHistory from '../../components/LiveSessionRollHistory';
import {
  createLiveSession,
  getLiveSession,
  getLiveSessionPlayers,
  getLiveSessionRolls,
  sendLiveSessionBroadcast,
  updateLiveSessionPlayer,
} from '../../api/liveSession';
import styles from '../../styles/LiveSession.module.css';

const DISCIPLINE_LOOKUP = Object.entries(DISCIPLINES).flatMap(([discipline, body]) =>
  Object.values(body?.levels || {}).flatMap((powers) =>
    (powers || []).map((power) => ({ discipline, ...power }))
  )
);

export default function LiveSessionDashboard() {
  const [sessionId, setSessionId] = useState(localStorage.getItem('adminLiveSessionId') || '');
  const [sessionName, setSessionName] = useState('Live Session');
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState([]);
  const [rolls, setRolls] = useState([]);
  const [search, setSearch] = useState('');
  const [broadcast, setBroadcast] = useState('');
  const [ambientHungerDelta, setAmbientHungerDelta] = useState(1);
  const [lookup, setLookup] = useState('');
  const [timerStart, setTimerStart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return players;
    return players.filter((player) => {
      const name = String(player.name || player.character_name || '').toLowerCase();
      const clan = String(player.clan || '').toLowerCase();
      return name.includes(term) || clan.includes(term);
    });
  }, [players, search]);

  const selectedDiscipline = useMemo(
    () => DISCIPLINE_LOOKUP.find((item) => item.id === lookup),
    [lookup]
  );

  useEffect(() => {
    if (!sessionId) return undefined;
    let live = true;

    const load = async () => {
      try {
        const [sessionData, playerData, rollData] = await Promise.all([
          getLiveSession(sessionId),
          getLiveSessionPlayers(sessionId),
          getLiveSessionRolls(sessionId),
        ]);

        if (!live) return;
        setSession(sessionData.session || sessionData);
        setPlayers(playerData.players || playerData || []);
        setRolls(rollData.rolls || rollData || []);
      } catch {
        if (!live) return;
        setMessage('Could not refresh session feed.');
      }
    };

    load();
    const timer = setInterval(load, 4000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [sessionId]);

  const startSession = async () => {
    setLoading(true);
    try {
      const data = await createLiveSession({ name: sessionName });
      const newId = String(data?.session?.id || data?.id || '');
      setSession(data.session || data);
      setSessionId(newId);
      localStorage.setItem('adminLiveSessionId', newId);
      setTimerStart(Date.now());
      setMessage('Live session started.');
    } catch {
      setMessage('Could not create a live session.');
    } finally {
      setLoading(false);
    }
  };

  const endSessionTimer = () => {
    setTimerStart(null);
    setMessage('Session timer stopped.');
  };

  const adjustPlayer = async (characterId, deltas) => {
    if (!sessionId) return;
    try {
      await updateLiveSessionPlayer(sessionId, characterId, deltas);
      setMessage('Player stats updated.');
      const playerData = await getLiveSessionPlayers(sessionId);
      setPlayers(playerData.players || playerData || []);
    } catch {
      setMessage('Could not update player stats.');
    }
  };

  const forceRouse = async (characterId) => {
    await adjustPlayer(characterId, { forceRouseCheck: true });
  };

  const sendBroadcast = async () => {
    if (!sessionId || !broadcast.trim()) return;
    try {
      await sendLiveSessionBroadcast(sessionId, { message: broadcast.trim() });
      setBroadcast('');
      setMessage('Broadcast sent.');
    } catch {
      setMessage('Could not send broadcast.');
    }
  };

  const applyAmbientHunger = async () => {
    if (!sessionId || !players.length) return;
    try {
      await Promise.all(
        players.map((player) =>
          updateLiveSessionPlayer(sessionId, player.character_id || player.characterId || player.id, {
            hungerDelta: Number(ambientHungerDelta) || 0,
          })
        )
      );
      setMessage('Ambient hunger adjustment applied.');
    } catch {
      setMessage('Ambient hunger update failed for one or more players.');
    }
  };

  const elapsed = timerStart ? Math.floor((Date.now() - timerStart) / 1000) : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className={styles.page}>
      <section className={styles.adminPanel}>
        <h1>GM Live Session Dashboard</h1>

        <div className={styles.adminControls}>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Session name"
          />
          <button onClick={startSession} disabled={loading}>{loading ? 'Starting…' : 'Start Session'}</button>

          <input
            type="text"
            value={sessionId}
            onChange={(e) => {
              const value = e.target.value.trim();
              setSessionId(value);
              localStorage.setItem('adminLiveSessionId', value);
            }}
            placeholder="Session ID"
          />

          <button onClick={() => setTimerStart(Date.now())}>Start Timer</button>
          <button onClick={endSessionTimer}>End Timer</button>
          <span className={styles.timerBadge}>{timerStart ? `${mm}:${ss}` : '00:00'}</span>
        </div>

        <div className={styles.adminControls}>
          <input
            type="text"
            placeholder="Search players"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="text"
            placeholder="Broadcast message"
            value={broadcast}
            onChange={(e) => setBroadcast(e.target.value)}
          />
          <button onClick={sendBroadcast}>Broadcast</button>
          <input
            type="number"
            value={ambientHungerDelta}
            onChange={(e) => setAmbientHungerDelta(Number(e.target.value) || 0)}
          />
          <button onClick={applyAmbientHunger}>Adjust Ambient Hunger</button>
        </div>

        <div className={styles.lookupBox}>
          <h3>Quick Discipline Lookup</h3>
          <select value={lookup} onChange={(e) => setLookup(e.target.value)}>
            <option value="">Select power</option>
            {DISCIPLINE_LOOKUP.map((power) => (
              <option key={power.id} value={power.id}>{power.discipline} — {power.name}</option>
            ))}
          </select>

          {selectedDiscipline ? (
            <div className={styles.disciplineInfo}>
              <strong>{selectedDiscipline.discipline} • {selectedDiscipline.name}</strong>
              <p>Cost: {selectedDiscipline.cost || 'Free'}</p>
              <p>Dice: {selectedDiscipline.dice_pool || 'N/A'}</p>
              <p>{selectedDiscipline.notes || selectedDiscipline.duration || 'No extra notes.'}</p>
            </div>
          ) : null}
        </div>

        <div className={styles.columns}>
          <section>
            <h2>Players & NPCs</h2>
            <LiveSessionPlayerList players={filteredPlayers} onAdjust={adjustPlayer} onForceRouse={forceRouse} />
          </section>

          <section>
            <h2>Roll History</h2>
            <LiveSessionRollHistory rolls={rolls} />
          </section>
        </div>

        {session ? <div className={styles.infoBox}>Session active: {session.name || session.id}</div> : null}
        {message ? <div className={styles.infoBox}>{message}</div> : null}
      </section>
    </div>
  );
}
