'use strict';
// Dependency-free tests for songspec.js. Run: node test.js
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const S = require('./songspec.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok - ' + name); }
  catch (e) { failed++; console.log('FAIL - ' + name + '\n    ' + String(e && e.message || e).split('\n').join('\n    ')); }
}

const EXAMPLE = fs.readFileSync(path.join(__dirname, 'example.songspec.md'), 'utf8');
const GB = { by: 'gp-blueprint' }, LP = { by: 'lyricpad' }, IW = { by: 'ideawizard' }, EP = { by: 'earprint' };
const rt = (t) => assert.strictEqual(S.serialize(S.parse(t)), t);
const rawSecs = (doc) => doc.sections.map((s) => s.head + s.lines.join(''));
const fmLines = (doc) => doc.fm.items.filter((x) => x.key !== 'bpm' && x.key !== 'title').map((x) => x.line);

// Build a spec text: fm = extra frontmatter lines, body = sections text.
const mk = (fm = '', body = '') => `---\nschema_version: 1\n${fm ? fm + '\n' : ''}---\n\n# Song spec\n\n${body}`;
const sec = (heading, body) => `## ${heading}\n${body}\n\n`;
const issues = (t) => S.validate(S.parse(t));
const errs = (t) => issues(t).filter((i) => i.level === 'error');
const warns = (t) => issues(t).filter((i) => i.level === 'warning');
function bad(t, field) { assert.ok(errs(t).some((i) => i.field === field), `expected error on ${field}; got ${JSON.stringify(issues(t))}`); }
function good(t) { assert.deepStrictEqual(errs(t), []); }
const TAGGED = '[Verse]\nla la la';

// ---------- 1. round trips ----------
test('round trip: example file', () => rt(EXAMPLE));
test('round trip: empty string', () => rt(''));
test('round trip: no frontmatter', () => rt('# Song spec\n\nhello\n\n## Notes\nx\n'));
test('round trip: CRLF', () => rt(EXAMPLE.replace(/\n/g, '\r\n')));
test('round trip: no trailing newline', () => rt(EXAMPLE.replace(/\n+$/, '')));
test('round trip: unknown keys and # comments', () => rt('---\nschema_version: 1\n# a comment\nfoo_bar: baz\n  weird indent\n---\n\n# Song spec\n'));
test('round trip: unknown sections', () => rt(mk('', '## Foo\nstuff\n\n## Notes\nx\n\n')));
test('round trip: ### subheadings', () => rt(mk('', '## Notes\n### Sub\nx\n#### deeper\n\n')));
test('round trip: unclosed frontmatter', () => rt('---\nschema_version: 1\ntitle: x\n\n## Notes\nhi\n'));
test('round trip: duplicate sections', () => rt(mk('', '## Style\na\n\n## Style\nb\n\n')));

