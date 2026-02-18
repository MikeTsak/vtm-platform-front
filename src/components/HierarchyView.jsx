import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from '../styles/Court.module.css';

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
  
  const TITLES = ["Prince", "Seneschal", "Primogen", "Sheriff", "Harpy", "Assistant Harpy", "Hound", "Whip"];

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

  if (loading) return <div className={styles.loading}>Consulting the genealogy scrolls...</div>;

  const prince = roster.find(r => r.titles?.includes("Prince"));
  
  const council = roster
    .filter(r => (r.titles?.includes("Seneschal") || r.titles?.includes("Sheriff")) && r.id !== prince?.id)
    .sort((a, b) => (b.status || 0) - (a.status || 0));
    
  const others = roster
    .filter(r => r.id !== prince?.id && !council.some(c => c.id === r.id))
    .sort((a, b) => (b.status || 0) - (a.status || 0));

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

  const primaryTitle = (ent.titles && ent.titles.length > 0) ? ent.titles[0] : null;
  const displayImageUrl = buildImageUrl(ent.image_url);
  const clanLogoUrl = symlogo(ent.clan); // Gets the correct clan logo

  return (
    <div className={`${styles.memberCard} ${specialClass}`}>
      
      {/* --- CLAN WATERMARK (Using an img tag instead of CSS variables) --- */}
      {clanLogoUrl && (
        <img 
          src={clanLogoUrl} 
          alt="" 
          className={styles.clanWatermark} 
          onError={(e) => e.target.style.display = 'none'} // Hides broken images safely
        />
      )}

      {/* --- LEFT SIDE: Polaroid Portrait --- */}
      <div className={styles.polaroid}>
        {displayImageUrl ? (
          <img 
            src={displayImageUrl} 
            alt={ent.name} 
            className={styles.polaroidImg} 
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