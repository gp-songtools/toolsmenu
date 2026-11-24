# Song spec format, schema version 1

One Markdown file per song, `<title>.songspec.md`, that the GP Song Tools read from and write to. Each tool writes only its own parts, and any tool may read any part. No tool needs another to have run first. The finished file is plain enough for a person or Claude to read without a parser.

A complete example is in [`example.songspec.md`](example.songspec.md).

## 1. Layout

```
---                      <- settings: flat "key: value" lines
schema_version: 1
title: Paper Lanterns
...
---

# Song spec

## Idea                  <- fixed sections, in a fixed order
<!-- song-spec: by=ideawizard at=2026-11-17T14:02Z hash=... from=... -->
Title: Paper Lanterns
...
```

### Settings: the block between the `---` lines

- One `key: value` per line. The block is flat: no nesting, no lists, no comments after a value.
- A whole line starting with `#` is a comment and is kept as written.
- The value is the rest of the line. It's wrapped in double quotes only when it starts with a quote or bracket, or contains `: ` or ` #` (for example `title: "Hi: there"`).
- **An empty value means "not set"**: Suno's default applies.
- **Unknown keys are kept as they are.**

| Key | Allowed values | Written by |
|---|---|---|
| `schema_version` | `1` | any tool, only when missing |
| `request` | `song`, `cover`, `sound` | you |
| `title` | up to 256 characters | Lyricpad, or you |
| `drive_folder` | Google Drive id of the song's folder (letters, digits, `-`, `_`; up to 200) | any tool, only while empty; you may change or clear it |
| `model` | `v6-mini`, `v6`, `v6-wild` | you |
| `instrumental` | `true` / `false` | you |
| `voice_id` | Suno voice id | you |
| `vocal_gender` | `male` / `female`; not with `voice_id` | you |
| `weirdness` | 0 to 1 | you |
| `style_influence` | 0 to 1 | you |
| `variety` | whole number 0 to 4 | you |
| `audio_influence` | 0 to 1; a new song needs `voice_id` | you |
| `duration` | whole seconds, 15 to 360 | you |
| `max_mode` | `true` / `false` | you |
| `cover_source` | Suno clip id (needed for `request: cover`) | you |
| `loop` | `true` / `false` (sounds) | you |
| `bpm` | whole number, 1 to 300 | GP Blueprint or Earprint |
| `key` | free text, e.g. `Ab minor`; it goes into the prompt, not a Suno option | GP Blueprint or Earprint |
| `bpm_key_by` | which tool last set `bpm` and `key` | GP Blueprint or Earprint |

### Sections: `## Heading` to the next `## `

- Headings are matched without regard to letter case.
- `###` and smaller headings are part of the section's text.
- A section may be missing, or present with nothing under it. **Both mean "not available".**
- A section a tool writes for the first time is inserted in the order below.
- **Unknown sections are kept in place.**

