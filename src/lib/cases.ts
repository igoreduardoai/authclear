import additional from "../../fixtures/official/pas/ClaimResponse-PractitionerRequestorAdditionalContentResponseExample.json";
import claim from "../../fixtures/official/pas/Claim-ReferralAuthorizationExample.json";
import errorBundle from "../../fixtures/official/pas/Bundle-ErrorResponseBundleExample.json";
import inquiry from "../../fixtures/official/pas/ClaimResponse-PASClaimInquiryResponseExample.json";
import approved from "../../fixtures/official/pas/Bundle-ReferralAuthorizationResponseBundleExample.json";
import pending from "../../fixtures/official/pas/Bundle-ReferralPendingAuthorizationResponseBundleExample.json";
import rejection from "../../fixtures/official/pas/Bundle-RejectionResponseBundleExample.json";
import coverage from "../../fixtures/official/pdex/Coverage-Coverage1.json";
import pdex from "../../fixtures/official/pdex/ExplanationOfBenefit-PDexPriorAuth1.json";
import payer from "../../fixtures/official/pdex/Organization-Payer1.json";
import patient from "../../fixtures/official/pdex/Patient-1.json";

export interface RelatedResource {
  relatedId: string;
  label: string;
  resource: unknown;
}

export interface DemoCase {
  id: string;
  tab: string;
  group: "primary" | "more";
  sourceLabel: string;
  sourceUrl: string;
  joinNote: string | null;
  resource: unknown;
  related: RelatedResource[];
  validatorFile: string;
}

const pasClaim: RelatedResource = {
  relatedId: "Claim/ReferralAuthorizationExample",
  label: "Claim/ReferralAuthorizationExample from PAS 2.2.1",
  resource: claim,
};

export const CASES: DemoCase[] = [
  {
    id: "denied",
    tab: "Denied",
    group: "primary",
    sourceLabel: "HL7 Da Vinci PAS 2.2.1 · RejectionResponseBundleExample",
    sourceUrl: "https://hl7.org/fhir/us/davinci-pas/2.2.1/Bundle-RejectionResponseBundleExample.html",
    joinNote: null,
    resource: rejection,
    related: [],
    validatorFile: "Bundle-RejectionResponseBundleExample.json",
  },
  {
    id: "pended",
    tab: "Pending",
    group: "primary",
    sourceLabel: "HL7 Da Vinci PAS 2.2.1 · ReferralPendingAuthorizationResponseBundleExample",
    sourceUrl:
      "https://hl7.org/fhir/us/davinci-pas/2.2.1/Bundle-ReferralPendingAuthorizationResponseBundleExample.html",
    joinNote:
      "This response bundle does not contain the Claim it references. The Claim shown below is the separate PAS 2.2.1 example Claim/ReferralAuthorizationExample.",
    resource: pending,
    related: [pasClaim],
    validatorFile: "Bundle-ReferralPendingAuthorizationResponseBundleExample.json",
  },
  {
    id: "approved",
    tab: "Approved",
    group: "primary",
    sourceLabel: "HL7 Da Vinci PAS 2.2.1 · ReferralAuthorizationResponseBundleExample",
    sourceUrl: "https://hl7.org/fhir/us/davinci-pas/2.2.1/Bundle-ReferralAuthorizationResponseBundleExample.html",
    joinNote:
      "This response bundle does not contain the Claim it references. The Claim shown below is the separate PAS 2.2.1 example Claim/ReferralAuthorizationExample.",
    resource: approved,
    related: [pasClaim],
    validatorFile: "Bundle-ReferralAuthorizationResponseBundleExample.json",
  },
  {
    id: "patient-access",
    tab: "Patient Access",
    group: "primary",
    sourceLabel: "HL7 Da Vinci PDex 2.2.0 · ExplanationOfBenefit/PDexPriorAuth1",
    sourceUrl: "https://hl7.org/fhir/us/davinci-pdex/STU2.2/ExplanationOfBenefit-PDexPriorAuth1.html",
    joinNote:
      "Patient/1 and Organization/Payer1 are separate examples from the same PDex package. They are not inside the ExplanationOfBenefit.",
    resource: pdex,
    related: [
      { relatedId: "Patient/1", label: "Patient/1 from PDex 2.2.0", resource: patient },
      { relatedId: "Organization/Payer1", label: "Organization/Payer1 from PDex 2.2.0", resource: payer },
      { relatedId: "Coverage/Coverage1", label: "Coverage/Coverage1 from PDex 2.2.0", resource: coverage },
    ],
    validatorFile: "ExplanationOfBenefit-PDexPriorAuth1.json",
  },
  {
    id: "error",
    tab: "Submission error",
    group: "primary",
    sourceLabel: "HL7 Da Vinci PAS 2.2.1 · ErrorResponseBundleExample",
    sourceUrl: "https://hl7.org/fhir/us/davinci-pas/2.2.1/Bundle-ErrorResponseBundleExample.html",
    joinNote: null,
    resource: errorBundle,
    related: [],
    validatorFile: "Bundle-ErrorResponseBundleExample.json",
  },
  {
    id: "invalid",
    tab: "Invalid input",
    group: "primary",
    sourceLabel: "AuthClear negative example · not an HL7 resource",
    sourceUrl: "https://hl7.org/fhir/R4/resource.html",
    joinNote: null,
    resource: { hello: "world" },
    related: [],
    validatorFile: "",
  },
  {
    id: "additional",
    tab: "Approved, with service details",
    group: "more",
    sourceLabel: "HL7 Da Vinci PAS 2.2.1 · PractitionerRequestorAdditionalContentResponseExample",
    sourceUrl:
      "https://hl7.org/fhir/us/davinci-pas/2.2.1/ClaimResponse-PractitionerRequestorAdditionalContentResponseExample.html",
    joinNote: null,
    resource: additional,
    related: [],
    validatorFile: "ClaimResponse-PractitionerRequestorAdditionalContentResponseExample.json",
  },
  {
    id: "inquiry",
    tab: "Inquiry response",
    group: "more",
    sourceLabel: "HL7 Da Vinci PAS 2.2.1 · PASClaimInquiryResponseExample",
    sourceUrl: "https://hl7.org/fhir/us/davinci-pas/2.2.1/ClaimResponse-PASClaimInquiryResponseExample.html",
    joinNote: null,
    resource: inquiry,
    related: [],
    validatorFile: "ClaimResponse-PASClaimInquiryResponseExample.json",
  },
];

export function caseById(id: string): DemoCase {
  return CASES.find((entry) => entry.id === id) ?? CASES[0];
}
