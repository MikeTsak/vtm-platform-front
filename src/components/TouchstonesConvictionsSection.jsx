import React from 'react';
import styles from '../styles/Touchstones.module.css';

const parseText = (text) => {
  if (!text) return { title: 'Unknown', desc: '' };
  // split by first colon or dash
  const splitIdx = text.search(/[:\-]/);
  if (splitIdx !== -1) {
    return {
      title: text.substring(0, splitIdx).trim(),
      desc: text.substring(splitIdx + 1).trim()
    };
  }
  return { title: text, desc: '' };
};

const TouchstonesConvictionsSection = ({ sheet, setMoralityModalOpen }) => {
  const convictions = sheet?.convictions || [];
  const touchstones = sheet?.touchstones || [];

  return (
    <div style={{ marginTop: '24px', marginBottom: '24px' }}>
      {/* Section Header */}
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.headerTitle}>Morality & Anchors</h2>
          <p className={styles.headerSubtitle}>The threads that bind the beast</p>
        </div>
        <button
          aria-label="Edit Convictions and Touchstones"
          className={styles.editBtn}
          onClick={() => setMoralityModalOpen(true)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
          <span className="hidden sm:inline">EDIT</span>
        </button>
      </div>

      {/* Two Column Layout */}
      <div className={styles.gridContainer}>
        
        {/* Convictions Column */}
        <section className={styles.columnBox}>
          <div className={styles.columnHeader}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>balance</span>
            <h3>Convictions</h3>
          </div>
          <div className={styles.columnBody}>
            {convictions.length > 0 ? (
              <ul className={styles.convictionsList}>
                {convictions.map((c, i) => {
                  const { title, desc } = parseText(c);
                  return (
                    <li key={i} className={styles.convictionItem}>
                      <div className={styles.convictionIconBox}>
                        <span className={styles.convictionIcon}>/</span>
                      </div>
                      <div>
                        <h4 className={styles.convictionTitle}>{title}</h4>
                        {desc && <p className={styles.convictionDesc}>{desc}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.emptyState}>No convictions defined.</p>
            )}
          </div>
        </section>

        {/* Touchstones Column */}
        <section className={styles.columnBox}>
          <div className={styles.columnHeader}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>favorite</span>
            <h3>Touchstones</h3>
          </div>
          <div className={styles.columnBody}>
            {touchstones.length > 0 ? (
              <div className={styles.touchstonesList}>
                {touchstones.map((t, i) => {
                  const { title, desc } = parseText(t);
                  return (
                    <div key={i} className={styles.touchstoneCard}>
                      <div className={styles.touchstoneImgBox}>
                        {/* Default silhouette icon since no images in DB */}
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                      </div>
                      <div className={styles.touchstoneContent}>
                        <div className={styles.touchstoneHeader}>
                          <h4 className={styles.touchstoneTitle}>{title}</h4>
                          <span className={styles.badgeHealthy}>HEALTHY</span>
                        </div>
                        {/* No Anchor mapping in DB yet, so we omit or put generic text */}
                        <p className={styles.touchstoneAnchor}>ANCHOR</p>
                        {desc && <p className={styles.touchstoneDesc}>{desc}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={styles.emptyState}>No touchstones defined.</p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default TouchstonesConvictionsSection;