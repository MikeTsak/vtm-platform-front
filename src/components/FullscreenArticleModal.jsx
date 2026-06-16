import React from 'react';
import { NEWS_OUTLETS } from '../constants/newsConstants';
import { apiJoin, isVideoUrl } from '../utils/newsUtils';
import styles from '../styles/News.module.css';

export default function FullscreenArticleModal({ item, onClose }) {
  const isRumor = item.theme === 'RUMOR';
  const theme = NEWS_OUTLETS[item.theme] || NEWS_OUTLETS['ERT'];
  const mediaUrl = apiJoin(item.media_url);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`${styles.fullscreenModal} ${isRumor ? styles.fullscreenModalRumor : ''}`} style={{ '--theme-color': theme.color }}>
        <div className={styles.modalHeaderControl}>
          <button onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContentPadding}>
          {isRumor ? (
            <div>
              <span className={styles.rumorBadge}>🤫 WHISPER / RUMOR</span>
              <h1 className={styles.fsTitle}>{item.title}</h1>

              {item.media_url && (
                <div className={styles.fsMediaContainer}>
                  {isVideoUrl(item.media_url) ? <video src={mediaUrl} controls /> : <img src={mediaUrl} alt="Proof" />}
                </div>
              )}

              <div className={styles.fsBody} dangerouslySetInnerHTML={{ __html: item.body }} />
              <div className={styles.fsRumorFooter}>— Heard on {new Date(item.created_at).toLocaleDateString()}</div>
            </div>
          ) : (
            <div>
              <div className={styles.fsOutletHeader}>
                <img src={theme.logo} alt={theme.name} />
                <span style={{ backgroundColor: theme.color }}>LIVE</span>
              </div>

              <h1 className={styles.fsTitle}>{item.title}</h1>
              {item.subtitle && <h3 className={styles.fsSubtitle} style={{ color: theme.color }}>{item.subtitle}</h3>}

              <div className={styles.fsMeta}>
                <span style={{ color: theme.color, fontWeight: 'bold' }}>By {item.journalist_name || 'Staff Writer'}</span>
                <span>•</span>
                <span>Published on {new Date(item.created_at).toLocaleDateString()}</span>
              </div>

              {item.media_url && (
                <div className={styles.fsMediaContainer} style={{ boxShadow: `0 10px 30px ${theme.color}15` }}>
                  {isVideoUrl(item.media_url) ? <video src={mediaUrl} controls /> : <img src={mediaUrl} alt="News Media" />}
                </div>
              )}

              <div className={styles.fsBody} dangerouslySetInnerHTML={{ __html: item.body }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}