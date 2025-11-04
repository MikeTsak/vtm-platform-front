// src/pages/Premonitions.jsx
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { AuthCtx } from "../AuthContext";
import AdminPremonitionsTab from "../components/admin/AdminPremonitionsTab";
import s from "../styles/Premonitions.module.css"; // The signal... it's coming from here!

/**
 * API base:
 * - prefer Vite style
 * - then CRA style (BASE)
 * - then CRA style (URL) -> may already have /api
 * - then localhost fallback
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

// build a URL without double /api
function apiJoin(path) {
  if (!API_BASE) return path; // relative
  if (API_BASE.endsWith("/api") && path.startsWith("/api/")) {
    // base: https://.../api  + /api/foo  -> https://.../api/foo
    return `${API_BASE}${path.slice(4)}`;
  }
  return `${API_BASE}${path}`;
}

// --- Helper functions are unchanged-ish ---
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
  // for things like /api/premonitions/media/5
  return apiJoin(u);
};

// --- ---

export default function Premonitions() {
  const { user } = useContext(AuthCtx);
  const isAdmin = user?.role === "admin" || user?.permission_level === "admin";

  // ✅ Admin composer/manager
  if (isAdmin) {
    return (
      // CHANGED: Χρησιμοποιούμε s.adminPage αντί για s.page για τους admins
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

  // === Player viewer ===
  return <PlayerPremonitions />;
}

// === Player viewer ===
function PlayerPremonitions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [resolving, setResolving] = useState(false);

  const objectUrlCache = useRef(new Map());
  const createdUrls = useRef([]);
  const token = useMemo(() => localStorage.getItem(AUTH_TOKEN_KEY) || "", []);

  // cleanup object URLs
  useEffect(() => {
    const cache = objectUrlCache.current;
    const urls = createdUrls.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.length = 0;
      cache.clear();
    };
  }, []);

  const parseJsonSafely = async (r) => {
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) {
      const text = await r.text();
      if (r.status === 401 || r.status === 403) {
        throw new Error("Not authorized. Please log in again.");
      }
      throw new Error(
        `Unexpected response from API (status ${r.status}).${
          text?.startsWith("<!DOCTYPE") ? " Check API_BASE/proxy config." : ""
        }`
      );
    }
    return r.json();
  };

  const fetchMine = async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(apiJoin("/api/premonitions/mine"), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!r.ok) {
        const errJson = await parseJsonSafely(r).catch((e) => {
          throw e;
        });
        const msg = errJson?.error || errJson?.message || `HTTP ${r.status}`;
        throw new Error(msg);
      }
      const j = await parseJsonSafely(r);
      setItems(Array.isArray(j.premonitions) ? j.premonitions : []);
    } catch (e) {
      setErr(e.message || "Failed to load premonitions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveSrc = async (p) => {
    if (!p?.content_url) return null;
    // external http(s) links -> just return
    if (!isDbMediaUrl(p.content_url)) return qualifyUrl(p.content_url);
    // cache
    if (objectUrlCache.current.has(p.id)) return objectUrlCache.current.get(p.id);

    const url = qualifyUrl(p.content_url); // uses apiJoin
    const r = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!r.ok) throw new Error(`Media (${p.id}) failed (${r.status})`);
    const blob = await r.blob();
    const objUrl = URL.createObjectURL(blob);
    objectUrlCache.current.set(p.id, objUrl);
    createdUrls.current.push(objUrl);
    return objUrl;
  };

  const resolveAllMedia = async () => {
    setResolving(true);
    try {
      await Promise.all(
        items.map(async (p) => {
          if (p.content_type === "image" || p.content_type === "video") {
            try {
              if (isDbMediaUrl(p.content_url)) {
                await resolveSrc(p);
              }
            } catch {
              objectUrlCache.current.set(p.id, null);
            }
          }
        })
      );
      setItems((prev) => [...prev]); // trigger re-render
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    if (!loading && items.length) resolveAllMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleRefresh = async () => {
    createdUrls.current.forEach((u) => URL.revokeObjectURL(u));
    createdUrls.current.length = 0;
    objectUrlCache.current.clear();
    await fetchMine();
  };

  if (loading) {
    return (
      // CHANGED: s.playerPage -> s.page (Αυτό ενεργοποιεί όλο το glitchy background)
      <main className={s.page}>
        <header className={s.header}>
          {/* CHANGED: Προστέθηκε το s.title για το σωστό στυλ */}
          <h2 className={s.title}>Your Premonitions</h2>
          {/* CHANGED: Προστέθηκε το s.subtitle που έλειπε */}
          <p className={s.subtitle}>Listen to the static...</p>
        </header>
        {/* CHANGED: Χρησιμοποιούμε το s.loadingBox για το μήνυμα φόρτωσης */}
        <div className={s.loadingBox}>Listening for echoes…</div>
      </main>
    );
  }

  return (
    // CHANGED: s.playerPage -> s.page (Το βασικό background)
    <main className={s.page}>
      <header className={s.header}>
        {/* CHANGED: Προστέθηκε το s.title */}
        <h2 className={s.title}>Your Premonitions</h2>
        {/* CHANGED: Προστέθηκε το s.subtitle που έλειπε και έχει το glitch animation */}
        <p className={s.subtitle}>Listen to the static...</p>
        <button
          type="button"
          onClick={handleRefresh}
          className={s.refreshButton}
          disabled={loading || resolving} // CHANGED: Έκανα disable το κουμπί κατά τη φόρτωση
        >
          Refresh
        </button>
      </header>

      {/* CHANGED: s.error -> s.errorBox */}
      {err && <div className={s.errorBox}>{err}</div>}

      {/* CHANGED: s.empty -> s.loadingBox (Το s.loadingBox ταιριάζει αισθητικά) */}
      {!items.length && !err && (
        <div className={s.loadingBox}>
          No visions yet. That’s… suspicious.
        </div>
      )}

      {/* CHANGED: s.list -> s.visionGrid (Αυτό ενεργοποιεί το grid layout και τις κλίσεις) */}
      <div className={s.visionGrid}>
        {items.map((it, index) => ( // Πρόσθεσα 'index' για το staggering
          <PremonitionItem
            key={it.id}
            item={it}
            index={index} // Περνάμε το index στο component
            objectUrlCache={objectUrlCache.current}
            qualifyingFn={qualifyUrl}
          />
        ))}
      </div>

      {/* CHANGED: s.resolving -> s.loadingBox (Το s.loadingBox ταιριάζει αισθητικά) */}
      {resolving && (
        <div className={s.loadingBox} style={{ marginTop: "1rem" }}>
          Resolving media…
        </div>
      )}
    </main>
  );
}

