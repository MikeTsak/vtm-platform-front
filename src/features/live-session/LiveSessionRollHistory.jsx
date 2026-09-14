import React from 'react';
import styles from '../../styles/LiveSession.module.css';
import D10Die from '../../ui/D10Die';

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
        const hasCrit = roll.crit_pairs > 0;
        const isFailure = roll.is_failure;
        const note = roll.note;

        if (roll.is_whisper) {
          const isWhisper = Boolean(roll.target_character_id);
          return (
            <article key={id} className={styles.historyItem} style={{ borderLeftColor: '#c084fc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: isWhisper ? '#d8b4fe' : 'var(--on-surface)' }}>
                  {isWhisper && <strong style={{color: '#a855f7'}}>Whisper: </strong>}
                  {roll.message}
                </span>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  {createdAt ? new Date(createdAt).toLocaleTimeString() : ''}
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

        return (
          <article key={id} className={`${styles.historyItem} ${styles[statusClass]}`}>
            <div className={styles.historyHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.02em' }}>{name}</strong>
                {roll.is_hidden ? <span className="material-symbols-outlined" title="Hidden Action (Only visible to ST & You)" style={{ fontSize: '0.95rem', opacity: 0.7 }}>visibility_off</span> : null}
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
                {roll.roll_type?.replace(/_/g, ' ') || roll.rollType || 'roll'} {note ? `: ${note}` : ''}
              </p>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                {createdAt ? new Date(createdAt).toLocaleTimeString() : ''}
              </small>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', alignItems: 'center' }}>
              {roll.pool !== undefined && roll.pool !== null && <span>Pool: <b style={{ color: 'var(--on-surface)' }}>{roll.pool}</b></span>}
              {roll.hunger !== undefined && roll.hunger !== null && <span>Hunger: <b style={{ color: 'var(--on-surface)' }}>{roll.hunger}</b></span>}
              {hasBestial && <span style={{ color: 'var(--error)', fontWeight: 700 }}>Bestial</span>}
              {hasMessy && <span style={{ color: 'var(--error)', fontWeight: 700 }}>Messy Crit</span>}
              
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
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {(roll.results.normal || []).map((die, i) => (
                  <D10Die key={`n-${i}`} value={die} isHunger={false} size="sm" />
                ))}
                {(roll.results.hunger || roll.results.rouse || []).map((die, i) => (
                  <D10Die key={`h-${i}`} value={die} isHunger={true} size="sm" />
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}