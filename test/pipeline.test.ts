import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { nextAction } from "../src/lib/action";
import { baselineRead } from "../src/lib/baseline";
import { generateCorpus } from "../src/lib/corpus";
import { addHours, deadlineFor } from "../src/lib/deadline";
import { buildNotice } from "../src/lib/explain";
import { extract } from "../src/lib/extract";
import { pointerMismatches, type RelatedDoc } from "../src/lib/pointers";
import { fleschKincaidGrade, stripHtml } from "../src/lib/readability";
import { buildExports } from "../src/lib/task";

const load = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const rejection = load("fixtures/official/pas/Bundle-RejectionResponseBundleExample.json");
const pending = load("fixtures/official/pas/Bundle-ReferralPendingAuthorizationResponseBundleExample.json");
const approved = load("fixtures/official/pas/Bundle-ReferralAuthorizationResponseBundleExample.json");
const errorBundle = load("fixtures/official/pas/Bundle-ErrorResponseBundleExample.json");
const claim = load("fixtures/official/pas/Claim-ReferralAuthorizationExample.json");
const pdex = load("fixtures/official/pdex/ExplanationOfBenefit-PDexPriorAuth1.json");
const pdexPatient = load("fixtures/official/pdex/Patient-1.json");
const pdexOrg = load("fixtures/official/pdex/Organization-Payer1.json");
const additional = load(
  "fixtures/official/pas/ClaimResponse-PractitionerRequestorAdditionalContentResponseExample.json",
);

const claimDoc: RelatedDoc = { relatedId: "Claim/ReferralAuthorizationExample", resource: claim };

describe("decision clock", () => {
  it("adds 72 hours and keeps the original offset", () => {
    expect(addHours("2005-05-02T11:01:00+05:00", 72)).toBe("2005-05-05T11:01:00+05:00");
    expect(addHours("2005-05-02T11:01:00+05:00", 168)).toBe("2005-05-09T11:01:00+05:00");
  });

  it("sets a 72-hour maximum for the official urgent pending example only when the referenced claim is attached", () => {
    const joined = extract(pending, { related: [claim] });
    const clock = deadlineFor(joined);
    expect(clock.ruleId).toBe("cms-0057-f-expedited-72h");
    expect(clock.due).toBe("2005-05-05T11:01:00+05:00");
    expect(clock.caveatEn).toContain("QHP");
    expect(clock.caveatEn).toContain("does not apply to drugs");

    const alone = deadlineFor(extract(pending));
    expect(alone.ruleId).toBe("insufficient-data");
    expect(alone.due).toBeNull();
  });

  it("does not invent an appeal deadline for a denial", () => {
    const clock = deadlineFor(extract(rejection));
    expect(clock.due).toBeNull();
    expect(clock.ruleId).toBe("not-applicable");
  });
});

