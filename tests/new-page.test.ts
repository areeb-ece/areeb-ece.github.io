import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPage } from "../scripts/new-page.ts";
import { parseFrontmatter } from "../src/lib/frontmatter.ts";

let root = "";
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "site-new-"));
  cpSync(join(import.meta.dirname, "..", "site.config.yaml"), join(root, "site.config.yaml"));
  mkdirSync(join(root, "content/projects"), { recursive: true });
  writeFileSync(join(root, "content/projects/index.md"), "---\ntitle: Projects\n---\n");
});

test("creates the folder and an index.md whose frontmatter is valid", () => {
  const file = createPage(root, "projects/my-new-thing", 'My "New" Thing: v2');
  assert.equal(file, join(root, "content/projects/my-new-thing/index.md"));
  const raw = readFileSync(file, "utf8");
  assert.match(raw, /# description:/, "optional fields are there, commented out");
  assert.equal(parseFrontmatter(raw, file).data.title, 'My "New" Thing: v2');
});

test("refuses reserved slugs", () => {
  assert.throws(() => createPage(root, "prereqflow", "X"), /reserved/);
  assert.throws(() => createPage(root, "otucalendar", "X"), /reserved/);
  assert.throws(() => createPage(root, "fonts", "X"), /used by the site itself/);
});

test("refuses paths that already exist", () => {
  createPage(root, "projects/thing", "Thing");
  assert.throws(() => createPage(root, "projects/thing", "Again"), /already exists/);
  assert.throws(() => createPage(root, "projects", "Again"), /already exists/);
});

test("refuses names that aren't kebab-case", () => {
  for (const bad of ["projects/My Thing", "projects/myThing", "projects/my_thing", "projects/-x", "_hidden"]) {
    assert.throws(() => createPage(root, bad, "X"), /isn't a valid folder name/, bad);
  }
});

test("needs a title and an existing parent page", () => {
  assert.throws(() => createPage(root, "projects/x", ""), /title/);
  assert.throws(() => createPage(root, "tools/x", "X"), /parent page content\/tools\/ doesn't exist yet/);
  assert.ok(createPage(root, "/content/projects/y/", "Y").endsWith(join("projects", "y", "index.md")), "tolerates a leading content/ and slashes");
});
