const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'styles', 'CharacterView.module.css');
const content = fs.readFileSync(cssPath, 'utf-8');
const lines = content.split('\n');

// Fix 1: Revert root padding (lines 37-38, 0-indexed 36-37)
// Find and replace padding-top: 180px back to normal
let result = content;

// Revert root padding
result = result.replace(
    /padding: 1rem;\s*\n\s*padding-top: 180px;[^\n]*/,
    'padding: 1rem;'
);
result = result.replace(
    /padding: 180px 2rem 2rem 2rem;[^\n]*/,
    'padding: 1rem 2rem 2rem 2rem;'
);

// Revert topAppBar from fixed back to sticky
result = result.replace(
    /\.topAppBar \{\s*\n\s*position: fixed;\s*\n\s*top: 54px;[^}]*border-bottom: 1px solid var\(--border-color\);\s*\n\s*box-shadow:[^}]*\}/s,
    `.topAppBar {
  position: sticky;
  top: 65px;
  z-index: 50;
  width: 100%;
  background: var(--surface-highest);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  margin-bottom: 1.5rem;
}`
);

// Revert topAppBar media query - add margin-bottom: 0 back
result = result.replace(
    /@media \(min-width: 768px\) \{\s*\n\s*\.topAppBar \{\s*\n\s*grid-column: 1 \/ -1;\s*\n\s*\}\s*\n\}/,
    `@media (min-width: 768px) {
  .topAppBar {
    grid-column: 1 / -1;
    margin-bottom: 0;
  }
}`
);

// Revert vitalsPane top
result = result.replace(
    /\.vitalsPane \{\s*\n\s*position: sticky;\s*\n\s*top: 180px;/,
    `.vitalsPane {
  position: sticky;
  top: 150px;`
);

// Revert desktopNav from fixed back to sticky
result = result.replace(
    /position: fixed;\s*\n\s*top: 180px;\s*\n\s*left: 2rem;\s*\n\s*width: 80px;\s*\n\s*height: calc\(100vh - 200px\);/,
    `position: sticky;
    top: 150px;
    height: calc(100vh - 180px);
    width: 100%;`
);

fs.writeFileSync(cssPath, result, 'utf-8');
console.log('CSS reverted successfully!');
