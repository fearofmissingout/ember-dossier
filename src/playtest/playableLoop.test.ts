import { describe, expect, test } from "vitest";
import { runPlayableLoopSmoke } from "./playableLoop";

describe("playable loop smoke", () => {
  test("runs the local base expedition report base loop with actionable checkpoints", () => {
    const smoke = runPlayableLoopSmoke();

    expect(smoke.ok).toBe(true);
    expect(smoke.checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "base-command",
      "squad-assigned",
      "multiplayer-cooperation",
      "combat-round",
      "expedition-settled",
      "report-readable",
      "next-base-action"
    ]);
    expect(smoke.checkpoints.every((checkpoint) => checkpoint.ok)).toBe(true);
    expect(smoke.cooperation.memberCount).toBeGreaterThanOrEqual(2);
    expect(smoke.cooperation.contributionCount).toBeGreaterThanOrEqual(2);
    expect(smoke.cooperation.gaps.length).toBeGreaterThan(0);
    expect(smoke.combatRound?.actionLabel).toBeTruthy();
    expect(smoke.combatRound?.outcomeText).toContain("防");
    expect(smoke.reportDigest.settlement.hasSettlement).toBe(true);
    expect(smoke.reportDigest.ledger.hasLedger).toBe(true);
    expect(smoke.nextBaseTasks.items.length).toBeGreaterThan(0);
  });
});
