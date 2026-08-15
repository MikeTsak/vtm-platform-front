import React, { useEffect, useState } from 'react';
import styles from '../../../styles/CharacterSetup.module.css';
import api from '../../../core/api';
import { CLAN_COLORS, CLAN_BLURBS, CLAN_DISCIPLINES, symlogo, textlogo } from '../../../data/clans';
import { iconPath } from '../../../data/disciplines';
import { RandomizeButton } from './StepHelpers';

export default function ClanPicker({ clan, setClan, setStep }) {
  const [disabledClans, setDisabledClans] = useState([]);

  useEffect(() => {
    api.get('/clans/config')
      .then(r => setDisabledClans(r.data?.disabledClans || []))
      .catch(() => setDisabledClans([]));
  }, []);

  const clanNames = Object.keys(CLAN_DISCIPLINES);

  const randomizeClan = () => {
    const pool = clanNames.filter(c => !disabledClans.includes(c));
    if (!pool.length) return;
    setClan(pool[Math.floor(Math.random() * pool.length)]);
  };

  return (
    <section>
      <div className={styles.stepHeader}>
        <div>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 4, borderBottom: 'none', paddingBottom: 0 }}>Choose Your Clan</h3>
          <p className={`${styles.muted} ${styles.smallFlavor}`} style={{ textAlign: 'left', marginBottom: 0 }}>
            Blood remembers. Choose the lineage that will shape your curse.
          </p>
        </div>
        <div className={styles.stepHeaderActions}>
          <RandomizeButton onClick={randomizeClan} />
        </div>
      </div>
      <div className={styles.clanGrid} style={{ marginTop: 12 }}>
        {clanNames.map(c => {
          const active = clan === c;
          const locked = disabledClans.includes(c);
          return (
            <button
              key={c}
              type="button"
              className={`${styles.clanCard} ${active ? styles.active : ''} ${locked ? styles.clanCardLocked : ''}`}
              style={{ background: `linear-gradient(180deg, ${CLAN_COLORS[c][0]}, ${CLAN_COLORS[c][1]})` }}
              onClick={() => { if (!locked) setClan(c); }}
              disabled={locked}
              title={locked ? `${c} is not currently available` : CLAN_BLURBS[c]}
            >
              {locked && <span className={styles.lockBadge}>Unavailable</span>}
              <div className={styles.clanLogoWrap}>
                <img src={symlogo(c)} alt={`${c} symbol`} className={styles.clanLogo} />
              </div>
              <div className={styles.clanMeta}>
                <div className={styles.clanName}>{c}</div>
                <div className={styles.clanBlurb}>{CLAN_BLURBS[c]}</div>
                <div className={styles.clanDiscs} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  {(CLAN_DISCIPLINES[c]||[]).map((d, i) => (
                    <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {d !== 'Choose Any' && (
                        <img src={iconPath(d)} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                      )}
                      {d}{i < (CLAN_DISCIPLINES[c]||[]).length - 1 ? ' •' : ''}
                    </span>
                  ))}
                </div>
                {active && (
                  <div className={styles.clanTextLogo}>
                    <img src={textlogo(c)} alt={`${c} text logo`} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className={styles.navRow}>
        <span />
        <button className={styles.cta} type="button" disabled={!clan} onClick={()=>setStep(2)}>Next</button>
      </div>
    </section>
  );
}
