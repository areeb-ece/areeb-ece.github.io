import { parse } from "yaml";
import { z } from "astro/zod";
import { ContentError, formatIssues } from "./errors.ts";

const FILE = "site.config.yaml";

const Font = z.strictObject({
  files: z.record(z.string().regex(/^[1-9]00$/, "weights are 100–900"), z.string().startsWith("/", "font paths start with / (they live in public/)")),
  fallback: z.string().default("monospace"),
});

const Schema = z.strictObject({
  wordmark: z.strictObject({ left: z.string().min(1), right: z.string().min(1) }),
  title: z.string().min(1),
  intro: z.string().default(""),
  description: z.string().default(""),
  links: z
    .array(z.strictObject({ label: z.string().min(1), href: z.string().min(1), icon: z.string().optional() }))
    .default([]),
  fonts: z.strictObject({
    default: z.string(),
    code: z.string(),
    registry: z.record(z.string().regex(/^[a-z0-9-]+$/, "font names are lowercase-kebab-case"), Font),
  }),
  reservedSlugs: z.array(z.string()).default([]),
});

export type SiteConfig = z.infer<typeof Schema>;
export type FontEntry = z.infer<typeof Font>;

export function parseConfig(raw: string, file = FILE): SiteConfig {
  let data: unknown;
  try {
    data = parse(raw);
  } catch (e) {
    throw new ContentError(file, `is not valid YAML: ${(e as Error).message}`);
  }
  const r = Schema.safeParse(data ?? {}, { reportInput: true });
  if (!r.success) throw new ContentError(file, "\n  " + formatIssues(r.error.issues as never, Object.keys(Schema.shape)));
  const c = r.data;
  for (const key of ["default", "code"] as const) {
    if (!c.fonts.registry[c.fonts[key]]) {
      throw new ContentError(file, `fonts.${key} is "${c.fonts[key]}", but there is no fonts.registry entry with that name (have: ${Object.keys(c.fonts.registry).join(", ")})`);
    }
  }
  return c;
}

/** The CSS font-family stack for a registry font. */
export const fontStack = (c: SiteConfig, name: string) => `"${name}", ${c.fonts.registry[name].fallback}`;
