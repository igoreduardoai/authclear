import { mkdirSync, writeFileSync } from "node:fs";
import { generateCorpus } from "../src/lib/corpus";

const corpus = generateCorpus();
mkdirSync("fixtures/generated", { recursive: true });
for (const entry of corpus) {
  writeFileSync(`fixtures/generated/${entry.gold.id}.json`, JSON.stringify(entry.resource, null, 2));
}
writeFileSync(
  "fixtures/generated/gold.json",
  JSON.stringify(
    corpus.map((entry) => entry.gold),
    null,
    2,
  ),
);
console.log(`wrote ${corpus.length} bundles`);
