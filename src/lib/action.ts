import { deadlineFor, type Deadline } from "./deadline";
import type { Extraction } from "./types";

export interface NextAction {
  type: string;
  ownerRole: string;
  ownerDisplay: string;
  summaryEn: string;
  summaryEs: string;
  deadline: Deadline;
}

const NAVIGATOR = "Member services navigator";
const OPERATIONS = "Prior authorization operations";

export function nextAction(extraction: Extraction): NextAction {
  const deadline = deadlineFor(extraction);
  if (!extraction.ok) {
    return {
      type: "fix-unreadable-input",
      ownerRole: "prior-auth-operations",
      ownerDisplay: OPERATIONS,
      summaryEn: "The input is not a readable prior-authorization resource. Do not tell the member a decision.",
      summaryEs: "La entrada no es un recurso de autorización previa legible. No le diga al miembro que hay una decisión.",
      deadline,
    };
  }
  switch (extraction.decision) {
    case "pended":
      return {
        type: "track-pending-decision",
        ownerRole: "member-services-navigator",
        ownerDisplay: NAVIGATOR,
        summaryEn: pendingSummary(deadline, "en"),
        summaryEs: pendingSummary(deadline, "es"),
        deadline,
      };
    case "denied":
      return {
        type: "explain-denial-ask-appeal-deadline",
        ownerRole: "member-services-navigator",
        ownerDisplay: NAVIGATOR,
        summaryEn:
          "Tell the member the review action and any reason printed on the resource. Ask the plan what the appeal deadline is. Do not invent that date.",
        summaryEs:
          "Dígale al miembro la acción de revisión y cualquier motivo que esté escrito en el recurso. Pregunte al plan cuál es la fecha límite de apelación. No invente esa fecha.",
        deadline,
      };
    case "approved":
      return {
        type: "confirm-approved-service",
        ownerRole: "member-services-navigator",
        ownerDisplay: NAVIGATOR,
        summaryEn:
          "Tell the member the review action is certified, and read any period or quantity printed on the resource.",
        summaryEs:
          "Dígale al miembro que la acción de revisión está certificada, y lea cualquier período o cantidad impresa en el recurso.",
        deadline,
      };
    case "error":
      return {
        type: "return-submission-error",
        ownerRole: "prior-auth-operations",
        ownerDisplay: OPERATIONS,
        summaryEn: "Return the submission error codes to the requesting system. Do not describe this resource as a denial.",
        summaryEs:
          "Devuelva los códigos de error de envío al sistema que hizo la solicitud. No describa este recurso como una negativa.",
        deadline,
      };
    case "mixed":
      return {
        type: "review-each-item",
        ownerRole: "member-services-navigator",
        ownerDisplay: NAVIGATOR,
        summaryEn: "Review each item with the member. Do not collapse mixed review actions into one approve or deny.",
        summaryEs:
          "Revise cada ítem con el miembro. No convierta acciones de revisión mixtas en un solo aprobado o negado.",
        deadline,
      };
    default:
      return {
        type: "request-review-action-code",
        ownerRole: "member-services-navigator",
        ownerDisplay: NAVIGATOR,
        summaryEn: "Do not infer a decision from the outcome field alone. Ask the plan for the X12 review action code.",
        summaryEs:
          "No infiera una decisión solo con el campo outcome. Pida al plan el código X12 de acción de revisión.",
        deadline,
      };
  }
}

function pendingSummary(deadline: Deadline, lang: "en" | "es"): string {
  if (deadline.ruleId === "excluded-drugs") {
    return lang === "en"
      ? "Tell the member the request is still pending. The CMS-0057-F item-and-service decision clock does not apply to drugs. Ask the plan which deadline applies."
      : "Dígale al miembro que la solicitud sigue pendiente. El reloj de CMS-0057-F para ítems y servicios no aplica a medicamentos. Pregunte al plan qué plazo corresponde.";
  }
  if (deadline.ruleId === "insufficient-data" || !deadline.due) {
    return lang === "en"
      ? "Tell the member the request is still pending. This resource has no Claim.created receipt time, so AuthClear does not compute a deadline."
      : "Dígale al miembro que la solicitud sigue pendiente. Este recurso no tiene Claim.created como hora de recepción, así que AuthClear no calcula un plazo.";
  }
  const window = deadline.ruleId === "cms-0057-f-expedited-72h" ? "72-hour" : "seven-calendar-day";
  const windowEs = deadline.ruleId === "cms-0057-f-expedited-72h" ? "72 horas" : "siete días calendario";
  return lang === "en"
    ? `Tell the member the request is still pending and track the CMS-0057-F ${window} maximum, which lands at ${deadline.due} if Claim.created is the receipt time and the payer is in scope.`
    : `Dígale al miembro que la solicitud sigue pendiente y controle el máximo de CMS-0057-F de ${windowEs}, que cae en ${deadline.due} si Claim.created es la hora de recepción y el pagador está dentro del alcance.`;
}
