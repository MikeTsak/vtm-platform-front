// Admin > System > Background Jobs: every scheduled job's latest outcome
// (back/routes/jobs.js), the newest backups on disk, and a run-now button.
import React, { useCallback, useEffect, useState } from 'react';
import api, { formatApiError } from '../../core/api';
import adminStyles from '../../styles/Admin.module.css';
import styles from '../../styles/AdminJobs.module.css';
import { formatAthensDateTime } from '../../utils/dateFormatter';

const HEALTH_LABEL = {
  ok: 'Healthy',
  failing: 'Last run failed',
  overdue: 'Overdue',
  never: 'Not run yet',
  disabled: 'Disabled',
};

function describeCron(expr) {
  const parts = String(expr || '').split(' ');
  if (parts.length !== 5) return expr; // not a cron expression ("while comms are open")
  const [m, h] = parts;
  if (m === '*' && h === '*') return 'every minute';
  if (m.startsWith('*/') && h === '*') return `every ${m.slice(2)} min`;
  if (h === '*') return `hourly at :${m.padStart(2, '0')}`;
  return `daily ${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

function ago(min) {
  if (min == null) return 'never';
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  if (min < 48 * 60) return `${Math.floor(min / 60)} h ${min % 60} min ago`;
  return `${Math.floor(min / 1440)} days ago`;
}

const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
const uptime = (s) => (s < 3600 ? `${Math.floor(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`);

export default function AdminJobsTab() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [running, setRunning] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get('/admin/jobs');
      setData(d);
      setErr('');
    } catch (e) {
      setErr(formatApiError(e, 'Could not load job status'));
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    return () => clearInterval(id);
  }, [load]);

  const runNow = async (job) => {
    setRunning(job.name);
    setMsg('');
    try {
      const { data: r } = await api.post(`/admin/jobs/${job.name}/run`, {}, { timeout: 0 });
      setMsg(r.ok ? `${job.label}: ${r.note || 'done'}` : `${job.label} failed: ${(r.error || '').split('\n')[0]}`);
      await load();
    } catch (e) {
      setMsg(formatApiError(e, 'Run failed'));
    } finally {
      setRunning('');
    }
  };

  const jobs = data?.jobs || [];
  const problems = jobs.filter((j) => j.health === 'failing' || j.health === 'overdue').length;

  return (
    <div className={adminStyles.adminCard}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>
            <span className="material-symbols-outlined" style={{ verticalAlign: '-0.15em', marginRight: '0.5rem' }}>schedule</span>
            Background Jobs
          </h2>
          <p className={styles.sub}>
            Scheduled tasks, when they last ran and what they did. A job is overdue when it has gone longer than its
            usual gap without running, usually because the server was asleep.
          </p>
        </div>
        <button type="button" className={`${adminStyles.btn} ${adminStyles.btnSmall}`} onClick={load}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span> Refresh
        </button>
      </div>

      {err && <div className={`${adminStyles.alert} ${adminStyles.alertError}`}>{err}</div>}
      {msg && <div className={adminStyles.alert} role="status">{msg}</div>}

      {data && (
        <div className={styles.serverLine}>
          <span>This server process up <strong>{uptime(data.server.uptime_sec)}</strong></span>
          <span className={data.server.boots_today > 10 ? styles.warnText : undefined}>
            <strong>{data.server.boots_today}</strong> server start(s) today
            {data.server.boots_today > 10 && ' (the host is putting the app to sleep; see Plesk > Node.js)'}
          </span>
          <span>{problems ? <strong className={styles.warnText}>{problems} job(s) need attention</strong> : 'All jobs healthy'}</span>
        </div>
      )}

      {!data && !err && <p className={styles.sub}>Loading…</p>}

      <div className={styles.list}>
        {jobs.map((j) => {
          const s = j.status;
          const errorIsCurrent = j.health === 'failing';
          return (
            <div key={j.name} className={styles.job}>
              <span className={`${styles.dot} ${styles[j.health]}`} title={HEALTH_LABEL[j.health]} aria-label={HEALTH_LABEL[j.health]} />
              <div>
                <div className={styles.name}>{j.label}</div>
                <div className={styles.meta}>
                  {describeCron(j.schedule)} · {HEALTH_LABEL[j.health]}
                </div>
              </div>
              <div className={styles.note}>
                {s ? (
                  <>
                    <span title={s.last_run_at ? formatAthensDateTime(s.last_run_at) : ''}>{ago(s.age_min)}</span>
                    {s.last_note ? ` · ${s.last_note}` : ''}
                    <div className={styles.meta}>
                      {s.runs} run(s), {s.failures} failed{s.last_duration_ms != null ? ` · took ${s.last_duration_ms} ms` : ''}
                    </div>
                  </>
                ) : (
                  <span className={styles.meta}>No run recorded since this panel was added.</span>
                )}
              </div>
              <button
                type="button"
                className={`${adminStyles.btn} ${adminStyles.btnSmall}`}
                disabled={!j.enabled || running !== ''}
                onClick={() => runNow(j)}
                title="Run now. Safe: every job skips work it has already done."
              >
                {running === j.name ? 'Running…' : 'Run now'}
              </button>
              {errorIsCurrent && s?.last_error && (
                <pre className={styles.error}>
                  {formatAthensDateTime(s.last_error_at)}{'\n'}{s.last_error}
                </pre>
              )}
            </div>
          );
        })}
      </div>

      {data && (
        <>
          <h3 className={styles.sectionTitle}>Newest backups on the server</h3>
          {data.backups.length === 0 && <p className={styles.sub}>No backups found.</p>}
          {data.backups.map((b) => (
            <div key={b.file} className={styles.backup}>
              <span>
                {b.file}
                <span className={`${styles.tag} ${b.full ? styles.tagFull : ''}`}>{b.full ? 'full' : 'no media'}</span>
              </span>
              <span>{mb(b.size)} · {formatAthensDateTime(b.mtime)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
