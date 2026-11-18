const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');
files.push('index.html'); // include index.html just in case

let icons = new Set();
// A robust regex to find the content of material-symbols-outlined spans
const regex1 = /className=(?:\{['"`]|['"`]).*?material-symbols-outlined.*?(?:['"`]\}|['"`])[^>]*>([^<]+)<\/span>/g;
const regex2 = /class=(?:\{['"`]|['"`]).*?material-symbols-outlined.*?(?:['"`]\}|['"`])[^>]*>([^<]+)<\/span>/g;

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = regex1.exec(content)) !== null) {
    icons.add(match[1].trim());
  }
  while ((match = regex2.exec(content)) !== null) {
    icons.add(match[1].trim());
  }
});

const result = Array.from(icons).sort().filter(x => x && !x.includes('{') && !x.includes('}')).join(',');
console.log(result);
