const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'rituals.js');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace all occurrences of "Where the Shroud Thins" with "Where the Veil Thins"
content = content.replace(/Where the Shroud Thins/g, 'Where the Veil Thins');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Replaced Where the Shroud Thins with Where the Veil Thins in rituals.js');
