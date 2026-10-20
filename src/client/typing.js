/* The typing animation. Every top-level block of the page (marked .b, with its
 * Markdown source in data-src) first appears as its source being typed, then
 * switches to the rendered block, and typing moves on to the next.
 *
 * It is only an enhancement: the HTML already holds the finished page. boot.js
 * adds html.typing (which hides the blocks visually but keeps them readable to
 * screen readers) only when JS runs, the page allows it, and reduced motion is off.
 *
 * Timing: all character timestamps are computed up front (timing.js), and a single
 * requestAnimationFrame loop shows whatever is due each frame, so there is no timer
 * per character and a slow frame simply shows more characters at once. */
import { TIMING, titleSchedule, contentSchedule } from "./timing.js";

const root = document.documentElement;
// The CSS blink and fade read these, so TIMING stays the only place to tune them.
root.style.setProperty("--blink", `${TIMING.blinkMs}ms`);
root.style.setProperty("--fade", `${TIMING.fadeMs}ms`);

if (root.classList.contains("typing")) start();
else if (root.dataset.typing !== "none") {
  // Already typed this visit (home) or reduced motion: the page is final; the cursor just sits at the end.
  const blocks = document.querySelectorAll(".main .b");
  done(blocks[blocks.length - 1], Object.assign(document.createElement("span"), { className: "cursor" }));
}

function start() {
  root.classList.add("typing-started");
  const blocks = [...document.querySelectorAll(".main .b")];
  if (!blocks.length) return done();
  const isHome = root.dataset.typing === "home";

  const cursor = document.createElement("span");
  cursor.className = "cursor";
  cursor.setAttribute("aria-hidden", "true");

  // The typing layer: a <pre> placed where the block will appear, hidden from screen readers.
  const layer = (block) => {
    const pre = document.createElement("pre");
    pre.className = block.dataset.kind === "title" ? "typing typing-title" : "typing";
    pre.setAttribute("aria-hidden", "true");
    const text = document.createTextNode("");
    pre.append(text, cursor);
    block.before(pre);
    return { pre, text };
  };

  const reveal = (block) => {
    block.classList.add("shown");
    if (block.dataset.kind === "media") block.classList.add("fade");
  };

  let finished = false;
  let raf = 0;
  let current = null;

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    current?.pre.remove();
    blocks.forEach(reveal);
    removeSkip();
    done(blocks[blocks.length - 1], cursor);
  }

  // Any click, key press or scroll finishes the animation at once.
  // Reading scrollY forces a layout, so it's taken in the first frame, not while the
  // script loads (that would turn the page's first layout into one long task).
  let startY = null;
  const onScroll = () => startY !== null && Math.abs(window.scrollY - startY) > 2 && finish();
  const skipEvents = ["pointerdown", "keydown", "wheel", "touchstart"];
  skipEvents.forEach((e) => window.addEventListener(e, finish, { passive: true, capture: true }));
  window.addEventListener("scroll", onScroll, { passive: true });
  function removeSkip() {
    skipEvents.forEach((e) => window.removeEventListener(e, finish, { capture: true }));
    window.removeEventListener("scroll", onScroll);
  }

  // Plan: [lead (home only)] → [title (home only)] → content blocks against the budget.
  const queue = blocks.map((b) => ({ block: b, src: b.dataset.src ?? "" }));
  let t0 = performance.now();
  let phaseStart = 0;
  let titleItem = null;

  if (isHome && queue[0].block.dataset.kind === "title") {
    titleItem = queue.shift();
    titleItem.sched = titleSchedule(titleItem.src);
    current = { item: titleItem, ...layer(titleItem.block), shown: 0 };
    cursor.classList.add("idle"); // blink alone in the title's place first
    phaseStart = TIMING.homeLeadMs;
    try { sessionStorage.setItem("site.homeTyped", "1"); } catch { /* fine */ }
  }

  // Content schedule over the remaining blocks, as one run of characters.
  const total = queue.reduce((n, q) => n + q.src.length, 0);
  const last = queue[queue.length - 1];
  const content = contentSchedule(total, Math.random, TIMING, { reserveMs: last?.block.dataset.kind === "media" ? TIMING.fadeMs : 0 });
  let offset = 0;
  for (const q of queue) {
    q.from = offset;
    offset += q.src.length;
    q.to = offset;
  }
  const contentStart = titleItem ? phaseStart + titleItem.sched.end : 0;
  let qi = 0;

  function frame(now) {
    const t = now - t0;
    if (titleItem && current?.item === titleItem) {
      const local = t - phaseStart;
      if (local < 0) return (raf = requestAnimationFrame(frame));
      cursor.classList.remove("idle");
      const times = titleItem.sched.times;
      let k = current.shown;
      while (k < times.length && times[k] <= local) k++;
      if (k > current.shown) {
        current.text.appendData(titleItem.src.slice(current.shown, k));
        current.shown = k;
      }
      if (k < times.length) return (raf = requestAnimationFrame(frame));
      // Title typed: wait out the final punctuation pause with the cursor at the end.
      if (local < titleItem.sched.end) {
        cursor.classList.add("idle");
        return (raf = requestAnimationFrame(frame));
      }
      current.pre.remove();
      reveal(titleItem.block);
      performance.mark("typing:title-done");
      current = null;
      cursor.classList.remove("idle");
    }

    const local = t - contentStart;
    // Reveal every block whose last character is due; type into the first one that isn't.
    while (qi < queue.length) {
      const q = queue[qi];
      const due = countDue(content.times, q.from, q.to, local);
      if (due === q.to - q.from) {
        if (current?.item === q) current.pre.remove();
        reveal(q.block);
        current = null;
        qi++;
        continue;
      }
      if (!current) current = { item: q, ...layer(q.block), shown: 0 };
      if (due > current.shown) {
        current.text.appendData(q.src.slice(current.shown, due));
        current.shown = due;
      }
      break;
    }
    if (qi < queue.length) raf = requestAnimationFrame(frame);
    else {
      performance.mark("typing:done");
      finished = true;
      removeSkip();
      done(blocks[blocks.length - 1], cursor);
    }
  }
  // Start the clock once the page has been painted for the first time, so the
  // browser's initial layout of the page doesn't eat into the typing budget.
  afterFirstPaint(() => {
    if (finished) return;
    raf = requestAnimationFrame((now) => {
      t0 = now;
      startY = window.scrollY;
      performance.mark("typing:start");
      frame(now);
    });
  });
}

