# AuthClear

AuthClear reads a prior-authorization FHIR resource and shows the decision in plain language, with the next action a member-services navigator can download.

It is a static prototype by Igor Eduardo. There is no login, no API key, and no server. The page runs in the browser.

The people it is for are member-services navigators who get a call about a prior authorization and are looking at a FHIR payload, not a script. It is also for the member who will start seeing that payload through a Patient Access API.

## The problem

On January 1, 2027, impacted payers have to make prior-authorization information for items and services, excluding drugs, available through the Patient Access API. Impacted payers other than QHP issuers on the Federally-facilitated Exchanges also have decision clocks: 72 hours for an expedited request and seven calendar days for a standard request, measured from when the payer receives the request. Beginning in 2026, a denial of an item or service has to include a specific reason. Those duties are in [CMS-0057-F](https://www.cms.gov/newsroom/fact-sheets/cms-interoperability-prior-authorization-final-rule-cms-0057-f) and the [CMS timeframe FAQ](https://www.cms.gov/initiatives/burden-reduction/overview/interoperability/frequently-asked-questions/improving-prior-authorization-processes).

The resource the API returns is not something a member, or a navigator reading it aloud, can use as-is. In the published Da Vinci PAS examples, `ClaimResponse.outcome` is `complete` for a certified response, a not-certified response, and a pending response. The decision is the X12 review-action code on the item. The [PAS specification](https://hl7.org/fhir/us/davinci-pas/2.2.1/specification.html) says whether a response is pended, denied, or successful depends on that code.

A KFF survey of 3,605 insured adults, fielded February 21–March 14, 2023, found that 16% said their insurance had denied or delayed prior approval for a treatment, service, visit, or drug in the past year. [KFF, September 29, 2023](https://www.kff.org/affordable-care-act/consumer-problems-with-prior-authorization-evidence-from-kff-survey/).

## What the demo does

Open the page and it loads published HL7 examples. No account.

The first screen is the official PAS denial bundle (`RejectionResponseBundleExample`, review action `A3`, display "Not Certified", outcome `complete`). The headline is the display text from the resource. A sentence under it says the outcome field and the review-action code disagree, and that AuthClear follows the review-action code. The next-action card tells a navigator to read the status with the member and ask the plan for the appeal deadline. It does not invent that date. Buttons download:

- a FHIR R4 `Task` (`status` requested, `intent` order)
- one CSV row for a call-center queue
- an HTML member letter
- the source FHIR, unchanged
- a dry-run notification payload with `"delivered": false`

Other tabs are the official pending response, the official certified response, the PDex Patient Access example (`ExplanationOfBenefit/PDexPriorAuth1`, review action `A1` "Certified in total", outcome `queued`), the official submission-error bundle, and an invalid JSON object that the page refuses to turn into a decision.

Select a sentence and the field it came from is marked in the JSON. Spanish is a second set of templates over the same fields. It has not been reviewed by a native speaker.

The pending and certified PAS response bundles do not contain the Claim they reference. The page says so, and shows `Claim/ReferralAuthorizationExample` from the same PAS 2.2.1 package beside them. Urgency (`levelOfServiceCode` `U`) and `Claim.created` come from that Claim. While the review action is still pending, the claim type is not `pharmacy`, and `Claim.created` is present, the decision-clock maximum is that timestamp plus 72 hours when the code is `U`. Otherwise it is plus 168 hours. CMS states 72 hours for an expedited request and seven calendar days for a standard request, measured in calendar time. The 72-hour example on the CMS FAQ keeps the clock time (1:00 AM Sunday to 1:00 AM Wednesday). CMS does not state the words "168 hours". Adding 168 hours is this demo's clock-preserving reading of seven calendar days. It is not adjusted for daylight saving. The 14-day extension some programs allow is not applied. Appeal deadlines are not computed.

## How to run

Node.js 22 or newer.

```bash
npm ci
npm test
npm run dev
```

`npm run dev` serves the page locally. `npm run build` writes a static `dist/` folder. `npm run preview` serves that folder. `npm run e2e` builds, serves, and runs Playwright, including axe.

Health check after a build: `dist/health.json` (and `dist/health`). It reports the service name, version, git commit, and `"auth": "none"`.

```bash
npm run generate   # rewrite fixtures/generated from the public seed
npm run eval       # rewrite eval/RESULTS.md and src/generated/eval-summary.json
npm run validate:hl7
```

`validate:hl7` needs Java 21 and the HL7 validator jar. See [docs/DEPLOY.md](docs/DEPLOY.md).

## Evaluation

This is an internal prototype evaluation. There is no external human validator. Numbers below are from `npm run eval` in this repo. The full table is [eval/RESULTS.md](eval/RESULTS.md).

Official examples, decision correct:

- AuthClear: 7/7
- Baseline that trusts `outcome` and ignores the review-action code: 4/7

The three misses are the published denial (`complete` + `A3`), the published pending response (`complete` + `A4`), and the published PDex example (`queued` + `A1`).

Synthetic set: 120 variants, 89 dev and 31 holdout. The holdout is every id where `SHA-256("authclear-2026-11-19|" + id)` falls in a bucket under 30. The id list and the holdout gold fields are frozen in `eval/holdout-ids.sha256` and `eval/holdout-gold.sha256`. This change did not edit that list and did not use holdout scores to edit the templates. On the holdout, AuthClear's decision, review code, service, units, validity, reason, and receipt all matched the values written into the FHIR. The outcome-only baseline's holdout decision accuracy was 12.9%. That gap is the same `outcome: complete` pattern as the official PAS examples, which the generator copies on purpose. Pending, non-drug due times matched the cited clock in 29/29 cases.

Every notice sentence on those resources had a pointer (2944/2944), and the pointer check found 0 values that were not at the recorded path. Before the status, date, and error-detail sentences, that count was 2168/2168. The English denial notice scores 6.2 on the Flesch-Kincaid grade from the `text-readability` package (83 words). The shorter notice scored 6.4. The generated HTML narrative in that same file scores 30.1 after the tags are stripped. That narrative is labels, codes, and links, so the gap is not a clean comparison of two prose paragraphs. Mean Flesch-Kincaid grade of the English notices is 6.4 on the 89 dev cases and 6.3 on the 31 holdout cases.

The official denial example has no reason text. The synthetic reason string is "Example documentation was not attached" (5 words) or empty. `fleschKincaidGrade` returns null below 12 words, so raw reason text is not scored (0 of 31 non-empty strings). The Spanish denial notice scores 87.6 on the Fernández-Huerta index computed in this repo (105 words, 11 sentences, 190 syllables). That index is not a U.S. grade. The 1959 article was not retrieved for this run. Timestamps and codes are included in the Spanish count. Spanish has not been reviewed by a native speaker.

The before/after table is in [eval/RESULTS.md](eval/RESULTS.md).

The synthetic patients are not Synthea. Synthea does not emit Da Vinci PAS `ClaimResponse` or PDex prior-authorization `ExplanationOfBenefit` resources. Names are `Member Synthetic####`.

## Data

Official examples are copied from:

- Da Vinci PAS 2.2.1, CC0-1.0, https://hl7.org/fhir/us/davinci-pas/2.2.1/package.tgz
- Da Vinci PDex 2.2.0, CC0-1.0, https://hl7.org/fhir/us/davinci-pdex/STU2.2/package.tgz

Checksums and the file list are in [fixtures/official/PROVENANCE.md](fixtures/official/PROVENANCE.md). Names in those files are HL7's example names. They are not real members and not customers of this project.

There is no PHI in this repository.

## Limitations

- Drugs are out of scope. A `pharmacy` claim type does not get the CMS-0057-F item-and-service clock.
- The page does not know whether a payer is an impacted payer or a QHP issuer on the FFEs, and it does not apply the 14-day extension some programs allow. The caveat on the task states those limits. The due time is a maximum computed from `Claim.created`, which the screen labels as the published request timestamp, not as proof of when the payer received the request.
- Appeal deadlines are not computed. Plan policy is not in the resource.
- There is no connection to a payer, an EHR, or a member. Nothing is sent. The notification file is a dry run.
- Review-action codes other than `A1`, `A3`, and `A4` stay `unknown`. Those three are grouped from the display strings in the HL7 examples and from the PAS rule that the review-action code decides pending, denial, or success. This project does not ship the X12 TR3.
- The PDex example carries both `outcome: queued` and review action `A1`. The screen shows both.
- Spanish is machine-authored in this repo and has not had a native-speaker review.
- The HL7 validator run is a local CLI check, not a certification. See `validation/summary.json` after `npm run validate:hl7`.
- No person outside this prototype has validated the wording. No pilot, revenue, or letter of intent is claimed. [CLAIMS.md](CLAIMS.md) lists each product claim with a source.

## Deploy

Live demo, no login (this branch, commit `9ce2cbf`):

- [https://authclear-delta.vercel.app](https://authclear-delta.vercel.app)
- [https://igoreduardoai.github.io/authclear/](https://igoreduardoai.github.io/authclear/)

`GET /health` on either host returns static JSON. No API key and no login. Further static-host notes are in [docs/DEPLOY.md](docs/DEPLOY.md).

## License

MIT. Copyright 2026 Igor Eduardo. See [LICENSE](LICENSE).
