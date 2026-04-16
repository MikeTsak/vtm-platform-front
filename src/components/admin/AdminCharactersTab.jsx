// src/components/admin/AdminCharactersTab.jsx
import React, { useMemo, useState } from 'react';
import api from '../../api'; 
import styles from '../../styles/Admin.module.css';
import generateVTMCharacterSheetPDF from '../../utils/pdfGenerator'; 

/* ---------- VTM Lookups ---------- */
const CLAN_COLORS = {
  Brujah: '#b40f1f', Gangrel: '#2f7a3a', Malkavian: '#713c8b', Nosferatu: '#6a4b2b',
  Toreador: '#b8236b', Tremere: '#7b1113', Ventrue: '#1b4c8c', 'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b', Lasombra: '#191a5a', 'The Ministry': '#865f12',
  Caitiff: '#636363', 'Thin-blood': '#6e6e2b',
};
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };
const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');
const symlogo = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png` : '');

// Updated TrackerDisplay to support single-values (Humanity/Hunger) and Stains
const TrackerDisplay = ({ label, currentObj, max, onUpdate, isValueTracker = false, value = 0, stains = 0 }) => {
  const trackSize = max || 1;
  const agg = currentObj?.aggravated || 0;
  const sup = currentObj?.superficial || 0;

  const boxes = [];
  for (let i = 0; i < trackSize; i++) {
    let content = '';
    let isFilled = false;
    let boxStyle = {
      width: '24px', height: '24px', border: '1px solid var(--border-color, #ccc)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '18px', fontWeight: 'bold', backgroundColor: 'var(--bg-primary, #fff)',
      cursor: 'default', color: 'var(--text-color, #000)', lineHeight: 1
    };

    if (isValueTracker) {
      if (i < value) isFilled = true;
      if (i >= trackSize - stains) content = '/';
      if (isFilled) {
         if (label === 'Hunger') {
           content = '🩸';
           boxStyle.fontSize = '14px';
           // Don't change background to black for Hunger
         } else {
           boxStyle.backgroundColor = 'var(--text-color, #333)';
           boxStyle.color = '#fff';
         }
      }
    } else {
      if (i < agg) { content = 'X'; boxStyle.color = '#b40f1f'; } 
      else if (i < agg + sup) { content = '/'; }
    }

    boxes.push(<div key={i} style={boxStyle} title={`Box ${i+1}`}>{content}</div>);
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px', display:'flex', justifyContent:'space-between' }}>
        <span>{label}</span><span style={{ opacity: 0.6, fontSize: '0.75rem' }}>Max: {trackSize}</span>
      </div>
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', marginBottom: '6px' }}>{boxes}</div>
      <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem' }}>
        {!isValueTracker ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span style={{ opacity: 0.7 }}>Sup:</span>
              <button className={styles.btn} style={{ padding: '0 6px' }} onClick={() => onUpdate('superficial', -1)}>-</button>
              <button className={styles.btn} style={{ padding: '0 6px' }} onClick={() => onUpdate('superficial', 1)}>+</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span style={{ opacity: 0.7 }}>Agg:</span>
              <button className={styles.btn} style={{ padding: '0 6px' }} onClick={() => onUpdate('aggravated', -1)}>-</button>
              <button className={styles.btn} style={{ padding: '0 6px' }} onClick={() => onUpdate('aggravated', 1)}>+</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span style={{ opacity: 0.7 }}>Val:</span>
              <button className={styles.btn} style={{ padding: '0 6px' }} onClick={() => onUpdate('value', -1)}>-</button>
              <button className={styles.btn} style={{ padding: '0 6px' }} onClick={() => onUpdate('value', 1)}>+</button>
            </div>
            {label === 'Humanity' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span style={{ opacity: 0.7 }}>Stains:</span>
                <button className={styles.btn} style={{ padding: '0 6px' }} onClick={() => onUpdate('stains', -1)}>-</button>
                <button className={styles.btn} style={{ padding: '0 6px' }} onClick={() => onUpdate('stains', 1)}>+</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default function AdminCharactersTab({ users, onSave, onDelete, onOpenEditor }) {
  const chars = useMemo(() => users.filter(u => u.character_id).map(u => ({
    id: u.character_id, user_id: u.id, name: u.char_name || '', clan: u.clan || '',
    xp: u.xp || 0, sheet: u.sheet || null, owner: `${u.display_name} <${u.email}>`
  })), [users]);

  const [edits, setEdits] = useState({});
  const [confirmDialog, setConfirmDialog] = useState(null);
  function getRow(c) { return edits[c.id] ?? { name: c.name, clan: c.clan, sheet: JSON.stringify(c.sheet || {}, null, 2) }; }
  function setRow(c, patch) { setEdits(prev => ({ ...prev, [c.id]: { ...getRow(c), ...patch } })); }

  const handleReset = async (char) => {
    if (!window.confirm(`Allow ${char.name} to Re-Roll?`)) return;
    try {
      await api.post(`/admin/characters/${char.id}/allow-reset`);
      const row = getRow(char);
      let data = {}; try { data = JSON.parse(row.sheet || '{}'); } catch (e) {}
      data.allow_reset = true;
      setRow(char, { sheet: JSON.stringify(data, null, 2) });
      alert('Permission granted!');
    } catch (e) { alert('Failed to authorize reset.'); }
  };

  // Helper to open the dialog
  const requestGlobalReset = (trackersToReset) => {
    setConfirmDialog({
      title: 'Confirm Global Reset',
      message: `Are you absolutely sure you want to reset ${trackersToReset.join(', ')} for ALL characters? This cannot be undone.`,
      onConfirm: () => {
        setConfirmDialog(null);
        resetAllCharacters(trackersToReset);
      }
    });
  };

const resetAllCharacters = async (trackersToReset) => {
    const confirmMessage = `Are you absolutely sure you want to reset ${trackersToReset.join(' and ')} for ALL characters? This will wipe everyone's current damage.`;
    if (!window.confirm(confirmMessage)) return;

    // Loop through every character and prepare the updates
    const updatePromises = chars.map(async (c) => {
      const row = getRow(c);
      let data = {}; 
      try { 
        data = JSON.parse(row.sheet || '{}'); 
      } catch (e) { 
        console.warn(`Skipping ${c.name} due to invalid JSON.`);
        return Promise.resolve(); // Skip broken sheets so it doesn't crash the loop
      }
      
      if (trackersToReset.includes('health')) {
        data.health = { superficial: 0, aggravated: 0 };
      }
      if (trackersToReset.includes('willpower')) {
        data.willpower = { superficial: 0, aggravated: 0 };
      }
      if (trackersToReset.includes('hunger')) {
        data.hunger = 1;
      }
      
      const updatedSheetString = JSON.stringify(data, null, 2);
      
      // Update UI instantly
      setRow(c, { sheet: updatedSheetString });

      // Save to database
      return api.patch(`/admin/characters/${c.id}`, {
        name: row.name,
        clan: row.clan,
        sheet: data
      });
    });

    try {
      await Promise.all(updatePromises);
      alert(`Success! ${trackersToReset.join(' and ')} reset for all characters.`);
    } catch (error) {
      console.error("Global reset failed:", error);
      alert("There was an error saving some characters. Check the console.");
    }
  };

  const handleRevokeReset = async (char) => {
    if (!window.confirm(`Revoke Re-Roll permission for ${char.name}?`)) return;
    try {
      await api.post(`/admin/characters/${char.id}/revoke-reset`);
      const row = getRow(char);
      let data = {}; try { data = JSON.parse(row.sheet || '{}'); } catch (e) {}
      data.allow_reset = false;
      setRow(char, { sheet: JSON.stringify(data, null, 2) });
    } catch (e) { alert('Failed to revoke reset.'); }
  };

  const handleToggleActive = async (char) => {
    try {
      await api.post(`/admin/characters/${char.id}/toggle-active`);
      const row = getRow(char);
      let data = {}; try { data = JSON.parse(row.sheet || '{}'); } catch (e) {}
      data.is_active = !data.is_active; 
      setRow(char, { sheet: JSON.stringify(data, null, 2) });
    } catch (e) { alert('Failed to toggle active status.'); }
  };

  // --- AUTOMATIC BACKGROUND SAVING INCORPORATED HERE ---
  const updateTracker = async (c, category, type, delta) => {
    const row = getRow(c);
    let data = {}; 
    try { 
      data = JSON.parse(row.sheet || '{}'); 
    } catch (e) { 
      alert("Invalid JSON. Please fix syntax errors before clicking trackers."); 
      return; 
    }
    
    if (category === 'hunger') {
       data.hunger = Math.max(0, Math.min(5, (data.hunger || 0) + delta));
    } else if (category === 'humanity') {
       if (type === 'value') {
          const current = data.morality?.humanity ?? data.humanity ?? 7;
          const next = Math.max(0, Math.min(10, current + delta));
          data.humanity = next;
          if (!data.morality) data.morality = {};
          data.morality.humanity = next;
       } else if (type === 'stains') {
          data.stains = Math.max(0, Math.min(10, (data.stains || 0) + delta));
       }
    } else {
       if (!data[category]) data[category] = {};
       data[category][type] = Math.max(0, (data[category][type] || 0) + delta); 
    }
    
    const updatedSheetString = JSON.stringify(data, null, 2);
    
    // 1. Instantly update the UI
    setRow(c, { sheet: updatedSheetString });

    // 2. Silently save to the database in the background
    try {
      await api.patch(`/admin/characters/${c.id}`, {
        name: row.name,
        clan: row.clan,
        sheet: data
      });
    } catch (error) {
      console.error("Auto-save failed:", error);
      alert("Failed to auto-save the tracker update. Check your connection.");
    }
  };

  const calculateStats = (jsonString) => {
    let data = {}; try { data = JSON.parse(jsonString || '{}'); } catch {}
    const attrs = data.attributes || {};
    let maxHealth = (Number(attrs.Stamina) || 1) + 3;
    const powers = data.disciplinePowers?.Fortitude || [];
    if (Array.isArray(powers) && powers.some(p => String(p.name || p.id).toLowerCase().includes('resilience'))) {
       maxHealth += Number(data.disciplines?.Fortitude || 0);
    }
    const maxWillpower = (Number(attrs.Composure) || 1) + (Number(attrs.Resolve) || 1);
    return { maxHealth, maxWillpower, sheetObj: data };
  };

