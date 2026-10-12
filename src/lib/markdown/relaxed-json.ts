import { ContentError } from "../errors.ts";

/**
 * Parses the "JSON-ish" object syntax WaveDrom examples are written in: unquoted keys,
 * 'single' or "double" quotes, trailing commas and // or /* *\/ comments. It never
 * evaluates code (WaveDrom's own reader uses eval).
 */
export function parseRelaxedJson(text: string, where = "wavedrom"): unknown {
  let out = "";
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === "/" && text[i + 1] === "/") {
      while (i < n && text[i] !== "\n") i++;
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? n : end + 2;
    } else if (c === '"' || c === "'") {
      let s = "";
      i++;
      while (i < n && text[i] !== c) {
        if (text[i] === "\\" && i + 1 < n) {
          s += text[i] + text[i + 1];
          i += 2;
        } else s += text[i++];
      }
      i++;
      // Re-quote with double quotes; a bare " inside a single-quoted string needs escaping.
      out += '"' + (c === "'" ? s.replace(/\\'/g, "'").replace(/(^|[^\\])"/g, '$1\\"') : s) + '"';
    } else if (/[A-Za-z_$]/.test(c)) {
      let id = "";
      while (i < n && /[\w$]/.test(text[i])) id += text[i++];
      out += id === "true" || id === "false" || id === "null" ? id : JSON.stringify(id);
    } else if (c === ",") {
      // drop trailing commas before } or ]
      let j = i + 1;
      for (;;) {
        while (j < n && /\s/.test(text[j])) j++;
        if (text.startsWith("//", j)) while (j < n && text[j] !== "\n") j++;
        else if (text.startsWith("/*", j)) j = text.indexOf("*/", j + 2) < 0 ? n : text.indexOf("*/", j + 2) + 2;
        else break;
      }
      if (text[j] !== "}" && text[j] !== "]") out += c;
      i++;
    } else {
      out += c;
      i++;
    }
  }
  try {
    return JSON.parse(out);
  } catch (e) {
    throw new ContentError(where, `couldn't read the WaveDrom description: ${(e as Error).message}`);
  }
}
