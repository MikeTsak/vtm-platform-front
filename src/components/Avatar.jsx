import React, { useState, useRef } from 'react';
import api from '../core/api'; // our axios instance
import styles from './Avatar.module.css';
import AvatarCropperModal from './AvatarCropperModal';

const avatarTimestamps = new Map();

export default function Avatar({ userId, npcId, identityId, retainerId, size = 80, editable = false, onUploadSuccess, onFileSelect, previewUrl, style = {}, className = "", imgClassName = "", imgStyle = {}, fallback = '/img/ATT-logo(1).webp' }) {
  const entityKey = userId ? `u_${userId}` : (npcId ? `n_${npcId}` : (retainerId ? `r_${retainerId}` : `i_${identityId}`));
  const [timestamp, setTimestamp] = useState(() => avatarTimestamps.get(entityKey) || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const fileInputRef = useRef(null);

  const baseUrl = import.meta.env.VITE_API_URL || '/api';
  let srcUrl = previewUrl || fallback;
  let thumbSrcUrl = null;

  React.useEffect(() => {
    setImgError(false);
  }, [entityKey, timestamp]);

  React.useEffect(() => {
    const handleAvatarUpdated = (e) => {
      if (e.detail.entityKey === entityKey) {
        setTimestamp(e.detail.newTs);
      }
    };
    window.addEventListener('avatar-updated', handleAvatarUpdated);
    return () => window.removeEventListener('avatar-updated', handleAvatarUpdated);
  }, [entityKey]);

  // Builds the query string for the full-size request, and the matching
  // one for the small `?size=thumb` variant the backend can redirect to
  // (see migrations/list/0011_avatar_thumb_urls.js) — kept as one helper so
  // the `?t=` cache-busting param stays in sync between the two.
  const buildQuery = (extra) => {
    const params = [];
    if (timestamp) params.push(`t=${timestamp}`);
    if (extra) params.push(extra);
    return params.length ? `?${params.join('&')}` : '';
  };

  if (!imgError && !previewUrl) {
    const q = buildQuery();
    const qThumb = buildQuery('size=thumb');
    if (userId) {
      srcUrl = `${baseUrl}/users/${userId}/avatar${q}`;
      thumbSrcUrl = `${baseUrl}/users/${userId}/avatar${qThumb}`;
    } else if (npcId) {
      srcUrl = `${baseUrl}/npcs/${npcId}/avatar${q}`;
      thumbSrcUrl = `${baseUrl}/npcs/${npcId}/avatar${qThumb}`;
    } else if (retainerId) {
      srcUrl = `${baseUrl}/retainers/${retainerId}/avatar${q}`;
      thumbSrcUrl = `${baseUrl}/retainers/${retainerId}/avatar${qThumb}`;
    } else if (identityId) {
      srcUrl = `${baseUrl}/identities/${identityId}/avatar${q}`;
      thumbSrcUrl = `${baseUrl}/identities/${identityId}/avatar${qThumb}`;
    }
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
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { entityKey, newTs } }));
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
          srcSet={thumbSrcUrl ? `${thumbSrcUrl} 160w, ${srcUrl} 500w` : undefined}
          sizes={thumbSrcUrl ? `${size}px` : undefined}
          alt="User Avatar"
          width={size}
          height={size}
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

