/* Sidebar: collapsible file tree (WAI-ARIA tree of real links) and the rail toggle. */
import { store } from "./store.js";

const RAIL = "site.rail";
const OPEN = "site.open";
const root = document.documentElement;
const tree = document.querySelector('[role="tree"]');
const railBtn = document.getElementById("railBtn");

const items = () => [...tree.querySelectorAll('[role="treeitem"]')];
const isFolder = (el) => el.hasAttribute("aria-expanded");
const isOpen = (el) => el.getAttribute("aria-expanded") === "true";
const visible = () => items().filter((el) => !el.closest('[role="group"]')?.parentElement.querySelector(':scope > [aria-expanded="false"]'));
const parentItem = (el) => el.closest('[role="group"]')?.parentElement.querySelector(':scope > [role="treeitem"]') ?? null;

function saveOpen() {
  store.set(OPEN, JSON.stringify(items().filter(isOpen).map((el) => el.dataset.slug)));
}
function setOpen(el, open) {
  if (!isFolder(el)) return;
  el.setAttribute("aria-expanded", String(open));
  saveOpen();
}
function focusItem(el) {
  if (!el) return;
  for (const it of items()) it.tabIndex = it === el ? 0 : -1;
  el.focus();
}

if (tree) {
  // Folders opened on earlier visits stay open; the current page's ancestors are already open.
  let saved = [];
  try { saved = JSON.parse(store.get(OPEN) || "[]"); } catch { saved = []; }
  if (Array.isArray(saved)) for (const el of items()) if (isFolder(el) && saved.includes(el.dataset.slug)) el.setAttribute("aria-expanded", "true");

  const start = tree.querySelector('[aria-current="page"]') ?? items()[0];
  if (start) start.tabIndex = 0;

  tree.addEventListener("click", (e) => {
    const chev = e.target.closest(".chev");
    if (!chev) return;
    e.preventDefault();
    const el = chev.closest('[role="treeitem"]');
    setOpen(el, !isOpen(el));
  });

  tree.addEventListener("keydown", (e) => {
    const el = e.target.closest('[role="treeitem"]');
    if (!el || e.altKey || e.ctrlKey || e.metaKey) return;
    const vis = visible();
    const i = vis.indexOf(el);
    let handled = true;
    switch (e.key) {
      case "ArrowDown": focusItem(vis[i + 1]); break;
      case "ArrowUp": focusItem(vis[i - 1]); break;
      case "Home": focusItem(vis[0]); break;
      case "End": focusItem(vis[vis.length - 1]); break;
      case "ArrowRight":
        if (isFolder(el) && !isOpen(el)) setOpen(el, true);
        else if (isFolder(el)) focusItem(el.parentElement.querySelector('[role="group"] [role="treeitem"]'));
        break;
      case "ArrowLeft":
        if (isFolder(el) && isOpen(el)) setOpen(el, false);
        else focusItem(parentItem(el));
        break;
      case "*": // expand all siblings, per the ARIA tree pattern
        for (const sib of el.parentElement.parentElement.querySelectorAll(':scope > li > [aria-expanded]')) setOpen(sib, true);
        break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });

  tree.addEventListener("focusin", (e) => {
    const el = e.target.closest('[role="treeitem"]');
    if (el) for (const it of items()) it.tabIndex = it === el ? 0 : -1;
  });
}

function setRail(on) {
  root.classList.toggle("rail", on);
  railBtn?.setAttribute("aria-expanded", String(!on));
  railBtn?.setAttribute("title", on ? "Expand the sidebar" : "Collapse the sidebar");
  const label = railBtn?.querySelector(".sr-only");
  if (label) label.textContent = on ? "Expand sidebar" : "Collapse sidebar";
}
setRail(root.classList.contains("rail"));
railBtn?.addEventListener("click", () => {
  const on = !root.classList.contains("rail");
  setRail(on);
  store.set(RAIL, on ? "1" : "0");
});
