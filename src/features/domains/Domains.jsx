import React, { useMemo, useEffect, useState, useRef, useCallback, useContext } from 'react';
import { Map as MapGL, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, BitmapLayer, SolidPolygonLayer, TextLayer, IconLayer, ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import { MaskExtension, PathStyleExtension } from '@deck.gl/extensions';
import MiniSearch from 'minisearch';
import { motion, AnimatePresence } from 'framer-motion';
import bbox from '@turf/bbox';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import styles from '../../styles/Domains.module.css';
import domainsRaw from '../../data/Domains.json';
import api from '../../core/api';
import Avatar from '../../components/Avatar';
import { AuthCtx } from '../../core/AuthContext';
import { symlogo, clanTint } from '../../data/clans';
import { DIVISION_POPULATIONS, POPULATION_GROUP_MEMBERS } from './data/divisionPopulations';
import OverlayAccessManager from './OverlayAccessManager';
import { TRANSIT_PATHS, TRANSIT_STATIONS, TRANSIT_GROUPS, TRANSIT_ATTRIBUTION } from './data/athensTransit';
import {
  CATACOMB_PASSAGES, CATACOMB_SITES, CATACOMB_CERTAINTY, CATACOMB_SITE_COLOR, CATACOMB_ATTRIBUTION,
} from './data/athensCatacombs';
import {
  NECRO_PASSAGES, NECRO_SITES, NECRO_CERTAINTY, NECRO_NEW_COLOR, NECRO_NEW_WIDTH,
  NECRO_NOTES, NECRO_SITE_COLOR, NECRO_ATTRIBUTION,
} from './data/athensNecropolis';

// Accent colors for real-world municipality/district groupings that span
// more than one map division — purely informational, independent of claim
// ownership color. Only groups with 2+ members get an outline (a single
// standalone municipality doesn't need one; its own border already says it).
const GROUP_ACCENT_COLORS = {
  'athens-1': '#38bdf8',
  'athens-2': '#a78bfa',
  'athens-3': '#fb7185',
  'athens-4': '#facc15',
  'athens-7': '#34d399',
  'moschato-tavros': '#f97316',
};

// Distinct from claim colors, the pending-request amber, and Abaton red —
// a pale violet reads as "system/storyteller-controlled" for NPC domains.
const NPC_ACCENT_COLOR = '#c4b5fd';

// ── Athens transit overlay ────────────────────────────────
// Below this zoom only interchange stations are named; at or above it every
// visible station gets a label.
const TRANSIT_LABEL_ALL_ZOOM = 13.5;
// v2: reset everyone once so the transit overlay is ON by default (it is meant
// to be on the first time a player opens the map).
const TRANSIT_LS_KEY = 'domains.transit.v2';
const TRANSIT_DEFAULT_PREFS = {
  on: true,
  groups: { metro: true, line4: true, tram: true, suburban: true },
};

function loadTransitPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(TRANSIT_LS_KEY));
    if (saved && typeof saved === 'object') {
      return {
        on: saved.on !== false,
        groups: { ...TRANSIT_DEFAULT_PREFS.groups, ...(saved.groups || {}) },
      };
    }
  } catch (_) { /* noop — fall through to defaults */ }
  return TRANSIT_DEFAULT_PREFS;
}

// ── Clean-map mode ────────────────────────────────────────
// Personal per-device view toggle. When on, the map drops every ownership
// visual — claim colours, safety fills, extrusion, clan/avatar/NPC/Abaton
// badges, municipal-group outlines and the division labels — leaving a plain
// Athens map with thin neutral division borders. Clicking a division still
// opens its dossier. Default off for everyone.
const CLEAN_MAP_LS_KEY = 'domains.cleanMap.v1';
function loadCleanMap() {
  try { return localStorage.getItem(CLEAN_MAP_LS_KEY) === '1'; } catch (_) { return false; }
}

// ── Catacombs overlay (ADMIN ONLY) ────────────────────────
const CATACOMBS_LS_KEY = 'domains.catacombs.v1';
const CATACOMBS_DEFAULT_PREFS = {
  on: false, // opt-in — it's a dense, spoilery layer
  tiers: { attested: true, inferred: true, speculative: true },
};

function loadCatacombsPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(CATACOMBS_LS_KEY));
    if (saved && typeof saved === 'object') {
      return {
        on: saved.on === true,
        tiers: { ...CATACOMBS_DEFAULT_PREFS.tiers, ...(saved.tiers || {}) },
      };
    }
  } catch (_) { /* noop */ }
  return CATACOMBS_DEFAULT_PREFS;
}

// ── Necropoleis overlay (ADMIN ONLY) — Old and New are separate toggles ────
const NECRO_LS_KEY = 'domains.necropolis.v2';
const NECRO_DEFAULT_PREFS = {
  old: { on: false, tiers: { charted: true, hearsay: true, lost: true } },
  new: { on: false },
};
function loadNecroPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(NECRO_LS_KEY));
    if (saved && typeof saved === 'object') {
      return {
        old: {
          on: saved.old?.on === true,
          tiers: { ...NECRO_DEFAULT_PREFS.old.tiers, ...(saved.old?.tiers || {}) },
        },
        new: { on: saved.new?.on === true },
      };
    }
  } catch (_) { /* noop */ }
  return NECRO_DEFAULT_PREFS;
}

