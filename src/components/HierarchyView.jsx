import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from '../styles/Court.module.css';
import Loading from './Loading';

/* --- Clan assets logic (Matches ChatSystem & Home) --- */
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim', 'Thin-blood': 'Thinblood' };
const symlogo = (c) =>
  (c ? `/img/clans/330px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g, '_')}_symbol.png` : '');

// --- URL BUILDER HELPER ---
const buildImageUrl = (val) => {
  if (!val) return null;
  const trimmed = val.trim();
  if (trimmed.startsWith('http')) return trimmed;
  const cleanName = trimmed.replace(/\.jpg$/i, '');
  return `https://portal.attlarp.gr/images.court/${encodeURIComponent(cleanName)}.jpg`;
};

export default function HierarchyView({ canEdit }) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(canEdit); // <-- Added local toggle state
  
  const TITLES = ["Prince", "Seneschal", "Primogen", "Sheriff", "Harpy", "Assistant Harpy", "Hound", "Whip"];

  // Keep local edit state in sync if the parent prop changes
  useEffect(() => {
    setIsEditMode(canEdit);
  }, [canEdit]);

  useEffect(() => {
    let isMounted = true;
    const fetchRoster = async () => {
      try {
        const path = canEdit ? '/admin/camarilla/roster' : '/camarilla/roster';
        const { data } = await api.get(path); 
        if (isMounted) setRoster(data.roster || []);
      } catch (e) {
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
    if (!canEdit) return; // Always check actual permissions here
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

  if (loading) return <Loading />;

  // Separate the dead from the living
  const deceased = roster
    .filter(r => r.is_deceased)
    .sort((a, b) => (b.status || 0) - (a.status || 0));

  const alive = roster.filter(r => !r.is_deceased);

  // Ex-members shouldn't occupy the active throne/council seats
  const prince = alive.find(r => r.titles?.includes("Prince") && !r.is_ex);
  
  const council = alive
    .filter(r => (r.titles?.includes("Seneschal") || r.titles?.includes("Sheriff")) && r.id !== prince?.id && !r.is_ex)
    .sort((a, b) => (b.status || 0) - (a.status || 0));
    
  const others = alive
    .filter(r => r.id !== prince?.id && !council.some(c => c.id === r.id))
    .sort((a, b) => (b.status || 0) - (a.status || 0));

  return (
    <div className={styles.hierarchyWrapper}>
      
      {/* Admin View Toggle */}
      {canEdit && (
        <div className={styles.adminControls}>
          <button 
            className={styles.toggleViewBtn} 
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? "Preview as Player" : "Return to Admin View"}
          </button>
        </div>
      )}

      {/* Active Hierarchy */}
      {prince && (
        <div className={styles.throneRoom}>
          <MemberCard ent={prince} specialClass={styles.princeCard} canEdit={isEditMode} update={update} titles={TITLES} />
        </div>
      )}
      
      {council.length > 0 && (
        <div className={styles.councilRow}>
          {council.map(c => (
            <MemberCard key={`${c.type}-${c.id}`} ent={c} specialClass={styles.highRankCard} canEdit={isEditMode} update={update} titles={TITLES} />
          ))}
        </div>
      )}
      
      <div className={styles.courtGrid}>
        {others.map(o => (
          <MemberCard key={`${o.type}-${o.id}`} ent={o} canEdit={isEditMode} update={update} titles={TITLES} />
        ))}
      </div>

      {/* Deceased Section */}
      {deceased.length > 0 && (
        <>
          <h2 className={styles.deceasedTitle}>Deceased</h2>
          <div className={styles.courtGrid}>
            {deceased.map(d => (
              <MemberCard key={`${d.type}-${d.id}`} ent={d} canEdit={isEditMode} update={update} titles={TITLES} />
            ))}
          </div>
        </>
      )}
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

  const prefix = ent.is_ex ? "Ex-" : "";
  const primaryTitle = (ent.titles && ent.titles.length > 0) ? `${prefix}${ent.titles[0]}` : null;
  const displayImageUrl = buildImageUrl(ent.image_url);
  const clanLogoUrl = symlogo(ent.clan); 

  return (
    <div className={`${styles.memberCard} ${specialClass}`}>
      
      {/* --- CLAN WATERMARK --- */}
      {clanLogoUrl && (
        <img 
          src={clanLogoUrl} 
          alt="" 
          className={styles.clanWatermark} 
          onError={(e) => e.target.style.display = 'none'} 
        />
      )}

      {/* --- LEFT SIDE: Polaroid Portrait --- */}
      <div className={styles.polaroid}>
        {displayImageUrl ? (
          <img 
            src={displayImageUrl} 
            alt={ent.name} 
            // Apply grayscale if deceased
            className={`${styles.polaroidImg} ${ent.is_deceased ? styles.grayscale : ''}`} 
          />
        ) : (
          <div className={styles.polaroidPlaceholder}>
            No Photo
          </div>
        )}
      </div>

      {/* --- RIGHT SIDE: Info & Controls --- */}
      <div className={styles.memberInfo}>
        <div className={styles.cardHeader}>
          <div className={styles.name}>
            {primaryTitle && <span className={styles.honorific}>{primaryTitle}</span>}
            {ent.name}
          </div>
          <div className={styles.clan}>{ent.clan}</div>
        </div>

        <div className={styles.cardBody}>
          {canEdit && (
            <>
              <input
                type="text"
                placeholder="e.g. Athens through time 2-1"
                className={styles.imageInput}
                defaultValue={ent.image_url || ''}
                onBlur={(e) => {
                  const newVal = e.target.value.trim();
                  if (newVal !== ent.image_url) {
                    update(ent.id, ent.type, 'image_url', newVal);
                  }
                }}
                title="Enter just the filename part, e.g. 'Athens through time 3 (166)'"
              />
              
              {/* Modifier Toggles */}
              <div className={styles.statusToggles}>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={!!ent.is_ex}
                    onChange={(e) => update(ent.id, ent.type, 'is_ex', e.target.checked)}
                  />
                  <span className={styles.exTag}>EX-ROLE</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={!!ent.is_deceased}
                    onChange={(e) => update(ent.id, ent.type, 'is_deceased', e.target.checked)}
                  />
                  <span className={styles.deadTag}>DECEASED</span>
                </label>
              </div>
            </>
          )}

          {canEdit ? (
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
            <div className={styles.displayTitles}>
              {(ent.titles || []).length > 0 ? (
                (ent.titles).map(t => (
                  <span key={t} className={styles.titleTag}>{prefix}{t}</span>
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
      
    </div>
  );
}