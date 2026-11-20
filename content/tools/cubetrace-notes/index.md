---
title: Cube Trace
description: "Rubik's cube algorithms, turn by turn: which pieces each move carries and where they go."
bannerAlt: "Cube Trace partway through an F2L case: the 3D cube with its right layer turning, the pieces that matter in colour and the rest grey, a hatched piece out of place and a dashed outline of the slot it left, beside the unfolded net with arrows showing where the turning stickers go"
order: 39
---

::tool{live="https://areeb-ece.github.io/CubeTrace/" name="CUBE/TRACE" repo="https://github.com/areeb-ece/CubeTrace"}

Cube Trace teaches the beginner method and CFOP by tracking pieces, not stickers,
through every turn of an algorithm. You see how an algorithm takes the solved part of
the cube apart and puts it back, on a 3D cube, on a flat net and on a last-layer
diagram, all drawn from one shared state. It runs entirely in the browser.

- Learn: the beginner method in seven steps and CFOP (cross, F2L, OLL, PLL), each step's
  cases as small pictures that load into the player
- Explore: type any moves and watch them, drag across the cube to turn a layer, scramble
  and reset, and a twist ledger for corner orientation
- Predict: before each move one piece is marked and you click the slot it will end up in
- Three views of the same state: the cube in 3D, the unfolded net and the last layer from
  above, in a workspace you can rearrange
- Pieces that matter are in colour and the rest are grey; a displaced piece is hatched and
  the slot it left is drawn as a dashed ghost
- A timeline of the moves, with brackets over moves that undo each other and the
  algorithm split into setups, triggers and inserts
- A notation primer, letters on stickers for colour-blind use, and mirror panes for the
  hidden faces
- Save a PNG of the current position or a GIF of the whole algorithm
- Every algorithm is tested: the OLL, PLL and F2L sets each cover every case exactly once
