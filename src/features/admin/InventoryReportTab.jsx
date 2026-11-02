// src/features/admin/InventoryReportTab.jsx
// Storyteller report extractor for recently added inventory items.
// Allows filtering by timeframe (recent days or custom range) or by owner (specific user or character),
// selecting which fields to include (name, image, description, does, ST notes, owner, player avatar),
// selecting which items to include, and generating a high resolution PNG image export.

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import api from '../../core/api';
import { symlogoWhite } from '../../data/clans';
import { itemIcon } from '../inventory/itemMeta';
import styles from '../../styles/AdminInventoryTab.module.css';

// Helper to safely format dates without hyphens or dashes per UI rules
function formatReportDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }) + ', ' + d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Convert image url to data url via server proxy for clean html2canvas capture without CORS taint
async function toDataUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('data:')) return url;

  // Local assets or relative paths can be fetched directly from same origin
  if (url.startsWith('/') || !url.startsWith('http')) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  // Remote URLs (e.g. img.miketsak.gr) route through admin proxy to bypass CORS
  try {
    const { data } = await api.get('/admin/inventory/image-proxy', {
      params: { u: url },
      responseType: 'blob',
    });
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(data);
    });
  } catch (err) {
    console.warn('Proxy fetch failed, trying direct fetch fallback:', err);
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
}

// Resolves avatar url, or falls back to clan logo when no avatar exists
function getOwnerAvatarInfo(item, characters = []) {
  if (item.character_id == null) {
    return { url: null, isClan: false, isWorld: true };
  }

  // 1. Player user avatar
  if (item.user_avatar) {
    return { url: item.user_avatar, isClan: false, isWorld: false };
  }

  // 2. Character avatar
  if (item.character_avatar || item.character_avatar_thumb) {
    return { url: item.character_avatar_thumb || item.character_avatar, isClan: false, isWorld: false };
  }

  // 3. Fallback: Clan logo if character has a clan
  const clan = item.character_clan || characters.find((c) => c.id === item.character_id)?.clan;
  if (clan) {
    const clanLogo = symlogoWhite(clan);
    if (clanLogo) {
      return { url: clanLogo, isClan: true, isWorld: false, clanName: clan };
    }
  }

  return { url: null, isClan: false, isWorld: false };
}

