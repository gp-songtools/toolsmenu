// Chain test: one song spec passes through every GP Song Tool in turn, and after each step
// everything that tool doesn't own must be unchanged. Uses each tool's own save code where it is a
// module (GP Blueprint src/spec.js, Lyricpad js/spec.js, Idea Wizard spec.js). Earprint's save lives
// inside its page, so its step repeats the same library calls; its own browser test
// (earprint/tests/songspec.ui.mjs) checks the real button. AuraLyrics only reads.
//
// Run from a folder holding all the repos side by side: node toolsmenu/songspec/chain-test.mjs
// A tool that isn't checked out is skipped (and said so).
import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const S = createRequire(import.meta.url)(join(HERE, "songspec.js"));

async function load(repo, file) {
  const p = join(ROOT, repo, file);
  if (!existsSync(p)) { console.log(`skip     ${repo} (not checked out)`); return null; }
  return import(pathToFileURL(p).href);
}
const blueprint = await load("gp-blueprint", "src/spec.js");
const lyricpad = await load("lyricpad", "js/spec.js");
const ideawizard = await load("ideawizard", "spec.js");
const iwPrompts = ideawizard && await load("ideawizard", "prompts.js");
const earprintHere = existsSync(join(ROOT, "earprint", "songspec.js")) || (console.log("skip     earprint (not checked out)"), false);

// ---------- what each tool writes (fixed data standing in for its AI/measurement results) ----------

const OWNS = {
  "gp-blueprint": { sections: ["style", "structure", "stems", "reference"], settings: ["bpm", "key", "bpm_key_by"] },
  earprint: { sections: ["analysis"], settings: ["bpm", "key", "bpm_key_by"] },
  ideawizard: { sections: ["idea", "idea-structure"], settings: [] },
  lyricpad: { sections: ["lyrics"], settings: ["title"] },
  "auralyrics-studio": { sections: [], settings: [] },
};

const STEPS = {
  "gp-blueprint": blueprint && ((doc) => {
    const used = ["idea", "lyrics", "analysis"].filter((id) => S.section(doc, id));
    blueprint.specWrite(doc, {
      target: "suno", style: "Indie folk, dream pop, 89 BPM, Ab minor, soft breathy vocals. Fingerpicked guitar over warm pads.",
      bpm: "89", key: "Ab minor", stems: [{ group: "Vocals", prompt: "Isolated Vocals stem: soft breathy lead." }],
      sections: [
        { name: "Intro", bars: "4", seconds: 11, lines: 0, rhyme: "-", meter: "-", description: "Guitar alone.", tags: "[INTRO|calm|fingerpicked guitar]" },
        { name: "Verse 1", bars: "8", seconds: 22, lines: 2, rhyme: "AB", meter: "8.6", description: "Quiet.", tags: "[VERSE 1|wistful|soft vocals]" },
      ],
    }, { artist: "Some Artist", song: "", youtube: "", used }, { setBpmKey: true });
  }),
  earprint: earprintHere && ((doc) => {
    // Same calls as Earprint's "Save to song spec" with "Also set the song's BPM and key" ticked.
    S.setSection(doc, "analysis", "Earprint analysis\nTrack: demo.wav\nTempo: 91 BPM\nKey: A minor (8A)\nMoods: calm", { by: "earprint", from: S.section(doc, "lyrics") ? ["lyrics"] : [] });
    S.setSetting(doc, "bpm", "91", { by: "earprint" });
    S.setSetting(doc, "key", "A minor", { by: "earprint" });
    S.setSetting(doc, "bpm_key_by", "earprint", { by: "earprint" });
  }),
  ideawizard: ideawizard && ((doc) => {
    const inp = ideawizard.specInputs(doc);
    const boxes = { style: inp.style?.text || "", structure: inp.structure?.text || "", earprint: inp.analysis?.text || "", steer: "hopeful" };
    const used = ideawizard.usedSections(inp, boxes);
    const st = iwPrompts.parseStructure(boxes.structure);
    const [idea] = iwPrompts.cleanIdeas({ ideas: [{ title: "Paper Lanterns", topic: "Letting go of a friendship", theme: "Quiet grief", subject: "Two friends", angle: "One lantern per unsaid thing", hook: "I let the light go up", imagery: ["lanterns"], why_it_fits: "Fits." }] });
    const plan = iwPrompts.cleanPlan({ logline: "A goodbye.", perspective: "First person", tone: "Tender", sections: [
      { tag: "[VERSE 1|wistful|soft vocals]", beat: "The unanswered message.", images: ["phone glow"], lines: 2, bars: 8, rhyme: "AB" },
    ], hook_ideas: ["h"], word_bank: ["w"], title_options: ["t"], avoid: ["a"] }, st);
    ideawizard.specWriteIdea(doc, { idea, plan, structure: st, inputs: boxes, used });
  }),
  lyricpad: lyricpad && ((doc) => {
    const inp = lyricpad.specInputs(doc);
    const chosen = inp.structure.options.find((o) => o.id === inp.structure.id);
    const boxes = { structureText: chosen?.body || "", topicText: inp.topic?.text || "" };
    lyricpad.specWriteLyrics(doc, { title: inp.title?.text || "Untitled", lyrics: "[VERSE 1|wistful|soft vocals]\nYour name still glows across my screen\nA message never sent", used: lyricpad.usedSections(inp, boxes) });
  }),
  "auralyrics-studio": (doc) => {
    // Read only: what "Use these lyrics" would put in the editor.
    const l = S.section(doc, "lyrics");
    if (l) assert.equal(S.stripTags(l.body).includes("["), false);
  },
};

