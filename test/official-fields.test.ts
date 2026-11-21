import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildNotice } from "../src/lib/explain";
import { extract } from "../src/lib/extract";
import { getByPath } from "../src/lib/path";
import { pointerMismatches, type RelatedDoc } from "../src/lib/pointers";

type Rec = Record<string, unknown>;

const load = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Rec;

const claim = load("fixtures/official/pas/Claim-ReferralAuthorizationExample.json");
const patient = load("fixtures/official/pdex/Patient-1.json");
const payer = load("fixtures/official/pdex/Organization-Payer1.json");

interface OraclePointer {
  source: "focus" | "related";
  path: string;
  value: string;
  relatedId?: string;
}

interface OracleReview {
  code: string;
  itemSequence: number | null;
}

const CASES: { id: string; file: string; related: Rec[] }[] = [
  { id: "denial", file: "fixtures/official/pas/Bundle-RejectionResponseBundleExample.json", related: [] },
  {
    id: "pending",
    file: "fixtures/official/pas/Bundle-ReferralPendingAuthorizationResponseBundleExample.json",
    related: [claim],
  },
  {
    id: "approved",
    file: "fixtures/official/pas/Bundle-ReferralAuthorizationResponseBundleExample.json",
    related: [claim],
  },
  { id: "error", file: "fixtures/official/pas/Bundle-ErrorResponseBundleExample.json", related: [] },
  { id: "inquiry", file: "fixtures/official/pas/ClaimResponse-PASClaimInquiryResponseExample.json", related: [] },
  {
    id: "additional",
    file: "fixtures/official/pas/ClaimResponse-PractitionerRequestorAdditionalContentResponseExample.json",
    related: [],
  },
  {
    id: "pdex",
    file: "fixtures/official/pdex/ExplanationOfBenefit-PDexPriorAuth1.json",
    related: [patient, payer],
  },
];

describe("official examples, field by field", () => {
  for (const spec of CASES) {
    it(`${spec.id}: status, review action, reason codes, and dates are on the notice`, () => {
      const resource = load(spec.file);
      const oracle = walk(resource, spec.related);
      const extraction = extract(resource, { related: spec.related });
      const english = buildNotice(extraction, "en");
      const spanish = buildNotice(extraction, "es");
      const relatedDocs: RelatedDoc[] = spec.related.map((entry) => ({
        relatedId: `${String(entry.resourceType)}/${String(entry.id)}`,
        resource: entry,
      }));

      expect(extraction.status?.value, `${spec.id} status`).toBe(oracle.status);
      expect(
        extraction.reviewCodes.map((code) => ({ code: code.code, itemSequence: code.itemSequence })),
        `${spec.id} review actions`,
      ).toEqual(oracle.reviews);

      if (oracle.reasonTokens.length === 0 && extraction.decision !== "error") {
        expect(english.sentences.map((sentence) => sentence.text).join(" ")).toContain(
          "does not include a specific reason",
        );
        expect(spanish.sentences.map((sentence) => sentence.text).join(" ")).toContain(
          "no incluye un motivo específico",
        );
      }
      for (const token of oracle.reasonTokens) {
        expect(english.sentences.map((sentence) => sentence.text).join(" "), token).toContain(token);
      }

      const missing = oracle.pointers.filter((pointer) => !noticeHas(english, pointer));
      expect(missing, `${spec.id} missing notice pointers`).toEqual([]);
      for (const pointer of oracle.pointers) {
        const doc = pointer.source === "focus" ? resource : spec.related.find((entry) => `${entry.resourceType}/${entry.id}` === pointer.relatedId);
        expect(String(getByPath(doc, pointer.path)), pointer.path).toBe(pointer.value);
      }

      expect(pointerMismatches(resource, relatedDocs, english.sentences), `${spec.id} en`).toEqual([]);
      expect(pointerMismatches(resource, relatedDocs, spanish.sentences), `${spec.id} es`).toEqual([]);
      expect(spanish.sentences.map((sentence) => sentence.pointers.map((pointer) => pointer.value))).toEqual(
        english.sentences.map((sentence) => sentence.pointers.map((pointer) => pointer.value)),
      );
    });
  }

  it("uses a plural verb for requested service dates", () => {
    const inquiry = load("fixtures/official/pas/ClaimResponse-PASClaimInquiryResponseExample.json");
    const text = buildNotice(extract(inquiry), "en").sentences.map((sentence) => sentence.text).join(" ");
    expect(text).toContain("The requested service dates on the resource are ");
    expect(text).not.toContain("The requested service dates on the resource is ");
  });
});

