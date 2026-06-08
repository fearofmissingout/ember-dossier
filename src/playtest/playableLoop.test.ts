import { describe, expect, test } from "vitest";
import { runPlayableLoopSmoke } from "./playableLoop";

describe("playable loop smoke", () => {
  test("runs the local base expedition report base loop with actionable checkpoints", () => {
    const smoke = runPlayableLoopSmoke();

    expect(smoke.checkpoints.filter((checkpoint) => !checkpoint.ok)).toEqual([]);
    expect(smoke.ok).toBe(true);
    expect(smoke.checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
      "base-command",
      "facility-upgraded",
      "facility-doctrine",
      "survivor-treated",
      "squad-assigned",
      "multiplayer-cooperation",
      "member-guidance",
      "journey-choice-preview",
      "combat-round",
      "expedition-settled",
      "report-readable",
      "next-base-action"
    ]);
    expect(smoke.checkpoints.every((checkpoint) => checkpoint.ok)).toBe(true);
    expect(smoke.facilityFeedTitle).toContain("设施");
    expect(smoke.doctrineDetail).toContain("搜刮套件");
    expect(smoke.treatmentFeedTitle).toContain("治疗");
    expect(smoke.cooperation.memberCount).toBeGreaterThanOrEqual(2);
    expect(smoke.cooperation.contributionCount).toBeGreaterThanOrEqual(2);
    expect(smoke.cooperation.gaps.length).toBeGreaterThan(0);
    expect(smoke.memberGuidanceDetail).toContain("派 1 名幸存者");
    expect(smoke.journeyChoiceDetail).toContain("商店支援");
    expect(smoke.combatRound?.actionLabel).toBeTruthy();
    expect(smoke.combatRound?.outcomeText).toContain("防");
    expect(smoke.reportDigest.settlement.hasSettlement).toBe(true);
    expect(smoke.reportDigest.ledger.hasLedger).toBe(true);
    expect(smoke.nextBaseTasks.items.length).toBeGreaterThan(0);
  });
});