/** Runs `go` after the browser's first paint (Paint Timing API), or after two frames where that isn't available. */
function afterFirstPaint(go) {
  if (performance.getEntriesByType?.("paint").length) return go();
  let started = false;
  const once = () => {
    if (started) return;
    started = true;
    go();
  };
  try {
    const po = new PerformanceObserver(() => {
      po.disconnect();
      once();
    });
    po.observe({ type: "paint" });
    setTimeout(once, 500); // never wait on it for long
  } catch {
    requestAnimationFrame(() => requestAnimationFrame(once));
  }
}

/** How many characters of [from, to) are due by time t (times are increasing). */
function countDue(times, from, to, t) {
  let lo = from;
  let hi = to;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo - from;
}

/** Ends the animation: blocks stay revealed, and the cursor parks after the last text. */
function done(lastBlock, cursor) {
  root.classList.remove("typing");
  root.classList.add("typed");
  if (!lastBlock || !cursor) return;
  cursor.classList.add("idle");
  const walker = document.createTreeWalker(lastBlock, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.data.trim() && !n.parentElement.closest("svg, .katex, pre, .card, script, button, figcaption") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
  });
  let lastText = null;
  while (walker.nextNode()) lastText = walker.currentNode;
  cursor.setAttribute("aria-hidden", "true");
  if (lastText) return lastText.after(cursor);
  const line = document.createElement("div");
  line.className = "cursor-line";
  line.setAttribute("aria-hidden", "true");
  line.append(cursor);
  lastBlock.after(line);
}
