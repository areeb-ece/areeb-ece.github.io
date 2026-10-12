/* npm run new -- projects/my-new-thing "My New Thing"
 *
 * Creates content/projects/my-new-thing/index.md with commented frontmatter.
 * Refuses reserved or built-in names, paths that already exist, names that aren't
 * kebab-case, and pages whose parent page doesn't exist yet. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseConfig } from "../src/lib/config.ts";
import { BUILT_IN_SLUGS } from "../src/lib/tree.ts";

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function pageTemplate(title: string, today = new Date().toISOString().slice(0, 10)): string {
  return `---
# The page heading, and its name in the sidebar and on cards.
title: ${JSON.stringify(title)}
# A one-line summary for cards and link previews:
# description: What this is, in one line.
# Lower numbers come first among the pages next to it:
# order: 10
# A banner: put banner.jpg / .png / .webp / .avif in this folder, or point to an image here:
# banner: ./banner.png
# bannerAlt: What the banner shows
# date: ${today}
# How the pages inside this one are listed at the bottom: cards, list or none
# children: cards
# hidden: true     # built, but left out of the sidebar and lists
# draft: true      # only shown while running the site locally
# animate: false   # show the page straight away, without the typing effect
# font: mononoki   # any name under fonts.registry in site.config.yaml
---

Write the page here in Markdown. CONTENT_GUIDE.md shows everything you can use.
`;
}

/** Validates and creates the page. Returns the path of the new index.md. */
export function createPage(root: string, path: string, title: string): string {
  const clean = path.trim().replace(/^\/+|\/+$/g, "").replace(/^content\//, "");
  if (!clean) throw new Error('Give the page a path, like: npm run new -- projects/my-new-thing "My New Thing"');
  if (!title?.trim()) throw new Error(`Give the page a title too, like: npm run new -- ${clean} "My New Thing"`);
  const parts = clean.split("/");
  for (const p of parts) {
    if (!KEBAB.test(p)) throw new Error(`"${p}" isn't a valid folder name. Use lowercase words joined by hyphens, like "my-new-thing".`);
  }
  const config = parseConfig(readFileSync(join(root, "site.config.yaml"), "utf8"));
  if (config.reservedSlugs.includes(parts[0])) {
    throw new Error(`"/${parts[0]}/" is reserved (reservedSlugs in site.config.yaml): another site already lives at that address.`);
  }
  if (BUILT_IN_SLUGS.includes(parts[0])) throw new Error(`"/${parts[0]}/" is used by the site itself. Pick another name.`);
  const dir = join(root, "content", ...parts);
  if (existsSync(dir)) throw new Error(`content/${clean}/ already exists.`);
  if (parts.length > 1) {
    const parent = parts.slice(0, -1).join("/");
    if (!existsSync(join(root, "content", parent, "index.md"))) {
      throw new Error(`The parent page content/${parent}/ doesn't exist yet. Create it first: npm run new -- ${parent} "Title"`);
    }
  }
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "index.md");
  writeFileSync(file, pageTemplate(title.trim()));
  return file;
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const [path, ...titleWords] = process.argv.slice(2);
  try {
    const file = createPage(process.cwd(), path ?? "", titleWords.join(" "));
    console.log(`Created ${file.slice(process.cwd().length + 1)}\nIt will show up in the sidebar the next time the site builds (or right away with npm run dev).`);
  } catch (e) {
    console.error(`Couldn't create the page: ${(e as Error).message}`);
    process.exitCode = 1;
  }
}
