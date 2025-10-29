// src/components/admin/AdminCharactersTab.jsx
import React, { useMemo, useState } from 'react';
import styles from '../../styles/Admin.module.css';

/* ---------- VTM Lookups (as requested) ---------- */
const CLAN_COLORS = {
  Brujah: '#b40f1f',
  Gangrel: '#2f7a3a',
  Malkavian: '#713c8b',
  Nosferatu: '#6a4b2b',
  Toreador: '#b8236b',
  Tremere: '#7b1113',
  Ventrue: '#1b4c8c',
  'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b',
  Lasombra: '#191a5a',
  'The Ministry': '#865f12',
  Caitiff: '#636363',
  'Thin-blood': '#6e6e2b',
};
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };
const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');
const symlogo = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png` : '');
/* -------------------------------------------------- */


export default function AdminCharactersTab({ users, onSave, onDelete, onGeneratePDF, onOpenEditor }) {
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
    <div className={styles.stack12}>
      <h3>Characters</h3>
      {!chars.length && <div className={styles.subtle}>No characters yet.</div>}
      
      <div className={styles.characterCardGrid}>
        {chars.map(c => {
          const clanColor = CLAN_COLORS[c.clan] || 'var(--border-color)';
          const clanLogoUrl = symlogo(c.clan);
          
          return (
            <div 
              key={c.id} 
              className={styles.characterCard}
              style={{
                '--clan-color': clanColor,
                '--clan-logo-url': clanLogoUrl ? `url(${clanLogoUrl})` : 'none'
              }}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardOwnerInfo}>
                  <div className={styles.cardOwnerLabel}>Owner</div>
                  <div className={styles.cardOwnerName}>{c.owner}</div>
                </div>
                {clanLogoUrl && <div className={styles.clanLogo}></div>}
              </div>

              <div className={styles.cardBody}>
                <div className={styles.formGrid}>
                  <label>
                    <span>Name</span>
                    <input 
                      className={styles.input}
                      value={getRow(c).name} 
                      onChange={e=>setRow(c, { name: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>Clan</span>
                    <input 
                      className={styles.input}
                      value={getRow(c).clan} 
                      onChange={e=>setRow(c, { clan: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>XP</span>
                    <input 
                      className={styles.input}
                      value={c.xp} 
                      readOnly 
                      disabled
                    />
                  </label>
                </div>
              
                <label className={styles.stack12} style={{marginTop: '1rem'}}>
                  <span>Sheet (JSON)</span>
                  <textarea
                    value={getRow(c).sheet}
                    onChange={e=>setRow(c, { sheet: e.target.value })}
                    rows={10}
                    className={`${styles.input} ${styles.inputMono}`}
                  />
                </label>
              </div>
              
              <div className={styles.cardFooter}>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={()=>{
                    let parsed = null;
                    try { parsed = JSON.parse(getRow(c).sheet || '{}'); }
                    catch { alert('Invalid JSON in sheet'); return; }
                    onSave({ id: c.id, name: getRow(c).name, clan: getRow(c).clan, sheet: parsed });
                  }}
                >
                  Save JSON
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => onOpenEditor(c)}
                  title="Open the rich editor (with XP auto-refund/charge)"
                >
                  Open Editor
                </button>
                
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => onGeneratePDF(c)}
                >
                  Download PDF
                </button>

                <button
                  className={`${styles.btn} ${styles.btnDanger} ${styles.rowEnd}`}
                  onClick={() => onDelete(c.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}