export default function InventoryReportTab({ items = [], characters = [], users = [] }) {
  // Timeframe filter state
  const [timeframe, setTimeframe] = useState('7d'); // 24h, 3d, 7d, 14d, 30d, all, custom
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Owner filter state
  const [ownerFilterMode, setOwnerFilterMode] = useState('all'); // all, world, user, character
  const [targetUserId, setTargetUserId] = useState('');
  const [targetCharacterId, setTargetCharacterId] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Field inclusion toggles (which fields appear in report and exported image)
  const [fields, setFields] = useState({
    name: true,
    image: true,
    description: true,
    does: true,
    stNotes: true,
    owner: true,
    playerAvatar: true,
  });

  // Selected item IDs for extraction
  const [selectedIds, setSelectedIds] = useState(null); // null means all currently filtered items selected
  const [isExporting, setIsExporting] = useState(false);

  const exportContainerRef = useRef(null);

  const toggleField = (key) => {
    setFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter items according to timeframe, owner, and search
  const filteredItems = useMemo(() => {
    const now = Date.now();
    const needle = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      // 1. Timeframe check (item.created_at or item.updated_at)
      const rawDate = item.created_at || item.updated_at;
      const itemTime = rawDate ? new Date(rawDate).getTime() : 0;

      if (timeframe === '24h') {
        if (!itemTime || now - itemTime > 24 * 60 * 60 * 1000) return false;
      } else if (timeframe === '3d') {
        if (!itemTime || now - itemTime > 3 * 24 * 60 * 60 * 1000) return false;
      } else if (timeframe === '7d') {
        if (!itemTime || now - itemTime > 7 * 24 * 60 * 60 * 1000) return false;
      } else if (timeframe === '14d') {
        if (!itemTime || now - itemTime > 14 * 24 * 60 * 60 * 1000) return false;
      } else if (timeframe === '30d') {
        if (!itemTime || now - itemTime > 30 * 24 * 60 * 60 * 1000) return false;
      } else if (timeframe === 'custom') {
        if (customFrom) {
          const fromTime = new Date(customFrom).getTime();
          if (itemTime < fromTime) return false;
        }
        if (customTo) {
          // End of selected day
          const toTime = new Date(customTo).getTime() + 24 * 60 * 60 * 1000;
          if (itemTime > toTime) return false;
        }
      }

      // 2. Owner filter check
      if (ownerFilterMode === 'world') {
        if (item.character_id != null) return false;
      } else if (ownerFilterMode === 'character') {
        if (targetCharacterId && String(item.character_id) !== String(targetCharacterId)) return false;
        if (!targetCharacterId && item.character_id == null) return false;
      } else if (ownerFilterMode === 'user') {
        if (targetUserId) {
          if (String(item.user_id) !== String(targetUserId)) return false;
        } else {
          if (!item.user_id) return false;
        }
      }

      // 3. Search query check
      if (needle) {
        const textToMatch = [
          item.name,
          item.item_type,
          item.character_name,
          item.character_clan,
          item.user_name,
          item.description,
          item.mechanic_notes,
          item.st_notes,
        ].filter(Boolean).join(' ').toLowerCase();

        if (!textToMatch.includes(needle)) return false;
      }

      return true;
    });
  }, [items, timeframe, customFrom, customTo, ownerFilterMode, targetUserId, targetCharacterId, searchQuery]);

  // Set of effective selected IDs
  const activeSelectedSet = useMemo(() => {
    if (selectedIds === null) {
      return new Set(filteredItems.map((i) => i.id));
    }
    return selectedIds;
  }, [selectedIds, filteredItems]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredItems.map((i) => i.id)));
  }, [filteredItems]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleItemSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev !== null ? prev : filteredItems.map((i) => i.id));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // The actual items included in export
  const exportItems = useMemo(() => {
    return filteredItems.filter((i) => activeSelectedSet.has(i.id));
  }, [filteredItems, activeSelectedSet]);

  // Export report as an image
  const handleExportImage = async () => {
    if (exportItems.length === 0) {
      toast.error('No items selected for image export');
      return;
    }

    if (!exportContainerRef.current) return;

    setIsExporting(true);
    const toastId = toast.loading('Preparing extraction image...');

    try {
      // Pre convert item images and player avatars / clan logos into data URLs via backend proxy
      const imagesToConvert = exportContainerRef.current.querySelectorAll('img[data-src]');
      await Promise.all(
        Array.from(imagesToConvert).map(async (imgEl) => {
          const rawSrc = imgEl.getAttribute('data-src');
          if (rawSrc) {
            const dataUrl = await toDataUrl(rawSrc);
            if (dataUrl) {
              imgEl.src = dataUrl;
            }
          }
        })
      );

      // Wait for all images in the export container to load completely
      await Promise.all(
        Array.from(exportContainerRef.current.querySelectorAll('img')).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 250));

      const canvas = await html2canvas(exportContainerRef.current, {
        backgroundColor: '#0c0b11',
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1080,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const nowStr = new Date().toISOString().slice(0, 10).replace(/[^0-9]/g, '');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `inventory_report_${nowStr}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Extraction image downloaded successfully', { id: toastId });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to create extraction image', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.reportSection}>
      {/* Configuration bar */}
      <div className={styles.reportConfigCard}>
        <div className={styles.reportHeaderRow}>
          <div>
            <h3 className={styles.reportSubtitle}>
              <span className="material-symbols-outlined" aria-hidden="true">summarize</span> Report Extraction Controls
            </h3>
            <p className={styles.muted}>
              Filter recently added items by timeframe or owner, select which fields to display, and export a clean report image.
            </p>
          </div>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleExportImage}
            disabled={isExporting || exportItems.length === 0}
          >
            <span className="material-symbols-outlined" aria-hidden="true">download</span>
            {isExporting ? 'Generating image...' : `Export Image (${exportItems.length})`}
          </button>
        </div>

        {/* Filter selectors grid */}
        <div className={styles.reportFiltersGrid}>
          {/* Timeframe Filter */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span className="material-symbols-outlined" aria-hidden="true">schedule</span> Added Timeframe
            </label>
            <select
              className={styles.selectInput}
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <option value="24h">Last 24 hours</option>
              <option value="3d">Last 3 days</option>
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
              <option value="custom">Custom date range</option>
            </select>
          </div>

          {/* Owner Filter Mode */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span className="material-symbols-outlined" aria-hidden="true">person</span> Item Owner Filter
            </label>
            <select
              className={styles.selectInput}
              value={ownerFilterMode}
              onChange={(e) => {
                setOwnerFilterMode(e.target.value);
                setTargetUserId('');
                setTargetCharacterId('');
              }}
            >
              <option value="all">All items (Any owner or world)</option>
              <option value="world">In the world (Unclaimed)</option>
              <option value="user">Specific user account</option>
              <option value="character">Specific character</option>
            </select>
          </div>

          {/* Specific User Target if user mode selected */}
          {ownerFilterMode === 'user' && (
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                <span className="material-symbols-outlined" aria-hidden="true">account_circle</span> Select User
              </label>
              <select
                className={styles.selectInput}
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
              >
                <option value="">Any user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name || u.email || `User #${u.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Specific Character Target if character mode selected */}
          {ownerFilterMode === 'character' && (
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                <span className="material-symbols-outlined" aria-hidden="true">badge</span> Select Character
              </label>
              <select
                className={styles.selectInput}
                value={targetCharacterId}
                onChange={(e) => setTargetCharacterId(e.target.value)}
              >
                <option value="">Any character</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.clan ? ` (${c.clan})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search box */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span className="material-symbols-outlined" aria-hidden="true">search</span> Search Items
            </label>
            <input
              type="search"
              className={styles.selectInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, notes, or holder..."
            />
          </div>
        </div>

        {/* Custom date range inputs if selected */}
        {timeframe === 'custom' && (
          <div className={styles.customDateRow}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>From Date</label>
              <input
                type="date"
                className={styles.selectInput}
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>To Date</label>
              <input
                type="date"
                className={styles.selectInput}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Field inclusion toggles */}
        <div className={styles.fieldInclusionSection}>
          <div className={styles.fieldSectionHeader}>
            <span className={styles.fieldSectionTitle}>
              <span className="material-symbols-outlined" aria-hidden="true">checklist</span> Included Fields in Extraction Image:
            </span>
          </div>
          <div className={styles.fieldCheckboxes}>
            <label className={styles.fieldCheckbox}>
              <input
                type="checkbox"
                checked={fields.name}
                onChange={() => toggleField('name')}
              />
              <span>Name</span>
            </label>
            <label className={styles.fieldCheckbox}>
              <input
                type="checkbox"
                checked={fields.image}
                onChange={() => toggleField('image')}
              />
              <span>Image</span>
            </label>
            <label className={styles.fieldCheckbox}>
              <input
                type="checkbox"
                checked={fields.description}
                onChange={() => toggleField('description')}
              />
              <span>Description</span>
            </label>
            <label className={styles.fieldCheckbox}>
              <input
                type="checkbox"
                checked={fields.does}
                onChange={() => toggleField('does')}
              />
              <span>Does (Mechanics)</span>
            </label>
            <label className={styles.fieldCheckbox}>
              <input
                type="checkbox"
                checked={fields.stNotes}
                onChange={() => toggleField('stNotes')}
              />
              <span>ST Notes</span>
            </label>
            <label className={styles.fieldCheckbox}>
              <input
                type="checkbox"
                checked={fields.owner}
                onChange={() => toggleField('owner')}
              />
              <span>Owner</span>
            </label>
            <label className={styles.fieldCheckbox}>
              <input
                type="checkbox"
                checked={fields.playerAvatar}
                onChange={() => toggleField('playerAvatar')}
              />
              <span>Player Avatar</span>
            </label>
          </div>
        </div>

        {/* Item selection control bar */}
        <div className={styles.selectionBar}>
          <div className={styles.selectionCount}>
            Found {filteredItems.length} matching items, {exportItems.length} selected for extraction
          </div>
          <div className={styles.selectionActions}>
            <button type="button" className={styles.btnGhost} onClick={selectAll}>
              Select all
            </button>
            <button type="button" className={styles.btnGhost} onClick={deselectAll}>
              Clear selection
            </button>
          </div>
        </div>
      </div>

      {/* Filtered items list / preview */}
      {filteredItems.length === 0 ? (
        <div className={styles.empty}>
          No items found matching the selected timeframe and owner criteria.
        </div>
      ) : (
        <div className={styles.reportItemsGrid}>
          {filteredItems.map((item) => {
            const isChecked = activeSelectedSet.has(item.id);
            const avatarInfo = getOwnerAvatarInfo(item, characters);
            return (
              <div
                key={item.id}
                className={`${styles.reportItemCard} ${isChecked ? styles.reportItemCardActive : ''}`}
                onClick={() => toggleItemSelection(item.id)}
              >
                <div className={styles.itemSelectHeader}>
                  <label className={styles.checkboxWrapper} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItemSelection(item.id)}
                    />
                    <span className={styles.checkboxCustom} />
                  </label>
                  {fields.name && <span className={styles.reportItemName}>{item.name}</span>}
                  <span className={styles.reportItemTypeBadge}>{item.item_type || 'Mundane'}</span>
                </div>

                <div className={styles.reportItemBody}>
                  {fields.image && (
                    <div className={styles.reportItemThumb}>
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {itemIcon(item.item_type)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className={styles.reportItemDetails}>
                    {fields.owner && (
                      <div className={styles.reportOwnerRow}>
                        {fields.playerAvatar && (
                          <div className={`${styles.ownerAvatarThumb} ${avatarInfo.isClan ? styles.avatarClanThumb : ''}`}>
                            {avatarInfo.url ? (
                              <img
                                src={avatarInfo.url}
                                alt={avatarInfo.isClan ? avatarInfo.clanName : ''}
                                className={avatarInfo.isClan ? styles.avatarClanImg : ''}
                              />
                            ) : (
                              <span className="material-symbols-outlined" aria-hidden="true">
                                {avatarInfo.isWorld ? 'public' : 'person'}
                              </span>
                            )}
                          </div>
                        )}
                        <div className={styles.reportOwnerText}>
                          <div>
                            <strong>Owner:</strong>{' '}
                            {item.character_id == null
                              ? 'In the world: Unclaimed'
                              : `Held by: ${item.character_name || `Character #${item.character_id}`}${item.character_clan ? ` (${item.character_clan})` : ''}`}
                          </div>
                          {item.character_id != null && item.user_name && (
                            <div className={styles.reportPlayerText}>
                              <strong>Player:</strong> {item.user_name}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {fields.description && item.description && (
                      <div className={styles.reportMetaLine}>
                        <strong>Description:</strong> {item.description}
                      </div>
                    )}

                    {fields.does && item.mechanic_notes && (
                      <div className={styles.reportMetaLineHighlight}>
                        <strong>Does:</strong> {item.mechanic_notes}
                      </div>
                    )}

                    {fields.stNotes && item.st_notes && (
                      <div className={styles.reportMetaLinePrivate}>
                        <strong>ST notes:</strong> {item.st_notes}
                      </div>
                    )}

                    <div className={styles.reportDateFoot}>
                      Added: {formatReportDate(item.created_at || item.updated_at)}
                      {item.quantity > 1 ? `, Quantity: ${item.quantity}` : ''}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden off screen container for html2canvas export */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', overflow: 'hidden' }}>
        <div ref={exportContainerRef} className={styles.exportCanvasContainer}>
          <div className={styles.exportCanvasHeader}>
            <h2 className={styles.exportCanvasTitle}>Chronicle Inventory Report</h2>
            <div className={styles.exportCanvasMeta}>
              <span>Generated on: {formatReportDate(new Date())}</span>
              <span>Total items: {exportItems.length}</span>
              <span>
                Scope:{' '}
                {timeframe === 'all'
                  ? 'All time'
                  : timeframe === 'custom'
                  ? `Custom (${customFrom || 'any'} to ${customTo || 'now'})`
                  : `Last ${timeframe.replace('d', ' days').replace('h', ' hours')}`}
                {ownerFilterMode !== 'all' ? `, Owner filter: ${ownerFilterMode}` : ''}
              </span>
            </div>
          </div>

          <div className={styles.exportCanvasGrid}>
            {exportItems.map((item) => {
              const avatarInfo = getOwnerAvatarInfo(item, characters);
              return (
                <div key={item.id} className={styles.exportCard}>
                  <div className={styles.exportCardTop}>
                    {fields.image && (
                      <div className={styles.exportCardThumb}>
                        {item.image ? (
                          <img
                            src={item.image}
                            data-src={item.image}
                            alt=""
                          />
                        ) : (
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {itemIcon(item.item_type)}
                          </span>
                        )}
                      </div>
                    )}
                    <div className={styles.exportCardTitleBlock}>
                      {fields.name && <div className={styles.exportCardName}>{item.name}</div>}
                      <div className={styles.exportCardBadgeRow}>
                        <span className={styles.exportBadge}>{item.item_type || 'Mundane'}</span>
                        {item.quantity > 1 && (
                          <span className={styles.exportBadge}>Qty: {item.quantity}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.exportCardContent}>
                    {fields.owner && (
                      <div className={styles.exportOwnerRow}>
                        {fields.playerAvatar && (
                          <div className={`${styles.exportAvatarThumb} ${avatarInfo.isClan ? styles.exportAvatarClanThumb : ''}`}>
                            {avatarInfo.url ? (
                              <img
                                src={avatarInfo.url}
                                data-src={avatarInfo.url}
                                alt={avatarInfo.isClan ? avatarInfo.clanName : ''}
                                className={avatarInfo.isClan ? styles.exportAvatarClanImg : ''}
                              />
                            ) : (
                              <span className="material-symbols-outlined" aria-hidden="true">
                                {avatarInfo.isWorld ? 'public' : 'person'}
                              </span>
                            )}
                          </div>
                        )}
                        <div className={styles.exportOwnerText}>
                          <div className={styles.exportField}>
                            <span className={styles.exportFieldLabel}>Owner:</span>{' '}
                            <span className={styles.exportFieldValue}>
                              {item.character_id == null
                                ? 'In the world: Unclaimed'
                                : `Held by: ${item.character_name || `Character #${item.character_id}`}${item.character_clan ? ` (${item.character_clan})` : ''}`}
                            </span>
                          </div>
                          {item.character_id != null && item.user_name && (
                            <div className={styles.exportFieldSub}>
                              <span className={styles.exportFieldLabel}>Player:</span>{' '}
                              <span className={styles.exportFieldValue}>{item.user_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {fields.description && item.description && (
                      <div className={styles.exportField}>
                        <span className={styles.exportFieldLabel}>Description:</span>{' '}
                        <span className={styles.exportFieldValue}>{item.description}</span>
                      </div>
                    )}

                    {fields.does && item.mechanic_notes && (
                      <div className={styles.exportFieldDoes}>
                        <span className={styles.exportFieldLabel}>Does:</span>{' '}
                        <span className={styles.exportFieldValue}>{item.mechanic_notes}</span>
                      </div>
                    )}

                    {fields.stNotes && item.st_notes && (
                      <div className={styles.exportFieldStNotes}>
                        <span className={styles.exportFieldLabel}>ST notes:</span>{' '}
                        <span className={styles.exportFieldValue}>{item.st_notes}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.exportCardFooter}>
                    Date added: {formatReportDate(item.created_at || item.updated_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
