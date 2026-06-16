import React, { useMemo, useCallback, useState, useEffect } from 'react';
import styles from '../styles/CharacterView.module.css';
import { listAllItems } from '../data/merits_flaws';
import { MERITS_AND_FLAWS } from '../data/merits_flaws';
import { DISCIPLINES, ALL_DISCIPLINE_NAMES, iconPath } from '../data/disciplines';

// Define XP_RULES locally since it's not exported from a separate file
const XP_RULES = {
  attribute: newLevel => newLevel * 5,
  skill: newLevel => newLevel * 3,
  specialty: () => 3,
  advantageDot: dots => dots * 3,
  disciplineClan: newLevel => newLevel * 5,
  disciplineOther: newLevel => newLevel * 7,
  disciplineCaitiff: newLevel => newLevel * 6,
  ritual: lvl => lvl * 3,
  ceremony: lvl => lvl * 3,
  bloodPotency: newLevel => newLevel * 10,
};

const MeritsBackgroundsSection = ({ sheet, xp, ch, knownPowerNamesAndIds }) => {
  // Helper functions from original code
  const allSelectableMerits = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const [cat, payload] of Object.entries(MERITS_AND_FLAWS)) {
      if (['Caitiff', 'Thin-blood', 'Ghouls', 'Cults'].includes(cat)) continue;
      for (const merit of Array.isArray(payload) ? payload : []) {
        if (seen.has(merit.id)) continue;
        seen.add(merit.id);
        out.push(merit);
      }
    }
    return out;
  }, []);

  const allSelectableFlaws = useMemo(() => {
    const out = [];
    for (const [cat, payload] of Object.entries(MERITS_AND_FLAWS)) {
      if (['Caitiff', 'Thin-blood', 'Ghouls', 'Cults'].includes(cat)) continue;
      for (const flaw of Array.isArray(payload) ? payload : []) {
        out.push(flaw);
      }
    }
    return out;
  }, []);

  // Memoize all merits and flaws so we can look up their full descriptions later
  const allMeritsFlat = useMemo(() => allSelectableMerits, [allSelectableMerits]);
  const allFlawsFlat = useMemo(() => allSelectableFlaws, [allSelectableFlaws]);

  // Fetch all items from data to identify what is truly a Flaw
  const allDataItems = useMemo(() => listAllItems(), []);

  // Flaw ID mapping for self-healing logic
  const flawIds = useMemo(() => new Set(
    allDataItems
      .filter(it => it.type === 'advantage' && it.subtype === 'flaw')
      .map(it => it.id)
  ), [allDataItems]);

  // Flaw/Merit Rule Calculations (with Self-Healing)
  const rawMerits = useMemo(() => Array.isArray(sheet?.advantages?.merits) ? sheet.advantages.merits : [], [sheet]);
  const rawBackgrounds = useMemo(() => Array.isArray(sheet?.backgrounds) ? sheet.backgrounds : [], [sheet]);
  const rawFlaws = useMemo(() => Array.isArray(sheet?.advantages?.flaws) ? sheet.advantages.flaws : [], [sheet]);

  const meritsList = useMemo(() => {
    const list = [];
    const backgroundsList = [];
    rawMerits.forEach(m => flawIds.has(m.id) ? backgroundsList.push(m) : list.push(m));
    return list;
  }, [rawMerits, flawIds]);

  const backgroundsList = useMemo(() => {
    const list = [];
    rawBackgrounds.forEach(b => flawIds.has(b.id) ? [] : list.push(b)); // Move flawed backgrounds to flaws
    const temp = [];
    rawMerits.forEach(m => flawIds.has(m.id) ? temp.push(m) : null);
    rawBackgrounds.forEach(b => flawIds.has(b.id) ? temp.push(b) : null);
    return [...list, ...temp];
  }, [rawBackgrounds, rawMerits, flawIds]);

  const flawsList = useMemo(() => {
    const list = [...rawFlaws];
    rawMerits.forEach(m => flawIds.has(m.id) ? list.push(m) : null);
    rawBackgrounds.forEach(b => flawIds.has(b.id) ? list.push(b) : null);
    return list;
  }, [rawFlaws, rawMerits, rawBackgrounds, flawIds]);

  const totalMeritDots = useMemo(() => {
    const displayMerits = [...meritsList, ...backgroundsList];
    return displayMerits.reduce((sum, m) => sum + Number(m.dots || 0), 0);
  }, [meritsList, backgroundsList]);

  const totalFlawDots = useMemo(() => {
    return flawsList.reduce((sum, f) => sum + Number(f.dots || 0), 0);
  }, [flawsList]);

  const requiredFlaws = useMemo(() => Math.floor(totalMeritDots / 7) * 2, [totalMeritDots]);
  const flawDeficit = useMemo(() => Math.max(0, requiredFlaws - totalFlawDots), [requiredFlaws, totalFlawDots]);

  const glyf = useMemo(() => {
    const dotMap = { 0: '○', 1: '●', 2: '●●', 3: '●●●', 4: '●●●●', 5: '●●●●●' };
    return (n) => dotMap[n] || '●●●●●';
  }, []);

  // MeritAdder function
  const [meritQ, setMeritQ] = useState('');
  const [meritAddSeparate, setMeritAddSeparate] = useState(false);
  const [meritSelId, setMeritSelId] = useState(allMeritsFlat[0]?.id || '');
  const meritSel = useMemo(() => allMeritsFlat.find(m => m.id === meritSelId) || null, [allMeritsFlat, meritSelId]);

  const [meritMysticSelections, setMeritMysticSelections] = useState([]);

  const meritIsMystic = meritSel?.id === 'other__mystic_of_the_void';
  const meritMaxMystic = ['Hecata', 'Lasombra'].includes(ch?.clan || '') ? 3 : 1;

  // Determine if the selected merit allows multiple instances
  const meritAllowsMulti = meritSel &&
    ['Allies', 'Contacts', 'Resources', 'Retainers', 'Influence', 'Status'].includes(meritSel.name);

  const meritAvailableOblivion = useMemo(() => {
    const out = [];
    if (!meritIsMystic || typeof DISCIPLINES === 'undefined' || !DISCIPLINES['Oblivion']) return out;
    Object.entries(DISCIPLINES['Oblivion'].levels || {}).forEach(([lvlStr, list]) => {
      const level = Number(lvlStr);
      (list || []).forEach(p => {
        const normId = String(p.id ?? '').toLowerCase();
        if (!knownPowerNamesAndIds.has(normId)) {
          out.push({ ...p, level });
        }
      });
    });
    return out;
  }, [meritIsMystic, knownPowerNamesAndIds]);

  const meritFiltered = useMemo(() => {
    const qq = meritQ.trim().toLowerCase();
    if (!qq) return allMeritsFlat;
    return allMeritsFlat.filter(m =>
      m.name.toLowerCase().includes(qq) ||
      (m.category || '').toLowerCase().includes(qq)
    );
  }, [meritQ, allMeritsFlat]);

  const meritGroupedOptions = useMemo(() => {
    return meritFiltered.reduce((acc, m) => {
      acc[m.category || 'General'] = acc[m.category || 'General'] || [];
      acc[m.category || 'General'].push(m);
      return acc;
    }, {});
  }, [meritFiltered]);

  const meritDotsOptions = meritSel?.allowed || [];
  const [meritDots, setMeritDots] = useState(meritDotsOptions[0] || 1);

  const meritCurrentOwnedForSel = useMemo(() => {
    if (!meritSel) return 0;
    const displayMerits = [...meritsList, ...backgroundsList];
    return displayMerits
      .filter(m => m.id === meritSel.id)
      .reduce((max, m) => Math.max(max, Number(m.dots || 0)), 0);
  }, [meritSel, meritsList, backgroundsList]);

  useCallback(() => {
    const allowed = meritSel?.allowed || [1];
    const nextAllowed = allowed.find(n => n > meritCurrentOwnedForSel) ?? allowed[allowed.length - 1];
    setMeritDots(nextAllowed || 1);
  }, [meritSelId, meritsList, backgroundsList, meritSel, meritCurrentOwnedForSel]);

  const meritDelta = Math.max(0, Number(meritDots || 0) - meritCurrentOwnedForSel);
  const meritCost = meritAddSeparate
    ? XP_RULES.advantageDot(Number(meritDots || 0))
    : XP_RULES.advantageDot(meritDelta);
  const meritAfford = xp >= meritCost;
  const meritBlocked = !meritSel || (meritAddSeparate ? Number(meritDots || 0) <= 0 : meritDelta <= 0) || !meritAfford || (meritIsMystic && meritMysticSelections.length === 0);

  const handleMeritAdd = useCallback(async (merit, targetDots, options = {}) => {
    const separate = !!options.separate;
    const nextSheet = JSON.parse(JSON.stringify(sheet));

    nextSheet.advantages = nextSheet.advantages || { merits: [], flaws: [] };
    nextSheet.advantages.merits = Array.isArray(nextSheet.advantages.merits) ? nextSheet.advantages.merits : [];
    nextSheet.backgrounds = Array.isArray(nextSheet.backgrounds) ? nextSheet.backgrounds : [];

    const meritsArr = nextSheet.advantages.merits;
    const bgsArr    = nextSheet.backgrounds;

    const sameMerits = meritsArr.filter(m => m.id === merit.id);
    const sameBgs    = bgsArr.filter(b => b.id === merit.id);
    const currentDots = [...sameMerits, ...sameBgs].reduce(
      (max, e) => Math.max(max, Number(e.dots || 0)), 0
    );

    const preferBackgrounds = sameBgs.length > 0;

    if (separate) {
      const cost = XP_RULES.advantageDot(Number(targetDots) || 0);
      if (xp < cost) return;

      const instance = sameMerits.length + sameBgs.length + 1;
      const newEntry = {
        id: merit.id,
        name: merit.name,
        dots: Number(targetDots),
        from: 'xp_shop',
        instance,
      };
      if (options.notes) newEntry.notes = JSON.stringify(options.notes);

      if (preferBackgrounds) bgsArr.push(newEntry);
      else meritsArr.push(newEntry);

      await spendXP({
        type: 'advantage',
        target: merit.id,
        dots: Number(targetDots),
        patchSheet: nextSheet,
      });
      return;
    }

    const delta = Math.max(0, Number(targetDots) - currentDots);
    const cost = XP_RULES.advantageDot(delta);
    if (delta <= 0 || xp < cost) return;

    let upgraded = false;

    const tryUpgradeIn = (arr) => {
      for (let i = 0; i < arr.length; i++) {
        const entry = arr[i];
        if (entry.id === merit.id && Number(entry.dots || 0) === currentDots) {
          arr[i] = { ...entry, dots: Number(targetDots) };
          if (options.notes) arr[i].notes = JSON.stringify(options.notes);
          return true;
        }
      }
      return false;
    };

    upgraded = preferBackgrounds ? tryUpgradeIn(bgsArr) : tryUpgradeIn(meritsArr);
    if (!upgraded) {
      upgraded = preferBackgrounds ? tryUpgradeIn(meritsArr) : tryUpgradeIn(bgsArr);
    }

    if (!upgraded) {
      const newMerit = {
        id: merit.id,
        name: merit.name,
        dots: Number(targetDots),
        from: 'xp_shop',
        instance: sameMerits.length + sameBgs.length + 1,
      };
      if (options.notes) newMerit.notes = JSON.stringify(options.notes);
      meritsArr.push(newMerit);
    }

    await spendXP({
      type: 'advantage',
      target: merit.id,
      dots: delta,
      patchSheet: nextSheet,
    });
  }, [sheet, xp, ch, knownPowerNamesAndIds]);

  // FlawAdder function 
  const [flawQ, setFlawQ] = useState('');
  const [flawSelId, setFlawSelId] = useState(allFlawsFlat[0]?.id || '');
  const flawSel = useMemo(() => allFlawsFlat.find(f => f.id === flawSelId) || null, [allFlawsFlat, flawSelId]);

  const flawFiltered = useMemo(() => {
    const qq = flawQ.trim().toLowerCase();
    if (!qq) return allFlawsFlat;
    return allFlawsFlat.filter(f =>
      f.name.toLowerCase().includes(qq) ||
      (f.category || '').toLowerCase().includes(qq)
    );
  }, [flawQ, allFlawsFlat]);

  const flawGroupedOptions = useMemo(() => {
    return flawFiltered.reduce((acc, f) => {
      acc[f.category || 'General'] = acc[f.category || 'General'] || [];
      acc[f.category || 'General'].push(f);
      return acc;
    }, {});
  }, [flawFiltered]);

  const flawDotsOptions = flawSel?.allowed || [];
  const [flawDots, setFlawDots] = useState(flawDotsOptions[0] || 1);

  useEffect(() => {
    setFlawDots(flawSel?.allowed?.[0] || 1);
  }, [flawSelId, flawSel]);

  const flawBlocked = !flawSel || Number(flawDots || 0) <= 0;

  const handleFlawAdd = useCallback(async (flaw, targetDots) => {
    const nextSheet = JSON.parse(JSON.stringify(sheet));
    nextSheet.advantages = nextSheet.advantages || { merits: [], flaws: [] };
    nextSheet.advantages.flaws = Array.isArray(nextSheet.advantages.flaws) ? nextSheet.advantages.flaws : [];

    const newEntry = {
      id: flaw.id,
      name: flaw.name,
      dots: Number(targetDots),
      from: 'xp_shop'
    };

    nextSheet.advantages.flaws.push(newEntry);

    await spendXP({
      type: 'flaw',
      target: flaw.id,
      dots: Number(targetDots),
      patchSheet: nextSheet
    });
  }, [sheet, xp]);

  // Helper function for spending XP
  const spendXP = useCallback(async (xpData) => {
    console.log('Spending XP:', xpData);
  }, []);

  return (
    <>
      {/* Merits & Backgrounds */}
      <div className={styles.card}>
        <div className={styles.cardHead} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b>Merits & Backgrounds</b>
          <span className={styles.muted} style={{ fontSize: '0.85rem' }}>
            Total Dots: <b>{totalMeritDots}</b>
          </span>
        </div>

        {flawDeficit > 0 && (
          <div className={styles.alertWarning} style={{ marginBottom: 15 }}>
            <b>Rule Requirement:</b> You have {totalMeritDots} points in Merits. For every 7 points, you must take 2 points of Flaws.
            You currently need <b>{flawDeficit} more dot{flawDeficit > 1 ? 's' : ''}</b> in Flaws.
          </div>
        )}

        {/* MeritAdder UI */}
        <div className={styles.grid} style={{ gap: 12 }}>
          <div className={styles.rowForm}>
            <input
              className={styles.input}
              placeholder="Search merits… (name or category)"
              value={meritQ}
              onChange={e => setMeritQ(e.target.value)}
              style={{ flex: 1 }}
            />
            <span className={styles.muted}>Cost: <b>{meritCost}</b> XP</span>
          </div>

          <div className={styles.rowForm} style={{ flexWrap: 'wrap' }}>
            <select
              className={styles.input}
              value={meritSelId}
              onChange={e => setMeritSelId(e.target.value)}
              style={{ flex: 2, minWidth: 220 }}
            >
              {Object.entries(meritGroupedOptions).map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.dotsSpec})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <select
              className={styles.input}
              value={meritDots}
              onChange={e => setMeritDots(Number(e.target.value))}
              style={{ width: 120 }}
            >
              {meritDotsOptions.map(n => <option key={n} value={n}>{glyf(n)} ({n})</option>)}
            </select>

            <button
              className={styles.cta}
              disabled={meritBlocked}
              onClick={() => handleMeritAdd(meritSel, meritDots, { separate: meritAddSeparate, notes: meritIsMystic ? meritMysticSelections : undefined })}
              title={
                meritAddSeparate
                  ? (Number(meritDots || 0) <= 0 ? 'Pick a dot rating' : '')
                  : (meritDelta <= 0 ? 'You already have this rating (or higher)' : '')
              }
            >
              {meritAddSeparate
                ? `Add another (${meritDots} dot${Number(meritDots) === 1 ? '' : 's'})`
                : (meritCurrentOwnedForSel > 0
                  ? `Upgrade to ${meritDots} dot${Number(meritDots) === 1 ? '' : 's'}`
                  : `Add ${meritDots} dot${Number(meritDots) === 1 ? '' : 's'}`)}
            </button>

            {meritAllowsMulti && meritSel && (
              <label className={styles.checkboxRow} style={{ display:'flex', gap:8, alignItems:'center', marginTop:8 }}>
                <input
                  type="checkbox"
                  checked={meritAddSeparate}
                  onChange={e => setMeritAddSeparate(e.target.checked)}
                />
                <span>Add as another instance (don’t upgrade)</span>
              </label>
            )}
          </div>

          {meritIsMystic && (
            <div className={styles.rowForm} style={{ flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
              <label><b>Select {meritMaxMystic} Oblivion Power(s) for Prerequisites:</b></label>
              <select
                multiple={meritMaxMystic > 1}
                className={styles.input}
                style={{ height: meritMaxMystic > 1 ? '100px' : 'auto', width: '100%' }}
                value={meritMaxMystic > 1 ? meritMysticSelections : (meritMysticSelections[0] || '')}
                onChange={(e) => {
                  if (meritMaxMystic === 1) {
                    setMeritMysticSelections([e.target.value]);
                  } else {
                    const opts = Array.from(e.target.selectedOptions, o => o.value);
                    if (opts.length <= meritMaxMystic) setMeritMysticSelections(opts);
                  }
                }}
              >
                <option value="" disabled={meritMaxMystic === 1}>-- Select Power(s) --</option>
                {meritAvailableOblivion.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Level {p.level})</option>
                ))}
              </select>
              {meritMaxMystic > 1 && <span className={styles.muted}>Hold Ctrl/Cmd to select multiple (up to {meritMaxMystic}).</span>}
            </div>
          )}

          {meritSel && (
            <div className={styles.paneCard} style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {meritSel.name} <span style={{ opacity: 0.6, fontSize: '0.85rem', fontWeight: 'normal' }}>({meritSel.category})</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-color)', opacity: 0.8 }}>
                  Owned: <b>{[...meritsList, ...backgroundsList].filter(m => m.id === (meritSel.id || '')).length}</b> • Highest: <b>{meritCurrentOwnedForSel || '—'}</b>
                </div>
              </div>
              <div style={{ fontSize: '0.95rem', lineHeight: '1.5', opacity: 0.85 }}>
                {meritSel.description || 'No description available.'}
              </div>
            </div>
          )}
        </div>

        {/* Owned Merits & Backgrounds Display */}
        {(meritsList.length > 0 || backgroundsList.length > 0) && (
          <div className={styles.grid} style={{ marginTop: 15 }}>
            <div className={styles.subhead}>Owned Merits & Backgrounds</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...meritsList, ...backgroundsList].map((m, i) => {
                const details = allMeritsFlat.find(x => x.id === m.id);
                const desc = details?.description || 'No description available.';
                const notesStr = m.notes ? JSON.parse(m.notes) : '';

                return (
                  <div key={m.id || m.name + i}>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span>{m.name}</span> <span style={{ color: 'var(--text-color)', opacity: 0.7 }}>{glyf(m.dots || 0)}</span>
                        </span>
                        <span className={styles.muted} style={{ fontSize: '0.85rem' }}>{details?.category || ''}</span>
                      </div>
                      <div style={{ padding: '4px 0', fontSize: '0.95rem', opacity: 0.9 }}>
                        {desc}
                      </div>
                      {notesStr && (
                        <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, fontSize: '0.85rem' }}>
                          <b>Notes/Selections:</b> {notesStr}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Flaws */}
      <div className={styles.card}>
        <div className={styles.cardHead} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b>Flaws</b>
          <span className={styles.muted} style={{ fontSize: '0.85rem' }}>
            Total Dots: <b>{totalFlawDots}</b>
          </span>
        </div>

        {/* FlawAdder UI */}
        <div className={styles.grid} style={{ gap: 12 }}>
          <div className={styles.rowForm}>
            <input
              className={styles.input}
              placeholder="Search flaws… (name or category)"
              value={flawQ}
              onChange={e => setFlawQ(e.target.value)}
              style={{ flex: 1 }}
            />
            <span className={styles.muted}>Cost: <b>0 XP</b></span>
          </div>

          <div className={styles.rowForm} style={{ flexWrap: 'wrap' }}>
            <select
              className={styles.input}
              value={flawSelId}
              onChange={e => setFlawSelId(e.target.value)}
              style={{ flex: 2, minWidth: 220 }}
            >
              {Object.entries(flawGroupedOptions).map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.dotsSpec})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <select
              className={styles.input}
              value={flawDots}
              onChange={e => setFlawDots(Number(e.target.value))}
              style={{ width: 120 }}
            >
              {flawDotsOptions.map(n => <option key={n} value={n}>{glyf(n)} ({n})</option>)}
            </select>

            <button
              className={styles.cta}
              disabled={flawBlocked}
              onClick={() => handleFlawAdd(flawSel, flawDots)}
            >
              Add {flawDots} dot{Number(flawDots) === 1 ? '' : 's'}
            </button>
          </div>

          {flawSel && (
            <div className={styles.paneCard} style={{ padding: '14px', background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,0,0,0.2)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {flawSel.name} <span style={{ opacity: 0.6, fontSize: '0.85rem', fontWeight: 'normal' }}>({flawSel.category})</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-color)', opacity: 0.8 }}>
                  Owned: <b>{flawsList.filter(f => f.id === (flawSel.id || '')).length}</b>
                </div>
              </div>
              <div style={{ fontSize: '0.95rem', lineHeight: '1.5', opacity: 0.85 }}>
                {flawSel.description || 'No description available.'}
              </div>
            </div>
          )}
        </div>

        {/* Known Flaws Display */}
        {flawsList.length > 0 && (
          <div className={styles.grid} style={{ marginTop: 20 }}>
            <div className={styles.subhead}>Known Flaws</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {flawsList.map((f, i) => {
                const details = allFlawsFlat.find(x => x.id === f.id);
                const desc = details?.description || 'No description available.';

                return (
                  <div key={f.id || f.name + i}>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span>{f.name}</span> <span style={{ color: '#b40f1f' }}>{glyf(f.dots || 0)}</span>
                        </span>
                        <span className={styles.muted} style={{ fontSize: '0.85rem' }}>{details?.category || ''}</span>
                      </div>
                      <div style={{ padding: '4px 0', fontSize: '0.95rem', opacity: 0.9 }}>
                        {desc}
                      </div>
                      {f.notes && (
                        <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,0,0,0.05)', borderRadius: 4, fontSize: '0.85rem' }}>
                          <b>Notes:</b> {f.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MeritsBackgroundsSection;