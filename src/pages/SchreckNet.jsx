import React, { useState, useEffect, useContext } from 'react';
import { AuthCtx } from '../AuthContext';
import api from '../api';
import ChatSystem from '../components/ChatSystem';
import styles from '../styles/Comms.module.css'; // reuse Comms styling for banner

export default function SchreckNet() {
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
    <div className={styles.wrapper} data-mode="chat">
      {/* BANNER */}
      <div className={styles.modeSwitch}>
        <button className={styles.activeMode} disabled>
          <span className={styles.modeTitle}>SchreckNet</span>
          <span className={styles.modeSubtitle}>Everything here is safe.</span>
        </button>
      </div>

      {user && (
        <ChatSystem user={user} isMobile={false} commsEnabled={commsEnabled} />
      )}
    </div>
  );
}