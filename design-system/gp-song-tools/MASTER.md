# GP Song Tools design system (Master)

The source of truth for how every page in this repo looks. The tokens live in [`css/gp.css`](../../css/gp.css), which every page links; this file explains them. Change both together.

Page-specific deviations go in `pages/<page>.md` next to this file. A page file, when present, overrides this one. There are none yet: every page follows the Master.

- **Product:** the landing page for a complete, end-to-end set of AI music tools: song design, lyrics, generation, analysis, mastering and lyric-video visualization, all in the browser.
- **Audience:** songwriters and producers, hobbyist to semi-pro, often making music late at night.
- **Feel:** cutting edge, modern and creative, without the generic look of most AI landing pages.
- **Made with:** the ui-ux-pro-max skill (2026-11-20). How each decision was reached is under [Provenance](#provenance).

## 1. UI style: Midnight session

Dark first, based on the skill's **Dark Mode (OLED)** style (recommended for entertainment and low-light use): midnight blues instead of pure black, panels in layers, high-contrast text, and bright colours kept for meaning. There is a light theme designed alongside it, chosen by `prefers-color-scheme`.

The one signature idea: **each tool has a colour, like a track in a music app.** That colour marks the tool's lane on the menu, its step in the workflow, its tag, its route chips and its share of the hero spectrum. Everything else stays quiet: indigo lines, flat panels, no gradients, no glow except on the main button's hover.

## 2. Colour palette

Base palette from the skill's **Music Streaming** profile ("dark audio + play green"), with the light theme paired to it.

### Roles

| Role | Token | Dark | Light | Use |
|---|---|---|---|---|
| Background | `--bg` | `#0F0F23` Midnight | `#F5F5FB` | Page |
| Surface | `--surface` | `#1B1B30` Panel | `#FFFFFF` | Cards, lanes, panels |
| Surface 2 | `--surface-2` | `#27273B` | `#ECECF7` | Hover, quoted text, code |
| Border | `--border` | `#312E81` Indigo line | `#D6D5F0` | Decorative outlines |
| Border strong | `--border-strong` | `#6B67C7` | `#7471B8` | Inputs, secondary buttons (3:1 or more) |
| Text | `--text` | `#F8FAFC` | `#0F0F23` | Body and headings |
| Muted | `--muted` | `#A3ADC2` | `#4B5068` | Secondary text |
| Link | `--link` | `#A5B4FC` | `#4338CA` | Inline links |
| Primary (brand) | `--primary` | `#4338CA` Indigo | `#4338CA` | Brand marks, quote bars |
| Accent (action) | `--accent` | `#22C55E` Play green | `#15803D` | The main action on a page; nothing decorative |
| On accent | `--on-accent` | `#0F172A` | `#FFFFFF` | Text on accent |
| Focus ring | `--ring` | `#F8FAFC` | `#1E1B4B` | 3px outline, 3px offset |

### Contrast (checked)

| Pair | Dark | Light |
|---|---|---|
| Text on background / surface | 18.0 / 16.1 | 17.4 / 18.9 |
| Muted on background / surface / surface 2 | 8.4 / 7.5 / 6.5 | 7.3 / 7.9 / 6.8 |
| Link on background | 9.5 | 7.3 |
| Text on accent button | 7.8 | 5.0 |
| Input outline on its background | 3.5 | 4.0 |
| Focus ring on background | 18.0 | 14.7 |

## 3. Chart and tool colours

The tool colours are the categorical palette for anything chart-like: the hero spectrum, the workflow, route chips, and any future chart. Order follows the workflow.

| Tool | Token | Dark | Light | On dark / light surface |
|---|---|---|---|---|
| GP Blueprint | `--bp` | `#A78BFA` | `#7C3AED` | 6.2 / 5.7 |
| Idea Wizard | `--iw` | `#60A5FA` | `#2563EB` | 6.6 / 5.2 |
| Lyricpad | `--lp` | `#FB923C` | `#C2410C` | 7.5 / 5.2 |
| Randomash | `--rm` | `#FACC15` | `#A16207` | 11.0 / 4.9 |
| Earprint | `--ep` | `#F472B6` | `#DB2777` | 6.4 / 4.6 |
| GP Mastering | `--gm` | `#2DD4BF` | `#0F766E` | 9.1 / 5.5 |
| AuraLyrics Studio | `--al` | `#E879F9` | `#C026D3` | 6.9 / 4.7 |
| Spec to Suno | `--ss` | `#22C55E` | `#15803D` | 7.4 / 5.0 |
| Neutral / other | `--gen` | `#A3ADC2` | `#4B5068` | 7.5 / 7.9 |

Rules (from the skill's chart guidance):
- Every colour clears 3:1 against the surface it sits on, so it works for marks; all clear 4.5:1, so they also work as text.
- Never let colour carry meaning alone: every coloured element sits next to the tool's name.
- Text on a filled tool colour: `#0F0F23` in dark mode (6.9:1 or better), `#FFFFFF` in light mode (4.6:1 or better).
- Tints: mix the tool colour into the surface (`color-mix(in srgb, var(--c) 10–16%, var(--surface))`) for clip backgrounds; 40–55% for their outlines.
- For a sequential scale (one measure, low to high), step from `--border` through `--primary` to `--accent`. For more than 8 categories, use a bar chart with direct labels instead of more hues.
- Gridlines use `--border`; values and axis labels use the body font (see 4).

## 4. Typography

| Role | Font | Weights | Where |
|---|---|---|---|
| Headings | **Space Grotesk** | 600–700 | `h1`–`h3`, tool names, workflow names |
| Body, small text, numbers | **Atkinson Hyperlegible Next** | 400, 700 | Everything else |

- **Numbers are always Atkinson Hyperlegible Next.** It was designed by the Braille Institute so similar characters can't be confused (1 l I, 0 O, 5 S, 8 B). Even inside headings, digits come from it: the heading family `GP Display` is Space Grotesk for letters with Atkinson's digits (a `unicode-range` split in `css/gp.css`). Both `GP Display` faces must declare the same `font-weight` range (300 700): with different ranges Chromium picked only the digits face and headings fell back to the system font.
- Small text never goes below **14px** (`--text-xs`) and is never set in a light weight.
- Both fonts are self-hosted from `fonts/` (latin subset, SIL Open Font License), so no page asks Google for them.
- `font-display: swap` on every face.

### Type scale

| Token | Size | Use |
|---|---|---|
| `--text-xs` | 14px | Captions, step labels, chips, footer |
| `--text-sm` | 15px | Card descriptions, buttons |
| `--text-md` | 16px | Body (17px on About and reading pages from 561px up) |
| `--text-lg` | 18px | Ledes, pitches |
| `--text-xl` | 22px | Card and hand-off titles |
| `--text-2xl` | 28px | Tool titles, reading-page sections |
| `--text-3xl` | 30–40px | Section headings |
| `--text-4xl` | 38–64px | Page titles |

Headings: line-height 1.0–1.2, tracking −0.02 to −0.035em, `text-wrap: balance`. Body: line-height 1.6 (1.7 on reading pages), 60–70 characters per line.

## 5. Spacing, shape and layout

**Spacing (4pt scale):** `--s-1` 4 · `--s-2` 8 · `--s-3` 12 · `--s-4` 16 · `--s-5` 24 · `--s-6` 32 · `--s-7` 48 · `--s-8` 64 · `--s-9` 96 (px). Use only these.

**Radius, by hierarchy:** `--r-sm` 6 (code) · `--r-md` 10 (buttons, inputs, workflow clips) · `--r-lg` 14 (cards, panels, screenshots) · `--r-xl` 20 (closing panel) · `--r-pill` (tags, chips).

**Layout:** content 1120px wide on the menu and About, 780px on reading pages; 16px side gutter; breakpoints at 900 and 560px; no horizontal scroll at 375–390px.

## 6. Components

### Buttons
- **Primary** (`.btn.primary`): `--accent` fill, `--on-accent` text, 700 weight, 44px tall, `--r-md`. Hover: lighter (dark) or darker (light) green plus a soft glow. One per view.
- **Tool open button** (menu lanes only): the same button filled with the lane's tool colour, so eight green buttons don't compete.
- **Secondary** (`.btn.ghost`): transparent, `--border-strong` outline, `--text`. Hover: `--surface-2`. In menu lanes it drops the outline and tints on hover.
- Every button is at least 44px tall, has a visible focus ring, and moves 1px on press. Transitions 150ms on colour only.

### Cards
- **Tool lane** (menu): `--surface`, 1px `--border`, a 4px left edge in the tool colour, `--r-lg`. Hover: `--surface-2` and the border takes the tool colour. Icon tile: 56px, tool colour mixed 16% into the background.
- **Panel** (hand-offs, principles, reading-page boxes): `--surface`, 1px `--border`, `--r-lg`, 24px padding. No shadow.
- **Workflow clip** (About): tool-tinted surface, 4px top edge in the tool colour, `--r-md`.
- **Chips** (route pills, tags): pill, tool tint, dot in the tool colour, 14px bold text.

### Inputs
44px tall, `--surface`, 1px `--border-strong`, `--r-md`, 16px text (no zoom on iOS).

## 7. Motion

- One orchestrated moment: the menu's spectrum bars rise once on load (700ms, staggered 9ms per bar, `transform` only).
- Everything else is feedback to the user: 150ms colour changes on hover and focus.
- `prefers-reduced-motion: reduce` turns all of it off (`css/gp.css`), and the spectrum is then drawn in its final state.

## 8. Anti-patterns for an AI music tools site

Avoid:
- **Purple-to-pink gradient washes** and "AI glow" on everything. Glow is for the primary button's hover only.
- **Pure `#000` backgrounds with white text at full brightness**: harsh in a dark studio. Use Midnight `#0F0F23` and `#F8FAFC`.
- **Fake waveforms that loop forever**, autoplaying audio or video, or visualizers that move without the user doing anything. One load animation, no loops.
- **Robots, brains, sparkles and circuit imagery** for "AI". Show the real tools: screenshots, real button names.
- **Thin or condensed fonts for numbers**, or small text under 14px. BPM, keys, prices and versions use Atkinson Hyperlegible Next.
- **Monospace for prose or labels**. Monospace is only for code and file names.
- **Grey-on-grey** secondary text below 4.5:1, or muted text on tinted panels without checking contrast.
- **Colour as the only signal**: a tool's colour always sits next to its name.
- **Neon tool colours on light backgrounds**: light mode uses the darker set in section 3.
- **More than one primary action per view**, or green used decoratively.
- **Identical cards with the same shadow everywhere**: use radius by hierarchy, borders instead of shadows.
- **Hover-only information**: everything must work by tap and keyboard.
- **Third-party font or script requests** beyond the shared analytics snippet: fonts are self-hosted.
- **Tiny tap targets**: buttons and back links are at least 44px tall.

## 9. Pre-delivery checklist

- [ ] Links `css/gp.css` and uses tokens, not raw hex, in page styles
- [ ] Contrast checked in both themes (text 4.5:1, controls and marks 3:1)
- [ ] Visible focus ring on every link, button and input; tab order follows the page
- [ ] Works at 375–390px, 768px and 1280px+ with no horizontal scroll
- [ ] Reduced motion: nothing animates
- [ ] Numbers and small text render in Atkinson Hyperlegible Next
- [ ] Ends with the Cloudflare Web Analytics snippet; external links open in a new tab with `rel="noopener"`

## Exceptions

- **Emoji tool icons.** The skill says not to use emoji as icons. The menu's icons are emoji from the `TOOLS` data, and the About page's principles use emoji. They stay, because the content was not to change. They are decorative (`aria-hidden`), always next to the tool's name, and sit in a tinted tile so they read as part of the system. Replacing them with SVG icons is a content change for the owner to decide.

## Provenance

Sources from the ui-ux-pro-max skill (its bundled search, 2026-11-20):

| Decision | Source | Status |
|---|---|---|
| Product-wide `--design-system` result | "AI music production creative tools landing" → Minimalism & Swiss, neutral greys | Rejected: not music-specific, not "cutting edge" |
| Retry with music terms, variance 8 | "music production studio creative" → Brutalism, pure black and white | Rejected: off-brief; the skill says not to persist unverified output |
| Colour palette | `--domain color` "music streaming" → **Music Streaming** (`#0F0F23`, `#1B1B30`, `#312E81`, `#4338CA`, `#22C55E`, `#F8FAFC`) | Used; light theme and muted text added and contrast-checked |
| Style | `--domain style` "dark mode vibrant" → **Dark Mode (OLED)** | Used, with a paired light theme |
| Heading font | `--domain typography` "music audio" (Kinetic Brutalism: Space Grotesk for music/culture apps) and "modern creative tech" (Tech Startup: Space Grotesk for AI products) | Used |
| Body and number font | `--domain typography` "accessible readable legibility" (Atkinson Hyperlegible) and `--domain google-fonts` (Atkinson family) | Used, in its newer variable version, Atkinson Hyperlegible Next |
| Chart rules | `--domain chart` and the skill's chart and colour quick reference | Applied in section 3 |
| Accessibility, touch, motion, layout | The skill's Quick Reference sections 1–7 | Applied throughout and in section 9 |
