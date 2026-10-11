import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/court/CourtActions.module.css';
import Avatar from '../../components/Avatar';
import ClanSymbol from '../../components/ClanSymbol';
import FaGlyph from '../../ui/FaGlyph';

const Icon = ({ name, size = 18 }) => (
  <span className="material-symbols-outlined" style={{ fontSize: size }} aria-hidden="true">{name}</span>
);

function findRosterEntry(hunt, rosterList = []) {
  if (!rosterList || !rosterList.length) return null;
  if (hunt.target_id && hunt.target_type) {
    const byIdAndType = rosterList.find(
      r => String(r.id) === String(hunt.target_id) && r.type === hunt.target_type
    );
    if (byIdAndType) return byIdAndType;
  }
  if (hunt.target_id) {
    const byId = rosterList.find(r => String(r.id) === String(hunt.target_id));
    if (byId) return byId;
  }
  if (hunt.target_name) {
    const cleanHuntName = hunt.target_name.trim().toLowerCase();
    const byName = rosterList.find(
      r => r.name && r.name.trim().toLowerCase() === cleanHuntName
    );
    if (byName) return byName;
  }
  return null;
}

function formatExpiryDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${mins}`;
  } catch {
    return null;
  }
}


/**
 * Offers to bring account roles in line with the Hierarchy: whoever holds a
 * main-court office should be a court user, and a court user holding none
 * should not. `items` come from the server (camarilla.js courtAccessMismatches).
 * Nothing changes without the Storyteller ticking it.
 */
export function CourtAccessModal({ items, onClose }) {
  const [picked, setPicked] = useState(() => new Set(items.map(i => i.user_id)));
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    try {
      for (const i of items.filter(x => picked.has(x.user_id))) {
        await api.patch(`/admin/users/${i.user_id}`, { role: i.suggested_role });
      }
      onClose();
    } catch (e) {
      alert(formatApiError(e, 'A role could not be changed.'));
    } finally { setBusy(false); }
  };

  const toggle = (id) => setPicked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 11000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div className={styles.panel} style={{ maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Court access">
        <h2 className={styles.panelTitle}><Icon name="admin_panel_settings" /> Court access</h2>
        <p className={styles.hint}>Holding a main-court office (Prince, Seneschal, Sheriff, Keeper, Harpy, Assistant Harpy, Hound, Shadow, Scourge) is what makes an account a court user, which opens Court Actions. Former office holders (Ex) do not count.</p>
        <div className={styles.list}>
          {items.map(i => (
            <label key={i.user_id} className={styles.item} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={picked.has(i.user_id)} onChange={() => toggle(i.user_id)} style={{ width: 18, height: 18, marginTop: 4 }} />
              <span>
                <b>{i.name}</b>
                <span className={styles.itemMeta} style={{ display: 'block' }}>
                  {i.suggested_role === 'courtuser'
                    ? `Holds ${i.offices.join(', ')}. Make their account a court user.`
                    : 'Holds no main-court office. Return their account to a regular user.'}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className={styles.row} style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button className={styles.btn} onClick={onClose} disabled={busy}>Not now</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={apply} disabled={busy || !picked.size}>Apply</button>
        </div>
      </div>
    </div>
  );
}

/** Animated slide drawer displaying detailed Blood Hunt edicts and grounds */
export function BloodHuntDrawer({ isOpen, onClose, hunts = [], roster = [] }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'relative', zIndex: 12000 }}>
          <motion.div
            className={styles.drawerOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.aside
            className={styles.drawerSheet}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            role="dialog"
            aria-modal="true"
            aria-label="Blood Hunt Decrees"
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.drawerMobileHandle}>
              <div className={styles.drawerMobileHandleBar} />
            </div>

            <div className={styles.drawerHeader}>
              <div className={styles.drawerHeaderLead}>
                <div className={styles.drawerHeaderIcon}>
                  <FaGlyph name="fa-droplet" size={20} />
                </div>
                <div>
                  <h3 className={styles.drawerTitle}>Blood Hunt Decrees</h3>
                  <p className={styles.drawerSubtitle}>
                    Official Camarilla Edicts of Final Death
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={onClose}
                aria-label="Close Decrees"
              >
                <FaGlyph name="fa-xmark" size={16} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.lexNotice}>
                <div className={styles.lexNoticeTitle}>
                  <FaGlyph name="fa-triangle-exclamation" size={14} />
                  Lex Talionis Proclamation
                </div>
                <div>
                  The Blood Hunt is the absolute decree of the Camarilla. The protection of the Traditions is stripped from the condemned. Their blood is forfeit to any Kindred of the domain. Diablerie remains strictly forbidden unless expressly proclaimed by the Prince.
                </div>
              </div>

              {hunts.map(h => {
                const target = findRosterEntry(h, roster);
                const clan = target?.clan;
                const expiryText = formatExpiryDate(h.expires_at);

                return (
                  <article key={h.id} className={styles.huntDecreeCard}>
                    <div className={styles.huntDecreeHero}>
                      <div className={styles.huntDecreeAvatarWrap}>
                        <Avatar
                          userId={target?.type === 'player' ? target.user_id : null}
                          npcId={target?.type === 'npc' ? target.id : null}
                          hasAvatar={target?.has_avatar}
                          clan={clan}
                          fallback="/img/ATT-logo(1).webp"
                          size={62}
                          editable={false}
                          style={{ width: '100%', height: '100%', borderRadius: 0 }}
                        />
                      </div>
                      <div className={styles.huntDecreeInfo}>
                        <div className={styles.huntDecreeNameRow}>
                          <h4 className={styles.huntDecreeTargetName}>{h.target_name}</h4>
                          {clan && (
                            <div className={styles.huntDecreeSymbolWrap} title="Clan Crest">
                              <ClanSymbol clan={clan} size={28} />
                            </div>
                          )}
                        </div>
                        <div className={styles.huntDecreeMetaRow}>
                          <span className={styles.huntDecreeBadge}>
                            Marked for Final Death
                          </span>
                          {expiryText && (
                            <span>Valid until: {expiryText}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.huntDecreeReasonSection}>
                      <div className={styles.huntDecreeReasonHeading}>
                        Decree and Proclaimed Grounds:
                      </div>
                      <div className={styles.huntDecreeReasonBox}>
                        {h.reason}
                      </div>
                    </div>

                    <div className={styles.huntDecreeOrderNotice}>
                      <span>By order of the Prince</span>
                      {h.ratified_by_name && (
                        <span>Ratified by: {h.ratified_by_name}</span>
                      )}
                      {h.proposed_by_name && (
                        <span>Proposed by: {h.proposed_by_name} {h.proposed_office ? `(${h.proposed_office})` : ''}</span>
                      )}
                    </div>

                    <div className={styles.huntDecreeDiablerieNotice}>
                      Diablerie Warning: Committing Amaranth without express Princely dispensation is punishable by Final Death.
                    </div>
                  </article>
                );
              })}
            </div>

            <div className={styles.drawerFooter}>
              <button
                type="button"
                className={styles.huntTriggerBtn}
                onClick={onClose}
              >
                Close Decrees
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Active Blood Hunts compact drawer bar and the Sheriff's board */
export function CourtNotices({ roster = [] }) {
  const [hunts, setHunts] = useState([]);
  const [wanted, setWanted] = useState([]);
  const [internalRoster, setInternalRoster] = useState(roster);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    api.get('/court-actions/blood-hunts')
      .then(({ data }) => setHunts((data.hunts || []).filter(h => h.status === 'active')))
      .catch(() => {});
    api.get('/court-actions/wanted')
      .then(({ data }) => setWanted(data.wanted || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (roster && roster.length > 0) {
      setInternalRoster(roster);
    } else {
      api.get('/camarilla/roster')
        .then(({ data }) => setInternalRoster(data.roster || []))
        .catch(() => {});
    }
  }, [roster]);

  const activeRoster = useMemo(() => {
    return (roster && roster.length > 0) ? roster : internalRoster;
  }, [roster, internalRoster]);

  if (!hunts.length && !wanted.length) return null;

  return (
    <section style={{ margin: '1rem 0' }} aria-label="Proclamations of the court">
      {hunts.length > 0 && (
        <>
          <div
            className={styles.huntBanner}
            onClick={() => setIsDrawerOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsDrawerOpen(true); }}
            aria-label="Open Blood Hunt Decrees Drawer"
          >
            <div className={styles.huntBannerLead}>
              <div className={styles.huntBadgeIcon}>
                <FaGlyph name="fa-droplet" size={20} />
              </div>
              <div className={styles.huntBannerTitles}>
                <div className={styles.huntBannerTitle}>
                  Blood Hunt
                  <span className={styles.huntBannerCount}>
                    {hunts.length} Active Decrees
                  </span>
                </div>
                <div className={styles.huntBannerSubtitle}>
                  Lex Talionis: Final Death Sentence
                </div>
              </div>
            </div>

            <div className={styles.huntTargetsRow} onClick={e => e.stopPropagation()}>
              {hunts.map(h => {
                const target = findRosterEntry(h, activeRoster);
                const clan = target?.clan;

                return (
                  <div
                    key={h.id}
                    className={styles.huntTargetChip}
                    onClick={() => setIsDrawerOpen(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsDrawerOpen(true); }}
                    title={`View decrees for ${h.target_name}`}
                  >
                    <div className={styles.huntTargetAvatarWrap}>
                      <Avatar
                        userId={target?.type === 'player' ? target.user_id : null}
                        npcId={target?.type === 'npc' ? target.id : null}
                        hasAvatar={target?.has_avatar}
                        clan={clan}
                        fallback="/img/ATT-logo(1).webp"
                        size={34}
                        editable={false}
                        style={{ width: '100%', height: '100%', borderRadius: 0 }}
                      />
                    </div>
                    <span className={styles.huntTargetName}>{h.target_name}</span>
                    {clan && (
                      <span className={styles.huntTargetSymbolWrap} title="Clan Symbol">
                        <ClanSymbol clan={clan} size={20} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className={styles.huntTriggerBtn}
              onClick={(e) => {
                e.stopPropagation();
                setIsDrawerOpen(true);
              }}
              aria-label="View Decrees"
            >
              <FaGlyph name="fa-scroll" size={14} />
              View Decrees
            </button>
          </div>

          <BloodHuntDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            hunts={hunts}
            roster={activeRoster}
          />
        </>
      )}

      {wanted.length > 0 && (
        <div className={styles.panel} style={{ marginTop: hunts.length > 0 ? '1rem' : 0 }}>
          <h3 className={styles.panelTitle}><Icon name="person_search" /> Sought by the Sheriff</h3>
          <div className={styles.list}>
            {wanted.map(w => (
              <div key={w.id} className={styles.item}>
                <div className={styles.itemName}>{w.target_name}</div>
                <p className={styles.itemBody}>{w.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

