import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderMarkdown, type RenderDeps } from "../src/lib/markdown/pipeline.ts";
import { codeBlock, loadHighlighter, parseMeta, LANGS } from "../src/lib/markdown/shiki.ts";
import { renderWavedrom } from "../src/lib/markdown/wavedrom.ts";
import { parseRelaxedJson } from "../src/lib/markdown/relaxed-json.ts";
import { splitFrontmatter } from "../src/lib/frontmatter.ts";
import type { Page } from "../src/lib/tree.ts";

before(() => loadHighlighter());

const deps = (over: Partial<RenderDeps> = {}): RenderDeps => ({
  file: "content/t/index.md",
  dir: "content/t",
  url: "/t/",
  findPage: (slug) => ({ slug, url: `/${slug}/`, fm: { title: slug } }) as unknown as Page,
  image: (p) => ({ src: `/${p}`, width: 10, height: 10 }),
  card: (p) => `<a class="card" href="${p.url}"></a>`,
  code: (c, l, m) => codeBlock(c, l, m),
  diagram: (kind, src) => (kind === "wavedrom" ? renderWavedrom(src) : `<svg data-mermaid="${src.length}"></svg>`),
  ...over,
});
const squash = (s: string) => s.replace(/\s+/g, "");

test("kitchen sink: every block keeps its exact source, and nothing is dropped", () => {
  const raw = readFileSync(join(import.meta.dirname, "..", "content/_kitchen-sink/index.md"), "utf8");
  const { body } = splitFrontmatter(raw);
  const r = renderMarkdown(body, deps());
  for (const b of r.blocks) assert.ok(body.includes(b.src.split("\n\n")[0]), `block source is a slice of the file: ${b.src.slice(0, 40)}`);
  // Footnote definitions move to the end, so compare as multisets of characters.
  assert.equal([...squash(r.blocks.map((b) => b.src).join(""))].sort().join(""), [...squash(body)].sort().join(""));
  assert.ok(r.hasMath);
  const html = r.blocks.map((b) => b.html).join("");
  for (const needle of ['class="katex"', "math-error", 'figure class="code"', 'class="diagram mermaid"', 'class="diagram wavedrom"', 'class="note"', 'class="note warn"', 'class="cards"', 'class="cards one"', "<figcaption>", "footnotes", "contains-task-list", "<table>", "<blockquote>", 'class="anchor"']) {
    assert.ok(html.includes(needle), `kitchen sink renders ${needle}`);
  }
  assert.equal(r.blocks.filter((b) => b.kind === "media").length, 3, "the figure and the two card blocks fade in");
});

test("code blocks: language label, filename, highlighted lines, copy button", () => {
  const html = renderMarkdown('```verilog title="alu.v" {2,4-5}\na\nb\nc\nd\ne\n```', deps()).blocks[0].html;
  assert.match(html, /<figure class="code" data-lang="verilog">/);
  assert.match(html, /<span class="lbl">verilog<\/span><span class="code-file">alu\.v<\/span>/);
  assert.match(html, /<button class="copy" type="button" hidden/);
  assert.equal((html.match(/class="line hl"/g) || []).length, 3);
  assert.doesNotMatch(html, /<pre[^>]*style=/, "colours come from CSS, not the pre's style");
});

test("every language Areeb uses is highlighted", () => {
  const warns: string[] = [];
  for (const lang of ["verilog", "systemverilog", "vhdl", "c", "cpp", "python", "matlab", "asm", "tcl", "bash", "json", "yaml"]) {
    const el = codeBlock("x = 1 // y", lang, null, (m) => warns.push(m));
    assert.ok(JSON.stringify(el).includes("var(--code-"), `${lang} is tokenised`);
  }
  assert.deepEqual(warns, []);
  const w: string[] = [];
  codeBlock("x", "brainfuck", null, (m) => w.push(m));
  assert.match(w[0], /no syntax highlighting for "brainfuck"/);
  assert.ok(LANGS.includes("system-verilog"));
});

test("code meta: title in any quotes and line ranges", () => {
  assert.deepEqual(parseMeta('title="a b.v" {1,3-4}'), { title: "a b.v", lines: new Set([1, 3, 4]) });
  assert.deepEqual(parseMeta("{7} title=top.sv"), { title: "top.sv", lines: new Set([7]) });
  assert.deepEqual(parseMeta(null), { title: null, lines: new Set() });
});

test("math errors become a visible box, not a broken page", () => {
  const r = renderMarkdown("$$\n\\frac{1}{2\n$$", deps());
  assert.match(r.blocks[0].html, /math-error/);
  assert.match(r.blocks[0].html, /<span class="math-error-msg">KaTeX parse error/);
});

test("wavedrom: relaxed syntax, ids prefixed, skin styles removed, errors boxed", () => {
  assert.deepEqual(parseRelaxedJson("{a: 'x', 'b': \"y\", c: [1, 2,], /* c */ d: true, // e\n}"), { a: "x", b: "y", c: [1, 2], d: true });
  const svg = renderWavedrom("{signal: [{name: 'clk', wave: 'p..'}]}");
  assert.doesNotMatch(svg, /<style/);
  assert.doesNotMatch(svg, /\sid="(?!wd\d+-)/);
  assert.doesNotMatch(svg, /href="#(?!wd\d+-)/);
  assert.match(renderWavedrom("{signal: ["), /class="diagram-error"/);
});

test("images: relative paths resolve, captions become figures, outside images are refused", () => {
  const r = renderMarkdown('![alt](./a.png "Cap")\n\nText ![i](b/c.png) here.', deps());
  assert.match(r.blocks[0].html, /^<figure class="fig"><img src="\/content\/t\/a\.png" width="10" height="10" alt="alt"[^>]*><figcaption>Cap<\/figcaption><\/figure>$/);
  assert.match(r.blocks[1].html, /<p>Text <img src="\/content\/t\/b\/c\.png"/);
  assert.throws(() => renderMarkdown("![x](https://example.com/a.png)", deps()), /content\/t\/index\.md:1: image "https:\/\/example\.com\/a\.png" is on another website/);
  assert.throws(() => renderMarkdown("![x](./missing.png)", deps({ image: () => undefined })), /image "\.\/missing\.png" doesn't exist/);
});

test("headings get ids and anchor links; repeated headings stay unique", () => {
  const r = renderMarkdown("## Timing & Power\n\n## Timing & Power", deps());
  assert.match(r.blocks[0].html, /<h2 id="timing-power">Timing &#x26; Power<a class="anchor" href="#timing-power"/);
  assert.match(r.blocks[1].html, /id="timing-power-1"/);
});
