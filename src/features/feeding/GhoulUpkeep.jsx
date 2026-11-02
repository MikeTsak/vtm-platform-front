// src/features/feeding/GhoulUpkeep.jsx
//
// Ghoul upkeep on the Feeding page. Every cycle each ghoul needs a feeding: a
// Rouse Check from a vampire (Hunger +1 on a fail). Feeding early lets a
// player hunt the Hunger back down; whatever is unfed at `upkeepAt` is fed
// automatically (personal: the owner; coterie: a random member below Hunger 5).
// A ghoul that is let go, or whose feeder sits at Hunger 5, starves: it loses
// its powers until it is fed in a later cycle. Rules live in
// back/services/ghoulFeeding.js.
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/Feeding.module.css';
import FaGlyph from '../../ui/FaGlyph';
import Avatar from '../../components/Avatar';
import D10Die from '../../ui/D10Die';
import { FEEDING_ICONS } from '../../data/feedingIcons';

const GHOUL_STATE = {
  fed: { label: 'Fed', icon: FEEDING_ICONS.circleCheck, className: styles.ghoulFed },
  hungry: { label: 'Needs feeding', icon: FEEDING_ICONS.triangleExclamation, className: styles.ghoulHungry },
  starved: { label: 'Starved: powers lost', icon: FEEDING_ICONS.skull, className: styles.ghoulStarved },
};

// The ghoul's upkeep state as a small pill (Feeding page, Retainers page).
export function GhoulStateBadge({ state }) {
  const s = GHOUL_STATE[state] || GHOUL_STATE.hungry;
  return (
    <span className={`${styles.ghoulState} ${s.className}`}>
      <FaGlyph icon={s.icon} size={11} />
      {s.label}
    </span>
  );
}

const fmt = (value) => (value
  ? new Date(value).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  : null);

function fedNote(current) {
  if (!current) return null;
  if (current.status === 'starved') {
    return current.method === 'let_starve' ? 'Let go unfed this cycle.' : 'Nobody had blood to spare this cycle.';
  }
  const how = { early: 'early', upkeep: 'at upkeep', random: 'at upkeep (random member)' }[current.method] || '';
  const rouse = current.hunger_after > current.hunger_before ? `Hunger rose to ${current.hunger_after}` : 'the Rouse Check held';
  return `Fed by ${current.fed_by_name || 'someone'} ${how}: ${rouse}.`;
}

function useRefreshFeeding() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['feeding'] });
    queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
  };
}

function TierDots({ tier }) {
  return (
    <span className={styles.ghoulTier} title={`Tier ${tier}`}>
      {[1, 2, 3].map((n) => <span key={n} className={n <= tier ? styles.ghoulTierOn : undefined} />)}
    </span>
  );
}

const TUMBLE_MS = 1300;

// Pop-up that tumbles the Rouse dice the server already threw, then reveals them.
// `roll` = { items: [{ id, name, dice, success, hungerAfter }] } or null.
function RouseRollModal({ roll, onClose }) {
  const [rolling, setRolling] = useState(true);
  useEffect(() => {
    setRolling(true);
    const t = setTimeout(() => setRolling(false), TUMBLE_MS);
    return () => clearTimeout(t);
  }, [roll]);
  if (!roll) return null;

  const rose = roll.items.filter((i) => !i.success).length;
  const last = roll.items[roll.items.length - 1];
  const summary = rose
    ? `Hunger rose ${rose} time${rose === 1 ? '' : 's'}, now ${last.hungerAfter}.`
    : 'Every Rouse Check held.';
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="rouse-title" onClick={rolling ? undefined : onClose}>
      <div className={`${styles.gate} ${styles.modal}`} onClick={(e) => e.stopPropagation()}>
        <h2 id="rouse-title" className={styles.title}>
          <span className={styles.iconBadge}><FaGlyph icon={FEEDING_ICONS.droplet} size={15} /></span>
          {rolling ? 'Rolling Rouse Check...' : 'Rouse Check'}
        </h2>
        <div className={styles.rouseRow} aria-live="polite">
          {roll.items.map((item) => (
            <div key={item.id} className={styles.rouseItem}>
              <span className={styles.rouseName}>{item.name}</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {item.dice.map((v, i) => (
                  <D10Die key={i} index={i} value={v} isHunger isRolling={rolling} size="md" showNumber poolCount={roll.items.length} />
                ))}
              </div>
              <span className={`${styles.rouseResult} ${item.success ? styles.rouseOk : styles.rouseFail}`}>
                {rolling ? '' : item.success ? 'Held' : 'Hunger +1'}
              </span>
            </div>
          ))}
        </div>
        <p className={styles.rouseStatus}>{rolling ? '' : summary}</p>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={onClose} disabled={rolling}>Close</button>
        </div>
      </div>
    </div>
  );
}

