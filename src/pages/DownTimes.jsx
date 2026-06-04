// src/pages/DownTimes.jsx
import React, { useEffect, useMemo, useState, useContext } from 'react';
import { AuthCtx } from '../AuthContext'; 
import api from '../api';
import styles from '../styles/DownTimes.module.css';
import Loading from '../components/Loading';

let tempIdCounter = 0;
const generateTempId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `temp_${crypto.randomUUID()}`;
  }
  return `temp_${Date.now()}_${++tempIdCounter}_${Math.random().toString(36).slice(2, 11)}`;
};

function useCountdown(targetDate, isEndOfDay = false) {
  const [now, setNow] = useState(new Date().getTime());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (!targetDate) return { isPast: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalHours: 0 };
    
    const targetTime = new Date(targetDate);
    if (isEndOfDay) targetTime.setHours(23, 59, 59, 999);

    const difference = targetTime.getTime() - now;
    if (difference <= 0) return { isPast: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalHours: 0 };

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    const totalHours = difference / (1000 * 60 * 60);

    return { isPast: false, days, hours, minutes, seconds, totalHours };
  }, [now, targetDate, isEndOfDay]);
}

function CountdownDisplay({ title, countdown, pastText, futureText, isProject }) {
  const { isPast, days, hours, minutes, seconds, totalHours } = countdown;

  let wrapperClass = styles.countdownBox;
  if (!isPast && totalHours > 0 && totalHours < 24) wrapperClass += ` ${styles.countdownSoon}`;
  if (isProject) wrapperClass += ` ${styles.projectCountdown}`;

  return (
    <div className={wrapperClass}>
      <h4 className={`${styles.countdownTitle} ${isProject ? styles.projectTitleText : ''}`}>{title}</h4>
      {isPast ? (
        <div className={styles.countdownPast}>{pastText}</div>
      ) : (
        <div className={styles.countdownTimer}>
          <div className={styles.countdownSegment}>
            <span className={styles.countdownValue}>{days}</span>
            <span className={styles.countdownLabel}>Days</span>
          </div>
          <div className={styles.countdownSegment}>
            <span className={styles.countdownValue}>{String(hours).padStart(2, '0')}</span>
            <span className={styles.countdownLabel}>Hours</span>
          </div>
          <div className={styles.countdownSegment}>
            <span className={styles.countdownValue}>{String(minutes).padStart(2, '0')}</span>
            <span className={styles.countdownLabel}>Mins</span>
          </div>
          <div className={styles.countdownSegment}>
            <span className={styles.countdownValue}>{String(seconds).padStart(2, '0')}</span>
            <span className={styles.countdownLabel}>Secs</span>
          </div>
        </div>
      )}
      <div className={styles.countdownDate}>{futureText}</div>
    </div>
  );
}

const statusIsPast = (s) => {
  const status = String(s || '').toLowerCase();
  return status === 'resolved' || status === 'rejected' || status === 'resolved in scene';
};

function niceDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  try { return dt.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }); } 
  catch { return dt.toDateString(); }
}

// --- Standard Submit Card ---
function SubmitCard({ quota, onDowntimeCreated, deadline }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [feeding, setFeeding] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const isFull = quota.used >= quota.limit;
  
  let isPastDeadline = false;
  if (deadline) {
    const dlDate = new Date(deadline);
    dlDate.setHours(23, 59, 59, 999); 
    isPastDeadline = dlDate.getTime() < new Date().getTime();
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFull || loading || !title || !body) return;
    if (isPastDeadline) { setErr('The deadline for downtime submission has passed.'); return; }
    
    setLoading(true); setErr('');
    try {
      const payload = { title: title.trim(), body: body.trim(), feeding_type: feeding.trim() || null };
      const { data } = await api.post('/downtimes', payload);
      onDowntimeCreated(data?.downtime || { id: generateTempId(), ...payload, status: 'submitted', created_at: new Date().toISOString() });
      setTitle(''); setBody(''); setFeeding('');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to submit downtime.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.card}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Action Title</label>
          <input className={styles.input} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Investigate Elysium rumors" maxLength={100} required disabled={isFull || loading || isPastDeadline} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Action Description</label>
          <textarea className={`${styles.input} ${styles.textarea}`} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe your downtime action..." maxLength={1500} required disabled={isFull || loading || isPastDeadline} />
          <span className={styles.counter}>{body.length} / 1500</span>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Feeding Type <span className={styles.muted}>(Optional, leave blank for default)</span></label>
          <input className={styles.input} type="text" value={feeding} onChange={(e) => setFeeding(e.target.value)} placeholder="e.g., Farmer, Alleycat..." maxLength={100} disabled={isFull || loading || isPastDeadline} />
        </div>
        {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}
        <div className={styles.formRow}>
          <button type="submit" className={styles.cta} disabled={isFull || loading || !title || !body || isPastDeadline}>
            {loading ? 'Submitting...' : 'Submit Downtime'}
          </button>
          <div className={styles.formHint}>
            Quota: <b>{quota.used} / {quota.limit}</b> used this cycle.
            {isFull && <span className={styles.errorText} style={{ marginLeft: '8px' }}>Quota full.</span>}
            {isPastDeadline && !isFull && <span className={styles.errorText} style={{ marginLeft: '8px' }}>Deadline has passed.</span>}
          </div>
        </div>
      </form>
    </section>
  );
}

