import React, { useMemo } from 'react';
import styles from '../styles/CharacterView.module.css';

export default function MeritsFlawsDisplay({ sheet, allMeritsFlat, allFlawsFlat, flawIds }) {
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

  return (
    <div id="merits-section" style={{ width: '100%', marginTop: '32px' }}>
      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start' }}>
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
                    <RenderDotList dots={m.dots} />
                  </div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)', lineHeight: '24px', margin: 0, opacity: 0.8 }}>
                    {full.description}
                  </p>
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
                    <RenderDotList dots={f.dots} />
                  </div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)', lineHeight: '24px', margin: 0, opacity: 0.8 }}>
                    {full.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Atmospheric Image Inset */}
      <div style={{ marginTop: '96px', height: '256px', width: '100%', position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }} className={styles.glassCard}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-color), transparent, transparent)', zIndex: 10 }}></div>
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfTvrFH4Cf-t-vuDD2i6NbFTmhiJG4Ii5Riux8TnySvTDUa1gYA5CTmXRuAKIK1hmQUvDGdireSWYlKe0v9vXG4hazs_nI0tn9wbs8b_lrDCQt9vS58wiXU96OFUot7wTbHBWRJkqd6CGMcsS6uvFXlzyRDjZe3rTK_kp1p2H-wJc_WOv7-MZKqMefg-LC5Zt3cxpafRJIuFcyIB1aVbpN1gTNAccHwAI11N8UO91XoITke9FSJ0Wc930fKDwXFHTennjiWYr4RaA"
          alt="Atmosphere"
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) brightness(0.5)', transition: 'all 0.7s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = 'grayscale(0%) brightness(1)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'grayscale(100%) brightness(0.5)'; e.currentTarget.style.transform = 'scale(1)'; }}
        />
        <div style={{ position: 'absolute', bottom: '32px', left: '32px', zIndex: 20 }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 500, color: 'var(--primary-container)', textTransform: 'uppercase', letterSpacing: '0.3em', margin: '0 0 8px 0' }}>The Eternal Night</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)', opacity: 0.6, fontStyle: 'italic', margin: 0 }}>"The scars we bear are the maps of our survival."</p>
        </div>
      </div>
    </div>
  );
}
