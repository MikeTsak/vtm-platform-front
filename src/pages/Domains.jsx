// src/pages/Domains.jsx
import React, { useMemo, useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import styles from '../styles/Domains.module.css';
import domainsRaw from '../data/Domains.json';
import api from '../api';

export default function Domains() {
  const [claims, setClaims] = useState([]); // [{division, owner_name, color, owner_character_id, ...}]
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const mapRef = useRef(null);

  // GEOJSON + synthetic __division labels
  const data = useMemo(
    () => ({
      ...domainsRaw,
      features: domainsRaw.features.map((f, i) => ({
        ...f,
        properties: { ...f.properties, __division: i + 1 },
      })),
    }),
    []
  );

  const bounds = useMemo(() => {
    const layer = L.geoJSON(data);
    return layer.getBounds();
  }, [data]);

  async function loadClaims() {
    setErr(''); setMsg('');
    try {
      const { data } = await api.get('/domain-claims');
      setClaims(data.claims || []);
      setMsg(`Loaded ${data.claims?.length ?? 0} claims.`);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load claims');
    }
  }
  useEffect(() => { loadClaims(); }, []);

  const claimByDiv = (division) =>
    claims.find(c => Number(c.division) === Number(division)) || null;

  const numOr = (v, fallback) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  // Color per claim if present
  const style = (feature) => {
    const n = feature?.properties?.__division;
    const claim = claimByDiv(n);
    const fill = claim?.color || feature?.properties?.fill || '#888';
    return {
      color: feature?.properties?.stroke || '#222',
      weight: numOr(feature?.properties?.['stroke-width'], 1.2) + 0.5,
      opacity: numOr(feature?.properties?.['stroke-opacity'], 1),
      fillColor: fill,
      fillOpacity: claim ? 0.55 : numOr(feature?.properties?.['fill-opacity'], 0.30),
    };
  };

  const onEach = (feature, layer) => {
    const n = feature?.properties?.__division;

    // center permanent label: division number
    if (n != null) {
      layer.bindTooltip(String(n), {
        permanent: true,
        direction: 'center',
        className: styles.divisionLabel,
        opacity: 0.9,
      });
    }

    // hover/click for focus
    const base = style(feature);
    layer.on({
      mouseover: () => layer.setStyle({
        fillOpacity: Math.min((claimByDiv(n) ? 0.55 : base.fillOpacity) + 0.15, 0.85)
      }),
      mouseout:  () => layer.setStyle({
        fillOpacity: claimByDiv(n) ? 0.55 : base.fillOpacity
      }),
      click: () => {
        const map = layer._map || mapRef.current;
        if (map) map.fitBounds(layer.getBounds(), { padding: [16, 16], maxZoom: 15 });
        const c = claimByDiv(n);
        if (c) setMsg(`Division ${n} is claimed by ${c.owner_name}.`);
        else   setMsg(`Division ${n} is unclaimed.`);
      },
    });

    // non-permanent popup with owner name & color
    const c = claimByDiv(n);
    if (c?.owner_name) {
      layer.bindPopup(`<b>Division ${n}</b><br/>Owner: ${escapeHtml(c.owner_name)}<br/>Color: ${c.color}`);
    }
  };

  function escapeHtml(s = '') {
    return s.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  return (
    <div className={styles.wrap}>
      {(err || msg) && (
        <div className={err ? styles.alertError : styles.alertOk}>
          {err || msg}
        </div>
      )}

      <MapContainer
        whenCreated={(m)=>{ mapRef.current = m; }}
        bounds={bounds}
        className={styles.map}
        scrollWheelZoom
        preferCanvas
        minZoom={11}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <GeoJSON data={data} style={style} onEachFeature={onEach} />
      </MapContainer>

      {/* Claims list (read-only) */}
      <div className={styles.claimListWrap}>
        <h3>Claimed Divisions</h3>
        {!claims.length && <div className={styles.muted}>No claims yet.</div>}
        {claims.length > 0 && (
          <div className={styles.claimList}>
            <div className={styles.claimHead}>
              <span>Division</span>
              <span>Color</span>
              <span>Owner</span>
            </div>
            {claims
              .slice()
              .sort((a,b)=>Number(a.division)-Number(b.division))
              .map(c => (
                <div key={c.division} className={styles.claimRow}>
                  <span>#{c.division}</span>
                  <span className={styles.colorCell}>
                    <span className={styles.swatch} style={{ background: c.color }} />
                    <code>{c.color}</code>
                  </span>
                  <span>{c.owner_name}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
