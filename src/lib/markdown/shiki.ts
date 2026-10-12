import { createHighlighter, type HighlighterGeneric, type ThemeRegistration } from "shiki";
import type { Element, ElementContent } from "hast";

/* The code theme. Colours are CSS variables, mapped to the site tokens in
 * src/styles/code.css, so code blocks always match the sheet they sit on. */
const v = (name: string) => `var(--code-${name})`;
export const SITE_THEME: ThemeRegistration = {
  name: "site-night",
  type: "dark",
  colors: { "editor.background": v("bg"), "editor.foreground": v("fg") },
  settings: [
    { settings: { foreground: v("fg"), background: v("bg") } },
    { scope: ["comment", "punctuation.definition.comment", "string.comment"], settings: { foreground: v("comment") } },
    { scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.control", "keyword.other", "variable.language.this", "support.type.property-name.json"], settings: { foreground: v("keyword") } },
    { scope: ["keyword.operator", "punctuation", "meta.brace", "punctuation.separator", "punctuation.terminator"], settings: { foreground: v("punct") } },
    { scope: ["string", "string.quoted", "markup.inline.raw", "string.template"], settings: { foreground: v("string") } },
    { scope: ["constant.numeric", "constant.language", "constant.character", "constant.other", "support.constant", "keyword.other.unit", "constant.numeric.integer", "constant.numeric.decimal"], settings: { foreground: v("number") } },
    { scope: ["entity.name.type", "entity.name.class", "support.type", "support.class", "storage.type.primitive", "entity.name.type.module", "storage.type.built-in"], settings: { foreground: v("type") } },
    { scope: ["entity.name.function", "support.function", "meta.function-call", "variable.function", "entity.name.tag"], settings: { foreground: v("func") } },
    { scope: ["variable.parameter", "meta.parameter", "entity.other.attribute-name"], settings: { foreground: v("param") } },
    { scope: ["meta.preprocessor", "keyword.control.directive", "entity.name.function.preprocessor", "keyword.control.compiler", "constant.other.preprocessor", "punctuation.definition.directive", "meta.directive", "keyword.other.directive"], settings: { foreground: v("macro") } },
    { scope: ["variable", "variable.other", "entity.name.variable", "support.variable"], settings: { foreground: v("var") } },
    { scope: ["entity.name.section", "markup.heading", "entity.name.tag.yaml"], settings: { foreground: v("keyword"), fontStyle: "bold" } },
    { scope: ["markup.bold"], settings: { fontStyle: "bold" } },
    { scope: ["markup.inserted"], settings: { foreground: v("inserted") } },
    { scope: ["markup.deleted"], settings: { foreground: v("deleted") } },
    { scope: ["invalid", "invalid.illegal"], settings: { foreground: v("deleted") } },
  ],
};

/** Languages loaded at build time. Add one here if you need it (any Shiki language id). */
export const LANGS = [
  "verilog", "system-verilog", "vhdl", "c", "cpp", "python", "matlab", "asm", "tcl", "bash", "json", "yaml",
  "diff", "markdown", "javascript", "typescript", "html", "css", "toml", "makefile", "ini",
];
/** Friendly names → Shiki ids. */
export const ALIASES: Record<string, string> = {
  systemverilog: "system-verilog", sv: "system-verilog", svh: "system-verilog", v: "verilog", vhd: "vhdl",
  sh: "bash", shell: "bash", zsh: "bash", console: "bash", py: "python", m: "matlab", s: "asm", nasm: "asm",
  yml: "yaml", h: "c", hpp: "cpp", "c++": "cpp", js: "javascript", ts: "typescript", md: "markdown", make: "makefile",
};

let highlighter: HighlighterGeneric<any, any> | null = null;
export async function loadHighlighter() {
  highlighter ??= await createHighlighter({ themes: [SITE_THEME], langs: LANGS });
  return highlighter;
}

/** Parses the text after the language in a fence: `title="alu.v" {1,4-6}`. */
export function parseMeta(meta: string | null): { title: string | null; lines: Set<number> } {
  const lines = new Set<number>();
  const title = meta ? /\btitle=(?:"([^"]*)"|'([^']*)'|(\S+))/.exec(meta) : null;
  const ranges = meta ? /\{([\d,\s-]+)\}/.exec(meta) : null;
  if (ranges) {
    for (const part of ranges[1].split(",")) {
      const [a, b] = part.trim().split("-").map((n) => parseInt(n, 10));
      if (Number.isNaN(a)) continue;
      for (let i = a; i <= (Number.isNaN(b) || b === undefined ? a : b); i++) lines.add(i);
    }
  }
  return { title: title ? (title[1] ?? title[2] ?? title[3]) : null, lines };
}

const el = (tagName: string, properties: Record<string, unknown>, children: ElementContent[] = []): Element => ({ type: "element", tagName, properties: properties as any, children });
const text = (value: string): ElementContent => ({ type: "text", value });

/**
 * A highlighted code block as a figure: a header with the language label, optional
 * file name and a copy button (shown by JS), then Shiki's <pre>.
 */
export function codeBlock(code: string, langIn: string | null, meta: string | null, warn: (msg: string) => void = () => {}): Element {
  if (!highlighter) throw new Error("loadHighlighter() must run before rendering code");
  const raw = (langIn ?? "").trim();
  const id = ALIASES[raw] ?? raw;
  const known = id && highlighter.getLoadedLanguages().includes(id);
  if (raw && !known && !["text", "txt", "plain", "plaintext"].includes(raw)) warn(`no syntax highlighting for "${raw}"; showing it as plain text. Supported: ${LANGS.join(", ")}`);
  const { title, lines } = parseMeta(meta);
  const root = highlighter.codeToHast(code.replace(/\n$/, ""), {
    lang: known ? id : "text",
    theme: "site-night",
    transformers: [
      {
        line(node, n) {
          if (lines.has(n)) this.addClassToHast(node, "hl");
        },
        pre(node) {
          delete node.properties.style; // colours come from code.css
          node.properties.tabindex = "0";
        },
      },
    ],
  });
  const pre = root.children[0] as Element;
  const label = raw || "text";
  const head = el("figcaption", { className: ["code-head"] }, [
    el("span", { className: ["lbl"] }, [text(label)]),
    ...(title ? [el("span", { className: ["code-file"] }, [text(title)])] : []),
    el("button", { className: ["copy"], type: "button", hidden: true, ariaLabel: `Copy ${title ?? label} code` }, [text("copy")]),
  ]);
  return el("figure", { className: ["code"], dataLang: label }, [head, pre]);
}
