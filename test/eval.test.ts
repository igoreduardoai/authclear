import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateCorpus } from "../src/lib/corpus";
import { canonicalHoldoutGold, canonicalHoldoutIds, sha256Text } from "../src/lib/freeze";
import { summarize } from "../src/lib/summary";

describe("evaluation record", () => {
  it("matches the committed summary and the frozen holdout ids", () => {
    const fresh = summarize();
    const committed = JSON.parse(readFileSync("src/generated/eval-summary.json", "utf8"));
    const holdout = JSON.parse(readFileSync("eval/holdout-ids.json", "utf8")) as string[];
    expect(fresh.official.authclearDecisionCorrect).toBe(fresh.official.count);
    expect(fresh.official.baselineDecisionCorrect).toBeLessThan(fresh.official.count);
    expect(fresh.synthetic.authclear.holdout.decision).toBe(1);
    expect(fresh.synthetic.authclear.holdout.service).toBe(1);
    expect(fresh.pointers.coverage).toBe(1);
    expect(fresh.pointers.unsupportedValueFindings).toBe(0);
    expect(fresh.pendedDue.rate).toBe(1);
    expect(committed.officialAuthclear).toBe(`${fresh.official.authclearDecisionCorrect}/${fresh.official.count}`);
    expect(committed.holdoutDecision).toBe(fresh.synthetic.authclear.holdout.decision);
    expect(committed.unsupportedValueFindings).toBe(0);
    expect(holdout).toEqual(fresh.synthetic.holdoutIds);
    expect(holdout).toEqual(
      generateCorpus()
        .filter((entry) => entry.gold.split === "holdout")
        .map((entry) => entry.gold.id),
    );
    const corpus = generateCorpus();
    const onDisk = JSON.parse(readFileSync("fixtures/generated/variant-0001.json", "utf8"));
    const gold = JSON.parse(readFileSync("fixtures/generated/gold.json", "utf8"));
    expect(onDisk).toEqual(corpus[0]?.resource);
    expect(gold).toEqual(corpus.map((entry) => entry.gold));
    expect(readFileSync("eval/holdout-ids.sha256", "utf8").trim()).toBe(sha256Text(canonicalHoldoutIds(holdout)));
    expect(readFileSync("eval/holdout-gold.sha256", "utf8").trim()).toBe(
      sha256Text(canonicalHoldoutGold(gold, holdout)),
    );
  });

  it("does not use forbidden pitch phrases in the public docs", () => {
    const banned = ["Americanas", "44 months", "21 cases"];
    const paths = ["README.md", "CLAIMS.md", "docs/DEPLOY.md", "docs/SUBMISSION-GAPS.md"];
    for (const path of paths) {
      const text = readFileSync(path, "utf8");
      for (const phrase of banned) {
        expect(text, `${path} contains ${phrase}`).not.toContain(phrase);
      }
    }
  });
});
