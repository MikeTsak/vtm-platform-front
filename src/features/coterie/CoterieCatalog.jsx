// src/features/coterie/CoterieCatalog.jsx
//
// Two reference screens: the browsable catalog of coterie types, and the
// rules overview. Both are read-only, so they live together.
import React, { useMemo, useState } from 'react';
import MiniSearch from 'minisearch';
import styles from '../../styles/Coteries.module.css';
import { Card, Empty, Muted } from './ui';
import { ALL_COTERIE_NAMES, COTERIE_DOC, getCoterie } from '../../data/cotteries';
import {
  CHASSE_SIZE_TABLE,
  COTERIE_BACKGROUNDS,
  COTERIE_BACKGROUND_NOTE,
  COTERIE_FLAW_NOTE,
  DOMAIN_TRAITS,
  DOMAIN_TRAIT_INFO,
  MIN_MEMBERS,
  NO_DOMAIN_NOTE,
  XP_PER_DOT,
  seedFromType,
} from '../../data/coterieRules';

/* ------------------------------------------------------------------ *
 * Types browser
 * ------------------------------------------------------------------ */

// Built once — MiniSearch was previously reconstructed and re-indexed on
// every keystroke inside a useMemo over the query.
const TYPE_INDEX = (() => {
  const docs = ALL_COTERIE_NAMES.map((name, id) => {
    const c = getCoterie(name) || {};
    return { id, name, notes: c.notes || '' };
  });
  const ms = new MiniSearch({
    fields: ['name', 'notes'],
    storeFields: ['name'],
    searchOptions: { fuzzy: 0.2, prefix: true, boost: { name: 3 } },
  });
  ms.addAll(docs);
  return { ms, docs };
})();

function TypeCard({ name, onPick }) {
  const c = getCoterie(name);
  if (!c) return null;
  const seed = seedFromType(c);
  const totalCost =
    DOMAIN_TRAITS.reduce((n, k) => n + seed.traits[k], 0) +
    seed.backgrounds.reduce((n, b) => n + b.dots, 0);
  const flawDots = seed.flaws.reduce((n, f) => n + f.dots, 0);

  return (
    <article className={styles.typeCard}>
      <header className={styles.typeCardHead}>
        <h4 className={styles.typeName}>{name}</h4>
        {onPick && (
          <button type="button" className={styles.buttonSecondary} onClick={() => onPick(name)}>
            Use this type
          </button>
        )}
      </header>

      {c.notes && <Muted className={styles.tightNote}>{c.notes}</Muted>}

      <dl className={styles.typeSpec}>
        <div>
          <dt>Domain</dt>
          <dd>
            {DOMAIN_TRAITS.some((k) => seed.traits[k] > 0)
              ? DOMAIN_TRAITS.filter((k) => seed.traits[k] > 0)
                  .map((k) => `${DOMAIN_TRAIT_INFO[k].name} ${'•'.repeat(seed.traits[k])}`)
                  .join(' · ')
              : 'None'}
          </dd>
        </div>
        {seed.backgrounds.length > 0 && (
          <div>
            <dt>Required</dt>
            <dd>{seed.backgrounds.map((b) => `${b.name} ${'•'.repeat(b.dots)}`).join(' · ')}</dd>
          </div>
        )}
        {seed.flaws.length > 0 && (
          <div>
            <dt>Flaws</dt>
            <dd>
              {seed.flaws.map((f) => `${f.name} ${'•'.repeat(f.dots)}`).join(' · ')}
              <span className={styles.chip}>+{flawDots} pool</span>
            </dd>
          </div>
        )}
        {seed.unmapped.length > 0 && (
          <div>
            <dt>Your choice</dt>
            <dd>{seed.unmapped.map((u) => `${u.name}${u.dots ? ` ${'•'.repeat(u.dots)}` : ''}`).join(' · ')}</dd>
          </div>
        )}
        <div>
          <dt>Net pool cost</dt>
          <dd>
            <b>{totalCost - flawDots}</b> dots
            {flawDots > 0 && <span className={styles.typeSpecMuted}> ({totalCost} spent − {flawDots} from Flaws)</span>}
          </dd>
        </div>
        {c.preferred_resonances && c.preferred_resonances.length > 0 && (
          <div>
            <dt>Resonances</dt>
            <dd>{c.preferred_resonances.join(', ')}</dd>
          </div>
        )}
      </dl>

      {c.domain_note && <Muted tone="warn" className={styles.caveat}>{c.domain_note}</Muted>}
      {Array.isArray(c.extras) && c.extras.length > 0 && (
        <Muted className={styles.caveat}><b>Possible extras:</b> {c.extras.join(' · ')}</Muted>
      )}
    </article>
  );
}

