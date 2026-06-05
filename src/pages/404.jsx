// src/pages/NotFound.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/404.module.css'; 

export default function NotFound() {
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    setPos({ x, y });
  };

  return (
    <div
      className={styles.container}
      onMouseMove={handleMouseMove}
      style={{ '--x': `${pos.x}%`, '--y': `${pos.y}%` }}
    >
      <div className={styles.overlay}></div>
      
      <div className={styles.content}>
        <h1 className={styles.glitch} data-text="404">404</h1>
        <h2 className={styles.title}>Data Corrupted</h2>
        
        <p className={styles.description}>
          This node has been purged from SchreckNet. Either the Second Inquisition found it, or you are prying into secrets you shouldn't.
        </p>

        {/* --- Athens Metro Scene --- */}
        <div className={styles.chaseScene}>
          
          <div className={styles.athensSurface}>
            <div className={styles.acropolis}>
              <div className={styles.templeRoof}></div>
              <div className={styles.templePillars}></div>
              <div className={styles.templeBase}></div>
            </div>
            <div className={styles.acropolisHill}></div>
          </div>

          <div className={styles.underground}>
            <div className={styles.tunnelLights}></div>
            <div className={styles.tunnelPillars}></div>
            
            {/* --- Flexible Train Wrapper --- */}
            <div className={styles.trainWrapper}>
              <div className={styles.trainCar}>
                <div className={styles.trainWindow}></div>
                <div className={styles.trainWindow}></div>
              </div>
              
              <div className={styles.trainJoint}></div>
              
              <div className={styles.trainCar}>
                <div className={styles.trainWindow}></div>
                <div className={styles.trainWindow}></div>
              </div>

              <div className={styles.trainJoint}></div>

              <div className={styles.trainFront}>
                <div className={styles.trainWindow}></div>
                <div className={styles.trainLight}></div>
              </div>
            </div>
            {/* ------------------------------ */}

          </div>
        </div>

        <Link to="/" className={styles.homeBtn}>
          Flee to the Shadows
        </Link>
      </div>
    </div>
  );
}