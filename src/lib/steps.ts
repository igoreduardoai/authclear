/** Split a navigator summary into at most three spoken steps. */
export function splitSteps(summary: string): string[] {
  const parts = summary
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 3) return parts;
  return [parts[0] ?? "", parts[1] ?? "", parts.slice(2).join(" ")].filter(Boolean);
}
