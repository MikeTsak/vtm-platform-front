import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api, { formatApiError } from '../../core/api';
import { InvitationCard } from './ElysiumInvitation';

// The card is always drawn at this width for the image, so the file is the same
// whatever size the screen it was downloaded from. pixelRatio 2 doubles the pixels.
const EXPORT_WIDTH = 520;
const PIXEL_RATIO = 2;
const CDN_HOST = 'img.miketsak.gr';

// html-to-image copies every computed style onto its clone. Chrome lists the legacy
// -webkit-border-image among them, and that one always fills the box's middle, so the
// card's foil frame came out as one big gradient. Copy everything except it.
const captureOptions = () => ({
  pixelRatio: PIXEL_RATIO,
  includeStyleProperties: [...getComputedStyle(document.documentElement)].filter(n => n !== '-webkit-border-image'),
});

const nextFrames =() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

// The image CDN allows no cross-origin reads, so an uploaded background cannot be
// drawn into the picture directly. It comes through the API (Keeper / admin only).
async function inlineBackground(url) {
  const { data } = await api.get('/elysium/image', { params: { u: url }, responseType: 'blob' });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(data);
  });
}

const fileSlug = (s) => String(s || 'elysium').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'elysium';

/**
 * A button that downloads the invitation exactly as it is drawn on screen, as a PNG.
 * The card is drawn off-screen at a fixed width, then captured by the browser itself
 * (html-to-image), so fonts, gradients and the wax seal come out as they look.
 */
export default function DownloadCardButton({ invitation, eventDate, guest, barred = false, filename, action = 'download', eventId, text, className, children }) {
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const holder = useRef(null);

  const run = async () => {
    setBusy(true);
    try {
      const design = { ...(invitation?.design || {}) };
      if (design.cardImage && new URL(design.cardImage).host === CDN_HOST) design.cardImage = await inlineBackground(design.cardImage);
      setJob({ invitation: { ...invitation, design }, eventDate, guest, barred });
      await nextFrames();           // let React mount the card
      await document.fonts.ready;   // and the fonts it uses finish loading
      const node = holder.current?.firstElementChild;
      if (!node) throw new Error('The card did not render');
      node.setAttribute('data-exporting', ''); // switches off the sheen animation
      if (action === 'discord' && eventId) {
        const { toJpeg } = await import('html-to-image');
        const url = await toJpeg(node, { ...captureOptions(), quality: 0.85 });
        await api.post(`/admin/elysium/invitations/${eventId}/discord`, { image: url, text });
        alert('Invitation pushed to Discord successfully.');
      } else {
        const { toPng } = await import('html-to-image');
        const url = await toPng(node, captureOptions());
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileSlug(filename || invitation?.name)}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      alert(formatApiError(e, action === 'discord' ? 'Failed to push to Discord.' : 'The image could not be made.'));
    } finally {
      setJob(null);
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={className} disabled={busy} onClick={run}>
        {busy ? (action === 'discord' ? 'Pushing to Discord...' : 'Making the image...') : children}
      </button>
      {job && createPortal(
        <div ref={holder} aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: EXPORT_WIDTH, pointerEvents: 'none' }}>
          <InvitationCard {...job} />
        </div>,
        document.body
      )}
    </>
  );
}
