import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const jar = process.env.FHIR_VALIDATOR_JAR ?? "/tmp/fhir-validator/validator_cli.jar";
const pas = process.env.PAS_IG ?? "/tmp/fhir-src/pas.tgz";
const pdex = process.env.PDEX_IG ?? "/tmp/fhir-src/pdex.tgz";
const files = [
  "fixtures/official/pas/Bundle-RejectionResponseBundleExample.json",
  "fixtures/official/pas/Bundle-ReferralPendingAuthorizationResponseBundleExample.json",
  "fixtures/official/pas/Bundle-ReferralAuthorizationResponseBundleExample.json",
  "fixtures/official/pas/Bundle-ErrorResponseBundleExample.json",
  "fixtures/official/pas/ClaimResponse-PractitionerRequestorAdditionalContentResponseExample.json",
  "fixtures/official/pas/ClaimResponse-PASClaimInquiryResponseExample.json",
  "fixtures/official/pas/Claim-ReferralAuthorizationExample.json",
  "fixtures/official/pdex/ExplanationOfBenefit-PDexPriorAuth1.json",
  "fixtures/official/pdex/Patient-1.json",
  "fixtures/official/pdex/Coverage-Coverage1.json",
  "fixtures/official/pdex/Organization-Payer1.json",
  "validation/sample-task.json",
];

mkdirSync("validation/outcomes", { recursive: true });
const versionProbe = spawnSync("java", ["-jar", jar, "-version", "4.0.1", "-help"], { encoding: "utf8" });
const versionLine =
  `${versionProbe.stdout}\n${versionProbe.stderr}`.split("\n").find((line) => /FHIR Validation tool/i.test(line)) ??
  "";

const results = [];
for (const file of files) {
  const base = file.split("/").pop().replace(".json", "");
  const out = `validation/outcomes/${base}.outcome.json`;
  const args = [
    "-jar",
    jar,
    file,
    "-version",
    "4.0.1",
    "-ig",
    pas,
    "-ig",
    pdex,
    "-allow-example-urls",
    "-output",
    out,
  ];
  const run = spawnSync("java", args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  let errors = null;
  let warnings = null;
  let fatals = null;
  let information = null;
  try {
    const outcome = JSON.parse(readFileSync(out, "utf8"));
    const issues = Array.isArray(outcome.issue) ? outcome.issue : [];
    fatals = issues.filter((issue) => issue.severity === "fatal").length;
    errors = issues.filter((issue) => issue.severity === "error").length;
    warnings = issues.filter((issue) => issue.severity === "warning").length;
    information = issues.filter((issue) => issue.severity === "information").length;
  } catch {
    errors = null;
  }
  results.push({ file, exitCode: run.status, fatals, errors, warnings, information, outcome: out });
  console.log(file, "exit", run.status, "errors", errors, "warnings", warnings);
}

const summary = {
  ran: true,
  version: versionLine.trim(),
  validatorJar: "https://github.com/hapifhir/org.hl7.fhir.core/releases/latest/download/validator_cli.jar",
  command:
    "java -jar validator_cli.jar <file> -version 4.0.1 -ig <pas 2.2.1 package> -ig <pdex 2.2.0 package> -allow-example-urls",
  note: "Local HL7 FHIR Validator CLI  against FHIR R4 4.0.1, using the default terminology server (tx.fhir.org) and -allow-example-urls. That flag is on because the published HL7 examples use http://example.org identifiers; without it the official denial bundle reports those identifiers as errors. An earlier run with -tx n/a reported ISO 4217 USD as an error on three files because the currency system was not available offline; those counts are not the ones in this file. X12 code systems are not public, so those codes remain warnings. This is not an HL7 certification.",
  results,
};
writeFileSync("validation/summary.json", JSON.stringify(summary, null, 2));
