# CLAUDE.md

Areeb's portfolio, a static Astro site deployed to https://areeb-ece.github.io by GitHub
Actions. Areeb maintains the content himself (Markdown in `content/` plus
`site.config.yaml`) by following `CONTENT_GUIDE.md`. **Any change must keep that true:**
if a feature can only be changed by editing code, it isn't finished. Update
`CONTENT_GUIDE.md` whenever content-facing behaviour changes.

## Stack

- **Astro 7** with static output and `trailingSlash: "always"`. No UI framework, no
  Tailwind: hand-written CSS in `src/styles/` and vanilla ES-module client scripts in
  `src/client/`. Component CSS uses only the master tokens (`--fs-*`, `--sp-*`, `--dur-*`,
  colours): no raw sizes, colours or durations.
- **Type:** Libre Franklin (variable, self-hosted) for text; mononoki for code, the typed
  Markdown, the wordmark and table figures. Both come from `fonts` in `site.config.yaml`.
- **Design direction:** each page is a component datasheet laid on the night sky: a sheet
  with a title block closed by a heavy bar, section heads hanging in a gutter on wide
  sheets, datasheet tables, one bevelled corner (pin 1, `corner-shape` where supported)
  and drawn timing diagrams for missing banners. `PRODUCT.md` holds the product context.
- **Markdown:** our own unified pipeline (`src/lib/markdown/pipeline.ts`), not Astro's
  Markdown processor (Astro 7 defaults to Sätteri). It uses remark-parse, remark-gfm,
  remark-math, remark-directive, remark-rehype with custom handlers, rehype-katex and
  rehype-stringify.
- **Code:** Shiki with a custom theme whose colours are CSS variables
  (`src/lib/markdown/shiki.ts` ↔ `src/styles/code.css`).
- **Diagrams:**
  - Mermaid is rendered at **build time** in headless Chromium via Playwright
    (`src/lib/markdown/mermaid.ts`), cached in `node_modules/.cache/site-diagrams/` by a
    hash of source + Mermaid version + theme. Its literal night colours are then rewritten
    as CSS variables (`colorsToVars` in `src/lib/design.ts`) so diagrams follow the theme.
  - WaveDrom renders in Node (`src/lib/markdown/wavedrom.ts`).
- **TypeScript** for build code. It runs under Node's type stripping in tests and
  scripts, so use **erasable syntax only** (no enums, namespaces or parameter
  properties) and import with explicit `.ts` extensions.
- **Node ≥ 22.18.**

## Commands

```sh
npm run dev            # dev server (http://localhost:4321); drafts visible
npm test               # node --test "tests/*.test.ts" (unit tests, no browser)
npm run build          # astro build → dist/ (needs Chromium for Mermaid: npx playwright install chromium)
npm run test:browser   # tests/browser-check.js against dist/ (Playwright, Chromium)
BROWSER=firefox npm run test:browser   # same check in Firefox (CI runs both; Firefox can't be downloaded in cloud containers)
npm run check          # all three, as CI runs them
npm run new -- section/page-name "Title"
```

Playwright is pinned to **1.56.1** in package.json, as in otucalendar's CI. That version
matches the Chromium preinstalled in Claude Code cloud containers
(`/opt/pw-browsers/chromium-1194`). Don't bump it casually: newer versions want a browser
download.

## Folder map

```
site.config.yaml        home title/intro (Markdown), links, wordmark, fonts registry, reservedSlugs
content/                pages: <path>/index.md = /<path>/; home.md = extra home content; images live beside pages
public/                 fonts (Libre Franklin + mononoki, with OFL texts), icons (placeholders), favicon, js/boot.js (pre-paint, not bundled)
public/design/          SHARED WITH ALL FOUR SITES, served at /design/, not bundled:
                          tokens.css (the themes, then the shared scales: type, space, controls, motion,
                          layers and mixed colours), theme.js (pre-paint: applies saved settings),
                          ui.js + ui.css (gear, settings panel, night sky, and the sd- components:
                          buttons, fields, tables, cards, nav, tabs, notes, dialog, toast),
                          components.html + reference.css (the components' reference sheet)
src/lib/config.ts       site.config.yaml schema (astro/zod) → readable errors
src/lib/frontmatter.ts  frontmatter schema; errors name the file and field
src/lib/tree.ts         content/ → page tree: order, hidden, draft, banners, slug rules, reserved slugs
src/lib/site.ts         Astro-only loader (import.meta.glob): renders every page once per build
src/lib/card.ts         card + banner HTML (and the seeded timing-diagram fallback banner)
src/lib/markdown/       pipeline, shiki, mermaid, wavedrom, relaxed-json
src/pages/              index, [...slug], 404, fonts.css.ts, diagrams.css.ts
src/components/         Sidebar/TreeNodes (ARIA tree), Blocks, ChildList, ContactPanel, Sky, KatexStyles
src/client/             typing.js + timing.js (ALL timing constants), sidebar.js, copy.js, store.js
src/styles/             base, layout, page, prose, code, typing (colours come from public/design/tokens.css)
src/lib/design.ts       reads the master palette: themes (for tests), night colours + colorsToVars (Mermaid)
tests/                  *.test.ts (node --test), fixtures/, serve.js, browser-check.js (also checks
                          /design/components.html in every theme: contrast, focus rings, Tab order)
scripts/new-page.ts     the `new` command
```

## How the pieces fit

- Every top-level Markdown block becomes `<div class="b" data-src="…raw markdown…">`. The
  source is sliced from the file using mdast position offsets, and blocks are grouped
  *before* KaTeX runs (KaTeX drops positions). `typing.js` reads `data-src`.
