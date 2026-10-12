import { ContentError } from "./errors.ts";
import { parseFrontmatter, type Frontmatter } from "./frontmatter.ts";

/** Paths the site itself serves; a top-level page with one of these names would collide. */
export const BUILT_IN_SLUGS = ["fonts", "icons", "sky", "_astro", "404", "diagrams.css", "fonts.css"];

export const BANNER_EXTS = ["jpg", "jpeg", "png", "webp", "avif"];

/** Lowercase words joined by hyphens. A leading underscore is allowed for unlisted pages. */
export const SLUG = /^_?[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface Page {
  /** "projects/fpga-soft-cpu" */
  slug: string;
  /** "/projects/fpga-soft-cpu/" */
  url: string;
  /** "content/projects/fpga-soft-cpu/index.md" (for error messages) */
  file: string;
  /** "content/projects/fpga-soft-cpu" */
  dir: string;
  fm: Frontmatter;
  raw: string;
  body: string;
  bodyOffset: number;
  /** Content-relative path of the banner image, e.g. "content/projects/banner.jpg". */
  banner: string | null;
  parent: Page | null;
  children: Page[];
  depth: number;
}

export interface TreeInput {
  /** Markdown files keyed by repo-relative path ("content/projects/index.md"). */
  markdown: Record<string, string>;
  /** Every other file under content/, repo-relative. Used for banners and images. */
  assets: string[];
  reservedSlugs: string[];
  includeDrafts: boolean;
  /** Font names from site.config.yaml; a page's `font` must be one of them. */
  fonts?: string[];
  /** Folder that holds the content, normally "content". */
  root?: string;
}

export interface Tree {
  /** Top-level pages, sorted. Includes hidden pages; drafts only when includeDrafts. */
  roots: Page[];
  /** Every built page by slug. */
  bySlug: Map<string, Page>;
  /** content/home.md, if present. */
  home: { file: string; raw: string; body: string; bodyOffset: number } | null;
}

export const compareSiblings = (a: Page, b: Page) => {
  const oa = a.fm.order ?? Infinity;
  const ob = b.fm.order ?? Infinity;
  if (oa !== ob) return oa < ob ? -1 : 1;
  return a.fm.title.localeCompare(b.fm.title, "en", { sensitivity: "base", numeric: true }) || a.slug.localeCompare(b.slug);
};

export function checkSlug(slug: string, reserved: string[], file: string) {
  const parts = slug.split("/");
  for (const p of parts) {
    if (!SLUG.test(p)) {
      throw new ContentError(file, `the folder name "${p}" can't be used in a web address. Use lowercase letters, digits and hyphens, like "my-new-thing".`);
    }
  }
  if (reserved.includes(parts[0])) {
    throw new ContentError(file, `"/${parts[0]}/" is reserved (listed in reservedSlugs in site.config.yaml) because another site already lives there. Pick a different folder name.`);
  }
  if (BUILT_IN_SLUGS.includes(parts[0])) {
    throw new ContentError(file, `"/${parts[0]}/" is used by the site itself. Pick a different folder name.`);
  }
}

export function buildTree(input: TreeInput): Tree {
  const root = (input.root ?? "content").replace(/\/$/, "");
  const prefix = root + "/";
  const all = new Map<string, Page>();
  let home: Tree["home"] = null;

  for (const [file, raw] of Object.entries(input.markdown)) {
    if (!file.startsWith(prefix)) continue;
    const rel = file.slice(prefix.length);
    if (rel === "home.md") {
      const fm = parseFrontmatter(raw, file, { requireTitle: false });
      home = { file, raw, body: fm.body, bodyOffset: fm.bodyOffset };
      continue;
    }
    if (rel === "index.md") {
      throw new ContentError(file, "the home page isn't a folder page. Put extra home-page content in content/home.md, and the title and intro in site.config.yaml.");
    }
    if (!rel.endsWith("/index.md")) {
      const suggestion = rel.replace(/\.md$/, "/index.md");
      throw new ContentError(file, `every page is a folder with an index.md inside. Move this file to ${prefix}${suggestion}.`);
    }
    const slug = rel.slice(0, -"/index.md".length);
    checkSlug(slug, input.reservedSlugs, file);
    const { data, body, bodyOffset } = parseFrontmatter(raw, file);
    if (data.font && input.fonts && !input.fonts.includes(data.font)) {
      throw new ContentError(file, `font "${data.font}" isn't in fonts.registry in site.config.yaml (have: ${input.fonts.join(", ")}).`);
    }
    all.set(slug, {
      slug,
      url: `/${slug}/`,
      file,
      dir: `${prefix}${slug}`,
      fm: data,
      raw,
      body,
      bodyOffset,
      banner: null,
      parent: null,
      children: [],
      depth: slug.split("/").length - 1,
    });
  }

  // A folder can only have sub-pages if it is a page itself.
  for (const slug of all.keys()) {
    const parts = slug.split("/");
    for (let i = 1; i < parts.length; i++) {
      const up = parts.slice(0, i).join("/");
      if (!all.has(up)) {
        throw new ContentError(`${prefix}${up}/`, `has sub-pages but no index.md. Add ${prefix}${up}/index.md with at least a title (a category is just a page with sub-folders).`);
      }
    }
  }

  // Banners: explicit frontmatter wins, otherwise banner.<ext> in the folder.
  const assets = new Set(input.assets);
  for (const p of all.values()) {
    if (p.fm.banner) {
      const path = resolveAsset(p.dir, p.fm.banner);
      if (!assets.has(path)) throw new ContentError(p.file, `banner "${p.fm.banner}" doesn't exist (looked for ${path}).`);
      p.banner = path;
    } else {
      const ext = BANNER_EXTS.find((e) => assets.has(`${p.dir}/banner.${e}`));
      p.banner = ext ? `${p.dir}/banner.${ext}` : null;
    }
  }

  // Drafts (and everything under them) are left out unless includeDrafts.
  const isDraft = (p: Page): boolean => p.fm.draft || (p.slug.includes("/") && isDraft(all.get(p.slug.slice(0, p.slug.lastIndexOf("/")))!));
  const bySlug = new Map<string, Page>();
  for (const [slug, p] of all) if (input.includeDrafts || !isDraft(p)) bySlug.set(slug, p);

  const roots: Page[] = [];
  for (const p of bySlug.values()) {
    const cut = p.slug.lastIndexOf("/");
    if (cut < 0) roots.push(p);
    else {
      const parent = bySlug.get(p.slug.slice(0, cut))!;
      p.parent = parent;
      parent.children.push(p);
    }
  }
  const sortDeep = (list: Page[]) => {
    list.sort(compareSiblings);
    list.forEach((c) => sortDeep(c.children));
  };
  sortDeep(roots);
  return { roots, bySlug, home };
}

/** Resolves a path written in a page ("./banner.png", "img/x.png", "/content/..."), to a repo-relative path. */
export function resolveAsset(dir: string, ref: string): string {
  if (ref.startsWith("/")) return normalize(ref.slice(1));
  return normalize(`${dir}/${ref}`);
}

export function normalize(path: string): string {
  const out: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

/** Pages a visitor can browse to from the sidebar or an automatic list. */
export const listed = (pages: Page[]) => pages.filter((p) => !p.fm.hidden);

export function ancestors(p: Page): Page[] {
  const out: Page[] = [];
  for (let q = p.parent; q; q = q.parent) out.unshift(q);
  return out;
}
