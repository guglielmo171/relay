"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compileBriefing } from "@/lib/briefing/compile";
import type { Handoff } from "@/lib/handoffs/schema";

export type PlayerStatus = "idle" | "generating" | "playing" | "paused" | "error";

export interface PlayerError {
  message: string;
  needsUnlock: boolean;
}

export const SPEEDS = [1, 1.25, 1.5] as const;

const CACHE_LIMIT = 6;

/** djb2 — detects "same script, same voice" for the in-session audio cache. */
function scriptKey(script: string): string {
  let hash = 5381;
  for (let i = 0; i < script.length; i += 1) {
    hash = ((hash << 5) + hash + script.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export function useBriefingPlayer(handoff: Handoff | null) {
  const script = useMemo(() => (handoff ? compileBriefing(handoff) : ""), [handoff]);

  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [error, setError] = useState<PlayerError | null>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [spokenKey, setSpokenKey] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const ensureAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  }, []);

  useEffect(() => {
    const audio = ensureAudio();
    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoaded = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => {
      audio.currentTime = 0;
      setCurrentTime(0);
      setStatus("paused");
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [ensureAudio]);

  useEffect(() => {
    ensureAudio().playbackRate = SPEEDS[speedIndex];
  }, [speedIndex, ensureAudio]);

  const play = useCallback(async () => {
    const audio = ensureAudio();
    if (!audio.src) return;
    try {
      await audio.play();
      setStatus("playing");
    } catch {
      // Autoplay blocked — stay paused; the user can press play explicitly.
      setStatus("paused");
    }
  }, [ensureAudio]);

  const attachAndPlay = useCallback(
    (url: string) => {
      const audio = ensureAudio();
      audio.src = url;
      setHasAudio(true);
      void play();
    },
    [ensureAudio, play],
  );

  const generate = useCallback(async () => {
    if (!handoff || !script) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setStatus("generating");

    const key = scriptKey(script);
    const cached = cacheRef.current.get(key);
    if (cached) {
      setSpokenKey(key);
      attachAndPlay(cached);
      return;
    }

    try {
      const res = await fetch("/api/briefing/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handoff }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (res.status === 401) {
          setStatus("error");
          setError({
            message: data?.error ?? "Relay is locked.",
            needsUnlock: true,
          });
          return;
        }
        throw new Error(data?.error ?? "Voice generation failed. Retry in a moment.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      cacheRef.current.set(key, url);
      while (cacheRef.current.size > CACHE_LIMIT) {
        const oldestKey = cacheRef.current.keys().next().value;
        if (oldestKey === undefined) break;
        const oldestUrl = cacheRef.current.get(oldestKey);
        cacheRef.current.delete(oldestKey);
        if (oldestUrl) URL.revokeObjectURL(oldestUrl);
      }

      setSpokenKey(key);
      attachAndPlay(url);
    } catch (err) {
      if (controller.signal.aborted) return; // stop() already reset the state
      setStatus("error");
      setError({
        message:
          err instanceof Error
            ? err.message
            : "Voice generation failed. Retry in a moment.",
        needsUnlock: false,
      });
    }
  }, [handoff, script, attachAndPlay]);

  const pause = useCallback(() => {
    ensureAudio().pause();
    setStatus((s) => (s === "playing" ? "paused" : s));
  }, [ensureAudio]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const audio = ensureAudio();
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setStatus((s) => (s === "error" ? s : hasAudio ? "paused" : "idle"));
  }, [ensureAudio, hasAudio]);

  const toggle = useCallback(() => {
    if (status === "playing") pause();
    else if (hasAudio) void play();
  }, [status, hasAudio, pause, play]);

  const seek = useCallback(
    (seconds: number) => {
      const audio = ensureAudio();
      if (!audio.src) return;
      audio.currentTime = seconds;
      setCurrentTime(seconds);
    },
    [ensureAudio],
  );

  const cycleSpeed = useCallback(() => {
    setSpeedIndex((i) => (i + 1) % SPEEDS.length);
  }, []);

  const unlock = useCallback(
    async (secret: string) => {
      try {
        const res = await fetch("/api/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret }),
        });
        if (!res.ok) {
          setError({ message: "That secret didn't match.", needsUnlock: true });
          return;
        }
        setError(null);
        await generate();
      } catch {
        setError({
          message: "Couldn't reach the server to unlock.",
          needsUnlock: true,
        });
      }
    },
    [generate],
  );

  // Switching handoffs interrupts playback; the new script is not spoken yet.
  // State resets happen during render (the documented prev-comparison
  // pattern); the effect below only performs imperative audio work.
  const handoffId = handoff?.id ?? null;
  const [prevHandoffId, setPrevHandoffId] = useState(handoffId);
  if (handoffId !== prevHandoffId) {
    setPrevHandoffId(handoffId);
    setStatus("idle");
    setHasAudio(false);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setSpokenKey(null);
  }

  useEffect(() => {
    abortRef.current?.abort();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  }, [handoffId]);

  // Release object URLs when the workspace unmounts.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      audioRef.current?.pause();
      for (const url of cacheRef.current.values()) URL.revokeObjectURL(url);
      cacheRef.current.clear();
    },
    [],
  );

  const stale =
    hasAudio && spokenKey !== null && scriptKey(script) !== spokenKey;

  return {
    script,
    status,
    error,
    hasAudio,
    currentTime,
    duration,
    speed: SPEEDS[speedIndex],
    stale,
    canListen: script.length > 0,
    generate,
    toggle,
    stop,
    seek,
    cycleSpeed,
    unlock,
  };
}

export type BriefingPlayerApi = ReturnType<typeof useBriefingPlayer>;