// ---------- 2. preservation on write ----------
function preserve(doc, changedIdx) {
  const before = rawSecs(doc);
  return (after) => {
    const a = rawSecs(after);
    assert.strictEqual(a.length, before.length);
    a.forEach((r, i) => { if (!changedIdx.includes(i)) assert.strictEqual(r, before[i], 'section ' + i + ' changed'); });
  };
}
test('preserve: lyricpad writes lyrics + title', () => {
  const doc = S.parse(EXAMPLE), fmBefore = fmLines(doc);
  const li = doc.sections.findIndex((s) => s.id === 'lyrics');
  const check = preserve(doc, [li]);
  S.setSection(doc, 'lyrics', '[Verse]\nnew words', LP);
  S.setSetting(doc, 'title', 'New', LP);
  check(doc);
  assert.deepStrictEqual(fmLines(doc), fmBefore);
  assert.strictEqual(S.setting(doc, 'title'), 'New');
  assert.strictEqual(S.section(doc, 'lyrics').body, '[Verse]\nnew words');
});
test('preserve: gp-blueprint writes style + bpm', () => {
  const doc = S.parse(EXAMPLE), fmBefore = fmLines(doc);
  const si = doc.sections.findIndex((s) => s.id === 'style');
  const check = preserve(doc, [si]);
  S.setSection(doc, 'style', 'Synthwave, 120 BPM', GB);
  S.setSetting(doc, 'bpm', 120, GB);
  check(doc);
  assert.deepStrictEqual(fmLines(doc), fmBefore);
  assert.strictEqual(S.setting(doc, 'bpm'), '120');
});
test('preserve: unknown key and unknown section survive in place', () => {
  const t = EXAMPLE.replace('---\n\n# Song spec', 'x_custom: keep me\n---\n\n# Song spec').replace('## Style\n', '## My extra\nsome text\n\n## Style\n');
  const doc = S.parse(t);
  const extraIdx = doc.sections.findIndex((s) => s.heading === 'My extra');
  assert.ok(extraIdx > 0);
  const li = doc.sections.findIndex((s) => s.id === 'lyrics');
  const check = preserve(doc, [li]);
  const fmBefore = fmLines(doc);
  S.setSection(doc, 'lyrics', TAGGED, LP);
  S.setSetting(doc, 'title', 'Other', LP);
  check(doc);
  assert.deepStrictEqual(fmLines(doc), fmBefore);
  assert.strictEqual(S.setting(doc, 'x_custom'), 'keep me');
  assert.strictEqual(doc.sections[extraIdx].heading, 'My extra');
  assert.ok(S.serialize(doc).includes('x_custom: keep me\n'));
  rt(S.serialize(doc));
});

// ---------- 3. ownership ----------
test('ownership: sections', () => {
  assert.throws(() => S.setSection(S.parse(EXAMPLE), 'lyrics', 'x', GB));
  assert.throws(() => S.setSection(S.parse(EXAMPLE), 'structure', 'x', LP));
  for (const s of S.SECTIONS) assert.throws(() => S.setSection(S.parse(EXAMPLE), s.id, 'x', { by: 'auralyrics-studio' }), s.id);
  assert.throws(() => S.setSection(S.parse(EXAMPLE), 'nope', 'x', LP));
  assert.throws(() => S.setSection(S.parse(EXAMPLE), 'lyrics', 'x', {}));
});
test('ownership: settings', () => {
  for (const k of ['bpm', 'key', 'bpm_key_by']) {
    for (const by of ['gp-blueprint', 'earprint']) S.setSetting(S.parse(EXAMPLE), k, k === 'bpm' ? '100' : 'x', { by });
    assert.throws(() => S.setSetting(S.parse(EXAMPLE), k, '100', LP), k);
  }
  S.setSetting(S.parse(EXAMPLE), 'title', 'T', LP);
  for (const by of ['gp-blueprint', 'earprint', 'ideawizard']) assert.throws(() => S.setSetting(S.parse(EXAMPLE), 'title', 'T', { by }), by);
  assert.throws(() => S.setSetting(S.parse(EXAMPLE), 'model', 'v6', GB));
});

// ---------- 4. insertion order ----------
test('insertion lands in canonical order', () => {
  const doc = S.parse(S.create());
  S.setSection(doc, 'lyrics', TAGGED, LP);
  S.setSection(doc, 'idea', 'Title: x', IW);
  S.setSection(doc, 'structure', 'A', GB);
  assert.deepStrictEqual(doc.sections.map((s) => s.id), ['idea', 'structure', 'lyrics']);
  S.setSection(doc, 'notes', 'n', { by: 'person' });
  S.setSection(doc, 'style', 's', GB);
  assert.deepStrictEqual(doc.sections.map((s) => s.id), ['idea', 'style', 'structure', 'lyrics', 'notes']);
  rt(S.serialize(doc));
});
test('writing into empty string creates a valid spec', () => {
  const doc = S.parse('');
  S.setSection(doc, 'lyrics', TAGGED, LP);
  const out = S.serialize(doc);
  assert.ok(out.startsWith('---\n'));
  assert.ok(out.includes('schema_version: 1\n'));
  assert.ok(out.includes('# Song spec'));
  assert.deepStrictEqual(errs(out), []);
  assert.strictEqual(S.section(S.parse(out), 'lyrics').body, TAGGED);
});

