// src/pages/Coteries.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import {
  COTERIES,
  COTERIE_DOC,
  ALL_COTERIE_NAMES,
  getCoterie,
} from '../data/cotteries';
import styles from '../styles/Coteries.module.css';

/* ===== Pull domains the same way as Domains.jsx ===== */
import domainsRaw from '../data/Domains.json';

// Keep this mapping in sync with Domains.jsx
const DIVISION_NAMES = {
  1: 'Pagkrati', 2: 'Zografou/Kaisarianh', 3: 'Exarxia', 4: 'Boula', 5: 'Ampelokhpoi',
  6: 'Kalithea', 7: 'Petralona', 8: 'Plaka', 9: 'Keramikos', 10: 'Tauros, Agios Ioannis Rentis',
  11: 'Thiseio', 12: 'Mosxato', 13: 'Palaio Faliro', 14: 'Nea Smyrnh', 15: 'Agios Dhmhtrios',
  16: 'Neos Kosmos', 17: 'Nea Penteli, Melissia', 18: 'Kolonaki, Lykabhtos', 19: 'Peristeri',
  20: 'Aigaleo', 21: 'Petroupolh, Ilion, Agioi Anargyroi, Kamatero', 22: 'Ellhniko, Argyroupolh',
  23: 'Psyxiko, Neo Psyxiko', 24: 'Attikh', 25: 'Kypselh', 26: 'Galatsi', 27: 'Khfisia, Nea Erythraia',
  28: 'Alimos', 29: 'Marousi, Peykh', 30: 'Hrakleio, Metamorfosi, Lykobrysh', 31: 'Xalandri, Brilissia',
  32: 'Perama, Keratsini', 33: 'Pathsia', 34: 'Kolonos, Sepolia', 35: 'Xolargos, Agia Paraskeyh',
  36: 'Katexakh', 37: 'Nea Philadepfia', 38: 'Hlioupolh, Byronas', 39: 'Athina', 40: 'Psyrh',
  41: 'Ymuttos', 42: 'Parnitha', 43: 'Peiraias, Neo Faliro', 44: 'Xaidari',
  45: 'Korydallos, Nikaia, Agia Barbara', 46: 'Glyfada', 47: 'Gkyzh', 48: 'Eleysina', 49: 'Aspropirgos'
};

function computeAllDomainsFromJson() {
  if (!domainsRaw || !Array.isArray(domainsRaw.features)) return [];
  const list = [];
  domainsRaw.features.forEach((f, i) => {
    const n = f?.properties?.division != null ? Number(f.properties.division) : (i + 1);
    const name = DIVISION_NAMES[n] || `Division ${n}`;
    list.push({ number: n, name });
  });
  return list.sort((a, b) => a.number - b.number);
}
/* ==================================================== */

