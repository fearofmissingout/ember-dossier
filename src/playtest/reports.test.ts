import { describe, expect, test } from "vitest";
import type { FeedItem } from "../game/types";
import { summarizeFeedReportTimeline } from "./reports";

describe("playtest report timeline", () => {
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
    expect(timeline.summary).toContain("成长 1");
    expect(timeline.summary).toContain("路线 1");
    expect(timeline.summary).toContain("战斗 2");
    expect(timeline.summary).toContain("交易 1");
    expect(timeline.summary).toContain("撤离 2");
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