// ---------- 5. section() ----------
test('section(): null for missing / empty', () => {
  const doc = S.parse(mk('', '## Style\n\n## Notes\n\n\n\n## Sound\n<!-- song-spec: by=person -->\n\n'));
  assert.strictEqual(S.section(doc, 'style'), null);
  assert.strictEqual(S.section(doc, 'notes'), null);
  assert.strictEqual(S.section(doc, 'sound'), null);
  assert.strictEqual(S.section(doc, 'lyrics'), null);
});
test('section(): body without marker, edited flags, manual', () => {
  const doc = S.parse(EXAMPLE);
  const st = S.section(doc, 'style');
  assert.ok(!st.body.includes('song-spec'));
  assert.ok(st.body.startsWith('Indie folk'));
  assert.strictEqual(st.by, 'gp-blueprint');
  const d2 = S.parse(mk('', ''));
  S.setSection(d2, 'lyrics', TAGGED, LP);
  assert.strictEqual(S.section(d2, 'lyrics').edited, false);
  const hand = S.parse(S.serialize(d2).replace('la la la', 'la la CHANGED'));
  assert.strictEqual(S.section(hand, 'lyrics').edited, true);
  assert.strictEqual(S.section(S.parse(mk('', sec('Notes', 'typed by hand'))), 'notes').edited, true);
  assert.strictEqual(S.section(doc, 'notes').manual, true);
  assert.strictEqual(S.section(d2, 'lyrics').manual, false);
});

// ---------- 6. confirmReason ----------
test('confirmReason()', () => {
  const doc = S.parse(S.create());
  S.setSection(doc, 'lyrics', TAGGED, LP);
  assert.strictEqual(S.confirmReason(doc, 'lyrics', 'lyricpad'), '');
  assert.strictEqual(S.confirmReason(doc, 'structure', 'gp-blueprint'), '');
  const hand = S.parse(S.serialize(doc).replace('la la la', 'edited'));
  assert.notStrictEqual(S.confirmReason(hand, 'lyrics', 'lyricpad'), '');
  assert.notStrictEqual(S.confirmReason(S.parse(EXAMPLE), 'notes', 'person'), '');
  assert.notStrictEqual(S.confirmReason(S.parse(mk('', sec('Lyrics', 'plain'))), 'lyrics', 'lyricpad'), '');
});

// ---------- 7. staleness ----------
test('staleness: changed and removed', () => {
  const doc = S.parse(S.create());
  S.setSection(doc, 'structure', 'Version A', GB);
  S.setSection(doc, 'idea-structure', 'Idea plan', { ...IW, from: ['structure'] });
  assert.deepStrictEqual(S.section(doc, 'idea-structure').stale, []);
  assert.strictEqual(S.validate(doc).filter((i) => i.level === 'warning' && i.field === 'idea-structure').length, 0);
  S.setSection(doc, 'structure', 'Version B', GB);
  assert.deepStrictEqual(S.section(doc, 'idea-structure').stale, [{ id: 'structure', reason: 'changed' }]);
  assert.ok(S.validate(doc).some((i) => i.level === 'warning' && i.field === 'idea-structure'));
  S.clearSection(doc, 'structure');
  assert.deepStrictEqual(S.section(doc, 'idea-structure').stale, [{ id: 'structure', reason: 'removed' }]);
});

