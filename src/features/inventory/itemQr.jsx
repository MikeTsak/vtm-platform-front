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

function wrapText(ctx, text, maxW) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (!line || ctx.measureText(next).width <= maxW) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

// The QR as a PNG with the label printed under it (for downloads), so a
// saved file still says which item it is.
export async function labeledQrDataUrl(value, label, width = 1024) {
  const qr = await qrDataUrl(value, width);
  const text = String(label || '').replace(/\s+/g, ' ').trim();
  if (!text) return qr;
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = qr;
  });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const pad = Math.round(width * 0.05);
  const maxW = width - pad * 2;
  const font = (px) => `bold ${px}px Georgia, "Times New Roman", serif`;
  let size = Math.round(width * 0.07);
  let lines;
  for (;;) {
    ctx.font = font(size);
    lines = wrapText(ctx, text, maxW);
    const fits = lines.length <= 3 && lines.every((l) => ctx.measureText(l).width <= maxW);
    if (fits || size <= 24) break;
    size -= 4;
  }
  const lineH = Math.round(size * 1.25);
  canvas.width = width;
  canvas.height = width + Math.round(pad / 2) + lines.length * lineH + pad;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, width, width);
  ctx.fillStyle = '#000';
  ctx.font = font(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, width / 2, width + Math.round(pad / 2) + i * lineH));
  return canvas.toDataURL('image/png');
}

// Item name as a file name: keeps any script (Greek included), drops only
// characters a file system rejects.
export function qrFileName(name) {
  const base = String(name || '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
  return `${base || 'item'}.png`;
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
