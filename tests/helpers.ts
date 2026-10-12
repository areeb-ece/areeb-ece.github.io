import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { buildTree, type TreeInput } from "../src/lib/tree.ts";
import { renderMarkdown } from "../src/lib/markdown/pipeline.ts";
import { cardHtml } from "../src/lib/card.ts";

export const FIXTURES = join(import.meta.dirname, "fixtures");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Reads a fixture folder the way the site reads content/: markdown by path, plus asset paths. */
export function readFixture(name: string): Pick<TreeInput, "markdown" | "assets"> {
  const base = join(FIXTURES, name);
  const markdown: Record<string, string> = {};
  const assets: string[] = [];
  for (const file of walk(join(base, "content"))) {
    const rel = relative(base, file).split(sep).join("/");
    if (rel.endsWith(".md")) markdown[rel] = readFileSync(file, "utf8");
    else assets.push(rel);
  }
  return { markdown, assets };
}

export function tree(markdown: Record<string, string>, opts: Partial<TreeInput> = {}) {
  return buildTree({ markdown, assets: [], reservedSlugs: ["prereqflow", "otucalendar"], includeDrafts: false, ...opts });
}

/** Renders every page in a tree, as the build does. */
export function renderAll(t: ReturnType<typeof buildTree>) {
  for (const p of t.bySlug.values()) {
    renderMarkdown(p.body, {
      file: p.file,
      dir: p.dir,
      url: p.url,
      findPage: (s) => t.bySlug.get(s),
      image: () => ({ src: "/x.png", width: 1, height: 1 }),
      card: (q) => cardHtml(q, null),
    });
  }
}

export const page = (title: string, extra = "", body = "Text.") => `---\ntitle: ${title}\n${extra}---\n\n${body}\n`;
