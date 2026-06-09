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
  const [filter, setFilter] = useState('');
  const [onlyUnowned, setOnlyUnowned] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState(null); 
  const [edits, setEdits] = useState({}); 

  const [newDraft, setNewDraft] = useState({
    division: '',
    color: '#9d7cff',
    owner_name: '',
    owner_character_id: '',
  });

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
  const mapError = useMemo(() => (divisionsGeo ? '' : 'Map data not available. Provide a FeatureCollection in /src/data/Domains.json with properties.division.'), [divisionsGeo]);

  function getRow(c) {
    return edits[c.division] ?? {
      owner_name: c.owner_name || '',
      color: c.color || 'var(--glass-border)',
      owner_character_id: c.owner_character_id ?? '',
    };
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

  const claimByDiv = useMemo(() => {
    const m = new Map();
    claims.forEach(c => m.set(Number(c.division), c));
    return m;
  }, [claims]);

  const colorForDivision = useCallback(
    (division) => {
      const edit = edits[division];
      if (edit?.color) return edit.color;
      const base = claimByDiv.get(Number(division))?.color;
      return base || 'var(--glass-inset)';
    },
    [edits, claimByDiv]
  );

  return (
    <div className={styles.claimsLayout} style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '2rem', height: '80vh' }}>
      
      {/* MAP PANEL */}
      <section className={styles.mapMainPanel} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)', background: 'var(--glass-bg)' }}>
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
          <div className={styles.loading} style={{ height: '100%' }}>
            <span className={styles.subtle}>{mapError}</span>
          </div>
        )}
      </section>

      {/* SIDEBAR */}
      <aside className={styles.controlSidebar} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
        
        <div className={styles.sidePanel} style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', boxShadow: 'var(--glass-shadow)' }}>
          <div className={styles.sideHeader} style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: '1rem' }}>
            <input
              className={styles.input}
              placeholder="Search #division / owner…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setSortAsc(s => !s)} title="Sort" style={{ padding: '0 1rem' }}>
              {sortAsc ? '↓' : '↑'}
            </button>
          </div>

          <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-inset)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={onlyUnowned} onChange={e => setOnlyUnowned(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-purple)' }} />
              <span style={{ fontWeight: 600 }}>Unowned only</span>
            </label>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setSelected('new')}>
              + New Claim
            </button>
          </div>

          <div className={styles.claimList} style={{ overflowY: 'auto', flex: 1, padding: '1rem' }}>
            {filtered.map(c => {
              const isActive = selected === c.division;
              return (
                <button
                  key={c.division}
                  onClick={() => setSelected(Number(c.division))}
                  style={{
                    width: '100%', textAlign: 'left', padding: '1rem', marginBottom: '0.5rem',
                    background: isActive ? 'var(--glass-inset)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--accent-purple)' : 'var(--glass-border)'}`,
                    borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '1rem',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: isActive ? '0 0 15px var(--accent-purple-glow)' : 'none'
                  }}
                >
                  <span style={{ fontWeight: 800, color: 'var(--accent-purple)', fontSize: '1.1rem' }}>#{c.division}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <b style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.owner_name || '—'}</b>
                    <small style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.owner_character_id ? characters[c.owner_character_id]?.char_name || 'unknown' : 'no character'}
                    </small>
                  </div>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: colorForDivision(c.division), border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }} />
                </button>
              );
            })}
            {!filtered.length && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No claims match your filters.</div>}
          </div>
        </div>

        {/* EDITOR AREA */}
        <section style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '1.5rem', boxShadow: 'var(--glass-shadow)', minHeight: '300px' }}>
          
          {selected === 'new' && (
            <div className={styles.stack12}>
              <h3 style={{ margin: 0, color: 'var(--accent-purple)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Create Claim</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label className={styles.labeledInput}><span>Division #</span><input className={styles.input} value={newDraft.division} onChange={e => setNewDraft(d => ({ ...d, division: e.target.value }))} placeholder="e.g., 12" /></label>
                <label className={styles.labeledInput}><span>Owner Name</span><input className={styles.input} value={newDraft.owner_name} onChange={e => setNewDraft(d => ({ ...d, owner_name: e.target.value }))} placeholder="FirstName LastName" /></label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1rem' }}>
                <label className={styles.labeledInput}><span>Color</span>
                  <input type="color" value={newDraft.color} onChange={e => setNewDraft(d => ({ ...d, color: e.target.value }))} style={{ width: '100%', height: '48px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', background: 'transparent', cursor: 'pointer' }} />
                </label>
                <label className={styles.labeledInput}><span>Owner Character</span>
                  <select className={styles.select} value={newDraft.owner_character_id} onChange={e => setNewDraft(d => ({ ...d, owner_character_id: e.target.value }))}>
                    <option value="">— none —</option>
                    {Object.entries(characters).map(([cid, info]) => <option key={cid} value={cid}>{`${cid} — ${info.char_name}`}</option>)}
                  </select>
                </label>
              </div>
              <div className={styles.row} style={{ gap: '1rem', marginTop: '1rem' }}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ flex: 1 }} onClick={() => {
                  const div = Number(newDraft.division);
                  if (!Number.isInteger(div)) return alert('Division must be an integer');
                  onSave(div, { owner_name: newDraft.owner_name || 'Admin Set', color: newDraft.color, owner_character_id: newDraft.owner_character_id === '' ? null : Number(newDraft.owner_character_id) });
                  setNewDraft({ division: '', color: '#9d7cff', owner_name: '', owner_character_id: '' });
                  setSelected(div);
                }}>Save Claim</button>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setSelected(null)}>Cancel</button>
              </div>
            </div>
          )}

          {typeof selected === 'number' && (
            <ExistingClaimEditor
              selected={selected}
              claims={claims}
              characters={characters}
              getRow={(c) => (edits[c.division] ?? { owner_name: c.owner_name || '', color: c.color || 'var(--glass-border)', owner_character_id: c.owner_character_id ?? '' })}
              setRow={(c, patch) => setEdits(prev => ({ ...prev, [c.division]: { ...getRow(c), ...patch } }))}
              resetRow={(div) => resetRow(div)}
              onSave={(div, patch) => onSave(div, patch)}
              onDelete={(div) => onDelete(div)}
            />
          )}

          {selected === null && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.5 }}>
              <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</span>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Select a Claim</h3>
              <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)' }}>Click a division on the map or select from the list above.</p>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

function ExistingClaimEditor({ selected, claims, characters, getRow, setRow, resetRow, onSave, onDelete }) {
  const selectedClaim = claims.find(c => Number(c.division) === Number(selected));
  if (!selectedClaim) return null;

  const row = getRow(selectedClaim);
  const isDirty = JSON.stringify(row) !== JSON.stringify({ owner_name: selectedClaim.owner_name || '', color: selectedClaim.color || 'var(--glass-border)', owner_character_id: selectedClaim.owner_character_id ?? '' });

  return (
    <div className={styles.stack12}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: row.color, border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }} />
        <div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#fff' }}>Division #{selectedClaim.division}</h3>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {selectedClaim.owner_character_id ? `Char ID ${selectedClaim.owner_character_id} · ${characters[selectedClaim.owner_character_id]?.char_name || 'unknown'}` : 'No character linked'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <label className={styles.labeledInput}><span>Owner Name</span><input className={styles.input} value={row.owner_name} onChange={e => setRow(selectedClaim, { owner_name: e.target.value })} /></label>
        <label className={styles.labeledInput}><span>Owner Character</span>
          <select className={styles.select} value={row.owner_character_id} onChange={e => setRow(selectedClaim, { owner_character_id: e.target.value })}>
            <option value="">— none —</option>
            {Object.entries(characters).map(([cid, info]) => <option key={cid} value={cid}>{`${cid} — ${info.char_name}`}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1rem' }}>
        <label className={styles.labeledInput}><span>Color</span>
          <input type="color" value={row.color} onChange={e => setRow(selectedClaim, { color: e.target.value })} style={{ width: '100%', height: '48px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', background: 'transparent', cursor: 'pointer' }} />
        </label>
        <label className={styles.labeledInput}><span>Hex Code</span>
          <input className={`${styles.input} ${styles.inputMono}`} value={row.color} onChange={e => setRow(selectedClaim, { color: e.target.value })} placeholder="#RRGGBB" />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => {
          onSave(Number(selectedClaim.division), { owner_name: row.owner_name || 'Admin Set', color: row.color, owner_character_id: row.owner_character_id === '' ? null : Number(row.owner_character_id) });
          resetRow(Number(selectedClaim.division));
        }}>Save</button>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => resetRow(Number(selectedClaim.division))} disabled={!isDirty}>Reset</button>
        <button className={`${styles.btn} ${styles.btnDanger}`} style={{ marginLeft: 'auto' }} onClick={() => {
          if (window.prompt(`Type DELETE to remove claim for division #${selectedClaim.division}`) === 'DELETE') onDelete(Number(selectedClaim.division));
        }}>Delete</button>
      </div>
    </div>
  );
}

function ClaimsMap({ geo, bounds, selected, onSelect, colorForDivision, claimByDiv, edits }) {
  const mapRef = useRef(null);
  const geoRef = useRef(null);

  const numOr = (v, fb) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : fb);

  const style = useCallback((feature) => {
    const n = feature?.properties?.__division;
    const claim = claimByDiv.get(n);
    const isSelected = Number(selected) === Number(n);
    const fill = colorForDivision(n);
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

  const onEach = useCallback((feature, layer) => {
    const n = feature?.properties?.__division;
    const name = feature?.properties?.__name || `Division ${n}`;
    const claim = claimByDiv.get(n);

    layer.on({
      mouseover: (e) => {
        if (Number(selected) !== Number(n)) {
          e.target.setStyle({ weight: 3, fillOpacity: Math.min(style(e.target.feature).fillOpacity + 0.15, 0.85), dashArray: '', color: 'var(--accent-purple)' });
          if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront();
        }
      },
      mouseout: (e) => { if (Number(selected) !== Number(n) && geoRef.current) geoRef.current.resetStyle(e.target); },
      click: (e) => {
        L.DomEvent.stopPropagation(e);
        if (mapRef.current) mapRef.current.fitBounds(e.target.getBounds(), { padding: [40, 40], maxZoom: 15, duration: 0.5 });
        onSelect(n);
        e.target.bringToFront();
      },
    });

    layer.bindTooltip(`${n}: ${name}`, { permanent: true, direction: 'center', className: 'mapGlassTooltip', opacity: 0.9 });

    const escapeHtml = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    
    // Glassy Popup Styling
    const popupHtml = `
      <div style="background: rgba(15,15,20,0.9); backdrop-filter: blur(8px); padding: 12px; border-radius: 8px; border: 1px solid rgba(157, 124, 255, 0.4); color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
        <b style="color: #9d7cff; font-size: 1.1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; display: block; margin-bottom: 8px;">Division ${n}: ${escapeHtml(name)}</b>
        ${claim ? `
          <div style="margin-bottom: 4px; color: #ccc;">Owner: <strong style="color: #fff;">${escapeHtml(claim.owner_name || '')}</strong></div>
          ${claim.color ? `<div style="display: flex; align-items: center; gap: 8px; color: #ccc;">Color: <span style="display:inline-block;width:14px;height:14px;background:${escapeHtml(claim.color)};border-radius:4px;border:1px solid rgba(255,255,255,0.3);box-shadow: 0 0 5px ${escapeHtml(claim.color)}"></span><code>${escapeHtml(claim.color)}</code></div>` : ''}
        ` : `<div style="color: #a8a8b3; font-style: italic;">Unclaimed Territory</div>`}
      </div>
    `;
    
    layer.bindPopup(popupHtml, { closeButton: false, className: 'glassPopupWrapper' });
  }, [claimByDiv, onSelect, selected, style]);

  useEffect(() => { if (bounds && mapRef.current) try { if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [16, 16] }); } catch (e) {} }, [bounds]);
  useEffect(() => {
    if (!geoRef.current || !mapRef.current || !selected) return;
    const layer = (geoRef.current.getLayers?.() || []).find(l => l.feature?.properties?.__division === Number(selected));
    if (layer) { mapRef.current.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 15, duration: 0.5 }); layer.openPopup(); }
  }, [selected]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleClickOutside = (e) => { if (e.originalEvent?.target?.classList?.contains('leaflet-container') || e.originalEvent?.target?.classList?.contains('leaflet-tile')) onSelect(null); };
    map.on('click', handleClickOutside);
    return () => { map.off('click', handleClickOutside); };
  }, [onSelect]);

  const key = useMemo(() => `geo-${selected}-${claimByDiv.size}-${edits ? Object.keys(edits).length : 0}`, [selected, claimByDiv, edits]);

  return (
    <>
      <style>{`
        .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .leaflet-popup-tip { display: none !important; }
        .mapGlassTooltip { background: rgba(0,0,0,0.6) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #fff !important; backdrop-filter: blur(4px) !important; font-weight: bold; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.5) !important; }
      `}</style>
      <MapContainer className={styles.mapCanvas} whenCreated={(m) => { mapRef.current = m; }} bounds={bounds || undefined} center={!bounds ? [37.975, 23.735] : undefined} zoom={!bounds ? 12 : undefined} scrollWheelZoom style={{ height: '100%', width: '100%', background: '#050507' }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors &copy; CARTO" />
        <GeoJSON key={key} data={geo} ref={geoRef} style={style} onEachFeature={onEach} />
      </MapContainer>
    </>
  );
}