function noticeHas(
  notice: { sentences: { text: string; pointers: { source: string; path: string; value?: string; relatedId?: string }[] }[] },
  pointer: OraclePointer,
): boolean {
  return notice.sentences.some(
    (sentence) =>
      sentence.text.includes(pointer.value) &&
      sentence.pointers.some(
        (item) =>
          item.source === pointer.source &&
          item.path === pointer.path &&
          item.value === pointer.value &&
          item.relatedId === pointer.relatedId,
      ),
  );
}

function walk(resource: Rec, related: Rec[]): {
  status: string;
  reviews: OracleReview[];
  reasonTokens: string[];
  pointers: OraclePointer[];
} {
  const { focus, prefix } = focusOf(resource);
  const status = String(focus.status);
  const pointers: OraclePointer[] = [
    { source: "focus", path: join(prefix, "status"), value: status },
  ];
  const reviews: OracleReview[] = [];

  for (const key of ["item", "addItem"] as const) {
    const items = Array.isArray(focus[key]) ? focus[key] : [];
    items.forEach((item, itemIndex) => {
      if (!isRec(item)) return;
      const itemPath = join(prefix, `${key}[${itemIndex}]`);
      const sequences = readSequences(item);
      const adjudications = Array.isArray(item.adjudication) ? item.adjudication : [];
      adjudications.forEach((adjudication, adjudicationIndex) => {
        if (!isRec(adjudication)) return;
        const extensions = Array.isArray(adjudication.extension) ? adjudication.extension : [];
        extensions.forEach((extension, extensionIndex) => {
          if (!isRec(extension)) return;
          const url = String(extension.url ?? "");
          if (url.includes("when-adjudicated") || url.includes("whenAdjudicated")) {
            if (typeof extension.valueDateTime === "string") {
              pointers.push({
                source: "focus",
                path: join(itemPath, `adjudication[${adjudicationIndex}].extension[${extensionIndex}].valueDateTime`),
                value: extension.valueDateTime,
              });
            }
          }
          if (!url.includes("reviewAction") || url.includes("reviewActionCode")) return;
          const children = Array.isArray(extension.extension) ? extension.extension : [];
          children.forEach((child, childIndex) => {
            if (!isRec(child) || !String(child.url ?? "").includes("reviewActionCode")) return;
            const coding = firstCoding(child.valueCodeableConcept);
            if (!coding || typeof coding.code !== "string") return;
            const codePath = join(
              itemPath,
              `adjudication[${adjudicationIndex}].extension[${extensionIndex}].extension[${childIndex}].valueCodeableConcept.coding[0].code`,
            );
            const targets = sequences.length > 0 ? sequences : [{ value: null as number | null, path: "" }];
            for (const sequence of targets) {
              reviews.push({ code: coding.code, itemSequence: sequence.value });
              pointers.push({ source: "focus", path: codePath, value: coding.code });
              if (typeof coding.display === "string") {
                pointers.push({
                  source: "focus",
                  path: codePath.replace(/\.code$/, ".display"),
                  value: coding.display,
                });
              }
              if (sequence.value != null && sequence.path) {
                pointers.push({
                  source: "focus",
                  path: join(itemPath, sequence.path),
                  value: String(sequence.value),
                });
              }
            }
          });
        });
      });
      collectItemDates(item, itemPath, pointers);
    });
  }

  if (typeof focus.created === "string") {
    pointers.push({ source: "focus", path: join(prefix, "created"), value: focus.created });
  }
  if (Array.isArray(focus.preAuthRefPeriod)) {
    focus.preAuthRefPeriod.forEach((period, index) => {
      pushPeriod(pointers, period, join(prefix, `preAuthRefPeriod[${index}]`), "focus");
    });
  }

  const claimHit = locateClaim(resource, related);
  if (claimHit && typeof claimHit.resource.created === "string") {
    pointers.push({
      source: claimHit.source,
      path: join(claimHit.prefix, "created"),
      value: claimHit.resource.created,
      relatedId: claimHit.relatedId,
    });
  }

  const reasonTokens = collectReasonTokens(focus);
  const errorPointers = collectErrorPointers(focus, prefix);
  pointers.push(...errorPointers.pointers);

  return { status, reviews, reasonTokens, pointers: dedupePointers(pointers) };
}

