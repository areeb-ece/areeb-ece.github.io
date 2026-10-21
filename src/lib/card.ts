import { esc, hash, rng } from "./html.ts";
import type { Page } from "./tree.ts";

export interface ImageInfo {
  src: string;
  width: number;
  height: number;
}

/**
 * The generated banner for a page without one: a timing diagram drawn from the page's path,
 * so a page keeps its picture. A clock lane and two or three signal lanes named after the
 * words of the path; the signals change just after rising clock edges, as a register's
 * outputs would. Each lane takes one of the --h* hues by class (no style attribute, and it
 * follows the theme). The drawing is cropped to fit, never stretched.
 */
export function fallbackBannerSvg(seedText: string): string {
  const r = rng(hash(seedText));
  const W = 640, H = 200, left = 92, period = 48, delay = 5;
  const words = seedText.split(/[/-]/).filter((w) => w && w !== "_kitchen" && w !== "sink").map((w) => w.replace(/^_/, "").slice(0, 9));
  const names = ["clk", ...(words.length ? words : ["d"]).slice(-3)];
  const lanes = names.length;
  const hues = [0, 1, 2, 3, 4, 5];
  for (let i = hues.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [hues[i], hues[j]] = [hues[j], hues[i]];
  }
  const pad = 26, laneH = (H - pad * 2) / lanes, amp = Math.round(laneH * 0.46);
  const edges: string[] = [];
  for (let x = left + period / 2; x < W; x += period) edges.push(`M${x} 0V${H}`);
  let paths = "", labels = "";
  for (let l = 0; l < lanes; l++) {
    const mid = pad + l * laneH + laneH / 2, hi = Math.round(mid - amp / 2), lo = hi + amp;
    let level = l === 0 ? false : r() < 0.5;
    let d = `M${left} ${level ? hi : lo}`;
    for (let x = left; x < W; x += period / 2) {
      // the clock toggles every half period; a signal may change just after a rising edge
      const rising = l === 0 ? true : Math.round((x - left) / (period / 2)) % 2 === 0 && r() < 0.5;
      const at = l === 0 ? x + period / 2 : x + period / 2 + delay;
      if (rising && at < W) { d += `H${at}`; level = !level; d += `V${level ? hi : lo}`; }
    }
    d += `H${W}`;
    paths += `<path class="w w${hues[l]}" d="${d}"/>`;
    labels += `<text x="${left - 14}" y="${Math.round(mid + 4)}">${esc(names[l])}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMid slice" aria-hidden="true" focusable="false"><path class="t" d="${edges.join("")}"/>${paths}<g class="n">${labels}</g></svg>`;
}

export function bannerHtml(page: Pick<Page, "slug">, img: ImageInfo | null, alt: string, cls: string): string {
  if (img) {
    return `<span class="${cls}"><img src="${esc(img.src)}" width="${img.width}" height="${img.height}" alt="${esc(alt)}" loading="lazy" decoding="async"></span>`;
  }
  return `<span class="${cls} gen" aria-hidden="true">${fallbackBannerSvg(page.slug)}</span>`;
}

/** One page-link card. Used for hand-placed ::card directives and for automatic child cards. */
export function cardHtml(page: Page, img: ImageInfo | null): string {
  const desc = page.fm.description ? `<span class="card-desc">${esc(page.fm.description)}</span>` : "";
  return (
    `<a class="card" href="${page.url}">` +
    bannerHtml(page, img, page.fm.bannerAlt ?? "", "card-banner") +
    `<span class="card-body"><b class="card-title">${esc(page.fm.title)}</b>${desc}</span>` +
    `</a>`
  );
}
