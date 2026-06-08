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

    expect(source).toContain("expeditionLaunchChecklist");
    expect(source).toContain("aria-label=\"出征检查\"");
    expect(source).toContain("出征检查");
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
    expect(source).toContain("journey-vitals-strip");
    expect(source).toContain("journey-detail-grid");
    expect(styles).toContain(".journey-command-center");
    expect(styles).toContain(".journey-command-actions");
    expect(styles).toContain(".journey-command-result");
    expect(styles).toContain(".journey-vitals-strip");
    expect(styles).toContain(".journey-primary-actions");
    expect(styles).toContain("@media (max-width: 720px)");
  });

  test("shows a Chinese base task list on the overview", () => {
    const source = readFileSync("src/App.tsx", "utf8");

    expect(source).toContain("baseTaskList");
    expect(source).toContain("aria-label=\"今日基地待办\"");
    expect(source).toContain("aria-label=\"今日待办操作\"");
    expect(source).toContain("base-task-actions");
    expect(source).toContain("今日待办");
  });

  test("shows Chinese next-step actions after expedition reports", () => {
    const source = readFileSync("src/App.tsx", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(source).toContain("aria-label=\"战报下一步\"");
    expect(source).toContain("report-next-actions");
    expect(source).toContain("处理伤病");
    expect(source).toContain("准备下一次远征");
    expect(styles).toContain(".report-next-actions");
  });
});
