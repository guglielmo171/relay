import { useState } from "react";
import {
  AudioLines,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { BriefingPlayerApi } from "@/hooks/use-briefing-player";
import { formatClock } from "@/lib/format";

interface BriefingPlayerProps {
  player: BriefingPlayerApi;
}

export function BriefingPlayer({ player }: BriefingPlayerProps) {
  const [secret, setSecret] = useState("");
  const playing = player.status === "playing";
  const generating = player.status === "generating";

  return (
    <div className="flex flex-col gap-3">
      {!player.hasAudio && !generating && !player.error && (
        <div>
          <Button
            size="lg"
            className="w-full"
            onClick={() => void player.generate()}
            disabled={!player.canListen}
          >
            <AudioLines className="size-4" />
            Listen to briefing
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            {player.canListen
              ? "Generates a short spoken briefing from the script above."
              : "Add at least one item to give the briefing something to say."}
          </p>
        </div>
      )}

      {generating && (
        <div className="flex items-center justify-between rounded-md border bg-card px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Preparing your briefing…
          </span>
          <Button variant="ghost" size="sm" onClick={player.stop}>
            Stop
          </Button>
        </div>
      )}

      {player.error && !player.error.needsUnlock && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5">
          <p className="text-sm text-destructive">{player.error.message}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 px-0 text-destructive hover:text-destructive"
            onClick={() => void player.generate()}
          >
            <RotateCcw className="size-3.5" />
            Try again
          </Button>
        </div>
      )}

      {player.error?.needsUnlock && (
        <form
          className="flex flex-col gap-2 rounded-md border bg-card px-3 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            void player.unlock(secret);
          }}
        >
          <p className="text-sm">{player.error.message}</p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="App secret"
              aria-label="App secret"
            />
            <Button type="submit" variant="secondary">
              Unlock voice
            </Button>
          </div>
        </form>
      )}

      {player.hasAudio && (
        <div
          className="rounded-md border bg-card px-4 py-4 outline-none focus-visible:ring-1 focus-visible:ring-ring"
          tabIndex={0}
          role="group"
          aria-label="Briefing player"
          onKeyDown={(event) => {
            if (event.key === " " && event.target === event.currentTarget) {
              event.preventDefault();
              player.toggle();
            }
          }}
        >
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              className="size-9 shrink-0 rounded-full"
              onClick={player.toggle}
              aria-label={playing ? "Pause briefing" : "Play briefing"}
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Slider
              value={[player.currentTime]}
              max={Math.max(player.duration, 1)}
              step={0.1}
              onValueChange={(value) =>
                player.seek(Array.isArray(value) ? value[0] : value)
              }
              aria-label="Seek"
              className="flex-1"
            />
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              {formatClock(player.currentTime)} / {formatClock(player.duration)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={player.stop}>
                <Square className="size-3.5" />
                Stop
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={player.cycleSpeed}
                aria-label="Playback speed"
              >
                {player.speed}×
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void player.generate()}
              disabled={generating}
              title={
                player.stale
                  ? "The script changed since this audio was generated"
                  : "Replay this briefing"
              }
              className={
                player.stale
                  ? "text-primary hover:text-primary/80"
                  : undefined
              }
            >
              <RotateCcw className="size-3.5" />
              {player.stale ? "Regenerate" : "Replay"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
