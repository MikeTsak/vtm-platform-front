import React, { useEffect, useMemo, useRef, useState, useContext, useCallback } from "react";
import { AuthCtx } from "../../core/AuthContext";
import AdminPremonitionsTab from "../admin/AdminPremonitionsTab";
import { formatAthensDateTime } from "../../utils/dateFormatter";
import s from "../../styles/Premonitions.module.css";
import { Skeleton } from "boneyard-js/react";
import api, { formatApiError } from "../../core/api";
import FaGlyph from "../../ui/FaGlyph";

/**
 * API base helper
 */
const RAW_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL)) ||
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  "";

const API_BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, "") : "";

function apiJoin(path) {
  if (!API_BASE) return path;
  if (API_BASE.endsWith("/api") && path.startsWith("/api/")) {
    return `${API_BASE}${path.slice(4)}`;
  }
  return `${API_BASE}${path}`;
}

const isDbMediaUrl = (u) => {
  if (!u) return false;
  try {
    const rel = u.startsWith("/") ? u : new URL(u, window.location.origin).pathname;
    return /(?:\/api)?\/premonitions\/media\/\d+/.test(rel);
  } catch {
    return false;
  }
};

const qualifyUrl = (u) => {
  if (!u) return u;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return apiJoin(u);
};

// --- Main Component ---

export default function Premonitions() {
  const { user } = useContext(AuthCtx);
  const isAdmin = user?.role === "admin" || user?.permission_level === "admin";

  if (isAdmin) {
    return (
      <main className={s.adminPage}>
        <header style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Premonitions (Admin)</h2>
          <div style={{ color: "#aab", fontSize: 14 }}>
            Upload image/video or write text, then send to selected Malkavians or all.
          </div>
        </header>
        <AdminPremonitionsTab />
      </main>
    );
  }

  return <PlayerPremonitions />;
}

// === Player viewer ===
function PlayerPremonitions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const fetchMine = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/premonitions/mine");
      setItems(Array.isArray(res.data?.premonitions) ? res.data.premonitions : []);
    } catch (e) {
      setErr(formatApiError(e, "Failed to load premonitions"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMine();
  }, []);

  const handleRefresh = async () => {
    await fetchMine();
  };

  return (
    <Skeleton loading={loading} name="premonitions-page">
      <main className={s.page}>
        <header className={s.header}>
          <h2 className={s.title}>Your Premonitions</h2>
          <p className={s.subtitle}>Listen to the static...</p>
          <button
            type="button"
            onClick={handleRefresh}
            className={s.refreshButton}
            disabled={loading}
          >
            Refresh
          </button>
        </header>

        {err && <div className={s.errorBox}>{err}</div>}

        {!items.length && !err && (
          <div className={s.loadingBox}>
            No visions yet. That’s… suspicious.
          </div>
        )}

        <div className={s.visionGrid}>
          {items.map((it, index) => (
            <PremonitionItem
              key={it.id}
              item={it}
              index={index}
            />
          ))}
        </div>
      </main>
    </Skeleton>
  );
}

