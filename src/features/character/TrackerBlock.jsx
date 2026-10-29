// src/features/character/TrackerBlock.jsx
//
// One V5 tracker: Hunger as blood drops, Health / Willpower as boxes (/ Superficial,
// X Aggravated, with the rules as tooltips), Humanity as filled boxes with Stains.
// Shared by the character sheet and the Feeding page.
import React from 'react';
import styles from '../../styles/CharacterView.module.css';

const SUPERFICIAL_DESC = "Superficial damage\nSuperficial damage is bruising and small cuts, but nothing that is life-threatening. Kicking, punching, and any non-lethal weapon do Superficial damage to humans. Standard weapons do Superficial damage to vampires, this includes slashing, stabbing, and piercing weapons. In general, this type of damage is halved before adding it to the tracker and this includes when converting Superficial to Aggravated.\n\nHealing damage\nMortals may remove a number of Superficial damage equal to their Stamina rating at the beginning of a session. With Aggravated damage mortals can have their damage converted from Aggravated to Superficial with an Intelligence + Medicine test. The maximum amount able to be converted is equal to half of the character's Medicine rating rounded up with the healing happening over the course of the night. A mortal being hospitalized removes the need for rolls but takes the amount of Aggravated damage received as the total number of weeks required to heal fully.";

const AGGRAVATED_DESC = "Aggravated damage\nAggravated damage is broken bones, serious wounds, and other life-threatening injuries. Sharp and piercing weapons do Aggravated damage to humans. Generally, only fire, sunlight and the claws or teeth of other supernatural creatures do Aggravated damage to Kindred.\n\nHealing damage\nMortals may remove a number of Superficial damage equal to their Stamina rating at the beginning of a session. With Aggravated damage mortals can have their damage converted from Aggravated to Superficial with an Intelligence + Medicine test. The maximum amount able to be converted is equal to half of the character's Medicine rating rounded up with the healing happening over the course of the night. A mortal being hospitalized removes the need for rolls but takes the amount of Aggravated damage received as the total number of weeks required to heal fully.";

const WILLPOWER_SUPERFICIAL_DESC = "Spending Willpower\nPlayers may spend their character's Willpower in a variety of ways and when doing so, must mark the tracker with one Superficial damage. Should the character hit Willpower 0, they are left Impaired and receives a -2 dice penalty for Social and Mental tests. Superficial damage is tracked with an \"/\" on one of the boxes per point taken, with Aggravated tracked using an \"X\" in each box per point taken.\n\nThey may use Willpower to reroll up to three dice (the dice cannot be Hunger dice) in any pool, except when the rules specifically exclude Willpower such as tracker rolls (Remorse tests, Frenzy tests), or One-Roll Conflict), etc.\n- Willpower may be spent to take control of their character for one turn during a frenzy or when under the influence of certain Disciplines.\n- To perform minor movements, such as movement of a finger while staked.\n- To ignore Health damage penalties, including Impairment, for one turn.\n\nRecovering Superficial Willpower damage\nCharacters may recover their Superficial Willpower damage at the beginning of a session equal to either their Composure or Resolve (whichever is highest between the two). Unless, the session ends on a cliffhanger where the dwindling supply of Willpower provides a strong dramatic tension.\n- At the Storyteller's discretion, once per session, a character who acts to fulfill their desire may immediately recover 1 point of damage.\n- At the Storyteller's discretion, a character who plays out a messy critical, bestial failure, frenzy, or Compulsion in a dramatic way can recover one or more Superficial Willpower damage.";

const WILLPOWER_AGGRAVATED_DESC = "Spending Willpower\nPlayers may spend their character's Willpower in a variety of ways and when doing so, must mark the tracker with one Superficial damage. Should the character hit Willpower 0, they are left Impaired and receives a -2 dice penalty for Social and Mental tests. Superficial damage is tracked with an \"/\" on one of the boxes per point taken, with Aggravated tracked using an \"X\" in each box per point taken.\n\nThey may use Willpower to reroll up to three dice (the dice cannot be Hunger dice) in any pool, except when the rules specifically exclude Willpower such as tracker rolls (Remorse tests, Frenzy tests), or One-Roll Conflict), etc.\n- Willpower may be spent to take control of their character for one turn during a frenzy or when under the influence of certain Disciplines.\n- To perform minor movements, such as movement of a finger while staked.\n- To ignore Health damage penalties, including Impairment, for one turn.\n\nRecovering Aggravated Willpower damage\nAt the Storyteller's discretion, a character can recover one or more points of Aggravated Willpower damage when they have acted to significantly benefit a Touchstone, or by following a Conviction to their determent.";

export default function TrackerBlock({ label, val, max, agg = 0, sup = 0, filled = 0, stains = 0 }) {
  if (label === 'Hunger') {
    const drops = [];
    for (let i = 0; i < max; i++) {
      const isFilled = i < filled;
      drops.push(
        <span key={i} className={`material-symbols-outlined ${styles.hungerDroplet} ${isFilled ? styles.active : ''}`}>
          water_drop
        </span>
      );
    }
    return (
      <div className={styles.trackerContainer}>
        <div className={styles.trackerLabel}>
          <span>{label}</span>
          <span className={styles.trackerVal}>{val} / {max}</span>
        </div>
        <div className={styles.hungerDropletsRow}>{drops}</div>
      </div>
    );
  }

  const boxes = [];
  for (let i = 0; i < max; i++) {
    let content = '';
    let isFilled = false;

    if (agg > 0 || sup > 0) {
      if (i < agg) content = 'X';
      else if (i < agg + sup) content = '/';
    } else {
      if (i < filled) isFilled = true;
      if (i >= max - stains) content = '/';
    }

    let extraClass = '';
    if (content === 'X') extraClass = styles.aggravated;
    else if (content === '/') extraClass = styles.superficial;
    else if (isFilled) extraClass = styles.filled;

    let boxTitle = undefined;
    if (label === 'Health') {
      if (content === '/') boxTitle = SUPERFICIAL_DESC;
      else if (content === 'X') boxTitle = AGGRAVATED_DESC;
    } else if (label === 'Willpower') {
      if (content === '/') boxTitle = WILLPOWER_SUPERFICIAL_DESC;
      else if (content === 'X') boxTitle = WILLPOWER_AGGRAVATED_DESC;
    }

    boxes.push(
      <div
        key={i}
        className={`${styles.trackerSquare} ${isFilled ? styles.filled : ''} ${extraClass}`}
        title={boxTitle}
      >
        {content}
      </div>
    );
  }
  return (
    <div className={styles.trackerContainer}>
      <div className={styles.trackerLabel}>
        <span>{label}</span>
        <span className={styles.trackerVal}>{val}</span>
      </div>
      <div className={styles.trackerBoxesRow}>{boxes}</div>
    </div>
  );
}
