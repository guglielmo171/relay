import { describe, expect, it } from "vitest";
import { compileBriefing, SCRIPT_CHAR_CAP } from "@/lib/briefing/compile";
import { createEmptyHandoff, type Handoff } from "@/lib/handoffs/schema";
import { createSampleHandoff } from "@/lib/handoffs/sample";

function handoffWith(patch: Partial<Handoff>): Handoff {
  return { ...createEmptyHandoff("Test project"), ...patch };
}

describe("compileBriefing", () => {
  it("returns an empty script when there is nothing to say", () => {
    expect(compileBriefing(createEmptyHandoff("Empty"))).toBe("");
  });

  it("opens with the handoff title", () => {
    const script = compileBriefing(handoffWith({ changes: ["Shipped the fix"] }));
    expect(script.startsWith("Here's your handoff for Test project.")).toBe(true);
  });

  it("omits empty sections entirely", () => {
    const script = compileBriefing(handoffWith({ changes: ["Shipped the fix"] }));
    expect(script).toContain("Since your last session:");
    expect(script).not.toContain("Blocked:");
    expect(script).not.toContain("Waiting on you:");
    expect(script).not.toContain("Worth knowing:");
    expect(script).not.toContain("Up next:");
  });

  it("closes on the first next action as the priority", () => {
    const script = compileBriefing(
      handoffWith({ nextActions: ["Fix the crash", "Email the team"] }),
    );
    expect(script).toContain("Up next:");
    expect(script.endsWith("Your first priority today: fix the crash.")).toBe(true);
  });

  it("skips the Up next section for a single action and lets the close carry it", () => {
    const script = compileBriefing(
      handoffWith({ nextActions: ["Fix the crash"] }),
    );
    expect(script).not.toContain("Up next:");
    expect(script).toContain("Your first priority today: fix the crash.");
  });

  it("falls back to the most urgent blocker when there are no next actions", () => {
    const script = compileBriefing(
      handoffWith({ blockers: ["Sandbox API is down"] }),
    );
    expect(script).toContain("Your most urgent blocker: sandbox API is down.");
  });

  it("caps bullets per section at three", () => {
    const script = compileBriefing(
      handoffWith({
        changes: ["One", "Two", "Three", "Four", "Five"],
      }),
    );
    expect(script).toContain("Three.");
    expect(script).not.toContain("Four.");
  });

  it("normalizes jargon for speech", () => {
    const script = compileBriefing(
      handoffWith({ changes: ["Merged PR #412 for checkoutFlow"] }),
    );
    expect(script).toContain("Merged pull request 412 for checkout flow.");
  });

  it("stays under the character cap even with dense input", () => {
    const long = "A very detailed thing happened with the release pipeline ".repeat(
      4,
    );
    const script = compileBriefing(
      handoffWith({
        changes: [long, long, long],
        blockers: [long, long, long],
        waitingOnYou: [long, long, long],
        nextActions: [long, long, long],
        context: [long, long],
      }),
    );
    expect(script.length).toBeLessThanOrEqual(SCRIPT_CHAR_CAP);
  });

  it("turns the sample handoff into a briefing, not a field readout", () => {
    const script = compileBriefing(createSampleHandoff());
    expect(script).toContain("Here's your handoff for Checkout and payments.");
    expect(script).toContain("Pull request 412 migrated");
    expect(script).toContain("Waiting on you:");
    expect(script).toContain("Worth knowing: Release freeze starts Friday.");
    expect(script).toContain(
      "Your first priority today: validate the checkout regression on staging.",
    );
  });
});
