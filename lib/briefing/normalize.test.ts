import { describe, expect, it } from "vitest";
import { asClause, asSentence, normalizeForSpeech } from "@/lib/briefing/normalize";

describe("normalizeForSpeech", () => {
  it("speaks #412 as a pull request", () => {
    expect(normalizeForSpeech("review #412 today")).toBe(
      "review pull request 412 today",
    );
  });

  it("expands PR shorthand", () => {
    expect(normalizeForSpeech("PR #41 is green, two PRs left")).toBe(
      "pull request 41 is green, two pull requests left",
    );
  });

  it("spaces camelCase identifiers", () => {
    expect(normalizeForSpeech("checkoutFlow regression")).toBe(
      "checkout flow regression",
    );
  });

  it("leaves acronyms and normal words alone", () => {
    expect(normalizeForSpeech("The API contract is stable")).toBe(
      "The API contract is stable",
    );
  });

  it("reduces URLs to a spoken host", () => {
    expect(
      normalizeForSpeech("see https://github.com/acme/relay/pull/7 for details"),
    ).toBe("see github dot com for details");
  });

  it("rewrites arrows and ampersands", () => {
    expect(normalizeForSpeech("auth -> payments & billing")).toBe(
      "auth to payments and billing",
    );
  });
});

describe("asSentence", () => {
  it("capitalizes and terminates", () => {
    expect(asSentence("validate the checkout regression")).toBe(
      "Validate the checkout regression.",
    );
  });

  it("does not double the period", () => {
    expect(asSentence("Deployed yesterday.")).toBe("Deployed yesterday.");
  });
});

describe("asClause", () => {
  it("lowercases regular words for mid-sentence use", () => {
    expect(asClause("Validate the checkout regression")).toBe(
      "validate the checkout regression",
    );
  });

  it("keeps acronyms intact", () => {
    expect(asClause("API keys were rotated")).toBe("API keys were rotated");
  });
});
