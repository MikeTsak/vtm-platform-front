// src/features/admin/PrintTool.jsx
//
// Admin print tool: rumours, news articles, court decrees and boons from a
// period (all time, a downtime cycle, or custom dates), printed on A4 or on
// the Epson TM-T20III thermal printer. Thermal prints one item per page; the
// Epson driver set to cut every page cuts after each. Pictures go to the
// thermal printer as pure black/white dots (back/routes/printTool.js), since a
// thermal dot is either burned or not.
//
// The printout is built as its own document in a hidden iframe, so neither
// the app's layout nor its print rules get in the way.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { toast } from 'sonner';
import api, { formatApiError } from '../../core/api';
import { formatAthensDate, formatAthensDateTime } from '../../utils/dateFormatter';
import { apiJoin, isVideoUrl } from '../../utils/newsUtils';
import { NEWS_OUTLETS } from '../../constants/outletConstants';
import MarkdownBody from '../../components/MarkdownBody';

const KINDS = [
  { key: 'rumors', label: 'Rumors', icon: 'campaign' },
  { key: 'news', label: 'News articles', icon: 'newspaper' },
  { key: 'decrees', label: 'Court decrees', icon: 'gavel' },
  { key: 'boons', label: 'Boons', icon: 'handshake' },
];
const KIND_TAG = { rumor: 'Rumor', news: 'News', decree: 'Decree', boon: 'Boon' };
const LEVEL = { trivial: 'Trivial', minor: 'Minor', major: 'Major', life: 'Life' };
const STATUS = { owed: 'Owed', paid: 'Paid', excused: 'Excused', defaulted: 'Defaulted' };

const firstTitle = (raw) => {
  let t = raw;
  if (typeof t === 'string') { try { t = JSON.parse(t); } catch { t = t.split(','); } }
  return Array.isArray(t) ? String(t[0] || '').trim() : '';
};
const itemKey = (it) => `${it.kind}-${it.id}`;
const itemLabel = (it) => (it.kind === 'boon' ? `${it.from_name} owes ${it.to_name}` : it.title);
// Clan crests are small inline glyphs: they stay as they are.
const isCrest = (src) => /_symbol|\/clans\//i.test(src || '');

/* ---------------- The printout ---------------- */

function Ticket({ item }) {
  const media = item.media_url && !isVideoUrl(item.media_url) ? apiJoin(item.media_url) : null;
  const when = formatAthensDateTime(item.created_at);

  if (item.kind === 'boon') {
    return (
      <section className="ticket">
        <div className="kind"><span>Boon</span><span>{LEVEL[item.level] || 'Trivial'}</span></div>
        <h1 className="title">{item.from_name} owes {item.to_name}</h1>
        <div className="meta">Recorded {when} · {STATUS[item.status] || 'Owed'}</div>
        {item.description && <div className="body"><p>{item.description}</p></div>}
      </section>
    );
  }

  const label = item.kind === 'rumor' ? 'Rumor'
    : item.kind === 'decree' ? 'Court Decree'
      : (NEWS_OUTLETS[item.theme]?.name || 'News');
  const byline = item.kind === 'news' ? (item.journalist_name ? `By ${item.journalist_name}` : null)
    : item.kind === 'decree' && item.author_name ? `Issued by ${[firstTitle(item.author_titles), item.author_name].filter(Boolean).join(' ')}`
      : null;

  return (
    <section className="ticket">
      <div className="kind"><span>{label}</span><span>{item.kind === 'rumor' ? 'Heard' : 'Published'} {formatAthensDate(item.created_at)}</span></div>
      <h1 className="title">{item.title}</h1>
      {item.subtitle && <p className="sub">{item.subtitle}</p>}
      {byline && <div className="meta">{byline}</div>}
      {media && <img className="media" src={media} alt="" />}
      <MarkdownBody content={item.body} className="body" whiteCrest={false} />
    </section>
  );
}

