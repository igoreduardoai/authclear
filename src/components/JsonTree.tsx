import { useEffect, useRef } from "react";

interface JsonTreeProps {
  value: unknown;
  activePath: string | null;
}

export function JsonTree({ value, activePath }: JsonTreeProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!activePath || !ref.current) return;
    const nodes = ref.current.querySelectorAll("[data-path]");
    const node = Array.from(nodes).find((entry) => entry.getAttribute("data-path") === activePath);
    if (node instanceof HTMLElement) node.scrollIntoView({ block: "nearest" });
  }, [activePath]);
  return (
    <div className="json" ref={ref} tabIndex={0} role="region" aria-label="FHIR JSON">
      <Node value={omitNarrative(value)} path="" activePath={activePath} />
    </div>
  );
}

function Node({ value, path, activePath }: { value: unknown; path: string; activePath: string | null }) {
  const active = activePath !== null && activePath === path;
  if (Array.isArray(value)) {
    return (
      <span className={active ? "json-node active" : "json-node"} data-path={path}>
        [
        <span className="json-children">
          {value.map((entry, index) => (
            <span key={index}>
              <Node value={entry} path={path ? `${path}[${index}]` : `[${index}]`} activePath={activePath} />
              {index < value.length - 1 ? "," : ""}
            </span>
          ))}
        </span>
        ]
      </span>
    );
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <span className={active ? "json-node active" : "json-node"} data-path={path}>
        {"{"}
        <span className="json-children">
          {entries.map(([key, entry], index) => {
            const childPath = path ? `${path}.${key}` : key;
            return (
              <span key={key}>
                <span className="json-key">"{key}"</span>:{" "}
                <Node value={entry} path={childPath} activePath={activePath} />
                {index < entries.length - 1 ? "," : ""}
              </span>
            );
          })}
        </span>
        {"}"}
      </span>
    );
  }
  return (
    <span className={active ? "json-leaf active" : "json-leaf"} data-path={path}>
      {JSON.stringify(value)}
    </span>
  );
}

function omitNarrative(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => omitNarrative(entry));
  if (!value || typeof value !== "object") return value;
  const copy: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (key === "text" && entry && typeof entry === "object" && "div" in entry) {
      copy[key] = { status: (entry as { status?: string }).status ?? "generated", div: "[narrative HTML hidden]" };
    } else {
      copy[key] = omitNarrative(entry);
    }
  }
  return copy;
}

