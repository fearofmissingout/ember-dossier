import { describe, expect, test } from "vitest";
import { createPublishPlan, formatPublishPlanSummary, parsePublishArgs, selectPublishFiles } from "./publish-github-api.mjs";

describe("GitHub API release fallback", () => {
  test("selects explicit files before falling back to committed HEAD changes", () => {
    expect(
      selectPublishFiles({
        explicitFiles: ["src/App.tsx", "src/styles.css"],
        headChangedFiles: ["README.md"]
      })
    ).toEqual(["src/App.tsx", "src/styles.css"]);

    expect(
      selectPublishFiles({
        explicitFiles: [],
        headChangedFiles: ["src/App.tsx", "", "src/App.tsx", "docs/playtest-iteration-workflow.md"]
      })
    ).toEqual(["src/App.tsx", "docs/playtest-iteration-workflow.md"]);
  });

  test("creates a readable publish plan for the exact remote parent and files", () => {
    const plan = createPublishPlan({
      branch: "master",
      files: ["src/App.tsx", "scripts/publish-github-api.mjs"],
      localCommitSha: "abcdef1234567890",
      message: "Show release fallback",
      parentSha: "1234567890abcdef",
      repo: "fearofmissingout/ember-dossier"
    });

    expect(plan).toMatchObject({
      branch: "master",
      fileCount: 2,
      localCommitSha: "abcdef1234567890",
      parentSha: "1234567890abcdef",
      repo: "fearofmissingout/ember-dossier"
    });
    expect(formatPublishPlanSummary(plan)).toContain("master");
    expect(formatPublishPlanSummary(plan)).toContain("2 files");
    expect(formatPublishPlanSummary(plan)).toContain("1234567");
  });

  test("parses defaults and explicit file lists for the fallback command", () => {
    expect(parsePublishArgs([])).toMatchObject({
      branch: "master",
      files: [],
      repo: "fearofmissingout/ember-dossier",
      runChecks: true
    });

    expect(parsePublishArgs(["--branch", "staging", "--skip-checks", "--files", "src/App.tsx", "src/styles.css"])).toMatchObject({
      branch: "staging",
      files: ["src/App.tsx", "src/styles.css"],
      runChecks: false
    });
  });
});
