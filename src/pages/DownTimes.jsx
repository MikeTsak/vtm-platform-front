// src/pages/DownTimes.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import styles from '../styles/DownTimes.module.css'; // Using the correct module

// --- Helper: Generate unique temporary ID ---
let tempIdCounter = 0;
const generateTempId = () => {
  // Combine timestamp with counter and random component for uniqueness
  return `temp_${Date.now()}_${++tempIdCounter}_${Math.random().toString(36).slice(2, 11)}`;
};

// --- Helper: Countdown Hook ---
function useCountdown(targetDate) {
  const [now, setNow] = useState(new Date().getTime());

  useEffect(() => {
    // Update the current time every second
    const interval = setInterval(() => {
      setNow(new Date().getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []); // Empty dependency array means this effect runs once on mount

  return useMemo(() => {
    if (!targetDate) {
      // If no date is set, treat it as "past"
      return { isPast: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalHours: 0 };
    }
    
    // Parse the target date. Assumes YYYY-MM-DD from server.
    const targetTime = new Date(targetDate).getTime();
    const difference = targetTime - now;

    if (difference <= 0) {
      return { isPast: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalHours: 0 };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    const totalHours = difference / (1000 * 60 * 60);

    return { isPast: false, days, hours, minutes, seconds, totalHours };
  }, [now, targetDate]); // Recalculate only when `now` or `targetDate` changes
}

// --- Helper: Countdown Display Component ---
function CountdownDisplay({ title, countdown, pastText, futureText }) {
  const { isPast, days, hours, minutes, seconds, totalHours } = countdown;

  // Add 'soon' class if not past and < 24 hours remaining
  let wrapperClass = styles.countdownBox;
  if (!isPast && totalHours > 0 && totalHours < 24) {
    wrapperClass += ` ${styles.countdownSoon}`;
  }

  return (
    <div className={wrapperClass}>
      <h4 className={styles.countdownTitle}>{title}</h4>
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
      {/* Show the actual date underneath for clarity */}
      <div className={styles.countdownDate}>{futureText}</div>
    </div>
  );
}


// --- Helper: treat "resolved" as past (Unchanged) ---
const statusIsPast = (s) => {
  const status = String(s || '').toLowerCase();
  return status === 'resolved' || status === 'rejected' || status === 'resolved in scene';
};

// --- Format for display (Unchanged) ---
function niceDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  try {
    return dt.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dt.toDateString();
  }
}

// --- Submit Card Component (Unchanged) ---
function SubmitCard({ quota, onDowntimeCreated, deadline }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [feeding, setFeeding] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const isFull = quota.used >= quota.limit;
  const isPastDeadline = deadline && (new Date(deadline).getTime() < new Date().getTime());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFull || loading || !title || !body) return;
    if (isPastDeadline) {
      setErr('The deadline for downtime submission has passed.');
      return;
    }
    
    setLoading(true);
    setErr('');
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        feeding_type: feeding.trim() || null,
      };
      const { data } = await api.post('/downtimes', payload);
      // Ensure we have downtime data from API response
      if (data && data.downtime) {
        onDowntimeCreated(data.downtime);
      } else {
        // Fallback: construct downtime object if API doesn't return it properly
        const newDowntime = {
          id: generateTempId(),
          title: payload.title,
          body: payload.body,
          feeding_type: payload.feeding_type,
          status: 'submitted',
          created_at: new Date().toISOString()
        };
        onDowntimeCreated(newDowntime);
      }
      setTitle('');
      setBody('');
      setFeeding('');
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
          <label className={styles.label}>Title</label>
          <input
            className={styles.input}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Investigate Elysium rumors"
            maxLength={100}
            required
            disabled={isFull || loading || isPastDeadline}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Action</label>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe your downtime action..."
            maxLength={1500}
            required
            disabled={isFull || loading || isPastDeadline}
          />
          <span className={styles.counter}>{body.length} / 1500</span>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>
            Feeding Type <span className={styles.muted}>(Optional, leave blank for default)</span>
          </label>
          <input
            className={styles.input}
            type="text"
            value={feeding}
            onChange={(e) => setFeeding(e.target.value)}
            placeholder="e.g., Farmer, Alleycat, Scene Queen..."
            maxLength={100}
            disabled={isFull || loading || isPastDeadline}
          />
        </div>

        {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

        <div className={styles.formRow}>
          <button
            type="submit"
            className={styles.cta}
            disabled={isFull || loading || !title || !body || isPastDeadline}
          >
            {loading ? 'Submitting...' : 'Submit Downtime'}
          </button>
          <div className={styles.formHint}>
            Quota: <b>{quota.used} / {quota.limit}</b> used this month.
            {isFull && <span style={{ color: 'var(--err)', marginLeft: '8px' }}>Quota full.</span>}
            {isPastDeadline && !isFull && <span style={{ color: 'var(--err)', marginLeft: '8px' }}>Deadline has passed.</span>}
          </div>
        </div>
      </form>
    </section>
  );
}

// --- List Item Component (FIXED to show GM Resolution) ---
function DowntimeItem({ dt }) {
  const status = (dt.status || 'submitted').toLowerCase();
  let badgeClass = styles.badgePending;
  if (status === 'approved') badgeClass = styles.badgeApproved;
  if (status === 'needs a scene') badgeClass = styles.badgeNeedsScene;
  if (status === 'rejected') badgeClass = styles.badgeRejected;
  if (status === 'resolved' || status === 'resolved in scene') badgeClass = styles.badgeReview;

  return (
    <article className={styles.item}>
      <header className={styles.itemHead}>
        <h3 className={styles.itemTitle}>{dt.title || '(no title)'}</h3>
        <span className={`${styles.badge} ${badgeClass}`}>{dt.status}</span>
      </header>
      <div className={styles.itemMeta}>
        Submitted: {niceDate(dt.created_at)}
        {dt.resolved_at && ` • Resolved: ${niceDate(dt.resolved_at)}`}
      </div>
      
      {dt.feeding_type && (
        <div className={styles.itemMeta} style={{marginTop: '4px'}}>
          Feeding: <b>{dt.feeding_type}</b>
        </div>
      )}

      <p className={styles.itemBody}>{dt.body || '(No action description)'}</p>
      
      {/* {dt.gm_notes && (
        <div className={styles.itemNotes}>
          <div className={styles.itemNotesLabel}>Result</div>
          <p className={styles.itemNotesBody}>{dt.gm_notes}</p>
        </div>
      )} */}

      {dt.gm_resolution && (
        <div className={styles.itemNotes}>
          <div className={styles.itemNotesLabel}>Resolution</div>
          <p className={styles.itemNotesBody}>{dt.gm_resolution}</p>
        </div>
      )}
    </article>
  );
}

// --- Main Component (MODIFIED) ---
export default function DownTimes() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Global schedule
  const [deadline, setDeadline] = useState('');
  const [opening, setOpening] = useState('');

  // My downtimes
  const [mine, setMine] = useState([]);
  const [quota, setQuota] = useState({ used: 0, limit: 3 });

  // UI state
  const [filter, setFilter] = useState('active');
  const [q, setQ] = useState('');

  // --- NEW: Countdown state ---
  const deadlineCountdown = useCountdown(deadline);
  const openingCountdown = useCountdown(opening);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const [cfgP, mineP, quotaP] = await Promise.allSettled([
          api.get('/downtimes/config'),
          api.get('/downtimes/mine'),
          api.get('/downtimes/quota'),
        ]);

        if (!mounted) return;

        if (cfgP.status === 'fulfilled') {
          const { downtime_deadline, downtime_opening } = cfgP.value.data || {};
          setDeadline(downtime_deadline || '');
          setOpening(downtime_opening || '');
        } else {
          console.warn('Failed to load downtime config:', cfgP.reason);
        }

        if (mineP.status === 'fulfilled') {
          const dts = (mineP.value.data?.downtimes || [])
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setMine(dts);
        } else {
          setErr('Failed to load your downtimes.');
        }

        if (quotaP.status === 'fulfilled') {
          setQuota(quotaP.value.data || { used: 0, limit: 3 });
        } else {
           console.warn('Failed to load downtime quota:', quotaP.reason);
        }

      } catch (e) {
        console.error(e);
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

  // Memoized lists
  const active = useMemo(() => mine.filter(d => !statusIsPast(d.status)), [mine]);
  const past   = useMemo(() => mine.filter(d => statusIsPast(d.status)), [mine]);
  
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
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Downtimes</h2>
          <p className={styles.subtitle}>Submit and review your monthly actions.</p>
        </div>
        <div className={styles.headerActions}>
           {/* ... */}
        </div>
      </header>

      {/* --- MODIFIED: Schedule banner with countdowns --- */}
      <section className={styles.card}>
        <div className={styles.countdownWrap}>
          <CountdownDisplay
            title="Submission Deadline"
            countdown={deadlineCountdown}
            pastText="The Deadline has passed."
            futureText={niceDate(deadline) || 'TBD'}
          />
          <CountdownDisplay
            title="Next Modern Event"
            countdown={openingCountdown}
            pastText="Submissions are Open." // If opening date is past, they're open
            futureText={niceDate(opening) || 'TBD'}
          />
        </div>
      </section>

      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

      {/* Submit Card */}
      <SubmitCard 
        quota={quota} 
        onDowntimeCreated={handleDowntimeCreated} 
        deadline={deadline}
      />

      {/* Controls: Filter + Search */}
      <section className={styles.controls}>
        <div className={styles.filters}>
          <label className={styles.filterLabel}>Filter by Status</label>
          <div className={styles.chips}>
            <button 
              className={`${styles.chip} ${filter === 'active' ? styles.chipActive : ''}`}
              onClick={() => setFilter('active')}
            >
              Active <span className={styles.chipCount}>{activeCount}</span>
            </button>
            <button 
              className={`${styles.chip} ${filter === 'past' ? styles.chipActive : ''}`}
              onClick={() => setFilter('past')}
            >
              Past <span className={styles.chipCount}>{pastCount}</span>
            </button>
          </div>
        </div>
        <div className={styles.searchWrap}>
          <label className={styles.filterLabel}>Search {filter} downtimes</label>
          <input
            className={styles.search}
            type="text"
            placeholder="Search by title, body, or result..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </section>

      {/* List */}
      <section className={styles.list}>
        {loading && (
          <div className={`${styles.item} ${styles.skeleton}`}></div>
        )}
        {!loading && list.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>☾</div>
            <div className={styles.emptyText}>
              {q ? `No ${filter} downtimes match your search.` : `You have no ${filter} downtimes.`}
            </div>
          </div>
        )}
        {!loading && list.map(dt => (
          <DowntimeItem key={dt.id} dt={dt} />
        ))}
      </section>
    </main>
  );
}
