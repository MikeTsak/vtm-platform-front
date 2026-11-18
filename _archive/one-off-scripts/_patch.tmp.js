// Tiny exact-string patcher: node _patch.tmp.js <patchfile.js>
// patchfile exports [{ file, edits: [[old, new], ...] }]
const fs = require('fs');
const path = require('path');
const patches = require(path.resolve(process.argv[2]));
for (const { file, edits } of patches) {
  const p = path.resolve(file);
  let src = fs.readFileSync(p, 'utf8');
  for (const [oldStr, newStr] of edits) {
    const idx = src.indexOf(oldStr);
    if (idx < 0) throw new Error(`[${file}] not found:\n${oldStr}`);
    if (src.indexOf(oldStr, idx + 1) >= 0) throw new Error(`[${file}] ambiguous (multiple matches):\n${oldStr}`);
    src = src.slice(0, idx) + newStr + src.slice(idx + oldStr.length);
  }
  fs.writeFileSync(p, src);
  console.log(`patched ${file} (${edits.length} edits)`);
}
