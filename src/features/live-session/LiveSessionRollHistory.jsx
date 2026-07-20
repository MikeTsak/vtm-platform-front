import React from 'react';
import styles from '../../styles/LiveSession.module.css';

export default function LiveSessionRollHistory({ rolls = [], onBroadcast, currentCharacterId, isAdmin }) {
  if (!rolls.length) {
    return <div className={styles.textMuted} style={{ padding: '1rem', textAlign: 'center' }}>No rolls yet.</div>;
  }

  const filteredRolls = rolls.filter(r => {
    if (r.target_character_id) {
      if (isAdmin) return true;
      if (r.target_character_id === currentCharacterId) return true;
      return false; // Hide whisper meant for someone else
    }
    return true;
  });

  return (
    <div className={styles.historyFeed}>
      {filteredRolls.slice(0, 30).map((roll, idx) => {
        const id = roll.id || `${roll.character_id}-${roll.created_at}-${idx}`;
        const name = roll.player_name || roll.character_name || roll.characterName || 'Unknown';
        const result = roll.result || roll.label || `${roll.successes ?? 0} successes`;
        const createdAt = roll.created_at || roll.createdAt;
        const hasBestial = roll.has_bestial_failure;
        const hasMessy = roll.has_messy_critical;
        const hasCrit = roll.has_critical;
        const isFailure = roll.successes === 0;
        const note = roll.note;

        if (roll.message && !roll.roll_type && !roll.rollType) {
          const isWhisper = !!roll.target_character_id;
          return (
            <article key={id} className={styles.historyItem} style={{ 
              background: isWhisper ? 'rgba(168,85,247,0.1)' : 'var(--surface-container-high)', 
              border: isWhisper ? '1px dashed #a855f7' : '1px solid var(--primary-container)', 
              padding: '0.75rem' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: isWhisper ? '#d8b4fe' : 'var(--on-surface)' }}>
                  {isWhisper && <strong style={{color: '#a855f7'}}>🤫 Whisper: </strong>}
                  {roll.message}
                </span>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  {createdAt ? new Date(createdAt).toLocaleTimeString() : '-'}
                </small>
              </div>
            </article>
          );
        }

        let statusClass = 'Success';
        if (hasBestial) statusClass = 'BestialFailure';
        else if (hasMessy) statusClass = 'MessyCritical';
        else if (hasCrit) statusClass = 'Critical';
        else if (isFailure) statusClass = 'Failure';

        const getDieImage = (die, isHunger) => {
          if (isHunger) {
            if (die === 10) return '/img/dice/MessyCrit.png';
            if (die === 1) return '/img/dice/BestialFail.png';
            if (die >= 6) return '/img/dice/Success.png';
            return null;
          }
          if (die === 10) return '/img/dice/Crit.png';
          if (die >= 6) return '/img/dice/Success.png';
          return null;
        };

        return (
          <article key={id} className={`${styles.historyItem} ${styles[statusClass]}`}>
            <div className={styles.historyHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.02em' }}>{name}</strong>
                {roll.is_hidden ? <span title="Hidden Action (Only visible to ST & You)" style={{ fontSize: '0.8rem', opacity: 0.7 }}>👁️</span> : null}
              </div>
              <span style={{ 
                fontWeight: 700, 
                color: (hasBestial || hasMessy) ? 'var(--error)' : (hasCrit ? '#fbbf24' : 'var(--text-muted)') 
              }}>
                {result}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--on-surface)', textTransform: 'capitalize' }}>
                {roll.roll_type?.replace(/_/g, ' ') || roll.rollType || 'roll'} {note ? `— ${note}` : ''}
              </p>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                {createdAt ? new Date(createdAt).toLocaleTimeString() : '-'}
              </small>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', alignItems: 'center' }}>
              {roll.pool !== undefined && roll.pool !== null && <span>Pool: <b style={{ color: 'var(--on-surface)' }}>{roll.pool}</b></span>}
              {roll.hunger !== undefined && roll.hunger !== null && <span>Hunger: <b style={{ color: 'var(--on-surface)' }}>{roll.hunger}</b></span>}
              {hasBestial && <span style={{ color: 'var(--error)', fontWeight: 700 }}>⚠️ Bestial</span>}
              {hasMessy && <span style={{ color: 'var(--error)', fontWeight: 700 }}>🩸 Messy Crit</span>}
              
              {(hasBestial || hasMessy) && onBroadcast && (
                <button 
                  onClick={() => {
                    const comp = window.prompt("Assign Compulsion/Stain to " + name + ":");
                    if (comp) {
                      onBroadcast(`[ST Consequence] ${name} receives: ${comp}`);
                    }
                  }}
                  style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--on-surface)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', marginLeft: 'auto' }}
                >
                  Assign Consequence
                </button>
              )}
            </div>

            {/* Visual Dice Output */}
            {roll.results && (roll.results.normal || roll.results.hunger || roll.results.rouse) && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {(roll.results.normal || []).map((die, i) => {
                  const imgSrc = getDieImage(die, false);
                  return (
                    <div key={`n-${i}`} className={styles.diceSlotNormal} style={{ position: 'relative', width: 26, height: 26, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {imgSrc ? <img src={imgSrc} alt={`${die}`} style={{ width: 16, height: 16, objectFit: 'contain' }} /> : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>{die}</span>}
                    </div>
                  );
                })}
                {(roll.results.hunger || roll.results.rouse || []).map((die, i) => {
                  const imgSrc = getDieImage(die, true);
                  return (
                    <div key={`h-${i}`} className={styles.diceSlotHunger} style={{ position: 'relative', width: 26, height: 26, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {imgSrc ? <img src={imgSrc} alt={`${die}`} style={{ width: 16, height: 16, objectFit: 'contain' }} /> : <span style={{ fontSize: '0.75rem', color: '#111111', fontWeight: 'bold' }}>{die}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}