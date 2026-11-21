import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = execFileSync("git", ["ls-files", "-z", "-c", "-o", "--exclude-standard"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const bannedName = ["Cort", "exa"].join("");

describe("public text", () => {
  it("fails if the banned company name appears in a tracked file", () => {
    const hits: string[] = [];
    for (const file of files) {
      const bytes = readFileSync(file);
      if (bytes.includes(0)) continue;
      if (bytes.toString("utf8").toLowerCase().includes(bannedName.toLowerCase())) hits.push(file);
    }
    expect(hits).toEqual([]);
  });

  it("keeps the license in the author's name and keeps postal addresses out of authored text", () => {
    const license = readFileSync("LICENSE", "utf8");
    expect(license).toContain("Copyright (c) 2026 Igor Eduardo");
    expect(license.toLowerCase()).not.toContain(bannedName.toLowerCase());
    const authored = files.filter((file) =>
      /^(README\.md|CLAIMS\.md|LICENSE|package\.json|docs\/|src\/|test\/|e2e\/|scripts\/|eval\/|public\/)/.test(file),
    );
    const address =
      /\bP\.?\s*O\.?\s*Box\b|\b\d{1,6}\s+[A-Za-z0-9.'-]+\s+(Street|Avenue|Road|Boulevard|Drive|Lane|Court)\b/i;
    const hits = authored.filter((file) => !file.startsWith("fixtures/") && address.test(readFileSync(file, "utf8")));
    expect(hits).toEqual([]);
  });
});
