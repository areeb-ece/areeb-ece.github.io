/* Mermaid diagrams, drawn to SVG at build time.
 *
 * Mermaid measures text with a real browser layout engine, so the build drives the
 * same headless Chromium the browser tests use (Playwright). Every diagram is cached
 * by a hash of its source, the Mermaid version and the theme, so only new or changed
 * diagrams need the browser. Each SVG's <style> block is moved out into
 * /diagrams.css, because the page's CSP doesn't allow inline <style>. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { diagramError } from "./wavedrom.ts";

export interface MermaidResult {
  svg: string;
  css: string;
}

const require = createRequire(join(process.cwd(), "package.json"));
const VERSION: string = require("mermaid/package.json").version;

/** Night-sheet palette (src/styles/tokens.css). Mermaid needs literal colours. */
const THEME = {
  darkMode: true,
  background: "#1A1D23",
  fontFamily: "mononoki, ui-monospace, monospace",
  fontSize: "14px",
  primaryColor: "#23272F",
  primaryTextColor: "#E8E4DC",
  primaryBorderColor: "#4D5362",
  secondaryColor: "#1D2027",
  secondaryTextColor: "#E8E4DC",
  secondaryBorderColor: "#353A45",
  tertiaryColor: "#1A1D23",
  tertiaryTextColor: "#BAB5AB",
  tertiaryBorderColor: "#353A45",
  lineColor: "#8C8880",
  textColor: "#BAB5AB",
  mainBkg: "#23272F",
  nodeBorder: "#4D5362",
  nodeTextColor: "#E8E4DC",
  clusterBkg: "#1D2027",
  clusterBorder: "#353A45",
  titleColor: "#E8E4DC",
  edgeLabelBackground: "#1A1D23",
  noteBkgColor: "#2A2F38",
  noteTextColor: "#E8E4DC",
  noteBorderColor: "#EACB76",
  actorBkg: "#23272F",
  actorBorder: "#4D5362",
  actorTextColor: "#E8E4DC",
  actorLineColor: "#4D5362",
  signalColor: "#BAB5AB",
  signalTextColor: "#E8E4DC",
  labelBoxBkgColor: "#23272F",
  labelBoxBorderColor: "#4D5362",
  labelTextColor: "#E8E4DC",
  loopTextColor: "#BAB5AB",
  activationBkgColor: "#2A2F38",
  activationBorderColor: "#A3B8F0",
  sequenceNumberColor: "#15171C",
  errorBkgColor: "#3A2D26",
  errorTextColor: "#EE9585",
  // pastel hues for pie slices, git branches, journeys…
  pie1: "#92B1EE", pie2: "#9FD4AB", pie3: "#F0B68E", pie4: "#C4A9F2", pie5: "#EACB76", pie6: "#7DCBC4", pie7: "#EBA3C6", pie8: "#F0A391",
  pieStrokeColor: "#1A1D23", pieOuterStrokeColor: "#353A45", pieTitleTextColor: "#E8E4DC", pieSectionTextColor: "#15171C", pieLegendTextColor: "#BAB5AB",
  git0: "#92B1EE", git1: "#9FD4AB", git2: "#F0B68E", git3: "#C4A9F2", git4: "#EACB76", git5: "#7DCBC4", git6: "#EBA3C6", git7: "#F0A391",
  cScale0: "#2B3550", cScale1: "#2A3B30", cScale2: "#3A2D26", cScale3: "#33294A", cScale4: "#3A3423", cScale5: "#21393A",
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
