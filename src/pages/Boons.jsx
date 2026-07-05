// src/pages/Boons.jsx
import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import api from '../core/api';
import { AuthCtx } from '../core/AuthContext';
import styles from '../styles/Boons.module.css';
import { Skeleton } from 'boneyard-js/react';
import MiniSearch from 'minisearch';

const BOON_LEVELS  = ['trivial', 'minor', 'major', 'life'];
const BOON_STATUSES = ['owed', 'paid', 'excused'];

const LEVEL_LABELS = { trivial: 'Trivial', minor: 'Minor', major: 'Major', life: 'Life' };
const STATUS_LABELS = { owed: 'Active', paid: 'Paid', excused: 'Excused' };

/* ── Relative date ──────────────────────────── */
function relDate(ts) {
  if (!ts) return '';
  const d    = new Date(ts);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 30)  return `${diff}d ago`;
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ── Legend data ────────────────────────────── */
const LEGEND = [
  {
    level: 'trivial', title: 'Trivial',
    body: 'No real risk or cost to the granter. May not even be tracked within a coterie.',
    examples: ['Helping find blood for the night', 'Getting an invitation to an exclusive club', 'Making space in a haven'],
  },
  {
    level: 'minor', title: 'Minor',
    body: 'Requires effort, going out of one\'s way. Carries some risk.',
    examples: ['Voting in favour of another (if minimal harm)', 'Killing an unimportant mortal', 'Providing refuge or sustenance', 'Access to ancient tomes'],
  },
  {
    level: 'major', title: 'Major',
    body: 'Not given lightly — risk and expense can be considerable.',
    examples: ['Granting rich hunting grounds', 'Revealing a major secret', 'Leveraging resources for another\'s agenda', 'Changing one\'s vote in council'],
  },
  {
    level: 'life', title: 'Life',
    body: 'Very rare. Given only when Final Death or a Touchstone is on the horizon.',
    examples: ['A desperate attempt to save own unlife', 'Saving a Touchstone\'s life', 'Keeping a deadly secret indefinitely'],
  },
];

