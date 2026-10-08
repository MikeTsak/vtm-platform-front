import React, { useEffect, useMemo, useRef, useState } from 'react';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/court/CourtActions.module.css';
import { InvitationCard } from './ElysiumInvitation';
import ElysiumInvitationModal from './ElysiumInvitation';
import {
  SURFACES, ACCENTS, ORNAMENTS, FONTS, SEALS, DEFAULT_DESIGN, DEFAULT_TEXT,
  resolveDesign, surfaceBackground, formatElysiumDate,
} from './elysiumPresets';

const Icon = ({ name, size = 18 }) => (
  <span className="material-symbols-outlined" style={{ fontSize: size }} aria-hidden="true">{name}</span>
);

const TEXT_KEYS = ['name', 'location', 'salutation', 'body', 'dress_code', 'signature'];

function Swatches({ value, onChange }) {
  return (
    <div className={styles.swatches}>
      {SURFACES.map(s => (
        <button key={s.id} type="button" className={`${styles.swatch} ${value === s.id ? styles.swatchOn : ''}`}
          style={{ background: s.bg }} onClick={() => onChange(s.id)} aria-pressed={value === s.id}>
          {s.label}
        </button>
      ))}
    </div>
  );
}

function Chips({ options, value, onChange, render }) {
  return (
    <div className={styles.chips}>
      {options.map(o => (
        <button key={o.id} type="button" className={`${styles.chip} ${value === o.id ? styles.chipOn : ''}`}
          onClick={() => onChange(o.id)} aria-pressed={value === o.id}>
          {render ? render(o) : o.label}
        </button>
      ))}
    </div>
  );
}

// Upload through the court's existing media endpoint (sharp -> webp -> CDN).
function ImagePicker({ label, value, onChange }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/news/upload', fd);
      if (!/^https:\/\//.test(data?.url || '')) throw new Error('The image host returned an unusable address.');
      onChange(data.url);
    } catch (err) {
      alert(formatApiError(err, 'The image could not be uploaded.'));
    } finally { setBusy(false); }
  };
  return (
    <div className={styles.row} style={{ marginTop: '0.5rem' }}>
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
      <button type="button" className={`${styles.btn} ${styles.btnSmall}`} disabled={busy} onClick={() => ref.current?.click()}>
        <Icon name="add_photo_alternate" size={16} /> {busy ? 'Uploading...' : value ? `Replace ${label}` : `Upload your own ${label}`}
      </button>
      {value && (
        <>
          <span className={styles.itemMeta}>Your image is in use (darkened for legibility).</span>
          <button type="button" className={`${styles.btn} ${styles.btnSmall}`} onClick={() => onChange(null)}>Use preset</button>
        </>
      )}
    </div>
  );
}

export function HomeBannerPreview({ name, date, design, location }) {
  const d = resolveDesign(design);
  const when = formatElysiumDate(date);
  return (
    <div className={styles.banner} style={{ background: surfaceBackground(d.banner, d.bannerImage), color: d.banner.ink }}>
      <span className={styles.bannerEyebrow}>Next Modern Event</span>
      <span className={styles.bannerTitle}>{name || DEFAULT_TEXT.name}</span>
      <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>{when.day}{location ? ` · ${location}` : ''}</span>
    </div>
  );
}