// ---------- 8. pickStructure ----------
test('pickStructure: none / one', () => {
  assert.strictEqual(S.pickStructure(S.parse(S.create())).id, null);
  const a = S.parse(S.create()); S.setSection(a, 'structure', 'A', GB);
  assert.strictEqual(S.pickStructure(a).id, 'structure');
  const b = S.parse(S.create()); S.setSection(b, 'idea-structure', 'B', IW);
  assert.strictEqual(S.pickStructure(b).id, 'idea-structure');
});
test('pickStructure: newer wins when both fresh', () => {
  const d = S.parse(S.create());
  S.setSection(d, 'structure', 'A', { ...GB, at: '2026-01-01T10:00Z' });
  S.setSection(d, 'idea-structure', 'B', { ...IW, at: '2026-01-02T10:00Z' });
  assert.strictEqual(S.pickStructure(d).id, 'idea-structure');
  const e = S.parse(S.create());
  S.setSection(e, 'structure', 'A', { ...GB, at: '2026-01-03T10:00Z' });
  S.setSection(e, 'idea-structure', 'B', { ...IW, at: '2026-01-02T10:00Z' });
  assert.strictEqual(S.pickStructure(e).id, 'structure');
});
test('pickStructure: Blueprint rerun after Idea structure picks structure and notes it', () => {
  const d = S.parse(S.create());
  S.setSection(d, 'structure', 'A', { ...GB, at: '2026-01-01T10:00Z' });
  S.setSection(d, 'idea-structure', 'B', { ...IW, from: ['structure'], at: '2026-01-02T10:00Z' });
  S.setSection(d, 'structure', 'A2', { ...GB, at: '2026-01-03T10:00Z' });
  const p = S.pickStructure(d);
  assert.strictEqual(p.id, 'structure');
  assert.ok(/older/.test(p.note), p.note);
});
test('pickStructure: staleness against analysis does not count', () => {
  const d = S.parse(S.create());
  S.setSection(d, 'analysis', 'Earprint analysis v1', EP);
  S.setSection(d, 'idea-structure', 'B', { ...IW, at: '2026-01-01T10:00Z' });
  S.setSection(d, 'structure', 'A', { ...GB, from: ['analysis'], at: '2026-01-02T10:00Z' });
  S.setSection(d, 'analysis', 'Earprint analysis v2', EP);
  assert.deepStrictEqual(S.section(d, 'structure').stale, [{ id: 'analysis', reason: 'changed' }]);
  assert.strictEqual(S.pickStructure(d).id, 'structure');
});

// ---------- 9. newSong ----------
test('newSong keeps person settings and unknown keys', () => {
  const doc = S.parse(EXAMPLE.replace('---\n\n# Song spec', 'x_custom: keep me\n---\n\n# Song spec'));
  S.newSong(doc);
  for (const id of S.SECTIONS.map((s) => s.id)) assert.strictEqual(S.section(doc, id), null, id);
  for (const k of ['title', 'bpm', 'key', 'bpm_key_by']) assert.ok(!doc.fm.items.some((x) => x.key === k), k);
  assert.strictEqual(S.setting(doc, 'model'), 'v6');
  assert.strictEqual(S.setting(doc, 'weirdness'), '0.35');
  assert.strictEqual(S.setting(doc, 'x_custom'), 'keep me');
  assert.strictEqual(S.setting(doc, 'schema_version'), '1');
  rt(S.serialize(doc));
});

