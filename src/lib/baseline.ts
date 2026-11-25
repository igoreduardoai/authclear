import { decisionFromOutcome } from "./extract";
import type { Decision } from "./types";

type Rec = Record<string, unknown>;

export interface BaselineRead {
  decision: Decision;
  outcome: string | null;
  service: string | null;
  units: string | null;
  validityStart: string | null;
  validityEnd: string | null;
  reason: string | null;
}

/**
 * A reader that trusts outcome and a few top-level fields.
 * It does not open Da Vinci reviewAction or authorized-detail extensions,
 * and it does not join a referenced Claim.
 */
export function baselineRead(input: unknown): BaselineRead {
  const focus = findFocus(input);
  if (!focus) {
    return {
      decision: "unknown",
      outcome: null,
      service: null,
      units: null,
      validityStart: null,
      validityEnd: null,
      reason: null,
    };
  }
  const outcome = typeof focus.outcome === "string" ? focus.outcome : null;
  return {
    decision: decisionFromOutcome(outcome),
    outcome,
    service: topLevelService(focus),
    units: topLevelUnits(focus),
    validityStart: topLevelPeriod(focus)?.start ?? null,
    validityEnd: topLevelPeriod(focus)?.end ?? null,
    reason: topLevelReason(focus),
  };
}

function findFocus(input: unknown): Rec | null {
  if (!isRec(input)) return null;
  if (input.resourceType === "ClaimResponse" || input.resourceType === "ExplanationOfBenefit") return input;
  if (input.resourceType === "Bundle" && Array.isArray(input.entry)) {
    for (const entry of input.entry) {
      if (!isRec(entry) || !isRec(entry.resource)) continue;
      const resource = entry.resource;
      if (
        (resource.resourceType === "ClaimResponse" || resource.resourceType === "ExplanationOfBenefit") &&
        resource.use === "preauthorization"
      ) {
        return resource;
      }
    }
  }
  return null;
}

function topLevelService(focus: Rec): string | null {
  const items = Array.isArray(focus.item) ? focus.item : [];
  for (const item of items) {
    if (!isRec(item)) continue;
    const text = conceptText(item.productOrService);
    if (text) return text;
  }
  return null;
}

function topLevelUnits(focus: Rec): string | null {
  const items = Array.isArray(focus.item) ? focus.item : [];
  for (const item of items) {
    if (isRec(item) && isRec(item.quantity) && typeof item.quantity.value === "number") {
      return String(item.quantity.value);
    }
  }
  return null;
}

function topLevelPeriod(focus: Rec): { start?: string; end?: string } | null {
  if (Array.isArray(focus.preAuthRefPeriod) && isRec(focus.preAuthRefPeriod[0])) {
    const period = focus.preAuthRefPeriod[0];
    return {
      start: typeof period.start === "string" ? period.start : undefined,
      end: typeof period.end === "string" ? period.end : undefined,
    };
  }
  return null;
}

function topLevelReason(focus: Rec): string | null {
  const notes = Array.isArray(focus.processNote) ? focus.processNote : [];
  for (const note of notes) {
    if (isRec(note) && typeof note.text === "string" && note.text.trim()) return note.text.trim();
  }
  return null;
}

function conceptText(value: unknown): string | null {
  if (!isRec(value)) return null;
  if (typeof value.text === "string" && value.text.trim()) return value.text.trim();
  const coding = Array.isArray(value.coding) ? value.coding[0] : null;
  if (!isRec(coding)) return null;
  if (typeof coding.display === "string" && coding.display.trim()) return coding.display.trim();
  if (typeof coding.code === "string") return coding.code;
  return null;
}

function isRec(value: unknown): value is Rec {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
