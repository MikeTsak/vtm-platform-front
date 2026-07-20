import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../core/api';
import styles from '../../styles/RetainersView.module.css';
import Avatar from '../../components/Avatar';
import { DISCIPLINES, iconPath } from '../../data/disciplines';
import { allSelectableAdvantages } from '../../data/merits_flaws_retainers';
import { generateGreekName } from '../../utils/nameGenerator';
import { motion, AnimatePresence } from 'framer-motion';

const CLAN_DISCIPLINES = {
  Brujah: ['Celerity', 'Potence', 'Presence'],
  Gangrel: ['Animalism', 'Fortitude', 'Protean'],
  Malkavian: ['Auspex', 'Dominate', 'Obfuscate'],
  Nosferatu: ['Animalism', 'Obfuscate', 'Potence'],
  Toreador: ['Auspex', 'Celerity', 'Presence'],
  Tremere: ['Auspex', 'Blood Sorcery', 'Dominate'],
  Ventrue: ['Dominate', 'Fortitude', 'Presence'],
  'Banu Haqim': ['Blood Sorcery', 'Celerity', 'Obfuscate'],
  Hecata: ['Auspex', 'Fortitude', 'Oblivion'],
  Lasombra: ['Dominate', 'Oblivion', 'Potence'],
  'The Ministry': ['Obfuscate', 'Presence', 'Protean'],
  Caitiff: [],
  'Thin-blood': []
};



const ATTRS = [
  ['Strength', 'Dexterity', 'Stamina'],
  ['Charisma', 'Manipulation', 'Composure'],
  ['Intelligence', 'Wits', 'Resolve'],
];

const SKILLS = {
  Physical: ['Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival'],
  Social: ['Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge'],
  Mental: ['Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology'],
};

// --- SHARED COMPONENTS & UTILS ---

