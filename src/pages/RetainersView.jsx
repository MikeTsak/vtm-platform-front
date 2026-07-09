import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../core/api';
import styles from '../styles/RetainersView.module.css';
import Avatar from '../components/Avatar';
import { DISCIPLINES, iconPath } from '../data/disciplines';
import { MERITS_AND_FLAWS } from '../data/merits_flaws';

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

function bulletCount(s = '') {
  const m = String(s).match(/•/g);
  return m ? m.length : 0;
}

function parseDotSpec(spec = '') {
  const src = String(spec).trim();
  if (!src) return [];
  if (/\bor\b/i.test(src)) {
    const opts = src.split(/\bor\b/i).map(s => bulletCount(s)).filter(n => n > 0);
    return Array.from(new Set(opts)).sort((a, b) => a - b);
  }
  if (src.includes('-')) {
    const [lo, hi] = src.split('-').map(s => bulletCount(s));
    if (lo > 0 && hi >= lo) { const out = []; for (let i = lo; i <= hi; i++) out.push(i); return out; }
  }
  if (src.includes('+')) {
    const min = bulletCount(src);
    return min > 0 ? [min] : [];
  }
  const n = bulletCount(src);
  return n > 0 ? [n] : [];
}

function allSelectableAdvantages(isFlaw) {
  const out = [];
  for (const [cat, payload] of Object.entries(MERITS_AND_FLAWS)) {
    if (['Caitiff', 'Thin-blood', 'Ghouls', 'Cults'].includes(cat)) continue;
    const pushIt = (item, category) => {
      const allowed = parseDotSpec(item.dots);
      if (!allowed.length) return;
      out.push({ id: item.id, name: item.name, dotsSpec: item.dots, description: item.description, category, allowed });
    };
    const list = isFlaw ? payload.flaws : payload.merits;
    (list || []).forEach(m => pushIt(m, cat));
    if (payload.groups) {
      for (const [sub, grp] of Object.entries(payload.groups)) {
        const subList = isFlaw ? grp.flaws : grp.merits;
        (subList || []).forEach(m => pushIt(m, `${cat} / ${sub}`));
      }
    }
  }
  const seen = new Set();
  return out.filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));
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

