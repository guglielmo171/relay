import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { Handoff, SectionKey } from "@/lib/handoffs/schema";

const SECTIONS: {
  key: SectionKey;
  label: string;
  hint: string;
  placeholder: string;
  rows: number;
}[] = [
  {
    key: "changes",
    label: "What changed",
    hint: "What landed since the last session",
    placeholder: "The auth refactor was deployed to production…",
    rows: 3,
  },
  {
    key: "blockers",
    label: "Blocked",
    hint: "What is stuck, and why",
    placeholder: "The payment integration is failing against the sandbox API…",
    rows: 2,
  },
  {
    key: "waitingOnYou",
    label: "Waiting on you",
    hint: "Reviews, replies, decisions",
    placeholder: "PR #418 is waiting for your review…",
    rows: 3,
  },
  {
    key: "nextActions",
    label: "Next actions",
    hint: "Ordered — the first line is your first priority",
    placeholder: "Validate the checkout regression on staging…",
    rows: 3,
  },
  {
    key: "context",
    label: "Context",
    hint: "Optional — spoken only if short",
    placeholder: "Release freeze starts Friday…",
    rows: 2,
  },
];

interface HandoffEditorProps {
  handoff: Handoff;
  onRename: (title: string) => void;
  onSection: (key: SectionKey, lines: string[]) => void;
}

export function HandoffEditor({
  handoff,
  onRename,
  onSection,
}: HandoffEditorProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="border-b border-border/60 pb-4 transition-colors focus-within:border-primary/50">
        <Input
          value={handoff.title}
          onChange={(event) => onRename(event.target.value)}
          aria-label="Handoff title"
          placeholder="Name this handoff — e.g. Checkout and payments"
          className="h-auto border-none bg-transparent px-0 text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
        />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        One item per line. Empty sections stay silent in the briefing.
      </p>

      <div className="mt-8">
        {SECTIONS.map((section, index) => {
          const count = handoff[section.key].filter((line) =>
            line.trim(),
          ).length;
          return (
            <div key={section.key}>
              {index > 0 && <Separator className="my-7" />}
              <div>
                <label
                  htmlFor={`section-${section.key}`}
                  className="text-xs font-medium uppercase tracking-wider text-foreground/70"
                >
                  {section.label}
                  {count > 0 && (
                    <span className="ml-2 font-mono text-[10px] tracking-normal text-muted-foreground">
                      {count}
                    </span>
                  )}
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {section.hint}
                </p>
              </div>
              <Textarea
                id={`section-${section.key}`}
                value={handoff[section.key].join("\n")}
                onChange={(event) =>
                  onSection(section.key, event.target.value.split("\n"))
                }
                placeholder={section.placeholder}
                rows={section.rows}
                className="mt-2.5 resize-none bg-card text-sm leading-relaxed"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
