// src/pages/AdminLogs.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";

/** Match server-side emojis/categories from logger.js */
const EMO = {
  start: "🚀", auth: "🔐", char: "🧛", xp: "✨", dt: "🕰️", dom: "🏰", adm: "🛡️",
  ok: "✅", warn: "⚠️", err: "💥", req: "➡️", res: "⬅️", mail: "✉️", db: "🗄️",
  info: "ℹ️", http: "🌐", dbg: "🐛", sys: "⚙️"
};

const LEVELS = ["debug", "info", "warn", "error"];
const LEVEL_STYLE = {
  debug: { fg: "#abb2bf", bg: "#2b2f36", label: "DEBUG" },
  info:  { fg: "#61dafb", bg: "#1d2b36", label: "INFO"  },
  warn:  { fg: "#ffcc00", bg: "#3a2f1a", label: "WARN"  },
  error: { fg: "#ff6b6b", bg: "#3b2225", label: "ERROR" },
};

const CONTAINER_STYLE = {
  padding: 16, color: "#d5d7db",
};
const PANEL_STYLE = {
  background: "#0a0b0d",
  border: "1px solid #1f232a",
  borderRadius: 12,
  height: "68vh",
  overflow: "auto",
  padding: 12,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  lineHeight: 1.4,
};

/* ---------- helpers ---------- */

function isLikelyJSONLine(s) {
  return typeof s === "string" && s.length > 1 && s.trim().startsWith("{") && s.trim().endsWith("}");
}

function normalizeLog(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const { time, level = "info", cat = "info", msg = "", ...rest } = raw;
    const ctx = Object.keys(rest).length ? rest : null;
    return { time, level: level.toLowerCase(), cat, msg, ctx, source: "json" };
  }

  if (typeof raw === "string") {
    const s = raw.trim();
    if (isLikelyJSONLine(s)) {
      try {
        const j = JSON.parse(s);
        const { time, level = "info", cat = "info", msg = "", ...rest } = j;
        const ctx = Object.keys(rest).length ? rest : null;
        return { time, level: String(level).toLowerCase(), cat, msg, ctx, source: "json" };
      } catch {}
    }

    const m = s.match(/^(\d{4}-\d{2}-\d{2}T[^\s]+)\s+\[([A-Z]+)\]\s+([a-zA-Z0-9_]+):\s+(.*)$/);
    if (m) {
      const [, iso, LEVEL, cat, restAll] = m;
      let msg = restAll;
      let ctx = null;
      const pipeAt = restAll.indexOf(" | ");
      if (pipeAt !== -1) {
        msg = restAll.slice(0, pipeAt);
        const ctxStr = restAll.slice(pipeAt + 3).trim();
        try { ctx = JSON.parse(ctxStr); } catch { ctx = { raw: ctxStr }; }
      }
      return { time: iso, level: String(LEVEL).toLowerCase(), cat, msg, ctx, source: "text" };
    }
    return { time: null, level: "info", cat: "info", msg: s, ctx: null, source: "plain" };
  }
  return { time: null, level: "info", cat: "info", msg: String(raw), ctx: null, source: "unknown" };
}

function formatClockLocal(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("el-GR", {
      hour12: false, year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Athens",
    });
  } catch { return String(iso); }
}

function matchesSearch(log, q) {
  if (!q) return true;
  const hay = (log.time || "") + " " + (log.level || "") + " " + (log.cat || "") + " " + (log.msg || "") + " " + (log.ctx ? JSON.stringify(log.ctx) : "");
  return hay.toLowerCase().includes(q.toLowerCase());
}

function Chip({ style, children, title }) {
  return (
    <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", ...style }}>
      {children}
    </span>
  );
}

function copyToClipboard(text) {
  try { navigator.clipboard?.writeText(text); } catch {}
}

function JSONBlock({ obj }) {
  const [open, setOpen] = useState(false);
  const pretty = useMemo(() => JSON.stringify(obj, null, 2), [obj]);
  return (
    <div style={{ marginTop: 6 }}>
      <button onClick={() => setOpen(v => !v)} style={{ padding: "3px 8px", borderRadius: 8, border: "1px solid #1f232a", background: "#111318", color: "#e6e6e6", cursor: "pointer", fontSize: 12 }}>
        {open ? "▼" : "▶"} Context
      </button>
      {open && (
        <pre style={{ marginTop: 6, background: "#0f1115", border: "1px solid #1f232a", borderRadius: 8, padding: 10, whiteSpace: "pre", overflowX: "auto" }}>
          {pretty}
        </pre>
      )}
    </div>
  );
}

/* ---------- main component ---------- */

