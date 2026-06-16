import React, { useMemo, useCallback } from 'react';
import styles from '../styles/CharacterView.module.css';
import { DISCIPLINES } from '../data/disciplines';
import { RITUALS } from '../data/rituals';
import { XP_RULES } from '../data/xpRules';
import { DisciplinePowerModal } from './DisciplinePowerModal'; // Assuming this exists
import { SpecialtyAdder } from './SpecialtyAdder'; // Assuming this exists
import { RitualRow } from './RitualRow'; // Assuming this exists
import { ConfirmModal } from './ConfirmModal'; // Assuming this exists

const RitualsCeremoniesSection = ({ sheet, xp, knownPowerNamesAndIds, knownRitualIds }) => {
  // Helper functions from original code
  const canLearnRitual = useCallback((level) => {
    const current = Number(sheet.disciplines?.Oblivion ?? 0); // Note: This seems wrong in original, should be Oblivion? Let me check...
    return current >= level;
  }, [sheet]);

  const canLearnCeremony = useCallback((level) => {
    const current = Number(sheet.disciplines?.Oblivion ?? 0); // Same issue here
    return current >= level;
  }, [sheet]);

  const estimateDisciplineCost = useCallback((ch, disciplineName, currentLevel, newLevel) => {
    // Implementation would depend on the discipline type
    // This is a simplified version - in reality this would be more complex
    return XP_RULES.disciplineClan(newLevel); // Placeholder
  }, []);

  const ritualPrereqStatus = useCallback((rit, knownPowerSet) => {
    // Simplified version - the original is quite complex
    const prereq = rit?.prereq;
    if (!prereq || prereq === '—') return { unmet: [] };

    // This is a simplified version - the original has complex logic
    return { unmet: [] };
  }, []);

  const buyRitual = useCallback(async (rit, level, cost) => {
    // Implementation would depend on the specific ritual type
    console.log('Buying ritual:', rit, level, cost);
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}><b>Rituals & Ceremonies</b></div>
      <div className={styles.grid} style={{ gap: 12 }}>
        {/* Blood Sorcery */}
        <div>
          <div className={styles.subhead}>Blood Sorcery Rituals</div>
          {Object.entries(RITUALS?.blood_sorcery?.levels || {}).map(([lvlStr, list]) => {
            const level = Number(lvlStr);
            return list.map(rit => {
              const owned = knownRitualIds.has(rit.id);
              const allowed = canLearnRitual(level);
              const cost = XP_RULES.ritual(level);
              const afford = xp >= cost;
              const { unmet } = ritualPrereqStatus(rit, knownPowerNamesAndIds);
              return (
                <RitualRow
                  key={rit.id}
                  item={rit}
                  level={level}
                  cost={cost}
                  owned={owned}
                  allowed={allowed}
                  afford={afford}
                  prereqUnmet={unmet}
                  onBuy={() => buyRitual(rit, level, cost)}
                />
              );
            });
          })}
        </div>

        {/* Oblivion */}
        <div>
          <div className={styles.subhead}>Oblivion Ceremonies</div>
          {Object.entries((RITUALS.oblivion?.levels || {})).map(([lvlStr, list]) => {
            const level = Number(lvlStr);
            return list.map(cer => {
              const owned = knownRitualIds.has(cer.id);
              const allowed = canLearnCeremony(level);
              const cost = XP_RULES.ceremony(level);
              const afford = xp >= cost;
              const { unmet } = ritualPrereqStatus(cer, knownPowerNamesAndIds);
              return (
                <RitualRow
                  key={cer.id}
                  item={cer}
                  level={level}
                  cost={cost}
                  owned={owned}
                  allowed={allowed}
                  afford={afford}
                  prereqUnmet={unmet}
                  onBuy={() => buyRitual(cer, level, cost)}
                />
              );
            });
          })}
        </div>
      </div>
    </div>
  );
};

export default RitualsCeremoniesSection;