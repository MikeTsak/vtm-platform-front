// src/pages/Domains.jsx
import React, { useMemo, useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, Tooltip, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import styles from '../styles/Domains.module.css';
import domainsRaw from '../data/Domains.json';
import api from '../api';

// --- UPDATED: Division Names Mapping ---
const DIVISION_NAMES = {
  1: 'Pagkrati',
  2: 'Zografou/Kaisarianh',
  3: 'Exarxia',
  4: 'Boula',
  5: 'Ampelokhpoi',
  6: 'Kalithea',
  7: 'Petralona',
  8: 'Plaka',
  9: 'Keramikos',
  10: 'Tauros, Agios Ioannis Rentis',
  11: 'Thiseio',
  12: 'Mosxato',
  13: 'Palaio Faliro',
  14: 'Nea Smyrnh',
  15: 'Agios Dhmhtrios',
  16: 'Neos Kosmos',
  17: 'Nea Penteli, Melissia',
  18: 'Kolonaki, Lykabhtos',
  19: 'Peristeri',
  20: 'Aigaleo',
  21: 'Petroupolh, Ilion, Agioi Anargyroi, Kamatero',
  22: 'Ellhniko, Argyroupolh',
  23: 'Psyxiko, Neo Psyxiko',
  24: 'Attikh',
  25: 'Kypselh',
  26: 'Galatsi',
  27: 'Khfisia, Nea Erythraia',
  28: 'Alimos',
  29: 'Marousi, Peykh',
  30: 'Hrakleio, Metamorfosi, Lykobrysh',
  31: 'Xalandri, Brilissia',
  32: 'Perama, Keratsini',
  33: 'Pathsia',
  34: 'Kolonos, Sepolia',
  35: 'Xolargos, Agia Paraskeyh',
  36: 'Katexakh',
  37: 'Nea Philadepfia',
  38: 'Hlioupolh, Byronas',
  39: 'Athina',
  40: 'Psyrh',
  41: 'Ymuttos',
  42: 'Parnitha',
  43: 'Peiraias, Neo Faliro',
  44: 'Xaidari',
  45: 'Korydallos, Nikaia, Agia Barbara',
  46: 'Glyfada',
  47: 'Gkyzh',
  48: 'Eleysina',
  49: 'Aspropirgos'
};
// --- End of Updated Section ---

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

  const data = useMemo(
    () => ({
      ...domainsRaw,
      features: domainsRaw.features.map((f, i) => {
        const divisionNumber = f.properties.division || (i + 1); // Get the division number
        return {
          ...f,
          properties: {
            ...f.properties,
            __division: divisionNumber, // Ensure __division is set correctly
            __name: DIVISION_NAMES[divisionNumber] || `Division ${divisionNumber}` // Use the division number to look up the name
          },
        }
      }),
    }),
    [] // Empty dependency array means this runs once
  );


  const bounds = useMemo(() => L.geoJSON(data).getBounds(), [data]);

  async function loadClaims() {
    setErr(''); setMsg('');
    try {
      const { data: claimsData } = await api.get('/domain-claims'); // Renamed variable to avoid conflict
      setClaims(claimsData.claims || []);
      setMsg(`Loaded ${claimsData.claims?.length ?? 0} claims.`);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load claims');
    }
  }
  useEffect(() => { loadClaims(); }, []);

  const claimByDiv = (division) => claims.find(c => Number(c.division) === Number(division)) || null;
  const numOr = (v, fallback) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : fallback);

  const style = (feature) => {
    const n = feature?.properties?.__division;
    const claim = claimByDiv(n);
    const isSelected = selectedDivision === n;

    const fill = claim?.color || feature?.properties?.fill || '#888888';
    const baseOpacity = claim ? 0.60 : numOr(feature?.properties?.['fill-opacity'], 0.35);

    return {
      color: isSelected ? '#ffffff' : (feature?.properties?.stroke || '#333333'),
      weight: isSelected ? 3 : (numOr(feature?.properties?.['stroke-width'], 1.2) + 0.5),
      opacity: numOr(feature?.properties?.['stroke-opacity'], 1),
      fillColor: fill,
      fillOpacity: isSelected ? Math.min(baseOpacity + 0.2, 0.9) : baseOpacity,
      dashArray: isSelected ? '' : '3',
    };
  };

  const onEach = (feature, layer) => {
    const n = feature?.properties?.__division;
    const name = feature?.properties?.__name || `Division ${n}`;
    const claim = claimByDiv(n);
    const baseStyle = style(feature);

    layer.on({
      mouseover: (e) => {
        if (selectedDivision !== n) {
          e.target.setStyle({
            weight: baseStyle.weight + 1,
            fillOpacity: Math.min(baseStyle.fillOpacity + 0.15, 0.85),
            dashArray: '',
          });
          e.target.bringToFront();
        }
      },
      mouseout: (e) => {
        if (selectedDivision !== n) {
          geoJsonRef.current?.resetStyle(e.target);
        }
      },
      click: (e) => {
        const map = mapRef.current;
        if (map) {
          map.fitBounds(e.target.getBounds(), { padding: [30, 30], maxZoom: 15 });
        }

        if (selectedDivision && selectedDivision !== n) {
          const prevLayer = Object.values(geoJsonRef.current?.getLayers() || {}).find(
            l => l.feature.properties.__division === selectedDivision
          );
          if (prevLayer) {
            geoJsonRef.current.resetStyle(prevLayer);
          }
        }

        e.target.setStyle({
          weight: 3,
          fillOpacity: Math.min(baseStyle.fillOpacity + 0.2, 0.9),
          color: '#ffffff',
          dashArray: '',
        });
        e.target.bringToFront();

        setSelectedDivision(n);
        setSelectedDivisionInfo({
          number: n,
          name: name,
          owner: claim?.owner_name || 'Unclaimed',
          color: claim?.color || 'N/A',
        });
        setMsg('');
        setErr('');
      },
    });

    layer.bindTooltip(`${n}: ${name}`, {
      permanent: true,
      direction: 'center',
      className: styles.divisionLabel,
      opacity: 0.85,
    });

    // Simple escape function
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }


    if (claim) {
      layer.bindPopup(
        `<b>Division ${n}: ${escapeHtml(name)}</b><br/>` +
        `Owner: ${escapeHtml(claim.owner_name)}<br/>` +
        (claim.color ? `Color: <span style="display:inline-block; width:12px; height:12px; background-color:${escapeHtml(claim.color)}; border:1px solid #fff; margin-right: 4px; vertical-align:middle;"></span><code>${escapeHtml(claim.color)}</code>` : '')
      );
    } else {
      layer.bindPopup(`<b>Division ${n}: ${escapeHtml(name)}</b><br/>Unclaimed`);
    }
  };


  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      const handleClickOutside = (e) => {
        if (e.originalEvent.target === map.getContainer()) {
          if (selectedDivision) {
            const prevLayer = Object.values(geoJsonRef.current?.getLayers() || {}).find(
              l => l.feature.properties.__division === selectedDivision
            );
            if (prevLayer) {
              geoJsonRef.current.resetStyle(prevLayer);
            }
          }
          setSelectedDivision(null);
          setSelectedDivisionInfo(null);
        }
      };
      map.on('click', handleClickOutside);
      return () => { map.off('click', handleClickOutside); };
    }
  }, [mapRef, selectedDivision]);

  return (
    <div className={styles.wrap}>
      {(err || msg) && (
        <div className={`${styles.messageArea} ${err ? styles.alertError : styles.alertOk}`}>
          {err || msg}
        </div>
      )}

      <MapContainer
        whenCreated={(m) => { mapRef.current = m; }}
        bounds={bounds}
        className={styles.map}
        scrollWheelZoom
        preferCanvas
        minZoom={11}
        maxBounds={bounds.pad(0.5)}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <GeoJSON
          ref={geoJsonRef}
          data={data}
          style={style}
          onEachFeature={onEach}
        />
      </MapContainer>

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
              if (selectedDivision) {
                const prevLayer = Object.values(geoJsonRef.current?.getLayers() || {}).find(
                  l => l.feature.properties.__division === selectedDivision
                );
                 if (prevLayer) { geoJsonRef.current.resetStyle(prevLayer); }
              }
              setSelectedDivisionInfo(null);
              setSelectedDivision(null);
          }}>
            &times;
          </button>
        </div>
      )}

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
                const name = DIVISION_NAMES[c.division] || 'Unknown'; // Fallback added here
                return (
                  <div key={c.division} className={styles.claimRow} onClick={() => {
                      const layer = Object.values(geoJsonRef.current?.getLayers() || {}).find(l => l.feature.properties.__division === Number(c.division));
                      if (layer) layer.fire('click');
                      setShowClaimListMobile(false);
                  }}>
                    <span>#{c.division}</span>
                    <span className={styles.claimNameCell}>{name}</span>
                    <span className={styles.colorCell}>
                      <span className={styles.swatch} style={{ background: c.color }} />
                      <code>{c.color}</code>
                    </span>
                    <span>{c.owner_name}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}