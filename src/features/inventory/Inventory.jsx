import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import api, { formatApiError } from '../../core/api';
import useRole from '../../core/useRole';
import InventoryItemModal from './InventoryItemModal';
import GetItem from './GetItem';
import PassItemModal from './PassItemModal';
import { itemIcon } from './itemMeta';
import styles from '../../styles/Inventory.module.css';

// Players never create items: the Storyteller hands them out (admin Inventory
// tab) or leaves them in the world behind a QR. A player can Get an item by
// scanning, Pass one to another player, and keep their own notes on it.
// `canTrade` = this is the viewer's own current character.
function Inventory({ characterId, canTrade = false, readOnly = false }) {
  const id = characterId;
  const { isAdmin } = useRole();
  const canEditNotes = !readOnly && (canTrade || isAdmin);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [activeTab, setActiveTab] = useState('All');
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [brokenImages, setBrokenImages] = useState(new Set());
  const [notesDraft, setNotesDraft] = useState({}); // itemId -> text being edited
  const [passing, setPassing] = useState(null);
  const [modalItem, setModalItem] = useState(undefined); // undefined = closed, null = new
  const [saving, setSaving] = useState(false);

  const fetchInventory = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get(`/characters/${id}/inventory`);
      setItems(res.data.items || []);
    } catch (err) {
      setError(`Failed to load inventory: ${formatApiError(err, 'Unknown error')}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchInventory();
    else { setError('Failed to load inventory: Character ID is missing.'); setLoading(false); }
  }, [id, fetchInventory]);

  const toggleExpand = (itemId) => setExpandedItems((prev) => {
    const next = new Set(prev);
    if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
    return next;
  });

  const saveNotes = async (item) => {
    const player_notes = notesDraft[item.id] ?? '';
    try {
      await api.put(`/characters/${id}/inventory/${item.id}/notes`, { player_notes });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, player_notes: player_notes || null } : i)));
      setNotesDraft(({ [item.id]: _, ...rest }) => rest);
    } catch (err) {
      toast.error(formatApiError(err, 'Could not save notes'));
    }
  };

  // --- Storyteller tools on a sheet (admin endpoints) ---
  const adminSave = async (data) => {
    if (saving) return;
    setSaving(true);
    try {
      if (modalItem) await api.put(`/admin/inventory/${modalItem.id}`, data);
      else await api.post('/admin/inventory', { ...data, character_id: id });
      setModalItem(undefined);
      await fetchInventory();
    } catch (err) {
      toast.error(formatApiError(err, 'Error saving item'));
    } finally {
      setSaving(false);
    }
  };
  const adminPatch = async (item, data) => {
    try {
      await api.put(`/admin/inventory/${item.id}`, data);
      await fetchInventory();
    } catch (err) {
      toast.error(formatApiError(err, 'Could not update item'));
    }
  };
  const adminDelete = async (item) => {
    if (!window.confirm(`Delete ${item.name} for good?`)) return;
    try {
      await api.delete(`/admin/inventory/${item.id}`);
      await fetchInventory();
    } catch (err) {
      toast.error(formatApiError(err, 'Error deleting item'));
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Relics') return ['Relic', 'Artifact', 'Blood Magic'].includes(item.item_type);
    if (activeTab === 'Weapons') return item.item_type === 'Weapon';
    if (activeTab === 'Armor') return item.item_type === 'Armor';
    if (activeTab === 'Gear') return ['Mundane', 'Gear'].includes(item.item_type);
    return item.item_type === activeTab;
  });
  const tabs = ['All', 'Relics', 'Weapons', 'Armor', 'Gear'];

  const renderItem = (item) => {
    const isExpanded = expandedItems.has(item.id);
    const editing = Object.prototype.hasOwnProperty.call(notesDraft, item.id);

    return (
      <div className={`${styles.itemCard} ${isExpanded ? styles.expanded : ''}`}>
        <button type="button" className={styles.itemCardHeader} onClick={() => toggleExpand(item.id)} aria-expanded={isExpanded}>
          <div className={styles.itemCardLeft}>
            <div className={styles.itemIcon}>
              {item.image && !brokenImages.has(item.id) ? (
                <img
                  src={item.image}
                  alt=""
                  onError={() => setBrokenImages((prev) => new Set(prev).add(item.id))}
                />
              ) : (
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{itemIcon(item.item_type)}</span>
              )}
            </div>
            <div className={styles.itemCardText}>
              <h3 className={styles.itemCardTitle}>{item.name}</h3>
              <div className={styles.itemCardSub}>
                <span className={styles.itemCardSubText}>{item.item_type || 'Item'}</span>
                <span className={styles.itemCardDot}></span>
                <span className={styles.itemCardSubText}>Qty: {item.quantity || 1}</span>
              </div>
            </div>
          </div>
          <div className={styles.itemCardRight}>
            {item.researched ? (
              <span className={styles.badgeResearched}><span className="material-symbols-outlined">verified</span>RESEARCHED</span>
            ) : (
              <span className={styles.badgeUnknown}><span className="material-symbols-outlined">lock</span>UNRESEARCHED</span>
            )}
            <span className={`material-symbols-outlined ${styles.expandIcon}`}>expand_more</span>
          </div>
        </button>

        <div className={styles.itemDetails}>
          <div className={styles.itemDetailsClip}>
            <div className={styles.itemDetailsInner}>
              <p className={styles.itemDescription}>{item.description || 'No description provided.'}</p>

              {item.researched || (isAdmin && item.mechanic_notes) ? (
                <div className={styles.itemMechanics}>
                  <strong>What it does</strong>
                  {!item.researched && <em className={styles.stOnly}> (hidden from the player until researched)</em>}
                  <p>{item.mechanic_notes || 'No mechanical effect.'}</p>
                </div>
              ) : (
                <div className={styles.itemLocked}>
                  <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                  <span>Unresearched. You can tell what it is, not what it does.</span>
                </div>
              )}

              <div className={styles.itemNotes}>
                <strong>Player notes</strong>
                {editing ? (
                  <>
                    <textarea
                      value={notesDraft[item.id]}
                      onChange={(e) => setNotesDraft((d) => ({ ...d, [item.id]: e.target.value }))}
                      rows={3}
                      maxLength={20000}
                      aria-label={`Notes on ${item.name}`}
                      autoFocus
                    />
                    <div className={styles.itemActions}>
                      <button type="button" className={styles.deleteBtn} onClick={() => setNotesDraft(({ [item.id]: _, ...rest }) => rest)}>Cancel</button>
                      <button type="button" className={styles.editBtn} onClick={() => saveNotes(item)}>Save notes</button>
                    </div>
                  </>
                ) : (
                  <p className={item.player_notes ? undefined : styles.muted}>{item.player_notes || 'No notes yet.'}</p>
                )}
              </div>

              <div className={styles.itemActions}>
                {canEditNotes && !editing && (
                  <button type="button" className={styles.deleteBtn} onClick={() => setNotesDraft((d) => ({ ...d, [item.id]: item.player_notes || '' }))}>
                    <span className="material-symbols-outlined">edit_note</span> Notes
                  </button>
                )}
                {canTrade && !readOnly && (
                  <button type="button" className={styles.editBtn} onClick={() => setPassing(item)}>
                    <span className="material-symbols-outlined">qr_code_2</span> Pass item
                  </button>
                )}
              </div>

              {isAdmin && !readOnly && (
                <div className={`${styles.itemActions} ${styles.stActions}`}>
                  <button type="button" className={styles.deleteBtn} onClick={() => adminPatch(item, { researched: !item.researched })}>
                    <span className="material-symbols-outlined">{item.researched ? 'lock' : 'lock_open'}</span> {item.researched ? 'Unresearch' : 'Research'}
                  </button>
                  <button type="button" className={styles.deleteBtn} onClick={() => setModalItem(item)}>
                    <span className="material-symbols-outlined">edit</span> Edit
                  </button>
                  <button type="button" className={styles.deleteBtn} onClick={() => adminDelete(item)}>
                    <span className="material-symbols-outlined">delete</span> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#ab8986' }}>Loading inventory...</div>;
  if (error) return (
    <div style={{ padding: '2rem', border: '1px solid #ff4444', borderRadius: '8px', backgroundColor: 'rgba(255,0,0,0.1)' }}>
      <strong>{error}</strong>
    </div>
  );

  return (
    <div className={styles.inventoryContainer}>
      <div className={styles.headerRow}>
        <h3>Inventory</h3>
        <div className={styles.headerControls}>
          <div className={styles.viewToggles}>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.activeView : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>view_list</span>
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.activeView : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>grid_view</span>
            </button>
          </div>
          {isAdmin && !readOnly && (
            <button type="button" className={styles.addBtn} onClick={() => setModalItem(null)}>
              <span className="material-symbols-outlined" aria-hidden="true">add</span> Add item
            </button>
          )}
          {canTrade && !readOnly && (
            <GetItem className={styles.getBtn} onClaimed={fetchInventory} />
          )}
        </div>
      </div>

      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab}
            className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <p>This character has no inventory items yet.</p>
          {canTrade && !readOnly && <p className={styles.muted}>Found something in play? Tap Get item and scan its QR code.</p>}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className={styles.emptyState}><p>No items found in this category.</p></div>
      ) : (
        <div className={viewMode === 'list' ? styles.itemList : styles.itemGrid}>
          {filteredItems.map((item) => <React.Fragment key={item.id}>{renderItem(item)}</React.Fragment>)}
        </div>
      )}

      {passing && <PassItemModal item={passing} onClose={() => setPassing(null)} onPassed={fetchInventory} />}
      {modalItem !== undefined && (
        <InventoryItemModal item={modalItem} onClose={() => setModalItem(undefined)} onSave={adminSave} busy={saving} />
      )}
    </div>
  );
}

export default Inventory;