function collectItemDates(item: Rec, itemPath: string, pointers: OraclePointer[]) {
  const extensions = Array.isArray(item.extension) ? item.extension : [];
  extensions.forEach((extension, index) => {
    if (!isRec(extension)) return;
    const url = String(extension.url ?? "");
    const base = join(itemPath, `extension[${index}]`);
    if (url.includes("itemPreAuthIssueDate") && typeof extension.valueDate === "string") {
      pointers.push({ source: "focus", path: `${base}.valueDate`, value: extension.valueDate });
    }
    if (url.includes("dischargeDate") && typeof extension.valueDate === "string") {
      pointers.push({ source: "focus", path: `${base}.valueDate`, value: extension.valueDate });
    }
    if (
      (url.includes("itemPreAuthPeriod") || url.includes("itemRequestedServiceDate") || url.includes("admissionDates")) &&
      isRec(extension.valuePeriod)
    ) {
      pushPeriod(pointers, extension.valuePeriod, `${base}.valuePeriod`, "focus");
    }
  });
}

function collectErrorPointers(focus: Rec, prefix: string): { pointers: OraclePointer[] } {
  const pointers: OraclePointer[] = [];
  const errors = Array.isArray(focus.error) ? focus.error : [];
  errors.forEach((error, index) => {
    if (!isRec(error)) return;
    const codings = isRec(error.code) && Array.isArray(error.code.coding) ? error.code.coding : [];
    codings.forEach((coding, codingIndex) => {
      if (isRec(coding) && typeof coding.code === "string") {
        pointers.push({
          source: "focus",
          path: join(prefix, `error[${index}].code.coding[${codingIndex}].code`),
          value: coding.code,
        });
      }
    });
    const extensions = Array.isArray(error.extension) ? error.extension : [];
    extensions.forEach((extension, extensionIndex) => {
      if (!isRec(extension)) return;
      const url = String(extension.url ?? "");
      const base = join(prefix, `error[${index}].extension[${extensionIndex}]`);
      if (url.includes("errorFollowupAction")) {
        const coding = firstCoding(extension.valueCodeableConcept);
        if (coding && typeof coding.code === "string") {
          pointers.push({
            source: "focus",
            path: `${base}.valueCodeableConcept.coding[0].code`,
            value: coding.code,
          });
        }
      }
      if (url.includes("errorPath") && typeof extension.valueString === "string") {
        pointers.push({ source: "focus", path: `${base}.valueString`, value: extension.valueString });
      }
      if (url.includes("errorElement")) {
        const children = Array.isArray(extension.extension) ? extension.extension : [];
        children.forEach((child, childIndex) => {
          if (isRec(child) && typeof child.valueString === "string") {
            pointers.push({
              source: "focus",
              path: `${base}.extension[${childIndex}].valueString`,
              value: child.valueString,
            });
          }
        });
      }
    });
  });
  return { pointers };
}

function collectReasonTokens(focus: Rec): string[] {
  const tokens: string[] = [];
  const notes = Array.isArray(focus.processNote) ? focus.processNote : [];
  for (const note of notes) {
    if (isRec(note) && typeof note.text === "string" && note.text.trim()) tokens.push(note.text.trim());
  }
  for (const key of ["item", "addItem"] as const) {
    const items = Array.isArray(focus[key]) ? focus[key] : [];
    for (const item of items) {
      if (!isRec(item)) continue;
      const adjudications = Array.isArray(item.adjudication) ? item.adjudication : [];
      for (const adjudication of adjudications) {
        if (!isRec(adjudication)) continue;
        const reasonCoding = firstCoding(adjudication.reason);
        if (reasonCoding && typeof reasonCoding.code === "string") tokens.push(reasonCoding.code);
        if (isRec(adjudication.reason) && typeof adjudication.reason.text === "string") {
          tokens.push(adjudication.reason.text);
        }
        const extensions = Array.isArray(adjudication.extension) ? adjudication.extension : [];
        for (const extension of extensions) {
          if (!isRec(extension) || !String(extension.url ?? "").includes("reviewAction")) continue;
          const children = Array.isArray(extension.extension) ? extension.extension : [];
          for (const child of children) {
            if (!isRec(child) || !/reason/i.test(String(child.url ?? ""))) continue;
            if (typeof child.valueString === "string" && child.valueString.trim()) tokens.push(child.valueString.trim());
            const coding = firstCoding(child.valueCodeableConcept);
            if (coding?.code) tokens.push(String(coding.code));
            if (typeof coding?.display === "string") tokens.push(coding.display);
          }
        }
      }
    }
  }
  return tokens;
}

