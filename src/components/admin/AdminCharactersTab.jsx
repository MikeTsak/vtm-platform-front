// src/components/admin/AdminCharactersTab.jsx
import React, { useMemo, useState } from 'react';
import styles from '../../styles/Admin.module.css';

/* ---------- VTM Lookups (as requested) ---------- */
const CLAN_COLORS = {
  Brujah: '#b40f1f',
  Gangrel: '#2f7a3a',
  Malkavian: '#713c8b',
  Nosferatu: '#6a4b2b',
  Toreador: '#b8236b',
  Tremere: '#7b1113',
  Ventrue: '#1b4c8c',
  'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b',
  Lasombra: '#191a5a',
  'The Ministry': '#865f12',
  Caitiff: '#636363',
  'Thin-blood': '#6e6e2b',
};
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };
const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');
const symlogo = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png` : '');
/* -------------------------------------------------- */

// --- Visual Tracker Component ---
const TrackerDisplay = ({ label, currentObj, max, onUpdate }) => {
  // Use the calculated max, defaulting to 1 if something goes wrong
  const trackSize = max || 1;
  const agg = currentObj?.aggravated || 0;
  const sup = currentObj?.superficial || 0;

  // Render boxes
  const boxes = [];
  for (let i = 0; i < trackSize; i++) {
    let content = '';
    let boxStyle = {
      width: '24px',
      height: '24px',
      border: '1px solid var(--border-color, #ccc)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      fontWeight: 'bold',
      backgroundColor: 'var(--bg-primary, #fff)',
      cursor: 'default',
      color: 'var(--text-color, #000)',
      lineHeight: 1
    };

    if (i < agg) {
      content = 'X'; // Aggravated
      boxStyle.color = '#b40f1f'; // Red for Agg
    } else if (i < agg + sup) {
      content = '/'; // Superficial
    }

    boxes.push(
      <div key={i} style={boxStyle} title={`Box ${i+1}`}>
        {content}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px', display:'flex', justifyContent:'space-between' }}>
        <span>{label}</span>
        <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>Max: {trackSize}</span>
      </div>
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', marginBottom: '6px' }}>
        {boxes}
      </div>
      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem' }}>
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
      </div>
    </div>
  );
};


export default function AdminCharactersTab({ users, onSave, onDelete, onGeneratePDF, onOpenEditor }) {
  const chars = useMemo(() => users.filter(u => u.character_id).map(u => ({
    id: u.character_id,
    user_id: u.id,
    name: u.char_name || '',
    clan: u.clan || '',
    xp: u.xp || 0,
    sheet: u.sheet || null,
    owner: `${u.display_name} <${u.email}>`
  })), [users]);

  const [edits, setEdits] = useState({});
  function getRow(c) { return edits[c.id] ?? { name: c.name, clan: c.clan, sheet: JSON.stringify(c.sheet || {}, null, 2) }; }
  function setRow(c, patch) { setEdits(prev => ({ ...prev, [c.id]: { ...getRow(c), ...patch } })); }

  // Helper to safely update nested JSON stats
  const updateTracker = (c, category, type, delta) => {
    const row = getRow(c);
    let data = {};
    try { data = JSON.parse(row.sheet || '{}'); } 
    catch (e) { alert("Invalid JSON. Fix syntax first."); return; }

    if (!data[category]) data[category] = {};
    
    const currentVal = data[category][type] || 0;
    const newVal = Math.max(0, currentVal + delta); 

    data[category][type] = newVal;
    setRow(c, { sheet: JSON.stringify(data, null, 2) });
  };

  // Helper to calculate Max Health/Willpower from the raw JSON attributes
  const calculateStats = (jsonString) => {
    let data = {};
    try { data = JSON.parse(jsonString || '{}'); } catch {}
    
    const attrs = data.attributes || {};
    
    // --- Health Calculation ---
    // Base = Stamina + 3
    const stamina = Number(attrs.Stamina) || 1; // Default to 1 dot if missing
    let maxHealth = stamina + 3;
    
    // Check for "Resilience" in Discipline Powers (Fortitude)
    // Note: This matches the logic in CharacterView.jsx
    const powers = data.disciplinePowers?.Fortitude || [];
    if (Array.isArray(powers) && powers.some(p => String(p.name || p.id).toLowerCase().includes('resilience'))) {
       const fortitude = Number(data.disciplines?.Fortitude || 0);
       maxHealth += fortitude;
    }

    // --- Willpower Calculation ---
    // Max = Composure + Resolve
    const composure = Number(attrs.Composure) || 1;
    const resolve = Number(attrs.Resolve) || 1;
    const maxWillpower = composure + resolve;

    return { maxHealth, maxWillpower, sheetObj: data };
  };

  return (
    <div className={styles.stack12}>
      <h3>Characters</h3>
      {!chars.length && <div className={styles.subtle}>No characters yet.</div>}
      
      <div className={styles.characterCardGrid}>
        {chars.map(c => {
          const clanColor = CLAN_COLORS[c.clan] || 'var(--border-color)';
          const clanLogoUrl = symlogo(c.clan);
          const rowData = getRow(c);
          
          // Calculate stats live from the current JSON (so if you edit JSON manually, boxes update)
          const { maxHealth, maxWillpower, sheetObj } = calculateStats(rowData.sheet);
          
          return (
            <div 
              key={c.id} 
              className={styles.characterCard}
              style={{
                '--clan-color': clanColor,
                '--clan-logo-url': clanLogoUrl ? `url(${clanLogoUrl})` : 'none'
              }}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardOwnerInfo}>
                  <div className={styles.cardOwnerLabel}>Owner</div>
                  <div className={styles.cardOwnerName}>{c.owner}</div>
                </div>
                {clanLogoUrl && <div className={styles.clanLogo}></div>}
              </div>

              <div className={styles.cardBody}>
                <div className={styles.formGrid}>
                  <label>
                    <span>Name</span>
                    <input 
                      className={styles.input}
                      value={rowData.name} 
                      onChange={e=>setRow(c, { name: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>Clan</span>
                    <input 
                      className={styles.input}
                      value={rowData.clan} 
                      onChange={e=>setRow(c, { clan: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>XP</span>
                    <input 
                      className={styles.input}
                      value={c.xp} 
                      readOnly 
                      disabled
                    />
                  </label>
                </div>

                {/* --- Visual Tracker Section --- */}
                <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.05)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  
                  <TrackerDisplay 
                    label="Health" 
                    max={maxHealth}
                    currentObj={sheetObj.health || {}} 
                    onUpdate={(type, delta) => updateTracker(c, 'health', type, delta)}
                  />

                  <TrackerDisplay 
                    label="Willpower" 
                    max={maxWillpower}
                    currentObj={sheetObj.willpower || {}} 
                    onUpdate={(type, delta) => updateTracker(c, 'willpower', type, delta)}
                  />

                </div>
                {/* ----------------------------- */}
              
                <label className={styles.stack12} style={{marginTop: '1rem'}}>
                  <span>Sheet (JSON)</span>
                  <textarea
                    value={rowData.sheet}
                    onChange={e=>setRow(c, { sheet: e.target.value })}
                    rows={10}
                    className={`${styles.input} ${styles.inputMono}`}
                  />
                </label>
              </div>
              
              <div className={styles.cardFooter}>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={()=>{
                    let parsed = null;
                    try { parsed = JSON.parse(rowData.sheet || '{}'); }
                    catch { alert('Invalid JSON in sheet'); return; }
                    onSave({ id: c.id, name: rowData.name, clan: rowData.clan, sheet: parsed });
                  }}
                >
                  Save JSON
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => onOpenEditor(c)}
                >
                  Open Editor
                </button>
                
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => onGeneratePDF(c)}
                >
                  Download PDF
                </button>

                <button
                  className={`${styles.btn} ${styles.btnDanger} ${styles.rowEnd}`}
                  onClick={() => onDelete(c.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}