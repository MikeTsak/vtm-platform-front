import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from '../styles/Court.module.css';
import Loading from './Loading';
import { Skeleton } from 'boneyard-js/react';

/* --- Clan assets logic --- */
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
  const [enlargedImage, setEnlargedImage] = useState(null); 
  const [selectedClan, setSelectedClan] = useState(""); // For bulk bloodhunt
  
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

  // Bulk Bloodhunt Clan Action
  const handleBulkBloodhunt = () => {
    if (!selectedClan) return;
    const confirmMsg = `Are you absolutely sure you want to call a Blood Hunt on EVERY member of clan ${selectedClan}?`;
    if (!window.confirm(confirmMsg)) return;

    // Find all alive/active members of that clan who aren't already bloodhunted
    const targets = roster.filter(r => r.clan === selectedClan && !r.is_bloodhunted);
    
    // Execute updates sequentially or they might overwhelm the backend
    targets.forEach(t => {
      update(t.id, t.type, 'is_bloodhunted', true);
    });
    setSelectedClan("");
  };

  // if (loading) return <Loading />;

  // Get unique clans for the dropdown
  const uniqueClans = [...new Set(roster.map(r => r.clan))].filter(Boolean).sort();

  const displayedRoster = isEditMode ? roster : roster.filter(r => !r.is_hidden);

  // Group characters by their status
  const bloodhunted = displayedRoster.filter(r => r.is_bloodhunted).sort((a, b) => (b.status || 0) - (a.status || 0));

  // Active members are not bloodhunted, deceased, missing, exiled, left, or called
  const activeMembers = displayedRoster.filter(r => 
    !r.is_bloodhunted && !r.is_deceased && !r.is_called && !r.is_missing && !r.is_exiled && !r.is_left
  );

  const deceased = displayedRoster.filter(r => r.is_deceased && !r.is_bloodhunted).sort((a, b) => (b.status || 0) - (a.status || 0));
  const called = displayedRoster.filter(r => r.is_called && !r.is_bloodhunted).sort((a, b) => (b.status || 0) - (a.status || 0));
  const missing = displayedRoster.filter(r => r.is_missing && !r.is_bloodhunted).sort((a, b) => (b.status || 0) - (a.status || 0));
  const exiled = displayedRoster.filter(r => r.is_exiled && !r.is_bloodhunted).sort((a, b) => (b.status || 0) - (a.status || 0));
  const left = displayedRoster.filter(r => r.is_left && !r.is_bloodhunted).sort((a, b) => (b.status || 0) - (a.status || 0));

  const mainCourtTitles = ["Prince", "Seneschal", "Sheriff", "Keeper", "Harpy", "Assistant Harpy", "Hound", "Shadow"];
  
  const getMainCourtRank = (ent) => {
    if (!ent.titles) return 99;
    let best = 99;
    ent.titles.forEach(t => {
      const idx = mainCourtTitles.indexOf(t);
      if (idx !== -1 && idx < best) best = idx;
    });
    return best;
  };

  const mainCourt = activeMembers
    .filter(r => r.titles?.some(t => mainCourtTitles.includes(t)) && !r.is_ex)
    .sort((a, b) => {
      const rankA = getMainCourtRank(a);
      const rankB = getMainCourtRank(b);
      if (rankA !== rankB) return rankA - rankB; 
      return (b.status || 0) - (a.status || 0);  
    });

  const primogen = activeMembers
    .filter(r => r.titles?.includes("Primogen") && !r.is_ex && !mainCourt.some(m => m.id === r.id && m.type === r.type))
    .sort((a, b) => (b.status || 0) - (a.status || 0));

  const others = activeMembers
    .filter(r => !mainCourt.some(m => m.id === r.id && m.type === r.type) && !primogen.some(p => p.id === r.id && p.type === r.type))
    .sort((a, b) => (b.status || 0) - (a.status || 0));

  return (
    <Skeleton loading={loading} name="court-hierarchy">
      <div className={styles.hierarchyWrapper}>
      
      {/* Admin Controls */}
      {canEdit && (
        <div className={styles.adminControls} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div className={styles.bulkActionRow}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bulk Action:</span>
            <select 
              className={styles.clanSelect}
              value={selectedClan} 
              onChange={(e) => setSelectedClan(e.target.value)}
            >
              <option value="">-- Select Clan --</option>
              {uniqueClans.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className={styles.bulkBloodhuntBtn} onClick={handleBulkBloodhunt}>
              Bloodhunt Clan
            </button>
          </div>

          <button 
            className={styles.toggleViewBtn} 
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? "Preview as Player" : "Return to Admin View"}
          </button>
        </div>
      )}

      {/* --- TOP PRIORITY: BLOOD HUNT --- */}
      {bloodhunted.length > 0 && (
        <div className={styles.sectionBox} style={{ borderColor: 'var(--tint)', backgroundColor: 'color-mix(in srgb, var(--tint) 10%, transparent)' }}>
          <h2 className={styles.bloodhuntTitle}>🩸 BLOOD HUNT / RED LIST 🩸</h2>
          <div className={styles.courtGrid}>
            {bloodhunted.map(bh => (
              <MemberCard 
                key={`${bh.type}-${bh.id}`} 
                ent={bh} 
                specialClass={styles.bloodhuntCard} 
                canEdit={isEditMode} 
                update={update} 
                titles={TITLES} 
                onImageClick={setEnlargedImage}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Court Box */}
      {mainCourt.length > 0 && (
        <div className={styles.sectionBox}>
          <h2 className={styles.sectionTitle}>Main Court</h2>
          <div className={styles.courtGrid}>
            {mainCourt.map(m => (
              <MemberCard key={`${m.type}-${m.id}`} ent={m} specialClass={m.titles?.includes("Prince") ? styles.princeCard : styles.highRankCard} canEdit={isEditMode} update={update} titles={TITLES} onImageClick={setEnlargedImage} />
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
              <MemberCard key={`${p.type}-${p.id}`} ent={p} specialClass={styles.highRankCard} canEdit={isEditMode} update={update} titles={TITLES} onImageClick={setEnlargedImage} />
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
              <MemberCard key={`${o.type}-${o.id}`} ent={o} canEdit={isEditMode} update={update} titles={TITLES} onImageClick={setEnlargedImage} />
            ))}
          </div>
        </div>
      )}

      {/* --- INACTIVE / REMOVED SECTIONS --- */}
      {called.length > 0 && (
        <div className={styles.sectionBox}>
          <h2 className={styles.deceasedTitle}>Called</h2>
          <div className={styles.courtGrid}>
            {called.map(c => <MemberCard key={`${c.type}-${c.id}`} ent={c} canEdit={isEditMode} update={update} titles={TITLES} onImageClick={setEnlargedImage} />)}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div className={styles.sectionBox}>
          <h2 className={styles.deceasedTitle}>Missing</h2>
          <div className={styles.courtGrid}>
            {missing.map(m => <MemberCard key={`${m.type}-${m.id}`} ent={m} canEdit={isEditMode} update={update} titles={TITLES} onImageClick={setEnlargedImage} />)}
          </div>
        </div>
      )}

      {exiled.length > 0 && (
        <div className={styles.sectionBox}>
          <h2 className={styles.deceasedTitle}>Exiled</h2>
          <div className={styles.courtGrid}>
            {exiled.map(e => <MemberCard key={`${e.type}-${e.id}`} ent={e} canEdit={isEditMode} update={update} titles={TITLES} onImageClick={setEnlargedImage} />)}
          </div>
        </div>
      )}

      {left.length > 0 && (
        <div className={styles.sectionBox}>
          <h2 className={styles.deceasedTitle}>Departed / Left</h2>
          <div className={styles.courtGrid}>
            {left.map(l => <MemberCard key={`${l.type}-${l.id}`} ent={l} canEdit={isEditMode} update={update} titles={TITLES} onImageClick={setEnlargedImage} />)}
          </div>
        </div>
      )}

      {deceased.length > 0 && (
        <div className={styles.sectionBox}>
          <h2 className={styles.deceasedTitle}>Deceased</h2>
          <div className={styles.courtGrid}>
            {deceased.map(d => <MemberCard key={`${d.type}-${d.id}`} ent={d} canEdit={isEditMode} update={update} titles={TITLES} onImageClick={setEnlargedImage} />)}
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
    </Skeleton>
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
  
  let polaroidClass = styles.polaroidImg;
  if (ent.is_bloodhunted) {
    polaroidClass = `${styles.polaroidImg} ${styles.bloodhuntImg}`;
  } else if (ent.is_deceased || ent.is_missing || ent.is_exiled || ent.is_left || ent.is_called) {
    polaroidClass = `${styles.polaroidImg} ${styles.grayscale}`;
  }

  return (
    <div className={`${styles.memberCard} ${specialClass} ${hiddenClass}`}>
      
      {clanLogoUrl && (
        <img 
          src={clanLogoUrl} 
          alt="" 
          className={styles.clanWatermark} 
          onError={(e) => e.target.style.display = 'none'} 
        />
      )}

      <div className={styles.polaroid}>
        {displayImageUrl ? (
          <img 
            src={displayImageUrl} 
            alt={ent.name} 
            className={polaroidClass} 
            onClick={() => onImageClick(displayImageUrl)}
          />
        ) : (
          <div className={styles.polaroidPlaceholder}>No Photo</div>
        )}
      </div>

      <div className={styles.memberInfo}>
        <div className={styles.cardHeader}>
          <div className={styles.name}>
            {primaryTitle && <span className={styles.honorific}>{primaryTitle}</span>}
            {ent.name}
          </div>
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
              
              <div className={styles.statusToggles} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={!!ent.is_bloodhunted} onChange={(e) => update(ent.id, ent.type, 'is_bloodhunted', e.target.checked)} />
                  <span className={styles.bloodhuntTag}>BLOODHUNT</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={!!ent.is_hidden} onChange={(e) => update(ent.id, ent.type, 'is_hidden', e.target.checked)} />
                  <span className={styles.hideTag}>HIDDEN</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={!!ent.is_ex} onChange={(e) => update(ent.id, ent.type, 'is_ex', e.target.checked)} />
                  <span className={styles.exTag}>EX-ROLE</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={!!ent.is_deceased} onChange={(e) => update(ent.id, ent.type, 'is_deceased', e.target.checked)} />
                  <span className={styles.deadTag}>DECEASED</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={!!ent.is_called} onChange={(e) => update(ent.id, ent.type, 'is_called', e.target.checked)} />
                  <span className={styles.exTag}>CALLED</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={!!ent.is_missing} onChange={(e) => update(ent.id, ent.type, 'is_missing', e.target.checked)} />
                  <span className={styles.exTag}>MISSING</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={!!ent.is_exiled} onChange={(e) => update(ent.id, ent.type, 'is_exiled', e.target.checked)} />
                  <span className={styles.exTag}>EXILED</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={!!ent.is_left} onChange={(e) => update(ent.id, ent.type, 'is_left', e.target.checked)} />
                  <span className={styles.exTag}>LEFT</span>
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

        <div className={styles.memberInfoWrapper}>
          <div className={styles.cardFooter}>
            <div className={styles.statusDisplay}>
              {"●".repeat(ent.status || 1)}{"○".repeat(5 - (ent.status || 1))}
            </div>
              {(ent.titles || []).includes("Keeper") && (
              <div className={styles.keeperSubtitle}>
                (In Elysium: ●●●●●)
              </div>
            )}
            </div>

            <div className={styles.clan}>{ent.clan}</div>
            
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