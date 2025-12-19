// src/pages/Admin.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import styles from '../styles/Admin.module.css';
import 'leaflet/dist/leaflet.css';

// Core Components (already exist, unchanged)
import CharacterSetup from './CharacterSetup';
import CharacterEditor from './CharacterEditor.jsx';
import AdminLogs from '../components/admin/AdminLogs.jsx';
import ChatStatsTab from '../components/admin/ChatStatsTab.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

// Tab Components (Newly broken out)
import AdminUsersTab from '../components/admin/AdminUsersTab.jsx';
import AdminCharactersTab from '../components/admin/AdminCharactersTab.jsx';
import AdminClaimsTab from '../components/admin/AdminClaimsTab.jsx';
import AdminDowntimesTab from '../components/admin/AdminDowntimesTab.jsx';
import AdminXPTab from '../components/admin/AdminXPTab.jsx';
import AdminNPCsTab from '../components/admin/AdminNPCsTab.jsx';
import AdminChatLogsTab from '../components/admin/AdminChatLogsTab.jsx';
import AdminDiceLogsTab from '../components/admin/AdminDiceLogsTab.jsx'; 
import AdminDiscordTab from '../components/admin/AdminDiscordTab.jsx'; // <-- Added Import


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
  const [tab, setTab] = useState('users'); // users | characters | claims | downtimes | xp | npcs | chat | stats | dice | discord | logs
  const [loading, setLoading] = useState(false);

  // All data state lives here
  const [users, setUsers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [charIndex, setCharIndex] = useState({});
  const [downtimes, setDowntimes] = useState([]);
  const [npcs, setNPCs] = useState([]);
  const [allNpcMessages, setAllNpcMessages] = useState([]); // Used by stats
  const [allMessages, setAllMessages] = useState([]); // Used by chat + stats
  
  // Modal state
  const [editorTarget, setEditorTarget] = useState(null); 

  // Feedback state
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Central data loader
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
      } catch (e) { console.error("Failed to load claims", e); }

      // Downtimes (admin view)
      try {
        const dts = await api.get('/admin/downtimes');
        setDowntimes(dts.data.downtimes || []);
      } catch (e) { console.error("Failed to load downtimes", e); }

      // NPCs
      try {
        const np = await api.get('/admin/npcs');
        setNPCs(np.data.npcs || []);
      } catch (e) { console.error("Failed to load NPCs", e); }

      // All chat messages (for admin)
      try {
          const msgs = await api.get('/admin/chat/all');
          setAllMessages(msgs.data.messages || []);
      } catch (e) { console.error("Failed to load all messages", e); }

      // TODO: Load allNpcMessages if ChatStatsTab needs it
      // try {
      //   const npcMsgs = await api.get('/admin/chat/all-npc');
      //   setAllNpcMessages(npcMsgs.data.messages || []);
      // } catch (e) { console.error("Failed to load all NPC messages", e); }

    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load primary admin data');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // ========= API FUNCTIONS (passed as props) =========

  // --- Users ---
  async function saveUser(u) {
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/users/${u.id}`, {
        display_name: u.display_name,
        email: u.email,
        role: u.role,
        discord_id: u.discord_id
      });
      setMsg(`Saved user #${u.id}`);
      load(); // Reload to reflect changes
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save user.');
    }
  }

  // --- Characters ---
  async function saveCharacter(c) {
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/characters/${c.id}`, {
        name: c.name,
        clan: c.clan,
        sheet: c.sheet
      });
      setMsg(`Saved character #${c.id}`);
      load(); // Reload
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save character.');
    }
  }

  async function grantXP(character_id, delta) {
    if (!delta) return;
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/characters/${character_id}/xp`, { delta: Number(delta) });
      setMsg(`XP adjusted by ${delta} for character #${character_id}`);
      load(); // Reload
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to adjust XP');
    }
  }

  async function deleteCharacter(id) {
    setErr(''); setMsg('');
    if (window.prompt(`Type DELETE to permanently remove character #${id}. This cannot be undone.`) !== 'DELETE') return;
    
    try {
      await api.delete(`/admin/characters/${id}`);
      setMsg(`Character #${id} deleted`);
      load(); // Reload
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to delete character');
    }
  }

  async function handleGeneratePDF(character) {
    // This logic is complex and client-side, so we keep it here.
    // NOTE: This function still requires you to provide the Base64 font data.
    try {
        const { jsPDF } = await import('jspdf');

        // FONT DATA (PASTE YOUR BASE64 STRINGS HERE)
        const NotoSansRegular_Base64 = "..."; // <--- PASTE NotoSans-Regular.ttf BASE64 HERE
        const NotoSansBold_Base64 = "...";   // <--- PASTE NotoSans-Bold.ttf BASE64 HERE

        if (NotoSansRegular_Base64.length < 50 || NotoSansBold_Base64.length < 50) {
            alert("PDF Generation Error: Font data is missing from Admin.jsx. Please ask the developer to add the Base64 font strings.");
            console.error("PDF Generation Error: Font data missing.");
            return;
        }

        const FONT_REGULAR = 'NotoSans';
        const FONT_BOLD = 'NotoSans-Bold';
        const FALLBACK_FONT = 'Helvetica';

        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const M = 36;
        const usableW = pageW - M * 2;
        let y = M;

        const COLOR_RED = '#8a0303';
        const COLOR_DARK = '#333333';
        const COLOR_LIGHT = '#aaaaaa';
        const COLOR_FILL = '#8a0303';
        const DOT_SIZE = 6;
        const DOT_GAP = 4;
        const LINE_HEIGHT = 14;

        let currentFontFamily = FALLBACK_FONT;

        // Try to load custom fonts
        try {
            doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular_Base64);
            doc.addFont('NotoSans-Regular.ttf', FONT_REGULAR, 'normal');
            doc.addFileToVFS('NotoSans-Bold.ttf', NotoSansBold_Base64);
            doc.addFont('NotoSans-Bold.ttf', FONT_BOLD, 'normal');
            currentFontFamily = FONT_REGULAR;
            doc.setFont(currentFontFamily, 'normal');
        } catch (e) {
            console.error("Custom Noto Sans font loading failed.", e);
            doc.setFont(FALLBACK_FONT, 'normal');
        }

        const getFont = (style) => {
            if (currentFontFamily === FALLBACK_FONT) {
                return { family: FALLBACK_FONT, style: style };
            }
            return { 
                family: style === 'bold' ? FONT_BOLD : FONT_REGULAR, 
                style: 'normal'
            };
        };

        const ensure = (extraH = LINE_HEIGHT) => {
            if (y + extraH > pageH - M) {
                doc.addPage();
                y = M;
            }
        };

        const split = (t, w = usableW) => doc.splitTextToSize(String(t ?? ''), w);

        const section = (title) => {
            ensure(30);
            y += 10;
            const bold = getFont('bold');
            const regular = getFont('normal');
            doc.setFont(bold.family, bold.style).setFontSize(14).setTextColor(COLOR_RED);
            doc.text(title.toUpperCase(), M, y);
            y += 6;
            doc.setDrawColor(COLOR_RED).setLineWidth(1).line(M, y, M + usableW, y);
            y += 20;
            doc.setFont(regular.family, regular.style).setFontSize(10).setTextColor(COLOR_DARK);
        };

        const drawDots = (label, value, max = 5, xStart = M, labelWidth = 120) => {
            ensure(DOT_SIZE + DOT_GAP + 6);
            const val = Number(value) || 0;
            const maxVal = Number(max) || 5;
            const x = xStart + labelWidth;
            const regular = getFont('normal');
            doc.setFont(regular.family, regular.style).setFontSize(10).setTextColor(COLOR_DARK);
            const labelLines = split(label, labelWidth);
            doc.text(labelLines[0], xStart, y + DOT_SIZE - 1); 
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

        const drawTracker = (label, value, max = 10, xStart = M, boxCount = 10, labelSpace = 60) => {
            ensure(22);
            const val = Number(value) || 0;
            const BOX_SIZE = 10;
            const BOX_GAP = 3;
            const bold = getFont('bold');
            doc.setFont(bold.family, bold.style).setFontSize(10).setTextColor(COLOR_DARK);
            doc.text(label.toUpperCase(), xStart, y + BOX_SIZE - 1);
            doc.setLineWidth(1).setDrawColor(COLOR_DARK);
            for (let i = 1; i <= boxCount; i++) {
                const boxX = xStart + labelSpace + (i * (BOX_SIZE + BOX_GAP));
                const isCurrent = i <= val;
                doc.setFillColor(isCurrent ? COLOR_FILL : '#ffffff');
                doc.rect(boxX, y, BOX_SIZE, BOX_SIZE, 'FD');
            }
            y += BOX_SIZE + BOX_GAP + 6;
        };

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

        const name = character.name || sheet.name || 'Unnamed';
        const attrs = sheet.attributes || {};
        const getAttr = (k) => Number(attrs[k] ?? 0);
        const healthMax = getAttr('Stamina') + 3;
        const willMax = getAttr('Composure') + getAttr('Resolve');
        const hunger = sheet.hunger || 0;
        const id = character.id ?? '—';

        const bold = getFont('bold');
        const regular = getFont('normal');

        // == HEADER ==
        doc.setFont(bold.family, bold.style).setFontSize(24).setTextColor(COLOR_RED);
        doc.text(name.toUpperCase(), M, y);
        y += 24;
        doc.setFont(regular.family, regular.style).setFontSize(11).setTextColor(COLOR_DARK);
        const colW = usableW / 3;
        doc.text(`Clan: ${character.clan || sheet.clan || '—'}`, M, y);
        doc.text(`Predator: ${sheet.predatorType || '—'}`, M + colW, y);
        doc.text(`Sire: ${sheet.sire || '—'}`, M + colW * 2, y);
        y += 16;
        doc.text(`Ambition: ${sheet.ambition || '—'}`, M, y);
        doc.text(`Desire: ${sheet.desire || '—'}`, M + colW, y);
        y += 14;
        doc.setDrawColor(COLOR_LIGHT).setLineWidth(0.5).line(M, y, M + usableW, y);
        y += 10;

        // == TRACKERS (Two Columns) ==
        const trackerColW = usableW / 2;
        const trackerYStart = y;
        let yCol1End, yCol2End;
        drawTracker('Health', sheet.health_current ?? healthMax, healthMax, M, healthMax, 60);
        drawTracker('Humanity', sheet.humanity ?? 7, 10, M, 10, 60);
        yCol1End = y;
        y = trackerYStart; 
        drawTracker('Willpower', sheet.willpower_current ?? willMax, willMax, M + trackerColW, willMax, 60);
        drawTracker('Hunger', hunger, 5, M + trackerColW, 5, 60);
        yCol2End = y;
        y = Math.max(yCol1End, yCol2End);
        y += 10;

        // == ATTRIBUTES (3 LINES, 3 COLUMNS) ==
        section('Attributes');
        const ATTR_COL_W = usableW / 3;
        const ATTR_DOT_LABEL_W = 70; 
        const ATTR_LIST = [
            { type: 'Physical', keys: ['Strength', 'Dexterity', 'Stamina'] },
            { type: 'Social', keys: ['Charisma', 'Manipulation', 'Composure'] },
            { type: 'Mental', keys: ['Intelligence', 'Wits', 'Resolve'] },
        ];
        let yAttrGroup = y;
        ATTR_LIST.forEach((group, index) => {
            const xGroupStart = M + (index * ATTR_COL_W);
            doc.setFont(regular.family, regular.style).setFontSize(9).setTextColor(COLOR_LIGHT).text(group.type, xGroupStart, yAttrGroup - 8);
            let yCursor = yAttrGroup;
            group.keys.forEach(k => {
                y = yCursor; 
                drawDots(k, getAttr(k), 5, xGroupStart, ATTR_DOT_LABEL_W);
                yCursor = y;
            });
            yAttrGroup = Math.max(yAttrGroup, yCursor);
        });
        y = yAttrGroup;
        y += 10; 

        // == SKILLS (3 LINES, 3 COLUMNS) ==
        section('Skills');
        const SKILL_COL_W = usableW / 3;
        const SKILL_DOT_LABEL_W = 70;
        const skills = sheet.skills || {};
        const getSkill = (k) => Number(skills[k]?.dots ?? 0);
        const getSpecs = (k) => (Array.isArray(skills[k]?.specialties) ? skills[k].specialties : []).join(', ');
        const SKILL_GROUPS = [
            { type: 'Physical', keys: ['Athletics', 'Brawl', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival'] },
            { type: 'Social', keys: ['Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge'] },
            { type: 'Mental', keys: ['Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology'] },
        ];
        let ySkillGroup = y;
        SKILL_GROUPS.forEach((group, index) => {
            const xGroupStart = M + (index * SKILL_COL_W);
            doc.setFont(regular.family, regular.style).setFontSize(9).setTextColor(COLOR_LIGHT).text(group.type, xGroupStart, ySkillGroup - 8);
            let yCursor = ySkillGroup;
            group.keys.forEach(k => {
                y = yCursor; 
                const specs = getSpecs(k);
                const label = specs ? `${k} (${specs})` : k;
                drawDots(label, getSkill(k), 5, xGroupStart, SKILL_DOT_LABEL_W);
                yCursor = y;
            });
            ySkillGroup = Math.max(ySkillGroup, yCursor);
        });
        y = ySkillGroup;
        y += 10; 

        // == DISCIPLINES & POWERS (Full Width) ==
        section('Disciplines & Powers');
        const disc = sheet.disciplines || {};
        const powers = sheet.disciplinePowers || {};
        const discKeys = Object.keys(disc).sort();
        doc.setFont(regular.family, regular.style).setFontSize(10).setTextColor(COLOR_DARK);
        if (!discKeys.length) {
            doc.text('No disciplines defined.', M, y); y += LINE_HEIGHT;
        } else {
            const DISC_LABEL_WIDTH = 100;
            discKeys.forEach((k) => {
                ensure(30);
                drawDots(k, disc[k], 5, M, DISC_LABEL_WIDTH);
                const powerList = powers[k] || [];
                if (powerList.length) {
                    y -= 6;
                    powerList.forEach((p) => {
                        const ln = `• [Lvl ${p.level}] ${p.name || p.id || '—'}`;
                        const lines = split(ln, usableW - DISC_LABEL_WIDTH - 20);
                        lines.forEach((l2) => {
                            ensure(LINE_HEIGHT - 2);
                            doc.text(l2, M + DISC_LABEL_WIDTH + 20, y);
                            y += LINE_HEIGHT - 2;
                        });
                    });
                    y += 6;
                }
            });
        }

        // == ADVANTAGES (MERITS & FLAWS - Two Columns) ==
        section('Advantages (Merits & Flaws)');
        const merits = (sheet.advantages && sheet.advantages.merits) || [];
        const flaws = (sheet.advantages && sheet.advantages.flaws) || [];
        const advColW = usableW / 2;
        let yMerits = y;
        let yFlaws = y;
        // Merits (Column 1)
        y = yMerits; ensure(30); yMerits = y;
        doc.setFont(bold.family, bold.style).setFontSize(11).text('Merits', M, yMerits); yMerits += LINE_HEIGHT;
        doc.setFont(regular.family, regular.style).setFontSize(10);
        if (!merits.length) {
            doc.text('• None', M + 12, yMerits); yMerits += LINE_HEIGHT;
        }
        merits.filter(Boolean).forEach((m) => {
            const nm = m.name || m.id || '—';
            const dt = (m.dots ?? m.rating ?? '—');
            const ln = `• ${nm} (${dt} dots)${m.description ? `: ${m.description}` : ''}`;
            split(ln, advColW - 12).forEach((l) => { 
                y = yMerits; ensure(LINE_HEIGHT); yMerits = y; 
                doc.text(l, M + 12, yMerits); yMerits += LINE_HEIGHT; 
            });
        });
        // Flaws (Column 2)
        const flawsColX = M + advColW;
        y = yFlaws; ensure(30); yFlaws = y;
        doc.setFont(bold.family, bold.style).setFontSize(11).text('Flaws', flawsColX, yFlaws); yFlaws += LINE_HEIGHT;
        doc.setFont(regular.family, regular.style).setFontSize(10);
        if (!flaws.length) {
            doc.text('• None', flawsColX + 12, yFlaws); yFlaws += LINE_HEIGHT;
        }
        flaws.filter(Boolean).forEach((m) => {
            const nm = m.name || m.id || '—';
            const dt = (m.dots ?? m.rating ?? '—');
            const ln = `• ${nm} (${dt} dots)${m.description ? `: ${m.description}` : ''}`;
            split(ln, advColW - 12).forEach((l) => { 
                y = yFlaws; ensure(LINE_HEIGHT); yFlaws = y;
                doc.text(l, flawsColX + 12, yFlaws); yFlaws += LINE_HEIGHT; 
            });
        });
        y = Math.max(yMerits, yFlaws);
        y += 10;

        // == MORALITY (Two Columns) ==
        section('Morality');
        const mor = sheet.morality || {};
        if (mor.tenets) {
            doc.setFont(bold.family, bold.style).text('Tenets', M, y); y += LINE_HEIGHT;
            doc.setFont(regular.family, regular.style);
            split(mor.tenets).forEach((ln) => { ensure(LINE_HEIGHT); doc.text(ln, M + 12, y); y += LINE_HEIGHT; });
        }
        const morColW = usableW / 2;
        let yConv = y;
        let yTouch = y;
        if (Array.isArray(mor.convictions) && mor.convictions.length) {
            y = yConv; ensure(30); yConv = y;
            doc.setFont(bold.family, bold.style).text('Convictions', M, yConv); yConv += LINE_HEIGHT;
            doc.setFont(regular.family, regular.style);
            mor.convictions.forEach(c => {
                split(`• ${c}`, morColW - 12).forEach(ln => { ensure(LINE_HEIGHT); y = yConv; yConv = y; doc.text(ln, M + 12, yConv); yConv += LINE_HEIGHT; });
            });
        }
        if (Array.isArray(mor.touchstones) && mor.touchstones.length) {
            y = yTouch; ensure(30); yTouch = y;
            const touchColX = M + morColW;
            doc.setFont(bold.family, bold.style).text('Touchstones', touchColX, yTouch); yTouch += LINE_HEIGHT;
            doc.setFont(regular.family, regular.style);
            mor.touchstones.forEach(t => {
                split(`• ${t}`, morColW - 12).forEach(ln => { ensure(LINE_HEIGHT); y = yTouch; yTouch = y; doc.text(ln, touchColX + 12, yTouch); yTouch += LINE_HEIGHT; });
            });
        }
        y = Math.max(yConv, yTouch);

        // == FOOTER ==
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont(FALLBACK_FONT, 'normal').setFontSize(9).setTextColor(COLOR_LIGHT);
            doc.setDrawColor(COLOR_LIGHT).setLineWidth(0.5).line(M, pageH - M + 10, pageW - M, pageH - M + 10);
            const centerX = pageW / 2;
            const rightX = pageW - M;
            doc.text(`Character ${id} | ${name}`, M, pageH - M + 22);
            doc.text(`Generated ${new Date().toLocaleString()}`, centerX, pageH - M + 22, { align: 'center' });
            doc.text(`Page ${i} of ${pageCount}`, rightX, pageH - M + 22, { align: 'right' });
        }

        doc.save(`${(name || 'character').replace(/\s+/g, '_')}-${id}-sheet.pdf`);

    } catch (e) {
        console.error('Client PDF generation failed', e);
        alert('Could not generate the PDF in the browser. Check console for details. Ensure jsPDF is installed.');
    }
  }

  // --- Claims ---
  async function saveClaim(division, patch) {
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/domain-claims/${division}`, patch);
      setMsg(`Claim ${division} saved`);
      load(); // Reload
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save claim');
    }
  }
  async function deleteClaim(division) {
    setErr(''); setMsg('');
    try {
      await api.delete(`/admin/domain-claims/${division}`);
      setMsg(`Claim ${division} removed`);
      load(); // Reload
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to delete claim');
    }
  }

  // --- Downtimes ---
  async function saveDowntime(id, patch) {
    setErr(''); setMsg('');
    try {
      await api.patch(`/admin/downtimes/${id}`, patch);
      setMsg(`Downtime #${id} saved`);
      load(); // Reload
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save downtime');
    }
  }

  // --- NPCs ---
  async function deleteNPC(id) {
    setErr(''); setMsg('');
    if (window.prompt(`Type DELETE to permanently remove NPC #${id}. This cannot be undone.`) !== 'DELETE') return;

    try {
      await api.delete(`/admin/npcs/${id}`);
      setMsg(`NPC #${id} deleted`);
      load(); // Reload
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to delete NPC');
    }
  }

  // ========= RENDER =========
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
          <TabButton active={tab==='stats'} onClick={()=>setTab('stats')}>Chat Stats</TabButton>
          <TabButton active={tab==='dice'} onClick={()=>setTab('dice')}>Dice Logs</TabButton>
          <TabButton active={tab==='discord'} onClick={()=>setTab('discord')}>Discord</TabButton> {/* <-- Added Button */}
          <TabButton active={tab==='logs'} onClick={()=>setTab('logs')}>Server Logs</TabButton>
          <button className={`${styles.btn} ${styles.btnGhost} ${styles.rowEnd}`} onClick={load}>Reload</button>
        </div>

        {/* Conditional Tab Rendering */}
        {tab === 'users' && (
          <AdminUsersTab 
            users={users} 
            onSave={saveUser} 
          />
        )}
        {tab === 'characters' && (
          <AdminCharactersTab
            users={users}
            onSave={saveCharacter}
            onDelete={deleteCharacter}
            onGeneratePDF={handleGeneratePDF}
            onOpenEditor={setEditorTarget}
          />
        )}
        {tab === 'claims' && (
          <AdminClaimsTab
            claims={claims}
            characters={charIndex}
            onSave={saveClaim}
            onDelete={deleteClaim}
          />
        )}
        {tab === 'downtimes' && (
          <AdminDowntimesTab
            rows={downtimes}
            onSave={saveDowntime}
          />
        )}
        {tab === 'xp' && (
          <AdminXPTab 
            users={users} 
            onGrant={grantXP} 
          />
        )} 
        {tab === 'npcs' && (
          <AdminNPCsTab
            npcs={npcs}
            onReload={load}
            onDelete={deleteNPC}
          />
        )}
        {tab === 'chat' && (
          <AdminChatLogsTab 
            messages={allMessages} 
            charIndex={charIndex} 
          />
        )}
        {tab === 'stats' && (
          <ChatStatsTab 
            directMessages={allMessages} 
            npcMessages={allNpcMessages}
            npcs={npcs} 
            users={users} 
          />
        )}
        {tab === 'dice' && (
          <AdminDiceLogsTab />
        )}
        {/* -- Added Tab -- */}
        {tab === 'discord' && (
          <AdminDiscordTab />
        )}
        {tab === 'logs' && <AdminLogs />}

        {/* Modal remains here */}
        {editorTarget && (
         <CharacterEditor
            character={editorTarget}
            onClose={() => setEditorTarget(null)}
            onSaved={() => { setEditorTarget(null); load(); }} // Close and reload
          />
        )}
      </div>
    </div>
  );
}