// src/utils/xpCosts.js

/** Cost for a new attribute dot. */
export const calculateAttributeCost = (newLevel) => newLevel * 5;

/** Cost for a new skill dot. */
export const calculateSkillCost = (newLevel) => newLevel * 3;

/** Cost for a new specialty. */
export const calculateSpecialtyCost = () => 3;

/** Cost for a new discipline dot. */
export const calculateDisciplineCost = (newLevel, kind = 'clan') => {
  if (kind === 'other') return newLevel * 7;
  if (kind === 'caitiff') return newLevel * 6;
  return newLevel * 5; // Default to 'clan'
};

/** Cost for a new Blood Sorcery Ritual or Oblivion Ceremony. */
export const calculateRitualCost = (level) => level * 3;

/** Cost for new dots in an Advantage (Merit/Background). */
export const calculateAdvantageCost = (dots) => dots * 3;

/** Cost for a new level of Blood Potency. */
export const calculateBloodPotencyCost = (newLevel) => newLevel * 10;
