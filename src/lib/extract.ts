import { joinPath } from "./path";
import type { Decision, Extraction, PointerSource, ReviewCode } from "./types";

type Rec = Record<string, unknown>;

export interface ExtractOptions {
  related?: unknown[];
}

interface Located {
  resource: Rec;
  pathPrefix: string;
  source: PointerSource;
  relatedId?: string;
}

const EMPTY_PATIENT: Extraction["patient"] = {
  reference: null,
  label: null,
  givenPath: null,
  familyPath: null,
  source: "focus",
};

const EMPTY_INSURER: Extraction["insurer"] = {
  reference: null,
  name: null,
  path: null,
  source: "focus",
};

export function groupReviewCode(code: string): Decision {
  if (code === "A1") return "approved";
  if (code === "A3") return "denied";
  if (code === "A4") return "pended";
  return "unknown";
}

/** What a reader sees if they trust ClaimResponse.outcome / EOB.outcome alone. */
export function decisionFromOutcome(outcome: string | null): Decision {
  if (outcome === "complete") return "approved";
  if (outcome === "queued") return "pended";
  if (outcome === "error") return "error";
  if (outcome === "partial") return "mixed";
  return "unknown";
}

export function extract(input: unknown, options: ExtractOptions = {}): Extraction {
  const problems: string[] = [];
  const blank = (extra: Partial<Extraction> = {}): Extraction => ({
    ok: false,
    problems,
    resourceType: null,
    profile: null,
    focusId: null,
    focusPath: "",
    focusReference: null,
    decision: "unknown",
    status: null,
    reviewCodes: [],
    outcome: null,
    outcomeAgrees: null,
    reasons: [],
    service: null,
    units: null,
    validity: null,
    authId: null,
    traceId: null,
    urgent: null,
    receipt: null,
    responseCreated: null,
    dates: [],
    patient: { ...EMPTY_PATIENT },
    insurer: { ...EMPTY_INSURER },
    claimJoinedFromCatalog: false,
    errors: [],
    claimType: null,
    drugsExcluded: false,
    ...extra,
  });

  if (!isRec(input)) {
    problems.push("Input is not a JSON object.");
    return blank();
  }
  if (typeof input.resourceType !== "string") {
    problems.push("Input has no resourceType.");
    return blank();
  }

  const bundleEntries: Located[] = [];
  let focus: Rec | null = null;
  let focusPath = "";

  if (input.resourceType === "Bundle") {
    const entries = Array.isArray(input.entry) ? input.entry : [];
    entries.forEach((entry, index) => {
      if (!isRec(entry) || !isRec(entry.resource)) return;
      bundleEntries.push({
        resource: entry.resource,
        pathPrefix: `entry[${index}].resource`,
        source: "focus",
      });
    });
    const found = bundleEntries.find((entry) => isPriorAuthResource(entry.resource));
    if (!found) {
      problems.push("Bundle has no prior-authorization ClaimResponse or ExplanationOfBenefit.");
      return blank({ resourceType: "Bundle" });
    }
    focus = found.resource;
    focusPath = found.pathPrefix;
  } else if (isPriorAuthResource(input) || input.resourceType === "ClaimResponse" || input.resourceType === "ExplanationOfBenefit") {
    if (input.resourceType === "ClaimResponse" || input.resourceType === "ExplanationOfBenefit") {
      if (input.use && input.use !== "preauthorization" && !hasPriorAuthProfile(input)) {
        problems.push(`Resource use is "${String(input.use)}", not preauthorization.`);
        return blank({ resourceType: String(input.resourceType) });
      }
      focus = input;
      focusPath = "";
    } else {
      problems.push(`Unsupported resourceType "${String(input.resourceType)}".`);
      return blank({ resourceType: String(input.resourceType) });
    }
  } else {
    problems.push(`Unsupported resourceType "${String(input.resourceType)}".`);
    return blank({ resourceType: String(input.resourceType) });
  }

  const related = flattenRelated(options.related ?? []);
  const claimRef = referenceOf(focus.request);
  const inBundleClaim = findByReference(bundleEntries, claimRef) ?? findByType(bundleEntries, "Claim");
  const relatedClaim =
    findByReference(related, claimRef) ?? (inBundleClaim ? null : findByType(related, "Claim"));
  const claim = inBundleClaim ?? relatedClaim;
  const claimJoinedFromCatalog = !inBundleClaim && !!relatedClaim;

  const reviewCodes = collectReviewCodes(focus, focusPath);
  const outcomeValue = typeof focus.outcome === "string" ? focus.outcome : null;
  const outcome = outcomeValue
    ? { value: outcomeValue, path: joinPath(focusPath, "outcome"), source: "focus" as const }
    : null;
  const decision = decide(reviewCodes, outcomeValue);
  const outcomeAgrees = outcome ? decisionFromOutcome(outcome.value) === decision : null;

  const reasons = collectReasons(focus, focusPath);
  const service = collectService(focus, focusPath);
  const units = collectUnits(focus, focusPath);
  const validity = collectValidity(focus, focusPath);
  const authId = collectAuthId(focus, focusPath);
  const traceId = collectTrace(focus, focusPath);
  const errors = collectErrors(focus, focusPath);
  const responseCreated =
    typeof focus.created === "string"
      ? { value: focus.created, path: joinPath(focusPath, "created"), source: "focus" as const }
      : null;

  const urgent = findUrgent(focus, focusPath, claim);
  const receipt = findReceipt(claim);
  const claimType = readTypeCode(focus) ?? (claim ? readTypeCode(claim.resource) : null);
  const drugsExcluded = claimType === "pharmacy";

  const patient = resolvePatient(focus, bundleEntries, related);
  const insurer = resolveInsurer(focus, focusPath, bundleEntries, related);
  const profile = Array.isArray(focus.meta) ? null : readProfile(focus);

  return {
    ok: true,
    problems,
    resourceType: String(focus.resourceType),
    profile,
    focusId: typeof focus.id === "string" ? focus.id : null,
    focusPath,
    focusReference:
      typeof focus.resourceType === "string" && typeof focus.id === "string"
        ? `${focus.resourceType}/${focus.id}`
        : null,
    decision,
    status:
      typeof focus.status === "string"
        ? { value: focus.status, path: joinPath(focusPath, "status"), source: "focus" as const }
        : null,
    reviewCodes,
    outcome,
    outcomeAgrees,
    reasons,
    service,
    units,
    validity,
    authId,
    traceId,
    urgent,
    receipt,
    responseCreated,
    dates: collectDates(focus, focusPath, responseCreated, receipt),
    patient,
    insurer,
    claimJoinedFromCatalog,
    errors,
    claimType,
    drugsExcluded,
  };
}

