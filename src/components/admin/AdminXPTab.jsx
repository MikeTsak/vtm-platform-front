// src/pages/AdminXPTab.jsx
import React, { useState } from 'react';
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

export default function AdminXPTab({ users, onGrant }) {
  const characters = users.filter(u => u.character_id).map(u => ({
    id: u.character_id,
    owner: `${u.display_name} <${u.email}>`,
    name: u.char_name || '',
    clan: u.clan || '',
    xp: u.xp || 0
  }));

  const [grants, setGrants] = useState({}); // char_id -> delta

  function handleGrant(char_id) {
    const delta = grants[char_id];
    onGrant(char_id, delta);
    // Clear input after granting
    setGrants(prev => ({ ...prev, [char_id]: '' }));
  }

  return (
    <div className={styles.stack12}>
      <h3>XP Tools</h3>
      {!characters.length && <div className={styles.subtle}>No characters to grant XP to yet.</div>}
      <div className={styles.xpGrid}>
        <b className={styles.gridHeader}>Character</b>
        <b className={styles.gridHeader}>Clan</b>
        <b className={styles.gridHeader}>Owner</b>
        <b className={styles.gridHeader}>Current XP</b>
        <b className={styles.gridHeader}>Actions</b>
        
        {characters.map(c => {
          const clanColor = CLAN_COLORS[c.clan] || 'var(--text-secondary)';
          const clanLogoUrl = symlogo(c.clan);

          return (
            <React.Fragment key={c.id}>
              <div 
                className={styles.xpCharCell}
                style={{
                  '--clan-color': clanColor,
                  '--clan-logo-url': clanLogoUrl ? `url(${clanLogoUrl})` : 'none'
                }}
              >
                <span className={styles.charName}>{c.name}</span>
              </div>
              <div 
                className={styles.clanName} 
                style={{ color: clanColor }}
              >
                {c.clan}
              </div>
              <div className={styles.ownerCell} title={c.owner}>{c.owner}</div>
              <div className={styles.xpCell}>{c.xp}</div>
              <div className={styles.actionCell}>
                <input
                  type="number"
                  placeholder="+/-"
                  className={styles.input}
                  value={grants[c.id] ?? ''}
                  onChange={e=>setGrants(prev => ({ ...prev, [c.id]: e.target.value }))}
                />
                <button 
                  className={`${styles.btn} ${styles.btnPrimary}`} 
                  onClick={() => handleGrant(c.id)}
                  disabled={!grants[c.id] || grants[c.id] === '0'}
                >
                  Apply
                </button>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}