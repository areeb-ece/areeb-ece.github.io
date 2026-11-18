---
title: CX68 for Linux
description: Linux configuration app for the iCAN CX68 Hall-effect keyboard, with analog gamepad input.
bannerAlt: "The app's live view of the CX68: a 3D keyboard with W, A, D and Shift pressed to different depths"
order: 40
---

::tool{repo="https://github.com/areeb-ece/cx68-linux"}

Linux tools for the iCAN CX68 Hall-effect keyboard. Its official configurator runs over
WebHID, which is tedious to set up on Linux and has no analog input. I made this for a
better way to configure the keyboard, and to use its analog keys as a controller in
racing games.

- Live 3D view of how far each key is pressed
- Per-key actuation point, release point, rapid trigger and deadzones
- Remapping on the base and Fn layers
- Snap tap, toggle, mod-tap and DKS
- Macros, recorded or built
- Lighting and profiles
- Backup, compare and restore of every setting
- Gamepad bridge
  - A virtual Xbox 360 controller driven by key travel
  - Adjustable deadzones, response curves and per-key calibration
  - Only present while an allowed game is running
- Never sends firmware, bootloader or reset commands
