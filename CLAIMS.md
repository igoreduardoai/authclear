# Claims

Each product claim used by this prototype, with the public source or the file in this repo that shows it. If a sentence is not in this table, it is not a result this project claims.

There is no pilot, no named clinic using the product, no payer or EHR integration, no revenue, and no letter of intent. The author is Igor Eduardo. There is no postal address in the repo.

| Claim | Proof |
| --- | --- |
| Impacted payers must add prior-authorization data, excluding drugs, to the Patient Access API by January 1, 2027. | [CMS-0057-F fact sheet, January 17, 2024](https://www.cms.gov/newsroom/fact-sheets/cms-interoperability-prior-authorization-final-rule-cms-0057-f) |
| Impacted payers other than QHP issuers on the FFEs must send decisions within 72 hours for an expedited request and seven calendar days for a standard request. The clock starts when the request is received. Some programs allow up to 14 extra calendar days. Drugs are outside this clock. | [CMS timeframe FAQ](https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/frequently-asked-questions/improving-prior-authorization-processes) |
| A specific reason for a denied item or service is required beginning in 2026, separate from the API date. | Same CMS fact sheet, "Provider Notice, Including Denial Reason." |
| In 2023, 16% of insured adults in a KFF survey of 3,605 people said prior approval was denied or delayed in the past year. | [KFF, September 29, 2023](https://www.kff.org/affordable-care-act/consumer-problems-with-prior-authorization-evidence-from-kff-survey/) |
| Whether a PAS response is pended, denied, or successful depends on the review-action code, not on `ClaimResponse.outcome` alone. | [Da Vinci PAS 2.2.1 specification](https://hl7.org/fhir/us/davinci-pas/2.2.1/specification.html) |
| The official denial example is review action `A3` / "Not Certified" with `outcome: complete`. The official pending example is `A4` / "Pending" with `outcome: complete`. The official certified examples in this repo are `A1` / "Certified in total" with `outcome: complete`. | Files under `fixtures/official/pas/`, copied from [PAS 2.2.1 package](https://hl7.org/fhir/us/davinci-pas/2.2.1/package.tgz). Checksums in `fixtures/official/SHA256SUMS`. |
| The PDex Patient Access example `PDexPriorAuth1` is review action `A1` / "Certified in total" with `outcome: queued`. | `fixtures/official/pdex/ExplanationOfBenefit-PDexPriorAuth1.json` from [PDex 2.2.0 package](https://hl7.org/fhir/us/davinci-pdex/STU2.2/package.tgz). |
| AuthClear's decision on the seven official examples matches the review-action reading above in 7/7 cases. A reader that trusts `outcome` alone matches in 4/7. | `npm test` (`test/pipeline.test.ts`, `test/eval.test.ts`) and [eval/RESULTS.md](eval/RESULTS.md) |
| On 31 synthetic holdout cases, field reads matched the values the generator wrote. The outcome-only baseline's decision accuracy on that holdout was 12.9%. | [eval/RESULTS.md](eval/RESULTS.md), seed `authclear-2026-11-19`, ids in `eval/holdout-ids.json` |
| Notice sentences point at the FHIR field they use. The recorded run found no unsupported value. | `src/lib/pointers.ts`, result in `eval/results.json` (`unsupportedValueFindings: 0`) |
| The English denial notice scores 6.4 on Flesch-Kincaid grade using `text-readability`. | `src/lib/readability.ts`, `eval/results.json`. Package: https://www.npmjs.com/package/text-readability |
| The pending official example, once the referenced Claim from the same IG is attached, produces a decision-clock maximum of `2005-05-05T11:01:00+05:00` (72 hours after `Claim.created`). The denial does not get a due time. | `test/pipeline.test.ts` |
| The download is a FHIR R4 Task with `status: requested` and `intent: order`, plus a CSV row and an HTML letter. The notification object has `delivered: false`. | `src/lib/task.ts`, `e2e/hero.spec.ts` |
| HL7 FHIR Validator CLI (version string in `validation/summary.json`) reported 0 errors on every official fixture in that file and on `validation/sample-task.json`. Remaining warnings are unresolved code systems, mostly X12, which are not public. The Task also warns that `http://example.org/authclear-action` is not a known code system. `-allow-example-urls` is on because the HL7 examples use `http://example.org` identifiers. This is not an HL7 certification. | `validation/summary.json`, produced by `scripts/validate-hl7.mjs`. Validator: https://hl7.org/fhir/validator/ and https://github.com/hapifhir/org.hl7.fhir.core/releases/latest/download/validator_cli.jar |
| The page has no login and no API key. `/health.json` reports `"auth": "none"`. | `src/App.tsx`, `vite.config.ts`, `e2e/hero.spec.ts` |
| axe-core reports 0 violations on the hero at desktop width and at 390×844. | `e2e/hero.spec.ts` |
| Example names are the names in the HL7 files. They are not real members, customers, or partners. | `fixtures/official/PROVENANCE.md` |
| Spanish has not been reviewed by a native speaker. There is no external human reviewer of the wording. | On-page text and this file |

Claims this file does not make: a reduction in denials, a reduction in calls, a live payer deployment, clinical accuracy, legal sufficiency of an appeal, or that `Claim.created` is always the moment the payer received the request.