export function TypesBrowser({ onPick }) {
  const [q, setQ] = useState('');

  const names = useMemo(() => {
    const s = q.trim();
    if (!s) return ALL_COTERIE_NAMES;
    return TYPE_INDEX.ms.search(s).map((r) => r.name);
  }, [q]);

  return (
    <div className={styles.stack}>
      <Card
        title="Coterie types"
        subtitle={`${ALL_COTERIE_NAMES.length} archetypes from the Corebook and Players Guide`}
      >
        <Muted className={styles.tightNote}>
          Build what the troupe wants first and rules second — a type is a shorthand, not a cage.
          Applying one fills in its listed Domain dots, Backgrounds and Flaws, all of which you can
          then trade away. The corebook’s own example has a Maréchal coterie drop all four of its
          Domain dots for Contacts and a Haven.
        </Muted>
        <input
          className={styles.input}
          placeholder="Search types…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </Card>

      {names.length === 0 ? (
        <Card><Empty>No type matches “{q}”.</Empty></Card>
      ) : (
        <div className={styles.typeGrid}>
          {names.map((n) => <TypeCard key={n} name={n} onPick={onPick} />)}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Rules overview
 * ------------------------------------------------------------------ */

export function RulesOverview() {
  return (
    <div className={styles.stack}>
      <Card title="What a coterie is">
        <p className={styles.prose}>
          A coterie is a small group of Kindred bound together by necessity, ambition or an elder’s
          design. Players might build their characters individually, but they build their coterie
          together — it is where shared buy-in to the chronicle comes from, and where the troupe says
          which parts of the World of Darkness it wants to explore.
        </p>
        <p className={styles.prose}>
          Mechanically a coterie is a pool of dots the players spend together, buying a Domain and a
          set of Backgrounds and Merits that belong to the group rather than to any one character.
        </p>
      </Card>

      <Card title="Building one" subtitle="How the pool works">
        <ol className={styles.rulesList}>
          <li>
            The pool starts with <b>one free dot per player character</b>. The Storyteller may allow
            groups of three or fewer players two dots each. This chronicle requires at least{' '}
            {MIN_MEMBERS} members.
          </li>
          <li>
            Players may <b>contribute their own characters’ Advantage dots</b> to the pool on top of that.
          </li>
          <li>
            The coterie may <b>take Flaws for extra dots</b>. Every player must agree before it does.
          </li>
          <li>
            Spend the pool on <b>Domain traits, coterie Backgrounds and coterie Merits</b>. If your
            coterie matches a listed type, subtract that type’s listed costs from the pool — its
            Domain dots are paid for, not free.
          </li>
          <li>
            If the pool will not stretch, the difference comes out of the characters’ personal
            Backgrounds.
          </li>
        </ol>
      </Card>

      <Card title="Domain" subtitle="Chasse, Lien and Portillon">
        <p className={styles.prose}>
          To the Camarilla, a domain resembles a feudal fief held by grant from the Prince or another
          noble Kindred; Anarch coteries call it turf. Either way the principle is the same. Each dot
          of a Domain Trait costs one dot from the coterie pool. Domain Traits cover a lot of ground —
          use them as abstractions, not constraints.
        </p>
        <ul className={styles.traitList}>
          {DOMAIN_TRAITS.map((k) => {
            const info = DOMAIN_TRAIT_INFO[k];
            return (
              <li key={k} className={styles.traitRow}>
                <div className={styles.traitHead}>
                  <span className={styles.traitName}>{info.name}</span>
                  <span className={styles.traitTagline}>{info.tagline}</span>
                </div>
                <Muted className={styles.tightNote}>{info.blurb}</Muted>
                <Muted className={styles.tightNote}><b>Effect:</b> {info.rule}</Muted>
                <Muted className={styles.caveat}>{info.caveat}</Muted>
              </li>
            );
          })}
        </ul>

        <h4 className={styles.subheading}>Chasse and the size of a domain</h4>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Chasse</th><th>Hunting Difficulty</th><th>Geographical equivalent</th></tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((n) => (
                <tr key={n}>
                  <td className={styles.tableDots}>{'•'.repeat(n)}</td>
                  <td>{7 - n}</td>
                  <td>{CHASSE_SIZE_TABLE[n]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Muted className={styles.caveat}>
          Dots need not always translate to size. A smaller domain in a rich hunting area still has a
          higher Chasse than a large one in a desolate or empty part of the city.
        </Muted>
      </Card>

      <Card title="Coteries without a Domain">
        <p className={styles.prose}>{NO_DOMAIN_NOTE}</p>
      </Card>

      <Card title="Coterie Backgrounds">
        <p className={styles.prose}>
          Coteries can hold these Backgrounds and Flaws in common:{' '}
          {Object.values(COTERIE_BACKGROUNDS).filter((b) => !b.extended).map((b) => b.name).join(', ')}.
          Buy them with coterie pool dots exactly as you would buy a character’s Background.
        </p>
        <Muted>{COTERIE_BACKGROUND_NOTE}</Muted>
        <p className={styles.prose}>
          <b>A Background does not multiply itself.</b> A two-dot coterie Herd still holds the same
          number of kine and provides only one Resonance — the same as an individual vampire with
          Herd ••.
        </p>
        <Muted className={styles.caveat}>
          Coterie Backgrounds stay vulnerable to events in play. If a mob burns out a coterie Haven,
          those dots are gone — and unlike one player’s Haven, when a coterie Haven goes, nobody has a
          place to sleep. Putting all of one’s eggs in the same basket has its downside.
        </Muted>
      </Card>

      <Card title="Coterie Flaws">
        <p className={styles.prose}>{COTERIE_FLAW_NOTE}</p>
      </Card>

      <Card title="Advancing a coterie" subtitle="How this chronicle handles XP">
        <p className={styles.prose}>
          Raising a Domain trait, a coterie Background or a coterie Merit after creation costs{' '}
          <b>{XP_PER_DOT} XP per new dot</b> — the standard V5 Advantage rate.
        </p>
        <ol className={styles.rulesList}>
          <li>
            Storytellers award XP into the <b>coterie bank</b> for good group play. Only a Storyteller
            can add to it.
          </li>
          <li>
            Any member can spend from the bank on the coterie’s behalf. Every award and purchase is
            written to the coterie’s ledger.
          </li>
          <li>
            If the bank is short, a member may <b>top up the remainder from their own character’s XP</b>.
            That amount is deducted from their sheet and recorded against their name.
          </li>
          <li>
            XP buys new dots only. Dropping a rating refunds nothing — trim it in the builder instead.
          </li>
        </ol>
      </Card>

      {COTERIE_DOC && Array.isArray(COTERIE_DOC.bonus_rules) && (
        <Card title="Storyteller options">
          {COTERIE_DOC.bonus_rules.map((p, i) => <Muted key={i}>{p}</Muted>)}
        </Card>
      )}
    </div>
  );
}
