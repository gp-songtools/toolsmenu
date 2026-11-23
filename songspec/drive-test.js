'use strict';
// Dependency-free tests for songdrive.js against an in-memory fake Drive. No network. Run: node drive-test.js
const assert = require('node:assert');
const S = require('./songspec.js');
const D = require('./songdrive.js');

let passed = 0, failed = 0;
const queue = [];
function test(name, fn) { queue.push({ name, fn }); }

const FOLDER = 'application/vnd.google-apps.folder';
const unq = (s) => s.replace(/\\(['\\])/g, '$1');

// ---------- fake localStorage ----------
function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

// ---------- fake Drive (as a fetch function) ----------
function fakeDrive() {
  const files = new Map();
  let n = 0, clock = Date.UTC(2026, 10, 23, 10, 0, 0);
  const calls = [];
  const sessions = new Map();
  const f = {
    files, calls, token: 'good', failPutAt: [], // failPutAt: PUT numbers (1-based) that answer 503 before storing anything
    putCount: 0,
    add(o) {
      const id = o.id || `id${++n}`;
      const rec = { id, name: o.name, mimeType: o.mimeType || 'text/plain', parents: o.parents || ['root'], trashed: !!o.trashed, version: 1, modifiedTime: new Date(clock += 60000).toISOString(), content: Buffer.from(o.content || '') };
      files.set(id, rec);
      return rec;
    },
    touch(rec, content) { rec.version++; rec.modifiedTime = new Date(clock += 60000).toISOString(); if (content != null) rec.content = Buffer.from(content); },
    byName(name, parent) { return [...files.values()].filter((x) => x.name === name && (!parent || x.parents.includes(parent))); },
  };
  const out = (x) => ({ id: x.id, name: x.name, mimeType: x.mimeType, size: String(x.content.length), modifiedTime: x.modifiedTime, version: String(x.version), parents: x.parents, trashed: x.trashed });
  const js = (o, status = 200, headers = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', ...headers } });
  function matches(q) {
    const ids = [...q.matchAll(/'((?:\\.|[^'\\])*)' in parents/g)].map((m) => unq(m[1]));
    const name = /(?:^|[ (])name = '((?:\\.|[^'\\])*)'/.exec(q);
    const eq = /mimeType = '([^']*)'/.exec(q), ne = /mimeType != '([^']*)'/.exec(q), has = /mimeType contains '([^']*)'/.exec(q);
    return [...files.values()].filter((x) => (!ids.length || ids.some((i) => x.parents.includes(i)))
      && (!name || x.name === unq(name[1])) && (!eq || x.mimeType === eq[1]) && (!ne || x.mimeType !== ne[1])
      && (!has || x.mimeType.includes(has[1])) && (!/trashed = false/.test(q) || !x.trashed));
  }
  f.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method || 'GET';
    const h = new Headers(init.headers || {});
    calls.push({ method, url: String(url), path: u.pathname });
    if (h.get('authorization') !== `Bearer ${f.token}`) return js({ error: { message: 'Invalid Credentials' } }, 401);
    // resumable sessions
    if (u.hostname === 'upload.fake') {
      const s = sessions.get(u.pathname);
      f.putCount++;
      if (f.failPutAt.includes(f.putCount)) return js({ error: { message: 'Backend Error' } }, 503);
      const range = h.get('content-range');
      const status = /^bytes \*\/(\d+)$/.exec(range);
      if (status && status[1] !== '0') return new Response(null, { status: 308, headers: s.received ? { Range: `bytes=0-${s.received - 1}` } : {} });
      const body = Buffer.from(await new Response(init.body ?? '').arrayBuffer());
      if (!status) {
        const m = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(range);
        assert.strictEqual(Number(m[1]), s.received, 'chunk starts where the last one ended');
        assert.strictEqual(body.length, Number(m[2]) - Number(m[1]) + 1);
        s.chunks.push(body); s.received += body.length; s.total = Number(m[3]);
      }
      f.maxChunk = Math.max(f.maxChunk || 0, body.length);
      if (s.received < s.total) return new Response(null, { status: 308, headers: { Range: `bytes=0-${s.received - 1}` } });
      const content = Buffer.concat(s.chunks);
      let rec = s.fileId && files.get(s.fileId);
      if (rec) { rec.name = s.meta.name; f.touch(rec, content); }
      else { rec = f.add({ name: s.meta.name, parents: s.meta.parents, mimeType: s.type, content }); }
      return js(out(rec), s.fileId ? 200 : 201);
    }
    if (u.pathname.startsWith('/upload/drive/v3/files')) {
      const fileId = u.pathname.split('/')[5] || '';
      const id = `/session/${++n}`;
      sessions.set(id, { fileId, meta: JSON.parse(init.body), type: h.get('x-upload-content-type'), received: 0, total: Number(h.get('x-upload-content-length')), chunks: [] });
      return new Response(null, { status: 200, headers: { Location: `https://upload.fake${id}` } });
    }
    const m = /^\/drive\/v3\/files(?:\/(.+))?$/.exec(u.pathname);
    if (!m) return js({ error: { message: 'no route' } }, 404);
    if (!m[1] && method === 'GET') {
      let list = matches(u.searchParams.get('q') || '');
      const ob = u.searchParams.get('orderBy');
      if (ob) list = list.sort((a, b) => String(a[ob]).localeCompare(String(b[ob])));
      const size = Number(u.searchParams.get('pageSize')) || 100;
      const start = Number(u.searchParams.get('pageToken') || 0);
      const page = list.slice(start, start + size);
      return js({ files: page.map(out), ...(start + size < list.length ? { nextPageToken: String(start + size) } : {}) });
    }
    if (!m[1] && method === 'POST') {
      const b = JSON.parse(init.body);
      return js(out(f.add({ name: b.name, mimeType: b.mimeType, parents: b.parents })));
    }
    const rec = files.get(decodeURIComponent(m[1]));
    if (!rec) return js({ error: { message: 'File not found' } }, 404);
    if (u.searchParams.get('alt') === 'media') return new Response(rec.content, { status: 200 });
    return js(out(rec));
  };
  return f;
}

