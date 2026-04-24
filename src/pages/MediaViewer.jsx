// src/pages/MediaViewer.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api';
import s from '../styles/Premonitions.module.css';

export default function MediaViewer() {
  const { id } = useParams(); // this is now the PREMONITION id
  const navigate = useNavigate();

  const [url, setUrl] = useState(null);
  const [type, setType] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate(`/login?redirect=/media/${id}`);
      return;
    }

    let blobUrl = null;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await api.get(`/premonitions/media/${id}`, {
          responseType: 'blob',
        });

        if (cancelled) return;

        const blob = res.data;
        blobUrl = URL.createObjectURL(blob);

        setUrl(blobUrl);
        setType(blob.type || '');
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError('Failed to load vision. You may not have access, or the signal was corrupted.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [id, navigate]);

  if (loading) {
    return (
      <main className={s.page}>
        <header className={s.header}>
          <h2 className={s.title}>Premonition Vision</h2>
          <p className={s.subtitle}>Reading the static...</p>
        </header>

        <div className={s.loadingBox}>
          <div className={s.glitchText}>🧠 Receiving the vision...</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={s.page}>
        <header className={s.header}>
          <h2 className={s.title}>Vision Failed</h2>
          <p className={s.subtitle}>The thread snapped.</p>
        </header>

        <div className={s.errorBox}>
          <h3 style={{ marginTop: 0 }}>💀 Signal Corrupted</h3>
          <p>{error}</p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, position: 'relative', zIndex: 2 }}>
          <button
            type="button"
            onClick={() => navigate('/premonitions')}
            className={s.refreshButton}
          >
            ← Back to Premonitions
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={s.page}>
      <header className={s.header}>
        <h2 className={s.title}>Premonition Vision</h2>
        <p className={s.subtitle}>Listen to the static...</p>
      </header>

      <article
        className={s.visionCard}
        style={{
          '--n': 1,
          maxWidth: 900,
          margin: '0 auto',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div className={s.visionHeader}>
          <span className={s.visionTag}>
            {type?.startsWith('image')
              ? 'image'
              : type?.startsWith('video')
                ? 'video'
                : type?.startsWith('audio')
                  ? 'audio'
                  : 'unknown'}
          </span>

          <time className={s.visionTime}>Vision #{id}</time>
        </div>

        <div className={s.mediaContainer}>
          {type?.startsWith('image') && (
            <img
              src={url}
              alt="Premonition"
              className={s.mediaContent}
            />
          )}

          {type?.startsWith('video') && (
            <video
              src={url}
              controls
              playsInline
              autoPlay
              className={s.mediaContent}
            />
          )}

          {type?.startsWith('audio') && (
            <div style={{ width: '100%', padding: '32px' }}>
              <audio
                src={url}
                controls
                autoPlay
                style={{ width: '100%' }}
              />
            </div>
          )}

          {!type && (
            <div className={s.mediaError}>
              Unknown media type.
            </div>
          )}
        </div>
      </article>

      <div style={{ textAlign: 'center', marginTop: 24, position: 'relative', zIndex: 2 }}>
        <button
          type="button"
          onClick={() => navigate('/premonitions')}
          className={s.refreshButton}
        >
          ← Back to Premonitions
        </button>
      </div>
    </main>
  );
}