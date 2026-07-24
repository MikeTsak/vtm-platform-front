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
      <div className={styles.dotTracker}>
        {Array.from({ length: Math.max(total, active) }).map((_, i) => (
          <div key={i} className={`${styles.trackerDot} ${i < active ? styles.filled : ''}`}></div>
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
    <div id="merits-section" className={styles.meritsContainer}>
      {/* Content Grid */}
      <div className={styles.meritsGrid}>
        {/* Merits Column */}
        <div className={styles.meritsColumn}>
          <div className={styles.meritsSectionHead}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)', fontSize: '28px', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            <h3 className={styles.meritsSectionTitle} style={{ color: 'var(--primary-container)' }}>Merits</h3>
          </div>
          <div className={styles.meritsListGroup}>
            {meritsList.length === 0 && <p className={styles.dim}>No merits recorded.</p>}
            {meritsList.map((m, idx) => {
              const full = getFullItem(m, false);
              return (
                <div key={idx} className={`${styles.glassCard} ${styles.meritCard}`}>
                  <div className={styles.meritAccentBar} style={{ background: 'var(--primary-container)' }} />
                  <div className={styles.meritHeader}>
                    <div className={styles.meritTitleBlock}>
                      <span className={styles.meritCategory} style={{ color: 'var(--primary-container)' }}>{full.category}</span>
                      <h4 className={styles.meritTitle}>{full.name}</h4>
                    </div>
                    <div className={styles.meritDotsBlock}>
                      <RenderDotList dots={m.dots} />
                      {editable && (
                        <button
                          onClick={() => handleStartEdit(`merit_${idx}`, full.description)}
                          className={styles.meritEditBtn}
                          title="Edit Description"
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
                      <p className={styles.meritDesc}>
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
        <div className={styles.meritsColumn}>
          <div className={styles.meritsSectionHead}>
            <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: '28px' }}>heart_broken</span>
            <h3 className={styles.meritsSectionTitle} style={{ color: 'var(--text-muted)' }}>Flaws</h3>
          </div>
          <div className={styles.meritsListGroup}>
            {flawsList.length === 0 && <p className={styles.dim}>No flaws recorded.</p>}
            {flawsList.map((f, idx) => {
              const full = getFullItem(f, true);
              return (
                <div key={idx} className={`${styles.glassCard} ${styles.meritCard}`}>
                  <div className={styles.meritAccentBar} style={{ background: 'var(--text-muted)', opacity: 0.2 }} />
                  <div className={styles.meritHeader}>
                    <div className={styles.meritTitleBlock}>
                      <span className={styles.meritCategory} style={{ color: 'var(--text-muted)' }}>{full.category}</span>
                      <h4 className={styles.meritTitle} style={{ fontStyle: 'italic' }}>{full.name}</h4>
                    </div>
                    <div className={styles.meritDotsBlock}>
                      <RenderDotList dots={f.dots} />
                      {editable && (
                        <button
                          onClick={() => handleStartEdit(`flaw_${idx}`, full.description)}
                          className={styles.meritEditBtn}
                          title="Edit Description"
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
                      <p className={styles.meritDesc}>
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
