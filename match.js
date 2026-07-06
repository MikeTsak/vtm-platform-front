const fs = require('fs');
const code = fs.readFileSync('src/components/ChatSystem.jsx', 'utf8');

const jsxTags = [...code.matchAll(/<\/?([a-zA-Z0-9]+)[^>]*>/g)];
let stack = [];

for (const match of jsxTags) {
  const tagStr = match[0];
  const tagName = match[1];

  // Skip self-closing tags
  if (tagStr.endsWith('/>')) continue;
  // Skip explicitly excluded void elements
  if (['img', 'input', 'br', 'hr', 'source'].includes(tagName)) continue;

  if (tagStr.startsWith('</')) {
    if (stack.length && stack[stack.length - 1].tagName === tagName) {
      stack.pop();
    } else {
      console.log(`Unmatched closing tag ${tagName} at index ${match.index}. Stack top: ${stack.length ? stack[stack.length-1].tagName : 'empty'}`);
      // stack.pop() anyway to try to recover or just ignore?
    }
  } else {
    stack.push({ tagName, index: match.index });
  }
}

console.log('Remaining in stack:', stack.map(s => s.tagName));
