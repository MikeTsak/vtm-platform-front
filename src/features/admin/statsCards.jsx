// src/features/admin/statsCards.jsx
//
// Draws the cards the stats API returns (back/services/adminStats.js), on the
// page and in the exported images (Poster). One component per card kind; a
// card is sized in em, so the same card scales from the page to a square post.
import React from 'react';
import FaGlyph from '../../ui/FaGlyph';
import { symlogoWhite } from '../../data/clans';
import { getDivisionName } from '../../constants/divisionNames';
import { getD10Image } from '../../ui/dice3d/diceUi';
import s from '../../styles/Stats.module.css';

const ACCENT = '#e66767';
const num = (n) => Number(n || 0).toLocaleString('en-US');
// API text: a string, or { division: n } for that division's name.
const txt = (v) => (v && typeof v === 'object' && 'division' in v ? getDivisionName(v.division) : v);
const em = (n) => ({ width: `${n}em`, height: `${n}em` });

// How many poster columns (of 3) a card takes.
export const spanOf = (card) => {
  if (card.kind === 'timeline' || card.kind === 'heatmap') return 'full';
  if (card.kind === 'bars') return card.items.length > 4 ? 'wide' : '';
  return ['columns', 'split', 'tiles', 'roll', 'list'].includes(card.kind) ? 'wide' : '';
};

function ClanMark({ clan, small }) {
  if (!clan || clan === 'Unknown') return null;
  return <span className={small ? s.clanMarkSm : s.clanMark}><img src={symlogoWhite(clan)} alt="" /></span>;
}

const Title = ({ children }) => <h3 className={s.cardTitle}>{children}</h3>;

function Hero({ card }) {
  return (
    <>
      <Title>{card.title}</Title>
      <div className={s.heroValue}>{card.value}</div>
      {card.sub && <div className={s.sub}>{card.sub}</div>}
    </>
  );
}

function Tiles({ card }) {
  return (
    <>
      <Title>{card.title}</Title>
      <div className={s.tiles}>
        {card.items.map((it) => (
          <div key={it.label}>
            <div className={s.tileLabel}>{it.label}</div>
            <div className={s.tileValue}>{txt(it.value)}</div>
            {it.sub && <div className={s.tileSub}>{it.sub}</div>}
          </div>
        ))}
      </div>
    </>
  );
}

function Award({ card }) {
  return (
    <>
      <div className={s.awardIcon}><FaGlyph name={card.icon} style={em(1.4)} /></div>
      <div className={s.awardBody}>
        <div className={s.awardTitle}>{card.title}</div>
        <div className={s.who}><ClanMark clan={card.clan} /><span>{card.name}</span></div>
        <div className={s.sub}>{card.value}</div>
      </div>
    </>
  );
}

