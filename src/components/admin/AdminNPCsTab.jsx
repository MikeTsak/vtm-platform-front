// src/pages/AdminNPCsTab.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from '../../styles/Admin.module.css';

import CharacterSetup from '../../pages/CharacterSetup'; // Assumes this path is correct

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


export default function AdminNPCsTab({ npcs, onReload, onDelete }) {
  const [mode, setMode] = React.useState('list'); // list | create

  return (
    <div className={styles.stack12}>
      <div className={styles.row} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>NPCs</h3>
        {mode === 'list' && (
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setMode('create')}>+ New NPC</button>
        )}
      </div>


      {mode === 'list' && (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Clan</th>
                  <th>XP</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {npcs.map(n => {
                  const clanColor = CLAN_COLORS[n.clan] || 'var(--text-secondary)';
                  const clanLogoUrl = symlogo(n.clan);
                  
                  return (
                    <tr 
                      key={n.id}
                      style={{
                        '--clan-color': clanColor,
                        '--clan-logo-url': clanLogoUrl ? `url(${clanLogoUrl})` : 'none'
                      }}
                    >
                      <td className={styles.idCell}>{n.id}</td>
                      <td className={styles.npcNameCell}>
                        <div className={styles.clanIcon}></div>
                        {n.name}
                      </td>
                      <td className={styles.clanCell}>{n.clan}</td>
                      <td className={styles.xpCell}>{n.xp}</td>
                      <td className={styles.dateCell}>{new Date(n.created_at).toLocaleString()}</td>
                      <td>
                        <div className={styles.row} style={{ gap: '8px' }}>
                          <Link className={`${styles.btn} ${styles.btnSecondary}`} to={`/admin/npcs/${n.id}`}>
                            View
                          </Link>
                          <button
                            className={`${styles.btn} ${styles.btnDanger}`}
                            onClick={() => onDelete(n.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!npcs.length && (
                  <tr><td colSpan="6" className={styles.emptyCell}>No NPCs yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {mode === 'create' && (
        <div className={styles.npcCreateCard}>
          <div className={styles.npcCreateHeader}>
            <h4>Create New NPC</h4>
            <p className={styles.subtle}>
              This will create a new character sheet and flag it as an NPC.
            </p>
          </div>
          <div className={styles.npcCreateBody}>
            <CharacterSetup
              forNPC
              onDone={async () => { await onReload(); setMode('list'); }}
            />
          </div>
          <div className={styles.npcCreateFooter}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setMode('list')}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}