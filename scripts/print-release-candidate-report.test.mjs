import { describe, expect, test } from "vitest";
import {
  createReleaseCandidateReport,
  formatReleaseCandidateReport,
  parseReleaseStatusArgs
} from "./print-release-candidate-report.mjs";

describe("release candidate report", () => {
  test("points an unverified feature batch at local browser smoke", () => {
    const report = createReleaseCandidateReport({
      ...parseReleaseStatusArgs(["--major-feature", "--iteration-passed", "--clean-tree"]),
      releaseLabel: "codex/demo abc1234"
    });

    expect(report.readyForPreflight).toBe(false);
    expect(report.nextCommand).toBe("npm run smoke:local");
    expect(report.items.find((item) => item.id === "local-smoke")).toMatchObject({
      ok: false,
      status: "未完成"
    });
    expect(formatReleaseCandidateReport(report)).toContain("发布候选状态报告");
  });

  test("allows preflight only after cadence and local evidence are complete", () => {
    const report = createReleaseCandidateReport({
      ...parseReleaseStatusArgs(["--major-feature", "--iteration-passed", "--local-smoke", "--clean-tree"]),
      releaseLabel: "codex/demo abc1234"
    });

    expect(report.readyForPreflight).toBe(true);
    expect(report.readyForPublish).toBe(false);
    expect(report.nextCommand).toBe("npm run release:preflight");
    expect(report.items.find((item) => item.id === "cadence")).toMatchObject({
      ok: true,
      status: "可预检"
    });
  });

  test("keeps production verification explicit after preflight", () => {
    const report = createReleaseCandidateReport({
      ...parseReleaseStatusArgs(["--batch-complete", "--iteration-passed", "--local-smoke", "--clean-tree", "--preflight-passed"]),
      releaseLabel: "codex/demo abc1234"
    });

    expect(report.readyForPublish).toBe(true);
    expect(report.verified).toBe(false);
    expect(report.nextCommand).toBe("发布后运行 npm run release:verify");
    expect(report.items.find((item) => item.id === "production")).toMatchObject({
      ok: false,
      status: "待发布后"
    });
  });
});
