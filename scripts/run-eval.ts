import { mkdirSync, writeFileSync } from "node:fs";
import { renderResultsMarkdown, summarize } from "../src/lib/summary";

const summary = summarize();
mkdirSync("eval", { recursive: true });
mkdirSync("src/generated", { recursive: true });
mkdirSync("public", { recursive: true });
writeFileSync("eval/results.json", JSON.stringify(summary, null, 2));
writeFileSync("eval/holdout-ids.json", JSON.stringify(summary.synthetic.holdoutIds, null, 2));
writeFileSync("eval/RESULTS.md", renderResultsMarkdown(summary));
writeFileSync("public/RESULTS.md", renderResultsMarkdown(summary));
const card = {
  label: summary.label,
  seed: summary.seed,
  officialAuthclear: `${summary.official.authclearDecisionCorrect}/${summary.official.count}`,
  officialBaseline: `${summary.official.baselineDecisionCorrect}/${summary.official.count}`,
  holdoutDecision: summary.synthetic.authclear.holdout.decision,
  holdoutBaselineDecision: summary.synthetic.baselineDecisionAccuracy.holdout,
  holdoutCount: summary.synthetic.holdout,
  devCount: summary.synthetic.dev,
  pointerCoverage: summary.pointers.coverage,
  unsupportedValueFindings: summary.pointers.unsupportedValueFindings,
  denialNoticeGrade: summary.readability.denialNoticeGrade,
  denialNarrativeGrade: summary.readability.denialNarrativeGrade,
  spanishDenialIndex: summary.readability.spanish.denialNoticeIndex,
  rawReasonScored: summary.readability.rawReason.dev.scored + summary.readability.rawReason.holdout.scored,
  pendedDue: `${summary.pendedDue.matched}/${summary.pendedDue.eligible}`,
};
writeFileSync("src/generated/eval-summary.json", JSON.stringify(card, null, 2));
console.log(JSON.stringify(card, null, 2));
