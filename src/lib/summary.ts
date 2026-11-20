import { readFileSync } from "node:fs";
import { nextAction } from "./action";
import { baselineRead } from "./baseline";
import { generateCorpus, CORPUS_SEED, type GoldRecord } from "./corpus";
import { addHours } from "./deadline";
import { buildNotice, noticePlainText } from "./explain";
import { extract } from "./extract";
import { pointerMismatches, type RelatedDoc } from "./pointers";
import { fleschKincaidGrade, stripHtml } from "./readability";
import type { Decision } from "./types";

interface OfficialCase {
  id: string;
  file: string;
  expect: Decision;
  related?: string[];
}

const OFFICIAL: OfficialCase[] = [
  {
    id: "Bundle-RejectionResponseBundleExample",
    file: "fixtures/official/pas/Bundle-RejectionResponseBundleExample.json",
    expect: "denied",
  },
  {
    id: "Bundle-ReferralPendingAuthorizationResponseBundleExample",
    file: "fixtures/official/pas/Bundle-ReferralPendingAuthorizationResponseBundleExample.json",
    expect: "pended",
    related: ["fixtures/official/pas/Claim-ReferralAuthorizationExample.json"],
  },
  {
    id: "Bundle-ReferralAuthorizationResponseBundleExample",
    file: "fixtures/official/pas/Bundle-ReferralAuthorizationResponseBundleExample.json",
    expect: "approved",
    related: ["fixtures/official/pas/Claim-ReferralAuthorizationExample.json"],
  },
  {
    id: "Bundle-ErrorResponseBundleExample",
    file: "fixtures/official/pas/Bundle-ErrorResponseBundleExample.json",
    expect: "error",
  },
  {
    id: "ExplanationOfBenefit-PDexPriorAuth1",
    file: "fixtures/official/pdex/ExplanationOfBenefit-PDexPriorAuth1.json",
    expect: "approved",
    related: ["fixtures/official/pdex/Patient-1.json", "fixtures/official/pdex/Organization-Payer1.json"],
  },
  {
    id: "ClaimResponse-PractitionerRequestorAdditionalContentResponseExample",
    file: "fixtures/official/pas/ClaimResponse-PractitionerRequestorAdditionalContentResponseExample.json",
    expect: "approved",
  },
  {
    id: "ClaimResponse-PASClaimInquiryResponseExample",
    file: "fixtures/official/pas/ClaimResponse-PASClaimInquiryResponseExample.json",
    expect: "approved",
  },
];

export interface EvalSummary {
  seed: string;
  label: string;
  official: {
    count: number;
    authclearDecisionCorrect: number;
    baselineDecisionCorrect: number;
    authclearDecisionAccuracy: number;
    baselineDecisionAccuracy: number;
    cases: {
      id: string;
      expected: Decision;
      authclear: Decision;
      baseline: Decision;
      authclearCorrect: boolean;
      baselineCorrect: boolean;
    }[];
  };
  synthetic: {
    count: number;
    dev: number;
    holdout: number;
    holdoutIds: string[];
    authclear: { dev: FieldRates; holdout: FieldRates };
    baselineDecisionAccuracy: { dev: number; holdout: number };
  };
  pointers: {
    sentences: number;
    withPointer: number;
    coverage: number;
    unsupportedValueFindings: number;
  };
  pendedDue: { eligible: number; matched: number; rate: number };
  readability: {
    library: "text-readability";
    denialNoticeGrade: number | null;
    denialNarrativeGrade: number | null;
    note: string;
  };
}

interface FieldRates {
  count: number;
  decision: number;
  reviewCode: number;
  service: number;
  units: number;
  validity: number;
  reason: number;
  receipt: number;
}

