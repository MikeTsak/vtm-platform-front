// src/components/admin/AdminUsersTab.jsx
import React, { useMemo, useState } from 'react';
import styles from '../../styles/Admin.module.css';
import { Skeleton } from 'boneyard-js/react';
import Avatar from '../../components/Avatar';
import { CLAN_HEX as CLAN_COLORS } from '../../data/clans';

export default function AdminUsersTab({ users = [], onSave, loading = false }) {
  const [drafts, setDrafts] = useState(() => new Map((users || []).map((u) => [u.id, { display_name: u.display_name ?? '', email: u.email ?? '', role: u.role ?? 'user', discord_id: u.discord_id ?? '' }])));

  React.useEffect(() => { setDrafts(new Map((users || []).map((u) => [u.id, { display_name: u.display_name ?? '', email: u.email ?? '', role: u.role ?? 'user', discord_id: u.discord_id ?? '' }]))); }, [users]);

  const setRow = (u, patch) => setDrafts((prev) => { const next = new Map(prev); next.set(u.id, { ...(next.get(u.id) || {}), ...patch }); return next; });
  const getRow = (u) => drafts.get(u.id) || { display_name: '', email: '', role: 'user', discord_id: '' };
  const resetRow = (u) => setDrafts((prev) => { const next = new Map(prev); next.set(u.id, { display_name: u.display_name ?? '', email: u.email ?? '', role: u.role ?? 'user', discord_id: u.discord_id ?? '' }); return next; });

  const roleChoices = useMemo(() => ['user', 'courtuser', 'admin'], []);

  return (
    <Skeleton name="admin-users-tab" loading={loading}>
      <div className={`${styles.editorSection} ${styles.characterCard}`}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.hl}>Admin • Users</h3>
          <p className={styles.subtle}>Edit user accounts. Character data is read-only.</p>
        </div>

        <div className={styles.tableContainer}>
          <div className={styles.table}>
            <div className={styles.thead}>
              <div className={styles.userHeader}>
                <div className={styles.th}>ID</div>
                <div className={styles.th}>Display Name</div>
                <div className={styles.th}>Email</div>
                <div className={styles.th}>Role</div>
                <div className={styles.th}>Discord ID</div>
                <div className={styles.th}>Character</div>
                <div className={styles.th}>Clan / XP</div>
                <div className={styles.th}>Actions</div>
              </div>
            </div>
            <div className={styles.tbody}>
              {users.map((u) => {
                const draft = getRow(u);
                const clanColor = CLAN_COLORS[u.clan] || '#7F5AF0';
                return (
                  <div key={u.id} className={styles.userRow} onMouseEnter={(e) => e.currentTarget.classList.add(styles.hover)} onMouseLeave={(e) => e.currentTarget.classList.remove(styles.hover)}>
                    <div className={styles.td} data-label="ID"><span className={styles.idCell}>#{u.id}</span></div>
                    <div className={styles.td} data-label="Display Name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar userId={u.id} hasAvatar={u.has_avatar} size={32} editable={true} />
                      <input className={styles.input} value={draft.display_name} onChange={(e) => setRow(u, { display_name: e.target.value })} />
                    </div>
                    <div className={styles.td} data-label="Email"><input className={styles.input} type="email" value={draft.email} onChange={(e) => setRow(u, { email: e.target.value })} /></div>
                    <div className={styles.td} data-label="Role"><select className={styles.select} value={draft.role} onChange={(e) => setRow(u, { role: e.target.value })}>{roleChoices.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div className={styles.td} data-label="Discord ID"><input className={`${styles.input} ${styles.inputMono}`} value={draft.discord_id} onChange={(e) => setRow(u, { discord_id: e.target.value })} /></div>
                    <div className={styles.td} data-label="Character">
                      {u.character_id ? (
                        <div className={styles.row} style={{ gap: '8px', alignItems: 'center' }}>
                          <span title={`Character ID: ${u.character_id}`}>{u.char_name || 'None'}</span>
                          <span className={styles.subtle}>#{u.character_id}</span>
                        </div>
                      ) : (
                        <div className={styles.subtle}><em>None</em></div>
                      )}
                    </div>
                    <div className={styles.td} data-label="Clan / XP">
                      <div className={styles.row} style={{ gap: '10px', alignItems: 'center' }}>
                        <span className={styles.tinyChip} style={{ '--chip-color': clanColor }}></span>
                        <span>{u.clan || 'None'}</span>
                        <span className={styles.idCell} style={{ marginLeft: 'auto' }}>XP: {u.xp ?? 0}</span>
                      </div>
                    </div>
                    <div className={`${styles.td} ${styles.rowEnd} ${styles.userActions}`}>
                      <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onSave?.({ id: u.id, ...draft })}>Save</button>
                      <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => resetRow(u)}>Reset</button>
                    </div>
                  </div>
                );
              })}
              {users.length === 0 && (
                <div className={styles.userRow}>
                  <div className={styles.td} colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                    No users found.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Skeleton>
  );
}