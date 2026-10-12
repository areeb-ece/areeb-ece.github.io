/* Runs before first paint, as a file so the page's CSP can forbid inline scripts.
   Applies the remembered sidebar state so the page doesn't jump. */
(function () {
  var root = document.documentElement;
  var rail = null;
  try { rail = localStorage.getItem("site.rail"); } catch (e) {}
  if (rail === "1" || (rail === null && window.innerWidth < 760)) root.classList.add("rail");
})();
