// src/features/character/WishlistSection.jsx
// Wishlist section for XP Shop: allows players to bookmark powers and rituals
// for fast quick reference, XP planning, and future progression.

import React, { useState, useMemo, useCallback } from 'react';
import styles from '../../styles/CharacterView.module.css';
import { DISCIPLINES, ALL_DISCIPLINE_NAMES, iconPath } from '../../data/disciplines';
import { RITUALS } from '../../data/rituals';
import { XP_RULES } from '../../utils/xpCosts';
import FaGlyph from '../../ui/FaGlyph';

// Helper to look up full canon object for any power or ritual
export function findCatalogItem(itemType, discipline, itemId) {
  if (itemType === 'power') {
    const disc = DISCIPLINES?.[discipline];
    if (disc?.levels) {
      for (const list of Object.values(disc.levels)) {
        const found = list.find(p => p.id === itemId);
        if (found) return found;
      }
    }
    // Fallback: search all disciplines
    for (const d of Object.values(DISCIPLINES || {})) {
      if (d?.levels) {
        for (const list of Object.values(d.levels)) {
          const found = list.find(p => p.id === itemId);
          if (found) return found;
        }
      }
    }
  } else if (itemType === 'ritual') {
    const norm = String(discipline || '').toLowerCase();
    const cat = norm.includes('oblivion') ? 'oblivion' : 'blood_sorcery';
    const ritLevels = RITUALS?.[cat]?.levels || {};
    for (const list of Object.values(ritLevels)) {
      const found = list.find(r => r.id === itemId);
      if (found) return found;
    }
    // Search both categories
    for (const c of ['blood_sorcery', 'oblivion']) {
      for (const list of Object.values(RITUALS?.[c]?.levels || {})) {
        const found = list.find(r => r.id === itemId);
        if (found) return found;
      }
    }
  }
  return null;
}

