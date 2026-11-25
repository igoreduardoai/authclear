import type { Decision, Extraction, Pointer } from "./types";

export interface PlainLead {
  text: string;
  pointer: Pointer | null;
}

const LEADS: Record<Decision, { en: string; es: string }> = {
  denied: {
    en: "Your plan did not approve this request.",
    es: "Su plan no aprobó el pedido.",
  },
  pended: {
    en: "Your plan has not decided yet.",
    es: "Su plan aún no decide.",
  },
  approved: {
    en: "Your plan approved this request.",
    es: "Su plan aprobó el pedido.",
  },
  error: {
    en: "The request had an error. It is not a decision.",
    es: "Hubo un error y no es una decisión.",
  },
  mixed: {
    en: "Your plan made different decisions for different items.",
    es: "Su plan dio respuestas distintas para cada parte.",
  },
  unknown: {
    en: "We could not find a decision in this record.",
    es: "No hay una decisión en el registro.",
  },
};

export function leadCatalog(lang: "en" | "es"): string[] {
  return (Object.keys(LEADS) as Decision[]).map((decision) => LEADS[decision][lang]);
}

export function plainLead(extraction: Extraction, lang: "en" | "es"): PlainLead {
  const decision: Decision = extraction.ok ? extraction.decision : "unknown";
  const review = extraction.reviewCodes[0];
  const pointer: Pointer | null = review
    ? { source: "focus", path: review.path, value: review.code }
    : extraction.outcome
      ? { source: extraction.outcome.source, path: extraction.outcome.path, value: extraction.outcome.value }
      : null;
  return { text: LEADS[decision][lang], pointer };
}
