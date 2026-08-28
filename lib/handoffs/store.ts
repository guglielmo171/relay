import type { Handoff } from "@/lib/handoffs/schema";

const HANDOFFS_KEY = "relay:handoffs:v1";
const ACTIVE_KEY = "relay:activeHandoffId";

function canStore(): boolean {
  return typeof window !== "undefined";
}

function isHandoff(value: unknown): value is Handoff {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Handoff>;
  return typeof candidate.id === "string" && typeof candidate.title === "string";
}

export function loadHandoffs(): Handoff[] {
  if (!canStore()) return [];
  try {
    const raw = window.localStorage.getItem(HANDOFFS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHandoff);
  } catch {
    return [];
  }
}

export function persistHandoffs(handoffs: Handoff[]): void {
  if (!canStore()) return;
  try {
    window.localStorage.setItem(HANDOFFS_KEY, JSON.stringify(handoffs));
  } catch {
    // Storage full or blocked — Relay keeps working in memory for the session.
  }
}

export function loadActiveId(): string | null {
  if (!canStore()) return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function persistActiveId(id: string | null): void {
  if (!canStore()) return;
  if (id) window.localStorage.setItem(ACTIVE_KEY, id);
  else window.localStorage.removeItem(ACTIVE_KEY);
}
