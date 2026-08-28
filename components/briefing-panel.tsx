import { BriefingPlayer } from "@/components/briefing-player";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BriefingPlayerApi } from "@/hooks/use-briefing-player";
import { formatClock } from "@/lib/format";

interface BriefingPanelProps {
  player: BriefingPlayerApi;
}

export function BriefingPanel({ player }: BriefingPanelProps) {
  const { script } = player;
  // ~15 spoken characters per second is a decent estimate for a calm read.
  const estimatedSeconds = script ? Math.max(5, Math.round(script.length / 15)) : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between px-5 pt-4">
        <h2 className="text-sm font-medium">Briefing</h2>
        {script && (
          <span className="text-xs text-muted-foreground">
            about {formatClock(estimatedSeconds)} to hear
          </span>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-5 py-4">
          {script ? (
            <p className="max-w-[65ch] font-serif text-[15px] leading-relaxed text-foreground/90">
              {script}
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              As you write, your briefing appears here — in the order
              you&apos;ll hear it. Empty sections stay silent, and it always
              ends on your first priority.
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="border-t px-5 py-4">
        <BriefingPlayer player={player} />
      </div>
    </div>
  );
}
