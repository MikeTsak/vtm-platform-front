// Full-screen QR scanner. Camera first (jsQR on video frames, which works on
// iOS Safari where BarcodeDetector does not); a photo of the code and a typed
// code are the fallbacks for a denied camera or an in-app browser without one.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import modal from '../../styles/InventoryItemModal.module.css';
import styles from '../../styles/Inventory.module.css';
import { codeFromScan } from './itemQr';

const loadJsQr = () => import('jsqr').then((m) => m.default || m);

function decodeCanvas(jsQR, canvas, ctx, source, w, h, both) {
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(source, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  return jsQR(img.data, w, h, { inversionAttempts: both ? 'attemptBoth' : 'dontInvert' });
}

// Hands back the first code it reads; the parent closes it and takes over.
export default function QrScanner({ title = 'Get item', onCode, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [camError, setCamError] = useState(null);
  const [manual, setManual] = useState('');
  // Stops the frame loop firing the same code again before the parent unmounts us.
  const [paused, setPaused] = useState(false);

  const submit = useCallback((text) => {
    const code = codeFromScan(text);
    if (!code) return;
    setPaused(true);
    navigator.vibrate?.(40);
    onCode(code);
  }, [onCode]);

  // The frame loop reads these through refs so it never restarts the camera.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    let raf = 0;
    let alive = true;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setCamError('This browser cannot open the camera.'); return; }
      try {
        const [jsQR, stream] = await Promise.all([
          loadJsQr(),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }),
        ]);
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play().catch(() => {});
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let last = 0;
        const tick = (t) => {
          if (!alive) return;
          raf = requestAnimationFrame(tick);
          // ~8 decodes a second is plenty and keeps phones cool.
          if (t - last < 120 || video.readyState < 2 || pausedRef.current) return;
          last = t;
          const scale = Math.min(1, 640 / (video.videoWidth || 640));
          const hit = decodeCanvas(jsQR, canvas, ctx, video, Math.round(video.videoWidth * scale), Math.round(video.videoHeight * scale), false);
          if (hit?.data) submitRef.current(hit.data);
        };
        raf = requestAnimationFrame(tick);
      } catch (e) {
        setCamError(e?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Take a photo of the code or type it below.'
          : 'Could not open the camera. Take a photo of the code or type it below.');
      }
    })();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const fromPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const jsQR = await loadJsQr();
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) { setCamError('Could not read that photo.'); return; }
    const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
    const canvas = canvasRef.current;
    const hit = decodeCanvas(jsQR, canvas, canvas.getContext('2d', { willReadFrequently: true }), bmp, Math.round(bmp.width * scale), Math.round(bmp.height * scale), true);
    if (hit?.data) submit(hit.data);
    else setCamError('No QR code found in that photo. Try again closer and in focus.');
  };

  return createPortal(
    <div className={`${modal.modalOverlay} ${styles.sheetOverlay}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`${modal.card} ${modal.modalCard} ${styles.sheetCard}`}>
        <div className={`${modal.modalHeader} ${styles.sheetHeader}`}>
          <h3 className={modal.modalTitle}>{title}</h3>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={modal.modalBody}>
          <div className={styles.scanViewport}>
            <video ref={videoRef} playsInline muted className={styles.scanVideo} />
            {!camError && <div className={styles.scanFrame} aria-hidden="true" />}
            {paused && (
              <div className={styles.scanBusy}><span className="material-symbols-outlined">hourglass_top</span> Checking…</div>
            )}
            {camError && <div className={styles.scanMessage}>{camError}</div>}
          </div>
          <canvas ref={canvasRef} hidden />
          <p className={styles.scanHint}>Point the camera at the item's QR code, or at the code another player is showing you.</p>

          <label className={`${modal.ghostBtn} ${styles.fullBtn}`}>
            <span className="material-symbols-outlined">photo_camera</span> Use a photo instead
            <input type="file" accept="image/*" capture="environment" hidden onChange={fromPhoto} />
          </label>
          <form
            className={styles.manualRow}
            onSubmit={(e) => { e.preventDefault(); submit(manual); }}
          >
            <input
              className={modal.input}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Or type the code"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Item code"
            />
            <button type="submit" className={modal.cta} disabled={paused || !manual.trim()}>Get</button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
