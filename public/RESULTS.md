# AuthClear evaluation

Internal prototype evaluation on published HL7 examples and synthetic variants. No external human validator.

Seed `authclear-2026-11-19`. The holdout is every synthetic id whose SHA-256(`authclear-2026-11-19|id`) maps to a bucket under 30. The id list and the holdout gold fields are frozen by `eval/holdout-ids.sha256` and `eval/holdout-gold.sha256`. This extractor change did not edit that list. Do not change it to improve a score.

## Before and after the field-mapping change

The before column is the evaluation already recorded on this branch before the status, item-sequence, date, and error-detail sentences were added. Unit tests then: 18 passed. The after column is this file.

| Metric | Before | After |
| --- | --- | --- |
| Official decision, AuthClear | 7/7 | 7/7 |
| Official decision, outcome-only baseline | 4/7 | 4/7 |
| Synthetic dev / holdout | 89 / 31 | 89 / 31 |
| Holdout decision | 100.0% | 100.0% |
| Holdout baseline decision | 12.9% | 12.9% |
| Notice sentences with a pointer | 2168/2168 | 2944/2944 |
| Unsupported notice values | 0 | 0 |
| English denial notice, Flesch-Kincaid | 6.4 | 6.2 |
| Denial narrative, tags removed | 30.1 | 30.1 |
| Spanish denial notice | not scored | Fernández-Huerta 87.6 |
| Pending non-drug due times | 29/29 | 29/29 |

## Official HL7 examples

AuthClear decision accuracy: **7/7** (100.0%).

Baseline that trusts `outcome` alone: **4/7** (57.1%).

The pending and approved PAS bundles do not contain the Claim they reference. Those two rows attach `Claim/ReferralAuthorizationExample` from the same PAS 2.2.1 package. The decision itself is on the ClaimResponse either way.

| Example | Expected | AuthClear | Baseline | AuthClear correct | Baseline correct |
| --- | --- | --- | --- | --- | --- |
| Bundle-RejectionResponseBundleExample | denied | denied | approved | yes | no |
| Bundle-ReferralPendingAuthorizationResponseBundleExample | pended | pended | approved | yes | no |
| Bundle-ReferralAuthorizationResponseBundleExample | approved | approved | approved | yes | yes |
| Bundle-ErrorResponseBundleExample | error | error | error | yes | yes |
| ExplanationOfBenefit-PDexPriorAuth1 | approved | approved | pended | yes | no |
| ClaimResponse-PractitionerRequestorAdditionalContentResponseExample | approved | approved | approved | yes | yes |
| ClaimResponse-PASClaimInquiryResponseExample | approved | approved | approved | yes | yes |

## Synthetic variants

120 variants (89 dev, 31 holdout). Patient names are `Member Synthetic####`. They are not Synthea output: Synthea does not emit Da Vinci PAS ClaimResponse or PDex prior-authorization ExplanationOfBenefit resources.

The baseline reads `outcome` and a few top-level fields. It does not open the review-action extension. PAS-shaped variants use `outcome: complete` for certified, not-certified, and pending responses, because that is how the official PAS examples are written. A low baseline decision score is that mismatch, not a second implementation of AuthClear.

| Field | Dev | Holdout |
| --- | --- | --- |
| Decision | 100.0% | 100.0% |
| Review code | 100.0% | 100.0% |
| Service | 100.0% | 100.0% |
| Units | 100.0% | 100.0% |
| Validity | 100.0% | 100.0% |
| Reason | 100.0% | 100.0% |
| Receipt (`Claim.created`) | 100.0% | 100.0% |
| Baseline decision | 30.3% | 12.9% |

Pending, non-drug decision-clock due times matched the cited rule in **29/29** cases: 72 hours when the level-of-service code is `U`, otherwise 168 hours. CMS states seven calendar days and calendar time. CMS does not state "168 hours". That addition is this demo's clock-preserving reading, and it is not adjusted for daylight saving.

## Pointers and readability

Notice sentences with a pointer: **2944/2944** (100.0%).

Pointer mismatches (value not found at the path, or a number in the sentence with no pointer): **0**.

Flesch-Kincaid grade (`text-readability`) for the English denial notice (83 words): **6.2**.

Same library on the published narrative in that example, HTML tags removed: **30.1**.

Mean Flesch-Kincaid grade of English notices: dev **6.4 (89 notices)**, holdout **6.3 (31 notices)**. These means were not used to edit the templates.

Raw reason text: dev 20 strings, 0 scored, longest 5 words. Holdout 11 strings, 0 scored, longest 5 words. The official denial example has no reason text.

Fernández-Huerta index for the Spanish denial notice: **87.6** (105 words, 11 sentences, 190 syllables). Formula in this repo: 206.84 − 0.60 × syllables per 100 words − 1.02 × sentences per 100 words. This run did not retrieve the 1959 article. The index is not a U.S. grade. Timestamps and codes are included.

Flesch-Kincaid grades are from the text-readability package and are omitted below 12 words. The official denial example has no reason text. Synthetic reason strings are shorter than 12 words, so their grade is not reported. The published narrative grade is HTML with tags removed; it is labels, codes, and links, not a prose paragraph. The Fernández-Huerta figure is an ease index computed in this repo, not a U.S. grade, and it includes timestamps and codes.
