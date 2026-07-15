// src/pages/AdminNPCsTab.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../../styles/Admin.module.css';
import CharacterSetup from '../character/CharacterSetup';
import Avatar from '../../components/Avatar';
import api from '../../core/api';

const CLAN_COLORS = {
  Brujah: '#b40f1f', Gangrel: '#2f7a3a', Malkavian: '#713c8b', Nosferatu: '#6a4b2b',
  Toreador: '#b8236b', Tremere: '#7b1113', Ventrue: '#1b4c8c', 'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b', Lasombra: '#191a5a', 'The Ministry': '#865f12', Caitiff: '#636363', 'Thin-blood': '#6e6e2b',
};
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };
const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');
const symlogo = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png` : '');

export default function AdminNPCsTab({ npcs, onReload, onDelete }) {
  const [mode, setMode] = React.useState('list');

  return (
    <div className={styles.stack12}>
      <div className={styles.row} style={{ justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
        <h3 style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>NPCs</h3>
        {mode === 'list' && (
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setMode('create')}>+ Create NPC</button>
        )}
      </div>

      {mode === 'list' && (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Clan</th>
                <th>XP</th>
                <th>Created At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
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
                    <td className={styles.idCell}>#{n.id}</td>
                    <td className={styles.npcNameCell}>
                      <div style={{ width: 40, height: 40, marginRight: 12, display: 'inline-block', verticalAlign: 'middle' }}>
                        <Avatar npcId={n.id} size="100%" style={{ width: '100%', height: '100%', borderRadius: '50%' }} fallback={symlogo(n.clan)} editable={true} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', verticalAlign: 'middle' }}>{n.name}</span>
                    </td>
                    <td className={styles.clanCell} style={{ color: clanColor, fontWeight: 700, fontStyle: 'normal' }}>{n.clan}</td>
                    <td style={{ fontFamily: 'Fira Code, monospace', fontWeight: 'bold', color: 'var(--accent-purple)' }}>{n.xp}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(n.created_at).toLocaleString()}</td>
                    <td>
                      <div className={styles.row} style={{ gap: '8px', justifyContent: 'flex-end' }}>
                        {n.is_disabled ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>DISABLED</span>
                        ) : (
                          <button
                            className={`${styles.btn} ${styles.btnDanger}`}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#e67e22' }}
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to disable ${n.name}? They will no longer be visible to players for messaging. This can only be undone from the database.`)) {
                                await api.post(`/admin/npcs/${n.id}/disable`);
                                onReload();
                              }
                            }}
                          >
                            Disable
                          </button>
                        )}
                        <Link className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} to={`/admin/npcs/${n.id}`}>
                          Edit
                        </Link>
                        <button
                          className={`${styles.btn} ${styles.btnDanger}`}
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
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
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No NPCs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {mode === 'create' && (
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--glass-shadow)' }}>
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
            <h4 style={{ margin: 0, color: 'var(--accent-purple)', fontSize: '1.4rem', fontWeight: 800 }}>Create NPC</h4>
            <p className={styles.subtle}>Creates a new NPC character sheet.</p>
          </div>
          <div style={{ background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <CharacterSetup
              forNPC
              onDone={async () => { await onReload(); setMode('list'); }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setMode('list')}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}