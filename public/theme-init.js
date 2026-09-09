/* Pre-paint theme bootstrap.
 *
 * The app's theme engine (src/core/ThemeContext.jsx) only runs once React has
 * mounted. Without this file, every cold load — and every deep link to a
 * non-home route — would paint one frame with the default Camarilla crimson
 * palette before the saved theme took over, a visible flash.
 *
 * Kept as an external same-origin file (not inline) because index.html ships a
 * strict CSP with no 'unsafe-inline' in script-src — same rationale as
 * analytics-init.js. Must run in <head>, before the app bundle.
 *
 * Keep THEMES in sync with ThemeContext.jsx / back/routes/auth.js.
 */
(function () {
  try {
    var THEMES = ['clan', 'camarilla', 'schrecknet', 'anarch', 'Giannakis'];
    var theme = localStorage.getItem('vtm_theme');
    if (THEMES.indexOf(theme) === -1) theme = 'clan';

    var root = document.documentElement;
    root.setAttribute('data-theme', theme);

    if (theme === 'clan') {
      // Last known bloodline tint, cached by ThemeContext after the character
      // loads. Absent on a first-ever visit — the CSS falls back to crimson.
      var tint = localStorage.getItem('vtm_clan_tint');
      if (tint && /^#[0-9a-fA-F]{3,8}$/.test(tint)) {
        root.style.setProperty('--tint', tint);
      }
    }
  } catch (e) {
    /* private-mode / storage disabled — the CSS defaults are fine */
  }
})();
