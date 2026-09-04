// ── Necropoleis of Athens — ADMIN-ONLY map overlay ───────────────────────
// Source: src/data/athens-necropolis.json. Two wholly fictional Kindred
// necropoleis, no real-world basis:
//   * OLD — vast, under central Athens, SEALED and inaccessible. Galleries are
//     drawn ragged and broken on purpose: the records are fragments and almost
//     nothing is confirmed (`certainty: "lost"`). A spine runs from under the
//     Acropolis to Syngrou-Fix and carries the "New 2026 Entrance" marker.
//   * NEW — tiny, recent, in the pine wood above Papagou.
//
// Same client-bundle caveat as the catacombs layer: the admin gate in
// Domains.jsx is client-side only. Move behind an authed API if it must be
// genuinely hidden.

import necropolisRaw from '../../../data/athens-necropolis.json';

const features = Array.isArray(necropolisRaw?.features) ? necropolisRaw.features : [];

// flatten MultiLineString passages into one {path} per segment (gaps in a
// gallery are already separate segments in the data)
export const NECRO_PASSAGES = features
  .filter(f => f.properties?.kind === 'passage' && f.geometry?.type === 'MultiLineString')
  .flatMap(f =>
    f.geometry.coordinates.map(path => ({
      path,
      necropolis: f.properties.necropolis,   // 'old' | 'new'
      name: f.properties.name,
      certainty: f.properties.certainty,     // 'charted' | 'hearsay' | 'lost'
      status: f.properties.status,           // 'sealed' | 'collapsed' | 'active'
    }))
  );

export const NECRO_SITES = features
  .filter(f => f.properties?.kind === 'site' && f.geometry?.type === 'Point')
  .map(f => ({
    position: f.geometry.coordinates,
    necropolis: f.properties.necropolis,
    name: f.properties.name,
    siteType: f.properties.siteType,         // new_entrance | entrance | chamber | ossuary | shaft | seal | collapse | unknown
    certainty: f.properties.certainty,
    status: f.properties.status,
    note: f.properties.note,
  }));

// Line style per record-certainty — applies to the OLD necropolis, where the
// record is fragmentary. Each tier gets its own colour, dash AND width so the
// three are easy to tell apart at a glance.
export const NECRO_CERTAINTY = {
  charted: { label: 'Confirmed',   dash: null,     color: '#f0ead2', width: 4.5 },
  hearsay: { label: 'Reported',    dash: [7, 4],   color: '#d8b06a', width: 3.75 },
  lost:    { label: 'Speculative', dash: [2, 5],   color: '#8fa6a0', width: 3 },
};

// The New necropolis renders in one solid colour, all of it confirmed — a
// deliberately different hue from any Old-necropolis tier.
export const NECRO_NEW_COLOR = '#d64550';
export const NECRO_NEW_WIDTH = 4.5;

// Legend note per necropolis (shown under its toggle).
export const NECRO_NOTES = {
  old: 'Sealed & inaccessible — broken, ragged lines are unconfirmed record.',
  new: 'Small, recent — above Papagou. All confirmed.',
};

export const NECRO_SITE_COLOR = {
  new_entrance: '#ffcc33',
  entrance:     '#8fe388',
  chamber:      '#d6ddc8',
  ossuary:      '#c9a86a',
  shaft:        '#6bc5d9',
  seal:         '#e0645a',
  collapse:     '#b06a5a',
  unknown:      '#9b8bb0',
};

export const NECRO_ATTRIBUTION = necropolisRaw?.note || '';
