// src/features/live-session/WikiReferenceBar.jsx
import React from 'react';
import styles from '../../styles/LiveSession.module.css';

const WIKI_DISCIPLINES = [
  { name: 'Animalism', url: 'https://vtm.paradoxwikis.com/Animalism', icon: '/img/disciplines/Animalism-rombo.png' },
  { name: 'Auspex', url: 'https://vtm.paradoxwikis.com/Auspex', icon: '/img/disciplines/Auspex-rombo.png' },
  { name: 'Blood Sorcery', url: 'https://vtm.paradoxwikis.com/Blood_Sorcery', icon: '/img/disciplines/Blood-Sorcery-rombo.png' },
  { name: 'Celerity', url: 'https://vtm.paradoxwikis.com/Celerity', icon: '/img/disciplines/Celerity-rombo.png' },
  { name: 'Dominate', url: 'https://vtm.paradoxwikis.com/Dominate', icon: '/img/disciplines/Dominate-rombo.png' },
  { name: 'Fortitude', url: 'https://vtm.paradoxwikis.com/Fortitude', icon: '/img/disciplines/Fortitude-rombo.png' },
  { name: 'Obfuscate', url: 'https://vtm.paradoxwikis.com/Obfuscate', icon: '/img/disciplines/Obfuscate-rombo.png' },
  { name: 'Oblivion', url: 'https://vtm.paradoxwikis.com/Oblivion', icon: '/img/disciplines/Oblivion-rombo.png' },
  { name: 'Potence', url: 'https://vtm.paradoxwikis.com/Potence', icon: '/img/disciplines/Potence-rombo.png' },
  { name: 'Presence', url: 'https://vtm.paradoxwikis.com/Presence', icon: '/img/disciplines/Presence-rombo.png' },
  { name: 'Protean', url: 'https://vtm.paradoxwikis.com/Protean', icon: '/img/disciplines/Protean-rombo.png' },
  { name: 'Thin blood Alchemy', url: 'https://vtm.paradoxwikis.com/Thin-blood_Alchemy', icon: '/img/disciplines/Thin-blood-Alchemy-rombo.png' },
];

const WIKI_CLANS = [
  { name: 'Banu Haqim', url: 'https://vtm.paradoxwikis.com/Banu_Haqim', icon: '/img/clans/white/330px-Banu_Haqim_symbol_white.webp' },
  { name: 'Brujah', url: 'https://vtm.paradoxwikis.com/Brujah', icon: '/img/clans/white/330px-Brujah_symbol_white.webp' },
  { name: 'Gangrel', url: 'https://vtm.paradoxwikis.com/Gangrel', icon: '/img/clans/white/330px-Gangrel_symbol_white.webp' },
  { name: 'Hecata', url: 'https://vtm.paradoxwikis.com/Hecata', icon: '/img/clans/white/330px-Hecata_symbol_white.webp' },
  { name: 'Lasombra', url: 'https://vtm.paradoxwikis.com/Lasombra', icon: '/img/clans/white/330px-Lasombra_symbol_white.webp' },
  { name: 'Malkavian', url: 'https://vtm.paradoxwikis.com/Malkavian', icon: '/img/clans/white/330px-Malkavian_symbol_white.webp' },
  { name: 'The Ministry', url: 'https://vtm.paradoxwikis.com/The_Ministry', icon: '/img/clans/white/330px-Ministry_symbol_white.webp' },
  { name: 'Nosferatu', url: 'https://vtm.paradoxwikis.com/Nosferatu', icon: '/img/clans/white/330px-Nosferatu_symbol_white.webp' },
  { name: 'Ravnos', url: 'https://vtm.paradoxwikis.com/Ravnos', icon: '/img/clans/white/330px-Ravnos_symbol_white.webp' },
  { name: 'Salubri', url: 'https://vtm.paradoxwikis.com/Salubri', icon: '/img/clans/white/330px-Salubri_symbol_white.webp' },
  { name: 'Toreador', url: 'https://vtm.paradoxwikis.com/Toreador', icon: '/img/clans/white/330px-Toreador_symbol_white.webp' },
  { name: 'Tremere', url: 'https://vtm.paradoxwikis.com/Tremere', icon: '/img/clans/white/330px-Tremere_symbol_white.webp' },
  { name: 'Tzimisce', url: 'https://vtm.paradoxwikis.com/Tzimisce', icon: '/img/clans/white/330px-Tzimisce_symbol_white.webp' },
  { name: 'Ventrue', url: 'https://vtm.paradoxwikis.com/Ventrue', icon: '/img/clans/white/330px-Ventrue_symbol_white.webp' },
  { name: 'Caitiff', url: 'https://vtm.paradoxwikis.com/Caitiff', icon: '/img/clans/white/330px-Caitiff_symbol_white.webp' },
  { name: 'Thin blood', url: 'https://vtm.paradoxwikis.com/Thin-blood', icon: '/img/clans/white/330px-Thinblood_symbol_white.webp' },
];

export default function WikiReferenceBar() {
  return (
    <footer className={styles.wikiReferenceBar} aria-label="Wiki Quick Reference">
      <div className={styles.wikiReferenceSection}>
        <span className={styles.wikiReferenceLabel}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--primary)' }}>auto_stories</span>
          Disciplines :
        </span>
        {WIKI_DISCIPLINES.map((item) => (
          <a
            key={item.name}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.wikiItemLink}
            title={`${item.name} Wiki`}
            aria-label={`${item.name} Wiki`}
          >
            <img src={item.icon} alt={item.name} className={styles.wikiItemIcon} loading="lazy" />
          </a>
        ))}
      </div>

      <div className={styles.wikiReferenceDivider} />

      <div className={styles.wikiReferenceSection}>
        <span className={styles.wikiReferenceLabel}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--primary)' }}>shield</span>
          Clans :
        </span>
        {WIKI_CLANS.map((item) => (
          <a
            key={item.name}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.wikiItemLink}
            title={`${item.name} Wiki`}
            aria-label={`${item.name} Wiki`}
          >
            <img src={item.icon} alt={item.name} className={styles.wikiItemIcon} loading="lazy" />
          </a>
        ))}
      </div>
    </footer>
  );
}
