// src/pages/Domains.jsx
import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import MiniSearch from 'minisearch';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

import styles from '../../styles/Domains.module.css';
import domainsRaw from '../../data/Domains.json';
import api from '../../core/api';
import { Skeleton } from 'boneyard-js/react';
import Avatar from '../../components/Avatar';
import { useQuery } from '@tanstack/react-query';

// --- Division Names Mapping ---
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



export default function Domains() {
  const mapRef = useRef(null);
  const geoJsonRef = useRef(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [selectedDivisionInfo, setSelectedDivisionInfo] = useState(null);
  const [railOpen, setRailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [selectedDivision]);

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

  const getAvatarUrl = useCallback((claim) => {
    if (!claim) return '';
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

  const rosterRef = useRef(roster);
  useEffect(() => { rosterRef.current = roster; }, [roster]);

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
      return { ...f, properties: { ...f?.properties, __division: divisionNumber, __name: divisionName } };
    });
    return { geoJsonData: { ...domainsRaw, features }, allDomainsList: domains };
  }, []);

  const claimByDiv = useMemo(() => new Map(claims.map(c => [Number(c.division), c])), [claims]);
  const numOr = (v, fallback) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : fallback);

  const claimByDivRef = useRef(claimByDiv);
  useEffect(() => {
    claimByDivRef.current = claimByDiv;
  }, [claimByDiv]);

  const style = useCallback((feature) => {
    const n = feature?.properties?.__division;
    const claim = claimByDiv.get(n);

    let fill = claim?.color || feature?.properties?.fill || '#888888';
    let baseOpacity = claim ? 0.60 : numOr(feature?.properties?.['fill-opacity'], 0.35);

    return {
      color: claim?.color || feature?.properties?.stroke || 'var(--border-color)',
      weight: 1.5,
      opacity: numOr(feature?.properties?.['stroke-opacity'], 1),
      fillColor: fill,
      fillOpacity: baseOpacity,
      dashArray: '4',
    };
  }, [claimByDiv]);

  const onEach = useCallback((feature, layer) => {
    const n = feature?.properties?.__division;
    const name = feature?.properties?.__name || `Division ${n}`;

    layer.on({
      mouseover: (e) => {
        const tgt = e.target;
        const clickedDivision = tgt.feature.properties.__division;
        const clickedName = tgt.feature.properties.__name || `Division ${clickedDivision}`;

        const clickedClaim = claimByDivRef.current.get(clickedDivision);

        let r_user_id = clickedClaim?.user_id || null;
        let r_npc_id = clickedClaim?.owner_npc_id || null;

        if (!r_user_id && clickedClaim?.owner_name && rosterRef.current?.length > 0) {
          let match = rosterRef.current.find(r =>
            r.name === clickedClaim.owner_name ||
            (r.titles && r.titles.includes(clickedClaim.owner_name))
          );
          if (match) {
            if (match.type === 'player') r_user_id = match.user_id;
            if (match.type === 'npc') r_npc_id = match.id;
          }
        }

        tgt.setStyle({
          fillColor: clickedClaim && clickedClaim.owner_name !== 'Unclaimed' ? `url(#pattern-${clickedDivision})` : 'url(#unclaimed-pattern)',
          fillOpacity: 0.85,
          weight: 4,
          color: '#c084fc',
          dashArray: ''
        });

        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) tgt.bringToFront();

        setSelectedDivisionInfo({
          number: clickedDivision,
          name: clickedName,
          owner: clickedClaim?.owner_name || 'Unclaimed',
          color: clickedClaim?.color || null,
          user_id: r_user_id,
          npc_id: r_npc_id,
        });
        setSelectedDivision(clickedDivision);
      },
      mouseout: (e) => {
        const tgt = e.target;
        if (geoJsonRef.current) {
          geoJsonRef.current.resetStyle(tgt);
        }
        setSelectedDivision(null);
        setSelectedDivisionInfo(null);
      },
      click: (e) => {
        if (e.originalEvent) L.DomEvent.stopPropagation(e);
        const map = mapRef.current;
        if (map) map.fitBounds(e.target.getBounds(), { padding: [40, 40], maxZoom: 15, duration: 0.5 });
      },
    });

    layer.bindTooltip(`${n}: ${name}`, {
      permanent: true,
      direction: 'center',
      className: styles.divisionLabel,
      opacity: 0.85,
    });

    const esc = (s = '') => s.toString()
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e) => {
      const cls = e.originalEvent.target.classList;
      if (cls.contains('leaflet-container') || cls.contains('leaflet-tile')) {
        if (selectedDivision !== null) {
          const prev = Object.values(geoJsonRef.current?.getLayers() || {}).find(
            l => l.feature.properties.__division === selectedDivision
          );
          if (prev && geoJsonRef.current) geoJsonRef.current.resetStyle(prev);
          setSelectedDivision(null);
          setSelectedDivisionInfo(null);
        }
      }
    };
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [mapRef, selectedDivision]);

  const geoJsonKey = useMemo(() => `geojson-${claims.length}`, [claims]);

  const handleJumpToDivision = useCallback((divisionNumber) => {
    const map = mapRef.current;
    const geoJsonLayer = geoJsonRef.current;
    if (!map || !geoJsonLayer) return;
    const target = geoJsonLayer.getLayers().find(l => l.feature?.properties?.__division === Number(divisionNumber));
    if (target) {
      target.fire('mouseover');
      target.fire('click');
    }
    else console.warn(`Layer for division ${divisionNumber} not found.`);
  }, []);

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

  if (!geoJsonData) {
    return (
      <div className={styles.wrap}>
        <div className={styles.alertError}>Error: Invalid or missing map data.</div>
      </div>
    );
  }

  return (
    <Skeleton name="domains-page" loading={isClaimsLoading}>
      <div className={styles.wrap}>
        <style>{`
          .epic-map-tooltip {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            animation: epicPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          }
          .epic-map-tooltip::before {
            display: none !important;
          }
          .epic-avatar-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
        `}</style>

        {/* ── Status toast ── */}
        {err && (
          <div className={`${styles.toast} ${styles.toastError}`}>
            {err}
          </div>
        )}

        {/* ── SVG PATTERNS ── */}
        <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
          <defs>
            {claims.map(c => {
              const resolvedUrl = getAvatarUrl(c);
              const pId = `pattern-${c.division}`;
              return (
                <pattern
                  key={pId}
                  id={pId}
                  patternUnits="objectBoundingBox"
                  patternContentUnits="objectBoundingBox"
                  width="1"
                  height="1"
                >
                  <rect width="1" height="1" fill={c.color || '#444'} opacity="0.8" />
                  <image
                    href={resolvedUrl}
                    x="0" y="0" width="1" height="1"
                    preserveAspectRatio="xMidYMid slice"
                  />
                </pattern>
              );
            })}
            <pattern id="unclaimed-pattern" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
              <rect width="16" height="16" fill="#1a1a1a" />
              <line x1="0" y1="0" x2="0" y2="16" stroke="#2a2a2a" strokeWidth="2" />
              <line x1="8" y1="0" x2="8" y2="16" stroke="#222" strokeWidth="2" />
            </pattern>
          </defs>
        </svg>

        {/* ── MAP ── */}
        <MapContainer
          whenCreated={(m) => { mapRef.current = m; }}
          center={[37.9838, 23.7275]} // Athens Coordinates
          zoom={12}
          className={styles.map}
          scrollWheelZoom={true}
          preferCanvas={false}
          minZoom={11}
        >
          <TileLayer
            className={styles.darkTileLayer}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <GeoJSON
            key={geoJsonKey}
            ref={geoJsonRef}
            data={geoJsonData}
            style={style}
            onEachFeature={onEach}
          />
        </MapContainer>

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
                      <Avatar userId={c.user_id} npcId={c.owner_npc_id} size={36} style={{ marginLeft: '12px', flexShrink: 0, borderRadius: '50%' }} fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.owner_name || 'Unclaimed')}&background=random`} />
                      <div className={styles.claimBody} style={{ marginLeft: '12px', textAlign: 'left' }}>
                        <span className={styles.claimOwner}>{c.owner_name || 'Unclaimed'}</span>
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
                style={{ backgroundColor: 'rgba(20, 20, 20, 0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '1.5rem', padding: '1.5rem 2rem', minWidth: '320px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative', display: 'flex', gap: '1.5rem', alignItems: 'center' }}
              >
                <button
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.5)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'white'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
                  onClick={() => {
                    if (selectedDivision !== null) {
                      const prev = Object.values(geoJsonRef.current?.getLayers() || {}).find(
                        l => l.feature.properties.__division === selectedDivision
                      );
                      if (prev && geoJsonRef.current) geoJsonRef.current.resetStyle(prev);
                    }
                    setSelectedDivisionInfo(null);
                    setSelectedDivision(null);
                  }}
                >✕</button>

                <div style={{ flexShrink: 0 }}>
                  {selectedDivisionInfo.owner !== 'Unclaimed' ? (
                    <Avatar userId={selectedDivisionInfo.user_id} npcId={selectedDivisionInfo.npc_id} size={80} style={{ borderRadius: '50%', border: '2px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDivisionInfo.owner)}&background=random`} />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255, 255, 255, 0.2)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'rgba(255, 255, 255, 0.5)' }}>public_off</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    {selectedDivisionInfo.color
                      ? <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: selectedDivisionInfo.color, border: '1px solid rgba(255,255,255,0.2)' }} />
                      : <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.2)' }} />
                    }
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Division {selectedDivisionInfo.number}: {selectedDivisionInfo.name}</span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', color: 'white', margin: '0 0 0.5rem 0', fontFamily: '"Playfair Display", serif', fontWeight: 'bold' }}>
                    {selectedDivisionInfo.owner !== 'Unclaimed' ? selectedDivisionInfo.owner : 'Unclaimed'}
                  </h3>

                  {selectedDivisionInfo.owner !== 'Unclaimed' && (
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
    </Skeleton>
  );
}