const CSS = {
  // 80 mm roll. The head doesn't reach the paper's edges, so the side margin
  // (--side, set in the tool) keeps text off them. The page length and the
  // cut come from the Epson driver (see the setup notes in the tool).
  thermal: `
    @page { margin: 0; }
    html, body { margin: 0; background: #fff; }
    body { font-family: Arial, Helvetica, sans-serif; }
    * { color: #000 !important; background: transparent !important; box-shadow: none !important; text-shadow: none !important; }
    .ticket { padding: 3mm var(--side, 7mm) 8mm; break-after: page; }
    .ticket:last-child { break-after: auto; }
    .kind { display: flex; justify-content: space-between; gap: 2mm; font-size: 8.5pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 1mm; margin-bottom: 2.5mm; }
    .title { font-size: 15pt; font-weight: 800; line-height: 1.15; margin: 0 0 1.5mm; }
    .sub { font-size: 11pt; font-weight: 700; margin: 0 0 2mm; }
    .meta { font-size: 9pt; font-weight: 700; margin-bottom: 2mm; }
    .body { font-size: 11pt; line-height: 1.35; overflow-wrap: anywhere; }
    .body p { margin: 0 0 2mm; }
    .body a { text-decoration: none; }
    img { max-width: 100%; height: auto; }
    img.dots { display: block; width: 100%; margin: 2mm 0; image-rendering: pixelated; border-radius: 0 !important; }
  `,
  a4: `
    @page { size: A4; margin: 14mm; }
    body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #111; }
    .ticket { border: 1px dashed #999; padding: 6mm; margin-bottom: 6mm; break-inside: avoid; }
    .kind { display: flex; justify-content: space-between; gap: 4mm; font: 700 8pt Arial, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #555; border-bottom: 1px solid #ccc; padding-bottom: 2mm; margin-bottom: 3mm; }
    .title { font-size: 17pt; margin: 0 0 2mm; line-height: 1.2; }
    .sub { font-style: italic; margin: 0 0 2mm; }
    .meta { font: 600 9pt Arial, sans-serif; color: #444; margin-bottom: 3mm; }
    .body { font-size: 11pt; line-height: 1.5; }
    .body p { margin: 0 0 3mm; }
    img { max-width: 100%; height: auto; }
    img.media { display: block; max-height: 90mm; margin: 3mm auto; object-fit: contain; }
  `,
};

/* ---------------- The tool ---------------- */

