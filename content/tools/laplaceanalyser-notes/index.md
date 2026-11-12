---
title: Laplace Analyser
description: See a Laplace transform as a surface over the s-plane, and watch the integral behind each point of it.
bannerAlt: "Laplace Analyser's picture of a damped sinusoid: the surface of its transform over the s-plane with a spike at each pole, the signal in time, the pole-zero map with the region where the integral converges, and the integral added tip to tail up to F(s)"
order: 38
---

**Live: [areeb-ece.github.io/LaplaceAnalyser](https://areeb-ece.github.io/LaplaceAnalyser/)** ·
source on [GitHub](https://github.com/areeb-ece/LaplaceAnalyser)

Type a differential equation, a function of time or a transform, and see it from every
side at once: the signal, the surface $\lvert F(s)\rvert$ over the s-plane, its poles
and zeros, and the integral that produces each value. Drag one point $s$ around the
plane and every view follows it in the same frame.

## The views

| View | Shows |
| --- | --- |
| Input | An equation with its starting values, a function $f(t)$ or a transform $F(s)$, typeset as you type it |
| Worked steps | The transformed equation, $Y(s)$, its partial fractions and $y(t)$ |
| Time domain | $f(t)$ or $y(t)$, with a time cursor you can drag or play |
| S-plane surface | Height is $\lvert F(s)\rvert$ and hue is $\arg F(s)$, so poles are spikes and zeros are dimples |
| Pole-zero map | Poles, zeros, the region where the integral converges, and the probe |
| Integrand | $f(t)\,e^{-st}$ at the probe, as it turns and decays in time |
| Integral | The same integrand added tip to tail: it spirals in to $F(s)$, or never settles |
| Decomposition | The signal as a sum of one $e^{pt}$ per pole |

The panels dock: drag them, resize them, stack them as tabs, and the layout is
remembered. Eighty examples come from signals, circuits, filters, control, mechanics,
heat and fluids, chemistry and medicine, physics, queues, economics and flight, with one
more for each property of the transform.

## How the answer is worked out

Every signal the tool accepts is a sum of terms $c\,t^n e^{\lambda t}$ with complex
$\lambda$, which covers polynomials, exponentials, sines and cosines and their products,
plus impulses at $t = 0$: the Dirac delta $\delta(t)$ and its derivatives. Each term
transforms exactly:

$$
\mathcal{L}\{t^n e^{\lambda t}\} = \frac{n!}{(s - \lambda)^{n+1}},
\qquad
\mathcal{L}\{\delta^{(k)}(t)\} = s^k
$$

So impulses are the polynomial part of a transform. A transform whose numerator's
degree isn't the lower one is divided out first, and its inverse starts with impulses:

$$
\frac{s^2}{s + 1} = s - 1 + \frac{1}{s + 1}
\quad\longleftrightarrow\quad
\delta'(t) - \delta(t) + e^{-t}
$$

A differential equation with starting values becomes

$$
Y(s) = \frac{G(s) + I(s)}{P(s)}
$$

where $P$ is the equation's polynomial, $G$ the transformed right side and $I$ what the
starting values contribute. With an impulse on the right, the starting values are the
ones just before it, at $t = 0^-$. The poles are found numerically with their multiplicities,
the partial fractions (repeated poles included) come from a Taylor expansion at each
pole, and the inverse is read off term by term.

Before anything is shown, the impulses and the partial fractions are added back up and
compared with the fraction they came from. If they don't agree, or the input is outside what the method
covers, it is refused with a message that says why, not answered approximately.

## The transform's properties

Each property is something you can type, and the worked steps name the one at work:

| Property | Typed as | The rule |
| --- | --- | --- |
| Linearity | `3delta(t) - 2e^t` | $\mathcal{L}\{af + g\} = aF + G$ |
| Exponential scaling | `e^(-t) cos(t)` | $\mathcal{L}\{e^{at}g(t)\} = G(s - a)$ |
| Multiplication by $t$ | `t e^(-t)` | $\mathcal{L}\{t\,g(t)\} = -G'(s)$ |
| Time delay | `u(t - 1) - u(t - 2)` | $\mathcal{L}\{g(t - T)\,u(t - T)\} = e^{-sT}G(s)$ |
| Derivative | `diff(u(t))` | $\mathcal{L}\{f'\} = sF(s) - f(0^-)$ |
| Integral | `int(u(t))` | $\mathcal{L}\{\int_{0^-}^t f\} = F(s)/s$ |
| Convolution | `conv(e^(-t), sin(t))` | $\mathcal{L}\{f * g\} = F(s)\,G(s)$ |

Partial fractions are also shown the way they are done by hand: one unknown per term,
both sides multiplied by the denominator, and the coefficients of each power of $s$
equated.

With a delay, a signal is a sum of pieces each switched on at its own time, and its
transform is $\sum_T e^{-sT}F_T(s)$. A pole of one piece can cancel against another's:
a rectangular pulse, $\frac{e^{-s} - e^{-2s}}{s}$, has no pole at all, so its integral
converges for every $s$.

## Details

- The maths box works like Desmos's: `/` starts a fraction, `^` a power, and brackets
  close themselves. It is hand-written, like the rest of the page.
- The integral view is computed numerically at the probe, as a check you can see: inside
  the region of convergence it lands on the value the formula gives, and outside it the
  spiral grows without limit while the surface shows the analytic continuation.
  Impulses add their share, $e^{-sT}\sum_k d_k s^k$, at once at their time $T$.
- Impulses are typed as `delta(t)` or `delta(t - 2)` and drawn on the time plot as an
  arrow labelled with their size; where a step switches on, the plot jumps.
- Any set of views saves as a PNG, or with time playing as a GIF or a video, in any
  theme.
- It shares this site's themes, settings and night sky.

:::note
The page's Content Security Policy includes `connect-src 'none'`, so it can't make
network requests. What you type stays in your browser.
:::
