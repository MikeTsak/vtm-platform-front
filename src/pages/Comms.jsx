// src/pages/Comms.jsx
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthCtx } from '../AuthContext';
import styles from '../styles/Comms.module.css';
import ChatSystem from '../components/ChatSystem';
import EmailSystem from '../components/EmailSystem';

export default function Comms() {
  const { user } = useContext(AuthCtx);
  const [commsMode, setCommsMode] = useState('chat'); // 'chat' | 'email'
  const [isMobile, setIsMobile] = useState(false);
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
        <ChatSystem user={user} isMobile={isMobile} />
      ) : (
        <EmailSystem user={user} isMobile={isMobile} />
      )}
    </div>
  );
}