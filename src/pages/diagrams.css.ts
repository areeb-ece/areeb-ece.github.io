import type { APIRoute } from "astro";
import { loadSite } from "../lib/site.ts";

// Styles that Mermaid generates for each diagram (each scoped to that diagram's id).
// They live in a file because the CSP doesn't allow <style> inside the page.
export const GET: APIRoute = async () => {
  const { diagramCss } = await loadSite();
  return new Response(`/* Generated from the Mermaid diagrams in content/. */\n${diagramCss}\n`, { headers: { "Content-Type": "text/css; charset=utf-8" } });
};
