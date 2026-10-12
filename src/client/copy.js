/* Copy buttons on code blocks (hidden until this script runs, so they never show without JS). */
for (const btn of document.querySelectorAll("figure.code .copy")) {
  btn.hidden = false;
  btn.addEventListener("click", async () => {
    const code = btn.closest("figure.code")?.querySelector("pre code")?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = "copied";
    } catch {
      btn.textContent = "press ctrl+c";
      const range = document.createRange();
      range.selectNodeContents(btn.closest("figure.code").querySelector("pre"));
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    }
    btn.classList.add("done");
    setTimeout(() => { btn.textContent = "copy"; btn.classList.remove("done"); }, 1600);
  });
}
