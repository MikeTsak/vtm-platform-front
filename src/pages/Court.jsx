import React, { useState, useContext } from 'react';
import { AuthCtx } from '../AuthContext';
import HierarchyView from '../components/HierarchyView';
import AnnouncementsView from '../components/AnnouncementsView';
import CoterieManager from '../components/CoterieManager'; 
import styles from '../styles/Court.module.css';

export default function Court() {
  const { user } = useContext(AuthCtx);
  const [activeTab, setActiveTab] = useState('hierarchy');
  
  // PERMISSION LOGIC:
  // Admin: Can edit everything (Hierarchy, Announcements, etc.)
  const isAdmin = user?.role === 'admin';
  
  // Court User: Can post Announcements, but CANNOT edit Hierarchy
  const isCourt = user?.role === 'admin' || user?.role === 'courtuser';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>The Court of Athens</h1>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'hierarchy' ? styles.active : ''}`} 
            onClick={() => setActiveTab('hierarchy')}
          >
            Hierarchy
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'announcements' ? styles.active : ''}`} 
            onClick={() => setActiveTab('announcements')}
          >
            Announcements
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'coteries' ? styles.active : ''}`} 
            onClick={() => setActiveTab('coteries')}
          >
            Coteries
          </button>
        </div>
      </header>

      <main className={styles.content}>
        {/* HIERARCHY: Only 'admin' gets edit rights */}
        {activeTab === 'hierarchy' && <HierarchyView canEdit={isAdmin} />}

        {/* ANNOUNCEMENTS: 'courtuser' can also post here */}
        {activeTab === 'announcements' && <AnnouncementsView canEdit={isCourt} />}

        {activeTab === 'coteries' && (
          <div className={styles.coterieWrapper}>
            <CoterieManager />
          </div>
        )}
      </main>
    </div>
  );
}