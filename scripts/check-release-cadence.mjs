import { fileURLToPath } from "node:url";

const optionHelp = new Map([
  ["--major-feature", "本批次包含玩家可连续体验的大功能切片。"],
  ["--production-blocker", "本批次修复线上阻断试玩的问题。"],
  ["--batch-complete", "多个本地小切片已经合成可感知的完整试玩批次。"],
  ["--local-smoke", "已经按本地浏览器冒烟清单走完核心路径。"],
  ["--iteration-passed", "已经通过 npm run iteration:check。"],
  ["--clean-tree", "工作区干净，当前提交只包含本批次内容。"],
  ["--ui-only", "本批次只有 UI 小调整、文案、小样式或内部整理。"]
]);

export function parseCadenceArgs(argv) {
  const flags = new Set(argv);
  return {
    batchComplete: flags.has("--batch-complete"),
    cleanTree: flags.has("--clean-tree"),
    help: flags.has("--help") || flags.has("-h"),
    iterationPassed: flags.has("--iteration-passed"),
    localSmoke: flags.has("--local-smoke"),
    majorFeature: flags.has("--major-feature"),
    productionBlocker: flags.has("--production-blocker"),
    uiOnly: flags.has("--ui-only")
  };
}

export function createReleaseCadenceDecision(input) {
  const hasReleaseReason = input.majorFeature || input.productionBlocker || input.batchComplete;
  const gates = [
    {
      ok: hasReleaseReason,
      label: "发布理由",
      detail: input.productionBlocker
        ? "线上阻断修复可以单独发布。"
        : input.majorFeature
          ? "本批次包含玩家可连续体验的大功能。"
          : input.batchComplete
            ? "多个本地切片已经形成完整试玩批次。"
            : "没有大功能、线上阻断或完整批次理由。"
    },
    {
      ok: !input.uiOnly || hasReleaseReason,
      label: "小改动节奏",
      detail: input.uiOnly && !hasReleaseReason ? "UI 小调整、文案、小样式和内部整理默认继续留在本地。" : "当前批次不是单纯小改动，或已经有明确发布理由。"
    },
    {
      ok: input.localSmoke,
      label: "本地浏览器冒烟",
      detail: input.localSmoke ? "已经走完本地核心路径。" : "先运行 npm run smoke:local，并按清单手动走完本地页面。"
    },
    {
      ok: input.iterationPassed,
      label: "本地门禁",
      detail: input.iterationPassed ? "已经通过 npm run iteration:check。" : "先运行 npm run iteration:check。"
    },
    {
      ok: input.cleanTree,
      label: "工作区",
      detail: input.cleanTree ? "工作区干净，可以进入发布预检。" : "先提交或移除无关改动，保持发布批次边界清楚。"
    }
  ];
  const canRelease = gates.every((gate) => gate.ok);

  return {
    canRelease,
    gates,
    nextCommand: canRelease ? "npm run release:preflight" : "继续本地迭代，暂不发布",
    summary: canRelease ? "可以进入发布预检。" : "暂不发布：继续在本地累积到完整试玩切片。"
  };
}

export function formatReleaseCadenceDecision(decision) {
  return [
    "发布批次判定",
    "",
    decision.summary,
    "",
    ...decision.gates.map((gate) => `${gate.ok ? "通过" : "未通过"}：${gate.label} - ${gate.detail}`),
    "",
    `下一步：${decision.nextCommand}`
  ].join("\n");
}

function helpText() {
  return [
    "Usage:",
    "  npm run release:cadence -- --major-feature --local-smoke --iteration-passed --clean-tree",
    "",
    "Options:",
    ...[...optionHelp.entries()].map(([flag, text]) => `  ${flag.padEnd(22)} ${text}`)
  ].join("\n");
}

function main() {
  const options = parseCadenceArgs(process.argv.slice(2));
  if (options.help) {
    console.log(helpText());
    return;
  }

  const decision = createReleaseCadenceDecision(options);
  console.log(formatReleaseCadenceDecision(decision));
  process.exitCode = decision.canRelease ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
