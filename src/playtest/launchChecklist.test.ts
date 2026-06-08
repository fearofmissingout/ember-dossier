import { describe, expect, test } from "vitest";
import { expeditionLaunchChecklist, expeditionYieldPreview } from "./launchChecklist";

describe("expedition launch checklist", () => {
  test("explains every blocker before dispatch", () => {
    const checklist = expeditionLaunchChecklist({
      canAffordLoadout: false,
      hasActiveJourney: true,
      objectiveActive: true,
      selectedLocationName: "北区水处理厂",
      squadCount: 2
    });

    expect(checklist.canDispatch).toBe(false);
    expect(checklist.summary).toBe("还不能派遣：编队、随身补给、远征状态。");
    expect(checklist.items).toEqual([
      expect.objectContaining({
        id: "squad",
        status: "blocked",
        text: "还需要 1 名幸存者，远征队伍需要 3-5 人。"
      }),
      expect.objectContaining({
        id: "loadout",
        status: "blocked",
        text: "携带物资超过基地库存，先减少补给或捐入资源。"
      }),
      expect.objectContaining({
        id: "objective",
        status: "ready"
      }),
      expect.objectContaining({
        id: "journey",
        status: "blocked",
        text: "已有远征在路上，先处理当前路线。"
      })
    ]);
  });

  test("confirms dispatch when squad resources objective and route are ready", () => {
    const checklist = expeditionLaunchChecklist({
      canAffordLoadout: true,
      hasActiveJourney: false,
      objectiveActive: true,
      selectedLocationName: "旧城医院",
      squadCount: 4
    });

    expect(checklist.canDispatch).toBe(true);
    expect(checklist.summary).toBe("可以派遣：4 人编队已准备前往旧城医院。");
    expect(checklist.items.every((item) => item.status === "ready")).toBe(true);
  });

  test("previews expedition value before dispatch", () => {
    const preview = expeditionYieldPreview({
      canDispatch: true,
      loadoutTotal: 4,
      objectiveActive: true,
      readiness: 74,
      riskLabel: "标准",
      selectedLocationName: "旧城医院",
      squadCount: 4,
      supportEffects: 6,
      trainingLevel: 2
    });

    expect(preview.headline).toBe("旧城医院 会推进基地目标，并给 4 名幸存者结算经验。");
    expect(preview.items).toEqual([
      expect.objectContaining({ label: "基地目标", tone: "safe", value: "可推进" }),
      expect.objectContaining({ detail: "预计每名参与者至少 +12 经验", label: "幸存者成长", value: "4 人" }),
      expect.objectContaining({ label: "资源回收", tone: "safe", value: "可带回" }),
      expect.objectContaining({ label: "后勤支援", tone: "safe", value: "已接入" }),
      expect.objectContaining({ label: "出发把握", tone: "safe", value: "优势" })
    ]);
  });

  test("previews missing value when dispatch is blocked", () => {
    const preview = expeditionYieldPreview({
      canDispatch: false,
      loadoutTotal: 0,
      objectiveActive: false,
      readiness: 28,
      riskLabel: "贪婪",
      selectedLocationName: "北区水处理厂",
      squadCount: 0,
      supportEffects: 0,
      trainingLevel: 0
    });

    expect(preview.headline).toBe("先补齐派遣条件，再确认本次远征收益。");
    expect(preview.items.map((item) => item.tone)).toEqual(["blocked", "blocked", "warning", "warning", "blocked"]);
  });
});
