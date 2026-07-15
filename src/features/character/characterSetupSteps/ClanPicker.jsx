import React from 'react';
import styles from '../../../styles/Sheet.module.css';
// Import the new predator data
import { PREDATOR_TYPES, PREDATOR_TYPE_NAMES } from '../../../data/predator_types';

// Flavor-only blurbs
const CLAN_BLURBS = {
  Brujah: 'Rebels & firebrands who turn conviction into force.',
  Gangrel: 'Feral survivors close to the Beast and the wild.',
  Malkavian: 'Cursed seers who glimpse truth Through cracks.',
  Nosferatu: 'Monstrous spies and info-brokers of the underbelly.',
  Toreador: 'Aesthetic predators intoxicated by beauty.',
  Tremere: 'Blood sorcerers obsessed with occult mastery.',
  Ventrue: 'Aristocrats of the night; command and control.',
  'Banu Haqim': 'Judges and hunters; blades in the dark.',
  Hecata: 'Necromantic consortium dealing with Death itself.',
  Lasombra: 'Shadow aristocrats who bend darkness to will.',
  'The Ministry': 'Tempters and iconoclasts who break taboos.',
  Caitiff: 'Clanless strays with no inherited path.',
  'Thin-blood': 'Faint undead spark; alchemy and ambiguity.'
};

// Dark palettes per clan
const CLAN_COLORS = {
  Brujah:    ['#b40f1f','#7a0b15'],
  Gangrel:   ['#2f7a3a','#173a1f'],
  Malkavian: ['#713c8b','#3a1f47'],
  Nosferatu: ['#6a4b2b','#332515'],
  Toreador:  ['#b8236b','#5c1338'],
  Tremere:   ['#7b1113','#37090a'],
  Ventrue:   ['#1b4c8c','#0e2547'],
  'Banu Haqim': ['#7a2f57','#3a1730'],
  Hecata:    ['#2b6b6b','#123636'],
  Lasombra:  ['#191a5a','#0c0d2e'],
  'The Ministry': ['#865f12','#3c2a08'],
  Caitiff:   ['#636363','#2f2f2f'],
  'Thin-blood': ['#6e6e2b','#383813'],
};

// --- Asset helpers ---
const NAME_OVERRIDES = {
  'The Ministry': 'Ministry',
  'Banu Haqim': 'Banu_Haqim',
  'Thin-blood': 'Thinblood'
};
const symlogo = (c) =>
  `/img/clans/330px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g,'_')}_symbol.png`;
const textlogo = (c) =>
  `/img/clans/text/300px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g,'_')}_Logo.png`;

// Disciplines per clan
const CLAN_DISCIPLINES = {
  Brujah: ['Celerity','Potence','Presence'],
  Gangrel: ['Animalism','Fortitude','Protean'],
  Malkavian: ['Auspex','Dominate','Obfuscate'],
  Nosferatu: ['Animalism','Obfuscate','Potence'],
  Toreador: ['Auspex','Celerity','Presence'],
  Tremere: ['Auspex','Blood Sorcery','Dominate'],
  Ventrue: ['Dominate','Fortitude','Presence'],
  'Banu Haqim': ['Blood Sorcery','Celerity','Obfuscate'],
  Hecata: ['Auspex','Fortitude','Oblivion'],
  Lasombra: ['Dominate','Oblivion','Potence'],
  'The Ministry': ['Obfuscate','Presence','Protean'],
  Caitiff: ['Choose Any','Choose Any','Choose Any'],
  'Thin-blood': ['Thin-blood Alchemy']
};

export default function ClanPicker({ clan, setClan, setStep }) {
  const tint = clan ? CLAN_COLORS[clan][0] : '#8a0f1a';

  return (
    <section>
      <h3 className={styles.sectionTitle}>Choose Your Clan</h3>
      <p className={`${styles.muted} ${styles.smallFlavor}`}>
        Blood remembers. Choose the lineage that will shape your curse.
      </p>
      <div className={styles.clanGrid}>
        {Object.keys(CLAN_DISCIPLINES).map(c => {
          const active = clan === c;
          return (
            <button
              key={c}
              type="button"
              className={`${styles.clanCard} ${active ? styles.active : ''}`}
              style={{ background: `linear-gradient(180deg, ${CLAN_COLORS[c][0]}, ${CLAN_COLORS[c][1]})` }}
              onClick={()=>setClan(c)}
              title={CLAN_BLURBS[c]}
            >
              <div className={styles.clanLogoWrap}>
                <img src={symlogo(c)} alt={`${c} symbol`} className={styles.clanLogo} />
              </div>
              <div className={styles.clanMeta}>
                <div className={styles.clanName}>{c}</div>
                <div className={styles.clanBlurb}>{CLAN_BLURBS[c]}</div>
                <div className={styles.clanDiscs}>{(CLAN_DISCIPLINES[c]||[]).join(' • ')}</div>
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