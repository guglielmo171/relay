"use client";

import { AudioLines } from "lucide-react";
import { BriefingPanel } from "@/components/briefing-panel";
import { EmptyState } from "@/components/empty-state";
import { HandoffEditor } from "@/components/handoff-editor";
import { HandoffList } from "@/components/handoff-list";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useBriefingPlayer } from "@/hooks/use-briefing-player";
import { useHandoffs } from "@/hooks/use-handoffs";
import { relativeTime } from "@/lib/format";

export default function Home() {
  const {
    hydrated,
    handoffs,
    active,
    activeId,
    select,
    createHandoff,
    loadSample,
    updateSection,
    renameHandoff,
    removeHandoff,
  } = useHandoffs();

  const player = useBriefingPlayer(active);

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-40" />
      </main>
    );
  }

  if (handoffs.length === 0) {
    return (
      <EmptyState onLoadSample={loadSample} onStartScratch={createHandoff} />
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
        <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <AudioLines className="size-4" />
          Relay
        </span>
        {active && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <span className="truncate text-sm text-muted-foreground">
              {active.title}
            </span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              Updated {relativeTime(active.updatedAt)}
            </span>
          </>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b lg:w-60 lg:border-b-0 lg:border-r">
          <HandoffList
            handoffs={handoffs}
            activeId={activeId}
            onSelect={select}
            onCreate={createHandoff}
            onRemove={removeHandoff}
          />
        </aside>

        <main className="min-w-0 flex-1 px-6 py-6 lg:min-h-0 lg:overflow-y-auto">
          {active ? (
            <HandoffEditor
              handoff={active}
              onRename={(title) => renameHandoff(active.id, title)}
              onSection={(key, lines) => updateSection(active.id, key, lines)}
            />
          ) : (
            <p className="mt-10 text-center text-sm text-muted-foreground">
              Pick a handoff, or start a new one.
            </p>
          )}
        </main>

        {active && (
          <aside className="w-full shrink-0 border-t bg-muted/20 lg:min-h-0 lg:w-[26rem] lg:border-l lg:border-t-0">
            <BriefingPanel player={player} />
          </aside>
        )}
      </div>
    </div>
  );
}