function decide(codes: ReviewCode[], outcome: string | null): Decision {
  if (codes.length === 0) {
    return outcome === "error" ? "error" : "unknown";
  }
  const groups = new Set(codes.map((code) => groupReviewCode(code.code)));
  if (groups.size === 1) return [...groups][0];
  return "mixed";
}

function isPriorAuthResource(resource: Rec): boolean {
  if (resource.resourceType !== "ClaimResponse" && resource.resourceType !== "ExplanationOfBenefit") {
    return false;
  }
  return resource.use === "preauthorization" || hasPriorAuthProfile(resource);
}

function hasPriorAuthProfile(resource: Rec): boolean {
  const meta = isRec(resource.meta) ? resource.meta : null;
  const profiles = Array.isArray(meta?.profile) ? meta.profile : [];
  return profiles.some((profile) => {
    const value = String(profile);
    return (
      value.includes("profile-claimresponse") ||
      value.includes("profile-claiminquiryresponse") ||
      value.includes("pdex-priorauthorization")
    );
  });
}

function readProfile(resource: Rec): string | null {
  const meta = isRec(resource.meta) ? resource.meta : null;
  const profiles = Array.isArray(meta?.profile) ? meta.profile : [];
  return typeof profiles[0] === "string" ? profiles[0] : null;
}

