import { parse } from "yaml";
import { z } from "astro/zod";
import { ContentError, formatIssues } from "./errors.ts";

const FILE = "site.config.yaml";

const Font = z.strictObject({
  // Keys are weights (400 regular, 700 bold), or a range such as 400-800 for a variable
  // font; add "italic" for the slanted style, e.g. 400italic or 400-800italic. Checked below.
  files: z.record(z.string(), z.string().startsWith("/", "font paths start with / (they live in public/)")),
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
  for (const [name, f] of Object.entries(c.fonts.registry)) {
    for (const key of Object.keys(f.files)) {
      if (!/^[1-9]00(-[1-9]00)?(italic)?$/.test(key)) {
        throw new ContentError(file, `fonts.registry.${name}.files: "${key}" isn't a weight. Use 100–900 (400 is regular, 700 bold), a range such as 400-800 for a variable font, and add "italic" for italics (400italic)`);
      }
    }
  }
  for (const key of ["default", "code"] as const) {
    if (!c.fonts.registry[c.fonts[key]]) {
      throw new ContentError(file, `fonts.${key} is "${c.fonts[key]}", but there is no fonts.registry entry with that name (have: ${Object.keys(c.fonts.registry).join(", ")})`);
    }
  }
  return c;
}

/** The CSS font-family stack for a registry font. */
export const fontStack = (c: SiteConfig, name: string) => `"${name}", ${c.fonts.registry[name].fallback}`;