export function summarize(): EvalSummary {
  const officialCases = OFFICIAL.map((spec) => {
    const resource = JSON.parse(readFileSync(spec.file, "utf8"));
    const related = (spec.related ?? []).map((file) => JSON.parse(readFileSync(file, "utf8")));
    const extraction = extract(resource, { related });
    const baseline = baselineRead(resource);
    return {
      id: spec.id,
      expected: spec.expect,
      authclear: extraction.decision,
      baseline: baseline.decision,
      authclearCorrect: extraction.decision === spec.expect,
      baselineCorrect: baseline.decision === spec.expect,
    };
  });

  const corpus = generateCorpus();
  const devGold = corpus.filter((entry) => entry.gold.split === "dev");
  const holdoutGold = corpus.filter((entry) => entry.gold.split === "holdout");
  let pointerSentences = 0;
  let pointerHits = 0;
  let unsupported = 0;
  let dueEligible = 0;
  let dueMatched = 0;

  const scoreSplit = (entries: typeof corpus): FieldRates => {
    const totals = {
      count: entries.length,
      decision: 0,
      reviewCode: 0,
      service: 0,
      units: 0,
      validity: 0,
      reason: 0,
      receipt: 0,
    };
    for (const entry of entries) {
      const extraction = extract(entry.resource);
      if (extraction.decision === entry.gold.expectedDecision) totals.decision += 1;
      if (extraction.reviewCodes[0]?.code === entry.gold.reviewCode) totals.reviewCode += 1;
      if (extraction.service?.text === entry.gold.service) totals.service += 1;
      if (extraction.units?.text === String(entry.gold.units)) totals.units += 1;
      if ((extraction.validity?.start ?? null) === entry.gold.validityStart && (extraction.validity?.end ?? null) === entry.gold.validityEnd) {
        totals.validity += 1;
      }
      if ((extraction.reasons[0]?.text ?? null) === entry.gold.reason) totals.reason += 1;
      if (extraction.receipt?.value === entry.gold.receipt) totals.receipt += 1;
      const action = nextAction(extraction);
      if (entry.gold.expectedDecision === "pended" && !entry.gold.pharmacy) {
        dueEligible += 1;
        const expectedDue = addHours(entry.gold.receipt, entry.gold.urgent ? 72 : 168);
        if (action.deadline.due === expectedDue) dueMatched += 1;
      }
      for (const lang of ["en", "es"] as const) {
        const notice = buildNotice(extraction, lang);
        pointerSentences += notice.sentences.length;
        pointerHits += notice.sentences.filter((sentence) => sentence.pointers.length > 0).length;
        unsupported += pointerMismatches(entry.resource, [], notice.sentences).length;
      }
    }
    return totals;
  };

  const dev = scoreSplit(devGold);
  const holdout = scoreSplit(holdoutGold);
  const baselineDev = baselineDecisionAccuracy(devGold);
  const baselineHoldout = baselineDecisionAccuracy(holdoutGold);

  for (const spec of OFFICIAL) {
    const resource = JSON.parse(readFileSync(spec.file, "utf8"));
    const relatedResources = (spec.related ?? []).map((file) => JSON.parse(readFileSync(file, "utf8")) as { resourceType?: string; id?: string });
    const relatedDocs: RelatedDoc[] = relatedResources.map((resourceDoc) => ({
      relatedId: `${resourceDoc.resourceType}/${resourceDoc.id}`,
      resource: resourceDoc,
    }));
    const extraction = extract(resource, { related: relatedResources });
    for (const lang of ["en", "es"] as const) {
      const notice = buildNotice(extraction, lang);
      pointerSentences += notice.sentences.length;
      pointerHits += notice.sentences.filter((sentence) => sentence.pointers.length > 0).length;
      unsupported += pointerMismatches(resource, relatedDocs, notice.sentences).length;
    }
  }

  const denial = JSON.parse(
    readFileSync("fixtures/official/pas/Bundle-RejectionResponseBundleExample.json", "utf8"),
  );
  const denialNotice = noticePlainText(buildNotice(extract(denial), "en"));
  const narrative = stripHtml(String(denial.entry[0].resource.text.div));

  const officialCorrect = officialCases.filter((row) => row.authclearCorrect).length;
  const baselineCorrect = officialCases.filter((row) => row.baselineCorrect).length;

  return {
    seed: CORPUS_SEED,
    label:
      "Internal prototype evaluation on published HL7 examples and synthetic variants. No external human validator.",
    official: {
      count: officialCases.length,
      authclearDecisionCorrect: officialCorrect,
      baselineDecisionCorrect: baselineCorrect,
      authclearDecisionAccuracy: officialCorrect / officialCases.length,
      baselineDecisionAccuracy: baselineCorrect / officialCases.length,
      cases: officialCases,
    },
    synthetic: {
      count: corpus.length,
      dev: dev.count,
      holdout: holdout.count,
      holdoutIds: holdoutGold.map((entry) => entry.gold.id),
      authclear: {
        dev: rates(dev),
        holdout: rates(holdout),
      },
      baselineDecisionAccuracy: { dev: baselineDev, holdout: baselineHoldout },
    },
    pointers: {
      sentences: pointerSentences,
      withPointer: pointerHits,
      coverage: pointerSentences === 0 ? 0 : pointerHits / pointerSentences,
      unsupportedValueFindings: unsupported,
    },
    pendedDue: {
      eligible: dueEligible,
      matched: dueMatched,
      rate: dueEligible === 0 ? 0 : dueMatched / dueEligible,
    },
    readability: {
      library: "text-readability",
      denialNoticeGrade: fleschKincaidGrade(denialNotice),
      denialNarrativeGrade: fleschKincaidGrade(narrative),
      note: "The English denial notice is the readability number to use. The published narrative in that example scores much higher after HTML tags are removed, but it is generated markup (labels, codes, and links), so the gap is not a clean prose comparison. Spanish is not scored.",
    },
  };
}

