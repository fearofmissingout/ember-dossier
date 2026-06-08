import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("hosted playtest copy", () => {
  test("keeps account and sync-facing notices in Chinese", () => {
    const source = [
      "src/App.tsx",
      "src/lib/auth.ts",
      "src/lib/remoteState.ts",
      "functions/api/auth/register.js"
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(source).toContain("邮箱已确认，正在读取你的试玩账号。");
    expect(source).toContain("账号需要 3-20 位小写字母、数字或下划线。");
    expect(source).not.toMatch(
      /Email confirmed|Loading your playtest account|Username must be|Password needs|Registration failed|Continue as guest|Supabase did not return a session|Username signup did not return a session|Supabase request failed with HTTP/
    );
  });

  test("shows a Chinese expedition launch checklist in the prep UI", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("expeditionLaunchChecklist");
    expect(source).toContain("aria-label=\"出征检查\"");
    expect(source).toContain("aria-label=\"出征开局预案\"");
    expect(source).toContain("aria-label=\"本次远征收益预览\"");
    expect(source).toContain("expeditionYieldPreview");
    expect(source).toContain("收益预览");
    expect(source).toContain("yield-preview");
    expect(source).toContain("dispatch-briefing");
    expect(source).toContain("出征检查");
    expect(styles).toContain(".dispatch-briefing");
    expect(styles).toContain(".yield-preview");
  });

  test("keeps expedition prep as a mobile-first single-page command flow", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("aria-label=\"出征准备指挥台\"");
    expect(source).toContain("aria-label=\"出征准备步骤\"");
    expect(source).toContain("expedition-prep-command");
    expect(source).toContain("expedition-prep-steps");
    expect(source).toContain("scrollToPrepStep");
    expect(source).toContain("document.getElementById(id)?.scrollIntoView");
    expect(source).toContain("id=\"prep-squad\"");
    expect(source).toContain("id=\"prep-route\"");
    expect(source).toContain("id=\"prep-loadout\"");
    expect(source).toContain("id=\"prep-risk\"");
    expect(styles).toContain(".expedition-prep-command");
    expect(styles).toContain(".expedition-prep-step");
    expect(styles).toContain("scroll-margin-top");
  });

  test("shows a Chinese action guide during expeditions", () => {
    const source = readFileSync("src/App.tsx", "utf8");

    expect(source).toContain("journeyActionGuide");
    expect(source).toContain("aria-label=\"出征行动指引\"");
    expect(source).toContain("actionGuide.primaryAction");
  });

  test("keeps the expedition flow as a mobile-friendly single-page command center", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("aria-label=\"远征行动台\"");
    expect(source).toContain("aria-label=\"当前可执行操作\"");
    expect(source).toContain("aria-label=\"最近行动结果\"");
    expect(source).toContain("journey-command-center");
    expect(source).toContain("journey-command-actions");
    expect(source).toContain("journey-command-result");
    expect(source).toContain("journey-mobile-flow");
    expect(source).toContain("aria-label=\"手机端远征页内导航\"");
    expect(source).toContain("scrollToJourneySection");
    expect(source).toContain("id=\"journey-action-options\"");
    expect(source).toContain("id=\"journey-vitals\"");
    expect(source).toContain("id=\"journey-process\"");
    expect(source).toContain("id=\"journey-extraction\"");
    expect(source).toContain("aria-label=\"手机端出征路线摘要\"");
    expect(source).toContain("aria-label=\"当前路线步骤\"");
    expect(source).toContain("aria-label=\"关键状态\"");
    expect(source).toContain("journey-vitals-strip");
    expect(source).toContain("journey-detail-grid");
    expect(styles).toContain(".journey-command-center");
    expect(styles).toContain(".journey-command-actions");
    expect(styles).toContain(".journey-command-result");
    expect(styles).toContain(".journey-mobile-flow");
    expect(styles).toContain(".journey-mobile-route");
    expect(styles).toContain(".journey-mobile-meters");
    expect(styles).toContain(".journey-section-nav");
    expect(styles).toContain(".journey-vitals-strip");
    expect(styles).toContain(".journey-primary-actions");
    expect(styles).toContain("@media (max-width: 720px)");
  });

  test("surfaces combat as a mobile-readable turn panel", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("aria-label=\"手机端回合战斗面板\"");
    expect(source).toContain("aria-label=\"战斗生命摘要\"");
    expect(source).toContain("combat-mobile-dashboard");
    expect(source).toContain("combat-mobile-bars");
    expect(source).toContain("combat-mobile-intent");
    expect(source).toContain("latestCombatRound");
    expect(source).toContain("推荐反制");
    expect(styles).toContain(".combat-mobile-dashboard");
    expect(styles).toContain(".combat-mobile-bars");
    expect(styles).toContain(".combat-mobile-intent");
    expect(styles).toContain(".combat-mobile-result");
  });

  test("keeps mobile navigation as an in-app bottom bar instead of page hops", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("onClick={() => setView(item.key)}");
    expect(source).toContain("className={view === item.key ? \"nav-item active\" : \"nav-item\"}");
    expect(source).toContain("aria-label=\"手机端单页行动栏\"");
    expect(source).toContain("mobile-command-strip");
    expect(source).not.toMatch(/<a\s+href=|window\.location\.href/);
    expect(styles).toContain(".mobile-command-strip");
    expect(styles).toContain("bottom: max(10px, env(safe-area-inset-bottom))");
    expect(styles).toContain("grid-auto-flow: column");
    expect(styles).toContain("overscroll-behavior-x: contain");
    expect(styles).toContain("padding-bottom: calc(76px + env(safe-area-inset-bottom))");
  });

  test("shows facility upgrade value as base and expedition impact", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("facilityImpactPreview");
    expect(source).toContain("aria-label=\"设施升级收益预览\"");
    expect(source).toContain("facility-impact-grid");
    expect(source).toContain("preview.baseText");
    expect(source).toContain("preview.expeditionText");
    expect(styles).toContain(".facility-impact-grid");
  });

  test("shows a Chinese base task list on the overview", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("baseTaskList");
    expect(source).toContain("baseCycleSteps");
    expect(source).toContain("aria-label=\"基地循环罗盘\"");
    expect(source).toContain("恢复");
    expect(source).toContain("建设");
    expect(source).toContain("出征");
    expect(source).toContain("复盘");
    expect(source).toContain("aria-label=\"基地行动中枢\"");
    expect(source).toContain("base-command-center");
    expect(source).toContain("base-command-actions");
    expect(source).toContain("aria-label=\"今日基地待办\"");
    expect(source).toContain("aria-label=\"今日待办操作\"");
    expect(source).toContain("base-task-actions");
    expect(styles).toContain(".base-cycle-compass");
    expect(styles).toContain(".base-command-center");
    expect(styles).toContain(".base-command-actions");
    expect(source).toContain("今日待办");
  });

  test("shows post-expedition recovery priority in the survivor view", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("recoveryPlan.immediateTreatments");
    expect(source).toContain("recoveryPlan.medicineAvailable");
    expect(source).toContain("recoveryPlan.medicineShortage");
    expect(source).toContain("recoveryPlan.nextAction");
    expect(source).toContain("recovery-next-action");
    expect(source).toContain("可治疗");
    expect(source).toContain("下一步");
    expect(styles).toContain(".recovery-next-action");
    expect(styles).toContain("repeat(auto-fit, minmax(120px, 1fr))");
  });

  test("shows Chinese next-step actions after expedition reports", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("aria-label=\"战报下一步\"");
    expect(source).toContain("aria-label=\"战后复盘\"");
    expect(source).toContain("aria-label=\"幸存者成长路线\"");
    expect(source).toContain("summarizeFeedGrowthRoadmap");
    expect(source).toContain("report-growth-roadmap");
    expect(source).toContain("report-action-digest");
    expect(source).toContain("report-next-actions");
    expect(source).toContain("summarizeFeedBaseReturnPlan");
    expect(source).toContain("aria-label=\"远征回基地处理队列\"");
    expect(source).toContain("base-return-plan");
    expect(source).toContain("处理伤病");
    expect(source).toContain("准备下一次远征");
    expect(styles).toContain(".report-growth-roadmap");
    expect(styles).toContain(".report-action-digest");
    expect(styles).toContain(".report-next-actions");
    expect(styles).toContain(".base-return-plan");
  });

  test("shows a Chinese room cooperation summary for multiplayer rooms", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("roomCooperationSummary");
    expect(source).toContain("aria-label=\"房间协作总览\"");
    expect(source).toContain("协作状态");
    expect(source).toContain("下一步：");
    expect(source).toContain("room-cooperation-board");
    expect(source).toContain("room-cooperation-metrics");
    expect(styles).toContain(".room-cooperation-board");
    expect(styles).toContain(".room-cooperation-metrics");
  });
});
