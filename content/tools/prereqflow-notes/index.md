---
title: PrereqFlow
description: Course structures and prerequisite trees, with the courses open to you next.
bannerAlt: "PrereqFlow showing the Electrical Engineering program map, with one course's prerequisites and the courses it unlocks traced"
order: 10
---

::tool{live="https://areeb-ece.github.io/prereqflow/" name="PREREQ/FLOW" repo="https://github.com/areeb-ece/prereqflow"}

PrereqFlow maps a program's course structure and the prerequisite tree behind every
course. Mark the courses you've completed and it shows what's open to you next. I made
it to make my course planning easier: courses in my program often depend on several
others, and planning is much simpler when I can see those trees.

- All 16 Ontario Tech engineering program maps (2026–2027) built in, or your own courses
  as typed lines or a JSON / CSV file
- Prerequisite trees
  - Hover a course to trace what it needs and what it unlocks
  - Shift-click to highlight its whole prerequisite tree
- Plan mode
  - Mark completed courses and see what's available next
  - Set goal courses and see the courses still needed to reach them
- Two layouts
  - **Semesters:** the program map's semester columns
  - **Free flow:** columns built from the prerequisite graph
- Engineering electives chosen from each program's list
- Export the chart as PNG (up to 6×) or SVG, and course data as JSON, CSV or text
