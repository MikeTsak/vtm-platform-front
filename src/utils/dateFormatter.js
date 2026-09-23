// src/utils/dateFormatter.js
//
// European and Greek standard date and time formatting (DD/MM/YYYY)
// strictly pinned to the Europe/Athens timezone.

export const ATHENS_TZ = 'Europe/Athens';

/**
 * Formats a date or timestamp in Europe/Athens timezone.
 * Pure date strings (YYYY-MM-DD) are formatted directly as DD/MM/YYYY.
 * Timestamps and Date instances are converted to Europe/Athens wall clock time.
 */
export function formatEuDate(dateValue, options = {}) {
  if (!dateValue) return "";
  try {
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue.trim())) {
      const [y, m, d] = dateValue.trim().split('-');
      return `${d}/${m}/${y}`;
    }

    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return String(dateValue);

    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: ATHENS_TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: options.includeSeconds === false ? undefined : '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(d);
    const p = {};
    for (const part of parts) {
      p[part.type] = part.value;
    }

    const datePart = `${p.day}/${p.month}/${p.year}`;
    if (options.dateOnly) return datePart;

    const timePart = options.includeSeconds === false
      ? `${p.hour}:${p.minute}`
      : `${p.hour}:${p.minute}:${p.second}`;

    return `${datePart} ${timePart}`;
  } catch (e) {
    return String(dateValue);
  }
}

/**
 * Returns date only in Athens timezone: DD/MM/YYYY
 */
export function formatAthensDate(dateValue) {
  return formatEuDate(dateValue, { dateOnly: true });
}

/**
 * Returns date and time in Athens timezone: DD/MM/YYYY HH:mm (or HH:mm:ss)
 */
export function formatAthensDateTime(dateValue, includeSeconds = false) {
  return formatEuDate(dateValue, { includeSeconds });
}

/**
 * Returns short weekday + date in Athens timezone, for example: "Tue, 22 Sep 2026"
 */
export function formatAthensWeekdayDate(dateValue) {
  if (!dateValue) return "";
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return String(dateValue);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: ATHENS_TZ,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch (e) {
    return String(dateValue);
  }
}

/**
 * Returns day name and time in Athens timezone, for example:
 * "Tuesday at 00:01 (22/09/2026)"
 */
export function formatAthensDayAndTime(dateValue) {
  if (!dateValue) return "";
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return String(dateValue);
    const day = new Intl.DateTimeFormat('en-GB', { timeZone: ATHENS_TZ, weekday: 'long' }).format(d);
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: ATHENS_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    const date = formatAthensDate(d);
    return `${day} at ${time} (${date})`;
  } catch (e) {
    return String(dateValue);
  }
}
