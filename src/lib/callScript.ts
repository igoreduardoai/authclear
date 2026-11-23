import type { Extraction, Pointer } from "./types";

export interface ScriptLine {
  id: string;
  text: string;
  pointer: Pointer | null;
}

export interface CallScript {
  lang: "en" | "es";
  lines: ScriptLine[];
  text: string;
}

const QUESTIONS = {
  en: ["What is the deadline to appeal?", "Can you send me the reason in writing?"],
  es: ["¿Cuál es la fecha límite para apelar?", "¿Me pueden enviar el motivo por escrito?"],
};

export function buildCallScript(extraction: Extraction, lang: "en" | "es"): CallScript {
  if (!extraction.ok) return { lang, lines: [], text: "" };
  const lines: ScriptLine[] = [];
  if (lang === "en") {
    lines.push({ id: "greet", text: "Hi.", pointer: null });
    lines.push({ id: "open", text: "I am calling about a prior authorization.", pointer: null });
    if (extraction.authId) {
      lines.push({
        id: "auth",
        text: `The reference number is ${extraction.authId.value}.`,
        pointer: fieldPointer(extraction.authId),
      });
    }
    if (extraction.responseCreated) {
      lines.push({
        id: "date",
        text: `The letter date is ${extraction.responseCreated.value}.`,
        pointer: fieldPointer(extraction.responseCreated),
      });
    }
    if (extraction.service) {
      lines.push({
        id: "service",
        text: `The service is ${extraction.service.text}.`,
        pointer: {
          source: extraction.service.source,
          path: extraction.service.path,
          value: extraction.service.text,
          relatedId: extraction.service.relatedId,
        },
      });
    }
    extraction.reasons.forEach((reason, index) => {
      lines.push({
        id: `reason-${index}`,
        text: `The reason is ${reason.text}.`,
        pointer: {
          source: reason.source,
          path: reason.path,
          value: reason.text,
          relatedId: reason.relatedId,
        },
      });
    });
    if (extraction.urgent) {
      const shown = extraction.urgent.display ?? extraction.urgent.code;
      lines.push({
        id: "urgent",
        text: `The letter says the request is ${shown}.`,
        pointer: urgentPointer(extraction.urgent, shown),
      });
    }
  } else {
    lines.push({ id: "greet", text: "Hola, llamo por la carta de su plan.", pointer: null });
    if (extraction.authId) {
      lines.push({
        id: "auth",
        text: `El número de la carta es ${extraction.authId.value}.`,
        pointer: fieldPointer(extraction.authId),
      });
    }
    if (extraction.responseCreated) {
      lines.push({
        id: "date",
        text: `La fecha de la carta es ${extraction.responseCreated.value}.`,
        pointer: fieldPointer(extraction.responseCreated),
      });
    }
    if (extraction.service) {
      lines.push({
        id: "service",
        text: `El servicio de la carta es ${extraction.service.text}.`,
        pointer: {
          source: extraction.service.source,
          path: extraction.service.path,
          value: extraction.service.text,
          relatedId: extraction.service.relatedId,
        },
      });
    }
    extraction.reasons.forEach((reason, index) => {
      lines.push({
        id: `reason-${index}`,
        text: `El motivo de la carta es ${reason.text}.`,
        pointer: {
          source: reason.source,
          path: reason.path,
          value: reason.text,
          relatedId: reason.relatedId,
        },
      });
    });
    if (extraction.urgent) {
      const shown = extraction.urgent.display ?? extraction.urgent.code;
      lines.push({
        id: "urgent",
        text: `La carta dice que es ${shown}.`,
        pointer: urgentPointer(extraction.urgent, shown),
      });
    }
  }
  const [deadline, writing] = QUESTIONS[lang];
  lines.push({ id: "ask-deadline", text: deadline, pointer: null });
  lines.push({ id: "ask-writing", text: writing, pointer: null });
  return { lang, lines, text: lines.map((line) => line.text).join(" ") };
}

function fieldPointer(field: { value: string; path: string; source: Pointer["source"]; relatedId?: string }): Pointer {
  return { source: field.source, path: field.path, value: field.value, relatedId: field.relatedId };
}

function urgentPointer(urgent: NonNullable<Extraction["urgent"]>, shown: string): Pointer {
  const path = urgent.display && urgent.path.endsWith(".code") ? urgent.path.replace(/\.code$/, ".display") : urgent.path;
  return { source: urgent.source, path, value: shown, relatedId: urgent.relatedId };
}
