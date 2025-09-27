// src/pages/Admin.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import api from '../api';
import styles from '../styles/Admin.module.css';
import 'leaflet/dist/leaflet.css';


import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import domainsRaw from '../data/Domains.json';

/* ---------------- UI bits ---------------- */
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`${styles.tab} ${active ? styles.tabActive : ''}`}
    >
      {children}
    </button>
  );
}

/* ---------------- Main ---------------- */
export default function Admin() {
  const [tab, setTab] = useState('users'); // users | characters | claims | downtimes | xp
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [charIndex, setCharIndex] = useState({});
  const [downtimes, setDowntimes] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true); setErr(''); setMsg('');
    try {
      const u = await api.get('/admin/users');
      setUsers(u.data.users || []);

      // Build character index from users
      const idx = {};
      (u.data.users || []).forEach(u => {
        if (u.character_id) {
          idx[u.character_id] = {
            user_id: u.id,
            display_name: u.display_name,
            email: u.email,
            role: u.role,
            char_name: u.char_name,
            clan: u.clan,
            xp: u.xp,
            sheet: u.sheet,
          };
        }
      });
      setCharIndex(idx);

      // Claims
      try {
        const cl = await api.get('/domain-claims');
        setClaims(cl.data.claims || []);
      } catch {}

      // Downtimes (admin view)
      try {
        const dts = await api.get('/admin/downtimes');
        setDowntimes(dts.data.downtimes || []);
      } catch {}
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // ========= Users =========
  async function saveUser(u) {
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/users/${u.id}`, {
        display_name: u.display_name,
        email: u.email,
        role: u.role
      });
      setMsg(`Saved user #${u.id}`);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Backend missing PATCH /admin/users/:id. Add it or skip this action.');
    }
  }

  // ========= Characters =========
  async function saveCharacter(c) {
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/characters/${c.id}`, {
        name: c.name,
        clan: c.clan,
        sheet: c.sheet
      });
      setMsg(`Saved character #${c.id}`);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Backend missing PATCH /admin/characters/:id. Add it or skip this action.');
    }
  }

  async function grantXP(character_id, delta) {
    if (!delta) return;
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/characters/${character_id}/xp`, { delta: Number(delta) });
      setMsg(`XP adjusted by ${delta} for character #${character_id}`);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to adjust XP');
    }
  }

  // ========= Claims =========
  async function saveClaim(division, patch) {
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/domain-claims/${division}`, patch);
      setMsg(`Claim ${division} saved`);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save claim');
    }
  }
  async function deleteClaim(division) {
    setErr(''); setMsg('');
    try {
      await api.delete(`/admin/domain-claims/${division}`);
      setMsg(`Claim ${division} removed`);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to delete claim');
    }
  }

  // ========= Downtimes (Admin) =========
  async function saveDowntime(id, patch) {
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/downtimes/${id}`, patch);
      setMsg(`Downtime #${id} saved`);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save downtime');
    }
  }

  return (
    <div className={styles.adminRoot}>
      <div className={styles.container}>
        <h2 className={styles.title}>Admin Console</h2>
        {loading && (
          <div className={styles.loading}>
            <span className={styles.spinner} /> Loading…
          </div>
        )}
        {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}
        {msg && <div className={`${styles.alert} ${styles.alertInfo}`}>{msg}</div>}

        <div className={styles.toolbar}>
          <TabButton active={tab==='users'} onClick={()=>setTab('users')}>Users</TabButton>
          <TabButton active={tab==='characters'} onClick={()=>setTab('characters')}>Characters</TabButton>
          <TabButton active={tab==='claims'} onClick={()=>setTab('claims')}>Claims</TabButton>
          <TabButton active={tab==='downtimes'} onClick={()=>setTab('downtimes')}>Downtimes</TabButton>
          <TabButton active={tab==='xp'} onClick={()=>setTab('xp')}>XP Tools</TabButton>
          <button className={`${styles.btn} ${styles.btnGhost} ${styles.rowEnd}`} onClick={load}>Reload</button>
        </div>

        {tab === 'users' && <UsersTab users={users} onSave={saveUser} />}
        {tab === 'characters' && <CharactersTab users={users} onSave={saveCharacter} />}
        {tab === 'claims' && (
          <ClaimsTab
            claims={claims}
            characters={charIndex}
            onSave={saveClaim}
            onDelete={deleteClaim}
          />
        )}
        {tab === 'downtimes' && (
          <DowntimesTab
            rows={downtimes}
            onSave={saveDowntime}
          />
        )}
        {tab === 'xp' && <XPTools users={users} onGrant={grantXP} />}
      </div>
    </div>
  );
}

