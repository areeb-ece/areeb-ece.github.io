---
title: CX68 for Linux
description: A Linux desktop app for my iCAN CX68 Hall-effect keyboard, with live key travel, remapping, macros and lighting, plus a bridge that turns its analog keys into a gamepad for racing games.
order: 40
---

Source on [GitHub](https://github.com/areeb-ece/cx68-linux) · a desktop app for Linux,
so there's no live link.

The iCAN CX68 is a 68-key Hall-effect keyboard: magnets measure how far each key is
pressed, not just whether it is. That's what makes settings like rapid trigger and
a custom actuation point possible. They're set through the maker's web configurator.
I wanted to set the keyboard up from Linux (CachyOS), see every key's travel live, and
use those analog keys as a controller in racing games.

## How it was made

Built with Claude Code, with me doing the hands-on steps at the keyboard. There was no
documentation, so the work went in five steps:

1. **Hardware.** Find out what the keyboard tells Linux about itself, without sending it
   anything.
2. **Protocol.** Record the messages the official configurator exchanges with the
   keyboard, check them against the raw USB traffic, and read the configurator's own
   code for the settings I couldn't capture.
3. **Library.** A Python library that builds the same messages. Its tests rebuild every
   recorded request byte for byte.
4. **App.** A desktop app on top of the library, written with PySide6 (Qt).
5. **Gamepad bridge.** A background service that turns key travel into a virtual
   controller.

:::note[Rules for a keyboard I didn't want to break]
Nothing that touches firmware is ever sent: no firmware updates, bootloader, factory
reset or flash erase. Every message passes a filter that refuses those and any command
it doesn't know. The app only reads until a change is asked for. Before the first
change, it saves a full backup of every setting, and after each one, it reads the
setting back to check it took.
:::

## What it does

| Tab | What it does |
| --- | --- |
| Live | A 3D view of the keyboard showing how far each key is pressed, at your monitor's refresh rate |
| Keys | Per-key actuation point, release point, rapid trigger and deadzones |
| Remap | Any key to another key, a media key, a system key or a mouse button, on the base and Fn layers |
| Advanced | Snap tap, toggle, mod-tap, and DKS (up to four actions on one key, at different press depths) |
| Macros | Record a macro by typing, or build one, then put it on a key |
| Lighting | Backlight effect and settings, with a preview |
| Gamepad | Start and stop the bridge, and choose which games get the controller |
| Device | Switch between the keyboard's profiles |
| Backup | Save every setting to a file, compare against it, and restore it |

### The gamepad bridge

Racing games expect a controller for smooth steering, so the bridge creates a virtual
Xbox 360 controller and drives it from key travel: W and S on the triggers, A and D
on the steering stick. Deadzones, response curves and per-key calibration are
adjustable. The controller only exists while an allowed game is running, so other
programs don't see it the rest of the time. A key press reaches the controller 1 to
2.2 ms after the keyboard measures it, and the bridge itself adds about 0.02 ms of that.

## Still to come

- **Testing the newer settings on the real keyboard.** Remapping, lighting, profiles,
  the advanced modes and macros are built from the configurator's code and tested
  against a simulated keyboard, but haven't run on the real one yet.
- **Trying the keyboard's built-in gamepad mode.** The configurator hides it for this
  model, so for now the bridge uses a virtual controller instead.
- **The 8000 Hz report rate.** The keyboard supports it, but I haven't found how the
  configurator sets it.
- **Wheel mode in Assetto Corsa**, a separate steering, throttle and brake setup that
  hasn't been tried in game yet.

This is an independent project, not affiliated with iCAN.
