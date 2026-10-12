import wavedrom from "wavedrom";
import { parseRelaxedJson } from "./relaxed-json.ts";
import { esc } from "../html.ts";

let count = 0;
const SCALE = 1.5;

/* WaveDrom draws each wave segment once in <defs> and reuses it with <use>. Firefox
 * (rightly) doesn't match page selectors like `.wavedrom .s1` inside those copies, so
 * they fell back to black. Inline styles travel with the copies, and the CSS variables
 * they use inherit into them; the variables are set on figure.wavedrom in code.css. */
const SKIN: Record<string, string> = {
  s1: "fill:none;stroke:var(--wd-line);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round",
  s2: "fill:none;stroke:var(--wd-faint);stroke-width:.7;stroke-linecap:round",
  s3: "fill:none;stroke:var(--wd-faint);stroke-width:1;stroke-dasharray:1,3",
  s4: "fill:none;stroke:var(--wd-line);stroke-width:1",
  s5: "fill:var(--wd-bg);stroke:none",
  s6: "fill:var(--wd-line);stroke:none",
  s7: "fill:var(--wd-data);stroke:none",
  s8: "fill:var(--wd-3);stroke:none",
  s9: "fill:var(--wd-4);stroke:none",
  s10: "fill:var(--wd-5);stroke:none",
  s11: "fill:var(--wd-6);stroke:none",
  s12: "fill:var(--wd-7);stroke:none",
  s13: "fill:var(--wd-8);stroke:none",
  s14: "fill:var(--wd-9);stroke:none",
  s15: "fill:var(--wd-accent);stroke:none",
  s16: "fill:none;stroke:var(--wd-accent);stroke-width:1",
};

/**
 * Renders a WaveDrom timing diagram to inline SVG at build time. The skin's own
 * <style> (black lines, Helvetica) is dropped and its classes get the site palette
 * through SKIN above. Ids are prefixed so two diagrams on one page
 * (or a heading called "socket") can't collide.
 */
export function renderWavedrom(source: string): string {
  let json: unknown;
  try {
    json = parseRelaxedJson(source);
  } catch (e) {
    return diagramError("wavedrom", (e as Error).message.replace(/^wavedrom: /, ""), source);
  }
  const n = count++;
  try {
    const tree = (wavedrom as any).renderAny(n, json, (wavedrom as any).waveSkin);
    let svg: string = (wavedrom as any).onml.stringify(tree);
    const prefix = `wd${n}-`;
    svg = svg
      .replace(/<style[\s\S]*?<\/style>/g, "")
      .replace(/\sclass="(s\d+)"/g, (m, c) => (SKIN[c] ? `${m} style="${SKIN[c]}"` : m))
      .replace(/\sid="([^"]+)"/g, ` id="${prefix}$1"`)
      .replace(/(xlink:href|href)="#([^"]+)"/g, `$1="#${prefix}$2"`)
      // the few colours written inline: white background, grey grid marks, blue arrows
      .replace(/fill:\s*white/g, "fill:transparent")
      .replace(/#888\b/g, "var(--wd-grid)")
      .replace(/#0041c4/gi, "var(--wd-accent)")
      .replace(/<svg /, '<svg role="img" aria-label="Timing diagram" ');
    // WaveDrom draws at 20 px per clock tick, which looks cramped on the page: draw it
    // larger (it has a viewBox, so it stays sharp), and let CSS shrink it to fit.
    svg = svg.replace(/^<svg\b[^>]*>/, (open) =>
      open.replace(/\s(width|height)="([\d.]+)"/g, (_, k, v) => ` ${k}="${Math.round(parseFloat(v) * SCALE)}"`),
    );
    return svg;
  } catch (e) {
    return diagramError("wavedrom", (e as Error).message, source);
  }
}

export function diagramError(kind: string, message: string, source: string): string {
  return (
    `<div class="diagram-error" role="note"><span class="lbl">${kind} error</span>` +
    `<span class="diagram-error-msg">${esc(message.trim().split("\n").slice(0, 6).join("\n"))}</span>` +
    `<pre><code>${esc(source)}</code></pre></div>`
  );
}
