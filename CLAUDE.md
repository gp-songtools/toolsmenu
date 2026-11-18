# CLAUDE.md

## Project
- Static landing page linking every tool in the `gp-songtools` GitHub org
- No build step, no dependencies, no package.json
- Deployed via GitHub Pages: `main` branch, `/ (root)` → https://gp-songtools.github.io/toolsmenu/

## Directory map
- `index.html` — entire site: inline CSS, inline JS, `TOOLS` array
- `README.md` — tool table, add-a-tool and publishing steps
- `privacy.html` — Privacy & credits for every tool
- `about.html` + `img/` — About page (features, hand-offs) and its WebP screenshots
- `songspec/` — the song spec shared by all tools: `SPEC.md` (format), `songspec.js` (library; tools keep byte-identical copies, check with `check-copies.js`), `test.js` (`node songspec/test.js`), `example.songspec.md`
- `songspec/spec-to-suno/` — Spec to Suno: `index.html` (instructions page, menu card links here) and `spec-to-suno.html.download` (the owner's file, byte-identical, sha256 `2efe2127428e3ea335cf9711988d0d3a5909c431fc1bf608204c779f7c143422`; never edit, embed or link it as a page; offered only via `<a download="spec-to-suno.html">`; the `.download` name makes GitHub Pages serve it as a file)
- `CLAUDE.md` — this file; `main` = deploy branch; no `src/`, `dist/` or tests

## Commands
- Build: none
- JS syntax check:
  - `node -e 'const h=require("fs").readFileSync("index.html","utf8");new Function(h.match(/<script>([\s\S]*?)<\/script>/)[1])'`
- Serve locally (silent, background):
  - `python3 -m http.server 8000 >/dev/null 2>&1 &`
- Smoke test (needs server running; exits 1 on page errors or zero cards):
  - `node -e 'const{chromium}=require("playwright");(async()=>{const b=await chromium.launch(),p=await b.newPage(),e=[];p.on("pageerror",x=>e.push(x));await p.goto("http://localhost:8000/");const n=await p.locator(".card").count();await b.close();if(e.length||n<1){console.error(e,n);process.exit(1)}})()'`
- Stop server:
  - `pkill -f "http.server 8000"`

## Adding / editing a tool
- Edit the `TOOLS` array in `index.html` `<script>`
- Fields: `name`, `repo` (repo name in org), `icon` (emoji), `description`, `url` (live app), `changelog`
- `changelog`: hosted page > repo `CHANGELOG.md` > `https://github.com/gp-songtools/<repo>/commits/main/`
- Live app URL pattern: `https://gp-songtools.github.io/<repo>/`
- Mirror every change in the `README.md` tool table

## Current tools (names/descriptions from each repo's README)
- `lyricpad` — Lyricpad
- `gp-randomash` — Randomash (uses GP Mastering's stem splitter)
- `gp-blueprint` — GP Blueprint (formerly Suno Style Creator; never put "Suno" in its name)
- `ideawizard` — Idea Wizard (reads GP Blueprint's structure and Earprint's "Copy for Idea Wizard" text)
- `earprint` — Earprint
- `gp-master` — GP Mastering
- `auralyrics-studio` — AuraLyrics Studio

## Constraints
- No frameworks, bundlers, or external scripts, except the Cloudflare Web Analytics snippet
- Every page ends with the Cloudflare Web Analytics snippet (token `2c5b0c69f74b496998f02d0e1f651bd5`, one site for all of `gp-songtools.github.io`)
- `privacy.html` — suite-wide Privacy & credits page that every tool links to; update it when any tool changes what it sends, stores or credits
- `about.html` — sells the suite: per-tool highlights and the hand-offs between tools; keep claims true to each app (exact button names) and update it when a tool gains a headline feature, a new hand-off, or a new tool joins
- Cards render via `textContent`, not `innerHTML`, for tool data
- Colors are CSS vars on `:root`; dark mode via `prefers-color-scheme`
- Layout must work at 390px width with no horizontal scroll
- Links open in new tab with `rel="noopener"`

# Multi-Agent Delegation Rules
When acting as the primary session (Opus), operate as a **Tech Lead and Architect**. Conserve primary context and rate limits by delegating execution work to specialized subagents whenever possible.
## Available Subagents
1. **`haiku-helper` (Fast Scout & Clerk)**
- **When to delegate:** File discovery, searching across the codebase (`Grep`/`Glob`), checking git status or commit logs, reading configuration files, and summarizing documentation.
- **Constraint:** Read-only tasks. Do not ask `haiku-helper` to write or edit code.
2. **`sonnet-worker` (Builder & Tester)**
- **When to delegate:** Implementing features from a finalized specification, writing unit or integration tests, refactoring isolated modules, fixing localized bugs, and running test/build suites.
- **Constraint:** Always provide clear requirements, target file paths, and expected behavior when invoking `sonnet-worker`.
## Orchestration Workflow
1. **Explore First:** Before planning changes, dispatch `haiku-helper` to locate relevant files and summarize existing patterns.
2. **Design & Plan:** Synthesize the findings in the main session and outline the architectural plan or edge cases.
3. **Delegate Implementation:** Hand off well-scoped coding, refactoring, and test-writing tasks to `sonnet-worker`. You may launch multiple `sonnet-worker` instances in parallel for independent modules.
4. **Review & Verify:** Inspect the changes made by `sonnet-worker` (or have `haiku-helper` summarize `git diff`) to ensure architectural alignment before concluding the task.