const DotRow = ({ label, value, max = 5, onDotClick, disabled, icon }) => (
  <li className={styles.statRow}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {icon && <img src={icon} alt={label} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
      <span className={styles.statName}>{label}</span>
    </div>
    <div className={styles.circleDots}>
      {Array.from({ length: max }).map((_, i) => (
        <div 
          key={i} 
          className={`${styles.circleDot} ${i < value ? styles.circleDotFilled : ''}`}
          onClick={() => !disabled && onDotClick(i + 1)}
          style={{ cursor: disabled ? 'default' : 'pointer', opacity: disabled && value === 0 ? 0.3 : 1 }}
        />
      ))}
    </div>
  </li>
);

const SmallDots = ({ value, max = 5 }) => (
  <div className={styles.dotRowSmall}>
    {Array.from({ length: max }).map((_, i) => (
      <div 
        key={i} 
        className={`${styles.dotSmall} ${i < value ? styles.dotSmallFilled : ''}`}
      />
    ))}
  </div>
);

// --- ADVANTAGE PICKER HELPERS ---

// --- ADVANTAGE PICKER HELPERS ---

function shuffle(arr) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

function getRandomStats(tier) {
  let attrDots = [];
  let skillDots = [];
  if (tier === 1) {
    attrDots = [2, 2];
    skillDots = [2, 2, 2, 1, 1, 1, 1, 1];
  } else if (tier === 2) {
    attrDots = [3, 3, 2, 2, 2];
    skillDots = [3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1];
  } else if (tier >= 3) {
    attrDots = [4, 3, 3, 2, 2];
    skillDots = [4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1];
  }
  
  const FLAT_ATTRS = ATTRS.flat();
  const FLAT_SKILLS = Object.values(SKILLS).flat();

  const shuffledAttrs = shuffle(FLAT_ATTRS);
  const attributes = {};
  FLAT_ATTRS.forEach(a => attributes[a] = 1);
  attrDots.forEach((val, i) => attributes[shuffledAttrs[i]] = val);

  const shuffledSkills = shuffle(FLAT_SKILLS);
  const skills = {};
  skillDots.forEach((val, i) => skills[shuffledSkills[i]] = val);

  return { attributes, skills };
}

const MarketplaceRow = ({ title, cost, disabled, onBuy }) => (
  <div className={styles.shopItem}>
    <div className={styles.shopInfo}>
      <h5 className={styles.shopTitle}>{title}</h5>
      <span className={styles.shopCost}>Cost: {cost} XP</span>
    </div>
    <button className={styles.btnPrimary} disabled={disabled} onClick={onBuy}>
      Recruit
    </button>
  </div>
);

const InlineMeritsFlawsPicker = ({ isFlaw, isGhoul, selectedItems, onToggle }) => {
  const all = useMemo(() => allSelectableAdvantages(isFlaw, isGhoul), [isFlaw, isGhoul]);
  const [q, setQ] = useState('');
  
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return all;
    return all.filter(m => 
      m.name.toLowerCase().includes(qq) || 
      (m.category || '').toLowerCase().includes(qq) || 
      (m.description || '').toLowerCase().includes(qq)
    );
  }, [q, all]);

  const [expandedId, setExpandedId] = useState(null);
  const [notes, setNotes] = useState('');

  const handleExpand = (item) => {
    if (expandedId === item.id) {
      setExpandedId(null);
    } else {
      setExpandedId(item.id);
      const existing = selectedItems.find(s => s.id === item.id);
      setNotes(existing?.notes || '');
    }
  };

  const handleDotSelect = (item, dotVal) => {
    const existing = selectedItems.find(s => s.id === item.id);
    onToggle({ id: item.id, name: item.name, dots: dotVal, notes: existing ? existing.notes : '' });
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: `1px solid ${isFlaw ? 'rgba(194,24,7,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input 
          type="text" 
          placeholder={`Search ${isFlaw ? 'flaws' : 'merits'}...`} 
          value={q} 
          onChange={e => setQ(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }}
        />
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '6px' }}>
        {filtered.length === 0 && <div style={{ color: '#888', fontStyle: 'italic', padding: '8px' }}>No matches found.</div>}
        {filtered.map(item => {
          const isExpanded = expandedId === item.id;
          const existing = selectedItems.find(s => s.id === item.id);
          const isSelected = !!existing;
          const currentDots = existing ? existing.dots : 0;
          const allowed = item.allowed || [1];

          return (
            <div 
              key={item.id} 
              style={{
                border: `1px solid ${isSelected ? (isFlaw ? 'var(--error)' : 'var(--tint)') : 'var(--border, rgba(255,255,255,0.1))'}`,
                borderRadius: '8px',
                padding: '12px',
                background: isSelected ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => handleExpand(item)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <b style={{ color: isFlaw ? 'var(--error)' : '#fff', fontSize: '15px' }}>{item.name}</b>
                  <small style={{ color: '#888' }}>{item.category}</small>
                  
                  {!isExpanded ? (
                    isSelected ? (
                       <div className={styles.circleDots} style={{ marginLeft: '4px' }}>
                         {Array.from({ length: currentDots }).map((_, i) => (
                           <div key={i} className={`${styles.circleDot} ${styles.circleDotFilled}`} style={isFlaw ? { background: 'var(--error)', boxShadow: '0 0 8px var(--error)' } : {}} />
                         ))}
                       </div>
                    ) : (
                      <small style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                        {item.dotsSpec}
                      </small>
                    )
                  ) : (
                    <div className={styles.circleDots} style={{ marginLeft: '4px' }} onClick={e => e.stopPropagation()}>
                      {Array.from({ length: Math.max(...allowed) }).map((_, i) => {
                        const dotVal = i + 1;
                        const isValid = allowed.includes(dotVal);
                        const isFilled = dotVal <= currentDots;
                        return (
                          <div 
                            key={dotVal}
                            className={`${styles.circleDot} ${isFilled ? styles.circleDotFilled : ''}`}
                            onClick={() => {
                              if (!isValid) return;
                              if (currentDots === dotVal) {
                                onToggle({ id: item.id });
                              } else {
                                handleDotSelect(item, dotVal);
                              }
                            }}
                            style={{
                              cursor: isValid ? 'pointer' : 'not-allowed',
                              opacity: isValid ? 1 : 0.25,
                              ...(isFilled && isFlaw ? { background: 'var(--error)', boxShadow: '0 0 8px var(--error)' } : {})
                            }}
                            title={isValid ? `Select ${dotVal} dots` : `Cost ${dotVal} not available`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                {isExpanded && (
                   <button 
                    onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                    style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '22px', padding: 0, lineHeight: 1 }}
                   >
                     ×
                   </button>
                )}
              </div>
              
              {isExpanded && (
                <div style={{ color: '#aaa', fontSize: '0.9em', marginTop: '10px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {item.description}
                </div>
              )}

              {isExpanded && isSelected && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '12px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <input 
                    type="text" 
                    placeholder="Custom description / notes (optional)" 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)}
                    onBlur={() => onToggle({ id: item.id, name: item.name, dots: currentDots, notes })}
                    style={{ flex: 1, padding: '10px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', fontSize: '13px' }}
                  />
                  <div style={{ padding: '8px 12px', background: 'rgba(62, 207, 142, 0.1)', color: 'var(--success)', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                    Selected
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PowerDetailCard = ({ power, onClear, readOnly, noMargin }) => (
  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', marginTop: '8px', marginLeft: noMargin ? '0' : '32px', textAlign: 'left' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
      <h4 style={{ margin: 0, color: 'var(--tint)' }}>↳ {power.name}</h4>
      {onClear && !readOnly && (
        <button 
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          style={{ background: 'transparent', color: 'var(--error)', border: '1px solid var(--error)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
        >
          Change
        </button>
      )}
    </div>
    <div style={{ fontSize: '12px', color: '#ccc', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
      {power.cost && <div><strong>Cost:</strong> {power.cost}</div>}
      {power.duration && <div><strong>Duration:</strong> {power.duration}</div>}
      {power.dice_pool && power.dice_pool !== '—' && <div><strong>Dice:</strong> {power.dice_pool}</div>}
      {power.opposing_pool && power.opposing_pool !== '—' && <div><strong>Opposing:</strong> {power.opposing_pool}</div>}
    </div>
    <p style={{ margin: 0, color: '#aaa', fontSize: '12px', lineHeight: '1.4' }}>{power.notes || power.description || 'No description available.'}</p>
  </div>
);

const InlinePowerSelection = ({ disciplineName, onSelect, onCancel, noMargin }) => {
  const levels = DISCIPLINES[disciplineName]?.levels || {};
  const powers = levels[1] || [];

  if (powers.length === 0) {
    return <div style={{ marginLeft: noMargin ? '0' : '32px', fontSize: '12px', color: '#aaa', textAlign: 'left' }}>No Level 1 powers found for {disciplineName}.</div>;
  }

  return (
    <div style={{ marginLeft: noMargin ? '0' : '32px', marginTop: '8px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h5 style={{ margin: 0, color: '#fff' }}>Select {disciplineName} Power</h5>
        <button onClick={(e) => { e.stopPropagation(); onCancel(); }} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {powers.map(p => (
          <div key={p.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h6 style={{ margin: 0, color: 'var(--tint)', fontSize: '14px' }}>{p.name}</h6>
              <button 
                onClick={(e) => { e.stopPropagation(); onSelect(p); }}
                style={{ background: 'var(--tint)', color: '#000', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
              >
                Select
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#ccc', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '6px' }}>
              {p.cost && <div><strong>Cost:</strong> {p.cost}</div>}
              {p.duration && <div><strong>Duration:</strong> {p.duration}</div>}
            </div>
            <p style={{ margin: 0, color: '#aaa', fontSize: '11px', lineHeight: '1.4' }}>{p.notes || p.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};


const getValidationErrors = (draftSheet, tier) => {
  if (!draftSheet) return [];
  const errors = [];
  
  const attrCounts = { 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 }; // Tier 4: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 }
  const skillCounts = { 4: 0, 3: 0, 2: 0, 1: 0 }; // Tier 4: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  let assignedAttrs = 0;
  
  for (const val of Object.values(draftSheet.attributes || {})) {
      if (val > 0 && val <= 4) attrCounts[val]++; // Tier 4: val <= 5
      assignedAttrs++;
  }
  // /* Tier 4 logic: const baseAttr = tier === 4 ? 2 : 1; attrCounts[baseAttr] += (9 - assignedAttrs); */
  attrCounts[1] += (9 - assignedAttrs);
  
  for (const val of Object.values(draftSheet.skills || {})) {
      if (val > 0 && val <= 4) skillCounts[val]++; // Tier 4: val <= 5
  }
  
  let advPoints = (draftSheet.advantages || []).reduce((sum, a) => sum + Number(a.dots), 0);
  let flawPoints = (draftSheet.flaws || []).reduce((sum, f) => sum + Number(f.dots), 0);

  let maxFlaws = 0;
  let baseAdv = 0;
  if (tier === 1) { maxFlaws = 0; baseAdv = 0; }
  else if (tier === 2) { maxFlaws = 2; baseAdv = 3; }
  else if (tier === 3) { maxFlaws = 4; baseAdv = 10; }

  if (flawPoints > maxFlaws) {
    errors.push(`Flaws: Maximum ${maxFlaws} points allowed (Have ${flawPoints})`);
  }
  const maxAdv = baseAdv + flawPoints;
  if (advPoints > maxAdv) {
    errors.push(`Advantages: Maximum ${maxAdv} points allowed (Have ${advPoints})`);
  }

  let disciplineCount = 0;
  for (const val of Object.values(draftSheet.disciplines || {})) {
      if (val === 1) disciplineCount++;
      else if (val > 1) errors.push("Disciplines cannot exceed 1 dot.");
  }

  if (draftSheet.isGhoul && disciplineCount > 1) errors.push("Ghouls max 1 Discipline.");
  if (!draftSheet.isGhoul && disciplineCount > 0) errors.push("Non-ghouls cannot have Disciplines.");

  if (tier === 1) {
      if (attrCounts[2] !== 2) errors.push(`Attributes: Need two at 2 (Have ${attrCounts[2]})`);
      if (skillCounts[2] !== 3) errors.push(`Skills: Need three at 2 (Have ${skillCounts[2]})`);
      if (skillCounts[1] !== 5) errors.push(`Skills: Need five at 1 (Have ${skillCounts[1]})`);
      if (advPoints > 0) errors.push("Advantages not allowed");
  } 
  else if (tier === 2) {
      if (attrCounts[3] !== 2) errors.push(`Attributes: Need two at 3 (Have ${attrCounts[3]})`);
      if (attrCounts[2] !== 3) errors.push(`Attributes: Need three at 2 (Have ${attrCounts[2]})`);
      if (skillCounts[3] !== 3) errors.push(`Skills: Need three at 3 (Have ${skillCounts[3]})`);
      if (skillCounts[2] !== 4) errors.push(`Skills: Need four at 2 (Have ${skillCounts[2]})`);
      if (skillCounts[1] !== 5) errors.push(`Skills: Need five at 1 (Have ${skillCounts[1]})`);
      if (advPoints > 3) errors.push("Max 3 pts Advantages");
      if (flawPoints > 2) errors.push("Max 2 pts Flaws");
  }
  else if (tier === 3) {
      if (attrCounts[4] !== 1) errors.push(`Attributes: Need one at 4 (Have ${attrCounts[4]})`);
      if (attrCounts[3] !== 2) errors.push(`Attributes: Need two at 3 (Have ${attrCounts[3]})`);
      if (attrCounts[2] !== 2) errors.push(`Attributes: Need two at 2 (Have ${attrCounts[2]})`);
      if (skillCounts[4] !== 2) errors.push(`Skills: Need two at 4 (Have ${skillCounts[4]})`);
      if (skillCounts[3] !== 4) errors.push(`Skills: Need four at 3 (Have ${skillCounts[3]})`);
      if (skillCounts[2] !== 4) errors.push(`Skills: Need four at 2 (Have ${skillCounts[2]})`);
      if (skillCounts[1] !== 4) errors.push(`Skills: Need four at 1 (Have ${skillCounts[1]})`);
      if (advPoints > 10) errors.push("Max 10 pts Advantages");
      if (flawPoints > 4) errors.push("Max 4 pts Flaws");
  }
  /*
  else if (tier === 4) {
      if (attrCounts[5] !== 2) errors.push(`Attributes: Need two at 5 (Have ${attrCounts[5]})`);
      if (attrCounts[4] !== 2) errors.push(`Attributes: Need two at 4 (Have ${attrCounts[4]})`);
      if (attrCounts[3] !== 2) errors.push(`Attributes: Need two at 3 (Have ${attrCounts[3]})`);
      if (attrCounts[2] !== 3) errors.push(`Attributes: Need three at 2 (Have ${attrCounts[2]})`);
      if (attrCounts[1] > 0) errors.push(`Attributes: Cannot have 1s`);
      if (skillCounts[5] !== 1) errors.push(`Skills: Need one at 5 (Have ${skillCounts[5]})`);
      if (skillCounts[4] !== 3) errors.push(`Skills: Need three at 4 (Have ${skillCounts[4]})`);
      if (skillCounts[3] !== 5) errors.push(`Skills: Need five at 3 (Have ${skillCounts[3]})`);
      if (skillCounts[2] !== 6) errors.push(`Skills: Need six at 2 (Have ${skillCounts[2]})`);
      if (advPoints > 15) errors.push("Max 15 pts Advantages");
      if (flawPoints > 0) errors.push("Cannot have Flaws");
  }
  */
  return errors;
};


// --- MULTI-STEP WIZARD COMPONENT ---

const WizardModal = ({ isOpen, tier, cost, domitorXp, clanDisciplines, onCancel, onConfirm, isMigration, isAdminBypass, initialName, initialSheet, minTier = 1, onChangeTier }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [draftSheet, setDraftSheet] = useState({ attributes: {}, skills: {}, disciplines: {}, advantages: [], flaws: [], isGhoul: false, powers: [] });
  const [activeDisciplinePowerSelection, setActiveDisciplinePowerSelection] = useState(null);
  const [pendingAvatar, setPendingAvatar] = useState(null);
  

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName(initialName || '');
      setDraftSheet(initialSheet ? JSON.parse(JSON.stringify(initialSheet)) : { attributes: {}, skills: {}, disciplines: {}, advantages: [], flaws: [], isGhoul: false, powers: [] });
      setActiveDisciplinePowerSelection(null);
      setPendingAvatar(null);
    }
  }, [isOpen, initialName, initialSheet]);

  const canAfford = isMigration || domitorXp >= cost;
  const validationErrors = getValidationErrors(draftSheet, tier);

  const { attrCounts, skillCounts, advPoints, flawPoints } = useMemo(() => {
    const ac = { 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
    const sc = { 4: 0, 3: 0, 2: 0, 1: 0 };
    let assignedAttrs = 0;
    for (const val of Object.values(draftSheet.attributes || {})) {
        if (val > 0 && val <= 4) ac[val]++;
        assignedAttrs++;
    }
    ac[1] += (9 - assignedAttrs);
    for (const val of Object.values(draftSheet.skills || {})) {
        if (val > 0 && val <= 4) sc[val]++;
    }
    const ap = (draftSheet.advantages || []).reduce((sum, a) => sum + Number(a.dots), 0);
    const fp = (draftSheet.flaws || []).reduce((sum, f) => sum + Number(f.dots), 0);
    return { attrCounts: ac, skillCounts: sc, advPoints: ap, flawPoints: fp };
  }, [draftSheet]);

  const renderTracker = (current, required) => {
    let color = '#888';
    if (current > required) color = 'var(--error)';
    else if (current === required) color = 'var(--success)';
    else if (current > 0) color = '#f5a623';
    return <span style={{ color }}>({current}/{required})</span>;
  };

  const renderMaxTracker = (current, max) => {
    let color = '#888';
    if (current > max) color = 'var(--error)';
    else if (current === max) color = 'var(--success)';
    else if (current > 0) color = '#f5a623';
    return <span style={{ color }}>({current}/{max} pts)</span>;
  };

  const handleDotClick = (type, statName, newLevel) => {
    const currentLevel = draftSheet[type][statName] || (type === 'attributes' ? 1 : 0);
    let finalLevel = newLevel;
    if (currentLevel === newLevel) {
       finalLevel = type === 'attributes' ? 1 : newLevel - 1;
    }
    setDraftSheet(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [statName]: finalLevel
      }
    }));
  };

  const handleToggleAdvantage = (isFlaw, advObj) => {
    setDraftSheet(prev => {
      const arr = isFlaw ? [...prev.flaws] : [...prev.advantages];
      const idx = arr.findIndex(a => a.id === advObj.id);
      if (idx !== -1) {
        if (!advObj.name) {
           arr.splice(idx, 1);
        } else {
           arr[idx] = advObj;
        }
      } else if (advObj.name) {
        arr.push(advObj);
      }
      return { ...prev, [isFlaw ? 'flaws' : 'advantages']: arr };
    });
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      className={styles.wizardOverlayStitch}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div 
        className={styles.wizardModalStitch}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        
        {/* Decorative Lighting */}
        <div className={styles.bgBlurPinkStitch} />
        <div className={styles.bgBlurPurpleStitch} />

        <div className={styles.wizardHeaderStitch}>
          <div>
            <h2 className={styles.wizardTitleStitch}>Retainer Creation</h2>
            <p className={styles.wizardSubtitleStitch}>Design your loyal servant for the eternal night.</p>
          </div>
          <button type="button" className={styles.wizardCloseBtnStitch} onClick={onCancel}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className={styles.wizardContentStitch}>
          {/* Step Indicator */}
          <div className={styles.stepIndicatorStitch}>
            {[1, 2, 3].map((s) => (
              <div key={s} className={styles.stepItemStitch}>
                <div className={`${styles.stepCircleStitch} ${step >= s ? styles.stepCircleActiveStitch : styles.stepCircleInactiveStitch}`}>
                  {s}
                </div>
                <span className={`${styles.stepLabelStitch} ${step >= s ? styles.stepLabelActiveStitch : styles.stepLabelInactiveStitch}`}>
                  {s === 1 ? 'Basic Info' : s === 2 ? 'Traits' : 'Review'}
                </span>
                {s < 3 && (
                  <div className={`${styles.stepLineStitch} ${step > s ? styles.stepLineActiveStitch : styles.stepLineInactiveStitch}`} />
                )}
              </div>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.5s ease', position: 'relative', zIndex: 10 }}>
              <div style={{ display: 'flex', gap: '32px', marginBottom: '32px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '2px' }}>Retainer Name</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="Enter designation..."
                      className={styles.inputStitch}
                      autoFocus
                    />
                    <button className={styles.btnIconStitch} onClick={() => setName(generateGreekName())}>
                      <span className="material-symbols-outlined">casino</span>
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label className={styles.ghoulToggleStitch}>
                    <div style={{ flex: 1 }}>
                      <span style={{ display: 'block', color: 'white', fontWeight: '500' }}>Ghoul Status</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Grants Vitae to enhance capabilities.</span>
                    </div>
                    <div 
                      className={styles.toggleTrackStitch} 
                      style={{ backgroundColor: draftSheet.isGhoul ? 'var(--tint)' : 'rgba(255,255,255,0.1)' }}
                      onClick={(e) => {
                         e.preventDefault();
                         setDraftSheet(p => ({...p, isGhoul: !p.isGhoul}));
                      }}
                    >
                      <div className={styles.toggleThumbStitch} style={{ transform: draftSheet.isGhoul ? 'translateX(24px)' : 'translateX(0)' }} />
                    </div>
                  </label>
                </div>
              </div>

              {draftSheet.isGhoul && (
                <div className={styles.lightRedGlowStitch} style={{ marginBottom: '32px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#f59e0b' }}>warning</span>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '4px' }}>Maintenance Required:</strong>
                    Ghouling enforces a Blood Bond (loss of free will) and Vitae addiction. Ghoul-specific Flaws are now available in Step 2.
                  </div>
                </div>
              )}

              {!canAfford && !isMigration && (
                <div className={styles.errorBannerStitch} style={{ marginBottom: '24px' }}>
                  <span className="material-symbols-outlined">error</span>
                  Not enough XP. This requires {cost} XP, but you only have {domitorXp}.
                </div>
              )}
              {isMigration && (
                <div className={styles.successBannerStitch} style={{ marginBottom: '24px' }}>
                   <span className="material-symbols-outlined">check_circle</span>
                   This is a free migration to finalize your old Tier {tier} retainer's sheet.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', paddingTop: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 className={styles.stepTitleStitch}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>insights</span> Attributes
                    </h3>
                    <button type="button" onClick={() => setDraftSheet(p => ({ ...p, ...getRandomStats(tier) }))} className={styles.btnIconStitch} style={{ padding: '4px 8px', borderRadius: '8px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>casino</span>
                    </button>
                  </div>
                  
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                     {tier === 1 && <><span><span style={{color: 'var(--tint)'}}>••</span> {renderTracker(attrCounts[2], 2)}</span></>}
                     {tier === 2 && <><span><span style={{color: 'var(--tint)'}}>•••</span> {renderTracker(attrCounts[3], 2)}</span> <span><span style={{color: 'var(--tint)'}}>••</span> {renderTracker(attrCounts[2], 3)}</span></>}
                     {tier === 3 && <><span><span style={{color: 'var(--tint)'}}>••••</span> {renderTracker(attrCounts[4], 1)}</span> <span><span style={{color: 'var(--tint)'}}>•••</span> {renderTracker(attrCounts[3], 2)}</span> <span><span style={{color: 'var(--tint)'}}>••</span> {renderTracker(attrCounts[2], 2)}</span></>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {['Physical', 'Social', 'Mental'].map((cat, idx) => (
                      <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--tint)', letterSpacing: '1px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>{cat}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {ATTRS[idx].map((attr) => {
                            const dots = draftSheet.attributes[attr] || 1;
                            return (
                              <div key={attr} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span className={styles.dotLabelStitch}>{attr}</span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {[1, 2, 3, 4, 5].map((d) => (
                                    <div 
                                      key={d}
                                      onClick={() => handleDotClick('attributes', attr, d)}
                                      className={`${styles.dotCircleStitch} ${dots >= d ? styles.dotCircleFilledStitch : styles.dotCircleEmptyStitch}`}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className={styles.stepTitleStitch}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>build</span> Core Skills
                  </h3>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                     {tier === 1 && <><span><span style={{color: 'var(--tint)'}}>••</span> {renderTracker(skillCounts[2], 3)}</span> <span><span style={{color: 'var(--tint)'}}>•</span> {renderTracker(skillCounts[1], 5)}</span></>}
                     {tier === 2 && <><span><span style={{color: 'var(--tint)'}}>•••</span> {renderTracker(skillCounts[3], 3)}</span> <span><span style={{color: 'var(--tint)'}}>••</span> {renderTracker(skillCounts[2], 4)}</span> <span><span style={{color: 'var(--tint)'}}>•</span> {renderTracker(skillCounts[1], 5)}</span></>}
                     {tier === 3 && <><span><span style={{color: 'var(--tint)'}}>••••</span> {renderTracker(skillCounts[4], 2)}</span> <span><span style={{color: 'var(--tint)'}}>•••</span> {renderTracker(skillCounts[3], 4)}</span> <span><span style={{color: 'var(--tint)'}}>••</span> {renderTracker(skillCounts[2], 4)}</span> <span><span style={{color: 'var(--tint)'}}>•</span> {renderTracker(skillCounts[1], 4)}</span></>}
                  </div>
                  
                  <div className={styles.gridThreeColStitch}>
                    {Object.entries(SKILLS).map(([cat, skills]) => (
                      <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--tint)', letterSpacing: '1px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>{cat}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {skills.map((skill) => {
                            const dots = draftSheet.skills[skill] || 0;
                            return (
                              <div key={skill} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span className={styles.dotLabelStitch} style={{ fontSize: '12px' }}>{skill}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '2px' }}>
                                  {[1, 2, 3, 4, 5].map((d) => (
                                    <div 
                                      key={d}
                                      onClick={() => handleDotClick('skills', skill, d)}
                                      className={`${styles.dotCircleStitch} ${dots >= d ? styles.dotCircleFilledStitch : styles.dotCircleEmptyStitch}`}
                                      style={{ width: '10px', height: '10px' }}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ position: 'relative', zIndex: 10 }}
            >
              
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                  {tier === 1 && <span>Tier 1 retainers cannot have advantages.</span>}
                  {tier === 2 && <><span>Advantages {renderMaxTracker(advPoints, 3)}</span> <span style={{marginLeft: '16px'}}>Flaws {renderMaxTracker(flawPoints, 2)}</span></>}
                  {tier === 3 && <><span>Advantages {renderMaxTracker(advPoints, 10)}</span> <span style={{marginLeft: '16px'}}>Flaws {renderMaxTracker(flawPoints, 4)}</span></>}
                </span>
              </div>

              {tier > 1 ? (
                <div className={styles.gridTwoColStitch}>
                  <div className={styles.paneBlueStitch}>
                    <h3 className={`${styles.stepTitleStitch} ${styles.stepTitleBlueStitch}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>stars</span> Advantages
                    </h3>
                    <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
                      <InlineMeritsFlawsPicker 
                        isFlaw={false} 
                        isGhoul={draftSheet.isGhoul} 
                        selectedItems={draftSheet.advantages} 
                        onToggle={(adv) => handleToggleAdvantage(false, adv)} 
                      />
                    </div>
                  </div>

                  <div className={styles.paneRedStitch}>
                    <h3 className={`${styles.stepTitleStitch} ${styles.stepTitleRedStitch}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>heart_broken</span> Flaws
                    </h3>
                    <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
                      <InlineMeritsFlawsPicker 
                        isFlaw={true} 
                        isGhoul={draftSheet.isGhoul} 
                        selectedItems={draftSheet.flaws} 
                        onToggle={(adv) => handleToggleAdvantage(true, adv)} 
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>block</span>
                  <p>Tier 1 retainers are basic pawns and cannot possess specialized advantages or flaws.</p>
                </div>
              )}

              {draftSheet.isGhoul && (
                <div style={{ backgroundColor: 'color-mix(in srgb, var(--tint) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--tint) 10%, transparent)', padding: '24px', borderRadius: '16px', marginTop: '32px' }}>
                  <h3 style={{ color: 'white', fontWeight: 'bold', fontSize: '14px', marginBottom: '16px' }}>Ghoul Disciplines</h3>
                  
                  {clanDisciplines.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Your clan does not have standard in-clan disciplines listed.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {clanDisciplines.map(disc => {
                        const selectedPower = (draftSheet.powers || []).find(p => p.discipline === disc);
                        return (
                          <div key={disc}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '8px' }}>
                              <button type="button"
                                onClick={() => handleDotClick('disciplines', disc, draftSheet.disciplines[disc] ? 0 : 1)}
                                style={{
                                  padding: '12px 24px',
                                  backgroundColor: draftSheet.disciplines[disc] ? 'color-mix(in srgb, var(--tint) 10%, transparent)' : 'rgba(255,255,255,0.05)',
                                  border: `1px solid ${draftSheet.disciplines[disc] ? 'color-mix(in srgb, var(--tint) 40%, transparent)' : 'rgba(255,255,255,0.05)'}`,
                                  borderRadius: '12px',
                                  color: 'white',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <img src={iconPath(disc)} alt={disc} style={{ width: '24px', height: '24px', objectFit: 'contain', opacity: draftSheet.disciplines[disc] ? 1 : 0.3 }} />
                                {disc}
                              </button>
                              
                              {draftSheet.disciplines[disc] === 1 && !selectedPower && activeDisciplinePowerSelection !== disc && (
                                <div style={{ fontSize: '12px', color: 'var(--tint)', cursor: 'pointer', padding: '6px 12px', background: 'color-mix(in srgb, var(--tint) 10%, transparent)', borderRadius: '6px' }} onClick={() => setActiveDisciplinePowerSelection(disc)}>
                                  Click to select power
                                </div>
                              )}
                            </div>
                            
                            {draftSheet.disciplines[disc] === 1 && selectedPower && (
                              <div style={{ marginLeft: '16px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <PowerDetailCard 
                                  power={selectedPower} 
                                  onClear={() => setDraftSheet(prev => ({ ...prev, powers: (prev.powers || []).filter(p => p.discipline !== disc) }))} 
                                />
                              </div>
                            )}
                            
                            {draftSheet.disciplines[disc] === 1 && !selectedPower && activeDisciplinePowerSelection === disc && (
                              <div style={{ marginLeft: '16px', marginTop: '8px' }}>
                                <InlinePowerSelection 
                                  disciplineName={disc} 
                                  onSelect={(p) => {
                                    setDraftSheet(prev => ({ ...prev, powers: [...(prev.powers || []), { ...p, discipline: disc }] }));
                                    setActiveDisciplinePowerSelection(null);
                                  }} 
                                  onCancel={() => {
                                    setActiveDisciplinePowerSelection(null);
                                    setDraftSheet(prev => ({ ...prev, disciplines: { ...prev.disciplines, [disc]: 0 } }));
                                  }} 
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div style={{ animation: 'fadeIn 0.5s ease', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0' }}>
              <div className={styles.reviewSummaryStitch}>
                <div className={styles.avatarGlowStitch} style={{ padding: pendingAvatar ? 0 : undefined, overflow: 'hidden' }}>
                  {pendingAvatar ? (
                    <Avatar 
                      retainerId={null} 
                      editable={true} 
                      size={100} 
                      style={{ borderRadius: '50%' }}
                      previewUrl={URL.createObjectURL(pendingAvatar)}
                      onFileSelect={setPendingAvatar}
                    />
                  ) : (
                    <div onClick={() => document.getElementById('newAvatarInput').click()} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'white' }}>person</span>
                      <input id="newAvatarInput" type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => { if(e.target.files[0]) setPendingAvatar(e.target.files[0]) }} />
                    </div>
                  )}
                </div>
                {!pendingAvatar && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Click to add avatar
                  </div>
                )}
                
                <div style={{ margin: '24px 0' }}>
                  <h3 style={{ fontSize: '30px', fontWeight: 'bold', color: 'white', margin: 0 }}>{name || 'Unnamed Retainer'}</h3>
                  <div style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: 'color-mix(in srgb, var(--tint) 20%, transparent)', border: '1px solid color-mix(in srgb, var(--tint) 30%, transparent)', borderRadius: '99px', color: 'var(--tint)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>
                    Tier {tier} Retainer
                  </div>
                </div>

                {(() => {
                    const stamina = draftSheet.attributes['Stamina'] || 1;
                    let health = stamina + 3;
                    if (draftSheet.isGhoul && draftSheet.flaws.some(f => f.name === "Crone's Curse")) {
                      health -= 1;
                    }
                    if (draftSheet.isGhoul && draftSheet.powers && draftSheet.powers.some(p => p.discipline === 'Fortitude' && p.name === 'Resilience')) {
                      health += (draftSheet.disciplines['Fortitude'] || 1);
                    }
                    const willpower = (draftSheet.attributes['Composure'] || 1) + (draftSheet.attributes['Resolve'] || 1);
                    return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '24px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ textAlign: 'left' }}>
                            <span className={styles.summaryLabelStitch}>Health</span>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                              {Array.from({ length: health }).map((_, i) => (
                                <div key={i} style={{ width: '14px', height: '14px', border: '1px solid rgba(255,255,255,0.5)', backgroundColor: 'transparent' }} />
                              ))}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={styles.summaryLabelStitch}>Willpower</span>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '8px', justifyContent: 'flex-end' }}>
                              {Array.from({ length: willpower }).map((_, i) => (
                                <div key={i} style={{ width: '14px', height: '14px', border: '1px solid rgba(255,255,255,0.5)', backgroundColor: 'transparent' }} />
                              ))}
                            </div>
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <span className={styles.summaryLabelStitch}>Attributes</span>
                            <span className={styles.summaryValueStitch}>{Object.values(draftSheet.attributes).reduce((a, b) => a + b, 0)} points assigned</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={styles.summaryLabelStitch}>Skills</span>
                            <span className={styles.summaryValueStitch}>{Object.values(draftSheet.skills).reduce((a, b) => a + b, 0)} points assigned</span>
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <span className={styles.summaryLabelStitch}>Advantages</span>
                            <span className={styles.summaryValueStitch}>{draftSheet.advantages.length} ({advPoints} pts)</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={styles.summaryLabelStitch}>Flaws</span>
                            <span className={styles.summaryValueStitch}>{draftSheet.flaws.length} ({flawPoints} pts)</span>
                          </div>
                        </div>
                    )
                  })()}

                <div style={{ marginTop: '24px' }}>
                  {validationErrors.length === 0 ? (
                    <div className={styles.successBannerStitch}>
                      <span className="material-symbols-outlined" style={{ color: '#10b981' }}>check_circle</span>
                      Ready to recruit. All parameters within bounds.
                    </div>
                  ) : (
                    <div className={styles.errorBannerStitch} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span className="material-symbols-outlined">error</span>
                        Template Violations Detected
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '24px', fontSize: '13px', textAlign: 'left', opacity: 0.8 }}>
                        {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.wizardFooterStitch}>
          <button 
            type="button"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className={styles.btnBackStitch}
          >
            <span className="material-symbols-outlined">arrow_back</span> Back
          </button>

          {step < 3 ? (
            <button 
              type="button"
              onClick={() => setStep(Math.min(3, step + 1))}
              disabled={step === 1 && (!name.trim() || (!isAdminBypass && !canAfford))}
              className={styles.btnNextStitch}
            >
              Next Step
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => onConfirm(name, draftSheet, pendingAvatar)}
              disabled={validationErrors.length > 0 || (!isAdminBypass && !canAfford)}
              className={styles.btnNextStitch}
            >
              {isMigration ? "Complete Migration" : `Confirm & Pay ${cost} XP`}
              <span className="material-symbols-outlined">military_tech</span>
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};



// --- MAIN VIEW COMPONENT ---

export default function RetainersView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { character: stateCharacter, preselectRetainerId, isAdminBypass } = location.state || {};

  const [character, setCharacter] = useState(stateCharacter || null);
  const [retainers, setRetainers] = useState([]);
  const [selectedRetainerId, setSelectedRetainerId] = useState(preselectRetainerId || null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeDisciplinePowerSelection, setActiveDisciplinePowerSelection] = useState(null);
  

  // Edit Mode State (for updating existing retainers)
  const [isEditing, setIsEditing] = useState(false);
  const [draftSheet, setDraftSheet] = useState(null);

  
  // Wizard State (for creating new retainers)
  const [wizardConfig, setWizardConfig] = useState({ isOpen: false, tier: 1, isMigration: false, isUpgrade: false, migrationId: null });

  useEffect(() => {
    let active = true;
    if (!character) {
      api.get('/characters/me').then(res => {
        if (!active) return;
        if (res.data && res.data.character) {
           setCharacter(res.data.character);
        } else {
           navigate('/character');
        }
      }).catch(() => {
        if (active) navigate('/character');
      });
    }
    return () => { active = false; };
  }, [character, navigate]);

  useEffect(() => {
    if (!character) return;
    fetchRetainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

  const fetchRetainers = async () => {
    try {
      const res = await api.get(`/characters/${character.id}/retainers`);
      setRetainers(res.data);
      if (res.data.length > 0 && !selectedRetainerId) {
        setSelectedRetainerId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedRetainer = retainers.find(r => r.id === selectedRetainerId);

  // When selected retainer changes, exit edit mode
  useEffect(() => {
    setIsEditing(false);
    setDraftSheet(null);
  }, [selectedRetainerId]);

  const clanDisciplines = useMemo(() => {
    if (!character || !character.clan) return [];
    return CLAN_DISCIPLINES[character.clan] || [];
  }, [character]);

  const handleOpenWizard = (tier, isMigration = false, migrationId = null, isUpgrade = false) => {
    setWizardConfig({ isOpen: true, tier, isMigration, isUpgrade, migrationId });
  };

  const handleWizardConfirm = async (name, newSheet, pendingAvatar) => {
    const tier = wizardConfig.tier;
    const cost = tier * 3;
    
    try {
      setSaving(true);

      if (wizardConfig.isMigration || wizardConfig.isUpgrade) {
        const oldRetainer = retainers.find(r => r.id === wizardConfig.migrationId);
        const tierDiff = tier - (oldRetainer?.tier || 0);
        
        if (wizardConfig.isUpgrade && !isAdminBypass && tierDiff > 0) {
          await api.post(`/characters/xp/spend`, {
            type: 'advantage',
            target: `Upgrade Retainer ${name} to Tier ${tier}`,
            dots: tierDiff
          });
          setCharacter(prev => ({ ...prev, xp: prev.xp - (tierDiff * 3) }));
        }

        const endpoint = (!isAdminBypass && wizardConfig.isUpgrade) 
          ? `/retainers/${wizardConfig.migrationId}/upgrade` 
          : `/retainers/${wizardConfig.migrationId}`;
          
        const res = await api.put(endpoint, {
          name,
          tier,
          sheet: newSheet,
          xp: oldRetainer?.xp || 0
        });
        const updatedRetainer = res.data;
        setRetainers(retainers.map(r => r.id === updatedRetainer.id ? updatedRetainer : r));
        setSelectedRetainerId(updatedRetainer.id);
        
        if (pendingAvatar) {
          const formData = new FormData();
          formData.append('avatar', pendingAvatar);
          await api.put(`/retainers/${updatedRetainer.id}/avatar`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      } else {
        if (!isAdminBypass) {
          await api.post(`/characters/xp/spend`, {
            type: 'advantage',
            target: `Recruit Tier ${tier} Retainer: ${name}`,
            dots: tier
          });
        }
        const res = await api.post(`/characters/${character.id}/retainers`, {
          name,
          tier,
          sheet: newSheet,
          xp: 0
        });
        
        const newRetainer = res.data;
        setRetainers([...retainers, newRetainer]);
        setSelectedRetainerId(newRetainer.id);
        if (!isAdminBypass) {
          setCharacter(prev => ({ ...prev, xp: prev.xp - cost }));
        }
        
        if (pendingAvatar) {
          const formData = new FormData();
          formData.append('avatar', pendingAvatar);
          await api.put(`/retainers/${newRetainer.id}/avatar`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }
      
      // Close wizard
      setWizardConfig({ isOpen: false, tier: 1, isMigration: false, migrationId: null });
    } catch (e) {
      alert(e.response?.data?.error || "Failed to save retainer");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this retainer permanently?")) return;
    try {
      setSaving(true);
      await api.delete(`/retainers/${id}`);
      setRetainers(retainers.filter(r => r.id !== id));
      if (selectedRetainerId === id) setSelectedRetainerId(null);
    } catch (e) {
      alert("Failed to delete retainer");
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async () => {
    if (!selectedRetainer) return;
    const newName = prompt("Enter a new name for your retainer:", selectedRetainer.name);
    if (!newName || newName === selectedRetainer.name) return;
    try {
      setSaving(true);
      await api.put(`/retainers/${selectedRetainer.id}`, {
        name: newName,
        tier: selectedRetainer.tier,
        sheet: selectedRetainer.sheet,
        xp: selectedRetainer.xp
      });
      setRetainers(retainers.map(r => r.id === selectedRetainer.id ? { ...r, name: newName } : r));
    } catch (e) {
      alert(e.response?.data?.error || "Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSheet = async () => {
    if (!selectedRetainer || !draftSheet) return;
    try {
      setSaving(true);
      
      const targetTier = draftSheet.targetTier || selectedRetainer.tier;
      const tierDiff = targetTier - selectedRetainer.tier;
      
      if (tierDiff > 0) {
          const cost = tierDiff * 3;
          await api.post(`/characters/xp/spend`, {
             type: 'advantage',
             target: `Upgrade Retainer ${selectedRetainer.name} to Tier ${targetTier}`,
             dots: tierDiff
          });
          setCharacter(prev => ({ ...prev, xp: prev.xp - cost }));
      }

      const sheetToSave = { ...draftSheet };
      delete sheetToSave.targetTier;

      await api.put(`/retainers/${selectedRetainer.id}`, {
        name: selectedRetainer.name,
        tier: targetTier,
        sheet: sheetToSave,
        xp: selectedRetainer.xp
      });
      setRetainers(retainers.map(r => r.id === selectedRetainer.id ? { ...r, tier: targetTier, sheet: sheetToSave } : r));
      setIsEditing(false);
      setDraftSheet(null);
    } catch (e) {
      alert(e.response?.data?.error || "Validation Failed");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    const initSheet = selectedRetainer.sheet || {};
    setDraftSheet({
      attributes: initSheet.attributes || {},
      skills: initSheet.skills || {},
      disciplines: initSheet.disciplines || {},
      advantages: initSheet.advantages || [],
      flaws: initSheet.flaws || [],
      isGhoul: !!initSheet.isGhoul,
      targetTier: selectedRetainer.tier // For upgrading
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraftSheet(null);
  };

  const handleDotClick = (type, statName, newLevel) => {
    if (type === 'attributes') {
       const cl = draftSheet.attributes[statName] || 1;
       const fl = (cl === newLevel) ? 1 : newLevel;
       setDraftSheet(prev => ({ ...prev, attributes: { ...prev.attributes, [statName]: fl } }));
       return;
    }

    const cl = draftSheet[type][statName] || 0;
    const fl = (cl === newLevel) ? newLevel - 1 : newLevel;

    if (type === 'disciplines') {
      if (fl === 1) {
        setActiveDisciplinePowerSelection(statName);
        setDraftSheet(prev => {
          const powers = prev.powers ? prev.powers.filter(p => p.discipline !== statName) : [];
          return { ...prev, disciplines: { ...prev.disciplines, [statName]: 1 }, powers };
        });
        return;
      } else if (fl === 0) {
        setDraftSheet(prev => {
          const powers = prev.powers ? prev.powers.filter(p => p.discipline !== statName) : [];
          return { ...prev, disciplines: { ...prev.disciplines, [statName]: 0 }, powers };
        });
        return;
      }
    }

    setDraftSheet(prev => ({ ...prev, [type]: { ...prev[type], [statName]: fl } }));
  };

  const handleToggleAdvantageMain = (isFlaw, advObj) => {
    setDraftSheet(prev => {
      const arr = isFlaw ? [...prev.flaws] : [...prev.advantages];
      const idx = arr.findIndex(a => a.id === advObj.id);
      if (idx !== -1) {
        if (!advObj.name) {
           arr.splice(idx, 1);
        } else {
           arr[idx] = advObj;
        }
      } else if (advObj.name) {
        arr.push(advObj);
      }
      return { ...prev, [isFlaw ? 'flaws' : 'advantages']: arr };
    });
  };

  // Use shared validation logic
  const validationErrors = getValidationErrors(draftSheet || selectedRetainer?.sheet, draftSheet?.targetTier || selectedRetainer?.tier);
  const currentSheet = isEditing ? draftSheet : (selectedRetainer?.sheet || {});

  // Calculate upgrade cost dynamically
  const targetTier = draftSheet?.targetTier || selectedRetainer?.tier;
  const upgradeCost = targetTier > (selectedRetainer?.tier || 0) ? (targetTier - selectedRetainer.tier) * 3 : 0;
  const canAffordUpgrade = isAdminBypass || (character?.xp || 0) >= upgradeCost;

  if (loading) return <div style={{ padding: 40, color: '#fff' }}>Loading retainers...</div>;
  if (!character) return null;

  return (
    <div className={styles.container}>
      <WizardModal 
        isOpen={wizardConfig.isOpen} 
        tier={wizardConfig.tier} 
        cost={wizardConfig.tier * 3} 
        domitorXp={character.xp || 0}
        clanDisciplines={clanDisciplines}
        isMigration={wizardConfig.isMigration}
          isAdminBypass={isAdminBypass}
          initialName={selectedRetainer?.name}
          initialSheet={selectedRetainer?.sheet}
          minTier={selectedRetainer?.tier || 1}
        onCancel={() => setWizardConfig({ isOpen: false, tier: 1, isMigration: false, migrationId: null })}
        onConfirm={handleWizardConfirm}
      />
      
      <div className={styles.contentWrapper}>
        
        {/* Left Column */}
        <motion.div 
          className={styles.leftColumn}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          
          <div className={styles.header}>
            <h2 className={styles.title}>Retainers {isAdminBypass && <span style={{fontSize:"12px", color:"var(--error)", border:"1px solid var(--error)", padding:"2px 6px", borderRadius:"4px", marginLeft:"8px", verticalAlign:"middle"}}>ADMIN MODE</span>}</h2>
            <div className={styles.xpBadge}>
              <span className="material-symbols-outlined" style={{ color: 'var(--tint)', fontSize: '16px' }}>stars</span>
              <span className={styles.xpBadgeText}>{isAdminBypass ? "XP Costs Bypassed" : `Available XP: ${character.xp || 0}`}</span>
            </div>
          </div>
          
          {/* Active Thralls */}
          <div className={`${styles.glassPanel} ${styles.ambientGlow}`}>
            <h3 className={styles.panelTitle}>
              <span className="material-symbols-outlined" style={{ color: '#e0dedd' }}>group</span>
              Active Thralls
            </h3>
            
            {retainers.length === 0 ? (
              <p style={{ color: '#e0dedd', opacity: 0.7 }}>You have no retainers currently serving you.</p>
            ) : (
              <div className={styles.rosterList}>
                {retainers.map((r, idx) => (
                  <React.Fragment key={r.id}>
                    <button
                      className={`${styles.rosterItem} ${selectedRetainerId === r.id ? styles.rosterItemActive : ''}`}
                      onClick={() => setSelectedRetainerId(r.id)}
                    >
                      <div className={styles.rosterAvatar}>
                        <Avatar retainerId={r.id} size={48} fallback="/img/ATT-logo(1).png" />
                      </div>
                      <div className={styles.rosterInfo}>
                        <h4 className={styles.rosterName}>{r.name}</h4>
                        <SmallDots value={r.tier} max={3} />
                        {r.name === 'Migrated Retainer' && (
                          <div style={{ marginTop: '4px', background: 'rgba(255, 68, 68, 0.2)', color: '#ffb4a7', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', border: '1px solid rgba(255, 68, 68, 0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Attention Needed
                          </div>
                        )}
                      </div>
                      <span className={`material-symbols-outlined ${styles.chevron}`}>chevron_right</span>
                    </button>
                    {idx < retainers.length - 1 && <div className={styles.divider} />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Recruit New */}
          <div className={styles.glassPanel}>
            <h3 className={styles.panelTitle}>
              <span className="material-symbols-outlined" style={{ color: '#e0dedd' }}>person_add</span>
              Recruit New Retainers
            </h3>
            <div className={styles.shopList}>
              <MarketplaceRow title="Tier 1 Pawn" cost={3} disabled={saving || (character.xp || 0) < 3} onBuy={() => handleOpenWizard(1)} />
              <MarketplaceRow title="Tier 2 Associate" cost={6} disabled={saving || (character.xp || 0) < 6} onBuy={() => handleOpenWizard(2)} />
              <MarketplaceRow title="Tier 3 Specialist" cost={9} disabled={saving || (character.xp || 0) < 9} onBuy={() => handleOpenWizard(3)} />
              {/* <MarketplaceRow title="Tier 4 Deadly Mortal" cost={12} disabled={saving || (character.xp || 0) < 12} onBuy={() => handleOpenWizard(4)} /> */}
            </div>
          </div>

        </motion.div>

        {/* Right Main Pane */}
        <motion.div 
          className={styles.rightColumn}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
        >
          {selectedRetainer ? (
            <div className={`${styles.glassPanel} ${styles.ambientGlow} ${styles.sheetPanel}`} style={{ position: 'relative', overflow: 'hidden' }}>
              <div className={styles.bgAccent}></div>
              
              <div className={styles.sheetHeader}>
                <div className={styles.sheetAvatarWrapper}>
                  <div className={styles.sheetAvatar}>
                     <Avatar retainerId={selectedRetainer.id} size={128} editable={true} onUploadSuccess={fetchRetainers} />
                  </div>
                </div>
                
                <div className={styles.sheetHeaderInfo}>
                  <div className={styles.sheetNameRow}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h2 className={styles.sheetName}>{selectedRetainer.name}</h2>
                        <button onClick={handleRename} style={{ background: 'none', border: 'none', color: 'var(--tint)', cursor: 'pointer', padding: 0 }} title="Rename Retainer">
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                        </button>
                      </div>
                      
                      {isEditing ? (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                           <span className={styles.sheetTier}>Target Tier: </span>
                           <select 
                             value={draftSheet.targetTier || selectedRetainer.tier}
                             onChange={(e) => setDraftSheet(p => ({ ...p, targetTier: parseInt(e.target.value) }))}
                             style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', fontSize: '12px' }}
                           >
                             <option value={1} disabled={selectedRetainer.tier > 1}>Tier 1</option>
                             <option value={2} disabled={selectedRetainer.tier > 2}>Tier 2</option>
                             <option value={3} disabled={selectedRetainer.tier > 3}>Tier 3</option>
                             {/* <option value={4} disabled={selectedRetainer.tier > 4}>Tier 4</option> */}
                           </select>
                         </div>
                      ) : (
                         <p className={styles.sheetTier}>Tier {selectedRetainer.tier} {currentSheet.isGhoul ? 'Ghoul' : 'Mortal'}</p>
                      )}

                    </div>
                    <div className={styles.sheetControls}>
                       {!isEditing ? (
                         <>
                           <button className={styles.btnPrimary} onClick={startEditing} disabled={saving}>Edit Sheet</button>
                           <button className={`${styles.btnPrimary} ${styles.btnDanger}`} onClick={() => handleDelete(selectedRetainer.id)} disabled={saving}>Dismiss</button>
                         </>
                       ) : (
                         <>
                           <button 
                             className={styles.btnPrimary} 
                             onClick={handleSaveSheet} 
                             disabled={saving || validationErrors.length > 0 || !canAffordUpgrade} 
                             style={{ backgroundColor: (validationErrors.length > 0 || !canAffordUpgrade) ? 'var(--surface-variant)' : '' }}
                           >
                             {upgradeCost > 0 && !isAdminBypass ? `Pay ${upgradeCost} XP & Save` : 'Save Sheet'}
                           </button>
                           <button className={`${styles.btnPrimary} ${styles.btnDanger}`} onClick={cancelEditing} disabled={saving}>Cancel</button>
                         </>
                       )}
                    </div>
                  </div>
                  
                  {isEditing && (
                    <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <input type="checkbox" checked={draftSheet.isGhoul} onChange={e => setDraftSheet(p => ({...p, isGhoul: e.target.checked}))} />
                        Is Ghoul? (Unlocks 1 Discipline Dot)
                      </label>
                      {draftSheet.isGhoul && (
                        <div style={{ flex: '1 1 100%', padding: '12px', background: 'rgba(194, 24, 7, 0.1)', borderLeft: '3px solid var(--error)', borderRadius: '0 4px 4px 0' }}>
                          <h5 style={{ margin: '0 0 8px 0', color: '#ffb4a7', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
                            The Price of the Blood
                          </h5>
                          <p style={{ margin: 0, color: '#ffb4a7', fontSize: '12px', lineHeight: '1.4' }}>
                            Ghouling enforces a Blood Bond (loss of free will) and Vitae addiction. Ghoul-specific Flaws are now available below and can be used to fund extra Advantages.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {isEditing && upgradeCost > 0 && !canAffordUpgrade && (
                    <div style={{ background: 'rgba(194, 24, 7, 0.2)', padding: '12px', borderRadius: '8px', border: '1px solid #c21807', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-symbols-outlined" style={{ color: '#ffb4a7' }}>warning</span>
                      <span style={{ color: '#ffb4a7', fontSize: '13px' }}>Not enough XP! Upgrading to Tier {targetTier} requires {upgradeCost} XP. You only have {character.xp || 0} XP.</span>
                    </div>
                  )}

                  {isEditing && validationErrors.length > 0 && (
                    <div style={{ background: 'rgba(194, 24, 7, 0.2)', padding: '12px', borderRadius: '8px', border: '1px solid #c21807', marginTop: '16px' }}>
                      <span className="material-symbols-outlined" style={{ color: '#ffb4a7', verticalAlign: 'middle', marginRight: '8px' }}>error</span>
                      <strong style={{ color: '#ffb4a7', fontSize: '13px' }}>Template Violations for Tier {targetTier}:</strong>
                      <ul style={{ margin: '8px 0 0 24px', color: '#e5e2e1', fontSize: '12px' }}>
                        {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.statsGrid}>
                
                {/* Attributes */}
                <div className={styles.statsBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 className={styles.statsBoxTitle} style={{ margin: 0 }}>Attributes</h3>
                    {isEditing && (
                      <button type="button" onClick={() => setDraftSheet(p => ({ ...p, ...getRandomStats(targetTier) }))} style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>casino</span> Randomize</button>
                    )}
                  </div>
                  <div className={styles.statsGrid}>
                    {['Physical', 'Social', 'Mental'].map((cat, idx) => (
                      <div key={cat}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#e0dedd', opacity: 0.6, marginBottom: '12px', letterSpacing: '1px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>{cat}</div>
                        <ul className={styles.statList}>
                          {ATTRS[idx].map(attr => (
                            <DotRow 
                              key={attr}
                              label={attr}
                              value={(currentSheet.attributes || {})[attr] || 1 /* (targetTier === 4 ? 2 : 1) */}
                              onDotClick={(level) => handleDotClick('attributes', attr, level)}
                              disabled={!isEditing}
                            />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div className={styles.statsBox}>
                  <h3 className={styles.statsBoxTitle}>Skills</h3>
                  <div className={styles.statsGrid}>
                    {Object.entries(SKILLS).map(([cat, skills]) => (
                      <div key={cat}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#e0dedd', opacity: 0.6, marginBottom: '12px', letterSpacing: '1px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>{cat}</div>
                        <ul className={styles.statList}>
                          {skills.map(skill => (
                            <DotRow 
                              key={skill}
                              label={skill}
                              value={(currentSheet.skills || {})[skill] || 0}
                              onDotClick={(level) => handleDotClick('skills', skill, level)}
                              disabled={!isEditing}
                            />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Advantages */}
                    <div className={styles.statsBox} style={{ opacity: (isEditing && targetTier === 1) ? 0.5 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, color: '#fff', fontSize: '14px' }}>Advantages</h4>
                      </div>
                      {isEditing && targetTier > 1 ? (
                        <InlineMeritsFlawsPicker 
                          isFlaw={false} 
                          isGhoul={draftSheet.isGhoul} 
                          selectedItems={currentSheet.advantages || []} 
                          onToggle={(adv) => handleToggleAdvantageMain(false, adv)} 
                        />
                      ) : (
                        <ul className={styles.statList}>
                          {(currentSheet.advantages || []).map((adv, i) => (
                            <li key={i} className={styles.statRow}>
                              <span className={styles.statName}>{adv.name}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <SmallDots value={adv.dots} />
                              </div>
                            </li>
                          ))}
                          {(!currentSheet.advantages || currentSheet.advantages.length === 0) && <li style={{ fontSize: '12px', color: '#e0dedd', opacity: 0.5 }}>No advantages</li>}
                        </ul>
                      )}
                    </div>

                    {/* Flaws */}
                    <div className={styles.statsBox} style={{ opacity: (isEditing && targetTier === 1) ? 0.5 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, color: 'var(--error)', fontSize: '14px' }}>Flaws</h4>
                      </div>
                      {isEditing && targetTier > 1 ? (
                        <InlineMeritsFlawsPicker 
                          isFlaw={true} 
                          isGhoul={draftSheet.isGhoul} 
                          selectedItems={currentSheet.flaws || []} 
                          onToggle={(adv) => handleToggleAdvantageMain(true, adv)} 
                        />
                      ) : (
                        <ul className={styles.statList}>
                          {(currentSheet.flaws || []).map((flaw, i) => (
                            <li key={i} className={styles.statRow}>
                              <span className={styles.statName} style={{ color: 'var(--error)' }}>{flaw.name}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <SmallDots value={flaw.dots} />
                              </div>
                            </li>
                          ))}
                          {(!currentSheet.flaws || currentSheet.flaws.length === 0) && <li style={{ fontSize: '12px', color: '#e0dedd', opacity: 0.5 }}>No flaws</li>}
                        </ul>
                      )}
                    </div>
                </div>

                {/* Disciplines */}
                <div className={`${styles.statsBox} ${styles.disciplinesBox}`}>
                  <h3 className={styles.statsBoxTitle}>Disciplines</h3>
                  {!currentSheet.isGhoul ? (
                    <p style={{ color: '#e0dedd', opacity: 0.7 }}>Mortals cannot learn disciplines. Enable 'Is Ghoul?' to unlock 1 dot.</p>
                  ) : clanDisciplines.length === 0 ? (
                    <p style={{ color: '#e0dedd', opacity: 0.7 }}>No in-clan disciplines available for domitor clan.</p>
                  ) : (
                    <>
                    <div className={styles.disciplinesGrid}>
                      {clanDisciplines.map(disc => {
                        const level = (currentSheet.disciplines || {})[disc] || 0;
                        const selectedPower = (currentSheet.powers || []).find(p => p.discipline === disc);
                        return (
                          <div 
                            key={disc} 
                            className={styles.disciplineCard} 
                            onClick={() => isEditing && handleDotClick('disciplines', disc, level + 1)}
                            style={{ cursor: isEditing ? 'pointer' : 'default', flexDirection: 'column' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <img src={iconPath(disc)} alt={disc} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                              <h4 className={styles.disciplineName} style={{ flex: 1 }}>{disc}</h4>
                            </div>
                            <div className={styles.disciplineDots} style={{ marginTop: '8px' }}>
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`${styles.dotSmall} ${i < level ? styles.dotSmallFilled : ''}`}
                                  onClick={(e) => { e.stopPropagation(); isEditing && handleDotClick('disciplines', disc, i + 1); }}
                                />
                              ))}
                            </div>
                            {level === 1 && selectedPower && (
                              <PowerDetailCard 
                                power={selectedPower} 
                                onClear={isEditing ? () => setDraftSheet(prev => ({ ...prev, powers: (prev.powers || []).filter(p => p.discipline !== disc) })) : null} 
                                readOnly={!isEditing}
                                noMargin={true}
                              />
                            )}
                            {level === 1 && !selectedPower && isEditing && activeDisciplinePowerSelection !== disc && (
                              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--error)', cursor: 'pointer', padding: '4px 8px', background: 'rgba(194, 24, 7, 0.1)', borderRadius: '4px', display: 'inline-block' }} onClick={(e) => { e.stopPropagation(); setActiveDisciplinePowerSelection(disc); }}>
                                ↳ Click to select power
                              </div>
                            )}
                            {level === 1 && !selectedPower && isEditing && activeDisciplinePowerSelection === disc && (
                              <div onClick={e => e.stopPropagation()}>
                                <InlinePowerSelection 
                                  disciplineName={disc} 
                                  noMargin={true}
                                  onSelect={(p) => {
                                    setDraftSheet(prev => ({ ...prev, powers: [...(prev.powers || []), { ...p, discipline: disc }] }));
                                    setActiveDisciplinePowerSelection(null);
                                  }} 
                                  onCancel={() => {
                                    setActiveDisciplinePowerSelection(null);
                                    setDraftSheet(prev => ({ ...prev, disciplines: { ...prev.disciplines, [disc]: 0 } }));
                                  }} 
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}
                </div>

              </div>

              {selectedRetainer.name === "Migrated Retainer" && !isEditing && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 50,
                  backdropFilter: 'blur(12px)',
                  backgroundColor: 'rgba(10, 5, 20, 0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '40px'
                }}>
                  <span className="material-symbols-outlined" style={{ color: '#ffb4a7', fontSize: '64px', marginBottom: '24px' }}>warning</span>
                  <h2 style={{ color: '#fff', fontSize: '28px', marginBottom: '16px', letterSpacing: '1px' }}>Migration Incomplete</h2>
                  <p style={{ color: '#e5e2e1', fontSize: '16px', lineHeight: '1.6', maxWidth: '400px', marginBottom: '32px' }}>
                    This retainer was migrated from your old character sheet. You must build their V5 Mortal Template to unlock their sheet.
                  </p>
                  <button 
                    className={styles.btnPrimary} 
                    onClick={() => handleOpenWizard(selectedRetainer.tier, true, selectedRetainer.id)}
                    style={{ 
                      background: 'linear-gradient(45deg, var(--tint), #333399)', 
                      border: 'none', 
                      boxShadow: '0 0 15px rgba(255,0,204,0.6), inset 0 0 10px rgba(255,255,255,0.2)', 
                      padding: '12px 32px', 
                      fontWeight: 'bold', 
                      fontSize: '16px', 
                      textTransform: 'uppercase', 
                      letterSpacing: '2px',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    Complete Migration
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className={`${styles.glassPanel} ${styles.sheetPanel}`} style={{ justifyContent: 'center', alignItems: 'center' }}>
              <div className={styles.emptyState}>
                <span className={`material-symbols-outlined ${styles.emptyStateIcon}`}>groups</span>
                <h2 className={styles.emptyStateTitle}>Select or Recruit a Retainer</h2>
                <p className={styles.emptyStateText}>Manage your loyal servants from this dashboard.</p>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