// ---------- 10. validator ----------
const rep = (c, n) => c.repeat(n);
test('valid example has no errors', () => assert.deepStrictEqual(errs(EXAMPLE), []));
test('rule: title length', () => { bad(mk('title: ' + rep('a', 257)), 'title'); good(mk('title: ' + rep('a', 256))); });
test('rule: style length (code points)', () => {
  bad(mk('', sec('Style', rep('a', 1001))), 'style'); good(mk('', sec('Style', rep('a', 1000))));
  good(mk('', sec('Style', rep('😀', 1000)))); bad(mk('', sec('Style', rep('😀', 1001))), 'style');
});
test('rule: negative-style length / needs style', () => {
  bad(mk('', sec('Style', 'x') + sec('Negative style', rep('a', 1001))), 'negative-style');
  good(mk('', sec('Style', 'x') + sec('Negative style', rep('a', 1000))));
  bad(mk('', sec('Negative style', 'no drums')), 'negative-style');
  good(mk('', sec('Style', 'x') + sec('Negative style', 'no drums')));
});
test('rule: lyrics length', () => { bad(mk('', sec('Lyrics', '[V]' + rep('a', 5000))), 'lyrics'); good(mk('', sec('Lyrics', '[V]' + rep('a', 4997)))); });
test('rule: sound length', () => { bad(mk('', sec('Sound', rep('a', 501))), 'sound'); good(mk('', sec('Sound', rep('a', 500)))); });
test('rule: 0-1 numbers', () => {
  for (const k of ['weirdness', 'style_influence']) {
    for (const v of ['1.5', '-0.1', 'abc', '2']) bad(mk(`${k}: ${v}`), k);
    for (const v of ['0', '0.5', '1']) good(mk(`${k}: ${v}`));
  }
  for (const v of ['1.5', '-0.1', 'abc']) bad(mk(`voice_id: v1\naudio_influence: ${v}`), 'audio_influence');
  good(mk('voice_id: v1\naudio_influence: 0.5'));
});
test('rule: variety', () => { for (const v of ['1.5', '5', '-1', 'x']) bad(mk('variety: ' + v), 'variety'); for (const v of ['0', '4']) good(mk('variety: ' + v)); });
test('rule: duration', () => { for (const v of ['14', '361', '90.5', 'x']) bad(mk('duration: ' + v), 'duration'); for (const v of ['15', '360']) good(mk('duration: ' + v)); });
test('rule: bpm', () => { for (const v of ['0', '301', '89.5', 'fast']) bad(mk('bpm: ' + v), 'bpm'); for (const v of ['1', '300', '89']) good(mk('bpm: ' + v)); });
test('rule: model / request / vocal_gender enums', () => {
  bad(mk('model: v5'), 'model'); for (const v of ['v6-mini', 'v6', 'v6-wild']) good(mk('model: ' + v));
  bad(mk('request: album'), 'request'); for (const v of ['song', 'cover']) good(mk(`request: ${v}\ncover_source: abc`));
  bad(mk('vocal_gender: other'), 'vocal_gender'); good(mk('vocal_gender: male')); good(mk('vocal_gender: female'));
});
test('rule: booleans', () => {
  for (const k of ['instrumental', 'loop', 'max_mode']) { bad(mk(`${k}: yes`), k); good(mk(`${k}: true`)); good(mk(`${k}: false`)); }
});
test('rule: vocal_gender with voice_id', () => { bad(mk('vocal_gender: male\nvoice_id: v1'), 'vocal_gender'); good(mk('voice_id: v1')); });
test('rule: audio_influence needs voice_id on a song', () => {
  bad(mk('audio_influence: 0.5'), 'audio_influence');
  bad(mk('request: song\naudio_influence: 0.5'), 'audio_influence');
  good(mk('request: cover\ncover_source: abc\naudio_influence: 0.5'));
  good(mk('voice_id: v1\naudio_influence: 0.5'));
});
test('rule: cover needs cover_source', () => { bad(mk('request: cover'), 'cover_source'); good(mk('request: cover\ncover_source: abc')); });
test('rule: sound request needs Sound section', () => { bad(mk('request: sound'), 'sound'); good(mk('request: sound', sec('Sound', 'rain'))); });
test('rule: instrumental with lyrics', () => {
  bad(mk('instrumental: true', sec('Lyrics', TAGGED)), 'lyrics');
  good(mk('instrumental: false', sec('Lyrics', TAGGED)));
  good(mk('instrumental: true'));
});
test('rule: schema_version', () => {
  bad('---\ntitle: x\n---\n\n# Song spec\n', 'schema_version');
  bad('---\nschema_version: 2\n---\n', 'schema_version');
  bad('# Song spec\n', 'schema_version');
});
test('rule: duplicate key / section', () => {
  bad(mk('bpm: 90\nbpm: 91'), 'bpm');
  bad(mk('', sec('Style', 'a') + sec('Style', 'b')), 'style');
});
test('warnings: unknown key, unknown section, no tags, voice_id+instrumental', () => {
  const w = (t, field) => { assert.deepStrictEqual(errs(t), []); assert.ok(warns(t).some((i) => i.field === field), field + ' ' + JSON.stringify(issues(t))); };
  w(mk('foo: bar'), 'foo');
  w(mk('', sec('My extra', 'x')), 'My extra');
  w(mk('', sec('Lyrics', 'no tags here')), 'lyrics');
  w(mk('voice_id: v1\ninstrumental: true'), 'voice_id');
  assert.deepStrictEqual(warns(mk('', sec('Lyrics', TAGGED))), []);
});
test('empty values never error; key is free text', () => {
  const all = S.SETTINGS.filter((s) => s.key !== 'schema_version').map((s) => s.key + ':').join('\n');
  good(mk(all));
  good(mk('key: Ab minor')); good(mk('key: C# major / D dorian'));
});