function GhoulCard({ ghoul, onRoll }) {
  const refresh = useRefreshFeeding();

  const feed = useMutation({
    mutationFn: () => api.post(`/feeding/ghouls/${ghoul.id}/feed`),
    onSuccess: ({ data }) => {
      onRoll([{ id: ghoul.id, name: ghoul.name, dice: data.dice, success: data.success, hungerAfter: data.hungerAfter }]);
      refresh();
    },
    onError: (e) => toast.error(formatApiError(e, 'Feeding failed')),
  });

  const letStarve = useMutation({
    mutationFn: (value) => api.post(`/feeding/ghouls/${ghoul.id}/let-starve`, { value }),
    onSuccess: refresh,
    onError: (e) => toast.error(formatApiError(e, 'Update failed')),
  });

  const stateClass = { fed: styles.ghoulCardFed, starved: styles.ghoulCardStarved }[ghoul.state] || styles.ghoulCardHungry;
  return (
    <article className={`${styles.ghoulCard} ${stateClass}`}>
      <div className={styles.ghoulHead}>
        <Avatar retainerId={ghoul.id} size={44} fallback="/img/ATT-logo(1).webp" />
        <div className={styles.ghoulIdentity}>
          <span className={styles.ghoulName}>{ghoul.name}</span>
          <span className={styles.ghoulMeta}>
            <TierDots tier={ghoul.tier} />
            {ghoul.coterie_id ? ghoul.coterie_name : 'Personal ghoul'}
          </span>
          {ghoul.coterie_id && <span className={styles.ghoulMeta}>Domitor: {ghoul.domitor_name || 'unknown'}</span>}
        </div>
      </div>
      <GhoulStateBadge state={ghoul.state} />
      {ghoul.current && <p className={styles.ghoulNote}>{fedNote(ghoul.current)}</p>}
      {ghoul.canFeed && (
        <div className={styles.ghoulActions}>
          <button
            className={styles.ghoulFeedBtn}
            disabled={feed.isPending || ghoul.let_starve}
            onClick={() => feed.mutate()}
            title="Costs you a Rouse Check: on 1-5 your Hunger rises by 1"
          >
            <FaGlyph icon={FEEDING_ICONS.droplet} size={13} />
            Feed now
          </button>
          {ghoul.canLetStarve && (
            <label className={styles.ghoulToggle} title="Skip the Rouse Check: the ghoul starves at upkeep and loses their powers until fed again">
              <input
                type="checkbox"
                checked={ghoul.let_starve}
                disabled={letStarve.isPending}
                onChange={(e) => letStarve.mutate(e.target.checked)}
              />
              Let go unfed
            </label>
          )}
        </div>
      )}
    </article>
  );
}

export default function GhoulUpkeep() {
  const refresh = useRefreshFeeding();
  const [roll, setRoll] = useState(null);
  const showRoll = (items) => setRoll({ items });
  const { data } = useQuery({
    queryKey: ['feeding', 'ghouls'],
    queryFn: async () => (await api.get('/feeding/ghouls')).data,
  });

  const feedAll = useMutation({
    mutationFn: () => api.post('/feeding/ghouls/feed-all'),
    onSuccess: ({ data: r }) => {
      if (r.fed.length) showRoll(r.fed);
      if (r.stopped) toast.error(r.stopped);
      refresh();
    },
    onError: (e) => toast.error(formatApiError(e, 'Feeding failed')),
  });

  const ghouls = data?.ghouls || [];
  if (!ghouls.length) return null;

  // What the upkeep will cost if nothing more is done: personal ghouls are paid by
  // their owner, coterie ghouls by a random member (maybe you).
  const pending = ghouls.filter((g) => g.canFeed && !g.let_starve);
  const personal = pending.filter((g) => !g.coterie_id).length;
  const shared = pending.length - personal;

  return (
    <div className={styles.gate}>
      <h2 className={styles.title}>
        <span className={styles.iconBadge}><FaGlyph icon={FEEDING_ICONS.droplet} size={15} /></span>
        Ghoul Upkeep
      </h2>
      <p className={styles.subtitle}>
        Every ghoul needs blood once a cycle, and each feeding costs the feeder a Rouse Check.
        {data.upkeepAt ? ` Ghouls still unfed on ${fmt(data.upkeepAt)} are fed automatically` : ' Unfed ghouls are fed automatically before the event'}
        {' '}(coterie ghouls by a random member). Feed early and you can still hunt the Hunger back down.
      </p>

      {pending.length > 0 && (
        <div className={styles.ghoulForecast}>
          <FaGlyph icon={FEEDING_ICONS.triangleExclamation} size={14} />
          <span>
            {personal > 0 && <>Upkeep will cost you up to <strong>+{personal} Hunger</strong> ({personal} Rouse Check{personal === 1 ? '' : 's'}). </>}
            {shared > 0 && <>{shared} coterie ghoul{shared === 1 ? '' : 's'} still need{shared === 1 ? 's' : ''} a feeder: if nobody steps up, a random member pays. </>}
          </span>
          <button className={styles.ghoulFeedBtn} disabled={feedAll.isPending} onClick={() => feedAll.mutate()}>
            <FaGlyph icon={FEEDING_ICONS.droplet} size={13} />
            Feed all ({pending.length})
          </button>
        </div>
      )}

      <div className={styles.ghoulGrid}>
        {ghouls.map((g) => <GhoulCard key={g.id} ghoul={g} onRoll={showRoll} />)}
      </div>
      <RouseRollModal roll={roll} onClose={() => setRoll(null)} />
      <p className={styles.legendNote} style={{ marginTop: '1rem' }}>
        A ghoul let go, or whose feeder is at Hunger 5, starves and loses their powers until fed again.
      </p>
    </div>
  );
}
