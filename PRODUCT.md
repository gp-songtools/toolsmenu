# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Hobbyist and indie songwriters who make songs with AI music generators (mainly Suno). They land on the menu to pick the tool for the next step of a song: style prompt, lyrics, analysis, mastering, visuals, video.

## Product Purpose
GP Song Tools is a suite of small browser tools plus this static menu and About page that link them. The menu gets a songwriter to the right tool quickly; About explains each tool and the hand-offs between them. Success: a visitor opens the right tool, or understands how one song moves from idea to finished video.

## Positioning
Two things a neighbouring collection could not truthfully claim: the tools hand work to each other through a shared song spec file (one song moves from idea to lyrics to master to video), and everything runs in the browser with no backend or accounts, with keys kept on the device.

## Operating Context
Static site on GitHub Pages (`main`, root), no build step, no dependencies. Tools: Lyricpad, GP Blueprint, Idea Wizard, Randomash, Earprint, GP Mastering, AuraLyrics Studio, GP Producer, Framecut, Spec to Suno. Each tool lives in its own repo in the `gp-songtools` org.

## Capabilities and Constraints
- Design-only work: copy, features and the `TOOLS` array stay as they are unless the owner asks.
- No frameworks, bundlers or external scripts except the Cloudflare Web Analytics snippet; fonts self-hosted.
- Design follows `design-system/gp-song-tools/MASTER.md` and `css/gp.css`; changes update both.
- Numbers and small text use Atkinson Hyperlegible Next, 14px minimum; layout works at 390px with no horizontal scroll.
- Emoji tool icons are kept on purpose; replacing them is the owner's call.

## Brand Commitments
Name "GP Song Tools"; per-tool colours (`--bp`, `--iw`, `--lp`, `--rm`, `--ep`, `--gm`, `--al`, `--pr`, `--fc`, `--ss`); the "Midnight session" design system. GP Blueprint's name never includes "Suno".

## Evidence on Hand
Real WebP screenshots of the tools in `img/` (used on About). No testimonials, user counts or benchmarks exist; do not invent them.

## Product Principles
- Get the visitor to the right tool fast.
- Show how the tools connect, not just a list.
- Claims stay true to each app (exact button names).
- Private by default: nothing sent beyond what privacy.html states.
- Design changes follow the design system and keep content intact.

## Accessibility & Inclusion
14px minimum text, Atkinson Hyperlegible Next for small text and numbers, 3:1+ tool colours on the surface, light and dark via `prefers-color-scheme`.
