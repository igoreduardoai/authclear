import { useEffect, useState } from "react";
import type { Pointer } from "@/lib/types";
import type { Sentence } from "@/lib/explain";
import type { RelatedResource } from "@/lib/cases";
import { JsonTree } from "@/components/JsonTree";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SourceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  narrow: boolean;
  sentences: Sentence[];
  activeSentenceId: string | null;
  pointer: Pointer | null;
  onPointer: (pointer: Pointer) => void;
  resource: unknown;
  related: RelatedResource[];
  validatorText: string;
  sourceLabel: string;
  sourceUrl: string;
  joinNote: string | null;
  readLine: string;
  task: unknown;
}

export function SourceSheet({
  open,
  onOpenChange,
  narrow,
  sentences,
  activeSentenceId,
  pointer,
  onPointer,
  resource,
  related,
  validatorText,
  sourceLabel,
  sourceUrl,
  joinNote,
  readLine,
  task,
}: SourceSheetProps) {
  const [tab, setTab] = useState("sentences");

  useEffect(() => {
    if (open && activeSentenceId) setTab("sentences");
  }, [open, activeSentenceId]);

  useEffect(() => {
    if (!open || tab !== "sentences" || !activeSentenceId) return;
    document.getElementById(`source-${activeSentenceId}`)?.scrollIntoView({ block: "nearest" });
  }, [open, tab, activeSentenceId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={narrow ? "bottom" : "right"}>
        <SheetHeader className="pr-14">
          <SheetTitle>Source</SheetTitle>
          <SheetDescription>Field paths, the record, the validator result, and the task preview.</SheetDescription>
        </SheetHeader>
        <div tabIndex={0} aria-label="Source details" className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="sentences" className="min-h-11">
                Sentences
              </TabsTrigger>
              <TabsTrigger value="record" className="min-h-11">
                Record
              </TabsTrigger>
              <TabsTrigger value="validator" className="min-h-11">
                Validator
              </TabsTrigger>
              <TabsTrigger value="task" className="min-h-11">
                Task preview
              </TabsTrigger>
            </TabsList>
            <TabsContent value="sentences" className="mt-4 flex flex-col gap-4">
              {sentences.map((sentence) => (
                <article
                  key={sentence.id}
                  id={`source-${sentence.id}`}
                  className={sentence.id === activeSentenceId ? "rounded-lg bg-secondary p-3" : "p-3"}
                >
                  <p className="m-0 text-base leading-relaxed">{sentence.text}</p>
                  {sentence.pointers.length > 0 ? (
                    <ul className="mt-2 mb-0 list-none p-0">
                      {sentence.pointers.map((item) => (
                        <li key={`${item.source}-${item.path}`}>
                          <button
                            type="button"
                            className="min-h-11 px-0 text-left font-mono text-[0.8125rem] break-all text-foreground"
                            onClick={() => {
                              onPointer(item);
                              setTab("record");
                            }}
                          >
                            {item.path}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 mb-0 font-mono text-[0.8125rem] text-muted-foreground">
                      No field path. This input is not a resource.
                    </p>
                  )}
                </article>
              ))}
            </TabsContent>
            <TabsContent value="record" className="mt-4">
              <JsonTree value={resource} activePath={pointer?.source === "focus" ? pointer.path : null} />
              {related.map((entry) => (
                <details key={entry.relatedId} className="mt-3">
                  <summary className="min-h-11 cursor-pointer">{entry.label}</summary>
                  <JsonTree
                    value={entry.resource}
                    activePath={
                      pointer?.source === "related" && pointer.relatedId === entry.relatedId ? pointer.path : null
                    }
                  />
                </details>
              ))}
            </TabsContent>
            <TabsContent value="validator" className="mt-4 text-base leading-relaxed">
              <p className="m-0">
                <a href={sourceUrl}>{sourceLabel}</a>
              </p>
              <p>{validatorText}</p>
              <p>{readLine}</p>
              {joinNote ? <p>{joinNote}</p> : null}
            </TabsContent>
            <TabsContent value="task" className="mt-4">
              <JsonTree value={task} activePath={null} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
