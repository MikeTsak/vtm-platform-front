import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthCtx } from '../../../core/AuthContext';
import EmailSystem from '../../email/EmailSystem';
import styles from '../../../styles/Comms.module.css'; // reuse Comms styling for banner
import { Skeleton } from 'boneyard-js/react';
import { motion } from 'framer-motion';
import { useCommsEnabled } from '../useCommsEnabled';

export default function SurfaceWeb() {
  const { user } = useContext(AuthCtx);
  const { commsEnabled, nextOpening, isLoading } = useCommsEnabled();
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);

  // Mobile detection — mirrors Comms.jsx behaviour
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    let observer;
    const el = containerRef.current;
    if (el && 'ResizeObserver' in window) {
      observer = new ResizeObserver(checkMobile);
      observer.observe(el);
    } else {
      window.addEventListener('resize', checkMobile);
    }
    return () => {
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', flexDirection: 'column', minHeight: 0, padding: isMobile ? 0 : '0 20px 20px', maxWidth: isMobile ? 'none' : 1400, margin: '0 auto', boxSizing: 'border-box', width: '100%' }}
    >
      <Skeleton loading={isLoading} name="surfaceweb-page">
        <motion.div
          className={styles.wrapper}
          data-mode="email"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ display: 'flex', flexDirection: 'column', padding: 0 }}
        >
          {/* BANNER */}
          <motion.div
            className={styles.modeSwitch}
            style={{ flexShrink: 0 }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <button className={styles.activeMode} disabled>
              <span className={styles.modeTitle}>Surface Web</span>
              <span className={styles.modeSubtitle}>Be careful, you are not safe.</span>
            </button>
          </motion.div>

          {user && (
            <EmailSystem user={user} isMobile={isMobile} commsEnabled={commsEnabled} nextOpening={nextOpening} />
          )}
        </motion.div>
      </Skeleton>
    </div>
  );
}