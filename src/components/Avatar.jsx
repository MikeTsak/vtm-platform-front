import React, { useState, useRef } from 'react';
import api from '../core/api'; // our axios instance
import styles from './Avatar.module.css';
import AvatarCropperModal from './AvatarCropperModal';

const avatarTimestamps = new Map();

export default function Avatar({ userId, npcId, identityId, retainerId, size = 80, editable = false, onUploadSuccess, onFileSelect, previewUrl, style = {}, className = "", imgClassName = "", imgStyle = {}, fallback = '/img/ATT-logo(1).png' }) {
  const entityKey = userId ? `u_${userId}` : (npcId ? `n_${npcId}` : (retainerId ? `r_${retainerId}` : `i_${identityId}`));
  const [timestamp, setTimestamp] = useState(() => avatarTimestamps.get(entityKey) || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const fileInputRef = useRef(null);

  const baseUrl = import.meta.env.VITE_API_URL || '/api';
  let srcUrl = previewUrl || fallback;

  React.useEffect(() => {
    setImgError(false);
  }, [entityKey, timestamp]);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (e.g., 15MB max input before crop)
    if (file.size > 15 * 1024 * 1024) {
      alert('File is too large. Maximum size is 15MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    e.target.value = null; // reset input
  };

  const handleCropCancel = () => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropImageSrc(null);
  };

  const handleCropComplete = async (croppedFile) => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropImageSrc(null);

    if (onFileSelect) {
      onFileSelect(croppedFile);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('avatar', croppedFile);

      const endpoint = userId ? `/users/${userId}/avatar` : (npcId ? `/npcs/${npcId}/avatar` : (retainerId ? `/retainers/${retainerId}/avatar` : `/identities/${identityId}/avatar`));
      await api.put(endpoint, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
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
    }
  };

  return (
    <>
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
          <div className={styles.spinnerOverlay} style={{flexDirection: 'column', padding: '5px'}}>
            <span className="material-symbols-outlined spin" style={{marginBottom: '5px'}}>progress_activity</span>
            <div style={{width: '100%', backgroundColor: 'rgba(255,255,255,0.3)', height: '4px', borderRadius: '2px', overflow: 'hidden'}}>
              <div style={{width: `${uploadProgress}%`, backgroundColor: '#fff', height: '100%', transition: 'width 0.2s'}} />
            </div>
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

      {cropImageSrc && (
        <AvatarCropperModal
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}

