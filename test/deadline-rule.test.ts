import { describe, expect, it } from "vitest";
import { addHours, deadlineFor } from "../src/lib/deadline";
import { extract } from "../src/lib/extract";

describe("CMS-0057-F decision clock", () => {
  it("keeps the clock time in the FAQ's 72-hour example", () => {
    const sunday = "2026-11-15T01:00:00Z";
    const wednesday = addHours(sunday, 72);
    expect(wednesday).toBe("2026-11-18T01:00:00Z");
    expect(new Date(sunday).getUTCDay()).toBe(0);
    expect(new Date(wednesday).getUTCDay()).toBe(3);
  });

  it("states only the deadline words CMS published, and labels 168 hours as this demo's reading", () => {
    const claim = {
      resourceType: "Claim",
      id: "standard-request",
      status: "active",
      use: "preauthorization",
      created: "2026-11-16T15:00:00+05:00",
    };
    const response = {
      resourceType: "ClaimResponse",
      id: "standard-response",
      status: "active",
      use: "preauthorization",
      outcome: "complete",
      created: "2026-11-16T16:00:00+05:00",
      patient: { reference: "Patient/example" },
      insurer: { display: "Synthetic Example Plan" },
      type: { coding: [{ code: "professional" }] },
      request: { reference: "Claim/standard-request" },
      item: [
        {
          itemSequence: 1,
          adjudication: [
            {
              extension: [
                {
                  url: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-reviewAction",
                  extension: [
                    {
                      url: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-reviewActionCode",
                      valueCodeableConcept: { coding: [{ code: "A4", display: "Pending" }] },
                    },
                  ],
                },
              ],
              category: { coding: [{ code: "submitted" }] },
            },
          ],
        },
      ],
    };
    const clock = deadlineFor(extract(response, { related: [claim] }));
    expect(clock.ruleId).toBe("cms-0057-f-standard-7-calendar-days");
    expect(clock.due).toBe("2026-11-23T15:00:00+05:00");
    expect(clock.caveatEn).toContain("seven calendar days");
    expect(clock.caveatEn).toContain("calendar time, not business hours");
    expect(clock.caveatEn).toContain("1:00 AM Sunday");
    expect(clock.caveatEn).toContain("1:00 AM Wednesday");
    expect(clock.caveatEn).toContain('does not state the words "168 hours"');
    expect(clock.caveatEn).toContain("does not apply that extension");
    expect(clock.caveatEs).toContain("siete días calendario");
    expect(clock.caveatEs).toContain("168");
  });
});
