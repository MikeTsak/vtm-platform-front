import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/court/CourtActions.module.css';
import AnnouncementsView from '../announcements/AnnouncementsView';
import HarpyPanel from './HarpyPanel';
import KeeperPanel from './KeeperPanel';
import { getDivisionName } from '../../constants/divisionNames';
import { safetyTier } from '../domains/data/safetyTiers';

const Icon = ({ name, size = 18 }) => (
  <span className="material-symbols-outlined" style={{ fontSize: size }} aria-hidden="true">{name}</span>
);

// datetime-local wants local wall-clock time, the API sends UTC.
const toLocalInput = (d) => {
  if (!d) return '';
  const t = new Date(d);
  return new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const fmt = (d) => (d ? new Date(d).toLocaleString('en-GB', { timeZone: 'Europe/Athens', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

/* ── Public proclamations: what the whole court should know ── */
function HuntCard({ hunt, ctx, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [expiry, setExpiry] = useState(toLocalInput(hunt.expires_at));
  const open = hunt.status === 'proposed' || hunt.status === 'active';
  const canLift = open && (ctx.can.callBloodHunt || ctx.can.proposeBloodHunt);

  const act = async (path, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try { await api.post(`/court-actions/blood-hunts/${hunt.id}/${path}`); onChanged(); }
    catch (e) { alert(formatApiError(e, 'The court could not act on this.')); }
    finally { setBusy(false); }
  };

  const saveExpiry = async () => {
    setBusy(true);
    try { await api.patch(`/court-actions/blood-hunts/${hunt.id}`, { expires_at: expiry ? new Date(expiry).toISOString() : null }); onChanged(); }
    catch (e) { alert(formatApiError(e, 'Could not set the expiry.')); }
    finally { setBusy(false); }
  };

  const badge = hunt.status === 'active' ? styles.bActive : hunt.status === 'proposed' ? styles.bProposed : styles.bClosed;
  return (
    <div className={`${styles.item} ${hunt.status === 'active' ? styles.huntActive : ''}`}>
      <div className={styles.itemHead}>
        <span className={styles.itemName}>{hunt.target_name}</span>
        <span className={`${styles.badge} ${badge}`}>
          {hunt.status === 'proposed' ? 'Awaiting the Prince' : hunt.status}
        </span>
      </div>
      <p className={styles.itemBody}>{hunt.reason}</p>
      <div className={styles.itemMeta}>
        {hunt.status === 'proposed' ? 'Proposed' : 'Called'} by the {hunt.proposed_office || 'Court'}{hunt.proposed_by_name ? `, ${hunt.proposed_by_name}` : ''} on {fmt(hunt.created_at)}
        {hunt.ratified_at && hunt.proposed_office !== 'Prince' && ` · Ratified by ${hunt.ratified_by_name || 'the Prince'}`}
        {hunt.expires_at && ` · Ends ${fmt(hunt.expires_at)}`}
      </div>
      {open && (ctx.can.callBloodHunt || canLift) && (
        <div className={styles.row} style={{ marginTop: '0.7rem' }}>
          {hunt.status === 'proposed' && ctx.can.callBloodHunt && (
            <>
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} disabled={busy}
                onClick={() => act('ratify', `Ratify the Blood Hunt on ${hunt.target_name}? Every player will be told.`)}>
                <Icon name="gavel" size={16} /> Ratify
              </button>
              <button className={`${styles.btn} ${styles.btnSmall}`} disabled={busy} onClick={() => act('reject', 'Reject this proposal?')}>Reject</button>
            </>
          )}
          {canLift && (
            <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} disabled={busy}
              onClick={() => act('lift', hunt.status === 'active' ? `Lift the Blood Hunt on ${hunt.target_name}?` : 'Withdraw this proposal?')}>
              {hunt.status === 'active' ? 'Lift the hunt' : 'Withdraw'}
            </button>
          )}
          {ctx.can.callBloodHunt && (
            <span className={styles.row} style={{ gap: '0.3rem' }}>
              <input type="datetime-local" className={styles.input} style={{ width: 'auto', minHeight: 34 }} value={expiry}
                onChange={e => setExpiry(e.target.value)} aria-label="Hunt ends" />
              <button className={`${styles.btn} ${styles.btnSmall}`} disabled={busy} onClick={saveExpiry}>Set end</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ProclamationsPanel({ ctx, hunts, wanted, reload }) {
  const active = hunts.filter(h => h.status === 'active' || h.status === 'proposed');
  const past = hunts.filter(h => !(h.status === 'active' || h.status === 'proposed'));
  return (
    <div className={styles.grid2}>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}><Icon name="bloodtype" /> Blood Hunts</h2>
        <p className={styles.hint}>A Blood Hunt strips its target of the Prince's protection: any Kindred may take their blood. Players see active hunts on the Court Hierarchy.</p>
        <div className={styles.list}>
          {active.length ? active.map(h => <HuntCard key={h.id} hunt={h} ctx={ctx} onChanged={reload} />)
            : <div className={styles.empty}>No Blood Hunt is called. The city is at peace, for now.</div>}
        </div>
        {past.length > 0 && (
          <details style={{ marginTop: '1rem' }}>
            <summary className={styles.itemMeta} style={{ cursor: 'pointer' }}>History (last 90 nights)</summary>
            <div className={styles.list} style={{ marginTop: '0.6rem' }}>
              {past.map(h => <HuntCard key={h.id} hunt={h} ctx={ctx} onChanged={reload} />)}
            </div>
          </details>
        )}
      </section>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}><Icon name="person_search" /> Sought for Questioning</h2>
        <p className={styles.hint}>The Sheriff's board. Not a hunt: these names are wanted before the Court, unharmed.</p>
        <WantedList wanted={wanted} canClose={ctx.can.wanted} reload={reload} />
      </section>
    </div>
  );
}

function WantedList({ wanted, canClose, reload }) {
  const close = async (id) => {
    if (!window.confirm('Strike this name from the board?')) return;
    try { await api.post(`/court-actions/wanted/${id}/close`); reload(); }
    catch (e) { alert(formatApiError(e, 'Could not update the board.')); }
  };
  if (!wanted.length) return <div className={styles.empty}>The board is empty.</div>;
  return (
    <div className={styles.list}>
      {wanted.map(w => (
        <div key={w.id} className={styles.item}>
          <div className={styles.itemHead}>
            <span className={styles.itemName}>{w.target_name}</span>
            {canClose && <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => close(w.id)}>Found / Strike</button>}
          </div>
          <p className={styles.itemBody}>{w.reason}</p>
          <div className={styles.itemMeta}>Posted by the {w.posted_office || 'Court'}{w.posted_by_name ? `, ${w.posted_by_name}` : ''} on {fmt(w.created_at)}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Prince / Seneschal / Sheriff / Scourge: call or propose a hunt ── */
function BloodHuntPanel({ ctx, reload }) {
  const [roster, setRoster] = useState([]);
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [expires, setExpires] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/camarilla/roster').then(({ data }) => setRoster(data.roster || [])).catch(() => setErr('Could not load the roster.'));
  }, []);

  const groups = useMemo(() => {
    const living = roster.filter(r => !r.is_deceased).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return { player: living.filter(r => r.type === 'player'), npc: living.filter(r => r.type === 'npc') };
  }, [roster]);

  const submit = async (e) => {
    e.preventDefault();
    const [type, id] = target.split(':');
    const who = roster.find(r => r.type === type && String(r.id) === id);
    const verb = ctx.can.callBloodHunt ? 'Call a Blood Hunt on' : 'Propose to the Prince a Blood Hunt on';
    if (!who || !window.confirm(`${verb} ${who.name}?`)) return;
    setBusy(true); setErr('');
    try {
      await api.post('/court-actions/blood-hunts', {
        target_type: type, target_id: Number(id), reason,
        expires_at: expires ? new Date(expires).toISOString() : null,
      });
      setTarget(''); setReason(''); setExpires('');
      reload();
    } catch (e2) {
      setErr(formatApiError(e2, 'The hunt could not be declared.'));
    } finally { setBusy(false); }
  };

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}><Icon name="bloodtype" /> {ctx.can.callBloodHunt ? 'Call a Blood Hunt' : 'Propose a Blood Hunt'}</h2>
      <p className={styles.hint}>
        {ctx.can.callBloodHunt
          ? 'Your word is law: the hunt is live at once, the target is marked on the Hierarchy and every player is notified. Proposals from the Seneschal, Sheriff and Scourge wait for your ratification in Proclamations.'
          : 'The Blood Hunt is the Prince’s to call. Your proposal goes to the Prince, who is notified and may ratify or reject it.'}
      </p>
      {err && <div className={styles.error}>{err}</div>}
      <form onSubmit={submit}>
        <label className={styles.field}><span>The accused</span>
          <select className={styles.input} value={target} onChange={e => setTarget(e.target.value)} required>
            <option value="">Choose a Kindred</option>
            <optgroup label="Kindred of the city">
              {groups.player.map(r => <option key={`p${r.id}`} value={`player:${r.id}`} disabled={r.is_bloodhunted}>{r.name}{r.clan ? ` (${r.clan})` : ''}{r.is_bloodhunted ? ' [hunted]' : ''}</option>)}
            </optgroup>
            <optgroup label="Others">
              {groups.npc.map(r => <option key={`n${r.id}`} value={`npc:${r.id}`} disabled={r.is_bloodhunted}>{r.name}{r.clan ? ` (${r.clan})` : ''}{r.is_bloodhunted ? ' [hunted]' : ''}</option>)}
            </optgroup>
          </select>
        </label>
        <label className={styles.field}><span>The crime (read by every player)</span>
          <textarea className={styles.input} value={reason} onChange={e => setReason(e.target.value)} maxLength={4000} required
            placeholder="For the breach of the First Tradition at..." />
        </label>
        <label className={styles.field}><span>Ends on (optional; it also appears on the Storytellers' Calendar)</span>
          <input type="datetime-local" className={styles.input} value={expires} onChange={e => setExpires(e.target.value)} />
        </label>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy || !target || !reason.trim()}>
          <Icon name="gavel" /> {ctx.can.callBloodHunt ? 'Declare the Blood Hunt' : 'Send to the Prince'}
        </button>
      </form>
    </section>
  );
}

/* ── Security offices: where the city is most dangerous, and whose problem it is ── */
function DangerousDomainsPanel() {
  const [domains, setDomains] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/court-actions/dangerous-domains')
      .then(({ data }) => setDomains(data.domains || []))
      .catch(e => setErr(formatApiError(e, 'Could not read the reports.')));
  }, []);

  if (err) return <div className={styles.error}>{err}</div>;
  if (!domains) return <div className={styles.empty}>Gathering reports from the streets...</div>;

  // Anything below Secure is worth the court's attention; fall back to the top 10.
  const troubled = domains.filter(d => d.safety_rating < 8 || d.open_incidents > 0);
  const shown = showAll ? domains : (troubled.length ? troubled : domains.slice(0, 10));
  const worst = domains[0];

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}><Icon name="warning" /> The Most Dangerous Domains</h2>
      <p className={styles.hint}>
        Ranked by Masquerade safety, worst first; unresolved incidents break ties. Every incident drags a domain's rating down until it is dealt with.
        Divisions the Court has not yet assessed are left out.
      </p>
      {worst && (
        <div className={`${styles.item} ${worst.safety_rating < 5 ? styles.huntActive : ''}`} style={{ marginBottom: '1rem' }}>
          <div className={styles.itemMeta} style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>The worst of the city</div>
          <div className={styles.itemHead}>
            <span className={styles.itemName} style={{ fontSize: '1.5rem' }}>{getDivisionName(worst.division)}</span>
            <SafetyBadge rating={worst.safety_rating} />
          </div>
          <div className={styles.itemMeta}>{ownerLine(worst)}{worst.open_incidents ? ` · ${worst.open_incidents} open incident${worst.open_incidents > 1 ? 's' : ''}` : ''}</div>
        </div>
      )}
      <div className={styles.list}>
        {shown.map(d => (
          <details key={d.division} className={styles.item}>
            <summary style={{ cursor: d.incidents.length ? 'pointer' : 'default', listStyle: 'none' }}>
              <div className={styles.itemHead}>
                <span><span className={styles.rankNum}>{domains.indexOf(d) + 1}.</span> <b>{getDivisionName(d.division)}</b></span>
                <span className={styles.row} style={{ gap: '0.4rem' }}>
                  {d.open_incidents > 0 && <span className={`${styles.badge} ${styles.bProposed}`}><Icon name="report" size={12} />{d.open_incidents}</span>}
                  <SafetyBadge rating={d.safety_rating} />
                </span>
              </div>
              <div className={styles.itemMeta}>{ownerLine(d)}</div>
            </summary>
            {d.incidents.length > 0 && (
              <ul style={{ margin: '0.6rem 0 0', paddingLeft: '1.2rem', lineHeight: 1.5 }}>
                {d.incidents.map((inc, k) => <li key={k}>{inc.text} <span className={styles.itemMeta}>({fmt(inc.at)})</span></li>)}
              </ul>
            )}
          </details>
        ))}
        {!domains.length && <div className={styles.empty}>No division has been assessed yet.</div>}
      </div>
      {domains.length > shown.length && (
        <button className={styles.btn} style={{ marginTop: '0.75rem' }} onClick={() => setShowAll(true)}>Show all {domains.length} assessed domains</button>
      )}
    </section>
  );
}

function SafetyBadge({ rating }) {
  const tier = safetyTier(rating);
  return (
    <span className={styles.badge} style={{ color: tier.color, background: `${tier.color}1f` }}>
      {tier.label} · {rating}/10
    </span>
  );
}

function ownerLine(d) {
  if (d.is_abaton) return 'Abaton: under no Kindred’s hand';
  if (!d.is_claimed) return 'Unclaimed';
  return `Held by ${d.owner_name}${d.owner_clan ? ` (${d.owner_clan})` : ''}`;
}

function WantedPanel({ wanted, reload }) {
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api.post('/court-actions/wanted', { target_name: name, reason }); setName(''); setReason(''); reload(); }
    catch (e2) { alert(formatApiError(e2, 'Could not post the notice.')); }
    finally { setBusy(false); }
  };
  return (
    <div className={styles.grid2}>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}><Icon name="person_search" /> Post a Notice</h2>
        <p className={styles.hint}>Name someone the Sheriff wishes to question: Kindred, ghoul or kine. No flag is set and no one is harmed; the court simply knows to bring them in.</p>
        <form onSubmit={submit}>
          <label className={styles.field}><span>Name or description</span>
            <input className={styles.input} value={name} onChange={e => setName(e.target.value)} maxLength={255} required placeholder="The Nosferatu seen at Kerameikos" />
          </label>
          <label className={styles.field}><span>Why</span>
            <textarea className={styles.input} value={reason} onChange={e => setReason(e.target.value)} maxLength={4000} required />
          </label>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}><Icon name="push_pin" /> Pin to the board</button>
        </form>
      </section>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}><Icon name="list_alt" /> The Board</h2>
        <WantedList wanted={wanted} canClose reload={reload} />
      </section>
    </div>
  );
}

