// src/features/comms/notes/AnonymousNotesPage.jsx
//
// Third Comms tab (next to SchreckNet and Surface Web): the player's anonymous
// notes, or the admin's compose / sent / read-receipt list.
import React, { useContext, useEffect, useState } from 'react';
import { AuthCtx } from '../../../core/AuthContext';
import { roleFlags } from '../../../core/useRole';
import styles from '../../../styles/Comms.module.css'; // reuse Comms styling for banner
import AnonymousNotes, { useMyNotes } from './AnonymousNotes';

export default function AnonymousNotesPage() {
  const { user } = useContext(AuthCtx);
  const { isAdmin } = roleFlags(user);
  const { notes, setNotes } = useMyNotes(!!user && !isAdmin);
  const [isMobile, setIsMobile] = useState(false);
  const unread = notes.filter(n => !n.read_at).length;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', minHeight: 0, padding: isMobile ? 0 : '0 20px 20px', maxWidth: isMobile ? 'none' : 1400, margin: '0 auto', boxSizing: 'border-box', width: '100%' }}
    >
      <div className={styles.wrapper} data-mode="email" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div className={styles.modeSwitch} style={{ flexShrink: 0 }}>
          <button className={styles.activeMode} disabled>
            <span className={styles.modeTitle}>
              Anonymous Notes
              {unread > 0 && <span className={styles.tabBadge}>{unread}</span>}
            </span>
            <span className={styles.modeSubtitle}>Someone knows where you are.</span>
          </button>
        </div>
        {user && <AnonymousNotes isAdmin={isAdmin} notes={notes} setNotes={setNotes} />}
      </div>
    </div>
  );
}
