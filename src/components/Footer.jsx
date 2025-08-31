import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        {/* Brand / Project */}
        <div className={styles.brandBlock}>
          <img
            src="/img/ATT-logo(1).png"
            alt="Erebus Portal"
            className={styles.attLogo}
            draggable="false"
          />
          <div className={styles.brandText}>
            <div className={styles.title}>Erebus Portal</div>
            <div className={styles.byline}>
              made by <a href="https://miketsak.gr" target="_blank" rel="noreferrer">MikeTsak</a> for the
              {' '}Athens Thought-Time LARP — Powered by{' '}
              <a href="https://cerebralproductions.eu/" target="_blank" rel="noreferrer">Cerebral Productions</a>
            </div>
          </div>
        </div>

        {/* Logos & Legal */}
        <div className={styles.logosBlock}>
          {/* Cerebral Productions */}
          <a
            href="https://cerebralproductions.eu/"
            target="_blank"
            rel="noreferrer"
            className={styles.partnerLink}
            aria-label="Cerebral Productions"
          >
            <img
              src="/img/cerebralproductions.png"
              alt="Cerebral Productions"
              className={styles.partnerLogo}
              draggable="false"
            />
          </a>

          {/* Dark Pack */}
          <a
            href="https://www.paradoxinteractive.com/games/world-of-darkness/community/dark-pack-agreement"
            target="_blank"
            rel="noreferrer"
            className={styles.dpLink}
            aria-label="Dark Pack Agreement"
          >
            <img
              src="/img/DarkPack_Logo2.png"
              alt="World of Darkness — Dark Pack"
              className={styles.darkPackLogo}
              draggable="false"
            />
          </a>
        </div>
      </div>

      {/* Legal text */}
      <div className={styles.legalLines}>
        <small className={styles.legal}>
          Portions of the materials are the copyrights and trademarks of Paradox Interactive AB,
          and are used with permission. All rights reserved. For more information please visit
          {' '}<a href="https://www.worldofdarkness.com" target="_blank" rel="noreferrer">worldofdarkness.com</a>.
        </small>
        <small className={styles.legalMuted}>
          This is <b>unofficial fan content</b> and is not approved, endorsed, or affiliated with Paradox Interactive.
        </small>
        <small className={styles.legalMuted}>
          Vampire: The Masquerade and World of Darkness are trademarks of Paradox Interactive AB.
        </small>
      </div>

      <div className={styles.linksRow}>
        <Link to="/legal" className={styles.footerLink}>Legal & Credits</Link>
        <a
          href="https://www.paradoxinteractive.com/games/world-of-darkness/community/dark-pack-agreement"
          target="_blank"
          rel="noreferrer"
          className={styles.footerLink}
        >
          Dark Pack Agreement
        </a>
      </div>
    </footer>
  );
}
