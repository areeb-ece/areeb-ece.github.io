---
title: DLS Image Exporter
description: Exports every chip I've built in Digital Logic Sim as an image, either as laid out in the editor or opened up all the way down to its NAND gates, with an automatic layout that keeps the gates readable.
bannerAlt: "An auto-layout export of my ALU chip with each sub-chip opened one level: AND-8, OR-8, XOR-8, NOT-8, two ADDSUB-8 adders and the 8-to-1 multiplexer, each in its own bordered frame"
order: 50
---

Source on [GitHub](https://github.com/areeb-ece/DLS-Image-Exporter) · a command-line
tool, so there's no live link.

[Digital Logic Sim](https://github.com/SebLague/Digital-Logic-Sim) lets you build chips
out of NAND gates and then build bigger chips out of those. The exporter turns every chip
in every project into an image with one command. It's a single Python script that reads
the game's save files directly (read-only), so it works with the regular game build and
needs no mods.

## Modes

| Mode | What it shows |
| --- | --- |
| Circuit | The inside of each chip, as I laid it out in the editor |
| Expanded | Every custom sub-chip opened up in place, recursively. Each one becomes a bordered frame, titled with the chip's name, holding its own inner circuit |

## The auto layout

Opened up in place, a big chip spends most of its area on empty space. The auto layout,
the default for expanded images, rearranges the parts and re-routes the wires instead:

- Each chip's parts go in columns by signal flow, inputs on the left and outputs on the
  right. Feedback loops, as in latches, are routed back around.
- Parts are ordered to reduce wire crossings and lined up with whatever drives them, so
  most wires run straight.
- Wires run horizontally and vertically through the gaps between columns, each vertical
  run on its own track, and dots mark where a wire branches.
- Bit splitters and mergers are left out. A bus is drawn as one wire per bit, close
  together and in bit order (highest bit on top, as the game lays out bus pins), and each
  bit peels off on its own toward where it goes. Single-bit wires join a bus at a
  multi-bit pin in the same order. Each wire is traced through the splitters to the pin
  that really drives it.
- A layout much wider than the target shape wraps into rows, and every wire is still
  drawn whole: a wire crossing a row break runs down the right edge of its row, back
  along its own lane in the gap between rows, and into the next row.

The other layout keeps my own placement and wire bends, and stretches the space around
each opened chip to make room.

## Details

- Chip sizes, pin spacing, the built-in chips and multi-bit wire drawing follow the
  public Digital Logic Sim source, so in the original layout wires meet pins where they
  do in the game.
- PNG or SVG. Options limit an export to some projects or chips, open only a few levels,
  or keep chosen chips closed.
- Wires are drawn in their "off" colours, since nothing is being simulated, or in the
  bright "on" colours with `--lit`, as in the banner.

This is an independent tool, not affiliated with Sebastian Lague or Digital Logic Sim.
