import { readFileSync } from "node:fs";
import { nextAction } from "./action";
import { baselineRead } from "./baseline";
import { generateCorpus, CORPUS_SEED, type GoldRecord } from "./corpus";
import { addHours } from "./deadline";
import { buildNotice, noticePlainText } from "./explain";
import { extract } from "./extract";
import { pointerMismatches, type RelatedDoc } from "./pointers";
import { fernandezHuerta, fleschKincaidGrade, stripHtml } from "./readability";
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
    denialNoticeWords: number;
    englishNotice: { dev: GradeReport; holdout: GradeReport };
    rawReason: { dev: ReasonReport; holdout: ReasonReport };
    spanish: {
      formula: "fernandez-huerta";
      denialNoticeIndex: number | null;
      words: number;
      sentences: number;
      syllables: number;
    };
    note: string;
  };
}

interface GradeReport {
  scored: number;
  count: number;
  meanGrade: number | null;
}

interface ReasonReport {
  present: number;
  scored: number;
  maxWords: number;
  meanGrade: number | null;
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

  const scoreSplit = (entries: typeof corpus, sink: GradeSink): FieldRates => {
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
      if (entry.gold.reason) {
        sink.reasonPresent += 1;
        const words = entry.gold.reason.trim().split(/\s+/).filter(Boolean).length;
        if (words > sink.reasonMaxWords) sink.reasonMaxWords = words;
        if (fleschKincaidGrade(entry.gold.reason) != null) sink.reasonScored += 1;
      }
      for (const lang of ["en", "es"] as const) {
        const notice = buildNotice(extraction, lang);
        if (lang === "en") {
          const grade = fleschKincaidGrade(noticePlainText(notice));
          if (grade != null) sink.noticeGrades.push(grade);
        }
        pointerSentences += notice.sentences.length;
        pointerHits += notice.sentences.filter((sentence) => sentence.pointers.length > 0).length;
        unsupported += pointerMismatches(entry.resource, [], notice.sentences).length;
      }
    }
    return totals;
  };

  const devGrades = emptyGradeSink();
  const holdoutGrades = emptyGradeSink();
  const dev = scoreSplit(devGold, devGrades);
  const holdout = scoreSplit(holdoutGold, holdoutGrades);
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
  const denialSpanish = fernandezHuerta(noticePlainText(buildNotice(extract(denial), "es")));
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
      denialNoticeWords: denialNotice.split(/\s+/).filter(Boolean).length,
      englishNotice: {
        dev: gradeReport(devGrades),
        holdout: gradeReport(holdoutGrades),
      },
      rawReason: {
        dev: reasonReport(devGrades),
        holdout: reasonReport(holdoutGrades),
      },
      spanish: {
        formula: "fernandez-huerta",
        denialNoticeIndex: denialSpanish?.index ?? null,
        words: denialSpanish?.words ?? 0,
        sentences: denialSpanish?.sentences ?? 0,
        syllables: denialSpanish?.syllables ?? 0,
      },
      note: "Flesch-Kincaid grades are from the text-readability package and are omitted below 12 words. The official denial example has no reason text. Synthetic reason strings are shorter than 12 words, so their grade is not reported. The published narrative grade is HTML with tags removed; it is labels, codes, and links, not a prose paragraph. The Fernández-Huerta figure is an ease index computed in this repo, not a U.S. grade, and it includes timestamps and codes.",
    },
  };
}

interface GradeSink {
  noticeGrades: number[];
  reasonPresent: number;
  reasonScored: number;
  reasonMaxWords: number;
}

function emptyGradeSink(): GradeSink {
  return { noticeGrades: [], reasonPresent: 0, reasonScored: 0, reasonMaxWords: 0 };
}

function gradeReport(sink: GradeSink): GradeReport {
  return {
    scored: sink.noticeGrades.length,
    count: sink.noticeGrades.length,
    meanGrade: mean(sink.noticeGrades),
  };
}

function reasonReport(sink: GradeSink): ReasonReport {
  return {
    present: sink.reasonPresent,
    scored: sink.reasonScored,
    maxWords: sink.reasonMaxWords,
    meanGrade: null,
  };
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 10) / 10;
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

