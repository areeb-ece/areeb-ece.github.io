import { test } from "node:test";
import assert from "node:assert/strict";
import { colorsToVars, nightTokens, themes } from "../src/lib/design.ts";

const ALL = themes();
const NIGHT = ALL[0];
// Optional in every theme: the star colours fall back to --ink, --c2 and --c0.
const OPTIONAL = new Set(["star", "star-warm", "star-cool"]);
// Shared by every theme unless a theme sets its own.
const SHARED = new Set(["r-sm", "r", "r-lg"]);

const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex: string) => [0.2126, 0.7152, 0.0722].reduce((n, w, i) => n + w * lin(parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)), 0);
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

test("the master palette starts with the night theme, and every theme has a unique name and a label", () => {
  assert.equal(NIGHT.name, "dark");
  assert.ok(ALL.length >= 4, "night, paper and the extra themes");
  const names = ALL.map((t) => t.name);
  assert.deepEqual(names, [...new Set(names)], "theme names are unique");
  for (const t of ALL) {
    assert.match(t.name, /^[a-z0-9]+(-[a-z0-9]+)*$/, `public/design/tokens.css:${t.line}: theme name "${t.name}" must be lowercase-with-hyphens`);
    assert.ok(t.tokens["theme-label"], `public/design/tokens.css:${t.line}: theme "${t.name}" needs a --theme-label`);
    assert.match(t.tokens["color-scheme"] ?? "", /^(dark|light)$/, `public/design/tokens.css:${t.line}: theme "${t.name}" needs color-scheme: dark or light`);
  }
});

test("every theme defines every colour the night theme does", () => {
  const needed = Object.keys(NIGHT.tokens).filter((k) => !OPTIONAL.has(k) && !SHARED.has(k));
  for (const t of ALL) {
    const missing = needed.filter((k) => !(k in t.tokens));
    assert.deepEqual(missing, [], `public/design/tokens.css:${t.line}: theme "${t.name}" is missing ${missing.map((k) => `--${k}`).join(", ")}`);
  }
});

test("every theme keeps its text readable (WCAG AA, 4.5:1)", () => {
  const pairs = [
    ["ink-3", "card"], ["ink-3", "sheet"], ["ink-3", "bg"], ["ink-2", "card"], ["ink", "card"],
    ["accent", "sheet"], ["accent-ink", "accent"], ["focus-ink", "focus-bg"],
  ];
  for (const t of ALL) {
    for (const [fg, bg] of pairs) {
      const r = ratio(t.tokens[fg], t.tokens[bg]);
      assert.ok(r >= 4.5, `public/design/tokens.css:${t.line}: in theme "${t.name}", --${fg} on --${bg} is ${r.toFixed(2)}:1; it needs 4.5:1 to stay readable`);
    }
  }
});

test("literal night colours (as Mermaid writes them) become theme variables", () => {
  const T = nightTokens();
  const css = `.a{fill:${T.ink};stroke:${T.c0.toLowerCase()}}.b{background:rgba(20, 22, 26, 0.5)}.c{fill:#402f2f}.d{fill:${T["ink-3"]}}`;
  const out = colorsToVars(css, T, [["c0", 0.2]]);
  assert.match(out, /\.a\{fill:var\(--ink\);stroke:var\(--c0\)\}/);
  assert.match(out, /\.b\{background:color-mix\(in srgb, var\(--sheet\) 50%, transparent\)\}/);
  assert.match(out, /\.c\{fill:#402f2f\}/, "colours Mermaid derived itself are left alone");
  assert.match(out, /\.d\{fill:var\(--ink-3\)\}/);
  // --c1, --h0 and --ok share a colour: the semantic --ok wins over the pastels.
  assert.equal(colorsToVars(T.c1, T), "var(--ok)");
  const tint = colorsToVars("#2d3544", { ...T, sheet: "#14161A", c0: "#92B1EE" }, [["c0", 0.2]]);
  assert.equal(tint, "color-mix(in srgb, var(--c0) 20%, var(--sheet))");
});
