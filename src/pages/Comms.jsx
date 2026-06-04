// src/pages/Comms.jsx
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthCtx } from '../AuthContext';
import api from '../api';
import styles from '../styles/Comms.module.css';
import ChatSystem from '../components/ChatSystem';
import EmailSystem from '../components/EmailSystem';

export default function Comms() {
  const { user } = useContext(AuthCtx);
  const [commsMode, setCommsMode] = useState('chat'); // 'chat' | 'email'
  const [isMobile, setIsMobile] = useState(false);
  const [commsEnabled, setCommsEnabled] = useState(true);
  const containerRef = useRef(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    let observer;
    const currentContainer = containerRef.current;
    if (currentContainer && 'ResizeObserver' in window) {
      observer = new ResizeObserver(checkMobile);
      observer.observe(currentContainer);
    } else {
      window.addEventListener('resize', checkMobile);
    }
    return () => {
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Master Comms Polling
  useEffect(() => {
    const checkComms = async () => {
      try {
        const { data } = await api.get('/comms/status');
        setCommsEnabled(data.comms_enabled);
      } catch (e) {}
    };
    
    checkComms();
    const interval = setInterval(checkComms, 10000); // 10s poll
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.wrapper} ref={containerRef} data-mode={commsMode}>
      {/* MODE SWITCHER */}
      <div className={styles.modeSwitch}>
        <button 
          className={commsMode === 'chat' ? styles.activeMode : ''} 
          onClick={() => setCommsMode('chat')}
        >
          <span className={styles.modeTitle}>SchreckNet</span>
          <span className={styles.modeSubtitle}>Everything here is safe.</span>
        </button>
        
        <button 
          className={commsMode === 'email' ? styles.activeMode : ''} 
          onClick={() => setCommsMode('email')}
        >
          <span className={styles.modeTitle}>Surface Web</span>
          <span className={styles.modeSubtitle}>Be careful, you are not safe.</span>
        </button>
      </div>

      {commsMode === 'chat' ? (
        <ChatSystem user={user} isMobile={isMobile} commsEnabled={commsEnabled} />
      ) : (
        <EmailSystem user={user} isMobile={isMobile} commsEnabled={commsEnabled} />
      )}
    </div>
  );
}