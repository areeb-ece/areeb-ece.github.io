import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseConfig } from "../src/lib/config.ts";

const real = readFileSync(join(import.meta.dirname, "..", "site.config.yaml"), "utf8");

test("the real site.config.yaml is valid", () => {
  const c = parseConfig(real);
  assert.deepEqual(c.wordmark, { left: "AREEB", right: "ECE" });
  assert.deepEqual(c.reservedSlugs, ["prereqflow", "otucalendar"]);
  assert.equal(c.fonts.default, "mononoki");
  assert.ok(c.links.every((l) => l.href.includes("TODO")), "contact links stay as TODO placeholders");
});

test("config mistakes name site.config.yaml and the field", () => {
  assert.throws(() => parseConfig(real.replace("default: mononoki", "default: comic")), /site\.config\.yaml: fonts\.default is "comic", but there is no fonts\.registry entry/);
  assert.throws(() => parseConfig(real.replace(/^title: .*$/m, "")), /site\.config\.yaml: \n {2}"title" is required/);
  assert.throws(() => parseConfig(real + "\ncolour: blue\n"), /unknown field "colour"/);
  assert.throws(() => parseConfig("title: [oops"), /site\.config\.yaml: is not valid YAML/);
  assert.throws(() => parseConfig(real.replace("{ label: Email,", "{ name: Email,")), /links\.1/);
});
