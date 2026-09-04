// ── Athens public-transport overlay for the Domains map ────────────────────
// Source data: src/data/athens-transit.json — a GeoJSON FeatureCollection with
// two kinds of feature, `kind: "line"` (MultiLineString) and `kind: "station"`
// (Point). Metro L1–L3, Tram and the Suburban Railway come from OpenStreetMap
// (© OpenStreetMap contributors, ODbL); Line 4 is hand-placed by neighbourhood
// because it is still under construction and not yet mapped.
//
// This module just slices that file into the shapes the map layers want and
// describes the toggleable network groups shown in the legend.

import transitRaw from '../../../data/athens-transit.json';

const features = Array.isArray(transitRaw?.features) ? transitRaw.features : [];

// Flatten every line feature's MultiLineString into individual paths so a
// deck.gl PathLayer can consume them directly.
export const TRANSIT_PATHS = features
  .filter(f => f.properties?.kind === 'line' && f.geometry?.type === 'MultiLineString')
  .flatMap(f =>
    f.geometry.coordinates.map(path => ({
      path,
      line: f.properties.line,
      label: f.properties.label,
      network: f.properties.network,
      colour: f.properties.colour,
      status: f.properties.status, // 'operational' | 'construction'
    }))
  );

export const TRANSIT_STATIONS = features
  .filter(f => f.properties?.kind === 'station' && f.geometry?.type === 'Point')
  .map(f => ({
    position: f.geometry.coordinates,
    name: f.properties.name,
    nameEl: f.properties.name_el,
    lines: f.properties.lines || [],
    networks: f.properties.networks || [],
    interchange: !!f.properties.interchange,
    colour: f.properties.primaryColour || '#cbd5e1',
    status: f.properties.status,
  }));

// ── Network groups: the legend rows / toggles ──────────────────────────────
// `match` decides which line + station features a group owns. `swatch` is a
// list of colours the legend renders as a stacked chip.
export const TRANSIT_GROUPS = [
  {
    key: 'metro',
    label: 'Metro (M1–M3)',
    swatch: ['#0e8a3e', '#e2231a', '#0a4fb4'],
    matchLine: l => l.network === 'Athens Metro' && l.line !== 'M4',
    matchStation: s => s.networks.includes('Athens Metro') && s.status !== 'construction',
  },
  {
    key: 'line4',
    label: 'Line 4 (under construction)',
    swatch: ['#f57c00'],
    dashed: true,
    matchLine: l => l.line === 'M4',
    matchStation: s => s.status === 'construction',
  },
  {
    key: 'tram',
    label: 'Tram',
    swatch: ['#8fbf1f'],
    matchLine: l => l.network === 'Athens Tram',
    matchStation: s => s.networks.includes('Athens Tram'),
  },
  {
    key: 'suburban',
    label: 'Suburban Railway',
    swatch: ['#ffcd00', '#9b26b6', '#78be20', '#00a3e0'],
    matchLine: l => l.network === 'Proastiakos',
    matchStation: s => s.networks.includes('Proastiakos'),
  },
];

export const TRANSIT_ATTRIBUTION = transitRaw?.note || '';
