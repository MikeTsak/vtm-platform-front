// src/components/admin/AdminDowntimesTab.jsx
import React, { useEffect, useMemo, useState, useRef, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { formatApiError } from "../../core/api";
import { AuthCtx } from '../../core/AuthContext';
import { formatEuDate } from '../../utils/dateFormatter';
import styles from '../../styles/Admin.module.css';
import Avatar from '../../components/Avatar';
import generateVTMCharacterSheetPDF from '../../utils/pdfGenerator';
import { CLAN_HEX as CLAN_COLORS, symlogoWhite } from '../../data/clans';

/* ---------- VTM Lookups ---------- */
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };
const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');
const symlogo = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.webp` : '');

// High contrast clan colors and surfaces ensuring vibrant legibility on dark glass
const CLAN_ACCENTS = {
  Brujah: '#FF7214',
  Gangrel: '#C7B582',
  Malkavian: '#F1AB13',
  Nosferatu: '#BDBA82',
  Toreador: '#DD2C68',
  Tremere: '#CCB2DC',
  Ventrue: '#D4C270',
  'Banu Haqim': '#C5A838',
  Banu_Haqim: '#C5A838',
  Hecata: '#D1CCDC',
  Lasombra: '#E2E8F0',
  'The Ministry': '#6BD425',
  Ministry: '#6BD425',
  Ravnos: '#E08226',
  Salubri: '#E1FBFE',
  Tzimisce: '#86A59C',
  Caitiff: '#E0E0E0',
  'Thin-blood': '#6BA8BD',
};

const CLAN_SURFACES = {
  Brujah: 'rgba(60, 15, 18, 0.7)',
  Gangrel: 'rgba(68, 38, 4, 0.7)',
  Malkavian: 'rgba(35, 25, 55, 0.7)',
  Nosferatu: 'rgba(35, 40, 36, 0.7)',
  Toreador: 'rgba(74, 0, 31, 0.7)',
  Tremere: 'rgba(80, 30, 92, 0.65)',
  Ventrue: 'rgba(15, 13, 79, 0.75)',
  'Banu Haqim': 'rgba(35, 16, 27, 0.7)',
  Banu_Haqim: 'rgba(35, 16, 27, 0.7)',
  Hecata: 'rgba(50, 45, 55, 0.7)',
  Lasombra: 'rgba(20, 26, 40, 0.75)',
  'The Ministry': 'rgba(28, 1, 24, 0.75)',
  Ministry: 'rgba(28, 1, 24, 0.75)',
  Ravnos: 'rgba(44, 27, 16, 0.7)',
  Salubri: 'rgba(30, 35, 50, 0.7)',
  Tzimisce: 'rgba(35, 30, 45, 0.7)',
  Caitiff: 'rgba(35, 35, 38, 0.7)',
  'Thin-blood': 'rgba(20, 35, 45, 0.7)',
};
/* ---------------------------------- */

// datetime-local value in the admin's own time zone (toISOString would shift it to UTC, so a
// 10:00 release showed as 07:00 here while the Calendar showed 10:00).
function toLocalDateTimeInput(d) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function niceDate(d, options = {}) {
  if (!d) return 'None';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return 'None';
  return formatEuDate(d, { includeSeconds: false, ...options });
}

function ymd(d) {
  if (!d) return '';
  const t = new Date(d);
  if (isNaN(t.getTime())) return '';
  const yyyy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, '0');
  const dd = String(t.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isoToEu(isoStr) {
  if (!isoStr) return '';
  const parts = String(isoStr).split('T')[0].split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (y && m && d) {
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }
  return '';
}

function euToIso(euStr) {
  if (!euStr) return '';
  const trimmed = euStr.trim();
  const match = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/) || trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    const year = parseInt(y, 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      const dt = new Date(year, month - 1, day);
      if (dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day) {
        return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

function EuDateInput({ value, onChange, className, style, disabled }) {
  const [text, setText] = useState(() => isoToEu(value));
  const pickerRef = useRef(null);

  useEffect(() => {
    setText(isoToEu(value));
  }, [value]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (!val.trim()) {
      onChange('');
      return;
    }
    const iso = euToIso(val);
    if (iso) {
      onChange(iso);
    }
  };

  const handleBlur = () => {
    if (!text.trim()) {
      onChange('');
      return;
    }
    const iso = euToIso(text);
    if (iso) {
      onChange(iso);
      setText(isoToEu(iso));
    } else {
      setText(isoToEu(value));
    }
  };

  const handlePickerChange = (e) => {
    const iso = e.target.value;
    if (iso) {
      onChange(iso);
      setText(isoToEu(iso));
    }
  };

  const triggerPicker = () => {
    if (disabled) return;
    try {
      if (pickerRef.current && typeof pickerRef.current.showPicker === 'function') {
        pickerRef.current.showPicker();
      }
    } catch (_) {}
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <input
        type="text"
        placeholder="dd/mm/yyyy"
        className={className}
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        disabled={disabled}
        style={{ paddingRight: '2.5rem', ...style }}
      />
      <div
        onClick={triggerPicker}
        style={{
          position: 'absolute',
          right: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          cursor: disabled ? 'default' : 'pointer',
          color: 'var(--text-secondary)'
        }}
        title="Open calendar"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px', pointerEvents: 'none' }}>
          calendar_today
        </span>
        <input
          ref={pickerRef}
          type="date"
          value={value || ''}
          onChange={handlePickerChange}
          disabled={disabled}
          tabIndex={-1}
          aria-label="Choose date"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: disabled ? 'default' : 'pointer',
            border: 'none',
            padding: 0,
            margin: 0
          }}
        />
      </div>
    </div>
  );
}

const STATUS = [
  'submitted',
  'approved',
  'Approved: Kikos',
  'Approved: Mike',
  'Needs a Scene',
  'rejected',
  'resolved',
  'Resolved in scene'
];

function getStatusBadgeStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved: kikos') {
    return { background: 'rgba(0, 255, 136, 0.15)', color: '#00ff88', border: '1px solid rgba(0, 255, 136, 0.4)' };
  }
  if (s === 'approved: mike') {
    return { background: 'rgba(0, 229, 255, 0.15)', color: '#00e5ff', border: '1px solid rgba(0, 229, 255, 0.4)' };
  }
  if (s === 'approved') {
    return { background: 'rgba(0, 230, 118, 0.12)', color: '#00e676', border: '1px solid rgba(0, 230, 118, 0.3)' };
  }
  if (s === 'submitted') {
    return { background: 'rgba(157, 124, 255, 0.12)', color: '#9d7cff', border: '1px solid rgba(157, 124, 255, 0.3)' };
  }
  if (s.includes('needs')) {
    return { background: 'rgba(255, 204, 0, 0.12)', color: '#ffcc00', border: '1px solid rgba(255, 204, 0, 0.3)' };
  }
  if (s === 'rejected') {
    return { background: 'rgba(255, 82, 82, 0.12)', color: '#ff5252', border: '1px solid rgba(255, 82, 82, 0.3)' };
  }
  if (s.includes('scene')) {
    return { background: 'rgba(77, 166, 255, 0.1)', color: '#4da6ff', border: '1px solid rgba(77, 166, 255, 0.25)' };
  }
  if (s === 'resolved') {
    return { background: 'rgba(77, 166, 255, 0.15)', color: '#4da6ff', border: '1px solid rgba(77, 166, 255, 0.35)' };
  }
  return {};
}

function isSceneDowntime(r) {
  const s = String(r?.status || '').toLowerCase();
  return s === 'needs a scene' || s === 'resolved in scene';
}

function formatSceneLabel(sceneId, sceneIndex = null, title = null) {
  const num = (sceneIndex != null && sceneIndex >= 0) ? (sceneIndex + 1) : null;
  if (title) {
    return num ? `Scene: ${title} (Scene ID: ${num})` : `Scene: ${title}`;
  }
  return num ? `Scene (Scene ID: ${num})` : 'Scene';
}

function newSceneId() {
  return `scene_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

// New scenes are named after a participant's downtime title (scene_title is VARCHAR(150)).
function autoSceneTitle(dt) {
  return String(dt?.title || '').replace(/^\[PROJECT\]\s*/, '').trim().slice(0, 150) || null;
}

// dragleave also fires when the pointer crosses into a child element; only treat it as a real leave
// when the element being entered is outside the drop zone, otherwise highlights flicker on/off.
function leftDropZone(e) {
  return !e.currentTarget.contains(e.relatedTarget);
}

// Clicks on controls inside an expandable card must not toggle it.
function isControlClick(e) {
  return Boolean(e.target.closest('button, select, textarea, input, a, label'));
}

// Absolutely positioned so showing it never reflows the card under the cursor (which re-fires dragleave).
function DropHint({ icon, text, color = '#ffcc00' }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(10, 8, 0, 0.78)', color, fontWeight: 800, fontSize: '0.9rem', borderRadius: 'inherit' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>{icon}</span>
      {text}
    </div>
  );
}

