// src/pages/AdminPremonitionsTab.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
// CHANGED: Import the CSS module
import s from "../../styles/AdminPremonitionsTab.module.css";
import { Skeleton } from "boneyard-js/react";
import { formatEuDate } from "../../utils/dateFormatter";
import api, { formatApiError } from "../../core/api";
import FaGlyph from "../../ui/FaGlyph";

const PRESET_WARNINGS = [
  "Gore",
  "Suicide",
  "Extreme Violence",
  "Infanticide",
  "Sexual Content",
  "Body Horror",
  "Torture",
];

export default function AdminPremonitionsTab() {
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

  // Content Warnings state
  const [selectedWarnings, setSelectedWarnings] = useState(new Set());
  const [customWarning, setCustomWarning] = useState("");

  // Upload progress state
  const [isUploading, setIsUploading] = useState(false);
  const [pct, setPct] = useState(0);
  const [sentBytes, setSentBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [etaSec, setEtaSec] = useState(null);
  const [speedBps, setSpeedBps] = useState(null);
  const startedAtRef = useRef(0);
  const abortControllerRef = useRef(null);

  const fileInputRef = useRef();

  // NEW: Admin History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyErr, setHistoryErr] = useState("");

  // Load Malkavians
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await api.get("/admin/premonitions/malkavians");
        setList(Array.isArray(res.data?.malkavians) ? res.data.malkavians : []);
      } catch (e) {
        setErr(formatApiError(e, "Failed to load Malkavians"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // NEW: Load Admin History
  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryErr("");
    try {
      const res = await api.get("/admin/premonitions");
      setHistory(Array.isArray(res.data?.premonitions) ? res.data.premonitions : []);
    } catch (e) {
      setHistoryErr(formatApiError(e, "Failed to load history"));
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Helpers
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleWarning = (w) => {
    setSelectedWarnings((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  };

  const addCustomWarning = () => {
    const trimmed = customWarning.trim();
    if (!trimmed) return;
    setSelectedWarnings((prev) => new Set([...prev, trimmed]));
    setCustomWarning("");
  };

  const clear = () => {
    setMode("text");
    setText("");
    setFile(null);
    setSelected(new Set());
    setAllMalks(false);
    setSelectedWarnings(new Set());
    setCustomWarning("");
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
    abortControllerRef.current = null;
  };

  const abortUpload = () => {
    try {
      abortControllerRef.current?.abort();
    } catch {}
    resetProgress();
    setErr("Upload cancelled");
  };

  // Upload with progress using Axios and AbortController
  const uploadWithProgress = async (fileToUpload) => {
    const fd = new FormData();
    fd.append("file", fileToUpload);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    startedAtRef.current = performance.now();
    setIsUploading(true);
    setErr("");

    try {
      const res = await api.post("/admin/premonitions/upload", fd, {
        signal: controller.signal,
        onUploadProgress: (e) => {
          if (e.lengthComputable || (e.total && e.loaded)) {
            const loaded = e.loaded;
            const total = e.total || fileToUpload.size || 0;
            setSentBytes(loaded);
            setTotalBytes(total);
            const p = total > 0 ? Math.round((loaded / total) * 100) : 0;
            setPct(p);

            const dt = (performance.now() - startedAtRef.current) / 1000;
            if (dt > 0) {
              const bps = loaded / dt;
              setSpeedBps(bps);
              const remain = Math.max(0, total - loaded);
              setEtaSec(bps > 0 ? Math.round(remain / bps) : null);
            }
          }
        },
      });
      return res.data; // { media_id, media_mime, media_stream_url }
    } catch (err) {
      if (controller.signal.aborted) {
        throw new Error("Upload cancelled");
      }
      throw new Error(err.response?.data?.error || err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

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
      const res = await api.post("/admin/premonitions/send", {
        content_type,
        content_text,
        content_url,
        user_ids,
        warnings: Array.from(selectedWarnings),
      });
      const j = res.data;

      alert(`Sent to ${j?.count ?? 0} recipients`);
      clear();
      // NEW: refresh history so the new item appears
      fetchHistory();
    } catch (e) {
      setErr(formatApiError(e, "Send failed"));
    }
  };

  // Open media link safely (handles direct CDN URLs or backend redirection)
  async function openMediaWithAuth(url) {
    try {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        window.open(url, "_blank", "noopener");
        return;
      }
      let endpoint = url;
      if (endpoint.startsWith("/api/")) {
        endpoint = endpoint.slice(4);
      }
      try {
        const infoRes = await api.get(endpoint + (endpoint.includes("?") ? "&info=1" : "?info=1"));
        if (infoRes.data?.url) {
          const direct = infoRes.data.url;
          if (direct.startsWith("http://") || direct.startsWith("https://")) {
            window.open(direct, "_blank", "noopener");
            return;
          }
        }
      } catch {}

      const rawBase = import.meta.env.VITE_API_URL || "";
      const base = rawBase.replace(/\/+$/, "");
      const fullUrl = url.startsWith("http") ? url : `${base}${url.startsWith("/") ? "" : "/"}${url}`;
      window.open(fullUrl, "_blank", "noopener");
    } catch (e) {
      alert(`Unable to open media: ${formatApiError(e)}`);
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

        {loading && <Skeleton loading={true} name="admin-premonitions-loader" />}
        {err && <div className={s.error}>{err}</div>}

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

        {/* Content Warnings selection */}
        <div className={s.warningsSection}>
          <div className={s.warningsTitle}>
            <FaGlyph name="fa-triangle-exclamation" size={14} style={{ color: "#e5a93b" }} />
            <span>Content Warnings (Optional)</span>
          </div>
          <div className={s.warningsSubtitle}>
            Select all applicable sensitive content warnings for Malkavian viewers:
          </div>
          <div className={s.presetGrid}>
            {PRESET_WARNINGS.map((warn) => {
              const active = selectedWarnings.has(warn);
              return (
                <button
                  key={warn}
                  type="button"
                  onClick={() => toggleWarning(warn)}
                  className={`${s.warningChipBtn} ${active ? s.warningChipBtnActive : ""}`}
                >
                  {warn}
                </button>
              );
            })}
          </div>

          <div className={s.customWarningRow}>
            <input
              type="text"
              placeholder="Add custom warning..."
              value={customWarning}
              onChange={(e) => setCustomWarning(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomWarning();
                }
              }}
              className={s.customWarningInput}
            />
            <button
              type="button"
              onClick={addCustomWarning}
              className={`${s.btn} ${s.btnSecondary}`}
            >
              Add Warning
            </button>
          </div>

          {selectedWarnings.size > 0 && (
            <div className={s.selectedWarningsSummary}>
              <span style={{ color: "#888", fontSize: "0.8rem" }}>Active warnings:</span>
              <div className={s.selectedTagsRow}>
                {Array.from(selectedWarnings).map((w) => (
                  <span key={w} className={s.activeWarningBadge}>
                    {w}
                    <button
                      type="button"
                      onClick={() => toggleWarning(w)}
                      className={s.removeWarningBtn}
                      title="Remove warning"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

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

          {historyErr && <div className={s.error}>{historyErr}</div>}
          {historyLoading && <Skeleton loading={true} name="admin-history-loader" />}

          {!historyLoading && !historyErr && (
            <ul className={s.historyList}>
              {history.map((h) => (
                <li key={h.id} className={s.historyItem}>
                  <div className={s.historyItemHeader}>
                    <span className={s.historyItemType}>{h.content_type}</span>
                    <time className={s.historyItemTime}>
                      {h.created_at ? formatEuDate(h.created_at) : ""}
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

                  {h.warnings && h.warnings.length > 0 && (
                    <div className={s.historyWarningsRow}>
                      <span className={s.historyWarningLabel}>Warnings:</span>
                      {h.warnings.map((warn, i) => (
                        <span key={i} className={s.historyWarningTag}>
                          {warn}
                        </span>
                      ))}
                    </div>
                  )}

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
                                : {r.char_name}
                              </span>
                            ) : null}
                            {r.viewed_at ? (
                              <span className={s.recipientViewed}>
                                viewed {formatEuDate(r.viewed_at)}
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
                      <div className={s.recipientChar}>None</div>
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