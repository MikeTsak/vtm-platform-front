import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import CharacterSetup from './CharacterSetup';
import styles from '../styles/DownTimes.module.css';

const TITLE_MAX = 80;
const BODY_MAX = 2000;

const STATUS_STYLE = {
  pending: styles.badgePending,
  in_review: styles.badgeReview,
  approved: styles.badgeApproved,
  resolved: styles.badgeApproved,
  rejected: styles.badgeRejected,
  failed: styles.badgeRejected,
};

export default function DownTimes() {
  const [hasChar, setHasChar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [list, setList] = useState([]);

  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const me = await api.get('/characters/me');
      const character = me?.data?.character;
      setHasChar(!!character);

      if (character) {
        const { data } = await api.get('/downtimes/mine');
        const items = Array.isArray(data?.downtimes) ? data.downtimes : [];
        // newest first
        items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setList(items);
      } else {
        setList([]);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load downtimes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Derived filters
  const statuses = useMemo(() => {
    const s = new Set(list.map(d => (d.status || 'pending')));
    return ['all', ...Array.from(s)];
  }, [list]);

  const filtered = useMemo(() => {
    return list.filter(d => {
      const matchStatus = statusFilter === 'all' || (d.status || 'pending') === statusFilter;
      const q = query.trim().toLowerCase();
      const matchQuery = !q ||
        d.title?.toLowerCase().includes(q) ||
        d.body?.toLowerCase().includes(q) ||
        d.gm_notes?.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [list, statusFilter, query]);

  const isValid = title.trim().length > 0 && title.trim().length <= TITLE_MAX &&
                  body.trim().length > 0 && body.trim().length <= BODY_MAX;

  const submit = async (e) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    try {
      setSubmitting(true);
      setError('');
      setOk('');
      await api.post('/downtimes', { title: title.trim(), body: body.trim() });
      setTitle('');
      setBody('');
      setOk('Downtime submitted.'); // brief success
      load();
      setTimeout(() => setOk(''), 2000);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to submit downtime.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasChar && !loading) {
    return <CharacterSetup onDone={load} />;
  }

  return (
    <div className={styles.page}>

      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Downtimes</h2>
          <p className={styles.subtitle}>Tell the Storyteller what your character does between sessions.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.ghostBtn} onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* Alerts */}
      {error && <div className={`${styles.alert} ${styles.alertError}`} role="alert">{error}</div>}
      {ok && <div className={`${styles.alert} ${styles.alertOk}`} role="status">{ok}</div>}

      {/* Form */}
      <section className={styles.card}>
        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.field}>
            <label htmlFor="dt-title" className={styles.label}>
              Title <span className={styles.muted}>(max {TITLE_MAX})</span>
            </label>
            <input
              id="dt-title"
              className={styles.input}
              placeholder="Short title (e.g., 'Investigate the docks')"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              required
            />
            <div className={styles.counter}>{title.trim().length}/{TITLE_MAX}</div>
          </div>

          <div className={styles.field}>
            <label htmlFor="dt-body" className={styles.label}>
              Description <span className={styles.muted}>(max {BODY_MAX})</span>
            </label>
            <textarea
              id="dt-body"
              className={`${styles.input} ${styles.textarea}`}
              placeholder="What do you do between sessions? Who, where, how, and intended outcome."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              maxLength={BODY_MAX}
              required
            />
            <div className={styles.counter}>{body.trim().length}/{BODY_MAX}</div>
          </div>

          <div className={styles.formRow}>
            <button className={styles.cta} disabled={!isValid || submitting}>
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
            <span className={styles.formHint}>
              Be specific. If it needs rolls, note pools or approaches.
            </span>
          </div>
        </form>
      </section>

      {/* Controls */}
      <section className={styles.controls}>
        <div className={styles.filters}>
          <label className={styles.filterLabel}>Status</label>
          <div className={styles.chips}>
            {statuses.map(s => (
              <button
                key={s}
                className={`${styles.chip} ${statusFilter === s ? styles.chipActive : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s.replaceAll('_',' ')}
                <span className={styles.chipCount}>
                  {s === 'all' ? list.length : list.filter(d => (d.status || 'pending') === s).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.searchWrap}>
          <input
            className={styles.search}
            placeholder="Search title, body, or GM notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </section>

      {/* List */}
      <section className={styles.list}>
        {loading && (
          <>
            <div className={`${styles.item} ${styles.skeleton}`} />
            <div className={`${styles.item} ${styles.skeleton}`} />
            <div className={`${styles.item} ${styles.skeleton}`} />
          </>
        )}

        {!loading && filtered.map(d => {
          const status = (d.status || 'pending');
          const badgeClass = STATUS_STYLE[status] || styles.badgePending;
          return (
            <article key={d.id} className={styles.item}>
              <div className={styles.itemHead}>
                <h3 className={styles.itemTitle}>{d.title}</h3>
                <span className={`${styles.badge} ${badgeClass}`}>
                  {status.replaceAll('_',' ')}
                </span>
              </div>
              <div className={styles.itemMeta}>
                <time dateTime={d.created_at}>
                  {new Date(d.created_at).toLocaleString()}
                </time>
              </div>
              <div className={styles.itemBody}>{d.body}</div>

              {d.gm_notes && (
                <div className={styles.itemNotes}>
                  <span className={styles.itemNotesLabel}>GM Notes:</span>
                  <div className={styles.itemNotesBody}>{d.gm_notes}</div>
                </div>
              )}
            </article>
          );
        })}

        {!loading && !filtered.length && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🩸</div>
            <div className={styles.emptyText}>
              {list.length
                ? 'No results match your filters.'
                : 'No downtimes yet. Submit your first one above!'}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
