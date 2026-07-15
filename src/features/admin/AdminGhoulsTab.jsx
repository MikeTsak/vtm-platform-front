import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../styles/Admin.module.css';
import Avatar from '../../components/Avatar';

// Parse ghoul sheet to extract discipline summary (name, level, first power)
function parseDisciplineSummary(sheet) {
  try {
    const parsed = typeof sheet === 'string' ? JSON.parse(sheet) : (sheet || {});
    const disciplines = parsed.disciplines || {};
    const powers = parsed.disciplinePowers || {};

    const entries = Object.entries(disciplines).filter(([, lvl]) => Number(lvl) > 0);
    if (!entries.length) return null;

    return entries.map(([disc, lvl]) => {
      const discPowers = powers[disc] || [];
      const firstPower = discPowers[0];
      const powerLabel = firstPower
        ? ` — ${firstPower.name || firstPower.id || '?'}`
        : '';
      return `${disc} Lv${lvl}${powerLabel}`;
    }).join(', ');
  } catch {
    return null;
  }
}

const LEVEL_COLORS = { 1: '#b8860b', 2: '#9d7cff', 3: '#c21807' };

export default function AdminGhoulsTab({ ghouls }) {
  const navigate = useNavigate();

  if (!ghouls || ghouls.length === 0) {
    return (
      <div className={styles.adminCard} style={{ textAlign: 'center', padding: '4rem 2rem', opacity: 0.7 }}>
        <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🩸</span>
        <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>No Ghouls Found</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>No Kindred have created ghouls yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.adminCard}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>
            🩸 Ghouls Directory
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.85rem' }}>
            {ghouls.length} ghoul{ghouls.length !== 1 ? 's' : ''} bound by the Blood Oath
          </p>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table} style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ghoul</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tier</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Domitor</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Player</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Discipline</th>
              <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ghouls.map((g, i) => {
              const disciplineSummary = parseDisciplineSummary(g.sheet);
              return (
                <tr
                  key={g.id}
                  style={{
                    borderBottom: '1px solid var(--glass-border)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
                >
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Avatar retainerId={g.id} size={32} />
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{g.retainer_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      background: `${LEVEL_COLORS[g.tier] || '#555'}22`,
                      border: `1px solid ${LEVEL_COLORS[g.tier] || '#555'}`,
                      color: LEVEL_COLORS[g.tier] || '#ccc',
                      borderRadius: '20px', padding: '2px 10px',
                      fontSize: '0.8rem', fontWeight: 700,
                    }}>
                      {'●'.repeat(g.tier || 1)}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Avatar userId={g.user_id} size={32} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{g.domitor_name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{g.domitor_clan}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{g.player_name || 'Unknown'}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {disciplineSummary ? (
                      <span style={{
                        background: 'rgba(157, 124, 255, 0.1)',
                        border: '1px solid rgba(157, 124, 255, 0.3)',
                        color: 'var(--accent-purple)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '3px 10px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                      }}>
                        {disciplineSummary}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button
                      type="button"
                      className={styles.btnSmall}
                      style={{
                        background: 'linear-gradient(135deg, var(--accent-purple-dark, #6b3fa0) 0%, var(--accent-purple) 100%)',
                        color: '#fff', padding: '6px 14px', border: 'none',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        fontWeight: 700, fontSize: '0.82rem',
                        boxShadow: '0 2px 8px var(--accent-purple-glow)',
                        transition: 'opacity 0.15s',
                      }}
                      onClick={() => navigate('/retainers', {
                        state: {
                          character: {
                            id: g.domitor_id,
                            name: g.domitor_name,
                            clan: g.domitor_clan,
                            xp: g.domitor_xp,
                          },
                          preselectRetainerId: g.id,
                          isAdminBypass: true,
                        },
                      })}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
