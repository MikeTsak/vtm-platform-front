import React, { useEffect, useMemo, useState } from 'react';
import api, { formatApiError } from '../../core/api';
import { formatEuDate } from '../../utils/dateFormatter';
import styles from '../../styles/Admin.module.css';
import { InvitationCard } from '../court/ElysiumInvitation';
import { HomeBannerPreview } from '../court/KeeperPanel';
import DownloadCardButton from '../court/CardExport';
import { SURFACES, ACCENTS, ORNAMENTS, FONTS, SEALS, LANGS, resolveDesign } from '../court/elysiumPresets';

const ACTIONS = {
  import: { label: 'Recorded before history began', icon: 'inventory_2', color: '#90a4ae' },
  save: { label: 'Draft saved', icon: 'edit_note', color: '#b0bec5' },
  edit: { label: 'Edited after publishing', icon: 'edit', color: '#ffb300' },
  publish: { label: 'Published', icon: 'send', color: '#69f0ae' },
  withdraw: { label: 'Withdrawn', icon: 'unpublished', color: '#ff8a80' },
  reannounce: { label: 'Sent again (pop-up for everyone)', icon: 'notifications_active', color: '#4da6ff' },
  calendar_rename: { label: 'Renamed from the Calendar', icon: 'calendar_month', color: '#b388ff' },
};

const FIELDS = [
  ['name', 'Name'], ['location', 'Location'], ['salutation', 'Salutation'], ['body', 'Invitation text'],
  ['dress_code', 'Attire'], ['signature', 'Signature'], ['design', 'Design'], ['barred', 'Guest list'],
];

