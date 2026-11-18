const fs = require('fs');
const nameToSource = JSON.parse(fs.readFileSync('nameToSource.json', 'utf8'));

let js = fs.readFileSync('src/data/merits_flaws.js', 'utf8');
let replaced = 0;

for (const [name, source] of Object.entries(nameToSource)) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match name, then any chars up to description, then the quote, then inner, then quote
    const regex = new RegExp(`(name:\\s*['"]${escapedName}['"][\\s\\S]*?description:\\s*(['"\`]))([\\s\\S]*?)(\\2)`, 'g');
    
    js = js.replace(regex, (match, p1, quote, inner, closingQuote) => {
        if (!inner.includes('Source:')) {
            replaced++;
            return p1 + inner + ` (Source: ${source})` + closingQuote;
        }
        return match;
    });
}

fs.writeFileSync('src/data/merits_flaws.js', js);
console.log('Replaced ' + replaced + ' descriptions with source references.');