function collectReviewCodes(focus: Rec, focusPath: string): ReviewCode[] {
  const found: ReviewCode[] = [];
  for (const key of ["item", "addItem"] as const) {
    const items = Array.isArray(focus[key]) ? (focus[key] as unknown[]) : [];
    items.forEach((item, itemIndex) => {
      if (!isRec(item)) return;
      const itemPath = joinPath(focusPath, `${key}[${itemIndex}]`);
      const sequences = readSequences(item);
      const targets = sequences.length > 0 ? sequences : [{ value: null, path: "" }];
      const adjudications = Array.isArray(item.adjudication) ? item.adjudication : [];
      adjudications.forEach((adjudication, adjudicationIndex) => {
        if (!isRec(adjudication)) return;
        extensionsOf(adjudication).forEach((extension, extensionIndex) => {
          if (!urlIncludes(extension, "extension-reviewAction")) return;
          const codeExt = extensionsOf(extension).find((child) =>
            urlIncludes(child, "extension-reviewActionCode"),
          );
          if (!codeExt) return;
          const codeIndex = extensionsOf(extension).indexOf(codeExt);
          const concept = isRec(codeExt.valueCodeableConcept) ? codeExt.valueCodeableConcept : null;
          const coding = concept && Array.isArray(concept.coding) ? concept.coding[0] : null;
          if (!isRec(coding) || typeof coding.code !== "string") return;
          const codePath = joinPath(
            itemPath,
            `adjudication[${adjudicationIndex}].extension[${extensionIndex}].extension[${codeIndex}].valueCodeableConcept.coding[0].code`,
          );
          for (const sequence of targets) {
            found.push({
              code: coding.code,
              display: typeof coding.display === "string" ? coding.display : null,
              path: codePath,
              source: "focus",
              itemSequence: sequence.value,
              sequencePath: sequence.path ? joinPath(itemPath, sequence.path) : null,
            });
          }
        });
      });
    });
  }
  return found;
}

function readSequences(item: Rec): { value: number; path: string }[] {
  if (typeof item.itemSequence === "number") return [{ value: item.itemSequence, path: "itemSequence" }];
  if (Array.isArray(item.itemSequence)) {
    return item.itemSequence.flatMap((value, index) =>
      typeof value === "number" ? [{ value, path: `itemSequence[${index}]` }] : [],
    );
  }
  if (typeof item.sequence === "number") return [{ value: item.sequence, path: "sequence" }];
  return [];
}

function collectReasons(focus: Rec, focusPath: string): Extraction["reasons"] {
  const reasons: Extraction["reasons"] = [];
  const notes = Array.isArray(focus.processNote) ? focus.processNote : [];
  notes.forEach((note, index) => {
    if (isRec(note) && typeof note.text === "string" && note.text.trim()) {
      reasons.push({
        text: note.text.trim(),
        path: joinPath(focusPath, `processNote[${index}].text`),
        source: "focus",
      });
    }
  });
  for (const key of ["item", "addItem"] as const) {
    const items = Array.isArray(focus[key]) ? (focus[key] as unknown[]) : [];
    items.forEach((item, itemIndex) => {
      if (!isRec(item)) return;
      const adjudications = Array.isArray(item.adjudication) ? item.adjudication : [];
      adjudications.forEach((adjudication, adjudicationIndex) => {
        if (!isRec(adjudication)) return;
        const reason = conceptText(adjudication.reason);
        if (reason) {
          reasons.push({
            text: reason,
            path: joinPath(focusPath, `${key}[${itemIndex}].adjudication[${adjudicationIndex}].reason`),
            source: "focus",
          });
        }
        extensionsOf(adjudication).forEach((extension, extensionIndex) => {
          if (!urlIncludes(extension, "extension-reviewAction")) return;
          extensionsOf(extension).forEach((child, childIndex) => {
            if (!/reason/i.test(String(child.url ?? ""))) return;
            const base = joinPath(
              focusPath,
              `${key}[${itemIndex}].adjudication[${adjudicationIndex}].extension[${extensionIndex}].extension[${childIndex}]`,
            );
            if (typeof child.valueString === "string" && child.valueString.trim()) {
              reasons.push({ text: child.valueString.trim(), path: `${base}.valueString`, source: "focus" });
              return;
            }
            if (isRec(child.valueCodeableConcept)) {
              const text = conceptText(child.valueCodeableConcept);
              if (!text) return;
              reasons.push({
                text,
                path: conceptValuePath(base + ".valueCodeableConcept", child.valueCodeableConcept),
                source: "focus",
              });
            }
          });
        });
      });
    });
  }
  return reasons;
}

