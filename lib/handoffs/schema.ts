export interface Handoff {
  id: string;
  title: string;
  updatedAt: number;
  /** What landed since the last session. */
  changes: string[];
  /** What is stuck, and why. */
  blockers: string[];
  /** Reviews, replies, decisions needed from you. */
  waitingOnYou: string[];
  /** Ordered — index 0 is the first priority. */
  nextActions: string[];
  /** Optional — spoken only when short and present. */
  context: string[];
}

export const SECTION_KEYS = [
  "changes",
  "blockers",
  "waitingOnYou",
  "nextActions",
  "context",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const LIMITS = {
  title: 120,
  bullet: 280,
  perSection: 12,
} as const;

export function createEmptyHandoff(title = "Untitled handoff"): Handoff {
  return {
    id: crypto.randomUUID(),
    title,
    updatedAt: Date.now(),
    changes: [],
    blockers: [],
    waitingOnYou: [],
    nextActions: [],
    context: [],
  };
}

function cleanBullets(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, LIMITS.perSection)
    .map((item) =>
      item.length > LIMITS.bullet ? item.slice(0, LIMITS.bullet) : item,
    );
}

export function hasSpeakableContent(handoff: Handoff): boolean {
  return SECTION_KEYS.some((key) =>
    handoff[key].some((item) => item.trim().length > 0),
  );
}

export type ValidationResult =
  | { ok: true; value: Handoff }
  | { ok: false; error: string };

export function validateHandoff(input: unknown): ValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Expected a handoff object." };
  }

  const raw = input as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    return { ok: false, error: "Give the handoff a title first." };
  }

  const value: Handoff = {
    id:
      typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID(),
    title: title.slice(0, LIMITS.title),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
    changes: cleanBullets(raw.changes),
    blockers: cleanBullets(raw.blockers),
    waitingOnYou: cleanBullets(raw.waitingOnYou),
    nextActions: cleanBullets(raw.nextActions),
    context: cleanBullets(raw.context),
  };

  if (!hasSpeakableContent(value)) {
    return { ok: false, error: "Nothing to speak yet — add at least one item." };
  }

  return { ok: true, value };
}
