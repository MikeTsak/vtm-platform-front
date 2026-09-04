// src/features/coterie/CoterieSheet.jsx
//
// The read view of a single coterie: what it is, what its Domain actually
// does at the table, what it owns, and the XP economy that advances it.
//
// The mechanics block is the point of this screen. Before it, a coterie's
// Chasse/Lien/Portillon were three numbers with no stated effect anywhere in
// the app, so the Domain — the whole reason to have a coterie — was invisible.
import React, { useMemo, useState } from 'react';
import styles from '../../styles/Coteries.module.css';
import Avatar from '../../components/Avatar';
import { Card, Dots, Empty, Modal, Muted, Stat } from './ui';
import {
  CHASSE_SIZE_TABLE,
  COTERIE_BACKGROUNDS,
  COTERIE_FLAWS,
  COTERIE_MERITS,
  DOMAIN_TRAITS,
  DOMAIN_TRAIT_INFO,
  MAX_DOTS,
  NO_DOMAIN_NOTE,
  XP_PER_DOT,
  checkTypeCompliance,
  huntingDifficulty,
  lienBonusDice,
  portillonPenaltyDice,
  xpForDots,
} from '../../data/coterieRules';

const CATALOGS = {
  domain: null,
  background: COTERIE_BACKGROUNDS,
  merit: COTERIE_MERITS,
};

/* ------------------------------------------------------------------ *
 * Purchase dialog — hybrid funding (coterie bank + personal character XP)
 * ------------------------------------------------------------------ */

