import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, HelpCircle, User, XCircle, type LucideIcon } from "lucide-react";
import { CASES } from "@/lib/cases";
import { Separator } from "@/components/ui/separator";

const TAB_ICON: Record<string, LucideIcon> = {
  denied: XCircle,
  pended: Clock,
  approved: CheckCircle2,
  "patient-access": User,
  error: AlertTriangle,
  invalid: HelpCircle,
};

interface ExampleRailProps {
  caseId: string;
  narrow: boolean;
  onSelect: (id: string) => void;
  onRecord: (resource: unknown) => void;
}

export function MoreExamples({ caseId, onSelect, className = "" }: { caseId: string; onSelect: (id: string) => void; className?: string }) {
  const more = CASES.filter((entry) => entry.group === "more");
  const moreSelected = more.some((entry) => entry.id === caseId);
  return (
    <label className={`flex-col gap-1 text-sm text-muted-foreground ${className}`}>
      More published examples
      <select
        className="min-h-11 rounded-lg border border-input bg-surface px-3 text-base text-foreground"
        value={moreSelected ? caseId : ""}
        onChange={(event) => {
          if (event.target.value) onSelect(event.target.value);
        }}
      >
        <option value="">Choose</option>
        {more.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.tab}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OwnRecord({ onRecord, className = "" }: { onRecord: (resource: unknown) => void; className?: string }) {
  const [text, setText] = useState("");

  function apply(raw: string) {
    try {
      onRecord(JSON.parse(raw));
    } catch {
      onRecord(null);
    }
  }

  return (
    <details className={className}>
      <summary className="min-h-11 cursor-pointer text-sm text-foreground">Use your own record</summary>
      <div className="mt-2 flex flex-col gap-2">
        <p className="m-0 text-sm leading-[1.45] text-muted-foreground">
          Use example data only. Do not paste real patient records.
        </p>
        <p className="m-0 text-sm leading-[1.45] text-muted-foreground">Stays in your browser.</p>
        <textarea
          aria-label="Paste FHIR JSON"
          placeholder="Paste FHIR JSON"
          className="min-h-28 w-full rounded-lg border border-input bg-surface p-2 font-mono text-[0.8125rem] text-foreground"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button
          type="button"
          className="min-h-11 rounded-lg border border-control bg-surface px-3 text-left text-base"
          onClick={() => apply(text)}
        >
          Paste FHIR JSON
        </button>
        <label className="flex min-h-11 cursor-pointer items-center rounded-lg border border-control bg-surface px-3 text-base text-foreground">
          Upload .json
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void file.text().then(apply);
              event.target.value = "";
            }}
          />
        </label>
      </div>
    </details>
  );
}

export function ExampleRail({ caseId, narrow, onSelect, onRecord }: ExampleRailProps) {
  const primary = CASES.filter((entry) => entry.group === "primary");

  return (
    <aside aria-label="Example records" className="min-w-0 md:sticky md:top-4 md:w-[300px] md:shrink-0">
      <p className="mb-2 hidden text-sm text-muted-foreground md:block">Example records</p>
      <div
        role="tablist"
        aria-label="Example records"
        aria-orientation={narrow ? "horizontal" : "vertical"}
        className="flex max-w-full gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0"
      >
        {primary.map((entry) => {
          const selected = entry.id === caseId;
          const Icon = TAB_ICON[entry.id] ?? HelpCircle;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              id={`tab-${entry.id}`}
              aria-selected={selected}
              aria-controls="case-panel"
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg border-2 px-3 text-left text-base text-foreground ${
                selected ? "border-primary bg-primary/10 font-semibold" : "border-control bg-surface"
              }`}
              onClick={() => onSelect(entry.id)}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {entry.tab}
            </button>
          );
        })}
      </div>
      <Separator className="my-4 hidden md:block" />
      <MoreExamples caseId={caseId} onSelect={onSelect} className="mt-3 hidden md:mt-0 md:flex" />
      <OwnRecord onRecord={onRecord} className="mt-4 hidden md:block" />
    </aside>
  );
}
