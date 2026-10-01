import React, { useState, useEffect, useMemo, useContext } from 'react';
import { AuthCtx } from '../../core/AuthContext';
import Avatar from '../../components/Avatar';
import api from '../../core/api';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../../styles/Court.module.css';
import { Skeleton } from 'boneyard-js/react';
import { symlogoWhite, textlogoWhite, getClanThemeRules, getClanPalette, clanTint, clanBackground } from '../../data/clans';
import ClanSymbol from '../../components/ClanSymbol';
import FaGlyph from '../../ui/FaGlyph';
import { factionLogo, factionType } from '../../data/factions';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }
};

const TITLES = [
  "Prince", 
  "Seneschal", 
  "Primogen", 
  "Sheriff", 
  "Keeper", 
  "Harpy", 
  "Assistant Harpy", 
  "Hound", 
  "Shadow", 
  "Whip", 
  "Scourge"
];

const HIGH_OFFICES = ["Prince", "Seneschal", "Primogen", "Sheriff", "Keeper", "Harpy"];
const COURT_OFFICERS = ["Assistant Harpy", "Hound", "Shadow", "Whip", "Scourge"];

const mainCourtTitles = [
  "Prince", 
  "Seneschal", 
  "Sheriff", 
  "Keeper", 
  "Harpy", 
  "Assistant Harpy", 
  "Hound", 
  "Shadow", 
  "Scourge"
];

