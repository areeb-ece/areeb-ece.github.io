---
title: DLS Image Exporter
description: Exports Digital Logic Sim chips as images, opened up to their NAND gates.
bannerAlt: "An auto-layout export of my ALU chip with each sub-chip opened one level: AND-8, OR-8, XOR-8, NOT-8, two ADDSUB-8 adders and the 8-to-1 multiplexer, each in its own bordered frame"
order: 50
---

::tool{repo="https://github.com/areeb-ece/DLS-Image-Exporter"}

A Python script that exports every chip in Digital Logic Sim as an image, including
expanded versions opened all the way down to NAND gates. I made it for clearer visuals
of my [8-bit ALU](/projects/alu/), and I expect to use it for future Digital Logic Sim
projects too.

- Two modes
  - **Circuit:** the inside of each chip
  - **Expanded:** every custom sub-chip opened in place, recursively, each in a titled frame
- Two layouts
  - **Auto** (default): parts rearranged by signal flow and wires re-routed to be easy to follow
  - **Original:** the editor's placement and wire bends
- PNG or SVG
- Limit an export to some projects or chips, a few levels, or keep chosen chips closed
- Wires in their off colours, or lit
- Reads the game's save files directly (read-only), so no mods are needed