/* ---------- Small UI helpers (unchanged) ---------- */
function Card({ title, subtitle, children, footer, tone = 'default' }) {
  return (
    <section className={styles.card} data-tone={tone}>
      {(title || subtitle) && (
        <header className={styles.cardHeader}>
          {title && <h3 className={styles.cardTitle}>{title}</h3>}
          {subtitle && <span className={styles.cardSubtitle}>{subtitle}</span>}
        </header>
      )}
      {children}
      {footer}
    </section>
  );
}
function Tabs({ tabs, value, onChange }) {
  return (
    <div className={styles.tabs}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`${styles.tabButton} ${active ? styles.tabButtonActive : ''}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
function Dot({ on }) { return <span className={`${styles.dot} ${on ? styles.dotFilled : ''}`} />; }
function DotPicker({ label, value, setValue, max = 5, locked = 0 }) {
  const handle = (k) => {
    if (k < locked) k = locked;
    setValue(k === value ? Math.max(locked, k - 1) : k);
  };
  return (
    <div className={styles.dotPicker}>
      <div className={styles.dotLabel}>
        {label}
        {locked > 0 && <span className={styles.dotLabelBaseline}>(baseline: {locked})</span>}
      </div>
      <div className={styles.dotsContainer}>
        <div className={styles.dots}>
          {Array.from({ length: max }).map((_, i) => {
            const k = i + 1;
            const on = k <= value;
            const isLocked = k <= locked;
            return (
              <button
                key={k}
                onClick={() => handle(k)}
                title={`${label}: ${k}`}
                className={`${styles.dotButton} ${isLocked ? styles.dotButtonLocked : ''}`}
              >
                <Dot on={on} />
              </button>
            );
          })}
        </div>
        <span className={styles.dotCount}>{value} / {max}</span>
      </div>
    </div>
  );
}
function NumberInput({ label, value, setValue, min = 0, max = 99, step = 1, width = 'auto' }) {
  return (
    <label className={styles.field} style={{ width }}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="number"
        value={value}
        min={min} max={max} step={step}
        onChange={(e) => setValue(Math.min(max, Math.max(min, Number(e.target.value || 0))))}
        className={`${styles.input} ${styles.numberInput}`}
      />
    </label>
  );
}
function Text({ children }) { return <p className={styles.text}>{children}</p>; }
function Muted({ children, className }) { return <p className={`${styles.muted} ${className || ''}`}>{children}</p>; }
function ManualAdder({ onAdd }) {
  const [name, setName] = useState('');
  return (
    <>
      <input
        placeholder="Name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={styles.input}
      />
      <button
        onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(''); } }}
        className={styles.buttonSecondary}
      >
        Add
      </button>
    </>
  );
}
function MembersPicker({ members, setMembers, roster }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return roster || [];
    return (roster || []).filter((u) =>
      (u.display_name || '').toLowerCase().includes(s) ||
      (u.char_name || '').toLowerCase().includes(s)
    );
  }, [q, roster]);

  function addMember(u) {
    if (!u) return;
    if (members.some((m) => m.id === u.id)) return;
    setMembers([...members, { id: u.id, name: u.display_name || u.char_name || `User #${u.id}` }]);
  }
  function addManual(name) {
    const n = (name || '').trim();
    if (!n) return;
    const pseudoId = -Date.now();
    setMembers([...members, { id: pseudoId, name: n }]);
  }
  function removeMember(id) {
    setMembers(members.filter((m) => m.id !== id));
  }

  return (
    <Card title="Members" subtitle="Minimum 3 players">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          placeholder="Find player by name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={styles.memberSearchInput}
        />
      </div>

      <div className={styles.memberListContainer}>
        {filtered.slice(0, 50).map((u) => (
          <button
            key={u.id}
            onClick={() => addMember(u)}
            className={styles.memberListItem}
            title="Add member"
          >
            <b>{u.display_name}</b>{u.char_name ? ` — ${u.char_name}` : ''}{u.clan ? ` (${u.clan})` : ''}
          </button>
        ))}
        {!filtered.length && <Muted>No results.</Muted>}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Muted>Or add manual:</Muted>
        <ManualAdder onAdd={addManual} />
      </div>

      <div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Current Members</div>
        {members.length === 0 ? (
          <Muted>No members yet.</Muted>
        ) : (
          <ul className={styles.currentMembersList}>
            {members.map((m) => (
              <li key={m.id} className={styles.currentMemberItem}>
                <span className={styles.currentMemberName}>{m.name}</span>
                <button
                  onClick={() => removeMember(m.id)}
                  className={styles.removeButton}
                  title="Remove"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Muted>Minimum members required: <b>3</b></Muted>
    </Card>
  );
}
function RequiredList({ items }) {
  if (!items || Object.keys(items).length === 0) return <Muted>No required advantages for this type.</Muted>;
  const rows = Object.entries(items);
  return (
    <ul className={styles.attributeList}>
      {rows.map(([name, dots]) => (
        <li key={name}>
          <b>{name}</b>{typeof dots === 'number' ? ` ${'•'.repeat(dots)}` : ''}
        </li>
      ))}
    </ul>
  );
}
function ExtrasList({ items }) {
  if (!items || !items.length) return <Muted>No suggestions.</Muted>;
  return (
    <ul className={styles.attributeList}>
      {items.map((x, i) => (<li key={`${x}-${i}`}>{x}</li>))}
    </ul>
  );
}
function BackgroundsEditor({ items, setItems, remaining }) {
  const [q, setQ] = useState(''); const [dots, setDots] = useState(1);
  function add() {
    const name = q.trim(); if (!name) return; if (dots > remaining) return;
    setItems([...items, { name, dots }]); setQ(''); setDots(1);
  }
  function updateDots(idx, v) {
    const next = [...items];
    const oldDots = next[idx].dots;
    const newDots = Math.max(1, Math.min(5, v));
    const delta = newDots - oldDots;
    if (delta > 0 && delta > remaining) return;
    next[idx] = { ...next[idx], dots: newDots };
    setItems(next);
  }
  function remove(idx) { const next = [...items]; next.splice(idx, 1); setItems(next); }

  return (
    <Card title="Backgrounds (Coterie-owned)" subtitle="e.g., Haven, Resources, Allies, Contacts, Retainers…">
      <Muted>Whatever belongs to the Coterie also charges the others when used. Changes require unanimous agreement.</Muted>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          placeholder="Background name (e.g., Haven)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={styles.backgroundInput}
        />
        <NumberInput label="Dots" value={dots} setValue={setDots} min={1} max={5} width="100px" />
        <button onClick={add} disabled={!q.trim() || dots > remaining} className={styles.buttonPrimary}>
          Add Background
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {items.length === 0 ? (
          <Muted>No backgrounds yet.</Muted>
        ) : (
          items.map((bg, idx) => (
            <div key={`${bg.name}-${idx}`} className={styles.backgroundItem}>
              <div className={styles.backgroundNameDisplay}><b>{bg.name}</b></div>
              <div className={styles.backgroundControls}>
                <DotPicker label="Dots" value={bg.dots} setValue={(v) => updateDots(idx, v)} max={5} />
                <button onClick={() => remove(idx)} className={styles.removeButton} title="Remove background">
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
function TypesBrowser({ onPick }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ALL_COTERIE_NAMES;
    return ALL_COTERIE_NAMES.filter((n) => n.toLowerCase().includes(s));
  }, [q]);

  const bonus = COTERIE_DOC.bonus_eligible;

  return (
    <Card title="Coterie Types (Catalog)" subtitle="Pick one to pre-fill the builder">
      <Muted className={styles.muted} style={{ marginBottom: 8 }}>
        Build what the troupe desires first — rules second. Swap prerequisites if needed. Some types (at ST discretion) grant +1 to a Domain Trait if all pre-reqs are met (never above 5).
      </Muted>
      <details>
        <summary className={styles.summaryLink}>Bonus Eligibility (ST discretion)</summary>
        <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
          <Muted><b>Chasse:</b> {bonus.Chasse.join(', ')}</Muted>
          <Muted><b>Lien:</b> {bonus.Lien.join(', ')}</Muted>
          <Muted><b>Portillon:</b> {bonus.Portillon.join(', ')}</Muted>
          <Muted><b>No Domain:</b> add the extra dot to {bonus.no_domain_bonus_fallback.join(' / ')}.</Muted>
        </div>
      </details>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search type…"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          className={styles.typeSearchInput}
        />
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {list.map((name) => {
          const c = getCoterie(name);
          const d = c?.domain;
          const domainText = d
            ? ['chasse','lien','portillon']
                .filter((k)=>d[k])
                .map((k)=>`${k[0].toUpperCase()+k.slice(1)} ${'•'.repeat(d[k])}`)
                .join('  ')
            : 'None';
          return (
            <div key={name} className={styles.typeItem}>
              <div className={styles.typeItemHeader}>
                <b className={styles.typeName}>{name}</b>
                <button onClick={() => onPick(name)} className={styles.applyTypeButton}>
                  Use this type
                </button>
              </div>
              <Muted><b>Domain:</b> {domainText}</Muted>
              {c?.preferred_resonances?.length ? (
                <Muted><b>Preferred Resonances:</b> {c.preferred_resonances.join(', ')}</Muted>
              ) : null}
              {c?.notes && <Muted><b>Notes:</b> {c.notes}</Muted>}
            </div>
          );
        })}
        {!list.length && <Muted>No types match "{q}".</Muted>}
      </div>
    </Card>
  );
}

/* =================== Main Coteries =================== */
export default function Coteries() {
  const [tab, setTab] = useState('overview');

  // Domains from JSON (no API needed)
  const allDomains = useMemo(() => computeAllDomainsFromJson(), []);
  const domainOptions = useMemo(
    () => allDomains.map(d => ({ value: d.number, label: d.name })),
    [allDomains]
  );

  // Roster (unchanged)
  const [users, setUsers] = useState([]);
  useEffect(() => {
    let mounted = true;
    api.get('/chat/users')
      .then(({ data }) => { if (mounted) setUsers(data?.users || []); })
      .catch(() => { if (mounted) setUsers([]); });
    return () => { mounted = false; };
  }, []);

  // Builder state (unchanged)
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [domainId, setDomainId] = useState('');
  const [members, setMembers] = useState([]);
  const [pointsPerMember, setPointsPerMember] = useState(1);
  const [coterieXP, setCoterieXP] = useState(0);

  const [chasse, setChasse] = useState(0);
  const [lien, setLien] = useState(0);
  const [portillon, setPortillon] = useState(0);
  const [baseline, setBaseline] = useState({ chasse: 0, lien: 0, portillon: 0 });

  const [required, setRequired] = useState({});
  const [extras, setExtras] = useState([]);
  const [backgrounds, setBackgrounds] = useState([]);

  const poolTotal = useMemo(() => members.length * pointsPerMember, [members.length, pointsPerMember]);
  const requiredSpend = useMemo(() => Object.values(required).reduce((s, v) => s + (Number(v) || 0), 0), [required]);
  const domainSpend = useMemo(() => Math.max(0, chasse - baseline.chasse) + Math.max(0, lien - baseline.lien) + Math.max(0, portillon - baseline.portillon), [chasse, lien, portillon, baseline]);
  const backgroundsSpend = useMemo(() => backgrounds.reduce((s, b) => s + (Number(b.dots) || 0), 0), [backgrounds]);
  const allocated = useMemo(() => requiredSpend + domainSpend + backgroundsSpend, [requiredSpend, domainSpend, backgroundsSpend]);

  const selectedTypeObj = useMemo(() => (selectedType ? getCoterie(selectedType) : null), [selectedType]);
  const typeHasNoDomain = !selectedTypeObj || selectedTypeObj.domain == null;

  const remaining = Math.max(0, poolTotal - allocated);
  const valid = useMemo(() => {
    const hasMinMembers = members.length >= 3;
    const hasName = name.trim().length > 0;
    const hasDomain = typeHasNoDomain ? true : Boolean(domainId);
    const notOverspent = allocated <= poolTotal;
    return hasMinMembers && hasName && hasDomain && notOverspent;
  }, [members.length, name, domainId, allocated, poolTotal, typeHasNoDomain]);

  const applyType = (typeName) => {
    const c = getCoterie(typeName);
    if (!c) return;
    setSelectedType(typeName);
    const base = {
      chasse: Number(c?.domain?.chasse || 0),
      lien: Number(c?.domain?.lien || 0),
      portillon: Number(c?.domain?.portillon || 0)
    };
    setBaseline(base);
    setChasse(v => Math.max(base.chasse, v));
    setLien(v => Math.max(base.lien, v));
    setPortillon(v => Math.max(base.portillon, v));
    setRequired({ ...(c?.required || {}) });
    setExtras([...(c?.extras || [])]);
    if (!c?.domain) setDomainId('');
  };

  function resetAllocations() {
    setChasse(baseline.chasse); setLien(baseline.lien); setPortillon(baseline.portillon);
    setBackgrounds([]);
  }

  function exportJSON() {
    const domain = domainOptions.find((d) => String(d.value) === String(domainId));
    const payload = {
      name: name.trim(),
      type: selectedType || null,
      domain_id: domain ? domain.value : (typeHasNoDomain ? null : ''),
      domain_name: domain ? domain.label : (typeHasNoDomain ? null : ''),
      members: members.map((m) => ({ id: m.id < 0 ? null : m.id, name: m.name })),
      pool: { per_member: pointsPerMember, total: poolTotal, spent: allocated, remaining },
      traits: { chasse, lien, portillon, baseline },
      required,
      backgrounds,
      extras_suggested: extras,
      coterie_xp: coterieXP,
      rules_meta: { doc: COTERIE_DOC },
      created_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    const fn = `coterie-${(name || 'draft').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.href = url; a.download = fn; a.click(); URL.revokeObjectURL(url);
  }

  // Overview copy (unchanged)
  const coreEnglish = [
    "A coterie is a small group of Kindred, bound together by necessity, ambition, or shared circumstance.",
    "They often share resources, a common Haven, and mutual goals, navigating the treacherous politics of the night together.",
    "Mechanically, a coterie is built using pooled points contributed by its members, allowing access to shared Backgrounds and unique Domain Traits.",
    "Forming a coterie requires agreement among its members and often involves formal recognition within the local Kindred hierarchy."
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h2 className={styles.title}>Coteries</h2>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'builder', label: 'Builder' },
            { value: 'types', label: 'Types' },
          ]}
        />
      </div>

      {tab === 'overview' && (
        <>
          <Card title="What are Coteries?" subtitle="Instructions and basic rules">
            {coreEnglish.map((p, idx) => <Text key={idx}>{p}</Text>)}
          </Card>
          <Card title="Using Types" subtitle="Pool, costs & optional bonuses">
            {COTERIE_DOC.overview.map((p, i) => <Text key={`ov-${i}`}>{p}</Text>)}
            <hr className={styles.hr} />
            {COTERIE_DOC.pool_rules.map((p, i) => <Muted key={`pool-${i}`}>{p}</Muted>)}
            <hr className={styles.hr} />
            {COTERIE_DOC.bonus_rules.map((p, i) => <Muted key={`bonus-${i}`}>{p}</Muted>)}
          </Card>
        </>
      )}

      {tab === 'builder' && (
        <>
          <Card title="Pick a Type (optional)" subtitle="Applying a type will pre-fill baseline Domain and Required costs.">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label className={styles.field} style={{flex: '1 1 280px'}}>
                <span className={styles.fieldLabel}>Coterie Type</span>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className={styles.select}
                >
                  <option value="">— (None) —</option>
                  {ALL_COTERIE_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <button
                onClick={() => selectedType && applyType(selectedType)}
                disabled={!selectedType}
                className={styles.applyTypeButton}
                style={{ alignSelf: 'flex-end' }}
              >
                Apply Type
              </button>
            </div>

            {selectedType && (
              <div style={{ display: 'grid', gap: 10 }}>
                <Muted><b>Required (costs paid from pool):</b></Muted>
                <RequiredList items={required} />
                {extras?.length ? (
                  <>
                    <Muted style={{ marginTop: 8 }}><b>Possible Extras (suggestions):</b></Muted>
                    <ExtrasList items={extras} />
                  </>
                ) : null}
              </div>
            )}
          </Card>

          <Card title="Basics">
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Coterie Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Night Wardens"
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                Domain {selectedTypeObj && selectedTypeObj.domain == null ? <em className={styles.muted}>(not required for this type)</em> : '(required)'}
              </span>
              <select
                value={domainId}
                onChange={(e) => setDomainId(e.target.value)}
                disabled={selectedTypeObj && selectedTypeObj.domain == null}
                className={styles.select}
              >
                <option value="">— Select domain —</option>
                {domainOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    #{o.value} — {o.label}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <NumberInput label="Points per member" value={pointsPerMember} setValue={setPointsPerMember} min={1} max={2} width="150px" />
              <NumberInput label="Coterie XP (starting)" value={coterieXP} setValue={setCoterieXP} min={0} max={999} width="150px" />
              <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Pool</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Muted>Total: <b>{poolTotal}</b></Muted>
                  <Muted>Spent: <b>{allocated}</b></Muted>
                  <Muted>Remaining: <b>{remaining}</b></Muted>
                </div>
              </div>
              <div>
                <button onClick={resetAllocations} className={styles.buttonSecondary}>Reset allocations</button>
              </div>
            </div>
          </Card>

          <MembersPicker members={members} setMembers={setMembers} roster={users} />

          <Card title="Domain Traits" subtitle="Distribute from the shared pool">
            <DotPicker label="Chasse" value={chasse} setValue={setChasse} locked={baseline.chasse} />
            <DotPicker label="Lien" value={lien} setValue={setLien} locked={baseline.lien} />
            <DotPicker label="Portillon" value={portillon} setValue={setPortillon} locked={baseline.portillon} />
            <Muted>Remaining points available: <b>{remaining}</b></Muted>
          </Card>

          <Card title="Required (from chosen type)" subtitle="Already counted in pool spend">
            <RequiredList items={required} />
          </Card>

          <BackgroundsEditor items={backgrounds} setItems={setBackgrounds} remaining={remaining} />

          <Card tone={valid ? 'success' : 'warn'} title="Export">
            {!valid && (
              <Muted>
                Required: name, ≥3 members, don’t overspend the pool
                {selectedTypeObj && selectedTypeObj.domain == null ? '' : ', and select a Domain'}.
              </Muted>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={exportJSON}
                disabled={!valid}
                className={styles.buttonPrimary}
                title={valid ? 'Download coterie draft JSON' : 'Fill required fields first'}
              >
                Export JSON
              </button>
            </div>
          </Card>
        </>
      )}

      {tab === 'types' && (
        <TypesBrowser onPick={(n) => { setTab('builder'); applyType(n); }} />
      )}
    </div>
  );
}
