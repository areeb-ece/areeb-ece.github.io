/* Shared by areeb-ece.github.io, PrereqFlow, OTU Calendar and Satisfactory Tools (served as /design/theme.js).
   Runs before first paint and applies the visitor's saved appearance settings. All the
   sites live on one address, so they share this one localStorage entry: a theme picked
   on any of them is used on all of them. The settings panel (/design/ui.js) edits it.
   It's a file, not an inline script, so the sites' security policies can forbid those. */
(function () {
  var KEY = "design.settings";
  var root = document.documentElement;
  var DEFAULTS = {
    theme: "dark", // a data-theme name from /design/tokens.css, or "auto" (follow the system)
    accent: "", // "" = the theme's own, or "#rrggbb"
    corners: "", // "", "sharp" or "round"
    motion: true, // false holds every animation still
    typing: true, // the portfolio's typing effect
    sky: { stars: true, density: 1, size: 1, opacity: 1, blur: 1, tint: 1, color: "", speed: 1, direction: "e", parallax: 1, haze: 1 },
  };
  var CORNERS = { sharp: ["2px", "3px", "4px"], round: ["12px", "16px", "24px"] };
  var system = window.matchMedia && matchMedia("(prefers-color-scheme: light)");

  // Saved values of the wrong type are ignored, so an old or hand-edited entry can't break a page.
  function merge(d, s) {
    var o = {};
    for (var k in d) o[k] = d[k] && typeof d[k] === "object" ? merge(d[k], s && s[k]) : s && typeof s[k] === typeof d[k] ? s[k] : d[k];
    return o;
  }
  function read() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!s || typeof s !== "object") {
      // Nothing shared yet: keep the light/dark and motion choices the sites used to store separately.
      s = {};
      try {
        var t = localStorage.getItem("prereqflow.theme") || localStorage.getItem("otucalendar.theme");
        if (t) s.theme = t;
        if (localStorage.getItem("prereqflow.motion") === "off") s.motion = false;
      } catch (e) {}
    }
    return merge(DEFAULTS, s);
  }
  // #rrggbb → relative luminance, for picking black or white text on a custom accent.
  function lum(hex) {
    return [1, 3, 5].reduce(function (n, i, k) {
      var c = parseInt(hex.slice(i, i + 2), 16) / 255;
      c = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      return n + c * [0.2126, 0.7152, 0.0722][k];
    }, 0);
  }
  function apply(s) {
    var st = root.style;
    root.setAttribute("data-theme", s.theme === "auto" ? (system && system.matches ? "light" : "dark") : s.theme);
    if (/^#[0-9a-f]{6}$/i.test(s.accent)) {
      st.setProperty("--accent", s.accent);
      st.setProperty("--accent-ink", lum(s.accent) > 0.18 ? "#000000" : "#FFFFFF");
    } else {
      st.removeProperty("--accent");
      st.removeProperty("--accent-ink");
    }
    ["--r-sm", "--r", "--r-lg"].forEach(function (p, i) {
      if (CORNERS[s.corners]) st.setProperty(p, CORNERS[s.corners][i]);
      else st.removeProperty(p);
    });
    if (s.motion) root.removeAttribute("data-motion");
    else root.setAttribute("data-motion", "off");
    // data-scheme tells site CSS whether the theme is dark or light (from its color-scheme).
    var scheme = getComputedStyle(root).colorScheme || "";
    root.setAttribute("data-scheme", /light/.test(scheme) && !/dark/.test(scheme) ? "light" : "dark");
  }

  var settings = read();
  apply(settings);
  window.SiteDesign = { key: KEY, defaults: DEFAULTS, settings: settings, read: read, apply: apply, merge: merge, system: system };
})();
