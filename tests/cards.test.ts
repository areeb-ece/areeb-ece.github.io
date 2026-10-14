import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTree } from "../src/lib/tree.ts";
import { resolveTo } from "../src/lib/markdown/pipeline.ts";
import { readFixture, renderAll, tree, page } from "./helpers.ts";

test("card paths resolve absolute and relative to the page", () => {
  assert.equal(resolveTo("/projects/nand-alu", "/tools/x/"), "projects/nand-alu");
  assert.equal(resolveTo("/projects/nand-alu/", "/"), "projects/nand-alu");
  assert.equal(resolveTo("../alpha", "/projects/beta/"), "projects/alpha");
  assert.equal(resolveTo("./child", "/projects/"), "projects/child");
  assert.equal(resolveTo("child", "/projects/"), "projects/child");
  assert.equal(resolveTo("projects/x", "/"), "projects/x");
});

test("the fixture's cards (absolute, relative and in a :::cards group) all resolve", () => {
  const t = buildTree({ ...readFixture("basic"), reservedSlugs: [], includeDrafts: false });
  assert.doesNotThrow(() => renderAll(t));
});

test("a card to a page that doesn't exist fails with the file, line and path", () => {
  const t = tree({
    "content/a/index.md": page("A", "", "Intro.\n\n::card{to=\"/projects/missing\"}"),
  });
  assert.throws(() => renderAll(t), (e: Error) => {
    assert.match(e.message, /^content\/a\/index\.md:\d+: card points to "\/projects\/missing", but there is no page at \/projects\/missing\//);
    return true;
  });
});

test("broken cards inside :::cards fail too", () => {
  const t = tree({ "content/a/index.md": page("A", "", ':::cards\n::card{to="./nope"}\n:::') });
  assert.throws(() => renderAll(t), /content\/a\/index\.md:\d+: card points to "\.\/nope", but there is no page at \/a\/nope\//);
});

test("a card to a draft page fails in production builds", () => {
  const md = { "content/a/index.md": page("A", "", '::card{to="/b"}'), "content/b/index.md": page("B", "draft: true\n") };
  assert.throws(() => renderAll(tree(md)), /there is no page at \/b\//);
  assert.doesNotThrow(() => renderAll(tree(md, { includeDrafts: true })));
});

test("cards to hidden pages are allowed", () => {
  const md = { "content/a/index.md": page("A", "", '::card{to="/b"}'), "content/b/index.md": page("B", "hidden: true\n") };
  assert.doesNotThrow(() => renderAll(tree(md)));
});

test("a card without `to`, an unknown directive, or junk inside :::cards is reported", () => {
  assert.throws(() => renderAll(tree({ "content/a/index.md": page("A", "", "::card") })), /a card needs a target/);
  assert.throws(() => renderAll(tree({ "content/a/index.md": page("A", "", "::video{src=x}") })), /unknown block "::video"/);
  assert.throws(() => renderAll(tree({ "content/a/index.md": page("A", "", ":::tip\nx\n:::") })), /unknown block ":::tip"/);
  assert.throws(() => renderAll(tree({ "content/a/index.md": page("A", "", ":::cards\nhello\n:::") })), /inside :::cards, put only ::card/);
});
