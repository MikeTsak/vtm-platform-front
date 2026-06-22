import React, { useState, useEffect, useCallback } from 'react';
import api from '../core/api';
import InventoryItemModal from './InventoryItemModal';
import styles from '../styles/Inventory.module.css';

function Inventory({ characterId }) {
  const id = characterId;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeTab, setActiveTab] = useState('All');

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/characters/${id}/inventory`);
      setItems(res.data.items || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      const detailedError = err.response?.data?.error || err.message || "Unknown error";
      setError(`Failed to load inventory: ${detailedError}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchInventory();
    } else {
      setError("Failed to load inventory: Character ID is missing.");
      setLoading(false);
    }
  }, [id, fetchInventory]);

  const handleSave = async (itemData) => {
    try {
      if (editingItem) {
        await api.put(`/characters/${id}/inventory/${editingItem.id}`, itemData);
      } else {
        await api.post(`/characters/${id}/inventory`, itemData);
      }
      fetchInventory();
      setModalOpen(false);
      setIsExpanded(true); 
    } catch (err) {
      console.error('Failed to save item:', err);
      const detailedError = err.response?.data?.error || err.message || "Unknown error";
      alert(`Error saving item: ${detailedError}`);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/characters/${id}/inventory/${itemId}`);
      fetchInventory();
    } catch (err) {
      console.error('Failed to delete item:', err);
      const detailedError = err.response?.data?.error || err.message || "Unknown error";
      alert(`Error deleting item: ${detailedError}`);
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Weapons/Armor') return ['Weapon', 'Armor'].includes(item.item_type);
    if (activeTab === 'Mystical') return ['Relic', 'Artifact', 'Blood Magic'].includes(item.item_type);
    return item.item_type === activeTab;
  });

  const tabs = ['All', 'Weapons/Armor', 'Mystical', 'Mundane'];

  const renderItem = (item, mode) => {
    const isList = mode === 'list';
    const cardClass = isList ? styles.itemRow : styles.itemCard;

    return (
      <div key={item.id} className={cardClass}>
        {item.image && (
          <div className={styles.itemImageContainer}>
            <img src={item.image} alt={item.name} className={styles.itemImage} />
          </div>
        )}

        <div className={styles.itemContent}>
          <div className={styles.itemHeader}>
            <h4 className={styles.itemName}>{item.name}</h4>
            <span className={styles.itemQuantity}>Qty: {item.quantity}</span>
          </div>

          {/* DYNAMIC RESEARCH BADGE */}
          <div className={styles.itemType} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '1rem' }}>
            <span>{item.item_type}</span>
            {item.researched ? (
              <span style={{ backgroundColor: 'rgba(31, 170, 112, 0.2)', color: '#1faa70', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #1faa70' }}>
                ✓ RESEARCHED
              </span>
            ) : (
              <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#aaa', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', border: '1px dashed #555' }}>
                ? UNKNOWN
              </span>
            )}
          </div>
          
          {item.description && <p className={styles.itemDescription}>{item.description}</p>}
          
          {item.mechanic_notes && (
            <div className={styles.itemMechanics}>
              <strong>System:</strong> {item.mechanic_notes}
            </div>
          )}
        </div>
        
        {/* FIXED: Removed the 'isOwner' check here so Edit/Delete always show when expanded */}
        {isExpanded && (
          <div className={styles.itemActions}>
            <button className={styles.editBtn} onClick={() => openModal(item)}>Edit</button>
            <button className={styles.deleteBtn} onClick={() => handleDelete(item.id)}>Delete</button>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className={styles.loading}>Loading inventory...</div>;
  if (error) return (
    <div className={styles.error} style={{ padding: '2rem', border: '1px solid #ff4444', borderRadius: '8px', backgroundColor: 'rgba(255,0,0,0.1)' }}>
      <strong>{error}</strong>
    </div>
  );

  return (
    <div className={styles.inventoryContainer}>
      <div className={styles.headerRow}>
        <h3>Relics, Artifacts & Inventory</h3>
        {/* FIXED: Removed 'isOwner' check here so '+ Add Item' is always visible */}
        <button className={styles.addBtn} onClick={() => openModal()}>
          + Add Item
        </button>
      </div>

      {!isExpanded ? (
        <div className={styles.previewMode}>
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <p>This character has no inventory items yet.</p>
              {/* FIXED: Removed 'isOwner' check here as well */}
              <button className={styles.addBtnLarge} onClick={() => { setIsExpanded(true); openModal(); }}>
                Add First Item
              </button>
            </div>
          ) : (
            <div className={styles.previewContent}>
              <p className={styles.previewLabel}>Recent Item:</p>
              {renderItem(items[items.length - 1], 'list')}
            </div>
          )}
          
          {items.length > 0 && (
            <button className={styles.drawerBtn} onClick={() => setIsExpanded(true)}>
              See complete inventory ({items.length})
            </button>
          )}
        </div>
      ) : (
        <div className={styles.expandedMode}>
          <div className={styles.controlsRow}>
            <div className={styles.tabs}>
              {tabs.map(tab => (
                <button
                  key={tab}
                  className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className={styles.viewToggles}>
              <button 
                className={`${styles.viewBtn} ${viewMode === 'list' ? styles.activeView : ''}`} 
                onClick={() => setViewMode('list')}
              >
                List
              </button>
              <button 
                className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.activeView : ''}`} 
                onClick={() => setViewMode('grid')}
              >
                Grid
              </button>
            </div>
          </div>

          {items.length === 0 ? (
             <div className={styles.emptyState}>
               <p>This character has no inventory items yet.</p>
             </div>
          ) : filteredItems.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No items found in this category.</p>
            </div>
          ) : (
            <div className={viewMode === 'list' ? styles.itemList : styles.itemGrid}>
              {filteredItems.map(item => renderItem(item, viewMode))}
            </div>
          )}

          <button className={styles.drawerBtn} onClick={() => setIsExpanded(false)}>
            Close Inventory
          </button>
        </div>
      )}

      {modalOpen && (
        <InventoryItemModal
          item={editingItem}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default Inventory;