// === Individual Item with Direct Streaming / Loading ===
function PremonitionItem({ item, index }) {
  const [revealed, setRevealed] = useState(false);
  const [imgStatus, setImgStatus] = useState("loading"); // loading | loaded | error
  const [videoStatus, setVideoStatus] = useState("idle"); // idle | loading | playing | error
  const [videoErrorDetails, setVideoErrorDetails] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const imgRef = useRef(null);

  const when = useMemo(() => {
    try { return formatAthensDateTime(item.created_at); }
    catch { return item.created_at || ""; }
  }, [item.created_at]);

  const kind = item.content_type;
  const isMedia = (kind === "image" || kind === "video") && !!item.content_url;
  const mediaUrl = isMedia ? qualifyUrl(item.content_url) : null;
  const [resolvedUrl, setResolvedUrl] = useState(() => {
    if (!item.content_url) return null;
    if (item.content_url.startsWith("http://") || item.content_url.startsWith("https://")) {
      return item.content_url;
    }
    return qualifyUrl(item.content_url);
  });
  const warningsList = Array.isArray(item.warnings) ? item.warnings : [];
  const hasWarnings = warningsList.length > 0;

  // Pre-resolve relative API media URLs to direct CDN URLs using authenticated session
  useEffect(() => {
    let cancelled = false;
    if (isMedia && item.content_url && !item.content_url.startsWith("http")) {
      let endpoint = item.content_url;
      if (endpoint.startsWith("/api/")) endpoint = endpoint.slice(4);
      api
        .get(endpoint + (endpoint.includes("?") ? "&info=1" : "?info=1"))
        .then((res) => {
          if (!cancelled && res.data?.url) {
            setResolvedUrl(res.data.url);
          }
        })
        .catch(() => {
          // Keep qualifyUrl fallback
        });
    }
    return () => {
      cancelled = true;
    };
  }, [isMedia, item.content_url]);

  // Active preload for images
  useEffect(() => {
    const activeUrl = resolvedUrl || mediaUrl;
    if (revealed && kind === "image" && activeUrl) {
      setImgStatus("loading");
      const img = new Image();
      img.src = activeUrl;
      if (img.complete) {
        if (img.naturalWidth > 0) {
          setImgStatus("loaded");
        } else {
          setImgStatus("error");
        }
      } else {
        img.onload = () => setImgStatus("loaded");
        img.onerror = () => setImgStatus("error");
      }
    }
  }, [revealed, kind, resolvedUrl, mediaUrl]);

  const handleVideoLoadStart = () => {
    setIsBuffering(true);
  };

  const handleVideoWaiting = () => {
    setIsBuffering(true);
  };

  const handleVideoPlaying = () => {
    setIsBuffering(false);
    setVideoStatus("playing");
  };

  const handleVideoCanPlay = () => {
    setIsBuffering(false);
    if (videoStatus !== "playing") {
      setVideoStatus("playing");
    }
  };

  const handleVideoError = (e) => {
    setIsBuffering(false);
    const mediaErr = e?.currentTarget?.error;
    let code = mediaErr?.code || 0;
    let reason = "The video signal could not be received";

    if (code === 1) {
      reason = "Video reception was aborted";
    } else if (code === 2) {
      reason = "Network error: Connection was interrupted while receiving stream. Please check your internet connection";
    } else if (code === 3) {
      reason = "Decode error: The video signal is corrupted or cannot be decoded";
    } else if (code === 4) {
      reason = "Video format or codec unsupported by this browser: e.g. HEVC or QuickTime format";
    } else if (mediaErr?.message) {
      reason = mediaErr.message;
    }

    setVideoErrorDetails({ code, reason });
    setVideoStatus("error");
  };

  const handleRetryVideo = () => {
    setVideoStatus("loading");
    setVideoErrorDetails(null);
    setIsBuffering(true);
    setRetryKey((k) => k + 1);
  };

  return (
    <article 
      className={s.visionCard} 
      style={{ '--n': index + 1 }}
    >
      <div className={s.visionHeader}>
        <span className={s.visionTag}>{kind}</span>
        <time className={s.visionTime}>{when}</time>
      </div>

      {/* TEXT CONTENT HANDLING */}
      {kind === "text" && (
        <div className={s.visionBody}>
          {hasWarnings && !revealed ? (
            <div className={s.warningGate}>
              <div className={s.warningHeaderRow}>
                <FaGlyph name="fa-triangle-exclamation" size={18} style={{ color: "#ff5c77" }} />
                <span className={s.warningTitle}>Mature Content Warning</span>
              </div>
              <div className={s.warningSub}>
                This vision has been flagged with the following warnings:
              </div>
              <div className={s.warningBadgesRow}>
                {warningsList.map((warn, i) => (
                  <span key={i} className={s.warningBadgeChip}>
                    {warn}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className={s.revealBtn}
                onClick={() => setRevealed(true)}
              >
                <FaGlyph name="fa-eye" size={15} />
                <span>Click to Reveal Text</span>
              </button>
            </div>
          ) : (
            <>
              <div className={s.visionText}>
                {(item.content_text || "").split("\n").map((ln, i) => (
                  <p key={i}>{ln}</p>
                ))}
              </div>
              {hasWarnings && revealed && (
                <div style={{ textAlign: "right", marginTop: 4 }}>
                  <button
                    type="button"
                    className={s.concealBtn}
                    onClick={() => setRevealed(false)}
                  >
                    <FaGlyph name="fa-eye-slash" size={12} />
                    <span>Conceal Vision</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MEDIA CONTENT HANDLING */}
      {isMedia && (
        <div className={s.mediaContainer}>
          {!revealed ? (
            <div className={s.warningGate}>
              <div className={s.warningHeaderRow}>
                <FaGlyph name="fa-triangle-exclamation" size={18} style={{ color: "#ff5c77" }} />
                <span className={s.warningTitle}>Mature Content Warning</span>
              </div>
              <div className={s.warningSub}>
                {hasWarnings
                  ? "This vision has been flagged with the following warnings:"
                  : "This vision may contain intense or graphic material"}
              </div>

              {hasWarnings && (
                <div className={s.warningBadgesRow}>
                  {warningsList.map((warn, i) => (
                    <span key={i} className={s.warningBadgeChip}>
                      {warn}
                    </span>
                  ))}
                </div>
              )}

              <button
                type="button"
                className={s.revealBtn}
                onClick={() => {
                  setRevealed(true);
                  if (kind === "video") {
                    setVideoStatus("loading");
                    setVideoErrorDetails(null);
                    setIsBuffering(true);
                  }
                }}
              >
                <FaGlyph name="fa-eye" size={15} />
                <span>Click to Reveal {kind === "video" ? "Video" : "Image"}</span>
              </button>
            </div>
          ) : (
            <>
              {/* IMAGE HANDLING */}
              {kind === "image" && (resolvedUrl || mediaUrl) && (
                <>
                  {imgStatus === "error" ? (
                    <div className={s.videoErrorContainer}>
                      <div className={s.mediaError}>
                        <div className={s.errorHeading}>
                          <FaGlyph name="fa-triangle-exclamation" size={16} />
                          <span>Signal Corrupted</span>
                        </div>
                        <div className={s.errorReason}>
                          Image signal could not be displayed by browser
                        </div>
                      </div>
                      <div className={s.errorActionsRow}>
                        <a
                          href={resolvedUrl || mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={s.directMediaLink}
                        >
                          <FaGlyph name="fa-arrow-up-right-from-square" size={13} />
                          <span>Open Direct Image</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <>
                      {imgStatus !== "loaded" && (
                        <div className={s.mediaLoading}>
                          <div className={s.glitchText}>Receiving Image...</div>
                        </div>
                      )}
                      <img
                        ref={imgRef}
                        src={resolvedUrl || mediaUrl}
                        alt="Premonition"
                        className={s.mediaContent}
                        style={
                          imgStatus !== "loaded"
                            ? { opacity: 0, position: "absolute", width: "100%", pointerEvents: "none" }
                            : undefined
                        }
                        onLoad={() => setImgStatus("loaded")}
                        onError={() => setImgStatus("error")}
                      />
                    </>
                  )}
                </>
              )}

              {/* VIDEO HANDLING */}
              {kind === "video" && (resolvedUrl || mediaUrl) && (
                <>
                  {videoStatus === "error" ? (
                    <div className={s.videoErrorContainer}>
                      <div className={s.mediaError}>
                        <div className={s.errorHeading}>
                          <FaGlyph name="fa-triangle-exclamation" size={16} />
                          <span>Video Signal Lost</span>
                        </div>
                        <div className={s.errorReason}>
                          {videoErrorDetails?.reason || "Video signal interrupted or unavailable"}
                        </div>
                      </div>

                      <div className={s.errorActionsRow}>
                        <button
                          type="button"
                          className={s.retryBtn}
                          onClick={handleRetryVideo}
                        >
                          <FaGlyph name="fa-rotate-right" size={13} />
                          <span>Retry Signal</span>
                        </button>

                        <a
                          href={resolvedUrl || mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={s.directMediaLink}
                        >
                          <FaGlyph name="fa-arrow-up-right-from-square" size={13} />
                          <span>Open Direct Signal</span>
                        </a>

                        <a
                          href={resolvedUrl || mediaUrl}
                          download
                          className={s.directMediaLink}
                        >
                          <FaGlyph name="fa-download" size={13} />
                          <span>Download Vision</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className={s.videoWrapper}>
                      {isBuffering && (
                        <div className={s.videoBufferingOverlay}>
                          <span className={s.glitchText}>Receiving Video Signal...</span>
                        </div>
                      )}
                      <video
                        key={retryKey}
                        src={resolvedUrl || mediaUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className={s.mediaContent}
                        onLoadStart={handleVideoLoadStart}
                        onWaiting={handleVideoWaiting}
                        onPlaying={handleVideoPlaying}
                        onCanPlay={handleVideoCanPlay}
                        onError={handleVideoError}
                      />
                    </div>
                  )}
                </>
              )}

              <div style={{ textAlign: "right", marginTop: 4, width: "100%" }}>
                <button
                  type="button"
                  className={s.concealBtn}
                  onClick={() => {
                    setRevealed(false);
                    if (kind === "video") {
                      setVideoStatus("idle");
                      setVideoErrorDetails(null);
                      setIsBuffering(false);
                    }
                  }}
                >
                  <FaGlyph name="fa-eye-slash" size={12} />
                  <span>Conceal Vision</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* External Link Button (only if not image/video media) */}
      {item.content_url && kind !== "image" && kind !== "video" && (
        <div className={s.visionBody}>
          <a
            href={qualifyUrl(item.content_url)}
            target="_blank"
            rel="noreferrer"
            className={s.externalLink}
          >
            Follow the thread...
          </a>
        </div>
      )}
    </article>
  );
}