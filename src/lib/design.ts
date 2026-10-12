import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Where the master palette lives (served as /design/tokens.css). */
export const MASTER_TOKENS = join(process.cwd(), "public", "design", "tokens.css");

/**
 * Reads the night-sheet colours from the master palette, for build-time code that needs
 * literal colours rather than CSS variables (Mermaid's theme, the star tiles).
 */
export function nightTokens(css = readFileSync(MASTER_TOKENS, "utf8")): Record<string, string> {
  const block = /:root\s*,\s*\[data-theme="dark"\]\s*\{([\s\S]*?)\}/.exec(css)?.[1];
  if (!block) throw new Error(`${MASTER_TOKENS}: couldn't find the night sheet (:root, [data-theme="dark"] { … })`);
  const out: Record<string, string> = {};
  for (const m of block.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
