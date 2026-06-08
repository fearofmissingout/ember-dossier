import { describe, expect, test } from "vitest";
import type { FeedItem } from "../game/types";
import {
  summarizeFeedBaseReturnPlan,
  summarizeFeedExpeditionDebrief,
  summarizeFeedGrowthRoadmap,
  summarizeFeedReportSettlement,
  summarizeFeedReportTimeline,
  summarizeFeedReturnLedger
} from "./reports";

describe("playtest report timeline", () => {
  test("extracts a readable post-expedition settlement from report logs", () => {
    const report: FeedItem = {
      body: [
        "队伍在北区水处理厂完成路线。结果：艰难完成。主要收获：水 +4，材料 +2。",
        "成长：林岚 +10 经验，升到 Lv.2，解锁 野外跑手。",
        "路线：道路：路段 1，稳步推进，食物 -1，水 -1。疲劳 +8，压力 +6%。",
        "路线：遭遇战：走廊群 被击退。材料 +1，战利标记：破甲碎片，压力 -12%。",
        "路线：路边交易点：购买路线情报。目标 +1，压力 -5%。",
        "伤病：林岚 擦伤，回基地后需要治疗。",
        "账号战利：个人仓库回收材料 +2，稀有零件 +1，情报 +2。",
        "撤离：队伍带回足够细节，下一队能做出更好的路线选择。"
      ].join("\n"),
      id: "feed-report-settlement",
      kind: "report",
      timestamp: "刚刚",
      title: "北区水处理厂远征完成"
    };

    const settlement = summarizeFeedReportSettlement(report);

    expect(settlement.hasSettlement).toBe(true);
    expect(settlement.headline).toBe("艰难完成");
    expect(settlement.resources).toEqual(["水 +4", "材料 +4", "稀有零件 +1", "情报 +2"]);
    expect(settlement.objective).toEqual(["目标 +1"]);
    expect(settlement.growth).toEqual(["林岚 +10 经验，升到 Lv.2，解锁 野外跑手"]);
    expect(settlement.risk).toEqual(["林岚 擦伤，回基地后需要治疗", "压力净变化 -11%", "疲劳 +8"]);
    expect(settlement.summary).toBe("带回 4 项资源，目标推进 1 次，1 名幸存者成长，风险记录 3 条。");
  });

  test("groups expedition feed logs into readable route combat trade and extraction beats", () => {
    const report: FeedItem = {
      body: [
        "队伍在北区水处理厂完成路线。结果：艰难完成。主要收获：水 +4。",
        "成长：林岚 +10 经验，升到 Lv.2，解锁 野外跑手。",
        "出发：队长检查路线标记，队伍离开基地。",
        "路线：道路：路段 1，稳步推进，食物 -1，水 -1。疲劳 +8，压力 +6%。",
        "路线：遭遇战：第 1 回合，林发起攻击，造成 8 伤害，弹药 -1。",
        "路线：遭遇战：走廊群 被击退。材料 +1，战利标记：破甲碎片，压力 -12%。",
        "路线：路边交易点：购买路线情报。目标 +1，压力 -5%。",
        "账号战利：个人仓库回收材料 +2，稀有零件 +1，情报 +2。",
        "路线：撤离窗口：完成信号确认。队伍打开接应通道。",
        "撤离：队伍带回足够细节，下一队能做出更好的路线选择。"
      ].join("\n"),
      id: "feed-report-1",
      kind: "report",
      timestamp: "刚刚",
      title: "北区水处理厂远征完成"
    };

    const timeline = summarizeFeedReportTimeline(report);

    expect(timeline.hasProcess).toBe(true);
    expect(timeline.steps.map((step) => step.category)).toEqual([
      "growth",
      "route",
      "combat",
      "combat",
      "trade",
      "reward",
      "extraction",
      "extraction"
    ]);
    expect(timeline.steps[0]).toMatchObject({
      label: "成长",
      title: "成长"
    });
    expect(timeline.steps[1]).toMatchObject({
      label: "路线",
      title: "路段 1"
    });
    expect(timeline.steps[2]).toMatchObject({
      label: "战斗",
      title: "遭遇战"
    });
    expect(timeline.steps[4]).toMatchObject({
      label: "交易",
      title: "路边交易点"
    });
    expect(timeline.steps[5]).toMatchObject({
      label: "收获",
      title: "账号战利"
    });
    expect(timeline.summary).toContain("成长 1");
    expect(timeline.summary).toContain("路线 1");
    expect(timeline.summary).toContain("战斗 2");
    expect(timeline.summary).toContain("交易 1");
    expect(timeline.summary).toContain("收获 1");
    expect(timeline.summary).toContain("撤离 2");
  });

  test("extracts a return ledger from expedition settlement logs", () => {
    const report: FeedItem = {
      body: [
        "队伍在北区水处理厂完成路线。结果：艰难完成。主要收获：水 +4，材料 +2。",
        "归队清单：基地入库 水 +4, 材料 +2；目标推进 +2；账号回收 个人仓库回收材料 +2，情报 +1；伤病 1 名待恢复；完整撤离。",
        "撤离：队伍带回足够细节，下一队能做出更好的路线选择。"
      ].join("\n"),
      id: "feed-report-ledger",
      kind: "report",
      timestamp: "刚刚",
      title: "北区水处理厂远征完成"
    };

    const ledger = summarizeFeedReturnLedger(report);

    expect(ledger.hasLedger).toBe(true);
    expect(ledger.base).toBe("水 +4, 材料 +2");
    expect(ledger.objective).toBe("目标推进 +2");
    expect(ledger.account).toBe("个人仓库回收材料 +2，情报 +1");
    expect(ledger.injuries).toBe("伤病 1 名待恢复");
    expect(ledger.extraction).toBe("完整撤离");
  });

  test("turns expedition reports into a base return action plan", () => {
    const report: FeedItem = {
      body: [
        "队伍在北区水处理厂完成路线。结果：艰难完成。主要收获：水 +4，材料 +2。",
        "成长：林屿 +10 经验，升到 Lv.2，解锁 野外跑手。",
        "伤病：林屿 擦伤，回基地后需要治疗。",
        "归队清单：基地入库 水 +4, 材料 +2；目标推进 +2；账号回收 个人仓库回收材料 +2，情报 +1；伤病 1 名待恢复；完整撤离。"
      ].join("\n"),
      id: "feed-report-return-plan",
      kind: "report",
      timestamp: "刚刚",
      title: "北区水处理厂远征完成"
    };

    const plan = summarizeFeedBaseReturnPlan(report);

    expect(plan.hasPlan).toBe(true);
    expect(plan.headline).toBe("完整撤离，回基地处理下一轮循环。");
    expect(plan.primaryAction).toEqual(expect.objectContaining({ id: "recovery", label: "处理伤病", targetView: "survivors" }));
    expect(plan.actions).toEqual([
      expect.objectContaining({ id: "storage", label: "整理入库", targetView: "overview", tone: "safe" }),
      expect.objectContaining({ id: "objective", label: "检查目标", targetView: "overview", tone: "safe" }),
      expect.objectContaining({ id: "recovery", label: "处理伤病", targetView: "survivors", tone: "warning" }),
      expect.objectContaining({ id: "growth", label: "分配成长", targetView: "survivors", tone: "safe" })
    ]);
    expect(plan.summary).toContain("水 +4, 材料 +2");
    expect(plan.summary).toContain("目标推进 +2");
  });

  test("prioritizes checking the objective when an expedition returns without progress", () => {
    const report: FeedItem = {
      body: [
        "队伍在旧城医院提前折返。结果：勉强完成。主要收获：药品 +1。",
        "归队清单：基地入库 药品 +1；目标推进 +0；账号回收 个人仓库带回情报 +1；伤病 0；提前返程。"
      ].join("\n"),
      id: "feed-report-objective-priority",
      kind: "report",
      timestamp: "刚刚",
      title: "旧城医院远征完成"
    };

    const plan = summarizeFeedBaseReturnPlan(report);

    expect(plan.primaryAction).toEqual(expect.objectContaining({ id: "objective", label: "检查目标", targetView: "overview", tone: "warning" }));
  });

  test("turns expedition reports into next-run debrief advice", () => {
    const report: FeedItem = {
      body: [
        "结果：提前撤离。主要收获：水 +1，材料 +1。",
        "路线：遭遇战：阀门尸被击退，队伍压力 +12%。",
        "目标：目标 +0。",
        "伤病：林岚 擦伤，回基地后需要治疗。",
        "归队清单：基地入库 水 +1, 材料 +1；目标推进 +0；账号回收 个人仓库带回情报 +1；伤病 1 名待恢复；提前返程。"
      ].join("\n"),
      id: "feed-report-debrief",
      kind: "report",
      timestamp: "第 3 天",
      title: "远征报告"
    };

    const debrief = summarizeFeedExpeditionDebrief(report);

    expect(debrief.hasDebrief).toBe(true);
    expect(debrief.headline).toContain("撤离");
    expect(debrief.summary).toContain("复盘建议");
    expect(debrief.advice.map((item) => item.id)).toEqual(expect.arrayContaining(["risk", "objective", "supplies", "growth", "combat"]));
    expect(debrief.advice.find((item) => item.id === "risk")?.text).toContain("药品");
    expect(debrief.advice.find((item) => item.id === "objective")?.text).toContain("电台");
    expect(debrief.advice.find((item) => item.id === "supplies")?.tone).toBe("blocked");
  });

  test("extracts survivor growth roadmap entries from expedition reports", () => {
    const report: FeedItem = {
      body: [
        "队伍在北区水处理厂完成路线。结果：艰难完成。主要收获：水 +4，材料 +2。",
        "成长：林岚 +10 经验，升到 Lv.2，解锁 野外跑手；玛拉 +8 经验，距 Lv.2 还差 12；奥托 +4 经验，Lv.5 已达上限。",
        "撤离：队伍带回足够细节，下一队能做出更好的路线选择。"
      ].join("\n"),
      id: "feed-report-growth-roadmap",
      kind: "report",
      timestamp: "刚刚",
      title: "北区水处理厂远征完成"
    };

    const roadmap = summarizeFeedGrowthRoadmap(report);

    expect(roadmap.hasGrowth).toBe(true);
    expect(roadmap.summary).toBe("3 名幸存者获得经验 / 2 人升级 / 1 个专长解锁 / 1 条下级目标");
    expect(roadmap.entries).toEqual([
      expect.objectContaining({
        levelText: "升到 Lv.2",
        name: "林岚",
        perkText: "解锁 野外跑手",
        xpText: "+10 经验"
      }),
      expect.objectContaining({
        name: "玛拉",
        nextText: "距 Lv.2 还差 12",
        xpText: "+8 经验"
      }),
      expect.objectContaining({
        levelText: "Lv.5 已达上限",
        name: "奥托",
        xpText: "+4 经验"
      })
    ]);
  });

  test("keeps early return account notes separate from the extraction status", () => {
    const report: FeedItem = {
      body: [
        "队伍在北区水处理厂提前折返。结果：勉强完成。主要收获：水 +4。",
        "归队清单：基地入库 水 +4；目标推进 +0；账号回收 个人仓库带回情报 +1。提前返程不会获得稀有零件；伤病 0；提前返程。"
      ].join("\n"),
      id: "feed-report-early-ledger",
      kind: "report",
      timestamp: "刚刚",
      title: "北区水处理厂远征完成"
    };

    const ledger = summarizeFeedReturnLedger(report);

    expect(ledger.account).toContain("个人仓库带回情报 +1");
    expect(ledger.account).toContain("提前返程不会获得稀有零件");
    expect(ledger.extraction).toBe("提前返程");
  });

  test("ignores non-report feed items and summary-only reports", () => {
    const systemItem: FeedItem = {
      body: "基地事件：围栏缺口。守卫班堵住了缺口。",
      id: "feed-day",
      kind: "system",
      timestamp: "第 2 天",
      title: "第 2 天：围栏缺口"
    };
    const thinReport: FeedItem = {
      body: "队伍在北区水处理厂完成路线。结果：干净完成。主要收获：水 +4。",
      id: "feed-report-2",
      kind: "report",
      timestamp: "刚刚",
      title: "北区水处理厂远征完成"
    };

    expect(summarizeFeedReportTimeline(systemItem).hasProcess).toBe(false);
    expect(summarizeFeedReportTimeline(thinReport).steps).toHaveLength(0);
  });
});
