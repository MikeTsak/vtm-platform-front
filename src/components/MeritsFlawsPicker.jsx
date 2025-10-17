import React, { useMemo, useState } from 'react';
import styles from '../styles/Sheet.module.css';
import { MERITS_AND_FLAWS } from '../data/merits_flaws';

/* ===========================
   Helpers (no assumptions)
   =========================== */

/** Count bullets (•) in a string. */
function bulletCount(s = '') {
  const m = String(s).match(/•/g);
  return m ? m.length : 0;
}

/**
 * Parse a dot spec string (e.g., "•", "•••", "•• or ••••", "• - •••", "• +")
 * into the set of allowed numeric choices for character creation.
 *
 * RULES (ultra-conservative to avoid assumptions):
 * - Single set of bullets (e.g., "•••") -> [3]
 * - Range "• - •••" -> [1,2,3]
 * - "A or B" -> [A,B]
 * - Open-ended "• +" -> [1]  (creation uses the minimum only)
 * - Unknown/blank -> []
 */
function parseDotSpec(spec = '') {
  const src = String(spec).trim();

  if (!src) return [];

  // "A or B" (may appear with spaces around 'or')
  if (/\bor\b/i.test(src)) {
    const opts = src
      .split(/\bor\b/i)
      .map(s => bulletCount(s))
      .filter(n => n > 0);
    return Array.from(new Set(opts)).sort((a, b) => a - b);
  }

  // Range "• - •••"
  if (src.includes('-')) {
    const [lo, hi] = src.split('-').map(s => bulletCount(s));
    if (lo > 0 && hi > 0 && hi >= lo) {
      const out = [];
      for (let i = lo; i <= hi; i++) out.push(i);
      return out;
    }
  }

  // Open-ended "• +" -> return only minimum for creation
  if (src.includes('+')) {
    const min = bulletCount(src);
    return min > 0 ? [min] : [];
  }

  // Plain bullets
  const n = bulletCount(src);
  if (n > 0) return [n];

  // Non-bullet case (e.g., em dash for thin-blood) -> not selectable here
  return [];
}

/** Flatten MERITS_AND_FLAWS into one list [{id, name, dotsSpec, type, category, description}] */
function flattenData() {
  const out = [];

  for (const [cat, payload] of Object.entries(MERITS_AND_FLAWS)) {
    // Skip entire families the user asked to hide
    if (cat === 'Caitiff' || cat === 'Thin-blood' || cat === 'Ghouls' || cat === 'Cults') continue;

    if (payload.merits) {
      for (const m of payload.merits) {
        out.push({
          id: m.id,
          name: m.name,
          dotsSpec: m.dots,
          description: m.description,
          type: 'Merit',
          category: cat,
        });
      }
    }
    if (payload.flaws) {
      for (const f of payload.flaws) {
        out.push({
          id: f.id,
          name: f.name,
          dotsSpec: f.dots,
          description: f.description,
          type: 'Flaw',
          category: cat,
        });
      }
    }
    if (payload.groups) {
      for (const [sub, grp] of Object.entries(payload.groups)) {
        if (grp.merits) {
          for (const m of grp.merits) {
            out.push({
              id: m.id,
              name: m.name,
              dotsSpec: m.dots,
              description: m.description,
              type: 'Merit',
              category: `${cat} / ${sub}`,
            });
          }
        }
        if (grp.flaws) {
          for (const f of grp.flaws) {
            out.push({
              id: f.id,
              name: f.name,
              dotsSpec: f.dots,
              description: f.description,
              type: 'Flaw',
              category: `${cat} / ${sub}`,
            });
          }
        }
      }
    }
  }

  return out;
}

/** Human helper for dot glyphs. */
function glyph(n) {
  return '•'.repeat(Math.max(0, Number(n) || 0));
}

/* ===========================
   Main Picker
   =========================== */

