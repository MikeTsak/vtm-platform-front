// src/features/coterie/CoterieBuilder.jsx
//
// Coterie creation and editing.
//
// Two rules bugs from the previous builder are fixed here and are worth
// naming, because they changed every typed coterie's arithmetic:
//
//  1. A coterie type's Domain dots were treated as free — only dots *above*
//     the type baseline counted against the pool. The corebook is explicit
//     (p.197): "If your coterie matches a given type, subtract the listed
//     costs from the coterie pool." Every Domain dot is now paid for.
//  2. Those baseline dots were hard-locked so they could not be lowered. The
//     corebook's own Maréchal example (p.195) has the troupe trade all four
//     of their Domain dots for Contacts and a Haven. The baseline is now a
//     marker, not a floor.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../../styles/Coteries.module.css';
import Avatar from '../../components/Avatar';
import { Card, DotPicker, Empty, Field, IssueList, Muted, NumberInput } from './ui';
import AdvantagePicker from './AdvantagePicker';
import { ALL_COTERIE_NAMES, getCoterie } from '../../data/cotteries';
import {
  COTERIE_BACKGROUNDS,
  COTERIE_BACKGROUND_NOTE,
  COTERIE_FLAWS,
  COTERIE_FLAW_NOTE,
  COTERIE_MERITS,
  DOMAIN_TRAITS,
  DOMAIN_TRAIT_INFO,
  MERIT_GROUPS,
  MIN_MEMBERS,
  CHASSE_SIZE_TABLE,
  huntingDifficulty,
  lienBonusDice,
  portillonPenaltyDice,
  seedFromType,
  validateCoterie,
  XP_PER_DOT,
} from '../../data/coterieRules';

const emptyState = () => ({
  name: '',
  concept: '',
  type: '',
  domainId: '',
  traits: { chasse: 0, lien: 0, portillon: 0 },
  backgrounds: [],
  merits: [],
  flaws: [],
  members: [],
  pointsPerMember: 1,
  bonusPoints: 0,
  required: null,
  extras: [],
  rulesOverride: false,
});

/* ------------------------------------------------------------------ *
 * Members
 * ------------------------------------------------------------------ */

