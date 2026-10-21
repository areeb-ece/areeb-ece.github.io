---
title: OTU Calendar
description: Turns an Ontario Tech course schedule into a calendar file (.ics), with a week-by-week preview. Nothing is uploaded.
order: 20
---

**Live: [areeb-ece.github.io/otucalendar](https://areeb-ece.github.io/otucalendar/)** ·
source on [GitHub](https://github.com/areeb-ece/otucalendar)

Turn your Ontario Tech course schedule into a calendar file (`.ics`) for Google,
Apple or Outlook Calendar. Before you download it, you can scroll through the term
week by week and see exactly what the file contains.

## Getting a schedule in

MyOntarioTech has no export button and no public API, and a third-party site should
never ask for your university password. So you bring the schedule to the page
instead, in one of three ways:

1. **Saved schedule page.** Save the Schedule Details page from your browser and drop
   the `.html` or `.mhtml` file in.
2. **Copy and paste** the Schedule Details page.
3. **Helper bookmark.** A short script you can read line by line. It asks the same
   site for each section's meeting times and saves a `.json` file to load.

## Privacy

:::note
The page's Content Security Policy includes `connect-src 'none'`, so it cannot send
your schedule anywhere, even by mistake. Parsing and `.ics` generation run in the tab,
and your schedule isn't kept once you close it.
:::

## Details

- The preview is drawn from the generated `.ics` text itself, so what you see is
  what your calendar app gets.
- **Save image** draws the schedule as a PNG (up to 6×) or SVG. Under it, a week table
  gives each week's dates and the day each alternating or part-term class meets.
- Templates control each event's title, description and location, with placeholders
  such as `{CourseCode}` and `{RoomCodeandNumber}`.
- Times are written in UTC and converted one occurrence at a time, so daylight saving
  never shifts a class.

This is an independent utility, not an official Ontario Tech application.