const when = (d) => (d ? new Date(d).toLocaleString('en-GB', { timeZone: 'Europe/Athens', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const label = (list, id) => list.find(x => x.id === id)?.label || id || 'default';
const Icon = ({ name, size = 16, color }) => (
  <span className="material-symbols-outlined" style={{ fontSize: size, color, verticalAlign: '-3px' }} aria-hidden="true">{name}</span>
);

function changedFields(v, prev) {
  if (!prev) return [];
  return FIELDS.filter(([k]) => JSON.stringify(v[k] ?? null) !== JSON.stringify(prev[k] ?? null)).map(([, l]) => l);
}

function DesignSummary({ design, names, barred }) {
  const d = resolveDesign(design);
  const rows = [
    ['Invitation background', d.cardImage ? <a href={d.cardImage} target="_blank" rel="noreferrer">Uploaded image</a> : label(SURFACES, d.cardPreset)],
    ['Home banner', d.bannerImage ? <a href={d.bannerImage} target="_blank" rel="noreferrer">Uploaded image</a> : label(SURFACES, d.bannerPreset)],
    ['Foil', label(ACCENTS, d.accent)],
    ['Ornament', label(ORNAMENTS, d.ornament)],
    ['Title lettering', label(FONTS, d.font)],
    ['Seal', label(SEALS, d.seal)],
    ['Card language', label(LANGS, d.lang === 'el' ? 'el' : 'en')],
    ['Struck from the guest list', barred?.length ? barred.map(id => names[id] || `Character #${id}`).join(', ') : 'Nobody'],
  ];
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <td style={{ padding: '6px 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{k}</td>
            <td style={{ padding: '6px 8px', color: 'var(--text-primary)' }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminElysiumTab() {
  const [list, setList] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [versionId, setVersionId] = useState(null);
  const [viewer, setViewer] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/admin/elysium/invitations')
      .then(({ data }) => {
        setList(data.invitations || []);
        const now = Date.now();
        const next = [...(data.invitations || [])].reverse().find(i => new Date(i.date).getTime() >= now);
        setEventId((next || data.invitations?.[0])?.id ?? null);
      })
      .catch(e => setErr(formatApiError(e, 'Failed to load invitations')));
  }, []);

  useEffect(() => {
    if (!eventId) return;
    setDetail(null); setViewer('');
    api.get(`/admin/elysium/invitations/${eventId}`)
      .then(({ data }) => {
        setDetail(data);
        setVersionId(data.versions.length ? data.versions[data.versions.length - 1].id : null);
      })
      .catch(e => setErr(formatApiError(e, 'Failed to load the invitation')));
  }, [eventId]);

  const names = useMemo(() => {
    const m = {};
    for (const r of detail?.reads || []) if (r.character_id) m[r.character_id] = r.character_name;
    for (const u of detail?.unread || []) m[u.character_id] = u.character_name;
    return m;
  }, [detail]);

  const versions = detail?.versions || [];
  const vIndex = versions.findIndex(v => v.id === versionId);
  const version = versions[vIndex] || null;
  const reader = (detail?.reads || []).find(r => String(r.user_id) === viewer);
  const guest = reader ? { name: reader.character_name || reader.user_name, clan: reader.clan } : { name: 'Sample Guest', clan: 'Toreador' };
  const readerBarred = reader?.seen_as === 'barred';

  const viewAs = (userId) => {
    setViewer(userId);
    const r = (detail?.reads || []).find(x => String(x.user_id) === userId);
    if (r?.first_version_id) setVersionId(r.first_version_id);
  };

  return (
    <div className={styles.adminCard}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="local_florist" size={28} color="#d4af5f" /> Elysium Invitations
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.85rem' }}>
          Every invitation the Keeper has written, every version of it exactly as it was stored, who made each change, and who opened it.
        </p>
      </div>
      {err && <div className={`${styles.alert} ${styles.alertError}`} style={{ marginBottom: '1rem' }}>{err}</div>}
      {!list ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'start' }} className={styles.rGrid2}>
          {/* All Elysiums */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {list.map(i => (
              <button key={i.id} type="button" onClick={() => setEventId(i.id)}
                style={{
                  textAlign: 'left', padding: '0.65rem 0.8rem', borderRadius: 8, cursor: 'pointer',
                  background: i.id === eventId ? 'rgba(212,175,95,0.14)' : 'var(--glass-inset)',
                  border: `1px solid ${i.id === eventId ? '#d4af5f' : 'var(--glass-border)'}`, color: 'var(--text-primary)',
                }}>
                <div style={{ fontWeight: 700 }}>{i.name || i.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {formatEuDate(i.date)} · {i.published_at ? 'Published' : i.version_count ? 'Draft' : 'No invitation'}
                  {i.version_count ? ` · ${i.version_count} versions · ${i.reader_count} opened` : ''}
                </div>
              </button>
            ))}
            {!list.length && <p style={{ color: 'var(--text-secondary)' }}>No Elysium events yet. Mark events as Elysium in the Calendar.</p>}
          </div>

          {!detail ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{detail.invitation?.name || detail.event.title}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {detail.event.title} · {when(detail.event.date)}
                  {detail.last_reannounce ? ` · last sent again ${when(detail.last_reannounce)}` : ''}
                </div>
              </div>

              {!versions.length ? (
                <p style={{ color: 'var(--text-secondary)' }}>The Keeper has not written this invitation yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 440px)', gap: '1.25rem', alignItems: 'start' }} className={styles.rGrid2}>
                  {/* Timeline */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <h4 style={{ margin: '0 0 4px', color: 'var(--text-primary)' }}>History</h4>
                    {[...versions].reverse().map(v => {
                      const idx = versions.indexOf(v);
                      const a = ACTIONS[v.action] || { label: v.action, icon: 'history', color: '#90a4ae' };
                      const changed = changedFields(v, versions[idx - 1]);
                      return (
                        <button key={v.id} type="button" onClick={() => setVersionId(v.id)}
                          style={{
                            textAlign: 'left', padding: '0.55rem 0.75rem', borderRadius: 8, cursor: 'pointer', color: 'var(--text-primary)',
                            background: v.id === versionId ? 'rgba(255,255,255,0.06)' : 'transparent',
                            border: `1px solid ${v.id === versionId ? a.color : 'var(--glass-border)'}`,
                          }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700 }}><Icon name={a.icon} color={a.color} /> v{idx + 1} · {a.label}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{when(v.created_at)}</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            By {v.actor_name || 'unknown'}{v.actor_user && v.actor_user !== v.actor_name ? ` (${v.actor_user})` : ''}{v.actor_office ? `, as ${v.actor_office}` : ''}
                            {v.published ? ' · live for players' : ' · not visible to players'}
                          </div>
                          {changed.length > 0 && <div style={{ fontSize: '0.75rem', color: a.color, marginTop: 2 }}>Changed: {changed.join(', ')}</div>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Exact preview of the selected version */}
                  {version && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label className={styles.labeledInput}>
                        <span>View v{vIndex + 1} as</span>
                        <select className={styles.input} value={viewer} onChange={e => viewAs(e.target.value)}>
                          <option value="">A sample guest</option>
                          {(detail.reads || []).map(r => (
                            <option key={r.user_id} value={String(r.user_id)}>{r.character_name || r.user_name} (opened v{versions.findIndex(v => v.id === r.first_version_id) + 1 || '?'})</option>
                          ))}
                        </select>
                      </label>
                      <HomeBannerPreview name={version.name} date={detail.event.date} design={version.design} location={readerBarred ? '' : version.location} />
                      <InvitationCard invitation={version} eventDate={detail.event.date} guest={guest} barred={readerBarred} />
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <DownloadCardButton className={`${styles.btn} ${styles.btnSecondary}`} invitation={version} eventDate={detail.event.date} guest={guest} barred={readerBarred}
                          filename={`${version.name || detail.event.title}-v${vIndex + 1}${viewer ? `-${guest.name}` : ''}`}>
                          <Icon name="download" /> Download v{vIndex + 1}
                        </DownloadCardButton>
                        <DownloadCardButton action="discord" eventId={detail.event.id} className={`${styles.btn} ${styles.btnPrimary}`} invitation={version} eventDate={detail.event.date} guest={guest} barred={readerBarred}>
                          <Icon name="send" /> Push v{vIndex + 1} to Discord
                        </DownloadCardButton>
                      </div>
                      <DesignSummary design={version.design} names={names} barred={version.barred} />
                    </div>
                  )}
                </div>
              )}

              {/* Who saw it */}
              <div>
                <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>Opened by ({detail.reads.length})</h4>
                <div className={styles.tableContainer}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
                        {['Character', 'Account', 'First opened', 'Last opened', 'Times', 'Shown', 'First saw'].map(h => <th key={h} style={{ padding: '6px 8px' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.reads.map(r => (
                        <tr key={r.user_id} style={{ borderTop: '1px solid var(--glass-border)', color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => viewAs(String(r.user_id))}>
                          <td style={{ padding: '6px 8px' }}>{r.character_name || '-'}{r.clan ? <span style={{ color: 'var(--text-secondary)' }}> ({r.clan})</span> : null}</td>
                          <td style={{ padding: '6px 8px' }}>{r.user_name}</td>
                          <td style={{ padding: '6px 8px' }}>{when(r.read_at)}</td>
                          <td style={{ padding: '6px 8px' }}>{when(r.last_read_at)}</td>
                          <td style={{ padding: '6px 8px' }}>{r.open_count}</td>
                          <td style={{ padding: '6px 8px', color: r.seen_as === 'barred' ? '#ff8a80' : '#69f0ae' }}>{r.seen_as === 'barred' ? 'Doors closed' : 'Invitation'}</td>
                          <td style={{ padding: '6px 8px' }}>{r.first_version_id ? `v${versions.findIndex(v => v.id === r.first_version_id) + 1}` : '-'}</td>
                        </tr>
                      ))}
                      {!detail.reads.length && <tr><td colSpan={7} style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>Nobody has opened it yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {detail.invitation?.published_at && (
                <div>
                  <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>Never opened ({detail.unread.length})</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {detail.unread.map(u => u.character_name).join(', ') || 'Everyone has opened it.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
