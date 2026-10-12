import { rng } from "./html.ts";
import { nightTokens } from "./design.ts";

/* The night sky: three tiling layers of stars, generated once at build time from a
 * fixed seed, so the sky is the same on every build and costs nothing per frame. */

export interface SkyLayer {
  name: string;
  /** Tile size in px (the tile repeats; drift moves it by exactly one tile per loop). */
  tile: number;
  count: number;
  radius: [number, number];
  /** Gaussian blur, px. */
  blur: number;
  opacity: [number, number];
  /** Share of stars tinted warm or cool instead of white. */
  tint: number;
  seed: number;
  /** Seconds for one drift loop. */
  drift: number;
  /** Fraction of the page scroll the layer follows (parallax). */
  parallax: number;
}

export const SKY: SkyLayer[] = [
  { name: "far", tile: 360, count: 46, radius: [0.45, 0.8], blur: 0.5, opacity: [0.038, 0.072], tint: 0.12, seed: 11, drift: 520, parallax: 0.03 },
  { name: "mid", tile: 420, count: 20, radius: [0.7, 1.1], blur: 1, opacity: [0.11, 0.2], tint: 0.2, seed: 23, drift: 360, parallax: 0.07 },
  { name: "near", tile: 480, count: 8, radius: [1, 1.4], blur: 1.5, opacity: [0.12, 0.205], tint: 0.3, seed: 37, drift: 240, parallax: 0.12 },
];

// Star colours from the master palette: ink, plus faint warm (--c2) and cool (--c0) tints.
const T = nightTokens();
const WHITE = T.ink;
const WARM = T.c2;
const COOL = T.c0;

export function starTile(layer: SkyLayer): string {
  const r = rng(layer.seed);
  const T = layer.tile;
  const between = ([lo, hi]: [number, number]) => lo + r() * (hi - lo);
  const margin = Math.ceil(layer.radius[1] + layer.blur * 3);
  const dots: string[] = [];
  for (let i = 0; i < layer.count; i++) {
    const x = r() * T;
    const y = r() * T;
    const rad = between(layer.radius).toFixed(2);
    const op = between(layer.opacity).toFixed(3);
    const t = r();
    const fill = t < layer.tint / 2 ? WARM : t < layer.tint ? COOL : WHITE;
    // Stars near an edge are drawn again on the opposite side so the tile repeats seamlessly.
    for (const dx of [0, x < margin ? T : x > T - margin ? -T : 0].filter((v, k) => k === 0 || v !== 0)) {
      for (const dy of [0, y < margin ? T : y > T - margin ? -T : 0].filter((v, k) => k === 0 || v !== 0)) {
        dots.push(`<circle cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="${rad}" fill="${fill}" fill-opacity="${op}"/>`);
      }
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}">` +
    `<filter id="b" x="0" y="0" width="${T}" height="${T}" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="${layer.blur}"/></filter>` +
    `<g filter="url(#b)">${dots.join("")}</g></svg>`
  );
}
