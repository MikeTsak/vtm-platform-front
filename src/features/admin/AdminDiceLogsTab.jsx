// src/components/admin/AdminDiceLogsTab.jsx
import React, { useEffect, useState, useCallback } from "react";
import styles from '../../styles/AdminDiceLogsTab.module.css';
import api, { formatApiError } from '../../core/api'; // Import the central api module
import { formatEuDate } from '../../utils/dateFormatter';
import D10Die from '../../ui/D10Die';

export default function AdminDiceLogsTab() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rolls, setRolls] = useState([]);
  const [auto, setAuto] = useState(false);

  // --- MODIFIED: Use api.get and remove token dependency ---
  const fetchRolls = useCallback(async () => {
    setLoading(true);
    if (!auto) setErr(""); // Only clear error on manual refresh
    try {
      // Use the central 'api' (axios) instance
      // The path should NOT include /api/, as the api module adds it
      const res = await api.get('/admin/dice/rolls?limit=200');
      
      // Axios puts the data in res.data
      setRolls(res.data.rolls || []);
    } catch (e) {
      // Axios error handling is different
      setErr(formatApiError(e, "Failed to load rolls"));
    } finally {
      setLoading(false);
    }
  }, [auto]); // Removed 'token' from dependencies

  // --- MODIFIED: Added fetchRolls to dependency array ---
  useEffect(() => { 
    fetchRolls();
  }, [fetchRolls]); // Run once on mount (when fetchRolls is created)

  // --- MODIFIED: Added fetchRolls to dependency array ---
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(fetchRolls, 5000);
    return () => clearInterval(id);
  }, [auto, fetchRolls]); // Now correctly includes fetchRolls

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <button
          onClick={fetchRolls}
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={loading}
        >
          {loading && !auto ? (
            <>
              <span className={styles.spinner} /> Loading...
            </>
          ) : (
            "Refresh Logs"
          )}
        </button>
        <label className={styles.customCheckbox}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          <span className={styles.checkmark}></span>
          <span>Auto refresh (5s)</span>
        </label>
        {err && <span className={styles.error}>{err}</span>}
      </div>

      <div className={styles.logList}>
        {rolls.map((r) => {
          let res = r.results_json ?? r.results ?? {};
          try {
            if (typeof res === "string") res = JSON.parse(res);
          } catch {
            res = {};
          }

          const normal = Array.isArray(res.normal) ? res.normal : Array.isArray(r.normal) ? r.normal : [];
          const hunger = Array.isArray(res.hunger) ? res.hunger : Array.isArray(r.hunger) ? r.hunger : [];

          const successes = Number(r.successes ?? 0);
          const critPairs = Number(r.crit_pairs ?? 0);
          const hasCritical = critPairs > 0;

          const messyCritical = Boolean(r.messy_crit);
          const bestialFailure = Boolean(r.bestial_failure);

          const diff = Number(res.difficulty ?? r.difficulty ?? 0) || 0;
          const metDifficulty = diff > 0 ? successes >= diff : successes > 0;

          let art = "/img/dice/d10/Dice_Regular_Success.webp";
          let resultType = "success";
          if (messyCritical && metDifficulty) {
            art = "/img/dice/d10/Dice_Hunger_MessyCritical.webp";
            resultType = "messy";
          } else if (hasCritical && metDifficulty) {
            art = "/img/dice/d10/Dice_Regular_Critical.webp";
            resultType = "critical";
          } else if (bestialFailure) {
            art = "/img/dice/d10/Dice_Hunger_BestialFailure.webp";
            resultType = "bestial";
          } else if (!metDifficulty) {
            art = "/img/dice/d10/Dice_Regular_Failure.webp";
            resultType = "failure";
          }

          const when = new Date(r.created_at || r.createdAt || r.when || Date.now());

          return (
            <div
              key={r.id}
              className={styles.rollCard}
              data-result={resultType}
            >
              <img
                src={art}
                alt={resultType}
                className={styles.resultIcon}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <div className={styles.rollContent}>
                <div className={styles.rollHeader}>
                  <div className={styles.rollUser}>
                    <strong>{r.char_name || r.user_name || "Unknown"}</strong>
                    <span className={styles.subtle}>· {formatEuDate(when)}</span>
                  </div>
                  <div className={styles.rollSuccesses} data-result={resultType}>
                    {successes} Successes
                    {diff ? ` / Diff ${diff}` : ""}
                  </div>
                </div>

                {r.note && (
                  <div className={styles.rollNote}>
                    “{r.note}”
                  </div>
                )}

                <div className={styles.diceArea}>
                  <DiceStrip title="Normal Dice" values={normal} isHunger={false} />
                  <DiceStrip title="Hunger Dice" values={hunger} isHunger={true} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DiceStrip({ title, values, isHunger = false }) {
  if (!values || !values.length) return null;
  return (
    <div className={styles.diceStrip}>
      <div className={styles.diceTitle}>{title} ({values.length})</div>
      <div className={styles.diceContainer} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {values.map((v, i) => (
          <D10Die key={i} value={v} isHunger={isHunger} size="sm" showNumber />
        ))}
      </div>
    </div>
  );
}