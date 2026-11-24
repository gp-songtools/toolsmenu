// Checks that every tool's copy of songspec.js matches this one byte for byte, and any copy of songdrive.js
// (next to songspec.js; a tool without one prints "not used yet").
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
  'gp-master': 'songspec.js',
  'gp-producer': 'src/vendor/songspec.js',
};
const root = path.resolve(__dirname, '..', '..');
const canon = fs.readFileSync(path.join(__dirname, 'songspec.js'));
const canonDrive = fs.readFileSync(path.join(__dirname, 'songdrive.js'));
let bad = 0;
for (const [repo, file] of Object.entries(COPIES)) {
  const p = path.join(root, repo, file);
  if (!fs.existsSync(path.join(root, repo))) { console.log(`skip     ${repo} (not checked out)`); continue; }
  if (!fs.existsSync(p)) { console.log(`missing  ${repo}/${file}`); bad++; continue; }
  const same = fs.readFileSync(p).equals(canon);
  console.log(`${same ? 'same    ' : 'DIFFERS '} ${repo}/${file}`);
  if (!same) bad++;
  const d = path.join(root, repo, path.dirname(file), 'songdrive.js');
  if (!fs.existsSync(d)) { console.log(`not used yet  ${repo}/${path.join(path.dirname(file), 'songdrive.js')}`); continue; }
  const dsame = fs.readFileSync(d).equals(canonDrive);
  console.log(`${dsame ? 'same    ' : 'DIFFERS '} ${path.relative(root, d)}`);
  if (!dsame) bad++;
}
process.exit(bad ? 1 : 0);
