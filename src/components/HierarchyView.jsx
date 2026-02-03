import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from '../styles/Court.module.css';

export default function HierarchyView({ canEdit }) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const TITLES = ["Prince", "Seneschal", "Primogen", "Sheriff", "Harpy", "Assistant Harpy", "Hound", "Whip"];

  useEffect(() => {
    let isMounted = true;
    const fetchRoster = async () => {
      try {
        // Switch API path based on permission
        const path = canEdit ? '/admin/camarilla/roster' : '/camarilla/roster';
        const { data } = await api.get(path); 
        if (isMounted) setRoster(data.roster || []);
      } catch (e) {
        // Fallback if admin route fails
        if (e.response?.status === 403 && canEdit) {
            const { data } = await api.get('/camarilla/roster');
            if (isMounted) setRoster(data.roster || []);
        } else {
            console.error("Roster load error.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchRoster();
    return () => { isMounted = false; };
  }, [canEdit]);

  const update = async (id, type, field, value) => {
    if (!canEdit) return;
    const previousRoster = [...roster];

    setRoster(prev => prev.map(r => 
      (r.id === id && r.type === type) ? { ...r, [field]: value } : r
    ));

    try {
      await api.patch('/admin/camarilla/update', { id, type, field, value });
    } catch (e) {
      setRoster(previousRoster);
      alert("Update failed.");
    }
  };

  if (loading) return <div className={styles.loading}>Consulting the genealogy scrolls...</div>;

  const prince = roster.find(r => r.titles?.includes("Prince"));
  const council = roster.filter(r => 
    (r.titles?.includes("Seneschal") || r.titles?.includes("Sheriff")) && r.id !== prince?.id
  );
  const others = roster.filter(r => 
    r.id !== prince?.id && !council.some(c => c.id === r.id)
  );

  return (
    <div className={styles.hierarchyWrapper}>
      {prince && (
        <div className={styles.throneRoom}>
          <MemberCard ent={prince} specialClass={styles.princeCard} canEdit={canEdit} update={update} titles={TITLES} />
        </div>
      )}
      <div className={styles.councilRow}>
        {council.map(c => (
          <MemberCard key={`${c.type}-${c.id}`} ent={c} specialClass={styles.highRankCard} canEdit={canEdit} update={update} titles={TITLES} />
        ))}
      </div>
      <div className={styles.courtGrid}>
        {others.map(o => (
          <MemberCard key={`${o.type}-${o.id}`} ent={o} canEdit={canEdit} update={update} titles={TITLES} />
        ))}
      </div>
    </div>
  );
}

function MemberCard({ ent, specialClass = "", canEdit, update, titles }) {
  const toggleTitle = (title) => {
    const currentTitles = ent.titles || [];
    let newTitles;
    if (currentTitles.includes(title)) {
      newTitles = currentTitles.filter(t => t !== title);
    } else {
      newTitles = [...currentTitles, title];
    }
    update(ent.id, ent.type, 'titles', newTitles);
  };

  // Primary title for display next to name
  const primaryTitle = (ent.titles && ent.titles.length > 0) ? ent.titles[0] : null;

  return (
    <div className={`${styles.memberCard} ${specialClass}`}>
      <div className={styles.cardHeader}>
        <div className={styles.name}>
          {/* Always show the Honorific Title next to name */}
          {primaryTitle && <span className={styles.honorific}>{primaryTitle}</span>}
          {ent.name}
        </div>
        <div className={styles.clan}>{ent.clan}</div>
      </div>

      <div className={styles.cardBody}>
        {canEdit ? (
          /* --- ADMIN VIEW: Checkboxes for editing --- */
          <div className={styles.tagGrid}>
            {titles.map(t => (
              <label key={t} className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={(ent.titles || []).includes(t)}
                  onChange={() => toggleTitle(t)}
                />
                {t}
              </label>
            ))}
          </div>
        ) : (
          /* --- USER VIEW: Static Text Badges only --- */
          <div className={styles.displayTitles}>
            {(ent.titles || []).length > 0 ? (
              (ent.titles).map(t => (
                <span key={t} className={styles.titleTag}>{t}</span>
              ))
            ) : (
              <span className={styles.muted}>—</span>
            )}
          </div>
        )}
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.statusDisplay}>
          {"●".repeat(ent.status || 1)}{"○".repeat(5 - (ent.status || 1))}
        </div>
        
        {/* Status Slider is hidden for non-admins */}
        {canEdit && (
          <input 
            type="range" min="1" max="5" 
            value={ent.status || 1}
            onChange={(e) => update(ent.id, ent.type, 'status', parseInt(e.target.value))}
            className={styles.statusSlider}
            title="Adjust Status"
          />
        )}
      </div>
    </div>
  );
}