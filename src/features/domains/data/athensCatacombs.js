// ── Catacombs of Athens — ADMIN-ONLY map overlay ──────────────────────────
// Source: src/data/athens-catacombs.json — a GeoJSON FeatureCollection with
// `kind: "passage"` (LineString) and `kind: "site"` (Point).
//
// There is no survey GeoJSON of Athens' underground. The line work traces the
// documented courses of the buried Eridanos and Ilissos rivers, Hadrian's
// Aqueduct, and the quarry-caves of Attica (Davelis/Penteli, Pan's caves,
// Koutouki, the Acropolis slope-caves); the `speculative` passages that join
// them into one network are storyteller invention. Each feature carries a
// `certainty` of 'attested' | 'inferred' | 'speculative'.
//
// NOTE: this data is bundled in the client. The admin-only gate in Domains.jsx
// keeps it off every non-admin's screen, but a determined user could still read
// the JSON out of the built bundle. If it ever needs to be truly secret, move
// it behind an authenticated API route.

import catacombsRaw from '../../../data/athens-catacombs.json';

const features = Array.isArray(catacombsRaw?.features) ? catacombsRaw.features : [];

// deck.gl PathLayer wants flat {path} objects.
export const CATACOMB_PASSAGES = features
  .filter(f => f.properties?.kind === 'passage' && f.geometry?.type === 'LineString')
  .map(f => ({
    path: f.geometry.coordinates,
    name: f.properties.name,
    basis: f.properties.basis,        // river | aqueduct | quarry | shelter | tunnel
    certainty: f.properties.certainty, // attested | inferred | speculative
    status: f.properties.status,       // open | flooded | collapsed | sealed
  }));

export const CATACOMB_SITES = features
  .filter(f => f.properties?.kind === 'site' && f.geometry?.type === 'Point')
  .map(f => ({
    position: f.geometry.coordinates,
    name: f.properties.name,
    siteType: f.properties.siteType,   // entrance | chamber | cave | cistern | shrine | junction | collapse
    certainty: f.properties.certainty,
    note: f.properties.note,
  }));

// Dash pattern (in pixels) for each certainty tier — solid, dashed, dotted.
export const CATACOMB_CERTAINTY = {
  attested:    { label: 'Attested',    dash: null,     color: '#e6d5a8' },
  inferred:    { label: 'Inferred',    dash: [5, 4],   color: '#c9a86a' },
  speculative: { label: 'Storyteller', dash: [1.5, 4], color: '#9b7bd4' },
};

export const CATACOMB_SITE_COLOR = {
  entrance:  '#8fe388',
  chamber:   '#e6d5a8',
  cave:      '#d9a441',
  cistern:   '#6bc5d9',
  shrine:    '#c9a0ff',
  junction:  '#f0c000',
  collapse:  '#e0645a',
};

export const CATACOMB_ATTRIBUTION = catacombsRaw?.note || '';