function baselineDecisionAccuracy(entries: { gold: GoldRecord; resource: Record<string, unknown> }[]): number {
  if (entries.length === 0) return 0;
  const correct = entries.filter((entry) => baselineRead(entry.resource).decision === entry.gold.expectedDecision).length;
  return correct / entries.length;
}

function rates(totals: FieldRates): FieldRates {
  const { count } = totals;
  const ratio = (value: number) => (count === 0 ? 0 : value / count);
  return {
    count,
    decision: ratio(totals.decision),
    reviewCode: ratio(totals.reviewCode),
    service: ratio(totals.service),
    units: ratio(totals.units),
    validity: ratio(totals.validity),
    reason: ratio(totals.reason),
    receipt: ratio(totals.receipt),
  };
}

export function renderResultsMarkdown(summary: EvalSummary): string {
  const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
  const rows = summary.official.cases
    .map(
      (row) =>
        `| ${row.id} | ${row.expected} | ${row.authclear} | ${row.baseline} | ${row.authclearCorrect ? "yes" : "no"} | ${row.baselineCorrect ? "yes" : "no"} |`,
    )
    .join("\n");
  return `# AuthClear evaluation

${summary.label}

Seed \`${summary.seed}\`. The holdout is every synthetic id whose SHA-256(\`${summary.seed}|id\`) maps to a bucket under 30. The split is a pure function of that seed. It was created in this build, not pre-registered on an earlier day.

## Official HL7 examples

AuthClear decision accuracy: **${summary.official.authclearDecisionCorrect}/${summary.official.count}** (${pct(summary.official.authclearDecisionAccuracy)}).

Baseline that trusts \`outcome\` alone: **${summary.official.baselineDecisionCorrect}/${summary.official.count}** (${pct(summary.official.baselineDecisionAccuracy)}).

The pending and approved PAS bundles do not contain the Claim they reference. Those two rows attach \`Claim/ReferralAuthorizationExample\` from the same PAS 2.2.1 package. The decision itself is on the ClaimResponse either way.

| Example | Expected | AuthClear | Baseline | AuthClear correct | Baseline correct |
| --- | --- | --- | --- | --- | --- |
${rows}

## Synthetic variants

${summary.synthetic.count} variants (${summary.synthetic.dev} dev, ${summary.synthetic.holdout} holdout). Patient names are \`Member Synthetic####\`. They are not Synthea output: Synthea does not emit Da Vinci PAS ClaimResponse or PDex prior-authorization ExplanationOfBenefit resources.

The baseline reads \`outcome\` and a few top-level fields. It does not open the review-action extension. PAS-shaped variants use \`outcome: complete\` for certified, not-certified, and pending responses, because that is how the official PAS examples are written. A low baseline decision score is that mismatch, not a second implementation of AuthClear.

| Field | Dev | Holdout |
| --- | --- | --- |
| Decision | ${pct(summary.synthetic.authclear.dev.decision)} | ${pct(summary.synthetic.authclear.holdout.decision)} |
| Review code | ${pct(summary.synthetic.authclear.dev.reviewCode)} | ${pct(summary.synthetic.authclear.holdout.reviewCode)} |
| Service | ${pct(summary.synthetic.authclear.dev.service)} | ${pct(summary.synthetic.authclear.holdout.service)} |
| Units | ${pct(summary.synthetic.authclear.dev.units)} | ${pct(summary.synthetic.authclear.holdout.units)} |
| Validity | ${pct(summary.synthetic.authclear.dev.validity)} | ${pct(summary.synthetic.authclear.holdout.validity)} |
| Reason | ${pct(summary.synthetic.authclear.dev.reason)} | ${pct(summary.synthetic.authclear.holdout.reason)} |
| Receipt (\`Claim.created\`) | ${pct(summary.synthetic.authclear.dev.receipt)} | ${pct(summary.synthetic.authclear.holdout.receipt)} |
| Baseline decision | ${pct(summary.synthetic.baselineDecisionAccuracy.dev)} | ${pct(summary.synthetic.baselineDecisionAccuracy.holdout)} |

Pending, non-drug decision-clock due times matched the written 72-hour / 168-hour rule in **${summary.pendedDue.matched}/${summary.pendedDue.eligible}** cases.

## Pointers and readability

Notice sentences with a pointer: **${summary.pointers.withPointer}/${summary.pointers.sentences}** (${pct(summary.pointers.coverage)}).

Pointer mismatches (value not found at the path, or a number in the sentence with no pointer): **${summary.pointers.unsupportedValueFindings}**.

Flesch-Kincaid grade (\`text-readability\`) for the English denial notice: **${summary.readability.denialNoticeGrade ?? "n/a"}**.

Same library on the published narrative in that example, HTML tags removed: **${summary.readability.denialNarrativeGrade ?? "n/a"}**.

${summary.readability.note}
`;
}
