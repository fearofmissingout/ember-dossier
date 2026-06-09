import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createReleaseCadenceDecision } from "./check-release-cadence.mjs";

export function parseReleaseStatusArgs(argv) {
  const flags = new Set(argv);
  return {
    batchComplete: flags.has("--batch-complete"),
    cleanTree: flags.has("--clean-tree"),
    help: flags.has("--help") || flags.has("-h"),
    iterationPassed: flags.has("--iteration-passed"),
    localSmoke: flags.has("--local-smoke"),
    majorFeature: flags.has("--major-feature"),
    preflightPassed: flags.has("--preflight-passed"),
    productionBlocker: flags.has("--production-blocker"),
    productionVerified: flags.has("--production-verified"),
    uiOnly: flags.has("--ui-only")
  };
}

export function createReleaseCandidateReport(input) {
  const cadence = createReleaseCadenceDecision({
    batchComplete: input.batchComplete,
    cleanTree: input.cleanTree,
    iterationPassed: input.iterationPassed,
    localSmoke: input.localSmoke,
    majorFeature: input.majorFeature,
    productionBlocker: input.productionBlocker,
    uiOnly: input.uiOnly
  });
  const items = [
    {
      detail: input.releaseLabel,
      id: "scope",
      label: "发布范围",
      ok: input.majorFeature || input.productionBlocker || input.batchComplete,
      status: input.productionBlocker ? "线上阻断" : input.majorFeature ? "大功能" : input.batchComplete ? "完整批次" : "待累计"
    },
    {
      detail: input.iterationPassed ? "已记录 npm run iteration:check 通过。" : "先运行 npm run iteration:check。",
      id: "iteration",
      label: "本地门禁",
      ok: input.iterationPassed,
      status: input.iterationPassed ? "通过" : "未完成"
    },
    {
      detail: input.localSmoke ? "已按本地浏览器冒烟清单走完核心路径。" : "运行 npm run smoke:local 后手动走桌面和手机路径。",
      id: "local-smoke",
      label: "本地浏览器冒烟",
      ok: input.localSmoke,
      status: input.localSmoke ? "通过" : "未完成"
    },
    {
      detail: input.cleanTree ? "工作区干净，提交边界清楚。" : "先提交或移除无关改动。",
      id: "clean-tree",
      label: "工作区",
      ok: input.cleanTree,
      status: input.cleanTree ? "干净" : "有改动"
    },
    {
      detail: cadence.summary,
      id: "cadence",
      label: "发布节奏",
      ok: cadence.canRelease,
      status: cadence.canRelease ? "可预检" : "暂不发布"
    },
    {
      detail: input.preflightPassed ? "已通过 npm run release:preflight。" : "发布前必须再运行 npm run release:preflight。",
      id: "preflight",
      label: "发布预检",
      ok: input.preflightPassed,
      status: input.preflightPassed ? "通过" : "待执行"
    },
    {
      detail: input.productionVerified ? "已通过 npm run release:verify。" : "发布后必须运行 npm run release:verify，并做线上核心路径验收。",
      id: "production",
      label: "线上验收",
      ok: input.productionVerified,
      status: input.productionVerified ? "通过" : "待发布后"
    }
  ];
  const nextCommand = !input.iterationPassed
    ? "npm run iteration:check"
    : !input.localSmoke
      ? "npm run smoke:local"
      : !input.cleanTree
        ? "git status --short"
        : !cadence.canRelease
          ? "继续本地累积，不发布"
          : !input.preflightPassed
            ? "npm run release:preflight"
            : !input.productionVerified
              ? "发布后运行 npm run release:verify"
              : "发布候选已完成验收";

  return {
    cadence,
    items,
    nextCommand,
    readyForPreflight: cadence.canRelease && input.iterationPassed && input.localSmoke && input.cleanTree,
    readyForPublish: cadence.canRelease && input.preflightPassed,
    verified: cadence.canRelease && input.preflightPassed && input.productionVerified
  };
}

export function formatReleaseCandidateReport(report) {
  return [
    "发布候选状态报告",
    "",
    ...report.items.map((item) => `${item.ok ? "通过" : "待办"}：${item.label} - ${item.status}。${item.detail}`),
    "",
    `下一步：${report.nextCommand}`
  ].join("\n");
}

function gitInfo() {
  return {
    branch: captureOptional("git", ["branch", "--show-current"]).stdout.trim() || "unknown",
    cleanTree: !captureOptional("git", ["status", "--porcelain"]).stdout.trim(),
    lastCommit: captureOptional("git", ["log", "-1", "--oneline"]).stdout.trim() || "unknown"
  };
}

function captureOptional(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function helpText() {
  return [
    "Usage:",
    "  npm run release:status -- --major-feature --iteration-passed --local-smoke",
    "",
    "Options:",
    "  --major-feature          本批次包含大功能切片。",
    "  --production-blocker     本批次修复线上阻断。",
    "  --batch-complete         本批次已经形成完整试玩批次。",
    "  --ui-only                本批次只是小改动。",
    "  --iteration-passed       已通过 npm run iteration:check。",
    "  --local-smoke            已完成本地浏览器冒烟。",
    "  --clean-tree             手动声明工作区干净；默认会读取 git status。",
    "  --preflight-passed       已通过 npm run release:preflight。",
    "  --production-verified    已通过 npm run release:verify。"
  ].join("\n");
}

function main() {
  const options = parseReleaseStatusArgs(process.argv.slice(2));
  if (options.help) {
    console.log(helpText());
    return;
  }

  const git = gitInfo();
  const report = createReleaseCandidateReport({
    ...options,
    cleanTree: options.cleanTree || git.cleanTree,
    releaseLabel: `${git.branch} / ${git.lastCommit}`
  });
  console.log(formatReleaseCandidateReport(report));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
