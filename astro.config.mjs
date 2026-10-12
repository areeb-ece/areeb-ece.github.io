// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://areeb-ece.github.io",
  base: "/",
  output: "static",
  trailingSlash: "always",
  // Keep <pre> whitespace and spaces between inline elements exactly as written.
  compressHTML: false,
  // The Content-Security-Policy forbids inline <style> and <script>, so every
  // stylesheet and script must be its own file.
  build: { inlineStylesheets: "never", format: "directory" },
  vite: { build: { assetsInlineLimit: 0 } },
  devToolbar: { enabled: false },
});
