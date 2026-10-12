import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Shown when a link has no icon, or its file is missing. */
export const PLACEHOLDER_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>';

/**
 * Inlines an SVG from public/ so CSS can size it and tint it through currentColor.
 * Scripts, event handlers and <style> blocks are removed (the security policy would
 * block them anyway), as are width/height so the icon takes the size CSS gives it.
 */
export function iconSvg(path: string | undefined, publicDir = join(process.cwd(), "public")): string {
  if (!path) return PLACEHOLDER_ICON;
  const file = join(publicDir, path.replace(/^\/+/, ""));
  if (!file.startsWith(publicDir) || !existsSync(file)) {
    console.warn(`[site] icon ${path} not found in public/, using a placeholder`);
    return PLACEHOLDER_ICON;
  }
  const svg = readFileSync(file, "utf8")
    .replace(/<\?xml[^>]*>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>/gi, "")
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .trim();
  const m = /<svg\b[^>]*>/i.exec(svg);
  if (!m) return PLACEHOLDER_ICON;
  const open = m[0].replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*')/gi, "").replace(/<svg/i, '<svg aria-hidden="true" focusable="false"');
  return svg.slice(0, m.index) + open + svg.slice(m.index + m[0].length);
}
