import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Where the master palette lives (served as /design/tokens.css). */
export const MASTER_TOKENS = join(process.cwd(), "public", "design", "tokens.css");

export interface Theme {
  /** The data-theme value, e.g. "dark" or "console". */
  name: string;
  /** --theme-label, shown in the settings panel. */
  label: string;
  /** Line in tokens.css where the block starts, for error messages. */
  line: number;
  /** Every custom property in the block, without the leading "--"; plus "color-scheme". */
  tokens: Record<string, string>;
}

function declarations(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  const body = block.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  const scheme = /(?:^|[;\s])color-scheme\s*:\s*([^;]+);/.exec(body);
  if (scheme) out["color-scheme"] = scheme[1].trim();
  return out;
}

/** Every theme block in the master palette, in file order. The first is the default (night). */
export function themes(css = readFileSync(MASTER_TOKENS, "utf8")): Theme[] {
  const out: Theme[] = [];
  for (const m of css.matchAll(/[^{}]*\[data-theme="([\w-]+)"\][^{}]*\{([^}]*)\}/g)) {
    const tokens = declarations(m[2]);
    const line = css.slice(0, m.index! + m[0].indexOf("[data-theme=")).split("\n").length;
    out.push({ name: m[1], label: (tokens["theme-label"] ?? m[1]).replace(/^["']|["']$/g, ""), line, tokens });
  }
  return out;
}

/**
 * Reads the night-sheet colours from the master palette, for build-time code that needs
 * literal colours rather than CSS variables (Mermaid's theme).
 */
export function nightTokens(css = readFileSync(MASTER_TOKENS, "utf8")): Record<string, string> {
  const block = /:root\s*,\s*\[data-theme="dark"\]\s*\{([\s\S]*?)\}/.exec(css)?.[1];
  if (!block) throw new Error(`${MASTER_TOKENS}: couldn't find the night sheet (:root, [data-theme="dark"] { … })`);
  return declarations(block);
}

/** Mixes two #RRGGBB colours: t = 0 gives a, t = 1 gives b. */
export const mix = (a: string, b: string, t: number) =>
  "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("");

// When two tokens share a colour, the first in this list wins, so a diagram's text is
// tied to --ink rather than to a pastel that happens to match.
const ORDER = ["ink", "ink-2", "ink-3", "ink-4", "bg", "sheet", "sheet-2", "card", "card-hover", "rule", "rule-2", "accent", "danger", "warn", "ok"];

/**
 * Rewrites literal night-sheet colours (as Mermaid writes them) as CSS variables, so a
 * diagram drawn once at build time follows whichever theme the visitor picks. `tints`
 * lists hues that were mixed into --sheet at a given strength (Mermaid's cScale fills).
 * Colours Mermaid derives on its own (darker borders and so on) stay as they are.
 */
export function colorsToVars(text: string, T: Record<string, string>, tints: [string, number][] = []): string {
  const map = new Map<string, string>();
  const names = [...ORDER, ...Object.keys(T).filter((k) => !ORDER.includes(k))];
  for (const k of names) {
    const v = T[k]?.toLowerCase();
    if (v && /^#[0-9a-f]{6}$/.test(v) && !map.has(v)) map.set(v, `var(--${k})`);
  }
  for (const [hue, t] of tints) {
    const v = mix(T.sheet, T[hue], t).toLowerCase();
    if (!map.has(v)) map.set(v, `color-mix(in srgb, var(--${hue}) ${Math.round(t * 100)}%, var(--sheet))`);
  }
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",\\s*");
  return text
    .replace(/#[0-9a-fA-F]{6}\b/g, (h) => map.get(h.toLowerCase()) ?? h)
    .replace(/rgba?\(([^)]*)\)/g, (whole) => {
      for (const [hex, v] of map) {
        const m = new RegExp(`^rgba?\\(\\s*${rgb(hex)}\\s*(?:,\\s*([\\d.]+)\\s*)?\\)$`).exec(whole);
        if (m) return m[1] === undefined ? v : `color-mix(in srgb, ${v} ${Math.round(+m[1] * 100)}%, transparent)`;
      }
      return whole;
    });
}
