import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import type { Root as MdRoot, RootContent as MdNode } from "mdast";
import type { Root as HRoot, RootContent as HNode, Element } from "hast";
import { ContentError } from "../errors.ts";
import { esc, slugger } from "../html.ts";
import { normalize, type Page } from "../tree.ts";
import type { ImageInfo } from "../card.ts";

export interface Block {
  /** The block's Markdown, exactly as written in the file. */
  src: string;
  html: string;
  /** What the typing animation should do once the source is typed. */
  kind: "text" | "media";
}

export interface Rendered {
  blocks: Block[];
  hasMath: boolean;
}

export interface RenderDeps {
  /** Repo-relative path of the file, for error messages. */
  file: string;
  /** Repo-relative folder of the file, for relative image paths. */
  dir: string;
  /** URL of the page being rendered ("/" for home.md), for relative card paths. */
  url: string;
  findPage(slug: string): Page | undefined;
  image(path: string): ImageInfo | undefined;
  card(page: Page): string;
  /** Highlighted <pre> for a fenced code block. */
  code?(code: string, lang: string | null, meta: string | null): Element;
  /** Inline SVG markup for mermaid / wavedrom fences. */
  diagram?(kind: "mermaid" | "wavedrom", code: string): string;
}

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(remarkDirective);

export function parseMarkdown(body: string): MdRoot {
  return parser.parse(body);
}

const lineOf = (n: { position?: { start: { line: number } } }) => n.position?.start.line ?? 0;
const raw = (value: string): HNode => ({ type: "raw", value }) as unknown as HNode;

/** Resolves a card's `to` (absolute "/projects/x" or relative "../x") to a page slug. */
export function resolveTo(to: string, fromUrl: string): string {
  const path = to.startsWith("/") ? to : `${fromUrl}${to}`;
  return normalize(path.split("#")[0]);
}

