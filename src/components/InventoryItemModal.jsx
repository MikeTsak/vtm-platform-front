import React, { useState } from 'react';
import styles from './InventoryItemModal.module.css';

const InventoryItemModal = ({ item, onClose, onSave, busy }) => {
  const [name, setName] = useState(item?.name || '');
  const [itemType, setItemType] = useState(item?.item_type || 'Mundane');
  const [description, setDescription] = useState(item?.description || '');
  const [mechanicNotes, setMechanicNotes] = useState(item?.mechanic_notes || '');
  const [quantity, setQuantity] = useState(item?.quantity || 1);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(item?.image || null);

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
      <div className={`${styles.card} ${styles.modalCard}`} style={{ width: 'min(92vw, 500px)' }}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{item ? 'Edit Item' : 'Add Item'}</h3>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Name</label>
            <input className={styles.input} style={{ width: '100%', boxSizing: 'border-box' }} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Type</label>
              <select className={styles.input} style={{ width: '100%', boxSizing: 'border-box' }} value={itemType} onChange={e => setItemType(e.target.value)}>
                {['Relic', 'Artifact', 'Blood Magic', 'Weapon', 'Armor', 'Mundane'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ width: '100px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Qty</label>
              <input type="number" className={styles.input} style={{ width: '100%', boxSizing: 'border-box' }} value={quantity} onChange={e => setQuantity(Number(e.target.value))} min={1} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Description</label>
            <textarea className={styles.input} style={{ width: '100%', boxSizing: 'border-box' }} value={description} onChange={e => setDescription(e.target.value)} rows={3}></textarea>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>System / Mechanics</label>
            <textarea className={styles.input} style={{ width: '100%', boxSizing: 'border-box' }} value={mechanicNotes} onChange={e => setMechanicNotes(e.target.value)} rows={3}></textarea>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'block', width: '100%', marginBottom: '8px' }}
            />
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="Preview"
                style={{ maxWidth: '150px', maxHeight: '150px', borderRadius: '4px' }}
              />
            )}
          </div>
        </div>
        <div className={styles.modalFooter} style={{ padding: '16px 20px' }}>
          <button className={styles.ghostBtn} onClick={onClose} disabled={busy}>Cancel</button>
          <button className={styles.cta} onClick={() => onSave({
            name,
            item_type: itemType,
            description,
            mechanic_notes: mechanicNotes,
            quantity,
            image: imagePreviewUrl || null
          })} disabled={busy || !name}>Save Item</button>
        </div>
      </div>
    </div>
  );
};

export default InventoryItemModal;