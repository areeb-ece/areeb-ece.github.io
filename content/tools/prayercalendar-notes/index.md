---
title: Prayer Calendar
description: Prayer windows, makrooh times and the gaps between them as a calendar file or a printable timetable, for any location.
bannerAlt: "Prayer Calendar's day view for Oshawa: Fajr, the time between Fajr and Dhuhr, Dhuhr, Asr (Mithl and Mithlain), Maghrib and Isha laid out on a 24-hour timeline, with the makrooh times hatched"
order: 35
---

**Live: [areeb-ece.github.io/PrayerCalendar](https://areeb-ece.github.io/PrayerCalendar/)** ·
source on [GitHub](https://github.com/areeb-ece/PrayerCalendar)

Prayer times for your location as a calendar file (`.ics`) for Google, Apple or Outlook
Calendar, or as a printable timetable (PDF). Each prayer is an event lasting its whole
window, and the makrooh times and the gap between Fajr and Dhuhr can go in too. You
choose the method, the angles, how Asr is reckoned and what goes in the file, and
preview every day before you download it.

## What you can set

| Setting | Choices |
| --- | --- |
| Place | A built-in list of cities, your browser's location, or coordinates pasted from a map; the time zone and elevation can be changed |
| Dates | Any range up to a year; quick picks for 30 days, 3 months, the rest of the year, 12 months and the next Ramadan |
| Method | ISNA, Muslim World League, Egyptian, Karachi, Umm al-Qura, Dubai, Qatar, Kuwait, Gulf, Singapore, Diyanet, UOIF, Russia, Tehran, Shia Ithna Ashari, or your own Fajr and Isha angles |
| Asr | Mithl, Mithlain, or both at once as two events, overlapping or split |
| Makrooh times | Sunrise, istiwa (minutes before zawal, or from Dahwa Kubra) and sunset |
| Window ends | Asr at sunset or the sunset makrooh time; Isha at midnight, the last third of the night or Fajr |
| High latitudes | Twilight angle, one-seventh or middle of the night, or leave Fajr and Isha out |
| Events | Each switched on or off, renamed, with its own reminder; Jumu'ah on Fridays; whole windows or a set length |
| PDF | Letter or A4, a page per month or months running on; optional Hijri date, Ishraq, Istiwa, Zawal, sunset makrooh, midnight and last third columns |

## How the times are worked out

The sun's declination and the equation of time come from the standard low-precision
solar formulas, evaluated for each local date at the place. Fajr and Isha are when the
sun is the chosen angle below the horizon, sunrise and sunset at 0.833°, zawal when the
sun crosses the meridian, and Asr when a shadow is one (Mithl) or two (Mithlain) times an
object's length plus its noon shadow:

$$
\cot a = n + \tan\lvert\varphi - \delta\rvert
$$

where $a$ is the sun's altitude at Asr, $n$ is 1 or 2, $\varphi$ the latitude and
$\delta$ the sun's declination. Every time is kept as a UTC instant, and the file stores
UTC, so daylight saving needs no special handling.

The unit tests check the times against [adhan-js](https://github.com/batoulapps/adhan-js),
a separate implementation, at five places across both hemispheres: every time agrees to
within a minute.

## Details

- The gap between Fajr and Dhuhr starts after the sunrise makrooh time and stops at
  istiwa when those are in the file, so the events never overlap.
- Far from the equator in summer, the days where a high-latitude rule set Fajr or Isha
  are marked in the timetable.
- The PDF is written in the page by a small PDF writer of its own, using the reader's
  built-in Helvetica, so it needs no library. Each page carries the place and how the
  times were worked out, with Fridays shaded.
- It shares this site's themes, settings and night sky.

:::note
The page's Content Security Policy includes `connect-src 'none'`, so it can't make
network requests. The city list is part of the page, and your location stays in your
browser.
:::

Check the times against your local mosque: methods and practice differ between
communities.
