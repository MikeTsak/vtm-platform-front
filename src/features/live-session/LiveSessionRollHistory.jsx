import React from 'react';
import styles from '../../styles/LiveSession.module.css';

export default function LiveSessionRollHistory({ rolls = [] }) {
  if (!rolls.length) {
    return <div className={styles.emptyState}>No rolls yet.</div>;
  }

  return (
    <div className={styles.rollHistoryList}>
      {rolls.slice(0, 30).map((roll, idx) => {
        const id = roll.id || `${roll.character_id}-${roll.created_at}-${idx}`;
        const name = roll.player_name || roll.character_name || roll.characterName || 'Unknown';
        const result = roll.result || roll.label || `${roll.successes ?? 0} successes`;
        const createdAt = roll.created_at || roll.createdAt;
        const hasBestial = roll.has_bestial_failure;
        const hasMessy = roll.has_messy_critical;
        const note = roll.note;

        return (
          <article 
            key={id} 
            className={styles.rollEntry} 
            style={{ 
              borderLeft: hasBestial || hasMessy ? '4px solid #e11d48' : '1px solid rgba(255, 255, 255, 0.05)',
              alignItems: 'flex-start'
            }}
          >
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <strong style={{ fontSize: '1rem', color: 'var(--text-color)', margin: 0 }}>{name}</strong>
                <span style={{ fontWeight: 700, color: hasBestial || hasMessy ? '#e11d48' : '#fbbf24', fontSize: '0.95rem' }}>
                  {result}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {roll.roll_type || roll.rollType || 'roll'} {note ? `— ${note}` : ''}
                </p>
                <small style={{ color: 'var(--border-color)', fontSize: '0.75rem' }}>
                  {createdAt ? new Date(createdAt).toLocaleTimeString() : '-'}
                </small>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '6px', display: 'flex', gap: '12px' }}>
                {roll.pool !== undefined && <span>Pool: <b>{roll.pool}</b></span>}
                {roll.hunger !== undefined && <span>Hunger: <b>{roll.hunger}</b></span>}
                {hasBestial && <span style={{color: '#e11d48', fontWeight: 700}}>⚠️ Bestial</span>}
                {hasMessy && <span style={{color: '#e11d48', fontWeight: 700}}>🩸 Messy Crit</span>}
              </div>

              {/* Visual Dice Output */}
              {roll.results && (roll.results.normal || roll.results.hunger || roll.results.rouse) && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {(roll.results.normal || []).map((die, i) => (
                    <div key={`n-${i}`} style={{ width: 18, height: 18, borderRadius: 4, background: die >= 6 ? '#e4e4e7' : 'rgba(255,255,255,0.1)', color: die >= 6 ? 'var(--bg-color)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>
                      {die}
                    </div>
                  ))}
                  {(roll.results.hunger || roll.results.rouse || []).map((die, i) => (
                    <div key={`h-${i}`} style={{ width: 18, height: 18, borderRadius: 4, background: die >= 6 ? '#e11d48' : 'transparent', border: '1px solid #e11d48', color: die >= 6 ? 'var(--text-color)' : '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>
                      {die}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}