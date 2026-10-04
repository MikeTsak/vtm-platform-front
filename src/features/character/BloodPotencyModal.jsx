import React from 'react';
import { createPortal } from 'react-dom';
import { getBloodPotencyStats } from '../../utils/liveSessionMechanics';
import { clanRef } from '../../data/clanReference';
import { BLOOD_POTENCY_MILESTONES } from '../../utils/pdfGenerator';

function sanitizeUiText(text) {
  if (!text) return '';
  // Typography rule: NEVER USE hyphens ("-") or em-dashes ("—") in UI text
  return String(text)
    .replace(/[—–]/g, ', ')
    .replace(/−/g, 'minus ')
    .replace(/-/g, ' ');
}

export default function BloodPotencyModal({ isOpen, onClose, bloodPotency = 1, clan = '' }) {
  if (!isOpen) return null;

  const currentBp = Math.max(0, Math.min(10, Number(bloodPotency || 0)));
  const stats = getBloodPotencyStats(currentBp);
  const clanData = clanRef(clan);

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Blood Potency and Clan Details"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 4, 8, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          backgroundColor: '#0d0f14',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '26px', color: '#e11d48' }}
            >
              water_drop
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc' }}>
                Blood Potency {currentBp}
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                {clan ? `${clan} Kindred` : 'Vampiric Generation & Blood Power'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Rating Pips */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>
              Current Rating
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: i < currentBp ? '#e11d48' : 'rgba(255, 255, 255, 0.1)',
                    boxShadow: i < currentBp ? '0 0 8px rgba(225, 29, 72, 0.6)' : 'none',
                    display: 'inline-block',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Active Mechanics Grid */}
          <div>
            <h3
              style={{
                margin: '0 0 10px 0',
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#94a3b8',
              }}
            >
              Current Blood Potency Traits
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Blood Surge
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#38bdf8' }}>
                  +{stats.surgeBonus} dice
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Added to pool per surge
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Damage Mended
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#4ade80' }}>
                  {stats.mendAmount} superficial
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Per Rouse Check
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Discipline Power Bonus
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f59e0b' }}>
                  {stats.disciplineBonus > 0 ? `+${stats.disciplineBonus} dice` : 'None'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Bonus dice to power pools
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Rouse Re:roll
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#a855f7' }}>
                  {stats.rouseRerollLevel > 0 ? `Level ${stats.rouseRerollLevel} or lower` : 'None'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Free reroll on Rouse Checks
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Bane Severity
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fb7185' }}>
                  {stats.baneSeverity}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Affects Clan Bane penalties
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Feeding Restriction
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f87171' }}>
                  {sanitizeUiText(stats.feedingPenalty)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Dietary requirement
                </div>
              </div>
            </div>
          </div>

          {/* Clan Bane & Clan Compulsion */}
          {clanData && (
            <div
              style={{
                padding: '16px',
                background: 'rgba(225, 29, 72, 0.05)',
                border: '1px solid rgba(225, 29, 72, 0.2)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#f43f5e' }}>
                  warning
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {clan} Bane &amp; Compulsion (Severity {stats.baneSeverity})
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                <strong style={{ color: '#fda4af' }}>Clan Bane: </strong>
                {sanitizeUiText(clanData.bane)}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                <strong style={{ color: '#fda4af' }}>Clan Compulsion: </strong>
                {sanitizeUiText(clanData.compulsion)}
              </div>
            </div>
          )}

          {/* Full Milestones Table */}
          <div>
            <h3
              style={{
                margin: '0 0 10px 0',
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#94a3b8',
              }}
            >
              Blood Potency Milestone Reference
            </h3>
            <div
              style={{
                overflowX: 'auto',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.78rem',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '8px 12px' }}>BP</th>
                    <th style={{ padding: '8px 12px' }}>Surge</th>
                    <th style={{ padding: '8px 12px' }}>Mend</th>
                    <th style={{ padding: '8px 12px' }}>Power Bonus</th>
                    <th style={{ padding: '8px 12px' }}>Rouse Re:roll</th>
                    <th style={{ padding: '8px 12px' }}>Bane Sev</th>
                    <th style={{ padding: '8px 12px' }}>Feeding Restriction</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(BLOOD_POTENCY_MILESTONES).map(([lvlStr, row]) => {
                    const lvl = Number(lvlStr);
                    const isSelected = lvl === currentBp;
                    return (
                      <tr
                        key={lvl}
                        style={{
                          background: isSelected ? 'rgba(225, 29, 72, 0.15)' : 'transparent',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          color: isSelected ? '#f8fafc' : '#cbd5e1',
                          fontWeight: isSelected ? 600 : 400,
                        }}
                      >
                        <td style={{ padding: '8px 12px', color: isSelected ? '#fb7185' : 'inherit' }}>
                          {lvl}
                        </td>
                        <td style={{ padding: '8px 12px' }}>{row.surge}</td>
                        <td style={{ padding: '8px 12px' }}>{row.mend}</td>
                        <td style={{ padding: '8px 12px' }}>{row.bonus}</td>
                        <td style={{ padding: '8px 12px' }}>{row.rouse}</td>
                        <td style={{ padding: '8px 12px' }}>{row.bane}</td>
                        <td style={{ padding: '8px 12px' }}>{sanitizeUiText(row.feeding)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
