import type { Extraction, Pointer } from "./types";

export interface Sentence {
  id: string;
  text: string;
  pointers: Pointer[];
}

export interface Notice {
  lang: "en" | "es";
  headline: string;
  kicker: string;
  sentences: Sentence[];
}

const KICKER: Record<Extraction["decision"] | "unreadable", { en: string; es: string }> = {
  approved: { en: "Grouped as approved", es: "Agrupado como aprobado" },
  denied: { en: "Grouped as a denial", es: "Agrupado como negativa" },
  pended: { en: "Grouped as pending", es: "Agrupado como pendiente" },
  error: { en: "Submission error, not a decision", es: "Error de envío, no es una decisión" },
  mixed: { en: "Mixed review actions", es: "Acciones de revisión mixtas" },
  unknown: { en: "No review action code", es: "Sin código de acción de revisión" },
  unreadable: { en: "Input blocked", es: "Entrada bloqueada" },
};

export function buildNotice(extraction: Extraction, lang: "en" | "es"): Notice {
  if (!extraction.ok) {
    return {
      lang,
      headline: lang === "en" ? "Cannot read" : "No se puede leer",
      kicker: KICKER.unreadable[lang],
      sentences: [
        {
          id: "unreadable",
          text:
            lang === "en"
              ? `This input cannot be read as a prior-authorization resource. ${extraction.problems[0] ?? ""}`.trim()
              : `Esta entrada no se puede leer como un recurso de autorización previa. ${extraction.problems[0] ?? ""}`.trim(),
          pointers: [],
        },
      ],
    };
  }

  const sentences: Sentence[] = [];
  const seen = new Set<string>();
  for (const review of extraction.reviewCodes) {
    const key = `${review.itemSequence ?? ""}|${review.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const displayPath = review.path.endsWith(".code") ? review.path.replace(/\.code$/, ".display") : null;
    const sequencePath = itemSequencePath(review.path);
    const pointers: Pointer[] = [{ source: "focus", path: review.path, value: review.code }];
    if (review.display && displayPath) {
      pointers.push({ source: "focus", path: displayPath, value: review.display });
    }
    const itemBit = review.itemSequence != null && sequencePath ? ` on item ${review.itemSequence}` : "";
    const itemBitEs = review.itemSequence != null && sequencePath ? ` en el ítem ${review.itemSequence}` : "";
    if (review.itemSequence != null && sequencePath) {
      pointers.push({ source: "focus", path: sequencePath, value: String(review.itemSequence) });
    }
    const displayEn = review.display ? `, displayed as ${review.display}` : "";
    const displayEs = review.display ? `, con el texto ${review.display}` : "";
    sentences.push({
      id: `review-${key}`,
      text:
        lang === "en"
          ? `The review action code${itemBit} is ${review.code}${displayEn}.`
          : `El código de acción de revisión${itemBitEs} es ${review.code}${displayEs}.`,
      pointers,
    });
  }

  if (extraction.outcome && extraction.outcomeAgrees === false && extraction.reviewCodes[0]) {
    const code = extraction.reviewCodes[0];
    sentences.push({
      id: "outcome-conflict",
      text:
        lang === "en"
          ? `The outcome field is ${extraction.outcome.value}. The review action code is ${code.code}. AuthClear uses the review action code.`
          : `El campo outcome es ${extraction.outcome.value}. El código de acción de revisión es ${code.code}. AuthClear usa el código de acción de revisión.`,
      pointers: [
        { source: "focus", path: extraction.outcome.path, value: extraction.outcome.value },
        { source: "focus", path: code.path, value: code.code },
      ],
    });
  } else if (extraction.outcome && extraction.reviewCodes.length === 0) {
    sentences.push({
      id: "outcome-only",
      text:
        lang === "en"
          ? `The outcome field is ${extraction.outcome.value}. This resource has no review action code.`
          : `El campo outcome es ${extraction.outcome.value}. Este recurso no tiene código de acción de revisión.`,
      pointers: [{ source: "focus", path: extraction.outcome.path, value: extraction.outcome.value }],
    });
  }

  if (extraction.reasons.length === 0 && extraction.decision !== "error") {
    const anchor = extraction.reviewCodes[0];
    sentences.push({
      id: "reason-missing",
      text:
        lang === "en"
          ? "This example does not include a specific reason."
          : "Este ejemplo no incluye un motivo específico.",
      pointers: anchor
        ? [{ source: "focus", path: anchor.path, value: anchor.code, absent: "reason" }]
        : extraction.outcome
          ? [{ source: "focus", path: extraction.outcome.path, value: extraction.outcome.value, absent: "reason" }]
          : [],
    });
  }
  extraction.reasons.forEach((reason, index) => {
    sentences.push({
      id: `reason-${index}`,
      text:
        lang === "en"
          ? `The reason text on the resource is ${reason.text}.`
          : `El texto del motivo en el recurso es ${reason.text}.`,
      pointers: [{ source: reason.source, path: reason.path, value: reason.text, relatedId: reason.relatedId }],
    });
  });

  if (extraction.service) {
    sentences.push({
      id: "service",
      text:
        lang === "en"
          ? `The service text on the resource is ${extraction.service.text}.`
          : `El texto del servicio en el recurso es ${extraction.service.text}.`,
      pointers: [{ source: "focus", path: extraction.service.path, value: extraction.service.text }],
    });
  }
  if (extraction.units) {
    sentences.push({
      id: "units",
      text:
        lang === "en"
          ? `The quantity on the resource is ${extraction.units.text}.`
          : `La cantidad en el recurso es ${extraction.units.text}.`,
      pointers: [{ source: "focus", path: extraction.units.path, value: extraction.units.text }],
    });
  }
  if (extraction.validity && (extraction.validity.start || extraction.validity.end)) {
    const label = validityLabel(extraction.validity.kind, lang);
    const start = extraction.validity.start ?? "";
    const end = extraction.validity.end ?? "";
    const pointers: Pointer[] = [];
    if (extraction.validity.start) {
      pointers.push({
        source: "focus",
        path: `${extraction.validity.path}.start`,
        value: extraction.validity.start,
      });
    }
    if (extraction.validity.end) {
      pointers.push({ source: "focus", path: `${extraction.validity.path}.end`, value: extraction.validity.end });
    }
    sentences.push({
      id: "validity",
      text:
        lang === "en"
          ? `The ${label} on the resource is ${start} through ${end}.`
          : `El ${label} en el recurso va de ${start} a ${end}.`,
      pointers,
    });
  }
  if (extraction.authId) {
    const noun = extraction.authId.kind === "review-number" ? "review number" : "administration reference";
    const nounEs =
      extraction.authId.kind === "review-number" ? "número de revisión" : "referencia de administración";
    sentences.push({
      id: "auth-id",
      text:
        lang === "en"
          ? `The ${noun} on the resource is ${extraction.authId.value}.`
          : `El ${nounEs} en el recurso es ${extraction.authId.value}.`,
      pointers: [{ source: "focus", path: extraction.authId.path, value: extraction.authId.value }],
    });
  }
  extraction.errors.forEach((error, index) => {
    sentences.push({
      id: `error-${index}`,
      text:
        lang === "en"
          ? `The resource includes error code ${error.code}.`
          : `El recurso incluye el código de error ${error.code}.`,
      pointers: [{ source: "focus", path: error.path, value: error.code }],
    });
  });
  if (extraction.urgent) {
    const where =
      extraction.urgent.source === "related"
        ? lang === "en"
          ? "On the referenced Claim example, the "
          : "En el ejemplo de Claim referenciado, el "
        : lang === "en"
          ? "The "
          : "El ";
    const display = extraction.urgent.display ? `, displayed as ${extraction.urgent.display}` : "";
    const displayEs = extraction.urgent.display ? `, con el texto ${extraction.urgent.display}` : "";
    const pointers: Pointer[] = [
      {
        source: extraction.urgent.source,
        path: extraction.urgent.path,
        value: extraction.urgent.code,
        relatedId: extraction.urgent.relatedId,
      },
    ];
    if (extraction.urgent.display) {
      const displayPath = extraction.urgent.path.endsWith(".code")
        ? extraction.urgent.path.replace(/\.code$/, ".display")
        : extraction.urgent.path;
      pointers.push({
        source: extraction.urgent.source,
        path: displayPath,
        value: extraction.urgent.display,
        relatedId: extraction.urgent.relatedId,
      });
    }
    sentences.push({
      id: "urgent",
      text:
        lang === "en"
          ? `${where}level of service code is ${extraction.urgent.code}${display}.`
          : `${where}código de nivel de servicio es ${extraction.urgent.code}${displayEs}.`,
      pointers,
    });
  }
  if (extraction.patient.label && extraction.patient.givenPath && extraction.patient.familyPath) {
    const given = extraction.patient.label.split(" ")[0] ?? "";
    const family = extraction.patient.label.split(" ").slice(1).join(" ");
    sentences.push({
      id: "patient",
      text:
        lang === "en"
          ? `The example patient name is ${extraction.patient.label}.`
          : `El nombre del paciente de ejemplo es ${extraction.patient.label}.`,
      pointers: [
        { source: extraction.patient.source, path: extraction.patient.givenPath, value: given },
        { source: extraction.patient.source, path: extraction.patient.familyPath, value: family },
      ],
    });
  }
  if (extraction.insurer.name && extraction.insurer.path) {
    sentences.push({
      id: "insurer",
      text:
        lang === "en"
          ? `The example insurer name is ${extraction.insurer.name}.`
          : `El nombre del asegurador de ejemplo es ${extraction.insurer.name}.`,
      pointers: [{ source: extraction.insurer.source, path: extraction.insurer.path, value: extraction.insurer.name }],
    });
  }

  return {
    lang,
    headline: headlineFor(extraction),
    kicker: KICKER[extraction.decision][lang],
    sentences,
  };
}

function headlineFor(extraction: Extraction): string {
  if (extraction.decision === "error") return "Error";
  if (extraction.decision === "mixed") return "Mixed";
  if (extraction.decision === "unknown") return "Unknown";
  return extraction.reviewCodes[0]?.display ?? extraction.reviewCodes[0]?.code ?? extraction.decision;
}

function validityLabel(kind: NonNullable<Extraction["validity"]>["kind"], lang: "en" | "es"): string {
  if (kind === "authorized-period") return lang === "en" ? "authorized period" : "período autorizado";
  if (kind === "prior-auth-ref-period") {
    return lang === "en" ? "prior-authorization reference period" : "período de referencia de la autorización previa";
  }
  return lang === "en" ? "requested service dates" : "período de servicio solicitado";
}

function itemSequencePath(codePath: string): string | null {
  const match = codePath.match(/^(.*?item\[\d+\])/);
  return match ? `${match[1]}.itemSequence` : null;
}

export function noticePlainText(notice: Notice): string {
  return notice.sentences.map((sentence) => sentence.text).join(" ");
}
