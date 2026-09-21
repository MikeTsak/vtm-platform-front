// src/pages/MediaViewer.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import api from '../core/api';
import { AuthCtx } from '../core/AuthContext';
import s from '../styles/Premonitions.module.css';
import { Skeleton } from 'boneyard-js/react';
import FaGlyph from '../ui/FaGlyph';

export default function MediaViewer() {
  const { id } = useParams(); // this is now the PREMONITION id
  const navigate = useNavigate();
  // Session lives in an httpOnly cookie, so we can't check for a token in JS
  // directly, wait for AuthProvider's /auth/me check to resolve instead.
  const { user, loading: authLoading } = useContext(AuthCtx);

  const [url, setUrl] = useState(null);
  const [type, setType] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate(`/login?redirect=/media/${id}`);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await api.get(`/premonitions/media/${id}?info=1`);

        if (cancelled) return;

        const mediaUrl = res.data?.url;
        let mime = res.data?.mime || '';
        if (!mime && mediaUrl) {
          if (/\.(jpe?g|png|gif|webp|svg)($|\?)/i.test(mediaUrl)) mime = 'image/jpeg';
          else if (/\.(mp4|webm|mov|ogg)($|\?)/i.test(mediaUrl)) mime = 'video/mp4';
          else if (/\.(mp3|wav|ogg)($|\?)/i.test(mediaUrl)) mime = 'audio/mpeg';
        }

        if (!mediaUrl) {
          setError('Vision not found or signal was corrupted.');
          return;
        }

        setUrl(mediaUrl);
        setType(mime);
        setWarnings(Array.isArray(res.data?.warnings) ? res.data.warnings : []);
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
    };
  }, [id, navigate, user, authLoading]);

  if (error) {
    return (
      <main className={s.page}>
        <header className={s.header}>
          <h2 className={s.title}>Vision Failed</h2>
          <p className={s.subtitle}>The thread snapped.</p>
        </header>

        <div className={s.errorBox}>
          <h3 style={{ marginTop: 0 }}>Signal Corrupted</h3>
          <p>{error}</p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, position: 'relative', zIndex: 2 }}>
          <button
            type="button"
            onClick={() => navigate('/premonitions')}
            className={s.refreshButton}
          >
            Back to Premonitions
          </button>
        </div>
      </main>
    );
  }

  return (
    <Skeleton loading={loading} name="media-viewer">
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
          {!revealed ? (
            <div className={s.warningGate}>
              <div className={s.warningHeaderRow}>
                <FaGlyph name="fa-triangle-exclamation" size={22} style={{ color: '#ff5c77' }} />
                <span className={s.warningTitle}>Mature Content Warning</span>
              </div>
              <div className={s.warningSub}>
                {warnings.length > 0
                  ? 'This vision has been flagged with the following warnings:'
                  : 'This vision may contain intense or graphic material'}
              </div>

              {warnings.length > 0 && (
                <div className={s.warningBadgesRow}>
                  {warnings.map((warn, i) => (
                    <span key={i} className={s.warningBadgeChip}>
                      {warn}
                    </span>
                  ))}
                </div>
              )}

              <button
                type="button"
                className={s.revealBtn}
                onClick={() => setRevealed(true)}
              >
                <FaGlyph name="fa-eye" size={16} />
                <span>Click to Reveal {type?.startsWith('video') ? 'Video' : 'Vision'}</span>
              </button>
            </div>
          ) : (
            <>
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

              <div style={{ textAlign: 'right', marginTop: 8, width: '100%' }}>
                <button
                  type="button"
                  className={s.concealBtn}
                  onClick={() => setRevealed(false)}
                >
                  <FaGlyph name="fa-eye-slash" size={12} />
                  <span>Conceal Vision</span>
                </button>
              </div>
            </>
          )}
        </div>
      </article>

      <div style={{ textAlign: 'center', marginTop: 24, position: 'relative', zIndex: 2 }}>
        <button
          type="button"
          onClick={() => navigate('/premonitions')}
          className={s.refreshButton}
        >
          Back to Premonitions
        </button>
      </div>
      </main>
    </Skeleton>
  );
}