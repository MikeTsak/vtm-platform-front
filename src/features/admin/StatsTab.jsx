// src/features/admin/StatsTab.jsx
//
// Admin > Stats: every system's numbers for a period (computed by the server,
// GET /api/admin/stats), as cards you tick to choose what goes into the
// exported image. Wide = one poster of everything ticked (download, or copy
// to paste straight into Discord). Square = one 1080 x 1080 image per ticked
// card. The images are drawn by html2canvas from an off-screen Poster.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import html2canvas from 'html2canvas';
import api, { formatApiError } from '../../core/api';
import FaGlyph from '../../ui/FaGlyph';
import { StatCard, Poster, SectionTitle, spanOf } from './statsCards';
import s from '../../styles/Stats.module.css';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens' }).format(new Date());
const daysBack = (n) => {
  const d = new Date(`${today()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};
const LONG = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const longDay = (d) => LONG.format(new Date(`${d}T12:00:00Z`));
const slug = (t) => (t || 'erebus-stats').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase() || 'erebus-stats';
const canCopy = typeof window !== 'undefined' && typeof window.ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function StatsTab() {
  const [preset, setPreset] = useState('30');
  const [custom, setCustom] = useState({ from: daysBack(29), to: today() });
  const [title, setTitle] = useState('Athens by Night');
  const [shape, setShape] = useState('wide');
  const [off, setOff] = useState(() => new Set()); // unticked card ids; new cards start ticked
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const [poster, setPoster] = useState(null);
  const stageRef = useRef(null);

  const cycles = data?.cycles || [];
  const range = useMemo(() => {
    if (preset === '7') return { from: daysBack(6), to: today(), label: 'The last 7 nights' };
    if (preset === '30') return { from: daysBack(29), to: today(), label: 'The last 30 nights' };
    if (preset === 'all') return { from: '', to: '', label: 'All time' };
    if (preset === 'custom') return { ...custom, label: null };
    const c = cycles.find((x) => `c:${x.from}` === preset);
    return c ? { from: c.from, to: c.to || today(), label: c.label } : { from: '', to: '', label: 'All time' };
  }, [preset, custom, cycles]);
  const periodLabel = [range.label, range.from && range.to ? `${longDay(range.from)} – ${longDay(range.to)}` : null].filter(Boolean).join(' · ');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.get('/admin/stats', { params: { from: range.from, to: range.to } })
      .then(({ data: d }) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(formatApiError(e, 'Could not load the stats')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range.from, range.to]);

  const sections = data?.sections || [];
  const chosen = sections.map((sec) => ({ ...sec, cards: sec.cards.filter((c) => !off.has(c.id)) })).filter((sec) => sec.cards.length);
  const chosenCount = chosen.reduce((n, sec) => n + sec.cards.length, 0);

  const toggle = (id) => setOff((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const setSection = (sec, on) => setOff((prev) => {
    const next = new Set(prev);
    for (const c of sec.cards) if (on) next.delete(c.id); else next.add(c.id);
    return next;
  });
  const onlySection = (sec) => setOff(new Set(sections.filter((x) => x.id !== sec.id).flatMap((x) => x.cards.map((c) => c.id))));

  // Draw one image: render the Poster off-screen, wait for its images, capture it.
  async function capture(next) {
    flushSync(() => setPoster(next));
    const node = stageRef.current.firstElementChild;
    await Promise.all([...node.querySelectorAll('img')].map((img) => (img.complete ? null
      : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; }))));
    await document.fonts?.ready;
    const canvas = await html2canvas(node, {
      backgroundColor: '#0c0a0b', scale: 2, useCORS: true, logging: false,
      onclone: (doc) => { const stage = doc.querySelector('[data-stats-stage]'); if (stage) stage.style.opacity = '1'; },
    });
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  async function exportImages(mode) {
    setBusy(true);
    setError('');
    setDone('');
    try {
      if (shape === 'wide') {
        const blob = await capture({ shape, sections: chosen });
        if (mode === 'copy') {
          await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
          setDone('Copied. Paste it into Discord with Ctrl+V.');
        } else {
          download(blob, `${slug(title)}.png`);
          setDone('Image downloaded.');
        }
      } else {
        for (const sec of chosen) {
          for (const card of sec.cards) {
            download(await capture({ shape, sections: [{ ...sec, cards: [card] }] }), `${slug(title)}-${card.id.replace(/\./g, '-')}.png`);
          }
        }
        setDone(`${chosenCount} images downloaded.`);
      }
    } catch (e) {
      setError(`Export failed: ${e.message || e}`);
    } finally {
      flushSync(() => setPoster(null));
      setBusy(false);
    }
  }

  return (
    <div className={s.board}>
      <div className={s.toolbar}>
        <label className={s.field}>
          <span>Title on the image</span>
          <input className={`${s.input} ${s.titleInput}`} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Leave empty for no title" />
        </label>
        <label className={s.field}>
          <span>Period</span>
          <select className={s.select} value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            {cycles.map((c) => <option key={c.from} value={`c:${c.from}`}>{c.label} ({longDay(c.from)}{c.to ? ` – ${longDay(c.to)}` : ''})</option>)}
            <option value="all">All time</option>
            <option value="custom">Custom dates</option>
          </select>
        </label>
        {preset === 'custom' && (
          <>
            <label className={s.field}><span>From</span><input type="date" className={s.input} value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} /></label>
            <label className={s.field}><span>To</span><input type="date" className={s.input} value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} /></label>
          </>
        )}
        <div className={s.field}>
          <span>Image shape</span>
          <div className={s.seg} role="group" aria-label="Image shape">
            <button type="button" aria-pressed={shape === 'wide'} onClick={() => setShape('wide')}>Wide poster</button>
            <button type="button" aria-pressed={shape === 'square'} onClick={() => setShape('square')}>Square, one per card</button>
          </div>
        </div>
        <span className={s.spacer} />
        <span className={s.count}>{chosenCount} of {sections.reduce((n, sec) => n + sec.cards.length, 0)} cards ticked</span>
        <button type="button" className={s.btn} onClick={() => setOff(new Set())} disabled={busy}>Tick all</button>
        <button type="button" className={s.btn} onClick={() => setOff(new Set(sections.flatMap((x) => x.cards.map((c) => c.id))))} disabled={busy}>Untick all</button>
        {shape === 'wide' && canCopy && (
          <button type="button" className={s.btn} onClick={() => exportImages('copy')} disabled={busy || !chosenCount}>
            <FaGlyph name="fa-image" size={15} />Copy image
          </button>
        )}
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => exportImages('download')} disabled={busy || !chosenCount}>
          <FaGlyph name="fa-download" size={15} />
          {busy ? 'Drawing…' : shape === 'wide' ? 'Download image' : `Download ${chosenCount} ${chosenCount === 1 ? 'image' : 'images'}`}
        </button>
      </div>

      <div aria-live="polite">
        {error && <div className={`${s.note} ${s.error}`}>{error}</div>}
        {done && <div className={s.note}>{done}</div>}
        {!error && !done && <div className={s.note}>Click a card to leave it out of the image. Hover a bar or a cell for its number.</div>}
      </div>

      {!data && loading && <div className={s.note}>Counting the nights…</div>}

      <div style={{ opacity: loading && data ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {sections.map((sec) => {
          const ticked = sec.cards.filter((c) => !off.has(c.id)).length;
          return (
            <section key={sec.id} className={s.section} style={{ marginBottom: '2em' }}>
              <div className={s.sectionHead}>
                <SectionTitle section={sec} />
                <span className={s.count}>{ticked} / {sec.cards.length}</span>
                <span className={s.sectionTools}>
                  <button type="button" className={s.linkBtn} onClick={() => onlySection(sec)}>Only this section</button>
                  <button type="button" className={s.linkBtn} onClick={() => setSection(sec, ticked < sec.cards.length)}>
                    {ticked < sec.cards.length ? 'Tick section' : 'Untick section'}
                  </button>
                </span>
              </div>
              <div className={s.grid}>
                {sec.cards.map((card) => {
                  const on = !off.has(card.id);
                  return (
                    <div
                      key={card.id}
                      className={`${s.pick} ${s[spanOf(card)] || ''}`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={on}
                      aria-label={`${card.title}: ${on ? 'in the image' : 'left out'}`}
                      onClick={() => toggle(card.id)}
                      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(card.id); } }}
                    >
                      <StatCard card={card} />
                      <span className={s.check} aria-hidden="true">{on && <FaGlyph name="fa-check" size={11} />}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className={s.stage} data-stats-stage ref={stageRef} aria-hidden="true">
        {poster && <Poster shape={poster.shape} title={title.trim()} periodLabel={periodLabel} sections={poster.sections} />}
      </div>
    </div>
  );
}
