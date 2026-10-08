// Admin directory of every retainer: personal mortals, ghouls, and those
// owned by a coterie. One card per retainer so it reads on a phone; filters
// narrow it to one kind. "Manage" opens the Retainers page as the owner (or,
// for a coterie retainer, its domitor or a member) with admin bypass.
import FaGlyph from '../../ui/FaGlyph';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../styles/Admin.module.css';
import Avatar from '../../components/Avatar';

const LEVEL_COLORS = { 1: '#b8860b', 2: '#9d7cff', 3: '#c21807' };

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'ghoul', label: 'Ghouls' },
  { key: 'mortal', label: 'Mortal retainers' },
  { key: 'coterie', label: 'Coterie-owned' },
  { key: 'personal', label: 'Personal' },
];

const isGhoul = (r) => r.sheet?.isGhoul === true;

// "Dominate (Compel)", plus whose blood gave it on a coterie ghoul.
function disciplineLines(r) {
  const sheet = r.sheet || {};
  return Object.entries(sheet.disciplines || {})
    .filter(([, lvl]) => Number(lvl) > 0)
    .map(([disc]) => {
      const power = (sheet.powers || []).find((p) => p && p.discipline === disc);
      const from = r.blood_from?.[disc];
      return { disc, power: power?.name || null, from };
    });
}

const chip = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  borderRadius: '999px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700,
  background: `${color}22`, border: `1px solid ${color}`, color,
});