/* ==================== USERS ==================== */

function UsersTab({ users, onSave }) {
  const [edits, setEdits] = useState({}); // id -> {display_name,email,role}

  function getRow(u) {
    return edits[u.id] ?? { display_name: u.display_name || '', email: u.email || '', role: u.role || 'user' };
  }
  function setRow(u, patch) {
    setEdits(prev => ({ ...prev, [u.id]: { ...getRow(u), ...patch } }));
  }

  return (
    <div className="stack12">
      <h3>Users</h3>
      <div className={styles.usersGrid}>
        <b>Display Name</b>
        <b>Email</b>
        <b>Role</b>
        <b>Character</b>
        <span />
        {users.map(u => (
          <React.Fragment key={u.id}>
            <input value={getRow(u).display_name} onChange={e=>setRow(u, { display_name: e.target.value })}/>
            <input value={getRow(u).email} onChange={e=>setRow(u, { email: e.target.value })}/>
            <select value={getRow(u).role} onChange={e=>setRow(u, { role: e.target.value })}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <div className={styles.subtle}>{u.char_name ? `${u.char_name} (${u.clan})` : '—'}</div>
            <div>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={()=>onSave({ id: u.id, ...getRow(u) })}>Save</button>
            </div>
          </React.Fragment>
        ))}
      </div>
      <p className={styles.subtle} style={{marginTop:8}}>
        Tip: Saving here uses <code className={styles.kbd}>PATCH /admin/users/:id</code> (optional).
      </p>
    </div>
  );
}

/* ==================== CHARACTERS ==================== */

