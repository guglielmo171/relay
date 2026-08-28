import { AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onLoadSample: () => void;
  onStartScratch: () => void;
}

export function EmptyState({ onLoadSample, onStartScratch }: EmptyStateProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-card">
          <AudioLines className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Relay</h1>
        <p className="mt-1 text-lg">Catch up before you code.</p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Turn a structured handoff into a short spoken briefing — what changed,
          what&apos;s blocked, and your first priority — and listen before you
          start working.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={onLoadSample}>
            Load the sample handoff
          </Button>
          <Button size="lg" variant="outline" onClick={onStartScratch}>
            Start from scratch
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Voice needs an ElevenLabs key on the server. Everything else works
          offline.
        </p>
      </div>
    </main>
  );
}
