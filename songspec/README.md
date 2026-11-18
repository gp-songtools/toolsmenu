# Song spec

One Markdown file per song that every GP Song Tool can read, and that each tool writes its own part of. Hand the finished file to Claude to make the song in Suno.

- **Format:** [SPEC.md](SPEC.md). Read this first: settings, sections, who writes what, the marker line, and the rules.
- **Example:** [example.songspec.md](example.songspec.md)
- **Library:** [songspec.js](songspec.js). No dependencies. Use it as a `<script>`, an import, or from Node.
- **Tests:** `node test.js`

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

## Changing the library

Each tool keeps its own byte-identical copy:

| Tool | Copy |
|---|---|
| GP Blueprint | `src/songspec.js` |
| Lyricpad | `js/songspec.js` |
| Idea Wizard | `songspec.js` |
| Earprint | `songspec.js` |
| AuraLyrics Studio | `songspec.js` |

1. Edit `songspec.js` here and bump `VERSION`.
2. Run `node test.js`.
3. Copy the file into every tool.
4. From a folder holding all the repos, check that the copies match:

```bash
node toolsmenu/songspec/check-copies.js
```
