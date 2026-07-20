import React from 'react';
import Avatar from '../../components/Avatar';
import styles from '../../styles/LiveSession.module.css';

export default function LiveSessionPlayerList({ players = [], adminName }) {
  if (!players.length) {
    return <div className={styles.textMuted} style={{ padding: '1rem', textAlign: 'center' }}>No players in this session yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {adminName && (
        <div style={{ background: 'var(--surface-container-highest)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>👑</span>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Session Storyteller</div>
            <div style={{ fontSize: '0.95rem', color: 'var(--on-surface)', fontWeight: 'bold' }}>{adminName}</div>
          </div>
        </div>
      )}
      {players.map((player) => {
        const id = player.character_id || player.characterId || player.id;
        const name = player.name || player.character_name || 'Unknown';
        const clan = player.clan || 'Unknown Clan';
        
        return (
          <article 
            key={id} 
            className={styles.trackerBox} 
            style={{ 
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <Avatar userId={player.user_id || undefined} npcId={player.is_npc || player.isNpc ? id : undefined} size={40} style={{ borderRadius: '50%' }} fallback={`/img/clans/330px-${clan.replace(/\s+/g, '_')}_symbol.png`} />
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--primary)', fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
              {name}
              {player.is_npc || player.isNpc ? <span style={{ fontSize: '0.6rem', border: '1px solid var(--outline)', padding: '2px 4px', borderRadius: '4px', color: 'var(--text-muted)' }}>NPC</span> : null}
            </h4>
          </article>
        );
      })}
    </div>
  );
}