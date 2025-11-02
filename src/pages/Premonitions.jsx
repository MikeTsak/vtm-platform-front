// src/pages/Premonitions.jsx
import React from 'react';
import styles from '../styles/Premonitions.module.css';

export default function Premonitions() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h2 className={styles.title}>Premonitions</h2>
        <p className={styles.subtitle}>The fragmented future, as seen through a fractured lens.</p>
      </header>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>The Cobweb</h3>
        <p>
          Here, you might see cryptic messages, fragmented visions, or warnings left by others
          who ride the wave of the Madness Network.
        </p>
        <p>
          <em>(This is where you would map and display the premonition content.)</em>
        </p>
      </section>

      <section className={styles.card}>
         <h3 className={styles.cardTitle}>Whispers</h3>
         <div className={styles.whisper}>
           "The tower will fall when the Jester loses his laugh..."
         </div>
         <div className={styles.whisper}>
           "Beware the man with nine fingers, for he holds the key he cannot turn..."
         </div>
         <div className={styles.whisper}>
           "Three lights will shine as one, and the city will weep crimson..."
         </div>
      </section>
    </main>
  );
}

