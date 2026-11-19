import type { NextAction } from "./action";
import type { Extraction } from "./types";
import { noticePlainText, type Notice } from "./explain";

export interface Exports {
  task: Record<string, unknown>;
  csv: string;
  letterHtml: string;
  dryRun: Record<string, unknown>;
}

export function buildExports(extraction: Extraction, action: NextAction, notice: Notice): Exports {
  const task = buildTask(extraction, action);
  return {
    task,
    csv: buildCsv(extraction, action),
    letterHtml: buildLetter(extraction, action, notice),
    dryRun: {
      channel: "dry-run",
      delivered: false,
      reason: "AuthClear does not send email or SMS.",
      to: "member-services-queue",
      subject: `Prior authorization ${extraction.focusReference ?? "example"}`,
      body: action.summaryEn,
    },
  };
}

export function buildTask(extraction: Extraction, action: NextAction): Record<string, unknown> {
  const task: Record<string, unknown> = {
    resourceType: "Task",
    id: `authclear-${slug(extraction.focusId ?? "input")}`,
    text: {
      status: "generated",
      div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${escapeHtml(action.summaryEn)}</p></div>`,
    },
    status: "requested",
    intent: "order",
    priority: extraction.urgent?.code === "U" && extraction.decision !== "approved" ? "urgent" : "routine",
    code: {
      coding: [
        {
          system: "http://example.org/authclear-action",
          code: action.type,
        },
      ],
      text: action.summaryEn,
    },
    description: action.summaryEn,
    focus: extraction.focusReference ? { reference: extraction.focusReference } : undefined,
    for: extraction.patient.reference
      ? {
          reference: extraction.patient.reference,
          display: extraction.patient.label ?? undefined,
        }
      : undefined,
    owner: { display: `${action.ownerDisplay} (role queue, not a named person)` },
    performerType: [{ text: action.ownerRole }],
    authoredOn: extraction.responseCreated?.value,
    input: [
      { type: { text: "Decision group" }, valueString: extraction.decision },
      extraction.authId
        ? { type: { text: "Review number" }, valueString: extraction.authId.value }
        : undefined,
      extraction.focusReference
        ? { type: { text: "Source reference" }, valueString: extraction.focusReference }
        : undefined,
      action.deadline.due
        ? { type: { text: "Decision-clock maximum" }, valueString: action.deadline.due }
        : undefined,
      { type: { text: "Rule" }, valueString: action.deadline.ruleId },
    ].filter(Boolean),
  };
  if (action.deadline.due) {
    task.restriction = { period: { end: action.deadline.due } };
  }
  return stripUndefined(task);
}

export function buildCsv(extraction: Extraction, action: NextAction): string {
  const header = ["member_ref", "auth_id", "decision", "action", "owner", "due", "source_reference"];
  const row = [
    extraction.patient.reference ?? "",
    extraction.authId?.value ?? "",
    extraction.decision,
    action.type,
    action.ownerRole,
    action.deadline.due ?? "",
    extraction.focusReference ?? "",
  ];
  return `${header.join(",")}\n${row.map(csvCell).join(",")}\n`;
}

export function buildLetter(extraction: Extraction, action: NextAction, notice: Notice): string {
  const paragraphs = notice.sentences.map((sentence) => `<p>${escapeHtml(sentence.text)}</p>`).join("\n");
  const due = action.deadline.due
    ? `<p><strong>Due:</strong> ${escapeHtml(action.deadline.due)} (${escapeHtml(action.deadline.ruleId)})</p>`
    : "<p><strong>Due:</strong> no decision-clock time is computed for this resource.</p>";
  return `<!DOCTYPE html>
<html lang="${notice.lang}">
<head>
<meta charset="utf-8"/>
<title>AuthClear member letter</title>
</head>
<body>
<p><strong>Synthetic / HL7-published example data — no real members.</strong></p>
<p>Source: ${escapeHtml(extraction.focusReference ?? "unreadable input")}</p>
<h1>${escapeHtml(notice.headline)}</h1>
<p>${escapeHtml(notice.kicker)}</p>
${paragraphs}
<h2>Next action for the navigator</h2>
<p>${escapeHtml(action.summaryEn)}</p>
<p><strong>Owner:</strong> ${escapeHtml(action.ownerDisplay)}</p>
${due}
<p>${escapeHtml(action.deadline.caveatEn)}</p>
<p>Spanish text in this prototype has not been reviewed by a native speaker. This letter is not a coverage decision, clinical advice, or legal advice. AuthClear did not contact a plan or a member.</p>
<p>Notice text: ${escapeHtml(noticePlainText(notice))}</p>
</body>
</html>
`;
}

function slug(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 64);
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
