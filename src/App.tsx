import { useMemo, useState } from "react";
import { CASES, caseById, type DemoCase } from "./lib/cases";
import { nextAction } from "./lib/action";
import { buildNotice } from "./lib/explain";
import { extract } from "./lib/extract";
import { buildExports } from "./lib/task";
import type { Pointer } from "./lib/types";
import { JsonTree } from "./components/JsonTree";
import summary from "./generated/eval-summary.json";
import validatorReportJson from "../validation/summary.json";

interface ValidatorReport {
  ran: boolean;
  version: string;
  results: { file: string; errors: number; warnings: number; fatals: number }[];
}

const validatorReport = validatorReportJson as ValidatorReport;

type Lang = "en" | "es";

export function App() {
  const [caseId, setCaseId] = useState("denied");
  const [lang, setLang] = useState<Lang>("en");
  const [pointer, setPointer] = useState<Pointer | null>(null);
  const demo = caseById(caseId);
  const view = useMemo(() => buildView(demo, lang), [demo, lang]);

  return (
    <>
      <a className="skip" href="#decision">
        Skip to decision
      </a>
      <header className="top">
        <p className="eyebrow">Patient Access prototype · no login</p>
        <h1>AuthClear</h1>
        <p className="lede">
          Prior-authorization decisions members can understand, and a next action a navigator can export.
        </p>
        <p className="banner">
          Synthetic / HL7-published example data — no real members. Not a coverage decision, clinical advice, or legal
          advice.
        </p>
      </header>
      <main>
        <div className="controls">
          <div role="tablist" aria-label="Example cases">
            {CASES.filter((entry) => entry.group === "primary").map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`tab-${entry.id}`}
                aria-selected={entry.id === caseId}
                aria-controls="case-panel"
                onClick={() => {
                  setCaseId(entry.id);
                  setPointer(null);
                }}
              >
                {entry.tab}
              </button>
            ))}
          </div>
          <label className="more">
            More published examples
            <select
              value={CASES.some((entry) => entry.id === caseId && entry.group === "more") ? caseId : ""}
              onChange={(event) => {
                if (event.target.value) {
                  setCaseId(event.target.value);
                  setPointer(null);
                }
              }}
            >
              <option value="">Choose</option>
              {CASES.filter((entry) => entry.group === "more").map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.tab}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section id="decision" className={`decision decision-${view.extraction.decision}`} aria-live="polite">
          <p className="kicker">{view.notice.kicker}</p>
          <h2>{view.notice.headline}</h2>
          {view.conflict ? <p className="conflict">{view.conflict.text}</p> : null}
          <div className="action">
            <h3>Next action</h3>
            <p>{lang === "es" ? view.action.summaryEs : view.action.summaryEn}</p>
            <dl>
              <div>
                <dt>Owner</dt>
                <dd>{view.action.ownerDisplay}</dd>
              </div>
              <div>
                <dt>Decision-clock maximum</dt>
                <dd>{view.action.deadline.due ?? `Not computed (${view.action.deadline.ruleId})`}</dd>
              </div>
              <div>
                <dt>Rule</dt>
                <dd>{view.action.deadline.ruleId}</dd>
              </div>
            </dl>
          </div>
        </section>

        <div
          id="case-panel"
          role="tabpanel"
          aria-labelledby={demo.group === "primary" ? `tab-${demo.id}` : undefined}
          aria-label={demo.group === "more" ? demo.tab : undefined}
          className="columns"
        >
          <section aria-label="FHIR resource">
            <h3>FHIR resource</h3>
            <p className="meta">
              <a href={demo.sourceUrl}>{demo.sourceLabel}</a>
            </p>
            <p className="meta">{validatorLine(demo.validatorFile)}</p>
            <p className="meta">
              In-browser structural read: {view.extraction.ok ? "read a prior-authorization resource" : "blocked"}
              {view.extraction.profile ? ` · ${view.extraction.profile}` : ""}
            </p>
            {demo.joinNote ? <p className="meta">{demo.joinNote}</p> : null}
            <JsonTree value={demo.resource} activePath={pointer?.source === "focus" ? pointer.path : null} />
            {demo.related.map((related) => (
              <details key={related.relatedId}>
                <summary>{related.label}</summary>
                <JsonTree
                  value={related.resource}
                  activePath={
                    pointer?.source === "related" && pointer.relatedId === related.relatedId ? pointer.path : null
                  }
                />
              </details>
            ))}
          </section>

          <section aria-label="Member notice">
            <div className="section-head">
              <h3>Member notice</h3>
              <div role="group" aria-label="Notice language">
                <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
                  English
                </button>
                <button type="button" aria-pressed={lang === "es"} onClick={() => setLang("es")}>
                  Español
                </button>
              </div>
            </div>
            <p className="meta">Each sentence points at the field it uses. Select a sentence to mark that field.</p>
            <ol className="sentences">
              {view.notice.sentences.map((sentence) => (
                <li key={sentence.id}>
                  <button
                    type="button"
                    className={pointer && sentence.pointers.some((item) => samePointer(item, pointer)) ? "on" : ""}
                    onClick={() => setPointer(sentence.pointers[0] ?? null)}
                  >
                    <span lang={lang}>{sentence.text}</span>
                    {sentence.pointers.length > 0 ? (
                      <code>{sentence.pointers.map((item) => item.path).join(" · ")}</code>
                    ) : (
                      <code>no FHIR path — input is not a resource</code>
                    )}
                  </button>
                </li>
              ))}
            </ol>
            {view.extraction.patient.label ? (
              <p className="meta">The patient name is copied from the published example. It is not a real member.</p>
            ) : null}
            {view.extraction.insurer.name ? (
              <p className="meta">The insurer name is copied from the published example. It is not a customer or partner.</p>
            ) : null}
            <p className="meta">Spanish text has not been reviewed by a native speaker.</p>
          </section>

          <section aria-label="Navigator task">
            <h3>Navigator task</h3>
            <p>{view.action.summaryEn}</p>
            <div className="downloads">
              <button type="button" onClick={() => downloadJson(`task-${demo.id}.json`, view.exports.task)}>
                Download Task JSON
              </button>
              <button type="button" onClick={() => downloadText(`queue-${demo.id}.csv`, view.exports.csv, "text/csv")}>
                Download queue CSV
              </button>
              <button
                type="button"
                onClick={() => downloadText(`letter-${demo.id}.html`, view.exports.letterHtml, "text/html")}
              >
                Download member letter
              </button>
              <button type="button" onClick={() => downloadJson(`source-${demo.id}.json`, demo.resource)}>
                Download source FHIR
              </button>
              <button type="button" onClick={() => downloadJson(`dry-run-${demo.id}.json`, view.exports.dryRun)}>
                Download dry-run notification
              </button>
            </div>
            <details>
              <summary>How the deadline was calculated</summary>
              <p>{lang === "es" ? view.action.deadline.caveatEs : view.action.deadline.caveatEn}</p>
            </details>
            <details>
              <summary>Task preview</summary>
              <JsonTree value={view.exports.task} activePath={null} />
            </details>
          </section>
        </div>

        <section className="eval" aria-label="Internal evaluation">
          <h2>Internal evaluation</h2>
          <p>{summary.label}</p>
          <dl>
            <div>
              <dt>Official HL7 examples, decision</dt>
              <dd>
                AuthClear {summary.officialAuthclear}. Baseline that trusts outcome alone {summary.officialBaseline}.
              </dd>
            </div>
            <div>
              <dt>Synthetic holdout, decision</dt>
              <dd>
                AuthClear {(summary.holdoutDecision * 100).toFixed(1)}% of {summary.holdoutCount}. Baseline{" "}
                {(summary.holdoutBaselineDecision * 100).toFixed(1)}%. Dev set: {summary.devCount}. Seed {summary.seed}.
              </dd>
            </div>
            <div>
              <dt>Notice pointers</dt>
              <dd>
                Coverage {(summary.pointerCoverage * 100).toFixed(1)}%. Unsupported-value findings{" "}
                {summary.unsupportedValueFindings}.
              </dd>
            </div>
            <div>
              <dt>Flesch-Kincaid, English denial notice</dt>
              <dd>
                {summary.denialNoticeGrade?.toFixed(1) ?? "n/a"}. Published narrative in that file, tags removed:{" "}
                {summary.denialNarrativeGrade?.toFixed(1) ?? "n/a"}.
              </dd>
            </div>
            <div>
              <dt>Pending decision-clock due times</dt>
              <dd>{summary.pendedDue} matched the written rule.</dd>
            </div>
          </dl>
          <p>
            <a href="./RESULTS.md">Full evaluation report</a>
            {" · "}
            <a href="./health.json">Health</a>
          </p>
        </section>
      </main>
      <footer>
        <p>
          AuthClear is a prototype by Igor Eduardo. It does not send email or SMS. The dry-run file is a payload only.
        </p>
      </footer>
    </>
  );
}

