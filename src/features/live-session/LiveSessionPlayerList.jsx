import React from 'react';
import Avatar from '../../components/Avatar';
import styles from '../../styles/LiveSession.module.css';

function VtmTracker({ label, max = 1, sup = 0, agg = 0, value = 0, isSimple = false, isHunger = false }) {
  const safeMax = Math.max(1, Number(max) || 1);
  const aggCount = Math.min(Number(agg) || 0, safeMax);
  const supCount = Math.min(Number(sup) || 0, safeMax - aggCount);
  const valCount = Math.min(Number(value) || 0, safeMax);

  return (
    <div style={{ marginBottom: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', fontWeight: 700 }}>
        <span>{label}</span>
        <span style={{ color: isHunger && valCount >= 4 ? 'var(--primary)' : 'inherit' }}>
          {!isSimple ? `${safeMax - (aggCount + supCount)} / ${safeMax}` : `${valCount} / ${safeMax}`}
        </span>
      </div>
      <div className={styles.dotRow}>
        {Array.from({ length: safeMax }).map((_, i) => {
          if (isSimple) {
            const isFilled = i < valCount;
            return (
              <div key={i} className={isFilled ? styles.dotFilled : styles.dotEmpty} style={{ backgroundColor: isFilled && isHunger ? 'var(--primary-container)' : undefined, borderColor: isFilled && isHunger ? 'var(--primary)' : undefined }} />
            );
          } else {
            const isAgg = i < aggCount;
            const isSup = !isAgg && i < aggCount + supCount;
            return (
              <div key={i} className={`${styles.healthBox} ${isAgg ? styles.healthAggravated : isSup ? styles.healthSuperficial : ''}`} />
            );
          }
        })}
      </div>
    </div>
  );
}

export default function LiveSessionPlayerList({ players = [], adminName, onAdjust, onForceRouse }) {
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
        const hunger = Number(player.hunger ?? 0);
        
        let sheet = {};
        try {
          sheet = typeof player.sheet === 'string' ? JSON.parse(player.sheet) : (player.sheet || {});
        } catch(e) {}

        const healthMax = Number(sheet.health?.max || 5);
        const healthSup = Number(sheet.health?.superficial || 0);
        const healthAgg = Number(sheet.health?.aggravated || 0);

        const wpMax = Number(sheet.willpower?.max || 5);
        const wpSup = Number(sheet.willpower?.superficial || 0);
        const wpAgg = Number(sheet.willpower?.aggravated || 0);

        const humanity = Number(sheet.humanity || player.humanity || sheet.morality?.humanity || 7);
        const bloodPotency = Number(sheet.blood_potency || player.blood_potency || sheet.bloodPotency || 1);
        const frenzyState = sheet.frenzyState || player.frenzyState;

        return (
          <article 
            key={id} 
            className={styles.trackerBox} 
            style={{ 
              borderColor: frenzyState ? 'var(--error)' : undefined, 
              boxShadow: frenzyState ? '0 0 15px rgba(225, 29, 72, 0.15)' : undefined,
              padding: '1rem'
            }}
          >
            <header style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <Avatar userId={player.is_npc || player.isNpc ? undefined : id} npcId={player.is_npc || player.isNpc ? id : undefined} size={50} style={{ borderRadius: '50%' }} fallback={`/img/clans/330px-${clan.replace(/\s+/g, '_')}_symbol.png`} />
              <div style={{ flex: 1 }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--primary)', fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                  {name} 
                  {player.is_npc || player.isNpc ? <span style={{ fontSize: '0.6rem', border: '1px solid var(--outline)', padding: '2px 4px', borderRadius: '4px', color: 'var(--text-muted)' }}>NPC</span> : null}
                </h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{clan} • BP {bloodPotency}</p>
              </div>
            </header>

            <VtmTracker label="Health" max={healthMax} sup={healthSup} agg={healthAgg} />
            <VtmTracker label="Willpower" max={wpMax} sup={wpSup} agg={wpAgg} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <VtmTracker label="Hunger" max={5} value={hunger} isSimple isHunger />
              <VtmTracker label="Humanity" max={10} value={humanity} isSimple />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className={styles.btnPrimary} style={{ gridColumn: 'span 2', fontSize: '0.75rem' }} onClick={() => onForceRouse?.(id)}>Force Rouse Check</button>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className={styles.btnOutline} style={{ flex: 1, padding: '4px', fontSize: '0.7rem' }} onClick={() => onAdjust?.(id, { hungerDelta: -1 })}>-Hung</button>
                <button className={styles.btnOutline} style={{ flex: 1, padding: '4px', fontSize: '0.7rem' }} onClick={() => onAdjust?.(id, { hungerDelta: 1 })}>+Hung</button>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className={styles.btnOutline} style={{ flex: 1, padding: '4px', fontSize: '0.7rem' }} onClick={() => onAdjust?.(id, { humanityDelta: -1 })}>-Hum</button>
                <button className={styles.btnOutline} style={{ flex: 1, padding: '4px', fontSize: '0.7rem' }} onClick={() => onAdjust?.(id, { humanityDelta: 1 })}>+Hum</button>
              </div>
              
              <button className={styles.btnOutline} style={{ padding: '4px', fontSize: '0.7rem' }} onClick={() => onAdjust?.(id, { wpSupDelta: 1 })}>+WP Sup</button>
              <button className={styles.btnOutline} style={{ padding: '4px', fontSize: '0.7rem' }} onClick={() => onAdjust?.(id, { wpAggDelta: 1 })}>+WP Agg</button>
              <button className={styles.btnOutline} style={{ padding: '4px', fontSize: '0.7rem' }} onClick={() => onAdjust?.(id, { healthSupDelta: 1 })}>+HP Sup</button>
              <button className={styles.btnOutline} style={{ padding: '4px', fontSize: '0.7rem' }} onClick={() => onAdjust?.(id, { healthAggDelta: 1 })}>+HP Agg</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}