export default function HierarchyView({ canEdit: propCanEdit }) {
  const { user } = useContext(AuthCtx);
  const isAdmin = user?.role === 'admin';
  const canEdit = propCanEdit !== undefined ? propCanEdit : isAdmin;

  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(canEdit); 
  const [enlargedImage, setEnlargedImage] = useState(null); 
  const [selectedClan, setSelectedClan] = useState(""); // For bulk bloodhunt
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClan, setFilterClan] = useState("");
  const [filterSection, setFilterSection] = useState("all");
  const [inspectingKindred, setInspectingKindred] = useState(null);
  const [stableSortKey, setStableSortKey] = useState(0);

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

    const targets = roster.filter(r => r.clan === selectedClan && !r.is_bloodhunted);
    targets.forEach(t => {
      update(t.id, t.type, 'is_bloodhunted', true);
    });
    setSelectedClan("");
  };

  const handleRefreshOrder = () => {
    setStableSortKey(k => k + 1);
  };

  const uniqueClans = useMemo(() => {
    return [...new Set(roster.map(r => r.clan))].filter(Boolean).sort();
  }, [roster]);

  const getStatusVal = (ent) => (ent?.status !== undefined && ent?.status !== null ? Number(ent.status) : 1);

  const sortByStatusThenClan = (a, b) => {
    const statusA = getStatusVal(a);
    const statusB = getStatusVal(b);
    if (statusB !== statusA) return statusB - statusA;
    const clanCompare = (a.clan || '').localeCompare(b.clan || '');
    if (clanCompare !== 0) return clanCompare;
    return (a.name || '').localeCompare(b.name || '');
  };

  const getMainCourtRank = (ent) => {
    if (!ent.titles) return 99;
    let best = 99;
    ent.titles.forEach(t => {
      const idx = mainCourtTitles.indexOf(t);
      if (idx !== -1 && idx < best) best = idx;
    });
    return best;
  };

  // Stable ordering index map in Admin Edit Mode
  const sortIndexMap = useMemo(() => {
    const sorted = [...roster].sort(sortByStatusThenClan);
    const map = new Map();
    sorted.forEach((item, index) => {
      map.set(`${item.type}-${item.id}`, index);
    });
    return map;
  }, [roster.length, stableSortKey]);

  const sortItems = (items) => {
    if (isEditMode) {
      return [...items].sort((a, b) => {
        const idxA = sortIndexMap.get(`${a.type}-${a.id}`) ?? 9999;
        const idxB = sortIndexMap.get(`${b.type}-${b.id}`) ?? 9999;
        if (idxA !== idxB) return idxA - idxB;
        return sortByStatusThenClan(a, b);
      });
    }
    return [...items].sort(sortByStatusThenClan);
  };

  // Filter roster by search and clan
  const filteredRoster = useMemo(() => {
    let list = isEditMode ? roster : roster.filter(r => !r.is_hidden);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => 
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.clan && r.clan.toLowerCase().includes(q)) ||
        (r.titles && r.titles.some(t => t.toLowerCase().includes(q)))
      );
    }

    if (filterClan) {
      list = list.filter(r => r.clan === filterClan);
    }

    return list;
  }, [roster, isEditMode, searchQuery, filterClan]);

  // Group characters by their status
  const bloodhunted = useMemo(() => {
    return sortItems(filteredRoster.filter(r => r.is_bloodhunted));
  }, [filteredRoster, isEditMode, sortIndexMap]);

  const activeMembers = useMemo(() => {
    return filteredRoster.filter(r => 
      !r.is_bloodhunted && !r.is_deceased && !r.is_called && !r.is_missing && !r.is_exiled && !r.is_left
    );
  }, [filteredRoster]);

  const mainCourt = useMemo(() => {
    const items = activeMembers.filter(r => r.titles?.some(t => mainCourtTitles.includes(t)) && !r.is_ex);
    if (isEditMode) {
      return [...items].sort((a, b) => {
        const rankA = getMainCourtRank(a);
        const rankB = getMainCourtRank(b);
        if (rankA !== rankB) return rankA - rankB;
        const idxA = sortIndexMap.get(`${a.type}-${a.id}`) ?? 9999;
        const idxB = sortIndexMap.get(`${b.type}-${b.id}`) ?? 9999;
        if (idxA !== idxB) return idxA - idxB;
        return sortByStatusThenClan(a, b);
      });
    }
    return [...items].sort((a, b) => {
      const rankA = getMainCourtRank(a);
      const rankB = getMainCourtRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return sortByStatusThenClan(a, b);
    });
  }, [activeMembers, isEditMode, sortIndexMap]);

  const primogen = useMemo(() => {
    const items = activeMembers.filter(r => 
      r.titles?.includes("Primogen") && !r.is_ex && !mainCourt.some(m => m.id === r.id && m.type === r.type)
    );
    return sortItems(items);
  }, [activeMembers, mainCourt, isEditMode, sortIndexMap]);

  const others = useMemo(() => {
    const items = activeMembers.filter(r => 
      !mainCourt.some(m => m.id === r.id && m.type === r.type) && 
      !primogen.some(p => p.id === r.id && p.type === r.type)
    );
    return sortItems(items);
  }, [activeMembers, mainCourt, primogen, isEditMode, sortIndexMap]);

  const deceased = useMemo(() => sortItems(filteredRoster.filter(r => r.is_deceased && !r.is_bloodhunted)), [filteredRoster, isEditMode, sortIndexMap]);
  const called = useMemo(() => sortItems(filteredRoster.filter(r => r.is_called && !r.is_bloodhunted)), [filteredRoster, isEditMode, sortIndexMap]);
  const missing = useMemo(() => sortItems(filteredRoster.filter(r => r.is_missing && !r.is_bloodhunted)), [filteredRoster, isEditMode, sortIndexMap]);
  const exiled = useMemo(() => sortItems(filteredRoster.filter(r => r.is_exiled && !r.is_bloodhunted)), [filteredRoster, isEditMode, sortIndexMap]);
  const left = useMemo(() => sortItems(filteredRoster.filter(r => r.is_left && !r.is_bloodhunted)), [filteredRoster, isEditMode, sortIndexMap]);

  // Section visibility checks
  const showBloodhunt = (filterSection === 'all' || filterSection === 'bloodhunt') && bloodhunted.length > 0;
  const showMainCourt = (filterSection === 'all' || filterSection === 'main') && mainCourt.length > 0;
  const showPrimogen = (filterSection === 'all' || filterSection === 'primogen') && primogen.length > 0;
  const showOthers = (filterSection === 'all' || filterSection === 'members') && others.length > 0;
  const showInactive = (filterSection === 'all' || filterSection === 'inactive');

  const baseUrl = import.meta.env.VITE_API_URL || '';

  // Get currently inspected kindred from live roster
  const activeInspectedKindred = useMemo(() => {
    if (!inspectingKindred) return null;
    return roster.find(r => r.id === inspectingKindred.id && r.type === inspectingKindred.type) || inspectingKindred;
  }, [inspectingKindred, roster]);

  return (
    <Skeleton loading={loading} name="court-hierarchy">
      <div className={styles.hierarchyWrapper}>
      
        <motion.header 
          initial="hidden" 
          whileInView="show" 
          viewport={{ once: true, amount: 0.1 }} 
          variants={itemVariants} 
          className={styles.sectionBox} 
          style={{ borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 10%, transparent)', paddingBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}
        >
          <img 
            src={factionLogo('Camarilla')} 
            alt="" 
            aria-hidden="true"
            style={{ position: 'absolute', right: '0.5rem', top: '-1rem', height: 'clamp(100px, 22vw, 160px)', opacity: 0.05, pointerEvents: 'none', objectFit: 'contain' }} 
          />
          <img 
            src={factionType('Camarilla')} 
            alt="" 
            aria-hidden="true"
            style={{ position: 'absolute', right: '1rem', bottom: '0.5rem', height: 'clamp(26px, 5vw, 42px)', maxWidth: '40%', opacity: 0.08, pointerEvents: 'none', objectFit: 'contain' }} 
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <img 
              src={factionLogo('Camarilla')} 
              alt="Camarilla Crest" 
              style={{ width: 'clamp(32px, 5vw, 42px)', height: 'clamp(32px, 5vw, 42px)', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(138, 15, 26, 0.7))' }} 
            />
            <h2 className={styles.sectionTitle} style={{ fontSize: 'clamp(1.75rem, 5vw, 3rem)', margin: 0, lineHeight: 1.1 }}>Court Hierarchy</h2>
          </div>
          <p style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.125rem)', color: 'var(--on-surface-variant)', maxWidth: '42rem' }}>
            The established order of the undead domain. Manage positions, track status, and monitor those marked for final death.
          </p>
        </motion.header>
        
        {/* Admin Storyteller Toolbar */}
        {canEdit && (
          <div className={styles.adminPanel}>
            <div className={styles.adminTopRow}>
              <div className={styles.adminSearchGroup}>
                <div className={styles.adminSearchWrapper}>
                  <FaGlyph name="fa-magnifying-glass" size={14} className={styles.adminSearchIcon} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Kindred by name, clan, or title..."
                    className={styles.adminSearchInput}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      title="Clear search"
                    >
                      <FaGlyph name="fa-xmark" size={12} />
                    </button>
                  )}
                </div>

                <select 
                  className={styles.adminFilterSelect}
                  value={filterClan} 
                  onChange={(e) => setFilterClan(e.target.value)}
                >
                  <option value="">All Clans</option>
                  {uniqueClans.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className={styles.adminQuickFilters}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'main', label: 'Main Court' },
                  { id: 'primogen', label: 'Primogen Council' },
                  { id: 'members', label: 'Court Members' },
                  { id: 'bloodhunt', label: 'Blood Hunt' },
                  { id: 'inactive', label: 'Departed, Inactive' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    className={`${styles.adminFilterPill} ${filterSection === tab.id ? styles.adminFilterPillActive : ''}`}
                    onClick={() => setFilterSection(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.adminBottomRow}>
              <div className={styles.adminBulkGroup}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bulk Action:
                </span>
                <select 
                  className={styles.adminFilterSelect}
                  value={selectedClan} 
                  onChange={(e) => setSelectedClan(e.target.value)}
                  style={{ minWidth: '120px' }}
                >
                  <option value="">Select Clan</option>
                  {uniqueClans.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button 
                  className={styles.bulkBloodhuntBtn} 
                  onClick={handleBulkBloodhunt}
                  disabled={!selectedClan}
                  title={selectedClan ? `Call Blood Hunt on clan ${selectedClan}` : "Select a clan first"}
                >
                  Blood Hunt Clan
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isEditMode && (
                  <button 
                    className={styles.adminActionBtn} 
                    onClick={handleRefreshOrder}
                    title="Resort grid according to latest rankings"
                  >
                    <FaGlyph name="fa-rotate" size={13} />
                    Refresh Order
                  </button>
                )}

                <button 
                  className={styles.toggleViewBtn} 
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  {isEditMode ? "Preview as Player" : "Admin Edit Mode"}
                </button>

                <div className={styles.adminModeBadge}>
                  <FaGlyph name="fa-sliders" size={12} />
                  {filteredRoster.length} Kindred
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TOP PRIORITY: BLOOD HUNT --- */}
        {showBloodhunt && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <FaGlyph name="fa-triangle-exclamation" size={24} style={{ color: 'var(--primary-container)' }} />
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
                  onManage={setInspectingKindred}
                  onImageClick={setEnlargedImage}
                />
              ))}
            </div>
          </div>
        )}

        {/* Main Court Box */}
        {showMainCourt && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Main Court</h2>
              <div className={`${styles.divider} ${styles.dividerMain}`}></div>
            </div>
            <div className={styles.courtGrid}>
              {mainCourt.map(m => (
                <MemberCard 
                  key={`${m.type}-${m.id}`} 
                  ent={m} 
                  specialClass={m.titles?.includes("Prince") ? styles.princeCard : styles.highRankCard} 
                  canEdit={isEditMode} 
                  onManage={setInspectingKindred}
                  onImageClick={setEnlargedImage} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Primogen Box */}
        {showPrimogen && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Primogen Council</h2>
              <div className={`${styles.divider} ${styles.dividerMain}`}></div>
            </div>
            <div className={styles.courtGrid}>
              {primogen.map(p => (
                <MemberCard 
                  key={`${p.type}-${p.id}`} 
                  ent={p} 
                  specialClass={styles.highRankCard} 
                  canEdit={isEditMode} 
                  onManage={setInspectingKindred}
                  onImageClick={setEnlargedImage} 
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Rest of the Court */}
        {showOthers && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Court Members</h2>
              <div className={`${styles.divider} ${styles.dividerMain}`}></div>
            </div>
            <div className={styles.courtGrid}>
              {others.map(o => (
                <MemberCard 
                  key={`${o.type}-${o.id}`} 
                  ent={o} 
                  canEdit={isEditMode} 
                  onManage={setInspectingKindred}
                  onImageClick={setEnlargedImage} 
                />
              ))}
            </div>
          </div>
        )}

        {/* --- INACTIVE / REMOVED SECTIONS --- */}
        {showInactive && called.length > 0 && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Called</h2>
              <div className={`${styles.divider} ${styles.dividerMain}`}></div>
            </div>
            <div className={styles.courtGrid}>
              {called.map(c => (
                <MemberCard 
                  key={`${c.type}-${c.id}`} 
                  ent={c} 
                  canEdit={isEditMode} 
                  onManage={setInspectingKindred}
                  onImageClick={setEnlargedImage} 
                />
              ))}
            </div>
          </div>
        )}

        {showInactive && missing.length > 0 && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Missing</h2>
              <div className={`${styles.divider} ${styles.dividerMain}`}></div>
            </div>
            <div className={styles.courtGrid}>
              {missing.map(m => (
                <MemberCard 
                  key={`${m.type}-${m.id}`} 
                  ent={m} 
                  canEdit={isEditMode} 
                  onManage={setInspectingKindred}
                  onImageClick={setEnlargedImage} 
                />
              ))}
            </div>
          </div>
        )}

        {showInactive && exiled.length > 0 && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Exiled</h2>
              <div className={`${styles.divider} ${styles.dividerMain}`}></div>
            </div>
            <div className={styles.courtGrid}>
              {exiled.map(e => (
                <MemberCard 
                  key={`${e.type}-${e.id}`} 
                  ent={e} 
                  canEdit={isEditMode} 
                  onManage={setInspectingKindred}
                  onImageClick={setEnlargedImage} 
                />
              ))}
            </div>
          </div>
        )}

        {showInactive && left.length > 0 && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Departed, Left</h2>
              <div className={`${styles.divider} ${styles.dividerMain}`}></div>
            </div>
            <div className={styles.courtGrid}>
              {left.map(l => (
                <MemberCard 
                  key={`${l.type}-${l.id}`} 
                  ent={l} 
                  canEdit={isEditMode} 
                  onManage={setInspectingKindred}
                  onImageClick={setEnlargedImage} 
                />
              ))}
            </div>
          </div>
        )}

        {showInactive && deceased.length > 0 && (
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Deceased</h2>
              <div className={`${styles.divider} ${styles.dividerMain}`}></div>
            </div>
            <div className={styles.courtGrid}>
              {deceased.map(d => (
                <MemberCard 
                  key={`${d.type}-${d.id}`} 
                  ent={d} 
                  canEdit={isEditMode} 
                  onManage={setInspectingKindred}
                  onImageClick={setEnlargedImage} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty Search Result State */}
        {filteredRoster.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            <FaGlyph name="fa-magnifying-glass" size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.25rem', color: 'var(--on-surface)', marginBottom: '0.5rem' }}>No Kindred Found</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Try refining your search query or clan filter.</p>
          </div>
        )}

        {/* Kindred Court Inspector Modal */}
        <AnimatePresence>
          {activeInspectedKindred && (
            <KindredInspectorModal
              kindred={activeInspectedKindred}
              onClose={() => setInspectingKindred(null)}
              update={update}
              baseUrl={baseUrl}
            />
          )}
        </AnimatePresence>

        {/* Image Lightbox Modal */}
        {enlargedImage && (
          <div className={styles.lightboxOverlay} onClick={() => setEnlargedImage(null)}>
            <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closeLightboxBtn} onClick={() => setEnlargedImage(null)} title="Close image">
                <FaGlyph name="fa-xmark" size={14} />
              </button>
              <img src={enlargedImage} alt="Enlarged portrait" className={styles.lightboxImage} />
            </div>
          </div>
        )}
      </div>
    </Skeleton>
  );
}

function MemberCard({ ent, specialClass = "", canEdit, onManage, onImageClick }) {
  const { user } = useContext(AuthCtx);

  const clan = ent.clan;
  const clanRules = getClanThemeRules(clan);
  const clanPalette = getClanPalette(clan);
  const clanBg = clanBackground(clan);
  const clanTintHex = clanTint(clan);

  const primaryColor = clanRules?.primaryAccent || clanPalette?.[0] || clanTintHex || '#8a0f1a';
  const secondaryColor = clanRules?.secondaryAccent || clanPalette?.[1] || '#c30011';
  const borderColor = clanRules?.border || clanPalette?.[2] || '#2f3138';
  const textColor = clanRules?.textColor || clanPalette?.[3] || '#e8e8ed';
  const surfaceColor = clanRules?.surface || clanPalette?.[4] || '#141417';
  const symbolColor = clanRules?.symbolColor || primaryColor;

  const prefix = ent.is_ex ? "Ex " : "";
  const primaryTitle = (ent.titles && ent.titles.length > 0) ? `${prefix}${ent.titles[0]}` : null;
  const baseUrl = import.meta.env.VITE_API_URL || '';
  let avatarUrl = null;
  if (ent.type === 'player' && ent.user_id) avatarUrl = `${baseUrl}/users/${ent.user_id}/avatar`;
  else if (ent.type === 'npc') avatarUrl = `${baseUrl}/npcs/${ent.id}/avatar`;

  const clanLogoUrl = symlogoWhite(clan); 
  const clanTextUrl = textlogoWhite(clan);

  const hiddenClass = ent.is_hidden ? styles.hiddenCard : "";
  
  let imgClass = styles.sharpImg;
  if (ent.is_bloodhunted) {
    imgClass = `${styles.sharpImg} ${styles.imgBloodhunted}`;
  } else if (ent.is_deceased) {
    imgClass = `${styles.sharpImg} ${styles.imgDeceased}`;
  } else if (ent.is_missing || ent.is_exiled || ent.is_left || ent.is_called) {
    imgClass = `${styles.sharpImg} ${styles.grayscale}`;
  }

  const baseCardClass = ent.is_bloodhunted ? styles.bloodhuntCard : styles.glassCard;

  const cardStyle = {
    '--card-clan-primary': primaryColor,
    '--card-clan-secondary': secondaryColor,
    '--card-clan-border': borderColor,
    '--card-clan-text': textColor,
    '--card-clan-surface': surfaceColor,
    '--card-clan-symbol': symbolColor,
  };

  return (
    <motion.div 
      variants={itemVariants} 
      className={`${baseCardClass} ${specialClass} ${hiddenClass}`} 
      style={cardStyle}
      initial="hidden" 
      whileInView="show" 
      viewport={{ once: true, amount: 0.1 }}
    >
      {/* Clan Atmospheric Background Layer */}
      {clanBg && (
        <div 
          className={styles.cardClanBackground} 
          style={{ backgroundImage: `url(${clanBg})` }}
          aria-hidden="true"
        />
      )}

      {/* Atmospheric Clan Gradient Overlay */}
      <div className={styles.cardAtmosphericOverlay} aria-hidden="true" />

      {ent.is_bloodhunted && (
        <div className={styles.bloodhuntIcon}>
          <FaGlyph name="fa-triangle-exclamation" size={16} />
        </div>
      )}
      
      {/* Clan Symbol Watermark */}
      {clanLogoUrl && (
        <div 
          className={styles.cardWatermark} 
          style={{ backgroundImage: `url(${clanLogoUrl})` }}
          aria-hidden="true"
        />
      )}

      <div className={styles.imgContainer}>
        {ent.type === 'player' || ent.type === 'npc' ? (
          <div className={styles.imgWrapper} onClick={() => onImageClick(avatarUrl)}>
            <Avatar 
               userId={ent.type === 'player' ? ent.user_id : null} 
               npcId={ent.type === 'npc' ? ent.id : null}
               hasAvatar={ent.has_avatar}
               clan={clan}
               fallback={clanLogoUrl || '/img/ATT-logo(1).webp'}
               size="100%" 
               editable={false}
               style={{ width: '100%', height: '100%', borderRadius: 0 }} 
               imgClassName={imgClass} 
            />
            {ent.is_bloodhunted && <div className={styles.targetLabel}>Target</div>}
          </div>
        ) : (
          <div className={styles.imgPlaceholder}>
            {clan ? (
              <>
                <ClanSymbol clan={clan} size={36} color={symbolColor} style={{ marginBottom: 4 }} />
                {clanTextUrl ? (
                  <div style={{ width: '100%', height: '16px', display: 'flex', justifyContent: 'center', marginBottom: '2px' }}>
                    <img src={clanTextUrl} alt={clan} style={{ maxWidth: '80%', height: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <span style={{ color: 'var(--card-clan-text, #e8e8ed)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.65rem' }}>{clan}</span>
                )}
              </>
            ) : (
              <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>No Clan</span>
            )}
            <span style={{ fontSize: '0.6rem', marginTop: '4px', opacity: 0.7 }}>NO PHOTO</span>
          </div>
        )}
      </div>

      <div className={styles.infoCol}>
        <div className={styles.name}>
          {primaryTitle && <span className={styles.honorific}>{primaryTitle}</span>}
          {ent.name}
          {user && String(ent.user_id) === String(user.id) && (
            <span style={{ marginLeft: '8px', fontSize: '0.65em', color: '#60a5fa', fontWeight: 'bold' }}>(YOU)</span>
          )}
        </div>

        <div className={styles.tags}>
          {clan && (
            <span className={styles.tagClan}>
              <ClanSymbol clan={clan} size={13} color={symbolColor} style={{ marginRight: 5 }} />
              {clanTextUrl ? (
                <img src={clanTextUrl} alt={clan} className={styles.tagClanLogoImg} />
              ) : (
                <span>{clan}</span>
              )}
            </span>
          )}
          {(ent.titles || []).filter((_, i) => i > 0 || !primaryTitle).map(t => (
            <span key={t} className={styles.tagSect}>{prefix}{t}</span>
          ))}
          {!!ent.is_ex && <span className={styles.tagSect}>EX ROLE</span>}
          {!!ent.is_hidden && <span className={styles.tagSect}>HIDDEN</span>}
          {!!ent.is_deceased && <span className={styles.tagSect}>DECEASED</span>}
          {!!ent.is_called && <span className={styles.tagSect}>CALLED</span>}
          {!!ent.is_missing && <span className={styles.tagSect}>MISSING</span>}
          {!!ent.is_exiled && <span className={styles.tagSect}>EXILED</span>}
          {!!ent.is_left && <span className={styles.tagSect}>LEFT</span>}
        </div>

        {ent.bio && <p className={styles.description}>{ent.bio}</p>}

        <div className={styles.footer} style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
          <div className={styles.statusDrops}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span 
                key={i} 
                style={{ 
                  color: ent.is_bloodhunted ? '#ef4444' : primaryColor,
                  opacity: i < (ent.status !== undefined && ent.status !== null ? Number(ent.status) : 1) ? 1 : 0.25,
                  filter: i < (ent.status !== undefined && ent.status !== null ? Number(ent.status) : 1) ? `drop-shadow(0 0 3px ${primaryColor}88)` : 'none'
                }}
              >
                ●
              </span>
            ))}
            {(ent.titles || []).includes("Keeper") && (
              <span className={styles.keeperSubtitle} style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                (In Elysium: ●●●●●)
              </span>
            )}
          </div>
        </div>

        {canEdit && (
          <button 
            type="button" 
            className={styles.manageCardBtn} 
            onClick={() => onManage(ent)}
            title={`Manage ${ent.name}`}
          >
            <FaGlyph name="fa-pen-to-square" size={13} />
            Manage Kindred
          </button>
        )}
      </div>
    </motion.div>
  );
}

