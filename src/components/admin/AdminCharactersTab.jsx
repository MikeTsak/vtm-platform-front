// src/components/admin/AdminCharactersTab.jsx
import React, { useMemo, useState, useEffect } from 'react';
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

// ---------- TRACKER DISPLAY ----------
const TrackerDisplay = ({ label, currentObj, max, onUpdate, isValueTracker = false, value = 0, stains = 0 }) => {
  const trackSize = max || 1;
  const agg = currentObj?.aggravated || 0;
  const sup = currentObj?.superficial || 0;

  const boxes = [];
  for (let i = 0; i < trackSize; i++) {
    let content = '';
    let isFilled = false;
    let boxStyle = {
      width: '24px', height: '24px', border: '1px solid var(--glass-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '16px', fontWeight: 'bold', backgroundColor: 'var(--glass-inset)',
      cursor: 'default', color: 'var(--text-primary)', lineHeight: 1, borderRadius: '4px'
    };

    if (isValueTracker) {
      if (i < value) isFilled = true;
      if (i >= trackSize - stains) content = '/';
      if (isFilled) {
         if (label === 'Hunger') {
           content = '🩸';
           boxStyle.fontSize = '14px';
         } else {
           boxStyle.backgroundColor = 'var(--accent-purple)';
           boxStyle.color = '#fff';
           boxStyle.borderColor = 'var(--accent-purple)';
         }
      }
    } else {
      if (i < agg) { content = 'X'; boxStyle.color = '#ff4d4d'; boxStyle.borderColor = '#ff4d4d'; }
      else if (i < agg + sup) { content = '/'; boxStyle.color = '#ffc107'; }
    }

    boxes.push(<div key={i} style={boxStyle} title={`Box ${i+1}`}>{content}</div>);
  }

  return (
    <div style={{ marginBottom: '1rem', flex: '1 1 200px' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '6px', display:'flex', justifyContent:'space-between', color: 'var(--text-secondary)' }}>
        <span>{label}</span><span style={{ opacity: 0.6, fontSize: '0.75rem', fontFamily: 'monospace' }}>MAX: {trackSize}</span>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>{boxes}</div>
      <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
        {!isValueTracker ? (
          <>
            <div className={styles.row} style={{ gap: '4px', background: 'var(--glass-inset)', padding: '2px 6px', borderRadius: '4px' }}>
              <span style={{ opacity: 0.7 }}>SUP:</span>
              <button className={`${styles.btn} ${styles.btnGhost}`} style={{ padding: '2px 6px', minWidth: '24px' }} onClick={() => onUpdate('superficial', -1)}>-</button>
              <button className={`${styles.btn} ${styles.btnGhost}`} style={{ padding: '2px 6px', minWidth: '24px' }} onClick={() => onUpdate('superficial', 1)}>+</button>
            </div>
            <div className={styles.row} style={{ gap: '4px', background: 'var(--glass-inset)', padding: '2px 6px', borderRadius: '4px' }}>
              <span style={{ opacity: 0.7 }}>AGG:</span>
              <button className={`${styles.btn} ${styles.btnGhost}`} style={{ padding: '2px 6px', minWidth: '24px' }} onClick={() => onUpdate('aggravated', -1)}>-</button>
              <button className={`${styles.btn} ${styles.btnGhost}`} style={{ padding: '2px 6px', minWidth: '24px' }} onClick={() => onUpdate('aggravated', 1)}>+</button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.row} style={{ gap: '4px', background: 'var(--glass-inset)', padding: '2px 6px', borderRadius: '4px' }}>
              <span style={{ opacity: 0.7 }}>VAL:</span>
              <button className={`${styles.btn} ${styles.btnGhost}`} style={{ padding: '2px 6px', minWidth: '24px' }} onClick={() => onUpdate('value', -1)}>-</button>
              <button className={`${styles.btn} ${styles.btnGhost}`} style={{ padding: '2px 6px', minWidth: '24px' }} onClick={() => onUpdate('value', 1)}>+</button>
            </div>
            {label === 'Humanity' && (
              <div className={styles.row} style={{ gap: '4px', background: 'var(--glass-inset)', padding: '2px 6px', borderRadius: '4px' }}>
                <span style={{ opacity: 0.7 }}>STAINS:</span>
                <button className={`${styles.btn} ${styles.btnGhost}`} style={{ padding: '2px 6px', minWidth: '24px' }} onClick={() => onUpdate('stains', -1)}>-</button>
                <button className={`${styles.btn} ${styles.btnGhost}`} style={{ padding: '2px 6px', minWidth: '24px' }} onClick={() => onUpdate('stains', 1)}>+</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ---------- MAIN COMPONENT ----------
export default function AdminCharactersTab({ users, onSave, onDelete, onOpenEditor }) {
  const baseChars = useMemo(() => users.filter(u => u.character_id).map(u => ({
    id: u.character_id, user_id: u.id, name: u.char_name || '', clan: u.clan || '',
    xp: u.xp || 0, sheet: u.sheet || null, owner: `${u.display_name} <${u.email}>`
  })), [users]);

  const [sheetStates, setSheetStates] = useState({});
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [filterText, setFilterText] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    const newStates = {};
    baseChars.forEach(c => { newStates[c.id] = JSON.stringify(c.sheet || {}, null, 2); });
    setSheetStates(newStates);
  }, [baseChars]);

  const filteredChars = useMemo(() => {
    if (!filterText.trim()) return baseChars;
    const filter = filterText.toLowerCase().trim();
    return baseChars.filter(c =>
      c.name.toLowerCase().includes(filter) || c.clan.toLowerCase().includes(filter) || c.owner.toLowerCase().includes(filter)
    );
  }, [baseChars, filterText]);

  const getSheetObj = (charId) => {
    try { return JSON.parse(sheetStates[charId] || '{}'); } 
    catch (e) { return {}; }
  };

  const setSheetState = (charId, newSheetObj) => {
    setSheetStates(prev => ({ ...prev, [charId]: JSON.stringify(newSheetObj, null, 2) }));
  };

  const toggleExpand = (charId) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(charId)) next.delete(charId);
      else next.add(charId);
      return next;
    });
  };

  const calculateStats = (sheetObj) => {
    let data = sheetObj;
    const attrs = data.attributes || {};
    let maxHealth = (Number(attrs.Stamina) || 1) + 3;
    const powers = data.disciplinePowers?.Fortitude || [];
    if (Array.isArray(powers) && powers.some(p => String(p.name || p.id).toLowerCase().includes('resilience'))) {
       maxHealth += Number(data.disciplines?.Fortitude || 0);
    }
    const maxWillpower = (Number(attrs.Composure) || 1) + (Number(attrs.Resolve) || 1);
    return { maxHealth, maxWillpower, sheetObj: data };
  };

  // --- UNIFIED SHEET UPDATER (Handles Trackers, Inventory, Notes) ---
  const updateSheetData = async (char, updaterFn) => {
    const sheetObj = getSheetObj(char.id);
    let data = {};
    try { data = JSON.parse(JSON.stringify(sheetObj)); } 
    catch (e) { alert("Invalid JSON. Please fix syntax errors before updating."); return; }

    data = updaterFn(data);
    setSheetState(char.id, data);

    try {
      await api.patch(`/admin/characters/${char.id}`, { name: char.name, clan: char.clan, sheet: data });
    } catch (error) {
      console.error("Auto-save failed:", error);
      alert("Failed to auto-save. Check your connection.");
      setSheetState(char.id, sheetObj); // Revert on fail
    }
  };

  // Tracker Specific logic wrapping the unified updater
  const updateTracker = (char, category, type, delta) => {
    updateSheetData(char, (data) => {
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
      return data;
    });
  };

  // Inventory logic
  const handleAddInventory = (char) => {
    const itemName = window.prompt("Enter item name:");
    if (!itemName) return;
    updateSheetData(char, (data) => {
      data.inventory = data.inventory || [];
      data.inventory.push({ name: itemName, qty: 1, notes: '' });
      return data;
    });
  };

  const handleUpdateInventory = (char, index, field, value) => {
    updateSheetData(char, (data) => {
      if (data.inventory && data.inventory[index]) {
        data.inventory[index][field] = value;
      }
      return data;
    });
  };

  const handleRemoveInventory = (char, index) => {
    updateSheetData(char, (data) => {
      if (data.inventory) data.inventory.splice(index, 1);
      return data;
    });
  };

  // --- GLOBAL ACTIONS ---
  const requestGlobalReset = (trackersToReset) => {
    setConfirmDialog({
      title: 'Confirm Global Reset',
      message: `Are you absolutely sure you want to reset ${trackersToReset.join(', ')} for ALL characters? This cannot be undone.`,
      onConfirm: () => resetAllCharacters(trackersToReset)
    });
  };

  const resetAllCharacters = async (trackersToReset) => {
    const updatePromises = baseChars.map(async (c) => {
      const sheetObj = getSheetObj(c.id);
      let data = {};
      try { data = JSON.parse(JSON.stringify(sheetObj)); } catch (e) { return Promise.resolve(); }

      if (trackersToReset.includes('health')) data.health = { superficial: 0, aggravated: 0 };
      if (trackersToReset.includes('willpower')) data.willpower = { superficial: 0, aggravated: 0 };
      if (trackersToReset.includes('hunger')) data.hunger = 1;

      setSheetState(c.id, data);
      return api.patch(`/admin/characters/${c.id}`, { name: c.name, clan: c.clan, sheet: data });
    });

    try {
      await Promise.all(updatePromises);
      alert(`Success! ${trackersToReset.join(' and ')} reset for all characters.`);
    } catch (error) { alert("Error saving some characters. Check console."); }
  };

  const handleToggleActive = (char) => updateSheetData(char, d => { d.is_active = !d.is_active; return d; });
  const handleReset = (char) => { if(window.confirm(`Allow Re-Roll?`)) updateSheetData(char, d => { d.allow_reset = true; return d; }); };
  const handleRevokeReset = (char) => { if(window.confirm(`Revoke Re-Roll?`)) updateSheetData(char, d => { d.allow_reset = false; return d; }); };

  return (
    <div className={styles.stack12}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <h3>Characters & Inventory</h3>
        
        {filteredChars.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', background: 'var(--glass-inset)', border: '1px solid var(--glass-border-highlight)', padding: '10px', borderRadius: 'var(--radius-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-purple)' }}>GLOBAL ACTIONS:</span>
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => requestGlobalReset(['health'])}>Heal All</button>
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => requestGlobalReset(['willpower'])}>Restore WP</button>
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => requestGlobalReset(['hunger'])}>Reset Hunger</button>
            <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => requestGlobalReset(['health', 'willpower', 'hunger'])}>Reset All</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input type="text" placeholder="Filter by name, clan, or owner..." value={filterText} onChange={e => setFilterText(e.target.value)} className={styles.input} style={{ flex: 1, maxWidth: '400px' }} />
      </div>

      <div className={styles.characterCardGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
        {filteredChars.map(c => {
          const clanColor = CLAN_COLORS[c.clan] || 'var(--accent-purple)';
          const clanLogoUrl = symlogo(c.clan);
          const sheetObj = getSheetObj(c.id);
          const { maxHealth, maxWillpower, sheetObj: data } = calculateStats(sheetObj);
          const isExpanded = expandedCards.has(c.id);
          const isActive = data.is_active !== false; // Default to true if undefined

          return (
            <div key={c.id} className={styles.characterCard} style={{ '--clan-color': clanColor, '--clan-logo-url': clanLogoUrl ? `url(${clanLogoUrl})` : 'none', opacity: isActive ? 1 : 0.6 }}>
              
              {/* CARD HEADER */}
              <div className={styles.cardHeader} style={{ cursor: 'pointer' }} onClick={() => toggleExpand(c.id)}>
                <div className={styles.cardOwnerInfo}>
                  <div className={styles.cardOwnerLabel}>Owner: {c.owner} {!isActive && <span style={{color: 'var(--color-error)'}}>(INACTIVE)</span>}</div>
                  <div className={styles.cardOwnerName} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {c.name} 
                    <span style={{ fontSize: '0.8rem', background: clanColor, padding: '2px 8px', borderRadius: '12px' }}>{c.clan}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {clanLogoUrl && <div className={styles.clanLogo} style={{ width: '32px', height: '32px', backgroundSize: 'contain' }}></div>}
                  <span style={{ color: 'var(--text-secondary)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
                </div>
              </div>

              {/* CARD BODY */}
              <div className={styles.cardBody} style={{ padding: '1rem' }}>
                {/* Vitals Summary */}
                <div className={styles.row} style={{ gap: '10px', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                  <div style={{ background: 'var(--glass-inset)', padding: '4px 10px', borderRadius: '12px' }}><b>XP:</b> {c.xp}</div>
                  <div style={{ background: 'var(--glass-inset)', padding: '4px 10px', borderRadius: '12px' }}><b>Gen:</b> {data.generation || '?'}</div>
                  <div style={{ background: 'var(--glass-inset)', padding: '4px 10px', borderRadius: '12px' }}><b>BP:</b> {data.blood_potency || 1}</div>
                  <div style={{ background: 'var(--glass-inset)', padding: '4px 10px', borderRadius: '12px' }}><b>Sire:</b> {data.sire || 'Unknown'}</div>
                </div>

                {/* Trackers (Always Visible) */}
                <div style={{ padding: '1rem', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <TrackerDisplay label="Health" max={maxHealth} currentObj={data.health || {}} onUpdate={(type, delta) => updateTracker(c, 'health', type, delta)} />
                  <TrackerDisplay label="Willpower" max={maxWillpower} currentObj={data.willpower || {}} onUpdate={(type, delta) => updateTracker(c, 'willpower', type, delta)} />
                  <TrackerDisplay label="Humanity" max={10} isValueTracker={true} value={data.morality?.humanity ?? data.humanity ?? 7} stains={data.stains || 0} onUpdate={(type, delta) => updateTracker(c, 'humanity', type, delta)} />
                  <TrackerDisplay label="Hunger" max={5} isValueTracker={true} value={data.hunger || 0} onUpdate={(type, delta) => updateTracker(c, 'hunger', type, delta)} />
                </div>

                {/* EXPANDED CONTENT */}
                {isExpanded && (
                  <div style={{ marginTop: '1.5rem', animation: 'floatIn 0.3s' }}>
                    
                    {/* Inventory Section */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div className={styles.row} style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--accent-purple)' }}>Inventory</h4>
                        <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => handleAddInventory(c)}>+ Add Item</button>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(!data.inventory || data.inventory.length === 0) && <div className={styles.subtle} style={{ fontStyle: 'italic' }}>No items in inventory.</div>}
                        
                        {(data.inventory || []).map((item, idx) => (
                          <div key={idx} className={styles.row} style={{ gap: '0.5rem', background: 'var(--glass-inset)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                            <input type="text" className={styles.input} style={{ flex: 2, padding: '0.5rem' }} value={item.name} onChange={(e) => handleUpdateInventory(c, idx, 'name', e.target.value)} placeholder="Item Name" />
                            <input type="number" className={styles.input} style={{ flex: 1, padding: '0.5rem', minWidth: '60px' }} value={item.qty} onChange={(e) => handleUpdateInventory(c, idx, 'qty', parseInt(e.target.value)||0)} title="Quantity" />
                            <input type="text" className={styles.input} style={{ flex: 3, padding: '0.5rem' }} value={item.notes || ''} onChange={(e) => handleUpdateInventory(c, idx, 'notes', e.target.value)} placeholder="Notes/Effects" />
                            <button className={`${styles.btn} ${styles.btnDanger}`} style={{ padding: '0.5rem 0.8rem' }} onClick={() => handleRemoveInventory(c, idx)}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Admin Notes Section */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-warning)' }}>Admin Notes (Hidden from Player)</h4>
                      <textarea className={styles.textarea} style={{ minHeight: '80px', padding: '0.8rem' }} value={data.admin_notes || ''} onChange={(e) => updateSheetData(c, d => { d.admin_notes = e.target.value; return d; })} placeholder="Add story notes, warnings, or plot hooks here..." />
                    </div>

                    {/* Raw JSON Toggle */}
                    <details>
                      <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 'bold' }}>View/Edit Raw Sheet JSON</summary>
                      <textarea value={sheetStates[c.id] || ''} onChange={(e) => setSheetState(c.id, JSON.parse(e.target.value))} className={`${styles.textarea} ${styles.inputMono}`} style={{ marginTop: '0.5rem', minHeight: '150px' }} />
                    </details>

                  </div>
                )}
              </div>

              {/* CARD FOOTER */}
              <div className={styles.cardFooter} style={{ gap: '0.5rem' }}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { try { onSave({ id: c.id, name: c.name, clan: c.clan, sheet: getSheetObj(c.id) }); } catch { alert('Invalid JSON in sheet'); } }}>Save</button>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => onOpenEditor({ ...c, sheet: getSheetObj(c.id) })}>Editor Modal</button>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => generateVTMCharacterSheetPDF(c)}>PDF</button>

                <div className={styles.rowEnd} style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => handleToggleActive(c)}>
                    {isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className={`${styles.btn} ${data.allow_reset ? styles.btnGhost : styles.btnWarning}`} onClick={() => data.allow_reset ? handleRevokeReset(c) : handleReset(c)}>
                    {data.allow_reset ? 'Revoke Re-Roll' : 'Allow Re-Roll'}
                  </button>
                  <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => onDelete(c.id)}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}  
      </div> 

      {/* CONFIRM DIALOG */}
      {confirmDialog && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard} style={{ maxWidth: '400px', height: 'auto' }}>
            <div className={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--color-error)' }}>{confirmDialog.title}</h3>
            </div>
            <div className={styles.modalBody}>
              <p>{confirmDialog.message}</p>
            </div>
            <div className={styles.modalFooter}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setConfirmDialog(null)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}