import { test } from "node:test";
import assert from "node:assert/strict";
import { TIMING, titleSchedule, contentSchedule } from "../src/client/timing.js";
import { rng } from "../src/lib/html.ts";

const WORD = TIMING.charsPerWord;

test("a 5,000-word page still finishes inside 3 s, on every one of 1,000 random loads", () => {
  const chars = 5000 * WORD;
  for (let seed = 1; seed <= 1000; seed++) {
    const s = contentSchedule(chars, rng(seed), TIMING, { reserveMs: TIMING.fadeMs });
    assert.ok(s.end + TIMING.fadeMs <= 3000 + 1e-6, `seed ${seed}: ends at ${s.end} ms`);
    assert.ok(s.end <= s.budget, `seed ${seed}: within its own budget`);
    assert.ok(s.scale < 1, "a long page has to speed up");
  }
});

test("budgets and speeds are drawn from their ranges", () => {
  for (let seed = 1; seed <= 500; seed++) {
    const s = contentSchedule(100, rng(seed));
    assert.ok(s.budget >= 1000 && s.budget <= 3000);
    assert.ok(s.wpm >= 600 && s.wpm <= 1200);
  }
});

test("short pages type at the chosen speed (±25% jitter) and finish early", () => {
  const n = 30; // 6 words: even at 600 wpm with +25% jitter that is under 1 s
  for (let seed = 1; seed <= 200; seed++) {
    const s = contentSchedule(n, rng(seed));
    assert.equal(s.scale, 1, "no speed-up needed");
    const base = 60000 / (s.wpm * WORD);
    let prev = 0;
    for (const t of s.times) {
      const d = t - prev;
      assert.ok(d >= base * 0.75 - 1e-9 && d <= base * 1.25 + 1e-9, `delay ${d} vs base ${base}`);
      prev = t;
    }
    assert.ok(s.end < s.budget);
  }
});

test("timestamps only go forward, and an empty page ends at once", () => {
  const s = contentSchedule(3000, rng(7));
  for (let i = 1; i < s.times.length; i++) assert.ok(s.times[i] >= s.times[i - 1]);
  assert.equal(contentSchedule(0, rng(1)).end, 0);
});

test("home title: 48–120 ms per character (100–250 wpm) plus pauses after punctuation", () => {
  const text = "Hi, I'm areeb.";
  for (let seed = 1; seed <= 300; seed++) {
    const { times, end } = titleSchedule(text, rng(seed));
    let prev = 0;
    for (let i = 0; i < text.length; i++) {
      const pause = i > 0 ? (TIMING.punctPauseMs[text[i - 1]] ?? 0) : 0;
      const d = times[i] - prev - pause;
      assert.ok(d >= 48 - 1e-9 && d <= 120 + 1e-9, `char ${i}: ${d}`);
      prev = times[i];
    }
    assert.equal(end, times[text.length - 1] + TIMING.punctPauseMs["."]);
  }
  // the range really is 100–250 wpm at 5 characters per word
  assert.equal(Math.round(60000 / (120 * WORD)), 100);
  assert.equal(Math.round(60000 / (48 * WORD)), 250);
});

test("the timing config holds the documented values", () => {
  assert.equal(TIMING.blinkMs, 1060);
  assert.deepEqual(TIMING.contentWpm, [600, 1200]);
  assert.deepEqual(TIMING.budgetMs, [1000, 3000]);
  assert.equal(TIMING.jitter, 0.25);
});
