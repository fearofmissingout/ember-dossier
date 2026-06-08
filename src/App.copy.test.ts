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
});
