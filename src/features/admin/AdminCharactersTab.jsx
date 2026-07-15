// src/components/admin/AdminCharactersTab.jsx
import React, { useMemo, useState, useEffect } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import generateVTMCharacterSheetPDF from '../../utils/pdfGenerator';
import { ALL_DISCIPLINE_NAMES } from '../../data/disciplines';
import MiniSearch from 'minisearch';
import Avatar from '../../components/Avatar';

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

    if (isValueTracker) {
      if (i < value) isFilled = true;
      if (i >= trackSize - stains) content = '/';
      if (isFilled) {
         if (label === 'Hunger') {
           content = '🩸';
         } else {
           // We'll handle filled state via className
         }
      }
    } else {
      if (i < agg) { content = 'X'; }
      else if (i < agg + sup) { content = '/'; }
    }

    // Determine box class based on state
    let boxClass = styles.trackerBox;
    if (isValueTracker && isFilled) {
      if (label === 'Hunger') {
        boxClass += ` ${styles.trackerBoxFilledHunger}`;
      } else {
        boxClass += ` ${styles.trackerBoxFilled}`;
      }
    } else if (!isValueTracker) {
      if (i < agg) {
        boxClass += ` ${styles.trackerBoxAggravated}`;
      } else if (i < agg + sup) {
        boxClass += ` ${styles.trackerBoxSuperficial}`;
      }
    }

    boxes.push(<div key={i} className={boxClass} title={`Box ${i+1}`}>{content}</div>);
  }

  return (
    <div className={styles.trackerContainer}>
      <div className={styles.trackerLabel}>
        <span>{label}</span>
        <span className={styles.trackerMax}>MAX: {trackSize}</span>
      </div>
      <div className={styles.trackerBoxes}>{boxes}</div>
      <div className={styles.trackerControls}>
        {!isValueTracker ? (
          <>
            <div className={styles.trackerControl}>
              <span className={styles.trackerControlLabel}>SUP:</span>
              <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => onUpdate('superficial', -1)}>−</button>
              <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => onUpdate('superficial', 1)}>+</button>
            </div>
            <div className={styles.trackerControl}>
              <span className={styles.trackerControlLabel}>AGG:</span>
              <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => onUpdate('aggravated', -1)}>−</button>
              <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => onUpdate('aggravated', 1)}>+</button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.trackerControl}>
              <span className={styles.trackerControlLabel}>VAL:</span>
              <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => onUpdate('value', -1)}>−</button>
              <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => onUpdate('value', 1)}>+</button>
            </div>
            {label === 'Humanity' && (
              <div className={styles.trackerControl}>
                <span className={styles.trackerControlLabel}>STAINS:</span>
                <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => onUpdate('stains', -1)}>−</button>
                <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => onUpdate('stains', 1)}>+</button>
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
  const [upgradeDisciplineState, setUpgradeDisciplineState] = useState(null); // {charId, charName, discipline}
  const [removeDisciplineState, setRemoveDisciplineState] = useState(null); // {charId, charName, discipline}

  useEffect(() => {
    const newStates = {};
    baseChars.forEach(c => { newStates[c.id] = JSON.stringify(c.sheet || {}, null, 2); });
    setSheetStates(newStates);
  }, [baseChars]);

  const filteredChars = useMemo(() => {
    if (!filterText.trim()) return baseChars;
    const q = filterText.trim();
    const ms = new MiniSearch({ fields: ['name', 'clan', 'owner'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
    ms.addAll(baseChars);
    const results = ms.search(q);
    const idSet = new Set(results.map(r => r.id));
    return baseChars.filter(c => idSet.has(c.id));
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

  const handleUpgradeDiscipline = (char) => {
    setUpgradeDisciplineState({
      charId: char.id,
      charName: char.name,
      discipline: null,
    });
  };

  const handleDisciplineSelect = (discipline) => {
    setUpgradeDisciplineState(prev => ({
      ...prev,
      discipline: discipline
    }));
  };

  const handleUpgradeConfirm = () => {
    if (!upgradeDisciplineState.discipline || !upgradeDisciplineState.charId) {
      return;
    }

    // Find the character to update
    const char = baseChars.find(c => c.id === upgradeDisciplineState.charId);
    if (!char) {
      setUpgradeDisciplineState(null);
      return;
    }

    updateSheetData(char, (data) => {
      // Ensure disciplines object exists
      const disciplines = data.disciplines || {};
      // Create a new disciplines object with the update
      const updatedDisciplines = {
        ...disciplines,
        [upgradeDisciplineState.discipline]: 6
      };
      return {
        ...data,
        disciplines: updatedDisciplines
      };
    });

    setUpgradeDisciplineState(null);
  };

  const handleRemoveDisciplineLevel6 = (char) => {
    setRemoveDisciplineState({
      charId: char.id,
      charName: char.name,
      discipline: null,
    });
  };

  const handleRemoveDisciplineSelect = (discipline) => {
    setRemoveDisciplineState(prev => ({
      ...prev,
      discipline: discipline
    }));
  };

  const handleRemoveDisciplineConfirm = () => {
    if (!removeDisciplineState.discipline || !removeDisciplineState.charId) {
      return;
    }

    // Find the character to update
    const char = baseChars.find(c => c.id === removeDisciplineState.charId);
    if (!char) {
      setRemoveDisciplineState(null);
      return;
    }

    updateSheetData(char, (data) => {
      // Ensure disciplines object exists
      const disciplines = data.disciplines || {};
      // Create a new disciplines object with the update: set to 5 (removing the sixth dot)
      const updatedDisciplines = {
        ...disciplines,
        [removeDisciplineState.discipline]: 5
      };
      return {
        ...data,
        disciplines: updatedDisciplines
      };
    });

    setRemoveDisciplineState(null);
  };

  return (
    <div className={styles.stack12}>
      <div className={styles.row} style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ margin: 0 }}>Characters & Inventory</h3>

        {filteredChars.length > 0 && (
          <div className={`${styles.alert} ${styles.alertInfo}`} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: 0 }}>
            <span className={styles.hl} style={{ fontSize: '0.8rem' }}>GLOBAL ACTIONS:</span>
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => requestGlobalReset(['health'])}>Heal All</button>
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => requestGlobalReset(['willpower'])}>Restore WP</button>
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => requestGlobalReset(['hunger'])}>Reset Hunger</button>
            <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => requestGlobalReset(['health', 'willpower', 'hunger'])}>Reset All</button>
          </div>
        )}
      </div>

      <div className={styles.row}>
        <input type="text" placeholder="Filter by name, clan, or owner..." value={filterText} onChange={e => setFilterText(e.target.value)} className={styles.input} style={{ flex: 1, maxWidth: '400px' }} />
      </div>

      <div className={styles.characterCardGrid}>
        {filteredChars.map(c => {
          const clanColor = CLAN_COLORS[c.clan] || 'var(--accent-purple)';
          const clanLogoUrl = symlogo(c.clan);
          const sheetObj = getSheetObj(c.id);
          const { maxHealth, maxWillpower, sheetObj: data } = calculateStats(sheetObj);
          const isExpanded = expandedCards.has(c.id);
          const isActive = data.is_active !== false; // Default to true if undefined

          return (
            <div
              key={c.id}
              className={`${styles.characterCard} ${!isActive ? styles.charCardInactive : ''}`}
              style={{ '--clan-color': clanColor, '--clan-logo-url': clanLogoUrl ? `url(${clanLogoUrl})` : 'none' }}
            >

              {/* CARD HEADER */}
              <div className={styles.charCardHeader} onClick={() => toggleExpand(c.id)}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Avatar userId={c.user_id} size={48} fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`} style={{ borderRadius: '50%', flexShrink: 0 }} editable={true} />
                  </div>
                  <div className={styles.cardOwnerInfo}>
                    <div className={styles.charCardOwnerLabel}>
                      Owner: {c.owner}
                      {!isActive && <span className={styles.charInactiveTag}>INACTIVE</span>}
                    </div>
                    <div className={styles.charCardName}>
                      {c.name}
                      <span className={styles.charCardClanPill} style={{ background: clanColor }}>{c.clan}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.charCardHeaderRight}>
                  {clanLogoUrl && <div className={styles.charCardClanLogo} />}
                  <span className={`${styles.charCardChevron} ${isExpanded ? styles.charCardChevronOpen : ''}`}>▼</span>
                </div>
              </div>

              {/* EXPANDED CONTENT (BODY & FOOTER) */}
              {isExpanded && (
                <>
                  {/* CARD BODY */}
                  <div className={styles.charCardBody}>
                {/* Vitals Summary */}
                <div className={styles.charVitalsRow}>
                  <div className={styles.charVitalChip}><b>XP:</b> {c.xp}</div>
                  <div className={styles.charVitalChip}><b>Gen:</b> {data.generation || '?'}</div>
                  <div className={styles.charVitalChip}><b>BP:</b> {data.blood_potency || 1}</div>
                  <div className={styles.charVitalChip}><b>Sire:</b> {data.sire || 'Unknown'}</div>
                </div>

                {/* Trackers (Always Visible) */}
                <div className={styles.charTrackersPanel}>
                  <TrackerDisplay label="Health" max={maxHealth} currentObj={data.health || {}} onUpdate={(type, delta) => updateTracker(c, 'health', type, delta)} />
                  <TrackerDisplay label="Willpower" max={maxWillpower} currentObj={data.willpower || {}} onUpdate={(type, delta) => updateTracker(c, 'willpower', type, delta)} />
                  <TrackerDisplay label="Humanity" max={10} isValueTracker={true} value={data.morality?.humanity ?? data.humanity ?? 7} stains={data.stains || 0} onUpdate={(type, delta) => updateTracker(c, 'humanity', type, delta)} />
                  <TrackerDisplay label="Hunger" max={5} isValueTracker={true} value={data.hunger || 0} onUpdate={(type, delta) => updateTracker(c, 'hunger', type, delta)} />
                </div>

                  <div className={styles.charExpandedPanel}>

                    {/* Inventory Section */}
                    <div className={styles.charSectionBlock}>
                      <div className={styles.charSectionTitleRow}>
                        <h4 className={styles.charSectionTitle}>Inventory</h4>
                        <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => handleAddInventory(c)}>+ Add Item</button>
                      </div>

                      <div className={styles.charInventoryList}>
                        {(!data.inventory || data.inventory.length === 0) && (
                          <div className={styles.charInventoryEmpty}>No items in inventory.</div>
                        )}

                        {(data.inventory || []).map((item, idx) => (
                          <div key={idx} className={styles.charInventoryRow}>
                            <input type="text" className={styles.input} style={{ flex: 2 }} value={item.name} onChange={(e) => handleUpdateInventory(c, idx, 'name', e.target.value)} placeholder="Item Name" />
                            <input type="number" className={styles.input} style={{ flex: '0 0 70px' }} value={item.qty} onChange={(e) => handleUpdateInventory(c, idx, 'qty', parseInt(e.target.value)||0)} title="Quantity" />
                            <input type="text" className={styles.input} style={{ flex: 3 }} value={item.notes || ''} onChange={(e) => handleUpdateInventory(c, idx, 'notes', e.target.value)} placeholder="Notes/Effects" />
                            <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => handleRemoveInventory(c, idx)}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Admin Notes Section */}
                    <div className={styles.charSectionBlock}>
                      <h4 className={styles.charSectionTitle} style={{ color: 'var(--color-warn)' }}>Admin Notes (Hidden from Player)</h4>
                      <textarea className={`${styles.textarea} ${styles.charNotesArea}`} value={data.admin_notes || ''} onChange={(e) => updateSheetData(c, d => { d.admin_notes = e.target.value; return d; })} placeholder="Add story notes, warnings, or plot hooks here..." />
                    </div>

                    {/* Raw JSON Toggle */}
                    <details className={styles.charJsonDetails}>
                      <summary>View/Edit Raw Sheet JSON</summary>
                      <textarea value={sheetStates[c.id] || ''} onChange={(e) => setSheetState(c.id, JSON.parse(e.target.value))} className={`${styles.textarea} ${styles.inputMono} ${styles.charJsonTextarea}`} />
                    </details>

                  </div>
              </div>

              {/* CARD FOOTER */}
              <div className={styles.charCardFooter}>
                {/* Primary Actions */}
                <div className={styles.charCardFooterRow}>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { try { onSave({ id: c.id, name: c.name, clan: c.clan, sheet: getSheetObj(c.id) }); } catch { alert('Invalid JSON in sheet'); } }}>Save</button>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => onOpenEditor({ ...c, sheet: getSheetObj(c.id) })}>Editor Modal</button>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => generateVTMCharacterSheetPDF(c)}>PDF</button>
                </div>

                {/* Secondary Actions */}
                <div className={styles.charCardFooterRow}>
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => handleToggleActive(c)}>
                    {isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className={`${styles.btn} ${data.allow_reset ? styles.btnGhost : styles.btnWarning}`} onClick={() => data.allow_reset ? handleRevokeReset(c) : handleReset(c)}>
                    {data.allow_reset ? 'Revoke Re-Roll' : 'Allow Re-Roll'}
                  </button>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => handleUpgradeDiscipline(c)}>
                    Upgrade Disc to 6
                  </button>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => handleRemoveDisciplineLevel6(c)}>
                    Remove Lvl 6
                  </button>
                  <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => onDelete(c.id)}>Delete</button>
                </div>
              </div>
                </>
              )}
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

      {/* DISCIPLINE UPGRADE MODAL */}
      {upgradeDisciplineState && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard} style={{ maxWidth: '480px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.inputMono} style={{ color: 'var(--accent-purple)' }}>
                Upgrade Discipline to Level 6
              </h3>
            </div>
            <div className={styles.modalBody}>
              <p>
                Select a discipline to upgrade to level 6 for <strong>{upgradeDisciplineState.charName}</strong>:
              </p>
              <div className={styles.row} style={{ margin: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {ALL_DISCIPLINE_NAMES.map(disc => (
                  <label key={disc} className={styles.row} style={{ alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      name="discipline"
                      value={disc}
                      checked={upgradeDisciplineState.discipline === disc}
                      onChange={() => handleDisciplineSelect(disc)}
                      className={styles.input}
                    />
                    {disc}
                  </label>
                ))}
              </div>
              {!upgradeDisciplineState.discipline && (
                <p className={styles.subtle} style={{ marginTop: '1rem' }}>
                  Please select a discipline
                </p>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setUpgradeDisciplineState(null)}
              >
                Cancel
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleUpgradeConfirm}
                disabled={!upgradeDisciplineState.discipline}
              >
                Confirm Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE DISCIPLINE LEVEL 6 MODAL */}
      {removeDisciplineState && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard} style={{ maxWidth: '480px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.inputMono} style={{ color: 'var(--color-warning)' }}>
                Remove Discipline Level 6
              </h3>
            </div>
            <div className={styles.modalBody}>
              <p>
                Select a discipline to remove the sixth dot (set to level 5) for <strong>{removeDisciplineState.charName}</strong>:
              </p>
              <div className={styles.row} style={{ margin: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {ALL_DISCIPLINE_NAMES.map(disc => (
                  <label key={disc} className={styles.row} style={{ alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      name="discipline"
                      value={disc}
                      checked={removeDisciplineState.discipline === disc}
                      onChange={() => handleRemoveDisciplineSelect(disc)}
                      className={styles.input}
                    />
                    {disc}
                  </label>
                ))}
              </div>
              {!removeDisciplineState.discipline && (
                <p className={styles.subtle} style={{ marginTop: '1rem' }}>
                  Please select a discipline
                </p>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setRemoveDisciplineState(null)}
              >
                Cancel
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleRemoveDisciplineConfirm}
                disabled={!removeDisciplineState.discipline}
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}