function MembersPicker({ members, onChange, roster, currentUser, isAdmin }) {
  const [q, setQ] = useState('');

  const chosen = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (roster || [])
      // A coterie is made of characters — an account with no sheet cannot join,
      // and the server rejects it, so it is filtered out here too.
      .filter((u) => !!u.char_id && !chosen.has(u.id))
      .filter((u) => !s
        || (u.char_name || '').toLowerCase().includes(s)
        || (u.display_name || '').toLowerCase().includes(s)
        || (u.clan || '').toLowerCase().includes(s))
      .slice(0, 40);
  }, [q, roster, chosen]);

  const add = (u) => onChange([...members, {
    id: u.id,
    name: u.char_name || u.display_name || `User #${u.id}`,
    clan: u.clan || null,
  }]);

  const remove = (id) => onChange(members.filter((m) => m.id !== id));

  return (
    <Card
      title="Members"
      subtitle={`Minimum ${MIN_MEMBERS} — each contributes dots to the pool`}
      tone={members.length < MIN_MEMBERS ? 'warn' : undefined}
      actions={<span className={styles.countPill}>{members.length}</span>}
    >
      {members.length === 0 ? (
        <Empty>No members yet.</Empty>
      ) : (
        <ul className={styles.roster}>
          {members.map((m) => {
            // A non-admin may not remove themselves — the server requires the
            // caller to remain in the coterie they are editing.
            const locked = !isAdmin && currentUser && currentUser.id === m.id;
            return (
              <li key={m.id} className={styles.rosterItem}>
                <div className={styles.rosterAvatar}>
                  <Avatar userId={m.id} size="100%" style={{ width: '100%', height: '100%' }} />
                </div>
                <div className={styles.rosterBody}>
                  <div className={styles.rosterName}>{m.name}</div>
                  {m.clan && <div className={styles.rosterClan}>{m.clan}</div>}
                </div>
                {!locked && (
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={() => remove(m.id)}
                    aria-label={`Remove ${m.name}`}
                  >
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <input
        className={styles.input}
        placeholder="Find a Kindred by name or clan…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className={styles.optionScroll}>
        {results.length === 0 ? (
          <Empty>{q ? `Nobody matches “${q}”.` : 'Everyone with a sheet is already listed.'}</Empty>
        ) : results.map((u) => (
          <button key={u.id} type="button" className={styles.optionRow} onClick={() => add(u)}>
            <span className={styles.optionRowHead}>
              <span className={styles.optionName}>{u.char_name || u.display_name}</span>
              {u.clan && <span className={styles.optionRange}>{u.clan}</span>}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Builder
 * ------------------------------------------------------------------ */

export default function CoterieBuilder({
  initial,
  editingId,
  domainOptions,
  roster,
  currentUser,
  isAdmin,
  claimedDomains,
  personalXp,
  saving,
  onSave,
  onCancel,
}) {
  const [s, setS] = useState(() => ({ ...emptyState(), ...(initial || {}) }));
  const set = useCallback((patch) => setS((prev) => ({ ...prev, ...patch })), []);

  useEffect(() => {
    if (initial) setS({ ...emptyState(), ...initial });
  }, [initial]);

  // Seed a brand-new coterie with its author, so a player never saves one
  // they are not in (which the server would reject anyway).
  useEffect(() => {
    if (editingId || !currentUser || isAdmin) return;
    setS((prev) => {
      if (prev.members.some((m) => m.id === currentUser.id)) return prev;
      const me = (roster || []).find((u) => u.id === currentUser.id);
      if (!me || !me.char_id) return prev;
      return {
        ...prev,
        members: [...prev.members, {
          id: currentUser.id,
          name: me.char_name || me.display_name || 'You',
          clan: me.clan || null,
        }],
      };
    });
  }, [editingId, currentUser, isAdmin, roster]);

  const typeData = useMemo(() => (s.type ? getCoterie(s.type) : null), [s.type]);
  const typeSeed = useMemo(() => (typeData ? seedFromType(typeData) : null), [typeData]);

  const applyType = (typeName) => {
    const data = getCoterie(typeName);
    if (!data) { set({ type: typeName }); return; }
    const seed = seedFromType(data);
    set({
      type: typeName,
      traits: seed.traits,
      backgrounds: seed.backgrounds,
      flaws: seed.flaws,
      required: seed.required,
      extras: Array.isArray(data.extras) ? data.extras : [],
    });
  };

  const clearType = () => set({
    type: '', required: null, extras: [],
    traits: { chasse: 0, lien: 0, portillon: 0 },
    backgrounds: [], flaws: [],
  });

  const check = useMemo(() => validateCoterie({
    name: s.name,
    memberCount: s.members.length,
    pointsPerMember: s.pointsPerMember,
    bonusPoints: s.bonusPoints,
    domainId: s.domainId,
    traits: s.traits,
    backgrounds: s.backgrounds,
    merits: s.merits,
    flaws: s.flaws,
    rulesOverride: s.rulesOverride,
  }), [s]);

  const { budget } = check;
  
  const xpCost = s.bonusPoints * (XP_PER_DOT || 3);
  const canAffordBonus = editingId ? true : (personalXp >= xpCost);
  const canSave = check.errors.length === 0 && !saving && (canAffordBonus || isAdmin || s.rulesOverride);

  // A Domain Merit is meaningless without dots in the trait it hangs off.
  const meritAvailability = useCallback((key, def) => {
    if (def.trait && (Number(s.traits[def.trait]) || 0) < 1) {
      return `Needs at least one dot of ${DOMAIN_TRAIT_INFO[def.trait].name}.`;
    }
    if (def.clan && !s.members.some((m) => (m.clan || '') === def.clan)) {
      return `No ${def.clan} in the coterie yet — allowed, but the Merit only works if one joins.`;
    }
    return null;
  }, [s.traits, s.members]);

  const flawAvailability = useCallback((key, def) => {
    if (def.trait && (Number(s.traits[def.trait]) || 0) < 1) {
      return `Needs at least one dot of ${DOMAIN_TRAIT_INFO[def.trait].name}.`;
    }
    return null;
  }, [s.traits]);

  const domainTaken = useMemo(() => {
    if (!s.domainId) return null;
    const clash = (claimedDomains || [])
      .find((c) => Number(c.domain_id) === Number(s.domainId) && c.id !== editingId);
    return clash ? clash.name : null;
  }, [s.domainId, claimedDomains, editingId]);

  const difficulty = huntingDifficulty(s.traits.chasse);

  const submit = () => onSave({
    name: s.name.trim(),
    concept: s.concept.trim() || null,
    type: s.type || null,
    domain_id: s.domainId ? Number(s.domainId) : null,
    traits: s.traits,
    required: s.required,
    backgrounds: s.backgrounds,
    merits: s.merits,
    flaws: s.flaws,
    extras: s.extras,
    points_per_member: s.pointsPerMember,
    bonus_points: s.bonusPoints,
    rules_override: s.rulesOverride,
    members: s.members.map((m) => ({ user_id: m.id, display_name: m.name })),
  });

  const spentPct = budget.pool.total > 0
    ? Math.min(100, (budget.spend.total / budget.pool.total) * 100)
    : 0;

  return (
    <div className={styles.builder}>
      {/* ---- Sticky budget bar: the number you are always working against ---- */}
      <div className={styles.budgetBar} data-state={budget.remaining < 0 ? 'over' : budget.remaining === 0 ? 'exact' : 'under'}>
        <div className={styles.budgetHead}>
          <span className={styles.budgetLabel}>Coterie pool</span>
          <span className={styles.budgetFigure}>
            <b>{budget.spend.total}</b> / {budget.pool.total}
          </span>
        </div>
        <div className={styles.budgetTrack}>
          <div className={styles.budgetFill} style={{ width: `${spentPct}%` }} />
        </div>
        <div className={styles.budgetBreakdown}>
          <span>{budget.pool.base} from {s.members.length} members</span>
          {budget.pool.bonus > 0 && <span>+{budget.pool.bonus} contributed</span>}
          {budget.pool.fromFlaws > 0 && <span>+{budget.pool.fromFlaws} from Flaws</span>}
          <span className={styles.budgetRemaining}>
            {budget.remaining >= 0 ? `${budget.remaining} left` : `${Math.abs(budget.remaining)} over`}
          </span>
        </div>
      </div>

      <div className={styles.builderGrid}>
        <div className={styles.builderMain}>
          <Card title="Identity">
            <Field label="Coterie name">
              <input
                className={styles.input}
                value={s.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="e.g. The Night Wardens"
                maxLength={160}
              />
            </Field>
            <Field label="Concept" hint="One line — what this coterie is for.">
              <input
                className={styles.input}
                value={s.concept}
                onChange={(e) => set({ concept: e.target.value })}
                placeholder="e.g. Keeps the Piraeus docks quiet for the Prince"
                maxLength={500}
              />
            </Field>

            <Field
              label="Coterie type"
              hint="Applying a type fills in its listed Domain dots, Backgrounds and Flaws. You can change any of them afterwards."
            >
              <div className={styles.inlineControls}>
                <select
                  className={styles.select}
                  value={s.type}
                  onChange={(e) => (e.target.value ? applyType(e.target.value) : clearType())}
                >
                  <option value="">— Custom (no type) —</option>
                  {ALL_COTERIE_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                {s.type && (
                  <button type="button" className={styles.buttonSecondary} onClick={() => applyType(s.type)}>
                    Re-apply
                  </button>
                )}
              </div>
            </Field>

            {typeData && (
              <div className={styles.typeNote}>
                {typeData.notes && <Muted className={styles.tightNote}>{typeData.notes}</Muted>}
                {typeData.domain_note && <Muted tone="warn" className={styles.tightNote}>{typeData.domain_note}</Muted>}
                {typeSeed && typeSeed.unmapped.length > 0 && (
                  <Muted tone="warn" className={styles.tightNote}>
                    <b>Choose for yourself:</b>{' '}
                    {typeSeed.unmapped.map((u) => `${u.name}${u.dots ? ` ${'•'.repeat(u.dots)}` : ''}`).join(', ')}
                    {' '}— this requirement has no single catalog entry, so add what your troupe agrees on.
                  </Muted>
                )}
                {Array.isArray(typeData.extras) && typeData.extras.length > 0 && (
                  <Muted className={styles.caveat}>
                    <b>Possible extras:</b> {typeData.extras.join(' · ')}
                  </Muted>
                )}
              </div>
            )}
          </Card>

          <MembersPicker
            members={s.members}
            onChange={(members) => set({ members })}
            roster={roster}
            currentUser={currentUser}
            isAdmin={isAdmin}
          />

          <AdvantagePicker
            title="Coterie Backgrounds"
            subtitle="Held in common by the whole coterie"
            note={COTERIE_BACKGROUND_NOTE}
            catalog={COTERIE_BACKGROUNDS}
            items={s.backgrounds}
            onChange={(backgrounds) => set({ backgrounds })}
            addLabel="Add a Background"
            emptyLabel="No shared Backgrounds yet."
          />

          <AdvantagePicker
            title="Coterie Merits"
            subtitle="From the Players Guide — domain features, clan tricks and general perks"
            catalog={COTERIE_MERITS}
            groups={MERIT_GROUPS}
            items={s.merits}
            onChange={(merits) => set({ merits })}
            availability={meritAvailability}
            addLabel="Add a Merit"
            emptyLabel="No coterie Merits yet."
          />

          <AdvantagePicker
            title="Coterie Flaws"
            subtitle="Each dot of Flaw adds a dot to the pool"
            note={COTERIE_FLAW_NOTE}
            catalog={COTERIE_FLAWS}
            items={s.flaws}
            onChange={(flaws) => set({ flaws })}
            availability={flawAvailability}
            addLabel="Add a Flaw"
            emptyLabel="No coterie Flaws yet."
            tone="flaw"
          />

          <Card title="Save" tone={check.errors.length ? 'warn' : 'success'}>
            <IssueList errors={check.errors} warnings={check.warnings} />
            <div className={styles.cardActionRow}>
              <button
                type="button"
                className={styles.buttonPrimary}
                disabled={!canSave}
                onClick={submit}
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Found the coterie'}
              </button>
              <button type="button" className={styles.buttonSecondary} onClick={onCancel}>
                Cancel
              </button>
            </div>
          </Card>
        </div>

        {/* ---- Side column ---- */}
        <div className={styles.builderSide}>
          <Card title="Domain" subtitle="Where the coterie hunts and holds ground">
            <Field
              label="Domain division"
              hint="Optional. Without one, the coterie poaches or travels on a letter of passage."
            >
              <select
                className={styles.select}
                value={s.domainId}
                onChange={(e) => {
                  const domainId = e.target.value;
                  // Dropping the Domain must drop its traits with it, or the
                  // coterie saves as "no Domain but Chasse 3".
                  set(domainId
                    ? { domainId }
                    : { domainId, traits: { chasse: 0, lien: 0, portillon: 0 } });
                }}
              >
                <option value="">— No Domain —</option>
                {domainOptions.map((o) => (
                  <option key={o.value} value={o.value}>#{o.value} — {o.label}</option>
                ))}
              </select>
            </Field>

            {domainTaken && (
              <Muted tone="warn">
                <b>{domainTaken}</b> already claims this division. Domains are granted by the Prince —
                clear it with a Storyteller before two coteries hunt the same ground.
              </Muted>
            )}

            {!s.domainId ? (
              <Muted className={styles.tightNote}>
                Select a division to allocate Chasse, Lien and Portillon.
              </Muted>
            ) : (
              <ul className={styles.traitList}>
                {DOMAIN_TRAITS.map((k) => {
                  const info = DOMAIN_TRAIT_INFO[k];
                  const baseline = typeSeed ? typeSeed.traits[k] : 0;
                  return (
                    <li key={k} className={styles.traitRow}>
                      <div className={styles.traitHead}>
                        <div>
                          <span className={styles.traitName}>{info.name}</span>
                          <span className={styles.traitTagline}>{info.tagline}</span>
                        </div>
                      </div>
                      <DotPicker
                        value={s.traits[k]}
                        baseline={baseline}
                        onChange={(v) => set({ traits: { ...s.traits, [k]: v } })}
                      />
                      {baseline > 0 && s.traits[k] < baseline && (
                        <Muted tone="warn" className={styles.tightNote}>
                          Below the {s.type} baseline of {baseline} — fine if the troupe traded those dots away.
                        </Muted>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {s.domainId && (
              <div className={styles.effectBox}>
                <div className={styles.effectRow}>
                  <span>Hunting Difficulty here</span>
                  <b>{difficulty == null ? 'ST sets it' : difficulty}</b>
                </div>
                <div className={styles.effectRow}>
                  <span>Lien bonus dice</span>
                  <b>{lienBonusDice(s.traits.lien) || '—'}</b>
                </div>
                <div className={styles.effectRow}>
                  <span>Dice off an intruder</span>
                  <b>{portillonPenaltyDice(s.traits.portillon) || '—'}</b>
                </div>
                {s.traits.chasse > 0 && (
                  <Muted className={styles.caveat}>{CHASSE_SIZE_TABLE[s.traits.chasse]}</Muted>
                )}
              </div>
            )}
          </Card>

          <Card title="Pool settings">
            <NumberInput
              label="Dots per member"
              value={s.pointsPerMember}
              onChange={(v) => set({ pointsPerMember: v })}
              min={1}
              max={2}
              hint="One free dot per character. Two is the Storyteller option for groups of three or fewer."
            />
            <NumberInput
              label="Contributed Advantage dots"
              value={s.bonusPoints}
              onChange={(v) => set({ bonusPoints: v })}
              min={0}
              max={30}
              hint={
                !editingId ? (
                  <>
                    {s.bonusPoints > 0 && (
                      <span style={{ color: '#ef4444' }}>
                        This {s.bonusPoints * (XP_PER_DOT || 3)} XP will be deducted from your sheet.{' '}
                      </span>
                    )}
                    <span style={{ color: '#22c55e' }}>
                      Remaining XP: {Math.max(0, personalXp - (s.bonusPoints * (XP_PER_DOT || 3)))}
                    </span>
                  </>
                ) : (
                  "Dots the players moved off their own sheets into the coterie."
                )
              }
            />
            {!editingId && s.bonusPoints > 0 && personalXp < s.bonusPoints * (XP_PER_DOT || 3) && (
              <Muted tone="error" className={styles.tightNote}>
                You do not have enough personal XP to contribute this many dots.
              </Muted>
            )}
            {isAdmin && (
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={s.rulesOverride}
                  onChange={(e) => set({ rulesOverride: e.target.checked })}
                />
                <span>
                  <b>Storyteller override</b>
                  <span className={styles.fieldHint}>
                    Allows overspending the pool and off-range ratings for this coterie only.
                  </span>
                </span>
              </label>
            )}
          </Card>

          {typeSeed && s.type && (
            <Card title={`${s.type} — listed costs`} subtitle="Applied above; adjust freely">
              <ul className={styles.requirementList}>
                {DOMAIN_TRAITS.filter((k) => typeSeed.traits[k] > 0).map((k) => (
                  <li key={k}>
                    {DOMAIN_TRAIT_INFO[k].name} {'•'.repeat(typeSeed.traits[k])}
                  </li>
                ))}
                {typeSeed.backgrounds.map((b) => (
                  <li key={b.key}>{b.name} {'•'.repeat(b.dots)}</li>
                ))}
                {typeSeed.flaws.map((f) => (
                  <li key={f.key} className={styles.requirementFlaw}>
                    {f.name} {'•'.repeat(f.dots)} <span className={styles.chip}>+{f.dots} pool</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
