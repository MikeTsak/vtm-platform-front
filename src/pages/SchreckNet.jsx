import React, { useState, useEffect, useContext } from 'react';
import { AuthCtx } from '../AuthContext';
import api from '../api';
import ChatSystem from '../components/ChatSystem';
import styles from '../styles/Comms.module.css'; // reuse Comms styling for banner
import { Skeleton } from 'boneyard-js/react';

export default function SchreckNet() {
  const { user } = useContext(AuthCtx);
  const [commsEnabled, setCommsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Master Comms Polling (same as in Comms.jsx)
  useEffect(() => {
    const checkComms = async () => {
      try {
        const { data } = await api.get('/comms/status');
        setCommsEnabled(data.comms_enabled);
        setIsLoading(false);
      } catch (e) {
        // ignore errors, keep previous state
        setIsLoading(false);
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
        <Skeleton loading={isLoading} name="schrecknet-page">
          <ChatSystem user={user} isMobile={false} commsEnabled={commsEnabled} />
        </Skeleton>
      )}
    </div>
  );
}