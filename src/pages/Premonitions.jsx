// src/pages/Premonitions.jsx
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { AuthCtx } from "../AuthContext";
import AdminPremonitionsTab from "../components/admin/AdminPremonitionsTab";
import s from "../styles/Premonitions.module.css"; // The signal... it's coming from here!

/** API base: dev defaults to :3001 unless REACT_APP_API_BASE is set */
const devDefault = window.location.port === "3000" ? "http://localhost:3001" : "";
const API_BASE = (process.env.REACT_APP_API_BASE || devDefault).replace(/\/$/, "");
const AUTH_TOKEN_KEY = "token";

// --- Helper functions are unchanged ---
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
  return `${API_BASE}${u}`;
};
// --- ---

export default function Premonitions() {
  const { user } = useContext(AuthCtx);
  const isAdmin = user?.role === "admin" || user?.permission_level === "admin";

  // ✅ Admin composer/manager (Sanity is for them. Let them have it.)
  if (isAdmin) {
    return (
      <main className={s.adminPage}> {/* A clean room. How boring. */}
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

  // === Player viewer (The REALITY) ===
  return <PlayerPremonitions />;
}

function PlayerPremonitions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [resolving, setResolving] = useState(false);

  const objectUrlCache = useRef(new Map());
  const createdUrls = useRef([]);
  const token = useMemo(() => localStorage.getItem(AUTH_TOKEN_KEY) || "", []);

  // --- All logic hooks are unchanged ---
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
      const r = await fetch(`${API_BASE}/api/premonitions/mine`, {
        headers: { Authorization: `Bearer ${token}` },
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
    if (!isDbMediaUrl(p.content_url)) return qualifyUrl(p.content_url);
    if (objectUrlCache.current.has(p.id)) return objectUrlCache.current.get(p.id);
    const url = qualifyUrl(p.content_url);
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
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
              objectUrlCache.current.set(p.id, null); // Cache null on failure
            }
          }
        })
      );
      setItems((prev) => [...prev]); // re-render after resolving
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
    createdUrls.current = [];
    objectUrlCache.current.clear();
    await fetchMine();
  };
  // --- End of unchanged logic ---

  return (
    <main className={s.page}> {/* The canvas of madness */}
      <header className={s.header}>
        <h2 className={s.title}>The Cobweb</h2>
        <h3 className={s.subtitle}>Listen to the static...</h3>
        <button
          onClick={handleRefresh}
          className={s.refreshButton}
          disabled={loading || resolving}
        >
          {loading ? "Receiving..." : resolving ? "Deciphering..." : "Refresh Signal"}
        </button>
      </header>

      {err && <div className={s.errorBox}>⚠️ {err}</div>}
      
      {loading && <div className={s.loadingBox}>Tuning the frequency...</div>}

      {!loading && !items.length && !err && (
        <div className={s.loadingBox}>The network is quiet. Too quiet.</div>
      )}

      <div className={s.visionGrid}>
        {items.map((p) => {
          const isDbUrl = isDbMediaUrl(p.content_url);
          const cachedSrc = objectUrlCache.current.get(p.id);
          const srcProp = isDbUrl ? cachedSrc : qualifyUrl(p.content_url);
          return <PremonitionCard key={p.id} item={p} src={srcProp} />;
        })}
      </div>
    </main>
  );
}

function PremonitionCard({ item, src }) {
  const when = (() => {
    try {
      return new Date(item.created_at).toLocaleString();
    } catch {
      return item.created_at || "";
    }
  })();
  const kind = item.content_type;

  return (
    <article className={s.visionCard}>
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

      {(kind === "image" || kind === "video") && (
        <div className={s.mediaContainer}>
          {src ? (
            // 1. SUCCESS (It's here!)
            kind === "image" ? (
              <img src={src} alt="Premonition" className={s.mediaContent} />
            ) : (
              <video src={src} controls playsInline className={s.mediaContent} />
            )
          ) : src === null ? (
            // 2. FAILED (It's gone!)
            <div className={s.mediaError}>Signal lost. The memory fades.</div>
          ) : (
            // 3. LOADING (It's coming!)
            <div className={s.mediaLoading}>Receiving transmission...</div>
          )}
        </div>
      )}

      {item.content_url && !isDbMediaUrl(item.content_url) && (
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