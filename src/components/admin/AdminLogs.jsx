// src/pages/AdminLogs.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../core/api";
import styles from '../../styles/Admin.module.css';

const EMO = { start: "🚀", auth: "🔐", char: "🧛", xp: "✨", dt: "🕰️", dom: "🏰", adm: "🛡️", ok: "✅", warn: "⚠️", err: "💥", req: "➡️", res: "⬅️", mail: "✉️", db: "🗄️", info: "ℹ️", http: "🌐", dbg: "🐛", sys: "⚙️" };
const LEVELS = ["debug", "info", "warn", "error"];

// Replaced flat colors with glass transparency and glow logic
const LEVEL_STYLE = {
  debug: { fg: "#a8a8b3", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", label: "DEBUG" },
  info:  { fg: "#61dafb", bg: "rgba(97, 218, 251, 0.05)", border: "rgba(97, 218, 251, 0.2)", label: "INFO"  },
  warn:  { fg: "#ffcc00", bg: "rgba(255, 204, 0, 0.05)", border: "rgba(255, 204, 0, 0.2)", label: "WARN"  },
  error: { fg: "#ff6b6b", bg: "rgba(255, 107, 107, 0.1)", border: "rgba(255, 107, 107, 0.3)", label: "ERROR" },
};

function isLikelyJSONLine(s) { return typeof s === "string" && s.length > 1 && s.trim().startsWith("{") && s.trim().endsWith("}"); }
function normalizeLog(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) { const { time, level = "info", cat = "info", msg = "", ...rest } = raw; return { time, level: level.toLowerCase(), cat, msg, ctx: Object.keys(rest).length ? rest : null, source: "json" }; }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (isLikelyJSONLine(s)) { try { const j = JSON.parse(s); const { time, level = "info", cat = "info", msg = "", ...rest } = j; return { time, level: String(level).toLowerCase(), cat, msg, ctx: Object.keys(rest).length ? rest : null, source: "json" }; } catch {} }
    const m = s.match(/^(\d{4}-\d{2}-\d{2}T[^\s]+)\s+\[([A-Z]+)\]\s+([a-zA-Z0-9_]+):\s+(.*)$/);
    if (m) { const [, iso, LEVEL, cat, restAll] = m; let msg = restAll; let ctx = null; const pipeAt = restAll.indexOf(" | "); if (pipeAt !== -1) { msg = restAll.slice(0, pipeAt); const ctxStr = restAll.slice(pipeAt + 3).trim(); try { ctx = JSON.parse(ctxStr); } catch { ctx = { raw: ctxStr }; } } return { time: iso, level: String(LEVEL).toLowerCase(), cat, msg, ctx, source: "text" }; }
    return { time: null, level: "info", cat: "info", msg: s, ctx: null, source: "plain" };
  }
  return { time: null, level: "info", cat: "info", msg: String(raw), ctx: null, source: "unknown" };
}
function formatClockLocal(iso) {
  if (!iso) return "";
  try { const d = new Date(iso); return d.toLocaleString("el-GR", { hour12: false, year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Athens" }); } catch { return String(iso); }
}
function matchesSearch(log, q) {
  if (!q) return true;
  const hay = (log.time || "") + " " + (log.level || "") + " " + (log.cat || "") + " " + (log.msg || "") + " " + (log.ctx ? JSON.stringify(log.ctx) : "");
  return hay.toLowerCase().includes(q.toLowerCase());
}

function Chip({ style, children, title }) { return <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", backdropFilter: 'blur(4px)', ...style }}>{children}</span>; }
function copyToClipboard(text) { try { navigator.clipboard?.writeText(text); } catch {} }

function JSONBlock({ obj }) {
  const [open, setOpen] = useState(false);
  const pretty = useMemo(() => JSON.stringify(obj, null, 2), [obj]);
  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(v => !v)} style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--glass-border-highlight)", background: "rgba(157, 124, 255, 0.1)", color: "var(--accent-purple)", cursor: "pointer", fontSize: 12, fontWeight: 'bold' }}>{open ? "▼" : "▶"} Context</button>
      {open && <pre style={{ marginTop: 8, background: "rgba(0,0,0,0.6)", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: 12, whiteSpace: "pre", overflowX: "auto", color: '#a8a8b3', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>{pretty}</pre>}
    </div>
  );
}

export default function AdminLogs() {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [follow, setFollow] = useState(true);
  const [error, setError] = useState("");
  const [count, setCount] = useState(400);
  const [query, setQuery] = useState("");
  const [wrap, setWrap] = useState(true);
  const [showSystem, setShowSystem] = useState(false);
  const [levelFilter, setLevelFilter] = useState(() => new Set(LEVELS));
  const pollRef = useRef(null);
  const scrollRef = useRef(null);

  const apiBase = (api?.defaults && api.defaults.baseURL) || import.meta.env.VITE_API_BASE || process.env.REACT_APP_API_BASE || "/api";

  async function loadLogs() {
    setLoading(true); setError("");
    try {
      const res = await api.get("/admin/logs", { params: { lines: count }, validateStatus: () => true });
      if (typeof res.data === "string" && res.data.startsWith("<!DOCTYPE")) throw new Error("Got HTML instead of JSON");
      if (!res.data?.ok || !Array.isArray(res.data?.lines)) throw new Error(res.data?.error || "Unexpected payload");
      setLines(res.data.lines);
    } catch (e) { setError(e?.message || "Failed to fetch logs"); setLines([]); } finally { setLoading(false); }
  }

  useEffect(() => {
    loadLogs();
    if (auto) pollRef.current = setInterval(loadLogs, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; };
  }, [auto, count]);

  useEffect(() => { if (!follow) return; const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [lines, follow]);

  const normalized = useMemo(() => {
    return lines.map(normalizeLog).filter(l => {
      const isSystem = (l.msg && (l.msg.includes("/api/admin/logs") || l.msg.includes("/api/health"))) || (l.ctx && JSON.stringify(l.ctx).includes("/api/admin/logs"));
      if (!showSystem && isSystem) return false;
      return levelFilter.has(l.level) && matchesSearch(l, query);
    });
  }, [lines, levelFilter, query, showSystem]);

  return (
    <div style={{ padding: '2rem', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
      <h2 style={{ margin: '0 0 1.5rem 0', color: '#fff', fontSize: '1.8rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>📜 System Terminal</h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--glass-inset)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
          <span style={{ color: 'var(--text-secondary)', marginRight: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>LINES</span>
          <input type="number" value={count} onChange={(e) => setCount(Math.max(10, Number(e.target.value) || 200))} className={styles.input} style={{ width: '80px', padding: '4px', textAlign: 'center' }} />
        </div>
        <input placeholder="Grep logs..." value={query} onChange={(e) => setQuery(e.target.value)} className={styles.input} style={{ width: '300px' }} />
        
        <button onClick={loadLogs} disabled={loading} className={`${styles.btn} ${styles.btnPrimary}`}>
          {loading ? "Syncing…" : "Refresh"}
        </button>

        <div style={{ display: 'flex', gap: '15px', background: 'var(--glass-inset)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', marginLeft: 'auto' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} style={{accentColor: 'var(--accent-purple)'}} /> Auto-Tail</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}><input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} style={{accentColor: 'var(--accent-purple)'}} /> Scroll</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}><input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} style={{accentColor: 'var(--accent-purple)'}} /> Wrap</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: showSystem ? "var(--accent-purple)" : "var(--text-muted)", fontSize: '0.9rem', cursor: 'pointer' }} title="Show logs of the log-fetching itself"><input type="checkbox" checked={showSystem} onChange={(e) => setShowSystem(e.target.checked)} style={{accentColor: 'var(--accent-purple)'}} /> Trace</label>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: '1.5rem' }}>
        {LEVELS.map((lv) => {
          const on = levelFilter.has(lv);
          const sty = LEVEL_STYLE[lv];
          return (
            <Chip key={lv} style={{ background: on ? sty.bg : "var(--glass-inset)", color: on ? sty.fg : "var(--text-muted)", border: `1px solid ${on ? sty.border : 'var(--glass-border)'}`, cursor: "pointer", padding: '6px 12px' }}>
              <input type="checkbox" checked={on} onChange={(e) => { const next = new Set(levelFilter); if (e.target.checked) next.add(lv); else next.delete(lv); setLevelFilter(next); }} style={{ marginRight: 8, accentColor: sty.fg }} />
              {sty.label}
            </Chip>
          );
        })}
        <a href={`${apiBase}/admin/logs/download`} target="_blank" rel="noreferrer" className={`${styles.btn} ${styles.btnGhost}`} style={{ marginLeft: 'auto' }}>⬇️ Export .log</a>
      </div>

      {error && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}

      <div ref={scrollRef} style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-lg)", height: "65vh", overflow: "auto", padding: "1.5rem", fontFamily: "'Fira Code', monospace", fontSize: 13, lineHeight: 1.5, boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.8)' }}>
        {normalized.length === 0 && !loading ? (
          <div style={{ opacity: 0.5, textAlign: 'center', marginTop: '10%' }}>Awaiting signals...</div>
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
    <div style={{ padding: "10px 14px", marginBottom: 10, borderRadius: "10px", border: `1px solid ${sty.border}`, background: sty.bg, backdropFilter: 'blur(4px)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = sty.bg}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {timeLocal && <span style={{ color: "var(--text-muted)", fontSize: 11, minWidth: 110 }}>{timeLocal}</span>}
        <Chip style={{ background: "rgba(0,0,0,0.3)", color: sty.fg, border: `1px solid ${sty.border}` }}>{sty.label}</Chip>
        <span style={{ color: "#fff", fontWeight: 800 }}>{emoji ? `${emoji} ` : ""}{log.cat}</span>
        <span style={{ color: "#e0e0e0", whiteSpace: wrap ? "pre-wrap" : "pre", wordBreak: wrap ? "break-word" : "normal", flex: 1 }}>{log.msg}</span>
        <button className={styles.btnGhost} style={{ padding: "4px 8px", fontSize: '0.8rem', borderRadius: '6px' }} onClick={() => copyToClipboard(log.source === "json" ? JSON.stringify({ time: log.time, level: log.level, cat: log.cat, msg: log.msg, ...(log.ctx || {}) }, null, 2) : `${log.time || ""} [${(log.level || "").toUpperCase()}] ${log.cat}: ${log.msg}${log.ctx ? ` | ${JSON.stringify(log.ctx)}` : ""}`)}>⧉ Copy</button>
      </div>
      {log.ctx && <JSONBlock obj={log.ctx} />}
    </div>
  );
}