---
# Draft until the tool is live at /CubeTrace/. Then rewrite this page from the tool's
# README, add banner.webp and a bannerAlt, and delete the draft line.
title: Cube Trace
description: Rubik's cube algorithms turn by turn, following the pieces each move takes apart and puts back.
order: 39
draft: true
---

::tool{live="https://areeb-ece.github.io/CubeTrace/" name="CUBE/TRACE" repo="https://github.com/areeb-ece/CubeTrace"}

Cube Trace animates Rubik's cube algorithms on a 3D cube and shows why each move changes
the faces it does: which pieces a turn carries, where they go, and how an algorithm
takes the solved part of the cube apart and puts it back. It covers the beginner
layer-by-layer method and CFOP, the method speedsolvers use.

- Methods
  - Beginner: white cross, white corners, second layer, yellow cross, yellow edges,
    yellow corners placed, then twisted
  - CFOP: cross, F2L, OLL and PLL, two-look first, then the full sets
- Pieces that don't matter for a step are greyed out; the ones that do are outlined
- Each turn shows its layer, axis and direction, and the stickers it slides onto the
  neighbouring faces
- Solved pieces an algorithm borrows leave an outline in their slot until they return
- Algorithms split into setup, trigger and undo, with matching moves joined
- Linked views: the 3D cube, the unfolded net and the last-layer diagram
- Predict mode: pick where a piece will land before the move plays
