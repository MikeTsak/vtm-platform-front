// src/pages/Admin.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import api from '../api';
import styles from '../styles/Admin.module.css';
import 'leaflet/dist/leaflet.css';

import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import CharacterSetup from './CharacterSetup';
import CharacterView from './CharacterView';
import CharacterEditor from './CharacterEditor.jsx';
import AdminLogs from '../components/AdminLogs.jsx';

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
  const [editorTarget, setEditorTarget] = useState(null); 

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
        // --- 0. Setup ---
        const { jsPDF } = await import('jspdf');

        // --- 1. FONT SETUP: CRITICAL FOR GREEK/LATIN SUPPORT ---
        // 🚨 IMPORTANT: You MUST generate and paste the Base64-encoded TTF strings here.
        // Use a font that supports both Greek and Latin, like Noto Sans, Roboto, or Arial Unicode MS.
        // Note: For Greek/Unicode support, 'Arial' is often too limited; Noto Sans is preferred.
        // Assuming Noto Sans is used as in the original code.
        const NotoSansRegular_Base64 = "..."; // <--- PASTE NotoSans-Regular.ttf BASE64 HERE (Required for Greek)
        const NotoSansBold_Base64 = "...";    // <--- PASTE NotoSans-Bold.ttf BASE64 HERE (Required for Greek)

        // Use distinct names for the registered font families
        const FONT_REGULAR = 'NotoSans';
        const FONT_BOLD = 'NotoSans-Bold';
        const FALLBACK_FONT = 'Helvetica'; // Basic font if custom load fails

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
        const COLOR_FILL = '#8a0303'; // Red fill for dots/boxes
        const DOT_SIZE = 6;
        const DOT_GAP = 4;
        const LINE_HEIGHT = 14;

        let currentFontFamily = FALLBACK_FONT; // Renamed for clarity

        // Force Font Loading
        if (NotoSansRegular_Base64.length > 50 && NotoSansBold_Base64.length > 50) {
            try {
                // Register both custom fonts. Note: The style is set to 'normal' for both
                // because we will switch by the font family name (FONT_REGULAR/FONT_BOLD).
                doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular_Base64);
                doc.addFont('NotoSans-Regular.ttf', FONT_REGULAR, 'normal');
                doc.addFileToVFS('NotoSans-Bold.ttf', NotoSansBold_Base64);
                doc.addFont('NotoSans-Bold.ttf', FONT_BOLD, 'normal');
                
                currentFontFamily = FONT_REGULAR;
                doc.setFont(currentFontFamily, 'normal'); // Set the regular font as default
            } catch (e) {
                console.error("Custom Noto Sans font loading failed.", e);
                doc.setFont(FALLBACK_FONT, 'normal');
            }
        } else {
            doc.setFont(FALLBACK_FONT, 'normal');
            console.warn("Noto Sans Base64 data missing or too short. Using fallback font (Helvetica). Greek characters may not display.");
        }

        // Helper function to get the correct font and style based on the global state
        const getFont = (style) => {
            if (currentFontFamily === FALLBACK_FONT) {
                // If fallback (Helvetica), rely on built-in styles
                return { family: FALLBACK_FONT, style: style };
            }
            // If custom font is loaded, explicitly choose the registered family
            return { 
                family: style === 'bold' ? FONT_BOLD : FONT_REGULAR, 
                style: 'normal' // Custom fonts are always registered with 'normal' style
            };
        };

        // --- 3. PDF HELPER FUNCTIONS (UPDATED) ---

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

            // Use explicit BOLD font family
            doc.setFont(bold.family, bold.style).setFontSize(14).setTextColor(COLOR_RED);
            doc.text(title.toUpperCase(), M, y);
            y += 6;
            doc.setDrawColor(COLOR_RED).setLineWidth(1).line(M, y, M + usableW, y);
            y += 20;
            
            // Reset to explicit REGULAR font family
            doc.setFont(regular.family, regular.style).setFontSize(10).setTextColor(COLOR_DARK);
        };

        const drawDots = (label, value, max = 5, xStart = M, labelWidth = 120) => {
            ensure(DOT_SIZE + DOT_GAP + 6);
            const val = Number(value) || 0;
            const maxVal = Number(max) || 5;
            const x = xStart + labelWidth;

            const regular = getFont('normal');

            // Use explicit REGULAR font family
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

            // Use explicit BOLD font family
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

        const name = character.name || sheet.name || 'Unnamed';
        const attrs = sheet.attributes || {};
        const getAttr = (k) => Number(attrs[k] ?? 0);
        const healthMax = getAttr('Stamina') + 3;
        const willMax = getAttr('Composure') + getAttr('Resolve');
        const hunger = sheet.hunger || 0;
        const id = character.id ?? '—';

        // --- 5. BUILD THE PDF DOCUMENT ---
        
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
        // drawTracker uses the fixed function above, so this block is fine.
        const trackerColW = usableW / 2;
        const trackerYStart = y;
        let yCol1End, yCol2End;

        // Column 1
        drawTracker('Health', sheet.health_current ?? healthMax, healthMax, M, healthMax, 60);
        drawTracker('Humanity', sheet.humanity ?? 7, 10, M, 10, 60);
        yCol1End = y;
        
        // Reset y to draw in the second column
        y = trackerYStart; 

        // Column 2
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
            
            // Use explicit regular font for light gray text (Group Header)
            doc.setFont(regular.family, regular.style).setFontSize(9).setTextColor(COLOR_LIGHT).text(group.type, xGroupStart, yAttrGroup - 8);
            
            let yCursor = yAttrGroup;
            group.keys.forEach(k => {
                y = yCursor; 
                drawDots(k, getAttr(k), 5, xGroupStart, ATTR_DOT_LABEL_W); // drawDots uses the fixed font selection
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
            
            // Use explicit regular font for light gray text (Group Header)
            doc.setFont(regular.family, regular.style).setFontSize(9).setTextColor(COLOR_LIGHT).text(group.type, xGroupStart, ySkillGroup - 8);
            
            let yCursor = ySkillGroup;
            group.keys.forEach(k => {
                y = yCursor; 
                
                const specs = getSpecs(k);
                const label = specs ? `${k} (${specs})` : k;
                
                drawDots(label, getSkill(k), 5, xGroupStart, SKILL_DOT_LABEL_W); // drawDots uses the fixed font selection
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
        
        // Ensure regular font is active before text starts
        doc.setFont(regular.family, regular.style).setFontSize(10).setTextColor(COLOR_DARK);

        if (!discKeys.length) {
            doc.text('No disciplines defined.', M, y); y += LINE_HEIGHT;
        } else {
            const DISC_LABEL_WIDTH = 100;
            discKeys.forEach((k) => {
                ensure(30);
                drawDots(k, disc[k], 5, M, DISC_LABEL_WIDTH); // drawDots uses the fixed font selection
                
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
        doc.setFont(regular.family, regular.style).setFontSize(10); // Reset to regular for content
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
        doc.setFont(regular.family, regular.style).setFontSize(10); // Reset to regular for content
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
        
        // Tenets (Full Width)
        if (mor.tenets) {
            doc.setFont(bold.family, bold.style).text('Tenets', M, y); y += LINE_HEIGHT;
            doc.setFont(regular.family, regular.style);
            split(mor.tenets).forEach((ln) => { ensure(LINE_HEIGHT); doc.text(ln, M + 12, y); y += LINE_HEIGHT; });
        }
        
        const morColW = usableW / 2;
        let yConv = y;
        let yTouch = y;
        
        // Convictions (Column 1)
        if (Array.isArray(mor.convictions) && mor.convictions.length) {
            y = yConv; ensure(30); yConv = y;
            doc.setFont(bold.family, bold.style).text('Convictions', M, yConv); yConv += LINE_HEIGHT;
            doc.setFont(regular.family, regular.style);
            mor.convictions.forEach(c => {
                split(`• ${c}`, morColW - 12).forEach(ln => { ensure(LINE_HEIGHT); y = yConv; yConv = y; doc.text(ln, M + 12, yConv); yConv += LINE_HEIGHT; });
            });
        }

        // Touchstones (Column 2)
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

        // == FOOTER (Loop through pages to add footer) ==
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            // Use the fallback font for the footer for maximum robustness
            doc.setFont(FALLBACK_FONT, 'normal').setFontSize(9).setTextColor(COLOR_LIGHT);
            doc.setDrawColor(COLOR_LIGHT).setLineWidth(0.5).line(M, pageH - M + 10, pageW - M, pageH - M + 10);
            
            const centerX = pageW / 2;
            const rightX = pageW - M;
            
            doc.text(`Character ${id} | ${name}`, M, pageH - M + 22);
            doc.text(`Generated ${new Date().toLocaleString()}`, centerX, pageH - M + 22, { align: 'center' });
            doc.text(`Page ${i} of ${pageCount}`, rightX, pageH - M + 22, { align: 'right' });
        }

        // --- 6. SAVE THE PDF ---
        doc.save(`${(name || 'character').replace(/\s+/g, '_')}-${id}-sheet.pdf`);

    } catch (e) {
        console.error('Client PDF generation failed', e);
        alert('Could not generate the PDF in the browser. Check console for details. Ensure jsPDF is installed and the Noto Sans Base64 data is correct.');
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
          <TabButton active={tab==='logs'} onClick={()=>setTab('logs')}>Logs</TabButton>
          <button className={`${styles.btn} ${styles.btnGhost} ${styles.rowEnd}`} onClick={load}>Reload</button>
        </div>

        {tab === 'users' && <UsersTab users={users} onSave={saveUser} />}
        {tab==='logs' && <AdminLogs />}
        {tab === 'characters' && (
          <CharactersTab
            users={users}
            onSave={saveCharacter}
            onDelete={deleteCharacter}
            onGeneratePDF={handleGeneratePDF}
            onOpenEditor={c => setEditorTarget(c)}
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
        {editorTarget && (
         <CharacterEditor
            character={editorTarget}
            onClose={() => setEditorTarget(null)}
            onSaved={load}
          />
        )}
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

function CharactersTab({ users, onSave, onDelete, onGeneratePDF, onOpenEditor }) {
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
            <button
              className={styles.btn}
              onClick={() => onOpenEditor(c)}
              title="Open the rich editor (with XP auto-refund/charge)"
            >
              Open Editor
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
  // ======= shared UI state =======
  const [viewMode, setViewMode] = useState('direct'); // 'direct' | 'npc'

  // ======= DIRECT (existing) =======
  const [filter, setFilter] = useState('');
  const [sortColumn, setSortColumn] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [groupByUser, setGroupByUser] = useState(false);
  const [collapsed, setCollapsed] = useState({}); // groupKey -> boolean

  // small debounce
  const useDebouncedValue = (value, ms = 200) => {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
    return v;
  };
  const debouncedFilter = useDebouncedValue(filter, 200);

  const tokenize = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
  const tokens = useMemo(() => tokenize(debouncedFilter), [debouncedFilter]);

  const formatTimestamp = (ts) =>
    ts ? new Date(ts).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

  const stableSort = (arr, cmp) => arr.map((v, i) => [v, i]).sort((a, b) => cmp(a[0], b[0]) || a[1] - b[1]).map(x => x[0]);

  const compare = (a, b) => {
    let valA, valB;
    if (sortColumn === 'created_at') {
      valA = new Date(a.created_at).getTime(); valB = new Date(b.created_at).getTime();
    } else if (sortColumn === 'sender_name') {
      valA = (a.sender_name || '').toLowerCase(); valB = (b.sender_name || '').toLowerCase();
    } else if (sortColumn === 'recipient_name') {
      valA = (a.recipient_name || '').toLowerCase(); valB = (b.recipient_name || '').toLowerCase();
    } else {
      valA = new Date(a.created_at).getTime(); valB = new Date(b.created_at).getTime();
    }
    if (typeof valA === 'number' && typeof valB === 'number') return sortDirection === 'asc' ? valA - valB : valB - valA;
    return sortDirection === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
  };

  const handleSort = (col) => {
    if (sortColumn === col) setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortColumn(col); setSortDirection(col === 'created_at' ? 'desc' : 'asc'); }
  };

  const processedDirect = useMemo(() => {
    const hay = (m) => `${m.body || ''}\n${m.sender_name || ''}\n${m.recipient_name || ''}`.toLowerCase();
    let base = !tokens.length ? messages : messages.filter(m => {
      const h = hay(m); return tokens.every(t => h.includes(t));
    });

    if (!groupByUser) return stableSort(base.slice(), compare);

    // group by pair (A-B == B-A)
    const groups = new Map();
    for (const msg of base) {
      const ids = [msg.sender_id, msg.recipient_id].map(Number).sort((a, b) => a - b);
      const key = ids.join('-');
      if (!groups.has(key)) {
        const names = [msg.sender_name || '', msg.recipient_name || ''].sort((a, b) => a.localeCompare(b));
        groups.set(key, { key, users: `${names[0]} & ${names[1]}`, messages: [], latest_timestamp: msg.created_at });
      }
      const g = groups.get(key);
      g.messages.push(msg);
      if (new Date(msg.created_at) > new Date(g.latest_timestamp)) g.latest_timestamp = msg.created_at;
    }

    const arr = Array.from(groups.values()).sort((a, b) =>
      new Date(b.latest_timestamp) - new Date(a.latest_timestamp)
    );
    arr.forEach(g => g.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
    return arr;
  }, [messages, tokens, groupByUser, sortColumn, sortDirection]);

  const Highlight = ({ text }) => {
    if (!tokens.length) return <>{text}</>;
    const lower = String(text || '').toLowerCase();
    let parts = [{ s: String(text || ''), l: lower, hit: false }];
    tokens.forEach(t => {
      const next = [];
      parts.forEach(p => {
        if (p.hit) return next.push(p);
        const idx = p.l.indexOf(t);
        if (idx === -1) return next.push(p);
        next.push(
          { s: p.s.slice(0, idx), l: p.l.slice(0, idx), hit: false },
          { s: p.s.slice(idx, idx + t.length), l: p.l.slice(idx, idx + t.length), hit: true },
          { s: p.s.slice(idx + t.length), l: p.l.slice(idx + t.length), hit: false },
        );
      });
      parts = next;
    });
    return (
      <>
        {parts.map((p, i) => p.hit ? <mark key={i} className={styles.hl}>{p.s}</mark> : <span key={i}>{p.s}</span>)}
      </>
    );
  };

  const SortArrow = ({ column }) => sortColumn === column ? (
    <span className={styles.sortArrow}>{sortDirection === 'asc' ? '▲' : '▼'}</span>
  ) : null;

  // ======= NPC CHATS (table-based) =======
  const [npcList, setNpcList] = useState([]);
  const [npcListLoading, setNpcListLoading] = useState(false);
  const [npcListError, setNpcListError] = useState('');
  const [npcSearch, setNpcSearch] = useState('');
  const [selectedNpcId, setSelectedNpcId] = useState(null);

  const [convos, setConvos] = useState([]); // rows: {user_id, char_name, display_name, last_message_at}
  const [convosLoading, setConvosLoading] = useState(false);
  const [convosError, setConvosError] = useState('');
  const [convosSearch, setConvosSearch] = useState('');
  const [convosSort, setConvosSort] = useState({ col: 'last_message_at', dir: 'desc' }); // 'char', 'player', 'last_message_at'

  const [thread, setThread] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // load npc list when switching to npc mode
  useEffect(() => {
    if (viewMode !== 'npc') return;
    let cancelled = false;
    const load = async () => {
      setNpcListLoading(true); setNpcListError('');
      try {
        let res;
        try { res = await api.get('/admin/npcs'); }
        catch { res = await api.get('/chat/npcs'); }
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : (res.data?.npcs || []);
        setNpcList(list.map(n => ({ id: n.id, name: n.name, clan: n.clan })));
      } catch {
        if (!cancelled) setNpcListError('Failed to load NPCs.');
      } finally {
        if (!cancelled) setNpcListLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [viewMode]);

  // load conversations for selected NPC
  useEffect(() => {
    if (viewMode !== 'npc' || !selectedNpcId) { setConvos([]); setSelectedUserId(null); setThread([]); return; }
    let cancelled = false;
    const loadConvos = async () => {
      setConvosLoading(true); setConvosError('');
      try {
        let res;
        try {
          res = await api.get('/admin/chat/npc/conversations', { params: { npc_id: selectedNpcId } });
        } catch {
          res = await api.get(`/admin/chat/npc-conversations/${selectedNpcId}`);
        }
        if (cancelled) return;
        const rows = (res.data?.conversations || []).map(r => ({
          user_id: r.user_id,
          char_name: r.char_name || '',
          display_name: r.display_name || '',
          last_message_at: r.last_message_at || null,
        }));
        setConvos(rows);
      } catch {
        if (!cancelled) { setConvosError('Failed to load conversations.'); setConvos([]); }
      } finally {
        if (!cancelled) setConvosLoading(false);
      }
    };
    loadConvos();
    return () => { cancelled = true; };
  }, [viewMode, selectedNpcId]);

  // load thread for selected conversation
  useEffect(() => {
    if (viewMode !== 'npc' || !selectedNpcId || !selectedUserId) { setThread([]); return; }
    let cancelled = false;
    const loadThread = async () => {
      setThreadLoading(true);
      try {
        let res;
        try {
          res = await api.get('/admin/chat/npc/history', { params: { npc_id: selectedNpcId, user_id: selectedUserId } });
        } catch {
          res = await api.get(`/admin/chat/npc-history/${selectedNpcId}/${selectedUserId}`);
        }
        if (cancelled) return;
        const msgs = (res.data?.messages || []).map(m => ({
          id: m.id, body: m.body, created_at: m.created_at, from: m.from_side // 'npc' | 'user'
        }));
        msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        setThread(msgs);
      } catch {
        if (!cancelled) setThread([]);
      } finally {
        if (!cancelled) setThreadLoading(false);
      }
    };
    loadThread();
    return () => { cancelled = true; };
  }, [viewMode, selectedNpcId, selectedUserId]);

  // filters/sorts
  const filteredNpcs = useMemo(() => {
    const q = npcSearch.trim().toLowerCase();
    if (!q) return npcList;
    return npcList.filter(n => (n.name || '').toLowerCase().includes(q) || (n.clan || '').toLowerCase().includes(q));
  }, [npcSearch, npcList]);

  const processedConvos = useMemo(() => {
    const q = convosSearch.trim().toLowerCase();
    let arr = !q ? convos : convos.filter(r =>
      (r.char_name || '').toLowerCase().includes(q) || (r.display_name || '').toLowerCase().includes(q)
    );
    const { col, dir } = convosSort;
    const cmp = (a, b) => {
      let va, vb;
      if (col === 'char') { va = (a.char_name || '').toLowerCase(); vb = (b.char_name || '').toLowerCase(); }
      else if (col === 'player') { va = (a.display_name || '').toLowerCase(); vb = (b.display_name || '').toLowerCase(); }
      else { va = new Date(a.last_message_at || 0).getTime(); vb = new Date(b.last_message_at || 0).getTime(); }
      if (typeof va === 'number') return dir === 'asc' ? va - vb : vb - va;
      return dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    };
    return stableSort(arr.slice(), cmp);
  }, [convos, convosSearch, convosSort]);

  const sortConvosBy = (col) => setConvosSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: col === 'last_message_at' ? 'desc' : 'asc' });

  // ======= UI =======
  return (
    <div className="stack12">
      <h3>Chat Logs</h3>

      {/* Top toolbar */}
      <div className={styles.logsToolbar}>
        {/* Left side: mode switch + search (direct mode) */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className={styles.sortBtns}>
            <button
              className={`${styles.sortableHeader} ${viewMode === 'direct' ? styles.active : ''}`}
              onClick={() => setViewMode('direct')}
              type="button"
            >
              All Messages
            </button>
            <button
              className={`${styles.sortableHeader} ${viewMode === 'npc' ? styles.active : ''}`}
              onClick={() => setViewMode('npc')}
              type="button"
            >
              NPC Chats
            </button>
          </div>

          {viewMode === 'direct' && (
            <input
              className={styles.inputSearch}
              placeholder="Search sender, recipient, or message…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ minWidth: 320 }}
            />
          )}
        </div>

        {/* Right side: controls per mode */}
        <div className={styles.toolbarRight}>
          {viewMode === 'direct' ? (
            <>
              <button
                type="button"
                className={styles.groupToggle}
                onClick={() => setGroupByUser(p => !p)}
                title={groupByUser ? 'Show flat list' : 'Group by conversation'}
              >
                {groupByUser ? 'Ungroup' : 'Group by Conversation'}
              </button>

              {!groupByUser && (
                <div className={styles.sortBtns}>
                  <button className={`${styles.sortableHeader} ${sortColumn === 'created_at' ? styles.active : ''}`} onClick={() => handleSort('created_at')}>Time <SortArrow column="created_at" /></button>
                  <button className={`${styles.sortableHeader} ${sortColumn === 'sender_name' ? styles.active : ''}`} onClick={() => handleSort('sender_name')}>From <SortArrow column="sender_name" /></button>
                  <button className={`${styles.sortableHeader} ${sortColumn === 'recipient_name' ? styles.active : ''}`} onClick={() => handleSort('recipient_name')}>To <SortArrow column="recipient_name" /></button>
                </div>
              )}

              {groupByUser && (
                <>
                  <button className={styles.btnMini} onClick={() => {
                    const all = {}; processedDirect.forEach(g => (all[g.key] = false)); setCollapsed(all);
                  }}>Expand all</button>
                  <button className={styles.btnMini} onClick={() => {
                    const all = {}; processedDirect.forEach(g => (all[g.key] = true)); setCollapsed(all);
                  }}>Collapse all</button>
                </>
              )}
            </>
          ) : (
            // NPC mode right side: NPC picker & convos search
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className={styles.inputSearch}
                placeholder="Search NPCs…"
                value={npcSearch}
                onChange={(e) => setNpcSearch(e.target.value)}
                style={{ minWidth: 220 }}
              />
              <select
                className={styles.groupToggle}
                value={selectedNpcId || ''}
                onChange={(e) => { setSelectedNpcId(e.target.value ? Number(e.target.value) : null); }}
                title="Choose NPC"
              >
                <option value="">{npcListLoading ? 'Loading NPCs…' : (npcListError || 'Select NPC')}</option>
                {filteredNpcs.map(n => (
                  <option key={n.id} value={n.id}>{n.name}{n.clan ? ` (${n.clan})` : ''}</option>
                ))}
              </select>

              <input
                className={styles.inputSearch}
                placeholder="Search players in this NPC’s convos…"
                value={convosSearch}
                onChange={(e) => setConvosSearch(e.target.value)}
                disabled={!selectedNpcId}
                style={{ minWidth: 260 }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ======= DIRECT MODE TABLES ======= */}
      {viewMode === 'direct' && (
        <div className={`${styles.tableContainer} ${styles.isStickyHead}`}>
          <table className={`${styles.table} ${styles.zebra}`}>
            <thead>
              {!groupByUser && (
                <tr>
                  <th className={styles.colId}>ID</th>
                  <th className={styles.colTime}>
                    <button className={styles.sortableHeader} onClick={() => handleSort('created_at')} type="button">
                      Timestamp <SortArrow column="created_at" />
                    </button>
                  </th>
                  <th className={styles.colFrom}>
                    <button className={styles.sortableHeader} onClick={() => handleSort('sender_name')} type="button">
                      From <SortArrow column="sender_name" />
                    </button>
                  </th>
                  <th className={styles.colTo}>
                    <button className={styles.sortableHeader} onClick={() => handleSort('recipient_name')} type="button">
                      To <SortArrow column="recipient_name" />
                    </button>
                  </th>
                  <th className={styles.colMsg}>Message</th>
                </tr>
              )}
            </thead>

            <tbody>
              {!groupByUser &&
                processedDirect.map(msg => (
                  <tr key={msg.id}>
                    <td className={styles.mono}>{msg.id}</td>
                    <td className={styles.nowrap}>{formatTimestamp(msg.created_at)}</td>
                    <td className={styles.ellipsis} title={msg.sender_name}><Highlight text={msg.sender_name} /></td>
                    <td className={styles.ellipsis} title={msg.recipient_name}><Highlight text={msg.recipient_name} /></td>
                    <td className={styles.messageCell} title={msg.body}>
                      <span className={styles.msgText}><Highlight text={msg.body} /></span>
                      <button className={styles.copyBtn} onClick={() => navigator.clipboard?.writeText?.(msg.body || '')}>Copy</button>
                    </td>
                  </tr>
                ))}

              {groupByUser &&
                processedDirect.map(group => {
                  const isCollapsed = !!collapsed[group.key];
                  return (
                    <React.Fragment key={group.key}>
                      <tr className={styles.groupHeaderRow}>
                        <td colSpan={5}>
                          <button
                            type="button"
                            className={styles.groupHeader}
                            onClick={() => setCollapsed(c => ({ ...c, [group.key]: !c[group.key] }))}
                            aria-expanded={!isCollapsed}
                          >
                            <span className={styles.caret}>{isCollapsed ? '▶' : '▼'}</span>
                            <span className={styles.groupTitle}>{group.users}</span>
                            <span className={styles.groupMeta}>
                              <span className={styles.countBadge}>{group.messages.length}</span>
                              <span className={styles.latestTime}>Last: {formatTimestamp(group.latest_timestamp)}</span>
                            </span>
                          </button>
                        </td>
                      </tr>
                      {!isCollapsed && group.messages.map(msg => (
                        <tr key={msg.id} className={styles.groupedRow}>
                          <td className={styles.mono}>{msg.id}</td>
                          <td className={styles.nowrap}>{formatTimestamp(msg.created_at)}</td>
                          <td className={styles.ellipsis} title={msg.sender_name}><Highlight text={msg.sender_name} /></td>
                          <td className={styles.ellipsis} title={msg.recipient_name}><Highlight text={msg.recipient_name} /></td>
                          <td className={styles.messageCell} title={msg.body}>
                            <span className={styles.msgText}><Highlight text={msg.body} /></span>
                            <button className={styles.copyBtn} onClick={() => navigator.clipboard?.writeText?.(msg.body || '')}>Copy</button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}

              {!processedDirect.length && (
                <tr><td colSpan={5} className={styles.subtle}>No messages found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ======= NPC MODE TABLES ======= */}
      {viewMode === 'npc' && (
        <>
          {/* Conversations table */}
          <div className={`${styles.tableContainer} ${styles.isStickyHead}`} style={{ marginTop: 10 }}>
            <table className={`${styles.table} ${styles.zebra}`}>
              <thead>
                <tr>
                  <th style={{ width: 220 }}>
                    <button className={styles.sortableHeader} onClick={() => sortConvosBy('char')} type="button">
                      Player Character {convosSort.col === 'char' && <span className={styles.sortArrow}>{convosSort.dir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th style={{ width: 220 }}>
                    <button className={styles.sortableHeader} onClick={() => sortConvosBy('player')} type="button">
                      Player {convosSort.col === 'player' && <span className={styles.sortArrow}>{convosSort.dir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th style={{ width: 160 }}>
                    <button className={styles.sortableHeader} onClick={() => sortConvosBy('last_message_at')} type="button">
                      Last Message {convosSort.col === 'last_message_at' && <span className={styles.sortArrow}>{convosSort.dir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {!selectedNpcId && (
                  <tr><td colSpan={4} className={styles.subtle}>{npcListLoading ? 'Loading NPCs…' : (npcListError || 'Select an NPC to view conversations.')}</td></tr>
                )}
                {selectedNpcId && convosLoading && (
                  <tr><td colSpan={4} className={styles.subtle}>Loading conversations…</td></tr>
                )}
                {selectedNpcId && !convosLoading && !processedConvos.length && (
                  <tr><td colSpan={4} className={styles.subtle}>No conversations for this NPC.</td></tr>
                )}
                {selectedNpcId && processedConvos.map(r => (
                  <tr key={r.user_id} className={selectedUserId === r.user_id ? styles.groupedRow : undefined}>
                    <td className={styles.ellipsis} title={r.char_name}>{r.char_name || '—'}</td>
                    <td className={styles.ellipsis} title={r.display_name}>{r.display_name || '—'}</td>
                    <td className={styles.nowrap}>{r.last_message_at ? formatTimestamp(r.last_message_at) : '—'}</td>
                    <td>
                      <button
                        className={styles.groupToggle}
                        onClick={() => setSelectedUserId(prev => prev === r.user_id ? null : r.user_id)}
                      >
                        {selectedUserId === r.user_id ? 'Close' : 'Open'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Thread table */}
          {selectedNpcId && selectedUserId && (
            <div className={`${styles.tableContainer} ${styles.isStickyHead}`} style={{ marginTop: 12 }}>
              <table className={`${styles.table} ${styles.zebra}`}>
                <thead>
                  <tr>
                    <th className={styles.colId}>ID</th>
                    <th className={styles.colTime}>Timestamp</th>
                    <th style={{ width: 140 }}>From</th>
                    <th className={styles.colMsg}>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {threadLoading && (
                    <tr><td colSpan={4} className={styles.subtle}>Loading thread…</td></tr>
                  )}
                  {!threadLoading && !thread.length && (
                    <tr><td colSpan={4} className={styles.subtle}>No messages yet.</td></tr>
                  )}
                  {!threadLoading && thread.map(m => (
                    <tr key={m.id}>
                      <td className={styles.mono}>{m.id}</td>
                      <td className={styles.nowrap}>{formatTimestamp(m.created_at)}</td>
                      <td className={styles.nowrap}>{m.from === 'npc' ? 'NPC' : 'Player'}</td>
                      <td className={styles.messageCell} title={m.body}>
                        <span className={styles.msgText}>{m.body}</span>
                        <button className={styles.copyBtn} onClick={() => navigator.clipboard?.writeText?.(m.body || '')}>Copy</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
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