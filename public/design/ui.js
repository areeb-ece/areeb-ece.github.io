/* Shared by areeb-ece.github.io, PrereqFlow, OTU Calendar and Satisfactory Tools (served as /design/ui.js).
   Needs /design/theme.js (loaded first, in <head>) and /design/ui.css.

   - The settings button: placed in the page's [data-design-settings] element, or floating
     in the corner if there isn't one. It opens a panel for the theme, accent, corners,
     motion and the night sky. Changes apply at once, are saved in this browser, and reach
     the other sites (and other open tabs) through the same localStorage entry.
   - The night sky: drawn into the page's [data-sky] element. Three tiling layers of
     stars from fixed seeds, so the sky is the same on every visit; colours come from
     CSS (ui.css), so switching theme needs no redraw.
   Pages can follow changes with SiteDesign.onChange(fn). */
(function () {
  var D = window.SiteDesign;
  if (!D) return;
  var root = document.documentElement;
  var listeners = [];
  var S = D.settings;

  function save() {
    try { localStorage.setItem(D.key, JSON.stringify(S)); } catch (e) { /* storage blocked: applies for this page only */ }
  }
  function changed(redrawSky) {
    D.apply(S);
    if (redrawSky !== false) sky();
    if (panel) sync();
    listeners.forEach(function (fn) { fn(S); });
  }
  D.onChange = function (fn) { listeners.push(fn); };
  D.set = function (patch, skyPatch) {
    for (var k in patch) S[k] = patch[k];
    for (var j in skyPatch) S.sky[j] = skyPatch[j];
    save();
    changed(!!skyPatch);
  };
  D.reset = function () {
    S = D.settings = D.merge(D.defaults, {});
    try { localStorage.removeItem(D.key); } catch (e) {}
    changed();
  };
  // Another tab (or another of the sites) saved new settings.
  addEventListener("storage", function (e) {
    if (e.key !== D.key && e.key !== null) return;
    S = D.settings = D.read();
    changed();
  });
  if (D.system) D.system.addEventListener("change", function () { if (S.theme === "auto") changed(false); });

  // Themes are the [data-theme="…"] blocks of /design/tokens.css, in file order: the
  // ones with a --theme-label (the apps' own fallback light/dark rules have none).
  D.themes = function () {
    var out = [], seen = {};
    for (var i = 0; i < document.styleSheets.length; i++) {
      var rules;
      try { rules = document.styleSheets[i].cssRules; } catch (e) { continue; }
      for (var j = 0; j < rules.length; j++) {
        var m = /\[data-theme="([\w-]+)"\]/.exec(rules[j].selectorText || "");
        var label = m && rules[j].style.getPropertyValue("--theme-label").trim().replace(/^["']|["']$/g, "");
        if (!label || seen[m[1]]) continue;
        seen[m[1]] = 1;
        out.push({ name: m[1], label: label });
      }
    }
    return out;
  };

  // ── the night sky ────────────────────────────────────────────────────────
  // Per layer: tile size (px), star count, radius and opacity ranges, blur (px), share of
  // tinted stars, seed, seconds per drift loop and the share of page scroll it follows.
  // Brightness is capped so --ink-3 keeps WCAG AA contrast over the night sheet's sky
  // (the portfolio's browser check measures it with these defaults).
  var LAYERS = [
    { tile: 360, count: 46, radius: [0.45, 0.8], opacity: [0.038, 0.072], blur: 0.5, tint: 0.12, seed: 11, drift: 520, parallax: 0.03 },
    { tile: 420, count: 20, radius: [0.7, 1.1], opacity: [0.11, 0.2], blur: 1, tint: 0.2, seed: 23, drift: 360, parallax: 0.07 },
    { tile: 480, count: 8, radius: [1, 1.4], opacity: [0.12, 0.205], blur: 1.5, tint: 0.3, seed: 37, drift: 240, parallax: 0.12 },
  ];
  var DIRS = { n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0], nw: [-1, -1] };
  var host = null, box = null, layers = [];

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function tile(L, i, o) {
    var r = rng(L.seed), T = L.tile, blur = L.blur * o.blur;
    var between = function (lo, hi) { return lo + r() * (hi - lo); };
    var maxR = L.radius[1] * o.size;
    var margin = Math.ceil(maxR + blur * 3);
    var dots = "";
    for (var n = Math.round(L.count * o.density), k = 0; k < n; k++) {
      var x = r() * T, y = r() * T;
      var rad = (between(L.radius[0], L.radius[1]) * o.size).toFixed(2);
      var op = Math.min(1, between(L.opacity[0], L.opacity[1]) * o.opacity).toFixed(3);
      var t = r(), share = Math.min(1, L.tint * o.tint);
      var cls = t < share / 2 ? "s1" : t < share ? "s2" : "s0";
      // Stars near an edge are drawn again on the opposite side so the tile repeats seamlessly.
      var xs = [0], ys = [0];
      if (x < margin) xs.push(T); else if (x > T - margin) xs.push(-T);
      if (y < margin) ys.push(T); else if (y > T - margin) ys.push(-T);
      for (var a = 0; a < xs.length; a++) for (var b = 0; b < ys.length; b++)
        dots += '<circle class="' + cls + '" cx="' + (x + xs[a]).toFixed(1) + '" cy="' + (y + ys[b]).toFixed(1) + '" r="' + rad + '" fill-opacity="' + op + '"/>';
    }
    var f = blur > 0 ? '<filter id="sd-b' + i + '" x="0" y="0" width="' + T + '" height="' + T + '" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="' + blur.toFixed(2) + '"/></filter>' : "";
    return '<svg class="sky-drift" xmlns="http://www.w3.org/2000/svg"><defs>' + f +
      '<pattern id="sd-p' + i + '" width="' + T + '" height="' + T + '" patternUnits="userSpaceOnUse"><g' + (f ? ' filter="url(#sd-b' + i + ')"' : "") + ">" + dots + "</g></pattern></defs>" +
      '<rect width="100%" height="100%" fill="url(#sd-p' + i + ')"/></svg>';
  }
  function sky() {
    if (!host) return;
    var o = S.sky;
    if (!box) {
      // The portfolio renders the sky box and haze into the page; apps get them here.
      box = host.classList.contains("sky") ? host : host.insertBefore(document.createElement("div"), host.firstChild);
      box.classList.add("sky");
      box.setAttribute("aria-hidden", "true");
      if (!box.querySelector(".haze")) box.appendChild(document.createElement("div")).className = "haze";
      root.classList.add("has-sky");
    }
    box.style.setProperty("--haze", String(o.haze));
    if (/^#[0-9a-f]{6}$/i.test(o.color)) box.style.setProperty("--sky-star", o.color);
    else box.style.removeProperty("--sky-star");
    layers.forEach(function (l) { l.el.remove(); });
    layers = [];
    if (!o.stars || o.density <= 0 || o.opacity <= 0) return;
    var dir = DIRS[o.direction] || DIRS.e;
    LAYERS.forEach(function (L, i) {
      var el = document.createElement("div");
      el.className = "sky-layer";
      el.innerHTML = tile(L, i, o);
      var svg = el.firstChild;
      svg.style.setProperty("--tile", L.tile + "px");
      svg.style.setProperty("--dx", String(dir[0]));
      svg.style.setProperty("--dy", String(dir[1]));
      // Diagonal loops travel √2 further, so they get √2 longer to keep the same speed.
      if (o.speed > 0) svg.style.setProperty("--drift", (L.drift * (dir[0] && dir[1] ? Math.SQRT2 : 1)) / o.speed + "s");
      else svg.classList.add("still");
      box.appendChild(el);
      layers.push({ el: el, k: L.parallax * o.parallax, tile: L.tile });
    });
    scrolled();
  }

  // Scroll parallax: each layer follows a fraction of the page scroll. Shifts wrap at the
  // tile size, so the layers never run out however long the page is.
  var reduce = matchMedia("(prefers-reduced-motion: reduce)");
  var queued = false;
  function place() {
    queued = false;
    var y = S.motion && !reduce.matches ? window.scrollY : 0;
    layers.forEach(function (l) { l.el.style.transform = "translate3d(0, " + -((y * l.k) % l.tile) + "px, 0)"; });
  }
  function scrolled() {
    if (queued || document.hidden) return;
    queued = true;
    requestAnimationFrame(place);
  }

  // ── the settings button and panel ────────────────────────────────────────
  var GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="8.2" stroke-width="3.2" stroke-dasharray="3.22 3.22"/><circle cx="12" cy="12" r="6" stroke-width="1.7"/><circle cx="12" cy="12" r="2.2" stroke-width="1.7"/></svg>';
  var SKY = [
    // [setting, label, min, max, step]; the rest of the sky rows are built by hand below
    ["density", "Number of stars", 0, 4, 0.25],
    ["size", "Star size", 0.5, 4, 0.1],
    ["opacity", "Star brightness", 0, 5, 0.1],
    ["blur", "Star blur", 0, 4, 0.1],
    ["tint", "Coloured stars", 0, 4, 0.25],
    ["speed", "Drift speed", 0, 8, 0.25],
    ["parallax", "Scroll parallax", 0, 5, 0.25],
    ["haze", "Glow", 0, 3, 0.1],
  ];
  var panel = null, gear = null;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var times = function (v) { return (Math.round(v * 100) / 100) + "×"; };
  function seg(name, opts) {
    return '<div class="sd-seg" role="group" data-seg="' + name + '">' + opts.map(function (o) {
      return '<button type="button" data-v="' + o[0] + '"' + (o[2] ? ' aria-label="' + o[2] + '"' : "") + ">" + o[1] + "</button>";
    }).join("") + "</div>";
  }
  function swatch(name) { return '<span data-theme="' + esc(name) + '">Aa<i><b></b></i></span>'; }

  function build() {
    var themes = D.themes();
    var typing = root.hasAttribute("data-typing");
    panel = document.createElement("dialog");
    panel.className = "sd-panel";
    panel.setAttribute("aria-labelledby", "sdTitle");
    panel.innerHTML =
      '<div class="sd-head"><h2 id="sdTitle">Settings</h2><button class="sd-x" type="button" data-close aria-label="Close settings">×</button></div>' +
      '<section class="sd-sec"><h3>Theme</h3><div class="sd-themes" role="group" aria-label="Theme">' +
      '<button class="sd-theme" type="button" data-theme-pick="auto"><span class="sd-sw">' + swatch("dark") + swatch("light") + "</span>Match system</button>" +
      themes.map(function (t) {
        return '<button class="sd-theme" type="button" data-theme-pick="' + esc(t.name) + '"><span class="sd-sw">' + swatch(t.name) + "</span>" + esc(t.label) + "</button>";
      }).join("") + "</div></section>" +
      '<section class="sd-sec"><h3>Colour and shape</h3>' +
      '<div class="sd-row"><span>Accent</span><span class="sd-color"><button class="sd-link" type="button" data-clear="accent">theme’s own</button><input type="color" data-color="accent" aria-label="Accent colour"></span></div>' +
      '<div class="sd-row"><span>Corners</span>' + seg("corners", [["sharp", "sharp"], ["", "default"], ["round", "round"]]) + "</div></section>" +
      '<section class="sd-sec"><h3>Motion</h3>' +
      '<label class="sd-row"><span>Animations <span class="sd-note">· drifting stars, glow, floating cards</span></span><input type="checkbox" data-check="motion"></label>' +
      (typing ? '<label class="sd-row"><span>Typing effect <span class="sd-note">· this site’s pages</span></span><input type="checkbox" data-check="typing"></label>' : "") +
      "</section>" +
      '<section class="sd-sec"><h3>Night sky</h3>' +
      '<label class="sd-row"><span>Stars</span><input type="checkbox" data-sky-check="stars"></label>' +
      SKY.map(function (c) {
        return '<label class="sd-row"><span>' + c[1] + '</span><output data-out="' + c[0] + '"></output><input type="range" data-range="' + c[0] + '" min="' + c[2] + '" max="' + c[3] + '" step="' + c[4] + '"></label>';
      }).join("") +
      '<div class="sd-row"><span>Star colour</span><span class="sd-color"><button class="sd-link" type="button" data-clear="color">theme’s own</button><input type="color" data-color="color" aria-label="Star colour"></span></div>' +
      '<div class="sd-row"><span>Drift direction</span>' + seg("direction", [["w", "←", "west"], ["n", "↑", "north"], ["s", "↓", "south"], ["e", "→", "east"], ["nw", "↖", "north-west"], ["ne", "↗", "north-east"], ["sw", "↙", "south-west"], ["se", "↘", "south-east"]]) + "</div>" +
      '<p class="sd-note">Very bright skies can make the dimmest text harder to read.</p></section>' +
      '<div class="sd-foot"><button class="sd-reset" type="button" data-reset>Reset all</button>' +
      '<p class="sd-note">Saved in this browser, and shared by areeb-ece.github.io, PrereqFlow, OTU Calendar and Satisfactory Tools.</p></div>';
    document.body.appendChild(panel);

    // Keys typed in the panel are the panel's, not shortcuts for the page underneath.
    panel.addEventListener("keydown", function (e) { e.stopPropagation(); });
    panel.addEventListener("close", function () { gear.setAttribute("aria-expanded", "false"); gear.focus(); });
    panel.addEventListener("click", function (e) {
      var t = e.target;
      if (t === panel) return panel.close(); // the transparent backdrop
      var b = t.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-close")) panel.close();
      else if (b.dataset.themePick) D.set({ theme: b.dataset.themePick });
      else if (b.dataset.clear === "accent") D.set({ accent: "" });
      else if (b.dataset.clear === "color") D.set(null, { color: "" });
      else if (b.hasAttribute("data-reset")) D.reset();
      else if (b.closest("[data-seg]")) {
        var g = b.closest("[data-seg]").dataset.seg;
        if (g === "direction") D.set(null, { direction: b.dataset.v });
        else D.set({ corners: b.dataset.v });
      }
    });
    var frame = 0, pending = null;
    panel.addEventListener("input", function (e) {
      var t = e.target, d = t.dataset;
      if (d.range) {
        // Sliders redraw the sky at most once a frame.
        pending = pending || {};
        pending[d.range] = +t.value;
        panel.querySelector('[data-out="' + d.range + '"]').textContent = times(+t.value);
        if (!frame) frame = requestAnimationFrame(function () { frame = 0; var p = pending; pending = null; D.set(null, p); });
      } else if (d.color === "accent") D.set({ accent: t.value });
      else if (d.color === "color") D.set(null, { color: t.value });
    });
    panel.addEventListener("change", function (e) {
      var d = e.target.dataset;
      var on = e.target.checked;
      if (d.check === "motion") D.set({ motion: on });
      else if (d.check === "typing") D.set({ typing: on });
      else if (d.skyCheck) D.set(null, { stars: on });
    });
  }
  function q(sel) { return panel.querySelectorAll(sel); }
  function sync() {
    var cs = getComputedStyle(root);
    var picks = [].slice.call(q("[data-theme-pick]"));
    var current = picks.some(function (b) { return b.dataset.themePick === S.theme; }) ? S.theme : "dark";
    picks.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.themePick === current)); });
    q("[data-seg=corners] button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === S.corners)); });
    q("[data-seg=direction] button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === S.sky.direction)); });
    q("[data-check]").forEach(function (c) { c.checked = S[c.dataset.check]; });
    q("[data-sky-check]").forEach(function (c) { c.checked = S.sky.stars; });
    q("[data-range]").forEach(function (r) {
      if (document.activeElement !== r) r.value = S.sky[r.dataset.range];
      panel.querySelector('[data-out="' + r.dataset.range + '"]').textContent = times(S.sky[r.dataset.range]);
    });
    // Colour inputs show the custom colour, or the theme's own while none is set.
    var own = { accent: S.accent, color: S.sky.color };
    var fallback = { accent: cs.getPropertyValue("--accent"), color: getComputedStyle(box || root).getPropertyValue("--star") || cs.getPropertyValue("--ink") };
    q("[data-color]").forEach(function (c) {
      var k = c.dataset.color, v = own[k] || hex(fallback[k]);
      if (document.activeElement !== c && v) c.value = v;
      panel.querySelector('[data-clear="' + k + '"]').hidden = !own[k];
    });
  }
  // Computed colours come back as #rrggbb or rgb(); <input type=color> needs #rrggbb.
  function hex(v) {
    v = String(v || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    var m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(v);
    return m ? "#" + [m[1], m[2], m[3]].map(function (n) { return (+n).toString(16).padStart(2, "0"); }).join("") : "";
  }
  function open() {
    if (!panel) build();
    sync();
    panel.showModal();
    gear.setAttribute("aria-expanded", "true");
    (panel.querySelector('.sd-theme[aria-pressed="true"]') || panel.querySelector(".sd-x")).focus();
  }

  function mount() {
    var slot = document.querySelector("[data-design-settings]");
    gear = document.createElement("button");
    gear.type = "button";
    gear.className = "sd-gear" + (slot ? "" : " sd-float");
    gear.id = "designSettings";
    gear.title = "Theme, colours and background";
    gear.setAttribute("aria-label", "Settings");
    gear.setAttribute("aria-haspopup", "dialog");
    gear.setAttribute("aria-expanded", "false");
    gear.innerHTML = GEAR;
    gear.addEventListener("click", function () { if (panel && panel.open) panel.close(); else open(); });
    (slot || document.body).appendChild(gear);
    root.classList.add("has-settings");
  }
  function init() {
    host = document.querySelector("[data-sky]");
    if (host) {
      addEventListener("scroll", scrolled, { passive: true });
      document.addEventListener("visibilitychange", function () { root.classList.toggle("sky-paused", document.hidden); });
      sky();
    }
    mount();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  D.open = open;
})();
