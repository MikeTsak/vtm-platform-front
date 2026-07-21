import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { Map as MapGL, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, BitmapLayer, SolidPolygonLayer } from '@deck.gl/layers';
import { MaskExtension } from '@deck.gl/extensions';
import MiniSearch from 'minisearch';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import bbox from '@turf/bbox';

import styles from '../../styles/Domains.module.css';
import domainsRaw from '../../data/Domains.json';
import api from '../../core/api';
import { Skeleton } from 'boneyard-js/react';
import Avatar from '../../components/Avatar';
import { useQuery } from '@tanstack/react-query';

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
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  if (h.length === 3) {
    const r = ((bigint >> 8) & 0xf) * 17;
    const g = ((bigint >> 4) & 0xf) * 17;
    const b = (bigint & 0xf) * 17;
    return [r, g, b, alpha];
  }
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255, alpha];
}


export default function Domains() {
  const mapRef = useRef(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [selectedDivisionInfo, setSelectedDivisionInfo] = useState(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [hoveredInfo, setHoveredInfo] = useState({ feature: null, divisionId: null, avatarUrl: null });
  const [railOpen, setRailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const hoveredDivisionRef = useRef(null);

  // ── Avatar image cache: division → objectURL ────────────
  const [avatarCache, setAvatarCache] = useState({});

  // ── Data ────────────────────────────────────────────────
  const { data: claimsData, isLoading: isClaimsLoading, error } = useQuery({
    queryKey: ['domain-claims'],
    queryFn: async () => {
      const res = await api.get('/domain-claims');
      return res.data;
    }
  });

  const { data: rosterData } = useQuery({
    queryKey: ['camarilla-roster'],
    queryFn: async () => {
      const res = await api.get('/camarilla/roster');
      return res.data;
    }
  });

  const claims = claimsData?.claims || [];
  const roster = rosterData?.roster || [];
  const err = error?.response?.data?.error || error?.message || '';

  // ── Avatar URL resolver ─────────────────────────────────
  const getAvatarUrl = useCallback((claim) => {
    if (!claim) return '';
    if (claim.is_abaton) return '/img/ui/abaton.jpg';
    const baseUrl = import.meta.env.VITE_API_URL || '/api';

    if (claim.user_id) return `${baseUrl}/users/${claim.user_id}/avatar`;

    if (roster && roster.length > 0) {
      let match = null;
      if (claim.owner_npc_id) {
        match = roster.find(r => r.id === claim.owner_npc_id && r.type === 'npc');
      }
      if (!match && claim.owner_name) {
        match = roster.find(r =>
          r.name === claim.owner_name ||
          (r.titles && r.titles.includes(claim.owner_name))
        );
      }
      if (match) {
        if (match.type === 'player' && match.user_id) return `${baseUrl}/users/${match.user_id}/avatar`;
        if (match.type === 'npc') return `${baseUrl}/npcs/${match.id}/avatar`;
      }
    }

    if (claim.owner_npc_id) return `${baseUrl}/npcs/${claim.owner_npc_id}/avatar`;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(claim.owner_name || 'Unclaimed')}&background=random`;
  }, [roster]);

  // ── Lazy-load avatar image for hovered division ─────────
  useEffect(() => {
    if (!selectedDivision || claims.length === 0) return;
    const claim = claims.find(c => Number(c.division) === selectedDivision);
    if (!claim || claim.owner_name === 'Unclaimed') return;

    if (!avatarCache[selectedDivision]) {
      const url = getAvatarUrl(claim);
      fetchAvatarAsObjectUrl(url)
        .then(objectUrl => {
          setAvatarCache(prev => ({ ...prev, [selectedDivision]: objectUrl }));
        })
        .catch(err => {
          console.warn(`[Domains] Failed to lazy-load avatar for division ${selectedDivision}:`, err.message);
        });
    }
  }, [selectedDivision, claims, avatarCache, getAvatarUrl]);

  // Re-arm cleanup if needed
  useEffect(() => {
    return () => {
      // Cleanup blob URLs on unmount
      Object.values(avatarCache).forEach(url => {
        try { URL.revokeObjectURL(url); } catch (_) { /* noop */ }
      });
    };
  }, [avatarCache]);

  // ── Build GeoJSON with claim properties injected ────────
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
      let claimColor = claim?.color || '#888888';
      let r_user_id = claim?.user_id || null;
      let r_npc_id = claim?.owner_npc_id || null;

      if (!r_user_id && claim?.owner_name && roster?.length > 0) {
        const match = roster.find(r => r.name === claim.owner_name || (r.titles && r.titles.includes(claim.owner_name)));
        if (match) {
          if (match.type === 'player') r_user_id = match.user_id;
          if (match.type === 'npc') r_npc_id = match.id;
        }
      }

      return {
        ...f,
        id: divisionNumber,
        properties: {
          ...f?.properties,
          __division: divisionNumber,
          __name: divisionName,
          claimColor,
          ownerName: claim?.owner_name || 'Unclaimed',
          userId: r_user_id,
          npcId: r_npc_id,
          isAbaton: !!claim?.is_abaton
        }
      };
    });
    return { geoJsonData: { ...domainsRaw, features }, allDomainsList: domains };
  }, [claims, roster]);

  const claimByDiv = useMemo(() => new Map(claims.map(c => [Number(c.division), c])), [claims]);

  // ── Interaction handlers ────────────────────────────────
  const onDeckHover = useCallback((info) => {
    if (info.object) {
      const divNum = info.object.properties?.__division;
      if (divNum && hoveredDivisionRef.current !== divNum) {
        hoveredDivisionRef.current = divNum;
        setSelectedDivision(divNum);
        setHoveredFeature(info.object);
        setHoveredInfo({ feature: info.object, divisionId: divNum });
        setSelectedDivisionInfo({
          number: divNum,
          name: info.object.properties.__name,
          owner: info.object.properties.ownerName,
          color: info.object.properties.claimColor,
          user_id: info.object.properties.userId,
          npc_id: info.object.properties.npcId,
          is_abaton: info.object.properties.isAbaton
        });
      }
    } else {
      if (hoveredDivisionRef.current !== null) {
        hoveredDivisionRef.current = null;
        setSelectedDivision(null);
        setHoveredFeature(null);
        setHoveredInfo({ feature: null, divisionId: null });
        setSelectedDivisionInfo(null);
      }
    }
  }, []);

  const onDeckClick = useCallback((info) => {
    if (info.object) {
      const [minLng, minLat, maxLng, maxLat] = bbox(info.object);
      mapRef.current?.getMap()?.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 40, duration: 800 }
      );
    }
  }, []);

  const handleJumpToDivision = useCallback((divisionNumber) => {
    const feature = geoJsonData?.features.find(f => f.properties.__division === Number(divisionNumber));
    if (feature && mapRef.current) {
      const [minLng, minLat, maxLng, maxLat] = bbox(feature);
      mapRef.current.getMap().fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 40, duration: 800 }
      );

      hoveredDivisionRef.current = Number(divisionNumber);
      setSelectedDivision(Number(divisionNumber));
      setHoveredFeature(feature);
      setHoveredInfo({ feature, divisionId: Number(divisionNumber) });
        setSelectedDivisionInfo({
          number: feature.properties.__division,
          name: feature.properties.__name,
          owner: feature.properties.ownerName,
          color: feature.properties.claimColor,
          user_id: feature.properties.userId,
          npc_id: feature.properties.npcId
        });
      }
    }, [geoJsonData]);

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

  // ── Build Deck.gl layers ────────────────────────────────
  const deckLayers = useMemo(() => {
    if (!geoJsonData) return [];

    const layers = [];

    // ─── Layer 1: Base fill + borders ────────────────────
    layers.push(
      new GeoJsonLayer({
        id: 'domains-base',
        data: geoJsonData,
        pickable: true,
        stroked: true,
        filled: true,
        getFillColor: (f) => {
          const color = f.properties?.claimColor || '#888888';
          const isHovered = f.properties?.__division === selectedDivision;
          return hexToRgba(color, isHovered ? 25 : 80);
        },
        getLineColor: (f) => {
          const color = f.properties?.claimColor || '#888888';
          const isHovered = f.properties?.__division === selectedDivision;
          return hexToRgba(color, isHovered ? 255 : 140);
        },
        getLineWidth: (f) => {
          return f.properties?.__division === selectedDivision ? 4 : 1.5;
        },
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 1,
        onHover: onDeckHover,
        onClick: onDeckClick,
        updateTriggers: {
          getFillColor: [selectedDivision],
          getLineColor: [selectedDivision],
          getLineWidth: [selectedDivision]
        },
        transitions: {
          getFillColor: 200,
          getLineColor: 200,
          getLineWidth: 200
        }
      })
    );

    // ─── Layers 2 & 3: Mask + Image Fill (on hover) ──────
    if (hoveredInfo.feature) {
      const ownerName = hoveredInfo.feature.properties?.ownerName;
      const currentAvatarUrl = avatarCache[selectedDivision];
      
      if (currentAvatarUrl && ownerName !== 'Unclaimed') {

        // Layer 2: The Mask Layer (SolidPolygonLayer)
        layers.push(
          new SolidPolygonLayer({
            id: 'hover-mask-layer',
            data: [hoveredInfo.feature],
            getPolygon: d => d.geometry.coordinates,
            operation: 'mask',
            getFillColor: [255, 255, 255, 255]
          })
        );

        // Layer 3: The Image Fill Layer (BitmapLayer)
        const [minLng, minLat, maxLng, maxLat] = bbox(hoveredInfo.feature);
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
  }, [geoJsonData, selectedDivision, hoveredInfo, avatarCache, onDeckHover, onDeckClick]);

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
    pitch: 0,
    bearing: 0
  };

  const isLoading = isClaimsLoading;

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

        {/* ── DECK.GL + MAPLIBRE ── */}
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller={true}
          layers={deckLayers}
          getCursor={({ isHovering }) => isHovering ? 'pointer' : 'grab'}
          style={{ width: '100%', height: '100%' }}
        >
          <MapGL
            ref={mapRef}
            mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Native MapLibre labels — superior text rendering */}
            {geoJsonData && (
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
                  const isClaimed = claimByDiv.has(domain.number);
                  const claimColor = claimByDiv.get(domain.number)?.color;
                  return (
                    <button
                      key={domain.number}
                      className={`${styles.railItem} ${selectedDivision === domain.number ? styles.railItemActive : ''}`}
                      onClick={() => handleJumpToDivision(domain.number)}
                    >
                      <span
                        className={styles.railDot}
                        style={{ background: isClaimed ? (claimColor || '#888') : 'transparent', borderColor: isClaimed ? (claimColor || '#888') : 'rgba(255,255,255,0.15)' }}
                      />
                      <span className={styles.railNum}>#{domain.number}</span>
                      <span className={styles.railName}>{domain.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Claimed Divisions ── */}
        <div className={styles.claimsPanel}>
          <div className={styles.claimsPanelHeader}>
            <span className={styles.claimsPanelTitle}>Territory</span>
            <span className={styles.claimsPanelCount}>{claims.length} claimed</span>
          </div>
          {claims.length === 0 ? (
            <p className={styles.claimsPanelEmpty}>No territory claimed.</p>
          ) : (
            <div className={styles.claimsScroll}>
              {claims
                .slice()
                .sort((a, b) => Number(a.division) - Number(b.division))
                .map(c => {
                  const name = DIVISION_NAMES[c.division] || `Division ${c.division}`;
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
                        <Avatar userId={c.user_id} npcId={c.owner_npc_id} size={36} style={{ marginLeft: '12px', flexShrink: 0, borderRadius: '50%' }} fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.owner_name || 'Unclaimed')}&background=random`} />
                      )}
                      <div className={styles.claimBody} style={{ marginLeft: '12px', textAlign: 'left' }}>
                        <span className={styles.claimOwner}>{c.is_abaton ? 'Abaton' : (c.owner_name || 'Unclaimed')}</span>
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
        </div>

        {/* ── FLOATING TRANSLUCENT MODAL: Selected Division ── */}
        <AnimatePresence>
          {selectedDivisionInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'auto' }}
            >
              <div
                style={{
                  backgroundColor: 'rgba(20, 20, 20, 0.65)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '1.5rem',
                  padding: '1.5rem 2rem',
                  minWidth: '320px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  position: 'relative',
                  display: 'flex',
                  gap: '1.5rem',
                  alignItems: 'center',
                  overflow: 'hidden'
                }}
              >

                <button
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.5)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', zIndex: 2 }}
                  onMouseEnter={e => e.currentTarget.style.color = 'white'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
                  onClick={() => {
                    hoveredDivisionRef.current = null;
                    setSelectedDivisionInfo(null);
                    setSelectedDivision(null);
                    setHoveredFeature(null);
                  }}
                >✕</button>

                <div style={{ flexShrink: 0, zIndex: 1 }}>
                  {selectedDivisionInfo.is_abaton ? (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                      <img src="/img/ui/abaton.jpg" alt="Abaton" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : selectedDivisionInfo.owner !== 'Unclaimed' ? (
                    <Avatar userId={selectedDivisionInfo.user_id} npcId={selectedDivisionInfo.npc_id} size={80} style={{ borderRadius: '50%', border: '2px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDivisionInfo.owner)}&background=random`} />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255, 255, 255, 0.2)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'rgba(255, 255, 255, 0.5)' }}>public_off</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    {selectedDivisionInfo.color
                      ? <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: selectedDivisionInfo.color, border: '1px solid rgba(255,255,255,0.2)' }} />
                      : <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.2)' }} />
                    }
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Division {selectedDivisionInfo.number}: {selectedDivisionInfo.name}</span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', color: 'white', margin: '0 0 0.5rem 0', fontFamily: '"Playfair Display", serif', fontWeight: 'bold' }}>
                    {selectedDivisionInfo.is_abaton ? 'Abaton' : selectedDivisionInfo.owner !== 'Unclaimed' ? selectedDivisionInfo.owner : 'Unclaimed'}
                  </h3>

                  {selectedDivisionInfo.is_abaton ? (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', letterSpacing: '0.5px' }}>OFF LIMITS</span>
                    </div>
                  ) : selectedDivisionInfo.owner !== 'Unclaimed' && (
                    <div>
                      {selectedDivisionInfo.user_id ? (
                        <Link to={`/character/${selectedDivisionInfo.user_id}`} style={{ fontSize: '0.75rem', color: 'white', textDecoration: 'none', fontWeight: 'bold', padding: '0.25rem 0.75rem', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'inline-block', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}>View Profile</Link>
                      ) : selectedDivisionInfo.npc_id ? (
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>NPC Controlled</span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}