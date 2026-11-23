import { useMemo, useState } from "react";
import { FileSearch, Info, ShieldCheck } from "lucide-react";
import { caseById, type DemoCase } from "@/lib/cases";
import { nextAction } from "@/lib/action";
import { buildNotice } from "@/lib/explain";
import { extract } from "@/lib/extract";
import { buildExports } from "@/lib/task";
import { buildCallScript } from "@/lib/callScript";
import { plainLead } from "@/lib/plain";
import { splitSteps } from "@/lib/steps";
import { formatPlainDate, humanizeTimestamps, memberFacingStep } from "@/lib/formatTime";
import { withLetterStyles } from "@/lib/letterStyle";
import type { Pointer } from "@/lib/types";
import summary from "@/generated/eval-summary.json";
import validatorReportJson from "../validation/summary.json";
import { Button } from "@/components/ui/button";
import { ExampleRail, MoreExamples, OwnRecord } from "@/components/ExampleRail";
import { ResultCard } from "@/components/ResultCard";
import { SourceSheet } from "@/components/SourceSheet";
import { useNarrow } from "@/hooks/useNarrow";

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
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceSentence, setSourceSentence] = useState<string | null>(null);
  const [customResource, setCustomResource] = useState<unknown | undefined>(undefined);
  const narrow = useNarrow();
  const demo = customResource === undefined ? caseById(caseId) : customCase(customResource);
  const view = useMemo(() => buildView(demo, lang), [demo, lang]);

  function selectCase(id: string) {
    setCustomResource(undefined);
    setCaseId(id);
    setPointer(null);
    setSourceSentence(null);
    setSourceOpen(false);
  }

  function useRecord(resource: unknown) {
    setCustomResource(resource);
    setPointer(null);
    setSourceSentence(null);
    setSourceOpen(false);
  }

  function openSource(sentenceId: string | null) {
    setSourceSentence(sentenceId);
    if (sentenceId) {
      const sentence = view.notice.sentences.find((entry) => entry.id === sentenceId);
      setPointer(sentence?.pointers[0] ?? null);
    }
    setSourceOpen(true);
  }

  return (
    <>
      <a className="skip" href="#decision">
        Skip to decision
      </a>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-[76rem] items-center gap-3 px-4 md:px-6">
          <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <h1 className="m-0 text-[1.125rem] leading-[1.3] font-semibold">AuthClear</h1>
          <p className="m-0 hidden text-sm text-muted-foreground md:block">
            Prior-authorization letters in plain language
          </p>
          <div role="group" aria-label="Notice language" className="ml-auto flex overflow-hidden rounded-lg border border-input">
            <button
              type="button"
              aria-pressed={lang === "en"}
              className={`min-h-11 px-3 text-base ${lang === "en" ? "bg-foreground text-background" : "bg-surface text-foreground"}`}
              onClick={() => setLang("en")}
            >
              English
            </button>
            <button
              type="button"
              aria-pressed={lang === "es"}
              className={`min-h-11 border-l border-input px-3 text-base ${lang === "es" ? "bg-foreground text-background" : "bg-surface text-foreground"}`}
              onClick={() => setLang("es")}
            >
              Español
            </button>
          </div>
        </div>
        <p className="mx-auto mt-0 mb-0 flex max-w-[76rem] items-start gap-2 px-4 pt-2 pb-3 text-sm leading-[1.45] text-muted-foreground md:px-6">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Synthetic / HL7-published example data — no real members. Not a coverage decision, clinical advice, or
            legal advice.
          </span>
        </p>
      </header>
      <main className="mx-auto grid w-full max-w-[76rem] min-w-0 gap-4 px-4 py-4 md:grid-cols-[280px_minmax(0,1fr)] md:gap-8 md:px-6 md:py-6">
        <ExampleRail
          caseId={customResource === undefined ? caseId : ""}
          narrow={narrow}
          onSelect={selectCase}
          onRecord={useRecord}
        />
        <div className="min-w-0">
          <ResultCard
            decision={view.extraction.decision}
            kicker={view.notice.kicker}
            headline={view.notice.headline}
            lead={view.lead.text}
            conflict={view.conflict}
            due={view.action.deadline.due}
            steps={view.steps}
            script={view.script}
            lang={lang}
            onShowSource={() => openSource(null)}
            onLetter={() => downloadText(`letter-${demo.id}.html`, withLetterStyles(view.exports.letterHtml), "text/html")}
            onTask={() => downloadJson(`task-${demo.id}.json`, view.exports.task)}
            onCsv={() => downloadText(`queue-${demo.id}.csv`, view.exports.csv, "text/csv")}
            onSourceFile={() => downloadJson(`source-${demo.id}.json`, demo.resource)}
            onDryRun={() => downloadJson(`dry-run-${demo.id}.json`, view.exports.dryRun)}
          />
          <MoreExamples caseId={customResource === undefined ? caseId : ""} onSelect={selectCase} className="mt-4 flex md:hidden" />
          <OwnRecord onRecord={useRecord} className="mt-3 md:hidden" />

          <section className="mt-12" aria-labelledby="explanation-heading">
            <h2 id="explanation-heading" className="mt-0 mb-3 text-2xl leading-[1.25] font-semibold">
              Full explanation
            </h2>
            <div
              id="case-panel"
              role="tabpanel"
              aria-labelledby={demo.group === "primary" ? `tab-${demo.id}` : undefined}
              aria-label={demo.group === "more" ? demo.tab : undefined}
            >
              <ol lang={lang} className="my-0 flex list-decimal flex-col gap-4 pl-6">
                {view.notice.sentences.map((sentence) => (
                  <li key={sentence.id} className="max-w-[65ch] text-[1.0625rem] leading-[1.6]">
                    <span>{humanizeTimestamps(sentence.text, lang)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-1 min-h-11 px-2 text-primary"
                      onClick={() => openSource(sentence.id)}
                    >
                      <FileSearch aria-hidden="true" />
                      Show source
                    </Button>
                  </li>
                ))}
              </ol>
              {view.extraction.patient.label ? (
                <p className="max-w-[65ch] text-sm leading-[1.45] text-muted-foreground">
                  The patient name is copied from the published example. It is not a real member.
                </p>
              ) : null}
              {view.extraction.insurer.name ? (
                <p className="max-w-[65ch] text-sm leading-[1.45] text-muted-foreground">
                  The insurer name is copied from the published example. It is not a customer or partner.
                </p>
              ) : null}
              <p className="max-w-[65ch] text-sm leading-[1.45] text-muted-foreground">
                Spanish text has not been reviewed by a native speaker.
              </p>
            </div>
          </section>

          <section className="mt-12 rounded-2xl bg-card p-5 shadow-card md:p-8" aria-labelledby="navigator-heading">
            <h2 id="navigator-heading" className="mt-0 mb-4 text-2xl leading-[1.25] font-semibold">
              Navigator task
            </h2>
            <dl className="my-0 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-muted-foreground">Owner</dt>
                <dd className="m-0 text-base">{view.action.ownerDisplay}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Decision-clock maximum</dt>
                <dd className="m-0 text-base">
                  {view.action.deadline.due ? (
                    <span>{formatPlainDate(view.action.deadline.due, lang) ?? view.action.deadline.due}</span>
                  ) : (
                    `Not computed (${view.action.deadline.ruleId})`
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Rule</dt>
                <dd className="m-0 text-base">{view.action.deadline.ruleId}</dd>
              </div>
            </dl>
            <details className="mt-4">
              <summary className="min-h-11 cursor-pointer text-base">How the deadline was calculated</summary>
              <p lang={lang} className="max-w-[65ch] text-sm leading-[1.45] text-muted-foreground">
                {lang === "es" ? view.action.deadline.caveatEs : view.action.deadline.caveatEn}
              </p>
            </details>
          </section>

          <details className="mt-12">
            <summary className="min-h-11 cursor-pointer text-2xl leading-[1.25] font-semibold">How we tested</summary>
            <section className="pt-4" aria-label="Internal evaluation">
              <h2 className="mt-0 text-2xl leading-[1.25] font-semibold">Internal evaluation</h2>
              <p>{summary.label}</p>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Official HL7 examples, decision</dt>
                  <dd className="m-0">
                    AuthClear {summary.officialAuthclear}. Baseline that trusts outcome alone {summary.officialBaseline}.
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Synthetic holdout, decision</dt>
                  <dd className="m-0">
                    AuthClear {(summary.holdoutDecision * 100).toFixed(1)}% of {summary.holdoutCount}. Baseline{" "}
                    {(summary.holdoutBaselineDecision * 100).toFixed(1)}%. Dev set: {summary.devCount}. Seed {summary.seed}.
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Notice pointers</dt>
                  <dd className="m-0">
                    Coverage {(summary.pointerCoverage * 100).toFixed(1)}%. Unsupported-value findings{" "}
                    {summary.unsupportedValueFindings}.
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Flesch-Kincaid, English denial notice</dt>
                  <dd className="m-0">
                    {summary.denialNoticeGrade?.toFixed(1) ?? "n/a"}. Published narrative in that file, tags removed:{" "}
                    {summary.denialNarrativeGrade?.toFixed(1) ?? "n/a"}.
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Fernández-Huerta, Spanish denial notice</dt>
                  <dd className="m-0">
                    {summary.spanishDenialIndex?.toFixed(1) ?? "n/a"}. Ease index from this repo, not a U.S. grade. Raw
                    reason strings scored: {summary.rawReasonScored}.
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Pending decision-clock due times</dt>
                  <dd className="m-0">{summary.pendedDue} matched the written rule.</dd>
                </div>
              </dl>
              <p className="flex flex-wrap gap-4">
                <a href="./RESULTS.md">Full evaluation report</a>
                <a href="./health.json">Health</a>
              </p>
            </section>
          </details>
        </div>
      </main>
      <footer className="mx-auto max-w-[76rem] px-4 pt-4 pb-10 text-sm text-muted-foreground md:px-6">
        <p>AuthClear is a prototype by Igor Eduardo. It does not send email or SMS. The dry-run file is a payload only.</p>
      </footer>
      <SourceSheet
        open={sourceOpen}
        onOpenChange={setSourceOpen}
        narrow={narrow}
        sentences={view.notice.sentences}
        activeSentenceId={sourceSentence}
        pointer={pointer}
        onPointer={setPointer}
        resource={demo.resource}
        related={demo.related}
        validatorText={validatorLine(demo.validatorFile)}
        sourceLabel={demo.sourceLabel}
        sourceUrl={demo.sourceUrl}
        joinNote={demo.joinNote}
        readLine={`In-browser structural read: ${view.extraction.ok ? "read a prior-authorization resource" : "blocked"}${view.extraction.profile ? ` (${view.extraction.profile})` : ""}`}
        task={view.exports.task}
      />
    </>
  );
}

function customCase(resource: unknown): DemoCase {
  return {
    id: "custom",
    tab: "Your record",
    group: "more",
    sourceLabel: "Pasted JSON in this browser",
    sourceUrl: "https://hl7.org/fhir/R4/resource.html",
    joinNote: null,
    resource,
    related: [],
    validatorFile: "",
  };
}

function buildView(demo: DemoCase, lang: Lang) {
  const extraction = extract(demo.resource, { related: demo.related.map((entry) => entry.resource) });
  const notice = buildNotice(extraction, lang);
  const action = nextAction(extraction);
  const exports = buildExports(extraction, action, notice);
  const conflictSentence =
    notice.sentences.find((sentence) => sentence.id === "outcome-conflict" || sentence.id === "outcome-only") ?? null;
  return {
    extraction,
    notice,
    action,
    exports,
    lead: plainLead(extraction, lang),
    script: buildCallScript(extraction, lang),
    steps: splitSteps(lang === "es" ? action.summaryEs : action.summaryEn).map((step) => memberFacingStep(step, lang)),
    conflict: conflictSentence?.text ?? null,
  };
}

function validatorLine(file: string): string {
  if (!file) return "HL7 FHIR Validator: not applicable. This input is not a FHIR resource.";
  const row = validatorReport.results.find((entry) => entry.file.endsWith(file));
  if (!validatorReport.ran || !row) {
    return "HL7 FHIR Validator CLI: no recorded result for this file in validation/summary.json.";
  }
  return `HL7 FHIR Validator CLI ${validatorReport.version}: ${row.errors} errors, ${row.warnings} warnings, ${row.fatals} fatals.`;
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
