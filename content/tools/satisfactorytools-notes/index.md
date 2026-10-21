---
title: Satisfactory Tools
description: Ten calculators and planners for the game Satisfactory in one page, led by a production planner for whole factories. Runs entirely in the browser.
order: 30
---

**Live: [areeb-ece.github.io/satisfactorytools](https://areeb-ece.github.io/satisfactorytools/)** ·
source on [GitHub](https://github.com/areeb-ece/satisfactorytools)

Calculators and planners for [Satisfactory](https://www.satisfactorygame.com/), in one
page. Plan a whole factory for several products at once, then size every machine, miner,
generator, belt split and train for it.

## The tools

| Group | Tool | What it does |
| --- | --- | --- |
| Planning | Production planner | Several products in one factory, with shared lines and rationed outputs |
| | Recipes & items | What makes every item, what it goes into, per-minute rates |
| | Alternate recipe comparer | Every recipe for one item, planned back to raw resources |
| | Milestone shopping list | HUB milestones and Space Elevator phases still to deliver |
| Machines | Overclock & Somersloop | Machine counts and clocks for a target rate, shards, Somersloops, power |
| | Miners & nodes | Extractors by purity and clock, belt and pipe limits, resource wells |
| | Power plants | Generators, fuel, water and nuclear waste for a target |
| | Belt splitting | Any number of belts in, any ratio out, exactly, with no belt faster than you can build |
| Logistics | Trains & drones | Items per minute for a route, Freight Cars for a target |
| | AWESOME Sink | Points per minute and when the next coupons print |

## The planner

The planner is a linear programme, solved in the page by a small two-phase simplex:
one variable per recipe and one per raw material, and for every item, what's made plus
what comes in must cover what's used plus the targets. During development the solver was
checked against [HiGHS](https://highs.dev) on 907 plans, and it matched every optimum.

The splitter plan for each split finds small whole-number weights and a splitter tree of
N = 2ᵃ·3ᵇ equal parts, then loops the spare parts back to the input. With several input
belts, it searches for the way to group, split and merge them that takes the fewest
splitters and mergers, keeping every belt within the fastest belt you can build.

## Details

- Game data is built from [greeny/SatisfactoryTools](https://github.com/greeny/SatisfactoryTools)'
  1.0 dataset (MIT), which is extracted from the game's own `Docs.json`. Recipes haven't
  changed since 1.0.
- Every tool saves as an image: PNG at up to 6×, or SVG, in any theme. Like PrereqFlow,
  you choose what to draw (the whole diagram, a highlighted tree, the part on screen, the
  panels).
- It shares this site's themes, settings and night sky.

:::note
The page's Content Security Policy includes `connect-src 'none'`, so it can't make
network requests. Plans are saved in your browser, and a plan you share travels inside
the link itself.
:::

This is an independent fan project, not affiliated with Coffee Stain Studios.
