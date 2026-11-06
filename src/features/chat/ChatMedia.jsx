// A chat_media attachment (routes/chat.js /chat/media): image, voice clip or
// video, fetched through the access-checked /info route. Shared by SchreckNet
// (ChatSystem) and Surface Web (EmailSystem), which store attachments alike.
import React, { useState, useEffect } from 'react';
import { Skeleton } from 'boneyard-js/react';
import api from '../../core/api';

export default function ChatMedia({ attachmentId, thumb = false }) {
  const [prevId, setPrevId] = useState(attachmentId);
  const [mediaInfo, setMediaInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (attachmentId !== prevId) {
    setPrevId(attachmentId);
    setMediaInfo(null);
    setLoading(true);
    setError(false);
  }

  useEffect(() => {
    let active = true;
    let urlToRevoke = null;

    api.get(`/chat/media/${attachmentId}/info`)
      .then(async (response) => {
        if (!active) return;
        const info = response.data;
        if (info.url) {
          setMediaInfo({ url: info.url, mime: info.mime });
          setLoading(false);
        } else {
          // Fallback to fetch blob
          try {
            const blobRes = await api.get(`/chat/media/${attachmentId}`, { responseType: 'blob' });
            if (!active) return;
            urlToRevoke = URL.createObjectURL(blobRes.data);
            setMediaInfo({ url: urlToRevoke, mime: info.mime || blobRes.data.type });
            setLoading(false);
          } catch (e) {
            if (!active) return;
            setError(true);
            setLoading(false);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load media info", err);
        if (!active) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [attachmentId]);

  if (thumb) {
    if (loading) return <div className="w-full h-full bg-surface-variant/30 animate-pulse" />;
    if (error) return <div className="w-full h-full flex items-center justify-center text-error"><span className="material-symbols-outlined text-[22px]">broken_image</span></div>;
    const open = () => window.open(mediaInfo?.url, '_blank');
    if (mediaInfo?.mime?.startsWith('audio/')) {
      return <button type="button" onClick={open} aria-label="Open audio" className="w-full h-full flex items-center justify-center text-on-surface-variant"><span className="material-symbols-outlined text-[28px]">graphic_eq</span></button>;
    }
    if (mediaInfo?.mime?.startsWith('video/')) {
      return <video src={mediaInfo.url} preload="metadata" muted playsInline onClick={open} className="w-full h-full object-cover cursor-pointer" />;
    }
    return <img src={mediaInfo?.url} alt="Attachment" loading="lazy" onClick={open} className="w-full h-full object-cover cursor-pointer" />;
  }

  if (loading) return (
    <Skeleton name="chat-media-loader" loading={true}>
      <div className="w-48 h-48 max-w-full rounded bg-surface-variant/30 animate-pulse" />
    </Skeleton>
  );
  if (error) return <div className="p-4 bg-error/20 text-error rounded-lg text-sm text-center border border-dashed border-error">Media failed to load</div>;

  if (mediaInfo?.mime?.startsWith('video/')) {
    return (
      <video
        controls
        src={mediaInfo.url}
        className="w-auto h-auto max-w-full max-h-[300px] object-contain rounded block"
      />
    );
  }
  if (mediaInfo?.mime?.startsWith('audio/')) {
    return (
      <audio
        controls
        src={mediaInfo.url}
        className="w-full max-w-[300px] rounded block"
      />
    );
  }

  return (
    <img
      src={mediaInfo?.url}
      alt="Attachment"
      className="w-auto h-auto max-w-full max-h-[300px] object-contain rounded cursor-pointer block"
      onClick={() => window.open(mediaInfo?.url, '_blank')}
    />
  );
}
