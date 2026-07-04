const fs = require('fs');
let content = fs.readFileSync('Home.jsx', 'utf8');

const target = "typeof ch.sheet === 'string' ? JSON.  return (";
const replacement = `typeof ch.sheet === 'string' ? JSON.parse(ch.sheet) : (ch.sheet || {});
  } catch (_) {
    // ignore parse error
  }

  // Construct Themes Array dynamically to insert Character's Clan
  const availableThemes = [
    { id: 'clan', label: clan ? \`\${clan}\` : 'Default', sub: 'Bloodline', hex: dynamicClanTint },
    { id: 'camarilla', label: 'Camarilla', sub: 'Crimson', hex: '#8a0f1a' },
    { id: 'schrecknet',  label: 'SchreckNet', sub: 'Blue', hex: '#0ea5e9' },
    { id: 'anarch',      label: 'Anarch', sub: 'Gold', hex: '#ea580c' },
    { id: 'Giannakis',      label: 'Giannakis', sub: 'Teal', hex: '#0d9488' },
  ];

  return (`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('Home.jsx', content);
  console.log('Fixed themes array missing block!');
} else {
  console.log('Target string not found in Home.jsx');
}
