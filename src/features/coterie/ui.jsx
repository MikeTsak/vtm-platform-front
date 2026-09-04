// src/features/coterie/ui.jsx
//
// Small presentational primitives shared by the coterie screens. Kept in one
// place so the builder, the sheet and the catalogs look like one tool and so
// the layout rules live in Coteries.module.css rather than in inline styles
// scattered through the markup (which is what broke the old page on phones).
import React from 'react';
import styles from '../../styles/Coteries.module.css';
import { MAX_DOTS } from '../../data/coterieRules';

export function Card({ title, subtitle, actions, children, tone, className, id }) {
  return (
    <section id={id} className={`${styles.card} ${className || ''}`} data-tone={tone}>
      {(title || subtitle || actions) && (
        <header className={styles.cardHeader}>
          <div className={styles.cardHeadings}>
            {title && <h3 className={styles.cardTitle}>{title}</h3>}
            {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.cardActions}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Horizontally scrollable on phones rather than a tall stack of full-width buttons. */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={t.value === value}
          onClick={() => onChange(t.value)}
          className={`${styles.tabButton} ${t.value === value ? styles.tabButtonActive : ''}`}
        >
          {t.label}
          {t.badge != null && <span className={styles.tabBadge}>{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function Dots({ value, max = MAX_DOTS, label }) {
  return (
    <span className={styles.dotsStatic} aria-label={label ? `${label}: ${value} of ${max}` : undefined}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`${styles.dot} ${i < value ? styles.dotFilled : ''}`} />
      ))}
    </span>
  );
}

/**
 * Dot rating control. `min` is a real floor (a Merit that is always •••
 * cannot be set to ••), while `baseline` is only a visual marker for "this is
 * what your coterie type lists" — the corebook lets a troupe trade those dots
 * away, so it must not be a hard lock.
 */
export function DotPicker({ label, value, onChange, max = MAX_DOTS, min = 0, baseline = 0, disabled }) {
  const set = (k) => {
    if (disabled) return;
    const next = k === value ? Math.max(min, k - 1) : k;
    onChange(Math.max(min, Math.min(max, next)));
  };
  return (
    <div className={styles.dotPicker}>
      {label && <span className={styles.dotPickerLabel}>{label}</span>}
      <span className={styles.dots} role="group" aria-label={label || 'rating'}>
        {Array.from({ length: max }).map((_, i) => {
          const k = i + 1;
          return (
            <button
              key={k}
              type="button"
              disabled={disabled}
              onClick={() => set(k)}
              aria-label={`Set to ${k}`}
              title={`${label ? `${label}: ` : ''}${k}`}
              className={`${styles.dotButton} ${k <= baseline ? styles.dotButtonBaseline : ''}`}
            >
              <span className={`${styles.dot} ${k <= value ? styles.dotFilled : ''}`} />
            </button>
          );
        })}
      </span>
      <span className={styles.dotCount}>{value}</span>
    </div>
  );
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={`${styles.field} ${className || ''}`}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {hint && <span className={styles.fieldHint}>{hint}</span>}
    </label>
  );
}

export function NumberInput({ label, value, onChange, min = 0, max = 99, hint }) {
  return (
    <Field label={label} hint={hint} className={styles.fieldNarrow}>
      <input
        type="number"
        inputMode="numeric"
        className={styles.input}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value || 0))))}
      />
    </Field>
  );
}

export function Muted({ children, className, tone }) {
  return <p className={`${styles.muted} ${className || ''}`} data-tone={tone}>{children}</p>;
}

export function Empty({ children }) {
  return <p className={styles.empty}>{children}</p>;
}

/** A labelled figure — the sheet's headline mechanics. */
export function Stat({ label, value, unit, hint, tone }) {
  return (
    <div className={styles.stat} data-tone={tone}>
      <div className={styles.statValue}>
        {value}
        {unit && <span className={styles.statUnit}>{unit}</span>}
      </div>
      <div className={styles.statLabel}>{label}</div>
      {hint && <div className={styles.statHint}>{hint}</div>}
    </div>
  );
}

export function IssueList({ errors = [], warnings = [] }) {
  if (!errors.length && !warnings.length) return null;
  return (
    <div className={styles.issues}>
      {errors.length > 0 && (
        <ul className={styles.issueListError}>
          {errors.map((e, i) => <li key={`e${i}`}>{e}</li>)}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className={styles.issueListWarn}>
          {warnings.map((w, i) => <li key={`w${i}`}>{w}</li>)}
        </ul>
      )}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className={styles.spinner} role="status">
      <span className={styles.spinnerDot} />
      <span className={styles.spinnerDot} />
      <span className={styles.spinnerDot} />
      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}

/** Bottom-sheet on phones, centred dialog on wider screens. */
export function Modal({ title, subtitle, onClose, children, footer }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className={styles.modalScrim} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>{title}</h3>
            {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className={styles.modalBody}>{children}</div>
        {footer && <footer className={styles.modalFooter}>{footer}</footer>}
      </div>
    </div>
  );
}
