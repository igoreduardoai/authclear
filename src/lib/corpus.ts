import { createHash } from "node:crypto";
import { addHours } from "./deadline";
import type { Decision } from "./types";

export const CORPUS_SEED = "authclear-2026-11-19";
export const CORPUS_SIZE = 120;
const PDEX_COUNT = 15;

export interface GoldRecord {
  id: string;
  split: "dev" | "holdout";
  shape: "pas" | "pdex";
  reviewCode: string;
  reviewDisplay: string;
  outcome: string;
  reason: string | null;
  service: string;
  serviceLocation: "extension" | "productOrService";
  units: number;
  validityStart: string | null;
  validityEnd: string | null;
  urgent: boolean;
  receipt: string;
  pharmacy: boolean;
  patientLabel: string;
  expectedDecision: Decision;
}

export interface CorpusCase {
  gold: GoldRecord;
  resource: Record<string, unknown>;
}

const REVIEW = [
  { code: "A1", display: "Certified in total", decision: "approved" as const },
  { code: "A3", display: "Not Certified", decision: "denied" as const },
  { code: "A4", display: "Pending", decision: "pended" as const },
];

export function splitFor(id: string): "dev" | "holdout" {
  const hex = createHash("sha256").update(`${CORPUS_SEED}|${id}`).digest("hex");
  const bucket = parseInt(hex.slice(0, 8), 16) % 100;
  return bucket < 30 ? "holdout" : "dev";
}

export function generateCorpus(size = CORPUS_SIZE): CorpusCase[] {
  const cases: CorpusCase[] = [];
  for (let index = 0; index < size; index += 1) {
    const id = `variant-${String(index + 1).padStart(4, "0")}`;
    const pdex = index >= size - PDEX_COUNT;
    const review = index % 10 === 0
      ? { code: "ZZ", display: "Unlisted example code", decision: "unknown" as const }
      : REVIEW[index % REVIEW.length];
    const receipt = addHours("2026-04-01T15:00:00Z", index);
    const reason =
      review.decision === "denied" && index % 3 !== 0 ? "Example documentation was not attached" : null;
    const service = `Example service ${index % 7}`;
    const units = (index % 5) + 1;
    const urgent = index % 2 === 0;
    const pharmacy = review.decision === "pended" && index % 11 === 0;
    const validity = review.decision === "approved";
    const gold: GoldRecord = {
      id,
      split: splitFor(id),
      shape: pdex ? "pdex" : "pas",
      reviewCode: pdex ? "A1" : review.code,
      reviewDisplay: pdex ? "Certified in total" : review.display,
      outcome: pdex ? "queued" : "complete",
      reason: pdex ? null : reason,
      service,
      serviceLocation: !pdex && index % 2 === 0 ? "extension" : "productOrService",
      units,
      validityStart: validity || pdex ? "2026-05-01" : null,
      validityEnd: validity || pdex ? "2026-05-31" : null,
      urgent,
      receipt,
      pharmacy: pdex ? false : pharmacy,
      patientLabel: `Member Synthetic${String(index + 1).padStart(4, "0")}`,
      expectedDecision: pdex ? "approved" : review.decision,
    };
    if (pdex) {
      gold.serviceLocation = "productOrService";
    }
    cases.push({ gold, resource: pdex ? pdexBundle(gold) : pasBundle(gold) });
  }
  return cases;
}

function pasBundle(gold: GoldRecord): Record<string, unknown> {
  const responseCreated = addHours(gold.receipt, 1);
  const serviceExtension =
    gold.serviceLocation === "extension"
      ? [
          {
            url: "productOrServiceCode",
            valueCodeableConcept: { coding: [{ display: gold.service }] },
          },
        ]
      : [];
  const itemExtensions = [
    {
      url: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-itemAuthorizedDetail",
      extension: [{ url: "quantity", valueQuantity: { value: gold.units } }, ...serviceExtension],
    },
    ...(gold.validityStart
      ? [
          {
            url: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-itemPreAuthPeriod",
            valuePeriod: { start: gold.validityStart, end: gold.validityEnd },
          },
        ]
      : []),
  ];
  const reasonExt = gold.reason
    ? [{ url: "http://example.org/authclear-synthetic-reason", valueString: gold.reason }]
    : [];
  return {
    resourceType: "Bundle",
    id: gold.id,
    type: "collection",
    entry: [
      {
        resource: {
          resourceType: "ClaimResponse",
          id: `${gold.id}-response`,
          status: "active",
          use: "preauthorization",
          outcome: gold.outcome,
          created: responseCreated,
          type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/claim-type", code: gold.pharmacy ? "pharmacy" : "professional" }] },
          patient: { reference: `Patient/${gold.id}-patient` },
          insurer: { reference: `Organization/${gold.id}-plan` },
          request: { reference: `Claim/${gold.id}-claim` },
          identifier: [{ system: "http://example.org/authclear-synthetic", value: `SYN${gold.id}` }],
          item: [
            {
              itemSequence: 1,
              ...(gold.serviceLocation === "productOrService"
                ? { productOrService: { coding: [{ display: gold.service }] } }
                : {}),
              extension: itemExtensions,
              adjudication: [
                {
                  extension: [
                    {
                      url: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-reviewAction",
                      extension: [
                        { url: "number", valueString: `SYN${gold.id}` },
                        {
                          url: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-reviewActionCode",
                          valueCodeableConcept: {
                            coding: [
                              {
                                system: "https://codesystem.x12.org/005010/306",
                                code: gold.reviewCode,
                                display: gold.reviewDisplay,
                              },
                            ],
                          },
                        },
                        ...reasonExt,
                      ],
                    },
                  ],
                  category: { coding: [{ code: "submitted" }] },
                },
              ],
            },
          ],
        },
      },
      {
        resource: {
          resourceType: "Claim",
          id: `${gold.id}-claim`,
          status: "active",
          use: "preauthorization",
          created: gold.receipt,
          type: { coding: [{ code: gold.pharmacy ? "pharmacy" : "professional" }] },
          patient: { reference: `Patient/${gold.id}-patient` },
          provider: { display: "Synthetic Example Clinic" },
          priority: { coding: [{ code: "normal" }] },
          insurance: [{ sequence: 1, focal: true, coverage: { display: "Synthetic Example Coverage" } }],
          ...(gold.urgent
            ? {
                extension: [
                  {
                    url: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-levelOfServiceCode",
                    valueCodeableConcept: {
                      coding: [{ system: "https://codesystem.x12.org/005010/1338", code: "U", display: "Urgent" }],
                    },
                  },
                ],
              }
            : {}),
        },
      },
      { resource: person(gold) },
      { resource: plan(gold) },
    ],
  };
}

