// src/components/admin/AdminXPTab.jsx
import React, { useState, useMemo } from 'react';
import styles from '../../styles/Admin.module.css';

/* ---------- VTM Lookups ---------- */
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

// Notice we now accept an `onBulkGrant` prop!
export default function AdminXPTab({ users, onGrant, onBulkGrant }) {
  const [grants, setGrants] = useState({}); // char_id -> delta
  const [bulkDelta, setBulkDelta] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Memoize and filter characters based on search
  const characters = useMemo(() => {
    const allChars = users
      .filter(u => u.character_id)
      .map(u => ({
        id: u.character_id,
        owner: `${u.display_name} <${u.email}>`,
        name: u.char_name || 'Unnamed',
        clan: u.clan || 'Unknown',
        xp: u.xp || 0
      }));

    if (!searchTerm.trim()) return allChars;

    const lowerSearch = searchTerm.toLowerCase();
    return allChars.filter(c => 
      c.name.toLowerCase().includes(lowerSearch) || 
      c.owner.toLowerCase().includes(lowerSearch) ||
      c.clan.toLowerCase().includes(lowerSearch)
    );
  }, [users, searchTerm]);

  const totalCharacters = users.filter(u => u.character_id).length;

  function handleGrant(char_id) {
    const delta = grants[char_id];
    onGrant(char_id, delta);
    setGrants(prev => ({ ...prev, [char_id]: '' }));
  }

  async function handleBulkGrant() {
    const delta = parseInt(bulkDelta, 10);
    if (isNaN(delta) || delta === 0) return;
    
    if (!window.confirm(`Are you sure you want to apply ${delta > 0 ? '+' : ''}${delta} XP to ALL ${totalCharacters} characters in the database?`)) return;

    setIsApplying(true);
    // Delegate the actual API call to the parent (Admin.jsx)
    try {
      await onBulkGrant(delta);
      setBulkDelta('');
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className={styles.stack12}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>XP Tools</h3>
        
        {/* --- SEARCH BAR --- */}
        <input 
          type="text" 
          placeholder="Search character, owner, or clan..." 
          className={styles.input}
          style={{ width: '300px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* --- BULK XP FEATURE --- */}
      {totalCharacters > 0 && (
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '16px', 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Bulk Grant XP</strong>
            <span style={{ fontSize: '0.85rem', color: '#aaa' }}>Apply XP to EVERY character in the game simultaneously ({totalCharacters} characters total).</span>
          </div>
          <input
            type="number"
            placeholder="+/-"
            className={styles.input}
            style={{ width: '100px', marginLeft: 'auto' }}
            value={bulkDelta}
            onChange={e => setBulkDelta(e.target.value)}
            disabled={isApplying}
          />
          <button 
            className={`${styles.btn} ${styles.btnPrimary}`} 
            onClick={handleBulkGrant}
            disabled={!bulkDelta || bulkDelta === '0' || isApplying}
          >
            {isApplying ? 'Applying...' : 'Apply to All'}
          </button>
        </div>
      )}
      {/* ----------------------- */}

      {!characters.length && (
        <div className={styles.subtle}>
          {totalCharacters === 0 ? "No characters to grant XP to yet." : "No characters match your search."}
        </div>
      )}
      
      {characters.length > 0 && (
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
      )}
    </div>
  );
}