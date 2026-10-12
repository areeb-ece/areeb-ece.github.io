# CLAUDE.md

Areeb's portfolio, a static Astro site deployed to https://areeb-ece.github.io by GitHub
Actions. Areeb maintains the content himself (Markdown in `content/` plus
`site.config.yaml`) by following `CONTENT_GUIDE.md`. **Any change must keep that true:**
if a feature can only be changed by editing code, it isn't finished. Update
`CONTENT_GUIDE.md` whenever content-facing behaviour changes.

## Stack

- **Astro 7** with static output and `trailingSlash: "always"`. No UI framework, no
  Tailwind: hand-written CSS in `src/styles/` and vanilla ES-module client scripts in
  `src/client/`.
- **Markdown:** our own unified pipeline (`src/lib/markdown/pipeline.ts`), not Astro's
  Markdown processor (Astro 7 defaults to Sätteri). It uses remark-parse, remark-gfm,
  remark-math, remark-directive, remark-rehype with custom handlers, rehype-katex and
  rehype-stringify.
- **Code:** Shiki with a custom theme whose colours are CSS variables
  (`src/lib/markdown/shiki.ts` ↔ `src/styles/code.css`).
- **Diagrams:**
  - Mermaid is rendered at **build time** in headless Chromium via Playwright
    (`src/lib/markdown/mermaid.ts`), cached in `node_modules/.cache/site-diagrams/` by a
    hash of source + Mermaid version + theme.
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
public/                 fonts (mononoki + OFL), icons (placeholders), favicon, js/boot.js (pre-paint, not bundled)
src/lib/config.ts       site.config.yaml schema (astro/zod) → readable errors
src/lib/frontmatter.ts  frontmatter schema; errors name the file and field
src/lib/tree.ts         content/ → page tree: order, hidden, draft, banners, slug rules, reserved slugs
src/lib/site.ts         Astro-only loader (import.meta.glob): renders every page once per build
src/lib/card.ts         card + banner HTML (also seeded fallback gradient)
src/lib/stars.ts        seeded star tiles + layer parameters (drift, parallax)
src/lib/markdown/       pipeline, shiki, mermaid, wavedrom, relaxed-json
src/pages/              index, [...slug], 404, fonts.css.ts, diagrams.css.ts, sky/[layer].svg.ts
src/components/         Sidebar/TreeNodes (ARIA tree), Blocks, ChildList, ContactPanel, Sky, KatexStyles
src/client/             typing.js + timing.js (ALL timing constants), sidebar.js, sky.js, copy.js, store.js
src/styles/             tokens (night + unused light), base, layout, page, prose, code, typing, sky
tests/                  *.test.ts (node --test), fixtures/, serve.js, browser-check.js
scripts/new-page.ts     the `new` command
```

## How the pieces fit

- Every top-level Markdown block becomes `<div class="b" data-src="…raw markdown…">`. The
  source is sliced from the file using mdast position offsets, and blocks are grouped
  *before* KaTeX runs (KaTeX drops positions). `typing.js` reads `data-src`.
- `public/js/boot.js` adds `html.typing` (blocks visually hidden, still in the
  accessibility tree) only when JS runs, `data-typing` isn't `none`, reduced motion is
  off, and (for home) `sessionStorage` says the title hasn't played this visit.
- A content page's typing budget is ≤ 3 s whatever its length. The schedule is scaled
  down to fit (`contentSchedule`), and the unit tests check that.
- Build errors are `ContentError("file:line", message)` written for Areeb, saying how to
  fix the problem. Keep new errors in that style.

## Hard rules

- **Design references are read-only.** `areeb-ece/prereqflow` and
  `areeb-ece/otucalendar` are sibling sites: never edit, commit to, branch, or open
  issues or PRs on them.
  - otucalendar's `css/style.css` is the primary source for tokens and components.
  - prereqflow gave the `.card` sheen, the aurora and the `--h*` hues.
- **Their paths are reserved.** `/prereqflow/` and `/otucalendar/` are served by those
  repos' Pages sites. `reservedSlugs` in `site.config.yaml` blocks them; keep it that
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
- **v1 scope:** night theme only (light tokens exist, no toggle) and desktop-first (no
  horizontal scroll, the sidebar collapses to a rail below 760 px).
- **Contrast budget.** Star brightness (`SKY` in `src/lib/stars.ts`) and the haze are
  capped so `--ink-3` (#98948C, one step lighter than the sibling sites) keeps 4.5:1 over
  the brightest possible sky. The browser check measures this. Re-run it after touching
  either.
- **Performance budget:** client JS ≤ 15 KB gzipped (checked), and no long tasks while
  typing.

## Conventions

- Match the existing voice: short comments that say *why*, plain-English error messages.
- Commit messages describe the change. PRs go to `main`. Pushes to `main` deploy
  (`.github/workflows/deploy.yml`), and PRs run the same tests without deploying.
