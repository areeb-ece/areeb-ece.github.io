import { esc, hash, rng } from "./html.ts";
import type { Page } from "./tree.ts";

export interface ImageInfo {
  src: string;
  width: number;
  height: number;
}

/** Inline custom properties for the generated banner: two or three of the --h* hues
 * at angles and positions seeded by the page path, so a page keeps its colours. */
export function fallbackBannerStyle(seedText: string): string {
  const r = rng(hash(seedText));
  const pick = () => Math.floor(r() * 6);
  const a = pick();
  let b = pick();
  if (b === a) b = (a + 3) % 6;
  let c = pick();
  if (c === a || c === b) c = (b + 2) % 6;
  const n = (lo: number, hi: number) => Math.round(lo + r() * (hi - lo));
  return [
    `--g1:var(--h${a})`,
    `--g2:var(--h${b})`,
    `--g3:var(--h${c})`,
    `--ga:${n(0, 359)}deg`,
    `--gx:${n(10, 45)}%`,
    `--gy:${n(20, 80)}%`,
    `--gx2:${n(55, 90)}%`,
    `--gy2:${n(20, 80)}%`,
  ].join(";");
}

export function bannerHtml(page: Pick<Page, "slug">, img: ImageInfo | null, alt: string, cls: string): string {
  if (img) {
    return `<span class="${cls}"><img src="${esc(img.src)}" width="${img.width}" height="${img.height}" alt="${esc(alt)}" loading="lazy" decoding="async"></span>`;
  }
  return `<span class="${cls} gen" style="${fallbackBannerStyle(page.slug)}" aria-hidden="true"></span>`;
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
