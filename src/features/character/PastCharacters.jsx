import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../core/api';
import styles from '../../styles/CharacterView.module.css';

// The player's retired characters (one account plays one character at a
// time; see back/services/characterRetirement.js). Each opens read-only.
// Renders nothing for a player who has only ever had one.
export default function PastCharacters() {
  const [past, setPast] = useState([]);

  useEffect(() => {
    let alive = true;
    api.get('/characters/mine')
      .then(({ data }) => { if (alive) setPast((data.characters || []).filter(c => !c.is_current)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!past.length) return null;
  return (
    <section className={styles.pastChars} aria-labelledby="past-chars-head">
      <h3 id="past-chars-head" className={styles.subhead}>Past characters</h3>
      <ul className={styles.pastCharsList}>
        {past.map(c => (
          <li key={c.id}>
            <Link to={`/character/archive/${c.id}`} className={styles.pastCharsLink}>
              <span className="material-symbols-outlined" aria-hidden="true">{c.is_deceased ? 'skull' : 'inventory_2'}</span>
              <span><b>{c.name}</b> <span className={styles.dim}>{c.clan}{c.is_deceased ? ' · Final Death' : ''}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
