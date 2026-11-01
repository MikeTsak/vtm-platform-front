// Notification preferences: which kinds of push a player gets, plus this
// device's permission state and a test button. Opened from the bells on Home,
// SchreckNet and the character sheet. Categories mirror PUSH_CATEGORIES in
// back/services/push.js (a category never set follows its parent server-side).
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api, { formatApiError } from '../../core/api';
import { getPushSettings, updatePushSettings, subscribeToWebPush, getPushUnsupportedReason } from '../../utils/push';
import styles from '../../styles/NotificationSettings.module.css';

export const PUSH_GROUPS = [
  {
    title: 'Comms',
    items: [
      { key: 'chat', label: 'SchreckNet messages', hint: 'Direct messages, group chats and NPC messages.' },
      { key: 'mail', label: 'SurfaceWeb email', hint: 'New mail in your SurfaceWeb inbox.' },
      { key: 'notes', label: 'Anonymous notes', hint: 'When someone leaves you a note.' },
    ],
  },
  {
    title: 'Chronicle',
    items: [
      { key: 'downtimes', label: 'Downtimes', hint: 'Resolutions released and Storyteller replies to your actions.' },
      { key: 'court', label: 'Court and domains', hint: 'Domain claims, Blood Hunts, and feeding incidents in your domain.' },
      { key: 'character', label: 'Your character', hint: 'Discipline access, ghoul upkeep and hunt evidence.' },
    ],
  },
  {
    title: 'Storytellers',
    items: [
      { key: 'system', label: 'Storyteller broadcasts', hint: 'Announcements sent to every player.' },
    ],
  },
];

export const COMMS_KEYS = ['chat', 'mail', 'notes'];
export const CHRONICLE_KEYS = ['downtimes', 'court', 'character', 'system'];
export const anyOn = (settings, keys) => !!settings && keys.some((k) => settings[k]);

function devicePermission() {
  if (getPushUnsupportedReason()) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

export default function NotificationSettings({ open, onClose, onChange }) {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [permission, setPermission] = useState(devicePermission);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setMsg('');
    setPermission(devicePermission());
    getPushSettings().then(setSettings).catch((e) => setMsg(formatApiError(e, 'Could not load your notification settings')));
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const apply = (next) => {
    setSettings(next);
    onChange?.(next);
  };

  // Turning anything on needs this device subscribed first (asks the browser
  // for permission the first time). Turning off never touches the device.
  const ensureDevice = async () => {
    if (permission === 'granted') return true;
    const reason = getPushUnsupportedReason();
    if (reason) { setMsg(reason); return false; }
    try {
      await subscribeToWebPush();
      setPermission('granted');
      return true;
    } catch (e) {
      setPermission(devicePermission());
      setMsg(e.message);
      return false;
    }
  };

  const toggle = async (key) => {
    if (busy || !settings) return;
    const turnOn = !settings[key];
    setBusy(key);
    setMsg('');
    try {
      if (turnOn && !(await ensureDevice())) return;
      await updatePushSettings({ [key]: turnOn });
      // The server answers with every category's effective value; re-read so
      // children that follow a parent update too.
      apply(await getPushSettings());
    } catch (e) {
      setMsg(formatApiError(e, 'Could not save'));
    } finally {
      setBusy('');
    }
  };

  const sendTest = async () => {
    setBusy('test');
    setMsg('');
    try {
      if (!(await ensureDevice())) return;
      await api.post('/push/test', { category: 'test' });
      setMsg('Test sent. It should arrive on this device within a few seconds.');
    } catch (e) {
      setMsg(formatApiError(e, 'Test failed'));
    } finally {
      setBusy('');
    }
  };

  const deviceText = {
    granted: 'This device can receive notifications.',
    default: 'This device has not been allowed to show notifications yet. Switching anything on will ask.',
    denied: 'Notifications are blocked for this site in your browser settings. Allow them there, then come back.',
    unsupported: getPushUnsupportedReason(),
  }[permission];

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <h2 id="notif-settings-title" className={styles.title}>
            <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
            Notifications
          </h2>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className={`${styles.device} ${permission === 'granted' ? styles.deviceOk : ''}`}>
          <span>{deviceText}</span>
          {permission !== 'unsupported' && permission !== 'denied' && (
            <button type="button" className={styles.testBtn} onClick={sendTest} disabled={!!busy}>
              {busy === 'test' ? 'Sending…' : 'Send a test'}
            </button>
          )}
        </div>
        <p className={styles.small}>Your choices below apply to every device you have switched notifications on for.</p>

        {msg && <div className={styles.msg} role="status">{msg}</div>}

        {!settings && !msg && <p className={styles.small}>Loading…</p>}

        {settings && PUSH_GROUPS.map((g) => (
          <section key={g.title} className={styles.group}>
            <h3 className={styles.groupTitle}>{g.title}</h3>
            {g.items.map((item) => (
              <label key={item.key} className={styles.row}>
                <span className={styles.text}>
                  <span className={styles.label}>{item.label}</span>
                  <span className={styles.hint}>{item.hint}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  className={styles.switch}
                  checked={!!settings[item.key]}
                  disabled={!!busy}
                  onChange={() => toggle(item.key)}
                  aria-label={item.label}
                />
              </label>
            ))}
          </section>
        ))}
      </div>
    </div>,
    document.body
  );
}
