---
saved-at: 2026-11-20T04:52:15Z
saved-at-sha: 3a0f571
saved-at-branch: claude/great-fermat-ywiog0
saved-from-cwd: /home/user/toolsmenu
---

- **Pick up:** the Impeccable skill (`.claude/skills/impeccable/`) now loads in this repo. Ask the owner whether to run `/impeccable init` (writes `PRODUCT.md`) and then a review such as `/impeccable critique` or `/impeccable audit` on the menu (`index.html`) and `about.html`. Don't start redesigning without that go-ahead.
- **Read first:** `CLAUDE.md`, then `design-system/gp-song-tools/MASTER.md` (the current "Midnight session" design system) and `css/gp.css` (its tokens, linked by every page). Any design change follows MASTER.md and updates it and gp.css together.
- **Constraints:** this is a design-only site. Keep copy, features and the `TOOLS` data exactly as they are unless the owner asks. Fonts stay self-hosted (no third-party requests besides the Cloudflare snippet). Numbers and small text use Atkinson Hyperlegible Next, 14px minimum. Emoji tool icons were kept on purpose (content); swapping them for SVG is the owner's call.
- **Branches:** work on `claude/great-fermat-ywiog0`; push to `main` only when the owner says "merge it to main" (fast-forward, then check the Pages run). The Impeccable skill commit is on the branch but not yet on `main`; merging it publishes `.claude/skills/` on Pages (about 2.4 MB), which the owner knows.
- **Not done:** `npx impeccable install` and its edit hook were deliberately not set up. Offer it only if the owner wants automatic slop checks.
- **Open question:** Randomash's "Download song spec (loop)" (gp-randomash `main`) is live; nothing pending there.
