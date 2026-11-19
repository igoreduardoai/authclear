import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extract } from "../src/lib/extract";

const rejection = JSON.parse(
  readFileSync("fixtures/official/pas/Bundle-RejectionResponseBundleExample.json", "utf8"),
);
const pending = JSON.parse(
  readFileSync("fixtures/official/pas/Bundle-ReferralPendingAuthorizationResponseBundleExample.json", "utf8"),
);
const approved = JSON.parse(
  readFileSync("fixtures/official/pas/Bundle-ReferralAuthorizationResponseBundleExample.json", "utf8"),
);
const claim = JSON.parse(
  readFileSync("fixtures/official/pas/Claim-ReferralAuthorizationExample.json", "utf8"),
);

describe("official PAS examples", () => {
  it("reads Not Certified (A3) as a denial even though outcome is complete", () => {
    const got = extract(rejection);
    expect(got.ok).toBe(true);
    expect(got.decision).toBe("denied");
    expect(got.reviewCodes.map((c) => c.code)).toEqual(["A3"]);
    expect(got.reviewCodes[0]?.display).toBe("Not Certified");
    expect(got.outcome?.value).toBe("complete");
    expect(got.outcomeAgrees).toBe(false);
    expect(got.patient.label).toBe("JOE SMITH");
    expect(got.reasons).toEqual([]);
    expect(got.urgent?.code).toBe("U");
    expect(got.receipt?.value).toBe("2005-05-02T11:01:00+05:00");
    expect(got.claimJoinedFromCatalog).toBe(false);
  });

  it("reads Pending (A4) and uses the referenced Claim example only when it is supplied", () => {
    const alone = extract(pending);
    expect(alone.decision).toBe("pended");
    expect(alone.outcomeAgrees).toBe(false);
    expect(alone.receipt).toBeNull();
    expect(alone.urgent).toBeNull();

    const joined = extract(pending, { related: [claim] });
    expect(joined.decision).toBe("pended");
    expect(joined.claimJoinedFromCatalog).toBe(true);
    expect(joined.urgent?.code).toBe("U");
    expect(joined.urgent?.source).toBe("related");
    expect(joined.receipt?.value).toBe("2005-05-02T11:01:00+05:00");
  });

  it("reads Certified in total (A1) as approved when outcome is also complete", () => {
    const got = extract(approved, { related: [claim] });
    expect(got.decision).toBe("approved");
    expect(got.reviewCodes.map((c) => c.code)).toEqual(["A1"]);
    expect(got.outcomeAgrees).toBe(true);
  });
});