// --- Project Submit Card ---
function ProjectSubmitCard({ quota, onDowntimeCreated, deadline }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const isFull = quota.used >= quota.limit;
  
  let isPastDeadline = false;
  if (deadline) {
    const dlDate = new Date(deadline);
    dlDate.setHours(23, 59, 59, 999); 
    isPastDeadline = dlDate.getTime() < new Date().getTime();
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFull || loading || !title || !body) return;
    if (isPastDeadline) { setErr('The deadline for project submission has passed.'); return; }
    
    setLoading(true); setErr('');
    try {
      const finalTitle = `[PROJECT] ${title.trim()}`;
      const payload = { title: finalTitle, body: body.trim(), feeding_type: null };
      
      const { data } = await api.post('/downtimes', payload);
      onDowntimeCreated(data?.downtime || { id: generateTempId(), ...payload, status: 'submitted', created_at: new Date().toISOString() });
      setTitle(''); setBody('');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to submit project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`${styles.card} ${styles.projectSubmitCard}`}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.projectSubmitInfo}>
          <span>ℹ️</span> <span>Long-term projects span multiple months. Submitting an action step here consumes one of your monthly action slots.</span>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Project Name / Phase</label>
          <input className={`${styles.input} ${styles.projectInput}`} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Secure Haven Defenses (Phase 1)" maxLength={100} required disabled={isFull || loading || isPastDeadline} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Detailed Execution Plan</label>
          <textarea className={`${styles.input} ${styles.textarea} ${styles.projectInput}`} style={{ minHeight: '200px' }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe exactly what you are doing, resources used, and who is involved..." maxLength={3000} required disabled={isFull || loading || isPastDeadline} />
          <span className={styles.counter}>{body.length} / 3000</span>
        </div>
        
        {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}
        
        <div className={styles.formRow}>
          <button type="submit" className={`${styles.cta} ${styles.projectSubmitBtn}`} disabled={isFull || loading || !title || !body || isPastDeadline}>
            {loading ? 'Submitting...' : 'Submit Project Action'}
          </button>
          <div className={styles.formHint}>
            Quota: <b>{quota.used} / {quota.limit}</b> used this cycle.
            {isFull && <span className={styles.errorText} style={{ marginLeft: '8px' }}>Quota full.</span>}
            {isPastDeadline && !isFull && <span className={styles.errorText} style={{ marginLeft: '8px' }}>Deadline has passed.</span>}
          </div>
        </div>
      </form>
    </section>
  );
}

// --- List Item Component ---
function DowntimeItem({ dt, isProject }) {
  const status = (dt.status || 'submitted').toLowerCase();
  let badgeClass = styles.badgePending;
  if (status === 'approved') badgeClass = styles.badgeApproved;
  if (status === 'needs a scene') badgeClass = styles.badgeNeedsScene;
  if (status === 'rejected') badgeClass = styles.badgeRejected;
  if (status === 'resolved' || status === 'resolved in scene') badgeClass = styles.badgeReview;

  const displayTitle = isProject ? dt.title.replace('[PROJECT] ', '') : dt.title;

  return (
    <article className={`${styles.item} ${isProject ? styles.projectItem : ''}`}>
      <header className={`${styles.itemHead} ${isProject ? styles.projectItemHeader : ''}`}>
        <h3 className={styles.itemTitle}>{displayTitle || '(no title)'} {isProject && <span className={styles.projectTag}>PROJECT</span>}</h3>
        <span className={`${styles.badge} ${badgeClass}`}>{dt.status}</span>
      </header>
      <div className={styles.itemMeta}>
        Submitted: {niceDate(dt.created_at)}
        {dt.resolved_at && ` • Resolved: ${niceDate(dt.resolved_at)}`}
      </div>
      
      {!isProject && dt.feeding_type && (
        <div className={styles.itemMeta} style={{marginTop: '4px'}}>
          Feeding: <b>{dt.feeding_type}</b>
        </div>
      )}

      <p className={styles.itemBody} style={{ whiteSpace: 'pre-wrap' }}>{dt.body || '(No action description)'}</p>

      {dt.gm_resolution && (
        <div className={styles.itemNotes}>
          <div className={styles.itemNotesLabel}>Resolution</div>
          <p className={styles.itemNotesBody} style={{ whiteSpace: 'pre-wrap' }}>{dt.gm_resolution}</p>
        </div>
      )}
    </article>
  );
}

