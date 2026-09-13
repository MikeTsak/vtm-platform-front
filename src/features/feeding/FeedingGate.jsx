// src/features/feeding/FeedingGate.jsx
//
// Gates the downtimes page behind this cycle's Feeding roll. Renders nothing
// (pass-through) when the system is disabled or already resolved this cycle;
// otherwise blocks `children` (the Actions/Projects tabs) entirely.
//
// The roll itself is server-authoritative and persisted the instant it's
// made (see back/routes/feeding.js) — reloading this page always reconstructs
// the exact same pending roll via GET /feeding/status. From a pending roll
// there are exactly two moves: Accept, or spend Willpower to reroll (once).
// There is no way to discard a roll and start over.
import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../core/api';
import { toast } from 'sonner';
import { Skeleton } from 'boneyard-js/react';
import styles from '../../styles/Feeding.module.css';
import FaGlyph from '../../ui/FaGlyph';
import { FEEDING_ICONS } from '../../data/feedingIcons';
import { DIVISION_NAMES } from '../../constants/divisionNames';
import { HUNTING_DIFFICULTY, huntingLabel } from '../domains/data/huntingDifficulty';
import { getDivisionChasse } from '../domains/data/chasseMerits';
import { distanceKm, CENTRE_DIVISION } from '../domains/data/divisionDistance';
import { safetyColor, difficultyColor } from './feedingScales';

