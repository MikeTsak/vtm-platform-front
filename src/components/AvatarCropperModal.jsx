import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './AvatarCropperModal.module.css';

const VIEWPORT_SIZE = 320;
const OUTPUT_SIZE = 500;

export default function AvatarCropperModal({ imageSrc, onCropComplete, onCancel }) {
  const mainCanvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [imageObj, setImageObj] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetStartRef = useRef({ x: 0, y: 0 });

  // Base dimensions calculation
  const getBaseDimensions = useCallback((img) => {
    if (!img) return { baseW: VIEWPORT_SIZE, baseH: VIEWPORT_SIZE };
    const aspect = img.naturalWidth / img.naturalHeight;
    let baseW, baseH;
    if (aspect > 1) {
      baseH = VIEWPORT_SIZE;
      baseW = VIEWPORT_SIZE * aspect;
    } else {
      baseW = VIEWPORT_SIZE;
      baseH = VIEWPORT_SIZE / aspect;
    }
    return { baseW, baseH };
  }, []);

  // Clamp pan offset so image stays covering viewport
  const clampOffset = useCallback((newX, newY, currentScale, img) => {
    if (!img) return { x: 0, y: 0 };
    const { baseW, baseH } = getBaseDimensions(img);
    const scaledW = baseW * currentScale;
    const scaledH = baseH * currentScale;
    const maxX = Math.max(0, (scaledW - VIEWPORT_SIZE) / 2);
    const maxY = Math.max(0, (scaledH - VIEWPORT_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, newX)),
      y: Math.min(maxY, Math.max(-maxY, newY)),
    };
  }, [getBaseDimensions]);

  // Load Image
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Render main cropper canvas & preview
  const drawCanvases = useCallback(() => {
    if (!imageObj || !mainCanvasRef.current) return;

    const mainCanvas = mainCanvasRef.current;
    const mainCtx = mainCanvas.getContext('2d');
    const { baseW, baseH } = getBaseDimensions(imageObj);
    const scaledW = baseW * scale;
    const scaledH = baseH * scale;

    // Draw main crop canvas
    mainCtx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);
    mainCtx.save();
    mainCtx.translate(VIEWPORT_SIZE / 2 + offset.x, VIEWPORT_SIZE / 2 + offset.y);
    mainCtx.drawImage(imageObj, -scaledW / 2, -scaledH / 2, scaledW, scaledH);
    mainCtx.restore();

    // Draw circular preview canvas
    if (previewCanvasRef.current) {
      const pCanvas = previewCanvasRef.current;
      const pCtx = pCanvas.getContext('2d');
      const pSize = pCanvas.width;
      pCtx.clearRect(0, 0, pSize, pSize);
      pCtx.save();
      // Draw image
      const previewRatio = pSize / VIEWPORT_SIZE;
      pCtx.translate(pSize / 2 + offset.x * previewRatio, pSize / 2 + offset.y * previewRatio);
      pCtx.drawImage(imageObj, (-scaledW / 2) * previewRatio, (-scaledH / 2) * previewRatio, scaledW * previewRatio, scaledH * previewRatio);
      pCtx.restore();
    }
  }, [imageObj, scale, offset, getBaseDimensions]);

  useEffect(() => {
    drawCanvases();
  }, [drawCanvases]);

  // Drag Handlers
  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { x: clientX, y: clientY };
    offsetStartRef.current = { ...offset };
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !imageObj) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    const rawX = offsetStartRef.current.x + dx;
    const rawY = offsetStartRef.current.y + dy;
    setOffset(clampOffset(rawX, rawY, scale, imageObj));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Zoom Slider Handler
  const handleZoomChange = (e) => {
    const newScale = parseFloat(e.target.value);
    setScale(newScale);
    if (imageObj) {
      setOffset((prev) => clampOffset(prev.x, prev.y, newScale, imageObj));
    }
  };

  // Wheel Zoom Handler
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    const newScale = Math.min(3, Math.max(1, scale + delta));
    setScale(newScale);
    if (imageObj) {
      setOffset((prev) => clampOffset(prev.x, prev.y, newScale, imageObj));
    }
  };

  // Reset
  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // Crop & Export
  const handleSave = () => {
    if (!imageObj) return;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = OUTPUT_SIZE;
    exportCanvas.height = OUTPUT_SIZE;
    const ctx = exportCanvas.getContext('2d');

    const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;
    const { baseW, baseH } = getBaseDimensions(imageObj);
    const scaledW = baseW * scale * ratio;
    const scaledH = baseH * scale * ratio;

    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.save();
    ctx.translate(OUTPUT_SIZE / 2 + offset.x * ratio, OUTPUT_SIZE / 2 + offset.y * ratio);
    ctx.drawImage(imageObj, -scaledW / 2, -scaledH / 2, scaledW, scaledH);
    ctx.restore();

    exportCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], 'avatar_cropped.png', { type: 'image/png' });
        onCropComplete(croppedFile);
      },
      'image/png',
      0.95
    );
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <span className={`material-symbols-outlined ${styles.titleIcon}`}>crop</span>
            Adjust Avatar
          </h3>
          <button className={styles.closeBtn} onClick={onCancel} title="Cancel">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className={styles.body}>
          {/* Main Cropper Box */}
          <div
            className={styles.cropAreaWrapper}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            onWheel={handleWheel}
          >
            <canvas
              ref={mainCanvasRef}
              width={VIEWPORT_SIZE}
              height={VIEWPORT_SIZE}
              className={styles.canvas}
            />

            {/* Circular Mask Overlay */}
            <svg className={styles.maskOverlay} viewBox={`0 0 ${VIEWPORT_SIZE} ${VIEWPORT_SIZE}`}>
              <defs>
                <mask id="avatar-circle-mask">
                  <rect width={VIEWPORT_SIZE} height={VIEWPORT_SIZE} fill="white" />
                  <circle cx={VIEWPORT_SIZE / 2} cy={VIEWPORT_SIZE / 2} r={VIEWPORT_SIZE / 2 - 10} fill="black" />
                </mask>
              </defs>
              {/* Darkened background outside circle */}
              <rect
                width={VIEWPORT_SIZE}
                height={VIEWPORT_SIZE}
                fill="rgba(0, 0, 0, 0.65)"
                mask="url(#avatar-circle-mask)"
              />
              {/* Circle border indicator */}
              <circle
                cx={VIEWPORT_SIZE / 2}
                cy={VIEWPORT_SIZE / 2}
                r={VIEWPORT_SIZE / 2 - 10}
                fill="none"
                stroke="rgba(180, 15, 31, 0.85)"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
            </svg>
          </div>

          {/* Zoom Slider Control */}
          <div className={styles.controlsRow}>
            <span className={`material-symbols-outlined ${styles.zoomIcon}`}>zoom_out</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.02"
              value={scale}
              onChange={handleZoomChange}
              className={styles.zoomSlider}
            />
            <span className={`material-symbols-outlined ${styles.zoomIcon}`}>zoom_in</span>
            <button className={styles.resetBtn} onClick={handleReset} title="Reset Zoom & Position">
              Reset
            </button>
          </div>

          {/* Live Circular Preview Badge */}
          <div className={styles.previewSection}>
            <div className={styles.previewLabel}>
              <span className={styles.previewTitle}>Circle Avatar Preview</span>
              <span className={styles.previewSub}>1:1 Square Output</span>
            </div>
            <div className={styles.previewCircle}>
              <canvas ref={previewCanvasRef} width={64} height={64} className={styles.previewCanvas} />
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={handleSave}>
            <span className="material-symbols-outlined">check</span>
            Apply & Save
          </button>
        </div>
      </div>
    </div>
  );
}
