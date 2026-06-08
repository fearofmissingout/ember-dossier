import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const defaultFiles = {
  copy: "scripts/check-visible-copy.mjs",
  docs: "docs/playtest-iteration-workflow.md",
  gates: "scripts/check-iteration-gates.mjs",
  packageJson: "package.json",
  publish: "scripts/publish-github-api.mjs",
  viteConfig: "vite.config.ts",
  workflow: ".github/workflows/deploy-cloudflare-pages.yml"
};

const requiredChecks = [
  {
    id: "doc stage: design",
    test: ({ docs }) => docs.includes("## 1.") && docs.includes("### 2.1")
  },
  {
    id: "doc stage: implementation",
    test: ({ docs }) => docs.includes("### 2.2") && docs.includes("src/playtest/")
  },
  {
    id: "doc stage: local test",
    test: ({ docs }) =>
      docs.includes("### 2.3") &&
      docs.includes("npm run iteration:check") &&
      docs.includes("npm run playable:check") &&
      docs.includes("npm run copy:check")
  },
  {
    id: "doc stage: commit",
    test: ({ docs }) => docs.includes("### 2.4") && docs.includes("git status --short")
  },
  {
    id: "doc stage: release",
    test: ({ docs }) => docs.includes("### 2.5") && docs.includes("npm run release:preflight")
  },
  {
    id: "doc stage: production acceptance",
    test: ({ docs }) => docs.includes("### 2.6") && docs.includes("npm run release:verify")
  },
  {
    id: "doc stage: rollback",
    test: ({ docs }) => docs.includes("### 2.7") && docs.includes("git revert")
  },
  {
    id: "doc stage: release cadence",
    test: ({ docs }) => docs.includes("### 2.8") && docs.includes("默认不要频繁发布") && docs.includes("不要用线上部署当测试工具")
  },
  {
    id: "doc safety: secrets",
    test: ({ docs }) => docs.includes("Cloudflare Token") && docs.includes("Supabase")
  },
  {
    id: "doc safety: language",
    test: ({ docs }) => docs.includes("## 4.") && docs.includes("HP") && docs.includes("XP") && docs.includes("未允许的中英混排")
  },
  {
    id: "copy gate: mixed language",
    test: ({ copy }) => copy.includes("hasDisallowedVisibleLatin") && copy.includes("mixed Chinese/English")
  },
  {
    id: "doc qa: browser smoke",
    test: ({ docs }) => docs.includes("https://ember-dossier.pages.dev/?room=playtest-smoke")
  },
  {
    id: "doc qa: local browser smoke checklist",
    test: ({ docs }) =>
      docs.includes("#### 2.3.1 本地浏览器冒烟清单") &&
      docs.includes("http://localhost:5173/?room=playtest-smoke") &&
      docs.includes("视口：桌面 / 手机") &&
      docs.includes("路线预告") &&
      docs.includes("敌人意图") &&
      docs.includes("数据库不可用")
  },
  {
    id: "package script: iteration:check",
    test: ({ scripts }) => scripts["iteration:check"] === "node scripts/check-iteration-gates.mjs"
  },
  {
    id: "package script: workflow:check",
    test: ({ scripts }) => scripts["workflow:check"] === "node scripts/check-workflow-contract.mjs"
  },
  {
    id: "package script: playable:check",
    test: ({ scripts }) => scripts["playable:check"] === "vitest run src/playtest/playableLoop.test.ts"
  },
  {
    id: "package script: copy:check",
    test: ({ scripts }) => scripts["copy:check"] === "node scripts/check-visible-copy.mjs"
  },
  {
    id: "package script: release:preflight",
    test: ({ scripts }) => scripts["release:preflight"]?.includes("--release")
  },
  {
    id: "package script: release:publish:api",
    test: ({ scripts }) => scripts["release:publish:api"] === "node scripts/publish-github-api.mjs"
  },
  {
    id: "package script: release:verify",
    test: ({ scripts }) => scripts["release:verify"]?.includes("--production")
  },
  {
    id: "package script: playtest:check",
    test: ({ scripts }) => scripts["playtest:check"] === "node scripts/check-production-playtest.mjs"
  },
  {
    id: "release gate: workflow contract",
    test: ({ gates }) => gates.includes("scripts/check-workflow-contract.mjs")
  },
  {
    id: "release gate: visible copy",
    test: ({ gates }) => gates.includes('["run", "copy:check"]')
  },
  {
    id: "release gate: playable loop smoke",
    test: ({ gates }) => gates.includes('["run", "playable:check"]')
  },
  {
    id: "release gate: unit tests",
    test: ({ gates }) => gates.includes('["test"]')
  },
  {
    id: "release gate: production build",
    test: ({ gates }) => gates.includes('["run", "build"]')
  },
  {
    id: "build config: playable chunks",
    test: ({ viteConfig }) =>
      viteConfig.includes("manualChunks") &&
      viteConfig.includes("react-vendor") &&
      viteConfig.includes("icons-vendor") &&
      viteConfig.includes("journey-runtime") &&
      viteConfig.includes("game-runtime")
  },
  {
    id: "release gate: Cloudflare Pages config",
    test: ({ gates }) => gates.includes("assertCloudflarePagesConfig")
  },
  {
    id: "release gate: production playtest smoke",
    test: ({ gates }) => gates.includes("productionMode") && gates.includes('["run", "playtest:check"]')
  },
  {
    id: "release fallback: release preflight",
    test: ({ docs, publish }) =>
      docs.includes("npm run release:preflight") &&
      docs.includes("fallback 脚本会") &&
      publish.includes('["run", "release:preflight"]') &&
      publish.includes("Release preflight") &&
      publish.includes("--skip-checks")
  },
  {
    id: "GitHub Actions: local iteration gates",
    test: ({ workflow }) => workflow.includes("Local iteration gates") && workflow.includes("npm run iteration:check")
  },
  {
    id: "GitHub Actions: unit tests",
    test: ({ workflow }) => workflow.includes("npm test")
  },
  {
    id: "GitHub Actions: production build",
    test: ({ workflow }) => workflow.includes("npm run build")
  },
  {
    id: "GitHub Actions: Cloudflare deploy",
    test: ({ workflow }) => workflow.includes("Deploy to Cloudflare Pages")
  },
  {
    id: "GitHub Actions: production playtest smoke",
    test: ({ workflow }) => workflow.includes("Production playtest smoke") && workflow.includes("npm run playtest:check")
  }
];

export function createWorkflowContractReport(files) {
  const packageData = parsePackage(files.packageJson);
  const context = {
    ...files,
    scripts: packageData.scripts ?? {}
  };
  const missing = requiredChecks.filter((check) => !check.test(context)).map((check) => check.id);

  return {
    checked: requiredChecks.length,
    missing,
    ok: missing.length === 0
  };
}

function parsePackage(packageJson) {
  try {
    return JSON.parse(packageJson);
  } catch {
    return {};
  }
}

function loadContractFiles(paths = defaultFiles) {
  const entries = Object.entries(paths).map(([key, path]) => {
    if (!existsSync(path)) {
      throw new Error(`Missing workflow contract file: ${path}`);
    }

    return [key, readFileSync(path, "utf8")];
  });

  return Object.fromEntries(entries);
}

function main() {
  const report = createWorkflowContractReport(loadContractFiles());
  if (!report.ok) {
    console.error("Playtest iteration workflow contract drifted:");
    for (const item of report.missing) {
      console.error(`- ${item}`);
    }
    process.exit(1);
  }

  console.log(`Playtest iteration workflow contract passed (${report.checked} checks).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
