import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/court/CourtActions.module.css';
import { BoonForm } from '../boons/Boons';

const WEIGHT = { trivial: 1, minor: 2, major: 3, life: 4 };
const LEVELS = ['life', 'major', 'minor', 'trivial'];
const LABEL = { trivial: 'Trivial', minor: 'Minor', major: 'Major', life: 'Life' };
const lc = (v, d) => String(v || d).toLowerCase();
const key = (n) => String(n || '').trim().toLowerCase();

const Icon = ({ name, size = 18 }) => (
  <span className="material-symbols-outlined" style={{ fontSize: size }} aria-hidden="true">{name}</span>
);

// Per-person standing: weighted credit held minus weighted debt owed (open boons only).
function useLedger(boons) {
  return useMemo(() => {
    const people = new Map();
    const touch = (name) => {
      const k = key(name);
      if (!people.has(k)) people.set(k, { name: String(name).trim(), owes: [], owed: [], debt: 0, credit: 0 });
      return people.get(k);
    };
    const totals = { open: 0, paid: 0, excused: 0, byLevel: { life: 0, major: 0, minor: 0, trivial: 0 }, last30: 0 };
    const monthAgo = Date.now() - 30 * 864e5;
    for (const b of boons) {
      const status = lc(b.status, 'owed');
      const level = lc(b.level, 'trivial');
      if (new Date(b.created_at).getTime() > monthAgo) totals.last30++;
      if (status === 'owed') { totals.open++; totals.byLevel[level] = (totals.byLevel[level] || 0) + 1; }
      else if (status === 'paid') totals.paid++;
      else totals.excused++;
      if (!b.from_name || !b.to_name) continue;
      const debtor = touch(b.from_name);
      const creditor = touch(b.to_name);
      debtor.owes.push(b);
      creditor.owed.push(b);
      if (status === 'owed') {
        debtor.debt += WEIGHT[level] || 1;
        creditor.credit += WEIGHT[level] || 1;
      }
    }
    const list = [...people.values()].map(p => ({ ...p, net: p.credit - p.debt }));
    return {
      totals,
      people: list.sort((a, b) => a.name.localeCompare(b.name)),
      debtors: [...list].filter(p => p.debt).sort((a, b) => b.debt - a.debt).slice(0, 5),
      creditors: [...list].filter(p => p.credit).sort((a, b) => b.credit - a.credit).slice(0, 5),
    };
  }, [boons]);
}

function Guide() {
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}><Icon name="menu_book" /> The Laws of Prestation</h2>
      <p className={styles.hint}>A boon is a debt of favour between Kindred. The Harpy keeps the ledger, and the ledger is the court's memory: a debt the Harpy has not recorded is a debt that can be denied.</p>
      <dl className={styles.guide}>
        <dt>Trivial</dt><dd>A small courtesy: an introduction, a message carried, a night's shelter. Repaid in kind.</dd>
        <dt>Minor</dt><dd>A favour that costs time or some risk: a secret kept, a ghoul lent, a vote cast.</dd>
        <dt>Major</dt><dd>A favour of great cost: a domain shared, a rival ruined, a Discipline taught.</dd>
        <dt>Life</dt><dd>The debtor owes their unlife. Rarely granted, never forgotten, inherited by the creditor's heirs.</dd>
        <dt>Repaid or excused</dt><dd>When the creditor names the favour and it is done, mark it Paid. A creditor may also forgive it (Excused).</dd>
        <dt>Reneging</dt><dd>Refusing a fair call on a boon is a public disgrace. The Harpy may strip Status from the debtor; record the outcome in the boon's notes.</dd>
      </dl>
    </section>
  );
}

