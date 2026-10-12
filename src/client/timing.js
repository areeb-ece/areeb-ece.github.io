/* Every timing constant for the typing animation and cursor, in one place.
   Tune these freely: the unit tests check the guarantees (a page never takes longer
   than the top of budgetMs), not the exact numbers. */
export const TIMING = {
  /** Cursor blink period (one on + off cycle), ms. */
  blinkMs: 1060,
  /** Home page: how long the cursor blinks alone before the title starts, ms. */
  homeLeadMs: 1000,
  /** Home title: delay before each character, drawn uniformly from this range, ms.
   *  48–120 ms is 100–250 wpm with 1 word = 5 characters. */
  titleCharMs: [48, 120],
  /** Home title: extra pause after these characters, ms, so it reads like a person typing. */
  punctPauseMs: { ",": 140, ";": 160, ":": 160, ".": 300, "!": 300, "?": 300, "—": 160 },
  /** Content: base speed, picked uniformly from this range on every page load, words per minute. */
  contentWpm: [600, 1200],
  /** Characters per word for the wpm figures above. */
  charsPerWord: 5,
  /** Content: each character's delay varies by up to ± this fraction of the base delay. */
  jitter: 0.25,
  /** Content: the whole page must finish typing within a time picked uniformly from this
   *  range on every load, ms. Long pages type faster to fit; short pages just finish early. */
  budgetMs: [1000, 3000],
  /** Images and cards fade in over this long once their line is typed, ms (part of the budget). */
  fadeMs: 180,
};

const pick = (rng, [lo, hi]) => lo + rng() * (hi - lo);

/**
 * Home title: the time (ms from the start of typing) at which each character appears.
 * `end` includes the pause after the final character, i.e. when the next thing may start.
 */
export function titleSchedule(text, rng = Math.random, T = TIMING) {
  const times = new Float64Array(text.length);
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    t += pick(rng, T.titleCharMs);
    times[i] = t;
    t += T.punctPauseMs[text[i]] ?? 0;
  }
  return { times, end: t };
}

/**
 * Content: the time at which each of `count` characters appears.
 *
 * 1. Pick a base speed (wpm) and a budget for this load.
 * 2. Each character waits the base delay, jittered by ±jitter.
 * 3. If the last character would land after the budget (minus the final fade), every
 *    timestamp is scaled down by the same factor. The rhythm stays the same, it just
 *    runs faster, and the end is exactly on the budget whatever the page length.
 */
export function contentSchedule(count, rng = Math.random, T = TIMING, { reserveMs = 0 } = {}) {
  const wpm = pick(rng, T.contentWpm);
  const budget = pick(rng, T.budgetMs);
  const base = 60000 / (wpm * T.charsPerWord);
  const times = new Float64Array(count);
  let t = 0;
  for (let i = 0; i < count; i++) {
    t += base * (1 + T.jitter * (2 * rng() - 1));
    times[i] = t;
  }
  const limit = Math.max(0, budget - reserveMs);
  const scale = t > limit ? limit / t : 1;
  if (scale < 1) for (let i = 0; i < count; i++) times[i] *= scale;
  return { times, wpm, budget, scale, end: count ? times[count - 1] : 0 };
}