const LAYERS_PANEL_LS_KEY = 'domains.layersPanel.open.v1';
function loadLayersPanelOpen() {
  try {
    const v = localStorage.getItem(LAYERS_PANEL_LS_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch (_) { /* noop */ }
  // default: open on desktop, collapsed on a small screen
  return typeof window === 'undefined' || window.innerWidth > 768;
}

// ── Consolidated "Layers" panel building blocks ───────────
// A top-level overlay row: its own ON/OFF plus an optional sub-legend that
// only shows when the layer is on.
function LayerRow({ label, on, onToggle, accent, title, children }) {
  return (
    <div className={styles.layerRow} data-accent={accent || 'plain'}>
      <button
        type="button"
        className={styles.layerRowMain}
        data-on={on}
        onClick={onToggle}
        title={title}
      >
        <span className={styles.layerRowLabel}>{label}</span>
        <span className={styles.layerRowState}>{on ? 'ON' : 'OFF'}</span>
      </button>
      {on && children ? <div className={styles.layerSub}>{children}</div> : null}
    </div>
  );
}

function LayerSubRow({ label, active, onClick, swatch }) {
  return (
    <button
      type="button"
      className={styles.layerSubRow}
      data-active={active}
      onClick={onClick}
    >
      {swatch}
      <span className={styles.layerSubLabel}>{label}</span>
    </button>
  );
}

// ── Division Names ────────────────────────────────────────
const DIVISION_NAMES = {
  1: 'Pagkrati', 2: 'Zografou/Kaisarianh', 3: 'Exarxia', 4: 'Boula', 5: 'Ampelokhpoi',
  6: 'Kalithea', 7: 'Petralona', 8: 'Plaka', 9: 'Keramikos', 10: 'Tauros, Agios Ioannis Rentis',
  11: 'Thiseio', 12: 'Mosxato', 13: 'Palaio Faliro', 14: 'Nea Smyrnh', 15: 'Agios Dhmhtrios',
  16: 'Neos Kosmos', 17: 'Nea Penteli, Melissia', 18: 'Kolonaki, Lykabhtos', 19: 'Peristeri',
  20: 'Aigaleo', 21: 'Petroupolh, Ilion, Agioi Anargyroi, Kamatero', 22: 'Ellhniko, Argyroupolh',
  23: 'Psyxiko, Neo Psyxiko', 24: 'Attikh', 25: 'Kypselh', 26: 'Galatsi', 27: 'Khfisia, Nea Erythraia',
  28: 'Alimos', 29: 'Marousi, Peykh', 30: 'Hrakleio, Metamorfosi, Lykobrysh', 31: 'Xalandri, Brilissia',
  32: 'Perama, Keratsini', 33: 'Pathsia', 34: 'Kolonos, Sepolia', 35: 'Xolargos, Agia Paraskeyh',
  36: 'Katexakh', 37: 'Nea Philadepfia', 38: 'Hlioupolh, Byronas', 39: 'Athina', 40: 'Psyrh',
  41: 'Ymuttos', 42: 'Parnitha', 43: 'Peiraias, Neo Faliro', 44: 'Xaidari',
  45: 'Korydallos, Nikaia, Agia Barbara', 46: 'Glyfada', 47: 'Gkyzh', 48: 'Eleysina', 49: 'Aspropirgos'
};

// ── Masquerade safety tiers ───────────────────────────────
// A null rating is a distinct "Unknown" state (not assessed yet), not the
// same as a numeric 10 — a fresh claim or untouched division hasn't been
// vetted by the Court, so it shouldn't silently read as "Secure".
const SAFETY_TIERS = [
  { min: 8, label: 'Secure', color: '#22c55e' },
  { min: 5, label: 'Stable', color: '#eab308' },
  { min: 3, label: 'At Risk', color: '#f97316' },
  { min: 0, label: 'Critical', color: '#ef4444' },
];
const UNKNOWN_TIER = { label: 'Unknown', color: '#64748b' };
function safetyTier(rating) {
  if (rating == null) return UNKNOWN_TIER;
  return SAFETY_TIERS.find(t => rating >= t.min) || SAFETY_TIERS[SAFETY_TIERS.length - 1];
}

// ── Relative time ──────────────────────────────────────────
function relTime(ts) {
  if (!ts) return '';
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

// ── CORS-safe avatar fetcher ──────────────────────────────
// Returns an object URL string that BitmapLayer can use as `image`.
async function fetchAvatarAsObjectUrl(url) {
  const token = localStorage.getItem('token');
  const headers = {};
  const apiBase = import.meta.env.VITE_API_URL || '/api';
  if (url.startsWith(apiBase) || url.startsWith('/')) {
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    headers,
    credentials: url.startsWith('http') && !url.includes(window.location.host) ? 'omit' : 'include',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// ── Hex to RGBA array ────────────────────────────────────
function hexToRgba(hex, alpha = 255) {
  const h = (hex || '888888').replace('#', '');
  const bigint = parseInt(h, 16);
  if (h.length === 3) {
    const r = ((bigint >> 8) & 0xf) * 17;
    const g = ((bigint >> 4) & 0xf) * 17;
    const b = (bigint & 0xf) * 17;
    return [r, g, b, alpha];
  }
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255, alpha];
}

// A domain_claims row is only "owned" if it actually has an owner — a bare
// row can exist purely to hold a Court-set safety rating for a division
// nobody has claimed yet, and must not be treated as claimed anywhere.
function isOwnedClaim(c) {
  // owner_name can be set on its own — staff assigning an informal NPC
  // owner (e.g. typed straight into the admin panel) with no linked
  // characters/npcs row at all. That still counts as claimed.
  return !!(c && (c.owner_character_id || c.owner_npc_id || c.is_abaton || (c.owner_name && c.owner_name.trim())));
}

// An NPC-controlled domain: owned, but not by a player's own character —
// either a proper npcs-table record, or just a bare owner_name staff typed
// in directly with no character/npc link at all.
function isNpcOwned(c) {
  return !!(c && !c.is_abaton && !c.owner_character_id && (c.owner_npc_id || (c.owner_name && c.owner_name.trim())));
}

// ── Abaton hazard-stripe texture — diagonal red/black, tiled by the SVG
// pattern itself so it reads as real stripes regardless of how large the
// division's polygon is on screen. Draped onto the polygon via the same
// mask+bitmap trick used for the hover avatar reveal, just always-on.
const ABATON_STRIPE_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
  <defs>
    <pattern id="s" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="22" height="22" fill="#100202"/>
      <rect width="11" height="22" fill="#c0181c" fill-opacity="0.8"/>
    </pattern>
  </defs>
  <rect width="256" height="256" fill="url(#s)"/>
</svg>
`);

// "Απαγορευτικό" — a no-entry sign, used as the map badge for Abaton
// divisions in place of a clan crest (Abaton has no owner/clan).
const NO_ENTRY_ICON = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <circle cx="32" cy="32" r="27" fill="#150404" stroke="#ef4444" stroke-width="6"/>
  <line x1="13" y1="51" x2="51" y2="13" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/>
</svg>
`);

// Two peer badges sit side by side at each claimed division's center — the
// clan crest and the owner's avatar (a plain square photo, like the one used
// in the dossier panel), both clearly visible on their own. Both are plain
// deck.gl icon loads sized in screen pixels (not real-world meters — a
// geo-sized circle was tried and came out sub-pixel and invisible at normal
// zoom) so they stay a consistent, legible size and offset at any zoom.

export default function Domains() {
  const { user } = useContext(AuthCtx);
  const isCourt = user?.role === 'admin' || user?.role === 'courtuser';
  const isAdmin = user?.role === 'admin'; // catacombs overlay is admin-only, no exceptions
  const queryClient = useQueryClient();

  const mapRef = useRef(null);
  const hoveredDivisionRef = useRef(null);

  const [hoveredDivision, setHoveredDivision] = useState(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [railOpen, setRailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [avatarCache, setAvatarCache] = useState({});
  const [mapReady, setMapReady] = useState(false);

  // Badges should feel like part of the 3D scene, not fixed HUD stickers —
  // grow a bit as you zoom in, shrink as you zoom out. Rounded to quarter
  // steps so mouse-wheel zooming doesn't trigger a state update (and layer
  // rebuild) on every tiny delta.
  const [zoom, setZoom] = useState(12);
  const badgeSize = Math.max(22, Math.min(56, 34 + (zoom - 12) * 6));
  // Clan badge stays centered on the division (offset 0); the avatar badge
  // sits just to its right — the gap scales with badgeSize so the two can
  // never overlap regardless of zoom.
  const badgeOffset = badgeSize + 8;

  const [reqMessage, setReqMessage] = useState('');
  const [reqColor, setReqColor] = useState('#8b5cf6');
  const [codexText, setCodexText] = useState('');

  // ── Athens transit overlay (metro / tram / suburban / Line 4) ──
  const [transitPrefs, setTransitPrefs] = useState(loadTransitPrefs);
  const transitOn = transitPrefs.on;
  const transitGroups = transitPrefs.groups;
  useEffect(() => {
    try { localStorage.setItem(TRANSIT_LS_KEY, JSON.stringify(transitPrefs)); } catch (_) { /* noop */ }
  }, [transitPrefs]);
  const toggleTransit = useCallback(() => setTransitPrefs(p => ({ ...p, on: !p.on })), []);
  const toggleTransitGroup = useCallback((key) => {
    setTransitPrefs(p => ({ ...p, groups: { ...p.groups, [key]: !p.groups[key] } }));
  }, []);

  // ── Restricted-overlay access (server-resolved: admin → all, Nosferatu →
  // necropoleis, plus explicit admin grants) ──
  // Keyed by user id so a fresh login (e.g. admin → player in the same tab)
  // never reads the previous account's cached access.
  const { data: overlayAccessData } = useQuery({
    queryKey: ['domain-overlays-me', user?.id],
    queryFn: async () => (await api.get('/domain-overlays/me')).data,
    enabled: !!user,
    staleTime: 30 * 1000,
  });
  const overlayAccess = useMemo(
    () => new Set(overlayAccessData?.overlays || []),
    [overlayAccessData],
  );
  const canCatacombs = isAdmin || overlayAccess.has('catacombs');
  const canNecroOld = isAdmin || overlayAccess.has('necropolis_old');
  const canNecroNew = isAdmin || overlayAccess.has('necropolis_new');
  const [accessMgrOpen, setAccessMgrOpen] = useState(false);

  // ── Catacombs overlay (access-gated) ──
  const [catacombsPrefs, setCatacombsPrefs] = useState(loadCatacombsPrefs);
  const catacombsOn = canCatacombs && catacombsPrefs.on;
  const catacombsTiers = catacombsPrefs.tiers;
  useEffect(() => {
    try { localStorage.setItem(CATACOMBS_LS_KEY, JSON.stringify(catacombsPrefs)); } catch (_) { /* noop */ }
  }, [catacombsPrefs]);
  const toggleCatacombs = useCallback(() => setCatacombsPrefs(p => ({ ...p, on: !p.on })), []);
  const toggleCatacombsTier = useCallback((key) => {
    setCatacombsPrefs(p => ({ ...p, tiers: { ...p.tiers, [key]: !p.tiers[key] } }));
  }, []);

  // ── Necropoleis overlay (access-gated) — Old + New are independent toggles ──
  const [necroPrefs, setNecroPrefs] = useState(loadNecroPrefs);
  const necroOldOn = canNecroOld && necroPrefs.old.on;
  const necroNewOn = canNecroNew && necroPrefs.new.on;
  const necroOldTiers = necroPrefs.old.tiers;
  useEffect(() => {
    try { localStorage.setItem(NECRO_LS_KEY, JSON.stringify(necroPrefs)); } catch (_) { /* noop */ }
  }, [necroPrefs]);
  const toggleNecroOld = useCallback(() => setNecroPrefs(p => ({ ...p, old: { ...p.old, on: !p.old.on } })), []);
  const toggleNecroNew = useCallback(() => setNecroPrefs(p => ({ ...p, new: { on: !p.new.on } })), []);
  const toggleNecroOldTier = useCallback((key) => {
    setNecroPrefs(p => ({ ...p, old: { ...p.old, tiers: { ...p.old.tiers, [key]: !p.old.tiers[key] } } }));
  }, []);

  // ── Clean-map mode ──
  const [cleanMap, setCleanMap] = useState(loadCleanMap);
  useEffect(() => {
    try { localStorage.setItem(CLEAN_MAP_LS_KEY, cleanMap ? '1' : '0'); } catch (_) { /* noop */ }
  }, [cleanMap]);
  const toggleCleanMap = useCallback(() => setCleanMap(v => !v), []);

  // ── Overlay hover tooltip (transit stations, catacomb / necropolis sites +
  // passages) — surfaces the authored note that's otherwise invisible ──
  const [overlayHover, setOverlayHover] = useState(null);
  const onOverlayHover = useCallback((info) => {
    if (info?.object && info.layer) {
      const o = info.object;
      const id = info.layer.id;
      const kind = id.split('-')[0]; // 'transit' | 'catacombs' | 'necro'
      let title = o.name || o.label || '';
      let subtitle = '';
      const note = o.note || '';
      if (id.includes('station')) {
        subtitle = (o.lines || []).join(' · ') + (o.interchange ? ' · interchange' : '');
      } else if (id.includes('site')) {
        subtitle = kind === 'necro' ? (o.necropolis === 'new' ? 'New necropolis' : 'Old necropolis') : 'Catacombs';
        if (o.certainty) subtitle += ` · ${o.certainty}`;
      } else {
        // a line / passage
        subtitle = [o.label, o.network, o.status, o.certainty].filter(Boolean).join(' · ');
      }
      setOverlayHover({ x: info.x, y: info.y, title, subtitle, note });
    } else {
      setOverlayHover(prev => (prev ? null : prev));
    }
  }, []);

  // ── Panel open/closed state ──
  const [claimsPanelOpen, setClaimsPanelOpen] = useState(true);
  const [layersPanelOpen, setLayersPanelOpen] = useState(loadLayersPanelOpen);
  useEffect(() => {
    try { localStorage.setItem(LAYERS_PANEL_LS_KEY, layersPanelOpen ? '1' : '0'); } catch (_) { /* noop */ }
  }, [layersPanelOpen]);

  // ── Data ────────────────────────────────────────────────
  const { data: claimsData, isLoading: isClaimsLoading, error } = useQuery({
    queryKey: ['domain-claims'],
    queryFn: async () => {
      const res = await api.get('/domain-claims');
      return res.data;
    }
  });

  const { data: requestsData } = useQuery({
    queryKey: ['domain-claim-requests'],
    queryFn: async () => {
      const res = await api.get('/domain-claims/requests');
      return res.data;
    }
  });

  const { data: problemsData, isFetching: isProblemsLoading } = useQuery({
    queryKey: ['domain-problems', selectedDivision],
    queryFn: async () => {
      const res = await api.get(`/domain-claims/${selectedDivision}/problems`);
      return res.data;
    },
    enabled: isCourt && activeTab === 'court' && selectedDivision != null,
  });

  const { data: codexData, isFetching: isCodexLoading } = useQuery({
    queryKey: ['domain-codex', selectedDivision],
    queryFn: async () => {
      const res = await api.get(`/domain-claims/${selectedDivision}/codex`);
      return res.data;
    },
    enabled: activeTab === 'codex' && selectedDivision != null,
  });

  const claims = claimsData?.claims || [];
  const requests = requestsData?.requests || [];
  const problems = problemsData?.problems || [];
  const codexEntries = codexData?.entries || [];
  const err = error?.response?.data?.error || error?.message || '';

  const ownedClaims = useMemo(() => claims.filter(isOwnedClaim), [claims]);

  const requestsByDivision = useMemo(() => {
    const map = new Map();
    for (const r of requests) {
      if (!map.has(r.division)) map.set(r.division, []);
      map.get(r.division).push(r);
    }
    return map;
  }, [requests]);

  const pendingCountByDivision = useMemo(() => {
    const map = new Map();
    for (const r of requests) {
      if (r.status !== 'pending') continue;
      map.set(r.division, (map.get(r.division) || 0) + 1);
    }
    return map;
  }, [requests]);

  // ── Mutations ───────────────────────────────────────────
  const requestMutation = useMutation({
    mutationFn: async ({ division, message, color }) => {
      const res = await api.post(`/domain-claims/${division}/request`, { message, color });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Your claim was submitted to the Court');
      setReqMessage('');
      queryClient.invalidateQueries({ queryKey: ['domain-claim-requests'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to submit request'),
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ requestId, action }) => {
      const res = await api.post(`/domain-claims/requests/${requestId}/${action}`);
      return res.data;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.action === 'approve' ? 'Domain granted' : 'Request denied');
      queryClient.invalidateQueries({ queryKey: ['domain-claim-requests'] });
      queryClient.invalidateQueries({ queryKey: ['domain-claims'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to resolve request'),
  });

  const vacateMutation = useMutation({
    mutationFn: async (division) => {
      const res = await api.post(`/admin/domain-claims/${division}/vacate`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Domain released back to the city');
      queryClient.invalidateQueries({ queryKey: ['domain-claims'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to vacate domain'),
  });

  const safetyMutation = useMutation({
    mutationFn: async ({ division, safety_rating }) => {
      const res = await api.patch(`/domain-claims/${division}/safety`, { safety_rating });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Masquerade safety updated');
      queryClient.invalidateQueries({ queryKey: ['domain-claims'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update safety rating'),
  });

  const addCodexMutation = useMutation({
    mutationFn: async ({ division, text }) => {
      const res = await api.post(`/domain-claims/${division}/codex`, { text });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Added to the codex');
      setCodexText('');
      queryClient.invalidateQueries({ queryKey: ['domain-codex', selectedDivision] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to add entry'),
  });

  const deleteCodexMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/domain-claims/codex/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Entry removed');
      queryClient.invalidateQueries({ queryKey: ['domain-codex', selectedDivision] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to remove entry'),
  });

  // ── Avatar URL resolver ─────────────────────────────────
  const getAvatarUrl = useCallback((claim) => {
    if (!claim) return '';
    if (claim.is_abaton) return '/img/ui/abaton.jpg';
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    if (claim.user_id) return `${baseUrl}/users/${claim.user_id}/avatar`;
    if (claim.owner_npc_id) return `${baseUrl}/npcs/${claim.owner_npc_id}/avatar`;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(claim.live_name || claim.owner_name || 'Unclaimed')}&background=random`;
  }, []);

  // ── Eagerly load avatars for every claimed (non-Abaton) division ────────
  // Feeds both the hover-reveal (full-polygon avatar) and the always-on map
  // badges (small avatar+clan medallion), so it can't be hover-gated anymore
  // — every claimed division needs its avatar ready before it's ever hovered.
  useEffect(() => {
    for (const claim of ownedClaims) {
      if (claim.is_abaton) continue;
      const division = Number(claim.division);
      if (avatarCache[division]) continue;
      const url = getAvatarUrl(claim);
      fetchAvatarAsObjectUrl(url)
        .then(objectUrl => {
          setAvatarCache(prev => (prev[division] ? prev : { ...prev, [division]: objectUrl }));
        })
        .catch(err => {
          console.warn(`[Domains] Failed to load avatar for division ${division}:`, err.message);
        });
    }
  }, [ownedClaims, avatarCache, getAvatarUrl]);

  // Revoke every blob URL ever created, but only on unmount — this must NOT
  // depend on [avatarCache], or React re-runs the cleanup (revoking
  // everything already cached) on every single new avatar that finishes
  // loading, breaking every badge except whichever loaded last.
  const avatarUrlsRef = useRef(new Set());
  useEffect(() => {
    Object.values(avatarCache).forEach(url => avatarUrlsRef.current.add(url));
  }, [avatarCache]);
  useEffect(() => {
    return () => {
      avatarUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (_) { /* noop */ }
      });
    };
  }, []);

  // ── Build GeoJSON with claim + request properties injected ──
  const { geoJsonData, allDomainsList } = useMemo(() => {
    if (!domainsRaw || !Array.isArray(domainsRaw.features)) {
      console.error('Domains.json is missing or has incorrect structure.');
      return { geoJsonData: null, allDomainsList: [] };
    }
    const domains = [];
    const features = domainsRaw.features.map((f, i) => {
      const divisionNumber = f?.properties?.division != null ? Number(f.properties.division) : (i + 1);
      const divisionName = f?.properties?.name || DIVISION_NAMES[divisionNumber] || `Division ${divisionNumber}`;
      domains.push({ number: divisionNumber, name: divisionName });

      const claim = claims.find(c => Number(c.division) === divisionNumber);

      return {
        ...f,
        id: divisionNumber,
        properties: {
          ...f?.properties,
          __division: divisionNumber,
          __name: divisionName,
          claimColor: claim?.color || '#888888',
          // owner_name is a legacy free-text snapshot; the backend now also
          // resolves the live character/npc name (live_name) — prefer that
          // so a renamed character never shows a stale duplicate name.
          ownerName: claim?.live_name || claim?.owner_name || 'Unclaimed',
          userId: claim?.user_id || null,
          npcId: claim?.owner_npc_id || null,
          isAbaton: !!claim?.is_abaton,
          isNpc: isNpcOwned(claim),
          // The one source of truth for "does this division have an owner"
          // — covers character-linked, npc-linked, AND a bare owner_name
          // typed in with no linked record at all (common for informal NPC
          // assignments in this campaign). Everywhere below that used to
          // check `userId || npcId || isAbaton` missed that third case.
          claimed: isOwnedClaim(claim),
          clan: claim?.clan || null,
          titles: claim?.titles || [],
          // safety_rating can arrive as a DECIMAL string from the DB driver —
          // coerce so the tier comparison (rating >= min) is numeric.
          safetyRating: (claim?.safety_rating == null || claim.safety_rating === '')
            ? null
            : Number(claim.safety_rating),
          claimedAt: claim?.claimed_at || null,
          previousOwnerName: claim?.previous_owner_name || null,
          previousClaimedAt: claim?.previous_claimed_at || null,
          pendingRequests: pendingCountByDivision.get(divisionNumber) || 0,
        }
      };
    });
    return { geoJsonData: { ...domainsRaw, features }, allDomainsList: domains };
  }, [claims, pendingCountByDivision]);

  const claimByDiv = useMemo(() => new Map(claims.map(c => [Number(c.division), c])), [claims]);

  // Re-derived from geoJsonData (not a click-time snapshot) so the dossier
  // reflects live ownership — e.g. it updates itself the moment a request
  // is approved while it's still open, instead of showing a stale owner.
  const selectedFeature = useMemo(() => {
    if (selectedDivision == null || !geoJsonData) return null;
    return geoJsonData.features.find(f => f.properties.__division === selectedDivision) || null;
  }, [selectedDivision, geoJsonData]);

  // ── Derived: the open dossier's info ────────────────────
  const selectedDivisionInfo = useMemo(() => {
    if (!selectedFeature) return null;
    const p = selectedFeature.properties;
    const popInfo = DIVISION_POPULATIONS[p.__division];
    return {
      number: p.__division,
      name: p.__name,
      owner: p.ownerName,
      color: p.claimColor,
      user_id: p.userId,
      npc_id: p.npcId,
      is_abaton: p.isAbaton,
      is_npc: p.isNpc,
      clan: p.clan,
      primaryTitle: p.titles?.[0] || null,
      safety_rating: p.safetyRating,
      claimed_at: p.claimedAt,
      previous_owner_name: p.previousOwnerName,
      previous_claimed_at: p.previousClaimedAt,
      population: popInfo ? {
        ...popInfo,
        siblings: (POPULATION_GROUP_MEMBERS[popInfo.group] || []).filter(n => n !== p.__division),
      } : null,
    };
  }, [selectedFeature]);

  const selectedPendingRequests = useMemo(() => {
    if (!selectedDivisionInfo) return [];
    return (requestsByDivision.get(selectedDivisionInfo.number) || []).filter(r => r.status === 'pending');
  }, [requestsByDivision, selectedDivisionInfo]);

  const myPendingRequest = useMemo(() => {
    if (!user) return null;
    return selectedPendingRequests.find(r => r.user_id === user.id) || null;
  }, [selectedPendingRequests, user]);

  const isUnclaimed = selectedDivisionInfo && !selectedDivisionInfo.is_abaton && selectedDivisionInfo.owner === 'Unclaimed';

  // ── Interaction handlers ────────────────────────────────
  const onDeckHover = useCallback((info) => {
    if (info.object) {
      const divNum = info.object.properties?.__division;
      if (divNum && hoveredDivisionRef.current !== divNum) {
        hoveredDivisionRef.current = divNum;
        setHoveredDivision(divNum);
        setHoveredFeature(info.object);
      }
    } else if (hoveredDivisionRef.current !== null) {
      hoveredDivisionRef.current = null;
      setHoveredDivision(null);
      setHoveredFeature(null);
    }
  }, []);

  const selectFeature = useCallback((feature) => {
    if (!feature) return;
    setSelectedDivision(feature.properties.__division);
    setActiveTab('overview');
    const [minLng, minLat, maxLng, maxLat] = bbox(feature);
    mapRef.current?.getMap()?.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding: 40, duration: 800 }
    );
  }, []);

  const onDeckClick = useCallback((info) => {
    if (info.object) selectFeature(info.object);
  }, [selectFeature]);

  const handleJumpToDivision = useCallback((divisionNumber) => {
    const feature = geoJsonData?.features.find(f => f.properties.__division === Number(divisionNumber));
    if (feature) selectFeature(feature);
  }, [geoJsonData, selectFeature]);

  const closeDossier = useCallback(() => {
    setSelectedDivision(null);
  }, []);

  const submitRequest = useCallback((e) => {
    e.preventDefault();
    if (!selectedDivisionInfo) return;
    requestMutation.mutate({ division: selectedDivisionInfo.number, message: reqMessage, color: reqColor });
  }, [selectedDivisionInfo, reqMessage, reqColor, requestMutation]);

  const submitCodex = useCallback((e) => {
    e.preventDefault();
    if (!selectedDivisionInfo || !codexText.trim()) return;
    addCodexMutation.mutate({ division: selectedDivisionInfo.number, text: codexText });
  }, [selectedDivisionInfo, codexText, addCodexMutation]);

  const changeSafety = useCallback((e) => {
    if (!selectedDivisionInfo) return;
    const v = e.target.value;
    safetyMutation.mutate({ division: selectedDivisionInfo.number, safety_rating: v === 'unknown' ? null : Number(v) });
  }, [selectedDivisionInfo, safetyMutation]);

  // ── Search ──────────────────────────────────────────────
  const filteredDomains = useMemo(() => {
    const q = searchQuery.trim();
    let sorted = allDomainsList.slice().sort((a, b) => a.number - b.number);
    if (!q) return sorted;

    const ms = new MiniSearch({ fields: ['name', 'numberString'], searchOptions: { prefix: true, fuzzy: 0.2, combineWith: 'AND' } });
    const docs = sorted.map((d, id) => ({ id, name: d.name, numberString: String(d.number) }));
    ms.addAll(docs);

    const results = ms.search(q);
    const resultIds = new Set(results.map(r => r.id));
    return sorted.filter((d, id) => resultIds.has(id));
  }, [allDomainsList, searchQuery]);

  // ── Real-world municipality/district groupings (visual only) ───
  // Divisions whose population figure is shared with siblings get a colored
  // outline + label so it reads as one region, instead of looking like 5
  // separate cities that each happen to have identical populations.
  const groupOverlayFeatures = useMemo(() => {
    if (!geoJsonData) return [];
    return geoJsonData.features
      .filter(f => (POPULATION_GROUP_MEMBERS[DIVISION_POPULATIONS[f.properties.__division]?.group] || []).length > 1)
      .map(f => ({
        ...f,
        properties: {
          ...f.properties,
          groupAccentColor: GROUP_ACCENT_COLORS[DIVISION_POPULATIONS[f.properties.__division]?.group] || '#94a3b8',
        }
      }));
  }, [geoJsonData]);

  const groupLabelData = useMemo(() => {
    if (!groupOverlayFeatures.length) return [];
    const byGroup = new Map();
    for (const f of groupOverlayFeatures) {
      const group = DIVISION_POPULATIONS[f.properties.__division]?.group;
      if (!byGroup.has(group)) {
        byGroup.set(group, { features: [], label: DIVISION_POPULATIONS[f.properties.__division]?.groupLabel, color: f.properties.groupAccentColor });
      }
      byGroup.get(group).features.push(f);
    }
    return Array.from(byGroup.values()).map(g => {
      const [minLng, minLat, maxLng, maxLat] = bbox({ type: 'FeatureCollection', features: g.features });
      return { position: [(minLng + maxLng) / 2, (minLat + maxLat) / 2], text: g.label, color: g.color };
    });
  }, [groupOverlayFeatures]);

  // ── NPC-controlled divisions get a distinct violet outline + "NPC" tag,
  // independent of whether a clan/avatar badge is available for them (a
  // domain owned by a bare owner_name with no linked npc/character record
  // has no clan to show a crest for, but should still read as NPC-held).
  const npcFeatures = useMemo(() => {
    if (!geoJsonData) return [];
    return geoJsonData.features.filter(f => f.properties?.isNpc);
  }, [geoJsonData]);

  const npcLabelData = useMemo(() => {
    return npcFeatures.map(f => {
      const [minLng, minLat, maxLng, maxLat] = bbox(f);
      return { position: [(minLng + maxLng) / 2, (minLat + maxLat) / 2] };
    });
  }, [npcFeatures]);

  // ── Map badges at the center of every claimed division: the clan crest
  // AND the owner's avatar side by side (both visible at once, not one
  // nested inside the other), a clan-name label underneath, and a no-entry
  // sign for Abaton (which has no owner or clan to show). The clan crest
  // can render the moment the clan is known (it's a static per-clan asset);
  // the avatar badge only appears once its blob has actually finished
  // fetching — the two are independent.
  const { clanBadgeData, avatarBadgeData, clanLabelData, abatonBadgeData, abatonFeatures } = useMemo(() => {
    if (!geoJsonData) return { clanBadgeData: [], avatarBadgeData: [], clanLabelData: [], abatonBadgeData: [], abatonFeatures: [] };
    const clanBadges = [];
    const avatarBadges = [];
    const clanLabels = [];
    const abatonBadges = [];
    const abatonFeats = [];
    for (const f of geoJsonData.features) {
      if (f.properties?.isAbaton) {
        const [minLng, minLat, maxLng, maxLat] = bbox(f);
        abatonBadges.push({ position: [(minLng + maxLng) / 2, (minLat + maxLat) / 2] });
        abatonFeats.push(f);
        continue;
      }
      if (!f.properties?.clan) continue;
      const division = f.properties.__division;
      const [minLng, minLat, maxLng, maxLat] = bbox(f);
      const position = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
      clanBadges.push({ position, clan: f.properties.clan });
      clanLabels.push({ position, text: f.properties.clan });

      const avatarUrl = avatarCache[division];
      if (avatarUrl) {
        avatarBadges.push({ position, image: avatarUrl });
      }
    }
    return { clanBadgeData: clanBadges, avatarBadgeData: avatarBadges, clanLabelData: clanLabels, abatonBadgeData: abatonBadges, abatonFeatures: abatonFeats };
  }, [geoJsonData, avatarCache]);

  // ── Athens transit overlay: filter lines + stations by the legend toggles,
  // and decide which station labels are visible at the current zoom ──
  const { transitPathsSolid, transitPathsDashed, transitStationDots, transitLabelData } = useMemo(() => {
    if (!transitOn) {
      return { transitPathsSolid: [], transitPathsDashed: [], transitStationDots: [], transitLabelData: [] };
    }
    const active = TRANSIT_GROUPS.filter(g => transitGroups[g.key]);
    const lineOn = (l) => active.some(g => g.matchLine(l));
    const stationOn = (s) => active.some(g => g.matchStation(s));
    const solid = [];
    const dashed = [];
    for (const p of TRANSIT_PATHS) {
      if (!lineOn(p)) continue;
      (p.status === 'construction' ? dashed : solid).push(p);
    }
    const dots = TRANSIT_STATIONS.filter(stationOn);
    const labelAll = zoom >= TRANSIT_LABEL_ALL_ZOOM;
    const labels = dots.filter(s => s.interchange || labelAll);
    return { transitPathsSolid: solid, transitPathsDashed: dashed, transitStationDots: dots, transitLabelData: labels };
  }, [transitOn, transitGroups, zoom]);

  // ── Catacombs overlay (admin only): split passages by certainty so each
  // tier can carry its own dash pattern, and gate the whole thing behind the
  // per-tier toggles ──
  const { catacombPassageTiers, catacombSiteDots, catacombLabelData } = useMemo(() => {
    if (!catacombsOn) return { catacombPassageTiers: [], catacombSiteDots: [], catacombLabelData: [] };
    const tiers = Object.keys(CATACOMB_CERTAINTY)
      .filter(t => catacombsTiers[t])
      .map(t => ({
        tier: t,
        ...CATACOMB_CERTAINTY[t],
        paths: CATACOMB_PASSAGES.filter(p => p.certainty === t),
      }))
      .filter(t => t.paths.length);
    const sites = CATACOMB_SITES.filter(s => catacombsTiers[s.certainty]);
    // Landmark sites (caves, shrines, junctions, cisterns) are always named;
    // the rest only once you zoom in, so the wide view stays readable.
    const LANDMARK = new Set(['cave', 'shrine', 'junction', 'cistern']);
    const labelAll = zoom >= TRANSIT_LABEL_ALL_ZOOM;
    const labels = sites.filter(s => labelAll || LANDMARK.has(s.siteType));
    return { catacombPassageTiers: tiers, catacombSiteDots: sites, catacombLabelData: labels };
  }, [catacombsOn, catacombsTiers, zoom]);

  // ── Necropoleis overlay (admin only): the OLD necropolis draws one ragged
  // PathLayer per certainty tier (charted / hearsay / lost) for its dash; the
  // NEW necropolis draws as one solid group. ──
  const { necroDrawGroups, necroSiteDots, necroLabelData } = useMemo(() => {
    if (!necroOldOn && !necroNewOn) {
      return { necroDrawGroups: [], necroSiteDots: [], necroLabelData: [] };
    }
    const groups = [];
    if (necroOldOn) {
      for (const t of Object.keys(NECRO_CERTAINTY)) {
        if (!necroOldTiers[t]) continue;
        const paths = NECRO_PASSAGES.filter(p => p.necropolis === 'old' && p.certainty === t);
        if (paths.length) groups.push({ id: `old-${t}`, paths, ...NECRO_CERTAINTY[t] });
      }
    }
    if (necroNewOn) {
      const paths = NECRO_PASSAGES.filter(p => p.necropolis === 'new');
      if (paths.length) groups.push({ id: 'new', paths, color: NECRO_NEW_COLOR, dash: null, width: NECRO_NEW_WIDTH });
    }
    const sites = NECRO_SITES.filter(s => (s.necropolis === 'old' && necroOldOn) || (s.necropolis === 'new' && necroNewOn));
    // Always name the entrances and the notable markers; the rest at zoom.
    const KEY = new Set(['new_entrance', 'entrance', 'seal', 'unknown', 'server_room', 'furnace']);
    const labelAll = zoom >= TRANSIT_LABEL_ALL_ZOOM;
    const labels = sites.filter(s => labelAll || KEY.has(s.siteType));
    return { necroDrawGroups: groups, necroSiteDots: sites, necroLabelData: labels };
  }, [necroOldOn, necroNewOn, necroOldTiers, zoom]);

  // ── Build Deck.gl layers ────────────────────────────────
  const deckLayers = useMemo(() => {
    if (!geoJsonData) return [];

    const layers = [];

    // ─── Layer 1: Extruded base — fill = Masquerade safety, border = owner color ──
    // The id switches with clean-map mode on purpose: toggling `extruded` +
    // `material` on a live GeoJsonLayer leaves deck.gl's lit polygon model in a
    // half-updated state (colours come back muddy/unlit). A distinct id forces
    // a clean teardown + rebuild each time the mode flips.
    layers.push(
      new GeoJsonLayer({
        id: cleanMap ? 'domains-base-flat' : 'domains-base-3d',
        data: geoJsonData,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: !cleanMap,
        wireframe: !cleanMap,
        // High ambient so the Masquerade-safety tier colour reads true on the
        // extruded tops instead of being darkened into a muddy khaki by the
        // scene lighting.
        material: { ambient: 0.85, diffuse: 0.35, shininess: 16, specularColor: [200, 200, 200] },
        getElevation: (f) => {
          if (cleanMap) return 0;
          if (f.properties?.isAbaton) return 260; // always looms, regardless of safety
          const claimed = !!f.properties?.claimed;
          const heightRating = f.properties?.safetyRating ?? 5; // Unknown = mid-height
          const base = claimed
            ? 100 + (10 - heightRating) * 70
            : (f.properties?.pendingRequests ? 40 : 15);
          if (f.properties?.__division === selectedDivision) return base + 80;
          return base;
        },
        elevationScale: 1,
        getFillColor: (f) => {
          const div = f.properties?.__division;
          const isSelected = div === selectedDivision;
          const isHovered = div === hoveredDivision;
          // Clean map: no ownership colour at all — just a faint wash on the
          // division you have open so you can see what you clicked.
          if (cleanMap) return isSelected ? [148, 163, 184, 40] : [0, 0, 0, 0];
          if (f.properties?.isAbaton) {
            return hexToRgba('#7f1d1d', isSelected ? 235 : 200);
          }
          const claimed = !!f.properties?.claimed;
          const rating = f.properties?.safetyRating;
          const tier = safetyTier(rating);
          // Claimed divisions are strongly tinted by Masquerade-safety tier so
          // the board reads at a glance; unclaimed stay near-invisible.
          let a;
          if (!claimed) a = rating == null ? 14 : 70;
          else a = rating == null ? 95 : 175;
          if (isSelected) a = Math.min(245, a + 75);
          else if (isHovered) a = Math.min(245, a + 40);
          return hexToRgba(tier.color, a);
        },
        getLineColor: (f) => {
          const div = f.properties?.__division;
          if (cleanMap) {
            return div === selectedDivision ? [255, 255, 255, 220] : [148, 163, 184, 75];
          }
          const claimed = !!f.properties?.claimed;
          const hasPending = !claimed && f.properties?.pendingRequests > 0;
          if (div === selectedDivision) return hexToRgba('#ffffff', 235);
          if (f.properties?.isAbaton) return hexToRgba('#ef4444', div === hoveredDivision ? 255 : 210);
          if (hasPending) return hexToRgba('#f59e0b', 220);
          if (claimed) return hexToRgba(f.properties?.claimColor || '#888888', div === hoveredDivision ? 255 : 200);
          return hexToRgba('#888888', div === hoveredDivision ? 140 : 70);
        },
        getLineWidth: (f) => {
          const div = f.properties?.__division;
          if (cleanMap) return div === selectedDivision ? 2 : 0.8;
          const claimed = !!f.properties?.claimed;
          const hasPending = !claimed && f.properties?.pendingRequests > 0;
          if (div === selectedDivision) return 4;
          if (div === hoveredDivision) return 2.5;
          if (f.properties?.isAbaton) return 2.5;
          if (hasPending) return 2;
          return 1.2;
        },
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 1,
        onHover: onDeckHover,
        onClick: onDeckClick,
        updateTriggers: {
          getFillColor: [selectedDivision, hoveredDivision, cleanMap],
          getLineColor: [selectedDivision, hoveredDivision, cleanMap],
          getLineWidth: [selectedDivision, hoveredDivision, cleanMap],
          getElevation: [selectedDivision, cleanMap],
        },
        transitions: {
          getFillColor: 200,
          getLineColor: 200,
          getLineWidth: 200
        }
      })
    );

    // ─── Everything below is ownership decoration — skipped entirely in
    // clean-map mode (transit + catacombs overlays are handled separately). ──
    if (!cleanMap) {

    // ─── Abaton hazard stripes — draped onto each Abaton polygon the same
    // way the hover-avatar reveal drapes a face onto a division, just
    // always-on instead of hover-gated (see the mask+bitmap pattern below).
    for (const feature of abatonFeatures) {
      const division = feature.properties.__division;
      layers.push(
        new SolidPolygonLayer({
          id: `abaton-mask-${division}`,
          data: [feature],
          getPolygon: d => d.geometry.coordinates,
          operation: 'mask',
          getFillColor: [255, 255, 255, 255],
        })
      );
      const [minLng, minLat, maxLng, maxLat] = bbox(feature);
      layers.push(
        new BitmapLayer({
          id: `abaton-stripes-${division}`,
          image: ABATON_STRIPE_IMG,
          bounds: [minLng, minLat, maxLng, maxLat],
          extensions: [new MaskExtension()],
          maskId: `abaton-mask-${division}`,
        })
      );
    }

    // ─── NPC outline + tag — same glow-then-crisp treatment as the
    // municipal-group borders, so it reads as a distinct "system" marker
    // regardless of whether that division also has a clan/avatar badge.
    if (npcFeatures.length) {
      layers.push(
        new GeoJsonLayer({
          id: 'npc-outline-glow',
          data: npcFeatures,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          getLineColor: hexToRgba(NPC_ACCENT_COLOR, 90),
          getLineWidth: 6,
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: 4,
          parameters: { depthTest: false },
        })
      );
      layers.push(
        new GeoJsonLayer({
          id: 'npc-outline',
          data: npcFeatures,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          getLineColor: hexToRgba(NPC_ACCENT_COLOR, 255),
          getLineWidth: 2,
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: 1.5,
          parameters: { depthTest: false },
        })
      );
      layers.push(
        new TextLayer({
          id: 'npc-tags',
          data: npcLabelData,
          getPosition: d => d.position,
          getText: () => 'NPC',
          getSize: 11,
          getColor: hexToRgba(NPC_ACCENT_COLOR, 255),
          getPixelOffset: [0, -(badgeSize / 2 + 14)],
          fontFamily: '"Courier New", monospace',
          fontWeight: 800,
          billboard: true,
          background: true,
          getBackgroundColor: [10, 10, 10, 200],
          backgroundPadding: [6, 3],
          pickable: false,
          parameters: { depthTest: false },
          updateTriggers: { getPixelOffset: [badgeSize] },
        })
      );
    }

    // ─── Clan badge: dark backdrop disc + masked white clan crest, at the
    // division's center. Plain deck.gl icon loading — no canvas involved.
    if (clanBadgeData.length) {
      layers.push(
        new ScatterplotLayer({
          id: 'clan-badge-backdrop',
          data: clanBadgeData,
          getPosition: d => d.position,
          getRadius: badgeSize / 2 + 3,
          radiusUnits: 'pixels',
          radiusMinPixels: 14,
          stroked: true,
          filled: true,
          getFillColor: [10, 10, 10, 205],
          getLineColor: d => hexToRgba(clanTint(d.clan), 255),
          getLineWidth: 2,
          lineWidthUnits: 'pixels',
          pickable: false,
          parameters: { depthTest: false },
          updateTriggers: { getRadius: [badgeSize] },
        })
      );
      layers.push(
        new IconLayer({
          id: 'clan-badges',
          data: clanBadgeData,
          getPosition: d => d.position,
          getIcon: d => ({ url: symlogo(d.clan), width: 128, height: 128, mask: true }),
          getSize: badgeSize * 0.6,
          sizeUnits: 'pixels',
          getColor: [240, 240, 245, 235],
          pickable: false,
          parameters: { depthTest: false },
          updateTriggers: { getSize: [badgeSize] },
          transitions: { getSize: 150 },
        })
      );
    }

    // ─── Avatar badge: the owner's actual photo — a plain square icon (like
    // the dossier's avatar), offset to sit just right of the clan badge.
    if (avatarBadgeData.length) {
      layers.push(
        new IconLayer({
          id: 'avatar-badges',
          data: avatarBadgeData,
          getPosition: d => d.position,
          getIcon: d => ({ url: d.image, width: 64, height: 64 }),
          getSize: badgeSize,
          sizeUnits: 'pixels',
          getPixelOffset: [badgeOffset, 0],
          pickable: false,
          parameters: { depthTest: false },
          updateTriggers: { getSize: [badgeSize], getPixelOffset: [badgeOffset] },
          transitions: { getSize: 150 },
        })
      );
    }

    // ─── Clan name label, underneath the badge pair ──
    if (clanLabelData.length) {
      layers.push(
        new TextLayer({
          id: 'clan-name-labels',
          data: clanLabelData,
          getPosition: d => d.position,
          getText: d => d.text,
          getSize: 11,
          getColor: [230, 230, 235, 235],
          getPixelOffset: [badgeOffset / 2, badgeSize / 2 + 12],
          fontFamily: '"Courier New", monospace',
          fontWeight: 700,
          billboard: true,
          background: true,
          getBackgroundColor: [10, 10, 10, 190],
          backgroundPadding: [5, 3],
          pickable: false,
          parameters: { depthTest: false },
          updateTriggers: { getPixelOffset: [badgeOffset, badgeSize] },
        })
      );
    }
    if (abatonBadgeData.length) {
      layers.push(
        new ScatterplotLayer({
          id: 'abaton-badge-backdrop',
          data: abatonBadgeData,
          getPosition: d => d.position,
          getRadius: badgeSize / 2 + 3,
          radiusUnits: 'pixels',
          radiusMinPixels: 14,
          stroked: true,
          filled: true,
          getFillColor: [12, 4, 4, 210],
          getLineColor: [239, 68, 68, 255],
          getLineWidth: 2,
          lineWidthUnits: 'pixels',
          pickable: false,
          parameters: { depthTest: false },
          updateTriggers: { getRadius: [badgeSize] },
        })
      );
      layers.push(
        new IconLayer({
          id: 'abaton-badges',
          data: abatonBadgeData,
          getPosition: d => d.position,
          getIcon: () => ({ url: NO_ENTRY_ICON, width: 64, height: 64 }),
          getSize: badgeSize,
          sizeUnits: 'pixels',
          pickable: false,
          parameters: { depthTest: false },
          updateTriggers: { getSize: [badgeSize] },
          transitions: { getSize: 150 },
        })
      );
    }

    // ─── Municipality/district grouping overlay (flat, ownership-agnostic) ──
    // depthTest is off on purpose: these are ground-level, but claimed
    // divisions extrude upward into 3D "buildings" that would otherwise
    // occlude a flat line/label sitting behind them from this camera angle.
    // Treat them like a HUD annotation that always reads on top.
    if (groupOverlayFeatures.length) {
      // Soft outer glow pass, then a crisp bright pass on top — same trick
      // as the selection glow, just static, so the border actually pops
      // against a busy, colorful, already-claimed map.
      layers.push(
        new GeoJsonLayer({
          id: 'municipal-groups-glow',
          data: groupOverlayFeatures,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          getLineColor: f => hexToRgba(f.properties.groupAccentColor, 90),
          getLineWidth: 7,
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: 5,
          parameters: { depthTest: false },
        })
      );
      layers.push(
        new GeoJsonLayer({
          id: 'municipal-groups',
          data: groupOverlayFeatures,
          pickable: false,
          stroked: true,
          filled: false,
          extruded: false,
          getLineColor: f => hexToRgba(f.properties.groupAccentColor, 255),
          getLineWidth: 3,
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: 2,
          parameters: { depthTest: false },
        })
      );
      layers.push(
        new TextLayer({
          id: 'municipal-group-labels',
          data: groupLabelData,
          getPosition: d => d.position,
          getText: d => d.text,
          getSize: 12,
          getColor: d => hexToRgba(d.color, 255),
          fontFamily: '"Courier New", monospace',
          fontWeight: 700,
          billboard: true,
          background: true,
          getBackgroundColor: [10, 10, 10, 200],
          backgroundPadding: [6, 4],
          parameters: { depthTest: false },
        })
      );
    }

    } // end if (!cleanMap) — ownership decoration

    // ─── Athens transit overlay — metro / tram / suburban lines + stations ──
    // Ground-level annotation drawn over the 3D extrusions (depthTest off, the
    // same treatment as the municipal-group borders) so it reads like a transit
    // map laid over the territory board.
    if (transitPathsSolid.length || transitPathsDashed.length) {
      layers.push(
        new PathLayer({
          id: 'transit-casing',
          data: transitPathsSolid.concat(transitPathsDashed),
          getPath: d => d.path,
          getColor: [8, 8, 12, 215],
          getWidth: 9,
          widthUnits: 'pixels',
          widthMinPixels: 5,
          capRounded: true,
          jointRounded: true,
          parameters: { depthTest: false },
          pickable: false,
        })
      );
      layers.push(
        new PathLayer({
          id: 'transit-lines',
          data: transitPathsSolid,
          getPath: d => d.path,
          getColor: d => hexToRgba(d.colour, 255),
          getWidth: 4.5,
          widthUnits: 'pixels',
          widthMinPixels: 3,
          capRounded: true,
          jointRounded: true,
          parameters: { depthTest: false },
          pickable: true,
          onHover: onOverlayHover,
          updateTriggers: { getColor: [transitPathsSolid.length] },
        })
      );
      if (transitPathsDashed.length) {
        layers.push(
          new PathLayer({
            id: 'transit-lines-construction',
            data: transitPathsDashed,
            getPath: d => d.path,
            getColor: d => hexToRgba(d.colour, 240),
            getWidth: 4.5,
            widthUnits: 'pixels',
            widthMinPixels: 3,
            getDashArray: [8, 5],
            dashJustified: true,
            extensions: [new PathStyleExtension({ dash: true })],
            parameters: { depthTest: false },
            pickable: false,
          })
        );
      }
    }
    if (transitStationDots.length) {
      layers.push(
        new ScatterplotLayer({
          id: 'transit-stations',
          data: transitStationDots,
          getPosition: d => d.position,
          getRadius: d => (d.interchange ? 5 : 3),
          radiusUnits: 'pixels',
          radiusMinPixels: 2,
          radiusMaxPixels: 6,
          stroked: true,
          filled: true,
          getFillColor: d => (d.interchange ? [14, 14, 18, 255] : hexToRgba(d.colour, 255)),
          getLineColor: d => (d.interchange ? [245, 245, 250, 255] : hexToRgba(d.colour, 255)),
          getLineWidth: d => (d.interchange ? 2 : 1),
          lineWidthUnits: 'pixels',
          parameters: { depthTest: false },
          pickable: true,
          onHover: onOverlayHover,
          updateTriggers: { getRadius: [transitStationDots.length], getFillColor: [transitStationDots.length] },
        })
      );
    }
    if (transitLabelData.length) {
      layers.push(
        new TextLayer({
          id: 'transit-station-labels',
          data: transitLabelData,
          getPosition: d => d.position,
          getText: d => d.name,
          getSize: d => (d.interchange ? 12 : 10),
          getColor: d => (d.status === 'construction' ? [253, 186, 116, 255] : [235, 238, 245, 255]),
          getPixelOffset: [0, -10],
          fontFamily: '"Courier New", monospace',
          fontWeight: 700,
          billboard: true,
          background: true,
          getBackgroundColor: [8, 10, 14, 210],
          backgroundPadding: [4, 2],
          parameters: { depthTest: false },
          pickable: false,
          updateTriggers: {
            getText: [transitLabelData.length],
            getSize: [transitLabelData.length],
            getColor: [transitLabelData.length],
          },
        })
      );
    }

    // ─── Catacombs overlay (admin only) — buried rivers, Hadrian's Aqueduct,
    // quarry-caves and the storyteller tunnels that join them. One PathLayer
    // per certainty tier so each gets its own dash (solid / dashed / dotted). ──
    if (catacombPassageTiers.length) {
      // one dark casing pass under every tier
      layers.push(
        new PathLayer({
          id: 'catacombs-casing',
          data: catacombPassageTiers.flatMap(t => t.paths),
          getPath: d => d.path,
          getColor: [4, 3, 6, 220],
          getWidth: 8,
          widthUnits: 'pixels',
          widthMinPixels: 4.5,
          capRounded: true,
          jointRounded: true,
          parameters: { depthTest: false },
          pickable: false,
        })
      );
      for (const t of catacombPassageTiers) {
        layers.push(
          new PathLayer({
            id: `catacombs-passages-${t.tier}`,
            data: t.paths,
            getPath: d => d.path,
            getColor: hexToRgba(t.color, 245),
            getWidth: t.tier === 'attested' ? 4.5 : t.tier === 'inferred' ? 4 : 3.5,
            widthUnits: 'pixels',
            widthMinPixels: 2.5,
            capRounded: !t.dash,
            jointRounded: true,
            ...(t.dash
              ? {
                  getDashArray: t.dash,
                  dashJustified: true,
                  dashGapPickable: false,
                  extensions: [new PathStyleExtension({ dash: true })],
                }
              : {}),
            parameters: { depthTest: false },
            pickable: true,
            onHover: onOverlayHover,
          })
        );
      }
    }
    if (catacombSiteDots.length) {
      layers.push(
        new ScatterplotLayer({
          id: 'catacombs-sites',
          data: catacombSiteDots,
          getPosition: d => d.position,
          getRadius: d => (d.siteType === 'cave' || d.siteType === 'junction' ? 5.5 : 4),
          radiusUnits: 'pixels',
          radiusMinPixels: 3,
          radiusMaxPixels: 7,
          stroked: true,
          filled: true,
          getFillColor: d => hexToRgba(CATACOMB_SITE_COLOR[d.siteType] || '#e6d5a8', 235),
          getLineColor: [10, 8, 12, 255],
          getLineWidth: 1.5,
          lineWidthUnits: 'pixels',
          parameters: { depthTest: false },
          pickable: true,
          onHover: onOverlayHover,
          updateTriggers: { getFillColor: [catacombSiteDots.length], getRadius: [catacombSiteDots.length] },
        })
      );
    }
    if (catacombLabelData.length) {
      layers.push(
        new TextLayer({
          id: 'catacombs-site-labels',
          data: catacombLabelData,
          getPosition: d => d.position,
          getText: d => d.name,
          getSize: 11,
          getColor: [235, 224, 196, 255],
          getPixelOffset: [0, -12],
          fontFamily: '"Courier New", monospace',
          fontWeight: 700,
          billboard: true,
          background: true,
          getBackgroundColor: [10, 6, 12, 220],
          backgroundPadding: [4, 2],
          parameters: { depthTest: false },
          pickable: false,
          updateTriggers: { getText: [catacombLabelData.length] },
        })
      );
    }

    // ─── Necropoleis overlay (admin only) — the ragged OLD necropolis and the
    // small NEW one. The OLD galleries are deliberately jagged and broken. ──
    if (necroDrawGroups.length) {
      layers.push(
        new PathLayer({
          id: 'necro-casing',
          data: necroDrawGroups.flatMap(g => g.paths),
          getPath: d => d.path,
          getColor: [3, 4, 3, 215],
          getWidth: 8,
          widthUnits: 'pixels',
          widthMinPixels: 4.5,
          jointRounded: true,
          parameters: { depthTest: false },
          pickable: false,
        })
      );
      for (const g of necroDrawGroups) {
        layers.push(
          new PathLayer({
            id: `necro-${g.id}`,
            data: g.paths,
            getPath: d => d.path,
            getColor: hexToRgba(g.color, g.id === 'new' ? 255 : 245),
            getWidth: g.width || 3,
            widthUnits: 'pixels',
            widthMinPixels: 2,
            jointRounded: true,
            ...(g.dash
              ? {
                  getDashArray: g.dash,
                  dashJustified: true,
                  extensions: [new PathStyleExtension({ dash: true })],
                }
              : {}),
            parameters: { depthTest: false },
            pickable: true,
            onHover: onOverlayHover,
          })
        );
      }
    }
    if (necroSiteDots.length) {
      layers.push(
        new ScatterplotLayer({
          id: 'necro-sites',
          data: necroSiteDots,
          getPosition: d => d.position,
          getRadius: d => (d.siteType === 'new_entrance' || d.siteType === 'server_room' || d.siteType === 'furnace' ? 7.5 : d.siteType === 'unknown' || d.siteType === 'seal' ? 5.5 : 4),
          radiusUnits: 'pixels',
          radiusMinPixels: 3,
          radiusMaxPixels: 10,
          stroked: true,
          filled: true,
          getFillColor: d => hexToRgba(NECRO_SITE_COLOR[d.siteType] || '#c8d0c0', d.siteType === 'new_entrance' || d.siteType === 'server_room' || d.siteType === 'furnace' ? 255 : 225),
          getLineColor: d => (d.siteType === 'new_entrance' || d.siteType === 'server_room' || d.siteType === 'furnace' ? [255, 255, 255, 255] : [6, 8, 6, 255]),
          getLineWidth: d => (d.siteType === 'new_entrance' || d.siteType === 'server_room' || d.siteType === 'furnace' ? 2.5 : 1.5),
          lineWidthUnits: 'pixels',
          parameters: { depthTest: false },
          pickable: true,
          onHover: onOverlayHover,
          updateTriggers: { getRadius: [necroSiteDots.length], getFillColor: [necroSiteDots.length] },
        })
      );
    }
    if (necroLabelData.length) {
      layers.push(
        new TextLayer({
          id: 'necro-site-labels',
          data: necroLabelData,
          getPosition: d => d.position,
          getText: d => d.name,
          getSize: d => (d.siteType === 'new_entrance' || d.siteType === 'server_room' || d.siteType === 'furnace' ? 13 : 11),
          getColor: d => (
            d.siteType === 'new_entrance' ? [255, 214, 92, 255]
            : d.siteType === 'server_room' ? [110, 240, 240, 255]
            : d.siteType === 'furnace' ? [255, 150, 70, 255]
            : [222, 228, 210, 255]
          ),
          getPixelOffset: d => [0, d.siteType === 'new_entrance' || d.siteType === 'server_room' || d.siteType === 'furnace' ? -16 : -12],
          fontFamily: '"Courier New", monospace',
          fontWeight: 700,
          billboard: true,
          background: true,
          getBackgroundColor: [6, 8, 6, 220],
          backgroundPadding: [4, 2],
          parameters: { depthTest: false },
          pickable: false,
          updateTriggers: {
            getText: [necroLabelData.length],
            getSize: [necroLabelData.length],
            getColor: [necroLabelData.length],
            getPixelOffset: [necroLabelData.length],
          },
        })
      );
    }

    // ─── Layers: Mask + Image Fill (hover reveals the owner's face) ──
    if (!cleanMap && hoveredFeature) {
      const currentAvatarUrl = avatarCache[hoveredDivision];

      if (currentAvatarUrl && isOwnedClaim(claimByDiv.get(hoveredDivision))) {
        layers.push(
          new SolidPolygonLayer({
            id: 'hover-mask-layer',
            data: [hoveredFeature],
            getPolygon: d => d.geometry.coordinates,
            operation: 'mask',
            getFillColor: [255, 255, 255, 255]
          })
        );

        const [minLng, minLat, maxLng, maxLat] = bbox(hoveredFeature);
        layers.push(
          new BitmapLayer({
            id: 'hover-image-layer',
            image: currentAvatarUrl,
            bounds: [minLng, minLat, maxLng, maxLat],
            extensions: [new MaskExtension()],
            maskId: 'hover-mask-layer'
          })
        );
      }
    }

    return layers;
  }, [geoJsonData, selectedDivision, hoveredDivision, hoveredFeature, avatarCache, onDeckHover, onDeckClick, groupOverlayFeatures, groupLabelData, npcFeatures, npcLabelData, clanBadgeData, avatarBadgeData, clanLabelData, abatonBadgeData, abatonFeatures, claimByDiv, badgeSize, badgeOffset, transitPathsSolid, transitPathsDashed, transitStationDots, transitLabelData, catacombPassageTiers, catacombSiteDots, catacombLabelData, necroDrawGroups, necroSiteDots, necroLabelData, cleanMap, onOverlayHover]);

  // ── Error state ─────────────────────────────────────────
  if (!geoJsonData) {
    return (
      <div className={styles.wrap}>
        <div className={styles.alertError}>Error: Invalid or missing map data.</div>
      </div>
    );
  }

  const INITIAL_VIEW_STATE = {
    longitude: 23.7275,
    latitude: 37.9838,
    zoom: 12,
    minZoom: 11,
    pitch: 45,
    bearing: -12
  };

  const isLoading = isClaimsLoading;
  const safety = selectedDivisionInfo ? safetyTier(selectedDivisionInfo.safety_rating) : null;

  return (
    <>
      <div className={styles.wrap}>
        {/* ── LOADING OVERLAY ── */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className={styles.loadingOverlay}
            >
              <div className={styles.loadingContainer}>
                <div className={styles.loadingLogo}>
                  <span className="material-symbols-outlined">map</span>
                </div>
                <h2 className={styles.loadingTitle}>Establishing Cartography...</h2>
                <div className={styles.loadingBarWrapper}>
                  <motion.div
                    className={styles.loadingBarFill}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
                  />
                </div>
                <p className={styles.loadingText}>Loading territory claims & residents...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Status toast ── */}
        {err && (
          <div className={`${styles.toast} ${styles.toastError}`}>
            {err}
          </div>
        )}

        {/* ── Small "still rendering" chip — the 3D terrain/extrusion scene
             can take a moment to spin up even after data has loaded ── */}
        <AnimatePresence>
          {!mapReady && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={styles.mapLoadingChip}
            >
              <span className={`material-symbols-outlined ${styles.mapLoadingSpinner}`}>progress_activity</span>
              Rendering 3D terrain…
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── DECK.GL + MAPLIBRE ── */}
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller={{ dragRotate: true, touchRotate: true, minPitch: 0, maxPitch: 65 }}
          layers={deckLayers}
          getCursor={({ isHovering }) => isHovering ? 'pointer' : 'grab'}
          onViewStateChange={({ viewState }) => {
            const rounded = Math.round(viewState.zoom * 4) / 4;
            setZoom(z => (z === rounded ? z : rounded));
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <MapGL
            ref={mapRef}
            mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
            style={{ width: '100%', height: '100%' }}
            onLoad={() => setMapReady(true)}
          >
            {/* Native MapLibre labels — superior text rendering (hidden in clean-map mode) */}
            {geoJsonData && !cleanMap && (
              <Source id="domains-labels-src" type="geojson" data={geoJsonData}>
                <Layer
                  id="domains-labels"
                  type="symbol"
                  layout={{
                    'text-field': ['concat', ['to-string', ['get', '__division']], ': ', ['get', '__name']],
                    'text-size': 11,
                    'text-anchor': 'center',
                    'text-allow-overlap': false,
                    'text-ignore-placement': false,
                    'text-font': ['Open Sans Regular']
                  }}
                  paint={{
                    'text-color': 'rgba(255, 255, 255, 0.85)',
                    'text-halo-color': 'rgba(0, 0, 0, 0.9)',
                    'text-halo-width': 2
                  }}
                />
              </Source>
            )}
          </MapGL>
        </DeckGL>

        {/* ── Hover tooltip: quick glance without opening the dossier ── */}
        <AnimatePresence>
          {!cleanMap && hoveredFeature && hoveredDivision !== selectedDivision && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className={styles.hoverTip}
            >
              <span className={styles.hoverTipNum}>#{hoveredFeature.properties.__division}</span>
              <span className={styles.hoverTipName}>{hoveredFeature.properties.__name}</span>
              <span className={styles.hoverTipOwner}>
                {hoveredFeature.properties.isAbaton ? 'Abaton' : hoveredFeature.properties.ownerName}
              </span>
              {hoveredFeature.properties.pendingRequests > 0 && hoveredFeature.properties.ownerName === 'Unclaimed' && (
                <span className={styles.hoverTipPending}>{hoveredFeature.properties.pendingRequests} request{hoveredFeature.properties.pendingRequests > 1 ? 's' : ''} pending</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Overlay hover card: transit / catacomb / necropolis feature info ── */}
        <AnimatePresence>
          {overlayHover && (
            <motion.div
              key="overlay-tip"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className={styles.overlayTip}
              style={{
                left: Math.min(overlayHover.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 280),
                top: overlayHover.y + 14,
              }}
            >
              <span className={styles.overlayTipTitle}>{overlayHover.title}</span>
              {overlayHover.subtitle && <span className={styles.overlayTipSub}>{overlayHover.subtitle}</span>}
              {overlayHover.note && <span className={styles.overlayTipNote}>{overlayHover.note}</span>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── LEFT RAIL: All Divisions ── */}
        <div className={`${styles.rail} ${railOpen ? styles.railOpen : ''}`}>
          <button
            className={styles.railToggle}
            onClick={() => setRailOpen(o => !o)}
            title={railOpen ? 'Collapse' : 'All Divisions'}
          >
            <span className={styles.railToggleIcon}>{railOpen ? '◀' : '▶'}</span>
            {!railOpen && <span className={styles.railToggleLabel}>Divisions</span>}
          </button>

          {railOpen && (
            <div className={styles.railBody}>
              <div className={styles.railHeader}>
                <span className={styles.railTitle}>All Divisions</span>
                <span className={styles.railCount}>{allDomainsList.length}</span>
              </div>
              <div className={styles.railSearch}>
                <input
                  className={styles.railSearchInput}
                  type="text"
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className={styles.railList}>
                {filteredDomains.map(domain => {
                  const claimRow = claimByDiv.get(domain.number);
                  const isClaimed = isOwnedClaim(claimRow);
                  const pendingCount = pendingCountByDivision.get(domain.number) || 0;
                  return (
                    <button
                      key={domain.number}
                      className={`${styles.railItem} ${selectedDivision === domain.number ? styles.railItemActive : ''}`}
                      onClick={() => handleJumpToDivision(domain.number)}
                    >
                      <span
                        className={styles.railDot}
                        style={{ background: isClaimed ? (claimRow?.color || '#888') : 'transparent', borderColor: isClaimed ? (claimRow?.color || '#888') : 'rgba(255,255,255,0.15)' }}
                      />
                      <span className={styles.railNum}>#{domain.number}</span>
                      <span className={styles.railName}>{domain.name}</span>
                      {!isClaimed && pendingCount > 0 && (
                        <span className={styles.railPendingDot} title={`${pendingCount} request${pendingCount > 1 ? 's' : ''} pending`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── MAP OVERLAY CONTROLS (top-left, clear of the footer) ── */}
        <div className={`${styles.mapControls} ${railOpen ? styles.mapControlsShifted : ''}`}>
          <div className={styles.layersPanel}>
            <div className={styles.layersPanelHeadRow}>
              <button
                type="button"
                className={styles.layersPanelHead}
                data-open={layersPanelOpen}
                onClick={() => setLayersPanelOpen(o => !o)}
              >
                <svg className={styles.transitToggleIcon} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path fill="currentColor" d="M12 3 2 8l10 5 10-5-10-5Zm0 8.3L4.6 8 12 4.7 19.4 8 12 11.3ZM2 12l10 5 10-5-2.3-1.15L12 14.6 4.3 10.85 2 12Zm0 4 10 5 10-5-2.3-1.15L12 18.6 4.3 14.85 2 16Z" />
                </svg>
                <span className={styles.layersPanelTitle}>Layers</span>
                <span className={styles.layersChevron} data-open={layersPanelOpen}>▾</span>
              </button>
              {(isAdmin || overlayAccess.size > 0) && (
                <button
                  type="button"
                  className={styles.layersManageBtn}
                  title={isAdmin ? 'Manage which players can see the restricted overlays' : 'Share an overlay you have with another player'}
                  onClick={() => setAccessMgrOpen(true)}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                    <path fill="currentColor" d="M12.65 10A6 6 0 1 0 5 17.65l-2 2V22h3l1-1h2v-2h2v-2h1.65A6 6 0 0 0 12.65 10ZM17 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
                  </svg>
                </button>
              )}
            </div>
            <AnimatePresence initial={false}>
              {layersPanelOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className={styles.layersBody}
                >
                  <LayerRow
                    label="Clean map"
                    on={cleanMap}
                    onToggle={toggleCleanMap}
                    accent="slate"
                    title="Hide domain colours, badges and labels — plain Athens map"
                  />

                  <LayerRow label="Transit" on={transitOn} onToggle={toggleTransit} accent="transit">
                    {TRANSIT_GROUPS.map(g => (
                      <LayerSubRow
                        key={g.key}
                        label={g.label}
                        active={!!transitGroups[g.key]}
                        onClick={() => toggleTransitGroup(g.key)}
                        swatch={
                          <span className={`${styles.transitSwatch} ${g.dashed ? styles.transitSwatchDashed : ''}`}>
                            {g.swatch.map((c, i) => <span key={i} style={{ background: c }} />)}
                          </span>
                        }
                      />
                    ))}
                    <span className={styles.layerSubHint}>Zoom in for every station name</span>
                  </LayerRow>

                  {canCatacombs && (
                    <LayerRow label="Catacombs" on={catacombsOn} onToggle={toggleCatacombs} accent="catacombs" title={isAdmin ? 'Admin' : 'Access granted'}>
                      {Object.entries(CATACOMB_CERTAINTY).map(([key, tier]) => (
                        <LayerSubRow
                          key={key}
                          label={tier.label}
                          active={!!catacombsTiers[key]}
                          onClick={() => toggleCatacombsTier(key)}
                          swatch={
                            <span
                              className={styles.catacombSwatch}
                              style={{
                                borderTopColor: tier.color,
                                borderTopStyle: key === 'attested' ? 'solid' : key === 'inferred' ? 'dashed' : 'dotted',
                              }}
                            />
                          }
                        />
                      ))}
                      <span className={styles.layerSubHint}>Rivers &amp; aqueduct real · tunnels imagined</span>
                    </LayerRow>
                  )}

                  {canNecroOld && (
                    <LayerRow label="Old Necropolis" on={necroOldOn} onToggle={toggleNecroOld} accent="necro" title="Fictional">
                      {Object.entries(NECRO_CERTAINTY).map(([key, tier]) => (
                        <LayerSubRow
                          key={key}
                          label={tier.label}
                          active={!!necroOldTiers[key]}
                          onClick={() => toggleNecroOldTier(key)}
                          swatch={
                            <span
                              className={styles.catacombSwatch}
                              style={{
                                borderTopColor: tier.color,
                                borderTopStyle: key === 'charted' ? 'solid' : key === 'hearsay' ? 'dashed' : 'dotted',
                                borderTopWidth: key === 'charted' ? 4 : 3,
                              }}
                            />
                          }
                        />
                      ))}
                      <span className={styles.layerSubHint}>{NECRO_NOTES.old}</span>
                    </LayerRow>
                  )}

                  {canNecroNew && (
                    <LayerRow
                      label="New Necropolis"
                      on={necroNewOn}
                      onToggle={toggleNecroNew}
                      accent="necroNew"
                      title="Fictional"
                    >
                      <span className={styles.layerSubHint}>{NECRO_NOTES.new}</span>
                    </LayerRow>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── RIGHT PANEL: Claimed Divisions (collapsible) ── */}
        <div className={`${styles.claimsPanel} ${claimsPanelOpen ? '' : styles.claimsPanelCollapsed}`}>
          <button
            type="button"
            className={styles.claimsPanelHeader}
            onClick={() => setClaimsPanelOpen(o => !o)}
            title={claimsPanelOpen ? 'Collapse' : 'Expand'}
          >
            <span className={styles.claimsPanelTitle}>Territory</span>
            <span className={styles.claimsPanelCount}>{ownedClaims.length} claimed</span>
            <span className={styles.claimsChevron} data-open={claimsPanelOpen}>▾</span>
          </button>
          <AnimatePresence initial={false}>
            {claimsPanelOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className={styles.claimsPanelInner}
              >
          {ownedClaims.length === 0 ? (
            <p className={styles.claimsPanelEmpty}>No territory claimed.</p>
          ) : (
            <div className={styles.claimsScroll}>
              {ownedClaims
                .slice()
                .sort((a, b) => Number(a.division) - Number(b.division))
                .map(c => {
                  const name = DIVISION_NAMES[c.division] || `Division ${c.division}`;
                  const displayName = c.live_name || c.owner_name || 'Unclaimed';
                  return (
                    <motion.button
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: false, amount: 0.1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      key={c.division}
                      className={`${styles.claimItem} ${selectedDivision === Number(c.division) ? styles.claimItemActive : ''}`}
                      onClick={() => handleJumpToDivision(c.division)}
                      style={{ '--claim-color': c.color || '#888888' }}
                    >
                      <span className={styles.claimColorBar} />
                      {c.is_abaton ? (
                        <div style={{ marginLeft: '12px', flexShrink: 0, width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img src="/img/ui/abaton.jpg" alt="Abaton" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <Avatar userId={c.user_id} npcId={c.owner_npc_id} size={36} style={{ marginLeft: '12px', flexShrink: 0, borderRadius: '50%' }} fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`} />
                      )}
                      <div className={styles.claimBody} style={{ marginLeft: '12px', textAlign: 'left' }}>
                        <span className={styles.claimOwner}>{c.is_abaton ? 'Abaton' : displayName}</span>
                        <span className={styles.claimMeta}>
                          <span className={styles.claimDivNum}>#{c.division}</span>
                          <span className={styles.claimDivName}>{name}</span>
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
            </div>
          )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── DOSSIER: Selected Division inspect panel ── */}
        <AnimatePresence>
          {selectedDivisionInfo && (
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className={`${styles.dossier} ${selectedDivisionInfo.is_abaton ? styles.dossierAbaton : ''}`}
              style={{ '--dossier-color': selectedDivisionInfo.is_abaton ? '#ef4444' : (selectedDivisionInfo.color || '#888888') }}
            >
              <button className={styles.dossierClose} onClick={closeDossier}>✕</button>

              {selectedDivisionInfo.is_abaton ? (
                <div className={styles.abatonHeader}>
                  <span className={`material-symbols-outlined ${styles.abatonIcon}`}>block</span>
                  <div className={styles.dossierTitleBlock}>
                    <span className={styles.dossierDivTag}>DIVISION {selectedDivisionInfo.number}</span>
                    <h3 className={styles.dossierName}>{selectedDivisionInfo.name}</h3>
                    <span className={styles.abatonBadgeText}>⚠ ABATON — SACRED GROUND · OFF LIMITS ⚠</span>
                  </div>
                </div>
              ) : (
                <div className={styles.dossierHeader}>
                  <div className={styles.dossierPortraitWrap}>
                    <div className={styles.dossierPortrait}>
                      {selectedDivisionInfo.owner !== 'Unclaimed' ? (
                        <Avatar
                          userId={selectedDivisionInfo.user_id}
                          npcId={selectedDivisionInfo.npc_id}
                          size={96}
                          fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDivisionInfo.owner)}&background=random`}
                        />
                      ) : (
                        <span className="material-symbols-outlined">public_off</span>
                      )}
                    </div>
                    {selectedDivisionInfo.clan && (
                      <img
                        className={styles.dossierClanBadge}
                        src={symlogo(selectedDivisionInfo.clan)}
                        alt={selectedDivisionInfo.clan}
                        title={selectedDivisionInfo.clan}
                        style={{ '--clan-tint': clanTint(selectedDivisionInfo.clan) }}
                      />
                    )}
                  </div>
                  <div className={styles.dossierTitleBlock}>
                    <span className={styles.dossierDivTag}>DIVISION {selectedDivisionInfo.number}</span>
                    <h3 className={styles.dossierName}>{selectedDivisionInfo.name}</h3>
                    <span className={styles.dossierOwnerLine}>
                      {selectedDivisionInfo.owner}
                      {selectedDivisionInfo.is_npc && <span className={styles.npcTag}>NPC</span>}
                    </span>
                    {selectedDivisionInfo.primaryTitle && (
                      <span className={styles.dossierTitleBadge}>{selectedDivisionInfo.primaryTitle}</span>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.dossierTabs}>
                <button
                  className={`${styles.dossierTab} ${activeTab === 'overview' ? styles.dossierTabActive : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <span className={`material-symbols-outlined ${styles.dossierTabIcon}`}>info</span>
                  <span className={styles.dossierTabLabel}>Overview</span>
                </button>
                <button
                  className={`${styles.dossierTab} ${activeTab === 'requests' ? styles.dossierTabActive : ''}`}
                  onClick={() => setActiveTab('requests')}
                >
                  <span className={`material-symbols-outlined ${styles.dossierTabIcon}`}>how_to_reg</span>
                  <span className={styles.dossierTabLabel}>Requests</span>
                  {selectedPendingRequests.length > 0 && <span className={styles.dossierTabBadge}>{selectedPendingRequests.length}</span>}
                </button>
                <button
                  className={`${styles.dossierTab} ${activeTab === 'codex' ? styles.dossierTabActive : ''}`}
                  onClick={() => setActiveTab('codex')}
                >
                  <span className={`material-symbols-outlined ${styles.dossierTabIcon}`}>menu_book</span>
                  <span className={styles.dossierTabLabel}>Codex</span>
                </button>
                {isCourt && (
                  <button
                    className={`${styles.dossierTab} ${activeTab === 'court' ? styles.dossierTabActive : ''}`}
                    onClick={() => setActiveTab('court')}
                  >
                    <span className={`material-symbols-outlined ${styles.dossierTabIcon}`}>gavel</span>
                    <span className={styles.dossierTabLabel}>Court Intel</span>
                  </button>
                )}
              </div>

              <div className={styles.dossierBody}>
                {activeTab === 'overview' && (
                  <>
                    {!selectedDivisionInfo.is_abaton && (
                      <div className={styles.statBlock}>
                        <span className={styles.statLabel}>Masquerade Safety</span>
                        {selectedDivisionInfo.safety_rating == null ? (
                          <span className={styles.gaugeUnknown}>? Unknown — the Court has not assessed this territory</span>
                        ) : (
                          <>
                            <div className={styles.gaugeTrack}>
                              <div
                                className={styles.gaugeFill}
                                style={{ width: `${(selectedDivisionInfo.safety_rating / 10) * 100}%`, background: safety.color }}
                              />
                            </div>
                            <span className={styles.gaugeReadout} style={{ color: safety.color }}>
                              {selectedDivisionInfo.safety_rating}/10 — {safety.label}
                            </span>
                          </>
                        )}
                        {isCourt && (
                          <div className={styles.safetyEditorRow}>
                            <span className={styles.safetyEditorLabel}>Court: set rating</span>
                            <select
                              className={styles.safetySelect}
                              value={selectedDivisionInfo.safety_rating ?? 'unknown'}
                              onChange={changeSafety}
                              disabled={safetyMutation.isPending}
                            >
                              <option value="unknown">Unknown</option>
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedDivisionInfo.population && (
                      <div className={styles.statBlock}>
                        <span className={styles.statLabel}>Population</span>
                        <span className={styles.statValue}>~{selectedDivisionInfo.population.population.toLocaleString()} residents</span>
                        {selectedDivisionInfo.population.siblings.length > 0 ? (
                          <span className={styles.statSub}>
                            Figure covers the whole {selectedDivisionInfo.population.groupLabel}, not {selectedDivisionInfo.population.placeLabel} alone — shared with division{selectedDivisionInfo.population.siblings.length > 1 ? 's' : ''} {selectedDivisionInfo.population.siblings.map(n => `#${n}`).join(', ')}
                          </span>
                        ) : (
                          <span className={styles.statSub}>{selectedDivisionInfo.population.groupLabel}</span>
                        )}
                      </div>
                    )}

                    {selectedDivisionInfo.claimed_at && (
                      <div className={styles.statBlock}>
                        <span className={styles.statLabel}>Claimed</span>
                        <span className={styles.statValue}>{relTime(selectedDivisionInfo.claimed_at)}</span>
                      </div>
                    )}

                    {selectedDivisionInfo.previous_owner_name && (
                      <div className={styles.statBlock}>
                        <span className={styles.statLabel}>Previously Held By</span>
                        <span className={styles.statValue}>{selectedDivisionInfo.previous_owner_name}</span>
                        {selectedDivisionInfo.previous_claimed_at && (
                          <span className={styles.statSub}>Held until {relTime(selectedDivisionInfo.previous_claimed_at)}</span>
                        )}
                      </div>
                    )}

                    {isCourt && !selectedDivisionInfo.is_abaton && selectedDivisionInfo.owner !== 'Unclaimed' && (
                      <button
                        className={styles.dossierDangerBtn}
                        disabled={vacateMutation.isPending}
                        onClick={() => vacateMutation.mutate(selectedDivisionInfo.number)}
                      >
                        {vacateMutation.isPending ? 'Releasing…' : 'Release Domain'}
                      </button>
                    )}
                  </>
                )}

                {activeTab === 'requests' && (
                  <>
                    {selectedPendingRequests.length === 0 ? (
                      <p className={styles.dossierEmpty}>No open requests for this territory.</p>
                    ) : (
                      <div className={styles.requestList}>
                        {selectedPendingRequests.map(r => (
                          <div key={r.id} className={styles.requestCard} style={{ '--req-color': r.color || '#8b5cf6' }}>
                            <div className={styles.requestCardHeader}>
                              <span className={styles.requestSwatch} />
                              <span className={styles.requestName}>{r.character_name}</span>
                              <span className={styles.requestTime}>{relTime(r.created_at)}</span>
                            </div>
                            <span className={styles.requestBy}>petitioned by {r.requester_name}</span>
                            {r.message && <p className={styles.requestMessage}>&ldquo;{r.message}&rdquo;</p>}
                            {isCourt && (
                              <div className={styles.requestActions}>
                                <button
                                  className={styles.approveBtn}
                                  disabled={resolveMutation.isPending}
                                  onClick={() => resolveMutation.mutate({ requestId: r.id, action: 'approve' })}
                                >Approve</button>
                                <button
                                  className={styles.rejectBtn}
                                  disabled={resolveMutation.isPending}
                                  onClick={() => resolveMutation.mutate({ requestId: r.id, action: 'reject' })}
                                >Deny</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {isUnclaimed && user && !myPendingRequest && (
                      <form className={styles.requestForm} onSubmit={submitRequest}>
                        <span className={styles.statLabel}>Petition the Court for this domain</span>
                        <textarea
                          className={styles.requestTextarea}
                          placeholder="Make your case (optional)…"
                          value={reqMessage}
                          maxLength={500}
                          onChange={e => setReqMessage(e.target.value)}
                        />
                        <div className={styles.requestFormRow}>
                          <input
                            type="color"
                            className={styles.requestColorInput}
                            value={reqColor}
                            onChange={e => setReqColor(e.target.value)}
                            title="Territory color if granted"
                          />
                          <button type="submit" className={styles.requestSubmitBtn} disabled={requestMutation.isPending}>
                            {requestMutation.isPending ? 'Submitting…' : 'Request This Domain'}
                          </button>
                        </div>
                      </form>
                    )}

                    {myPendingRequest && (
                      <p className={styles.dossierEmpty}>Your petition is awaiting Court review.</p>
                    )}
                  </>
                )}

                {activeTab === 'codex' && (
                  <>
                    {isCodexLoading ? (
                      <p className={styles.dossierEmpty}>Loading codex…</p>
                    ) : codexEntries.length === 0 ? (
                      <p className={styles.dossierEmpty}>No lore recorded yet — be the first to add something.</p>
                    ) : (
                      <div className={styles.codexList}>
                        {codexEntries.map(e => (
                          <div key={e.id} className={styles.codexEntry}>
                            <div className={styles.codexEntryHeader}>
                              <span className={styles.codexAuthor}>{e.character_name || e.author_name}</span>
                              <span className={styles.codexTime}>{relTime(e.created_at)}</span>
                            </div>
                            <p className={styles.codexText}>{e.text}</p>
                            {(e.user_id === user?.id || isCourt) && (
                              <button
                                className={styles.codexDeleteBtn}
                                onClick={() => deleteCodexMutation.mutate(e.id)}
                                disabled={deleteCodexMutation.isPending}
                              >Remove</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {user && (
                      <form className={styles.requestForm} onSubmit={submitCodex}>
                        <span className={styles.statLabel}>Add to the codex</span>
                        <textarea
                          className={styles.requestTextarea}
                          placeholder="Rumors, history, whispers about this territory…"
                          value={codexText}
                          maxLength={1000}
                          onChange={e => setCodexText(e.target.value)}
                        />
                        <button type="submit" className={styles.requestSubmitBtn} disabled={addCodexMutation.isPending}>
                          {addCodexMutation.isPending ? 'Posting…' : 'Add Entry'}
                        </button>
                      </form>
                    )}
                  </>
                )}

                {activeTab === 'court' && isCourt && (
                  <>
                    {isProblemsLoading ? (
                      <p className={styles.dossierEmpty}>Loading incident log…</p>
                    ) : problems.length === 0 ? (
                      <p className={styles.dossierEmpty}>No recorded incidents.</p>
                    ) : (
                      <div className={styles.problemList}>
                        {problems.map(p => (
                          <div key={p.id} className={`${styles.problemCard} ${p.resolved ? styles.problemResolved : ''}`}>
                            <span className={styles.problemText}>{p.problem_text}</span>
                            <span className={styles.problemMeta}>
                              {p.resolved ? 'Resolved' : 'Unresolved'} · {relTime(p.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Overlay access: admins manage, holders can spread ── */}
        <AnimatePresence>
          {accessMgrOpen && (
            <OverlayAccessManager userId={user?.id} onClose={() => setAccessMgrOpen(false)} />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
