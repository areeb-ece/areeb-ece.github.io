/* End-to-end check of the built site in a real browser (Playwright).
 * Run after `npm run build`:  npm run test:browser   (Chromium)
 *                             BROWSER=firefox npm run test:browser
 * Serves dist/ locally and checks the typing animation, reduced motion, the sidebar,
 * the kitchen sink, the CSP, contrast over the night sky and the JS budget. Screenshots
 * go to test-results/screenshots/ (uploaded as a CI artifact). */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import assert from "node:assert/strict";
import { chromium, firefox } from "playwright";
import { serve } from "./serve.js";
import { TIMING } from "../src/client/timing.js";
import { buildTree, listed } from "../src/lib/tree.ts";
import { parseConfig } from "../src/lib/config.ts";

const ROOT = path.join(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const BROWSER = process.env.BROWSER || "chromium";
const ENGINES = { chromium, firefox };
if (!ENGINES[BROWSER]) throw new Error(`BROWSER must be one of: ${Object.keys(ENGINES).join(", ")}`);
const IS_CHROMIUM = BROWSER === "chromium";
const SHOTS = path.join(ROOT, "test-results", "screenshots", IS_CHROMIUM ? "" : BROWSER);
const VIEW = { width: 1440, height: 900 };
const results = [];
const ok = (msg) => (results.push(msg), console.log(`ok [${BROWSER}] ${msg}`));

function walk(dir) {
  return fs.readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return fs.statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// ── static checks on dist/ ────────────────────────────────────────────────
const htmlFiles = walk(DIST).filter((f) => f.endsWith(".html"));
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, "utf8");
  const rel = path.relative(DIST, f);
  const head = html.slice(0, html.indexOf("</head>"));
  assert.match(head, /<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline';/, `${rel}: strict CSP meta`);
  assert.ok(head.indexOf("Content-Security-Policy") < head.search(/<(link|script)\b/), `${rel}: CSP comes before any resource`);
  for (const tag of html.match(/<script\b[^>]*>/g) ?? []) assert.match(tag, /\ssrc=|type="application\/json"/, `${rel}: no inline scripts (${tag})`);
  assert.doesNotMatch(html, /<style\b/, `${rel}: no <style> elements`);
  assert.doesNotMatch(html, /<(script|img)\b[^>]*\ssrc="(https?:)?\/\/|<link\b(?![^>]*rel="canonical")[^>]*href="(https?:)?\/\//, `${rel}: nothing loaded from other sites`);
}
ok(`static: ${htmlFiles.length} pages have the CSP, no inline scripts or <style>, nothing external`);

const jsFiles = walk(DIST).filter((f) => f.endsWith(".js"));
const jsGzip = jsFiles.reduce((n, f) => n + zlib.gzipSync(fs.readFileSync(f), { level: 9 }).length, 0);
assert.ok(jsGzip <= 15 * 1024, `client JS is ${jsGzip} bytes gzipped (budget 15 KB)`);
ok(`client JS budget: ${(jsGzip / 1024).toFixed(1)} KB gzipped across ${jsFiles.length} files (≤ 15 KB)`);

// Pages: every built page except 404.
const pages = htmlFiles
  .map((f) => "/" + path.relative(DIST, f).split(path.sep).join("/").replace(/index\.html$/, ""))
  .filter((u) => u !== "/404.html");
const contentPages = pages.filter((u) => u !== "/");

const { server, base } = await serve(DIST);
const browser = await ENGINES[BROWSER].launch(IS_CHROMIUM && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [];

/** A fresh context that records console errors, page errors and CSP violations. */
async function context(opts = {}) {
  const ctx = await browser.newContext({ viewport: VIEW, ...opts });
  await ctx.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`));
    window.__longTasks = [];
    try {
      new PerformanceObserver((l) => window.__longTasks.push(...l.getEntries().map((e) => ({ start: e.startTime, duration: e.duration })))).observe({ type: "longtask", buffered: true });
    } catch {}
  });
  ctx.on("page", (page) => {
    page.on("console", (m) => m.type() === "error" && !/status of 404/.test(m.text()) && problems.push(`${page.url()}: ${m.text()}`));
    page.on("pageerror", (e) => problems.push(`${page.url()}: ${e.message}`));
  });
  return ctx;
}
const marks = (page) => page.evaluate(() => Object.fromEntries(performance.getEntriesByType("mark").map((m) => [m.name, m.startTime])));
const waitDone = (page, timeout = 8000) => page.waitForFunction(() => document.documentElement.classList.contains("typed"), null, { timeout, polling: 50 });

try {
  fs.mkdirSync(SHOTS, { recursive: true });

  // ── home: cursor alone, then the title, then the rest ──────────────────
  {
    const ctx = await context();
    const page = await ctx.newPage();
    await page.goto(base + "/");
    const title = await page.getAttribute(".hero-title", "data-src");
    // Sample the page until the title is done: nothing but the cursor may be visible.
    let samples = 0;
    const deadline = Date.now() + 8000;
    while (!(await marks(page))["typing:title-done"]) {
      if (Date.now() > deadline) {
        const why = await page.evaluate(() => ({ classes: document.documentElement.className, typing: document.documentElement.dataset.typing, reduce: matchMedia("(prefers-reduced-motion: reduce)").matches, marks: performance.getEntriesByType("mark").map((m) => m.name) }));
        assert.fail(`the home title never finished typing: ${JSON.stringify(why)}`);
      }
      // Checked in the same task as the sample, or the title could finish in between.
      const s = await page.evaluate(() => ({
        done: performance.getEntriesByType("mark").some((m) => m.name === "typing:title-done"),
        shown: [...document.querySelectorAll(".main .b")].filter((b) => b.classList.contains("shown") || b.getBoundingClientRect().width > 1).length,
        typed: document.querySelector("pre.typing")?.textContent ?? "",
        cursor: !!document.querySelector(".main .cursor"),
      }));
      if (s.done) break;
      assert.equal(s.shown, 0, "nothing besides the cursor (and the title being typed) shows before the title is finished");
      assert.ok(s.cursor, "the cursor is on screen");
      assert.ok(title.startsWith(s.typed), `only the title is being typed (saw "${s.typed}")`);
      samples++;
      await page.waitForTimeout(40);
    }
    const m = await marks(page);
    const typed = m["typing:title-done"] - m["typing:start"];
    // Expected window: the lead, 48–120 ms per character, plus the punctuation pauses.
    const pauses = [...title].reduce((n, c) => n + (TIMING.punctPauseMs[c] ?? 0), 0);
    const lo = TIMING.homeLeadMs + title.length * TIMING.titleCharMs[0] + pauses;
    const hi = TIMING.homeLeadMs + title.length * TIMING.titleCharMs[1] + pauses;
    assert.ok(typed >= lo - 20 && typed <= hi + 120, `title finished after ${typed.toFixed(0)} ms, expected ${lo}–${hi} ms`);
    assert.ok(samples > 10);
    ok(`home: only the cursor and title until the title finished at ${typed.toFixed(0)} ms (window ${lo}–${hi} ms)`);

    await waitDone(page);
    const m2 = await marks(page);
    assert.ok(m2["typing:done"] - m2["typing:title-done"] <= 3100, "the rest of home types within 3 s");
    await page.screenshot({ path: path.join(SHOTS, "home.png") });

    // Second visit in the same session: already finished.
    await page.goto(base + "/projects/");
    await page.goto(base + "/");
    const again = await page.evaluate(() => ({ typing: document.documentElement.classList.contains("typing"), hidden: [...document.querySelectorAll(".main .b")].filter((b) => b.getBoundingClientRect().width <= 1).length }));
    assert.deepEqual(again, { typing: false, hidden: 0 });
    ok("home: plays once per visit; coming back shows it finished");
    await ctx.close();
  }

  // ── every content page finishes within 3.1 s ──────────────────────────
  {
    const ctx = await context();
    const page = await ctx.newPage();
    let slowest = 0;
    for (const url of contentPages) {
      await page.goto(base + url);
      await waitDone(page);
      const m = await marks(page);
      const took = m["typing:done"] - m["typing:start"];
      assert.ok(took <= 3100, `${url} took ${took.toFixed(0)} ms to type`);
      slowest = Math.max(slowest, took);
      const hidden = await page.$$eval(".main .b", (bs) => bs.filter((b) => b.getBoundingClientRect().width <= 1).length);
      assert.equal(hidden, 0, `${url}: every block is shown at the end`);
      assert.equal(await page.$$eval("pre.typing", (p) => p.length), 0, `${url}: typing layer removed`);
    }
    ok(`content: ${contentPages.length} pages each finished typing within 3.1 s (slowest ${slowest.toFixed(0)} ms)`);

    // no long tasks while typing the heaviest page (the Long Tasks API is Chromium-only)
    if (IS_CHROMIUM) {
      await page.goto(base + "/_kitchen-sink/");
      await waitDone(page);
      const m = await marks(page);
      const long = (await page.evaluate(() => window.__longTasks)).filter((t) => t.start >= m["typing:start"] && t.start <= m["typing:done"]);
      assert.deepEqual(long, [], "no long tasks during the animation");
      ok("performance: no long tasks (> 50 ms) while the kitchen sink types");
    }

    // skipping
    await page.goto(base + "/projects/nand-alu/");
    await page.waitForFunction(() => document.documentElement.classList.contains("typing-started"));
    await page.mouse.click(900, 600);
    await page.waitForFunction(() => document.documentElement.classList.contains("typed"), null, { timeout: 300 });
    ok("skip: a click during typing finishes the page at once");

    // the parked cursor
    assert.ok(await page.$(".main .cursor.idle"), "the cursor stays, blinking, after the last block");
    await ctx.close();
  }

  // ── reduced motion and no JS show the final page immediately ──────────
  for (const [label, opts] of [["reduced motion", { reducedMotion: "reduce" }], ["JavaScript off", { javaScriptEnabled: false }]]) {
    const ctx = await context(opts);
    const page = await ctx.newPage();
    for (const url of ["/", "/projects/nand-alu/"]) {
      await page.goto(base + url, { waitUntil: "domcontentloaded" });
      const s = await page.evaluate(() => ({ typing: document.documentElement.classList.contains("typing"), hidden: [...document.querySelectorAll(".main .b")].filter((b) => b.getBoundingClientRect().width <= 1).length, pre: document.querySelectorAll("pre.typing").length }));
      assert.deepEqual(s, { typing: false, hidden: 0, pre: 0 }, `${label} ${url}`);
    }
    ok(`${label}: final content shows immediately`);
    await ctx.close();
  }

  // ── sidebar ───────────────────────────────────────────────────────────
  {
    const md = {};
    const assets = [];
    for (const f of walk(path.join(ROOT, "content"))) {
      const rel = path.relative(ROOT, f).split(path.sep).join("/");
      if (rel.endsWith(".md")) md[rel] = fs.readFileSync(f, "utf8");
      else assets.push(rel);
    }
    const config = parseConfig(fs.readFileSync(path.join(ROOT, "site.config.yaml"), "utf8"));
    const tree = buildTree({ markdown: md, assets, reservedSlugs: config.reservedSlugs, includeDrafts: false });
    const expected = [];
    const visit = (ps) => listed(ps).forEach((p) => (expected.push(p.slug), visit(p.children)));
    visit(tree.roots);

    const ctx = await context();
    const page = await ctx.newPage();
    await page.goto(base + "/projects/nand-alu/");
    await waitDone(page);
    assert.deepEqual(await page.$$eval('[role="tree"] [role="treeitem"]', (els) => els.map((e) => e.dataset.slug)), expected, "sidebar matches content/");
    assert.equal(await page.getAttribute('[aria-current="page"]', "data-slug"), "projects/nand-alu");
    assert.equal(await page.getAttribute('[data-slug="projects"]', "aria-expanded"), "true", "ancestors start expanded");
    ok(`sidebar: tree matches content/ (${expected.length} pages, hidden and drafts left out)`);

    // keyboard: arrows move, right expands, left collapses
    await page.focus('[aria-current="page"]');
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.evaluate(() => document.activeElement.dataset.slug), "tools");
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.getAttribute('[data-slug="tools"]', "aria-expanded"), "true");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.getAttribute('[data-slug="tools"]', "aria-expanded"), "false");
    await page.keyboard.press("Home");
    assert.equal(await page.evaluate(() => document.activeElement.dataset.slug), "projects");
    ok("sidebar: keyboard navigation (arrows, Home, expand/collapse)");

    // remembered state: an opened folder and the collapsed rail survive reloads and navigation
    await page.click('[data-slug="tools"] .chev');
    await page.click("#railBtn");
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains("rail")));
    await page.reload();
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains("rail")), "rail state persists across reloads");
    assert.equal(await page.getAttribute("#railBtn", "aria-expanded"), "false");
    await page.click("#railBtn");
    await page.goto(base + "/");
    assert.equal(await page.getAttribute('[data-slug="tools"]', "aria-expanded"), "true", "opened folders persist");
    assert.ok(!(await page.evaluate(() => document.documentElement.classList.contains("rail"))));
    ok("sidebar: collapsed rail and open folders persist across reloads (localStorage)");
    await ctx.close();
  }

  // ── kitchen sink renders everything ───────────────────────────────────
  {
    const ctx = await context(IS_CHROMIUM ? { reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] } : { reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(base + "/_kitchen-sink/");
    await page.waitForLoadState("networkidle");
    for (const sel of [".katex-display .katex", ".katex", ".math-error", "figure.code pre.shiki .line", "figure.code .line.hl", "figure.mermaid svg", "figure.wavedrom svg", ".diagram-error", ".note:not(.warn)", ".note.warn", ".cards .card", ".cards.one .card", "figure.fig figcaption", "table", ".footnotes", ".contains-task-list"]) {
      assert.ok(await page.$(sel), `kitchen sink has ${sel}`);
    }
    const langs = await page.$$eval("figure.code", (fs) => fs.map((f) => f.dataset.lang));
    for (const l of ["verilog", "systemverilog", "vhdl", "c", "cpp", "python", "matlab", "asm", "tcl", "bash", "json", "yaml"]) assert.ok(langs.includes(l), `code block for ${l}`);
    assert.ok(await page.evaluate(() => document.fonts.check("16px KaTeX_Main")), "KaTeX fonts load from the site");
    assert.ok(await page.isVisible("figure.code .copy"), "copy buttons are shown");
    if (IS_CHROMIUM) {
      // Playwright can only grant clipboard access in Chromium.
      await page.click("figure.code .copy");
      assert.match(await page.evaluate(() => navigator.clipboard.readText()), /^module counter/);
    }
    ok("kitchen sink: math, code (12 languages), Mermaid, WaveDrom, callouts, cards, figures, tables, footnotes, copy button");

    // WaveDrom's wave segments are <use> copies; if their styling doesn't reach them they
    // render as solid black (that happened in Firefox). Count near-black pixels.
    const wd = (await page.locator("figure.wavedrom").first().screenshot()).toString("base64");
    const probe = await browser.newPage();
    const dark = await probe.evaluate(async (b64) => {
      const img = new Image();
      img.src = "data:image/png;base64," + b64;
      await img.decode();
      const c = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height });
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (Math.max(d[i], d[i + 1], d[i + 2]) < 8) n++;
      return n / (d.length / 4);
    }, wd);
    await probe.close();
    assert.ok(dark < 0.002, `WaveDrom diagram is ${(dark * 100).toFixed(1)}% near-black pixels (its shapes lost their styling)`);
    ok(`WaveDrom: wave shapes are styled, no black fills (${(dark * 100).toFixed(2)}% near-black)`);
    await page.screenshot({ path: path.join(SHOTS, "kitchen-sink.png"), fullPage: true });
    for (const [url, name] of [["/projects/", "category"], ["/projects/nand-alu/", "project"], ["/nope/", "404"]]) {
      await page.goto(base + url);
      await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: name === "project" });
    }
    assert.equal(await page.textContent(".notfound h1"), "Nothing here.");
    assert.ok(await page.$(".side .tree"), "the 404 page keeps the sidebar");
    ok("screenshots saved; 404 page keeps the sidebar");
    await ctx.close();
  }

  // ── contrast over the sky ─────────────────────────────────────────────
  {
    // The worst case is the haze's brightest point with the brightest star of every
    // layer on top of it, so measure each part on its own and add them up.
    const ctx = await context({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(base + "/404.html");
    await page.waitForSelector(".sky-layer:nth-child(4)", { state: "attached" }); // the haze, then three star layers
    const ink3 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ink-3").trim());
    const shot = async (show) => {
      await page.evaluate((show) => {
        document.querySelector(".shell").style.visibility = "hidden";
        document.querySelector(".haze").style.visibility = show === "haze" ? "" : "hidden";
        document.querySelectorAll(".sky-layer").forEach((e, i) => (e.style.visibility = show === i ? "" : "hidden"));
      }, show);
      return (await page.screenshot()).toString("base64");
    };
    const shots = { bare: await shot(null), haze: await shot("haze"), layers: [await shot(0), await shot(1), await shot(2)] };
    const analysis = await browser.newPage(); // no CSP here, so the screenshots can be decoded on a canvas
    const r = await analysis.evaluate(async ({ shots, ink3 }) => {
      const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const lum = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
      const pixels = async (b64) => {
        const img = new Image();
        img.src = "data:image/png;base64," + b64;
        await img.decode();
        const c = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height });
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, c.width, c.height).data;
      };
      const bare = await pixels(shots.bare);
      const peak = (d) => { let m = 0; for (let i = 0; i < d.length; i += 4) m = Math.max(m, lum(d, i)); return m; };
      const delta = (d) => { let m = 0; for (let i = 0; i < d.length; i += 4) m = Math.max(m, lum(d, i) - lum(bare, i)); return m; };
      const haze = peak(await pixels(shots.haze));
      const stars = [];
      for (const s of shots.layers) stars.push(delta(await pixels(s)));
      const hex = ink3.replace("#", "");
      const text = 0.2126 * lin(parseInt(hex.slice(0, 2), 16)) + 0.7152 * lin(parseInt(hex.slice(2, 4), 16)) + 0.0722 * lin(parseInt(hex.slice(4, 6), 16));
      const worst = haze + stars.reduce((a, b) => a + b, 0);
      return { haze, stars, worst, ratio: (text + 0.05) / (worst + 0.05) };
    }, { shots, ink3 });
    assert.ok(r.ratio >= 4.5, `--ink-3 over the brightest possible sky is ${r.ratio.toFixed(2)}:1 (needs 4.5)`);
    assert.ok(r.stars.every((s) => s > 0.001), "every star layer is actually visible");
    ok(`contrast: --ink-3 stays ${r.ratio.toFixed(2)}:1 over the brightest possible sky (haze ${r.haze.toFixed(4)} + stars ${r.stars.map((s) => s.toFixed(4)).join(" + ")})`);
    await analysis.close();
    await ctx.close();
  }

  // ── the settings panel (public/design/ui.js) ──────────────────────────
  {
    const ctx = await context({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(base + "/projects/");
    const stars = () => page.$$eval(".sky circle", (c) => c.length);
    const before = await stars();
    assert.ok(before > 0, "stars are drawn");
    await page.click(".side-foot #designSettings");
    assert.ok(await page.isVisible(".sd-panel"), "the gear opens the panel");
    const listed = await page.$$eval("[data-theme-pick]", (b) => b.map((e) => e.dataset.themePick));
    const fromTokens = [...fs.readFileSync(path.join(ROOT, "public/design/tokens.css"), "utf8").matchAll(/^:root(?:, |\[)data-theme="([\w-]+)"|^:root, \[data-theme="([\w-]+)"/gm)].map((m) => m[1] ?? m[2]);
    assert.deepEqual(listed, ["auto", ...fromTokens], "every theme in tokens.css is offered, in order");
    await page.click('[data-theme-pick="console"]');
    assert.equal(await page.getAttribute("html", "data-theme"), "console");
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(0, 0, 0)");
    await page.fill('[data-range="density"]', "2");
    await page.waitForFunction((n) => document.querySelectorAll(".sky circle").length > n, before);
    await page.click('[data-check="typing"]');
    await page.keyboard.press("Escape");
    assert.ok(!(await page.isVisible(".sd-panel")), "Escape closes the panel");

    // Saved for the next visit, applied before the first paint, and shared by every page.
    await page.goto(base + "/projects/nand-alu/", { waitUntil: "commit" });
    await page.waitForSelector("body");
    assert.equal(await page.getAttribute("html", "data-theme"), "console", "theme applied before the page renders");
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("design.settings")));
    assert.equal(saved.theme, "console");
    assert.equal(saved.sky.density, 2);
    assert.equal(saved.typing, false);
    await page.reload();
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains("typing")), false, "typing effect off");

    // Stars off, then reset everything.
    await page.click("#designSettings");
    await page.click('[data-sky-check="stars"]');
    assert.equal(await stars(), 0, "stars can be switched off");
    await page.click("[data-reset]");
    assert.equal(await page.getAttribute("html", "data-theme"), "dark");
    assert.equal(await stars(), before, "reset brings the default sky back");
    assert.equal(await page.evaluate(() => localStorage.getItem("design.settings")), null);
    await page.screenshot({ path: path.join(SHOTS, "settings.png") });
    ok(`settings: the gear lists all ${fromTokens.length} themes; theme, sky and typing changes apply at once, persist and reset`);
    await ctx.close();
  }

  // ── narrow window: no sideways scrolling, sidebar collapses ───────────
  {
    const ctx = await context({ viewport: { width: 400, height: 800 } });
    const page = await ctx.newPage();
    for (const url of ["/", ...contentPages]) {
      await page.goto(base + url);
      const s = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, rail: document.documentElement.classList.contains("rail") }));
      assert.deepEqual(s, { w: 400, rail: true }, `${url} at 400 px`);
    }
    ok("narrow window: no horizontal page scroll; the sidebar starts as a rail");
    await ctx.close();
  }

  assert.deepEqual(problems, [], "no console errors and no CSP violations");
  ok("no console errors and no CSP violations on any page");
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${results.length} checks passed`);
