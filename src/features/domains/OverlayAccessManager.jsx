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

// Access-management modal for the restricted Domains-map overlays.
//  · Admins can grant/revoke anything.
//  · A non-admin who has an overlay can hand that same overlay to another
//    player ("spread" it), and can revoke grants they personally made.
//  · Nosferatu characters / admins show as locked auto-grants.
// Rows are labelled by CHARACTER name.
export default function OverlayAccessManager({ onClose, userId }) {
  const qc = useQueryClient();
  const [q, setQ] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['domain-overlays-directory', userId],
    queryFn: async () => (await api.get('/domain-overlays/directory')).data,
  });

  const isAdmin = !!data?.me?.admin;
  const grantable = data?.grantable || [];
  const keys = (data?.keys || ['catacombs', 'necropolis_old', 'necropolis_new'])
    .filter(k => isAdmin || grantable.includes(k));

  const grant = useMutation({
    mutationFn: ({ userId, key, on }) =>
      on
        ? api.post('/domain-overlays/grants', { user_id: userId, overlay_key: key })
        : api.delete(`/domain-overlays/grants/${userId}/${key}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domain-overlays-directory'], exact: false });
      qc.invalidateQueries({ queryKey: ['domain-overlays-me'], exact: false });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update access'),
  });

  const users = useMemo(() => {
    const list = data?.users || [];
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? list.filter(u =>
          (u.name || '').toLowerCase().includes(needle) ||
          (u.account || '').toLowerCase().includes(needle) ||
          (u.clan || '').toLowerCase().includes(needle))
      : list;
    return [...filtered].sort((a, b) => {
      const w = (u) => u.granted.length + (u.clan === 'Nosferatu' ? 1 : 0) + (u.role === 'admin' ? 1 : 0);
      return w(b) - w(a) || (a.name || '').localeCompare(b.name || '');
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
              Base map &amp; Transit are open to everyone.
              {isAdmin
                ? ' Grant the restricted overlays to any player. Admins see all · Nosferatu characters get both necropoleis automatically.'
                : ' You can pass on an overlay you have to another player, and take back grants you made.'}
            </p>
          </div>
          <button type="button" className={styles.accessMgrClose} onClick={onClose}>✕</button>
        </div>

        <input
          className={styles.accessMgrSearch}
          type="text"
          placeholder="Search character, account or clan…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />

        <div className={styles.accessMgrList}>
          {isLoading && <p className={styles.accessMgrEmpty}>Loading…</p>}
          {error && <p className={styles.accessMgrEmpty}>Failed to load.</p>}
          {!isLoading && !error && keys.length === 0 && (
            <p className={styles.accessMgrEmpty}>You have no overlays to share.</p>
          )}
          {!isLoading && !error && keys.length > 0 && users.length === 0 && (
            <p className={styles.accessMgrEmpty}>No matching users.</p>
          )}
          {keys.length > 0 && users.map(u => {
            const isNosferatu = u.clan === 'Nosferatu';
            const isAdminUser = u.role === 'admin';
            return (
              <div key={u.id} className={styles.accessMgrRow}>
                <div className={styles.accessMgrWho}>
                  <span className={styles.accessMgrName}>{u.name}</span>
                  <span className={styles.accessMgrMeta}>
                    {u.clan || u.role}{u.clan && u.role !== 'user' ? ` · ${u.role}` : ''}
                  </span>
                </div>
                <div className={styles.accessMgrChips}>
                  {keys.map(k => {
                    const auto =
                      isAdminUser ||
                      (isNosferatu && (k === 'necropolis_old' || k === 'necropolis_new'));
                    const on = auto || u.granted.includes(k);
                    // non-admins can only revoke what they personally granted
                    const canRevoke = isAdmin || u.grantedByMe.includes(k);
                    const locked = auto || (on && !canRevoke) || grant.isPending;
                    return (
                      <button
                        key={k}
                        type="button"
                        className={styles.accessMgrChip}
                        data-on={on}
                        data-auto={auto}
                        disabled={locked}
                        title={
                          auto
                            ? (isAdminUser ? 'Admin — always has access' : 'Nosferatu — automatic')
                            : on
                              ? (canRevoke ? 'Click to revoke' : 'Granted by someone else')
                              : 'Click to grant'
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