/* ── Page ── */
export default function CourtActions() {
  const [ctx, setCtx] = useState(null);
  const [hunts, setHunts] = useState([]);
  const [wanted, setWanted] = useState([]);
  const [tab, setTab] = useState(null);
  const [err, setErr] = useState('');

  const reload = useCallback(() => {
    api.get('/court-actions/blood-hunts').then(({ data }) => setHunts(data.hunts || [])).catch(() => {});
    api.get('/court-actions/wanted').then(({ data }) => setWanted(data.wanted || [])).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/court-actions/me').then(({ data }) => setCtx(data)).catch(e => setErr(formatApiError(e, 'Could not reach the court.')));
    reload();
  }, [reload]);

  const tabs = useMemo(() => {
    if (!ctx) return [];
    const t = [];
    const { can } = ctx;
    if (can.keeper) t.push({ id: 'keeper', icon: 'local_florist', label: 'Elysium Invitation' });
    if (can.harpy) t.push({ id: 'harpy', icon: 'handshake', label: 'Prestation' });
    if (can.callBloodHunt || can.proposeBloodHunt) t.push({ id: 'hunt', icon: 'bloodtype', label: 'Blood Hunt' });
    if (can.wanted) t.push({ id: 'wanted', icon: 'person_search', label: 'Wanted Board' });
    if (can.security) t.push({ id: 'security', icon: 'warning', label: 'Dangerous Domains' });
    const pending = hunts.filter(h => h.status === 'proposed').length;
    t.push({ id: 'proclamations', icon: 'campaign', label: pending && can.callBloodHunt ? `Proclamations (${pending})` : 'Proclamations' });
    t.push({ id: 'announcements', icon: 'history_edu', label: 'Announcements' });
    return t;
  }, [ctx, hunts]);

  const current = tab && tabs.some(t => t.id === tab) ? tab : tabs[0]?.id;

  if (err) return <div className={styles.page}><div className={styles.error}>{err}</div></div>;
  if (!ctx) return <div className={styles.page}><div className={styles.empty}>Approaching the court...</div></div>;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.heroEyebrow}>Athens · The Court</p>
        <h1 className={styles.heroTitle}>Court Actions</h1>
        <div className={styles.offices}>
          {ctx.offices.length
            ? ctx.offices.map(o => <span key={o} className={styles.officeChip}><Icon name="workspace_premium" size={14} />{o}</span>)
            : <span className={styles.itemMeta}>{ctx.isAdmin ? 'Storyteller: every office is open to you.' : 'You hold no office of the court. Your character’s title is set on the Court Hierarchy.'}</span>}
        </div>
      </header>

      <nav className={styles.tabs} role="tablist" aria-label="Court Actions">
        {tabs.map(t => (
          <button key={t.id} role="tab" aria-selected={current === t.id}
            className={`${styles.tab} ${current === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} /> {t.label}
          </button>
        ))}
        <Link to="/rumors" className={styles.tab}><Icon name="forum" /> Rumors</Link>
      </nav>

      {current === 'keeper' && <KeeperPanel />}
      {current === 'harpy' && <HarpyPanel />}
      {current === 'hunt' && (
        <div className={styles.grid2}>
          <BloodHuntPanel ctx={ctx} reload={reload} />
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}><Icon name="campaign" /> Open Hunts</h2>
            <div className={styles.list}>
              {hunts.filter(h => h.status === 'active' || h.status === 'proposed').map(h => <HuntCard key={h.id} hunt={h} ctx={ctx} onChanged={reload} />)}
              {!hunts.some(h => h.status === 'active' || h.status === 'proposed') && <div className={styles.empty}>None.</div>}
            </div>
          </section>
        </div>
      )}
      {current === 'wanted' && <WantedPanel wanted={wanted} reload={reload} />}
      {current === 'security' && <DangerousDomainsPanel />}
      {current === 'proclamations' && <ProclamationsPanel ctx={ctx} hunts={hunts} wanted={wanted} reload={reload} />}
      {current === 'announcements' && <AnnouncementsView canEdit canPush={ctx.can.decree} />}
    </div>
  );
}
