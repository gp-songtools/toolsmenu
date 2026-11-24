# Song spec

One Markdown file per song that every GP Song Tool can read, and that each tool writes its own part of. Hand the finished file to Claude to make the song in Suno.

- **Format:** [SPEC.md](SPEC.md). Read this first: settings, sections, who writes what, the marker line, and the rules.
- **Example:** [example.songspec.md](example.songspec.md)
- **Library:** [songspec.js](songspec.js), version 1.2.0 (adds the `drive_folder` setting and the panel's Save to Drive / Open from Drive; schema 1). No dependencies. Use it as a `<script>`, an import, or from Node.
- **Google Drive:** [songdrive.js](songdrive.js), version 1.1.0. Sign-in (only on a click, `drive.file` scope), the song folder, uploads, and saving and opening the spec on Drive; `move`, `rename`, `trash`, `findFolder` and `children` for tidying folders. A tool with its own Google sign-in can pass it in with `configure({ auth: { token, signIn, signOut } })`. Optional: the panel shows its buttons only when `SongDrive` is loaded. See SPEC.md section 8.
- **Tests:** `node test.js` (library), `node drive-test.js` (Google Drive, against an in-memory fake; no network). **Chain test:** from a folder holding all the repos, `node toolsmenu/songspec/chain-test.mjs` passes one file through every tool, in every order, and checks each tool leaves everything it doesn't own unchanged. Each tool also has its own tests (see its CLAUDE.md).

## Check a file

```bash
node songspec.js validate my-song.songspec.md
```

```bash
node songspec.js status my-song.songspec.md
```

```bash
node songspec.js show my-song.songspec.md lyrics
```

`validate` exits with 1 when the file breaks a Suno limit. `status` shows who wrote each section, when, and whether it's out of date or edited by hand.

## In a tool

```js
const doc = SongSpec.parse(SongSpec.store.load() || SongSpec.create());
const st = SongSpec.section(doc, 'structure');      // null = not available: use your own input
if (st) say(`Using from song spec: Structure (${SongSpec.toolName(st.by)})`);

SongSpec.store.update((d) => {                     // re-reads the newest copy, then saves
  if (SongSpec.confirmReason(d, 'lyrics', 'lyricpad') && !confirm('Overwrite?')) return;
  SongSpec.setSection(d, 'lyrics', text, { by: 'lyricpad', from: ['structure'] });
  SongSpec.setSetting(d, 'title', title, { by: 'lyricpad' });
});
SongSpec.download(SongSpec.store.load(), SongSpec.fileName(doc));
```

## Shared panel

```js
const panel = SongSpec.mountPanel(el, { onChange: (doc) => {/* re-read the spec */}, open: false });
panel.refresh(); panel.say('Saved.'); panel.destroy();   // returns { refresh, say, destroy }
```

It shows the song title and how many sections are filled, then each filled section with the tool that wrote it, when, and its size (`Lyrics · Lyricpad · 2026-11-23 10:00 UTC · 420 chars`), flags (out of date, edited by hand, locked) and **Clear**. Buttons: **Open file…**, **Download**, **Copy**, **New song**, and, when `songdrive.js` is loaded (`mountPanel(el, { drive })`, default the global `SongDrive`), **Save to Drive**, **Open from Drive…** and, once signed in, **Sign out of Drive**. **Open file…** replaces the browser copy after a confirm, and Clear and New song confirm too. `onChange` runs after changes from this tab or another one.

The panel injects its own CSS (`<style id="ssp-css">`, colours from `currentColor`). Style it from the host through a wrapper class, for example `.spec-panel .ssp`.

Lyricpad, Framecut and GP Producer also keep a per-tool "From the song spec" box next to their own inputs, with one button per value (for example **Use as lyrics**). The panel is the shared view; the box is how that tool reads the spec.

## Changing the library

Each tool keeps its own byte-identical copy (a tool that uses Google Drive also keeps `songdrive.js` next to it; `check-copies.js` compares it when present):

| Tool | Copy |
|---|---|
| GP Blueprint | `src/songspec.js` |
| Lyricpad | `js/songspec.js` |
| Idea Wizard | `songspec.js` |
| Earprint | `songspec.js` |
| AuraLyrics Studio | `songspec.js` |
| Framecut | `src/songspec.js` |
| GP Producer | `src/vendor/songspec.js` |

1. Edit `songspec.js` here and bump `VERSION`.
2. Run `node test.js` and `node drive-test.js`.
3. Copy the file into every tool.
4. From a folder holding all the repos, check that the copies match:

```bash
node toolsmenu/songspec/check-copies.js
```