function collectService(focus: Rec, focusPath: string): Extraction["service"] {
  const items = Array.isArray(focus.item) ? focus.item : [];
  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];
    if (!isRec(item)) continue;
    const detail = findExtension(item, "extension-itemAuthorizedDetail");
    if (detail) {
      const children = extensionsOf(detail.extension);
      const childIndex = children.findIndex((entry) => entry.url === "productOrServiceCode");
      const child = childIndex >= 0 ? children[childIndex] : undefined;
      if (child && isRec(child.valueCodeableConcept)) {
        const text = conceptText(child.valueCodeableConcept);
        if (text) {
          const base = joinPath(
            focusPath,
            `item[${itemIndex}].extension[${detail.index}].extension[${childIndex}].valueCodeableConcept`,
          );
          return { text, path: conceptValuePath(base, child.valueCodeableConcept), source: "focus" };
        }
      }
    }
    const directConcept = conceptText(item.productOrService)
      ? item.productOrService
      : conceptText(item.category)
        ? item.category
        : null;
    const direct = conceptText(directConcept);
    if (direct && isRec(directConcept)) {
      const field = directConcept === item.productOrService ? "productOrService" : "category";
      const base = joinPath(focusPath, `item[${itemIndex}].${field}`);
      return { text: direct, path: conceptValuePath(base, directConcept), source: "focus" };
    }
  }
  return null;
}

function collectUnits(focus: Rec, focusPath: string): Extraction["units"] {
  const items = Array.isArray(focus.item) ? focus.item : [];
  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];
    if (!isRec(item)) continue;
    const detail = findExtension(item, "extension-itemAuthorizedDetail");
    if (detail) {
      const child = extensionsOf(detail.extension).find((entry) => entry.url === "quantity");
      const childIndex = child ? extensionsOf(detail.extension).indexOf(child) : -1;
      if (child && isRec(child.valueQuantity) && typeof child.valueQuantity.value === "number") {
        return {
          value: child.valueQuantity.value,
          text: String(child.valueQuantity.value),
          path: joinPath(
            focusPath,
            `item[${itemIndex}].extension[${detail.index}].extension[${childIndex}].valueQuantity.value`,
          ),
          source: "focus",
        };
      }
    }
    if (isRec(item.quantity) && typeof item.quantity.value === "number") {
      return {
        value: item.quantity.value,
        text: String(item.quantity.value),
        path: joinPath(focusPath, `item[${itemIndex}].quantity.value`),
        source: "focus",
      };
    }
  }
  const totals = Array.isArray(focus.total) ? focus.total : [];
  for (let totalIndex = 0; totalIndex < totals.length; totalIndex += 1) {
    const total = totals[totalIndex];
    if (!isRec(total)) continue;
    const hit = findExtension(total, "PriorAuthorizationUtilization");
    if (hit && isRec(hit.extension.valueQuantity) && typeof hit.extension.valueQuantity.value === "number") {
      return {
        value: hit.extension.valueQuantity.value,
        text: String(hit.extension.valueQuantity.value),
        path: joinPath(focusPath, `total[${totalIndex}].extension[${hit.index}].valueQuantity.value`),
        source: "focus",
      };
    }
  }
  return null;
}

