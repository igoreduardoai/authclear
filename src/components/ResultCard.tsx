import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Decision } from "@/lib/types";
import type { CallScript } from "@/lib/callScript";
import { formatTimestamp } from "@/lib/formatTime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_STYLE } from "@/components/status";

interface ResultCardProps {
  decision: Decision;
  kicker: string;
  headline: string;
  lead: string;
  conflict: string | null;
  due: string | null;
  steps: string[];
  script: CallScript;
  lang: "en" | "es";
  onShowSource: () => void;
  onLetter: () => void;
  onTask: () => void;
  onCsv: () => void;
  onSourceFile: () => void;
  onDryRun: () => void;
}

export function ResultCard({
  decision,
  kicker,
  headline,
  lead,
  conflict,
  due,
  steps,
  script,
  lang,
  onShowSource,
  onLetter,
  onTask,
  onCsv,
  onSourceFile,
  onDryRun,
}: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const status = STATUS_STYLE[decision];
  const Icon = status.icon;
  const humanDue = due ? formatTimestamp(due) : null;

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(script.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card id="decision" aria-live="polite" className="min-w-0 p-4 md:p-8">
      <Badge lang={lang} className={`h-auto gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${status.badge}`}>
        <Icon aria-hidden="true" />
        {kicker}
      </Badge>
      <h2 className="mt-4 mb-0 text-[2rem] leading-[1.1] font-bold tracking-[-0.02em] md:text-[2.5rem]">
        {headline}
      </h2>
      <p lang={lang} className="mt-3 mb-0 max-w-[65ch] text-xl leading-snug">
        {lead}
      </p>
      {conflict ? (
        <p lang={lang} className="mt-4 mb-0 max-w-[65ch] text-sm leading-[1.45] text-muted-foreground">
          <span className="font-semibold text-foreground">Note on this record. </span>
          {conflict}
        </p>
      ) : null}
      {due ? (
        <p className="mt-4 mb-0 text-base">
          <span className="text-muted-foreground">Decision-clock maximum </span>
          <span>{humanDue ?? due}</span>
          {humanDue ? <span className="mt-1 block font-mono text-[0.8125rem] text-muted-foreground">{due}</span> : null}
        </p>
      ) : null}
      <div className="mt-6">
        <h3 className="mt-0 mb-2 text-[1.125rem] leading-[1.35] font-semibold">Next action</h3>
        <ol lang={lang} className="my-0 flex max-w-[65ch] list-decimal flex-col gap-2 pl-5 text-[1.0625rem] leading-[1.6] wrap-break-word">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      {script.text ? (
        <div className="order-2 mt-4 rounded-lg border border-border bg-background p-4 md:order-1 md:mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="m-0 text-[1.125rem] leading-[1.35] font-semibold">What to say when you call</h3>
            <Button type="button" variant="outline" className="min-h-11 px-3" onClick={() => void copyScript()}>
              {copied ? (lang === "es" ? "Copiado" : "Copied") : "Copy call script"}
            </Button>
          </div>
          <p lang={lang} className="mt-3 mb-0 max-w-[65ch] text-[1.0625rem] leading-[1.6] wrap-break-word">
            {script.text}
          </p>
          <p aria-live="polite" className="sr-only">
            {copied ? (lang === "es" ? "Copiado" : "Copied") : ""}
          </p>
        </div>
      ) : null}
      <div className="order-1 mt-4 flex flex-col gap-2 md:order-2 md:mt-6 md:flex-row md:flex-wrap">
        <Button type="button" className="min-h-11 w-full px-4 text-base md:w-auto" onClick={onLetter}>
          Download member letter
        </Button>
        <Button type="button" variant="outline" className="min-h-11 bg-surface px-4 text-base" onClick={onTask}>
          Download Task JSON
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="min-h-11 bg-surface px-4 text-base">
              More downloads
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem className="min-h-11" onSelect={onCsv}>
              Download queue CSV
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onSelect={onSourceFile}>
              Download source FHIR
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onSelect={onDryRun}>
              Download dry-run notification
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button type="button" variant="outline" className="min-h-11 bg-surface px-4 text-base" onClick={onShowSource}>
          Show source
        </Button>
      </div>
    </Card>
  );
}