function CharactersTab({ users, onSave }) {
  const chars = useMemo(() => users.filter(u => u.character_id).map(u => ({
    id: u.character_id,
    user_id: u.id,
    name: u.char_name || '',
    clan: u.clan || '',
    xp: u.xp || 0,
    sheet: u.sheet || null,
    owner: `${u.display_name} <${u.email}>`
  })), [users]);

  const [edits, setEdits] = useState({});
  function getRow(c) { return edits[c.id] ?? { name: c.name, clan: c.clan, sheet: JSON.stringify(c.sheet || {}, null, 2) }; }
  function setRow(c, patch) { setEdits(prev => ({ ...prev, [c.id]: { ...getRow(c), ...patch } })); }

  return (
    <div className="stack12">
      <h3>Characters</h3>
      {!chars.length && <div className={styles.subtle}>No characters yet.</div>}
      {chars.map(c => (
        <div key={c.id} className={`${styles.card} ${styles.cardElev}`}>
          <div className={styles.stack12}>
            <div><b>Owner:</b> {c.owner}</div>
            <div className={styles.characters3}>
              <label>Name <input value={getRow(c).name} onChange={e=>setRow(c, { name: e.target.value })}/></label>
              <label>Clan <input value={getRow(c).clan} onChange={e=>setRow(c, { clan: e.target.value })}/></label>
              <label>XP <input value={c.xp} readOnly/></label>
            </div>
          </div>
          <div className="stack12" style={{marginTop:8}}>
            <label>Sheet (JSON)</label>
            <textarea
              value={getRow(c).sheet}
              onChange={e=>setRow(c, { sheet: e.target.value })}
              rows={8}
              style={{ fontFamily:'JetBrains Mono, ui-monospace, monospace' }}
            />
          </div>
          <div className={styles.row} style={{ marginTop:8 }}>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={()=>{
                let parsed = null;
                try { parsed = JSON.parse(getRow(c).sheet || '{}'); }
                catch { alert('Invalid JSON in sheet'); return; }
                onSave({ id: c.id, name: getRow(c).name, clan: getRow(c).clan, sheet: parsed });
              }}
            >
              Save Character
            </button>
          </div>
          <div className={styles.subtle} style={{ marginTop:6 }}>
            Saving uses <code className={styles.kbd}>PATCH /admin/characters/:id</code>.
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== CLAIMS — Split View + MAP (local GeoJSON) ==================== */

function ClaimsTab({ claims, characters, onSave, onDelete }) {
  // Sidebar & filters
  const [filter, setFilter] = useState('');
  const [onlyUnowned, setOnlyUnowned] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  // Selection & editing
  const [selected, setSelected] = useState(null); // number | 'new' | null
  const [edits, setEdits] = useState({}); // division -> { owner_name, color, owner_character_id }

  // "New" draft
  const [newDraft, setNewDraft] = useState({
    division: '',
    color: '#8a0f1a',
    owner_name: '',
    owner_character_id: '',
  });

  // Use local GeoJSON (Domains.json)
  const divisionsGeo = useMemo(() => {
    const raw = domainsRaw;
    if (!raw) return null;
    if (raw.type === 'FeatureCollection') return raw;
    if (Array.isArray(raw)) return { type: 'FeatureCollection', features: raw };
    if (raw.features) return { type: 'FeatureCollection', features: raw.features };
    return null;
  }, []);
  const mapError = useMemo(
    () => (divisionsGeo ? '' : 'Map data not available. Provide a FeatureCollection in /src/data/Domains.json with properties.division.'),
    [divisionsGeo]
  );

  const characterOptions = useMemo(
    () =>
      Object.entries(characters).map(([cid, info]) => ({
        id: Number(cid),
        label: `${cid} — ${info.char_name} (${info.display_name})`,
      })),
    [characters]
  );

  function validateHex(h) {
    return /^#([0-9a-fA-F]{6})$/.test(String(h).trim());
  }

  function getRow(c) {
    return edits[c.division] ?? {
      owner_name: c.owner_name || '',
      color: c.color || '#888888',
      owner_character_id: c.owner_character_id ?? '',
    };
  }
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
    claims.forEach(c => m.set(c.division, c));
    return m;
  }, [claims]);

  // live color (respect unsaved edits)
  const colorForDivision = useCallback(
    (division) => {
      const edit = edits[division];
      if (edit?.color) return edit.color;
      const base = claimByDiv.get(division)?.color;
      return base || '#454545';
    },
    [edits, claimByDiv]
  );

  // Right panel helpers
  const selectedClaim = typeof selected === 'number'
    ? claims.find(c => c.division === selected)
    : null;

  // Color shortcuts
  const COLOR_SHORTCUTS = [
    { name: 'Blue',  hex: '#2563eb' },
    { name: 'Green', hex: '#16a34a' },
    { name: 'Red',   hex: '#dc2626' },
  ];
  function ShortcutButtons({ onPick }) {
    return (
      <div className={styles.shortcutRow}>
        {COLOR_SHORTCUTS.map(c => (
          <button
            key={c.hex}
            type="button"
            className={styles.colorShortcut}
            title={c.name}
            onClick={() => onPick(c.hex)}
            style={{ background: c.hex }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.claimsLayout}>
      {/* Left: Map + list */}
      <aside className={styles.sidePanel}>
        <div className={styles.mapCard}>
          {divisionsGeo ? (
            <ClaimsMap
              geo={divisionsGeo}
              selected={selected}
              onSelect={setSelected}
              colorForDivision={colorForDivision}
            />
          ) : (
            <div className={styles.mapFallback}>
              <span className={styles.subtle}>{mapError}</span>
            </div>
          )}
        </div>

        <div className={styles.sideHeader} style={{ marginTop: 8 }}>
          <input
            className={styles.inputSearch}
            placeholder="Search #division / owner / character…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <button className={styles.btn} onClick={() => setSortAsc(s => !s)}>
            Sort {sortAsc ? '↓' : '↑'}
          </button>
        </div>

        <div className={styles.sideFilters}>
          <label className={styles.row} style={{ gap: 8 }}>
            <input
              type="checkbox"
              checked={onlyUnowned}
              onChange={e => setOnlyUnowned(e.target.checked)}
            />
            <span className={styles.subtle}>Only unowned</span>
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
                onClick={() => setSelected(c.division)}
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
      </aside>

      {/* Right: Editor */}
      <section className={styles.detailPanel}>
        {/* New claim editor */}
        {selected === 'new' && (
          <div className={`${styles.card} ${styles.stack12}`}>
            <div className={styles.detailHeader}>
              <h3>Create Claim</h3>
            </div>

            <div className={styles.formRow2}>
              <label>Division #
                <input
                  value={newDraft.division}
                  onChange={e => setNewDraft(d => ({ ...d, division: e.target.value }))}
                  placeholder="e.g., 12"
                />
              </label>
              <label>Owner Name
                <input
                  value={newDraft.owner_name}
                  onChange={e => setNewDraft(d => ({ ...d, owner_name: e.target.value }))}
                  placeholder="FirstName LastName"
                />
              </label>
            </div>

            <div className={styles.formRow3}>
              <label>Color
                <input
                  type="color"
                  value={newDraft.color}
                  onChange={e => setNewDraft(d => ({ ...d, color: e.target.value }))}
                  className={styles.colorBox}
                  title="Pick color"
                />
              </label>
              <label>Hex
                <input
                  value={newDraft.color}
                  onChange={e => setNewDraft(d => ({ ...d, color: e.target.value }))}
                  className={`${styles.inputMono} ${/^#([0-9a-fA-F]{6})$/.test(newDraft.color) ? '' : styles.inputError}`}
                  placeholder="#8a0f1a"
                />
              </label>
              <label>Owner Character (optional)
                <select
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

            <div className={styles.row} style={{ gap: 8 }}>
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
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setSelected(null)}>
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
            setRow={(c, patch) => setEdits(prev => ({ ...prev, [c.division]: { ...(prev[c.division] ?? {}), ...patch } }))}
            resetRow={(div) => resetRow(div)}
            onSave={(div, patch) => onSave(div, patch)}
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
    </div>
  );

  /* ---------- Inner map component so this snippet is self-contained ---------- */
  function ClaimsMap({ geo, selected, onSelect, colorForDivision }) {
    const mapRef = useRef(null);
    const geoRef = useRef(null);
    const featureLayersRef = useRef(new Map());

    // Fit bounds when data loads
    useEffect(() => {
      if (!geoRef.current || !mapRef.current) return;
      const b = geoRef.current.getBounds?.();
      if (b && b.isValid()) {
        mapRef.current.fitBounds(b, { padding: [16, 16] });
      }
    }, [geo]);

    // Restyle on selection or color changes
    useEffect(() => {
      featureLayersRef.current.forEach((layer, div) => {
        const isSel = selected === div;
        layer.setStyle({
          color: isSel ? '#ffffff' : '#1f2937',
          weight: isSel ? 3 : 1.5,
          fillColor: colorForDivision(div),
          fillOpacity: 0.55,
        });
      });
    }, [selected, colorForDivision]);

    return (
      <MapContainer
        className={styles.mapCanvas}
        center={[37.975, 23.735]}
        zoom={12}
        scrollWheelZoom
        whenCreated={(m) => { mapRef.current = m; }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        <GeoJSON
          data={geo}
          ref={geoRef}
          style={(feature) => {
            const div = Number(feature?.properties?.division);
            const isSel = selected === div;
            return {
              color: isSel ? '#ffffff' : '#1f2937',
              weight: isSel ? 3 : 1.5,
              fillColor: colorForDivision(div),
              fillOpacity: 0.55,
            };
          }}
          onEachFeature={(feature, layer) => {
            const div = Number(feature?.properties?.division);
            if (!div) return;
            featureLayersRef.current.set(div, layer);
            layer.on({
              click: () => onSelect(div),
              mouseover: (e) => e.target.setStyle({ weight: 3, color: '#ffffff' }),
              mouseout: (e) => {
                const isSel = selected === div;
                e.target.setStyle({ weight: isSel ? 3 : 1.5, color: isSel ? '#ffffff' : '#1f2937' });
              },
            });
            layer.bindTooltip(`#${div}`, { sticky: true, direction: 'auto', opacity: 0.9 });
          }}
        />
      </MapContainer>
    );
  }
}

function ExistingClaimEditor({ selected, claims, characters, getRow, setRow, resetRow, onSave }) {
  const selectedClaim = claims.find(c => c.division === selected);
  if (!selectedClaim) return null;

  return (
    <div className={`${styles.card} ${styles.stack12}`}>
      <div className={styles.detailHeader}>
        <div className={styles.detailSwatch} style={{ background: getRow(selectedClaim).color }} />
        <div>
          <h3>Division #{selectedClaim.division}</h3>
          <div className={styles.subtle}>
            {selectedClaim.owner_character_id
              ? <>Char ID {selectedClaim.owner_character_id} · {characters[selectedClaim.owner_character_id]?.char_name || 'unknown'}</>
              : 'No character linked'}
          </div>
        </div>
      </div>

      <div className={styles.formRow2}>
        <label>Owner Name
          <input
            value={getRow(selectedClaim).owner_name}
            onChange={e => setRow(selectedClaim, { owner_name: e.target.value })}
          />
        </label>
        <label>Owner Character
          <select
            value={getRow(selectedClaim).owner_character_id}
            onChange={e => setRow(selectedClaim, { owner_character_id: e.target.value })}
          >
            <option value="">— none —</option>
            {Object.entries(characters).map(([cid, info]) => (
              <option key={cid} value={cid}>{`${cid} — ${info.char_name} (${info.display_name})`}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.formRow3}>
        <label>Color
          <input
            type="color"
            value={getRow(selectedClaim).color}
            onChange={e => setRow(selectedClaim, { color: e.target.value })}
            className={styles.colorBox}
            title="Pick color"
          />
        </label>
        <label>Hex
          <input
            value={getRow(selectedClaim).color}
            onChange={e => setRow(selectedClaim, { color: e.target.value })}
            className={`${styles.inputMono} ${/^#([0-9a-fA-F]{6})$/.test(getRow(selectedClaim).color) ? '' : styles.inputError}`}
            placeholder="#RRGGBB"
          />
        </label>
        <div />
      </div>

      <div className={styles.row} style={{ gap: 8 }}>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => {
            const row = getRow(selectedClaim);
            if (!/^#([0-9a-fA-F]{6})$/.test(row.color)) return alert('Hex must be like #ff0066');
            const patch = {
              owner_name: row.owner_name || 'Admin Set',
              color: row.color,
              owner_character_id: row.owner_character_id === '' ? null : Number(row.owner_character_id),
            };
            onSave(selectedClaim.division, patch);
            resetRow(selectedClaim.division);
          }}
        >
          Save
        </button>
        <button
          className={`${styles.btn} ${styles.btnGhost}`}
          onClick={() => resetRow(selectedClaim.division)}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

/* ==================== DOWNTIMES (ADMIN) ==================== */

function DowntimesTab({ rows, onSave }) {
  const [filter, setFilter] = useState('');
  const [edits, setEdits] = useState({}); // id -> { status, gm_notes, gm_resolution }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(d =>
      String(d.id).includes(q) ||
      (d.title || '').toLowerCase().includes(q) ||
      (d.player_name || '').toLowerCase().includes(q) ||
      (d.char_name || '').toLowerCase().includes(q) ||
      (d.clan || '').toLowerCase().includes(q) ||
      (d.status || '').toLowerCase().includes(q)
    );
  }, [rows, filter]);

  function getRow(d) {
    return edits[d.id] ?? {
      status: d.status || 'submitted',
      gm_notes: d.gm_notes || '',
      gm_resolution: d.gm_resolution || '',
    };
  }
  function setRow(d, patch) {
    setEdits(prev => ({ ...prev, [d.id]: { ...getRow(d), ...patch } }));
  }
  function save(d, extraPatch = {}) {
    const payload = { ...getRow(d), ...extraPatch };
    onSave(d.id, payload);
  }

  const statuses = ['submitted','approved','rejected','resolved'];

  return (
    <div className="stack12">
      <h3>Downtimes</h3>

      <div className={styles.sideHeader} style={{ marginBottom: 8 }}>
        <input
          className={styles.inputSearch}
          placeholder="Search by #id / title / player / character / status…"
          value={filter}
          onChange={e=>setFilter(e.target.value)}
        />
      </div>

      {!filtered.length && <div className={styles.subtle}>No downtimes found.</div>}

      {filtered.map(d => (
        <div key={d.id} className={`${styles.card} ${styles.cardElev}`}>
          <div className={styles.row} style={{ justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div><b>#{d.id}</b> — <b>{d.title}</b></div>
              <div className={styles.subtle}>
                By {d.player_name} &middot; Character: {d.char_name} ({d.clan}) &middot; Created: {new Date(d.created_at).toLocaleString()}
                {d.resolved_at && <> &middot; Resolved: {new Date(d.resolved_at).toLocaleString()}</>}
              </div>
              {d.feeding_type && <div className={styles.subtle}>Feeding: {d.feeding_type}</div>}
            </div>

            <div className={styles.row} style={{ gap:8 }}>
              <select
                value={getRow(d).status}
                onChange={e=>setRow(d, { status: e.target.value })}
              >
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className={styles.btn} onClick={()=>save(d)}>Save</button>
              <button className={styles.btn} onClick={()=>save(d, { status:'approved' })}>Approve</button>
              <button className={styles.btn} onClick={()=>save(d, { status:'rejected' })}>Reject</button>
              <button className={styles.btnPrimary} onClick={()=>save(d, { status:'resolved' })}>Resolve</button>
            </div>
          </div>

          <div className="stack12" style={{ marginTop:8 }}>
            <label>Player Submission</label>
            <textarea value={d.body} readOnly rows={4} />
          </div>

          <div className="stack12" style={{ marginTop:8 }}>
            <label>GM Resolution (visible to player)</label>
            <textarea
              value={getRow(d).gm_notes}
              onChange={e=>setRow(d, { gm_notes: e.target.value })}
              rows={3}
              placeholder="Private notes for tracking/rulings…"
            />
          </div>

          <div className="stack12" style={{ marginTop:8 }}>
            <label>GM Notes</label>
            <textarea
              value={getRow(d).gm_resolution}
              onChange={e=>setRow(d, { gm_resolution: e.target.value })}
              rows={4}
              placeholder="What happened as a result of this downtime…"
            />
          </div>
        </div>
      ))}

      <p className={styles.subtle} style={{ marginTop:8 }}>
        Uses <code className={styles.kbd}>GET /admin/downtimes</code> and <code className={styles.kbd}>PATCH /admin/downtimes/:id</code>.
      </p>
    </div>
  );
}

/* ==================== XP TOOLS ==================== */

function XPTools({ users, onGrant }) {
  const characters = users.filter(u => u.character_id).map(u => ({
    id: u.character_id,
    owner: `${u.display_name} <${u.email}>`,
    name: u.char_name || '',
    clan: u.clan || '',
    xp: u.xp || 0
  }));

  const [grants, setGrants] = useState({}); // char_id -> delta

  return (
    <div className="stack12">
      <h3>XP Tools</h3>
      {!characters.length && <div className={styles.subtle}>No characters to grant XP to yet.</div>}
      <div className={styles.xpGrid}>
        <b>Character</b><b>Clan</b><b>Owner</b><b>Current XP</b><span />
        {characters.map(c => (
          <React.Fragment key={c.id}>
            <div>{c.name}</div>
            <div className={styles.subtle}>{c.clan}</div>
            <div className={styles.subtle}>{c.owner}</div>
            <div>{c.xp}</div>
            <div className={styles.row} style={{ gap:6 }}>
              <input
                placeholder="+/- XP"
                value={grants[c.id] ?? ''}
                onChange={e=>setGrants(prev => ({ ...prev, [c.id]: e.target.value }))}
                style={{ width:90 }}
              />
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={()=>onGrant(c.id, grants[c.id])}>Apply</button>
            </div>
          </React.Fragment>
        ))}
      </div>
      <p className={styles.subtle} style={{ marginTop:8 }}>
        Uses <code className={styles.kbd}>PATCH /admin/characters/:id/xp</code>.
      </p>
    </div>
  );
}
