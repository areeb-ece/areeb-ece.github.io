/* Mermaid diagrams, drawn to SVG at build time.
 *
 * Mermaid measures text with a real browser layout engine, so the build drives the
 * same headless Chromium the browser tests use (Playwright). Every diagram is cached
 * by a hash of its source, the Mermaid version and the theme, so only new or changed
 * diagrams need the browser. Each SVG's <style> block is moved out into /diagrams.css,
 * because the page's CSP doesn't allow inline <style>. Colours come from the master
 * palette, and the theme is part of the cache key, so changing it redraws them. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { diagramError } from "./wavedrom.ts";
import { nightTokens } from "../design.ts";

export interface MermaidResult {
  svg: string;
  css: string;
}

const require = createRequire(join(process.cwd(), "package.json"));
const VERSION: string = require("mermaid/package.json").version;

/** Mixes two #RRGGBB colours: t = 0 gives a, t = 1 gives b. */
const mix = (a: string, b: string, t: number) =>
  "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("");

/** Mermaid needs literal colours, so they're read from the master palette (public/design/tokens.css). */
const T = nightTokens();
const tint = (hue: string) => mix(T.sheet, T[hue], 0.2);
const THEME = {
  darkMode: true,
  background: T.sheet,
  fontFamily: "mononoki, ui-monospace, monospace",
  fontSize: "14px",
  primaryColor: T.card,
  primaryTextColor: T.ink,
  primaryBorderColor: T["ink-4"],
  secondaryColor: T["sheet-2"],
  secondaryTextColor: T.ink,
  secondaryBorderColor: T.rule,
  tertiaryColor: T.sheet,
  tertiaryTextColor: T["ink-2"],
  tertiaryBorderColor: T.rule,
  lineColor: T["ink-3"],
  textColor: T["ink-2"],
  mainBkg: T.card,
  nodeBorder: T["ink-4"],
  nodeTextColor: T.ink,
  clusterBkg: T["sheet-2"],
  clusterBorder: T.rule,
  titleColor: T.ink,
  edgeLabelBackground: T.sheet,
  noteBkgColor: T["card-hover"],
  noteTextColor: T.ink,
  noteBorderColor: T.warn,
  actorBkg: T.card,
  actorBorder: T["ink-4"],
  actorTextColor: T.ink,
  actorLineColor: T["ink-4"],
  signalColor: T["ink-2"],
  signalTextColor: T.ink,
  labelBoxBkgColor: T.card,
  labelBoxBorderColor: T["ink-4"],
  labelTextColor: T.ink,
  loopTextColor: T["ink-2"],
  activationBkgColor: T["card-hover"],
  activationBorderColor: T.accent,
  sequenceNumberColor: T.bg,
  errorBkgColor: tint("danger"),
  errorTextColor: T.danger,
  // pastel hues for pie slices, git branches, journeys…
  pie1: T.c0, pie2: T.c1, pie3: T.c2, pie4: T.c3, pie5: T.c4, pie6: T.c5, pie7: T.c6, pie8: T.c7,
  pieStrokeColor: T.sheet, pieOuterStrokeColor: T.rule, pieTitleTextColor: T.ink, pieSectionTextColor: T.bg, pieLegendTextColor: T["ink-2"],
  git0: T.c0, git1: T.c1, git2: T.c2, git3: T.c3, git4: T.c4, git5: T.c5, git6: T.c6, git7: T.c7,
  cScale0: tint("c0"), cScale1: tint("c1"), cScale2: tint("c2"), cScale3: tint("c3"), cScale4: tint("c4"), cScale5: tint("c5"),
};
const CONFIG = { startOnLoad: false, securityLevel: "strict", theme: "base", themeVariables: THEME, htmlLabels: false, flowchart: { htmlLabels: false, curve: "basis" }, fontFamily: THEME.fontFamily };

export const mermaidKey = (src: string) => createHash("sha1").update(`${VERSION}\n${JSON.stringify(CONFIG)}\n${src}`).digest("hex").slice(0, 16);

const CACHE = join(process.cwd(), "node_modules", ".cache", "site-diagrams");

/** Renders every source not already cached. Returns rendered SVG + CSS (or an error box) by key. */
export async function renderMermaidAll(sources: string[]): Promise<Map<string, MermaidResult>> {
  const out = new Map<string, MermaidResult>();
  const todo: { key: string; src: string }[] = [];
  mkdirSync(CACHE, { recursive: true });
  for (const src of new Set(sources)) {
    const key = mermaidKey(src);
    const file = join(CACHE, `${key}.json`);
    if (existsSync(file)) out.set(key, JSON.parse(readFileSync(file, "utf8")));
    else todo.push({ key, src });
  }
  if (!todo.length) return out;

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error("Mermaid diagrams are drawn at build time with Playwright, which isn't installed. Run `npm install`.");
  }
  let browser;
  try {
    browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  } catch (e) {
    throw new Error(
      "Mermaid diagrams are drawn at build time in a headless browser, and it isn't installed here.\n" +
        "Run this once:  npx playwright install chromium\n" +
        `(${(e as Error).message.split("\n")[0]})`,
    );
  }
  try {
    const page = await browser.newPage();
    const font = readFileSync(join(process.cwd(), "public/fonts/mononoki-Regular.woff2")).toString("base64");
    await page.setContent(
      `<!doctype html><html><head><style>@font-face{font-family:mononoki;src:url(data:font/woff2;base64,${font}) format("woff2")}body{font-family:mononoki}</style></head><body>x</body></html>`,
    );
    await page.evaluate(() => document.fonts.load("14px mononoki"));
    await page.addScriptTag({ content: readFileSync(require.resolve("mermaid/dist/mermaid.min.js"), "utf8") });
    const results: { key: string; svg?: string; error?: string }[] = await page.evaluate(
      async ({ items, config }) => {
        const m = (window as any).mermaid;
        m.initialize(config);
        const res = [];
        for (const { key, src } of items) {
          const id = `m${key.slice(0, 10)}`;
          try {
            const { svg } = await m.render(id, src);
            res.push({ key, svg });
          } catch (e) {
            res.push({ key, error: String((e as Error)?.message ?? e) });
          }
          document.querySelectorAll(`#d${id}, #${id}`).forEach((el) => el.remove());
        }
        return res;
      },
      { items: todo, config: CONFIG },
    );
    for (const r of results) {
      const src = todo.find((t) => t.key === r.key)!.src;
      let result: MermaidResult;
      if (r.error !== undefined) {
        result = { svg: diagramError("mermaid", r.error, src), css: "" };
      } else {
        // The browser serialises the <style> text with HTML escapes ("text.actor&gt;tspan").
        const css = [...r.svg!.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
          .map((m) => m[1].replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"))
          .join("\n");
        const svg = r.svg!.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "");
        result = { svg, css };
      }
      writeFileSync(join(CACHE, `${r.key}.json`), JSON.stringify(result));
      out.set(r.key, result);
    }
  } finally {
    await browser.close();
  }
  return out;
}