function collectValidity(focus: Rec, focusPath: string): Extraction["validity"] {
  const items = Array.isArray(focus.item) ? focus.item : [];
  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];
    if (!isRec(item)) continue;
    const authorized = findExtension(item, "extension-itemPreAuthPeriod");
    if (authorized && isRec(authorized.extension.valuePeriod)) {
      return periodField(
        authorized.extension.valuePeriod,
        joinPath(focusPath, `item[${itemIndex}].extension[${authorized.index}].valuePeriod`),
        "authorized-period",
      );
    }
  }
  if (Array.isArray(focus.preAuthRefPeriod) && isRec(focus.preAuthRefPeriod[0])) {
    return periodField(focus.preAuthRefPeriod[0], joinPath(focusPath, "preAuthRefPeriod[0]"), "prior-auth-ref-period");
  }
  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];
    if (!isRec(item)) continue;
    const requested = findExtension(item, "extension-itemRequestedServiceDate");
    if (requested && isRec(requested.extension.valuePeriod)) {
      return periodField(
        requested.extension.valuePeriod,
        joinPath(focusPath, `item[${itemIndex}].extension[${requested.index}].valuePeriod`),
        "requested-service-dates",
      );
    }
  }
  return null;
}

function periodField(
  period: Rec,
  path: string,
  kind: NonNullable<Extraction["validity"]>["kind"],
): Extraction["validity"] {
  return {
    start: typeof period.start === "string" ? period.start : null,
    end: typeof period.end === "string" ? period.end : null,
    path,
    source: "focus",
    kind,
  };
}

function collectAuthId(focus: Rec, focusPath: string): Extraction["authId"] {
  const items = [...(Array.isArray(focus.item) ? focus.item : []), ...(Array.isArray(focus.addItem) ? focus.addItem : [])];
  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];
    if (!isRec(item)) continue;
    const admin = findExtension(item, "extension-administrationReferenceNumber");
    if (admin && typeof admin.extension.valueString === "string") {
      const key = itemIndex < (Array.isArray(focus.item) ? focus.item.length : 0) ? "item" : "addItem";
      const localIndex = key === "item" ? itemIndex : itemIndex - (Array.isArray(focus.item) ? focus.item.length : 0);
      return {
        value: admin.extension.valueString,
        path: joinPath(focusPath, `${key}[${localIndex}].extension[${admin.index}].valueString`),
        source: "focus",
        kind: "administration-reference",
      };
    }
    const adjudications = Array.isArray(item.adjudication) ? item.adjudication : [];
    for (let adjudicationIndex = 0; adjudicationIndex < adjudications.length; adjudicationIndex += 1) {
      const adjudication = adjudications[adjudicationIndex];
      if (!isRec(adjudication)) continue;
      const extensions = extensionsOf(adjudication);
      for (let extensionIndex = 0; extensionIndex < extensions.length; extensionIndex += 1) {
        const extension = extensions[extensionIndex];
        if (!urlIncludes(extension, "extension-reviewAction")) continue;
        const children = extensionsOf(extension);
        const numberIndex = children.findIndex((child) => child.url === "number" && typeof child.valueString === "string");
        if (numberIndex >= 0) {
          const key = itemIndex < (Array.isArray(focus.item) ? focus.item.length : 0) ? "item" : "addItem";
          const localIndex =
            key === "item" ? itemIndex : itemIndex - (Array.isArray(focus.item) ? focus.item.length : 0);
          return {
            value: String(children[numberIndex].valueString),
            path: joinPath(
              focusPath,
              `${key}[${localIndex}].adjudication[${adjudicationIndex}].extension[${extensionIndex}].extension[${numberIndex}].valueString`,
            ),
            source: "focus",
            kind: "review-number",
          };
        }
      }
    }
  }
  return null;
}

function collectTrace(focus: Rec, focusPath: string): Extraction["traceId"] {
  const identifiers = Array.isArray(focus.identifier) ? focus.identifier : [];
  for (let index = 0; index < identifiers.length; index += 1) {
    const identifier = identifiers[index];
    if (isRec(identifier) && typeof identifier.value === "string") {
      return {
        value: identifier.value,
        path: joinPath(focusPath, `identifier[${index}].value`),
        source: "focus",
      };
    }
  }
  return null;
}