describe("member notice", () => {
  it("keeps every denial sentence tied to a value in the published bundle", () => {
    const extraction = extract(rejection);
    const notice = buildNotice(extraction, "en");
    expect(notice.headline).toBe("Not Certified");
    expect(notice.kicker).toBe("Grouped as a denial");
    expect(pointerMismatches(rejection, [], notice.sentences)).toEqual([]);
    const spanish = buildNotice(extraction, "es");
    expect(pointerMismatches(rejection, [], spanish.sentences)).toEqual([]);
    expect(spanish.sentences.map((sentence) => sentence.pointers.map((pointer) => pointer.value))).toEqual(
      notice.sentences.map((sentence) => sentence.pointers.map((pointer) => pointer.value)),
    );
  });

  it("points at the referenced claim, not the response bundle, for the pending example's urgency", () => {
    const extraction = extract(pending, { related: [claim] });
    const notice = buildNotice(extraction, "en");
    expect(pointerMismatches(pending, [claimDoc], notice.sentences)).toEqual([]);
    expect(notice.sentences.some((sentence) => sentence.text.includes("referenced Claim example"))).toBe(true);
  });

  it("reads the Patient Access example as certified while showing that outcome is queued", () => {
    const extraction = extract(pdex, { related: [pdexPatient, pdexOrg] });
    expect(extraction.decision).toBe("approved");
    expect(extraction.outcome?.value).toBe("queued");
    expect(extraction.service?.text).toContain("Behavior Only");
    expect(extraction.patient.label).toBe("Johnny Appleseed");
    const notice = buildNotice(extraction, "en");
    expect(notice.sentences.some((sentence) => sentence.id === "outcome-conflict")).toBe(true);
    const related = [
      { relatedId: "Patient/1", resource: pdexPatient },
      { relatedId: "Organization/Payer1", resource: pdexOrg },
    ];
    expect(pointerMismatches(pdex, related, notice.sentences)).toEqual([]);
  });

  it("states error codes without translating them", () => {
    const extraction = extract(errorBundle);
    expect(extraction.decision).toBe("error");
    expect(extraction.errors.map((error) => error.code)).toEqual(["04", "T4"]);
    const notice = buildNotice(extraction, "en");
    expect(notice.sentences.map((sentence) => sentence.text).join(" ")).toContain("error code 04");
    expect(notice.sentences.map((sentence) => sentence.text).join(" ")).toContain("error code T4");
    expect(pointerMismatches(errorBundle, [], notice.sentences)).toEqual([]);
  });
});

describe("workflow export", () => {
  it("exports a Task whose due time is the pending decision maximum, and no due time for a denial", () => {
    const pendingExtraction = extract(pending, { related: [claim] });
    const pendingExports = buildExports(
      pendingExtraction,
      nextAction(pendingExtraction),
      buildNotice(pendingExtraction, "en"),
    );
    expect(pendingExports.task.resourceType).toBe("Task");
    expect(pendingExports.task.status).toBe("requested");
    expect(pendingExports.task.intent).toBe("order");
    expect(pendingExports.task.focus).toEqual({
      reference: "ClaimResponse/PractitionerRequestorPendingResponseExample",
    });
    expect(pendingExports.task.restriction).toEqual({ period: { end: "2005-05-05T11:01:00+05:00" } });
    expect(pendingExports.csv.split("\n")[0]).toBe(
      "member_ref,auth_id,decision,action,owner,due,source_reference",
    );
    expect(pendingExports.csv).toContain("track-pending-decision");
    expect(pendingExports.dryRun).toMatchObject({ channel: "dry-run", delivered: false });
    expect(pendingExports.letterHtml).toContain("no real members");

    const denial = extract(rejection);
    const denialExports = buildExports(denial, nextAction(denial), buildNotice(denial, "en"));
    expect(denialExports.task.restriction).toBeUndefined();
    expect(denialExports.task.description).toContain("Do not invent");
    expect(denialExports.letterHtml).not.toContain("Americanas");
    expect(denialExports.letterHtml).toContain("Not Certified");
  });
});

