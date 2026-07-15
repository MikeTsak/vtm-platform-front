import React, { useState, useEffect, useCallback } from 'react';
import api from '../../core/api';
import InventoryItemModal from './InventoryItemModal';
import styles from '../../styles/Inventory.module.css';

function Inventory({ characterId }) {
  const id = characterId;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [viewMode, setViewMode] = useState('list');
  const [activeTab, setActiveTab] = useState('All');
  
  const [expandedItems, setExpandedItems] = useState(new Set());
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

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

  const toggleExpand = (itemId) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Relics') return ['Relic', 'Artifact', 'Blood Magic'].includes(item.item_type);
    if (activeTab === 'Weapons') return ['Weapon'].includes(item.item_type);
    if (activeTab === 'Armor') return ['Armor'].includes(item.item_type);
    if (activeTab === 'Gear') return ['Mundane', 'Gear'].includes(item.item_type);
    return item.item_type === activeTab;
  });

  const tabs = ['All', 'Relics', 'Weapons', 'Armor', 'Gear'];

  const getIconForItem = (itemType) => {
    if (['Relic', 'Artifact', 'Blood Magic'].includes(itemType)) return 'diamond';
    if (['Weapon'].includes(itemType)) return 'swords';
    if (['Armor'].includes(itemType)) return 'shield';
    if (['Document', 'Note'].includes(itemType)) return 'description';
    if (!itemType || itemType === 'Unknown') return 'help_outline';
    return 'backpack';
  };

  const renderItem = (item) => {
    const isExpanded = expandedItems.has(item.id);
    const iconName = getIconForItem(item.item_type);

    return (
      <div 
        key={item.id} 
        className={`${styles.itemCard} ${isExpanded ? styles.expanded : ''}`}
      >
        <div className={styles.itemCardHeader} onClick={() => toggleExpand(item.id)}>
          <div className={styles.itemCardLeft}>
            <div className={styles.itemIcon}>
              {item.image ? (
                <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.375rem' }} />
              ) : (
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {iconName}
                </span>
              )}
            </div>
            <div>
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
              <span className={styles.badgeResearched}>✓ RESEARCHED</span>
            ) : (
              <span className={styles.badgeUnknown}>? UNKNOWN</span>
            )}
            <span className={`material-symbols-outlined ${styles.expandIcon}`}>
              expand_more
            </span>
          </div>
        </div>

        <div className={styles.itemDetails}>
          <div className={styles.itemDetailsInner}>
            <p className={styles.itemDescription}>
              {item.description || 'No description provided.'}
            </p>
            {item.mechanic_notes && (
              <div className={styles.itemMechanics}>
                <strong>System:</strong> {item.mechanic_notes}
              </div>
            )}
            <div className={styles.itemActions}>
              <button 
                className={styles.editBtn} 
                onClick={(e) => { e.stopPropagation(); openModal(item); }}
              >
                Edit
              </button>
              <button 
                className={styles.deleteBtn} 
                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
              >
                Delete
              </button>
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
      {/* Header & Controls */}
      <div className={styles.headerRow}>
        <h3>Inventory</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className={styles.viewToggles}>
            <button 
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.activeView : ''}`} 
              onClick={() => setViewMode('list')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>view_list</span>
            </button>
            <button 
              className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.activeView : ''}`} 
              onClick={() => setViewMode('grid')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>grid_view</span>
            </button>
          </div>
          <button className={styles.addBtn} onClick={() => openModal()}>
            + Add Item
          </button>
        </div>
      </div>

      {/* Categories Tabs */}
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

      {/* Inventory List / Grid */}
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
          {filteredItems.map(item => renderItem(item))}
        </div>
      )}

      {/* Modal */}
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