function collectErrors(focus: Rec, focusPath: string): Extraction["errors"] {
  const errors = Array.isArray(focus.error) ? focus.error : [];
  const found: Extraction["errors"] = [];
  errors.forEach((error, index) => {
    if (!isRec(error) || !isRec(error.code) || !Array.isArray(error.code.coding)) return;
    let followupCode: string | null = null;
    let followupPath: string | null = null;
    let element: string | null = null;
    let elementPath: string | null = null;
    let location: string | null = null;
    let locationPath: string | null = null;
    extensionsOf(error).forEach((extension, extensionIndex) => {
      const base = joinPath(focusPath, `error[${index}].extension[${extensionIndex}]`);
      if (urlIncludes(extension, "errorFollowupAction")) {
        const coding = firstCoding(extension.valueCodeableConcept);
        if (coding && typeof coding.code === "string") {
          followupCode = coding.code;
          followupPath = `${base}.valueCodeableConcept.coding[0].code`;
        }
      }
      if (urlIncludes(extension, "errorPath") && typeof extension.valueString === "string") {
        location = extension.valueString;
        locationPath = `${base}.valueString`;
      }
      if (urlIncludes(extension, "errorElement")) {
        extensionsOf(extension).forEach((child, childIndex) => {
          if (typeof child.valueString === "string") {
            element = child.valueString;
            elementPath = `${base}.extension[${childIndex}].valueString`;
          }
        });
      }
    });
    error.code.coding.forEach((coding, codingIndex) => {
      if (isRec(coding) && typeof coding.code === "string") {
        found.push({
          code: coding.code,
          path: joinPath(focusPath, `error[${index}].code.coding[${codingIndex}].code`),
          source: "focus",
          followupCode,
          followupPath,
          element,
          elementPath,
          location,
          locationPath,
        });
      }
    });
  });
  return found;
}

function collectDates(
  focus: Rec,
  focusPath: string,
  responseCreated: Extraction["responseCreated"],
  receipt: Extraction["receipt"],
): Extraction["dates"] {
  const dates: Extraction["dates"] = [];
  if (responseCreated) {
    dates.push({
      kind: "response-created",
      point: responseCreated.value,
      start: null,
      end: null,
      path: responseCreated.path,
      source: "focus",
    });
  }
  if (Array.isArray(focus.preAuthRefPeriod)) {
    focus.preAuthRefPeriod.forEach((period, index) => {
      if (!isRec(period)) return;
      dates.push({
        kind: "prior-auth-ref-period",
        point: null,
        start: typeof period.start === "string" ? period.start : null,
        end: typeof period.end === "string" ? period.end : null,
        path: joinPath(focusPath, `preAuthRefPeriod[${index}]`),
        source: "focus",
      });
    });
  }
  for (const key of ["item", "addItem"] as const) {
    const items = Array.isArray(focus[key]) ? (focus[key] as unknown[]) : [];
    items.forEach((item, itemIndex) => {
      if (!isRec(item)) return;
      const itemPath = joinPath(focusPath, `${key}[${itemIndex}]`);
      extensionsOf(item).forEach((extension, index) => {
        const base = joinPath(itemPath, `extension[${index}]`);
        if (urlIncludes(extension, "itemPreAuthIssueDate") && typeof extension.valueDate === "string") {
          dates.push({
            kind: "issue-date",
            point: extension.valueDate,
            start: null,
            end: null,
            path: `${base}.valueDate`,
            source: "focus",
          });
        }
        if (urlIncludes(extension, "dischargeDate") && typeof extension.valueDate === "string") {
          dates.push({
            kind: "discharge",
            point: extension.valueDate,
            start: null,
            end: null,
            path: `${base}.valueDate`,
            source: "focus",
          });
        }
        if (urlIncludes(extension, "itemPreAuthPeriod") && isRec(extension.valuePeriod)) {
          dates.push(periodDate("authorized-period", extension.valuePeriod, `${base}.valuePeriod`));
        }
        if (urlIncludes(extension, "itemRequestedServiceDate") && isRec(extension.valuePeriod)) {
          dates.push(periodDate("requested-service", extension.valuePeriod, `${base}.valuePeriod`));
        }
        if (urlIncludes(extension, "admissionDates") && isRec(extension.valuePeriod)) {
          dates.push(periodDate("admission", extension.valuePeriod, `${base}.valuePeriod`));
        }
      });
      const adjudications = Array.isArray(item.adjudication) ? item.adjudication : [];
      adjudications.forEach((adjudication, adjudicationIndex) => {
        if (!isRec(adjudication)) return;
        extensionsOf(adjudication).forEach((extension, extensionIndex) => {
          const url = String(extension.url ?? "");
          if (!url.includes("when-adjudicated") && !url.includes("whenAdjudicated")) return;
          if (typeof extension.valueDateTime !== "string") return;
          dates.push({
            kind: "adjudicated",
            point: extension.valueDateTime,
            start: null,
            end: null,
            path: joinPath(itemPath, `adjudication[${adjudicationIndex}].extension[${extensionIndex}].valueDateTime`),
            source: "focus",
          });
        });
      });
    });
  }
  if (receipt) {
    dates.push({
      kind: "request-timestamp",
      point: receipt.value,
      start: null,
      end: null,
      path: receipt.path,
      source: receipt.source,
      relatedId: receipt.relatedId,
    });
  }
  return dates.filter((date) => date.point || date.start || date.end);
}

