// Checks that every tool's copy of songspec.js matches this one byte for byte.
// Run from a folder holding all the repos side by side: node toolsmenu/songspec/check-copies.js
const fs = require('fs');
const path = require('path');
const COPIES = {
  'gp-blueprint': 'src/songspec.js',
  lyricpad: 'js/songspec.js',
  ideawizard: 'songspec.js',
  earprint: 'songspec.js',
  'auralyrics-studio': 'songspec.js',
  framecut: 'src/songspec.js',
  'gp-producer': 'src/vendor/songspec.js',
};
const root = path.resolve(__dirname, '..', '..');
const canon = fs.readFileSync(path.join(__dirname, 'songspec.js'));
let bad = 0;
for (const [repo, file] of Object.entries(COPIES)) {
  const p = path.join(root, repo, file);
  if (!fs.existsSync(path.join(root, repo))) { console.log(`skip     ${repo} (not checked out)`); continue; }
  if (!fs.existsSync(p)) { console.log(`missing  ${repo}/${file}`); bad++; continue; }
  const same = fs.readFileSync(p).equals(canon);
  console.log(`${same ? 'same    ' : 'DIFFERS '} ${repo}/${file}`);
  if (!same) bad++;
}
process.exit(bad ? 1 : 0);
