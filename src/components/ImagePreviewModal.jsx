// src/components/ImagePreviewModal.jsx
// Reusable full screen lightbox modal for image attachments.
import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import FaGlyph from '../ui/FaGlyph';

export default function ImagePreviewModal({ isOpen, imageUrl, imageName, onClose }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !imageUrl) return null;

  const displayName = imageName || 'Image Attachment';

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image Preview"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(5, 5, 8, 0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(12px, 3vw, 28px)',
        boxSizing: 'border-box',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '94vw',
          maxHeight: '94vh',
          background: 'rgba(20, 20, 25, 0.95)',
          border: '1px solid rgba(255, 179, 174, 0.25)',
          borderRadius: '12px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85), 0 0 30px rgba(180, 15, 31, 0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '12px 18px',
            background: 'rgba(10, 10, 14, 0.9)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: 0,
            }}
          >
            <span style={{ color: 'var(--primary, #ffb3ae)' }}>
              <FaGlyph name="fa-image" size={18} />
            </span>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.92rem',
                fontWeight: 600,
                color: 'var(--on-surface, #e5e2e1)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={displayName}
            >
              {displayName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#e5e2e1',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Open original image in new tab"
            >
              <FaGlyph name="fa-arrow-right-from-bracket" size={12} />
              <span>Open in New Tab</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                padding: 0,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                color: '#e5e2e1',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Close preview"
            >
              <FaGlyph name="fa-xmark" size={16} />
            </button>
          </div>
        </div>

        {/* Modal Image Viewport */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: '#0a0a0c',
            overflow: 'auto',
            maxHeight: 'calc(94vh - 60px)',
          }}
        >
          <img
            src={imageUrl}
            alt={displayName}
            style={{
              maxWidth: '88vw',
              maxHeight: '80vh',
              objectFit: 'contain',
              display: 'block',
              borderRadius: '6px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
            }}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
