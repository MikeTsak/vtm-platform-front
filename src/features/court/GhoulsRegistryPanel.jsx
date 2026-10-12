import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/court/CourtActions.module.css';

const Icon = ({ name, size = 18 }) => (
  <span className="material-symbols-outlined" style={{ fontSize: size }} aria-hidden="true">
    {name}
  </span>
);

const fmtDate = (d) => {
  if (!d) return '';
  const dateObj = new Date(d);
  return dateObj.toLocaleString('en-GB', {
    timeZone: 'Europe/Athens',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function GhoulsRegistryPanel() {
  const [roster, setRoster] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clanFilter, setClanFilter] = useState('all');

  // Modal editing state
  const [activeItem, setActiveItem] = useState(null);
  const [editCount, setEditCount] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rosterRes, registryRes] = await Promise.all([
        api.get('/camarilla/roster'),
        api.get('/court-actions/ghouls-registry'),
      ]);
      const livingKindred = (rosterRes.data?.roster || []).filter((r) => !r.is_deceased);
      setRoster(livingKindred);
      setEntries(registryRes.data?.entries || []);
    } catch (e) {
      setError(formatApiError(e, 'Could not load the Ghouls Registry.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Index entries by targetType:targetId for rapid lookup
  const entryMap = useMemo(() => {
    const map = new Map();
    for (const entry of entries) {
      map.set(`${entry.target_type}:${entry.target_id}`, entry);
    }
    return map;
  }, [entries]);

  // Unique clans for filtering
  const clans = useMemo(() => {
    const set = new Set();
    for (const r of roster) {
      if (r.clan && r.clan.trim()) set.add(r.clan.trim());
    }
    return Array.from(set).sort();
  }, [roster]);

  // Filtered and enriched roster list
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roster.filter((r) => {
      const entry = entryMap.get(`${r.type}:${r.id}`);
      const ghoulCount = entry ? entry.ghoul_count : null;
      const notes = entry?.notes || '';

      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (clanFilter !== 'all' && r.clan !== clanFilter) return false;

      if (statusFilter === 'has_ghouls' && (!entry || ghoulCount <= 0)) return false;
      if (statusFilter === 'zero_ghouls' && (!entry || ghoulCount !== 0)) return false;
      if (statusFilter === 'unrecorded' && entry) return false;

      if (q) {
        const nameMatch = (r.name || '').toLowerCase().includes(q);
        const clanMatch = (r.clan || '').toLowerCase().includes(q);
        const notesMatch = notes.toLowerCase().includes(q);
        const titlesMatch = Array.isArray(r.titles)
          ? r.titles.some((t) => String(t).toLowerCase().includes(q))
          : String(r.titles || '').toLowerCase().includes(q);
        if (!nameMatch && !clanMatch && !notesMatch && !titlesMatch) return false;
      }

      return true;
    });
  }, [roster, entryMap, search, typeFilter, clanFilter, statusFilter]);

  // Overall statistics
  const stats = useMemo(() => {
    let totalGhouls = 0;
    let recordedCount = 0;
    let withGhoulsCount = 0;

    for (const r of roster) {
      const entry = entryMap.get(`${r.type}:${r.id}`);
      if (entry) {
        recordedCount += 1;
        totalGhouls += entry.ghoul_count || 0;
        if ((entry.ghoul_count || 0) > 0) withGhoulsCount += 1;
      }
    }

    return {
      totalKindred: roster.length,
      totalGhouls,
      recordedCount,
      withGhoulsCount,
      unrecordedCount: roster.length - recordedCount,
    };
  }, [roster, entryMap]);

  const openEditor = (kindred) => {
    const entry = entryMap.get(`${kindred.type}:${kindred.id}`);
    setActiveItem(kindred);
    setEditCount(entry ? entry.ghoul_count : 0);
    setEditNotes(entry ? entry.notes || '' : '');
    setSaveError('');
  };

  const closeEditor = () => {
    setActiveItem(null);
    setSaveError('');
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!activeItem) return;
    setSaving(true);
    setSaveError('');

    try {
      const res = await api.put(
        `/court-actions/ghouls-registry/${activeItem.type}/${activeItem.id}`,
        {
          ghoul_count: Math.max(0, parseInt(editCount, 10) || 0),
          notes: editNotes.trim(),
        }
      );
      const saved = res.data?.entry;
      setEntries((prev) => {
        const next = prev.filter(
          (x) => !(x.target_type === activeItem.type && x.target_id === activeItem.id)
        );
        return [saved, ...next];
      });
      closeEditor();
    } catch (err) {
      setSaveError(formatApiError(err, 'Failed to save registry entry.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeItem) return;
    const confirmDelete = window.confirm(
      `Clear the ghoul census record for ${activeItem.name}?`
    );
    if (!confirmDelete) return;

    setSaving(true);
    setSaveError('');
    try {
      await api.delete(
        `/court-actions/ghouls-registry/${activeItem.type}/${activeItem.id}`
      );
      setEntries((prev) =>
        prev.filter(
          (x) => !(x.target_type === activeItem.type && x.target_id === activeItem.id)
        )
      );
      closeEditor();
    } catch (err) {
      setSaveError(formatApiError(err, 'Failed to delete registry entry.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.list} style={{ gap: '1.25rem' }}>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>
          <Icon name="groups" /> Ghouls Registry
        </h2>
        <p className={styles.hint}>
          The Court census of mortals bound to Kindred vitae. The Harpy, Prince, and Seneschal record reported retainers and intelligence here: confidential court notes, inaccessible to common Kindred.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        {/* Aggregate statistics */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statValue}>{stats.totalKindred}</div>
            <div className={styles.statLabel}>Active Kindred</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue} style={{ color: '#ffb74d' }}>
              {stats.totalGhouls}
            </div>
            <div className={styles.statLabel}>Ghouls Reported</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue} style={{ color: '#69f0ae' }}>
              {stats.withGhoulsCount}
            </div>
            <div className={styles.statLabel}>Holding Ghouls</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue} style={{ color: '#90caf9' }}>
              {stats.unrecordedCount}
            </div>
            <div className={styles.statLabel}>Awaiting Census</div>
          </div>
        </div>

        {/* Filter controls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <label className={styles.field} style={{ margin: 0 }}>
            <span>Search Kindred or Notes</span>
            <input
              type="text"
              className={styles.input}
              placeholder="Search by name, clan, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <label className={styles.field} style={{ margin: 0 }}>
            <span>Kindred Type</span>
            <select
              className={styles.input}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Kindred</option>
              <option value="player">Kindred of the City (Players)</option>
              <option value="npc">Residents and Elders (NPCs)</option>
            </select>
          </label>

          <label className={styles.field} style={{ margin: 0 }}>
            <span>Census Status</span>
            <select
              className={styles.input}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="has_ghouls">Reported Ghouls (1+)</option>
              <option value="zero_ghouls">No Ghouls (0)</option>
              <option value="unrecorded">Awaiting Census Notes</option>
            </select>
          </label>

          <label className={styles.field} style={{ margin: 0 }}>
            <span>Clan</span>
            <select
              className={styles.input}
              value={clanFilter}
              onChange={(e) => setClanFilter(e.target.value)}
            >
              <option value="all">All Clans</option>
              {clans.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Registry listing */}
      <section className={styles.panel}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.85rem',
          }}
        >
          <span className={styles.itemMeta}>
            Displaying {filteredList.length} of {roster.length} Kindred
          </span>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSmall}`}
            onClick={loadData}
            disabled={loading}
          >
            <Icon name="refresh" size={16} /> Refresh Registry
          </button>
        </div>

        {loading ? (
          <div className={styles.empty}>Opening the Court archives...</div>
        ) : filteredList.length === 0 ? (
          <div className={styles.empty}>No Kindred matched the selected filters.</div>
        ) : (
          <div className={styles.list}>
            {filteredList.map((kindred) => {
              const entry = entryMap.get(`${kindred.type}:${kindred.id}`);
              const titlesList = Array.isArray(kindred.titles)
                ? kindred.titles
                : kindred.titles
                ? [kindred.titles]
                : [];
              const isRecorded = Boolean(entry);
              const ghoulCount = entry ? entry.ghoul_count : null;

              return (
                <div
                  key={`${kindred.type}:${kindred.id}`}
                  className={styles.item}
                  style={{
                    borderLeft: isRecorded
                      ? '3px solid var(--tint)'
                      : '3px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  <div className={styles.itemHead}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span className={styles.itemName}>{kindred.name}</span>
                      <span
                        className={styles.badge}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-color)',
                        }}
                      >
                        {kindred.clan || 'Unknown Clan'}
                      </span>
                      <span
                        className={styles.badge}
                        style={{
                          background:
                            kindred.type === 'player'
                              ? 'rgba(100, 181, 246, 0.15)'
                              : 'rgba(186, 104, 200, 0.15)',
                          color: kindred.type === 'player' ? '#90caf9' : '#ce93d8',
                        }}
                      >
                        {kindred.type === 'player' ? 'Player' : 'NPC'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {isRecorded ? (
                        <span
                          className={styles.badge}
                          style={{
                            background:
                              ghoulCount > 0
                                ? 'rgba(255, 183, 77, 0.15)'
                                : 'rgba(255, 255, 255, 0.08)',
                            color: ghoulCount > 0 ? '#ffb74d' : 'var(--text-muted)',
                            fontSize: '0.78rem',
                            padding: '0.2rem 0.65rem',
                          }}
                        >
                          <Icon name="person" size={14} />{' '}
                          {ghoulCount === 1 ? '1 Ghoul' : `${ghoulCount} Ghouls`}
                        </span>
                      ) : (
                        <span
                          className={styles.badge}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-muted)',
                            fontSize: '0.74rem',
                          }}
                        >
                          Awaiting Census
                        </span>
                      )}

                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                        onClick={() => openEditor(kindred)}
                      >
                        <Icon name="edit_note" size={16} />{' '}
                        {isRecorded ? 'Edit Record' : 'Record Ghouls'}
                      </button>
                    </div>
                  </div>

                  {titlesList.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.35rem',
                        margin: '0.35rem 0',
                      }}
                    >
                      {titlesList.map((t, idx) => (
                        <span
                          key={idx}
                          className={styles.officeChip}
                          style={{ fontSize: '0.68rem', padding: '0.1rem 0.5rem' }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Notes content */}
                  <div
                    style={{
                      marginTop: '0.55rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    {entry && entry.notes ? (
                      <p
                        className={styles.itemBody}
                        style={{ margin: 0, fontSize: '0.88rem', color: '#e0e0e0' }}
                      >
                        {entry.notes}
                      </p>
                    ) : (
                      <span
                        className={styles.itemMeta}
                        style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}
                      >
                        No intelligence or notes recorded yet.
                      </span>
                    )}
                  </div>

                  {/* Attribution line */}
                  {entry && (
                    <div className={styles.itemMeta} style={{ marginTop: '0.45rem' }}>
                      Census recorded by {entry.updated_by_name || 'The Court'} (
                      {entry.updated_office || 'Harpy'}) on {fmtDate(entry.updated_at)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Editor Modal */}
      {activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={closeEditor}
        >
          <div
            className={styles.panel}
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.75rem',
              }}
            >
              <div>
                <h3 className={styles.panelTitle} style={{ margin: 0 }}>
                  <Icon name="assignment" /> Ghoul Census: {activeItem.name}
                </h3>
                <span className={styles.itemMeta}>
                  {activeItem.clan || 'Kindred'} ·{' '}
                  {activeItem.type === 'player' ? 'Player Character' : 'NPC'}
                </span>
              </div>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSmall}`}
                onClick={closeEditor}
                aria-label="Close dialog"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            {saveError && <div className={styles.error}>{saveError}</div>}

            <form onSubmit={handleSave}>
              <label className={styles.field}>
                <span>Reported Ghoul Count</span>
                <input
                  type="number"
                  min="0"
                  max="99"
                  className={styles.input}
                  value={editCount}
                  onChange={(e) => setEditCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Court Census Notes</span>
                <textarea
                  className={styles.input}
                  rows={6}
                  maxLength={10000}
                  placeholder="Record names, residences, occupations, or quirks reported to the Harpy..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </label>

              <div
                className={styles.itemMeta}
                style={{
                  marginBottom: '1.25rem',
                  lineHeight: '1.4',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '6px',
                }}
              >
                These notes are confidential court records for the Prince, Seneschal, and Harpy. Common players cannot view or alter this registry.
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    disabled={saving}
                  >
                    <Icon name="save" size={16} />{' '}
                    {saving ? 'Saving...' : 'Save Registry Entry'}
                  </button>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={closeEditor}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>

                {entryMap.has(`${activeItem.type}:${activeItem.id}`) && (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    <Icon name="delete" size={16} /> Clear Entry
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
