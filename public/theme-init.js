/* Pre-paint theme bootstrap.
 *
 * The app's theme engine (src/core/ThemeContext.jsx) only runs once React has
 * mounted. Without this file, every cold load (and every deep link to a
 * non-home route) would paint one frame with the default Camarilla crimson
 * palette before the saved theme took over, a visible flash.
 *
 * Kept as an external same-origin file (not inline) because index.html ships a
 * strict CSP with no 'unsafe-inline' in script-src, same rationale as
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

    var boxMode = localStorage.getItem('vtm_box_mode');
    if (boxMode !== 'glass' && boxMode !== 'illuminated') boxMode = 'illuminated';
    root.setAttribute('data-box-mode', boxMode);

    if (theme === 'clan') {
      var clanName = localStorage.getItem('vtm_clan_name');
      if (clanName) {
        root.setAttribute('data-clan', clanName.toLowerCase().replace(/\s+/g, '_'));
      }
      // Last known bloodline tint, cached by ThemeContext after the character
      // loads. Absent on a first-ever visit : the CSS falls back to crimson.
      var tint = localStorage.getItem('vtm_clan_tint');
      if (tint && /^#[0-9a-fA-F]{3,8}$/.test(tint)) {
        root.style.setProperty('--tint', tint);
      }

      var paletteRaw = localStorage.getItem('vtm_clan_palette');
      if (paletteRaw) {
        try {
          var pal = JSON.parse(paletteRaw);
          if (Array.isArray(pal)) {
            for (var i = 0; i < pal.length; i++) {
              root.style.setProperty('--clan-color-' + (i + 1), pal[i]);
            }
          }
        } catch (e) {}
      }

      var rulesRaw = localStorage.getItem('vtm_clan_rules');
      if (rulesRaw) {
        try {
          var rules = JSON.parse(rulesRaw);
          if (rules.symbolColor) root.style.setProperty('--clan-symbol-color', rules.symbolColor);
          if (rules.textColor) {
            root.style.setProperty('--clan-text-logo-color', rules.textColor);
            root.style.setProperty('--clan-text', rules.textColor);
            root.style.setProperty('--text-color', rules.textColor);
            root.style.setProperty('--theme-on-surface', rules.textColor);
          }
          if (rules.textMuted) {
            root.style.setProperty('--clan-text-muted', rules.textMuted);
            root.style.setProperty('--text-muted', rules.textMuted);
            root.style.setProperty('--theme-on-surface-variant', rules.textMuted);
          }
          if (rules.primaryAccent) {
            root.style.setProperty('--clan-primary', rules.primaryAccent);
            root.style.setProperty('--theme-primary', rules.primaryAccent);
            root.style.setProperty('--tint', rules.primaryAccent);
            root.style.setProperty('--dynamic-tint', rules.primaryAccent);
          }
          if (rules.secondaryAccent) {
            root.style.setProperty('--clan-secondary', rules.secondaryAccent);
            root.style.setProperty('--theme-secondary', rules.secondaryAccent);
          }
          if (rules.border) {
            root.style.setProperty('--clan-border', rules.border);
            root.style.setProperty('--border-color', rules.border);
            root.style.setProperty('--theme-outline', rules.border);
          }
          if (rules.surface) {
            root.style.setProperty('--clan-surface', rules.surface);
            root.style.setProperty('--surface-color', rules.surface);
            root.style.setProperty('--theme-surface-container', rules.surface);
          }
          if (rules.bg) {
            root.style.setProperty('--clan-bg', rules.bg);
            root.style.setProperty('--bg-color', rules.bg);
            root.style.setProperty('--theme-background', rules.bg);
          }
          if (rules.boxLight) root.style.setProperty('--clan-box-light', rules.boxLight);
          if (rules.boxBorder) root.style.setProperty('--clan-box-border', rules.boxBorder);
          if (rules.boxInk) root.style.setProperty('--clan-box-ink', rules.boxInk);
        } catch (e) {}
      }

      var bgUrl = localStorage.getItem('vtm_clan_bg');
      if (bgUrl) {
        root.style.setProperty('--clan-bg-image', "url('" + bgUrl + "')");
        root.style.setProperty('--clan-bg-opacity', '0.45');
      }
    }
  } catch (e) {
    /* private mode / storage disabled: the CSS defaults are fine */
  }
})();
