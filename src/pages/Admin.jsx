// src/pages/Admin.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import api from '../api';
import styles from '../styles/Admin.module.css';
import 'leaflet/dist/leaflet.css';

import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import CharacterSetup from './CharacterSetup';
import CharacterView from './CharacterView';

import domainsRaw from '../data/Domains.json';
import { Link } from 'react-router-dom';

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
  const [tab, setTab] = useState('users'); // users | characters | claims | downtimes | xp | npcs | chat
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [charIndex, setCharIndex] = useState({});
  const [downtimes, setDowntimes] = useState([]);
  const [npcs, setNPCs] = useState([]);
  const [allMessages, setAllMessages] = useState([]);


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

      // NPCs
      try {
        const np = await api.get('/admin/npcs');
        setNPCs(np.data.npcs || []);
      } catch {}

      // All chat messages (for admin)
      try {
          const msgs = await api.get('/admin/chat/all');
          setAllMessages(msgs.data.messages || []);
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

// ========= Characters: Generate PDF (client-side, from JSON sheet) =========
  async function handleGeneratePDF(character) {
    try {
      const { jsPDF } = await import('jspdf');

      // --- 1. FONT SETUP ---
      // IMPORTANT: You must provide the Base64-encoded .ttf files for the fonts.
      // 1. Get your .ttf font files (e.g., from Google Fonts)
      // 2. Use an online converter (search "ttf to base64") to get the string
      // 3. Paste that string (it's very long) to replace the "..."
      const CinzelRegular_Base64 = "..."; // <--- PASTE Cinzel-Regular.ttf BASE64 HERE
      const CinzelBold_Base64 = "..."; // <--- PASTE Cinzel-Bold.ttf BASE64 HERE

      const FONT_REGULAR = 'Cinzel';
      const FONT_BOLD = 'Cinzel-Bold';

      // --- 2. STYLES & LAYOUT ---
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const M = 36; // margin
      const usableW = pageW - M * 2;
      let y = M; // Current Y-position cursor

      const COLOR_RED = '#8a0303'; // Dark blood red
      const COLOR_DARK = '#333333';
      const COLOR_LIGHT = '#aaaaaa';
      const COLOR_FILL = '#333333';
      const DOT_SIZE = 6;
      const DOT_GAP = 4;
      
      // Add fonts to the virtual file system
      if (CinzelRegular_Base64 !== "...") {
        doc.addFileToVFS('Cinzel-Regular.ttf', CinzelRegular_Base64);
        doc.addFont('Cinzel-Regular.ttf', FONT_REGULAR, 'normal');
      }
      if (CinzelBold_Base64 !== "...") {
        doc.addFileToVFS('Cinzel-Bold.ttf', CinzelBold_Base64);
        doc.addFont('Cinzel-Bold.ttf', FONT_BOLD, 'normal');
      }
      // Set default font
      doc.setFont(FONT_REGULAR);


      // --- 3. PDF HELPER FUNCTIONS ---

      // Ensures there is enough space for the next element, adds a page if not
      const ensure = (extraH = 20) => {
        if (y + extraH > pageH - M) {
          doc.addPage();
          y = M;
        }
      };
      
      // Splits long text
      const split = (t, w = usableW) => doc.splitTextToSize(String(t ?? ''), w);
      
      // Draws a styled section header
      const section = (title) => {
        ensure(30);
        y += 10; // Extra space before section
        doc.setFont(FONT_BOLD).setFontSize(14).setTextColor(COLOR_RED);
        doc.text(title.toUpperCase(), M, y);
        y += 6;
        doc.setDrawColor(COLOR_RED).setLineWidth(1).line(M, y, M + usableW, y);
        y += 20;
        doc.setFont(FONT_REGULAR).setFontSize(10).setTextColor(COLOR_DARK);
      };

      // Draws a label and a series of "dots" (circles)
      const drawDots = (label, value, max = 5) => {
        ensure(18);
        const val = Number(value) || 0;
        const maxVal = Number(max) || 5;
        const x = M + 120; // X-position for dots

        // Draw Label
        doc.setFont(FONT_REGULAR).setFontSize(10).setTextColor(COLOR_DARK);
        doc.text(label, M, y + DOT_SIZE - 1);
        
        // Draw Dots
        doc.setLineWidth(1);
        for (let i = 1; i <= maxVal; i++) {
          const dotX = x + (i * (DOT_SIZE + DOT_GAP));
          const isFilled = i <= val;
          doc.setFillColor(isFilled ? COLOR_FILL : '#ffffff');
          doc.setDrawColor(isFilled ? COLOR_FILL : COLOR_LIGHT);
          doc.circle(dotX, y + (DOT_SIZE / 2), DOT_SIZE / 2, 'FD');
        }
        y += DOT_SIZE + DOT_GAP + 6;
      };

      // Draws a label and a series of "tracker" boxes (for Health, WP)
      const drawTracker = (label, value, max = 10, xStart = M) => {
        ensure(22);
        const val = Number(value) || 0;
        const BOX_SIZE = 10;
        const BOX_GAP = 3;

        // Draw Label
        doc.setFont(FONT_BOLD).setFontSize(10).setTextColor(COLOR_DARK);
        doc.text(label.toUpperCase(), xStart, y + BOX_SIZE - 1);
        
        // Draw Boxes
        doc.setLineWidth(1).setDrawColor(COLOR_DARK);
        for (let i = 1; i <= max; i++) {
          const boxX = xStart + 80 + (i * (BOX_SIZE + BOX_GAP));
          const isFilled = i <= val;
          doc.setFillColor(isFilled ? COLOR_FILL : '#ffffff');
          doc.rect(boxX, y, BOX_SIZE, BOX_SIZE, 'FD');
        }
        y += BOX_SIZE + BOX_GAP + 6;
      };

      // --- 4. PARSE CHARACTER DATA ---
      let sheet = {};
      try {
        sheet = typeof character.sheet === 'string'
          ? JSON.parse(character.sheet)
          : (character.sheet || {});
      } catch (e) {
        console.error('Invalid sheet JSON', e);
        alert('Invalid JSON sheet. Please fix the sheet and try again.');
        return;
      }

      // Data accessors
      const name = character.name || sheet.name || 'Unnamed';
      const clan = character.clan || sheet.clan || '—';
      const owner = character.owner || character.owner_name || '—';
      const id = character.id ?? '—';

      const attrs = sheet.attributes || {};
      const getAttr = (k) => Number(attrs[k] ?? 0);
      const healthMax = getAttr('Stamina') + 3;
      const willMax = getAttr('Composure') + getAttr('Resolve');

      // --- 5. BUILD THE PDF DOCUMENT ---

      // == HEADER ==
      doc.setFont(FONT_BOLD).setFontSize(24).setTextColor(COLOR_RED);
      doc.text(name.toUpperCase(), M, y);
      y += 24;

      doc.setFont(FONT_REGULAR).setFontSize(11).setTextColor(COLOR_DARK);
      const colW = usableW / 3;
      doc.text(`Clan: ${clan}`, M, y);
      doc.text(`Predator: ${sheet.predatorType || '—'}`, M + colW, y);
      doc.text(`Sire: ${sheet.sire || '—'}`, M + colW * 2, y);
      y += 16;
      doc.text(`Ambition: ${sheet.ambition || '—'}`, M, y);
      doc.text(`Desire: ${sheet.desire || '—'}`, M + colW, y);
      y += 14;
      doc.setDrawColor(COLOR_LIGHT).setLineWidth(0.5).line(M, y, M + usableW, y);
      y += 10;

      // == TRACKERS ==
      drawTracker('Health', sheet.health_current ?? healthMax, healthMax);
      drawTracker('Willpower', sheet.willpower_current ?? willMax, willMax);
      drawTracker('Humanity', sheet.humanity ?? 7, 10);

      // == ATTRIBUTES ==
      section('Attributes');
      doc.setFontSize(9).setTextColor(COLOR_LIGHT).text('Physical', M + 120, y - 8);
      drawDots('Strength', getAttr('Strength'));
      drawDots('Dexterity', getAttr('Dexterity'));
      drawDots('Stamina', getAttr('Stamina'));
      
      y += 6;
      doc.setFontSize(9).setTextColor(COLOR_LIGHT).text('Social', M + 120, y - 8);
      drawDots('Charisma', getAttr('Charisma'));
      drawDots('Manipulation', getAttr('Manipulation'));
      drawDots('Composure', getAttr('Composure'));
      
      y += 6;
      doc.setFontSize(9).setTextColor(COLOR_LIGHT).text('Mental', M + 120, y - 8);
      drawDots('Intelligence', getAttr('Intelligence'));
      drawDots('Wits', getAttr('Wits'));
      drawDots('Resolve', getAttr('Resolve'));

      // == SKILLS ==
      section('Skills');
      const skills = sheet.skills || {};
      const skillKeys = Object.keys(skills).sort();
      if (!skillKeys.length) {
        doc.text('No skills defined.', M, y); y += 14;
      }
      skillKeys.forEach((k) => {
        const s = skills[k] || {};
        const dots = Number(s.dots || 0);
        const specs = (Array.isArray(s.specialties) ? s.specialties : []).join(', ');
        const label = specs ? `${k} (${specs})` : k;
        drawDots(label, dots);
      });

      // == DISCIPLINES & POWERS ==
      section('Disciplines');
      const disc = sheet.disciplines || {};
      const powers = sheet.disciplinePowers || {};
      const discKeys = Object.keys(disc).sort();
      if (!discKeys.length) {
        doc.text('No disciplines defined.', M, y); y += 14;
      }
      discKeys.forEach((k) => {
        ensure(30);
        drawDots(k, disc[k]);
        const powerList = powers[k] || [];
        if (powerList.length) {
          y -= 6; // Move up to tuck under the dots
          powerList.forEach((p) => {
            const ln = `• [Lvl ${p.level}] ${p.name || p.id || '—'}`;
            const lines = split(ln, usableW - 140); // Indent
            lines.forEach((l2) => {
              ensure(14);
              doc.text(l2, M + 140, y);
              y += 12;
            });
          });
          y += 6; // Add space after
        }
      });

      // == ADVANTAGES (MERITS & FLAWS) ==
      section('Advantages');
      const merits = (sheet.advantages && sheet.advantages.merits) || [];
      const flaws = (sheet.advantages && sheet.advantages.flaws) || [];
      
      doc.setFont(FONT_BOLD).setFontSize(11).text('Merits', M, y); y += 14;
      if (!merits.length) {
        doc.setFont(FONT_REGULAR).setFontSize(10).text('• None', M + 12, y); y += 14;
      }
      merits.filter(Boolean).forEach((m) => {
        const nm = m.name || m.id || '—';
        const dt = (m.dots ?? m.rating ?? '—');
        const ln = `• ${nm} (${dt} dots)${m.description ? `: ${m.description}` : ''}`;
        split(ln).forEach((l) => { ensure(14); doc.text(l, M + 12, y); y += 14; });
      });
      
      y += 10;
      doc.setFont(FONT_BOLD).setFontSize(11).text('Flaws', M, y); y += 14;
      if (!flaws.length) {
        doc.setFont(FONT_REGULAR).setFontSize(10).text('• None', M + 12, y); y += 14;
      }
      flaws.filter(Boolean).forEach((m) => {
        const nm = m.name || m.id || '—';
        const dt = (m.dots ?? m.rating ?? '—');
        const ln = `• ${nm} (${dt} dots)${m.description ? `: ${m.description}` : ''}`;
        split(ln).forEach((l) => { ensure(14); doc.text(l, M + 12, y); y += 14; });
      });

      // == MORALITY ==
      section('Morality');
      const mor = sheet.morality || {};
      if (mor.tenets) {
        doc.setFont(FONT_BOLD).text('Tenets', M, y); y += 14;
        split(mor.tenets).forEach((ln) => { ensure(14); doc.text(ln, M + 12, y); y += 14; });
      }
      if (Array.isArray(mor.convictions) && mor.convictions.length) {
        y += 10;
        doc.setFont(FONT_BOLD).text('Convictions', M, y); y += 14;
        mor.convictions.forEach(c => {
          split(`• ${c}`).forEach(ln => { ensure(14); doc.text(ln, M + 12, y); y += 14; });
        });
      }
      if (Array.isArray(mor.touchstones) && mor.touchstones.length) {
        y += 10;
        doc.setFont(FONT_BOLD).text('Touchstones', M, y); y += 14;
        mor.touchstones.forEach(t => {
          split(`• ${t}`).forEach(ln => { ensure(14); doc.text(ln, M + 12, y); y += 14; });
        });
      }

      // == FOOTER ==
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont(FONT_REGULAR).setFontSize(9).setTextColor(COLOR_LIGHT);
        doc.setDrawColor(COLOR_LIGHT).setLineWidth(0.5).line(M, pageH - M + 10, pageW - M, pageH - M + 10);
        doc.text(`Character ${id} | ${name}`, M, pageH - M + 22);
        doc.text(`Page ${i} of ${pageCount}`, pageW - M - 50, pageH - M + 22);
        doc.text(`Generated ${new Date().toLocaleString()}`, pageW / 2, pageH - M + 22, { align: 'center' });
      }

      // --- 6. SAVE THE PDF ---
      doc.save(`${(name || 'character').replace(/\s+/g, '_')}-${id}-sheet.pdf`);

    } catch (e) {
      console.error('Client PDF generation failed', e);
      alert('Could not generate the PDF in the browser. Check console for details.');
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

  // ========= Characters: Delete =========
  async function deleteCharacter(id) {
    setErr(''); setMsg('');
    try {
      await api.delete(`/admin/characters/${id}`);
      setMsg(`Character #${id} deleted`);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to delete character');
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

  // ========= NPCs (Admin) =========
  async function deleteNPC(id) {
    setErr(''); setMsg('');
    try {
      await api.delete(`/admin/npcs/${id}`);
      setMsg(`NPC #${id} deleted`);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to delete NPC');
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
          <TabButton active={tab==='npcs'} onClick={()=>setTab('npcs')}>NPCs</TabButton>
          <TabButton active={tab==='chat'} onClick={()=>setTab('chat')}>Chat Logs</TabButton>
          <button className={`${styles.btn} ${styles.btnGhost} ${styles.rowEnd}`} onClick={load}>Reload</button>
        </div>

        {tab === 'users' && <UsersTab users={users} onSave={saveUser} />}
        {tab === 'characters' && (
          <CharactersTab
            users={users}
            onSave={saveCharacter}
            onDelete={deleteCharacter}
            onGeneratePDF={handleGeneratePDF}
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
        {tab === 'downtimes' && (
          <DowntimesTab
            rows={downtimes}
            onSave={saveDowntime}
          />
        )}
        {tab === 'xp' && <XPTools users={users} onGrant={grantXP} />}
        {tab === 'npcs' && (
          <NPCsTab
            npcs={npcs}
            onReload={load}
            onDelete={deleteNPC}
          />
        )}
        {tab === 'chat' && <ChatLogsTab messages={allMessages} />}
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
              <option value="courtuser">courtuser</option>
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

function CharactersTab({ users, onSave, onDelete, onGeneratePDF }) {
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
          <div className={styles.row} style={{ marginTop:8, gap: 8 }}>
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
            
            {/* --- NEW BUTTON --- */}
            <button
              className={styles.btn}
              onClick={() => onGeneratePDF(c)}
            >
              Download PDF
            </button>


                        <button
              className={styles.btn}
              style={{ background: '#b91c1c', color: '#fff' }} // danger style
              onClick={() => {
                const confirmText = window.prompt(
                  `Type DELETE to permanently remove character "${c.name}" (#${c.id}). This cannot be undone.`
                );
                if (confirmText !== 'DELETE') return;
                onDelete(c.id);
              }}
            >
              Delete Character
            </button>

            {/* --- END NEW BUTTON --- */}

          </div>
          <div className={styles.subtle} style={{ marginTop:6 }}>
            Saving uses <code className={styles.kbd}>PATCH /admin/characters/:id</code>.
            PDF generation requires <code className={styles.kbd}>jspdf</code> and <code className={styles.kbd}>jspdf-autotable</code>.
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

/* Small editor used above */
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

/* ==================== CHAT LOGS (ADMIN) - FIXED & ORGANIZED ==================== */

function ChatLogsTab({ messages }) {
    const [filter, setFilter] = useState('');
    // State for sorting: default to sorting by created_at in descending order
    const [sortColumn, setSortColumn] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
    const [groupByUser, setGroupByUser] = useState(false); // New state for grouping

    // More concise timestamp format: M/D HH:MM (e.g., 10/17 02:05)
    const formatTimestamp = (ts) => {
        if (!ts) return '—';
        return new Date(ts).toLocaleString('en-US', {
            month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
            hour12: false // Use 24-hour format
        });
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(column);
            
            // Set default direction based on column type
            if (column === 'created_at') {
                 setSortDirection('desc');
            } else {
                 setSortDirection('asc');
            }
        }
    };
    
    const SortArrow = ({ column }) => {
        if (sortColumn !== column) return null;
        return <span style={{ marginLeft: '4px', verticalAlign: 'middle' }}>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>;
    };


    const processedMessages = useMemo(() => {
        // Step 1: Filter messages
        const q = filter.trim().toLowerCase();
        let arr = messages.filter(msg => 
            (msg.body || '').toLowerCase().includes(q) ||
            (msg.sender_name || '').toLowerCase().includes(q) ||
            (msg.recipient_name || '').toLowerCase().includes(q)
        );

        // Step 2: Apply sorting (only applied in non-grouped view)
        if (!groupByUser) {
            arr.sort((a, b) => {
                let valA, valB;

                if (sortColumn === 'created_at') {
                    valA = new Date(a.created_at).getTime();
                    valB = new Date(b.created_at).getTime();
                } else if (sortColumn === 'sender_name') {
                    valA = (a.sender_name || '').toLowerCase();
                    valB = (b.sender_name || '').toLowerCase();
                } else if (sortColumn === 'recipient_name') {
                    valA = (a.recipient_name || '').toLowerCase();
                    valB = (b.recipient_name || '').toLowerCase();
                } else {
                    // Fallback to timestamp sort
                    valA = new Date(a.created_at).getTime();
                    valB = new Date(b.created_at).getTime();
                }
                
                // Handle number/date comparison
                if (typeof valA === 'number') {
                    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                }
                
                // Handle string comparison
                if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        // Step 3: Grouping logic (only if groupByUser is true)
        if (groupByUser) {
            const conversations = {};
            
            arr.forEach(msg => {
                // Create a canonical ID for the conversation pair (ensures A-B is the same as B-A)
                const participants = [msg.sender_id, msg.recipient_id].sort();
                const conversationKey = participants.join('-');
                
                if (!conversations[conversationKey]) {
                    conversations[conversationKey] = {
                        key: conversationKey,
                        users: [msg.sender_name, msg.recipient_name].sort().join(' & '),
                        messages: [],
                        latest_timestamp: msg.created_at
                    };
                }
                conversations[conversationKey].messages.push(msg);
                // Update the latest message time for sorting groups
                if (new Date(msg.created_at) > new Date(conversations[conversationKey].latest_timestamp)) {
                    conversations[conversationKey].latest_timestamp = msg.created_at;
                }
            });

            // Convert groups back to an array and sort by latest timestamp (desc)
            const groupedArray = Object.values(conversations);
            groupedArray.sort((a, b) => {
                const dateA = new Date(a.latest_timestamp).getTime();
                const dateB = new Date(b.latest_timestamp).getTime();
                return dateB - dateA; // Always newest groups first
            });

            // Ensure messages within the group are sorted by time (asc)
            groupedArray.forEach(group => {
                group.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });

            return groupedArray;
        }

        return arr; // Return flat array if not grouping
    }, [messages, filter, sortColumn, sortDirection, groupByUser]);

    // Component to render a single message row (used in both flat and grouped view)
    const MessageRow = ({ msg }) => (
        <tr key={msg.id} className={groupByUser ? styles.groupedRow : ''}> {/* Added groupedRow style for visual nesting */}
            <td>{msg.id}</td>
            <td>{formatTimestamp(msg.created_at)}</td>
            <td>{msg.sender_name}</td>
            <td>{msg.recipient_name}</td>
            <td className={styles.messageCell} title={msg.body}>{msg.body}</td>
        </tr>
    );

    return (
        <div className="stack12">
            <h3>Chat Logs</h3>
            <div className={styles.sideHeader} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input
                    className={styles.inputSearch}
                    placeholder="Search messages by sender, recipient, or content..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
                
                <button 
                    type="button" 
                    className={styles.groupToggle} 
                    onClick={() => setGroupByUser(prev => !prev)}
                >
                    {groupByUser ? 'Ungroup Messages' : 'Group by User'}
                </button>
            </div>
            
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        {/* Render standard header only in non-grouped mode */}
                        {!groupByUser && (
                            <tr>
                                <th>ID</th>
                                <th>
                                    <button
                                        className={styles.sortableHeader}
                                        onClick={() => handleSort('created_at')}
                                        type="button"
                                    >
                                        Timestamp <SortArrow column="created_at" />
                                    </button>
                                </th>
                                <th>
                                    <button
                                        className={styles.sortableHeader}
                                        onClick={() => handleSort('sender_name')}
                                        type="button"
                                    >
                                        From <SortArrow column="sender_name" />
                                    </button>
                                </th>
                                <th>
                                    <button
                                        className={styles.sortableHeader}
                                        onClick={() => handleSort('recipient_name')}
                                        type="button"
                                    >
                                        To <SortArrow column="recipient_name" />
                                    </button>
                                </th>
                                <th>Message</th>
                            </tr>
                        )}
                        {/* Grouped header is hidden; grouping uses special rows */}
                    </thead>
                    <tbody>
                        {/* --- Render UNGROUPED list (Error fix: use processedMessages) --- */}
                        {!groupByUser && processedMessages.map(msg => (
                            <MessageRow key={msg.id} msg={msg} />
                        ))}
                        
                        {/* --- Render GROUPED list --- */}
                        {groupByUser && processedMessages.map(group => (
                            <React.Fragment key={group.key}>
                                {/* Conversation Header Row */}
                                <tr className={styles.groupHeader}>
                                    <td colSpan="5">
                                        Conversation: 
                                        <strong>{group.users}</strong> 
                                        <span className={styles.latestTime}>
                                            (Last Message: {formatTimestamp(group.latest_timestamp)})
                                        </span>
                                    </td>
                                </tr>
                                {/* Messages within the group */}
                                {group.messages.map(msg => (
                                    <MessageRow key={msg.id} msg={msg} />
                                ))}
                            </React.Fragment>
                        ))}

                        {/* No results message */}
                        {((!groupByUser && !processedMessages.length) || (groupByUser && !processedMessages.length)) && (
                            <tr>
                                <td colSpan="5" className={styles.subtle}>No messages found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


/* ==================== NPCs (ADMIN) ==================== */

function NPCsTab({ npcs, onReload, onDelete }) {
  const [mode, setMode] = useState('list'); // list | create

  return (
    <div className="stack12">
      <h3>NPCs</h3>

      {mode === 'list' && (
        <>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={()=>setMode('create')}>+ New NPC</button>
          <table className={styles.table} style={{ marginTop:12 }}>
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Clan</th><th>XP</th><th>Created</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {npcs.map(n => (
                <tr key={n.id}>
                  <td>{n.id}</td>
                  <td>{n.name}</td>
                  <td>{n.clan}</td>
                  <td>{n.xp}</td>
                  <td>{new Date(n.created_at).toLocaleString()}</td>
                  <td>
                    <Link className={styles.btn} to={`/admin/npcs/${n.id}`}>View</Link>
                    <button className={styles.btn} onClick={()=>onDelete(n.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!npcs.length && (
                <tr><td colSpan="6" className={styles.subtle}>No NPCs yet.</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {mode === 'create' && (
        <div className={styles.card} style={{ marginTop:12 }}>
          <h4>Create NPC</h4>
          <CharacterSetup
            forNPC
            onDone={async ()=>{ await onReload(); setMode('list'); }}
          />
          <div style={{ marginTop:8 }}>
            <button className={styles.btn} onClick={()=>setMode('list')}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}