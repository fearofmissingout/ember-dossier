import type { FeedItem } from "../game/types";

export type FeedReportTimelineCategory = "route" | "combat" | "trade" | "camp" | "extraction" | "reward" | "risk";

export type FeedReportTimelineStep = {
  body: string;
  category: FeedReportTimelineCategory;
  label: string;
  source: string;
  title: string;
};

export type FeedReportTimeline = {
  hasProcess: boolean;
  steps: FeedReportTimelineStep[];
  summary: string;
};

const categoryLabels: Record<FeedReportTimelineCategory, string> = {
  camp: "营地",
  combat: "战斗",
  extraction: "撤离",
  reward: "收获",
  risk: "风险",
  route: "路线",
  trade: "交易"
};

const summaryOrder: FeedReportTimelineCategory[] = ["route", "combat", "trade", "camp", "extraction", "reward", "risk"];

export function summarizeFeedReportTimeline(item: FeedItem): FeedReportTimeline {
  if (item.kind !== "report") {
    return emptyTimeline();
  }

  const steps = item.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseTimelineStep)
    .filter((step): step is FeedReportTimelineStep => Boolean(step));

  if (!steps.length) {
    return emptyTimeline();
  }

  return {
    hasProcess: true,
    steps,
    summary: summarizeSteps(steps)
  };
}

function emptyTimeline(): FeedReportTimeline {
  return {
    hasProcess: false,
    steps: [],
    summary: "暂无过程回放"
  };
}

function parseTimelineStep(line: string): FeedReportTimelineStep | null {
  if (isReportSummaryLine(line)) {
    return null;
  }

  const source = stripRoutePrefix(line);
  const category = classifyTimelineLine(source);
  if (!category) {
    return null;
  }

  return {
    body: timelineBody(source),
    category,
    label: categoryLabels[category],
    source: line,
    title: timelineTitle(source, category)
  };
}

function stripRoutePrefix(line: string): string {
  return line.replace(/^(路线：)+/, "").trim();
}

function isReportSummaryLine(line: string): boolean {
  return /结果：/.test(line) && /主要收获：/.test(line);
}

function classifyTimelineLine(line: string): FeedReportTimelineCategory | null {
  if (/撤离|提前返程|返程|接应通道/.test(line)) {
    return "extraction";
  }

  if (/交易|商店|购买|买修理包|路边交易点/.test(line)) {
    return "trade";
  }

  if (/营地|扎营|休整|烹饪|侦察/.test(line)) {
    return "camp";
  }

  if (/遭遇战|战斗|回合|反击|被击退|倒下|破势|护甲|流血|战利标记/.test(line)) {
    return "combat";
  }

  if (/道路|路段|路上|路口|行军计划|路段战术|路段威胁|威胁反制|设施缓解|道路受阻|路线开启/.test(line)) {
    return "route";
  }

  if (/收获|战利品|材料 \+|食物 \+|水 \+|药品 \+|燃料 \+|弹药 \+|目标 \+/.test(line)) {
    return "reward";
  }

  if (/受伤|伤痕|擦伤|危险|压力 \+/.test(line)) {
    return "risk";
  }

  return null;
}

function timelineTitle(line: string, category: FeedReportTimelineCategory): string {
  if (category === "route") {
    const segment = line.match(/路段\s*\d+/);
    if (segment) {
      return segment[0].replace(/\s+/, " ");
    }
  }

  const [prefix] = line.split("：");
  const cleanPrefix = prefix?.trim();
  if (cleanPrefix && cleanPrefix.length <= 14) {
    return cleanPrefix;
  }

  const sentence = line.split(/[，。]/)[0]?.trim();
  return sentence || categoryLabels[category];
}

function timelineBody(line: string): string {
  const [, ...rest] = line.split("：");
  const body = rest.join("：").trim();
  return body || line;
}

function summarizeSteps(steps: FeedReportTimelineStep[]): string {
  const counts = steps.reduce(
    (acc, step) => {
      acc[step.category] = (acc[step.category] ?? 0) + 1;
      return acc;
    },
    {} as Partial<Record<FeedReportTimelineCategory, number>>
  );

  return summaryOrder
    .filter((category) => counts[category])
    .map((category) => `${categoryLabels[category]} ${counts[category]}`)
    .join(" / ");
}
