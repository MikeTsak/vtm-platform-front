// src/pages/DownTimes.jsx
import React, { useEffect, useMemo, useState, useContext } from 'react';
import { AuthCtx } from '../core/AuthContext';
import api from '../core/api';
import styles from '../styles/DownTimes.module.css';
import { Skeleton } from 'boneyard-js/react';
import MiniSearch from 'minisearch';
import { trackEvent } from '../utils/analytics';

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

const CountdownDisplay = ({ title, countdown, subText, isProject, icon }) => {
  const formatCountdown = (cd) => {
    if (cd.isPast) return '00d 00h 00m 00s';
    const d = String(cd.days).padStart(2, '0');
    const h = String(cd.hours).padStart(2, '0');
    const m = String(cd.minutes).padStart(2, '0');
    const s = String(cd.seconds).padStart(2, '0');
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  let displayTime = formatCountdown(countdown);

  return (
    <div className={`${styles.deadlineCard} ${isProject ? styles.deadlineCardProject : ''}`}>
      <span className={`material-symbols-outlined ${styles.deadlineCardIcon}`}>{icon}</span>
      <div className={styles.deadlineInfo}>
        <span className={`${styles.deadlineLabel} ${isProject ? styles.deadlineLabelProject : ''}`}>
          {title}
        </span>
        <h2 className={styles.deadlineTitle}>
          {countdown.isPast ? 'Passed' : niceDate(countdown.targetDate) || 'TBD'}
        </h2>
        <span className={styles.deadlineSub}>{subText}</span>
      </div>
      <div className={`${styles.deadlineCircle} ${isProject ? styles.deadlineCircleProject : ''}`}>
        <span className={styles.deadlineCircleText}>{displayTime}</span>
      </div>
    </div>
  );
}

function SubmitCard({ quota, onDowntimeCreated, isProject }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [feeding, setFeeding] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const isFull = quota.used >= quota.limit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFull || loading || !title || !body) return;

    setLoading(true); setErr('');
    try {
      const finalTitle = isProject ? `[PROJECT] ${title.trim()}` : title.trim();
      const payload = { title: finalTitle, body: body.trim(), feeding_type: isProject ? null : (feeding.trim() || null) };

      const { data } = await api.post('/downtimes', payload);
      onDowntimeCreated(data?.downtime || { id: generateTempId(), ...payload, status: 'submitted', created_at: new Date().toISOString() });
      
      trackEvent('submit_downtime', { type: isProject ? 'project' : 'action' });
      
      setTitle(''); setBody(''); setFeeding('');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to submit action.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formCard}>
      <div className={styles.formHeader}>
        <span className={`material-symbols-outlined ${isProject ? styles.formHeaderIconProject : styles.formHeaderIcon}`}>
          edit_square
        </span>
        <h3 className={styles.formTitle}>Draft Action</h3>
      </div>
      <div className={styles.formBody}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>{isProject ? 'Project Name / Phase' : 'Action Title'}</label>
              <input
                className={styles.input}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isProject ? "e.g., Secure Haven Defenses (Phase 1)" : "e.g., Secure Haven Defenses"}
                maxLength={100}
                required
                disabled={isFull || loading}
              />
            </div>
            {!isProject && (
              <div className={styles.field}>
                <label className={styles.label}>Feeding Type / Cover</label>
                <input
                  className={styles.input}
                  type="text"
                  value={feeding}
                  onChange={(e) => setFeeding(e.target.value)}
                  placeholder="e.g., Herd Management"
                  maxLength={100}
                  disabled={isFull || loading}
                />
              </div>
            )}
          </div>

          <div className={styles.field} style={{ marginTop: '24px' }}>
            <label className={styles.label}>Detailed Description & Intent</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={isProject ? "Describe exactly what you are doing, resources used, and who is involved..." : "Detail your character's actions, resources expended, and desired outcome..."}
              maxLength={isProject ? 3000 : 1500}
              required
              disabled={isFull || loading}
            />
            <span className={styles.counter}>{body.length} / {isProject ? 3000 : 1500}</span>
          </div>

          {err && <div className={styles.alert} style={{ marginTop: '24px' }}>{err}</div>}

          <div className={styles.formFooter}>
            <div className={styles.quotaBox}>
              <span className={`material-symbols-outlined ${styles.quotaIcon}`}>data_usage</span>
              <div className={styles.quotaText}>
                <span className={styles.quotaLabel}>Action Quota</span>
                <span className={styles.quotaValue}>{quota.used} <span className={styles.quotaMuted}>/ {quota.limit} Used</span></span>
              </div>
            </div>
            <button
              type="submit"
              className={`${styles.submitBtn} ${isProject ? styles.submitBtnProject : ''}`}
              disabled={isFull || loading || !title || !body}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
              {loading ? 'Submitting...' : 'Submit Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ActiveTrackItem({ dt, isProject, onUpdateDowntime }) {
  const status = (dt.status || 'submitted').toLowerCase();
  const displayTitle = isProject ? dt.title.replace('[PROJECT] ', '') : dt.title;

  let badgeClass = styles.badgePending;
  if (status === 'approved') badgeClass = styles.badgeApproved;
  if (status === 'needs a scene') badgeClass = styles.badgeNeedsScene;
  if (status === 'rejected') badgeClass = styles.badgeRejected;
  if (status === 'resolved' || status === 'resolved in scene') badgeClass = styles.badgeReview;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(displayTitle);
  const [editBody, setEditBody] = useState(dt.body);
  const [saving, setSaving] = useState(false);

  const canEdit = status === 'submitted';

  const handleSave = async () => {
    if (!editTitle.trim() || !editBody.trim()) return;
    setSaving(true);
    try {
      const finalTitle = isProject ? `[PROJECT] ${editTitle.trim()}` : editTitle.trim();
      const payload = { title: finalTitle, body: editBody.trim() };
      await api.put(`/downtimes/${dt.id}`, payload);
      onUpdateDowntime(dt.id, { ...dt, title: finalTitle, body: editBody.trim() });
      setIsEditing(false);
    } catch (e) {
      alert('Failed to update action.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${styles.trackCard} ${isProject ? styles.trackCardProject : ''}`}>
      <div className={styles.trackCardGradient}></div>
      <div className={styles.trackCardHeader}>
        <span className={`${styles.trackTypeTag} ${isProject ? styles.trackTypeProject : styles.trackTypeAction}`}>
          {isProject ? 'Project' : 'Action'}
        </span>
        <span className={`${styles.trackStatusTag} ${badgeClass}`}>
          {status === 'needs a scene' && <div className={styles.pulseDot}></div>}
          {dt.status}
        </span>
      </div>

      {isEditing ? (
        <div className={styles.editModeContainer} style={{ position: 'relative', zIndex: 10 }}>
          <input className={styles.input} type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          <textarea className={`${styles.input} ${styles.textarea}`} value={editBody} onChange={e => setEditBody(e.target.value)} />
          <div className={styles.editActions}>
            <button className={styles.btnSecondary} onClick={() => setIsEditing(false)} disabled={saving}>Cancel</button>
            <button className={styles.submitBtn} onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', width: 'auto' }}>Save</button>
          </div>
        </div>
      ) : (
        <>
          <h4 className={styles.trackTitle}>{displayTitle}</h4>
          <p className={styles.trackBody}>{dt.body}</p>
          {canEdit && (
            <button
              className={styles.viewAllBtn}
              style={{ position: 'relative', zIndex: 10, marginTop: '8px' }}
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            >
              Edit Action
            </button>
          )}
        </>
      )}
    </div>
  );
}

function ArchiveItem({ dt, isProject }) {
  const status = (dt.status || 'resolved').toLowerCase();
  const displayTitle = isProject ? dt.title.replace('[PROJECT] ', '') : dt.title;

  const dateStr = niceDate(dt.created_at).split(' ').slice(1, 3).join(' '); // "Sep 1999" approx

  let badgeClass = styles.badgeReview;
  if (status === 'approved') badgeClass = styles.badgeApproved;
  if (status === 'needs a scene') badgeClass = styles.badgeNeedsScene;
  if (status === 'rejected') badgeClass = styles.badgeRejected;
  if (status === 'submitted') badgeClass = styles.badgePending;

  return (
    <div className={styles.archiveCard}>
      <div className={styles.archiveCardHeader}>
        <div className={styles.archiveCardMeta}>
          <span className={styles.archiveCardDate}>{dateStr} • {isProject ? 'Project' : 'Action'}</span>
          <h4 className={styles.archiveCardTitle}>{displayTitle}</h4>
        </div>
        <span className={`${styles.archiveStatusTag} ${badgeClass}`}>{dt.status}</span>
      </div>
      <div className={styles.archiveCardBody}>
        <p className={styles.archiveCardText}>{dt.body}</p>

        {dt.gm_resolution && (
          <div className={styles.resolutionBox}>
            <span className={`${styles.resolutionLabel} ${status === 'rejected' ? styles.resolutionLabelRejected : styles.resolutionLabelApproved}`}>
              GM Resolution:
            </span>
            <p className={styles.resolutionText}>{dt.gm_resolution}</p>
          </div>
        )}
      </div>
    </div>
  );
}

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

  // UI state for archive
  const [archiveFilter, setArchiveFilter] = useState('all');
  const [q, setQ] = useState('');

  // Countdowns
  const deadlineCountdown = useCountdown(deadline, true);
  deadlineCountdown.targetDate = deadline;

  const openingCountdown = useCountdown(opening, false);
  openingCountdown.targetDate = opening;

  const projectCountdown = useCountdown(projectDeadline, true);
  projectCountdown.targetDate = projectDeadline;

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

          if (downtime_active_phase === 'project') setViewMode('project');
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

  const handleDowntimeUpdated = (id, updatedItem) => {
    setMine(prev => prev.map(dt => dt.id === id ? updatedItem : dt));
  };

  const isCharActive = currentUser?.role === 'admin' || (myChar && myChar.sheet && myChar.sheet.is_active === true);

  const isProj = (dt) => dt.title && dt.title.startsWith('[PROJECT]');

  const currentCategoryMine = useMemo(() => {
    return viewMode === 'project' ? mine.filter(isProj) : mine.filter(dt => !isProj(dt));
  }, [mine, viewMode]);

  const active = useMemo(() => currentCategoryMine.filter(d => !statusIsPast(d.status)), [currentCategoryMine]);
  const pastRaw = useMemo(() => currentCategoryMine.filter(d => statusIsPast(d.status)), [currentCategoryMine]);

  const archiveList = useMemo(() => {
    let source = pastRaw;
    if (archiveFilter === 'approved') source = source.filter(d => d.status.toLowerCase() !== 'rejected');
    if (archiveFilter === 'rejected') source = source.filter(d => d.status.toLowerCase() === 'rejected');

    const qq = q.trim();
    if (!qq) return source;

    const ms = new MiniSearch({
      fields: ['title', 'body', 'gm_resolution'],
      searchOptions: { prefix: true, fuzzy: 0.2, combineWith: 'AND' }
    });

    const docs = source.map((dt, idx) => ({
      id: idx,
      title: dt.title || '',
      body: dt.body || '',
      gm_resolution: dt.gm_resolution || ''
    }));
    ms.addAll(docs);

    const results = ms.search(qq);
    const resultIds = new Set(results.map(r => r.id));
    return source.filter((_, idx) => resultIds.has(idx));
  }, [pastRaw, archiveFilter, q]);

  return (
    <Skeleton loading={loading} name="downtimes-page">
      <main className={styles.page}>

        {/* Hero Header & Mode Switcher */}
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>Downtime Management</h1>
            <p className={styles.subtitle}>
              {viewMode === 'standard'
                ? 'Orchestrate your nocturnal endeavors. Submit monthly actions to the Storyteller.'
                : 'Advance long-term grand projects over the course of multiple months.'}
            </p>
          </div>
          <div className={styles.modeSwitcher}>
            <button
              className={`${styles.modeBtn} ${viewMode === 'standard' ? styles.modeBtnActive : ''}`}
              onClick={() => { setViewMode('standard'); setQ(''); setArchiveFilter('all'); }}
            >
              Monthly Actions
            </button>
            <button
              className={`${styles.modeBtn} ${viewMode === 'project' ? styles.modeBtnProjectActive : ''}`}
              onClick={() => { setViewMode('project'); setQ(''); setArchiveFilter('all'); }}
            >
              Long-Term Projects
            </button>
          </div>
        </section>

        {/* Deadlines Row */}
        <section className={styles.deadlinesRow}>
          {viewMode === 'standard' ? (
            <>
              <CountdownDisplay
                title="Submission Deadline"
                countdown={deadlineCountdown}
                subText="Next Storyteller Review"
                icon="dark_mode"
                isProject={false}
              />
              <CountdownDisplay
                title="Next Modern Event"
                countdown={openingCountdown}
                subText="Submissions are Open"
                icon="event"
                isProject={false}
              />
            </>
          ) : (
            <CountdownDisplay
              title="Next Project Phase"
              countdown={projectCountdown}
              subText="Phase Deadline"
              icon="history_edu"
              isProject={true}
            />
          )}
        </section>

        {err && <div className={styles.alert}>{err}</div>}

        {/* Main Grid */}
        <section className={styles.mainGrid}>
          {/* Left Column: Submission Form */}
          <div className={styles.formColumn}>
            {!isCharActive ? (
              <div className={styles.alert} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                Your character is waiting for ST approval. You cannot submit actions yet.
              </div>
            ) : (
              <SubmitCard quota={quota} onDowntimeCreated={handleDowntimeCreated} isProject={viewMode === 'project'} />
            )}
          </div>

          {/* Right Column: Active Submissions */}
          <div className={styles.activeTrackColumn}>
            <div className={styles.activeTrackHeader}>
              <h3 className={styles.activeTrackTitle}>Active Track</h3>
            </div>

            <div className={styles.trackList}>
              {active.length === 0 ? (
                <div className={styles.empty} style={{ padding: '24px 16px' }}>
                  <div className={styles.emptyText}>No active {viewMode === 'standard' ? 'actions' : 'projects'}.</div>
                </div>
              ) : (
                active.map(dt => (
                  <ActiveTrackItem
                    key={dt.id}
                    dt={dt}
                    isProject={viewMode === 'project'}
                    onUpdateDowntime={handleDowntimeUpdated}
                  />
                ))
              )}
            </div>
          </div>
        </section>

        {/* Submission History List */}
        <section className={styles.archiveSection}>
          <div className={styles.archiveHeader}>
            <h3 className={styles.archiveTitle}>Archive & Resolutions</h3>
            <div className={styles.archiveControls}>
              <select
                className={styles.filterSelect}
                value={archiveFilter}
                onChange={(e) => setArchiveFilter(e.target.value)}
              >
                <option value="all">All Past</option>
                <option value="approved">Approved / Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
              <div className={styles.searchWrap}>
                <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Filter history..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.archiveGrid}>
            {archiveList.length === 0 ? (
              <div className={styles.empty} style={{ gridColumn: '1 / -1' }}>
                <span className={`material-symbols-outlined ${styles.emptyIcon}`}>inventory_2</span>
                <div className={styles.emptyText}>
                  {q ? `No archived submissions match your search.` : `Your archive is empty.`}
                </div>
              </div>
            ) : (
              archiveList.map(dt => (
                <ArchiveItem key={dt.id} dt={dt} isProject={viewMode === 'project'} />
              ))
            )}
          </div>
        </section>

      </main>
    </Skeleton>
  );
}