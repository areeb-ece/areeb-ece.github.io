---
title: Laplace Analyser
description: Differential equations through the Laplace transform, down to the integral behind each value.
bannerAlt: "Laplace Analyser's picture of a damped sinusoid: the surface of its transform over the s-plane with a spike at each pole, the signal in time, the pole-zero map with the region where the integral converges, and the integral added tip to tail up to F(s)"
order: 38
---

::tool{live="https://areeb-ece.github.io/LaplaceAnalyser/" name="LAPLACE/ANALYSER" repo="https://github.com/areeb-ece/LaplaceAnalyser"}

Laplace Analyser visualizes differential equations through the Laplace transform,
including the integrand and the integral behind each value, with many examples from
real applications. I made it while taking EE Mathematics (differential equations and
complex analysis) to build a conceptual understanding of the Laplace transform: how
and why it works, and why it's useful.

- Input: a differential equation with starting values, a function $f(t)$ or a transform $F(s)$
- Worked steps: the transformed equation, $Y(s)$, its partial fractions and $y(t)$
- Views
  - The signal in time, with a cursor you can drag or play
  - The surface $\lvert F(s)\rvert$ over the s-plane, coloured by phase
  - The pole-zero map, with the region where the integral converges
  - The integrand $f(t)\,e^{-st}$ at a probe point $s$
  - The integral added tip to tail, spiralling in to $F(s)$ or never settling
  - The signal as a sum of one $e^{pt}$ per pole
- Drag the probe $s$ and every view follows
- Dockable, resizable panels
- Eighty examples from circuits, control, mechanics, medicine, economics and more, plus
  one for each property of the transform
