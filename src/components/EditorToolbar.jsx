import React from 'react';
import styles from '../styles/News.module.css';

// Rich-text toolbar for the news editors (create and edit). onCmd(command, value) runs a
// document.execCommand on the focused contentEditable. Buttons keep the editor's selection
// (mousedown is cancelled) and scroll sideways on narrow screens.
const TOOLS = [
  { cmd: 'bold', icon: 'format_bold', label: 'Bold' },
  { cmd: 'italic', icon: 'format_italic', label: 'Italic' },
  { cmd: 'underline', icon: 'format_underlined', label: 'Underline' },
  { sep: true },
  { cmd: 'formatBlock', value: '<h2>', icon: 'title', label: 'Heading' },
  { cmd: 'formatBlock', value: '<h3>', icon: 'text_fields', label: 'Subheading' },
  { cmd: 'formatBlock', value: '<p>', icon: 'notes', label: 'Normal text' },
  { sep: true },
  { cmd: 'insertUnorderedList', icon: 'format_list_bulleted', label: 'Bulleted list' },
  { cmd: 'insertOrderedList', icon: 'format_list_numbered', label: 'Numbered list' },
  { cmd: 'formatBlock', value: '<blockquote>', icon: 'format_quote', label: 'Quote' },
  { cmd: 'createLink', icon: 'link', label: 'Link' },
  { cmd: 'removeFormat', icon: 'format_clear', label: 'Clear formatting' },
  { sep: true },
  { cmd: 'undo', icon: 'undo', label: 'Undo' },
  { cmd: 'redo', icon: 'redo', label: 'Redo' },
];

export default function EditorToolbar({ onCmd }) {
  const run = (t) => {
    if (t.cmd === 'createLink') {
      const url = window.prompt('Link address (https://...)');
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) return;
      onCmd('createLink', url);
      return;
    }
    onCmd(t.cmd, t.value);
  };
  return (
    <div className={styles.editorToolbar} role="toolbar" aria-label="Formatting">
      {TOOLS.map((t, i) => (t.sep
        ? <span key={i} className={styles.editorSep} aria-hidden="true" />
        : (
          <button key={i} type="button" title={t.label} aria-label={t.label}
            onMouseDown={(e) => e.preventDefault()} onClick={() => run(t)}>
            <span className="material-symbols-outlined">{t.icon}</span>
          </button>
        )))}
    </div>
  );
}