function periodDate(kind: Extraction["dates"][number]["kind"], period: Rec, path: string): Extraction["dates"][number] {
  return {
    kind,
    point: null,
    start: typeof period.start === "string" ? period.start : null,
    end: typeof period.end === "string" ? period.end : null,
    path,
    source: "focus",
  };
}

function firstCoding(value: unknown): Rec | null {
  if (!isRec(value) || !Array.isArray(value.coding)) return null;
  return isRec(value.coding[0]) ? value.coding[0] : null;
}

function findUrgent(focus: Rec, focusPath: string, claim: Located | null): Extraction["urgent"] {
  const places: { resource: Rec; path: string; source: PointerSource; relatedId?: string }[] = [];
  if (claim) {
    places.push({
      resource: claim.resource,
      path: claim.pathPrefix,
      source: claim.source,
      relatedId: claim.relatedId,
    });
  }
  places.push({ resource: focus, path: focusPath, source: "focus" });
  for (const place of places) {
    const hit = findExtension(place.resource, "extension-levelOfServiceCode");
    if (!hit || !isRec(hit.extension.valueCodeableConcept)) continue;
    const coding = Array.isArray(hit.extension.valueCodeableConcept.coding)
      ? hit.extension.valueCodeableConcept.coding[0]
      : null;
    if (!isRec(coding) || coding.code !== "U") continue;
    return {
      code: "U",
      display: typeof coding.display === "string" ? coding.display : null,
      path: joinPath(place.path, `extension[${hit.index}].valueCodeableConcept.coding[0].code`),
      source: place.source,
      relatedId: place.relatedId,
    };
  }
  return null;
}

function findReceipt(claim: Located | null): Extraction["receipt"] {
  if (!claim || typeof claim.resource.created !== "string") return null;
  return {
    value: claim.resource.created,
    path: joinPath(claim.pathPrefix, "created"),
    source: claim.source,
    relatedId: claim.relatedId,
    note: "Claim.created on the prior-authorization request. CMS-0057-F starts the decision clock when the payer receives the request. This demo uses Claim.created only when that element is present, and labels it as the published request timestamp.",
  };
}

function resolvePatient(
  focus: Rec,
  bundleEntries: Located[],
  related: Located[],
): Extraction["patient"] {
  const reference = referenceOf(focus.patient);
  const located = findByReference(bundleEntries, reference) ?? findByReference(related, reference);
  let givenPath: string | null = null;
  let familyPath: string | null = null;
  let label: string | null = null;
  if (located && Array.isArray(located.resource.name) && isRec(located.resource.name[0])) {
    const name = located.resource.name[0];
    const given = Array.isArray(name.given) && typeof name.given[0] === "string" ? name.given[0] : "";
    const family = typeof name.family === "string" ? name.family : "";
    if (given) givenPath = joinPath(located.pathPrefix, "name[0].given[0]");
    if (family) familyPath = joinPath(located.pathPrefix, "name[0].family");
    label = `${given} ${family}`.trim() || null;
  }
  return {
    reference,
    label,
    givenPath,
    familyPath,
    source: located?.source ?? "focus",
  };
}