export default function PrintTool({ onClose, initialKinds = ['rumors'] }) {
  const [kinds, setKinds] = useState(new Set(initialKinds));
  const [period, setPeriod] = useState('all');
  const [cycles, setCycles] = useState([]);
  const [cycleId, setCycleId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [paper, setPaper] = useState(() => {
    try { return localStorage.getItem('printTool.paper') || 'thermal'; } catch { return 'thermal'; }
  });
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const frameRef = useRef(null);
  const blobsRef = useRef([]);

  // Thermal side margin in mm: a calibration knob, since how close to the
  // edge the head reaches varies by printer and driver.
  const [sideMm, setSideMm] = useState(() => {
    try { return Number(localStorage.getItem('printTool.sideMm')) || 7; } catch { return 7; }
  });

  useEffect(() => {
    try {
      localStorage.setItem('printTool.paper', paper);
      localStorage.setItem('printTool.sideMm', String(sideMm));
    } catch { /* private window */ }
  }, [paper, sideMm]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  // Downtime cycles; the one running now (or the last one that started) is the default.
  useEffect(() => {
    api.get('/admin/downtimes/cycles').then(({ data }) => {
      const list = (data.cycles || []).filter(c => c.opening_date && c.closing_date)
        .sort((a, b) => b.opening_date.localeCompare(a.opening_date));
      setCycles(list);
      const today = new Date().toISOString().slice(0, 10);
      const latest = list.find(c => c.opening_date <= today) || list[list.length - 1];
      if (latest) setCycleId(String(latest.id ?? latest.opening_date));
    }).catch(() => setCycles([]));
  }, []);

  // The chosen period as ISO bounds (either may be empty).
  const range = useMemo(() => {
    if (period === 'cycle') {
      const c = cycles.find(x => String(x.id ?? x.opening_date) === cycleId);
      if (!c) return null;
      return { from: new Date(`${c.opening_date}T00:00:00`).toISOString(), to: new Date(`${c.closing_date}T23:59:59`).toISOString() };
    }
    if (period === 'custom') {
      return { from: from ? new Date(from).toISOString() : '', to: to ? new Date(to).toISOString() : '' };
    }
    return { from: '', to: '' };
  }, [period, cycles, cycleId, from, to]);

  useEffect(() => {
    if (!kinds.size || !range) { setItems([]); setSelected(new Set()); return; }
    let live = true;
    setLoading(true);
    api.get('/admin/print/items', { params: { kinds: [...kinds].join(','), from: range.from || undefined, to: range.to || undefined } })
      .then(({ data }) => {
        if (!live) return;
        setItems(data.items || []);
        setSelected(new Set((data.items || []).map(itemKey)));
      })
      .catch((e) => { if (live) { setItems([]); toast.error(formatApiError(e, 'Could not load the items.')); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [kinds, range]);

  useEffect(() => () => {
    blobsRef.current.forEach(u => URL.revokeObjectURL(u));
    frameRef.current?.remove();
  }, []);

  const toggleKind = (k) => setKinds(cur => {
    const next = new Set(cur);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });
  const toggleItem = (k) => setSelected(cur => {
    const next = new Set(cur);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });

  const chosen = items.filter(it => selected.has(itemKey(it)));

  const print = async () => {
    if (!chosen.length) return;
    try {
      setBusy('Preparing...');
      const doc = new DOMParser().parseFromString(
        renderToStaticMarkup(<>{chosen.map(it => <Ticket key={itemKey(it)} item={it} />)}</>),
        'text/html'
      );

      // Thermal: every picture becomes black/white dots; one that can't be
      // converted is left out rather than printed as a grey smudge.
      if (paper === 'thermal') {
        const imgs = [...doc.querySelectorAll('img')].filter(img => !isCrest(img.getAttribute('src')));
        let done = 0;
        for (const img of imgs) {
          setBusy(`Converting pictures ${++done} of ${imgs.length}...`);
          try {
            const { data } = await api.get('/admin/print/dither', { params: { src: img.getAttribute('src') }, responseType: 'blob' });
            const url = URL.createObjectURL(data);
            blobsRef.current.push(url);
            img.setAttribute('src', url);
            img.setAttribute('class', 'dots');
          } catch {
            img.remove();
          }
        }
      }

      setBusy('Opening the print dialog...');
      frameRef.current?.remove();
      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      frameRef.current = frame;
      document.body.appendChild(frame);
      await new Promise((resolve) => {
        frame.onload = resolve;
        frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>Print</title><style>:root { --side: ${sideMm}mm; }${CSS[paper]}</style></head><body>${doc.body.innerHTML}</body></html>`;
      });
      const fdoc = frame.contentDocument;
      await Promise.all([...fdoc.images].map(img => (img.complete ? null : new Promise(r => { img.onload = r; img.onerror = r; }))));
      await fdoc.fonts?.ready;
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (e) {
      toast.error(formatApiError(e, 'Could not prepare the printout.'));
    } finally {
      setBusy('');
    }
  };

  const chip = (active) => `inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-full border text-[13px] transition-colors ${active ? 'border-primary text-primary bg-surface-container-highest' : 'border-outline-variant text-on-surface-variant hover:text-on-surface'}`;
  const field = 'bg-surface-container-lowest border border-outline-variant rounded px-3 min-h-[40px] text-[16px] md:text-[14px] text-on-surface';
  const label = 'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant';

  return (
    <div className="fixed inset-0 z-[10050] flex items-stretch md:items-center justify-center bg-black/70 md:p-4" onClick={() => !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="print-tool-title" onClick={e => e.stopPropagation()}
        className="w-full md:max-w-2xl md:max-h-[90vh] bg-surface-container-high border border-outline-variant md:rounded-xl shadow-2xl flex flex-col overflow-hidden text-on-surface">

        <div className="flex items-center justify-between gap-2 px-4 h-14 border-b border-outline-variant shrink-0">
          <h2 id="print-tool-title" className="m-0 text-[17px] font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">print</span> Print tool
          </h2>
          <button type="button" onClick={onClose} disabled={!!busy} aria-label="Close print tool" className="w-11 h-11 flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface disabled:opacity-40">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className={label}>What to print</span>
            <div className="flex flex-wrap gap-2">
              {KINDS.map(k => (
                <button key={k.key} type="button" aria-pressed={kinds.has(k.key)} onClick={() => toggleKind(k.key)} className={chip(kinds.has(k.key))}>
                  <span className="material-symbols-outlined text-[18px]">{k.icon}</span>{k.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className={label}>When</span>
            <div className="flex flex-wrap gap-2">
              {[['all', 'All time'], ['cycle', 'Downtime cycle'], ['custom', 'Choose dates']].map(([v, l]) => (
                <button key={v} type="button" aria-pressed={period === v} onClick={() => setPeriod(v)} className={chip(period === v)}>{l}</button>
              ))}
            </div>
            {period === 'cycle' && (cycles.length ? (
              <select value={cycleId} onChange={e => setCycleId(e.target.value)} className={field} aria-label="Downtime cycle">
                {cycles.map(c => (
                  <option key={c.id ?? c.opening_date} value={String(c.id ?? c.opening_date)}>
                    {c.title ? `${c.title}: ` : ''}{formatAthensDate(c.opening_date)} to {formatAthensDate(c.closing_date)}
                  </option>
                ))}
              </select>
            ) : <p className="m-0 text-[13px] text-on-surface-variant">No downtime cycles are scheduled.</p>)}
            {period === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[12px] text-on-surface-variant">From
                  <input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} className={field} />
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-on-surface-variant">To
                  <input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} className={field} />
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className={label}>Paper</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={paper === 'thermal'} onClick={() => setPaper('thermal')} className={chip(paper === 'thermal')}>
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>Thermal 80 mm (one per ticket, cut)
              </button>
              <button type="button" aria-pressed={paper === 'a4'} onClick={() => setPaper('a4')} className={chip(paper === 'a4')}>
                <span className="material-symbols-outlined text-[18px]">description</span>A4
              </button>
            </div>
            {paper === 'thermal' && (
              <label className="flex items-center gap-2 text-[13px] text-on-surface-variant">
                Side margin
                <input type="number" min={0} max={20} step={0.5} value={sideMm}
                  onChange={e => setSideMm(Math.min(20, Math.max(0, Number(e.target.value) || 0)))}
                  className={`${field} w-20`} aria-label="Side margin in millimetres" />
                mm (raise it if the edges get cut off)
              </label>
            )}
            {paper === 'thermal' && (
              <button type="button" onClick={() => setSetupOpen(v => !v)} aria-expanded={setupOpen} className="self-start flex items-center gap-1 text-[13px] text-primary min-h-[36px]">
                <span className="material-symbols-outlined text-[18px]">{setupOpen ? 'expand_less' : 'help'}</span>
                Setting up the Epson TM-T20III
              </button>
            )}
            {paper === 'thermal' && setupOpen && (
              <ol className="m-0 pl-5 text-[13px] text-on-surface-variant flex flex-col gap-1.5 leading-relaxed">
                <li>Install Epson's <b className="text-on-surface">Advanced Printer Driver (APD 6)</b> for the TM-T20III from Epson's support site, with the printer plugged in.</li>
                <li>In Windows, open the printer's <b className="text-on-surface">Printing preferences</b>: paper size <b className="text-on-surface">Roll Paper 80 x 297 mm</b>, and the feed/cut choice set to cut <b className="text-on-surface">per page</b> with feed (the default cuts once per document, which prints everything as one long receipt). Set the same under Printer properties, Advanced, <b className="text-on-surface">Printing Defaults</b>.</li>
                <li>Text overlapping between tickets means paper reduction is trimming too much: turn line-spacing reduction off in the TM-T20III Utility and keep only the bottom-margin reduction.</li>
                <li>In Chrome's print dialog pick the TM-T20III, margins <b className="text-on-surface">Default</b>, scale <b className="text-on-surface">Default</b>.</li>
                <li>Print one item first to check. A ticket longer than 297 mm is cut in two: pick the 80 x 3276 mm paper size for long articles.</li>
              </ol>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className={label}>{loading ? 'Loading...' : `${chosen.length} of ${items.length} selected`}</span>
              {items.length > 0 && (
                <span className="flex gap-1">
                  <button type="button" onClick={() => setSelected(new Set(items.map(itemKey)))} className="px-2 min-h-[36px] text-[13px] text-primary">All</button>
                  <button type="button" onClick={() => setSelected(new Set())} className="px-2 min-h-[36px] text-[13px] text-primary">None</button>
                </span>
              )}
            </div>
            {!loading && !items.length && (
              <p className="m-0 text-[13px] text-on-surface-variant">{kinds.size ? 'Nothing in this period.' : 'Choose what to print.'}</p>
            )}
            <ul className="m-0 p-0 list-none flex flex-col border border-outline-variant rounded overflow-hidden">
              {items.map(it => (
                <li key={itemKey(it)} className="border-b border-outline-variant last:border-b-0">
                  <label className="flex items-center gap-3 px-3 min-h-[48px] cursor-pointer hover:bg-surface-container-highest">
                    <input type="checkbox" checked={selected.has(itemKey(it))} onChange={() => toggleItem(itemKey(it))} className="w-4 h-4 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant w-14 shrink-0">{KIND_TAG[it.kind]}</span>
                    <span className="flex-1 min-w-0 truncate text-[14px]">{itemLabel(it)}</span>
                    {it.media_url && !isVideoUrl(it.media_url) && <span className="material-symbols-outlined text-[16px] text-on-surface-variant" title="Has a picture" aria-label="Has a picture">image</span>}
                    <span className="text-[11px] text-on-surface-variant shrink-0">{formatAthensDate(it.created_at)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-outline-variant shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <span className="text-[12px] text-on-surface-variant min-w-0" aria-live="polite">{busy}</span>
          <button type="button" onClick={print} disabled={!chosen.length || !!busy}
            className="flex items-center gap-2 px-5 min-h-[44px] rounded bg-primary-container text-on-primary-container font-bold text-[13px] uppercase tracking-wider disabled:opacity-40 shrink-0">
            <span className="material-symbols-outlined text-[18px]">print</span>
            Print {chosen.length || ''}
          </button>
        </div>
      </div>
    </div>
  );
}