function KindredInspectorModal({ kindred, onClose, update, baseUrl }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const clan = kindred.clan;
  const clanRules = getClanThemeRules(clan);
  const clanPalette = getClanPalette(clan);
  const clanTintHex = clanTint(clan);
  const modalPrimary = clanRules?.primaryAccent || clanPalette?.[0] || clanTintHex || '#8a0f1a';

  let avatarUrl = null;
  if (kindred.type === 'player' && kindred.user_id) avatarUrl = `${baseUrl}/users/${kindred.user_id}/avatar`;
  else if (kindred.type === 'npc') avatarUrl = `${baseUrl}/npcs/${kindred.id}/avatar`;
  const clanLogoUrl = symlogoWhite(clan);

  const currentTitles = kindred.titles || [];
  const statusVal = kindred.status !== undefined && kindred.status !== null ? Number(kindred.status) : 1;

  const STATUS_LEVELS = [
    { value: 0, label: "Status 0: Outcast" },
    { value: 1, label: "Status 1: Acknowledged" },
    { value: 2, label: "Status 2: Recognized" },
    { value: 3, label: "Status 3: Respected" },
    { value: 4, label: "Status 4: Influential" },
    { value: 5, label: "Status 5: Eminent" }
  ];

  const currentLevelLabel = STATUS_LEVELS.find(s => s.value === statusVal)?.label || `Status ${statusVal}`;

  const toggleTitle = (title) => {
    let newTitles;
    if (currentTitles.includes(title)) {
      newTitles = currentTitles.filter(t => t !== title);
    } else {
      newTitles = [...currentTitles, title];
    }
    update(kindred.id, kindred.type, 'titles', newTitles);
  };

  const setStatus = (val) => {
    const clamped = Math.max(0, Math.min(5, val));
    update(kindred.id, kindred.type, 'status', clamped);
  };

  const setStanding = (stateKey) => {
    if (stateKey === 'active') {
      update(kindred.id, kindred.type, 'is_bloodhunted', false);
      update(kindred.id, kindred.type, 'is_deceased', false);
      update(kindred.id, kindred.type, 'is_missing', false);
      update(kindred.id, kindred.type, 'is_exiled', false);
      update(kindred.id, kindred.type, 'is_called', false);
      update(kindred.id, kindred.type, 'is_left', false);
      return;
    }
    if (stateKey === 'is_bloodhunted') {
      update(kindred.id, kindred.type, 'is_bloodhunted', !kindred.is_bloodhunted);
      return;
    }
    const isCurrentlySet = !!kindred[stateKey];
    if (isCurrentlySet) {
      update(kindred.id, kindred.type, stateKey, false);
    } else {
      ['is_deceased', 'is_missing', 'is_exiled', 'is_called', 'is_left'].forEach(k => {
        if (k !== stateKey && kindred[k]) {
          update(kindred.id, kindred.type, k, false);
        }
      });
      update(kindred.id, kindred.type, stateKey, true);
    }
  };

  const isStandingActive = !kindred.is_bloodhunted && 
    !kindred.is_deceased && 
    !kindred.is_called && 
    !kindred.is_missing && 
    !kindred.is_exiled && 
    !kindred.is_left;

  return (
    <div className={styles.inspectorOverlay} onClick={onClose}>
      <motion.div 
        className={styles.inspectorModal} 
        style={{ '--modal-primary': modalPrimary }}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
      >
        {/* Modal Header */}
        <div className={styles.inspectorHeader}>
          <div className={styles.inspectorAvatarWrap}>
            <Avatar 
              userId={kindred.type === 'player' ? kindred.user_id : null} 
              npcId={kindred.type === 'npc' ? kindred.id : null}
              hasAvatar={kindred.has_avatar}
              clan={clan}
              fallback={clanLogoUrl || '/img/ATT-logo(1).webp'}
              size="100%" 
              editable={false}
              style={{ width: '100%', height: '100%', borderRadius: 0 }} 
            />
          </div>

          <div className={styles.inspectorHeaderInfo}>
            <div className={styles.inspectorTitleRow}>
              <h3 className={styles.inspectorKindredName}>{kindred.name}</h3>
              <span className={styles.inspectorTypeBadge}>
                {kindred.type === 'player' ? 'Player' : 'NPC'}
              </span>
            </div>
            <div className={styles.inspectorClanSubtitle}>
              {clan && <ClanSymbol clan={clan} size={14} color={modalPrimary} />}
              <span>{clan || 'No Clan'}</span>
              {currentTitles.length > 0 && (
                <span style={{ color: 'var(--on-surface-variant)', marginLeft: '0.25rem' }}>
                  • {kindred.is_ex ? 'Ex ' : ''}{currentTitles.join(', ')}
                </span>
              )}
            </div>
          </div>

          <button 
            type="button" 
            className={styles.inspectorCloseBtn} 
            onClick={onClose}
            title="Close inspector"
          >
            <FaGlyph name="fa-xmark" size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.inspectorBody}>
          
          {/* Status Fieldset */}
          <fieldset className={styles.inspectorFieldset}>
            <legend className={styles.inspectorLegend}>Prestige and Status</legend>
            <div className={styles.statusPickerRow}>
              <div className={styles.statusDotsRow}>
                <button 
                  type="button" 
                  className={styles.statusStepBtn}
                  onClick={() => setStatus(statusVal - 1)}
                  disabled={statusVal <= 0}
                  title="Decrease status"
                  aria-label="Decrease status"
                >
                  <FaGlyph name="fa-minus" size={12} />
                </button>

                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`${styles.statusPipBtn} ${lvl <= statusVal ? styles.statusPipBtnActive : ''}`}
                    onClick={() => setStatus(lvl === statusVal ? 0 : lvl)}
                    title={STATUS_LEVELS[lvl].label}
                    aria-label={STATUS_LEVELS[lvl].label}
                  >
                    ●
                  </button>
                ))}

                <button 
                  type="button" 
                  className={styles.statusStepBtn}
                  onClick={() => setStatus(statusVal + 1)}
                  disabled={statusVal >= 5}
                  title="Increase status"
                  aria-label="Increase status"
                >
                  <FaGlyph name="fa-plus" size={12} />
                </button>
              </div>

              <div className={styles.statusLevelText}>
                {currentLevelLabel}
              </div>
            </div>
          </fieldset>

          {/* Court Titles Fieldset */}
          <fieldset className={styles.inspectorFieldset}>
            <legend className={styles.inspectorLegend}>Court Titles</legend>
            
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>
              High Offices
            </span>
            <div className={styles.titleChipsGrid}>
              {HIGH_OFFICES.map(title => {
                const isActive = currentTitles.includes(title);
                return (
                  <button
                    key={title}
                    type="button"
                    className={`${styles.chipToggleBtn} ${isActive ? styles.chipToggleBtnActive : ''}`}
                    onClick={() => toggleTitle(title)}
                  >
                    <span>{title}</span>
                    {isActive ? <FaGlyph name="fa-check" size={11} /> : null}
                  </button>
                );
              })}
            </div>

            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>
              Court Officers
            </span>
            <div className={styles.titleChipsGrid}>
              {COURT_OFFICERS.map(title => {
                const isActive = currentTitles.includes(title);
                return (
                  <button
                    key={title}
                    type="button"
                    className={`${styles.chipToggleBtn} ${isActive ? styles.chipToggleBtnActive : ''}`}
                    onClick={() => toggleTitle(title)}
                  >
                    <span>{title}</span>
                    {isActive ? <FaGlyph name="fa-check" size={11} /> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Kindred Standing Fieldset */}
          <fieldset className={styles.inspectorFieldset}>
            <legend className={styles.inspectorLegend}>Kindred Standing</legend>
            <div className={styles.standingGrid}>
              <button
                type="button"
                className={`${styles.stateChipBtn} ${isStandingActive ? styles.stateChipActiveOther : ''}`}
                onClick={() => setStanding('active')}
              >
                <span>Active Kindred</span>
                {isStandingActive ? <FaGlyph name="fa-check" size={11} /> : null}
              </button>

              <button
                type="button"
                className={`${styles.stateChipBtn} ${kindred.is_bloodhunted ? styles.stateChipActiveBloodhunt : ''}`}
                onClick={() => setStanding('is_bloodhunted')}
              >
                <span>Blood Hunt</span>
                {Boolean(kindred.is_bloodhunted) ? <FaGlyph name="fa-triangle-exclamation" size={12} /> : null}
              </button>

              {[
                { key: 'is_deceased', label: 'Deceased' },
                { key: 'is_called', label: 'Called' },
                { key: 'is_missing', label: 'Missing' },
                { key: 'is_exiled', label: 'Exiled' },
                { key: 'is_left', label: 'Departed, Left' }
              ].map(st => {
                const isActive = !!kindred[st.key];
                return (
                  <button
                    key={st.key}
                    type="button"
                    className={`${styles.stateChipBtn} ${isActive ? styles.stateChipActiveOther : ''}`}
                    onClick={() => setStanding(st.key)}
                  >
                    <span>{st.label}</span>
                    {isActive ? <FaGlyph name="fa-check" size={11} /> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Modifiers and Visibility Fieldset */}
          <fieldset className={styles.inspectorFieldset}>
            <legend className={styles.inspectorLegend}>Modifiers and Visibility</legend>
            
            <div className={styles.toggleRow}>
              <div className={styles.toggleLabel}>
                <span className={styles.toggleTitle}>Ex Role: Former Title Holder</span>
                <span className={styles.toggleDesc}>Displays an Ex prefix before offices while keeping title record</span>
              </div>
              <input
                type="checkbox"
                checked={!!kindred.is_ex}
                onChange={(e) => update(kindred.id, kindred.type, 'is_ex', e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleLabel}>
                <span className={styles.toggleTitle}>Hidden from Public Roster</span>
                <span className={styles.toggleDesc}>Keeps this kindred visible only to Storyteller admins</span>
              </div>
              <input
                type="checkbox"
                checked={!!kindred.is_hidden}
                onChange={(e) => update(kindred.id, kindred.type, 'is_hidden', e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)', display: 'block', marginBottom: '0.35rem' }}>
                Athens Portrait Filename or URL
              </span>
              <input
                type="text"
                placeholder="e.g. Athens portrait filename or relative path"
                defaultValue={kindred.image_url || ''}
                onBlur={(e) => {
                  const newVal = e.target.value.trim();
                  if (newVal !== (kindred.image_url || '')) {
                    update(kindred.id, kindred.type, 'image_url', newVal);
                  }
                }}
                className={styles.inspectorInput}
              />
            </div>
          </fieldset>

        </div>

        {/* Modal Footer */}
        <div className={styles.inspectorFooter}>
          <button 
            type="button" 
            className={styles.inspectorDoneBtn} 
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}