export function renderMarkdown(body: string, deps: RenderDeps): Rendered {
  const mdast = parseMarkdown(body);
  let hasMath = false;
  const slug = slugger();
  const where = (n: { position?: { start: { line: number } } }) => `${deps.file}:${lineOf(n)}`;
  const srcOf = (n: MdNode) => body.slice(n.position!.start.offset!, n.position!.end.offset!);

  const cardFor = (node: { attributes?: Record<string, string | null | undefined> | null; position?: any }) => {
    const to = node.attributes?.to;
    if (!to) throw new ContentError(where(node), 'a card needs a target, like ::card{to="/projects/my-thing"}');
    const target = resolveTo(to, deps.url);
    const page = deps.findPage(target);
    if (!page) {
      throw new ContentError(where(node), `card points to "${to}", but there is no page at /${target}/. Check the folder name, or create the page first.`);
    }
    return deps.card(page);
  };

  const imageFor = (url: string, alt: string, n: any) => {
    if (/^[a-z]+:/i.test(url) || url.startsWith("//")) {
      throw new ContentError(where(n), `image "${url}" is on another website. Save it next to this page and link it as ./name.png (the site's security policy only loads its own images).`);
    }
    const path = url.startsWith("/") ? normalize(url) : normalize(`${deps.dir}/${decodeURI(url)}`);
    const info = deps.image(path);
    if (!info) throw new ContentError(where(n), `image "${url}" doesn't exist (looked for ${path}).`);
    return `<img src="${esc(info.src)}" width="${info.width}" height="${info.height}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  };

  const hast = unified()
    .use(remarkRehype, {
      allowDangerousHtml: true,
      footnoteLabel: "Footnotes",
      handlers: {
        code(state, node) {
          const lang = node.lang?.toLowerCase() ?? null;
          let out: Element;
          if ((lang === "mermaid" || lang === "wavedrom") && deps.diagram) {
            out = { type: "element", tagName: "figure", properties: { className: ["diagram", lang] }, children: [raw(deps.diagram(lang, node.value))] };
          } else if (deps.code) {
            out = deps.code(node.value, lang, node.meta ?? null);
          } else {
            out = { type: "element", tagName: "pre", properties: {}, children: [{ type: "element", tagName: "code", properties: {}, children: [{ type: "text", value: node.value }] }] };
          }
          state.patch(node, out);
          return out;
        },
        image(state, node) {
          const out = raw(imageFor(node.url, node.alt ?? "", node));
          state.patch(node, out as any);
          return out as any;
        },
        paragraph(state, node) {
          // An image on its own line becomes a figure; its title becomes the caption.
          const kids = node.children.filter((c) => !(c.type === "text" && !c.value.trim()));
          if (kids.length === 1 && kids[0].type === "image") {
            const img = kids[0];
            const cap = img.title ? `<figcaption>${esc(img.title)}</figcaption>` : "";
            const out: Element = { type: "element", tagName: "figure", properties: { className: ["fig"] }, children: [raw(imageFor(img.url, img.alt ?? "", img) + cap)] };
            state.patch(node, out);
            return out;
          }
          const out: Element = { type: "element", tagName: "p", properties: {}, children: state.all(node) };
          state.patch(node, out);
          return out;
        },
        heading(state, node) {
          const text = toText(node);
          const id = slug(text);
          const out: Element = {
            type: "element",
            tagName: `h${node.depth}`,
            properties: { id },
            children: [
              ...state.all(node),
              { type: "element", tagName: "a", properties: { className: ["anchor"], href: `#${id}`, ariaLabel: `Link to this section: ${text}` }, children: [{ type: "text", value: "#" }] },
            ],
          };
          state.patch(node, out);
          return out;
        },
        leafDirective(state, node) {
          if (node.name !== "card") {
            throw new ContentError(where(node), `unknown block "::${node.name}". Supported: ::card{to="..."}`);
          }
          const out: Element = { type: "element", tagName: "div", properties: { className: ["cards", "one"] }, children: [raw(cardFor(node))] };
          state.patch(node, out);
          return out;
        },
        containerDirective(state, node) {
          let out: Element;
          if (node.name === "cards") {
            const items = node.children.map((c) => {
              if (c.type === "leafDirective" && c.name === "card") return raw(cardFor(c));
              throw new ContentError(where(c), "inside :::cards, put only ::card{to=\"...\"} lines.");
            });
            out = { type: "element", tagName: "div", properties: { className: ["cards"] }, children: items };
          } else if (node.name === "note" || node.name === "warn") {
            const kids = node.children;
            const label = kids[0]?.type === "paragraph" && kids[0].data && (kids[0].data as any).directiveLabel ? kids.shift() : null;
            const title = label ? [{ type: "element", tagName: "p", properties: { className: ["note-title"] }, children: state.all(label as any) } as Element] : [];
            out = { type: "element", tagName: "div", properties: { className: node.name === "warn" ? ["note", "warn"] : ["note"] }, children: [...title, ...state.wrap(state.all(node), true)] };
          } else {
            throw new ContentError(where(node), `unknown block ":::${node.name}". Supported: :::note, :::warn, :::cards`);
          }
          state.patch(node, out);
          return out;
        },
        textDirective(state, node) {
          // "10:30" or "key:value" in ordinary text parse as directives; put the text back.
          const full = body.slice(node.position!.start.offset!, node.position!.end.offset!);
          if (!node.children.length) return { type: "text", value: full };
          // Keep the bracketed part as Markdown so footnotes and emphasis inside it still work.
          const close = full.lastIndexOf("]");
          return [{ type: "text", value: `:${node.name}[` }, ...state.all(node), { type: "text", value: full.slice(close) }] as any;
        },
      },
    })
    .runSync(mdast) as HRoot;

  // Group the converted nodes per source block first: KaTeX replaces nodes and drops
  // their source positions, so matching has to happen before it runs.
  const groups = groupBlocks(mdast, hast, srcOf);
  if (hasMathNode(mdast)) {
    hasMath = true;
    const tmp: HRoot = { type: "root", children: groups.map((g) => ({ type: "element", tagName: "div", properties: {}, children: g.nodes }) as Element) };
    unified().use(rehypeKatex, { throwOnError: false, errorColor: "currentColor", strict: "ignore", output: "htmlAndMathml" }).runSync(tmp);
    markMathErrors(tmp);
    tmp.children.forEach((w, i) => (groups[i].nodes = (w as Element).children as HNode[]));
  }

  const blocks = groups
    .map(({ src, nodes }) => {
      const out = html(nodes);
      return { src, html: out, kind: MEDIA.test(out) ? "media" : "text" } as Block;
    })
    .filter((b) => b.src.trim() || b.html.trim());
  return { blocks, hasMath };
}