function Bars({ card }) {
  const max = Math.max(1, ...card.items.map((i) => i.value));
  return (
    <>
      <Title>{card.title}</Title>
      <div className={s.bars} role="list">
        {card.items.map((it, i) => (
          <div key={i} className={s.barRow} role="listitem" title={`${txt(it.label)}: ${num(it.value)} ${card.unit || ''}`}>
            <div className={s.barLabel}><ClanMark clan={it.clan} small /><span>{txt(it.label)}</span></div>
            <div className={s.barTrack}>
              <div className={s.bar} style={{ width: `${(it.value / max) * 82}%` }} />
              <span className={s.barValue}>{num(it.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Columns({ card }) {
  const max = Math.max(1, ...card.items.map((i) => i.value));
  return (
    <>
      <Title>{card.title}</Title>
      <div>
        <div className={s.cols}>
          {card.items.map((it) => (
            <div key={it.label} className={s.col} title={`${it.label}: ${num(it.value)}`}>
              <span className={s.colValue}>{num(it.value)}</span>
              <div className={s.colBar} style={{ height: `${(it.value / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className={s.colLabels}>{card.items.map((it) => <span key={it.label}>{it.label}</span>)}</div>
      </div>
      {card.sub && <div className={s.sub}>{card.sub}</div>}
    </>
  );
}

function Split({ card }) {
  const total = card.items.reduce((a, i) => a + i.value, 0) || 1;
  return (
    <>
      <Title>{card.title}</Title>
      <div className={s.splitBar} role="img" aria-label={card.items.map((i) => `${i.label} ${num(i.value)}`).join(', ')}>
        {card.items.map((it, i) => {
          const share = Math.round((it.value / total) * 100);
          return (
            <div key={it.label} className={s[`seg${i + 1}`]} style={{ flex: `${it.value} 1 0px` }} title={`${it.label}: ${num(it.value)} (${share}%)`}>
              {share >= 9 && <span className={s.segText}>{share}%</span>}
            </div>
          );
        })}
      </div>
      <div className={s.legend}>
        {card.items.map((it, i) => (
          <span key={it.label} className={s.legendItem}>
            <span className={s.swatch} style={{ background: `var(--s${i + 1})` }} />{it.label} {num(it.value)}
          </span>
        ))}
      </div>
    </>
  );
}

const SHORT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
function bucketLabel(t, bucket) {
  if (bucket === 'month') return MONTH.format(new Date(`${t}-15T12:00:00Z`));
  const d = SHORT.format(new Date(`${t}T12:00:00Z`));
  return bucket === 'week' ? `week of ${d}` : d;
}

function Timeline({ card }) {
  const pts = card.points;
  const max = Math.max(1, ...pts.map((p) => p.value));
  const W = 1000; const H = 100;
  const x = (i) => (pts.length === 1 ? W / 2 : (i / (pts.length - 1)) * W);
  const y = (v) => H - (v / max) * H;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const peak = pts.reduce((b, p, i) => (p.value > pts[b].value ? i : b), 0);
  const slot = W / Math.max(1, pts.length - 1);
  return (
    <>
      <Title>{card.title}</Title>
      <div className={s.timeline}>
        <div className={s.plot}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${card.title}, peak ${num(max)} ${card.unit} (${bucketLabel(pts[peak].t, card.bucket)})`}>
            <path d={`${line} L${W},${H} L0,${H} Z`} fill={ACCENT} fillOpacity="0.1" />
            <path d={line} fill="none" stroke={ACCENT} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => (
              <rect key={p.t} x={x(i) - slot / 2} y="0" width={slot} height={H} fill="transparent">
                <title>{`${bucketLabel(p.t, card.bucket)}: ${num(p.value)} ${card.unit}`}</title>
              </rect>
            ))}
          </svg>
          <span className={s.peakDot} style={{ left: `${x(peak) / 10}%`, top: '0%' }} />
          <span className={s.peak} style={{ left: `${Math.min(92, Math.max(8, x(peak) / 10))}%`, top: '0%' }}>{num(max)}</span>
        </div>
        <div className={s.axis}>
          <span>{bucketLabel(pts[0].t, card.bucket)}</span>
          <span>{card.bucket === 'day' ? 'per day' : card.bucket === 'week' ? 'per week' : 'per month'}</span>
          <span>{bucketLabel(pts[pts.length - 1].t, card.bucket)}</span>
        </div>
      </div>
    </>
  );
}

const heat = (n, max) => (n ? `rgba(230, 103, 103, ${(0.12 + 0.88 * (n / max)).toFixed(3)})` : 'rgba(255, 255, 255, 0.03)');

function Heatmap({ card }) {
  const max = Math.max(1, ...card.grid.flat());
  const hh = (h) => `${String(h).padStart(2, '0')}:00`;
  return (
    <>
      <Title>{card.title}</Title>
      <div className={s.heat} role="img" aria-label="Messages by weekday and hour, Athens time">
        {card.rows.map((day, d) => (
          <React.Fragment key={day}>
            <span className={s.heatRow}>{day}</span>
            {card.grid[d].map((n, h) => <div key={h} className={s.cell} style={{ background: heat(n, max) }} title={`${day} ${hh(h)}: ${num(n)} messages`} />)}
          </React.Fragment>
        ))}
      </div>
      <div className={s.heatHours}><span />{[0, 3, 6, 9, 12, 15, 18, 21].map((h) => <span key={h}>{hh(h)}</span>)}</div>
      <div className={s.legend}>
        <span className={s.legendItem}>Quieter</span>
        {[0.1, 0.3, 0.55, 0.8, 1].map((f) => <span key={f} className={s.swatch} style={{ background: heat(f * max, max) }} />)}
        <span className={s.legendItem}>Busier (Athens time)</span>
      </div>
    </>
  );
}

function List({ card }) {
  return (
    <>
      <Title>{card.title}</Title>
      <ol className={s.list}>
        {card.items.map((it, i) => (
          <li key={i} className={s.listRow}>
            <span className={s.rank}>{i + 1}</span>
            <span className={s.listName}><ClanMark clan={it.clan} small /><span>{it.name}</span></span>
            <span className={s.listValue}>{it.value}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

function Roll({ card }) {
  return (
    <>
      <Title>{card.title}</Title>
      <div className={s.who}><ClanMark clan={card.clan} /><span>{card.name}</span></div>
      <div className={s.sub}>{card.value}</div>
      <div className={s.dice}>
        {card.normal.map((v, i) => <img key={`n${i}`} className={s.die} src={getD10Image(v)} alt={`${v}`} title={`${v}`} />)}
        {card.hunger.map((v, i) => <img key={`h${i}`} className={s.die} src={getD10Image(v, true)} alt={`Hunger ${v}`} title={`Hunger ${v}`} />)}
      </div>
      {card.note && <div className={s.rollNote}>{card.note}</div>}
    </>
  );
}

const BODY = { hero: Hero, tiles: Tiles, award: Award, bars: Bars, columns: Columns, split: Split, timeline: Timeline, heatmap: Heatmap, list: List, roll: Roll };

export function StatCard({ card }) {
  const Body = BODY[card.kind];
  if (!Body) return null;
  return (
    <article className={`${s.card} ${card.kind === 'award' ? s.award : ''}`}>
      <Body card={card} />
    </article>
  );
}

export function SectionTitle({ section }) {
  return <h2 className={s.sectionTitle}><FaGlyph name={section.icon} style={em(0.9)} />{section.title}</h2>;
}

/* ---------------- Thermal receipt (StatsTab "Print on thermal") ----------------
   The same cards as plain black text and solid black marks, for a 72 mm roll:
   the dark poster shrunk to that width and dithered was unreadable. Printed
   as real text by the printer driver, so it stays sharp at small sizes. */

const pct = (v, max) => `${Math.max(0, (v / max) * 100).toFixed(1)}%`;

function TBar({ label, value, max, note }) {
  return (
    <div className="row">
      <div className="kv"><span>{txt(label)}</span><b>{num(value)}{note ? ` ${note}` : ''}</b></div>
      <div className="track"><div className="fill" style={{ width: pct(value, max) }} /></div>
    </div>
  );
}

function ThermalCard({ card }) {
  const head = card.kind === 'award' ? null : <h3>{card.title}</h3>;
  switch (card.kind) {
    case 'hero':
      return <>{head}<div className="big">{card.value}</div>{card.sub && <p>{card.sub}</p>}</>;
    case 'tiles':
      return <>{head}{card.items.map((it) => <div key={it.label} className="kv"><span>{it.label}{it.sub ? ` (${it.sub})` : ''}</span><b>{txt(it.value)}</b></div>)}</>;
    case 'award':
      return <><h3>{card.title}</h3><div className="name">{card.name}</div><p>{card.value}</p></>;
    case 'bars':
    case 'columns': {
      const max = Math.max(1, ...card.items.map((i) => i.value));
      return <>{head}{card.items.map((it, i) => <TBar key={i} label={it.label} value={it.value} max={max} />)}{card.sub && <p>{card.sub}</p>}</>;
    }
    case 'split': {
      const total = card.items.reduce((a, i) => a + i.value, 0) || 1;
      return <>{head}{card.items.map((it) => <TBar key={it.label} label={it.label} value={it.value} max={total} note={`(${Math.round((it.value / total) * 100)}%)`} />)}</>;
    }
    case 'timeline': {
      const pts = card.points;
      const max = Math.max(1, ...pts.map((p) => p.value));
      const W = 1000; const H = 240;
      const x = (i) => (pts.length === 1 ? W / 2 : (i / (pts.length - 1)) * W);
      const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${(H - (p.value / max) * H).toFixed(1)}`).join(' ');
      const peak = pts.reduce((b, p, i) => (p.value > pts[b].value ? i : b), 0);
      return (
        <>
          {head}
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="line">
            <path d={line} fill="none" stroke="#000" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
          <div className="kv small"><span>{bucketLabel(pts[0].t, card.bucket)}</span><span>{bucketLabel(pts[pts.length - 1].t, card.bucket)}</span></div>
          <p>Peak {num(max)} {card.unit} ({bucketLabel(pts[peak].t, card.bucket)}), {card.bucket === 'day' ? 'per day' : card.bucket === 'week' ? 'per week' : 'per month'}</p>
        </>
      );
    }
    case 'heatmap': {
      const max = Math.max(1, ...card.grid.flat());
      return (
        <>
          {head}
          <div className="heat">
            {card.rows.map((day, d) => (
              <div key={day} className="heatRow">
                <span>{day.slice(0, 2)}</span>
                {card.grid[d].map((n, h) => (
                  <i key={h}>{n > 0 && <b style={{ width: pct(Math.sqrt(n / max), 1), height: pct(Math.sqrt(n / max), 1) }} />}</i>
                ))}
              </div>
            ))}
            <div className="heatRow small"><span />{[0, 6, 12, 18].map((h) => <em key={h}>{String(h).padStart(2, '0')}</em>)}</div>
          </div>
          <p>Bigger square = busier hour (Athens time)</p>
        </>
      );
    }
    case 'list':
      return <>{head}{card.items.map((it, i) => <div key={i} className="kv"><span>{i + 1}. {it.name}</span><b>{it.value}</b></div>)}</>;
    case 'roll':
      return (
        <>
          {head}
          <div className="name">{card.name}</div>
          <p>{card.value}</p>
          <p>Dice: {card.normal.join(' ')}{card.hunger.length ? ` | Hunger: ${card.hunger.join(' ')}` : ''}</p>
          {card.note && <p>{card.note}</p>}
        </>
      );
    default:
      return null;
  }
}

export function ThermalReport({ title, periodLabel, sections }) {
  return (
    <div className="report">
      <header>
        <div className="brand">EREBUS PORTAL</div>
        {title && <h1>{title}</h1>}
        <div className="period">{periodLabel}</div>
      </header>
      {sections.map((sec) => (
        <section key={sec.id}>
          <h2>{sec.title}</h2>
          {sec.cards.map((card) => <div key={card.id} className="card"><ThermalCard card={card} /></div>)}
        </section>
      ))}
      <footer>Athens Through-Time Larp · Erebus Portal</footer>
    </div>
  );
}

// One continuous receipt (no page breaks, so no cuts until the end).
export const thermalReportCss = (sideMm) => `
  @page { margin: 0; }
  html, body { margin: 0; background: #fff; }
  * { color: #000 !important; box-sizing: border-box; }
  .report { padding: 3mm ${sideMm}mm 10mm; font: 10pt/1.3 Arial, Helvetica, sans-serif; }
  header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 2mm; margin-bottom: 3mm; }
  .brand { font-size: 8pt; font-weight: 700; letter-spacing: .25em; }
  h1 { font-size: 16pt; margin: 1mm 0; line-height: 1.1; }
  .period { font-size: 9pt; font-weight: 700; }
  section { margin-top: 4mm; }
  h2 { font-size: 12pt; text-transform: uppercase; letter-spacing: .08em; border-bottom: 2px solid #000; margin: 0 0 2mm; padding-bottom: .5mm; }
  .card { padding: 1.5mm 0 2.5mm; border-bottom: 1px dashed #000; }
  .card:last-child { border-bottom: 0; }
  h3 { font-size: 10pt; font-weight: 800; margin: 0 0 1mm; }
  p { margin: .8mm 0 0; font-size: 9pt; }
  .big { font-size: 22pt; font-weight: 800; line-height: 1.1; }
  .name { font-size: 12pt; font-weight: 800; }
  .kv { display: flex; justify-content: space-between; gap: 2mm; }
  .kv span { min-width: 0; overflow-wrap: anywhere; }
  .kv b { white-space: nowrap; }
  .small { font-size: 8pt; }
  .row { margin-bottom: 1.2mm; }
  .track { height: 2.2mm; margin-top: .4mm; }
  .fill { height: 100%; background: #000 !important; min-width: .6mm; }
  svg.line { display: block; width: 100%; height: 20mm; border-bottom: 1px solid #000; margin: 1mm 0; }
  .heat { margin: 1mm 0; }
  .heatRow { display: grid; grid-template-columns: 5mm repeat(24, 1fr); align-items: center; font-size: 7pt; }
  .heatRow.small { grid-template-columns: 5mm repeat(4, 1fr); }
  .heatRow i { display: flex; align-items: center; justify-content: center; aspect-ratio: 1; }
  .heatRow i b { display: block; background: #000 !important; }
  .heatRow em { font-style: normal; }
  footer { margin-top: 4mm; border-top: 3px solid #000; padding-top: 1.5mm; text-align: center; font-size: 8pt; }
`;

/** The exported image: a wide poster of every section given, or a square holding one card. */
export function Poster({ shape, title, periodLabel, sections }) {
  const square = shape === 'square';
  return (
    <div className={`${s.poster} ${square ? s.posterSquare : s.posterWide}`}>
      <header className={s.posterHead}>
        <div className={s.brand}><img src="/img/ATT-logo(1).webp" alt="" />EREBUS PORTAL</div>
        {title && <h1 className={s.posterTitle}>{title}</h1>}
        <div className={s.posterPeriod}>{periodLabel}</div>
      </header>
      {sections.map((sec) => (
        <section key={sec.id} className={s.posterSection}>
          <SectionTitle section={sec} />
          {square ? <StatCard card={sec.cards[0]} /> : (
            <div className={s.posterGrid}>
              {sec.cards.map((c) => <div key={c.id} className={s[spanOf(c)] || undefined}><StatCard card={c} /></div>)}
            </div>
          )}
        </section>
      ))}
      <footer className={s.posterFoot}>© Athens Through-Time Larp · Stats from Erebus Portal, made by MikeTsak.gr</footer>
    </div>
  );
}
