// src/pages/Admin.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';

/* ---------------- UI bits ---------------- */
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 12px',
        border: '1px solid #444',
        borderBottom: active ? '2px solid #fff' : '1px solid #444',
        background: active ? '#222' : '#111',
        color: '#eee',
        cursor: 'pointer',
        fontWeight: active ? 700 : 400,
      }}
    >
      {children}
    </button>
  );
}

/* ---------------- Main ---------------- */
export default function Admin() {
  const [tab, setTab] = useState('users'); // users | characters | downtimes | domains | claims | xp
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [dts, setDts] = useState([]);
  const [domains, setDomains] = useState([]);
  const [claims, setClaims] = useState([]);
  const [charIndex, setCharIndex] = useState({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true); setErr(''); setMsg('');
    try {
      const u = await api.get('/admin/users');
      const d = await api.get('/admin/downtimes');
      setUsers(u.data.users || []);
      setDts(d.data.downtimes || []);
      // Build character index
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
      // Domains (player endpoint lists all with members)
      try {
        const dom = await api.get('/domains');
        setDomains(dom.data.domains || []);
      } catch {}
      // Claims
      try {
        const cl = await api.get('/domain-claims');
        setClaims(cl.data.claims || []);
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

  // ========= Downtimes =========
  async function updateDt(d, patch) {
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/downtimes/${d.id}`, patch);
      setMsg(`Downtime #${d.id} updated`);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to update downtime');
    }
  }

  // ========= Domains =========
  async function createDomain(name, description) {
    if (!name) return;
    setErr(''); setMsg('');
    try {
      await api.post(`/admin/domains`, { name, description });
      setMsg('Domain created');
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to create domain');
    }
  }
  async function deleteDomain(id) {
    setErr(''); setMsg('');
    try {
      await api.delete(`/admin/domains/${id}`);
      setMsg('Domain deleted');
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to delete domain');
    }
  }
  async function addDomainMember(domain_id, character_id) {
    if (!character_id) return;
    setErr(''); setMsg('');
    try {
      await api.post(`/admin/domains/${domain_id}/members`, { character_id: Number(character_id) });
      setMsg('Member added');
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to add domain member');
    }
  }
  async function removeDomainMember(domain_id, character_id) {
    setErr(''); setMsg('');
    try {
      await api.delete(`/admin/domains/${domain_id}/members/${character_id}`);
      setMsg('Member removed');
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to remove domain member');
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

  return (
    <div style={{ maxWidth: 1200, margin:'2rem auto', padding:'0 12px', color:'#eee' }}>
      <h2>Admin Console</h2>
      {loading && <div style={{ margin:'8px 0' }}>Loading…</div>}
      {err && <div style={{ background:'#3a1010', border:'1px solid #802', padding:8, margin:'8px 0' }}>{err}</div>}
      {msg && <div style={{ background:'#0f2f14', border:'1px solid #1d6f36', padding:8, margin:'8px 0' }}>{msg}</div>}

      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <TabButton active={tab==='users'} onClick={()=>setTab('users')}>Users</TabButton>
        <TabButton active={tab==='characters'} onClick={()=>setTab('characters')}>Characters</TabButton>
        <TabButton active={tab==='downtimes'} onClick={()=>setTab('downtimes')}>Downtimes</TabButton>
        <TabButton active={tab==='domains'} onClick={()=>setTab('domains')}>Domains</TabButton>
        <TabButton active={tab==='claims'} onClick={()=>setTab('claims')}>Claims</TabButton>
        <TabButton active={tab==='xp'} onClick={()=>setTab('xp')}>XP Tools</TabButton>
        <button onClick={load} style={{ marginLeft:'auto' }}>Reload</button>
      </div>

      {tab === 'users' && <UsersTab users={users} onSave={saveUser} />}

      {tab === 'characters' && <CharactersTab users={users} onSave={saveCharacter} />}

      {tab === 'downtimes' && <DowntimesTab dts={dts} onUpdate={updateDt} />}

      {tab === 'domains' && (
        <DomainsTab
          domains={domains}
          characters={charIndex}
          onCreate={createDomain}
          onDelete={deleteDomain}
          onAddMember={addDomainMember}
          onRemoveMember={removeDomainMember}
        />
      )}

      {tab === 'claims' && (
        <ClaimsTab
          claims={claims}
          characters={charIndex}
          onSave={saveClaim}
          onDelete={deleteClaim}
        />
      )}

      {tab === 'xp' && <XPTools users={users} onGrant={grantXP} />}
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
    <div>
      <h3>Users</h3>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 2fr 1fr 2fr 180px', gap:8, alignItems:'center' }}>
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
            <div>{u.char_name ? `${u.char_name} (${u.clan})` : '—'}</div>
            <div>
              <button onClick={()=>onSave({ id: u.id, ...getRow(u) })}>Save</button>
            </div>
          </React.Fragment>
        ))}
      </div>
      <p style={{ marginTop:8, opacity:.7 }}>
        Tip: Saving here uses <code>PATCH /admin/users/:id</code> (optional). If you haven’t added that route yet, you’ll see a warning.
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
    <div>
      <h3>Characters</h3>
      {!chars.length && <div>No characters yet.</div>}
      {chars.map(c => (
        <div key={c.id} style={{ border:'1px solid #444', padding:12, marginBottom:10 }}>
          <div style={{ display:'flex', gap:12 }}>
            <div style={{ flex:1 }}>
              <div><b>Owner:</b> {c.owner}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:8 }}>
                <label>Name <input value={getRow(c).name} onChange={e=>setRow(c, { name: e.target.value })}/></label>
                <label>Clan <input value={getRow(c).clan} onChange={e=>setRow(c, { clan: e.target.value })}/></label>
                <label>XP <input value={c.xp} readOnly/></label>
              </div>
            </div>
          </div>
          <div style={{ marginTop:8 }}>
            <label>Sheet (JSON)</label>
            <textarea
              value={getRow(c).sheet}
              onChange={e=>setRow(c, { sheet: e.target.value })}
              rows={8}
              style={{ width:'100%', fontFamily:'monospace' }}
            />
          </div>
          <div style={{ marginTop:8, display:'flex', gap:8 }}>
            <button onClick={()=>{
              let parsed = null;
              try { parsed = JSON.parse(getRow(c).sheet || '{}'); }
              catch { alert('Invalid JSON in sheet'); return; }
              onSave({ id: c.id, name: getRow(c).name, clan: getRow(c).clan, sheet: parsed });
            }}>Save Character</button>
          </div>
          <div style={{ marginTop:6, opacity:.7 }}>
            Saving uses <code>PATCH /admin/characters/:id</code> (optional). If not present, add that route to backend.
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== DOWNTIMES ==================== */

function DowntimesTab({ dts, onUpdate }) {
  const [edit, setEdit] = useState({}); // id -> { status, gm_notes, gm_resolution }

  function getRow(d) {
    return edit[d.id] ?? {
      status: d.status,
      gm_notes: d.gm_notes || '',
      gm_resolution: d.gm_resolution || ''
    };
  }
  function setRow(d, patch) {
    setEdit(prev => ({ ...prev, [d.id]: { ...getRow(d), ...patch } }));
  }

  return (
    <div>
      <h3>Downtimes</h3>
      {dts.map(d => (
        <div key={d.id} style={{ border:'1px solid #444', padding:12, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
            <div>
              <div><b>Title:</b> {d.title}</div>
              <div><b>Character:</b> {d.char_name} ({d.clan}) • by {d.player_name} &lt;{d.email}&gt;</div>
              <div style={{ marginTop:6, whiteSpace:'pre-wrap' }}>{d.body}</div>
            </div>
            <div style={{ minWidth:220 }}>
              <label>Status
                <select
                  value={getRow(d).status}
                  onChange={e=>setRow(d, { status: e.target.value })}
                  style={{ width:'100%' }}
                >
                  <option value="submitted">submitted</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                  <option value="resolved">resolved</option>
                </select>
              </label>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:10 }}>
            <label>GM Notes
              <textarea
                rows={4}
                value={getRow(d).gm_notes}
                onChange={e=>setRow(d, { gm_notes: e.target.value })}
                style={{ width:'100%' }}
              />
            </label>
            <label>Resolution
              <textarea
                rows={4}
                value={getRow(d).gm_resolution}
                onChange={e=>setRow(d, { gm_resolution: e.target.value })}
                style={{ width:'100%' }}
              />
            </label>
          </div>

          <div style={{ marginTop:8, display:'flex', gap:8 }}>
            <button onClick={()=>onUpdate(d, { status: getRow(d).status, gm_notes: getRow(d).gm_notes, gm_resolution: getRow(d).gm_resolution })}>
              Save
            </button>
            <button onClick={()=>onUpdate(d, { status: 'approved' })}>Approve</button>
            <button onClick={()=>onUpdate(d, { status: 'rejected' })}>Reject</button>
            <button onClick={()=>onUpdate(d, { status: 'resolved', gm_resolution: getRow(d).gm_resolution })}>Resolve</button>
          </div>

          <div style={{ marginTop:6, opacity:.7 }}>
            Uses <code>PATCH /admin/downtimes/:id</code> (supports status, gm_notes, gm_resolution).
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== DOMAINS ==================== */

function DomainsTab({ domains, characters, onCreate, onDelete, onAddMember, onRemoveMember }) {
  const [newDom, setNewDom] = useState({ name:'', description:'' });
  const characterOptions = Object.entries(characters).map(([cid, info]) => ({ id: cid, label: `${cid} — ${info.char_name} (${info.display_name})` }));

  return (
    <div>
      <h3>Domains</h3>

      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <input placeholder="Name" value={newDom.name} onChange={e=>setNewDom(v=>({...v, name: e.target.value}))}/>
        <input placeholder="Description" value={newDom.description} onChange={e=>setNewDom(v=>({...v, description: e.target.value}))}/>
        <button onClick={()=>onCreate(newDom.name, newDom.description)}>Create</button>
      </div>

      {domains.map(d => (
        <div key={d.id} style={{ border:'1px solid #444', padding:12, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <b>{d.name}</b>{' '}
              <span style={{ opacity:.7 }}>{d.description || ''}</span>
            </div>
            <button onClick={()=>onDelete(d.id)}>Delete</button>
          </div>

          <div style={{ marginTop:8 }}>
            <b>Members</b>
            <ul style={{ marginTop:6 }}>
              {(d.members || []).map(m => {
                const charId = Object.entries(characters).find(([,i]) => i.char_name === m.name)?.[0];
                return (
                  <li key={`${d.id}-${m.name}`} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span>{m.name} ({m.clan})</span>
                    {charId && (
                      <button onClick={()=>onRemoveMember(d.id, charId)}>Remove</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <AddMemberRow domain={d} characterOptions={characterOptions} onAdd={onAddMember} />
          <div style={{ marginTop:6, opacity:.7 }}>
            Uses <code>/admin/domains</code> (POST/DELETE) and <code>/admin/domains/:id/members</code> (POST/DELETE).
          </div>
        </div>
      ))}
    </div>
  );
}

function AddMemberRow({ domain, characterOptions, onAdd }) {
  const [cid, setCid] = useState('');
  return (
    <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:6 }}>
      <select value={cid} onChange={e=>setCid(e.target.value)}>
        <option value="">— Select Character —</option>
        {characterOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <button disabled={!cid} onClick={()=>onAdd(domain.id, cid)}>Add Member</button>
    </div>
  );
}

/* ==================== CLAIMS (with color picker) ==================== */

function ClaimsTab({ claims, characters, onSave, onDelete }) {
  const [edits, setEdits] = useState({}); // division -> { owner_name, color, owner_character_id }

  function getRow(c) {
    return edits[c.division] ?? {
      owner_name: c.owner_name || '',
      color: c.color || '#888888',
      owner_character_id: c.owner_character_id ?? ''
    };
  }
  function setRow(c, patch) {
    setEdits(prev => ({ ...prev, [c.division]: { ...getRow(c), ...patch } }));
  }

  const characterOptions = Object.entries(characters).map(([cid, info]) => ({
    id: Number(cid),
    label: `${cid} — ${info.char_name} (${info.display_name})`
  }));

  // Create / override
  const [newDiv, setNewDiv] = useState('');
  const [newColor, setNewColor] = useState('#8a0f1a');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerChar, setNewOwnerChar] = useState('');

  function validateHex(h) {
    return /^#([0-9a-fA-F]{6})$/.test(String(h).trim());
  }

  return (
    <div>
      <h3>Claims</h3>

      <div style={{ border:'1px solid #333', padding:12, marginBottom:12 }}>
        <b>Create / Override Claim</b>
        <div style={{ display:'grid', gridTemplateColumns:'110px 80px 120px 1fr 260px 120px', gap:8, marginTop:8, alignItems:'center' }}>
          <label>Division #
            <input value={newDiv} onChange={e=>setNewDiv(e.target.value)} placeholder="e.g., 12" />
          </label>

          {/* Color picker */}
          <label style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span>Color</span>
            <input
              type="color"
              value={newColor}
              onChange={e=>setNewColor(e.target.value)}
              style={{ width: 36, height: 36, padding: 0, border: 0, background: 'transparent' }}
              title="Pick color"
            />
          </label>

          {/* Hex text (synced) */}
          <label>Hex
            <input
              value={newColor}
              onChange={e=>setNewColor(e.target.value)}
              placeholder="#8a0f1a"
              style={{ fontFamily:'monospace' }}
            />
          </label>

          <label>Owner Name
            <input value={newOwnerName} onChange={e=>setNewOwnerName(e.target.value)} placeholder="e.g., FirstName Last Name" />
          </label>

          <label>Owner Character (optional)
            <select value={newOwnerChar} onChange={e=>setNewOwnerChar(e.target.value)}>
              <option value="">— none —</option>
              {characterOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>

          <div>
            <button onClick={()=>{
              const div = Number(newDiv);
              if (!Number.isInteger(div)) return alert('Division must be an integer');
              if (!validateHex(newColor)) return alert('Hex must be like #ff0066');
              const patch = {
                owner_name: newOwnerName || 'Admin Set',
                color: newColor
              };
              if (newOwnerChar === '') patch.owner_character_id = null;
              else patch.owner_character_id = Number(newOwnerChar);
              onSave(div, patch);
              setNewDiv(''); setNewOwnerName(''); setNewOwnerChar('');
            }}>Save</button>
          </div>
        </div>
        <div style={{ marginTop:6, opacity:.7 }}>
          Uses <code>PATCH /api/admin/domain-claims/:division</code> (upsert). Color must be a 6-digit hex.
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'100px 80px 120px 160px 1fr 260px 160px', gap:8, alignItems:'center' }}>
        <b>Division</b>
        <b>Swatch</b>
        <b>Current Hex</b>
        <b>Character</b>
        <b>Owner Name</b>
        <b>Update</b>
        <b>Actions</b>

        {claims.sort((a,b)=>a.division-b.division).map(c => (
          <React.Fragment key={c.division}>
            <div>#{c.division}</div>

            <div>
              <div style={{ width:18, height:18, background:c.color, border:'1px solid #333' }} />
            </div>

            <code style={{ alignSelf:'center' }}>{c.color}</code>

            <div>
              {c.owner_character_id
                ? `${c.owner_character_id} — ${characters[c.owner_character_id]?.char_name || 'unknown'}`
                : '—'}
            </div>

            <div>{c.owner_name}</div>

            <div style={{ display:'grid', gridTemplateColumns:'70px 120px 1fr 200px', gap:6 }}>
              {/* Color picker + hex (synced) */}
              <input
                type="color"
                value={getRow(c).color}
                onChange={e=>setRow(c, { color: e.target.value })}
                style={{ width: 36, height: 36, padding: 0, border: 0, background: 'transparent' }}
                title="Pick color"
              />
              <input
                value={getRow(c).color}
                onChange={e=>setRow(c, { color: e.target.value })}
                placeholder="#RRGGBB"
                style={{ fontFamily:'monospace' }}
                title="Edit hex"
              />
              <input
                placeholder="Owner Name"
                value={getRow(c).owner_name}
                onChange={e=>setRow(c, { owner_name: e.target.value })}
              />
              <select
                value={getRow(c).owner_character_id}
                onChange={e=>setRow(c, { owner_character_id: e.target.value })}
              >
                <option value="">— none —</option>
                {characterOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>

            <div style={{ display:'flex', gap:6 }}>
              <button onClick={()=>{
                const patch = {};
                if (getRow(c).owner_name) patch.owner_name = getRow(c).owner_name;
                if (validateHex(getRow(c).color)) patch.color = getRow(c).color;
                else return alert('Hex must be like #ff0066');
                const oc = getRow(c).owner_character_id;
                if (oc === '') patch.owner_character_id = null;
                else patch.owner_character_id = Number(oc);
                onSave(c.division, patch);
              }}>Save</button>
              <button onClick={()=>onDelete(c.division)}>Unclaim</button>
            </div>
          </React.Fragment>
        ))}
      </div>

      {!claims.length && (
        <div style={{ marginTop:12, opacity:.7 }}>
          No claims yet. Create one above (division + color + optional character).
        </div>
      )}
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
    <div>
      <h3>XP Tools</h3>
      {!characters.length && <div>No characters to grant XP to yet.</div>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 160px', gap:8, alignItems:'center' }}>
        <b>Character</b><b>Clan</b><b>Owner</b><b>Current XP</b><span />
        {characters.map(c => (
          <React.Fragment key={c.id}>
            <div>{c.name}</div>
            <div>{c.clan}</div>
            <div>{c.owner}</div>
            <div>{c.xp}</div>
            <div style={{ display:'flex', gap:6 }}>
              <input
                placeholder="+/- XP"
                value={grants[c.id] ?? ''}
                onChange={e=>setGrants(prev => ({ ...prev, [c.id]: e.target.value }))}
                style={{ width:90 }}
              />
              <button onClick={()=>onGrant(c.id, grants[c.id])}>Apply</button>
            </div>
          </React.Fragment>
        ))}
      </div>
      <p style={{ marginTop:8, opacity:.7 }}>
        Uses <code>PATCH /admin/characters/:id/xp</code>.
      </p>
    </div>
  );
}
