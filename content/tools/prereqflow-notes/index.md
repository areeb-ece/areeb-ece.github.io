---
title: PrereqFlow
description: Course prerequisite flowcharts in the browser, with all 16 Ontario Tech engineering program maps built in.
order: 10
---

**Live: [areeb-ece.github.io/prereqflow](https://areeb-ece.github.io/prereqflow/)** ·
source on [GitHub](https://github.com/areeb-ece/prereqflow)

Course prerequisite flowcharts in the browser. Every course is a card and every
prerequisite is a link, so you can see what a course needs and what it unlocks.

All **16 Ontario Tech University engineering program maps (2026–2027)** are built in:
158 courses and 266 prerequisite links. You can also bring your own courses as typed
lines or as a JSON/CSV file exported from PrereqFlow earlier.

## Why

University program maps list courses by semester, but they hide the dependency
structure. PrereqFlow draws that structure so you can:

- see the full prerequisite chain behind a course, and everything it unlocks
- check whether a missed or failed course delays later semesters
- compare programs and specializations that share courses
- export a clean, high-resolution flowchart for planning or presentation

## How it works

- **Two layouts.** *Semesters* puts courses in the semester columns of the program
  map. *Free flow* ignores semesters and builds the columns from the prerequisite
  graph, so every prerequisite is always left of the courses that need it.
- **Layered graph drawing.** The layout is Sugiyama-style: longest-path layering,
  lanes bundled per source course, barycentre ordering to reduce crossings, and
  isotonic regression for vertical placement.
- **Export.** PNG at up to 6×, or SVG with the font embedded, on a dark or a light
  sheet. Course data exports as JSON, CSV or text lines and imports back in.

It's a static site with no build step, no framework and no server. Sessions are
saved in your browser's `localStorage` only.
