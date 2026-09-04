import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../core/api';
import styles from '../../styles/Domains.module.css';

const KEY_LABELS = {
  catacombs: 'Catacombs',
  necropolis_old: 'Old Necropolis',
  necropolis_new: 'New Necropolis',
};

// Admin-only modal: grant/revoke the restricted Domains-map overlays per user.
// Admins always see everything; a Nosferatu character auto-gets both
// necropoleis (shown as a locked "auto" chip here).
export default function OverlayAccessManager({ onClose }) {
  const qc = useQueryClient();
  const [q, setQ] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['domain-overlays-grants'],
    queryFn: async () => (await api.get('/admin/domain-overlays/grants')).data,
  });

  const keys = data?.keys || ['catacombs', 'necropolis_old', 'necropolis_new'];

  const grant = useMutation({
    mutationFn: ({ userId, key, on }) =>
      on
        ? api.post('/admin/domain-overlays/grants', { user_id: userId, overlay_key: key })
        : api.delete(`/admin/domain-overlays/grants/${userId}/${key}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domain-overlays-grants'] });
      qc.invalidateQueries({ queryKey: ['domain-overlays-me'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update access'),
  });

  const users = useMemo(() => {
    const list = data?.users || [];
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? list.filter(u =>
          u.name.toLowerCase().includes(needle) ||
          u.email.toLowerCase().includes(needle) ||
          (u.clan || '').toLowerCase().includes(needle))
      : list;
    // users with any grant (or a Nosferatu auto-grant) float to the top
    return [...filtered].sort((a, b) => {
      const aw = a.granted.length + (a.clan === 'Nosferatu' ? 1 : 0);
      const bw = b.granted.length + (b.clan === 'Nosferatu' ? 1 : 0);
      return bw - aw || a.name.localeCompare(b.name);
    });
  }, [data, q]);

  return (
    <motion.div
      className={styles.accessMgrBackdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.accessMgr}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.accessMgrHead}>
          <div>
            <h3 className={styles.accessMgrTitle}>Overlay Access</h3>
            <p className={styles.accessMgrSub}>
              Base map &amp; Transit are open to everyone. Grant the restricted overlays per player.
              Admins see all · Nosferatu characters get both necropoleis automatically.
            </p>
          </div>
          <button type="button" className={styles.accessMgrClose} onClick={onClose}>✕</button>
        </div>

        <input
          className={styles.accessMgrSearch}
          type="text"
          placeholder="Search name, email or clan…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />

        <div className={styles.accessMgrList}>
          {isLoading && <p className={styles.accessMgrEmpty}>Loading…</p>}
          {error && <p className={styles.accessMgrEmpty}>Failed to load users.</p>}
          {!isLoading && !error && users.length === 0 && (
            <p className={styles.accessMgrEmpty}>No matching users.</p>
          )}
          {users.map(u => {
            const isNosferatu = u.clan === 'Nosferatu';
            const isAdminUser = u.role === 'admin';
            return (
              <div key={u.id} className={styles.accessMgrRow}>
                <div className={styles.accessMgrWho}>
                  <span className={styles.accessMgrName}>{u.name}</span>
                  <span className={styles.accessMgrMeta}>
                    {u.role}{u.clan ? ` · ${u.clan}` : ''}
                  </span>
                </div>
                <div className={styles.accessMgrChips}>
                  {keys.map(k => {
                    const auto =
                      isAdminUser ||
                      (isNosferatu && (k === 'necropolis_old' || k === 'necropolis_new'));
                    const on = auto || u.granted.includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        className={styles.accessMgrChip}
                        data-on={on}
                        data-auto={auto}
                        disabled={auto || grant.isPending}
                        title={
                          auto
                            ? (isAdminUser ? 'Admin — always has access' : 'Nosferatu — automatic')
                            : (on ? 'Click to revoke' : 'Click to grant')
                        }
                        onClick={() => grant.mutate({ userId: u.id, key: k, on: !on })}
                      >
                        {KEY_LABELS[k] || k}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
