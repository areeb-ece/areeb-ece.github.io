import type { APIRoute } from "astro";
import { loadSite } from "../lib/site.ts";
import { fontStack } from "../lib/config.ts";

// @font-face rules and the --f / --f-code variables, generated from the fonts in site.config.yaml.
export const GET: APIRoute = async () => {
  const { config } = await loadSite();
  const faces = Object.entries(config.fonts.registry).flatMap(([name, f]) =>
    Object.entries(f.files).map(
      ([weight, src]) => `@font-face { font-family: "${name}"; src: url("${src}") format("woff2"); font-weight: ${weight}; font-style: normal; font-display: swap; }`,
    ),
  );
  const perPage = Object.keys(config.fonts.registry).map((name) => `:root[data-font="${name}"] { --f: ${fontStack(config, name)}; }`);
  const css = [
    "/* Generated from site.config.yaml (fonts). Edit that file, not this one. */",
    ...faces,
    `:root { --f: ${fontStack(config, config.fonts.default)}; --f-code: ${fontStack(config, config.fonts.code)}; }`,
    ...perPage,
  ].join("\n");
  return new Response(css + "\n", { headers: { "Content-Type": "text/css; charset=utf-8" } });
};