function PurchaseDialog({ coterie, personalXp, onClose, onConfirm, busy }) {
  const [kind, setKind] = useState('domain');
  const [key, setKey] = useState('chasse');
  const [toDots, setToDots] = useState(1);
  const [fromPersonal, setFromPersonal] = useState(0);

  const catalog = CATALOGS[kind];

  const currentDots = useMemo(() => {
    if (kind === 'domain') return Number(coterie.traits[key]) || 0;
    const list = kind === 'background' ? coterie.backgrounds : coterie.merits;
    const found = (list || []).find((x) => x.key === key);
    return found ? Number(found.dots) || 0 : 0;
  }, [kind, key, coterie]);

  const def = catalog ? catalog[key] : null;
  const min = def && def.min != null ? def.min : 1;
  const max = def && def.max != null ? def.max : MAX_DOTS;

  // A purchase only ever buys upward; V5 gives no refund for dropping a dot,
  // so the floor is always one above what the coterie already holds.
  const lowestBuyable = Math.max(currentDots + 1, kind === 'domain' ? 1 : min);
  const effectiveTo = Math.min(Math.max(toDots, lowestBuyable), kind === 'domain' ? MAX_DOTS : max);
  const cost = xpForDots(currentDots, effectiveTo);

  const bank = Number(coterie.coterie_xp) || 0;
  const personalCap = Math.min(cost, Math.max(0, Number(personalXp) || 0));
  const personal = Math.min(Math.max(0, fromPersonal), personalCap);
  const fromBank = cost - personal;

  const canAfford = fromBank <= bank;
  const alreadyMaxed = currentDots >= (kind === 'domain' ? MAX_DOTS : max);

  const pick = (nextKind) => {
    setKind(nextKind);
    setKey(nextKind === 'domain' ? 'chasse' : Object.keys(CATALOGS[nextKind])[0]);
    setToDots(1);
    setFromPersonal(0);
  };

  const options = kind === 'domain'
    ? DOMAIN_TRAITS.map((t) => [t, { name: DOMAIN_TRAIT_INFO[t].name }])
    : Object.entries(catalog).sort((a, b) => a[1].name.localeCompare(b[1].name));

  return (
    <Modal
      title="Spend coterie XP"
      subtitle={`${XP_PER_DOT} XP per new dot — the V5 Advantage rate.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.buttonSecondary} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={styles.buttonPrimary}
            disabled={busy || alreadyMaxed || !canAfford || cost <= 0}
            onClick={() => onConfirm({
              target: { kind, key },
              to_dots: effectiveTo,
              from_bank: fromBank,
              from_personal: personal,
            })}
          >
            {busy ? 'Working…' : `Buy for ${cost} XP`}
          </button>
        </>
      }
    >
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>What are you raising?</span>
          <select className={styles.select} value={kind} onChange={(e) => pick(e.target.value)}>
            <option value="domain">Domain trait</option>
            <option value="background">Coterie Background</option>
            <option value="merit">Coterie Merit</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Which one?</span>
          <select
            className={styles.select}
            value={key}
            onChange={(e) => { setKey(e.target.value); setToDots(1); setFromPersonal(0); }}
          >
            {options.map(([k, d]) => <option key={k} value={k}>{d.name}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.purchaseSummary}>
        <span>Currently <b>{currentDots}</b></span>
        <span className={styles.arrow}>→</span>
        <label className={styles.inlineField}>
          <span className={styles.fieldLabel}>Raise to</span>
          <input
            type="number"
            inputMode="numeric"
            className={styles.inputSmall}
            value={effectiveTo}
            min={lowestBuyable}
            max={kind === 'domain' ? MAX_DOTS : max}
            onChange={(e) => setToDots(Number(e.target.value || lowestBuyable))}
          />
        </label>
      </div>

      {alreadyMaxed && (
        <Muted tone="warn">This is already at its maximum rating.</Muted>
      )}

      {def && def.desc && <Muted className={styles.tightNote}>{def.desc}</Muted>}

      {!alreadyMaxed && (
        <>
          <div className={styles.costRow}>
            <span>Cost</span>
            <b>{cost} XP</b>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              Your personal XP contribution (you have {Math.max(0, Number(personalXp) || 0)})
            </span>
            <input
              type="range"
              min={0}
              max={personalCap}
              value={personal}
              onChange={(e) => setFromPersonal(Number(e.target.value))}
              className={styles.range}
              disabled={personalCap === 0}
            />
            <span className={styles.fieldHint}>
              {personalCap === 0
                ? 'You have no personal XP available to contribute.'
                : `Drag to pay part of the cost from your own sheet.`}
            </span>
          </label>

          <div className={styles.fundingSplit}>
            <div className={styles.fundingPart} data-over={!canAfford ? 'true' : undefined}>
              <span className={styles.fundingLabel}>From coterie bank</span>
              <b>{fromBank}</b>
              <span className={styles.fundingCap}>of {bank}</span>
            </div>
            <div className={styles.fundingPart}>
              <span className={styles.fundingLabel}>From your character</span>
              <b>{personal}</b>
              <span className={styles.fundingCap}>of {Math.max(0, Number(personalXp) || 0)}</span>
            </div>
          </div>

          {!canAfford && (
            <Muted tone="error">
              The bank is {fromBank - bank} XP short. Contribute more personal XP, or ask a Storyteller for an award.
            </Muted>
          )}
        </>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ *
 * Sheet
 * ------------------------------------------------------------------ */

export default function CoterieSheet({
  coterie,
  members = [],
  xpLog = [],
  domainLabel,
  isAdmin,
  canEdit,
  personalXp,
  onEdit,
  onDelete,
  onAward,
  onPurchase,
  busy,
}) {
  const [showPurchase, setShowPurchase] = useState(false);
  const [awardAmount, setAwardAmount] = useState(3);

  const t = coterie.traits || { chasse: 0, lien: 0, portillon: 0 };
  const hasDomain = coterie.domain_id != null;
  const difficulty = huntingDifficulty(t.chasse);
  const lien = lienBonusDice(t.lien);
  const portillon = portillonPenaltyDice(t.portillon);

  const compliance = useMemo(
    () => checkTypeCompliance({
      required: coterie.required,
      traits: t,
      backgrounds: coterie.backgrounds || [],
    }),
    [coterie.required, t, coterie.backgrounds]
  );

  const budget = coterie.budget || { pool: { total: 0 }, spend: { total: 0 }, remaining: 0 };

  return (
    <div className={styles.sheet}>
      <Card
        title={coterie.name}
        subtitle={[coterie.type || 'Custom coterie', hasDomain ? domainLabel : 'No Domain']
          .filter(Boolean).join(' · ')}
        actions={
          <div className={styles.cardActionRow}>
            {canEdit && (
              <button type="button" className={styles.buttonSecondary} onClick={onEdit}>Edit</button>
            )}
            {isAdmin && (
              <button type="button" className={styles.dangerButton} onClick={onDelete}>Delete</button>
            )}
          </div>
        }
      >
        {coterie.concept && <p className={styles.concept}>{coterie.concept}</p>}
        {coterie.rules_override && (
          <Muted tone="warn">
            A Storyteller has flagged this coterie as an approved exception to the point rules.
          </Muted>
        )}
      </Card>

      {/* ---- What the Domain actually does ---- */}
      <Card
        title="Domain"
        subtitle={hasDomain ? domainLabel : 'This coterie holds no Domain'}
      >
        {!hasDomain ? (
          <Muted>{NO_DOMAIN_NOTE}</Muted>
        ) : (
          <>
            <div className={styles.statRow}>
              <Stat
                label="Hunting Difficulty"
                value={difficulty == null ? '—' : difficulty}
                hint={difficulty == null ? 'No Chasse — the Storyteller sets it' : 'inside the domain'}
                tone={difficulty != null && difficulty <= 3 ? 'good' : undefined}
              />
              <Stat
                label="Lien bonus"
                value={lien > 0 ? `+${lien}` : '—'}
                unit={lien > 0 ? 'dice' : undefined}
                hint="interacting, finding, investigating locally"
              />
              <Stat
                label="Portillon"
                value={portillon > 0 ? `−${portillon}` : '—'}
                unit={portillon > 0 ? 'dice' : undefined}
                hint="to a foe entering or surveilling"
              />
            </div>

            <ul className={styles.traitList}>
              {DOMAIN_TRAITS.map((k) => {
                const info = DOMAIN_TRAIT_INFO[k];
                return (
                  <li key={k} className={styles.traitRow}>
                    <div className={styles.traitHead}>
                      <span className={styles.traitName}>{info.name}</span>
                      <Dots value={t[k]} label={info.name} />
                    </div>
                    <Muted className={styles.tightNote}>{info.rule}</Muted>
                    {k === 'chasse' && t.chasse > 0 && (
                      <Muted className={styles.tightNote}>
                        <b>Roughly this size:</b> {CHASSE_SIZE_TABLE[t.chasse]}
                      </Muted>
                    )}
                    {t[k] > 0 && info.caveat && (
                      <Muted className={styles.caveat}>{info.caveat}</Muted>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {/* ---- Holdings ---- */}
      <div className={styles.twoUp}>
        <Card title="Coterie Backgrounds" subtitle="Held in common — nobody takes them when they leave">
          {(coterie.backgrounds || []).length === 0 ? (
            <Empty>None.</Empty>
          ) : (
            <ul className={styles.holdingList}>
              {coterie.backgrounds.map((b) => {
                const def = COTERIE_BACKGROUNDS[b.key];
                return (
                  <li key={b.key} className={styles.holdingItem}>
                    <div className={styles.holdingHead}>
                      <span className={styles.holdingName}>{def ? def.name : b.name}</span>
                      <Dots value={b.dots} />
                    </div>
                    {b.note && <Muted className={styles.tightNote}>{b.note}</Muted>}
                    {def && def.desc && <Muted className={styles.caveat}>{def.desc}</Muted>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Coterie Merits">
          {(coterie.merits || []).length === 0 ? (
            <Empty>None.</Empty>
          ) : (
            <ul className={styles.holdingList}>
              {coterie.merits.map((m) => {
                const def = COTERIE_MERITS[m.key];
                return (
                  <li key={m.key} className={styles.holdingItem}>
                    <div className={styles.holdingHead}>
                      <span className={styles.holdingName}>
                        {def ? def.name : m.name}
                        {m.note && <span className={styles.chip}>{m.note}</span>}
                      </span>
                      <Dots value={m.dots} />
                    </div>
                    {def && def.desc && <Muted className={styles.caveat}>{def.desc}</Muted>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Coterie Flaws" subtitle="These granted the pool its extra dots">
        {(coterie.flaws || []).length === 0 ? (
          <Empty>None.</Empty>
        ) : (
          <ul className={styles.holdingList}>
            {coterie.flaws.map((f) => {
              const def = COTERIE_FLAWS[f.key];
              return (
                <li key={f.key} className={styles.holdingItem}>
                  <div className={styles.holdingHead}>
                    <span className={styles.holdingName}>{def ? def.name : f.name}</span>
                    <Dots value={f.dots} />
                  </div>
                  {def && def.desc && <Muted className={styles.caveat}>{def.desc}</Muted>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ---- Roster ---- */}
      <Card title="Members" subtitle={`${members.length} Kindred`}>
        <ul className={styles.roster}>
          {members.map((m) => (
            <li key={m.user_id} className={styles.rosterItem}>
              <div className={styles.rosterAvatar}>
                <Avatar userId={m.user_id} size="100%" style={{ width: '100%', height: '100%' }} />
              </div>
              <div>
                <div className={styles.rosterName}>{m.character_name || m.display_name}</div>
                {m.clan && <div className={styles.rosterClan}>{m.clan}</div>}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* ---- Creation budget + type compliance ---- */}
      <Card title="Creation pool" subtitle="What the coterie was built with">
        <div className={styles.statRow}>
          <Stat label="Pool" value={budget.pool.total} hint={`${budget.pool.base} from members · ${budget.pool.bonus} contributed · ${budget.pool.fromFlaws} from Flaws`} />
          <Stat label="Spent" value={budget.spend.total} hint={`${budget.spend.domain} Domain · ${budget.spend.backgrounds} Backgrounds · ${budget.spend.merits} Merits`} />
          <Stat
            label="Remaining"
            value={budget.remaining}
            tone={budget.remaining < 0 ? 'bad' : budget.remaining > 0 ? 'warn' : 'good'}
            hint={budget.remaining > 0 ? 'unspent dots' : budget.remaining < 0 ? 'overspent' : 'fully allocated'}
          />
        </div>

        {coterie.type && !compliance.compliant && (
          <div className={styles.complianceBox}>
            <Muted tone="warn">
              <b>Drifted from the {coterie.type} type.</b> That is allowed — a troupe may trade a type’s
              listed dots for something else — but for reference it is short:
            </Muted>
            <ul className={styles.issueListWarn}>
              {compliance.unmet.map((u, i) => (
                <li key={i}>{u.label}: has {u.have}, the type lists {u.needed}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* ---- XP ---- */}
      <Card
        title="Coterie XP"
        subtitle="Raise Domain traits, Backgrounds and Merits after creation"
        actions={<span className={styles.bankPill}>{coterie.coterie_xp} XP</span>}
      >
        <Muted className={styles.tightNote}>
          Advancement costs {XP_PER_DOT} XP per new dot. Spend from the coterie bank, top it up from your
          own character’s XP, or split the cost between the two.
        </Muted>

        <div className={styles.cardActionRow}>
          {canEdit && (
            <button
              type="button"
              className={styles.buttonPrimary}
              onClick={() => setShowPurchase(true)}
              disabled={busy}
            >
              Spend XP
            </button>
          )}
          {isAdmin && (
            <div className={styles.awardRow}>
              <input
                type="number"
                inputMode="numeric"
                className={styles.inputSmall}
                value={awardAmount}
                onChange={(e) => setAwardAmount(Number(e.target.value || 0))}
                aria-label="XP to award"
              />
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={busy || !awardAmount}
                onClick={() => onAward(awardAmount)}
              >
                Award
              </button>
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={busy || !awardAmount}
                onClick={() => onAward(-Math.abs(awardAmount))}
              >
                Deduct
              </button>
            </div>
          )}
        </div>

        {xpLog.length > 0 && (
          <details className={styles.ledger}>
            <summary className={styles.summaryLink}>Ledger ({xpLog.length})</summary>
            <ul className={styles.ledgerList}>
              {xpLog.map((row) => {
                const total = (Number(row.bank_delta) || 0) + (Number(row.personal_delta) || 0);
                return (
                  <li key={row.id} className={styles.ledgerRow}>
                    <span className={styles.ledgerAmount} data-sign={total >= 0 ? 'plus' : 'minus'}>
                      {total >= 0 ? '+' : ''}{total}
                    </span>
                    <span className={styles.ledgerBody}>
                      <span className={styles.ledgerTitle}>
                        {row.kind === 'spend'
                          ? `${row.target_name} ${row.from_dots} → ${row.to_dots}`
                          : row.kind === 'award' ? 'Storyteller award' : 'Adjustment'}
                      </span>
                      {row.kind === 'spend' && Number(row.personal_delta) !== 0 && (
                        <span className={styles.ledgerMeta}>
                          {Math.abs(row.bank_delta)} from bank · {Math.abs(row.personal_delta)} personal
                        </span>
                      )}
                      {row.note && <span className={styles.ledgerMeta}>{row.note}</span>}
                      <span className={styles.ledgerMeta}>
                        {new Date(row.created_at).toLocaleString()}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </Card>

      {showPurchase && (
        <PurchaseDialog
          coterie={coterie}
          personalXp={personalXp}
          busy={busy}
          onClose={() => setShowPurchase(false)}
          onConfirm={async (payload) => {
            const ok = await onPurchase(payload);
            if (ok) setShowPurchase(false);
          }}
        />
      )}
    </div>
  );
}