// Same as the Characters tab PDF button: opens the printable sheet in a new tab.
// `characters` is the full list Admin.jsx already loads.
function SheetPdfButton({ character, style }) {
  if (!character) return null;
  return (
    <button
      type="button"
      title={`Open ${character.name || 'character'}'s sheet as a printable PDF in a new tab`}
      onClick={(e) => {
        e.stopPropagation();
        generateVTMCharacterSheetPDF(character);
      }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', fontFamily: 'Fira Code, monospace', color: '#ff8a80', background: 'rgba(255, 82, 82, 0.1)', border: '1px solid rgba(255, 82, 82, 0.4)', borderRadius: '12px', cursor: 'pointer', flexShrink: 0, ...style }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }}>picture_as_pdf</span>
      PDF
    </button>
  );
}

function SceneActionDetails({ r, showResolution = true }) {
  const label = { fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '6px' };
  return (
    <div style={{ flexBasis: '100%', display: 'grid', gap: '0.85rem', background: 'rgba(0, 0, 0, 0.35)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(255, 255, 255, 0.1)', fontSize: '0.9rem', color: '#e0e0e5', cursor: 'auto' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Submitted {niceDate(r.created_at)}</div>
      <div style={{ whiteSpace: 'pre-wrap' }}>
        <div style={label}>Player Action Text:</div>
        {r.body || <span style={{ color: 'var(--text-muted)' }}>(empty)</span>}
      </div>
      {r.gm_notes && (
        <div style={{ whiteSpace: 'pre-wrap' }}>
          <div style={label}>GM Notes (internal):</div>
          {r.gm_notes}
        </div>
      )}
      {showResolution && r.gm_resolution && (
        <div style={{ whiteSpace: 'pre-wrap' }}>
          <div style={label}>Current Resolution{r.resolved_by_name ? ` (Resolved by: ${r.resolved_by_name})` : ''}:</div>
          {r.gm_resolution}
        </div>
      )}
    </div>
  );
}

function StatusToggle({ status, checked, onChange }) {
  return (
    <label
      className={styles.statusToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        cursor: 'pointer',
        padding: '0.6rem 1.2rem',
        background: checked ? 'rgba(255, 255, 255, 0.02)' : 'var(--glass-inset)',
        border: `1px solid ${checked ? 'var(--glass-border)' : 'var(--accent-purple)'}`,
        borderRadius: 'var(--radius-sm)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: checked ? 0.4 : 1,
        boxShadow: checked ? 'none' : '0 0 10px var(--accent-purple-glow)',
        userSelect: 'none'
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{
          width: '15px',
          height: '15px',
          accentColor: 'var(--accent-purple)',
          cursor: 'pointer'
        }}
      />
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: checked ? 'var(--text-muted)' : 'var(--text-color)' }}>
        Hide {status}
      </span>
    </label>
  );
}

export default function AdminDowntimesTab({ characters = [] }) {
  const navigate = useNavigate();
  const [cfgLoading, setCfgLoading] = useState(false);
  const [cfgSaving, setCfgSaving] = useState(false);
  const [cfgErr, setCfgErr] = useState('');
  const [cfgInfo, setCfgInfo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [opening, setOpening] = useState('');
  const [projectDeadline, setProjectDeadline] = useState('');
  const [masterPhase, setMasterPhase] = useState('standard');
  const [massReleaseMode, setMassReleaseMode] = useState(false);
  const [massReleaseDate, setMassReleaseDate] = useState('');

  const [viewMode, setViewMode] = useState('standard');

  const isSubmissionOpen = useMemo(() => {
    if (masterPhase === 'closed') return false;
    const isProj = viewMode === 'project';
    if (masterPhase === 'project' && !isProj) return false;
    if (masterPhase === 'standard' && isProj) return false;

    const now = new Date();
    if (opening) {
      const op = new Date(opening.includes('T') ? opening : `${opening}T00:00:00`);
      if (!isNaN(op.getTime()) && now < op) return false;
    }
    const currentDl = isProj ? projectDeadline : deadline;
    if (currentDl) {
      const dl = new Date(currentDl.includes('T') ? currentDl : `${currentDl}T23:59:59`);
      if (!isNaN(dl.getTime()) && now > dl) return false;
    }
    return true;
  }, [masterPhase, viewMode, opening, deadline, projectDeadline]);

  // Collapsible panels (schedule settings, scenes). Open/closed is remembered per admin account in this browser.
  const { user: authUser } = useContext(AuthCtx);
  const drawerKey = `erebus.admin.downtimes.drawers.${authUser?.id ?? 'anon'}`;
  const [drawers, setDrawers] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem(drawerKey)) || {}; } catch { return {}; }
  });
  function setDrawer(name, open) {
    setDrawers(prev => {
      const next = { ...prev, [name]: open === undefined ? !isDrawerOpen(prev, name) : open };
      try { window.localStorage.setItem(drawerKey, JSON.stringify(next)); } catch { /* storage blocked: still works for this visit */ }
      return next;
    });
  }
  // Defaults: settings closed (the chips summarize them), scenes open.
  const isDrawerOpen = (state, name) => (name === 'scenes' ? state[name] !== false : Boolean(state[name]));
  const configOpen = isDrawerOpen(drawers, 'config');
  const scenesOpen = isDrawerOpen(drawers, 'scenes');
  const lateSubmitOpen = isDrawerOpen(drawers, 'lateSubmit');

  // Late downtime manual submission drawer
  const [owingLoading, setOwingLoading] = useState(false);
  const [owingErr, setOwingErr] = useState('');
  const [owingData, setOwingData] = useState({ cycle: null, is_closed: false, available_cycles: [], owing_characters: [] });
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [selectedCharId, setSelectedCharId] = useState('');
  const [lateTitle, setLateTitle] = useState('');
  const [lateBody, setLateBody] = useState('');
  const [lateFeed, setLateFeed] = useState('');
  const [lateStatus, setLateStatus] = useState('submitted');
  const [lateIsProject, setLateIsProject] = useState(false);
  const [submittingLate, setSubmittingLate] = useState(false);
  const [lateSubmitSuccess, setLateSubmitSuccess] = useState('');

  const sceneCollapseKey = `erebus.admin.downtimes.scenes.collapsed.${authUser?.id ?? 'anon'}`;
  const [collapsedScenes, setCollapsedScenes] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem(sceneCollapseKey)) || {}; } catch { return {}; }
  });

  function toggleSceneCollapse(sceneId) {
    setCollapsedScenes(prev => {
      const next = { ...prev, [sceneId]: !prev[sceneId] };
      try { window.localStorage.setItem(sceneCollapseKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function toggleAllScenes(collapse) {
    setCollapsedScenes(prev => {
      const next = { ...prev };
      allSceneIds.forEach(id => { next[id] = collapse; });
      try { window.localStorage.setItem(sceneCollapseKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const [adminsList, setAdminsList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState('');
  const [rows, setRows] = useState([]);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatusFilter = searchParams.get('statusFilter');

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => urlStatusFilter || 'all');

  const [hideStatus, setHideStatus] = useState({
    submitted: false,
    approved: false,
    'Approved: Kikos': false,
    'Approved: Mike': false,
    rejected: true,
    'Needs a Scene': false,
    resolved: true,
    'Resolved in scene': true,
  });

  useEffect(() => {
    if (urlStatusFilter) {
      setStatusFilter(urlStatusFilter);
      if (urlStatusFilter === 'approved_st' || urlStatusFilter === 'Approved: Mike or Kikos') {
        setHideStatus(prev => ({ ...prev, 'Approved: Kikos': false, 'Approved: Mike': false }));
      } else if (urlStatusFilter === 'submitted') {
        setHideStatus(prev => ({ ...prev, submitted: false }));
      } else if (urlStatusFilter === 'Needs a Scene') {
        setHideStatus(prev => ({ ...prev, 'Needs a Scene': false }));
      } else if (urlStatusFilter === 'unassigned_resolver' || urlStatusFilter === 'resolved_mike' || urlStatusFilter === 'resolved_kikos') {
        setHideStatus(prev => ({ ...prev, resolved: false, 'Resolved in scene': false }));
      }
    }
  }, [urlStatusFilter]);

  const handleSelectStatusFilter = (val) => {
    setStatusFilter(val);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (val === 'all') p.delete('statusFilter');
      else p.set('statusFilter', val);
      return p;
    }, { replace: true });
    if (val === 'approved_st' || val === 'Approved: Mike or Kikos') {
      setHideStatus(prev => ({ ...prev, 'Approved: Kikos': false, 'Approved: Mike': false }));
    } else if (val === 'unassigned_resolver' || val === 'resolved_mike' || val === 'resolved_kikos') {
      setHideStatus(prev => ({ ...prev, resolved: false, 'Resolved in scene': false }));
    } else if (val && hideStatus[val]) {
      setHideStatus(prev => ({ ...prev, [val]: false }));
    }
  };

  const [sceneSearch, setSceneSearch] = useState({});
  const [activeSearchScene, setActiveSearchScene] = useState(null);
  const [sceneTitleBuf, setSceneTitleBuf] = useState({});
  const [sceneActionExpanded, setSceneActionExpanded] = useState({});
  // Scenes are read only until "Edit scene" is pressed; title, add player, disband, per character status/remove live behind it.
  const [editingScenes, setEditingScenes] = useState({});

  const [draggedDtId, setDraggedDtId] = useState(null);
  const [dragOverTargetId, setDragOverTargetId] = useState(null);
  const [dragOverSceneId, setDragOverSceneId] = useState(null);
  const [dragOverUnassigned, setDragOverUnassigned] = useState(false);

  const draggedDt = useMemo(() => rows.find(r => r.id === draggedDtId), [rows, draggedDtId]);
  const isDraggingAssigned = Boolean(draggedDt && draggedDt.scene_id);

  const scrollSpeedRef = useRef(0);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!draggedDtId) return;

    const scrollZone = 150;
    const maxSpeed = 24;

    const stopAutoScroll = () => {
      scrollSpeedRef.current = 0;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };

    const startAutoScroll = () => {
      if (animFrameRef.current) return;
      const step = () => {
        const speed = scrollSpeedRef.current;
        if (speed !== 0) {
          window.scrollBy({ top: speed, left: 0, behavior: 'instant' });
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          animFrameRef.current = null;
        }
      };
      animFrameRef.current = requestAnimationFrame(step);
    };

    const handleGlobalDragOver = (e) => {
      const y = e.clientY;
      const h = window.innerHeight;
      const distBottom = h - y;
      const distTop = y - 100;

      if (distBottom < scrollZone && distBottom >= 0) {
        const ratio = 1 - Math.max(0, distBottom) / scrollZone;
        scrollSpeedRef.current = Math.ceil(ratio * maxSpeed);
        startAutoScroll();
      } else if (distTop < scrollZone && y >= 0) {
        const ratio = 1 - Math.max(0, distTop) / scrollZone;
        scrollSpeedRef.current = -Math.ceil(ratio * maxSpeed);
        startAutoScroll();
      } else {
        scrollSpeedRef.current = 0;
      }
    };

    const handleGlobalWheel = (e) => {
      if (e.deltaY) {
        window.scrollBy({ top: e.deltaY, left: 0, behavior: 'instant' });
      }
    };

    window.addEventListener('dragover', handleGlobalDragOver, { capture: true, passive: true });
    window.addEventListener('wheel', handleGlobalWheel, { capture: true, passive: true });
    window.addEventListener('dragend', stopAutoScroll, { capture: true });
    window.addEventListener('drop', stopAutoScroll, { capture: true });

    return () => {
      stopAutoScroll();
      window.removeEventListener('dragover', handleGlobalDragOver, { capture: true });
      window.removeEventListener('wheel', handleGlobalWheel, { capture: true });
      window.removeEventListener('dragend', stopAutoScroll, { capture: true });
      window.removeEventListener('drop', stopAutoScroll, { capture: true });
    };
  }, [draggedDtId]);

  const [buffer, setBuffer] = useState({});

  const charById = useMemo(() => new Map(characters.map(c => [c.id, c])), [characters]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setCfgLoading(true);
      setCfgErr(''); setCfgInfo('');
      try {
        const { data } = await api.get('downtimes/config');
        if (!mounted) return;
        setDeadline(ymd(data?.downtime_deadline || ''));
        setOpening(ymd(data?.downtime_opening || ''));
        setProjectDeadline(ymd(data?.project_deadline || ''));
        setMasterPhase(data?.downtime_active_phase || 'standard');
        setMassReleaseMode(data?.downtime_mass_release_mode === 'true');
        setMassReleaseDate(data?.downtime_mass_release_date ? toLocalDateTimeInput(data.downtime_mass_release_date) : '');
      } catch (e) {
        console.error('[AdminDowntimesTab] Failed to load config', e);
        if (mounted) setCfgErr(formatApiError(e, 'Failed to load downtime config'));
      } finally {
        if (mounted) setCfgLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function onSaveConfig(instantPhaseOverride = null) {
    const phaseToSave = instantPhaseOverride || masterPhase;
    setCfgSaving(true);
    setCfgErr(''); setCfgInfo('');
    try {
      const { data } = await api.post('admin/downtimes/config', {
        downtime_deadline: deadline || null,
        downtime_opening: opening || null,
        project_deadline: projectDeadline || null,
        downtime_active_phase: phaseToSave,
        downtime_mass_release_mode: massReleaseMode,
        downtime_mass_release_date: massReleaseDate || null
      });
      setDeadline(ymd(data?.downtime_deadline || ''));
      setOpening(ymd(data?.downtime_opening || ''));
      setProjectDeadline(ymd(data?.project_deadline || ''));
      setMasterPhase(data?.downtime_active_phase || 'standard');
      setMassReleaseMode(data?.downtime_mass_release_mode === 'true');
      setMassReleaseDate(data?.downtime_mass_release_date ? toLocalDateTimeInput(data.downtime_mass_release_date) : '');
      setCfgInfo('Configuration saved successfully.');
      setTimeout(() => setCfgInfo(''), 3000);
    } catch (e) {
      console.error('[AdminDowntimesTab] Failed to save config', e);
      setCfgErr(formatApiError(e, 'Failed to save dates'));
    } finally {
      setCfgSaving(false);
    }
  }

  function handlePhaseToggle(newPhase) {
    setMasterPhase(newPhase);
    onSaveConfig(newPhase);
  }

  function onReloadConfig() {
    setCfgLoading(true);
    setCfgErr(''); setCfgInfo('');
    api.get('downtimes/config')
      .then(({ data }) => {
        setDeadline(ymd(data?.downtime_deadline || ''));
        setOpening(ymd(data?.downtime_opening || ''));
        setProjectDeadline(ymd(data?.project_deadline || ''));
        setMasterPhase(data?.downtime_active_phase || 'standard');
        setMassReleaseMode(data?.downtime_mass_release_mode === 'true');
        setMassReleaseDate(data?.downtime_mass_release_date ? toLocalDateTimeInput(data.downtime_mass_release_date) : '');
      })
      .catch(e => {
        console.error('[AdminDowntimesTab] Failed to reload config', e);
        setCfgErr(formatApiError(e, 'Failed to reload config'));
      })
      .finally(() => setCfgLoading(false));
  }

  async function loadList() {
    setListLoading(true);
    setListErr('');
    try {
      const { data } = await api.get('admin/downtimes');
      setRows((data?.downtimes || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      if (Array.isArray(data?.admins)) {
        setAdminsList(data.admins);
      }
    } catch (e) {
      console.error('[AdminDowntimesTab] Failed to load downtimes', e);
      setListErr(formatApiError(e, 'Failed to load downtimes'));
    } finally {
      setListLoading(false);
    }
  }
  useEffect(() => { loadList(); }, []);

  async function loadOwingPlayers(cycleId) {
    setOwingLoading(true);
    setOwingErr('');
    try {
      const params = {};
      if (cycleId) params.cycle_id = cycleId;
      const { data } = await api.get('admin/downtimes/owing-players', { params });
      setOwingData(data || { cycle: null, is_closed: false, available_cycles: [], owing_characters: [] });
      if (data?.cycle?.id && !cycleId) {
        setSelectedCycleId(data.cycle.id);
      }
    } catch (e) {
      console.error('[AdminDowntimesTab] Failed to load owing players', e);
      setOwingErr(formatApiError(e, 'Failed to load characters owing downtimes'));
    } finally {
      setOwingLoading(false);
    }
  }

  useEffect(() => {
    if (lateSubmitOpen) {
      loadOwingPlayers(selectedCycleId);
    }
  }, [lateSubmitOpen, selectedCycleId]);

  function handleSelectOwingChar(charId) {
    setSelectedCharId(charId);
    setLateSubmitSuccess('');
    setOwingErr('');
    if (!charId) return;
    const found = (owingData?.owing_characters || []).find(c => String(c.character_id) === String(charId));
    if (found) {
      setLateFeed(found.default_feeding_type || '');
    }
  }

  async function handleSubmitLateDowntime(e) {
    if (e) e.preventDefault();
    if (!selectedCharId) {
      setOwingErr('Please select a character who owes actions');
      return;
    }
    if (!lateTitle.trim()) {
      setOwingErr('Action title is required');
      return;
    }
    if (!lateBody.trim()) {
      setOwingErr('Action details body is required');
      return;
    }
    setSubmittingLate(true);
    setOwingErr('');
    setLateSubmitSuccess('');
    try {
      const payload = {
        character_id: Number(selectedCharId),
        title: lateTitle.trim(),
        body: lateBody.trim(),
        feeding_type: lateFeed.trim() || undefined,
        status: lateStatus,
        cycle_id: selectedCycleId || undefined,
        is_project: lateIsProject
      };
      const { data } = await api.post('admin/downtimes/force-submit', payload);
      const chosenChar = (owingData?.owing_characters || []).find(c => String(c.character_id) === String(selectedCharId));
      const charName = chosenChar?.character_name || 'Character';
      setLateSubmitSuccess(
        `Late downtime recorded for ${charName}.` + (data?.backdated ? ' Action was backdated to cycle closing date.' : '')
      );
      setLateTitle('');
      setLateBody('');
      loadList();
      loadOwingPlayers(selectedCycleId);
    } catch (err) {
      setOwingErr(formatApiError(err, 'Failed to record late action'));
    } finally {
      setSubmittingLate(false);
    }
  }

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter(r => {
      const isProj = r.title && r.title.startsWith('[PROJECT]');
      if (viewMode === 'standard' && isProj) return false;
      if (viewMode === 'project' && !isProj) return false;

      const rowStatus = String(r.status || 'submitted');
      let dropdownOk = false;
      if (statusFilter === 'all') {
        dropdownOk = true;
      } else if (statusFilter === 'approved_st' || statusFilter === 'Approved: Mike or Kikos') {
        dropdownOk = rowStatus === 'Approved: Kikos' || rowStatus === 'Approved: Mike';
      } else if (statusFilter === 'unassigned_resolver') {
        dropdownOk = (rowStatus === 'resolved' || rowStatus === 'Resolved in scene') && !r.resolved_by;
      } else if (statusFilter === 'resolved_mike') {
        dropdownOk = (rowStatus === 'resolved' || rowStatus === 'Resolved in scene') && (r.resolved_by === 3 || String(r.resolved_by_name || '').toLowerCase() === 'mike');
      } else if (statusFilter === 'resolved_kikos') {
        dropdownOk = (rowStatus === 'resolved' || rowStatus === 'Resolved in scene') && (r.resolved_by === 5 || String(r.resolved_by_name || '').toLowerCase() === 'kikos');
      } else {
        dropdownOk = rowStatus === statusFilter;
      }
      if (!dropdownOk) return false;
      if (statusFilter === 'approved_st' || statusFilter === 'Approved: Mike or Kikos' || statusFilter === 'unassigned_resolver' || statusFilter === 'resolved_mike' || statusFilter === 'resolved_kikos') {
        // Do not hide when explicitly filtering for Storyteller approvals or resolutions
      } else if (hideStatus[rowStatus]) {
        return false;
      }
      if (!qq) return true;
      const hay = `${r.title || ''} ${r.body || ''} ${r.gm_notes || ''} ${r.gm_resolution || ''} ${r.player_name || ''} ${r.char_name || ''} ${r.clan || ''} ${r.status || ''}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [rows, q, statusFilter, hideStatus, viewMode]);

  const standardFiltered = useMemo(() => {
    return filtered.filter(r => !isSceneDowntime(r));
  }, [filtered]);

  const sceneFiltered = useMemo(() => {
    return filtered.filter(r => isSceneDowntime(r));
  }, [filtered]);

  // Player card badge: only scenes still to be played ("Needs a Scene"); "Resolved in scene" is done and not counted.
  const scenesByPlayerKey = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (String(r.status || '').toLowerCase() !== 'needs a scene') continue;
      const key = r.character_id != null ? `char_${r.character_id}` : (r.user_id != null ? `user_${r.user_id}` : (r.email || r.player_name || 'Unknown Player'));
      if (!map.has(key)) map.set(key, { sceneIds: new Set(), unassigned: 0 });
      const entry = map.get(key);
      if (r.scene_id) entry.sceneIds.add(r.scene_id);
      else entry.unassigned += 1;
    }
    return map;
  }, [rows]);

  const groupedAndFiltered = useMemo(() => {
    const groups = new Map();
    for (const r of standardFiltered) {
      const key = r.character_id != null ? `char_${r.character_id}` : (r.user_id != null ? `user_${r.user_id}` : (r.email || r.player_name || 'Unknown Player'));
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          player_name: r.player_name || r.email || 'Unknown Player',
          char_name: r.char_name,
          clan: r.clan,
          character_id: r.character_id,
          user_id: r.user_id,
          email: r.email,
          has_avatar: Boolean(r.has_avatar),
          downtimes: []
        });
      }
      groups.get(key).downtimes.push(r);
    }
    return Array.from(groups.values());
  }, [standardFiltered]);

  const allSceneIds = useMemo(() => {
    const ids = new Set();
    for (const r of rows) {
      if (isSceneDowntime(r) && r.scene_id) {
        ids.add(r.scene_id);
      }
    }
    // Keep in sync with compareSceneIds in back/routes/downtimes.js: players see the same "Scene N".
    // (Stripping every non digit used to glue the random suffix's digits onto the timestamp and scramble the order.)
    const key = (id) => Number((/^scene_(\d+)/.exec(String(id)) || [])[1]) || 0;
    return Array.from(ids).sort((a, b) => (key(a) - key(b)) || String(a).localeCompare(String(b)));
  }, [rows]);

  const unassignedSceneDowntimes = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter(r => {
      if (String(r?.status || '').toLowerCase() !== 'needs a scene') return false;
      if (r.scene_id) return false;
      const isProj = r.title && r.title.startsWith('[PROJECT]');
      if (viewMode === 'standard' && isProj) return false;
      if (viewMode === 'project' && !isProj) return false;
      if (!qq) return true;
      const hay = `${r.title || ''} ${r.body || ''} ${r.gm_notes || ''} ${r.gm_resolution || ''} ${r.player_name || ''} ${r.char_name || ''} ${r.clan || ''} ${r.status || ''}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [rows, q, viewMode]);

  function getSceneTitle(sceneId) {
    if (sceneTitleBuf[sceneId] !== undefined) return sceneTitleBuf[sceneId];
    const match = rows.find(r => r.scene_id === sceneId && r.scene_title);
    if (match?.scene_title) return match.scene_title;
    // Fallback: name after the first participant's downtime action ("named after the things")
    const firstDt = rows.find(r => r.scene_id === sceneId && r.title);
    return firstDt ? autoSceneTitle(firstDt) : '';
  }

  async function handleSaveSceneTitle(sceneId) {
    const dtsInScene = rows.filter(r => r.scene_id === sceneId);
    const newTitle = sceneTitleBuf[sceneId] !== undefined ? sceneTitleBuf[sceneId] : getSceneTitle(sceneId);
    if (dtsInScene.length > 0 && dtsInScene.some(r => (r.scene_title || '') !== (newTitle || ''))) {
      try {
        await api.post('admin/downtimes/scenes/batch', {
          downtime_ids: dtsInScene.map(r => r.id),
          scene_title: newTitle || null
        });
        setRows(prev => prev.map(r => r.scene_id === sceneId ? { ...r, scene_title: newTitle || null } : r));
      } catch (e) {
        console.error('Failed to update scene title', e);
      }
    }
  }

  async function handleAddToScene(downtimeId, sceneId, title) {
    const targetTitle = title !== undefined ? title : getSceneTitle(sceneId);
    try {
      await api.patch(`admin/downtimes/${downtimeId}`, {
        scene_id: sceneId,
        scene_title: targetTitle || null
      });
      setRows(prev => prev.map(r => r.id === downtimeId ? { ...r, scene_id: sceneId, scene_title: targetTitle || null } : r));
      setActiveSearchScene(null);
      setSceneSearch(prev => ({ ...prev, [sceneId]: '' }));
    } catch (e) {
      console.error('Failed to add to scene', e);
    }
  }

  async function handleRemoveFromScene(downtimeId) {
    try {
      await api.patch(`admin/downtimes/${downtimeId}`, {
        scene_id: null,
        scene_title: null
      });
      setRows(prev => prev.map(r => r.id === downtimeId ? { ...r, scene_id: null, scene_title: null } : r));
    } catch (e) {
      console.error('Failed to remove from scene', e);
    }
  }

  async function handleDisbandScene(sceneId, label) {
    const dtsInScene = rows.filter(r => r.scene_id === sceneId);
    if (dtsInScene.length > 0 && !window.confirm(`Disband ${label}? Its ${dtsInScene.length} ${dtsInScene.length === 1 ? 'character goes' : 'characters go'} back to Unassigned.`)) return;
    if (dtsInScene.length > 0) {
      try {
        await api.post('admin/downtimes/scenes/batch', {
          downtime_ids: dtsInScene.map(r => r.id),
          scene_id: null,
          scene_title: null
        });
        setRows(prev => prev.map(r => r.scene_id === sceneId ? { ...r, scene_id: null, scene_title: null } : r));
      } catch (e) {
        console.error('Failed to disband scene', e);
      }
    }
  }

  // Header toggle: flips every action in the scene between "Needs a Scene" and "Resolved in scene".
  async function handleSetSceneStatus(sceneId, status, label) {
    const ids = rows.filter(r => r.scene_id === sceneId && isSceneDowntime(r)).map(r => r.id);
    if (ids.length === 0) return;
    const who = `${ids.length} ${ids.length === 1 ? 'character' : 'characters'}`;
    const question = status === 'Resolved in scene'
      ? `Mark ${label} as resolved? All ${who} will be set to "Resolved in scene".`
      : `Reopen ${label}? All ${who} will be set back to "Needs a Scene".`;
    if (!window.confirm(question)) return;
    try {
      await api.post('admin/downtimes/scenes/batch', { downtime_ids: ids, status });
      setRows(prev => prev.map(r => (ids.includes(r.id) ? { ...r, status } : r)));
    } catch (e) {
      console.error('Failed to update scene status', e);
    }
  }

  function getSceneCandidates(sceneId) {
    const query = (sceneSearch[sceneId] || '').trim().toLowerCase();
    return rows.filter(r => {
      if (String(r?.status || '').toLowerCase() !== 'needs a scene') return false;
      if (r.scene_id === sceneId) return false;
      if (!query) return true;
      const hay = `${r.char_name || ''} ${r.player_name || ''} ${r.clan || ''} ${r.title || ''}`.toLowerCase();
      return hay.includes(query);
    }).slice(0, 10);
  }

  function handleDragStart(e, dtId) {
    e.dataTransfer.setData('text/plain', String(dtId));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedDtId(dtId);
  }

  function handleDragEnd() {
    setDraggedDtId(null);
    setDragOverTargetId(null);
    setDragOverSceneId(null);
    setDragOverUnassigned(false);
    scrollSpeedRef.current = 0;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }

  async function handleDropOnAction(targetDtId) {
    if (!draggedDtId || draggedDtId === targetDtId) {
      handleDragEnd();
      return;
    }
    const sourceDt = rows.find(r => r.id === draggedDtId);
    const targetDt = rows.find(r => r.id === targetDtId);
    if (!sourceDt || !targetDt) {
      handleDragEnd();
      return;
    }

    if (targetDt.scene_id) {
      await handleAddToScene(sourceDt.id, targetDt.scene_id);
    } else if (sourceDt.scene_id) {
      await handleAddToScene(targetDt.id, sourceDt.scene_id);
    } else {
      const newId = newSceneId();
      const title = autoSceneTitle(targetDt) || autoSceneTitle(sourceDt);
      try {
        await api.post('admin/downtimes/scenes/batch', {
          downtime_ids: [sourceDt.id, targetDt.id],
          scene_id: newId,
          scene_title: title
        });
        setRows(prev => prev.map(r => (r.id === sourceDt.id || r.id === targetDt.id)
          ? { ...r, scene_id: newId, scene_title: title }
          : r
        ));
      } catch (e) {
        console.error('Failed to group into new scene', e);
      }
    }
    handleDragEnd();
  }

  async function handleDropOnScene(sceneId) {
    if (!draggedDtId) {
      handleDragEnd();
      return;
    }
    await handleAddToScene(draggedDtId, sceneId);
    handleDragEnd();
  }

  async function handleDropOnUnassigned() {
    if (!draggedDtId) {
      handleDragEnd();
      return;
    }
    const sourceDt = rows.find(r => r.id === draggedDtId);
    if (!sourceDt || !sourceDt.scene_id) {
      handleDragEnd();
      return;
    }
    await handleRemoveFromScene(draggedDtId);
    handleDragEnd();
  }

  function toggleHideStatus(status) {
    setHideStatus(prev => ({ ...prev, [status]: !prev[status] }));
  }

  function openBuf(r) {
    setBuffer(prev => prev[r.id] ? prev : ({
      ...prev, [r.id]: {
        status: r.status || 'submitted',
        gm_notes: r.gm_notes || '',
        gm_resolution: r.gm_resolution || '',
        resolved_by: r.resolved_by ?? '',
        saving: false,
        error: '',
        info: ''
      }
    }));
  }

  function updBuf(id, key, val) {
    setBuffer(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: val } }));
  }

  async function saveRow(id, patch = {}) {
    const merged = { ...(buffer[id] || {}), ...patch };
    if (!buffer[id]) openBuf(rows.find(x => x.id === id));

    if (patch.status !== undefined) {
      updBuf(id, 'status', patch.status);
      if (!isSceneDowntime({ status: patch.status })) {
        if (patch.scene_id === undefined) patch.scene_id = null;
        if (patch.scene_title === undefined) patch.scene_title = null;
      }
    }
    if (patch.gm_notes !== undefined) updBuf(id, 'gm_notes', patch.gm_notes);
    if (patch.gm_resolution !== undefined) updBuf(id, 'gm_resolution', patch.gm_resolution);
    if (patch.resolved_by !== undefined) updBuf(id, 'resolved_by', patch.resolved_by);
    if (patch.scene_id !== undefined) updBuf(id, 'scene_id', patch.scene_id);
    if (patch.scene_title !== undefined) updBuf(id, 'scene_title', patch.scene_title);

    updBuf(id, 'saving', true);
    updBuf(id, 'error', ''); updBuf(id, 'info', '');

    try {
      const payload = {
        status: merged.status,
        gm_notes: merged.gm_notes,
        gm_resolution: merged.gm_resolution,
        resolved_by: merged.resolved_by !== undefined && merged.resolved_by !== ''
          ? Number(merged.resolved_by)
          : (merged.resolved_by === '' ? null : undefined),
        scene_id: merged.scene_id !== undefined ? merged.scene_id : (patch.scene_id !== undefined ? patch.scene_id : undefined),
        scene_title: merged.scene_title !== undefined ? merged.scene_title : (patch.scene_title !== undefined ? patch.scene_title : undefined),
      };
      const { data } = await api.patch(`admin/downtimes/${id}`, payload);
      const updated = data?.downtime ? data.downtime : { ...rows.find(x => x.id === id), ...payload };

      setRows(prev => prev.map(x => (x.id === id ? { ...x, ...updated } : x)));
      updBuf(id, 'info', 'Saved.');

      setTimeout(() => {
        setBuffer(prev => { const next = { ...prev }; delete next[id]; return next; });
      }, 800);
    } catch (e) {
      updBuf(id, 'error', formatApiError(e, 'Save failed'));
      updBuf(id, 'saving', false);
    }
  }

  function cancelRow(id) {
    setBuffer(prev => { const next = { ...prev }; delete next[id]; return next; });
  }

  async function quickAssignResolver(id, adminId) {
    try {
      const { data } = await api.patch(`admin/downtimes/${id}`, { resolved_by: adminId });
      if (data?.downtime) {
        setRows(prev => prev.map(x => (x.id === id ? { ...x, ...data.downtime } : x)));
      }
    } catch (e) {
      console.error('Quick assign resolver failed', e);
    }
  }

  return (
    <div className={styles.stack12}>

      {/* ============ Header: view switch, schedule at a glance, settings drawer ============ */}
      <section className={styles.editorSection} style={{ borderTop: `4px solid ${viewMode === 'project' ? '#4da6ff' : 'var(--accent-purple)'}`, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div role="tablist" style={{ display: 'flex', gap: '4px', background: 'var(--glass-inset)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', maxWidth: '100%' }}>
            {[
              { id: 'standard', label: 'Monthly Actions', icon: 'event_note', bg: 'linear-gradient(135deg, var(--accent-purple-dark) 0%, var(--accent-purple) 100%)' },
              { id: 'project', label: 'Projects', icon: 'history_edu', bg: 'linear-gradient(135deg, #1b4c8c 0%, #4da6ff 100%)' },
            ].map(v => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={viewMode === v.id}
                onClick={() => setViewMode(v.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', background: viewMode === v.id ? v.bg : 'transparent', color: viewMode === v.id ? 'var(--text-color)' : 'var(--text-secondary)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{v.icon}</span>
                {v.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => setDrawer('lateSubmit')}
              aria-expanded={lateSubmitOpen}
              title="Open late downtime submission drawer for players who missed the deadline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: lateSubmitOpen ? '1px solid var(--accent-purple, #9d7cff)' : '1px dashed var(--glass-border)',
                background: lateSubmitOpen ? 'rgba(157, 124, 255, 0.15)' : 'transparent',
                color: lateSubmitOpen ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#c084fc' }}>post_add</span>
              Late submission
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{lateSubmitOpen ? 'expand_less' : 'expand_more'}</span>
            </button>

            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => setDrawer('config')}
              aria-expanded={configOpen}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>tune</span>
              Schedule & release
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{configOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
          </div>
        </div>

        {/* Live schedule at a glance (the same dates as the Calendar) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: isSubmissionOpen ? 'rgba(0, 230, 118, 0.16)' : 'rgba(255, 82, 82, 0.16)',
              border: `1px solid ${isSubmissionOpen ? 'rgba(0, 230, 118, 0.6)' : 'rgba(255, 82, 82, 0.6)'}`,
              color: isSubmissionOpen ? '#00e676' : '#ff5252',
              fontSize: '0.8rem',
              fontWeight: 800,
              boxShadow: isSubmissionOpen ? '0 0 10px rgba(0, 230, 118, 0.2)' : '0 0 10px rgba(255, 82, 82, 0.2)'
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isSubmissionOpen ? '#00e676' : '#ff5252',
                boxShadow: `0 0 6px ${isSubmissionOpen ? '#00e676' : '#ff5252'}`
              }}
            />
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              {isSubmissionOpen ? 'lock_open' : 'lock'}
            </span>
            <span>Downtimes:</span>
            <strong style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isSubmissionOpen ? 'Open' : 'Closed'}
            </strong>
          </span>

          {[
            { icon: masterPhase === 'project' ? 'history_edu' : 'event_note', label: 'Players can submit', value: masterPhase === 'project' ? 'Projects' : masterPhase === 'closed' ? 'Nothing (closed)' : 'Monthly Actions' },
            ...(viewMode === 'standard'
              ? [
                  { icon: 'lock_open_right', label: 'Opens', value: opening ? niceDate(opening) : 'Not set' },
                  { icon: 'alarm_off', label: 'Deadline', value: deadline ? niceDate(deadline) : 'Not set' },
                ]
              : [{ icon: 'alarm_off', label: 'Project deadline', value: projectDeadline ? niceDate(projectDeadline) : 'Not set' }]),
            {
              icon: 'campaign',
              label: 'Mass release',
              value: !massReleaseMode ? 'Off (resolutions show at once)' : massReleaseDate ? niceDate(massReleaseDate) : 'On, no date set',
              accent: massReleaseMode ? '#4da6ff' : null,
            },
          ].map(chip => (
            <span key={chip.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: 'var(--glass-inset)', border: `1px solid ${chip.accent ? `${chip.accent}66` : 'var(--glass-border)'}`, fontSize: '0.8rem', maxWidth: '100%' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: chip.accent || 'var(--text-secondary)' }}>{chip.icon}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{chip.label}:</span>
              <strong style={{ color: chip.accent || 'var(--text-primary)' }}>{chip.value}</strong>
            </span>
          ))}
        </div>

        {cfgLoading && <div className={styles.loading}><span className={styles.spinner} /> Loading configuration...</div>}
        {cfgErr && <div className={`${styles.alert} ${styles.alertError}`}>{cfgErr}</div>}
        {cfgInfo && <div className={`${styles.alert} ${styles.alertInfo}`}>{cfgInfo}</div>}

        {configOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--glass-inset)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div className={styles.labeledInput}>
                <span>Players can submit (saves at once)</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[{ id: 'standard', label: 'Monthly Actions' }, { id: 'project', label: 'Projects' }].map(ph => (
                    <button
                      key={ph.id}
                      type="button"
                      className={styles.btn}
                      onClick={() => handlePhaseToggle(ph.id)}
                      disabled={cfgSaving}
                      style={{ flex: 1, padding: '0.45rem 0.6rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-color)', border: `1px solid ${masterPhase === ph.id ? 'transparent' : 'var(--glass-border)'}`, background: masterPhase === ph.id ? (ph.id === 'project' ? 'linear-gradient(135deg, #1b4c8c 0%, #4da6ff 100%)' : 'linear-gradient(135deg, var(--accent-purple-dark) 0%, var(--accent-purple) 100%)') : 'rgba(255,255,255,0.03)' }}
                    >
                      {ph.label}
                    </button>
                  ))}
                </div>
              </div>

              {viewMode === 'standard' ? (
                <>
                  <label className={styles.labeledInput}>
                    <span>Downtimes open</span>
                    <EuDateInput className={styles.input} value={opening} onChange={setOpening} />
                  </label>
                  <label className={styles.labeledInput}>
                    <span>Downtime deadline</span>
                    <EuDateInput className={styles.input} value={deadline} onChange={setDeadline} />
                  </label>
                </>
              ) : (
                <label className={styles.labeledInput}>
                  <span>Long-Term Project deadline</span>
                  <EuDateInput className={styles.input} value={projectDeadline} onChange={setProjectDeadline} />
                </label>
              )}

              <div className={styles.labeledInput}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  Mass release
                  <button
                    type="button"
                    role="switch"
                    aria-checked={massReleaseMode}
                    onClick={() => setMassReleaseMode(!massReleaseMode)}
                    title="When on, resolutions stay hidden from players until the release date"
                    style={{ position: 'relative', width: '40px', height: '22px', borderRadius: '22px', border: 'none', cursor: 'pointer', background: massReleaseMode ? '#4da6ff' : 'var(--glass-border)', flexShrink: 0 }}
                  >
                    <span style={{ position: 'absolute', top: '3px', left: massReleaseMode ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--text-color)', transition: 'left 0.2s ease' }} />
                  </button>
                </span>
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={massReleaseDate}
                  onChange={(e) => setMassReleaseDate(e.target.value)}
                  disabled={!massReleaseMode}
                  title="Resolutions become visible to players at this time"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <span className={styles.subtle} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_month</span>
                Same dates as the Calendar: saving here updates the live cycle there too.
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onReloadConfig}>Reset</button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onSaveConfig()} disabled={cfgSaving}>
                  {cfgSaving ? 'Saving...' : 'Save schedule'}
                </button>
              </div>
            </div>
          </div>
        )}

        {lateSubmitOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--glass-inset)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(192, 132, 252, 0.35)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#c084fc' }}>post_add</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Record Missed Downtime Action
                  </h4>
                  <div className={styles.subtle} style={{ fontSize: '0.82rem' }}>
                    Storyteller override tool to insert actions for players after cycle closure
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setDrawer('lateSubmit', false)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Close Drawer
              </button>
            </div>

            {/* Disclaimers banner */}
            <div style={{
              background: 'rgba(157, 124, 255, 0.08)',
              border: '1px solid rgba(157, 124, 255, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.9rem 1.1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#ffcc00' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>shield</span>
                Important Disclaimers
              </div>
              <div style={{ lineHeight: 1.5 }}>
                • <strong>Backdating Guarantee:</strong> Submitting into a closed cycle automatically timestamps the action on the final day of that cycle (at 20:00). It will count in that cycle quota and archives without reopening deadlines for players.
              </div>
              <div style={{ lineHeight: 1.5 }}>
                • <strong>Owed Actions Filter:</strong> The selector below lists only characters who have submitted fewer than 3 actions for the target cycle. Players with complete quotas are omitted.
              </div>
              <div style={{ lineHeight: 1.5 }}>
                • <strong>Resolution Queue:</strong> Once created, this action immediately becomes available in the management list above for approval, scene assignment, or resolution.
              </div>
            </div>

            {/* Target Cycle and Player selection row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem', alignItems: 'end' }}>
              <label className={styles.labeledInput}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Target Downtime Cycle
                  {owingData?.is_closed && (
                    <span style={{ fontSize: '0.72rem', color: '#ff5252', fontWeight: 700, textTransform: 'uppercase' }}>
                      [Closed: Auto Backdating]
                    </span>
                  )}
                </span>
                <select
                  className={styles.select}
                  value={selectedCycleId}
                  onChange={(e) => {
                    setSelectedCycleId(e.target.value);
                    setSelectedCharId('');
                  }}
                  disabled={owingLoading}
                >
                  {(owingData?.available_cycles || []).map(c => (
                    <option key={c.id} value={c.id}>
                      {`${c.title || c.id} (${c.opening_date} to ${c.closing_date})${c.is_closed ? ' [Closed]' : ' [Active]'}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.labeledInput}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Select Player Owed Actions
                  {owingLoading && <span className={styles.spinner} style={{ width: '12px', height: '12px' }} />}
                </span>
                <select
                  className={styles.select}
                  value={selectedCharId}
                  onChange={(e) => handleSelectOwingChar(e.target.value)}
                  disabled={owingLoading || (owingData?.owing_characters || []).length === 0}
                >
                  <option value="">
                    {(owingData?.owing_characters || []).length === 0
                      ? 'No characters owe actions for this cycle'
                      : `Choose a character (${(owingData?.owing_characters || []).length} owe actions)...`}
                  </option>
                  {(owingData?.owing_characters || []).map(ch => (
                    <option key={ch.character_id} value={ch.character_id}>
                      {`${ch.character_name} (${ch.player_name || 'No player account'}, ${ch.clan}): ${ch.owed_count} missing, Feeding: ${ch.has_fed ? 'Done' : 'Not done'} (${ch.submitted_count} of 3 submitted)`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {owingErr && <div className={`${styles.alert} ${styles.alertError}`}>{owingErr}</div>}
            {lateSubmitSuccess && <div className={`${styles.alert} ${styles.alertInfo}`} style={{ borderLeft: '4px solid #00e676', color: '#00e676' }}>{lateSubmitSuccess}</div>}

            {selectedCharId && (
              <form onSubmit={handleSubmitLateDowntime} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                {(() => {
                  const ch = (owingData?.owing_characters || []).find(c => String(c.character_id) === String(selectedCharId));
                  if (!ch) return null;
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.9rem', background: 'var(--glass-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#c084fc' }}>person</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{ch.character_name}</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>({ch.clan || 'Unknown clan'}, {ch.player_name || 'No user'})</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Quota: <strong style={{ color: 'var(--text-primary)' }}>{ch.submitted_count} of 3 submitted ({ch.owed_count} missing)</strong>
                        </span>

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: ch.has_fed ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 170, 0, 0.15)',
                            border: `1px solid ${ch.has_fed ? 'rgba(0, 230, 118, 0.4)' : 'rgba(255, 170, 0, 0.4)'}`,
                            color: ch.has_fed ? '#00e676' : '#ffaa00'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                            {ch.has_fed ? 'check_circle' : 'hourglass_bottom'}
                          </span>
                          Feeding: {ch.has_fed ? 'Completed (Unlocked)' : 'Not done (Overridden by Storyteller)'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem' }}>
                  <label className={styles.labeledInput}>
                    <span>Action Title</span>
                    <input
                      className={styles.input}
                      value={lateTitle}
                      onChange={(e) => setLateTitle(e.target.value)}
                      placeholder="Title of the endeavor"
                      required
                    />
                  </label>

                  <label className={styles.labeledInput}>
                    <span>Feeding Type</span>
                    <input
                      className={styles.input}
                      value={lateFeed}
                      onChange={(e) => setLateFeed(e.target.value)}
                      placeholder="Autodetected from predator type"
                    />
                  </label>

                  <label className={styles.labeledInput}>
                    <span>Initial Status</span>
                    <select
                      className={styles.select}
                      value={lateStatus}
                      onChange={(e) => setLateStatus(e.target.value)}
                    >
                      <option value="submitted">submitted (pending review)</option>
                      <option value="Approved: Mike">Approved: Mike</option>
                      <option value="Approved: Kikos">Approved: Kikos</option>
                      <option value="approved">approved (general)</option>
                      <option value="Needs a Scene">Needs a Scene</option>
                    </select>
                  </label>

                  <div className={styles.labeledInput}>
                    <span>Submission Type</span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '38px', color: 'var(--text-primary)' }}>
                      <input
                        type="checkbox"
                        checked={lateIsProject}
                        onChange={(e) => setLateIsProject(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>Mark as Long Term Project</span>
                    </label>
                  </div>
                </div>

                <label className={styles.labeledInput}>
                  <span>Action Details / Narrative Body</span>
                  <textarea
                    className={styles.textarea}
                    rows={4}
                    value={lateBody}
                    onChange={(e) => setLateBody(e.target.value)}
                    placeholder="Enter what the player attempts to accomplish and how..."
                    required
                  />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => {
                      setLateTitle('');
                      setLateBody('');
                      setOwingErr('');
                      setLateSubmitSuccess('');
                    }}
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    disabled={submittingLate || !lateTitle.trim() || !lateBody.trim()}
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-purple-dark) 0%, var(--accent-purple) 100%)',
                      color: '#fff',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                    {submittingLate ? 'Recording Action...' : 'Record Late Action'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      {/* ============ Admin List Panel ============ */}
      <section className={styles.editorSection}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: 0, color: 'var(--accent-purple)', fontSize: '1.4rem', fontWeight: 800 }}>
            {viewMode === 'standard' ? 'Downtimes' : 'Projects'}
          </h4>
          <div className={styles.subtle}>View and manage submitted downtimes and projects.</div>
        </div>

        <div className={styles.rMainSide} style={{ alignItems: 'end', marginBottom: '1.5rem' }}>
          <label className={styles.labeledInput}>
            <span>Search</span>
            <input className={styles.input} placeholder="Search by character, action detail, clan..." value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className={styles.labeledInput}>
            <span>Filter by Status</span>
            <select className={styles.select} value={statusFilter} onChange={(e) => handleSelectStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="approved_st">Only Approved: Mike or Kikos</option>
              <option value="unassigned_resolver">Resolved: Unassigned Resolver</option>
              <option value="resolved_mike">Resolved: Mike</option>
              <option value="resolved_kikos">Resolved: Kikos</option>
              {STATUS.map(s => <option key={s} value={s}>{`Only ${s}`}</option>)}
            </select>
          </label>
        </div>

        <div className={styles.filterToggleGrid} style={{ background: 'var(--glass-inset)', padding: '1.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', display: 'flex', flexWrap: 'wrap', gap: '1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }}>
          {STATUS.map(st => (
            <StatusToggle key={st} status={st} checked={hideStatus[st]} onChange={() => toggleHideStatus(st)} />
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { setQ(''); handleSelectStatusFilter('all'); }}>Clear Filters</button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadList}>Refresh</button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{
              background: '#ffcc00',
              color: '#1a1400',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              boxShadow: '0 2px 12px rgba(255, 204, 0, 0.35)',
              cursor: 'pointer',
              padding: '0.55rem 1.25rem',
              borderRadius: 'var(--radius-sm)'
            }}
            onClick={() => {
              setDrawer('scenes', true);
              requestAnimationFrame(() => document.getElementById('scenes-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#1a1400' }}>theaters</span>
            Take me to scenes
          </button>
        </div>

        {listErr && <div className={`${styles.alert} ${styles.alertError}`} style={{ marginTop: '1.5rem' }}>{listErr}</div>}
        {listLoading && <div className={styles.loading} style={{ marginTop: '1.5rem' }}><span className={styles.spinner} /> Loading...</div>}

        {/* Resolution Summary Bar */}
        {!listLoading && rows.length > 0 && (() => {
          const counts = {};
          rows.forEach(r => {
            const s = r.status || 'submitted';
            counts[s] = (counts[s] || 0) + 1;
          });
          const stApprovedCount = (counts['Approved: Kikos'] || 0) + (counts['Approved: Mike'] || 0);
          const unassignedResolverCount = rows.filter(r => (r.status === 'resolved' || r.status === 'Resolved in scene') && !r.resolved_by).length;
          const resolvedMikeCount = rows.filter(r => (r.status === 'resolved' || r.status === 'Resolved in scene') && (r.resolved_by === 3 || String(r.resolved_by_name || '').toLowerCase() === 'mike')).length;
          const resolvedKikosCount = rows.filter(r => (r.status === 'resolved' || r.status === 'Resolved in scene') && (r.resolved_by === 5 || String(r.resolved_by_name || '').toLowerCase() === 'kikos')).length;
          const QUICK_FILTERS = [
            { label: 'All', value: 'all', color: 'var(--text-secondary)', bg: 'var(--glass-inset)' },
            { label: 'Submitted', value: 'submitted', color: '#9d7cff', bg: 'rgba(157,124,255,0.12)' },
            { label: 'Appr: Mike or Kikos', value: 'approved_st', color: '#c084fc', bg: 'rgba(192,132,252,0.14)', customCount: stApprovedCount },
            { label: 'Approved', value: 'approved', color: '#00e676', bg: 'rgba(0,230,118,0.1)' },
            { label: 'Appr: Kikos', value: 'Approved: Kikos', color: '#00ff88', bg: 'rgba(0, 255, 136, 0.14)' },
            { label: 'Appr: Mike', value: 'Approved: Mike', color: '#00e5ff', bg: 'rgba(0, 229, 255, 0.14)' },
            { label: 'Needs Scene', value: 'Needs a Scene', color: '#ffcc00', bg: 'rgba(255,204,0,0.1)' },
            { label: 'Resolved', value: 'resolved', color: '#4da6ff', bg: 'rgba(77,166,255,0.1)' },
            { label: 'Unassigned Resolver', value: 'unassigned_resolver', color: '#f59e0b', bg: 'rgba(245,158,11,0.14)', customCount: unassignedResolverCount },
            { label: 'Resolved: Mike', value: 'resolved_mike', color: '#38bdf8', bg: 'rgba(56,189,248,0.14)', customCount: resolvedMikeCount },
            { label: 'Resolved: Kikos', value: 'resolved_kikos', color: '#34d399', bg: 'rgba(52,211,153,0.14)', customCount: resolvedKikosCount },
            { label: 'Scene Done', value: 'Resolved in scene', color: '#4da6ff', bg: 'rgba(77,166,255,0.08)' },
            { label: 'Rejected', value: 'rejected', color: '#ff5252', bg: 'rgba(255,82,82,0.1)' },
          ];
          const totalFiltered = viewMode === 'standard'
            ? rows.filter(r => !r.title?.startsWith('[PROJECT]')).length
            : rows.filter(r => r.title?.startsWith('[PROJECT]')).length;

          return (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Summary stat chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Overview:
                </span>
                {QUICK_FILTERS.filter(f => f.value !== 'all' && (f.customCount !== undefined ? f.customCount > 0 : counts[f.value] > 0)).map(f => {
                  const cnt = f.customCount !== undefined ? f.customCount : (counts[f.value] || 0);
                  return (
                    <span key={f.value} style={{
                      background: f.bg, border: `1px solid ${f.color}`,
                      color: f.color, borderRadius: '20px', padding: '3px 12px',
                      fontSize: '0.8rem', fontWeight: 700,
                    }}>
                      {f.label}: {cnt}
                    </span>
                  );
                })}
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {totalFiltered} total
                </span>
              </div>
              {/* Quick-filter pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {QUICK_FILTERS.map(f => {
                  const cnt = f.customCount !== undefined ? f.customCount : counts[f.value];
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => handleSelectStatusFilter(f.value)}
                      style={{
                        background: statusFilter === f.value ? f.bg : 'var(--glass-inset)',
                        border: `1px solid ${statusFilter === f.value ? f.color : 'var(--glass-border)'}`,
                        color: statusFilter === f.value ? f.color : 'var(--text-muted)',
                        borderRadius: '20px', padding: '4px 14px', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
                        boxShadow: statusFilter === f.value ? `0 0 8px ${f.color}44` : 'none',
                      }}
                    >
                      {f.label}{f.value !== 'all' && cnt ? ` (${cnt})` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {!listLoading && (
          <div style={{ display: 'grid', gap: '2rem', marginTop: '2rem' }}>
            {groupedAndFiltered.length === 0 && (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--glass-inset)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--glass-border)', opacity: 0.7 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem', color: 'var(--text-muted)' }}>inventory_2</span>
                <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.3rem' }}>No data matching parameters</h3>
                <p className={styles.subtle} style={{ marginTop: '0.4rem' }}>Change your search or filters to see more results.</p>
              </div>
            )}

            {groupedAndFiltered.map(group => {
              const clanAccent = (group.clan && CLAN_ACCENTS[group.clan]) || CLAN_COLORS[group.clan] || 'var(--accent-purple)';
              const clanSurface = (group.clan && CLAN_SURFACES[group.clan]) || 'rgba(30, 20, 45, 0.7)';
              const clanLogoUrl = symlogo(group.clan);
              const clanWhiteLogoUrl = symlogoWhite(group.clan);
              return (
                <div
                  key={group.key || group.character_id || group.player_name}
                  className={styles.playerDowntimeGroup}
                  style={{
                    '--clan-color': clanAccent,
                    '--clan-logo-url': clanLogoUrl ? `url(${clanLogoUrl})` : 'none',
                    background: 'rgba(10, 10, 15, 0.4)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    borderLeft: `6px solid ${clanAccent}`,
                    backdropFilter: 'var(--glass-blur)'
                  }}
                >
                  <header style={{ padding: '1rem 1.25rem', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        position: 'relative',
                        flexShrink: 0,
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        border: `2px solid ${clanAccent}`,
                        boxShadow: `0 0 14px ${clanAccent}44`,
                        overflow: 'hidden',
                        background: 'rgba(15, 12, 25, 0.8)',
                        cursor: group.character_id ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (group.character_id) navigate(`/admin/character/${group.character_id}`);
                      }}
                      title={group.character_id ? `Open sheet for ${group.char_name || 'Character'}` : undefined}
                    >
                      <Avatar
                        userId={group.user_id}
                        hasAvatar={group.has_avatar}
                        clan={group.clan}
                        size={48}
                        style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                        fallback={clanWhiteLogoUrl || '/img/ATT-logo(1).webp'}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '1.2rem',
                            color: 'var(--text-color)',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            overflowWrap: 'anywhere',
                            cursor: group.character_id ? 'pointer' : 'default',
                          }}
                          onClick={() => {
                            if (group.character_id) navigate(`/admin/character/${group.character_id}`);
                          }}
                          title={group.character_id ? `Open sheet for ${group.char_name || 'Character'}` : undefined}
                        >
                          {group.char_name || '(No Character)'}
                        </span>
                        {group.character_id && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>
                            #{group.character_id}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                        {clanWhiteLogoUrl && (
                          <img
                            src={clanWhiteLogoUrl}
                            alt={group.clan || 'Clan'}
                            style={{ width: '16px', height: '16px', objectFit: 'contain', opacity: 0.9 }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <span style={{ fontSize: '0.85rem', color: clanAccent, fontWeight: 700 }}>
                          {group.clan || 'Unknown Clan'}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>•</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'Fira Code, monospace', opacity: 0.85 }}>
                          {group.player_name}
                        </span>
                        {scenesByPlayerKey.has(group.key) && (() => {
                          const pending = scenesByPlayerKey.get(group.key);
                          const parts = [...pending.sceneIds]
                            .map(id => {
                              const idx = allSceneIds.indexOf(id);
                              const title = getSceneTitle(id);
                              return title ? `Scene: ${title} (Scene ID: ${idx >= 0 ? idx + 1 : '?'})` : `Scene ID: ${idx >= 0 ? idx + 1 : '?'}`;
                            });
                          if (pending.unassigned) parts.push(`${pending.unassigned} not yet in a scene`);
                          return (
                          <span
                            style={{
                              fontSize: '0.78rem',
                              color: '#ffcc00',
                              background: 'rgba(255, 204, 0, 0.12)',
                              border: '1px solid rgba(255, 204, 0, 0.3)',
                              borderRadius: '12px',
                              padding: '2px 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Actions requiring scenes are managed in the Modern Event Scenes section below"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>theaters</span>
                            {parts.join(', ')} below
                          </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <SheetPdfButton
                      character={charById.get(group.character_id)}
                      style={{ padding: '7px 14px', fontSize: '0.8rem', borderRadius: '24px', gap: '6px' }}
                    />
                    {clanWhiteLogoUrl && (
                      <div
                        style={{
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          background: `linear-gradient(135deg, ${clanSurface} 0%, rgba(10, 10, 16, 0.9) 100%)`,
                          padding: '6px 14px',
                          borderRadius: '24px',
                          border: `1px solid ${clanAccent}55`,
                          boxShadow: `0 0 16px ${clanAccent}25, inset 0 1px 0 rgba(255, 255, 255, 0.15)`,
                        }}
                        title={`${group.clan || 'Clan'} Crest`}
                      >
                        <img
                          src={clanWhiteLogoUrl}
                          alt={group.clan || 'Clan'}
                          style={{ width: '22px', height: '22px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <span
                          style={{
                            color: clanAccent,
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            fontFamily: 'Fira Code, monospace',
                            textShadow: `0 0 10px ${clanAccent}55`,
                          }}
                        >
                          {group.clan}
                        </span>
                      </div>
                    )}
                    </div>
                  </header>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {group.downtimes.map(r => (
                      <DowntimeEditorRow
                        key={r.id}
                        r={r}
                        editBuffer={buffer[r.id]}
                        onOpen={openBuf}
                        onUpdate={updBuf}
                        onSave={saveRow}
                        onCancel={cancelRow}
                        adminsList={adminsList}
                        onQuickAssign={quickAssignResolver}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ============ Needs Scene : Modern Event Scenes Section ============ */}
        {/* scrollMarginTop: the site Nav and admin topbar are both sticky, so a plain scrollIntoView parks the header underneath them */}
        <div id="scenes-section" style={{ marginTop: '3.5rem', borderTop: '2px solid rgba(255, 204, 0, 0.35)', paddingTop: '2.5rem', scrollMarginTop: 'calc(var(--nav-h, 64px) + var(--topbar-h, 60px) + 12px)' }}>
          <div
            role="button"
            tabIndex={0}
            aria-expanded={scenesOpen}
            onClick={() => setDrawer('scenes')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDrawer('scenes'); } }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: scenesOpen ? '1.5rem' : 0, cursor: 'pointer' }}
          >
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 204, 0, 0.12)', border: '1px solid rgba(255, 204, 0, 0.35)', borderRadius: '20px', padding: '4px 14px', marginBottom: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#ffcc00' }}>theaters</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffcc00', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Event Management</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                Needs Scene : Modern Event Scenes
              </h3>
              <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                All actions marked as Needs a Scene or Resolved in scene, organized into group scenes for the upcoming event.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {allSceneIds.length > 0 && scenesOpen && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const allCollapsed = allSceneIds.every(id => Boolean(collapsedScenes[id]));
                    toggleAllScenes(!allCollapsed);
                  }}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)' }}
                  title={allSceneIds.every(id => Boolean(collapsedScenes[id])) ? 'Expand all scenes' : 'Collapse all scenes'}
                >
                  {allSceneIds.every(id => Boolean(collapsedScenes[id])) ? 'Expand all scenes' : 'Collapse all scenes'}
                </button>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#ffcc00' }}>
                {allSceneIds.length} {allSceneIds.length === 1 ? 'scene' : 'scenes'}
                {unassignedSceneDowntimes.length > 0 && ` · ${unassignedSceneDowntimes.length} unassigned`}
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{scenesOpen ? 'expand_less' : 'expand_more'}</span>
              </span>
            </div>
          </div>

          {scenesOpen && (<>

          {/* Unassigned tray. Shown whenever any scene exists (not only when it has cards) so it is always
              there as the "unassign" drop zone, and does not pop in mid-drag and shove the scenes down. */}
          {(unassignedSceneDowntimes.length > 0 || allSceneIds.length > 0) && (
            <div
              style={{
                position: 'relative',
                background: dragOverUnassigned ? 'rgba(255, 82, 82, 0.12)' : 'rgba(255, 204, 0, 0.05)',
                border: '1px dashed rgba(255, 204, 0, 0.4)',
                outline: dragOverUnassigned ? '2px dashed #ff5252' : 'none',
                outlineOffset: '-2px',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                marginBottom: '2rem',
                transition: 'background 0.2s ease'
              }}
              onDragOver={(e) => {
                // Only an action that is currently in a scene can be dropped here (to unassign it).
                if (isDraggingAssigned) {
                  e.preventDefault();
                  setDragOverUnassigned(true);
                }
              }}
              onDragLeave={(e) => { if (leftDropZone(e)) setDragOverUnassigned(false); }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnUnassigned();
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: '#ffcc00', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.3rem', color: '#ffcc00' }}>pending_actions</span>
                  Unassigned Scene Actions ({unassignedSceneDowntimes.length})
                </h4>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Drag onto another character to group into a scene, or drag into a scene below
                </span>
              </div>

              {dragOverUnassigned && isDraggingAssigned && (
                <DropHint icon="person_remove" text="Drop here to unassign and remove from scene" color="#ff5252" />
              )}

              <div style={{ display: 'grid', gap: '0.85rem' }}>
                {unassignedSceneDowntimes.length === 0 && (
                  <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Every scene action is assigned. Drag a character here to take them out of their scene.
                  </div>
                )}
                {unassignedSceneDowntimes.map(dt => {
                  const isBeingDragged = draggedDtId === dt.id;
                  const isDropTarget = dragOverTargetId === dt.id;
                  const isExpanded = sceneActionExpanded[dt.id];

                  return (
                    <div
                      key={dt.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, dt.id)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        if (!isControlClick(e)) setSceneActionExpanded(prev => ({ ...prev, [dt.id]: !prev[dt.id] }));
                      }}
                      onDragOver={(e) => {
                        // Unassigned onto unassigned = form a new scene. Assigned cards fall through to the tray (unassign).
                        if (draggedDt && !draggedDt.scene_id && draggedDtId !== dt.id) {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverTargetId(dt.id);
                        }
                      }}
                      onDragLeave={(e) => {
                        if (leftDropZone(e)) setDragOverTargetId(prev => (prev === dt.id ? null : prev));
                      }}
                      onDrop={(e) => {
                        if (dragOverTargetId !== dt.id) return; // not ours, let the tray handle it
                        e.preventDefault();
                        e.stopPropagation();
                        handleDropOnAction(dt.id);
                      }}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        background: isDropTarget ? 'rgba(255, 204, 0, 0.18)' : 'rgba(0, 0, 0, 0.45)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        outline: isDropTarget ? '2px dashed #ffcc00' : 'none',
                        outlineOffset: '-1px',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.85rem 1.25rem',
                        opacity: isBeingDragged ? 0.35 : 1,
                        transition: 'background 0.15s ease, opacity 0.15s ease',
                        cursor: 'grab'
                      }}
                    >
                      {isDropTarget && <DropHint icon="group_add" text="Drop to group together into a new scene" />}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px' }}>
                        <span
                          className="material-symbols-outlined"
                          style={{ color: '#ffcc00', opacity: 0.85, fontSize: '1.3rem', cursor: 'grab' }}
                          title="Drag onto another character to group into a scene"
                        >
                          drag_indicator
                        </span>
                        <span style={{ fontWeight: 800, color: '#ffcc00', fontFamily: 'Fira Code, monospace', fontSize: '0.9rem' }}>#{dt.id}</span>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{dt.char_name || 'Character'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dt.clan || 'Unknown Clan'} • {dt.player_name || dt.email}</div>
                        </div>
                      </div>

                      <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {dt.title}
                          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }} title={isExpanded ? 'Hide details' : 'Show details'}>
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                        {!isExpanded && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }}>{dt.body}</div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <SheetPdfButton character={charById.get(dt.character_id)} />
                        <select
                          className={styles.select}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            width: 'auto',
                            ...getStatusBadgeStyle(buffer[dt.id]?.status ?? dt.status)
                          }}
                          value={buffer[dt.id]?.status ?? dt.status}
                          disabled={buffer[dt.id]?.saving}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            saveRow(dt.id, { status: e.target.value, scene_id: null, scene_title: null });
                          }}
                          title="Change status: selecting submitted or approved removes this action from scenes"
                        >
                          <option value="Needs a Scene">Needs a Scene</option>
                          <option value="Resolved in scene">Resolved in scene</option>
                          <option value="submitted">Submitted</option>
                          <option value="approved">Approved</option>
                          <option value="Approved: Kikos">Approved: Kikos</option>
                          <option value="Approved: Mike">Approved: Mike</option>
                          <option value="rejected">Rejected</option>
                          <option value="resolved">Resolved</option>
                        </select>
                        {allSceneIds.length > 0 && (
                          <select
                            className={styles.select}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', background: 'var(--glass-inset)', width: 'auto' }}
                            value=""
                            onChange={(e) => { if (e.target.value) handleAddToScene(dt.id, e.target.value); }}
                          >
                            <option value="" disabled>Assign to Scene...</option>
                            {allSceneIds.map((sid, sIdx) => {
                              const sTitle = getSceneTitle(sid);
                              return (
                                <option key={sid} value={sid}>
                                  {sTitle ? `Scene: ${sTitle} (Scene ID: ${sIdx + 1})` : `Scene (Scene ID: ${sIdx + 1})`}
                                </option>
                              );
                            })}
                          </select>
                        )}
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnSmall}`}
                          onClick={() => handleAddToScene(dt.id, newSceneId(), autoSceneTitle(dt))}
                          title="Start a new scene with this character, named after their downtime. Drag others onto it to join."
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 800, background: 'rgba(255, 204, 0, 0.15)', color: '#ffcc00', border: '1px solid rgba(255, 204, 0, 0.45)', borderRadius: 'var(--radius-sm)' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add_circle</span>
                          New scene
                        </button>
                      </div>

                      {buffer[dt.id]?.saving && <div style={{ color: '#ffcc00', fontSize: '0.8rem', width: '100%' }}>Saving status...</div>}
                      {buffer[dt.id]?.error && <div style={{ color: '#ff5252', fontSize: '0.8rem', width: '100%' }}>{buffer[dt.id]?.error}</div>}

                      {isExpanded && <SceneActionDetails r={dt} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* Grouped Scenes Grid */}
          <div style={{ display: 'grid', gap: '2rem' }}>
            {allSceneIds.length === 0 && unassignedSceneDowntimes.length === 0 && (
              <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'var(--glass-inset)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--glass-border)', opacity: 0.7 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#ffcc00', display: 'block', marginBottom: '0.75rem' }}>theaters</span>
                <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.25rem' }}>No Active Scenes Required</h4>
                <p className={styles.subtle} style={{ marginTop: '0.35rem' }}>
                  When actions are marked as Needs a Scene or Resolved in scene, they will appear here to be grouped and planned together.
                </p>
              </div>
            )}

            {allSceneIds.map((sceneId, sceneIndex) => {
              const dtsInScene = rows.filter(r => isSceneDowntime(r) && r.scene_id === sceneId);
              const sceneTitle = getSceneTitle(sceneId);
              const isSearchOpen = activeSearchScene === sceneId;
              const candidates = getSceneCandidates(sceneId);
              const isSceneDropTarget = dragOverSceneId === sceneId;
              const sceneResolved = dtsInScene.length > 0 && dtsInScene.every(r => r.status === 'Resolved in scene');
              const isEditing = Boolean(editingScenes[sceneId]);
              const isCollapsed = Boolean(collapsedScenes[sceneId]);
              const sceneLabel = formatSceneLabel(sceneId, sceneIndex, sceneTitle);
              const characterNames = Array.from(new Set(dtsInScene.map(r => r.char_name || r.player_name || 'Character')));

              return (
                <div
                  key={sceneId}
                  className={styles.sceneGroupCard}
                  onDragOver={(e) => {
                    // Dropping a character back into the scene it is already in is a no-op, so don't offer it.
                    if (draggedDt && draggedDt.scene_id !== sceneId) {
                      e.preventDefault();
                      setDragOverSceneId(sceneId);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (leftDropZone(e)) setDragOverSceneId(prev => (prev === sceneId ? null : prev));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropOnScene(sceneId);
                  }}
                  style={{
                    position: 'relative',
                    // outline, not border: swapping the 5px left border for a dashed one shifted the whole card
                    outline: isSceneDropTarget ? '2px dashed #ffcc00' : 'none',
                    outlineOffset: '-2px',
                    background: isSceneDropTarget ? 'rgba(255, 204, 0, 0.08)' : undefined,
                    transition: 'background 0.2s ease'
                  }}
                >
                  {/* Scene Block Header */}
                  <div
                    className={styles.sceneHeader}
                    style={{
                      cursor: 'pointer',
                      borderBottom: isCollapsed ? 'none' : '1px solid var(--glass-border)',
                      paddingBottom: isCollapsed ? 0 : '0.75rem',
                      userSelect: 'none'
                    }}
                    onClick={(e) => {
                      if (!isControlClick(e)) {
                        toggleSceneCollapse(sceneId);
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: '1 1 300px', minWidth: 0 }}>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '1.3rem',
                          color: '#ffcc00',
                          transition: 'transform 0.2s ease',
                          transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                          flexShrink: 0
                        }}
                        title={isCollapsed ? 'Click to expand scene' : 'Click to collapse scene'}
                      >
                        expand_more
                      </span>

                      <span className={styles.sceneBadge}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#ffcc00' }}>theaters</span>
                        Scene
                      </span>

                      {isEditing ? (
                        <input
                          type="text"
                          className={styles.input}
                          style={{ flex: '1 1 240px', background: 'rgba(0, 0, 0, 0.4)', borderColor: 'rgba(255, 204, 0, 0.3)', padding: '0.35rem 0.75rem', fontSize: '0.95rem', fontWeight: 700 }}
                          placeholder="Scene title: e.g. Elysium Confrontation (optional)"
                          value={sceneTitleBuf[sceneId] !== undefined ? sceneTitleBuf[sceneId] : sceneTitle}
                          onChange={(e) => setSceneTitleBuf(prev => ({ ...prev, [sceneId]: e.target.value }))}
                          onBlur={() => handleSaveSceneTitle(sceneId)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                          title="Saves automatically when you click away or press Enter"
                        />
                      ) : (
                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: sceneTitle ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: sceneTitle ? 'normal' : 'italic' }}>
                          {sceneTitle || 'Untitled scene'}
                        </span>
                      )}

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: '#ffcc00',
                          background: 'rgba(255, 204, 0, 0.12)',
                          border: '1px solid rgba(255, 204, 0, 0.3)',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                        title={`Scene index in event: ${sceneIndex + 1}`}
                      >
                        Scene ID: {sceneIndex + 1}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {isCollapsed ? (
                        <span
                          style={{
                            fontSize: '0.82rem',
                            color: '#ffcc00',
                            fontWeight: 700,
                            background: 'rgba(255, 204, 0, 0.1)',
                            border: '1px solid rgba(255, 204, 0, 0.25)',
                            borderRadius: '12px',
                            padding: '3px 10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap',
                            whiteSpace: 'normal',
                            lineHeight: '1.4'
                          }}
                          title={characterNames.length > 0 ? characterNames.join(', ') : 'No characters in scene'}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#ffcc00', flexShrink: 0 }}>groups</span>
                          <span>{characterNames.length > 0 ? characterNames.join(', ') : 'No characters'}</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                          {dtsInScene.length} {dtsInScene.length === 1 ? 'Character' : 'Characters'}
                        </span>
                      )}
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSmall}`}
                        disabled={dtsInScene.length === 0}
                        onClick={() => handleSetSceneStatus(sceneId, sceneResolved ? 'Needs a Scene' : 'Resolved in scene', sceneLabel)}
                        title={sceneResolved ? 'Click to reopen: set everyone back to Needs a Scene' : 'Mark every character in this scene as Resolved in scene'}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 800, borderRadius: 'var(--radius-sm)',
                          background: sceneResolved ? 'rgba(0, 230, 118, 0.15)' : '#ffcc00',
                          color: sceneResolved ? '#00e676' : '#1a1400',
                          border: sceneResolved ? '1px solid rgba(0, 230, 118, 0.45)' : '1px solid #ffcc00'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{sceneResolved ? 'check_circle' : 'task_alt'}</span>
                        {sceneResolved ? 'Resolved in scene' : 'Mark resolved in scene'}
                      </button>
                      {isEditing && (
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                          onClick={() => handleDisbandScene(sceneId, sceneLabel)}
                        >
                          Disband Scene
                        </button>
                      )}
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                        onClick={() => {
                          // Everything already saves as you go; Save just flushes a title still being typed and closes edit mode.
                          if (isEditing) {
                            handleSaveSceneTitle(sceneId);
                            setActiveSearchScene(prev => (prev === sceneId ? null : prev));
                          } else {
                            setCollapsedScenes(prev => ({ ...prev, [sceneId]: false }));
                          }
                          setEditingScenes(prev => ({ ...prev, [sceneId]: !isEditing }));
                        }}
                        title={isEditing ? 'Changes save automatically: this closes editing' : 'Rename, add or remove characters, change status, disband'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{isEditing ? 'check' : 'edit'}</span>
                        {isEditing ? 'Save' : 'Edit scene'}
                      </button>
                    </div>
                  </div>

                  {isSceneDropTarget && (
                    <DropHint icon="add_task" text={`Drop character here to add to ${sceneLabel}`} />
                  )}

                  {!isCollapsed && (<>

                  {/* Scene with Search Autocomplete Bar (edit mode only) */}
                  {isEditing && (
                  <div className={styles.sceneSearchWrapper}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', color: '#ffcc00', fontSize: '1.2rem', pointerEvents: 'none' }}>
                        person_add
                      </span>
                      <input
                        type="text"
                        className={styles.input}
                        style={{ padding: '0.35rem 0.75rem 0.35rem 2.5rem', fontSize: '0.85rem', background: 'rgba(0, 0, 0, 0.55)', borderColor: isSearchOpen ? '#ffcc00' : 'var(--glass-border)' }}
                        placeholder="Add another player with a scene to this scene: search by name, clan or action..."
                        value={sceneSearch[sceneId] || ''}
                        onFocus={() => setActiveSearchScene(sceneId)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSceneSearch(prev => ({ ...prev, [sceneId]: val }));
                          setActiveSearchScene(sceneId);
                        }}
                      />
                      {isSearchOpen && (
                        <button
                          type="button"
                          onClick={() => setActiveSearchScene(null)}
                          style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          title="Close suggestions"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                        </button>
                      )}
                    </div>

                    {isSearchOpen && (
                      <div className={styles.sceneSearchResults}>
                        <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#ffcc00', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255, 255, 255, 0.07)', background: 'rgba(0,0,0,0.3)' }}>
                          Eligible Scene Participants (Only characters with scenes appear)
                        </div>
                        {candidates.length === 0 ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No other characters with pending scene actions found.
                          </div>
                        ) : (
                          candidates.map(cand => (
                            <div
                              key={cand.id}
                              className={styles.sceneSearchItem}
                              onClick={() => handleAddToScene(cand.id, sceneId)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid #ffcc00' }}>
                                  <Avatar
                                    userId={cand.user_id}
                                    hasAvatar={cand.has_avatar}
                                    clan={cand.clan}
                                    size={32}
                                    fallback={symlogoWhite(cand.clan) || '/img/ATT-logo(1).webp'}
                                  />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    {cand.char_name || 'Character'}
                                    <span style={{ fontSize: '0.8rem', color: '#ffcc00', fontWeight: 600, marginLeft: '6px' }}>[{cand.clan || 'Clan'}]</span>
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    #{cand.id}: {cand.title} • {cand.player_name || cand.email}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                {cand.scene_id && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>
                                    Currently in {formatSceneLabel(cand.scene_id, allSceneIds.indexOf(cand.scene_id) >= 0 ? allSceneIds.indexOf(cand.scene_id) : null, getSceneTitle(cand.scene_id))}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                                  style={{ padding: '3px 10px', fontSize: '0.78rem', background: '#ffcc00', color: '#1a1400', fontWeight: 800 }}
                                >
                                  Add to Scene
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  )}

                  {/* List of Characters and Actions in this Scene */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                    {dtsInScene.length === 0 ? (
                      <div style={{ padding: '1.8rem', textAlign: 'center', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(255, 204, 0, 0.2)' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          No characters added to this scene yet. Drag characters here, or press Edit scene and use the search.
                        </span>
                      </div>
                    ) : (
                      dtsInScene.map(r => {
                        const isExpanded = sceneActionExpanded[r.id];
                        const isBeingDragged = draggedDtId === r.id;
                        const isCharDropTarget = dragOverTargetId === r.id;
                        const rowErr = buffer[r.id]?.error;

                        return (
                          <div
                            key={r.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, r.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => {
                              if (draggedDt && draggedDt.scene_id !== r.scene_id) {
                                e.preventDefault();
                                // Handled here: keep the parent scene from also lighting up / also receiving the drop.
                                e.stopPropagation();
                                setDragOverSceneId(null);
                                setDragOverTargetId(r.id);
                              }
                            }}
                            onDragLeave={(e) => {
                              if (leftDropZone(e)) setDragOverTargetId(prev => (prev === r.id ? null : prev));
                            }}
                            onDrop={(e) => {
                              if (dragOverTargetId !== r.id) return; // not ours, let the scene block handle it
                              e.preventDefault();
                              e.stopPropagation();
                              handleDropOnAction(r.id);
                            }}
                            onClick={(e) => {
                              if (!isControlClick(e)) setSceneActionExpanded(prev => ({ ...prev, [r.id]: !prev[r.id] }));
                            }}
                            style={{
                              position: 'relative',
                              background: isCharDropTarget ? 'rgba(255, 204, 0, 0.2)' : 'rgba(0, 0, 0, 0.45)',
                              border: '1px solid rgba(255, 204, 0, 0.2)',
                              outline: isCharDropTarget ? '2px dashed #ffcc00' : 'none',
                              outlineOffset: '-1px',
                              borderRadius: 'var(--radius-md)',
                              padding: '0.5rem 0.75rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                              opacity: isBeingDragged ? 0.35 : 1,
                              transition: 'background 0.15s ease, opacity 0.15s ease',
                              cursor: 'grab'
                            }}
                          >
                            {isCharDropTarget && <DropHint icon="group_add" text="Drop here to add to this scene" />}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', rowGap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
                              <span className="material-symbols-outlined" style={{ color: '#ffcc00', opacity: 0.7, fontSize: '1.1rem', flexShrink: 0 }} title="Drag to move between scenes or unassign">
                                drag_indicator
                              </span>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #ffcc00', flexShrink: 0 }}>
                                <Avatar userId={r.user_id} hasAvatar={r.has_avatar} clan={r.clan} size={28} fallback={symlogoWhite(r.clan) || '/img/ATT-logo(1).webp'} />
                              </div>
                              <div style={{ flex: '0 1 auto', minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '6px' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{r.char_name || '(No Character)'}</span>
                                <span style={{ fontSize: '0.75rem', color: '#ffcc00', fontWeight: 700 }}>[{r.clan || 'Clan'}]</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.player_name || r.email}</span>
                              </div>
                              <div style={{ flex: '1 1 160px', minWidth: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <b style={{ color: '#ffcc00', fontFamily: 'Fira Code, monospace', marginRight: '6px' }}>#{r.id}</b>
                                {r.title}
                              </div>
                              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'var(--text-muted)', flexShrink: 0 }} title={isExpanded ? 'Hide details' : 'Show details'}>
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                              <SheetPdfButton character={charById.get(r.character_id)} />
                              {!isEditing && (
                                <span className={styles.statusBadge} style={{ ...getStatusBadgeStyle(r.status), flexShrink: 0 }}>{r.status}</span>
                              )}
                              {isEditing && (<>
                              <select
                                className={styles.select}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', width: 'auto', flexShrink: 0 }}
                                value={buffer[r.id]?.status ?? r.status}
                                disabled={buffer[r.id]?.saving}
                                onChange={(e) => saveRow(r.id, { status: e.target.value })}
                                title="Saves immediately"
                              >
                                <option value="Needs a Scene">Needs a Scene</option>
                                <option value="Resolved in scene">Resolved in scene</option>
                                <option value="submitted">Submitted (Remove from Scene)</option>
                                <option value="approved">Approved (Remove from Scene)</option>
                                <option value="Approved: Kikos">Approved: Kikos (Remove from Scene)</option>
                                <option value="Approved: Mike">Approved: Mike (Remove from Scene)</option>
                                <option value="resolved">Resolved (Remove from Scene)</option>
                                <option value="rejected">Rejected (Remove from Scene)</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromScene(r.id)}
                                title="Remove from this scene"
                                style={{ background: 'transparent', border: 'none', color: '#ff5252', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', flexShrink: 0 }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>person_remove</span>
                              </button>
                              </>)}
                            </div>

                            {rowErr && <div style={{ color: '#ff5252', fontSize: '0.8rem' }}>{rowErr}</div>}
                            {isExpanded && <SceneActionDetails r={r} showResolution={false} />}
                          </div>
                        );
                      })
                    )}
                  </div>
                  </>)}
                </div>
              );
            })}
          </div>
          </>)}
        </div>
      </section>
    </div>
  );
}

function DowntimeEditorRow({ r, editBuffer, onOpen, onUpdate, onSave, onCancel, adminsList = [], onQuickAssign }) {
  const editing = !!editBuffer;
  const isProj = r.title && r.title.startsWith('[PROJECT]');
  const displayTitle = isProj ? r.title.replace('[PROJECT] ', '') : r.title;

  if (!editing) {
    return (
      <div
        className={`${styles.downtimeCompactRow} ${styles.downtimeRowGrid}`}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: 'transparent', transition: 'all 0.2s ease' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        onClick={() => onOpen(r)}
      >
        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', minWidth: 0, overflowWrap: 'anywhere' }}>
          <b style={{ color: 'var(--accent-purple)', fontFamily: 'Fira Code, monospace', marginRight: '10px' }}>#{r.id}</b> {displayTitle}
        </div>
        <div style={{ fontFamily: 'Fira Code, monospace', fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{niceDate(r.created_at)}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
          {/* Quick resolver assignment pills: ONLY appear if resolved AND not resolved by an admin (the old legacy ones) */}
          {(r.status === 'resolved' || r.status === 'Resolved in scene') && !r.resolved_by && !r.resolved_by_name && adminsList.length > 0 && (
            <div
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {adminsList.map(a => (
                <button
                  key={a.id}
                  type="button"
                  title={`Click to assign resolution to ${a.display_name}`}
                  onClick={() => onQuickAssign && onQuickAssign(r.id, a.id)}
                  style={{
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {a.display_name}
                </button>
              ))}
            </div>
          )}
          {(r.resolved_by_name || (r.resolved_by && adminsList.find(a => a.id === r.resolved_by)?.display_name)) ? (
            <span style={{ marginRight: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Resolved: {r.resolved_by_name || adminsList.find(a => a.id === r.resolved_by)?.display_name}
            </span>
          ) : null}
          {r.is_read ? <span style={{ marginRight: '4px', opacity: 0.6 }} title="Read by player">👁️</span> : null}
          <span className={styles.statusBadge} data-status={r.status} style={getStatusBadgeStyle(r.status)}>
            {r.status}
          </span>
        </div>
      </div>
    );
  }

  const b = editBuffer;
  return (
    <article
      className={styles.downtimeCard}
      style={{ background: 'var(--glass-inset)', border: '1px solid var(--glass-border)', padding: 'clamp(0.9rem, 3vw, 1.5rem)', margin: 'clamp(0.5rem, 2vw, 1.25rem)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)', borderLeft: `4px solid ${isProj ? '#4da6ff' : 'var(--accent-purple)'}` }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ fontSize: '1.25rem', color: 'var(--text-color)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            <b style={{ color: isProj ? '#4da6ff' : 'var(--accent-purple)', fontFamily: 'Fira Code, monospace', marginRight: '8px' }}>#{r.id}</b> {displayTitle || '(no title)'}
            {isProj && <span style={{ fontSize: '0.7rem', background: '#1b4c8c', border: '1px solid #4da6ff', color: 'var(--text-color)', padding: '2px 8px', borderRadius: '4px', marginLeft: '12px', verticalAlign: 'middle', fontWeight: 900, letterSpacing: '1px' }}>PROJECT</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Account: <b style={{ color: 'var(--text-secondary)' }}>{r.player_name || r.email}</b></span>
            <span>Subject: <b style={{ color: 'var(--text-secondary)' }}>{r.char_name || 'None'}</b> {r.clan ? `[${r.clan}]` : ''}</span>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <label className={styles.labeledInput}>
          <span>Description</span>
          <textarea className={styles.textarea} style={{ minHeight: isProj ? '220px' : '120px', background: 'rgba(0, 0, 0, 0.4)', borderStyle: 'dashed', opacity: 0.85, color: '#e0e0e5' }} readOnly value={r.body || ''} />
        </label>

        {!isProj && r.feeding_type && (
          <label className={styles.labeledInput}>
            <span>Feeding Type</span>
            <div className={styles.input} style={{ background: 'rgba(0, 0, 0, 0.4)', borderStyle: 'dashed', opacity: 0.85, display: 'flex', alignItems: 'center', height: '44px', color: 'var(--accent-purple)', fontWeight: 700 }}>
              {r.feeding_type}
            </div>
          </label>
        )}

        <div className={styles.rGrid2}>
          <label className={styles.labeledInput}>
            <span>GM Internal Notes</span>
            <textarea className={styles.textarea} value={b.gm_notes} onChange={(e) => onUpdate(r.id, 'gm_notes', e.target.value)} placeholder="Internal notes for GMs only..." />
          </label>
          <label className={styles.labeledInput}>
            <span>GM Feedback to Player</span>
            <textarea className={styles.textarea} style={{ background: 'rgba(157, 124, 25ff, 0.03)', borderLeft: '3px solid var(--accent-purple)' }} value={b.gm_resolution} onChange={(e) => onUpdate(r.id, 'gm_resolution', e.target.value)} placeholder="Notes visible to the player..." />
          </label>
        </div>

        <div className={styles.rGrid2} style={{ background: 'var(--glass-bg)', padding: 'clamp(0.9rem, 3vw, 1.5rem)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <label className={styles.labeledInput}>
              <span>Status</span>
              <select className={styles.select} value={b.status} onChange={(e) => onUpdate(r.id, 'status', e.target.value)}>
                {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>

            <label className={styles.labeledInput}>
              <span>Resolved By</span>
              <select
                className={styles.select}
                value={b.resolved_by ?? ''}
                onChange={(e) => onUpdate(r.id, 'resolved_by', e.target.value)}
              >
                <option value="">Auto: Current Storyteller</option>
                {adminsList.map(a => (
                  <option key={a.id} value={a.id}>{a.display_name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.labeledInput}>
            <span>Quick Actions</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              <button className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`} type="button" onClick={() => onSave(r.id, { status: 'approved' })}>Approve</button>
              <button className={`${styles.btn} ${styles.btnSmall}`} style={{ background: 'linear-gradient(135deg, #047857 0%, #00ff88 100%)', color: '#ffffff', fontWeight: 800, borderRadius: 'var(--radius-sm)', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }} type="button" onClick={() => onSave(r.id, { status: 'Approved: Kikos' })}>Approve: Kikos</button>
              <button className={`${styles.btn} ${styles.btnSmall}`} style={{ background: 'linear-gradient(135deg, #0369a1 0%, #00e5ff 100%)', color: '#ffffff', fontWeight: 800, borderRadius: 'var(--radius-sm)', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }} type="button" onClick={() => onSave(r.id, { status: 'Approved: Mike' })}>Approve: Mike</button>
              <button className={`${styles.btn} ${styles.btnWarning} ${styles.btnSmall}`} type="button" onClick={() => onSave(r.id, { status: 'Needs a Scene' })}>Needs Scene</button>
              <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} type="button" onClick={() => onSave(r.id, { status: 'rejected' })} title="Rejected actions do not count toward the player's 3 per cycle, so they can write a new one">Reject</button>
              {String(r.status || 'submitted').toLowerCase() !== 'submitted' && (
                <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} type="button" onClick={() => onSave(r.id, { status: 'submitted' })} title="Reopen: the player can edit this action again (until the deadline)" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>undo</span>
                  Back to submitted
                </button>
              )}
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} type="button" onClick={() => onSave(r.id, { status: 'resolved' })}>Resolve</button>
              <button className={styles.btn} style={{ background: 'linear-gradient(135deg, #1b4c8c 0%, #4da6ff 100%)', color: 'var(--text-color)', padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: 'var(--radius-sm)' }} type="button" onClick={() => onSave(r.id, { status: 'Resolved in scene' })}>In Scene</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => onCancel(r.id)} disabled={b.saving}>Close</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onSave(r.id)} disabled={b.saving} style={{ marginLeft: 'auto' }}>
            {b.saving ? 'Saving...' : 'Save'}
          </button>
          {b.error && <div className={`${styles.alertMini} ${styles.alertError}`}>{b.error}</div>}
          {b.info && <div className={`${styles.alertMini} ${styles.alertInfo}`}>{b.info}</div>}
        </div>
      </div>
    </article>
  );
}