function divisionName(division) {
  return DIVISION_NAMES[division] || `Division ${division}`;
}

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target) return 'calculating…';
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return 'due';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${days}d ${hours}h ${mins}m`;
}

const TIER_LABEL = {
  bestial_failure: 'Bestial Failure',
  failure: 'Failure',
  success: 'Success',
  critical: 'Critical Win',
  messy_critical: 'Messy Critical',
  herd: 'Herd Fed',
};
const TIER_CLASS = {
  bestial_failure: styles.outcomeBestialFailure,
  failure: styles.outcomeFailure,
  success: styles.outcomeSuccess,
  critical: styles.outcomeCritical,
  messy_critical: styles.outcomeMessyCritical,
  herd: styles.outcomeSuccess,
};
const TIER_ICON = {
  bestial_failure: FEEDING_ICONS.skull,
  failure: FEEDING_ICONS.triangleExclamation,
  success: FEEDING_ICONS.circleCheck,
  critical: FEEDING_ICONS.circleCheck,
  messy_critical: FEEDING_ICONS.triangleExclamation,
  herd: FEEDING_ICONS.circleCheck,
};

function IconBadge({ icon, size = 15, small = false }) {
  return (
    <span className={`${styles.iconBadge} ${small ? styles.iconBadgeSm : ''}`}>
      <FaGlyph icon={icon} size={size} />
    </span>
  );
}

function StatChip({ icon, color, children }) {
  return (
    <span className={styles.statChip} style={color ? { color } : undefined}>
      <span className={styles.statChipIcon}>
        <FaGlyph icon={icon} size={11} />
      </span>
      {children}
    </span>
  );
}

// Safety (0-10, green=safe -> red=exposed) and Hunting Difficulty (2-7,
// blue=easiest -> orange=hardest) are two unrelated numbers with two
// unrelated meanings — see the in-app copy below — so each gets its own
// icon and its own color scale rather than looking like the same stat.
function SafetyPill({ value }) {
  const color = safetyColor(value);
  return (
    <span className={styles.metricPill} style={{ color, borderColor: color }} title="Masquerade Safety: how exposed this domain already is, 0 (blown) to 10 (pristine). Moves only from what happens here: hunts gone wrong, or quiet neglect.">
      <FaGlyph icon={FEEDING_ICONS.shieldHalved} size={11} />
      Safety {value}
    </span>
  );
}

function DifficultyPill({ value }) {
  const color = difficultyColor(value);
  return (
    <span className={styles.metricPill} style={{ color, borderColor: color }} title="Hunting Difficulty: how hard it is to find a safe victim here, fixed by real population density. 2 is easiest, 7 is Lethal.">
      <FaGlyph icon={FEEDING_ICONS.gauge} size={11} />
      Diff {value} ({huntingLabel(value)})
    </span>
  );
}

function ChasseBadges({ merits }) {
  if (!merits.length) return null;
  return (
    <>
      {merits.map((m) => (
        <span
          key={m.key}
          className={styles.chasseBadge}
          style={{ '--chasse-color': m.color }}
          title={`${m.name} Chasse Merit: +1 hunting die here for your Predator Type.`}
        >
          <FaGlyph icon={m.icon} size={11} />
          {m.name} +1
        </span>
      ))}
    </>
  );
}

function Die({ value, isHunger, selectable, selected, onClick }) {
  const success = value >= 6;
  let cls = styles.die;
  if (isHunger) cls += ` ${success ? styles.dieHungerSuccess : styles.dieHunger}`;
  else if (success) cls += ` ${styles.dieSuccess}`;
  if (selectable) cls += ` ${styles.dieSelectable}`;
  if (selected) cls += ` ${styles.dieSelected}`;
  return <div className={cls} onClick={selectable ? onClick : undefined}>{value}</div>;
}

function DicePreview({ feeding, selectable, selected, onToggle }) {
  const normal = feeding.normal_dice || [];
  const hunger = feeding.hunger_dice || [];
  return (
    <div className={styles.diceRow}>
      {normal.map((v, i) => (
        <Die key={`n${i}`} value={v} selectable={selectable} selected={selected?.includes(i)} onClick={() => onToggle?.(i)} />
      ))}
      {hunger.map((v, i) => (
        <Die key={`h${i}`} value={v} isHunger />
      ))}
    </div>
  );
}

function DeltaLine({ deltas }) {
  if (!deltas) return null;
  const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
  return (
    <div className={styles.deltaRow}>
      <span className={styles.deltaChip}><FaGlyph icon={FEEDING_ICONS.droplet} size={11} />Hunger {sign(deltas.hunger)}</span>
      <span className={styles.deltaChip}><FaGlyph icon={FEEDING_ICONS.shieldHalved} size={11} />Domain Safety {sign(deltas.safety)}</span>
    </div>
  );
}

function PendingResult({ status }) {
  const feeding = status.pending;
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState([]);

  const rerollMutation = useMutation({
    mutationFn: () => api.post(`/feeding/${feeding.id}/reroll`, { selectedIndices: selected }),
    onSuccess: () => {
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ['feeding', 'status'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Reroll failed'),
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.post(`/feeding/${feeding.id}/confirm`),
    onSuccess: () => {
      toast.success('Feeding resolved.');
      queryClient.invalidateQueries({ queryKey: ['feeding', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Confirm failed'),
  });

  const canReroll = !feeding.wp_rerolled;

  return (
    <div className={styles.gate}>
      <h2 className={styles.title}>
        <IconBadge icon={FEEDING_ICONS.droplet} />
        Your Hunt in {divisionName(feeding.division)}
      </h2>
      <div className={styles.statChipRow}>
        <StatChip icon={FEEDING_ICONS.diceD20}>{feeding.pool_label} · Pool {feeding.dice_pool}</StatChip>
        {feeding.bonus_dice > 0 && <StatChip icon={FEEDING_ICONS.locationDot}>+{feeding.bonus_dice} Chasse</StatChip>}
        <StatChip icon={FEEDING_ICONS.gauge} color={difficultyColor(feeding.difficulty)}>Difficulty {feeding.difficulty}</StatChip>
      </div>

      <div className={`${styles.outcomeBanner} ${TIER_CLASS[feeding.outcome]}`}>
        <IconBadge icon={TIER_ICON[feeding.outcome]} size={16} small />
        {TIER_LABEL[feeding.outcome] || feeding.outcome}
      </div>

      <DicePreview
        feeding={feeding}
        selectable={canReroll}
        selected={selected}
        onToggle={(i) => setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : prev.length < 3 ? [...prev, i] : prev))}
      />

      <p className={styles.projectedNote}>Projected only, not yet applied. Accept to lock it in.</p>

      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
          <FaGlyph icon={FEEDING_ICONS.check} size={14} />
          Accept Result
        </button>
        {canReroll && (
          <button
            className={styles.btnGhost}
            onClick={() => rerollMutation.mutate()}
            disabled={rerollMutation.isPending || selected.length === 0}
            title={selected.length === 0 ? 'Click up to 3 dice above to choose which ones to reroll' : undefined}
          >
            <FaGlyph icon={FEEDING_ICONS.arrowsRotate} size={14} />
            Spend Willpower to Reroll {selected.length > 0 ? `(${selected.length})` : ''}
          </button>
        )}
      </div>
      {canReroll && (
        <p className={styles.projectedNote} style={{ marginTop: '0.75rem' }}>
          Select up to 3 dice above, then spend Willpower to reroll them. This can only be done once per hunt.
        </p>
      )}
    </div>
  );
}

function ResolvedBanner({ status }) {
  const feeding = status.resolvedThisCycle;
  return (
    <div className={styles.fedBanner}>
      <div className={styles.fedBannerLeft}>
        <IconBadge icon={FEEDING_ICONS.circleCheck} size={15} small />
        <span>
          <strong>Fed this cycle in</strong> {divisionName(feeding.division)} ·{' '}
          <span className={TIER_CLASS[feeding.outcome]} style={{ padding: '2px 8px', borderRadius: 4 }}>
            {TIER_LABEL[feeding.outcome] || feeding.outcome}
          </span>
        </span>
      </div>
      <DeltaLine deltas={{ hunger: feeding.hunger_delta, safety: feeding.safety_delta }} />
    </div>
  );
}

function Picker({ status }) {
  const countdown = useCountdown(status?.cycleEnd);
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(!status.myDivision);
  const [division, setDivision] = useState(status.myDivision || null);
  const [poolIndex, setPoolIndex] = useState(0);
  const [ack, setAck] = useState(false);

  const { data: claimsData } = useQuery({
    queryKey: ['domain-claims'],
    queryFn: async () => (await api.get('/domain-claims')).data,
    enabled: expanded,
  });
  const safetyByDivision = useMemo(() => {
    const map = {};
    (claimsData?.claims || []).forEach((c) => { map[c.division] = c.safety_rating; });
    return map;
  }, [claimsData]);

  // Distance reads from the player's own domain when they have one (since
  // that's the meaningful reference once you're deciding whether to leave
  // it), otherwise from the city centre (division 39, Athina).
  const referenceDivision = status.myDivision || CENTRE_DIVISION;
  const referenceLabel = status.myDivision ? 'your domain' : 'centre';

  // Safer domains first, then closer to the reference point among domains
  // with the same Safety.
  const divisions = useMemo(() => {
    const all = Object.keys(HUNTING_DIFFICULTY).map(Number);
    return all.sort((a, b) => {
      const safetyA = safetyByDivision[a] ?? 10;
      const safetyB = safetyByDivision[b] ?? 10;
      if (safetyB !== safetyA) return safetyB - safetyA;
      const distA = distanceKm(a, referenceDivision) ?? Infinity;
      const distB = distanceKm(b, referenceDivision) ?? Infinity;
      return distA - distB;
    });
  }, [safetyByDivision, referenceDivision]);

  const rollMutation = useMutation({
    mutationFn: () => api.post('/feeding/roll', { division, poolIndex }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding', 'status'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Roll failed'),
  });

  const herdMutation = useMutation({
    mutationFn: () => api.post('/feeding/herd-feed', { division }),
    onSuccess: (res) => {
      const d = res.data;
      toast.success(`Herd fed Hunger ${d.hungerBefore} → ${d.hungerAfter}. Herd pool: ${d.herdCurrent}/${d.herdDots} remaining.`);
      queryClient.invalidateQueries({ queryKey: ['feeding', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Herd feed failed'),
  });

  return (
    <div className={styles.gate}>
      <h2 className={styles.title}>
        <IconBadge icon={FEEDING_ICONS.droplet} />
        Feeding
      </h2>
      
      {!status.canAutomate ? (
        <p className={styles.subtitle}>
          {status.predatorType
            ? `${status.predatorType} isn't automatable for the Feeding roll. It's GM-adjudicated per the V5 rules.`
            : 'Set a Predator Type on your character sheet before feeding.'}
          {' '}Use a Monthly Action to describe your feeding this cycle instead. The tabs below remain locked otherwise.
        </p>
      ) : (
        <p className={styles.subtitle}>
          You must feed before submitting downtime actions this cycle. Pick where and how to hunt.
        </p>
      )}

      <div className={styles.statChipRow}>
        <StatChip icon={FEEDING_ICONS.skull}>Predator Type: {status.predatorType}</StatChip>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          <FaGlyph icon={FEEDING_ICONS.locationDot} size={13} />
          Where to hunt
        </div>
        {status.myDivision && !expanded ? (
          <button className={styles.defaultDomainBtn} onClick={() => setDivision(status.myDivision)}>
            <FaGlyph icon={FEEDING_ICONS.locationDot} size={15} />
            Hunt in {divisionName(status.myDivision)} (your domain)
          </button>
        ) : null}
        {status.myDivision && (
          <div>
            <button className={styles.expandLink} onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Hide domain list' : 'Choose a different domain instead'}
            </button>
          </div>
        )}
        {expanded && (
          <>
            <p className={styles.legendNote}>
              Sorted safest first, then closest to {referenceLabel}. Safety runs green (safe) to red (exposed);
              Difficulty runs blue (easiest) to orange (hardest). They're independent, so a domain can be both easy and unsafe.
            </p>
            <div className={styles.pickerBox}>
              {divisions.map((div) => {
                const info = HUNTING_DIFFICULTY[div];
                const chasse = getDivisionChasse(div).filter((m) => m.favours.includes(status.predatorType));
                const safety = safetyByDivision[div] ?? 10;
                const km = distanceKm(div, referenceDivision);
                const isSelected = division === div;
                return (
                  <div
                    key={div}
                    className={`${styles.divisionRow} ${isSelected ? styles.divisionRowActive : ''}`}
                    onClick={() => setDivision(div)}
                  >
                    <span className={styles.safetyDot} style={{ background: safetyColor(safety) }} title={`Safety ${safety}`} />
                    <span className={styles.divisionInfo}>
                      <span className={styles.divisionName}>
                        {divisionName(div)}{div === status.myDivision ? ' (yours)' : ''}
                      </span>
                      <span className={styles.divisionMeta}>
                        <SafetyPill value={safety} />
                        <DifficultyPill value={info.difficulty} />
                        {km !== null && <span className={styles.distancePill}>{km === 0 ? `At ${referenceLabel}` : `${km} km from ${referenceLabel}`}</span>}
                        <ChasseBadges merits={chasse} />
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {status.canAutomate && (
        <>
          <div className={styles.section}>
            <div className={styles.sectionLabel}>
              <FaGlyph icon={FEEDING_ICONS.diceD20} size={13} />
              How to hunt
            </div>
        <div className={styles.poolChoices}>
          {status.pools.map((p, i) => (
            <button
              key={p.pool}
              className={`${styles.poolBtn} ${poolIndex === i ? styles.poolBtnActive : ''} ${status.pools.length === 1 ? styles.poolBtnSingle : ''}`}
              onClick={() => setPoolIndex(i)}
            >
              <span>{p.pool}</span>
              <span className={styles.poolTotal}>
                <FaGlyph icon={FEEDING_ICONS.diceD20} size={12} />
                {p.total}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.warningBox}>
        <IconBadge icon={FEEDING_ICONS.triangleExclamation} size={14} small />
        <span>
          Once you roll, the result is <strong>final</strong>. You may only Accept it or spend one Willpower point to
          reroll up to three dice. There is no way to cancel, restart, or choose a different domain afterward.
        </span>
      </div>

          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            I understand this roll is final.
          </label>
        </>
      )}

      <div className={styles.actions} style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {status.canAutomate && (
          <button
            className={styles.btnPrimary}
            disabled={!division || !ack || rollMutation.isPending}
            onClick={() => rollMutation.mutate()}
          >
            <FaGlyph icon={FEEDING_ICONS.diceD20} size={14} />
            Roll to Feed
          </button>
        )}

        {status.herdDots >= 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <button
              className={styles.btnGhost}
              disabled={herdMutation.isPending || status.herdCurrent < 1 || !division}
              onClick={() => herdMutation.mutate()}
              title={
                !division
                  ? `Select a domain above first.`
                  : status.herdCurrent < 1
                  ? `Herd depleted restores 1 point next cycle (${status.herdDots} max)`
                  : `Use 1 Herd point to slake 1 hunger without a roll. Hunger cannot go below 1.`
              }
            >
              <FaGlyph icon={FEEDING_ICONS.droplet} size={14} />
              Use Herd ({status.herdCurrent}/{status.herdDots}●)
              {status.herdCurrent < 1 ? ' Depleted' : ' No Roll'}
            </button>
            {status.herdCurrent < status.herdDots && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', paddingLeft: '0.25rem' }}>
                <FaGlyph icon={FEEDING_ICONS.clock} size={11} style={{ marginRight: 4, verticalAlign: '-1px' }} />
                Next point heals in {countdown}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedingGateInner({ status, children }) {
  if (!status) return null;
  if (status.enabled === false) return <>{children}</>;
  if (status.noCharacter) return <>{children}</>;

  if (status.pending) {
    return <PendingResult status={status} />;
  }

  if (status.resolvedThisCycle) {
    return (
      <>
        <ResolvedBanner status={status} />
        {children}
      </>
    );
  }

  return <Picker status={status} />;
}

export default function FeedingGate({ children }) {
  const { data: status, isLoading } = useQuery({
    queryKey: ['feeding', 'status'],
    queryFn: async () => (await api.get('/feeding/status')).data,
  });

  return (
    <Skeleton loading={isLoading} name="feeding-gate">
      <FeedingGateInner status={status} children={children} />
    </Skeleton>
  );
}
