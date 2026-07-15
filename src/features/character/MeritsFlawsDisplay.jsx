import React, { useMemo, useState } from 'react';
import styles from '../../styles/CharacterView.module.css';

export default function MeritsFlawsDisplay({ sheet, allMeritsFlat, allFlawsFlat, flawIds, editable, onUpdateDesc }) {
  const rawMerits = Array.isArray(sheet?.advantages?.merits) ? sheet.advantages.merits : [];
  const rawBackgrounds = Array.isArray(sheet?.backgrounds) ? sheet.backgrounds : [];
  const rawFlaws = Array.isArray(sheet?.advantages?.flaws) ? sheet.advantages.flaws : [];

  const meritsList = useMemo(() => {
    const list = [];
    rawMerits.forEach(m => {
      if (!flawIds.has(m.id)) list.push(m);
    });
    rawBackgrounds.forEach(b => {
      if (!flawIds.has(b.id)) list.push(b);
    });
    return list;
  }, [rawMerits, rawBackgrounds, flawIds]);

  const flawsList = useMemo(() => {
    const list = [...rawFlaws];
    rawMerits.forEach(m => {
      if (flawIds.has(m.id)) list.push(m);
    });
    rawBackgrounds.forEach(b => {
      if (flawIds.has(b.id)) list.push(b);
    });
    return list;
  }, [rawFlaws, rawMerits, rawBackgrounds, flawIds]);

  const getFullItem = (item, isFlaw) => {
    const catalog = isFlaw ? allFlawsFlat : allMeritsFlat;
    const found = catalog.find(x => x.id === item.id) || catalog.find(x => x.name === item.name);
    return {
      ...item,
      category: found?.category || (isFlaw ? 'FLAW' : 'MERIT'),
      description: item.desc || found?.description || 'No description provided.',
    };
  };

  const RenderDotList = ({ dots }) => {
    const total = 5;
    const active = Number(dots) || 0;
    return (
      <div className={styles.dotTracker} style={{ marginTop: '2px' }}>
        {Array.from({ length: Math.max(total, active) }).map((_, i) => (
          <div key={i} className={`${styles.dot} ${i < active ? styles.filled : ''}`}></div>
        ))}
      </div>
    );
  };

  const [editingId, setEditingId] = useState(null);
  const [editDescText, setEditDescText] = useState('');

  const handleStartEdit = (id, currentDesc) => {
    setEditingId(id);
    setEditDescText(currentDesc || '');
  };

  const handleSaveDesc = (item) => {
    if (onUpdateDesc) {
      onUpdateDesc(item, editDescText);
    }
    setEditingId(null);
  };

  return (
    <div id="merits-section" style={{ width: '100%', marginTop: '32px' }}>
      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', alignItems: 'start' }}>
        {/* Merits Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)', fontSize: '32px', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 600, color: 'var(--primary-container)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Merits</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {meritsList.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No merits recorded.</p>}
            {meritsList.map((m, idx) => {
              const full = getFullItem(m, false);
              return (
                <div key={idx} className={styles.glassCard} style={{ padding: '24px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden', background: 'var(--surface-color)' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--primary-container)', opacity: 0.4, transition: 'opacity 0.2s' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 500, letterSpacing: '0.1em', color: 'var(--primary-container)', textTransform: 'uppercase', opacity: 0.7, display: 'block', marginBottom: '4px' }}>{full.category}</span>
                      <h4 style={{ fontFamily: "'Inter', sans-serif", fontSize: '20px', fontWeight: 600, color: 'var(--text-color)', margin: 0 }}>{full.name}</h4>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <RenderDotList dots={m.dots} />
                      {editable && (
                        <button
                          onClick={() => handleStartEdit(`merit_${idx}`, full.description)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', opacity: 0.6, borderRadius: '4px', transition: 'all 0.2s' }}
                          title="Edit Description"
                          onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.background = 'none'; }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {editingId === `merit_${idx}` ? (
                    <div style={{ marginTop: '12px' }}>
                      <textarea
                        value={editDescText}
                        onChange={(e) => setEditDescText(e.target.value)}
                        style={{ width: '100%', minHeight: '80px', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--primary-color)', color: '#fff', borderRadius: '4px', fontSize: '14px', fontFamily: "'Inter', sans-serif" }}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => handleSaveDesc(m)} style={{ background: 'var(--primary-color)', border: 'none', color: '#000', borderRadius: '4px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)', lineHeight: '24px', margin: 0, opacity: 0.8, whiteSpace: 'pre-wrap' }}>
                        {full.description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Flaws Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: '32px' }}>heart_broken</span>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Flaws</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {flawsList.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No flaws recorded.</p>}
            {flawsList.map((f, idx) => {
              const full = getFullItem(f, true);
              return (
                <div key={idx} className={styles.glassCard} style={{ padding: '24px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden', background: 'var(--surface-color)' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--text-muted)', opacity: 0.2, transition: 'opacity 0.2s' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 500, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.7, display: 'block', marginBottom: '4px' }}>{full.category}</span>
                      <h4 style={{ fontFamily: "'Inter', sans-serif", fontSize: '20px', fontWeight: 600, color: 'var(--text-color)', margin: 0, fontStyle: 'italic' }}>{full.name}</h4>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <RenderDotList dots={f.dots} />
                      {editable && (
                        <button
                          onClick={() => handleStartEdit(`flaw_${idx}`, full.description)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', opacity: 0.6, borderRadius: '4px', transition: 'all 0.2s' }}
                          title="Edit Description"
                          onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.background = 'none'; }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {editingId === `flaw_${idx}` ? (
                    <div style={{ marginTop: '12px' }}>
                      <textarea
                        value={editDescText}
                        onChange={(e) => setEditDescText(e.target.value)}
                        style={{ width: '100%', minHeight: '80px', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--text-muted)', color: '#fff', borderRadius: '4px', fontSize: '14px', fontFamily: "'Inter', sans-serif" }}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => handleSaveDesc(f)} style={{ background: 'var(--text-muted)', border: 'none', color: '#000', borderRadius: '4px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)', lineHeight: '24px', margin: 0, opacity: 0.8, whiteSpace: 'pre-wrap' }}>
                        {full.description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