export default function MeritsFlawsPicker({
  clan,                  // not used for hidden families (Caitiff/Thin-blood/etc already excluded)
  merits, setMerits,     // [{ id, name, dots, description, category }]
  flaws, setFlaws,       // [{ ... }]
  meritBudget = 7,       // total dots you allow for merits
}) {
  const [q, setQ] = useState('');

  const allItems = useMemo(() => flattenData(), []);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return allItems;
    return allItems.filter(it =>
      (it.name || '').toLowerCase().includes(s) ||
      (it.category || '').toLowerCase().includes(s) ||
      (it.description || '').toLowerCase().includes(s)
    );
  }, [allItems, q]);

  const meritsSpent = useMemo(() => merits.reduce((a, m) => a + (Number(m.dots) || 0), 0), [merits]);
  const flawDots = useMemo(() => flaws.reduce((a, f) => a + (Number(f.dots) || 0), 0), [flaws]);

  const onToggle = (item) => {
    const allowed = parseDotSpec(item.dotsSpec);

    // If this entry isn't selectable (e.g., em dash), ignore
    if (!allowed.length) return;

    const defaultDots = allowed[0]; // conservative: minimum allowed at creation

    if (item.type === 'Merit') {
      const exists = merits.find(m => m.id === item.id);
      if (exists) {
        setMerits(prev => prev.filter(m => m.id !== item.id));
      } else {
        // enforce budget
        if (meritsSpent + defaultDots > meritBudget) return;
        setMerits(prev => [...prev, {
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
          dots: defaultDots
        }]);
      }
      return;
    }

    if (item.type === 'Flaw') {
      const exists = flaws.find(f => f.id === item.id);
      if (exists) {
        setFlaws(prev => prev.filter(f => f.id !== item.id));
      } else {
        // enforce EXACTLY 2 total dots -> prevent adding past 2
        if (flawDots + defaultDots > 2) return;
        setFlaws(prev => [...prev, {
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
          dots: defaultDots
        }]);
      }
    }
  };

  const onChangeDots = (item, newDots) => {
    const n = Number(newDots) || 0;
    if (item.type === 'Merit') {
      // keep within budget
      const others = merits.filter(m => m.id !== item.id);
      const spentIf = others.reduce((a, m) => a + (Number(m.dots) || 0), 0) + n;
      if (spentIf > meritBudget) return;
      setMerits([...others, { ...item, dots: n }]);
      return;
    }
    if (item.type === 'Flaw') {
      // keep at EXACT 2 total (can't exceed 2)
      const others = flaws.filter(f => f.id !== item.id);
      const sumOthers = others.reduce((a, f) => a + (Number(f.dots) || 0), 0);
      if (sumOthers + n > 2) return;
      setFlaws([...others, { ...item, dots: n }]);
    }
  };

  const isPicked = (id, type) =>
    type === 'Merit' ? merits.some(m => m.id === id) : flaws.some(f => f.id === id);

  const pickedDots = (id, type) => {
    const list = type === 'Merit' ? merits : flaws;
    const found = list.find(x => x.id === id);
    return Number(found?.dots || 0);
  };

  // split columns for a tidy layout
  const meritsList = filtered.filter(i => i.type === 'Merit');
  const flawsList = filtered.filter(i => i.type === 'Flaw');

  return (
    <div className={styles.cardIsh}>
      <div className={styles.grid2} style={{ alignItems: 'end', gap: 10 }}>
        <div>
          <h4 className={styles.sectionSub}>Pick Merits & Flaws</h4>
          <p className={styles.muted} style={{ marginTop: 4 }}>
            Merits budget: <b>{meritsSpent}/{meritBudget}</b> • Flaws required: <b>{flawDots}/2</b>
          </p>
        </div>
        <input
          className={styles.input}
          placeholder="Search name, category, or text…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      <div className={styles.attrSkillGrid} style={{ marginTop: 12 }}>
        {/* Merits column */}
        <div className={`${styles.bleedSoft}`} style={{ display: 'grid', gap: 10 }}>
          <h5 className={styles.sectionSub}>Merits</h5>
          {meritsList.map(it => {
            const allowed = parseDotSpec(it.dotsSpec);
            if (!allowed.length) return null; // not selectable at creation
            const picked = isPicked(it.id, it.type);
            const curDots = pickedDots(it.id, it.type);
            const locked = !picked && (meritsSpent + allowed[0] > meritBudget);
            return (
              <div
                key={it.id}
                className={styles.flexRow}
                style={{
                  alignItems: 'start',
                  gap: 10,
                  opacity: locked ? .55 : 1,
                  border: '1px solid var(--border, #333)',
                  borderRadius: 10,
                  padding: 10,
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                <button
                  type="button"
                  className={styles.ghostBtn}
                  disabled={locked}
                  onClick={() => onToggle(it)}
                  title={picked ? 'Remove' : 'Add'}
                >
                  {picked ? '−' : '+'}
                </button>
                <div style={{ display: 'grid', gap: 4, flex: 1 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <b>{it.name}</b>
                    <small className={styles.muted}>{it.category}</small>
                    <small className={styles.pill}>{it.dotsSpec}</small>
                    {picked && (
                      allowed.length > 1 ? (
                        <select
                          className={styles.input}
                          style={{ width: 110, padding: '4px 8px', height: 30 }}
                          value={curDots}
                          onChange={e => onChangeDots(it, Number(e.target.value))}
                        >
                          {allowed.map(n => <option key={n} value={n}>{glyph(n)} ({n})</option>)}
                        </select>
                      ) : (
                        <small className={styles.muted}>Chosen: {glyph(curDots)} ({curDots})</small>
                      )
                    )}
                  </div>
                  <div className={styles.muted} style={{ whiteSpace: 'pre-wrap' }}>{it.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Flaws column */}
        <div className={`${styles.bleedSoft}`} style={{ display: 'grid', gap: 10 }}>
          <h5 className={styles.sectionSub}>Flaws (exactly 2 dots)</h5>
          {flawsList.map(it => {
            const allowed = parseDotSpec(it.dotsSpec);
            if (!allowed.length) return null;
            const picked = isPicked(it.id, it.type);
            const curDots = pickedDots(it.id, it.type);
            const minIfAdd = allowed[0];
            const wouldExceed = !picked && (flawDots + minIfAdd > 2);
            return (
              <div
                key={it.id}
                className={styles.flexRow}
                style={{
                  alignItems: 'start',
                  gap: 10,
                  opacity: wouldExceed ? .55 : 1,
                  border: '1px solid var(--border, #333)',
                  borderRadius: 10,
                  padding: 10,
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                <button
                  type="button"
                  className={styles.ghostBtn}
                  disabled={wouldExceed}
                  onClick={() => onToggle(it)}
                  title={picked ? 'Remove' : 'Add'}
                >
                  {picked ? '−' : '+'}
                </button>
                <div style={{ display: 'grid', gap: 4, flex: 1 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <b>{it.name}</b>
                    <small className={styles.muted}>{it.category}</small>
                    <small className={styles.pill}>{it.dotsSpec}</small>
                    {picked && (
                      allowed.length > 1 ? (
                        <select
                          className={styles.input}
                          style={{ width: 110, padding: '4px 8px', height: 30 }}
                          value={curDots}
                          onChange={e => onChangeDots(it, Number(e.target.value))}
                        >
                          {allowed.map(n => <option key={n} value={n}>{glyph(n)} ({n})</option>)}
                        </select>
                      ) : (
                        <small className={styles.muted}>Chosen: {glyph(curDots)} ({curDots})</small>
                      )
                    )}
                  </div>
                  <div className={styles.muted} style={{ whiteSpace: 'pre-wrap' }}>{it.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.quotaBar} style={{ marginTop: 12 }}>
        <div className={styles.quotaHead}>Totals</div>
        <div className={styles.quotaPills}>
          <span className={`${styles.pill} ${meritsSpent <= meritBudget ? styles.done : ''}`}>
            Merits <b>• {meritsSpent}/{meritBudget}</b>
          </span>
          <span className={`${styles.pill} ${flawDots === 2 ? styles.done : ''}`}>
            Flaws <b>• {flawDots}/2</b>
          </span>
        </div>
        {(flawDots !== 2) && (
          <div className={styles.alert} style={{ marginTop: 6 }}>
            <span className={styles.alertDot} /> Flaws must total exactly 2 dots for character creation.
          </div>
        )}
      </div>
    </div>
  );
}
