// src/pages/Domains.jsx
import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import styles from '../styles/Domains.module.css'; // Correct import
import domainsRaw from '../data/Domains.json';
import api from '../api';

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
// --- End of Division Names ---

// --- All Domains List Component ---
function AllDomainsList({ domains, onDomainClick }) {
    if (!domains || domains.length === 0) {
        return null;
    }
    // Sort domains numerically by division number
    const sortedDomains = domains.slice().sort((a, b) => a.number - b.number);

    return (
        <div className={styles.allDomainsListWrap}>
            <h4>All Divisions ({sortedDomains.length})</h4>
            <div className={styles.allDomainsList}>
                {sortedDomains.map(domain => (
                    <button
                        key={domain.number}
                        className={styles.allDomainsItem}
                        onClick={() => onDomainClick(domain.number)}
                    >
                        <span className={styles.allDomainsNumber}>#{domain.number}</span>
                        <span className={styles.allDomainsName}>{domain.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
// --- End All Domains List Component ---

export default function Domains() {
  const [claims, setClaims] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const mapRef = useRef(null);
  const geoJsonRef = useRef(null); // Ref to access GeoJSON layer

  const [selectedDivision, setSelectedDivision] = useState(null);
  const [selectedDivisionInfo, setSelectedDivisionInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Corner Positioning State (FIXED: Default to bottom-left)
  const [claimListPosition, setClaimListPosition] = useState('bottom-left');

  // Memoize GeoJSON data and extract domain list
  const { geoJsonData, allDomainsList } = useMemo(
    () => {
        if (!domainsRaw || !Array.isArray(domainsRaw.features)) {
            console.error("Domains.json is missing or has incorrect structure.");
            return { geoJsonData: null, allDomainsList: [] };
        }
        const domains = [];
        const features = domainsRaw.features.map((f, i) => {
            const divisionNumber = f?.properties?.division != null ? Number(f.properties.division) : (i + 1);
            const divisionName = DIVISION_NAMES[divisionNumber] || `Division ${divisionNumber}`;
            domains.push({ number: divisionNumber, name: divisionName });
            return {
              ...f,
              properties: { ...f?.properties, __division: divisionNumber, __name: divisionName },
            };
        });
        return { geoJsonData: { ...domainsRaw, features }, allDomainsList: domains };
    },
    []
  );

  // Calculate bounds
  const bounds = useMemo(() => (geoJsonData ? L.geoJSON(geoJsonData).getBounds() : null), [geoJsonData]);

  // Load claims function
  const loadClaims = useCallback(async (signal) => {
    setErr(''); setMsg(''); setIsLoading(true);
    try {
      const { data: claimsData } = await api.get('/domain-claims', { signal });
      setClaims(claimsData.claims || []);
    } catch (e) { 
      if (e.name === 'CanceledError' || e.name === 'AbortError') return;
      console.error("Error loading claims:", e); 
      setErr(e.response?.data?.error || 'Failed to load claims'); 
    }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { 
    const abortController = new AbortController();
    loadClaims(abortController.signal);
    return () => abortController.abort();
  }, [loadClaims]);

  // Memoized claim lookup
  const claimByDiv = useMemo(() => new Map(claims.map(c => [Number(c.division), c])), [claims]);

  // Helper numOr
  const numOr = (v, fallback) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : fallback);

  // --- Style function ---
  const style = useCallback((feature) => {
    const n = feature?.properties?.__division;
    const claim = claimByDiv.get(n);
    const isSelected = selectedDivision === n;
    const fill = claim?.color || feature?.properties?.fill || '#888888';
    const baseOpacity = claim ? 0.60 : numOr(feature?.properties?.['fill-opacity'], 0.35);

    return {
      color: isSelected ? 'var(--accent-purple)' : (claim?.color || feature?.properties?.stroke || '#444444'),
      weight: isSelected ? 3.5 : 1.5,
      opacity: numOr(feature?.properties?.['stroke-opacity'], 1),
      fillColor: fill,
      fillOpacity: isSelected ? Math.min(baseOpacity + 0.25, 0.9) : baseOpacity,
      dashArray: isSelected ? '' : '4',
    };
  }, [selectedDivision, claimByDiv]);

  // --- onEachFeature ---
  const onEach = useCallback((feature, layer) => {
    const n = feature?.properties?.__division;
    const name = feature?.properties?.__name || `Division ${n}`;
    const claim = claimByDiv.get(n);

    layer.on({
      mouseover: (e) => {
        const targetLayer = e.target;
        const targetDivision = targetLayer.feature.properties.__division;
        if (selectedDivision !== targetDivision) {
          const currentStyle = style(targetLayer.feature);
          targetLayer.setStyle({
            weight: 3,
            fillOpacity: Math.min(currentStyle.fillOpacity + 0.15, 0.85),
            dashArray: '',
            color: 'var(--accent-purple)',
          });
          if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
             layer.bringToFront();
          }
        }
      },
      mouseout: (e) => {
        const targetLayer = e.target;
        const targetDivision = targetLayer.feature.properties.__division;
        if (selectedDivision !== targetDivision && geoJsonRef.current) {
           geoJsonRef.current.resetStyle(targetLayer);
        }
      },
      click: (e) => {
        // Only stop propagation for real DOM events, not synthetic ones
        if (e.originalEvent) {
          L.DomEvent.stopPropagation(e); // Prevent map click right after
        }

        const clickedDivision = e.target.feature.properties.__division;
        const map = mapRef.current;

        // Ensure fitBounds is called *within* the event handler
        if (map) {
          // This provides the smooth zoom
          map.fitBounds(e.target.getBounds(), { padding: [40, 40], maxZoom: 15, duration: 0.5 });
        }

        // Reset previous style *before* setting new state
        if (selectedDivision !== null && selectedDivision !== clickedDivision) {
          const prevLayer = Object.values(geoJsonRef.current?.getLayers() || {}).find(
            l => l.feature.properties.__division === selectedDivision
          );
          if (prevLayer && geoJsonRef.current) {
             geoJsonRef.current.resetStyle(prevLayer);
          }
        }

        // Update state
        setSelectedDivision(clickedDivision);
        const clickedClaim = claimByDiv.get(clickedDivision);
        setSelectedDivisionInfo({
          number: clickedDivision,
          name: name,
          owner: clickedClaim?.owner_name || 'Unclaimed',
          color: clickedClaim?.color || 'N/A',
        });
        setMsg(''); setErr('');
        e.target.bringToFront(); // Bring selected to front
        
        // --- THIS IS THE FIX ---
        // Manually open the popup since we overrode the default click
        e.target.openPopup();
        // --- END OF FIX ---
      },
    });

    // Tooltip (Permanent Label)
    layer.bindTooltip(`${n}: ${name}`, {
      permanent: true,
      direction: 'center',
      className: styles.divisionLabel,
      opacity: 0.85,
    });

    // Popup (On Click)
    const escapeHtml = (unsafe = '') => unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    if (claim) {
      layer.bindPopup(
        `<b>Division ${n}: ${escapeHtml(name)}</b><br/>` +
        `Owner: ${escapeHtml(claim.owner_name)}<br/>` +
        (claim.color ? `Color: <span style="display:inline-block; width:12px; height:12px; background-color:${escapeHtml(claim.color)}; border:1px solid #fff; margin-right: 4px; vertical-align:middle;"></span><code>${escapeHtml(claim.color)}</code>` : '')
      );
    } else {
      layer.bindPopup(`<b>Division ${n}: ${escapeHtml(name)}</b><br/>Unclaimed`);
    }

  }, [selectedDivision, claimByDiv, style]); // Keep style in dependencies

  // --- Handle click outside polygons to deselect ---
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      const handleClickOutside = (e) => {
         const targetClass = e.originalEvent.target.classList;
         if (targetClass.contains('leaflet-container') || targetClass.contains('leaflet-tile')) {
              if (selectedDivision !== null) {
                  const prevLayer = Object.values(geoJsonRef.current?.getLayers() || {}).find(
                      l => l.feature.properties.__division === selectedDivision
                  );
                  if (prevLayer && geoJsonRef.current) {
                      geoJsonRef.current.resetStyle(prevLayer);
                  }
                  setSelectedDivision(null);
                  setSelectedDivisionInfo(null);
              }
         }
      };
      map.on('click', handleClickOutside);
      return () => { map.off('click', handleClickOutside); };
    }
  }, [mapRef, selectedDivision]);

  // Key for GeoJSON component
  const geoJsonKey = useMemo(() => `geojson-${selectedDivision}-${claims.length}`, [selectedDivision, claims]);

  // --- Unified handler for jumping to a division ---
  const handleJumpToDivision = useCallback((divisionNumber) => {
    const map = mapRef.current;
    const geoJsonLayer = geoJsonRef.current;
    if (!map || !geoJsonLayer) return;

    const layers = geoJsonLayer.getLayers();
    const targetLayer = layers.find(layer => layer.feature?.properties?.__division === Number(divisionNumber));

    if (targetLayer) {
        // Fire the click event, which now contains the fitBounds call
        // This will now work because the 'click' handler is fixed
        targetLayer.fire('click');
        // No separate fitBounds call needed here
    } else {
        console.warn(`Layer for division ${divisionNumber} not found.`);
    }
  }, [mapRef, geoJsonRef]); // Dependencies: refs

  // --- Render Logic ---
  if (isLoading) {
    return <div className={styles.loading}>Loading claims and map data...</div>;
  }
  if (!geoJsonData || !bounds) {
    return <div className={`${styles.wrap} ${styles.alertError}`}>Error: Invalid or missing Domains.json map data.</div>;
  }

  return (
    <div className={styles.wrap}>
      {(err || msg) && (
        <div className={`${styles.messageArea} ${err ? styles.alertError : styles.alertOk}`}>
          {err || msg}
        </div>
      )}

      {/* Main content area: Map + All Domains List */}
      <div className={styles.mainContent}>
        <MapContainer
          whenCreated={(m) => { mapRef.current = m; }}
          bounds={bounds}
          className={styles.map}
          scrollWheelZoom={true}
          preferCanvas={true}
          minZoom={11}
        >
          <TileLayer
            className={styles.darkTileLayer} // Apply dark style
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <GeoJSON
            key={geoJsonKey} // Force re-render on changes
            ref={geoJsonRef}
            data={geoJsonData}
            style={style}
            onEachFeature={onEach}
          />
        </MapContainer>

        {/* Render the All Domains List */}
        <AllDomainsList
            domains={allDomainsList}
            onDomainClick={handleJumpToDivision} // Use the unified handler
        />
      </div>


      {/* Mobile Info Panel (relies on CSS for display) */}
      {selectedDivisionInfo && (
          <div className={styles.infoPanel}>
            <div className={styles.infoPanelContent}>
              <h3>Division {selectedDivisionInfo.number}: {selectedDivisionInfo.name}</h3>
              <p>Owner: {selectedDivisionInfo.owner}</p>
              {selectedDivisionInfo.color !== 'N/A' && (
                <p>Color: <span className={styles.swatch} style={{ background: selectedDivisionInfo.color }} /> <code>{selectedDivisionInfo.color}</code></p>
              )}
            </div>
            <button className={styles.closeInfoPanel} onClick={() => {
              if (selectedDivision !== null) {
                const prevLayer = Object.values(geoJsonRef.current?.getLayers() || {}).find(
                  l => l.feature.properties.__division === selectedDivision
                );
                 if (prevLayer && geoJsonRef.current) { geoJsonRef.current.resetStyle(prevLayer); }
              }
              setSelectedDivisionInfo(null);
              setSelectedDivision(null);
            }}>
              &times;
            </button>
          </div>
      )}

      {/* Claim List Section (Overlay with Corner Positioning) */}
      <div
        className={styles.claimListWrap}
        data-position={claimListPosition} // Link state to CSS for positioning
      >
        <div className={styles.claimListHeader}>
          <h3>Claimed Divisions ({claims.length})</h3>
          {/* Corner Buttons (Desktop Only via CSS) */}
          <div className={styles.cornerButtons}>
             <button title="Move to Top Left" onClick={() => setClaimListPosition('top-left')}>↖</button>
             <button title="Move to Top Right" onClick={() => setClaimListPosition('top-right')}>↗</button>
             <button title="Move to Bottom Left" onClick={() => setClaimListPosition('bottom-left')}>↙</button>
             <button title="Move to Bottom Right" onClick={() => setClaimListPosition('bottom-right')}>↘</button>
          </div>
        </div>
        {!claims.length && <div className={styles.muted}>No claims yet.</div>}
        {claims.length > 0 && (
          <div className={styles.claimList}>
            <div className={`${styles.claimRow} ${styles.claimHead}`}>
              <span>Div</span>
              <span>Name</span>
              <span>Color</span>
              <span>Owner</span>
            </div>
            {claims
              .slice()
              .sort((a, b) => Number(a.division) - Number(b.division))
              .map(c => {
                const name = DIVISION_NAMES[c.division] || `Division ${c.division}`;
                return (
                  <div
                    key={c.division}
                    className={styles.claimRow}
                    onClick={() => handleJumpToDivision(c.division)} // Use unified handler
                  >
                    <span>#{c.division}</span>
                    <span className={styles.claimNameCell}>{name}</span>
                    <span className={styles.colorCell}>
                      <span className={styles.swatch} style={{ background: c.color || '#888' }} />
                      <code>{c.color || 'N/A'}</code>
                    </span>
                    <span>{c.owner_name || 'Unclaimed'}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}