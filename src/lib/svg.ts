/** Reads an SVG's intrinsic size from its root element (width/height, else viewBox). */
export function svgSize(svg: string): { width: number; height: number } | null {
  const root = /<svg\b[^>]*>/i.exec(svg)?.[0];
  if (!root) return null;
  const attr = (name: string) => new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, "i").exec(root)?.[1];
  const num = (v?: string) => (v && /^[\d.]+(px)?$/.test(v.trim()) ? parseFloat(v) : NaN);
  const w = num(attr("width"));
  const h = num(attr("height"));
  if (w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
  const vb = attr("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0) return { width: Math.round(vb[2]), height: Math.round(vb[3]) };
  return null;
}
