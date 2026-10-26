// src/features/admin/AdminWishlistsTab.jsx
// Storyteller administration panel for player wishlists.
// Displays powers and rituals wishlisted across all characters,
// with per character grouping and chronicle wide demand aggregation.

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/Admin.module.css';
import { CLAN_HEX as CLAN_COLORS } from '../../data/clans';
import { ALL_DISCIPLINE_NAMES, iconPath } from '../../data/disciplines';
import { findCatalogItem } from '../character/WishlistSection';

const cardStyle = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '20px',
  boxShadow: 'var(--glass-shadow)',
  backdropFilter: 'blur(10px)',
};

export default function AdminWishlistsTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [wishlists, setWishlists] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'power', 'ritual'
  const [discFilter, setDisciplineFilter] = useState('all');
  const [viewMode, setViewMode] = useState('by_character'); // 'by_character' or 'by_item'
  const [expandedChars, setExpandedChars] = useState(new Set());
  const [busyId, setBusyId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await api.get('/admin/wishlists');
      setWishlists(res.data?.wishlists || []);
    } catch (e) {
      setErr(formatApiError(e, 'Failed to load player wishlists.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Remove this item from the character wishlist?')) return;
    setBusyId(id);
    try {
      await api.delete(`/admin/wishlists/${id}`);
      setWishlists(prev => prev.filter(w => w.id !== id));
    } catch (e) {
      alert(formatApiError(e, 'Failed to remove wishlist item.'));
    } finally {
      setBusyId(null);
    }
  };

  const toggleExpandChar = (charId) => {
    setExpandedChars(prev => {
      const next = new Set(prev);
      if (next.has(charId)) next.delete(charId);
      else next.add(charId);
      return next;
    });
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    let rows = wishlists;

    if (typeFilter !== 'all') {
      rows = rows.filter(r => r.item_type === typeFilter);
    }

    if (discFilter !== 'all') {
      rows = rows.filter(r => r.discipline === discFilter);
    }

    if (search) {
      const q = search.toLowerCase().trim();
      rows = rows.filter(r =>
        (r.character_name && r.character_name.toLowerCase().includes(q)) ||
        (r.display_name && r.display_name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.discipline && r.discipline.toLowerCase().includes(q)) ||
        (r.clan && r.clan.toLowerCase().includes(q))
      );
    }

    return rows;
  }, [wishlists, typeFilter, discFilter, search]);

  // Grouped by character
  const groupedByChar = useMemo(() => {
    const map = new Map();
    filteredRows.forEach(item => {
      if (!map.has(item.character_id)) {
        map.set(item.character_id, {
          character_id: item.character_id,
          character_name: item.character_name,
          clan: item.clan,
          current_xp: item.current_xp,
          display_name: item.display_name,
          email: item.email,
          items: [],
        });
      }
      map.get(item.character_id).items.push(item);
    });
    return Array.from(map.values());
  }, [filteredRows]);

  // Aggregated by item (demand overview)
  const aggregatedByItem = useMemo(() => {
    const map = new Map();
    filteredRows.forEach(item => {
      const key = `${item.item_type}:${item.discipline}:${item.name}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          item_type: item.item_type,
          discipline: item.discipline,
          name: item.name,
          level: item.level,
          characters: [],
        });
      }
      map.get(key).characters.push({
        id: item.character_id,
        name: item.character_name,
        clan: item.clan,
        player: item.display_name || item.email,
        wishlist_id: item.id,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.characters.length - a.characters.length);
  }, [filteredRows]);

  // Overall Statistics
  const totalItems = wishlists.length;
  const uniqueCharacters = useMemo(() => new Set(wishlists.map(w => w.character_id)).size, [wishlists]);
  const topDesired = useMemo(() => {
    const counts = {};
    wishlists.forEach(w => {
      counts[w.name] = (counts[w.name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [wishlists]);

  // All distinct disciplines represented
  const distinctDisciplines = useMemo(() => {
    const s = new Set(wishlists.map(w => w.discipline).filter(Boolean));
    return Array.from(s).sort();
  }, [wishlists]);

  return (
    <div className={styles.tabContent} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '26px' }}>
                bookmark
              </span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)', fontFamily: 'var(--font-title)' }}>
                Player Wishlists
              </h2>
            </div>
            <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Kindred desires for powers and rituals: useful for crafting grimoires, mentor encounters, and story milestones.
            </p>
          </div>

          <button
            type="button"
            className={styles.refreshBtn}
            onClick={loadData}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            Refresh Wishlists
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '18px' }}>
          <div style={{ padding: '12px 16px', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Total Saved Entries
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
              {totalItems}
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Kindred with Wishlists
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {uniqueCharacters}
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)', gridColumn: 'span 2' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
              Highest Demand across Chronicle
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {topDesired.length === 0 ? (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No entries yet</span>
              ) : (
                topDesired.map(([name, count]) => (
                  <span
                    key={name}
                    style={{
                      background: 'rgba(168, 85, 247, 0.12)',
                      color: 'var(--primary)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: '1px solid rgba(168, 85, 247, 0.25)'
                    }}
                  >
                    {name} ({count} kindred)
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {err && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5' }}>
          {err}
        </div>
      )}

      {/* Filter and View Mode Controls */}
      <div style={{ ...cardStyle, padding: '14px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', flex: '1 1 500px' }}>
            <input
              type="text"
              placeholder="Search by character, player, discipline, or power..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.input}
              style={{ flex: '1 1 240px', minWidth: '200px' }}
            />

            <select
              className={styles.select}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ width: '130px' }}
            >
              <option value="all">All Types</option>
              <option value="power">Powers Only</option>
              <option value="ritual">Rituals Only</option>
            </select>

            <select
              className={styles.select}
              value={discFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
              style={{ width: '160px' }}
            >
              <option value="all">All Disciplines</option>
              {distinctDisciplines.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-color)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setViewMode('by_character')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: viewMode === 'by_character' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'by_character' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              By Character ({groupedByChar.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('by_item')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: viewMode === 'by_item' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'by_item' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              By Power Demand ({aggregatedByItem.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading chronicle wishlists...
        </div>
      ) : filteredRows.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '50px 20px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--text-secondary)', opacity: 0.6 }}>
            bookmark_border
          </span>
          <h3 style={{ margin: '10px 0 6px 0', color: 'var(--text-primary)' }}>No Wishlist Entries Found</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {search || typeFilter !== 'all' || discFilter !== 'all'
              ? 'No entries match your search criteria.'
              : 'Players have not added any powers or rituals to their wishlists yet.'}
          </p>
        </div>
      ) : viewMode === 'by_character' ? (
        /* Character Grouped View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {groupedByChar.map(group => {
            const isExpanded = expandedChars.has(group.character_id);
            const clanColor = CLAN_COLORS[group.clan] || 'var(--primary)';

            return (
              <div key={group.character_id} style={cardStyle}>
                {/* Character Header Row */}
                <div
                  onClick={() => toggleExpandChar(group.character_id)}
                  style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                          {group.character_name}
                        </h3>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: clanColor, padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)' }}>
                          {group.clan}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Player: {group.display_name || group.email || 'Unknown'} • Current XP: <b style={{ color: 'var(--text-primary)' }}>{group.current_xp ?? 0}</b>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--primary)', fontWeight: 600 }}>
                      {group.items.length} {group.items.length === 1 ? 'wish' : 'wishes'}
                    </span>
                    <span className="material-symbols-outlined" style={{ color: 'var(--text-secondary)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Wishlist Items Sublist */}
                {isExpanded && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {group.items.map(item => {
                      const full = findCatalogItem(item.item_type, item.discipline, item.item_id) || {};
                      const icon = item.item_type === 'power' ? iconPath(item.discipline) : null;

                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: '12px 16px',
                            background: 'var(--surface-color)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {icon && (
                                <img
                                  src={icon}
                                  alt={item.discipline}
                                  style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                    {item.name}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'rgba(168, 85, 247, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                                    Level {item.level} : {item.discipline}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                    {item.item_type === 'power' ? 'Discipline Power' : 'Ritual or Ceremony'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Added {new Date(item.created_at).toLocaleDateString()}
                              </span>
                              <button
                                type="button"
                                title="Remove from wishlist"
                                onClick={() => handleDeleteItem(item.id)}
                                disabled={busyId === item.id}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--text-secondary)',
                                  padding: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                              </button>
                            </div>
                          </div>

                          {/* Mechanics and Rules Quick Reference */}
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {full.dice_pool && (
                              <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                                <b>Pool:</b> {full.dice_pool}
                              </span>
                            )}
                            {full.cost && (
                              <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                                <b>Cost:</b> {full.cost}
                              </span>
                            )}
                            {full.duration && (
                              <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                                <b>Duration:</b> {full.duration}
                              </span>
                            )}
                            {full.amalgam && (
                              <span style={{ padding: '2px 6px', background: 'rgba(168, 85, 247, 0.08)', color: 'var(--primary)', borderRadius: '4px' }}>
                                <b>Amalgam:</b> {full.amalgam}
                              </span>
                            )}
                          </div>

                          {full.system && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                              <b>System:</b> {full.system}
                            </div>
                          )}
                          {full.effect && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                              <b>Effect:</b> {full.effect}
                            </div>
                          )}
                          {item.note && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '4px' }}>
                              Player note: "{item.note}"
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Aggregated Demand View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {aggregatedByItem.map(agg => (
            <div key={agg.key} style={cardStyle}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>
                    bookmark
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {agg.name}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--primary)', background: 'rgba(168, 85, 247, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        Level {agg.level} : {agg.discipline}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {agg.item_type === 'power' ? 'Power' : 'Ritual'}
                      </span>
                    </div>
                  </div>
                </div>

                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(168, 85, 247, 0.12)', padding: '4px 10px', borderRadius: '12px' }}>
                  {agg.characters.length} {agg.characters.length === 1 ? 'kindred wishing' : 'kindred wishing'}
                </span>
              </div>

              {/* List of Characters Wishing For This */}
              <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {agg.characters.map(ch => (
                  <span
                    key={ch.wishlist_id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: 'var(--surface-color)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.8rem'
                    }}
                  >
                    <b style={{ color: 'var(--text-primary)' }}>{ch.name}</b>
                    <span style={{ color: CLAN_COLORS[ch.clan] || 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      ({ch.clan})
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                      : {ch.player}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
