import React, { useState, useEffect, useContext } from 'react';
import { AuthCtx } from '../../core/AuthContext';
import Avatar from '../../components/Avatar';
import api from '../../core/api';
import { motion } from 'framer-motion';
import styles from '../../styles/Court.module.css';
import { Skeleton } from 'boneyard-js/react';

/* --- Clan assets logic --- */
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim', 'Thin-blood': 'Thinblood' };
const symlogo = (c) =>
  (c ? `/img/clans/330px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g, '_')}_symbol.png` : '');
const textlogo = (c) =>
  (c ? `/img/clans/text/300px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g, '_')}_logo.png` : '');

// --- URL BUILDER HELPER ---

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};
const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }
};

export default function HierarchyView({ canEdit: propCanEdit }) {
  const { user } = useContext(AuthCtx);
  const isAdmin = user?.role === 'admin';
  const canEdit = propCanEdit !== undefined ? propCanEdit : isAdmin;

  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(canEdit); 
  const [enlargedImage, setEnlargedImage] = useState(null); 
  const [selectedClan, setSelectedClan] = useState(""); // For bulk bloodhunt
  
  const TITLES = ["Prince", "Seneschal", "Primogen", "Sheriff", "Keeper", "Harpy", "Assistant Harpy", "Hound", "Shadow", "Whip", "Scourge"];

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

  const mainCourtTitles = ["Prince", "Seneschal", "Sheriff", "Keeper", "Harpy", "Assistant Harpy", "Hound", "Shadow", "Scourge"];
  
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
      <motion.div className={styles.hierarchyWrapper}>
      
      <motion.header initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.1 }} variants={itemVariants} className={styles.sectionBox} style={{ borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 10%, transparent)', paddingBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        <span className="material-symbols-outlined" style={{ position: 'absolute', right: '-1rem', top: '-2rem', fontSize: '120px', opacity: 0.03, pointerEvents: 'none', color: 'var(--on-surface)' }}>account_balance</span>
        <h2 className={styles.sectionTitle} style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Court Hierarchy</h2>
        <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', maxWidth: '42rem' }}>
          The established order of the undead domain. Manage positions, track status, and monitor those marked for final death.
        </p>
      </motion.header>
      
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
        <div className={styles.sectionBox}>
          <div className={styles.sectionHeader}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>warning</span>
            <h2 className={styles.bloodhuntTitle}>Blood Hunt</h2>
            <div className={`${styles.divider} ${styles.dividerBloodhunt}`}></div>
          </div>
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
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Main Court</h2>
            <div className={`${styles.divider} ${styles.dividerMain}`}></div>
          </div>
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
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Primogen Council</h2>
            <div className={`${styles.divider} ${styles.dividerMain}`}></div>
          </div>
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
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Court Members</h2>
            <div className={`${styles.divider} ${styles.dividerMain}`}></div>
          </div>
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
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Called</h2>
            <div className={`${styles.divider} ${styles.dividerMain}`}></div>
          </div>
          <div className={styles.courtGrid}>
            {called.map(c => <MemberCard key={`${c.type}-${c.id}`} ent={c} canEdit={isEditMode} update={update} titles={TITLES} onImageClick={setEnlargedImage} />)}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div className={styles.sectionBox}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Missing</h2>
            <div className={`${styles.divider} ${styles.dividerMain}`}></div>
          </div>
          <div className={styles.courtGrid}>
            {missing.map(m => <MemberCard key={`${m.type}-${m.id}`} ent={m} canEdit={isEditMode} update={update} titles={TITLES} onImageClick={setEnlargedImage} />)}
          </div>
        </div>
      )}

      {exiled.length > 0 && (
        <div className={styles.sectionBox}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Exiled</h2>
            <div className={`${styles.divider} ${styles.dividerMain}`}></div>
          </div>
          <div className={styles.courtGrid}>
            {exiled.map(e => <MemberCard key={`${e.type}-${e.id}`} ent={e} canEdit={isEditMode} update={update} titles={TITLES} onImageClick={setEnlargedImage} />)}
          </div>
        </div>
      )}

      {left.length > 0 && (
        <div className={styles.sectionBox}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Departed / Left</h2>
            <div className={`${styles.divider} ${styles.dividerMain}`}></div>
          </div>
          <div className={styles.courtGrid}>
            {left.map(l => <MemberCard key={`${l.type}-${l.id}`} ent={l} canEdit={isEditMode} update={update} titles={TITLES} onImageClick={setEnlargedImage} />)}
          </div>
        </div>
      )}

      {deceased.length > 0 && (
        <div className={styles.sectionBox}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Deceased</h2>
            <div className={`${styles.divider} ${styles.dividerMain}`}></div>
          </div>
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
    </motion.div>
    </Skeleton>
  );
}