export default function KeeperPanel() {
  const [loaded, setLoaded] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [guestQuery, setGuestQuery] = useState('');
  const [fullPreview, setFullPreview] = useState(false);

  const hydrate = (data) => {
    setLoaded(data);
    if (!data.event) return;
    const inv = data.invitation || {};
    const f = { design: { ...DEFAULT_DESIGN, ...(inv.design || {}) }, barred: inv.barred || [] };
    // A new cycle starts from the house text where the last invitation left nothing;
    // a saved invitation keeps its cleared lines cleared.
    for (const k of TEXT_KEYS) f[k] = inv[k] ?? (inv.is_new && k !== 'name' ? DEFAULT_TEXT[k] : '');
    setForm(f);
  };

  const load = () => api.get('/court-actions/elysium').then(({ data }) => hydrate(data)).catch(e => setErr(formatApiError(e, 'Could not open the invitation.')));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setDesign = (k, v) => setForm(f => ({ ...f, design: { ...f.design, [k]: v } }));

  const flash = (m) => { setMsg(m); setErr(''); setTimeout(() => setMsg(''), 3500); };

  const save = async () => {
    setBusy(true);
    try {
      const design = { ...form.design };
      for (const k of ['cardImage', 'bannerImage']) if (!design[k]) delete design[k];
      await api.put(`/court-actions/elysium/${loaded.event.id}`, { ...form, design });
      await load();
      flash('The invitation is saved.');
      return true;
    } catch (e) {
      setErr(formatApiError(e, 'The invitation was not saved.'));
      return false;
    } finally { setBusy(false); }
  };

  const publish = async (publishIt, reannounce = false) => {
    const prompt = !publishIt
      ? 'Withdraw the invitation? Players will see "Invitation pending" again.'
      : reannounce
        ? 'Send it again? Every guest gets the pop-up on their next visit to Home.'
        : 'Publish the invitation? Every guest will see it pop up the next time they open Home.';
    if (!window.confirm(prompt)) return;
    if (publishIt && !(await save())) return;
    setBusy(true);
    try {
      await api.post(`/court-actions/elysium/${loaded.event.id}/publish`, { publish: publishIt, reannounce });
      await load();
      flash(publishIt ? 'The invitation is out.' : 'The invitation is withdrawn.');
    } catch (e) {
      setErr(formatApiError(e, 'The court could not deliver it.'));
    } finally { setBusy(false); }
  };

  const guests = useMemo(() => {
    const q = guestQuery.trim().toLowerCase();
    return (loaded?.guests || []).filter(g => !q || g.name.toLowerCase().includes(q) || (g.clan || '').toLowerCase().includes(q));
  }, [loaded, guestQuery]);

  const toggleBar = (id) => setForm(f => ({ ...f, barred: f.barred.includes(id) ? f.barred.filter(x => x !== id) : [...f.barred, id] }));

  if (err && !form) return <div className={styles.error}>{err}</div>;
  if (!loaded) return <div className={styles.empty}>Unsealing the Keeper's desk...</div>;
  if (!loaded.event) {
    return (
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}><Icon name="event_busy" /> No Elysium is scheduled</h2>
        <p className={styles.hint}>The Storytellers set the date of each Elysium on their Calendar. Once the next one is on it, you can write and send its invitation here.</p>
      </section>
    );
  }

  const inv = loaded.invitation;
  const published = !!inv?.published_at;
  const when = formatElysiumDate(loaded.event.date);
  const sampleGuest = { name: 'Your Guest', clan: 'Toreador' };
  const barredCount = form.barred.length + (loaded.guests || []).filter(g => g.is_bloodhunted && !form.barred.includes(g.id)).length;

  return (
    <div className={styles.keeperLayout}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
        <section className={styles.panel}>
          <div className={styles.itemHead}>
            <h2 className={styles.panelTitle}><Icon name="local_florist" /> The Gathering</h2>
            <span className={styles.statusChip}>
              <Icon name={published ? 'mark_email_read' : 'edit_note'} size={16} />
              {published ? `Published · opened by ${loaded.read_count}` : 'Draft: only you can see it'}
            </span>
          </div>
          <p className={styles.hint}>
            {when.day} at {when.time}. The date belongs to the Storytellers' Calendar and cannot be moved from here. The invitation leaves every Home screen on the morning of the gathering, and the next Elysium's cycle begins.
          </p>
          {msg && <div className={styles.item} style={{ marginBottom: '0.75rem', borderColor: '#69f0ae', color: '#69f0ae' }}>{msg}</div>}
          {err && <div className={styles.error}>{err}</div>}
          <label className={styles.field}><span>Name of the Elysium</span>
            <input className={styles.input} value={form.name} maxLength={160} onChange={e => set('name', e.target.value)} placeholder="The Feast of Thorns" />
          </label>
          <label className={styles.field}><span>Location (in universe)</span>
            <input className={styles.input} value={form.location} maxLength={255} onChange={e => set('location', e.target.value)} placeholder="The Zappeion, east gallery" />
          </label>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}><Icon name="ink_pen" /> The Words</h2>
          <p className={styles.hint}>Write <b>{'{name}'}</b> and <b>{'{clan}'}</b> anywhere: each guest sees their own character's name and clan.</p>
          <label className={styles.field}><span>Salutation</span>
            <input className={styles.input} value={form.salutation} maxLength={255} onChange={e => set('salutation', e.target.value)} />
          </label>
          <label className={styles.field}><span>The invitation (a blank line starts a new paragraph)</span>
            <textarea className={styles.input} rows={7} value={form.body} maxLength={8000} onChange={e => set('body', e.target.value)} />
          </label>
          <div className={styles.grid2}>
            <label className={styles.field}><span>Attire</span>
              <input className={styles.input} value={form.dress_code} maxLength={160} onChange={e => set('dress_code', e.target.value)} />
            </label>
            <label className={styles.field}><span>Signed</span>
              <input className={styles.input} value={form.signature} maxLength={160} onChange={e => set('signature', e.target.value)} />
            </label>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}><Icon name="palette" /> The Design</h2>
          <h3 className={styles.sectionLabel}>Invitation background</h3>
          <Swatches value={form.design.cardPreset} onChange={v => setDesign('cardPreset', v)} />
          <ImagePicker label="background" value={form.design.cardImage} onChange={v => setDesign('cardImage', v)} />

          <h3 className={styles.sectionLabel}>Home screen banner</h3>
          <Swatches value={form.design.bannerPreset} onChange={v => setDesign('bannerPreset', v)} />
          <ImagePicker label="banner" value={form.design.bannerImage} onChange={v => setDesign('bannerImage', v)} />

          <h3 className={styles.sectionLabel}>Foil</h3>
          <Chips options={ACCENTS} value={form.design.accent} onChange={v => setDesign('accent', v)}
            render={a => <><span className={styles.accentDot} style={{ background: `linear-gradient(135deg, ${a.c}, ${a.a}, ${a.b})` }} />{a.label}</>} />
          <h3 className={styles.sectionLabel}>Ornament</h3>
          <Chips options={ORNAMENTS} value={form.design.ornament} onChange={v => setDesign('ornament', v)} />
          <h3 className={styles.sectionLabel}>Title lettering</h3>
          <Chips options={FONTS} value={form.design.font} onChange={v => setDesign('font', v)}
            render={f => <span style={{ fontFamily: f.family, fontSize: f.id === 'script' ? '1.1rem' : undefined }}>{f.label}</span>} />
          <h3 className={styles.sectionLabel}>Wax seal</h3>
          <Chips options={SEALS} value={form.design.seal} onChange={v => setDesign('seal', v)} />
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}><Icon name="group" /> The Guest List</h2>
          <p className={styles.hint}>Every Kindred of the city is invited unless you strike them. Struck guests are told the doors are closed to them and never learn the venue. Anyone under a Blood Hunt is struck automatically.</p>
          <input className={styles.input} placeholder="Search name or clan" value={guestQuery} onChange={e => setGuestQuery(e.target.value)} style={{ marginBottom: '0.5rem' }} />
          <div className={styles.guestList}>
            {guests.map(g => {
              const hunted = !!g.is_bloodhunted;
              const barred = hunted || form.barred.includes(g.id);
              return (
                <label key={g.id} className={`${styles.guest} ${barred ? styles.guestBarred : ''}`}>
                  <input type="checkbox" checked={!barred} disabled={hunted} onChange={() => toggleBar(g.id)} />
                  <span>{g.name}</span>
                  <span className={styles.itemMeta}>{hunted ? 'Blood Hunted' : g.clan}</span>
                </label>
              );
            })}
          </div>
          <p className={styles.itemMeta} style={{ marginTop: '0.5rem' }}>{barredCount} not invited.</p>
        </section>
      </div>

      <aside className={styles.previewCol}>
        <div className={styles.row}>
          <button className={`${styles.btn}`} disabled={busy} onClick={save}><Icon name="save" /> Save draft</button>
          {!published && <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy} onClick={() => publish(true)}><Icon name="send" /> Publish</button>}
          {published && <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy} onClick={save}><Icon name="sync" /> Save changes</button>}
          {published && <button className={styles.btn} disabled={busy} onClick={() => publish(true, true)}><Icon name="notifications_active" /> Send again</button>}
          {published && <button className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={() => publish(false)}>Withdraw</button>}
          <button className={styles.btn} onClick={() => setFullPreview(true)}><Icon name="open_in_full" /> Preview</button>
        </div>
        <HomeBannerPreview name={form.name} date={loaded.event.date} design={form.design} location={form.location} />
        <InvitationCard invitation={form} eventDate={loaded.event.date} guest={sampleGuest} />
      </aside>

      <ElysiumInvitationModal open={fullPreview} onClose={() => setFullPreview(false)} invitation={form} eventDate={loaded.event.date} guest={sampleGuest} />
    </div>
  );
}
