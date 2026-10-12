/* Loads everything the pages need, once per build: the config, the page tree and every
 * page rendered to blocks. Astro-only (it uses import.meta.glob); the logic it calls is
 * plain TypeScript in the neighbouring modules, which the unit tests use directly. */
import configRaw from "../../site.config.yaml?raw";
import { parseConfig, type SiteConfig } from "./config.ts";
import { buildTree, type Page, type Tree } from "./tree.ts";
import { cardHtml, type ImageInfo } from "./card.ts";
import { renderMarkdown, type Rendered, type RenderDeps } from "./markdown/pipeline.ts";
import { ContentError } from "./errors.ts";
import { svgSize } from "./svg.ts";

const markdown = import.meta.glob("/content/**/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const raster = import.meta.glob("/content/**/*.{png,jpg,jpeg,webp,avif,gif,PNG,JPG,JPEG}", { import: "default", eager: true }) as Record<string, ImageMetadata>;
const svgUrl = import.meta.glob("/content/**/*.svg", { query: "?url", import: "default", eager: true }) as Record<string, string>;
const svgRaw = import.meta.glob("/content/**/*.svg", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const strip = <T,>(rec: Record<string, T>) => Object.fromEntries(Object.entries(rec).map(([k, v]) => [k.replace(/^\//, ""), v]));

export interface Site {
  config: SiteConfig;
  tree: Tree;
  pages: Page[];
  rendered: Map<string, Rendered>;
  home: Rendered | null;
  intro: Rendered;
  image(path: string): ImageInfo | undefined;
  banner(page: Page): ImageInfo | null;
}

let cached: Promise<Site> | null = null;
export const loadSite = () => (cached ??= build());

async function build(): Promise<Site> {
  const config = parseConfig(configRaw);
  const images = new Map<string, ImageInfo>();
  for (const [path, meta] of Object.entries(strip(raster))) images.set(path, { src: meta.src, width: meta.width, height: meta.height });
  const raws = strip(svgRaw);
  for (const [path, url] of Object.entries(strip(svgUrl))) {
    const size = svgSize(raws[path]);
    if (!size) throw new ContentError(path, "an SVG used as an image needs a viewBox or width and height attributes.");
    images.set(path, { src: url, ...size });
  }

  const tree = buildTree({
    markdown: strip(markdown),
    assets: [...images.keys()],
    reservedSlugs: config.reservedSlugs,
    includeDrafts: import.meta.env.DEV,
    fonts: Object.keys(config.fonts.registry),
  });
  const pages = [...tree.bySlug.values()];
  const image = (path: string) => images.get(path);
  const banner = (page: Page) => (page.banner ? images.get(page.banner)! : null);

  const deps = (file: string, dir: string, url: string): RenderDeps => ({
    file,
    dir,
    url,
    findPage: (slug) => tree.bySlug.get(slug),
    image,
    card: (p) => cardHtml(p, banner(p)),
  });

  const rendered = new Map<string, Rendered>();
  for (const p of pages) rendered.set(p.slug, renderMarkdown(p.body, deps(p.file, p.dir, p.url)));
  const home = tree.home ? renderMarkdown(tree.home.body, deps(tree.home.file, "content", "/")) : null;
  const intro = renderMarkdown(config.intro, deps("site.config.yaml (intro)", "content", "/"));

  return { config, tree, pages, rendered, home, intro, image, banner };
}
