import { describe, expect, test } from "vitest";
import { createReleaseCadenceDecision, formatReleaseCadenceDecision, parseCadenceArgs } from "./check-release-cadence.mjs";

describe("release cadence decision", () => {
  test("blocks small local-only changes from publishing by default", () => {
    const decision = createReleaseCadenceDecision(
      parseCadenceArgs(["--ui-only", "--local-smoke", "--iteration-passed", "--clean-tree"])
    );

    expect(decision.canRelease).toBe(false);
    expect(decision.summary).toContain("暂不发布");
    expect(decision.gates.find((gate) => gate.label === "发布理由")?.ok).toBe(false);
    expect(decision.gates.find((gate) => gate.label === "小改动节奏")?.ok).toBe(false);
    expect(formatReleaseCadenceDecision(decision)).toContain("继续本地迭代");
  });

  test("allows a complete feature batch only after local smoke gates are recorded", () => {
    const decision = createReleaseCadenceDecision(
      parseCadenceArgs(["--major-feature", "--local-smoke", "--iteration-passed", "--clean-tree"])
    );

    expect(decision.canRelease).toBe(true);
    expect(decision.summary).toBe("可以进入发布预检。");
    expect(decision.nextCommand).toBe("npm run release:preflight");
    expect(decision.gates.every((gate) => gate.ok)).toBe(true);
  });

  test("keeps a production blocker from bypassing preflight evidence", () => {
    const decision = createReleaseCadenceDecision(parseCadenceArgs(["--production-blocker", "--iteration-passed"]));

    expect(decision.canRelease).toBe(false);
    expect(decision.gates.find((gate) => gate.label === "发布理由")?.ok).toBe(true);
    expect(decision.gates.find((gate) => gate.label === "本地浏览器冒烟")?.ok).toBe(false);
    expect(decision.gates.find((gate) => gate.label === "工作区")?.ok).toBe(false);
  });
});