function setup() {
  const fake = fakeDrive();
  globalThis.localStorage = fakeStorage();
  D.configure({ fetch: fake.fetch, sleep: async () => {}, chunk: 8 * 1024 * 1024 });
  localStorage.setItem(D.TOKEN_KEY, JSON.stringify({ value: 'good', expires: Date.now() + 3600e3 }));
  return fake;
}
const spec = (fm = '', body = '') => `---\nschema_version: 1\n${fm ? fm + '\n' : ''}---\n\n# Song spec\n\n${body}`;
const folderIn = (fake, name, parent) => fake.byName(name, parent).find((x) => x.mimeType === FOLDER);
const root = (fake) => folderIn(fake, 'GP Song Tools', 'root');
const rejects = async (p, code) => { try { await p; } catch (e) { assert.ok(e instanceof D.SongDriveError, String(e)); assert.strictEqual(e.code, code, e.message); return e; } assert.fail('expected rejection ' + code); };

// ---------- tests ----------
test('version and exports', () => {
  assert.strictEqual(D.VERSION, '1.0.0');
  assert.deepStrictEqual(D.SUBFOLDERS, ['lyrics', 'audio', 'images', 'clips', 'exports', 'projects']);
});
test('folderName', () => {
  assert.strictEqual(D.folderName('  Paper   Lanterns \n'), 'Paper Lanterns');
  assert.strictEqual(D.folderName('A/B\\C:D*E?F"G<H>I|J'), 'ABCDEFGHIJ');
  assert.strictEqual(D.folderName('a\u0000b\u001fc'), 'a b c');
  assert.strictEqual(D.folderName('x'.repeat(150)).length, 100);
  assert.strictEqual(D.folderName('  /:  '), '');
  assert.strictEqual(D.folderName(null), '');
});
test('signedIn: token with a minute of margin', () => {
  setup();
  assert.strictEqual(D.signedIn(), true);
  localStorage.setItem(D.TOKEN_KEY, JSON.stringify({ value: 'x', expires: Date.now() + 30_000 }));
  assert.strictEqual(D.signedIn(), false);
  localStorage.setItem(D.TOKEN_KEY, 'not json');
  assert.strictEqual(D.signedIn(), false);
});
test('rootFolder: create:false finds nothing, then creates once and finds it again', async () => {
  const fake = setup();
  assert.strictEqual(await D.rootFolder({ create: false }), null);
  const a = await D.rootFolder();
  const b = await D.rootFolder();
  assert.strictEqual(a.id, b.id);
  assert.strictEqual(fake.byName('GP Song Tools').length, 1);
  assert.deepStrictEqual(fake.files.get(a.id).parents, ['root']);
});
test('songFolder: creates under the root named from the title; same title finds it', async () => {
  const fake = setup();
  const doc = S.parse(spec('title: Paper Lanterns'));
  const a = await D.songFolder(doc);
  assert.deepStrictEqual([a.name, a.created], ['Paper Lanterns', true]);
  assert.deepStrictEqual(fake.files.get(a.id).parents, [root(fake).id]);
  const b = await D.songFolder(doc);
  assert.deepStrictEqual([b.id, b.created], [a.id, false]);
});
test('songFolder: no title gives code notitle; create:false returns null', async () => {
  setup();
  await rejects(D.songFolder(S.parse(spec())), 'notitle');
  assert.strictEqual(await D.songFolder(S.parse(spec('title: X')), { create: false }), null);
});
test('songFolder: existing name asks, reuse or "(2)", "(3)"', async () => {
  const fake = setup();
  const doc = S.parse(spec('title: Song'));
  const first = await D.songFolder(doc);
  const asked = [];
  const reuse = await D.songFolder(doc, { confirm: (n) => { asked.push(n); return true; } });
  assert.deepStrictEqual([reuse.id, asked], [first.id, ['Song']]);
  const second = await D.songFolder(doc, { confirm: () => false });
  assert.strictEqual(second.name, 'Song (2)');
  assert.strictEqual(second.created, true);
  const third = await D.songFolder(doc, { confirm: () => false });
  assert.strictEqual(third.name, 'Song (3)');
  assert.strictEqual(fake.files.get(third.id).parents[0], root(fake).id);
});
test('songFolder: names with quotes are escaped in the query', async () => {
  setup();
  const doc = S.parse(spec(`title: "Don't Stop"`));
  const a = await D.songFolder(doc);
  assert.strictEqual(a.name, "Don't Stop");
  assert.strictEqual((await D.songFolder(doc)).id, a.id);
});
test('songFolder: drive_folder wins; trashed or missing falls back to the title', async () => {
  const fake = setup();
  const doc = S.parse(spec('title: Song'));
  const a = await D.songFolder(doc);
  const withId = S.parse(spec(`title: Renamed Elsewhere\ndrive_folder: ${a.id}`));
  const b = await D.songFolder(withId);
  assert.deepStrictEqual([b.id, b.created], [a.id, false]);
  fake.files.get(a.id).trashed = true;
  const c = await D.songFolder(S.parse(spec(`title: Song\ndrive_folder: ${a.id}`)));
  assert.notStrictEqual(c.id, a.id);
  assert.strictEqual(c.created, true);
  const d = await D.songFolder(S.parse(spec('title: Gone\ndrive_folder: nope-123')));
  assert.strictEqual(d.name, 'Gone');
});
test('subfolder: lazy find-or-create, only the known names', async () => {
  const fake = setup();
  const song = await D.songFolder(S.parse(spec('title: Song')));
  assert.strictEqual(await D.subfolder(song.id, 'clips', { create: false }), null);
  const a = await D.subfolder(song.id, 'clips');
  const b = await D.subfolder(song.id, 'clips');
  assert.strictEqual(a.id, b.id);
  assert.deepStrictEqual(fake.files.get(a.id).parents, [song.id]);
  await rejects(D.subfolder(song.id, 'secrets'), 'http');
});
test('list: files only, not trashed, with mimePrefix', async () => {
  const fake = setup();
  const song = await D.songFolder(S.parse(spec('title: Song')));
  fake.add({ name: 'a.mp4', mimeType: 'video/mp4', parents: [song.id] });
  fake.add({ name: 'b.txt', parents: [song.id] });
  fake.add({ name: 'gone.txt', parents: [song.id], trashed: true });
  await D.subfolder(song.id, 'audio');
  assert.deepStrictEqual((await D.list(song.id)).map((x) => x.name), ['a.mp4', 'b.txt']);
  assert.deepStrictEqual((await D.list(song.id, { mimePrefix: 'video/' })).map((x) => x.name), ['a.mp4']);
});
test('list: follows nextPageToken', async () => {
  const fake = setup();
  const song = await D.songFolder(S.parse(spec('title: Song')));
  for (let i = 0; i < 2500; i++) fake.add({ name: `f${String(i).padStart(4, '0')}`, parents: [song.id] });
  assert.strictEqual((await D.list(song.id)).length, 2500);
});
test('upload: small file, then update keeps the id', async () => {
  const fake = setup();
  const song = await D.songFolder(S.parse(spec('title: Song')));
  const a = await D.upload(song.id, 'n.txt', new Blob(['hello']), { mimeType: 'text/plain' });
  assert.strictEqual(fake.files.get(a.id).content.toString(), 'hello');
  assert.deepStrictEqual(fake.files.get(a.id).parents, [song.id]);
  const b = await D.upload(song.id, 'n2.txt', new Blob(['bye']), { mimeType: 'text/plain', fileId: a.id });
  assert.strictEqual(b.id, a.id);
  assert.strictEqual(fake.files.get(a.id).content.toString(), 'bye');
  assert.strictEqual(fake.files.get(a.id).name, 'n2.txt');
  assert.strictEqual(await (await D.download(a.id)).text(), 'bye');
  assert.strictEqual(await D.downloadText(a.id), 'bye');
});
test('upload: chunks of 256 KiB multiples, progress reported', async () => {
  const fake = setup();
  D.configure({ chunk: 256 * 1024 });
  const song = await D.songFolder(S.parse(spec('title: Song')));
  const data = Buffer.alloc(600 * 1024, 7);
  const seen = [];
  const f = await D.upload(song.id, 'v.bin', new Blob([data]), { mimeType: 'application/octet-stream', onProgress: (s, t) => seen.push([s, t]) });
  assert.ok(fake.files.get(f.id).content.equals(data));
  assert.strictEqual(fake.maxChunk, 256 * 1024);
  assert.deepStrictEqual(seen, [[262144, 614400], [524288, 614400], [614400, 614400]]);
});
test('upload: resumes after a 503 in the middle', async () => {
  const fake = setup();
  D.configure({ chunk: 256 * 1024 });
  const song = await D.songFolder(S.parse(spec('title: Song')));
  const data = Buffer.from(Array.from({ length: 700 * 1024 }, (_, i) => i % 251));
  fake.putCount = 0; fake.failPutAt = [2]; // first chunk lands, second PUT gets a 503, status query resumes from 256 KiB
  const f = await D.upload(song.id, 'v.bin', new Blob([data]));
  assert.ok(fake.files.get(f.id).content.equals(data));
});
test('upload: gives up after 4 retries', async () => {
  const fake = setup();
  D.configure({ chunk: 256 * 1024 });
  const song = await D.songFolder(S.parse(spec('title: Song')));
  fake.putCount = 0; fake.failPutAt = Array.from({ length: 40 }, (_, i) => i + 1);
  const e = await rejects(D.upload(song.id, 'v.bin', new Blob([Buffer.alloc(300 * 1024)])), 'http');
  assert.strictEqual(e.status, 503);
});
test('upload: zero-byte file', async () => {
  const fake = setup();
  const song = await D.songFolder(S.parse(spec('title: Song')));
  const f = await D.upload(song.id, 'empty.txt', new Blob([]), { mimeType: 'text/plain' });
  assert.strictEqual(fake.files.get(f.id).content.length, 0);
  assert.strictEqual(fake.files.get(f.id).name, 'empty.txt');
});
test('upload: abort gives code cancelled', async () => {
  setup();
  D.configure({ chunk: 256 * 1024 });
  const song = await D.songFolder(S.parse(spec('title: Song')));
  const ac = new AbortController();
  ac.abort();
  await rejects(D.upload(song.id, 'v.bin', new Blob([Buffer.alloc(300 * 1024)]), { signal: ac.signal }), 'cancelled');
});
test('401 clears the token and says code auth', async () => {
  const fake = setup();
  fake.token = 'other';
  const e = await rejects(D.rootFolder(), 'auth');
  assert.match(e.message, /Click again to sign in/);
  assert.strictEqual(localStorage.getItem(D.TOKEN_KEY), null);
  assert.strictEqual(D.signedIn(), false);
});
test('network errors retry, then code network; the token never shows in messages', async () => {
  const fake = setup();
  let n = 0;
  D.configure({ fetch: async () => { n++; throw new TypeError('fetch failed'); } });
  const e = await rejects(D.rootFolder({ create: false }), 'network');
  assert.strictEqual(n, 3);
  assert.ok(!e.message.includes('good'));
  fake.token = 'good';
});
test('5xx is retried and then succeeds', async () => {
  const fake = setup();
  let bad = 2;
  D.configure({ fetch: async (u, i) => (bad-- > 0 ? new Response('{}', { status: 503 }) : fake.fetch(u, i)) });
  assert.strictEqual(await D.rootFolder({ create: false }), null);
});
test('saveSpec: makes folders, uploads, writes drive_folder into the browser copy and the upload', async () => {
  const fake = setup();
  S.store.save(spec('title: Paper Lanterns', '## Notes\nhello\n\n'));
  const r = await D.saveSpec({ confirm: () => assert.fail('no question expected') });
  const folder = folderIn(fake, 'Paper Lanterns', root(fake).id);
  assert.ok(folder);
  assert.strictEqual(r.folderId, folder.id);
  assert.strictEqual(r.fileName, 'paper-lanterns.songspec.md');
  assert.strictEqual(r.created, true);
  const up = fake.files.get(r.fileId);
  assert.deepStrictEqual(up.parents, [folder.id]);
  assert.strictEqual(S.setting(S.parse(up.content.toString()), 'drive_folder'), folder.id);
  assert.strictEqual(S.setting(S.parse(S.store.load()), 'drive_folder'), folder.id);
  assert.strictEqual(up.content.toString(), S.store.load());
  assert.ok(up.content.toString().includes('## Notes\nhello'));
});
test('saveSpec: second save updates the same file, no prompt, no new folder', async () => {
  const fake = setup();
  S.store.save(spec('title: Song'));
  const a = await D.saveSpec({});
  S.store.update((d) => S.setSection(d, 'notes', 'more', { by: 'person' }));
  const b = await D.saveSpec({});
  assert.strictEqual(b.fileId, a.fileId);
  assert.strictEqual(b.created, false);
  assert.strictEqual(fake.byName('Song').length, 1);
  assert.strictEqual(fake.files.get(a.fileId).version, 2);
  assert.ok(fake.files.get(a.fileId).content.toString().includes('more'));
  assert.strictEqual([...fake.files.values()].filter((x) => x.name.endsWith('.songspec.md')).length, 1);
});
test('saveSpec: Drive copy changed elsewhere asks replace-newer; no aborts, yes replaces', async () => {
  const fake = setup();
  S.store.save(spec('title: Song'));
  const a = await D.saveSpec({});
  fake.touch(fake.files.get(a.fileId), 'edited on another device');
  const asked = [];
  const e = await rejects(D.saveSpec({ confirm: (k, n) => { asked.push([k, n]); return false; } }), 'cancelled');
  assert.match(e.message, /Drive copy changed/);
  assert.deepStrictEqual(asked, [['replace-newer', 'song.songspec.md']]);
  assert.strictEqual(fake.files.get(a.fileId).content.toString(), 'edited on another device');
  await D.saveSpec({ confirm: () => true });
  assert.ok(fake.files.get(a.fileId).content.toString().startsWith('---'));
  await D.saveSpec({ confirm: () => assert.fail('in sync again') });
});
test('saveSpec: existing folder of that name asks reuse-folder; no makes "Song (2)"', async () => {
  const fake = setup();
  S.store.save(spec('title: Song'));
  await D.saveSpec({});
  S.store.save(spec('title: Song'));
  const asked = [];
  const r = await D.saveSpec({ confirm: (k, n) => { asked.push([k, n]); return false; } });
  assert.deepStrictEqual(asked, [['reuse-folder', 'Song']]);
  assert.ok(folderIn(fake, 'Song (2)', root(fake).id));
  assert.strictEqual(fake.files.get(r.fileId).parents[0], folderIn(fake, 'Song (2)', root(fake).id).id);
});
test('saveSpec: trashed drive_folder is replaced by the person-written new id', async () => {
  const fake = setup();
  S.store.save(spec('title: Song'));
  const a = await D.saveSpec({});
  fake.files.get(a.folderId).trashed = true;
  const b = await D.saveSpec({});
  assert.notStrictEqual(b.folderId, a.folderId);
  assert.strictEqual(S.setting(S.parse(S.store.load()), 'drive_folder'), b.folderId);
});
test('saveSpec: no title is an error; explicit text leaves the browser copy alone', async () => {
  const fake = setup();
  S.store.save(spec());
  await rejects(D.saveSpec({}), 'notitle');
  const before = S.store.load();
  const r = await D.saveSpec({ text: spec('title: Other') });
  assert.strictEqual(S.store.load(), before);
  assert.strictEqual(S.setting(S.parse(fake.files.get(r.fileId).content.toString()), 'drive_folder'), r.folderId);
});
test('listSongs: only folders with a spec, newest first; empty before anything exists', async () => {
  const fake = setup();
  assert.deepStrictEqual(await D.listSongs(), []);
  S.store.save(spec('title: Older'));
  await D.saveSpec({});
  S.store.save(spec('title: Newer'));
  const n = await D.saveSpec({});
  await D.songFolder(S.parse(spec('title: No spec here')));
  const songs = await D.listSongs();
  assert.deepStrictEqual(songs.map((s) => s.folderName), ['Newer', 'Older']);
  assert.strictEqual(songs[0].fileId, n.fileId);
  assert.strictEqual(songs[0].fileName, 'newer.songspec.md');
  assert.ok(songs[0].modifiedTime && songs[0].version);
});
test('listSongs: batches many folders; picks the newest spec in each', async () => {
  const fake = setup();
  const r = await D.rootFolder();
  for (let i = 0; i < 45; i++) {
    const f = fake.add({ name: `S${i}`, mimeType: FOLDER, parents: [r.id] });
    fake.add({ name: 'old.songspec.md', parents: [f.id] });
    fake.add({ name: 'new.songspec.md', parents: [f.id] });
  }
  const songs = await D.listSongs();
  assert.strictEqual(songs.length, 45);
  assert.ok(songs.every((s) => s.fileName === 'new.songspec.md'));
});
test('openSpec: reads the text, records the version so a save needs no prompt', async () => {
  const fake = setup();
  S.store.save(spec('title: Song', '## Notes\nhi\n\n'));
  await D.saveSpec({});
  fake.touch([...fake.files.values()].find((x) => x.name === 'song.songspec.md'), spec('title: Song', '## Notes\nchanged elsewhere\n\n'));
  localStorage.removeItem(D.SYNC_KEY);
  const [entry] = await D.listSongs();
  const o = await D.openSpec(entry);
  assert.match(o.text, /changed elsewhere/);
  assert.strictEqual(o.folderId, entry.folderId);
  assert.strictEqual(o.fileId, entry.fileId);
  S.store.save(o.text);
  S.store.update((d) => S.setSetting(d, 'drive_folder', o.folderId, { by: 'person' })); // as the panel does
  await D.saveSpec({ confirm: () => assert.fail('opened just now') });
});
test('signOut clears the token and the sync notes', async () => {
  setup();
  localStorage.setItem(D.SYNC_KEY, '{"a":"1"}');
  await D.signOut();
  assert.strictEqual(localStorage.getItem(D.TOKEN_KEY), null);
  assert.strictEqual(localStorage.getItem(D.SYNC_KEY), null);
});
test('signIn: nothing is requested when already signed in; without a token and no Google it fails with auth', async () => {
  const fake = setup();
  await D.signIn();
  assert.strictEqual(fake.calls.length, 0);
  localStorage.removeItem(D.TOKEN_KEY);
  await rejects(D.signIn(), 'auth');
  assert.strictEqual(fake.calls.length, 0);
});
test('signIn: token client flow (fake Google script) stores the token and dedupes', async () => {
  const fake = setup();
  localStorage.removeItem(D.TOKEN_KEY);
  let inits = 0, asks = [];
  globalThis.google = { accounts: { oauth2: {
    hasGrantedAllScopes: () => true,
    initTokenClient: (cfg) => { inits++; assert.strictEqual(cfg.scope, D.SCOPE); return { requestAccessToken: (o) => { asks.push(o); setTimeout(() => cfg.callback({ access_token: 'good', expires_in: 3600 }), 0); } }; },
  } } };
  try {
    await Promise.all([D.signIn(), D.signIn()]);
    assert.strictEqual(asks.length, 1);
    assert.strictEqual(D.signedIn(), true);
    assert.strictEqual(JSON.parse(localStorage.getItem(D.TOKEN_KEY)).value, 'good');
    assert.ok(inits <= 1);
    assert.strictEqual(fake.calls.length, 0);
  } finally { delete globalThis.google; }
});

(async () => {
  for (const { name, fn } of queue) {
    try { await fn(); passed++; console.log('ok - ' + name); }
    catch (e) { failed++; console.log('FAIL - ' + name + '\n    ' + String(e && e.stack || e).split('\n').slice(0, 6).join('\n    ')); }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
})();
