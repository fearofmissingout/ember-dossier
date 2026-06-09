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
      "facility-synergy",
      "facility-stage",
      "logistics-diagnosis",
      "survivor-treated",
      "survivor-growth-plan",
      "squad-assigned",
      "multiplayer-cooperation",
      "room-playtest-readiness",
      "room-contribution-plan",
      "player-cooperation-task",
      "member-guidance",
      "journey-choice-preview",
      "combat-turn-plan",
      "combat-round",
      "expedition-settled",
      "report-readable",
      "next-run-plan",
      "next-base-action"
    ]);
    expect(smoke.checkpoints.every((checkpoint) => checkpoint.ok)).toBe(true);
    expect(smoke.facilityFeedTitle).toContain("设施");
    expect(smoke.doctrineDetail).toContain("搜刮套件");
    expect(smoke.facilitySynergyDetail).toContain("设施协同");
    expect(smoke.facilitySynergyDetail).toContain("恢复线:active");
    expect(smoke.facilitySynergyDetail).toContain("搜刮线:active");
    expect(smoke.facilityStageDetail).toContain("战斗医疗");
    expect(smoke.logisticsDiagnosisDetail).toContain("后勤诊断");
    expect(smoke.treatmentFeedTitle).toContain("治疗");
    expect(smoke.survivorGrowthPlanDetail).toContain("接近升级");
    expect(smoke.cooperation.memberCount).toBeGreaterThanOrEqual(2);
    expect(smoke.cooperation.contributionCount).toBeGreaterThanOrEqual(2);
    expect(smoke.cooperation.gaps.length).toBeGreaterThan(0);
    expect(smoke.roomContributionPlanDetail).toContain("捐入优先级");
    expect(smoke.memberGuidanceDetail).toContain("派 1 名幸存者");
    expect(smoke.journeyChoiceDetail).toContain("商店支援");
    expect(smoke.combatTurnPlan?.label).toBe("防守");
    expect(smoke.combatTurnPlan?.reason).toContain("推荐 防守");
    expect(smoke.combatRound?.actionLabel).toBeTruthy();
    expect(smoke.combatRound?.outcomeText).toContain("防");
    expect(smoke.reportDigest.settlement.hasSettlement).toBe(true);
    expect(smoke.reportDigest.ledger.hasLedger).toBe(true);
    expect(smoke.reportDigest.nextRunPlan.hasPlan).toBe(true);
    expect(smoke.reportDigest.nextRunPlan.items.map((item) => item.id)).toEqual(["route", "risk", "loadout", "base"]);
    expect(smoke.nextBaseTasks.items.length).toBeGreaterThan(0);
  });
});