function buildView(demo: DemoCase, lang: Lang) {
  const extraction = extract(demo.resource, { related: demo.related.map((entry) => entry.resource) });
  const notice = buildNotice(extraction, lang);
  const action = nextAction(extraction);
  const exports = buildExports(extraction, action, notice);
  const conflict = notice.sentences.find((sentence) => sentence.id === "outcome-conflict") ?? null;
  return { extraction, notice, action, exports, conflict };
}

function validatorLine(file: string): string {
  if (!file) return "HL7 FHIR Validator: not applicable. This input is not a FHIR resource.";
  const row = validatorReport.results.find((entry) => entry.file.endsWith(file));
  if (!validatorReport.ran || !row) {
    return "HL7 FHIR Validator CLI: no recorded result for this file in validation/summary.json.";
  }
  return `HL7 FHIR Validator CLI ${validatorReport.version}: ${row.errors} errors, ${row.warnings} warnings, ${row.fatals} fatals.`;
}

function samePointer(left: Pointer, right: Pointer): boolean {
  return left.source === right.source && left.path === right.path && left.relatedId === right.relatedId;
}

function downloadJson(filename: string, value: unknown): void {
  downloadText(filename, JSON.stringify(value, null, 2), "application/fhir+json");
}

function downloadText(filename: string, value: string, type: string): void {
  const blob = new Blob([value], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
