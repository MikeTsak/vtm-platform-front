// src/pages/DownTimes.jsx
import React, { useMemo, useState, useContext, useEffect } from 'react';
import { AuthCtx } from '../../core/AuthContext';
import api from '../../core/api';
import styles from '../../styles/DownTimes.module.css';
import { Skeleton } from 'boneyard-js/react';
import MiniSearch from 'minisearch';
import { trackEvent } from '../../utils/analytics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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

// Zod schema for downtime submission
const submitSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  body: z.string().min(1, 'Description is required').max(3000, 'Description is too long'),
  feeding: z.string().max(100, 'Feeding type is too long').optional(),
});

function SubmitCard({ quota, isProject }) {
  const queryClient = useQueryClient();
  const isFull = quota.used >= quota.limit;

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(submitSchema),
    defaultValues: { title: '', body: '', feeding: '' },
  });

  const bodyValue = watch('body');

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const finalTitle = isProject ? `[PROJECT] ${data.title.trim()}` : data.title.trim();
      const payload = { 
        title: finalTitle, 
        body: data.body.trim(), 
        feeding_type: isProject ? null : (data.feeding?.trim() || null) 
      };
      const response = await api.post('/downtimes', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Action submitted successfully!');
      trackEvent('submit_downtime', { type: isProject ? 'project' : 'action' });
      reset();
      // Invalidate queries to automatically refetch downtimes and quota
      queryClient.invalidateQueries({ queryKey: ['downtimes'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to submit action.');
    }
  });

  const onSubmit = (data) => {
    if (isFull) return;
    submitMutation.mutate(data);
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>{isProject ? 'Project Name / Phase' : 'Action Title'}</label>
              <input
                className={styles.input}
                type="text"
                {...register('title')}
                placeholder={isProject ? "e.g., Secure Haven Defenses (Phase 1)" : "e.g., Secure Haven Defenses"}
                disabled={isFull || submitMutation.isPending}
              />
              {errors.title && <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>{errors.title.message}</span>}
            </div>
            {!isProject && (
              <div className={styles.field}>
                <label className={styles.label}>Feeding Type / Cover</label>
                <input
                  className={styles.input}
                  type="text"
                  {...register('feeding')}
                  placeholder="e.g., Herd Management"
                  disabled={isFull || submitMutation.isPending}
                />
                {errors.feeding && <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>{errors.feeding.message}</span>}
              </div>
            )}
          </div>

          <div className={styles.field} style={{ marginTop: '24px' }}>
            <label className={styles.label}>Detailed Description & Intent</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              {...register('body')}
              placeholder={isProject ? "Describe exactly what you are doing, resources used, and who is involved..." : "Detail your character's actions, resources expended, and desired outcome..."}
              maxLength={isProject ? 3000 : 1500}
              disabled={isFull || submitMutation.isPending}
            />
            {errors.body && <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>{errors.body.message}</span>}
            <span className={styles.counter}>{(bodyValue || '').length} / {isProject ? 3000 : 1500}</span>
          </div>

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
              disabled={isFull || submitMutation.isPending}
              style={{ opacity: submitMutation.isPending ? 0.7 : 1 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
              {submitMutation.isPending ? 'Submitting...' : 'Submit Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ActiveTrackItem({ dt, isProject }) {
  const queryClient = useQueryClient();
  const status = (dt.status || 'submitted').toLowerCase();
  const displayTitle = isProject ? dt.title.replace('[PROJECT] ', '') : dt.title;

  let badgeClass = styles.badgePending;
  if (status === 'approved') badgeClass = styles.badgeApproved;
  if (status === 'needs a scene') badgeClass = styles.badgeNeedsScene;
  if (status === 'rejected') badgeClass = styles.badgeRejected;
  if (status === 'resolved' || status === 'resolved in scene') badgeClass = styles.badgeReview;

  const [isEditing, setIsEditing] = useState(false);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { editTitle: displayTitle, editBody: dt.body },
  });

  const canEdit = status === 'submitted';

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const finalTitle = isProject ? `[PROJECT] ${data.editTitle.trim()}` : data.editTitle.trim();
      const payload = { title: finalTitle, body: data.editBody.trim() };
      await api.put(`/downtimes/${dt.id}`, payload);
    },
    onSuccess: () => {
      toast.success('Action updated.');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['downtimes'] });
    },
    onError: () => {
      toast.error('Failed to update action.');
    }
  });

  const onSave = (data) => {
    updateMutation.mutate(data);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      viewport={{ once: false, amount: 0.1 }}
      className={`${styles.trackCard} ${isProject ? styles.trackCardProject : ''}`}
    >
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
        <form onSubmit={handleSubmit(onSave)} className={styles.editModeContainer} style={{ position: 'relative', zIndex: 10 }}>
          <input className={styles.input} type="text" {...register('editTitle', { required: true })} />
          <textarea className={`${styles.input} ${styles.textarea}`} {...register('editBody', { required: true })} />
          <div className={styles.editActions}>
            <button type="button" className={styles.btnSecondary} onClick={() => { setIsEditing(false); reset(); }} disabled={updateMutation.isPending}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={updateMutation.isPending} style={{ padding: '8px 16px', width: 'auto' }}>
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
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
    </motion.div>
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
    <motion.div 
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      viewport={{ once: false, amount: 0.1 }}
      className={styles.archiveCard}
    >
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
    </motion.div>
  );
}