| Section | Written by | What it holds | Limit |
|---|---|---|---|
| `## Idea` | Idea Wizard | `Title:` `Topic:` `Theme:` `Subject:` `Angle:` `Hook:` `Imagery:` lines | — |
| `## Idea structure` | Idea Wizard | A structure in the format of [GP Blueprint's `structure-format.md`](https://github.com/gp-songtools/gp-blueprint/blob/main/docs/structure-format.md), with the story in each description | — |
| `## Reference (never send to Suno)` | GP Blueprint | `Artist:`, `Song:`, `YouTube:` that Blueprint analysed. **Never sent to Suno.** | — |
| `## Analysis` | Earprint | Its "Copy for Idea Wizard" text: `Earprint analysis` then `Label: value` lines | — |
| `## Style` | GP Blueprint | The style prompt | 1000 |
| `## Negative style` | you | Styles to avoid, comma-separated | 1000 |
| `## Structure` | GP Blueprint | A structure in the `structure-format.md` format | — |
| `## Stems` | GP Blueprint | `group \|\| prompt` lines | — |
| `## Lyrics` | Lyricpad | Complete lyrics **with section tags** (`[VERSE 1]`, `[CHORUS\|…]`), ready for Suno | 5000 |
| `## Timed lyrics` | Framecut | The sung lines as LRC, `[mm:ss.xx] text`, in song time | — |
| `## Video sequence` | GP Producer | One `[mm:ss.xx] clip-name` line per scene, in song time | — |
| `## Sound` | you | A sound or loop description (`request: sound`) | 500 |
| `## Notes` | you | Anything. No tool reads it. | — |

Limits count characters as Unicode code points.

## 2. The marker line

Each tool writes this as the first line under a heading it owns:

```
<!-- song-spec: by=lyricpad at=2026-11-17T14:20Z hash=5c1e09aa from=idea-structure:0d4c11e2,idea:7a3f9b10 -->
```

- `by`: the tool that wrote the section.
- `at`: UTC time, to the minute.
- `hash`: FNV-1a 32-bit of the section text, in 8 hex digits. It is taken over the UTF-8 bytes of the text with LF line endings, trailing spaces removed and blank lines at both ends removed.
- `from`: the sections the tool used, each with the hash it had then.
- `manual=yes`: you add this by hand to lock the section.

It is an HTML comment, so a Markdown preview hides it. A person or Claude reading the raw file still sees it.

**Out of date (a warning, never a block).** If a section listed in `from` has changed or been cleared, tools and the validator warn, for example "Lyrics is based on an older Idea structure."

**Hand edits.** A tool **asks before overwriting** a section that:
- has `manual=yes` (you locked it),
- has text that no longer matches its `hash` (you edited it after the tool wrote it), or
- has text but no marker (you typed or pasted it).

## 3. Rules for every tool

1. **Write only what you own.** Never change another tool's section or settings. Only read them.
2. **Change nothing you didn't generate.** Reading and saving keeps every other byte, including unknown keys, unknown sections, comments, spacing and line endings.
3. **Never depend on another tool.** A missing or empty section means "not available". Use your own input or defaults. Never fail, refuse, or require a run order.
4. **Say what you used.** When a tool uses another tool's section, it says so on screen, for example "Using from song spec: Structure (GP Blueprint)". It also lists that section in its marker's `from`.
5. **Re-read before writing.** Load the newest copy, change your parts, save. Then two open tools never overwrite each other.
6. **Clearing is your decision, not the tool's.** Each tool's song spec panel has **Clear** on every section and **New song**. They run only when you click them, after confirming. New song empties every section and every tool-written setting, and keeps your own settings.

## 4. Who writes and who reads

No dependency below is required. Every tool works the same as today when a section is absent.

| Tool | Writes | Can read | When it's there | When it's missing |
|---|---|---|---|---|
| GP Blueprint | Style, Structure, Stems, Reference; `bpm`, `key`, `bpm_key_by` when its "Set the song's BPM and key" option is ticked (on by default) | Idea, Lyrics, Analysis | Topic box starts from Idea's `Topic:`. Lyrics can be used as reference lyrics. Analysis is added to the prompt as reference. | You type the inputs, as now |
| Lyricpad | Lyrics (with tags), `title` | Structure, Idea structure, Idea | Shows "Use structure from: Idea Wizard / GP Blueprint", defaulting to the newest structure that isn't out of date. Topic/feel starts from Idea. Title starts from Idea's `Title:` when empty. | Paste a structure and type a topic, as now |
| Idea Wizard | Idea, Idea structure | Style, Structure, Analysis | Fills its style, structure and track-analysis boxes | You paste them, as now |
| Earprint | Analysis; `bpm`, `key`, `bpm_key_by` only when its "Also set the song's BPM and key" option is ticked (off by default) | Lyrics | Fills its lyrics box (tags stripped) | You paste lyrics, or leave them out, as now |
| GP Mastering | nothing (read only); saves masters to Drive `audio/` (**Save to Google Drive too**) | `title`, `bpm`, `key` | The Song panel's song spec box shows the title, BPM and key, with the panel's Drive buttons; the title names the Drive folder | Works on the audio alone, as now; asks for a song title before the first Drive save |
| Framecut | Timed lyrics (**Save Timed Lyrics to Song Spec**, after transcription or alignment) | Lyrics, Timed lyrics, `title`, `bpm`, `key`, `duration`, Video sequence | The "From the song spec" box shows each value; **Use in Import Lyrics** (or **Use Song Spec Lyrics** / **Use Song Spec Timed Lyrics** inside Import Lyrics) fills the importer with lyrics to transcribe and align, or sync them in AuraLyrics Studio | Paste or open timed LRC, as now |
| GP Producer | Video sequence (**Save video sequence to song spec**) | Timed lyrics, `duration`, `title` | The Setup tab's "From the song spec" box offers **Use as lyrics**, **Use as runtime** and **Use as project name** | Paste or upload an `.lrc`, and type the runtime and name, as now |
| AuraLyrics Studio | nothing (read only) | Lyrics | **Use these lyrics** fills the lyric editor, tags stripped | Transcribe, paste or upload, as now |

### Timed lyrics format

Written by Framecut after Whisper or audio alignment.
- One sung line per line, as LRC: `[mm:ss.xx] text` (`[m+:ss]` or up to three decimals also read).
- Times are seconds from the start of the song's master audio (song time), in ascending order.
- No Suno section tags (`[VERSE 1]` and the like).
- Framecut adds `from=lyrics:<hash>` to the marker when the text was derived from the Lyrics section.
- Readers that need plain LRC can use the section body as-is.

```
## Timed lyrics
<!-- song-spec: by=framecut at=2026-11-20T10:15Z hash=46a5a37d from=lyrics:c973ca35 -->
[00:12.40] Your name still glows across my screen
[00:16.85] A message never sent
```

### Video sequence format

Written by GP Producer. Framecut reads it: **Place clips…** (local files) and **Place clips from Drive…** (the Drive `clips/` folder) put the clips on the timeline.
- One line per scene, in scene order: `[mm:ss.xx] <clip file name>`.
- The time is the scene's start in song time.
- The file name is the clip name from GP Producer's Production tab, `{NN}_{SectionSlug}_{startSec}-{endSec}.mp4`, from GP Producer's `buildFileTag`. Start and end seconds are zero-padded to at least 2 digits, so `[00:00.00] 01_Intro_00-12.mp4` and `[03:34.00] 04_Outro_214-230.mp4` (a 3-digit second isn't padded further). Example: `[00:26.00] 03_Verse1A_26-39.mp4`.

```
## Video sequence
<!-- song-spec: by=gp-producer at=2026-11-20T10:40Z hash=708746a6 -->
[00:00.00] 01_Intro_00-12.mp4
[00:12.00] 02_Verse1_12-26.mp4
```

Both sections are warned about, never rejected, when a line doesn't match or times go backwards.

Framecut's **Place clips…** and **Place clips from Drive…** use this section. Chosen files are matched to scenes by exact file name, then by the `NN_` scene number. Song time 0 is the start of the selected audio clip (timeline 0 if none). The clips come from local files or from the `clips/` folder of the Drive song folder (section 8).

**Which structure Lyricpad uses** (`SongSpec.pickStructure`):
- It picks the newest of Structure and Idea structure.
- An Idea structure built from a Blueprint structure that has since changed is marked out of date and isn't picked by default.
- So rerunning GP Blueprint after Idea Wizard makes Blueprint's structure the default.
- You can always switch, or clear either section.

**Not in the spec:**
- Earprint → GP Mastering edits stay in their own JSON.
- GP Mastering works on audio. It reads only `title`, `bpm` and `key` (shown, never used to change its tempo grid) and writes no sections.
- Randomash doesn't read or write the browser copy. Its **Download song spec (loop)** makes a new file for a loop, laid out like `templates/blank-sound.songspec.md`: `request: sound`, `loop: true`, `instrumental: true`, `bpm`, `key` (major or minor only) and `bpm_key_by: gp-randomash`, its prompt (vocals and length wording removed) as Sound, and its genres and settings in Notes.

## 5. Sharing between tools

All tools share the `gp-songtools.github.io` address, so they share one **browser copy** of the current spec (`localStorage` key `gpsongtools.songspec.v1`). Saving in one tool shows up in another tool's open tab at once.

That copy stays in this browser on this device. It is never sent anywhere.

The shared Song Spec panel also offers:
- **Download song spec**: saves `<title>.songspec.md`. This is the file you keep or hand to Claude.
- **Open song spec**: loads a `.songspec.md` file into the browser copy.

Framecut and GP Producer show the shared Song spec panel like the other tools. **Open file…** replaces the browser copy (after a confirm).

## 6. Validation

- `node songspec.js validate file.songspec.md` lists every error and warning, and exits with 1 on errors.
- Errors are anything that breaks a Suno limit or range, plus duplicate keys or sections and a wrong `schema_version`.
- Warnings are out-of-date sections, unknown keys or sections, lyrics without section tags, and `voice_id` with `instrumental: true`.

## 7. Changing the format

- Additive changes (a new optional key or section) keep `schema_version: 1`. Older tools keep the new parts untouched.
- A change that alters the meaning of existing parts raises the version.
- `songspec.js` is copied into each tool. Change it here, then copy it into every tool (see README).

## 8. Song folder in Google Drive

The owner decided the plan on 2026-11-23. Library 1.2.0 adds the `drive_folder` setting and the panel's Drive buttons; `songdrive.js` does the work (now 1.1.0). GP Producer saves into `clips/`, `images/` and `projects/`, and Framecut reads `clips/` and saves into `exports/` and `projects/`. The other tools don't yet: Lyricpad still uses its own Lyricpad folder, GP Mastering saves masters into `audio/` (**Save to Google Drive too**, **Save last master to Drive**). Randomash and AuraLyrics Studio don't use Drive yet.

**Folder.** Every GP Song Tools app uses one Drive folder per song:

```
My Drive/
  GP Song Tools/
    <Song title>/
      <song>.songspec.md   the song spec (cross-device copy)
      lyrics/              Lyricpad (.txt), LRC exports
      audio/               masters (GP Mastering), generated clips (Randomash), stems
      images/              GP Producer anchors and keyframes, cover art
      clips/               GP Producer video clips, named by file tag (01_Intro_00-12.mp4)
      exports/             finished videos (Framecut, AuraLyrics Studio)
      projects/            app project files (.framecut, GP Producer .zip)
```

**Naming.** The folder is named from the spec `title`, with characters Drive can't take removed. A song with no title asks for one first.

**`drive_folder` setting.** The Drive ID of the song's folder, so the link survives renames. Any tool may fill it, and only while it is empty (setting the value it already has changes nothing). Only you can change or clear it. If the folder is in the trash or gone, the next save finds or makes one from the title and writes the new ID. `New song` drops it. It is an additive setting, so `schema_version` stays 1.

**Cross-device copy.** The `.songspec.md` in the folder is the copy that travels between devices. The shared Song spec panel shows **Save to Drive** and **Open from Drive…** (and **Sign out of Drive** once signed in) when `songdrive.js` is loaded; without it the panel is unchanged. **Save to Drive** asks for a title when there is none, makes `GP Song Tools/<title>/`, fills in `drive_folder`, and uploads the spec; it asks first when a folder of that name already exists (reuse it, or make `<title> (2)`) and when the Drive copy changed since this browser last saved or opened it. **Open from Drive…** lists the songs that have a spec, newest first, and replaces the browser copy after the same confirm as **Open file…**. The browser copy (section 5) stays the working copy.

**Who writes where.** Each tool writes only its own subfolders. Every tool may read all of them.

| Tool | Writes |
|---|---|
| Lyricpad | `lyrics/` |
| GP Mastering, Randomash | `audio/` |
| GP Producer | `images/`, `clips/`, `projects/` |
| Framecut | `exports/`, `projects/` |
| AuraLyrics Studio | `exports/` |

**Permission.** One Google client is shared by every tool, using the `drive.file` scope only. A tool sees just the files and folders the GP Song Tools apps created. A tool that must open files our apps didn't create would need Google's Picker, which is not planned.

**Library.** `songdrive.js` sits next to `songspec.js` in this folder (global `SongDrive`, or `require`). Tools keep byte-identical copies next to their `songspec.js`, checked by `check-copies.js` (a tool without one is "not used yet"). It asks Google for `drive.file` access only, and only when you first click a Drive button: Google's script isn't loaded before that, and the sign-in popup opens from the click. The access token stays in this browser (`localStorage`, shared by the tools). It finds or creates the song folder and its subfolders, lists, downloads, uploads in resumable chunks (video), and saves and opens the spec. Tests: `node songspec/drive-test.js`.

A tool with its own Google sign-in can hand its token to songdrive with `configure({ auth: { token, signIn, signOut } })`, so one sign-in covers both the tool and the shared Song spec panel. Version 1.1.0 also adds `move`, `rename`, `trash`, `findFolder` and `children`.

## Changes

- **Library 1.1.0 (schema 1, additive):** added the `Timed lyrics` (Framecut) and `Video sequence` (GP Producer) sections. `schema_version` stays 1. Older copies keep these sections as unknown sections, unchanged.
- **Library 1.2.0 (schema 1, additive):** added the `drive_folder` setting (any tool, only while empty; the person may change it), let the person set `title` as well, and added **Save to Drive** / **Open from Drive…** to the panel when `songdrive.js` is loaded. `songdrive.js` 1.0.0 is new. Older copies keep `drive_folder` as an unknown key, unchanged.
- **songdrive 1.1.0 (additive):** `configure({ auth })` lets a tool use its own Google sign-in instead of the built-in one (`token()`, `signIn(opts)`, optional `signOut()`); new `move`, `rename`, `trash`, `findFolder(parentId, name)` and `children(folderId, {foldersOnly, filesOnly, q})`. Nothing changes for tools that don't use them. The song spec library stays 1.2.0.
