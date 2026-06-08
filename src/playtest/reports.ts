import type { FeedItem } from "../game/types";

export type FeedReportTimelineCategory = "route" | "combat" | "trade" | "camp" | "extraction" | "reward" | "growth" | "risk";

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

export type FeedReportSettlement = {
  growth: string[];
  hasSettlement: boolean;
  headline: string;
  objective: string[];
  resources: string[];
  risk: string[];
  summary: string;
};

export type FeedReturnLedger = {
  account: string;
  base: string;
  extraction: string;
  hasLedger: boolean;
  injuries: string;
  objective: string;
};

export type FeedGrowthRoadmapEntry = {
  levelText: string;
  name: string;
  nextText: string;
  perkText: string;
  raw: string;
  xpText: string;
};

export type FeedGrowthRoadmap = {
  entries: FeedGrowthRoadmapEntry[];
  hasGrowth: boolean;
  summary: string;
};

const categoryLabels: Record<FeedReportTimelineCategory, string> = {
  camp: "营地",
  combat: "战斗",
  extraction: "撤离",
  growth: "成长",
  reward: "收获",
  risk: "风险",
  route: "路线",
  trade: "交易"
};

const summaryOrder: FeedReportTimelineCategory[] = ["growth", "route", "combat", "trade", "camp", "extraction", "reward", "risk"];

const resourceNames = ["水", "食物", "材料", "药品", "燃料", "弹药", "稀有零件", "情报"];

export function summarizeFeedReportSettlement(item: FeedItem): FeedReportSettlement {
  if (item.kind !== "report") {
    return emptySettlement();
  }

  const lines = reportLines(item);
  const headline = parseResultHeadline(lines) ?? "远征结算";
  const resources = parseSettlementResources(lines);
  const objective = parseObjectiveProgress(lines);
  const growth = parseGrowth(lines);
  const risk = parseRisk(lines);
  const hasSettlement = Boolean(resources.length || objective.length || growth.length || risk.length || headline !== "远征结算");

  if (!hasSettlement) {
    return emptySettlement();
  }

  return {
    growth,
    hasSettlement,
    headline,
    objective,
    resources,
    risk,
    summary: summarizeSettlement(resources, objective, growth, risk)
  };
}

