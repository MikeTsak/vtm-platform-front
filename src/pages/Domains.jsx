import React, { useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import styles from '../styles/Domains.module.css';
import domainsRaw from '../data/Domains.json';

export default function Domains() {
  // Tag each feature with a division index so we can label it without names/owners
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

  const numOr = (v, fallback) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const style = (feature) => ({
    color: feature?.properties?.stroke || '#222',
    weight: numOr(feature?.properties?.['stroke-width'], 1.2) + 0.5,
    opacity: numOr(feature?.properties?.['stroke-opacity'], 1),
    fillColor: feature?.properties?.fill || '#888',
    fillOpacity: numOr(feature?.properties?.['fill-opacity'], 0.3),
  });

  const onEach = (feature, layer) => {
    // Permanent center label with just the division number
    const n = feature?.properties?.__division;
    if (n != null) {
      layer.bindTooltip(String(n), {
        permanent: true,
        direction: 'center',
        className: styles.divisionLabel,
        opacity: 0.9,
      });
    }

    // subtle hover + click zoom (no popups with names/owners)
    const base = style(feature);
    layer.on({
      mouseover: () => layer.setStyle({ fillOpacity: Math.min(base.fillOpacity + 0.15, 0.85) }),
      mouseout: () => layer.setStyle({ fillOpacity: base.fillOpacity }),
      click: () => {
        const map = layer._map;
        if (map) map.fitBounds(layer.getBounds(), { padding: [16, 16], maxZoom: 15 });
      },
    });
  };

  return (
    <div className={styles.wrap}>
      <MapContainer
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
    </div>
  );
}
