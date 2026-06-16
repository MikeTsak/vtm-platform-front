import React from 'react';
import styles from '../styles/CharacterView.module.css';

const TouchstonesConvictionsSection = ({ sheet, setProfileModalOpen }) => {
  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHead} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b>Touchstones & Convictions</b>
          <button
            className={styles.ghostBtn}
            onClick={() => setProfileModalOpen(true)}
            style={{ fontSize: '0.8rem', padding: '2px 8px' }}
          >
            ✎ Edit
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '12px' }}>

          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', marginBottom: '8px' }}>Touchstones</div>
            {sheet.touchstones && sheet.touchstones.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.95rem', opacity: 0.9 }}>
                {sheet.touchstones.map((t, i) => <li key={i} style={{ marginBottom: '4px' }}>{t}</li>)}
              </ul>
            ) : <div className={styles.muted} style={{ fontSize: '0.9rem' }}>No touchstones defined.</div>}
          </div>

          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', marginBottom: '8px' }}>Convictions</div>
            {sheet.convictions && sheet.convictions.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.95rem', opacity: 0.9 }}>
                {sheet.convictions.map((c, i) => <li key={i} style={{ marginBottom: '4px' }}>{c}</li>)}
              </ul>
            ) : <div className={styles.muted} style={{ fontSize: '0.9rem' }}>No convictions defined.</div>}
          </div>

        </div>
      </div>
    </>
  );
};

export default TouchstonesConvictionsSection;