export default function DownTimes() {
  const { user: currentUser } = useContext(AuthCtx);
  
  // React Query Fetching
  const { data: configData, isLoading: isConfigLoading } = useQuery({
    queryKey: ['config', 'downtimes'],
    queryFn: async () => {
      const res = await api.get('/downtimes/config');
      return res.data;
    }
  });

  const { data: mineData, isLoading: isMineLoading } = useQuery({
    queryKey: ['downtimes', 'mine'],
    queryFn: async () => {
      const res = await api.get('/downtimes/mine');
      return res.data;
    }
  });

  const { data: quotaData, isLoading: isQuotaLoading } = useQuery({
    queryKey: ['quota'],
    queryFn: async () => {
      const res = await api.get('/downtimes/quota');
      return res.data;
    }
  });

  const { data: charData, isLoading: isCharLoading } = useQuery({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data;
    }
  });

  const isLoading = isConfigLoading || isMineLoading || isQuotaLoading || isCharLoading;

  // Mode Switcher
  const [viewMode, setViewMode] = useState('standard'); // 'standard' | 'project'
  
  // Set viewMode based on config when it loads
  useEffect(() => {
    if (configData?.downtime_active_phase === 'project') {
      setViewMode('project');
    }
  }, [configData?.downtime_active_phase]);

  // UI state for archive
  const [archiveFilter, setArchiveFilter] = useState('all');
  const [q, setQ] = useState('');

  // Countdowns
  const deadlineCountdown = useCountdown(configData?.downtime_deadline || '', true);
  deadlineCountdown.targetDate = configData?.downtime_deadline || '';

  const openingCountdown = useCountdown(configData?.downtime_opening || '', false);
  openingCountdown.targetDate = configData?.downtime_opening || '';

  const projectCountdown = useCountdown(configData?.project_deadline || '', true);
  projectCountdown.targetDate = configData?.project_deadline || '';

  // Data processing
  const mine = useMemo(() => {
    return (mineData?.downtimes || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [mineData]);

  const quota = quotaData || { used: 0, limit: 3 };
  const myChar = charData?.character || null;
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
    <Skeleton loading={isLoading} name="downtimes-page">
      <motion.main 
        className={styles.page}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
      >
        {/* Hero Header & Mode Switcher */}
        <motion.section 
          className={styles.heroSection}
          variants={{
            hidden: { opacity: 0, y: 30, scale: 0.95 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
          }}
        >
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
        </motion.section>

        {/* Deadlines Row */}
        <motion.section 
          className={styles.deadlinesRow}
          variants={{
            hidden: { opacity: 0, y: 30, scale: 0.95 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
          }}
        >
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
        </motion.section>

        {/* Main Grid */}
        <motion.section 
          className={styles.mainGrid}
          variants={{
            hidden: { opacity: 0, y: 30, scale: 0.95 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
          }}
        >
          {/* Left Column: Submission Form */}
          <div className={styles.formColumn}>
            {!isCharActive ? (
              <div className={styles.alert} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                Your character is waiting for ST approval. You cannot submit actions yet.
              </div>
            ) : (
              <SubmitCard quota={quota} isProject={viewMode === 'project'} />
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
                  />
                ))
              )}
            </div>
          </div>
        </motion.section>

        {/* Submission History List */}
        <motion.section 
          className={styles.archiveSection}
          variants={{
            hidden: { opacity: 0, y: 30, scale: 0.95 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
          }}
        >
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
        </motion.section>
      </motion.main>
    </Skeleton>
  );
}