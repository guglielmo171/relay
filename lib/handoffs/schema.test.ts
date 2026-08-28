import { describe, expect, it } from "vitest";
import {
  createEmptyHandoff,
  hasSpeakableContent,
  validateHandoff,
} from "@/lib/handoffs/schema";

describe("validateHandoff", () => {
  it("rejects non-objects", () => {
    expect(validateHandoff(null).ok).toBe(false);
    expect(validateHandoff("nope").ok).toBe(false);
  });

  it("rejects a missing title", () => {
    const result = validateHandoff({ changes: ["x"] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/title/i);
  });

  it("rejects a handoff with nothing to speak", () => {
    const result = validateHandoff({ title: "Quiet day" });
    expect(result.ok).toBe(false);
  });

  it("cleans and keeps valid content", () => {
    const result = validateHandoff({
      title: "  Checkout  ",
      changes: ["  shipped it  ", "", 42, "   "],
      nextActions: ["review PR #9"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Checkout");
      expect(result.value.changes).toEqual(["shipped it"]);
      expect(result.value.nextActions).toEqual(["review PR #9"]);
    }
  });

  it("truncates oversized bullets instead of failing", () => {
    const result = validateHandoff({
      title: "Long",
      changes: ["x".repeat(400)],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.changes[0].length).toBe(280);
  });
});

describe("hasSpeakableContent", () => {
  it("is false for a fresh handoff and true with one item", () => {
    const handoff = createEmptyHandoff("T");
    expect(hasSpeakableContent(handoff)).toBe(false);
    handoff.context = ["Release freeze Friday"];
    expect(hasSpeakableContent(handoff)).toBe(true);
  });
});