export default function AdminGhoulsTab({ retainers }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const list = retainers || [];
  const counts = useMemo(() => ({
    all: list.length,
    ghoul: list.filter(isGhoul).length,
    mortal: list.filter((r) => !isGhoul(r)).length,
    coterie: list.filter((r) => r.coterie_id).length,
    personal: list.filter((r) => !r.coterie_id).length,
  }), [list]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return list
      .filter((r) => filter === 'all'
        || (filter === 'ghoul' && isGhoul(r))
        || (filter === 'mortal' && !isGhoul(r))
        || (filter === 'coterie' && r.coterie_id)
        || (filter === 'personal' && !r.coterie_id))
      .filter((r) => !term || [r.name, r.owner_name, r.owner_player, r.coterie_name, r.domitor_name, r.domitor_player]
        .some((v) => (v || '').toLowerCase().includes(term)));
  }, [list, filter, q]);

  const manage = (r) => navigate('/retainers', {
    state: {
      character: { id: r.manage_id, name: r.manage_name, clan: r.manage_clan, xp: r.manage_xp },
      preselectRetainerId: r.id,
      isAdminBypass: true,
    },
  });

  const exportPdf = async (r) => {
    const { default: generateGhoulPDF } = await import('../../utils/ghoulPdfGenerator');
    generateGhoulPDF({ ...r, retainer_name: r.name }, {
      domitorName: r.domitor_name || r.owner_name,
      domitorClan: r.domitor_clan || r.owner_clan,
      playerName: r.domitor_player || r.owner_player,
    });
  };

  return (
    <div className={styles.adminCard}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>
          <FaGlyph name="fa-droplet" size={24} style={{ marginRight: '0.5rem', verticalAlign: '-0.15em' }} />Retainers &amp; Ghouls
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.85rem' }}>
          {counts.ghoul} ghoul{counts.ghoul !== 1 ? 's' : ''} · {counts.mortal} mortal retainer{counts.mortal !== 1 ? 's' : ''} · {counts.coterie} owned by a coterie
        </p>
      </div>

      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '0.75rem' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            style={{
              flex: '0 0 auto', minHeight: '40px', padding: '6px 14px', borderRadius: '999px', cursor: 'pointer',
              border: `1px solid ${filter === f.key ? 'var(--accent-purple)' : 'var(--glass-border)'}`,
              background: filter === f.key ? 'rgba(157, 124, 255, 0.15)' : 'transparent',
              color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem',
            }}
          >
            {f.label} <span style={{ opacity: 0.6 }}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, owner, player or coterie…"
        style={{
          width: '100%', minHeight: '44px', padding: '0.55rem 0.8rem', marginBottom: '1rem', fontSize: '16px',
          borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)',
          background: 'rgba(0,0,0,0.25)', color: 'var(--text-primary)', boxSizing: 'border-box',
        }}
      />

      {shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          {list.length === 0 ? 'No retainers have been created yet.' : 'Nothing matches this filter.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 20rem), 1fr))' }}>
          {shown.map((r) => {
            const ghoul = isGhoul(r);
            const discs = disciplineLines(r);
            const tierColor = LEVEL_COLORS[r.tier] || '#888';
            return (
              <article
                key={r.id}
                style={{
                  display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.9rem',
                  borderRadius: 'var(--radius-md, 12px)', border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.02)', minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', minWidth: 0 }}>
                  <Avatar retainerId={r.id} size={44} editable />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.name}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      <span style={chip(tierColor)}>Tier {r.tier} {'●'.repeat(r.tier || 1)}</span>
                      <span style={chip(ghoul ? '#c21807' : '#6b8aa8')}>{ghoul ? 'Ghoul' : 'Mortal'}</span>
                      <span style={chip(r.coterie_id ? '#9d7cff' : '#4a9d6b')}>{r.coterie_id ? 'Coterie' : 'Personal'}</span>
                    </div>
                  </div>
                </div>

                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px', fontSize: '0.85rem' }}>
                  {r.coterie_id ? (
                    <>
                      <dt style={{ color: 'var(--text-muted)' }}>Coterie</dt>
                      <dd style={{ margin: 0, color: 'var(--text-primary)' }}>{r.coterie_name}</dd>
                    </>
                  ) : (
                    <>
                      <dt style={{ color: 'var(--text-muted)' }}>Owner</dt>
                      <dd style={{ margin: 0, color: 'var(--text-primary)' }}>
                        {r.owner_name}{r.owner_clan ? ` · ${r.owner_clan}` : ''}
                      </dd>
                    </>
                  )}
                  {ghoul && (
                    <>
                      <dt style={{ color: 'var(--text-muted)' }}>Domitor</dt>
                      <dd style={{ margin: 0, color: 'var(--text-primary)' }}>
                        {r.coterie_id
                          ? `${r.domitor_name || 'none'}${r.domitor_clan ? ` · ${r.domitor_clan}` : ''}`
                          : `${r.owner_name}${r.owner_clan ? ` · ${r.owner_clan}` : ''}`}
                      </dd>
                    </>
                  )}
                  <dt style={{ color: 'var(--text-muted)' }}>Player</dt>
                  <dd style={{ margin: 0, color: 'var(--text-secondary)' }}>
                    {r.coterie_id ? (r.domitor_player || 'shared by the coterie') : (r.owner_player || 'Unknown')}
                  </dd>
                </dl>

                {ghoul && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {discs.length === 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No Discipline chosen</span>
                    ) : discs.map((d) => (
                      <span
                        key={d.disc}
                        title={d.from ? `${d.from}'s blood` : 'Domitor\'s blood'}
                        style={{
                          background: 'rgba(157, 124, 255, 0.1)', border: '1px solid rgba(157, 124, 255, 0.3)',
                          color: 'var(--accent-purple)', borderRadius: 'var(--radius-sm)', padding: '3px 8px',
                          fontSize: '0.8rem', fontWeight: 600,
                        }}
                      >
                        {d.disc}{d.power ? `: ${d.power}` : ''}{d.from ? ` (${d.from}'s blood)` : ''}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => exportPdf(r)}
                    style={{
                      flex: 1, minHeight: '40px', background: '#8a0303', color: '#fff', border: 'none',
                      borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                    }}
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    disabled={!r.manage_id}
                    title={r.manage_id ? undefined : 'No member character to open this as'}
                    onClick={() => manage(r)}
                    style={{
                      flex: 1, minHeight: '40px', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
                      cursor: r.manage_id ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '0.85rem',
                      background: 'linear-gradient(135deg, var(--accent-purple-dark, #6b3fa0) 0%, var(--accent-purple) 100%)',
                      opacity: r.manage_id ? 1 : 0.5,
                    }}
                  >
                    Manage
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
