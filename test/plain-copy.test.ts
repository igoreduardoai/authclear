import { describe, expect, it } from "vitest";
import { CASES } from "../src/lib/cases";
import { buildCallScript } from "../src/lib/callScript";
import { extract } from "../src/lib/extract";
import { formatTimestamp } from "../src/lib/formatTime";
import { withLetterStyles } from "../src/lib/letterStyle";
import { getByPath } from "../src/lib/path";
import { leadCatalog, plainLead } from "../src/lib/plain";
import { fernandezHuerta, fleschKincaidGrade } from "../src/lib/readability";
import type { Extraction, Pointer } from "../src/lib/types";

describe("plain lead", () => {
  it("uses the decision sentence and does not invent a field", () => {
    const denied = extract(CASES[0]?.resource);
    expect(plainLead(denied, "en").text).toBe("Your plan did not approve this request.");
    expect(plainLead(denied, "es").text).toBe("Su plan no aprobó el pedido.");
    const pointer = plainLead(denied, "en").pointer;
    expect(pointer).not.toBeNull();
    expect(getByPath(CASES[0]?.resource, pointer?.path ?? "")).toBe(pointer?.value);

    const invalid = extract(CASES.find((entry) => entry.id === "invalid")?.resource);
    expect(invalid.ok).toBe(false);
    expect(plainLead(invalid, "en").text).toBe("We could not find a decision in this record.");
    expect(plainLead(invalid, "en").pointer).toBeNull();
  });

  it("scores the English and Spanish lead sets", () => {
    const english = fleschKincaidGrade(leadCatalog("en").join(" "));
    const spanish = fernandezHuerta(leadCatalog("es").join(" "));
    expect(english).not.toBeNull();
    expect(english!).toBeLessThanOrEqual(6.5);
    expect(spanish).not.toBeNull();
    expect(spanish!.index).toBeGreaterThanOrEqual(85);
  });
});

describe("call script", () => {
  it("drops missing slots, points at real values, and stays readable", () => {
    for (const demo of CASES) {
      const extraction = extract(demo.resource, { related: demo.related.map((entry) => entry.resource) });
      for (const lang of ["en", "es"] as const) {
        const script = buildCallScript(extraction, lang);
        if (!extraction.ok) {
          expect(script.lines).toEqual([]);
          continue;
        }
        expect(script.text.length).toBeGreaterThan(0);
        expect(script.lines.at(-2)?.id).toBe("ask-deadline");
        expect(script.lines.at(-1)?.id).toBe("ask-writing");
        if (!extraction.service) expect(script.lines.some((line) => line.id === "service")).toBe(false);
        if (!extraction.authId) expect(script.lines.some((line) => line.id === "auth")).toBe(false);
        if (!extraction.responseCreated) expect(script.lines.some((line) => line.id === "date")).toBe(false);
        if (extraction.reasons.length === 0) expect(script.lines.some((line) => line.id.startsWith("reason"))).toBe(false);
        if (!extraction.urgent) expect(script.lines.some((line) => line.id === "urgent")).toBe(false);

        const allowed = new Set(script.lines.flatMap((line) => (line.pointer?.value ? [line.pointer.value] : [])));
        for (const line of script.lines) {
          if (!line.pointer) continue;
          expect(line.pointer.path.length).toBeGreaterThan(0);
          expect(line.text).toContain(String(line.pointer.value));
          expect(readPointer(demo, line.pointer)).toBe(line.pointer.value);
        }
        for (const value of candidateValues(extraction)) {
          if (script.text.includes(value)) expect(allowed.has(value)).toBe(true);
        }
        if (lang === "en") {
          const grade = fleschKincaidGrade(script.text);
          expect(grade, demo.id).not.toBeNull();
          expect(grade!, demo.id).toBeLessThanOrEqual(6.5);
        } else {
          const score = fernandezHuerta(script.text);
          expect(score, demo.id).not.toBeNull();
          expect(score!.index, demo.id).toBeGreaterThanOrEqual(85);
        }
      }
    }
  });
});

describe("timestamp formatting", () => {
  it("keeps the offset printed on the record", () => {
    expect(formatTimestamp("2005-05-05T11:01:00+05:00")).toBe("Thu, May 5, 2005, 11:01 AM (UTC+5)");
  });
});

describe("letter styles", () => {
  it("adds the token colors without removing the required phrases", () => {
    const html = withLetterStyles("<html><head><title>Letter</title></head><body><h1>Not Certified</h1><p>no real members</p></body></html>");
    expect(html).toContain("Not Certified");
    expect(html).toContain("no real members");
    expect(html).toContain("#F7F9FB");
    expect(html).toContain("#0F6B6B");
  });
});

function candidateValues(extraction: Extraction): string[] {
  return [
    extraction.service?.text,
    extraction.authId?.value,
    extraction.responseCreated?.value,
    extraction.urgent?.code,
    extraction.urgent?.display ?? undefined,
    extraction.patient.label ?? undefined,
    extraction.insurer.name ?? undefined,
    extraction.focusId ?? undefined,
    extraction.outcome?.value,
    extraction.status?.value,
    ...extraction.reasons.map((reason) => reason.text),
    ...extraction.reviewCodes.flatMap((review) => [review.code, review.display ?? ""]),
  ].filter((value): value is string => typeof value === "string" && value.length >= 3);
}

function readPointer(demo: (typeof CASES)[number], pointer: Pointer): unknown {
  if (pointer.source === "focus") return getByPath(demo.resource, pointer.path);
  const related = demo.related.find((entry) => entry.relatedId === pointer.relatedId);
  return related ? getByPath(related.resource, pointer.path) : undefined;
}
