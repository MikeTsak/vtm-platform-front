import React, { useState, useRef } from 'react';
import api from '../core/api'; // our axios instance
import styles from './Avatar.module.css';

const avatarTimestamps = new Map();

export default function Avatar({ userId, npcId, identityId, retainerId, size = 80, editable = false, onUploadSuccess, onFileSelect, previewUrl, style = {}, className = "", imgClassName = "", imgStyle = {}, fallback = '/img/ATT-logo(1).png' }) {
  const entityKey = userId ? `u_${userId}` : (npcId ? `n_${npcId}` : (retainerId ? `r_${retainerId}` : `i_${identityId}`));
  const [timestamp, setTimestamp] = useState(() => avatarTimestamps.get(entityKey) || '');
  const [isUploading, setIsUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef(null);

  const baseUrl = process.env.REACT_APP_API_URL || '';
  let srcUrl = previewUrl || fallback;
  if (!imgError && !previewUrl) {
    const q = timestamp ? `?t=${timestamp}` : '';
    if (userId) srcUrl = `${baseUrl}/users/${userId}/avatar${q}`;
    else if (npcId) srcUrl = `${baseUrl}/npcs/${npcId}/avatar${q}`;
    else if (retainerId) srcUrl = `${baseUrl}/retainers/${retainerId}/avatar${q}`;
    else if (identityId) srcUrl = `${baseUrl}/identities/${identityId}/avatar${q}`;
  }

  const handleClick = () => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Maximum size is 5MB.');
      return;
    }

    if (onFileSelect) {
      onFileSelect(file);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const endpoint = userId ? `/users/${userId}/avatar` : (npcId ? `/npcs/${npcId}/avatar` : (retainerId ? `/retainers/${retainerId}/avatar` : `/identities/${identityId}/avatar`));
      await api.put(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newTs = Date.now();
      avatarTimestamps.set(entityKey, newTs);
      setTimestamp(newTs); // Force reload image
      setImgError(false); // Reset error state in case it was a fallback before
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      console.error('Failed to upload avatar', err);
      alert('Failed to upload avatar: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsUploading(false);
      e.target.value = null; // reset input
    }
  };

  return (
    <div 
      className={`${styles.avatarContainer} ${editable ? styles.editable : ''} ${isUploading ? styles.uploading : ''} ${className}`}
      style={{ width: size, height: size, ...style }}
      onClick={handleClick}
      title={editable ? "Click to change avatar" : ""}
    >
      <img 
        src={srcUrl} 
        alt="User Avatar" 
        className={`${styles.avatarImage} ${imgClassName}`}
        style={imgStyle}
        onError={() => setImgError(true)}
      />
      {editable && (
        <div className={styles.editOverlay}>
          <span className="material-symbols-outlined">edit</span>
        </div>
      )}
      {isUploading && (
        <div className={styles.spinnerOverlay}>
          <span className="material-symbols-outlined spin">progress_activity</span>
        </div>
      )}
      
      {editable && (
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*"
          onChange={handleFileChange}
        />
      )}
    </div>
  );
}