// --- Main Component ---
export default function DownTimes() {
  const { user: currentUser } = useContext(AuthCtx); 
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Mode Switcher
  const [viewMode, setViewMode] = useState('standard'); // 'standard' | 'project'

  // Global schedule
  const [deadline, setDeadline] = useState('');
  const [opening, setOpening] = useState('');
  const [projectDeadline, setProjectDeadline] = useState('');

  // My downtimes
  const [mine, setMine] = useState([]);
  const [quota, setQuota] = useState({ used: 0, limit: 3 });
  const [myChar, setMyChar] = useState(null);

  // UI state
  const [filter, setFilter] = useState('active');
  const [q, setQ] = useState('');

  // Countdowns
  const deadlineCountdown = useCountdown(deadline, true); 
  const openingCountdown = useCountdown(opening, false);
  const projectCountdown = useCountdown(projectDeadline, true);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const [cfgP, mineP, quotaP, charP] = await Promise.allSettled([
          api.get('/downtimes/config'),
          api.get('/downtimes/mine'),
          api.get('/downtimes/quota'),
          api.get('/characters/me') 
        ]);

        if (!mounted) return;

        if (cfgP.status === 'fulfilled') {
          const { downtime_deadline, downtime_opening, project_deadline, downtime_active_phase } = cfgP.value.data || {};
          setDeadline(downtime_deadline || '');
          setOpening(downtime_opening || '');
          setProjectDeadline(project_deadline || '');

          // --- MASTER SWITCH: Default Tab ---
          if (downtime_active_phase === 'project') {
             setViewMode('project');
          } else {
             setViewMode('standard');
          }
        }

        if (mineP.status === 'fulfilled') {
          const dts = (mineP.value.data?.downtimes || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setMine(dts);
        } else setErr('Failed to load your actions.');

        if (quotaP.status === 'fulfilled') setQuota(quotaP.value.data || { used: 0, limit: 3 });
        if (charP.status === 'fulfilled') setMyChar(charP.value.data?.character || null);

      } catch (e) {
        setErr('Failed to load your downtimes.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  
  const handleDowntimeCreated = (newDowntime) => {
    setMine(prev => [newDowntime, ...prev]);
    setQuota(prev => ({ ...prev, used: prev.used + 1 }));
  };
  
  const isCharActive = currentUser?.role === 'admin' || (myChar && myChar.sheet && myChar.sheet.is_active === true);

  // Split and Memoize lists
  const isProj = (dt) => dt.title && dt.title.startsWith('[PROJECT]');
  
  const currentCategoryMine = useMemo(() => {
    return viewMode === 'project' ? mine.filter(isProj) : mine.filter(dt => !isProj(dt));
  }, [mine, viewMode]);

  const active = useMemo(() => currentCategoryMine.filter(d => !statusIsPast(d.status)), [currentCategoryMine]);
  const past   = useMemo(() => currentCategoryMine.filter(d => statusIsPast(d.status)), [currentCategoryMine]);
  
  const list = useMemo(() => {
    const source = (filter === 'past') ? past : active;
    const qq = q.trim().toLowerCase();
    if (!qq) return source;
    return source.filter(dt => 
      (dt.title || '').toLowerCase().includes(qq) ||
      (dt.body || '').toLowerCase().includes(qq) ||
      (dt.gm_notes || '').toLowerCase().includes(qq) ||
      (dt.gm_resolution || '').toLowerCase().includes(qq)
    );
  }, [active, past, filter, q]);

  const activeCount = active.length;
  const pastCount = past.length;

  return (
    <main className={styles.page}>
      
      {/* MODE SWITCHER */}
      <div className={styles.modeSwitcher}>
        <button 
          className={`${styles.modeBtn} ${viewMode === 'standard' ? styles.modeBtnStandardActive : ''}`}
          onClick={() => { setViewMode('standard'); setFilter('active'); setQ(''); }}
        >
          🦇 Monthly Actions
        </button>
        <button 
          className={`${styles.modeBtn} ${viewMode === 'project' ? styles.modeBtnProjectActive : ''}`}
          onClick={() => { setViewMode('project'); setFilter('active'); setQ(''); }}
        >
          📜 Long-Term Projects
        </button>
      </div>

      <header className={styles.header}>
        <div>
          <h2 className={`${styles.title} ${viewMode === 'project' ? styles.projectTitleText : ''}`}>
            {viewMode === 'standard' ? 'Downtimes' : 'Project Actions'}
          </h2>
          <p className={styles.subtitle}>
            {viewMode === 'standard' 
              ? 'Submit and review your monthly actions.' 
              : 'Orchestrate elaborate plans over the course of multiple months.'}
          </p>
        </div>
      </header>

      <section className={styles.card} style={{ background: 'transparent', padding: 0, boxShadow: 'none' }}>
        <div className={styles.countdownWrap}>
          {viewMode === 'standard' ? (
            <>
              <CountdownDisplay title="Submission Deadline" countdown={deadlineCountdown} pastText="The Deadline has passed." futureText={niceDate(deadline) || 'TBD'} />
              <CountdownDisplay title="Next Modern Event" countdown={openingCountdown} pastText="Submissions are Open." futureText={niceDate(opening) || 'TBD'} />
            </>
          ) : (
             <CountdownDisplay title="Next Project Phase Deadline" countdown={projectCountdown} pastText="The Phase Deadline has passed." futureText={niceDate(projectDeadline) || 'TBD'} isProject={true} />
          )}
        </div>
      </section>

      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

      {!isCharActive ? (
        <div className={`${styles.alert} ${styles.alertError}`} style={{ textAlign: 'center', fontWeight: 'bold' }}>
          Your character is waiting for ST approval. You cannot submit actions yet.
        </div>
      ) : (
        viewMode === 'standard' 
          ? <SubmitCard quota={quota} onDowntimeCreated={handleDowntimeCreated} deadline={deadline} />
          : <ProjectSubmitCard quota={quota} onDowntimeCreated={handleDowntimeCreated} deadline={projectDeadline} />
      )}

      {/* Controls: Filter + Search */}
      <section className={styles.controls}>
        <div className={styles.filters}>
          <label className={styles.filterLabel}>Filter by Status</label>
          <div className={styles.chips}>
            <button className={`${styles.chip} ${filter === 'active' ? styles.chipActive : ''}`} onClick={() => setFilter('active')}>
              Active <span className={`${styles.chipCount} ${viewMode === 'project' && filter === 'active' ? styles.chipCountProject : ''}`}>{activeCount}</span>
            </button>
            <button className={`${styles.chip} ${filter === 'past' ? styles.chipActive : ''}`} onClick={() => setFilter('past')}>
              Past <span className={`${styles.chipCount} ${viewMode === 'project' && filter === 'past' ? styles.chipCountProject : ''}`}>{pastCount}</span>
            </button>
          </div>
        </div>
        <div className={styles.searchWrap}>
          <label className={styles.filterLabel}>Search {filter} {viewMode === 'standard' ? 'downtimes' : 'projects'}</label>
          <input className={styles.search} type="text" placeholder="Search by title, body, or result..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </section>

      {/* List */}
      <section className={styles.list}>
        {loading && <Loading />}
        {!loading && list.length === 0 && (
          <div className={styles.empty}>
            <div className={`${styles.emptyIcon} ${viewMode === 'project' ? styles.emptyIconProject : ''}`}>{viewMode === 'standard' ? '☾' : '📜'}</div>
            <div className={styles.emptyText}>
              {q ? `No ${filter} submissions match your search.` : `You have no ${filter} ${viewMode === 'standard' ? 'downtimes' : 'projects'}.`}
            </div>
          </div>
        )}
        {!loading && list.map(dt => (
          <DowntimeItem key={dt.id} dt={dt} isProject={viewMode === 'project'} />
        ))}
      </section>
    </main>
  );
}