function hasMathNode(n: any): boolean {
  return n.type === "math" || n.type === "inlineMath" || (n.children ?? []).some(hasMathNode);
}

/** Adds the KaTeX error message as visible text so the problem is obvious on the page. */
function markMathErrors(node: HRoot | Element) {
  for (const c of node.children) {
    if (c.type !== "element") continue;
    const cls = c.properties?.className;
    if (Array.isArray(cls) && cls.includes("katex-error")) {
      const msg = String(c.properties.title ?? "Math error");
      c.properties.className = [...cls, "math-error"];
      c.properties.role = "note";
      c.children = [
        { type: "element", tagName: "span", properties: { className: ["math-error-msg"] }, children: [{ type: "text", value: msg.replace(/^ParseError: /, "") }] },
        { type: "element", tagName: "code", properties: {}, children: c.children },
      ];
      continue;
    }
    markMathErrors(c);
  }
}

function toText(node: any): string {
  if (node.type === "text" || node.type === "inlineCode" || node.type === "inlineMath") return node.value;
  return (node.children ?? []).map(toText).join("");
}

const stringifier = unified().use(rehypeStringify, { allowDangerousHtml: true });
const html = (nodes: HNode[]) => stringifier.stringify({ type: "root", children: nodes } as HRoot);

const MEDIA = /^(?:<figure class="fig"|<div class="cards)/;

interface Group {
  src: string;
  nodes: HNode[];
}

/**
 * Pairs each top-level Markdown block with the HTML nodes it produced. Nodes the
 * converter keeps (paragraphs, code, lists…) carry the source position of the Markdown
 * node they came from, which is how they are matched.
 */
export function groupBlocks(mdast: MdRoot, hast: HRoot, srcOf: (n: MdNode) => string): Group[] {
  const byStart = new Map<number, MdNode>();
  for (const n of mdast.children) byStart.set(n.position!.start.offset!, n);

  const found = new Map<MdNode, HNode[]>();
  let footnotes: HNode | null = null;
  let last: MdNode | null = null;
  for (const h of hast.children) {
    if (h.type === "text" && !h.value.trim()) continue;
    if (h.type === "element" && h.tagName === "section" && "dataFootnotes" in (h.properties ?? {})) {
      footnotes = h;
      continue;
    }
    const start = (h as any).position?.start?.offset;
    const md = start === undefined ? undefined : byStart.get(start);
    if (md) {
      last = md;
      if (!found.has(md)) found.set(md, []);
      found.get(md)!.push(h);
    } else if (last) {
      found.get(last)!.push(h);
    }
  }

  const groups: Group[] = [];
  const footSrc: string[] = [];
  for (const md of mdast.children) {
    const src = srcOf(md);
    if (md.type === "footnoteDefinition") {
      footSrc.push(src);
      continue;
    }
    const nodes = found.get(md);
    if (!nodes) {
      // Link definitions and comments render nothing; type them along with the block before.
      if (groups.length) groups[groups.length - 1].src += "\n\n" + src;
      else groups.push({ src, nodes: [] });
      continue;
    }
    groups.push({ src, nodes });
  }
  if (footnotes) groups.push({ src: footSrc.join("\n"), nodes: [footnotes] });
  return groups;
}
