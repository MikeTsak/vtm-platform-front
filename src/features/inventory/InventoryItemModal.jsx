import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../../styles/InventoryItemModal.module.css';
import AvatarCropperModal from '../../components/AvatarCropperModal';
import { ITEM_TYPES } from './itemMeta';

// Storyteller-only item editor. `characters` (admin tab) adds a holder picker;
// on a character sheet the holder is fixed by the sheet.
const InventoryItemModal = ({ item, onClose, onSave, busy, characters = null }) => {
  const [name, setName] = useState(item?.name || '');
  const [itemType, setItemType] = useState(item?.item_type || 'Mundane');
  const [description, setDescription] = useState(item?.description || '');
  const [mechanicNotes, setMechanicNotes] = useState(item?.mechanic_notes || '');
  const [quantity, setQuantity] = useState(item?.quantity || 1);
  const [playerNotes, setPlayerNotes] = useState(item?.player_notes || '');
  const [characterId, setCharacterId] = useState(item?.character_id ?? '');
  const [claimCopies, setClaimCopies] = useState(!!item?.claim_copies);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(item?.image || null);
  
  // Researched State (Defaults to false for new items)
  const [researched, setResearched] = useState(item?.researched ? true : false);

  const [cropImageSrc, setCropImageSrc] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        alert('File is too large. Maximum size is 15MB.');
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setCropImageSrc(objectUrl);
      e.target.value = null; // reset input
    }
  };

  const handleCropCancel = () => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropImageSrc(null);
  };

  const handleCropComplete = (croppedFile) => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropImageSrc(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviewUrl(reader.result);
    };
    reader.readAsDataURL(croppedFile);
  };

  const modalContent = (
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
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
              Researched: the holder can see what it does
            </span>
          </label>

          {characters && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Held by</label>
              <select className={styles.input} value={characterId} onChange={e => setCharacterId(e.target.value)}>
                <option value="">Nobody: out in the world (claimed by QR)</option>
                {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {characters && characterId === '' && (
            <label className={styles.checkboxGroup}>
              <input type="checkbox" className={styles.checkboxInput} checked={claimCopies} onChange={e => setClaimCopies(e.target.checked)} />
              <span className={styles.checkboxLabel}>Every scanner gets their own copy (flyers, handouts)</span>
            </label>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.input} value={description} onChange={e => setDescription(e.target.value)} rows={3}></textarea>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>What it does (mechanics, hidden until researched)</label>
            <textarea className={styles.input} value={mechanicNotes} onChange={e => setMechanicNotes(e.target.value)} rows={3}></textarea>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Player notes</label>
            <textarea className={styles.input} value={playerNotes} onChange={e => setPlayerNotes(e.target.value)} rows={2}></textarea>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Image (optional)</label>
            <input type="file" accept="image/*" className={styles.fileInput} onChange={handleImageChange} />
            {imagePreviewUrl && (
              <>
                <img src={imagePreviewUrl} alt="Preview" className={styles.imagePreview} />
                {/* Saving sends image: null, which the API reads as an explicit
                    clear. Without this there was no way to take a picture off
                    an item once one had been attached. */}
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => setImagePreviewUrl(null)}
                  disabled={busy}
                  style={{ marginTop: '0.5rem' }}
                >
                  Remove image
                </button>
              </>
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
            researched,
            player_notes: playerNotes,
            ...(characters ? { character_id: characterId === '' ? null : Number(characterId), claim_copies: claimCopies } : {}),
          })} disabled={busy || !name}>Save Item</button>
        </div>

      </div>
    </div>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}
      {cropImageSrc && (
        <AvatarCropperModal
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
};

export default InventoryItemModal;