export default function WishlistSection({
  wishlist = [],
  wishlistKeySet = new Set(),
  onToggleWishlist,
  onRemoveWishlist,
  sheet = {},
  clan = '',
  currentXp = 0,
  searchQuery = '',
}) {
  const [filterType, setFilterType] = useState('all'); // 'all', 'power', 'ritual'
  const [expandedId, setExpandedId] = useState(null);
  const [showCatalogBrowser, setShowCatalogBrowser] = useState(false);

  // Catalog browser filter states
  const [catalogType, setCatalogType] = useState('power');
  const [catalogDiscipline, setCatalogDiscipline] = useState('Animalism');
  const [catalogLevel, setCatalogLevel] = useState('all');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Sets of known items on sheet for instant ownership check
  const knownRitualIds = useMemo(() => new Set([
    ...(sheet.rituals?.blood_sorcery || []).map(r => r.id),
    ...(sheet.rituals?.oblivion || []).map(r => r.id),
  ]), [sheet.rituals]);

  const knownPowerIds = useMemo(() => {
    const s = new Set();
    const powers = sheet.disciplinePowers || {};
    Object.values(powers).flat().forEach(p => {
      if (p?.id) s.add(String(p.id).toLowerCase());
      if (p?.name) s.add(String(p.name).toLowerCase());
    });
    return s;
  }, [sheet.disciplinePowers]);

  const isItemOwned = useCallback((itemType, itemId, name) => {
    if (itemType === 'ritual') {
      return knownRitualIds.has(itemId);
    }
    const idKey = String(itemId || '').toLowerCase();
    const nameKey = String(name || '').toLowerCase();
    return knownPowerIds.has(idKey) || knownPowerIds.has(nameKey);
  }, [knownRitualIds, knownPowerIds]);

  // Filtered wishlist items
  const filteredWishlist = useMemo(() => {
    let items = wishlist.map(item => {
      const fullData = findCatalogItem(item.item_type, item.discipline, item.item_id) || {};
      const owned = isItemOwned(item.item_type, item.item_id, item.name);
      return {
        ...item,
        fullData,
        isOwned: owned,
      };
    });

    if (filterType !== 'all') {
      items = items.filter(i => i.item_type === filterType);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(i =>
        (i.name && i.name.toLowerCase().includes(q)) ||
        (i.discipline && i.discipline.toLowerCase().includes(q)) ||
        (i.fullData?.system && i.fullData.system.toLowerCase().includes(q)) ||
        (i.fullData?.notes && i.fullData.notes.toLowerCase().includes(q)) ||
        (i.fullData?.effect && i.fullData.effect.toLowerCase().includes(q))
      );
    }

    return items;
  }, [wishlist, filterType, searchQuery, isItemOwned]);

  // Catalog items available for browsing
  const browserItems = useMemo(() => {
    const list = [];
    if (catalogType === 'power') {
      const disc = DISCIPLINES?.[catalogDiscipline];
      if (disc?.levels) {
        Object.entries(disc.levels).forEach(([lvlStr, powers]) => {
          const lvl = parseInt(lvlStr, 10);
          if (catalogLevel === 'all' || catalogLevel === String(lvl)) {
            powers.forEach(p => {
              list.push({
                item_type: 'power',
                item_id: p.id,
                name: p.name,
                discipline: catalogDiscipline,
                level: lvl,
                fullData: p,
              });
            });
          }
        });
      }
    } else {
      const cat = catalogDiscipline === 'Oblivion Ceremonies' ? 'oblivion' : 'blood_sorcery';
      const discName = cat === 'oblivion' ? 'Oblivion' : 'Blood Sorcery';
      const ritLevels = RITUALS?.[cat]?.levels || {};
      Object.entries(ritLevels).forEach(([lvlStr, rituals]) => {
        const lvl = parseInt(lvlStr, 10);
        if (catalogLevel === 'all' || catalogLevel === String(lvl)) {
          rituals.forEach(r => {
            list.push({
              item_type: 'ritual',
              item_id: r.id,
              name: r.name,
              discipline: discName,
              level: lvl,
              fullData: r,
            });
          });
        }
      });
    }

    if (catalogSearch) {
      const q = catalogSearch.toLowerCase().trim();
      return list.filter(i =>
        (i.name && i.name.toLowerCase().includes(q)) ||
        (i.fullData?.system && i.fullData.system.toLowerCase().includes(q)) ||
        (i.fullData?.effect && i.fullData.effect.toLowerCase().includes(q)) ||
        (i.fullData?.notes && i.fullData.notes.toLowerCase().includes(q))
      );
    }

    return list;
  }, [catalogType, catalogDiscipline, catalogLevel, catalogSearch]);

  const powerCount = useMemo(() => wishlist.filter(i => i.item_type === 'power').length, [wishlist]);
  const ritualCount = useMemo(() => wishlist.filter(i => i.item_type === 'ritual').length, [wishlist]);

  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Intro Header */}
      <div style={{
        padding: '16px 20px',
        background: 'rgba(225, 29, 72, 0.05)',
        border: '1px solid color-mix(in srgb, var(--tint) 35%, transparent)',
        borderRadius: '8px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--tint)', fontSize: '22px' }}>bookmark</span>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-title)', fontSize: '18px', color: 'var(--text-color)' }}>
              Wishlist Quick Reference
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Bookmark powers and rituals to inspect rules, roll pools, and plan your XP investments.
          </p>
        </div>

        <button
          type="button"
          className={styles.cta}
          onClick={() => setShowCatalogBrowser(prev => !prev)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {showCatalogBrowser ? 'close' : 'add'}
          </span>
          {showCatalogBrowser ? 'Close Catalog Browser' : 'Browse & Add to Wishlist'}
        </button>
      </div>

      {/* Catalog Browser Panel */}
      {showCatalogBrowser && (
        <div style={{
          padding: '16px',
          background: 'var(--surface-color, rgba(18, 18, 24, 0.95))',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--tint)', fontFamily: 'var(--font-title)' }}>
              Explore Full Rules Catalog
            </h4>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {browserItems.length} options matching filters
            </span>
          </div>

          {/* Catalog Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className={catalogType === 'power' ? styles.shopTabBtnActive : styles.shopTabBtn}
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={() => {
                  setCatalogType('power');
                  setCatalogDiscipline(ALL_DISCIPLINE_NAMES[0]);
                }}
              >
                Discipline Powers
              </button>
              <button
                type="button"
                className={catalogType === 'ritual' ? styles.shopTabBtnActive : styles.shopTabBtn}
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={() => {
                  setCatalogType('ritual');
                  setCatalogDiscipline('Blood Sorcery Rituals');
                }}
              >
                Rituals & Ceremonies
              </button>
            </div>

            <select
              className={styles.input}
              value={catalogDiscipline}
              onChange={(e) => setCatalogDiscipline(e.target.value)}
              style={{ flex: '1 1 180px', minWidth: '150px' }}
            >
              {catalogType === 'power' ? (
                ALL_DISCIPLINE_NAMES.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))
              ) : (
                <>
                  <option value="Blood Sorcery Rituals">Blood Sorcery Rituals</option>
                  <option value="Oblivion Ceremonies">Oblivion Ceremonies</option>
                </>
              )}
            </select>

            <select
              className={styles.input}
              value={catalogLevel}
              onChange={(e) => setCatalogLevel(e.target.value)}
              style={{ width: '110px' }}
            >
              <option value="all">All Levels</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
              <option value="5">Level 5</option>
            </select>

            <input
              type="text"
              className={styles.input}
              placeholder="Filter rules by name or text..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              style={{ flex: '2 1 200px' }}
            />
          </div>

          {/* Browser Items List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {browserItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No catalog items match current filters.
              </div>
            ) : (
              browserItems.map(item => {
                const key = `${item.item_type}:${item.item_id}`;
                const isWishlisted = wishlistKeySet.has(key);
                const isOwned = isItemOwned(item.item_type, item.item_id, item.name);

                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-color)',
                      border: isWishlisted ? '1px solid color-mix(in srgb, var(--tint) 60%, transparent)' : '1px solid var(--border-color)',
                      borderRadius: '6px',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span className="material-symbols-outlined" style={{ color: isWishlisted ? 'var(--tint)' : 'var(--text-muted)', fontSize: '18px' }}>
                        {isWishlisted ? 'bookmark' : 'bookmark_border'}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-color)', fontSize: '14px' }}>
                            {item.name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Level {item.level} : {item.discipline}
                          </span>
                          {isOwned && (
                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                              Known
                            </span>
                          )}
                        </div>
                        {item.fullData?.notes && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '500px' }}>
                            {item.fullData.notes}
                          </div>
                        )}
                        {item.fullData?.effect && !item.fullData?.notes && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '500px' }}>
                            {item.fullData.effect}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleWishlist?.({
                        item_type: item.item_type,
                        item_id: item.item_id,
                        name: item.name,
                        discipline: item.discipline,
                        level: item.level,
                      })}
                      style={{
                        background: isWishlisted ? 'rgba(225, 29, 72, 0.15)' : 'var(--surface-color)',
                        color: isWishlisted ? 'var(--tint)' : 'var(--text-color)',
                        border: isWishlisted ? '1px solid var(--tint)' : '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                        {isWishlisted ? 'check' : 'add'}
                      </span>
                      {isWishlisted ? 'Saved' : 'Add'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={filterType === 'all' ? styles.shopTabBtnActive : styles.shopTabBtn}
            onClick={() => setFilterType('all')}
            style={{ fontSize: '12.5px', padding: '6px 12px' }}
          >
            All Saved ({wishlist.length})
          </button>
          <button
            type="button"
            className={filterType === 'power' ? styles.shopTabBtnActive : styles.shopTabBtn}
            onClick={() => setFilterType('power')}
            style={{ fontSize: '12.5px', padding: '6px 12px' }}
          >
            Powers ({powerCount})
          </button>
          <button
            type="button"
            className={filterType === 'ritual' ? styles.shopTabBtnActive : styles.shopTabBtn}
            onClick={() => setFilterType('ritual')}
            style={{ fontSize: '12.5px', padding: '6px 12px' }}
          >
            Rituals ({ritualCount})
          </button>
        </div>

        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {filteredWishlist.length} {filteredWishlist.length === 1 ? 'item' : 'items'} displayed
        </span>
      </div>

      {/* Wishlist Items List */}
      {filteredWishlist.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: 'var(--bg-color)',
          border: '1px dashed var(--border-color)',
          borderRadius: '8px'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--text-muted)', marginBottom: '8px', opacity: 0.7 }}>
            bookmark_border
          </span>
          <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-color)', fontSize: '16px', fontFamily: 'var(--font-title)' }}>
            No Saved Items
          </h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
            Your wishlist is empty. Bookmark powers from the Disciplines and Rituals tabs or open the catalog browser above to save powers for quick reference.
          </p>
          <button
            type="button"
            className={styles.cta}
            onClick={() => setShowCatalogBrowser(true)}
            style={{ fontSize: '13px' }}
          >
            Explore Catalog Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredWishlist.map(item => {
            const isExpanded = expandedId === item.id;
            const full = item.fullData || {};
            const isOwned = item.isOwned;
            const cardClass = isOwned ? styles.powerCardOwned : styles.powerCardAvailable;

            return (
              <div key={item.id} className={cardClass}>
                <div
                  className={styles.powerCardHeaderRow}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  style={{ cursor: 'pointer', marginBottom: isExpanded ? '8px' : '0' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.item_type === 'power' && iconPath(item.discipline) && (
                      <img
                        src={iconPath(item.discipline)}
                        alt={item.discipline}
                        style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <div>
                      <div className={styles.powerCardTitleWrap}>
                        {isOwned && (
                          <span className="material-symbols-outlined" style={{ color: 'var(--tint)', fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>
                            check_circle
                          </span>
                        )}
                        <h3 className={styles.powerCardTitle}>
                          {item.name}
                        </h3>
                      </div>
                      <span className={styles.powerCardLevel}>
                        Level {item.level} : {item.discipline} • {item.item_type === 'power' ? 'Discipline Power' : 'Ritual or Ceremony'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isOwned ? (
                      <span style={{ fontSize: '11px', color: 'var(--tint)', background: 'rgba(225, 29, 72, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                        Known on sheet
                      </span>
                    ) : (
                      <span className={styles.shopCardPrice}>
                        {item.item_type === 'ritual' ? `${item.level * 3} XP` : `Level ${item.level}`}
                      </span>
                    )}

                    <button
                      type="button"
                      title="Remove from wishlist"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveWishlist?.(item.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        color: 'var(--tint)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                        bookmark
                      </span>
                    </button>

                    <span
                      className={`material-symbols-outlined ${styles.expandIcon}`}
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}
                    >
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Collapsible Details */}
                <div className={styles.shopCardContentWrap} style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}>
                  <div className={styles.shopCardContentInner} style={{ padding: 0 }}>
                    <div style={{ paddingTop: '8px', opacity: isExpanded ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                      <div className={styles.powerCardDesc}>
                        {/* Tags and Mechanics Grid */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                          {full.dice_pool && (
                            <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}>
                              <b>Dice Pool:</b> {full.dice_pool} {full.opposing_pool && full.opposing_pool !== 'None' ? `vs ${full.opposing_pool}` : ''}
                            </span>
                          )}
                          {full.difficulty && (
                            <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}>
                              <b>Difficulty:</b> {full.difficulty}
                            </span>
                          )}
                          {full.cost && (
                            <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}>
                              <b>Cost:</b> {full.cost}
                            </span>
                          )}
                          {full.duration && (
                            <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}>
                              <b>Duration:</b> {full.duration}
                            </span>
                          )}
                          {full.amalgam && (
                            <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px', color: 'var(--tint)' }}>
                              <b>Amalgam:</b> {full.amalgam}
                            </span>
                          )}
                          {full.prerequisite && (
                            <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}>
                              <b>Prerequisite:</b> {full.prerequisite}
                            </span>
                          )}
                          {full.prereq && !full.prerequisite && (
                            <span style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}>
                              <b>Prerequisite:</b> {full.prereq}
                            </span>
                          )}
                        </div>

                        {/* Effects and System Text */}
                        {full.effect && (
                          <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                            <b style={{ color: 'var(--text-color)' }}>Effect:</b> {full.effect}
                          </div>
                        )}
                        {full.system && (
                          <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                            <b style={{ color: 'var(--text-color)' }}>System:</b> {full.system}
                          </div>
                        )}
                        {full.notes && (
                          <div style={{ marginBottom: '8px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                            {full.notes}
                          </div>
                        )}
                        {!full.effect && !full.system && !full.notes && (
                          <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
                            Quick reference entry for {item.name} ({item.discipline}).
                          </p>
                        )}
                        {full.source && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <b>Source:</b> {full.source}
                          </div>
                        )}
                        {item.note && (
                          <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', fontSize: '12px' }}>
                            <b>Personal Note:</b> {item.note}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => onRemoveWishlist?.(item.id)}
                          style={{
                            background: 'transparent',
                            color: 'var(--tint)',
                            border: '1px solid color-mix(in srgb, var(--tint) 40%, transparent)',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove from Wishlist
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
