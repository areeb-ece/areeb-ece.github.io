import { parse } from "yaml";
import { z } from "astro/zod";
import { ContentError, formatIssues } from "./errors.ts";

const Schema = z.strictObject({
  title: z.string({ error: "title must be text" }).min(1, "title can't be empty"),
  description: z.string().optional(),
  order: z.number({ error: "order must be a number, like 10" }).optional(),
  banner: z.string().optional(),
  bannerAlt: z.string().optional(),
  font: z.string().optional(),
  date: z
    .union([z.string(), z.date()])
    .transform((d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d))
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must look like 2026-09-14"))
    .optional(),
  children: z.enum(["cards", "list", "none"], { error: "children must be cards, list or none" }).default("cards"),
  hidden: z.boolean({ error: "hidden must be true or false" }).default(false),
  draft: z.boolean({ error: "draft must be true or false" }).default(false),
  animate: z.boolean({ error: "animate must be true or false" }).default(true),
});

export type Frontmatter = z.infer<typeof Schema>;
export const FIELDS = Object.keys(Schema.shape);

export interface Parsed {
  data: Frontmatter;
  body: string;
  /** Character offset of `body` inside the original file. */
  bodyOffset: number;
}

const FENCE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

export function splitFrontmatter(raw: string): { yaml: string | null; body: string; bodyOffset: number } {
  const text = raw.replace(/^﻿/, "");
  const m = FENCE.exec(text);
  if (!m) return { yaml: null, body: text, bodyOffset: raw.length - text.length };
  return { yaml: m[1], body: text.slice(m[0].length), bodyOffset: raw.length - text.length + m[0].length };
}

export function parseFrontmatter(raw: string, file: string, opts: { requireTitle?: boolean } = {}): Parsed {
  const { yaml, body, bodyOffset } = splitFrontmatter(raw);
  if (yaml === null && opts.requireTitle !== false) {
    throw new ContentError(file, "is missing its frontmatter. Start the file with:\n---\ntitle: Page title\n---");
  }
  let data: unknown = {};
  if (yaml !== null) {
    try {
      data = parse(yaml) ?? {};
    } catch (e) {
      throw new ContentError(file, `frontmatter is not valid YAML: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  const schema = opts.requireTitle === false ? Schema.extend({ title: z.string().default("") }) : Schema;
  const r = schema.safeParse(data, { reportInput: true });
  if (!r.success) throw new ContentError(file, "frontmatter problem:\n  " + formatIssues(r.error.issues as never, FIELDS));
  return { data: r.data, body, bodyOffset };
}
