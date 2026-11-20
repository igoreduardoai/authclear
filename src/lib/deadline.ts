import type { Extraction } from "./types";

export type DeadlineRuleId =
  | "cms-0057-f-expedited-72h"
  | "cms-0057-f-standard-7-calendar-days"
  | "not-applicable"
  | "insufficient-data"
  | "excluded-drugs";

export interface Deadline {
  due: string | null;
  ruleId: DeadlineRuleId;
  caveatEn: string;
  caveatEs: string;
}

export const CAVEAT_EN =
  "CMS-0057-F requires impacted payers other than QHP issuers on the Federally-facilitated Exchanges to send a prior-authorization decision as expeditiously as the member's condition requires, and no later than 72 hours for an expedited request or seven calendar days for a standard request. The clock starts when the payer receives the request. Some programs allow an extension of up to 14 additional calendar days. The rule does not apply to drugs. When this demo shows a due time, it adds 72 hours or 168 hours to Claim.created and labels that element as the published request timestamp, not as proof the payer received it then.";

export const CAVEAT_ES =
  "CMS-0057-F exige que los pagadores alcanzados, salvo los emisores de QHP en los Federally-facilitated Exchanges, envíen la decisión de autorización previa tan pronto como lo requiera la condición del miembro, y a más tardar en 72 horas si la solicitud es expedita o en siete días calendario si es estándar. El reloj empieza cuando el plan recibe la solicitud. Algunos programas permiten una extensión de hasta 14 días calendario. La regla no aplica a medicamentos. Si esta demo muestra un vencimiento, suma 72 o 168 horas a Claim.created y trata ese dato como la marca de tiempo publicada de la solicitud, no como prueba de recepción.";

/** Add whole hours to an ISO-8601 timestamp and keep its original offset. */
export function addHours(iso: string, hours: number): string {
  const match = iso.match(/([+-]\d{2}:\d{2}|Z)$/);
  const offset = match?.[1] ?? "Z";
  const instant = Date.parse(iso);
  if (Number.isNaN(instant)) {
    throw new Error(`Cannot parse timestamp: ${iso}`);
  }
  const next = instant + hours * 3_600_000;
  if (offset === "Z") {
    return new Date(next).toISOString().replace(".000Z", "Z");
  }
  const sign = offset.startsWith("-") ? -1 : 1;
  const [hourPart, minutePart] = offset.slice(1).split(":");
  const offsetMinutes = sign * (Number(hourPart) * 60 + Number(minutePart));
  const shifted = new Date(next + offsetMinutes * 60_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}${offset}`
  );
}

export function deadlineFor(extraction: Extraction): Deadline {
  if (!extraction.ok || extraction.decision !== "pended") {
    return { due: null, ruleId: "not-applicable", caveatEn: CAVEAT_EN, caveatEs: CAVEAT_ES };
  }
  if (extraction.drugsExcluded) {
    return { due: null, ruleId: "excluded-drugs", caveatEn: CAVEAT_EN, caveatEs: CAVEAT_ES };
  }
  if (!extraction.receipt) {
    return { due: null, ruleId: "insufficient-data", caveatEn: CAVEAT_EN, caveatEs: CAVEAT_ES };
  }
  const expedited = extraction.urgent?.code === "U";
  return {
    due: addHours(extraction.receipt.value, expedited ? 72 : 168),
    ruleId: expedited ? "cms-0057-f-expedited-72h" : "cms-0057-f-standard-7-calendar-days",
    caveatEn: CAVEAT_EN,
    caveatEs: CAVEAT_ES,
  };
}
