import type { Handoff } from "@/lib/handoffs/schema";

export function createSampleHandoff(): Handoff {
  return {
    id: crypto.randomUUID(),
    title: "Checkout and payments",
    updatedAt: Date.now(),
    changes: [
      "The authentication refactor was deployed to production yesterday",
      "PR #412 migrated the checkout form to the new design system",
    ],
    blockers: [
      "The payment integration is still failing against the sandbox API",
    ],
    waitingOnYou: [
      "PR #418 and PR #421 are waiting for your review",
      "Design needs a decision on the empty-cart state",
    ],
    nextActions: [
      "Validate the checkout regression on staging",
      "Reply to the payments team about sandbox credentials",
    ],
    context: ["Release freeze starts Friday"],
  };
}
