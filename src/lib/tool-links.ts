import { esc } from "./html.ts";
import { iconSvg } from "./icons.ts";

/**
 * The site's mark (the favicon's slash in a box), drawn with classes rather than its
 * literal colours so it follows the theme.
 */
const LOGO =
  '<svg class="tool-logo" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect class="tl-box" stroke-width="3" x="4" y="4" width="56" height="56" rx="12"/><path class="tl-slash" stroke-width="4" stroke-linecap="round" d="M22 18 L42 46"/><rect class="tl-bar" x="16" y="44" width="14" height="3.5" rx="1.5"/></svg>';

/** Arrow at the end of a button: "this takes you somewhere". Out-and-up for a new tab. */
const ARROW = '<svg class="tool-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const OUT = '<svg class="tool-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M9 7h8v8"/></svg>';

export interface ToolLinks {
  /** Address of the live tool. */
  live?: string;
  /** Its name as the tool writes it, "PREREQ/FLOW": the part after the slash is accented. */
  name?: string;
  /** Address of the GitHub repository. */
  repo?: string;
}

const ALLOWED = ["live", "name", "repo"];

/**
 * Checks a ::tool block's settings. Returns a message for Areeb, or null when they're fine.
 */
export function toolLinksProblem(attrs: Record<string, string | null | undefined>): string | null {
  const unknown = Object.keys(attrs).filter((k) => !ALLOWED.includes(k));
  if (unknown.length) return `::tool doesn't know "${unknown[0]}". It takes live="…", name="…" and repo="…".`;
  const { live, name, repo } = attrs;
  if (!live && !repo) return 'a ::tool block needs a live="https://…" link, a repo="https://github.com/…" link, or both.';
  if (live && !name) return `::tool has a live link but no name. Add name="TOOL/NAME", written the way the tool writes its title (like name="PREREQ/FLOW").`;
  if (name && !live) return '::tool has a name but no live="https://…" link. The name is only shown on the live button.';
  for (const [k, v] of [["live", live], ["repo", repo]] as const) {
    if (v && !/^https:\/\/\S+$/.test(v)) return `::tool's ${k}="${v}" isn't a web address. Use a full link starting with https://.`;
  }
  return null;
}

/** "PREREQ/FLOW" → PREREQ<span>/</span>FLOW, as the tools set their wordmark. */
const wordmark = (name: string) => {
  const i = name.indexOf("/");
  return i < 0 ? esc(name) : `${esc(name.slice(0, i))}<span>/</span>${esc(name.slice(i + 1))}`;
};

/** "https://github.com/areeb-ece/prereqflow" → "areeb-ece/prereqflow" (anything else as written). */
export const repoLabel = (url: string) => {
  const m = /^https:\/\/github\.com\/([^/?#]+\/[^/?#]+?)(?:\.git)?\/?$/i.exec(url);
  return m ? m[1] : url.replace(/^https:\/\//, "");
};

/** The live button (site mark + the tool's wordmark) and the repository button under it; the pipeline wraps them in div.tool-links. */
export function toolLinksHtml({ live, name, repo }: ToolLinks): string {
  const out: string[] = [];
  if (live && name) {
    out.push(`<a class="tool-live" href="${esc(live)}">${LOGO}<span class="sd-wordmark">${wordmark(name)}</span>${ARROW}</a>`);
  }
  if (repo) {
    const label = repoLabel(repo);
    out.push(`<a class="tool-repo" href="${esc(repo)}" rel="noopener noreferrer" target="_blank"><span class="ico">${iconSvg("/icons/github.svg")}</span><span class="sr-only">Source on GitHub: </span><span>${esc(label)}</span>${OUT}<span class="sr-only"> (opens in a new tab)</span></a>`);
  }
  return out.join("");
}
