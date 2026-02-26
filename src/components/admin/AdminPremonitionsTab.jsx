// src/pages/AdminPremonitionsTab.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
// CHANGED: Import the CSS module
import s from "../../styles/AdminPremonitionsTab.module.css";

/**
 * API base:
 * - prefer Vite envs
 * - then CRA envs
 * - then dev fallback
 */
const DEV_FALLBACK = (typeof window !== "undefined" && window.location.port === "3000")
  ? "http://localhost:3001"
  : "";

const RAW_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL)) ||
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_API_URL ||
  DEV_FALLBACK;

// normalize (remove trailing slashes)
const API_BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, "") : "";
const AUTH_TOKEN_KEY = "token";

// join helper that avoids /api/api/...
function apiJoin(path) {
  if (!API_BASE) return path; // relative fetch
  if (API_BASE.endsWith("/api") && path.startsWith("/api/")) {
    return `${API_BASE}${path.slice(4)}`; // cut the second /api
  }
  return `${API_BASE}${path}`;
}

export default function AdminPremonitionsTab() {
  const token = useMemo(
    () => (typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) || "" : ""),
    []
  );
  const headersObj = useMemo(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }),
    [token]
  );

  // LEFT: Malkavians list / recipients
  const [list, setList] = useState([]); // Malkavians
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Compose mode & payload
  const [mode, setMode] = useState("text"); // 'text' | 'image' | 'video'
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);

  const [selected, setSelected] = useState(new Set());
  const [allMalks, setAllMalks] = useState(false);

  // Upload progress state
  const [isUploading, setIsUploading] = useState(false);
  const [pct, setPct] = useState(0);
  const [sentBytes, setSentBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [etaSec, setEtaSec] = useState(null);
  const [speedBps, setSpeedBps] = useState(null);
  const startedAtRef = useRef(0);
  const xhrRef = useRef(null);

  const fileInputRef = useRef();

  // NEW: Admin History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyErr, setHistoryErr] = useState("");

  // NEW: secure object URL cache for media preview/open
  const objectUrlCache = useRef(new Map());
  const createdUrls = useRef([]);
  useEffect(() => {
    // Copy the current value to a variable so it doesn't change
    const urlsToRevoke = createdUrls.current;
    return () => {
      // revoke created object URLs on unmount
      urlsToRevoke.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  // Load Malkavians
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const r = await fetch(apiJoin("/api/admin/premonitions/malkavians"), { headers: headersObj });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        setList(Array.isArray(j.malkavians) ? j.malkavians : []);
      } catch (e) {
        setErr(e.message || "Failed to load Malkavians");
      } finally {
        setLoading(false);
      }
    })();
  }, [headersObj]);

  // NEW: Load Admin History
  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryErr("");
    try {
      const r = await fetch(apiJoin("/api/admin/premonitions"), { headers: headersObj });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setHistory(Array.isArray(j.premonitions) ? j.premonitions : []);
    } catch (e) {
      setHistoryErr(e.message || "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headersObj]);

  // Helpers
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clear = () => {
    setMode("text");
    setText("");
    setFile(null);
    setSelected(new Set());
    setAllMalks(false);
    resetProgress();
  };

  const resetProgress = () => {
    setIsUploading(false);
    setPct(0);
    setSentBytes(0);
    setTotalBytes(0);
    setEtaSec(null);
    setSpeedBps(null);
    startedAtRef.current = 0;
    xhrRef.current = null;
  };

  const abortUpload = () => {
    try {
      xhrRef.current?.abort();
    } catch {}
    resetProgress();
    setErr("Upload cancelled");
  };

  // Upload with progress using XHR (fetch doesn't support upload progress)
  const uploadWithProgress = (file) =>
    new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append("file", file);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("POST", apiJoin("/api/admin/premonitions/upload"), true);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      startedAtRef.current = performance.now();
      setIsUploading(true);
      setErr("");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const loaded = e.loaded;
          const total = e.total || file.size || 0;
          setSentBytes(loaded);
          setTotalBytes(total);
          const p = total > 0 ? Math.round((loaded / total) * 100) : 0;
          setPct(p);

          // speed & ETA
          const dt = (performance.now() - startedAtRef.current) / 1000; // s
          if (dt > 0) {
            const bps = loaded / dt;
            setSpeedBps(bps);
            const remain = Math.max(0, total - loaded);
            setEtaSec(bps > 0 ? Math.round(remain / bps) : null);
          }
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        setIsUploading(false);
        try {
          const body = xhr.responseText || "{}";
          const j = JSON.parse(body);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(j); // { media_id, media_mime, media_stream_url }
          } else {
            reject(new Error(j?.error || `Upload failed (HTTP ${xhr.status})`));
          }
        } catch {
          reject(new Error("Upload failed: invalid JSON response"));
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        reject(new Error("Network error during upload"));
      };
      xhr.onabort = () => {
        setIsUploading(false);
        reject(new Error("Upload aborted"));
      };

      xhr.send(fd);
    });

  const doSend = async () => {
    try {
      setErr("");

      // 1) Resolve content (either text OR upload to get a stream URL)
      let content_type = mode; // 'text' | 'image' | 'video'
      let content_text = null;
      let content_url = null;

      if (mode === "text") {
        if (!text.trim()) throw new Error("Write something first.");
        content_text = text.trim();
      } else {
        if (!file) throw new Error("Choose a file first.");
        const up = await uploadWithProgress(file); // progress shown
        content_url = up.media_stream_url; // e.g. /api/premonitions/media/123
      }

      // 2) Who receives?
      const user_ids = allMalks ? ["all_malkavians"] : Array.from(selected);
      if (!user_ids.length) throw new Error("Select recipients or use 'All Malkavians'.");

      // 3) Send the premonition
      const r = await fetch(apiJoin("/api/admin/premonitions/send"), {
        method: "POST",
        headers: { ...headersObj, "Content-Type": "application/json" },
        body: JSON.stringify({ content_type, content_text, content_url, user_ids }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      alert(`✅ Sent! (${j.count} recipients)`);
      clear();
      // NEW: refresh history so the new item appears
      fetchHistory();
    } catch (e) {
      setErr(e.message || "Send failed");
    }
  };

  // NEW: open protected media with bearer auth
  async function openMediaWithAuth(url) {
    try {
      const abs = apiJoin(url);
      if (objectUrlCache.current.has(abs)) {
        window.open(objectUrlCache.current.get(abs), "_blank", "noopener");
        return;
      }
      const r = await fetch(abs, { headers: headersObj });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const obj = URL.createObjectURL(blob);
      objectUrlCache.current.set(abs, obj);
      createdUrls.current.push(obj);
      window.open(obj, "_blank", "noopener");
    } catch (e) {
      alert(`Unable to open media: ${e.message}`);
    }
  }

  const prettyBytes = (n) => {
    if (!Number.isFinite(n)) return "0 B";
    const u = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
  };

  // CHANGED: Replaced all `style` attributes with `className`
  return (
    <section className={s.adminGrid}>
      {/* Left: recipients */}
      <div className={`${s.panel} ${s.recipientsPanel}`}>
        <div className={s.recipientsHeader}>
          <strong>Recipients</strong>
          <label className={s.allMalksLabel}>
            <input
              type="checkbox"
              checked={allMalks}
              onChange={(e) => setAllMalks(e.target.checked)}
            />
            All Malkavians
          </label>
        </div>

        {loading && <div className={s.loading}>Loading…</div>}
        {err && <div className={s.error}>⚠️ {err}</div>}

        {!loading && !err && (
          <ul className={s.recipientsList}>
            {list.map((u) => (
              <li key={u.id} className={s.recipientItem}>
                <input
                  type="checkbox"
                  disabled={allMalks}
                  checked={selected.has(u.id)}
                  onChange={() => toggleOne(u.id)}
                />
                <div>
                  <div className={s.recipientName}>{u.display_name}</div>
                  <div className={s.recipientChar}>
                    {u.char_name || "(no character)"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Right: composer + NEW: history */}
      <div className={`${s.panel} ${s.composerPanel}`}>
        {/* Mode switch */}
        <div className={s.modeSwitch}>
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`${s.btn} ${mode === "text" ? s.active : ""}`}
          >
            Text
          </button>
          <button
            type="button"
            onClick={() => setMode("image")}
            className={`${s.btn} ${mode === "image" ? s.active : ""}`}
          >
            Image
          </button>
          <button
            type="button"
            onClick={() => setMode("video")}
            className={`${s.btn} ${mode === "video" ? s.active : ""}`}
          >
            Video
          </button>
          <div className={s.sendClearButtons}>
            <button
              type="button"
              onClick={doSend}
              className={`${s.btn} ${s.btnPrimary}`}
              disabled={isUploading}
            >
              Send
            </button>
            <button
              type="button"
              onClick={clear}
              className={`${s.btn} ${s.btnSecondary}`}
              disabled={isUploading}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Content inputs */}
        {mode === "text" ? (
          <div className={s.composerInputArea}>
            <textarea
              rows={6}
              className={s.textarea}
              placeholder="Write the premonition text…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        ) : (
          <div className={s.composerInputArea}>
            <input
              ref={fileInputRef}
              type="file"
              accept={mode === "image" ? "image/*" : mode === "video" ? "video/*" : "*/*"}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <div className={s.fileInputInfo}>
                Selected: <strong>{file.name}</strong> ({file.type || "unknown"},{" "}
                {prettyBytes(file.size)})
              </div>
            )}

            {/* Progress UI */}
            {isUploading && (
              <div aria-live="polite" className={s.progressArea}>
                <div className={s.progressBar}>
                  <div
                    className={s.progressInner}
                    style={{ width: `${pct}%` }} // This is the only inline style left, as it's dynamic
                  />
                </div>
                <div className={s.progressStats}>
                  <span>{pct}%</span>
                  <span>
                    {prettyBytes(sentBytes)} / {prettyBytes(totalBytes)}
                  </span>
                  {speedBps != null && (
                    <span>
                      {prettyBytes(speedBps)}/s
                      {etaSec != null ? ` · ~${etaSec}s left` : ""}
                    </span>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={abortUpload}
                    className={`${s.btn} ${s.btnDanger}`}
                  >
                    Cancel upload
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NEW: History panel */}
        <div className={s.historyPanel}>
          <div className={s.historyHeader}>
            <strong>History</strong>
            <button
              type="button"
              onClick={fetchHistory}
              className={s.btn}
              disabled={historyLoading}
            >
              Refresh
            </button>
            <span className={s.historyMeta}>{history.length} items</span>
          </div>

          {historyErr && <div className={s.error}>⚠️ {historyErr}</div>}
          {historyLoading && <div className={s.loading}>Loading…</div>}

          {!historyLoading && !historyErr && (
            <ul className={s.historyList}>
              {history.map((h) => (
                <li key={h.id} className={s.historyItem}>
                  <div className={s.historyItemHeader}>
                    <span className={s.historyItemType}>{h.content_type}</span>
                    <time className={s.historyItemTime}>
                      {h.created_at ? new Date(h.created_at).toLocaleString() : ""}
                    </time>
                    {h.sender_name && (
                      <span className={s.historyItemSender}>
                        by {h.sender_name}
                      </span>
                    )}
                  </div>

                  {h.content_type === "text" ? (
                    <div className={s.historyItemText}>{h.content_text}</div>
                  ) : h.content_url ? (
                    <button
                      type="button"
                      onClick={() => openMediaWithAuth(h.content_url)}
                      className={s.btn}
                      style={{ marginTop: 6 }} // This small inline style is acceptable
                    >
                      Open {h.content_type}
                    </button>
                  ) : null}

                  <div className={s.historyRecipients}>
                    <div className={s.historyRecipientsTitle}>Recipients</div>
                    {h.recipients?.length ? (
                      <ul className={s.historyRecipientsList}>
                        {h.recipients.map((r) => (
                          <li
                            key={`${h.id}_${r.user_id}`}
                            className={s.historyRecipientItem}
                          >
                            {r.display_name}
                            {r.char_name ? (
                              <span className={s.recipientCharName}>
                                {" "}
                                — {r.char_name}
                              </span>
                            ) : null}
                            {r.viewed_at ? (
                              <span className={s.recipientViewed}>
                                viewed {new Date(r.viewed_at).toLocaleString()}
                              </span>
                            ) : (
                              <span className={s.recipientNotViewed}>
                                not opened
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className={s.recipientChar}>—</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}