function pdexBundle(gold: GoldRecord): Record<string, unknown> {
  return {
    resourceType: "Bundle",
    id: gold.id,
    type: "collection",
    entry: [
      {
        resource: {
          resourceType: "ExplanationOfBenefit",
          id: `${gold.id}-eob`,
          meta: {
            profile: ["http://hl7.org/fhir/us/davinci-pdex/StructureDefinition/pdex-priorauthorization"],
          },
          status: "active",
          use: "preauthorization",
          outcome: "queued",
          created: addHours(gold.receipt, 1),
          type: { coding: [{ code: "institutional" }] },
          patient: { reference: `Patient/${gold.id}-patient` },
          insurer: { reference: `Organization/${gold.id}-plan`, display: "Synthetic Example Plan" },
          provider: { display: "Synthetic Example Clinic" },
          preAuthRefPeriod: [{ start: gold.validityStart, end: gold.validityEnd }],
          ...(gold.urgent
            ? {
                extension: [
                  {
                    url: "http://hl7.org/fhir/us/davinci-pdex/StructureDefinition/extension-levelOfServiceCode",
                    valueCodeableConcept: {
                      coding: [{ system: "https://codesystem.x12.org/005010/1338", code: "U", display: "Urgent" }],
                    },
                  },
                ],
              }
            : {}),
          item: [
            {
              sequence: 1,
              productOrService: { coding: [{ display: gold.service }] },
              adjudication: [
                {
                  extension: [
                    {
                      url: "http://hl7.org/fhir/us/davinci-pdex/StructureDefinition/extension-reviewAction",
                      extension: [
                        { url: "number", valueString: `SYN${gold.id}` },
                        {
                          url: "http://hl7.org/fhir/us/davinci-pdex/StructureDefinition/extension-reviewActionCode",
                          valueCodeableConcept: {
                            coding: [
                              {
                                system: "https://codesystem.x12.org/005010/306",
                                code: "A1",
                                display: "Certified in total",
                              },
                            ],
                          },
                        },
                      ],
                    },
                  ],
                  category: { coding: [{ code: "submitted" }] },
                },
              ],
            },
          ],
          total: [
            {
              extension: [
                {
                  url: "http://hl7.org/fhir/us/davinci-pdex/StructureDefinition/PriorAuthorizationUtilization",
                  valueQuantity: { value: gold.units },
                },
              ],
              category: { coding: [{ code: "eligible" }] },
            },
          ],
        },
      },
      {
        resource: {
          resourceType: "Claim",
          id: `${gold.id}-claim`,
          status: "active",
          use: "preauthorization",
          created: gold.receipt,
          type: { coding: [{ code: "institutional" }] },
          patient: { reference: `Patient/${gold.id}-patient` },
          provider: { display: "Synthetic Example Clinic" },
          priority: { coding: [{ code: "normal" }] },
          insurance: [{ sequence: 1, focal: true, coverage: { display: "Synthetic Example Coverage" } }],
        },
      },
      { resource: person(gold) },
      { resource: plan(gold) },
    ],
  };
}

function person(gold: GoldRecord): Record<string, unknown> {
  const family = gold.patientLabel.replace("Member ", "");
  return {
    resourceType: "Patient",
    id: `${gold.id}-patient`,
    name: [{ given: ["Member"], family }],
  };
}

function plan(gold: GoldRecord): Record<string, unknown> {
  return {
    resourceType: "Organization",
    id: `${gold.id}-plan`,
    name: "Synthetic Example Plan",
  };
}