Seed \`${summary.seed}\`. The holdout is every synthetic id whose SHA-256(\`${summary.seed}|id\`) maps to a bucket under 30. The id list and the holdout gold fields are frozen by \`eval/holdout-ids.sha256\` and \`eval/holdout-gold.sha256\`. This extractor change did not edit that list. Do not change it to improve a score.

## Before and after the field-mapping change

The before column is the evaluation already recorded on this branch before the status, item-sequence, date, and error-detail sentences were added. Unit tests then: 18 passed. The after column is this file.

| Metric | Before | After |
| --- | --- | --- |
| Official decision, AuthClear | 7/7 | ${summary.official.authclearDecisionCorrect}/${summary.official.count} |
| Official decision, outcome-only baseline | 4/7 | ${summary.official.baselineDecisionCorrect}/${summary.official.count} |
| Synthetic dev / holdout | 89 / 31 | ${summary.synthetic.dev} / ${summary.synthetic.holdout} |
| Holdout decision | 100.0% | ${pct(summary.synthetic.authclear.holdout.decision)} |
| Holdout baseline decision | 12.9% | ${pct(summary.synthetic.baselineDecisionAccuracy.holdout)} |
| Notice sentences with a pointer | 2168/2168 | ${summary.pointers.withPointer}/${summary.pointers.sentences} |
| Unsupported notice values | 0 | ${summary.pointers.unsupportedValueFindings} |
| English denial notice, Flesch-Kincaid | 6.4 | ${summary.readability.denialNoticeGrade ?? "n/a"} |
| Denial narrative, tags removed | 30.1 | ${summary.readability.denialNarrativeGrade ?? "n/a"} |
| Spanish denial notice | not scored | Fernández-Huerta ${summary.readability.spanish.denialNoticeIndex ?? "n/a"} |
| Pending non-drug due times | 29/29 | ${summary.pendedDue.matched}/${summary.pendedDue.eligible} |

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

Pending, non-drug decision-clock due times matched the cited rule in **${summary.pendedDue.matched}/${summary.pendedDue.eligible}** cases: 72 hours when the level-of-service code is \`U\`, otherwise 168 hours. CMS states seven calendar days and calendar time. CMS does not state "168 hours". That addition is this demo's clock-preserving reading, and it is not adjusted for daylight saving.

## Pointers and readability

Notice sentences with a pointer: **${summary.pointers.withPointer}/${summary.pointers.sentences}** (${pct(summary.pointers.coverage)}).

Pointer mismatches (value not found at the path, or a number in the sentence with no pointer): **${summary.pointers.unsupportedValueFindings}**.

Flesch-Kincaid grade (\`text-readability\`) for the English denial notice (${summary.readability.denialNoticeWords} words): **${summary.readability.denialNoticeGrade ?? "n/a"}**.

Same library on the published narrative in that example, HTML tags removed: **${summary.readability.denialNarrativeGrade ?? "n/a"}**.

Mean Flesch-Kincaid grade of English notices: dev **${fmtGrade(summary.readability.englishNotice.dev)}**, holdout **${fmtGrade(summary.readability.englishNotice.holdout)}**. These means were not used to edit the templates.

Raw reason text: dev ${summary.readability.rawReason.dev.present} strings, ${summary.readability.rawReason.dev.scored} scored, longest ${summary.readability.rawReason.dev.maxWords} words. Holdout ${summary.readability.rawReason.holdout.present} strings, ${summary.readability.rawReason.holdout.scored} scored, longest ${summary.readability.rawReason.holdout.maxWords} words. The official denial example has no reason text.

Fernández-Huerta index for the Spanish denial notice: **${summary.readability.spanish.denialNoticeIndex ?? "n/a"}** (${summary.readability.spanish.words} words, ${summary.readability.spanish.sentences} sentences, ${summary.readability.spanish.syllables} syllables). Formula in this repo: 206.84 − 0.60 × syllables per 100 words − 1.02 × sentences per 100 words. This run did not retrieve the 1959 article. The index is not a U.S. grade. Timestamps and codes are included.

${summary.readability.note}
`;
}

function fmtGrade(report: GradeReport): string {
  if (report.meanGrade == null) return "n/a";
  return `${report.meanGrade.toFixed(1)} (${report.scored} notices)`;
}
