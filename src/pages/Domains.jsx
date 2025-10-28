// src/pages/Domains.jsx
import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react'; // Added useCallback
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, Tooltip, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import styles from '../styles/Domains.module.css'; // Ensure path is correct
import domainsRaw from '../data/Domains.json'; // Ensure path is correct
import api from '../api'; // Ensure path is correct

// --- Corrected Division Names Mapping ---
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
// --- End of Corrected Section ---

export default function Domains() {
  const [claims, setClaims] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const mapRef = useRef(null);
  const geoJsonRef = useRef(null); // Ref to access GeoJSON layer

  // State for selection and mobile UI
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [selectedDivisionInfo, setSelectedDivisionInfo] = useState(null); // { number, name, owner, color }
  const [showClaimListMobile, setShowClaimListMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Added loading state for initial data fetch

  // Memoize the processed GeoJSON data
  const data = useMemo(
    () => {
        // Basic check if domainsRaw has features
        if (!domainsRaw || !Array.isArray(domainsRaw.features)) {
            console.error("Domains.json is missing or has incorrect structure.");
            return null; // Return null if data is invalid
        }
        return {
          ...domainsRaw,
          features: domainsRaw.features.map((f, i) => {
            // Determine the division number, ensuring fallback if 'division' prop is missing or invalid
            const divisionNumber = f?.properties?.division != null ? Number(f.properties.division) : (i + 1);
            return {
              ...f,
              properties: {
                ...f?.properties, // Safely spread properties
                __division: divisionNumber, // Store the determined division number
                __name: DIVISION_NAMES[divisionNumber] || `Division ${divisionNumber}` // Lookup name using the number
              },
            }
          }),
        };
    },
    [] // Empty dependency array ensures this runs only once
  );

  // Calculate bounds only if data is valid
  const bounds = useMemo(() => (data ? L.geoJSON(data).getBounds() : null), [data]);

  // Function to load claims from the API, wrapped in useCallback
  const loadClaims = useCallback(async () => {
    setErr(''); setMsg(''); setIsLoading(true); // Set loading true
    try {
      const { data: claimsData } = await api.get('/domain-claims');
      setClaims(claimsData.claims || []);
      // setMsg(`Loaded ${claimsData.claims?.length ?? 0} claims.`); // Optional: Keep or remove success message
    } catch (e) {
      console.error("Error loading claims:", e);
      setErr(e.response?.data?.error || 'Failed to load claims');
    } finally {
      setIsLoading(false); // Set loading false
    }
  }, []); // Empty dependencies as it's called manually or by effect below

  // Load claims on component mount
  useEffect(() => { loadClaims(); }, [loadClaims]);

  // Memoized claim lookup using a Map for efficiency
  const claimByDiv = useMemo(() => new Map(claims.map(c => [Number(c.division), c])), [claims]);

  // Helper to safely parse numbers or provide a fallback
  const numOr = (v, fallback) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : fallback);

  // --- REVISED: Style function (is the source of truth) ---
  // Wrapped in useCallback, depends on selection and claim data
  const style = useCallback((feature) => {
    const n = feature?.properties?.__division;
    const claim = claimByDiv.get(n); // Use the memoized Map
    const isSelected = selectedDivision === n;

    // Determine fill color and opacity
    const fill = claim?.color || feature?.properties?.fill || '#888888'; // Claim color > GeoJSON prop > default gray
    const baseOpacity = claim ? 0.60 : numOr(feature?.properties?.['fill-opacity'], 0.35); // Claimed areas slightly more opaque

    return {
      color: isSelected ? '#ffffff' : (claim?.color || feature?.properties?.stroke || '#444444'), // White border if selected, else claim/geojson/dark gray border
      weight: isSelected ? 3.5 : 1.5, // Make selected slightly thicker
      opacity: numOr(feature?.properties?.['stroke-opacity'], 1),
      fillColor: fill,
      fillOpacity: isSelected ? Math.min(baseOpacity + 0.25, 0.9) : baseOpacity, // Increase opacity if selected
      dashArray: isSelected ? '' : '4', // Dashed border if not selected, solid if selected
    };
  }, [selectedDivision, claimByDiv]); // Re-run when selection or claims change

  // --- REVISED: onEachFeature with corrected event handling ---
  // Wrapped in useCallback, depends on selection, claims map, and style function
  const onEach = useCallback((feature, layer) => {
    const n = feature?.properties?.__division;
    const name = feature?.properties?.__name || `Division ${n}`;
    const claim = claimByDiv.get(n); // Use memoized map

    layer.on({
      mouseover: (e) => {
        const targetLayer = e.target;
        const targetDivision = targetLayer.feature.properties.__division;
        // Apply hover style ONLY if it's NOT selected
        if (selectedDivision !== targetDivision) {
          const currentStyle = style(targetLayer.feature); // Get base style for reference
          targetLayer.setStyle({
            weight: 3, // Increase border weight on hover
            fillOpacity: Math.min(currentStyle.fillOpacity + 0.15, 0.85), // Slightly increase opacity
            dashArray: '', // Solid border on hover
            color: '#e0e0e0', // Bright border color for hover indication
          });
          if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
             layer.bringToFront(); // Bring hovered layer to front (can cause issues in some browsers)
          }
        }
      },
      mouseout: (e) => {
        const targetLayer = e.target;
        const targetDivision = targetLayer.feature.properties.__division;
        // IMPORTANT: Use resetStyle ONLY if it's NOT selected
        // This tells Leaflet to re-apply the style function defined in the GeoJSON props
        if (selectedDivision !== targetDivision && geoJsonRef.current) {
           geoJsonRef.current.resetStyle(targetLayer);
        }
        // If it WAS the selected layer, do nothing on mouseout, its style remains 'selected' via the main style function
      },
      click: (e) => {
        L.DomEvent.stopPropagation(e); // IMPORTANT: Prevent map click event firing right after polygon click
        const clickedDivision = e.target.feature.properties.__division;
        const map = mapRef.current;

        // Animate zoom/pan smoothly
        if (map) {
          map.fitBounds(e.target.getBounds(), { padding: [40, 40], maxZoom: 15, duration: 0.5 });
        }

        // Reset previously selected layer (if different) using resetStyle
        // This triggers the main 'style' function for the previous layer, which will now see it as 'not selected'
        if (selectedDivision !== null && selectedDivision !== clickedDivision) {
          const prevLayer = Object.values(geoJsonRef.current?.getLayers() || {}).find(
            l => l.feature.properties.__division === selectedDivision
          );
          if (prevLayer && geoJsonRef.current) {
             geoJsonRef.current.resetStyle(prevLayer);
          }
        }

        // Update application state *before* potentially styling the new layer
        // (The style function depends on selectedDivision state)
        setSelectedDivision(clickedDivision);
        const clickedClaim = claimByDiv.get(clickedDivision); // Get claim info again
        setSelectedDivisionInfo({
          number: clickedDivision,
          name: name,
          owner: clickedClaim?.owner_name || 'Unclaimed',
          color: clickedClaim?.color || 'N/A',
        });
        setMsg(''); setErr('');

        // Apply selected style explicitly AFTER state update (style fn now sees it as selected)
        // Or better yet, trigger a reset which will use the updated style function
        // Need a slight delay or use the key prop change to ensure style function runs with new state
        // e.target.setStyle(style(e.target.feature)); // Calculate and apply the selected style
        // OR simply rely on the key prop change below which forces a full re-style
        e.target.bringToFront();

      },
    });

    // --- Tooltip & Popup ---
    layer.bindTooltip(`${n}: ${name}`, {
      permanent: true,
      direction: 'center',
      className: styles.divisionLabel, // Use CSS Module class for styling
      opacity: 0.85,
    });

    // Basic HTML escaping
    function escapeHtml(unsafe = '') {
        return unsafe
             .toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // Bind Popup
    if (claim) {
      layer.bindPopup(
        `<b>Division ${n}: ${escapeHtml(name)}</b><br/>` +
        `Owner: ${escapeHtml(claim.owner_name)}<br/>` +
        (claim.color ? `Color: <span style="display:inline-block; width:12px; height:12px; background-color:${escapeHtml(claim.color)}; border:1px solid #fff; margin-right: 4px; vertical-align:middle;"></span><code>${escapeHtml(claim.color)}</code>` : '')
      );
    } else {
      layer.bindPopup(`<b>Division ${n}: ${escapeHtml(name)}</b><br/>Unclaimed`);
    }

  }, [selectedDivision, claimByDiv, style]); // Include style function in dependencies

  // --- Handle click outside polygons to deselect ---
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      const handleClickOutside = (e) => {
         // Check if click was directly on map container or tile pane
         const targetClass = e.originalEvent.target.classList;
         if (targetClass.contains('leaflet-container') || targetClass.contains('leaflet-tile')) {
              if (selectedDivision !== null) { // Only act if something *was* selected
                  const prevLayer = Object.values(geoJsonRef.current?.getLayers() || {}).find(
                      l => l.feature.properties.__division === selectedDivision
                  );
                  if (prevLayer && geoJsonRef.current) {
                      // Use resetStyle to ensure it gets the correct base style
                      geoJsonRef.current.resetStyle(prevLayer);
                  }
                  setSelectedDivision(null); // Clear selection state
                  setSelectedDivisionInfo(null);
              }
         }
      };
      map.on('click', handleClickOutside);
      // Cleanup listener on unmount
      return () => { map.off('click', handleClickOutside); };
    }
  }, [mapRef, selectedDivision]); // Depend on selectedDivision to ensure correct layer is reset

  // --- Key for GeoJSON component ---
  // Forces re-render when selection or claim data changes.
  // Using claims.length is a simple trigger; consider a more specific hash if needed.
  const geoJsonKey = useMemo(() => `geojson-${selectedDivision}-${claims.length}`, [selectedDivision, claims]);

  // Handle loading state and invalid data
  if (isLoading) {
    return <div className={styles.loading}>Loading claims and map data...</div>;
  }
  if (!data || !bounds) {
    return <div className={`${styles.wrap} ${styles.alertError}`}>Error: Invalid or missing Domains.json map data.</div>;
  }

  return (
    <div className={styles.wrap}>
      {/* Display API messages or errors */}
      {(err || msg) && (
        <div className={`${styles.messageArea} ${err ? styles.alertError : styles.alertOk}`}>
          {err || msg}
        </div>
      )}

      {/* Leaflet Map Container */}
      <MapContainer
        whenCreated={(m) => { mapRef.current = m; }}
        bounds={bounds} // Set initial view based on GeoJSON data
        className={styles.map}
        scrollWheelZoom={true}
        preferCanvas={true} // Use Canvas for potentially better performance with many polygons
        minZoom={11} // Adjust min zoom as needed
        // maxBounds={bounds.pad(0.5)} // Optional: Restrict panning area
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {/* GeoJSON layer displaying the divisions */}
        <GeoJSON
          key={geoJsonKey} // IMPORTANT: Force re-render on state changes affecting style
          ref={geoJsonRef}
          data={data}
          style={style} // Pass the memoized style function
          onEachFeature={onEach} // Pass the memoized onEach function
        />
      </MapContainer>

      {/* Mobile Info Panel (conditionally rendered) */}
      {selectedDivisionInfo && (
        <div className={styles.infoPanel}>
          <div className={styles.infoPanelContent}>
            <h3>Division {selectedDivisionInfo.number}: {selectedDivisionInfo.name}</h3>
            <p>Owner: {selectedDivisionInfo.owner}</p>
            {selectedDivisionInfo.color !== 'N/A' && (
              <p>Color: <span className={styles.swatch} style={{ background: selectedDivisionInfo.color }} /> <code>{selectedDivisionInfo.color}</code></p>
            )}
          </div>
          {/* Close button for the mobile panel */}
          <button className={styles.closeInfoPanel} onClick={() => {
              // Reset style *before* clearing state when closing panel manually
              if (selectedDivision !== null) {
                const prevLayer = Object.values(geoJsonRef.current?.getLayers() || {}).find(
                  l => l.feature.properties.__division === selectedDivision
                );
                 if (prevLayer && geoJsonRef.current) { geoJsonRef.current.resetStyle(prevLayer); }
              }
              // Clear selection state
              setSelectedDivisionInfo(null);
              setSelectedDivision(null);
          }}>
            &times;
          </button>
        </div>
      )}

      {/* Claim List Section (with mobile toggle) */}
      <div className={`${styles.claimListWrap} ${showClaimListMobile ? styles.showMobile : ''}`}>
        <div className={styles.claimListHeader}>
          <h3>Claimed Divisions ({claims.length})</h3>
          <button className={styles.toggleClaimList} onClick={() => setShowClaimListMobile(s => !s)}>
            {showClaimListMobile ? 'Hide List' : 'Show List'}
          </button>
        </div>
        {!claims.length && <div className={styles.muted}>No claims yet.</div>}
        {claims.length > 0 && (
          <div className={styles.claimList}>
            {/* Header Row */}
            <div className={`${styles.claimRow} ${styles.claimHead}`}>
              <span>Div</span>
              <span>Name</span>
              <span>Color</span>
              <span>Owner</span>
            </div>
            {/* Data Rows */}
            {claims
              .slice() // Create a copy before sorting
              .sort((a, b) => Number(a.division) - Number(b.division)) // Sort numerically
              .map(c => {
                const name = DIVISION_NAMES[c.division] || `Division ${c.division}`; // Use correct name or fallback
                return (
                  // Make each row clickable to select the division on the map
                  <div key={c.division} className={styles.claimRow} onClick={() => {
                      const layer = Object.values(geoJsonRef.current?.getLayers() || {}).find(l => l.feature.properties.__division === Number(c.division));
                      if (layer) layer.fire('click'); // Simulate click on the map layer
                      setShowClaimListMobile(false); // Hide list on mobile after selection
                  }}>
                    <span>#{c.division}</span>
                    <span className={styles.claimNameCell}>{name}</span>
                    <span className={styles.colorCell}>
                      <span className={styles.swatch} style={{ background: c.color || '#888' }} /> {/* Add fallback color */}
                      <code>{c.color || 'N/A'}</code>
                    </span>
                    <span>{c.owner_name || 'Unclaimed'}</span> {/* Add fallback text */}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}