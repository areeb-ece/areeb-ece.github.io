import wavedrom from "wavedrom";
import { parseRelaxedJson } from "./relaxed-json.ts";
import { esc } from "../html.ts";

let count = 0;

/**
 * Renders a WaveDrom timing diagram to inline SVG at build time. The skin's own
 * <style> (black lines, Helvetica) is dropped; src/styles/diagrams.css recolours the
 * skin's classes with the site palette. Ids are prefixed so two diagrams on one page
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
      .replace(/\sid="([^"]+)"/g, ` id="${prefix}$1"`)
      .replace(/(xlink:href|href)="#([^"]+)"/g, `$1="#${prefix}$2"`)
      // the few colours written inline: white background, grey grid marks, blue arrows
      .replace(/fill:\s*white/g, "fill:transparent")
      .replace(/#888\b/g, "var(--ink-4)")
      .replace(/#0041c4/gi, "var(--accent)")
      .replace(/<svg /, '<svg role="img" aria-label="Timing diagram" ');
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