return (
    <div className={styles.stack12}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <h3>Characters</h3>
        
{/* --- GLOBAL ACTIONS PANEL --- */}
        {chars.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid #d97706', padding: '10px', borderRadius: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#d97706' }}>GLOBAL ACTIONS:</span>
            <button className={styles.btn} style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-color)' }} onClick={() => resetAllCharacters(['health'])}>Heal All</button>
            <button className={styles.btn} style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-color)' }} onClick={() => resetAllCharacters(['willpower'])}>Restore All WP</button>
            <button className={styles.btn} style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-color)' }} onClick={() => resetAllCharacters(['hunger'])}>Reset All Hunger</button>
            <button className={styles.btn} style={{ backgroundColor: '#b40f1f', color: '#fff', borderColor: '#b40f1f' }} onClick={() => resetAllCharacters(['health', 'willpower', 'hunger'])}>Reset All Trackers</button>
          </div>
        )}
      </div>
      
      {!chars.length && <div className={styles.subtle}>No characters yet.</div>}
      
      <div className={styles.characterCardGrid}>
        {chars.map(c => {
          const clanColor = CLAN_COLORS[c.clan] || 'var(--border-color)';
          const clanLogoUrl = symlogo(c.clan);
          const rowData = getRow(c);
          const { maxHealth, maxWillpower, sheetObj } = calculateStats(rowData.sheet);
          const isResetAllowed = sheetObj.allow_reset === true;
          const isActive = sheetObj.is_active === true;
          
          return (
            <div key={c.id} className={styles.characterCard} style={{'--clan-color': clanColor, '--clan-logo-url': clanLogoUrl ? `url(${clanLogoUrl})` : 'none', opacity: isActive ? 1 : 0.75 }}>
              <div className={styles.cardHeader}>
                <div className={styles.cardOwnerInfo}>
                  <div className={styles.cardOwnerLabel}>Owner {isActive ? '' : '(WAITING FOR APPROVAL)'}</div>
                  <div className={styles.cardOwnerName}>{c.owner}</div>
                </div>
                {clanLogoUrl && <div className={styles.clanLogo}></div>}
              </div>

              <div className={styles.cardBody}>
                <div className={styles.formGrid}>
                  <label><span>Name</span><input className={styles.input} value={rowData.name} onChange={e=>setRow(c, { name: e.target.value })}/></label>
                  <label><span>Clan</span><input className={styles.input} value={rowData.clan} onChange={e=>setRow(c, { clan: e.target.value })}/></label>
                  <label><span>XP</span><input className={styles.input} value={c.xp} readOnly disabled/></label>
                </div>

                <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.05)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <TrackerDisplay label="Health" max={maxHealth} currentObj={sheetObj.health || {}} onUpdate={(type, delta) => updateTracker(c, 'health', type, delta)} />
                  <TrackerDisplay label="Willpower" max={maxWillpower} currentObj={sheetObj.willpower || {}} onUpdate={(type, delta) => updateTracker(c, 'willpower', type, delta)} />
                  <TrackerDisplay label="Humanity" max={10} isValueTracker={true} value={sheetObj.morality?.humanity ?? sheetObj.humanity ?? 7} stains={sheetObj.stains || 0} onUpdate={(type, delta) => updateTracker(c, 'humanity', type, delta)} />
                  <TrackerDisplay label="Hunger" max={5} isValueTracker={true} value={sheetObj.hunger || 0} onUpdate={(type, delta) => updateTracker(c, 'hunger', type, delta)} />
                  
                </div>
              
                <label className={styles.stack12} style={{marginTop: '1rem'}}>
                  <span>Sheet (JSON)</span>
                  <textarea value={rowData.sheet} onChange={e=>setRow(c, { sheet: e.target.value })} rows={10} className={`${styles.input} ${styles.inputMono}`}/>
                </label>
              </div>
              
              <div className={styles.cardFooter}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={()=>{
                    try { onSave({ id: c.id, name: rowData.name, clan: rowData.clan, sheet: JSON.parse(rowData.sheet || '{}') }); }
                    catch { alert('Invalid JSON in sheet'); }
                  }}>Save JSON</button>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => onOpenEditor(c)}>Open Editor</button>
                
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => generateVTMCharacterSheetPDF(c)}>Download PDF</button>

                {isActive ? (
                  <button className={`${styles.btn}`} style={{ backgroundColor: '#4b5563', borderColor: '#4b5563', color: '#fff' }} onClick={() => handleToggleActive(c)}>Deactivate</button>
                ) : (
                  <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={() => handleToggleActive(c)}>Activate</button>
                )}

                {isResetAllowed ? (
                  <button className={`${styles.btn}`} style={{ backgroundColor: '#4b5563', borderColor: '#4b5563', color: '#fff' }} onClick={() => handleRevokeReset(c)}>Revoke Re-Roll</button>
                ) : (
                  <button className={`${styles.btn} ${styles.btnDanger}`} style={{ backgroundColor: '#d97706', borderColor: '#d97706' }} onClick={() => handleReset(c)}>Allow Re-Roll</button>
                )}

                <button className={`${styles.btn} ${styles.btnDanger} ${styles.rowEnd}`} onClick={() => onDelete(c.id)}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}