- `public/design/theme.js` runs first and applies the visitor's settings from
  `localStorage["design.settings"]` (shared by all four sites, same origin): `data-theme`,
  `data-scheme` (dark/light, from the theme's color-scheme), `data-motion="off"`, and
  inline `--accent`/`--r*` overrides. It exposes `window.SiteDesign`; `ui.js` adds
  `set`, `reset`, `onChange`, `themes`, `open`. The theme list is read from the labelled
  `[data-theme]` blocks of tokens.css at runtime, so a new block is a new theme.
- `public/js/boot.js` adds `html.typing` (blocks visually hidden, still in the
  accessibility tree) only when JS runs, `data-typing` isn't `none`, reduced motion is
  off, the visitor hasn't turned typing or motion off in settings, and (for home)
  `sessionStorage` says the title hasn't played this visit.
- A content page's typing budget is ≤ 3 s whatever its length. The schedule is scaled
  down to fit (`contentSchedule`), and the unit tests check that.
- Build errors are `ContentError("file:line", message)` written for Areeb, saying how to
  fix the problem. Keep new errors in that style.

## Hard rules

- **One master palette for all four sites.** `public/design/tokens.css` (served at
  `/design/tokens.css`) holds every shared colour, radius and shadow, one block per theme
  (night first, the default). `tests/themes.test.ts` checks every theme for missing
  tokens and AA contrast.
  - The portfolio links it first (`src/layouts/Base.astro`).
  - `areeb-ece/prereqflow` and `areeb-ece/otucalendar` link it (and `ui.css`, `theme.js`,
    `ui.js`) after their own `css/style.css`, whose night/paper values and light/dark
    button (`js/theme.js`, `#btnTheme`) are only an offline fallback.
  - `areeb-ece/satisfactorytools` (made on 2026-10-19, on request) links them the same way.
  - Mermaid's theme is read from it at build time (`src/lib/design.ts`); star colours are
    CSS (`--star*`, falling back to `--ink`/`--c2`/`--c0`).
  - Anything in `public/design/` must work in all four sites: no `style="…"` attributes
    in markup (OTU Calendar's CSP has no `style-src-attr`; set styles through
    `el.style.setProperty`), `sd-` class prefixes, no dependencies, no new names that a
    site already defines (`--f`, `--sd`, `--cc`, `--c`, `--mix`…). Only add: never rename
    or remove a token, class, id, attribute or `SiteDesign` method the tools use. Their
    browser checks can load it with `DESIGN_DIR=../areeb-ece.github.io/public/design`.
  - New shared tokens go in the "Shared scales" part at the end of `tokens.css`, not in
    the theme blocks (the parsers in `src/lib/design.ts`, `tests/themes.test.ts` and the
    browser check read the theme selectors exactly). Mixed colours there are checked for
    contrast in every theme by `tests/themes.test.ts` (`derived()`).
  - Change colours there, never in component CSS. When you change it, also update the
    fallback copies in the three sibling repos so offline use matches.
- **Sibling repos: only with Areeb's say-so.** Don't edit, branch or open PRs on
  `areeb-ece/prereqflow` or `areeb-ece/otucalendar` unless he asks (he did, on
  2026-10-12, for the shared palette and then for the shared themes, settings and sky).
  The master files are now the source for the design: themes and scales in `tokens.css`,
  shared components (`sd-*`) in `ui.css`. The tools' own components predate them and
  move over only when Areeb asks (each `sd-` class is opt-in).
- **Their paths are reserved.** `/prereqflow/`, `/otucalendar/` and `/satisfactorytools/`
  are served by those repos' Pages sites. `reservedSlugs` in `site.config.yaml` blocks them; keep it that
  way.
- **CSP stays strict.** The CSP is hand-written in `src/layouts/Base.astro`, production
  only.
  - No inline `<script>` or `<style>`: `build.inlineStylesheets: "never"` and Vite
    `assetsInlineLimit: 0`.
  - The only loosening is `style-src-attr 'unsafe-inline'`, needed by KaTeX and Shiki.
  - CSS that would otherwise be inline goes in a file or an endpoint (`fonts.css`,
    `diagrams.css`).
  - The browser check fails on any CSP violation.
- **No external requests:** no CDNs, analytics, trackers or font services. Fonts are
  self-hosted.
- **Don't add dependencies without asking Areeb.** Unified utilities (walkers, slugger,
  meta parsing) are hand-written on purpose.
- **No personal contact details** beyond the `TODO` placeholders in `site.config.yaml`.
- **Don't invent project facts.** Tool pages use only what their READMEs say. Example
  content is labelled as such.
- **Desktop-first:** no horizontal scroll. The sidebar starts as a rail below 1024 px
  (unless the visitor opened it before) and below 760 px becomes a top bar whose menu
  opens the tree as a drawer (page behind made inert, Escape closes). Themes come from
  the gear menu; night is the default.
- **Contrast budget.** The default star brightness (`LAYERS` in `public/design/ui.js`)
  and the haze are capped so the night theme's `--ink-3` keeps 4.5:1 over the brightest
  possible sky. The browser check measures this. Re-run it after touching
  either.
- **Performance budget:** client JS ≤ 15 KB gzipped (checked), and no long tasks while
  typing.

## Conventions

- Match the existing voice: short comments that say *why*, plain-English error messages.
- Commit messages describe the change. PRs go to `main`. Pushes to `main` deploy
  (`.github/workflows/deploy.yml`), and PRs run the same tests without deploying.