// ---------- 11. quoting ----------
test('quoting round trips through setting()', () => {
  for (const t of ['Hi: there', '"Quoted" start', 'a #hash', "'single' start", 'Café ☕ 日本語', '- dash', 'trailing ']) {
    const doc = S.parse(S.create());
    S.setSetting(doc, 'title', t, LP);
    assert.strictEqual(S.setting(S.parse(S.serialize(doc)), 'title'), t);
  }
});

// ---------- 12. hash ----------
test('hash(): normalization, difference, format', () => {
  const a = 'line one\nline two';
  assert.strictEqual(S.hash(a), S.hash('\r\n\r\nline one  \r\nline two   \r\n\r\n'));
  assert.notStrictEqual(S.hash(a), S.hash('line one\nline 2'));
  assert.ok(/^[0-9a-f]{8}$/.test(S.hash(a)));
  assert.ok(/^[0-9a-f]{8}$/.test(S.hash('')));
});

// ---------- 13. stripTags ----------
test('stripTags()', () => assert.strictEqual(S.stripTags('[Verse 1]\nline one\n\n[CHORUS|big]\nline two'), 'line one\n\nline two'));

// ---------- 14. fileName ----------
test('fileName()', () => {
  const d = S.parse(S.create());
  assert.strictEqual(S.fileName(d), 'song.songspec.md');
  S.setSection(d, 'idea', 'Title: Wild Sky\nTopic: x', IW);
  assert.strictEqual(S.fileName(d), 'wild-sky.songspec.md');
  S.setSetting(d, 'title', 'Paper Lanterns', LP);
  assert.strictEqual(S.fileName(d), 'paper-lanterns.songspec.md');
});

// ---------- 15. store ----------
test('store: no localStorage in Node', () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  if (desc && desc.configurable) delete globalThis.localStorage;
  assert.strictEqual(S.store.load(), '');
  assert.strictEqual(S.store.save('x'), false);
  if (desc) Object.defineProperty(globalThis, 'localStorage', desc);
});
test('store.update() re-reads newest text (two tabs)', () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const m = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: {
    getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } } });
  try {
    S.store.update((d) => S.setSection(d, 'idea', 'Title: A', IW)); // tab A
    // tab B saves in between
    const other = S.parse(S.store.load());
    S.setSection(other, 'lyrics', TAGGED, LP);
    assert.strictEqual(S.store.save(S.serialize(other)), true);
    S.store.update((d) => S.setSection(d, 'style', 'Folk', GB)); // tab A again
    const fin = S.parse(S.store.load());
    for (const id of ['idea', 'lyrics', 'style']) assert.ok(S.section(fin, id), id + ' lost');
    assert.deepStrictEqual(errs(S.store.load()), []);
  } finally {
    if (desc) Object.defineProperty(globalThis, 'localStorage', desc); else delete globalThis.localStorage;
  }
});

// ---------- 16. CLI ----------
test('CLI: validate example exits 0', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'songspec.js'), 'validate', path.join(__dirname, 'example.songspec.md')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});
test('CLI: validate bad file exits 1 with ERROR', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'songspec-'));
  const f = path.join(dir, 'bad.songspec.md');
  try {
    fs.writeFileSync(f, mk('', sec('Style', rep('a', 1001))));
    const r = spawnSync(process.execPath, [path.join(__dirname, 'songspec.js'), 'validate', f], { encoding: 'utf8' });
    assert.strictEqual(r.status, 1);
    assert.ok(r.stdout.includes('ERROR'), r.stdout);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
