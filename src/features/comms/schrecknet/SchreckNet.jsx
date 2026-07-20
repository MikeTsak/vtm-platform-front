import React, { useState, useEffect, useContext } from 'react';
import { AuthCtx } from '../../../core/AuthContext';
import api from '../../../core/api';
import ChatSystem from '../../chat/ChatSystem';
import styles from '../../../styles/Comms.module.css'; // reuse Comms styling for banner
import { Skeleton } from 'boneyard-js/react';
import { motion } from 'framer-motion';

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
    <motion.div
      className={styles.wrapper}
      data-mode="chat"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
      }}
    >
      {/* BANNER */}
      <motion.div 
        className={styles.modeSwitch} 
        style={{ flexShrink: 0 }}
        variants={{
          hidden: { opacity: 0, y: -20 },
          visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }
        }}
      >
        <button className={styles.activeMode} disabled>
          <span className={styles.modeTitle}>SchreckNet</span>
          <span className={styles.modeSubtitle}>Everything here is safe.</span>
        </button>
      </motion.div>

      {user && (
        <motion.div 
          style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          variants={{
            hidden: { opacity: 0, scale: 0.98 },
            visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
          }}
        >
          <Skeleton loading={isLoading} name="schrecknet-page">
            <ChatSystem user={user} isMobile={false} commsEnabled={commsEnabled} />
          </Skeleton>
        </motion.div>
      )}
    </motion.div>
  );
}