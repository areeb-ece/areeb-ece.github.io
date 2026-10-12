# areeb-ece.github.io

**Live: [areeb-ece.github.io](https://areeb-ece.github.io/)** · made by areeb

My portfolio: degree projects in digital logic, FPGA design, computer hardware and
audio DSP, plus the small tools I've built. Every page appears as its own Markdown being
typed out, block by block, and then switches to the finished page.

It's a static site built with [Astro](https://astro.build). Pages are folders of
Markdown, the home page and site chrome come from one YAML file, and the result is plain
HTML, CSS and a few kilobytes of JavaScript. Nothing is fetched at runtime and there are
no trackers.

---

## Purpose

1. **Show my work.** Degree projects and smaller tools, each with a banner, maths, code,
   timing diagrams and block diagrams where they help.
2. **Stay easy to maintain.** Adding a page, a category, a link or a new intro is an edit
   to Markdown or to `site.config.yaml`. No component code needs to change.

How to do each of those, with examples you can copy, is in
**[CONTENT_GUIDE.md](CONTENT_GUIDE.md)**.

## Getting started

```sh
git clone https://github.com/areeb-ece/areeb-ece.github.io.git
cd areeb-ece.github.io
npm install
npx playwright install chromium   # once: Mermaid diagrams are drawn in a headless browser at build time
npm run dev                       # http://localhost:4321, reloads as you edit
```

```sh
npm run new -- projects/my-new-thing "My New Thing"   # new page with commented frontmatter
npm test                                              # unit tests (node --test)
npm run build                                         # static site in dist/
npm run test:browser                                  # end-to-end check of dist/ in Chromium
BROWSER=firefox npm run test:browser                  # the same check in Firefox (npx playwright install firefox)
npm run check                                         # all three, the way CI runs them
```

Pushing to `main` runs the tests and the browser check (in Chromium and Firefox), builds the site and publishes
it to GitHub Pages (`.github/workflows/deploy.yml`). Pull requests run the same checks
without deploying. If a test fails, nothing is published.

## How it's put together

```
site.config.yaml          wordmark, home title + intro, contact links, fonts, reserved slugs
content/                  the pages: every folder with an index.md is a page (and a sidebar entry)
public/                   copied as-is: fonts (mononoki, OFL), contact icons, favicon, boot.js
src/lib/                  build code: config + frontmatter schemas, page tree, Markdown pipeline
src/lib/markdown/         unified pipeline, Shiki theme, KaTeX, Mermaid and WaveDrom renderers
src/client/               the browser scripts: typing animation (timing.js has every constant),
                          sidebar tree, night-sky parallax, copy buttons
src/styles/               the PrereqFlow / OTU Calendar sheet: tokens, components, prose, code, sky
src/pages/                routes: home, every content page, 404, generated fonts.css,
                          diagrams.css and the star tiles
scripts/new-page.ts       npm run new
tests/                    unit tests, fixtures and the Playwright browser check
```

### Markdown

Each page goes through one [unified](https://unifiedjs.com) pipeline at build time:
GFM (tables, task lists, footnotes), KaTeX maths, `::card` / `:::note` directives, Shiki
syntax highlighting with a theme built from the site's colour tokens, and Mermaid and
WaveDrom diagrams rendered to inline SVG. Every top-level block keeps its original
Markdown, sliced from the file using the parser's positions, which is what the typing
animation types before swapping in the rendered block.

Mistakes fail the build with the file and the problem: a card pointing at a page that
doesn't exist, a misspelled frontmatter field, an image that isn't there, a folder name
that can't be a web address. Maths and diagram syntax errors show up as a red box on the
page instead, so one typo doesn't block a deploy.

### Typing animation

The pages are complete HTML. With JavaScript running, a small script hides each block
(visually only; screen readers still get the whole page) and types its source in its
place, all in one `requestAnimationFrame` loop over precomputed timestamps. A content
page picks a speed of 600–1200 wpm and a 1–3 s budget on every load, and long pages
speed up to fit, so no page takes longer than 3 s. The home title types at 100–250 wpm
after the cursor blinks alone for a second, once per visit. Any click, key or scroll
finishes it. With JavaScript off, `animate: false` or reduced motion, the page shows
straight away. Every timing constant is in `src/client/timing.js`.

### Background

Three layers of stars, generated from a fixed seed at build time as tiling SVGs, drift
over several minutes and follow a fraction of the scroll. The aurora glow from PrereqFlow
and OTU Calendar sits behind them. Only transforms animate, the sky pauses in hidden
tabs, and it holds still with reduced motion. Star brightness is capped so the dimmest
text colour keeps WCAG AA contrast over any point of the sky, and the browser check
measures it.

## Privacy and security

- **Strict Content Security Policy** on every page: scripts, styles, fonts and images
  only from this site, and `connect-src 'none'`. The one loosening is
  `style-src-attr 'unsafe-inline'`, because KaTeX and the code highlighter position and
  colour text with `style` attributes. Attributes can't run code, and `<style>` and
  `<script>` stay locked down.
- **No inline scripts.** `public/js/boot.js` runs before first paint as a file. The
  other scripts are bundled modules.
- **Nothing external.** mononoki and KaTeX's fonts are self-hosted, there are no CDNs, no
  analytics and no third-party requests. The browser check asserts there are no CSP
  violations.

## Credits

- [mononoki](https://github.com/madmalik/mononoki) by Matthias Tellen, SIL Open Font
  License (`public/fonts/OFL-mononoki.txt`)
- [Astro](https://astro.build), [unified](https://unifiedjs.com),
  [KaTeX](https://katex.org), [Shiki](https://shiki.style),
  [Mermaid](https://mermaid.js.org), [WaveDrom](https://wavedrom.com)
- Look and feel from [PrereqFlow](https://areeb-ece.github.io/prereqflow/) and
  [OTU Calendar](https://areeb-ece.github.io/otucalendar/)
