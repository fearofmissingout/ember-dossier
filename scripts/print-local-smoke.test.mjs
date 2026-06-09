import { describe, expect, test } from "vitest";
import { formatLocalSmokeChecklist, localSmokeChecklist } from "./print-local-smoke.mjs";

describe("local browser smoke checklist", () => {
  test("prints the reusable local playtest route", () => {
    const text = formatLocalSmokeChecklist();

    expect(localSmokeChecklist.address).toBe("http://localhost:5173/?room=playtest-smoke");
    expect(localSmokeChecklist.coverage).toEqual(
      expect.arrayContaining(["auth", "baseEventForecast", "facilityDevelopment", "memberCooperation", "combatOrEvent", "databaseFallback"])
    );
    expect(text).toContain("本地浏览器冒烟清单");
    expect(text).toContain("npm run dev");
    expect(text).toContain("基地事件预判");
    expect(text).toContain("基地经营优先级");
    expect(text).toContain("设施发展");
    expect(text).toContain("多人协作");
    expect(text).toContain("出征准备");
    expect(text).toContain("敌人意图");
    expect(text).toContain("撤离结算");
    expect(text).toContain("手机视口");
    expect(text).toContain("数据库不可用");
    expect(text).toContain("视口：桌面 / 手机");
  });
});
