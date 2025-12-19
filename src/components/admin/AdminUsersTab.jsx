// src/components/admin/AdminUsersTab.jsx
import React, { useMemo, useState } from 'react';
import styles from '../../styles/Admin.module.css';

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
  Ministry: '#8c6a1b',
  Ravnos: '#a85f1f',
  Salubri: '#7f3f7f',
  Tzimisce: '#3f7f7f',
  Caitiff: '#666666',
  Thinblood: '#444444'
};

const headerStyle = {
  display: 'grid',
  // Updated grid template to fit Discord ID
  gridTemplateColumns: '64px 1fr 1.3fr 0.8fr 1fr 1fr 0.7fr 120px',
  gap: '10px',
  padding: '10px 12px',
  borderBottom: '1px solid var(--border-color, #2b2b2b)',
  color: 'var(--text-secondary, #a0a0a0)',
  fontWeight: 700,
  fontSize: '0.85rem', // Slightly smaller to fit
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};
const rowStyle = {
  display: 'grid',
  // Updated grid template to fit Discord ID
  gridTemplateColumns: '64px 1fr 1.3fr 0.8fr 1fr 1fr 0.7fr 120px',
  gap: '10px',
  alignItems: 'center',
  padding: '10px 12px',
  borderBottom: '1px solid var(--border-color, #202020)',
};
const pill = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px',
  borderRadius: 8,
  background: 'var(--bg-tertiary, #2a2a2a)',
  border: '1px solid var(--border-color, #333)',
  color: 'var(--text-primary, #e0e0e0)',
  width: '100%',
  minHeight: 36,
};
const tinyChip = (hex) => ({
  width: 12,
  height: 12,
  borderRadius: 999,
  background: hex || '#7F5AF0',
  boxShadow: `0 0 10px ${hex || '#7F5AF0'}`,
});

/**
 * props:
 * - users: Array<{ id, email, display_name, role, character_id?, char_name?, clan?, xp?, discord_id? }>
 * - onSave: ({ id, display_name?, email?, role?, discord_id? }) => Promise|void
 */
export default function AdminUsersTab({ users = [], onSave }) {
  const [drafts, setDrafts] = useState(() =>
    new Map(
      (users || []).map((u) => [
        u.id,
        { 
          display_name: u.display_name ?? '', 
          email: u.email ?? '', 
          role: u.role ?? 'user',
          discord_id: u.discord_id ?? '' 
        },
      ])
    )
  );

  React.useEffect(() => {
    setDrafts(
      new Map(
        (users || []).map((u) => [
          u.id,
          { 
            display_name: u.display_name ?? '', 
            email: u.email ?? '', 
            role: u.role ?? 'user',
            discord_id: u.discord_id ?? '' 
          },
        ])
      )
    );
  }, [users]);

  const setRow = (u, patch) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      const existing = next.get(u.id) || { display_name: '', email: '', role: 'user', discord_id: '' };
      next.set(u.id, { ...existing, ...patch });
      return next;
    });
  };
  const getRow = (u) => drafts.get(u.id) || { display_name: '', email: '', role: 'user', discord_id: '' };
  const resetRow = (u) =>
    setDrafts((prev) => {
      const next = new Map(prev);
      next.set(u.id, {
        display_name: u.display_name ?? '',
        email: u.email ?? '',
        role: u.role ?? 'user',
        discord_id: u.discord_id ?? ''
      });
      return next;
    });

  const roleChoices = useMemo(() => ['user', 'courtuser', 'admin'], []);

  return (
    <div className={styles?.panel ?? ''} style={{ background: 'var(--bg-secondary, #1e1e1e)', borderRadius: 12, border: '1px solid var(--border-color, #2b2b2b)' }}>
      <div className={styles?.panelHeader ?? ''} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color, #2b2b2b)' }}>
        <h3 className={styles?.panelTitle ?? ''} style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #e0e0e0)' }}>
          Admin • Users
        </h3>
        <p className={styles?.muted ?? ''} style={{ margin: '6px 0 0', color: 'var(--text-secondary, #a0a0a0)', fontSize: '0.9rem' }}>
          Edit display name, email, role, or Discord ID. Save per row. Character data is read-only.
        </p>
      </div>

      <div style={headerStyle}>
        <div>ID</div>
        <div>Display Name</div>
        <div>Email</div>
        <div>Role</div>
        <div>Discord ID</div>
        <div>Character</div>
        <div>Clan / XP</div>
        <div>Actions</div>
      </div>

      <div>
        {users.map((u) => {
          const draft = getRow(u);
          const clanColor = CLAN_COLORS[u.clan] || '#7F5AF0';
          return (
            <div key={u.id} style={rowStyle}>
              <div style={{ color: 'var(--text-secondary, #a0a0a0)', fontFamily: 'monospace' }}>#{u.id}</div>

              <div>
                <input
                  className={styles?.input ?? ''}
                  style={{ ...pill, height: 36 }}
                  value={draft.display_name}
                  onChange={(e) => setRow(u, { display_name: e.target.value })}
                  placeholder="Display Name"
                />
              </div>

              <div>
                <input
                  className={styles?.input ?? ''}
                  style={{ ...pill, height: 36 }}
                  value={draft.email}
                  onChange={(e) => setRow(u, { email: e.target.value })}
                  placeholder="Email"
                />
              </div>

              <div>
                <select
                  className={styles?.select ?? ''}
                  style={{ ...pill, height: 36 }}
                  value={draft.role}
                  onChange={(e) => setRow(u, { role: e.target.value })}
                >
                  {roleChoices.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Discord ID Field */}
              <div>
                <input
                  className={styles?.input ?? ''}
                  style={{ ...pill, height: 36, fontFamily: 'monospace' }}
                  value={draft.discord_id}
                  onChange={(e) => setRow(u, { discord_id: e.target.value })}
                  placeholder="123456789..."
                />
              </div>

              <div>
                {u.character_id ? (
                  <div style={{ ...pill, justifyContent: 'space-between' }}>
                    <span title={`Character ID: ${u.character_id}`}>{u.char_name || '—'}</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>#{u.character_id}</span>
                  </div>
                ) : (
                  <div style={{ ...pill, opacity: 0.7 }}>No character</div>
                )}
              </div>

              <div>
                <div style={{ ...pill, gap: 10 }}>
                  <span style={tinyChip(clanColor)} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.clan || '—'}
                  </span>
                  <span style={{ marginLeft: 'auto', opacity: 0.85 }}>XP: {u.xp ?? 0}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className={`${styles?.btn ?? ''} ${styles?.btnPrimary ?? ''}`}
                  style={{
                    ...pill,
                    padding: '0 12px',
                    height: 36,
                    background: 'linear-gradient(180deg, var(--accent-purple, #7F5AF0), #6a48d9)',
                    border: '1px solid var(--accent-purple-dark, #6a48d9)',
                    boxShadow: '0 6px 16px rgba(127,90,240,0.25)',
                    fontWeight: 800,
                  }}
                  onClick={() => onSave?.({ id: u.id, ...draft })}
                  title="Save changes"
                >
                  Save
                </button>
                <button
                  className={styles?.btn ?? ''}
                  style={{ ...pill, padding: '0 12px', height: 36 }}
                  onClick={() => resetRow(u)}
                  title="Reset row"
                >
                  Reset
                </button>
              </div>
            </div>
          );
        })}

        {users.length === 0 && (
          <div style={{ padding: 24, color: 'var(--text-secondary, #a0a0a0)' }}>
            No users found.
          </div>
        )}
      </div>
    </div>
  );
}