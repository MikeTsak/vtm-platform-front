// src/pages/AdminPremonitionsTab.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/** API base: dev defaults to :3001 unless REACT_APP_API_BASE is set */
const devDefault = window.location.port === "3000" ? "http://localhost:3001" : "";
const API_BASE = (process.env.REACT_APP_API_BASE || devDefault).replace(/\/$/, "");
const AUTH_TOKEN_KEY = "token";

export default function AdminPremonitionsTab() {
  const token = useMemo(() => localStorage.getItem(AUTH_TOKEN_KEY) || "", []);
  const headersObj = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [list, setList] = useState([]);         // Malkavians
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [mode, setMode] = useState("text");     // 'text' | 'image' | 'video'
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

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const r = await fetch(`${API_BASE}/api/admin/premonitions/malkavians`, { headers: headersObj });
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

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    try { xhrRef.current?.abort(); } catch {}
    resetProgress();
    setErr("Upload cancelled");
  };

  // Upload with progress using XHR (fetch doesn't support upload progress)
  const uploadWithProgress = (file) => new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", `${API_BASE}/api/admin/premonitions/upload`, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

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

        // speed & ETA (basic)
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

    xhr.onerror = () => { setIsUploading(false); reject(new Error("Network error during upload")); };
    xhr.onabort  = () => { setIsUploading(false); reject(new Error("Upload aborted")); };

    xhr.send(fd);
  });

  const doSend = async () => {
    try {
      setErr("");

      // 1) Resolve content (either text OR upload to get a stream URL)
      let content_type = mode;           // 'text' | 'image' | 'video'
      let content_text = null;
      let content_url  = null;

      if (mode === "text") {
        if (!text.trim()) throw new Error("Write something first.");
        content_text = text.trim();
      } else {
        if (!file) throw new Error("Choose a file first.");
        const up = await uploadWithProgress(file); // progress shown
        content_url = up.media_stream_url;         // e.g. /api/premonitions/media/123
      }

      // 2) Who receives?
      const user_ids = allMalks ? ["all_malkavians"] : Array.from(selected);
      if (!user_ids.length) throw new Error("Select recipients or use 'All Malkavians'.");

      // 3) Send the premonition (quick call; no upload here)
      const r = await fetch(`${API_BASE}/api/admin/premonitions/send`, {
        method: "POST",
        headers: { ...headersObj, "Content-Type": "application/json" },
        body: JSON.stringify({ content_type, content_text, content_url, user_ids }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      alert(`✅ Sent! (${j.count} recipients)`);
      clear();
    } catch (e) {
      setErr(e.message || "Send failed");
    }
  };

  const prettyBytes = (n) => {
    if (!Number.isFinite(n)) return "0 B";
    const u = ["B","KB","MB","GB","TB"];
    let i = 0;
    while (n >= 1024 && i < u.length-1) { n /= 1024; i++; }
    return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
  };

  return (
    <section style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
      {/* Left: recipients */}
      <div style={{ border: "1px solid #2a2a2f", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <strong>Recipients</strong>
          <label style={{ marginLeft: "auto", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={allMalks}
              onChange={(e) => setAllMalks(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            All Malkavians
          </label>
        </div>

        {loading && <div style={{ color: "#bbb" }}>Loading…</div>}
        {err && <div style={{ color: "#f88", marginBottom: 10 }}>⚠️ {err}</div>}

        {!loading && !err && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 420, overflow: "auto" }}>
            {list.map(u => (
              <li key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px" }}>
                <input
                  type="checkbox"
                  disabled={allMalks}
                  checked={selected.has(u.id)}
                  onChange={() => toggleOne(u.id)}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>{u.display_name}</div>
                  <div style={{ fontSize: 12, color: "#aab" }}>{u.char_name || "(no character)"}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Right: composer */}
      <div style={{ border: "1px solid #2a2a2f", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button onClick={() => setMode("text")}  style={btn(mode === "text")}  type="button">✍️ Text</button>
          <button onClick={() => setMode("image")} style={btn(mode === "image")} type="button">🖼️ Image</button>
          <button onClick={() => setMode("video")} style={btn(mode === "video")} type="button">🎞️ Video</button>

          <button onClick={doSend} style={{ marginLeft: "auto", ...btnPrimary, opacity: isUploading ? 0.6 : 1 }} type="button" disabled={isUploading}>
            {isUploading ? "Uploading…" : "Send"}
          </button>
        </div>

        {mode === "text" && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write the premonition text…"
            rows={12}
            style={{
              width: "100%",
              resize: "vertical",
              borderRadius: 10,
              border: "1px solid #333",
              background: "#0f0f12",
              color: "#eee",
              padding: 10,
              lineHeight: 1.4
            }}
          />
        )}

        {(mode === "image" || mode === "video") && (
          <div style={{ display: "grid", gap: 8 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept={mode === "image" ? "image/*" : "video/*"}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={isUploading}
            />
            {file && (
              <div style={{ fontSize: 13, color: "#aab" }}>
                Selected: <strong>{file.name}</strong> ({file.type || "unknown"}, {prettyBytes(file.size)})
              </div>
            )}

            {/* Progress UI */}
            {isUploading && (
              <div aria-live="polite" style={{ display: "grid", gap: 6 }}>
                <div style={{ height: 10, background: "#0f0f12", border: "1px solid #333", borderRadius: 8, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: "linear-gradient(90deg,#2dbf6a,#5ed28a)",
                      transition: "width .12s linear"
                    }}
                  />
                </div>
                <div style={{ display: "flex", fontSize: 12, color: "#aab" }}>
                  <span>{pct}%</span>
                  <span style={{ marginLeft: 10 }}>{prettyBytes(sentBytes)} / {prettyBytes(totalBytes)}</span>
                  {speedBps != null && <span style={{ marginLeft: "auto" }}>{prettyBytes(speedBps)}/s{etaSec != null ? ` · ~${etaSec}s left` : ""}</span>}
                </div>
                <div>
                  <button type="button" onClick={abortUpload} style={btnDanger}>Cancel upload</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const btn = (active) => ({
  border: "1px solid " + (active ? "#556" : "#333"),
  background: active ? "#1a1a24" : "#101015",
  color: active ? "#dfe" : "#eee",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
});
const btnPrimary = {
  border: "1px solid #4a4",
  background: "#163016",
  color: "#efe",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
};
const btnDanger = {
  border: "1px solid #844",
  background: "#301616",
  color: "#fee",
  padding: "6px 10px",
  borderRadius: 8,
  cursor: "pointer",
};
