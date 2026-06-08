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

  test("shows survivor growth planning as a base loop surface", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("survivorGrowthPlan");
    expect(source).toContain("aria-label=\"幸存者培养队列\"");
    expect(source).toContain("accountGrowthBoundary");
    expect(source).toContain("aria-label=\"账号成长边界\"");
    expect(source).toContain("growthBoundary.survivorProgressLabel");
    expect(source).toContain("growthBoundary.baseCapLabel");
    expect(source).toContain("培养队列");
    expect(source).toContain("按顺序处理，下一次出征更稳。");
    expect(styles).toContain(".account-growth-boundary");
    expect(styles).toContain(".account-growth-metrics");
    expect(styles).toContain(".growth-plan-card");
    expect(styles).toContain(".growth-plan-grid");
    expect(styles).toContain(".growth-plan-item.ready");
    expect(styles).toContain(".growth-plan-item.blocked");
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
    expect(source).toContain("aria-label=\"出征地点列表\"");
    expect(source).toContain("location-choice-grid");
    expect(source).toContain("location-choice-card");
    expect(source).toContain("locationRewardSummary");
    expect(source).toContain("主要收益");
    expect(source).toContain("location.recommendedStats.map");
    expect(source).toContain("location.tags.slice(0, 3)");
    expect(source).toContain("id=\"prep-loadout\"");
    expect(source).toContain("id=\"prep-risk\"");
    expect(styles).toContain(".expedition-prep-command");
    expect(styles).toContain(".expedition-prep-step");
    expect(styles).toContain(".location-choice-grid");
    expect(styles).toContain(".location-choice-card");
    expect(styles).toContain(".location-choice-reward");
    expect(styles).toContain(".location-choice-stats");
    expect(styles).toContain(".location-choice-tags");
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
    expect(source).toContain("aria-label=\"手机端单页行动摘要\"");
    expect(source).toContain("当前回合");
    expect(source).toContain("处理当前");
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
    expect(styles).toContain("position: sticky");
    expect(styles).toContain("padding-bottom: 28px");
    expect(styles).not.toContain("bottom: calc(76px + max(10px, env(safe-area-inset-bottom)))");
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

    expect(source).toContain("data-app-mode=\"single-page\"");
    expect(source).toContain("onClick={() => setView(item.key)}");
    expect(source).toContain("mobilePrimary: true");
    expect(source).toContain("const navClassName = [");
    expect(source).toContain("item.mobilePrimary ? \"mobile-primary\" : \"mobile-secondary\"");
    expect(source).toContain("aria-label=\"手机端单页行动栏\"");
    expect(source).toContain("aria-label=\"数据库同步提示\"");
    expect(source).toContain("aria-label=\"房间捐入优先级\"");
    expect(source).toContain("可以继续本地试玩；重试会重新读取房间并上传当前进度。");
    expect(source).toContain("账号进度会先保留在本机；稍后刷新页面或重新登录后再同步。");
    expect(source).toContain("roomContributionPlan(session)");
    expect(source).toContain("捐入优先级");
    expect(source).toContain("mobile-command-strip");
    expect(source).toContain("sync-health-card");
    expect(source).not.toMatch(/<a\s+href=|window\.location\.href/);
    expect(styles).toContain(".mobile-command-strip");
    expect(styles).toContain(".nav-item.mobile-secondary");
    expect(styles).toContain(".sync-health-card");
    expect(styles).toContain(".room-contribution-plan");
    expect(styles).toContain(".room-contribution-grid");
    expect(styles).toContain("bottom: max(10px, env(safe-area-inset-bottom))");
    expect(styles).toContain("grid-auto-flow: column");
    expect(styles).toContain("overscroll-behavior-x: contain");
    expect(styles).toContain("padding-bottom: calc(76px + env(safe-area-inset-bottom))");
  });

  test("surfaces playtest language and release settings inside the single-page shell", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("const playtestSettings = {");
    expect(source).toContain("languageMode: \"中文\"");
    expect(source).toContain("英文包待接入后再开放切换");
    expect(source).toContain("aria-label=\"试玩设置\"");
    expect(source).toContain("playtest-settings-card");
    expect(source).toContain("playtestSettings.pageStatus");
    expect(source).toContain("playtestSettings.releaseStatus");
    expect(styles).toContain(".playtest-settings-card");
    expect(styles).toContain(".playtest-settings-grid");
  });

  test("keeps expedition actions reachable as a mobile single-page command dock", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("aria-label=\"当前可执行操作\"");
    expect(source).toContain("aria-label=\"当前行动栏说明\"");
    expect(source).toContain("aria-label=\"路线预告\"");
    expect(source).toContain("aria-label=\"手机端路线预告\"");
    expect(source).toContain("journey-command-actions");
    expect(source).toContain("journey-command-dock-heading");
    expect(source).toContain("journeyRouteIntel");
    expect(source).toContain("journey-route-intel");
    expect(source).toContain("journey-mobile-intel");
    expect(source).toContain("aria-label=\"出征后勤诊断\"");
    expect(source).toContain("supportDiagnosis.sources.map");
    expect(source).toContain("房间设施");
    expect(source).toContain("个人基地");
    expect(source).toContain("留守班次");
    expect(source).toContain("前方仍有战斗，优先保留弹药、医疗和队伍体力。");
    expect(source).toContain("outcome.supportText && <small className=\"facility-support-note\"");
    expect(source).toContain("formatSignedPercent(outcome.pressure)");
    expect(source).toContain("目标 +${outcome.objectiveBonus}");
    expect(styles).toContain(".journey-command-actions");
    expect(styles).toContain(".journey-command-dock-heading");
    expect(styles).toContain(".journey-route-intel");
    expect(styles).toContain(".journey-mobile-intel");
    expect(styles).toContain(".support-diagnosis-card");
    expect(styles).toContain(".support-source-grid");
    expect(styles).toContain(".facility-support-note");
    expect(styles).toContain("top: 48px");
    expect(styles).toContain("max-height: none");
    expect(styles).toContain("overscroll-behavior: contain");
    expect(styles).not.toContain("max-height: 42vh");
  });

  test("shows facility upgrade value as base and expedition impact", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("facilityImpactPreview");
    expect(source).toContain("aria-label=\"设施升级收益预览\"");
    expect(source).toContain("aria-label=\"设施推荐原因\"");
    expect(source).toContain("development-project-why");
    expect(source).toContain("project.reason");
    expect(source).toContain("project.nextStep");
    expect(source).toContain("facility-impact-grid");
    expect(source).toContain("preview.baseText");
    expect(source).toContain("preview.expeditionText");
    expect(source).toContain("expeditionDoctrineForFacility");
    expect(source).toContain("aria-label=\"设施出征方针解锁\"");
    expect(source).toContain("facility-doctrine-unlock");
    expect(source).toContain("已解锁出征方针");
    expect(source).toContain("建造后解锁");
    expect(styles).toContain(".development-project-why");
    expect(styles).toContain(".facility-impact-grid");
    expect(styles).toContain(".facility-doctrine-unlock");
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
    expect(source).toContain("aria-label=\"基地归队承接\"");
    expect(source).toContain("overview-return-card");
    expect(source).toContain("latestReturnPlan.actions.map");
    expect(source).toContain("归队承接");
    expect(source).toContain("查看战报");
    expect(source).toContain("aria-label=\"今日基地待办\"");
    expect(source).toContain("aria-label=\"今日待办操作\"");
    expect(source).toContain("base-task-actions");
    expect(styles).toContain(".base-cycle-compass");
    expect(styles).toContain(".base-command-center");
    expect(styles).toContain(".base-command-actions");
    expect(styles).toContain(".overview-return-card");
    expect(styles).toContain(".overview-return-actions");
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
    expect(source).toContain("aria-label=\"下一轮远征建议\"");
    expect(source).toContain("aria-label=\"幸存者成长路线\"");
    expect(source).toContain("summarizeFeedExpeditionDebrief");
    expect(source).toContain("summarizeFeedGrowthRoadmap");
    expect(source).toContain("report-expedition-debrief");
    expect(source).toContain("report-growth-roadmap");
    expect(source).toContain("report-action-digest");
    expect(source).toContain("report-next-actions");
    expect(source).toContain("summarizeFeedBaseReturnPlan");
    expect(source).toContain("aria-label=\"远征回基地处理队列\"");
    expect(source).toContain("base-return-plan");
    expect(source).toContain("处理伤病");
    expect(source).toContain("准备下一次远征");
    expect(styles).toContain(".report-growth-roadmap");
    expect(styles).toContain(".report-expedition-debrief");
    expect(styles).toContain(".report-expedition-debrief-grid");
    expect(styles).toContain(".report-action-digest");
    expect(styles).toContain(".report-next-actions");
    expect(styles).toContain(".base-return-plan");
  });

  test("shows a local playtest readiness checklist in the archive view", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("runPlayableLoopSmoke");
    expect(source).toContain("aria-label=\"试玩完整性检查\"");
    expect(source).toContain("核心试玩闭环已通过");
    expect(source).toContain("playtest-readiness-card");
    expect(source).toContain("playtest-checkpoint-grid");
    expect(source).toContain("aria-label=\"发布前本地门禁\"");
    expect(source).toContain("npm run copy:check");
    expect(source).toContain("npm run playable:check");
    expect(source).toContain("npm run iteration:check");
    expect(source).toContain("playtestCheckpointLabel");
    expect(source).toContain("设施升级");
    expect(source).toContain("伤病治疗");
    expect(source).toContain("多人协作");
    expect(source).toContain("回合战斗");
    expect(source).toContain("回基地行动");
    expect(styles).toContain(".playtest-readiness-card");
    expect(styles).toContain(".playtest-checkpoint-grid");
    expect(styles).toContain(".playtest-checkpoint");
    expect(styles).toContain(".playtest-gate-strip");
  });

  test("shows a Chinese room cooperation summary for multiplayer rooms", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("roomCooperationSummary");
    expect(source).toContain("roomPlaytestReadiness");
    expect(source).toContain("aria-label=\"房间协作总览\"");
    expect(source).toContain("aria-label=\"多人试玩开局检查\"");
    expect(source).toContain("协作状态");
    expect(source).toContain("下一步：");
    expect(source).toContain("summary.actionHint");
    expect(source).toContain("playtestReadiness.items.map");
    expect(source).toContain("roomReadinessTargetView(playtestReadiness)");
    expect(source).toContain("开局检查");
    expect(source).toContain("summary.gaps.map");
    expect(source).toContain("aria-label=\"房间协作缺口\"");
    expect(source).toContain("room-cooperation-board");
    expect(source).toContain("room-cooperation-metrics");
    expect(source).toContain("room-cooperation-gaps");
    expect(source).toContain("room-gap-card");
    expect(source).toContain("room-playtest-readiness");
    expect(source).toContain("room-playtest-check-grid");
    expect(source).toContain("member.collaborationHint");
    expect(source).toContain("member-collaboration-hint");
    expect(source).toContain("协作建议：");
    expect(styles).toContain(".room-cooperation-board");
    expect(styles).toContain(".room-cooperation-metrics");
    expect(styles).toContain(".room-cooperation-gaps");
    expect(styles).toContain(".room-gap-card");
    expect(styles).toContain(".room-playtest-readiness");
    expect(styles).toContain(".room-playtest-check-grid");
    expect(styles).toContain(".member-collaboration-hint");
  });
});
