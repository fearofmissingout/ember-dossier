import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createVisibleCopyReport } from "./check-visible-copy.mjs";

const filesToScan = [
  "src/App.tsx",
  "src/game/content.ts",
  "src/game/facilities.ts",
  "src/game/labels.ts",
  "src/playtest/content.ts",
  "src/playtest/journey.ts",
  "src/playtest/launchChecklist.ts",
  "src/playtest/progression.ts",
  "src/playtest/reports.ts",
  "src/playtest/sim.ts",
  "src/lib/auth.ts",
  "src/lib/remoteState.ts",
  "functions/api/auth/register.js"
];

describe("visible copy gate source", () => {
  test("keeps required anchors readable Chinese instead of mojibake", () => {
    const source = readFileSync("scripts/check-visible-copy.mjs", "utf8");

    expect(source).toContain("基地总览");
    expect(source).toContain("幸存者");
    expect(source).toContain("远征准备");
    expect(source).toContain("手机端回合战斗面板");
    expect(source).toContain("试玩完整性检查");
    expect(source).not.toContain("鍩哄湴");
    expect(source).not.toContain("璇曠帺");
  });

  test("rejects unapproved mixed Chinese and English visible copy", () => {
    const report = createVisibleCopyReport([
      ...loadVisibleCopyFixtures(),
      {
        path: "fixture.tsx",
        text: `const visible = "准备 Expedition";`
      }
    ]);

    expect(report.ok).toBe(false);
    expect(report.failures.join("\n")).toContain("mixed Chinese/English");
  });

  test("allows approved technical service names in Chinese error copy", () => {
    const report = createVisibleCopyReport([
      ...loadVisibleCopyFixtures(),
      {
        path: "fixture.ts",
        text: `const visible = "Supabase 请求失败，HTTP 500。请检查 Cloudflare 配置。";`
      }
    ]);

    expect(report.failures.filter((failure) => failure.includes("mixed Chinese/English"))).toEqual([]);
  });
});

function loadVisibleCopyFixtures() {
  return filesToScan.map((path) => ({
    path,
    text: readFileSync(path, "utf8")
  }));
}
