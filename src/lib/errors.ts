/** A problem in the content or config that the author can fix. The message always
 * starts with the file it came from, so a failed build points at the exact place. */
export class ContentError extends Error {
  file: string;
  constructor(file: string, message: string) {
    super(`${file}: ${message}`);
    this.name = "ContentError";
    this.file = file;
  }
}

type Issue = { path: PropertyKey[]; message: string; code?: string; keys?: string[]; expected?: string; input?: unknown };

/** Turns zod issues into one readable line per problem. */
export function formatIssues(issues: Issue[], known: string[] = []): string {
  return issues
    .map((i) => {
      const at = i.path.map(String).join(".");
      if (i.code === "unrecognized_keys" && i.keys) {
        return i.keys.map((k) => `unknown field "${k}"${known.length ? ` (allowed: ${known.join(", ")})` : ""}`).join("\n  ");
      }
      if (i.code === "invalid_type" && i.input === undefined) return `"${at}" is required`;
      const got = i.input === undefined || typeof i.input === "object" ? "" : ` (got ${JSON.stringify(i.input)})`;
      // Messages written for this site already start with the field name.
      return `${i.message.startsWith(at) ? "" : `${at}: `}${i.message}${got}`;
    })
    .join("\n  ");
}
