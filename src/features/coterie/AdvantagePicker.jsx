// src/features/coterie/AdvantagePicker.jsx
//
// Picker for coterie Backgrounds, Merits and Flaws. Replaces the old
// free-text "type a name, pick a number" inputs: every entry now comes from
// the V5 catalog, so ratings are range-checked, descriptions are visible
// before you commit a dot, and the server recognises what was saved.
import React, { useMemo, useState } from 'react';
import styles from '../../styles/Coteries.module.css';
import { Card, DotPicker, Dots, Empty, Muted } from './ui';
import { MAX_DOTS } from '../../data/coterieRules';

function matches(def, key, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    def.name.toLowerCase().includes(q) ||
    key.includes(q) ||
    (def.desc || '').toLowerCase().includes(q) ||
    (def.clan || '').toLowerCase().includes(q)
  );
}

const rangeLabel = (def) => {
  const min = def.min != null ? def.min : 1;
  const max = def.max != null ? def.max : MAX_DOTS;
  return min === max ? '•'.repeat(min) : `${'•'.repeat(min)}–${'•'.repeat(max)}`;
};

/**
 * @param {object}   props
 * @param {object}   props.catalog   key → definition
 * @param {object[]} props.items     selected [{key,name,dots,note}]
 * @param {function} props.onChange
 * @param {object[]} [props.groups]  optional [{key,label,hint}] to section the list
 * @param {function} [props.availability] key → null when selectable, or a
 *   string explaining why it is not (e.g. a Domain Merit with no Chasse).
 *   Rendered as an inline reason instead of hiding the option, so a player
 *   can see what a purchase would require.
 */
export default function AdvantagePicker({
  title,
  subtitle,
  note,
  catalog,
  items,
  onChange,
  groups,
  availability,
  addLabel = 'Add',
  emptyLabel = 'Nothing selected yet.',
  tone,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const chosen = useMemo(() => new Set(items.map((i) => i.key)), [items]);

  const options = useMemo(() => {
    const all = Object.entries(catalog)
      .filter(([key, def]) => !chosen.has(key) && matches(def, key, query))
      .sort((a, b) => a[1].name.localeCompare(b[1].name));

    if (!groups) return [{ key: '_all', label: null, hint: null, entries: all }];

    return groups
      .map((g) => ({ ...g, entries: all.filter(([, def]) => def.group === g.key) }))
      .filter((g) => g.entries.length > 0);
  }, [catalog, chosen, query, groups]);

  const add = (key, def) => {
    onChange([...items, { key, name: def.name, dots: def.min != null ? def.min : 1, note: null }]);
    setQuery('');
    setOpen(false);
  };

  const setDots = (key, dots) =>
    onChange(items.map((i) => (i.key === key ? { ...i, dots } : i)));

  const setNote = (key, noteText) =>
    onChange(items.map((i) => (i.key === key ? { ...i, note: noteText || null } : i)));

  const remove = (key) => onChange(items.filter((i) => i.key !== key));

  const totalDots = items.reduce((n, i) => n + (Number(i.dots) || 0), 0);

  return (
    <Card
      title={title}
      subtitle={subtitle}
      tone={tone}
      actions={
        <span className={styles.countPill} title="Total dots">
          {totalDots} {totalDots === 1 ? 'dot' : 'dots'}
        </span>
      }
    >
      {note && <Muted className={styles.tightNote}>{note}</Muted>}

      {items.length === 0 ? (
        <Empty>{emptyLabel}</Empty>
      ) : (
        <ul className={styles.pickedList}>
          {items.map((item) => {
            const def = catalog[item.key];
            if (!def) {
              // A saved entry the catalog no longer knows — surface it rather
              // than dropping it silently, so the player can clear it.
              return (
                <li key={item.key} className={styles.pickedItem} data-unknown="true">
                  <div className={styles.pickedMain}>
                    <span className={styles.pickedName}>{item.name || item.key}</span>
                    <Muted tone="warn">No longer in the catalog — remove it and pick a current entry.</Muted>
                  </div>
                  <button type="button" className={styles.dangerButton} onClick={() => remove(item.key)}>
                    Remove
                  </button>
                </li>
              );
            }
            const min = def.min != null ? def.min : 1;
            const max = def.max != null ? def.max : MAX_DOTS;
            const fixed = min === max;
            const unavailable = availability ? availability(item.key, def) : null;

            return (
              <li key={item.key} className={styles.pickedItem}>
                <div className={styles.pickedMain}>
                  <div className={styles.pickedHead}>
                    <span className={styles.pickedName}>{def.name}</span>
                    {def.clan && <span className={styles.chip}>{def.clan}</span>}
                    {def.extended && (
                      <span className={styles.chip} title="Outside the corebook's twelve shared Backgrounds; used by Players Guide coterie types.">
                        Players Guide
                      </span>
                    )}
                  </div>
                  {def.desc && <Muted className={styles.tightNote}>{def.desc}</Muted>}
                  {unavailable && <Muted tone="warn" className={styles.tightNote}>{unavailable}</Muted>}
                  {def.needsChoice && (
                    <input
                      className={styles.inputSmall}
                      placeholder={`${def.needsChoice}…`}
                      value={item.note || ''}
                      onChange={(e) => setNote(item.key, e.target.value)}
                      aria-label={`${def.name} — ${def.needsChoice}`}
                    />
                  )}
                </div>
                <div className={styles.pickedControls}>
                  {fixed ? (
                    <span className={styles.fixedRating} title={`Always ${min}`}>
                      <Dots value={min} max={max} label={def.name} />
                    </span>
                  ) : (
                    <DotPicker
                      value={item.dots}
                      onChange={(v) => setDots(item.key, v)}
                      min={min}
                      max={max}
                    />
                  )}
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={() => remove(item.key)}
                    aria-label={`Remove ${def.name}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.pickerAdd}>
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? 'Close list' : `+ ${addLabel}`}
        </button>
      </div>

      {open && (
        <div className={styles.optionPanel}>
          <input
            className={styles.input}
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className={styles.optionScroll}>
            {options.length === 0 && <Empty>Nothing matches “{query}”.</Empty>}
            {options.map((group) => (
              <div key={group.key} className={styles.optionGroup}>
                {group.label && (
                  <div className={styles.optionGroupHead}>
                    <span className={styles.optionGroupLabel}>{group.label}</span>
                    {group.hint && <span className={styles.optionGroupHint}>{group.hint}</span>}
                  </div>
                )}
                {group.entries.map(([key, def]) => {
                  const unavailable = availability ? availability(key, def) : null;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={styles.optionRow}
                      onClick={() => add(key, def)}
                      data-unavailable={unavailable ? 'true' : undefined}
                    >
                      <span className={styles.optionRowHead}>
                        <span className={styles.optionName}>{def.name}</span>
                        <span className={styles.optionRange}>{rangeLabel(def)}</span>
                      </span>
                      {def.desc && <span className={styles.optionDesc}>{def.desc}</span>}
                      {unavailable && <span className={styles.optionBlocked}>{unavailable}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
