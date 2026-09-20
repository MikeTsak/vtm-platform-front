import React, { useState } from 'react';
import styles from '../../styles/CharacterView.module.css';
import { RITUALS } from '../../data/rituals';

const getRitualFullData = (category, powerId) => {
  const cat = RITUALS[category];
  if (!cat || !cat.levels || !powerId) return null;
  for (const level of Object.values(cat.levels)) {
    const found = level.find(p => p.id === powerId);
    if (found) return found;
  }
  return null;
};

function RitualItem({ ritual, category, boxMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const fullData = getRitualFullData(category, ritual.id);
  const cls = styles.powerPill;
  
  return (
    <li className={styles.powerItem} data-box-mode={boxMode}>
      <div 
        className={cls} 
        data-box-mode={boxMode}
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', userSelect: 'none', width: '100%', boxSizing: 'border-box' }}
        title="Click to view details"
      >
        <span className={styles.levelBadge} data-box-mode={boxMode}>L{ritual.level}</span>
        <span className={styles.powerName} data-box-mode={boxMode}>{ritual.name}</span>
      </div>
      <div style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.3s ease-in-out',
          width: '100%'
        }}>
        <div style={{ overflow: 'hidden' }}>
          {fullData && (
            <div className={styles.powerDetailsBody} data-box-mode={boxMode}>
              <div className={styles.powerDetailsMeta} data-box-mode={boxMode}>
                {fullData.cost && fullData.cost !== '—' && fullData.cost !== 'None' && <span><b style={{ opacity: 0.7 }}>Cost:</b> {fullData.cost}</span>}
                {fullData.dice_pool && fullData.dice_pool !== '—' && fullData.dice_pool !== 'None' && <span><b style={{ opacity: 0.7 }}>Pool:</b> {fullData.dice_pool}</span>}
                {fullData.difficulty && fullData.difficulty !== '—' && fullData.difficulty !== 'None' && <span><b style={{ opacity: 0.7 }}>Diff:</b> {fullData.difficulty}</span>}
                {fullData.source && <span><b style={{ opacity: 0.7 }}>Source:</b> {fullData.source}</span>}
              </div>
              {fullData.effect && (
                <div style={{ lineHeight: '1.4', marginTop: '4px' }}>
                  <b style={{ opacity: 0.7 }}>Effect:</b> {fullData.effect}
                </div>
              )}
              {fullData.notes && (
                <div style={{ lineHeight: '1.4', marginTop: '4px' }}>
                  <b style={{ opacity: 0.7 }}>Notes:</b> {fullData.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

const RitualsDisplaySection = ({ sheet, boxMode }) => {
  const bsRituals = sheet?.rituals?.blood_sorcery || [];
  const obCeremonies = sheet?.rituals?.oblivion || [];
  
  if (bsRituals.length === 0 && obCeremonies.length === 0) {
    return null;
  }
  
  // Sort rituals by level, then alphabetically
  const sortRituals = (a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name);
  };
  
  const sortedBsRituals = [...bsRituals].sort(sortRituals);
  const sortedObCeremonies = [...obCeremonies].sort(sortRituals);

  return (
    <div className={`${styles.card} ${styles.disciplinesCard}`} id="rituals-section" data-box-mode={boxMode} style={{ marginTop: '24px' }}>
      <div className={styles.cardHead}><b>Rituals and Ceremonies</b></div>
      <div className={styles.disciplinesGrid} style={{ display: 'grid', gap: '16px', padding: '16px' }}>
        {sortedBsRituals.length > 0 && (
          <div className={styles.disciplineRow} data-box-mode={boxMode}>
            <div className={styles.disciplineTitleBlock} style={{ marginBottom: '12px' }}>
              <b className={styles.disciplineName} data-box-mode={boxMode}>Blood Sorcery Rituals</b>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedBsRituals.map((rit, idx) => (
                <RitualItem key={`bs-${idx}`} ritual={rit} category="blood_sorcery" boxMode={boxMode} />
              ))}
            </ul>
          </div>
        )}
        
        {sortedObCeremonies.length > 0 && (
          <div className={styles.disciplineRow} data-box-mode={boxMode} style={sortedBsRituals.length > 0 ? { borderTop: '1px solid var(--border-color)', paddingTop: '16px' } : {}}>
            <div className={styles.disciplineTitleBlock} style={{ marginBottom: '12px' }}>
              <b className={styles.disciplineName} data-box-mode={boxMode}>Oblivion Ceremonies</b>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedObCeremonies.map((cer, idx) => (
                <RitualItem key={`ob-${idx}`} ritual={cer} category="oblivion" boxMode={boxMode} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default RitualsDisplaySection;
