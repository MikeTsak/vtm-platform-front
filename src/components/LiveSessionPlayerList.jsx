import React from 'react';
import styles from '../styles/LiveSession.module.css';

function TrackBar({ value = 0, max = 1, label }) {
  const safeMax = Math.max(1, Number(max) || 1);
  const percent = Math.max(0, Math.min(100, (Number(value) || 0) / safeMax * 100));
  return (
    <div className={styles.trackWrap}>
      <div className={styles.trackLabel}>{label} <strong>{value}/{safeMax}</strong></div>
      <div className={styles.trackBar}><span style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

export default function LiveSessionPlayerList({ players = [], onAdjust, onForceRouse }) {
  if (!players.length) {
    return <div className={styles.emptyState}>No players in this session yet.</div>;
  }

  return (
    <div className={styles.playerGrid}>
      {players.map((player) => {
        const id = player.character_id || player.characterId || player.id;
        const name = player.name || player.character_name || 'Unknown';
        const clan = player.clan || 'Unknown Clan';
        const hunger = Number(player.hunger ?? 0);
        const wpCurrent = Number(player.willpower_current ?? player.willpowerCurrent ?? 0);
        const wpMax = Number(player.willpower_max ?? player.willpowerMax ?? Math.max(1, wpCurrent));
        const healthCurrent = Number(player.health_current ?? player.healthCurrent ?? 0);
        const healthMax = Number(player.health_max ?? player.healthMax ?? Math.max(1, healthCurrent));

        return (
          <article key={id} className={styles.playerCard}>
            <header className={styles.playerHead}>
              <div>
                <h4>{name}</h4>
                <p>{clan}</p>
              </div>
              {player.is_npc || player.isNpc ? <span className={styles.npcTag}>NPC</span> : null}
            </header>

            <TrackBar label="Health" value={healthCurrent} max={healthMax} />
            <TrackBar label="Willpower" value={wpCurrent} max={wpMax} />

            <div className={styles.hungerDots} aria-label={`Hunger ${hunger}`}>
              {Array.from({ length: 5 }).map((_, idx) => (
                <span key={idx} className={idx < hunger ? styles.hungerOn : styles.hungerOff} />
              ))}
            </div>

            <div className={styles.quickBtns}>
              <button onClick={() => onForceRouse?.(id)}>Force Rouse</button>
              <button onClick={() => onAdjust?.(id, { hungerDelta: 1 })}>+Hunger</button>
              <button onClick={() => onAdjust?.(id, { hungerDelta: -1 })}>-Hunger</button>
              <button onClick={() => onAdjust?.(id, { wpDelta: 1 })}>+WP</button>
              <button onClick={() => onAdjust?.(id, { wpDelta: -1 })}>-WP</button>
              <button onClick={() => onAdjust?.(id, { healthDelta: 1 })}>+HP</button>
              <button onClick={() => onAdjust?.(id, { healthDelta: -1 })}>-HP</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