function resolveInsurer(
  focus: Rec,
  focusPath: string,
  bundleEntries: Located[],
  related: Located[],
): Extraction["insurer"] {
  const reference = referenceOf(focus.insurer);
  if (isRec(focus.insurer) && typeof focus.insurer.display === "string") {
    return {
      reference,
      name: focus.insurer.display,
      path: joinPath(focusPath, "insurer.display"),
      source: "focus",
    };
  }
  const located =
    findByReference(bundleEntries, reference) ??
    findByReference(related, reference) ??
    findByType(bundleEntries, "Organization");
  if (located && typeof located.resource.name === "string") {
    return {
      reference,
      name: located.resource.name,
      path: joinPath(located.pathPrefix, "name"),
      source: located.source,
    };
  }
  return { reference, name: null, path: null, source: "focus" };
}

function readTypeCode(resource: Rec): string | null {
  if (!isRec(resource.type)) return null;
  const coding = Array.isArray(resource.type.coding) ? resource.type.coding[0] : null;
  return isRec(coding) && typeof coding.code === "string" ? coding.code : null;
}

function flattenRelated(related: unknown[]): Located[] {
  const located: Located[] = [];
  related.forEach((entry, index) => {
    if (!isRec(entry)) return;
    if (entry.resourceType === "Bundle" && Array.isArray(entry.entry)) {
      entry.entry.forEach((bundleEntry, entryIndex) => {
        if (!isRec(bundleEntry) || !isRec(bundleEntry.resource)) return;
        const resource = bundleEntry.resource;
        located.push({
          resource,
          pathPrefix: `entry[${entryIndex}].resource`,
          source: "related",
          relatedId: typeof resource.id === "string" ? `${String(resource.resourceType)}/${resource.id}` : `related[${index}]`,
        });
      });
      return;
    }
    located.push({
      resource: entry,
      pathPrefix: "",
      source: "related",
      relatedId:
        typeof entry.id === "string" && typeof entry.resourceType === "string"
          ? `${entry.resourceType}/${entry.id}`
          : `related[${index}]`,
    });
  });
  return located;
}

function findByReference(entries: Located[], reference: string | null): Located | null {
  if (!reference) return null;
  const [type, id] = reference.split("/");
  return (
    entries.find(
      (entry) => entry.resource.resourceType === type && entry.resource.id === id,
    ) ?? null
  );
}

function findByType(entries: Located[], resourceType: string): Located | null {
  return entries.find((entry) => entry.resource.resourceType === resourceType) ?? null;
}

function referenceOf(value: unknown): string | null {
  return isRec(value) && typeof value.reference === "string" ? value.reference : null;
}

function extensionsOf(node: Rec): Rec[] {
  return Array.isArray(node.extension) ? node.extension.filter(isRec) : [];
}

function urlIncludes(extension: Rec, needle: string): boolean {
  return typeof extension.url === "string" && extension.url.includes(needle);
}

function findExtension(node: Rec, needle: string): { extension: Rec; index: number } | null {
  const extensions = extensionsOf(node);
  const index = extensions.findIndex((extension) => urlIncludes(extension, needle));
  if (index < 0) return null;
  return { extension: extensions[index], index };
}

function conceptValuePath(base: string, concept: Rec): string {
  const coding = Array.isArray(concept.coding) ? concept.coding[0] : null;
  if (isRec(coding) && typeof coding.display === "string" && coding.display.trim()) {
    return `${base}.coding[0].display`;
  }
  if (isRec(coding) && typeof coding.code === "string") return `${base}.coding[0].code`;
  if (typeof concept.text === "string") return `${base}.text`;
  return base;
}

function conceptText(value: unknown): string | null {
  if (!isRec(value)) return null;
  if (typeof value.text === "string" && value.text.trim()) return value.text.trim();
  const coding = Array.isArray(value.coding) ? value.coding[0] : null;
  if (!isRec(coding)) return null;
  if (typeof coding.display === "string" && coding.display.trim()) return coding.display.trim();
  if (typeof coding.code === "string") return coding.code;
  return null;
}

function isRec(value: unknown): value is Rec {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
