// Admin > Players > Inventory: every item in the chronicle. Make items for a
// character or leave them out in the world behind a printable QR, flip
// research on and off, and move items between holders.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import api, { formatApiError } from '../../core/api';
import adminStyles from '../../styles/Admin.module.css';
import styles from '../../styles/AdminInventoryTab.module.css';
import InventoryItemModal from '../inventory/InventoryItemModal';
import GetItem from '../inventory/GetItem';
import ItemQr, { itemClaimUrl, qrDataUrl } from '../inventory/itemQr';
import { itemIcon } from '../inventory/itemMeta';

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'world', label: 'In the world', test: (i) => i.character_id == null },
  { key: 'held', label: 'Held', test: (i) => i.character_id != null },
  { key: 'unresearched', label: 'Unresearched', test: (i) => !i.researched },
];

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function QrModal({ item, onClose }) {
  const url = itemClaimUrl(item.claim_code);
  const [png, setPng] = useState(null);
  useEffect(() => { qrDataUrl(url, 1024).then(setPng).catch(() => {}); }, [url]);

  const print = () => {
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) { toast.error('Allow pop-ups to print, or download the PNG.'); return; }
    w.document.write(`<!doctype html><title>${escapeHtml(item.name)}</title>
      <body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:Georgia,serif">
      <img src="${png}" style="width:9cm;height:9cm" onload="window.print()"><h2 style="margin:.5cm 0 0">${escapeHtml(item.name)}</h2></body>`);
    w.document.close();
  };

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`QR for ${item.name}`} onClick={onClose}>
      <div className={styles.qrCard} onClick={(e) => e.stopPropagation()}>
        <h3>{item.name}</h3>
        <p className={styles.muted}>
          {item.claim_copies ? 'Every player who scans this gets their own copy.' : 'The first player to scan this gets the item.'}
        </p>
        <ItemQr value={url} size={280} />
        <code className={styles.code}>{item.claim_code}</code>
        <div className={styles.row}>
          {png && <a className={styles.btn} href={png} download={`${item.name.replace(/[^\w-]+/g, '_')}_qr.png`}>Download PNG</a>}
          <button type="button" className={styles.btn} onClick={print} disabled={!png}>Print</button>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AdminInventoryTab({ characters = [] }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [saving, setSaving] = useState(false);
  const [qrItem, setQrItem] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/inventory');
      setItems(data.items || []);
    } catch (e) {
      toast.error(formatApiError(e, 'Failed to load items'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const sortedChars = useMemo(() => [...characters].sort((a, b) => String(a.name).localeCompare(String(b.name))), [characters]);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, items.filter(f.test).length])), [items]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const test = FILTERS.find((f) => f.key === filter).test;
    return items.filter((i) => test(i) && (!needle || [i.name, i.item_type, i.character_name, i.description].some((v) => String(v || '').toLowerCase().includes(needle))));
  }, [items, filter, q]);

  const save = async (data) => {
    if (saving) return;
    setSaving(true);
    try {
      const { data: res } = editing
        ? await api.put(`/admin/inventory/${editing.id}`, data)
        : await api.post('/admin/inventory', data);
      setEditing(undefined);
      await load();
      if (res.item?.character_id == null) setQrItem(res.item);
    } catch (e) {
      toast.error(formatApiError(e, 'Could not save item'));
    } finally {
      setSaving(false);
    }
  };

  const patch = async (item, data) => {
    try {
      await api.put(`/admin/inventory/${item.id}`, data);
      await load();
    } catch (e) {
      toast.error(formatApiError(e, 'Could not update item'));
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete ${item.name} for good?`)) return;
    try {
      await api.delete(`/admin/inventory/${item.id}`);
      await load();
    } catch (e) {
      toast.error(formatApiError(e, 'Could not delete item'));
    }
  };

  return (
    <div className={adminStyles.adminCard}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>
            <span className="material-symbols-outlined" aria-hidden="true">backpack</span> Inventory
          </h2>
          <p className={styles.muted}>{counts.held} held · {counts.world} in the world · {counts.unresearched} unresearched</p>
        </div>
        <div className={styles.row}>
          {/* Scan a player's Pass QR (they confirm) or a prop's printed QR (back at once). */}
          <GetItem asStoryteller label="Take back item" className={styles.btnGhost} onClaimed={load} />
          <button type="button" className={styles.btn} onClick={() => setEditing(null)}>
            <span className="material-symbols-outlined" aria-hidden="true">add</span> New item
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button key={f.key} type="button" aria-pressed={filter === f.key} className={styles.chip} onClick={() => setFilter(f.key)}>
            {f.label} <span>{counts[f.key]}</span>
          </button>
        ))}
      </div>
      <input type="search" className={styles.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items, types or holders…" />

      {loading ? (
        <div className={styles.empty}>Loading items…</div>
      ) : shown.length === 0 ? (
        <div className={styles.empty}>{items.length ? 'Nothing matches this filter.' : 'No items yet. Make one with New item.'}</div>
      ) : (
        <div className={styles.grid}>
          {shown.map((i) => (
            <article key={i.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.thumb}>
                  {i.image
                    ? <img src={i.image} alt="" />
                    : <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{itemIcon(i.item_type)}</span>}
                </div>
                <div className={styles.cardText}>
                  <div className={styles.name}>{i.name}</div>
                  <div className={styles.sub}>{i.item_type || 'Mundane'} · Qty {i.quantity || 1}</div>
                  <div className={styles.tags}>
                    {i.character_id == null
                      ? <span className={`${styles.tag} ${styles.tagWorld}`}>In the world{i.claim_copies ? ` · copies (${i.copies_claimed} claimed)` : ''}</span>
                      : <span className={styles.tag}>{i.character_name || `Character #${i.character_id}`}</span>}
                  </div>
                </div>
              </div>

              {i.description && <p className={styles.desc}>{i.description}</p>}
              {i.mechanic_notes && <p className={styles.mech}><strong>Does:</strong> {i.mechanic_notes}</p>}
              {i.player_notes && <p className={styles.desc}><strong>Player notes:</strong> {i.player_notes}</p>}

              <label className={styles.switch}>
                <input type="checkbox" checked={!!i.researched} onChange={() => patch(i, { researched: !i.researched })} />
                <span>{i.researched ? 'Researched: holder sees what it does' : 'Unresearched: what it does is hidden'}</span>
              </label>

              <div className={styles.row}>
                <button type="button" className={styles.btnGhost} onClick={() => setEditing(i)}>
                  <span className="material-symbols-outlined" aria-hidden="true">edit</span> Edit
                </button>
                {i.character_id == null ? (
                  <button type="button" className={styles.btnGhost} onClick={() => setQrItem(i)} disabled={!i.claim_code}>
                    <span className="material-symbols-outlined" aria-hidden="true">qr_code_2</span> QR
                  </button>
                ) : (
                  <button type="button" className={styles.btnGhost} onClick={() => patch(i, { character_id: null })} title="Take it off the character and put it out in the world">
                    <span className="material-symbols-outlined" aria-hidden="true">public</span> To world
                  </button>
                )}
                <button type="button" className={styles.btnDanger} onClick={() => remove(i)}>
                  <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <InventoryItemModal item={editing} characters={sortedChars} onClose={() => setEditing(undefined)} onSave={save} busy={saving} />
      )}
      {qrItem && <QrModal item={qrItem} onClose={() => setQrItem(null)} />}
    </div>
  );
}
