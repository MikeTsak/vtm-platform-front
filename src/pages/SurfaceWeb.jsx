import React, { useState, useEffect, useContext } from 'react';
import { AuthCtx } from '../AuthContext';
import api from '../api';
import EmailSystem from '../components/EmailSystem';
import styles from '../styles/Comms.module.css'; // reuse Comms styling for banner

export default function SurfaceWeb() {
  const { user } = useContext(AuthCtx);
  const [commsEnabled, setCommsEnabled] = useState(true);

  // Master Comms Polling (same as in Comms.jsx)
  useEffect(() => {
    const checkComms = async () => {
      try {
        const { data } = await api.get('/comms/status');
        setCommsEnabled(data.comms_enabled);
      } catch (e) {
        // ignore errors, keep previous state
      }
    };

    checkComms();
    const interval = setInterval(checkComms, 10000); // 10s poll
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.wrapper} data-mode="email">
      {/* BANNER */}
      <div className={styles.modeSwitch}>
        <button className={styles.activeMode} disabled>
          <span className={styles.modeTitle}>Surface Web</span>
          <span className={styles.modeSubtitle}>Be careful, you are not safe.</span>
        </button>
      </div>

      {user && (
        <EmailSystem user={user} isMobile={false} commsEnabled={commsEnabled} />
      )}
    </div>
  );
}