// src/components/admin/AdminDiceLogsTab.jsx
import React, { useEffect, useState, useCallback } from "react";
import styles from '../../styles/AdminDiceLogsTab.module.css';
import api from '../../api'; // Import the central api module

const IMG = {
  normal: (v) => `/img/dice/normal-${v}.png`,
  hunger: (v) => `/img/dice/hunger-${v}.png`,
};

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
      setErr(e.response?.data?.error || e.message || "Failed to load rolls");
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
          <span>Auto-refresh (5s)</span>
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

          let art = "/img/dice/Success.png";
          let resultType = "success";
          if (messyCritical && metDifficulty) {
            art = "/img/dice/MessyCrit.png";
            resultType = "messy";
          } else if (hasCritical && metDifficulty) {
            art = "/img/dice/Crit.png";
            resultType = "critical";
          } else if (bestialFailure) {
            art = "/img/dice/BestialFail.png";
            resultType = "bestial";
          } else if (!metDifficulty) {
            art = "/img/dice/BestialFail.png";
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
                style={{ background: 'white' }}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <div className={styles.rollContent}>
                <div className={styles.rollHeader}>
                  <div className={styles.rollUser}>
                    <strong>{r.char_name || r.user_name || "Unknown"}</strong>
                    <span className={styles.subtle}>· {when.toLocaleString()}</span>
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
                  <DiceStrip title="Normal Dice" values={normal} img={IMG.normal} />
                  <DiceStrip title="Hunger Dice" values={hunger} img={IMG.hunger} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DiceStrip({ title, values, img }) {
  if (!values || !values.length) return null;
  return (
    <div className={styles.diceStrip}>
      <div className={styles.diceTitle}>{title} ({values.length})</div>
      <div className={styles.diceContainer}>
        {values.map((v, i) => (
          <img
            key={i}
            src={img(v)}
            alt={String(v)}
            className={styles.die}
            onError={(e) => {
              e.currentTarget.outerHTML =
                `<div class="${styles.dieFallback}">${v}</div>`;
            }}
          />
        ))}
      </div>
    </div>
  );
}