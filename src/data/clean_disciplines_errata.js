const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'disciplines.js');
let content = fs.readFileSync(filePath, 'utf-8');

// We want to remove ' (Errata)' from name: '...', name: "...", and prerequisite: '...', prerequisite: "..."
// We'll use regex to replace it.

content = content.replace(/(name\s*:\s*['"][^'"]*?)\s*\(Errata\)(['"])/gi, '$1$2');
content = content.replace(/(prerequisite\s*:\s*['"][^'"]*?)\s*\(Errata\)(['"])/gi, '$1$2');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Cleaned (Errata) from name and prerequisite fields in disciplines.js');
