import React from 'react';
import styles from '../styles/News.module.css';

export default function EditorToolbar({ onCmd }) {
  return (
    <div className={styles.editorToolbar}>
      <button type="button" onClick={() => onCmd('bold')}>
        <b>B</b>
      </button>
      <button type="button" onClick={() => onCmd('italic')}>
        <i>I</i>
      </button>
      <button type="button" onClick={() => onCmd('underline')}>
        <u>U</u>
      </button>
    </div>
  );
}