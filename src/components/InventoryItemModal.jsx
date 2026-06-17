import React, { useState } from 'react';
import styles from '../styles/InventoryItemModal.module.css';

const InventoryItemModal = ({ item, onClose, onSave, busy }) => {
  const [name, setName] = useState(item?.name || '');
  const [itemType, setItemType] = useState(item?.item_type || 'Mundane');
  const [description, setDescription] = useState(item?.description || '');
  const [mechanicNotes, setMechanicNotes] = useState(item?.mechanic_notes || '');
  const [quantity, setQuantity] = useState(item?.quantity || 1);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(item?.image || null);
  
  // Researched State (Defaults to false for new items)
  const [researched, setResearched] = useState(item?.researched ? true : false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreviewUrl(null);
    }
  };

  return (
    <div className={styles.modalOverlay} role="dialog">
      <div className={`${styles.card} ${styles.modalCard}`}>
        
        {/* Fixed Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{item ? 'Edit Item' : 'Add Item'}</h3>
        </div>
        
        {/* Scrollable Body */}
        <div className={styles.modalBody}>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Name</label>
            <input className={styles.input} value={name} onChange={e => setName(e.target.value)} />
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Type</label>
              <select className={styles.input} value={itemType} onChange={e => setItemType(e.target.value)}>
                <option value="Relic">Relic</option>
                <option value="Artifact">Artifact</option>
                <option value="Blood Magic">Blood Magic</option>
                <option value="Weapon">Weapon</option>
                <option value="Armor">Armor</option>
                <option value="Mundane">Mundane</option>
              </select>
            </div>
            <div className={styles.formGroup} style={{ flexBasis: '100px' }}>
              <label className={styles.label}>Qty</label>
              <input type="number" className={styles.input} value={quantity} onChange={e => setQuantity(Number(e.target.value))} min={1} />
            </div>
          </div>

          {/* Styled Researched Checkbox Container */}
          <label className={styles.checkboxGroup}>
            <input 
              type="checkbox" 
              className={styles.checkboxInput}
              checked={researched} 
              onChange={e => setResearched(e.target.checked)} 
            />
            <span className={styles.checkboxLabel}>
              Item is Researched
            </span>
          </label>

          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.input} value={description} onChange={e => setDescription(e.target.value)} rows={3}></textarea>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>System / Mechanics</label>
            <textarea className={styles.input} value={mechanicNotes} onChange={e => setMechanicNotes(e.target.value)} rows={3}></textarea>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Image (optional)</label>
            <input type="file" accept="image/*" className={styles.fileInput} onChange={handleImageChange} />
            {imagePreviewUrl && (
              <img src={imagePreviewUrl} alt="Preview" className={styles.imagePreview} />
            )}
          </div>

        </div>

        {/* Fixed Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.ghostBtn} onClick={onClose} disabled={busy}>Cancel</button>
          <button className={styles.cta} onClick={() => onSave({
            name,
            item_type: itemType,
            description,
            mechanic_notes: mechanicNotes,
            quantity,
            image: imagePreviewUrl || null,
            researched
          })} disabled={busy || !name}>Save Item</button>
        </div>

      </div>
    </div>
  );
};

export default InventoryItemModal;