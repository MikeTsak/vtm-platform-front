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
// Lazy-loaded on demand only when an authorized administrator enables the overlay.

// Dash pattern (in pixels) for each certainty tier — solid, dashed, dotted.
export const CATACOMB_CERTAINTY = {
  attested:    { label: 'Attested',    dash: null,     color: '#e6d5a8' },
  inferred:    { label: 'Inferred',    dash: [5, 4],   color: '#c9a86a' },
  speculative: { label: 'Speculative', dash: [1.5, 4], color: '#9b7bd4' },
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

let catacombsPromise = null;

export async function loadCatacombsData() {
  if (!catacombsPromise) {
    catacombsPromise = import('../../../data/athens-catacombs.json').then((mod) => {
      const catacombsRaw = mod.default || mod;
      const features = Array.isArray(catacombsRaw?.features) ? catacombsRaw.features : [];

      const passages = features
        .filter(f => f.properties?.kind === 'passage' && f.geometry?.type === 'LineString')
        .map(f => ({
          path: f.geometry.coordinates,
          name: f.properties.name,
          basis: f.properties.basis,        // river | aqueduct | quarry | shelter | tunnel
          certainty: f.properties.certainty, // attested | inferred | speculative
          status: f.properties.status,       // open | flooded | collapsed | sealed
        }));

      const sites = features
        .filter(f => f.properties?.kind === 'site' && f.geometry?.type === 'Point')
        .map(f => ({
          position: f.geometry.coordinates,
          name: f.properties.name,
          siteType: f.properties.siteType,   // entrance | chamber | cave | cistern | shrine | junction | collapse
          certainty: f.properties.certainty,
          note: f.properties.note,
        }));

      const attribution = catacombsRaw?.note || '';
      return { passages, sites, attribution };
    });
  }
  return catacombsPromise;
}
