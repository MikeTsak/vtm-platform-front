import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../api';
import { AuthCtx } from '../AuthContext';
import styles from '../styles/Boons.module.css';

// Form levels and statuses
const BOON_LEVELS = ['trivial', 'minor', 'major', 'life'];
const BOON_STATUSES = ['owed', 'paid', 'excused'];

export default function Boons() {
  const { user } = useContext(AuthCtx);
  const [boons, setBoons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Store the current user's character for filtering "Mine"
  const [myCharacter, setMyCharacter] = useState(null);

  // Admin/Court state
  const [entities, setEntities] = useState([]); 
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // Sorting & Filtering State
  const [sortMode, setSortMode] = useState('date'); 
  const [filterActive, setFilterActive] = useState(false); // Renamed for clarity

  // Permissions
  const isAdmin = user?.role === 'admin' || user?.permission_level === 'admin';
  const isCourt = user?.role === 'courtuser';
  const canManage = isAdmin || isCourt;

  // Load Boons
  async function loadBoons() {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/boons');
      setBoons(data.boons || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to fetch boons');
    } finally {
      setLoading(false);
    }
  }

  // Load Admin Entities (Players + NPCs) - Needed for identifying NPCs
  async function loadEntities() {
    if (!canManage) return;
    try {
      const { data } = await api.get('/boons/entities');
      setEntities(data.entities || []);
    } catch (e) {
      console.error("Failed to load entities", e);
    }
  }

  // Load My Character (To know "My" name)
  async function loadMyCharacter() {
    try {
      const { data } = await api.get('/characters/me');
      setMyCharacter(data.character || null);
    } catch (e) {
      console.warn("No character found for user or fetch failed");
    }
  }

  useEffect(() => {
    loadBoons();
    loadMyCharacter();
    loadEntities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  // --- Sorting & Filtering Logic ---
  const processedBoons = useMemo(() => {
    let result = [...boons];

    // 1. Filter Logic
    if (filterActive && user) {
      
      if (isAdmin) {
        // --- ADMIN: Show ONLY NPC records ---
        // We identify NPCs by checking against the loaded 'entities' list where type='npc'
        const npcNames = entities
          .filter(e => e.type === 'npc')
          .map(e => e.name.toLowerCase().replace(' (npc)', '').trim());

        result = result.filter(b => {
          const from = (b.from_name || '').toLowerCase();
          const to = (b.to_name || '').toLowerCase();
          
          // Match if From or To is a known NPC
          const isNpcInvolved = npcNames.some(n => from.includes(n) || to.includes(n));
          
          // Also include Manual entries (usually implied NPCs)
          // We assume it's manual if IDs are missing (if DB supported IDs) or just rely on the name check above.
          // Since DB ids are gone, we rely heavily on the name match.
          // Note: If you want to see *everything not player*, you'd need the player list to exclude them.
          // For now, matching explicit NPC names is safest.
          return isNpcInvolved; 
        });

      } else {
        // --- COURT & USER: Show ONLY "Mine" ---
        // Matches User Display Name OR Character Name
        const myNames = [];
        if (user.display_name) myNames.push(user.display_name.toLowerCase());
        if (myCharacter?.name) myNames.push(myCharacter.name.toLowerCase());

        result = result.filter(b => {
          const from = (b.from_name || '').toLowerCase();
          const to = (b.to_name || '').toLowerCase();
          return myNames.some(name => from.includes(name) || to.includes(name));
        });
      }
    }

    // 2. Sorting
    const levelRank = { life: 4, major: 3, minor: 2, trivial: 1 };
    const statusRank = { owed: 1, paid: 2, excused: 3 };

    switch (sortMode) {
      case 'level':
        result.sort((a, b) => {
          const rankA = levelRank[a.level] || 0;
          const rankB = levelRank[b.level] || 0;
          if (rankA !== rankB) return rankB - rankA; 
          return new Date(b.created_at) - new Date(a.created_at);
        });
        break;
      case 'status':
        result.sort((a, b) => {
          const rankA = statusRank[a.status] || 0;
          const rankB = statusRank[b.status] || 0;
          if (rankA !== rankB) return rankA - rankB; 
          return new Date(b.created_at) - new Date(a.created_at);
        });
        break;
      case 'from':
        result.sort((a, b) => (a.from_name || '').localeCompare(b.from_name || ''));
        break;
      case 'to':
        result.sort((a, b) => (a.to_name || '').localeCompare(b.to_name || ''));
        break;
      case 'date':
      default:
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }
    return result;
  }, [boons, sortMode, filterActive, user, myCharacter, isAdmin, entities]);

  // Handlers
  const handleSave = async () => { await loadBoons(); setShowForm(false); setEditTarget(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try { await api.delete(`/boons/${id}`); await loadBoons(); } 
    catch (e) { setError(e.response?.data?.error || 'Failed to delete'); }
  };
  const openEdit = (b) => { setEditTarget(b); setShowForm(true); };
  const openCreate = () => { setEditTarget(null); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };

  // Dynamic Button Label
  const getFilterLabel = () => {
    if (isAdmin) return filterActive ? "Showing NPCs" : "Show NPCs";
    return filterActive ? "Showing My Boons" : "Show Only Mine";
  };

  return (
    <div className={styles.boonsPage}>
      <div className={styles.container}>
        
        {/* --- Header --- */}
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h2>Boon Registry</h2>
            <p className={styles.subtitle}>Track debts, favors, and life owed.</p>
          </div>
          
          <div className={styles.controls}>
            {/* Filter Toggle */}
            <button 
              className={filterActive ? styles.btnToggleActive : styles.btnToggle}
              onClick={() => setFilterActive(!filterActive)}
            >
              {getFilterLabel()}
            </button>

            <select className={styles.sortSelect} value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
              <option value="date">Sort: Date (Newest)</option>
              <option value="level">Sort: Value (High to Low)</option>
              <option value="status">Sort: Status (Active First)</option>
              <option value="from">Sort: Debtor (From)</option>
              <option value="to">Sort: Creditor (To)</option>
            </select>
            
            {canManage && !showForm && (
              <button className={styles.btnPrimary} onClick={openCreate}>+ Add Record</button>
            )}
          </div>
        </div>

        {error && <div className={styles.alertError}>{error}</div>}

        {/* --- Form (Admin/Court) --- */}
        {canManage && showForm && (
          <BoonForm entities={entities} boon={editTarget} onSave={handleSave} onCancel={closeForm} />
        )}

        {/* --- GRID --- */}
        {loading && <div className={styles.loading}>Accessing Registry...</div>}
        
        {!loading && !processedBoons.length && (
           <div className={styles.subtle}>
             {filterActive 
                ? (isAdmin ? "No NPC records found." : "No personal records found.") 
                : "No debts recorded in the registry."}
           </div>
        )}
        
        <div className={styles.boonList}>
          {processedBoons.map(boon => {
            const levelClass = styles[`level-${boon.level}`];
            const statusClass = styles[`status-${boon.status}`];

            return (
              <div key={boon.id} className={`${styles.boonCard} ${levelClass} ${statusClass}`}>
                
                <div className={styles.colorStripe}></div>

                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                     <span className={styles.badgeLevel}>{boon.level}</span>
                     <span className={styles.badgeStatus}>{boon.status}</span>
                     {canManage && (
                       <div className={styles.adminActions}>
                         <button onClick={() => openEdit(boon)} title="Edit">✎</button>
                         <button onClick={() => handleDelete(boon.id)} title="Delete">✕</button>
                       </div>
                     )}
                  </div>

                  <div className={styles.namesContainer}>
                    <div className={styles.nameBlock}>
                      <span className={styles.label}>Owed By</span>
                      <span className={styles.name} title={boon.from_name}>{boon.from_name}</span>
                    </div>
                    <div className={styles.arrow}>➜</div>
                    <div className={styles.nameBlock}>
                      <span className={styles.label}>Owed To</span>
                      <span className={styles.name} title={boon.to_name}>{boon.to_name}</span>
                    </div>
                  </div>

                  <div className={styles.description}>
                    {boon.description || "No details provided."}
                  </div>

                  <div className={styles.timestamp}>
                    {new Date(boon.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>

                {(boon.status === 'paid' || boon.status === 'excused') && (
                  <div className={styles.watermark}>{boon.status.toUpperCase()}</div>
                )}
              </div>
            );
          })}
        </div>
        
        <hr className={styles.divider} />

        {/* --- Legend --- */}
        <div className={styles.staticContent}>
          <h2>Boon Levels & Expectations</h2>
          <p>Below are examples of a boon’s worth. However, boons are always on a case-by-case basis...</p>

          <div className={styles.staticGrid}>
            <div className={styles.staticCard}>
              <h3 style={{ color: 'var(--c-trivial)' }}>Trivial Boon</h3>
              <p>There is no risk or cost to the granter. These might not even be tracked within a coterie.</p>
              <ul>
                <li>Helping to find blood for the night.</li>
                <li>Getting an invitation to an exclusive nightclub.</li>
                <li>Making space in a haven.</li>
              </ul>
            </div>

            <div className={styles.staticCard}>
              <h3 style={{ color: 'var(--c-minor)' }}>Minor Boon</h3>
              <p>There is an effort to this boon, going out of one’s way. They have some risks to them.</p>
              <ul>
                <li>Vote in favor of another (if minimal social harm).</li>
                <li>Kill an unimportant human in the way.</li>
                <li>Providing refuge/sustenance to someone in need.</li>
                <li>Providing access to ancient tomes.</li>
              </ul>
            </div>

            <div className={styles.staticCard}>
              <h3 style={{ color: 'var(--c-major)' }}>Major Boon</h3>
              <p>Not given lightly as the risk and expense can be so great.</p>
              <ul>
                <li>Granting rich hunting grounds to another.</li>
                <li>Revealing a major secret.</li>
                <li>Leveraging own resources towards another's agenda.</li>
                <li>Changing one's expected vote in the council.</li>
              </ul>
            </div>

            <div className={styles.staticCard}>
              <h3 style={{ color: 'var(--c-life)' }}>Life Boon</h3>
              <p>Very rare. Usually only given when Final Death or the death of a Touchstone is on the horizon.</p>
              <ul>
                <li>The desperate attempt to save own unlife.</li>
                <li>The desperate attempt to save a Touchstone’s life.</li>
                <li>Keeping a deadly secret.</li>
              </ul>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}

function BoonForm({ entities, boon, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    from_key: 'npc', from_id: '', from_name: '',
    to_key: 'npc', to_id: '', to_name: '',
    level: 'trivial', status: 'owed', description: '',
  });
  const [error, setError] = useState('');

  const entityOptions = useMemo(() => {
    return [
      { id: 'npc', name: '--- NPC (Manual Entry) ---' },
      ...entities.map(e => ({ id: `${e.type}-${e.id}`, name: e.name }))
    ];
  }, [entities]);

  const deriveKeyFromExisting = (id, name) => {
    if (!id) return 'npc';
    const match = entities.find(e => String(e.id) === String(id));
    if (match) return `${match.type}-${match.id}`;
    const baseName = (name || '').split(' (')[0].trim();
    const byName = entities.find(e => (e.name || '').split(' (')[0].trim() === baseName);
    return byName ? `${byName.type}-${byName.id}` : 'npc';
  };

  useEffect(() => {
    if (boon) {
      const fk = deriveKeyFromExisting(boon.from_id, boon.from_name);
      const tk = deriveKeyFromExisting(boon.to_id, boon.to_name);
      setFormData({
        from_key: fk, from_id: boon.from_id || '', from_name: boon.from_name || '',
        to_key: tk, to_id: boon.to_id || '', to_name: boon.to_name || '',
        level: boon.level || 'trivial', status: boon.status || 'owed',
        description: boon.description || '',
      });
    } else {
      setFormData({
        from_key: 'npc', from_id: '', from_name: '',
        to_key: 'npc', to_id: '', to_name: '',
        level: 'trivial', status: 'owed', description: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boon, entities]);

  const handleEntityChange = (e, fieldPrefix) => {
    const selectedValue = e.target.value;
    const selectedOption = entityOptions.find(opt => opt.id === selectedValue);
    if (!selectedOption) return;
    if (selectedOption.id === 'npc') {
      setFormData(prev => ({ ...prev, [`${fieldPrefix}_key`]: 'npc', [`${fieldPrefix}_id`]: '' }));
      return;
    }
    // eslint-disable-next-line no-unused-vars
    const [type] = selectedOption.id.split('-');
    const id = selectedOption.id.split('-')[1];
    const cleanName = selectedOption.name.split(' (')[0];
    setFormData(prev => ({
      ...prev, [`${fieldPrefix}_key`]: selectedOption.id, [`${fieldPrefix}_id`]: id, [`${fieldPrefix}_name`]: cleanName,
    }));
  };

  const handleNameChange = (e, fieldPrefix) => {
    const name = e.target.value;
    setFormData(prev => ({ ...prev, [`${fieldPrefix}_name`]: name, [`${fieldPrefix}_id`]: '', [`${fieldPrefix}_key`]: 'npc' }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.from_name || !formData.to_name) { setError('"From" and "To" names are required.'); return; }
    
    const payload = {
      from_id: formData.from_id || null, from_name: formData.from_name,
      to_id: formData.to_id || null, to_name: formData.to_name,
      level: formData.level, status: formData.status, description: formData.description,
    };
    try {
      if (boon) await api.patch(`/boons/${boon.id}`, payload);
      else await api.post('/boons', payload);
      onSave();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save boon'); }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.boonForm}>
      <h3>{boon ? 'Edit Boon' : 'Record New Boon'}</h3>
      {error && <div className={styles.alertError}>{error}</div>}
      <div className={styles.formGrid}>
        <label>From (Owes)</label>
        <div>
          <select value={formData.from_key} onChange={(e) => handleEntityChange(e, 'from')}>
            {entityOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
          </select>
          {formData.from_key === 'npc' && (
            <input type="text" placeholder="Enter NPC Name..." value={formData.from_name} onChange={(e) => handleNameChange(e, 'from')} className={styles.manualInput} />
          )}
        </div>
        <label>To (Holder)</label>
        <div>
          <select value={formData.to_key} onChange={(e) => handleEntityChange(e, 'to')}>
            {entityOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
          </select>
          {formData.to_key === 'npc' && (
            <input type="text" placeholder="Enter NPC Name..." value={formData.to_name} onChange={(e) => handleNameChange(e, 'to')} className={styles.manualInput} />
          )}
        </div>
        <label htmlFor="level">Level</label>
        <select id="level" name="level" value={formData.level} onChange={handleChange}>
          {BOON_LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl.charAt(0).toUpperCase() + lvl.slice(1)}</option>)}
        </select>
        <label htmlFor="status">Status</label>
        <select id="status" name="status" value={formData.status} onChange={handleChange}>
          {BOON_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>
      <label htmlFor="description">Description</label>
      <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} placeholder="Details of the boon..." />
      <div className={styles.formActions}>
        <button type="submit" className={styles.btnPrimary}>Save Boon</button>
        <button type="button" className={styles.btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}