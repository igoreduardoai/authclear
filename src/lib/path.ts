/** Tiny FHIRPath-like reader for the paths AuthClear records. Supports dotted names and [index]. */

export function joinPath(base: string, rest: string): string {
  if (!base) return rest;
  if (!rest) return base;
  if (rest.startsWith("[")) return `${base}${rest}`;
  return `${base}.${rest}`;
}

export function getByPath(root: unknown, path: string): unknown {
  if (path === "" || path === "$") return root;
  let current: unknown = root;
  const tokens = path.match(/[A-Za-z_][A-Za-z0-9_]*|\[\d+\]/g);
  if (!tokens) return undefined;
  const rebuilt = tokens
    .map((token) => (token.startsWith("[") ? token : `.${token}`))
    .join("")
    .replace(/^\./, "");
  if (rebuilt !== path) return undefined;
  for (const token of tokens) {
    if (current == null || typeof current !== "object") return undefined;
    if (token.startsWith("[")) {
      const index = Number(token.slice(1, -1));
      if (!Array.isArray(current)) return undefined;
      current = current[index];
    } else {
      current = (current as Record<string, unknown>)[token];
    }
  }
  return current;
}