export default function Boons() {
  const { user } = useContext(AuthCtx);
  const [boons, setBoons]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [myCharacter, setMyCharacter] = useState(null);
  const [entities, setEntities]       = useState([]);
  const [showForm, setShowForm]       = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  
  // Filters & Search
  const [sortMode, setSortMode]       = useState('date');
  const [filterActive, setFilterActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [legendOpen, setLegendOpen]   = useState(false);
  const searchRef = useRef(null);

  const isAdmin  = user?.role === 'admin' || user?.permission_level === 'admin';
  const isCourt  = user?.role === 'courtuser';
  const canManage = isAdmin || isCourt;

  async function loadBoons() {
    try {
      setLoading(true); setError('');
      const { data } = await api.get('/boons');
      setBoons(data.boons || []);
    } catch (e) { setError(e.response?.data?.error || 'Failed to fetch boons'); }
    finally { setLoading(false); }
  }

  async function loadEntities() {
    if (!canManage) return;
    try { const { data } = await api.get('/boons/entities'); setEntities(data.entities || []); }
    catch (e) { console.error('Failed to load entities', e); }
  }

  async function loadMyCharacter() {
    try { const { data } = await api.get('/characters/me'); setMyCharacter(data.character || null); }
    catch (e) { console.warn('No character found'); }
  }

  useEffect(() => {
    loadBoons(); loadMyCharacter(); loadEntities();
  }, [canManage]);

  // Click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Extract unique names for Autocomplete
  const uniqueNames = useMemo(() => {
    const names = new Set();
    boons.forEach(b => {
      if (b.from_name) names.add(b.from_name.trim());
      if (b.to_name) names.add(b.to_name.trim());
    });
    return Array.from(names).sort();
  }, [boons]);

  const filteredNames = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.trim();
    const mapped = uniqueNames.map((name, i) => ({ id: i, name }));
    const ms = new MiniSearch({ fields: ['name'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
    ms.addAll(mapped);
    const results = ms.search(q);
    return results.map(r => mapped[r.id].name).slice(0, 8);
  }, [searchQuery, uniqueNames]);

  const processedBoons = useMemo(() => {
    let result = [...boons];
    
    // Ownership Filter
    if (filterActive && user) {
      if (isAdmin) {
        const npcNames = entities.filter(e => e.type === 'npc')
          .map(e => e.name.toLowerCase().replace(' (npc)', '').trim());
        result = result.filter(b => {
          const from = (b.from_name || '').toLowerCase();
          const to   = (b.to_name   || '').toLowerCase();
          return npcNames.some(n => from.includes(n) || to.includes(n));
        });
      } else {
        const myNames = [];
        if (user.display_name)  myNames.push(user.display_name.toLowerCase());
        if (myCharacter?.name)  myNames.push(myCharacter.name.toLowerCase());
        result = result.filter(b => {
          const from = (b.from_name || '').toLowerCase();
          const to   = (b.to_name   || '').toLowerCase();
          return myNames.some(n => from.includes(n) || to.includes(n));
        });
      }
    }

    // Search Query Filter
    if (searchQuery) {
      const sq = searchQuery.trim();
      const ms = new MiniSearch({ fields: ['from_name', 'to_name', 'description'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
      ms.addAll(result);
      const results = ms.search(sq);
      const idSet = new Set(results.map(r => r.id));
      result = result.filter(b => idSet.has(b.id));
    }

    

    // Sorting
    const levelRank  = { life: 4, major: 3, minor: 2, trivial: 1 };
    const statusRank = { owed: 1, paid: 2, excused: 3 };
    switch (sortMode) {
      case 'level':
        result.sort((a, b) => (levelRank[b.level] || 0) - (levelRank[a.level] || 0) || new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'status':
        result.sort((a, b) => (statusRank[a.status] || 0) - (statusRank[b.status] || 0) || new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'from':
        result.sort((a, b) => (a.from_name || '').localeCompare(b.from_name || ''));
        break;
      case 'to':
        result.sort((a, b) => (a.to_name || '').localeCompare(b.to_name || ''));
        break;
      default:
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return result;
  }, [boons, sortMode, filterActive, user, myCharacter, isAdmin, entities, searchQuery]);

/* ── Stats updated dynamically (case-insensitive) ── */
  const stats = useMemo(() => ({
    total:   processedBoons.length,
    active:  processedBoons.filter(b => String(b.status).toLowerCase() === 'owed').length,
    life:    processedBoons.filter(b => String(b.level).toLowerCase()  === 'life'  && String(b.status).toLowerCase() === 'owed').length,
    major:   processedBoons.filter(b => String(b.level).toLowerCase()  === 'major' && String(b.status).toLowerCase() === 'owed').length,
  }), [processedBoons]);

  const handleSave   = async () => { await loadBoons(); setShowForm(false); setEditTarget(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try { await api.delete(`/boons/${id}`); await loadBoons(); }
    catch (e) { setError(e.response?.data?.error || 'Failed to delete'); }
  };
  const openEdit   = (b) => { setEditTarget(b); setShowForm(true); };
  const openCreate = ()  => { setEditTarget(null); setShowForm(true); };
  const closeForm  = ()  => { setShowForm(false); setEditTarget(null); };

  const filterLabel = isAdmin
    ? (filterActive ? 'All boons' : 'NPC records')
    : (filterActive ? 'All boons' : 'My boons');

  return (
    <div className={styles.page}>

      {/* ── Slide-in form sheet ── */}
      {showForm && canManage && (
        <div className={styles.sheetBackdrop} onClick={closeForm}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <BoonForm entities={entities} boon={editTarget} onSave={handleSave} onCancel={closeForm} />
          </div>
        </div>
      )}

      <Skeleton loading={loading} name="boons-page">
        <div className={styles.container}>

        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Blood Registry</h1>
            <p className={styles.pageSubtitle}>Debts of honour recorded before the gathered Kindred.</p>
          </div>
          {canManage && (
            <button className={styles.btnPrimary} onClick={openCreate}>
              + Record boon
            </button>
          )}
        </div>

        {error && <div className={styles.alertError}>{error}</div>}

        {/* ── Stats bar (Now visually clean and formatted) ── */}
        {!loading && (
          <div className={styles.statsBar}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.total}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={`${styles.statValue} ${styles.statActive}`}>{stats.active}</span>
              <span className={styles.statLabel}>Active</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={`${styles.statValue} ${styles.statMajor}`}>{stats.major}</span>
              <span className={styles.statLabel}>Major Owed</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={`${styles.statValue} ${styles.statLife}`}>{stats.life}</span>
              <span className={styles.statLabel}>Life Owed</span>
            </div>
          </div>
        )}

        {/* ── Toolbar & Search ── */}
        <div className={styles.toolbar}>
          
          <div className={styles.searchWrap} ref={searchRef}>
            <span className={styles.searchIcon}>🔍</span>
            <input 
              type="text" 
              className={styles.searchInput}
              placeholder="Search by Kindred name or circumstance..." 
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && filteredNames.length > 0 && (
              <div className={styles.suggestions}>
                {filteredNames.map(name => (
                  <div 
                    key={name} 
                    className={styles.suggestionItem}
                    onClick={() => {
                      setSearchQuery(name);
                      setShowSuggestions(false);
                    }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.toolbarRight}>
            <button
              className={`${styles.filterChip} ${filterActive ? styles.filterChipActive : ''}`}
              onClick={() => setFilterActive(f => !f)}
            >
              {filterActive ? '✕ ' : ''}{filterLabel}
            </button>
            <select className={styles.sortSelect} value={sortMode} onChange={e => setSortMode(e.target.value)}>
              <option value="date">Newest first</option>
              <option value="level">Highest value</option>
              <option value="status">Active first</option>
              <option value="from">Debtor A–Z</option>
              <option value="to">Creditor A–Z</option>
            </select>
          </div>
        </div>

        {/* ── Boon list ── */}
        {!loading && processedBoons.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>⚖️</span>
            <p className={styles.emptyText}>
              {searchQuery 
                ? 'No boons match your search criteria.'
                : filterActive
                  ? (isAdmin ? 'No NPC records found.' : 'No personal boons on record.')
                  : 'No debts recorded in the registry.'}
            </p>
          </div>
        )}

        {!loading && processedBoons.length > 0 && (
          <div className={styles.boonList}>
            {processedBoons.map(boon => {
              const settled = boon.status === 'paid' || boon.status === 'excused';
              return (
                <div
                  key={boon.id}
                  className={`${styles.boonCard} ${styles[`level_${boon.level}`]} ${settled ? styles.settled : ''}`}
                >
                  {/* Level stripe */}
                  <span className={styles.levelStripe} />

                  <div className={styles.cardInner}>
                    {/* Top row: badges + actions */}
                    <div className={styles.cardTopRow}>
                      <span className={`${styles.levelBadge} ${styles[`lvBadge_${String(boon.level).toLowerCase()}`]}`}>
                        {LEVEL_LABELS[String(boon.level).toLowerCase()] || boon.level}
                      </span>
                      <span className={`${styles.statusBadge} ${styles[`stBadge_${String(boon.status).toLowerCase()}`]}`}>
                        {STATUS_LABELS[String(boon.status).toLowerCase()] || boon.status}
                      </span>
                      <span className={styles.cardDate}>{relDate(boon.created_at)}</span>
                      {canManage && (
                        <div className={styles.cardActions}>
                          <button className={styles.actionBtn} onClick={() => openEdit(boon)} title="Edit">✎</button>
                          <button className={`${styles.actionBtn} ${styles.actionBtnDelete}`} onClick={() => handleDelete(boon.id)} title="Delete">✕</button>
                        </div>
                      )}
                    </div>

                    {/* Transaction: FROM → TO */}
                    <div className={styles.transaction}>
                      <div className={styles.party}>
                        <span className={styles.partyRole}>Owes</span>
                        <span className={styles.partyName}>{boon.from_name}</span>
                      </div>
                      <span className={styles.transArrow}>⇢</span>
                      <div className={`${styles.party} ${styles.partyRight}`}>
                        <span className={styles.partyRole}>Holds</span>
                        <span className={styles.partyName}>{boon.to_name}</span>
                      </div>
                    </div>

                    {/* Description */}
                    {boon.description && (
                      <p className={styles.cardDesc}>{boon.description}</p>
                    )}
                  </div>

                  {/* Settled watermark */}
                  {settled && (
                    <div className={styles.settledMark}>{boon.status.toUpperCase()}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Legend (collapsible) ── */}
        <div className={styles.legendWrap}>
          <button className={styles.legendToggle} onClick={() => setLegendOpen(o => !o)}>
            <span>Boon levels explained</span>
            <span className={`${styles.legendChevron} ${legendOpen ? styles.legendChevronOpen : ''}`}>▾</span>
          </button>
          {legendOpen && (
            <div className={styles.legendGrid}>
              {LEGEND.map(item => (
                <div key={item.level} className={`${styles.legendCard} ${styles[`legendCard_${item.level}`]}`}>
                  <h4 className={`${styles.legendTitle} ${styles[`legendTitle_${item.level}`]}`}>{item.title}</h4>
                  <p className={styles.legendBody}>{item.body}</p>
                  <ul className={styles.legendList}>
                    {item.examples.map((ex, i) => <li key={i}>{ex}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      </Skeleton>
    </div>
  );
}

/* ══════════════════════════════════════════════
   BOON FORM
══════════════════════════════════════════════ */
function BoonForm({ entities, boon, onSave, onCancel }) {
  const [prevBoon, setPrevBoon] = useState(boon);
  const [formData, setFormData] = useState({
    from_key: 'npc', from_id: '', from_name: '',
    to_key:   'npc', to_id:   '', to_name: '',
    level: 'trivial', status: 'owed', description: '',
  });
  const [error, setError] = useState('');

  const entityOptions = useMemo(() => [
    { id: 'npc', name: '— NPC / Manual entry —' },
    ...entities.map(e => ({ id: `${e.type}-${e.id}`, name: e.name })),
  ], [entities]);

  const deriveKey = (id, name) => {
    if (!id) return 'npc';
    const byId = entities.find(e => String(e.id) === String(id));
    if (byId) return `${byId.type}-${byId.id}`;
    const base  = (name || '').split(' (')[0].trim();
    const byName = entities.find(e => (e.name || '').split(' (')[0].trim() === base);
    return byName ? `${byName.type}-${byName.id}` : 'npc';
  };

  // ✅ Inline prop comparison replaces useEffect to prevent double-rendering stale UI
  if (boon !== prevBoon) {
    setPrevBoon(boon);
    if (boon) {
      setFormData({
        from_key: deriveKey(boon.from_id, boon.from_name), from_id: boon.from_id || '', from_name: boon.from_name || '',
        to_key:   deriveKey(boon.to_id,   boon.to_name),   to_id:   boon.to_id   || '', to_name:   boon.to_name   || '',
        level: boon.level || 'trivial', status: boon.status || 'owed', description: boon.description || '',
      });
    } else {
      setFormData({ from_key: 'npc', from_id: '', from_name: '', to_key: 'npc', to_id: '', to_name: '', level: 'trivial', status: 'owed', description: '' });
    }
  }

  const handleEntityChange = (e, prefix) => {
    const val = e.target.value;
    const opt = entityOptions.find(o => o.id === val);
    if (!opt) return;
    if (opt.id === 'npc') {
      setFormData(p => ({ ...p, [`${prefix}_key`]: 'npc', [`${prefix}_id`]: '' }));
      return;
    }
    const id = opt.id.split('-')[1];
    setFormData(p => ({ ...p, [`${prefix}_key`]: opt.id, [`${prefix}_id`]: id, [`${prefix}_name`]: opt.name.split(' (')[0] }));
  };

  const handleNameChange = (e, prefix) =>
    setFormData(p => ({ ...p, [`${prefix}_name`]: e.target.value, [`${prefix}_id`]: '', [`${prefix}_key`]: 'npc' }));

  const handleChange = e =>
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!formData.from_name || !formData.to_name) { setError('"From" and "To" names are required.'); return; }
    const payload = {
      from_id: formData.from_id || null, from_name: formData.from_name,
      to_id:   formData.to_id   || null, to_name:   formData.to_name,
      level: formData.level, status: formData.status, description: formData.description,
    };
    try {
      if (boon) await api.patch(`/boons/${boon.id}`, payload);
      else      await api.post('/boons', payload);
      onSave();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save boon'); }
  };

  return (
    <div className={styles.formWrap}>
      <div className={styles.formHeader}>
        <h3 className={styles.formTitle}>{boon ? 'Edit record' : 'Record new boon'}</h3>
        <button className={styles.formClose} onClick={onCancel}>✕</button>
      </div>

      {error && <div className={styles.alertError}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formSection}>
          <label className={styles.formLabel}>Debtor <span className={styles.formLabelSub}>(owes the boon)</span></label>
          <select className={styles.formSelect} value={formData.from_key} onChange={e => handleEntityChange(e, 'from')}>
            {entityOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          {formData.from_key === 'npc' && (
            <input className={styles.formInput} type="text" placeholder="Enter name…" value={formData.from_name} onChange={e => handleNameChange(e, 'from')} />
          )}
        </div>

        <div className={styles.formSection}>
          <label className={styles.formLabel}>Creditor <span className={styles.formLabelSub}>(holds the boon)</span></label>
          <select className={styles.formSelect} value={formData.to_key} onChange={e => handleEntityChange(e, 'to')}>
            {entityOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          {formData.to_key === 'npc' && (
            <input className={styles.formInput} type="text" placeholder="Enter name…" value={formData.to_name} onChange={e => handleNameChange(e, 'to')} />
          )}
        </div>

        <div className={styles.formRow}>
          <div className={styles.formSection}>
            <label className={styles.formLabel} htmlFor="level">Level</label>
            <select className={styles.formSelect} id="level" name="level" value={formData.level} onChange={handleChange}>
              {BOON_LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
            </select>
          </div>
          <div className={styles.formSection}>
            <label className={styles.formLabel} htmlFor="status">Status</label>
            <select className={styles.formSelect} id="status" name="status" value={formData.status} onChange={handleChange}>
              {BOON_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.formSection}>
          <label className={styles.formLabel} htmlFor="description">Description</label>
          <textarea className={styles.formTextarea} id="description" name="description" value={formData.description} onChange={handleChange} rows={4} placeholder="Circumstances of the boon…" />
        </div>

        <div className={styles.formFooter}>
          <button type="submit" className={styles.btnPrimary}>Save record</button>
          <button type="button" className={styles.btnGhost} onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}