function MemberCard({ ent, specialClass = "", canEdit, update, titles, onImageClick }) {
  const { user } = useContext(AuthCtx);
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
  const baseUrl = import.meta.env.VITE_API_URL || '';
  let avatarUrl = null;
  if (ent.type === 'player' && ent.user_id) avatarUrl = `${baseUrl}/users/${ent.user_id}/avatar`;
  else if (ent.type === 'npc') avatarUrl = `${baseUrl}/npcs/${ent.id}/avatar`;

  const clanLogoUrl = symlogo(ent.clan); 
  const clanTextUrl = textlogo(ent.clan);

  const hiddenClass = ent.is_hidden ? styles.hiddenCard : "";
  
  let imgClass = styles.sharpImg;
  if (ent.is_bloodhunted) {
    imgClass = `${styles.sharpImg} ${styles.imgBloodhunted}`;
  } else if (ent.is_deceased || ent.is_missing || ent.is_exiled || ent.is_left || ent.is_called) {
    imgClass = `${styles.sharpImg} ${styles.grayscale}`;
  }

  const baseCardClass = ent.is_bloodhunted ? styles.bloodhuntCard : styles.glassCard;

  return (
    <motion.div variants={itemVariants} className={`${baseCardClass} ${specialClass} ${hiddenClass}`} initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.1 }}>
      {ent.is_bloodhunted && (
        <div className={styles.bloodhuntIcon}>
          <span className="material-symbols-outlined">priority_high</span>
        </div>
      )}
      
      {clanLogoUrl && (
        <div 
          className={styles.cardWatermark} 
          style={{ backgroundImage: `url(${clanLogoUrl})` }}
        />
      )}

      <div className={styles.imgContainer}>
        {ent.type === 'player' || ent.type === 'npc' ? (
          <div className={styles.imgWrapper} onClick={() => onImageClick(avatarUrl)}>
            <Avatar 
               userId={ent.type === 'player' ? ent.user_id : null} 
               npcId={ent.type === 'npc' ? ent.id : null}
               size="100%" 
               editable={canEdit}
               style={{ width: '100%', height: '100%', borderRadius: 0 }} 
               imgClassName={imgClass} 
            />
            {ent.is_bloodhunted && <div className={styles.targetLabel}>Target</div>}
          </div>
        ) : (
          <div className={styles.imgPlaceholder}>
            {clanLogoUrl && <img src={clanLogoUrl} alt={ent.clan} className={styles.placeholderLogo} />}
            {clanTextUrl ? (
               <div style={{ width: '100%', height: '20px', display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                 <img src={clanTextUrl} alt={ent.clan} style={{ maxWidth: '80%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
               </div>
            ) : (
               ent.clan && <span style={{ color: 'white', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.65rem' }}>{ent.clan}</span>
            )}
            <span style={{ fontSize: '0.6rem', marginTop: '4px', opacity: 0.7 }}>NO PHOTO</span>
          </div>
        )}
      </div>

      <div className={styles.infoCol}>
        <div className={styles.name}>
          {primaryTitle && <span className={styles.honorific} style={{ marginRight: '8px' }}>{primaryTitle}</span>}
          {ent.name}
          {user && String(ent.user_id) === String(user.id) && (
            <span style={{ marginLeft: '8px', fontSize: '0.65em', color: '#60a5fa', fontWeight: 'bold' }}>(YOU)</span>
          )}
        </div>
        
        <div className={styles.tags}>
          {ent.clan && (
            clanTextUrl ? (
              <span className={styles.tagClan} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '22px', padding: '2px' }}>
                <img src={clanTextUrl} alt={ent.clan} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1) opacity(0.8)' }} />
              </span>
            ) : (
              <span className={styles.tagClan}>{ent.clan}</span>
            )
          )}
          {(ent.titles || []).filter((_, i) => i > 0 || !primaryTitle).map(t => (
            <span key={t} className={styles.tagSect}>{prefix}{t}</span>
          ))}
          {!!ent.is_ex && <span className={styles.tagSect}>EX-ROLE</span>}
          {!!ent.is_hidden && <span className={styles.tagSect}>HIDDEN</span>}
          {!!ent.is_deceased && <span className={styles.tagSect}>DECEASED</span>}
          {!!ent.is_called && <span className={styles.tagSect}>CALLED</span>}
          {!!ent.is_missing && <span className={styles.tagSect}>MISSING</span>}
          {!!ent.is_exiled && <span className={styles.tagSect}>EXILED</span>}
          {!!ent.is_left && <span className={styles.tagSect}>LEFT</span>}
        </div>

        {ent.bio && <p className={styles.description}>{ent.bio}</p>}

        {canEdit && (
          <div className={styles.editContainer} style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', border: '1px dashed var(--tint)' }}>
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
              style={{ marginBottom: '10px' }}
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
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.statusDrops}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ opacity: i < (ent.status || 1) ? 1 : 0.3 }}>●</span>
            ))}
            {(ent.titles || []).includes("Keeper") && (
              <span className={styles.keeperSubtitle} style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                (In Elysium: ●●●●●)
              </span>
            )}
          </div>
          
          {canEdit && (
            <input 
              type="range" min="1" max="5" 
              value={ent.status || 1}
              onChange={(e) => update(ent.id, ent.type, 'status', parseInt(e.target.value))}
              className={styles.statusSlider}
              title="Adjust Status"
              style={{ width: '60px' }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}