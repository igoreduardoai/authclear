import { getByPath } from "./path";
import type { Pointer } from "./types";

export interface RelatedDoc {
  relatedId: string;
  resource: unknown;
}

export function pointerMismatches(
  focus: unknown,
  related: RelatedDoc[],
  sentences: { id: string; text: string; pointers: Pointer[] }[],
): string[] {
  const problems: string[] = [];
  for (const sentence of sentences) {
    if (sentence.pointers.length === 0) {
      problems.push(`${sentence.id}: no pointer`);
      continue;
    }
    for (const pointer of sentence.pointers) {
      if (pointer.value == null) continue;
      const actual = getByPath(documentFor(pointer, focus, related), pointer.path);
      if (String(actual) !== pointer.value) {
        problems.push(`${sentence.id}: ${pointer.path} is ${JSON.stringify(actual)}, not ${pointer.value}`);
      }
      if (!pointer.absent && !sentence.text.includes(pointer.value)) {
        problems.push(`${sentence.id}: text does not contain ${pointer.value}`);
      }
    }
    const tokens = sentence.text.match(/\d+(?:[-:+T]\d+)*/g) ?? [];
    for (const token of tokens) {
      const supported = sentence.pointers.some(
        (pointer) => !pointer.absent && (pointer.value ?? "").includes(token),
      );
      if (!supported) problems.push(`${sentence.id}: number ${token} has no pointer`);
    }
  }
  return problems;
}

function documentFor(pointer: Pointer, focus: unknown, related: RelatedDoc[]): unknown {
  if (pointer.source === "focus") return focus;
  const match = related.find((entry) => entry.relatedId === pointer.relatedId);
  return match?.resource ?? related[0]?.resource;
}
