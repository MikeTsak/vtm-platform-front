import React, { useState } from 'react';
import { iconPath, DISCIPLINES } from '../data/disciplines';
import styles from '../styles/CharacterView.module.css';

// Helper to safely find the specific rules for an equipped power
const getPowerFullData = (discName, powerId) => {
  const disc = DISCIPLINES[discName];
  if (!disc || !disc.levels || !powerId) return null;
  for (const level of Object.values(disc.levels)) {
    const found = level.find(p => p.id === powerId);
    if (found) return found;
  }
  return null;
};

// Sub-component so each power pill can animate its own open/close state independently
function PowerItem({ level, picked, unlocked, discName }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Fetch the actual rules and text for this specific power
  const fullData = picked ? getPowerFullData(discName, picked.id) : null;

  let cls = styles.powerPill;
  let label = picked ? picked.name : (unlocked ? 'Pick a power' : 'Locked');
  if (!unlocked) cls += ` ${styles.powerPillLocked}`;
  else if (!picked) cls += ` ${styles.powerPillMissing}`;

  const isClickable = !!fullData;

  return (
    <li style={{ display: 'flex', flexDirection: 'column', width: '100%', marginBottom: '4px' }}>
      
      {/* The Power Pill itself */}
      <div 
        className={cls} 
        onClick={() => isClickable && setIsOpen(!isOpen)}
        style={{ 
          cursor: isClickable ? 'pointer' : 'default',
          userSelect: 'none',
          width: '100%',
          boxSizing: 'border-box'
        }}
        title={isClickable ? 'Click to view power details' : undefined}
      >
        <span className={styles.levelBadge}>L{level}</span>
        <span className={styles.powerName}>{label}</span>
      </div>

      {/* The low-key, smooth-animated expansion area */}
      <div 
        style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.3s ease-in-out',
          width: '100%'
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          {fullData && (
            <div style={{ 
              padding: '8px 12px 12px 12px', 
              fontSize: '0.85rem', 
              opacity: 0.85,
              borderLeft: '2px solid rgba(255,255,255,0.1)',
              marginLeft: '14px',
              marginBottom: '8px',
              color: 'var(--text-color)'
            }}>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '6px' }}>
                {fullData.cost && fullData.cost !== '—' && <span><b style={{opacity: 0.6}}>Cost:</b> {fullData.cost}</span>}
                {fullData.dice_pool && fullData.dice_pool !== '—' && <span><b style={{opacity: 0.6}}>Pool:</b> {fullData.dice_pool}</span>}
                {fullData.duration && fullData.duration !== '—' && <span><b style={{opacity: 0.6}}>Duration:</b> {fullData.duration}</span>}
              </div>
              
              {fullData.notes && (
                <div style={{ lineHeight: '1.4', marginTop: '4px' }}>
                  <b style={{opacity: 0.6}}>Effect:</b> {fullData.notes}
                </div>
              )}
              
            </div>
          )}
        </div>
      </div>

    </li>
  );
}

function DisciplineRow({ name, level = 0, powers = [] }) {
  const icon = iconPath(name);
  const byLevel = new Map((powers || []).map(p => [Number(p.level), { id: p.id, name: p.name }]));
  const maxPicked = Math.max(0, ...Array.from(byLevel.keys()));
  const displayMax = Math.min(5, Math.max(level || 0, maxPicked || 0) || 0) || level || 0 || 0;

  return (
    <div className={styles.disciplineRow}>
      <div className={styles.disciplineHead}>
        <img
          src={icon}
          alt=""
          width={28}
          height={28}
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/img/disciplines/Oblivion-rombo.png'; }}
          className={styles.disciplineIcon}
        />
        <div className={styles.disciplineTitleBlock}>
          <b>{name}</b>
          <div className={styles.dots}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`${styles.dot} ${i < level ? styles.dotOn : ''}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Force a column layout so the accordion animations don't break horizontal flows */}
      <ul className={styles.powerList} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {Array.from({ length: Math.max(displayMax, level || 0) || 0 }).map((_, i) => {
          const L = i + 1;
          const picked = byLevel.get(L);
          const unlocked = L <= level;

          return (
            <PowerItem 
              key={L} 
              level={L} 
              picked={picked} 
              unlocked={unlocked} 
              discName={name} 
            />
          );
        })}
      </ul>
    </div>
  );
}

export default DisciplineRow;