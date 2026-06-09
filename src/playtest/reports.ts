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

export type FeedBaseReturnPlanAction = {
  id: "storage" | "objective" | "recovery" | "growth";
  label: string;
  targetView: "overview" | "survivors" | "facilities" | "expedition";
  text: string;
  tone: "safe" | "warning" | "blocked";
};

export type FeedBaseReturnPlan = {
  actions: FeedBaseReturnPlanAction[];
  hasPlan: boolean;
  headline: string;
  primaryAction: FeedBaseReturnPlanAction | null;
  summary: string;
};

export type FeedReturnPulseItem = {
  detail: string;
  id: FeedBaseReturnPlanAction["id"];
  label: string;
  targetView: FeedBaseReturnPlanAction["targetView"];
  tone: FeedBaseReturnPlanAction["tone"];
  value: string;
};

export type FeedReturnPulse = {
  hasPulse: boolean;
  headline: string;
  items: FeedReturnPulseItem[];
  nextAction: FeedBaseReturnPlanAction | null;
  summary: string;
  tone: FeedBaseReturnPlanAction["tone"];
};

export type FeedExpeditionDebriefAdvice = {
  id: "risk" | "objective" | "supplies" | "growth" | "combat" | "tempo";
  label: string;
  text: string;
  tone: "safe" | "warning" | "blocked";
};

