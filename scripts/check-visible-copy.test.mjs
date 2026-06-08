import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

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
});
