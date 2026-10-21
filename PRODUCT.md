# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: co-op and internship hiring.** Recruiters and hiring engineers deciding whether
  Areeb, a 2nd-year electrical engineering student at Ontario Tech University, can do
  digital logic, FPGA, computer hardware or audio DSP work. They arrive from a link, give
  the home page seconds, and judge depth from one project write-up.
- **Secondary: Ontario Tech students** arriving for the tools (PrereqFlow, OTU Calendar,
  Satisfactory Tools), which run as their own sites under the same address.
- **Areeb** is the only editor and maintains every page in Markdown and
  `site.config.yaml`, following `CONTENT_GUIDE.md`, without touching code.

## Product Purpose

A static portfolio that shows Areeb's degree projects and the small browser tools he has
built, each with the maths, code, timing and block diagrams the work needs. Success: a
hiring visitor reaches a project page from the first screen, reads far enough to judge the
engineering, and finds the contact links; a student finds a tool and opens it.

It is also the home of the shared design system (`public/design/`) that all four sites load
from `/design/`.

## Positioning

- Every page appears as its own Markdown source being typed out, block by block, and then
  switches to the finished page. A content page is never slower than 3 seconds, and any
  input finishes it.
- Diagrams (Mermaid, WaveDrom), KaTeX maths and highlighted code are produced at build
  time and follow the visitor's theme.
- One settings panel and one saved choice of theme, accent, corners, motion and night sky
  apply across the portfolio and all three tools.
- Nothing is fetched at runtime: no trackers, CDNs or font services.

## Operating Context

- Built with Astro and deployed by GitHub Actions to GitHub Pages; pushes to `main` deploy
  after unit tests and a browser check in Chromium and Firefox.
- The three tools live in sibling repos and are served at `/prereqflow/`, `/otucalendar/`
  and `/satisfactorytools/`; those paths are reserved here. Their own CSS keeps an offline
  fallback of the night and paper colours.
- Visitors may arrive on desktop or phone; the site is desktop-first.

## Capabilities and Constraints

- Pages are folders of Markdown under `content/`; the home page and site chrome come from
  `site.config.yaml`. Any feature Areeb can't change through those isn't finished.
- Markdown features: GFM tables, task lists and footnotes, images and figures, `::card`,
  `:::cards`, `:::note`, `:::warn`, KaTeX, Shiki code with titles, highlighted lines and a
  copy button, Mermaid and WaveDrom.
- Strict Content Security Policy (no inline scripts or styles; `style-src-attr` is the one
  loosening). OTU Calendar and Satisfactory Tools have stricter policies with no
  `style-src-attr`, so shared code never writes `style` attributes.
- Client JavaScript stays at or under 15 KB gzipped; no long tasks while typing.
- No new dependencies without Areeb's approval. Fonts are self-hosted.
- 15 themes, night first and default; every theme keeps WCAG AA text contrast, and the
  night theme's dimmest text keeps 4.5:1 over the brightest point of the star field.

## Brand Commitments

- Name: areeb, written lowercase in prose ("Hi, I'm areeb."). Wordmark: AREEB/ECE.
- mononoki stays for code, the typed Markdown source and figures in the tools (confirmed
  2026-10-20); prose may use a separate self-hosted open-licence text face.
- Voice: plain, short, first person; says what a thing does and how it was checked.

## Evidence on Hand

- Project: `content/projects/nand-alu/` (8-bit NAND-only ALU, 310 gates, exhaustively
  tested; tables, KaTeX, Mermaid, WaveDrom, Verilog).
- Tools: notes pages for PrereqFlow, OTU Calendar and Satisfactory Tools, written only
  from their READMEs.
- `content/_kitchen-sink/` is a hidden fixture labelled as example content.
- Contact links in `site.config.yaml` are `TODO` placeholders and must stay so until Areeb
  fills them. There are no testimonials, employers, grades, awards or metrics; never invent
  any.
- `content/projects/banner.jpg` is a placeholder; Areeb approved replacing it with a
  credited open-licence photo (2026-10-20).

## Product Principles

1. Get a hiring visitor to real engineering fast: projects lead, proof comes from the work
   itself (specs, tests, diagrams), never from claims.
2. Areeb keeps control: everything visible is editable through Markdown or the config.
3. One shared design system: change it once and all four sites follow.
4. Fast, private and quiet: nothing external, motion that can be skipped and switched off.
5. Readable for everyone: AA contrast in every theme, keyboard access, reduced motion.

## Accessibility & Inclusion

WCAG 2.2 AA: text contrast in every theme (tested), visible focus, full keyboard use of the
page tree and settings panel, blocks hidden during typing stay in the accessibility tree,
and `prefers-reduced-motion` or the settings switch turns typing and animation off.
