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
  "CMS-0057-F requires impacted payers other than QHP issuers on the Federally-facilitated Exchanges to send a prior-authorization decision as expeditiously as the member's condition requires, and no later than 72 hours for an expedited request or seven calendar days for a standard request. The clock starts when the payer receives the request. The CMS FAQ says response timeliness is measured in calendar time, not business hours. Its example: an expedited request received at 1:00 AM Sunday must receive a response no later than 1:00 AM Wednesday. Some programs allow an extension of up to 14 additional calendar days. This demo does not apply that extension, because the resource does not say an extension was granted. The rule does not apply to drugs. Appeal deadlines are not computed. When this demo shows an expedited due time, it adds 72 hours to Claim.created and keeps the clock time. When it shows a standard due time, it adds 168 hours, which keeps the same clock time seven days later. CMS does not state the words \"168 hours\". Adding 168 hours is not a timezone-database calculation, so a daylight-saving change is unmeasured. Claim.created is the published request timestamp, not proof the payer received the request then.";

export const CAVEAT_ES =
  "CMS-0057-F exige que los pagadores alcanzados, salvo los emisores de QHP en los Federally-facilitated Exchanges, envíen la decisión de autorización previa tan pronto como lo requiera la condición del miembro, y a más tardar en 72 horas si la solicitud es expedita o en siete días calendario si es estándar. El reloj empieza cuando el plan recibe la solicitud. La FAQ de CMS dice que el plazo se mide en tiempo calendario, no en horario laboral. Su ejemplo: una solicitud expedita recibida a la 1:00 AM del domingo debe tener respuesta a más tardar a la 1:00 AM del miércoles. Algunos programas permiten una extensión de hasta 14 días calendario. Esta demo no aplica esa extensión, porque el recurso no dice que se haya concedido. La regla no aplica a medicamentos. No se calculan plazos de apelación. Si la solicitud es expedita, esta demo suma 72 horas a Claim.created y conserva la hora. Si es estándar, suma 168 horas, que conserva la misma hora siete días después. CMS no declara las palabras \"168 hours\". Sumar 168 horas no usa una base de zonas horarias, así que un cambio de horario de verano queda sin medir. Claim.created es la marca de tiempo publicada de la solicitud, no una prueba de recepción.";

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
