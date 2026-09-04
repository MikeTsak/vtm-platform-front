import React, { useContext } from 'react';
import { AuthCtx } from '../../../core/AuthContext';
import EmailSystem from '../../email/EmailSystem';
import styles from '../../../styles/Comms.module.css'; // reuse Comms styling for banner
import { Skeleton } from 'boneyard-js/react';
import { motion } from 'framer-motion';
import { useCommsEnabled } from '../useCommsEnabled';

export default function SurfaceWeb() {
  const { user } = useContext(AuthCtx);
  const { commsEnabled, isLoading } = useCommsEnabled();

  return (
    <Skeleton loading={isLoading} name="surfaceweb-page">
      <motion.div 
        className={styles.wrapper} 
        data-mode="email"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
      >
      {/* BANNER */}
      <motion.div 
        className={styles.modeSwitch}
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
        <EmailSystem user={user} isMobile={false} commsEnabled={commsEnabled} />
      )}
      </motion.div>
    </Skeleton>
  );
}