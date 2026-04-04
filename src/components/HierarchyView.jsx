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
  const [isEditMode, setIsEditMode] = useState(canEdit); 
  const [enlargedImage, setEnlargedImage] = useState(null); // Lightbox state
  
  // All possible titles for the admin checkboxes
  const TITLES = ["Prince", "Seneschal", "Primogen", "Sheriff", "Keeper", "Harpy", "Assistant Harpy", "Hound", "Shadow", "Whip"];

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

  if (loading) return <Loading />;

  // Filter out hidden characters for players (or admins previewing as players)
  const displayedRoster = isEditMode ? roster : roster.filter(r => !r.is_hidden);

  // Separate the dead from the living using the displayed roster
  const deceased = displayedRoster
    .filter(r => r.is_deceased)
    .sort((a, b) => (b.status || 0) - (a.status || 0));

  const alive = displayedRoster.filter(r => !r.is_deceased);

  // Titles that belong in the top box, sorted by rank importance
  const mainCourtTitles = ["Prince", "Seneschal", "Sheriff", "Keeper", "Harpy", "Assistant Harpy", "Hound", "Shadow"];
  
  // Helper to sort Main Court by rank importance
  const getMainCourtRank = (ent) => {
    if (!ent.titles) return 99;
    let best = 99;
    ent.titles.forEach(t => {
      const idx = mainCourtTitles.indexOf(t);
      if (idx !== -1 && idx < best) best = idx;
    });
    return best;
  };

  // 1. Main Court
  const mainCourt = alive
    .filter(r => r.titles?.some(t => mainCourtTitles.includes(t)) && !r.is_ex)
    .sort((a, b) => {
      const rankA = getMainCourtRank(a);
      const rankB = getMainCourtRank(b);
      if (rankA !== rankB) return rankA - rankB; 
      return (b.status || 0) - (a.status || 0);  
    });

  // 2. Primogen (Checks both ID and TYPE to prevent NPC collisions)
  const primogen = alive
    .filter(r => r.titles?.includes("Primogen") && !r.is_ex && !mainCourt.some(m => m.id === r.id && m.type === r.type))
    .sort((a, b) => (b.status || 0) - (a.status || 0));

  // 3. The Rest (Checks both ID and TYPE to prevent NPC collisions)
  const others = alive
    .filter(r => !mainCourt.some(m => m.id === r.id && m.type === r.type) && !primogen.some(p => p.id === r.id && p.type === r.type))
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

      {/* Main Court Box */}
      {mainCourt.length > 0 && (
        <div className={styles.sectionBox}>
          <h2 className={styles.sectionTitle}>Main Court</h2>
          <div className={styles.courtGrid}>
            {mainCourt.map(m => (
              <MemberCard 
                key={`${m.type}-${m.id}`} 
                ent={m} 
                specialClass={m.titles?.includes("Prince") ? styles.princeCard : styles.highRankCard} 
                canEdit={isEditMode} 
                update={update} 
                titles={TITLES} 
                onImageClick={setEnlargedImage}
              />
            ))}
          </div>
        </div>
      )}

      {/* Primogen Box */}
      {primogen.length > 0 && (
        <div className={styles.sectionBox}>
          <h2 className={styles.sectionTitle}>Primogen Council</h2>
          <div className={styles.courtGrid}>
            {primogen.map(p => (
              <MemberCard 
                key={`${p.type}-${p.id}`} 
                ent={p} 
                specialClass={styles.highRankCard} 
                canEdit={isEditMode} 
                update={update} 
                titles={TITLES}
                onImageClick={setEnlargedImage}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Rest of the Court */}
      {others.length > 0 && (
        <div className={styles.sectionBox}>
          <h2 className={styles.sectionTitle}>Court Members</h2>
          <div className={styles.courtGrid}>
            {others.map(o => (
              <MemberCard 
                key={`${o.type}-${o.id}`} 
                ent={o} 
                canEdit={isEditMode} 
                update={update} 
                titles={TITLES} 
                onImageClick={setEnlargedImage}
              />
            ))}
          </div>
        </div>
      )}

      {/* Deceased Section */}
      {deceased.length > 0 && (
        <div className={styles.sectionBox}>
          <h2 className={styles.deceasedTitle}>Deceased</h2>
          <div className={styles.courtGrid}>
            {deceased.map(d => (
              <MemberCard 
                key={`${d.type}-${d.id}`} 
                ent={d} 
                canEdit={isEditMode} 
                update={update} 
                titles={TITLES} 
                onImageClick={setEnlargedImage}
              />
            ))}
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {enlargedImage && (
        <div className={styles.lightboxOverlay} onClick={() => setEnlargedImage(null)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeLightboxBtn} onClick={() => setEnlargedImage(null)}>✖</button>
            <img src={enlargedImage} alt="Enlarged portrait" className={styles.lightboxImage} />
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({ ent, specialClass = "", canEdit, update, titles, onImageClick }) {
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

  const hiddenClass = ent.is_hidden ? styles.hiddenCard : "";

  return (
    <div className={`${styles.memberCard} ${specialClass} ${hiddenClass}`}>
      
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
            className={`${styles.polaroidImg} ${ent.is_deceased ? styles.grayscale : ''}`} 
            onClick={() => onImageClick(displayImageUrl)}
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
                title="Enter just the filename part"
              />
              
              <div className={styles.statusToggles}>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={!!ent.is_hidden}
                    onChange={(e) => update(ent.id, ent.type, 'is_hidden', e.target.checked)}
                  />
                  <span className={styles.hideTag}>HIDDEN</span>
                </label>
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