const AdvantagePicker = ({ isFlaw, onAdd, onCancel }) => {
  const all = useMemo(() => allSelectableAdvantages(isFlaw), [isFlaw]);
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState(all[0]?.id || '');
  const sel = useMemo(() => all.find(m => m.id === selId) || null, [all, selId]);
  
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return all;
    return all.filter(m => m.name.toLowerCase().includes(qq) || (m.category || '').toLowerCase().includes(qq));
  }, [q, all]);

  const groupedOptions = useMemo(() => {
    return filtered.reduce((acc, m) => {
      acc[m.category || 'General'] = acc[m.category || 'General'] || [];
      acc[m.category || 'General'].push(m);
      return acc;
    }, {});
  }, [filtered]);

  const dotsOptions = useMemo(() => sel?.allowed || [], [sel]);
  const [dots, setDots] = useState(dotsOptions[0] || 1);

  useEffect(() => {
    if (sel && dotsOptions.length > 0 && !dotsOptions.includes(Number(dots))) {
      setDots(dotsOptions[0]);
    }
  }, [selId, dots, dotsOptions, sel]);

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', marginTop: '12px', border: `1px solid ${isFlaw ? 'rgba(194,24,7,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input 
          type="text" 
          placeholder={`Search ${isFlaw ? 'flaws' : 'merits'}...`} 
          value={q} 
          onChange={e => setQ(e.target.value)}
          style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <select 
          value={selId} 
          onChange={e => setSelId(e.target.value)}
          style={{ flex: 2, padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
        >
          {Object.entries(groupedOptions).map(([cat, list]) => (
            <optgroup key={cat} label={cat}>
              {list.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.dotsSpec})</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select 
          value={dots} 
          onChange={e => setDots(Number(e.target.value))}
          style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
        >
          {dotsOptions.map(d => (
            <option key={d} value={d}>{d} Dot{d > 1 ? 's' : ''}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button onClick={onCancel} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #888', color: '#888', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
        <button 
          onClick={() => onAdd({ id: sel?.id, name: sel?.name, dots: Number(dots) })}
          disabled={!sel}
          style={{ padding: '6px 12px', background: isFlaw ? 'var(--error)' : 'var(--tint)', border: 'none', color: '#000', borderRadius: '4px', cursor: !sel ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '12px' }}
        >
          Add {isFlaw ? 'Flaw' : 'Advantage'}
        </button>
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

const WizardModal = ({ isOpen, tier, cost, domitorXp, clanDisciplines, onCancel, onConfirm, isMigration }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [draftSheet, setDraftSheet] = useState({ attributes: {}, skills: {}, disciplines: {}, advantages: [], flaws: [], isGhoul: false, powers: [] });
  const [showAdvantagePicker, setShowAdvantagePicker] = useState(false);
  const [showFlawPicker, setShowFlawPicker] = useState(false);

  const [activeDisciplinePowerSelection, setActiveDisciplinePowerSelection] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName('');
      setDraftSheet({ attributes: {}, skills: {}, disciplines: {}, advantages: [], flaws: [], isGhoul: false, powers: [] });
      setShowAdvantagePicker(false);
      setShowFlawPicker(false);
      setActiveDisciplinePowerSelection(null);
    }
  }, [isOpen]);



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
    /* const baseAttr = tier === 4 ? 2 : 1; */
    const currentLevel = draftSheet[type][statName] || (type === 'attributes' ? 1 /* baseAttr */ : 0);
    let finalLevel = newLevel;
    if (currentLevel === newLevel) {
       finalLevel = type === 'attributes' ? 1 /* baseAttr */ : newLevel - 1;
    }
    setDraftSheet(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [statName]: finalLevel
      }
    }));
  };

  const handleAddAdvantage = (isFlaw, advObj) => {
    setDraftSheet(prev => {
      const arr = isFlaw ? [...prev.flaws] : [...prev.advantages];
      arr.push(advObj);
      return { ...prev, [isFlaw ? 'flaws' : 'advantages']: arr };
    });
    if (isFlaw) setShowFlawPicker(false);
    else setShowAdvantagePicker(false);
  };

  const handleRemoveAdvantage = (index, isFlaw) => {
    setDraftSheet(prev => {
      const arr = isFlaw ? [...prev.flaws] : [...prev.advantages];
      arr.splice(index, 1);
      return { ...prev, [isFlaw ? 'flaws' : 'advantages']: arr };
    });
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(6px)' }}>
      <div style={{ background: '#1a1a1a', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '32px', width: '900px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>Recruit Tier {tier} Retainer</h2>
          <span style={{ color: 'var(--tint)', fontSize: '14px', fontWeight: 'bold' }}>Step {step} / 2</span>
        </div>

        {/* STEP 1: Basic Info & Base Stats */}
        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: '#a0a0a0', marginBottom: '8px', fontSize: '13px' }}>Retainer Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Enter name..."
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                  autoFocus
                />
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e0dedd', cursor: 'pointer', fontSize: '14px' }}>
                  <input type="checkbox" checked={draftSheet.isGhoul} onChange={e => setDraftSheet(p => ({...p, isGhoul: e.target.checked}))} />
                  Is this retainer a Ghoul?
                </label>
                <p style={{ margin: '8px 0 0 24px', fontSize: '12px', color: '#888', lineHeight: '1.4' }}>
                  Unlocks 1 dot of an in-clan discipline in Step 2.
                </p>
              </div>
            </div>

            {!canAfford && !isMigration && (
              <div style={{ background: 'rgba(194, 24, 7, 0.2)', padding: '12px', borderRadius: '8px', border: '1px solid #c21807', color: '#ffb4a7', fontSize: '13px', marginBottom: '24px' }}>
                Not enough XP. This requires {cost} XP, but you only have {domitorXp}.
              </div>
            )}
            {isMigration && (
              <div style={{ background: 'rgba(62, 207, 142, 0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--success)', color: '#fff', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <span className="material-symbols-outlined" style={{ color: 'var(--success)' }}>check_circle</span>
                 This is a free migration to finalize your old Tier {tier} retainer's sheet.
              </div>
            )}

             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
               <h3 style={{ color: '#e0dedd', margin: 0, fontSize: '16px' }}>Attributes</h3>
               <span style={{ color: '#888', fontSize: '12px', display: 'flex', gap: '12px' }}>
                 {tier === 1 && <><span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>••</span> {renderTracker(attrCounts[2], 2)}</span></>}
                 {tier === 2 && <><span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>•••</span> {renderTracker(attrCounts[3], 2)}</span> <span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>••</span> {renderTracker(attrCounts[2], 3)}</span></>}
                 {tier === 3 && <><span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>••••</span> {renderTracker(attrCounts[4], 1)}</span> <span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>•••</span> {renderTracker(attrCounts[3], 2)}</span> <span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>••</span> {renderTracker(attrCounts[2], 2)}</span></>}
               </span>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
               {['Physical', 'Social', 'Mental'].map((cat, idx) => (
                 <div key={cat}>
                   <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#e0dedd', opacity: 0.6, marginBottom: '8px', letterSpacing: '1px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>{cat}</div>
                   <ul className={styles.statList}>
                     {ATTRS[idx].map(attr => (
                       <DotRow 
                         key={attr}
                         label={attr}
                         value={draftSheet.attributes[attr] || 1}
                         onDotClick={(level) => handleDotClick('attributes', attr, level)}
                       />
                     ))}
                   </ul>
                 </div>
               ))}
             </div>

             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
               <h3 style={{ color: '#e0dedd', margin: 0, fontSize: '16px' }}>Skills</h3>
               <span style={{ color: '#888', fontSize: '12px', display: 'flex', gap: '12px' }}>
                 {tier === 1 && <><span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>••</span> {renderTracker(skillCounts[2], 3)}</span> <span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>•</span> {renderTracker(skillCounts[1], 5)}</span></>}
                 {tier === 2 && <><span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>•••</span> {renderTracker(skillCounts[3], 3)}</span> <span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>••</span> {renderTracker(skillCounts[2], 4)}</span> <span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>•</span> {renderTracker(skillCounts[1], 5)}</span></>}
                 {tier === 3 && <><span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>••••</span> {renderTracker(skillCounts[4], 2)}</span> <span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>•••</span> {renderTracker(skillCounts[3], 4)}</span> <span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>••</span> {renderTracker(skillCounts[2], 4)}</span> <span><span style={{letterSpacing: '2px', color: '#ffb4a7'}}>•</span> {renderTracker(skillCounts[1], 4)}</span></>}
               </span>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', paddingRight: '8px' }}>
               {Object.entries(SKILLS).map(([cat, skills]) => (
                 <div key={cat} style={{ marginBottom: '16px' }}>
                   <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#e0dedd', opacity: 0.6, marginBottom: '8px', letterSpacing: '1px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>{cat}</div>
                   <ul className={styles.statList}>
                     {skills.map(skill => (
                       <DotRow 
                         key={skill}
                         label={skill}
                         value={draftSheet.skills[skill] || 0}
                         onDotClick={(level) => handleDotClick('skills', skill, level)}
                       />
                     ))}
                   </ul>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* STEP 2: Traits, Disciplines & Review */}
        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
               <h3 style={{ color: '#e0dedd', margin: 0, fontSize: '16px' }}>Advantages & Flaws</h3>
               <span style={{ color: '#888', fontSize: '12px', display: 'flex', gap: '12px' }}>
                 {tier === 1 && <span>Tier 1 retainers cannot have advantages.</span>}
                 {tier === 2 && <><span>Advantages {renderMaxTracker(advPoints, 3)}</span> <span>Flaws {renderMaxTracker(flawPoints, 2)}</span></>}
                 {tier === 3 && <><span>Advantages {renderMaxTracker(advPoints, 10)}</span> <span>Flaws {renderMaxTracker(flawPoints, 4)}</span></>}
               </span>
             </div>
             
             <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
               <div className={styles.statsBox} style={{ flex: 1, margin: 0, opacity: tier === 1 ? 0.5 : 1 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                   <h4 style={{ margin: 0, color: '#fff', fontSize: '14px' }}>Advantages</h4>
                   {tier > 1 && !showAdvantagePicker && (
                     <button onClick={() => setShowAdvantagePicker(true)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '11px' }}>+ Add</button>
                   )}
                 </div>
                 {showAdvantagePicker && <AdvantagePicker isFlaw={false} onAdd={(adv) => handleAddAdvantage(false, adv)} onCancel={() => setShowAdvantagePicker(false)} />}
                 <ul className={styles.statList}>
                   {draftSheet.advantages.map((adv, i) => (
                     <li key={i} className={styles.statRow}>
                       <span className={styles.statName}>{adv.name}</span>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <SmallDots value={adv.dots} />
                         <button onClick={() => handleRemoveAdvantage(i, false)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span></button>
                       </div>
                     </li>
                   ))}
                   {draftSheet.advantages.length === 0 && <li style={{ fontSize: '12px', color: '#888' }}>None</li>}
                 </ul>
               </div>

               <div className={styles.statsBox} style={{ flex: 1, margin: 0, opacity: tier === 1 ? 0.5 : 1 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                   <h4 style={{ margin: 0, color: 'var(--error)', fontSize: '14px' }}>Flaws</h4>
                   {tier > 1 && !showFlawPicker && (
                     <button onClick={() => setShowFlawPicker(true)} style={{ background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '11px' }}>+ Add</button>
                   )}
                 </div>
                 {showFlawPicker && <AdvantagePicker isFlaw={true} onAdd={(adv) => handleAddAdvantage(true, adv)} onCancel={() => setShowFlawPicker(false)} />}
                 <ul className={styles.statList}>
                   {draftSheet.flaws.map((flaw, i) => (
                     <li key={i} className={styles.statRow}>
                       <span className={styles.statName} style={{ color: 'var(--error)' }}>{flaw.name}</span>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <SmallDots value={flaw.dots} />
                         <button onClick={() => handleRemoveAdvantage(i, true)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span></button>
                       </div>
                     </li>
                   ))}
                   {draftSheet.flaws.length === 0 && <li style={{ fontSize: '12px', color: '#888' }}>None</li>}
                 </ul>
               </div>
             </div>

             <h3 style={{ color: '#e0dedd', marginBottom: '16px', fontSize: '16px' }}>Disciplines</h3>
             {!draftSheet.isGhoul ? (
               <div style={{ padding: '20px', textAlign: 'center', color: '#888', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px' }}>
                 <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>block</span>
                 <p style={{ margin: 0 }}>Mortals cannot learn disciplines.<br/>You must make them a Ghoul on Step 1 to unlock this.</p>
               </div>
             ) : clanDisciplines.length === 0 ? (
               <div style={{ padding: '20px', textAlign: 'center', color: '#888', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px' }}>
                 <p style={{ margin: 0 }}>Your clan does not have standard in-clan disciplines listed.</p>
               </div>
             ) : (
                <>
                  <ul className={styles.statList}>
                    {clanDisciplines.map(disc => {
                      const selectedPower = (draftSheet.powers || []).find(p => p.discipline === disc);
                      return (
                        <div key={disc} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                          <DotRow label={disc} value={draftSheet.disciplines[disc] || 0} max={tier === 1 ? 1 : 1} onDotClick={(val) => handleDotClick('disciplines', disc, val)} icon={iconPath(disc)} />
                          {draftSheet.disciplines[disc] === 1 && selectedPower && (
                            <PowerDetailCard 
                              power={selectedPower} 
                              onClear={() => setDraftSheet(prev => ({ ...prev, powers: (prev.powers || []).filter(p => p.discipline !== disc) }))} 
                            />
                          )}
                          {draftSheet.disciplines[disc] === 1 && !selectedPower && activeDisciplinePowerSelection !== disc && (
                            <div style={{ marginLeft: '32px', marginTop: '8px', fontSize: '12px', color: 'var(--error)', cursor: 'pointer', padding: '4px 8px', background: 'rgba(194, 24, 7, 0.1)', borderRadius: '4px', display: 'inline-block' }} onClick={() => setActiveDisciplinePowerSelection(disc)}>
                              ↳ Click to select power
                            </div>
                          )}
                          {draftSheet.disciplines[disc] === 1 && !selectedPower && activeDisciplinePowerSelection === disc && (
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
                          )}
                        </div>
                      );
                    })}
                  </ul>
                </>
             )}

             <h3 style={{ color: '#e0dedd', marginBottom: '16px', fontSize: '16px' }}>Review & Finalize</h3>
             {validationErrors.length === 0 ? (
               <div style={{ background: 'rgba(62, 207, 142, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--success)', textAlign: 'center' }}>
                 <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: '32px', marginBottom: '8px' }}>check_circle</span>
                 <p style={{ margin: 0, color: '#e0dedd' }}>The character sheet strictly matches the Tier {tier} V5 Template.</p>
                 <p style={{ margin: '8px 0 0 0', color: 'var(--success)', fontWeight: 'bold' }}>Ready to finalize for {cost} XP.</p>
               </div>
             ) : (
               <div style={{ background: 'rgba(194, 24, 7, 0.2)', padding: '16px', borderRadius: '8px', border: '1px solid #c21807' }}>
                 <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                   <span className="material-symbols-outlined" style={{ color: '#ffb4a7', marginRight: '8px' }}>error</span>
                   <strong style={{ color: '#ffb4a7', fontSize: '14px' }}>Template Violations:</strong>
                 </div>
                 <ul style={{ margin: 0, paddingLeft: '24px', color: '#e5e2e1', fontSize: '13px', lineHeight: '1.6', columns: 2 }}>
                   {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                 </ul>
                 <p style={{ marginTop: '16px', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                   You cannot recruit this retainer until all rules are met.
                 </p>
               </div>
             )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginTop: '24px' }}>
          <div>
            <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '8px 0' }}>Cancel Recruitment</button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
            )}
            
            {step < 2 ? (
              <button 
                onClick={() => setStep(s => s + 1)} 
                disabled={step === 1 && (!name.trim() || !canAfford)}
                style={{ background: 'var(--tint)', border: 'none', color: '#000', padding: '8px 24px', borderRadius: '6px', cursor: (step === 1 && (!name.trim() || !canAfford)) ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: (step === 1 && (!name.trim() || !canAfford)) ? 0.5 : 1 }}
              >
                Next Step
              </button>
            ) : (
              <button 
                onClick={() => onConfirm(name, draftSheet)} 
                disabled={validationErrors.length > 0 || !canAfford}
                style={{ background: 'var(--tint)', border: 'none', color: '#000', padding: '8px 24px', borderRadius: '6px', cursor: (validationErrors.length > 0 || !canAfford) ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: (validationErrors.length > 0 || !canAfford) ? 0.5 : 1 }}
              >
                {isMigration ? "Complete Migration" : `Confirm & Pay ${cost} XP`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- MAIN VIEW COMPONENT ---

export default function RetainersView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { character: stateCharacter } = location.state || {};

  const [character, setCharacter] = useState(stateCharacter || null);
  const [retainers, setRetainers] = useState([]);
  const [selectedRetainerId, setSelectedRetainerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeDisciplinePowerSelection, setActiveDisciplinePowerSelection] = useState(null);

  // Edit Mode State (for updating existing retainers)
  const [isEditing, setIsEditing] = useState(false);
  const [draftSheet, setDraftSheet] = useState(null);
  const [showAdvantagePickerMain, setShowAdvantagePickerMain] = useState(false);
  const [showFlawPickerMain, setShowFlawPickerMain] = useState(false);
  
  // Wizard State (for creating new retainers)
  const [wizardConfig, setWizardConfig] = useState({ isOpen: false, tier: 1, isMigration: false, migrationId: null });

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

  const handleOpenWizard = (tier, isMigration = false, migrationId = null) => {
    setWizardConfig({ isOpen: true, tier, isMigration, migrationId });
  };

  const handleWizardConfirm = async (name, newSheet) => {
    const tier = wizardConfig.tier;
    const cost = tier * 3;
    
    try {
      setSaving(true);

      if (wizardConfig.isMigration) {
        const res = await api.put(`/retainers/${wizardConfig.migrationId}`, {
          name,
          tier,
          sheet: newSheet,
          xp: 0
        });
        const updatedRetainer = res.data;
        setRetainers(retainers.map(r => r.id === updatedRetainer.id ? updatedRetainer : r));
        setSelectedRetainerId(updatedRetainer.id);
      } else {
        await api.post(`/characters/xp/spend`, {
          type: 'advantage',
          target: `Recruit Tier ${tier} Retainer: ${name}`,
          dots: tier
        });
        const res = await api.post(`/characters/${character.id}/retainers`, {
          name,
          tier,
          sheet: newSheet,
          xp: 0
        });
        
        const newRetainer = res.data;
        setRetainers([...retainers, newRetainer]);
        setSelectedRetainerId(newRetainer.id);
        setCharacter(prev => ({ ...prev, xp: prev.xp - cost }));
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

  const handleAddAdvantage = (isFlaw, advObj) => {
    setDraftSheet(prev => {
      const arr = isFlaw ? [...prev.flaws] : [...prev.advantages];
      arr.push(advObj);
      return { ...prev, [isFlaw ? 'flaws' : 'advantages']: arr };
    });
    if (isFlaw) setShowFlawPickerMain(false);
    else setShowAdvantagePickerMain(false);
  };

  const handleRemoveAdvantage = (index, isFlaw) => {
    setDraftSheet(prev => {
      const arr = isFlaw ? [...prev.flaws] : [...prev.advantages];
      arr.splice(index, 1);
      return { ...prev, [isFlaw ? 'flaws' : 'advantages']: arr };
    });
  };

  // Use shared validation logic
  const validationErrors = getValidationErrors(draftSheet || selectedRetainer?.sheet, draftSheet?.targetTier || selectedRetainer?.tier);
  const currentSheet = isEditing ? draftSheet : (selectedRetainer?.sheet || {});

  // Calculate upgrade cost dynamically
  const targetTier = draftSheet?.targetTier || selectedRetainer?.tier;
  const upgradeCost = targetTier > (selectedRetainer?.tier || 0) ? (targetTier - selectedRetainer.tier) * 3 : 0;
  const canAffordUpgrade = (character?.xp || 0) >= upgradeCost;

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
        onCancel={() => setWizardConfig({ isOpen: false, tier: 1, isMigration: false, migrationId: null })}
        onConfirm={handleWizardConfirm}
      />
      
      <div className={styles.contentWrapper}>
        
        {/* Left Column */}
        <div className={styles.leftColumn}>
          
          <div className={styles.header}>
            <h2 className={styles.title}>Retainers</h2>
            <div className={styles.xpBadge}>
              <span className="material-symbols-outlined" style={{ color: 'var(--tint)', fontSize: '16px' }}>stars</span>
              <span className={styles.xpBadgeText}>Available XP: {character.xp || 0}</span>
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

        </div>

        {/* Right Main Pane */}
        <div className={styles.rightColumn}>
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
                             {upgradeCost > 0 ? `Pay ${upgradeCost} XP & Save` : 'Save Sheet'}
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
                  <h3 className={styles.statsBoxTitle}>Attributes</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
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
                        {isEditing && targetTier > 1 && !showAdvantagePickerMain && <button onClick={() => setShowAdvantagePickerMain(true)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '11px' }}>+ Add</button>}
                      </div>
                      {showAdvantagePickerMain && <AdvantagePicker isFlaw={false} onAdd={(adv) => handleAddAdvantage(false, adv)} onCancel={() => setShowAdvantagePickerMain(false)} />}
                      <ul className={styles.statList}>
                        {(currentSheet.advantages || []).map((adv, i) => (
                          <li key={i} className={styles.statRow}>
                            <span className={styles.statName}>{adv.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <SmallDots value={adv.dots} />
                              {isEditing && <button onClick={() => handleRemoveAdvantage(i, false)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span></button>}
                            </div>
                          </li>
                        ))}
                        {(!currentSheet.advantages || currentSheet.advantages.length === 0) && <li style={{ fontSize: '12px', color: '#e0dedd', opacity: 0.5 }}>No advantages</li>}
                      </ul>
                    </div>

                    {/* Flaws */}
                    <div className={styles.statsBox} style={{ opacity: (isEditing && targetTier === 1) ? 0.5 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ margin: 0, color: 'var(--error)', fontSize: '14px' }}>Flaws</h4>
                        {isEditing && targetTier > 1 && !showFlawPickerMain && <button onClick={() => setShowFlawPickerMain(true)} style={{ background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '11px' }}>+ Add</button>}
                      </div>
                      {showFlawPickerMain && <AdvantagePicker isFlaw={true} onAdd={(adv) => handleAddAdvantage(true, adv)} onCancel={() => setShowFlawPickerMain(false)} />}
                      <ul className={styles.statList}>
                        {(currentSheet.flaws || []).map((flaw, i) => (
                          <li key={i} className={styles.statRow}>
                            <span className={styles.statName} style={{ color: 'var(--error)' }}>{flaw.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <SmallDots value={flaw.dots} />
                              {isEditing && <button onClick={() => handleRemoveAdvantage(i, true)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span></button>}
                            </div>
                          </li>
                        ))}
                        {(!currentSheet.flaws || currentSheet.flaws.length === 0) && <li style={{ fontSize: '12px', color: '#e0dedd', opacity: 0.5 }}>No flaws</li>}
                      </ul>
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
                      background: 'linear-gradient(45deg, #ff00cc, #333399)', 
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
        </div>

      </div>
    </div>
  );
}
