import { describe, expect, test } from "vitest";
import { createWorkflowContractReport } from "./check-workflow-contract.mjs";

function completeContractFiles(overrides = {}) {
  return {
    docs: `# Workflow
## 1. Principles
### 2.1 Design
### 2.2 Implementation
Rules live in src/playtest/
### 2.3 Local test
npm run iteration:check
npm run playable:check
npm run copy:check
### 2.4 Commit
git status --short
### 2.5 Release
npm run release:preflight
### 2.6 Production acceptance
npm run release:verify
### 2.7 Rollback
git revert
### 2.8 Release cadence
默认不要频繁发布
不要用线上部署当测试工具
Cloudflare Token
Supabase
## 4. Copy
HP
XP
https://ember-dossier.pages.dev/?room=playtest-smoke
`,
    gates: `
assertCloudflarePagesConfig();
run("node", ["scripts/check-workflow-contract.mjs"], "Workflow contract");
run("npm", ["run", "copy:check"], "Visible copy check");
run("npm", ["run", "playable:check"], "Playable loop smoke");
run("npm", ["test"], "Unit and smoke tests");
run("npm", ["run", "build"], "Typecheck and production build");
if (productionMode) {
  run("npm", ["run", "playtest:check"], "Production playtest smoke");
}
`,
    packageJson: JSON.stringify({
      scripts: {
        "iteration:check": "node scripts/check-iteration-gates.mjs",
        "copy:check": "node scripts/check-visible-copy.mjs",
        "playable:check": "vitest run src/playtest/playableLoop.test.ts",
        "playtest:check": "node scripts/check-production-playtest.mjs",
        "release:preflight": "node scripts/check-iteration-gates.mjs --release",
        "release:publish:api": "node scripts/publish-github-api.mjs",
        "release:verify": "node scripts/check-iteration-gates.mjs --production",
        "workflow:check": "node scripts/check-workflow-contract.mjs"
      }
    }),
    workflow: `
- name: Local iteration gates
  run: npm run iteration:check
- run: npm test
- run: npm run build
- name: Deploy to Cloudflare Pages
- name: Production playtest smoke
  run: npm run playtest:check
`,
    ...overrides
  };
}

describe("playtest iteration workflow contract", () => {
  test("covers the required design implementation test release and recovery gates", () => {
    const report = createWorkflowContractReport(completeContractFiles());

    expect(report.ok).toBe(true);
    expect(report.missing).toEqual([]);
  });

  test("reports drift when release discipline loses production smoke checks", () => {
    const report = createWorkflowContractReport(
      completeContractFiles({
        gates: 'run("npm", ["test"], "Unit and smoke tests"); run("npm", ["run", "build"], "Typecheck and production build");',
        packageJson: JSON.stringify({
          scripts: {
        "iteration:check": "node scripts/check-iteration-gates.mjs",
        "playable:check": "vitest run src/playtest/playableLoop.test.ts",
        "copy:check": "node scripts/check-visible-copy.mjs",
        "playtest:check": "node scripts/check-production-playtest.mjs",
            "release:preflight": "node scripts/check-iteration-gates.mjs --release",
            "release:publish:api": "node scripts/publish-github-api.mjs",
            "release:verify": "node scripts/check-iteration-gates.mjs --production"
          }
        }),
        workflow: "- run: npm test\n- run: npm run build"
      })
    );

    expect(report.ok).toBe(false);
    expect(report.missing).toEqual(
      expect.arrayContaining([
        "package script: workflow:check",
        "release gate: playable loop smoke",
        "release gate: workflow contract",
        "release gate: production playtest smoke",
        "GitHub Actions: local iteration gates",
        "GitHub Actions: production playtest smoke"
      ])
    );
  });

  test("reports drift when the playable loop smoke script is removed", () => {
    const report = createWorkflowContractReport(
      completeContractFiles({
        gates: `
run("node", ["scripts/check-workflow-contract.mjs"], "Workflow contract");
run("npm", ["test"], "Unit and smoke tests");
run("npm", ["run", "build"], "Typecheck and production build");
if (productionMode) {
  run("npm", ["run", "playtest:check"], "Production playtest smoke");
}
`,
        packageJson: JSON.stringify({
          scripts: {
            "iteration:check": "node scripts/check-iteration-gates.mjs",
            "copy:check": "node scripts/check-visible-copy.mjs",
            "playtest:check": "node scripts/check-production-playtest.mjs",
            "release:preflight": "node scripts/check-iteration-gates.mjs --release",
            "release:publish:api": "node scripts/publish-github-api.mjs",
            "release:verify": "node scripts/check-iteration-gates.mjs --production",
            "workflow:check": "node scripts/check-workflow-contract.mjs"
          }
        })
      })
    );

    expect(report.ok).toBe(false);
    expect(report.missing).toEqual(expect.arrayContaining(["package script: playable:check", "release gate: playable loop smoke"]));
  });
});
