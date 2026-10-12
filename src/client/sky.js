/* Night sky: scroll parallax and pausing when the tab is hidden. The slow drift is a
   CSS animation; this only moves each layer by a fraction of the scroll. Shifts wrap
   at the tile size, so the layers never run out however long the page is. */
const root = document.documentElement;
const layers = [...document.querySelectorAll(".sky-layer")].map((el) => ({ el, k: +el.dataset.parallax, tile: +el.dataset.tile }));
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

let queued = false;
function update() {
  queued = false;
  const y = window.scrollY;
  for (const { el, k, tile } of layers) el.style.transform = `translate3d(0, ${-((y * k) % tile)}px, 0)`;
}
function onScroll() {
  if (reduce.matches || queued || document.hidden) return;
  queued = true;
  requestAnimationFrame(update);
}
if (layers.length) {
  addEventListener("scroll", onScroll, { passive: true });
  // First position in a frame, not while the script loads (reading scrollY forces layout).
  if (!reduce.matches) requestAnimationFrame(update);
  document.addEventListener("visibilitychange", () => root.classList.toggle("sky-paused", document.hidden));
}
