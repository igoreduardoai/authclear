export type Decision = "approved" | "denied" | "pended" | "error" | "mixed" | "unknown";

export type PointerSource = "focus" | "related";

export interface Pointer {
  source: PointerSource;
  path: string;
  value?: string;
  absent?: string;
  relatedId?: string;
}

export interface ReviewCode {
  code: string;
  display: string | null;
  path: string;
  source: PointerSource;
  itemSequence: number | null;
  sequencePath: string | null;
}

export interface MappedDate {
  kind:
    | "response-created"
    | "request-timestamp"
    | "issue-date"
    | "authorized-period"
    | "requested-service"
    | "prior-auth-ref-period"
    | "admission"
    | "discharge"
    | "adjudicated";
  point: string | null;
  start: string | null;
  end: string | null;
  path: string;
  source: PointerSource;
  relatedId?: string;
}

export interface MappedError {
  code: string;
  path: string;
  source: PointerSource;
  followupCode: string | null;
  followupPath: string | null;
  element: string | null;
  elementPath: string | null;
  location: string | null;
  locationPath: string | null;
}

export interface SourcedText {
  text: string;
  path: string;
  source: PointerSource;
  relatedId?: string;
}

export interface Extraction {
  ok: boolean;
  problems: string[];
  resourceType: string | null;
  profile: string | null;
  focusId: string | null;
  focusPath: string;
  focusReference: string | null;
  decision: Decision;
  status: { value: string; path: string; source: PointerSource } | null;
  reviewCodes: ReviewCode[];
  outcome: { value: string; path: string; source: PointerSource } | null;
  outcomeAgrees: boolean | null;
  reasons: SourcedText[];
  service: SourcedText | null;
  units: { text: string; value: number; path: string; source: PointerSource } | null;
  validity: {
    start: string | null;
    end: string | null;
    path: string;
    source: PointerSource;
    kind: "authorized-period" | "prior-auth-ref-period" | "requested-service-dates";
  } | null;
  authId: {
    value: string;
    path: string;
    source: PointerSource;
    kind: "review-number" | "administration-reference";
  } | null;
  traceId: { value: string; path: string; source: PointerSource } | null;
  urgent: {
    code: string;
    display: string | null;
    path: string;
    source: PointerSource;
    relatedId?: string;
  } | null;
  receipt: {
    value: string;
    path: string;
    source: PointerSource;
    relatedId?: string;
    note: string;
  } | null;
  responseCreated: { value: string; path: string; source: PointerSource } | null;
  dates: MappedDate[];
  patient: {
    reference: string | null;
    label: string | null;
    givenPath: string | null;
    familyPath: string | null;
    source: PointerSource;
  };
  insurer: {
    reference: string | null;
    name: string | null;
    path: string | null;
    source: PointerSource;
  };
  claimJoinedFromCatalog: boolean;
  errors: MappedError[];
  claimType: string | null;
  drugsExcluded: boolean;
}