describe("baseline and synthetic corpus", () => {
  it("misreads the official denial and pending responses when it trusts outcome alone", () => {
    expect(baselineRead(rejection).decision).toBe("approved");
    expect(extract(rejection).decision).toBe("denied");
    expect(baselineRead(pending).decision).toBe("approved");
    expect(extract(pending).decision).toBe("pended");
    expect(baselineRead(pdex).decision).toBe("pended");
    expect(extract(pdex).decision).toBe("approved");
    expect(baselineRead(approved).decision).toBe("approved");
    expect(baselineRead(errorBundle).decision).toBe("error");
  });

  it("reads back every generated field, including the frozen holdout", () => {
    const corpus = generateCorpus();
    expect(corpus).toHaveLength(120);
    const holdout = corpus.filter((entry) => entry.gold.split === "holdout");
    expect(holdout.length).toBeGreaterThan(25);
    expect(holdout.length).toBeLessThan(50);
    for (const entry of corpus) {
      const extraction = extract(entry.resource);
      expect(extraction.ok, entry.gold.id).toBe(true);
      expect(extraction.decision, entry.gold.id).toBe(entry.gold.expectedDecision);
      expect(extraction.reviewCodes[0]?.code, entry.gold.id).toBe(entry.gold.reviewCode);
      expect(extraction.service?.text, entry.gold.id).toBe(entry.gold.service);
      expect(extraction.units?.text, entry.gold.id).toBe(String(entry.gold.units));
      expect(extraction.validity?.start ?? null, entry.gold.id).toBe(entry.gold.validityStart);
      expect(extraction.validity?.end ?? null, entry.gold.id).toBe(entry.gold.validityEnd);
      expect(extraction.receipt?.value, entry.gold.id).toBe(entry.gold.receipt);
      expect(Boolean(extraction.urgent), entry.gold.id).toBe(entry.gold.urgent);
      expect(extraction.drugsExcluded, entry.gold.id).toBe(entry.gold.pharmacy);
      expect(extraction.reasons[0]?.text ?? null, entry.gold.id).toBe(entry.gold.reason);
      expect(extraction.patient.label, entry.gold.id).toBe(entry.gold.patientLabel);
      const action = nextAction(extraction);
      const due = action.deadline.due;
      if (entry.gold.expectedDecision === "pended" && !entry.gold.pharmacy) {
        expect(due, entry.gold.id).toBe(addHours(entry.gold.receipt, entry.gold.urgent ? 72 : 168));
      } else {
        expect(due, entry.gold.id).toBeNull();
      }
      for (const lang of ["en", "es"] as const) {
        const notice = buildNotice(extraction, lang);
        expect(pointerMismatches(entry.resource, [], notice.sentences), `${entry.gold.id} ${lang}`).toEqual([]);
      }
    }
  });

  it("blocks input that is not a prior-authorization resource", () => {
    const extraction = extract({ hello: "world" });
    expect(extraction.ok).toBe(false);
    expect(extraction.decision).toBe("unknown");
    expect(nextAction(extraction).type).toBe("fix-unreadable-input");
  });

  it("does not collapse two different review actions into one decision", () => {
    const mixed = {
      resourceType: "ClaimResponse",
      id: "mixed-example",
      status: "active",
      use: "preauthorization",
      outcome: "complete",
      created: "2026-01-01T00:00:00Z",
      patient: { reference: "Patient/example" },
      insurer: { display: "Synthetic Example Plan" },
      type: { coding: [{ code: "professional" }] },
      item: [
        { itemSequence: 1, adjudication: [review("A1", "Certified in total")] },
        { itemSequence: 2, adjudication: [review("A3", "Not Certified")] },
      ],
    };
    const extraction = extract(mixed);
    expect(extraction.decision).toBe("mixed");
    expect(nextAction(extraction).type).toBe("review-each-item");
    expect(pointerMismatches(mixed, [], buildNotice(extraction, "en").sentences)).toEqual([]);
  });
});

describe("readability", () => {
  it("scores the English denial notice and the published narrative with the same library", () => {
    const notice = buildNotice(extract(rejection), "en");
    const grade = fleschKincaidGrade(notice.sentences.map((sentence) => sentence.text).join(" "));
    const narrative = stripHtml(rejection.entry[0].resource.text.div as string);
    const narrativeGrade = fleschKincaidGrade(narrative);
    expect(grade).not.toBeNull();
    expect(narrativeGrade).not.toBeNull();
    expect(grade!).toBeLessThan(narrativeGrade!);
    expect(grade!).toBeLessThanOrEqual(8);
  });
});

function review(code: string, display: string) {
  return {
    extension: [
      {
        url: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-reviewAction",
        extension: [
          {
            url: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-reviewActionCode",
            valueCodeableConcept: { coding: [{ code, display }] },
          },
        ],
      },
    ],
    category: { coding: [{ code: "submitted" }] },
  };
}

void additional;
