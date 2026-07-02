const fs = require('fs');

const html = fs.readFileSync('c:/Users/mixan/Downloads/Advantages and Flaws - VTM Wiki.html', 'utf8');

const refMap = {};
const refRegex = /<li id="cite_note-(\d+)">[\s\S]*?<span class="reference-text">(.*?)<\/span><\/li>/g;
let match;
while ((match = refRegex.exec(html)) !== null) {
  const num = match[1];
  const rawText = match[2].replace(/<[^>]*>/g, '').trim();
  refMap[num] = rawText;
}

console.log('Found ' + Object.keys(refMap).length + ' references.');
for(let i=1; i<=5; i++) {
  console.log('[' + i + '] = ' + refMap[i]);
}

const jsFile = 'x:/Projects/Vampire Platform/front/src/data/merits_flaws.js';
let jsContent = fs.readFileSync(jsFile, 'utf8');

jsContent = jsContent.replace(/\[(\d+)\]/g, (match, p1) => {
  if (refMap[p1]) {
    return ' (Source: ' + refMap[p1] + ')';
  }
  return match;
});

fs.writeFileSync(jsFile, jsContent);
console.log('Updated merits_flaws.js');