export type FeedExpeditionDebrief = {
  advice: FeedExpeditionDebriefAdvice[];
  hasDebrief: boolean;
  headline: string;
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

export function summarizeFeedBaseReturnPlan(item: FeedItem): FeedBaseReturnPlan {
  if (item.kind !== "report") {
    return emptyBaseReturnPlan();
  }

  const ledger = summarizeFeedReturnLedger(item);
  const settlement = summarizeFeedReportSettlement(item);
  const growth = summarizeFeedGrowthRoadmap(item);
  if (!ledger.hasLedger && !settlement.hasSettlement && !growth.hasGrowth) {
    return emptyBaseReturnPlan();
  }

  const injuryText = ledger.injuries || settlement.risk.find((entry) => entry.includes("伤") || entry.includes("疲劳")) || "";
  const hasInjuryRisk = Boolean(injuryText && !/伤病\s*0|0\s*名/.test(injuryText));
  const objectiveText = ledger.objective || settlement.objective[0] || "查看房间目标进度，决定下一轮路线。";
  const storageText = ledger.base || (settlement.resources.length ? settlement.resources.slice(0, 3).join("，") : "整理本轮带回资源。");
  const growthText = growth.hasGrowth ? growth.summary : ledger.account || settlement.growth[0] || "本轮没有新的幸存者成长。";

  const actions: FeedBaseReturnPlanAction[] = [
    {
      id: "storage",
      label: "整理入库",
      targetView: "overview",
      text: storageText,
      tone: "safe"
    },
    {
      id: "objective",
      label: "检查目标",
      targetView: "overview",
      text: objectiveText,
      tone: objectiveText.includes("+0") ? "warning" : "safe"
    },
    {
      id: "recovery",
      label: hasInjuryRisk ? "处理伤病" : "确认队伍",
      targetView: "survivors",
      text: injuryText || "没有明确伤病，仍建议确认疲劳和班次。",
      tone: hasInjuryRisk ? "warning" : "safe"
    },
    {
      id: "growth",
      label: "分配成长",
      targetView: growth.hasGrowth ? "survivors" : "facilities",
      text: growthText,
      tone: growth.hasGrowth ? "safe" : "warning"
    }
  ];

  return {
    actions,
    hasPlan: true,
    headline: ledger.extraction ? `${ledger.extraction}，回基地处理下一轮循环。` : "远征已归队，回基地处理下一轮循环。",
    primaryAction:
      actions.find((action) => action.id === "recovery" && action.tone === "warning") ??
      actions.find((action) => action.id === "objective" && action.tone === "warning") ??
      actions.find((action) => action.id === "growth" && action.tone === "safe") ??
      actions[0],
    summary: [storageText, objectiveText, injuryText || "队伍状态待确认", growthText].filter(Boolean).slice(0, 3).join(" / ")
  };
}

export function summarizeFeedReturnPulse(item: FeedItem): FeedReturnPulse {
  if (item.kind !== "report") {
    return emptyReturnPulse();
  }

  const plan = summarizeFeedBaseReturnPlan(item);
  const ledger = summarizeFeedReturnLedger(item);
  const settlement = summarizeFeedReportSettlement(item);
  const debrief = summarizeFeedExpeditionDebrief(item);
  if (!plan.hasPlan && !ledger.hasLedger && !settlement.hasSettlement && !debrief.hasDebrief) {
    return emptyReturnPulse();
  }

  const fallbackActions = plan.actions.length
    ? plan.actions
    : ([
        {
          id: "storage",
          label: "整理入库",
          targetView: "overview",
          text: ledger.base || settlement.resources.slice(0, 3).join("；") || "检查本轮带回资源。",
          tone: "safe"
        },
        {
          id: "objective",
          label: "检查目标",
          targetView: "overview",
          text: ledger.objective || settlement.objective[0] || "确认房间目标推进。",
          tone: "safe"
        },
        {
          id: "recovery",
          label: "处理伤病",
          targetView: "survivors",
          text: ledger.injuries || settlement.risk[0] || "确认队伍状态。",
          tone: "warning"
        },
        {
          id: "growth",
          label: "分配成长",
          targetView: "survivors",
          text: settlement.growth[0] || "查看本轮幸存者成长。",
          tone: "safe"
        }
      ] satisfies FeedBaseReturnPlanAction[]);

  const items = fallbackActions.map((action) => ({
    detail: returnPulseDetail(action.id, ledger, settlement, debrief),
    id: action.id,
    label: action.label,
    targetView: action.targetView,
    tone: action.tone,
    value: action.text
  }));

  const tone = items.some((entry) => entry.tone === "blocked") || debrief.advice.some((entry) => entry.tone === "blocked")
    ? "blocked"
    : items.some((entry) => entry.tone === "warning") || debrief.advice.some((entry) => entry.tone === "warning")
      ? "warning"
      : "safe";
  const nextAction =
    plan.primaryAction ??
    fallbackActions.find((entry) => entry.tone !== "safe") ??
    fallbackActions[0] ??
    null;

  return {
    hasPulse: true,
    headline: returnPulseHeadline(tone, ledger, settlement),
    items,
    nextAction,
    summary: [
      ledger.base || settlement.resources.slice(0, 2).join("、"),
      ledger.objective || settlement.objective[0],
      ledger.injuries || settlement.risk.find((entry) => entry.includes("伤") || entry.includes("疲劳")),
      debrief.hasDebrief ? debrief.advice[0]?.label : ""
    ]
      .filter(Boolean)
      .slice(0, 4)
      .join(" / "),
    tone
  };
}

export function summarizeFeedExpeditionDebrief(item: FeedItem): FeedExpeditionDebrief {
  if (item.kind !== "report") {
    return emptyExpeditionDebrief();
  }

  const settlement = summarizeFeedReportSettlement(item);
  const ledger = summarizeFeedReturnLedger(item);
  const growth = summarizeFeedGrowthRoadmap(item);
  const timeline = summarizeFeedReportTimeline(item);
  if (!settlement.hasSettlement && !ledger.hasLedger && !timeline.hasProcess) {
    return emptyExpeditionDebrief();
  }

  const advice: FeedExpeditionDebriefAdvice[] = [];
  const injuryRisk = ledger.injuries || settlement.risk.find((entry) => /伤|疲劳|压力净变化 \+/.test(entry)) || "";
  const objectiveText = ledger.objective || settlement.objective[0] || "";
  const earlyReturn = ledger.extraction === "提前返程";
  const combatCount = timeline.steps.filter((step) => step.category === "combat").length;

  if (injuryRisk && !/伤病\s*0|0\s*名|压力净变化 -/.test(injuryRisk)) {
    advice.push({
      id: "risk",
      label: "压低风险",
      text: "下次先补药品、安排护理或改用谨慎策略，避免伤病和压力拖垮后续基地循环。",
      tone: "warning"
    });
  }

  if (!objectiveText || /\+0/.test(objectiveText)) {
    advice.push({
      id: "objective",
      label: "补目标推进",
      text: "优先升级电台、安排修理班或选择带线索的地点，让远征更稳定地推进房间目标。",
      tone: "warning"
    });
  }

  if (earlyReturn) {
    advice.push({
      id: "supplies",
      label: "延长路线",
      text: "提前返程说明补给或压力余量不足，下次多带水粮并提高仓库、厨房或营地支援。",
      tone: "blocked"
    });
  }

  if (!growth.hasGrowth) {
    advice.push({
      id: "growth",
      label: "安排成长",
      text: "让接近升级的幸存者进入编队，或建设训练室，把远征收益转成局外成长。",
      tone: "warning"
    });
  }

  if (combatCount > 0) {
    advice.push({
      id: "combat",
      label: "战斗准备",
      text: `本轮有 ${combatCount} 段战斗记录。下次确认弹药、医务室和防守方针，减少回合损耗。`,
      tone: injuryRisk ? "warning" : "safe"
    });
  }

  if (advice.length === 0) {
    advice.push({
      id: "tempo",
      label: "保持节奏",
      text: "本轮收益、目标和队伍状态都较稳，可以继续同类地点并逐步提高风险档位。",
      tone: "safe"
    });
  }

  return {
    advice: advice.slice(0, 5),
    hasDebrief: true,
    headline: debriefHeadline(advice),
    summary: `复盘建议 ${Math.min(5, advice.length)} 条：${advice
      .slice(0, 4)
      .map((item) => item.label)
      .join("、")}。`
  };
}

function emptyReturnPulse(): FeedReturnPulse {
  return {
    hasPulse: false,
    headline: "暂无归队复盘",
    items: [],
    nextAction: null,
    summary: "暂无归队复盘",
    tone: "safe"
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

function emptyBaseReturnPlan(): FeedBaseReturnPlan {
  return {
    actions: [],
    hasPlan: false,
    headline: "暂无回基地计划",
    primaryAction: null,
    summary: "暂无回基地计划"
  };
}

function emptyExpeditionDebrief(): FeedExpeditionDebrief {
  return {
    advice: [],
    hasDebrief: false,
    headline: "暂无远征复盘",
    summary: "暂无远征复盘"
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

function debriefHeadline(advice: FeedExpeditionDebriefAdvice[]) {
  if (advice.some((item) => item.tone === "blocked")) {
    return "下一轮先修正撤离和补给余量。";
  }

  if (advice.some((item) => item.tone === "warning")) {
    return "下一轮先处理风险和目标短板。";
  }

  return "本轮节奏稳定，可以继续扩大收益。";
}

function returnPulseDetail(
  id: FeedBaseReturnPlanAction["id"],
  ledger: FeedReturnLedger,
  settlement: FeedReportSettlement,
  debrief: FeedExpeditionDebrief
): string {
  if (id === "storage") {
    return ledger.extraction ? `${ledger.extraction}后先确认仓库和基地消耗。` : "先把带回资源转成基地行动。";
  }

  if (id === "objective") {
    return debrief.advice.find((entry) => entry.id === "objective")?.text ?? "根据目标推进决定下一条路线。";
  }

  if (id === "recovery") {
    return ledger.injuries || settlement.risk[0] || "无明确伤病时，也要检查疲劳和下一班编队。";
  }

  return debrief.advice.find((entry) => entry.id === "growth")?.text ?? "把经验、专长和训练安排接回幸存者成长。";
}

function returnPulseHeadline(
  tone: FeedBaseReturnPlanAction["tone"],
  ledger: FeedReturnLedger,
  settlement: FeedReportSettlement
): string {
  if (tone === "blocked") {
    return "本轮归队暴露了补给或撤离短板，先修正再出发。";
  }

  if (tone === "warning") {
    return "本轮有伤病、目标或成长待处理，先把基地循环接上。";
  }

  return ledger.extraction || settlement.headline
    ? `${ledger.extraction || settlement.headline}，可以顺畅进入下一轮准备。`
    : "归队状态稳定，可以顺畅进入下一轮准备。";
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
