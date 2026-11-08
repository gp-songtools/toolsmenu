# CLAUDE.md

## Project
- Static landing page linking every tool in the `gp-songtools` GitHub org
- No build step, no dependencies, no package.json
- Deployed via GitHub Pages: `main` branch, `/ (root)` → https://gp-songtools.github.io/toolsmenu/

## Directory map
- `index.html` — entire site: inline CSS, inline JS, `TOOLS` array
- `README.md` — tool table, add-a-tool and publishing steps
- `CLAUDE.md` — this file
- `.git/` — `main` = deploy branch
- (no other dirs; no `src/`, `dist/`, or tests)

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
- Fields: `name`, `repo` (repo name in org), `icon` (emoji), `description`, `url` (live app)
- Live app URL pattern: `https://gp-songtools.github.io/<repo>/`
- Mirror every change in the `README.md` tool table

## Current tools (names/descriptions from each repo's README)
- `lyricpad` — Lyricpad
- `suno-style-creator` — Suno Style Creator
- `earprint` — Earprint
- `gp-master` — GP Mastering

## Constraints
- Keep it single-file; no frameworks, bundlers, or external scripts
- Cards render via `textContent`, not `innerHTML`, for tool data
- Colors are CSS vars on `:root`; dark mode via `prefers-color-scheme`
- Layout must work at 390px width with no horizontal scroll
- Links open in new tab with `rel="noopener"`