function locateClaim(
  resource: Rec,
  related: Rec[],
): { resource: Rec; prefix: string; source: "focus" | "related"; relatedId?: string } | null {
  const { focus } = focusOf(resource);
  const request = isRec(focus.request) && typeof focus.request.reference === "string" ? focus.request.reference : null;
  if (resource.resourceType === "Bundle" && Array.isArray(resource.entry)) {
    for (let index = 0; index < resource.entry.length; index += 1) {
      const entry = resource.entry[index];
      if (!isRec(entry) || !isRec(entry.resource) || entry.resource.resourceType !== "Claim") continue;
      const id = typeof entry.resource.id === "string" ? `Claim/${entry.resource.id}` : null;
      if (request && id && request !== id) continue;
      return { resource: entry.resource, prefix: `entry[${index}].resource`, source: "focus" };
    }
  }
  const match = related.find((entry) => entry.resourceType === "Claim" && (!request || request === `Claim/${String(entry.id)}`));
  if (!match) return null;
  return {
    resource: match,
    prefix: "",
    source: "related",
    relatedId: `${String(match.resourceType)}/${String(match.id)}`,
  };
}

function readSequences(item: Rec): { value: number; path: string }[] {
  if (typeof item.itemSequence === "number") return [{ value: item.itemSequence, path: "itemSequence" }];
  if (Array.isArray(item.itemSequence)) {
    return item.itemSequence.flatMap((value, index) =>
      typeof value === "number" ? [{ value, path: `itemSequence[${index}]` }] : [],
    );
  }
  if (typeof item.sequence === "number") return [{ value: item.sequence, path: "sequence" }];
  return [];
}

function pushPeriod(pointers: OraclePointer[], period: unknown, path: string, source: "focus" | "related") {
  if (!isRec(period)) return;
  if (typeof period.start === "string") pointers.push({ source, path: `${path}.start`, value: period.start });
  if (typeof period.end === "string") pointers.push({ source, path: `${path}.end`, value: period.end });
}

function focusOf(resource: Rec): { focus: Rec; prefix: string } {
  if (resource.resourceType !== "Bundle" || !Array.isArray(resource.entry)) return { focus: resource, prefix: "" };
  for (let index = 0; index < resource.entry.length; index += 1) {
    const entry = resource.entry[index];
    if (!isRec(entry) || !isRec(entry.resource)) continue;
    if (entry.resource.resourceType === "ClaimResponse" || entry.resource.resourceType === "ExplanationOfBenefit") {
      return { focus: entry.resource, prefix: `entry[${index}].resource` };
    }
  }
  return { focus: resource, prefix: "" };
}

function firstCoding(value: unknown): Rec | null {
  if (!isRec(value) || !Array.isArray(value.coding)) return null;
  return isRec(value.coding[0]) ? value.coding[0] : null;
}

function dedupePointers(pointers: OraclePointer[]): OraclePointer[] {
  const seen = new Set<string>();
  const unique: OraclePointer[] = [];
  for (const pointer of pointers) {
    const key = `${pointer.source}|${pointer.relatedId ?? ""}|${pointer.path}|${pointer.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(pointer);
  }
  return unique;
}

function join(base: string, rest: string): string {
  if (!base) return rest;
  if (rest.startsWith("[")) return `${base}${rest}`;
  return `${base}.${rest}`;
}

function isRec(value: unknown): value is Rec {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
