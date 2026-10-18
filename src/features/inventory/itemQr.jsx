// QR plumbing for inventory items. A QR encodes a portal URL (/item/<code>)
// so a phone's own camera app opens the claim page too; the in-app scanner
// pulls the code back out of the URL.
import React, { useEffect, useState } from 'react';

export const itemClaimUrl = (code) => `${window.location.origin}/item/${encodeURIComponent(code)}`;

export function codeFromScan(text) {
  const raw = String(text || '').trim();
  const m = raw.match(/\/item\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : raw;
}

export async function qrDataUrl(value, width = 520) {
  const mod = await import('qrcode');
  return (mod.default || mod).toDataURL(value, { margin: 1, width, errorCorrectionLevel: 'M' });
}

export default function ItemQr({ value, size = 240, className, alt = 'Item QR code' }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let live = true;
    setSrc(null);
    qrDataUrl(value, size * 2).then((u) => { if (live) setSrc(u); }).catch(() => {});
    return () => { live = false; };
  }, [value, size]);
  return src
    ? <img src={src} alt={alt} width={size} height={size} className={className} style={{ background: '#fff', imageRendering: 'pixelated', maxWidth: '100%', height: 'auto' }} />
    : <div className={className} style={{ width: size, height: size, maxWidth: '100%', aspectRatio: '1', background: 'rgba(255,255,255,0.06)' }} />;
}