export function summarizeFeedReportTimeline(item: FeedItem): FeedReportTimeline {
  if (item.kind !== "report") {
    return emptyTimeline();
  }

  const steps = reportLines(item)
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

export function summarizeFeedReturnLedger(item: FeedItem): FeedReturnLedger {
  if (item.kind !== "report") {
    return emptyReturnLedger();
  }

  const ledgerLine = reportLines(item).find((line) => line.startsWith("归队清单："));
  if (!ledgerLine) {
    return emptyReturnLedger();
  }

  const parts = ledgerLine
    .replace(/^归队清单：/, "")
    .replace(/。$/, "")
    .split("；")
    .map((part) => part.trim())
    .filter(Boolean);

  const base = stripLedgerLabel(parts.find((part) => part.startsWith("基地入库")), "基地入库");
  const objective = parts.find((part) => part.startsWith("目标推进")) ?? "";
  const account = stripLedgerLabel(parts.find((part) => part.startsWith("账号回收")), "账号回收");
  const injuries = parts.find((part) => part.startsWith("伤病")) ?? "";
  const extraction = [...parts].reverse().find((part) => /^(完整撤离|提前返程)$/.test(part)) ?? "";

  return {
    account,
    base,
    extraction,
    hasLedger: Boolean(base || objective || account || injuries || extraction),
    injuries,
    objective
  };
}

export function summarizeFeedGrowthRoadmap(item: FeedItem): FeedGrowthRoadmap {
  if (item.kind !== "report") {
    return emptyGrowthRoadmap();
  }

  const entries = parseGrowth(reportLines(item)).flatMap(parseGrowthEntry);
  if (!entries.length) {
    return emptyGrowthRoadmap();
  }

  const levelUps = entries.filter((entry) => entry.levelText).length;
  const unlocks = entries.filter((entry) => entry.perkText).length;
  const nextTargets = entries.filter((entry) => entry.nextText).length;
  const summaryParts = [
    `${entries.length} 名幸存者获得经验`,
    levelUps ? `${levelUps} 人升级` : "",
    unlocks ? `${unlocks} 个专长解锁` : "",
    nextTargets ? `${nextTargets} 条下级目标` : ""
  ].filter(Boolean);

  return {
    entries,
    hasGrowth: true,
    summary: summaryParts.join(" / ")
  };
}

function emptySettlement(): FeedReportSettlement {
  return {
    growth: [],
    hasSettlement: false,
    headline: "暂无结算摘要",
    objective: [],
    resources: [],
    risk: [],
    summary: "暂无结算摘要"
  };
}

function emptyReturnLedger(): FeedReturnLedger {
  return {
    account: "",
    base: "",
    extraction: "",
    hasLedger: false,
    injuries: "",
    objective: ""
  };
}

function emptyGrowthRoadmap(): FeedGrowthRoadmap {
  return {
    entries: [],
    hasGrowth: false,
    summary: "暂无成长记录"
  };
}

function emptyTimeline(): FeedReportTimeline {
  return {
    hasProcess: false,
    steps: [],
    summary: "暂无过程回放"
  };
}

function stripLedgerLabel(value: string | undefined, label: string): string {
  return value?.replace(new RegExp(`^${label}\\s*`), "").trim() ?? "";
}

function reportLines(item: FeedItem): string[] {
  return item.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseResultHeadline(lines: string[]): string | null {
  for (const line of lines) {
    const match = line.match(/结果：([^。]+)。/);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function parseSettlementResources(lines: string[]): string[] {
  const totals = new Map<string, number>();
  const orderedNames: string[] = [];

  for (const line of lines) {
    const segment = settlementResourceSegment(line);
    if (!segment) {
      continue;
    }

    for (const delta of parseResourceDeltas(segment)) {
      if (!totals.has(delta.name)) {
        orderedNames.push(delta.name);
      }
      totals.set(delta.name, (totals.get(delta.name) ?? 0) + delta.value);
    }
  }

  return orderedNames
    .map((name) => ({ name, value: totals.get(name) ?? 0 }))
    .filter((delta) => delta.value !== 0)
    .map(formatDelta);
}

function settlementResourceSegment(line: string): string | null {
  const summaryMatch = line.match(/主要收获：([^。]+)/);
  if (summaryMatch?.[1]) {
    return summaryMatch[1];
  }

  const accountSpoils = line.match(/^账号战利：(.+)/);
  return accountSpoils?.[1] ?? null;
}

function parseResourceDeltas(segment: string): Array<{ name: string; value: number }> {
  const matches = [...segment.matchAll(new RegExp(`(${resourceNames.join("|")})\\s*([+-]\\d+)`, "g"))];
  return matches.map((match) => ({
    name: match[1],
    value: Number(match[2])
  }));
}

function parseObjectiveProgress(lines: string[]): string[] {
  const total = lines.reduce((sum, line) => {
    const matches = [...line.matchAll(/目标\s*([+-]\d+)/g)];
    return sum + matches.reduce((lineSum, match) => lineSum + Number(match[1]), 0);
  }, 0);

  return total ? [`目标 ${signedNumber(total)}`] : [];
}

function parseGrowth(lines: string[]): string[] {
  return lines
    .filter((line) => /^成长：/.test(line))
    .map((line) => line.replace(/^成长：/, "").replace(/。$/, "").trim())
    .filter(Boolean);
}

function parseGrowthEntry(line: string): FeedGrowthRoadmapEntry[] {
  return line
    .split("；")
    .map((part) => part.replace(/。$/, "").trim())
    .filter(Boolean)
    .map((part) => {
      const name = part.match(/^([^+\s]+)\s*\+/)?.[1] ?? "幸存者";
      const xpText = part.match(/\+\d+\s*经验/)?.[0] ?? "";
      const levelText = part.match(/升到\s*Lv\.\d+|Lv\.\d+\s*已达上限/)?.[0] ?? "";
      const perkText = part.match(/解锁\s*.+$/)?.[0] ?? "";
      const nextText = part.match(/距\s*Lv\.\d+\s*还差\s*\d+/)?.[0] ?? "";

      return {
        levelText,
        name,
        nextText,
        perkText,
        raw: part,
        xpText
      };
    });
}

function parseRisk(lines: string[]): string[] {
  const risk: string[] = [];
  const injuries = lines
    .filter((line) => /^伤病：/.test(line))
    .map((line) => line.replace(/^伤病：/, "").replace(/。$/, "").trim())
    .filter(Boolean);

  risk.push(...injuries);

  const pressure = sumPatternDeltas(lines, /压力\s*([+-]\d+)%/g);
  if (pressure) {
    risk.push(`压力净变化 ${signedNumber(pressure)}%`);
  }

  const fatigue = sumPatternDeltas(lines, /疲劳\s*([+-]\d+)/g);
  if (fatigue) {
    risk.push(`疲劳 ${signedNumber(fatigue)}`);
  }

  return risk;
}

function sumPatternDeltas(lines: string[], pattern: RegExp): number {
  return lines.reduce((sum, line) => {
    const matches = [...line.matchAll(pattern)];
    return sum + matches.reduce((lineSum, match) => lineSum + Number(match[1]), 0);
  }, 0);
}

function formatDelta(delta: { name: string; value: number }): string {
  return `${delta.name} ${signedNumber(delta.value)}`;
}

function signedNumber(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function summarizeSettlement(resources: string[], objective: string[], growth: string[], risk: string[]): string {
  const parts: string[] = [];

  if (resources.length) {
    parts.push(`带回 ${resources.length} 项资源`);
  }
  if (objective.length) {
    parts.push(`目标推进 ${objective.length} 次`);
  }
  if (growth.length) {
    parts.push(`${growth.length} 名幸存者成长`);
  }
  if (risk.length) {
    parts.push(`风险记录 ${risk.length} 条`);
  }

  return `${parts.join("，")}。`;
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

  if (/收获|战利品|账号战利|材料 \+|食物 \+|水 \+|药品 \+|燃料 \+|弹药 \+|稀有零件 \+|情报 \+|目标 \+/.test(line)) {
    return "reward";
  }

  if (/成长|经验|升到 Lv\.|解锁/.test(line)) {
    return "growth";
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
