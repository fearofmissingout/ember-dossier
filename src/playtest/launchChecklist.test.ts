import { describe, expect, test } from "vitest";
import { expeditionLaunchChecklist } from "./launchChecklist";

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
});
