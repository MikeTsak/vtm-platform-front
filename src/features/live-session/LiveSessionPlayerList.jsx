import React from 'react';
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
        <span>
          {!isSimple ? `${safeMax - (aggCount + supCount)} / ${safeMax}` : `${valCount} / ${safeMax}`}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
        {Array.from({ length: safeMax }).map((_, i) => {
          if (isSimple) {
            const isFilled = i < valCount;
            return (
              <div key={i} style={{ flex: 1, minWidth: '10px', height: '14px', borderRadius: '2px', background: isFilled ? (isHunger ? '#e11d48' : '#e4e4e7') : 'rgba(255,255,255,0.1)', border: isFilled && isHunger ? '1px solid #e11d48' : '1px solid rgba(255,255,255,0.05)' }} />
            );
          } else {
            const isAgg = i < aggCount;
            const isSup = !isAgg && i < aggCount + supCount;
            return (
              <div key={i} style={{ 
                flex: 1, minWidth: '10px', height: '14px', borderRadius: '2px', 
                background: isAgg ? '#e11d48' : isSup ? 'rgba(161,161,170,0.3)' : 'transparent',
                border: isAgg ? '1px solid #e11d48' : isSup ? '1px solid var(--text-muted)' : '1px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {isAgg && <svg width="8" height="8" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="var(--text-color)" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="1" x2="1" y2="9" stroke="var(--text-color)" strokeWidth="2" strokeLinecap="round"/></svg>}
                {isSup && <div style={{ width: '60%', height: '2px', background: 'var(--text-muted)', borderRadius: '1px' }} />}
              </div>
            );
          }
        })}
      </div>
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
        const bloodPotency = Number(sheet.blood_potency || player.blood_potency || 1);
        const frenzyState = sheet.frenzyState || player.frenzyState;

        const frenzyLabel = frenzyState === 'fury' ? '🔥 Fury Frenzy' : 
                            frenzyState === 'hunger' ? '🩸 Hunger Frenzy' : 
                            frenzyState === 'terror' ? '💀 Terror Frenzy' : null;

        return (
          <article 
            key={id} 
            className={styles.playerCard} 
            style={{ 
              borderColor: frenzyState ? '#e11d48' : undefined, 
              boxShadow: frenzyState ? '0 0 15px rgba(225, 29, 72, 0.15)' : undefined 
            }}
          >
            <header className={styles.playerHead} style={{ marginBottom: '1rem' }}>
              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  {name} 
                  {frenzyState && <span style={{ fontSize: '0.75rem', background: '#e11d48', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>{frenzyLabel}</span>}
                </h4>
                <p>{clan} • BP {bloodPotency}</p>
              </div>
              {player.is_npc || player.isNpc ? <span className={styles.npcTag}>NPC</span> : null}
            </header>

            <VtmTracker label="Health" max={healthMax} sup={healthSup} agg={healthAgg} />
            <VtmTracker label="Willpower" max={wpMax} sup={wpSup} agg={wpAgg} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <VtmTracker label="Hunger" max={5} value={hunger} isSimple isHunger />
              <VtmTracker label="Humanity" max={10} value={humanity} isSimple />
            </div>

            <div className={styles.quickBtns} style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '0.75rem', gap: '0.3rem' }}>
              <button style={{ gridColumn: 'span 4' }} onClick={() => onForceRouse?.(id)}>Force Rouse Check</button>
              
              <button onClick={() => onAdjust?.(id, { hungerDelta: 1 })}>+Hung</button>
              <button onClick={() => onAdjust?.(id, { hungerDelta: -1 })}>-Hung</button>
              <button onClick={() => onAdjust?.(id, { humanityDelta: 1 })}>+Hum</button>
              <button onClick={() => onAdjust?.(id, { humanityDelta: -1 })}>-Hum</button>
              
              <button onClick={() => onAdjust?.(id, { wpSupDelta: 1 })}>+WP Sup</button>
              <button onClick={() => onAdjust?.(id, { wpAggDelta: 1 })}>+WP Agg</button>
              <button onClick={() => onAdjust?.(id, { healthSupDelta: 1 })}>+HP Sup</button>
              <button onClick={() => onAdjust?.(id, { healthAggDelta: 1 })}>+HP Agg</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}