function StatusTable() {
  const [roster, setRoster] = useState([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/camarilla/roster').then(({ data }) => setRoster((data.roster || []).filter(r => !r.is_deceased))).catch(() => setErr('Could not load the roster.'));
  }, []);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return roster.filter(r => !n || (r.name || '').toLowerCase().includes(n) || (r.clan || '').toLowerCase().includes(n)).slice(0, 40);
  }, [roster, q]);

  const bump = async (r, delta) => {
    const next = Math.max(0, Math.min(5, (r.status ?? 1) + delta));
    if (next === (r.status ?? 1)) return;
    setRoster(prev => prev.map(x => (x.id === r.id && x.type === r.type ? { ...x, status: next } : x)));
    try { await api.patch('/camarilla/status', { id: r.id, type: r.type, status: next }); }
    catch (e) {
      setRoster(prev => prev.map(x => (x.id === r.id && x.type === r.type ? { ...x, status: r.status } : x)));
      setErr(formatApiError(e, 'Status was not changed.'));
    }
  };

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}><Icon name="military_tech" /> Status</h2>
      <p className={styles.hint}>Raise those who honour their debts; lower those who shame the court. Changes show on the Court Hierarchy at once.</p>
      {err && <div className={styles.error}>{err}</div>}
      <input className={styles.input} placeholder="Search name or clan" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: '0.5rem' }} />
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {shown.map(r => (
          <div key={`${r.type}${r.id}`} className={styles.statusRow}>
            <span>{r.name} <span className={styles.itemMeta}>{r.clan}</span></span>
            <span className={styles.stepper}>
              <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => bump(r, -1)} aria-label={`Lower status of ${r.name}`}><Icon name="remove" size={16} /></button>
              <b>{r.status ?? 1}</b>
              <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => bump(r, 1)} aria-label={`Raise status of ${r.name}`}><Icon name="add" size={16} /></button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HarpyPanel() {
  const queryClient = useQueryClient();
  const { data: boonsData, isLoading } = useQuery({ queryKey: ['boons'], queryFn: async () => (await api.get('/boons')).data });
  const { data: entData } = useQuery({ queryKey: ['boons', 'entities'], queryFn: async () => (await api.get('/boons/entities')).data });
  const boons = useMemo(() => boonsData?.boons || [], [boonsData]);
  const { totals, people, debtors, creditors } = useLedger(boons);
  const [showForm, setShowForm] = useState(false);
  const [who, setWho] = useState('');

  const person = people.find(p => key(p.name) === who);
  const open = boons.filter(b => lc(b.status, 'owed') === 'owed');

  const resolve = async (b, status) => {
    if (!window.confirm(`Mark the ${LABEL[lc(b.level, 'trivial')]} boon of ${b.from_name} to ${b.to_name} as ${status}?`)) return;
    try { await api.patch(`/boons/${b.id}`, { status }); queryClient.invalidateQueries({ queryKey: ['boons'] }); }
    catch (e) { alert(formatApiError(e, 'The ledger was not changed.')); }
  };

  const BoonLine = ({ b, actions = true }) => (
    <div className={styles.item}>
      <div className={styles.itemHead}>
        <span><b>{b.from_name}</b> <span className={styles.itemMeta}>owes</span> <b>{b.to_name}</b></span>
        <span className={`${styles.badge} ${lc(b.status) === 'owed' ? styles.bProposed : styles.bClosed}`}>{LABEL[lc(b.level, 'trivial')]} · {lc(b.status, 'owed')}</span>
      </div>
      {b.description && <p className={styles.itemBody}>{b.description}</p>}
      {actions && lc(b.status, 'owed') === 'owed' && (
        <div className={styles.row}>
          <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => resolve(b, 'paid')}>Repaid</button>
          <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => resolve(b, 'excused')}>Excused</button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <section className={styles.panel}>
        <div className={styles.itemHead}>
          <h2 className={styles.panelTitle}><Icon name="handshake" /> The Ledger</h2>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowForm(true)}><Icon name="add" /> Record a boon</button>
        </div>
        {isLoading ? <div className={styles.empty}>Opening the ledger...</div> : (
          <>
            <div className={styles.stats} style={{ marginTop: '0.75rem' }}>
              <div className={styles.stat}><div className={styles.statValue}>{totals.open}</div><div className={styles.statLabel}>Open boons</div></div>
              {LEVELS.map(l => (
                <div key={l} className={styles.stat}><div className={styles.statValue}>{totals.byLevel[l] || 0}</div><div className={styles.statLabel}>{LABEL[l]} owed</div></div>
              ))}
              <div className={styles.stat}><div className={styles.statValue}>{totals.paid}</div><div className={styles.statLabel}>Repaid</div></div>
              <div className={styles.stat}><div className={styles.statValue}>{totals.excused}</div><div className={styles.statLabel}>Excused</div></div>
              <div className={styles.stat}><div className={styles.statValue}>{totals.last30}</div><div className={styles.statLabel}>Recorded, 30 nights</div></div>
            </div>
            <div className={styles.grid2}>
              <div>
                <h3 className={styles.sectionLabel}>Most indebted</h3>
                {debtors.length ? debtors.map((p, i) => (
                  <div key={p.name} className={styles.rank}><span><span className={styles.rankNum}>{i + 1}.</span> {p.name}</span><span className={styles.netNeg}>{p.debt}</span></div>
                )) : <div className={styles.empty}>No one owes anything.</div>}
              </div>
              <div>
                <h3 className={styles.sectionLabel}>Greatest creditors</h3>
                {creditors.length ? creditors.map((p, i) => (
                  <div key={p.name} className={styles.rank}><span><span className={styles.rankNum}>{i + 1}.</span> {p.name}</span><span className={styles.netPos}>{p.credit}</span></div>
                )) : <div className={styles.empty}>No one is owed anything.</div>}
              </div>
            </div>
            <p className={styles.itemMeta} style={{ marginTop: '0.6rem' }}>Weight of open boons: Trivial 1, Minor 2, Major 3, Life 4.</p>
          </>
        )}
      </section>

      <div className={styles.grid2}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}><Icon name="hub" /> Debt Web</h2>
          <p className={styles.hint}>Everything one Kindred owes and is owed, and where they stand.</p>
          <select className={styles.input} value={who} onChange={e => setWho(e.target.value)}>
            <option value="">Choose a name from the ledger</option>
            {people.map(p => <option key={key(p.name)} value={key(p.name)}>{p.name}</option>)}
          </select>
          {person && (
            <>
              <div className={styles.rank} style={{ marginTop: '0.75rem' }}>
                <span>Standing</span>
                <span className={`${styles.net} ${person.net >= 0 ? styles.netPos : styles.netNeg}`}>{person.net > 0 ? '+' : ''}{person.net}</span>
              </div>
              <h3 className={styles.sectionLabel}>Owes ({person.owes.length})</h3>
              <div className={styles.list}>{person.owes.map(b => <BoonLine key={b.id} b={b} />)}</div>
              <h3 className={styles.sectionLabel}>Is owed ({person.owed.length})</h3>
              <div className={styles.list}>{person.owed.map(b => <BoonLine key={b.id} b={b} />)}</div>
            </>
          )}
        </section>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}><Icon name="pending_actions" /> Outstanding ({open.length})</h2>
          <div className={styles.list} style={{ maxHeight: 520, overflowY: 'auto' }}>
            {open.length ? open.map(b => <BoonLine key={b.id} b={b} />) : <div className={styles.empty}>Every debt is settled.</div>}
          </div>
        </section>
      </div>

      <div className={styles.grid2}>
        <StatusTable />
        <Guide />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-surface-container-high gothic-etched-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <BoonForm entities={entData?.entities || []} boon={null} onSave={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
