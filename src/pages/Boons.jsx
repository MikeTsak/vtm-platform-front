import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../api';
import { AuthCtx } from '../AuthContext';
import styles from '../styles/Boons.module.css';

// Form levels and statuses
const BOON_LEVELS = ['trivial', 'minor', 'major', 'life'];
const BOON_STATUSES = ['owed', 'paid', 'excused'];

/**
 * Main Boons Page Component
 */
export default function Boons() {
  const { user } = useContext(AuthCtx);
  const [boons, setBoons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Admin/Court state
  const [entities, setEntities] = useState([]); // Players + NPCs
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // The boon object being edited

  // Check user permissions
  const canManage = useMemo(() => {
    return user?.role === 'admin' || user?.role === 'courtuser';
  }, [user]);

  // Fetch all boons (all users)
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

  // Fetch entities (admin/court only)
  async function loadEntities() {
    if (!canManage) return;
    try {
      const { data } = await api.get('/boons/entities');
      setEntities(data.entities || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to fetch entities');
    }
  }

  useEffect(() => {
    loadBoons();
    loadEntities();
  }, [canManage]); // Reload entities if user permissions change

  // Handlers
  const handleSave = async () => {
    await loadBoons();
    setShowForm(false);
    setEditTarget(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this boon?')) return;
    try {
      await api.delete(`/boons/${id}`);
      await loadBoons(); // Refresh list
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to delete boon');
    }
  };

  const openEdit = (boon) => {
    setEditTarget(boon);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditTarget(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
  };

  return (
    <div className={styles.boonsPage}>
      <div className={styles.container}>


      

        {/* --- Dynamic Content --- */}
        <div className={styles.boonTracker}>
          <div className={styles.header}>
            <h2>Boon Registry</h2>
            {canManage && !showForm && (
              <button className={styles.btnPrimary} onClick={openCreate}>
                + Add Boon
              </button>
            )}
          </div>

          {error && <div className={styles.alertError}>{error}</div>}

          {/* Admin/Court Form */}
          {canManage && showForm && (
            <BoonForm
              entities={entities}
              boon={editTarget}
              onSave={handleSave}
              onCancel={closeForm}
            />
          )}

          {/* Boon List */}
          {loading && <div>Loading boons...</div>}
          {!loading && !boons.length && (
            <div className={styles.subtle}>No boons recorded in the registry.</div>
          )}
          <div className={styles.boonList}>
            {boons.map(boon => (
              <div key={boon.id} className={styles.boonCard}>
                <div className={styles.boonHeader}>
                  <span className={`${styles.badge} ${styles[boon.level]}`}>
                    {boon.level}
                  </span>
                  <span className={`${styles.badge} ${styles[boon.status]}`}>
                    {boon.status}
                  </span>
                  {canManage && (
                    <div className={styles.boonActions}>
                      <button onClick={() => openEdit(boon)}>Edit</button>
                      <button onClick={() => handleDelete(boon.id)}>Delete</button>
                    </div>
                  )}
                </div>
                <div className={styles.boonBody}>
                  <div className={styles.boonParty}>
                    <strong>From:</strong> {boon.from_name}
                  </div>
                  <div className={styles.boonParty}>
                    <strong>To:</strong> {boon.to_name}
                  </div>
                  <p className={styles.boonDesc}>
                    {boon.description || <em>No description.</em>}
                  </p>
                </div>
                <div className={styles.boonFooter}>
                  Recorded: {new Date(boon.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>


          <hr className={styles.divider} />
        
        {/* --- Static Content --- */}
        <div className={styles.staticContent}>
          <h2>Boon levels</h2>
          <p>Below are examples of a boon’s worth. However, boons are always on a case-by-case basis in value. A boon that is a minor boon from a neonate may be a major boon from a fledgling. The classification of boons depends on fulfillment ability, which can hinge on the power, the circumstance, or the difficulty for the granter. It can also be classified based on desperation as well, upping the ante for something they need immediately, also known as sweetening the deal. If an example is needed, a major boon for a neonate could be a trivial boon for a Prince.</p>

          <h3>Trivial boon</h3>
          <p>There is no risk or cost to the granter, these might nor even by tracked within a coterie.</p>
          <ul>
            <li>Helping to find blood for the night.</li>
            <li>Getting an invitation to an exclusive or popular nightclub.</li>
            <li>Making space in a haven.</li>
          </ul>

          <h3>Minor boon</h3>
          <p>There is an effort to this boon, going out of one’s way. They have some risks to them.</p>
          <ul>
            <li>Vote in favor of another but only if there is minimal social harm.</li>
            <li>Kill an unimportant human in the way.</li>
            <li>Providing refuge to someone in dire need such as sanctuary or sustenance.</li>
            <li>Providing access to ancient tomes.</li>
          </ul>

          <h3>Major boon</h3>
          <p>Not given lightly as the risk and expense can be so great.</p>
          <ul>
            <li>Granting rich hunting grounds to another.</li>
            <li>Revealing a major secret.</li>
            <li>Leveraging their own resources towards someone else's agenda.</li>
            <li>Changing one's expected vote in the council.</li>
          </ul>

          <h3>Life boon</h3>
          <p>Very rare and usually only given when Final Death or the death of a Touchstone is on the horizon.</p>
          <ul>
            <li>The desperate attempt to save own unlife</li>
            <li>The desperate attempt to save touchstone’s life</li>
            <li>Keeping a deadly secret</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Boon Creation/Edit Form
 */
function BoonForm({ entities, boon, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    from_id: '',
    from_name: '',
    to_id: '',
    to_name: '',
    level: 'trivial',
    status: 'owed',
    description: '',
  });
  const [error, setError] = useState('');

  // Entity list with "NPC" option
  const entityOptions = useMemo(() => {
    return [
      { id: 'npc', name: '--- NPC (Manual Entry) ---' },
      ...entities.map(e => ({
        id: `${e.type}-${e.id}`, // e.g., "player-12" or "npc-5"
        name: e.name,
      }))
    ];
  }, [entities]);

  // Load boon data when editing
  useEffect(() => {
    if (boon) {
      setFormData({
        from_id: boon.from_id || '',
        from_name: boon.from_name || '',
        to_id: boon.to_id || '',
        to_name: boon.to_name || '',
        level: boon.level || 'trivial',
        status: boon.status || 'owed',
        description: boon.description || '',
      });
    } else {
      // Reset for new form
      setFormData({
        from_id: '', from_name: '', to_id: '', to_name: '',
        level: 'trivial', status: 'owed', description: '',
      });
    }
  }, [boon]);

  // Handle entity dropdown changes
  const handleEntityChange = (e, fieldPrefix) => {
    const selectedValue = e.target.value;
    const selectedOption = entityOptions.find(opt => opt.id === selectedValue);

    if (selectedOption && selectedOption.id !== 'npc') {
      const [type, id] = selectedOption.id.split('-');
      setFormData(prev => ({
        ...prev,
        [`${fieldPrefix}_id`]: id,
        [`${fieldPrefix}_name`]: selectedOption.name.split(' (')[0], // Get name before " (NPC)" or " (Clan)"
      }));
    } else {
      // "NPC (Manual Entry)" selected
      setFormData(prev => ({
        ...prev,
        [`${fieldPrefix}_id`]: '',
        [`${fieldPrefix}_name`]: fieldPrefix === 'from' ? formData.from_name : formData.to_name, // Keep manual name if it exists
      }));
    }
  };

  // Handle manual name input
  const handleNameChange = (e, fieldPrefix) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      [`${fieldPrefix}_name`]: name,
      // Clear ID if they type manually
      [`${fieldPrefix}_id`]: '',
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate
    if (!formData.from_name || !formData.to_name) {
      setError('"From" and "To" names are required.');
      return;
    }
    
    const payload = { ...formData };
    // Ensure IDs are null, not empty strings
    payload.from_id = payload.from_id || null;
    payload.to_id = payload.to_id || null;
    
    try {
      if (boon) {
        // Update
        await api.patch(`/boons/${boon.id}`, payload);
      } else {
        // Create
        await api.post('/boons', payload);
      }
      onSave(); // Trigger refresh and close
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save boon');
    }
  };
  
  // Determine if manual name input should be shown
  const fromKey = formData.from_id ? `player-${formData.from_id}` : 'npc';
  const toKey = formData.to_id ? `player-${formData.to_id}` : 'npc';

  return (
    <form onSubmit={handleSubmit} className={styles.boonForm}>
      <h3>{boon ? 'Edit Boon' : 'Record New Boon'}</h3>
      {error && <div className={styles.alertError}>{error}</div>}
      
      <div className={styles.formGrid}>
        {/* --- FROM --- */}
        <label>From (Owes)</label>
        <div>
          <select
            value={fromKey}
            onChange={(e) => handleEntityChange(e, 'from')}
          >
            {entityOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
          {fromKey === 'npc' && (
            <input
              type="text"
              placeholder="Enter NPC Name..."
              value={formData.from_name}
              onChange={(e) => handleNameChange(e, 'from')}
              className={styles.manualInput}
            />
          )}
        </div>

        {/* --- TO --- */}
        <label>To (Holder)</label>
        <div>
          <select
            value={toKey}
            onChange={(e) => handleEntityChange(e, 'to')}
          >
            {entityOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
          {toKey === 'npc' && (
            <input
              type="text"
              placeholder="Enter NPC Name..."
              value={formData.to_name}
              onChange={(e) => handleNameChange(e, 'to')}
              className={styles.manualInput}
            />
          )}
        </div>

        {/* --- LEVEL & STATUS --- */}
        <label htmlFor="level">Level</label>
        <select id="level" name="level" value={formData.level} onChange={handleChange}>
          {BOON_LEVELS.map(lvl => (
            <option key={lvl} value={lvl}>{lvl.charAt(0).toUpperCase() + lvl.slice(1)}</option>
          ))}
        </select>
        
        <label htmlFor="status">Status</label>
        <select id="status" name="status" value={formData.status} onChange={handleChange}>
          {BOON_STATUSES.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* --- DESCRIPTION --- */}
      <label htmlFor="description">Description</label>
      <textarea
        id="description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        rows={3}
        placeholder="Details of the boon..."
      />
      
      <div className={styles.formActions}>
        <button type="submit" className={styles.btnPrimary}>Save Boon</button>
        <button type="button" className={styles.btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}