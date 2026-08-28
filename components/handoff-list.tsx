import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { relativeTime } from "@/lib/format";
import type { Handoff } from "@/lib/handoffs/schema";
import { cn } from "@/lib/utils";

interface HandoffListProps {
  handoffs: Handoff[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRemove: (id: string) => void;
}

export function HandoffList({
  handoffs,
  activeId,
  onSelect,
  onCreate,
  onRemove,
}: HandoffListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Handoffs
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          onClick={onCreate}
          aria-label="New handoff"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <Separator />
      <ScrollArea className="max-h-56 flex-1 lg:max-h-none">
        <ul className="flex flex-col gap-1 p-2">
          {handoffs.map((handoff) => {
            const isActive = handoff.id === activeId;
            return (
              <li key={handoff.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect(handoff.id)}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-md px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        isActive ? "bg-primary" : "bg-transparent",
                      )}
                    />
                    <span
                      className={cn(
                        "truncate pr-6 text-sm",
                        isActive && "font-medium",
                      )}
                    >
                      {handoff.title}
                    </span>
                  </span>
                  <span className="pl-3.5 font-mono text-[11px] text-muted-foreground">
                    {relativeTime(handoff.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(handoff.id)}
                  aria-label={`Delete ${handoff.title}`}
                  className="absolute right-2 top-2 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </div>
  );
}
