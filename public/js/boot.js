/* Runs before first paint, after /design/theme.js has applied the visitor's settings.
   It's a file, not an inline script, so the page's CSP can forbid inline scripts. It
   decides whether the typing animation runs, and applies the remembered sidebar state so
   nothing jumps. Timing constants live in src/client/timing.js. */
(function () {
  var root = document.documentElement;
  var rail = null;
  try { rail = localStorage.getItem("site.rail"); } catch (e) {}
  if (rail === "1" || (rail === null && window.innerWidth < 760)) root.classList.add("rail");

  var mode = root.getAttribute("data-typing");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var typedHome = false;
  try { typedHome = sessionStorage.getItem("site.homeTyped") === "1"; } catch (e) {}
  // The settings panel can turn the typing effect (or all motion) off.
  var design = window.SiteDesign && window.SiteDesign.settings;
  var off = design && (!design.typing || !design.motion);
  if (mode === "none" || reduce || off || (mode === "home" && typedHome)) return;

  root.classList.add("typing");
  // Safety net, not an animation timing: if the animation script never starts
  // (blocked, failed to load), show the page as it is.
  setTimeout(function () {
    if (!root.classList.contains("typing-started")) root.classList.remove("typing");
  }, 4000);
})();
