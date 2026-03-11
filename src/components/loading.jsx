// src/components/loading.jsx
import React from 'react';
import styles from '../styles/Loading.module.css';

/**
 * Loading — reusable loading indicator with spinner and message.
 *
 * Props:
 *  text     {string}  — message to display (default: "Loading…")
 *  fullPage {boolean} — stretch to 80 vh and centre on page (default: false)
 *  size     {string}  — 'sm' | 'md' | 'lg' (default: 'md')
 */
export default function Loading({ text = 'Loading…', fullPage = false, size = 'md' }) {
  const sizeClass =
    size === 'sm' ? styles.sizeSm :
    size === 'lg' ? styles.sizeLg :
    styles.sizeMd;

  const wrapClass = fullPage
    ? `${styles.fullPage} ${sizeClass}`
    : `${styles.inline} ${sizeClass}`;

  return (
    <div className={wrapClass} role="status" aria-live="polite" aria-label={text}>
      <div className={styles.inner}>
        <div className={styles.spinner} aria-hidden="true" />
        <span className={styles.text}>{text}</span>
      </div>
    </div>
  );
}
