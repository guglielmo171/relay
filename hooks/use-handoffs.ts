"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSampleHandoff } from "@/lib/handoffs/sample";
import {
  createEmptyHandoff,
  type Handoff,
  type SectionKey,
} from "@/lib/handoffs/schema";
import {
  loadActiveId,
  loadHandoffs,
  persistActiveId,
  persistHandoffs,
} from "@/lib/handoffs/store";

export function useHandoffs() {
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadHandoffs();
    const storedActive = loadActiveId();
    // Hydrating from localStorage can only happen after mount; this is the
    // documented exception to the no-setState-in-effect rule.
    /* eslint-disable react-hooks/set-state-in-effect */
    setHandoffs(stored);
    setActiveId(
      storedActive && stored.some((h) => h.id === storedActive)
        ? storedActive
        : (stored[0]?.id ?? null),
    );
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (hydrated) persistHandoffs(handoffs);
  }, [hydrated, handoffs]);

  // If the active id points at a deleted handoff, fall back to the first one
  // instead of correcting it with an effect.
  const active = useMemo(
    () => handoffs.find((h) => h.id === activeId) ?? handoffs[0] ?? null,
    [handoffs, activeId],
  );

  useEffect(() => {
    if (hydrated) persistActiveId(active?.id ?? null);
  }, [hydrated, active]);

  const upsert = useCallback((handoff: Handoff) => {
    setHandoffs((current) => [
      handoff,
      ...current.filter((h) => h.id !== handoff.id),
    ]);
    setActiveId(handoff.id);
  }, []);

  const createHandoff = useCallback(
    () => upsert(createEmptyHandoff()),
    [upsert],
  );

  const loadSample = useCallback(() => upsert(createSampleHandoff()), [upsert]);

  const updateSection = useCallback(
    (id: string, key: SectionKey, lines: string[]) => {
      setHandoffs((current) =>
        current.map((h) =>
          h.id === id ? { ...h, [key]: lines, updatedAt: Date.now() } : h,
        ),
      );
    },
    [],
  );

  const renameHandoff = useCallback((id: string, title: string) => {
    setHandoffs((current) =>
      current.map((h) =>
        h.id === id ? { ...h, title, updatedAt: Date.now() } : h,
      ),
    );
  }, []);

  const removeHandoff = useCallback((id: string) => {
    setHandoffs((current) => current.filter((h) => h.id !== id));
  }, []);

  return {
    hydrated,
    handoffs,
    active,
    activeId: active?.id ?? null,
    select: setActiveId,
    createHandoff,
    loadSample,
    updateSection,
    renameHandoff,
    removeHandoff,
  };
}
