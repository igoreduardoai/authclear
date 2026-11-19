# AuthClear evaluation

Internal prototype evaluation on published HL7 examples and synthetic variants. No external human validator.

Seed `authclear-2026-11-19`. The holdout is every synthetic id whose SHA-256(`authclear-2026-11-19|id`) maps to a bucket under 30. The split is a pure function of that seed. It was created in this build, not pre-registered on an earlier day.

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

Pending, non-drug decision-clock due times matched the written 72-hour / 168-hour rule in **29/29** cases.

## Pointers and readability

Notice sentences with a pointer: **2168/2168** (100.0%).

Pointer mismatches (value not found at the path, or a number in the sentence with no pointer): **0**.

Flesch-Kincaid grade (`text-readability`) for the English denial notice: **6.4**.

Same library on the published narrative in that example, HTML tags removed: **30.1**.

The English denial notice is the readability number to use. The published narrative in that example scores much higher after HTML tags are removed, but it is generated markup (labels, codes, and links), so the gap is not a clean prose comparison. Spanish is not scored.