// ---------- the check ----------

/** Everything a tool doesn't own, as raw text (sections: heading + body, trailing blank lines aside). */
function others(doc, tool) {
  const own = OWNS[tool];
  return {
    pre: doc.pre.join(""),
    fmOpen: doc.fm?.open, fmClose: doc.fm?.close,
    settings: (doc.fm?.items || []).filter((x) => !own.settings.includes(x.key) && x.key !== "schema_version").map((x) => x.line),
    sections: doc.sections.filter((s) => !own.sections.includes(s.id)).map((s) => (s.head + s.lines.join("")).replace(/(\r?\n)+$/, "")),
  };
}

const START = `---
schema_version: 1
# my own notes on settings
request: song
model: v6
weirdness: 0.35
x_custom: keep me
---

# Song spec

Free text before the first section, kept as is.

## Negative style
<!-- song-spec: by=person manual=yes -->
EDM drops, autotune

## My extra section
Hand-written, unknown to every tool.

## Notes
<!-- song-spec: by=person manual=yes -->
Try a male voice.
`;

let failed = 0, ran = 0;
function chain(name, start, order) {
  const tools = order.filter((t) => STEPS[t]);
  try {
    let text = start;
    for (const tool of tools) {
      const doc = S.parse(text); // every step reads the file fresh, like a real tool
      const before = others(doc, tool);
      STEPS[tool](doc);
      if (text) assert.deepEqual(others(doc, tool), before, `${tool} changed something it doesn't own`);
      // From an empty file, the first writer may create the settings block and "# Song spec" heading.
      else if (tool !== "auralyrics-studio") assert.match(S.serialize(doc), /^---\nschema_version: 1\n[\s\S]*---\n\n# Song spec\n/);
      const next = S.serialize(doc);
      assert.equal(S.serialize(S.parse(next)), next, `${tool}: the file doesn't round-trip`);
      if (tool === "auralyrics-studio") assert.equal(next, text, "AuraLyrics changed the file");
      text = next;
    }
    const end = S.parse(text);
    const errors = S.validate(end).filter((i) => i.level === "error");
    assert.deepEqual(errors, [], "the finished file has validation errors");
    for (const keep of ["EDM drops, autotune", "Hand-written, unknown to every tool.", "Try a male voice.", "x_custom: keep me", "# my own notes on settings", "Free text before the first section, kept as is."]) {
      if (start.includes(keep)) assert.ok(text.includes(keep), `lost: ${keep}`);
    }
    ran++;
    console.log(`ok       ${name}: ${tools.join(" → ")}`);
    return end;
  } catch (e) {
    failed++;
    console.log(`FAIL     ${name}: ${e.message}`);
    return null;
  }
}

const FORWARD = ["earprint", "gp-blueprint", "ideawizard", "lyricpad", "auralyrics-studio"];
chain("forward", START, FORWARD);
chain("reverse", START, [...FORWARD].reverse());
chain("forward, CRLF file", START.replace(/\n/g, "\r\n"), FORWARD);
chain("from an empty file", "", FORWARD);
chain("each tool twice", START, [...FORWARD, ...FORWARD]);
// Every order of the writing tools (4! = 24), then AuraLyrics.
const perms = (a) => (a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
for (const p of perms(["earprint", "gp-blueprint", "ideawizard", "lyricpad"])) chain(`order ${p.join(",")}`, START, [...p, "auralyrics-studio"]);

// A GP Blueprint rerun at the end flags what was built from its old structure, and Lyricpad then
// defaults to Blueprint's structure.
if (STEPS["gp-blueprint"] && STEPS.ideawizard && STEPS.lyricpad) {
  const end = chain("rerun GP Blueprint last", START, [...FORWARD, "gp-blueprint"]);
  try {
    // Change Blueprint's output so its structure hash moves.
    const doc = S.parse(S.serialize(end));
    S.setSection(doc, "structure", "92 BPM, A minor\n\n[CHORUS]\n8 bars, 20 secs, 4 lines.", { by: "gp-blueprint", at: "2099-01-01T00:00Z" });
    assert.match(S.staleNotes(doc, "idea-structure").join(" "), /older Structure/);
    assert.equal(S.pickStructure(doc).id, "structure");
    console.log("ok       a new Blueprint structure marks Idea structure out of date; Lyricpad picks Blueprint's");
  } catch (e) { failed++; console.log(`FAIL     staleness after a Blueprint rerun: ${e.message}`); }
}

console.log(`\n${ran} chains passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
