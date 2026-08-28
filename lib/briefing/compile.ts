import type { Handoff } from "@/lib/handoffs/schema";
import { asClause, asSentence, normalizeForSpeech } from "@/lib/briefing/normalize";

export const MAX_BULLETS_PER_SECTION = 3;
/** A ~90 second listen; the compiler progressively drops detail to stay under this. */
export const SCRIPT_CHAR_CAP = 1400;

interface SpokenSection {
  lead: string;
  bullets: string[];
}

function makeSection(lead: string, bullets: string[]): SpokenSection | null {
  const cleaned = bullets.map(asSentence).filter(Boolean);
  return cleaned.length > 0 ? { lead, bullets: cleaned } : null;
}

function buildScript(
  handoff: Handoff,
  perSection: number,
  includeContext: boolean,
): string {
  const title = normalizeForSpeech(handoff.title);
  const sections = [
    makeSection("Since your last session:", handoff.changes),
    makeSection("Blocked:", handoff.blockers),
    makeSection("Waiting on you:", handoff.waitingOnYou),
    includeContext ? makeSection("Worth knowing:", handoff.context) : null,
    // A single next action is carried by the priority close instead.
    handoff.nextActions.length > 1
      ? makeSection("Up next:", handoff.nextActions)
      : null,
  ].filter((section): section is SpokenSection => section !== null);

  const [firstAction] = handoff.nextActions.map(asClause).filter(Boolean);
  const [firstBlocker] = handoff.blockers.map(asClause).filter(Boolean);
  const [firstWaiting] = handoff.waitingOnYou.map(asClause).filter(Boolean);

  if (sections.length === 0 && !firstAction) return "";

  const parts = [`Here's your handoff for ${title}.`];
  for (const section of sections) {
    parts.push(`${section.lead} ${section.bullets.slice(0, perSection).join(" ")}`);
  }

  if (firstAction) {
    parts.push(`Your first priority today: ${firstAction}.`);
  } else if (firstBlocker) {
    parts.push(`Your most urgent blocker: ${firstBlocker}.`);
  } else if (firstWaiting) {
    parts.push(`Most urgent: ${firstWaiting}.`);
  }

  return parts.join(" ");
}

/**
 * Turns a structured handoff into a short spoken briefing.
 * Deterministic by design — the script is the product, not an LLM's mood.
 * Returns "" when there is nothing worth saying.
 */
export function compileBriefing(handoff: Handoff): string {
  const attempts = [
    { perSection: MAX_BULLETS_PER_SECTION, includeContext: true },
    { perSection: 2, includeContext: true },
    { perSection: 2, includeContext: false },
    { perSection: 1, includeContext: false },
  ];

  for (const attempt of attempts) {
    const script = buildScript(handoff, attempt.perSection, attempt.includeContext);
    if (script.length <= SCRIPT_CHAR_CAP) return script;
  }

  const fallback = buildScript(handoff, 1, false);
  return fallback.length <= SCRIPT_CHAR_CAP
    ? fallback
    : `${fallback.slice(0, SCRIPT_CHAR_CAP - 1)}…`;
}