export default function AdminLogs() {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [follow, setFollow] = useState(true);
  const [error, setError] = useState("");
  const [count, setCount] = useState(400);
  const [query, setQuery] = useState("");
  const [wrap, setWrap] = useState(true);
  const [showSystem, setShowSystem] = useState(false); // <--- NEW: Hidden by default
  const [levelFilter, setLevelFilter] = useState(() => new Set(LEVELS));

  const pollRef = useRef(null);
  const scrollRef = useRef(null);

  const apiBase = (api?.defaults && api.defaults.baseURL) || import.meta.env.VITE_API_BASE || process.env.REACT_APP_API_BASE || "/api";

  async function loadLogs() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/logs", { params: { lines: count }, validateStatus: () => true });
      if (typeof res.data === "string" && res.data.startsWith("<!DOCTYPE")) throw new Error("Got HTML instead of JSON");
      if (!res.data?.ok || !Array.isArray(res.data?.lines)) throw new Error(res.data?.error || "Unexpected payload");
      setLines(res.data.lines);
    } catch (e) {
      setError(e?.message || "Failed to fetch logs");
      setLines([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
    if (auto) pollRef.current = setInterval(loadLogs, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; };
  }, [auto, count]);

  useEffect(() => {
    if (!follow) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines, follow]);

  // Normalize + filter
  const normalized = useMemo(() => {
    return lines.map(normalizeLog).filter(l => {
      // Logic to identify logs that shouldn't be part of the main view
      const isSystem = 
        (l.msg && (l.msg.includes("/api/admin/logs") || l.msg.includes("/api/health"))) || 
        (l.ctx && JSON.stringify(l.ctx).includes("/api/admin/logs"));
      
      if (!showSystem && isSystem) return false;
      return levelFilter.has(l.level) && matchesSearch(l, query);
    });
  }, [lines, levelFilter, query, showSystem]);

  return (
    <div style={CONTAINER_STYLE}>
      <h2 style={{ marginBottom: 12 }}>📜 Server Logs</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <label>Lines <input type="number" value={count} onChange={(e) => setCount(Math.max(10, Number(e.target.value) || 200))} style={inputStyle} /></label>

        <input placeholder="Search logs..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ ...inputStyle, width: 280 }} />

        <button onClick={loadLogs} disabled={loading} style={btnStyle(loading ? 0.5 : 1)}>
          {loading ? "Loading…" : "Refresh"}
        </button>

        <label style={{ marginLeft: 6 }}><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto</label>
        <label style={{ marginLeft: 6 }}><input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> Tail</label>
        <label style={{ marginLeft: 6 }}><input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} /> Wrap</label>
        
        {/* Toggle to show/hide the admin logs path logs */}
        <label style={{ marginLeft: 6, color: showSystem ? "#61dafb" : "#8a8f98" }} title="Show logs of the log-fetching itself">
          <input type="checkbox" checked={showSystem} onChange={(e) => setShowSystem(e.target.checked)} /> System
        </label>

        <a href={`${apiBase}/admin/logs/download`} target="_blank" rel="noreferrer" style={linkStyle}>⬇️ Download</a>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {LEVELS.map((lv) => {
          const on = levelFilter.has(lv);
          const sty = LEVEL_STYLE[lv];
          return (
            <Chip key={lv} style={{ background: on ? sty.bg : "#111318", color: on ? sty.fg : "#7f8894", border: "1px solid #1f232a", cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={on} onChange={(e) => {
                  const next = new Set(levelFilter);
                  if (e.target.checked) next.add(lv); else next.delete(lv);
                  setLevelFilter(next);
              }} style={{ marginRight: 6 }} />
              {sty.label}
            </Chip>
          );
        })}
      </div>

      {error && <div style={{ background: "#2a0e0e", color: "#ffb3b3", border: "1px solid #4a1a1a", padding: "10px 12px", borderRadius: 8, marginBottom: 10 }}>{error}</div>}

      <div ref={scrollRef} style={PANEL_STYLE}>
        {normalized.length === 0 && !loading ? (
          <div style={{ opacity: 0.7 }}>No log lines found.</div>
        ) : (
          normalized.map((l, i) => <LogRow key={i} log={l} wrap={wrap} />)
        )}
      </div>
    </div>
  );
}

function LogRow({ log, wrap }) {
  const sty = LEVEL_STYLE[log.level] || LEVEL_STYLE.info;
  const emoji = EMO[log.cat] || "";
  const timeLocal = formatClockLocal(log.time);

  return (
    <div style={{ padding: "8px 10px", marginBottom: 8, borderRadius: 10, border: "1px solid #1f232a", background: sty.bg }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {timeLocal && <span style={{ color: "#8a8f98", fontSize: 12, minWidth: 120 }}>{timeLocal}</span>}
        <Chip style={{ background: "transparent", color: sty.fg, border: "1px solid #30343c" }}>{sty.label}</Chip>
        <span style={{ color: "#cdd0d5", fontWeight: 700 }}>{emoji ? `${emoji} ` : ""}{log.cat}</span>
        <span style={{ color: "#e6e6e6", whiteSpace: wrap ? "pre-wrap" : "pre", wordBreak: wrap ? "break-word" : "normal", flex: 1 }}>{log.msg}</span>
        <button onClick={() => copyToClipboard(log.source === "json" ? JSON.stringify({ time: log.time, level: log.level, cat: log.cat, msg: log.msg, ...(log.ctx || {}) }, null, 2) : `${log.time || ""} [${(log.level || "").toUpperCase()}] ${log.cat}: ${log.msg}${log.ctx ? ` | ${JSON.stringify(log.ctx)}` : ""}`)} style={copyBtnStyle}>⧉</button>
      </div>
      {log.ctx && <JSONBlock obj={log.ctx} />}
    </div>
  );
}

const inputStyle = { width: 110, marginLeft: 6, padding: "6px 8px", borderRadius: 8, border: "1px solid #333", background: "#0f1115", color: "#e6e6e6" };
function btnStyle(opacity = 1) { return { padding: "8px 12px", borderRadius: 10, border: "1px solid #1f232a", background: "#111318", color: "#e6e6e6", cursor: "pointer", opacity }; }
const linkStyle = { padding: "8px 12px", borderRadius: 10, border: "1px solid #1f232a", background: "#111318", color: "#e6e6e6", textDecoration: "none" };
const copyBtnStyle = { padding: "6px 8px", borderRadius: 8, border: "1px solid #30343c", background: "#0f1115", color: "#d5d7db", cursor: "pointer" };