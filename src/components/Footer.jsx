import React from "react";
import styles from "../styles/Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <small>
        Erebus Portal made by{" "}
        <a href="https://miketsak.gr" target="_blank" rel="noreferrer">
          MikeTsak
        </a>{" "}
        for the Athens Thought-Time LARP © {new Date().getFullYear()} — Powered by{" "}
        <a href="https://cerebralproductions.eu/" target="_blank" rel="noreferrer">
          Cerebral Productions
        </a>
      </small>
    </footer>
  );
}