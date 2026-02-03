// src/pages/AdminClaimsTab.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import styles from '../../styles/Admin.module.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import domainsRaw from '../../data/Domains.json';

/* ==================== CLAIMS — Split View + MAP (Domains clickability) ==================== */

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

export default function AdminClaimsTab({ claims, characters, onSave, onDelete }) {
  // Sidebar & filters
  const [filter, setFilter] = useState('');
  const [onlyUnowned, setOnlyUnowned] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  // Selection & editing
  const [selected, setSelected] = useState(null); // division number | 'new' | null
  const [edits, setEdits] = useState({}); // division -> { owner_name, color, owner_character_id }

  // "New" draft
  const [newDraft, setNewDraft] = useState({
    division: '',
    color: '#8a0f1a',
    owner_name: '',
    owner_character_id: '',
  });

  // === Map data (processed like user Domains.jsx) ===
  const divisionsGeo = useMemo(() => {
    if (!domainsRaw || !Array.isArray(domainsRaw.features)) return null;
    return {
      ...domainsRaw,
      features: domainsRaw.features.map((f, i) => {
        const divisionNumber =
          f?.properties?.division != null ? Number(f.properties.division) : (i + 1);
        return {
          ...f,
          properties: {
            ...f?.properties,
            __division: divisionNumber,
            __name: DIVISION_NAMES[divisionNumber] || `Division ${divisionNumber}`,
          },
        };
      }),
    };
  }, []);

  const bounds = useMemo(() => (divisionsGeo ? L.geoJSON(divisionsGeo).getBounds() : null), [divisionsGeo]);

  const mapError = useMemo(
    () => (divisionsGeo ? '' : 'Map data not available. Provide a FeatureCollection in /src/data/Domains.json with properties.division.'),
    [divisionsGeo]
  );

  function getRow(c) {
    return edits[c.division] ?? {
      owner_name: c.owner_name || '',
      color: c.color || '#888888',
      owner_character_id: c.owner_character_id ?? '',
    };
  }
  // eslint-disable-next-line no-unused-vars
  function setRow(c, patch) {
    setEdits(prev => ({ ...prev, [c.division]: { ...getRow(c), ...patch } }));
  }
  function resetRow(div) {
    setEdits(prev => {
      const next = { ...prev };
      delete next[div];
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let arr = [...claims];
    if (q) {
      arr = arr.filter(c =>
        String(c.division).includes(q) ||
        (c.owner_name || '').toLowerCase().includes(q) ||
        (characters[c.owner_character_id]?.char_name || '').toLowerCase().includes(q)
      );
    }
    if (onlyUnowned) arr = arr.filter(c => !c.owner_name && !c.owner_character_id);
    arr.sort((a, b) => (sortAsc ? a.division - b.division : b.division - a.division));
    return arr;
  }, [claims, filter, onlyUnowned, sortAsc, characters]);

  // quick lookup by division
  const claimByDiv = useMemo(() => {
    const m = new Map();
    claims.forEach(c => m.set(Number(c.division), c));
    return m;
  }, [claims]);

  // live color (respect unsaved edits)
  const colorForDivision = useCallback(
    (division) => {
      const edit = edits[division];
      if (edit?.color) return edit.color;
      const base = claimByDiv.get(Number(division))?.color;
      return base || '#454545';
    },
    [edits, claimByDiv]
  );

  return (
    <div className={styles.claimsLayout}>
      {/* Left: Big Map Panel */}
      <section className={styles.mapMainPanel}>
        {divisionsGeo ? (
          <ClaimsMap
            geo={divisionsGeo}
            bounds={bounds}
            selected={selected}
            onSelect={setSelected}
            colorForDivision={colorForDivision}
            claimByDiv={claimByDiv}
            edits={edits}
          />
        ) : (
          <div className={styles.mapFallback}>
            <span className={styles.icon}>🗺️</span>
            <span className={styles.subtle}>{mapError}</span>
          </div>
        )}
      </section>

      {/* Right: Control Sidebar (List + Editor) */}
      <aside className={styles.controlSidebar}>
        {/* List Panel */}
        <div className={styles.sidePanel}>
          <div className={styles.sideHeader}>
            <input
              className={styles.inputSearch}
              placeholder="Search #division / owner / character…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
            <button className={`${styles.btn} ${styles.btnIcon}`} onClick={() => setSortAsc(s => !s)} title="Sort">
              {sortAsc ? '↓' : '↑'}
            </button>
          </div>

          <div className={styles.sideFilters}>
            <label className={styles.customCheckbox}>
              <input
                type="checkbox"
                checked={onlyUnowned}
                onChange={e => setOnlyUnowned(e.target.checked)}
              />
              <span className={styles.checkmark}></span>
              <span>Only unowned</span>
            </label>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setSelected('new')}
            >
              + New claim
            </button>
          </div>

          <div className={styles.claimList}>
            {filtered.map(c => {
              const isActive = selected === c.division;
              return (
                <button
                  key={c.division}
                  className={`${styles.claimItem} ${isActive ? styles.claimItemActive : ''}`}
                  onClick={() => setSelected(Number(c.division))}
                  title={`Division #${c.division}`}
                >
                  <span className={styles.claimBadge}>#{c.division}</span>
                  <span className={styles.claimText}>
                    <b>{c.owner_name || '—'}</b>
                    <small className={styles.subtle}>
                      {c.owner_character_id
                        ? characters[c.owner_character_id]?.char_name || 'unknown'
                        : 'no character'}
                    </small>
                  </span>
                  <span className={styles.claimSwatch} style={{ background: colorForDivision(c.division) }} />
                </button>
              );
            })}

            {!filtered.length && (
              <div className={styles.emptyNote}>
                No claims match your filters.
              </div>
            )}
          </div>
        </div>

        {/* Editor Panel */}
        <section className={styles.detailPanel}>
          {/* New claim editor */}
          {selected === 'new' && (
            <div className={`${styles.editorSection} ${styles.stack12}`}>
              <div className={styles.detailHeader}>
                <h3>Create Claim</h3>
              </div>

              <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr'}}>
                <label className={styles.labeledInput}>
                  <span>Division #</span>
                  <input
                    className={styles.input}
                    value={newDraft.division}
                    onChange={e => setNewDraft(d => ({ ...d, division: e.target.value }))}
                    placeholder="e.g., 12"
                  />
                </label>
                <label className={styles.labeledInput}>
                  <span>Owner Name</span>
                  <input
                    className={styles.input}
                    value={newDraft.owner_name}
                    onChange={e => setNewDraft(d => ({ ...d, owner_name: e.target.value }))}
                    placeholder="FirstName LastName"
                  />
                </label>
              </div>

              <div className={styles.formGrid} style={{ gridTemplateColumns: 'auto auto 1fr'}}>
                <label className={styles.labeledInput}>
                  <span>Color</span>
                  <input
                    type="color"
                    value={newDraft.color}
                    onChange={e => setNewDraft(d => ({ ...d, color: e.target.value }))}
                    className={styles.colorBox}
                    title="Pick color"
                  />
                </label>
                <label className={styles.labeledInput}>
                  <span>Hex</span>
                  <input
                    className={`${styles.input} ${styles.inputMono} ${/^#([0-9a-fA-F]{6})$/.test(newDraft.color) ? '' : styles.inputError}`}
                    value={newDraft.color}
                    onChange={e => setNewDraft(d => ({ ...d, color: e.target.value }))}
                    placeholder="#8a0f1a"
                  />
                </label>
                <label className={styles.labeledInput}>
                  <span>Owner Character (optional)</span>
                  <select
                    className={styles.select}
                    value={newDraft.owner_character_id}
                    onChange={e => setNewDraft(d => ({ ...d, owner_character_id: e.target.value }))}
                  >
                    <option value="">— none —</option>
                    {Object.entries(characters).map(([cid, info]) => (
                      <option key={cid} value={cid}>{`${cid} — ${info.char_name} (${info.display_name})`}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.row} style={{ gap: 8, marginTop: '1rem' }}>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => {
                    const div = Number(newDraft.division);
                    if (!Number.isInteger(div)) return alert('Division must be an integer');
                    if (!/^#([0-9a-fA-F]{6})$/.test(newDraft.color)) return alert('Hex must be like #ff0066');
                    const patch = {
                      owner_name: newDraft.owner_name || 'Admin Set',
                      color: newDraft.color,
                      owner_character_id:
                        newDraft.owner_character_id === '' ? null : Number(newDraft.owner_character_id),
                    };
                    onSave(div, patch);
                    setNewDraft({ division: '', color: '#8a0f1a', owner_name: '', owner_character_id: '' });
                    setSelected(div);
                  }}
                >
                  Save
                </button>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setSelected(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Existing claim editor */}
          {typeof selected === 'number' && (
            <ExistingClaimEditor
              selected={selected}
              claims={claims}
              characters={characters}
              getRow={(c) => (edits[c.division] ?? {
                owner_name: c.owner_name || '',
                color: c.color || '#888888',
                owner_character_id: c.owner_character_id ?? '',
              })}
              setRow={(c, patch) => setEdits(prev => ({ ...prev, [c.division]: { ...getRow(c), ...patch } }))}
              resetRow={(div) => resetRow(div)}
              onSave={(div, patch) => onSave(div, patch)}
              onDelete={(div) => onDelete(div)}
            />
          )}

          {selected === null && (
            <div className={styles.placeholderCard}>
              <div className={styles.placeholderDot} />
              <div>
                <h3>Select a claim</h3>
                <p className={styles.subtle}>Click a division on the map (left), or create a new claim.</p>
              </div>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

/* Small editor used above */
function ExistingClaimEditor({ selected, claims, characters, getRow, setRow, resetRow, onSave, onDelete }) {
  const selectedClaim = claims.find(c => Number(c.division) === Number(selected));
  if (!selectedClaim) return null;

  const row = getRow(selectedClaim);
  const isDirty = JSON.stringify(row) !== JSON.stringify({
      owner_name: selectedClaim.owner_name || '',
      color: selectedClaim.color || '#888888',
      owner_character_id: selectedClaim.owner_character_id ?? '',
  });

  return (
    <div className={`${styles.editorSection} ${styles.stack12}`}>
      <div className={styles.detailHeader}>
        <div className={styles.detailSwatch} style={{ background: row.color }} />
        <div>
          <h3>Division #{selectedClaim.division}</h3>
          <div className={styles.subtle}>
            {selectedClaim.owner_character_id
              ? <>Char ID {selectedClaim.owner_character_id} · {characters[selectedClaim.owner_character_id]?.char_name || 'unknown'}</>
              : 'No character linked'}
          </div>
        </div>
      </div>

      <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr 1fr'}}>
        <label className={styles.labeledInput}>
          <span>Owner Name</span>
          <input
            className={styles.input}
            value={row.owner_name}
            onChange={e => setRow(selectedClaim, { owner_name: e.target.value })}
          />
        </label>
        <label className={styles.labeledInput}>
          <span>Owner Character</span>
          <select
            className={styles.select}
            value={row.owner_character_id}
            onChange={e => setRow(selectedClaim, { owner_character_id: e.target.value })}
          >
            <option value="">— none —</option>
            {Object.entries(characters).map(([cid, info]) => (
              <option key={cid} value={cid}>{`${cid} — ${info.char_name} (${info.display_name})`}</option>
            ))}
          </select>
        </label>
      </div >

      <div className={styles.formGrid} style={{ gridTemplateColumns: 'auto auto 1fr'}}>
        <label className={styles.labeledInput}>
          <span>Color</span>
          <input
            type="color"
            value={row.color}
            onChange={e => setRow(selectedClaim, { color: e.target.value })}
            className={styles.colorBox}
            title="Pick color"
          />
        </label>
        <label className={styles.labeledInput}>
          <span>Hex</span>
          <input
            className={`${styles.input} ${styles.inputMono} ${/^#([0-9a-fA-F]{6})$/.test(row.color) ? '' : styles.inputError}`}
            value={row.color}
            onChange={e => setRow(selectedClaim, { color: e.target.value })}
            placeholder="#RRGGBB"
          />
        </label>
        <div />
      </div>

      <div className={styles.row} style={{ gap: 8, marginTop: '1rem' }}>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => {
            if (!/^#([0-9a-fA-F]{6})$/.test(row.color)) return alert('Hex must be like #ff0066');
            const patch = {
              owner_name: row.owner_name || 'Admin Set',
              color: row.color,
              owner_character_id: row.owner_character_id === '' ? null : Number(row.owner_character_id),
            };
            onSave(Number(selectedClaim.division), patch);
            resetRow(Number(selectedClaim.division));
          }}
        >
          Save
        </button>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={() => resetRow(Number(selectedClaim.division))}
          disabled={!isDirty}
        >
          Reset
        </button>
         <button
          className={`${styles.btn} ${styles.btnDanger} ${styles.rowEnd}`}
          onClick={() => {
              if (window.prompt(`Type DELETE to remove claim for division #${selectedClaim.division}`) === 'DELETE') {
                  onDelete(Number(selectedClaim.division));
              }
          }}
        >
          Delete Claim
        </button>
      </div>
    </div>
  );
}

/* ---------- Map component: Domains-like styling + behavior ---------- */
function ClaimsMap({ geo, bounds, selected, onSelect, colorForDivision, claimByDiv, edits }) {
  const mapRef = useRef(null);
  const geoRef = useRef(null);

  // Helper from Domains.jsx
  const numOr = (v, fb) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : fb);

  // Style function (source of truth)
  const style = useCallback((feature) => {
    const n = feature?.properties?.__division;
    const claim = claimByDiv.get(n);
    const isSelected = Number(selected) === Number(n);

    const fill = colorForDivision(n); // Use live color
    const hasUnsaved = !!(edits && edits[n]);
    const baseOpacity = (claim || hasUnsaved) ? 0.60 : numOr(feature?.properties?.['fill-opacity'], 0.35);

    return {
      color: isSelected ? 'var(--accent-purple)' : (claim?.color || feature?.properties?.stroke || '#444444'),
      weight: isSelected ? 3.5 : 1.5,
      opacity: numOr(feature?.properties?.['stroke-opacity'], 1),
      fillColor: fill,
      fillOpacity: isSelected ? Math.min(baseOpacity + 0.25, 0.9) : baseOpacity,
      dashArray: isSelected ? '' : '4',
    };
  }, [selected, claimByDiv, colorForDivision, edits]);

  // Tooltip / popup + hover/click handlers
  const onEach = useCallback((feature, layer) => {
    const n = feature?.properties?.__division;
    const name = feature?.properties?.__name || `Division ${n}`;
    const claim = claimByDiv.get(n);

    layer.on({
      mouseover: (e) => {
        const target = e.target;
        if (Number(selected) !== Number(n)) {
          const base = style(target.feature);
          target.setStyle({
            weight: 3,
            fillOpacity: Math.min(base.fillOpacity + 0.15, 0.85),
            dashArray: '',
            color: 'var(--accent-purple)', // Use accent color on hover
          });
          if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront();
        }
      },
      mouseout: (e) => {
        const target = e.target;
        if (Number(selected) !== Number(n) && geoRef.current) {
          geoRef.current.resetStyle(target);
        }
      },
      click: (e) => {
        L.DomEvent.stopPropagation(e);
        if (mapRef.current) {
          mapRef.current.fitBounds(e.target.getBounds(), { padding: [40, 40], maxZoom: 15, duration: 0.5 });
        }
        onSelect(n);
        e.target.bringToFront();
      },
    });

    // Division label (centered)
    layer.bindTooltip(`${n}: ${name}`, {
      permanent: true,
      direction: 'center',
      className: styles.mapTooltip,
      opacity: 0.85,
    });

    // Popup (owner and color)
    const escapeHtml = (s = '') =>
      String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    if (claim) {
      layer.bindPopup(
        `<b>Division ${n}: ${escapeHtml(name)}</b><br/>` +
        `Owner: ${escapeHtml(claim.owner_name || '')}<br/>` +
        (claim.color
          ? `Color: <span style="display:inline-block;width:12px;height:12px;background:${escapeHtml(claim.color)};border:1px solid #fff;margin-right:4px;vertical-align:middle;"></span><code>${escapeHtml(claim.color)}</code>`
          : '')
      );
    } else {
      layer.bindPopup(`<b>Division ${n}: ${escapeHtml(name)}</b><br/>Unclaimed`);
    }
  }, [claimByDiv, onSelect, selected, style]);

  // Fit bounds on load
  useEffect(() => {
    if (bounds && mapRef.current) {
      try {
        if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [16, 16] });
      } catch (e) {}
    }
  }, [bounds]);

  // When selected changes from sidebar, pan/zoom to it
  useEffect(() => {
    if (!geoRef.current || !mapRef.current || !selected) return;
    const layers = geoRef.current.getLayers?.() || [];
    const layer = layers.find(l => l.feature?.properties?.__division === Number(selected));
    if (layer) {
      mapRef.current.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 15, duration: 0.5 });
      layer.openPopup();
    }
  }, [selected]);

  // Click background to clear selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleClickOutside = (e) => {
      const cls = e.originalEvent?.target?.classList || {};
      if (cls.contains('leaflet-container') || cls.contains('leaflet-tile')) {
        onSelect(null);
      }
    };
    map.on('click', handleClickOutside);
    return () => { map.off('click', handleClickOutside); };
  }, [onSelect]);

  // Key to force re-render on color/selection change
  const key = useMemo(() => {
    const editCount = edits ? Object.keys(edits).length : 0;
    return `geo-${selected}-${claimByDiv.size}-${editCount}`;
  }, [selected, claimByDiv, edits]);

  return (
    <MapContainer
      className={styles.mapCanvas}
      whenCreated={(m) => { mapRef.current = m; }}
      bounds={bounds || undefined}
      center={!bounds ? [37.975, 23.735] : undefined}
      zoom={!bounds ? 12 : undefined}
      scrollWheelZoom
    >
      <TileLayer
        className={styles.darkTileLayer}
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
      />
      <GeoJSON
        key={key} /* Force re-render */
        data={geo}
        ref={geoRef}
        style={style}
        onEachFeature={onEach}
      />
    </MapContainer>
  );
}
