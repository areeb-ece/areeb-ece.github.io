import type { APIRoute } from "astro";
import { SKY, starTile } from "../../lib/stars.ts";

export function getStaticPaths() {
  return SKY.map((layer) => ({ params: { layer: layer.name }, props: { layer } }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(starTile(props.layer), { headers: { "Content-Type": "image/svg+xml" } });
