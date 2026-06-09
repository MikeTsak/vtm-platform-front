// src/pages/Domains.jsx
import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import styles from '../styles/Domains.module.css';
import domainsRaw from '../data/Domains.json';
import api from '../api';
import Loading from '../components/Loading';

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
  const [claims, setClaims]                             = useState([]);
  const [err, setErr]                                   = useState('');
  const [msg, setMsg]                                   = useState('');
  const mapRef                                          = useRef(null);
  const geoJsonRef                                      = useRef(null);
  const [selectedDivision, setSelectedDivision]         = useState(null);
  const [selectedDivisionInfo, setSelectedDivisionInfo] = useState(null);
  const [isLoading, setIsLoading]                       = useState(true);
  const [railOpen, setRailOpen]                         = useState(false);
  const [searchQuery, setSearchQuery]                   = useState('');

  const { geoJsonData, allDomainsList } = useMemo(() => {
    if (!domainsRaw || !Array.isArray(domainsRaw.features)) {
      console.error('Domains.json is missing or has incorrect structure.');
      return { geoJsonData: null, allDomainsList: [] };
    }
    const domains  = [];
    const features = domainsRaw.features.map((f, i) => {
      const divisionNumber = f?.properties?.division != null ? Number(f.properties.division) : (i + 1);
      const divisionName   = DIVISION_NAMES[divisionNumber] || `Division ${divisionNumber}`;
      domains.push({ number: divisionNumber, name: divisionName });
      return { ...f, properties: { ...f?.properties, __division: divisionNumber, __name: divisionName } };
    });
    return { geoJsonData: { ...domainsRaw, features }, allDomainsList: domains };
  }, []);

  const bounds     = useMemo(() => (geoJsonData ? L.geoJSON(geoJsonData).getBounds() : null), [geoJsonData]);
  const claimByDiv = useMemo(() => new Map(claims.map(c => [Number(c.division), c])), [claims]);
  const numOr      = (v, fallback) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : fallback);

  const loadClaims = useCallback(async () => {
    setErr(''); setMsg(''); setIsLoading(true);
    try {
      const { data: claimsData } = await api.get('/domain-claims');
      setClaims(claimsData.claims || []);
    } catch (e) {
      console.error('Error loading claims:', e);
      setErr(e.response?.data?.error || 'Failed to load claims');
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  const style = useCallback((feature) => {
    const n           = feature?.properties?.__division;
    const claim       = claimByDiv.get(n);
    const isSelected  = selectedDivision === n;
    const fill        = claim?.color || feature?.properties?.fill || '#888888';
    const baseOpacity = claim ? 0.60 : numOr(feature?.properties?.['fill-opacity'], 0.35);
    return {
      color:       isSelected ? '#c084fc' : (claim?.color || feature?.properties?.stroke || '#444444'),
      weight:      isSelected ? 3.5 : 1.5,
      opacity:     numOr(feature?.properties?.['stroke-opacity'], 1),
      fillColor:   fill,
      fillOpacity: isSelected ? Math.min(baseOpacity + 0.25, 0.9) : baseOpacity,
      dashArray:   isSelected ? '' : '4',
    };
  }, [selectedDivision, claimByDiv]);

  const onEach = useCallback((feature, layer) => {
    const n     = feature?.properties?.__division;
    const name  = feature?.properties?.__name || `Division ${n}`;
    const claim = claimByDiv.get(n);

    layer.on({
      mouseover: (e) => {
        const tgt = e.target;
        if (selectedDivision !== tgt.feature.properties.__division) {
          const cur = style(tgt.feature);
          tgt.setStyle({ weight: 3, fillOpacity: Math.min(cur.fillOpacity + 0.15, 0.85), dashArray: '', color: '#c084fc' });
          if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront();
        }
      },
      mouseout: (e) => {
        const tgt = e.target;
        if (selectedDivision !== tgt.feature.properties.__division && geoJsonRef.current) {
          geoJsonRef.current.resetStyle(tgt);
        }
      },
      click: (e) => {
        if (e.originalEvent) L.DomEvent.stopPropagation(e);
        const clickedDivision = e.target.feature.properties.__division;
        const map = mapRef.current;
        if (map) map.fitBounds(e.target.getBounds(), { padding: [40, 40], maxZoom: 15, duration: 0.5 });
        if (selectedDivision !== null && selectedDivision !== clickedDivision) {
          const prev = Object.values(geoJsonRef.current?.getLayers() || {}).find(
            l => l.feature.properties.__division === selectedDivision
          );
          if (prev && geoJsonRef.current) geoJsonRef.current.resetStyle(prev);
        }
        setSelectedDivision(clickedDivision);
        const clickedClaim = claimByDiv.get(clickedDivision);
        setSelectedDivisionInfo({
          number: clickedDivision,
          name,
          owner: clickedClaim?.owner_name || 'Unclaimed',
          color: clickedClaim?.color || null,
        });
        setMsg(''); setErr('');
        e.target.bringToFront();
        e.target.openPopup();
      },
    });

    layer.bindTooltip(`${n}: ${name}`, {
      permanent: true,
      direction: 'center',
      className: styles.divisionLabel,
      opacity: 0.85,
    });

    const esc = (s = '') => s.toString()
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

    if (claim) {
      layer.bindPopup(
        `<b>Division ${n}: ${esc(name)}</b><br/>` +
        `Owner: ${esc(claim.owner_name)}<br/>` +
        (claim.color ? `Color: <span style="display:inline-block;width:12px;height:12px;background-color:${esc(claim.color)};border:1px solid #fff;margin-right:4px;vertical-align:middle;"></span><code>${esc(claim.color)}</code>` : '')
      );
    } else {
      layer.bindPopup(`<b>Division ${n}: ${esc(name)}</b><br/>Unclaimed`);
    }
  }, [selectedDivision, claimByDiv, style]);

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

  const geoJsonKey = useMemo(() => `geojson-${selectedDivision}-${claims.length}`, [selectedDivision, claims]);

  const handleJumpToDivision = useCallback((divisionNumber) => {
    const map          = mapRef.current;
    const geoJsonLayer = geoJsonRef.current;
    if (!map || !geoJsonLayer) return;
    const target = geoJsonLayer.getLayers().find(l => l.feature?.properties?.__division === Number(divisionNumber));
    if (target) target.fire('click');
    else console.warn(`Layer for division ${divisionNumber} not found.`);
  }, []);

  const filteredDomains = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return allDomainsList
      .slice()
      .sort((a, b) => a.number - b.number)
      .filter(d => !q || d.name.toLowerCase().includes(q) || String(d.number).includes(q));
  }, [allDomainsList, searchQuery]);

  if (isLoading) return <Loading />;
  if (!geoJsonData || !bounds) {
    return (
      <div className={styles.wrap}>
        <div className={styles.alertError}>Error: Invalid or missing map data.</div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>

      {/* ── Status toast ── */}
      {(err || msg) && (
        <div className={`${styles.toast} ${err ? styles.toastError : styles.toastOk}`}>
          {err || msg}
        </div>
      )}

      {/* ── MAP ── */}
      <MapContainer
        whenCreated={(m) => { mapRef.current = m; }}
        bounds={bounds}
        className={styles.map}
        scrollWheelZoom={true}
        preferCanvas={true}
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
                const isClaimed  = claimByDiv.has(domain.number);
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
                  <button
                    key={c.division}
                    className={`${styles.claimItem} ${selectedDivision === Number(c.division) ? styles.claimItemActive : ''}`}
                    onClick={() => handleJumpToDivision(c.division)}
                    style={{ '--claim-color': c.color || '#888888' }}
                  >
                    <span className={styles.claimColorBar} />
                    <div className={styles.claimBody}>
                      <span className={styles.claimOwner}>{c.owner_name || 'Unclaimed'}</span>
                      <span className={styles.claimMeta}>
                        <span className={styles.claimDivNum}>#{c.division}</span>
                        <span className={styles.claimDivName}>{name}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* ── BOTTOM HUD: Selected Division ── */}
      {selectedDivisionInfo && (
        <div className={styles.hud}>
          <div className={styles.hudLeft}>
            {selectedDivisionInfo.color
              ? <span className={styles.hudSwatch} style={{ background: selectedDivisionInfo.color }} />
              : <span className={styles.hudSwatchEmpty} />
            }
            <div className={styles.hudInfo}>
              <span className={styles.hudDivNum}>Division {selectedDivisionInfo.number}</span>
              <span className={styles.hudDivName}>{selectedDivisionInfo.name}</span>
            </div>
          </div>
          <div className={styles.hudRight}>
            <span className={styles.hudOwnerLabel}>Controlled by</span>
            <span className={styles.hudOwner}>{selectedDivisionInfo.owner}</span>
          </div>
          <button
            className={styles.hudClose}
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
        </div>
      )}
    </div>
  );
}