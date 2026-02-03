// src/pages/Premonitions.jsx
import React, { useEffect, useMemo, useRef, useState, useContext, useCallback } from "react";
import { AuthCtx } from "../AuthContext";
import AdminPremonitionsTab from "../components/admin/AdminPremonitionsTab";
import s from "../styles/Premonitions.module.css";

/**
 * API base helper
 */
const RAW_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL)) ||
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_API_URL ||
  (window.location.port === "3000" ? "http://localhost:3001" : "");

const API_BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, "") : "";
const AUTH_TOKEN_KEY = "token";

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
    return /\/api\/premonitions\/media\/\d+/.test(rel);
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
  
  // Cache allows us to keep URLs active while navigating the list, 
  // but we won't load them all at once anymore.
  const objectUrlCache = useRef(new Map());
  const createdUrls = useRef([]);
  const token = useMemo(() => localStorage.getItem(AUTH_TOKEN_KEY) || "", []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    const urls = createdUrls.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.length = 0;
      objectUrlCache.current.clear();
    };
  }, []);

  const parseJsonSafely = async (r) => {
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) {
      const text = await r.text();
      throw new Error(`Unexpected response: ${r.status}`);
    }
    return r.json();
  };

  const fetchMine = async (signal) => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(apiJoin("/api/premonitions/mine"), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal,
      });
      if (!r.ok) {
        const errJson = await parseJsonSafely(r).catch(() => ({}));
        throw new Error(errJson.error || errJson.message || `HTTP ${r.status}`);
      }
      const j = await parseJsonSafely(r);
      setItems(Array.isArray(j.premonitions) ? j.premonitions : []);
    } catch (e) {
      if (e.name === 'AbortError') return;
      setErr(e.message || "Failed to load premonitions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchMine(abortController.signal);
    return () => abortController.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    // Clear cache on manual refresh
    createdUrls.current.forEach((u) => URL.revokeObjectURL(u));
    createdUrls.current.length = 0;
    objectUrlCache.current.clear();
    await fetchMine();
  };

  // Shared fetcher passed to children
  const fetchMediaBlob = useCallback(async (contentUrl, itemId) => {
    // Return cached if exists
    if (objectUrlCache.current.has(itemId)) {
      return objectUrlCache.current.get(itemId);
    }

    const url = qualifyUrl(contentUrl);
    const r = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!r.ok) throw new Error("Failed to load media");
    
    const blob = await r.blob();
    const objUrl = URL.createObjectURL(blob);
    
    objectUrlCache.current.set(itemId, objUrl);
    createdUrls.current.push(objUrl);
    return objUrl;
  }, [token]);

  if (loading) {
    return (
      <main className={s.page}>
        <header className={s.header}>
          <h2 className={s.title}>Your Premonitions</h2>
          <p className={s.subtitle}>Listen to the static...</p>
        </header>
        <div className={s.loadingBox}>Listening for echoes…</div>
      </main>
    );
  }

  return (
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
            fetchMediaBlob={fetchMediaBlob}
          />
        ))}
      </div>
    </main>
  );
}

// === Individual Item with Lazy Loading ===
function PremonitionItem({ item, index, fetchMediaBlob }) {
  const [src, setSrc] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | loaded | error
  const cardRef = useRef(null);

  const when = useMemo(() => {
    try { return new Date(item.created_at).toLocaleString(); } 
    catch { return item.created_at || ""; }
  }, [item.created_at]);

  const kind = item.content_type;
  const isMedia = (kind === "image" || kind === "video") && item.content_url;
  const isDbMedia = isMedia && isDbMediaUrl(item.content_url);

  // Trigger load logic
  const loadMedia = useCallback(async () => {
    if (!isDbMedia || status === "loaded" || status === "loading") return;

    setStatus("loading");
    try {
      const url = await fetchMediaBlob(item.content_url, item.id);
      setSrc(url);
      setStatus("loaded");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }, [isDbMedia, item.content_url, item.id, status, fetchMediaBlob]);

  // Effect: Lazy Load Images (Load when scrolled into view)
  useEffect(() => {
    if (!isDbMedia || kind !== "image" || status !== "idle") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMedia();
          observer.disconnect();
        }
      },
      { threshold: 0.1 } // Load when 10% visible
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [kind, isDbMedia, status, loadMedia]);

  // Handle external links (non-DB)
  useEffect(() => {
    if (isMedia && !isDbMedia) {
      setSrc(qualifyUrl(item.content_url));
      setStatus("loaded");
    }
  }, [isMedia, isDbMedia, item.content_url]);

  return (
    <article 
      ref={cardRef} 
      className={s.visionCard} 
      style={{ '--n': index + 1 }}
    >
      <div className={s.visionHeader}>
        <span className={s.visionTag}>{kind}</span>
        <time className={s.visionTime}>{when}</time>
      </div>

      {kind === "text" && (
        <div className={s.visionBody}>
          <div className={s.visionText}>
            {(item.content_text || "").split("\n").map((ln, i) => (
              <p key={i}>{ln}</p>
            ))}
          </div>
        </div>
      )}

      {isMedia && (
        <div className={s.mediaContainer}>
          {/* IMAGE HANDLING */}
          {kind === "image" && (
            <>
              {status === "loaded" && src ? (
                <img src={src} alt="Premonition" className={s.mediaContent} />
              ) : status === "error" ? (
                <div className={s.mediaError}>Signal Corrupted</div>
              ) : (
                <div className={s.mediaLoading}>
                  <div className={s.glitchText}>Receiving Image...</div>
                </div>
              )}
            </>
          )}

          {/* VIDEO HANDLING - CLICK TO LOAD */}
          {kind === "video" && (
            <>
              {status === "loaded" && src ? (
                <video src={src} controls playsInline autoPlay className={s.mediaContent} />
              ) : status === "error" ? (
                <div className={s.mediaError}>Video Signal Lost</div>
              ) : (
                // Click placeholder to prevent massive auto-download
                <div 
                  className={s.videoPlaceholder} 
                  onClick={loadMedia}
                  style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    padding: '2rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px dashed #444'
                  }}
                >
                  {status === "loading" ? (
                     <div className={s.mediaLoading}>Downloading Stream...</div>
                  ) : (
                    <>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>▶</div>
                      <div>Tap to Decode Video</div>
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>(Saves Bandwidth)</div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* External Link Button */}
      {item.content_url && !isDbMedia && kind !== "text" && (
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