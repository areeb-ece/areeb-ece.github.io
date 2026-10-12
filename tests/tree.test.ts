import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTree, listed } from "../src/lib/tree.ts";
import { readFixture, tree, page } from "./helpers.ts";

const basic = (includeDrafts = false) => buildTree({ ...readFixture("basic"), reservedSlugs: ["prereqflow", "otucalendar"], includeDrafts });
const titles = (ps: { fm: { title: string } }[]) => ps.map((p) => p.fm.title);

test("folders become nested pages with URLs from their paths", () => {
  const t = basic();
  assert.deepEqual(titles(t.roots), ["Projects", "Tools", "About"]);
  const deep = t.bySlug.get("projects/alpha-dsp/sub-a/deep")!;
  assert.equal(deep.url, "/projects/alpha-dsp/sub-a/deep/");
  assert.equal(deep.depth, 3);
  assert.deepEqual(titles([deep.parent!, deep.parent!.parent!, deep.parent!.parent!.parent!]), ["Sub A", "Alpha DSP", "Projects"]);
  assert.ok(t.home);
  assert.match(t.home!.body, /Home extra/);
});

test("siblings sort by order, then title A→Z; pages without order go last", () => {
  const t = basic();
  // Alpha DSP and Beta CPU both have order 1, so the title decides; Aardvark has no order.
  assert.deepEqual(titles(t.bySlug.get("projects")!.children), ["Alpha DSP", "Beta CPU", "Aardvark"]);
});

test("hidden pages are built but left out of lists", () => {
  const t = basic();
  const tools = t.bySlug.get("tools")!;
  assert.ok(t.bySlug.has("tools/secret"));
  assert.deepEqual(titles(listed(tools.children)), []);
});

test("drafts and everything under them are skipped unless drafts are included", () => {
  assert.ok(!basic(false).bySlug.has("tools/wip"));
  assert.ok(!basic(false).bySlug.has("tools/wip/child"));
  const dev = basic(true);
  assert.ok(dev.bySlug.has("tools/wip/child"));
  assert.deepEqual(titles(dev.bySlug.get("tools")!.children), ["Secret", "Work in progress"]);
});

test("banners: frontmatter wins, otherwise banner.<ext> in the folder by extension order", () => {
  const t = basic();
  assert.equal(t.bySlug.get("projects/alpha-dsp")!.banner, "content/projects/alpha-dsp/art/cover.png");
  assert.equal(t.bySlug.get("projects/beta-cpu")!.banner, "content/projects/beta-cpu/banner.png");
  assert.equal(t.bySlug.get("tools")!.banner, null);
});

test("a missing explicit banner names the file and the path", () => {
  assert.throws(() => tree({ "content/a/index.md": page("A", "banner: ./nope.png\n") }), /content\/a\/index\.md: banner "\.\/nope\.png" doesn't exist/);
});

test("reserved slugs are rejected at the top level only", () => {
  for (const slug of ["prereqflow", "otucalendar"]) {
    assert.throws(() => tree({ [`content/${slug}/index.md`]: page("X") }), (e: Error) => e.message.includes(`content/${slug}/index.md`) && e.message.includes("reserved"));
  }
  // Nested is fine: /tools/prereqflow/ doesn't collide with the real site.
  const t = tree({ "content/tools/index.md": page("Tools"), "content/tools/prereqflow/index.md": page("P") });
  assert.ok(t.bySlug.has("tools/prereqflow"));
});

test("the site's own paths can't be used as page folders", () => {
  assert.throws(() => tree({ "content/fonts/index.md": page("F") }), /used by the site itself/);
});

test("folder names must be kebab-case", () => {
  for (const bad of ["My Project", "myProject", "my_project", "-x", "x--y"]) {
    assert.throws(() => tree({ [`content/${bad}/index.md`]: page("X") }), /can't be used in a web address/, bad);
  }
  assert.ok(tree({ "content/_unlisted/index.md": page("U") }).bySlug.has("_unlisted"));
});

test("structure mistakes get a message that says how to fix them", () => {
  assert.throws(() => tree({ "content/a/b/index.md": page("B") }), /content\/a\/: has sub-pages but no index\.md/);
  assert.throws(() => tree({ "content/notes.md": page("N") }), /Move this file to content\/notes\/index\.md/);
  assert.throws(() => tree({ "content/index.md": page("N") }), /content\/home\.md/);
});

test("frontmatter errors name the file and the field", () => {
  const cases: [string, RegExp][] = [
    ["order: ten\n", /content\/a\/index\.md: frontmatter problem:\n {2}order must be a number/],
    ["children: grid\n", /children must be cards, list or none/],
    ["hidden: yes please\n", /hidden must be true or false/],
    ["tittle: Oops\n", /unknown field "tittle" \(allowed: title, /],
    ["date: 14/09/2026\n", /date must look like 2026-09-14/],
  ];
  for (const [extra, re] of cases) assert.throws(() => tree({ "content/a/index.md": page("A", extra) }), re, extra);
  assert.throws(() => tree({ "content/a/index.md": "---\ndescription: no title\n---\n" }), /"title" is required/);
  assert.throws(() => tree({ "content/a/index.md": "Just text" }), /missing its frontmatter/);
  assert.throws(() => tree({ "content/a/index.md": "---\ntitle: [unclosed\n---\n" }), /content\/a\/index\.md: frontmatter is not valid YAML/);
});

test("a page font must exist in the registry", () => {
  assert.throws(() => tree({ "content/a/index.md": page("A", "font: comic\n") }, { fonts: ["mononoki"] }), /font "comic" isn't in fonts\.registry/);
  assert.ok(tree({ "content/a/index.md": page("A", "font: mononoki\n") }, { fonts: ["mononoki"] }));
});

test("dates come out as YYYY-MM-DD strings", () => {
  const t = tree({ "content/a/index.md": page("A", "date: 2026-09-14\n") });
  assert.equal(t.bySlug.get("a")!.fm.date, "2026-09-14");
});
