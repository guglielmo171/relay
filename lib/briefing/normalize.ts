/**
 * Engineers write for readers; a voice reads aloud. This pass rewrites the
 * worst offenders (URLs, PR shorthand, arrows, camelCase) into something a
 * TTS model says naturally.
 */
export function normalizeForSpeech(input: string): string {
  let text = input;

  // URLs read terribly aloud; speak just the host.
  text = text.replace(/https?:\/\/([^\s/]+)\S*/g, (_match, host: string) =>
    host.replace(/\./g, " dot "),
  );

  // Pull-request shorthand before generic #123 handling.
  text = text.replace(/\bPRs?\s*#(\d+)/gi, "pull request $1");
  text = text.replace(/\bPRs\b/g, "pull requests");
  text = text.replace(/\bPR\b/g, "pull request");
  text = text.replace(/(^|\s)#(\d+)/g, "$1pull request $2");

  text = text.replace(/\s*(?:->|→|=>)\s*/g, " to ");
  text = text.replace(/\s*&\s*/g, " and ");
  text = text.replace(/\be\.g\./gi, "for example");
  text = text.replace(/\bi\.e\./gi, "that is");

  // Identifiers like checkoutFlow / PullRequest -> spaced lowercase words.
  // Only words with an internal lower->upper boundary, so "The" or "API"
  // are left alone.
  text = text.replace(/\b\w*[a-z][A-Z]\w*\b/g, (word) =>
    word
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .toLowerCase(),
  );

  return text.replace(/\s+/g, " ").trim();
}

/** A bullet rendered as a standalone spoken sentence: "Validate x" -> "Validate x." */
export function asSentence(input: string): string {
  const normalized = normalizeForSpeech(input).replace(/[.\s]+$/, "");
  if (!normalized) return "";
  return `${normalized[0].toUpperCase()}${normalized.slice(1)}.`;
}

/** A bullet rendered mid-sentence: "Validate x" -> "validate x", acronyms kept. */
export function asClause(input: string): string {
  const normalized = normalizeForSpeech(input).replace(/[.\s]+$/, "");
  if (!normalized) return "";
  if (/^[A-Z][a-z]/.test(normalized)) {
    return normalized[0].toLowerCase() + normalized.slice(1);
  }
  return normalized;
}