function PremonitionItem({ item, objectUrlCache, qualifyingFn, index }) { // Προστέθηκε το 'index'
  const when = (() => {
    try {
      return new Date(item.created_at).toLocaleString();
    } catch {
      return item.created_at || "";
    }
  })();
  const kind = item.content_type;

  let src = null;
  if ((kind === "image" || kind === "video") && item.content_url) {
    if (objectUrlCache.has(item.id)) {
      src = objectUrlCache.get(item.id);
    } else if (isDbMediaUrl(item.content_url)) {
      src = undefined; // undefined = still resolving (προκαλεί το "Receiving transmission...")
    } else {
      src = qualifyUrl(item.content_url); // direct external link
    }
  }

  // Handle external links that are NOT db media
  const externalUrl =
    item.content_url && !isDbMediaUrl(item.content_url)
      ? qualifyUrl(item.content_url)
      : null;

  return (
    // Εφαρμόζουμε το CSS variable '--n' για το animation-delay
    <article className={s.visionCard} style={{ '--n': index + 1 }}>
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

      {(kind === "image" || kind === "video") && item.content_url && (
        <div className={s.mediaContainer}>
          {src ? ( // Αν το src έχει τιμή (είτε object URL είτε external link)
            kind === "image" ? (
              <img src={src} alt="Premonition" className={s.mediaContent} />
            ) : (
              <video src={src} controls playsInline className={s.mediaContent} />
            )
          ) : src === undefined ? ( // src === undefined σημαίνει "is resolving"
            <div className={s.mediaLoading}>Receiving transmission...</div>
          ) : ( // src === null σημαίνει "failed to resolve"
            <div className={s.mediaError}>Signal lost. The memory fades.</div>
          )}
        </div>
      )}

      {/* Αυτό εμφανίζεται ΜΟΝΟ αν είναι external link ΚΑΙ ΔΕΝ είναι text post */}
      {externalUrl && kind !== "text" && (
        <div className={s.visionBody}>
          <a
            href={externalUrl}
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