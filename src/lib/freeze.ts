import { createHash } from "node:crypto";

export function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalHoldoutIds(ids: readonly string[]): string {
  return `${ids.join("\n")}\n`;
}

export function canonicalHoldoutGold(gold: readonly { id: string }[], ids: readonly string[]): string {
  const wanted = new Set(ids);
  return JSON.stringify(gold.filter((record) => wanted.has(record.id)));
}
